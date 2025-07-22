import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';

dotenv.config();
const EMBEDDING_MODEL = 'text-embedding-3-small';
const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;
const gpt = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  maxTokens: 1000,
  apiKey: OPENAI_API_KEY,
});

const MONGODB_URI = process.env.MONGODB_URI;
const mongoClient = await new MongoClient(MONGODB_URI, {}).connect();
const collection = mongoClient.db('IRCC_RAG').collection('chunks');

let conversationHistory = [];

async function ask(query) {
  const results = await vectorSearch(query);

  const prompt = `You are a helpful assistant. 
  Answer the user’s question using only the information provided in the context below. 
  If the answer cannot be found in the available documentation (context), let me know. 
  Do not make up answers. Be concise and accurate.
  Provide a link to the source of the information when possible.
  The context is an array of json elements, each containing a 'text' field with relevant information and a 'refUrl' field with the source URL.
  The text chunks in the context are in markdown format.
  Give your answer in Markdown format.

  Conversation History:
  ${conversationHistory.map((entry, index) => `Q${index + 1}: ${entry.query}\nA${index + 1}: ${entry.response}`).join('\n')}

  Current Query:
  ${query}

  Context related to the Current Query:
  \`\`\`json
  ${JSON.stringify(results)}
  \`\`\`
  `;

  const { text: responseText } = await gpt.invoke(prompt);
  conversationHistory.push({ query, response: responseText });

  return responseText;
}

async function vectorSearch(query) {
  const embeddings = await new OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
  }).embedQuery(query);

  return collection
    .aggregate([
      {
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
  (async () => {
    const query = process.argv.slice(2)[0];
    try {
      const response = await ask(query)
      console.log(response);
    } catch (error) {
      throw error;
    } finally {
      mongoClient.close();
    }

  })()
}
