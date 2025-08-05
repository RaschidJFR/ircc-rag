import React, { useState } from 'react';
import { Chat } from './components/Chat';
import { Globe } from 'lucide-react';

function App() {
  const [iframeUrl, setIframeUrl] = useState<string>('');

  const handleLinkClick = (url: string) => {
    setIframeUrl(url);
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 relative">
        {iframeUrl ? (
          <div className="h-full w-full relative">
            {/* URL Bar */}
            <div className="bg-white border-b border-gray-200 px-4 py-2 flex items-center gap-3 shadow-sm">
              <Globe size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600 truncate flex-1">{iframeUrl}</span>
              <button
                onClick={() => setIframeUrl('')}
                className="text-gray-500 hover:text-gray-700 text-sm px-2 py-1 rounded hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
            </div>
            
            {/* Iframe */}
            <iframe
              src={iframeUrl}
              className="w-full h-[calc(100%-48px)] border-0"
              title="Content Viewer"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Globe size={64} className="mx-auto mb-4 text-gray-300" />
              <h2 className="text-xl font-semibold mb-2">Welcome to Chat Assistant</h2>
              <p className="text-gray-600 max-w-md">
                Start a conversation using the chat button in the bottom-right corner. 
                When you click on links in the chat responses, they'll appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat */}
      <Chat onLinkClick={handleLinkClick} />
    </div>
  );
}

export default App;