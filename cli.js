import * as rag from './src/rag.js';
import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const history = [];

function exit(code = 0) {
  rl.close();
  console.debug(history);
  process.exit(code);
}

async function main() {
  process.on('SIGINT', () => exit(0));

  try {
    let query = await rl.question("Enter your question (type 'exit' to finish):\n");
    while (query != 'exit') {
      const { question, answer, error } = await rag.ask(query, history);
      const reply = error || answer || '(no answer)';
      if (error) {
        console.warn(`Prompt error: ${JSON.stringify({ question, answer, error }, null, 2)}`);
      } else {
        history.push({ query: question, answer: reply });
      }
      console.log('\n', reply, '\n');
      query = await rl.question('>');
    }
  } catch (error) {
    exit(1);
  }

  exit(0);
}

main();
