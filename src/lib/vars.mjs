import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const LLM_MODEL = 'gpt-4o-mini';
export const OPENAI_API_KEY = process.env.OPEN_AI_API_KEY;

// Validate required environment variables
if (!process.env.MONGODB_URI) {
  throw new Error(
    'MONGODB_URI environment variable is not set. Please check your .env file in the project root and ensure MONGODB_URI is correctly defined.'
  );
}

export const MONGODB_URI = process.env.MONGODB_URI;
export const VECTOR_INDEX_NAME = 'vector_index';