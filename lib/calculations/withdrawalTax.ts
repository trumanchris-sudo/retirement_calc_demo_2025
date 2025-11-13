/**
 * Withdrawal tax calculation for retirement accounts
 * Handles pro-rata withdrawals across taxable, pre-tax, and Roth accounts
 * with proper tax treatment for each account type
 */

import { calcOrdinaryTax, calcLTCGTax, calcNIIT, type FilingStatus } from "./taxCalculations";

export interface WithdrawalResult {
  /** Total tax on withdrawal */
  tax: number;
  /** Federal ordinary income tax */
  ordinary: number;
  /** Federal capital gains tax */
  capgain: number;
  /** Net Investment Income Tax (3.8% Medicare surtax) */
  niit: number;
  /** State income tax */
  state: number;
  /** Amount drawn from each account type */
  draw: {
    /** Taxable account withdrawal */
    t: number;
    /** Pre-tax account withdrawal */
    p: number;
    /** Roth account withdrawal */
    r: number;
  };
  /** Remaining taxable account basis after withdrawal */
  newBasis: number;
}

/**
 * Calculate taxes on a retirement withdrawal using pro-rata distribution
 * across taxable, pre-tax (401k/IRA), and Roth accounts
 *
 * @param gross - Gross withdrawal amount needed
 * @param status - Filing status (single or married)
 * @param taxableBal - Current taxable account balance
 * @param pretaxBal - Current pre-tax account balance (401k, traditional IRA)
 * @param rothBal - Current Roth account balance
 * @param taxableBasis - Cost basis in taxable account (for capital gains calc)
 * @param statePct - State tax rate percentage (e.g., 5 for 5%)
 * @returns Detailed tax breakdown and withdrawal amounts by account
 */
export function computeWithdrawalTaxes(
  gross: number,
  status: FilingStatus,
  taxableBal: number,
  pretaxBal: number,
  rothBal: number,
  taxableBasis: number,
  statePct: number
): WithdrawalResult {
  const totalBal = taxableBal + pretaxBal + rothBal;
  if (totalBal <= 0 || gross <= 0)
    return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: taxableBasis };

  // Calculate pro-rata shares
  const shareT = totalBal > 0 ? taxableBal / totalBal : 0;
  const shareP = totalBal > 0 ? pretaxBal / totalBal : 0;
  const shareR = totalBal > 0 ? rothBal / totalBal : 0;

  // Initial pro-rata withdrawal amounts
  let drawT = gross * shareT;
  let drawP = gross * shareP;
  let drawR = gross * shareR;

  // Handle shortfalls by cascading to next account type
  const fixShortfall = (want: number, have: number) => Math.min(want, have);

  const usedT = fixShortfall(drawT, taxableBal);
  let shortT = drawT - usedT;

  const usedP = fixShortfall(drawP + shortT, pretaxBal);
  let shortP = drawP + shortT - usedP;

  const usedR = fixShortfall(drawR + shortP, rothBal);

  // Final withdrawal amounts after handling shortfalls
  drawT = usedT;
  drawP = usedP;
  drawR = usedR;

  // Calculate capital gains from taxable account withdrawal
  const unrealizedGain = Math.max(0, taxableBal - taxableBasis);
  const gainRatio = taxableBal > 0 ? unrealizedGain / taxableBal : 0;
  const drawT_Gain = drawT * gainRatio;
  const drawT_Basis = drawT - drawT_Gain;

  // Tax components
  const ordinaryIncome = drawP; // Pre-tax withdrawals are ordinary income
  const capGains = drawT_Gain; // Only gains from taxable account

  // Calculate federal taxes
  const fedOrd = calcOrdinaryTax(ordinaryIncome, status);
  const fedCap = calcLTCGTax(capGains, status, ordinaryIncome);
  const magi = ordinaryIncome + capGains;
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
}
