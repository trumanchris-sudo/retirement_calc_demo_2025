/**
 * Tax calculation utilities for retirement planning
 * Includes federal income tax, capital gains tax, NIIT, and state tax calculations
 */

import { TAX_BRACKETS, LTCG_BRACKETS, NIIT_THRESHOLD } from "@/lib/constants";

/**
 * Filing status for the core retirement engine.
 * Note: The self-employed calculator (lib/constants/tax2026.ts) defines a broader
 * FilingStatus = "single" | "mfj" | "mfs" | "hoh" for payroll/income tax scenarios.
 * This simplified type maps "married" to MFJ for retirement projections.
 */
export type FilingStatus = "single" | "married";

/**
 * Calculate federal ordinary income tax using progressive brackets
 * @param income - Ordinary income subject to tax
 * @param status - Filing status (single or married)
 * @returns Federal ordinary income tax amount
 */
export const calcOrdinaryTax = (income: number, status: FilingStatus): number => {
  // Guard against NaN/undefined/negative inputs
  const safeIncome = Number.isFinite(income) ? Math.max(0, income) : 0;
  if (safeIncome <= 0) return 0;

  // Get brackets for filing status
  const brackets = TAX_BRACKETS[status];
  // Type safety check (brackets is always valid at compile time, but defensive for runtime)
  /* istanbul ignore next */
  if (!brackets?.rates) {
    console.warn(`[calcOrdinaryTax] Invalid filing status: ${status}`);
    return 0;
  }

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
};

/**
 * Calculate federal long-term capital gains tax
 * Capital gains "stack" on top of ordinary income for bracket determination
 * @param capGain - Long-term capital gains amount
 * @param status - Filing status (single or married)
 * @param ordinaryIncome - Ordinary income (affects which LTCG bracket applies)
 * @returns Federal capital gains tax amount
 */
export const calcLTCGTax = (
  capGain: number,
  status: FilingStatus,
  ordinaryIncome: number
): number => {
  // Guard against NaN/undefined/negative inputs
  const safeCapGain = Number.isFinite(capGain) ? Math.max(0, capGain) : 0;
  const safeOrdinaryIncome = Number.isFinite(ordinaryIncome) ? Math.max(0, ordinaryIncome) : 0;
  if (safeCapGain <= 0) return 0;

  // Get brackets for filing status
  const brackets = LTCG_BRACKETS[status];
  // Type safety check (brackets is always valid at compile time, but defensive for runtime)
  /* istanbul ignore next */
  if (!brackets) {
    console.warn(`[calcLTCGTax] Invalid filing status: ${status}`);
    return 0;
  }
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
};

/**
 * Calculate Net Investment Income Tax (NIIT) - 3.8% Medicare surtax
 * @param investmentIncome - Investment income subject to NIIT
 * @param status - Filing status (single or married)
 * @param modifiedAGI - Modified adjusted gross income
 * @returns NIIT amount (3.8% on lesser of investment income or excess over threshold)
 */
export const calcNIIT = (
  investmentIncome: number,
  status: FilingStatus,
  modifiedAGI: number
): number => {
  // Guard against NaN/undefined/negative inputs
  const safeInvestmentIncome = Number.isFinite(investmentIncome) ? Math.max(0, investmentIncome) : 0;
  const safeModifiedAGI = Number.isFinite(modifiedAGI) ? Math.max(0, modifiedAGI) : 0;

  if (safeInvestmentIncome <= 0) return 0;

  // Validate threshold exists for filing status
  const threshold = NIIT_THRESHOLD[status];
  if (threshold === undefined) {
    console.warn(`[calcNIIT] Invalid filing status: ${status}`);
    return 0;
  }

  const excess = Math.max(0, safeModifiedAGI - threshold);
  if (excess <= 0) return 0;
  const base = Math.min(safeInvestmentIncome, excess);
  return base * 0.038;
};
