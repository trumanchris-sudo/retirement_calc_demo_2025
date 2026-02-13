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
 * Calculate taxes on a retirement withdrawal
 *
 * @param gross - Gross withdrawal amount needed
 * @param status - Filing status (single or married)
 * @param taxableBal - Current taxable account balance
 * @param pretaxBal - Current pre-tax account balance (401k, traditional IRA)
 * @param rothBal - Current Roth account balance
 * @param taxableBasis - Cost basis in taxable account (for capital gains calc)
 * @param statePct - State tax rate percentage (e.g., 5 for 5%)
 * @param minPretaxDraw - Optional minimum required pre-tax withdrawal (RMD)
 * @param baseOrdinaryIncome - Optional base ordinary income (e.g., Social Security) that fills lower tax brackets
 * @param preserveRoth - If true, avoid Roth withdrawals until other accounts are depleted (for inheritance planning)
 * @returns Detailed tax breakdown and withdrawal amounts by account
 */
export function computeWithdrawalTaxes(
  gross: number,
  status: FilingStatus,
  taxableBal: number,
  pretaxBal: number,
  rothBal: number,
  taxableBasis: number,
  statePct: number,
  minPretaxDraw: number = 0,
  baseOrdinaryIncome: number = 0,
  preserveRoth: boolean = true  // Default to preserving Roth for inheritance
): WithdrawalResult {
  // Guard against NaN/undefined inputs - coerce to 0 for safety
  const safeTaxableBal = Number.isFinite(taxableBal) ? Math.max(0, taxableBal) : 0;
  const safePretaxBal = Number.isFinite(pretaxBal) ? Math.max(0, pretaxBal) : 0;
  const safeRothBal = Number.isFinite(rothBal) ? Math.max(0, rothBal) : 0;
  const safeTaxableBasis = Number.isFinite(taxableBasis) ? Math.max(0, taxableBasis) : 0;
  const safeGross = Number.isFinite(gross) ? Math.max(0, gross) : 0;
  const safeStatePct = Number.isFinite(statePct) ? Math.max(0, Math.min(100, statePct)) : 0;
  const safeMinPretaxDraw = Number.isFinite(minPretaxDraw) ? Math.max(0, minPretaxDraw) : 0;
  const safeBaseOrdinaryIncome = Number.isFinite(baseOrdinaryIncome) ? Math.max(0, baseOrdinaryIncome) : 0;

  const totalBal = safeTaxableBal + safePretaxBal + safeRothBal;
  if (totalBal <= 0 || safeGross <= 0)
    return { tax: 0, ordinary: 0, capgain: 0, niit: 0, state: 0, draw: { t: 0, p: 0, r: 0 }, newBasis: safeTaxableBasis };

  // RMD Logic: Force drawP to be at least minPretaxDraw before pro-rata distribution
  let drawP = Math.min(safeMinPretaxDraw, safePretaxBal); // Can't withdraw more than available
  const remainingNeed = safeGross - drawP;

  let drawT = 0;
  let drawR = 0;

  // If there's a remaining need after RMD, distribute based on strategy
  if (remainingNeed > 0) {
    if (preserveRoth) {
      // ROTH-LAST STRATEGY: Preserve Roth for inheritance
      // Priority: 1) Taxable, 2) Pre-tax, 3) Roth (only if needed)
      let stillNeeded = remainingNeed;

      // 1. Draw from taxable first
      drawT = Math.min(stillNeeded, safeTaxableBal);
      stillNeeded -= drawT;

      // 2. Draw from pre-tax (beyond RMD)
      if (stillNeeded > 0) {
        const availablePretax = safePretaxBal - drawP;
        const additionalPretax = Math.min(stillNeeded, availablePretax);
        drawP += additionalPretax;
        stillNeeded -= additionalPretax;
      }

      // 3. Only draw from Roth as last resort
      if (stillNeeded > 0) {
        drawR = Math.min(stillNeeded, safeRothBal);
      }
    } else {
      // PRO-RATA STRATEGY: Traditional proportional distribution
      const availableBal = safeTaxableBal + (safePretaxBal - drawP) + safeRothBal;

      if (availableBal > 0) {
        const shareT = safeTaxableBal / availableBal;
        const shareP = (safePretaxBal - drawP) / availableBal;
        const shareR = safeRothBal / availableBal;

        drawT = remainingNeed * shareT;
        drawP += remainingNeed * shareP;
        drawR = remainingNeed * shareR;
      }
    }
  } else if (remainingNeed < 0) {
    // RMD exceeds gross need - excess will be reinvested in taxable
    // This is handled by allowing drawP to exceed gross
    // The excess will be dealt with in the calling code
  }

  // Handle shortfalls by cascading to next account type
  const fixShortfall = (want: number, have: number) => Math.min(want, have);

  const usedT = fixShortfall(drawT, safeTaxableBal);
  const shortT = drawT - usedT;

  const usedP = fixShortfall(drawP + shortT, safePretaxBal);
  const shortP = drawP + shortT - usedP;

  const usedR = fixShortfall(drawR + shortP, safeRothBal);

  // Final withdrawal amounts after handling shortfalls
  drawT = usedT;
  drawP = usedP;
  drawR = usedR;

  // Calculate capital gains from taxable account withdrawal
  const unrealizedGain = Math.max(0, safeTaxableBal - safeTaxableBasis);
  const gainRatio = safeTaxableBal > 0 ? unrealizedGain / safeTaxableBal : 0;
  const drawT_Gain = drawT * gainRatio;
  const drawT_Basis = drawT - drawT_Gain;

  // Tax components
  const ordinaryIncome = drawP; // Pre-tax withdrawals are ordinary income
  const capGains = drawT_Gain; // Only gains from taxable account

  // Calculate federal taxes using marginal bracket approach
  // Add baseOrdinaryIncome (e.g., Social Security) to ensure withdrawal is taxed at marginal rate
  const totalOrdinaryIncome = safeBaseOrdinaryIncome + ordinaryIncome;
  const taxOnTotal = calcOrdinaryTax(totalOrdinaryIncome, status);
  const taxOnBase = calcOrdinaryTax(safeBaseOrdinaryIncome, status);
  const fedOrd = taxOnTotal - taxOnBase; // Tax attributable to withdrawal only

  const fedCap = calcLTCGTax(capGains, status, totalOrdinaryIncome);
  const magi = totalOrdinaryIncome + capGains;
  const niit = calcNIIT(capGains, status, magi);
  const stateTax = (ordinaryIncome + capGains) * (safeStatePct / 100);

  const totalTax = fedOrd + fedCap + niit + stateTax;
  const newBasis = Math.max(0, safeTaxableBasis - drawT_Basis);

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
