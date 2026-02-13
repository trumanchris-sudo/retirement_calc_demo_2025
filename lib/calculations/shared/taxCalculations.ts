/**
 * Shared Tax Calculation Functions
 *
 * Pure tax calculation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import {
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  IRMAA_BRACKETS_2026,
  EMPLOYMENT_TAX_CONSTANTS,
  type FilingStatus,
} from "./constants";

/**
 * Calculate federal ordinary income tax using progressive brackets
 * @param income - Ordinary income subject to tax
 * @param status - Filing status (single or married)
 * @returns Federal ordinary income tax amount
 */
export function calcOrdinaryTax(income: number, status: FilingStatus): number {
  // Guard against NaN/undefined/negative inputs
  const safeIncome = Number.isFinite(income) ? Math.max(0, income) : 0;
  if (safeIncome <= 0) return 0;

  const brackets = TAX_BRACKETS[status];
  if (!brackets?.rates) return 0;

  const { rates, deduction } = brackets;
  let adj = Math.max(0, safeIncome - deduction);
  let tax = 0;
  let prev = 0;

  for (const b of rates) {
    const amount = Math.min(adj, b.limit - prev);
    tax += amount * b.rate;
    adj -= amount;
    prev = b.limit;
    if (adj <= 0) break;
  }

  return tax;
}

/**
 * Calculate federal long-term capital gains tax
 * Capital gains "stack" on top of ordinary income for bracket determination
 * @param capGain - Long-term capital gains amount
 * @param status - Filing status (single or married)
 * @param ordinaryIncome - Ordinary income (affects which LTCG bracket applies)
 * @returns Federal capital gains tax amount
 */
export function calcLTCGTax(
  capGain: number,
  status: FilingStatus,
  ordinaryIncome: number
): number {
  // Guard against NaN/undefined/negative inputs
  const safeCapGain = Number.isFinite(capGain) ? Math.max(0, capGain) : 0;
  const safeOrdinaryIncome = Number.isFinite(ordinaryIncome) ? Math.max(0, ordinaryIncome) : 0;
  if (safeCapGain <= 0) return 0;

  const brackets = LTCG_BRACKETS[status];
  if (!brackets) return 0;

  let remainingGain = safeCapGain;
  let tax = 0;

  // Track cumulative income (ordinary + gains processed so far)
  // This is how capital gains "stack" on top of ordinary income
  let cumulativeIncome = safeOrdinaryIncome;

  for (const b of brackets) {
    // How much room is left in this bracket after accounting for cumulative income?
    const bracketRoom = Math.max(0, b.limit - cumulativeIncome);

    // Fill this bracket with as much gain as possible
    const taxedHere = Math.min(remainingGain, bracketRoom);

    if (taxedHere > 0) {
      tax += taxedHere * b.rate;
      remainingGain -= taxedHere;
      cumulativeIncome += taxedHere;  // Update cumulative position
    }

    if (remainingGain <= 0) break;
  }

  // Any remaining gains go at the top rate
  if (remainingGain > 0) {
    const topRate = brackets[brackets.length - 1].rate;
    tax += remainingGain * topRate;
  }

  return tax;
}

/**
 * Calculate Net Investment Income Tax (NIIT) - 3.8% Medicare surtax
 * @param investmentIncome - Investment income subject to NIIT
 * @param status - Filing status (single or married)
 * @param modifiedAGI - Modified adjusted gross income
 * @returns NIIT amount (3.8% on lesser of investment income or excess over threshold)
 */
export function calcNIIT(
  investmentIncome: number,
  status: FilingStatus,
  modifiedAGI: number
): number {
  // Guard against NaN/undefined/negative inputs
  const safeInvestmentIncome = Number.isFinite(investmentIncome) ? Math.max(0, investmentIncome) : 0;
  const safeModifiedAGI = Number.isFinite(modifiedAGI) ? Math.max(0, modifiedAGI) : 0;

  if (safeInvestmentIncome <= 0) return 0;

  const threshold = NIIT_THRESHOLD[status];
  if (threshold === undefined) return 0;

  const excess = Math.max(0, safeModifiedAGI - threshold);
  if (excess <= 0) return 0;

  const base = Math.min(safeInvestmentIncome, excess);
  return base * 0.038;
}

/**
 * Calculate IRMAA (Income-Related Monthly Adjustment Amount) surcharge
 * Based on 2026 tiered brackets - returns monthly surcharge amount
 * @param magi - Modified Adjusted Gross Income
 * @param isMarried - Whether filing status is married
 * @returns Monthly IRMAA surcharge amount
 */
export function getIRMAASurcharge(magi: number, isMarried: boolean): number {
  const brackets = isMarried ? IRMAA_BRACKETS_2026.married : IRMAA_BRACKETS_2026.single;

  for (const bracket of brackets) {
    if (magi <= bracket.threshold) {
      return bracket.surcharge;
    }
  }

  // Fallback to highest tier (should not reach here due to Infinity threshold)
  return brackets[brackets.length - 1].surcharge;
}

/**
 * Calculate self-employment tax for self-employed individuals
 * @param netEarnings - Net self-employment earnings
 * @returns Self-employment tax amount
 */
export function calculateSelfEmploymentTax(netEarnings: number): number {
  if (netEarnings <= 0) return 0;

  const {
    SS_WAGE_BASE,
    SS_RATE_SELF_EMPLOYED,
    MEDICARE_RATE_SELF_EMPLOYED,
    ADDITIONAL_MEDICARE_THRESHOLD,
    ADDITIONAL_MEDICARE_RATE,
    SELF_EMPLOYMENT_FACTOR,
  } = EMPLOYMENT_TAX_CONSTANTS;

  const selfEmploymentEarnings = netEarnings * SELF_EMPLOYMENT_FACTOR;
  const ssTax = Math.min(selfEmploymentEarnings, SS_WAGE_BASE) * SS_RATE_SELF_EMPLOYED;
  let medicareTax = selfEmploymentEarnings * MEDICARE_RATE_SELF_EMPLOYED;

  if (selfEmploymentEarnings > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (selfEmploymentEarnings - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

/**
 * Calculate payroll taxes for W2 employee
 * @param wages - W2 wages
 * @returns Payroll tax amount (employee share)
 */
export function calculatePayrollTax(wages: number): number {
  if (wages <= 0) return 0;

  const {
    SS_WAGE_BASE,
    SS_RATE_EMPLOYEE,
    MEDICARE_RATE_EMPLOYEE,
    ADDITIONAL_MEDICARE_THRESHOLD,
    ADDITIONAL_MEDICARE_RATE,
  } = EMPLOYMENT_TAX_CONSTANTS;

  const ssTax = Math.min(wages, SS_WAGE_BASE) * SS_RATE_EMPLOYEE;
  let medicareTax = wages * MEDICARE_RATE_EMPLOYEE;

  if (wages > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (wages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

export type EmploymentType = 'w2' | 'self-employed' | 'both' | 'retired' | 'other';

/**
 * Calculate employment-related taxes based on employment type
 * @param income - Annual income
 * @param employmentType - Type of employment
 * @returns Employment tax amount
 */
export function calculateEmploymentTaxes(income: number, employmentType: EmploymentType): number {
  if (income <= 0 || employmentType === 'retired' || employmentType === 'other') {
    return 0;
  }

  if (employmentType === 'w2') {
    return calculatePayrollTax(income);
  }

  if (employmentType === 'self-employed') {
    return calculateSelfEmploymentTax(income);
  }

  // 'both' - assume 50/50 split
  const w2Portion = income * 0.5;
  const selfEmployedPortion = income * 0.5;
  return calculatePayrollTax(w2Portion) + calculateSelfEmploymentTax(selfEmployedPortion);
}
