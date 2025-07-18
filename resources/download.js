import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';

async function downloadResource(url, outputDir) {
  try {
    // Ignore URLs with query parameters
    if (url.includes('?')) {
      return;
    }

    // Get file extension
    let filename = url.split('/').pop() || 'index.html';
    const ext = path.extname(filename).toLowerCase();

    // Ignore multimedia files
    const ignoredExts = ['.jpg', '.jpeg', '.png', '.gif', '.mp3', '.mp4', '.wav', '.avi', '.mov'];
    if (ignoredExts.includes(ext)) {
      return;
    }

    // Convert server-side extensions to .html
    const serverExts = ['.asp', '.aspx', '.jsp', '.php'];
    if (serverExts.includes(ext) || !ext) {
      const new_filename = filename.replace(ext, '.html');
      filename = new_filename;
    }

    // Determine if content is binary
    const binaryExts = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const isBinary = binaryExts.includes(ext);

    // Make axios request with appropriate response type
    const response = await axios.get(url, {
      responseType: isBinary ? 'arraybuffer' : 'text'
    });
    
    // Extract path from URL and create corresponding folder structure
    const urlPath = new URL(url).pathname;
    const urlDirs = path.dirname(urlPath).split('/').filter(Boolean);
    const fullDir = path.join(outputDir, ...urlDirs);
    await fs.mkdir(fullDir, { recursive: true });
    const filepath = path.join(fullDir, filename);
    
    // Skip if file already exists
    try {
      await fs.access(filepath);
      return;
    } catch {
      await fs.writeFile(filepath, response.data);
    }
    console.log(`Downloaded: ${url}`);    
  } catch (error) {
    console.error(`Failed to download ${url}:`, error.message);
  }
}

async function main() {
  try {
    // Create downloads directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'resources/downloads/ircc.canada.ca');
    await fs.mkdir(outputDir, { recursive: true });

    // Read and parse sitemap
    const sitemapPath = path.join(process.cwd(), 'resources/ircc.canada.ca sitemap.xml');
    const sitemapContent = await fs.readFile(sitemapPath, 'utf-8');
    
    const parser = new XMLParser();
    const sitemap = parser.parse(sitemapContent);

    // Download each URL
    const urls = sitemap.urlset.url;

    console.log(`Preparing to download ${urls.length} elements...`)
    for (const url of urls) {
      if (url.loc) {
        await downloadResource(url.loc, outputDir);
      }
    }

    console.log('Download complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();