/**
 * Shared Utility Functions for Retirement Calculations
 *
 * Pure utility functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

/**
 * Simple seeded PRNG (mulberry32) for reproducible Monte Carlo runs
 * @param seed - Initial seed value
 * @returns Function that returns random numbers between 0 and 1
 */
export function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Calculate percentile from an array of numbers
 * PERFORMANCE OPTIMIZED: Uses Float64Array for faster sorting on large arrays
 * @param arr - Array of numbers
 * @param p - Percentile (0-100)
 * @returns Percentile value
 */
export function percentile(arr: number[], p: number): number {
  const len = arr.length;
  if (len === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  // For small arrays, use regular sort (overhead of Float64Array not worth it)
  if (len < 100) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (len - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  // For larger arrays, use Float64Array for faster numeric sorting
  const sorted = Float64Array.from(arr).sort();
  const index = (p / 100) * (len - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * Trim the top N and bottom N values from an array
 * Returns a new array with extreme values removed
 * @param arr - Input array
 * @param trimCount - Number of values to trim from each end
 * @returns New array with extremes removed
 */
export function trimExtremeValues(arr: number[], trimCount: number): number[] {
  if (arr.length <= trimCount * 2) {
    throw new Error(`Cannot trim ${trimCount * 2} values from array of length ${arr.length}`);
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.slice(trimCount, sorted.length - trimCount);
}

/**
 * Calculate real return from nominal return and inflation
 * @param nominalPct - Nominal return percentage
 * @param inflPct - Inflation percentage
 * @returns Real return as decimal (not percentage)
 */
export function realReturn(nominalPct: number, inflPct: number): number {
  return (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;
}

/**
 * Calculate effective inflation rate for a given year, accounting for inflation shocks.
 * @param yearInSimulation - Year index in the simulation (0 = start of accumulation)
 * @param yrsToRet - Years until retirement
 * @param baseInflation - Base inflation rate (%)
 * @param shockRate - Elevated inflation rate during shock (%)
 * @param shockDuration - Duration of shock in years
 * @returns Effective inflation rate (%) for that year
 */
export function getEffectiveInflation(
  yearInSimulation: number,
  yrsToRet: number,
  baseInflation: number,
  shockRate: number | null | undefined,
  shockDuration: number
): number {
  if (shockRate === null || shockRate === undefined) return baseInflation;

  // Shock starts at retirement year (yrsToRet) and lasts for shockDuration years
  const shockStartYear = yrsToRet;
  const shockEndYear = yrsToRet + shockDuration;

  if (yearInSimulation >= shockStartYear && yearInSimulation < shockEndYear) {
    return shockRate;
  }

  return baseInflation;
}
