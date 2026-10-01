import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Check, Copy } from 'lucide-react';
import Prism from 'prismjs';

// Load common Prism language definitions
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-rust';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-yaml';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-markup';

interface MarkdownRendererProps {
  content: string;
  searchQuery?: string;
  isCurrentSearchMatch?: boolean;
}

/**
 * Normalizes alternative LaTeX bracket syntax:
 * \[ ... \] -> $$ ... $$ (display math)
 * \( ... \) -> $ ... $ (inline math)
 * so remark-math and rehype-katex parse them flawlessly.
 */
function preprocessLaTeX(text: string): string {
  if (!text) return '';

  let processed = text;

  // Replace \[ ... \] with $$ ... $$
  processed = processed.replace(/\\\[([\s\S]*?)\\\]/g, (_match, math) => {
    return `\n$$\n${math.trim()}\n$$\n`;
  });

  // Replace \( ... \) with $ ... $
  processed = processed.replace(/\\\(([\s\S]*?)\\\)/g, (_match, math) => {
    return `$${math.trim()}$`;
  });

  return processed;
}

interface CodeBlockProps {
  language: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightedHtml = useMemo(() => {
    const lang = (language || '').toLowerCase().trim();
    const grammar = Prism.languages[lang] || Prism.languages.javascript || Prism.languages.markup;
    if (grammar) {
      try {
        return Prism.highlight(code, grammar, lang || 'javascript');
      } catch {
        // Fallback on error
      }
    }
    return null;
  }, [code, language]);

  const displayLang = language ? language.toUpperCase() : 'CODE';

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-neutral-200/80 dark:border-neutral-800 bg-[#1e1e28] text-neutral-100 shadow-md">
      {/* Code Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#171720] border-b border-white/[0.06] text-xs">
        <span className="font-mono text-[11px] font-semibold text-amber-400 tracking-wider">
          {displayLang}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium text-neutral-300 hover:text-white hover:bg-white/[0.1] active:scale-95 transition-all cursor-pointer"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-neutral-400" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <div className="p-3.5 overflow-x-auto text-[13px] leading-relaxed font-mono">
        {highlightedHtml ? (
          <pre className="!bg-transparent !p-0 !m-0">
            <code
              className={`language-${language || 'text'}`}
              dangerouslySetInnerHTML={{ __html: highlightedHtml }}
            />
          </pre>
        ) : (
          <pre className="!bg-transparent !p-0 !m-0 whitespace-pre">
            <code>{code}</code>
          </pre>
        )}
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const processedContent = useMemo(() => preprocessLaTeX(content), [content]);

  return (
    <div className="markdown-content text-[14.5px] leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Code & Syntax Highlighting
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const rawCode = String(children).replace(/\n$/, '');
            const isInline = !match && !rawCode.includes('\n');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 rounded-md font-mono text-[13px] bg-neutral-100 dark:bg-white/[0.08] text-amber-700 dark:text-amber-300 border border-black/[0.06] dark:border-white/[0.08]"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <CodeBlock
                language={match ? match[1] : ''}
                code={rawCode}
              />
            );
          },

          // Headings
          h1({ children }) {
            return (
              <h1 className="text-lg sm:text-xl font-bold mt-4 mb-2 text-neutral-900 dark:text-white tracking-tight first:mt-0">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-base sm:text-lg font-bold mt-3.5 mb-1.5 text-neutral-900 dark:text-white tracking-tight first:mt-0">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-sm sm:text-base font-semibold mt-3 mb-1 text-neutral-900 dark:text-white first:mt-0">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm font-semibold mt-2.5 mb-1 text-neutral-900 dark:text-white first:mt-0">
                {children}
              </h4>
            );
          },

          // Paragraphs
          p({ children }) {
            return <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>;
          },

          // Blockquotes
          blockquote({ children }) {
            return (
              <blockquote className="my-2.5 pl-3.5 py-1 border-l-3 border-amber-500 bg-amber-500/[0.06] text-neutral-700 dark:text-neutral-300 rounded-r-lg italic text-[14px]">
                {children}
              </blockquote>
            );
          },

          // Lists
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },

          // Tables
          table({ children }) {
            return (
              <div className="my-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-xs">
                <table className="min-w-full divide-y divide-neutral-200 dark:divide-neutral-800 text-left text-xs sm:text-sm">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-900 dark:text-white font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-neutral-100 dark:divide-neutral-850 bg-white dark:bg-[#161824]">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-3 py-2 font-semibold text-neutral-900 dark:text-white">{children}</th>;
          },
          td({ children }) {
            return <td className="px-3 py-2 text-neutral-700 dark:text-neutral-300">{children}</td>;
          },

          // Links
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-600 dark:text-amber-400 underline underline-offset-2 hover:text-amber-700 dark:hover:text-amber-300 font-medium transition-colors"
              >
                {children}
              </a>
            );
          },

          // Horizontal rule
          hr() {
            return <hr className="my-3 border-t border-neutral-200 dark:border-neutral-800" />;
          },

          // Strong / Bold
          strong({ children }) {
            return <strong className="font-semibold text-neutral-900 dark:text-white">{children}</strong>;
          },

          // Emphasis / Italic
          em({ children }) {
            return <em className="italic">{children}</em>;
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};
