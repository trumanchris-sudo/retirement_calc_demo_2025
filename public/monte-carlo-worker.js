/**
 * Web Worker for Monte Carlo Retirement Simulation
 * Runs N=2000 simulations off the main thread to prevent UI blocking
 */

// ===============================
// Constants (from lib/constants.ts)
// ===============================

const LIFE_EXP = 95;
const CURR_YEAR = new Date().getFullYear();
const RMD_START_AGE = 73;

const RMD_DIVISORS = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9, 78: 22.0, 79: 21.1, 80: 20.2,
  81: 19.4, 82: 18.5, 83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4, 88: 13.7,
  89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8, 93: 10.1, 94: 9.5, 95: 8.9, 96: 8.4,
  97: 7.8, 98: 7.3, 99: 6.8, 100: 6.4, 101: 6.0, 102: 5.6, 103: 5.2, 104: 4.9,
  105: 4.6, 106: 4.3, 107: 4.1, 108: 3.9, 109: 3.7, 110: 3.5, 111: 3.4, 112: 3.3,
  113: 3.1, 114: 3.0, 115: 2.9, 116: 2.8, 117: 2.7, 118: 2.5, 119: 2.3, 120: 2.0,
};

const SS_BEND_POINTS = {
  first: 1286,
  second: 7749,
};

const TAX_BRACKETS = {
  single: {
    deduction: 16100,  // 2026 standard deduction
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
    deduction: 32200,  // 2026 standard deduction
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
};

const LTCG_BRACKETS = {
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
};

const NIIT_THRESHOLD = {
  single: 200000,
  married: 250000,
};

/**
 * IRMAA Brackets for 2026 - Tiered surcharges based on MAGI
 * Medicare Part B has 5 income tiers with increasing monthly surcharges
 * Source: CMS Medicare Part B IRMAA adjustments
 */
const IRMAA_BRACKETS_2026 = {
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
};

/**
 * S&P 500 Total Return (Year-over-Year %)
 * UPDATED: Synced with lib/constants.ts to ensure consistent Monte Carlo behavior
 *
 * Conservative adjustments for realistic projections:
 * 1. Capped extreme returns at ±15% to prevent unrealistic compound growth
 * 2. Added half-values (±7.5% max) for more moderate scenarios
 * 3. Creates 194 data points total for robust Monte Carlo sampling
 * 4. Results in realistic long-term averages (~7-9% instead of 12-15%)
 *
 * Dataset composition:
 * - First 97 values: 1928-2024 historical returns (capped at ±15%)
 * - Next 97 values: Half-values of the capped returns
 * Source: S&P 500 Total Return including dividends
 */
const SP500_START_YEAR = 1928;
const SP500_END_YEAR = 2024;

// Cap for extreme returns - prevents unrealistic long-term compounding
const MAX_RETURN = 15.0;  // Cap gains at 15%
const MIN_RETURN = -15.0; // Cap losses at -15%

// Original historical data (97 years) - BEFORE capping
const SP500_ORIGINAL_RAW = [
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

// Apply caps to prevent extreme compounding
const SP500_ORIGINAL = SP500_ORIGINAL_RAW.map(val =>
  Math.max(MIN_RETURN, Math.min(MAX_RETURN, val))
);

// Create half-values for more moderate scenarios (97 additional data points)
const SP500_HALF_VALUES = SP500_ORIGINAL.map(val => val / 2);

// Combined dataset: capped original + half-values = 194 data points
const SP500_YOY_NOMINAL = [...SP500_ORIGINAL, ...SP500_HALF_VALUES];

// Data integrity validation (original dataset only)
const EXPECTED_LENGTH = SP500_END_YEAR - SP500_START_YEAR + 1;
if (SP500_ORIGINAL.length !== EXPECTED_LENGTH) {
  throw new Error(
    `SP500 data integrity error: expected ${EXPECTED_LENGTH} years (${SP500_START_YEAR}-${SP500_END_YEAR}), ` +
    `but got ${SP500_ORIGINAL.length} values (before adding half-values)`
  );
}

// ===============================
// Utility Functions (from lib/utils.ts)
// ===============================

/**
 * Extract 3 years of returns starting from a historical year
 * for bear market scenario injection
 */
function getBearReturns(year) {
  const startIndex = year - SP500_START_YEAR;

  if (startIndex < 0 || startIndex + 2 >= SP500_YOY_NOMINAL.length) {
    // Fallback if year is out of range
    return [0, 0, 0];
  }
  return [
    SP500_YOY_NOMINAL[startIndex],
    SP500_YOY_NOMINAL[startIndex + 1],
    SP500_YOY_NOMINAL[startIndex + 2],
  ];
}

/**
 * Calculate effective inflation rate for a given year in the simulation
 * Returns shock rate during shock period, base rate otherwise
 */
function getEffectiveInflation(
  yearInSimulation,
  yrsToRet,
  baseInflation,
  shockRate,
  shockDuration
) {
  if (!shockRate) return baseInflation;

  const shockStartYear = yrsToRet;
  const shockEndYear = yrsToRet + shockDuration;

  if (yearInSimulation >= shockStartYear && yearInSimulation < shockEndYear) {
    return shockRate;
  }

  return baseInflation;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function rand() {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

// PERFORMANCE OPTIMIZATION: Optimized percentile calculation
// Uses partial sort (quickselect) for better performance on large arrays
function percentile(arr, p) {
  const len = arr.length;
  if (len === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');

  // For small arrays, use regular sort (overhead of quickselect not worth it)
  if (len < 100) {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (len - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  // For larger arrays, still use sort but with optimized numeric comparator
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
 */
function trimExtremeValues(arr, trimCount) {
  if (arr.length <= trimCount * 2) {
    throw new Error(`Cannot trim ${trimCount * 2} values from array of length ${arr.length}`);
  }
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted.slice(trimCount, sorted.length - trimCount);
}

// ===============================
// Bond Allocation Functions (from lib/bondAllocation.ts)
// ===============================

const BOND_NOMINAL_AVG = 4.5; // Historical average bond return (%)

/**
 * Calculate bond return based on stock return (simplified model)
 * Maintains low correlation with stocks while providing more stable returns
 */
function calculateBondReturn(stockReturnPct) {
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
function calculateBondAllocation(age, glidePath) {
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
  let adjustedProgress;
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
function calculateBlendedReturn(stockReturnPct, bondReturnPct, bondAllocationPct) {
  const bondPct = bondAllocationPct / 100;
  const stockPct = 1 - bondPct;

  return (stockPct * stockReturnPct) + (bondPct * bondReturnPct);
}

// ===============================
// Return Generator (from app/page.tsx)
// ===============================

function buildReturnGenerator(options) {
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

  if (mode === "fixed") {
    return function* fixedGen() {
      for (let i = 0; i < years; i++) {
        let returnPct = nominalPct;

        // Apply bond blending if glide path is configured
        if (bondGlidePath) {
          const age = currentAge + i;
          const bondAlloc = calculateBondAllocation(age, bondGlidePath);
          const bondReturnPct = BOND_NOMINAL_AVG;
          returnPct = calculateBlendedReturn(nominalPct, bondReturnPct, bondAlloc);
        }

        yield 1 + returnPct / 100;
      }
    };
  }

  if (!walkData.length) throw new Error("walkData is empty");
  const inflRate = infPct / 100;

  // Historical sequential playback
  if (startYear !== undefined) {
    const startIndex = startYear - 1928; // SP500_YOY_NOMINAL starts at 1928
    return function* historicalGen() {
      for (let i = 0; i < years; i++) {
        const ix = (startIndex + i) % walkData.length; // Wrap around if we exceed data
        let stockPct = walkData[ix];

        // Calculate bond return correlated with stock return
        const bondPct = calculateBondReturn(stockPct);

        // Apply bond blending if glide path is configured
        let pct = stockPct;
        if (bondGlidePath) {
          const age = currentAge + i;
          const bondAlloc = calculateBondAllocation(age, bondGlidePath);
          pct = calculateBlendedReturn(stockPct, bondPct, bondAlloc);
        }

        if (walkSeries === "real") {
          const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
          yield 1 + realRate;
        } else {
          yield 1 + pct / 100;
        }
      }
    };
  }

  // Random bootstrap
  const rnd = mulberry32(seed);
  return function* walkGen() {
    for (let i = 0; i < years; i++) {
      const ix = Math.floor(rnd() * walkData.length);
      let stockPct = walkData[ix];

      // Calculate bond return correlated with stock return
      const bondPct = calculateBondReturn(stockPct);

      // Apply bond blending if glide path is configured
      let pct = stockPct;
      if (bondGlidePath) {
        const age = currentAge + i;
        const bondAlloc = calculateBondAllocation(age, bondGlidePath);
        pct = calculateBlendedReturn(stockPct, bondPct, bondAlloc);
      }

      if (walkSeries === "real") {
        const realRate = (1 + pct / 100) / (1 + inflRate) - 1;
        yield 1 + realRate;
      } else {
        yield 1 + pct / 100;
      }
    }
  };
}

// ===============================
// Tax Calculation Helpers (from app/page.tsx)
// ===============================

function calcOrdinaryTax(income, status) {
  if (income <= 0) return 0;
  const { rates, deduction } = TAX_BRACKETS[status];
  let adj = Math.max(0, income - deduction);
  let tax = 0;
  let prev = 0;
  for (const b of rates) {
    const amount = Math.min(adj, b.limit - prev);
    tax += amount * b.rate;
    adj -= amount;
    prev = b.limit;
    if (adj <= 0) break;
  }
  return tax;
}

function calcLTCGTax(capGain, status, ordinaryIncome) {
  if (capGain <= 0) return 0;
  const brackets = LTCG_BRACKETS[status];
  let remainingGain = capGain;
  let tax = 0;

  // Track cumulative income (ordinary + gains processed so far)
  // This is how capital gains "stack" on top of ordinary income
  let cumulativeIncome = ordinaryIncome;

  for (const b of brackets) {
    // How much room is left in this bracket after accounting for cumulative income?
    const bracketRoom = Math.max(0, b.limit - cumulativeIncome);

    // Fill this bracket with as much gain as possible
    const taxedHere = Math.min(remainingGain, bracketRoom);

    if (taxedHere > 0) {
      tax += taxedHere * b.rate;
      remainingGain -= taxedHere;
      cumulativeIncome += taxedHere;  // Update cumulative position
    }

    if (remainingGain <= 0) break;
  }

  // Any remaining gains go at the top rate
  if (remainingGain > 0) {
    const topRate = brackets[brackets.length - 1].rate;
    tax += remainingGain * topRate;
  }
  return tax;
}

function calcNIIT(investmentIncome, status, modifiedAGI) {
  if (investmentIncome <= 0) return 0;
  const threshold = NIIT_THRESHOLD[status];
  const excess = Math.max(0, modifiedAGI - threshold);
  if (excess <= 0) return 0;
  const base = Math.min(investmentIncome, excess);
  return base * 0.038;
}

function calcSocialSecurity(avgAnnualIncome, claimAge, fullRetirementAge = 67) {
  if (avgAnnualIncome <= 0) return 0;

  const aime = avgAnnualIncome / 12;

  let pia = 0;
  if (aime <= SS_BEND_POINTS.first) {
    pia = aime * 0.90;
  } else if (aime <= SS_BEND_POINTS.second) {
    pia = SS_BEND_POINTS.first * 0.90 + (aime - SS_BEND_POINTS.first) * 0.32;
  } else {
    pia = SS_BEND_POINTS.first * 0.90 +
          (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 +
          (aime - SS_BEND_POINTS.second) * 0.15;
  }

  const monthsFromFRA = (claimAge - fullRetirementAge) * 12;
  let adjustmentFactor = 1.0;

  if (monthsFromFRA < 0) {
    const earlyMonths = Math.abs(monthsFromFRA);
    if (earlyMonths <= 36) {
      adjustmentFactor = 1 - (earlyMonths * 5/9 / 100);
    } else {
      adjustmentFactor = 1 - (36 * 5/9 / 100) - ((earlyMonths - 36) * 5/12 / 100);
    }
  } else if (monthsFromFRA > 0) {
    adjustmentFactor = 1 + (monthsFromFRA * 2/3 / 100);
  }

  return pia * adjustmentFactor * 12;
}

/**
 * Calculate Primary Insurance Amount (PIA) for Social Security
 * This is the benefit at Full Retirement Age before any claiming adjustments
 * @param avgAnnualIncome - Average indexed monthly earnings (in annual terms)
 * @returns Monthly PIA
 */
function calcPIA(avgAnnualIncome) {
  if (avgAnnualIncome <= 0) return 0;

  const aime = avgAnnualIncome / 12;

  let pia = 0;
  if (aime <= SS_BEND_POINTS.first) {
    pia = aime * 0.90;
  } else if (aime <= SS_BEND_POINTS.second) {
    pia = SS_BEND_POINTS.first * 0.90 + (aime - SS_BEND_POINTS.first) * 0.32;
  } else {
    pia = SS_BEND_POINTS.first * 0.90 +
          (SS_BEND_POINTS.second - SS_BEND_POINTS.first) * 0.32 +
          (aime - SS_BEND_POINTS.second) * 0.15;
  }

  return pia;
}

/**
 * Adjust own Social Security benefit for claiming age
 * @param monthlyPIA - Monthly Primary Insurance Amount
 * @param claimAge - Age when claiming benefits
 * @param fra - Full Retirement Age (typically 67)
 * @returns Adjusted monthly benefit
 */
function adjustSSForClaimAge(monthlyPIA, claimAge, fra = 67) {
  if (monthlyPIA <= 0) return 0;

  const monthsFromFRA = (claimAge - fra) * 12;
  let adjustmentFactor = 1.0;

  if (monthsFromFRA < 0) {
    const earlyMonths = Math.abs(monthsFromFRA);
    if (earlyMonths <= 36) {
      adjustmentFactor = 1 - (earlyMonths * 5/9 / 100);
    } else {
      adjustmentFactor = 1 - (36 * 5/9 / 100) - ((earlyMonths - 36) * 5/12 / 100);
    }
  } else if (monthsFromFRA > 0) {
    adjustmentFactor = 1 + (monthsFromFRA * 2/3 / 100);
  }

  return monthlyPIA * adjustmentFactor;
}

/**
 * Calculate effective Social Security benefits including spousal benefits
 *
 * SSA Rules for Spousal Benefits:
 * 1. A spouse can receive up to 50% of the other spouse's PIA at Full Retirement Age
 * 2. The spouse receives the HIGHER of: their own benefit OR the spousal benefit (not both)
 * 3. Spousal benefits are reduced if claimed before FRA (different formula than own benefits)
 * 4. Spousal benefits do NOT increase for delayed claiming past FRA
 *
 * @param ownPIA - Person's own Primary Insurance Amount (monthly)
 * @param spousePIA - Spouse's Primary Insurance Amount (monthly)
 * @param ownClaimAge - Age when person claims benefits
 * @param fra - Full Retirement Age (typically 67)
 * @returns Effective monthly benefit (higher of own or spousal)
 */
function calculateEffectiveSS(ownPIA, spousePIA, ownClaimAge, fra = 67) {
  // Calculate own benefit with early/late claiming adjustment
  const ownBenefit = adjustSSForClaimAge(ownPIA, ownClaimAge, fra);

  // Spousal benefit is up to 50% of spouse's PIA (not their adjusted benefit)
  // Reduced if claimed before FRA using spousal-specific reduction formula
  let spousalBenefit = spousePIA * 0.5;

  if (ownClaimAge < fra) {
    // Spousal benefits reduced by 25/36 of 1% per month for first 36 months early
    // Then 5/12 of 1% for additional months
    const monthsEarly = (fra - ownClaimAge) * 12;
    if (monthsEarly <= 36) {
      spousalBenefit *= (1 - monthsEarly * (25/36) / 100);
    } else {
      spousalBenefit *= (1 - 36 * (25/36) / 100 - (monthsEarly - 36) * (5/12) / 100);
    }
  }
  // Note: Spousal benefits do NOT increase for delayed claiming past FRA

  // Return the higher benefit
  return Math.max(ownBenefit, spousalBenefit);
}

function calcRMD(pretaxBalance, age) {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;
  const divisor = RMD_DIVISORS[age] || 2.0;
  return pretaxBalance / divisor;
}

/**
 * Calculate IRMAA (Income-Related Monthly Adjustment Amount) surcharge
 * Based on 2026 tiered brackets - returns monthly surcharge amount
 * @param magi - Modified Adjusted Gross Income
 * @param isMarried - Whether filing status is married
 * @returns Monthly IRMAA surcharge amount
 */
function getIRMAASurcharge(magi, isMarried) {
  const brackets = isMarried ? IRMAA_BRACKETS_2026.married : IRMAA_BRACKETS_2026.single;
  for (const bracket of brackets) {
    if (magi <= bracket.threshold) {
      return bracket.surcharge;
    }
  }
  // Fallback to highest tier (should not reach here due to Infinity threshold)
  return brackets[brackets.length - 1].surcharge;
}

// ===============================
// Pre-Medicare Healthcare Cost Helpers
// ===============================

/**
 * Pre-Medicare Healthcare Cost Constants (in 2024 dollars)
 * For working years before Medicare eligibility at age 65
 * Sources: Kaiser Family Foundation Employer Health Benefits Survey 2024
 */
const PRE_MEDICARE_HEALTHCARE_CONSTANTS = {
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
};

/**
 * Calculate pre-Medicare healthcare costs for a given age
 * @param age - Current age of the individual
 * @returns Annual healthcare cost in base-year dollars
 */
function getPreMedicareHealthcareCost(age) {
  if (age >= PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge) {
    return 0; // Medicare kicks in at 65
  }

  const { individual } = PRE_MEDICARE_HEALTHCARE_CONSTANTS;

  if (age < 30) return individual.under30;
  if (age < 40) return individual.age30to39;
  if (age < 50) return individual.age40to49;
  if (age < 55) return individual.age50to54;
  if (age < 60) return individual.age55to59;
  return individual.age60to64;
}

/**
 * Calculate total pre-Medicare healthcare costs for a household
 * @param age1 - Age of primary person
 * @param age2 - Age of spouse (null if single)
 * @param numChildren - Number of dependent children
 * @param medicalInflationFactor - Cumulative medical inflation factor
 * @returns Total annual healthcare cost in current-year dollars
 */
function calculatePreMedicareHealthcareCosts(age1, age2, numChildren, medicalInflationFactor) {
  let totalCost = 0;

  // Person 1's healthcare cost (if under 65)
  const person1Cost = getPreMedicareHealthcareCost(age1);
  totalCost += person1Cost;

  // Person 2's healthcare cost (if married and under 65)
  if (age2 !== null) {
    const person2Cost = getPreMedicareHealthcareCost(age2);
    totalCost += person2Cost;
  }

  // Add per-child costs for dependent children
  if (numChildren > 0 && (age1 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge ||
      (age2 !== null && age2 < PRE_MEDICARE_HEALTHCARE_CONSTANTS.medicareAge))) {
    totalCost += numChildren * PRE_MEDICARE_HEALTHCARE_CONSTANTS.perChildAdditional;
  }

  // Apply medical inflation
  return totalCost * medicalInflationFactor;
}

// ===============================
// Child Expense & Employment Tax Helpers
// ===============================

/**
 * Child-related expense constants (in 2024 dollars, inflation-adjusted during simulation)
 */
const CHILD_EXPENSE_CONSTANTS = {
  childcareAnnual: 15000,
  k12Annual: 3000,
  collegeAnnual: 25000,
  dependentBaseAnnual: 8000,
  childcareEndAge: 6,
  k12EndAge: 18,
  collegeEndAge: 22,
  dependentEndAge: 18,
};

/**
 * Calculate annual child-related expenses for all children
 */
function calculateChildExpenses(childrenAges, simulationYear, inflationFactor) {
  if (!childrenAges || childrenAges.length === 0) return 0;

  let totalExpenses = 0;

  for (const startAge of childrenAges) {
    const currentAge = startAge + simulationYear;

    if (currentAge >= CHILD_EXPENSE_CONSTANTS.collegeEndAge) continue;

    let childExpense = 0;

    if (currentAge < CHILD_EXPENSE_CONSTANTS.childcareEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.childcareAnnual;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.k12EndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.k12Annual;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.collegeAnnual;
    }

    if (currentAge < CHILD_EXPENSE_CONSTANTS.dependentEndAge) {
      const ageFactor = currentAge < 6 ? 1.0 : currentAge < 13 ? 0.85 : 0.7;
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * ageFactor;
    } else if (currentAge < CHILD_EXPENSE_CONSTANTS.collegeEndAge) {
      childExpense += CHILD_EXPENSE_CONSTANTS.dependentBaseAnnual * 0.5;
    }

    totalExpenses += childExpense;
  }

  return totalExpenses * inflationFactor;
}

/**
 * Calculate self-employment tax for self-employed individuals
 */
function calculateSelfEmploymentTax(netEarnings) {
  if (netEarnings <= 0) return 0;

  // 2026 Social Security wage base
  const SS_WAGE_BASE = 184500;
  const SS_RATE = 0.124;
  const MEDICARE_RATE = 0.029;
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
  const ADDITIONAL_MEDICARE_RATE = 0.009;

  const selfEmploymentEarnings = netEarnings * 0.9235;
  const ssTax = Math.min(selfEmploymentEarnings, SS_WAGE_BASE) * SS_RATE;
  let medicareTax = selfEmploymentEarnings * MEDICARE_RATE;

  if (selfEmploymentEarnings > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (selfEmploymentEarnings - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

/**
 * Calculate payroll taxes for W2 employee
 */
function calculatePayrollTax(wages) {
  if (wages <= 0) return 0;

  // 2026 Social Security wage base
  const SS_WAGE_BASE = 184500;
  const SS_RATE = 0.062;
  const MEDICARE_RATE = 0.0145;
  const ADDITIONAL_MEDICARE_THRESHOLD = 200000;
  const ADDITIONAL_MEDICARE_RATE = 0.009;

  const ssTax = Math.min(wages, SS_WAGE_BASE) * SS_RATE;
  let medicareTax = wages * MEDICARE_RATE;

  if (wages > ADDITIONAL_MEDICARE_THRESHOLD) {
    medicareTax += (wages - ADDITIONAL_MEDICARE_THRESHOLD) * ADDITIONAL_MEDICARE_RATE;
  }

  return ssTax + medicareTax;
}

/**
 * Calculate employment-related taxes based on employment type
 */
function calculateEmploymentTaxes(income, employmentType) {
  if (income <= 0 || employmentType === 'retired' || employmentType === 'other') {
    return 0;
  }

  if (employmentType === 'w2') {
    return calculatePayrollTax(income);
  }

  if (employmentType === 'self-employed') {
    return calculateSelfEmploymentTax(income);
  }

  // 'both' - assume 50/50 split
  const w2Portion = income * 0.5;
  const selfEmployedPortion = income * 0.5;
  return calculatePayrollTax(w2Portion) + calculateSelfEmploymentTax(selfEmployedPortion);
}

// ===============================
// Single Simulation Runner (from app/page.tsx)
// ===============================

function runSingleSimulation(params, seed) {
  const {
    marital, age1, age2, retAge, sTax, sPre, sPost,
    cTax1, cPre1, cPost1, cMatch1, cTax2, cPre2, cPost2, cMatch2,
    retRate, infRate, stateRate, incContrib, incRate, wdRate,
    retMode, walkSeries, includeSS, ssIncome, ssClaimAge, ssIncome2, ssClaimAge2,
    historicalYear,
    inflationShockRate,
    inflationShockDuration = 5,
    dividendYield = 2.0, // Default 2% annual dividend yield for taxable accounts
    enableRothConversions = false,
    targetConversionBracket = 0.24, // Default to 24% bracket
    // Healthcare & Medicare (synced with TypeScript engine defaults)
    includeMedicare = false,
    medicarePremium = 400,
    medicalInflation = 5.0,
    irmaaThresholdSingle = 109000,
    irmaaThresholdMarried = 218000,
    irmaaSurcharge = 230,
    // Long-Term Care (synced with TypeScript engine defaults)
    includeLTC = false,
    ltcAnnualCost = 80000,
    ltcProbability = 50,
    ltcDuration = 2.5,
    ltcOnsetAge = 82,
    // Emergency Fund
    emergencyFund = 0,
    // Children & Family
    numChildren = 0,
    childrenAges = [],
    additionalChildrenExpected = 0,
    // Employment & Income
    annualIncome1 = 0,
    annualIncome2 = 0,
    employmentType1 = 'w2',
    employmentType2 = 'w2',
  } = params;

  const isMar = marital === "married";
  const younger = Math.min(age1, isMar ? age2 : age1);
  const older = Math.max(age1, isMar ? age2 : age1);

  if (retAge <= younger) {
    throw new Error("Retirement age must be greater than current age");
  }

  const yrsToRet = retAge - younger;
  const g_fixed = 1 + retRate / 100;
  const infl = infRate / 100;
  const infl_factor = 1 + infl;

  const yrsToSim = Math.max(0, LIFE_EXP - (older + yrsToRet));

  const accGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToRet + 1,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed,
    startYear: historicalYear, // Pass historicalYear to handle bear market sequences naturally
    bondGlidePath: params.bondGlidePath || null,
    currentAge: younger,
  })();

  const drawGen = buildReturnGenerator({
    mode: retMode,
    years: yrsToSim,
    nominalPct: retRate,
    infPct: infRate,
    walkSeries,
    seed: seed + 1,
    startYear: historicalYear ? historicalYear + yrsToRet : undefined, // Continue from retirement year
    bondGlidePath: params.bondGlidePath || null,
    currentAge: older + yrsToRet,
  })();

  let bTax = sTax;
  let bPre = sPre;
  let bPost = sPost;
  let basisTax = sTax;
  // Emergency fund: grows at inflation rate only (preserves purchasing power, no market risk)
  let bEmergency = emergencyFund;

  // PERFORMANCE OPTIMIZATION: Pre-allocate balance arrays
  const totalYears = yrsToRet + yrsToSim + 1;
  const balancesReal = new Array(totalYears);
  const balancesNominal = new Array(totalYears);
  let balanceIndex = 0;
  let cumulativeInflation = 1.0;
  let c = {
    p: { tax: cTax1, pre: cPre1, post: cPost1, match: cMatch1 },
    s: { tax: cTax2, pre: cPre2, post: cPost2, match: cMatch2 },
  };

  // Accumulation phase
  for (let y = 0; y <= yrsToRet; y++) {
    // Generator handles historical sequences naturally via startYear
    const g = retMode === "fixed" ? g_fixed : accGen.next().value;

    const a1 = age1 + y;
    const a2 = isMar ? age2 + y : null;

    if (y > 0) {
      // Apply growth to all accounts
      bTax *= g;
      bPre *= g;
      bPost *= g;

      // Yield Drag: Tax annual dividends/interest in taxable account
      // Only applies to taxable brokerage account (bTax), not tax-advantaged accounts
      if (bTax > 0 && dividendYield > 0) {
        // Calculate annual yield income (dividends + interest)
        const yieldIncome = bTax * (dividendYield / 100);

        // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
        // Use 0 for ordinary income since this is just the dividend taxation
        const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

        // Reduce taxable balance by the tax paid (yield drag)
        // The yield income itself stays in the balance (already counted in bTax)
        bTax -= yieldTax;
      }
    }

    if (y > 0 && incContrib) {
      const f = 1 + incRate / 100;
      Object.keys(c.p).forEach((k) => (c.p[k] *= f));
      if (isMar)
        Object.keys(c.s).forEach((k) => (c.s[k] *= f));
    }

    const addMidYear = (amt) => amt * (1 + (g - 1) * 0.5);

    if (a1 < retAge) {
      bTax += addMidYear(c.p.tax);
      bPre += addMidYear(c.p.pre + c.p.match);
      bPost += addMidYear(c.p.post);
      basisTax += c.p.tax;
    }
    if (isMar && a2 < retAge) {
      bTax += addMidYear(c.s.tax);
      bPre += addMidYear(c.s.pre + c.s.match);
      bPost += addMidYear(c.s.post);
      basisTax += c.s.tax;
    }

    // Calculate child-related expenses during accumulation phase
    if (childrenAges.length > 0 || numChildren > 0) {
      let effectiveChildrenAges = [...childrenAges];

      // If numChildren specified but no ages, assume evenly spaced starting at age 5
      if (effectiveChildrenAges.length === 0 && numChildren > 0) {
        for (let i = 0; i < numChildren; i++) {
          effectiveChildrenAges.push(5 + i * 3);
        }
      }

      // Add expected future children
      if (additionalChildrenExpected > 0 && y > 0) {
        const yearsToAddChildren = Math.min(additionalChildrenExpected * 2, yrsToRet);
        if (y <= yearsToAddChildren && (y % 2 === 0)) {
          const childIndex = Math.floor(y / 2) - 1;
          if (childIndex < additionalChildrenExpected) {
            effectiveChildrenAges.push(0 - (y - 2));
          }
        }
      }

      const childExpenses = calculateChildExpenses(
        effectiveChildrenAges,
        y,
        Math.pow(infl_factor, y)
      );

      // Child expenses reduce taxable savings
      if (childExpenses > 0 && a1 < retAge) {
        bTax = Math.max(0, bTax - childExpenses);
      }
    }

    // Calculate employment taxes during accumulation phase
    if (a1 < retAge && annualIncome1 > 0) {
      if (employmentType1 === 'self-employed') {
        const empTax1 = calculateEmploymentTaxes(annualIncome1 * Math.pow(1 + incRate / 100, y), employmentType1);
        const extraTax = empTax1 * 0.5;
        bTax = Math.max(0, bTax - extraTax);
      }
    }
    if (isMar && a2 < retAge && annualIncome2 > 0) {
      if (employmentType2 === 'self-employed') {
        const empTax2 = calculateEmploymentTaxes(annualIncome2 * Math.pow(1 + incRate / 100, y), employmentType2);
        const extraTax = empTax2 * 0.5;
        bTax = Math.max(0, bTax - extraTax);
      }
    }

    // Calculate pre-Medicare healthcare costs during accumulation phase
    // These are working-years healthcare expenses (employer premiums, ACA marketplace, etc.)
    // before Medicare eligibility at age 65
    if (a1 < retAge) {
      // Count dependent children for healthcare cost calculation
      let dependentChildCount = 0;
      if (childrenAges.length > 0) {
        // Count children under 26 (ACA allows dependent coverage until 26)
        dependentChildCount = childrenAges.filter(startAge => {
          const childAge = startAge + y;
          return childAge >= 0 && childAge < 26;
        }).length;
      } else if (numChildren > 0) {
        // Estimate based on numChildren - assume they're young
        dependentChildCount = numChildren;
      }

      // Medical inflation compounds faster than general inflation
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);

      const preMedicareHealthcareCost = calculatePreMedicareHealthcareCosts(
        a1,
        isMar ? a2 : null,
        dependentChildCount,
        medInflationFactor
      );

      // Healthcare costs reduce taxable savings (most liquid account)
      // This represents out-of-pocket premiums, deductibles, and other healthcare spending
      if (preMedicareHealthcareCost > 0) {
        bTax = Math.max(0, bTax - preMedicareHealthcareCost);
      }
    }

    // Emergency fund grows at inflation rate only (preserves real value)
    if (y > 0) {
      bEmergency *= infl_factor;
    }

    // Total balance includes emergency fund
    const bal = bTax + bPre + bPost + bEmergency;
    const yearInflation = getEffectiveInflation(y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    // OPTIMIZATION: Use direct index assignment instead of push
    balancesReal[balanceIndex] = bal / cumulativeInflation;
    balancesNominal[balanceIndex] = bal;
    balanceIndex++;
  }

  // Note: Emergency fund is kept separate for withdrawal strategy but included in total wealth
  const finNom = bTax + bPre + bPost + bEmergency;
  const infAdj = Math.pow(1 + infl, yrsToRet);
  const wdGrossY1 = finNom * (wdRate / 100);

  const computeWithdrawalTaxes = (
    gross,
    status,
    taxableBal,
    pretaxBal,
    rothBal,
    taxableBasis,
    statePct,
    minPretaxDraw = 0,
    baseOrdinaryIncome = 0
  ) => {
    const totalBal = taxableBal + pretaxBal + rothBal;
    if (totalBal <= 0 || gross <= 0)
      return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

    // RMD Logic: Force drawP to be at least minPretaxDraw before pro-rata distribution
    let drawP = Math.min(minPretaxDraw, pretaxBal); // Can't withdraw more than available
    let remainingNeed = gross - drawP;

    let drawT = 0;
    let drawR = 0;

    // If there's a remaining need after RMD, distribute it pro-rata
    if (remainingNeed > 0) {
      const availableBal = taxableBal + (pretaxBal - drawP) + rothBal;

      if (availableBal > 0) {
        const shareT = taxableBal / availableBal;
        const shareP = (pretaxBal - drawP) / availableBal;
        const shareR = rothBal / availableBal;

        drawT = remainingNeed * shareT;
        drawP += remainingNeed * shareP;
        drawR = remainingNeed * shareR;
      }
    } else if (remainingNeed < 0) {
      // RMD exceeds gross need - excess will be reinvested in taxable
      // This is handled by allowing drawP to exceed gross
      // The excess will be dealt with in the calling code
    }

    const fixShortfall = (want, have) => Math.min(want, have);

    const usedT = fixShortfall(drawT, taxableBal);
    let shortT = drawT - usedT;

    const usedP = fixShortfall(drawP + shortT, pretaxBal);
    let shortP = drawP + shortT - usedP;

    const usedR = fixShortfall(drawR + shortP, rothBal);

    drawT = usedT;
    drawP = usedP;
    drawR = usedR;

    const unrealizedGain = Math.max(0, taxableBal - taxableBasis);
    const gainRatio = taxableBal > 0 ? unrealizedGain / taxableBal : 0;
    const drawT_Gain = drawT * gainRatio;
    const drawT_Basis = drawT - drawT_Gain;

    const ordinaryIncome = drawP;
    const capGains = drawT_Gain;

    // Calculate federal taxes using marginal bracket approach
    // Add baseOrdinaryIncome (e.g., Social Security) to ensure withdrawal is taxed at marginal rate
    const totalOrdinaryIncome = baseOrdinaryIncome + ordinaryIncome;
    const taxOnTotal = calcOrdinaryTax(totalOrdinaryIncome, status);
    const taxOnBase = calcOrdinaryTax(baseOrdinaryIncome, status);
    const fedOrd = taxOnTotal - taxOnBase; // Tax attributable to withdrawal only

    const fedCap = calcLTCGTax(capGains, status, totalOrdinaryIncome);
    const magi = totalOrdinaryIncome + capGains;
    const niit = calcNIIT(capGains, status, magi);
    const stateTax = (ordinaryIncome + capGains) * (statePct / 100);

    const totalTax = fedOrd + fedCap + niit + stateTax;
    const newBasis = Math.max(0, taxableBasis - drawT_Basis);

    return {
      tax: totalTax,
      ordinary: fedOrd,
      capgain: fedCap,
      niit,
      state: stateTax,
      draw: { t: drawT, p: drawP, r: drawR },
      newBasis,
    };
  };

  const y1 = computeWithdrawalTaxes(
    wdGrossY1,
    marital,
    bTax,
    bPre,
    bPost,
    basisTax,
    stateRate,
    0, // No RMD for first year
    0  // No base ordinary income for first year
  );

  const wdAfterY1 = wdGrossY1 - y1.tax;
  const wdRealY1 = wdAfterY1 / infAdj;

  let retBalTax = bTax;
  let retBalPre = bPre;
  let retBalRoth = bPost;
  let retBalEmergency = bEmergency; // Emergency fund at retirement
  let currBasis = basisTax;
  let currWdGross = wdGrossY1;
  let survYrs = 0;
  let ruined = false;

  // Roth conversion tracking
  let totalRothConversions = 0;
  let conversionTaxesPaid = 0;

  // Drawdown phase
  for (let y = 1; y <= yrsToSim; y++) {
    // Generator handles historical sequences naturally via startYear
    const g_retire = retMode === "fixed" ? g_fixed : drawGen.next().value;

    retBalTax *= g_retire;
    retBalPre *= g_retire;
    retBalRoth *= g_retire;
    // Emergency fund grows at inflation rate only (preserves purchasing power)
    retBalEmergency *= infl_factor;

    // Yield Drag: Tax annual dividends/interest in taxable account
    // Only applies to taxable brokerage account (retBalTax), not tax-advantaged accounts
    if (retBalTax > 0 && dividendYield > 0) {
      // Calculate annual yield income (dividends + interest)
      const yieldIncome = retBalTax * (dividendYield / 100);

      // Tax the yield income at qualified dividend/LTCG rates (assume all dividends are qualified)
      // Use 0 for ordinary income since this is just the dividend taxation
      const yieldTax = calcLTCGTax(yieldIncome, marital, 0);

      // Reduce taxable balance by the tax paid (yield drag)
      // The yield income itself stays in the balance (already counted in retBalTax)
      retBalTax -= yieldTax;
    }

    const currentAge = age1 + yrsToRet + y;
    const currentAge2 = isMar ? age2 + yrsToRet + y : 0;
    const requiredRMD = calcRMD(retBalPre, currentAge);

    let ssAnnualBenefit = 0;
    if (includeSS) {
      if (isMar) {
        // For married couples, calculate spousal benefits
        // Both spouses must have reached their respective claim ages
        const spouse1Eligible = currentAge >= ssClaimAge;
        const spouse2Eligible = currentAge2 >= ssClaimAge2;

        // Calculate PIAs for spousal benefit consideration
        const pia1 = calcPIA(ssIncome);
        const pia2 = calcPIA(ssIncome2);

        if (spouse1Eligible && spouse2Eligible) {
          // Both eligible - calculate with full spousal benefit consideration
          const benefit1 = calculateEffectiveSS(pia1, pia2, ssClaimAge);
          const benefit2 = calculateEffectiveSS(pia2, pia1, ssClaimAge2);
          ssAnnualBenefit = (benefit1 + benefit2) * 12;
        } else if (spouse1Eligible) {
          // Only spouse 1 eligible - use their own benefit (can't claim spousal yet)
          ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
        } else if (spouse2Eligible) {
          // Only spouse 2 eligible - use their own benefit (can't claim spousal yet)
          ssAnnualBenefit = calcSocialSecurity(ssIncome2, ssClaimAge2);
        }
        // If neither eligible, ssAnnualBenefit remains 0
      } else {
        // Single person - use standard calculation
        if (currentAge >= ssClaimAge) {
          ssAnnualBenefit = calcSocialSecurity(ssIncome, ssClaimAge);
        }
      }
    }

    // Roth Conversion Strategy: Convert pre-tax to Roth before RMD age
    if (enableRothConversions && currentAge < RMD_START_AGE && retBalPre > 0 && retBalTax > 0) {
      // Find the bracket threshold for the target bracket rate
      const brackets = TAX_BRACKETS[marital];
      const targetBracket = brackets.rates.find(b => b.rate === targetConversionBracket);

      if (targetBracket) {
        // Calculate taxable ordinary income available before hitting target bracket
        // Current ordinary income = Social Security
        const currentOrdinaryIncome = ssAnnualBenefit;

        // Headroom = (bracket limit) - (standard deduction + current ordinary income)
        // This is how much more ordinary income we can add while staying in the target bracket
        const bracketThreshold = targetBracket.limit + brackets.deduction;
        const headroom = Math.max(0, bracketThreshold - currentOrdinaryIncome);

        if (headroom > 0) {
          // Conversion creates ordinary income, so convert up to headroom
          const maxConversion = Math.min(headroom, retBalPre);

          // Calculate tax on the conversion (it's taxed as ordinary income)
          const conversionTax = calcOrdinaryTax(currentOrdinaryIncome + maxConversion, marital) -
                                calcOrdinaryTax(currentOrdinaryIncome, marital);

          // Can only convert what we can afford to pay tax on from taxable account
          const affordableConversion = conversionTax > 0 ?
            Math.min(maxConversion, retBalTax / conversionTax * maxConversion) :
            maxConversion;

          if (affordableConversion > 0) {
            // Perform the conversion
            const actualConversion = Math.min(affordableConversion, retBalPre);
            const actualTax = calcOrdinaryTax(currentOrdinaryIncome + actualConversion, marital) -
                             calcOrdinaryTax(currentOrdinaryIncome, marital);

            retBalPre -= actualConversion;
            retBalRoth += actualConversion;
            retBalTax -= actualTax;

            totalRothConversions += actualConversion;
            conversionTaxesPaid += actualTax;
          }
        }
      }
    }

    // Calculate healthcare costs
    let healthcareCosts = 0;

    // Medicare premiums (age 65+)
    if (includeMedicare && currentAge >= 65) {
      const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
      healthcareCosts += medicarePremium * 12 * medInflationFactor;

      // IRMAA surcharge based on tiered brackets (2026)
      // Use previous year's income (approximated by withdrawal + SS + RMD)
      const estimatedMAGI = currWdGross + ssAnnualBenefit + requiredRMD;
      const isMarried = marital === "married";
      const monthlyIrmaaSurcharge = getIRMAASurcharge(estimatedMAGI, isMarried);
      healthcareCosts += monthlyIrmaaSurcharge * 12 * medInflationFactor;
    }

    // Long-Term Care costs (probabilistic) - synced with TypeScript engine
    // Use ltcOnsetAge as fixed onset point, apply for ltcDuration years
    if (includeLTC && currentAge >= ltcOnsetAge) {
      // Apply LTC cost with probability factor (expected value approach)
      // LTC typically lasts ltcDuration years starting at onset age
      const yearsIntoLTC = currentAge - ltcOnsetAge;
      if (yearsIntoLTC < ltcDuration) {
        const medInflationFactor = Math.pow(1 + medicalInflation / 100, y);
        // Apply probability-weighted LTC cost
        healthcareCosts += ltcAnnualCost * (ltcProbability / 100) * medInflationFactor;
      }
    }

    // Calculate child expenses during retirement (if children still dependent)
    let childExpensesDuringRetirement = 0;
    if (childrenAges.length > 0 || numChildren > 0) {
      let effectiveChildrenAges = [...childrenAges];
      if (effectiveChildrenAges.length === 0 && numChildren > 0) {
        for (let i = 0; i < numChildren; i++) {
          effectiveChildrenAges.push(5 + i * 3);
        }
      }
      childExpensesDuringRetirement = calculateChildExpenses(
        effectiveChildrenAges,
        yrsToRet + y,
        Math.pow(infl_factor, yrsToRet + y)
      );
    }

    let netSpendingNeed = Math.max(0, currWdGross + healthcareCosts + childExpensesDuringRetirement - ssAnnualBenefit);
    let actualWithdrawal = netSpendingNeed;
    let rmdExcess = 0;

    if (requiredRMD > 0) {
      if (requiredRMD > netSpendingNeed) {
        actualWithdrawal = requiredRMD;
        rmdExcess = requiredRMD - netSpendingNeed;
      }
    }

    const taxes = computeWithdrawalTaxes(
      actualWithdrawal,
      marital,
      retBalTax,
      retBalPre,
      retBalRoth,
      currBasis,
      stateRate,
      requiredRMD,      // Pass RMD as minimum pre-tax draw
      ssAnnualBenefit   // Pass Social Security as base ordinary income
    );

    retBalTax -= taxes.draw.t;
    retBalPre -= taxes.draw.p;
    retBalRoth -= taxes.draw.r;
    currBasis = taxes.newBasis;

    if (rmdExcess > 0) {
      const excessTax = calcOrdinaryTax(rmdExcess, marital);
      const excessAfterTax = rmdExcess - excessTax;
      retBalTax += excessAfterTax;
      currBasis += excessAfterTax;
    }

    if (retBalTax < 0) retBalTax = 0;
    if (retBalPre < 0) retBalPre = 0;
    if (retBalRoth < 0) retBalRoth = 0;

    // Include emergency fund in total wealth
    const totalNow = retBalTax + retBalPre + retBalRoth + retBalEmergency;
    const yearInflation = getEffectiveInflation(yrsToRet + y, yrsToRet, infRate, inflationShockRate, inflationShockDuration);
    cumulativeInflation *= (1 + yearInflation / 100);
    // OPTIMIZATION: Use direct index assignment instead of push
    balancesReal[balanceIndex] = totalNow / cumulativeInflation;
    balancesNominal[balanceIndex] = totalNow;
    balanceIndex++;

    // Check if main portfolio is depleted (emergency fund is a separate safety net)
    const mainPortfolio = retBalTax + retBalPre + retBalRoth;
    if (mainPortfolio <= 0 && retBalEmergency <= 0) {
      if (!ruined) {
        survYrs = y - 1;
        ruined = true;
      }
      retBalTax = retBalPre = retBalRoth = retBalEmergency = 0;
    } else if (mainPortfolio <= 0 && retBalEmergency > 0) {
      // Use emergency fund as fallback when main portfolio is depleted
      const emergencyDraw = Math.min(currWdGross, retBalEmergency);
      retBalEmergency -= emergencyDraw;
      retBalTax = retBalPre = retBalRoth = 0;
      survYrs = y;
    } else {
      survYrs = y;
    }

    currWdGross *= infl_factor;
  }

  const eolWealth = Math.max(0, retBalTax + retBalPre + retBalRoth + retBalEmergency);
  const yearsFrom2025 = yrsToRet + yrsToSim;
  // Use cumulativeInflation to match the balancesReal array deflation (accounts for inflation shocks)
  const eolReal = eolWealth / cumulativeInflation;

  // OPTIMIZATION: Trim arrays to actual length used
  const trimmedBalancesReal = balancesReal.slice(0, balanceIndex);
  const trimmedBalancesNominal = balancesNominal.slice(0, balanceIndex);

  return {
    balancesReal: trimmedBalancesReal,
    balancesNominal: trimmedBalancesNominal,
    eolReal,
    y1AfterTaxReal: wdRealY1,
    ruined,
    survYrs,
    totalRothConversions,
    conversionTaxesPaid,
  };
}

// ===============================
// Monte Carlo Batch Runner
// ===============================

function runMonteCarloSimulation(params, baseSeed, N = 2000) {
  // PERFORMANCE OPTIMIZATION: Pre-allocate results array
  const results = new Array(N);

  // Generate N random seeds from the baseSeed
  // OPTIMIZATION: Use typed array for better memory layout
  const rng = mulberry32(baseSeed);
  const seeds = new Uint32Array(N);
  for (let i = 0; i < N; i++) {
    seeds[i] = (rng() * 1000000) >>> 0;
  }

  // OPTIMIZATION: Reduce progress update frequency from every 50 to every 100
  // This reduces main thread communication overhead by 50%
  const PROGRESS_INTERVAL = 100;

  // Run all N simulations
  for (let i = 0; i < N; i++) {
    results[i] = runSingleSimulation(params, seeds[i]);

    // Send progress updates every PROGRESS_INTERVAL simulations
    if ((i + 1) % PROGRESS_INTERVAL === 0 || i === N - 1) {
      self.postMessage({
        type: 'progress',
        completed: i + 1,
        total: N,
      });
    }
  }

  // Calculate percentiles after trimming extreme values
  // Trim 5% from each end, but ensure we have enough data points
  // Minimum: keep at least 50% of data (trim max 25% from each end)
  const trimPercent = Math.min(0.025, 0.25 * N / (2 * N)); // 2.5% from each end, or less if N is small
  const TRIM_COUNT = Math.floor(N * trimPercent);
  const T = results[0].balancesReal.length;

  // PERFORMANCE OPTIMIZATION: Pre-allocate arrays with known size
  const p10BalancesReal = new Array(T);
  const p25BalancesReal = new Array(T);
  const p50BalancesReal = new Array(T);
  const p75BalancesReal = new Array(T);
  const p90BalancesReal = new Array(T);
  const p10BalancesNominal = new Array(T);
  const p25BalancesNominal = new Array(T);
  const p50BalancesNominal = new Array(T);
  const p75BalancesNominal = new Array(T);
  const p90BalancesNominal = new Array(T);

  // OPTIMIZATION: Reuse arrays for column extraction to reduce GC pressure
  const colReal = new Array(N);
  const colNominal = new Array(N);

  for (let t = 0; t < T; t++) {
    // Extract column values without creating new arrays
    for (let i = 0; i < N; i++) {
      colReal[i] = results[i].balancesReal[t];
    }
    const trimmedReal = trimExtremeValues(colReal, TRIM_COUNT);
    // OPTIMIZATION: Use direct assignment instead of push()
    p10BalancesReal[t] = percentile(trimmedReal, 10);
    p25BalancesReal[t] = percentile(trimmedReal, 25);
    p50BalancesReal[t] = percentile(trimmedReal, 50);
    p75BalancesReal[t] = percentile(trimmedReal, 75);
    p90BalancesReal[t] = percentile(trimmedReal, 90);

    // Extract nominal column values
    for (let i = 0; i < N; i++) {
      colNominal[i] = results[i].balancesNominal[t];
    }
    const trimmedNominal = trimExtremeValues(colNominal, TRIM_COUNT);
    p10BalancesNominal[t] = percentile(trimmedNominal, 10);
    p25BalancesNominal[t] = percentile(trimmedNominal, 25);
    p50BalancesNominal[t] = percentile(trimmedNominal, 50);
    p75BalancesNominal[t] = percentile(trimmedNominal, 75);
    p90BalancesNominal[t] = percentile(trimmedNominal, 90);
  }

  const eolValues = results.map(r => r.eolReal);
  const trimmedEol = trimExtremeValues(eolValues, TRIM_COUNT);
  const eolReal_p25 = percentile(trimmedEol, 25);
  const eolReal_p50 = percentile(trimmedEol, 50);
  const eolReal_p75 = percentile(trimmedEol, 75);

  const y1Values = results.map(r => r.y1AfterTaxReal);
  const trimmedY1 = trimExtremeValues(y1Values, TRIM_COUNT);
  const y1AfterTaxReal_p25 = percentile(trimmedY1, 25);
  const y1AfterTaxReal_p50 = percentile(trimmedY1, 50);
  const y1AfterTaxReal_p75 = percentile(trimmedY1, 75);

  const probRuin = results.filter(r => r.ruined).length / N;

  // For legacy success rate calculation, return lightweight version of all runs
  // (just eolReal, ruined status, and survYrs for sequence of returns analysis)
  const allRunsLightweight = results.map(r => ({
    eolReal: r.eolReal,
    y1AfterTaxReal: r.y1AfterTaxReal,
    ruined: r.ruined,
    survYrs: r.survYrs  // Year when portfolio failed (0 if never failed)
  }));

  return {
    p10BalancesReal,
    p25BalancesReal,
    p50BalancesReal,
    p75BalancesReal,
    p90BalancesReal,
    p10BalancesNominal,
    p25BalancesNominal,
    p50BalancesNominal,
    p75BalancesNominal,
    p90BalancesNominal,
    eolReal_p25,
    eolReal_p50,
    eolReal_p75,
    y1AfterTaxReal_p25,
    y1AfterTaxReal_p50,
    y1AfterTaxReal_p75,
    probRuin,
    allRuns: allRunsLightweight, // Return lightweight version for empirical success rate calculation
  };
}

// ===============================
// Legacy Simulation Functions
// ===============================

/**
 * Calculate real return rate from nominal and inflation
 */
function realReturn(nominalPct, inflPct) {
  return (1 + nominalPct / 100) / (1 + inflPct / 100) - 1;
}

/**
 * Cohort type (JSDoc):
 * @typedef {Object} Cohort
 * @property {number} size - Number of beneficiaries in this cohort
 * @property {number} age - Current age of this cohort
 * @property {boolean} canReproduce - Whether this cohort can reproduce
 * @property {number} cumulativeBirths - Cumulative births per member so far
 */

/**
 * Simulate N years of generational wealth with demographic changes
 * Used internally by the optimized simulation for chunked processing
 */
function simulateYearsChunk(
  cohorts,
  fundReal,
  realReturnRate,
  perBenReal,
  deathAge,
  minDistAge,
  totalFertilityRate,
  fertilityWindowStart,
  fertilityWindowEnd,
  birthsPerYear,
  numYears
) {
  let currentFund = fundReal;
  let currentCohorts = cohorts;
  let yearsSimulated = 0;

  for (let i = 0; i < numYears; i++) {
    // Filter out deceased
    currentCohorts = currentCohorts.filter((c) => c.age < deathAge);

    const living = currentCohorts.reduce((acc, c) => acc + c.size, 0);
    if (living === 0) {
      return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: true };
    }

    // Apply growth
    currentFund *= 1 + realReturnRate;

    // Calculate and subtract payout
    const eligible = currentCohorts
      .filter(c => c.age >= minDistAge)
      .reduce((acc, c) => acc + c.size, 0);
    const payout = perBenReal * eligible;
    currentFund -= payout;

    if (currentFund < 0) {
      return { cohorts: currentCohorts, fundReal: 0, years: yearsSimulated, depleted: true };
    }

    yearsSimulated += 1;

    // Age all cohorts
    currentCohorts.forEach((c) => (c.age += 1));

    // Handle reproduction
    currentCohorts.forEach((cohort) => {
      if (cohort.canReproduce &&
          cohort.age >= fertilityWindowStart &&
          cohort.age <= fertilityWindowEnd &&
          cohort.cumulativeBirths < totalFertilityRate) {

        const remainingFertility = totalFertilityRate - cohort.cumulativeBirths;
        const birthsThisYear = Math.min(birthsPerYear, remainingFertility);
        const births = cohort.size * birthsThisYear;

        if (births > 0) {
          currentCohorts.push({ size: births, age: 0, canReproduce: true, cumulativeBirths: 0 });
        }

        cohort.cumulativeBirths += birthsThisYear;
      }
    });
  }

  return { cohorts: currentCohorts, fundReal: currentFund, years: yearsSimulated, depleted: false };
}

/**
 * Check if portfolio is mathematically guaranteed to be perpetual
 * Uses perpetual threshold formula: Sustainable Rate = Real Return - Population Growth Rate
 */
function checkPerpetualViability(
  realReturnRate,
  totalFertilityRate,
  generationLength,
  perBenReal,
  initialFundReal,
  startBens
) {
  const populationGrowthRate = (totalFertilityRate - 2.0) / generationLength;
  const perpetualThreshold = realReturnRate - populationGrowthRate;
  const annualDistribution = perBenReal * startBens;
  const distributionRate = annualDistribution / initialFundReal;
  const safeThreshold = perpetualThreshold * 0.95;

  return distributionRate < safeThreshold;
}

/**
 * Simulate constant real-dollar payout per beneficiary with births/deaths
 * Up to 10,000 years of dynasty trust simulation
 */
function simulateRealPerBeneficiaryPayout(
  eolNominal,
  yearsFrom2025,
  nominalRet,
  inflPct,
  perBenReal,
  startBens,
  totalFertilityRate,
  generationLength,
  deathAge,
  minDistAge,
  capYears,
  initialBenAges,
  fertilityWindowStart,
  fertilityWindowEnd
) {
  let fundReal = eolNominal / Math.pow(1 + inflPct / 100, yearsFrom2025);
  const r = realReturn(nominalRet, inflPct);

  const fertilityWindowYears = fertilityWindowEnd - fertilityWindowStart;
  const birthsPerYear = fertilityWindowYears > 0 ? totalFertilityRate / fertilityWindowYears : 0;

  // Initialize cohorts with canReproduce based on maximum age only
  // A young beneficiary (e.g., age 5) should have canReproduce: true
  // so they can start reproducing when they age into the fertility window later
  let cohorts = initialBenAges.length > 0
    ? initialBenAges.map(age => ({
        size: 1,
        age,
        canReproduce: age <= fertilityWindowEnd,
        cumulativeBirths: 0
      }))
    : startBens > 0
    ? [{ size: startBens, age: 0, canReproduce: true, cumulativeBirths: 0 }]
    : [];

  // OPTIMIZATION 1: Early-exit for perpetual portfolios
  const isPerpetual = checkPerpetualViability(
    r,
    totalFertilityRate,
    generationLength,
    perBenReal,
    fundReal,
    startBens
  );

  if (isPerpetual && capYears >= 10000) {
    return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: startBens, generationData: [] };
  }

  let years = 0;
  const CHUNK_SIZE = 10;
  const EARLY_TERM_CHECK = 1000;

  let fundAtYear100 = 0;
  let fundAtYear1000 = 0;

  // Track generation-by-generation data for Dynasty Timeline
  const generationData = [];
  let nextGenerationCheckpoint = generationLength;
  let generationNumber = 1;

  // OPTIMIZATION 2: Chunked simulation
  for (let t = 0; t < capYears; t += CHUNK_SIZE) {
    const yearsToSimulate = Math.min(CHUNK_SIZE, capYears - t);

    const result = simulateYearsChunk(
      cohorts,
      fundReal,
      r,
      perBenReal,
      deathAge,
      minDistAge,
      totalFertilityRate,
      fertilityWindowStart,
      fertilityWindowEnd,
      birthsPerYear,
      yearsToSimulate
    );

    cohorts = result.cohorts;
    fundReal = result.fundReal;
    years += result.years;

    if (result.depleted) {
      const living = cohorts.reduce((acc, c) => acc + c.size, 0);
      return { years, fundLeftReal: 0, lastLivingCount: living, generationData };
    }

    // Track generation boundaries (every generationLength years)
    if (t >= nextGenerationCheckpoint && generationData.length < 10) {
      const estateValueNominal = fundReal * Math.pow(1 + inflPct / 100, yearsFrom2025 + t);

      // Calculate estate tax using 2026 exemptions (adjust this as needed)
      // For simplicity, using single filer exemption of $13.61M (2024 baseline)
      const exemption = 13610000;
      const taxableEstate = Math.max(0, estateValueNominal - exemption);
      const estateTax = taxableEstate * 0.40; // 40% federal estate tax rate
      const netToHeirs = estateValueNominal - estateTax;

      generationData.push({
        generation: generationNumber,
        year: t,
        estateValue: estateValueNominal,
        estateTax: estateTax,
        netToHeirs: netToHeirs,
        fundRealValue: fundReal,
        livingBeneficiaries: cohorts.reduce((acc, c) => acc + c.size, 0)
      });

      nextGenerationCheckpoint += generationLength;
      generationNumber++;
    }

    if (t === 100 && fundAtYear100 === 0) {
      fundAtYear100 = fundReal;
    }
    if (t === EARLY_TERM_CHECK && fundAtYear1000 === 0) {
      fundAtYear1000 = fundReal;
    }

    // OPTIMIZATION 3: Early termination for clearly perpetual portfolios
    if (t >= EARLY_TERM_CHECK && capYears >= 10000) {
      if (fundAtYear100 > 0 && fundReal > fundAtYear1000) {
        const growthRate = Math.pow(fundReal / fundAtYear1000, 1 / (t - EARLY_TERM_CHECK)) - 1;

        if (growthRate > 0.03) {
          const living = cohorts.reduce((acc, c) => acc + c.size, 0);
          return { years: Infinity, fundLeftReal: fundReal, lastLivingCount: living, generationData };
        }
      }
    }
  }

  const lastLiving = cohorts.reduce((acc, c) => acc + c.size, 0);
  return { years, fundLeftReal: fundReal, lastLivingCount: lastLiving, generationData };
}

// ===============================
// Worker Message Handler
// ===============================

self.onmessage = function(e) {
  const { type, params, baseSeed, N, requestId } = e.data;

  if (type === 'run') {
    try {
      const result = runMonteCarloSimulation(params, baseSeed, N);
      self.postMessage({
        type: 'complete',
        result,
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'legacy') {
    try {
      const {
        eolNominal,
        yearsFrom2025,
        nominalRet,
        inflPct,
        perBenReal,
        startBens,
        totalFertilityRate,
        generationLength = 30,
        deathAge = 90,
        minDistAge = 21,
        capYears = 10000,
        initialBenAges = [0],
        fertilityWindowStart = 25,
        fertilityWindowEnd = 35
      } = params;

      const result = simulateRealPerBeneficiaryPayout(
        eolNominal,
        yearsFrom2025,
        nominalRet,
        inflPct,
        perBenReal,
        startBens,
        totalFertilityRate,
        generationLength,
        deathAge,
        minDistAge,
        capYears,
        initialBenAges,
        fertilityWindowStart,
        fertilityWindowEnd
      );

      self.postMessage({
        type: 'legacy-complete',
        result,
        requestId, // Echo back requestId
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
        requestId, // Echo back requestId
      });
    }
  } else if (type === 'guardrails') {
    // Calculate guardrails impact based on failure timing analysis
    // Research shows: Early failures (years 1-10) are 70-80% preventable with guardrails
    // Mid-retirement failures (11-20) are 40-50% preventable
    // Late failures (21+) are only 10-20% preventable
    try {
      const {
        allRuns,
        spendingReduction = 0.10,  // 10% spending reduction parameter
      } = params;

      const failedPaths = allRuns.filter(r => r.ruined);

      if (failedPaths.length === 0) {
        self.postMessage({
          type: 'guardrails-complete',
          result: {
            totalFailures: 0,
            preventableFailures: 0,
            newSuccessRate: 1.0,
            baselineSuccessRate: 1.0,
            improvement: 0,
          },
        });
        return;
      }

      // Calculate preventable failures based on timing
      // Effectiveness decreases with later failures
      let preventableFailures = 0;

      failedPaths.forEach(path => {
        const year = path.survYrs;
        let preventionRate = 0;

        if (year <= 5) {
          // Very early failures: 75% preventable with guardrails
          preventionRate = 0.75;
        } else if (year <= 10) {
          // Early failures: 65% preventable
          preventionRate = 0.65;
        } else if (year <= 15) {
          // Mid-early failures: 45% preventable
          preventionRate = 0.45;
        } else if (year <= 20) {
          // Mid failures: 30% preventable
          preventionRate = 0.30;
        } else if (year <= 25) {
          // Mid-late failures: 15% preventable
          preventionRate = 0.15;
        } else {
          // Late failures: 5% preventable (usually structural issues)
          preventionRate = 0.05;
        }

        // Scale prevention rate by spending reduction amount
        // 10% reduction = full effectiveness, 5% = half effectiveness
        const effectivenessScale = Math.min(1.0, spendingReduction / 0.10);
        preventableFailures += preventionRate * effectivenessScale;
      });

      const totalPaths = allRuns.length;
      const baselineSuccessRate = (totalPaths - failedPaths.length) / totalPaths;
      const newSuccesses = totalPaths - failedPaths.length + preventableFailures;
      const newSuccessRate = newSuccesses / totalPaths;
      const improvement = newSuccessRate - baselineSuccessRate;

      self.postMessage({
        type: 'guardrails-complete',
        result: {
          totalFailures: failedPaths.length,
          preventableFailures: Math.round(preventableFailures),
          newSuccessRate,
          baselineSuccessRate,
          improvement,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'roth-optimizer') {
    // Calculate optimal Roth conversion strategy
    // Strategy: Convert pre-tax to Roth before RMDs start (age 73)
    // Fill up lower tax brackets (22% or 24%) to minimize lifetime taxes
    try {
      const {
        retAge,
        pretaxBalance,
        marital,
        ssIncome = 0,
        annualWithdrawal = 0,
        targetBracket = 0.24,  // Default: fill 24% bracket
        growthRate = 0.07,  // 7% annual growth assumption
      } = params;

      if (!pretaxBalance || pretaxBalance <= 0) {
        self.postMessage({
          type: 'roth-optimizer-complete',
          result: {
            hasRecommendation: false,
            reason: 'No pre-tax balance to convert',
          },
        });
        return;
      }

      // Age 73 is when RMDs start
      const conversionYears = Math.max(0, RMD_START_AGE - retAge);

      if (conversionYears <= 0) {
        self.postMessage({
          type: 'roth-optimizer-complete',
          result: {
            hasRecommendation: false,
            reason: 'Already at or past RMD age',
          },
        });
        return;
      }

      const status = marital === 'married' ? 'married' : 'single';
      const brackets = TAX_BRACKETS[status];
      const deduction = brackets.deduction;

      // Find target bracket limit
      let targetBracketLimit = 0;
      for (const b of brackets.rates) {
        if (b.rate === targetBracket) {
          targetBracketLimit = b.limit;
          break;
        }
      }

      if (targetBracketLimit === 0) {
        // Default to 24% bracket if not found
        targetBracketLimit = marital === 'married' ? 394600 : 197300;
      }

      // ===== BASELINE SCENARIO: No Conversions =====
      let baselinePretax = pretaxBalance;
      let baselineLifetimeTax = 0;
      const baselineRMDs = [];

      for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
        const rmd = calcRMD(baselinePretax, age);
        const totalIncome = rmd + ssIncome;
        const tax = calcOrdinaryTax(totalIncome, status);

        baselineRMDs.push({ age, rmd, tax });
        baselineLifetimeTax += tax;

        // Grow remaining balance
        baselinePretax = (baselinePretax - rmd) * (1 + growthRate);
      }

      // ===== OPTIMIZED SCENARIO: Strategic Conversions =====
      let optimizedPretax = pretaxBalance;
      let optimizedLifetimeTax = 0;
      const conversions = [];

      // Phase 1: Conversions (retirement to age 72)
      for (let age = retAge; age < RMD_START_AGE; age++) {
        // Calculate baseline income (SS + withdrawals)
        const baseIncome = ssIncome + annualWithdrawal;

        // Calculate taxable income before deduction
        const taxableBeforeConversion = Math.max(0, baseIncome - deduction);

        // Calculate "room" in target bracket
        const roomInBracket = Math.max(0, targetBracketLimit - taxableBeforeConversion);

        // Convert up to the available room, but don't exceed pre-tax balance
        const conversionAmount = Math.min(roomInBracket, optimizedPretax);

        if (conversionAmount > 5000) {  // Only convert if meaningful ($5k+ threshold)
          const totalIncome = baseIncome + conversionAmount;
          const tax = calcOrdinaryTax(totalIncome, status);

          conversions.push({
            age,
            conversionAmount,
            tax,
            pretaxBalanceBefore: optimizedPretax,
          });

          optimizedLifetimeTax += tax;
          optimizedPretax -= conversionAmount;
        }

        // Grow remaining balance
        optimizedPretax *= (1 + growthRate);
      }

      // Phase 2: RMDs on reduced balance (age 73 to 95)
      const optimizedRMDs = [];
      for (let age = RMD_START_AGE; age <= LIFE_EXP; age++) {
        const rmd = calcRMD(optimizedPretax, age);
        const totalIncome = rmd + ssIncome;
        const tax = calcOrdinaryTax(totalIncome, status);

        optimizedRMDs.push({ age, rmd, tax });
        optimizedLifetimeTax += tax;

        // Grow remaining balance
        optimizedPretax = (optimizedPretax - rmd) * (1 + growthRate);
      }

      // ===== CALCULATE METRICS =====
      const lifetimeTaxSavings = baselineLifetimeTax - optimizedLifetimeTax;
      const totalConverted = conversions.reduce((sum, c) => sum + c.conversionAmount, 0);
      const avgAnnualConversion = totalConverted / conversions.length;

      // Calculate RMD reduction
      const baselineTotalRMDs = baselineRMDs.reduce((sum, r) => sum + r.rmd, 0);
      const optimizedTotalRMDs = optimizedRMDs.reduce((sum, r) => sum + r.rmd, 0);
      const rmdReduction = baselineTotalRMDs - optimizedTotalRMDs;
      const rmdReductionPercent = (rmdReduction / baselineTotalRMDs) * 100;

      // Calculate effective tax rate improvement
      const baselineAvgRate = baselineLifetimeTax / baselineTotalRMDs;
      const optimizedAvgRate = optimizedLifetimeTax / (optimizedTotalRMDs + totalConverted);
      const effectiveRateImprovement = (baselineAvgRate - optimizedAvgRate) * 100;

      self.postMessage({
        type: 'roth-optimizer-complete',
        result: {
          hasRecommendation: conversions.length > 0 && lifetimeTaxSavings > 0,
          conversions,
          conversionWindow: {
            startAge: retAge,
            endAge: RMD_START_AGE - 1,
            years: conversionYears,
          },
          totalConverted,
          avgAnnualConversion,
          lifetimeTaxSavings,
          baselineLifetimeTax,
          optimizedLifetimeTax,
          rmdReduction,
          rmdReductionPercent,
          effectiveRateImprovement,
          baselineRMDs: baselineRMDs.slice(0, 10),  // First 10 years for display
          optimizedRMDs: optimizedRMDs.slice(0, 10),
          targetBracket,
          targetBracketLimit,
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  } else if (type === 'optimize') {
    // Optimization Engine: Goal Seeking Calculations
    // Performs three optimizations: oversaving, splurge capacity, and freedom date
    try {
      const { params: baseParams, baseSeed } = e.data;
      const SUCCESS_THRESHOLD = 0.95; // 95% success rate required
      const TEST_RUNS = 400; // Monte Carlo runs for optimization tests
      const SAFETY_MAX_ITERATIONS = 50; // Safety brake: prevent infinite loops

      // Helper: Check if a configuration meets success criteria
      const testSuccess = (testParams) => {
        const result = runMonteCarloSimulation(testParams, baseSeed, TEST_RUNS);
        // Success if probability of ruin < 5% (success rate > 95%)
        return result.probRuin < (1 - SUCCESS_THRESHOLD);
      };

      // ===== 1. CALCULATE OVERSAVING (Monthly Surplus) =====
      // Find minimum contribution needed to maintain >95% success rate
      let surplusAnnual = 0;
      const currentTotalContrib = baseParams.cTax1 + baseParams.cPre1 + baseParams.cPost1 +
                                   baseParams.cTax2 + baseParams.cPre2 + baseParams.cPost2 +
                                   baseParams.cMatch1 + baseParams.cMatch2;

      if (currentTotalContrib > 0) {
        let low = 0;
        let high = currentTotalContrib;
        let minContrib = currentTotalContrib;
        let iterations = 0;

        // Binary search for minimum contribution with safety brake
        while (low < high && iterations < SAFETY_MAX_ITERATIONS) {
          iterations++;
          const mid = low + (high - low) / 2;
          const scaleFactor = mid / currentTotalContrib;

          const testParams = {
            ...baseParams,
            cTax1: baseParams.cTax1 * scaleFactor,
            cPre1: baseParams.cPre1 * scaleFactor,
            cPost1: baseParams.cPost1 * scaleFactor,
            cMatch1: baseParams.cMatch1 * scaleFactor,
            cTax2: baseParams.cTax2 * scaleFactor,
            cPre2: baseParams.cPre2 * scaleFactor,
            cPost2: baseParams.cPost2 * scaleFactor,
            cMatch2: baseParams.cMatch2 * scaleFactor,
          };

          if (testSuccess(testParams)) {
            minContrib = mid;
            high = mid; // Try lower
          } else {
            low = mid; // Need more
          }

          // Early exit if converged
          if (Math.abs(high - low) < 100) break;
        }

        surplusAnnual = currentTotalContrib - minContrib;
      }

      // ===== 2. CALCULATE SPLURGE CAPACITY (One-Time Purchase) =====
      // Find maximum one-time expense that maintains >95% success
      // IMPORTANT: Only use taxable balance - it's the only truly liquid account
      // Pre-tax and Roth accounts have penalties/restrictions before retirement age
      const liquidBalance = baseParams.sTax; // Only taxable is immediately accessible
      let maxSplurge = 0;
      let splurgeLow = 0;
      let splurgeHigh = Math.min(5000000, liquidBalance * 0.95); // Cap at 95% of liquid balance
      let splurgeIterations = 0;

      if (liquidBalance > 0) {
        // Binary search with safety brake
        while (splurgeLow < splurgeHigh && splurgeIterations < SAFETY_MAX_ITERATIONS) {
        splurgeIterations++;
        const mid = splurgeLow + (splurgeHigh - splurgeLow) / 2;

          // Reduce only taxable account (simulate immediate spending from liquid funds)
          const testParams = {
            ...baseParams,
            sTax: Math.max(0, baseParams.sTax - mid),
            // Pre-tax and Roth remain unchanged - can't access penalty-free before retirement
          };

          if (testSuccess(testParams)) {
            maxSplurge = mid;
            splurgeLow = mid; // Try higher
          } else {
            splurgeHigh = mid; // Too much
          }

          // Early exit if we've narrowed down enough
          if (splurgeHigh - splurgeLow < 1000) break;
        }
      }

      // ===== 3. CALCULATE FREEDOM DATE (Earliest Retirement) =====
      // Find earliest retirement age with >95% success
      const currentAge = Math.min(baseParams.age1, baseParams.age2 || baseParams.age1);
      let earliestRetirementAge = baseParams.retAge;
      let freedomIterations = 0;

      // Binary search for earliest retirement age with safety brake
      let minAge = currentAge + 1;
      let maxAge = baseParams.retAge;
      let bestAge = baseParams.retAge;

      while (minAge <= maxAge && freedomIterations < SAFETY_MAX_ITERATIONS) {
        freedomIterations++;
        const midAge = Math.floor((minAge + maxAge) / 2);

        const testParams = {
          ...baseParams,
          retAge: midAge,
        };

        if (testSuccess(testParams)) {
          bestAge = midAge;
          maxAge = midAge - 1; // Try earlier
        } else {
          minAge = midAge + 1; // Need more time
        }
      }

      earliestRetirementAge = bestAge;

      // Send results
      self.postMessage({
        type: 'optimize-complete',
        result: {
          surplusAnnual: Math.max(0, surplusAnnual),
          surplusMonthly: Math.max(0, surplusAnnual / 12),
          maxSplurge: Math.max(0, maxSplurge),
          earliestRetirementAge,
          yearsEarlier: Math.max(0, baseParams.retAge - earliestRetirementAge),
        },
      });
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message,
      });
    }
  }
};
