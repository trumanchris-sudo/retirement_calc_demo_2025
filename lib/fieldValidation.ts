/**
 * Field Validation Utilities
 * Epic 9.2: Add field validation rules
 */

import { VALIDATION_RULES } from './planConfig';
import { getMax401kContribution, RETIREMENT_LIMITS_2026 } from './constants/tax2026';

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
export function validateRetirementAge(retirementAge: number, currentAge: number): FieldValidationResult {
  if (isNaN(retirementAge)) {
    return { isValid: false, error: 'Retirement age must be a valid number' };
  }
  if (retirementAge <= currentAge) {
    return { isValid: false, error: 'Retirement age must be greater than current age' };
  }
  if (retirementAge < VALIDATION_RULES.retirementAge.min) {
    return { isValid: false, error: `Retirement age must be at least ${VALIDATION_RULES.retirementAge.min}` };
  }
  if (retirementAge > VALIDATION_RULES.retirementAge.max) {
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
 * Get maximum IRA contribution based on age (2026 limits)
 */
export function getMaxIRAContribution(age?: number): number {
  if (age != null && age >= 50) {
    return RETIREMENT_LIMITS_2026.IRA_LIMIT + RETIREMENT_LIMITS_2026.IRA_CATCHUP_50_PLUS; // $8,600
  }
  return RETIREMENT_LIMITS_2026.IRA_LIMIT; // $7,500
}

/**
 * Validate 401(k) contribution
 * @param contribution - The contribution amount to validate
 * @param age - Optional age for age-aware catch-up limits. When omitted, uses the base limit.
 * @param year - Tax year for error messages (default 2026)
 */
export function validate401kContribution(contribution: number, age?: number, year: number = 2026): FieldValidationResult {
  if (isNaN(contribution)) {
    return { isValid: false, error: '401(k) contribution must be a valid number' };
  }
  if (contribution < 0) {
    return { isValid: false, error: '401(k) contribution cannot be negative' };
  }
  const maxLimit = age != null ? getMax401kContribution(age) : VALIDATION_RULES.contribution401k.max;
  if (contribution > maxLimit) {
    return {
      isValid: false,
      error: `401(k) contribution exceeds ${year} IRS limit ($${maxLimit.toLocaleString()})`,
    };
  }
  if (contribution > maxLimit * 0.9) {
    return {
      isValid: true,
      error: `Approaching ${year} IRS limit ($${maxLimit.toLocaleString()})`,
      warningOnly: true,
    };
  }
  return { isValid: true };
}

/**
 * Validate IRA contribution
 * @param contribution - The contribution amount to validate
 * @param age - Optional age for age-aware catch-up limits. When omitted, uses the base limit.
 * @param year - Tax year for error messages (default 2026)
 */
export function validateIRAContribution(contribution: number, age?: number, year: number = 2026): FieldValidationResult {
  if (isNaN(contribution)) {
    return { isValid: false, error: 'IRA contribution must be a valid number' };
  }
  if (contribution < 0) {
    return { isValid: false, error: 'IRA contribution cannot be negative' };
  }
  const maxLimit = age != null ? getMaxIRAContribution(age) : VALIDATION_RULES.contributionIRA.max;
  if (contribution > maxLimit) {
    return {
      isValid: false,
      error: `IRA contribution exceeds ${year} IRS limit ($${maxLimit.toLocaleString()})`,
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

