'use client';

import { useCallback } from 'react';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { saveSharedIncomeData } from '@/lib/sharedIncomeData';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface OnboardingWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (calculatorData: any) => Promise<void>;
}

export function OnboardingWizard({ isOpen, onClose, onComplete }: OnboardingWizardProps) {
  const handleComplete = useCallback(
    async (extractedData: ExtractedData, assumptions: AssumptionWithReasoning[]) => {
      try {
        // Map AI data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          extractedData,
          assumptions
        );

        console.log('[OnboardingWizard] Mapped calculator inputs:', calculatorInputs);
        console.log('[OnboardingWizard] Generated assumptions:', generatedAssumptions);

        // Save income data for income calculators
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

        console.log('[OnboardingWizard] Saved shared income data for income calculators');

        // Pass to calculator
        await onComplete(calculatorInputs);

        // Close wizard
        onClose();
      } catch (error) {
        console.error('[OnboardingWizard] Failed to complete onboarding:', error);
      }
    },
    [onComplete, onClose]
  );

  const handleSkip = useCallback(() => {
    onClose();
  }, [onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-full max-h-full h-screen w-screen p-0 m-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <AIConsole onComplete={handleComplete} onSkip={handleSkip} />
      </DialogContent>
    </Dialog>
  );
}
