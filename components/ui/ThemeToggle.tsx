'use client';

import { useTheme } from '@/lib/theme-context';
import { Sun, Moon, Monitor } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThemeToggleProps {
  /** Show system option in addition to light/dark */
  showSystemOption?: boolean;
  /** Compact mode - just an icon button */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function ThemeToggle({
  showSystemOption = false,
  compact = true,
  className = '',
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Show placeholder during SSR to prevent layout shift
  if (!mounted) {
    return (
      <button
        className={`
          relative inline-flex items-center justify-center
          w-10 h-10 rounded-lg
          bg-slate-100 dark:bg-slate-800
          text-slate-600 dark:text-slate-400
          transition-all duration-200
          ${className}
        `}
        aria-label="Toggle theme"
        disabled
      >
        <div className="w-5 h-5 bg-slate-300 dark:bg-slate-600 rounded animate-pulse" />
      </button>
    );
  }

  // Compact mode - simple toggle button
  if (compact && !showSystemOption) {
    return (
      <button
        onClick={toggleTheme}
        className={`
          group relative inline-flex items-center justify-center
          w-10 h-10 rounded-lg
          bg-slate-100 hover:bg-slate-200
          dark:bg-slate-800 dark:hover:bg-slate-700
          text-slate-600 hover:text-slate-900
          dark:text-slate-400 dark:hover:text-slate-100
          border border-slate-200 dark:border-slate-700
          transition-all duration-200 ease-out
          focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
          dark:focus-visible:ring-offset-slate-900
          ${className}
        `}
        aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
        title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      >
        {/* Sun icon - visible in dark mode */}
        <Sun
          className={`
            absolute w-5 h-5
            transform transition-all duration-300 ease-out
            ${resolvedTheme === 'dark'
              ? 'rotate-0 scale-100 opacity-100'
              : 'rotate-90 scale-0 opacity-0'
            }
          `}
        />
        {/* Moon icon - visible in light mode */}
        <Moon
          className={`
            absolute w-5 h-5
            transform transition-all duration-300 ease-out
            ${resolvedTheme === 'light'
              ? 'rotate-0 scale-100 opacity-100'
              : '-rotate-90 scale-0 opacity-0'
            }
          `}
        />
        <span className="sr-only">
          {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        </span>
      </button>
    );
  }

  // Full mode with system option
  return (
    <div
      className={`
        inline-flex items-center gap-1 p-1
        bg-slate-100 dark:bg-slate-800
        border border-slate-200 dark:border-slate-700
        rounded-lg
        ${className}
      `}
      role="radiogroup"
      aria-label="Theme selection"
    >
      <ThemeButton
        active={theme === 'light'}
        onClick={() => setTheme('light')}
        label="Light mode"
      >
        <Sun className="w-4 h-4" />
      </ThemeButton>

      {showSystemOption && (
        <ThemeButton
          active={theme === 'system'}
          onClick={() => setTheme('system')}
          label="System preference"
        >
          <Monitor className="w-4 h-4" />
        </ThemeButton>
      )}

      <ThemeButton
        active={theme === 'dark'}
        onClick={() => setTheme('dark')}
        label="Dark mode"
      >
        <Moon className="w-4 h-4" />
      </ThemeButton>
    </div>
  );
}

interface ThemeButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}

function ThemeButton({ active, onClick, label, children }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center
        w-8 h-8 rounded-md
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500
        ${active
          ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm'
          : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }
      `}
      role="radio"
      aria-checked={active}
      aria-label={label}
      title={label}
    >
      {children}
    </button>
  );
}

/**
 * A larger, more prominent theme toggle for settings pages
 */
export function ThemeToggleLarge({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`flex gap-3 ${className}`}>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="w-24 h-20 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse"
          />
        ))}
      </div>
    );
  }

  const options = [
    {
      value: 'light' as const,
      label: 'Light',
      icon: Sun,
      description: 'Always light',
    },
    {
      value: 'system' as const,
      label: 'System',
      icon: Monitor,
      description: 'Match device',
    },
    {
      value: 'dark' as const,
      label: 'Dark',
      icon: Moon,
      description: 'Always dark',
    },
  ];

  return (
    <div className={`flex gap-3 ${className}`} role="radiogroup" aria-label="Theme selection">
      {options.map(({ value, label, icon: Icon, description }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={`
            flex-1 flex flex-col items-center gap-2 p-4
            rounded-xl border-2 transition-all duration-200
            focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2
            dark:focus-visible:ring-offset-slate-900
            ${theme === value
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
              : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }
          `}
          role="radio"
          aria-checked={theme === value}
        >
          <Icon className="w-6 h-6" />
          <span className="font-medium text-sm">{label}</span>
          <span className="text-xs opacity-70">{description}</span>
        </button>
      ))}
    </div>
  );
}
