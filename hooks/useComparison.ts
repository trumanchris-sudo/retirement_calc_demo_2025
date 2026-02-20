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
import { runSingleSimulation } from '@/lib/calculations/retirementEngine';
import { BEAR_MARKET_SCENARIOS } from '@/lib/simulation/bearMarkets';
import { INFLATION_SHOCK_SCENARIOS } from '@/lib/simulation/inflationShocks';
import type { CalculationResult, ComparisonData, ChartDataPoint } from '@/types/calculator';
import type { FilingStatus } from '@/lib/calculations/taxCalculations';
import type { ReturnMode, WalkSeries } from '@/lib/calculations/shared/returnGenerator';

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

  // Plan config values needed for simulation
  marital: FilingStatus;
  age1: number;
  age2: number;
  retirementAge: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  inflationRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  returnMode: ReturnMode;
  randomWalkSeries: WalkSeries;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;

  // Simulation seed & marital helper
  seed: number;
  isMar: boolean;
}

export interface UseComparisonReturn {
  runComparison: (overrides?: ComparisonOverrides) => Promise<void>;
  runRandomComparison: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useComparison(params: UseComparisonParams): UseComparisonReturn {
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
    marital,
    age1,
    age2,
    retirementAge,
    taxableBalance,
    pretaxBalance,
    rothBalance,
    cTax1, cPre1, cPost1, cMatch1,
    cTax2, cPre2, cPost2, cMatch2,
    retRate,
    inflationRate,
    stateRate,
    incContrib,
    incRate,
    wdRate,
    returnMode,
    randomWalkSeries,
    includeSS,
    ssIncome,
    ssClaimAge,
    ssIncome2,
    ssClaimAge2,
    seed,
    isMar,
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
      // Prepare baseline inputs
      const baseInputs = {
        marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
        cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
        retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
        returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        historicalYear: undefined,
        inflationShockRate: null,
        inflationShockDuration: 5,
      };

      // Calculate baseline
      const baselineResult = runSingleSimulation(baseInputs, seed);

      // Calculate bear market scenario if specified
      let bearData: number[] | null = null;
      if (effectiveHistoricalYear) {
        const bearInputs = { ...baseInputs, historicalYear: effectiveHistoricalYear, returnMode: 'randomWalk' as ReturnMode };
        const bearResult = runSingleSimulation(bearInputs, seed);
        bearData = bearResult.balancesReal;
      }

      // Calculate inflation shock scenario if specified
      let inflationData: number[] | null = null;
      if (effectiveInflationRate > 0) {
        const inflationInputs = {
          ...baseInputs,
          inflationShockRate: effectiveInflationRate,
          inflationShockDuration: effectiveInflationDuration,
        };
        const inflationResult = runSingleSimulation(inflationInputs, seed);
        inflationData = inflationResult.balancesReal;
      }

      // Merge comparison data onto existing res.data structure.
      // This preserves bal, real, p10, p90 while adding baseline, bearMarket, inflation.
      const mergedData: ChartDataPoint[] = res.data.map((row, i) => ({
        ...row,
        baseline: baselineResult.balancesReal[i],
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
    res, setComparisonMode, age1, age2, retirementAge, marital, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear, inflationShockRate, inflationShockDuration, seed, isMar,
    setErr, setComparisonData,
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
