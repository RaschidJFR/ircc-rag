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
    <div className="h-screen w-screen bg-gray-50 flex flex-col">
      {/* Main Content Area */}
      <div className="min-h-full h-full md:mr-96 pb-[60px] md:pb-0 overflow-y-auto">
        {targetPath ? (
          <div className="min-h-full h-full w-full">
            {/* Iframe */}
            <iframe
              src={url}
              className="w-full h-full border-0"
              title="Content Viewer"
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
            />
          </div>
        ) : (
          <WelcomeMessage />
        )}
      </div>

      {/* Floating Chat */}
      <Chat />
    </div>
  );
}

const WelcomeMessage = () => (
  <div className="flex items-center justify-center min-h-full">
    <div className="text-center text-gray-700 max-w-2xl px-8">
      {/* Canadian Maple Leaf */}
      <div className="mb-6">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-20 h-20 mx-auto text-red-600">
          <path
            fill="currentColor"
            d="M447.8 415.7C450.3 413.2 553 323.3 553 323.3L535.5 315.8C525.5 310.9 528.1 304.3 530.5 298.4C532.9 290.8 550.6 231.1 550.6 231.1C550.6 231.1 502.9 241.1 492.9 243.6C485.4 246 482.9 241.1 480.4 236.1C477.9 231.1 465.4 203.7 465.4 203.7C465.4 203.7 412.8 263.6 410.3 266C400.3 273.5 390.2 266 392.7 256C392.7 246 420.3 126.4 420.3 126.4C420.3 126.4 390.2 143.8 380.2 148.8C372.7 153.8 367.6 153.8 362.6 143.8C357.5 136.3 319.9 64 319.9 64C319.9 64 282.4 136.3 277.4 143.8C272.4 153.8 267.4 153.8 259.8 148.8C249.8 143.8 219.7 126.4 219.7 126.4C219.7 126.4 247.3 246 247.3 256C249.8 266 239.8 273.5 229.7 266C227.2 263.5 174.6 203.7 174.6 203.7C174.6 203.7 162.1 231 159.6 236C157.1 241 154.6 245.9 147.1 243.5C137 241 89.4 231 89.4 231C89.4 231 107 290.7 109.5 298.3C111.9 304.3 114.5 310.8 104.5 315.7L87 323.3C87 323.3 189.6 413.2 192.2 415.7C197.3 420.7 202.2 423.2 197.3 438.2C192.2 453.2 187.2 473.3 187.2 473.3C187.2 473.3 282.4 453.2 292.5 450.7C301.2 449.8 310.8 453.2 310.8 463.2C310.8 473.2 305 576 305 576L335 576C335 576 329.2 473.3 329.2 463.2C329.2 453.1 338.7 449.8 347.6 450.7C357.6 453.2 452.8 473.3 452.8 473.3C452.8 473.3 447.8 453.2 442.8 438.2C437.8 423.2 442.8 420.7 447.8 415.7z"
          />
        </svg>
      </div>

      <h1 className="text-3xl font-bold mb-6 text-gray-800">
        Welcome to Your <span className="text-red-600">[Unofficial]</span> IRCC AI Assistant
      </h1>

      <div className="text-left space-y-4 text-gray-600 leading-relaxed">
        <p className="text-lg">
          Tired of spending hours digging through IRCC's website for answers? Me too! That's why I built this AI
          companion—to get fast and accurate answers on immigration questions.
        </p>

        <ul className="space-y-2 ml-4">
          <li className="flex items-start">
            <span className="text-red-600 mr-2">•</span>
            Ask your questions in the chat window.
          </li>
          <li className="flex items-start">
            <span className="text-red-600 mr-2">•</span>
            When an answer includes references, click them to preview the source here.
          </li>
        </ul>

        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-yellow-600 text-xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-800">
                This is an independent, experimental project and a work in progress. You can expect to see changes
                often. Always confirm important details with the official IRCC site.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm">
            See the project on GitHub:
            <br />
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
);
