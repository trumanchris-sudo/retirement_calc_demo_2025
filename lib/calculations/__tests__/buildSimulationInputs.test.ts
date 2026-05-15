import { describe, expect, it } from 'vitest';
import { buildSimulationInputs, hashPlanSimulationInputs, hashSimulationInputs } from '../buildSimulationInputs';
import { createDefaultPlanConfig, type PlanConfig } from '@/types/plan-config';
import type { BondGlidePath } from '@/types/calculator';

function makePlan(overrides: Partial<PlanConfig> = {}): PlanConfig {
  return {
    ...createDefaultPlanConfig(),
    ...overrides,
  };
}

describe('buildSimulationInputs', () => {
  it('maps default PlanConfig values into SimulationInputs', () => {
    const config = createDefaultPlanConfig();
    const inputs = buildSimulationInputs(config);

    expect(inputs.marital).toBe(config.marital);
    expect(inputs.age1).toBe(config.age1);
    expect(inputs.retirementAge).toBe(config.retirementAge);
    expect(inputs.taxableBalance).toBe(config.taxableBalance);
    expect(inputs.pretaxBalance).toBe(config.pretaxBalance);
    expect(inputs.rothBalance).toBe(config.rothBalance);
    expect(inputs.returnMode).toBe(config.returnMode);
    expect(inputs.randomWalkSeries).toBe(config.randomWalkSeries);
  });

  it('preserves valid zero values instead of falling back to defaults', () => {
    const config = makePlan({
      taxableBalance: 0,
      pretaxBalance: 0,
      rothBalance: 0,
      cTax1: 0,
      cPre1: 0,
      cPost1: 0,
      stateRate: 0,
      includeSS: false,
      includeMedicare: false,
      includeLTC: false,
      enableRothConversions: false,
    });

    const inputs = buildSimulationInputs(config);

    expect(inputs.taxableBalance).toBe(0);
    expect(inputs.pretaxBalance).toBe(0);
    expect(inputs.rothBalance).toBe(0);
    expect(inputs.cTax1).toBe(0);
    expect(inputs.cPre1).toBe(0);
    expect(inputs.cPost1).toBe(0);
    expect(inputs.stateRate).toBe(0);
    expect(inputs.includeSS).toBe(false);
    expect(inputs.includeMedicare).toBe(false);
    expect(inputs.includeLTC).toBe(false);
    expect(inputs.enableRothConversions).toBe(false);
  });

  it('passes married spouse fields through unchanged', () => {
    const config = makePlan({
      marital: 'married',
      age2: 42,
      employmentType2: 'self-employed',
      spouseIncome: 120000,
      cTax2: 1000,
      cPre2: 2000,
      cPost2: 3000,
      cMatch2: 4000,
      ssIncome2: 90000,
      ssClaimAge2: 70,
    });

    const inputs = buildSimulationInputs(config);

    expect(inputs.marital).toBe('married');
    expect(inputs.age2).toBe(42);
    expect(inputs.employmentType2).toBe('self-employed');
    expect(inputs.spouseIncome).toBe(120000);
    expect(inputs.cTax2).toBe(1000);
    expect(inputs.cPre2).toBe(2000);
    expect(inputs.cPost2).toBe(3000);
    expect(inputs.cMatch2).toBe(4000);
    expect(inputs.ssIncome2).toBe(90000);
    expect(inputs.ssClaimAge2).toBe(70);
  });

  it('normalizes negative employer match values to zero', () => {
    const config = makePlan({ cMatch1: -500, cMatch2: -1000 });
    const inputs = buildSimulationInputs(config);

    expect(inputs.cMatch1).toBe(0);
    expect(inputs.cMatch2).toBe(0);
  });

  it('applies stress scenario overrides without mutating the plan', () => {
    const config = makePlan({
      historicalYear: 2008,
      inflationShockRate: 8,
      inflationShockDuration: 3,
    });

    const inputs = buildSimulationInputs(config, {
      historicalYearOverride: null,
      inflationShockRateOverride: 0,
      inflationShockDurationOverride: 5,
    });

    expect(inputs.historicalYear).toBeUndefined();
    expect(inputs.inflationShockRate).toBeNull();
    expect(inputs.inflationShockDuration).toBe(5);
    expect(config.historicalYear).toBe(2008);
    expect(config.inflationShockRate).toBe(8);
    expect(config.inflationShockDuration).toBe(3);
  });

  it('includes healthcare, LTC, and Roth conversion settings', () => {
    const config = makePlan({
      includeMedicare: true,
      medicarePremium: 750,
      medicalInflation: 6.25,
      irmaaThresholdSingle: 150000,
      irmaaThresholdMarried: 300000,
      irmaaSurcharge: 350,
      includeLTC: true,
      ltcAnnualCost: 125000,
      ltcProbability: 65,
      ltcDuration: 4,
      ltcOnsetAge: 84,
      ltcAgeRangeStart: 78,
      ltcAgeRangeEnd: 92,
      enableRothConversions: true,
      targetConversionBracket: 0.32,
    });

    const inputs = buildSimulationInputs(config);

    expect(inputs.medicarePremium).toBe(750);
    expect(inputs.medicalInflation).toBe(6.25);
    expect(inputs.irmaaThresholdSingle).toBe(150000);
    expect(inputs.irmaaThresholdMarried).toBe(300000);
    expect(inputs.irmaaSurcharge).toBe(350);
    expect(inputs.includeLTC).toBe(true);
    expect(inputs.ltcAnnualCost).toBe(125000);
    expect(inputs.ltcProbability).toBe(65);
    expect(inputs.ltcDuration).toBe(4);
    expect(inputs.ltcOnsetAge).toBe(84);
    expect(inputs.ltcAgeRangeStart).toBe(78);
    expect(inputs.ltcAgeRangeEnd).toBe(92);
    expect(inputs.enableRothConversions).toBe(true);
    expect(inputs.targetConversionBracket).toBe(0.32);
  });

  it('copies child fields and protects the source array from mutation', () => {
    const childrenAges = [4, 7];
    const config = makePlan({
      numChildren: 2,
      childrenAges,
      additionalChildrenExpected: 1,
    });

    const inputs = buildSimulationInputs(config);
    inputs.childrenAges?.push(10);

    expect(inputs.numChildren).toBe(2);
    expect(inputs.additionalChildrenExpected).toBe(1);
    expect(config.childrenAges).toEqual([4, 7]);
  });

  it('attaches the provided bond glide path', () => {
    const bondGlidePath: BondGlidePath = {
      strategy: 'custom',
      startAge: 40,
      endAge: 70,
      startPct: 20,
      endPct: 60,
      shape: 'linear',
    };

    const inputs = buildSimulationInputs(createDefaultPlanConfig(), { bondGlidePath });

    expect(inputs.bondGlidePath).toBe(bondGlidePath);
  });

  it('hashes equivalent simulation inputs consistently regardless of object key order', () => {
    const inputs = buildSimulationInputs(createDefaultPlanConfig());
    const reordered = Object.fromEntries(Object.entries(inputs).reverse()) as typeof inputs;

    expect(hashSimulationInputs(reordered)).toBe(hashSimulationInputs(inputs));
  });

  it('hashes calculation-facing inputs, not PlanConfig metadata', () => {
    const config = makePlan();
    const metadataOnlyChange = makePlan({
      updatedAt: config.updatedAt + 1000,
      fieldMetadata: {
        age1: {
          field: 'age1',
          source: 'user-entered',
          updatedAt: config.updatedAt + 1000,
        },
      },
    });

    expect(hashPlanSimulationInputs(metadataOnlyChange)).toBe(hashPlanSimulationInputs(config));
  });

  it('changes the hash when a simulation input changes', () => {
    const config = makePlan({ retirementAge: 65 });
    const changed = makePlan({ retirementAge: 66 });

    expect(hashPlanSimulationInputs(changed)).not.toBe(hashPlanSimulationInputs(config));
  });
});
