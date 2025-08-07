import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onLinkClick: (url: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onLinkClick }) => {
  const isBot = message.type === 'bot';

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    const href = event.currentTarget.href;
    onLinkClick(href);
  };

  return (
    <div className={`flex mb-3 ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[80%]">
        <div
          className={`p-3 rounded-lg ${
            isBot
              ? 'bg-gray-100 text-gray-800 rounded-bl-sm'
              : 'bg-blue-500 text-white rounded-br-sm'
          }`}
        >
          {isBot ? (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      onClick={handleLinkClick}
                      className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      {children}
                    </a>
                  ),
                  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2">{children}</ol>,
                  li: ({ children }) => <li className="mb-1">{children}</li>,
                  code: ({ children }) => (
                    <code className="bg-gray-200 px-1 py-0.5 rounded text-sm">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-200 p-2 rounded text-sm overflow-x-auto">{children}</pre>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>
        <div className={`text-xs text-gray-500 mt-1 ${isBot ? 'text-left' : 'text-right'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};