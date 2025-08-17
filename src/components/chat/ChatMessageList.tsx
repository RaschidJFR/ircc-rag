'use client';
import React from 'react';
import { Bot } from 'lucide-react';
import { ChatMessage } from './ChatMessage';
import { ChatMessage as ChatMessageType } from './chat.d';

export const ChatMessageList: React.FC<{
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  onLinkClick: () => void;
}> = ({ messages, isLoading, error, messagesEndRef, onLinkClick }) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 && (
        <div className="text-center text-gray-500 py-8">
          <Bot size={48} className="mx-auto mb-4 text-gray-300" />
          <p>Start a conversation!</p>
          <p className="text-sm">I can help you find answers for IRCC and immigration-related questions.</p>
        </div>
      )}

      {messages.map((message) => (
        <ChatMessage key={message.id} message={message} onLinkClick={onLinkClick} />
      ))}

      {isLoading && (
        <div className="flex justify-start">
          <div className="bg-gray-100 rounded-lg p-3">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="text-sm">{error}</p>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
};
