import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from './vars.mjs';
import * as z from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { vectorSearch, chunksToMarkdown } from './vector-search.mjs';
export { closeConnection } from './vector-search.mjs';

const isProduction = process.env.NODE_ENV === 'production';

const gpt5Nano = new ChatOpenAI({
  modelName: 'gpt-5-nano',
  apiKey: OPENAI_API_KEY,
  temperature: 1,
});

const gpt4oMini = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  maxCompletionTokens: 1000,
  apiKey: OPENAI_API_KEY,
  temperature: 0.1,
});

export async function rewriteQuery(query, messageHistory = [], model = gpt5Nano) {
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
8. Add a list of potential follow-up questions the user might ask, based on the answer.

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
          followUp: z
            .array(z.string())
            .nullable()
            .describe('Optional list of follow-up questions the user might ask'),
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

async function logInteractionResults(ragPrompt, responseObject, modelName) {
  if (isProduction) return;
  // Save the ragPrompt string to a markdown file in /logs/<timestamp>.md
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFileName = `logs/${timestamp}_${modelName}.md`;
  const logContent = `**${responseObject.question}**

\`\`\`markdown
${responseObject.answer}
\`\`\`

\`\`\`markdown
${JSON.stringify(responseObject.followUp, null, 2)}
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

export async function ask(query, messageHistory = []) {
  const rewriteResponse = await rewriteQuery(query, messageHistory);
  if (rewriteResponse.error) {
    return rewriteResponse;
  }
  const sanitizedQuery = rewriteResponse.answer;
  const vsResults = await vectorSearch(sanitizedQuery);
  const mdReferences = chunksToMarkdown(vsResults);
  return generateAnswer(sanitizedQuery, mdReferences, model);
}
