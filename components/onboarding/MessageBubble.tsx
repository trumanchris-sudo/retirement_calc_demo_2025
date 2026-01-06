'use client';

import type { ConversationMessage } from '@/types/ai-onboarding';
import { cn } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
          <Bot className="w-5 h-5 text-white" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-lg px-4 py-3 shadow-lg',
          isUser
            ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white'
            : 'bg-slate-800/80 text-slate-100 backdrop-blur border border-slate-700'
        )}
      >
        <div className="prose prose-invert prose-sm max-w-none">
          {message.content.split('\n').map((line, i) => (
            <p key={i} className={i === 0 ? 'mt-0' : ''}>
              {line || '\u00A0'}
            </p>
          ))}
        </div>
      </div>

      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
          <User className="w-5 h-5 text-white" />
        </div>
      )}
    </div>
  );
}
