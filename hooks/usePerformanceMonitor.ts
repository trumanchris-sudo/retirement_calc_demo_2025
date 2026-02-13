/**
 * Performance Monitoring Hooks for Development Mode
 *
 * These utilities help identify performance issues during development:
 * - Track render counts per component
 * - Log expensive re-renders
 * - Measure render times
 * - Profile component updates
 *
 * All monitoring is automatically disabled in production builds.
 */

import { useRef, useEffect, useMemo } from 'react';

const IS_DEV = process.env.NODE_ENV === 'development';

// Global render counters (persisted across hot reloads in dev)
const renderCounters = new Map<string, number>();
const lastRenderTimes = new Map<string, number>();

/**
 * Configuration for performance monitoring
 */
interface PerformanceConfig {
  /** Warn when render count exceeds this threshold */
  warnAfterRenders: number;
  /** Log render times exceeding this threshold (ms) */
  slowRenderThreshold: number;
  /** Enable verbose logging of all renders */
  verboseLogging: boolean;
  /** Enable render count tracking */
  trackRenderCounts: boolean;
}

const defaultConfig: PerformanceConfig = {
  warnAfterRenders: 50,
  slowRenderThreshold: 16, // One frame at 60fps
  verboseLogging: false,
  trackRenderCounts: true,
};

// Allow runtime configuration
let globalConfig = { ...defaultConfig };

export function configurePerformanceMonitor(config: Partial<PerformanceConfig>) {
  globalConfig = { ...globalConfig, ...config };
}

/**
 * Track render count and log warnings for frequently re-rendering components
 *
 * @param componentName - Name of the component being monitored
 * @param props - Optional props to log when re-rendering
 *
 * @example
 * function MyComponent(props) {
 *   useRenderCount('MyComponent', props);
 *   // ... component logic
 * }
 */
export function useRenderCount(componentName: string, props?: Record<string, any>): number {
  const renderCount = useRef(0);
  const lastProps = useRef(props);

  renderCount.current += 1;

  useEffect(() => {
    if (!IS_DEV || !globalConfig.trackRenderCounts) return;

    // Update global counter
    const globalCount = (renderCounters.get(componentName) ?? 0) + 1;
    renderCounters.set(componentName, globalCount);

    // Warn about excessive renders
    if (globalCount === globalConfig.warnAfterRenders) {
      console.warn(
        `[PERF] ${componentName} has rendered ${globalCount} times. Consider memoization or state restructuring.`
      );
    }

    // Log what changed (only in verbose mode)
    if (globalConfig.verboseLogging && props && lastProps.current) {
      const changedProps = Object.keys(props).filter(
        key => props[key] !== lastProps.current?.[key]
      );
      if (changedProps.length > 0) {
        console.log(`[PERF] ${componentName} re-rendered. Changed props:`, changedProps);
      }
    }

    lastProps.current = props;
  });

  return renderCount.current;
}

/**
 * Measure render time and warn about slow renders
 *
 * @param componentName - Name of the component being monitored
 *
 * @example
 * function ExpensiveComponent() {
 *   const measureRender = useRenderTime('ExpensiveComponent');
 *   // ... expensive render logic
 *   measureRender(); // Call at end of render
 * }
 */
export function useRenderTime(componentName: string): () => void {
  const startTime = useRef(performance.now());

  // Reset start time on each render
  startTime.current = performance.now();

  return () => {
    if (!IS_DEV) return;

    const endTime = performance.now();
    const renderTime = endTime - startTime.current;
    const lastTime = lastRenderTimes.get(componentName);

    lastRenderTimes.set(componentName, renderTime);

    if (renderTime > globalConfig.slowRenderThreshold) {
      console.warn(
        `[PERF] Slow render: ${componentName} took ${renderTime.toFixed(2)}ms` +
          (lastTime ? ` (previous: ${lastTime.toFixed(2)}ms)` : '')
      );
    } else if (globalConfig.verboseLogging) {
      console.log(`[PERF] ${componentName} rendered in ${renderTime.toFixed(2)}ms`);
    }
  };
}

/**
 * Track which props or state values caused a re-render
 *
 * @param componentName - Name of the component
 * @param values - Object containing values to track
 *
 * @example
 * function MyComponent({ user, settings }) {
 *   useWhyDidYouRender('MyComponent', { user, settings });
 *   // Will log which of user/settings changed when component re-renders
 * }
 */
export function useWhyDidYouRender(
  componentName: string,
  values: Record<string, any>
): void {
  const previousValues = useRef<Record<string, any> | undefined>(undefined);

  useEffect(() => {
    if (!IS_DEV || !globalConfig.verboseLogging) return;

    if (previousValues.current) {
      const changed: string[] = [];
      const keys = new Set([
        ...Object.keys(previousValues.current),
        ...Object.keys(values),
      ]);

      keys.forEach(key => {
        const prev = previousValues.current?.[key];
        const curr = values[key];

        if (prev !== curr) {
          // Check if it's a shallow object equality issue
          if (
            typeof prev === 'object' &&
            typeof curr === 'object' &&
            JSON.stringify(prev) === JSON.stringify(curr)
          ) {
            changed.push(`${key} (same content, different reference)`);
          } else {
            changed.push(key);
          }
        }
      });

      if (changed.length > 0) {
        console.log(`[PERF] ${componentName} re-rendered because:`, changed);
      }
    }

    previousValues.current = values;
  });
}

/**
 * Profile a specific operation and log timing
 *
 * @param operationName - Name of the operation
 * @returns Function to execute with profiling
 *
 * @example
 * const profileCalc = useProfiledOperation('calculateRetirement');
 * const result = profileCalc(() => expensiveCalculation(inputs));
 */
export function useProfiledOperation(operationName: string) {
  return useMemo(
    () =>
      <T>(operation: () => T): T => {
        if (!IS_DEV) return operation();

        const start = performance.now();
        const result = operation();
        const duration = performance.now() - start;

        if (duration > globalConfig.slowRenderThreshold) {
          console.warn(
            `[PERF] Slow operation: ${operationName} took ${duration.toFixed(2)}ms`
          );
        } else if (globalConfig.verboseLogging) {
          console.log(`[PERF] ${operationName} completed in ${duration.toFixed(2)}ms`);
        }

        return result;
      },
    [operationName]
  );
}

/**
 * Get a summary of all render counts (for debugging)
 */
export function getPerformanceSummary(): Record<string, number> {
  if (!IS_DEV) return {};

  const summary: Record<string, number> = {};
  renderCounters.forEach((count, name) => {
    summary[name] = count;
  });
  return summary;
}

/**
 * Reset all performance counters (useful between tests)
 */
export function resetPerformanceCounters(): void {
  renderCounters.clear();
  lastRenderTimes.clear();
}

/**
 * Log top re-rendering components
 * Call this from console: window.__logPerfHotspots?.()
 */
if (IS_DEV && typeof window !== 'undefined') {
  (window as any).__logPerfHotspots = () => {
    const sorted = Array.from(renderCounters.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    console.group('[PERF] Top 10 Most Re-rendered Components');
    sorted.forEach(([name, count], i) => {
      console.log(`${i + 1}. ${name}: ${count} renders`);
    });
    console.groupEnd();
  };

  (window as any).__resetPerfCounters = resetPerformanceCounters;
}

/**
 * React DevTools Profiler integration helper
 * Wraps the onRender callback for the React Profiler component
 *
 * @example
 * <Profiler id="MyComponent" onRender={createProfilerCallback('MyComponent')}>
 *   <MyComponent />
 * </Profiler>
 */
export function createProfilerCallback(componentName: string) {
  return (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number
  ) => {
    if (!IS_DEV) return;

    if (actualDuration > globalConfig.slowRenderThreshold) {
      console.warn(
        `[PERF] ${componentName} ${phase}: ${actualDuration.toFixed(2)}ms actual, ` +
          `${baseDuration.toFixed(2)}ms base`
      );
    } else if (globalConfig.verboseLogging) {
      console.log(
        `[PERF] ${componentName} ${phase}: ${actualDuration.toFixed(2)}ms`
      );
    }
  };
}
