/**
 * AI Onboarding to Calculator State Mapper
 *
 * Converts extracted AI data and assumptions into complete calculator state
 */

import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import type { CalculatorInputs } from '@/types/calculator';
import { IRS_LIMITS_2026 } from '@/types/onboarding';
import { createDefaultPlanConfig } from '@/types/plan-config';

/**
 * Canonical defaults from createDefaultPlanConfig().
 * All fallback values in this mapper MUST come from here.
 * Cast to Required<PlanConfig> since createDefaultPlanConfig() provides all fields.
 */
const DEFAULTS = createDefaultPlanConfig() as Required<ReturnType<typeof createDefaultPlanConfig>>;

/**
 * State tax rates by state (simplified - top marginal rate)
 */
const STATE_TAX_RATES: Record<string, number> = {
  AK: 0, AL: 5.0, AR: 4.7, AZ: 2.5, CA: 13.3, CO: 4.4, CT: 6.99, DC: 10.75,
  DE: 6.6, FL: 0, GA: 5.75, HI: 11.0, IA: 6.0, ID: 5.8, IL: 4.95, IN: 3.15,
  KS: 5.7, KY: 4.5, LA: 4.25, MA: 5.0, MD: 5.75, ME: 7.15, MI: 4.25, MN: 9.85,
  MO: 4.95, MS: 5.0, MT: 5.9, NC: 4.5, ND: 2.9, NE: 5.84, NH: 0, NJ: 10.75,
  NM: 5.9, NV: 0, NY: 10.9, OH: 3.75, OK: 4.75, OR: 9.9, PA: 3.07, RI: 5.99,
  SC: 6.4, SD: 0, TN: 0, TX: 0, UT: 4.55, VA: 5.75, VT: 8.75, WA: 0, WI: 7.65,
  WV: 6.5, WY: 0,
};

/**
 * Default return assumptions — sourced from createDefaultPlanConfig()
 */
const DEFAULT_ASSUMPTIONS = {
  retRate: DEFAULTS.retRate,
  inflationRate: DEFAULTS.inflationRate,
  wdRate: DEFAULTS.wdRate,
  dividendYield: DEFAULTS.dividendYield,
  incRate: DEFAULTS.incRate,
};

const clamp = (value: number, min: number, max: number): number => (
  Math.min(max, Math.max(min, value))
);

const roundToNearest = (value: number, nearest: number): number => (
  Math.round(value / nearest) * nearest
);

const formatCurrency = (value: number): string => (
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
);

function calculateMonthlyRecurringExpenses(data: ExtractedData, includeChildcare = true): number {
  return (
    (data.monthlyMortgageRent ?? 0) +
    (data.monthlyUtilities ?? 0) +
    (data.monthlyInsurancePropertyTax ?? 0) +
    (data.monthlyHealthcareP1 ?? 0) +
    (data.monthlyHealthcareP2 ?? 0) +
    (data.monthlyOtherExpenses ?? 0) +
    (data.monthlyHouseholdExpenses ?? 0) +
    (data.monthlyDiscretionary ?? 0) +
    (includeChildcare ? (data.monthlyChildcare ?? 0) : 0)
  );
}

function estimateEmergencyFund(data: ExtractedData, totalIncome: number): number {
  const monthlyExpenses = calculateMonthlyRecurringExpenses(data);
  if (monthlyExpenses > 0) {
    return roundToNearest(monthlyExpenses * 3, 1000);
  }

  // Fallback when expense data is unavailable: use a capped income proxy,
  // not three months of gross income for very high earners.
  return roundToNearest(clamp(totalIncome * 0.10, 15000, 100000), 1000);
}

function estimateCurrentBalances(totalIncome: number, age: number): {
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
} {
  const ageFactor = clamp((age - 25) / 10, 0.25, 3);
  const pretaxRate = totalIncome >= 700000 ? 0.45 : totalIncome >= 400000 ? 0.35 : 0.25;
  const rothRate = totalIncome >= 700000 ? 0.14 : totalIncome >= 400000 ? 0.10 : 0.06;
  const taxableRate = totalIncome >= 700000 ? 0.08 : totalIncome >= 400000 ? 0.06 : 0.04;

  return {
    pretaxBalance: roundToNearest(totalIncome * pretaxRate * ageFactor, 5000),
    rothBalance: roundToNearest(totalIncome * rothRate * ageFactor, 5000),
    taxableBalance: roundToNearest(totalIncome * taxableRate * ageFactor, 5000),
  };
}

function incomeReplacementRatio(totalIncome: number): number {
  if (totalIncome >= 700000) return 0.35;
  if (totalIncome >= 400000) return 0.45;
  if (totalIncome >= 250000) return 0.55;
  if (totalIncome >= 150000) return 0.65;
  return 0.75;
}

function estimateRetirementSpending(data: ExtractedData, totalIncome: number, isMarried: boolean): {
  amount: number;
  reasoning: string;
} {
  const monthlyRecurring = calculateMonthlyRecurringExpenses(data, false);
  const replacementCap = roundToNearest(totalIncome * incomeReplacementRatio(totalIncome), 5000);

  if (monthlyRecurring > 0) {
    const expenseBased = roundToNearest(monthlyRecurring * 12 * 0.9, 5000);
    const minimum = Math.min(isMarried ? 60000 : 45000, replacementCap);
    return {
      amount: Math.max(minimum, Math.min(expenseBased, replacementCap)),
      reasoning: 'Estimated in today’s dollars from recurring expenses, excluding childcare and savings',
    };
  }

  return {
    amount: replacementCap,
    reasoning: `Today’s-dollar estimate using a progressive high-income replacement ratio (${Math.round(incomeReplacementRatio(totalIncome) * 100)}% of gross income)`,
  };
}

function estimateEffectiveTaxRate(
  totalIncome: number,
  stateCode?: string,
  employmentType1?: ExtractedData['employmentType1'],
  employmentType2?: ExtractedData['employmentType2']
): number {
  let federalAndPayroll: number;
  if (totalIncome >= 700000) federalAndPayroll = 0.34;
  else if (totalIncome >= 400000) federalAndPayroll = 0.30;
  else if (totalIncome >= 250000) federalAndPayroll = 0.26;
  else if (totalIncome >= 150000) federalAndPayroll = 0.22;
  else federalAndPayroll = 0.17;

  const hasSelfEmployment = [employmentType1, employmentType2].some(
    type => type === 'self-employed' || type === 'both'
  );
  const selfEmploymentAdd = hasSelfEmployment ? 0.02 : 0;
  const stateTopRate = stateCode ? (STATE_TAX_RATES[stateCode] ?? 0) / 100 : 0;
  const stateAdd = Math.min(stateTopRate * 0.55, 0.08);

  return clamp(federalAndPayroll + selfEmploymentAdd + stateAdd, 0.12, 0.46);
}

function estimateTaxableSavings(
  data: ExtractedData,
  totalIncome: number,
  annualRetirementContributions: number,
  stateCode?: string
): number {
  const monthlyExpenses = calculateMonthlyRecurringExpenses(data);
  const effectiveTaxRate = estimateEffectiveTaxRate(
    totalIncome,
    stateCode,
    data.employmentType1,
    data.employmentType2
  );

  if (monthlyExpenses > 0) {
    const afterTaxIncome = totalIncome * (1 - effectiveTaxRate);
    const surplusAfterExpensesAndRetirement =
      afterTaxIncome - (monthlyExpenses * 12) - annualRetirementContributions;

    if (surplusAfterExpensesAndRetirement > 0) {
      return roundToNearest(
        clamp(surplusAfterExpensesAndRetirement * 0.55, 0, totalIncome * 0.25),
        5000
      );
    }
  }

  const defaultSavingsRate = calculateRecommendedSavingsRate(totalIncome);
  return roundToNearest(totalIncome * defaultSavingsRate * 0.15, 5000);
}

/**
 * Map AI extracted data to full calculator inputs
 */
export function mapAIDataToCalculator(
  extractedData: ExtractedData,
  assumptions: AssumptionWithReasoning[]
): Partial<CalculatorInputs> & { generatedAssumptions: AssumptionWithReasoning[] } {
  const generatedAssumptions: AssumptionWithReasoning[] = [...assumptions];

  // Helper to add assumption
  const addAssumption = (
    field: string,
    displayName: string,
    value: string | number | boolean | null,
    reasoning: string,
    confidence: 'high' | 'medium' | 'low' = 'medium'
  ): void => {
    generatedAssumptions.push({
      field,
      displayName,
      value,
      reasoning,
      confidence,
      userProvided: false,
    });
  };

  // === VALIDATION ===
  // Validate extracted data before processing
  const validateData = () => {
    const warnings: string[] = [];

    // Validate balances (should be non-negative)
    if (extractedData.currentTraditional !== undefined && extractedData.currentTraditional < 0) {
      console.warn('[Mapper] Invalid Traditional balance (negative):', extractedData.currentTraditional);
      extractedData.currentTraditional = 0;
    }
    if (extractedData.currentRoth !== undefined && extractedData.currentRoth < 0) {
      console.warn('[Mapper] Invalid Roth balance (negative):', extractedData.currentRoth);
      extractedData.currentRoth = 0;
    }
    if (extractedData.currentTaxable !== undefined && extractedData.currentTaxable < 0) {
      console.warn('[Mapper] Invalid Taxable balance (negative):', extractedData.currentTaxable);
      extractedData.currentTaxable = 0;
    }
    if (extractedData.emergencyFund !== undefined && extractedData.emergencyFund < 0) {
      console.warn('[Mapper] Invalid Emergency fund (negative):', extractedData.emergencyFund);
      extractedData.emergencyFund = 0;
    }

    // Validate contributions (should be non-negative and reasonable)
    if (extractedData.contributionTraditional !== undefined) {
      if (extractedData.contributionTraditional < 0) {
        console.warn('[Mapper] Invalid Traditional contribution (negative):', extractedData.contributionTraditional);
        extractedData.contributionTraditional = 0;
      }
      // Check against IRS limits (with some buffer for employer match)
      const maxTraditional = IRS_LIMITS_2026['401k'] * (extractedData.maritalStatus === 'married' ? 2 : 1) * 1.5;
      if (extractedData.contributionTraditional > maxTraditional) {
        console.warn('[Mapper] Traditional contribution exceeds reasonable limit:', extractedData.contributionTraditional, 'max:', maxTraditional);
        warnings.push(`Traditional 401k contribution ($${extractedData.contributionTraditional.toLocaleString()}) seems very high for IRS limits`);
      }
    }

    if (extractedData.contributionRoth !== undefined) {
      if (extractedData.contributionRoth < 0) {
        console.warn('[Mapper] Invalid Roth contribution (negative):', extractedData.contributionRoth);
        extractedData.contributionRoth = 0;
      }
      const maxRoth = IRS_LIMITS_2026.ira * (extractedData.maritalStatus === 'married' ? 2 : 1);
      if (extractedData.contributionRoth > maxRoth * 2) {
        console.warn('[Mapper] Roth contribution exceeds IRS limits significantly:', extractedData.contributionRoth, 'max:', maxRoth);
        warnings.push(`Roth contribution ($${extractedData.contributionRoth.toLocaleString()}) exceeds IRS limits ($${maxRoth.toLocaleString()})`);
      }
    }

    if (extractedData.contributionTaxable !== undefined && extractedData.contributionTaxable < 0) {
      console.warn('[Mapper] Invalid Taxable contribution (negative):', extractedData.contributionTaxable);
      extractedData.contributionTaxable = 0;
    }

    if (extractedData.contributionMatch !== undefined && extractedData.contributionMatch < 0) {
      console.warn('[Mapper] Invalid Employer match (negative):', extractedData.contributionMatch);
      extractedData.contributionMatch = 0;
    }

    // Validate ages
    if (extractedData.age !== undefined && (extractedData.age < 18 || extractedData.age > 100)) {
      console.warn('[Mapper] Invalid age:', extractedData.age);
      warnings.push(`Age (${extractedData.age}) seems unusual`);
    }

    if (extractedData.retirementAge !== undefined && extractedData.age !== undefined) {
      if (extractedData.retirementAge <= extractedData.age) {
        console.warn('[Mapper] Retirement age must be greater than current age');
        extractedData.retirementAge = extractedData.age + 10; // Default to 10 years from now
        warnings.push(`Retirement age adjusted to ${extractedData.retirementAge} (must be greater than current age)`);
      }
    }

    // Validate total contributions vs income (warning only)
    if (extractedData.primaryIncome !== undefined) {
      const totalContributions =
        (extractedData.contributionTraditional || 0) +
        (extractedData.contributionRoth || 0) +
        (extractedData.contributionTaxable || 0);
      const totalIncome = extractedData.primaryIncome + (extractedData.spouseIncome || 0);

      if (totalContributions > totalIncome) {
        console.warn('[Mapper] Total contributions exceed income:', { totalContributions, totalIncome });
        warnings.push(`Total contributions ($${totalContributions.toLocaleString()}) exceed annual income ($${totalIncome.toLocaleString()}) - verify these numbers`);
      }
    }

    if (warnings.length > 0) {
      console.warn('[Mapper] Validation warnings:', warnings);
    }

    return warnings;
  };

  validateData();

  // === Personal Information ===
  const age1 = extractedData.age ?? DEFAULTS.age1;
  const marital = extractedData.maritalStatus ?? DEFAULTS.marital;
  const age2 = extractedData.spouseAge ?? age1;

  if (!extractedData.age) {
    addAssumption('age1', 'Your Age', age1, 'Using default age for planning purposes', 'low');
  }

  // === Family & Children ===
  // Preserve undefined when wizard didn't ask, so legacy planning tab keeps its defaults
  const numChildren = extractedData.numChildren;
  const childrenAges = extractedData.childrenAges;
  const additionalChildrenExpected = extractedData.additionalChildrenExpected;

  // === Employment & Income ===
  const employmentType1 = extractedData.employmentType1 ?? DEFAULTS.employmentType1;
  const employmentType2 = extractedData.employmentType2;
  const primaryIncome = extractedData.primaryIncome ?? DEFAULTS.primaryIncome;
  const spouseIncome = extractedData.spouseIncome ?? DEFAULTS.spouseIncome;
  const totalIncome = primaryIncome + spouseIncome;
  const stateCode = extractedData.state?.toUpperCase();

  if (!extractedData.primaryIncome) {
    addAssumption(
      'primaryIncome',
      'Your Annual Income',
      primaryIncome,
      'Using median household income as starting point',
      'low'
    );
  }

  // === Current Balances ===
  const estimatedBalances = estimateCurrentBalances(totalIncome, age1);
  const emergencyFund = extractedData.emergencyFund ?? estimateEmergencyFund(extractedData, totalIncome);
  const taxableBalance = extractedData.currentTaxable ?? estimatedBalances.taxableBalance;
  const pretaxBalance = extractedData.currentTraditional ?? estimatedBalances.pretaxBalance;
  const rothBalance = extractedData.currentRoth ?? estimatedBalances.rothBalance;

  if (!extractedData.emergencyFund) {
    addAssumption(
      'emergencyFund',
      'Emergency Fund',
      emergencyFund,
      calculateMonthlyRecurringExpenses(extractedData) > 0
        ? 'Assumed roughly 3 months of recurring expenses, not 3 months of gross income'
        : 'Estimated from income with a high-earner cap',
      'medium'
    );
  }

  if (!extractedData.currentTaxable) {
    addAssumption(
      'taxableBalance',
      'Taxable Brokerage',
      taxableBalance,
      'Estimated from income and age; replace with actual brokerage balance',
      'low'
    );
  }

  if (!extractedData.currentTraditional) {
    addAssumption(
      'pretaxBalance',
      'Traditional 401k/IRA',
      pretaxBalance,
      'Estimated from income and age; replace with actual pre-tax retirement balance',
      'low'
    );
  }

  if (!extractedData.currentRoth) {
    addAssumption(
      'rothBalance',
      'Roth Accounts',
      rothBalance,
      'Estimated from income and age; replace with actual Roth balance',
      'low'
    );
  }

  // === Annual Savings Contributions ===
  // NEW: Use direct contribution amounts if provided, otherwise calculate
  let cPre1: number, cPost1: number, cTax1: number, cMatch1: number;

  if (extractedData.contributionTraditional !== undefined) {
    // Use user-provided traditional contribution
    // For K-1/self-employed: use total 401k limit (includes profit-sharing/employer contributions)
    // For W-2: use employee-only 401k limit
    // K-1 income is mapped to 'self-employed' in this app
    const isP1SelfEmployed = employmentType1 === 'self-employed';
    const p1Limit = isP1SelfEmployed ? IRS_LIMITS_2026['401kTotal'] : IRS_LIMITS_2026['401k'];

    if (marital === 'married') {
      // Smart allocation: distribute proportionally based on each person's limit capacity
      // This ensures self-employed (including K-1) can use their higher profit-sharing limits
      const isP2SelfEmployed = employmentType2 === 'self-employed';
      const p2Limit = isP2SelfEmployed ? IRS_LIMITS_2026['401kTotal'] : IRS_LIMITS_2026['401k'];
      const totalLimit = p1Limit + p2Limit;
      const totalContrib = extractedData.contributionTraditional;

      // Allocate proportionally to limits, capped at each person's max
      const p1Share = (p1Limit / totalLimit) * totalContrib;
      cPre1 = Math.min(p1Share, p1Limit);
      // Note: cPre2 will be set in the married section below using p2Share calculation
    } else {
      cPre1 = Math.min(extractedData.contributionTraditional, p1Limit);
    }
  } else if (extractedData.savingsRateTraditional1 !== undefined) {
    // Legacy field support
    cPre1 = extractedData.savingsRateTraditional1;
  } else {
    // Calculate default based on income
    const defaultSavingsRate = calculateRecommendedSavingsRate(primaryIncome);
    const isP1SelfEmployed = employmentType1 === 'self-employed' || employmentType1 === 'both';
    const p1Limit = isP1SelfEmployed ? IRS_LIMITS_2026['401kTotal'] : IRS_LIMITS_2026['401k'];
    cPre1 = Math.min(p1Limit, primaryIncome * defaultSavingsRate * 0.6);
    addAssumption(
      'cPre1',
      'Traditional 401k Contributions',
      cPre1,
      isP1SelfEmployed
        ? 'Uses the higher self-employed/K-1 retirement plan limit instead of employee-only 401(k) limit'
        : `Recommended ${Math.round((cPre1 / primaryIncome) * 100)}% of income to traditional accounts`,
      'medium'
    );
  }

  if (extractedData.contributionRoth !== undefined) {
    // Use user-provided Roth contribution
    // For married couples, split between person 1 and person 2 (up to IRS limits)
    if (marital === 'married') {
      const perPerson = extractedData.contributionRoth / 2;
      cPost1 = Math.min(perPerson, IRS_LIMITS_2026.ira);
    } else {
      cPost1 = Math.min(extractedData.contributionRoth, IRS_LIMITS_2026.ira);
    }
  } else if (extractedData.savingsRateRoth1 !== undefined) {
    // Legacy field support
    cPost1 = extractedData.savingsRateRoth1;
  } else {
    // Calculate default based on income
    const defaultSavingsRate = calculateRecommendedSavingsRate(primaryIncome);
    cPost1 = Math.min(IRS_LIMITS_2026.ira, primaryIncome * defaultSavingsRate * 0.3);
    addAssumption(
      'cPost1',
      'Roth Contributions',
      cPost1,
      'Diversifying tax treatment with Roth contributions',
      'medium'
    );
  }

  if (extractedData.contributionTaxable !== undefined) {
    // Use user-provided taxable contribution directly
    cTax1 = extractedData.contributionTaxable;
  } else if (extractedData.savingsRateTaxable1 !== undefined) {
    // Legacy field support
    cTax1 = extractedData.savingsRateTaxable1;
  } else {
    // Filled after spouse contributions are known so the default can be household-aware.
    cTax1 = 0;
  }

  if (extractedData.contributionMatch !== undefined) {
    // Use user-provided employer match
    cMatch1 = extractedData.contributionMatch;
  } else {
    // No employer match assumed - user must provide this in the wizard
    cMatch1 = 0;
  }

  // Person 2 contributions (if married)
  let cPre2 = 0,
    cPost2 = 0,
    cTax2 = 0,
    cMatch2 = 0;

  if (marital === 'married' && spouseIncome > 0) {
    // NEW: If user provided combined contributions, split them proportionally by limit
    if (extractedData.contributionTraditional !== undefined) {
      // Use proportional allocation matching the logic used for cPre1
      // K-1 income is mapped to 'self-employed' in this app
      const isP1SelfEmployed = employmentType1 === 'self-employed';
      const isP2SelfEmployed = employmentType2 === 'self-employed';
      const p1Limit = isP1SelfEmployed ? IRS_LIMITS_2026['401kTotal'] : IRS_LIMITS_2026['401k'];
      const p2Limit = isP2SelfEmployed ? IRS_LIMITS_2026['401kTotal'] : IRS_LIMITS_2026['401k'];
      const totalLimit = p1Limit + p2Limit;
      const totalContrib = extractedData.contributionTraditional;

      // Allocate proportionally to limits, capped at each person's max
      const p2Share = (p2Limit / totalLimit) * totalContrib;
      cPre2 = Math.min(p2Share, p2Limit);
    } else if (extractedData.savingsRateTraditional2 !== undefined) {
      // Legacy field support
      cPre2 = extractedData.savingsRateTraditional2;
    } else {
      // Calculate default based on income
      const defaultSavingsRate2 = calculateRecommendedSavingsRate(spouseIncome);
      const person1IsMaxing401k = cPre1 >= IRS_LIMITS_2026['401k'] * 0.9;

      if (person1IsMaxing401k) {
        // If person 1 maxes 401k, assume person 2 does too
        cPre2 = Math.min(IRS_LIMITS_2026['401k'], spouseIncome);
        addAssumption(
          'cPre2',
          'Spouse Traditional 401k',
          cPre2,
          'Matching Person 1 max contribution strategy for joint household',
          'medium'
        );
      } else {
        cPre2 = Math.min(IRS_LIMITS_2026['401k'], spouseIncome * defaultSavingsRate2 * 0.6);
        addAssumption(
          'cPre2',
          'Spouse Traditional 401k',
          cPre2,
          `Recommended ${Math.round((cPre2 / spouseIncome) * 100)}% of spouse income`,
          'medium'
        );
      }
    }

    if (extractedData.contributionRoth !== undefined) {
      // Split Roth contribution between person 1 and person 2
      const perPerson = extractedData.contributionRoth / 2;
      cPost2 = Math.min(perPerson, IRS_LIMITS_2026.ira);
    } else if (extractedData.savingsRateRoth2 !== undefined) {
      // Legacy field support
      cPost2 = extractedData.savingsRateRoth2;
    } else {
      // Calculate default based on income
      const defaultSavingsRate2 = calculateRecommendedSavingsRate(spouseIncome);
      const person1IsMaxingRoth = cPost1 >= IRS_LIMITS_2026.ira * 0.9;

      if (person1IsMaxingRoth) {
        // If person 1 maxes Roth, assume person 2 does too
        cPost2 = Math.min(IRS_LIMITS_2026.ira, spouseIncome);
        addAssumption(
          'cPost2',
          'Spouse Roth Contributions',
          cPost2,
          'Matching Person 1 max contribution strategy for joint household',
          'medium'
        );
      } else {
        cPost2 = Math.min(IRS_LIMITS_2026.ira, spouseIncome * defaultSavingsRate2 * 0.3);
        addAssumption(
          'cPost2',
          'Spouse Roth Contributions',
          cPost2,
          'Diversifying tax treatment with Roth contributions',
          'medium'
        );
      }
    }

    // Taxable contributions for person 2: split combined total proportionally
    if (extractedData.contributionTaxable !== undefined) {
      // Split combined taxable contribution proportionally by income
      const totalIncome = primaryIncome + spouseIncome;
      const person2Ratio = totalIncome > 0 ? spouseIncome / totalIncome : 0.5;
      cTax2 = extractedData.contributionTaxable * person2Ratio;
      // Also adjust cTax1 to be the remainder
      cTax1 = extractedData.contributionTaxable * (1 - person2Ratio);
    } else if (extractedData.savingsRateTaxable2 !== undefined) {
      // Legacy field support
      cTax2 = extractedData.savingsRateTaxable2;
    } else {
      // Filled after household taxable savings estimate is calculated.
      cTax2 = 0;
    }

    // Employer match for person 2: split combined match proportionally
    if (extractedData.contributionMatch !== undefined) {
      // Split combined match proportionally by income
      const totalIncome = primaryIncome + spouseIncome;
      const person2Ratio = totalIncome > 0 ? spouseIncome / totalIncome : 0.5;
      // Use 401kTotal limit (employee + employer combined) to cap match, not employee-only 401k limit
      // This is correct because employer match is an employer contribution that must fit within
      // the total annual addition limit ($72k for 2026), not the employee elective deferral limit ($24.5k)
      cMatch2 = Math.max(0, Math.min(extractedData.contributionMatch * person2Ratio, IRS_LIMITS_2026['401kTotal'] - cPre2));
      // Also adjust cMatch1 to be the remainder
      cMatch1 = Math.max(0, Math.min(extractedData.contributionMatch * (1 - person2Ratio), IRS_LIMITS_2026['401kTotal'] - cPre1));
    } else {
      // No employer match assumed - user must provide this in the wizard
      cMatch2 = 0;
    }
  }

  const needsTaxableSavingsEstimate =
    extractedData.contributionTaxable === undefined &&
    extractedData.savingsRateTaxable1 === undefined &&
    extractedData.savingsRateTaxable2 === undefined;

  if (needsTaxableSavingsEstimate) {
    const combinedTaxableSavings = estimateTaxableSavings(
      extractedData,
      totalIncome,
      cPre1 + cPre2 + cPost1 + cPost2,
      stateCode
    );
    const p1Ratio = marital === 'married' && totalIncome > 0
      ? primaryIncome / totalIncome
      : 1;

    cTax1 = combinedTaxableSavings * p1Ratio;
    cTax2 = marital === 'married' ? combinedTaxableSavings * (1 - p1Ratio) : 0;

    addAssumption(
      'cTax1',
      'Taxable Account Savings',
      Math.round(cTax1),
      'Estimated from after-tax surplus after recurring expenses and retirement contributions',
      'medium'
    );

    if (marital === 'married' && spouseIncome > 0) {
      addAssumption(
        'cTax2',
        'Spouse Taxable Savings',
        Math.round(cTax2),
        'Household taxable savings allocated by income share',
        'medium'
      );
    }
  }

  // === Income Details (Bonus, First Pay Date) ===
  // Parse bonusInfo if present (e.g., "$15,000 in December")
  let eoyBonusAmount: number | undefined;
  let eoyBonusMonth: string | undefined;

  if (extractedData.bonusInfo) {
    const bonusText = extractedData.bonusInfo.toLowerCase();

    // Extract dollar amount
    const dollarMatch = bonusText.match(/\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
    if (dollarMatch) {
      eoyBonusAmount = parseFloat(dollarMatch[1].replace(/,/g, ''));
    } else {
      // Try to find plain number
      const numberMatch = bonusText.match(/(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/);
      if (numberMatch) {
        eoyBonusAmount = parseFloat(numberMatch[1].replace(/,/g, ''));
      }
    }

    // Extract month
    const months = ['january', 'february', 'march', 'april', 'may', 'june',
                    'july', 'august', 'september', 'october', 'november', 'december'];
    for (const month of months) {
      if (bonusText.includes(month)) {
        eoyBonusMonth = month.charAt(0).toUpperCase() + month.slice(1);
        break;
      }
    }

  }

  // === Retirement Goals ===
  // IMPORTANT: Use user-specified retirement age if provided, don't override it
  const retirementAge = extractedData.retirementAge ?? calculateRecommendedRetirementAge(age1, primaryIncome);

  if (!extractedData.retirementAge) {
    addAssumption(
      'retirementAge',
      'Retirement Age',
      retirementAge,
      'Based on current age and financial profile',
      'medium'
    );
  }

  // Desired retirement spending (useful context, kept for display)
  const estimatedRetirementSpending = estimateRetirementSpending(extractedData, totalIncome, marital === 'married');
  const desiredSpending =
    extractedData.desiredRetirementSpending ??
    estimatedRetirementSpending.amount;

  // Use the standard safe withdrawal rate from defaults.
  // The old formula (desiredSpending / currentPortfolio) produced nonsensical
  // results for young savers whose portfolios are still small relative to spending.
  const wdRate = DEFAULT_ASSUMPTIONS.wdRate;

  if (!extractedData.desiredRetirementSpending) {
    const yearsToRetirement = Math.max(0, retirementAge - age1);
    const nominalAtRetirement = Math.round(
      desiredSpending * Math.pow(1 + DEFAULT_ASSUMPTIONS.inflationRate / 100, yearsToRetirement)
    );

    addAssumption(
      'desiredRetirementSpending',
      'Retirement Spending (Today’s Dollars)',
      desiredSpending,
      `${estimatedRetirementSpending.reasoning}. At ${DEFAULT_ASSUMPTIONS.inflationRate}% inflation, ${formatCurrency(desiredSpending)} today is about ${formatCurrency(nominalAtRetirement)} in year-one retirement dollars.`,
      'medium'
    );
  }

  addAssumption(
    'wdRate',
    'Withdrawal Rate',
    wdRate,
    'Standard safe withdrawal rate for retirement planning',
    'high'
  );

  // === State Tax Rate ===
  const stateRate = stateCode && STATE_TAX_RATES[stateCode] ? STATE_TAX_RATES[stateCode] : 0;

  if (extractedData.state) {
    addAssumption(
      'stateRate',
      'State Tax Rate',
      stateRate,
      `${stateCode} top marginal rate applied`,
      'high'
    );
  }

  // === Return Assumptions ===
  addAssumption(
    'retRate',
    'Expected Return',
    DEFAULT_ASSUMPTIONS.retRate,
    'Historical S&P 500 nominal return average',
    'high'
  );

  addAssumption(
    'inflationRate',
    'Inflation Rate',
    DEFAULT_ASSUMPTIONS.inflationRate,
    'Long-term historical inflation average',
    'high'
  );

  addAssumption(
    'dividendYield',
    'Dividend Yield',
    DEFAULT_ASSUMPTIONS.dividendYield,
    'Typical portfolio dividend yield',
    'medium'
  );

  addAssumption(
    'incRate',
    'Income Growth Rate',
    DEFAULT_ASSUMPTIONS.incRate,
    'Wage inflation plus typical raises',
    'medium'
  );

  // === Social Security ===
  const includeSS = true;
  const ssIncome = primaryIncome; // Use full income for SS calculation
  const ssClaimAge = 67; // Full retirement age
  const ssIncome2 = marital === 'married' ? spouseIncome : 0;
  const ssClaimAge2 = 67;

  addAssumption(
    'includeSS',
    'Social Security',
    true,
    'Including Social Security benefits in retirement plan',
    'high'
  );

  // === Build Complete Calculator Inputs ===
  const calculatorInputs: Partial<CalculatorInputs> = {
    // Personal & Family
    marital,
    age1,
    age2,
    retirementAge,
    // Only include children fields when explicitly provided by the wizard,
    // so fieldMetadata won't track them and legacy tab keeps its defaults.
    ...(numChildren !== undefined && { numChildren }),
    ...(childrenAges !== undefined && { childrenAges }),
    ...(additionalChildrenExpected !== undefined && { additionalChildrenExpected }),

    // Employment & Income
    employmentType1,
    employmentType2,
    primaryIncome: primaryIncome,
    spouseIncome: spouseIncome,

    // Income Calculator Details
    ...(eoyBonusAmount !== undefined && { eoyBonusAmount }),
    ...(eoyBonusMonth && { eoyBonusMonth }),
    // TODO: Add firstPayDate extraction from wizard conversation

    // Current Balances
    emergencyFund,
    taxableBalance,
    pretaxBalance,
    rothBalance,

    // Contributions
    cTax1: Math.round(cTax1),
    cPre1: Math.round(cPre1),
    cPost1: Math.round(cPost1),
    cMatch1: Math.round(cMatch1),
    cTax2: Math.round(cTax2),
    cPre2: Math.round(cPre2),
    cPost2: Math.round(cPost2),
    cMatch2: Math.round(cMatch2),

    // Housing & Expenses — always include so fieldMetadata tracks them
    monthlyMortgageRent: extractedData.monthlyMortgageRent ?? 0,
    monthlyUtilities: extractedData.monthlyUtilities ?? 0,
    monthlyInsurancePropertyTax: extractedData.monthlyInsurancePropertyTax ?? 0,
    monthlyHealthcareP1: extractedData.monthlyHealthcareP1 ?? 0,
    monthlyHealthcareP2: extractedData.monthlyHealthcareP2 ?? 0,
    monthlyOtherExpenses: extractedData.monthlyOtherExpenses ?? 0,

    // Additional expense categories (for 2026 income calculators)
    monthlyHouseholdExpenses: extractedData.monthlyHouseholdExpenses ?? 0,
    monthlyDiscretionary: extractedData.monthlyDiscretionary ?? 0,
    monthlyChildcare: extractedData.monthlyChildcare ?? 0,
    annualLifeInsuranceP1: extractedData.annualLifeInsuranceP1 ?? 0,
    annualLifeInsuranceP2: extractedData.annualLifeInsuranceP2 ?? 0,

    // Rates & Assumptions
    retRate: DEFAULT_ASSUMPTIONS.retRate,
    inflationRate: DEFAULT_ASSUMPTIONS.inflationRate,
    stateRate,
    incContrib: true, // Enable annual increases
    incRate: DEFAULT_ASSUMPTIONS.incRate,
    wdRate,
    dividendYield: DEFAULT_ASSUMPTIONS.dividendYield,

    // Social Security
    includeSS,
    ssIncome,
    ssClaimAge,
    ssIncome2,
    ssClaimAge2,

    // Simulation defaults - use Monte Carlo (random walk) for realistic projections
    returnMode: 'randomWalk',
    randomWalkSeries: 'trulyRandom',
    seed: 12345,
  };

  return {
    ...calculatorInputs,
    generatedAssumptions,
  };
}

/**
 * Calculate recommended savings rate based on income
 */
function calculateRecommendedSavingsRate(income: number): number {
  if (income < 50000) return 0.10; // 10%
  if (income < 75000) return 0.12; // 12%
  if (income < 100000) return 0.15; // 15%
  if (income < 150000) return 0.18; // 18%
  return 0.20; // 20%
}

/**
 * Calculate recommended retirement age based on profile
 */
function calculateRecommendedRetirementAge(currentAge: number, income: number): number {
  const baseAge = 65;

  // Higher income = potential for earlier retirement
  if (income > 200000) return Math.max(currentAge + 10, 60);
  if (income > 150000) return Math.max(currentAge + 15, 62);
  if (income > 100000) return Math.max(currentAge + 20, 65);

  return Math.max(currentAge + 25, baseAge);
}

/**
 * Compile-time field mapping documentation.
 * Maps ExtractedData field names → PlanConfig/CalculatorInputs field names.
 * If either side renames a field, TypeScript will catch it here.
 */
type _FieldMappingAssertion = {
  [K in keyof Required<Pick<ExtractedData,
    'currentTaxable' | 'currentTraditional' | 'currentRoth' |
    'age' | 'spouseAge' | 'maritalStatus'
  >>]: K extends 'currentTaxable' ? 'taxableBalance'
    : K extends 'currentTraditional' ? 'pretaxBalance'
    : K extends 'currentRoth' ? 'rothBalance'
    : K extends 'age' ? 'age1'
    : K extends 'spouseAge' ? 'age2'
    : K extends 'maritalStatus' ? 'marital'
    : never;
};

// Verify the mapping targets exist on CalculatorInputs (compile-time check)
// Reason: Type-level assertion to ensure field mapping is correct at compile time
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _VerifyMappingTargets = {
  [K in _FieldMappingAssertion[keyof _FieldMappingAssertion]]: K extends keyof CalculatorInputs ? true : never;
};

/**
 * Validate that calculator inputs are complete and valid
 */
export function validateCalculatorInputsAI(inputs: Partial<CalculatorInputs>): {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
} {
  const requiredFields: Array<keyof CalculatorInputs> = [
    'marital',
    'age1',
    'age2',
    'retirementAge',
    'taxableBalance',
    'pretaxBalance',
    'rothBalance',
    'cTax1',
    'cPre1',
    'cPost1',
    'cMatch1',
    'retRate',
    'inflationRate',
    'wdRate',
  ];

  const missingFields = requiredFields.filter((field) => inputs[field] === undefined);
  const errors: string[] = [];

  // Validation rules
  if (inputs.age1 && (inputs.age1 < 18 || inputs.age1 > 100)) {
    errors.push('Age must be between 18 and 100');
  }

  if (inputs.retirementAge && inputs.age1 && inputs.retirementAge <= inputs.age1) {
    errors.push('Retirement age must be greater than current age');
  }

  if (inputs.wdRate && (inputs.wdRate < 0 || inputs.wdRate > 10)) {
    errors.push('Withdrawal rate must be between 0% and 10%');
  }

  return {
    isValid: missingFields.length === 0 && errors.length === 0,
    missingFields,
    errors,
  };
}
