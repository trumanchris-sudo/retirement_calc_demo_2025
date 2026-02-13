'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ConversationMessage } from '@/types/ai-onboarding';

interface MessageBubbleProps {
  message: ConversationMessage;
  isLatest?: boolean; // Flag to enable streaming on the latest assistant message
}

export function MessageBubble({ message, isLatest = false }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [displayedText, setDisplayedText] = useState(message.content);
  const [isStreaming, setIsStreaming] = useState(false);

  // Stream text for assistant messages (only latest one)
  useEffect(() => {
    if (!isUser && isLatest && message.content) {
      setIsStreaming(true);
      setDisplayedText('');

      let currentIndex = 0;
      const streamInterval = setInterval(() => {
        if (currentIndex < message.content.length) {
          setDisplayedText(message.content.substring(0, currentIndex + 1));
          currentIndex++;
        } else {
          setIsStreaming(false);
          clearInterval(streamInterval);
        }
      }, 15); // 15ms per character = ~67 chars/second (fast typewriter)

      return () => clearInterval(streamInterval);
    } else {
      setDisplayedText(message.content);
      setIsStreaming(false);
    }
  }, [message.content, isUser, isLatest]);

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
      {displayedText.split('\n').map((line, i) => (
        <div key={i}>
          {line || '\u00A0'}
        </div>
      ))}
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 bg-primary/60 animate-pulse ml-0.5 rounded-sm" />
      )}
    </div>
  );
}
