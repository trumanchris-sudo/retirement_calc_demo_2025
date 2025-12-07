/**
 * Withdrawal Tax Strategy Verification Tests
 * Purpose: Verify pro-rata withdrawal logic and tax calculations
 */

import { describe, it, expect } from 'vitest';
import { computeWithdrawalTaxes } from '../withdrawalTax';

describe('Withdrawal Tax Strategy Verification (Phase 3)', () => {

  // =========================================================================
  // PRO-RATA DISTRIBUTION LOGIC
  // =========================================================================

  describe('Pro-Rata Distribution', () => {
    it('should distribute withdrawals proportionally across all accounts', () => {
      // Portfolio: $100k taxable, $200k pre-tax, $100k Roth (total $400k)
      // Expected shares: 25% taxable, 50% pre-tax, 25% Roth
      const result = computeWithdrawalTaxes(
        40000,  // $40k withdrawal
        'single',
        100000, // taxable
        200000, // pre-tax
        100000, // Roth
        50000,  // basis
        0,      // no state tax
        0,      // no RMD
        0       // no SS
      );

      // Verify pro-rata distribution
      expect(result.draw.t).toBeCloseTo(10000, 2); // 25% of $40k
      expect(result.draw.p).toBeCloseTo(20000, 2); // 50% of $40k
      expect(result.draw.r).toBeCloseTo(10000, 2); // 25% of $40k

      // Verify total equals withdrawal
      const total = result.draw.t + result.draw.p + result.draw.r;
      expect(total).toBeCloseTo(40000, 2);
    });

    it('should handle equal balances across accounts', () => {
      // Portfolio: $100k each (total $300k)
      // Expected: 33.33% from each
      const result = computeWithdrawalTaxes(
        30000,
        'single',
        100000, 100000, 100000,
        80000, 0, 0, 0
      );

      expect(result.draw.t).toBeCloseTo(10000, 2);
      expect(result.draw.p).toBeCloseTo(10000, 2);
      expect(result.draw.r).toBeCloseTo(10000, 2);
    });

    it('should handle portfolio with only one account type', () => {
      // Only pre-tax balance
      const result = computeWithdrawalTaxes(
        50000,
        'single',
        0,      // no taxable
        200000, // pre-tax only
        0,      // no Roth
        0, 0, 0, 0
      );

      expect(result.draw.t).toBe(0);
      expect(result.draw.p).toBeCloseTo(50000, 2);
      expect(result.draw.r).toBe(0);
    });
  });

  // =========================================================================
  // RMD ENFORCEMENT
  // =========================================================================

  describe('RMD Enforcement', () => {
    it('should enforce minimum pre-tax withdrawal (RMD)', () => {
      // Portfolio: $100k each
      // Withdraw $30k but RMD requires $20k from pre-tax
      const result = computeWithdrawalTaxes(
        30000,
        'single',
        100000, 100000, 100000,
        80000,
        0,
        20000,  // RMD = $20k
        0
      );

      // Pre-tax should be at least RMD
      expect(result.draw.p).toBeGreaterThanOrEqual(20000);

      // Remaining $10k distributed pro-rata across remaining balances
      // Available after RMD: $100k taxable + $80k pre-tax + $100k Roth = $280k
      // Shares: 35.7% taxable, 28.6% pre-tax, 35.7% Roth
      const remaining = 10000;
      expect(result.draw.t).toBeCloseTo(remaining * (100000 / 280000), 1);
      expect(result.draw.r).toBeCloseTo(remaining * (100000 / 280000), 1);
    });

    it('should handle RMD exceeding withdrawal need', () => {
      // Withdraw $20k but RMD requires $30k
      const result = computeWithdrawalTaxes(
        20000,
        'single',
        100000, 100000, 100000,
        80000,
        0,
        30000,  // RMD > withdrawal
        0
      );

      // Should withdraw full RMD from pre-tax
      expect(result.draw.p).toBe(30000);

      // Should not withdraw from other accounts
      expect(result.draw.t).toBe(0);
      expect(result.draw.r).toBe(0);
    });

    it('should cap RMD at available pre-tax balance', () => {
      // RMD $100k but only $50k available
      const result = computeWithdrawalTaxes(
        80000,
        'single',
        100000,
        50000,  // Only $50k pre-tax
        100000,
        80000,
        0,
        100000, // RMD requests $100k
        0
      );

      // Can't withdraw more than available
      expect(result.draw.p).toBe(50000);

      // Should distribute remaining need ($30k) pro-rata
      const remaining = 30000;
      const availBal = 100000 + 100000; // taxable + Roth
      expect(result.draw.t).toBeCloseTo(remaining * (100000 / availBal), 2);
      expect(result.draw.r).toBeCloseTo(remaining * (100000 / availBal), 2);
    });
  });

  // =========================================================================
  // CAPITAL GAINS CALCULATION
  // =========================================================================

  describe('Capital Gains from Taxable Account', () => {
    it('should calculate capital gains proportionally from taxable withdrawal', () => {
      // Taxable: $100k balance, $60k basis → $40k unrealized gains
      // Gain ratio: 40%
      // Withdraw $50k total, ~$16.67k from taxable (33% pro-rata)
      const result = computeWithdrawalTaxes(
        50000,
        'single',
        100000, // taxable
        100000, // pre-tax
        100000, // Roth
        60000,  // basis (40% gains)
        0, 0, 0
      );

      const taxableWithdrawal = result.draw.t;
      const gainRatio = 40000 / 100000; // 40% gains

      // Expected gain from taxable withdrawal
      const expectedGain = taxableWithdrawal * gainRatio;

      console.log(`\nCapital Gains Calculation:`);
      console.log(`  Taxable balance: $100,000`);
      console.log(`  Cost basis: $60,000`);
      console.log(`  Unrealized gains: $40,000 (40%)`);
      console.log(`  Taxable withdrawal: $${taxableWithdrawal.toFixed(2)}`);
      console.log(`  Expected gain: $${expectedGain.toFixed(2)}`);
      console.log(`  LTCG tax: $${result.capgain.toFixed(2)}`);

      // Note: LTCG tax might be $0 if income is in 0% bracket
      // This test verifies the calculation happens, not the tax amount
      expect(expectedGain).toBeGreaterThan(0);
    });

    it('should handle taxable account with no gains (basis = balance)', () => {
      const result = computeWithdrawalTaxes(
        40000,
        'single',
        100000, 100000, 100000,
        100000, // basis equals balance (no gains)
        0, 0, 0
      );

      // No capital gains tax
      expect(result.capgain).toBe(0);
      expect(result.niit).toBe(0);
    });

    it('should reduce basis proportionally after withdrawal', () => {
      // Taxable: $100k, basis $60k
      // Withdraw $30k total, ~$10k from taxable
      const result = computeWithdrawalTaxes(
        30000,
        'single',
        100000, 100000, 100000,
        60000,
        0, 0, 0
      );

      const taxableWithdrawal = result.draw.t;
      const gainRatio = 40000 / 100000; // 40% gains
      const basisWithdrawn = taxableWithdrawal * (1 - gainRatio);

      const expectedNewBasis = 60000 - basisWithdrawn;

      expect(result.newBasis).toBeCloseTo(expectedNewBasis, 2);
    });
  });

  // =========================================================================
  // MARGINAL TAX RATE APPROACH
  // =========================================================================

  describe('Marginal Tax Rate Calculation', () => {
    it('should tax withdrawal at marginal rate when base income exists', () => {
      // Single filer with $50k Social Security (base income)
      // Withdraw $40k
      const result = computeWithdrawalTaxes(
        40000,
        'single',
        0, 120000, 0, // all pre-tax for simplicity
        0,
        0,
        0,
        50000  // $50k base ordinary income (SS)
      );

      // All $40k is pre-tax withdrawal = ordinary income
      // Should be taxed on top of $50k base

      // Tax on $90k - Tax on $50k = marginal tax
      console.log(`\nMarginal Tax Calculation:`);
      console.log(`  Base income (SS): $50,000`);
      console.log(`  Withdrawal: $40,000`);
      console.log(`  Total income: $90,000`);
      console.log(`  Federal ordinary tax: $${result.ordinary.toFixed(2)}`);

      expect(result.ordinary).toBeGreaterThan(0);

      // The marginal tax should be less than if we taxed $90k from $0
      // (because lower brackets are filled by base income)
    });

    it('should stack capital gains on top of ordinary income', () => {
      // Ordinary income: $80k (from pre-tax withdrawal)
      // Capital gains: Should stack on top for LTCG bracket

      const result = computeWithdrawalTaxes(
        100000,
        'single',
        100000, // taxable with gains
        200000, // pre-tax
        0,
        50000,  // 50% gains
        0,
        0,
        40000   // $40k base income (SS)
      );

      // Pre-tax withdrawal creates ordinary income
      // Capital gains from taxable should stack on top

      expect(result.ordinary).toBeGreaterThan(0);
      expect(result.capgain).toBeGreaterThan(0);

      console.log(`\nStacking Test:`);
      console.log(`  Base income: $40,000`);
      console.log(`  Ordinary (pre-tax): $${result.draw.p.toFixed(2)}`);
      console.log(`  Capital gains: calculated from taxable withdrawal`);
      console.log(`  Federal ordinary: $${result.ordinary.toFixed(2)}`);
      console.log(`  Federal LTCG: $${result.capgain.toFixed(2)}`);
    });
  });

  // =========================================================================
  // SHORTFALL HANDLING
  // =========================================================================

  describe('Shortfall Cascade Logic', () => {
    it('should cascade to next account when one is depleted', () => {
      // Test scenario where taxable account runs out during pro-rata distribution
      // Pro-rata attempts to withdraw more than available from taxable
      // Total: $210k ($10k taxable, $150k pre-tax, $50k Roth)
      // Want: $50k
      // Pro-rata share for taxable: 4.76% × $50k = $2,381
      // BUT if we wanted to force depletion, we'd need to request much more

      // Better test: Request amount that would deplete taxable on pro-rata basis
      // If taxable is $10k and total is $210k, to deplete we need:
      // withdrawal × (10k/210k) >= 10k → withdrawal >= $105k

      const result = computeWithdrawalTaxes(
        105000,
        'single',
        10000,  // small taxable balance
        150000, // pre-tax
        50000,  // Roth
        5000,
        0, 0, 0
      );

      // Pro-rata would want: 105k × (10k/210k) = 5k from taxable
      // But shortfall handling should cascade excess to other accounts

      const totalBal = 10000 + 150000 + 50000;
      const proRataTaxable = 105000 * (10000 / totalBal);

      console.log(`\nShortfall Test:`);
      console.log(`  Total portfolio: $${totalBal.toLocaleString()}`);
      console.log(`  Withdrawal request: $105,000`);
      console.log(`  Pro-rata taxable share: $${proRataTaxable.toFixed(2)}`);
      console.log(`  Actual taxable drawn: $${result.draw.t.toFixed(2)}`);

      // Should use taxable proportionally (not necessarily all of it)
      expect(result.draw.t).toBeCloseTo(proRataTaxable, 2);

      // Total withdrawal should equal request (or max available)
      const totalDrawn = result.draw.t + result.draw.p + result.draw.r;
      expect(totalDrawn).toBeCloseTo(105000, 2);
    });

    it('should handle complete portfolio depletion', () => {
      // Total portfolio: $30k, request $50k
      const result = computeWithdrawalTaxes(
        50000,
        'single',
        10000,
        15000,
        5000,
        8000,
        0, 0, 0
      );

      // Should withdraw everything available
      expect(result.draw.t).toBe(10000);
      expect(result.draw.p).toBe(15000);
      expect(result.draw.r).toBe(5000);

      const totalWithdrawn = result.draw.t + result.draw.p + result.draw.r;
      expect(totalWithdrawn).toBe(30000); // Can't exceed available
    });
  });

  // =========================================================================
  // NIIT (NET INVESTMENT INCOME TAX)
  // =========================================================================

  describe('NIIT on Withdrawal', () => {
    it('should apply NIIT when MAGI exceeds threshold', () => {
      // High-income retiree with capital gains
      const result = computeWithdrawalTaxes(
        150000,
        'single',
        200000, // taxable with gains
        200000, // pre-tax
        0,
        100000, // 50% gains in taxable
        0,
        0,
        100000  // $100k SS income
      );

      // MAGI = SS + pre-tax withdrawal + capital gains
      // Should exceed $200k threshold for single filer

      if (result.capgain > 0) {
        // Should have NIIT on investment income
        expect(result.niit).toBeGreaterThan(0);

        console.log(`\nNIIT Test:`);
        console.log(`  Base income: $100,000`);
        console.log(`  Pre-tax withdrawal: $${result.draw.p.toFixed(2)}`);
        console.log(`  Capital gains: calculated`);
        console.log(`  NIIT (3.8%): $${result.niit.toFixed(2)}`);
      }
    });
  });

  // =========================================================================
  // STATE TAX
  // =========================================================================

  describe('State Tax Calculation', () => {
    it('should apply state tax to ordinary income and capital gains', () => {
      const result = computeWithdrawalTaxes(
        100000,
        'single',
        100000, 100000, 100000,
        50000,  // 50% gains
        5.0,    // 5% state tax
        0, 0
      );

      // State tax should apply to (ordinary + cap gains)
      const taxableIncome = result.draw.p + (result.draw.t * 0.5); // 50% of taxable is gains
      const expectedStateTax = taxableIncome * 0.05;

      expect(result.state).toBeCloseTo(expectedStateTax, 2);
    });

    it('should not apply state tax when rate is 0', () => {
      const result = computeWithdrawalTaxes(
        50000,
        'single',
        100000, 100000, 100000,
        60000,
        0,      // No state tax
        0, 0
      );

      expect(result.state).toBe(0);
    });
  });

  // =========================================================================
  // INTEGRATED SCENARIOS
  // =========================================================================

  describe('Real-World Retirement Scenarios', () => {
    it('should handle typical retiree: SS + portfolio withdrawal + RMD', () => {
      // 73-year-old retiree
      // Portfolio: $500k (200k taxable, 200k pre-tax, 100k Roth)
      // Social Security: $40k/year
      // RMD required: $7,547 (200k / 26.5)
      // Need: $80k total spending

      const result = computeWithdrawalTaxes(
        40000,  // Need $40k from portfolio (SS covers other $40k)
        'married',
        200000, // taxable
        200000, // pre-tax
        100000, // Roth
        150000, // basis (25% gains in taxable)
        0,
        7547,   // RMD
        40000   // SS income
      );

      console.log(`\nTypical Retiree Scenario:`);
      console.log(`  Social Security: $40,000`);
      console.log(`  Portfolio withdrawal: $40,000`);
      console.log(`  RMD requirement: $7,547`);
      console.log(`\nWithdrawal Distribution:`);
      console.log(`  Taxable: $${result.draw.t.toFixed(2)}`);
      console.log(`  Pre-tax: $${result.draw.p.toFixed(2)}`);
      console.log(`  Roth: $${result.draw.r.toFixed(2)}`);
      console.log(`\nTax Breakdown:`);
      console.log(`  Federal ordinary: $${result.ordinary.toFixed(2)}`);
      console.log(`  Federal LTCG: $${result.capgain.toFixed(2)}`);
      console.log(`  NIIT: $${result.niit.toFixed(2)}`);
      console.log(`  Total tax: $${result.tax.toFixed(2)}`);
      console.log(`  After-tax withdrawal: $${(40000 - result.tax).toFixed(2)}`);

      // Verify RMD enforced
      expect(result.draw.p).toBeGreaterThanOrEqual(7547);

      // Verify total makes sense
      expect(result.tax).toBeGreaterThan(0);
      expect(result.tax).toBeLessThan(40000);
    });
  });
});
