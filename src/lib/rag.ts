import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from './vars.mjs';
import * as z from 'zod';
import { vectorSearch, chunksToMarkdown, ChunkDocument as DocumentChunk } from './vector-search';
import { SessionLogger } from './logger';
import { ChatMessage, RAGResponseParagraph as RagResponseParagraph } from './types.d';

let _logger = new SessionLogger();

const gpt41 = () =>
  new ChatOpenAI({
    modelName: 'gpt-4.1',
    maxTokens: 1000,
    apiKey: OPENAI_API_KEY,
    temperature: 0.1,
  });

const gpt4oMini = () =>
  new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    maxTokens: 500,
    apiKey: OPENAI_API_KEY,
    temperature: 0.1,
  });

const gpt41Nano = () =>
  new ChatOpenAI({
    modelName: 'gpt-4.1-nano',
    maxTokens: 500,
    apiKey: OPENAI_API_KEY,
    temperature: 0.1,
  });

export async function sanitizeQuery(query, messageHistory = [], model = gpt4oMini()) {
  const prompt = `Reformulate the user question to improve information retrieval.
  Your goal is to produce a semantically clear and self-contained version of the original query, 
  using precise terminology and expanding abbreviations or vague expressions. 
  
  If the question is not related to Canadian immigration or IRCC, raise and error and
  politely remind the user in your answer that you can only help with IRCC and Immigration-related topics.

  Use of the chat history to understand the context and intent of the user and incorporate it in your output.
  Answer only with the improved query, don't add any extra comments, explanation, or acknowledgements.

  ## Chat History
  ${messageHistory.length == 0 ? 'n/a' : `\`\`\`json\n${JSON.stringify(messageHistory, null, 2)}\n\`\`\``}
  
  ## Question
  \`\`\`txt
  ${query}
  \`\`\`
  `;

  const { output, error } = await model
    .withStructuredOutput(
      z.object({
        output: z.string().describe('The reformulated query or error message'),
        error: z.boolean().describe('`true` if the query cannot be reformulated'),
      })
    )
    .invoke(prompt);
  return { prompt, output, error, model: model.model };
}

/**
 * This function filters the references based on their relevance to the user's query.
 * It is recommended in the case when the vector search returns a large number of results.
 */
export async function discriminateReferences(userQuery, referenceChunks, model = gpt4oMini()) {
  const discriminationPrompt = `I'll give you a markdown content with a list of results from a vector search for a question.
You will select only the references that can answer the question.

1. Check the top section of each reference to understand whether the content is related to the specific user's scenario. Discard the reference if it's not.
2. Return an array containing the selected references' numbers.

**Question:** ${userQuery}

**Chunks:**

\`\`\`markdown
${chunksToMarkdown(referenceChunks)}
\`\`\`
`;

  const { indexes } = await model
    .withStructuredOutput(
      z.object({
        indexes: z
          .array(z.number())
          .describe('An array of numbers representing the selected references from the chunks'),
      })
    )
    .invoke(discriminationPrompt);

  return referenceChunks.filter((_, i) => indexes.includes(i + 1));
}

/**
 *
 * @param {string} query Question to answer using the vector database.
 * @param {string} references Retrieved context from the vector database, formatted as markdown.
 * @param {any[]} history Chat history
 * @param {ChatOpenAI} model
 * @returns {Promise<string>} Answer in markdown format.
 */
export async function generateAnswer(query, references, history, model = gpt41()) {
  // TODO: disclaim that this is to assist finding information, not to provide advice.
  const prompt = `You are a helpful chatbot that helps users find information in the IRCC documentation.
Respond to the user query the best you can based only on the results of the vector search.
Disclaim that the answer is based on your search of the IRCC documentation.
Give your answer in short paragraphs, each with a single argument as seen in the sample below.
Always include citations below each argument paragraph; include quote, the reference's number(s), and link(s).
You MUST Call out any nuance or missing information in the documentation.
Use the chat history to complement your answer if needed and a void being repetitive.

## Expected Answer Structure
\`\`\`md
This is the first paragraph.
> _"This is a citation from a reference"_ [[<reference number>](https://example.com/just-a-reference)]

This is the second paragraph.
> _"This is another citation...with multiple quotes"_ [[<reference number>](https://example.com/another-reference)][[<reference number>](https://example.com/yet-another-reference)]

[etc...]

\`\`\`

## Query:
\`\`\`txt
${query}
\`\`\`

## Vector Search Results
\`\`\`markdown
${references}
\`\`\`

## Chat History
\`\`\`json
${JSON.stringify(history, null, 2)}
\`\`\`

`;

  const { content } = await model
    // .withStructuredOutput(
    //   z.object({
    //     content: z.string().describe('Your answer in markdown format including citations'),
    //   })
    // )
    .invoke(prompt);

  return content;
}

export async function decomposeQuery(userQuery, model = gpt4oMini()) {
  const questionExtractionPrompt = `The user provided a long, informal story or question. Your task is:
1. Identify and extract all explicit questions they are asking.
2. Rewrite each one as a clear, self-contained question.
3. Condense the result into the *smallest possible set of non-overlapping, atomic questions* that fully capture the user's intent.  
4. Avoid joined questions what use "and" or colon (","), or questions that are too broad.
5. Eliminate redundancy — avoid rephrasing the same issue multiple times.  
6. Avoid questions not clearly stated in the user query.

**User question:**

\`\`\`
${userQuery}
\`\`\`
`;

  const { questions } = await model
    .withStructuredOutput(
      z.object({
        questions: z
          .array(z.string())
          .describe(
            'A list of questions derived from the user query, sorted by relevance top to bottom, each with less than 140 chars.'
          ),
      })
    )
    .invoke(questionExtractionPrompt);

  return questions;
}

export async function extractKeyQuestion(userQuery, questionList, model = gpt41Nano()) {
  const questionDiscriminationPrompt = `From the following list of questions, select the most relevant one to best address the user's main concern.
Do not add new questions or alter the existing ones.
If the list of questions provided is empty, return an empty string.
Return an empty string if you cannot determine the key question.

User query:

\`\`\`
${userQuery}
\`\`\`

List of questions:
\`\`\`
${questionList.map((q) => `- ${q}`).join('\n')}
\`\`\`
`;

  const { content } = await model
    .withStructuredOutput(
      z.object({
        content: z.string().describe('The key question selected from the list'),
      })
    )
    .invoke(questionDiscriminationPrompt);

  return content;
}

export async function ask(query, messageHistory = [], { logger: logger = new SessionLogger() } = {}) {
  try {
    _logger = logger;
    logger?.append('## Question\n\n', '>', query);

    // Sanitize query
    const sanitizedResponse = await sanitizeQuery(query, messageHistory);
    if (sanitizedResponse.error) {
      logger?.appendResult(sanitizedResponse.prompt, 'markdown', sanitizedResponse.answer);
      logger?.write();
      return { answer: sanitizedResponse.output, error: sanitizedResponse.error };
    }

    query = sanitizedResponse.output;
    logger?.appendResult(query, 'txt', 'Sanitized Query');

    const chunks = await vectorSearch(query);
    const mdReferences = chunksToMarkdown(chunks);
    logger?.appendResult(mdReferences, 'markdown', `## References (${chunks.length})`);

    const answer = await generateAnswer(query, mdReferences, messageHistory);
    logger?.appendResult(answer, 'markdown', `## Answer`);

    logger?.insert(logger?.content.pop(), -1); // swap the last to items in logger
    logger?.write();
    return { answer };
  } catch (e) {
    logger?.appendResult(e.message, 'txt', 'Error');
    logger?.write();
    throw e;
  }
}
