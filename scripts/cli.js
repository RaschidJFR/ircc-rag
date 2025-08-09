import readline from 'readline/promises';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const history = [];

async function askServer(question, history) {
  const res = await fetch('http://localhost:3000/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history }),
  });
  if (!res.ok) {
    return { question, answer: null, error: `HTTP ${res.status}` };
  }
  return await res.json();
}

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
      const { question, answer, error } = await askServer(query, history);
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
    console.error('Error during interaction:', error);
    exit(1);
  }

  exit(0);
}

main();
