'use client';

import { useState, useCallback } from 'react';
import { toast } from '@/hooks/use-toast';
import { QuickStart } from './QuickStart';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { processOnboardingClientSide } from '@/lib/processOnboardingClientSide';
import { usePlanConfig } from '@/lib/plan-config-context';
import type { PlanConfig } from '@/types/plan-config';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';
import { Zap, SlidersHorizontal } from 'lucide-react';

interface OnboardingSelectorProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingMode = 'selector' | 'quick' | 'guided';

/**
 * Selector component that lets users choose between:
 * 1. Quick Start - 3 questions, instant results
 * 2. Guided Setup - Structured setup with assumptions review
 */
export function OnboardingSelector({ onComplete, onSkip }: OnboardingSelectorProps) {
  const [mode, setMode] = useState<OnboardingMode>('selector');
  const { updateConfig } = usePlanConfig();

  // Handle AI wizard completion
  const handleGuidedComplete = useCallback(
    async (extractedData: ExtractedData, assumptions: AssumptionWithReasoning[]) => {
      try {
        // Enrich extracted data with expense assumptions
        const processed = processOnboardingClientSide(extractedData);
        const enrichedData = processed.extractedData;
        const allAssumptions = [...assumptions, ...processed.assumptions];

        // Map enriched data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          enrichedData,
          allAssumptions
        );

        // Write to PlanConfig context (batched into a single call to avoid double re-render)
        const configUpdate: Partial<PlanConfig> = { ...calculatorInputs };
        if (generatedAssumptions && generatedAssumptions.length > 0) {
          configUpdate.assumptions = generatedAssumptions;
        }
        updateConfig(configUpdate, 'ai-suggested');

        onComplete();
      } catch (error) {
        console.error('[OnboardingSelector] Failed to complete AI wizard:', error);
        toast.error(`Error completing onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [updateConfig, onComplete]
  );

  // Render Quick Start mode
  if (mode === 'quick') {
    return (
      <QuickStart
        onComplete={onComplete}
        onSwitchToGuided={() => setMode('guided')}
      />
    );
  }

  // Render Guided AI wizard mode
  if (mode === 'guided') {
    return (
      <div className="h-[100dvh] flex flex-col bg-background text-foreground">
        <AIConsole
          onComplete={handleGuidedComplete}
          onSkip={onSkip}
          onBack={() => setMode('selector')}
        />
      </div>
    );
  }

  // Render selector screen
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-foreground">
      <div className="w-full max-w-3xl space-y-8 text-center">
        {/* Header */}
        <div className="mx-auto max-w-2xl space-y-3">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            WORK DIE RETIRE
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            Start with the version of planning you can actually finish.
          </h1>
          <p className="text-base leading-7 text-muted-foreground sm:text-lg">
            Get a rough preview in under a minute, or walk through a guided setup when you want the assumptions spelled out.
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 gap-4 text-left md:grid-cols-2">
          {/* Quick Start Option */}
          <button
            onClick={() => setMode('quick')}
            className="group w-full rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md dark:hover:border-emerald-800"
            aria-label="Quick Estimate — answer 3 questions for instant results"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 transition-colors group-hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900">
                <Zap className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Quick Estimate</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">~30 seconds</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Answer 3 quick questions and get an instant retirement projection.
                  We&apos;ll fill in the rest with smart defaults.
                </p>
              </div>
            </div>
          </button>

          {/* Guided Setup Option */}
          <button
            onClick={() => setMode('guided')}
            className="group w-full rounded-2xl border bg-card p-6 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md dark:hover:border-blue-800"
            aria-label="Guided Setup — structured setup with assumptions review"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 ring-1 ring-blue-200 transition-colors group-hover:bg-blue-100 dark:bg-blue-950/30 dark:text-blue-300 dark:ring-blue-900">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-foreground">Guided Setup</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">1-2 minutes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Enter the facts that move the math, then review the assumptions
                  before building the full calculator.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Skip option */}
        <div>
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground underline underline-offset-4 transition-colors hover:text-foreground"
            aria-label="Skip setup and enter data manually"
          >
            Skip and enter data manually
          </button>
        </div>
      </div>
    </div>
  );
}
