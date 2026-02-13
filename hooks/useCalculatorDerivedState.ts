/**
 * Calculator Derived State Hook
 *
 * This hook consolidates all computed/derived values from the calculator
 * that were previously computed via useEffect chains.
 *
 * PATTERN: Instead of useEffect(() => setState(compute(deps)), [deps])
 * USE: useMemo(() => compute(deps), [deps])
 *
 * BENEFITS:
 * - No sync bugs from effect ordering
 * - No risk of infinite loops
 * - Values are always in sync (computed synchronously)
 * - Better performance (no extra render cycles)
 * - Cleaner code (declarative over imperative)
 */

import { useMemo, useCallback } from 'react';
import type { PlanConfig } from '@/types/plan-config';
import type { CalculationResult, ChartDataPoint, BondGlidePath } from '@/types/calculator';
import { getNetWorthBracket } from '@/lib/constants';
import { fmt } from '@/lib/utils';

/**
 * Derived state for children/beneficiary configuration
 *
 * This replaces the useEffect cascade that was syncing:
 * - numChildren -> numberOfChildren
 * - childrenAges -> childrenCurrentAges string
 * - Both -> numberOfBeneficiaries
 *
 * The infinite loop bug with lastSyncedChildrenRef was caused by
 * this circular dependency being managed via effects.
 */
export function useChildrenDerivedState(planConfig: PlanConfig) {
  return useMemo(() => {
    const wasExplicitlySet =
      planConfig.fieldMetadata?.numChildren || planConfig.fieldMetadata?.childrenAges;
    const numChildrenFromConfig = planConfig.numChildren ?? 0;
    const childAgesFromConfig = planConfig.childrenAges ?? [];

    // Not explicitly set - use legacy defaults for planning
    if (!wasExplicitlySet) {
      return {
        childrenCurrentAges: '5, 3',
        numberOfChildren: 2,
        numberOfBeneficiaries: planConfig.numberOfBeneficiaries ?? 2,
        hasExplicitChildrenData: false,
      };
    }

    // User explicitly said 0 children
    if (numChildrenFromConfig === 0 && childAgesFromConfig.length === 0) {
      return {
        childrenCurrentAges: '',
        numberOfChildren: 0,
        numberOfBeneficiaries: 0,
        hasExplicitChildrenData: true,
      };
    }

    // Use actual children ages from wizard
    if (childAgesFromConfig.length > 0) {
      return {
        childrenCurrentAges: childAgesFromConfig.join(', '),
        numberOfChildren: childAgesFromConfig.length,
        numberOfBeneficiaries: childAgesFromConfig.length,
        hasExplicitChildrenData: true,
      };
    }

    // User specified number but no ages
    if (numChildrenFromConfig > 0) {
      return {
        childrenCurrentAges: '5, 3',
        numberOfChildren: numChildrenFromConfig,
        numberOfBeneficiaries: numChildrenFromConfig,
        hasExplicitChildrenData: true,
      };
    }

    // Fallback
    return {
      childrenCurrentAges: '5, 3',
      numberOfChildren: 2,
      numberOfBeneficiaries: planConfig.numberOfBeneficiaries ?? 2,
      hasExplicitChildrenData: false,
    };
  }, [
    planConfig.fieldMetadata?.numChildren,
    planConfig.fieldMetadata?.childrenAges,
    planConfig.numChildren,
    planConfig.childrenAges,
    planConfig.numberOfBeneficiaries,
  ]);
}

/**
 * Derived state for bond glide path configuration
 *
 * Replaces the pattern where bondStartAge was synced to age1 via useEffect.
 * Now bondStartAge defaults to age1 if not explicitly set.
 */
export function useBondGlidePathDerived(planConfig: PlanConfig): BondGlidePath | null {
  return useMemo(() => {
    const allocationStrategy = planConfig.allocationStrategy ?? 'aggressive';

    // 100% stocks, no bonds
    if (allocationStrategy === 'aggressive') {
      return null;
    }

    // bondStartAge defaults to age1 if not explicitly set
    const bondStartAge = planConfig.bondStartAge ?? planConfig.age1 ?? 35;

    return {
      strategy: allocationStrategy,
      startAge: bondStartAge,
      endAge: planConfig.bondEndAge ?? 75,
      startPct: planConfig.bondStartPct ?? 10,
      endPct: planConfig.bondEndPct ?? 60,
      shape: planConfig.glidePathShape ?? 'linear',
    };
  }, [
    planConfig.allocationStrategy,
    planConfig.bondStartAge,
    planConfig.bondEndAge,
    planConfig.bondStartPct,
    planConfig.bondEndPct,
    planConfig.glidePathShape,
    planConfig.age1,
  ]);
}

/**
 * Derived state for beneficiary ages at time of death
 *
 * Computes the ages beneficiaries will be when the primary account holder dies.
 * This was previously a useMemo but depended on local state that was synced via effects.
 */
export function useBeneficiaryAgesDerived(
  planConfig: PlanConfig,
  childrenCurrentAges: string,
  additionalChildrenExpected: number
): string {
  return useMemo(() => {
    const age1 = planConfig.age1 ?? 35;
    const age2 = planConfig.age2 ?? 33;
    const hypDeathAge = planConfig.hypDeathAge ?? 90;

    const olderAge = Math.max(age1, age2);
    const yearsUntilDeath = hypDeathAge - olderAge;

    // Parse current children ages from comma-separated string
    const currentAges = childrenCurrentAges
      .split(',')
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n >= 0);

    // Calculate current children at time of death
    const currentChildrenAtDeath = currentAges.map((age) => age + yearsUntilDeath);

    // Calculate additional children (assume 2-year birth intervals)
    const additionalChildrenAtDeath: number[] = [];
    for (let i = 0; i < additionalChildrenExpected; i++) {
      const birthYear = (i + 1) * 2; // Born in 2, 4, 6 years, etc.
      const ageAtDeath = yearsUntilDeath - birthYear;
      if (ageAtDeath > 0 && ageAtDeath < hypDeathAge) {
        additionalChildrenAtDeath.push(ageAtDeath);
      }
    }

    // Combine all children ages at death
    const allChildrenAges = [...currentChildrenAtDeath, ...additionalChildrenAtDeath].filter(
      (age) => age > 0 && age < hypDeathAge
    );

    return allChildrenAges.length > 0 ? allChildrenAges.join(', ') : '';
  }, [
    childrenCurrentAges,
    additionalChildrenExpected,
    planConfig.hypDeathAge,
    planConfig.age1,
    planConfig.age2,
  ]);
}

/**
 * Derived state for formatted calculation results
 *
 * Consolidates the formatting logic that was spread across multiple useMemo calls.
 */
export function useFormattedResults(result: CalculationResult | null) {
  return useMemo(() => {
    if (!result) return null;

    return {
      finNom: fmt(result.finNom),
      finReal: fmt(result.finReal),
      wd: fmt(result.wd),
      wdAfter: fmt(result.wdAfter),
      wdReal: fmt(result.wdReal),
      eol: fmt(result.eol),
      eolReal: fmt(result.eolReal),
      estateTax: fmt(result.estateTax),
      netEstate: fmt(result.netEstate),
      totalRMDs: fmt(result.totalRMDs),
      tax: {
        fedOrd: fmt(result.tax.fedOrd),
        fedCap: fmt(result.tax.fedCap),
        niit: fmt(result.tax.niit),
        state: fmt(result.tax.state),
        tot: fmt(result.tax.tot),
      },
    };
  }, [result]);
}

/**
 * Derived state for chart data split by phase
 */
export function useChartDataSplit(result: CalculationResult | null) {
  return useMemo(() => {
    if (!result?.data || result.data.length === 0) return null;

    return {
      accumulation: result.data.slice(0, result.yrsToRet + 1),
      drawdown: result.data.slice(result.yrsToRet),
      full: result.data,
    };
  }, [result?.data, result?.yrsToRet]);
}

/**
 * Derived state for net worth comparison
 */
export function useNetWorthComparison(
  result: CalculationResult | null,
  age1: number
) {
  return useMemo(() => {
    if (!result || !age1) return null;

    const bracket = getNetWorthBracket(age1);
    const multiple = result.finReal / bracket.median;

    return {
      bracket,
      percentile: result.finReal > bracket.median ? 'above' : 'below',
      multiple: multiple.toFixed(1),
      difference: fmt(Math.abs(result.finReal - bracket.median)),
    };
  }, [result?.finReal, age1]);
}

/**
 * Derived state for marital status check
 */
export function useIsMarried(planConfig: PlanConfig): boolean {
  return useMemo(() => planConfig.marital === 'married', [planConfig.marital]);
}

/**
 * Derived state for total portfolio balance
 */
export function useTotalBalance(planConfig: PlanConfig): number {
  return useMemo(
    () =>
      (planConfig.taxableBalance ?? 0) +
      (planConfig.pretaxBalance ?? 0) +
      (planConfig.rothBalance ?? 0),
    [planConfig.taxableBalance, planConfig.pretaxBalance, planConfig.rothBalance]
  );
}

/**
 * Master hook that combines all derived state for the calculator
 *
 * Use this in page.tsx to replace scattered useMemo/useEffect patterns
 */
export function useCalculatorDerivedState(
  planConfig: PlanConfig,
  result: CalculationResult | null
) {
  const childrenState = useChildrenDerivedState(planConfig);
  const bondGlidePath = useBondGlidePathDerived(planConfig);
  const beneficiaryAges = useBeneficiaryAgesDerived(
    planConfig,
    childrenState.childrenCurrentAges,
    planConfig.additionalChildrenExpected ?? 0
  );
  const formattedResults = useFormattedResults(result);
  const chartData = useChartDataSplit(result);
  const netWorthComparison = useNetWorthComparison(result, planConfig.age1 ?? 35);
  const isMarried = useIsMarried(planConfig);
  const totalBalance = useTotalBalance(planConfig);

  return {
    // Children/beneficiary derived state
    childrenCurrentAges: childrenState.childrenCurrentAges,
    numberOfChildren: childrenState.numberOfChildren,
    numberOfBeneficiaries: childrenState.numberOfBeneficiaries,
    hasExplicitChildrenData: childrenState.hasExplicitChildrenData,

    // Bond allocation
    bondGlidePath,

    // Beneficiary ages at death
    hypBenAgesStr: beneficiaryAges,

    // Formatted results
    formattedResults,

    // Chart data
    chartData,

    // Net worth comparison
    netWorthComparison,

    // Common derived values
    isMarried,
    totalBalance,
  };
}
