import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import TurndownService from 'turndown';
import pdf2md from '@opendocsg/pdf2md';

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

