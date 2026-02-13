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
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Rocket,
  Trophy,
  Calendar,
  TrendingUp,
  DollarSign,
  Clock,
  Sparkles,
  Star,
  Crown,
  Zap,
  AlertCircle,
  CheckCircle2,
  Gift,
  Heart,
  Target,
  ArrowRight,
  Info,
  Bell,
  ChevronDown,
  ChevronUp,
  Calculator,
  PartyPopper,
} from "lucide-react";
import {
  RETIREMENT_LIMITS_2026,
  HSA_LIMITS_2026,
} from "@/lib/constants/tax2026";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface CatchUpContributionsProps {
  /** User's current age */
  age: number;
  /** User's annual income */
  income?: number;
  /** Whether user is married */
  isMarried?: boolean;
  /** Whether user has HSA-eligible health plan */
  hasHSA?: boolean;
  /** Current 401k contribution (annual) */
  current401k?: number;
  /** Current IRA contribution (annual) */
  currentIRA?: number;
  /** Current HSA contribution (annual) */
  currentHSA?: number;
  /** Whether user has SIMPLE IRA instead of 401k */
  hasSIMPLE?: boolean;
  /** Expected annual return rate */
  expectedReturn?: number;
  /** Target retirement age */
  retirementAge?: number;
  /** Callback when settings change */
  onSettingsChange?: (settings: CatchUpSettings) => void;
}

interface CatchUpSettings {
  maximize401k: boolean;
  maximizeIRA: boolean;
  maximizeHSA: boolean;
}

interface CatchUpMilestone {
  age: number;
  title: string;
  description: string;
  accounts: AccountCatchUp[];
  isGolden?: boolean;
  icon: React.ReactNode;
  color: string;
}

interface AccountCatchUp {
  name: string;
  regularLimit: number;
  catchUpAmount: number;
  totalLimit: number;
  note?: string;
}

interface ProjectedImpact {
  totalCatchUpContributions: number;
  projectedGrowth: number;
  totalAtRetirement: number;
  yearsOfCatchUp: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// 2026 IRS Limits (from tax2026.ts)
const LIMITS = {
  // 401k
  "401k_base": RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT,         // $24,500
  "401k_catchup_50": RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS,          // $8,000
  "401k_catchup_60_63": RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63,      // $11,250

  // IRA
  "ira_base": RETIREMENT_LIMITS_2026.IRA_LIMIT,                       // $7,500
  "ira_catchup_50": RETIREMENT_LIMITS_2026.IRA_CATCHUP_50_PLUS,       // $1,100

  // SIMPLE IRA
  "simple_base": RETIREMENT_LIMITS_2026.SIMPLE_LIMIT,                 // $17,000
  "simple_catchup_50": RETIREMENT_LIMITS_2026.SIMPLE_CATCHUP_50_PLUS, // $4,000
  "simple_catchup_60_63": RETIREMENT_LIMITS_2026.SIMPLE_CATCHUP_60_TO_63, // $5,250

  // HSA
  "hsa_self": HSA_LIMITS_2026.SELF_ONLY,                              // $4,400
  "hsa_family": HSA_LIMITS_2026.FAMILY,                               // $8,750
  "hsa_catchup_55": HSA_LIMITS_2026.CATCHUP_55_PLUS,                  // $1,000

  // SECURE 2.0 Roth catch-up requirement threshold
  "roth_catchup_threshold": RETIREMENT_LIMITS_2026.ROTH_CATCHUP_INCOME_THRESHOLD, // $150,000
};

// Expected growth rate for projections
const DEFAULT_RETURN = 0.07;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number, compact: boolean = false): string {
  if (compact && Math.abs(value) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function calculateFutureValue(
  annualContribution: number,
  years: number,
  rate: number = DEFAULT_RETURN
): number {
  if (rate === 0 || years <= 0) return annualContribution * Math.max(years, 0);
  return annualContribution * ((Math.pow(1 + rate, years) - 1) / rate) * (1 + rate);
}

function getYearsUntil(currentAge: number, targetAge: number): number {
  return Math.max(0, targetAge - currentAge);
}

function getCatchUpMilestones(hasSIMPLE: boolean, isMarried: boolean): CatchUpMilestone[] {
  const milestones: CatchUpMilestone[] = [
    {
      age: 50,
      title: "The 50 Club",
      description: "Your first catch-up opportunity - time to accelerate!",
      icon: <Rocket className="h-5 w-5" />,
      color: "blue",
      accounts: hasSIMPLE
        ? [
            {
              name: "SIMPLE IRA",
              regularLimit: LIMITS.simple_base,
              catchUpAmount: LIMITS.simple_catchup_50,
              totalLimit: LIMITS.simple_base + LIMITS.simple_catchup_50,
            },
            {
              name: "IRA",
              regularLimit: LIMITS.ira_base,
              catchUpAmount: LIMITS.ira_catchup_50,
              totalLimit: LIMITS.ira_base + LIMITS.ira_catchup_50,
            },
          ]
        : [
            {
              name: "401(k)",
              regularLimit: LIMITS["401k_base"],
              catchUpAmount: LIMITS["401k_catchup_50"],
              totalLimit: LIMITS["401k_base"] + LIMITS["401k_catchup_50"],
            },
            {
              name: "IRA",
              regularLimit: LIMITS.ira_base,
              catchUpAmount: LIMITS.ira_catchup_50,
              totalLimit: LIMITS.ira_base + LIMITS.ira_catchup_50,
            },
          ],
    },
    {
      age: 55,
      title: "HSA Bonus Year",
      description: "Triple tax-advantaged catch-up contributions unlock!",
      icon: <Heart className="h-5 w-5" />,
      color: "rose",
      accounts: [
        {
          name: "HSA",
          regularLimit: isMarried ? LIMITS.hsa_family : LIMITS.hsa_self,
          catchUpAmount: LIMITS.hsa_catchup_55,
          totalLimit: (isMarried ? LIMITS.hsa_family : LIMITS.hsa_self) + LIMITS.hsa_catchup_55,
          note: "Triple tax-free: deductible, grows tax-free, withdrawals tax-free for healthcare",
        },
      ],
    },
    {
      age: 60,
      title: "SUPER Catch-Up Era",
      description: "The GOLDEN years - SECURE 2.0 unlocks maximum contributions!",
      icon: <Crown className="h-5 w-5" />,
      color: "amber",
      isGolden: true,
      accounts: hasSIMPLE
        ? [
            {
              name: "SIMPLE IRA",
              regularLimit: LIMITS.simple_base,
              catchUpAmount: LIMITS.simple_catchup_60_63,
              totalLimit: LIMITS.simple_base + LIMITS.simple_catchup_60_63,
              note: "SECURE 2.0 super catch-up: 150% of regular catch-up!",
            },
          ]
        : [
            {
              name: "401(k)",
              regularLimit: LIMITS["401k_base"],
              catchUpAmount: LIMITS["401k_catchup_60_63"],
              totalLimit: LIMITS["401k_base"] + LIMITS["401k_catchup_60_63"],
              note: "SECURE 2.0 super catch-up: $11,250 instead of $8,000!",
            },
          ],
    },
  ];

  return milestones;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface CountdownCardProps {
  currentAge: number;
  targetAge: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  isActive?: boolean;
  isGolden?: boolean;
}

const CountdownCard: React.FC<CountdownCardProps> = ({
  currentAge,
  targetAge,
  title,
  description,
  icon,
  color,
  isActive,
  isGolden,
}) => {
  const yearsUntil = getYearsUntil(currentAge, targetAge);
  const isPast = currentAge >= targetAge;

  const colorClasses = {
    blue: {
      bg: "bg-blue-50 dark:bg-blue-950/30",
      border: "border-blue-200 dark:border-blue-800",
      text: "text-blue-700 dark:text-blue-300",
      icon: "text-blue-600",
      badge: "bg-blue-100 text-blue-700 border-blue-200",
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      border: "border-rose-200 dark:border-rose-800",
      text: "text-rose-700 dark:text-rose-300",
      icon: "text-rose-600",
      badge: "bg-rose-100 text-rose-700 border-rose-200",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-300",
      icon: "text-amber-600",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
    },
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-300",
      icon: "text-emerald-600",
      badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    },
  };

  const colors = colorClasses[color as keyof typeof colorClasses] || colorClasses.blue;

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border-2 transition-all duration-300",
        colors.bg,
        colors.border,
        isActive && "ring-2 ring-offset-2",
        isActive && color === "blue" && "ring-blue-500",
        isActive && color === "rose" && "ring-rose-500",
        isActive && color === "amber" && "ring-amber-500",
        isGolden && "shadow-lg shadow-amber-200/50 dark:shadow-amber-900/30"
      )}
    >
      {isGolden && (
        <div className="absolute -top-2 -right-2">
          <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0 shadow-lg">
            <Sparkles className="h-3 w-3 mr-1" />
            GOLDEN
          </Badge>
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-lg", colors.bg, colors.icon)}>
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-lg">{title}</span>
            <Badge variant="outline" className={colors.badge}>
              Age {targetAge}
            </Badge>
          </div>
          <p className={cn("text-sm", colors.text)}>{description}</p>

          {/* Countdown or Status */}
          <div className="mt-3">
            {isPast ? (
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">
                  {isActive ? "Currently Active!" : "Unlocked!"}
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  <strong className={colors.text}>{yearsUntil} year{yearsUntil !== 1 ? "s" : ""}</strong> until unlocked
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface TimelineProps {
  currentAge: number;
  milestones: CatchUpMilestone[];
  retirementAge: number;
}

const VisualTimeline: React.FC<TimelineProps> = ({
  currentAge,
  milestones,
  retirementAge,
}) => {
  const startAge = Math.min(currentAge, 45);
  const endAge = Math.max(retirementAge, 67);
  const totalYears = endAge - startAge;

  const getPositionPercent = (age: number) => {
    return ((age - startAge) / totalYears) * 100;
  };

  return (
    <div className="relative py-8">
      {/* Timeline bar */}
      <div className="relative h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        {/* Progress fill */}
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 via-purple-500 to-amber-500 rounded-full transition-all duration-500"
          style={{ width: `${getPositionPercent(currentAge)}%` }}
        />

        {/* Golden zone (60-63) */}
        <div
          className="absolute h-full bg-gradient-to-r from-amber-400/30 to-yellow-400/30"
          style={{
            left: `${getPositionPercent(60)}%`,
            width: `${getPositionPercent(64) - getPositionPercent(60)}%`,
          }}
        />
      </div>

      {/* Current age marker */}
      <div
        className="absolute top-0 transform -translate-x-1/2"
        style={{ left: `${getPositionPercent(currentAge)}%` }}
      >
        <div className="relative">
          <div className="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg animate-pulse" />
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
            <Badge className="bg-blue-600 text-white text-xs">You: {currentAge}</Badge>
          </div>
        </div>
      </div>

      {/* Milestone markers */}
      {milestones.map((milestone) => {
        const isUnlocked = currentAge >= milestone.age;
        const isActive = milestone.age === 60
          ? currentAge >= 60 && currentAge <= 63
          : currentAge >= milestone.age;

        return (
          <TooltipProvider key={milestone.age}>
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute top-0 transform -translate-x-1/2 cursor-pointer"
                  style={{ left: `${getPositionPercent(milestone.age)}%` }}
                >
                  <div
                    className={cn(
                      "w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-all",
                      isUnlocked
                        ? milestone.isGolden
                          ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                          : "bg-emerald-500"
                        : "bg-slate-400",
                      isActive && "ring-2 ring-offset-1 ring-emerald-400"
                    )}
                  >
                    {isUnlocked ? (
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    ) : (
                      <span className="text-[10px] font-bold text-white">{milestone.age}</span>
                    )}
                  </div>
                  <div className="absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                    <span className="text-xs font-medium text-muted-foreground">{milestone.age}</span>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-semibold">{milestone.title}</p>
                <p className="text-xs text-muted-foreground">{milestone.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}

      {/* Retirement marker */}
      <div
        className="absolute top-0 transform -translate-x-1/2"
        style={{ left: `${getPositionPercent(retirementAge)}%` }}
      >
        <div className="w-6 h-6 bg-purple-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <Target className="h-3 w-3 text-white" />
        </div>
        <div className="absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
          <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
            Retire: {retirementAge}
          </Badge>
        </div>
      </div>
    </div>
  );
};

interface ImpactCalculatorProps {
  currentAge: number;
  retirementAge: number;
  hasSIMPLE: boolean;
  hasHSA: boolean;
  isMarried: boolean;
  expectedReturn: number;
}

const ImpactCalculator: React.FC<ImpactCalculatorProps> = ({
  currentAge,
  retirementAge,
  hasSIMPLE,
  hasHSA,
  isMarried,
  expectedReturn,
}) => {
  const impact = useMemo((): ProjectedImpact => {
    let totalContributions = 0;
    let totalWithGrowth = 0;
    let yearsOfCatchUp = 0;

    // Calculate for each catch-up period
    const ageRanges = [
      { start: 50, end: 54, accounts: ["401k_50", "ira_50"] },
      { start: 55, end: 59, accounts: ["401k_50", "ira_50", "hsa_55"] },
      { start: 60, end: 63, accounts: ["401k_60_63", "ira_50", "hsa_55"] },
      { start: 64, end: retirementAge - 1, accounts: ["401k_50", "ira_50", "hsa_55"] },
    ];

    for (const range of ageRanges) {
      const startYear = Math.max(range.start, currentAge);
      const endYear = Math.min(range.end, retirementAge - 1);

      if (startYear > endYear) continue;

      for (let age = startYear; age <= endYear; age++) {
        const yearsToRetirement = retirementAge - age;
        let annualCatchUp = 0;

        for (const account of range.accounts) {
          if (account === "401k_50" && !hasSIMPLE && age >= 50) {
            annualCatchUp += LIMITS["401k_catchup_50"];
          } else if (account === "401k_60_63" && !hasSIMPLE && age >= 60 && age <= 63) {
            annualCatchUp += LIMITS["401k_catchup_60_63"];
          } else if (account === "ira_50" && age >= 50) {
            annualCatchUp += LIMITS.ira_catchup_50;
          } else if (account === "hsa_55" && hasHSA && age >= 55) {
            annualCatchUp += LIMITS.hsa_catchup_55;
          }
          // SIMPLE IRA catch-ups
          if (account === "401k_50" && hasSIMPLE && age >= 50 && age < 60) {
            annualCatchUp += LIMITS.simple_catchup_50;
          } else if (account === "401k_60_63" && hasSIMPLE && age >= 60 && age <= 63) {
            annualCatchUp += LIMITS.simple_catchup_60_63;
          }
        }

        if (annualCatchUp > 0) {
          totalContributions += annualCatchUp;
          // Calculate growth for this year's contribution
          const growthFactor = Math.pow(1 + expectedReturn, yearsToRetirement);
          totalWithGrowth += annualCatchUp * growthFactor;
          yearsOfCatchUp++;
        }
      }
    }

    return {
      totalCatchUpContributions: totalContributions,
      projectedGrowth: totalWithGrowth - totalContributions,
      totalAtRetirement: totalWithGrowth,
      yearsOfCatchUp,
    };
  }, [currentAge, retirementAge, hasSIMPLE, hasHSA, expectedReturn]);

  if (currentAge >= retirementAge || impact.totalCatchUpContributions === 0) {
    return null;
  }

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-emerald-600" />
          <CardTitle className="text-lg">Catch-Up Impact Calculator</CardTitle>
        </div>
        <CardDescription>
          See how much extra you could save from age {Math.max(currentAge, 50)} to {retirementAge}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main impact number */}
        <div className="text-center p-6 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-1">
            Catch-up contributions add
          </p>
          <p className="text-5xl font-bold text-emerald-700 dark:text-emerald-300">
            {formatCurrency(impact.totalAtRetirement, true)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            to your retirement by age {retirementAge}
          </p>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <DollarSign className="h-5 w-5 text-blue-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-blue-700 dark:text-blue-300">
              {formatCurrency(impact.totalCatchUpContributions, true)}
            </p>
            <p className="text-xs text-muted-foreground">Total Contributions</p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <TrendingUp className="h-5 w-5 text-purple-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-purple-700 dark:text-purple-300">
              {formatCurrency(impact.projectedGrowth, true)}
            </p>
            <p className="text-xs text-muted-foreground">Investment Growth</p>
          </div>
          <div className="text-center p-3 bg-white dark:bg-slate-900 rounded-lg">
            <Calendar className="h-5 w-5 text-amber-600 mx-auto mb-1" />
            <p className="text-xl font-bold text-amber-700 dark:text-amber-300">
              {impact.yearsOfCatchUp}
            </p>
            <p className="text-xs text-muted-foreground">Years of Catch-Up</p>
          </div>
        </div>

        {/* Annual breakdown */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">Annual Catch-Up Limits</p>
          <div className="space-y-2">
            {currentAge < 50 && (
              <div className="flex justify-between items-center text-sm p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                <span>Ages 50-54</span>
                <span className="font-semibold">
                  +{formatCurrency(
                    (hasSIMPLE ? LIMITS.simple_catchup_50 : LIMITS["401k_catchup_50"]) +
                    LIMITS.ira_catchup_50
                  )}/year
                </span>
              </div>
            )}
            {currentAge < 55 && (
              <div className="flex justify-between items-center text-sm p-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg">
                <span>Ages 55-59 (+ HSA)</span>
                <span className="font-semibold">
                  +{formatCurrency(
                    (hasSIMPLE ? LIMITS.simple_catchup_50 : LIMITS["401k_catchup_50"]) +
                    LIMITS.ira_catchup_50 +
                    (hasHSA ? LIMITS.hsa_catchup_55 : 0)
                  )}/year
                </span>
              </div>
            )}
            {currentAge < 64 && (
              <div className="flex justify-between items-center text-sm p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border-2 border-amber-200 dark:border-amber-800">
                <span className="flex items-center gap-1">
                  <Crown className="h-4 w-4 text-amber-600" />
                  Ages 60-63 (GOLDEN)
                </span>
                <span className="font-bold text-amber-700 dark:text-amber-300">
                  +{formatCurrency(
                    (hasSIMPLE ? LIMITS.simple_catchup_60_63 : LIMITS["401k_catchup_60_63"]) +
                    LIMITS.ira_catchup_50 +
                    (hasHSA ? LIMITS.hsa_catchup_55 : 0)
                  )}/year
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Motivation */}
        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
          <p className="text-sm text-emerald-800 dark:text-emerald-200 text-center">
            <Sparkles className="inline h-4 w-4 mr-1" />
            That's <strong>{formatCurrency(impact.totalAtRetirement / (retirementAge - 65 + 20))}/year</strong> extra
            in retirement income (assuming 20 years of withdrawals)!
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface NotificationBannerProps {
  currentAge: number;
  nextMilestoneAge: number;
  milestoneName: string;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({
  currentAge,
  nextMilestoneAge,
  milestoneName,
}) => {
  const yearsUntil = nextMilestoneAge - currentAge;

  if (yearsUntil <= 0 || yearsUntil > 5) return null;

  const urgencyColor = yearsUntil <= 1 ? "amber" : yearsUntil <= 2 ? "blue" : "slate";

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2",
        urgencyColor === "amber" && "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800",
        urgencyColor === "blue" && "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800",
        urgencyColor === "slate" && "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800"
      )}
    >
      <div className={cn(
        "p-2 rounded-full",
        urgencyColor === "amber" && "bg-amber-100 dark:bg-amber-900",
        urgencyColor === "blue" && "bg-blue-100 dark:bg-blue-900",
        urgencyColor === "slate" && "bg-slate-100 dark:bg-slate-800"
      )}>
        <Bell className={cn(
          "h-5 w-5",
          urgencyColor === "amber" && "text-amber-600 animate-pulse",
          urgencyColor === "blue" && "text-blue-600",
          urgencyColor === "slate" && "text-slate-600"
        )} />
      </div>
      <div className="flex-1">
        <p className={cn(
          "font-semibold",
          urgencyColor === "amber" && "text-amber-800 dark:text-amber-200",
          urgencyColor === "blue" && "text-blue-800 dark:text-blue-200",
          urgencyColor === "slate" && "text-slate-800 dark:text-slate-200"
        )}>
          {yearsUntil === 1
            ? `You turn ${nextMilestoneAge} next year!`
            : `You turn ${nextMilestoneAge} in ${yearsUntil} years`}
        </p>
        <p className="text-sm text-muted-foreground">
          Start planning for {milestoneName} - increased contribution limits are coming!
        </p>
      </div>
      <ArrowRight className={cn(
        "h-5 w-5",
        urgencyColor === "amber" && "text-amber-600",
        urgencyColor === "blue" && "text-blue-600",
        urgencyColor === "slate" && "text-slate-600"
      )} />
    </div>
  );
};

interface RothCatchUpAlertProps {
  income: number;
  age: number;
}

const RothCatchUpAlert: React.FC<RothCatchUpAlertProps> = ({ income, age }) => {
  const isHighEarner = income >= LIMITS.roth_catchup_threshold;
  const isEligibleForCatchUp = age >= 50;

  if (!isHighEarner || !isEligibleForCatchUp) return null;

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Gift className="h-5 w-5 text-purple-600" />
          <CardTitle className="text-lg">Roth Catch-Up Requirement</CardTitle>
          <Badge className="bg-purple-100 text-purple-700 border-purple-200">SECURE 2.0</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-purple-800 dark:text-purple-200">
                As a high earner ({formatCurrency(income)}+), your catch-up contributions
                must be made as Roth starting in 2026.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-emerald-800 dark:text-emerald-200 mb-2">
                This is actually GOOD news!
              </p>
              <ul className="text-sm text-emerald-700 dark:text-emerald-300 space-y-1">
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tax-free growth on your catch-up contributions forever</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>No RMDs on Roth 401(k) balances (SECURE 2.0 change)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tax-free withdrawals in retirement when you might be in a higher bracket</span>
                </li>
                <li className="flex items-start gap-2">
                  <Star className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Tax diversification protects against future tax rate increases</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Threshold: {formatCurrency(LIMITS.roth_catchup_threshold)} in FICA wages (prior year)
        </p>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const CatchUpContributions = React.memo(function CatchUpContributions({
  age,
  income = 100000,
  isMarried = false,
  hasHSA = false,
  current401k = 0,
  currentIRA = 0,
  currentHSA = 0,
  hasSIMPLE = false,
  expectedReturn = DEFAULT_RETURN,
  retirementAge = 65,
  onSettingsChange,
}: CatchUpContributionsProps) {
  const [expandedMilestones, setExpandedMilestones] = useState(true);
  const [showAllMilestones, setShowAllMilestones] = useState(false);

  // Get milestones based on user situation
  const milestones = useMemo(
    () => getCatchUpMilestones(hasSIMPLE, isMarried),
    [hasSIMPLE, isMarried]
  );

  // Find next upcoming milestone
  const nextMilestone = useMemo(
    () => milestones.find((m) => m.age > age) || null,
    [milestones, age]
  );

  // Determine current catch-up status
  const currentCatchUpStatus = useMemo(() => {
    if (age >= 60 && age <= 63) return "super";
    if (age >= 55) return "hsa";
    if (age >= 50) return "standard";
    return "none";
  }, [age]);

  // Calculate what user is currently eligible for
  const currentEligibility = useMemo(() => {
    const eligible: { account: string; catchUp: number; total: number }[] = [];

    if (age >= 50) {
      if (hasSIMPLE) {
        const catchUp = age >= 60 && age <= 63 ? LIMITS.simple_catchup_60_63 : LIMITS.simple_catchup_50;
        eligible.push({
          account: "SIMPLE IRA",
          catchUp,
          total: LIMITS.simple_base + catchUp,
        });
      } else {
        const catchUp = age >= 60 && age <= 63 ? LIMITS["401k_catchup_60_63"] : LIMITS["401k_catchup_50"];
        eligible.push({
          account: "401(k)",
          catchUp,
          total: LIMITS["401k_base"] + catchUp,
        });
      }

      eligible.push({
        account: "IRA",
        catchUp: LIMITS.ira_catchup_50,
        total: LIMITS.ira_base + LIMITS.ira_catchup_50,
      });
    }

    if (age >= 55 && hasHSA) {
      eligible.push({
        account: "HSA",
        catchUp: LIMITS.hsa_catchup_55,
        total: (isMarried ? LIMITS.hsa_family : LIMITS.hsa_self) + LIMITS.hsa_catchup_55,
      });
    }

    return eligible;
  }, [age, hasSIMPLE, hasHSA, isMarried]);

  const totalAnnualCatchUp = useMemo(
    () => currentEligibility.reduce((sum, e) => sum + e.catchUp, 0),
    [currentEligibility]
  );

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg">
                <Rocket className="h-6 w-6 text-white" />
              </div>
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  Catch-Up Contribution Optimizer
                  {currentCatchUpStatus === "super" && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-yellow-500 text-white border-0">
                      <Crown className="h-3 w-3 mr-1" />
                      GOLDEN ERA
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-base">
                  Age 50+ is an opportunity, not a milestone of aging
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Current status banner */}
        {age >= 50 ? (
          <div className="px-6 pb-6">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <PartyPopper className="h-5 w-5 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                    You're Catch-Up Eligible!
                  </span>
                </div>
                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-lg px-3">
                  +{formatCurrency(totalAnnualCatchUp)}/year
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {currentEligibility.map((item) => (
                  <div
                    key={item.account}
                    className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg"
                  >
                    <span className="text-sm font-medium">{item.account}</span>
                    <div className="text-right">
                      <span className="text-sm font-bold text-emerald-700 dark:text-emerald-300">
                        +{formatCurrency(item.catchUp)}
                      </span>
                      <span className="text-xs text-muted-foreground block">
                        Total: {formatCurrency(item.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 pb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-semibold text-blue-800 dark:text-blue-200">
                    {50 - age} year{50 - age !== 1 ? "s" : ""} until catch-up eligibility
                  </p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    Plan ahead - catch-up contributions can add significant wealth!
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Notification Banner */}
      {nextMilestone && (
        <NotificationBanner
          currentAge={age}
          nextMilestoneAge={nextMilestone.age}
          milestoneName={nextMilestone.title}
        />
      )}

      {/* Visual Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Your Catch-Up Timeline</CardTitle>
          </div>
          <CardDescription>
            Track your journey through catch-up eligibility milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VisualTimeline
            currentAge={age}
            milestones={milestones}
            retirementAge={retirementAge}
          />
        </CardContent>
      </Card>

      {/* Age-Based Opportunities */}
      <Card>
        <CardHeader
          className="cursor-pointer"
          onClick={() => setExpandedMilestones(!expandedMilestones)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-600" />
              <CardTitle className="text-lg">Age-Based Opportunities</CardTitle>
            </div>
            {expandedMilestones ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <CardDescription>
            Unlock higher contribution limits as you reach key ages
          </CardDescription>
        </CardHeader>
        {expandedMilestones && (
          <CardContent className="space-y-4">
            {milestones
              .filter((m) => showAllMilestones || m.age >= age - 5)
              .map((milestone) => {
                const isActive = age >= milestone.age && (
                  milestone.age !== 60 || (age >= 60 && age <= 63)
                );
                const inGoldenWindow = milestone.age === 60 && age >= 60 && age <= 63;

                return (
                  <div key={milestone.age} className="space-y-3">
                    <CountdownCard
                      currentAge={age}
                      targetAge={milestone.age}
                      title={milestone.title}
                      description={milestone.description}
                      icon={milestone.icon}
                      color={milestone.color}
                      isActive={isActive}
                      isGolden={milestone.isGolden && inGoldenWindow}
                    />

                    {/* Show account details if unlocked */}
                    {age >= milestone.age && (
                      <div className="ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700 space-y-2">
                        {milestone.accounts.map((account) => (
                          <div
                            key={account.name}
                            className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{account.name}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                  {formatCurrency(account.regularLimit)}
                                </span>
                                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                                <span className="font-bold text-emerald-600">
                                  {formatCurrency(account.totalLimit)}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-emerald-600">
                                +{formatCurrency(account.catchUpAmount)} catch-up
                              </span>
                              {account.note && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Info className="h-4 w-4 text-muted-foreground" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      {account.note}
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

            {!showAllMilestones && age > 55 && (
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowAllMilestones(true)}
              >
                Show all milestones
              </Button>
            )}
          </CardContent>
        )}
      </Card>

      {/* Impact Calculator */}
      {age < retirementAge && (
        <ImpactCalculator
          currentAge={age}
          retirementAge={retirementAge}
          hasSIMPLE={hasSIMPLE}
          hasHSA={hasHSA}
          isMarried={isMarried}
          expectedReturn={expectedReturn}
        />
      )}

      {/* Roth Catch-Up Requirement (SECURE 2.0) */}
      <RothCatchUpAlert income={income} age={age} />

      {/* Educational Footer */}
      <Card className="bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <Info className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
                Why Catch-Up Contributions Matter
              </h4>
              <ul className="text-sm text-indigo-800 dark:text-indigo-200 space-y-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                  <span>
                    <strong>Compound growth accelerator:</strong> Extra contributions in your 50s and 60s
                    still have 15-30+ years to grow (including in retirement)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                  <span>
                    <strong>Peak earning years:</strong> Most people earn the most in their 50s -
                    capture this with higher contribution limits
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                  <span>
                    <strong>SECURE 2.0 super catch-up:</strong> Ages 60-63 get an even higher limit -
                    Congress wants you to save more!
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 mt-0.5 flex-shrink-0 text-indigo-600" />
                  <span>
                    <strong>Tax efficiency:</strong> Reduce taxable income now or build tax-free Roth wealth -
                    catch-ups give you flexibility
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

CatchUpContributions.displayName = "CatchUpContributions";

export default CatchUpContributions;
