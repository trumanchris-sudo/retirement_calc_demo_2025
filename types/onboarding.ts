/**
 * Onboarding wizard types for guided plan setup
 */

export type SavingsMode = 'max401k' | 'supersaver' | 'typical' | 'custom'

export type LifestylePreset = 'lean' | 'comfortable' | 'luxurious' | 'custom'

export interface OnboardingBasicsData {
  age: number
  spouseAge?: number
  maritalStatus: 'single' | 'married'
  state: string
}

export interface OnboardingSavingsData {
  income: number
  spouseIncome?: number
  savingsMode: SavingsMode
  spouseSavingsMode?: SavingsMode
  // For 'typical' mode, we calculate defaults
  // For 'custom' mode:
  custom401k?: number
  customIRA?: number
  customBackdoorRoth?: number
  customTaxable?: number
  spouseCustom401k?: number
  spouseCustomIRA?: number
  spouseCustomBackdoorRoth?: number
  spouseCustomTaxable?: number
}

/**
 * IRS contribution limits for 2026 (official, announced Nov 2025)
 */
export const IRS_LIMITS_2026 = {
  '401k': 24500,
  'ira': 7500,
  'catchUp401k': 8000, // Age 50+
  'catchUpIRA': 1100, // Age 50+
}

export interface OnboardingGoalsData {
  retirementAge: number
  lifestylePreset: LifestylePreset
  customSpending?: number
}

export interface OnboardingWizardData {
  currentStep: 1 | 2 | 3 | 4
  basics: OnboardingBasicsData
  savings: OnboardingSavingsData
  goals: OnboardingGoalsData
}

export interface OnboardingState {
  hasCompletedOnboarding: boolean
  wizardData?: OnboardingWizardData
}

/**
 * Lifestyle preset mappings
 * Lean: 60% of pre-retirement income
 * Comfortable: 80% of pre-retirement income
 * Luxurious: 120% of pre-retirement income
 */
export const LIFESTYLE_SPENDING_MULTIPLIERS: Record<Exclude<LifestylePreset, 'custom'>, number> = {
  lean: 0.6,
  comfortable: 0.8,
  luxurious: 1.2,
}

/**
 * Default savings rate for 'typical' mode based on income
 * Conservative defaults: lower income = lower savings rate
 */
export function getTypicalSavingsRate(income: number): number {
  if (income < 50000) return 0.08 // 8%
  if (income < 75000) return 0.10 // 10%
  if (income < 100000) return 0.12 // 12%
  if (income < 150000) return 0.15 // 15%
  return 0.18 // 18% for high earners
}

/**
 * Calculate default retirement spending based on lifestyle preset
 */
export function calculateRetirementSpending(
  income: number,
  spouseIncome: number | undefined,
  lifestylePreset: LifestylePreset,
  customSpending?: number
): number {
  if (lifestylePreset === 'custom' && customSpending) {
    return customSpending
  }

  const totalIncome = income + (spouseIncome || 0)
  const multiplier = LIFESTYLE_SPENDING_MULTIPLIERS[lifestylePreset as Exclude<LifestylePreset, 'custom'>] || 0.8

  // Return 80% of the calculated amount to account for taxes
  return Math.round(totalIncome * multiplier * 0.8)
}
