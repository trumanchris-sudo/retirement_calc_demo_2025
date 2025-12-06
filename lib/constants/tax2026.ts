// =============================================================================
// 2026 TAX YEAR CONSTANTS
// Source: IRS Revenue Procedure 2025-32, Tax Foundation
// Note: TCJA rates made permanent by One Big Beautiful Bill Act (OBBBA) July 2025
// =============================================================================

export type FilingStatus = 'single' | 'mfj' | 'mfs' | 'hoh';
export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly' | 'quarterly';

// =============================================================================
// SELF-EMPLOYMENT TAX CONSTANTS (2026)
// =============================================================================
export const SE_TAX_2026 = {
  // Social Security
  SOCIAL_SECURITY_RATE: 0.124,           // 12.4% total (6.2% × 2)
  SOCIAL_SECURITY_WAGE_BASE: 184500,     // Up from $176,100 in 2025

  // Medicare
  MEDICARE_RATE: 0.029,                  // 2.9% base (1.45% × 2)
  ADDITIONAL_MEDICARE_RATE: 0.009,       // 0.9% additional (no employer match)

  // Additional Medicare Tax thresholds (unchanged)
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE: 200000,
  ADDITIONAL_MEDICARE_THRESHOLD_MFJ: 250000,
  ADDITIONAL_MEDICARE_THRESHOLD_MFS: 125000,

  // SE tax base multiplier (92.35% of net SE income)
  SE_TAX_BASE_MULTIPLIER: 0.9235,
} as const;

// =============================================================================
// 2026 FEDERAL INCOME TAX BRACKETS
// =============================================================================
export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export const TAX_BRACKETS_2026: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
  mfj: [
    { min: 0, max: 24800, rate: 0.10 },
    { min: 24800, max: 100800, rate: 0.12 },
    { min: 100800, max: 211400, rate: 0.22 },
    { min: 211400, max: 403550, rate: 0.24 },
    { min: 403550, max: 512450, rate: 0.32 },
    { min: 512450, max: 768700, rate: 0.35 },
    { min: 768700, max: Infinity, rate: 0.37 },
  ],
  mfs: [
    { min: 0, max: 12400, rate: 0.10 },
    { min: 12400, max: 50400, rate: 0.12 },
    { min: 50400, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256225, rate: 0.32 },
    { min: 256225, max: 384350, rate: 0.35 },
    { min: 384350, max: Infinity, rate: 0.37 },
  ],
  hoh: [
    { min: 0, max: 17700, rate: 0.10 },
    { min: 17700, max: 67450, rate: 0.12 },
    { min: 67450, max: 105700, rate: 0.22 },
    { min: 105700, max: 201775, rate: 0.24 },
    { min: 201775, max: 256200, rate: 0.32 },
    { min: 256200, max: 640600, rate: 0.35 },
    { min: 640600, max: Infinity, rate: 0.37 },
  ],
};

// =============================================================================
// 2026 STANDARD DEDUCTIONS
// =============================================================================
export const STANDARD_DEDUCTION_2026: Record<FilingStatus, number> = {
  single: 16100,              // Up from $15,000 in 2025
  mfj: 32200,                 // Up from $30,000 in 2025
  mfs: 16100,                 // Up from $15,000 in 2025
  hoh: 24150,                 // Up from $22,500 in 2025
};

export const STANDARD_DEDUCTION_ADDITIONAL = {
  // Additional deduction for blind/elderly (65+)
  ADDITIONAL_SINGLE: 2050,
  ADDITIONAL_MFJ: 1650,       // Per qualifying spouse

  // OBBBA Senior Deduction (new for 2026): $6,000 per qualifying taxpayer 65+
  // Phases out at 6% rate for income over $75,000 (single) / $150,000 (MFJ)
  SENIOR_DEDUCTION: 6000,
  SENIOR_DEDUCTION_PHASEOUT_SINGLE: 75000,
  SENIOR_DEDUCTION_PHASEOUT_MFJ: 150000,
  SENIOR_DEDUCTION_PHASEOUT_RATE: 0.06,
} as const;

// =============================================================================
// 2026 CAPITAL GAINS BRACKETS (Long-Term)
// =============================================================================
export const CAPITAL_GAINS_BRACKETS_2026: Record<FilingStatus, TaxBracket[]> = {
  single: [
    { min: 0, max: 49450, rate: 0.00 },
    { min: 49450, max: 545500, rate: 0.15 },
    { min: 545500, max: Infinity, rate: 0.20 },
  ],
  mfj: [
    { min: 0, max: 98900, rate: 0.00 },
    { min: 98900, max: 613700, rate: 0.15 },
    { min: 613700, max: Infinity, rate: 0.20 },
  ],
  mfs: [
    { min: 0, max: 49450, rate: 0.00 },
    { min: 49450, max: 306850, rate: 0.15 },
    { min: 306850, max: Infinity, rate: 0.20 },
  ],
  hoh: [
    { min: 0, max: 66200, rate: 0.00 },
    { min: 66200, max: 579600, rate: 0.15 },
    { min: 579600, max: Infinity, rate: 0.20 },
  ],
};

// =============================================================================
// 2026 QUALIFIED BUSINESS INCOME (QBI) DEDUCTION THRESHOLDS (Section 199A)
// =============================================================================
export const QBI_THRESHOLDS_2026 = {
  // Deduction limits begin phasing in at these thresholds
  SINGLE_THRESHOLD: 201775,
  MFJ_THRESHOLD: 403500,

  // Phase-in range expanded by OBBBA
  SINGLE_PHASEOUT_END: 276775,    // $201,775 + $75,000
  MFJ_PHASEOUT_END: 553500,       // $403,500 + $150,000
} as const;

// =============================================================================
// 2026 ALTERNATIVE MINIMUM TAX (AMT)
// =============================================================================
export const AMT_2026 = {
  EXEMPTION_SINGLE: 90100,
  EXEMPTION_MFJ: 140200,

  // Phaseout thresholds (OBBBA returned these to 2018 levels)
  PHASEOUT_SINGLE: 500000,
  PHASEOUT_MFJ: 1000000,
  PHASEOUT_RATE: 0.50,            // 50 cents per dollar (accelerated from 25%)

  // AMT rates
  RATE_26: 0.26,
  RATE_28: 0.28,
  RATE_28_THRESHOLD: 244500,      // 28% applies to AMTI exceeding this
} as const;

// =============================================================================
// 2026 RETIREMENT CONTRIBUTION LIMITS
// =============================================================================
export const RETIREMENT_LIMITS_2026 = {
  // 401(k) / 403(b) / 457
  TRADITIONAL_401K_LIMIT: 24000,              // Up from $23,500 in 2025
  CATCHUP_50_PLUS: 8000,                      // Up from $7,500 in 2025
  CATCHUP_60_TO_63: 11250,                    // "Super catch-up" (same as 2025)
  TOTAL_401K_LIMIT_UNDER_50: 72000,           // Up from $70,000 in 2025
  TOTAL_401K_LIMIT_50_PLUS: 80000,            // $72,000 + $8,000 catch-up
  TOTAL_401K_LIMIT_60_TO_63: 83250,           // $72,000 + $11,250 super catch-up

  // IRA
  IRA_LIMIT: 7500,                            // Up from $7,000 in 2025
  IRA_CATCHUP_50_PLUS: 1100,                  // Up from $1,000 in 2025

  // SEP-IRA
  SEP_IRA_LIMIT: 72000,                       // Up from $70,000 in 2025
  SEP_IRA_COMPENSATION_LIMIT: 360000,         // Up from $350,000 in 2025

  // SIMPLE IRA
  SIMPLE_LIMIT: 17000,                        // Up from $16,500 in 2025
  SIMPLE_CATCHUP_50_PLUS: 4000,               // Up from $3,500 in 2025
  SIMPLE_CATCHUP_60_TO_63: 5250,              // Same as 2025

  // Annual compensation limit for qualified plans
  ANNUAL_COMPENSATION_LIMIT: 360000,          // Up from $350,000 in 2025

  // Highly Compensated Employee threshold
  HCE_THRESHOLD: 160000,                      // Same as 2025

  // SECURE 2.0: High earners ($150,000+ FICA wages in prior year) must make
  // catch-up contributions as Roth starting in 2026
  ROTH_CATCHUP_INCOME_THRESHOLD: 150000,      // Up from $145,000
} as const;

// =============================================================================
// 2026 HSA LIMITS
// =============================================================================
export const HSA_LIMITS_2026 = {
  SELF_ONLY: 4400,                            // Up from $4,300 in 2025
  FAMILY: 8750,                               // Up from $8,550 in 2025
  CATCHUP_55_PLUS: 1000,                      // Unchanged

  // HDHP minimum deductibles
  HDHP_MIN_DEDUCTIBLE_SELF: 1700,             // Up from $1,650 in 2025
  HDHP_MIN_DEDUCTIBLE_FAMILY: 3400,           // Up from $3,300 in 2025

  // HDHP maximum out-of-pocket
  HDHP_MAX_OOP_SELF: 8500,                    // Up from $8,300 in 2025
  HDHP_MAX_OOP_FAMILY: 17000,                 // Up from $16,600 in 2025
} as const;

// =============================================================================
// 2026 FSA LIMITS
// =============================================================================
export const FSA_LIMITS_2026 = {
  HEALTH_FSA: 3400,                           // Up from $3,300 in 2025
  HEALTH_FSA_CARRYOVER: 680,                  // Up from $660 in 2025
  DEPENDENT_CARE_FSA: 5000,                   // Unchanged (not indexed)
} as const;

// =============================================================================
// 2026 TRANSPORTATION BENEFITS
// =============================================================================
export const TRANSPORTATION_LIMITS_2026 = {
  TRANSIT_MONTHLY: 340,                       // Up from $325 in 2025
  PARKING_MONTHLY: 340,                       // Up from $325 in 2025
} as const;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get maximum HSA contribution based on coverage type and age
 */
export function getMaxHSAContribution(coverage: 'self' | 'family', age: number): number {
  const baseLimit = coverage === 'self' ? HSA_LIMITS_2026.SELF_ONLY : HSA_LIMITS_2026.FAMILY;
  const catchUp = age >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0;
  return baseLimit + catchUp;
}

/**
 * Get maximum 401(k) employee contribution based on age
 */
export function getMax401kContribution(age: number): number {
  if (age >= 60 && age <= 63) {
    return RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63; // $35,250
  } else if (age >= 50) {
    return RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS; // $32,000
  }
  return RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT; // $24,000
}

/**
 * Get number of pay periods per year based on frequency
 */
export function getPeriodsPerYear(frequency: PayFrequency): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'biweekly': return 26;
    case 'semimonthly': return 24;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    default: return 24;
  }
}

/**
 * Get marginal tax rate for given taxable income and filing status
 */
export function getMarginalRate(taxableIncome: number, filingStatus: FilingStatus): number {
  const brackets = TAX_BRACKETS_2026[filingStatus];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return brackets[0].rate;
}

/**
 * Get Additional Medicare Tax threshold based on filing status
 */
export function getAdditionalMedicareThreshold(filingStatus: FilingStatus): number {
  if (filingStatus === 'mfj') {
    return SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_MFJ;
  } else if (filingStatus === 'mfs') {
    return SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_MFS;
  }
  return SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE;
}
