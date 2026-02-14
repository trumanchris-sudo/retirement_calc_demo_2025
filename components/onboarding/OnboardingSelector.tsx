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
import { Zap, MessageSquare } from 'lucide-react';

interface OnboardingSelectorProps {
  onComplete: () => void;
  onSkip: () => void;
}

type OnboardingMode = 'selector' | 'quick' | 'guided';

/**
 * Selector component that lets users choose between:
 * 1. Quick Start - 3 questions, instant results
 * 2. Guided Setup - Full AI wizard experience
 */
export function OnboardingSelector({ onComplete, onSkip }: OnboardingSelectorProps) {
  const [mode, setMode] = useState<OnboardingMode>('selector');
  const { updateConfig } = usePlanConfig();

  // Handle AI wizard completion
  const handleGuidedComplete = useCallback(
    async (extractedData: ExtractedData, assumptions: AssumptionWithReasoning[]) => {
      try {
        console.log('[OnboardingSelector] AI Wizard completed', { extractedData, assumptions });

        // Enrich extracted data with expense assumptions
        const processed = processOnboardingClientSide(extractedData);
        const enrichedData = processed.extractedData;
        const allAssumptions = [...assumptions, ...processed.assumptions];

        // Map enriched data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          enrichedData,
          allAssumptions
        );

        console.log('[OnboardingSelector] Mapped calculator inputs:', calculatorInputs);

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
    <div className="min-h-screen bg-background text-foreground flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full text-center space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
            Plan Your Retirement
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose how you&apos;d like to get started
          </p>
        </div>

        {/* Options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
          {/* Quick Start Option */}
          <button
            onClick={() => setMode('quick')}
            className="w-full group rounded-lg border bg-card p-6 text-left transition-all hover:shadow-md hover:border-primary/50"
            aria-label="Quick Estimate — answer 3 questions for instant results"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                <Zap className="w-5 h-5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
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
            className="w-full group rounded-lg border bg-card p-6 text-left transition-all hover:shadow-md hover:border-primary/50"
            aria-label="Guided Setup — conversational walkthrough in 2-3 minutes"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-foreground">Guided Setup</h3>
                </div>
                <p className="text-xs text-muted-foreground mb-2">2-3 minutes</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Walk through a conversational wizard that asks about your income,
                  savings, and goals to build a personalized plan.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Skip option */}
        <div>
          <button
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
            aria-label="Skip setup and enter data manually"
          >
            Skip and enter data manually
          </button>
        </div>
      </div>
    </div>
  );
}
