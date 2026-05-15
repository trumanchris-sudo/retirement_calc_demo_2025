/**
 * Client-Side Onboarding Processing
 *
 * Alternative to API-based processing - runs assumptions logic locally.
 * Preserves API infrastructure for future use while providing instant,
 * free processing for standard wizard flows.
 */

import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import { mapAIDataToCalculator } from './aiOnboardingMapper';

export interface ProcessOnboardingResult {
  extractedData: ExtractedData;
  assumptions: AssumptionWithReasoning[];
  missingFields: Array<{ field: string; displayName: string; description: string }>;
  summary: string;
}

const HIGH_HOUSING_COST_STATES = new Set(['CA', 'NY', 'NJ', 'MA', 'WA', 'DC', 'HI']);
const HIGH_PROPERTY_TAX_STATES = new Set(['TX', 'NJ', 'IL', 'NE', 'NH', 'CT', 'VT', 'WI']);
const HIGH_HOME_INSURANCE_STATES = new Set(['FL', 'LA', 'OK', 'TX']);

const formatIncome = (amount: number): string => {
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
  return `$${amount.toLocaleString()}`;
};

const roundToNearest = (value: number, nearest: number): number => (
  Math.round(value / nearest) * nearest
);

function estimateHousingPayment(totalIncome: number, isMarried: boolean, stateCode?: string): number {
  const highCost = stateCode ? HIGH_HOUSING_COST_STATES.has(stateCode) : false;

  if (totalIncome < 100000) return isMarried ? 1800 : 1200;
  if (totalIncome < 200000) return isMarried ? 2800 : 2000;
  if (totalIncome < 400000) return isMarried ? 4000 : 3000;
  if (totalIncome < 700000) return isMarried ? (highCost ? 6500 : 5500) : (highCost ? 5000 : 4000);
  return isMarried ? (highCost ? 7500 : 6000) : (highCost ? 5500 : 4500);
}

function estimatePropertyTaxAndInsurance(totalIncome: number, isMarried: boolean, stateCode?: string): number {
  const highPropertyTax = stateCode ? HIGH_PROPERTY_TAX_STATES.has(stateCode) : false;
  const highInsurance = stateCode ? HIGH_HOME_INSURANCE_STATES.has(stateCode) : false;

  if (totalIncome < 100000) return isMarried ? 400 : 300;
  if (totalIncome < 200000) return isMarried ? (highPropertyTax ? 900 : 700) : (highPropertyTax ? 700 : 500);
  if (totalIncome < 400000) return isMarried ? (highPropertyTax ? 1500 : 1000) : (highPropertyTax ? 1100 : 750);
  if (totalIncome < 700000) return isMarried ? (highPropertyTax ? 2400 : 1500) : (highPropertyTax ? 1700 : 1100);

  if (stateCode === 'TX') return isMarried ? 3375 : 2400;
  if (stateCode === 'FL') return isMarried ? 3000 : 2200;
  if (highPropertyTax || highInsurance) return isMarried ? 2400 : 1700;
  return isMarried ? 1800 : 1300;
}

function estimateUtilities(totalIncome: number): number {
  if (totalIncome < 100000) return 250;
  if (totalIncome < 400000) return 350;
  return 400;
}

function estimateHealthcarePremium(
  totalIncome: number,
  employmentType?: ExtractedData['employmentType1']
): number {
  const selfEmployed = employmentType === 'self-employed' || employmentType === 'both';
  if (totalIncome >= 700000) return selfEmployed ? 1000 : 850;
  if (totalIncome >= 400000) return selfEmployed ? 900 : 750;
  if (totalIncome >= 200000) return selfEmployed ? 750 : 650;
  return selfEmployed ? 650 : 550;
}

function estimateHouseholdExpenses(totalIncome: number, isMarried: boolean, childCount: number): number {
  const childAdd = Math.min(childCount, 2) * 350;
  if (totalIncome < 100000) return (isMarried ? 900 : 600) + childAdd;
  if (totalIncome < 200000) return (isMarried ? 1400 : 900) + childAdd;
  if (totalIncome < 400000) return (isMarried ? 2200 : 1400) + childAdd;
  if (totalIncome < 700000) return (isMarried ? 3000 : 2000) + childAdd;
  return (isMarried ? 3200 : 2200) + childAdd;
}

function estimateDiscretionary(totalIncome: number, isMarried: boolean): number {
  if (totalIncome < 100000) return isMarried ? 800 : 600;
  if (totalIncome < 200000) return isMarried ? 1500 : 1000;
  if (totalIncome < 400000) return isMarried ? 3000 : 2000;
  if (totalIncome < 700000) return isMarried ? 4500 : 3000;
  return isMarried ? 5500 : 4000;
}

function estimateOtherExpenses(totalIncome: number, isMarried: boolean): number {
  if (totalIncome < 100000) return isMarried ? 800 : 600;
  if (totalIncome < 200000) return isMarried ? 1200 : 900;
  if (totalIncome < 400000) return isMarried ? 1800 : 1300;
  if (totalIncome < 700000) return isMarried ? 2200 : 1600;
  return isMarried ? 2500 : 1800;
}

/**
 * Process onboarding data client-side (no API call)
 *
 * Applies same assumption logic as API but executes locally:
 * - Instant response (< 1ms vs 2-5 seconds)
 * - Zero cost (vs ~$0.10-0.30 per user)
 * - Deterministic IF-THEN rules don't need LLM
 */
export function processOnboardingClientSide(
  extractedData: ExtractedData
): ProcessOnboardingResult {
  const assumptions: AssumptionWithReasoning[] = [];

  // Helper to add assumption
  const addAssumption = (
    field: string,
    displayName: string,
    value: string | number | boolean | null,
    reasoning: string,
    confidence: 'high' | 'medium' | 'low' = 'medium'
  ): void => {
    assumptions.push({
      field,
      displayName,
      value,
      reasoning,
      confidence,
      userProvided: false,
    });
  };

  // ===== MONTHLY EXPENSE ASSUMPTIONS =====
  // These come from the API prompt but aren't in aiOnboardingMapper yet

  const totalIncome = (extractedData.primaryIncome || 100000) + (extractedData.spouseIncome || 0);
  const isMarried = extractedData.maritalStatus === 'married';
  const childCount = extractedData.numChildren ?? 0;
  const stateCode = extractedData.state?.toUpperCase();

  // Housing: monthlyMortgageRent
  if (extractedData.monthlyMortgageRent === undefined) {
    const mortgage = estimateHousingPayment(totalIncome, isMarried, stateCode);

    extractedData.monthlyMortgageRent = mortgage;
    addAssumption(
      'monthlyMortgageRent',
      'Monthly Housing Cost',
      mortgage,
      `Capped high-income housing estimate for ${stateCode ?? 'your state'}; about ${Math.round((mortgage * 12 / totalIncome) * 100)}% of ${formatIncome(totalIncome)} gross income`,
      'medium'
    );
  }

  // Utilities: monthlyUtilities
  if (extractedData.monthlyUtilities === undefined) {
    const utilities = estimateUtilities(totalIncome);

    extractedData.monthlyUtilities = utilities;
    addAssumption(
      'monthlyUtilities',
      'Monthly Utilities',
      utilities,
      'Scaled with housing costs',
      'medium'
    );
  }

  // Insurance & Property Tax: monthlyInsurancePropertyTax
  if (extractedData.monthlyInsurancePropertyTax === undefined) {
    const insurance = estimatePropertyTaxAndInsurance(totalIncome, isMarried, stateCode);

    extractedData.monthlyInsurancePropertyTax = insurance;
    addAssumption(
      'monthlyInsurancePropertyTax',
      'Monthly Insurance & Property Tax',
      insurance,
      stateCode === 'TX'
        ? 'Texas-specific estimate: no state income tax, but higher property tax and home insurance burden'
        : 'State-aware estimate for property tax and home insurance',
      'medium'
    );
  }

  // Healthcare: monthlyHealthcareP1 & P2
  if (extractedData.monthlyHealthcareP1 === undefined) {
    const healthcareP1 = estimateHealthcarePremium(totalIncome, extractedData.employmentType1);
    extractedData.monthlyHealthcareP1 = healthcareP1;
    addAssumption(
      'monthlyHealthcareP1',
      'Your Monthly Healthcare Premium',
      healthcareP1,
      extractedData.employmentType1 === 'self-employed'
        ? 'Self-employed/K-1 households often carry higher premium exposure'
        : 'Employer-plan premium estimate scaled by income',
      'medium'
    );
  }

  if (isMarried && extractedData.monthlyHealthcareP2 === undefined) {
    const healthcareP2 = estimateHealthcarePremium(totalIncome, extractedData.employmentType2);
    extractedData.monthlyHealthcareP2 = healthcareP2;
    addAssumption(
      'monthlyHealthcareP2',
      'Spouse Monthly Healthcare Premium',
      healthcareP2,
      'Spouse healthcare premium estimate scaled by employment type and household income',
      'medium'
    );
  }

  // Other Monthly Expenses: monthlyOtherExpenses
  if (extractedData.monthlyOtherExpenses === undefined) {
    const other = estimateOtherExpenses(totalIncome, isMarried);

    extractedData.monthlyOtherExpenses = other;
    addAssumption(
      'monthlyOtherExpenses',
      'Other Monthly Expenses',
      other,
      'Miscellaneous recurring costs kept separate from household and discretionary spending to avoid double-counting',
      'medium'
    );
  }

  // ===== ADDITIONAL EXPENSE CATEGORIES (for 2026 income calculators) =====

  // Household Expenses: monthlyHouseholdExpenses (groceries, supplies, maintenance)
  if (extractedData.monthlyHouseholdExpenses === undefined) {
    const household = roundToNearest(estimateHouseholdExpenses(totalIncome, isMarried, childCount), 50);

    extractedData.monthlyHouseholdExpenses = household;
    addAssumption(
      'monthlyHouseholdExpenses',
      'Monthly Household Expenses',
      household,
      'Groceries, household supplies, and routine maintenance; scaled for household size',
      'medium'
    );
  }

  // Discretionary Spending: monthlyDiscretionary (entertainment, dining, shopping)
  if (extractedData.monthlyDiscretionary === undefined) {
    const discretionary = estimateDiscretionary(totalIncome, isMarried);

    extractedData.monthlyDiscretionary = discretionary;
    addAssumption(
      'monthlyDiscretionary',
      'Monthly Discretionary Spending',
      discretionary,
      'Dining, travel, shopping, and entertainment with high-income lifestyle creep capped',
      'medium'
    );
  }

  // Childcare: monthlyChildcare (only if they have children indicated)
  if (extractedData.monthlyChildcare === undefined) {
    const childAges = extractedData.childrenAges ?? [];
    const hasYoungChild = childCount > 0 && (childAges.length === 0 || childAges.some(age => age < 6));

    if (hasYoungChild) {
      const childcare = Math.min(childCount, 2) * 1500;
      extractedData.monthlyChildcare = childcare;
      addAssumption(
        'monthlyChildcare',
        'Monthly Childcare Costs',
        childcare,
        childAges.length === 0
          ? 'Placeholder for children when ages are unknown; set to $0 if there are no paid childcare costs'
          : 'Estimated daycare/childcare cost for young children',
        'low'
      );
    } else {
      extractedData.monthlyChildcare = 0;
    }
  }

  // Life Insurance: annualLifeInsuranceP1 and P2
  // Rule of thumb: 10x income for primary earners, less for secondary
  if (extractedData.annualLifeInsuranceP1 === undefined) {
    const income1 = extractedData.primaryIncome || 100000;
    // Calculate coverage needed (10x income) and estimate premium
    // Typical term life: ~$0.50-1.00 per $1000 coverage per year for healthy 35-45 year olds
    const coverage1 = income1 * 10;
    const premiumRate1 = 0.0008; // ~$0.80 per $1000 coverage annually
    const annualPremium1 = Math.round(coverage1 * premiumRate1);

    extractedData.annualLifeInsuranceP1 = annualPremium1;
    addAssumption(
      'annualLifeInsuranceP1',
      'Your Life Insurance (Annual)',
      annualPremium1,
      `Term life premium for ~$${Math.round(coverage1 / 1000)}k coverage (10x income) - adjust based on actual policy`,
      'low'
    );
  }

  if (isMarried && extractedData.annualLifeInsuranceP2 === undefined) {
    const income2 = extractedData.spouseIncome || 0;
    if (income2 > 0) {
      // Spouse has income - estimate coverage similarly
      const coverage2 = income2 * 10;
      const premiumRate2 = 0.0008;
      const annualPremium2 = Math.round(coverage2 * premiumRate2);

      extractedData.annualLifeInsuranceP2 = annualPremium2;
      addAssumption(
        'annualLifeInsuranceP2',
        'Spouse Life Insurance (Annual)',
        annualPremium2,
        `Term life premium for ~$${Math.round(coverage2 / 1000)}k coverage (10x income) - adjust based on actual policy`,
        'low'
      );
    } else {
      // Spouse doesn't have income - smaller coverage for household support
      const coverage2 = 250000; // $250k baseline for non-earning spouse
      const premiumRate2 = 0.0006;
      const annualPremium2 = Math.round(coverage2 * premiumRate2);

      extractedData.annualLifeInsuranceP2 = annualPremium2;
      addAssumption(
        'annualLifeInsuranceP2',
        'Spouse Life Insurance (Annual)',
        annualPremium2,
        `Term life premium for ~$250k coverage (household support) - adjust based on actual policy`,
        'low'
      );
    }
  }

  // ===== USE EXISTING MAPPER FOR REMAINING LOGIC =====
  // The mapper handles: contributions, balances, tax rates, return assumptions, etc.
  const mappedResult = mapAIDataToCalculator(extractedData, assumptions);

  // Filter out calculator defaults from assumptions (they're not wizard assumptions)
  // These are standard calculator settings, not onboarding inferences
  const calculatorDefaults = ['retRate', 'inflationRate', 'incRate', 'dividendYield', 'includeSS', 'stateRate'];
  const wizardAssumptions = mappedResult.generatedAssumptions.filter(
    a => !calculatorDefaults.includes(a.field)
  );
  const desiredRetirementSpending = wizardAssumptions.find(
    a => a.field === 'desiredRetirementSpending' && typeof a.value === 'number'
  )?.value as number | undefined;

  // Build final extractedData with all fields populated
  const completeExtractedData: ExtractedData = {
    ...extractedData,
    // Ensure all fields are present (mapper might not set them all)
    age: extractedData.age || mappedResult.age1,
    maritalStatus: extractedData.maritalStatus || mappedResult.marital,
    spouseAge: extractedData.spouseAge || mappedResult.age2,
    retirementAge: extractedData.retirementAge || mappedResult.retirementAge,
    primaryIncome: extractedData.primaryIncome || mappedResult.primaryIncome,
    spouseIncome: extractedData.spouseIncome || mappedResult.spouseIncome,
    currentTaxable: extractedData.currentTaxable || mappedResult.taxableBalance,
    currentTraditional: extractedData.currentTraditional || mappedResult.pretaxBalance,
    currentRoth: extractedData.currentRoth || mappedResult.rothBalance,
    emergencyFund: extractedData.emergencyFund || mappedResult.emergencyFund,
    desiredRetirementSpending: extractedData.desiredRetirementSpending ?? desiredRetirementSpending,
  };

  // Generate friendly summary
  const summary = generateSummary(completeExtractedData, wizardAssumptions);

  return {
    extractedData: completeExtractedData,
    assumptions: wizardAssumptions, // Only show wizard-specific assumptions, not calculator defaults
    missingFields: [], // No missing fields - we generate all assumptions
    summary,
  };
}

/**
 * Generate friendly summary message
 */
function generateSummary(data: ExtractedData, assumptions: AssumptionWithReasoning[]): string {
  const age = data.age || 35;
  const income = data.primaryIncome || 100000;
  const retAge = data.retirementAge || 65;
  const yearsToRetirement = retAge - age;

  const isMarried = data.maritalStatus === 'married';
  const totalIncome = income + (data.spouseIncome || 0);

  let summary = `Great! I've set up your retirement plan${isMarried ? ' for you and your spouse' : ''}. `;

  summary += `With ${yearsToRetirement} years until retirement at age ${retAge}, `;

  if (totalIncome >= 200000) {
    summary += `your ${totalIncome >= 1000000 ? '$' + Math.round(totalIncome/1000) + 'k' : '$' + totalIncome.toLocaleString()} combined income provides strong savings potential. `;
  } else {
    summary += `your $${totalIncome.toLocaleString()} income allows for meaningful retirement contributions. `;
  }

  const assumedCount = assumptions.filter(a => !a.userProvided).length;

  if (assumedCount > 0) {
    summary += `I've highlighted ${assumedCount} planning estimate${assumedCount === 1 ? '' : 's'} for review. `;
    summary += `You can edit these before building the full plan.`;
  }

  return summary;
}
