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
  disabled?: boolean;
  placeholder?: string;
}

export const ConsoleInput = forwardRef<HTMLTextAreaElement, ConsoleInputProps>(
  ({ value, onChange, onSend, onKeyDown, disabled, placeholder }, ref) => {
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
              'w-full px-3 py-3 sm:px-4 bg-slate-900 border-2 border-slate-600 rounded-lg',
              'text-slate-100 placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400',
              'text-base sm:text-sm', // Use 16px on mobile to prevent zoom
              'resize-none',
              'transition-all duration-200',
              'max-h-[200px] overflow-y-auto', // Allow scrolling within textarea
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              fontSize: '16px', // Prevent iOS zoom
            }}
          />
          {/* Only show Cmd+Enter hint on desktop */}
          <div
            id="enter-hint"
            className="hidden sm:block absolute right-3 top-3 pointer-events-none"
          >
            <span className="text-xs text-slate-400 font-mono">
              ⌘/Ctrl + ↵
            </span>
          </div>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          type="button"
          aria-label="Send message to AI assistant"
          className={cn(
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
            'text-white shadow-lg',
            'transition-all duration-200',
            'min-w-[48px] min-h-[48px] flex-shrink-0', // 48px minimum touch target
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center justify-center'
          )}
        >
          <Send className="w-5 h-5 sm:w-4 sm:h-4" aria-hidden="true" />
          <span className="sr-only">Send</span>
        </Button>
      </div>
    );
  }
);

ConsoleInput.displayName = 'ConsoleInput';
