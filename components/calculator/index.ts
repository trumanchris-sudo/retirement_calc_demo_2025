/**
 * Calculator Component Exports
 *
 * Core calculator UI components for the retirement planning interface.
 * Import from: @/components/calculator
 */

// --- Animation & Splash ---
export { default as CyberpunkSplash } from './CyberpunkSplash';
export type { CyberpunkSplashHandle } from './CyberpunkSplash';

// --- Status Indicators ---
export { LastCalculatedBadge } from './LastCalculatedBadge';
export type { LastCalculatedBadgeProps } from './LastCalculatedBadge';

// --- Monte Carlo Visualization ---
// Note: This is MonteCarloErrorBoundary exported as MonteCarloVisualizer
// CAUTION: Depends on MonteCarloVisualizer.tsx which may not exist
export { MonteCarloVisualizer } from './MonteCarloVisualizerWrapper';

// --- Results & Recommendations ---
export { NextStepsCard } from './NextStepsCard';
export { default as OptimizationTab } from './OptimizationTab';
export { SpendingFlexibilityChart } from './SpendingFlexibilityChart';

// --- Tab Navigation ---
export { TabPanel } from './TabPanel';
export type { TabPanelProps } from './TabPanel';

// --- Timeline ---
export { TimelineView } from './TimelineView';

// --- Tab Navigation Component ---
// Uncomment when MainTabId type is properly exported
// export { TabNavigation } from './TabNavigation';
// export type { MainTabId } from './TabNavigation';
