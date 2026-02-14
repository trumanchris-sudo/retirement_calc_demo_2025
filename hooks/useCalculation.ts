/**
 * useCalculation Hook
 * Extracted from page.tsx — contains core retirement calculation logic.
 *
 * This is a function-only hook: it reads PlanConfig internally, accepts
 * external state setters via deps, and returns calculation functions.
 *
 * Exposes: calc, calculateSensitivity, calculateLegacyResult, applyGenerationalPreset
 */

import React, { useCallback, useMemo } from 'react';
import { usePlanConfig } from '@/lib/plan-config-context';
import { createDefaultPlanConfig } from '@/types/plan-config';
import { useIsMarried, useTotalBalance } from '@/hooks/useCalculatorDerivedState';
import { soundPresets } from '@/lib/sounds';
import { fmt, realReturn } from '@/lib/utils';
import { validateCalculatorInputs } from '@/lib/validation';
import {
  runSingleSimulation,
  calcSocialSecurity,
  calcRMD,
  calcEstateTax,
  type SimulationInputs,
} from '@/lib/calculations/retirementEngine';
import {
  getCurrYear,
  LIFE_EXP,
  RMD_START_AGE,
} from '@/lib/constants';
import type { CalculationResult, ComparisonData, GenerationalPayout, BondGlidePath } from '@/types/calculator';
import type { BatchSummary } from '@/types/planner';
import type { LegacyResult } from '@/lib/walletPass';
import type { MainTabId } from '@/components/calculator/TabNavigation';

const DEFAULTS = createDefaultPlanConfig();

// ========================================
// Public Types
// ========================================

export interface SensitivityVariation {
  label: string;
  high: number;
  low: number;
  range: number;
}

export interface SensitivityAnalysisData {
  baseline: number;
  variations: SensitivityVariation[];
}

// ========================================
// Private Helpers
// ========================================

interface BackfilledBeneficiary {
  age: number;
  size: number;
  generation: number;
}

function backfillYoungerGenerations(
  initialAges: number[],
  numBeneficiaries: number,
  fertilityWindowEnd: number,
  generationLength: number,
  totalFertilityRate: number
): BackfilledBeneficiary[] {
  const result: BackfilledBeneficiary[] = [];

  for (const age of initialAges) {
    if (age <= fertilityWindowEnd) {
      result.push({ age, size: numBeneficiaries / initialAges.length, generation: 0 });
    } else {
      let currentAge = age;
      let currentSize = numBeneficiaries / initialAges.length;
      let generation = 0;
      const maxGenerations = 20;

      while (currentAge > fertilityWindowEnd && generation < maxGenerations) {
        if (generationLength <= 0) {
          console.warn('[BACKFILL] generationLength <= 0, breaking to prevent infinite loop');
          currentAge = 0;
          break;
        }
        const childAge = currentAge - generationLength;
        const childSize = currentSize * totalFertilityRate;
        currentAge = childAge;
        currentSize = childSize;
        generation++;
        console.log(`[BACKFILL] Gen ${generation}: Parent age ${currentAge + generationLength} → Child age ${childAge}, size ${childSize.toFixed(2)}`);
      }

      result.push({ age: currentAge, size: currentSize, generation });
      console.log(`[BACKFILL] Final: Added beneficiary at age ${currentAge}, size ${currentSize.toFixed(2)}, generation ${generation}`);
    }
  }

  return result;
}

// ========================================
// Dependencies Interface
// ========================================

/** External dependencies the hook cannot own */
export interface CalcDeps {
  // Result state
  res: CalculationResult | null;
  setRes: (v: CalculationResult | null) => void;
  setErr: (v: string | null) => void;
  setIsRunning: (v: boolean) => void;
  setIsDirty: (v: boolean) => void;
  setBatchSummary: (v: BatchSummary | null) => void;
  setLegacyResult: (v: LegacyResult | null) => void;
  setOlderAgeForAnalysis: (v: number) => void;
  lastCalculated: Date | null;
  setLastCalculated: (v: Date | null) => void;
  setInputsModified: (v: boolean) => void;

  // Worker hook
  workerRef: React.RefObject<Worker | null>;
  runMonteCarloViaWorker: (inputs: SimulationInputs, baseSeed: number, N?: number) => Promise<BatchSummary>;
  // Reason: generationData shape varies by worker version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  runLegacyViaWorker: (params: {
    eolNominal: number;
    yearsFrom2025: number;
    nominalRet: number;
    inflPct: number;
    perBenReal: number;
    startBens: number;
    totalFertilityRate: number;
    generationLength?: number;
    deathAge?: number;
    minDistAge?: number;
    capYears?: number;
    initialBenAges?: number[];
    fertilityWindowStart?: number;
    fertilityWindowEnd?: number;
    marital?: string;
    // Reason: generationData shape varies by worker version
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) => Promise<{ years: number; fundLeftReal: number; lastLivingCount: number; generationData?: any[] }>;
  runGuardrailsAnalysis: (batchData: BatchSummary, spendingReduction?: number) => void;
  runRothOptimizer: (result: CalculationResult) => void;
  setGuardrailsResult: (result: null) => void;

  // AI hook setters
  setAiInsight: (v: string) => void;
  setAiError: (v: string | null) => void;
  setIsLoadingAi: (v: boolean) => void;

  // UI refs
  splashRef: React.RefObject<{ play: () => void } | null>;
  tabGroupRef: React.RefObject<{ closeAll: () => void } | null>;

  // UI state
  activeMainTab: MainTabId;
  setActiveMainTab: (v: MainTabId) => void;
  isFromWizard: boolean;
  setIsFromWizard: (v: boolean) => void;
  assumeTaxCutsExtended: boolean;
  setComparisonData: (v: ComparisonData) => void;
  setComparisonMode: (v: boolean) => void;
  setShowBearMarket: (v: boolean) => void;
  setShowInflationShock: (v: boolean) => void;

  // Derived values (computed in page.tsx)
  hypBenAgesStr: string;
  bondGlidePath: BondGlidePath | null;

  // Legacy local state setters (for applyGenerationalPreset)
  setHypBirthMultiple: (v: number) => void;
  setHypBirthInterval: (v: number) => void;
}

// ========================================
// Hook
// ========================================

export function useCalculation(deps: CalcDeps) {
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  // === Read all fields from PlanConfig ===
  const marital = planConfig.marital ?? DEFAULTS.marital;
  const age1 = planConfig.age1 ?? DEFAULTS.age1;
  const age2 = planConfig.age2 ?? DEFAULTS.age2;
  const retirementAge = planConfig.retirementAge ?? DEFAULTS.retirementAge;
  const employmentType1 = planConfig.employmentType1 ?? DEFAULTS.employmentType1;
  const employmentType2 = planConfig.employmentType2;
  const primaryIncome = planConfig.primaryIncome ?? DEFAULTS.primaryIncome;
  const spouseIncome = planConfig.spouseIncome ?? DEFAULTS.spouseIncome;
  const emergencyFund = planConfig.emergencyFund ?? DEFAULTS.emergencyFund;
  const taxableBalance = planConfig.taxableBalance ?? DEFAULTS.taxableBalance;
  const pretaxBalance = planConfig.pretaxBalance ?? DEFAULTS.pretaxBalance;
  const rothBalance = planConfig.rothBalance ?? DEFAULTS.rothBalance;
  const cTax1 = planConfig.cTax1 ?? DEFAULTS.cTax1;
  const cPre1 = planConfig.cPre1 ?? DEFAULTS.cPre1;
  const cPost1 = planConfig.cPost1 ?? DEFAULTS.cPost1;
  const cMatch1 = Math.max(0, planConfig.cMatch1 ?? DEFAULTS.cMatch1);
  const cTax2 = planConfig.cTax2 ?? DEFAULTS.cTax2;
  const cPre2 = planConfig.cPre2 ?? DEFAULTS.cPre2;
  const cPost2 = planConfig.cPost2 ?? DEFAULTS.cPost2;
  const cMatch2 = Math.max(0, planConfig.cMatch2 ?? DEFAULTS.cMatch2);
  const retRate = planConfig.retRate ?? DEFAULTS.retRate;
  const inflationRate = planConfig.inflationRate ?? DEFAULTS.inflationRate;
  const stateRate = planConfig.stateRate ?? DEFAULTS.stateRate;
  const incContrib = planConfig.incContrib ?? DEFAULTS.incContrib;
  const incRate = planConfig.incRate ?? DEFAULTS.incRate;
  const wdRate = planConfig.wdRate ?? DEFAULTS.wdRate;
  const dividendYield = planConfig.dividendYield ?? DEFAULTS.dividendYield;
  const includeSS = planConfig.includeSS ?? DEFAULTS.includeSS;
  const ssIncome = planConfig.ssIncome ?? DEFAULTS.ssIncome;
  const ssClaimAge = planConfig.ssClaimAge ?? DEFAULTS.ssClaimAge;
  const ssIncome2 = planConfig.ssIncome2 ?? DEFAULTS.ssIncome2;
  const ssClaimAge2 = planConfig.ssClaimAge2 ?? DEFAULTS.ssClaimAge2;
  const numChildren = planConfig.numChildren ?? 0;
  const childrenAges = useMemo(() => planConfig.childrenAges ?? [], [planConfig.childrenAges]);
  const additionalChildrenExpected = planConfig.additionalChildrenExpected ?? 0;
  const showGen = planConfig.showGen ?? false;
  const hypPerBen = planConfig.hypPerBen ?? 30000;
  const numberOfBeneficiaries = planConfig.numberOfBeneficiaries ?? 2;
  const totalFertilityRate = planConfig.totalFertilityRate ?? 2.1;
  const generationLength = planConfig.generationLength ?? 30;
  const fertilityWindowStart = planConfig.fertilityWindowStart ?? 20;
  const fertilityWindowEnd = planConfig.fertilityWindowEnd ?? 45;
  const hypDeathAge = planConfig.hypDeathAge ?? 90;
  const hypMinDistAge = planConfig.hypMinDistAge ?? 18;
  const returnMode = planConfig.returnMode ?? 'randomWalk';
  const seed = planConfig.seed ?? 42;
  const randomWalkSeries = planConfig.randomWalkSeries ?? 'trulyRandom';
  const historicalYear = planConfig.historicalYear ?? null;
  const inflationShockRate = planConfig.inflationShockRate ?? 0;
  const inflationShockDuration = planConfig.inflationShockDuration ?? 5;
  // Healthcare
  const includeMedicare = planConfig.includeMedicare ?? true;
  const medicarePremium = planConfig.medicarePremium ?? 400;
  const medicalInflation = planConfig.medicalInflation ?? 5.0;
  const irmaaThresholdSingle = planConfig.irmaaThresholdSingle ?? 109000;
  const irmaaThresholdMarried = planConfig.irmaaThresholdMarried ?? 218000;
  const irmaaSurcharge = planConfig.irmaaSurcharge ?? 230;
  const includeLTC = planConfig.includeLTC ?? false;
  const ltcAnnualCost = planConfig.ltcAnnualCost ?? 80000;
  const ltcProbability = planConfig.ltcProbability ?? 50;
  const ltcDuration = planConfig.ltcDuration ?? 2.5;
  const ltcOnsetAge = planConfig.ltcOnsetAge ?? 82;
  const ltcAgeRangeStart = planConfig.ltcAgeRangeStart ?? 75;
  const ltcAgeRangeEnd = planConfig.ltcAgeRangeEnd ?? 90;
  // Roth conversion
  const enableRothConversions = planConfig.enableRothConversions ?? false;
  const targetConversionBracket = planConfig.targetConversionBracket ?? 0.24;

  const isMar = useIsMarried(planConfig);
  const total = useTotalBalance(planConfig);

  // Destructure deps for use in callbacks
  const {
    res, setRes, setErr, setIsRunning, setIsDirty,
    setBatchSummary, setLegacyResult, setOlderAgeForAnalysis,
    lastCalculated, setLastCalculated, setInputsModified,
    workerRef, runMonteCarloViaWorker, runLegacyViaWorker,
    runGuardrailsAnalysis, runRothOptimizer, setGuardrailsResult,
    setAiInsight, setAiError, setIsLoadingAi,
    splashRef, tabGroupRef,
    activeMainTab, setActiveMainTab, isFromWizard, setIsFromWizard,
    assumeTaxCutsExtended,
    setComparisonData, setComparisonMode, setShowBearMarket, setShowInflationShock,
    hypBenAgesStr, bondGlidePath,
    setHypBirthMultiple, setHypBirthInterval,
  } = deps;

  // ========================================
  // calculateLegacyResult
  // ========================================

  const calculateLegacyResult = useCallback((calcResult: CalculationResult | null): LegacyResult | null => {
    if (!calcResult || !calcResult.genPayout) return null;

    const isPerpetual =
      calcResult.genPayout.p10?.isPerpetual === true &&
      calcResult.genPayout.p50?.isPerpetual === true &&
      calcResult.genPayout.p90?.isPerpetual === true;

    const explanationText = isPerpetual
      ? `Each beneficiary receives ${fmt(calcResult.genPayout.perBenReal)}/year (inflation-adjusted) from age ${hypMinDistAge} to ${hypDeathAge}—equivalent to a ${fmt(calcResult.genPayout.perBenReal * 25)} trust fund. This provides lifelong financial security and freedom to pursue any career path.`
      : `Each beneficiary receives ${fmt(calcResult.genPayout.perBenReal)}/year (inflation-adjusted) for ${calcResult.genPayout.years} years, providing substantial financial support during their lifetime.`;

    return {
      legacyAmount: calcResult.genPayout.perBenReal,
      legacyAmountDisplay: fmt(calcResult.genPayout.perBenReal),
      legacyType: isPerpetual ? "Perpetual Legacy" : "Finite Legacy",
      withdrawalRate: wdRate / 100,
      successProbability: calcResult.genPayout.probPerpetual || 0,
      explanationText,
    };
  }, [hypMinDistAge, hypDeathAge, wdRate]);

  // ========================================
  // applyGenerationalPreset
  // ========================================

  const applyGenerationalPreset = useCallback((preset: 'conservative' | 'moderate' | 'aggressive') => {
    const presetValues = {
      conservative: {
        showGen: true, hypPerBen: 75_000, numberOfBeneficiaries: 2,
        totalFertilityRate: 1.5, generationLength: 32,
        fertilityWindowStart: 27, fertilityWindowEnd: 37,
        birthMultiple: 1.5, birthInterval: 32,
      },
      moderate: {
        showGen: true, hypPerBen: 100_000, numberOfBeneficiaries: 2,
        totalFertilityRate: 2.1, generationLength: 30,
        fertilityWindowStart: 25, fertilityWindowEnd: 35,
        birthMultiple: 2.1, birthInterval: 30,
      },
      aggressive: {
        showGen: true, hypPerBen: 150_000, numberOfBeneficiaries: 3,
        totalFertilityRate: 2.5, generationLength: 28,
        fertilityWindowStart: 23, fertilityWindowEnd: 33,
        birthMultiple: 2.5, birthInterval: 28,
      },
    }[preset];

    // Batch update PlanConfig in one call
    updatePlanConfig({
      showGen: presetValues.showGen,
      hypPerBen: presetValues.hypPerBen,
      numberOfBeneficiaries: presetValues.numberOfBeneficiaries,
      totalFertilityRate: presetValues.totalFertilityRate,
      generationLength: presetValues.generationLength,
      fertilityWindowStart: presetValues.fertilityWindowStart,
      fertilityWindowEnd: presetValues.fertilityWindowEnd,
    }, 'user-entered');

    // Legacy state for backward compatibility
    setHypBirthMultiple(presetValues.birthMultiple);
    setHypBirthInterval(presetValues.birthInterval);

    setIsDirty(true);
  }, [updatePlanConfig, setHypBirthMultiple, setHypBirthInterval, setIsDirty]);

  // ========================================
  // calc() — Main calculation function
  // ========================================

  const calc = useCallback(async (optionsOrEvent?: { forceShowGen?: boolean } | React.MouseEvent) => {
    soundPresets.button();
    console.log('[CALC] Starting calculation...');

    const options = optionsOrEvent && 'forceShowGen' in optionsOrEvent ? optionsOrEvent : undefined;
    const effectiveShowGen = options?.forceShowGen ?? showGen;
    setErr(null);
    setAiInsight("");
    setAiError(null);
    setIsLoadingAi(true);
    setIsRunning(true);

    // Start cinematic Monte Carlo sequence from All-in-One, Configure tabs, or Wizard completion
    if (activeMainTab === 'all' || activeMainTab === 'configure' || isFromWizard) {
      console.log('[CALC] Playing splash animation');
      splashRef.current?.play();
    }

    // Clear any existing stress test comparison data
    setComparisonData({ baseline: null, bearMarket: null, inflation: null });
    setComparisonMode(false);
    setShowBearMarket(false);
    setShowInflationShock(false);

    // Close all form tabs when calculation starts
    tabGroupRef.current?.closeAll();

    let newRes: CalculationResult | null = null;
    let olderAgeForAI: number = 0;

    let currentSeed = seed;
    if (randomWalkSeries === 'trulyRandom') {
      currentSeed = Math.floor(Math.random() * 1000000);
      updatePlanConfig({ seed: currentSeed }, 'user-entered');
      console.log('[CALC] Using Monte Carlo mode with seed:', currentSeed);
    }

    try {
      console.log('[CALC] Validating inputs...');
      const validationResult = validateCalculatorInputs({
        age1,
        age2: isMar ? age2 : undefined,
        retirementAge,
        taxableBalance,
        pretaxBalance,
        rothBalance,
        cTax1,
        cPre1,
        cPost1,
        cMatch1,
        cTax2: isMar ? cTax2 : undefined,
        cPre2: isMar ? cPre2 : undefined,
        cPost2: isMar ? cPost2 : undefined,
        cMatch2: isMar ? cMatch2 : undefined,
        wdRate,
        retRate,
        inflationRate,
        stateRate,
        marital
      });

      if (!validationResult.isValid) {
        console.error('[CALC] Validation failed:', validationResult.error);
        throw new Error(validationResult.error);
      }

      console.log('[CALC] Validation passed, starting calculation...');

      const younger = Math.min(age1, isMar ? age2 : age1);
      const older = Math.max(age1, isMar ? age2 : age1);
      olderAgeForAI = older;

      const yrsToRet = retirementAge - younger;
      const infl = inflationRate / 100;
      const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

      // Calculate initial asset allocation ratios for accurate RMD estimation
      const initialTotal = taxableBalance + pretaxBalance + rothBalance;
      const initialPretaxRatio = initialTotal > 0 ? pretaxBalance / initialTotal : 0.5;
      const initialTaxableRatio = initialTotal > 0 ? taxableBalance / initialTotal : 0.3;
      const initialRothRatio = initialTotal > 0 ? rothBalance / initialTotal : 0.2;
      console.log('[CALC] Initial asset allocation ratios - Pretax:', initialPretaxRatio.toFixed(2),
                  'Taxable:', initialTaxableRatio.toFixed(2), 'Roth:', initialRothRatio.toFixed(2));

      // Determine simulation count based on mode
      const simCount = randomWalkSeries === 'trulyRandom' ? 1000 : 1;
      console.log('[CALC] Running', simCount, 'simulation(s) via web worker for mode:', randomWalkSeries);

      console.log('[CALC] Worker ref exists:', !!workerRef.current);
      const inputs: SimulationInputs = {
        // Personal & Family
        marital, age1, age2, retirementAge,
        numChildren, childrenAges, additionalChildrenExpected,
        // Employment & Income
        employmentType1, employmentType2, primaryIncome, spouseIncome,
        // Account Balances
        emergencyFund, taxableBalance, pretaxBalance, rothBalance,
        // Contributions
        cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
        // Rates & Assumptions
        retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
        returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
        historicalYear: historicalYear || undefined,
        inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
        inflationShockDuration,
        dividendYield,
        // Healthcare costs
        includeMedicare, medicarePremium, medicalInflation,
        irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
        includeLTC, ltcAnnualCost, ltcProbability, ltcDuration, ltcOnsetAge,
        ltcAgeRangeStart, ltcAgeRangeEnd,
        // Roth conversion strategy
        enableRothConversions, targetConversionBracket,
        // Bond glide path
        bondGlidePath,
      };

      console.log('[CALC] Calling web worker with inputs...');
      let batchResult: BatchSummary;
      try {
        batchResult = await runMonteCarloViaWorker(inputs, currentSeed, simCount);
        console.log('[CALC] Web worker completed successfully, batch summary:', batchResult);
        console.log('[CALC] p50BalancesReal length:', batchResult?.p50BalancesReal?.length);
        console.log('[CALC] p10BalancesReal length:', batchResult?.p10BalancesReal?.length);
        console.log('[CALC] p90BalancesReal length:', batchResult?.p90BalancesReal?.length);
        console.log('[CALC] y1AfterTaxReal_p50:', batchResult?.y1AfterTaxReal_p50);
        console.log('[CALC] eolReal_p50:', batchResult?.eolReal_p50);
        console.log('[CALC] probRuin:', batchResult?.probRuin);
      } catch (workerError) {
        console.error('[CALC] Worker failed with error:', workerError);
        throw workerError;
      }

      // Validate batch summary has required data
      if (!batchResult || !batchResult.p50BalancesReal || batchResult.p50BalancesReal.length === 0) {
        console.error('[CALC] Invalid batch summary received:', batchResult);
        throw new Error('Monte Carlo simulation returned invalid results');
      }

      console.log('[CALC] Starting data reconstruction...');
      // Reason: chart data points have dynamic keys that vary by simulation mode
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: any[] = [];
      for (let i = 0; i < batchResult.p50BalancesReal.length; i++) {
        const yr = getCurrYear() + i;
        const a1 = age1 + i;
        const a2 = isMar ? age2 + i : null;
        const realBal = batchResult.p50BalancesReal[i];
        const nomBal = realBal * Math.pow(1 + infl, i);
        const p10Nom = batchResult.p10BalancesReal[i] * Math.pow(1 + infl, i);
        const p90Nom = batchResult.p90BalancesReal[i] * Math.pow(1 + infl, i);

        data.push({ year: yr, a1, a2, bal: nomBal, real: realBal, p10: p10Nom, p90: p90Nom });
      }
      console.log('[CALC] Data reconstruction complete, data length:', data.length);

      // Use conservative average (P25-P50) for key metrics
      console.log('[CALC] Calculating key metrics...');
      const finReal = batchResult.p50BalancesReal[yrsToRet];
      const finNom = finReal * Math.pow(1 + infl, yrsToRet);

      const wdRealY1 = (batchResult.y1AfterTaxReal_p25 + batchResult.y1AfterTaxReal_p50) / 2;
      const infAdj = Math.pow(1 + infl, yrsToRet);
      const wdAfterY1 = wdRealY1 * infAdj;
      const wdGrossY1 = wdAfterY1 / (1 - 0.15);

      const eolReal = (batchResult.eolReal_p25 + batchResult.eolReal_p50) / 2;
      const yearsFrom2025 = yrsToRet + yrsToSim;
      const eolWealth = eolReal * Math.pow(1 + infl, yearsFrom2025);
      console.log('[CALC] Key metrics calculated - finReal:', finReal, 'eolWealth:', eolWealth);

      console.log('[CALC] Starting RMD calculation, yrsToSim:', yrsToSim);
      const rmdData: { age: number; spending: number; rmd: number }[] = [];
      for (let y = 1; y <= yrsToSim; y++) {
        const currentAge = age1 + yrsToRet + y;
        if (currentAge >= RMD_START_AGE) {
          const yearIndex = yrsToRet + y;
          if (yearIndex < batchResult.p50BalancesReal.length) {
            const totalBalReal = batchResult.p50BalancesReal[yearIndex];
            const totalBalNom = totalBalReal * Math.pow(1 + infl, yearIndex);
            const estimatedPretaxBal = totalBalNom * initialPretaxRatio;

            const requiredRMD = calcRMD(estimatedPretaxBal, currentAge);

            let ssAnnualBenefit = 0;
            if (includeSS) {
              if (currentAge >= ssClaimAge) {
                ssAnnualBenefit += calcSocialSecurity(ssIncome, ssClaimAge);
              }
              if (isMar) {
                const currentAge2 = age2 + yrsToRet + y;
                if (currentAge2 >= ssClaimAge2) {
                  ssAnnualBenefit += calcSocialSecurity(ssIncome2, ssClaimAge2);
                }
              }
            }

            const currWdGross = wdGrossY1 * Math.pow(1 + infl, y);
            const netSpendingNeed = Math.max(0, currWdGross - ssAnnualBenefit);

            rmdData.push({ age: currentAge, spending: netSpendingNeed, rmd: requiredRMD });
          }
        }
      }
      console.log('[CALC] RMD calculation complete, rmdData length:', rmdData.length);

      // Calculate estate tax
      console.log('[CALC] Calculating estate tax...');
      const yearOfDeath = getCurrYear() + (LIFE_EXP - older);
      const estateTax = calcEstateTax(eolWealth, marital, yearOfDeath, assumeTaxCutsExtended);
      const realEstateTax = estateTax * (eolReal / eolWealth);
      const netEstate = eolReal - realEstateTax;
      console.log('[CALC] Estate tax calculated - year:', yearOfDeath, 'estateTax:', estateTax, 'realEstateTax:', realEstateTax, 'netEstate:', netEstate);

      // Generational payout calculation (if enabled)
      console.log('[CALC] Checking generational payout, effectiveShowGen:', effectiveShowGen, 'netEstate > 0:', netEstate > 0);
      let genPayout: GenerationalPayout | null = null;

      if (effectiveShowGen && netEstate > 0) {
        console.log('[CALC] Starting generational payout calculation...');
        console.log('[CALC] hypBenAgesStr:', hypBenAgesStr);
        const benAges = hypBenAgesStr
          .split(',')
          .map(s => parseInt(s.trim(), 10))
          .filter(n => !isNaN(n) && n >= 0 && n < 90);
        console.log('[CALC] benAges parsed:', benAges);

        const totalAnnualDist = hypPerBen * Math.max(1, numberOfBeneficiaries);
        const hasValidBeneficiaries = benAges.length > 0 && benAges.some(age => age >= 0);
        const hasValidDistribution = hypPerBen > 0 && totalAnnualDist > 0;

        if (!hasValidBeneficiaries || !hasValidDistribution) {
          console.log('[CALC] Skipping generational simulation - degenerate inputs:', {
            benAges, numberOfBeneficiaries, hypPerBen, totalAnnualDist,
            hasValidBeneficiaries, hasValidDistribution
          });
          genPayout = null;
        } else {
          try {
            // Calculate EOL values for all three percentiles
            console.log('[CALC] Calculating EOL percentiles...');
            const eolP25 = batchResult.eolReal_p25 * Math.pow(1 + infl, yearsFrom2025);
            const eolP50 = batchResult.eolReal_p50 * Math.pow(1 + infl, yearsFrom2025);
            const eolP75 = batchResult.eolReal_p75 * Math.pow(1 + infl, yearsFrom2025);
            console.log('[CALC] EOL percentiles - p25:', eolP25, 'p50:', eolP50, 'p75:', eolP75);

            // Calculate estate tax and net estate for each percentile
            console.log('[CALC] Calculating estate taxes for percentiles...');
            const estateTaxP25 = calcEstateTax(eolP25, marital, yearOfDeath, assumeTaxCutsExtended);
            const estateTaxP50 = calcEstateTax(eolP50, marital, yearOfDeath, assumeTaxCutsExtended);
            const estateTaxP75 = calcEstateTax(eolP75, marital, yearOfDeath, assumeTaxCutsExtended);

            const netEstateP25 = eolP25 - estateTaxP25;
            const netEstateP50 = eolP50 - estateTaxP50;
            const netEstateP75 = eolP75 - estateTaxP75;
            console.log('[CALC] Net estates - p25:', netEstateP25.toLocaleString(), 'p50:', netEstateP50.toLocaleString(), 'p75:', netEstateP75.toLocaleString());

            // Calculate Implied CAGR for Legacy Simulations
            const startingBalance = taxableBalance + pretaxBalance + rothBalance;
            const yearsTotal = yrsToRet + yrsToSim;

            const totalGrowthP25 = batchResult.eolReal_p25 / startingBalance;
            const impliedRealCAGR_P25 = Math.pow(totalGrowthP25, 1 / yearsTotal) - 1;
            const impliedNominal_P25 = ((1 + impliedRealCAGR_P25) * (1 + inflationRate / 100) - 1) * 100;

            const totalGrowthP75 = batchResult.eolReal_p75 / startingBalance;
            const impliedRealCAGR_P75 = Math.pow(totalGrowthP75, 1 / yearsTotal) - 1;
            const impliedNominal_P75 = ((1 + impliedRealCAGR_P75) * (1 + inflationRate / 100) - 1) * 100;

            console.log('[CALC] Implied CAGR - P25 Real:', (impliedRealCAGR_P25 * 100).toFixed(2) + '%, Nominal:', impliedNominal_P25.toFixed(2) + '%');
            console.log('[CALC] Implied CAGR - P50: Using user retRate:', retRate + '%');
            console.log('[CALC] Implied CAGR - P75 Real:', (impliedRealCAGR_P75 * 100).toFixed(2) + '%, Nominal:', impliedNominal_P75.toFixed(2) + '%');

            // Backfill younger generations if needed
            const backfilledBeneficiaries = backfillYoungerGenerations(
              benAges, numberOfBeneficiaries, fertilityWindowEnd, generationLength, totalFertilityRate
            );

            const adjustedStartBens = backfilledBeneficiaries.reduce((sum, b) => sum + b.size, 0);

            console.log('[BACKFILL] Summary:');
            console.log('[BACKFILL] Original beneficiaries:', numberOfBeneficiaries, 'at ages', benAges);
            console.log('[BACKFILL] Backfilled cohorts:', backfilledBeneficiaries.map(b => `Gen${b.generation}(age=${b.age}, size=${b.size.toFixed(2)})`).join(', '));
            console.log('[BACKFILL] Adjusted total beneficiaries:', adjustedStartBens.toFixed(2));

            const finalBenAges = backfilledBeneficiaries.length > 0
              ? backfilledBeneficiaries.map(b => b.age)
              : benAges.length > 0 ? benAges : [0];

            const finalStartBens = Math.max(1, Math.round(adjustedStartBens));

            console.log('[BACKFILL] Final parameters for worker:');
            console.log('[BACKFILL] - initialBenAges:', finalBenAges);
            console.log('[BACKFILL] - startBens:', finalStartBens);

            // Run generational wealth simulation for P25, P50, P75
            console.log('[CALC] Running generational simulations for P25, P50, P75...');

            const legacyParams = {
              startBens: finalStartBens,
              totalFertilityRate,
              generationLength,
              deathAge: Math.max(1, hypDeathAge),
              minDistAge: Math.max(0, hypMinDistAge),
              capYears: 10000,
              initialBenAges: finalBenAges,
              fertilityWindowStart,
              fertilityWindowEnd,
              marital,
            };

            const simP25 = await runLegacyViaWorker({
              ...legacyParams,
              eolNominal: netEstateP25,
              yearsFrom2025,
              nominalRet: impliedNominal_P25,
              inflPct: inflationRate,
              perBenReal: hypPerBen,
            });

            const simP50 = await runLegacyViaWorker({
              ...legacyParams,
              eolNominal: netEstateP50,
              yearsFrom2025,
              nominalRet: retRate,
              inflPct: inflationRate,
              perBenReal: hypPerBen,
            });

            const simP75 = await runLegacyViaWorker({
              ...legacyParams,
              eolNominal: netEstateP75,
              yearsFrom2025,
              nominalRet: impliedNominal_P75,
              inflPct: inflationRate,
              perBenReal: hypPerBen,
            });

            console.log('[CALC] Generational simulations completed - P25:', simP25, 'P50:', simP50, 'P75:', simP75);

            // Calculate empirical success rate from all MC simulations
            console.log('[SUCCESS RATE DEBUG] ====================');
            console.log('[SUCCESS RATE DEBUG] CALCULATING EMPIRICAL SUCCESS RATE FROM ALL 1,000 SIMULATIONS');
            console.log('[SUCCESS RATE DEBUG] ====================');

            const realReturnRate = realReturn(retRate, inflationRate);
            const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
            const sustainableDistRate = realReturnRate - populationGrowthRate;
            const minEstateRequired = totalAnnualDist / sustainableDistRate;
            const safeMinEstate = minEstateRequired * 1.05;

            console.log('[SUCCESS RATE DEBUG] Real return rate: ' + (realReturnRate * 100).toFixed(2) + '%');
            console.log('[SUCCESS RATE DEBUG] Population growth rate: ' + (populationGrowthRate * 100).toFixed(2) + '%');
            console.log('[SUCCESS RATE DEBUG] Sustainable distribution rate: ' + (sustainableDistRate * 100).toFixed(2) + '%');
            console.log('[SUCCESS RATE DEBUG] Total annual distribution: $' + totalAnnualDist.toLocaleString());
            console.log('[SUCCESS RATE DEBUG] Minimum estate required (with 5% safety): $' + safeMinEstate.toLocaleString());

            const allEstatesReal = batchResult.allRuns.map(run => run.eolReal);
            console.log('[SUCCESS RATE DEBUG] Total MC simulations: ' + allEstatesReal.length);

            const allEstatesAfterTax = allEstatesReal.map(eolRealVal => {
              const eolNominal = eolRealVal * Math.pow(1 + infl, yearsFrom2025);
              const estTax = calcEstateTax(eolNominal, marital, yearOfDeath, assumeTaxCutsExtended);
              return eolNominal - estTax;
            });

            const successCount = allEstatesAfterTax.filter(estate => estate >= safeMinEstate).length;
            const calculatedProbPerpetual = successCount / allEstatesAfterTax.length;
            const successRatePercent = Math.round(calculatedProbPerpetual * 100);

            console.log('[SUCCESS RATE DEBUG] Estates meeting perpetual threshold: ' + successCount + ' / ' + allEstatesAfterTax.length);
            console.log('[SUCCESS RATE DEBUG] SUCCESS RATE: ' + successRatePercent + '%');

            const sortedEstates = [...allEstatesAfterTax].sort((a, b) => a - b);
            console.log('[SUCCESS RATE DEBUG] Estate distribution:');
            console.log('[SUCCESS RATE DEBUG]   P10: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.10)].toLocaleString());
            console.log('[SUCCESS RATE DEBUG]   P25: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.25)].toLocaleString());
            console.log('[SUCCESS RATE DEBUG]   P50: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.50)].toLocaleString());
            console.log('[SUCCESS RATE DEBUG]   P75: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.75)].toLocaleString());
            console.log('[SUCCESS RATE DEBUG]   P90: $' + sortedEstates[Math.floor(allEstatesAfterTax.length * 0.90)].toLocaleString());
            console.log('[SUCCESS RATE DEBUG] ====================');

            console.log('[CALC] Calculated success rate:', calculatedProbPerpetual);

            // Build genPayout object
            console.log('[CALC] Building genPayout object...');
            genPayout = {
              perBenReal: hypPerBen,
              years: simP50.years,
              fundLeftReal: simP50.fundLeftReal,
              startBeneficiaries: Math.max(1, numberOfBeneficiaries),
              lastLivingCount: simP50.lastLivingCount,
              totalFertilityRate,
              generationLength,
              deathAge: Math.max(1, hypDeathAge),
              generationData: simP50.generationData || [],
              p10: {
                years: simP25.years,
                fundLeftReal: simP25.fundLeftReal,
                isPerpetual: simP25.fundLeftReal > 0,
                generationData: simP25.generationData || []
              },
              p50: {
                years: simP50.years,
                fundLeftReal: simP50.fundLeftReal,
                isPerpetual: simP50.fundLeftReal > 0,
                generationData: simP50.generationData || []
              },
              p90: {
                years: simP75.years,
                fundLeftReal: simP75.fundLeftReal,
                isPerpetual: simP75.fundLeftReal > 0,
                generationData: simP75.generationData || []
              },
              probPerpetual: calculatedProbPerpetual
            };
          } catch (genError: unknown) {
            console.error('[CALC] Generational simulation error:', genError);
            console.log('[CALC] Continuing with null genPayout due to error');
            genPayout = null;
          }
        }
      }
      console.log('[CALC] Generational payout complete, genPayout:', genPayout ? 'exists' : 'null');

      // Determine if ruined
      console.log('[CALC] Calculating survYrs, probRuin:', batchResult.probRuin);
      const survYrs = batchResult.probRuin > 0.5 ? yrsToSim - 5 : yrsToSim;
      console.log('[CALC] survYrs calculated:', survYrs);

      console.log('[CALC] Building newRes object...');
      newRes = {
        finNom,
        finReal,
        totC: total,
        data,
        yrsToRet,
        wd: wdGrossY1,
        wdAfter: wdAfterY1,
        wdReal: wdRealY1,
        survYrs,
        yrsToSim,
        eol: eolWealth,
        eolReal,
        estateTax: realEstateTax,
        estateTaxNominal: estateTax,
        netEstate,
        eolAccounts: {
          taxable: eolReal * initialTaxableRatio,
          pretax: eolReal * initialPretaxRatio,
          roth: eolReal * initialRothRatio,
        },
        totalRMDs: 0,
        genPayout,
        probRuin: batchResult.probRuin,
        rmdData,
        tax: {
          fedOrd: wdAfterY1 * 0.10,
          fedCap: wdAfterY1 * 0.05,
          niit: 0,
          state: wdAfterY1 * (stateRate / 100),
          tot: wdGrossY1 - wdAfterY1,
        },
      };

      console.log('[CALC] About to set result, newRes:', newRes);
      setRes(newRes);
      setIsDirty(false);
      setLegacyResult(calculateLegacyResult(newRes));
      setBatchSummary(batchResult);
      console.log('[CALC] Result set successfully');

      // Run guardrails analysis if we have failures
      if (batchResult && batchResult.probRuin > 0) {
        console.log('[CALC] Running guardrails analysis...');
        runGuardrailsAnalysis(batchResult);
      } else {
        setGuardrailsResult(null);
      }

      // Run Roth conversion optimizer
      console.log('[CALC] Running Roth conversion optimizer...');
      if (newRes) {
        runRothOptimizer(newRes);
      }

      soundPresets.formSuccess();
      console.log('[CALC] Calculation complete');

      // Track calculation for tab interface
      const isFirstCalculation = !lastCalculated;
      setLastCalculated(new Date());
      setInputsModified(false);

      // NAVIGATION BEHAVIOR:
      // - First calculation from Configure tab OR Wizard completion → Navigate to Results tab and scroll to top
      // - Recalculate from ANY other location → Stay on current tab, don't scroll
      const shouldNavigate = (isFirstCalculation && activeMainTab === 'configure') || isFromWizard;

      console.log('[CALC NAV] Navigation decision:', {
        shouldNavigate, isFirstCalculation, activeMainTab, isFromWizard
      });

      if (shouldNavigate) {
        console.log('[CALC NAV] Navigating to Results tab');
        setActiveMainTab('results');
        setIsFromWizard(false);
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
          setOlderAgeForAnalysis(olderAgeForAI);
          setIsLoadingAi(false);
        }, 800);
      } else {
        console.log('[CALC NAV] Staying on current tab:', activeMainTab);
        setOlderAgeForAnalysis(olderAgeForAI);
        setIsLoadingAi(false);
      }

    } catch (e: unknown) {
      console.error('[CALC] Calculation error:', e);
      setErr(e instanceof Error ? e.message : String(e));
      setRes(null);
      setIsLoadingAi(false);
    } finally {
      console.log('[CALC] Calculation complete, setting isRunning to false');
      setIsRunning(false);
      console.log('[CALC] Finished calculation, clearing loading state');
    }
  }, [
    age1, age2, retirementAge, isMar, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    showGen, total, marital,
    hypPerBen, numberOfBeneficiaries, hypDeathAge, hypMinDistAge,
    returnMode, seed, randomWalkSeries, historicalYear,
    inflationShockRate, inflationShockDuration,
    includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2, hypBenAgesStr,
    activeMainTab, setActiveMainTab, isFromWizard,
    runMonteCarloViaWorker, runLegacyViaWorker,
    includeMedicare, medicarePremium, medicalInflation,
    irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
    includeLTC, ltcAnnualCost, ltcProbability, ltcDuration, ltcOnsetAge,
    ltcAgeRangeStart, ltcAgeRangeEnd,
    totalFertilityRate, generationLength, fertilityWindowStart, fertilityWindowEnd,
    calculateLegacyResult, dividendYield, lastCalculated, runGuardrailsAnalysis,
    runRothOptimizer, enableRothConversions, targetConversionBracket, bondGlidePath,
    numChildren, childrenAges, additionalChildrenExpected,
    employmentType1, employmentType2, primaryIncome, spouseIncome, emergencyFund,
    assumeTaxCutsExtended,
    // State setters (stable references)
    setRes, setErr, setIsRunning, setIsDirty, setBatchSummary, setLegacyResult,
    setOlderAgeForAnalysis, setLastCalculated, setInputsModified,
    setGuardrailsResult, setAiInsight, setAiError, setIsLoadingAi,
    setComparisonData, setComparisonMode, setShowBearMarket, setShowInflationShock,
    setIsFromWizard, splashRef, tabGroupRef, workerRef, updatePlanConfig,
  ]);

  // ========================================
  // calculateSensitivity
  // ========================================

  const calculateSensitivity = useCallback((): SensitivityAnalysisData | null => {
    if (!res) return null;

    const baseInputs: SimulationInputs = {
      marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
      cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
      retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
      returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
      historicalYear: historicalYear || undefined,
      inflationShockRate: inflationShockRate > 0 ? inflationShockRate : null,
      inflationShockDuration,
      includeMedicare, medicarePremium, medicalInflation,
      irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
      includeLTC, ltcAnnualCost, ltcProbability, ltcDuration,
      ltcOnsetAge, ltcAgeRangeStart, ltcAgeRangeEnd,
      bondGlidePath,
    };

    const baselineSim = runSingleSimulation(baseInputs, seed);
    const baselineEOL = baselineSim.eolReal;
    const infl = inflationRate / 100;
    const younger = Math.min(age1, isMar ? age2 : age1);
    const older = Math.max(age1, isMar ? age2 : age1);
    const yearsFrom2025 = (LIFE_EXP - older);
    const baselineNominal = baselineEOL * Math.pow(1 + infl, yearsFrom2025);

    const variations: SensitivityVariation[] = [];

    // 1. Return Rate: ±2%
    const highReturnSim = runSingleSimulation({ ...baseInputs, retRate: retRate + 2 }, seed);
    const lowReturnSim = runSingleSimulation({ ...baseInputs, retRate: retRate - 2 }, seed);
    variations.push({
      label: "Return Rate",
      high: (highReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowReturnSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 2. Retirement Age: ±2 years
    const highRetAgeSim = runSingleSimulation({ ...baseInputs, retirementAge: retirementAge + 2 }, seed);
    const lowRetAgeSim = runSingleSimulation({ ...baseInputs, retirementAge: Math.max(younger + 5, retirementAge - 2) }, seed);
    variations.push({
      label: "Retirement Age",
      high: (highRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowRetAgeSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 3. Withdrawal Rate: ±0.5%
    const highWdSim = runSingleSimulation({ ...baseInputs, wdRate: wdRate + 0.5 }, seed);
    const lowWdSim = runSingleSimulation({ ...baseInputs, wdRate: wdRate - 0.5 }, seed);
    variations.push({
      label: "Withdrawal Rate",
      high: (lowWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (highWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((lowWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (highWdSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 4. Starting Savings: ±15%
    const savingsFactor = 0.15;
    const highSavingsSim = runSingleSimulation({
      ...baseInputs,
      taxableBalance: taxableBalance * (1 + savingsFactor),
      pretaxBalance: pretaxBalance * (1 + savingsFactor),
      rothBalance: rothBalance * (1 + savingsFactor),
    }, seed);
    const lowSavingsSim = runSingleSimulation({
      ...baseInputs,
      taxableBalance: taxableBalance * (1 - savingsFactor),
      pretaxBalance: pretaxBalance * (1 - savingsFactor),
      rothBalance: rothBalance * (1 - savingsFactor),
    }, seed);
    variations.push({
      label: "Starting Savings",
      high: (highSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowSavingsSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 5. Annual Contributions: ±15%
    const contribFactor = 0.15;
    const highContribSim = runSingleSimulation({
      ...baseInputs,
      cTax1: cTax1 * (1 + contribFactor),
      cPre1: cPre1 * (1 + contribFactor),
      cPost1: cPost1 * (1 + contribFactor),
      cMatch1: cMatch1 * (1 + contribFactor),
      cTax2: cTax2 * (1 + contribFactor),
      cPre2: cPre2 * (1 + contribFactor),
      cPost2: cPost2 * (1 + contribFactor),
      cMatch2: cMatch2 * (1 + contribFactor),
    }, seed);
    const lowContribSim = runSingleSimulation({
      ...baseInputs,
      cTax1: cTax1 * (1 - contribFactor),
      cPre1: cPre1 * (1 - contribFactor),
      cPost1: cPost1 * (1 - contribFactor),
      cMatch1: cMatch1 * (1 - contribFactor),
      cTax2: cTax2 * (1 - contribFactor),
      cPre2: cPre2 * (1 - contribFactor),
      cPost2: cPost2 * (1 - contribFactor),
      cMatch2: cMatch2 * (1 - contribFactor),
    }, seed);
    variations.push({
      label: "Annual Contributions",
      high: (highContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      low: (lowContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - baselineNominal,
      range: Math.abs((highContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025)) - (lowContribSim.eolReal * Math.pow(1 + infl, yearsFrom2025))),
    });

    // 6. Inflation Rate: ±0.5%
    const highInflSim = runSingleSimulation({ ...baseInputs, inflationRate: inflationRate + 0.5 }, seed);
    const lowInflSim = runSingleSimulation({ ...baseInputs, inflationRate: inflationRate - 0.5 }, seed);
    const highInflNominal = highInflSim.eolReal * Math.pow(1 + (inflationRate + 0.5) / 100, yearsFrom2025);
    const lowInflNominal = lowInflSim.eolReal * Math.pow(1 + (inflationRate - 0.5) / 100, yearsFrom2025);
    variations.push({
      label: "Inflation Rate",
      high: lowInflNominal - baselineNominal,
      low: highInflNominal - baselineNominal,
      range: Math.abs(lowInflNominal - highInflNominal),
    });

    // Sort by range (impact magnitude)
    variations.sort((a, b) => b.range - a.range);

    return { baseline: baselineNominal, variations };
  }, [
    res, marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear, inflationShockRate, inflationShockDuration,
    includeMedicare, medicarePremium, medicalInflation,
    irmaaThresholdSingle, irmaaThresholdMarried, irmaaSurcharge,
    includeLTC, ltcAnnualCost, ltcProbability, ltcDuration,
    ltcOnsetAge, ltcAgeRangeStart, ltcAgeRangeEnd,
    bondGlidePath, isMar, seed,
  ]);

  return {
    calc,
    calculateSensitivity,
    calculateLegacyResult,
    applyGenerationalPreset,
  };
}
