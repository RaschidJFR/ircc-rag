import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import pdf2md from '@opendocsg/pdf2md';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "@langchain/core/documents";


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
    let text = ''
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
  } catch(error) {
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
    return ''
  } else {
    console.warn(`Unsupported file type: ${ext}`);
    return '';
  }
}

async function getChunks(filePath){
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
  });

  const text = await getMarkdown(filePath);
  const url = extractCanonicalUrl(filePath)
  const docOutput = await splitter.splitDocuments([
    new Document({ 
      pageContent: text,
      metadata: { refUrl: url }
    })
  ]);

  return docOutput;
}

// TO-DO: skip index.html

// For testing purposes: Execute if called directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    const args = process.argv.slice(2);
    const md = await getChunks(args[0])
    console.log(md);
  })()
}