/**
 * Maps onboarding wizard data to main app state
 *
 * LEGACY: Used by old 4-step manual wizard.
 * New AI wizard writes directly to PlanConfig context.
 * Kept for backward compatibility with manual wizard fallback.
 */

import type { OnboardingWizardData } from '@/types/onboarding'
import type { FilingStatus } from '@/lib/calculations/taxCalculations'
import { getTypicalSavingsRate, IRS_LIMITS_2026 } from '@/types/onboarding'

export interface AppState {
  // Personal Info
  marital: FilingStatus
  age1: number
  age2: number
  retirementAge: number

  // Contributions
  cTax1: number
  cPre1: number
  cPost1: number
  cMatch1: number
  cTax2: number
  cPre2: number
  cPost2: number
  cMatch2: number

  // Assumptions
  wdRate: number // Withdrawal rate based on retirement spending
}

/**
 * Convert wizard data to app state
 */
export function wizardDataToAppState(wizardData: OnboardingWizardData): AppState {
  const { basics, savings, goals } = wizardData

  // Map marital status
  const marital: FilingStatus = basics.maritalStatus === 'married' ? 'married' : 'single'

  // Calculate contributions for person 1
  let cTax1 = 0, cPre1 = 0, cPost1 = 0
  const cMatch1 = 0

  if (savings.savingsMode === 'max401k') {
    cPre1 = IRS_LIMITS_2026['401k']
  } else if (savings.savingsMode === 'supersaver') {
    // Max 401k + Backdoor Roth IRA
    cPre1 = IRS_LIMITS_2026['401k']
    cPost1 = IRS_LIMITS_2026.ira
  } else if (savings.savingsMode === 'typical' && savings.income > 0) {
    const rate = getTypicalSavingsRate(savings.income)
    const totalSavings = savings.income * rate
    // Split between pre-tax 401k (60%) and Roth IRA (25%) and taxable (15%)
    cPre1 = Math.round(totalSavings * 0.6)
    cPost1 = Math.round(totalSavings * 0.25)
    cTax1 = Math.round(totalSavings * 0.15)
  } else if (savings.savingsMode === 'custom') {
    cPre1 = savings.custom401k || 0
    cPost1 = (savings.customIRA || 0) + (savings.customBackdoorRoth || 0)
    cTax1 = savings.customTaxable || 0
  }

  // Calculate contributions for person 2 (if married)
  let cTax2 = 0, cPre2 = 0, cPost2 = 0
  const cMatch2 = 0

  if (basics.maritalStatus === 'married' && savings.spouseIncome) {
    const spouseMode = savings.spouseSavingsMode || 'typical'

    if (spouseMode === 'max401k') {
      cPre2 = IRS_LIMITS_2026['401k']
    } else if (spouseMode === 'supersaver') {
      cPre2 = IRS_LIMITS_2026['401k']
      cPost2 = IRS_LIMITS_2026.ira
    } else if (spouseMode === 'typical') {
      const rate = getTypicalSavingsRate(savings.spouseIncome)
      const totalSavings = savings.spouseIncome * rate
      cPre2 = Math.round(totalSavings * 0.6)
      cPost2 = Math.round(totalSavings * 0.25)
      cTax2 = Math.round(totalSavings * 0.15)
    } else if (spouseMode === 'custom') {
      cPre2 = savings.spouseCustom401k || 0
      cPost2 = (savings.spouseCustomIRA || 0) + (savings.spouseCustomBackdoorRoth || 0)
      cTax2 = savings.spouseCustomTaxable || 0
    }
  }

  // Calculate withdrawal rate based on retirement spending
  // This is a simplified approach - we'll use the default 3.5% for now
  // In a more sophisticated version, we could calculate this from the spending target
  const wdRate = 3.5

  return {
    marital,
    age1: basics.age,
    age2: basics.spouseAge || basics.age, // Default to same age if not specified
    retirementAge: goals.retirementAge,
    cTax1,
    cPre1,
    cPost1,
    cMatch1,
    cTax2,
    cPre2,
    cPost2,
    cMatch2,
    wdRate,
  }
}
