'use client';

import { useState, useEffect } from 'react';
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
      className="font-mono text-sm sm:text-base leading-relaxed"
      role="article"
      aria-label={isUser ? 'Your message' : 'AI assistant message'}
    >
      <div className="mb-1">
        <span className={isUser ? 'text-green-400' : 'text-blue-400'}>
          {isUser ? '> ' : '$ '}
        </span>
        <span className={isUser ? 'text-green-300' : 'text-blue-300'}>
          {isUser ? 'you' : 'wizard'}
        </span>
      </div>
      <div className={isUser ? 'text-gray-200 pl-4' : 'text-gray-300 pl-4'}>
        {displayedText.split('\n').map((line, i) => (
          <div key={i}>
            {line || '\u00A0'}
          </div>
        ))}
        {isStreaming && <span className="inline-block w-2 h-4 bg-green-400 animate-pulse ml-0.5">│</span>}
      </div>
    </div>
  );
}
