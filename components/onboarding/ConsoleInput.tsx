'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsoleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onFocus?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ConsoleInput = forwardRef<HTMLTextAreaElement, ConsoleInputProps>(
  ({ value, onChange, onSend, onKeyDown, onFocus, disabled, placeholder }, ref) => {
    return (
      <div className="flex gap-2 sm:gap-3">
        <div className="flex-1 relative">
          <label htmlFor="ai-response-input" className="sr-only">
            Your response to the AI assistant
          </label>
          <textarea
            id="ai-response-input"
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            disabled={disabled}
            placeholder={placeholder || 'Type your response...'}
            rows={3}
            autoComplete="off"
            autoCapitalize="sentences"
            autoCorrect="on"
            enterKeyHint="enter"
            aria-label="Your response to the AI assistant"
            aria-describedby={disabled ? undefined : "enter-hint"}
            className={cn(
              'w-full px-3 py-2 bg-background border rounded-md',
              'text-foreground placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              'text-base', // 16px to prevent iOS auto-zoom
              'resize-none',
              'max-h-[200px] overflow-y-auto',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          {/* Only show Ctrl+Enter hint on desktop */}
          <div
            id="enter-hint"
            className="hidden sm:block absolute right-3 top-2 pointer-events-none"
          >
            <span className="text-xs text-muted-foreground/60">
              Ctrl+Enter
            </span>
          </div>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          type="button"
          aria-label="Send message to AI assistant"
          className="min-w-[64px] min-h-[44px] flex-shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5 ml-1.5" aria-hidden="true" />
        </Button>
      </div>
    );
  }
);

ConsoleInput.displayName = 'ConsoleInput';
