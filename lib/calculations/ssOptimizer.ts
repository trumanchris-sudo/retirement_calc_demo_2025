/**
 * Social Security Claiming Optimizer
 *
 * This module provides comprehensive Social Security claiming strategy analysis
 * to help users make the most important financial decision of their retirement:
 * WHEN TO CLAIM.
 *
 * The difference between claiming at 62 vs 70 can be $200,000+ in lifetime benefits.
 * Most people claim wrong.
 */

import { calcPIA, adjustSSForClaimAge, calculateSSTaxableAmount } from "./shared/socialSecurity";
import { calcOrdinaryTax } from "./shared/taxCalculations";
import { type FilingStatus } from "./shared/constants";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Full Retirement Age for those born 1960 or later */
export const FULL_RETIREMENT_AGE = 67;

/** Earliest claiming age */
export const MIN_CLAIMING_AGE = 62;

/** Latest claiming age with delayed credits */
export const MAX_CLAIMING_AGE = 70;

/** Delayed retirement credit rate per year after FRA (8%/year) */
export const DELAYED_CREDIT_RATE = 0.08;

/** Reduction per month for first 36 months early (5/9 of 1%) */
export const EARLY_REDUCTION_FIRST_36_RATE = 5 / 9 / 100;

/** Reduction per month after first 36 months early (5/12 of 1%) */
export const EARLY_REDUCTION_AFTER_36_RATE = 5 / 12 / 100;

/**
 * SSA Period Life Table (2020) - Probability of surviving to age X
 * These are conditional probabilities: given you've reached current age,
 * what's the probability of reaching the target age
 */
export const ACTUARIAL_TABLE: Record<number, { male: number; female: number }> = {
  62: { male: 1.00, female: 1.00 },
  65: { male: 0.95, female: 0.97 },
  70: { male: 0.86, female: 0.92 },
  75: { male: 0.74, female: 0.84 },
  80: { male: 0.59, female: 0.73 },
  85: { male: 0.42, female: 0.58 },
  90: { male: 0.24, female: 0.40 },
  95: { male: 0.10, female: 0.21 },
  100: { male: 0.03, female: 0.08 },
};

/**
 * Life expectancy by age (SSA 2020 Period Life Table)
 */
export const LIFE_EXPECTANCY_BY_AGE: Record<number, { male: number; female: number }> = {
  62: { male: 20.8, female: 23.6 },
  65: { male: 18.3, female: 20.9 },
  70: { male: 14.6, female: 16.8 },
  75: { male: 11.2, female: 13.0 },
  80: { male: 8.3, female: 9.7 },
  85: { male: 5.8, female: 6.8 },
};

// SS_TAXATION_THRESHOLDS is now imported from shared/constants
// Re-export for any consumers that import from this module
export { SS_TAXATION_THRESHOLDS } from "./shared/constants";

// ============================================================================
// TYPES
// ============================================================================

export interface ClaimingAgeAnalysis {
  age: number;
  monthlyBenefit: number;
  annualBenefit: number;
  percentOfFRA: number;
  reductionOrIncrease: number;
}

export interface BreakEvenAnalysis {
  claimAge1: number;
  claimAge2: number;
  breakEvenAge: number;
  breakEvenYears: number;
  cumulativeBenefit1AtBreakEven: number;
  cumulativeBenefit2AtBreakEven: number;
}

export interface LifetimeBenefitsAnalysis {
  claimAge: number;
  monthlyBenefit: number;
  lifetimeBenefit: number;
  expectedValueAdjusted: number; // Adjusted for mortality probability
  probabilityOfLivingToBreakEven: number;
}

export interface SpousalStrategy {
  strategy: string;
  person1ClaimAge: number;
  person2ClaimAge: number;
  person1MonthlyBenefit: number;
  person2MonthlyBenefit: number;
  combinedMonthlyBenefit: number;
  survivorBenefit: number;
  lifetimeBenefitsBothAlive: number;
  lifetimeBenefitsWithSurvivor: number;
  description: string;
  pros: string[];
  cons: string[];
}

export interface PortfolioImpactAnalysis {
  claimAge: number;
  portfolioDrawdownBeforeSS: number;
  yearsOfDrawdown: number;
  portfolioValueAtClaim: number;
  portfolioAtAge95: number;
  additionalPortfolioNeeded: number;
}

export interface TaxImplicationAnalysis {
  claimAge: number;
  annualBenefit: number;
  taxablePortionPercent: number;
  taxableBenefit: number;
  federalTaxOnSS: number;
  effectiveTaxRate: number;
  afterTaxBenefit: number;
}

export interface SSOptimizationResult {
  // Core Analysis
  claimingAges: ClaimingAgeAnalysis[];
  breakEvenAnalysis: BreakEvenAnalysis[];
  lifetimeBenefits: LifetimeBenefitsAnalysis[];

  // Spousal Strategies (if married)
  spousalStrategies?: SpousalStrategy[];
  optimalSpousalStrategy?: SpousalStrategy;

  // Portfolio Coordination
  portfolioImpact: PortfolioImpactAnalysis[];

  // Tax Implications
  taxImplications: TaxImplicationAnalysis[];

  // Final Recommendation
  recommendation: {
    claimAge: number;
    spouseClaimAge?: number;
    confidence: "high" | "medium" | "low";
    reasoning: string[];
    lifetimeValueDifference: number;
    breakEvenAge: number;
  };
}

export interface SSOptimizerInputs {
  // Person 1
  currentAge: number;
  gender: "male" | "female";
  averageCareerEarnings: number; // For PIA calculation
  healthStatus: "excellent" | "good" | "fair" | "poor";
  lifeExpectancy?: number; // Optional override

  // Spouse (if married)
  isMarried: boolean;
  spouseAge?: number;
  spouseGender?: "male" | "female";
  spouseAverageCareerEarnings?: number;
  spouseHealthStatus?: "excellent" | "good" | "fair" | "poor";
  spouseLifeExpectancy?: number;

  // Portfolio Info
  currentPortfolioValue: number;
  annualRetirementSpending: number;
  expectedReturnRate: number; // As decimal (e.g., 0.07 for 7%)

  // Tax Situation
  filingStatus: FilingStatus;
  otherRetirementIncome: number; // Pensions, rental income, etc.
  stateIncomeTaxRate: number;
}

// ============================================================================
// CORE CALCULATION FUNCTIONS
// ============================================================================

/**
 * Calculate the monthly benefit for each claiming age (62-70)
 */
export function calculateClaimingAgeOptions(
  averageCareerEarnings: number,
  fra: number = FULL_RETIREMENT_AGE
): ClaimingAgeAnalysis[] {
  const pia = calcPIA(averageCareerEarnings);
  const results: ClaimingAgeAnalysis[] = [];

  for (let age = MIN_CLAIMING_AGE; age <= MAX_CLAIMING_AGE; age++) {
    const monthlyBenefit = adjustSSForClaimAge(pia, age, fra);
    const percentOfFRA = (monthlyBenefit / pia) * 100;
    const reductionOrIncrease = percentOfFRA - 100;

    results.push({
      age,
      monthlyBenefit,
      annualBenefit: monthlyBenefit * 12,
      percentOfFRA,
      reductionOrIncrease,
    });
  }

  return results;
}

/**
 * Calculate the reduction percentage for claiming early
 */
export function calculateEarlyClaimingReduction(
  claimAge: number,
  fra: number = FULL_RETIREMENT_AGE
): number {
  if (claimAge >= fra) return 0;

  const monthsEarly = (fra - claimAge) * 12;

  if (monthsEarly <= 36) {
    return monthsEarly * EARLY_REDUCTION_FIRST_36_RATE * 100;
  } else {
    return (
      36 * EARLY_REDUCTION_FIRST_36_RATE * 100 +
      (monthsEarly - 36) * EARLY_REDUCTION_AFTER_36_RATE * 100
    );
  }
}

/**
 * Calculate break-even age between two claiming ages
 */
export function calculateBreakEvenAge(
  monthlyBenefit1: number,
  claimAge1: number,
  monthlyBenefit2: number,
  claimAge2: number
): BreakEvenAnalysis {
  // Ensure claimAge2 > claimAge1
  if (claimAge1 > claimAge2) {
    [monthlyBenefit1, monthlyBenefit2] = [monthlyBenefit2, monthlyBenefit1];
    [claimAge1, claimAge2] = [claimAge2, claimAge1];
  }

  const annualBenefit1 = monthlyBenefit1 * 12;
  const annualBenefit2 = monthlyBenefit2 * 12;

  // Years between claiming ages
  const delayYears = claimAge2 - claimAge1;

  // Total benefits foregone by waiting
  const foregoneBenefits = annualBenefit1 * delayYears;

  // Annual advantage of waiting
  const annualAdvantage = annualBenefit2 - annualBenefit1;

  // Years to recover foregone benefits
  const yearsToRecover = foregoneBenefits / annualAdvantage;

  const breakEvenAge = claimAge2 + yearsToRecover;

  return {
    claimAge1,
    claimAge2,
    breakEvenAge: Math.round(breakEvenAge * 10) / 10,
    breakEvenYears: Math.round(yearsToRecover * 10) / 10,
    cumulativeBenefit1AtBreakEven: annualBenefit1 * (breakEvenAge - claimAge1),
    cumulativeBenefit2AtBreakEven: annualBenefit2 * (breakEvenAge - claimAge2),
  };
}

/**
 * Calculate all break-even ages between consecutive claiming ages
 */
export function calculateAllBreakEvenAges(
  claimingAges: ClaimingAgeAnalysis[]
): BreakEvenAnalysis[] {
  const results: BreakEvenAnalysis[] = [];

  // Compare 62 vs each later age
  const age62 = claimingAges.find((c) => c.age === 62)!;
  const age67 = claimingAges.find((c) => c.age === 67)!;
  const age70 = claimingAges.find((c) => c.age === 70)!;

  // Key comparisons
  results.push(
    calculateBreakEvenAge(
      age62.monthlyBenefit,
      62,
      age67.monthlyBenefit,
      67
    )
  );

  results.push(
    calculateBreakEvenAge(
      age62.monthlyBenefit,
      62,
      age70.monthlyBenefit,
      70
    )
  );

  results.push(
    calculateBreakEvenAge(
      age67.monthlyBenefit,
      67,
      age70.monthlyBenefit,
      70
    )
  );

  return results;
}

/**
 * Get survival probability to a given age from current age
 */
export function getSurvivalProbability(
  currentAge: number,
  targetAge: number,
  gender: "male" | "female"
): number {
  if (targetAge <= currentAge) return 1.0;

  // Interpolate between known ages
  const ages = Object.keys(ACTUARIAL_TABLE)
    .map(Number)
    .sort((a, b) => a - b);

  // If current age is less than 62, use 62 as baseline
  // baseAge is not needed after this point since we use the ACTUARIAL_TABLE directly

  // Find surrounding ages for target
  let lowerAge = ages[0];
  let upperAge = ages[ages.length - 1];

  for (let i = 0; i < ages.length - 1; i++) {
    if (targetAge >= ages[i] && targetAge < ages[i + 1]) {
      lowerAge = ages[i];
      upperAge = ages[i + 1];
      break;
    }
  }

  if (targetAge >= ages[ages.length - 1]) {
    // Beyond our table - use exponential decay
    const prob100 = ACTUARIAL_TABLE[100][gender];
    const yearsOver100 = targetAge - 100;
    return prob100 * Math.pow(0.7, yearsOver100); // 30% annual mortality after 100
  }

  // Linear interpolation
  const lowerProb = ACTUARIAL_TABLE[lowerAge][gender];
  const upperProb = ACTUARIAL_TABLE[upperAge][gender];
  const fraction = (targetAge - lowerAge) / (upperAge - lowerAge);

  return lowerProb + (upperProb - lowerProb) * fraction;
}

/**
 * Adjust life expectancy based on health status
 */
export function adjustLifeExpectancy(
  baseLifeExpectancy: number,
  healthStatus: "excellent" | "good" | "fair" | "poor"
): number {
  const adjustments = {
    excellent: 3, // Add 3 years
    good: 0, // No adjustment
    fair: -3, // Subtract 3 years
    poor: -7, // Subtract 7 years
  };

  return baseLifeExpectancy + adjustments[healthStatus];
}

/**
 * Calculate lifetime benefits for each claiming age
 */
export function calculateLifetimeBenefits(
  claimingAges: ClaimingAgeAnalysis[],
  currentAge: number,
  gender: "male" | "female",
  lifeExpectancy?: number,
  healthStatus: "excellent" | "good" | "fair" | "poor" = "good"
): LifetimeBenefitsAnalysis[] {
  // Get base life expectancy
  const ageKey = Math.min(Math.max(currentAge, 62), 85);
  const closestAge = Object.keys(LIFE_EXPECTANCY_BY_AGE)
    .map(Number)
    .reduce((prev, curr) =>
      Math.abs(curr - ageKey) < Math.abs(prev - ageKey) ? curr : prev
    );

  const baseLE = LIFE_EXPECTANCY_BY_AGE[closestAge][gender];
  const adjustedLE =
    lifeExpectancy ?? adjustLifeExpectancy(currentAge + baseLE, healthStatus);

  return claimingAges.map((ca) => {
    const yearsOfBenefits = Math.max(0, adjustedLE - ca.age);
    const lifetimeBenefit = ca.annualBenefit * yearsOfBenefits;

    // Calculate expected value adjusted for mortality
    let expectedValue = 0;
    for (let age = ca.age; age <= 100; age++) {
      const survivalProb = getSurvivalProbability(currentAge, age, gender);
      expectedValue += ca.annualBenefit * survivalProb;
    }

    // Probability of living to break-even (vs claiming at 62)
    const age62Benefit = claimingAges.find((c) => c.age === 62)!;
    let breakEvenAge = ca.age; // Default

    if (ca.age > 62) {
      const breakEven = calculateBreakEvenAge(
        age62Benefit.monthlyBenefit,
        62,
        ca.monthlyBenefit,
        ca.age
      );
      breakEvenAge = breakEven.breakEvenAge;
    }

    const probLivingToBreakEven = getSurvivalProbability(
      currentAge,
      breakEvenAge,
      gender
    );

    return {
      claimAge: ca.age,
      monthlyBenefit: ca.monthlyBenefit,
      lifetimeBenefit,
      expectedValueAdjusted: expectedValue,
      probabilityOfLivingToBreakEven: probLivingToBreakEven,
    };
  });
}

// ============================================================================
// SPOUSAL BENEFIT CALCULATIONS
// ============================================================================

/**
 * Calculate survivor benefit amount
 * Survivor gets the HIGHER of their own benefit or deceased spouse's benefit
 */
export function calculateSurvivorBenefit(
  ownMonthlyBenefit: number,
  deceasedSpouseMonthlyBenefit: number
): number {
  return Math.max(ownMonthlyBenefit, deceasedSpouseMonthlyBenefit);
}

/**
 * Generate and analyze spousal claiming strategies
 * Note: Age, gender, and life expectancy parameters are reserved for future
 * mortality-weighted strategy analysis
 */
export function analyzeSpousalStrategies(
  person1Earnings: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  person1Age: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  person1Gender: "male" | "female",
  person2Earnings: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  person2Age: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  person2Gender: "male" | "female",
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lifeExpectancy1?: number,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  lifeExpectancy2?: number
): SpousalStrategy[] {
  const pia1 = calcPIA(person1Earnings);
  const pia2 = calcPIA(person2Earnings);

  // Determine higher earner
  const higherEarnerPIA = Math.max(pia1, pia2);
  const lowerEarnerPIA = Math.min(pia1, pia2);
  const person1IsHigherEarner = pia1 >= pia2;

  const strategies: SpousalStrategy[] = [];

  // Strategy 1: Both claim at 62 (worst for most)
  {
    const benefit1 = adjustSSForClaimAge(pia1, 62);
    const benefit2 = adjustSSForClaimAge(pia2, 62);
    const survivorBenefit = Math.max(benefit1, benefit2);

    strategies.push({
      strategy: "Both Claim Early (62)",
      person1ClaimAge: 62,
      person2ClaimAge: 62,
      person1MonthlyBenefit: benefit1,
      person2MonthlyBenefit: benefit2,
      combinedMonthlyBenefit: benefit1 + benefit2,
      survivorBenefit,
      lifetimeBenefitsBothAlive: (benefit1 + benefit2) * 12 * 20, // Approx
      lifetimeBenefitsWithSurvivor: (benefit1 + benefit2) * 12 * 20 + survivorBenefit * 12 * 5,
      description: "Both spouses claim at 62, accepting permanent reduction.",
      pros: ["Get money immediately", "Useful if both have health concerns"],
      cons: [
        "Permanently reduced benefits (30% less)",
        "Lower survivor benefit",
        "Worst long-term value if healthy",
      ],
    });
  }

  // Strategy 2: Both claim at FRA (67)
  {
    const benefit1 = adjustSSForClaimAge(pia1, 67);
    const benefit2 = adjustSSForClaimAge(pia2, 67);
    const survivorBenefit = Math.max(benefit1, benefit2);

    strategies.push({
      strategy: "Both Claim at FRA (67)",
      person1ClaimAge: 67,
      person2ClaimAge: 67,
      person1MonthlyBenefit: benefit1,
      person2MonthlyBenefit: benefit2,
      combinedMonthlyBenefit: benefit1 + benefit2,
      survivorBenefit,
      lifetimeBenefitsBothAlive: (benefit1 + benefit2) * 12 * 15,
      lifetimeBenefitsWithSurvivor: (benefit1 + benefit2) * 12 * 15 + survivorBenefit * 12 * 5,
      description: "Standard claiming at Full Retirement Age for both.",
      pros: ["Full PIA benefit", "Balanced approach"],
      cons: ["Foregone benefits from 62-67", "Not optimized for survivor"],
    });
  }

  // Strategy 3: Both claim at 70
  {
    const benefit1 = adjustSSForClaimAge(pia1, 70);
    const benefit2 = adjustSSForClaimAge(pia2, 70);
    const survivorBenefit = Math.max(benefit1, benefit2);

    strategies.push({
      strategy: "Both Maximize (70)",
      person1ClaimAge: 70,
      person2ClaimAge: 70,
      person1MonthlyBenefit: benefit1,
      person2MonthlyBenefit: benefit2,
      combinedMonthlyBenefit: benefit1 + benefit2,
      survivorBenefit,
      lifetimeBenefitsBothAlive: (benefit1 + benefit2) * 12 * 12,
      lifetimeBenefitsWithSurvivor: (benefit1 + benefit2) * 12 * 12 + survivorBenefit * 12 * 5,
      description: "Maximum benefits but requires 8 years of portfolio bridge.",
      pros: [
        "Maximum monthly benefit (32% more than FRA)",
        "Maximum survivor benefit",
      ],
      cons: [
        "8 years of foregone benefits",
        "Heavy portfolio drawdown before SS",
        "Risk if either spouse dies early",
      ],
    });
  }

  // Strategy 4: OPTIMAL - Higher earner delays to 70, lower earner claims at 62
  {
    const higherEarnerBenefit70 = adjustSSForClaimAge(higherEarnerPIA, 70);
    const lowerEarnerBenefit62 = adjustSSForClaimAge(lowerEarnerPIA, 62);

    const p1Benefit = person1IsHigherEarner
      ? higherEarnerBenefit70
      : lowerEarnerBenefit62;
    const p2Benefit = person1IsHigherEarner
      ? lowerEarnerBenefit62
      : higherEarnerBenefit70;
    const p1Age = person1IsHigherEarner ? 70 : 62;
    const p2Age = person1IsHigherEarner ? 62 : 70;

    strategies.push({
      strategy: "Higher Earner Delays, Lower Claims Early",
      person1ClaimAge: p1Age,
      person2ClaimAge: p2Age,
      person1MonthlyBenefit: p1Benefit,
      person2MonthlyBenefit: p2Benefit,
      combinedMonthlyBenefit: higherEarnerBenefit70 + lowerEarnerBenefit62,
      survivorBenefit: higherEarnerBenefit70,
      lifetimeBenefitsBothAlive: (higherEarnerBenefit70 + lowerEarnerBenefit62) * 12 * 15,
      lifetimeBenefitsWithSurvivor:
        (higherEarnerBenefit70 + lowerEarnerBenefit62) * 12 * 15 +
        higherEarnerBenefit70 * 12 * 5,
      description:
        "Lower earner provides income early; higher earner maximizes for survivor benefit.",
      pros: [
        "Maximizes survivor benefit (critical for financial security)",
        "Lower earner provides bridge income",
        "Best expected lifetime value for most couples",
        "Protects surviving spouse from poverty",
      ],
      cons: [
        "Higher earner gets nothing until 70",
        "Requires some portfolio bridge",
      ],
    });
  }

  // Strategy 5: Lower earner claims at 67, higher earner at 70
  {
    const higherEarnerBenefit70 = adjustSSForClaimAge(higherEarnerPIA, 70);
    const lowerEarnerBenefit67 = adjustSSForClaimAge(lowerEarnerPIA, 67);

    const p1Benefit = person1IsHigherEarner
      ? higherEarnerBenefit70
      : lowerEarnerBenefit67;
    const p2Benefit = person1IsHigherEarner
      ? lowerEarnerBenefit67
      : higherEarnerBenefit70;
    const p1Age = person1IsHigherEarner ? 70 : 67;
    const p2Age = person1IsHigherEarner ? 67 : 70;

    strategies.push({
      strategy: "Higher Earner 70, Lower Earner FRA",
      person1ClaimAge: p1Age,
      person2ClaimAge: p2Age,
      person1MonthlyBenefit: p1Benefit,
      person2MonthlyBenefit: p2Benefit,
      combinedMonthlyBenefit: higherEarnerBenefit70 + lowerEarnerBenefit67,
      survivorBenefit: higherEarnerBenefit70,
      lifetimeBenefitsBothAlive: (higherEarnerBenefit70 + lowerEarnerBenefit67) * 12 * 14,
      lifetimeBenefitsWithSurvivor:
        (higherEarnerBenefit70 + lowerEarnerBenefit67) * 12 * 14 +
        higherEarnerBenefit70 * 12 * 5,
      description: "Balanced approach - lower earner at FRA, higher delays.",
      pros: [
        "Maximizes survivor benefit",
        "Lower earner gets full PIA",
        "Less portfolio bridge than both at 70",
      ],
      cons: [
        "Lower earner foregoes 5 years",
        "Still needs some bridge funding",
      ],
    });
  }

  return strategies;
}

// ============================================================================
// PORTFOLIO COORDINATION
// ============================================================================

/**
 * Calculate portfolio impact for each claiming age
 */
export function calculatePortfolioImpact(
  claimingAges: ClaimingAgeAnalysis[],
  retirementAge: number,
  currentPortfolioValue: number,
  annualSpending: number,
  expectedReturnRate: number
): PortfolioImpactAnalysis[] {
  return claimingAges.map((ca) => {
    const yearsUntilSS = Math.max(0, ca.age - retirementAge);
    const annualReturnFactor = 1 + expectedReturnRate;

    // Calculate portfolio value at SS claiming age
    let portfolioAtClaim = currentPortfolioValue;
    for (let year = 0; year < yearsUntilSS; year++) {
      portfolioAtClaim = portfolioAtClaim * annualReturnFactor - annualSpending;
    }
    portfolioAtClaim = Math.max(0, portfolioAtClaim);

    // Calculate portfolio at age 95 (with SS income reducing spending)
    let portfolioAt95 = portfolioAtClaim;
    const netSpending = Math.max(0, annualSpending - ca.annualBenefit);
    const yearsAfterClaim = 95 - ca.age;

    for (let year = 0; year < yearsAfterClaim; year++) {
      portfolioAt95 = portfolioAt95 * annualReturnFactor - netSpending;
    }
    portfolioAt95 = Math.max(0, portfolioAt95);

    // Additional portfolio needed (vs claiming at 62)
    const additionalPortfolioNeeded =
      yearsUntilSS > 0 ? annualSpending * yearsUntilSS : 0;

    return {
      claimAge: ca.age,
      portfolioDrawdownBeforeSS: annualSpending * yearsUntilSS,
      yearsOfDrawdown: yearsUntilSS,
      portfolioValueAtClaim: portfolioAtClaim,
      portfolioAtAge95: portfolioAt95,
      additionalPortfolioNeeded,
    };
  });
}

// ============================================================================
// TAX CALCULATIONS
// ============================================================================

/**
 * Calculate what percentage of SS is taxable based on combined income.
 * Delegates to the shared calculateSSTaxableAmount and converts to a percentage.
 */
export function calculateSSTaxablePercent(
  ssBenefit: number,
  otherIncome: number,
  filingStatus: FilingStatus
): number {
  if (ssBenefit <= 0) return 0;
  const taxableAmount = calculateSSTaxableAmount(ssBenefit, otherIncome, filingStatus);
  return (taxableAmount / ssBenefit) * 100;
}

/**
 * Calculate tax implications for each claiming age
 */
export function calculateTaxImplications(
  claimingAges: ClaimingAgeAnalysis[],
  otherRetirementIncome: number,
  filingStatus: FilingStatus,
  stateIncomeTaxRate: number
): TaxImplicationAnalysis[] {
  return claimingAges.map((ca) => {
    const taxablePercent = calculateSSTaxablePercent(
      ca.annualBenefit,
      otherRetirementIncome,
      filingStatus
    );
    const taxableBenefit = (ca.annualBenefit * taxablePercent) / 100;

    // Federal tax on SS (use ordinary income rates)
    const totalTaxableIncome = otherRetirementIncome + taxableBenefit;
    const totalFedTax = calcOrdinaryTax(totalTaxableIncome, filingStatus);
    const baseFedTax = calcOrdinaryTax(otherRetirementIncome, filingStatus);
    const federalTaxOnSS = totalFedTax - baseFedTax;

    // State tax (simplified - apply rate to taxable portion)
    const stateTax = taxableBenefit * stateIncomeTaxRate;

    const totalTaxOnSS = federalTaxOnSS + stateTax;
    const afterTaxBenefit = ca.annualBenefit - totalTaxOnSS;
    const effectiveTaxRate =
      ca.annualBenefit > 0 ? (totalTaxOnSS / ca.annualBenefit) * 100 : 0;

    return {
      claimAge: ca.age,
      annualBenefit: ca.annualBenefit,
      taxablePortionPercent: taxablePercent,
      taxableBenefit,
      federalTaxOnSS,
      effectiveTaxRate,
      afterTaxBenefit,
    };
  });
}

// ============================================================================
// MAIN OPTIMIZER FUNCTION
// ============================================================================

/**
 * Generate comprehensive Social Security claiming optimization analysis
 */
export function optimizeSocialSecurity(
  inputs: SSOptimizerInputs
): SSOptimizationResult {
  // Calculate claiming age options
  const claimingAges = calculateClaimingAgeOptions(inputs.averageCareerEarnings);

  // Calculate break-even ages
  const breakEvenAnalysis = calculateAllBreakEvenAges(claimingAges);

  // Calculate lifetime benefits with mortality adjustment
  const lifeExpectancy = inputs.lifeExpectancy ??
    adjustLifeExpectancy(
      inputs.currentAge +
        LIFE_EXPECTANCY_BY_AGE[
          Math.min(Math.max(inputs.currentAge, 62), 85) as keyof typeof LIFE_EXPECTANCY_BY_AGE
        ][inputs.gender],
      inputs.healthStatus
    );

  const lifetimeBenefits = calculateLifetimeBenefits(
    claimingAges,
    inputs.currentAge,
    inputs.gender,
    lifeExpectancy,
    inputs.healthStatus
  );

  // Calculate portfolio impact
  const portfolioImpact = calculatePortfolioImpact(
    claimingAges,
    inputs.currentAge + 5, // Assume retirement 5 years from now if not specified
    inputs.currentPortfolioValue,
    inputs.annualRetirementSpending,
    inputs.expectedReturnRate
  );

  // Calculate tax implications
  const taxImplications = calculateTaxImplications(
    claimingAges,
    inputs.otherRetirementIncome,
    inputs.filingStatus,
    inputs.stateIncomeTaxRate
  );

  // Spousal strategies if married
  let spousalStrategies: SpousalStrategy[] | undefined;
  let optimalSpousalStrategy: SpousalStrategy | undefined;

  if (
    inputs.isMarried &&
    inputs.spouseAge &&
    inputs.spouseGender &&
    inputs.spouseAverageCareerEarnings !== undefined
  ) {
    spousalStrategies = analyzeSpousalStrategies(
      inputs.averageCareerEarnings,
      inputs.currentAge,
      inputs.gender,
      inputs.spouseAverageCareerEarnings,
      inputs.spouseAge,
      inputs.spouseGender,
      inputs.lifeExpectancy,
      inputs.spouseLifeExpectancy
    );

    // Find optimal strategy (usually "Higher Earner Delays")
    optimalSpousalStrategy = spousalStrategies.find(
      (s) => s.strategy === "Higher Earner Delays, Lower Claims Early"
    );
  }

  // Generate recommendation
  const recommendation = generateRecommendation(
    claimingAges,
    breakEvenAnalysis,
    lifetimeBenefits,
    portfolioImpact,
    inputs,
    optimalSpousalStrategy
  );

  return {
    claimingAges,
    breakEvenAnalysis,
    lifetimeBenefits,
    spousalStrategies,
    optimalSpousalStrategy,
    portfolioImpact,
    taxImplications,
    recommendation,
  };
}

/**
 * Generate the final recommendation based on all analysis
 */
function generateRecommendation(
  claimingAges: ClaimingAgeAnalysis[],
  breakEvenAnalysis: BreakEvenAnalysis[],
  lifetimeBenefits: LifetimeBenefitsAnalysis[],
  portfolioImpact: PortfolioImpactAnalysis[],
  inputs: SSOptimizerInputs,
  optimalSpousalStrategy?: SpousalStrategy
): SSOptimizationResult["recommendation"] {
  const reasoning: string[] = [];
  let recommendedAge = 67; // Default to FRA
  let confidence: "high" | "medium" | "low" = "medium";

  // Find key analysis points
  const breakEven62vs70 = breakEvenAnalysis.find(
    (b) => b.claimAge1 === 62 && b.claimAge2 === 70
  );
  const lifetimeAt62 = lifetimeBenefits.find((l) => l.claimAge === 62)!;
  const lifetimeAt70 = lifetimeBenefits.find((l) => l.claimAge === 70)!;

  // Health-based reasoning
  if (inputs.healthStatus === "poor") {
    recommendedAge = 62;
    confidence = "high";
    reasoning.push(
      "With poor health status, claiming early maximizes total benefits received."
    );
    reasoning.push(
      "The reduced monthly benefit is offset by more years of collection."
    );
  } else if (inputs.healthStatus === "excellent") {
    recommendedAge = 70;
    confidence = "high";
    reasoning.push(
      "With excellent health, you have a high probability of living past break-even age."
    );
    reasoning.push(
      `Break-even age is ${breakEven62vs70?.breakEvenAge.toFixed(1)} - delaying to 70 pays off after that.`
    );
    reasoning.push(
      `Your probability of reaching break-even: ${(lifetimeAt70.probabilityOfLivingToBreakEven * 100).toFixed(0)}%`
    );
  } else if (inputs.healthStatus === "fair") {
    recommendedAge = 67;
    confidence = "medium";
    reasoning.push(
      "With fair health, claiming at FRA (67) balances risk and reward."
    );
  } else {
    // Good health - analyze further
    recommendedAge = 68;
    confidence = "medium";
    reasoning.push(
      "With good health, waiting past FRA increases benefits without excessive risk."
    );
  }

  // Portfolio considerations
  const portfolioAt70 = portfolioImpact.find((p) => p.claimAge === 70)!;
  if (
    portfolioAt70.portfolioValueAtClaim < inputs.annualRetirementSpending * 3
  ) {
    if (recommendedAge > 67) {
      recommendedAge = 67;
      confidence = "medium";
      reasoning.push(
        "Portfolio may not support delaying past FRA - adjusting recommendation."
      );
    }
  } else if (portfolioAt70.portfolioValueAtClaim > inputs.annualRetirementSpending * 10) {
    if (recommendedAge < 70 && inputs.healthStatus !== "poor") {
      reasoning.push(
        "Strong portfolio can easily bridge to age 70 - consider maximum delay."
      );
    }
  }

  // Spousal considerations
  let spouseClaimAge: number | undefined;
  if (inputs.isMarried && optimalSpousalStrategy) {
    const pia1 = calcPIA(inputs.averageCareerEarnings);
    const pia2 = calcPIA(inputs.spouseAverageCareerEarnings || 0);
    const isHigherEarner = pia1 >= pia2;

    if (isHigherEarner) {
      recommendedAge = 70;
      spouseClaimAge = 62;
      reasoning.push(
        "As the higher earner, delaying to 70 maximizes the survivor benefit."
      );
      reasoning.push(
        "This protects your spouse financially if you pass first."
      );
      reasoning.push(
        `Recommended: You claim at 70, spouse claims at 62 for bridge income.`
      );
      confidence = "high";
    } else {
      recommendedAge = 62;
      spouseClaimAge = 70;
      reasoning.push(
        "As the lower earner, claiming early provides bridge income."
      );
      reasoning.push(
        "Your spouse should delay to 70 to maximize survivor benefit."
      );
      confidence = "high";
    }
  }

  // Calculate lifetime value difference (62 vs recommended)
  const lifetimeAtRecommended = lifetimeBenefits.find((l) => l.claimAge === recommendedAge)!;
  const lifetimeValueDifference =
    lifetimeAtRecommended.expectedValueAdjusted -
    lifetimeAt62.expectedValueAdjusted;

  return {
    claimAge: recommendedAge,
    spouseClaimAge,
    confidence,
    reasoning,
    lifetimeValueDifference,
    breakEvenAge: breakEven62vs70?.breakEvenAge || 80,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Get key insight messages for the user
 */
export function getKeyInsights(result: SSOptimizationResult): string[] {
  const insights: string[] = [];

  // Insight 1: The stakes
  const benefit62 = result.claimingAges.find((c) => c.age === 62)!;
  const benefit70 = result.claimingAges.find((c) => c.age === 70)!;
  const monthlyDifference = benefit70.monthlyBenefit - benefit62.monthlyBenefit;
  insights.push(
    `Claiming at 70 vs 62 means ${formatCurrency(monthlyDifference)} MORE per month - a 77% increase.`
  );

  // Insight 2: Break-even
  const breakEven = result.breakEvenAnalysis.find(
    (b) => b.claimAge1 === 62 && b.claimAge2 === 70
  );
  if (breakEven) {
    insights.push(
      `If you live past age ${breakEven.breakEvenAge.toFixed(0)}, waiting until 70 wins.`
    );
  }

  // Insight 3: Portfolio impact
  const portfolio70 = result.portfolioImpact.find((p) => p.claimAge === 70);
  if (portfolio70 && portfolio70.portfolioDrawdownBeforeSS > 0) {
    insights.push(
      `Delaying to 70 requires ${formatCurrency(portfolio70.portfolioDrawdownBeforeSS)} from your portfolio before SS starts.`
    );
  }

  // Insight 4: Survivor benefit (if married)
  if (result.optimalSpousalStrategy) {
    insights.push(
      `Optimal spousal strategy: ${result.optimalSpousalStrategy.strategy} - provides ${formatCurrency(result.optimalSpousalStrategy.survivorBenefit)}/month survivor benefit.`
    );
  }

  return insights;
}
