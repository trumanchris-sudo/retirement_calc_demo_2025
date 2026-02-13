/**
 * Custom hook for localStorage with SSR-safe initialization
 *
 * This hook consolidates the common pattern of:
 * 1. useEffect to read from localStorage on mount
 * 2. useEffect to write to localStorage on state change
 *
 * By using lazy initialization and a single effect for writes,
 * we eliminate the paired read/write useEffect anti-pattern.
 *
 * BENEFITS:
 * - No sync bugs from effect ordering
 * - SSR-safe (doesn't access localStorage during SSR)
 * - Single effect instead of two
 * - Automatic JSON serialization/deserialization
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * SSR-safe localStorage hook
 *
 * @param key - localStorage key
 * @param initialValue - Default value if nothing in storage
 * @returns [value, setValue] tuple like useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Use lazy initialization to avoid reading localStorage on every render
  // and to handle SSR where window is undefined
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorage] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  // Track if this is the initial mount to avoid writing the initial value back
  const isInitialMount = useRef(true);

  // Write to localStorage when value changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`[useLocalStorage] Error writing ${key}:`, error);
    }
  }, [key, storedValue]);

  // Wrapper for setValue that handles both direct values and updater functions
  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      return nextValue;
    });
  }, []);

  return [storedValue, setValue];
}

/**
 * SSR-safe sessionStorage hook
 *
 * Same pattern as useLocalStorage but for sessionStorage.
 * Useful for temporary state that should persist across page navigations
 * but not across browser sessions.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`[useSessionStorage] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  const isInitialMount = useRef(true);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.sessionStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`[useSessionStorage] Error writing ${key}:`, error);
    }
  }, [key, storedValue]);

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setStoredValue((prev) => {
      const nextValue = value instanceof Function ? value(prev) : value;
      return nextValue;
    });
  }, []);

  return [storedValue, setValue];
}

/**
 * Hook that reads from localStorage only once on mount
 * and returns a callback to manually trigger saves.
 *
 * Use this when you want more control over when writes happen,
 * e.g., for expensive serialization or when batching updates.
 */
export function useLocalStorageManual<T>(
  key: string,
  initialValue: T
): {
  value: T;
  setValue: (value: T | ((prev: T) => T)) => void;
  save: () => void;
  clear: () => void;
} {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.error(`[useLocalStorageManual] Error reading ${key}:`, error);
      return initialValue;
    }
  });

  const save = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[useLocalStorageManual] Error saving ${key}:`, error);
    }
  }, [key, value]);

  const clear = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(key);
      setValue(initialValue);
    } catch (error) {
      console.error(`[useLocalStorageManual] Error clearing ${key}:`, error);
    }
  }, [key, initialValue]);

  return { value, setValue, save, clear };
}
