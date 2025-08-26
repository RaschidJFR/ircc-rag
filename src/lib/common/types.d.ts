export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface RAGResponseParagraph {
  text: string;
  references: {
    refNum: string;
    url: string;
    quoteText: string;
  }[];
}

export type AskApiResponse = {
  error?: string;
  content: RAGResponseParagraph[];
};

export type AskApiRequestParams = {
  /** @deprecated */
  question?: string;
  /** @deprecated */
  history?: any[];
  query?: ChatMessage[];
  format: 'json' | 'markdown'
};
