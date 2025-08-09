import { Globe } from 'lucide-react';
import { Chat } from '../components/chat/Chat';

export default async function Page({
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ show?: string }>;
}) {
  const targetPath = (await searchParams).show as string | undefined;
  const url = `/proxy?url=${targetPath}`;

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-50">
      {/* Main Content Area */}
      <div className="flex-1 relative md:mr-96">
        {targetPath ? (
          <div className="h-full w-full relative">
            {/* Iframe */}
            <iframe
              src={url}
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
                Start a conversation using the chat button in the bottom-right corner. When you click on links in the
                chat responses, they'll appear here.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat */}
      <Chat />
    </div>
  );
}
