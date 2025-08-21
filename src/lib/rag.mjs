import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from './vars.mjs';
import * as z from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { vectorSearch } from './vector-search.mjs';
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

async function RAG(query, model = gpt4oMini) {
  const results = await vectorSearch(query);

  const ragPrompt = `
## Instructions  
You are a helpful and reliable assistant.
Your task is to answer the user's question using only the information provided in the context ("IRCC documentation") below.
The context is a compilation of text chunks extracted from the IRCC documentation, each separated by a horizontal divider (---).
The references to the original documents are numbered and provided at the end of each chunk, just above the divider.

Structure your answer using the Pyramid Principle: start with a clear summary of the answer, followed by supporting details, and end with references.
Use Markdown formatting for clarity. Do not break the answer into multiple sections explicitly, but rather provide a single cohesive response.

Cite the source for each specific data point or fact using the \'Reference\' provided in the IRCC documentation.
Place the citation immediately after the relevant statement in this format: [[<reference number>](https://example.com)].

If the IRCC documentation does not contain a clear answer, say so honestly. Do not guess or fabricate information.
Be accurate, concise, and neutral in tone. 
Highlight any potential nuances in the answer that depend on the user's specific scenario and conditions.

## Question:

\`\`\`txt
${query}
\`\`\`

## Context:

\`\`\`markdown
${chunksToMarkdown(results)}
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

    logInteractionResults(ragPrompt, response);

    return response;
  } catch (error) {
    logInteractionResults(ragPrompt, { question: query, answer: `Error: ${error.message}` });
    throw error;
  }
}

async function logInteractionResults(ragPrompt, responseObject) {
  if (isProduction) return;
  // Save the ragPrompt string to a markdown file in /logs/<timestamp>.md
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const logFileName = `logs/${timestamp}.md`;
  const logContent = `**${responseObject.question}**

  \`\`\`markdown
  ${responseObject.answer}
  \`\`\`

  # RAG Prompt
  ${ragPrompt}
`;

  const logDir = path.dirname(logFileName);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  fs.writeFileSync(logFileName, logContent, 'utf8');
}

export async function ask(query, messageHistory = []) {
  const response = await rewriteQuery(query, messageHistory);
  if (response.error) {
    return response;
  }
  return RAG(response.answer);
}
