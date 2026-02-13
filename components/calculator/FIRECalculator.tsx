"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import {
  Flame,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Calculator,
  AlertTriangle,
  Heart,
  Coffee,
  Sparkles,
  ChevronRight,
  Check,
  Info,
  PiggyBank,
  LineChart,
  Shield,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types and Constants
// =============================================================================

type FIREVariant =
  | "lean"
  | "regular"
  | "fat"
  | "barista"
  | "coast";

type WithdrawalRule = "4percent" | "3percent" | "variable";

interface FIREInputs {
  currentAge: number;
  annualIncome: number;
  annualExpenses: number;
  currentSavings: number;
  expectedReturn: number;
  inflationRate: number;
  fireVariant: FIREVariant;
  withdrawalRule: WithdrawalRule;
  partTimeIncome: number; // For Barista FIRE
  coastTargetAge: number; // For Coast FIRE
  includeHealthcare: boolean;
  healthcareCostPreMedicare: number;
}

interface FIREResults {
  fireNumber: number;
  currentProgress: number;
  yearsToFIRE: number;
  fireDate: Date;
  savingsRate: number;
  monthlyExpenses: number;
  annualWithdrawal: number;
  safeWithdrawalRate: number;
  projectedBalances: { year: number; age: number; balance: number }[];
}

// FIRE variant configurations
const FIRE_VARIANTS: Record<
  FIREVariant,
  {
    name: string;
    description: string;
    icon: React.ReactNode;
    color: string;
    annualExpenses: number;
    badgeColor: string;
  }
> = {
  lean: {
    name: "Lean FIRE",
    description: "Minimal expenses, frugal lifestyle",
    icon: <Sparkles className="h-4 w-4" />,
    color: "text-emerald-600",
    annualExpenses: 40000,
    badgeColor: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  },
  regular: {
    name: "Regular FIRE",
    description: "Comfortable, balanced lifestyle",
    icon: <Flame className="h-4 w-4" />,
    color: "text-orange-600",
    annualExpenses: 60000,
    badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  },
  fat: {
    name: "Fat FIRE",
    description: "Luxurious, no-compromise lifestyle",
    icon: <DollarSign className="h-4 w-4" />,
    color: "text-purple-600",
    annualExpenses: 100000,
    badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  },
  barista: {
    name: "Barista FIRE",
    description: "Part-time work for benefits & income",
    icon: <Coffee className="h-4 w-4" />,
    color: "text-amber-600",
    annualExpenses: 50000,
    badgeColor: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  },
  coast: {
    name: "Coast FIRE",
    description: "Stop saving, let investments grow",
    icon: <TrendingUp className="h-4 w-4" />,
    color: "text-blue-600",
    annualExpenses: 60000,
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  },
};

// Savings rate to years mapping (based on 4% withdrawal rate and 7% real return)
const SAVINGS_RATE_TABLE: { rate: number; years: number }[] = [
  { rate: 10, years: 51.4 },
  { rate: 20, years: 36.7 },
  { rate: 30, years: 28.0 },
  { rate: 40, years: 21.6 },
  { rate: 50, years: 16.6 },
  { rate: 60, years: 12.4 },
  { rate: 70, years: 8.8 },
  { rate: 75, years: 7.1 },
  { rate: 80, years: 5.6 },
  { rate: 90, years: 2.7 },
];

// =============================================================================
// Utility Functions
// =============================================================================

function calculateFIRENumber(
  annualExpenses: number,
  withdrawalRule: WithdrawalRule
): number {
  const multiplier = withdrawalRule === "3percent" ? 33.33 : 25;
  return annualExpenses * multiplier;
}

function calculateYearsToFIRE(
  currentSavings: number,
  annualSavings: number,
  fireNumber: number,
  realReturn: number
): number {
  if (currentSavings >= fireNumber) return 0;
  if (annualSavings <= 0) return Infinity;

  const r = realReturn / 100;

  // Using the future value of annuity formula, solved for n
  // FV = P * ((1 + r)^n - 1) / r + PV * (1 + r)^n
  // Where FV = fireNumber, PV = currentSavings, P = annualSavings

  // Binary search for years
  let low = 0;
  let high = 100;

  while (high - low > 0.1) {
    const mid = (low + high) / 2;
    const futureValue =
      currentSavings * Math.pow(1 + r, mid) +
      annualSavings * ((Math.pow(1 + r, mid) - 1) / r);

    if (futureValue < fireNumber) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return Math.ceil((low + high) / 2 * 10) / 10;
}

function calculateCoastFIRENumber(
  targetAge: number,
  currentAge: number,
  annualExpenses: number,
  realReturn: number,
  withdrawalRule: WithdrawalRule
): number {
  const yearsToCoast = targetAge - currentAge;
  const fireNumber = calculateFIRENumber(annualExpenses, withdrawalRule);
  const r = realReturn / 100;

  // Present value needed today to reach FIRE number at target age
  return fireNumber / Math.pow(1 + r, yearsToCoast);
}

function generateProjections(
  currentAge: number,
  currentSavings: number,
  annualSavings: number,
  realReturn: number,
  years: number
): { year: number; age: number; balance: number }[] {
  const projections: { year: number; age: number; balance: number }[] = [];
  const r = realReturn / 100;
  let balance = currentSavings;

  for (let y = 0; y <= years && y <= 50; y++) {
    projections.push({
      year: new Date().getFullYear() + y,
      age: currentAge + y,
      balance: Math.round(balance),
    });
    balance = balance * (1 + r) + annualSavings;
  }

  return projections;
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function formatYears(years: number): string {
  if (years === Infinity || years > 100) return "100+ years";
  if (years === 0) return "Already FIRE!";
  if (years < 1) return `${Math.round(years * 12)} months`;
  return `${years.toFixed(1)} years`;
}

// =============================================================================
// Sub-Components
// =============================================================================

interface FIREVariantSelectorProps {
  selected: FIREVariant;
  onSelect: (variant: FIREVariant) => void;
}

function FIREVariantSelector({ selected, onSelect }: FIREVariantSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {(Object.keys(FIRE_VARIANTS) as FIREVariant[]).map((variant) => {
        const config = FIRE_VARIANTS[variant];
        const isSelected = selected === variant;

        return (
          <button
            key={variant}
            onClick={() => onSelect(variant)}
            className={cn(
              "relative p-4 rounded-lg border-2 transition-all duration-200",
              "hover:shadow-md hover:-translate-y-0.5",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isSelected
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-muted hover:border-muted-foreground/30"
            )}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <Check className="h-4 w-4 text-primary" />
              </div>
            )}
            <div className={cn("mb-2", config.color)}>{config.icon}</div>
            <div className="font-semibold text-sm">{config.name}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {config.description}
            </div>
            <Badge className={cn("mt-2 text-xs", config.badgeColor)}>
              ~{formatCurrency(config.annualExpenses)}/yr
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

interface ProgressDashboardProps {
  fireNumber: number;
  currentSavings: number;
  yearsToFIRE: number;
  fireDate: Date;
  savingsRate: number;
}

function ProgressDashboard({
  fireNumber,
  currentSavings,
  yearsToFIRE,
  fireDate,
  savingsRate,
}: ProgressDashboardProps) {
  const progress = Math.min((currentSavings / fireNumber) * 100, 100);
  const isAlreadyFIRE = currentSavings >= fireNumber;

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          FIRE Dashboard
        </CardTitle>
        <CardDescription>Your path to financial independence</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Progress to FIRE</span>
            <span className="text-2xl font-bold text-primary">
              {progress.toFixed(1)}%
            </span>
          </div>
          <div className="relative">
            <Progress value={progress} className="h-4" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary border-2 border-background shadow-md transition-all duration-500"
              style={{ left: `calc(${Math.min(progress, 100)}% - 6px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatCurrency(currentSavings)}</span>
            <span>Target: {formatCurrency(fireNumber)}</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs">Time to FIRE</span>
            </div>
            <div className="text-2xl font-bold">
              {isAlreadyFIRE ? (
                <span className="text-green-600">Now!</span>
              ) : (
                formatYears(yearsToFIRE)
              )}
            </div>
          </div>

          <div className="bg-background rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Flame className="h-4 w-4" />
              <span className="text-xs">FIRE Date</span>
            </div>
            <div className="text-2xl font-bold">
              {isAlreadyFIRE ? (
                <span className="text-green-600">Today</span>
              ) : yearsToFIRE > 100 ? (
                <span className="text-muted-foreground">-</span>
              ) : (
                fireDate.getFullYear()
              )}
            </div>
          </div>

          <div className="bg-background rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <PiggyBank className="h-4 w-4" />
              <span className="text-xs">Savings Rate</span>
            </div>
            <div className="text-2xl font-bold">
              {savingsRate.toFixed(0)}%
            </div>
          </div>

          <div className="bg-background rounded-lg p-4 border">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="h-4 w-4" />
              <span className="text-xs">FIRE Number</span>
            </div>
            <div className="text-2xl font-bold">
              {formatCurrency(fireNumber)}
            </div>
          </div>
        </div>

        {/* Motivational Message */}
        <div
          className={cn(
            "rounded-lg p-4 border",
            isAlreadyFIRE
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
              : progress >= 75
              ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
              : progress >= 50
              ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
              : "bg-muted/50 border-muted"
          )}
        >
          {isAlreadyFIRE ? (
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-green-600" />
              <span className="font-medium text-green-900 dark:text-green-100">
                Congratulations! You have reached financial independence!
              </span>
            </div>
          ) : progress >= 75 ? (
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900 dark:text-blue-100">
                You are {progress.toFixed(0)}% of the way there - the finish line is in sight!
              </span>
            </div>
          ) : progress >= 50 ? (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span className="font-medium text-amber-900 dark:text-amber-100">
                Halfway to FIRE! Your savings momentum is building.
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">
                Keep saving! Every dollar brings you closer to freedom.
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface SavingsRateVisualizationProps {
  currentRate: number;
  onRateChange: (rate: number) => void;
}

function SavingsRateVisualization({
  currentRate,
  onRateChange,
}: SavingsRateVisualizationProps) {
  const yearsForRate = useMemo(() => {
    // Interpolate from the savings rate table
    const table = SAVINGS_RATE_TABLE;
    if (currentRate <= table[0].rate) return table[0].years;
    if (currentRate >= table[table.length - 1].rate)
      return table[table.length - 1].years;

    for (let i = 0; i < table.length - 1; i++) {
      if (currentRate >= table[i].rate && currentRate <= table[i + 1].rate) {
        const t =
          (currentRate - table[i].rate) /
          (table[i + 1].rate - table[i].rate);
        return table[i].years + t * (table[i + 1].years - table[i].years);
      }
    }
    return 50;
  }, [currentRate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-primary" />
          The Math: Savings Rate is Everything
        </CardTitle>
        <CardDescription>
          How your savings rate affects time to FIRE (assuming 7% real returns)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interactive Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Your Savings Rate</span>
            <span className="text-2xl font-bold text-primary">
              {currentRate.toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[currentRate]}
            onValueChange={([val]) => onRateChange(val)}
            min={5}
            max={90}
            step={1}
            thumbLabel="Savings rate percentage"
          />
          <div className="text-center">
            <span className="text-lg">
              Time to FIRE:{" "}
              <span className="font-bold text-primary">
                {yearsForRate.toFixed(1)} years
              </span>
            </span>
          </div>
        </div>

        {/* Savings Rate Table */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="text-sm font-medium mb-3">
            Savings Rate Reference Table
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {SAVINGS_RATE_TABLE.slice(0, 10).map(({ rate, years }) => (
              <div
                key={rate}
                className={cn(
                  "rounded-lg p-3 text-center transition-all",
                  Math.abs(rate - currentRate) < 5
                    ? "bg-primary text-primary-foreground"
                    : "bg-background border"
                )}
              >
                <div className="text-lg font-bold">{rate}%</div>
                <div className="text-xs opacity-80">
                  {years < 10 ? years.toFixed(1) : Math.round(years)} yrs
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insight */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                The Power of Savings Rate
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Notice how increasing your savings rate from 50% to 75% cuts your
                time to FIRE nearly in half. Savings rate matters more than
                investment returns for most people. Focus on the gap between income
                and expenses.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface PostFIREPlanningProps {
  annualExpenses: number;
  fireNumber: number;
  currentAge: number;
  yearsToFIRE: number;
}

function PostFIREPlanning({
  annualExpenses,
  fireNumber,
  currentAge,
  yearsToFIRE,
}: PostFIREPlanningProps) {
  const fireAge = currentAge + yearsToFIRE;
  const yearsUntilMedicare = Math.max(0, 65 - fireAge);
  const preMedicareHealthcareCost = yearsUntilMedicare > 0 ? 15000 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Post-FIRE Planning
        </CardTitle>
        <CardDescription>
          Important considerations for early retirement success
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Sequence of Returns Risk */}
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Sequence of Returns Risk
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                A market crash in your first few years of retirement can permanently
                damage your portfolio, even if long-term returns recover. This is
                the biggest risk for early retirees.
              </p>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Consider a bond tent (higher bonds early in retirement)</li>
                <li>Keep 1-2 years of expenses in cash buffer</li>
                <li>Plan for flexible spending in down markets</li>
                <li>Use a variable withdrawal strategy</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Healthcare */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Heart className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Healthcare: The Biggest Obstacle
              </div>
              <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                {yearsUntilMedicare > 0 ? (
                  <>
                    At FIRE age {Math.round(fireAge)}, you will have{" "}
                    <strong>{Math.round(yearsUntilMedicare)} years</strong> until
                    Medicare eligibility at 65. Plan for significant healthcare costs.
                  </>
                ) : (
                  <>
                    You will be Medicare-eligible at FIRE, which simplifies healthcare
                    planning significantly.
                  </>
                )}
              </p>
              {yearsUntilMedicare > 0 && (
                <div className="grid grid-cols-2 gap-4 mt-3">
                  <div className="bg-white dark:bg-gray-900 rounded p-3 border border-red-200 dark:border-red-800">
                    <div className="text-xs text-muted-foreground">
                      Est. Annual Cost (Pre-Medicare)
                    </div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      ~{formatCurrency(preMedicareHealthcareCost)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900 rounded p-3 border border-red-200 dark:border-red-800">
                    <div className="text-xs text-muted-foreground">
                      Total Pre-Medicare Cost
                    </div>
                    <div className="text-lg font-bold text-red-700 dark:text-red-300">
                      ~{formatCurrency(preMedicareHealthcareCost * yearsUntilMedicare)}
                    </div>
                  </div>
                </div>
              )}
              <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside mt-3">
                <li>ACA marketplace (manage income for subsidies)</li>
                <li>Health sharing ministries (if eligible)</li>
                <li>Barista FIRE for employer benefits</li>
                <li>COBRA from previous employer (temporary)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Spending Flexibility */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <TrendingUp className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Spending Flexibility
              </div>
              <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                The ability to adjust spending is your superpower. A 10-20% spending
                reduction during market downturns dramatically improves portfolio
                survival.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded p-3 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Baseline
                  </div>
                  <div className="font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(annualExpenses)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-3 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    -15% Flex
                  </div>
                  <div className="font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(annualExpenses * 0.85)}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-3 border border-green-200 dark:border-green-800 text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    -25% Floor
                  </div>
                  <div className="font-bold text-green-700 dark:text-green-300">
                    {formatCurrency(annualExpenses * 0.75)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FIRENumberCalculatorProps {
  annualExpenses: number;
  onExpensesChange: (value: number) => void;
  withdrawalRule: WithdrawalRule;
  onWithdrawalRuleChange: (rule: WithdrawalRule) => void;
  fireNumber: number;
}

function FIRENumberCalculator({
  annualExpenses,
  onExpensesChange,
  withdrawalRule,
  onWithdrawalRuleChange,
  fireNumber,
}: FIRENumberCalculatorProps) {
  const multiplier = withdrawalRule === "3percent" ? 33.33 : 25;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          FIRE Number Calculator
          <InfoTooltip
            content="Your FIRE number is the amount you need invested to cover your annual expenses using the safe withdrawal rate. The 4% rule suggests multiplying expenses by 25, while more conservative 3% uses 33."
            side="right"
          />
        </CardTitle>
        <CardDescription>
          How much do you need to retire? The formula is simple.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* The Formula */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg p-6 text-center">
          <div className="text-lg text-muted-foreground mb-2">FIRE Number =</div>
          <div className="flex items-center justify-center gap-3 text-3xl font-bold">
            <span className="text-primary">
              {formatCurrency(annualExpenses)}
            </span>
            <span className="text-muted-foreground">x</span>
            <span className="text-primary">{multiplier.toFixed(0)}</span>
            <span className="text-muted-foreground">=</span>
            <span className="text-2xl md:text-4xl bg-primary text-primary-foreground px-4 py-2 rounded-lg">
              {formatCurrency(fireNumber)}
            </span>
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              Annual Expenses
              <InfoTooltip
                content="Your expected annual spending in retirement, including housing, food, healthcare, travel, and all other costs."
                side="right"
              />
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                value={annualExpenses}
                onChange={(e) => onExpensesChange(Number(e.target.value))}
                className="pl-9"
                min={10000}
                max={500000}
                step={1000}
              />
            </div>
            <Slider
              value={[annualExpenses]}
              onValueChange={([val]) => onExpensesChange(val)}
              min={20000}
              max={200000}
              step={5000}
              thumbLabel="Annual expenses"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-2">
              Withdrawal Rule
              <InfoTooltip
                content="The 4% rule (multiply by 25) has historically had a 95%+ success rate over 30 years. The 3% rule is more conservative for longer retirements or uncertain markets."
                side="right"
              />
            </label>
            <Select
              value={withdrawalRule}
              onValueChange={(val) =>
                onWithdrawalRuleChange(val as WithdrawalRule)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4percent">
                  4% Rule (x25) - Standard
                </SelectItem>
                <SelectItem value="3percent">
                  3% Rule (x33) - Conservative
                </SelectItem>
                <SelectItem value="variable">
                  Variable - Adjust with market
                </SelectItem>
              </SelectContent>
            </Select>
            <div className="text-sm text-muted-foreground">
              {withdrawalRule === "4percent" && (
                <>
                  The classic Trinity Study rule. Historically successful for
                  30-year retirements.
                </>
              )}
              {withdrawalRule === "3percent" && (
                <>
                  More conservative for 40-50 year retirements or uncertain
                  market conditions.
                </>
              )}
              {withdrawalRule === "variable" && (
                <>
                  Flexible withdrawals based on portfolio performance. Requires
                  spending flexibility.
                </>
              )}
            </div>
          </div>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground mb-1">4% Rule</div>
            <div className="text-2xl font-bold">
              {formatCurrency(annualExpenses * 25)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatCurrency(annualExpenses)}/year withdrawal
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 border">
            <div className="text-sm text-muted-foreground mb-1">3% Rule</div>
            <div className="text-2xl font-bold">
              {formatCurrency(annualExpenses * 33.33)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              More buffer for longevity
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export interface FIRECalculatorProps {
  // Integration with main calculator
  initialSavings?: number;
  initialIncome?: number;
  initialAge?: number;
  onFIREDateChange?: (date: Date, yearsToFIRE: number) => void;
}

export function FIRECalculator({
  initialSavings = 100000,
  initialIncome = 80000,
  initialAge = 30,
  onFIREDateChange,
}: FIRECalculatorProps) {
  // State
  const [inputs, setInputs] = useState<FIREInputs>({
    currentAge: initialAge,
    annualIncome: initialIncome,
    annualExpenses: 40000,
    currentSavings: initialSavings,
    expectedReturn: 7,
    inflationRate: 3,
    fireVariant: "regular",
    withdrawalRule: "4percent",
    partTimeIncome: 20000,
    coastTargetAge: 65,
    includeHealthcare: true,
    healthcareCostPreMedicare: 15000,
  });

  // Update inputs helper
  const updateInput = useCallback(
    <K extends keyof FIREInputs>(key: K, value: FIREInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // When FIRE variant changes, update expenses
  const handleVariantChange = useCallback((variant: FIREVariant) => {
    setInputs((prev) => ({
      ...prev,
      fireVariant: variant,
      annualExpenses: FIRE_VARIANTS[variant].annualExpenses,
    }));
  }, []);

  // Calculate results
  const results = useMemo((): FIREResults => {
    const {
      currentAge,
      annualIncome,
      annualExpenses,
      currentSavings,
      expectedReturn,
      inflationRate,
      fireVariant,
      withdrawalRule,
      partTimeIncome,
      coastTargetAge,
      includeHealthcare,
      healthcareCostPreMedicare,
    } = inputs;

    // Adjust expenses for healthcare if early retirement
    let adjustedExpenses = annualExpenses;
    if (includeHealthcare && currentAge < 65) {
      adjustedExpenses += healthcareCostPreMedicare;
    }

    // For Barista FIRE, reduce needed withdrawal
    if (fireVariant === "barista") {
      adjustedExpenses = Math.max(0, adjustedExpenses - partTimeIncome);
    }

    // Calculate FIRE number
    let fireNumber: number;
    if (fireVariant === "coast") {
      fireNumber = calculateCoastFIRENumber(
        coastTargetAge,
        currentAge,
        adjustedExpenses,
        expectedReturn - inflationRate,
        withdrawalRule
      );
    } else {
      fireNumber = calculateFIRENumber(adjustedExpenses, withdrawalRule);
    }

    // Calculate savings and progress
    const annualSavings = annualIncome - annualExpenses;
    const savingsRate = (annualSavings / annualIncome) * 100;
    const currentProgress = (currentSavings / fireNumber) * 100;

    // Calculate years to FIRE
    const realReturn = expectedReturn - inflationRate;
    const yearsToFIRE = calculateYearsToFIRE(
      currentSavings,
      annualSavings,
      fireNumber,
      realReturn
    );

    // Calculate FIRE date
    const fireDate = new Date();
    fireDate.setFullYear(fireDate.getFullYear() + Math.ceil(yearsToFIRE));

    // Generate projections
    const projectedBalances = generateProjections(
      currentAge,
      currentSavings,
      annualSavings,
      realReturn,
      Math.ceil(yearsToFIRE) + 5
    );

    // Withdrawal details
    const safeWithdrawalRate = withdrawalRule === "3percent" ? 3 : 4;
    const annualWithdrawal = fireNumber * (safeWithdrawalRate / 100);

    return {
      fireNumber,
      currentProgress,
      yearsToFIRE,
      fireDate,
      savingsRate,
      monthlyExpenses: adjustedExpenses / 12,
      annualWithdrawal,
      safeWithdrawalRate,
      projectedBalances,
    };
  }, [inputs]);

  // Notify parent of FIRE date changes
  React.useEffect(() => {
    if (onFIREDateChange && results.yearsToFIRE < 100) {
      onFIREDateChange(results.fireDate, results.yearsToFIRE);
    }
  }, [results.fireDate, results.yearsToFIRE, onFIREDateChange]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <Flame className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">FIRE Calculator</h2>
          <p className="text-muted-foreground">
            Financial Independence, Retire Early
          </p>
        </div>
      </div>

      {/* FIRE Variant Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Choose Your FIRE Path
            <InfoTooltip
              content="Different FIRE variants suit different lifestyles. Lean FIRE requires the least but means minimal spending. Fat FIRE allows luxury but needs a much larger nest egg."
              side="right"
            />
          </CardTitle>
          <CardDescription>
            Select a FIRE variant that matches your lifestyle goals
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FIREVariantSelector
            selected={inputs.fireVariant}
            onSelect={handleVariantChange}
          />
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs defaultValue="dashboard" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="dashboard">
            <Target className="h-4 w-4 mr-2" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            FIRE Number
          </TabsTrigger>
          <TabsTrigger value="math">
            <LineChart className="h-4 w-4 mr-2" />
            The Math
          </TabsTrigger>
          <TabsTrigger value="planning">
            <Shield className="h-4 w-4 mr-2" />
            Post-FIRE
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="space-y-6">
          {/* Input Form */}
          <Card>
            <CardHeader>
              <CardTitle>Your Financial Snapshot</CardTitle>
              <CardDescription>
                Enter your current financial situation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Age</label>
                  <Input
                    type="number"
                    value={inputs.currentAge}
                    onChange={(e) =>
                      updateInput("currentAge", Number(e.target.value))
                    }
                    min={18}
                    max={80}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Annual Income</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inputs.annualIncome}
                      onChange={(e) =>
                        updateInput("annualIncome", Number(e.target.value))
                      }
                      className="pl-9"
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Annual Expenses</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inputs.annualExpenses}
                      onChange={(e) =>
                        updateInput("annualExpenses", Number(e.target.value))
                      }
                      className="pl-9"
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Current Savings</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inputs.currentSavings}
                      onChange={(e) =>
                        updateInput("currentSavings", Number(e.target.value))
                      }
                      className="pl-9"
                      min={0}
                      step={1000}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Expected Return
                    <InfoTooltip
                      content="Historical stock market returns average 7-10% nominal. Use 7% real (after inflation) for conservative planning."
                      side="right"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={inputs.expectedReturn}
                      onChange={(e) =>
                        updateInput("expectedReturn", Number(e.target.value))
                      }
                      min={0}
                      max={15}
                      step={0.5}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Inflation Rate
                    <InfoTooltip
                      content="Long-term inflation averages 2-3%. Your real return = expected return minus inflation."
                      side="right"
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={inputs.inflationRate}
                      onChange={(e) =>
                        updateInput("inflationRate", Number(e.target.value))
                      }
                      min={0}
                      max={10}
                      step={0.5}
                    />
                    <span className="text-muted-foreground">%</span>
                  </div>
                </div>

                {/* Barista FIRE specific input */}
                {inputs.fireVariant === "barista" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Part-Time Income
                      <InfoTooltip
                        content="Expected annual income from part-time work, which reduces your withdrawal needs and can provide health benefits."
                        side="right"
                      />
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.partTimeIncome}
                        onChange={(e) =>
                          updateInput("partTimeIncome", Number(e.target.value))
                        }
                        className="pl-9"
                        min={0}
                        step={1000}
                      />
                    </div>
                  </div>
                )}

                {/* Coast FIRE specific input */}
                {inputs.fireVariant === "coast" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium flex items-center gap-2">
                      Target Retirement Age
                      <InfoTooltip
                        content="The age at which you want to fully retire. Coast FIRE means you stop saving now and let compounding do the rest until this age."
                        side="right"
                      />
                    </label>
                    <Input
                      type="number"
                      value={inputs.coastTargetAge}
                      onChange={(e) =>
                        updateInput("coastTargetAge", Number(e.target.value))
                      }
                      min={inputs.currentAge + 5}
                      max={80}
                    />
                  </div>
                )}

                {/* Healthcare toggle */}
                <div className="space-y-2 col-span-full md:col-span-1">
                  <label className="text-sm font-medium flex items-center gap-2">
                    Include Pre-Medicare Healthcare
                    <InfoTooltip
                      content="Add estimated healthcare costs for early retirees before Medicare eligibility at age 65."
                      side="right"
                    />
                  </label>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={inputs.includeHealthcare}
                      onCheckedChange={(checked) =>
                        updateInput("includeHealthcare", checked)
                      }
                    />
                    <span className="text-sm text-muted-foreground">
                      {inputs.includeHealthcare ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dashboard */}
          <ProgressDashboard
            fireNumber={results.fireNumber}
            currentSavings={inputs.currentSavings}
            yearsToFIRE={results.yearsToFIRE}
            fireDate={results.fireDate}
            savingsRate={results.savingsRate}
          />

          {/* Projection Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Projected Growth
              </CardTitle>
              <CardDescription>
                Your path to financial independence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/30 rounded-lg border-2 border-dashed">
                {/* Simple text-based projection display */}
                <div className="text-center space-y-4 p-4">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    {results.projectedBalances
                      .filter((_, i) => i % 5 === 0 || i === results.projectedBalances.length - 1)
                      .slice(0, 5)
                      .map((point) => (
                        <div
                          key={point.year}
                          className="p-3 bg-background rounded-lg border"
                        >
                          <div className="font-medium">Age {point.age}</div>
                          <div className="text-lg font-bold text-primary">
                            {formatCurrency(point.balance)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {point.year}
                          </div>
                        </div>
                      ))}
                  </div>
                  {results.yearsToFIRE < 100 && (
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                      <span>
                        FIRE at age {Math.round(inputs.currentAge + results.yearsToFIRE)} with{" "}
                        {formatCurrency(results.fireNumber)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator">
          <FIRENumberCalculator
            annualExpenses={inputs.annualExpenses}
            onExpensesChange={(val) => updateInput("annualExpenses", val)}
            withdrawalRule={inputs.withdrawalRule}
            onWithdrawalRuleChange={(rule) =>
              updateInput("withdrawalRule", rule)
            }
            fireNumber={results.fireNumber}
          />
        </TabsContent>

        <TabsContent value="math">
          <SavingsRateVisualization
            currentRate={Math.max(0, Math.min(90, results.savingsRate))}
            onRateChange={(rate) => {
              const newExpenses = inputs.annualIncome * (1 - rate / 100);
              updateInput("annualExpenses", Math.round(newExpenses));
            }}
          />
        </TabsContent>

        <TabsContent value="planning">
          <PostFIREPlanning
            annualExpenses={inputs.annualExpenses}
            fireNumber={results.fireNumber}
            currentAge={inputs.currentAge}
            yearsToFIRE={results.yearsToFIRE}
          />
        </TabsContent>
      </Tabs>

      {/* Integration Note */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-900">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                FIRE + Traditional Retirement Planning
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Your FIRE date of{" "}
                <strong>
                  {results.yearsToFIRE < 100
                    ? results.fireDate.getFullYear()
                    : "TBD"}
                </strong>{" "}
                (age{" "}
                {results.yearsToFIRE < 100
                  ? Math.round(inputs.currentAge + results.yearsToFIRE)
                  : "-"}
                ) can be added as a milestone in your main retirement plan. FIRE is
                about achieving financial freedom earlier than the traditional
                retirement age, giving you options and flexibility.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Export default for easier imports
export default FIRECalculator;
