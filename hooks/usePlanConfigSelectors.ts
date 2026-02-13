/**
 * Optimized selectors for PlanConfig context
 *
 * These hooks use useMemo to minimize re-renders by only subscribing
 * to specific portions of the PlanConfig state that components need.
 *
 * PERFORMANCE OPTIMIZATION:
 * - Instead of consuming the entire PlanConfig context, components can use
 *   these focused selectors to only re-render when relevant values change.
 * - All selectors are memoized to prevent unnecessary reference changes.
 */

import { useMemo, useCallback } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import type { PlanConfig } from '@/types/plan-config';

/**
 * Selector for personal/demographic information
 * Use this when a component only needs age, marital status, retirement age
 */
export function usePersonalInfo() {
  const { config, updateConfig } = usePlanConfig();

  const personalInfo = useMemo(
    () => ({
      marital: config.marital ?? 'single',
      age1: config.age1 ?? 35,
      age2: config.age2 ?? 33,
      retAge: config.retAge ?? 65,
      numChildren: config.numChildren ?? 0,
      childrenAges: config.childrenAges ?? [],
    }),
    [config.marital, config.age1, config.age2, config.retAge, config.numChildren, config.childrenAges]
  );

  const setters = useMemo(
    () => ({
      setMarital: (value: 'single' | 'married') => updateConfig({ marital: value }, 'user-entered'),
      setAge1: (value: number) => updateConfig({ age1: value }, 'user-entered'),
      setAge2: (value: number) => updateConfig({ age2: value }, 'user-entered'),
      setRetAge: (value: number) => updateConfig({ retAge: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...personalInfo, ...setters };
}

/**
 * Selector for employment and income information
 */
export function useIncomeInfo() {
  const { config, updateConfig } = usePlanConfig();

  const incomeInfo = useMemo(
    () => ({
      employmentType1: config.employmentType1 ?? 'w2',
      employmentType2: config.employmentType2,
      annualIncome1: config.annualIncome1 ?? 100000,
      annualIncome2: config.annualIncome2 ?? 0,
    }),
    [config.employmentType1, config.employmentType2, config.annualIncome1, config.annualIncome2]
  );

  const setters = useMemo(
    () => ({
      setEmploymentType1: (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other') =>
        updateConfig({ employmentType1: value }, 'user-entered'),
      setEmploymentType2: (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other' | undefined) =>
        updateConfig({ employmentType2: value }, 'user-entered'),
      setAnnualIncome1: (value: number) => updateConfig({ annualIncome1: value }, 'user-entered'),
      setAnnualIncome2: (value: number) => updateConfig({ annualIncome2: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...incomeInfo, ...setters };
}

/**
 * Selector for account balances
 */
export function useAccountBalances() {
  const { config, updateConfig } = usePlanConfig();

  const balances = useMemo(
    () => ({
      emergencyFund: config.emergencyFund ?? 20000,
      sTax: config.sTax ?? 50000,
      sPre: config.sPre ?? 150000,
      sPost: config.sPost ?? 25000,
      // Derived value - total balance
      totalBalance: (config.sTax ?? 50000) + (config.sPre ?? 150000) + (config.sPost ?? 25000),
    }),
    [config.emergencyFund, config.sTax, config.sPre, config.sPost]
  );

  const setters = useMemo(
    () => ({
      setEmergencyFund: (value: number) => updateConfig({ emergencyFund: value }, 'user-entered'),
      setSTax: (value: number) => updateConfig({ sTax: value }, 'user-entered'),
      setSPre: (value: number) => updateConfig({ sPre: value }, 'user-entered'),
      setSPost: (value: number) => updateConfig({ sPost: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...balances, ...setters };
}

/**
 * Selector for contribution amounts
 */
export function useContributions() {
  const { config, updateConfig } = usePlanConfig();

  const contributions = useMemo(
    () => ({
      cTax1: config.cTax1 ?? 12000,
      cPre1: config.cPre1 ?? 23000,
      cPost1: config.cPost1 ?? 7000,
      cMatch1: config.cMatch1 ?? 0,
      cTax2: config.cTax2 ?? 8000,
      cPre2: config.cPre2 ?? 23000,
      cPost2: config.cPost2 ?? 7000,
      cMatch2: config.cMatch2 ?? 0,
      // Derived values
      totalPerson1:
        (config.cTax1 ?? 12000) + (config.cPre1 ?? 23000) + (config.cPost1 ?? 7000) + (config.cMatch1 ?? 0),
      totalPerson2:
        (config.cTax2 ?? 8000) + (config.cPre2 ?? 23000) + (config.cPost2 ?? 7000) + (config.cMatch2 ?? 0),
      grandTotal:
        (config.cTax1 ?? 12000) +
        (config.cPre1 ?? 23000) +
        (config.cPost1 ?? 7000) +
        (config.cMatch1 ?? 0) +
        (config.cTax2 ?? 8000) +
        (config.cPre2 ?? 23000) +
        (config.cPost2 ?? 7000) +
        (config.cMatch2 ?? 0),
    }),
    [
      config.cTax1,
      config.cPre1,
      config.cPost1,
      config.cMatch1,
      config.cTax2,
      config.cPre2,
      config.cPost2,
      config.cMatch2,
    ]
  );

  const setters = useMemo(
    () => ({
      setCTax1: (value: number) => updateConfig({ cTax1: value }, 'user-entered'),
      setCPre1: (value: number) => updateConfig({ cPre1: value }, 'user-entered'),
      setCPost1: (value: number) => updateConfig({ cPost1: value }, 'user-entered'),
      setCMatch1: (value: number) => updateConfig({ cMatch1: value }, 'user-entered'),
      setCTax2: (value: number) => updateConfig({ cTax2: value }, 'user-entered'),
      setCPre2: (value: number) => updateConfig({ cPre2: value }, 'user-entered'),
      setCPost2: (value: number) => updateConfig({ cPost2: value }, 'user-entered'),
      setCMatch2: (value: number) => updateConfig({ cMatch2: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...contributions, ...setters };
}

/**
 * Selector for rate assumptions
 */
export function useRateAssumptions() {
  const { config, updateConfig } = usePlanConfig();

  const rates = useMemo(
    () => ({
      retRate: config.retRate ?? 9.8,
      infRate: config.infRate ?? 2.6,
      stateRate: config.stateRate ?? 0,
      incContrib: config.incContrib ?? false,
      incRate: config.incRate ?? 4.5,
      wdRate: config.wdRate ?? 3.5,
      dividendYield: config.dividendYield ?? 2.0,
      // Derived: real return rate
      realReturnRate: (config.retRate ?? 9.8) - (config.infRate ?? 2.6),
    }),
    [
      config.retRate,
      config.infRate,
      config.stateRate,
      config.incContrib,
      config.incRate,
      config.wdRate,
      config.dividendYield,
    ]
  );

  const setters = useMemo(
    () => ({
      setRetRate: (value: number) => updateConfig({ retRate: value }, 'user-entered'),
      setInfRate: (value: number) => updateConfig({ infRate: value }, 'user-entered'),
      setStateRate: (value: number) => updateConfig({ stateRate: value }, 'user-entered'),
      setIncContrib: (value: boolean) => updateConfig({ incContrib: value }, 'user-entered'),
      setIncRate: (value: number) => updateConfig({ incRate: value }, 'user-entered'),
      setWdRate: (value: number) => updateConfig({ wdRate: value }, 'user-entered'),
      setDividendYield: (value: number) => updateConfig({ dividendYield: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...rates, ...setters };
}

/**
 * Selector for Social Security settings
 */
export function useSocialSecuritySettings() {
  const { config, updateConfig } = usePlanConfig();

  const ssSettings = useMemo(
    () => ({
      includeSS: config.includeSS ?? true,
      ssIncome: config.ssIncome ?? 75000,
      ssClaimAge: config.ssClaimAge ?? 67,
      ssIncome2: config.ssIncome2 ?? 75000,
      ssClaimAge2: config.ssClaimAge2 ?? 67,
    }),
    [config.includeSS, config.ssIncome, config.ssClaimAge, config.ssIncome2, config.ssClaimAge2]
  );

  const setters = useMemo(
    () => ({
      setIncludeSS: (value: boolean) => updateConfig({ includeSS: value }, 'user-entered'),
      setSSIncome: (value: number) => updateConfig({ ssIncome: value }, 'user-entered'),
      setSSClaimAge: (value: number) => updateConfig({ ssClaimAge: value }, 'user-entered'),
      setSSIncome2: (value: number) => updateConfig({ ssIncome2: value }, 'user-entered'),
      setSSClaimAge2: (value: number) => updateConfig({ ssClaimAge2: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...ssSettings, ...setters };
}

/**
 * Selector for healthcare settings
 */
export function useHealthcareSettings() {
  const { config, updateConfig } = usePlanConfig();

  const healthcareSettings = useMemo(
    () => ({
      includeMedicare: config.includeMedicare ?? true,
      medicarePremium: config.medicarePremium ?? 400,
      medicalInflation: config.medicalInflation ?? 5.0,
      irmaaThresholdSingle: config.irmaaThresholdSingle ?? 109000,
      irmaaThresholdMarried: config.irmaaThresholdMarried ?? 218000,
      irmaaSurcharge: config.irmaaSurcharge ?? 230,
      includeLTC: config.includeLTC ?? false,
      ltcAnnualCost: config.ltcAnnualCost ?? 80000,
      ltcProbability: config.ltcProbability ?? 50,
      ltcDuration: config.ltcDuration ?? 2.5,
      ltcOnsetAge: config.ltcOnsetAge ?? 82,
      ltcAgeRangeStart: config.ltcAgeRangeStart ?? 75,
      ltcAgeRangeEnd: config.ltcAgeRangeEnd ?? 90,
    }),
    [
      config.includeMedicare,
      config.medicarePremium,
      config.medicalInflation,
      config.irmaaThresholdSingle,
      config.irmaaThresholdMarried,
      config.irmaaSurcharge,
      config.includeLTC,
      config.ltcAnnualCost,
      config.ltcProbability,
      config.ltcDuration,
      config.ltcOnsetAge,
      config.ltcAgeRangeStart,
      config.ltcAgeRangeEnd,
    ]
  );

  const setters = useMemo(
    () => ({
      setIncludeMedicare: (value: boolean) => updateConfig({ includeMedicare: value }, 'user-entered'),
      setMedicarePremium: (value: number) => updateConfig({ medicarePremium: value }, 'user-entered'),
      setMedicalInflation: (value: number) => updateConfig({ medicalInflation: value }, 'user-entered'),
      setIrmaaThresholdSingle: (value: number) => updateConfig({ irmaaThresholdSingle: value }, 'user-entered'),
      setIrmaaThresholdMarried: (value: number) => updateConfig({ irmaaThresholdMarried: value }, 'user-entered'),
      setIrmaaSurcharge: (value: number) => updateConfig({ irmaaSurcharge: value }, 'user-entered'),
      setIncludeLTC: (value: boolean) => updateConfig({ includeLTC: value }, 'user-entered'),
      setLtcAnnualCost: (value: number) => updateConfig({ ltcAnnualCost: value }, 'user-entered'),
      setLtcProbability: (value: number) => updateConfig({ ltcProbability: value }, 'user-entered'),
      setLtcDuration: (value: number) => updateConfig({ ltcDuration: value }, 'user-entered'),
      setLtcOnsetAge: (value: number) => updateConfig({ ltcOnsetAge: value }, 'user-entered'),
      setLtcAgeRangeStart: (value: number) => updateConfig({ ltcAgeRangeStart: value }, 'user-entered'),
      setLtcAgeRangeEnd: (value: number) => updateConfig({ ltcAgeRangeEnd: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...healthcareSettings, ...setters };
}

/**
 * Selector for simulation settings
 */
export function useSimulationSettings() {
  const { config, updateConfig } = usePlanConfig();

  const simSettings = useMemo(
    () => ({
      retMode: config.retMode ?? 'randomWalk',
      seed: config.seed ?? 42,
      walkSeries: config.walkSeries ?? 'trulyRandom',
      historicalYear: config.historicalYear ?? null,
      inflationShockRate: config.inflationShockRate ?? 0,
      inflationShockDuration: config.inflationShockDuration ?? 5,
    }),
    [
      config.retMode,
      config.seed,
      config.walkSeries,
      config.historicalYear,
      config.inflationShockRate,
      config.inflationShockDuration,
    ]
  );

  const setters = useMemo(
    () => ({
      setRetMode: (value: 'fixed' | 'randomWalk') => updateConfig({ retMode: value }, 'user-entered'),
      setSeed: (value: number) => updateConfig({ seed: value }, 'user-entered'),
      setWalkSeries: (value: 'nominal' | 'real' | 'trulyRandom') =>
        updateConfig({ walkSeries: value }, 'user-entered'),
      setHistoricalYear: (value: number | null) =>
        updateConfig({ historicalYear: value ?? undefined }, 'user-entered'),
      setInflationShockRate: (value: number) => updateConfig({ inflationShockRate: value }, 'user-entered'),
      setInflationShockDuration: (value: number) =>
        updateConfig({ inflationShockDuration: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...simSettings, ...setters };
}

/**
 * Selector for bond glide path configuration
 */
export function useBondGlidePath() {
  const { config, updateConfig } = usePlanConfig();

  const glidePath = useMemo(
    () => ({
      allocationStrategy: config.allocationStrategy ?? 'aggressive',
      bondStartPct: config.bondStartPct ?? 10,
      bondEndPct: config.bondEndPct ?? 60,
      bondStartAge: config.bondStartAge ?? config.age1 ?? 35,
      bondEndAge: config.bondEndAge ?? 75,
      glidePathShape: config.glidePathShape ?? 'linear',
    }),
    [
      config.allocationStrategy,
      config.bondStartPct,
      config.bondEndPct,
      config.bondStartAge,
      config.bondEndAge,
      config.glidePathShape,
      config.age1,
    ]
  );

  const setters = useMemo(
    () => ({
      setAllocationStrategy: (value: 'aggressive' | 'ageBased' | 'custom') =>
        updateConfig({ allocationStrategy: value }, 'user-entered'),
      setBondStartPct: (value: number) => updateConfig({ bondStartPct: value }, 'user-entered'),
      setBondEndPct: (value: number) => updateConfig({ bondEndPct: value }, 'user-entered'),
      setBondStartAge: (value: number) => updateConfig({ bondStartAge: value }, 'user-entered'),
      setBondEndAge: (value: number) => updateConfig({ bondEndAge: value }, 'user-entered'),
      setGlidePathShape: (value: 'linear' | 'accelerated' | 'decelerated') =>
        updateConfig({ glidePathShape: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...glidePath, ...setters };
}

/**
 * Selector for generational wealth settings
 */
export function useGenerationalWealthSettings() {
  const { config, updateConfig } = usePlanConfig();

  const genSettings = useMemo(
    () => ({
      showGen: config.showGen ?? false,
      hypPerBen: config.hypPerBen ?? 30000,
      hypStartBens: config.hypStartBens ?? 2,
      additionalChildrenExpected: config.additionalChildrenExpected ?? 0,
      totalFertilityRate: config.totalFertilityRate ?? 2.1,
      generationLength: config.generationLength ?? 30,
      fertilityWindowStart: config.fertilityWindowStart ?? 20,
      fertilityWindowEnd: config.fertilityWindowEnd ?? 45,
      hypDeathAge: config.hypDeathAge ?? 90,
      hypMinDistAge: config.hypMinDistAge ?? 18,
      enableRothConversions: config.enableRothConversions ?? false,
      targetConversionBracket: config.targetConversionBracket ?? 0.24,
    }),
    [
      config.showGen,
      config.hypPerBen,
      config.hypStartBens,
      config.additionalChildrenExpected,
      config.totalFertilityRate,
      config.generationLength,
      config.fertilityWindowStart,
      config.fertilityWindowEnd,
      config.hypDeathAge,
      config.hypMinDistAge,
      config.enableRothConversions,
      config.targetConversionBracket,
    ]
  );

  const setters = useMemo(
    () => ({
      setShowGen: (value: boolean) => updateConfig({ showGen: value }, 'user-entered'),
      setHypPerBen: (value: number) => updateConfig({ hypPerBen: value }, 'user-entered'),
      setHypStartBens: (value: number) => updateConfig({ hypStartBens: value }, 'user-entered'),
      setAdditionalChildrenExpected: (value: number) =>
        updateConfig({ additionalChildrenExpected: value }, 'user-entered'),
      setTotalFertilityRate: (value: number) => updateConfig({ totalFertilityRate: value }, 'user-entered'),
      setGenerationLength: (value: number) => updateConfig({ generationLength: value }, 'user-entered'),
      setFertilityWindowStart: (value: number) => updateConfig({ fertilityWindowStart: value }, 'user-entered'),
      setFertilityWindowEnd: (value: number) => updateConfig({ fertilityWindowEnd: value }, 'user-entered'),
      setHypDeathAge: (value: number) => updateConfig({ hypDeathAge: value }, 'user-entered'),
      setHypMinDistAge: (value: number) => updateConfig({ hypMinDistAge: value }, 'user-entered'),
      setEnableRothConversions: (value: boolean) => updateConfig({ enableRothConversions: value }, 'user-entered'),
      setTargetConversionBracket: (value: number) =>
        updateConfig({ targetConversionBracket: value }, 'user-entered'),
    }),
    [updateConfig]
  );

  return { ...genSettings, ...setters };
}

/**
 * Derived state: Check if user is married
 */
export function useIsMarried(): boolean {
  const { config } = usePlanConfig();
  return useMemo(() => config.marital === 'married', [config.marital]);
}

/**
 * Derived state: Years until retirement
 */
export function useYearsToRetirement(): number {
  const { config } = usePlanConfig();
  return useMemo(() => {
    const younger = Math.min(config.age1 ?? 35, config.marital === 'married' ? (config.age2 ?? 35) : (config.age1 ?? 35));
    return Math.max(0, (config.retAge ?? 65) - younger);
  }, [config.age1, config.age2, config.retAge, config.marital]);
}

/**
 * Derived state: Total current portfolio value
 */
export function useTotalPortfolioValue(): number {
  const { config } = usePlanConfig();
  return useMemo(
    () => (config.sTax ?? 0) + (config.sPre ?? 0) + (config.sPost ?? 0),
    [config.sTax, config.sPre, config.sPost]
  );
}

/**
 * Batch update multiple config values at once
 * Use this to prevent multiple re-renders when updating related fields
 */
export function useBatchConfigUpdate() {
  const { updateConfig } = usePlanConfig();

  return useCallback(
    (updates: Partial<PlanConfig>, source: 'user-entered' | 'ai-suggested' | 'default' | 'imported' = 'user-entered') => {
      updateConfig(updates, source);
    },
    [updateConfig]
  );
}
