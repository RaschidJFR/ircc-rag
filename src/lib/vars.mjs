import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Validate required environment variables
if (!process.env.MONGODB_URI || !process.env.OPENAI_API_KEY) {
  throw new Error(
    'Missing environment variable. Please check your .env file and ensure MONGODB_URI and OPENAI_API_KEY are correctly defined.'
  );
}

export const MONGODB_URI = process.env.MONGODB_URI;
export const VECTOR_INDEX_NAME = 'vector_index';