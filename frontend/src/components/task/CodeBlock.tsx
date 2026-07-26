import React, { useState } from 'react';
import { Check, Clipboard } from 'lucide-react';

/**
 * CodeBlock.tsx
 * ──────────────
 * Renders a fenced code block (```lang\n...\n```) with basic syntax
 * highlighting and a copy button. Deliberately dependency-free — no
 * prismjs/shiki/highlight.js install required.
 *
 * Used directly by pages that already have isolated code strings, and
 * by Markdown.tsx's `code` renderer for fenced blocks found inside
 * full agent/step output text (which also needs real bold/italic/list
 * formatting — see Markdown.tsx for that).
 */

const PY_KEYWORDS = new Set([
  'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'import', 'from',
  'as', 'class', 'try', 'except', 'finally', 'raise', 'with', 'pass', 'break',
  'continue', 'lambda', 'yield', 'async', 'await', 'and', 'or', 'not', 'is',
  'None', 'True', 'False', 'global', 'nonlocal', 'del', 'assert',
]);

const JS_KEYWORDS = new Set([
  'function', 'return', 'if', 'else', 'for', 'while', 'in', 'of', 'import',
  'export', 'from', 'as', 'class', 'try', 'catch', 'finally', 'throw', 'with',
  'break', 'continue', 'const', 'let', 'var', 'async', 'await', 'yield',
  'null', 'undefined', 'true', 'false', 'new', 'typeof', 'instanceof', 'this',
  'extends', 'super', 'default', 'switch', 'case',
]);

function keywordsFor(lang: string): Set<string> {
  const l = lang.toLowerCase();
  if (l === 'py' || l === 'python') return PY_KEYWORDS;
  if (['js', 'jsx', 'ts', 'tsx', 'javascript', 'typescript'].includes(l)) return JS_KEYWORDS;
  return PY_KEYWORDS; // reasonable default — most agent-generated code here is Python
}

/**
 * Tokenizes a single line into highlighted spans. Intentionally simple
 * (comments, strings, numbers, keywords) — good enough for readability
 * without pulling in a full grammar/tokenizer dependency.
 */
function highlightLine(line: string, keywords: Set<string>, keyPrefix: string): React.ReactNode[] {
  const tokenRe = /(#.*$|\/\/.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+\.?\d*\b)|(\b[A-Za-z_][A-Za-z0-9_]*\b)|(\s+)|([^\sA-Za-z0-9_]+)/g;
  const nodes: React.ReactNode[] = [];
  let i = 0;
  let m: RegExpExecArray | null;

  while ((m = tokenRe.exec(line)) !== null) {
    const [, comment, str, num, word, ws, punct] = m;
    const key = `${keyPrefix}-${i++}`;
    if (comment) {
      nodes.push(<span key={key} className="text-slate-500 italic">{comment}</span>);
    } else if (str) {
      nodes.push(<span key={key} className="text-emerald-400">{str}</span>);
    } else if (num) {
      nodes.push(<span key={key} className="text-amber-400">{num}</span>);
    } else if (word) {
      if (keywords.has(word)) {
        nodes.push(<span key={key} className="text-violet-400 font-medium">{word}</span>);
      } else {
        nodes.push(<span key={key} className="text-slate-200">{word}</span>);
      }
    } else if (ws) {
      nodes.push(ws);
    } else if (punct) {
      nodes.push(<span key={key} className="text-slate-500">{punct}</span>);
    }
  }
  return nodes;
}

interface CodeBlockProps {
  code: string;
  lang?: string;
}

export function CodeBlock({ code, lang = 'python' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const keywords = keywordsFor(lang);
  const lines = code.split('\n');

  const copy = () => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch((err: unknown) => console.error('Clipboard write failed:', err));
  };

  return (
    <div className="rounded-lg overflow-hidden border border-white/10 bg-[#0d0d12] my-2">
      <div className="flex items-center justify-between px-3 py-1.5 bg-white/[0.03] border-b border-white/5">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">
          {lang || 'text'}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Clipboard className="w-3 h-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-[13px] leading-relaxed font-mono">
        <code>
          {lines.map((line, idx) => (
            <div key={idx} className="table-row">
              <span className="table-cell pr-4 text-right text-slate-600 select-none w-1 whitespace-nowrap">
                {idx + 1}
              </span>
              <span className="table-cell whitespace-pre">
                {line.length > 0 ? highlightLine(line, keywords, `l${idx}`) : '\u00A0'}
              </span>
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
