import { useState, useCallback } from 'react';
import { ChatMessage, ApiResponse } from '../types/chat';

export const useChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (query: string) => {
    if (!query.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // Mock response for demonstration
    setTimeout(() => {
      const mockResponses = [
        {
          question: query,
          answer: "Here are some helpful resources:\n\n- [React Documentation](https://react.dev) - Official React docs\n- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework\n- [TypeScript Handbook](https://www.typescriptlang.org/docs/) - Learn TypeScript\n\nYou can click on any of these links to view them in the main window. Let me know if you need more specific information!",
          error: false
        },
        {
          question: query,
          answer: "I found some interesting articles for you:\n\n**Web Development Resources:**\n\n1. [MDN Web Docs](https://developer.mozilla.org) - Comprehensive web development documentation\n2. [GitHub](https://github.com) - Code hosting and collaboration\n3. [Stack Overflow](https://stackoverflow.com) - Programming Q&A community\n\n*Click any link above to open it in the viewer!*",
          error: false
        },
        {
          question: query,
          answer: "Here's what I found:\n\n```javascript\nconst example = 'This is a code example';\nconsole.log(example);\n```\n\nFor more detailed information, check out:\n- [JavaScript Info](https://javascript.info) - Modern JavaScript tutorial\n- [CSS Tricks](https://css-tricks.com) - CSS tips and tricks\n\nWould you like me to explain any specific concept?",
          error: false
        }
      ];

      const randomResponse = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: randomResponse.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds

    return;

    try {
      const response = await fetch(`/api/ask?query=${encodeURIComponent(query)}`);
      const data: ApiResponse = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

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