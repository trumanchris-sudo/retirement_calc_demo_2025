/**
 * usePlanConfigSetters — generates memoized setter functions for PlanConfig fields.
 *
 * Replaces ~50 hand-written `const setX = (v) => { updatePlanConfig({x:v},'user-entered'); markDirty(); }`
 * one-liners that were duplicated in app/page.tsx.
 *
 * Special cases:
 *   - setAge1: atomically keeps bondStartAge in sync when it was tracking age1
 *   - setHistoricalYear: converts null → undefined before writing (PlanConfig stores undefined)
 */

import { useCallback } from 'react';
import type { PlanConfig } from '@/types/plan-config';
import type { FilingStatus } from '@/lib/calculations/taxCalculations';
import type { EmploymentType, AllocationStrategy, GlidePathShape } from '@/types/calculator';
import type { ReturnMode, WalkSeries } from '@/types/planner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Signature of updateConfig from usePlanConfig() */
type UpdatePlanConfig = (
  updates: Partial<PlanConfig>,
  source?: 'user-entered' | 'ai-suggested' | 'default' | 'imported',
) => void;

/** Return type of the hook — every named setter. */
export interface PlanConfigSetters {
  // Personal
  setMarital: (value: FilingStatus) => void;
  setAge1: (value: number) => void;
  setAge2: (value: number) => void;
  setRetirementAge: (value: number) => void;

  // Employment & Income
  setEmploymentType1: (value: EmploymentType) => void;
  setEmploymentType2: (value: EmploymentType | undefined) => void;
  setPrimaryIncome: (value: number) => void;
  setSpouseIncome: (value: number) => void;

  // Balances
  setEmergencyFund: (value: number) => void;
  setTaxableBalance: (value: number) => void;
  setPretaxBalance: (value: number) => void;
  setRothBalance: (value: number) => void;

  // Contributions
  setCTax1: (value: number) => void;
  setCPre1: (value: number) => void;
  setCPost1: (value: number) => void;
  setCMatch1: (value: number) => void;
  setCTax2: (value: number) => void;
  setCPre2: (value: number) => void;
  setCPost2: (value: number) => void;
  setCMatch2: (value: number) => void;

  // Rates
  setRetRate: (value: number) => void;
  setInflationRate: (value: number) => void;
  setStateRate: (value: number) => void;
  setIncContrib: (value: boolean) => void;
  setIncRate: (value: number) => void;
  setWdRate: (value: number) => void;
  setDividendYield: (value: number) => void;

  // Social Security
  setIncludeSS: (value: boolean) => void;
  setSSIncome: (value: number) => void;
  setSSClaimAge: (value: number) => void;
  setSSIncome2: (value: number) => void;
  setSSClaimAge2: (value: number) => void;

  // Healthcare
  setIncludeMedicare: (value: boolean) => void;
  setMedicarePremium: (value: number) => void;
  setMedicalInflation: (value: number) => void;
  setIrmaaThresholdSingle: (value: number) => void;
  setIrmaaThresholdMarried: (value: number) => void;
  setIrmaaSurcharge: (value: number) => void;

  // Long-Term Care
  setIncludeLTC: (value: boolean) => void;
  setLtcAnnualCost: (value: number) => void;
  setLtcProbability: (value: number) => void;
  setLtcDuration: (value: number) => void;
  setLtcOnsetAge: (value: number) => void;
  setLtcAgeRangeStart: (value: number) => void;
  setLtcAgeRangeEnd: (value: number) => void;

  // Roth Conversion
  setEnableRothConversions: (value: boolean) => void;
  setTargetConversionBracket: (value: number) => void;

  // Generational Wealth
  setShowGen: (value: boolean) => void;
  setHypPerBen: (value: number) => void;
  setNumberOfBeneficiaries: (value: number) => void;
  setAdditionalChildrenExpected: (value: number) => void;
  setTotalFertilityRate: (value: number) => void;
  setGenerationLength: (value: number) => void;
  setFertilityWindowStart: (value: number) => void;
  setFertilityWindowEnd: (value: number) => void;
  setHypDeathAge: (value: number) => void;
  setHypMinDistAge: (value: number) => void;

  // Simulation
  setReturnMode: (value: ReturnMode) => void;
  setSeed: (value: number) => void;
  setRandomWalkSeries: (value: WalkSeries) => void;

  // Bonds / Glide Path
  setAllocationStrategy: (value: AllocationStrategy) => void;
  setBondStartPct: (value: number) => void;
  setBondEndPct: (value: number) => void;
  setBondStartAge: (value: number) => void;
  setBondEndAge: (value: number) => void;
  setGlidePathShape: (value: GlidePathShape) => void;

  // Scenario Testing
  setHistoricalYear: (value: number | null) => void;
  setInflationShockRate: (value: number) => void;
  setInflationShockDuration: (value: number) => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Generate all PlanConfig setter functions.
 *
 * @param updatePlanConfig - `updateConfig` from usePlanConfig()
 * @param markDirty        - `markDirty` (aliased from markResultsDirty)
 * @param planConfig       - current PlanConfig (needed for setAge1 bond-tracking logic)
 */
export function usePlanConfigSetters(
  updatePlanConfig: UpdatePlanConfig,
  markDirty: () => void,
  planConfig: PlanConfig,
): PlanConfigSetters {
  // ------------------------------------------------------------------
  // Helper: build a simple setter for a single PlanConfig key.
  // The value type is inferred from the key so callers stay type-safe.
  // ------------------------------------------------------------------

  // We intentionally keep one useCallback per setter so React can
  // skip re-renders when individual callbacks are passed as props.

  // ---- Personal ----
  const setMarital = useCallback(
    (value: FilingStatus) => { updatePlanConfig({ marital: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // setAge1 atomically updates bondStartAge when it follows age1
  // (not explicitly overridden). This eliminates the useEffect cascade.
  const setAge1 = useCallback(
    (value: number) => {
      const currentBondStartAge = planConfig.bondStartAge;
      const currentAge1 = planConfig.age1 ?? 30; // fallback matches createDefaultPlanConfig
      const bondStartAgeFollowsAge =
        currentBondStartAge === undefined || currentBondStartAge === currentAge1;
      const updates: Partial<PlanConfig> = { age1: value };
      if (bondStartAgeFollowsAge) {
        updates.bondStartAge = value;
      }
      updatePlanConfig(updates, 'user-entered');
      markDirty();
    },
    [updatePlanConfig, markDirty, planConfig.bondStartAge, planConfig.age1],
  );

  const setAge2 = useCallback(
    (value: number) => { updatePlanConfig({ age2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setRetirementAge = useCallback(
    (value: number) => { updatePlanConfig({ retirementAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Employment & Income ----
  const setEmploymentType1 = useCallback(
    (value: EmploymentType) => { updatePlanConfig({ employmentType1: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setEmploymentType2 = useCallback(
    (value: EmploymentType | undefined) => { updatePlanConfig({ employmentType2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setPrimaryIncome = useCallback(
    (value: number) => { updatePlanConfig({ primaryIncome: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSpouseIncome = useCallback(
    (value: number) => { updatePlanConfig({ spouseIncome: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Balances ----
  const setEmergencyFund = useCallback(
    (value: number) => { updatePlanConfig({ emergencyFund: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setTaxableBalance = useCallback(
    (value: number) => { updatePlanConfig({ taxableBalance: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setPretaxBalance = useCallback(
    (value: number) => { updatePlanConfig({ pretaxBalance: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setRothBalance = useCallback(
    (value: number) => { updatePlanConfig({ rothBalance: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Contributions ----
  const setCTax1 = useCallback(
    (value: number) => { updatePlanConfig({ cTax1: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCPre1 = useCallback(
    (value: number) => { updatePlanConfig({ cPre1: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCPost1 = useCallback(
    (value: number) => { updatePlanConfig({ cPost1: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCMatch1 = useCallback(
    (value: number) => { updatePlanConfig({ cMatch1: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCTax2 = useCallback(
    (value: number) => { updatePlanConfig({ cTax2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCPre2 = useCallback(
    (value: number) => { updatePlanConfig({ cPre2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCPost2 = useCallback(
    (value: number) => { updatePlanConfig({ cPost2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setCMatch2 = useCallback(
    (value: number) => { updatePlanConfig({ cMatch2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Rates ----
  const setRetRate = useCallback(
    (value: number) => { updatePlanConfig({ retRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setInflationRate = useCallback(
    (value: number) => { updatePlanConfig({ inflationRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setStateRate = useCallback(
    (value: number) => { updatePlanConfig({ stateRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setIncContrib = useCallback(
    (value: boolean) => { updatePlanConfig({ incContrib: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setIncRate = useCallback(
    (value: number) => { updatePlanConfig({ incRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setWdRate = useCallback(
    (value: number) => { updatePlanConfig({ wdRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setDividendYield = useCallback(
    (value: number) => { updatePlanConfig({ dividendYield: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Social Security ----
  const setIncludeSS = useCallback(
    (value: boolean) => { updatePlanConfig({ includeSS: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSSIncome = useCallback(
    (value: number) => { updatePlanConfig({ ssIncome: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSSClaimAge = useCallback(
    (value: number) => { updatePlanConfig({ ssClaimAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSSIncome2 = useCallback(
    (value: number) => { updatePlanConfig({ ssIncome2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSSClaimAge2 = useCallback(
    (value: number) => { updatePlanConfig({ ssClaimAge2: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Healthcare ----
  const setIncludeMedicare = useCallback(
    (value: boolean) => { updatePlanConfig({ includeMedicare: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setMedicarePremium = useCallback(
    (value: number) => { updatePlanConfig({ medicarePremium: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setMedicalInflation = useCallback(
    (value: number) => { updatePlanConfig({ medicalInflation: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setIrmaaThresholdSingle = useCallback(
    (value: number) => { updatePlanConfig({ irmaaThresholdSingle: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setIrmaaThresholdMarried = useCallback(
    (value: number) => { updatePlanConfig({ irmaaThresholdMarried: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setIrmaaSurcharge = useCallback(
    (value: number) => { updatePlanConfig({ irmaaSurcharge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Long-Term Care ----
  const setIncludeLTC = useCallback(
    (value: boolean) => { updatePlanConfig({ includeLTC: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcAnnualCost = useCallback(
    (value: number) => { updatePlanConfig({ ltcAnnualCost: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcProbability = useCallback(
    (value: number) => { updatePlanConfig({ ltcProbability: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcDuration = useCallback(
    (value: number) => { updatePlanConfig({ ltcDuration: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcOnsetAge = useCallback(
    (value: number) => { updatePlanConfig({ ltcOnsetAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcAgeRangeStart = useCallback(
    (value: number) => { updatePlanConfig({ ltcAgeRangeStart: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setLtcAgeRangeEnd = useCallback(
    (value: number) => { updatePlanConfig({ ltcAgeRangeEnd: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Roth Conversion ----
  const setEnableRothConversions = useCallback(
    (value: boolean) => { updatePlanConfig({ enableRothConversions: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setTargetConversionBracket = useCallback(
    (value: number) => { updatePlanConfig({ targetConversionBracket: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Generational Wealth ----
  const setShowGen = useCallback(
    (value: boolean) => { updatePlanConfig({ showGen: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setHypPerBen = useCallback(
    (value: number) => { updatePlanConfig({ hypPerBen: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setNumberOfBeneficiaries = useCallback(
    (value: number) => { updatePlanConfig({ numberOfBeneficiaries: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setAdditionalChildrenExpected = useCallback(
    (value: number) => { updatePlanConfig({ additionalChildrenExpected: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setTotalFertilityRate = useCallback(
    (value: number) => { updatePlanConfig({ totalFertilityRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setGenerationLength = useCallback(
    (value: number) => { updatePlanConfig({ generationLength: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setFertilityWindowStart = useCallback(
    (value: number) => { updatePlanConfig({ fertilityWindowStart: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setFertilityWindowEnd = useCallback(
    (value: number) => { updatePlanConfig({ fertilityWindowEnd: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setHypDeathAge = useCallback(
    (value: number) => { updatePlanConfig({ hypDeathAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setHypMinDistAge = useCallback(
    (value: number) => { updatePlanConfig({ hypMinDistAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Simulation ----
  const setReturnMode = useCallback(
    (value: ReturnMode) => { updatePlanConfig({ returnMode: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setSeed = useCallback(
    (value: number) => { updatePlanConfig({ seed: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setRandomWalkSeries = useCallback(
    (value: WalkSeries) => { updatePlanConfig({ randomWalkSeries: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Bonds / Glide Path ----
  const setAllocationStrategy = useCallback(
    (value: AllocationStrategy) => { updatePlanConfig({ allocationStrategy: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setBondStartPct = useCallback(
    (value: number) => { updatePlanConfig({ bondStartPct: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setBondEndPct = useCallback(
    (value: number) => { updatePlanConfig({ bondEndPct: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setBondStartAge = useCallback(
    (value: number) => { updatePlanConfig({ bondStartAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setBondEndAge = useCallback(
    (value: number) => { updatePlanConfig({ bondEndAge: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setGlidePathShape = useCallback(
    (value: GlidePathShape) => { updatePlanConfig({ glidePathShape: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ---- Scenario Testing ----
  // historicalYear is stored as `number | undefined` in PlanConfig, but the
  // UI passes `number | null`. Convert null → undefined on the way in.
  const setHistoricalYear = useCallback(
    (value: number | null) => { updatePlanConfig({ historicalYear: value ?? undefined }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setInflationShockRate = useCallback(
    (value: number) => { updatePlanConfig({ inflationShockRate: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  const setInflationShockDuration = useCallback(
    (value: number) => { updatePlanConfig({ inflationShockDuration: value }, 'user-entered'); markDirty(); },
    [updatePlanConfig, markDirty],
  );

  // ------------------------------------------------------------------
  // Return all setters in a single stable object
  // ------------------------------------------------------------------
  return {
    // Personal
    setMarital, setAge1, setAge2, setRetirementAge,
    // Employment & Income
    setEmploymentType1, setEmploymentType2, setPrimaryIncome, setSpouseIncome,
    // Balances
    setEmergencyFund, setTaxableBalance, setPretaxBalance, setRothBalance,
    // Contributions
    setCTax1, setCPre1, setCPost1, setCMatch1,
    setCTax2, setCPre2, setCPost2, setCMatch2,
    // Rates
    setRetRate, setInflationRate, setStateRate, setIncContrib, setIncRate, setWdRate, setDividendYield,
    // Social Security
    setIncludeSS, setSSIncome, setSSClaimAge, setSSIncome2, setSSClaimAge2,
    // Healthcare
    setIncludeMedicare, setMedicarePremium, setMedicalInflation,
    setIrmaaThresholdSingle, setIrmaaThresholdMarried, setIrmaaSurcharge,
    // Long-Term Care
    setIncludeLTC, setLtcAnnualCost, setLtcProbability, setLtcDuration,
    setLtcOnsetAge, setLtcAgeRangeStart, setLtcAgeRangeEnd,
    // Roth Conversion
    setEnableRothConversions, setTargetConversionBracket,
    // Generational Wealth
    setShowGen, setHypPerBen, setNumberOfBeneficiaries, setAdditionalChildrenExpected,
    setTotalFertilityRate, setGenerationLength, setFertilityWindowStart, setFertilityWindowEnd,
    setHypDeathAge, setHypMinDistAge,
    // Simulation
    setReturnMode, setSeed, setRandomWalkSeries,
    // Bonds / Glide Path
    setAllocationStrategy, setBondStartPct, setBondEndPct, setBondStartAge, setBondEndAge, setGlidePathShape,
    // Scenario Testing
    setHistoricalYear, setInflationShockRate, setInflationShockDuration,
  };
}
