import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';
import { MONGODB_URI, OPEN_AI_API_KEY, EMBEDDING_MODEL } from './env.js';
import * as z from 'zod';
import * as readline from 'readline/promises';

const gpt = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  maxTokens: 1000,
  apiKey: OPEN_AI_API_KEY,
  temperature: 0.1,
});

const mongoClient = await new MongoClient(MONGODB_URI, {}).connect();
const collection = mongoClient.db('IRCC_RAG').collection('chunks');

async function ask(query, messageHistory = []) {
  const rewriteQueryPrompt = `You are an assistant that reformulates user questions to improve information retrieval.
  Your goal is to produce a semantically clear and self-contained version of the original query, 
  using precise terminology and expanding abbreviations or vague expressions. 
  If the question is a leading, reformulate it.
  Make use of the chat history to understand the context and intent of the user.
  Do not add new information or change the user's intent.
  Answer only with the improved query, don't add any extra comments, explanation, or acknowledgements.

  Chat History:
  ${messageHistory.length > 0 ? messageHistory.map((msg) => `>"${msg}"\n`) : 'n/a'}
  
  Question: 
  \`\`\`txt
  ${query}
  \`\`\`
  `;

  const { text: improvedQuery } = await gpt.invoke(rewriteQueryPrompt);
  return RAG(improvedQuery);
}

async function RAG(query) {
  const results = await vectorSearch(query);

  const ragPrompt = `You are a helpful and reliable assistant.
  Your task is to answer the user's question using only the information provided in the context ("documentation") below.
  If the documentation does not contain a clear answer, say so honestly. Do not guess or fabricate information.
  Be accurate, concise, and neutral in tone. 
  Highlight any potential nuances in the answer that depend on the user's specific scenario and conditions.
  
  Structure your answer using the Pyramid Principle: start with a clear summary of the answer, followed by supporting details, and end with references.
  Use Markdown formatting for clarity. Do not break the answer into multiple sections explicitly, but rather provide a single cohesive response.
  
  Cite the source for each specific data point or fact using the \`refUrl\` provided in the documentation.
  Place the citation immediately after the relevant statement in this format: [[<number>](https://example.com)].
  The citation numbers start at 1, increasing sequentially for each unique source in the context.
  
  Question:
  \`\`\`txt
  ${query}
  \`\`\`

  Context – The context is an array of JSON elements, each with:
  - \`"text"\`: a markdown-formatted snippet of relevant content
  - \`"refUrl"\`: a string containing the source URL

  \`\`\`json
  ${JSON.stringify(results)}
  \`\`\`
  `;

  const response = await gpt
    .withStructuredOutput(
      z.object({
        question: z.string().describe('The original user question'),
        answer: z.string().describe('Your answer in markdown format including citations'),
      })
    )
    .invoke(ragPrompt);

  return response;
}

async function vectorSearch(query) {
  const embeddings = await new OpenAIEmbeddings({
    openAIApiKey: OPEN_AI_API_KEY,
    model: EMBEDDING_MODEL,
  }).embedQuery(query);

  return collection
    .aggregate([
      {
        // Any change to these parameters alters the amount of results passed to the LLM,
        // thus change the context and the quality of the answer.
        $vectorSearch: {
          queryVector: embeddings,
          path: 'embedding',
          numCandidates: 500,
          index: 'vector_index',
          limit: 20,
        },
      },
      {
        $project: {
          text: 1,
          refUrl: 1,
        },
      },
    ])
    .toArray();
}

// For testing purposes: Execute if called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const history = [];
  try {
    let query = await rl.question('Enter your question (type \'exit\' to finish):\n');
    while (query != 'exit') {
      const { question, answer } = await ask(query, history);
      history.push(question, answer);
      console.log('\n', answer, '\n');
      query = await rl.question('>');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoClient.close();
    rl.close();
    console.log(history)
  }
}

