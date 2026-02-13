/**
 * Unified Plan Configuration - Single Source of Truth
 *
 * This is the canonical data structure for all retirement plan data.
 * All parts of the app (Configure, Results, Wizard, 2026 Planner, etc.)
 * must read from and write to this structure.
 */

import type { CalculatorInputs } from './calculator';

/**
 * Source of field updates for tracking
 */
export type UpdateSource = 'user-entered' | 'ai-suggested' | 'default' | 'imported';

/**
 * Metadata about which fields were set by user vs AI
 */
export interface FieldMetadata {
  /** Field path (e.g., "annualIncome1", "sPre") */
  field: string;
  /** How the value was determined */
  source: 'user-entered' | 'ai-suggested' | 'default' | 'imported';
  /** When it was last updated */
  updatedAt: number;
  /** For AI suggestions, the reasoning */
  reasoning?: string;
  /** Confidence level for AI suggestions */
  confidence?: 'high' | 'medium' | 'low';
}

/**
 * Complete plan configuration
 * Extends CalculatorInputs with metadata and versioning
 */
export interface PlanConfig extends CalculatorInputs {
  /** Config version for migration compatibility */
  version: number;

  /** When this config was created */
  createdAt: number;

  /** When this config was last modified */
  updatedAt: number;

  /** Optional plan name for scenarios */
  name?: string;

  /** Metadata about field sources */
  fieldMetadata: Record<string, FieldMetadata>;

  /** List of fields that still need user input */
  missingFields?: string[];

  /** AI-generated assumptions with reasoning */
  assumptions?: Array<{
    field: string;
    displayName: string;
    value: any;
    reasoning: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
}

/**
 * Default/empty plan configuration
 */
export function createDefaultPlanConfig(): PlanConfig {
  const now = Date.now();

  return {
    // Version & timestamps
    version: 1,
    createdAt: now,
    updatedAt: now,

    // Personal & Family
    marital: 'single',
    age1: 30,
    age2: 30,
    retAge: 65,
    numChildren: 0,
    childrenAges: [],
    additionalChildrenExpected: 0,

    // Employment & Income
    employmentType1: 'w2',
    employmentType2: undefined,
    annualIncome1: 100000,
    annualIncome2: 0,

    // Current Balances
    emergencyFund: 20000,
    sTax: 50000,
    sPre: 150000,
    sPost: 25000,

    // Contributions
    cTax1: 10000,
    cPre1: 15000,
    cPost1: 6500,
    cMatch1: 6000,
    cTax2: 0,
    cPre2: 0,
    cPost2: 0,
    cMatch2: 0,

    // Rates & Assumptions
    retRate: 9.8,
    infRate: 2.6,
    stateRate: 0,
    incContrib: true,
    incRate: 4.5,
    wdRate: 3.5,
    dividendYield: 2.0,

    // Social Security
    includeSS: true,
    ssIncome: 100000,
    ssClaimAge: 67,
    ssIncome2: 0,
    ssClaimAge2: 67,

    // Simulation
    retMode: 'randomWalk',
    walkSeries: 'trulyRandom',
    seed: 12345,

    // Bond Glide Path Configuration
    allocationStrategy: 'aggressive',
    bondStartPct: 10,
    bondEndPct: 60,
    bondStartAge: 30,  // Will be synced to age1 in page.tsx
    bondEndAge: 75,
    glidePathShape: 'linear',

    // Scenario Testing
    historicalYear: undefined,
    inflationShockRate: null,
    inflationShockDuration: 0,

    // Healthcare & Medicare
    includeMedicare: true,
    medicarePremium: 400,
    medicalInflation: 5.0,
    irmaaThresholdSingle: 109000,
    irmaaThresholdMarried: 218000,
    irmaaSurcharge: 230,

    // Long-Term Care
    includeLTC: false,
    ltcAnnualCost: 80000,
    ltcProbability: 50,
    ltcDuration: 2.5,
    ltcOnsetAge: 82,
    ltcAgeRangeStart: 75,
    ltcAgeRangeEnd: 90,

    // Roth Conversion Strategy
    enableRothConversions: false,
    targetConversionBracket: 0.24,

    // Generational Wealth
    showGen: false,
    hypPerBen: 30000,
    hypStartBens: 65,
    totalFertilityRate: 2.1,
    generationLength: 30,
    hypDeathAge: 90,
    hypMinDistAge: 18,
    hypBenAgesStr: '',
    fertilityWindowStart: 20,
    fertilityWindowEnd: 45,

    // Income Calculator Expense Details (optional, populated by wizard)
    monthlyHouseholdExpenses: 0,
    monthlyDiscretionary: 0,
    monthlyChildcare: 0,
    annualLifeInsuranceP1: 0,
    annualLifeInsuranceP2: 0,

    // Metadata
    fieldMetadata: {},
    missingFields: [],
    assumptions: [],
  };
}

/**
 * Check if a config is complete (all required fields set)
 */
export function isConfigComplete(config: PlanConfig): boolean {
  const requiredFields: Array<keyof PlanConfig> = [
    'age1',
    'retAge',
    'marital',
    'annualIncome1',
    'sTax',
    'sPre',
    'sPost',
  ];

  return requiredFields.every(field =>
    config[field] !== undefined &&
    config[field] !== null &&
    (typeof config[field] !== 'number' || !isNaN(config[field] as number))
  );
}

/**
 * Get list of missing required fields
 */
export function getMissingFields(config: PlanConfig): string[] {
  const requiredFields = [
    { key: 'age1', name: 'Your Age' },
    { key: 'retAge', name: 'Retirement Age' },
    { key: 'marital', name: 'Marital Status' },
    { key: 'annualIncome1', name: 'Annual Income' },
    { key: 'sTax', name: 'Taxable Account Balance' },
    { key: 'sPre', name: 'Traditional 401k/IRA Balance' },
    { key: 'sPost', name: 'Roth Account Balance' },
  ];

  if (config.marital === 'married') {
    requiredFields.push(
      { key: 'age2', name: 'Spouse Age' },
      { key: 'annualIncome2', name: 'Spouse Income' }
    );
  }

  return requiredFields
    .filter(({ key }) => {
      const value = config[key as keyof PlanConfig];
      return value === undefined || value === null || (typeof value === 'number' && isNaN(value));
    })
    .map(({ name }) => name);
}

/**
 * Merge partial updates into existing config
 * Preserves metadata and updates timestamps
 */
export function mergeConfigUpdates(
  current: PlanConfig,
  updates: Partial<PlanConfig>,
  source: 'user-entered' | 'ai-suggested' | 'default' | 'imported' = 'user-entered'
): PlanConfig {
  const now = Date.now();
  const newFieldMetadata = { ...current.fieldMetadata };

  // Update metadata for changed fields
  Object.keys(updates).forEach(key => {
    if (key !== 'fieldMetadata' && key !== 'updatedAt' && key !== 'version') {
      newFieldMetadata[key] = {
        field: key,
        source,
        updatedAt: now,
      };
    }
  });

  // If marital status is changing to 'single', clear spouse-related fields
  if (updates.marital === 'single' && current.marital !== 'single') {
    // Also update fieldMetadata for all cleared spouse fields
    const spouseFields = ['age2', 'employmentType2', 'annualIncome2', 'cTax2', 'cPre2', 'cPost2', 'cMatch2', 'ssIncome2', 'ssClaimAge2'];
    spouseFields.forEach(field => {
      newFieldMetadata[field] = {
        field,
        source,
        updatedAt: now,
      };
    });

    return {
      ...current,
      ...updates,
      // Clear spouse-related fields (use defaults)
      age2: 30,
      employmentType2: undefined,
      annualIncome2: 0,
      cTax2: 0,
      cPre2: 0,
      cPost2: 0,
      cMatch2: 0,
      ssIncome2: 0,
      ssClaimAge2: 67,
      updatedAt: now,
      fieldMetadata: newFieldMetadata,
    };
  }

  return {
    ...current,
    ...updates,
    updatedAt: now,
    fieldMetadata: newFieldMetadata,
  };
}
