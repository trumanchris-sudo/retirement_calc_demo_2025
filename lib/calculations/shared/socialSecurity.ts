/**
 * Shared Social Security Calculation Functions
 *
 * Pure Social Security calculation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { SS_BEND_POINTS } from "./constants";

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
