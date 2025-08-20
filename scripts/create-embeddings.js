import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import pdf2md from '@opendocsg/pdf2md';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { Document } from '@langchain/core/documents';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import { OpenAIEmbeddings } from '@langchain/openai';
import { MongoClient } from 'mongodb';
import { OPENAI_API_KEY, MONGODB_URI, EMBEDDING_MODEL, VECTOR_INDEX_NAME } from '../src/vars.mjs';

const mongoClient = await new MongoClient(MONGODB_URI, {}).connect();
const collection = mongoClient.db('IRCC_RAG').collection('chunks');

async function checkAndCreateIndex() {
  const indexes = await collection.listSearchIndexes().toArray();
  const indexExists = indexes.some((index) => index.name === VECTOR_INDEX_NAME);
  if (!indexExists) {
    await collection.createSearchIndex({
      name: VECTOR_INDEX_NAME,
      type: 'vectorSearch',
      definition: {
        fields: [
          {
            path: 'embedding',
            type: 'vector',
            numDimensions: 1536,
            similarity: 'cosine',
          },
        ],
      },
    });
    console.log(`Vector search index '${VECTOR_INDEX_NAME}' created.`);
  } else {
    console.log(`Vector search index '${VECTOR_INDEX_NAME}' found.`);
  }
}

function extractCanonicalUrl(htmlFilePath) {
  try {
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');
    const dom = new JSDOM(htmlContent);
    const doc = dom.window.document;
    const canonicalLink = doc.querySelector('link[rel="canonical"]');
    return canonicalLink ? canonicalLink.href : '';
  } catch (error) {
    console.error(`Error extracting canonical URL from ${htmlFilePath}:`, error.message);
    return '';
  }
}

function htmlToMarkdown(htmlFilePath) {
  try {
    // Read the HTML file
    const htmlContent = fs.readFileSync(htmlFilePath, 'utf-8');

    // Parse HTML using jsdom
    const dom = new JSDOM(htmlContent);
    const mainContent = dom.window.document.querySelector('main');

    if (!mainContent) {
      console.warn(`No <main> tag found in ${htmlFilePath}`);
      return '';
    }

    // Initialize turndown
    const turndownService = new TurndownService({
      headingStyle: 'atx',
    });
    turndownService.remove(['script', 'img']); // Remove script tags

    // Convert HTML to Markdown
    let text = '';
    text = turndownService.turndown(mainContent.innerHTML);
    return text;
  } catch (error) {
    console.error(`Error processing ${htmlFilePath}:`, error.message);
    return '';
  }
}

async function pdfToMarkdown(filePath) {
  try {
    const pdfBuffer = fs.readFileSync(filePath);
    const text = await pdf2md(pdfBuffer);
    return text;
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
    return '';
  }
}

async function getMarkdown(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.html') {
    return htmlToMarkdown(filePath);
  } else if (ext === '.pdf') {
    console.warn(`Unsupported file type: ${ext}`);
    // return await pdfToMarkdown(filePath);
    return '';
  } else {
    console.warn(`Unsupported file type: ${ext}`);
    return '';
  }
}

async function getChunksFromFile(filePath) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const text = await getMarkdown(filePath);
  const url = extractCanonicalUrl(filePath);
  const docOutput = await splitter.splitDocuments([
    new Document({
      pageContent: text,
      metadata: { refUrl: url },  // TO-DO: add embedding model and last update data
    }),
  ]);

  return docOutput;
}

// Function to call getChunks() recursively in all html files in a directory
async function generateChunksFromDirectory(directoryPath, depth = 1) {
  const files = fs.readdirSync(directoryPath);
  const chunks = [];
  const processed = [];
  const indent = '\t'.repeat(depth); // Indentation based on depth

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isFile() && file.endsWith('.html')) {
      // TODO: add support for pdf files
      const result = await getChunksFromFile(filePath);
      chunks.push(...result);
      processed.push(file);
    } else if (stat.isDirectory()) {
      // Recursively process subdirectories
      console.log(`${indent}📂 ${file}:`);
      await generateChunksFromDirectory(filePath, depth + 1);
    }
  }

  if (chunks.length > 0) {
    await checkAndCreateIndex();
    await generateAndSaveEmbeddings(chunks);
  }

  processed.forEach((file) => {
    console.log(`${indent}✅  ${file}`);
  });
}

/**
 *
 * @param {*} chunk
 * @param {string} chunk.pageContent
 * @param {*} chunk.metadata
 * @param {string} chunk.metadata.refUrl
 */
async function generateAndSaveEmbeddings(chunks) {
  const embeddings = new OpenAIEmbeddings({
    openAIApiKey: OPENAI_API_KEY,
    model: EMBEDDING_MODEL,
  });
  return MongoDBAtlasVectorSearch.fromDocuments(chunks, embeddings, { collection });
}

async function main() {
  const args = process.argv.slice(2);
  console.log(`Generating chunks for ${args}...`);
  await generateChunksFromDirectory(args[0]);
  console.log(`done!`);
}

// For testing purposes: Execute if called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
    .catch((error) => {
      console.error('An error occurred:', error);
    })
    .finally(() => {
      mongoClient.close();
    });
}
