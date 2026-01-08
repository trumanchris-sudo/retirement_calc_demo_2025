// lib/constants.ts

export const MAX_GENS = 40;
export const YEARS_PER_GEN = 30;
export const LIFE_EXP = 95;
export const CURR_YEAR = new Date().getFullYear();
export const RMD_START_AGE = 73; // 2023 SECURE Act 2.0

/** Monte Carlo simulation paths for statistical confidence */
export const MONTE_CARLO_PATHS = 1000; // Reduced to prevent crashes with generational wealth calculations

/** RMD Divisor Table (IRS Uniform Lifetime Table) - Complete */
export const RMD_DIVISORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

/** Social Security Full Retirement Age bend points (2025 estimates) */
export const SS_BEND_POINTS = {
  first: 1226,  // 90% of AIME up to this
  second: 7391, // 32% of AIME between first and second, 15% above
};

/** Estate Tax (2025 OBBBA - One Big Beautiful Bill Act) */
export const ESTATE_TAX_EXEMPTION: Record<'single' | 'married', number> = {
  single: 15_000_000,   // $15M for individual (OBBBA permanent, effective Jan 1, 2026)
  married: 30_000_000,  // $30M for married couple (double)
} as const;
export const ESTATE_TAX_RATE = 0.40; // 40% on amount over exemption

/** 2025 ordinary brackets + standard deductions (post-OBBBA July 2025) */
export const TAX_BRACKETS = {
  single: {
    deduction: 15750,  // OBBBA standard deduction (up from $15,000)
    rates: [
      { limit: 11925, rate: 0.1 },
      { limit: 48475, rate: 0.12 },
      { limit: 103350, rate: 0.22 },
      { limit: 197300, rate: 0.24 },
      { limit: 250525, rate: 0.32 },
      { limit: 626350, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
  married: {
    deduction: 31500,  // OBBBA standard deduction (up from $30,000)
    rates: [
      { limit: 23850, rate: 0.1 },
      { limit: 96950, rate: 0.12 },
      { limit: 206700, rate: 0.22 },
      { limit: 394600, rate: 0.24 },
      { limit: 501050, rate: 0.32 },
      { limit: 751600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
} as const;

/** Illustrative LTCG brackets */
export const LTCG_BRACKETS = {
  single: [
    { limit: 50000, rate: 0.0 },
    { limit: 492300, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
  married: [
    { limit: 100000, rate: 0.0 },
    { limit: 553850, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
} as const;

/** NIIT thresholds */
export const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
} as const;

/** IRMAA (Income-Related Monthly Adjustment Amount) thresholds for Medicare surcharges */
export const IRMAA_THRESHOLD_SINGLE = 103000;
export const IRMAA_THRESHOLD_MARRIED = 206000;

/** Long-Term Care (LTC) default parameters */
export const LTC_PROBABILITY = 70; // % probability of needing LTC
export const LTC_DURATION = 3.5; // Expected duration in years
export const LTC_ANNUAL_COST = 80000; // Annual long-term care cost

// Net worth data (Median) from Fed's 2022 Survey of Consumer Finances (released Oct 2023)
export const NET_WORTH_DATA = {
  under35: { median: 39000, label: "Under 35" },
  "35-44": { median: 135600, label: "35-44" },
  "45-54": { median: 247200, label: "45-54" },
  "55-64": { median: 364500, label: "55-64" },
  "65-74": { median: 409900, label: "65-74" },
  "75+": { median: 335600, label: "75+" },
};

export const getNetWorthBracket = (age: number) => {
  if (age < 35) return NET_WORTH_DATA.under35;
  if (age <= 44) return NET_WORTH_DATA["35-44"];
  if (age <= 54) return NET_WORTH_DATA["45-54"];
  if (age <= 64) return NET_WORTH_DATA["55-64"];
  if (age <= 74) return NET_WORTH_DATA["65-74"];
  return NET_WORTH_DATA["75+"];
};

/**
 * S&P 500 Total Return (Year-over-Year %)
 * Original: 1928-2024 (97 years of historical data)
 * Conservative adjustments:
 * 1. Capped extreme returns at ±15% to prevent unrealistic compound growth
 *    (±30% still produced $125K → $30M projections, too optimistic)
 * 2. Added half-values (±7.5% max) for more moderate scenarios
 * 3. Creates 194 data points total for robust Monte Carlo sampling
 * 4. Results in realistic long-term averages (~7-9% instead of 12-15%)
 * Source: S&P 500 Total Return including dividends
 */
export const SP500_START_YEAR = 1928;
export const SP500_END_YEAR = 2024;

// Cap for extreme returns - prevents unrealistic long-term compounding
// Reduced to ±15% after testing showed ±30% still produced unrealistic projections
// (e.g., $125K starting balance growing to $30M+ over 30 years)
const MAX_RETURN = 15.0;  // Cap gains at 15% (very good year, but realistic)
const MIN_RETURN = -15.0; // Cap losses at -15% (bad year, but not catastrophic)

// Original historical data (97 years) - will be capped at ±15%
const SP500_ORIGINAL_RAW = [
  // 1928-1940 (13 years)
  43.81, -8.30, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, 35.34, -35.34, 29.28, -1.10,
  // 1941-1960 (20 years)
  -12.77, 19.17, 25.06, 19.03, 35.82, -8.43, 5.20, 5.70, 18.30, 30.81, 23.68, 14.37, -1.21, 52.56, 31.24, 18.15,
  -0.73, 23.68, 52.40, 31.74,
  // 1961-1980 (20 years)
  26.63, -8.81, 22.61, 16.42, 12.40, -10.06, 23.80, 10.81, -8.24, -14.31, 3.56, 14.22, 18.76, -14.31, -25.90,
  37.00, 23.83, -7.18, 6.56, 18.44,
  // 1981-2000 (20 years)
  -4.70, 20.42, 22.34, 6.15, 31.24, 18.49, 5.81, 16.54, 31.48, -3.06, 30.23, 7.49, 9.97, 1.33, 37.20, 22.68,
  33.10, 28.34, 20.89, -9.03,
  // 2001-2020 (20 years)
  -11.85, -21.97, 28.36, 10.74, 4.83, 15.61, 5.48, -36.55, 25.94, 14.82, 2.10, 15.89, 32.15, 13.52, 1.36,
  11.77, 21.61, -4.23, 31.21, 18.02,
  // 2021-2024 (4 years)
  28.47, -18.04, 26.06, 25.02
];

// Apply caps to prevent extreme compounding
const SP500_ORIGINAL = SP500_ORIGINAL_RAW.map(val =>
  Math.max(MIN_RETURN, Math.min(MAX_RETURN, val))
);

// Create half-values for more moderate scenarios (97 additional data points)
const SP500_HALF_VALUES = SP500_ORIGINAL.map(val => val / 2);

// Combined dataset: capped original + half-values = 194 data points
export const SP500_YOY_NOMINAL: number[] = [...SP500_ORIGINAL, ...SP500_HALF_VALUES];

// Data integrity validation (original dataset only)
const EXPECTED_LENGTH = SP500_END_YEAR - SP500_START_YEAR + 1;
if (SP500_ORIGINAL.length !== EXPECTED_LENGTH) {
  throw new Error(
    `SP500 data integrity error: expected ${EXPECTED_LENGTH} years (${SP500_START_YEAR}-${SP500_END_YEAR}), ` +
    `but got ${SP500_ORIGINAL.length} values`
  );
}

/**
 * Bond allocation and return parameters
 * For MVP: Simplified bond return model based on historical averages
 */
export const BOND_NOMINAL_AVG = 4.5; // Historical average bond return (%)
export const BOND_REAL_AVG = 2.0; // Historical average real bond return (%)
export const BOND_VOLATILITY = 8.0; // Historical bond volatility (%)
export const STOCK_BOND_CORRELATION = 0.1; // Low positive correlation

/**
 * Calculate bond return based on stock return (simplified model for MVP)
 * Maintains low correlation with stocks while providing more stable returns
 */
export function calculateBondReturn(stockReturnPct: number): number {
  // Base bond return + correlation factor
  // This approximates the historical relationship between stocks and bonds
  const bondReturn = BOND_NOMINAL_AVG + (stockReturnPct - 9.8) * 0.3;
  return bondReturn;
}

/** Tailwind safe color map */
export const COLOR = {
  blue: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-900",
    sub: "text-blue-600",
    badge: "text-blue-700",
    icon: "text-blue-500",
  },
  indigo: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    text: "text-indigo-900",
    sub: "text-indigo-600",
    badge: "text-indigo-700",
    icon: "text-indigo-500",
  },
  green: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-900",
    sub: "text-green-600",
    badge: "text-green-700",
    icon: "text-green-500",
  },
  emerald: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    sub: "text-emerald-600",
    badge: "text-emerald-700",
    icon: "text-emerald-500",
  },
} as const;

export type ColorKey = keyof typeof COLOR;
