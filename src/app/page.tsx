import { MapPin } from 'lucide-react';
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
            <div className="text-center text-gray-700 max-w-2xl px-8">
              {/* Canadian Maple Leaf */}
              <div className="mb-6">
                <svg 
                  width="80" 
                  height="80" 
                  viewBox="0 0 100 100" 
                  className="mx-auto text-red-600"
                  fill="currentColor"
                >
                  <path d="M50 10 L55 25 L70 20 L60 35 L75 40 L60 50 L80 60 L65 65 L70 80 L50 70 L30 80 L35 65 L20 60 L40 50 L25 40 L40 35 L30 20 L45 25 Z"/>
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold mb-6 text-gray-800">
                Welcome to Your <span className="text-red-600">[Unofficial]</span> IRCC AI Assistant!
              </h1>
              
              <div className="text-left space-y-4 text-gray-600 leading-relaxed">
                <p className="text-lg">
                  Tired of spending hours digging through IRCC's website for answers? Me too. 
                  That's why I built this AI companion—to get faster and accurate answers on immigration questions.
                </p>
                
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    Ask your questions in the chat on the right.
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">•</span>
                    When an answer includes references, click them to preview the source here on the left. 
                    (That's why it looks empty until you pick a link!)
                  </li>
                </ul>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <span className="text-yellow-600 text-xl">⚠️</span>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-yellow-800">
                        This is an independent, experimental project and a work in progress. 
                        You can expect to see changes often. Always confirm important details with the official IRCC site.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm">
                    See the project on GitHub: 
                    <a 
                      href="https://github.com/RaschidJFR/ircc-rag/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline ml-1"
                    >
                      https://github.com/RaschidJFR/ircc-rag/
                    </a>
                  </p>
                  <p className="text-sm mt-2 text-gray-500">
                    Feedback is super welcome—feel free to open an issue or drop a comment!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Floating Chat */}
      <Chat />
    </div>
  );
}
