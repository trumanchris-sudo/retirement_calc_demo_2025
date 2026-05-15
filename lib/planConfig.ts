/**
 * Canonical PlanConfig validation.
 *
 * PlanConfig is flat in types/plan-config.ts. Keep this schema in the same
 * shape so imports, onboarding, localStorage, and calculation inputs are
 * checked against the actual SSOT instead of an older nested config shape.
 */

import { z } from 'zod';
import {
  createDefaultPlanConfig,
  type FieldMetadata,
  type PlanConfig,
} from '@/types/plan-config';
import { RETIREMENT_LIMITS_2026 } from '@/lib/constants/tax2026';

export const VALIDATION_RULES = {
  age: { min: 18, max: 120 },
  retirementAge: { min: 30, max: 90 },
  balance: { min: 0, max: 1_000_000_000 },
  contribution401k: { max: RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT },
  contributionIRA: { max: RETIREMENT_LIMITS_2026.IRA_LIMIT },
  rate: { min: -50, max: 50 },
  withdrawalRate: { min: 0, max: 20 },
  socialSecurityAge: { min: 62, max: 70 },
  socialSecurityIncome: { min: 0, max: 1_000_000 },
  percentage: { min: 0, max: 100 },
} as const;

type NumericRule = {
  min?: number;
  max?: number;
  integer?: boolean;
  optional?: boolean;
  nullable?: boolean;
};

type ValidationIssue = {
  field: string;
  message: string;
  value?: unknown;
};

export interface ValidationSuccess {
  isValid: true;
  data: PlanConfig;
  errors: [];
}

export interface ValidationFailure {
  isValid: false;
  errors: ValidationIssue[];
  data?: undefined;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

const NUMERIC_RULES = {
  version: { min: 1, integer: true },
  createdAt: { min: 0 },
  updatedAt: { min: 0 },
  age1: { min: VALIDATION_RULES.age.min, max: VALIDATION_RULES.age.max, integer: true },
  age2: { min: VALIDATION_RULES.age.min, max: VALIDATION_RULES.age.max, integer: true },
  retirementAge: { min: VALIDATION_RULES.retirementAge.min, max: VALIDATION_RULES.retirementAge.max, integer: true },
  numChildren: { min: 0, max: 20, integer: true },
  additionalChildrenExpected: { min: 0, max: 20, integer: true },
  primaryIncome: { min: 0, max: VALIDATION_RULES.balance.max },
  spouseIncome: { min: 0, max: VALIDATION_RULES.balance.max, optional: true },
  monthlyMortgageRent: { min: 0, max: 1_000_000, optional: true },
  monthlyUtilities: { min: 0, max: 1_000_000, optional: true },
  monthlyInsurancePropertyTax: { min: 0, max: 1_000_000, optional: true },
  monthlyHealthcareP1: { min: 0, max: 1_000_000, optional: true },
  monthlyHealthcareP2: { min: 0, max: 1_000_000, optional: true },
  monthlyOtherExpenses: { min: 0, max: 1_000_000, optional: true },
  monthlyHouseholdExpenses: { min: 0, max: 1_000_000, optional: true },
  monthlyDiscretionary: { min: 0, max: 1_000_000, optional: true },
  monthlyChildcare: { min: 0, max: 1_000_000, optional: true },
  annualLifeInsuranceP1: { min: 0, max: 10_000_000, optional: true },
  annualLifeInsuranceP2: { min: 0, max: 10_000_000, optional: true },
  eoyBonusAmount: { min: 0, max: VALIDATION_RULES.balance.max, optional: true },
  emergencyFund: { min: 0, max: VALIDATION_RULES.balance.max },
  taxableBalance: { min: 0, max: VALIDATION_RULES.balance.max },
  pretaxBalance: { min: 0, max: VALIDATION_RULES.balance.max },
  rothBalance: { min: 0, max: VALIDATION_RULES.balance.max },
  cTax1: { min: 0, max: VALIDATION_RULES.balance.max },
  cPre1: { min: 0, max: 100_000 },
  cPost1: { min: 0, max: 100_000 },
  cMatch1: { min: 0, max: 100_000 },
  cTax2: { min: 0, max: VALIDATION_RULES.balance.max },
  cPre2: { min: 0, max: 100_000 },
  cPost2: { min: 0, max: 100_000 },
  cMatch2: { min: 0, max: 100_000 },
  retRate: { min: 0, max: 50 },
  inflationRate: { min: 0, max: 50 },
  stateRate: { min: 0, max: 15 },
  wdRate: { min: VALIDATION_RULES.withdrawalRate.min, max: VALIDATION_RULES.withdrawalRate.max },
  incRate: { min: 0, max: 50 },
  seed: { min: 0, max: 1_000_000_000, integer: true },
  dividendYield: { min: 0, max: 20 },
  bondStartPct: { min: 0, max: 100 },
  bondEndPct: { min: 0, max: 100 },
  bondStartAge: { min: VALIDATION_RULES.age.min, max: VALIDATION_RULES.age.max, integer: true },
  bondEndAge: { min: VALIDATION_RULES.age.min, max: VALIDATION_RULES.age.max, integer: true },
  ssIncome: { min: VALIDATION_RULES.socialSecurityIncome.min, max: VALIDATION_RULES.socialSecurityIncome.max },
  ssClaimAge: { min: VALIDATION_RULES.socialSecurityAge.min, max: VALIDATION_RULES.socialSecurityAge.max, integer: true },
  ssIncome2: { min: VALIDATION_RULES.socialSecurityIncome.min, max: VALIDATION_RULES.socialSecurityIncome.max },
  ssClaimAge2: { min: VALIDATION_RULES.socialSecurityAge.min, max: VALIDATION_RULES.socialSecurityAge.max, integer: true },
  historicalYear: { min: 1900, max: 2100, integer: true, optional: true },
  inflationShockRate: { min: 0, max: 50, nullable: true },
  inflationShockDuration: { min: 0, max: 100, integer: true },
  medicarePremium: { min: 0, max: 100_000 },
  medicalInflation: { min: 0, max: 50 },
  irmaaThresholdSingle: { min: 0, max: VALIDATION_RULES.balance.max },
  irmaaThresholdMarried: { min: 0, max: VALIDATION_RULES.balance.max },
  irmaaSurcharge: { min: 0, max: 100_000 },
  ltcAnnualCost: { min: 0, max: VALIDATION_RULES.balance.max },
  ltcProbability: { min: 0, max: 100 },
  ltcDuration: { min: 0, max: 50 },
  ltcOnsetAge: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  ltcAgeRangeStart: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  ltcAgeRangeEnd: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  targetConversionBracket: { min: 0, max: 1 },
  hypPerBen: { min: 0, max: VALIDATION_RULES.balance.max },
  numberOfBeneficiaries: { min: 0, max: 10_000, integer: true },
  totalFertilityRate: { min: 0, max: 20 },
  generationLength: { min: 1, max: 100, integer: true },
  hypDeathAge: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  hypMinDistAge: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  fertilityWindowStart: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
  fertilityWindowEnd: { min: 0, max: VALIDATION_RULES.age.max, integer: true },
} satisfies Partial<Record<keyof PlanConfig, NumericRule>>;

const BOOLEAN_KEYS = [
  'incContrib',
  'includeSS',
  'includeMedicare',
  'includeLTC',
  'enableRothConversions',
  'showGen',
] satisfies Array<keyof PlanConfig>;

const STRING_KEYS = [
  'name',
  'eoyBonusMonth',
  'firstPayDate',
  'hypBenAgesStr',
] satisfies Array<keyof PlanConfig>;

const FILING_STATUSES = ['single', 'married'] as const;
const EMPLOYMENT_TYPES = ['w2', 'self-employed', 'both', 'retired', 'other'] as const;
const RETURN_MODES = ['fixed', 'randomWalk'] as const;
const WALK_SERIES = ['nominal', 'real', 'trulyRandom'] as const;
const ALLOCATION_STRATEGIES = ['aggressive', 'ageBased', 'custom'] as const;
const GLIDE_PATH_SHAPES = ['linear', 'accelerated', 'decelerated'] as const;
const UPDATE_SOURCES = ['user-entered', 'ai-suggested', 'default', 'imported'] as const;
const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const;

function numericSchema(rule: NumericRule): z.ZodTypeAny {
  let base = z.number().finite();
  if (rule.integer) base = base.int();
  if (rule.min !== undefined) base = base.min(rule.min);
  if (rule.max !== undefined) base = base.max(rule.max);
  let schema: z.ZodTypeAny = base;
  if (rule.nullable) schema = schema.nullable();
  if (rule.optional) schema = schema.optional();
  return schema;
}

const numericShape = Object.fromEntries(
  Object.entries(NUMERIC_RULES).map(([key, rule]) => [key, numericSchema(rule)])
) as Record<keyof typeof NUMERIC_RULES, z.ZodTypeAny>;

const FieldMetadataSchema = z.object({
  field: z.string(),
  source: z.enum(UPDATE_SOURCES),
  updatedAt: z.number().finite().min(0),
  reasoning: z.string().optional(),
  confidence: z.enum(CONFIDENCE_LEVELS).optional(),
}) satisfies z.ZodType<FieldMetadata>;

const AssumptionSchema = z.object({
  field: z.string(),
  displayName: z.string(),
  value: z.union([z.string(), z.number().finite(), z.boolean(), z.null()]),
  reasoning: z.string(),
  confidence: z.enum(CONFIDENCE_LEVELS),
});

const FamilyConfigSchema = z.object({
  userName: z.string(),
  spouseName: z.string().optional(),
  childrenNames: z.array(z.string()),
  grandchildrenNames: z.array(z.string()),
  customMilestones: z.object({
    collegeFund: z.string().optional(),
    housePaidOff: z.string().optional(),
    financialIndependence: z.string().optional(),
    generationalWealth: z.string().optional(),
  }).optional(),
});

const PlanConfigBaseSchema = z.object({
  ...numericShape,
  marital: z.enum(FILING_STATUSES),
  childrenAges: z.array(z.number().int().min(0).max(VALIDATION_RULES.age.max)),
  employmentType1: z.enum(EMPLOYMENT_TYPES),
  employmentType2: z.enum(EMPLOYMENT_TYPES).optional(),
  returnMode: z.enum(RETURN_MODES),
  randomWalkSeries: z.enum(WALK_SERIES),
  allocationStrategy: z.enum(ALLOCATION_STRATEGIES),
  glidePathShape: z.enum(GLIDE_PATH_SHAPES),
  fieldMetadata: z.record(FieldMetadataSchema),
  missingFields: z.array(z.string()).optional(),
  assumptions: z.array(AssumptionSchema).optional(),
  familyConfig: FamilyConfigSchema,
  ...Object.fromEntries(BOOLEAN_KEYS.map((key) => [key, z.boolean()])),
  ...Object.fromEntries(STRING_KEYS.map((key) => [key, z.string().optional()])),
});

export const PlanConfigSchema = PlanConfigBaseSchema.superRefine((config, ctx) => {
  if (config.retirementAge <= config.age1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['retirementAge'],
      message: 'Retirement age must be greater than current age',
    });
  }

  if (config.marital === 'married' && config.retirementAge <= config.age2) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['retirementAge'],
      message: 'Retirement age must be greater than spouse age',
    });
  }

  if (config.bondEndAge <= config.bondStartAge) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['bondEndAge'],
      message: 'Bond glide path end age must be greater than start age',
    });
  }

  if (config.ltcAgeRangeEnd <= config.ltcAgeRangeStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ltcAgeRangeEnd'],
      message: 'LTC age range end must be greater than start',
    });
  }

  if (config.fertilityWindowEnd <= config.fertilityWindowStart) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['fertilityWindowEnd'],
      message: 'Fertility window end must be greater than start',
    });
  }
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clamp(value: number, min?: number, max?: number): number {
  let result = value;
  if (min !== undefined) result = Math.max(min, result);
  if (max !== undefined) result = Math.min(max, result);
  return result;
}

function normalizeNumber(
  value: unknown,
  fallback: unknown,
  rule: NumericRule,
): number | null | undefined {
  if (value === undefined) return rule.optional ? undefined : fallback as number;
  if (value === null) return rule.nullable ? null : fallback as number;

  const normalizedInput =
    typeof value === 'string' ? value.replace(/,/g, '').trim() : value;
  const parsed = normalizedInput === '' ? NaN : Number(normalizedInput);
  if (!Number.isFinite(parsed)) {
    return rule.optional ? undefined : rule.nullable ? null : fallback as number;
  }

  const rounded = rule.integer ? Math.round(parsed) : parsed;
  return clamp(rounded, rule.min, rule.max);
}

function normalizeEnum<T extends readonly string[]>(value: unknown, allowed: T, fallback: T[number]): T[number] {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function normalizeFieldMetadata(value: unknown): Record<string, FieldMetadata> {
  if (!isRecord(value)) return {};

  return Object.fromEntries(
    Object.entries(value).filter(([, metadata]) => FieldMetadataSchema.safeParse(metadata).success)
  ) as Record<string, FieldMetadata>;
}

/**
 * Normalize untrusted or older PlanConfig-like data without running any
 * calculation. Invalid numbers are coerced back into supported bounds so a bad
 * localStorage/import value cannot poison the app state.
 */
export function normalizePlanConfig(data: unknown): PlanConfig {
  const defaults = createDefaultPlanConfig();
  const raw = isRecord(data) ? data : {};
  const merged: Record<string, unknown> = { ...defaults, ...raw };

  for (const [key, rule] of Object.entries(NUMERIC_RULES)) {
    merged[key] = normalizeNumber(merged[key], defaults[key as keyof PlanConfig], rule);
  }

  for (const key of BOOLEAN_KEYS) {
    merged[key] = normalizeBoolean(merged[key], defaults[key]);
  }

  for (const key of STRING_KEYS) {
    merged[key] = typeof merged[key] === 'string' ? merged[key] : defaults[key];
  }

  merged.marital = normalizeEnum(merged.marital, FILING_STATUSES, defaults.marital);
  merged.employmentType1 = normalizeEnum(merged.employmentType1, EMPLOYMENT_TYPES, defaults.employmentType1);
  merged.employmentType2 =
    merged.employmentType2 === undefined
      ? undefined
      : normalizeEnum(merged.employmentType2, EMPLOYMENT_TYPES, defaults.employmentType1);
  merged.returnMode = normalizeEnum(merged.returnMode, RETURN_MODES, defaults.returnMode);
  merged.randomWalkSeries = normalizeEnum(merged.randomWalkSeries, WALK_SERIES, defaults.randomWalkSeries);
  merged.allocationStrategy = normalizeEnum(merged.allocationStrategy, ALLOCATION_STRATEGIES, defaults.allocationStrategy);
  merged.glidePathShape = normalizeEnum(merged.glidePathShape, GLIDE_PATH_SHAPES, defaults.glidePathShape);

  merged.childrenAges = Array.isArray(merged.childrenAges)
    ? merged.childrenAges
        .map((age) => normalizeNumber(age, undefined, { min: 0, max: VALIDATION_RULES.age.max, integer: true, optional: true }))
        .filter((age): age is number => typeof age === 'number')
    : defaults.childrenAges;

  merged.fieldMetadata = normalizeFieldMetadata(merged.fieldMetadata);
  merged.missingFields = Array.isArray(merged.missingFields)
    ? normalizeStringArray(merged.missingFields)
    : defaults.missingFields;
  merged.assumptions = Array.isArray(merged.assumptions)
    ? merged.assumptions.filter((item) => AssumptionSchema.safeParse(item).success)
    : defaults.assumptions;

  const rawFamilyConfig = isRecord(merged.familyConfig) ? merged.familyConfig : {};
  merged.familyConfig = {
    ...defaults.familyConfig,
    ...rawFamilyConfig,
    childrenNames: normalizeStringArray(rawFamilyConfig.childrenNames),
    grandchildrenNames: normalizeStringArray(rawFamilyConfig.grandchildrenNames),
  };

  const maxCurrentAge = merged.marital === 'married'
    ? Math.max(Number(merged.age1), Number(merged.age2))
    : Number(merged.age1);
  if (Number.isFinite(maxCurrentAge) && Number(merged.retirementAge) <= maxCurrentAge) {
    merged.retirementAge = clamp(maxCurrentAge + 1, VALIDATION_RULES.retirementAge.min, VALIDATION_RULES.retirementAge.max);
  }
  if (Number(merged.bondEndAge) <= Number(merged.bondStartAge)) {
    merged.bondEndAge = clamp(Number(merged.bondStartAge) + 1, VALIDATION_RULES.age.min, VALIDATION_RULES.age.max);
  }
  if (Number(merged.ltcAgeRangeEnd) <= Number(merged.ltcAgeRangeStart)) {
    merged.ltcAgeRangeEnd = clamp(Number(merged.ltcAgeRangeStart) + 1, 0, VALIDATION_RULES.age.max);
  }
  if (Number(merged.fertilityWindowEnd) <= Number(merged.fertilityWindowStart)) {
    merged.fertilityWindowEnd = clamp(Number(merged.fertilityWindowStart) + 1, 0, VALIDATION_RULES.age.max);
  }

  const parsed = PlanConfigBaseSchema.safeParse(merged);
  if (parsed.success) return parsed.data as PlanConfig;

  console.warn('[PlanConfig] Normalization fell back to defaults:', parsed.error.issues);
  return defaults;
}

export function validatePlanConfig(data: unknown): ValidationResult {
  const result = PlanConfigSchema.safeParse(data);
  if (result.success) {
    return { isValid: true, data: result.data as PlanConfig, errors: [] };
  }

  return {
    isValid: false,
    errors: result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
      value: 'received' in issue ? issue.received : undefined,
    })),
  };
}

export function getValidationErrorMessage(error: ValidationIssue): string {
  const { field, message } = error;

  if (field.includes('age1') || field.includes('age2')) {
    return `Age must be between ${VALIDATION_RULES.age.min} and ${VALIDATION_RULES.age.max} years`;
  }
  if (field.includes('retirementAge')) {
    return message || `Retirement age must be between ${VALIDATION_RULES.retirementAge.min} and ${VALIDATION_RULES.retirementAge.max} years`;
  }
  if (field.includes('cPre')) {
    return `401(k) contribution cannot exceed $100,000. IRS elective deferral warnings are shown separately by age.`;
  }
  if (field.includes('cPost')) {
    return `Roth/IRA contribution cannot exceed $100,000. IRS contribution warnings are shown separately by age.`;
  }
  if (field.includes('wdRate')) {
    return `Withdrawal rate must be between ${VALIDATION_RULES.withdrawalRate.min}% and ${VALIDATION_RULES.withdrawalRate.max}%`;
  }

  return message;
}

export const DEFAULT_PLAN_CONFIG: PlanConfig = createDefaultPlanConfig();

export function migrateConfig(data: unknown): PlanConfig {
  return normalizePlanConfig(data);
}
