# State Management Architecture

This document describes the optimized state management patterns for the retirement calculator.

## Core Principles

### 1. Single Source of Truth (SSOT)
All retirement plan configuration data flows through `PlanConfigContext`. This includes:
- Personal/demographic info (age, marital status)
- Employment and income data
- Account balances (taxable, pre-tax, Roth)
- Contribution amounts
- Rate assumptions
- Social Security settings
- Healthcare settings
- Simulation parameters

**Anti-pattern to avoid:**
```tsx
// BAD: Duplicating context state in local state
const [localAge, setLocalAge] = useState(planConfig.age1);
```

**Correct pattern:**
```tsx
// GOOD: Read directly from context
const { age1 } = usePersonalInfo();
```

### 2. Derived State Should Be Computed, Not Stored
State that can be calculated from other state should use `useMemo`, not `useState`.

**Anti-pattern:**
```tsx
// BAD: Storing derived state
const [totalBalance, setTotalBalance] = useState(sTax + sPre + sPost);
useEffect(() => setTotalBalance(sTax + sPre + sPost), [sTax, sPre, sPost]);
```

**Correct pattern:**
```tsx
// GOOD: Compute derived state
const totalBalance = useMemo(() => sTax + sPre + sPost, [sTax, sPre, sPost]);
```

### 3. Minimize Re-render Scope
Use focused selectors instead of consuming the entire context:

**Anti-pattern:**
```tsx
// BAD: Component re-renders on ANY config change
const { config } = usePlanConfig();
const age1 = config.age1;
```

**Correct pattern:**
```tsx
// GOOD: Only re-renders when personal info changes
const { age1 } = usePersonalInfo();
```

## Hook Organization

### Context Providers
- `PlanConfigProvider` - Retirement plan configuration (lib/plan-config-context.tsx)
- `BudgetProvider` - Budget context for income page (lib/budget-context.tsx)

### Optimized Selectors (hooks/usePlanConfigSelectors.ts)
Focused hooks that only subscribe to relevant portions of state:

| Hook | Purpose |
|------|---------|
| `usePersonalInfo()` | Age, marital status, retirement age |
| `useIncomeInfo()` | Employment type, annual income |
| `useAccountBalances()` | sTax, sPre, sPost, emergencyFund |
| `useContributions()` | All contribution amounts |
| `useRateAssumptions()` | Return, inflation, withdrawal rates |
| `useSocialSecuritySettings()` | SS income and claim ages |
| `useHealthcareSettings()` | Medicare, LTC settings |
| `useSimulationSettings()` | Monte Carlo parameters |
| `useBondGlidePath()` | Asset allocation settings |
| `useGenerationalWealthSettings()` | Legacy planning settings |

### Derived State Hooks
| Hook | Returns |
|------|---------|
| `useIsMarried()` | `boolean` - Whether marital status is 'married' |
| `useYearsToRetirement()` | `number` - Years until retirement |
| `useTotalPortfolioValue()` | `number` - Sum of all account balances |

### Results State (hooks/useCalculatorResults.ts)
| Hook | Purpose |
|------|---------|
| `useCalculatorResults()` | Main calculation results and state |
| `useSavedScenarios()` | Scenario comparison features |
| `useAIInsightState()` | AI analysis state and caching |
| `useUIToggles()` | UI visibility toggles |

### Utility Hooks (hooks/useDebounce.ts)
| Hook | Purpose |
|------|---------|
| `useDebounce(value, delay)` | Debounce a value |
| `useDebounceCallback(fn, delay)` | Debounce a callback |
| `useThrottleCallback(fn, interval)` | Throttle a callback |
| `useDebouncedState(initial, delay)` | State with debounced updates |

### Performance Monitoring (hooks/usePerformanceMonitor.ts)
Development-only hooks for profiling:

| Hook | Purpose |
|------|---------|
| `useRenderCount(name, props)` | Track component render count |
| `useRenderTime(name)` | Measure render duration |
| `useWhyDidYouRender(name, values)` | Log what caused re-render |
| `useProfiledOperation(name)` | Profile expensive operations |

Access performance data in console:
```js
window.__logPerfHotspots()  // Top 10 re-rendering components
window.__resetPerfCounters() // Reset all counters
```

## LocalStorage Patterns

### Debounced Writes
Context auto-saves are debounced (500ms) to prevent excessive writes:
```tsx
// In PlanConfigProvider - writes are batched
const STORAGE_DEBOUNCE_MS = 500;
```

### Session Storage for Navigation
Calculator results are saved to sessionStorage for navigation persistence:
```tsx
sessionStorage.setItem('calculatorResults', JSON.stringify(res));
```

## Performance Optimizations

### 1. Memoized Context Value
The context value object is memoized to prevent re-renders:
```tsx
const value = useMemo(() => ({
  config,
  updateConfig,
  // ...
}), [config, updateConfig, /* deps */]);
```

### 2. Quick Hash for Dirty Checking
Uses fast hash function instead of JSON.stringify comparison:
```tsx
function quickHash(obj: object): number {
  // Returns 32-bit hash for fast comparison
}
```

### 3. Stable Callback References
All update functions use `useCallback` to maintain stable references:
```tsx
const updateConfig = useCallback((updates, source) => {
  // ...
}, []); // No dependencies = stable reference
```

## Migration Guide

### Migrating Component to Use Optimized Hooks

Before:
```tsx
function OldComponent() {
  const { config, updateConfig } = usePlanConfig();
  const age1 = config.age1 ?? 35;
  const setAge1 = (v) => updateConfig({ age1: v }, 'user-entered');
  // Re-renders on ANY config change
}
```

After:
```tsx
function NewComponent() {
  const { age1, setAge1 } = usePersonalInfo();
  // Only re-renders when personal info changes
}
```

### Adding Performance Monitoring

```tsx
function MyComponent(props) {
  // Add render counting (dev only)
  useRenderCount('MyComponent', props);

  // Add render timing
  const measureRender = useRenderTime('MyComponent');

  // ... component logic

  measureRender(); // Call at end of render
}
```

## Dead Code to Remove

The following state variables in page.tsx are candidates for removal:

1. **Loader state (disabled):**
   - `loaderComplete`, `loaderHandoff`, `cubeAppended` - All hardcoded to `true`

2. **Legacy backward-compat state:**
   - `hypBirthMultiple`, `hypBirthInterval` - Only used in presets
   - `numberOfChildren`, `parentAgeAtFirstChild`, `childSpacingYears` - Partially replaced by context

3. **Potentially consolidatable:**
   - Many UI toggle states could use `useUIToggles()` hook

## Best Practices

1. **New components** should use the focused selector hooks
2. **Expensive calculations** should be memoized with `useMemo`
3. **Input handlers** that trigger calculations should be debounced
4. **Test with performance monitoring** enabled to identify hot spots
5. **Batch updates** when changing multiple related fields
