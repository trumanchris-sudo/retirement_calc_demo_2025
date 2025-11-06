// types/planner.ts

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
  hypBirthMultiple: number;
  hypBirthInterval: number;
  hypDeathAge: number;
  hypBenAgesStr: string;
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
};

// Result from a single simulation
export type SimResult = {
  balancesReal: number[];
  eolReal: number;
  y1AfterTaxReal: number;
  ruined: boolean;
};

// Summary statistics from running multiple seeds for truly random simulations
export type BatchSummary = {
  p10BalancesReal: number[];
  p50BalancesReal: number[];
  p90BalancesReal: number[];
  eolReal_p10: number;
  eolReal_p50: number;
  eolReal_p90: number;
  y1AfterTaxReal_p10: number;
  y1AfterTaxReal_p50: number;
  y1AfterTaxReal_p90: number;
  probRuin: number;
};

// Generational payout result
export type GenerationalPayout = {
  perBenReal: number;
  years: number;
  fundLeftReal: number;
  startBeneficiaries: number;
  lastLivingCount: number;
  birthMultiple: number;
  birthInterval: number;
  deathAge: number;
  benAges: number[];
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
