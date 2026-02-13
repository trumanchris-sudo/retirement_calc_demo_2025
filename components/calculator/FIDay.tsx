"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { Textarea } from "@/components/ui/textarea";
import {
  Calendar,
  Target,
  TrendingUp,
  Clock,
  DollarSign,
  Sparkles,
  ChevronRight,
  PartyPopper,
  Rocket,
  Heart,
  Sunset,
  Lightbulb,
  SlidersHorizontal,
  Trophy,
  Star,
  Zap,
  CalendarDays,
  Timer,
  PiggyBank,
  ArrowDownRight,
  ArrowUpRight,
  Gift,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";

// =============================================================================
// Types and Constants
// =============================================================================

type WithdrawalRule = "4percent" | "3percent";

interface FIInputs {
  currentAge: number;
  annualExpenses: number;
  currentSavings: number;
  annualSavings: number;
  expectedReturn: number;
  inflationRate: number;
  withdrawalRule: WithdrawalRule;
}

interface WhatIfScenario {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  change: {
    additionalMonthlySavings?: number;
    reducedMonthlyExpenses?: number;
    returnChange?: number;
  };
}

interface CoastFIResult {
  targetAge: number;
  coastNumber: number;
  isCoasting: boolean;
}

interface CelebrationIdea {
  id: string;
  text: string;
  timestamp: number;
}

// Celebration milestones
const MILESTONES = [
  { percent: 10, label: "10%", message: "First milestone! You're on your way!", icon: <Star className="h-4 w-4" /> },
  { percent: 25, label: "25%", message: "Quarter of the way there!", icon: <Trophy className="h-4 w-4" /> },
  { percent: 50, label: "50%", message: "Halfway to freedom!", icon: <PartyPopper className="h-4 w-4" /> },
  { percent: 75, label: "75%", message: "The finish line is in sight!", icon: <Rocket className="h-4 w-4" /> },
  { percent: 90, label: "90%", message: "Almost there! Keep going!", icon: <Zap className="h-4 w-4" /> },
  { percent: 100, label: "100%", message: "YOU DID IT! Financial Independence achieved!", icon: <Sparkles className="h-4 w-4" /> },
];

// What-if scenarios
const WHAT_IF_SCENARIOS: WhatIfScenario[] = [
  {
    id: "save-500",
    label: "Save $500 more/month",
    description: "Increase monthly savings",
    icon: <PiggyBank className="h-4 w-4" />,
    change: { additionalMonthlySavings: 500 },
  },
  {
    id: "save-1000",
    label: "Save $1,000 more/month",
    description: "Aggressive savings boost",
    icon: <TrendingUp className="h-4 w-4" />,
    change: { additionalMonthlySavings: 1000 },
  },
  {
    id: "reduce-500",
    label: "Spend $500 less/month",
    description: "Reduce monthly expenses",
    icon: <ArrowDownRight className="h-4 w-4" />,
    change: { reducedMonthlyExpenses: 500 },
  },
  {
    id: "reduce-1000",
    label: "Spend $1,000 less/month",
    description: "Significant lifestyle change",
    icon: <Target className="h-4 w-4" />,
    change: { reducedMonthlyExpenses: 1000 },
  },
];

// Coast FI target ages
const COAST_FI_AGES = [55, 60, 65, 67, 70];

// =============================================================================
// Utility Functions
// =============================================================================

function calculateFINumber(annualExpenses: number, withdrawalRule: WithdrawalRule): number {
  const multiplier = withdrawalRule === "3percent" ? 33.33 : 25;
  return annualExpenses * multiplier;
}

function calculateYearsToFI(
  currentSavings: number,
  annualSavings: number,
  fiNumber: number,
  realReturn: number
): number {
  if (currentSavings >= fiNumber) return 0;
  if (annualSavings <= 0) return Infinity;

  const r = realReturn / 100;

  // Binary search for years
  let low = 0;
  let high = 100;

  while (high - low > 0.01) {
    const mid = (low + high) / 2;
    const futureValue =
      currentSavings * Math.pow(1 + r, mid) +
      annualSavings * ((Math.pow(1 + r, mid) - 1) / r);

    if (futureValue < fiNumber) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return (low + high) / 2;
}

function calculateFIDate(yearsToFI: number): Date {
  const today = new Date();
  const fiDate = new Date(today);
  fiDate.setFullYear(today.getFullYear() + Math.floor(yearsToFI));
  fiDate.setMonth(today.getMonth() + Math.floor((yearsToFI % 1) * 12));
  return fiDate;
}

function formatCountdown(yearsToFI: number): { years: number; months: number; days: number } {
  const totalDays = yearsToFI * 365.25;
  const years = Math.floor(yearsToFI);
  const remainingDays = totalDays - years * 365.25;
  const months = Math.floor(remainingDays / 30.44);
  const days = Math.floor(remainingDays - months * 30.44);

  return { years, months, days };
}

function calculateCoastFINumber(
  targetAge: number,
  currentAge: number,
  annualExpenses: number,
  realReturn: number,
  withdrawalRule: WithdrawalRule
): number {
  const yearsToTarget = targetAge - currentAge;
  const fiNumber = calculateFINumber(annualExpenses, withdrawalRule);
  const r = realReturn / 100;

  // Present value needed today to reach FI number at target age
  return fiNumber / Math.pow(1 + r, yearsToTarget);
}

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${Math.round(value / 1000).toLocaleString()}K`;
  }
  return `$${Math.round(value).toLocaleString()}`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// =============================================================================
// Sub-Components
// =============================================================================

interface FINumberDisplayProps {
  fiNumber: number;
  currentSavings: number;
  withdrawalRule: WithdrawalRule;
}

function FINumberDisplay({ fiNumber, currentSavings, withdrawalRule }: FINumberDisplayProps) {
  const progress = Math.min((currentSavings / fiNumber) * 100, 100);
  const currentMilestone = MILESTONES.filter((m) => progress >= m.percent).pop();
  const nextMilestone = MILESTONES.find((m) => progress < m.percent);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Your FI Number</CardTitle>
          </div>
          <Badge variant="outline" className="font-mono">
            {withdrawalRule === "4percent" ? "4% Rule" : "3% Rule"}
          </Badge>
        </div>
        <CardDescription>
          {withdrawalRule === "4percent"
            ? "Annual expenses x 25 (classic Trinity Study)"
            : "Annual expenses x 33 (more conservative)"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Big Number Display */}
        <div className="text-center py-4">
          <div className="text-5xl md:text-6xl font-bold text-primary tracking-tight">
            {formatCurrency(fiNumber)}
          </div>
          <p className="text-muted-foreground mt-2 text-sm">
            The magic number that buys your freedom
          </p>
        </div>

        {/* Progress Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Your Progress</span>
            <span className="text-2xl font-bold text-primary">
              {progress.toFixed(1)}%
            </span>
          </div>

          {/* Progress Bar with Milestone Markers */}
          <div className="relative">
            <Progress value={progress} className="h-4" />
            <div className="absolute top-0 left-0 right-0 h-4 flex items-center">
              {MILESTONES.slice(0, -1).map((milestone) => (
                <div
                  key={milestone.percent}
                  className={cn(
                    "absolute w-0.5 h-3 rounded-full transition-colors",
                    progress >= milestone.percent
                      ? "bg-primary-foreground/50"
                      : "bg-muted-foreground/30"
                  )}
                  style={{ left: `${milestone.percent}%` }}
                />
              ))}
            </div>
          </div>

          {/* Milestone Labels */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            {MILESTONES.map((milestone) => (
              <span
                key={milestone.percent}
                className={cn(
                  "transition-colors",
                  progress >= milestone.percent && "text-primary font-medium"
                )}
              >
                {milestone.label}
              </span>
            ))}
          </div>

          {/* Current Amount */}
          <div className="flex items-center justify-between pt-2 border-t">
            <span className="text-sm text-muted-foreground">You have</span>
            <span className="font-semibold">{formatCurrency(currentSavings)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Still need</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(Math.max(0, fiNumber - currentSavings))}
            </span>
          </div>
        </div>

        {/* Celebration Message */}
        {currentMilestone && (
          <div
            className={cn(
              "flex items-center gap-3 p-4 rounded-lg",
              progress >= 100
                ? "bg-green-100 dark:bg-green-950 text-green-800 dark:text-green-200"
                : "bg-primary/10 text-primary"
            )}
          >
            {currentMilestone.icon}
            <div>
              <p className="font-semibold">{currentMilestone.message}</p>
              {nextMilestone && (
                <p className="text-sm opacity-80">
                  Next milestone: {nextMilestone.label} ({formatCurrency(fiNumber * nextMilestone.percent / 100)})
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface FIDateDisplayProps {
  fiDate: Date;
  yearsToFI: number;
  currentAge: number;
}

function FIDateDisplay({ fiDate, yearsToFI, currentAge }: FIDateDisplayProps) {
  const countdown = formatCountdown(yearsToFI);
  const fiAge = currentAge + yearsToFI;
  const isAchieved = yearsToFI <= 0;

  // Countdown timer effect
  const [secondsOffset, setSecondsOffset] = useState(0);

  useEffect(() => {
    if (isAchieved) return;

    const interval = setInterval(() => {
      setSecondsOffset((prev) => (prev + 1) % 60);
    }, 1000);

    return () => clearInterval(interval);
  }, [isAchieved]);

  if (isAchieved) {
    return (
      <Card className="border-2 border-green-500/50 bg-gradient-to-br from-green-500/10 to-transparent">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <PartyPopper className="h-16 w-16 mx-auto text-green-500 animate-bounce" />
            <h3 className="text-3xl font-bold text-green-600 dark:text-green-400">
              You've Reached FI!
            </h3>
            <p className="text-muted-foreground">
              Congratulations! Work is now optional. Your FI Day is TODAY!
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg">Your FI Day</CardTitle>
        </div>
        <CardDescription>
          At your current savings rate, you reach FI on
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* The Big Date */}
        <div className="text-center py-4 space-y-2">
          <div className="text-3xl md:text-4xl font-bold text-amber-600 dark:text-amber-400">
            {formatDate(fiDate)}
          </div>
          <p className="text-muted-foreground">
            At age <span className="font-semibold text-foreground">{Math.round(fiAge)}</span>
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl md:text-4xl font-bold font-mono">{countdown.years}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Years</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl md:text-4xl font-bold font-mono">{countdown.months}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Months</div>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50 relative overflow-hidden">
            <div className="text-3xl md:text-4xl font-bold font-mono">{countdown.days}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide mt-1">Days</div>
            {/* Animated tick indicator */}
            <div
              className="absolute bottom-0 left-0 h-0.5 bg-primary/50 transition-all duration-1000"
              style={{ width: `${(secondsOffset / 60) * 100}%` }}
            />
          </div>
        </div>

        {/* Motivational Quote */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-muted">
          <Timer className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm italic">
              "Every day you're getting closer. Every dollar saved is another step toward freedom."
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface WhatIfSlidersProps {
  inputs: FIInputs;
  baseYearsToFI: number;
  baseFIDate: Date;
  onScenarioChange?: (yearsChange: number) => void;
}

function WhatIfSliders({ inputs, baseYearsToFI, baseFIDate }: WhatIfSlidersProps) {
  const [additionalSavings, setAdditionalSavings] = useState(0);
  const [reducedExpenses, setReducedExpenses] = useState(0);

  const scenarioResult = useMemo(() => {
    const newAnnualExpenses = inputs.annualExpenses - reducedExpenses * 12;
    const newAnnualSavings = inputs.annualSavings + additionalSavings * 12;
    const newFINumber = calculateFINumber(newAnnualExpenses, inputs.withdrawalRule);
    const realReturn = inputs.expectedReturn - inputs.inflationRate;
    const newYearsToFI = calculateYearsToFI(
      inputs.currentSavings,
      newAnnualSavings,
      newFINumber,
      realReturn
    );
    const newFIDate = calculateFIDate(newYearsToFI);
    const yearsSaved = baseYearsToFI - newYearsToFI;

    return {
      yearsToFI: newYearsToFI,
      fiDate: newFIDate,
      yearsSaved,
      fiNumber: newFINumber,
    };
  }, [inputs, additionalSavings, reducedExpenses, baseYearsToFI]);

  const hasChanges = additionalSavings > 0 || reducedExpenses > 0;

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-blue-600" />
          <CardTitle className="text-lg">What-If Scenarios</CardTitle>
        </div>
        <CardDescription>
          Explore how changes to your savings and spending affect your FI date
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Save More Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Save More Each Month</span>
            </div>
            <Badge variant="outline" className="font-mono">
              +${additionalSavings.toLocaleString()}/mo
            </Badge>
          </div>
          <Slider
            value={[additionalSavings]}
            onValueChange={(vals) => setAdditionalSavings(vals[0])}
            min={0}
            max={5000}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>$2,500</span>
            <span>$5,000</span>
          </div>
        </div>

        {/* Spend Less Slider */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">Reduce Monthly Expenses</span>
            </div>
            <Badge variant="outline" className="font-mono">
              -${reducedExpenses.toLocaleString()}/mo
            </Badge>
          </div>
          <Slider
            value={[reducedExpenses]}
            onValueChange={(vals) => setReducedExpenses(vals[0])}
            min={0}
            max={Math.min(inputs.annualExpenses / 12 * 0.5, 5000)}
            step={100}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>$0</span>
            <span>${Math.round(Math.min(inputs.annualExpenses / 12 * 0.25, 2500)).toLocaleString()}</span>
            <span>${Math.round(Math.min(inputs.annualExpenses / 12 * 0.5, 5000)).toLocaleString()}</span>
          </div>
        </div>

        {/* Result Display */}
        {hasChanges && (
          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
              <div className="flex items-center gap-2">
                <Rocket className="h-5 w-5 text-green-600" />
                <span className="font-medium">Time Saved</span>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {scenarioResult.yearsSaved > 0 ? (
                    <>
                      {scenarioResult.yearsSaved.toFixed(1)} years earlier!
                    </>
                  ) : scenarioResult.yearsSaved === 0 ? (
                    "No change"
                  ) : (
                    <>
                      {Math.abs(scenarioResult.yearsSaved).toFixed(1)} years later
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">New FI Date</div>
                <div className="font-semibold">{formatDate(scenarioResult.fiDate)}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="text-muted-foreground">New FI Number</div>
                <div className="font-semibold">{formatCurrency(scenarioResult.fiNumber)}</div>
              </div>
            </div>

            {/* Quick Scenarios */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              {WHAT_IF_SCENARIOS.map((scenario) => {
                const isActive =
                  (scenario.change.additionalMonthlySavings &&
                    additionalSavings === scenario.change.additionalMonthlySavings) ||
                  (scenario.change.reducedMonthlyExpenses &&
                    reducedExpenses === scenario.change.reducedMonthlyExpenses);

                return (
                  <button
                    key={scenario.id}
                    onClick={() => {
                      if (scenario.change.additionalMonthlySavings) {
                        setAdditionalSavings(scenario.change.additionalMonthlySavings);
                      }
                      if (scenario.change.reducedMonthlyExpenses) {
                        setReducedExpenses(scenario.change.reducedMonthlyExpenses);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                      "hover:bg-muted/50 hover:border-primary/50",
                      isActive && "border-primary bg-primary/5"
                    )}
                  >
                    {scenario.icon}
                    <span className="text-xs font-medium">{scenario.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface CoastFIDisplayProps {
  inputs: FIInputs;
}

function CoastFIDisplay({ inputs }: CoastFIDisplayProps) {
  const realReturn = inputs.expectedReturn - inputs.inflationRate;

  const coastResults = useMemo(() => {
    return COAST_FI_AGES.map((targetAge) => {
      if (targetAge <= inputs.currentAge) {
        return {
          targetAge,
          coastNumber: 0,
          isCoasting: false,
          canCoast: false,
        };
      }

      const coastNumber = calculateCoastFINumber(
        targetAge,
        inputs.currentAge,
        inputs.annualExpenses,
        realReturn,
        inputs.withdrawalRule
      );

      const isCoasting = inputs.currentSavings >= coastNumber;

      return {
        targetAge,
        coastNumber,
        isCoasting,
        canCoast: true,
      };
    }).filter((r) => r.canCoast);
  }, [inputs, realReturn]);

  const currentCoastStatus = coastResults.find((r) => r.isCoasting);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Sunset className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-lg">Coast FI Status</CardTitle>
        </div>
        <CardDescription>
          If you stopped saving today, when would you still hit FI?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {currentCoastStatus ? (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
                <Sparkles className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-semibold text-green-700 dark:text-green-300">
                  You've already hit Coast FI!
                </p>
                <p className="text-sm text-green-600 dark:text-green-400">
                  Stop saving now and you'll still reach FI by age {currentCoastStatus.targetAge}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-lg bg-muted/50 border">
            <p className="text-sm text-muted-foreground">
              You haven't reached Coast FI yet. Keep saving!
            </p>
          </div>
        )}

        {/* Coast FI Table */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-muted-foreground">Coast FI Numbers by Age</h4>
          <div className="space-y-2">
            {coastResults.map((result) => {
              const progress = Math.min((inputs.currentSavings / result.coastNumber) * 100, 100);

              return (
                <div
                  key={result.targetAge}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg border transition-colors",
                    result.isCoasting
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-muted/30"
                  )}
                >
                  <div className="flex-shrink-0 w-16">
                    <Badge
                      variant={result.isCoasting ? "default" : "outline"}
                      className={cn(
                        "font-mono",
                        result.isCoasting && "bg-green-600"
                      )}
                    >
                      Age {result.targetAge}
                    </Badge>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {formatCurrency(result.coastNumber)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {progress.toFixed(0)}%
                      </span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                  {result.isCoasting && (
                    <Sparkles className="h-4 w-4 text-green-600 flex-shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-muted">
          <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium mb-1">What is Coast FI?</p>
            <p className="text-muted-foreground">
              Coast FI is the point where you have enough saved that compound growth alone
              will get you to full FI by your target age - even if you never save another dollar.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface FIMindsetProps {}

function FIMindset({}: FIMindsetProps) {
  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-500" />
          <CardTitle className="text-lg">FI is Not Retirement</CardTitle>
        </div>
        <CardDescription>
          Understanding the psychological shift
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4">
          <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900">
              <Zap className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h4 className="font-semibold text-blue-700 dark:text-blue-300">FI means work is OPTIONAL</h4>
              <p className="text-sm text-muted-foreground mt-1">
                You might keep working... but now it's on YOUR terms. No more golden handcuffs.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-950/30">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h4 className="font-semibold text-purple-700 dark:text-purple-300">Freedom to pursue passion</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Start that business, write that book, travel the world, or simply spend more time with family.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-green-50 to-transparent dark:from-green-950/30">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h4 className="font-semibold text-green-700 dark:text-green-300">Negotiate from strength</h4>
              <p className="text-sm text-muted-foreground mt-1">
                When you don't need the paycheck, you can ask for what you deserve - or walk away.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-transparent dark:from-amber-950/30">
            <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900">
              <Heart className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h4 className="font-semibold text-amber-700 dark:text-amber-300">Life on your schedule</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Sleep in. Work out midday. Pick up kids from school. Live life on your own terms.
              </p>
            </div>
          </div>
        </div>

        <blockquote className="border-l-4 border-primary/50 pl-4 italic text-muted-foreground">
          "Financial Independence isn't about not working - it's about having the freedom to choose work that matters to you."
        </blockquote>
      </CardContent>
    </Card>
  );
}

interface CelebrationPlannerProps {
  fiDate: Date;
  currentAge: number;
  yearsToFI: number;
}

function CelebrationPlanner({ fiDate, currentAge, yearsToFI }: CelebrationPlannerProps) {
  const [ideas, setIdeas] = useState<CelebrationIdea[]>([]);
  const [newIdea, setNewIdea] = useState("");

  const handleAddIdea = useCallback(() => {
    if (newIdea.trim()) {
      setIdeas((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          text: newIdea.trim(),
          timestamp: Date.now(),
        },
      ]);
      setNewIdea("");
    }
  }, [newIdea]);

  const handleRemoveIdea = useCallback((id: string) => {
    setIdeas((prev) => prev.filter((idea) => idea.id !== id));
  }, []);

  const suggestedIdeas = [
    "Travel to a dream destination",
    "Start a passion project",
    "Spend more time with family",
    "Learn a new skill",
    "Volunteer for a cause I care about",
    "Write a book",
    "Start a small business",
    "Take up a new hobby",
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-pink-500" />
          <CardTitle className="text-lg">Celebration Planning</CardTitle>
        </div>
        <CardDescription>
          What will you do on your FI Day? Dream big!
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* FI Day Card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 p-6 text-white">
          <div className="absolute top-0 right-0 opacity-20">
            <PartyPopper className="h-32 w-32 -translate-y-4 translate-x-4" />
          </div>
          <div className="relative">
            <div className="text-sm opacity-80 mb-1">Mark your calendar</div>
            <div className="text-2xl font-bold mb-2">{formatDate(fiDate)}</div>
            <div className="text-sm opacity-80">
              Your Independence Day at age {Math.round(currentAge + yearsToFI)}
            </div>
          </div>
        </div>

        {/* Dream Board */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Flag className="h-4 w-4" />
            Your FI Vision Board
          </h4>

          {/* Add New Idea */}
          <div className="flex gap-2">
            <Input
              placeholder="What will you do when you're FI?"
              value={newIdea}
              onChange={(e) => setNewIdea(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddIdea();
                }
              }}
              className="flex-1"
            />
            <button
              onClick={handleAddIdea}
              className={cn(
                "px-4 py-2 rounded-lg font-medium transition-all",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              disabled={!newIdea.trim()}
            >
              Add
            </button>
          </div>

          {/* Ideas List */}
          {ideas.length > 0 && (
            <div className="space-y-2">
              {ideas.map((idea) => (
                <div
                  key={idea.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 group"
                >
                  <Star className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  <span className="flex-1 text-sm">{idea.text}</span>
                  <button
                    onClick={() => handleRemoveIdea(idea.id)}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                    aria-label="Remove idea"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Suggested Ideas */}
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">Suggestions (click to add)</div>
            <div className="flex flex-wrap gap-2">
              {suggestedIdeas
                .filter((s) => !ideas.some((i) => i.text === s))
                .slice(0, 5)
                .map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setIdeas((prev) => [
                        ...prev,
                        {
                          id: crypto.randomUUID(),
                          text: suggestion,
                          timestamp: Date.now(),
                        },
                      ]);
                    }}
                    className="px-3 py-1.5 text-xs rounded-full border border-dashed hover:border-primary hover:text-primary transition-colors"
                  >
                    + {suggestion}
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Share Vision */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            Write Your FI Story
          </h4>
          <Textarea
            placeholder="On my FI Day, I will... (Describe your ideal day of freedom)"
            className="min-h-[100px] resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Visualizing your future helps make it real. Write about the life you're building toward.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

interface FIDayProps {
  currentAge?: number;
  currentSavings?: number;
  annualExpenses?: number;
  annualSavings?: number;
  expectedReturn?: number;
  inflationRate?: number;
}

export function FIDay({
  currentAge: initialAge = 35,
  currentSavings: initialSavings = 250000,
  annualExpenses: initialExpenses = 60000,
  annualSavings: initialAnnualSavings = 30000,
  expectedReturn: initialReturn = 7,
  inflationRate: initialInflation = 2.5,
}: FIDayProps) {
  // Form State
  const [inputs, setInputs] = useState<FIInputs>({
    currentAge: initialAge,
    annualExpenses: initialExpenses,
    currentSavings: initialSavings,
    annualSavings: initialAnnualSavings,
    expectedReturn: initialReturn,
    inflationRate: initialInflation,
    withdrawalRule: "4percent",
  });

  // Calculate results
  const results = useMemo(() => {
    const fiNumber = calculateFINumber(inputs.annualExpenses, inputs.withdrawalRule);
    const realReturn = inputs.expectedReturn - inputs.inflationRate;
    const yearsToFI = calculateYearsToFI(
      inputs.currentSavings,
      inputs.annualSavings,
      fiNumber,
      realReturn
    );
    const fiDate = calculateFIDate(yearsToFI);
    const progress = Math.min((inputs.currentSavings / fiNumber) * 100, 100);

    return {
      fiNumber,
      yearsToFI,
      fiDate,
      progress,
      realReturn,
    };
  }, [inputs]);

  // Format function for currency inputs
  const formatInputCurrency = (value: number) => `$${value.toLocaleString()}`;

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-3">
        <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-none">
          <CalendarDays className="h-3 w-3 mr-1" />
          Your Personal Independence Day
        </Badge>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          Financial Independence Calculator
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Calculate your FI number, see when you'll reach it, and explore what-if scenarios.
          FI is not just a number - it's the day work becomes optional.
        </p>
      </div>

      {/* Input Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Your Numbers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Age */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Age</label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[inputs.currentAge]}
                  onValueChange={(vals) =>
                    setInputs((prev) => ({ ...prev, currentAge: vals[0] }))
                  }
                  min={18}
                  max={70}
                  step={1}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-14 justify-center font-mono">
                  {inputs.currentAge}
                </Badge>
              </div>
            </div>

            {/* Annual Expenses */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Annual Expenses
                <InfoTooltip content="Your total yearly spending. This determines your FI number." />
              </label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[inputs.annualExpenses]}
                  onValueChange={(vals) =>
                    setInputs((prev) => ({ ...prev, annualExpenses: vals[0] }))
                  }
                  min={20000}
                  max={200000}
                  step={1000}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-20 justify-center font-mono text-xs">
                  {formatInputCurrency(inputs.annualExpenses)}
                </Badge>
              </div>
            </div>

            {/* Current Savings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Savings</label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[inputs.currentSavings]}
                  onValueChange={(vals) =>
                    setInputs((prev) => ({ ...prev, currentSavings: vals[0] }))
                  }
                  min={0}
                  max={2000000}
                  step={10000}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-20 justify-center font-mono text-xs">
                  {formatCurrency(inputs.currentSavings)}
                </Badge>
              </div>
            </div>

            {/* Annual Savings */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Annual Savings</label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[inputs.annualSavings]}
                  onValueChange={(vals) =>
                    setInputs((prev) => ({ ...prev, annualSavings: vals[0] }))
                  }
                  min={0}
                  max={150000}
                  step={1000}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-20 justify-center font-mono text-xs">
                  {formatInputCurrency(inputs.annualSavings)}
                </Badge>
              </div>
            </div>

            {/* Expected Return */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Expected Return
                <InfoTooltip content="Average annual investment return (before inflation)." />
              </label>
              <div className="flex items-center gap-2">
                <Slider
                  value={[inputs.expectedReturn]}
                  onValueChange={(vals) =>
                    setInputs((prev) => ({ ...prev, expectedReturn: vals[0] }))
                  }
                  min={3}
                  max={12}
                  step={0.5}
                  className="flex-1"
                />
                <Badge variant="outline" className="w-14 justify-center font-mono">
                  {inputs.expectedReturn}%
                </Badge>
              </div>
            </div>

            {/* Withdrawal Rule Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                Withdrawal Rule
                <InfoTooltip content="4% is classic (25x expenses). 3% is more conservative (33x expenses)." />
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    setInputs((prev) => ({ ...prev, withdrawalRule: "4percent" }))
                  }
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                    inputs.withdrawalRule === "4percent"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  4% Rule (25x)
                </button>
                <button
                  onClick={() =>
                    setInputs((prev) => ({ ...prev, withdrawalRule: "3percent" }))
                  }
                  className={cn(
                    "flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                    inputs.withdrawalRule === "3percent"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "hover:bg-muted"
                  )}
                >
                  3% Rule (33x)
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Results Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FINumberDisplay
          fiNumber={results.fiNumber}
          currentSavings={inputs.currentSavings}
          withdrawalRule={inputs.withdrawalRule}
        />
        <FIDateDisplay
          fiDate={results.fiDate}
          yearsToFI={results.yearsToFI}
          currentAge={inputs.currentAge}
        />
      </div>

      {/* Tabs for Additional Features */}
      <Tabs defaultValue="whatif" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="whatif" className="flex items-center gap-1.5 py-2.5">
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">What-If</span>
          </TabsTrigger>
          <TabsTrigger value="coast" className="flex items-center gap-1.5 py-2.5">
            <Sunset className="h-4 w-4" />
            <span className="hidden sm:inline">Coast FI</span>
          </TabsTrigger>
          <TabsTrigger value="mindset" className="flex items-center gap-1.5 py-2.5">
            <Heart className="h-4 w-4" />
            <span className="hidden sm:inline">Mindset</span>
          </TabsTrigger>
          <TabsTrigger value="celebrate" className="flex items-center gap-1.5 py-2.5">
            <PartyPopper className="h-4 w-4" />
            <span className="hidden sm:inline">Celebrate</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="whatif" className="mt-6">
          <WhatIfSliders
            inputs={inputs}
            baseYearsToFI={results.yearsToFI}
            baseFIDate={results.fiDate}
          />
        </TabsContent>

        <TabsContent value="coast" className="mt-6">
          <CoastFIDisplay inputs={inputs} />
        </TabsContent>

        <TabsContent value="mindset" className="mt-6">
          <FIMindset />
        </TabsContent>

        <TabsContent value="celebrate" className="mt-6">
          <CelebrationPlanner
            fiDate={results.fiDate}
            currentAge={inputs.currentAge}
            yearsToFI={results.yearsToFI}
          />
        </TabsContent>
      </Tabs>

      {/* Bottom Motivation */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Rocket className="h-10 w-10 mx-auto text-primary" />
            <h3 className="text-xl font-semibold">Every Day Gets You Closer</h3>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Financial Independence isn't just about the destination - it's about the freedom
              you're building with every dollar saved. Your FI Day is coming. Keep going.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>
                {results.yearsToFI > 0
                  ? `${formatCountdown(results.yearsToFI).years} years, ${formatCountdown(results.yearsToFI).months} months to go`
                  : "You've arrived!"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default FIDay;
