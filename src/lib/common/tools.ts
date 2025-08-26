import { RAGResponseParagraph } from './types';

export function parseAnswer(answer: RAGResponseParagraph[]) {
  return answer
    .map((paragraph) => {
      const references =
        paragraph.references
          ?.map(({ url, quoteText, refNum }) => {
            return `>_"${quoteText}"_ [[${refNum}]](${url})`;
          })
          .join('\n\n') || '';

      return `${paragraph.text}\n\n${references}`;
    })
    .join('\n\n');
}
