import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from './vars.mjs';
import * as z from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { vectorSearch, chunksToMarkdown } from './vector-search.mjs';
export { closeConnection } from './vector-search.mjs';

const isProduction = process.env.NODE_ENV === 'production';

const gpt4oMini = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  maxCompletionTokens: 300,
  apiKey: OPENAI_API_KEY,
  temperature: 0.1,
});

const gpt41Nano = new ChatOpenAI({
  modelName: 'gpt-4.1-nano',
  maxCompletionTokens: 300,
  apiKey: OPENAI_API_KEY,
  temperature: 0.1,
});

export async function sanitizeQuery(query, messageHistory = [], model = gpt4oMini) {
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

/**
 *
 * @param {string} query Question to answer using the vector database.
 * @param {string} context Retrieved context from the vector database, formatted as markdown.
 * @param {ChatOpenAI} model
 * @returns {Promise<{ question: string, answer: string }>}
 */
export async function generateAnswer(query, context, model = gpt4oMini) {
  const ragPrompt = `
## Instructions  
You are a helpful and reliable RAG chatbot assistant.
Your task is to answer the user's question using only the information provided in the context ("IRCC documentation") below.
The context is a compilation of text chunks extracted from the IRCC documentation, each separated by a horizontal divider (---).
The references to the original documents are numbered and provided at the end of each chunk, just above the divider.

1. Structure your answer using the Pyramid Principle: start with a clear summary of the answer, followed by supporting details, and end with references.
2. Use Markdown formatting for clarity. Do not break the answer into multiple sections explicitly, but rather provide a single cohesive response.
3. Cite the source for argument using the \'Reference\' provided at the end of each chunk.
4. Place the citation immediately after the relevant statement in this format: [[<reference number>](https://example.com)].
5. If the IRCC documentation does not contain a clear answer, say so honestly. Do not guess or fabricate information.
6. Be accurate, concise, and neutral in tone. 
7. Highlight any potential nuances in the answer that depend on the user's specific scenario and conditions.

## Question:

\`\`\`txt
${query}
\`\`\`

## Context:

\`\`\`markdown
${context}
\`\`\`
`;

  try {
    const response = await model
      .withStructuredOutput(
        z.object({
          question: z.string().describe('The original user question'),
          answer: z.string().describe('Your answer in markdown format including citations'),
        })
      )
      .invoke(ragPrompt);

    logInteractionResults(ragPrompt, response, model.model);

    return response;
  } catch (error) {
    logInteractionResults(ragPrompt, { question: query, answer: `Error: ${error.message}` }, model.model);
    throw error;
  }
}

export async function decomposeQuery(userQuery, model = gpt4oMini) {
  const questionExtractionPrompt = `You are an assistant that prepares user queries for a Retrieval-Augmented Generation (RAG) system about Canadian immigration rules.
The user may provide a long, informal story or question. Your task is:
1. Identify all explicit and implicit questions they are asking.  
2. Rewrite each one as a clear, self-contained question that could be answered directly from IRCC documentation.  
3. Condense the result into the *smallest possible set of non-overlapping, atomic questions* that fully capture the user’s intent.  
4. Eliminate redundancy — avoid rephrasing the same issue multiple times.  
5. Do not provide answers — only the minimal list of questions.

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
          .describe('A list of questions derived from the user query, sorted by relevance top to bottom.'),
      })
    )
    .invoke(questionExtractionPrompt);

  return questions;
}

export async function extractKeyQuestion(userQuery, questionList, model = gpt41Nano) {
  const questionDiscriminationPrompt = `You are helping prepare user queries for a Retrieval-Augmented Generation (RAG) system about Canadian immigration.
  Input: a list of atomic questions generated from a user’s long query.
  Task:
  1. Identify the key question(s) that directly capture the user’s main intent.  
     - Keep only the questions that must be answered to resolve the user’s core concern.  
     - Discard questions that are secondary, conditional, or only relevant as follow-ups.
  2. Output only the minimal set of key questions, without explanation, ranked by relevance to the user query.
  Important: The result should be as short as possible while still fully representing the original user’s primary intent.
  
  User query:
  
  \`\`\`
  ${userQuery}
  \`\`\`
  
  List of questions:
  \`\`\`
  ${questionList.map((q) => `- ${q}`).join('\n')}
  \`\`\`
  `;

  const { questions } = await model
    .withStructuredOutput(
      z.object({
        questions: z.array(z.string()).describe('A list of key questions derived from the user query'),
      })
    )
    .invoke(questionDiscriminationPrompt);

  if (questions.length === 0) {
    console.warn('No key questions extracted from the user query. Defaulting to original query.');
    questions.push(userQuery);
  }

  return questions[0];
}

export async function evaluateFollowUp(userQuery, generatedAnswer, model = gpt4oMini) {
  const evaluationPrompt = `Evaluate if the answer provided by a RAG bot is fully addressing the user's concerns.
  
  Input: 
  1. The user's original question.
  2. The answer generated by the RAG bot.
  
  Your task:
  - Determine if the answer fully addresses the user's question.
  - If the answer is incomplete, does not address the user's concerns, or is irrelevant, return an array with a single required follow up questions to ask the RAG bot.
  - The questions must be ordered by relevance, with the most important question first.
  - If the answer is complete and directly addresses the user's concerns, return an empty array.
  
  **User's question:**
  
  \`\`\`
  ${userQuery}
  \`\`\`
  
  **RAG bot's answer:**
  
  \`\`\`
  ${generatedAnswer}
  \`\`\`
  `;

  const { questions } = await model
    .withStructuredOutput(
      z.object({
        questions: z.array(z.string()).describe('An array containing 1 question as input to the RAG bot'),
      })
    )
    .invoke(evaluationPrompt);

  return questions;
}

async function logInteractionResults(ragPrompt, responseObject, modelName) {
  if (isProduction) return;
  // Save the ragPrompt string to a markdown file in /logs/<timestamp>.md
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFileName = `logs/${timestamp}_${modelName}.md`;
  const logContent = `**${responseObject.question}**

\`\`\`markdown
${responseObject.answer}
\`\`\`

# Prompt and Context
${ragPrompt}
`;

  const logDir = path.dirname(logFileName);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.writeFileSync(logFileName, logContent, 'utf8');
}

export async function ask(query, messageHistory = [], followUpDepth = 1) {
  const startTime = Date.now();

  const rewriteResponse = await sanitizeQuery(query, messageHistory);
  if (rewriteResponse.error) {
    return rewriteResponse;
  }
  const userQuery = rewriteResponse.answer;
  const parsedQuestions = await decomposeQuery(userQuery);
  const keyQuestion = await extractKeyQuestion(parsedQuestions, parsedQuestions);
  const retrievedContext = await vectorSearch(keyQuestion);
  const mdReferences = chunksToMarkdown(retrievedContext);
  const ragResponse = await generateAnswer(keyQuestion, mdReferences);
  const followUp = await evaluateFollowUp(userQuery, ragResponse.answer);

  if (followUp.length > 0) {
    if (followUpDepth > 0) {
      const history = messageHistory.concat(ragResponse);
      const { answer: fuA, question: fuQ } = await ask(followUp[0], history, followUpDepth - 1);
      ragResponse.answer += `\n\n**${fuQ}**\n\n${fuA}`;
    }
  } else {
    const endTime = Date.now();
    console.debug(`ask function completed in ${((endTime - startTime) / 1000).toFixed(1)}s`);
  }

  return ragResponse;
}
