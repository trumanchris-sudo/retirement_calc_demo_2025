import { useState, useEffect, useCallback } from 'react'
import type {
  OnboardingState,
  OnboardingWizardData,
  OnboardingBasicsData,
  OnboardingSavingsData,
  OnboardingGoalsData,
} from '@/types/onboarding'
import type { CalculatorInputs } from '@/types/calculator'

const ONBOARDING_STORAGE_KEY = 'wdr_onboarding_state'
const WIZARD_PROGRESS_KEY = 'wdr_wizard_progress'

/**
 * Check if PlanConfig has minimum required data to skip wizard
 * Per user constraint: don't hide wizard unless flag is true AND config is valid
 */
function isPlanConfigComplete(config: Partial<CalculatorInputs>): boolean {
  const required = [
    config.marital,
    config.age1,
    config.retAge,
    config.annualIncome1,
    // At least one balance field should be present
    config.sTax !== undefined || config.sPre !== undefined || config.sPost !== undefined,
  ]

  const isComplete = required.every((field) => field !== undefined && field !== null)

  if (!isComplete) {
    console.log('[useOnboarding] PlanConfig incomplete, showing wizard:', {
      marital: config.marital,
      age1: config.age1,
      retAge: config.retAge,
      annualIncome1: config.annualIncome1,
      hasBalances: config.sTax !== undefined || config.sPre !== undefined || config.sPost !== undefined,
    })
  }

  return isComplete
}

/**
 * Hook for managing onboarding state and wizard progress
 */
export function useOnboarding(planConfig?: Partial<CalculatorInputs>) {
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({ hasCompletedOnboarding: false })
  const [wizardData, setWizardData] = useState<OnboardingWizardData | null>(null)

  // Track whether we've loaded from localStorage to avoid hydration mismatch
  // Before this is true, we return shouldShowWizard: null to show a loading state
  const [hasMounted, setHasMounted] = useState(false)

  // Load from localStorage after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(ONBOARDING_STORAGE_KEY)
        if (stored) {
          setOnboardingState(JSON.parse(stored))
        }
      } catch (error) {
        console.error('Failed to load onboarding state:', error)
      }

      try {
        const storedWizard = localStorage.getItem(WIZARD_PROGRESS_KEY)
        if (storedWizard) {
          setWizardData(JSON.parse(storedWizard))
        }
      } catch (error) {
        console.error('Failed to load wizard progress:', error)
      }

      // Mark as mounted after loading localStorage
      setHasMounted(true)
    }
  }, [])

  // Save onboarding state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(onboardingState))
      } catch (error) {
        console.error('Failed to save onboarding state:', error)
      }
    }
  }, [onboardingState])

  // Save wizard progress to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && wizardData) {
      try {
        localStorage.setItem(WIZARD_PROGRESS_KEY, JSON.stringify(wizardData))
      } catch (error) {
        console.error('Failed to save wizard progress:', error)
      }
    }
  }, [wizardData])

  const markOnboardingComplete = useCallback(() => {
    setOnboardingState((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
    }))
    // Clear wizard progress after completion
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WIZARD_PROGRESS_KEY)
    }
    setWizardData(null)
  }, [])

  const resetOnboarding = useCallback(() => {
    setOnboardingState({ hasCompletedOnboarding: false })
    setWizardData(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(ONBOARDING_STORAGE_KEY)
      localStorage.removeItem(WIZARD_PROGRESS_KEY)
    }
  }, [])

  const updateWizardStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setWizardData((prev) => {
      if (!prev) {
        // Initialize wizard data
        return {
          currentStep: step,
          basics: {
            age: 30,
            maritalStatus: 'single',
            state: '',
          },
          savings: {
            income: 0,
            savingsMode: 'typical',
          },
          goals: {
            retirementAge: 65,
            lifestylePreset: 'comfortable',
          },
        }
      }
      return { ...prev, currentStep: step }
    })
  }, [])

  const updateBasics = useCallback((data: Partial<OnboardingBasicsData>) => {
    setWizardData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        basics: { ...prev.basics, ...data },
      }
    })
  }, [])

  const updateSavings = useCallback((data: Partial<OnboardingSavingsData>) => {
    setWizardData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        savings: { ...prev.savings, ...data },
      }
    })
  }, [])

  const updateGoals = useCallback((data: Partial<OnboardingGoalsData>) => {
    setWizardData((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        goals: { ...prev.goals, ...data },
      }
    })
  }, [])

  const clearWizardProgress = useCallback(() => {
    setWizardData(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(WIZARD_PROGRESS_KEY)
    }
  }, [])

  // Validate both flag AND config data
  // Don't hide wizard unless both are true
  // Return null before mount to prevent hydration mismatch
  const shouldShowWizard = hasMounted
    ? !onboardingState.hasCompletedOnboarding || (planConfig ? !isPlanConfigComplete(planConfig) : true)
    : null // null indicates "loading" state - component should show loading UI

  return {
    hasCompletedOnboarding: onboardingState.hasCompletedOnboarding,
    shouldShowWizard,
    hasMounted, // Expose this so components can show loading state if needed
    wizardData,
    markOnboardingComplete,
    resetOnboarding,
    updateWizardStep,
    updateBasics,
    updateSavings,
    updateGoals,
    clearWizardProgress,
  }
}
