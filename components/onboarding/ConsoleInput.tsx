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
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            disabled={disabled}
            placeholder={placeholder || 'Type your response...'}
            rows={1}
            autoComplete="off"
            autoCapitalize="sentences"
            autoCorrect="on"
            enterKeyHint="send"
            className={cn(
              'w-full px-3 py-3 sm:px-4 bg-slate-900/90 border border-slate-700 rounded-lg',
              'text-slate-100 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'text-base sm:text-sm', // Use 16px on mobile to prevent zoom
              'resize-none',
              'transition-all duration-200',
              'min-h-[48px]', // Better touch target for mobile
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            style={{
              fontSize: '16px', // Prevent iOS zoom
            }}
          />
          {/* Only show Enter hint on desktop */}
          <div className="hidden sm:block absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-xs text-slate-500 font-mono">
              Press Enter
            </span>
          </div>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          type="button"
          className={cn(
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
            'text-white shadow-lg',
            'transition-all duration-200',
            'h-12 w-12 sm:h-10 sm:w-10 flex-shrink-0', // Larger touch target on mobile
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5 sm:w-4 sm:h-4" />
        </Button>
      </div>
    );
  }
);

ConsoleInput.displayName = 'ConsoleInput';
