'use client';

import { forwardRef } from 'react';
import { Button } from '@/components/ui/button';
import { Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConsoleInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  disabled?: boolean;
  placeholder?: string;
}

export const ConsoleInput = forwardRef<HTMLInputElement, ConsoleInputProps>(
  ({ value, onChange, onSend, onKeyPress, disabled, placeholder }, ref) => {
    return (
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <input
            ref={ref}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyPress={onKeyPress}
            disabled={disabled}
            placeholder={placeholder || 'Type your response...'}
            className={cn(
              'w-full px-4 py-3 bg-slate-900/90 border border-slate-700 rounded-lg',
              'text-slate-100 placeholder:text-slate-500',
              'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
              'font-mono text-sm',
              'transition-all duration-200',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <span className="text-xs text-slate-500 font-mono">
              Press Enter to send
            </span>
          </div>
        </div>

        <Button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          className={cn(
            'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700',
            'text-white shadow-lg',
            'transition-all duration-200',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    );
  }
);

ConsoleInput.displayName = 'ConsoleInput';
