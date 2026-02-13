"use client"

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input, Tip } from "@/components/calculator/InputHelpers";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Users,
  GraduationCap,
  Home,
  TrendingDown,
  Info,
  Calculator,
  Clock,
  Heart,
  X,
} from "lucide-react";
import type { ExtractedData } from "@/types/ai-onboarding";

// ==================== Types ====================

interface LifeInsuranceInputs {
  // Debt
  creditCardDebt: number;
  carLoans: number;
  studentLoans: number;
  otherDebts: number;

  // Income
  annualIncome: number;
  yearsOfIncomeReplacement: number;

  // Mortgage
  mortgageBalance: number;

  // Education
  numChildren: number;
  collegePerChild: number;

  // Current Coverage
  currentCoverage: number;

  // For Premium Estimation
  age: number;
  healthStatus: 'excellent' | 'good' | 'average' | 'poor';
  isSmoker: boolean;

  // Spouse Analysis
  spouseIncome: number;
  spouseCurrentCoverage: number;
}

interface DIMEBreakdown {
  debt: number;
  income: number;
  mortgage: number;
  education: number;
  total: number;
}

interface CoverageGap {
  needed: number;
  current: number;
  gap: number;
  isOverinsured: boolean;
}

interface PremiumEstimate {
  termMonthly: number;
  wholeLifeMonthly: number;
  termAnnual: number;
  wholeLifeAnnual: number;
}

// ==================== Constants ====================

const DEFAULT_COLLEGE_COST = 150000; // 4 years at average public university (2026 dollars)
const DEFAULT_INCOME_YEARS = 10;

// Premium estimation tables (rough averages, vary by company)
// Based on $500k 20-year term policy
const TERM_PREMIUM_TABLE: Record<string, Record<string, number>> = {
  excellent: { '25': 18, '30': 20, '35': 22, '40': 28, '45': 40, '50': 60, '55': 95, '60': 150 },
  good: { '25': 22, '30': 25, '35': 28, '40': 38, '45': 55, '50': 85, '55': 130, '60': 210 },
  average: { '25': 28, '30': 32, '35': 38, '40': 52, '45': 78, '50': 120, '55': 185, '60': 300 },
  poor: { '25': 40, '30': 48, '35': 58, '40': 80, '45': 120, '50': 185, '55': 290, '60': 480 },
};

// Smoker multiplier
const SMOKER_MULTIPLIER = 2.5;

// Whole life is typically 10-15x more expensive than term
const WHOLE_LIFE_MULTIPLIER = 12;

// ==================== Helper Functions ====================

function calculateDIME(inputs: LifeInsuranceInputs): DIMEBreakdown {
  const debt = inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts;
  const income = inputs.annualIncome * inputs.yearsOfIncomeReplacement;
  const mortgage = inputs.mortgageBalance;
  const education = inputs.numChildren * inputs.collegePerChild;

  return {
    debt,
    income,
    mortgage,
    education,
    total: debt + income + mortgage + education,
  };
}

function calculateCoverageGap(needed: number, current: number): CoverageGap {
  const gap = needed - current;
  return {
    needed,
    current,
    gap,
    isOverinsured: gap < 0,
  };
}

function estimatePremium(
  coverageAmount: number,
  age: number,
  healthStatus: 'excellent' | 'good' | 'average' | 'poor',
  isSmoker: boolean
): PremiumEstimate {
  // Find the closest age bracket
  const ageBrackets = ['25', '30', '35', '40', '45', '50', '55', '60'];
  let closestAge = '30';
  let minDiff = Infinity;

  for (const bracket of ageBrackets) {
    const diff = Math.abs(age - parseInt(bracket));
    if (diff < minDiff) {
      minDiff = diff;
      closestAge = bracket;
    }
  }

  // Get base premium for $500k
  const basePremium = TERM_PREMIUM_TABLE[healthStatus][closestAge];

  // Scale to actual coverage amount
  const coverageRatio = coverageAmount / 500000;
  let termMonthly = basePremium * coverageRatio;

  // Apply smoker multiplier
  if (isSmoker) {
    termMonthly *= SMOKER_MULTIPLIER;
  }

  // Calculate whole life (much more expensive)
  const wholeLifeMonthly = termMonthly * WHOLE_LIFE_MULTIPLIER;

  return {
    termMonthly: Math.round(termMonthly),
    wholeLifeMonthly: Math.round(wholeLifeMonthly),
    termAnnual: Math.round(termMonthly * 12),
    wholeLifeAnnual: Math.round(wholeLifeMonthly * 12),
  };
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}k`;
  }
  return `$${amount.toFixed(0)}`;
}

function formatCurrencyFull(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

// ==================== Component Props ====================

interface LifeInsuranceCalculatorProps {
  /**
   * Optional extracted data from main calculator for integration
   */
  extractedData?: ExtractedData;

  /**
   * Optional callback when coverage gap is calculated
   */
  onCoverageCalculated?: (gap: CoverageGap, breakdown: DIMEBreakdown) => void;
}

// ==================== Main Component ====================

export function LifeInsuranceCalculator({
  extractedData,
  onCoverageCalculated,
}: LifeInsuranceCalculatorProps) {
  // Initialize state from extracted data if available
  const [inputs, setInputs] = useState<LifeInsuranceInputs>(() => ({
    // Debt
    creditCardDebt: 0,
    carLoans: 0,
    studentLoans: 0,
    otherDebts: 0,

    // Income
    annualIncome: extractedData?.primaryIncome || 100000,
    yearsOfIncomeReplacement: DEFAULT_INCOME_YEARS,

    // Mortgage
    mortgageBalance: (extractedData?.monthlyMortgageRent || 0) * 12 * 25, // Rough estimate: monthly * 25 years

    // Education
    numChildren: extractedData?.numChildren || 0,
    collegePerChild: DEFAULT_COLLEGE_COST,

    // Current Coverage
    currentCoverage: 200000, // Common default

    // Premium Estimation
    age: extractedData?.age || 35,
    healthStatus: 'good',
    isSmoker: false,

    // Spouse
    spouseIncome: extractedData?.spouseIncome || 0,
    spouseCurrentCoverage: 0,
  }));

  const [activeTab, setActiveTab] = useState('calculator');

  // Calculate DIME breakdown
  const dimeBreakdown = useMemo(() => calculateDIME(inputs), [inputs]);

  // Calculate coverage gap
  const coverageGap = useMemo(
    () => calculateCoverageGap(dimeBreakdown.total, inputs.currentCoverage),
    [dimeBreakdown.total, inputs.currentCoverage]
  );

  // Calculate premium estimate
  const premiumEstimate = useMemo(
    () => estimatePremium(
      Math.max(0, coverageGap.gap),
      inputs.age,
      inputs.healthStatus,
      inputs.isSmoker
    ),
    [coverageGap.gap, inputs.age, inputs.healthStatus, inputs.isSmoker]
  );

  // Spouse calculations
  const spouseDIME = useMemo(() => {
    if (inputs.spouseIncome <= 0) return null;
    return {
      income: inputs.spouseIncome * inputs.yearsOfIncomeReplacement,
      // Spouse shares mortgage and education responsibilities
      mortgage: inputs.mortgageBalance * 0.5,
      education: inputs.numChildren * inputs.collegePerChild * 0.5,
      total: inputs.spouseIncome * inputs.yearsOfIncomeReplacement +
             inputs.mortgageBalance * 0.5 +
             inputs.numChildren * inputs.collegePerChild * 0.5,
    };
  }, [inputs.spouseIncome, inputs.yearsOfIncomeReplacement, inputs.mortgageBalance, inputs.numChildren, inputs.collegePerChild]);

  const spouseGap = useMemo(() => {
    if (!spouseDIME) return null;
    return calculateCoverageGap(spouseDIME.total, inputs.spouseCurrentCoverage);
  }, [spouseDIME, inputs.spouseCurrentCoverage]);

  // Callback when coverage changes
  React.useEffect(() => {
    onCoverageCalculated?.(coverageGap, dimeBreakdown);
  }, [coverageGap, dimeBreakdown, onCoverageCalculated]);

  // Input updater helper
  const updateInput = useCallback(<K extends keyof LifeInsuranceInputs>(
    field: K,
    value: LifeInsuranceInputs[K]
  ) => {
    setInputs(prev => ({ ...prev, [field]: value }));
  }, []);

  // Determine when to drop coverage
  const shouldConsiderDropping = useMemo(() => {
    const reasons: string[] = [];

    if (inputs.mortgageBalance <= 0) {
      reasons.push("Mortgage is paid off");
    }

    // Assuming kids are college-aged or older at age 18+
    const youngestChildAge = extractedData?.childrenAges?.[extractedData.childrenAges.length - 1] || 0;
    if (inputs.numChildren === 0 || youngestChildAge >= 18) {
      reasons.push("Children are grown (18+)");
    }

    if (inputs.annualIncome <= 0) {
      reasons.push("No earned income to replace");
    }

    // If total debt is very low
    const totalDebt = inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts;
    if (totalDebt < 10000) {
      reasons.push("Minimal debts to cover");
    }

    return reasons;
  }, [inputs, extractedData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          Life Insurance Needs Calculator
        </CardTitle>
        <CardDescription>
          Use the DIME method to calculate your true life insurance needs and avoid being over-sold
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 mb-6">
            <TabsTrigger value="calculator" className="gap-1">
              <Calculator className="h-4 w-4" />
              <span className="hidden sm:inline">Calculator</span>
            </TabsTrigger>
            <TabsTrigger value="gap" className="gap-1">
              <TrendingDown className="h-4 w-4" />
              <span className="hidden sm:inline">Coverage Gap</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="gap-1">
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">Term vs Whole</span>
            </TabsTrigger>
            <TabsTrigger value="premium" className="gap-1">
              <DollarSign className="h-4 w-4" />
              <span className="hidden sm:inline">Cost Estimate</span>
            </TabsTrigger>
            <TabsTrigger value="timing" className="gap-1">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">When to Drop</span>
            </TabsTrigger>
          </TabsList>

          {/* ==================== Calculator Tab ==================== */}
          <TabsContent value="calculator" className="space-y-6">
            {/* DIME Explanation */}
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    The DIME Method
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>D</strong>ebt + <strong>I</strong>ncome + <strong>M</strong>ortgage + <strong>E</strong>ducation =
                    Your life insurance needs. This straightforward formula helps you calculate exactly how much coverage
                    your family would need if you passed away.
                  </p>
                </div>
              </div>
            </div>

            {/* D - Debt */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-red-100 text-red-800 hover:bg-red-100 dark:bg-red-900 dark:text-red-100">D</Badge>
                <h3 className="font-semibold">Debt - All debts that need to be paid off</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <Input
                  label="Credit Card Debt"
                  value={inputs.creditCardDebt}
                  setter={(v) => updateInput('creditCardDebt', v)}
                  step={1000}
                  prefix="$"
                />
                <Input
                  label="Car Loans"
                  value={inputs.carLoans}
                  setter={(v) => updateInput('carLoans', v)}
                  step={1000}
                  prefix="$"
                />
                <Input
                  label="Student Loans"
                  value={inputs.studentLoans}
                  setter={(v) => updateInput('studentLoans', v)}
                  step={1000}
                  prefix="$"
                />
                <Input
                  label="Other Debts"
                  value={inputs.otherDebts}
                  setter={(v) => updateInput('otherDebts', v)}
                  step={1000}
                  prefix="$"
                  tip="Personal loans, medical debt, etc."
                />
              </div>
              <div className="pl-8 text-sm">
                <Badge variant="outline" className="text-red-600">
                  Subtotal: {formatCurrencyFull(dimeBreakdown.debt)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* I - Income */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">I</Badge>
                <h3 className="font-semibold">Income - Years of income replacement needed</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <Input
                  label="Annual Income"
                  value={inputs.annualIncome}
                  setter={(v) => updateInput('annualIncome', v)}
                  step={5000}
                  prefix="$"
                  tip="Your gross annual income"
                />
                <Input
                  label="Years to Replace"
                  value={inputs.yearsOfIncomeReplacement}
                  setter={(v) => updateInput('yearsOfIncomeReplacement', v)}
                  min={1}
                  max={30}
                  tip="Typically 5-10 years, longer if kids are young"
                />
              </div>
              <div className="pl-8 text-sm">
                <Badge variant="outline" className="text-green-600">
                  Subtotal: {formatCurrencyFull(dimeBreakdown.income)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* M - Mortgage */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 dark:bg-purple-900 dark:text-purple-100">M</Badge>
                <h3 className="font-semibold">Mortgage - Remaining mortgage balance</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <Input
                  label="Mortgage Balance"
                  value={inputs.mortgageBalance}
                  setter={(v) => updateInput('mortgageBalance', v)}
                  step={10000}
                  prefix="$"
                  tip="Remaining balance on your mortgage"
                />
              </div>
              <div className="pl-8 text-sm">
                <Badge variant="outline" className="text-purple-600">
                  Subtotal: {formatCurrencyFull(dimeBreakdown.mortgage)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* E - Education */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-100">E</Badge>
                <h3 className="font-semibold">Education - College costs for kids</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <Input
                  label="Number of Children"
                  value={inputs.numChildren}
                  setter={(v) => updateInput('numChildren', v)}
                  min={0}
                  max={10}
                />
                <Input
                  label="Cost per Child"
                  value={inputs.collegePerChild}
                  setter={(v) => updateInput('collegePerChild', v)}
                  step={10000}
                  prefix="$"
                  tip="Average 4-year public: ~$100k, Private: ~$250k"
                />
              </div>
              <div className="pl-8 text-sm">
                <Badge variant="outline" className="text-orange-600">
                  Subtotal: {formatCurrencyFull(dimeBreakdown.education)}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Total DIME */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm text-muted-foreground mb-1">Your Total Life Insurance Need (DIME)</div>
                  <div className="text-4xl font-bold text-blue-900 dark:text-blue-100">
                    {formatCurrency(dimeBreakdown.total)}
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="text-xs text-red-600">Debt</div>
                    <div className="font-semibold">{formatCurrency(dimeBreakdown.debt)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-green-600">Income</div>
                    <div className="font-semibold">{formatCurrency(dimeBreakdown.income)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-purple-600">Mortgage</div>
                    <div className="font-semibold">{formatCurrency(dimeBreakdown.mortgage)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-orange-600">Education</div>
                    <div className="font-semibold">{formatCurrency(dimeBreakdown.education)}</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ==================== Coverage Gap Tab ==================== */}
          <TabsContent value="gap" className="space-y-6">
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-5 w-5" />
                Your Coverage Analysis
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Current Life Insurance Coverage"
                  value={inputs.currentCoverage}
                  setter={(v) => updateInput('currentCoverage', v)}
                  step={50000}
                  prefix="$"
                  tip="Total death benefit from all policies"
                />
              </div>

              {/* Coverage Gap Visualization */}
              <div className="space-y-4 mt-6">
                {/* Need Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Coverage Needed (DIME)</span>
                    <Badge variant="outline">{formatCurrencyFull(dimeBreakdown.total)}</Badge>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full flex items-center justify-end pr-3 text-white text-sm font-medium"
                      style={{ width: "100%" }}
                    >
                      {formatCurrency(dimeBreakdown.total)}
                    </div>
                  </div>
                </div>

                {/* Current Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Current Coverage</span>
                    <Badge variant="outline" className={
                      coverageGap.isOverinsured
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : inputs.currentCoverage >= dimeBreakdown.total * 0.9
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-red-50 text-red-700 border-red-200"
                    }>
                      {formatCurrencyFull(inputs.currentCoverage)}
                    </Badge>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-end pr-3 text-white text-sm font-medium transition-all duration-500 ${
                        coverageGap.isOverinsured
                          ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                          : inputs.currentCoverage >= dimeBreakdown.total * 0.9
                            ? "bg-gradient-to-r from-green-500 to-emerald-500"
                            : "bg-gradient-to-r from-red-500 to-orange-500"
                      }`}
                      style={{ width: `${Math.min(100, (inputs.currentCoverage / dimeBreakdown.total) * 100)}%` }}
                    >
                      {formatCurrency(inputs.currentCoverage)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gap Result */}
              <div className={`rounded-lg p-6 border ${
                coverageGap.isOverinsured
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                  : coverageGap.gap <= 0
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
              }`}>
                <div className="flex items-start gap-3">
                  {coverageGap.isOverinsured ? (
                    <AlertTriangle className="h-6 w-6 text-amber-600 mt-0.5 flex-shrink-0" />
                  ) : coverageGap.gap <= 0 ? (
                    <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <div className={`font-semibold text-lg mb-1 ${
                      coverageGap.isOverinsured
                        ? "text-amber-900 dark:text-amber-100"
                        : coverageGap.gap <= 0
                          ? "text-green-900 dark:text-green-100"
                          : "text-red-900 dark:text-red-100"
                    }`}>
                      {coverageGap.isOverinsured
                        ? `You may be over-insured by ${formatCurrencyFull(Math.abs(coverageGap.gap))}`
                        : coverageGap.gap <= 0
                          ? "Your coverage is adequate!"
                          : `Coverage Gap: ${formatCurrencyFull(coverageGap.gap)}`
                      }
                    </div>
                    <p className={`text-sm ${
                      coverageGap.isOverinsured
                        ? "text-amber-800 dark:text-amber-200"
                        : coverageGap.gap <= 0
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                    }`}>
                      {coverageGap.isOverinsured
                        ? "Consider whether you need this much coverage. You may be paying for more insurance than your family would need."
                        : coverageGap.gap <= 0
                          ? "Based on the DIME method, your current coverage would provide for your family's needs."
                          : `You need an additional ${formatCurrencyFull(coverageGap.gap)} in coverage to fully protect your family.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Spouse Analysis */}
            {extractedData?.maritalStatus === 'married' && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Spouse Coverage Analysis
                  </h3>

                  <div className="bg-pink-50 dark:bg-pink-950/20 border border-pink-200 dark:border-pink-900 rounded-lg p-4">
                    <p className="text-sm text-pink-800 dark:text-pink-200">
                      <strong>Both spouses need coverage if both earn income.</strong> If your spouse passed away,
                      could you maintain your lifestyle on your income alone? Consider childcare costs,
                      household help, and the loss of their financial contribution.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Spouse Annual Income"
                      value={inputs.spouseIncome}
                      setter={(v) => updateInput('spouseIncome', v)}
                      step={5000}
                      prefix="$"
                    />
                    <Input
                      label="Spouse Current Coverage"
                      value={inputs.spouseCurrentCoverage}
                      setter={(v) => updateInput('spouseCurrentCoverage', v)}
                      step={50000}
                      prefix="$"
                    />
                  </div>

                  {spouseDIME && spouseGap && (
                    <div className={`rounded-lg p-4 border ${
                      spouseGap.isOverinsured
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                        : spouseGap.gap <= 0
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                          : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                    }`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Spouse Coverage Need</span>
                        <Badge variant="outline">{formatCurrencyFull(spouseDIME.total)}</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Income replacement ({formatCurrency(spouseDIME.income)}) +
                        Mortgage share ({formatCurrency(spouseDIME.mortgage)}) +
                        Education share ({formatCurrency(spouseDIME.education)})
                      </div>
                      <div className={`mt-2 font-semibold ${
                        spouseGap.gap > 0 ? "text-red-600" : spouseGap.isOverinsured ? "text-amber-600" : "text-green-600"
                      }`}>
                        {spouseGap.isOverinsured
                          ? `Over-insured by ${formatCurrencyFull(Math.abs(spouseGap.gap))}`
                          : spouseGap.gap <= 0
                            ? "Spouse coverage is adequate"
                            : `Spouse gap: ${formatCurrencyFull(spouseGap.gap)}`
                        }
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>

          {/* ==================== Term vs Whole Life Tab ==================== */}
          <TabsContent value="comparison" className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-bold text-lg text-green-900 dark:text-green-100 mb-2">
                    Term Life Insurance is Almost Always Better
                  </div>
                  <p className="text-green-800 dark:text-green-200">
                    For the vast majority of people, <strong>term life insurance</strong> provides better value than whole life.
                    Here&apos;s why you should be skeptical if someone tries to sell you whole life:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Term Life Card */}
              <Card className="border-2 border-green-500">
                <CardHeader className="bg-green-50 dark:bg-green-950/20">
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <CheckCircle className="h-5 w-5" />
                    Term Life Insurance
                  </CardTitle>
                  <CardDescription>Recommended for most people</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm"><strong>10-15x cheaper</strong> than whole life for same coverage</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Coverage when you need it most (kids at home, mortgage)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Simple, easy to understand</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Invest the difference in index funds for better returns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">No surrender charges or complex fees</span>
                  </div>
                </CardContent>
              </Card>

              {/* Whole Life Card */}
              <Card className="border-2 border-red-300">
                <CardHeader className="bg-red-50 dark:bg-red-950/20">
                  <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <X className="h-5 w-5" />
                    Whole Life Insurance
                  </CardTitle>
                  <CardDescription>Rarely the right choice</CardDescription>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm"><strong>10-15x more expensive</strong> for same death benefit</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Cash value grows slowly (2-4% typical)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">High fees eat into returns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Surrender charges if you cancel early</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <X className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                    <span className="text-sm">Agents earn huge commissions (incentive to oversell)</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Warning Box */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                    Watch Out for Sales Tactics
                  </div>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc pl-4">
                    <li>&quot;It&apos;s an investment AND insurance&quot; - Keep these separate; index funds beat whole life returns</li>
                    <li>&quot;Tax-free growth&quot; - You get this with Roth IRAs too, with better returns</li>
                    <li>&quot;You can borrow against it&quot; - You&apos;re borrowing your own money and paying interest</li>
                    <li>&quot;Premiums never increase&quot; - Term premiums are already so low this doesn&apos;t matter</li>
                    <li>&quot;Coverage for life&quot; - Most people don&apos;t need coverage past retirement</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* When Whole Life MIGHT Make Sense */}
            <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-lg p-4">
              <div className="font-semibold mb-2">When Whole Life Might Make Sense (Rare Cases)</div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-4">
                <li>You&apos;ve maxed out ALL other tax-advantaged accounts (401k, IRA, HSA, 529)</li>
                <li>You have a very high net worth and need estate planning tools</li>
                <li>You have a special needs dependent who will need lifetime support</li>
                <li>You own a business and need key person insurance</li>
              </ul>
              <p className="text-sm text-muted-foreground mt-2 italic">
                Even in these cases, consult a fee-only financial advisor (not an insurance salesperson).
              </p>
            </div>
          </TabsContent>

          {/* ==================== Premium Estimate Tab ==================== */}
          <TabsContent value="premium" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                These are rough estimates only. Actual premiums vary by insurance company, underwriting,
                and specific health factors. Get quotes from multiple insurers.
              </p>
            </div>

            {/* Premium Factors */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Your Age"
                value={inputs.age}
                setter={(v) => updateInput('age', v)}
                min={18}
                max={80}
              />

              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  Health Status
                  <Tip text="Based on overall health, medical history, BMI, etc." />
                </Label>
                <select
                  value={inputs.healthStatus}
                  onChange={(e) => updateInput('healthStatus', e.target.value as 'excellent' | 'good' | 'average' | 'poor')}
                  className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-gray-600 dark:bg-gray-800"
                >
                  <option value="excellent">Excellent (Preferred Plus)</option>
                  <option value="good">Good (Preferred)</option>
                  <option value="average">Average (Standard)</option>
                  <option value="poor">Below Average (Substandard)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tobacco Use</Label>
                <div className="flex items-center gap-4 h-11">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smoker"
                      checked={!inputs.isSmoker}
                      onChange={() => updateInput('isSmoker', false)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Non-Smoker</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="smoker"
                      checked={inputs.isSmoker}
                      onChange={() => updateInput('isSmoker', true)}
                      className="h-4 w-4 text-blue-600"
                    />
                    <span className="text-sm">Smoker</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Coverage Amount Display */}
            <div className="text-center p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Estimating premiums for</div>
              <div className="text-2xl font-bold">
                {formatCurrencyFull(Math.max(0, coverageGap.gap))} coverage
              </div>
              <div className="text-sm text-muted-foreground">(Your coverage gap)</div>
            </div>

            {coverageGap.gap > 0 ? (
              <>
                {/* Premium Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Term Life */}
                  <div className="bg-green-50 dark:bg-green-950/20 border-2 border-green-500 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-semibold text-green-800 dark:text-green-200">20-Year Term Life</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-300">Monthly Premium</div>
                        <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                          ${premiumEstimate.termMonthly}/mo
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-green-700 dark:text-green-300">Annual Premium</div>
                        <div className="text-xl font-semibold text-green-800 dark:text-green-200">
                          ${premiumEstimate.termAnnual}/year
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Whole Life */}
                  <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 rounded-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <X className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-800 dark:text-red-200">Whole Life</span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-sm text-red-700 dark:text-red-300">Monthly Premium</div>
                        <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                          ${premiumEstimate.wholeLifeMonthly}/mo
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-red-700 dark:text-red-300">Annual Premium</div>
                        <div className="text-xl font-semibold text-red-800 dark:text-red-200">
                          ${premiumEstimate.wholeLifeAnnual}/year
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Savings Highlight */}
                <div className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-950/40 dark:to-emerald-950/40 border border-green-300 dark:border-green-800 rounded-lg p-6">
                  <div className="text-center">
                    <div className="text-sm text-green-700 dark:text-green-300 mb-1">
                      By choosing term over whole life, you save
                    </div>
                    <div className="text-4xl font-bold text-green-900 dark:text-green-100">
                      ${(premiumEstimate.wholeLifeAnnual - premiumEstimate.termAnnual).toLocaleString()}/year
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-2">
                      Invest the difference in index funds for potentially much better long-term returns!
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-6 text-center">
                <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-2" />
                <div className="font-semibold text-green-800 dark:text-green-200">
                  Your current coverage is adequate!
                </div>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  No additional coverage needed based on the DIME method.
                </p>
              </div>
            )}
          </TabsContent>

          {/* ==================== When to Drop Coverage Tab ==================== */}
          <TabsContent value="timing" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Life Insurance is Temporary Protection
                  </div>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The goal is to protect your family during your wealth-building years. Once you&apos;ve built
                    sufficient assets, paid off debts, and your children are independent, you may no longer
                    need life insurance.
                  </p>
                </div>
              </div>
            </div>

            {/* When to Consider Dropping */}
            <div className="space-y-4">
              <h3 className="font-semibold">Consider Dropping Coverage When:</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`rounded-lg p-4 border ${
                  inputs.mortgageBalance <= 0
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Home className={`h-5 w-5 ${inputs.mortgageBalance <= 0 ? "text-green-600" : "text-gray-400"}`} />
                    <span className="font-medium">Mortgage Paid Off</span>
                    {inputs.mortgageBalance <= 0 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Done</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {inputs.mortgageBalance <= 0
                      ? "Your mortgage is paid off!"
                      : `${formatCurrencyFull(inputs.mortgageBalance)} remaining`
                    }
                  </p>
                </div>

                <div className={`rounded-lg p-4 border ${
                  inputs.numChildren === 0
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <GraduationCap className={`h-5 w-5 ${inputs.numChildren === 0 ? "text-green-600" : "text-gray-400"}`} />
                    <span className="font-medium">Kids Are Grown</span>
                    {inputs.numChildren === 0 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">N/A</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {inputs.numChildren === 0
                      ? "No dependent children"
                      : `${inputs.numChildren} children to support through college`
                    }
                  </p>
                </div>

                <div className={`rounded-lg p-4 border ${
                  (inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts) < 10000
                    ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                    : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className={`h-5 w-5 ${
                      (inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts) < 10000
                        ? "text-green-600" : "text-gray-400"
                    }`} />
                    <span className="font-medium">Debts Paid Off</span>
                    {(inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts) < 10000 && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Done</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {(inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts) < 10000
                      ? "Minimal debts remaining"
                      : `${formatCurrencyFull(inputs.creditCardDebt + inputs.carLoans + inputs.studentLoans + inputs.otherDebts)} in debts`
                    }
                  </p>
                </div>

                <div className="rounded-lg p-4 border bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-5 w-5 text-gray-400" />
                    <span className="font-medium">Sufficient Assets</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    When your investment portfolio can replace your income, life insurance becomes less critical.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status Summary */}
            {shouldConsiderDropping.length > 0 && (
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Based on your inputs, you may be approaching the point where you can reduce coverage:
                    </div>
                    <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1">
                      {shouldConsiderDropping.map((reason, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* General Timeline */}
            <div className="space-y-4">
              <h3 className="font-semibold">Typical Life Insurance Timeline</h3>

              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700"></div>

                <div className="relative pl-10 pb-8">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-blue-500"></div>
                  <div className="font-medium">Age 25-35: Maximum Coverage Needed</div>
                  <p className="text-sm text-muted-foreground">
                    Young family, mortgage, career earnings ahead. This is when life insurance is most critical.
                  </p>
                </div>

                <div className="relative pl-10 pb-8">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-green-500"></div>
                  <div className="font-medium">Age 45-55: Start Reducing</div>
                  <p className="text-sm text-muted-foreground">
                    Mortgage shrinking, kids leaving home, retirement savings growing. May reduce coverage.
                  </p>
                </div>

                <div className="relative pl-10 pb-8">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-amber-500"></div>
                  <div className="font-medium">Age 55-65: Minimal Coverage</div>
                  <p className="text-sm text-muted-foreground">
                    Kids independent, mortgage paid, substantial savings. May only need final expenses coverage.
                  </p>
                </div>

                <div className="relative pl-10">
                  <div className="absolute left-2.5 w-3 h-3 rounded-full bg-gray-400"></div>
                  <div className="font-medium">Retirement: Often No Coverage Needed</div>
                  <p className="text-sm text-muted-foreground">
                    Assets replace income, no dependents, no debt. Life insurance may be unnecessary.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default LifeInsuranceCalculator;
