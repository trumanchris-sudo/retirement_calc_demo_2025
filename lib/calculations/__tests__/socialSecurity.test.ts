/**
 * Unit tests for Social Security calculation functions
 */

import { describe, it, expect } from 'vitest';
import {
  calcPIA,
  adjustSSForClaimAge,
  calcSocialSecurity,
  calculateEffectiveSS,
  applyEarningsTest,
  calculateSSTaxableAmount,
} from '../shared/socialSecurity';

describe('Social Security Calculations', () => {

  // =========================================================================
  // calcPIA — Primary Insurance Amount (bend point formula)
  // =========================================================================

  describe('calcPIA', () => {
    it('should return 0 for zero income', () => {
      expect(calcPIA(0)).toBe(0);
    });

    it('should return 0 for negative income', () => {
      expect(calcPIA(-50000)).toBe(0);
    });

    it('should apply 90% factor for AIME below first bend point ($1,286/mo)', () => {
      // $12,000/yr = $1,000/mo AIME — entirely in the 90% band
      const pia = calcPIA(12000);
      expect(pia).toBeCloseTo(1000 * 0.90, 2);
    });

    it('should apply 90%/32% factors for AIME between bend points', () => {
      // $60,000/yr = $5,000/mo AIME
      // First $1,286 at 90% = $1,157.40
      // Next ($5,000 - $1,286) = $3,714 at 32% = $1,188.48
      // Total PIA = $2,345.88
      const pia = calcPIA(60000);
      const expected = 1286 * 0.90 + (5000 - 1286) * 0.32;
      expect(pia).toBeCloseTo(expected, 2);
    });

    it('should apply all three factors for AIME above second bend point ($7,749/mo)', () => {
      // $120,000/yr = $10,000/mo AIME
      // First $1,286 at 90% = $1,157.40
      // Next ($7,749 - $1,286) = $6,463 at 32% = $2,068.16
      // Next ($10,000 - $7,749) = $2,251 at 15% = $337.65
      // Total PIA = $3,563.21
      const pia = calcPIA(120000);
      const expected = 1286 * 0.90 + (7749 - 1286) * 0.32 + (10000 - 7749) * 0.15;
      expect(pia).toBeCloseTo(expected, 2);
    });

    it('should return monthly PIA (not annual)', () => {
      // Even a small income produces a small monthly amount
      const pia = calcPIA(6000); // $500/mo AIME
      expect(pia).toBeCloseTo(500 * 0.90, 2);
      expect(pia).toBeLessThan(500); // PIA < AIME
    });

    it('should handle income at exactly the first bend point', () => {
      const annualIncome = 1286 * 12; // AIME = $1,286 exactly
      const pia = calcPIA(annualIncome);
      expect(pia).toBeCloseTo(1286 * 0.90, 2);
    });

    it('should handle income at exactly the second bend point', () => {
      const annualIncome = 7749 * 12; // AIME = $7,749 exactly
      const pia = calcPIA(annualIncome);
      const expected = 1286 * 0.90 + (7749 - 1286) * 0.32;
      expect(pia).toBeCloseTo(expected, 2);
    });
  });

  // =========================================================================
  // adjustSSForClaimAge — early/delayed claiming adjustments
  // =========================================================================

  describe('adjustSSForClaimAge', () => {
    it('should return 0 for zero PIA', () => {
      expect(adjustSSForClaimAge(0, 67, 67)).toBe(0);
    });

    it('should return 0 for negative PIA', () => {
      expect(adjustSSForClaimAge(-100, 67, 67)).toBe(0);
    });

    it('should return full PIA when claiming at FRA', () => {
      const pia = 2000;
      expect(adjustSSForClaimAge(pia, 67, 67)).toBeCloseTo(2000, 2);
    });

    it('should reduce benefit for claiming at age 62 (60 months early)', () => {
      const pia = 2000;
      // 60 months early: first 36 months at 5/9 of 1%, remaining 24 at 5/12 of 1%
      // Reduction: 36 * (5/9/100) + 24 * (5/12/100) = 0.20 + 0.10 = 0.30
      // Factor: 1 - 0.30 = 0.70
      const adjusted = adjustSSForClaimAge(pia, 62, 67);
      const expectedFactor = 1 - (36 * 5 / 9 / 100) - (24 * 5 / 12 / 100);
      expect(adjusted).toBeCloseTo(pia * expectedFactor, 2);
    });

    it('should reduce benefit for claiming at age 64 (36 months early)', () => {
      const pia = 2000;
      // 36 months early: all in the 5/9 of 1% band
      // Reduction: 36 * (5/9/100) = 0.20
      // Factor: 0.80
      const adjusted = adjustSSForClaimAge(pia, 64, 67);
      const expectedFactor = 1 - (36 * 5 / 9 / 100);
      expect(adjusted).toBeCloseTo(pia * expectedFactor, 2);
    });

    it('should reduce benefit for claiming at age 65 (24 months early)', () => {
      const pia = 2000;
      // 24 months early, within first 36 months
      const adjusted = adjustSSForClaimAge(pia, 65, 67);
      const expectedFactor = 1 - (24 * 5 / 9 / 100);
      expect(adjusted).toBeCloseTo(pia * expectedFactor, 2);
    });

    it('should increase benefit for delayed claiming at age 70', () => {
      const pia = 2000;
      // 36 months delayed: 36 * (2/3/100) = 0.24
      // Factor: 1.24
      const adjusted = adjustSSForClaimAge(pia, 70, 67);
      const expectedFactor = 1 + (36 * 2 / 3 / 100);
      expect(adjusted).toBeCloseTo(pia * expectedFactor, 2);
    });

    it('should increase benefit by 8% per year of delayed claiming', () => {
      const pia = 2000;
      // 1 year delayed = 12 months * (2/3 / 100) = 8% per year
      const adjusted = adjustSSForClaimAge(pia, 68, 67);
      expect(adjusted).toBeCloseTo(pia * 1.08, 2);
    });

    it('should use default FRA of 67 when not specified', () => {
      const pia = 2000;
      const withDefault = adjustSSForClaimAge(pia, 70);
      const withExplicit = adjustSSForClaimAge(pia, 70, 67);
      expect(withDefault).toBeCloseTo(withExplicit, 2);
    });
  });

  // =========================================================================
  // calcSocialSecurity — end-to-end annual benefit
  // =========================================================================

  describe('calcSocialSecurity', () => {
    it('should return 0 for zero income', () => {
      expect(calcSocialSecurity(0, 67, 67)).toBe(0);
    });

    it('should return 0 for negative income', () => {
      expect(calcSocialSecurity(-50000, 67, 67)).toBe(0);
    });

    it('should return annual benefit (12x monthly)', () => {
      const annual = calcSocialSecurity(60000, 67, 67);
      const pia = calcPIA(60000);
      expect(annual).toBeCloseTo(pia * 12, 2);
    });

    it('should reduce annual benefit for early claiming', () => {
      const atFRA = calcSocialSecurity(80000, 67, 67);
      const early = calcSocialSecurity(80000, 62, 67);
      expect(early).toBeLessThan(atFRA);
      expect(early).toBeGreaterThan(0);
    });

    it('should increase annual benefit for delayed claiming', () => {
      const atFRA = calcSocialSecurity(80000, 67, 67);
      const delayed = calcSocialSecurity(80000, 70, 67);
      expect(delayed).toBeGreaterThan(atFRA);
    });

    it('should produce realistic benefit for median income at FRA', () => {
      // ~$60k average income, claiming at 67
      const annual = calcSocialSecurity(60000, 67, 67);
      // Median SS benefit is roughly $20k-$30k/year
      expect(annual).toBeGreaterThan(15000);
      expect(annual).toBeLessThan(45000);
    });
  });

  // =========================================================================
  // calculateEffectiveSS — spousal benefit logic
  // =========================================================================

  describe('calculateEffectiveSS', () => {
    it('should return own benefit when it exceeds spousal benefit', () => {
      // High earner: own PIA $2,500, spouse PIA $1,000
      // Own benefit at FRA = $2,500
      // Spousal benefit = $1,000 * 0.5 = $500
      // Should get own benefit
      const effective = calculateEffectiveSS(2500, 1000, 67, 67);
      expect(effective).toBeCloseTo(2500, 2);
    });

    it('should return spousal benefit when it exceeds own benefit', () => {
      // Low earner: own PIA $500, spouse PIA $3,000
      // Own benefit at FRA = $500
      // Spousal benefit = $3,000 * 0.5 = $1,500
      // Should get spousal benefit
      const effective = calculateEffectiveSS(500, 3000, 67, 67);
      expect(effective).toBeCloseTo(1500, 2);
    });

    it('should reduce spousal benefit for early claiming', () => {
      // Low earner claims at 62 with FRA 67
      const atFRA = calculateEffectiveSS(500, 3000, 67, 67);
      const early = calculateEffectiveSS(500, 3000, 62, 67);
      expect(early).toBeLessThan(atFRA);
    });

    it('should NOT increase spousal benefit for delayed claiming past FRA', () => {
      // Spousal benefits cap at FRA — no delayed credits
      const atFRA = calculateEffectiveSS(500, 3000, 67, 67);
      const delayed = calculateEffectiveSS(500, 3000, 70, 67);
      // The spousal benefit stays the same, but own benefit increases
      // Since own PIA is $500, even with 24% increase = $620, still < $1,500 spousal
      // So effective should still be the spousal benefit of $1,500
      expect(delayed).toBeCloseTo(1500, 2);
    });

    it('should give own benefit with delayed credits when they surpass spousal', () => {
      // Own PIA $1,400, spouse PIA $3,000 → spousal = $1,500
      // At 70 with 24% increase: $1,400 * 1.24 = $1,736 > $1,500
      const effective = calculateEffectiveSS(1400, 3000, 70, 67);
      const ownBenefit = adjustSSForClaimAge(1400, 70, 67);
      expect(effective).toBeCloseTo(ownBenefit, 2);
      expect(effective).toBeGreaterThan(1500);
    });

    it('should apply spousal reduction formula for early claiming (25/36 of 1%)', () => {
      // Claim at 64, which is 36 months early
      // Spousal reduction: 36 * (25/36) / 100 = 25%
      const effective = calculateEffectiveSS(0, 4000, 64, 67);
      const expectedSpousal = 4000 * 0.5 * (1 - 36 * (25 / 36) / 100);
      expect(effective).toBeCloseTo(expectedSpousal, 2);
    });

    it('should handle zero own PIA (non-working spouse)', () => {
      const effective = calculateEffectiveSS(0, 3000, 67, 67);
      // Spousal benefit = $3,000 * 0.5 = $1,500
      expect(effective).toBeCloseTo(1500, 2);
    });

    it('should handle zero spouse PIA', () => {
      const effective = calculateEffectiveSS(2000, 0, 67, 67);
      // No spousal benefit, just own
      expect(effective).toBeCloseTo(2000, 2);
    });
  });

  // =========================================================================
  // applyEarningsTest — pre-FRA earnings reduction
  // =========================================================================

  describe('applyEarningsTest', () => {
    it('should not reduce benefits at or past FRA', () => {
      const benefit = applyEarningsTest(30000, 100000, 67, 67);
      expect(benefit).toBe(30000);
    });

    it('should not reduce benefits past FRA', () => {
      const benefit = applyEarningsTest(30000, 100000, 70, 67);
      expect(benefit).toBe(30000);
    });

    it('should not reduce when no earned income', () => {
      const benefit = applyEarningsTest(30000, 0, 63, 67);
      expect(benefit).toBe(30000);
    });

    it('should return 0 for zero benefit', () => {
      expect(applyEarningsTest(0, 50000, 63, 67)).toBe(0);
    });

    it('should not reduce when earnings are below exempt amount ($23,400)', () => {
      const benefit = applyEarningsTest(30000, 20000, 63, 67);
      expect(benefit).toBe(30000);
    });

    it('should reduce $1 for every $2 over exempt amount (under FRA)', () => {
      // Age 63, earning $33,400 = $10,000 over $23,400 exempt
      // Reduction = $10,000 * 0.5 = $5,000
      const benefit = applyEarningsTest(30000, 33400, 63, 67);
      expect(benefit).toBeCloseTo(25000, 2);
    });

    it('should not reduce below $0', () => {
      // Massive earnings, small benefit
      const benefit = applyEarningsTest(5000, 500000, 63, 67);
      expect(benefit).toBe(0);
    });

    it('should handle earnings at exactly the exempt amount', () => {
      const benefit = applyEarningsTest(30000, 23400, 63, 67);
      expect(benefit).toBe(30000);
    });

    it('should use higher exempt amount ($62,160) in FRA year with $1-for-$3 reduction', () => {
      // Age 66 with FRA 67 — this is the year reaching FRA
      // Earning $72,160 = $10,000 over $62,160 exempt
      // Reduction = $10,000 * (1/3) = $3,333.33
      const benefit = applyEarningsTest(30000, 72160, 66, 67);
      expect(benefit).toBeCloseTo(30000 - 10000 / 3, 0);
    });

    it('should use default FRA of 67', () => {
      const withDefault = applyEarningsTest(30000, 33400, 63);
      const withExplicit = applyEarningsTest(30000, 33400, 63, 67);
      expect(withDefault).toBeCloseTo(withExplicit, 2);
    });
  });

  // =========================================================================
  // calculateSSTaxableAmount — IRS taxation tiers
  // =========================================================================

  describe('calculateSSTaxableAmount', () => {
    it('should return 0 for zero SS benefit', () => {
      expect(calculateSSTaxableAmount(0, 50000, 'single')).toBe(0);
    });

    it('should return 0 for negative SS benefit', () => {
      expect(calculateSSTaxableAmount(-5000, 50000, 'single')).toBe(0);
    });

    it('should return 0 when combined income is below tier 1 (single: $25,000)', () => {
      // SS = $20,000, other income = $10,000
      // Combined = $10,000 + $20,000 * 0.5 = $20,000 < $25,000
      const taxable = calculateSSTaxableAmount(20000, 10000, 'single');
      expect(taxable).toBe(0);
    });

    it('should return 0 when combined income is below tier 1 (married: $32,000)', () => {
      // SS = $30,000, other income = $10,000
      // Combined = $10,000 + $30,000 * 0.5 = $25,000 < $32,000
      const taxable = calculateSSTaxableAmount(30000, 10000, 'married');
      expect(taxable).toBe(0);
    });

    it('should tax up to 50% of SS between tier 1 and tier 2 (single)', () => {
      // SS = $20,000, other income = $20,000
      // Combined = $20,000 + $20,000 * 0.5 = $30,000
      // Between $25,000 and $34,000
      // Taxable = min(50% of SS, 50% of excess over tier1)
      //         = min($10,000, 50% * ($30,000 - $25,000)) = min($10,000, $2,500)
      //         = $2,500
      const taxable = calculateSSTaxableAmount(20000, 20000, 'single');
      expect(taxable).toBeCloseTo(2500, 2);
    });

    it('should tax up to 85% of SS above tier 2 (single)', () => {
      // SS = $30,000, other income = $60,000
      // Combined = $60,000 + $30,000 * 0.5 = $75,000 > $34,000
      // Tier 1 portion: ($34,000 - $25,000) * 0.5 = $4,500
      // Tier 2 excess: ($75,000 - $34,000) * 0.85 = $34,850
      // Total = min(85% of SS, $4,500 + $34,850) = min($25,500, $39,350) = $25,500
      const taxable = calculateSSTaxableAmount(30000, 60000, 'single');
      expect(taxable).toBeCloseTo(25500, 2);
    });

    it('should cap taxable amount at 85% of SS benefit', () => {
      // Very high other income — should cap at 85%
      const taxable = calculateSSTaxableAmount(20000, 500000, 'single');
      expect(taxable).toBeCloseTo(20000 * 0.85, 2);
    });

    it('should use married thresholds correctly', () => {
      // Same income but married has higher thresholds → less taxable
      const singleTaxable = calculateSSTaxableAmount(25000, 30000, 'single');
      const marriedTaxable = calculateSSTaxableAmount(25000, 30000, 'married');
      expect(marriedTaxable).toBeLessThan(singleTaxable);
    });

    it('should handle combined income at exactly tier 1', () => {
      // Combined income exactly at $25,000 for single
      // SS = $10,000, other = $20,000 → combined = $20,000 + $5,000 = $25,000
      const taxable = calculateSSTaxableAmount(10000, 20000, 'single');
      expect(taxable).toBe(0);
    });

    it('should handle combined income at exactly tier 2 (single)', () => {
      // SS = $20,000, other = $24,000 → combined = $24,000 + $10,000 = $34,000
      // At tier2 boundary: taxable = min(50% of SS, 50% * ($34,000 - $25,000))
      //                             = min($10,000, $4,500) = $4,500
      const taxable = calculateSSTaxableAmount(20000, 24000, 'single');
      expect(taxable).toBeCloseTo(4500, 2);
    });

    it('should handle zero other income', () => {
      // SS = $40,000, other = $0 → combined = $20,000 < $25,000
      const taxable = calculateSSTaxableAmount(40000, 0, 'single');
      expect(taxable).toBe(0);
    });
  });
});
