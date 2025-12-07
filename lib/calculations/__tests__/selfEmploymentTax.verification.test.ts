/**
 * Self-Employment Tax Verification Tests
 * Purpose: Verify 2026 SE tax calculations comply with IRS rules
 */

import { describe, it, expect } from 'vitest';
import { calculateSelfEmploymentTax } from '../selfEmployed2026';
import { SE_TAX_2026 } from '@/lib/constants/tax2026';

describe('Self-Employment Tax Verification (2026)', () => {

  // =========================================================================
  // CONSTANTS VERIFICATION
  // =========================================================================

  describe('2026 SE Tax Constants', () => {
    it('should have correct SE tax rates', () => {
      expect(SE_TAX_2026.SOCIAL_SECURITY_RATE).toBe(0.124); // 12.4%
      expect(SE_TAX_2026.MEDICARE_RATE).toBe(0.029);         // 2.9%
      expect(SE_TAX_2026.ADDITIONAL_MEDICARE_RATE).toBe(0.009); // 0.9%
    });

    it('should have correct 2026 SS wage base', () => {
      // IRS announced $184,500 for 2026
      expect(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE).toBe(184500);
    });

    it('should have correct SE tax base multiplier', () => {
      // 92.35% of net SE income
      expect(SE_TAX_2026.SE_TAX_BASE_MULTIPLIER).toBe(0.9235);
    });

    it('should have correct Additional Medicare thresholds', () => {
      expect(SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE).toBe(200000);
      expect(SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_MFJ).toBe(250000);
      expect(SE_TAX_2026.ADDITIONAL_MEDICARE_THRESHOLD_MFS).toBe(125000);
    });
  });

  // =========================================================================
  // SE TAX BASE CALCULATION (92.35%)
  // =========================================================================

  describe('SE Tax Base Calculation', () => {
    it('should calculate SE tax base as 92.35% of net SE income', () => {
      const guaranteedPayments = 100000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const expectedBase = 100000 * 0.9235;
      const calculatedBase = result.socialSecurityTax / SE_TAX_2026.SOCIAL_SECURITY_RATE;

      // Verify base is 92.35% (allowing for wage cap)
      if (guaranteedPayments <= SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE / 0.9235) {
        expect(calculatedBase).toBeCloseTo(expectedBase, 2);
      }
    });
  });

  // =========================================================================
  // SOCIAL SECURITY TAX (12.4% capped)
  // =========================================================================

  describe('Social Security Tax Calculation', () => {
    it('should calculate SS tax as 12.4% of SE base', () => {
      const guaranteedPayments = 100000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const seTaxBase = guaranteedPayments * 0.9235;
      const expectedSSTax = seTaxBase * 0.124;

      expect(result.socialSecurityTax).toBeCloseTo(expectedSSTax, 2);
    });

    it('should cap SS tax at wage base ($184,500 for 2026)', () => {
      const guaranteedPayments = 300000; // Above wage base
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const seTaxBase = guaranteedPayments * 0.9235; // $277,050
      const cappedBase = Math.min(seTaxBase, 184500);
      const expectedSSTax = cappedBase * 0.124; // $22,878

      expect(result.socialSecurityTax).toBeCloseTo(expectedSSTax, 2);
    });

    it('should not cap SS tax for income below wage base', () => {
      const guaranteedPayments = 150000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const seTaxBase = guaranteedPayments * 0.9235; // $138,525
      const expectedSSTax = seTaxBase * 0.124; // $17,177.10

      expect(result.socialSecurityTax).toBeCloseTo(expectedSSTax, 2);
    });
  });

  // =========================================================================
  // MEDICARE TAX (2.9% uncapped)
  // =========================================================================

  describe('Medicare Tax Calculation', () => {
    it('should calculate Medicare tax as 2.9% of SE base (uncapped)', () => {
      const guaranteedPayments = 100000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const seTaxBase = guaranteedPayments * 0.9235;
      const expectedMedicareTax = seTaxBase * 0.029;

      expect(result.medicareTax).toBeCloseTo(expectedMedicareTax, 2);
    });

    it('should NOT cap Medicare tax at high incomes', () => {
      const lowIncome = 100000;
      const highIncome = 500000;

      const resultLow = calculateSelfEmploymentTax(lowIncome, 'single');
      const resultHigh = calculateSelfEmploymentTax(highIncome, 'single');

      // Medicare tax should scale linearly with income (unlike SS tax)
      const ratio = highIncome / lowIncome;
      const medicareRatio = resultHigh.medicareTax / resultLow.medicareTax;

      expect(medicareRatio).toBeCloseTo(ratio, 2);
    });
  });

  // =========================================================================
  // ADDITIONAL MEDICARE TAX (0.9% over threshold)
  // =========================================================================

  describe('Additional Medicare Tax Calculation', () => {
    it('should not apply Additional Medicare Tax below threshold', () => {
      const guaranteedPayments = 150000; // Below $200k single threshold
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      expect(result.additionalMedicareTax).toBe(0);
    });

    it('should apply 0.9% Additional Medicare Tax above $200k (single)', () => {
      const guaranteedPayments = 250000; // $50k over threshold
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const expectedAdditionalTax = 50000 * 0.009; // $450

      expect(result.additionalMedicareTax).toBeCloseTo(expectedAdditionalTax, 2);
    });

    it('should apply 0.9% Additional Medicare Tax above $250k (married)', () => {
      const guaranteedPayments = 300000; // $50k over threshold
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'mfj');

      const expectedAdditionalTax = 50000 * 0.009; // $450

      expect(result.additionalMedicareTax).toBeCloseTo(expectedAdditionalTax, 2);
    });

    it('should combine SE income and spouse W-2 for Additional Medicare threshold', () => {
      const guaranteedPayments = 150000;
      const spouseW2Income = 100000; // Combined: $250k
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'mfj', spouseW2Income);

      // Married threshold is $250k, so no Additional Medicare Tax
      expect(result.additionalMedicareTax).toBe(0);
    });

    it('should apply Additional Medicare Tax when combined income exceeds threshold', () => {
      const guaranteedPayments = 150000;
      const spouseW2Income = 150000; // Combined: $300k
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'mfj', spouseW2Income);

      // Married threshold is $250k, excess is $50k
      const expectedAdditionalTax = 50000 * 0.009; // $450

      expect(result.additionalMedicareTax).toBeCloseTo(expectedAdditionalTax, 2);
    });
  });

  // =========================================================================
  // 50% SE TAX DEDUCTION
  // =========================================================================

  describe('SE Tax Deduction (50%)', () => {
    it('should calculate 50% deduction for SS and base Medicare only', () => {
      const guaranteedPayments = 100000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      const expectedDeduction = (result.socialSecurityTax + result.medicareTax) / 2;

      expect(result.deductiblePortion).toBeCloseTo(expectedDeduction, 2);
    });

    it('should NOT include Additional Medicare Tax in the 50% deduction', () => {
      const guaranteedPayments = 250000; // Above $200k threshold
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      // Deductible portion should NOT include Additional Medicare Tax
      const expectedDeduction = (result.socialSecurityTax + result.medicareTax) / 2;

      expect(result.deductiblePortion).toBeCloseTo(expectedDeduction, 2);
      expect(result.deductiblePortion).toBeLessThan(result.totalSETax / 2);
    });
  });

  // =========================================================================
  // COMPREHENSIVE INTEGRATION TESTS
  // =========================================================================

  describe('Comprehensive SE Tax Scenarios', () => {
    it('should calculate total SE tax correctly for typical self-employed person', () => {
      const guaranteedPayments = 150000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      console.log('\nTypical Self-Employed ($150k):');
      console.log(`Guaranteed Payments: $${guaranteedPayments.toLocaleString()}`);
      console.log(`SE Tax Base (92.35%): $${(guaranteedPayments * 0.9235).toLocaleString()}`);
      console.log(`Social Security Tax: $${result.socialSecurityTax.toLocaleString()}`);
      console.log(`Medicare Tax: $${result.medicareTax.toLocaleString()}`);
      console.log(`Additional Medicare: $${result.additionalMedicareTax.toLocaleString()}`);
      console.log(`Total SE Tax: $${result.totalSETax.toLocaleString()}`);
      console.log(`Deductible Portion: $${result.deductiblePortion.toLocaleString()}`);
      console.log(`Effective SE Tax Rate: ${((result.totalSETax / guaranteedPayments) * 100).toFixed(2)}%`);

      // Sanity checks
      expect(result.totalSETax).toBeGreaterThan(0);
      expect(result.totalSETax).toBeLessThan(guaranteedPayments);
      expect(result.deductiblePortion).toBeGreaterThan(0);
      expect(result.deductiblePortion).toBeLessThan(result.totalSETax);
    });

    it('should calculate SE tax at wage base cap correctly', () => {
      // Income exactly at SS wage base limit
      const atWageBase = 184500 / 0.9235; // ~$199,838
      const result = calculateSelfEmploymentTax(atWageBase, 'single');

      console.log(`\nAt SS Wage Base Cap (~$200k income):`);
      console.log(`Guaranteed Payments: $${atWageBase.toLocaleString()}`);
      console.log(`SS Tax (capped): $${result.socialSecurityTax.toLocaleString()}`);
      console.log(`Medicare Tax (uncapped): $${result.medicareTax.toLocaleString()}`);
    });

    it('should demonstrate SE tax for high earner (>$300k)', () => {
      const guaranteedPayments = 500000;
      const result = calculateSelfEmploymentTax(guaranteedPayments, 'single');

      console.log('\nHigh Earner ($500k):');
      console.log(`Guaranteed Payments: $${guaranteedPayments.toLocaleString()}`);
      console.log(`SE Tax Base: $${(guaranteedPayments * 0.9235).toLocaleString()}`);
      console.log(`Social Security Tax (CAPPED): $${result.socialSecurityTax.toLocaleString()}`);
      console.log(`Medicare Tax: $${result.medicareTax.toLocaleString()}`);
      console.log(`Additional Medicare: $${result.additionalMedicareTax.toLocaleString()}`);
      console.log(`Total SE Tax: $${result.totalSETax.toLocaleString()}`);
      console.log(`Effective Rate: ${((result.totalSETax / guaranteedPayments) * 100).toFixed(2)}%`);

      // At high income, SS tax should be capped
      const maxSSTax = 184500 * 0.124;
      expect(result.socialSecurityTax).toBeCloseTo(maxSSTax, 2);
    });
  });
});
