'use client';

import * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { useTheme } from '@/lib/theme-context';
import {
  Calculator,
  Moon,
  Sun,
  FileText,
  Share2,
  Download,
  Settings,
  History,
  Bookmark,
  TrendingUp,
  PiggyBank,
  Target,
  Wallet,
  RotateCcw,
  Trash2,
  Copy,
  ExternalLink,
  ChevronRight,
  Search,
  Command,
  X,
  Sparkles,
  Clock,
  Zap,
  type LucideIcon,
} from 'lucide-react';

// ==================== Types ====================

export type CommandCategory =
  | 'actions'
  | 'navigation'
  | 'presets'
  | 'shortcuts'
  | 'settings'
  | 'recent';

export interface CommandAction {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  category: CommandCategory;
  keywords?: string[];
  shortcut?: string;
  action: () => void | Promise<void>;
  disabled?: boolean;
  destructive?: boolean;
}

export interface CommandPaletteProps {
  /** Custom actions to include in the palette */
  customActions?: CommandAction[];
  /** Callback when calculation is triggered */
  onRunCalculation?: () => void;
  /** Callback when PDF export is triggered */
  onExportPDF?: () => void;
  /** Callback when share link is triggered */
  onShareLink?: () => void;
  /** Callback when a preset is loaded */
  onLoadPreset?: (presetId: string) => void;
  /** Callback when reset is triggered */
  onReset?: () => void;
  /** Available presets to show */
  presets?: { id: string; name: string; description?: string }[];
  /** Whether the calculator is currently running */
  isCalculating?: boolean;
  /** Additional class names */
  className?: string;
}

// ==================== Fuzzy Search ====================

/**
 * Simple fuzzy search implementation
 * Returns a score from 0-1, where 1 is a perfect match
 */
function fuzzyMatch(pattern: string, text: string): number {
  const lowerPattern = pattern.toLowerCase();
  const lowerText = text.toLowerCase();

  // Exact match or contains
  if (lowerText === lowerPattern) return 1;
  if (lowerText.includes(lowerPattern)) return 0.9;

  // Word boundary match
  const words = lowerText.split(/\s+/);
  if (words.some((word) => word.startsWith(lowerPattern))) return 0.8;

  // Fuzzy character matching
  let patternIdx = 0;
  let score = 0;
  let lastMatchIdx = -1;

  for (let i = 0; i < lowerText.length && patternIdx < lowerPattern.length; i++) {
    if (lowerText[i] === lowerPattern[patternIdx]) {
      score += lastMatchIdx === i - 1 ? 2 : 1; // Bonus for consecutive matches
      lastMatchIdx = i;
      patternIdx++;
    }
  }

  // All pattern characters must be found
  if (patternIdx !== lowerPattern.length) return 0;

  // Normalize score
  return (score / (lowerPattern.length * 2)) * 0.7;
}

function searchCommands(commands: CommandAction[], query: string): CommandAction[] {
  if (!query.trim()) return commands;

  const scored = commands
    .map((cmd) => {
      const labelScore = fuzzyMatch(query, cmd.label);
      const descScore = cmd.description ? fuzzyMatch(query, cmd.description) * 0.5 : 0;
      const keywordScore = cmd.keywords
        ? Math.max(...cmd.keywords.map((kw) => fuzzyMatch(query, kw))) * 0.7
        : 0;
      return {
        command: cmd,
        score: Math.max(labelScore, descScore, keywordScore),
      };
    })
    .filter(({ score }) => score > 0.1)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ command }) => command);
}

// ==================== Recent Actions Storage ====================

const RECENT_ACTIONS_KEY = 'retirement_calc_recent_commands';
const MAX_RECENT_ACTIONS = 5;

function getRecentActions(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_ACTIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function addRecentAction(actionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const recent = getRecentActions().filter((id) => id !== actionId);
    recent.unshift(actionId);
    localStorage.setItem(RECENT_ACTIONS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT_ACTIONS)));
  } catch {
    // Ignore storage errors
  }
}

// ==================== Category Labels ====================

const CATEGORY_LABELS: Record<CommandCategory, string> = {
  recent: 'Recent',
  actions: 'Actions',
  navigation: 'Navigation',
  presets: 'Quick Presets',
  shortcuts: 'Calculator Shortcuts',
  settings: 'Settings',
};

const CATEGORY_ORDER: CommandCategory[] = [
  'recent',
  'actions',
  'shortcuts',
  'presets',
  'navigation',
  'settings',
];

// ==================== Keyboard Shortcut Display ====================

function formatShortcut(shortcut: string): React.ReactNode {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.includes('Mac');
  const parts = shortcut.split('+');

  return (
    <span className="flex items-center gap-0.5 text-xs">
      {parts.map((part, i) => {
        let display = part;
        if (part === 'Cmd') display = isMac ? '\u2318' : 'Ctrl';
        else if (part === 'Shift') display = isMac ? '\u21E7' : 'Shift';
        else if (part === 'Alt') display = isMac ? '\u2325' : 'Alt';
        else if (part === 'Enter') display = '\u21B5';

        return (
          <kbd
            key={i}
            className="inline-flex h-5 min-w-[20px] items-center justify-center rounded border border-slate-200 bg-slate-50 px-1 font-mono text-[10px] text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
          >
            {display}
          </kbd>
        );
      })}
    </span>
  );
}

// ==================== Main Component ====================

export function CommandPalette({
  customActions = [],
  onRunCalculation,
  onExportPDF,
  onShareLink,
  onLoadPreset,
  onReset,
  presets = [],
  isCalculating = false,
  className,
}: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentActionIds, setRecentActionIds] = useState<string[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { toggleTheme, resolvedTheme } = useTheme();

  // Load recent actions on mount
  useEffect(() => {
    setRecentActionIds(getRecentActions());
  }, [isOpen]);

  // ==================== Default Actions ====================

  const defaultActions: CommandAction[] = useMemo(() => {
    const actions: CommandAction[] = [
      // Main Actions
      {
        id: 'run-calculation',
        label: 'Run Calculation',
        description: 'Calculate retirement projections with current inputs',
        icon: Calculator,
        category: 'actions',
        keywords: ['calculate', 'compute', 'run', 'execute', 'projection'],
        shortcut: 'Cmd+Enter',
        action: () => onRunCalculation?.(),
        disabled: isCalculating,
      },
      {
        id: 'export-pdf',
        label: 'Export PDF Report',
        description: 'Generate comprehensive PDF analysis',
        icon: FileText,
        category: 'actions',
        keywords: ['pdf', 'export', 'download', 'report', 'print'],
        shortcut: 'Cmd+P',
        action: () => onExportPDF?.(),
      },
      {
        id: 'share-link',
        label: 'Share Link',
        description: 'Create shareable link to current scenario',
        icon: Share2,
        category: 'actions',
        keywords: ['share', 'link', 'copy', 'url', 'send'],
        shortcut: 'Cmd+Shift+S',
        action: () => onShareLink?.(),
      },
      {
        id: 'toggle-dark-mode',
        label: resolvedTheme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
        description: 'Toggle between light and dark themes',
        icon: resolvedTheme === 'dark' ? Sun : Moon,
        category: 'settings',
        keywords: ['dark', 'light', 'theme', 'mode', 'appearance'],
        shortcut: 'Cmd+Shift+D',
        action: toggleTheme,
      },
      {
        id: 'reset-calculator',
        label: 'Reset Calculator',
        description: 'Clear all inputs and start fresh',
        icon: RotateCcw,
        category: 'settings',
        keywords: ['reset', 'clear', 'new', 'start', 'fresh'],
        action: () => onReset?.(),
        destructive: true,
      },

      // Calculator Shortcuts
      {
        id: 'maximize-401k',
        label: 'Maximize 401(k) Contributions',
        description: 'Set contributions to 2026 max ($23,500)',
        icon: TrendingUp,
        category: 'shortcuts',
        keywords: ['401k', 'max', 'contribution', 'limit'],
        action: () => {
          // This would be handled by the parent component
          onLoadPreset?.('maximize-401k');
        },
      },
      {
        id: 'maximize-roth',
        label: 'Maximize Roth IRA',
        description: 'Set Roth contribution to max ($7,000)',
        icon: PiggyBank,
        category: 'shortcuts',
        keywords: ['roth', 'ira', 'max', 'contribution'],
        action: () => onLoadPreset?.('maximize-roth'),
      },
      {
        id: 'catch-up-contributions',
        label: 'Enable Catch-Up Contributions',
        description: 'Add catch-up amounts for age 50+',
        icon: Zap,
        category: 'shortcuts',
        keywords: ['catch', 'up', '50', 'extra', 'contribution'],
        action: () => onLoadPreset?.('catch-up'),
      },
      {
        id: 'conservative-returns',
        label: 'Conservative Return Assumption',
        description: 'Set expected return to 6%',
        icon: Target,
        category: 'shortcuts',
        keywords: ['conservative', 'low', 'return', 'safe'],
        action: () => onLoadPreset?.('conservative-returns'),
      },
      {
        id: 'aggressive-returns',
        label: 'Aggressive Return Assumption',
        description: 'Set expected return to 10%',
        icon: TrendingUp,
        category: 'shortcuts',
        keywords: ['aggressive', 'high', 'return', 'growth'],
        action: () => onLoadPreset?.('aggressive-returns'),
      },
    ];

    // Add preset scenarios
    if (presets.length > 0) {
      presets.forEach((preset) => {
        actions.push({
          id: `preset-${preset.id}`,
          label: `Load: ${preset.name}`,
          description: preset.description || 'Load saved scenario',
          icon: Bookmark,
          category: 'presets',
          keywords: ['preset', 'scenario', 'load', preset.name.toLowerCase()],
          action: () => onLoadPreset?.(preset.id),
        });
      });
    }

    // Add sample presets if none provided
    if (presets.length === 0) {
      const samplePresets = [
        {
          id: 'young-professional',
          name: 'Young Professional',
          description: 'Age 25, starting retirement savings',
        },
        {
          id: 'mid-career',
          name: 'Mid-Career',
          description: 'Age 40, ramping up contributions',
        },
        {
          id: 'pre-retirement',
          name: 'Pre-Retirement',
          description: 'Age 55, final accumulation phase',
        },
        {
          id: 'fire',
          name: 'FIRE Scenario',
          description: 'Financial Independence, Retire Early',
        },
      ];

      samplePresets.forEach((preset) => {
        actions.push({
          id: `preset-${preset.id}`,
          label: `Load: ${preset.name}`,
          description: preset.description,
          icon: Bookmark,
          category: 'presets',
          keywords: ['preset', 'scenario', 'load', preset.name.toLowerCase()],
          action: () => onLoadPreset?.(preset.id),
        });
      });
    }

    return actions;
  }, [
    isCalculating,
    resolvedTheme,
    toggleTheme,
    onRunCalculation,
    onExportPDF,
    onShareLink,
    onLoadPreset,
    onReset,
    presets,
  ]);

  // Combine with custom actions
  const allActions = useMemo(
    () => [...defaultActions, ...customActions],
    [defaultActions, customActions]
  );

  // ==================== Search and Filter ====================

  const filteredActions = useMemo(() => {
    const searched = searchCommands(allActions, query);

    // If no query, add recent actions to the top
    if (!query.trim() && recentActionIds.length > 0) {
      const recentActions = recentActionIds
        .map((id) => allActions.find((a) => a.id === id))
        .filter((a): a is CommandAction => a !== undefined)
        .map((a) => ({ ...a, category: 'recent' as CommandCategory }));

      // Remove duplicates from the main list
      const nonRecentActions = searched.filter(
        (a) => !recentActionIds.includes(a.id)
      );

      return [...recentActions, ...nonRecentActions];
    }

    return searched;
  }, [allActions, query, recentActionIds]);

  // Group by category
  const groupedActions = useMemo(() => {
    const groups: Record<CommandCategory, CommandAction[]> = {
      recent: [],
      actions: [],
      navigation: [],
      presets: [],
      shortcuts: [],
      settings: [],
    };

    filteredActions.forEach((action) => {
      groups[action.category].push(action);
    });

    return groups;
  }, [filteredActions]);

  // Flat list for keyboard navigation
  const flatActions = useMemo(() => {
    return CATEGORY_ORDER.flatMap((cat) => groupedActions[cat]);
  }, [groupedActions]);

  // ==================== Keyboard Handling ====================

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Only handle other keys when open
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < flatActions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev > 0 ? prev - 1 : flatActions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          const selectedAction = flatActions[selectedIndex];
          if (selectedAction && !selectedAction.disabled) {
            executeAction(selectedAction);
          }
          break;
        case 'Escape':
          e.preventDefault();
          handleClose();
          break;
      }
    },
    [isOpen, flatActions, selectedIndex]
  );

  // Global keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Reset selected index when filtered list changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const selectedEl = listRef.current.querySelector('[data-selected="true"]');
    if (selectedEl) {
      selectedEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // ==================== Actions ====================

  const executeAction = useCallback(
    async (action: CommandAction) => {
      addRecentAction(action.id);
      setRecentActionIds((prev) => {
        const filtered = prev.filter((id) => id !== action.id);
        return [action.id, ...filtered].slice(0, MAX_RECENT_ACTIONS);
      });
      handleClose();
      await action.action();
    },
    []
  );

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setSelectedIndex(0);
  }, []);

  // ==================== Render ====================

  // Don't render during SSR
  if (typeof window === 'undefined') return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm transition-opacity duration-200',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Palette Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className={cn(
          'fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 transform transition-all duration-200',
          isOpen
            ? 'translate-y-0 opacity-100'
            : 'pointer-events-none -translate-y-4 opacity-0',
          className
        )}
      >
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          {/* Search Header */}
          <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search commands..."
              className="flex-1 bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500"
            />
            <div className="flex items-center gap-2">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd className="hidden items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 sm:flex">
                <Command className="h-3 w-3" />K
              </kbd>
            </div>
          </div>

          {/* Command List */}
          <div
            ref={listRef}
            className="max-h-[60vh] overflow-y-auto overscroll-contain p-2"
          >
            {flatActions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="mb-2 h-8 w-8 text-slate-300 dark:text-slate-600" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No commands found for "{query}"
                </p>
              </div>
            ) : (
              CATEGORY_ORDER.map((category) => {
                const categoryActions = groupedActions[category];
                if (categoryActions.length === 0) return null;

                return (
                  <div key={category} className="mb-2">
                    <div className="flex items-center gap-2 px-2 py-1.5">
                      {category === 'recent' && (
                        <Clock className="h-3 w-3 text-slate-400" />
                      )}
                      <span className="text-xs font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {CATEGORY_LABELS[category]}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {categoryActions.map((action) => {
                        const isSelected =
                          flatActions.indexOf(action) === selectedIndex;
                        const Icon = action.icon;

                        return (
                          <button
                            key={action.id}
                            data-selected={isSelected}
                            disabled={action.disabled}
                            onClick={() => executeAction(action)}
                            className={cn(
                              'group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors',
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-900/30'
                                : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
                              action.disabled && 'cursor-not-allowed opacity-50',
                              action.destructive &&
                                isSelected &&
                                'bg-red-50 dark:bg-red-900/30'
                            )}
                          >
                            <div
                              className={cn(
                                'flex h-9 w-9 items-center justify-center rounded-lg',
                                isSelected
                                  ? action.destructive
                                    ? 'bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400'
                                    : 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400'
                                  : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div
                                className={cn(
                                  'text-sm font-medium',
                                  isSelected
                                    ? action.destructive
                                      ? 'text-red-700 dark:text-red-300'
                                      : 'text-blue-700 dark:text-blue-300'
                                    : 'text-slate-700 dark:text-slate-200'
                                )}
                              >
                                {action.label}
                              </div>
                              {action.description && (
                                <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                                  {action.description}
                                </div>
                              )}
                            </div>
                            {action.shortcut && (
                              <div className="hidden shrink-0 sm:block">
                                {formatShortcut(action.shortcut)}
                              </div>
                            )}
                            <ChevronRight
                              className={cn(
                                'h-4 w-4 shrink-0 transition-transform',
                                isSelected
                                  ? 'translate-x-1 text-blue-500'
                                  : 'text-slate-300 dark:text-slate-600'
                              )}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2 dark:border-slate-700">
            <div className="flex items-center gap-4 text-xs text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
                  \u2191
                </kbd>
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
                  \u2193
                </kbd>
                to navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
                  \u21B5
                </kbd>
                to select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] dark:border-slate-700 dark:bg-slate-800">
                  esc
                </kbd>
                to close
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
              <Sparkles className="h-3 w-3" />
              Power User Mode
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}

// ==================== Hook for Programmatic Control ====================

export interface UseCommandPaletteReturn {
  open: () => void;
  close: () => void;
  toggle: () => void;
  isOpen: boolean;
}

/**
 * Hook to programmatically control the command palette
 * Note: This requires the CommandPalette to be rendered with controlled state
 */
export function useCommandPalette(): UseCommandPaletteReturn {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  // Listen for Cmd+K globally
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggle();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [toggle]);

  return { open, close, toggle, isOpen };
}

// ==================== Trigger Button ====================

interface CommandPaletteTriggerProps {
  className?: string;
}

export function CommandPaletteTrigger({ className }: CommandPaletteTriggerProps) {
  const handleClick = useCallback(() => {
    // Dispatch a keyboard event to trigger the palette
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      ctrlKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }, []);

  return (
    <button
      onClick={handleClick}
      className={cn(
        'group flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:bg-slate-700 dark:hover:text-slate-200',
        className
      )}
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4" />
      <span className="hidden sm:inline">Search commands...</span>
      <kbd className="hidden items-center gap-0.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-xs text-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-500 sm:flex">
        <Command className="h-3 w-3" />K
      </kbd>
    </button>
  );
}

export default CommandPalette;
