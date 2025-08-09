'use client';
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';

type ChatProps = Record<string, never>;

export const Chat: React.FC<ChatProps> = () => {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded on mobile
  const { messages, isLoading, error, sendMessage, clearMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const toggleDrawer = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      {/* Mobile Drawer Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 md:hidden z-40"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Mobile Chat Drawer */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transform transition-transform duration-300 md:hidden ${
        isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'
      }`}>
        <div className="bg-white rounded-t-lg border-t border-gray-200 h-[80vh] flex flex-col shadow-2xl shadow-top">
          {/* Mobile Header - Always visible */}
          <div
            className="bg-blue-500 text-white p-4 rounded-t-lg flex items-center justify-between cursor-pointer hover:bg-blue-600 transition-colors"
            onClick={toggleDrawer}
          >
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <h3 className="font-semibold">Chat Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              {/* Delete button */}
              {isExpanded ? (
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
              ) : null}

              {/* Drawer indicator */}
              {isExpanded ? (
                <ChevronDown size={20} className="text-blue-200" />
              ) : (
                <ChevronUp size={20} className="text-blue-200" />
              )}
            </div>
          </div>

          {/* Mobile Messages - Only visible when expanded */}
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
                onLinkClick={() => setIsExpanded(false)}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
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

          {/* Mobile Input - Only visible when expanded */}
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
        </div>
      </div>

      {/* Desktop Side Panel */}
      <div className="hidden md:flex md:fixed md:right-0 md:top-0 md:bottom-0 md:w-96 md:z-40">
        <div className="bg-white shadow-2xl border-l border-gray-200 h-full flex flex-col w-full">
          {/* Desktop Header */}
          <div className="bg-blue-500 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle size={20} />
              <h3 className="font-semibold">Chat Assistant</h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="hover:bg-blue-700 p-1 rounded transition-colors"
                title="Clear conversation"
                onClick={clearMessages}
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          {/* Desktop Messages */}
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
                onLinkClick={() => setIsExpanded(false)}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg p-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.1s' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    ></div>
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

          {/* Desktop Input */}
          <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
        </div>
      </div>
    </>
  );
};