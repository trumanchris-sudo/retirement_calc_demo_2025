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

  // Age-based strategy: Bond % = Age (capped at 95%)
  if (glidePath.strategy === 'ageBased') {
    return Math.min(age, 95);
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
 * Calculate portfolio volatility based on allocation
 * Uses standard deviation formula for two-asset portfolio
 * @param stockPct - Stock allocation (0-1)
 * @param bondPct - Bond allocation (0-1)
 * @param stockVol - Stock volatility (default 18%)
 * @param bondVol - Bond volatility (default 8%)
 * @param correlation - Stock-bond correlation (default 0.1)
 * @returns Portfolio volatility
 */
export function calculatePortfolioVolatility(
  stockPct: number,
  bondPct: number,
  stockVol: number = 0.18,
  bondVol: number = 0.08,
  correlation: number = 0.1
): number {
  // Portfolio variance formula: σ²p = w1²σ1² + w2²σ2² + 2w1w2σ1σ2ρ
  const variance =
    Math.pow(stockPct * stockVol, 2) +
    Math.pow(bondPct * bondVol, 2) +
    2 * stockPct * bondPct * stockVol * bondVol * correlation;

  return Math.sqrt(variance);
}

/**
 * Generate allocation data points for visualization
 * @param glidePath - Bond glide path configuration
 * @param currentAge - User's current age
 * @param endAge - Planning horizon end age (typically 95)
 * @returns Array of {age, bondPct, stockPct} data points
 */
export function generateAllocationChart(
  glidePath: BondGlidePath | null,
  currentAge: number,
  endAge: number = 95
): Array<{ age: number; bondPct: number; stockPct: number }> {
  if (!glidePath) {
    // Default to 100% stocks
    return Array.from({ length: endAge - currentAge + 1 }, (_, i) => ({
      age: currentAge + i,
      bondPct: 0,
      stockPct: 100,
    }));
  }

  const dataPoints: Array<{ age: number; bondPct: number; stockPct: number }> = [];

  for (let age = currentAge; age <= endAge; age++) {
    const bondPct = calculateBondAllocation(age, glidePath);
    dataPoints.push({
      age,
      bondPct: Math.round(bondPct * 10) / 10, // Round to 1 decimal
      stockPct: Math.round((100 - bondPct) * 10) / 10,
    });
  }

  return dataPoints;
}

/**
 * Preset glide path configurations
 */
export const GLIDE_PATH_PRESETS = {
  aggressive: {
    name: "100% Stocks (Aggressive)",
    description: "Maximum growth potential, no bonds",
    strategy: 'aggressive' as AllocationStrategy,
    startPct: 0,
    endPct: 0,
    shape: 'linear' as GlidePathShape,
  },

  ageBased: {
    name: "Age-Based (Traditional)",
    description: "Bond allocation equals your age",
    strategy: 'ageBased' as AllocationStrategy,
    startPct: 0,
    endPct: 95,
    shape: 'linear' as GlidePathShape,
  },

  moderate: {
    name: "Moderate (20% → 50%)",
    description: "Balanced approach to retirement",
    strategy: 'custom' as AllocationStrategy,
    startPct: 20,
    endPct: 50,
    shape: 'linear' as GlidePathShape,
  },

  conservative: {
    name: "Conservative (30% → 70%)",
    description: "Stability-focused allocation",
    strategy: 'custom' as AllocationStrategy,
    startPct: 30,
    endPct: 70,
    shape: 'linear' as GlidePathShape,
  },

  retirementShift: {
    name: "Retirement Shift (10% → 40%)",
    description: "Rapid transition around retirement",
    strategy: 'custom' as AllocationStrategy,
    startPct: 10,
    endPct: 40,
    shape: 'decelerated' as GlidePathShape,
  },
};
