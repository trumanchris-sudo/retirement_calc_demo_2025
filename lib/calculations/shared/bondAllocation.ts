/**
 * Shared Bond Allocation Calculation Functions
 *
 * Pure bond allocation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { BOND_NOMINAL_AVG, type BondGlidePath } from "./constants";

/**
 * Calculate bond return based on stock return (simplified model)
 * Maintains low correlation with stocks while providing more stable returns
 * @param stockReturnPct - Stock return percentage
 * @returns Bond return percentage
 */
export function calculateBondReturn(stockReturnPct: number): number {
  // Base bond return + correlation factor
  // This approximates the historical relationship between stocks and bonds
  const bondReturn = BOND_NOMINAL_AVG + (stockReturnPct - 9.8) * 0.3;
  return bondReturn;
}

/**
 * Calculate bond allocation percentage for a given age based on glide path configuration
 * @param age - Current age
 * @param glidePath - Bond glide path configuration
 * @returns Bond allocation percentage (0-100)
 */
export function calculateBondAllocation(age: number, glidePath: BondGlidePath | null): number {
  if (!glidePath) return 0;

  // Aggressive strategy: 100% stocks
  if (glidePath.strategy === 'aggressive') {
    return 0;
  }

  // Age-based strategy: Conservative glide path
  // Age < 40: 10% bonds (conservative floor)
  // Age 40-60: Linear increase from 10% to 60%
  // Age > 60: 60% bonds (reasonable cap for retirees)
  if (glidePath.strategy === 'ageBased') {
    if (age < 40) {
      return 10;
    } else if (age <= 60) {
      // Linear interpolation from 10% at age 40 to 60% at age 60
      const progress = (age - 40) / (60 - 40);
      return 10 + (60 - 10) * progress;
    } else {
      return 60;
    }
  }

  // Custom glide path
  const { startAge, endAge, startPct, endPct, shape } = glidePath;

  // Before glide path starts
  if (age < startAge) {
    return startPct;
  }

  // After glide path ends
  if (age >= endAge) {
    return endPct;
  }

  // During transition - calculate progress (0 to 1)
  const progress = (age - startAge) / (endAge - startAge);

  // Apply shape curve
  let adjustedProgress: number;
  switch (shape) {
    case 'linear':
      adjustedProgress = progress;
      break;
    case 'accelerated':
      // Faster early, slower late (square root curve)
      adjustedProgress = Math.sqrt(progress);
      break;
    case 'decelerated':
      // Slower early, faster late (squared curve)
      adjustedProgress = Math.pow(progress, 2);
      break;
    default:
      adjustedProgress = progress;
  }

  // Calculate bond percentage
  const bondPct = startPct + (endPct - startPct) * adjustedProgress;

  return bondPct;
}

/**
 * Calculate blended return based on stock/bond allocation
 * @param stockReturnPct - Stock return percentage
 * @param bondReturnPct - Bond return percentage
 * @param bondAllocationPct - Bond allocation percentage (0-100)
 * @returns Blended return percentage
 */
export function calculateBlendedReturn(
  stockReturnPct: number,
  bondReturnPct: number,
  bondAllocationPct: number
): number {
  const bondPct = bondAllocationPct / 100;
  const stockPct = 1 - bondPct;

  return (stockPct * stockReturnPct) + (bondPct * bondReturnPct);
}
