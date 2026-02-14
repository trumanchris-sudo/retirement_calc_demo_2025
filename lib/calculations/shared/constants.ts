/**
 * Shared Constants for Retirement Calculations
 *
 * This module contains pure data constants that can be used by both:
 * - The main application (lib/calculations/retirementEngine.ts)
 * - The Monte Carlo web worker (public/monte-carlo-worker.js via build)
 *
 * IMPORTANT: This file should NOT import from any module that has browser/DOM dependencies.
 * Keep it pure data only for maximum portability.
 */

// ===============================
// Core Simulation Constants
// ===============================

export const LIFE_EXP = 95;
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

// ===============================
// Social Security Constants
// ===============================

/** Social Security Full Retirement Age bend points (2026 values) */
export const SS_BEND_POINTS = {
  first: 1286,  // 90% of AIME up to this
  second: 7749, // 32% of AIME between first and second, 15% above
};

/**
 * Social Security Earnings Test (2026 values)
 *
 * For beneficiaries who claim SS before Full Retirement Age while still working:
 * - Under FRA: Benefits reduced $1 for every $2 earned above the annual exempt amount
 * - In the year reaching FRA: Benefits reduced $1 for every $3 earned above a higher limit
 *   (only earnings before the birthday month count)
 * - After FRA: No reduction — earnings test does not apply
 *
 * These reductions are NOT permanent — SSA recalculates benefits upward at FRA
 * to credit months where benefits were withheld.
 */
export const SS_EARNINGS_TEST_2026 = {
  annualExemptAmount: 23400,    // Under FRA
  fraYearExemptAmount: 62160,   // Year reaching FRA
  reductionRate: 0.5,           // $1 for every $2 over limit
  fraYearReductionRate: 1 / 3,  // $1 for every $3 over limit in FRA year
};

/**
 * Social Security Benefit Taxation Thresholds (IRS)
 *
 * Combined income = AGI + nontaxable interest + 50% of SS benefits
 * These thresholds are NOT inflation-indexed and have been unchanged since 1984/1993.
 *
 * - Combined income <= tier1: 0% of SS benefits taxable
 * - tier1 < combined income <= tier2: up to 50% of SS benefits taxable
 * - Combined income > tier2: up to 85% of SS benefits taxable
 */
export const SS_TAXATION_THRESHOLDS = {
  single: {
    tier1: 25000, // Below this: 0% taxable
    tier2: 34000, // Above this: up to 85% taxable
  },
  married: {
    tier1: 32000, // Below this: 0% taxable
    tier2: 44000, // Above this: up to 85% taxable
  },
};

// ===============================
// Tax Bracket Constants (2026)
// ===============================

/** 2026 ordinary brackets + standard deductions
 * Aligned with lib/constants/tax2026.ts (IRS Revenue Procedure 2025-32)
 * TCJA rates made permanent by OBBBA July 2025 */
export const TAX_BRACKETS = {
  single: {
    deduction: 16100,  // 2026 standard deduction (up from $15,000 in 2025)
    rates: [
      { limit: 12400, rate: 0.1 },
      { limit: 50400, rate: 0.12 },
      { limit: 105700, rate: 0.22 },
      { limit: 201775, rate: 0.24 },
      { limit: 256225, rate: 0.32 },
      { limit: 640600, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
  married: {
    deduction: 32200,  // 2026 standard deduction (up from $30,000 in 2025)
    rates: [
      { limit: 24800, rate: 0.1 },
      { limit: 100800, rate: 0.12 },
      { limit: 211400, rate: 0.22 },
      { limit: 403550, rate: 0.24 },
      { limit: 512450, rate: 0.32 },
      { limit: 768700, rate: 0.35 },
      { limit: Infinity, rate: 0.37 },
    ],
  },
} as const;

/** 2026 LTCG brackets (aligned with lib/constants/tax2026.ts) */
export const LTCG_BRACKETS = {
  single: [
    { limit: 49450, rate: 0.0 },
    { limit: 545500, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
  married: [
    { limit: 98900, rate: 0.0 },
    { limit: 613700, rate: 0.15 },
    { limit: Infinity, rate: 0.20 },
  ],
} as const;

/** NIIT thresholds */
export const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
} as const;

/**
 * IRMAA Brackets for 2026 - Tiered surcharges based on MAGI
 * Medicare Part B has 5 income tiers with increasing monthly surcharges
 * Source: CMS Medicare Part B IRMAA adjustments
 */
export const IRMAA_BRACKETS_2026 = {
  single: [
    { threshold: 109000, surcharge: 0 },       // Standard premium, no surcharge
    { threshold: 137000, surcharge: 81.20 },   // Tier 1: $284.10 total premium
    { threshold: 171000, surcharge: 202.90 },  // Tier 2: $405.80 total premium
    { threshold: 205000, surcharge: 324.60 },  // Tier 3: $527.50 total premium (was 214000)
    { threshold: 500000, surcharge: 446.30 },  // Tier 4: $649.20 total premium
    { threshold: Infinity, surcharge: 487.00 }, // Tier 5: $689.90 total premium (highest)
  ],
  married: [
    { threshold: 218000, surcharge: 0 },       // Standard premium, no surcharge
    { threshold: 274000, surcharge: 81.20 },   // Tier 1: $284.10 total premium
    { threshold: 342000, surcharge: 202.90 },  // Tier 2: $405.80 total premium
    { threshold: 410000, surcharge: 324.60 },  // Tier 3: $527.50 total premium (was 428000)
    { threshold: 750000, surcharge: 446.30 },  // Tier 4: $649.20 total premium
    { threshold: Infinity, surcharge: 487.00 }, // Tier 5: $689.90 total premium (highest)
  ],
} as const;

// ===============================
// Market Data Constants
// ===============================

export const SP500_START_YEAR = 1928;
export const SP500_END_YEAR = 2024;

// Cap for extreme returns - prevents unrealistic long-term compounding
const MAX_RETURN = 15.0;  // Cap gains at 15% (very good year, but realistic)
const MIN_RETURN = -15.0; // Cap losses at -15% (bad year, but not catastrophic)

// Original historical data (97 years) - BEFORE capping
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
// Exported for bear market scenario lookups that need year-indexed access
export const SP500_ORIGINAL: number[] = SP500_ORIGINAL_RAW.map(val =>
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

// ===============================
// Bond Allocation Constants
// ===============================

export const BOND_NOMINAL_AVG = 4.5; // Historical average bond return (%)
export const BOND_REAL_AVG = 2.0; // Historical average real bond return (%)
export const BOND_VOLATILITY = 8.0; // Historical bond volatility (%)
export const STOCK_BOND_CORRELATION = 0.1; // Low positive correlation

// ===============================
// Employment Tax Constants (2026)
// ===============================

export const EMPLOYMENT_TAX_CONSTANTS = {
  SS_WAGE_BASE: 184500,
  SS_RATE_EMPLOYEE: 0.062,
  SS_RATE_SELF_EMPLOYED: 0.124,
  MEDICARE_RATE_EMPLOYEE: 0.0145,
  MEDICARE_RATE_SELF_EMPLOYED: 0.029,
  ADDITIONAL_MEDICARE_THRESHOLD: 200000,
  ADDITIONAL_MEDICARE_RATE: 0.009,
  SELF_EMPLOYMENT_FACTOR: 0.9235, // 92.35% of net self-employment earnings
} as const;

// ===============================
// Child Expense Constants
// ===============================

export const CHILD_EXPENSE_CONSTANTS = {
  childcareAnnual: 15000,
  k12Annual: 3000,
  collegeAnnual: 25000,
  dependentBaseAnnual: 8000,
  childcareEndAge: 6,
  k12EndAge: 18,
  collegeEndAge: 22,
  dependentEndAge: 18,
} as const;

// ===============================
// Pre-Medicare Healthcare Constants
// ===============================

export const PRE_MEDICARE_HEALTHCARE_CONSTANTS = {
  // Base annual costs for individual coverage by age bracket
  individual: {
    under30: 4800,    // ~$400/month - younger workers, lower premiums
    age30to39: 6000,  // ~$500/month - early career
    age40to49: 8400,  // ~$700/month - mid-career, costs rising
    age50to54: 10800, // ~$900/month - approaching peak working years
    age55to59: 13200, // ~$1,100/month - pre-retirement, higher costs
    age60to64: 15600, // ~$1,300/month - highest pre-Medicare costs (3:1 age rating)
  },
  // Family coverage multiplier (spouse adds ~60-70% of individual cost)
  familyMultiplier: 2.5, // Total family cost is ~2.5x individual
  // Additional cost per dependent child
  perChildAdditional: 3000, // ~$250/month per child
  // Medicare eligibility age
  medicareAge: 65,
} as const;

// ===============================
// Type Definitions
// ===============================

export type FilingStatus = "single" | "married";

export interface BondGlidePath {
  strategy: 'aggressive' | 'ageBased' | 'custom';
  startAge: number;
  endAge: number;
  startPct: number;
  endPct: number;
  shape: 'linear' | 'accelerated' | 'decelerated';
}
