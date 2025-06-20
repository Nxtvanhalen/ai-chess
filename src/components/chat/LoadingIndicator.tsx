'use client';

export default function LoadingIndicator() {
  return (
    <div className="flex gap-4 px-6 py-4 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-800 to-gray-900 dark:from-gray-100 dark:to-gray-200 flex items-center justify-center text-white dark:text-gray-900 text-sm font-semibold shadow-sm">
          CB
        </div>
      </div>
      
      <div className="flex-1">
        <div className="flex items-baseline gap-2 mb-2">
          <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Chess Butler</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">thinking...</span>
        </div>
        
        <div className="flex gap-1.5">
          <span className="loading-dot inline-block w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full"></span>
          <span className="loading-dot inline-block w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full"></span>
          <span className="loading-dot inline-block w-2 h-2 bg-gray-600 dark:bg-gray-400 rounded-full"></span>
        </div>
      </div>
    </div>
  );
}