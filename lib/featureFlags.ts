/**
 * Feature Flag System
 *
 * Provides a robust feature flag system with:
 * - Type-safe feature definitions
 * - LocalStorage persistence
 * - URL parameter overrides
 * - Gradual rollout support
 * - User-based targeting
 */

// ============================================================================
// Types
// ============================================================================

export type FeatureFlagValue = boolean | string | number;

export interface FeatureFlagDefinition {
  /** Unique identifier for the feature */
  key: string;
  /** Human-readable name */
  name: string;
  /** Description of what this feature does */
  description: string;
  /** Default value when not overridden */
  defaultValue: FeatureFlagValue;
  /** Rollout percentage (0-100). If set, feature is randomly enabled for this % of users */
  rolloutPercentage?: number;
  /** Only available in development mode */
  devOnly?: boolean;
  /** Feature is deprecated and will be removed */
  deprecated?: boolean;
  /** Tags for organizing features */
  tags?: string[];
}

export interface FeatureFlagState {
  [key: string]: FeatureFlagValue;
}

export interface FeatureFlagOverrides {
  [key: string]: FeatureFlagValue;
}

export interface UserContext {
  /** Unique user identifier for consistent rollout */
  userId?: string;
  /** User attributes for targeting */
  attributes?: Record<string, string | number | boolean>;
}

// ============================================================================
// Feature Definitions
// ============================================================================

/**
 * Define all available feature flags here.
 * This serves as the source of truth for the application.
 */
export const FEATURE_FLAGS: Record<string, FeatureFlagDefinition> = {
  darkMode: {
    key: 'darkMode',
    name: 'Dark Mode',
    description: 'Enable dark mode theme across the application',
    defaultValue: false,
    tags: ['ui', 'theme'],
  },
  newCalculator: {
    key: 'newCalculator',
    name: 'New Calculator',
    description: 'Use the redesigned retirement calculator',
    defaultValue: false,
    rolloutPercentage: 0,
    tags: ['calculator', 'beta'],
  },
  aiAssistant: {
    key: 'aiAssistant',
    name: 'AI Assistant',
    description: 'Enable AI-powered retirement planning assistant',
    defaultValue: false,
    rolloutPercentage: 10,
    tags: ['ai', 'beta'],
  },
  advancedCharts: {
    key: 'advancedCharts',
    name: 'Advanced Charts',
    description: 'Show advanced visualization options in results',
    defaultValue: false,
    tags: ['ui', 'charts'],
  },
  debugMode: {
    key: 'debugMode',
    name: 'Debug Mode',
    description: 'Show debug information and tools',
    defaultValue: false,
    devOnly: true,
    tags: ['dev'],
  },
  experimentalMonteCarloV2: {
    key: 'experimentalMonteCarloV2',
    name: 'Monte Carlo V2',
    description: 'Use experimental Monte Carlo simulation engine',
    defaultValue: false,
    devOnly: true,
    rolloutPercentage: 0,
    tags: ['calculator', 'experimental'],
  },
  socialSharing: {
    key: 'socialSharing',
    name: 'Social Sharing',
    description: 'Enable social media sharing features',
    defaultValue: false,
    rolloutPercentage: 50,
    tags: ['social', 'sharing'],
  },
  pdfExport: {
    key: 'pdfExport',
    name: 'PDF Export',
    description: 'Allow exporting results as PDF documents',
    defaultValue: true,
    tags: ['export'],
  },
};

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'retirement-calc-feature-flags';
const USER_ID_KEY = 'retirement-calc-user-id';

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a random user ID for consistent rollout targeting
 */
export function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get or create a persistent user ID
 */
export function getUserId(): string {
  if (typeof window === 'undefined') {
    return 'server-render';
  }

  let userId = localStorage.getItem(USER_ID_KEY);
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem(USER_ID_KEY, userId);
  }
  return userId;
}

/**
 * Hash a string to a number between 0 and 100
 * Used for consistent rollout targeting
 */
export function hashToPercentage(str: string, salt: string = ''): number {
  const combined = `${str}:${salt}`;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash % 100);
}

/**
 * Check if a user is included in a rollout percentage
 */
export function isInRollout(
  userId: string,
  featureKey: string,
  percentage: number
): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;

  const userPercentage = hashToPercentage(userId, featureKey);
  return userPercentage < percentage;
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

// ============================================================================
// LocalStorage Persistence
// ============================================================================

/**
 * Load feature flag overrides from LocalStorage
 */
export function loadFromStorage(): FeatureFlagOverrides {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load feature flags from storage:', error);
  }
  return {};
}

/**
 * Save feature flag overrides to LocalStorage
 */
export function saveToStorage(overrides: FeatureFlagOverrides): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch (error) {
    console.warn('Failed to save feature flags to storage:', error);
  }
}

/**
 * Clear all feature flag overrides from LocalStorage
 */
export function clearStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear feature flags from storage:', error);
  }
}

// ============================================================================
// URL Parameter Parsing
// ============================================================================

/**
 * Parse feature flag overrides from URL parameters
 * Supports formats:
 * - ?feature=darkMode (enables darkMode)
 * - ?feature=darkMode,aiAssistant (enables multiple)
 * - ?feature_darkMode=true (explicit value)
 * - ?feature_debugLevel=3 (numeric value)
 */
export function parseUrlOverrides(): FeatureFlagOverrides {
  if (typeof window === 'undefined') {
    return {};
  }

  const overrides: FeatureFlagOverrides = {};
  const params = new URLSearchParams(window.location.search);

  // Parse ?feature=flag1,flag2 format (enable flags)
  const featureParam = params.get('feature');
  if (featureParam) {
    const features = featureParam.split(',').map((f) => f.trim());
    for (const feature of features) {
      if (FEATURE_FLAGS[feature]) {
        overrides[feature] = true;
      }
    }
  }

  // Parse ?disable_feature=flag1,flag2 format (disable flags)
  const disableParam = params.get('disable_feature');
  if (disableParam) {
    const features = disableParam.split(',').map((f) => f.trim());
    for (const feature of features) {
      if (FEATURE_FLAGS[feature]) {
        overrides[feature] = false;
      }
    }
  }

  // Parse ?feature_flagName=value format (explicit values)
  params.forEach((value, key) => {
    if (key.startsWith('feature_')) {
      const flagKey = key.substring(8); // Remove 'feature_' prefix
      if (FEATURE_FLAGS[flagKey]) {
        // Parse value
        if (value === 'true') {
          overrides[flagKey] = true;
        } else if (value === 'false') {
          overrides[flagKey] = false;
        } else if (!isNaN(Number(value))) {
          overrides[flagKey] = Number(value);
        } else {
          overrides[flagKey] = value;
        }
      }
    }
  });

  return overrides;
}

// ============================================================================
// Feature Flag Resolution
// ============================================================================

/**
 * Resolve the final value of a feature flag
 * Priority order (highest to lowest):
 * 1. URL parameter overrides
 * 2. LocalStorage overrides
 * 3. Gradual rollout (if applicable)
 * 4. Default value
 */
export function resolveFeatureFlag(
  definition: FeatureFlagDefinition,
  localOverrides: FeatureFlagOverrides,
  urlOverrides: FeatureFlagOverrides,
  userContext?: UserContext
): FeatureFlagValue {
  const { key, defaultValue, rolloutPercentage, devOnly } = definition;

  // Check if feature is dev-only in production
  if (devOnly && !isDevelopment()) {
    return false;
  }

  // Check URL overrides (highest priority)
  if (key in urlOverrides) {
    return urlOverrides[key];
  }

  // Check localStorage overrides
  if (key in localOverrides) {
    return localOverrides[key];
  }

  // Check gradual rollout
  if (rolloutPercentage !== undefined && rolloutPercentage > 0) {
    const userId = userContext?.userId || getUserId();
    if (isInRollout(userId, key, rolloutPercentage)) {
      return true;
    }
  }

  // Return default value
  return defaultValue;
}

/**
 * Get all resolved feature flag values
 */
export function resolveAllFlags(
  localOverrides: FeatureFlagOverrides = {},
  urlOverrides: FeatureFlagOverrides = {},
  userContext?: UserContext
): FeatureFlagState {
  const state: FeatureFlagState = {};

  for (const [key, definition] of Object.entries(FEATURE_FLAGS)) {
    state[key] = resolveFeatureFlag(
      definition,
      localOverrides,
      urlOverrides,
      userContext
    );
  }

  return state;
}

// ============================================================================
// Type-Safe Feature Flag Keys
// ============================================================================

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

/**
 * Get all feature flag keys as an array
 */
export function getAllFeatureFlagKeys(): FeatureFlagKey[] {
  return Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
}

/**
 * Get feature flags filtered by tag
 */
export function getFeatureFlagsByTag(tag: string): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAGS).filter(
    (def) => def.tags?.includes(tag)
  );
}

/**
 * Get only development feature flags
 */
export function getDevOnlyFlags(): FeatureFlagDefinition[] {
  return Object.values(FEATURE_FLAGS).filter((def) => def.devOnly);
}
