/**
 * AI Onboarding to Calculator State Mapper
 *
 * Converts extracted AI data and assumptions into complete calculator state
 */

import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import type { CalculatorInputs } from '@/types/calculator';
import { IRS_LIMITS_2026 } from '@/types/onboarding';

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
 * Default return assumptions
 */
const DEFAULT_ASSUMPTIONS = {
  retRate: 9.8,       // Historical S&P 500 nominal return
  infRate: 2.6,       // Long-term inflation average
  wdRate: 3.5,        // Safe withdrawal rate
  dividendYield: 2.0, // Typical dividend yield
  incRate: 4.5,       // Wage inflation + raises
};

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
    value: any,
    reasoning: string,
    confidence: 'high' | 'medium' | 'low' = 'medium'
  ) => {
    generatedAssumptions.push({
      field,
      displayName,
      value,
      reasoning,
      confidence,
      userProvided: false,
    });
  };

  // === Personal Information ===
  const age1 = extractedData.age ?? 35;
  const marital = extractedData.maritalStatus ?? 'single';
  const age2 = extractedData.spouseAge ?? age1;

  if (!extractedData.age) {
    addAssumption('age1', 'Your Age', age1, 'Using default age for planning purposes', 'low');
  }

  // === Family & Children ===
  const numChildren = extractedData.numChildren ?? 0;
  const childrenAges = extractedData.childrenAges ?? [];
  const additionalChildrenExpected = extractedData.additionalChildrenExpected ?? 0;

  // === Employment & Income ===
  const employmentType1 = extractedData.employmentType1 ?? 'w2';
  const employmentType2 = extractedData.employmentType2;
  const annualIncome1 = extractedData.annualIncome1 ?? 100000;
  const annualIncome2 = extractedData.annualIncome2 ?? 0;

  if (!extractedData.annualIncome1) {
    addAssumption(
      'annualIncome1',
      'Your Annual Income',
      annualIncome1,
      'Using median household income as starting point',
      'low'
    );
  }

  // === Current Balances ===
  const emergencyFund = extractedData.emergencyFund ?? Math.round(annualIncome1 * 0.25); // 3 months
  const sTax = extractedData.currentTaxable ?? 50000;
  const sPre = extractedData.currentTraditional ?? 150000;
  const sPost = extractedData.currentRoth ?? 25000;

  if (!extractedData.emergencyFund) {
    addAssumption(
      'emergencyFund',
      'Emergency Fund',
      emergencyFund,
      'Assumed 3 months of expenses for financial security',
      'medium'
    );
  }

  if (!extractedData.currentTaxable) {
    addAssumption(
      'sTax',
      'Taxable Brokerage',
      sTax,
      'Estimated based on typical savings patterns',
      'low'
    );
  }

  if (!extractedData.currentTraditional) {
    addAssumption(
      'sPre',
      'Traditional 401k/IRA',
      sPre,
      'Estimated based on age and income level',
      'low'
    );
  }

  if (!extractedData.currentRoth) {
    addAssumption(
      'sPost',
      'Roth Accounts',
      sPost,
      'Estimated based on typical retirement account mix',
      'low'
    );
  }

  // === Annual Savings Contributions ===
  // Calculate default savings based on income if not provided
  const defaultSavingsRate = calculateRecommendedSavingsRate(annualIncome1);

  const cPre1 =
    extractedData.savingsRateTraditional1 ??
    Math.min(IRS_LIMITS_2026['401k'], annualIncome1 * defaultSavingsRate * 0.6);

  const cPost1 =
    extractedData.savingsRateRoth1 ??
    Math.min(IRS_LIMITS_2026.ira, annualIncome1 * defaultSavingsRate * 0.3);

  const cTax1 = extractedData.savingsRateTaxable1 ?? annualIncome1 * defaultSavingsRate * 0.1;

  // Employer match: assume 50% match up to 6% of salary
  const cMatch1 = Math.min(annualIncome1 * 0.06 * 0.5, IRS_LIMITS_2026['401k'] - cPre1);

  if (!extractedData.savingsRateTraditional1) {
    addAssumption(
      'cPre1',
      'Traditional 401k Contributions',
      cPre1,
      `Recommended ${Math.round((cPre1 / annualIncome1) * 100)}% of income to traditional accounts`,
      'medium'
    );
  }

  if (!extractedData.savingsRateRoth1) {
    addAssumption(
      'cPost1',
      'Roth Contributions',
      cPost1,
      'Diversifying tax treatment with Roth contributions',
      'medium'
    );
  }

  if (!extractedData.savingsRateTaxable1) {
    addAssumption(
      'cTax1',
      'Taxable Account Savings',
      cTax1,
      'Additional savings in taxable brokerage for flexibility',
      'medium'
    );
  }

  addAssumption(
    'cMatch1',
    'Employer Match',
    cMatch1,
    'Assumed 50% match up to 6% of salary (industry standard)',
    'medium'
  );

  // Person 2 contributions (if married)
  let cPre2 = 0,
    cPost2 = 0,
    cTax2 = 0,
    cMatch2 = 0;

  if (marital === 'married' && annualIncome2 > 0) {
    const defaultSavingsRate2 = calculateRecommendedSavingsRate(annualIncome2);

    cPre2 =
      extractedData.savingsRateTraditional2 ??
      Math.min(IRS_LIMITS_2026['401k'], annualIncome2 * defaultSavingsRate2 * 0.6);

    cPost2 =
      extractedData.savingsRateRoth2 ??
      Math.min(IRS_LIMITS_2026.ira, annualIncome2 * defaultSavingsRate2 * 0.3);

    cTax2 = extractedData.savingsRateTaxable2 ?? annualIncome2 * defaultSavingsRate2 * 0.1;

    cMatch2 = Math.min(annualIncome2 * 0.06 * 0.5, IRS_LIMITS_2026['401k'] - cPre2);

    if (!extractedData.savingsRateTraditional2) {
      addAssumption(
        'cPre2',
        'Spouse Traditional 401k',
        cPre2,
        `Recommended ${Math.round((cPre2 / annualIncome2) * 100)}% of spouse income`,
        'medium'
      );
    }
  }

  // === Retirement Goals ===
  const retAge = extractedData.retirementAge ?? calculateRecommendedRetirementAge(age1, annualIncome1);

  if (!extractedData.retirementAge) {
    addAssumption(
      'retAge',
      'Target Retirement Age',
      retAge,
      'Based on current age and financial profile',
      'medium'
    );
  }

  // Desired retirement spending
  const totalIncome = annualIncome1 + annualIncome2;
  const desiredSpending =
    extractedData.desiredRetirementSpending ??
    Math.round(totalIncome * 0.8); // 80% replacement ratio

  // Convert to withdrawal rate
  const estimatedPortfolio = sTax + sPre + sPost + emergencyFund;
  const wdRate = estimatedPortfolio > 0 ? (desiredSpending / estimatedPortfolio) * 100 : 3.5;

  if (!extractedData.desiredRetirementSpending) {
    addAssumption(
      'desiredRetirementSpending',
      'Retirement Spending',
      desiredSpending,
      '80% of pre-retirement income (typical replacement ratio)',
      'medium'
    );
  }

  // === State Tax Rate ===
  const stateCode = extractedData.state?.toUpperCase();
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
    'infRate',
    'Inflation Rate',
    DEFAULT_ASSUMPTIONS.infRate,
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
  const ssIncome = annualIncome1; // Use full income for SS calculation
  const ssClaimAge = 67; // Full retirement age
  const ssIncome2 = marital === 'married' ? annualIncome2 : 0;
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
    retAge,
    numChildren,
    childrenAges,
    additionalChildrenExpected,

    // Employment & Income
    employmentType1,
    employmentType2,
    annualIncome1,
    annualIncome2,

    // Current Balances
    emergencyFund,
    sTax,
    sPre,
    sPost,

    // Contributions
    cTax1: Math.round(cTax1),
    cPre1: Math.round(cPre1),
    cPost1: Math.round(cPost1),
    cMatch1: Math.round(cMatch1),
    cTax2: Math.round(cTax2),
    cPre2: Math.round(cPre2),
    cPost2: Math.round(cPost2),
    cMatch2: Math.round(cMatch2),

    // Housing & Expenses (from API assumptions)
    ...(extractedData.monthlyMortgageRent !== undefined && {
      monthlyMortgageRent: extractedData.monthlyMortgageRent,
    }),
    ...(extractedData.monthlyUtilities !== undefined && {
      monthlyUtilities: extractedData.monthlyUtilities,
    }),
    ...(extractedData.monthlyInsurancePropertyTax !== undefined && {
      monthlyInsurancePropertyTax: extractedData.monthlyInsurancePropertyTax,
    }),
    ...(extractedData.monthlyHealthcareP1 !== undefined && {
      monthlyHealthcareP1: extractedData.monthlyHealthcareP1,
    }),
    ...(extractedData.monthlyHealthcareP2 !== undefined && {
      monthlyHealthcareP2: extractedData.monthlyHealthcareP2,
    }),
    ...(extractedData.monthlyOtherExpenses !== undefined && {
      monthlyOtherExpenses: extractedData.monthlyOtherExpenses,
    }),

    // Rates & Assumptions
    retRate: DEFAULT_ASSUMPTIONS.retRate,
    infRate: DEFAULT_ASSUMPTIONS.infRate,
    stateRate,
    incContrib: true, // Enable annual increases
    incRate: DEFAULT_ASSUMPTIONS.incRate,
    wdRate: Math.min(wdRate, 4.5), // Cap at 4.5%
    dividendYield: DEFAULT_ASSUMPTIONS.dividendYield,

    // Social Security
    includeSS,
    ssIncome,
    ssClaimAge,
    ssIncome2,
    ssClaimAge2,

    // Simulation defaults
    retMode: 'fixed',
    walkSeries: 'nominal',
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
 * Validate that calculator inputs are complete and valid
 */
export function validateCalculatorInputs(inputs: Partial<CalculatorInputs>): {
  isValid: boolean;
  missingFields: string[];
  errors: string[];
} {
  const requiredFields: Array<keyof CalculatorInputs> = [
    'marital',
    'age1',
    'age2',
    'retAge',
    'sTax',
    'sPre',
    'sPost',
    'cTax1',
    'cPre1',
    'cPost1',
    'cMatch1',
    'retRate',
    'infRate',
    'wdRate',
  ];

  const missingFields = requiredFields.filter((field) => inputs[field] === undefined);
  const errors: string[] = [];

  // Validation rules
  if (inputs.age1 && (inputs.age1 < 18 || inputs.age1 > 100)) {
    errors.push('Age must be between 18 and 100');
  }

  if (inputs.retAge && inputs.age1 && inputs.retAge <= inputs.age1) {
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
