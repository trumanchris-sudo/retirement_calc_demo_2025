// lib/constants.ts

export const MAX_GENS = 40;
export const YEARS_PER_GEN = 30;
export const LIFE_EXP = 95;
export const CURR_YEAR = new Date().getFullYear();
export const RMD_START_AGE = 73; // 2023 SECURE Act 2.0

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

/** Estate Tax (2025) */
export const ESTATE_TAX_EXEMPTION = {
  single: 13_990_000,   // $13.99M for individual
  married: 27_980_000,  // $27.98M for married couple (double)
};
export const ESTATE_TAX_RATE = 0.40; // 40% on amount over exemption

/** Illustrative 2025 ordinary brackets + standard deductions */
export const TAX_BRACKETS = {
  single: {
    deduction: 15000,
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
    deduction: 30000,
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
 * 1928-2024 (97 years of historical data)
 * Source: S&P 500 Total Return including dividends
 * More data points = more robust Monte Carlo simulations
 */
export const SP500_START_YEAR = 1928;
export const SP500_END_YEAR = 2024;
export const SP500_YOY_NOMINAL: number[] = [
  // 1928-1940 (13 years)
  43.81, -8.30, -25.12, -43.84, -8.64, 49.98, -1.19, 46.74, 31.94, 35.34, -35.34, 29.28, -1.10,
  // 1941-1960 (20 years) - FIXED: Removed 4 duplicate values
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

// Data integrity validation
const EXPECTED_LENGTH = SP500_END_YEAR - SP500_START_YEAR + 1;
if (SP500_YOY_NOMINAL.length !== EXPECTED_LENGTH) {
  throw new Error(
    `SP500 data integrity error: expected ${EXPECTED_LENGTH} years (${SP500_START_YEAR}-${SP500_END_YEAR}), ` +
    `but got ${SP500_YOY_NOMINAL.length} values`
  );
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
