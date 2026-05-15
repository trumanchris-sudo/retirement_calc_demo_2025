import { describe, expect, it } from 'vitest';
import { createDefaultPlanConfig } from '@/types/plan-config';
import {
  migrateConfig,
  normalizePlanConfig,
  validatePlanConfig,
} from '@/lib/planConfig';

describe('PlanConfig validation SSOT', () => {
  it('validates the canonical flat default PlanConfig', () => {
    const config = createDefaultPlanConfig();

    const result = validatePlanConfig(config);

    expect(result.isValid).toBe(true);
  });

  it('rejects invalid relational fields without silently accepting them', () => {
    const config = {
      ...createDefaultPlanConfig(),
      age1: 45,
      retirementAge: 45,
    };

    const result = validatePlanConfig(config);

    expect(result.isValid).toBe(false);
    if (!result.isValid) {
      expect(result.errors.some((error) => error.field === 'retirementAge')).toBe(true);
    }
  });

  it('normalizes untrusted localStorage/import values into the flat PlanConfig shape', () => {
    const normalized = normalizePlanConfig({
      ...createDefaultPlanConfig(),
      age1: '35',
      retirementAge: '30',
      taxableBalance: '1,234,567',
      retRate: 'Infinity',
      marital: 'married',
      randomWalkSeries: 'not-real',
      childrenAges: ['3', 7, Number.NaN],
    });

    expect(normalized.age1).toBe(35);
    expect(normalized.retirementAge).toBe(36);
    expect(normalized.taxableBalance).toBe(1_234_567);
    expect(normalized.retRate).toBe(createDefaultPlanConfig().retRate);
    expect(normalized.randomWalkSeries).toBe(createDefaultPlanConfig().randomWalkSeries);
    expect(normalized.childrenAges).toEqual([3, 7]);
  });

  it('drops malformed metadata and assumptions while preserving valid entries', () => {
    const now = Date.now();
    const normalized = normalizePlanConfig({
      ...createDefaultPlanConfig(),
      fieldMetadata: {
        age1: { field: 'age1', source: 'user-entered', updatedAt: now },
        bad: { nope: true },
      },
      assumptions: [
        {
          field: 'retRate',
          displayName: 'Expected Return',
          value: 7,
          reasoning: 'Default market assumption',
          confidence: 'medium',
        },
        { field: 'bad' },
      ],
    });

    expect(Object.keys(normalized.fieldMetadata)).toEqual(['age1']);
    expect(normalized.assumptions).toHaveLength(1);
  });

  it('keeps migrateConfig as the safe ingress for old or partial data', () => {
    const migrated = migrateConfig({
      primaryIncome: '250000',
      spouseIncome: '125000',
      includeSS: 'false',
    });

    expect(migrated.primaryIncome).toBe(250_000);
    expect(migrated.spouseIncome).toBe(125_000);
    expect(migrated.includeSS).toBe(false);
  });
});
