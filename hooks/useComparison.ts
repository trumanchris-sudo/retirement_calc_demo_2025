/**
 * useComparison Hook
 *
 * Extracted from page.tsx — manages scenario comparison logic.
 * Runs baseline vs bear-market and inflation-shock simulations and merges
 * the resulting data onto the existing chart data for overlay display.
 *
 * Exposes: runComparison, runRandomComparison
 */

import { useCallback } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import { BEAR_MARKET_SCENARIOS, getBearReturns } from '@/lib/simulation/bearMarkets';
import { INFLATION_SHOCK_SCENARIOS } from '@/lib/simulation/inflationShocks';
import type { CalculationResult, ComparisonData, ChartDataPoint } from '@/types/calculator';
import { createDefaultPlanConfig } from '@/types/plan-config';

const DEFAULTS = createDefaultPlanConfig();

function applyBearMarketOverlay(
  baseline: ChartDataPoint[],
  yrsToRet: number,
  historicalYear: number | null,
  nominalReturnRate: number,
  inflationRate: number
): Array<number | undefined> | null {
  if (!historicalYear) return null;

  const returns = getBearReturns(historicalYear);
  const baselineRealReturn = ((1 + nominalReturnRate / 100) / (1 + inflationRate / 100)) - 1;
  let stressFactor = 1;

  return baseline.map((row, index) => {
    if (index < yrsToRet) return undefined;

    const shockIndex = index - yrsToRet;
    if (shockIndex < returns.length) {
      const stressedRealReturn = ((1 + returns[shockIndex]) / (1 + inflationRate / 100)) - 1;
      stressFactor *= (1 + stressedRealReturn) / Math.max(0.01, 1 + baselineRealReturn);
    }

    return Math.max(0, row.real * stressFactor);
  });
}

function applyInflationOverlay(
  baseline: ChartDataPoint[],
  yrsToRet: number,
  shockRate: number,
  shockDuration: number,
  baseInflationRate: number
): Array<number | undefined> | null {
  if (shockRate <= 0 || shockDuration <= 0) return null;

  let purchasingPowerFactor = 1;

  return baseline.map((row, index) => {
    if (index < yrsToRet) return undefined;

    const shockIndex = index - yrsToRet;
    if (shockIndex < shockDuration) {
      purchasingPowerFactor *= (1 + baseInflationRate / 100) / (1 + shockRate / 100);
    }

    return Math.max(0, row.real * purchasingPowerFactor);
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Values that can be overridden when calling runComparison directly */
export interface ComparisonOverrides {
  historicalYear?: number | null;
  inflationShockRate?: number;
  inflationShockDuration?: number;
}

/** All inputs the hook needs from the calling component */
export interface UseComparisonParams {
  // Comparison state
  comparisonMode: boolean;
  setComparisonMode: (mode: boolean) => void;
  res: CalculationResult | null;

  // Error handler
  setErr: (error: string | null) => void;
  setComparisonData: (data: ComparisonData) => void;

  // Scenario state & setters (for runRandomComparison)
  historicalYear: number | null;
  inflationShockRate: number;
  inflationShockDuration: number;
  setHistoricalYear: (value: number | null) => void;
  setInflationShockRate: (value: number) => void;
  setInflationShockDuration: (value: number) => void;

}

export interface UseComparisonReturn {
  runComparison: (overrides?: ComparisonOverrides) => Promise<void>;
  runRandomComparison: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useComparison(params: UseComparisonParams): UseComparisonReturn {
  const { config: planConfig } = usePlanConfig();

  const {
    comparisonMode,
    setComparisonMode,
    res,
    setErr,
    setComparisonData,
    historicalYear,
    inflationShockRate,
    inflationShockDuration,
    setHistoricalYear,
    setInflationShockRate,
    setInflationShockDuration,
  } = params;

  /**
   * Run comparison between baseline and selected scenarios.
   * Merges comparison data onto existing res.data to preserve bal, real, p10, p90 keys.
   * Accepts optional overrides for scenario values to avoid stale closure issues.
   */
  const runComparison = useCallback(async (overrides?: ComparisonOverrides) => {
    if (!res?.data) return;

    // Ensure comparison mode is active (avoids stale closure from callers
    // who call setComparisonMode(true) in the same handler — state hasn't flushed yet)
    setComparisonMode(true);

    // Use overrides if provided, otherwise fall back to state values
    const effectiveHistoricalYear =
      overrides?.historicalYear !== undefined ? overrides.historicalYear : historicalYear;
    const effectiveInflationRate =
      overrides?.inflationShockRate !== undefined ? overrides.inflationShockRate : inflationShockRate;
    const effectiveInflationDuration =
      overrides?.inflationShockDuration !== undefined ? overrides.inflationShockDuration : inflationShockDuration;

    setErr(null);

    try {
      const yrsToRet = Math.max(0, res.yrsToRet);
      const nominalReturnRate = planConfig.retRate ?? DEFAULTS.retRate;
      const baseInflationRate = planConfig.inflationRate ?? DEFAULTS.inflationRate;

      const bearData = applyBearMarketOverlay(
        res.data,
        yrsToRet,
        effectiveHistoricalYear,
        nominalReturnRate,
        baseInflationRate
      );

      const inflationData = applyInflationOverlay(
        res.data,
        yrsToRet,
        effectiveInflationRate,
        effectiveInflationDuration,
        baseInflationRate
      );

      // Merge comparison data onto existing res.data structure.
      // This preserves bal, real, p10, p90 while adding baseline, bearMarket, inflation.
      const mergedData: ChartDataPoint[] = res.data.map((row, i) => ({
        ...row,
        baseline: row.real,
        bearMarket: bearData ? bearData[i] : undefined,
        inflation: inflationData ? inflationData[i] : undefined,
      }));

      // Update comparison state
      setComparisonData({
        baseline: {
          data: mergedData,
          visible: true,
          label: 'Baseline',
        },
        bearMarket: effectiveHistoricalYear
          ? {
              data: mergedData,
              visible: true,
              label:
                BEAR_MARKET_SCENARIOS.find((s) => s.year === effectiveHistoricalYear)?.label ||
                `${effectiveHistoricalYear} Crash`,
              year: effectiveHistoricalYear,
            }
          : null,
        inflation:
          effectiveInflationRate > 0
            ? {
                data: mergedData,
                visible: true,
                label: `${effectiveInflationRate}% Inflation (${effectiveInflationDuration}yr)`,
                rate: effectiveInflationRate,
                duration: effectiveInflationDuration,
              }
            : null,
      });
    } catch (error: unknown) {
      setErr(error instanceof Error ? error.message : 'An unknown error occurred');
    }
  }, [
    res, setComparisonMode, historicalYear, inflationShockRate, inflationShockDuration,
    setErr, setComparisonData, planConfig,
  ]);

  /**
   * Run comparison with randomly selected bear market and inflation shock scenarios.
   */
  const runRandomComparison = useCallback(() => {
    // Randomly select a bear market scenario
    const randomBearScenario =
      BEAR_MARKET_SCENARIOS[Math.floor(Math.random() * BEAR_MARKET_SCENARIOS.length)];

    // Randomly select an inflation shock scenario
    const randomInflationScenario =
      INFLATION_SHOCK_SCENARIOS[Math.floor(Math.random() * INFLATION_SHOCK_SCENARIOS.length)];

    // Set the states for UI display
    setHistoricalYear(randomBearScenario.year);
    setInflationShockRate(randomInflationScenario.rate);
    setInflationShockDuration(randomInflationScenario.duration);
    setComparisonMode(true);

    // Pass values directly to runComparison to avoid stale closure issues
    runComparison({
      historicalYear: randomBearScenario.year,
      inflationShockRate: randomInflationScenario.rate,
      inflationShockDuration: randomInflationScenario.duration,
    });
  }, [runComparison, setHistoricalYear, setInflationShockRate, setInflationShockDuration, setComparisonMode]);

  return { runComparison, runRandomComparison };
}
