import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from './CodeBlock';

/**
 * Markdown.tsx
 * ──────────────
 * Renders agent/step output as real markdown — bold, italics, lists,
 * headers, links, tables — instead of dumping raw text (with literal
 * "**bold**" asterisks) into a <p>. Fenced code blocks are handed off
 * to the existing CodeBlock component so syntax highlighting + copy
 * button stay consistent everywhere code shows up.
 *
 * Styling is hand-applied per element (no @tailwind/typography plugin
 * installed) using the same muted-gray-on-near-black palette and
 * generous 1.6 line-height used elsewhere in the task pages.
 */
export function Markdown({ text }: { text: string }) {
  return (
    <div className="markdown-body text-[15px] text-[#dbdee3]" style={{ lineHeight: '1.65' }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold text-[#f2f3f5]">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7ee787] hover:underline">
              {children}
            </a>
          ),
          h1: ({ children }) => <h1 className="text-xl font-bold text-[#f2f3f5] mt-6 mb-3 first:mt-0">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-[#f2f3f5] mt-6 mb-3 first:mt-0">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-[#f2f3f5] mt-5 mb-2 first:mt-0">{children}</h3>,
          ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1.5 marker:text-[#5b6169]">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1.5 marker:text-[#5b6169]">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-white/15 pl-4 my-4 text-[#9aa1ab] italic">{children}</blockquote>
          ),
          hr: () => <hr className="my-6 border-white/10" />,
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="border-b border-white/15">{children}</thead>,
          th: ({ children }) => <th className="text-left font-semibold text-[#f2f3f5] py-2 pr-4">{children}</th>,
          td: ({ children }) => <td className="py-2 pr-4 border-b border-white/5 align-top">{children}</td>,
          code: ({ className, children, ...props }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-[#eaecef] text-[0.9em] font-mono">
                  {children}
                </code>
              );
            }
            const lang = /language-(\w+)/.exec(className || '')?.[1] || 'text';
            const code = String(children).replace(/\n$/, '');
            return <CodeBlock code={code} lang={lang} />;
          },
          pre: ({ children }) => <>{children}</>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
