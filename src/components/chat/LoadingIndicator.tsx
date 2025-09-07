'use client';

export default function LoadingIndicator() {
  return (
    <div className="flex gap-3 lg:gap-4 px-4 lg:px-6 py-4 lg:py-6 bg-gradient-to-r from-purple-900/20 via-blue-900/10 to-purple-900/20 border-l-4 border-purple-400/40 rounded-r-2xl mx-0 lg:mx-2">
      <div className="flex-shrink-0">
        <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 text-white glow-effect flex items-center justify-center text-lg shadow-lg">
          🤔
        </div>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-sm bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Chess Butler
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            thinking...
          </span>
        </div>
        
        <div className="bg-purple-900/15 p-4 rounded-2xl border border-purple-400/30 shadow-lg backdrop-blur-sm">
          <div className="flex gap-1.5">
            <span className="loading-dot inline-block w-2 h-2 bg-purple-400 rounded-full"></span>
            <span className="loading-dot inline-block w-2 h-2 bg-purple-400 rounded-full"></span>
            <span className="loading-dot inline-block w-2 h-2 bg-purple-400 rounded-full"></span>
          </div>
        </div>
      </div>
    </div>
  );
}