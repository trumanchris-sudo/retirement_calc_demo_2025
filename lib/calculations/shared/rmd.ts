/**
 * Shared RMD (Required Minimum Distribution) Calculation Functions
 *
 * Pure RMD calculation functions with no browser/DOM dependencies.
 * Used by both main app and Monte Carlo worker.
 */

import { RMD_START_AGE, RMD_DIVISORS } from "./constants";

/**
 * Calculate Required Minimum Distribution
 * @param pretaxBalance - Balance in pre-tax accounts (401k, IRA)
 * @param age - Current age
 * @returns Required minimum distribution amount
 */
export function calcRMD(pretaxBalance: number, age: number): number {
  if (age < RMD_START_AGE || pretaxBalance <= 0) return 0;

  const divisor = RMD_DIVISORS[age] || 2.0; // Use 2.0 for ages beyond 120

  return pretaxBalance / divisor;
}
