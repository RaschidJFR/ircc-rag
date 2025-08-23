import fs from 'node:fs';
import path from 'node:path';

export class SessionLogger {
  isProduction = false;
  content = [];
  suffix = '';
  start = new Date();
  lastTick = new Date();

  constructor(filenameSuffix = '') {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.filenameSuffix = filenameSuffix;
    this.start = new Date();
    this.lastTick = new Date();
  }

  getElapsedTime() {
    return ((new Date() - this.start) / 1000).toFixed(1);
  }

  tick() {
    const elapsed = ((new Date() - this.lastTick) / 1000).toFixed(1);
    this.content[this.content.length - 1] += `\n\n_(${elapsed}s)_\n\n`;
    this.lastTick = new Date();
  }

  append(...content) {
    this.content.push((typeof content === 'string' ? content : content.join('')) + '\n\n');
  }

  prepend(...content) {
    this.content.unshift((typeof content === 'string' ? content : content.join('')) + '\n\n');
  }

  insert(content, index) {
    this.content.splice(index, 0, content);
  }

  appendResult(content, format = '', header = '') {
    header = header ? `${header}\n\n` : '';
    this.append(`${header}\`\`\`${format}\n${content}\n\`\`\``);
    this.tick();
  }

  write() {
    if (this.isProduction) return;

    this.prepend(`\n\n_(Total interaction time: ${this.getElapsedTime()}s)_\n\n`);

    // Save the ragPrompt string to a markdown file in /logs/<timestamp>.md
    const suffix = this.filenameSuffix;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `logs/${timestamp}${suffix && '_' + suffix}.md`;

    const logDir = path.dirname(logFileName);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logFileName, this.content.join(''), 'utf8');
  }
}
