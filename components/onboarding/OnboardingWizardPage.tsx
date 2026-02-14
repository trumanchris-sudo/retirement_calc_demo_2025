'use client';

import { useCallback, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { processOnboardingClientSide } from '@/lib/processOnboardingClientSide';
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

        // Enrich extracted data with expense assumptions (housing, healthcare, discretionary, etc.)
        const processed = processOnboardingClientSide(extractedData);
        const enrichedData = processed.extractedData;
        const allAssumptions = [...assumptions, ...processed.assumptions];

        // Map enriched data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          enrichedData,
          allAssumptions
        );

        console.log('[OnboardingWizardPage] Mapped calculator inputs:', calculatorInputs);
        console.log('[OnboardingWizardPage] Generated assumptions:', generatedAssumptions);

        // Write to PlanConfig context (SINGLE SOURCE OF TRUTH)
        console.log('[OnboardingWizardPage] Writing to PlanConfig (SSOT)...');
        updateConfig(calculatorInputs, 'ai-suggested');

        // Log SSOT after update - especially critical fields that have been buggy
        console.log('[OnboardingWizardPage] ✅ SSOT Updated:', {
          retirementAge: calculatorInputs.retirementAge,
          primaryIncome: calculatorInputs.primaryIncome,
          spouseIncome: calculatorInputs.spouseIncome,
          emergencyFund: calculatorInputs.emergencyFund,
          // Critical fields per user request:
          monthlyMortgageRent: calculatorInputs.monthlyMortgageRent,
          eoyBonusAmount: calculatorInputs.eoyBonusAmount,
          eoyBonusMonth: calculatorInputs.eoyBonusMonth,
          firstPayDate: calculatorInputs.firstPayDate,
          fullConfig: calculatorInputs,
        });

        // Save assumptions to config
        if (generatedAssumptions && generatedAssumptions.length > 0) {
          updateConfig({ assumptions: generatedAssumptions }, 'ai-suggested');
        }

        console.log('[OnboardingWizardPage] Wizard complete, calling onComplete...');

        // Mark onboarding as complete and transition to calculator
        onComplete();
      } catch (error) {
        console.error('[OnboardingWizardPage] Failed to complete onboarding:', error);
        toast.error(`Error completing onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [updateConfig, onComplete]
  );

  const handleSkip = useCallback(() => {
    console.log('[OnboardingWizardPage] User skipped wizard');
    onSkip();
  }, [onSkip]);

  // Track keyboard offset to push wizard up when keyboard appears
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // Detect keyboard and push entire wizard up by keyboard height
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;

    const vv = window.visualViewport;

    const handleResize = () => {
      // Calculate keyboard height: viewport shrinks when keyboard appears
      const keyboardHeight = window.innerHeight - vv.height;

      // Only apply offset when keyboard is actually showing (height > 100px threshold)
      // This prevents minor viewport changes from triggering the offset
      if (keyboardHeight > 100) {
        setKeyboardOffset(keyboardHeight);
      } else {
        setKeyboardOffset(0);
      }
    };

    vv.addEventListener('resize', handleResize);

    // Initial check
    handleResize();

    return () => vv.removeEventListener('resize', handleResize);
  }, []);

  // Full-page layout with proper mobile support
  // Use h-[100dvh] for dynamic viewport height (accounts for iOS browser bars)
  // Push wizard top down when keyboard appears to keep it centered in visible viewport
  return (
    <div
      className="h-[100dvh] flex flex-col bg-background text-foreground transition-all duration-200 ease-out"
      style={{
        paddingTop: keyboardOffset > 0 ? `${keyboardOffset}px` : '0'
      }}
    >
      <AIConsole onComplete={handleComplete} onSkip={handleSkip} />
    </div>
  );
}
