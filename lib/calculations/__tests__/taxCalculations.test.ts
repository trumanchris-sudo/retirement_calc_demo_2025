/**
 * Unit tests for tax calculations
 */

import { describe, it, expect } from 'vitest';
import { calcOrdinaryTax, calcLTCGTax, calcNIIT } from '../taxCalculations';

describe('Tax Calculations', () => {
  describe('calcOrdinaryTax', () => {
    it('should return 0 for zero or negative income', () => {
      expect(calcOrdinaryTax(0, 'single')).toBe(0);
      expect(calcOrdinaryTax(-1000, 'single')).toBe(0);
      expect(calcOrdinaryTax(0, 'married')).toBe(0);
    });

    it('should calculate single filer tax correctly with standard deduction', () => {
      // For single filer with $50,000 income
      // Standard deduction reduces taxable income
      const tax = calcOrdinaryTax(50000, 'single');
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(50000); // Tax should be less than income
    });

    it('should calculate married filer tax correctly', () => {
      // Married filers get higher standard deduction
      const singleTax = calcOrdinaryTax(100000, 'single');
      const marriedTax = calcOrdinaryTax(100000, 'married');

      // Married filing should generally have lower tax on same income
      expect(marriedTax).toBeLessThan(singleTax);
    });

    it('should apply progressive tax brackets correctly', () => {
      // Higher income should have higher effective tax rate
      const tax1 = calcOrdinaryTax(50000, 'single');
      const tax2 = calcOrdinaryTax(100000, 'single');
      const tax3 = calcOrdinaryTax(200000, 'single');

      // Verify progressive taxation
      expect(tax2 / 100000).toBeGreaterThan(tax1 / 50000);
      expect(tax3 / 200000).toBeGreaterThan(tax2 / 100000);
    });

    it('should handle very high incomes', () => {
      const tax = calcOrdinaryTax(1000000, 'single');
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(1000000);
      // Top marginal rate should kick in
      expect(tax / 1000000).toBeGreaterThan(0.30);
    });
  });

  describe('calcLTCGTax', () => {
    it('should return 0 for zero or negative capital gains', () => {
      expect(calcLTCGTax(0, 'single', 50000)).toBe(0);
      expect(calcLTCGTax(-5000, 'single', 50000)).toBe(0);
    });

    it('should calculate 0% capital gains rate for low income', () => {
      // Low ordinary income should result in 0% LTCG rate
      const tax = calcLTCGTax(10000, 'single', 20000);
      expect(tax).toBe(0);
    });

    it('should calculate 15% capital gains rate for middle income', () => {
      // Middle income should result in 15% LTCG rate
      const gain = 50000;
      const tax = calcLTCGTax(gain, 'single', 80000);
      expect(tax).toBeGreaterThan(0);
      expect(tax).toBeLessThan(gain * 0.20); // Less than 20% rate
    });

    it('should calculate 20% capital gains rate for high income', () => {
      // High ordinary income should push into 20% LTCG bracket
      const gain = 100000;
      const tax = calcLTCGTax(gain, 'single', 500000);
      // At very high income, should be at or near 20% rate
      expect(tax).toBeGreaterThanOrEqual(gain * 0.15); // At least 15% rate
      expect(tax).toBeLessThanOrEqual(gain * 0.20); // At most 20% rate
    });

    it('should account for ordinary income when determining LTCG bracket', () => {
      const gain = 50000;
      const lowIncomeTax = calcLTCGTax(gain, 'single', 30000);
      const highIncomeTax = calcLTCGTax(gain, 'single', 300000);

      // Higher ordinary income should result in higher LTCG tax
      expect(highIncomeTax).toBeGreaterThan(lowIncomeTax);
    });

    it('should handle married filing status differently', () => {
      const gain = 100000;
      const ordinaryIncome = 100000;

      const singleTax = calcLTCGTax(gain, 'single', ordinaryIncome);
      const marriedTax = calcLTCGTax(gain, 'married', ordinaryIncome);

      // Married brackets are wider, so tax may be lower
      expect(marriedTax).toBeLessThanOrEqual(singleTax);
    });
  });

  describe('calcNIIT', () => {
    it('should return 0 for zero or negative investment income', () => {
      expect(calcNIIT(0, 'single', 300000)).toBe(0);
      expect(calcNIIT(-10000, 'single', 300000)).toBe(0);
    });

    it('should return 0 when MAGI is below threshold', () => {
      // Below NIIT threshold
      expect(calcNIIT(50000, 'single', 150000)).toBe(0);
      expect(calcNIIT(50000, 'married', 200000)).toBe(0);
    });

    it('should calculate 3.8% NIIT when above threshold', () => {
      // Single filer threshold is $200,000
      // MAGI of $250,000 with $50,000 investment income
      const investmentIncome = 50000;
      const magi = 250000;
      const tax = calcNIIT(investmentIncome, 'single', magi);

      // Should be 3.8% of the lesser of:
      // 1. Investment income ($50,000)
      // 2. Excess over threshold ($50,000)
      // So 3.8% of $50,000
      expect(tax).toBeCloseTo(50000 * 0.038, 2);
    });

    it('should cap NIIT at investment income amount', () => {
      // Investment income is less than excess over threshold
      const investmentIncome = 20000;
      const magi = 300000; // $100k over threshold for single
      const tax = calcNIIT(investmentIncome, 'single', magi);

      // Should be 3.8% of investment income, not excess
      expect(tax).toBeCloseTo(20000 * 0.038, 2);
    });

    it('should use different thresholds for married filers', () => {
      const investmentIncome = 50000;
      const magi = 260000; // Just over single threshold, just over married threshold

      const singleTax = calcNIIT(investmentIncome, 'single', magi);
      const marriedTax = calcNIIT(investmentIncome, 'married', magi);

      // Both should have NIIT, but different amounts
      expect(singleTax).toBeGreaterThan(0);
      expect(marriedTax).toBeGreaterThan(0);
      // Single has lower threshold, so higher NIIT
      expect(singleTax).toBeGreaterThan(marriedTax);
    });

    it('should handle edge case at exact threshold', () => {
      // At exactly the threshold, no NIIT
      const investmentIncome = 50000;
      const threshold = 200000; // Single threshold

      expect(calcNIIT(investmentIncome, 'single', threshold)).toBe(0);
      expect(calcNIIT(investmentIncome, 'single', threshold + 1)).toBeGreaterThan(0);
    });
  });

  describe('Integration Tests', () => {
    it('should calculate realistic retiree tax scenario', () => {
      // Retiree with $80k ordinary income, $30k capital gains
      const ordinaryIncome = 80000;
      const capitalGains = 30000;

      const ordinaryTax = calcOrdinaryTax(ordinaryIncome, 'single');
      const ltcgTax = calcLTCGTax(capitalGains, 'single', ordinaryIncome);
      const niit = calcNIIT(capitalGains, 'single', ordinaryIncome + capitalGains);

      const totalTax = ordinaryTax + ltcgTax + niit;

      // Sanity checks
      expect(totalTax).toBeGreaterThan(0);
      expect(totalTax).toBeLessThan(ordinaryIncome + capitalGains);
      expect(ordinaryTax).toBeGreaterThan(ltcgTax); // Ordinary income taxed higher
    });

    it('should calculate high-income retiree scenario with NIIT', () => {
      // High-income retiree with $150k ordinary, $120k capital gains
      // MAGI of $270k is above married threshold of $250k
      const ordinaryIncome = 150000;
      const capitalGains = 120000;
      const magi = ordinaryIncome + capitalGains;

      const ordinaryTax = calcOrdinaryTax(ordinaryIncome, 'married');
      const ltcgTax = calcLTCGTax(capitalGains, 'married', ordinaryIncome);
      const niit = calcNIIT(capitalGains, 'married', magi);

      // High income should trigger NIIT (MAGI $270k > $250k threshold)
      expect(niit).toBeGreaterThan(0);

      const totalTax = ordinaryTax + ltcgTax + niit;
      expect(totalTax).toBeLessThan(magi * 0.40); // Effective rate under 40%
    });
  });
});
