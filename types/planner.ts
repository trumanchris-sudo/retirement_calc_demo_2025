// types/planner.ts

import type { GenerationalPayout, BondGlidePath } from "./calculator";

export type FilingStatus = "single" | "married";
export type ReturnMode = "fixed" | "randomWalk";
export type WalkSeries = "nominal" | "real" | "trulyRandom";

// All inputs for the form (replaces 30+ useStates)
export type PlanState = {
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  infRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  showGen: boolean;
  hypPerBen: number;
  hypStartBens: number;
  totalFertilityRate: number;
  generationLength: number;
  hypDeathAge: number;
  hypBenAgesStr: string;
  fertilityWindowStart: number;
  fertilityWindowEnd: number;
  retMode: ReturnMode;
  seed: number;
  walkSeries: WalkSeries;
  isDarkMode: boolean;
  showP10: boolean;
  showP90: boolean;
  userQuestion: string;
};

// Action type for the reducer
export type PlanAction = {
  type: "UPDATE_FIELD";
  field: keyof PlanState;
  value: any;
};

// Cohort for generational wealth simulation
export type Cohort = {
  size: number;
  age: number;
};

// All inputs needed to run a single simulation
export type Inputs = {
  marital: FilingStatus;
  age1: number;
  age2: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  retRate: number;
  infRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  retMode: ReturnMode;
  walkSeries: WalkSeries;
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  // Bond allocation
  bondGlidePath?: BondGlidePath | null;
};

// Result from a single simulation
export type SimResult = {
  balancesReal: number[];
  eolReal: number;
  y1AfterTaxReal: number;
  ruined: boolean;
  survYrs?: number;  // Year when portfolio failed (0 if never failed)
};

// Summary statistics from running multiple seeds for truly random simulations
export type BatchSummary = {
  p10BalancesReal: number[];
  p50BalancesReal: number[];
  p90BalancesReal: number[];
  eolReal_p10?: number; // Optional for backward compatibility
  eolReal_p25: number;
  eolReal_p50: number;
  eolReal_p75: number;
  eolReal_p90?: number; // Optional for backward compatibility
  y1AfterTaxReal_p10?: number; // Optional for backward compatibility
  y1AfterTaxReal_p25: number;
  y1AfterTaxReal_p50: number;
  y1AfterTaxReal_p75: number;
  y1AfterTaxReal_p90?: number; // Optional for backward compatibility
  probRuin: number;
  allRuns: SimResult[];  // All simulation runs for empirical success rate calculation
};

// Guardrails analysis result showing impact of spending flexibility
export type GuardrailsResult = {
  totalFailures: number;
  preventableFailures: number;
  newSuccessRate: number;
  baselineSuccessRate: number;
  improvement: number;  // Percentage point improvement
};

// Roth conversion optimizer result
export type RothConversionResult = {
  hasRecommendation: boolean;
  reason?: string;  // Reason if no recommendation
  conversions?: {
    age: number;
    conversionAmount: number;
    tax: number;
    pretaxBalanceBefore: number;
  }[];
  conversionWindow?: {
    startAge: number;
    endAge: number;
    years: number;
  };
  totalConverted?: number;
  avgAnnualConversion?: number;
  lifetimeTaxSavings?: number;
  baselineLifetimeTax?: number;
  optimizedLifetimeTax?: number;
  rmdReduction?: number;
  rmdReductionPercent?: number;
  effectiveRateImprovement?: number;
  baselineRMDs?: { age: number; rmd: number; tax: number }[];
  optimizedRMDs?: { age: number; rmd: number; tax: number }[];
  targetBracket?: number;
  targetBracketLimit?: number;
};

// The final result object displayed to user
export type DisplayResult = {
  finNom: number;
  finReal: number;
  totC: number;
  data: {
    year: number;
    a1: number;
    a2: number | null;
    bal: number;
    real: number;
    p10?: number;
    p90?: number;
  }[];
  yrsToRet: number;
  wd: number;
  wdAfter: number;
  wdReal: number;
  survYrs: number;
  yrsToSim: number;
  eol: number;
  estateTax: number;
  netEstate: number;
  eolAccounts: {
    taxable: number;
    pretax: number;
    roth: number;
  };
  totalRMDs: number;
  genPayout: GenerationalPayout | null;
  tax: {
    fedOrd: number;
    fedCap: number;
    niit: number;
    state: number;
    tot: number;
  };
  probRuin?: number;
  rmdData?: {
    age: number;
    spending: number;
    rmd: number;
  }[];
  allRuns?: {
    year: number;
    balance: number;
  }[][];  // Array of runs, each run is an array of year/balance points
};

// Withdrawal tax calculation result
export type WithdrawalTaxResult = {
  ordinaryIncome: number;
  capGain: number;
  fedOrdTax: number;
  capGainTax: number;
  niitTax: number;
  stateTax: number;
  totalTax: number;
  netAmount: number;
};
