'use client';

import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/types/ai-onboarding';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn(
        'text-sm sm:text-base leading-relaxed rounded-lg px-4 py-3 max-w-[85%]',
        isUser
          ? 'bg-primary/10 text-foreground self-end ml-auto'
          : 'bg-muted text-foreground self-start'
      )}
      role="article"
      aria-label={isUser ? 'Your message' : 'AI assistant message'}
    >
      {message.content.split('\n').map((line, i) => (
        <div key={i}>
          {line || '\u00A0'}
        </div>
      ))}
    </div>
  );
}
