/**
 * Debounce and Throttle Hooks
 *
 * These hooks help prevent expensive operations from running too frequently,
 * particularly useful for:
 * - Input changes that trigger calculations
 * - localStorage writes
 * - API calls
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Debounce a value - only update after the specified delay
 * Useful for input fields where you don't want to trigger calculations on every keystroke
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearch = useDebounce(searchTerm, 500);
 * useEffect(() => { search(debouncedSearch) }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Debounce a callback function - only execute after the specified delay
 * since the last call
 *
 * @param callback - The function to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns A debounced version of the callback
 *
 * @example
 * const saveToStorage = useDebounceCallback((data) => {
 *   localStorage.setItem('key', JSON.stringify(data));
 * }, 500);
 */
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );
}

/**
 * Throttle a callback function - only execute once per specified interval
 * Unlike debounce, throttle guarantees execution at regular intervals
 *
 * @param callback - The function to throttle
 * @param interval - Minimum interval between executions in milliseconds (default: 300ms)
 * @returns A throttled version of the callback
 *
 * @example
 * const handleScroll = useThrottleCallback((e) => {
 *   updateScrollPosition(e.target.scrollTop);
 * }, 100);
 */
export function useThrottleCallback<T extends (...args: any[]) => any>(
  callback: T,
  interval: number = 300
): (...args: Parameters<T>) => void {
  const lastExecutedRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  // Keep callback ref updated
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const elapsed = now - lastExecutedRef.current;

      if (elapsed >= interval) {
        // Enough time has passed, execute immediately
        lastExecutedRef.current = now;
        callbackRef.current(...args);
      } else {
        // Schedule execution for the end of the interval
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
          lastExecutedRef.current = Date.now();
          callbackRef.current(...args);
        }, interval - elapsed);
      }
    },
    [interval]
  );
}

/**
 * Debounced input state management
 * Returns both the immediate value (for display) and debounced value (for processing)
 *
 * @param initialValue - Initial value for the input
 * @param delay - Debounce delay in milliseconds (default: 300ms)
 * @returns [immediateValue, debouncedValue, setValue]
 *
 * @example
 * const [value, debouncedValue, setValue] = useDebouncedState(0, 500);
 * // value updates immediately for responsive UI
 * // debouncedValue updates after 500ms of no changes for calculations
 */
export function useDebouncedState<T>(
  initialValue: T,
  delay: number = 300
): [T, T, (value: T) => void] {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounce(value, delay);

  return [value, debouncedValue, setValue];
}

/**
 * Track whether value is currently being debounced
 * Useful for showing loading indicators during debounce period
 *
 * @param value - The value being debounced
 * @param debouncedValue - The debounced value
 * @returns true if currently debouncing (values differ)
 */
export function useIsDebouncing<T>(value: T, debouncedValue: T): boolean {
  return value !== debouncedValue;
}
