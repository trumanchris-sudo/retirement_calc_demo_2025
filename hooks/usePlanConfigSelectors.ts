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
import { createDefaultPlanConfig } from '@/types/plan-config';

/**
 * Canonical defaults — all fallback values MUST come from here.
 * This prevents divergence between selectors and createDefaultPlanConfig().
 */
const DEFAULTS = createDefaultPlanConfig();

/**
 * Selector for personal/demographic information
 * Use this when a component only needs age, marital status, retirement age
 */
export function usePersonalInfo() {
  const { config, updateConfig } = usePlanConfig();

  const personalInfo = useMemo(
    () => ({
      marital: config.marital ?? DEFAULTS.marital,
      age1: config.age1 ?? DEFAULTS.age1,
      age2: config.age2 ?? DEFAULTS.age2,
      retirementAge: config.retirementAge ?? DEFAULTS.retirementAge,
      numChildren: config.numChildren ?? DEFAULTS.numChildren,
      childrenAges: config.childrenAges ?? DEFAULTS.childrenAges,
    }),
    [config.marital, config.age1, config.age2, config.retirementAge, config.numChildren, config.childrenAges]
  );

  const setters = useMemo(
    () => ({
      setMarital: (value: 'single' | 'married') => updateConfig({ marital: value }, 'user-entered'),
      setAge1: (value: number) => updateConfig({ age1: value }, 'user-entered'),
      setAge2: (value: number) => updateConfig({ age2: value }, 'user-entered'),
      setRetirementAge: (value: number) => updateConfig({ retirementAge: value }, 'user-entered'),
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
      employmentType1: config.employmentType1 ?? DEFAULTS.employmentType1,
      employmentType2: config.employmentType2,
      primaryIncome: config.primaryIncome ?? DEFAULTS.primaryIncome,
      spouseIncome: config.spouseIncome ?? DEFAULTS.spouseIncome,
    }),
    [config.employmentType1, config.employmentType2, config.primaryIncome, config.spouseIncome]
  );

  const setters = useMemo(
    () => ({
      setEmploymentType1: (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other') =>
        updateConfig({ employmentType1: value }, 'user-entered'),
      setEmploymentType2: (value: 'w2' | 'self-employed' | 'both' | 'retired' | 'other' | undefined) =>
        updateConfig({ employmentType2: value }, 'user-entered'),
      setPrimaryIncome: (value: number) => updateConfig({ primaryIncome: value }, 'user-entered'),
      setSpouseIncome: (value: number) => updateConfig({ spouseIncome: value }, 'user-entered'),
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
      emergencyFund: config.emergencyFund ?? DEFAULTS.emergencyFund,
      taxableBalance: config.taxableBalance ?? DEFAULTS.taxableBalance,
      pretaxBalance: config.pretaxBalance ?? DEFAULTS.pretaxBalance,
      rothBalance: config.rothBalance ?? DEFAULTS.rothBalance,
      // Derived value - total balance
      totalBalance: (config.taxableBalance ?? DEFAULTS.taxableBalance) + (config.pretaxBalance ?? DEFAULTS.pretaxBalance) + (config.rothBalance ?? DEFAULTS.rothBalance),
    }),
    [config.emergencyFund, config.taxableBalance, config.pretaxBalance, config.rothBalance]
  );

  const setters = useMemo(
    () => ({
      setEmergencyFund: (value: number) => updateConfig({ emergencyFund: value }, 'user-entered'),
      setTaxableBalance: (value: number) => updateConfig({ taxableBalance: value }, 'user-entered'),
      setPretaxBalance: (value: number) => updateConfig({ pretaxBalance: value }, 'user-entered'),
      setRothBalance: (value: number) => updateConfig({ rothBalance: value }, 'user-entered'),
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
      cTax1: config.cTax1 ?? DEFAULTS.cTax1,
      cPre1: config.cPre1 ?? DEFAULTS.cPre1,
      cPost1: config.cPost1 ?? DEFAULTS.cPost1,
      cMatch1: config.cMatch1 ?? DEFAULTS.cMatch1,
      cTax2: config.cTax2 ?? DEFAULTS.cTax2,
      cPre2: config.cPre2 ?? DEFAULTS.cPre2,
      cPost2: config.cPost2 ?? DEFAULTS.cPost2,
      cMatch2: config.cMatch2 ?? DEFAULTS.cMatch2,
      // Derived values
      totalPerson1:
        (config.cTax1 ?? DEFAULTS.cTax1) + (config.cPre1 ?? DEFAULTS.cPre1) + (config.cPost1 ?? DEFAULTS.cPost1) + (config.cMatch1 ?? DEFAULTS.cMatch1),
      totalPerson2:
        (config.cTax2 ?? DEFAULTS.cTax2) + (config.cPre2 ?? DEFAULTS.cPre2) + (config.cPost2 ?? DEFAULTS.cPost2) + (config.cMatch2 ?? DEFAULTS.cMatch2),
      grandTotal:
        (config.cTax1 ?? DEFAULTS.cTax1) +
        (config.cPre1 ?? DEFAULTS.cPre1) +
        (config.cPost1 ?? DEFAULTS.cPost1) +
        (config.cMatch1 ?? DEFAULTS.cMatch1) +
        (config.cTax2 ?? DEFAULTS.cTax2) +
        (config.cPre2 ?? DEFAULTS.cPre2) +
        (config.cPost2 ?? DEFAULTS.cPost2) +
        (config.cMatch2 ?? DEFAULTS.cMatch2),
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
      retRate: config.retRate ?? DEFAULTS.retRate,
      inflationRate: config.inflationRate ?? DEFAULTS.inflationRate,
      stateRate: config.stateRate ?? DEFAULTS.stateRate,
      incContrib: config.incContrib ?? DEFAULTS.incContrib,
      incRate: config.incRate ?? DEFAULTS.incRate,
      wdRate: config.wdRate ?? DEFAULTS.wdRate,
      dividendYield: config.dividendYield ?? DEFAULTS.dividendYield,
      // Derived: real return rate
      realReturnRate: (config.retRate ?? DEFAULTS.retRate) - (config.inflationRate ?? DEFAULTS.inflationRate),
    }),
    [
      config.retRate,
      config.inflationRate,
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
      setInflationRate: (value: number) => updateConfig({ inflationRate: value }, 'user-entered'),
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
      includeSS: config.includeSS ?? DEFAULTS.includeSS,
      ssIncome: config.ssIncome ?? DEFAULTS.ssIncome,
      ssClaimAge: config.ssClaimAge ?? DEFAULTS.ssClaimAge,
      ssIncome2: config.ssIncome2 ?? DEFAULTS.ssIncome2,
      ssClaimAge2: config.ssClaimAge2 ?? DEFAULTS.ssClaimAge2,
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
      includeMedicare: config.includeMedicare ?? DEFAULTS.includeMedicare,
      medicarePremium: config.medicarePremium ?? DEFAULTS.medicarePremium,
      medicalInflation: config.medicalInflation ?? DEFAULTS.medicalInflation,
      irmaaThresholdSingle: config.irmaaThresholdSingle ?? DEFAULTS.irmaaThresholdSingle,
      irmaaThresholdMarried: config.irmaaThresholdMarried ?? DEFAULTS.irmaaThresholdMarried,
      irmaaSurcharge: config.irmaaSurcharge ?? DEFAULTS.irmaaSurcharge,
      includeLTC: config.includeLTC ?? DEFAULTS.includeLTC,
      ltcAnnualCost: config.ltcAnnualCost ?? DEFAULTS.ltcAnnualCost,
      ltcProbability: config.ltcProbability ?? DEFAULTS.ltcProbability,
      ltcDuration: config.ltcDuration ?? DEFAULTS.ltcDuration,
      ltcOnsetAge: config.ltcOnsetAge ?? DEFAULTS.ltcOnsetAge,
      ltcAgeRangeStart: config.ltcAgeRangeStart ?? DEFAULTS.ltcAgeRangeStart,
      ltcAgeRangeEnd: config.ltcAgeRangeEnd ?? DEFAULTS.ltcAgeRangeEnd,
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
      returnMode: config.returnMode ?? DEFAULTS.returnMode,
      seed: config.seed ?? DEFAULTS.seed,
      randomWalkSeries: config.randomWalkSeries ?? DEFAULTS.randomWalkSeries,
      historicalYear: config.historicalYear ?? null,
      inflationShockRate: config.inflationShockRate ?? (DEFAULTS.inflationShockRate ?? 0),
      inflationShockDuration: config.inflationShockDuration ?? DEFAULTS.inflationShockDuration,
    }),
    [
      config.returnMode,
      config.seed,
      config.randomWalkSeries,
      config.historicalYear,
      config.inflationShockRate,
      config.inflationShockDuration,
    ]
  );

  const setters = useMemo(
    () => ({
      setReturnMode: (value: 'fixed' | 'randomWalk') => updateConfig({ returnMode: value }, 'user-entered'),
      setSeed: (value: number) => updateConfig({ seed: value }, 'user-entered'),
      setRandomWalkSeries: (value: 'nominal' | 'real' | 'trulyRandom') =>
        updateConfig({ randomWalkSeries: value }, 'user-entered'),
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
      allocationStrategy: config.allocationStrategy ?? DEFAULTS.allocationStrategy,
      bondStartPct: config.bondStartPct ?? DEFAULTS.bondStartPct,
      bondEndPct: config.bondEndPct ?? DEFAULTS.bondEndPct,
      bondStartAge: config.bondStartAge ?? config.age1 ?? DEFAULTS.age1,
      bondEndAge: config.bondEndAge ?? DEFAULTS.bondEndAge,
      glidePathShape: config.glidePathShape ?? DEFAULTS.glidePathShape,
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
      showGen: config.showGen ?? DEFAULTS.showGen,
      hypPerBen: config.hypPerBen ?? DEFAULTS.hypPerBen,
      numberOfBeneficiaries: config.numberOfBeneficiaries ?? DEFAULTS.numberOfBeneficiaries,
      additionalChildrenExpected: config.additionalChildrenExpected ?? DEFAULTS.additionalChildrenExpected,
      totalFertilityRate: config.totalFertilityRate ?? DEFAULTS.totalFertilityRate,
      generationLength: config.generationLength ?? DEFAULTS.generationLength,
      fertilityWindowStart: config.fertilityWindowStart ?? DEFAULTS.fertilityWindowStart,
      fertilityWindowEnd: config.fertilityWindowEnd ?? DEFAULTS.fertilityWindowEnd,
      hypDeathAge: config.hypDeathAge ?? DEFAULTS.hypDeathAge,
      hypMinDistAge: config.hypMinDistAge ?? DEFAULTS.hypMinDistAge,
      enableRothConversions: config.enableRothConversions ?? DEFAULTS.enableRothConversions,
      targetConversionBracket: config.targetConversionBracket ?? DEFAULTS.targetConversionBracket,
    }),
    [
      config.showGen,
      config.hypPerBen,
      config.numberOfBeneficiaries,
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
      setNumberOfBeneficiaries: (value: number) => updateConfig({ numberOfBeneficiaries: value }, 'user-entered'),
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
    const younger = Math.min(config.age1 ?? DEFAULTS.age1, config.marital === 'married' ? (config.age2 ?? DEFAULTS.age2) : (config.age1 ?? DEFAULTS.age1));
    return Math.max(0, (config.retirementAge ?? DEFAULTS.retirementAge) - younger);
  }, [config.age1, config.age2, config.retirementAge, config.marital]);
}

/**
 * Derived state: Total current portfolio value
 */
export function useTotalPortfolioValue(): number {
  const { config } = usePlanConfig();
  return useMemo(
    () => (config.taxableBalance ?? 0) + (config.pretaxBalance ?? 0) + (config.rothBalance ?? 0),
    [config.taxableBalance, config.pretaxBalance, config.rothBalance]
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
