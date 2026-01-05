/**
 * Field Validation Utilities
 * Epic 9.2: Add field validation rules
 */

import { VALIDATION_RULES } from './planConfig';

export interface FieldValidationResult {
  isValid: boolean;
  error?: string;
  warningOnly?: boolean;
}

/**
 * Validate age input
 */
export function validateAge(age: number, fieldName: string = 'Age'): FieldValidationResult {
  if (isNaN(age)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  if (age < VALIDATION_RULES.age.min) {
    return { isValid: false, error: `${fieldName} must be at least ${VALIDATION_RULES.age.min}` };
  }
  if (age > VALIDATION_RULES.age.max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${VALIDATION_RULES.age.max}` };
  }
  return { isValid: true };
}

/**
 * Validate retirement age
 */
export function validateRetirementAge(retAge: number, currentAge: number): FieldValidationResult {
  if (isNaN(retAge)) {
    return { isValid: false, error: 'Retirement age must be a valid number' };
  }
  if (retAge < currentAge) {
    return { isValid: false, error: 'Retirement age must be greater than current age' };
  }
  if (retAge < VALIDATION_RULES.retirementAge.min) {
    return { isValid: false, error: `Retirement age must be at least ${VALIDATION_RULES.retirementAge.min}` };
  }
  if (retAge > VALIDATION_RULES.retirementAge.max) {
    return { isValid: false, error: `Retirement age cannot exceed ${VALIDATION_RULES.retirementAge.max}` };
  }
  return { isValid: true };
}

/**
 * Validate account balance
 */
export function validateBalance(balance: number, fieldName: string = 'Balance'): FieldValidationResult {
  if (isNaN(balance)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  if (balance < VALIDATION_RULES.balance.min) {
    return { isValid: false, error: `${fieldName} cannot be negative` };
  }
  if (balance > VALIDATION_RULES.balance.max) {
    return { isValid: false, error: `${fieldName} exceeds reasonable limits ($${(VALIDATION_RULES.balance.max / 1_000_000).toLocaleString()}M)` };
  }
  return { isValid: true };
}

/**
 * Validate 401(k) contribution
 */
export function validate401kContribution(contribution: number, year: number = 2026): FieldValidationResult {
  if (isNaN(contribution)) {
    return { isValid: false, error: '401(k) contribution must be a valid number' };
  }
  if (contribution < 0) {
    return { isValid: false, error: '401(k) contribution cannot be negative' };
  }
  if (contribution > VALIDATION_RULES.contribution401k.max) {
    return {
      isValid: false,
      error: `401(k) contribution exceeds ${year} IRS limit ($${VALIDATION_RULES.contribution401k.max.toLocaleString()})`,
    };
  }
  if (contribution > VALIDATION_RULES.contribution401k.max * 0.9) {
    return {
      isValid: true,
      error: `Approaching ${year} IRS limit ($${VALIDATION_RULES.contribution401k.max.toLocaleString()})`,
      warningOnly: true,
    };
  }
  return { isValid: true };
}

/**
 * Validate IRA contribution
 */
export function validateIRAContribution(contribution: number, year: number = 2026): FieldValidationResult {
  if (isNaN(contribution)) {
    return { isValid: false, error: 'IRA contribution must be a valid number' };
  }
  if (contribution < 0) {
    return { isValid: false, error: 'IRA contribution cannot be negative' };
  }
  if (contribution > VALIDATION_RULES.contributionIRA.max) {
    return {
      isValid: false,
      error: `IRA contribution exceeds ${year} IRS limit ($${VALIDATION_RULES.contributionIRA.max.toLocaleString()})`,
    };
  }
  return { isValid: true };
}

/**
 * Validate rate (return, inflation, etc.)
 */
export function validateRate(rate: number, fieldName: string = 'Rate', allowNegative: boolean = false): FieldValidationResult {
  if (isNaN(rate)) {
    return { isValid: false, error: `${fieldName} must be a valid number` };
  }
  const min = allowNegative ? VALIDATION_RULES.rate.min : 0;
  if (rate < min) {
    return { isValid: false, error: `${fieldName} cannot be less than ${min}%` };
  }
  if (rate > VALIDATION_RULES.rate.max) {
    return { isValid: false, error: `${fieldName} cannot exceed ${VALIDATION_RULES.rate.max}%` };
  }
  if (!allowNegative && rate > 15) {
    return {
      isValid: true,
      error: `${fieldName} of ${rate}% is unusually high. Are you sure?`,
      warningOnly: true,
    };
  }
  return { isValid: true };
}

/**
 * Validate withdrawal rate
 */
export function validateWithdrawalRate(rate: number): FieldValidationResult {
  if (isNaN(rate)) {
    return { isValid: false, error: 'Withdrawal rate must be a valid number' };
  }
  if (rate < VALIDATION_RULES.withdrawalRate.min) {
    return { isValid: false, error: `Withdrawal rate cannot be less than ${VALIDATION_RULES.withdrawalRate.min}%` };
  }
  if (rate > VALIDATION_RULES.withdrawalRate.max) {
    return { isValid: false, error: `Withdrawal rate cannot exceed ${VALIDATION_RULES.withdrawalRate.max}%` };
  }
  if (rate > 6) {
    return {
      isValid: true,
      error: 'Withdrawal rates above 6% may not be sustainable long-term',
      warningOnly: true,
    };
  }
  return { isValid: true };
}

/**
 * Validate Social Security claim age
 */
export function validateSSClaimAge(age: number): FieldValidationResult {
  if (isNaN(age)) {
    return { isValid: false, error: 'Social Security claim age must be a valid number' };
  }
  if (age < VALIDATION_RULES.socialSecurityAge.min) {
    return { isValid: false, error: `Social Security cannot be claimed before age ${VALIDATION_RULES.socialSecurityAge.min}` };
  }
  if (age > VALIDATION_RULES.socialSecurityAge.max) {
    return { isValid: false, error: `Social Security should be claimed by age ${VALIDATION_RULES.socialSecurityAge.max}` };
  }
  return { isValid: true };
}

/**
 * Validate Social Security income
 */
export function validateSSIncome(income: number): FieldValidationResult {
  if (isNaN(income)) {
    return { isValid: false, error: 'Social Security income must be a valid number' };
  }
  if (income < VALIDATION_RULES.socialSecurityIncome.min) {
    return { isValid: false, error: 'Social Security income cannot be negative' };
  }
  if (income > VALIDATION_RULES.socialSecurityIncome.max) {
    return { isValid: false, error: `Social Security income exceeds maximum benefit (~$${VALIDATION_RULES.socialSecurityIncome.max.toLocaleString()}/year)` };
  }
  return { isValid: true };
}

/**
 * Comprehensive validation for all calculator inputs
 */
export interface ValidationErrors {
  [key: string]: string;
}

export function validateAllInputs(inputs: {
  age1: number;
  age2?: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cPre1: number;
  cPost1: number;
  cPre2?: number;
  cPost2?: number;
  retRate: number;
  infRate: number;
  wdRate: number;
  ssIncome?: number;
  ssClaimAge?: number;
  ssIncome2?: number;
  ssClaimAge2?: number;
  marital?: string;
}): ValidationErrors {
  const errors: ValidationErrors = {};

  // Validate ages
  const age1Result = validateAge(inputs.age1, 'Your age');
  if (!age1Result.isValid) errors.age1 = age1Result.error!;

  if (inputs.marital === 'married' && inputs.age2 !== undefined) {
    const age2Result = validateAge(inputs.age2, "Spouse's age");
    if (!age2Result.isValid) errors.age2 = age2Result.error!;
  }

  const retAgeResult = validateRetirementAge(inputs.retAge, inputs.age1);
  if (!retAgeResult.isValid) errors.retAge = retAgeResult.error!;

  // Validate balances
  const sTaxResult = validateBalance(inputs.sTax, 'Taxable balance');
  if (!sTaxResult.isValid) errors.sTax = sTaxResult.error!;

  const sPreResult = validateBalance(inputs.sPre, 'Pre-tax balance');
  if (!sPreResult.isValid) errors.sPre = sPreResult.error!;

  const sPostResult = validateBalance(inputs.sPost, 'Roth balance');
  if (!sPostResult.isValid) errors.sPost = sPostResult.error!;

  // Validate contributions
  const cPre1Result = validate401kContribution(inputs.cPre1);
  if (!cPre1Result.isValid && !cPre1Result.warningOnly) errors.cPre1 = cPre1Result.error!;

  const cPost1Result = validateIRAContribution(inputs.cPost1);
  if (!cPost1Result.isValid && !cPost1Result.warningOnly) errors.cPost1 = cPost1Result.error!;

  if (inputs.marital === 'married') {
    if (inputs.cPre2 !== undefined) {
      const cPre2Result = validate401kContribution(inputs.cPre2);
      if (!cPre2Result.isValid && !cPre2Result.warningOnly) errors.cPre2 = cPre2Result.error!;
    }
    if (inputs.cPost2 !== undefined) {
      const cPost2Result = validateIRAContribution(inputs.cPost2);
      if (!cPost2Result.isValid && !cPost2Result.warningOnly) errors.cPost2 = cPost2Result.error!;
    }
  }

  // Validate rates
  const retRateResult = validateRate(inputs.retRate, 'Return rate', false);
  if (!retRateResult.isValid && !retRateResult.warningOnly) errors.retRate = retRateResult.error!;

  const infRateResult = validateRate(inputs.infRate, 'Inflation rate', true);
  if (!infRateResult.isValid && !infRateResult.warningOnly) errors.infRate = infRateResult.error!;

  const wdRateResult = validateWithdrawalRate(inputs.wdRate);
  if (!wdRateResult.isValid && !wdRateResult.warningOnly) errors.wdRate = wdRateResult.error!;

  // Validate Social Security
  if (inputs.ssIncome !== undefined) {
    const ssIncomeResult = validateSSIncome(inputs.ssIncome);
    if (!ssIncomeResult.isValid) errors.ssIncome = ssIncomeResult.error!;
  }

  if (inputs.ssClaimAge !== undefined) {
    const ssClaimAgeResult = validateSSClaimAge(inputs.ssClaimAge);
    if (!ssClaimAgeResult.isValid) errors.ssClaimAge = ssClaimAgeResult.error!;
  }

  if (inputs.marital === 'married') {
    if (inputs.ssIncome2 !== undefined) {
      const ssIncome2Result = validateSSIncome(inputs.ssIncome2);
      if (!ssIncome2Result.isValid) errors.ssIncome2 = ssIncome2Result.error!;
    }
    if (inputs.ssClaimAge2 !== undefined) {
      const ssClaimAge2Result = validateSSClaimAge(inputs.ssClaimAge2);
      if (!ssClaimAge2Result.isValid) errors.ssClaimAge2 = ssClaimAge2Result.error!;
    }
  }

  return errors;
}
