/**
 * Hooks Barrel Export
 *
 * Central export point for all custom hooks.
 * Import hooks from '@/hooks' for cleaner imports.
 */

// Toast notifications
export { useToast, toast } from './use-toast';

// Mobile detection
export { useIsMobile } from './use-mobile';

// Debouncing and throttling
export {
  useDebounce,
  useDebounceCallback,
  useThrottleCallback,
  useDebouncedState,
  useIsDebouncing,
} from './useDebounce';

// Performance monitoring (dev only)
export {
  useRenderCount,
  useRenderTime,
  useWhyDidYouRender,
  useProfiledOperation,
  getPerformanceSummary,
  resetPerformanceCounters,
  createProfilerCallback,
  configurePerformanceMonitor,
} from './usePerformanceMonitor';

// Optimized PlanConfig selectors
export {
  usePersonalInfo,
  useIncomeInfo,
  useAccountBalances,
  useContributions,
  useRateAssumptions,
  useSocialSecuritySettings,
  useHealthcareSettings,
  useSimulationSettings,
  useBondGlidePath,
  useGenerationalWealthSettings,
  useIsMarried,
  useYearsToRetirement,
  useTotalPortfolioValue,
  useBatchConfigUpdate,
} from './usePlanConfigSelectors';

// Calculator results state management
export {
  useCalculatorResults,
  useSavedScenarios,
  useAIInsightState,
  useUIToggles,
} from './useCalculatorResults';

// AI defaults
export { useAIDefaults } from './useAIDefaults';

// Keyboard inset (mobile)
export { useKeyboardInset } from './useKeyboardInset';

// Onboarding
export { useOnboarding } from './useOnboarding';

// Keyboard shortcuts
export {
  useKeyboardShortcuts,
  useKeyboardShortcutsHandler,
  useShortcutRegistry,
  parseKeyCombo,
  matchesKeyCombo,
  formatKeyCombo,
  getAllShortcuts,
  getShortcutsByCategory,
  type KeyCombo,
  type KeyboardShortcut,
  type ShortcutCategory,
  type ShortcutCustomization,
} from './useKeyboardShortcuts';

// Local and session storage
export {
  useLocalStorage,
  useSessionStorage,
  useLocalStorageManual,
} from './useLocalStorage';
