/**
 * Unit tests for Required Minimum Distribution (RMD) calculations
 */

import { describe, it, expect } from 'vitest';
import { calcRMD } from '../shared/rmd';

describe('RMD Calculations', () => {

  describe('calcRMD', () => {
    it('should return 0 for ages below RMD start age (73)', () => {
      expect(calcRMD(500000, 72)).toBe(0);
      expect(calcRMD(500000, 60)).toBe(0);
      expect(calcRMD(500000, 0)).toBe(0);
    });

    it('should return 0 for zero balance', () => {
      expect(calcRMD(0, 75)).toBe(0);
    });

    it('should return 0 for negative balance', () => {
      expect(calcRMD(-100000, 75)).toBe(0);
    });

    it('should calculate RMD at age 73 using divisor 26.5', () => {
      const rmd = calcRMD(500000, 73);
      expect(rmd).toBeCloseTo(500000 / 26.5, 2);
    });

    it('should calculate RMD at age 75 using divisor 24.6', () => {
      const rmd = calcRMD(1000000, 75);
      expect(rmd).toBeCloseTo(1000000 / 24.6, 2);
    });

    it('should calculate RMD at age 80 using divisor 20.2', () => {
      const rmd = calcRMD(800000, 80);
      expect(rmd).toBeCloseTo(800000 / 20.2, 2);
    });

    it('should calculate RMD at age 90 using divisor 12.2', () => {
      const rmd = calcRMD(600000, 90);
      expect(rmd).toBeCloseTo(600000 / 12.2, 2);
    });

    it('should increase RMD percentage as age increases', () => {
      const balance = 1000000;
      const rmd73 = calcRMD(balance, 73);
      const rmd80 = calcRMD(balance, 80);
      const rmd90 = calcRMD(balance, 90);

      // Older age → smaller divisor → larger RMD
      expect(rmd80).toBeGreaterThan(rmd73);
      expect(rmd90).toBeGreaterThan(rmd80);
    });

    it('should use fallback divisor of 2.0 for ages beyond 120', () => {
      const rmd = calcRMD(100000, 125);
      expect(rmd).toBeCloseTo(100000 / 2.0, 2);
    });

    it('should calculate RMD at age 120 using divisor 2.0', () => {
      const rmd = calcRMD(100000, 120);
      expect(rmd).toBeCloseTo(100000 / 2.0, 2);
    });

    it('should handle very large balances', () => {
      const rmd = calcRMD(10000000, 73);
      expect(rmd).toBeCloseTo(10000000 / 26.5, 2);
    });

    it('should handle very small balances', () => {
      const rmd = calcRMD(100, 73);
      expect(rmd).toBeCloseTo(100 / 26.5, 2);
    });

    it('should return 0 at age 72 (one year before RMD starts)', () => {
      expect(calcRMD(1000000, 72)).toBe(0);
    });

    it('should start requiring distributions at exactly age 73', () => {
      expect(calcRMD(1000000, 72)).toBe(0);
      expect(calcRMD(1000000, 73)).toBeGreaterThan(0);
    });
  });
});
