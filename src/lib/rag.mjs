import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from './vars.mjs';
import * as z from 'zod';
import { vectorSearch, chunksToMarkdown } from './vector-search.mjs';
export { closeConnection } from './vector-search.mjs';
import { SessionLogger } from './logger.mjs';

let _logger = new SessionLogger();

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
  const rewriteQueryPrompt = `You are an assistant that reformulates user questions to improve information retrieval.
  Your goal is to produce a semantically clear and self-contained version of the original query, 
  using precise terminology and expanding abbreviations or vague expressions. 
  
  If the question is a leading, reformulate it.
  If question is not related to Canadian immigration or IRCC, raise and error.
  In the error, politely remind the user you can only help with IRCC and Immigration-related topics.

  Make use of the chat history to understand the context and intent of the user.
  Do not add new information or change the user's intent.
  Answer only with the improved query, don't add any extra comments, explanation, or acknowledgements.

  Chat History:
  ${messageHistory.length == 0 ? 'n/a' : `\`\`\`json\n${JSON.stringify(messageHistory, null, 2)}\n\`\`\``}
  
  Question: 
  \`\`\`txt
  ${query}
  \`\`\`
  `;

  const { text, error } = await model
    .withStructuredOutput(
      z.object({
        text: z.string().describe('The reformulated query for better information retrieval'),
        error: z.string().nullable().describe('An error message if the query cannot be reformulated'),
      })
    )
    .invoke(rewriteQueryPrompt);
  return { question: query, answer: text, error };
}

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
 * @param {string} context Retrieved context from the vector database, formatted as markdown.
 * @param {ChatOpenAI} model
 * @returns {Promise<{ question: string, answer: string }>}
 */
export async function generateAnswer(query, context, model = gpt4oMini()) {
  // TODO: disclaim that this is to assist finding information, not to provide advice.
  const prompt = `
## Instructions  
You are a helpful and reliable RAG chatbot assistant.
Your task is to answer the user's question using only the information provided in the context ("IRCC documentation") below.
The context is a compilation of text chunks extracted from the IRCC documentation, each separated by a horizontal divider (---).
The references to the original documents are numbered and provided at the end of each chunk, just above the divider.

1. Structure your answer using the Pyramid Principle: start with a clear summary of the answer, followed by supporting details, and end with references.
2. Use Markdown formatting for clarity. Do not break the answer into multiple sections explicitly, but rather provide a single cohesive response.
3. Cite the source for argument using the \'Reference\' provided at the end of each chunk.
4. Place the citation immediately after the relevant statement in this format: [[<reference number>](https://example.com)].
5. If the IRCC documentation does not contain a clear answer, say so honestly. Do not guess or fabricate information or assume.
6. Be accurate, concise, and neutral. 
7. Avoid arguments without references.
8. Highlight any potential nuances in the answer that depend on the user's specific scenario and conditions.
9. Responde in less than 500 chars.

## Question:

\`\`\`
${query}
\`\`\`

## Context:

\`\`\`markdown
${context}
\`\`\`
`;
  try {
    const response = await model
      // .withStructuredOutput(
      //   z.object({
      //     content: z.string().describe('Your answer in markdown format including citations'),
      //   })
      // )
      .invoke(prompt);

    return response.content;
  } catch (e) {
    _logger.appendResult(e.message, 'log', '# Error!');
    _logger.append('## Prompt\n\n', prompt);
    throw e;
  }
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

export async function evaluateFollowUp(userQuestions, generatedAnswer, model = gpt4oMini()) {
  const evaluationPrompt = `Evaluate if the answer provided by a RAG bot is fully addressing the user's concerns.
  
  Input: 
  1. The user's original questions.
  2. The answer generated by the RAG bot.
  
  Your task:
  - Discard the questions that have been addressed by the RAG bot's answer.
  - Discard questions that are similar or redundant.
  - Sort the resulting list of questions by relevance, with the most important question first.
  - It is ok to return an empty array if all questions have been answered.
  
  IMPORTANT: Do not alter any question.
  
  **User's question(s):**
  
  \`\`\`
  ${userQuestions}
  \`\`\`
  
  **RAG bot's answer:**
  
  \`\`\`
  ${generatedAnswer}
  \`\`\`
  `;

  const { questions } = await model
    .withStructuredOutput(
      z.object({
        questions: z.array(z.string()).describe('An array containing the pending question'),
      })
    )
    .invoke(evaluationPrompt);

  return questions;
}

export async function generateClarifyingQuestions(userQuery, references, model = gpt4oMini()) {
  const prompt = `Given this user query and the retrieved IRCC content, list the single most important nuances that directly impacts the user's scenario. 
Then ask a clarifying question to get the required context from the user.
Only include questions that are completely relevant to the user's decision.
Respond with a single question addressed to the user. Do not add comments or instructions.
If no evident additional information is required or clear, return an empty string.

**User Query:**

\`\`\`
${userQuery}
\`\`\`

**Retrieved IRCC Content:**

\`\`\`markdown
${references}
\`\`\`
`;

  const { content } = await model.invoke(prompt);
  return content;
}

export async function ask(query, messageHistory = [], maxFollowUps = 1, logger = new SessionLogger()) {
  try {
    _logger = logger;
    logger.append('Question:\n\n', '>', query);

    // Sanitize query
    const sanitizedResponse = await sanitizeQuery(query, messageHistory);
    if (sanitizedResponse.error) {
      logger.appendResult(sanitizedResponse.error);
      return sanitizedResponse;
    }

    let keyQuestion = sanitizedResponse.answer;
    logger.appendResult(keyQuestion, '', 'Sanitized Query:');

    let pendingQuestions = await decomposeQuery(keyQuestion);
    let finalAnswer = '';
    let refIndex = 0;

    while (pendingQuestions.length > 0 && maxFollowUps-- >= 0) {
      const mdQuestions = pendingQuestions.filter((q) => q !== keyQuestion).map((q) => '- [ ] ' + q);
      mdQuestions.unshift(`- [x] ${keyQuestion}`);
      logger.appendResult(mdQuestions.join('\n'), 'markdown', 'Key Questions');

      const retrievedChunks = await vectorSearch(keyQuestion);
      const selectedChunks = await discriminateReferences(keyQuestion, retrievedChunks);
      const mdReferences = chunksToMarkdown(selectedChunks, refIndex);
      refIndex += selectedChunks.length;
      logger.appendResult(mdReferences, 'markdown', `## References (${selectedChunks.length})`);

      let answer = await generateAnswer(keyQuestion, mdReferences);
      logger.append('## Answer\n\n', `\n\n**${keyQuestion}**\n\n`, answer);
      logger.tick();
      logger.insert(logger.content.pop(), -1); // swap the last to items in logger.content
      finalAnswer += '\n\n' + answer;

      pendingQuestions = await evaluateFollowUp(pendingQuestions, finalAnswer);
      if (pendingQuestions.length > 0 && maxFollowUps > 0) {
        logger.appendResult(pendingQuestions.map((q) => '- ' + q).join('\n'), '', `# Follow-up`);
        keyQuestion = pendingQuestions[0];
      }
    }

    //TODO: dedup answer in case follow up is redundant

    logger.write();
    return { question: keyQuestion, answer: finalAnswer };
  } catch (e) {
    logger.appendResult('Error:' + e.message, 'log');
    logger.write();
    throw e;
  }
}
