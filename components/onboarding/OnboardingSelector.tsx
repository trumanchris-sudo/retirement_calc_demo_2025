'use client';

import { useState, useCallback } from 'react';
import { QuickStart } from './QuickStart';
import { AIConsole } from './AIConsole';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { saveSharedIncomeData } from '@/lib/sharedIncomeData';
import { usePlanConfig } from '@/lib/plan-config-context';
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

        // Map AI data to calculator inputs
        const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
          extractedData,
          assumptions
        );

        console.log('[OnboardingSelector] Mapped calculator inputs:', calculatorInputs);

        // Write to PlanConfig context
        updateConfig(calculatorInputs, 'ai-suggested');

        // Save assumptions to config
        if (generatedAssumptions && generatedAssumptions.length > 0) {
          updateConfig({ assumptions: generatedAssumptions }, 'ai-suggested');
        }

        // Save income data for income calculators (legacy support)
        saveSharedIncomeData({
          maritalStatus: extractedData.maritalStatus ?? 'single',
          state: extractedData.state,
          employmentType1: extractedData.employmentType1 ?? 'w2',
          primaryIncome: extractedData.primaryIncome ?? 100000,
          employmentType2: extractedData.employmentType2,
          spouseIncome: extractedData.spouseIncome,
          source: 'ai-onboarding',
          timestamp: Date.now(),
        });

        onComplete();
      } catch (error) {
        console.error('[OnboardingSelector] Failed to complete AI wizard:', error);
        alert(`Error completing onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      <div className="h-[100dvh] flex flex-col bg-black text-white">
        <AIConsole
          onComplete={handleGuidedComplete}
          onSkip={onSkip}
        />
      </div>
    );
  }

  // Render selector screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center p-4">
      <div className="max-w-xl w-full text-center">
        {/* Header */}
        <h1 className="text-3xl sm:text-4xl font-bold mb-3">
          Plan Your Retirement
        </h1>
        <p className="text-slate-400 text-lg mb-8">
          Choose how you&apos;d like to get started
        </p>

        {/* Options */}
        <div className="space-y-4">
          {/* Quick Start Option */}
          <button
            onClick={() => setMode('quick')}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600/20 to-cyan-600/20 border border-blue-500/30 p-6 text-left transition-all hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-500/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold text-white">Quick Estimate</h3>
                  <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium">
                    30 seconds
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Answer 3 simple questions and see your retirement projection instantly.
                  Perfect for a quick reality check.
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-cyan-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* Guided Setup Option */}
          <button
            onClick={() => setMode('guided')}
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-600/20 to-pink-600/20 border border-purple-500/30 p-6 text-left transition-all hover:border-purple-400/50 hover:shadow-lg hover:shadow-purple-500/10"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-purple-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-xl font-semibold text-white">Guided Setup</h3>
                  <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium">
                    2-3 minutes
                  </span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Have a conversation with our AI to build a comprehensive plan.
                  We&apos;ll ask about income, savings, and goals.
                </p>
              </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/5 to-pink-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* Skip option */}
        <div className="mt-8">
          <button
            onClick={onSkip}
            className="text-sm text-slate-500 hover:text-slate-400 underline underline-offset-2"
          >
            Skip and enter data manually
          </button>
        </div>
      </div>
    </div>
  );
}
