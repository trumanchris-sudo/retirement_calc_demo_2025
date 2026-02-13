/**
 * Retirement Calculation Engine
 * Core simulation logic for retirement planning
 *
 * This module uses shared calculation logic from ./shared/ to ensure
 * consistency with the Monte Carlo web worker.
 */

import type { ReturnMode, WalkSeries } from "@/types/planner";
import type { BondGlidePath } from "@/types/calculator";

// Import shared calculation functions and constants
// These are the single source of truth, also used by the Monte Carlo worker
import {
  // Constants
  LIFE_EXP,
  RMD_START_AGE,
  RMD_DIVISORS,
  SP500_YOY_NOMINAL,
  BOND_NOMINAL_AVG,
  TAX_BRACKETS,
  SS_BEND_POINTS,
  // Types
  type FilingStatus,
  // Utility functions
  mulberry32,
  getEffectiveInflation,
  // Tax calculations
  calcOrdinaryTax,
  calcLTCGTax,
  getIRMAASurcharge,
  // Bond allocation
  calculateBondReturn,
  calculateBondAllocation,
  calculateBlendedReturn,
  // Withdrawal taxes
  computeWithdrawalTaxes,
  // Return generator
  buildReturnGenerator as sharedBuildReturnGenerator,
  // RMD
  calcRMD as sharedCalcRMD,
  // Social Security
  calcSocialSecurity as sharedCalcSocialSecurity,
  calcPIA as sharedCalcPIA,
  calculateEffectiveSS as sharedCalculateEffectiveSS,
} from "./shared";

// Import from lib/constants for things not in shared (like estate tax, getCurrYear)
import { ESTATE_TAX_EXEMPTION, ESTATE_TAX_RATE, getCurrYear, IRMAA_BRACKETS_2026 } from "@/lib/constants";

// Re-export types and functions for consumers of this module
export type { FilingStatus };
export { getIRMAASurcharge, computeWithdrawalTaxes, calcOrdinaryTax, calcLTCGTax };

/**
 * Input parameters for a single simulation run
 */
export type SimulationInputs = {
  // Personal & Family
  marital: FilingStatus;
  age1: number;
  age2: number;
  retirementAge: number;
  numChildren?: number;
  childrenAges?: number[];
  additionalChildrenExpected?: number;
  // Employment & Income (used for income calculator sync)
  employmentType1?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other';
  primaryIncome?: number;
  spouseIncome?: number;
  // Account Balances
  emergencyFund?: number;  // Emergency fund (yields inflation rate only, no market exposure)
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  // Contributions
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;
  // Rates & Assumptions
  retRate: number;
  inflationRate: number;
  stateRate: number;
  incContrib: boolean;
  incRate: number;
  wdRate: number;
  returnMode: ReturnMode;
  randomWalkSeries: WalkSeries;
  // Social Security
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2: number;
  ssClaimAge2: number;
  // Scenario Testing
  historicalYear?: number;
  inflationShockRate?: number | null;
  inflationShockDuration?: number;
  // Healthcare costs
  includeMedicare?: boolean;
  medicarePremium?: number;
  medicalInflation?: number;
  irmaaThresholdSingle?: number;
  irmaaThresholdMarried?: number;
  irmaaSurcharge?: number;
  includeLTC?: boolean;
  ltcAnnualCost?: number;
  ltcProbability?: number;
  ltcDuration?: number;
  ltcOnsetAge?: number;
  // Deprecated: ltcAgeRangeStart/ltcAgeRangeEnd are kept for API compatibility but not used in calculations
  // Use ltcOnsetAge + ltcDuration instead
  ltcAgeRangeStart?: number;
  ltcAgeRangeEnd?: number;
  // Bond allocation
  bondGlidePath?: BondGlidePath | null;
  // Yield drag (annual tax on dividends/interest in taxable accounts)
  dividendYield?: number; // Annual dividend/interest yield % (default 2.0)
  // Roth conversion strategy
  enableRothConversions?: boolean;
  targetConversionBracket?: number; // e.g., 0.24 for 24% bracket
};

/**
 * Result from a single simulation run
 */
export type SimulationResult = {
  balancesReal: number[];      // real balance per year
  balancesNominal: number[];   // nominal balance per year (needed for UI)
  eolReal: number;            // end-of-life wealth (real)
  y1AfterTaxReal: number;     // year-1 after-tax withdrawal (real)
  ruined: boolean;            // true if ran out of money before age 95
  survYrs?: number;           // year when portfolio failed (0 if never failed)
  totalRothConversions?: number; // cumulative Roth conversions (pre-tax)
  conversionTaxesPaid?: number;  // cumulative conversion taxes paid
};

// ===============================
// Re-export shared functions as public API
// These delegate to the shared module (single source of truth)
// ===============================

/** Type for the return generator function */
type ReturnGeneratorFactory = () => Generator<number, void, unknown>;

/**
 * Build a generator that yields annual gross return factors.
 * Delegates to the shared implementation for consistency with Monte Carlo worker.
 */
export function buildReturnGenerator(options: {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  walkData?: number[];
  seed?: number;
  startYear?: number;
  bondGlidePath?: BondGlidePath | null;
  currentAge?: number;
}): ReturnGeneratorFactory {
  return sharedBuildReturnGenerator(options);
}

/**
 * Calculate Required Minimum Distribution
 * Delegates to the shared implementation.
 */
export function calcRMD(pretaxBalance: number, age: number): number {
  return sharedCalcRMD(pretaxBalance, age);
}

/**
 * Calculate Social Security annual benefit
 * Delegates to the shared implementation.
 */
export function calcSocialSecurity(
  avgAnnualIncome: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number {
  return sharedCalcSocialSecurity(avgAnnualIncome, claimAge, fullRetirementAge);
}

/**
 * Calculate Primary Insurance Amount (PIA) for Social Security
 * Delegates to the shared implementation.
 */
export function calcPIA(avgAnnualIncome: number): number {
  return sharedCalcPIA(avgAnnualIncome);
}

/**
 * Calculate effective Social Security benefits including spousal benefits
 * Delegates to the shared implementation.
 */
export function calculateEffectiveSS(
  ownPIA: number,
  spousePIA: number,
  ownClaimAge: number,
  fra: number = 67
): number {
  return sharedCalculateEffectiveSS(ownPIA, spousePIA, ownClaimAge, fra);
}

/**
 * Calculate combined Social Security benefits for a married couple with spousal benefits
 * @param ssIncome1 - Person 1's average annual career earnings
 * @param ssIncome2 - Person 2's average annual career earnings
 * @param claimAge1 - Person 1's claiming age
 * @param claimAge2 - Person 2's claiming age
 * @param fra - Full Retirement Age (typically 67)
 * @returns Total annual Social Security benefit for the couple
 */
export function calcCombinedSocialSecurity(
  ssIncome1: number,
  ssIncome2: number,
  claimAge1: number,
  claimAge2: number,
  fra: number = 67
): number {
  // Calculate each person's PIA
  const pia1 = calcPIA(ssIncome1);
  const pia2 = calcPIA(ssIncome2);

  // Calculate effective benefits considering spousal benefits
  const benefit1 = calculateEffectiveSS(pia1, pia2, claimAge1, fra);
  const benefit2 = calculateEffectiveSS(pia2, pia1, claimAge2, fra);

  // Return annual combined benefit
  return (benefit1 + benefit2) * 12;
}

/**
 * Calculate Estate Tax with OBBBA permanent exemption (July 2025)
 * OBBBA permanently set exemption at $15M single / $30M married, indexed for inflation starting 2027
 * @param totalEstate - Total estate value (all accounts)
 * @param status - Filing status (single or married)
 * @param year - Year of death (defaults to current year)
 * @param assumeExtended - Legacy parameter (kept for API compatibility, no longer affects calculation)
 */
export function calcEstateTax(
  totalEstate: number,
  status: FilingStatus = "single",
  year: number = getCurrYear(),
  assumeExtended: boolean = true // Default to true since OBBBA made exemption permanent
): number {
  let exemption: number;

  // OBBBA (July 2025) made the $15M/$30M exemption permanent
  // Apply inflation adjustment starting from 2027
  const baseExemption = ESTATE_TAX_EXEMPTION[status];

  if (year >= 2027) {
    // Inflation indexing starts in 2027
    const yearsAfter2026 = year - 2026;
    const inflationFactor = Math.pow(1.026, yearsAfter2026); // ~2.6% annual inflation
    exemption = baseExemption * inflationFactor;
  } else {
    // 2026 and earlier use base exemption
    exemption = baseExemption;
  }

  if (totalEstate <= exemption) return 0;
  const taxableEstate = totalEstate - exemption;
  return taxableEstate * ESTATE_TAX_RATE;
}

// Note: getIRMAASurcharge is imported from ./shared and re-exported
// See the shared module for the implementation

/**
 * Pre-Medicare Healthcare Cost Constants (in 2024 dollars)
 * For working years before Medicare eligibility at age 65
 * Sources: Kaiser Family Foundation Employer Health Benefits Survey 2024
 *
 * These costs represent employer-sponsored or ACA marketplace premiums
 * that individuals must pay during their working years.
 * Costs increase with age due to age-rating in insurance markets.
 */
const PRE_MEDICARE_HEALTHCARE_CONSTANTS = {
  // Base annual costs for individual coverage by age bracket
  individual: {
    under30: 4800,    // ~$400/month - younger workers, lower premiums
    age30to39: 6000,  // ~$500/month - early career
    age40to49: 8400,  // ~$700/month - mid-career, costs rising
    age50to54: 10800, // ~$900/month - approaching peak working years
    age55to59: 13200, // ~$1,100/month - pre-retirement, higher costs
    age60to64: 15600, // ~$1,300/month - highest pre-Medicare costs (3:1 age rating)
  },
  // Family coverage multiplier (spouse adds ~60-70% of individual cost)
  familyMultiplier: 2.5, // Total family cost is ~2.5x individual
  // Additional cost per dependent child
  perChildAdditional: 3000, // ~$250/month per child
  // Medicare eligibility age
  medicareAge: 65,
};

/**
 * Calculate pre-Medicare healthcare costs for a given age
 * @param age - Current age of the individual
 * @returns Annual healthcare cost in base-year dollars
 */
export function getPreMedicareHealthcareCost(age: number): number {
  if (age >= PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge) {
    return 0; // Medicare kicks in at 65
  }

  const { individual } = PRE_MEDICARE_HEALTHCARE_CONSTANTS;

  if (age < 30) return individual.under30;
  if (age < 40) return individual.age30to39;
  if (age < 50) return individual.age40to49;
  if (age < 55) return individual.age50to54;
  if (age < 60) return individual.age55to59;
  return individual.age60to64;
}

/**
 * Calculate total pre-Medicare healthcare costs for a household
 * @param age1 - Age of primary person
 * @param age2 - Age of spouse (null if single)
 * @param numChildren - Number of dependent children
 * @param medicalInflationFactor - Cumulative medical inflation factor
 * @returns Total annual healthcare cost in current-year dollars
 */
export function calculatePreMedicareHealthcareCosts(
  age1: number,
  age2: number | null,
  numChildren: number,
  medicalInflationFactor: number
): number {
  let totalCost = 0;

  // Person 1's healthcare cost (if under 65)
  const person1Cost = getPreMedicareHealthcareCost(age1);
  totalCost += person1Cost;

  // Person 2's healthcare cost (if married and under 65)
  if (age2 !== null) {
    const person2Cost = getPreMedicareHealthcareCost(age2);
    totalCost += person2Cost;
  }

  // Add per-child costs for dependent children
  if (numChildren > 0 && (age1 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge ||
      (age2 !== null && age2 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge))) {
    totalCost += numChildren * PRE_MEDICARE_HEALTHCARE_CONSTANTS.perChildAdditional;
  }

  // Apply medical inflation
  return totalCost * medicalInflationFactor;
}

/**
 * Child-related expense constants (in 2024 dollars, inflation-adjusted during simulation)
 * Sources: USDA Cost of Raising a Child, College Board Trends in College Pricing
 */
const CHILD_EXPENSE_CONSTANTS = {
  // Annual childcare costs for children under 6 (daycare/preschool)
  childcareAnnual: 15000,
  // Annual K-12 expenses (activities, supplies, etc. - public school assumption)
  k12Annual: 3000,
  // Annual college costs (tuition, room & board at public university)
  collegeAnnual: 25000,
  // Base dependent expenses (food, clothing, healthcare, etc.) - decreases with age
  dependentBaseAnnual: 8000,
  // Age thresholds
  childcareEndAge: 6,
  k12EndAge: 18,
  collegeEndAge: 22,
  dependentEndAge: 18, // Assumes financial support ends at 18 (or 22 if in college)
};

/**
 * Calculate annual child-related expenses for all children
 * @param childrenAges - Array of current children ages
 * @param simulationYear - Years into the simulation (for aging children)
 * @param inflationFactor - Cumulative inflation factor from simulation start
 * @returns Total annual child expenses in current-year dollars
 */
export function calculateChildExpenses(
  childrenAges: number[],
  simulationYear: number,
  inflationFactor: number
): number {
  if (!childrenAges || childrenAges.length === 0) return 0;

  let totalExpenses = 0;

  for (const startAge of childrenAges) {
    const currentAge = startAge + simulationYear;

    // Skip if child is 22+ (financially independent)
    if (currentAge >= CHILD_EXPENSE_CONSTANTS.collegeEndAge) continue;

    let childExpense = 0;

    // Childcare (ages 0-5)
    if (currentAge < CHILD_EXPENSE_CONSTANTS.childcareEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.childcareAnnual;
    }
    // K-12 expenses (ages 6-17)
    else if (currentAge < CHILD_EXPENSE_CONSTANTS.k12EndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.k12Annual;
    }
    // College expenses (ages 18-21)
    else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.collegeAnnual;
    }

    // Base dependent expenses (ages 0-17, or 18-21 if in college)
    if (currentAge < CHILD_EXPENSE_CONSTANTS.dependentEndAge) {
      // Dependent costs decrease as child ages (teens need less supervision)
      const ageFactor = currentAge < 6 ? 1.0 : currentAge < 13 ? 0.85 : 0.7;
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * ageFactor;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      // Reduced support during college years
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * 0.5;
    }

    totalExpenses += childExpense;
  }

  // Adjust for inflation
  return totalExpenses * inflationFactor;
}

/**
 * Calculate self-employment tax for self-employed individuals
 * Self-employment tax is 15.3% (12.4% Social Security + 2.9% Medicare) on net earnings
 * Half is deductible for income tax purposes
 * @param netEarnings - Net self-employment earnings
 * @returns Self-employment tax amount
 */
export function calculateSelfEmploymentTax(netEarnings: number): number {
  if (netEarnings <= 0) return 0;

  // 2026 Social Security wage base
  const SS_WAGE_BASE = 184500;
  const SS_RATE = 0.124; // 12.4% Social Security
  const MEDICARE_RATE = 0.029; // 2.9% Medicare
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
  const ADDITIONAL_MEDICARE_RATE = 0.009; // 0.9% additional Medicare

  // Self-employment earnings are calculated on 92.35% of net earnings
  const selfEmploymentEarnings = netEarnings * 0.9235;

  // Social Security tax (up to wage base)
  const ssTax = Math.min(selfEmploymentEarnings, SS_WAGE_BASE) * SS_RATE;

  // Medicare tax (no cap)
  let medicareTax = selfEmploymentEarnings * MEDICARE_RATE;

  // Additional Medicare tax on earnings over $200k
  if (selfEmploymentEarnings > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (selfEmploymentEarnings - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

/**
 * Calculate payroll taxes for W2 employee
 * Employee pays half of FICA (7.65% = 6.2% SS + 1.45% Medicare)
 * @param wages - W2 wages
 * @returns Employee portion of payroll taxes
 */
export function calculatePayrollTax(wages: number): number {
  if (wages <= 0) return 0;

  // 2026 Social Security wage base
  const SS_WAGE_BASE = 184500;
  const SS_RATE = 0.062; // 6.2% employee portion
  const MEDICARE_RATE = 0.0145; // 1.45% employee portion
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
  const ADDITIONAL_MEDICARE_RATE = 0.009; // 0.9% additional Medicare

  // Social Security tax (up to wage base)
  const ssTax = Math.min(wages, SS_WAGE_BASE) * SS_RATE;

  // Medicare tax (no cap)
  let medicareTax = wages * MEDICARE_RATE;

  // Additional Medicare tax on wages over $200k
  if (wages > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (wages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

/**
 * Calculate employment-related taxes based on employment type
 * @param income - Annual income
 * @param employmentType - Type of employment
 * @returns Annual employment taxes (payroll/self-employment)
 */
export function calculateEmploymentTaxes(
  income: number,
  employmentType: 'w2' | 'self-employed' | 'both' | 'retired' | 'other'
): number {
  if (income <= 0 || employmentType === 'retired' || employmentType === 'other') {
    return 0;
  }

  if (employmentType === 'w2') {
    return calculatePayrollTax(income);
  }

  if (employmentType === 'self-employed') {
    return calculateSelfEmploymentTax(income);
  }

  // 'both' - assume 50/50 split for simplicity
  const w2Portion = income * 0.5;
  const selfEmployedPortion = income * 0.5;
  return calculatePayrollTax(w2Portion) + calculateSelfEmploymentTax(selfEmployedPortion);
}

/**
 * Run a single simulation with the given inputs and seed.
 * Returns only the essential data needed for batch summaries.
 */
export function runSingleSimulation(params: SimulationInputs, seed: number): SimulationResult {
  const {
    marital, age1, age2, retirementAge, taxableBalance, pretaxBalance, rothBalance,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, inflationRate, stateRate, incContrib, incRate, wdRate,
    returnMode, randomWalkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
    inflationShockRate,
    inflationShockDuration = 5,
    dividendYield = 2.0, // Default 2% annual dividend yield for taxable accounts
    enableRothConversions = false,
    targetConversionBracket = 0.24, // Default to 24% bracket
    // Healthcare & Medicare
    includeMedicare = false,
    medicarePremium = 400,
    medicalInflation = 5.0,
    irmaaThresholdSingle = 109000,
    irmaaThresholdMarried = 218000,
    irmaaSurcharge = 230,
    // Long-Term Care
    includeLTC = false,
    ltcAnnualCost = 80000,
    ltcProbability = 50,
    ltcDuration = 2.5,
    ltcOnsetAge = 82,
    // Emergency Fund
    emergencyFund = 0,
    // Children & Family
    numChildren = 0,
    childrenAges = [] as number[],
    additionalChildrenExpected = 0,
    // Employment & Income
    primaryIncome = 0,
    spouseIncome = 0,
    employmentType1 = 'w2' as const,
    employmentType2 = 'w2' as const,
  } = params;

  // Input validation for critical numeric values
  if (isNaN(age1) || !isFinite(age1) || age1 < 0 || age1 > 120) {
    throw new Error(`Invalid age: ${age1}. Age must be between 0 and 120.`);
  }
  if (isNaN(retirementAge) || !isFinite(retirementAge) || retirementAge < 0 || retirementAge > 120) {
    throw new Error(`Invalid retirement age: ${retirementAge}. Retirement age must be between 0 and 120.`);
  }
  if (isNaN(retRate) || !isFinite(retRate)) {
    throw new Error(`Invalid return rate: ${retRate}. Return rate must be a valid number.`);
  }
  if (isNaN(inflationRate) || !isFinite(inflationRate) || inflationRate < 0) {
    throw new Error(`Invalid inflation rate: ${inflationRate}. Inflation rate must be a non-negative number.`);
  }
  if (isNaN(wdRate) || !isFinite(wdRate) || wdRate < 0 || wdRate > 100) {
    throw new Error(`Invalid withdrawal rate: ${wdRate}. Withdrawal rate must be between 0 and 100.`);
  }

  // Validate starting balances are non-negative numbers
  if (isNaN(taxableBalance) || !isFinite(taxableBalance) || taxableBalance < 0) {
    throw new Error(`Invalid taxable balance: ${taxableBalance}. Balance must be a non-negative number.`);
  }
  if (isNaN(pretaxBalance) || !isFinite(pretaxBalance) || pretaxBalance < 0) {
    throw new Error(`Invalid pre-tax balance: ${pretaxBalance}. Balance must be a non-negative number.`);
  }
  if (isNaN(rothBalance) || !isFinite(rothBalance) || rothBalance < 0) {
    throw new Error(`Invalid Roth balance: ${rothBalance}. Balance must be a non-negative number.`);
  }

  const isMar = marital === "married";

  // Validate age2 for married couples
  if (isMar && (age2 === undefined || age2 === null || isNaN(age2) || age2 < 18)) {
    throw new Error("Spouse age is required for married couples and must be 18 or older");
  }

  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);

  if (retirementAge <= younger) {
    throw new Error("Retirement age must be greater than current age");
  }

  const yrsToRet = retirementAge - younger;
  const g_fixed = 1 + retRate / 100;
  const infl = inflationRate / 100;
  const infl_factor = 1 + infl;

  // Track cumulative inflation for variable inflation scenarios
  let cumulativeInflation = 1.0;

  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const accGen = buildReturnGenerator({
    mode: returnMode,
    years: yrsToRet + 1,
    nominalPct: retRate,
    infPct: inflationRate,
    walkSeries: randomWalkSeries,
    seed: seed,
    startYear: historicalYear, // Pass historicalYear to handle bear market sequences naturally
    bondGlidePath: params.bondGlidePath || null,
    currentAge: younger,
  })();

  const drawGen = buildReturnGenerator({
    mode: returnMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: inflationRate,
    walkSeries: randomWalkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined, // Continue from retirement year
    bondGlidePath: params.bondGlidePath || null,
    currentAge: older + yrsToRet,
  })();

  let bTax = taxableBalance;
  let bPre = pretaxBalance;
  let bPost = rothBalance;
  let basisTax = taxableBalance;
  // Emergency fund: grows at inflation rate only (preserves purchasing power, no market risk)
  let bEmergency = emergencyFund;

  const balancesReal: number[] = [];
  const balancesNominal: number[] = [];
  const c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    // Generator handles historical sequences naturally via startYear
    const g = returnMode === "fixed" ? g_fixed : (accGen.next().value as number);

    const a1 = age1 + y;
    const a2 = isMar ? age2 + y : null;

    if (y > 0) {
      // Apply growth to all accounts
      bTax *= g;
      bPre *= g;
      bPost *= g;

      // Yield Drag: Tax annual dividends/interest in taxable account
      // Only applies to taxable brokerage account (bTax), not tax-advantaged accounts
      if (bTax > 0 && dividendYield > 0) {
        // Calculate annual yield income (dividends + interest)
        const yieldIncome = bTax * (dividendYield / 100);

        // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
        // Use 0 for ordinary income since this is just the dividend taxation
        const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

        // Reduce taxable balance by the tax paid (yield drag)
        // The yield income itself stays in the balance (already counted in bTax)
        bTax -= yieldTax;
      }
    }

    if (y > 0 && incContrib) {
      const f = 1 + incRate / 100;
      (Object.keys(c.p) as (keyof typeof c.p)[]).forEach((k) => (c.p[k] *= f));
      if (isMar)
        (Object.keys(c.s) as (keyof typeof c.s)[]).forEach((k) => (c.s[k] *= f));
    }

    const addMidYear = (amt: number) => amt * (1 + (g - 1) * 0.5);

    if (a1 < retirementAge) {
      bTax += addMidYear(c.p.tax);
      bPre += addMidYear(c.p.pre + c.p.match);
      bPost += addMidYear(c.p.post);
      basisTax += c.p.tax;
    }
    if (isMar && a2! < retirementAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    // Calculate child-related expenses during accumulation phase
    // Child expenses reduce savings available (subtracted from taxable account)
    if (childrenAges.length > 0 || numChildren > 0) {
      // Build effective children ages array
      const effectiveChildrenAges = [...childrenAges];

      // If numChildren specified but no ages, assume evenly spaced starting at age 5
      if (effectiveChildrenAges.length === 0 && numChildren > 0) {
        for (let i = 0; i < numChildren; i++) {
          effectiveChildrenAges.push(5 + i * 3); // Ages 5, 8, 11, etc.
        }
      }

      // Add expected future children (assumed to be born in early years)
      // Spread them over the first few years of simulation
      if (additionalChildrenExpected > 0 && y > 0) {
        const yearsToAddChildren = Math.min(additionalChildrenExpected * 2, yrsToRet);
        if (y <= yearsToAddChildren && (y % 2 === 0)) {
          // Add a child every 2 years (they start at age 0 at birth year)
          const childIndex = Math.floor(y / 2) - 1;
          if (childIndex < additionalChildrenExpected) {
            // Child is born in year y, so their age is 0 at that point
            // In subsequent years they age normally
            effectiveChildrenAges.push(0 - (y - 2)); // Will be negative initially, meaning not born yet
          }
        }
      }

      const childExpenses = calculateChildExpenses(
        effectiveChildrenAges,
        y,
        Math.pow(infl_factor, y) // Inflation factor for this year
      );

      // Child expenses reduce taxable savings (the most liquid account)
      // This represents decreased ability to save due to child-related costs
      if (childExpenses > 0 && a1 < retirementAge) {
        bTax = Math.max(0, bTax - childExpenses);
      }
    }

    // Calculate employment taxes during accumulation phase
    // This reduces effective savings capacity
    if (a1 < retirementAge && primaryIncome > 0) {
      const empTax1 = calculateEmploymentTaxes(primaryIncome * Math.pow(1 + incRate / 100, y), employmentType1);
      // Employment taxes are already accounted for in take-home pay used for contributions
      // But for self-employed, the full 15.3% comes out of pocket (vs 7.65% for W2)
      // The difference affects available savings
      if (employmentType1 === 'self-employed') {
        // Extra 7.65% burden for self-employed (employer portion)
        const extraTax = empTax1 * 0.5; // Approximate extra burden
        bTax = Math.max(0, bTax - extraTax);
      }
    }
    if (isMar && a2! < retirementAge && spouseIncome > 0) {
      if (employmentType2 === 'self-employed') {
        const empTax2 = calculateEmploymentTaxes(spouseIncome * Math.pow(1 + incRate / 100, y), employmentType2);
        const extraTax = empTax2 * 0.5;
        bTax = Math.max(0, bTax - extraTax);
      }
    }

    // Calculate pre-Medicare healthcare costs during accumulation phase
    // These are working-years healthcare expenses (employer premiums, ACA marketplace, etc.)
    // before Medicare eligibility at age 65
    if (a1 < retirementAge) {
      // Count dependent children for healthcare cost calculation
      let dependentChildCount = 0;
      if (childrenAges.length > 0) {
        // Count children under 26 (ACA allows dependent coverage until 26)
        dependentChildCount = childrenAges.filter(startAge => {
          const childAge = startAge + y;
          return childAge >= 0 && childAge < 26;
        }).length;
      } else if (numChildren > 0) {
        // Estimate based on numChildren - assume they're young
        dependentChildCount = numChildren;
      }

      // Medical inflation compounds faster than general inflation
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);

      const preMedicareHealthcareCost = calculatePreMedicareHealthcareCosts(
        a1,
        isMar ? a2 : null,
        dependentChildCount,
        medInflationFactor
      );

      // Healthcare costs reduce taxable savings (most liquid account)
      // This represents out-of-pocket premiums, deductibles, and other healthcare spending
      if (preMedicareHealthcareCost > 0) {
        bTax = Math.max(0, bTax - preMedicareHealthcareCost);
      }
    }

    // Emergency fund grows at inflation rate only (preserves real value)
    if (y > 0) {
      bEmergency *= infl_factor;
    }

    // Total balance includes emergency fund
    const bal = bTax + bPre + bPost + bEmergency;

    // Apply year-specific inflation (handles inflation shocks)
    const yearInflation = getEffectiveInflation(y, yrsToRet, inflationRate, inflationShockRate ?? null, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(bal / cumulativeInflation);
    balancesNominal.push(bal);
  }

  // Note: Emergency fund is kept separate for withdrawal strategy but included in total wealth
  const finNom = bTax + bPre + bPost + bEmergency;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const y1 = computeWithdrawalTaxes(
    wdGrossY1,
    marital,
    bTax,
    bPre,
    bPost,
    basisTax,
    stateRate,
    0, // No RMD for first year
    0  // No base ordinary income for first year
  );

  const wdAfterY1 = wdGrossY1 - y1.tax;
  const wdRealY1 = wdAfterY1 / infAdj;

  let retBalTax = bTax;
  let retBalPre = bPre;
  let retBalRoth = bPost;
  let retBalEmergency = bEmergency; // Emergency fund at retirement
  let currBasis = basisTax;
  let currWdGross = wdGrossY1;
  let survYrs = 0;
  let ruined = false;

  // Roth conversion tracking
  let totalRothConversions = 0;
  let conversionTaxesPaid = 0;

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    // Generator handles historical sequences naturally via startYear
    const g_retire = returnMode === "fixed" ? g_fixed : (drawGen.next().value as number);

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;
    // Emergency fund grows at inflation rate only (preserves purchasing power)
    retBalEmergency *= infl_factor;

    // Yield Drag: Tax annual dividends/interest in taxable account
    // Only applies to taxable brokerage account (retBalTax), not tax-advantaged accounts
    if (retBalTax > 0 && dividendYield > 0) {
      // Calculate annual yield income (dividends + interest)
      const yieldIncome = retBalTax * (dividendYield / 100);

      // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
      // Use 0 for ordinary income since this is just the dividend taxation
      const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

      // Reduce taxable balance by the tax paid (yield drag)
      // The yield income itself stays in the balance (already counted in retBalTax)
      retBalTax -= yieldTax;
    }

    const currentAge = age1 + yrsToRet + y;
    const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
    const requiredRMD = calcRMD(retBalPre, currentAge);

    let ssAnnualBenefit = 0;
    if (includeSS) {
      if (isMar) {
        // For married couples, calculate spousal benefits
        // Both spouses must have reached their respective claim ages
        const spouse1Eligible = currentAge >= ssClaimAge;
        const spouse2Eligible = currentAge2 >= ssClaimAge2;

        // Calculate PIAs for spousal benefit consideration
        const pia1 = calcPIA(ssIncome);
        const pia2 = calcPIA(ssIncome2);

        if (spouse1Eligible && spouse2Eligible) {
          // Both eligible - calculate with full spousal benefit consideration
          const benefit1 = calculateEffectiveSS(pia1, pia2, ssClaimAge);
          const benefit2 = calculateEffectiveSS(pia2, pia1, ssClaimAge2);
          ssAnnualBenefit = (benefit1 + benefit2) * 12;
        } else if (spouse1Eligible) {
          // Only spouse 1 eligible - use their own benefit (can't claim spousal yet)
          ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
        } else if (spouse2Eligible) {
          // Only spouse 2 eligible - use their own benefit (can't claim spousal yet)
          ssAnnualBenefit = calcSocialSecurity(ssIncome2, ssClaimAge2);
        }
        // If neither eligible, ssAnnualBenefit remains 0
      } else {
        // Single person - use standard calculation
        if (currentAge >= ssClaimAge) {
          ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
        }
      }
    }

    // Healthcare costs calculation
    let healthcareCost = 0;
    if (includeMedicare && currentAge >= 65) {
      // Base Medicare premium (adjusted for medical inflation from retirement)
      const yearsFromRetirement = y;
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, yearsFromRetirement);
      let annualMedicareCost = medicarePremium * 12 * medInflationFactor;

      // IRMAA surcharge based on tiered brackets (2026)
      // Use previous year's income (approximated by withdrawal + SS + RMD)
      const estimatedMAGI = currWdGross + ssAnnualBenefit + requiredRMD;
      const monthlyIrmaaSurcharge = getIRMAASurcharge(estimatedMAGI, isMar);
      annualMedicareCost += monthlyIrmaaSurcharge * 12 * medInflationFactor;

      // Double for married couples (both on Medicare)
      if (isMar && currentAge2 >= 65) {
        annualMedicareCost *= 2;
      }

      healthcareCost += annualMedicareCost;
    }

    // Long-Term Care costs (probabilistic)
    if (includeLTC && currentAge >= ltcOnsetAge) {
      // Apply LTC cost with probability factor (expected value approach)
      // LTC typically lasts ltcDuration years starting at onset age
      const yearsIntoLTC = currentAge - ltcOnsetAge;
      if (yearsIntoLTC < ltcDuration) {
        const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
        // Apply probability-weighted LTC cost
        healthcareCost += ltcAnnualCost * (ltcProbability / 100) * medInflationFactor;
      }
    }

    // Roth Conversion Strategy: Convert pre-tax to Roth before RMD age
    if (enableRothConversions && currentAge < RMD_START_AGE && retBalPre > 0 && retBalTax > 0) {
      // Find the bracket threshold for the target bracket rate
      const brackets = TAX_BRACKETS[marital];
      // First try exact match, then find nearest bracket if not found
      let targetBracket = brackets.rates.find(b => b.rate === targetConversionBracket);
      if (!targetBracket) {
        // Find the nearest bracket by rate
        targetBracket = brackets.rates.reduce((nearest, current) =>
          Math.abs(current.rate - targetConversionBracket) < Math.abs(nearest.rate - targetConversionBracket)
            ? current
            : nearest
        );
      }

      if (targetBracket) {
        // Calculate taxable ordinary income available before hitting target bracket
        // Current ordinary income = Social Security
        const currentOrdinaryIncome = ssAnnualBenefit;

        // Headroom = (bracket limit) - (standard deduction + current ordinary income)
        // This is how much more ordinary income we can add while staying in the target bracket
        const bracketThreshold = targetBracket.limit + brackets.deduction;
        const headroom = Math.max(0, bracketThreshold - currentOrdinaryIncome);

        if (headroom > 0) {
          // Conversion creates ordinary income, so convert up to headroom
          const maxConversion = Math.min(headroom, retBalPre);

          // Calculate tax on the conversion (it's taxed as ordinary income)
          const conversionTax = calcOrdinaryTax(currentOrdinaryIncome + maxConversion, marital) -
                                calcOrdinaryTax(currentOrdinaryIncome, marital);

          // Can only convert what we can afford to pay tax on from taxable account
          const affordableConversion = conversionTax > 0 ?
            Math.min(maxConversion, retBalTax / conversionTax * maxConversion) :
            maxConversion;

          if (affordableConversion > 0) {
            // Perform the conversion
            const actualConversion = Math.min(affordableConversion, retBalPre);
            const actualTax = calcOrdinaryTax(currentOrdinaryIncome + actualConversion, marital) -
                             calcOrdinaryTax(currentOrdinaryIncome, marital);

            retBalPre -= actualConversion;
            retBalRoth += actualConversion;
            retBalTax -= actualTax;

            totalRothConversions += actualConversion;
            conversionTaxesPaid += actualTax;
          }
        }
      }
    }

    // Calculate child expenses during retirement (if children still dependent)
    let childExpensesDuringRetirement = 0;
    if (childrenAges.length > 0 || numChildren > 0) {
      const effectiveChildrenAges = [...childrenAges];
      if (effectiveChildrenAges.length === 0 && numChildren > 0) {
        for (let i = 0; i < numChildren; i++) {
          effectiveChildrenAges.push(5 + i * 3);
        }
      }
      // Calculate child expenses at current simulation year (yrsToRet + y)
      childExpensesDuringRetirement = calculateChildExpenses(
        effectiveChildrenAges,
        yrsToRet + y,
        Math.pow(infl_factor, yrsToRet + y)
      );
    }

    // Total spending need = base withdrawal + healthcare costs + child expenses - Social Security
    const netSpendingNeed = Math.max(0, currWdGross + healthcareCost + childExpensesDuringRetirement - ssAnnualBenefit);
    let actualWithdrawal = netSpendingNeed;
    let rmdExcess = 0;

    if (requiredRMD > 0) {
      if (requiredRMD > netSpendingNeed) {
        actualWithdrawal = requiredRMD;
        rmdExcess = requiredRMD - netSpendingNeed;
      }
    }

    const taxes = computeWithdrawalTaxes(
      actualWithdrawal,
      marital,
      retBalTax,
      retBalPre,
      retBalRoth,
      currBasis,
      stateRate,
      requiredRMD,      // Pass RMD as minimum pre-tax draw
      ssAnnualBenefit   // Pass Social Security as base ordinary income
    );

    retBalTax -= taxes.draw.t;
    retBalPre -= taxes.draw.p;
    retBalRoth -= taxes.draw.r;
    currBasis = taxes.newBasis;

    if (rmdExcess > 0) {
      const excessTax = calcOrdinaryTax(rmdExcess, marital);
      const excessAfterTax = rmdExcess - excessTax;
      retBalTax += excessAfterTax;
      currBasis += excessAfterTax;
    }

    if (retBalTax < 0) retBalTax = 0;
    if (retBalPre < 0) retBalPre = 0;
    if (retBalRoth < 0) retBalRoth = 0;

    // Include emergency fund in total wealth
    const totalNow = retBalTax + retBalPre + retBalRoth + retBalEmergency;

    // Apply year-specific inflation (handles inflation shocks)
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, inflationRate, inflationShockRate ?? null, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    balancesReal.push(totalNow / cumulativeInflation);
    balancesNominal.push(totalNow);

    // Check if main portfolio is depleted (emergency fund is a separate safety net)
    const mainPortfolio = retBalTax + retBalPre + retBalRoth;
    if (mainPortfolio <= 0 && retBalEmergency <= 0) {
      if (!ruined) {
        survYrs = y - 1;
        ruined = true;
      }
      retBalTax = retBalPre = retBalRoth = retBalEmergency = 0;
    } else if (mainPortfolio <= 0 && retBalEmergency > 0) {
      // Use emergency fund as fallback when main portfolio is depleted
      const emergencyDraw = Math.min(currWdGross, retBalEmergency);
      retBalEmergency -= emergencyDraw;
      retBalTax = retBalPre = retBalRoth = 0;
      survYrs = y;
    } else {
      survYrs = y;
    }

    currWdGross *= infl_factor;
  }

  const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth + retBalEmergency);
  const yearsFrom2025 = yrsToRet + yrsToSim;
  // Use cumulativeInflation to match the balancesReal array deflation (accounts for inflation shocks)
  // This is consistent with the Monte Carlo worker implementation
  const eolReal = eolWealth / cumulativeInflation;

  return {
    balancesReal,
    balancesNominal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
    survYrs,  // Include survYrs for consistency with Monte Carlo worker
    totalRothConversions,
    conversionTaxesPaid,
  };
}
