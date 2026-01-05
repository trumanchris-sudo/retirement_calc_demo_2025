'use client'

import { useState, useCallback, useEffect } from 'react'
import { X, ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Progress } from '@/components/ui/progress'
import { useOnboarding } from '@/hooks/useOnboarding'
import { BasicsStep } from './steps/BasicsStep'
import { SavingsStep } from './steps/SavingsStep'
import { GoalsStep } from './steps/GoalsStep'
import { ReviewStep } from './steps/ReviewStep'

interface OnboardingWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (wizardData: any) => Promise<void>
}

const STEP_TITLES = {
  1: 'Tell us about you',
  2: 'Your savings',
  3: 'What are you aiming for?',
  4: 'Review & run your plan',
}

const STEP_LABELS = {
  1: 'Basics',
  2: 'Savings',
  3: 'Goals',
  4: 'Review',
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const {
    wizardData,
    updateWizardStep,
    updateBasics,
    updateSavings,
    updateGoals,
    markOnboardingComplete,
    clearWizardProgress,
  } = useOnboarding()

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize wizard data when opened
  useEffect(() => {
    if (isOpen) {
      if (wizardData) {
        setCurrentStep(wizardData.currentStep)
      } else {
        updateWizardStep(1)
        setCurrentStep(1)
      }
    }
  }, [isOpen, wizardData, updateWizardStep])

  // Update wizard step in storage when currentStep changes
  useEffect(() => {
    if (isOpen) {
      updateWizardStep(currentStep)
    }
  }, [currentStep, isOpen, updateWizardStep])

  const handleNext = useCallback(() => {
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as 1 | 2 | 3 | 4)
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3 | 4)
    }
  }, [currentStep])

  const handleSkip = useCallback(() => {
    clearWizardProgress()
    onClose()
  }, [clearWizardProgress, onClose])

  const handleRunPlan = useCallback(async () => {
    if (!wizardData) return

    setIsSubmitting(true)
    try {
      await onComplete(wizardData)
      markOnboardingComplete()
      onClose()
    } catch (error) {
      console.error('Failed to run plan:', error)
    } finally {
      setIsSubmitting(false)
    }
  }, [wizardData, onComplete, markOnboardingComplete, onClose])

  const progress = (currentStep / 4) * 100

  if (!wizardData) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              {STEP_TITLES[currentStep]}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              aria-label="Close wizard"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Step indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            {Object.entries(STEP_LABELS).map(([step, label]) => (
              <div
                key={step}
                className={`flex-1 text-center text-sm font-medium ${
                  parseInt(step) === currentStep
                    ? 'text-primary'
                    : parseInt(step) < currentStep
                    ? 'text-muted-foreground'
                    : 'text-muted-foreground/50'
                }`}
              >
                {label}
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step content */}
        <div className="py-6">
          {currentStep === 1 && (
            <BasicsStep
              data={wizardData.basics}
              onChange={updateBasics}
            />
          )}
          {currentStep === 2 && (
            <SavingsStep
              data={wizardData.savings}
              basicsData={wizardData.basics}
              onChange={updateSavings}
            />
          )}
          {currentStep === 3 && (
            <GoalsStep
              data={wizardData.goals}
              savingsData={wizardData.savings}
              onChange={updateGoals}
            />
          )}
          {currentStep === 4 && (
            <ReviewStep
              wizardData={wizardData}
              onRunPlan={handleRunPlan}
              isSubmitting={isSubmitting}
            />
          )}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <div>
            {currentStep === 1 ? (
              <Button variant="ghost" onClick={handleSkip}>
                Skip, I&apos;ll configure manually
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            {currentStep < 4 && (
              <Button onClick={handleNext}>
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Helper text */}
        {currentStep < 4 && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            You can refine everything later. This is just to get started.
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
