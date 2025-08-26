import { useState, useCallback } from 'react';
import type { ChatMessage, ApiResponse } from '../chat.d';
import { parseAnswer } from 'lib/common/tools';
import { AskApiRequestParams } from 'lib/common/types';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      const userMessage: ChatMessage = {
        id: Date.now().toString(),
        type: 'user',
        content: query,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Prepare history in the format expected by the backend
        const historyPayload = messages
          .map((m) => ({
            query: m.type === 'user' ? m.content : '',
            answer: m.type === 'bot' ? m.content : '',
          }))
          .filter((h) => h.query || h.answer);

        const params: AskApiRequestParams = { question: query, history: historyPayload, format: 'json' };

        const res = await fetch('/api/ask', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(params),
        });

        if (!res.ok) {
          const { error } = await res.json();
          setError(`${error} (${res.status})`);
          return;
        }

        const data: ApiResponse = await res.json();

        if (data.error) {
          setError(data.error);
          return;
        }

        const botMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          type: 'bot',
          content: parseAnswer(data.content),
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setIsLoading(false);
      }
    },
    [messages]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
  };
};
