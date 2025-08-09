'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Trash2 } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

interface ChatProps {}

export const Chat: React.FC<ChatProps> = ({}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Chat Trigger Button */}
      {!isOpen && (
        <button
          onClick={toggleChat}
          className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 z-40"
        >
          <MessageCircle size={24} />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-0 right-0 top-0 w-full h-full md:bottom-6 md:right-6 md:top-6 md:w-96 md:max-w-[calc(100vw-3rem)] md:h-[calc(100vh-3rem)] transition-all duration-300 z-40"
        >
          <div className="bg-white rounded-lg shadow-2xl border border-gray-200 h-full flex flex-col">
            {/* Header */}
            <div 
              className="bg-blue-500 text-white p-4 rounded-t-lg flex items-center justify-between cursor-pointer hover:bg-blue-600 transition-colors"
              onClick={toggleChat}
            >
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <h3 className="font-semibold">Chat Assistant</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="hover:bg-blue-700 p-1 rounded transition-colors"
                  title="Clear conversation"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearMessages();
                  }}
                >
                  <Trash2 size={16} />
                </button>
                <button
                  className="hover:bg-blue-700 p-1 rounded transition-colors"
                  title="Close"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChat();
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Content */}
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p>Start a conversation!</p>
                    <p className="text-sm">Ask me anything and I'll help you find information.</p>
                  </div>
                )}
                
                {messages.map((message) => (
                  <ChatMessage
                    key={message.id}
                    message={message}
                  />
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

              {/* Input */}
              <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
            </>
          </div>
        </div>
      )}
    </>
  );
};