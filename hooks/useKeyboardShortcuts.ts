/**
 * Keyboard Shortcuts Hook
 *
 * Provides a powerful keyboard shortcut system with:
 * - Global and component-scoped shortcuts
 * - Customization support via localStorage
 * - Conflict detection
 * - Mac/Windows modifier key handling
 *
 * Usage:
 * ```tsx
 * const { registerShortcut, unregisterShortcut } = useKeyboardShortcuts();
 *
 * useEffect(() => {
 *   registerShortcut({
 *     id: 'calculate',
 *     keys: ['meta+enter', 'ctrl+enter'],
 *     handler: () => handleCalculate(),
 *     category: 'Actions',
 *     description: 'Calculate retirement plan',
 *   });
 *   return () => unregisterShortcut('calculate');
 * }, []);
 * ```
 */

import { useEffect, useCallback, useRef } from 'react';
import { useLocalStorage } from './useLocalStorage';

export type KeyCombo = string; // e.g., 'meta+enter', 'ctrl+s', 'shift+?'

export interface KeyboardShortcut {
  id: string;
  keys: KeyCombo[]; // Multiple key combos allowed (e.g., ['meta+enter', 'ctrl+enter'])
  handler: (event: KeyboardEvent) => void;
  category: ShortcutCategory;
  description: string;
  enabled?: boolean;
  global?: boolean; // Works even when inputs are focused
  preventDefault?: boolean;
}

export type ShortcutCategory =
  | 'Navigation'
  | 'Actions'
  | 'Editing'
  | 'View'
  | 'Help'
  | 'Advanced';

export interface ShortcutCustomization {
  id: string;
  customKeys?: KeyCombo[];
  disabled?: boolean;
}

// Parsed key combination
interface ParsedKeyCombo {
  key: string;
  meta: boolean;
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
}

// Global shortcut registry (shared across all hook instances)
const shortcutRegistry = new Map<string, KeyboardShortcut>();
const shortcutListeners = new Set<() => void>();

// Notify all listeners when registry changes
function notifyListeners() {
  shortcutListeners.forEach((listener) => listener());
}

/**
 * Parse a key combination string into its components
 * @example 'meta+shift+s' -> { meta: true, shift: true, key: 's' }
 */
export function parseKeyCombo(combo: KeyCombo): ParsedKeyCombo {
  const parts = combo.toLowerCase().split('+');
  const key = parts.pop() || '';

  return {
    key,
    meta: parts.includes('meta') || parts.includes('cmd') || parts.includes('command'),
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt') || parts.includes('option'),
  };
}

/**
 * Check if a keyboard event matches a key combination
 */
export function matchesKeyCombo(event: KeyboardEvent, combo: ParsedKeyCombo): boolean {
  // Normalize the event key
  const eventKey = event.key.toLowerCase();

  // Handle special keys
  const normalizedKey = eventKey === 'enter' ? 'enter' :
    eventKey === 'escape' ? 'escape' :
    eventKey === 'backspace' ? 'backspace' :
    eventKey === 'delete' ? 'delete' :
    eventKey === 'tab' ? 'tab' :
    eventKey === ' ' ? 'space' :
    eventKey === '?' ? '?' :
    eventKey;

  // Check if key matches
  const keyMatches = combo.key === normalizedKey ||
    (combo.key === '?' && event.key === '?') ||
    (combo.key === '/' && event.key === '/');

  if (!keyMatches) return false;

  // Check modifiers
  return (
    event.metaKey === combo.meta &&
    event.ctrlKey === combo.ctrl &&
    event.shiftKey === combo.shift &&
    event.altKey === combo.alt
  );
}

/**
 * Format a key combination for display
 */
export function formatKeyCombo(combo: KeyCombo): string {
  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  const parts = combo.toLowerCase().split('+');

  const symbols: Record<string, string> = isMac
    ? {
        meta: '\u2318',
        cmd: '\u2318',
        command: '\u2318',
        ctrl: '\u2303',
        control: '\u2303',
        shift: '\u21E7',
        alt: '\u2325',
        option: '\u2325',
        enter: '\u21A9',
        backspace: '\u232B',
        delete: '\u2326',
        escape: '\u238B',
        tab: '\u21E5',
        space: '\u2423',
      }
    : {
        meta: 'Ctrl',
        cmd: 'Ctrl',
        command: 'Ctrl',
        ctrl: 'Ctrl',
        control: 'Ctrl',
        shift: 'Shift',
        alt: 'Alt',
        option: 'Alt',
        enter: 'Enter',
        backspace: 'Backspace',
        delete: 'Delete',
        escape: 'Esc',
        tab: 'Tab',
        space: 'Space',
      };

  return parts
    .map((part) => symbols[part] || part.toUpperCase())
    .join(isMac ? '' : '+');
}

/**
 * Get all registered shortcuts
 */
export function getAllShortcuts(): KeyboardShortcut[] {
  return Array.from(shortcutRegistry.values());
}

/**
 * Get shortcuts by category
 */
export function getShortcutsByCategory(): Record<ShortcutCategory, KeyboardShortcut[]> {
  const shortcuts = getAllShortcuts();
  const categories: ShortcutCategory[] = ['Navigation', 'Actions', 'Editing', 'View', 'Help', 'Advanced'];

  return categories.reduce((acc, category) => {
    acc[category] = shortcuts.filter((s) => s.category === category);
    return acc;
  }, {} as Record<ShortcutCategory, KeyboardShortcut[]>);
}

/**
 * Main keyboard shortcuts hook
 */
export function useKeyboardShortcuts() {
  const [customizations, setCustomizations] = useLocalStorage<ShortcutCustomization[]>(
    'wdr_keyboard_shortcuts',
    []
  );

  const customizationsRef = useRef(customizations);
  customizationsRef.current = customizations;

  /**
   * Register a keyboard shortcut
   */
  const registerShortcut = useCallback((shortcut: KeyboardShortcut) => {
    const customization = customizationsRef.current.find((c) => c.id === shortcut.id);

    // Apply customizations if they exist
    const effectiveShortcut: KeyboardShortcut = {
      ...shortcut,
      keys: customization?.customKeys ?? shortcut.keys,
      enabled: customization?.disabled ? false : (shortcut.enabled ?? true),
    };

    shortcutRegistry.set(shortcut.id, effectiveShortcut);
    notifyListeners();
  }, []);

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((id: string) => {
    shortcutRegistry.delete(id);
    notifyListeners();
  }, []);

  /**
   * Customize a shortcut's key bindings
   */
  const customizeShortcut = useCallback(
    (id: string, newKeys: KeyCombo[]) => {
      setCustomizations((prev) => {
        const existing = prev.find((c) => c.id === id);
        if (existing) {
          return prev.map((c) => (c.id === id ? { ...c, customKeys: newKeys } : c));
        }
        return [...prev, { id, customKeys: newKeys }];
      });

      // Update the registry immediately
      const shortcut = shortcutRegistry.get(id);
      if (shortcut) {
        shortcutRegistry.set(id, { ...shortcut, keys: newKeys });
        notifyListeners();
      }
    },
    [setCustomizations]
  );

  /**
   * Toggle a shortcut's enabled state
   */
  const toggleShortcut = useCallback(
    (id: string, enabled: boolean) => {
      setCustomizations((prev) => {
        const existing = prev.find((c) => c.id === id);
        if (existing) {
          return prev.map((c) => (c.id === id ? { ...c, disabled: !enabled } : c));
        }
        return [...prev, { id, disabled: !enabled }];
      });

      const shortcut = shortcutRegistry.get(id);
      if (shortcut) {
        shortcutRegistry.set(id, { ...shortcut, enabled });
        notifyListeners();
      }
    },
    [setCustomizations]
  );

  /**
   * Reset a shortcut to its default key bindings
   */
  const resetShortcut = useCallback(
    (id: string) => {
      setCustomizations((prev) => prev.filter((c) => c.id !== id));
    },
    [setCustomizations]
  );

  /**
   * Reset all shortcuts to defaults
   */
  const resetAllShortcuts = useCallback(() => {
    setCustomizations([]);
  }, [setCustomizations]);

  /**
   * Check if a key combo is already in use
   */
  const isKeyComboInUse = useCallback((combo: KeyCombo, excludeId?: string): string | null => {
    const shortcuts = getAllShortcuts();
    const parsed = parseKeyCombo(combo);

    for (const shortcut of shortcuts) {
      if (shortcut.id === excludeId) continue;

      for (const key of shortcut.keys) {
        const shortcutParsed = parseKeyCombo(key);
        if (
          shortcutParsed.key === parsed.key &&
          shortcutParsed.meta === parsed.meta &&
          shortcutParsed.ctrl === parsed.ctrl &&
          shortcutParsed.shift === parsed.shift &&
          shortcutParsed.alt === parsed.alt
        ) {
          return shortcut.id;
        }
      }
    }

    return null;
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    customizeShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
    isKeyComboInUse,
    getAllShortcuts,
    getShortcutsByCategory,
    customizations,
  };
}

/**
 * Hook that sets up the global keyboard event listener
 * Should be used once at the app root level
 */
export function useKeyboardShortcutsHandler() {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      // Don't trigger shortcuts when typing in inputs (unless shortcut is marked as global)
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;

      // Get all shortcuts and find matches
      const shortcuts = getAllShortcuts();

      for (const shortcut of shortcuts) {
        // Skip disabled shortcuts
        if (shortcut.enabled === false) continue;

        // Skip non-global shortcuts when in an input
        if (isInput && !shortcut.global) continue;

        // Check if any key combo matches
        for (const combo of shortcut.keys) {
          const parsed = parseKeyCombo(combo);

          if (matchesKeyCombo(event, parsed)) {
            // Prevent default browser behavior if specified
            if (shortcut.preventDefault !== false) {
              event.preventDefault();
            }

            // Execute the handler
            shortcut.handler(event);
            return;
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

/**
 * Hook to subscribe to shortcut registry changes
 * Returns the current shortcuts and re-renders when they change
 */
export function useShortcutRegistry() {
  const forceUpdate = useCallback(() => {
    // This is a trick to force a re-render
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  }, []);

  useEffect(() => {
    // Create a callback that forces re-render
    const listener = () => forceUpdate();
    shortcutListeners.add(listener);
    return () => {
      shortcutListeners.delete(listener);
    };
  }, [forceUpdate]);

  return {
    shortcuts: getAllShortcuts(),
    shortcutsByCategory: getShortcutsByCategory(),
  };
}
