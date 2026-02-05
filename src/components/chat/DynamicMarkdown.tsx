'use client';

import { useEffect, useState } from 'react';

interface DynamicMarkdownProps {
  children: string;
  className?: string;
}

// Chess move highlighting component
const HighlightedText = ({ children }: { children: string }) => {
  // Pattern to match chess moves like "Knight to E4", "Pawn to D5", "castles kingside", etc.
  const movePattern =
    /((?:King|Queen|Rook|Bishop|Knight|Pawn)\s+to\s+[A-H][1-8]|castles\s+(?:kingside|queenside))/gi;

  const parts = children.split(movePattern);

  return (
    <>
      {parts.map((part, index) => {
        if (part.match(movePattern)) {
          return (
            <span
              key={index}
              className="chess-move-highlight font-semibold text-blue-300"
              style={{
                textShadow: '0 0 12px rgba(59, 130, 246, 0.8), 0 0 6px rgba(59, 130, 246, 0.6)',
              }}
            >
              {part}
            </span>
          );
        }
        return part;
      })}
    </>
  );
};

// Simple markdown fallback for loading state
function SimpleMarkdown({ children, className }: DynamicMarkdownProps) {
  // Basic markdown-like formatting as fallback
  const formatText = (text: string) => {
    // Simple bold formatting
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Simple italic formatting
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Simple code formatting
    formatted = formatted.replace(/`(.*?)`/g, '<code class="bg-gray-700 px-1 rounded">$1</code>');

    return formatted;
  };

  return <div className={className} dangerouslySetInnerHTML={{ __html: formatText(children) }} />;
}

export default function DynamicMarkdown({ children, className }: DynamicMarkdownProps) {
  const [ReactMarkdown, setReactMarkdown] = useState<any>(null);
  const [remarkGfm, setRemarkGfm] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadMarkdown = async () => {
      try {
        const [markdownModule, gfmModule] = await Promise.all([
          import('react-markdown'),
          import('remark-gfm'),
        ]);

        if (mounted) {
          setReactMarkdown(() => markdownModule.default);
          setRemarkGfm(() => gfmModule.default);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('Failed to load markdown renderer, using fallback:', error);
        if (mounted) {
          setReactMarkdown(null);
          setRemarkGfm(null);
          setIsLoading(false);
        }
      }
    };

    loadMarkdown();

    return () => {
      mounted = false;
    };
  }, []);

  // Use simple markdown fallback while loading or if loading failed
  if (isLoading || !ReactMarkdown) {
    return <SimpleMarkdown className={className}>{children}</SimpleMarkdown>;
  }

  // Use full ReactMarkdown once loaded
  try {
    return (
      <div className={className}>
        <ReactMarkdown
          remarkPlugins={remarkGfm ? [remarkGfm] : undefined}
          components={{
            pre: ({ children }: any) => (
              <pre className="bg-slate-900 p-3 rounded-lg overflow-x-auto my-3 border border-slate-700">
                <code className="text-green-400 text-sm font-mono">{children}</code>
              </pre>
            ),
            code: ({ children, className }: any) => {
              const isInline = !className;
              return isInline ? (
                <code className="bg-slate-700 px-1.5 py-0.5 rounded text-emerald-300 text-sm font-mono">
                  {children}
                </code>
              ) : (
                <code className={`text-green-400 text-sm font-mono ${className || ''}`}>
                  {children}
                </code>
              );
            },
            p: ({ children }: any) => (
              <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
            ),
            text: ({ children }: any) => {
              if (typeof children === 'string') {
                return <HighlightedText>{children}</HighlightedText>;
              }
              return children;
            },
            strong: ({ children }: any) => (
              <strong className="font-bold text-white">{children}</strong>
            ),
            em: ({ children }: any) => <em className="italic text-blue-200">{children}</em>,
            ul: ({ children }: any) => (
              <ul className="list-disc list-inside mb-3 space-y-1 text-slate-200">{children}</ul>
            ),
            ol: ({ children }: any) => (
              <ol className="list-decimal list-inside mb-3 space-y-1 text-slate-200">{children}</ol>
            ),
            li: ({ children }: any) => <li className="text-slate-200">{children}</li>,
            blockquote: ({ children }: any) => (
              <blockquote className="border-l-4 border-blue-500 pl-4 italic my-3 text-blue-200">
                {children}
              </blockquote>
            ),
          }}
        >
          {children}
        </ReactMarkdown>
      </div>
    );
  } catch (error) {
    console.warn('ReactMarkdown rendering failed, using fallback:', error);
    return <SimpleMarkdown className={className}>{children}</SimpleMarkdown>;
  }
}
