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
  console.log('[Client-Side] Processing onboarding data locally...');

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

  // Housing: monthlyMortgageRent
  if (extractedData.monthlyMortgageRent === undefined) {
    let mortgage: number;
    if (totalIncome < 100000) {
      mortgage = isMarried ? 1800 : 1200;
    } else if (totalIncome < 200000) {
      mortgage = isMarried ? 3000 : 2000;
    } else if (totalIncome < 400000) {
      mortgage = isMarried ? 4500 : 3000;
    } else if (totalIncome < 700000) {
      mortgage = isMarried ? 7000 : 5000;
    } else {
      mortgage = isMarried ? 9000 : 6500;
    }

    extractedData.monthlyMortgageRent = mortgage;
    addAssumption(
      'monthlyMortgageRent',
      'Monthly Housing Cost',
      mortgage,
      `Scaled to ${totalIncome >= 1000000 ? '$' + Math.round(totalIncome/1000) + 'k' : '$' + totalIncome.toLocaleString()} income (~${Math.round((mortgage * 12 / totalIncome) * 100)}% of gross)`,
      'medium'
    );
  }

  // Utilities: monthlyUtilities
  if (extractedData.monthlyUtilities === undefined) {
    let utilities: number;
    if (totalIncome < 100000) {
      utilities = 250;
    } else if (totalIncome < 400000) {
      utilities = 350;
    } else {
      utilities = 500;
    }

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
    let insurance: number;
    if (totalIncome < 100000) {
      insurance = isMarried ? 400 : 300;
    } else if (totalIncome < 400000) {
      insurance = isMarried ? 700 : 500;
    } else {
      insurance = isMarried ? 1200 : 800;
    }

    extractedData.monthlyInsurancePropertyTax = insurance;
    addAssumption(
      'monthlyInsurancePropertyTax',
      'Monthly Insurance & Property Tax',
      insurance,
      'Scaled with housing value and income',
      'medium'
    );
  }

  // Healthcare: monthlyHealthcareP1 & P2
  if (extractedData.monthlyHealthcareP1 === undefined) {
    extractedData.monthlyHealthcareP1 = 600;
    addAssumption(
      'monthlyHealthcareP1',
      'Your Monthly Healthcare Premium',
      600,
      'Standard employer-sponsored plan premium',
      'medium'
    );
  }

  if (isMarried && extractedData.monthlyHealthcareP2 === undefined) {
    extractedData.monthlyHealthcareP2 = 600;
    addAssumption(
      'monthlyHealthcareP2',
      'Spouse Monthly Healthcare Premium',
      600,
      'Standard employer-sponsored plan premium',
      'medium'
    );
  }

  // Other Monthly Expenses: monthlyOtherExpenses
  if (extractedData.monthlyOtherExpenses === undefined) {
    let other: number;
    if (totalIncome < 100000) {
      other = isMarried ? 2000 : 1500;
    } else if (totalIncome < 200000) {
      other = isMarried ? 2500 : 2000;
    } else if (totalIncome < 400000) {
      other = isMarried ? 4000 : 3000;
    } else if (totalIncome < 700000) {
      other = isMarried ? 6000 : 4500;
    } else {
      other = isMarried ? 7500 : 5500;
    }

    extractedData.monthlyOtherExpenses = other;
    addAssumption(
      'monthlyOtherExpenses',
      'Other Monthly Expenses',
      other,
      `Lifestyle expenses scaled to income bracket (groceries, dining, shopping, travel) - ~${Math.round((other * 12 / totalIncome) * 100)}% of gross`,
      'medium'
    );
  }

  // ===== ADDITIONAL EXPENSE CATEGORIES (for 2026 income calculators) =====

  // Household Expenses: monthlyHouseholdExpenses (groceries, supplies, maintenance)
  if (extractedData.monthlyHouseholdExpenses === undefined) {
    let household: number;
    if (totalIncome < 100000) {
      household = isMarried ? 800 : 500;
    } else if (totalIncome < 200000) {
      household = isMarried ? 1200 : 800;
    } else if (totalIncome < 400000) {
      household = isMarried ? 1800 : 1200;
    } else {
      household = isMarried ? 2500 : 1800;
    }

    extractedData.monthlyHouseholdExpenses = household;
    addAssumption(
      'monthlyHouseholdExpenses',
      'Monthly Household Expenses',
      household,
      `Groceries, supplies, and maintenance - ~${Math.round((household * 12 / totalIncome) * 100)}% of gross income`,
      'medium'
    );
  }

  // Discretionary Spending: monthlyDiscretionary (entertainment, dining, shopping)
  if (extractedData.monthlyDiscretionary === undefined) {
    // Discretionary typically 15-25% of take-home pay, scale with income
    let discretionary: number;
    if (totalIncome < 100000) {
      discretionary = isMarried ? 800 : 600;
    } else if (totalIncome < 200000) {
      discretionary = isMarried ? 1500 : 1000;
    } else if (totalIncome < 400000) {
      discretionary = isMarried ? 2500 : 1800;
    } else if (totalIncome < 700000) {
      discretionary = isMarried ? 4000 : 3000;
    } else {
      discretionary = isMarried ? 6000 : 4500;
    }

    extractedData.monthlyDiscretionary = discretionary;
    addAssumption(
      'monthlyDiscretionary',
      'Monthly Discretionary Spending',
      discretionary,
      `Entertainment, dining out, shopping, hobbies - ~${Math.round((discretionary * 12 / totalIncome) * 100)}% of gross income`,
      'medium'
    );
  }

  // Childcare: monthlyChildcare (only if they have children indicated)
  // Note: We don't have numChildren in ExtractedData yet, so skip unless income suggests family
  if (extractedData.monthlyChildcare === undefined) {
    // Default to 0 unless explicitly set - childcare varies widely
    extractedData.monthlyChildcare = 0;
    // Don't add assumption for 0 value - it's opt-in
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
  const calculatorDefaults = ['retRate', 'inflationRate', 'incRate', 'dividendYield', 'wdRate', 'includeSS', 'stateRate'];
  const wizardAssumptions = mappedResult.generatedAssumptions.filter(
    a => !calculatorDefaults.includes(a.field)
  );

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
  };

  // Generate friendly summary
  const summary = generateSummary(completeExtractedData, wizardAssumptions);

  console.log('[Client-Side] Processing complete:', {
    fieldsExtracted: Object.keys(completeExtractedData).length,
    assumptionsMade: wizardAssumptions.length,
    calculatorDefaultsFiltered: mappedResult.generatedAssumptions.length - wizardAssumptions.length,
    executionTime: '< 1ms',
    cost: '$0.00'
  });

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

  const userProvidedCount = assumptions.filter(a => a.userProvided).length;
  const assumedCount = assumptions.filter(a => !a.userProvided).length;

  if (assumedCount > 0) {
    summary += `I've made ${assumedCount} reasonable assumption${assumedCount === 1 ? '' : 's'} `;
    summary += `(contribution rates, housing costs, other expenses) scaled to your income level. `;
    summary += `You can review and adjust all assumptions in the next screen.`;
  }

  return summary;
}
