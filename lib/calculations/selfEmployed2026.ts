// =============================================================================
// SELF-EMPLOYED / K-1 PARTNER TAX CALCULATIONS (2026)
// =============================================================================

import {
  FilingStatus,
  PayFrequency,
  SE_TAX_2026,
  TAX_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  getPeriodsPerYear,
  getMarginalRate,
  getAdditionalMedicareThreshold,
} from '@/lib/constants/tax2026';

// =============================================================================
// INTERFACES
// =============================================================================

export interface PartnershipIncome {
  // Total annual compensation
  grossCompensation: number;

  // Guaranteed payments (like salary - subject to SE tax)
  guaranteedPayments: number;

  // Distributive share / allocation (profit share - different tax treatment)
  distributiveShare: number;

  // Pay frequency (most partnerships pay semi-monthly or monthly)
  payFrequency: PayFrequency;
}

export interface RetirementContributions {
  // Traditional 401(k) - employee portion
  traditional401k: number;

  // Roth 401(k) - post-tax but different treatment
  roth401k: number;

  // Defined Benefit Plan contribution (for partners with DB plans)
  definedBenefitPlan: number;

  // SEP-IRA (if applicable instead of 401k)
  sepIRA: number;

  // Solo 401(k) employer contribution (if applicable)
  solo401kEmployer: number;

  // Age for catch-up calculations
  age: number;
}

export interface HealthBenefits {
  // Health insurance (often pre-tax for partners)
  healthInsurancePremium: number;
  healthInsuranceCoverage: 'self' | 'self_spouse' | 'family' | 'none';

  // Dental/Vision
  dentalVisionPremium: number;

  // HSA contributions (if on HDHP)
  hsaContribution: number;

  // Dependent Care FSA
  dependentCareFSA: number;

  // Health FSA (if not using HSA)
  healthFSA: number;
}

export interface StatePartnershipTax {
  // Estimated state income tax rate on partnership income
  estimatedStateRate: number; // e.g., 0.045 for 4.5%

  // Some partnerships withhold this, others require quarterly estimates
  withholdingMethod: 'partnership_withholds' | 'quarterly_estimates';
}

export interface SelfEmploymentTaxResult {
  socialSecurityTax: number;
  medicareTax: number;
  additionalMedicareTax: number;
  totalSETax: number;
  deductiblePortion: number; // 50% of SS + Medicare (not additional Medicare)
}

export interface FederalTaxResult {
  grossIncome: number;
  aboveLineDeductions: number;
  agi: number;
  standardDeduction: number;
  taxableIncome: number;
  federalTaxOwed: number;
  effectiveRate: number;
  marginalRate: number;
  spouseAnnualWithholding: number;
  partnerTaxOwed: number;
  requiredWithholdingPerPeriod: number;
}

export interface PerPeriodCashFlow {
  // Period info
  periodNumber: number;
  periodDate: Date;

  // Gross pay for the period
  grossPay: number;
  cumulativeGrossPay: number;

  // Tax withholdings/estimates
  federalTaxWithholding: number;
  stateTaxWithholding: number;
  socialSecurityTax: number;       // Stops after hitting $184,500 wage base
  medicareTax: number;
  additionalMedicareTax: number;

  // Pre-tax deductions
  retirement401k: number;
  definedBenefitPlan: number;
  healthInsurance: number;
  dentalVision: number;
  hsa: number;
  dependentCareFSA: number;

  // Post-tax deductions
  roth401k: number;
  parking: number;

  // Net pay after all deductions
  netPay: number;

  // Fixed expenses
  mortgage: number;
  householdExpenses: number;
  discretionaryBudget: number;
  totalFixedExpenses: number;

  // What's left to invest
  investableProceeds: number;
  cumulativeInvestableProceeds: number;

  // YTD tracking
  ytdSocialSecurityTax: number;
  ytdMedicareTax: number;
  ytdFederalTax: number;
  ytdStateTax: number;
  ytd401k: number;

  // Social Security wage base tracking
  ssWageBaseRemaining: number;
  ssCapReached: boolean;
}

export interface YearSummary {
  totalGrossIncome: number;
  totalSelfEmploymentTax: number;
  totalFederalTax: number;
  totalStateTax: number;
  totalRetirement: number;
  totalHealthBenefits: number;
  totalFixedExpenses: number;
  totalInvestableProceeds: number;
  effectiveTaxRate: number;
  marginalTaxRate: number;
}

export interface CalculationInputs {
  partnerIncome: PartnershipIncome;
  filingStatus: FilingStatus;
  spouseW2Income: number;
  spouseWithholding: number;
  spousePayFrequency: PayFrequency;
  retirementContributions: RetirementContributions;
  healthBenefits: HealthBenefits;
  statePartnershipTax: StatePartnershipTax;
  fixedExpenses: {
    mortgage: number;
    householdExpenses: number;
    discretionaryBudget: number;
  };
}

// =============================================================================
// SELF-EMPLOYMENT TAX CALCULATION
// =============================================================================

export function calculateSelfEmploymentTax(
  guaranteedPayments: number,
  filingStatus: FilingStatus,
  spouseW2Income: number = 0
): SelfEmploymentTaxResult {
  // SE tax base is 92.35% of net SE income
  const seTaxBase = guaranteedPayments * SE_TAX_2026.SE_TAX_BASE_MULTIPLIER;

  // Social Security portion (capped at $184,500 for 2026)
  // Must account for spouse's W-2 wages reducing available cap
  const ssWageBaseRemaining = Math.max(0, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE - spouseW2Income);
  const ssTaxableIncome = Math.min(seTaxBase, ssWageBaseRemaining);
  const socialSecurityTax = ssTaxableIncome * SE_TAX_2026.SOCIAL_SECURITY_RATE;

  // Medicare portion (uncapped)
  const medicareTax = seTaxBase * SE_TAX_2026.MEDICARE_RATE;

  // Additional Medicare Tax (0.9% over threshold)
  const medicareThreshold = getAdditionalMedicareThreshold(filingStatus);
  const combinedEarnedIncome = guaranteedPayments + spouseW2Income;
  const additionalMedicareTax = Math.max(0, combinedEarnedIncome - medicareThreshold) * SE_TAX_2026.ADDITIONAL_MEDICARE_RATE;

  const totalSETax = socialSecurityTax + medicareTax + additionalMedicareTax;

  // 50% deduction only applies to SS + base Medicare (not additional Medicare tax)
  const deductiblePortion = (socialSecurityTax + medicareTax) / 2;

  return {
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalSETax,
    deductiblePortion,
  };
}

// =============================================================================
// FEDERAL INCOME TAX CALCULATION
// =============================================================================

export function calculateFederalTax(
  inputs: CalculationInputs,
  seTaxDeduction: number
): FederalTaxResult {
  const {
    partnerIncome,
    spouseW2Income,
    retirementContributions,
    healthBenefits,
    filingStatus,
    spouseWithholding,
    spousePayFrequency,
  } = inputs;

  // Calculate gross income
  const grossIncome = partnerIncome.grossCompensation + spouseW2Income;

  // Above-the-line deductions
  const aboveLineDeductions =
    seTaxDeduction + // 50% of SE tax
    retirementContributions.traditional401k +
    retirementContributions.definedBenefitPlan +
    retirementContributions.sepIRA +
    retirementContributions.solo401kEmployer +
    healthBenefits.healthInsurancePremium + // Self-employed health insurance deduction
    healthBenefits.hsaContribution +
    healthBenefits.dependentCareFSA;

  const agi = grossIncome - aboveLineDeductions;

  // Standard deduction
  const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus];
  const taxableIncome = Math.max(0, agi - standardDeduction);

  // Calculate tax using brackets
  let federalTaxOwed = 0;
  const brackets = TAX_BRACKETS_2026[filingStatus];

  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min;
      federalTaxOwed += taxableInBracket * bracket.rate;
    }
  }

  // Calculate spouse's annual withholding
  const spousePeriodsPerYear = getPeriodsPerYear(spousePayFrequency);
  const spouseAnnualWithholding = spouseWithholding * spousePeriodsPerYear;

  // Partner needs to withhold/estimate the remaining amount
  const partnerTaxOwed = Math.max(0, federalTaxOwed - spouseAnnualWithholding);

  const partnerPeriodsPerYear = getPeriodsPerYear(partnerIncome.payFrequency);
  const requiredWithholdingPerPeriod = partnerTaxOwed / partnerPeriodsPerYear;

  // Determine marginal rate
  const marginalRate = getMarginalRate(taxableIncome, filingStatus);
  const effectiveRate = grossIncome > 0 ? federalTaxOwed / grossIncome : 0;

  return {
    grossIncome,
    aboveLineDeductions,
    agi,
    standardDeduction,
    taxableIncome,
    federalTaxOwed,
    effectiveRate,
    marginalRate,
    spouseAnnualWithholding,
    partnerTaxOwed,
    requiredWithholdingPerPeriod,
  };
}

// =============================================================================
// PER-PERIOD CASH FLOW CALCULATION
// =============================================================================

export function calculatePerPeriodCashFlow(
  inputs: CalculationInputs,
  seTaxResult: SelfEmploymentTaxResult,
  federalTaxResult: FederalTaxResult
): PerPeriodCashFlow[] {
  const {
    partnerIncome,
    filingStatus,
    spouseW2Income,
    retirementContributions,
    healthBenefits,
    statePartnershipTax,
    fixedExpenses,
  } = inputs;

  const periodsPerYear = getPeriodsPerYear(partnerIncome.payFrequency);
  const grossPayPerPeriod = partnerIncome.guaranteedPayments / periodsPerYear;

  // Annual amounts divided per period
  const retirement401kPerPeriod = retirementContributions.traditional401k / periodsPerYear;
  const roth401kPerPeriod = retirementContributions.roth401k / periodsPerYear;
  const definedBenefitPerPeriod = retirementContributions.definedBenefitPlan / periodsPerYear;
  const healthInsurancePerPeriod = healthBenefits.healthInsurancePremium / periodsPerYear;
  const dentalVisionPerPeriod = healthBenefits.dentalVisionPremium / periodsPerYear;
  const hsaPerPeriod = healthBenefits.hsaContribution / periodsPerYear;
  const dependentCareFSAPerPeriod = healthBenefits.dependentCareFSA / periodsPerYear;

  const periods: PerPeriodCashFlow[] = [];

  // YTD trackers
  let cumulativeGrossPay = 0;
  let ytdSocialSecurityTax = 0;
  let ytdMedicareTax = 0;
  let ytdFederalTax = 0;
  let ytdStateTax = 0;
  let ytd401k = 0;
  let cumulativeInvestableProceeds = 0;

  for (let i = 0; i < periodsPerYear; i++) {
    const periodNumber = i + 1;

    // Calculate period date (simplified - assuming monthly 1st of month or semi-monthly 1st and 15th)
    let periodDate = new Date(2026, 0, 1);
    if (partnerIncome.payFrequency === 'monthly') {
      periodDate = new Date(2026, i, 1);
    } else if (partnerIncome.payFrequency === 'semimonthly') {
      const month = Math.floor(i / 2);
      const day = (i % 2 === 0) ? 1 : 15;
      periodDate = new Date(2026, month, day);
    } else if (partnerIncome.payFrequency === 'biweekly') {
      periodDate = new Date(2026, 0, 1 + (i * 14));
    } else if (partnerIncome.payFrequency === 'weekly') {
      periodDate = new Date(2026, 0, 1 + (i * 7));
    }

    const grossPay = grossPayPerPeriod;
    cumulativeGrossPay += grossPay;

    // Calculate Social Security tax for this period
    const priorCumulativeGross = cumulativeGrossPay - grossPay;
    const seTaxBase = grossPay * SE_TAX_2026.SE_TAX_BASE_MULTIPLIER;

    let socialSecurityTax = 0;
    const ssWageBaseRemaining = Math.max(0, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE - priorCumulativeGross - spouseW2Income);
    const ssCapReached = ssWageBaseRemaining <= 0;

    if (!ssCapReached && priorCumulativeGross < SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE) {
      const taxableThisPeriod = Math.min(
        seTaxBase,
        SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE - priorCumulativeGross - spouseW2Income
      );
      socialSecurityTax = Math.max(0, taxableThisPeriod * SE_TAX_2026.SOCIAL_SECURITY_RATE);
    }

    // Medicare never stops
    const medicareTax = seTaxBase * SE_TAX_2026.MEDICARE_RATE;

    // Additional Medicare Tax (check if cumulative exceeds threshold)
    const medicareThreshold = getAdditionalMedicareThreshold(filingStatus);
    const combinedIncome = cumulativeGrossPay + spouseW2Income;
    let additionalMedicareTax = 0;
    if (combinedIncome > medicareThreshold) {
      const priorCombinedIncome = priorCumulativeGross + spouseW2Income;
      const amountOver = Math.max(0, combinedIncome - medicareThreshold);
      const priorAmountOver = Math.max(0, priorCombinedIncome - medicareThreshold);
      const incrementalOver = amountOver - priorAmountOver;
      additionalMedicareTax = incrementalOver * SE_TAX_2026.ADDITIONAL_MEDICARE_RATE;
    }

    ytdSocialSecurityTax += socialSecurityTax;
    ytdMedicareTax += medicareTax + additionalMedicareTax;

    // Federal tax withholding
    const federalTaxWithholding = federalTaxResult.requiredWithholdingPerPeriod;
    ytdFederalTax += federalTaxWithholding;

    // State tax withholding
    const stateTaxWithholding = grossPay * statePartnershipTax.estimatedStateRate;
    ytdStateTax += stateTaxWithholding;

    // Pre-tax deductions
    const retirement401k = retirement401kPerPeriod;
    const definedBenefitPlan = definedBenefitPerPeriod;
    const healthInsurance = healthInsurancePerPeriod;
    const dentalVision = dentalVisionPerPeriod;
    const hsa = hsaPerPeriod;
    const dependentCareFSA = dependentCareFSAPerPeriod;

    ytd401k += retirement401k;

    // Post-tax deductions
    const roth401k = roth401kPerPeriod;
    const parking = 0; // Could add transportation benefits

    // Net pay calculation
    const totalDeductions =
      socialSecurityTax +
      medicareTax +
      additionalMedicareTax +
      federalTaxWithholding +
      stateTaxWithholding +
      retirement401k +
      definedBenefitPlan +
      healthInsurance +
      dentalVision +
      hsa +
      dependentCareFSA +
      roth401k +
      parking;

    const netPay = grossPay - totalDeductions;

    // Fixed expenses
    const mortgage = fixedExpenses.mortgage;
    const householdExpenses = fixedExpenses.householdExpenses;
    const discretionaryBudget = fixedExpenses.discretionaryBudget;
    const totalFixedExpenses = mortgage + householdExpenses + discretionaryBudget;

    // Investable proceeds
    const investableProceeds = netPay - totalFixedExpenses;
    cumulativeInvestableProceeds += investableProceeds;

    periods.push({
      periodNumber,
      periodDate,
      grossPay,
      cumulativeGrossPay,
      federalTaxWithholding,
      stateTaxWithholding,
      socialSecurityTax,
      medicareTax: medicareTax + additionalMedicareTax,
      additionalMedicareTax,
      retirement401k,
      definedBenefitPlan,
      healthInsurance,
      dentalVision,
      hsa,
      dependentCareFSA,
      roth401k,
      parking,
      netPay,
      mortgage,
      householdExpenses,
      discretionaryBudget,
      totalFixedExpenses,
      investableProceeds,
      cumulativeInvestableProceeds,
      ytdSocialSecurityTax,
      ytdMedicareTax,
      ytdFederalTax,
      ytdStateTax,
      ytd401k,
      ssWageBaseRemaining,
      ssCapReached,
    });
  }

  return periods;
}

// =============================================================================
// YEAR SUMMARY CALCULATION
// =============================================================================

export function calculateYearSummary(
  periods: PerPeriodCashFlow[],
  seTaxResult: SelfEmploymentTaxResult,
  federalTaxResult: FederalTaxResult,
  inputs: CalculationInputs
): YearSummary {
  const lastPeriod = periods[periods.length - 1];

  const totalGrossIncome = lastPeriod.cumulativeGrossPay;
  const totalSelfEmploymentTax = seTaxResult.totalSETax;
  const totalFederalTax = lastPeriod.ytdFederalTax;
  const totalStateTax = lastPeriod.ytdStateTax;
  const totalRetirement = lastPeriod.ytd401k + (inputs.retirementContributions.definedBenefitPlan);
  const totalHealthBenefits = (inputs.healthBenefits.healthInsurancePremium +
                                inputs.healthBenefits.dentalVisionPremium +
                                inputs.healthBenefits.hsaContribution +
                                inputs.healthBenefits.dependentCareFSA);
  const totalFixedExpenses = periods.reduce((sum, p) => sum + p.totalFixedExpenses, 0);
  const totalInvestableProceeds = lastPeriod.cumulativeInvestableProceeds;

  const totalTaxes = totalSelfEmploymentTax + totalFederalTax + totalStateTax;
  const effectiveTaxRate = totalGrossIncome > 0 ? totalTaxes / totalGrossIncome : 0;
  const marginalTaxRate = federalTaxResult.marginalRate;

  return {
    totalGrossIncome,
    totalSelfEmploymentTax,
    totalFederalTax,
    totalStateTax,
    totalRetirement,
    totalHealthBenefits,
    totalFixedExpenses,
    totalInvestableProceeds,
    effectiveTaxRate,
    marginalTaxRate,
  };
}

// =============================================================================
// MAIN CALCULATION FUNCTION
// =============================================================================

export function calculateSelfEmployedBudget(inputs: CalculationInputs) {
  // 1. Calculate Self-Employment Tax
  const seTaxResult = calculateSelfEmploymentTax(
    inputs.partnerIncome.guaranteedPayments,
    inputs.filingStatus,
    inputs.spouseW2Income
  );

  // 2. Calculate Federal Income Tax
  const federalTaxResult = calculateFederalTax(inputs, seTaxResult.deductiblePortion);

  // 3. Calculate Per-Period Cash Flow
  const periods = calculatePerPeriodCashFlow(inputs, seTaxResult, federalTaxResult);

  // 4. Calculate Year Summary
  const yearSummary = calculateYearSummary(periods, seTaxResult, federalTaxResult, inputs);

  return {
    seTaxResult,
    federalTaxResult,
    periods,
    yearSummary,
  };
}
