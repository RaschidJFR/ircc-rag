export interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

export interface ApiResponse {
  question: string;
  answer: string;
  error: string | false;
}