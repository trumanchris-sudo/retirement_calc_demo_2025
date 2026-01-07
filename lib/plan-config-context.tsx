'use client';

/**
 * Plan Configuration Context
 *
 * Provides global access to the unified plan configuration across the app.
 * This replaces scattered useState hooks with a single source of truth.
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
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

export function PlanConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<PlanConfig>(createDefaultPlanConfig);
  const [isDirty, setIsDirty] = useState(false);
  const [savedVersion, setSavedVersion] = useState<string>('');

  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as PlanConfig;
        setConfigState(parsed);
        setSavedVersion(JSON.stringify(parsed));
        console.log('[PlanConfig] Loaded from localStorage');
      }
    } catch (error) {
      console.error('[PlanConfig] Failed to load from localStorage:', error);
    }
  }, []);

  // Auto-save to localStorage when config changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      const currentVersion = JSON.stringify(config);
      setIsDirty(currentVersion !== savedVersion);
    } catch (error) {
      console.error('[PlanConfig] Failed to save to localStorage:', error);
    }
  }, [config, savedVersion]);

  const updateConfig = useCallback(
    (
      updates: Partial<PlanConfig>,
      source: 'user-entered' | 'ai-suggested' | 'default' | 'imported' = 'user-entered'
    ) => {
      setConfigState(current => {
        const updated = mergeConfigUpdates(current, updates, source);
        console.log('[PlanConfig] Updated:', Object.keys(updates), 'Source:', source);
        return updated;
      });
    },
    []
  );

  const setConfig = useCallback((newConfig: PlanConfig) => {
    setConfigState(newConfig);
    console.log('[PlanConfig] Config replaced');
  }, []);

  const resetConfig = useCallback(() => {
    const defaultConfig = createDefaultPlanConfig();
    setConfigState(defaultConfig);
    setSavedVersion('');
    console.log('[PlanConfig] Reset to defaults');
  }, []);

  const markSaved = useCallback(() => {
    setSavedVersion(JSON.stringify(config));
    setIsDirty(false);
  }, [config]);

  const isComplete = isConfigComplete(config);
  const missingFields = getMissingFields(config);

  const value: PlanConfigContextValue = {
    config,
    updateConfig,
    setConfig,
    resetConfig,
    isComplete,
    missingFields,
    isDirty,
    markSaved,
  };

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
