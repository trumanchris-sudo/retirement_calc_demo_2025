/**
 * Shared Calculation Module - Main Entry Point
 *
 * This module exports all shared calculation functions and constants
 * that can be used by both the main application and the Monte Carlo web worker.
 *
 * IMPORTANT: All exports in this module should be pure functions and data
 * with no browser/DOM dependencies to ensure they can be bundled for workers.
 */

// Constants
export {
  // Core simulation constants
  LIFE_EXP,
  RMD_START_AGE,
  RMD_DIVISORS,
  // Social Security
  SS_BEND_POINTS,
  SS_EARNINGS_TEST_2026,
  SS_TAXATION_THRESHOLDS,
  // Tax brackets
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  IRMAA_BRACKETS_2026,
  // Market data
  SP500_START_YEAR,
  SP500_END_YEAR,
  SP500_ORIGINAL,
  SP500_YOY_NOMINAL,
  // Bond allocation
  BOND_NOMINAL_AVG,
  BOND_REAL_AVG,
  BOND_VOLATILITY,
  STOCK_BOND_CORRELATION,
  // Employment taxes
  EMPLOYMENT_TAX_CONSTANTS,
  // Child expenses
  CHILD_EXPENSE_CONSTANTS,
  // Healthcare
  PRE_MEDICARE_HEALTHCARE_CONSTANTS,
  // Types
  type FilingStatus,
  type BondGlidePath,
} from "./constants";

// Utility functions
export {
  mulberry32,
  percentile,
  trimExtremeValues,
  realReturn,
  getEffectiveInflation,
} from "./utils";

// Tax calculations
export {
  calcOrdinaryTax,
  calcLTCGTax,
  calcNIIT,
  getIRMAASurcharge,
  calculateSelfEmploymentTax,
  calculatePayrollTax,
  calculateEmploymentTaxes,
  type EmploymentType,
} from "./taxCalculations";

// Social Security calculations
export {
  calcPIA,
  adjustSSForClaimAge,
  calcSocialSecurity,
  calculateEffectiveSS,
  applyEarningsTest,
  calculateSSTaxableAmount,
} from "./socialSecurity";

// Bond allocation calculations
export {
  calculateBondReturn,
  calculateBondAllocation,
  calculateBlendedReturn,
} from "./bondAllocation";

// Expense calculations
export {
  calculateChildExpenses,
  getPreMedicareHealthcareCost,
  calculatePreMedicareHealthcareCosts,
} from "./expenses";

// RMD calculations
export { calcRMD } from "./rmd";

// Withdrawal tax calculations
export {
  computeWithdrawalTaxes,
  type WithdrawalResult,
} from "./withdrawalTax";

// Return generator
export {
  buildReturnGenerator,
  type ReturnMode,
  type WalkSeries,
  type ReturnGeneratorOptions,
} from "./returnGenerator";
