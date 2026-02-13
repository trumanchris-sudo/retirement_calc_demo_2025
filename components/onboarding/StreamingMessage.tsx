'use client';

import { Bot } from 'lucide-react';

interface StreamingMessageProps {
  content: string;
}

export function StreamingMessage({ content }: StreamingMessageProps) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-primary flex items-center justify-center shadow-lg">
        <Bot className="w-5 h-5 text-primary-foreground" />
      </div>

      <div className="max-w-[80%] rounded-lg px-4 py-3 shadow-lg bg-muted text-foreground border">
        <div className="prose prose-sm max-w-none">
          {content.split('\n').map((line, i) => (
            <p key={i} className={i === 0 ? 'mt-0' : ''}>
              {line || '\u00A0'}
            </p>
          ))}
          <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-1" />
        </div>
      </div>
    </div>
  );
}
