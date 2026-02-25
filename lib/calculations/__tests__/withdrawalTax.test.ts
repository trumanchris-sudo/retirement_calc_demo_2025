/**
 * Unit tests for computeWithdrawalTaxes
 *
 * Tests Roth-last strategy (preserveRoth=true, the default),
 * pro-rata strategy, RMD enforcement, capital gains basis tracking,
 * base ordinary income stacking, state tax, shortfall cascading,
 * and NaN/undefined input guards.
 */

import { describe, it, expect } from 'vitest';
import { computeWithdrawalTaxes } from '../withdrawalTax';

describe('computeWithdrawalTaxes', () => {

  // =========================================================================
  // ROTH-LAST STRATEGY (preserveRoth = true, the default)
  // =========================================================================

  describe('Roth-last strategy (default)', () => {
    it('should draw from taxable first, then pre-tax, then Roth', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        30000,  // taxable
        100000, // pre-tax
        80000,  // Roth
        20000,  // basis
        0, 0, 0, true
      );

      // Should take all $30k from taxable, then $20k from pre-tax
      expect(result.draw.t).toBeCloseTo(30000, 2);
      expect(result.draw.p).toBeCloseTo(20000, 2);
      expect(result.draw.r).toBe(0);
    });

    it('should use Roth only when taxable and pre-tax are exhausted', () => {
      const result = computeWithdrawalTaxes(
        100000, 'single',
        20000,  // taxable
        30000,  // pre-tax
        200000, // Roth
        15000, 0, 0, 0, true
      );

      expect(result.draw.t).toBeCloseTo(20000, 2);
      expect(result.draw.p).toBeCloseTo(30000, 2);
      expect(result.draw.r).toBeCloseTo(50000, 2); // remainder from Roth
    });

    it('should not draw from Roth when taxable + pre-tax suffice', () => {
      const result = computeWithdrawalTaxes(
        40000, 'single',
        50000, 100000, 50000,
        30000, 0, 0, 0, true
      );

      expect(result.draw.r).toBe(0);
      expect(result.draw.t + result.draw.p).toBeCloseTo(40000, 2);
    });
  });

  // =========================================================================
  // PRO-RATA STRATEGY (preserveRoth = false)
  // =========================================================================

  describe('Pro-rata strategy', () => {
    it('should distribute proportionally across all accounts', () => {
      const result = computeWithdrawalTaxes(
        40000, 'single',
        100000, // 25% of total
        200000, // 50% of total
        100000, // 25% of total
        50000, 0, 0, 0, false
      );

      expect(result.draw.t).toBeCloseTo(10000, 2);  // 25%
      expect(result.draw.p).toBeCloseTo(20000, 2);  // 50%
      expect(result.draw.r).toBeCloseTo(10000, 2);  // 25%
    });

    it('should handle equal balances', () => {
      const result = computeWithdrawalTaxes(
        30000, 'single',
        100000, 100000, 100000,
        80000, 0, 0, 0, false
      );

      expect(result.draw.t).toBeCloseTo(10000, 2);
      expect(result.draw.p).toBeCloseTo(10000, 2);
      expect(result.draw.r).toBeCloseTo(10000, 2);
    });

    it('should handle only one account type with balance', () => {
      const result = computeWithdrawalTaxes(
        30000, 'single',
        0, 200000, 0,
        0, 0, 0, 0, false
      );

      expect(result.draw.t).toBe(0);
      expect(result.draw.p).toBeCloseTo(30000, 2);
      expect(result.draw.r).toBe(0);
    });
  });

  // =========================================================================
  // RMD ENFORCEMENT
  // =========================================================================

  describe('RMD enforcement', () => {
    it('should force minimum pre-tax withdrawal for RMD', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        100000, 200000, 100000,
        60000, 0,
        15000, // minPretaxDraw (RMD)
        0, true
      );

      expect(result.draw.p).toBeGreaterThanOrEqual(15000);
    });

    it('should handle RMD exceeding total withdrawal need', () => {
      const result = computeWithdrawalTaxes(
        20000, 'single',
        100000, 200000, 100000,
        60000, 0,
        30000, // RMD > gross
        0, true
      );

      // drawP should be the full RMD
      expect(result.draw.p).toBe(30000);
      // No draws from other accounts since RMD already exceeds need
      expect(result.draw.t).toBe(0);
      expect(result.draw.r).toBe(0);
    });

    it('should cap RMD at available pre-tax balance', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        100000, 10000, 100000,
        60000, 0,
        20000, // RMD $20k but only $10k available
        0, true
      );

      // Can only take $10k from pre-tax
      expect(result.draw.p).toBe(10000);
    });

    it('should distribute remainder after RMD using Roth-last strategy', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        30000,  // taxable
        200000, // pre-tax
        100000, // Roth
        20000, 0,
        10000,  // RMD: $10k from pre-tax first
        0, true
      );

      // RMD takes $10k from pre-tax
      // Remaining $40k: taxable first ($30k), then more pre-tax ($10k)
      expect(result.draw.p).toBeCloseTo(20000, 2); // $10k RMD + $10k additional
      expect(result.draw.t).toBeCloseTo(30000, 2); // all taxable
      expect(result.draw.r).toBe(0);
    });
  });

  // =========================================================================
  // CAPITAL GAINS BASIS TRACKING
  // =========================================================================

  describe('Capital gains basis tracking', () => {
    it('should calculate gain ratio correctly', () => {
      // $100k balance, $60k basis → 40% gains
      const result = computeWithdrawalTaxes(
        50000, 'single',
        100000, 0, 0,
        60000, 0, 0, 0, true
      );

      // All $50k from taxable, 40% is gains
      expect(result.draw.t).toBeCloseTo(50000, 2);
      // newBasis should reflect basis portion of withdrawal
      // Basis withdrawn = $50,000 * (1 - 0.40) = $30,000
      // New basis = $60,000 - $30,000 = $30,000
      expect(result.newBasis).toBeCloseTo(30000, 2);
    });

    it('should handle no-gain scenario (basis equals balance)', () => {
      const result = computeWithdrawalTaxes(
        30000, 'single',
        100000, 0, 0,
        100000, // basis = balance (no gains)
        0, 0, 0, true
      );

      expect(result.capgain).toBe(0);
      expect(result.newBasis).toBeCloseTo(70000, 2); // $100k - $30k
    });

    it('should handle all-gain scenario (zero basis)', () => {
      const result = computeWithdrawalTaxes(
        20000, 'single',
        100000, 0, 0,
        0, // zero basis: 100% gains
        0, 0, 0, true
      );

      // All withdrawal is capital gain
      expect(result.newBasis).toBe(0);
      // capgain tax should be > 0 (gains are taxed)
      // Though at very low income it might be in the 0% bracket
    });

    it('should preserve basis when drawing from pre-tax/Roth only', () => {
      const result = computeWithdrawalTaxes(
        30000, 'single',
        0, 100000, 100000,
        50000, // basis in (empty) taxable account
        0, 0, 0, true
      );

      expect(result.draw.t).toBe(0);
      expect(result.newBasis).toBeCloseTo(50000, 2); // unchanged
    });
  });

  // =========================================================================
  // BASE ORDINARY INCOME STACKING
  // =========================================================================

  describe('Base ordinary income stacking', () => {
    it('should tax withdrawal at marginal rate above base income', () => {
      // With $50k base income, $30k pre-tax withdrawal should be taxed
      // at the marginal rate stacking on top of $50k
      const withBase = computeWithdrawalTaxes(
        30000, 'single',
        0, 100000, 0,
        0, 0, 0,
        50000, // base ordinary income
        true
      );

      const withoutBase = computeWithdrawalTaxes(
        30000, 'single',
        0, 100000, 0,
        0, 0, 0,
        0, // no base income
        true
      );

      // Tax with base income should be higher (higher marginal brackets)
      expect(withBase.ordinary).toBeGreaterThan(withoutBase.ordinary);
    });

    it('should produce zero marginal tax when base income fills bracket and withdrawal is in deduction', () => {
      // Base income of $0, withdrawal of $10,000 for single
      // Standard deduction $16,100 covers the $10k
      const result = computeWithdrawalTaxes(
        10000, 'single',
        0, 100000, 0,
        0, 0, 0, 0, true
      );

      expect(result.ordinary).toBe(0);
    });

    it('should not double-count base income as tax on the withdrawal', () => {
      // The function computes: tax(base + withdrawal) - tax(base) = marginal tax
      const result = computeWithdrawalTaxes(
        20000, 'single',
        0, 100000, 0,
        0, 0, 0,
        100000, // large base income
        true
      );

      // Tax should be reasonable for $20k at marginal rate above $100k
      // Should NOT include the tax on the $100k base
      expect(result.ordinary).toBeGreaterThan(0);
      expect(result.ordinary).toBeLessThan(20000); // can't be more than the withdrawal
    });
  });

  // =========================================================================
  // STATE TAX
  // =========================================================================

  describe('State tax', () => {
    it('should apply state tax to ordinary income and capital gains', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        0, 100000, 0,
        0, 5.0, // 5% state tax
        0, 0, true
      );

      // All $50k from pre-tax = ordinary income
      // State tax = $50k * 5% = $2,500
      expect(result.state).toBeCloseTo(2500, 2);
    });

    it('should not apply state tax to Roth withdrawals', () => {
      const result = computeWithdrawalTaxes(
        30000, 'single',
        0, 0, 100000,
        0, 5.0, 0, 0, true
      );

      // Roth withdrawals are not ordinary income or cap gains
      expect(result.state).toBe(0);
    });

    it('should handle 0% state tax', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        0, 100000, 0,
        0, 0, 0, 0, true
      );

      expect(result.state).toBe(0);
    });

    it('should cap state tax rate at 100%', () => {
      const result = computeWithdrawalTaxes(
        10000, 'single',
        0, 100000, 0,
        0, 150, // absurd rate, capped to 100
        0, 0, true
      );

      // State tax should be capped
      expect(result.state).toBeLessThanOrEqual(10000);
    });
  });

  // =========================================================================
  // SHORTFALL CASCADING
  // =========================================================================

  describe('Shortfall cascading', () => {
    it('should cascade to next account when one is depleted (Roth-last)', () => {
      // Need $80k but only $20k in taxable
      const result = computeWithdrawalTaxes(
        80000, 'single',
        20000,  // small taxable
        200000, // pre-tax
        100000, // Roth
        15000, 0, 0, 0, true
      );

      expect(result.draw.t).toBe(20000); // all taxable
      expect(result.draw.p).toBeCloseTo(60000, 2); // remainder from pre-tax
      expect(result.draw.r).toBe(0);
    });

    it('should handle complete portfolio depletion', () => {
      const result = computeWithdrawalTaxes(
        100000, 'single',
        10000, 15000, 5000,
        8000, 0, 0, 0, true
      );

      // Total available = $30k, can't meet $100k request
      expect(result.draw.t).toBe(10000);
      expect(result.draw.p).toBe(15000);
      expect(result.draw.r).toBe(5000);
      expect(result.draw.t + result.draw.p + result.draw.r).toBe(30000);
    });
  });

  // =========================================================================
  // NaN / UNDEFINED INPUT GUARDS
  // =========================================================================

  describe('NaN/undefined input guards', () => {
    it('should handle NaN gross amount', () => {
      const result = computeWithdrawalTaxes(
        NaN, 'single',
        100000, 100000, 100000,
        50000, 5, 0, 0
      );

      expect(result.tax).toBe(0);
      expect(result.draw.t).toBe(0);
      expect(result.draw.p).toBe(0);
      expect(result.draw.r).toBe(0);
    });

    it('should handle NaN balances', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        NaN, NaN, NaN,
        50000, 5, 0, 0
      );

      // All balances become 0, total is 0
      expect(result.tax).toBe(0);
      expect(result.draw.t).toBe(0);
    });

    it('should handle NaN basis', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        100000, 0, 0,
        NaN, 0, 0, 0, true
      );

      // Basis becomes 0, meaning 100% gains
      expect(result.draw.t).toBeCloseTo(50000, 2);
      expect(result.newBasis).toBe(0);
    });

    it('should handle NaN state tax rate', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        0, 100000, 0,
        0, NaN, 0, 0, true
      );

      expect(result.state).toBe(0);
    });

    it('should handle NaN base ordinary income', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        0, 100000, 0,
        0, 0, 0, NaN, true
      );

      // Should not crash; base income treated as 0
      expect(Number.isFinite(result.tax)).toBe(true);
    });

    it('should handle NaN minPretaxDraw', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        100000, 100000, 100000,
        50000, 0, NaN, 0, true
      );

      // Should not crash; RMD treated as 0
      expect(Number.isFinite(result.tax)).toBe(true);
    });
  });

  // =========================================================================
  // ZERO-BALANCE EDGE CASES
  // =========================================================================

  describe('Zero-balance edge cases', () => {
    it('should return zero result when all balances are zero', () => {
      const result = computeWithdrawalTaxes(
        50000, 'single',
        0, 0, 0,
        0, 5, 0, 0
      );

      expect(result.tax).toBe(0);
      expect(result.draw.t).toBe(0);
      expect(result.draw.p).toBe(0);
      expect(result.draw.r).toBe(0);
      expect(result.newBasis).toBe(0);
    });

    it('should return zero result when gross is zero', () => {
      const result = computeWithdrawalTaxes(
        0, 'single',
        100000, 100000, 100000,
        50000, 5, 0, 0
      );

      expect(result.tax).toBe(0);
      expect(result.draw.t).toBe(0);
    });

    it('should handle negative gross gracefully', () => {
      const result = computeWithdrawalTaxes(
        -50000, 'single',
        100000, 100000, 100000,
        50000, 5, 0, 0
      );

      expect(result.tax).toBe(0);
    });
  });

  // =========================================================================
  // TOTAL TAX CONSISTENCY
  // =========================================================================

  describe('Total tax consistency', () => {
    it('should have total tax equal sum of components', () => {
      const result = computeWithdrawalTaxes(
        80000, 'single',
        100000, 200000, 50000,
        60000, 5, 10000, 30000, true
      );

      const sumOfParts = result.ordinary + result.capgain + result.niit + result.state;
      expect(result.tax).toBeCloseTo(sumOfParts, 2);
    });

    it('should produce non-negative tax components', () => {
      const result = computeWithdrawalTaxes(
        60000, 'married',
        100000, 200000, 100000,
        70000, 3, 8000, 40000, true
      );

      expect(result.ordinary).toBeGreaterThanOrEqual(0);
      expect(result.capgain).toBeGreaterThanOrEqual(0);
      expect(result.niit).toBeGreaterThanOrEqual(0);
      expect(result.state).toBeGreaterThanOrEqual(0);
      expect(result.tax).toBeGreaterThanOrEqual(0);
    });
  });
});
