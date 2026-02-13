'use client';

/**
 * Keyboard Shortcuts Modal
 *
 * Displays all available keyboard shortcuts, organized by category.
 * Features:
 * - Opens on ? key press
 * - Search/filter shortcuts
 * - Categorized display
 * - Customization support
 * - Platform-aware key display (Mac vs Windows)
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Keyboard,
  Search,
  Settings,
  RotateCcw,
  Command,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CornerDownLeft,
  Delete,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useKeyboardShortcuts,
  useShortcutRegistry,
  formatKeyCombo,
  parseKeyCombo,
  type KeyboardShortcut,
  type ShortcutCategory,
  type KeyCombo,
} from '@/hooks/useKeyboardShortcuts';

// Category icons mapping
const categoryIcons: Record<ShortcutCategory, React.ReactNode> = {
  Navigation: <ArrowRight className="h-4 w-4" />,
  Actions: <CheckCircle2 className="h-4 w-4" />,
  Editing: <CornerDownLeft className="h-4 w-4" />,
  View: <ArrowUp className="h-4 w-4" />,
  Help: <Keyboard className="h-4 w-4" />,
  Advanced: <Settings className="h-4 w-4" />,
};

// Category descriptions
const categoryDescriptions: Record<ShortcutCategory, string> = {
  Navigation: 'Move around the app',
  Actions: 'Perform common tasks',
  Editing: 'Edit and modify content',
  View: 'Change how things look',
  Help: 'Get help and information',
  Advanced: 'Power user features',
};

interface KeyBadgeProps {
  combo: KeyCombo;
  className?: string;
}

/**
 * Displays a single key or key combination as a styled badge
 */
function KeyBadge({ combo, className }: KeyBadgeProps) {
  const formatted = formatKeyCombo(combo);
  const parts = formatted.split(/(?=[+])|(?<=[+])/g).filter(p => p !== '+');

  return (
    <span className={cn('inline-flex items-center gap-0.5', className)}>
      {parts.map((part, index) => (
        <kbd
          key={index}
          className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 text-xs font-medium text-muted-foreground shadow-sm"
        >
          {part}
        </kbd>
      ))}
    </span>
  );
}

interface ShortcutRowProps {
  shortcut: KeyboardShortcut;
  onToggle?: (id: string, enabled: boolean) => void;
  onCustomize?: (id: string) => void;
  isCustomizing?: boolean;
}

/**
 * Single shortcut row with description and key badges
 */
function ShortcutRow({ shortcut, onToggle, onCustomize, isCustomizing }: ShortcutRowProps) {
  const isEnabled = shortcut.enabled !== false;

  return (
    <div
      className={cn(
        'flex items-center justify-between py-2 px-3 rounded-md transition-colors',
        isEnabled ? 'hover:bg-muted/50' : 'opacity-50'
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', !isEnabled && 'line-through')}>
          {shortcut.description}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4">
        <div className="flex items-center gap-1">
          {shortcut.keys.map((combo, index) => (
            <React.Fragment key={combo}>
              {index > 0 && <span className="text-xs text-muted-foreground mx-1">or</span>}
              <KeyBadge combo={combo} />
            </React.Fragment>
          ))}
        </div>
        {isCustomizing && (
          <div className="flex items-center gap-2">
            <Switch
              checked={isEnabled}
              onCheckedChange={(checked) => onToggle?.(shortcut.id, checked)}
              aria-label={`Toggle ${shortcut.description}`}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => onCustomize?.(shortcut.id)}
            >
              Edit
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

interface ShortcutCategorySectionProps {
  category: ShortcutCategory;
  shortcuts: KeyboardShortcut[];
  isCustomizing: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onCustomize: (id: string) => void;
}

/**
 * Section displaying shortcuts for a single category
 */
function ShortcutCategorySection({
  category,
  shortcuts,
  isCustomizing,
  onToggle,
  onCustomize,
}: ShortcutCategorySectionProps) {
  if (shortcuts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-3 py-2">
        <span className="text-primary">{categoryIcons[category]}</span>
        <h3 className="text-sm font-semibold text-foreground">{category}</h3>
        <span className="text-xs text-muted-foreground">({shortcuts.length})</span>
      </div>
      <div className="space-y-1">
        {shortcuts.map((shortcut) => (
          <ShortcutRow
            key={shortcut.id}
            shortcut={shortcut}
            isCustomizing={isCustomizing}
            onToggle={onToggle}
            onCustomize={onCustomize}
          />
        ))}
      </div>
    </div>
  );
}

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Main keyboard shortcuts modal component
 */
export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [editingShortcutId, setEditingShortcutId] = useState<string | null>(null);
  const [recordingKeys, setRecordingKeys] = useState(false);
  const [recordedCombo, setRecordedCombo] = useState<string | null>(null);

  const { shortcutsByCategory } = useShortcutRegistry();
  const { toggleShortcut, customizeShortcut, resetShortcut, resetAllShortcuts, isKeyComboInUse } =
    useKeyboardShortcuts();

  // Filter shortcuts based on search query
  const filteredShortcuts = useMemo(() => {
    if (!searchQuery.trim()) {
      return shortcutsByCategory;
    }

    const query = searchQuery.toLowerCase();
    const filtered: Record<ShortcutCategory, KeyboardShortcut[]> = {
      Navigation: [],
      Actions: [],
      Editing: [],
      View: [],
      Help: [],
      Advanced: [],
    };

    Object.entries(shortcutsByCategory).forEach(([category, shortcuts]) => {
      filtered[category as ShortcutCategory] = shortcuts.filter(
        (s) =>
          s.description.toLowerCase().includes(query) ||
          s.id.toLowerCase().includes(query) ||
          s.keys.some((k) => k.toLowerCase().includes(query))
      );
    });

    return filtered;
  }, [searchQuery, shortcutsByCategory]);

  // Count total visible shortcuts
  const totalVisible = useMemo(() => {
    return Object.values(filteredShortcuts).reduce((sum, arr) => sum + arr.length, 0);
  }, [filteredShortcuts]);

  // Handle key recording for customization
  useEffect(() => {
    if (!recordingKeys) return;

    function handleKeyDown(event: KeyboardEvent) {
      event.preventDefault();
      event.stopPropagation();

      // Build the key combo string
      const parts: string[] = [];
      if (event.metaKey) parts.push('meta');
      if (event.ctrlKey) parts.push('ctrl');
      if (event.shiftKey) parts.push('shift');
      if (event.altKey) parts.push('alt');

      // Get the key (ignoring modifier-only presses)
      const key = event.key.toLowerCase();
      if (!['meta', 'control', 'shift', 'alt'].includes(key)) {
        parts.push(key);
        setRecordedCombo(parts.join('+'));
        setRecordingKeys(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordingKeys]);

  const handleStartCustomize = useCallback((id: string) => {
    setEditingShortcutId(id);
    setRecordedCombo(null);
    setRecordingKeys(true);
  }, []);

  const handleSaveCustomization = useCallback(() => {
    if (editingShortcutId && recordedCombo) {
      // Check for conflicts
      const conflictId = isKeyComboInUse(recordedCombo, editingShortcutId);
      if (conflictId) {
        // Could show a toast or error here
        console.warn(`Key combo already in use by: ${conflictId}`);
        return;
      }

      customizeShortcut(editingShortcutId, [recordedCombo]);
    }
    setEditingShortcutId(null);
    setRecordedCombo(null);
    setRecordingKeys(false);
  }, [editingShortcutId, recordedCombo, customizeShortcut, isKeyComboInUse]);

  const handleCancelCustomization = useCallback(() => {
    setEditingShortcutId(null);
    setRecordedCombo(null);
    setRecordingKeys(false);
  }, []);

  const handleResetShortcut = useCallback(() => {
    if (editingShortcutId) {
      resetShortcut(editingShortcutId);
      setEditingShortcutId(null);
      setRecordedCombo(null);
    }
  }, [editingShortcutId, resetShortcut]);

  // Categories to display
  const categories: ShortcutCategory[] = ['Actions', 'Navigation', 'Editing', 'View', 'Help', 'Advanced'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription>
            Quick access to all available keyboard shortcuts. Press{' '}
            <KeyBadge combo="?" className="mx-1" /> anywhere to open this panel.
          </DialogDescription>
        </DialogHeader>

        {/* Search and controls */}
        <div className="flex items-center gap-2 px-1">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search shortcuts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button
            variant={isCustomizing ? 'secondary' : 'outline'}
            size="sm"
            onClick={() => setIsCustomizing(!isCustomizing)}
            className="gap-1.5"
          >
            <Settings className="h-4 w-4" />
            {isCustomizing ? 'Done' : 'Customize'}
          </Button>
          {isCustomizing && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetAllShortcuts}
              className="gap-1.5 text-destructive hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4" />
              Reset All
            </Button>
          )}
        </div>

        {/* Key recording overlay */}
        {recordingKeys && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-sm">
            <div className="text-center space-y-4 p-6">
              <Keyboard className="h-12 w-12 mx-auto text-primary animate-pulse" />
              <div>
                <h3 className="text-lg font-semibold">Recording Shortcut</h3>
                <p className="text-sm text-muted-foreground">
                  Press the key combination you want to use
                </p>
              </div>
              {recordedCombo && (
                <div className="space-y-3">
                  <KeyBadge combo={recordedCombo} className="text-lg" />
                  <div className="flex items-center justify-center gap-2">
                    <Button size="sm" onClick={handleSaveCustomization}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCancelCustomization}>
                      Cancel
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleResetShortcut}>
                      Reset to Default
                    </Button>
                  </div>
                </div>
              )}
              {!recordedCombo && (
                <Button size="sm" variant="outline" onClick={handleCancelCustomization}>
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Shortcuts list */}
        <ScrollArea className="flex-1 -mx-6 px-6">
          {totalVisible === 0 ? (
            <div className="text-center py-8">
              <Keyboard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No shortcuts match your search' : 'No shortcuts registered'}
              </p>
            </div>
          ) : (
            <div className="space-y-6 pb-4">
              {categories.map((category) => (
                <ShortcutCategorySection
                  key={category}
                  category={category}
                  shortcuts={filteredShortcuts[category]}
                  isCustomizing={isCustomizing}
                  onToggle={toggleShortcut}
                  onCustomize={handleStartCustomize}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
          <span>
            {totalVisible} shortcut{totalVisible !== 1 ? 's' : ''} available
          </span>
          <span className="flex items-center gap-1">
            <Command className="h-3 w-3" /> = Cmd (Mac) / Ctrl (Windows)
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Provider component that handles the ? key press to open the modal
 * and registers default app shortcuts
 */
export function KeyboardShortcutsProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  // Register the help shortcut
  useEffect(() => {
    registerShortcut({
      id: 'show-shortcuts',
      keys: ['shift+?', '?'],
      handler: () => setIsOpen(true),
      category: 'Help',
      description: 'Show keyboard shortcuts',
      global: true,
      preventDefault: true,
    });

    // Register escape to close
    registerShortcut({
      id: 'close-shortcuts-modal',
      keys: ['escape'],
      handler: () => setIsOpen(false),
      category: 'Help',
      description: 'Close shortcuts modal',
      enabled: true,
    });

    return () => {
      unregisterShortcut('show-shortcuts');
      unregisterShortcut('close-shortcuts-modal');
    };
  }, [registerShortcut, unregisterShortcut]);

  return (
    <>
      {children}
      <KeyboardShortcutsModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}

/**
 * Hook to register app-wide shortcuts
 * Call this once at the app level to register all default shortcuts
 */
export function useAppShortcuts(handlers: {
  onCalculate?: () => void;
  onSave?: () => void;
  onPrint?: () => void;
  onExport?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onNewScenario?: () => void;
  onDuplicateScenario?: () => void;
  onDeleteScenario?: () => void;
  onNextTab?: () => void;
  onPrevTab?: () => void;
  onToggleFullscreen?: () => void;
  onToggleTheme?: () => void;
  onFocusSearch?: () => void;
  onResetForm?: () => void;
  onCompareScenarios?: () => void;
}) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();

  useEffect(() => {
    const shortcuts: KeyboardShortcut[] = [
      // Actions
      {
        id: 'calculate',
        keys: ['meta+enter', 'ctrl+enter'],
        handler: () => handlers.onCalculate?.(),
        category: 'Actions',
        description: 'Calculate retirement plan',
        global: false,
      },
      {
        id: 'save',
        keys: ['meta+s', 'ctrl+s'],
        handler: () => handlers.onSave?.(),
        category: 'Actions',
        description: 'Save current scenario',
        global: false,
      },
      {
        id: 'print',
        keys: ['meta+p', 'ctrl+p'],
        handler: () => handlers.onPrint?.(),
        category: 'Actions',
        description: 'Print report',
        global: false,
      },
      {
        id: 'export',
        keys: ['meta+e', 'ctrl+e'],
        handler: () => handlers.onExport?.(),
        category: 'Actions',
        description: 'Export data',
        global: false,
      },
      // Editing
      {
        id: 'undo',
        keys: ['meta+z', 'ctrl+z'],
        handler: () => handlers.onUndo?.(),
        category: 'Editing',
        description: 'Undo last change',
        global: false,
      },
      {
        id: 'redo',
        keys: ['meta+shift+z', 'ctrl+shift+z', 'ctrl+y'],
        handler: () => handlers.onRedo?.(),
        category: 'Editing',
        description: 'Redo last change',
        global: false,
      },
      {
        id: 'reset-form',
        keys: ['meta+shift+r', 'ctrl+shift+r'],
        handler: () => handlers.onResetForm?.(),
        category: 'Editing',
        description: 'Reset form to defaults',
        global: false,
      },
      // Navigation
      {
        id: 'next-tab',
        keys: ['meta+]', 'ctrl+]', 'meta+arrowright'],
        handler: () => handlers.onNextTab?.(),
        category: 'Navigation',
        description: 'Go to next tab',
        global: false,
      },
      {
        id: 'prev-tab',
        keys: ['meta+[', 'ctrl+[', 'meta+arrowleft'],
        handler: () => handlers.onPrevTab?.(),
        category: 'Navigation',
        description: 'Go to previous tab',
        global: false,
      },
      {
        id: 'focus-search',
        keys: ['meta+k', 'ctrl+k', '/'],
        handler: () => handlers.onFocusSearch?.(),
        category: 'Navigation',
        description: 'Focus search input',
        global: true,
      },
      // Scenarios
      {
        id: 'new-scenario',
        keys: ['meta+n', 'ctrl+n'],
        handler: () => handlers.onNewScenario?.(),
        category: 'Actions',
        description: 'Create new scenario',
        global: false,
      },
      {
        id: 'duplicate-scenario',
        keys: ['meta+d', 'ctrl+d'],
        handler: () => handlers.onDuplicateScenario?.(),
        category: 'Actions',
        description: 'Duplicate current scenario',
        global: false,
      },
      {
        id: 'delete-scenario',
        keys: ['meta+backspace', 'ctrl+backspace'],
        handler: () => handlers.onDeleteScenario?.(),
        category: 'Actions',
        description: 'Delete current scenario',
        global: false,
      },
      {
        id: 'compare-scenarios',
        keys: ['meta+shift+c', 'ctrl+shift+c'],
        handler: () => handlers.onCompareScenarios?.(),
        category: 'Actions',
        description: 'Compare scenarios',
        global: false,
      },
      // View
      {
        id: 'toggle-fullscreen',
        keys: ['meta+shift+f', 'ctrl+shift+f', 'f11'],
        handler: () => handlers.onToggleFullscreen?.(),
        category: 'View',
        description: 'Toggle fullscreen mode',
        global: true,
      },
      {
        id: 'toggle-theme',
        keys: ['meta+shift+t', 'ctrl+shift+t'],
        handler: () => handlers.onToggleTheme?.(),
        category: 'View',
        description: 'Toggle dark/light theme',
        global: true,
      },
    ];

    // Only register shortcuts that have handlers
    const activeShortcuts = shortcuts.filter((s) => {
      const handlerKey = `on${s.id.charAt(0).toUpperCase()}${s.id.slice(1).replace(/-([a-z])/g, (_, c) => c.toUpperCase())}` as keyof typeof handlers;
      // Special mapping for some handler names
      const handlerMappings: Record<string, keyof typeof handlers> = {
        'calculate': 'onCalculate',
        'save': 'onSave',
        'print': 'onPrint',
        'export': 'onExport',
        'undo': 'onUndo',
        'redo': 'onRedo',
        'reset-form': 'onResetForm',
        'next-tab': 'onNextTab',
        'prev-tab': 'onPrevTab',
        'focus-search': 'onFocusSearch',
        'new-scenario': 'onNewScenario',
        'duplicate-scenario': 'onDuplicateScenario',
        'delete-scenario': 'onDeleteScenario',
        'compare-scenarios': 'onCompareScenarios',
        'toggle-fullscreen': 'onToggleFullscreen',
        'toggle-theme': 'onToggleTheme',
      };
      const mappedKey = handlerMappings[s.id];
      return mappedKey && handlers[mappedKey];
    });

    activeShortcuts.forEach((s) => registerShortcut(s));

    return () => {
      activeShortcuts.forEach((s) => unregisterShortcut(s.id));
    };
  }, [handlers, registerShortcut, unregisterShortcut]);
}

export default KeyboardShortcutsModal;
