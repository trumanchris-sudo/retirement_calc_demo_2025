/**
 * Input validation utilities with specific error messages
 */

import type { ValidationResult } from "@/types/calculator";

/**
 * Validate a numeric input with specific error messages
 */
export function validateNumber(
  value: number,
  fieldName: string,
  min?: number,
  max?: number,
  allowNegative: boolean = false
): ValidationResult {
  // Check if value is a valid number
  if (isNaN(value) || !isFinite(value)) {
    return {
      isValid: false,
      error: `${fieldName} must be a valid number. You entered "${value}".`
    };
  }

  // Check for negative values (if not allowed)
  if (!allowNegative && value < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative. You entered ${value.toLocaleString()}.`
    };
  }

  // Check minimum value
  if (min !== undefined && value < min) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${min.toLocaleString()}. You entered ${value.toLocaleString()}.`
    };
  }

  // Check maximum value
  if (max !== undefined && value > max) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${max.toLocaleString()}. You entered ${value.toLocaleString()}.`
    };
  }

  return { isValid: true };
}

/**
 * Validate age with specific constraints
 */
export function validateAge(value: number, fieldName: string): ValidationResult {
  return validateNumber(value, fieldName, 0, 120);
}

/**
 * Validate percentage (0-100)
 */
export function validatePercentage(value: number, fieldName: string): ValidationResult {
  return validateNumber(value, fieldName, 0, 100);
}

/**
 * Validate withdrawal rate (specific check for > 100%)
 */
export function validateWithdrawalRate(value: number): ValidationResult {
  if (value > 100) {
    return {
      isValid: false,
      error: `Withdrawal rate cannot exceed 100% (you would be withdrawing more than your balance each year). You entered ${value}%.`
    };
  }

  if (value > 20) {
    return {
      isValid: false,
      error: `Withdrawal rate of ${value}% is extremely high and will likely deplete your portfolio quickly. Consider a rate between 3-5%.`
    };
  }

  return validateNumber(value, "Withdrawal rate", 0, 100);
}

/**
 * Validate retirement age is after current age
 */
export function validateRetirementAge(
  retirementAge: number,
  currentAge: number
): ValidationResult {
  const ageValidation = validateAge(retirementAge, "Retirement age");
  if (!ageValidation.isValid) {
    return ageValidation;
  }

  if (retirementAge <= currentAge) {
    return {
      isValid: false,
      error: `Retirement age (${retirementAge}) must be greater than your current age (${currentAge}).`
    };
  }

  if (retirementAge - currentAge < 1) {
    return {
      isValid: false,
      error: `You must have at least 1 year until retirement. Current age: ${currentAge}, Retirement age: ${retirementAge}.`
    };
  }

  return { isValid: true };
}

/**
 * Validate contribution amounts (can't be negative)
 */
export function validateContribution(value: number, fieldName: string): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative. Contributions must be $0 or greater. You entered ${value.toLocaleString()}.`
    };
  }

  // Warn about very large contributions
  if (value > 1000000) {
    return {
      isValid: false,
      error: `${fieldName} of ${value.toLocaleString()} seems unusually high. Please verify this amount is correct.`
    };
  }

  return { isValid: true };
}

/**
 * Validate starting balance (can be zero but not negative)
 */
export function validateBalance(value: number, fieldName: string): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      error: `${fieldName} cannot be negative. You entered ${value.toLocaleString()}.`
    };
  }

  return { isValid: true };
}

/**
 * Validate inflation rate (reasonable bounds)
 */
export function validateInflationRate(value: number): ValidationResult {
  if (value < 0) {
    return {
      isValid: false,
      error: `Inflation rate cannot be negative (deflation scenarios are not supported). You entered ${value}%.`
    };
  }

  if (value > 50) {
    return {
      isValid: false,
      error: `Inflation rate of ${value}% represents hyperinflation. For extreme scenarios, use the inflation shock feature. Consider a rate between 1-10%.`
    };
  }

  return { isValid: true };
}

/**
 * Validate return rate (reasonable bounds)
 */
export function validateReturnRate(value: number): ValidationResult {
  if (value < -50) {
    return {
      isValid: false,
      error: `Return rate of ${value}% is unrealistically low. Consider a rate between 0-20%.`
    };
  }

  if (value > 50) {
    return {
      isValid: false,
      error: `Return rate of ${value}% is unrealistically high. Historical S&P 500 average is ~10%. Consider a rate between 5-15%.`
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for all calculator inputs
 */
export function validateCalculatorInputs(inputs: {
  age1: number;
  age2?: number;
  retAge: number;
  sTax: number;
  sPre: number;
  sPost: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  cMatch1: number;
  cTax2?: number;
  cPre2?: number;
  cPost2?: number;
  cMatch2?: number;
  wdRate: number;
  retRate: number;
  infRate: number;
  stateRate: number;
  marital: string;
}): ValidationResult {
  // Validate ages
  let result = validateAge(inputs.age1, "Your age");
  if (!result.isValid) return result;

  result = validateRetirementAge(inputs.retAge, inputs.age1);
  if (!result.isValid) return result;

  if (inputs.marital === 'married' && inputs.age2 !== undefined) {
    result = validateAge(inputs.age2, "Spouse age");
    if (!result.isValid) return result;
  }

  // Validate starting balances
  result = validateBalance(inputs.sTax, "Taxable balance");
  if (!result.isValid) return result;

  result = validateBalance(inputs.sPre, "Pre-tax balance");
  if (!result.isValid) return result;

  result = validateBalance(inputs.sPost, "Roth balance");
  if (!result.isValid) return result;

  // Check if user has any starting balance or contributions
  const totalBalance = inputs.sTax + inputs.sPre + inputs.sPost;
  const totalContributions = inputs.cTax1 + inputs.cPre1 + inputs.cPost1 + inputs.cMatch1;

  if (totalBalance === 0 && totalContributions === 0) {
    return {
      isValid: false,
      error: "You must have either a starting balance or annual contributions to run a calculation."
    };
  }

  // Validate contributions
  result = validateContribution(inputs.cTax1, "Taxable contributions");
  if (!result.isValid) return result;

  result = validateContribution(inputs.cPre1, "Pre-tax contributions");
  if (!result.isValid) return result;

  result = validateContribution(inputs.cPost1, "Roth contributions");
  if (!result.isValid) return result;

  result = validateContribution(inputs.cMatch1, "Employer match");
  if (!result.isValid) return result;

  if (inputs.marital === 'married') {
    if (inputs.cTax2 !== undefined) {
      result = validateContribution(inputs.cTax2, "Spouse taxable contributions");
      if (!result.isValid) return result;
    }
    if (inputs.cPre2 !== undefined) {
      result = validateContribution(inputs.cPre2, "Spouse pre-tax contributions");
      if (!result.isValid) return result;
    }
    if (inputs.cPost2 !== undefined) {
      result = validateContribution(inputs.cPost2, "Spouse Roth contributions");
      if (!result.isValid) return result;
    }
    if (inputs.cMatch2 !== undefined) {
      result = validateContribution(inputs.cMatch2, "Spouse employer match");
      if (!result.isValid) return result;
    }
  }

  // Validate rates
  result = validateWithdrawalRate(inputs.wdRate);
  if (!result.isValid) return result;

  result = validateReturnRate(inputs.retRate);
  if (!result.isValid) return result;

  result = validateInflationRate(inputs.infRate);
  if (!result.isValid) return result;

  result = validatePercentage(inputs.stateRate, "State tax rate");
  if (!result.isValid) return result;

  return { isValid: true };
}
