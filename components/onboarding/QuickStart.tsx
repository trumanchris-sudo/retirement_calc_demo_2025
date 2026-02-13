'use client';

import { useState, useCallback, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlanConfig } from '@/lib/plan-config-context';
import { mapAIDataToCalculator } from '@/lib/aiOnboardingMapper';
import { saveSharedIncomeData } from '@/lib/sharedIncomeData';
import type { ExtractedData } from '@/types/ai-onboarding';
import { cn } from '@/lib/utils';
import { ChevronRight, ChevronDown, Sparkles, TrendingUp, Users, PiggyBank, Target, ArrowRight } from 'lucide-react';

interface QuickStartProps {
  onComplete: () => void;
  onSwitchToGuided: () => void;
}

/**
 * Smart defaults based on the 3 quick inputs
 */
function deriveDefaults(age: number, income: number, savings: number, isMarried: boolean) {

  // Assume 10% savings rate
  const savingsRate = 0.10;
  const annualContributions = income * savingsRate;

  // Assume typical 401k match (3% of income)
  const employerMatch = income * 0.03;

  // Retirement age = 65 (standard)
  const retirementAge = 65;

  // Years to retirement
  const yearsToRetirement = Math.max(retirementAge - age, 1);

  // National average asset allocation by age: bonds = age% (conservative rule)
  // We use 100 - age for stocks
  const stockAllocation = Math.max(100 - age, 20);
  const expectedReturn = stockAllocation > 70 ? 0.08 : stockAllocation > 50 ? 0.065 : 0.05;

  // Split savings: assume 60% pre-tax, 30% Roth, 10% taxable
  const pretaxRatio = 0.6;
  const rothRatio = 0.3;
  const taxableRatio = 0.1;

  // Estimate current account breakdown from total savings
  const pretaxBalance = savings * pretaxRatio;
  const rothBalance = savings * rothRatio;
  const taxableBalance = savings * taxableRatio;

  // Annual contributions breakdown
  const traditionalContrib = Math.min(annualContributions * 0.6, 23500); // 2026 limit
  const rothContrib = Math.min(annualContributions * 0.3, 7500); // 2026 IRA limit
  const taxableContrib = annualContributions * 0.1;

  return {
    isMarried,
    retirementAge,
    yearsToRetirement,
    expectedReturn,
    savingsRate,
    annualContributions,
    employerMatch,
    pretaxBalance,
    rothBalance,
    taxableBalance,
    traditionalContrib,
    rothContrib,
    taxableContrib,
  };
}

/**
 * Calculate future value with compound interest and contributions
 */
function calculateFutureValue(
  currentSavings: number,
  annualContribution: number,
  employerMatch: number,
  years: number,
  returnRate: number
): number {
  let balance = currentSavings;
  const totalAnnual = annualContribution + employerMatch;

  for (let i = 0; i < years; i++) {
    balance = balance * (1 + returnRate) + totalAnnual;
  }

  return balance;
}

/**
 * Calculate monthly retirement income using 4% rule
 */
function calculateMonthlyIncome(portfolioValue: number): number {
  return (portfolioValue * 0.04) / 12;
}

/**
 * Determine retirement readiness status
 */
function getReadinessStatus(
  projectedValue: number,
  currentIncome: number,
  age: number
): { status: 'behind' | 'on-track' | 'ahead'; message: string; color: string } {
  // Target: 25x annual expenses (4% rule), assume 70% income replacement
  const targetSpending = currentIncome * 0.7;
  const targetSavings = targetSpending * 25;

  // Age-based savings milestones (Fidelity guidelines)
  // 30: 1x salary, 40: 3x, 50: 6x, 60: 8x, 67: 10x
  const milestones: Record<number, number> = {
    25: 0.5, 30: 1, 35: 2, 40: 3, 45: 4, 50: 6, 55: 7, 60: 8, 65: 10
  };

  // Find closest milestone
  const closestAge = Object.keys(milestones)
    .map(Number)
    .reduce((prev, curr) =>
      Math.abs(curr - age) < Math.abs(prev - age) ? curr : prev
    );

  const targetMultiple = milestones[closestAge] || 1;
  const targetAtAge = currentIncome * targetMultiple;
  const ratio = projectedValue / targetSavings;

  if (ratio >= 1.1) {
    return {
      status: 'ahead',
      message: 'Excellent! You\'re ahead of schedule.',
      color: 'text-green-600'
    };
  } else if (ratio >= 0.8) {
    return {
      status: 'on-track',
      message: 'Good progress! You\'re on track.',
      color: 'text-blue-600'
    };
  } else {
    return {
      status: 'behind',
      message: 'Room for improvement. Small changes add up!',
      color: 'text-amber-600'
    };
  }
}

/**
 * Format currency for display
 */
function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

/**
 * Format full currency with commas
 */
function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

export function QuickStart({ onComplete, onSwitchToGuided }: QuickStartProps) {
  const { updateConfig } = usePlanConfig();

  // The 3 questions + filing status
  const [age, setAge] = useState<string>('');
  const [income, setIncome] = useState<string>('');
  const [savings, setSavings] = useState<string>('');
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');

  // UI state
  const [showResults, setShowResults] = useState(false);
  const [showRefinement, setShowRefinement] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Parse inputs
  const parsedAge = parseInt(age, 10) || 0;
  const parsedIncome = parseInt(income.replace(/[,$]/g, ''), 10) || 0;
  const parsedSavings = parseInt(savings.replace(/[,$]/g, ''), 10) || 0;

  // Check if all inputs are valid
  const isValid = parsedAge >= 18 && parsedAge <= 90 && parsedIncome > 0;

  // Calculate projections
  const projection = useMemo(() => {
    if (!isValid) return null;

    const defaults = deriveDefaults(parsedAge, parsedIncome, parsedSavings, maritalStatus === 'married');

    const futureValue = calculateFutureValue(
      parsedSavings,
      defaults.annualContributions,
      defaults.employerMatch,
      defaults.yearsToRetirement,
      defaults.expectedReturn
    );

    const monthlyIncome = calculateMonthlyIncome(futureValue);
    const readiness = getReadinessStatus(futureValue, parsedIncome, parsedAge);

    // Calculate potential improvement: +5% savings rate
    const improvedContributions = parsedIncome * 0.15;
    const improvedFutureValue = calculateFutureValue(
      parsedSavings,
      improvedContributions,
      defaults.employerMatch,
      defaults.yearsToRetirement,
      defaults.expectedReturn
    );
    const additionalValue = improvedFutureValue - futureValue;

    return {
      ...defaults,
      futureValue,
      monthlyIncome,
      readiness,
      additionalValue,
      improvedFutureValue,
    };
  }, [isValid, parsedAge, parsedIncome, parsedSavings, maritalStatus]);

  // Handle calculate button
  const handleCalculate = useCallback(() => {
    if (!isValid || !projection) return;

    setIsAnimating(true);

    // Brief animation before showing results
    setTimeout(() => {
      setShowResults(true);
      setIsAnimating(false);
    }, 500);
  }, [isValid, projection]);

  // Handle continuing to full calculator
  const handleContinue = useCallback(() => {
    if (!projection) return;

    // Build extracted data for the mapper
    const extractedData: ExtractedData = {
      age: parsedAge,
      maritalStatus,
      spouseAge: maritalStatus === 'married' ? parsedAge : undefined,
      primaryIncome: parsedIncome,
      spouseIncome: maritalStatus === 'married' ? 0 : undefined, // Can be refined later
      currentTraditional: projection.pretaxBalance,
      currentRoth: projection.rothBalance,
      currentTaxable: projection.taxableBalance,
      contributionTraditional: projection.traditionalContrib,
      contributionRoth: projection.rothContrib,
      contributionTaxable: projection.taxableContrib,
      contributionMatch: projection.employerMatch,
      retirementAge: projection.retirementAge,
      emergencyFund: parsedIncome * 0.25, // 3 months expenses
    };

    // Map to calculator inputs
    const { generatedAssumptions, ...calculatorInputs } = mapAIDataToCalculator(
      extractedData,
      []
    );

    console.log('[QuickStart] Mapped inputs:', calculatorInputs);

    // Update PlanConfig (single batched call to avoid split-second inconsistency)
    const configUpdate = { ...calculatorInputs };
    if (generatedAssumptions && generatedAssumptions.length > 0) {
      (configUpdate as Record<string, unknown>).assumptions = generatedAssumptions;
    }
    updateConfig(configUpdate, 'ai-suggested');

    // Save for income calculators (legacy)
    saveSharedIncomeData({
      maritalStatus,
      employmentType1: 'w2',
      primaryIncome: parsedIncome,
      source: 'quick-start',
      timestamp: Date.now(),
    });

    onComplete();
  }, [projection, parsedAge, parsedIncome, parsedSavings, maritalStatus, updateConfig, onComplete]);

  // Format input as currency on blur
  const formatInputAsCurrency = (value: string, setValue: (v: string) => void) => {
    const num = parseInt(value.replace(/[,$]/g, ''), 10);
    if (!isNaN(num) && num > 0) {
      setValue(num.toLocaleString('en-US'));
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm mb-4">
            <Sparkles className="w-4 h-4" />
            <span>30-second estimate</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">
            See Your Retirement Future
          </h1>
          <p className="text-muted-foreground text-lg">
            Just 3 quick questions. Instant results.
          </p>
        </div>

        {/* Main Form Card */}
        <Card className="bg-card border">
          <CardContent className="p-6 sm:p-8">
            {!showResults ? (
              <div className="space-y-6">
                {/* Question 1: Age */}
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-base font-medium text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    How old are you?
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    inputMode="numeric"
                    placeholder="35"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    className="bg-background border text-foreground text-lg h-14 placeholder:text-muted-foreground"
                    min={18}
                    max={90}
                  />
                </div>

                {/* Filing Status */}
                <div className="space-y-2">
                  <Label className="text-base font-medium text-foreground flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Filing Status
                  </Label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setMaritalStatus('single')}
                      aria-pressed={maritalStatus === 'single'}
                      className={cn(
                        'flex-1 h-14 rounded-lg border text-base font-medium transition-colors',
                        maritalStatus === 'single'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border hover:bg-muted'
                      )}
                    >
                      Single
                    </button>
                    <button
                      type="button"
                      onClick={() => setMaritalStatus('married')}
                      aria-pressed={maritalStatus === 'married'}
                      className={cn(
                        'flex-1 h-14 rounded-lg border text-base font-medium transition-colors',
                        maritalStatus === 'married'
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background text-foreground border hover:bg-muted'
                      )}
                    >
                      Married
                    </button>
                  </div>
                </div>

                {/* Question 2: Income */}
                <div className="space-y-2">
                  <Label htmlFor="income" className="text-base font-medium text-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    What&apos;s your household income?
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                    <Input
                      id="income"
                      type="text"
                      inputMode="numeric"
                      placeholder="100,000"
                      value={income}
                      onChange={(e) => setIncome(e.target.value.replace(/[^0-9,]/g, ''))}
                      onBlur={() => formatInputAsCurrency(income, setIncome)}
                      className="bg-background border text-foreground text-lg h-14 pl-8 placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                {/* Question 3: Savings */}
                <div className="space-y-2">
                  <Label htmlFor="savings" className="text-base font-medium text-foreground flex items-center gap-2">
                    <PiggyBank className="w-4 h-4 text-amber-600" />
                    How much have you saved for retirement?
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-lg">$</span>
                    <Input
                      id="savings"
                      type="text"
                      inputMode="numeric"
                      placeholder="50,000"
                      value={savings}
                      onChange={(e) => setSavings(e.target.value.replace(/[^0-9,]/g, ''))}
                      onBlur={() => formatInputAsCurrency(savings, setSavings)}
                      className="bg-background border text-foreground text-lg h-14 pl-8 placeholder:text-muted-foreground"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include 401(k), IRA, and other retirement accounts
                  </p>
                </div>

                {/* Calculate Button */}
                <Button
                  onClick={handleCalculate}
                  disabled={!isValid || isAnimating}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isAnimating ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
                      Calculating...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      Show My Future
                      <ChevronRight className="w-5 h-5" />
                    </span>
                  )}
                </Button>

                {/* Switch to guided */}
                <div className="text-center pt-2">
                  <button
                    onClick={onSwitchToGuided}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Prefer a guided setup? Use AI Wizard
                  </button>
                </div>
              </div>
            ) : projection && (
              /* Results Display */
              <div className="space-y-6 animate-fadeIn">
                {/* Main Projection */}
                <div className="text-center py-4">
                  <p className="text-muted-foreground text-sm mb-2">
                    At age 65, you&apos;re on track to have
                  </p>
                  <p className="text-5xl sm:text-6xl font-bold text-foreground mb-2">
                    {formatCurrency(projection.futureValue)}
                  </p>
                  <p className="text-muted-foreground">
                    That&apos;s <span className="text-green-600 font-semibold">{formatCurrency(projection.monthlyIncome)}/month</span> in retirement
                  </p>
                </div>

                {/* Readiness Gauge */}
                <div className="bg-muted rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Retirement Readiness</span>
                    <span className={`text-sm font-medium ${projection.readiness.color}`}>
                      {projection.readiness.status === 'behind' ? 'Behind' :
                       projection.readiness.status === 'on-track' ? 'On Track' : 'Ahead'}
                    </span>
                  </div>

                  {/* Visual Gauge */}
                  <div className="relative h-3 bg-muted-foreground/20 rounded-full overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full transition-all duration-1000 ${
                        projection.readiness.status === 'ahead' ? 'bg-green-500' :
                        projection.readiness.status === 'on-track' ? 'bg-blue-500' : 'bg-amber-500'
                      }`}
                      style={{
                        width: `${Math.min(
                          projection.readiness.status === 'ahead' ? 90 :
                          projection.readiness.status === 'on-track' ? 65 : 35,
                          100
                        )}%`
                      }}
                    />
                    <div className="absolute inset-0 flex justify-between px-1 items-center">
                      <span className="text-[10px] text-muted-foreground">Behind</span>
                      <span className="text-[10px] text-muted-foreground">On Track</span>
                      <span className="text-[10px] text-muted-foreground">Ahead</span>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-3 text-center">
                    {projection.readiness.message}
                  </p>
                </div>

                {/* Hooks - Motivating CTAs */}
                <div className="space-y-3">
                  <button
                    onClick={() => setShowRefinement(!showRefinement)}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl hover:border-emerald-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-emerald-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">Want to add {formatCurrency(projection.additionalValue)} more?</p>
                        <p className="text-sm text-muted-foreground">See how small changes make a big difference</p>
                      </div>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${showRefinement ? 'rotate-180' : ''}`} />
                  </button>

                  <button
                    onClick={handleContinue}
                    className="w-full flex items-center justify-between p-4 bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-xl hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <Target className="w-5 h-5 text-purple-700" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium text-foreground">See what your kids could inherit</p>
                        <p className="text-sm text-muted-foreground">Explore generational wealth planning</p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>

                {/* Refinement Section (Progressive Disclosure) */}
                {showRefinement && (
                  <div className="space-y-4 pt-4 border-t border animate-fadeIn">
                    <h3 className="text-lg font-semibold text-foreground">Refine Your Estimate</h3>

                    <div className="grid gap-4">
                      {/* Savings Rate Slider */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Savings Rate</span>
                          <span className="text-foreground font-medium">{(projection.savingsRate * 100).toFixed(0)}%</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Currently saving {formatFullCurrency(projection.annualContributions)}/year
                        </p>
                      </div>

                      {/* Quick Facts */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Assumed retirement age</p>
                          <p className="text-lg font-semibold text-foreground">{projection.retirementAge}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Years to retirement</p>
                          <p className="text-lg font-semibold text-foreground">{projection.yearsToRetirement}</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Assumed employer match</p>
                          <p className="text-lg font-semibold text-foreground">{formatCurrency(projection.employerMatch)}/yr</p>
                        </div>
                        <div className="bg-muted rounded-lg p-3">
                          <p className="text-xs text-muted-foreground mb-1">Expected return</p>
                          <p className="text-lg font-semibold text-foreground">{(projection.expectedReturn * 100).toFixed(1)}%</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Continue to Full Calculator */}
                <Button
                  onClick={handleContinue}
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400"
                >
                  <span className="flex items-center gap-2">
                    Continue to Full Calculator
                    <ArrowRight className="w-5 h-5" />
                  </span>
                </Button>

                {/* Edit Inputs */}
                <div className="text-center">
                  <button
                    onClick={() => setShowResults(false)}
                    className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
                  >
                    Edit my inputs
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Assumptions Note */}
        {showResults && (
          <p className="text-center text-xs text-muted-foreground mt-4 px-4">
            Estimate based on 10% savings rate, 3% employer match, age-based returns, and 4% withdrawal rule.
            Results are projections and not guaranteed.
          </p>
        )}
      </div>

      {/* Animation styles */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
