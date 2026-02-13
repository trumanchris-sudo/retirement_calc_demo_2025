import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Clamp a number between min and max */
export const clampNum = (v: number, min?: number, max?: number) => {
  let out = v;
  if (min !== undefined && out < min) out = min;
  if (max !== undefined && out > max) out = max;
  return out;
};

/** Convert string to number with fallback */
export const toNumber = (s: string, fallback = 0) => {
  if (s.trim() === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
};

// PERFORMANCE OPTIMIZATION: Pre-create number formatters to avoid GC pressure
const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

const currencyFormatterFull = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** Format number as currency with abbreviations (K, M, B, T) */
export const fmt = (v: number) => {
  if (!Number.isFinite(v)) return "$0";
  const abs = Math.abs(v);
  if (abs >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return currencyFormatter.format(v);
};

/**
 * Format currency with full precision (no abbreviations)
 */
export const fmtFull = (v: number): string => currencyFormatterFull.format(v);

/**
 * Format as percentage
 * @param v - Value as decimal (0.95 = 95%)
 * @param decimals - Number of decimal places (default 1)
 */
export const fmtPercent = (v: number, decimals = 1): string =>
  `${(v * 100).toFixed(decimals)}%`;

/**
 * Format percentage from already-percentage value
 * @param v - Value already as percentage (95 = 95%)
 */
export const fmtPctRaw = (v: number, decimals = 1): string =>
  `${v.toFixed(decimals)}%`;

/** Calculate median from an array of numbers */
export const median = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
};

/** Calculate percentile from an array of numbers
 * PERFORMANCE OPTIMIZED: Uses Float64Array for faster sorting on large arrays
 */
export const percentile = (arr: number[], p: number): number => {
  const len = arr.length;
  if (len === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  // For large arrays, use typed array for faster numeric sorting
  const sorted = len > 100 ? Float64Array.from(arr).sort() : [...arr].sort((a, b) => a - b);

  const index = (p / 100) * (len - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  if (lower === upper) return sorted[lower];
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
};

/** Calculate real return from nominal return and inflation */
export const realReturn = (nominalPct: number, inflPct: number) =>
  (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;

/** Simple seeded PRNG so runs are reproducible */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
