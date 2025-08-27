import fs from 'node:fs';
import path from 'node:path';

export class SessionLogger {
  isProduction = false;
  content = [];
  suffix = '';
  start = new Date();
  lastTick = new Date();
  filenameSuffix = '';

  constructor(filenameSuffix = '') {
    this.isProduction = process.env.NODE_ENV === 'production';
    this.filenameSuffix = filenameSuffix;
    this.start = new Date();
    this.lastTick = new Date();
  }

  getElapsedTime() {
    return (new Date().getTime() - this.start.getTime()) / 1000;
  }

  _tick() {
    const delta = (new Date().getTime() - this.lastTick.getTime()) / 1000;
    this.lastTick = new Date();
    return delta;
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

  appendResult(content: string, format = '', header = '') {
    const elapsed = this._tick().toFixed(1);
    header = header ? `${header} (${elapsed}s)\n\n` : '';
    this.append(`${header}\`\`\`${format}\n${content}\n\`\`\``);
  }

  write(suffix = '') {
    if (this.isProduction) return;

    this.prepend(`\n\n_(Total interaction time: ${this.getElapsedTime().toFixed(1)}s)_\n\n`);

    // Save the ragPrompt string to a markdown file in /logs/<timestamp>.md
    suffix = this.filenameSuffix;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const logFileName = `logs/${timestamp}${suffix && '_' + suffix}.md`;

    const logDir = path.dirname(logFileName);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.writeFileSync(logFileName, this.content.join(''), 'utf8');
  }
}
