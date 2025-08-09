import dotenv from 'dotenv';
dotenv.config({ quiet: true });

export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const LLM_MODEL = 'gpt-4o-mini';
export const OPEN_AI_API_KEY = process.env.OPEN_AI_API_KEY;
export const MONGODB_URI = process.env.MONGODB_URI;
export const VECTOR_INDEX_NAME = 'vector_index';