'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple & clean markdown parser for RAG chatbot responses
  // Handles: bold (**), italic (*), inline code (`), headers (###), lists (- or *), and citation tags
  const renderFormattedLine = (line: string, lineIndex: number) => {
    // Header 3 or 4
    if (line.startsWith('### ')) {
      return (
        <h4 key={lineIndex} className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2 mb-1">
          {formatInline(line.replace('### ', ''))}
        </h4>
      );
    }
    if (line.startsWith('## ')) {
      return (
        <h3 key={lineIndex} className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-2.5 mb-1 border-b border-slate-200/50 pb-0.5">
          {formatInline(line.replace('## ', ''))}
        </h3>
      );
    }

    // Bullet point
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const bulletContent = line.trim().replace(/^[-*]\s+/, '');
      return (
        <li key={lineIndex} className="ml-4 list-disc text-xs my-0.5">
          {formatInline(bulletContent)}
        </li>
      );
    }

    // Numbered list
    const numMatch = line.trim().match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <li key={lineIndex} className="ml-4 list-decimal text-xs my-0.5">
          {formatInline(numMatch[2])}
        </li>
      );
    }

    // Blank line
    if (!line.trim()) {
      return <div key={lineIndex} className="h-1.5" />;
    }

    // Normal paragraph
    return (
      <p key={lineIndex} className="text-xs my-1">
        {formatInline(line)}
      </p>
    );
  };

  const formatInline = (text: string) => {
    // Split by markdown elements: bold, code, citations
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let key = 0;

    while (remaining.length > 0) {
      // Citation format [Doc: xxx, Page yyy]
      const citationMatch = remaining.match(/^(\[Doc:[^\]]+\])/);
      if (citationMatch) {
        parts.push(
          <span
            key={key++}
            className="inline-block px-1.5 py-0.5 mx-0.5 font-semibold text-[10px] bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 rounded border border-blue-200 dark:border-blue-800"
          >
            {citationMatch[1]}
          </span>
        );
        remaining = remaining.slice(citationMatch[1].length);
        continue;
      }

      // Inline code `code`
      const codeMatch = remaining.match(/^`([^`]+)`/);
      if (codeMatch) {
        parts.push(
          <code
            key={key++}
            className="px-1 py-0.5 bg-slate-200/70 dark:bg-slate-700/60 rounded font-mono text-[11px] text-slate-800 dark:text-slate-200"
          >
            {codeMatch[1]}
          </code>
        );
        remaining = remaining.slice(codeMatch[0].length);
        continue;
      }

      // Bold **text**
      const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/);
      if (boldMatch) {
        parts.push(
          <strong key={key++} className="font-semibold text-slate-900 dark:text-slate-100">
            {boldMatch[1]}
          </strong>
        );
        remaining = remaining.slice(boldMatch[0].length);
        continue;
      }

      // Italic *text*
      const italicMatch = remaining.match(/^\*([^*]+)\*/);
      if (italicMatch) {
        parts.push(<em key={key++}>{italicMatch[1]}</em>);
        remaining = remaining.slice(italicMatch[0].length);
        continue;
      }

      // Find next special token
      const nextSpecial = remaining.search(/(\[Doc:|\*\*|\*|`)/);
      if (nextSpecial === -1) {
        parts.push(remaining);
        break;
      } else if (nextSpecial > 0) {
        parts.push(remaining.slice(0, nextSpecial));
        remaining = remaining.slice(nextSpecial);
      } else {
        // If 0 and no match above, push single character and move forward
        parts.push(remaining[0]);
        remaining = remaining.slice(1);
      }
    }

    return parts;
  };

  const lines = content.split('\n');

  return (
    <div className="space-y-0.5 leading-relaxed text-slate-800 dark:text-slate-200">
      {lines.map((line, idx) => renderFormattedLine(line, idx))}
    </div>
  );
}
