import { AskApiResponse } from 'lib/common/types';

export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export type ApiResponse = AskApiResponse;
