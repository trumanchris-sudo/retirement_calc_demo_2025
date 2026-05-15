import type { PlanConfig } from '@/types/plan-config';
import { createDefaultPlanConfig } from '@/types/plan-config';
import type { BondGlidePath } from '@/types/calculator';
import type { SimulationInputs } from './retirementEngine';

export interface BuildSimulationInputsOptions {
  defaults?: PlanConfig;
  bondGlidePath?: BondGlidePath | null;
  historicalYearOverride?: number | null;
  inflationShockRateOverride?: number | null;
  inflationShockDurationOverride?: number;
}

const DEFAULTS = createDefaultPlanConfig();

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([a], [b]) => a.localeCompare(b));

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`;
  }

  return JSON.stringify(value);
}

function hashString(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) - hash) + value.charCodeAt(i);
    hash |= 0;
  }

  return hash.toString(36);
}

function resolveHistoricalYear(
  planConfig: PlanConfig,
  defaults: PlanConfig,
  override: number | null | undefined
): number | undefined {
  const value = override !== undefined
    ? override
    : planConfig.historicalYear ?? defaults.historicalYear;

  return value ?? undefined;
}

function resolveInflationShockRate(
  planConfig: PlanConfig,
  defaults: PlanConfig,
  override: number | null | undefined
): number | null {
  const value = override !== undefined
    ? override
    : planConfig.inflationShockRate ?? defaults.inflationShockRate;

  return value != null && value > 0 ? value : null;
}

export function buildSimulationInputs(
  planConfig: PlanConfig,
  options: BuildSimulationInputsOptions = {}
): SimulationInputs {
  const D = options.defaults ?? DEFAULTS;

  return {
    marital: planConfig.marital ?? D.marital,
    age1: planConfig.age1 ?? D.age1,
    age2: planConfig.age2 ?? D.age2,
    retirementAge: planConfig.retirementAge ?? D.retirementAge,
    numChildren: planConfig.numChildren ?? D.numChildren,
    childrenAges: [...(planConfig.childrenAges ?? D.childrenAges)],
    additionalChildrenExpected: planConfig.additionalChildrenExpected ?? D.additionalChildrenExpected,

    employmentType1: planConfig.employmentType1 ?? D.employmentType1,
    employmentType2: planConfig.employmentType2 ?? D.employmentType2,
    primaryIncome: planConfig.primaryIncome ?? D.primaryIncome,
    spouseIncome: planConfig.spouseIncome ?? D.spouseIncome,

    emergencyFund: planConfig.emergencyFund ?? D.emergencyFund,
    taxableBalance: planConfig.taxableBalance ?? D.taxableBalance,
    pretaxBalance: planConfig.pretaxBalance ?? D.pretaxBalance,
    rothBalance: planConfig.rothBalance ?? D.rothBalance,

    cTax1: planConfig.cTax1 ?? D.cTax1,
    cPre1: planConfig.cPre1 ?? D.cPre1,
    cPost1: planConfig.cPost1 ?? D.cPost1,
    cMatch1: Math.max(0, planConfig.cMatch1 ?? D.cMatch1),
    cTax2: planConfig.cTax2 ?? D.cTax2,
    cPre2: planConfig.cPre2 ?? D.cPre2,
    cPost2: planConfig.cPost2 ?? D.cPost2,
    cMatch2: Math.max(0, planConfig.cMatch2 ?? D.cMatch2),

    retRate: planConfig.retRate ?? D.retRate,
    inflationRate: planConfig.inflationRate ?? D.inflationRate,
    stateRate: planConfig.stateRate ?? D.stateRate,
    incContrib: planConfig.incContrib ?? D.incContrib,
    incRate: planConfig.incRate ?? D.incRate,
    wdRate: planConfig.wdRate ?? D.wdRate,
    returnMode: planConfig.returnMode ?? D.returnMode,
    randomWalkSeries: planConfig.randomWalkSeries ?? D.randomWalkSeries,

    includeSS: planConfig.includeSS ?? D.includeSS,
    ssIncome: planConfig.ssIncome ?? D.ssIncome,
    ssClaimAge: planConfig.ssClaimAge ?? D.ssClaimAge,
    ssIncome2: planConfig.ssIncome2 ?? D.ssIncome2,
    ssClaimAge2: planConfig.ssClaimAge2 ?? D.ssClaimAge2,

    historicalYear: resolveHistoricalYear(planConfig, D, options.historicalYearOverride),
    inflationShockRate: resolveInflationShockRate(planConfig, D, options.inflationShockRateOverride),
    inflationShockDuration:
      options.inflationShockDurationOverride ??
      planConfig.inflationShockDuration ??
      D.inflationShockDuration,

    includeMedicare: planConfig.includeMedicare ?? D.includeMedicare,
    medicarePremium: planConfig.medicarePremium ?? D.medicarePremium,
    medicalInflation: planConfig.medicalInflation ?? D.medicalInflation,
    irmaaThresholdSingle: planConfig.irmaaThresholdSingle ?? D.irmaaThresholdSingle,
    irmaaThresholdMarried: planConfig.irmaaThresholdMarried ?? D.irmaaThresholdMarried,
    irmaaSurcharge: planConfig.irmaaSurcharge ?? D.irmaaSurcharge,
    includeLTC: planConfig.includeLTC ?? D.includeLTC,
    ltcAnnualCost: planConfig.ltcAnnualCost ?? D.ltcAnnualCost,
    ltcProbability: planConfig.ltcProbability ?? D.ltcProbability,
    ltcDuration: planConfig.ltcDuration ?? D.ltcDuration,
    ltcOnsetAge: planConfig.ltcOnsetAge ?? D.ltcOnsetAge,
    ltcAgeRangeStart: planConfig.ltcAgeRangeStart ?? D.ltcAgeRangeStart,
    ltcAgeRangeEnd: planConfig.ltcAgeRangeEnd ?? D.ltcAgeRangeEnd,

    bondGlidePath: options.bondGlidePath ?? null,
    dividendYield: planConfig.dividendYield ?? D.dividendYield,

    enableRothConversions: planConfig.enableRothConversions ?? D.enableRothConversions,
    targetConversionBracket: planConfig.targetConversionBracket ?? D.targetConversionBracket,
  };
}

export function hashSimulationInputs(inputs: SimulationInputs): string {
  return hashString(stableStringify(inputs));
}

export function hashPlanSimulationInputs(
  planConfig: PlanConfig,
  options: BuildSimulationInputsOptions = {}
): string {
  return hashSimulationInputs(buildSimulationInputs(planConfig, options));
}
