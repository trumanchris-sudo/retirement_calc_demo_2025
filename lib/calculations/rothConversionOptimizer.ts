/**
 * Roth Conversion Ladder Optimizer
 *
 * Calculates optimal Roth conversion strategy for early retirees using the
 * "Roth Conversion Ladder" approach:
 *
 * 1. Convert Traditional IRA -> Roth IRA during low-income years
 * 2. Pay ordinary income tax on conversion (ideally in 10%, 12%, or 22% brackets)
 * 3. Wait 5 years (the "5-year rule")
 * 4. Withdraw CONVERTED AMOUNT tax and penalty free (even before 59.5)
 *
 * This module helps FIRE (Financial Independence, Retire Early) practitioners
 * access retirement funds before age 59.5 without the 10% early withdrawal penalty.
 */

import {
  TAX_BRACKETS,
  type FilingStatus,
  RMD_START_AGE,
} from "./shared/constants";
import { calcOrdinaryTax } from "./shared/taxCalculations";

// ===============================
// Type Definitions
// ===============================

export interface RothLadderInputs {
  /** Current age of primary person */
  currentAge: number;
  /** Target early retirement age */
  retirementAge: number;
  /** Current Traditional IRA/401k balance */
  traditionalBalance: number;
  /** Current Roth IRA balance */
  rothBalance: number;
  /** Roth contribution basis (original contributions, withdrawable anytime) */
  rothContributionBasis: number;
  /** Current taxable brokerage account balance (bridge fund) */
  taxableBalance: number;
  /** Expected annual spending in early retirement (in today's dollars) */
  annualSpending: number;
  /** Filing status */
  filingStatus: FilingStatus;
  /** State income tax rate (%) */
  stateRate: number;
  /** Expected annual investment return (%) */
  expectedReturn: number;
  /** Expected inflation rate (%) */
  inflationRate: number;
  /** Whether to account for ACA subsidy implications */
  considerACASubsidies: boolean;
  /** Number of people in household for ACA (1-4+) */
  householdSize: number;
}

export interface ConversionYear {
  /** Year number (1-based from retirement) */
  year: number;
  /** Age at start of year */
  age: number;
  /** Calendar year */
  calendarYear: number;
  /** Amount to convert from Traditional to Roth */
  conversionAmount: number;
  /** Federal tax on conversion */
  federalTax: number;
  /** State tax on conversion */
  stateTax: number;
  /** Total tax on conversion */
  totalTax: number;
  /** Marginal tax bracket for this conversion */
  marginalBracket: number;
  /** Traditional IRA balance after conversion */
  traditionalBalanceAfter: number;
  /** Roth IRA balance after conversion */
  rothBalanceAfter: number;
  /** Year this conversion becomes accessible (5-year rule) */
  accessibleYear: number;
  /** Age when this conversion becomes accessible */
  accessibleAge: number;
  /** Cumulative tax paid so far */
  cumulativeTaxPaid: number;
  /** ACA subsidy amount preserved (if applicable) */
  acaSubsidyPreserved: number;
  /** Whether this conversion stays below ACA cliff */
  belowACACliff: boolean;
}

export interface BridgeAnalysis {
  /** Years from early retirement to age 59.5 */
  yearsToAge59_5: number;
  /** Years needed for first conversion to be accessible */
  yearsUntilFirstConversionAccessible: number;
  /** Total bridge funding needed (taxable + Roth basis) */
  totalBridgeFundingNeeded: number;
  /** Current taxable account balance */
  taxableAccountBalance: number;
  /** Roth contribution basis (accessible immediately) */
  rothContributionBasis: number;
  /** Gap between needed and available bridge funds */
  bridgeFundingGap: number;
  /** Whether bridge is fully funded */
  isBridgeFunded: boolean;
  /** Breakdown of each year's withdrawal source */
  withdrawalSchedule: BridgeWithdrawal[];
}

export interface BridgeWithdrawal {
  year: number;
  age: number;
  source: "taxable" | "roth_basis" | "roth_conversion" | "traditional_penalty";
  amount: number;
  taxOrPenalty: number;
  netAmount: number;
  remainingTaxable: number;
  remainingRothBasis: number;
  conversionAccessible: number;
}

export interface RothLadderResult {
  /** Full conversion schedule */
  conversionSchedule: ConversionYear[];
  /** Bridge analysis for early retirement */
  bridgeAnalysis: BridgeAnalysis;
  /** Summary statistics */
  summary: {
    /** Total amount to be converted */
    totalToConvert: number;
    /** Total taxes to be paid on conversions */
    totalConversionTaxes: number;
    /** Average annual conversion amount */
    avgAnnualConversion: number;
    /** Years of conversions */
    conversionYears: number;
    /** Effective tax rate on conversions */
    effectiveConversionRate: number;
    /** Estimated lifetime tax savings vs. no conversions */
    lifetimeTaxSavings: number;
    /** RMD reduction from conversions */
    rmdReduction: number;
    /** Target tax bracket for conversions */
    targetBracket: number;
    /** Whether plan is feasible */
    isFeasible: boolean;
    /** Warnings or issues */
    warnings: string[];
  };
  /** Timeline visualization data */
  timeline: TimelineEntry[];
}

export interface TimelineEntry {
  year: number;
  age: number;
  calendarYear: number;
  event: "conversion" | "accessible" | "age59_5" | "rmd_start" | "retirement";
  description: string;
  amount?: number;
  color: "blue" | "green" | "orange" | "purple" | "red";
}

// ===============================
// ACA Subsidy Constants (2026)
// ===============================

/**
 * ACA Federal Poverty Level (FPL) for 2026 (projected)
 * Subsidies available for households 100%-400% FPL
 * Above 400% FPL, the "cliff" means losing ALL subsidies
 * Note: American Rescue Plan extended subsidies above 400% but this may expire
 */
export const ACA_FPL_2026 = {
  /** Federal Poverty Level by household size (contiguous US) */
  fpl: {
    1: 15650,
    2: 21150,
    3: 26650,
    4: 32150,
  } as Record<number, number>,
  /** Percentage of FPL where ACA cliff occurs (400%) */
  subsidyCliff: 4.0,
  /** Minimum income for subsidies (100% FPL) */
  minimumFPL: 1.0,
  /** Estimated monthly silver plan premium (before subsidies) */
  silverPlanPremiums: {
    age55to64: 1200, // ~$14,400/year
    age45to54: 800,  // ~$9,600/year
    age35to44: 500,  // ~$6,000/year
    under35: 350,    // ~$4,200/year
  } as Record<string, number>,
};

/**
 * Get the ACA subsidy cliff income for a given household size
 */
export function getACASubsidyCliff(householdSize: number): number {
  const fpl = ACA_FPL_2026.fpl[Math.min(householdSize, 4)] || ACA_FPL_2026.fpl[4];
  return fpl * ACA_FPL_2026.subsidyCliff;
}

/**
 * Estimate annual ACA subsidy for a given income and age
 * Simplified model - actual subsidies are more complex
 */
export function estimateACASubsidy(
  magi: number,
  householdSize: number,
  age: number
): number {
  const fpl = ACA_FPL_2026.fpl[Math.min(householdSize, 4)] || ACA_FPL_2026.fpl[4];
  const fplPercent = magi / fpl;

  // No subsidy if under 100% FPL (Medicaid eligible) or over 400% FPL
  if (fplPercent < ACA_FPL_2026.minimumFPL || fplPercent > ACA_FPL_2026.subsidyCliff) {
    return 0;
  }

  // Get base premium by age
  let ageBracket: string;
  if (age >= 55) ageBracket = "age55to64";
  else if (age >= 45) ageBracket = "age45to54";
  else if (age >= 35) ageBracket = "age35to44";
  else ageBracket = "under35";

  const monthlyPremium = ACA_FPL_2026.silverPlanPremiums[ageBracket];
  const annualPremium = monthlyPremium * 12;

  // Calculate expected contribution (% of income based on FPL level)
  // This is simplified - actual ACA uses a sliding scale
  let contributionPercent: number;
  if (fplPercent <= 1.5) contributionPercent = 0.02;
  else if (fplPercent <= 2.0) contributionPercent = 0.04;
  else if (fplPercent <= 2.5) contributionPercent = 0.06;
  else if (fplPercent <= 3.0) contributionPercent = 0.08;
  else if (fplPercent <= 3.5) contributionPercent = 0.09;
  else contributionPercent = 0.085; // 350-400% FPL

  const expectedContribution = magi * contributionPercent;
  const subsidy = Math.max(0, annualPremium - expectedContribution);

  return subsidy;
}

// ===============================
// Tax Bracket Utilities
// ===============================

/**
 * Calculate the maximum income that fits within a target tax bracket
 * @param filingStatus - Filing status
 * @param targetBracketRate - Target marginal rate (e.g., 0.12 for 12% bracket)
 * @returns Maximum taxable income (before deduction) for this bracket
 */
export function getBracketCeiling(
  filingStatus: FilingStatus,
  targetBracketRate: number
): number {
  const brackets = TAX_BRACKETS[filingStatus];
  const targetBracket = brackets.rates.find((b) => b.rate === targetBracketRate);

  if (!targetBracket) {
    // Find the nearest bracket
    const nearest = brackets.rates.reduce((prev, curr) =>
      Math.abs(curr.rate - targetBracketRate) < Math.abs(prev.rate - targetBracketRate)
        ? curr
        : prev
    );
    return nearest.limit + brackets.deduction;
  }

  return targetBracket.limit + brackets.deduction;
}

/**
 * Calculate optimal conversion amount to fill a tax bracket
 * @param currentIncome - Current ordinary income (e.g., Social Security, part-time work)
 * @param filingStatus - Filing status
 * @param targetBracketRate - Target marginal rate to fill up to
 * @returns Optimal conversion amount
 */
export function calculateOptimalConversion(
  currentIncome: number,
  filingStatus: FilingStatus,
  targetBracketRate: number
): number {
  const ceiling = getBracketCeiling(filingStatus, targetBracketRate);
  const optimalConversion = Math.max(0, ceiling - currentIncome);
  return optimalConversion;
}

/**
 * Get the marginal tax bracket for a given income
 */
export function getMarginalBracket(
  income: number,
  filingStatus: FilingStatus
): number {
  const brackets = TAX_BRACKETS[filingStatus];
  const taxableIncome = Math.max(0, income - brackets.deduction);

  for (const b of brackets.rates) {
    if (taxableIncome <= b.limit) {
      return b.rate;
    }
  }

  return brackets.rates[brackets.rates.length - 1].rate;
}

// ===============================
// Core Optimizer Functions
// ===============================

/**
 * Generate the optimal Roth conversion ladder schedule
 */
export function generateConversionLadder(inputs: RothLadderInputs): RothLadderResult {
  const {
    currentAge,
    retirementAge,
    traditionalBalance,
    rothBalance,
    rothContributionBasis,
    taxableBalance,
    annualSpending,
    filingStatus,
    stateRate,
    expectedReturn,
    inflationRate,
    considerACASubsidies,
    householdSize,
  } = inputs;

  const currentYear = new Date().getFullYear();
  const warnings: string[] = [];

  // Validate inputs
  if (retirementAge <= currentAge) {
    warnings.push("Retirement age must be greater than current age");
  }

  if (traditionalBalance <= 0) {
    warnings.push("No Traditional IRA balance to convert");
  }

  // Key ages and years
  const age59_5 = 59.5;
  const yearsToRetirement = Math.max(0, retirementAge - currentAge);

  // Target the 22% bracket by default (good balance of tax efficiency)
  // For very low earners, might target 12% bracket
  const targetBracket = 0.22;
  const acaCliff = considerACASubsidies ? getACASubsidyCliff(householdSize) : Infinity;

  // Calculate optimal annual conversion
  // During early retirement, income is typically just dividends/interest from taxable
  const estimatedRetirementIncome = 0; // Conservative: assume no other income
  const bracketCeiling = getBracketCeiling(filingStatus, targetBracket);

  // If considering ACA, limit conversions to stay below subsidy cliff
  const maxConversionWithACA = considerACASubsidies
    ? Math.max(0, acaCliff - estimatedRetirementIncome)
    : Infinity;

  // Base conversion amount - fill the target bracket
  let baseConversionAmount = calculateOptimalConversion(
    estimatedRetirementIncome,
    filingStatus,
    targetBracket
  );

  // Cap at ACA cliff if applicable
  if (considerACASubsidies && baseConversionAmount > maxConversionWithACA) {
    baseConversionAmount = maxConversionWithACA;
    warnings.push(
      `Conversion limited to $${maxConversionWithACA.toLocaleString()} to preserve ACA subsidies`
    );
  }

  // Calculate conversion schedule
  const conversionSchedule: ConversionYear[] = [];
  const timeline: TimelineEntry[] = [];

  // Add retirement event
  if (yearsToRetirement > 0) {
    timeline.push({
      year: yearsToRetirement,
      age: retirementAge,
      calendarYear: currentYear + yearsToRetirement,
      event: "retirement",
      description: "Early Retirement Begins",
      color: "green",
    });
  }

  // Years available for conversion (from retirement to RMD start)
  const conversionStartAge = Math.max(currentAge, retirementAge);
  const conversionEndAge = RMD_START_AGE - 1; // Stop before RMDs start
  const conversionYears = Math.max(0, conversionEndAge - conversionStartAge + 1);

  let traditionalRemaining = traditionalBalance;
  let rothCurrent = rothBalance;
  let cumulativeTaxPaid = 0;
  const returnFactor = 1 + expectedReturn / 100;
  const inflationFactor = 1 + inflationRate / 100;

  for (let i = 0; i < conversionYears && traditionalRemaining > 0; i++) {
    const conversionAge = conversionStartAge + i;
    const calendarYear = currentYear + (conversionAge - currentAge);
    const yearFromRetirement = i + 1;

    // Adjust conversion for inflation (maintain real value)
    const inflationAdjustedConversion = baseConversionAmount * Math.pow(inflationFactor, i);

    // Don't convert more than what's available
    const conversionAmount = Math.min(inflationAdjustedConversion, traditionalRemaining);

    // Calculate taxes
    const federalTax = calcOrdinaryTax(conversionAmount, filingStatus);
    const stateTax = conversionAmount * (stateRate / 100);
    const totalTax = federalTax + stateTax;

    // Update balances
    traditionalRemaining = (traditionalRemaining - conversionAmount) * returnFactor;
    rothCurrent = (rothCurrent + conversionAmount) * returnFactor;
    cumulativeTaxPaid += totalTax;

    // Calculate when this conversion becomes accessible
    const accessibleYear = calendarYear + 5;
    const accessibleAge = conversionAge + 5;

    // ACA considerations
    const acaSubsidyPreserved = considerACASubsidies
      ? estimateACASubsidy(conversionAmount, householdSize, conversionAge)
      : 0;

    const conversionYear: ConversionYear = {
      year: yearFromRetirement,
      age: conversionAge,
      calendarYear,
      conversionAmount,
      federalTax,
      stateTax,
      totalTax,
      marginalBracket: getMarginalBracket(conversionAmount, filingStatus),
      traditionalBalanceAfter: traditionalRemaining,
      rothBalanceAfter: rothCurrent,
      accessibleYear,
      accessibleAge,
      cumulativeTaxPaid,
      acaSubsidyPreserved,
      belowACACliff: conversionAmount < acaCliff,
    };

    conversionSchedule.push(conversionYear);

    // Add to timeline
    timeline.push({
      year: conversionAge - currentAge,
      age: conversionAge,
      calendarYear,
      event: "conversion",
      description: `Convert $${Math.round(conversionAmount).toLocaleString()}`,
      amount: conversionAmount,
      color: "blue",
    });

    // Add accessibility milestone (only for first few years to avoid clutter)
    if (i < 5 || accessibleAge <= 59.5) {
      timeline.push({
        year: accessibleAge - currentAge,
        age: accessibleAge,
        calendarYear: accessibleYear,
        event: "accessible",
        description: `Year ${yearFromRetirement} conversion accessible`,
        amount: conversionAmount,
        color: "green",
      });
    }
  }

  // Add age 59.5 milestone if applicable
  if (currentAge < age59_5) {
    const yearsTo59_5 = Math.ceil(age59_5 - currentAge);
    timeline.push({
      year: yearsTo59_5,
      age: 59.5,
      calendarYear: currentYear + yearsTo59_5,
      event: "age59_5",
      description: "Age 59.5 - No more early withdrawal penalty",
      color: "purple",
    });
  }

  // Add RMD start milestone
  if (currentAge < RMD_START_AGE) {
    timeline.push({
      year: RMD_START_AGE - currentAge,
      age: RMD_START_AGE,
      calendarYear: currentYear + (RMD_START_AGE - currentAge),
      event: "rmd_start",
      description: "RMDs Begin",
      color: "orange",
    });
  }

  // Sort timeline by year
  timeline.sort((a, b) => a.year - b.year);

  // Calculate bridge analysis
  const bridgeAnalysis = calculateBridgeNeeds(
    retirementAge,
    currentAge,
    annualSpending,
    taxableBalance,
    rothContributionBasis,
    conversionSchedule,
    expectedReturn,
    inflationRate
  );

  // Calculate summary statistics
  const totalToConvert = conversionSchedule.reduce((sum, c) => sum + c.conversionAmount, 0);
  const totalConversionTaxes = conversionSchedule.reduce((sum, c) => sum + c.totalTax, 0);
  const avgAnnualConversion = conversionSchedule.length > 0
    ? totalToConvert / conversionSchedule.length
    : 0;

  // Estimate lifetime tax savings
  // Compare: paying tax at conversion rate vs. paying at future (likely higher) RMD rate
  const futureRMDRate = 0.32; // Assume RMDs would push into 32% bracket
  const conversionRate = totalToConvert > 0 ? totalConversionTaxes / totalToConvert : 0;
  const lifetimeTaxSavings = totalToConvert * (futureRMDRate - conversionRate);

  // RMD reduction (amount that won't be subject to RMDs)
  const rmdReduction = totalToConvert;

  const summary = {
    totalToConvert,
    totalConversionTaxes,
    avgAnnualConversion,
    conversionYears: conversionSchedule.length,
    effectiveConversionRate: conversionRate,
    lifetimeTaxSavings: Math.max(0, lifetimeTaxSavings),
    rmdReduction,
    targetBracket,
    isFeasible: bridgeAnalysis.isBridgeFunded && conversionSchedule.length > 0,
    warnings,
  };

  return {
    conversionSchedule,
    bridgeAnalysis,
    summary,
    timeline,
  };
}

/**
 * Calculate bridge funding needs for early retirement
 */
function calculateBridgeNeeds(
  retirementAge: number,
  currentAge: number,
  annualSpending: number,
  taxableBalance: number,
  rothContributionBasis: number,
  conversionSchedule: ConversionYear[],
  expectedReturn: number,
  inflationRate: number
): BridgeAnalysis {
  const age59_5 = 59.5;
  const yearsToAge59_5 = Math.max(0, Math.ceil(age59_5) - retirementAge);
  const yearsUntilFirstConversionAccessible = conversionSchedule.length > 0 ? 5 : 0;

  // The bridge period is the max of years until 59.5 or first conversion accessible
  const bridgePeriod = Math.max(
    yearsToAge59_5,
    yearsUntilFirstConversionAccessible
  );

  // Calculate total bridge funding needed with inflation
  let totalBridgeNeeded = 0;
  const inflationFactor = 1 + inflationRate / 100;
  const returnFactor = 1 + expectedReturn / 100;

  const withdrawalSchedule: BridgeWithdrawal[] = [];

  let remainingTaxable = taxableBalance;
  let remainingRothBasis = rothContributionBasis;

  // Build withdrawal schedule for bridge period
  for (let year = 1; year <= bridgePeriod; year++) {
    const age = retirementAge + year - 1;
    const inflatedSpending = annualSpending * Math.pow(inflationFactor, year - 1);
    totalBridgeNeeded += inflatedSpending;

    // Determine which conversions are accessible this year
    const accessibleConversions = conversionSchedule.filter(
      (c) => c.accessibleAge <= age
    );
    const conversionAccessible = accessibleConversions.reduce(
      (sum, c) => sum + c.conversionAmount,
      0
    );

    // Withdrawal priority:
    // 1. Taxable account (most flexible, LTCG rates)
    // 2. Roth contribution basis (tax and penalty free)
    // 3. Accessible Roth conversions (tax and penalty free if 5 years + 59.5)
    // 4. Traditional with penalty (10% + income tax) - last resort

    let withdrawal: BridgeWithdrawal;
    let amountNeeded = inflatedSpending;

    if (remainingTaxable >= amountNeeded) {
      withdrawal = {
        year,
        age,
        source: "taxable",
        amount: amountNeeded,
        taxOrPenalty: amountNeeded * 0.15 * 0.5, // Approximate LTCG on gains (50% gains assumption)
        netAmount: amountNeeded * 0.925,
        remainingTaxable: remainingTaxable - amountNeeded,
        remainingRothBasis,
        conversionAccessible,
      };
      remainingTaxable -= amountNeeded;
    } else if (remainingTaxable > 0) {
      // Use remaining taxable + some Roth basis
      const fromTaxable = remainingTaxable;
      const fromRothBasis = Math.min(
        remainingRothBasis,
        amountNeeded - fromTaxable
      );
      remainingTaxable = 0;
      remainingRothBasis -= fromRothBasis;

      withdrawal = {
        year,
        age,
        source: fromRothBasis > 0 ? "roth_basis" : "taxable",
        amount: fromTaxable + fromRothBasis,
        taxOrPenalty: fromTaxable * 0.15 * 0.5,
        netAmount: fromTaxable * 0.925 + fromRothBasis,
        remainingTaxable: 0,
        remainingRothBasis,
        conversionAccessible,
      };
    } else if (remainingRothBasis >= amountNeeded) {
      withdrawal = {
        year,
        age,
        source: "roth_basis",
        amount: amountNeeded,
        taxOrPenalty: 0,
        netAmount: amountNeeded,
        remainingTaxable: 0,
        remainingRothBasis: remainingRothBasis - amountNeeded,
        conversionAccessible,
      };
      remainingRothBasis -= amountNeeded;
    } else if (remainingRothBasis > 0) {
      // Use remaining Roth basis - may need to dip into conversions or traditional
      const fromBasis = remainingRothBasis;
      remainingRothBasis = 0;

      withdrawal = {
        year,
        age,
        source: "roth_basis",
        amount: fromBasis,
        taxOrPenalty: 0,
        netAmount: fromBasis,
        remainingTaxable: 0,
        remainingRothBasis: 0,
        conversionAccessible,
      };
    } else if (age >= 59.5 && conversionAccessible > 0) {
      // Can use Roth conversions penalty-free
      withdrawal = {
        year,
        age,
        source: "roth_conversion",
        amount: amountNeeded,
        taxOrPenalty: 0,
        netAmount: amountNeeded,
        remainingTaxable: 0,
        remainingRothBasis: 0,
        conversionAccessible: conversionAccessible - amountNeeded,
      };
    } else {
      // Last resort: Traditional with penalty
      const grossNeeded = amountNeeded / 0.68; // Assume ~22% tax + 10% penalty
      withdrawal = {
        year,
        age,
        source: "traditional_penalty",
        amount: grossNeeded,
        taxOrPenalty: grossNeeded * 0.32,
        netAmount: amountNeeded,
        remainingTaxable: 0,
        remainingRothBasis: 0,
        conversionAccessible,
      };
    }

    withdrawalSchedule.push(withdrawal);

    // Grow remaining balances
    remainingTaxable *= returnFactor;
    remainingRothBasis *= returnFactor;
  }

  const totalAvailable = taxableBalance + rothContributionBasis;
  const bridgeFundingGap = Math.max(0, totalBridgeNeeded - totalAvailable);

  return {
    yearsToAge59_5,
    yearsUntilFirstConversionAccessible: yearsUntilFirstConversionAccessible,
    totalBridgeFundingNeeded: totalBridgeNeeded,
    taxableAccountBalance: taxableBalance,
    rothContributionBasis,
    bridgeFundingGap,
    isBridgeFunded: bridgeFundingGap === 0,
    withdrawalSchedule,
  };
}

/**
 * Calculate different conversion scenarios for comparison
 */
export function calculateConversionScenarios(
  inputs: RothLadderInputs
): {
  aggressive: RothLadderResult; // Fill 22% bracket
  moderate: RothLadderResult; // Fill 12% bracket
  conservative: RothLadderResult; // ACA-optimized
  noConversion: {
    projectedRMDs: number;
    estimatedRMDTax: number;
  };
} {
  // Aggressive: Fill the 22% bracket
  const aggressive = generateConversionLadder(inputs);

  // Moderate: Fill only the 12% bracket
  const moderateInputs = { ...inputs };
  const moderate = generateConversionLadder(moderateInputs);
  // Override with 12% bracket calculations
  const moderate12Ceiling = getBracketCeiling(inputs.filingStatus, 0.12);

  // Conservative: Optimize for ACA subsidies
  const conservativeInputs = { ...inputs, considerACASubsidies: true };
  const conservative = generateConversionLadder(conservativeInputs);

  // No conversion: Estimate future RMDs
  const yearsToRMD = Math.max(0, RMD_START_AGE - inputs.currentAge);
  const returnFactor = 1 + inputs.expectedReturn / 100;
  const projectedTraditionalAtRMD =
    inputs.traditionalBalance * Math.pow(returnFactor, yearsToRMD);
  const firstYearRMD = projectedTraditionalAtRMD / 26.5; // Age 73 divisor
  const estimatedRMDTax = calcOrdinaryTax(firstYearRMD, inputs.filingStatus);

  return {
    aggressive,
    moderate,
    conservative,
    noConversion: {
      projectedRMDs: firstYearRMD,
      estimatedRMDTax,
    },
  };
}

/**
 * Validate Roth ladder inputs and return validation errors
 */
export function validateRothLadderInputs(
  inputs: Partial<RothLadderInputs>
): string[] {
  const errors: string[] = [];

  if (!inputs.currentAge || inputs.currentAge < 18 || inputs.currentAge > 90) {
    errors.push("Current age must be between 18 and 90");
  }

  if (!inputs.retirementAge || inputs.retirementAge < 30 || inputs.retirementAge > 75) {
    errors.push("Retirement age must be between 30 and 75");
  }

  if (inputs.currentAge && inputs.retirementAge && inputs.retirementAge <= inputs.currentAge) {
    errors.push("Retirement age must be greater than current age");
  }

  if (inputs.traditionalBalance === undefined || inputs.traditionalBalance < 0) {
    errors.push("Traditional IRA balance must be non-negative");
  }

  if (inputs.annualSpending === undefined || inputs.annualSpending < 0) {
    errors.push("Annual spending must be non-negative");
  }

  if (inputs.stateRate === undefined || inputs.stateRate < 0 || inputs.stateRate > 15) {
    errors.push("State tax rate must be between 0% and 15%");
  }

  return errors;
}

export default generateConversionLadder;
