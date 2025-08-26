import { RAGResponseParagraph } from './types';

export function parseAnswer(answer: RAGResponseParagraph[]) {
  return answer
    .map((paragraph) => {
      const references =
        paragraph.references
          ?.map(({ url, quoteText, refNum }) => {
            const firstSentence = quoteText.match(/[^\n\,\.\!\?\:\;\-]{10,}/)?.[0].trim();
            const anchor = firstSentence ? `#:~:text=${encodeURIComponent(firstSentence)}` : '';
            return `>_"${quoteText}"_ [[${refNum}]](${url}${anchor})`;
          })
          .join('\n\n') || '';

      return `${paragraph.text}\n\n${references}`;
    })
    .join('\n\n');
}
