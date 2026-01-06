/**
 * Global Plan Configuration Schema & Validation
 * Epic 1.1: Single source of truth for all calculator inputs
 */

import { z } from 'zod';
import type { FilingStatus } from './calculations/taxCalculations';
import type { ReturnMode, WalkSeries } from '@/types/planner';
import type { BondGlidePath } from '@/types/calculator';

// ==================== Validation Constants ====================

export const VALIDATION_RULES = {
  age: { min: 18, max: 100 },
  retirementAge: { min: 50, max: 80 },
  balance: { min: 0, max: 1_000_000_000 },
  contribution401k: { max: 24_500 }, // 2026 limit (official IRS)
  contributionIRA: { max: 7_500 }, // 2026 limit (official IRS)
  rate: { min: -50, max: 50 }, // percentage
  withdrawalRate: { min: 0, max: 20 },
  socialSecurityAge: { min: 62, max: 70 },
  socialSecurityIncome: { min: 0, max: 60_000 }, // Annual benefit
} as const;

// ==================== Zod Schema ====================

export const PlanConfigSchema = z.object({
  // Version for migration support
  configVersion: z.number().default(1),

  // Personal Information
  personal: z.object({
    maritalStatus: z.enum(['single', 'married', 'mfs', 'hoh']),
    age1: z.number().int().min(VALIDATION_RULES.age.min).max(VALIDATION_RULES.age.max),
    age2: z.number().int().min(VALIDATION_RULES.age.min).max(VALIDATION_RULES.age.max),
    retirementAge: z.number().int().min(VALIDATION_RULES.retirementAge.min).max(VALIDATION_RULES.retirementAge.max),
    state: z.string().optional(),
  }),

  // Starting Account Balances
  balances: z.object({
    taxable: z.number().min(VALIDATION_RULES.balance.min).max(VALIDATION_RULES.balance.max),
    pretax: z.number().min(VALIDATION_RULES.balance.min).max(VALIDATION_RULES.balance.max),
    roth: z.number().min(VALIDATION_RULES.balance.min).max(VALIDATION_RULES.balance.max),
  }),

  // Annual Contributions - Person 1
  contributions1: z.object({
    taxable: z.number().min(0).max(VALIDATION_RULES.balance.max),
    pretax: z.number().min(0).max(VALIDATION_RULES.contribution401k.max),
    roth: z.number().min(0).max(VALIDATION_RULES.contributionIRA.max),
    match: z.number().min(0).max(100_000),
  }),

  // Annual Contributions - Person 2
  contributions2: z.object({
    taxable: z.number().min(0).max(VALIDATION_RULES.balance.max),
    pretax: z.number().min(0).max(VALIDATION_RULES.contribution401k.max),
    roth: z.number().min(0).max(VALIDATION_RULES.contributionIRA.max),
    match: z.number().min(0).max(100_000),
  }),

  // Rates & Assumptions
  assumptions: z.object({
    returnRate: z.number().min(VALIDATION_RULES.rate.min).max(VALIDATION_RULES.rate.max),
    inflationRate: z.number().min(VALIDATION_RULES.rate.min).max(VALIDATION_RULES.rate.max),
    stateRate: z.number().min(0).max(15),
    withdrawalRate: z.number().min(VALIDATION_RULES.withdrawalRate.min).max(VALIDATION_RULES.withdrawalRate.max),
    enableContributionIncrease: z.boolean().default(false),
    contributionIncreaseRate: z.number().min(0).max(20).default(0),
    dividendYield: z.number().min(0).max(10).default(2.0),
    savingsRate: z.number().min(0).max(100).default(15), // Epic 5.1
  }),

  // Simulation Settings
  simulation: z.object({
    mode: z.enum(['fixed', 'historical', 'bear', 'inflation']),
    walkSeries: z.enum(['sp500', 'sp500-nom', 'random']),
    seed: z.number().int().default(42),
    historicalYear: z.number().int().nullable().optional(),
    inflationShockRate: z.number().nullable().optional(),
    inflationShockDuration: z.number().int().default(0),
    bondGlidePath: z.any().nullable().optional(), // BondGlidePath type
  }),

  // Social Security
  socialSecurity: z.object({
    enabled: z.boolean().default(false),
    income1: z.number().min(VALIDATION_RULES.socialSecurityIncome.min).max(VALIDATION_RULES.socialSecurityIncome.max).default(0),
    claimAge1: z.number().int().min(VALIDATION_RULES.socialSecurityAge.min).max(VALIDATION_RULES.socialSecurityAge.max).default(67),
    income2: z.number().min(VALIDATION_RULES.socialSecurityIncome.min).max(VALIDATION_RULES.socialSecurityIncome.max).default(0),
    claimAge2: z.number().int().min(VALIDATION_RULES.socialSecurityAge.min).max(VALIDATION_RULES.socialSecurityAge.max).default(67),
  }),

  // Generational Wealth Settings
  generational: z.object({
    enabled: z.boolean().default(false),
    perBeneficiary: z.number().min(0).max(10_000_000).default(0),
    startingBeneficiaries: z.number().int().min(0).max(20).default(0),
    totalFertilityRate: z.number().min(0).max(10).default(2.1),
    generationLength: z.number().int().min(15).max(50).default(30),
    deathAge: z.number().int().min(60).max(120).default(85),
    minDistributionAge: z.number().int().min(0).max(100).default(21),
    beneficiaryAges: z.string().default(''),
    fertilityWindowStart: z.number().int().min(15).max(50).default(25),
    fertilityWindowEnd: z.number().int().min(15).max(60).default(40),
  }),

  // Metadata
  metadata: z.object({
    lastModified: z.number().default(() => Date.now()),
    calculatedAt: z.number().nullable().optional(),
  }),
});

export type PlanConfig = z.infer<typeof PlanConfigSchema>;

// ==================== Validation Functions ====================

export interface ValidationError {
  field: string;
  message: string;
  value?: unknown;
}

export interface ValidationSuccess {
  isValid: true;
  data: PlanConfig;
  errors: [];
}

export interface ValidationFailure {
  isValid: false;
  errors: ValidationError[];
  data?: undefined;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Validate a plan configuration with detailed error messages
 */
export function validatePlanConfig(data: unknown): ValidationResult {
  const result = PlanConfigSchema.safeParse(data);

  if (result.success) {
    return {
      isValid: true,
      data: result.data,
      errors: [],
    };
  }

  const errors: ValidationError[] = result.error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
    value: err.code === 'invalid_type' ? undefined : (err as any).received,
  }));

  return {
    isValid: false,
    errors,
  };
}

/**
 * Get user-friendly validation error message
 */
export function getValidationErrorMessage(error: ValidationError): string {
  const { field, message } = error;

  // Custom messages for common validation errors
  if (field.includes('age1') || field.includes('age2')) {
    return `Age must be between ${VALIDATION_RULES.age.min} and ${VALIDATION_RULES.age.max} years`;
  }
  if (field.includes('retirementAge')) {
    return `Retirement age must be between ${VALIDATION_RULES.retirementAge.min} and ${VALIDATION_RULES.retirementAge.max} years`;
  }
  if (field.includes('pretax')) {
    return `401(k) contribution cannot exceed $${VALIDATION_RULES.contribution401k.max.toLocaleString()} (2026 limit)`;
  }
  if (field.includes('roth')) {
    return `IRA contribution cannot exceed $${VALIDATION_RULES.contributionIRA.max.toLocaleString()} (2026 limit)`;
  }
  if (field.includes('withdrawalRate')) {
    return `Withdrawal rate must be between ${VALIDATION_RULES.withdrawalRate.min}% and ${VALIDATION_RULES.withdrawalRate.max}%`;
  }

  return message;
}

// ==================== Default Configuration ====================

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  configVersion: 1,
  personal: {
    maritalStatus: 'single',
    age1: 35,
    age2: 35,
    retirementAge: 65,
    state: 'CA',
  },
  balances: {
    taxable: 0,
    pretax: 0,
    roth: 0,
  },
  contributions1: {
    taxable: 0,
    pretax: 0,
    roth: 0,
    match: 0,
  },
  contributions2: {
    taxable: 0,
    pretax: 0,
    roth: 0,
    match: 0,
  },
  assumptions: {
    returnRate: 7.0,
    inflationRate: 3.0,
    stateRate: 0,
    withdrawalRate: 4.0,
    enableContributionIncrease: false,
    contributionIncreaseRate: 0,
    dividendYield: 2.0,
    savingsRate: 15,
  },
  simulation: {
    mode: 'fixed',
    walkSeries: 'sp500',
    seed: 42,
    historicalYear: null,
    inflationShockRate: null,
    inflationShockDuration: 0,
    bondGlidePath: null,
  },
  socialSecurity: {
    enabled: false,
    income1: 0,
    claimAge1: 67,
    income2: 0,
    claimAge2: 67,
  },
  generational: {
    enabled: false,
    perBeneficiary: 0,
    startingBeneficiaries: 0,
    totalFertilityRate: 2.1,
    generationLength: 30,
    deathAge: 85,
    minDistributionAge: 21,
    beneficiaryAges: '',
    fertilityWindowStart: 25,
    fertilityWindowEnd: 40,
  },
  metadata: {
    lastModified: Date.now(),
    calculatedAt: null,
  },
};

// ==================== Migation Functions ====================

/**
 * Migrate old config format to new schema
 */
export function migrateConfig(data: unknown): PlanConfig {
  // If data already matches schema, validate and return
  const validation = validatePlanConfig(data);
  if (validation.isValid) {
    return validation.data;
  }

  // If migration needed, try to extract values from old format
  // This is a placeholder - implement specific migrations as needed
  console.warn('[CONFIG] Migration needed, using defaults for invalid fields');

  // Merge with defaults
  return {
    ...DEFAULT_PLAN_CONFIG,
    ...(typeof data === 'object' && data !== null ? data : {}),
  };
}

// ==================== Local Storage Helpers ====================

const STORAGE_KEY = 'retirement_plan_config';

export function loadConfigFromStorage(): PlanConfig {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return DEFAULT_PLAN_CONFIG;

    const parsed = JSON.parse(stored);
    return migrateConfig(parsed);
  } catch (error) {
    console.error('[CONFIG] Failed to load from storage:', error);
    return DEFAULT_PLAN_CONFIG;
  }
}

export function saveConfigToStorage(config: Partial<PlanConfig>): void {
  try {
    const current = loadConfigFromStorage();
    const updated = {
      ...current,
      ...config,
      metadata: {
        ...current.metadata,
        lastModified: Date.now(),
      },
    };

    // Validate before saving
    const validation = validatePlanConfig(updated);
    if (!validation.isValid) {
      console.error('[CONFIG] Validation failed:', validation.errors);
      return;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('[CONFIG] Failed to save to storage:', error);
  }
}
