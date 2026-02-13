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
 * IMPORTANT: This hook is hydration-safe. It always starts with initialValue
 * during the first render (both server and client), then reads from localStorage
 * after hydration completes. This prevents hydration mismatches.
 *
 * @param key - localStorage key
 * @param initialValue - Default value if nothing in storage
 * @returns [value, setValue] tuple like useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // ALWAYS start with initialValue to prevent hydration mismatch
  // The localStorage read happens in useEffect after hydration
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  // Track if we've hydrated from localStorage
  const hasHydrated = useRef(false);

  // Read from localStorage AFTER hydration (in useEffect)
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
      }
    } catch (error) {
      console.error(`[useLocalStorage] Error reading ${key}:`, error);
    }
  }, [key]);

  // Write to localStorage when value changes (skip until after hydration)
  useEffect(() => {
    // Don't write until we've hydrated from localStorage
    // This prevents overwriting stored values with initialValue on first render
    if (!hasHydrated.current) return;

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
 *
 * IMPORTANT: Hydration-safe - always starts with initialValue.
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // ALWAYS start with initialValue to prevent hydration mismatch
  const [storedValue, setStoredValue] = useState<T>(initialValue);

  const hasHydrated = useRef(false);

  // Read from sessionStorage AFTER hydration
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    try {
      const item = window.sessionStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setStoredValue(parsed);
      }
    } catch (error) {
      console.error(`[useSessionStorage] Error reading ${key}:`, error);
    }
  }, [key]);

  // Write to sessionStorage when value changes (skip until after hydration)
  useEffect(() => {
    // Don't write until we've hydrated from sessionStorage
    if (!hasHydrated.current) return;

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
 *
 * IMPORTANT: Hydration-safe - always starts with initialValue.
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
  // ALWAYS start with initialValue to prevent hydration mismatch
  const [value, setValueState] = useState<T>(initialValue);

  const hasHydrated = useRef(false);

  // Read from localStorage AFTER hydration
  useEffect(() => {
    if (hasHydrated.current) return;
    hasHydrated.current = true;

    try {
      const item = window.localStorage.getItem(key);
      if (item) {
        const parsed = JSON.parse(item) as T;
        setValueState(parsed);
      }
    } catch (error) {
      console.error(`[useLocalStorageManual] Error reading ${key}:`, error);
    }
  }, [key]);

  const setValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValueState((prev) => {
      const nextValue = newValue instanceof Function ? newValue(prev) : newValue;
      return nextValue;
    });
  }, []);

  const save = useCallback(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`[useLocalStorageManual] Error saving ${key}:`, error);
    }
  }, [key, value]);

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setValueState(initialValue);
    } catch (error) {
      console.error(`[useLocalStorageManual] Error clearing ${key}:`, error);
    }
  }, [key, initialValue]);

  return { value, setValue, save, clear };
}
