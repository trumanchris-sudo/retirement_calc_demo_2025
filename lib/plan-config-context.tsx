'use client';

/**
 * Plan Configuration Context
 *
 * Provides global access to the unified plan configuration across the app.
 * This replaces scattered useState hooks with a single source of truth.
 *
 * PERFORMANCE OPTIMIZATIONS:
 * 1. Debounced localStorage sync (500ms) to prevent excessive writes
 * 2. Memoized derived state (isComplete, missingFields)
 * 3. Stable callback references via useCallback
 * 4. Version tracking uses hash instead of full JSON comparison
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import type { PlanConfig, FieldMetadata } from '@/types/plan-config';
import {
  createDefaultPlanConfig,
  mergeConfigUpdates,
  getMissingFields,
  isConfigComplete,
} from '@/types/plan-config';

interface PlanConfigContextValue {
  /** Current plan configuration */
  config: PlanConfig;

  /** Update config with partial changes */
  updateConfig: (
    updates: Partial<PlanConfig>,
    source?: 'user-entered' | 'ai-suggested' | 'default' | 'imported'
  ) => void;

  /** Replace entire config (e.g., loading a scenario) */
  setConfig: (config: PlanConfig) => void;

  /** Reset to default config */
  resetConfig: () => void;

  /** Check if config is complete */
  isComplete: boolean;

  /** Get list of missing required fields */
  missingFields: string[];

  /** Track if config has unsaved changes */
  isDirty: boolean;

  /** Mark config as saved */
  markSaved: () => void;
}

const PlanConfigContext = createContext<PlanConfigContextValue | null>(null);

const STORAGE_KEY = 'retirement_plan_config';
const STORAGE_DEBOUNCE_MS = 500; // Debounce localStorage writes

/**
 * Simple hash function for quick dirty checking
 * Much faster than JSON.stringify comparison for large objects
 */
function quickHash(obj: object): number {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

export function PlanConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PlanConfig>(createDefaultPlanConfig);
  const [isDirty, setIsDirty] = useState(false);
  const savedVersionHash = useRef<number>(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialized = useRef(false);

  // Load config from localStorage on mount (only once)
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlanConfig;
        setConfigState(parsed);
        savedVersionHash.current = quickHash(parsed);
        if (process.env.NODE_ENV === 'development') {
          console.log('[PlanConfig] Loaded from localStorage');
        }
      }
    } catch (error) {
      console.error('[PlanConfig] Failed to load from localStorage:', error);
    }
  }, []);

  // Debounced auto-save to localStorage when config changes
  useEffect(() => {
    // Skip on initial mount before config is loaded
    if (!isInitialized.current) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Check if actually dirty using hash comparison (much faster)
    const currentHash = quickHash(config);
    const isActuallyDirty = currentHash !== savedVersionHash.current;
    setIsDirty(isActuallyDirty);

    // Debounce the localStorage write
    saveTimeoutRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        if (process.env.NODE_ENV === 'development') {
          console.log('[PlanConfig] Saved to localStorage (debounced)');
        }
      } catch (error) {
        console.error('[PlanConfig] Failed to save to localStorage:', error);
      }
    }, STORAGE_DEBOUNCE_MS);

    // Cleanup timeout on unmount
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [config]);

  const updateConfig = useCallback(
    (
      updates: Partial<PlanConfig>,
      source: 'user-entered' | 'ai-suggested' | 'default' | 'imported' = 'user-entered'
    ) => {
      setConfigState(current => {
        const updated = mergeConfigUpdates(current, updates, source);
        if (process.env.NODE_ENV === 'development') {
          console.log('[PlanConfig] Updated:', Object.keys(updates), 'Source:', source);
        }
        return updated;
      });
    },
    []
  );

  const setConfig = useCallback((newConfig: PlanConfig) => {
    setConfigState(newConfig);
    if (process.env.NODE_ENV === 'development') {
      console.log('[PlanConfig] Config replaced');
    }
  }, []);

  const resetConfig = useCallback(() => {
    const defaultConfig = createDefaultPlanConfig();
    setConfigState(defaultConfig);
    savedVersionHash.current = 0;
    if (process.env.NODE_ENV === 'development') {
      console.log('[PlanConfig] Reset to defaults');
    }
  }, []);

  const markSaved = useCallback(() => {
    savedVersionHash.current = quickHash(config);
    setIsDirty(false);
  }, [config]);

  // Memoize derived state to prevent recalculation on every render
  const isComplete = useMemo(() => isConfigComplete(config), [config]);
  const missingFields = useMemo(() => getMissingFields(config), [config]);

  // Memoize the entire context value to prevent unnecessary re-renders
  const value = useMemo<PlanConfigContextValue>(
    () => ({
      config,
      updateConfig,
      setConfig,
      resetConfig,
      isComplete,
      missingFields,
      isDirty,
      markSaved,
    }),
    [config, updateConfig, setConfig, resetConfig, isComplete, missingFields, isDirty, markSaved]
  );

  return <PlanConfigContext.Provider value={value}>{children}</PlanConfigContext.Provider>;
}

/**
 * Hook to access plan configuration
 */
export function usePlanConfig() {
  const context = useContext(PlanConfigContext);
  if (!context) {
    throw new Error('usePlanConfig must be used within PlanConfigProvider');
  }
  return context;
}

/**
 * Hook to get specific config values
 * Useful for components that only need specific fields
 */
export function usePlanConfigField<K extends keyof PlanConfig>(
  field: K
): [PlanConfig[K], (value: PlanConfig[K]) => void] {
  const { config, updateConfig } = usePlanConfig();

  const setValue = useCallback(
    (value: PlanConfig[K]) => {
      updateConfig({ [field]: value } as Partial<PlanConfig>);
    },
    [field, updateConfig]
  );

  return [config[field], setValue];
}
