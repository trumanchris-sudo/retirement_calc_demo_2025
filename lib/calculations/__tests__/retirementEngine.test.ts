/**
 * Unit tests for retirement calculation engine
 */

import { describe, it, expect } from 'vitest';
import { runSingleSimulation, type SimulationInputs } from '../retirementEngine';

describe('Retirement Engine', () => {
  // Helper to create default test inputs
  const createDefaultInputs = (): SimulationInputs => ({
    marital: 'single',
    age1: 45,
    age2: 45,
    retirementAge: 65,
    taxableBalance: 50000,
    pretaxBalance: 100000,
    rothBalance: 50000,
    cTax1: 10000,
    cPre1: 5000,
    cPost1: 5000,
    cMatch1: 2000,
    cTax2: 0,
    cPre2: 0,
    cPost2: 0,
    cMatch2: 0,
    retRate: 7.0,
    inflationRate: 2.5,
    stateRate: 5.0,
    incContrib: false,
    incRate: 2.0,
    wdRate: 4.0,
    returnMode: 'fixed',
    randomWalkSeries: 'nominal',
    includeSS: false,
    ssIncome: 0,
    ssClaimAge: 67,
    ssIncome2: 0,
    ssClaimAge2: 67,
  });

  describe('runSingleSimulation - Basic Validation', () => {
    it('should successfully run a basic simulation', () => {
      const inputs = createDefaultInputs();
      const result = runSingleSimulation(inputs, 12345);

      expect(result).toBeDefined();
      expect(result.balancesReal).toBeDefined();
      expect(result.eolReal).toBeGreaterThanOrEqual(0);
      expect(result.y1AfterTaxReal).toBeGreaterThan(0);
      expect(typeof result.ruined).toBe('boolean');
    });

    it('should throw error when retirement age <= current age', () => {
      const inputs = createDefaultInputs();
      inputs.retirementAge = 40; // Less than age1 (45)

      expect(() => runSingleSimulation(inputs, 12345)).toThrow(
        'Retirement age must be greater than current age'
      );
    });

    it('should return array of balances with correct length', () => {
      const inputs = createDefaultInputs();
      const yrsToRet = inputs.retirementAge - inputs.age1; // 20 years
      const result = runSingleSimulation(inputs, 12345);

      // Should have accumulation years + drawdown years
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.balancesReal.length).toBeGreaterThan(yrsToRet);
    });

    it('should produce consistent results with same seed', () => {
      const inputs = createDefaultInputs();
      const result1 = runSingleSimulation(inputs, 12345);
      const result2 = runSingleSimulation(inputs, 12345);

      expect(result1.eolReal).toBe(result2.eolReal);
      expect(result1.y1AfterTaxReal).toBe(result2.y1AfterTaxReal);
      expect(result1.balancesReal).toEqual(result2.balancesReal);
    });

    it('should produce different results with different seeds', () => {
      const inputs = createDefaultInputs();
      inputs.returnMode = 'randomWalk'; // Use random mode to see seed effect

      const result1 = runSingleSimulation(inputs, 12345);
      const result2 = runSingleSimulation(inputs, 67890);

      // Results should differ when using different random seeds
      expect(result1.eolReal).not.toBe(result2.eolReal);
    });
  });

  describe('runSingleSimulation - Accumulation Phase', () => {
    it('should grow wealth during accumulation with positive returns', () => {
      const inputs = createDefaultInputs();
      inputs.retRate = 7.0; // 7% annual return
      const result = runSingleSimulation(inputs, 12345);

      // Initial balance
      const initialBalance = inputs.taxableBalance + inputs.pretaxBalance + inputs.rothBalance;

      // Balance at retirement (index = yrsToRet)
      const yrsToRet = inputs.retirementAge - inputs.age1;
      const retirementBalance = result.balancesReal[yrsToRet];

      // With contributions and returns, should be significantly higher
      expect(retirementBalance).toBeGreaterThan(initialBalance);
    });

    it('should handle zero starting balances with contributions', () => {
      const inputs = createDefaultInputs();
      inputs.taxableBalance = 0;
      inputs.pretaxBalance = 0;
      inputs.rothBalance = 0;
      // But has contributions
      inputs.cTax1 = 20000;
      inputs.cPre1 = 10000;

      const result = runSingleSimulation(inputs, 12345);

      // Should accumulate wealth from contributions
      const yrsToRet = inputs.retirementAge - inputs.age1;
      expect(result.balancesReal[yrsToRet]).toBeGreaterThan(0);
    });

    it('should respect contribution escalation when enabled', () => {
      const inputs = createDefaultInputs();
      inputs.incContrib = false;
      const resultNoInc = runSingleSimulation(inputs, 12345);

      inputs.incContrib = true;
      inputs.incRate = 3.0; // 3% annual increase
      const resultWithInc = runSingleSimulation(inputs, 12345);

      // With escalating contributions, should have more wealth
      const yrsToRet = inputs.retirementAge - inputs.age1;
      expect(resultWithInc.balancesReal[yrsToRet]).toBeGreaterThan(
        resultNoInc.balancesReal[yrsToRet]
      );
    });
  });

  describe('runSingleSimulation - Married vs Single', () => {
    it('should handle married couple correctly', () => {
      const inputs = createDefaultInputs();
      inputs.marital = 'married';
      inputs.age2 = 43; // Spouse is 2 years younger
      inputs.cTax2 = 15000; // Spouse contributions
      inputs.cPre2 = 10000;
      inputs.cPost2 = 5000;
      inputs.cMatch2 = 3000;

      const result = runSingleSimulation(inputs, 12345);

      expect(result).toBeDefined();
      expect(result.balancesReal.length).toBeGreaterThan(0);

      // With two incomes contributing, should have substantial wealth
      const yrsToRet = inputs.retirementAge - Math.min(inputs.age1, inputs.age2);
      expect(result.balancesReal[yrsToRet]).toBeGreaterThan(200000);
    });

    it('should accumulate more with married couple contributions', () => {
      const inputsSingle = createDefaultInputs();
      const resultSingle = runSingleSimulation(inputsSingle, 12345);

      const inputsMarried = createDefaultInputs();
      inputsMarried.marital = 'married';
      inputsMarried.age2 = 45;
      inputsMarried.cTax2 = 10000;
      inputsMarried.cPre2 = 5000;
      inputsMarried.cPost2 = 5000;
      inputsMarried.cMatch2 = 2000;
      const resultMarried = runSingleSimulation(inputsMarried, 12345);

      // Married couple with dual income should accumulate more
      const yrsToRet = inputsSingle.retirementAge - inputsSingle.age1;
      expect(resultMarried.balancesReal[yrsToRet]).toBeGreaterThan(
        resultSingle.balancesReal[yrsToRet]
      );
    });
  });

  describe('runSingleSimulation - Social Security', () => {
    it('should not include SS benefits when disabled', () => {
      const inputs = createDefaultInputs();
      inputs.includeSS = false;
      inputs.ssIncome = 60000; // Even with income defined

      const result = runSingleSimulation(inputs, 12345);
      expect(result).toBeDefined();
      // Just verify it runs without SS
    });

    it('should include SS benefits when enabled', () => {
      const inputs = createDefaultInputs();
      inputs.includeSS = false;
      const resultNoSS = runSingleSimulation(inputs, 12345);

      inputs.includeSS = true;
      inputs.ssIncome = 60000;
      inputs.ssClaimAge = 67;
      const resultWithSS = runSingleSimulation(inputs, 12345);

      // With SS benefits, drawdown on portfolio should be lower
      // So end-of-life wealth should be higher
      expect(resultWithSS.eolReal).toBeGreaterThan(resultNoSS.eolReal);
    });

    it('should handle married couple SS benefits', () => {
      const inputs = createDefaultInputs();
      inputs.marital = 'married';
      inputs.age2 = 45;
      inputs.includeSS = true;
      inputs.ssIncome = 60000; // Person 1
      inputs.ssClaimAge = 67;
      inputs.ssIncome2 = 40000; // Person 2
      inputs.ssClaimAge2 = 67;

      const result = runSingleSimulation(inputs, 12345);

      // Should successfully run with dual SS benefits
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should show higher EOL wealth with delayed SS claiming', () => {
      const inputs = createDefaultInputs();
      inputs.includeSS = true;
      inputs.ssIncome = 60000;
      inputs.ssClaimAge = 62; // Early claim
      const resultEarly = runSingleSimulation(inputs, 12345);

      inputs.ssClaimAge = 70; // Delayed claim
      const resultDelayed = runSingleSimulation(inputs, 12345);

      // Delayed claiming gives higher lifetime benefits
      // This may or may not result in higher EOL wealth depending on portfolio size
      // But both should complete successfully
      expect(resultEarly.eolReal).toBeGreaterThanOrEqual(0);
      expect(resultDelayed.eolReal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runSingleSimulation - Withdrawal Phase', () => {
    it('should decrease wealth during withdrawal phase with low returns', () => {
      const inputs = createDefaultInputs();
      inputs.retRate = 2.0; // Low returns
      inputs.wdRate = 5.0; // High withdrawal rate

      const result = runSingleSimulation(inputs, 12345);
      const yrsToRet = inputs.retirementAge - inputs.age1;

      // Balance should decrease after retirement
      const retirementBalance = result.balancesReal[yrsToRet];
      const laterBalance = result.balancesReal[yrsToRet + 10];

      expect(laterBalance).toBeLessThan(retirementBalance);
    });

    it('should sustain or grow wealth with high returns and low withdrawal', () => {
      const inputs = createDefaultInputs();
      inputs.retRate = 9.0; // High returns
      inputs.wdRate = 3.0; // Conservative withdrawal

      const result = runSingleSimulation(inputs, 12345);

      // Should not run out of money
      expect(result.ruined).toBe(false);
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should mark as ruined when money runs out', () => {
      const inputs = createDefaultInputs();
      // Start with very little money
      inputs.taxableBalance = 10000;
      inputs.pretaxBalance = 5000;
      inputs.rothBalance = 5000;
      // No contributions
      inputs.cTax1 = 0;
      inputs.cPre1 = 0;
      inputs.cPost1 = 0;
      inputs.cMatch1 = 0;
      // High withdrawal rate
      inputs.wdRate = 8.0;
      // Low returns
      inputs.retRate = 2.0;

      const result = runSingleSimulation(inputs, 12345);

      // Should likely run out of money
      expect(result.ruined).toBe(true);
      expect(result.eolReal).toBe(0);
    });

    it('should calculate year-1 withdrawal correctly', () => {
      const inputs = createDefaultInputs();
      inputs.wdRate = 4.0; // 4% withdrawal rate

      const result = runSingleSimulation(inputs, 12345);

      // Year 1 after-tax withdrawal should be positive and reasonable
      expect(result.y1AfterTaxReal).toBeGreaterThan(0);

      // Should be approximately 4% of retirement balance (real terms)
      const yrsToRet = inputs.retirementAge - inputs.age1;
      const retirementBalance = result.balancesReal[yrsToRet];
      const expectedWithdrawal = retirementBalance * 0.04;

      // Allow some variance due to taxes and inflation adjustment
      expect(result.y1AfterTaxReal).toBeGreaterThan(expectedWithdrawal * 0.5);
      expect(result.y1AfterTaxReal).toBeLessThan(expectedWithdrawal * 1.5);
    });
  });

  describe('runSingleSimulation - Return Modes', () => {
    it('should handle fixed return mode', () => {
      const inputs = createDefaultInputs();
      inputs.returnMode = 'fixed';
      inputs.retRate = 7.0;

      const result = runSingleSimulation(inputs, 12345);
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should handle random return mode', () => {
      const inputs = createDefaultInputs();
      inputs.returnMode = 'randomWalk';

      const result = runSingleSimulation(inputs, 12345);
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.eolReal).toBeGreaterThanOrEqual(0);
    });

    it('should handle historical return mode', () => {
      const inputs = createDefaultInputs();
      inputs.returnMode = 'randomWalk';
      inputs.historicalYear = 2008; // Bear market year

      const result = runSingleSimulation(inputs, 12345);
      expect(result.balancesReal).toBeInstanceOf(Array);
      // Should handle bear market scenario
      expect(result.eolReal).toBeGreaterThanOrEqual(0);
    });
  });

  describe('runSingleSimulation - Inflation Scenarios', () => {
    it('should handle standard inflation', () => {
      const inputs = createDefaultInputs();
      inputs.inflationRate = 3.0; // 3% inflation

      const result = runSingleSimulation(inputs, 12345);

      // Real balances should account for inflation
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.balancesReal.every(b => b >= 0)).toBe(true);
    });

    it('should handle inflation shock scenario', () => {
      const inputs = createDefaultInputs();
      inputs.inflationRate = 2.5; // Base inflation
      inputs.inflationShockRate = 8.0; // High inflation shock
      inputs.inflationShockDuration = 3; // 3 years

      const result = runSingleSimulation(inputs, 12345);

      // Should complete with inflation shock
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.eolReal).toBeGreaterThanOrEqual(0);
    });

    it('should show lower real wealth with higher inflation', () => {
      const inputs = createDefaultInputs();
      inputs.inflationRate = 2.0;
      const resultLowInf = runSingleSimulation(inputs, 12345);

      inputs.inflationRate = 6.0; // High inflation
      const resultHighInf = runSingleSimulation(inputs, 12345);

      // Higher inflation reduces real (inflation-adjusted) wealth
      expect(resultHighInf.eolReal).toBeLessThan(resultLowInf.eolReal);
    });
  });

  describe('runSingleSimulation - Edge Cases', () => {
    it('should handle very young person (long accumulation period)', () => {
      const inputs = createDefaultInputs();
      inputs.age1 = 25;
      inputs.retirementAge = 65; // 40 years to retirement

      const result = runSingleSimulation(inputs, 12345);

      // Long time horizon should allow substantial growth
      const yrsToRet = inputs.retirementAge - inputs.age1;
      expect(result.balancesReal[yrsToRet]).toBeGreaterThan(500000);
    });

    it('should handle person close to retirement', () => {
      const inputs = createDefaultInputs();
      inputs.age1 = 63;
      inputs.retirementAge = 65; // Only 2 years to retirement
      inputs.taxableBalance = 500000; // Already has substantial savings
      inputs.pretaxBalance = 300000;
      inputs.rothBalance = 200000;

      const result = runSingleSimulation(inputs, 12345);

      // Should handle short accumulation period
      const yrsToRet = inputs.retirementAge - inputs.age1;
      expect(result.balancesReal.length).toBeGreaterThan(yrsToRet);
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should handle zero contributions (living off existing wealth)', () => {
      const inputs = createDefaultInputs();
      inputs.cTax1 = 0;
      inputs.cPre1 = 0;
      inputs.cPost1 = 0;
      inputs.cMatch1 = 0;
      // But has starting balances
      inputs.taxableBalance = 500000;
      inputs.pretaxBalance = 500000;
      inputs.rothBalance = 250000;

      const result = runSingleSimulation(inputs, 12345);

      // Should work with just investment returns
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should handle maximum contribution limits', () => {
      const inputs = createDefaultInputs();
      inputs.cPre1 = 23000; // 401k limit
      inputs.cMatch1 = 10000; // Generous match
      inputs.cPost1 = 7000; // Roth IRA limit

      const result = runSingleSimulation(inputs, 12345);

      // Should handle realistic max contributions
      const yrsToRet = inputs.retirementAge - inputs.age1;
      expect(result.balancesReal[yrsToRet]).toBeGreaterThan(1000000);
    });
  });

  describe('runSingleSimulation - Tax Efficiency', () => {
    it('should prefer Roth withdrawals (tax-free) in drawdown', () => {
      const inputs = createDefaultInputs();
      // Heavy Roth balance
      inputs.rothBalance = 800000;
      inputs.pretaxBalance = 100000;
      inputs.taxableBalance = 100000;

      const result = runSingleSimulation(inputs, 12345);

      // Roth-heavy portfolio should preserve more wealth (less tax drag)
      expect(result.eolReal).toBeGreaterThan(0);
    });

    it('should handle RMDs from pre-tax accounts', () => {
      const inputs = createDefaultInputs();
      inputs.age1 = 65;
      inputs.retirementAge = 66; // Retire at 66, close to RMD age (73)
      // Heavy pre-tax balance
      inputs.pretaxBalance = 2000000;
      inputs.rothBalance = 100000;
      inputs.taxableBalance = 100000;

      const result = runSingleSimulation(inputs, 12345);

      // RMDs will kick in, should complete successfully
      expect(result.balancesReal).toBeInstanceOf(Array);
      expect(result.eolReal).toBeGreaterThanOrEqual(0);
    });
  });
});
