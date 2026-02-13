/**
 * Bond Allocation Utilities
 * Calculate bond percentage based on glide path configuration
 */

import type { BondGlidePath, AllocationStrategy, GlidePathShape } from "@/types/calculator";

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

/**
 * Preset glide path configurations
 */
export const GLIDE_PATH_PRESETS = {
  aggressive: {
    name: "100% Stocks (Aggressive)",
    description: "Maximum growth potential, no bonds",
    strategy: 'aggressive' as AllocationStrategy,
    startAge: 45,
    endAge: 65,
    startPct: 0,
    endPct: 0,
    shape: 'linear' as GlidePathShape,
  },

  ageBased: {
    name: "Age-Based (Conservative)",
    description: "10% bonds (age <40), gradually to 60% (age 60+)",
    strategy: 'ageBased' as AllocationStrategy,
    startAge: 45,
    endAge: 65,
    startPct: 10,
    endPct: 60,
    shape: 'linear' as GlidePathShape,
  },

  moderate: {
    name: "Moderate (20% → 50%)",
    description: "Balanced approach to retirement",
    strategy: 'custom' as AllocationStrategy,
    startAge: 30,
    endAge: 65,
    startPct: 20,
    endPct: 50,
    shape: 'linear' as GlidePathShape,
  },

  conservative: {
    name: "Conservative (30% → 70%)",
    description: "Stability-focused allocation",
    strategy: 'custom' as AllocationStrategy,
    startAge: 30,
    endAge: 65,
    startPct: 30,
    endPct: 70,
    shape: 'linear' as GlidePathShape,
  },

  retirementShift: {
    name: "Retirement Shift (10% → 40%)",
    description: "Rapid transition around retirement",
    strategy: 'custom' as AllocationStrategy,
    startAge: 50,
    endAge: 70,
    startPct: 10,
    endPct: 40,
    shape: 'decelerated' as GlidePathShape,
  },
};
