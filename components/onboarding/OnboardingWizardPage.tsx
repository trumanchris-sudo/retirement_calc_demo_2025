'use client';

import { useCallback } from 'react';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { saveSharedIncomeData } from '@/lib/sharedIncomeData';
import { usePlanConfig } from '@/lib/plan-config-context';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';

interface OnboardingWizardPageProps {
  onComplete: () => void;
  onSkip: () => void;
}

/**
 * Full-page wizard experience (no dialog wrapper)
 * This is the first thing users see when visiting the site
 */
export function OnboardingWizardPage({ onComplete, onSkip }: OnboardingWizardPageProps) {
  const { updateConfig } = usePlanConfig();

  const handleComplete = useCallback(
    async (extractedData: ExtractedData, assumptions: AssumptionWithReasoning[]) => {
      try {
        console.log('[OnboardingWizardPage] Starting completion...', { extractedData, assumptions });

        // Map AI data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          extractedData,
          assumptions
        );

        console.log('[OnboardingWizardPage] Mapped calculator inputs:', calculatorInputs);
        console.log('[OnboardingWizardPage] Generated assumptions:', generatedAssumptions);

        // Write to PlanConfig context (SINGLE SOURCE OF TRUTH)
        console.log('[OnboardingWizardPage] Writing to PlanConfig (SSOT)...');
        updateConfig(calculatorInputs, 'ai-suggested');

        // Log SSOT after update - especially critical fields that have been buggy
        console.log('[OnboardingWizardPage] ✅ SSOT Updated:', {
          retirementAge: calculatorInputs.retAge,
          annualIncome1: calculatorInputs.annualIncome1,
          annualIncome2: calculatorInputs.annualIncome2,
          emergencyFund: calculatorInputs.emergencyFund,
          // Critical fields per user request:
          monthlyMortgageRent: calculatorInputs.monthlyMortgageRent,
          eoyBonusAmount: (calculatorInputs as any).eoyBonusAmount,
          eoyBonusMonth: (calculatorInputs as any).eoyBonusMonth,
          firstPayDate: (calculatorInputs as any).firstPayDate,
          fullConfig: calculatorInputs,
        });

        // Save assumptions to config
        if (generatedAssumptions && generatedAssumptions.length > 0) {
          updateConfig({ assumptions: generatedAssumptions }, 'ai-suggested');
        }

        // Save income data for income calculators (legacy support - will be removed when income calc uses SSOT)
        saveSharedIncomeData({
          maritalStatus: extractedData.maritalStatus ?? 'single',
          state: extractedData.state,
          employmentType1: extractedData.employmentType1 ?? 'w2',
          annualIncome1: extractedData.annualIncome1 ?? 100000,
          employmentType2: extractedData.employmentType2,
          annualIncome2: extractedData.annualIncome2,
          source: 'ai-onboarding',
          timestamp: Date.now(),
        });

        console.log('[OnboardingWizardPage] Wizard complete, calling onComplete...');

        // Mark onboarding as complete and transition to calculator
        onComplete();
      } catch (error) {
        console.error('[OnboardingWizardPage] Failed to complete onboarding:', error);
        alert(`Error completing onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [updateConfig, onComplete]
  );

  const handleSkip = useCallback(() => {
    console.log('[OnboardingWizardPage] User skipped wizard');
    onSkip();
  }, [onSkip]);

  // Full-page layout (no dialog)
  return (
    <div className="fixed inset-0 bg-black">
      <AIConsole onComplete={handleComplete} onSkip={handleSkip} />
    </div>
  );
}
