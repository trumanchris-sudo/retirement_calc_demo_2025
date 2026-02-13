/**
 * Optimization Recommendations Engine
 *
 * Analyzes user's retirement situation and generates specific, actionable recommendations
 * for maximizing wealth and minimizing taxes.
 *
 * Categories:
 * 1. Roth Conversion Opportunities
 * 2. Contribution Order Optimization
 * 3. Tax Bracket Arbitrage
 * 4. Social Security Optimization
 * 5. Withdrawal Strategy Preview
 */

import {
  TAX_BRACKETS,
  LTCG_BRACKETS,
  RMD_START_AGE,
  LIFE_EXP,
  type FilingStatus,
} from "./shared/constants";
import {
  calcOrdinaryTax,
  calcLTCGTax,
} from "./shared/taxCalculations";
import {
  calcPIA,
  calcSocialSecurity,
  calculateEffectiveSS,
} from "./shared/socialSecurity";
import { calcRMD } from "./shared/rmd";

// ===============================
// Type Definitions
// ===============================

export type RecommendationCategory = 'roth' | 'contribution' | 'tax' | 'ss' | 'withdrawal';
export type RecommendationPriority = 'high' | 'medium' | 'low';

/**
 * A specific, actionable recommendation for the user
 */
export interface Recommendation {
  /** Unique identifier for this recommendation */
  id: string;
  /** Priority level */
  priority: RecommendationPriority;
  /** Short title for the recommendation */
  title: string;
  /** Detailed description explaining the opportunity */
  description: string;
  /** Estimated dollar impact over lifetime (positive = benefit) */
  impact: number;
  /** Specific action the user should take */
  action: string;
  /** Category of the recommendation */
  category: RecommendationCategory;
  /** Additional metadata for UI rendering */
  metadata?: {
    currentValue?: number;
    recommendedValue?: number;
    bracketRate?: number;
    yearsAffected?: number;
    annualBenefit?: number;
  };
}

/**
 * Input parameters for optimization analysis
 */
export interface OptimizationInputs {
  // Personal Info
  marital: FilingStatus;
  age1: number;
  age2: number;
  retirementAge: number;

  // Account Balances
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;

  // Contributions
  cTax1: number;  // Taxable contributions
  cPre1: number;  // Pre-tax 401k contributions
  cPost1: number; // Roth contributions
  cMatch1: number; // Employer match
  cTax2: number;
  cPre2: number;
  cPost2: number;
  cMatch2: number;

  // Income
  primaryIncome: number;
  spouseIncome?: number;

  // Social Security
  includeSS: boolean;
  ssIncome: number;
  ssClaimAge: number;
  ssIncome2?: number;
  ssClaimAge2?: number;

  // Rates
  retRate: number;      // Expected return
  inflationRate: number;
  stateRate: number;
  wdRate: number;       // Withdrawal rate

  // HSA eligibility
  hsaEligible?: boolean;
  hsaContribution?: number;

  // Roth conversion settings
  enableRothConversions?: boolean;
  targetConversionBracket?: number;
}

/**
 * Complete optimization analysis result
 */
export interface OptimizationResult {
  recommendations: Recommendation[];
  totalPotentialImpact: number;
  analysisTimestamp: number;
}

// ===============================
// Contribution Limits (2026)
// ===============================

const CONTRIBUTION_LIMITS_2026 = {
  traditional401k: 24500,      // 401k/403b limit
  traditional401kCatchUp: 7500, // Additional for 50+
  rothIRA: 7000,               // Roth IRA limit
  rothIRACatchUp: 1000,        // Additional for 50+
  hsaIndividual: 4300,         // HSA individual
  hsaFamily: 8550,             // HSA family
  hsaCatchUp: 1000,            // HSA 55+ catch-up
  backdoorRothLimit: 7000,     // Same as Roth IRA
} as const;

// ===============================
// Utility Functions
// ===============================

/**
 * Get the current tax bracket for a given income
 */
function getCurrentBracket(income: number, status: FilingStatus): { rate: number; limit: number; index: number } {
  const brackets = TAX_BRACKETS[status];
  const taxableIncome = Math.max(0, income - brackets.deduction);

  for (let i = 0; i < brackets.rates.length; i++) {
    if (taxableIncome <= brackets.rates[i].limit) {
      return {
        rate: brackets.rates[i].rate,
        limit: brackets.rates[i].limit,
        index: i,
      };
    }
  }

  // Return top bracket
  const lastIndex = brackets.rates.length - 1;
  return {
    rate: brackets.rates[lastIndex].rate,
    limit: brackets.rates[lastIndex].limit,
    index: lastIndex,
  };
}

/**
 * Calculate room remaining in current tax bracket
 */
function getBracketHeadroom(income: number, status: FilingStatus): { headroom: number; currentRate: number; nextRate: number } {
  const brackets = TAX_BRACKETS[status];
  const taxableIncome = Math.max(0, income - brackets.deduction);

  for (let i = 0; i < brackets.rates.length; i++) {
    if (taxableIncome <= brackets.rates[i].limit) {
      const headroom = brackets.rates[i].limit - taxableIncome;
      const nextRate = i < brackets.rates.length - 1 ? brackets.rates[i + 1].rate : brackets.rates[i].rate;
      return {
        headroom,
        currentRate: brackets.rates[i].rate,
        nextRate,
      };
    }
  }

  return { headroom: 0, currentRate: 0.37, nextRate: 0.37 };
}

/**
 * Calculate present value of future benefit stream
 */
function calculatePresentValue(annualAmount: number, years: number, discountRate: number): number {
  if (discountRate === 0) return annualAmount * years;
  const rate = discountRate / 100;
  return annualAmount * ((1 - Math.pow(1 + rate, -years)) / rate);
}

/**
 * Calculate future value with compounding
 */
function calculateFutureValue(presentValue: number, years: number, rate: number): number {
  return presentValue * Math.pow(1 + rate / 100, years);
}

// ===============================
// Recommendation Analyzers
// ===============================

/**
 * Analyze Roth conversion opportunities
 */
function analyzeRothConversions(inputs: OptimizationInputs): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    marital, age1, retirementAge, pretaxBalance, taxableBalance,
    primaryIncome = 0, spouseIncome = 0, retRate, inflationRate, includeSS, ssIncome
  } = inputs;

  // Skip if no pre-tax balance or too young
  if (pretaxBalance <= 0) return recommendations;

  // Calculate current income for bracket determination
  const totalIncome = primaryIncome + (spouseIncome || 0);

  // Get bracket headroom
  const { headroom, currentRate, nextRate } = getBracketHeadroom(totalIncome, marital);

  // Determine years until RMD (age 73)
  const yearsToRMD = Math.max(0, RMD_START_AGE - age1);
  const yearsToRetirement = Math.max(0, retirementAge - age1);

  // Calculate projected pre-tax balance at RMD age
  const projectedPretaxAtRMD = calculateFutureValue(pretaxBalance, yearsToRMD, retRate);

  // Estimate first RMD (divisor is ~26.5 at age 73)
  const estimatedFirstRMD = projectedPretaxAtRMD / 26.5;

  // During working years - limited conversion opportunity
  if (age1 < retirementAge) {
    if (headroom > 10000 && pretaxBalance > 50000) {
      const conversionAmount = Math.min(headroom, pretaxBalance * 0.1);
      const conversionTax = conversionAmount * currentRate;

      // Calculate tax savings: avoid future RMD taxation at higher rate
      // Assume RMDs will be taxed at 24%+ bracket
      const futureRateDiff = Math.max(0, 0.24 - currentRate);
      const yearsOfGrowth = yearsToRMD;
      const futureValueOfConversion = calculateFutureValue(conversionAmount, yearsOfGrowth, retRate);
      const taxSavings = futureValueOfConversion * futureRateDiff;

      if (taxSavings > conversionTax * 0.5) {
        recommendations.push({
          id: 'roth-conversion-working',
          priority: 'medium',
          title: `Convert $${Math.round(conversionAmount).toLocaleString()} to Roth This Year`,
          description: `You have room in the ${(currentRate * 100).toFixed(0)}% bracket. Converting now means tax-free growth and avoiding higher RMD taxes later.`,
          impact: Math.round(taxSavings - conversionTax),
          action: `Contact your 401k administrator or IRA custodian to convert $${Math.round(conversionAmount).toLocaleString()} from Traditional to Roth. Pay the $${Math.round(conversionTax).toLocaleString()} tax from your taxable account, NOT the IRA.`,
          category: 'roth',
          metadata: {
            currentValue: conversionAmount,
            bracketRate: currentRate,
            yearsAffected: yearsToRMD,
          },
        });
      }
    }
  }

  // Post-retirement / Pre-RMD window (the "sweet spot")
  if (age1 >= retirementAge && age1 < RMD_START_AGE) {
    // In retirement but before RMDs - this is prime conversion territory
    const retirementIncome = includeSS ? calcSocialSecurity(ssIncome, inputs.ssClaimAge || 67) : 0;
    const { headroom: retHeadroom, currentRate: retRate } = getBracketHeadroom(retirementIncome, marital);

    if (retHeadroom > 0 && pretaxBalance > 0) {
      const optimalConversion = Math.min(retHeadroom, pretaxBalance);
      const conversionTax = optimalConversion * retRate;

      // Benefit: Grows tax-free, no RMD on Roth, heirs inherit tax-free
      const yearsRemaining = LIFE_EXP - age1;
      const futureValue = calculateFutureValue(optimalConversion, yearsRemaining, retRate);
      // Assume would have been taxed at 24% on withdrawal
      const taxAvoided = futureValue * 0.24;

      recommendations.push({
        id: 'roth-conversion-retirement',
        priority: 'high',
        title: `Convert $${Math.round(optimalConversion).toLocaleString()} to Roth (Fills ${(retRate * 100).toFixed(0)}% Bracket)`,
        description: `You're in the Roth conversion "sweet spot" - retired but before RMDs. Fill the ${(retRate * 100).toFixed(0)}% bracket before RMDs push you into the ${((retRate + 0.02) * 100).toFixed(0)}%+ bracket.`,
        impact: Math.round(taxAvoided - conversionTax),
        action: `Convert $${Math.round(optimalConversion).toLocaleString()} from Traditional IRA to Roth IRA this year. Pay taxes from taxable account. Repeat annually until age 72.`,
        category: 'roth',
        metadata: {
          currentValue: optimalConversion,
          bracketRate: retRate,
          yearsAffected: RMD_START_AGE - age1,
          annualBenefit: optimalConversion,
        },
      });
    }
  }

  // Alert about large pre-tax balance and future RMD issues
  if (projectedPretaxAtRMD > 1500000 && age1 < 60) {
    const yearsToConvert = RMD_START_AGE - Math.max(age1, retirementAge);
    const annualConversionNeeded = pretaxBalance / yearsToConvert;

    recommendations.push({
      id: 'roth-conversion-rmd-warning',
      priority: 'high',
      title: 'Start Roth Conversions Now to Avoid RMD Tax Bomb',
      description: `Your pre-tax accounts could grow to $${Math.round(projectedPretaxAtRMD / 1000000 * 10) / 10}M by age 73. This means RMDs of $${Math.round(estimatedFirstRMD / 1000)}k+ per year, likely pushing you into the 32-37% brackets.`,
      impact: Math.round(estimatedFirstRMD * 0.13 * 20), // 13% rate savings over 20 years
      action: `Plan to convert approximately $${Math.round(annualConversionNeeded).toLocaleString()}/year starting at retirement age ${retirementAge}. Work with a tax advisor to optimize the conversion ladder.`,
      category: 'roth',
      metadata: {
        currentValue: pretaxBalance,
        recommendedValue: annualConversionNeeded,
        yearsAffected: yearsToConvert,
      },
    });
  }

  return recommendations;
}

/**
 * Analyze contribution order optimization
 */
function analyzeContributionOrder(inputs: OptimizationInputs): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    marital, age1, primaryIncome = 0, spouseIncome = 0,
    cPre1, cMatch1, cPost1, cTax1,
    cPre2, cMatch2, cPost2, cTax2,
    hsaEligible = false, hsaContribution = 0,
    retRate,
  } = inputs;

  const totalIncome = primaryIncome + (spouseIncome || 0);
  const isOver50 = age1 >= 50;

  // Determine optimal contribution order based on tax situation
  const { currentRate } = getBracketHeadroom(totalIncome, marital);

  // Calculate current total contributions
  const totalContributions = cPre1 + cPost1 + cTax1 + cPre2 + cPost2 + cTax2;

  // 1. Check if getting full employer match
  const totalMatch = cMatch1 + cMatch2;
  const max401k = isOver50 ?
    CONTRIBUTION_LIMITS_2026.traditional401k + CONTRIBUTION_LIMITS_2026.traditional401kCatchUp :
    CONTRIBUTION_LIMITS_2026.traditional401k;

  // Estimate if match is being left on table
  // Assume typical match is 50% up to 6% of salary, or 3% of salary
  const estimatedMatchAvailable = totalIncome * 0.03;

  if (totalMatch < estimatedMatchAvailable && cPre1 + cPost1 < max401k * 0.1) {
    const missedMatch = estimatedMatchAvailable - totalMatch;
    const yearsToRetirement = Math.max(0, inputs.retirementAge - age1);
    const futureValueMissed = calculateFutureValue(missedMatch, yearsToRetirement, retRate) * yearsToRetirement;

    recommendations.push({
      id: 'contribution-match',
      priority: 'high',
      title: "You're Leaving Free Money on the Table",
      description: `You may be missing approximately $${Math.round(missedMatch).toLocaleString()}/year in employer matching. This is a 100% immediate return.`,
      impact: Math.round(futureValueMissed),
      action: `Increase 401k contributions to at least get the full employer match. Even if you're in debt, the match is free money. Contact HR to confirm your match formula.`,
      category: 'contribution',
      metadata: {
        currentValue: totalMatch,
        recommendedValue: estimatedMatchAvailable,
        annualBenefit: missedMatch,
      },
    });
  }

  // 2. HSA before Roth IRA (if eligible)
  if (hsaEligible) {
    const maxHSA = marital === 'married' ?
      CONTRIBUTION_LIMITS_2026.hsaFamily + (isOver50 ? CONTRIBUTION_LIMITS_2026.hsaCatchUp : 0) :
      CONTRIBUTION_LIMITS_2026.hsaIndividual + (isOver50 ? CONTRIBUTION_LIMITS_2026.hsaCatchUp : 0);

    if (hsaContribution < maxHSA && cPost1 > 0) {
      const hsaGap = maxHSA - hsaContribution;
      const rothToRedirect = Math.min(cPost1, hsaGap);
      const yearsToRetirement = Math.max(0, inputs.retirementAge - age1);

      // HSA has triple tax advantage
      const taxSavings = rothToRedirect * currentRate; // Immediate deduction
      const payrollTaxSavings = rothToRedirect * 0.0765; // FICA savings
      const lifetimeBenefit = (taxSavings + payrollTaxSavings) * yearsToRetirement;

      recommendations.push({
        id: 'contribution-hsa-priority',
        priority: 'high',
        title: 'Max HSA Before Roth IRA (Triple Tax Advantage)',
        description: `You're contributing to Roth but not maxing HSA. HSA gives you: 1) Tax deduction now, 2) Tax-free growth, 3) Tax-free withdrawals for healthcare. Roth only gives you #2 and #3.`,
        impact: Math.round(lifetimeBenefit),
        action: `Redirect $${Math.round(rothToRedirect).toLocaleString()}/year from Roth IRA to HSA until maxed at $${maxHSA.toLocaleString()}. You also save 7.65% FICA taxes that even Roth doesn't save.`,
        category: 'contribution',
        metadata: {
          currentValue: hsaContribution,
          recommendedValue: maxHSA,
          annualBenefit: taxSavings + payrollTaxSavings,
        },
      });
    }
  }

  // 3. Taxable before maxing 401k (if in low bracket and young)
  if (currentRate <= 0.22 && age1 < 40 && cTax1 > 0 && cPre1 < max401k) {
    const additionalPretax = Math.min(max401k - cPre1, cTax1);
    const taxSavings = additionalPretax * currentRate;
    const yearsToRetirement = Math.max(0, inputs.retirementAge - age1);

    // Consider if they should be doing Roth instead at low bracket
    if (currentRate <= 0.12) {
      recommendations.push({
        id: 'contribution-roth-over-pretax',
        priority: 'medium',
        title: 'Consider Roth Over Traditional at Your Tax Bracket',
        description: `You're in the ${(currentRate * 100).toFixed(0)}% bracket - one of the lowest. Paying taxes now at ${(currentRate * 100).toFixed(0)}% is likely better than paying 22-24%+ in retirement.`,
        impact: Math.round(additionalPretax * 0.1 * yearsToRetirement), // Estimate 10% rate difference
        action: `Switch your 401k contributions from Traditional to Roth 401k (if available). The tax-free growth over ${yearsToRetirement} years will outweigh the small tax now.`,
        category: 'contribution',
        metadata: {
          currentValue: cPre1,
          recommendedValue: cPost1 + additionalPretax,
          bracketRate: currentRate,
        },
      });
    }
  }

  // 4. Optimal order reminder
  const optimalOrder = [
    '1. 401k up to employer match (free money)',
    '2. HSA if eligible (triple tax advantage)',
    '3. Roth IRA or Backdoor Roth ($7,000/year)',
    '4. Max out 401k ($24,500 + catch-up if 50+)',
    '5. Taxable brokerage (no contribution limits)',
  ];

  // Check if current order seems suboptimal
  if (cTax1 > 10000 && cPre1 + cMatch1 < max401k * 0.5) {
    recommendations.push({
      id: 'contribution-order-alert',
      priority: 'medium',
      title: 'Review Your Contribution Priority Order',
      description: `You're putting $${Math.round(cTax1).toLocaleString()}/year in taxable accounts before maxing tax-advantaged space. Tax-advantaged accounts compound without annual tax drag.`,
      impact: Math.round(cTax1 * 0.02 * 30), // ~2% annual tax drag over 30 years
      action: `Prioritize contributions in this order:\n${optimalOrder.join('\n')}`,
      category: 'contribution',
      metadata: {
        currentValue: cTax1,
        recommendedValue: 0,
      },
    });
  }

  return recommendations;
}

/**
 * Analyze tax bracket arbitrage opportunities
 */
function analyzeTaxBracketArbitrage(inputs: OptimizationInputs): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    marital, age1, primaryIncome = 0, spouseIncome = 0,
    retirementAge, pretaxBalance, retRate,
  } = inputs;

  const totalIncome = primaryIncome + (spouseIncome || 0);
  const brackets = TAX_BRACKETS[marital];

  // Calculate current bracket position
  const taxableIncome = Math.max(0, totalIncome - brackets.deduction);

  // Find current bracket and check for unused space
  for (let i = 0; i < brackets.rates.length - 1; i++) {
    const bracket = brackets.rates[i];
    const nextBracket = brackets.rates[i + 1];

    // Check if we're in this bracket
    if (taxableIncome < bracket.limit) {
      const unusedSpace = bracket.limit - taxableIncome;

      // If significant unused space in 22% or lower bracket
      if (bracket.rate <= 0.22 && unusedSpace > 5000) {
        recommendations.push({
          id: `tax-bracket-unused-${bracket.rate}`,
          priority: 'medium',
          title: `You're Leaving $${Math.round(unusedSpace).toLocaleString()} of the ${(bracket.rate * 100).toFixed(0)}% Bracket Unused`,
          description: `Your income fills the ${(bracket.rate * 100).toFixed(0)}% bracket up to $${Math.round(taxableIncome + brackets.deduction).toLocaleString()}, but it goes to $${Math.round(bracket.limit + brackets.deduction).toLocaleString()}. Consider Roth conversion or capital gains harvesting.`,
          impact: Math.round(unusedSpace * (nextBracket.rate - bracket.rate)),
          action: `Options to fill the bracket:\n1. Convert $${Math.round(unusedSpace).toLocaleString()} from Traditional to Roth IRA\n2. Harvest capital gains at 0% rate\n3. Exercise incentive stock options if you have them`,
          category: 'tax',
          metadata: {
            currentValue: taxableIncome,
            recommendedValue: bracket.limit,
            bracketRate: bracket.rate,
          },
        });
      }
      break;
    }
  }

  // Check for opportunity to shift income between years
  const yearsToRetirement = Math.max(0, retirementAge - age1);

  if (yearsToRetirement <= 5 && totalIncome > 150000) {
    // Approaching retirement - income will likely drop
    const { currentRate } = getBracketHeadroom(totalIncome, marital);

    recommendations.push({
      id: 'tax-income-shift',
      priority: 'low',
      title: 'Consider Deferring Income to Lower-Bracket Retirement Years',
      description: `You're ${yearsToRetirement} years from retirement. Your current ${(currentRate * 100).toFixed(0)}% bracket will likely drop to 12-22% in retirement.`,
      impact: Math.round(50000 * (currentRate - 0.22)), // Hypothetical $50k shift
      action: `Consider: 1) Max Traditional 401k to reduce current taxable income, 2) Defer bonuses if possible, 3) Delay exercising stock options until retirement`,
      category: 'tax',
      metadata: {
        bracketRate: currentRate,
        yearsAffected: yearsToRetirement,
      },
    });
  }

  // Capital gains tax bracket opportunity
  const ltcgBrackets = LTCG_BRACKETS[marital];
  const zeroCapGainsLimit = ltcgBrackets[0].limit;

  if (taxableIncome < zeroCapGainsLimit) {
    const capGainsRoom = zeroCapGainsLimit - taxableIncome;

    recommendations.push({
      id: 'tax-zero-cap-gains',
      priority: 'medium',
      title: `Harvest $${Math.round(capGainsRoom).toLocaleString()} in Capital Gains at 0% Tax`,
      description: `Your income qualifies for 0% long-term capital gains rate on the first $${Math.round(capGainsRoom).toLocaleString()} of gains. This is like getting a free step-up in basis.`,
      impact: Math.round(capGainsRoom * 0.15), // Saving 15% on these gains
      action: `Sell appreciated stocks in your taxable brokerage and immediately rebuy them. You realize the gain at 0% tax and reset your cost basis higher. No wash sale rule for gains.`,
      category: 'tax',
      metadata: {
        currentValue: 0,
        recommendedValue: capGainsRoom,
        bracketRate: 0,
      },
    });
  }

  return recommendations;
}

/**
 * Analyze Social Security optimization
 */
function analyzeSocialSecurityOptimization(inputs: OptimizationInputs): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    marital, age1, age2 = age1,
    ssIncome, ssClaimAge = 67,
    ssIncome2 = 0, ssClaimAge2 = 67,
    includeSS,
  } = inputs;

  if (!includeSS || ssIncome <= 0) return recommendations;

  const FRA = 67; // Full Retirement Age for most people today

  // Calculate PIA for both spouses
  const pia1 = calcPIA(ssIncome);
  const pia2 = marital === 'married' ? calcPIA(ssIncome2) : 0;

  // Calculate benefits at different claiming ages
  const benefit62_1 = calcSocialSecurity(ssIncome, 62);
  const benefit67_1 = calcSocialSecurity(ssIncome, 67);
  const benefit70_1 = calcSocialSecurity(ssIncome, 70);

  // Calculate breakeven and lifetime benefits
  const yearsToLifeExp = LIFE_EXP - age1;

  // Lifetime benefits calculation (simplified)
  const lifetime62 = benefit62_1 * Math.max(0, LIFE_EXP - 62);
  const lifetime67 = benefit67_1 * Math.max(0, LIFE_EXP - 67);
  const lifetime70 = benefit70_1 * Math.max(0, LIFE_EXP - 70);

  // Determine optimal claiming age
  let optimalAge = 67;
  let maxLifetime = lifetime67;

  if (lifetime70 > maxLifetime) {
    optimalAge = 70;
    maxLifetime = lifetime70;
  }
  if (lifetime62 > maxLifetime) {
    optimalAge = 62;
    maxLifetime = lifetime62;
  }

  // Current claiming age benefit
  const currentBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
  const currentLifetime = currentBenefit * Math.max(0, LIFE_EXP - ssClaimAge);

  // If delay is beneficial
  if (ssClaimAge < 70 && lifetime70 > currentLifetime) {
    const additionalLifetimeBenefit = lifetime70 - currentLifetime;
    const monthlyIncrease = benefit70_1 - currentBenefit;

    recommendations.push({
      id: 'ss-delay-to-70',
      priority: 'high',
      title: `Delay Social Security to Age 70 (+$${Math.round(monthlyIncrease / 12).toLocaleString()}/month)`,
      description: `Delaying from age ${ssClaimAge} to 70 increases your benefit by ${Math.round((benefit70_1 / currentBenefit - 1) * 100)}%. At average life expectancy, this adds $${Math.round(additionalLifetimeBenefit).toLocaleString()} to lifetime benefits.`,
      impact: Math.round(additionalLifetimeBenefit),
      action: `Plan to delay claiming until age 70. Use other savings (Roth, taxable) to bridge the gap. Each year of delay from FRA adds 8% to your benefit permanently.`,
      category: 'ss',
      metadata: {
        currentValue: ssClaimAge,
        recommendedValue: 70,
        annualBenefit: benefit70_1 - currentBenefit,
      },
    });
  }

  // Spousal strategy for married couples
  if (marital === 'married' && pia1 > 0 && pia2 > 0) {
    const higherEarner = pia1 > pia2 ? { pia: pia1, income: ssIncome } : { pia: pia2, income: ssIncome2 };
    const lowerEarner = pia1 > pia2 ? { pia: pia2, income: ssIncome2 } : { pia: pia1, income: ssIncome };

    // Check if lower earner might get spousal benefit
    const spousalBenefit = higherEarner.pia * 0.5;

    if (spousalBenefit > lowerEarner.pia) {
      recommendations.push({
        id: 'ss-spousal-strategy',
        priority: 'medium',
        title: 'Coordinate Spousal Social Security Claiming',
        description: `The lower earner may receive a spousal benefit (50% of higher earner's PIA = $${Math.round(spousalBenefit * 12).toLocaleString()}/year). The higher earner should delay to maximize the spousal benefit.`,
        impact: Math.round((spousalBenefit - lowerEarner.pia) * 12 * 20), // 20 years estimate
        action: `Strategy: Higher earner delays to 70 to maximize their benefit (which becomes survivor benefit). Lower earner can claim their own benefit at 62-67, then switch to spousal benefit when higher earner claims.`,
        category: 'ss',
        metadata: {
          currentValue: lowerEarner.pia * 12,
          recommendedValue: spousalBenefit * 12,
        },
      });
    }

    // Survivor benefit strategy
    const higherBenefit70 = calcSocialSecurity(higherEarner.income, 70) / 12;

    recommendations.push({
      id: 'ss-survivor-strategy',
      priority: 'medium',
      title: 'Maximize Survivor Benefit with Delayed Claiming',
      description: `When one spouse dies, the survivor gets the HIGHER of the two benefits. By having the higher earner delay to 70, you maximize the survivor benefit at $${Math.round(higherBenefit70 * 12).toLocaleString()}/year.`,
      impact: Math.round(higherBenefit70 * 12 * 10), // 10 years of survivor benefit
      action: `The higher earner (income $${Math.round(higherEarner.income).toLocaleString()}) should delay to 70. This protects the surviving spouse with the maximum possible benefit.`,
      category: 'ss',
    });
  }

  // Warn about early claiming
  if (ssClaimAge === 62 && yearsToLifeExp > 25) {
    const lostBenefit = lifetime70 - lifetime62;

    recommendations.push({
      id: 'ss-early-warning',
      priority: 'high',
      title: 'Claiming at 62 Could Cost You $' + Math.round(lostBenefit / 1000) + 'k',
      description: `Claiming at 62 gives you 70% of your full benefit. If you live to ${LIFE_EXP}, delaying to 70 would provide $${Math.round(lostBenefit).toLocaleString()} more in lifetime benefits.`,
      impact: -lostBenefit, // Negative impact
      action: `Only claim at 62 if: 1) You have health issues reducing life expectancy, 2) You have no other income sources, or 3) You need the money to pay off high-interest debt.`,
      category: 'ss',
    });
  }

  return recommendations;
}

/**
 * Analyze withdrawal strategy optimization
 */
function analyzeWithdrawalStrategy(inputs: OptimizationInputs): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const {
    marital, age1, retirementAge,
    taxableBalance, pretaxBalance, rothBalance,
    wdRate, retRate, inflationRate,
    includeSS, ssIncome, ssClaimAge = 67,
  } = inputs;

  const totalBalance = taxableBalance + pretaxBalance + rothBalance;

  if (totalBalance <= 0) return recommendations;

  const yearsToRetirement = Math.max(0, retirementAge - age1);
  const yearsInRetirement = LIFE_EXP - retirementAge;

  // Project account balances at retirement
  const projectedTaxable = calculateFutureValue(taxableBalance, yearsToRetirement, retRate);
  const projectedPretax = calculateFutureValue(pretaxBalance, yearsToRetirement, retRate);
  const projectedRoth = calculateFutureValue(rothBalance, yearsToRetirement, retRate);
  const projectedTotal = projectedTaxable + projectedPretax + projectedRoth;

  // Calculate annual withdrawal need
  const annualWithdrawal = projectedTotal * (wdRate / 100);

  // 1. Withdrawal Order Strategy
  const rothPct = projectedRoth / projectedTotal * 100;

  recommendations.push({
    id: 'withdrawal-order',
    priority: 'high',
    title: 'Use the Optimal Withdrawal Order: Taxable > Pre-tax > Roth',
    description: `At retirement, withdraw in this order to minimize taxes: 1) Taxable accounts (using tax-loss harvesting), 2) Pre-tax accounts (to fill low brackets), 3) Roth accounts (preserve tax-free growth).`,
    impact: Math.round(projectedRoth * 0.24 * 0.1), // Estimate tax savings from preserving Roth
    action: `Year 1-10: Draw from taxable brokerage (pay 0-15% on gains). Year 10-73: Draw from Traditional IRA to fill lower brackets. Year 73+: Use RMDs + Roth as needed. This sequence can save hundreds of thousands in lifetime taxes.`,
    category: 'withdrawal',
    metadata: {
      yearsAffected: yearsInRetirement,
    },
  });

  // 2. Roth Preservation Strategy
  if (rothBalance > 50000) {
    const rothGrowthTo95 = calculateFutureValue(projectedRoth, yearsInRetirement, retRate - inflationRate);

    recommendations.push({
      id: 'withdrawal-roth-last',
      priority: 'high',
      title: `Preserve Roth for Last: Could Be Worth $${Math.round(rothGrowthTo95 / 1000000 * 10) / 10}M by Age 95`,
      description: `Your Roth balance could grow to $${Math.round(rothGrowthTo95).toLocaleString()} tax-free by age ${LIFE_EXP}. If inherited, your heirs pay zero income tax on this amount.`,
      impact: Math.round(rothGrowthTo95 * 0.24), // Tax heirs would have paid on pre-tax
      action: `Never withdraw from Roth unless absolutely necessary. If you have a large unexpected expense, use taxable or even a home equity loan before touching Roth. The tax-free growth is too valuable.`,
      category: 'withdrawal',
      metadata: {
        currentValue: rothBalance,
        recommendedValue: rothGrowthTo95,
      },
    });
  }

  // 3. RMD Management Strategy
  if (pretaxBalance > 500000) {
    const ageAtRMD = RMD_START_AGE;
    const projectedPretaxAtRMD = calculateFutureValue(pretaxBalance, Math.max(0, ageAtRMD - age1), retRate);
    const firstRMD = projectedPretaxAtRMD / 26.5;

    if (firstRMD > 100000) {
      recommendations.push({
        id: 'withdrawal-rmd-planning',
        priority: 'high',
        title: `Your First RMD Could Be $${Math.round(firstRMD / 1000)}k (Plan Now!)`,
        description: `At age 73, you'll be REQUIRED to withdraw $${Math.round(firstRMD).toLocaleString()}/year from pre-tax accounts. This could push you into the 32%+ brackets and trigger IRMAA Medicare surcharges.`,
        impact: Math.round(firstRMD * 0.10 * 20), // 10% savings over 20 years of RMDs
        action: `Start Roth conversions at retirement to reduce pre-tax balance before RMDs. Target converting enough to keep future RMDs under $${Math.round(100000).toLocaleString()}/year.`,
        category: 'withdrawal',
        metadata: {
          currentValue: projectedPretaxAtRMD,
          recommendedValue: 100000 * 26.5, // Balance that produces $100k RMD
          yearsAffected: LIFE_EXP - RMD_START_AGE,
        },
      });
    }
  }

  // 4. Bucket Strategy Recommendation
  if (age1 >= retirementAge - 10 && totalBalance > 500000) {
    recommendations.push({
      id: 'withdrawal-bucket-strategy',
      priority: 'medium',
      title: 'Implement the "Bucket Strategy" for Peace of Mind',
      description: `Divide your portfolio into 3 buckets: 1) Cash/bonds for years 1-2, 2) Bonds/balanced for years 3-7, 3) Stocks for years 8+. This prevents selling stocks in a downturn.`,
      impact: Math.round(projectedTotal * 0.05), // Prevent 5% loss from panic selling
      action: `At retirement:\nBucket 1: $${Math.round(annualWithdrawal * 2).toLocaleString()} in cash/money market\nBucket 2: $${Math.round(annualWithdrawal * 5).toLocaleString()} in bonds/balanced funds\nBucket 3: Remainder in stock index funds\nRefill buckets annually from stock gains.`,
      category: 'withdrawal',
      metadata: {
        yearsAffected: yearsInRetirement,
      },
    });
  }

  // 5. Legacy/Estate Planning
  if (totalBalance > 1000000) {
    recommendations.push({
      id: 'withdrawal-legacy',
      priority: 'low',
      title: 'Consider "Die with Roth" Strategy for Maximum Legacy',
      description: `Heirs inherit Roth tax-free but must withdraw pre-tax accounts within 10 years (paying income tax). Prioritize spending pre-tax and preserving Roth for inheritance.`,
      impact: Math.round(projectedRoth * 0.24), // Tax savings for heirs
      action: `If leaving an inheritance is a goal: 1) Spend pre-tax first in retirement, 2) Do Roth conversions to "prepay" taxes at your lower rate, 3) Leave Roth to heirs who are in high tax brackets.`,
      category: 'withdrawal',
    });
  }

  return recommendations;
}

// ===============================
// Main Analysis Function
// ===============================

/**
 * Run complete optimization analysis and generate all recommendations
 */
export function analyzeOptimizations(inputs: OptimizationInputs): OptimizationResult {
  const allRecommendations: Recommendation[] = [];

  // Run all analyzers
  allRecommendations.push(...analyzeRothConversions(inputs));
  allRecommendations.push(...analyzeContributionOrder(inputs));
  allRecommendations.push(...analyzeTaxBracketArbitrage(inputs));
  allRecommendations.push(...analyzeSocialSecurityOptimization(inputs));
  allRecommendations.push(...analyzeWithdrawalStrategy(inputs));

  // Sort by priority and impact
  const priorityOrder: Record<RecommendationPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  const sortedRecommendations = allRecommendations.sort((a, b) => {
    // First by priority
    const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
    if (priorityDiff !== 0) return priorityDiff;
    // Then by impact (descending)
    return Math.abs(b.impact) - Math.abs(a.impact);
  });

  // Calculate total potential impact (only positive impacts)
  const totalPotentialImpact = sortedRecommendations
    .filter(r => r.impact > 0)
    .reduce((sum, r) => sum + r.impact, 0);

  return {
    recommendations: sortedRecommendations,
    totalPotentialImpact,
    analysisTimestamp: Date.now(),
  };
}

/**
 * Get top N recommendations
 */
export function getTopRecommendations(
  result: OptimizationResult,
  count: number = 5
): Recommendation[] {
  return result.recommendations.slice(0, count);
}

/**
 * Get recommendations by category
 */
export function getRecommendationsByCategory(
  result: OptimizationResult,
  category: RecommendationCategory
): Recommendation[] {
  return result.recommendations.filter(r => r.category === category);
}

/**
 * Get high priority recommendations only
 */
export function getHighPriorityRecommendations(
  result: OptimizationResult
): Recommendation[] {
  return result.recommendations.filter(r => r.priority === 'high');
}
