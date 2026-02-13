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
  retRate: 9.8,           // Historical S&P 500 nominal return
  inflationRate: 2.6,     // Long-term inflation average
  wdRate: 3.5,            // Safe withdrawal rate
  dividendYield: 2.0,     // Typical dividend yield
  incRate: 4.5,           // Wage inflation + raises
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
    if (extractedData.annualIncome1 !== undefined) {
      const totalContributions =
        (extractedData.contributionTraditional || 0) +
        (extractedData.contributionRoth || 0) +
        (extractedData.contributionTaxable || 0);
      const totalIncome = extractedData.annualIncome1 + (extractedData.annualIncome2 || 0);

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

  const validationWarnings = validateData();
  console.log('[Mapper] Validation complete. Warnings:', validationWarnings.length);

  // === Personal Information ===
  const age1 = extractedData.age ?? 35;
  const marital = extractedData.maritalStatus ?? 'single';
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
  const taxableBalance = extractedData.currentTaxable ?? 50000;
  const pretaxBalance = extractedData.currentTraditional ?? 150000;
  const rothBalance = extractedData.currentRoth ?? 25000;

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
      'taxableBalance',
      'Taxable Brokerage',
      taxableBalance,
      'Estimated based on typical savings patterns',
      'low'
    );
  }

  if (!extractedData.currentTraditional) {
    addAssumption(
      'pretaxBalance',
      'Traditional 401k/IRA',
      pretaxBalance,
      'Estimated based on age and income level',
      'low'
    );
  }

  if (!extractedData.currentRoth) {
    addAssumption(
      'rothBalance',
      'Roth Accounts',
      rothBalance,
      'Estimated based on typical retirement account mix',
      'low'
    );
  }

  // === Annual Savings Contributions ===
  // NEW: Use direct contribution amounts if provided, otherwise calculate
  let cPre1: number, cPost1: number, cTax1: number, cMatch1: number;

  if (extractedData.contributionTraditional !== undefined) {
    // Use user-provided traditional contribution
    // For married couples, split between person 1 and person 2 (up to IRS limits)
    if (marital === 'married') {
      const perPerson = extractedData.contributionTraditional / 2;
      cPre1 = Math.min(perPerson, IRS_LIMITS_2026['401k']);
    } else {
      cPre1 = Math.min(extractedData.contributionTraditional, IRS_LIMITS_2026['401k']);
    }
  } else if (extractedData.savingsRateTraditional1 !== undefined) {
    // Legacy field support
    cPre1 = extractedData.savingsRateTraditional1;
  } else {
    // Calculate default based on income
    const defaultSavingsRate = calculateRecommendedSavingsRate(annualIncome1);
    cPre1 = Math.min(IRS_LIMITS_2026['401k'], annualIncome1 * defaultSavingsRate * 0.6);
    addAssumption(
      'cPre1',
      'Traditional 401k Contributions',
      cPre1,
      `Recommended ${Math.round((cPre1 / annualIncome1) * 100)}% of income to traditional accounts`,
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
    const defaultSavingsRate = calculateRecommendedSavingsRate(annualIncome1);
    cPost1 = Math.min(IRS_LIMITS_2026.ira, annualIncome1 * defaultSavingsRate * 0.3);
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
    // Calculate default based on income
    const defaultSavingsRate = calculateRecommendedSavingsRate(annualIncome1);
    cTax1 = annualIncome1 * defaultSavingsRate * 0.1;
    addAssumption(
      'cTax1',
      'Taxable Account Savings',
      cTax1,
      'Additional savings in taxable brokerage for flexibility',
      'medium'
    );
  }

  if (extractedData.contributionMatch !== undefined) {
    // Use user-provided employer match
    cMatch1 = extractedData.contributionMatch;
  } else {
    // Calculate default: assume 50% match up to 6% of salary
    cMatch1 = Math.min(annualIncome1 * 0.06 * 0.5, IRS_LIMITS_2026['401k'] - cPre1);
    addAssumption(
      'cMatch1',
      'Employer Match',
      cMatch1,
      'Assumed 50% match up to 6% of salary (industry standard)',
      'medium'
    );
  }

  // Person 2 contributions (if married)
  let cPre2 = 0,
    cPost2 = 0,
    cTax2 = 0,
    cMatch2 = 0;

  if (marital === 'married' && annualIncome2 > 0) {
    // NEW: If user provided combined contributions, split them
    if (extractedData.contributionTraditional !== undefined) {
      // Split traditional contribution between person 1 and person 2
      const perPerson = extractedData.contributionTraditional / 2;
      cPre2 = Math.min(perPerson, IRS_LIMITS_2026['401k']);
    } else if (extractedData.savingsRateTraditional2 !== undefined) {
      // Legacy field support
      cPre2 = extractedData.savingsRateTraditional2;
    } else {
      // Calculate default based on income
      const defaultSavingsRate2 = calculateRecommendedSavingsRate(annualIncome2);
      const person1IsMaxing401k = cPre1 >= IRS_LIMITS_2026['401k'] * 0.9;

      if (person1IsMaxing401k) {
        // If person 1 maxes 401k, assume person 2 does too
        cPre2 = Math.min(IRS_LIMITS_2026['401k'], annualIncome2);
        addAssumption(
          'cPre2',
          'Spouse Traditional 401k',
          cPre2,
          'Matching Person 1 max contribution strategy for joint household',
          'medium'
        );
      } else {
        cPre2 = Math.min(IRS_LIMITS_2026['401k'], annualIncome2 * defaultSavingsRate2 * 0.6);
        addAssumption(
          'cPre2',
          'Spouse Traditional 401k',
          cPre2,
          `Recommended ${Math.round((cPre2 / annualIncome2) * 100)}% of spouse income`,
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
      const defaultSavingsRate2 = calculateRecommendedSavingsRate(annualIncome2);
      const person1IsMaxingRoth = cPost1 >= IRS_LIMITS_2026.ira * 0.9;

      if (person1IsMaxingRoth) {
        // If person 1 maxes Roth, assume person 2 does too
        cPost2 = Math.min(IRS_LIMITS_2026.ira, annualIncome2);
        addAssumption(
          'cPost2',
          'Spouse Roth Contributions',
          cPost2,
          'Matching Person 1 max contribution strategy for joint household',
          'medium'
        );
      } else {
        cPost2 = Math.min(IRS_LIMITS_2026.ira, annualIncome2 * defaultSavingsRate2 * 0.3);
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
      const totalIncome = annualIncome1 + annualIncome2;
      const person2Ratio = totalIncome > 0 ? annualIncome2 / totalIncome : 0.5;
      cTax2 = extractedData.contributionTaxable * person2Ratio;
      // Also adjust cTax1 to be the remainder
      cTax1 = extractedData.contributionTaxable * (1 - person2Ratio);
    } else if (extractedData.savingsRateTaxable2 !== undefined) {
      // Legacy field support
      cTax2 = extractedData.savingsRateTaxable2;
    } else {
      // Calculate default
      const defaultSavingsRate2 = calculateRecommendedSavingsRate(annualIncome2);
      cTax2 = annualIncome2 * defaultSavingsRate2 * 0.1;
    }

    // Employer match for person 2: split combined match proportionally
    if (extractedData.contributionMatch !== undefined) {
      // Split combined match proportionally by income
      const totalIncome = annualIncome1 + annualIncome2;
      const person2Ratio = totalIncome > 0 ? annualIncome2 / totalIncome : 0.5;
      cMatch2 = Math.min(extractedData.contributionMatch * person2Ratio, IRS_LIMITS_2026['401k'] - cPre2);
      // Also adjust cMatch1 to be the remainder
      cMatch1 = Math.min(extractedData.contributionMatch * (1 - person2Ratio), IRS_LIMITS_2026['401k'] - cPre1);
    } else {
      // Calculate default
      cMatch2 = Math.min(annualIncome2 * 0.06 * 0.5, IRS_LIMITS_2026['401k'] - cPre2);
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

    if (eoyBonusAmount) {
      console.log('[aiOnboardingMapper] Parsed bonus:', {
        raw: extractedData.bonusInfo,
        amount: eoyBonusAmount,
        month: eoyBonusMonth || 'December (default)',
      });
    }
  }

  // === Retirement Goals ===
  // IMPORTANT: Use user-specified retirement age if provided, don't override it
  const retirementAge = extractedData.retirementAge ?? calculateRecommendedRetirementAge(age1, annualIncome1);

  console.log('[aiOnboardingMapper] Retirement age:', {
    userProvided: extractedData.retirementAge,
    calculated: calculateRecommendedRetirementAge(age1, annualIncome1),
    final: retirementAge,
  });

  if (!extractedData.retirementAge) {
    addAssumption(
      'retirementAge',
      'Target Retirement Age',
      retirementAge,
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
  const estimatedPortfolio = taxableBalance + pretaxBalance + rothBalance + emergencyFund;
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
    retirementAge,
    // Only include children fields when explicitly provided by the wizard,
    // so fieldMetadata won't track them and legacy tab keeps its defaults.
    ...(numChildren !== undefined && { numChildren }),
    ...(childrenAges !== undefined && { childrenAges }),
    ...(additionalChildrenExpected !== undefined && { additionalChildrenExpected }),

    // Employment & Income
    employmentType1,
    employmentType2,
    primaryIncome: annualIncome1,
    spouseIncome: annualIncome2,

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

    // Additional expense categories (for 2026 income calculators)
    ...(extractedData.monthlyHouseholdExpenses !== undefined && {
      monthlyHouseholdExpenses: extractedData.monthlyHouseholdExpenses,
    }),
    ...(extractedData.monthlyDiscretionary !== undefined && {
      monthlyDiscretionary: extractedData.monthlyDiscretionary,
    }),
    ...(extractedData.monthlyChildcare !== undefined && {
      monthlyChildcare: extractedData.monthlyChildcare,
    }),
    ...(extractedData.annualLifeInsuranceP1 !== undefined && {
      annualLifeInsuranceP1: extractedData.annualLifeInsuranceP1,
    }),
    ...(extractedData.annualLifeInsuranceP2 !== undefined && {
      annualLifeInsuranceP2: extractedData.annualLifeInsuranceP2,
    }),

    // Rates & Assumptions
    retRate: DEFAULT_ASSUMPTIONS.retRate,
    inflationRate: DEFAULT_ASSUMPTIONS.inflationRate,
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
