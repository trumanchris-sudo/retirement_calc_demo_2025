'use client';

import { useCallback, useEffect } from 'react';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { saveSharedIncomeData } from '@/lib/sharedIncomeData';
import { usePlanConfig } from '@/lib/plan-config-context';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (calculatorData: any) => Promise<void>;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const { updateConfig } = usePlanConfig();

  // Lock scroll when wizard is open (iOS Safari fix)
  useEffect(() => {
    if (isOpen) {
      // Add class to lock scroll (only overflow: hidden, no position: fixed)
      document.documentElement.classList.add('wizard-open');
      document.body.classList.add('wizard-open');

      return () => {
        // Remove lock class
        document.documentElement.classList.remove('wizard-open');
        document.body.classList.remove('wizard-open');
      };
    }
  }, [isOpen]);

  const handleComplete = useCallback(
    async (extractedData: ExtractedData, assumptions: AssumptionWithReasoning[]) => {
      try {
        console.log('[OnboardingWizard] Starting completion...', { extractedData, assumptions });

        // Map AI data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          extractedData,
          assumptions
        );

        console.log('[OnboardingWizard] Mapped calculator inputs:', calculatorInputs);
        console.log('[OnboardingWizard] Generated assumptions:', generatedAssumptions);

        // Write to PlanConfig context (single source of truth)
        console.log('[OnboardingWizard] Writing to PlanConfig context...');
        updateConfig(calculatorInputs, 'ai-suggested');

        // Save assumptions to config
        if (generatedAssumptions && generatedAssumptions.length > 0) {
          updateConfig({ assumptions: generatedAssumptions }, 'ai-suggested');
        }
        console.log('[OnboardingWizard] PlanConfig updated successfully');

        // Save income data for income calculators (legacy support - will be removed in Phase 4)
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

        console.log('[OnboardingWizard] Saved shared income data (legacy)');

        // Pass to calculator (this will be simplified in Phase 3 when page.tsx uses PlanConfig)
        console.log('[OnboardingWizard] Calling parent onComplete...');
        await onComplete(calculatorInputs);

        console.log('[OnboardingWizard] Parent onComplete finished, closing wizard...');
        // Close wizard
        onClose();
        console.log('[OnboardingWizard] onClose called');
      } catch (error) {
        console.error('[OnboardingWizard] Failed to complete onboarding:', error);
        alert(`Error completing onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [updateConfig, onComplete, onClose]
  );

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-full w-screen p-0 m-0"
        style={{ height: '100dvh', maxHeight: '100dvh' }}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AIConsole onComplete={handleComplete} onSkip={handleSkip} />
      </DialogContent>
    </Dialog>
  );
}
