'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Bot, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useChat } from './hooks/useChat';
import { ChatInput } from './ChatInput';
import { ChatMessageList } from './ChatMessageList';

type ChatProps = Record<string, never>;

export const Chat: React.FC<ChatProps> = () => {
  const [isExpanded, setIsExpanded] = useState(false);
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
      {/* Backdrop: only on mobile when expanded */}
      {isExpanded && <div className="fixed inset-0 bg-black/20 md:hidden z-40" onClick={() => setIsExpanded(false)} />}

      {/* Unified responsive chat panel */}
      <div
        className={`fixed z-50 bg-white shadow-2xl border-gray-200 flex flex-col
          bottom-0 left-0 right-0 h-[80vh] rounded-t-lg border-t shadow-top transform transition-transform duration-300
          ${isExpanded ? 'translate-y-0' : 'translate-y-[calc(100%-60px)]'}
          md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-96 md:h-full md:rounded-none md:border-t-0 md:border-l md:translate-y-0
        `}
      >
        {/* Header (clickable on mobile to toggle) */}
        <div
          className="bg-red-600 text-white p-4 flex items-center justify-between rounded-t-lg md:rounded-none cursor-pointer md:cursor-default hover:bg-red-700 md:hover:bg-red-600 transition-colors"
          onClick={toggleDrawer}
        >
          <div className="flex items-center gap-2">
            <Bot size={20} />
            <h3 className="font-semibold">Ask me questions...</h3>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile: show delete only when expanded */}
            {isExpanded && (
              <button
                className="md:hidden hover:bg-red-700 p-1 rounded transition-colors"
                title="Clear conversation"
                onClick={(e) => {
                  e.stopPropagation();
                  clearMessages();
                }}
              >
                <Trash2 size={16} />
              </button>
            )}

            {/* Desktop: always show delete */}
            <button
              className="hidden md:inline-flex hover:bg-red-700 p-1 rounded transition-colors"
              title="Clear conversation"
              onClick={(e) => {
                e.stopPropagation();
                clearMessages();
              }}
            >
              <Trash2 size={16} />
            </button>

            {/* Drawer indicator (mobile only) */}
            <span className="md:hidden">
              {isExpanded ? (
                <ChevronDown size={20} className="text-red-200" />
              ) : (
                <ChevronUp size={20} className="text-red-200" />
              )}
            </span>
          </div>
        </div>

        {/* Messages */}
        <ChatMessageList
          messages={messages}
          isLoading={isLoading}
          error={error}
          messagesEndRef={messagesEndRef}
          onLinkClick={() => setIsExpanded(false)}
        />

        {/* Input */}
        <ChatInput onSendMessage={sendMessage} isLoading={isLoading} />
      </div>
    </>
  );
};
