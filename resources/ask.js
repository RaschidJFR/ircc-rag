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
  temperature: 0.1,
});

const MONGODB_URI = process.env.MONGODB_URI;
const mongoClient = await new MongoClient(MONGODB_URI, {}).connect();
const collection = mongoClient.db('IRCC_RAG').collection('chunks');

async function ask(query) {

  const rewriteQueryPrompt = `You are an assistant that reformulates user questions to improve information retrieval.
  Your goal is to produce a semantically clear, formal, and self-contained version of the original query, 
  using precise terminology and expanding abbreviations or vague expressions. 
  If the question is a leading, reformulate it. 
  Do not add new information or change the user's intent.
  Answer only with the improved query, don't add any extra comments, explanation, or acknowledgements.
  
  Query: 
  ${query}`;

  const { text: improvedQuery } = await gpt.invoke(rewriteQueryPrompt);
  const results = await vectorSearch(improvedQuery);

  const ragPrompt = `You are a helpful and reliable assistant.
  Your task is to answer the user's question using only the information provided in the context below.
  If the context does not contain a clear answer, say so honestly. Do not guess or fabricate information.
  Be accurate, concise, and neutral in tone. 
  Structure your answer using the Pyramid Principle: start with a clear summary of the answer, followed by supporting details, and end with references.
  Use Markdown formatting for clarity. Do not break the answer into multiple sections explicitly, but rather provide a single cohesive response.
  Cite the source for each specific data point or fact using the \`refUrl\` provided in the context.
  Place the citation immediately after the relevant statement in this format: [[<number>](https://example.com)].
  The citation numbers start at 1, increasing sequentially for each unique source in the context.
  The context is an array of JSON elements, each with:
  - \`"text"\`: a markdown-formatted snippet of relevant content
  - \`"refUrl"\`: a string containing the source URL


  Query:
  ${improvedQuery}

  Context:
  \`\`\`json
  ${JSON.stringify(results)}
  \`\`\`
  `;

  const { text: responseText } = await gpt.invoke(ragPrompt);

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
