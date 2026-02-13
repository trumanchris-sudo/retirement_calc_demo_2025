'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import {
  FEATURE_FLAGS,
  FeatureFlagState,
  FeatureFlagOverrides,
  FeatureFlagKey,
  FeatureFlagValue,
  FeatureFlagDefinition,
  UserContext,
  loadFromStorage,
  saveToStorage,
  clearStorage,
  parseUrlOverrides,
  resolveAllFlags,
  resolveFeatureFlag,
  isDevelopment,
  getUserId,
} from '@/lib/featureFlags';

// ============================================================================
// Context Types
// ============================================================================

interface FeatureFlagContextValue {
  /** Current resolved feature flag states */
  flags: FeatureFlagState;
  /** Check if a specific feature is enabled */
  isEnabled: (key: FeatureFlagKey) => boolean;
  /** Get the value of a feature flag */
  getValue: <T extends FeatureFlagValue>(key: FeatureFlagKey) => T;
  /** Set a feature flag override (persists to localStorage) */
  setFlag: (key: FeatureFlagKey, value: FeatureFlagValue) => void;
  /** Reset a flag to its default/resolved value */
  resetFlag: (key: FeatureFlagKey) => void;
  /** Reset all flags to defaults */
  resetAllFlags: () => void;
  /** Current local overrides */
  overrides: FeatureFlagOverrides;
  /** Whether dev panel is visible */
  isDevPanelOpen: boolean;
  /** Toggle dev panel visibility */
  toggleDevPanel: () => void;
  /** Loading state during hydration */
  isLoading: boolean;
}

// ============================================================================
// Context
// ============================================================================

const FeatureFlagContext = createContext<FeatureFlagContextValue | undefined>(
  undefined
);

// ============================================================================
// Provider Component
// ============================================================================

interface FeatureFlagProviderProps {
  children: ReactNode;
  /** User context for rollout targeting */
  userContext?: UserContext;
  /** Initial overrides (useful for SSR or testing) */
  initialOverrides?: FeatureFlagOverrides;
  /** Show dev panel toggle in development */
  showDevPanel?: boolean;
}

export function FeatureFlagProvider({
  children,
  userContext,
  initialOverrides = {},
  showDevPanel = true,
}: FeatureFlagProviderProps) {
  const [localOverrides, setLocalOverrides] =
    useState<FeatureFlagOverrides>(initialOverrides);
  const [urlOverrides, setUrlOverrides] = useState<FeatureFlagOverrides>({});
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load overrides from localStorage and URL on mount
  useEffect(() => {
    const storedOverrides = loadFromStorage();
    const parsedUrlOverrides = parseUrlOverrides();

    setLocalOverrides((prev) => ({ ...prev, ...storedOverrides }));
    setUrlOverrides(parsedUrlOverrides);
    setIsLoading(false);
    setIsHydrated(true);
  }, []);

  // Resolve all flags
  const flags = useMemo(() => {
    return resolveAllFlags(localOverrides, urlOverrides, userContext);
  }, [localOverrides, urlOverrides, userContext]);

  // Check if a feature is enabled
  const isEnabled = useCallback(
    (key: FeatureFlagKey): boolean => {
      const value = flags[key];
      return Boolean(value);
    },
    [flags]
  );

  // Get the value of a feature flag
  const getValue = useCallback(
    <T extends FeatureFlagValue>(key: FeatureFlagKey): T => {
      return flags[key] as T;
    },
    [flags]
  );

  // Set a feature flag override
  const setFlag = useCallback(
    (key: FeatureFlagKey, value: FeatureFlagValue) => {
      setLocalOverrides((prev) => {
        const next = { ...prev, [key]: value };
        saveToStorage(next);
        return next;
      });
    },
    []
  );

  // Reset a single flag
  const resetFlag = useCallback((key: FeatureFlagKey) => {
    setLocalOverrides((prev) => {
      const next = { ...prev };
      delete next[key];
      saveToStorage(next);
      return next;
    });
  }, []);

  // Reset all flags
  const resetAllFlags = useCallback(() => {
    setLocalOverrides({});
    clearStorage();
  }, []);

  // Toggle dev panel
  const toggleDevPanel = useCallback(() => {
    setIsDevPanelOpen((prev) => !prev);
  }, []);

  // Keyboard shortcut for dev panel (Ctrl/Cmd + Shift + F)
  useEffect(() => {
    if (!showDevPanel || !isDevelopment()) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        toggleDevPanel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showDevPanel, toggleDevPanel]);

  const contextValue: FeatureFlagContextValue = useMemo(
    () => ({
      flags,
      isEnabled,
      getValue,
      setFlag,
      resetFlag,
      resetAllFlags,
      overrides: localOverrides,
      isDevPanelOpen,
      toggleDevPanel,
      isLoading,
    }),
    [
      flags,
      isEnabled,
      getValue,
      setFlag,
      resetFlag,
      resetAllFlags,
      localOverrides,
      isDevPanelOpen,
      toggleDevPanel,
      isLoading,
    ]
  );

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
      {showDevPanel && isDevelopment() && isHydrated && (
        <FeatureFlagDevPanel />
      )}
    </FeatureFlagContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access feature flags
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error(
      'useFeatureFlags must be used within a FeatureFlagProvider'
    );
  }
  return context;
}

/**
 * Hook to check if a single feature is enabled
 */
export function useFeatureFlag(key: FeatureFlagKey): boolean {
  const { isEnabled, isLoading } = useFeatureFlags();
  // Return false while loading to avoid flash of experimental content
  if (isLoading) return false;
  return isEnabled(key);
}

/**
 * Hook to get a feature flag value
 */
export function useFeatureFlagValue<T extends FeatureFlagValue>(
  key: FeatureFlagKey
): T | undefined {
  const { getValue, isLoading } = useFeatureFlags();
  if (isLoading) return undefined;
  return getValue<T>(key);
}

// ============================================================================
// Dev Panel Component
// ============================================================================

function FeatureFlagDevPanel() {
  const {
    flags,
    overrides,
    setFlag,
    resetFlag,
    resetAllFlags,
    isDevPanelOpen,
    toggleDevPanel,
  } = useFeatureFlags();

  const [filter, setFilter] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Get all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    Object.values(FEATURE_FLAGS).forEach((def) => {
      def.tags?.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Filter feature flags
  const filteredFlags = useMemo(() => {
    return Object.entries(FEATURE_FLAGS).filter(([key, def]) => {
      const matchesFilter =
        filter === '' ||
        key.toLowerCase().includes(filter.toLowerCase()) ||
        def.name.toLowerCase().includes(filter.toLowerCase()) ||
        def.description.toLowerCase().includes(filter.toLowerCase());

      const matchesTag =
        selectedTag === null || def.tags?.includes(selectedTag);

      return matchesFilter && matchesTag;
    });
  }, [filter, selectedTag]);

  if (!isDevPanelOpen) {
    return (
      <button
        onClick={toggleDevPanel}
        className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-gray-800 transition-colors text-sm font-mono"
        title="Open Feature Flags (Ctrl+Shift+F)"
      >
        FF
      </button>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          Feature Flags
        </h2>
        <button
          onClick={toggleDevPanel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <input
          type="text"
          placeholder="Search flags..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500"
        />
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => setSelectedTag(null)}
            className={`px-2 py-1 text-xs rounded-full transition-colors ${
              selectedTag === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-2 py-1 text-xs rounded-full transition-colors ${
                selectedTag === tag
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Flag List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredFlags.map(([key, def]) => (
          <FeatureFlagItem
            key={key}
            flagKey={key as FeatureFlagKey}
            definition={def}
            currentValue={flags[key]}
            hasOverride={key in overrides}
            onToggle={(value) => setFlag(key as FeatureFlagKey, value)}
            onReset={() => resetFlag(key as FeatureFlagKey)}
          />
        ))}
        {filteredFlags.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center py-4">
            No flags match your filter
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={resetAllFlags}
          className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm"
        >
          Reset All Overrides
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          User ID: {getUserId().slice(0, 20)}...
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Press Ctrl+Shift+F to toggle
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Feature Flag Item Component
// ============================================================================

interface FeatureFlagItemProps {
  flagKey: FeatureFlagKey;
  definition: FeatureFlagDefinition;
  currentValue: FeatureFlagValue;
  hasOverride: boolean;
  onToggle: (value: FeatureFlagValue) => void;
  onReset: () => void;
}

function FeatureFlagItem({
  flagKey,
  definition,
  currentValue,
  hasOverride,
  onToggle,
  onReset,
}: FeatureFlagItemProps) {
  const isBoolean = typeof currentValue === 'boolean';
  const isEnabled = Boolean(currentValue);

  return (
    <div
      className={`p-3 rounded-lg border ${
        hasOverride
          ? 'border-blue-300 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {definition.name}
            </h3>
            {definition.devOnly && (
              <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                Dev
              </span>
            )}
            {definition.deprecated && (
              <span className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                Deprecated
              </span>
            )}
            {definition.rolloutPercentage !== undefined && (
              <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                {definition.rolloutPercentage}%
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {definition.description}
          </p>
          <p className="text-xs font-mono text-gray-400 dark:text-gray-500 mt-1">
            {flagKey}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasOverride && (
            <button
              onClick={onReset}
              className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
              title="Reset to default"
            >
              Reset
            </button>
          )}
          {isBoolean ? (
            <button
              onClick={() => onToggle(!isEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isEnabled ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          ) : (
            <input
              type="text"
              value={String(currentValue)}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'true') onToggle(true);
                else if (val === 'false') onToggle(false);
                else if (!isNaN(Number(val))) onToggle(Number(val));
                else onToggle(val);
              }}
              className="w-20 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          )}
        </div>
      </div>

      {definition.tags && definition.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {definition.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Feature Component (Conditional Rendering)
// ============================================================================

interface FeatureProps {
  /** Feature flag key to check */
  flag: FeatureFlagKey;
  /** Content to render when feature is enabled */
  children: ReactNode;
  /** Optional fallback content when feature is disabled */
  fallback?: ReactNode;
}

/**
 * Component for conditionally rendering content based on feature flags
 */
export function Feature({ flag, children, fallback = null }: FeatureProps) {
  const isEnabled = useFeatureFlag(flag);
  return <>{isEnabled ? children : fallback}</>;
}

// ============================================================================
// Higher-Order Component
// ============================================================================

/**
 * HOC to wrap a component with feature flag check
 */
export function withFeatureFlag<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  flag: FeatureFlagKey,
  FallbackComponent?: React.ComponentType<P>
): React.FC<P> {
  return function FeatureFlaggedComponent(props: P) {
    const isEnabled = useFeatureFlag(flag);

    if (!isEnabled) {
      return FallbackComponent ? <FallbackComponent {...props} /> : null;
    }

    return <WrappedComponent {...props} />;
  };
}

// ============================================================================
// Exports
// ============================================================================

export {
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type FeatureFlagValue,
  type FeatureFlagState,
  type FeatureFlagDefinition,
} from '@/lib/featureFlags';
