import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import cliProgress from 'cli-progress';

const SITEMAP_URL = 'https://www.ircc.canada.ca/sitemap.xml';
const progressBar = new cliProgress.SingleBar({
  format: 'progress: {percentage}% | ETA: {eta}s | {value}/{total}',
});

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
    
    // Extract path from URL and create corresponding folder structure
    const urlPath = new URL(url).pathname;
    const urlDirs = path.dirname(urlPath).split('/').filter(Boolean);
    const fullDir = path.join(outputDir, ...urlDirs);
    await fs.mkdir(fullDir, { recursive: true });
    const filepath = path.join(fullDir, filename);
    
    // Skip if file already exists
    try {
      await fs.access(filepath);
      console.log(` ⭕️ Skip: ${url}`);
      // progressBar.increment(1, { file: url, emoji: '⭕️' });

    } catch {
      const { data } = await axios.get(url, {
        responseType: isBinary ? 'arraybuffer' : 'text'
      });
      await fs.writeFile(filepath, data);
      console.log(` ✅ ${url}`);
      progressBar.increment(1, { file: url, emoji: '✅' });
    }

  } catch (error) {
    console.log(` ❌ Failed: ${url} — ${error.message}`);
    progressBar.increment(1, { file: url, emoji: '❌' });
  } finally {
    // progressBar.increment();
  }
}

async function main() {
  try {
    // Create downloads directory if it doesn't exist
    const outputDir = path.join(process.cwd(), 'resources/ircc.canada.ca');
    await fs.mkdir(outputDir, { recursive: true });

    // Read and parse sitemap
    console.log(`Fetching sitemap from ${SITEMAP_URL}...`);
    const sitemapContent = await (await fetch(SITEMAP_URL)).text();
    const sitemapData = new XMLParser().parse(sitemapContent);
    console.log('Sitemap fetched successfully.');

    // Initialize progress bar
    const urls = sitemapData.urlset.url;
    console.log(`Downloading ${urls.length} elements...`);
    progressBar.start(urls.length, 0);
    console.log('');
    
    for (const url of urls) {
      if (url.loc) {
        await downloadResource(url.loc, outputDir);
      }
    }

    progressBar.stop();
    console.log('Download complete!');
  } catch (error) {
    console.error('Error:', error.message);
  }
}

main();