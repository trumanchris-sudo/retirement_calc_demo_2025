'use client';

import { useCallback } from 'react';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
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
