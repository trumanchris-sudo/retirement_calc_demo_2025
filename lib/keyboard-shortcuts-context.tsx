'use client';

/**
 * Keyboard Shortcuts Context
 *
 * Provides a centralized context for keyboard shortcuts throughout the app.
 * This context:
 * - Manages the global keyboard event listener
 * - Provides access to shortcut registration functions
 * - Handles the keyboard shortcuts modal state
 */

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  useKeyboardShortcuts,
  useKeyboardShortcutsHandler,
  getAllShortcuts,
  getShortcutsByCategory,
  type KeyboardShortcut,
  type ShortcutCategory,
  type KeyCombo,
} from '@/hooks/useKeyboardShortcuts';
import { KeyboardShortcutsModal } from '@/components/ui/KeyboardShortcuts';

interface KeyboardShortcutsContextValue {
  // Modal state
  isModalOpen: boolean;
  openModal: () => void;
  closeModal: () => void;
  toggleModal: () => void;

  // Shortcut management
  registerShortcut: (shortcut: KeyboardShortcut) => void;
  unregisterShortcut: (id: string) => void;
  customizeShortcut: (id: string, newKeys: KeyCombo[]) => void;
  toggleShortcut: (id: string, enabled: boolean) => void;
  resetShortcut: (id: string) => void;
  resetAllShortcuts: () => void;

  // Queries
  getAllShortcuts: () => KeyboardShortcut[];
  getShortcutsByCategory: () => Record<ShortcutCategory, KeyboardShortcut[]>;
  isKeyComboInUse: (combo: KeyCombo, excludeId?: string) => string | null;
}

const KeyboardShortcutsContext = createContext<KeyboardShortcutsContextValue | null>(null);

interface KeyboardShortcutsProviderProps {
  children: ReactNode;
}

export function KeyboardShortcutsProvider({ children }: KeyboardShortcutsProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Initialize the keyboard shortcuts hook
  const {
    registerShortcut,
    unregisterShortcut,
    customizeShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
    isKeyComboInUse,
  } = useKeyboardShortcuts();

  // Set up the global keyboard event listener
  useKeyboardShortcutsHandler();

  // Modal controls
  const openModal = useCallback(() => setIsModalOpen(true), []);
  const closeModal = useCallback(() => setIsModalOpen(false), []);
  const toggleModal = useCallback(() => setIsModalOpen((prev) => !prev), []);

  // Register the help shortcut to open the modal
  useEffect(() => {
    registerShortcut({
      id: 'show-keyboard-shortcuts',
      keys: ['shift+?', '?'],
      handler: () => openModal(),
      category: 'Help',
      description: 'Show keyboard shortcuts',
      global: true,
      preventDefault: true,
    });

    return () => {
      unregisterShortcut('show-keyboard-shortcuts');
    };
  }, [registerShortcut, unregisterShortcut, openModal]);

  const contextValue: KeyboardShortcutsContextValue = {
    isModalOpen,
    openModal,
    closeModal,
    toggleModal,
    registerShortcut,
    unregisterShortcut,
    customizeShortcut,
    toggleShortcut,
    resetShortcut,
    resetAllShortcuts,
    getAllShortcuts,
    getShortcutsByCategory,
    isKeyComboInUse,
  };

  return (
    <KeyboardShortcutsContext.Provider value={contextValue}>
      {children}
      <KeyboardShortcutsModal open={isModalOpen} onOpenChange={setIsModalOpen} />
    </KeyboardShortcutsContext.Provider>
  );
}

/**
 * Hook to access the keyboard shortcuts context
 */
export function useKeyboardShortcutsContext() {
  const context = useContext(KeyboardShortcutsContext);
  if (!context) {
    throw new Error(
      'useKeyboardShortcutsContext must be used within a KeyboardShortcutsProvider'
    );
  }
  return context;
}

/**
 * Hook to register a shortcut with automatic cleanup
 * Usage:
 * ```tsx
 * useRegisterShortcut({
 *   id: 'my-shortcut',
 *   keys: ['meta+k'],
 *   handler: () => doSomething(),
 *   category: 'Actions',
 *   description: 'Do something',
 * });
 * ```
 */
export function useRegisterShortcut(shortcut: KeyboardShortcut) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcutsContext();

  useEffect(() => {
    registerShortcut(shortcut);
    return () => unregisterShortcut(shortcut.id);
  }, [
    shortcut.id,
    shortcut.keys.join(','),
    shortcut.category,
    shortcut.description,
    shortcut.enabled,
    shortcut.global,
    registerShortcut,
    unregisterShortcut,
  ]);
}

/**
 * Hook to register multiple shortcuts at once
 */
export function useRegisterShortcuts(shortcuts: KeyboardShortcut[]) {
  const { registerShortcut, unregisterShortcut } = useKeyboardShortcutsContext();

  useEffect(() => {
    shortcuts.forEach((shortcut) => registerShortcut(shortcut));
    return () => shortcuts.forEach((shortcut) => unregisterShortcut(shortcut.id));
  }, [shortcuts, registerShortcut, unregisterShortcut]);
}

export default KeyboardShortcutsProvider;
