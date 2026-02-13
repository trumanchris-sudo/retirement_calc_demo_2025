/**
 * National Retirement Savings Benchmark Data
 *
 * Data Source: Federal Reserve Survey of Consumer Finances (SCF) 2022
 * Published: October 2023
 * Inflation Adjustment: Values adjusted to 2026 dollars using ~3% annual inflation
 *
 * The SCF is conducted triennially by the Federal Reserve Board and is the most
 * comprehensive survey of household finances in the United States.
 *
 * Note: "Retirement savings" includes 401(k), IRA, pension accounts, and other
 * designated retirement accounts. It does NOT include taxable brokerage accounts,
 * real estate equity, or Social Security.
 *
 * Citations:
 * - Federal Reserve Board. (2023). "2022 Survey of Consumer Finances."
 *   https://www.federalreserve.gov/econres/scfindex.htm
 * - Board of Governors of the Federal Reserve System. (2023).
 *   "Changes in U.S. Family Finances from 2019 to 2022."
 */

/**
 * Median retirement savings by age (2022 SCF data, inflation-adjusted to 2026)
 *
 * These represent the 50th percentile - half of Americans in each age group
 * have more saved, half have less.
 *
 * Inflation adjustment factor: 1.0927 (3% annual for ~3 years from 2022 to 2026)
 */
export const MEDIAN_SAVINGS_BY_AGE: Record<number, number> = {
  // Young savers (18-29)
  20: 2200,    // Very early career, limited savings
  22: 3500,    // Recent college grad or early workforce
  25: 7500,    // Few years into career

  // Building phase (30-39)
  30: 18000,   // Established career, ramping contributions
  32: 25000,
  35: 38000,   // Peak earning years beginning

  // Accumulation phase (40-49)
  40: 63000,   // Mid-career, often highest earning years
  42: 76000,
  45: 98000,

  // Pre-retirement (50-59)
  50: 134000,  // Catch-up contributions available
  52: 155000,
  55: 180000,

  // Near retirement (60-65)
  60: 200000,  // Final accumulation years
  62: 208000,
  65: 215000,  // Typical retirement age

  // Post-retirement (65+)
  68: 195000,  // Beginning drawdown phase
  70: 175000,
  75: 140000,
};

/**
 * Percentile distributions by age
 *
 * Each age bucket contains percentile cutoffs for retirement savings.
 * For example, if you're 35 and have $100,000 saved, you'd be between
 * the 75th and 90th percentile (better than 75% of peers).
 *
 * Data derived from SCF 2022 with inflation adjustment to 2026.
 */
export interface AgePercentiles {
  p10: number;  // 10th percentile - bottom decile
  p25: number;  // 25th percentile - lower quartile
  p50: number;  // 50th percentile - median
  p75: number;  // 75th percentile - upper quartile
  p90: number;  // 90th percentile - top decile
}

export const SAVINGS_PERCENTILES: Record<number, AgePercentiles> = {
  // 20-24 age bracket
  20: { p10: 0, p25: 0, p50: 2200, p75: 8000, p90: 22000 },
  22: { p10: 0, p25: 0, p50: 3500, p75: 11000, p90: 28000 },
  25: { p10: 0, p25: 1500, p50: 7500, p75: 22000, p90: 55000 },

  // 25-29 -> 30-34 transition
  28: { p10: 0, p25: 3000, p50: 12000, p75: 35000, p90: 85000 },
  30: { p10: 0, p25: 5000, p50: 18000, p75: 50000, p90: 115000 },
  32: { p10: 0, p25: 7000, p50: 25000, p75: 65000, p90: 145000 },
  35: { p10: 1000, p25: 10000, p50: 38000, p75: 95000, p90: 210000 },

  // 35-44 peak accumulation
  38: { p10: 2000, p25: 15000, p50: 50000, p75: 125000, p90: 280000 },
  40: { p10: 3000, p25: 20000, p50: 63000, p75: 155000, p90: 350000 },
  42: { p10: 4000, p25: 25000, p50: 76000, p75: 185000, p90: 420000 },
  45: { p10: 6000, p25: 32000, p50: 98000, p75: 235000, p90: 520000 },

  // 45-54 continued growth
  48: { p10: 8000, p25: 40000, p50: 115000, p75: 285000, p90: 620000 },
  50: { p10: 10000, p25: 48000, p50: 134000, p75: 335000, p90: 730000 },
  52: { p10: 12000, p25: 55000, p50: 155000, p75: 385000, p90: 840000 },
  55: { p10: 15000, p25: 65000, p50: 180000, p75: 450000, p90: 980000 },

  // 55-64 pre-retirement push
  58: { p10: 18000, p25: 72000, p50: 190000, p75: 490000, p90: 1080000 },
  60: { p10: 20000, p25: 78000, p50: 200000, p75: 520000, p90: 1150000 },
  62: { p10: 22000, p25: 82000, p50: 208000, p75: 540000, p90: 1200000 },
  65: { p10: 25000, p25: 85000, p50: 215000, p75: 560000, p90: 1250000 },

  // 65+ retirement phase
  68: { p10: 22000, p25: 75000, p50: 195000, p75: 500000, p90: 1100000 },
  70: { p10: 18000, p25: 65000, p50: 175000, p75: 440000, p90: 950000 },
  75: { p10: 12000, p25: 50000, p50: 140000, p75: 350000, p90: 750000 },
};

/**
 * National savings rate statistics
 *
 * Sources:
 * - Bureau of Economic Analysis (BEA) Personal Savings Rate
 * - Vanguard "How America Saves" 2023 Report
 * - Fidelity Investments Retirement Analysis
 */
export const SAVINGS_RATE_BENCHMARKS = {
  /** National average personal savings rate (BEA, 2023) */
  nationalAverage: 4.7,

  /** Average 401(k) contribution rate (Vanguard, 2023) */
  average401kRate: 7.4,

  /** Recommended savings rate for on-track retirement */
  recommendedRate: 15,

  /** "Super saver" threshold - top tier of savers */
  superSaverRate: 20,

  /** Distribution of savers by contribution rate */
  distribution: {
    /** % saving less than 3% */
    veryLow: 15,
    /** % saving 3-6% */
    low: 25,
    /** % saving 6-10% */
    moderate: 30,
    /** % saving 10-15% */
    good: 20,
    /** % saving 15%+ */
    excellent: 10,
  },
} as const;

/**
 * Retirement readiness statistics
 *
 * These statistics help contextualize user's position relative to
 * broader retirement preparedness in America.
 *
 * Sources:
 * - Federal Reserve Report on Economic Well-Being (2023)
 * - Employee Benefit Research Institute (EBRI) Retirement Confidence Survey
 * - National Institute on Retirement Security (NIRS)
 */
export const RETIREMENT_STATISTICS = {
  /** % of Americans with $0 saved for retirement (Fed, 2023) */
  percentWithZeroSaved: 25,

  /** % of Americans who say they're "on track" (EBRI, 2023) */
  percentFeelOnTrack: 64,

  /** % who have calculated how much they need (EBRI, 2023) */
  percentHaveCalculated: 48,

  /** % of 55-64 year olds with less than $50k saved */
  nearRetireesCriticallyLow: 37,

  /** Median retirement account balance, all households (SCF 2022) */
  overallMedianBalance: 87000,

  /** % of workers participating in employer plan if available */
  participationRateIfAvailable: 83,

  /** Average retirement age (Social Security Administration) */
  averageRetirementAge: 62,

  /** Retirement income replacement rate needed for comfort */
  targetReplacementRate: 80,
} as const;

/**
 * Impact statistics for "The Movement" motivational section
 *
 * These statistics help users understand the collective impact
 * of improved retirement savings behavior.
 */
export const IMPACT_STATISTICS = {
  /**
   * Current elderly poverty rate in the US (Census Bureau, 2023)
   * ~10.9% of adults 65+ live below poverty line
   */
  elderlyPovertyRate: 10.9,

  /**
   * Estimated poverty reduction per point increase in savings rate
   * Based on NIRS analysis of retirement security improvements
   */
  povertyReductionPerSavingsPoint: 0.8,

  /**
   * Median Social Security benefit (SSA, 2024)
   */
  medianSSBenefit: 1907,

  /**
   * % of retirees relying on SS for 50%+ of income
   */
  percentRelyingOnSS: 50,

  /**
   * Total US retirement savings gap (NIRS estimate)
   * In trillions of dollars
   */
  nationalSavingsGapTrillions: 7.1,
} as const;

/**
 * Get percentile data for a given age, interpolating if necessary
 */
export function getPercentilesForAge(age: number): AgePercentiles {
  // Clamp age to valid range
  const clampedAge = Math.max(20, Math.min(75, age));

  // Get available ages sorted
  const availableAges = Object.keys(SAVINGS_PERCENTILES)
    .map(Number)
    .sort((a, b) => a - b);

  // Find exact match
  if (SAVINGS_PERCENTILES[clampedAge]) {
    return SAVINGS_PERCENTILES[clampedAge];
  }

  // Find surrounding ages for interpolation
  let lowerAge = availableAges[0];
  let upperAge = availableAges[availableAges.length - 1];

  for (let i = 0; i < availableAges.length - 1; i++) {
    if (availableAges[i] <= clampedAge && availableAges[i + 1] > clampedAge) {
      lowerAge = availableAges[i];
      upperAge = availableAges[i + 1];
      break;
    }
  }

  // Linear interpolation
  const lowerData = SAVINGS_PERCENTILES[lowerAge];
  const upperData = SAVINGS_PERCENTILES[upperAge];
  const ratio = (clampedAge - lowerAge) / (upperAge - lowerAge);

  return {
    p10: Math.round(lowerData.p10 + (upperData.p10 - lowerData.p10) * ratio),
    p25: Math.round(lowerData.p25 + (upperData.p25 - lowerData.p25) * ratio),
    p50: Math.round(lowerData.p50 + (upperData.p50 - lowerData.p50) * ratio),
    p75: Math.round(lowerData.p75 + (upperData.p75 - lowerData.p75) * ratio),
    p90: Math.round(lowerData.p90 + (upperData.p90 - lowerData.p90) * ratio),
  };
}

/**
 * Get median savings for a given age, interpolating if necessary
 */
export function getMedianForAge(age: number): number {
  const clampedAge = Math.max(20, Math.min(75, age));

  if (MEDIAN_SAVINGS_BY_AGE[clampedAge]) {
    return MEDIAN_SAVINGS_BY_AGE[clampedAge];
  }

  const percentiles = getPercentilesForAge(clampedAge);
  return percentiles.p50;
}
