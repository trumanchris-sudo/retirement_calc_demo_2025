/**
 * Shared Social Security Calculation Functions
 *
 * Pure Social Security calculation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { SS_BEND_POINTS, SS_EARNINGS_TEST_2026, SS_TAXATION_THRESHOLDS, type FilingStatus } from "./constants";

/**
 * Calculate Primary Insurance Amount (PIA) for Social Security
 * This is the benefit at Full Retirement Age before any claiming adjustments
 * @param avgAnnualIncome - Average indexed monthly earnings (in annual terms)
 * @returns Monthly PIA
 */
export function calcPIA(avgAnnualIncome: number): number {
  if (avgAnnualIncome <= 0) return 0;

  // Convert annual to monthly
  const aime = avgAnnualIncome / 12;

  // Apply bend points to calculate PIA (Primary Insurance Amount)
  let pia = 0;
  if (aime <= SS_BEND_POINTS.first) {
    pia = aime * 0.90;
  } else if (aime <= SS_BEND_POINTS.second) {
    pia = SS_BEND_POINTS.first * 0.90 + (aime - SS_BEND_POINTS.first) * 0.32;
  } else {
    pia = SS_BEND_POINTS.first * 0.90 +
          (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 +
          (aime - SS_BEND_POINTS.second) * 0.15;
  }

  return pia;
}

/**
 * Adjust own Social Security benefit for claiming age
 * @param monthlyPIA - Monthly Primary Insurance Amount
 * @param claimAge - Age when claiming benefits
 * @param fra - Full Retirement Age (typically 67)
 * @returns Adjusted monthly benefit
 */
export function adjustSSForClaimAge(monthlyPIA: number, claimAge: number, fra: number = 67): number {
  if (monthlyPIA <= 0) return 0;

  const monthsFromFRA = (claimAge - fra) * 12;
  let adjustmentFactor = 1.0;

  if (monthsFromFRA < 0) {
    // Early claiming: reduce by 5/9 of 1% for first 36 months, then 5/12 of 1% for each additional month
    const earlyMonths = Math.abs(monthsFromFRA);
    if (earlyMonths <= 36) {
      adjustmentFactor = 1 - (earlyMonths * 5/9 / 100);
    } else {
      adjustmentFactor = 1 - (36 * 5/9 / 100) - ((earlyMonths - 36) * 5/12 / 100);
    }
  } else if (monthsFromFRA > 0) {
    // Delayed claiming: increase by 2/3 of 1% per month (8% per year)
    adjustmentFactor = 1 + (monthsFromFRA * 2/3 / 100);
  }

  return monthlyPIA * adjustmentFactor;
}

/**
 * Calculate Social Security annual benefit
 * Uses bend point formula with early/delayed claiming adjustments
 * @param avgAnnualIncome - Average indexed monthly earnings (in annual terms)
 * @param claimAge - Age when claiming benefits (62-70)
 * @param fullRetirementAge - Full retirement age (typically 67)
 * @returns Annual Social Security benefit
 */
export function calcSocialSecurity(
  avgAnnualIncome: number,
  claimAge: number,
  fullRetirementAge: number = 67
): number {
  if (avgAnnualIncome <= 0) return 0;

  const pia = calcPIA(avgAnnualIncome);
  const adjustedMonthly = adjustSSForClaimAge(pia, claimAge, fullRetirementAge);

  // Return annual benefit
  return adjustedMonthly * 12;
}

/**
 * Calculate effective Social Security benefits including spousal benefits
 *
 * SSA Rules for Spousal Benefits:
 * 1. A spouse can receive up to 50% of the other spouse's PIA at Full Retirement Age
 * 2. The spouse receives the HIGHER of: their own benefit OR the spousal benefit (not both)
 * 3. Spousal benefits are reduced if claimed before FRA (different formula than own benefits)
 * 4. Spousal benefits do NOT increase for delayed claiming past FRA
 *
 * @param ownPIA - Person's own Primary Insurance Amount (monthly)
 * @param spousePIA - Spouse's Primary Insurance Amount (monthly)
 * @param ownClaimAge - Age when person claims benefits
 * @param fra - Full Retirement Age (typically 67)
 * @returns Effective monthly benefit (higher of own or spousal)
 */
export function calculateEffectiveSS(
  ownPIA: number,
  spousePIA: number,
  ownClaimAge: number,
  fra: number = 67
): number {
  // Calculate own benefit with early/late claiming adjustment
  const ownBenefit = adjustSSForClaimAge(ownPIA, ownClaimAge, fra);

  // Spousal benefit is up to 50% of spouse's PIA (not their adjusted benefit)
  // Reduced if claimed before FRA using spousal-specific reduction formula
  let spousalBenefit = spousePIA * 0.5;

  if (ownClaimAge < fra) {
    // Spousal benefits reduced by 25/36 of 1% per month for first 36 months early
    // Then 5/12 of 1% for additional months
    const monthsEarly = (fra - ownClaimAge) * 12;
    if (monthsEarly <= 36) {
      spousalBenefit *= (1 - monthsEarly * (25/36) / 100);
    } else {
      spousalBenefit *= (1 - 36 * (25/36) / 100 - (monthsEarly - 36) * (5/12) / 100);
    }
  }
  // Note: Spousal benefits do NOT increase for delayed claiming past FRA

  // Return the higher benefit
  return Math.max(ownBenefit, spousalBenefit);
}

/**
 * Apply the Social Security Earnings Test for early claimers who are still working.
 *
 * SSA Rules (2026):
 * - Under FRA: Benefits reduced $1 for every $2 earned above $23,400/year
 * - In the year reaching FRA: Benefits reduced $1 for every $3 earned above $62,160/year
 *   (only earnings before the birthday month count, but we use the full-year approximation)
 * - At or past FRA: No reduction — earnings test does not apply
 *
 * These reductions are temporary. SSA recalculates the benefit upward at FRA to credit
 * months of withheld benefits. This function models the cash-flow reduction only.
 *
 * @param ssAnnualBenefit - The annual SS benefit (already adjusted for claiming age)
 * @param earnedIncome - Annual earned income from employment (W-2 wages or net self-employment)
 * @param age - Current age of the beneficiary
 * @param fra - Full Retirement Age (typically 67)
 * @returns The annual SS benefit after applying the earnings test (never below $0)
 */
export function applyEarningsTest(
  ssAnnualBenefit: number,
  earnedIncome: number,
  age: number,
  fra: number = 67
): number {
  // No reduction at or past FRA
  if (age >= fra) return ssAnnualBenefit;

  // No benefit to reduce
  if (ssAnnualBenefit <= 0) return 0;

  // No earned income means no reduction
  if (earnedIncome <= 0) return ssAnnualBenefit;

  let reduction = 0;

  if (Math.floor(age) === Math.floor(fra) - 1 && age + 1 >= fra) {
    // In the year the beneficiary reaches FRA:
    // $1 reduction for every $3 earned above the higher exempt amount
    const excessEarnings = Math.max(0, earnedIncome - SS_EARNINGS_TEST_2026.fraYearExemptAmount);
    reduction = excessEarnings * SS_EARNINGS_TEST_2026.fraYearReductionRate;
  } else {
    // Under FRA (not in the FRA year):
    // $1 reduction for every $2 earned above the annual exempt amount
    const excessEarnings = Math.max(0, earnedIncome - SS_EARNINGS_TEST_2026.annualExemptAmount);
    reduction = excessEarnings * SS_EARNINGS_TEST_2026.reductionRate;
  }

  // Benefits cannot be reduced below $0
  return Math.max(0, ssAnnualBenefit - reduction);
}

/**
 * Calculate the taxable dollar amount of Social Security benefits.
 *
 * IRS rules (unchanged since 1984/1993 — thresholds are NOT inflation-indexed):
 *   Combined income = AGI (excluding SS) + nontaxable interest + 50% of SS benefits
 *
 *   If combined income <= tier1:  0% of benefits are taxable
 *   If tier1 < combined income <= tier2:  taxable = min(50% of SS, 50% of excess over tier1)
 *   If combined income > tier2:  taxable = min(85% of SS, tier1-to-tier2 portion + 85% of excess over tier2)
 *
 * @param ssBenefit  - Total annual Social Security benefit (gross, before taxation)
 * @param otherIncome - All other income that counts toward AGI (pre-tax withdrawals,
 *                      capital gains, pensions, earned income, etc.) — do NOT include SS here
 * @param filingStatus - "single" or "married"
 * @returns The dollar amount of SS benefits that is taxable as ordinary income
 */
export function calculateSSTaxableAmount(
  ssBenefit: number,
  otherIncome: number,
  filingStatus: FilingStatus
): number {
  if (ssBenefit <= 0) return 0;

  // Combined income = other income + 50% of Social Security
  const combinedIncome = otherIncome + ssBenefit * 0.5;

  const thresholds = SS_TAXATION_THRESHOLDS[filingStatus];

  if (combinedIncome <= thresholds.tier1) {
    // Below tier1: nothing is taxable
    return 0;
  } else if (combinedIncome <= thresholds.tier2) {
    // Between tier1 and tier2: up to 50% of benefits are taxable
    // Taxable amount = lesser of: 50% of SS, or 50% of (combined income - tier1)
    const excess = combinedIncome - thresholds.tier1;
    return Math.min(ssBenefit * 0.5, excess * 0.5);
  } else {
    // Above tier2: up to 85% of benefits are taxable
    // Step 1: 50% of the tier1-to-tier2 band
    const tier1Taxable = (thresholds.tier2 - thresholds.tier1) * 0.5;
    // Step 2: 85% of the excess above tier2
    const tier2Excess = combinedIncome - thresholds.tier2;
    const tier2Taxable = tier2Excess * 0.85;
    // Cap at 85% of total SS benefit
    return Math.min(ssBenefit * 0.85, tier1Taxable + tier2Taxable);
  }
}
