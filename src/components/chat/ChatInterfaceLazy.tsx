'use client';

import { lazy, Suspense } from 'react';
import { ChatMessage as ChatMessageType } from '@/types';

// Lazy load the chat interface and its heavy dependencies
const ChatInterfaceComponent = lazy(() => import('./ChatInterface'));

interface ChatInterfaceProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
}

// Loading fallback for chat interface
function ChatLoading() {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-purple-950 to-slate-950 backdrop-blur-md lg:rounded-2xl overflow-hidden">
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 animate-pulse" />
          <p className="text-slate-400 text-sm font-medium">Loading Chat Interface...</p>
        </div>
      </div>
      
      {/* Mock input area to prevent layout shift */}
      <div className="p-4 bg-gradient-to-r from-purple-900 via-blue-900 to-purple-900">
        <div className="flex items-center space-x-3">
          <div className="flex-1 h-12 bg-slate-800/50 rounded-xl animate-pulse" />
          <div className="w-12 h-12 bg-blue-600/50 rounded-xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function ChatInterfaceLazy(props: ChatInterfaceProps) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <ChatInterfaceComponent {...props} />
    </Suspense>
  );
}