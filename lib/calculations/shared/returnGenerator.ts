/**
 * Shared Return Generator Functions
 *
 * Pure return generator functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { SP500_YOY_NOMINAL, BOND_NOMINAL_AVG, type BondGlidePath } from "./constants";
import { mulberry32 } from "./utils";
import { calculateBondAllocation, calculateBlendedReturn, calculateBondReturn } from "./bondAllocation";

export type ReturnMode = "fixed" | "walk";
export type WalkSeries = "nominal" | "real";

export interface ReturnGeneratorOptions {
  mode: ReturnMode;
  years: number;
  nominalPct?: number;
  infPct?: number;
  walkSeries?: WalkSeries;
  walkData?: number[];
  seed?: number;
  startYear?: number;
  bondGlidePath?: BondGlidePath | null;
  currentAge?: number;
}

/**
 * Build a generator that yields annual gross return factors.
 * Returns a function that when called returns a generator.
 * Supports fixed, historical sequential, and random bootstrap modes.
 *
 * OPTIMIZATION: Pre-compute bond allocations and inflation factors
 * to avoid repeated calculations inside the generator loops.
 *
 * @param options - Configuration for the return generator
 * @returns Generator function that yields return factors (e.g., 1.10 for 10% return)
 */
export function buildReturnGenerator(options: ReturnGeneratorOptions): () => Generator<number, void, unknown> {
  const {
    mode,
    years,
    nominalPct = 9.8,
    infPct = 2.6,
    walkSeries = "nominal",
    walkData = SP500_YOY_NOMINAL,
    seed = 12345,
    startYear,
    bondGlidePath = null,
    currentAge = 35,
  } = options;

  // Pre-compute inflation rate to avoid division inside loops
  const inflRate = infPct / 100;
  const inflFactor = 1 + inflRate;

  // Pre-compute bond allocations for each year if glide path is configured
  // This hoists the calculation out of the inner loop
  const bondAllocations: number[] | null = bondGlidePath
    ? Array.from({ length: years }, (_, i) => calculateBondAllocation(currentAge + i, bondGlidePath))
    : null;

  if (mode === "fixed") {
    // Pre-compute the fixed bond return
    const bondReturnPct = BOND_NOMINAL_AVG;

    return function* fixedGen() {
      for (let i = 0; i < years; i++) {
        let returnPct = nominalPct;

        // Apply bond blending if glide path is configured (using pre-computed allocations)
        if (bondAllocations) {
          returnPct = calculateBlendedReturn(nominalPct, bondReturnPct, bondAllocations[i]);
        }

        yield 1 + returnPct / 100;
      }
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");

  // Historical sequential playback
  if (startYear !== undefined) {
    const startIndex = startYear - 1928; // SP500_YOY_NOMINAL starts at 1928
    const isRealSeries = walkSeries === "real";
    const dataLength = walkData.length;

    return function* historicalGen() {
      for (let i = 0; i < years; i++) {
        const ix = (startIndex + i) % dataLength; // Wrap around if we exceed data
        const stockPct = walkData[ix];

        // Calculate bond return correlated with stock return
        const bondPct = calculateBondReturn(stockPct);

        // Apply bond blending if glide path is configured (using pre-computed allocations)
        const pct = bondAllocations
          ? calculateBlendedReturn(stockPct, bondPct, bondAllocations[i])
          : stockPct;

        if (isRealSeries) {
          yield (1 + pct / 100) / inflFactor;
        } else {
          yield 1 + pct / 100;
        }
      }
    };
  }

  // Random bootstrap
  const rnd = mulberry32(seed);
  const isRealSeries = walkSeries === "real";
  const dataLength = walkData.length;

  return function* walkGen() {
    for (let i = 0; i < years; i++) {
      const ix = Math.floor(rnd() * dataLength);
      const stockPct = walkData[ix];

      // Calculate bond return correlated with stock return
      const bondPct = calculateBondReturn(stockPct);

      // Apply bond blending if glide path is configured (using pre-computed allocations)
      const pct = bondAllocations
        ? calculateBlendedReturn(stockPct, bondPct, bondAllocations[i])
        : stockPct;

      if (isRealSeries) {
        yield (1 + pct / 100) / inflFactor;
      } else {
        yield 1 + pct / 100;
      }
    }
  };
}
