"use client";

import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  TrendingUp,
  DollarSign,
  Calendar,
  Target,
  Lightbulb,
  ArrowRight,
  CheckCircle2,
  Info,
  Zap,
  PiggyBank,
  BarChart3,
  Clock,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
  LabelList,
} from "recharts";
import {
  TAX_BRACKETS,
  LTCG_BRACKETS,
  RMD_START_AGE,
  getCurrYear,
} from "@/lib/constants";
import type { FilingStatus } from "@/types/calculator";

// =====================================================
// Types
// =====================================================

interface BracketFillerProps {
  // User profile
  currentAge: number;
  retirementAge: number;
  maritalStatus: FilingStatus;

  // Income projection
  currentIncome: number;
  projectedRetirementIncome?: number;
  socialSecurityIncome?: number;
  ssClaimAge?: number;

  // Account balances
  pretaxBalance: number;
  rothBalance: number;
  taxableBalance: number;
  taxableUnrealizedGains?: number;

  // Rates
  returnRate?: number;
  inflationRate?: number;
  stateRate?: number;

  // Special years (low income opportunities)
  plannedSabbaticalYears?: number[];
  plannedGapYears?: number[];
}

interface BracketInfo {
  rate: number;
  limit: number;
  previousLimit: number;
  spaceUsed: number;
  spaceRemaining: number;
  isCurrentBracket: boolean;
}

interface YearlyOpportunity {
  year: number;
  age: number;
  projectedIncome: number;
  bracketRoom: number;
  targetBracket: number;
  recommendedConversion: number;
  ltcgRoom: number;
  opportunityType: "roth-conversion" | "capital-gains" | "both" | "none";
  isPrimeYear: boolean;
  reason: string;
}

interface ActionItem {
  year: number;
  age: number;
  action: string;
  amount: number;
  taxSavings: number;
  priority: "high" | "medium" | "low";
  type: "roth" | "ltcg" | "iso" | "income";
}

// =====================================================
// Helper Functions
// =====================================================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value.toFixed(0)}`;
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function analyzeBrackets(
  income: number,
  status: FilingStatus
): { brackets: BracketInfo[]; currentBracketIndex: number; taxableIncome: number } {
  const bracketConfig = TAX_BRACKETS[status];
  const deduction = bracketConfig.deduction;
  const taxableIncome = Math.max(0, income - deduction);

  const brackets: BracketInfo[] = [];
  let previousLimit = 0;
  let currentBracketIndex = 0;

  for (let i = 0; i < bracketConfig.rates.length; i++) {
    const bracket = bracketConfig.rates[i];
    const bracketSize = bracket.limit - previousLimit;
    const incomeInBracket = Math.max(
      0,
      Math.min(taxableIncome - previousLimit, bracketSize)
    );
    const spaceRemaining = Math.max(0, bracketSize - incomeInBracket);
    const isCurrentBracket =
      taxableIncome > previousLimit && taxableIncome <= bracket.limit;

    if (isCurrentBracket) {
      currentBracketIndex = i;
    }

    brackets.push({
      rate: bracket.rate * 100,
      limit: bracket.limit,
      previousLimit,
      spaceUsed: incomeInBracket,
      spaceRemaining,
      isCurrentBracket,
    });

    previousLimit = bracket.limit;
  }

  return { brackets, currentBracketIndex, taxableIncome };
}

function getLTCGZeroBracketLimit(status: FilingStatus): number {
  return LTCG_BRACKETS[status][0].limit;
}

function projectYearlyOpportunities(
  props: BracketFillerProps
): YearlyOpportunity[] {
  const {
    currentAge,
    retirementAge,
    maritalStatus,
    currentIncome,
    projectedRetirementIncome = 0,
    socialSecurityIncome = 0,
    ssClaimAge = 67,
    pretaxBalance,
    returnRate = 7,
    plannedSabbaticalYears = [],
    plannedGapYears = [],
  } = props;

  const currentYear = getCurrYear();
  const opportunities: YearlyOpportunity[] = [];
  const growthRate = 1 + returnRate / 100;
  const brackets = TAX_BRACKETS[maritalStatus];
  const ltcgZeroLimit = getLTCGZeroBracketLimit(maritalStatus);

  // Project from current age to RMD start age
  for (let age = currentAge; age <= Math.max(RMD_START_AGE, retirementAge + 10); age++) {
    const year = currentYear + (age - currentAge);
    const isRetired = age >= retirementAge;
    const isBeforeRMD = age < RMD_START_AGE;
    const isBeforeSS = age < ssClaimAge;
    const isSabbatical = plannedSabbaticalYears.includes(year);
    const isGapYear = plannedGapYears.includes(year);

    // Project income for this year
    let projectedIncome = 0;
    if (!isRetired && !isSabbatical && !isGapYear) {
      projectedIncome = currentIncome;
    } else if (isRetired) {
      projectedIncome = projectedRetirementIncome;
      if (age >= ssClaimAge) {
        projectedIncome += socialSecurityIncome * 0.85; // 85% taxable
      }
    }

    // Calculate bracket room
    const taxableIncome = Math.max(0, projectedIncome - brackets.deduction);
    let bracketRoom = 0;
    let targetBracket = 0;

    // Find room in 12% or 22% bracket
    const rate12Limit = brackets.rates[1].limit;
    const rate22Limit = brackets.rates[2].limit;

    if (taxableIncome < rate22Limit) {
      bracketRoom = rate22Limit - taxableIncome;
      targetBracket = 22;
    }
    if (taxableIncome < rate12Limit) {
      bracketRoom = rate12Limit - taxableIncome;
      targetBracket = 12;
    }

    // Calculate LTCG room (0% bracket)
    const ltcgRoom = Math.max(0, ltcgZeroLimit - projectedIncome);

    // Determine if this is a prime year
    const isPrimeYear =
      (isRetired && isBeforeRMD && isBeforeSS) ||
      isSabbatical ||
      isGapYear ||
      (isRetired && projectedIncome < brackets.deduction + rate12Limit);

    // Determine opportunity type
    let opportunityType: YearlyOpportunity["opportunityType"] = "none";
    if (bracketRoom > 10000 && ltcgRoom > 10000) {
      opportunityType = "both";
    } else if (bracketRoom > 10000) {
      opportunityType = "roth-conversion";
    } else if (ltcgRoom > 10000) {
      opportunityType = "capital-gains";
    }

    // Calculate recommended conversion
    const yearsOfGrowth = Math.max(0, retirementAge - currentAge);
    const projectedPretax = pretaxBalance * Math.pow(growthRate, age - currentAge);
    const recommendedConversion = Math.min(bracketRoom, projectedPretax * 0.1);

    // Build reason
    let reason = "";
    if (isSabbatical) {
      reason = "Sabbatical year - income is low";
    } else if (isGapYear) {
      reason = "Gap year - no employment income";
    } else if (isRetired && isBeforeRMD && isBeforeSS) {
      reason = "Retirement corridor - before SS and RMDs";
    } else if (isRetired && isBeforeSS) {
      reason = "Before Social Security starts";
    } else if (isRetired && isBeforeRMD) {
      reason = "Before RMDs force distributions";
    } else if (!isRetired) {
      reason = "Working years - income fills brackets";
    }

    opportunities.push({
      year,
      age,
      projectedIncome,
      bracketRoom,
      targetBracket,
      recommendedConversion,
      ltcgRoom,
      opportunityType,
      isPrimeYear,
      reason,
    });
  }

  return opportunities;
}

function generateActionItems(
  opportunities: YearlyOpportunity[],
  props: BracketFillerProps
): ActionItem[] {
  const actions: ActionItem[] = [];
  const { taxableUnrealizedGains = 0, stateRate = 0 } = props;

  // Find prime years and generate actions
  const primeYears = opportunities.filter((o) => o.isPrimeYear);

  for (const opp of primeYears) {
    // Roth conversion opportunity
    if (opp.bracketRoom > 10000) {
      const conversionAmount = Math.min(opp.bracketRoom, opp.recommendedConversion);
      const taxAtCurrentBracket = conversionAmount * (opp.targetBracket / 100);
      const taxAtFutureBracket = conversionAmount * 0.32; // Assume 32% if forced by RMDs
      const savings = taxAtFutureBracket - taxAtCurrentBracket;

      if (conversionAmount > 5000) {
        actions.push({
          year: opp.year,
          age: opp.age,
          action: `Convert ${formatCurrency(conversionAmount)} to Roth`,
          amount: conversionAmount,
          taxSavings: savings,
          priority: opp.targetBracket <= 12 ? "high" : "medium",
          type: "roth",
        });
      }
    }

    // Capital gains harvesting opportunity
    if (opp.ltcgRoom > 10000 && taxableUnrealizedGains > 0) {
      const harvestAmount = Math.min(opp.ltcgRoom, taxableUnrealizedGains);
      const savings = harvestAmount * 0.15; // Would have paid 15% LTCG

      if (harvestAmount > 5000) {
        actions.push({
          year: opp.year,
          age: opp.age,
          action: `Harvest ${formatCurrency(harvestAmount)} in gains TAX-FREE`,
          amount: harvestAmount,
          taxSavings: savings,
          priority: "high",
          type: "ltcg",
        });
      }
    }
  }

  // Sort by year, then by priority
  return actions.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

// =====================================================
// Sub-Components
// =====================================================

const BracketVisualization: React.FC<{
  income: number;
  status: FilingStatus;
}> = ({ income, status }) => {
  const { brackets, currentBracketIndex, taxableIncome } = analyzeBrackets(income, status);
  const deduction = TAX_BRACKETS[status].deduction;

  // Only show brackets up to 32% for clarity
  const visibleBrackets = brackets.slice(0, 5);

  const chartData = visibleBrackets.map((bracket, index) => ({
    name: `${bracket.rate}%`,
    rate: bracket.rate,
    filled: bracket.spaceUsed,
    remaining: bracket.spaceRemaining,
    total: bracket.limit - bracket.previousLimit,
    isCurrentBracket: bracket.isCurrentBracket,
  }));

  return (
    <div className="space-y-4">
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 50, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis
              type="number"
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => formatCurrency(val)}
            />
            <YAxis
              type="category"
              dataKey="name"
              tick={{ fontSize: 12, fontWeight: 500 }}
              width={50}
            />
            <Tooltip
              formatter={(value: number, name: string) => [
                formatCurrencyFull(value),
                name === "filled" ? "Income in bracket" : "Room remaining",
              ]}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="filled" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`filled-${index}`}
                  fill={entry.isCurrentBracket ? "#2563eb" : "#93c5fd"}
                />
              ))}
            </Bar>
            <Bar dataKey="remaining" stackId="a" fill="#e5e7eb" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell
                  key={`remaining-${index}`}
                  fill={entry.isCurrentBracket ? "#fef08a" : "#f3f4f6"}
                  stroke={entry.isCurrentBracket ? "#eab308" : "none"}
                  strokeWidth={entry.isCurrentBracket ? 2 : 0}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Current bracket callout */}
      {currentBracketIndex < visibleBrackets.length && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Target className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                You have {formatCurrencyFull(visibleBrackets[currentBracketIndex].spaceRemaining)} of the{" "}
                {visibleBrackets[currentBracketIndex].rate}% bracket unused
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Fill this space with Roth conversions to pay tax at {visibleBrackets[currentBracketIndex].rate}%
                instead of higher rates later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const OpportunityStrategies: React.FC<{ status: FilingStatus }> = ({ status }) => {
  const ltcgZeroLimit = getLTCGZeroBracketLimit(status);
  const brackets = TAX_BRACKETS[status];

  const strategies = [
    {
      icon: <TrendingUp className="h-5 w-5 text-purple-600" />,
      title: "Roth Conversions",
      description:
        "Convert Traditional IRA to Roth in low-income years. Pay tax now at lower brackets to avoid higher RMD taxes later.",
      ideal: "Best when taxable income is in the 12% or 22% bracket",
      color: "purple",
    },
    {
      icon: <DollarSign className="h-5 w-5 text-green-600" />,
      title: "0% Capital Gains Harvesting",
      description: `If total income is below ${formatCurrencyFull(ltcgZeroLimit)}, you can sell appreciated assets completely TAX-FREE. Harvest gains, then immediately rebuy.`,
      ideal: "Perfect for early retirement before Social Security",
      color: "green",
    },
    {
      icon: <Zap className="h-5 w-5 text-orange-600" />,
      title: "ISO Exercise Strategy",
      description:
        "Exercise incentive stock options in years when your income is low to minimize Alternative Minimum Tax (AMT) impact.",
      ideal: "Gap years or early retirement years",
      color: "orange",
    },
    {
      icon: <Calendar className="h-5 w-5 text-blue-600" />,
      title: "Income Acceleration",
      description:
        "In unexpectedly low-income years, consider accelerating future income (bonuses, contract payments) to fill lower brackets.",
      ideal: "When you know next year will be high income",
      color: "blue",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {strategies.map((strategy, index) => (
        <div
          key={index}
          className={`rounded-lg p-4 border bg-${strategy.color}-50 dark:bg-${strategy.color}-950/20 border-${strategy.color}-200 dark:border-${strategy.color}-800`}
          style={{
            backgroundColor: `var(--${strategy.color}-50, hsl(var(--muted)))`,
            borderColor: `var(--${strategy.color}-200, hsl(var(--border)))`,
          }}
        >
          <div className="flex items-start gap-3">
            {strategy.icon}
            <div>
              <div className="font-semibold text-foreground mb-1">
                {strategy.title}
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                {strategy.description}
              </p>
              <Badge variant="outline" className="text-xs">
                {strategy.ideal}
              </Badge>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

const ConversionCorridorTimeline: React.FC<{
  currentAge: number;
  retirementAge: number;
  ssClaimAge: number;
}> = ({ currentAge, retirementAge, ssClaimAge }) => {
  const currentYear = getCurrYear();
  const phases = [
    {
      label: "Working",
      startAge: currentAge,
      endAge: retirementAge - 1,
      color: "bg-blue-500",
      description: "Income fills brackets",
      opportunity: "low",
    },
    {
      label: "Retirement to SS",
      startAge: retirementAge,
      endAge: ssClaimAge - 1,
      color: "bg-green-500",
      description: "PRIME conversion window",
      opportunity: "high",
    },
    {
      label: "SS to RMDs",
      startAge: ssClaimAge,
      endAge: RMD_START_AGE - 1,
      color: "bg-yellow-500",
      description: "Good conversion window",
      opportunity: "medium",
    },
    {
      label: "RMDs Begin",
      startAge: RMD_START_AGE,
      endAge: RMD_START_AGE + 10,
      color: "bg-red-500",
      description: "Forced distributions",
      opportunity: "low",
    },
  ].filter((phase) => phase.endAge >= currentAge);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Clock className="h-4 w-4" />
        <span>Roth Conversion Corridors</span>
      </div>

      <div className="relative">
        <div className="flex gap-1 overflow-x-auto pb-2">
          {phases.map((phase, index) => {
            const duration = phase.endAge - Math.max(phase.startAge, currentAge) + 1;
            const width = Math.max(80, duration * 15);

            return (
              <div
                key={index}
                className="flex-shrink-0"
                style={{ minWidth: `${width}px` }}
              >
                <div
                  className={`h-3 ${phase.color} rounded-sm mb-2 ${
                    phase.opportunity === "high"
                      ? "ring-2 ring-green-400 ring-offset-2"
                      : ""
                  }`}
                />
                <div className="text-xs font-medium">{phase.label}</div>
                <div className="text-xs text-muted-foreground">
                  Age {Math.max(phase.startAge, currentAge)}-{phase.endAge}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {phase.description}
                </div>
                {phase.opportunity === "high" && (
                  <Badge className="mt-1 bg-green-100 text-green-800 text-xs">
                    PRIME
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Key insight */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
          <div>
            <div className="font-semibold text-green-900 dark:text-green-100">
              The Prime Window
            </div>
            <p className="text-sm text-green-800 dark:text-green-200 mt-1">
              The years between retirement (age {retirementAge}) and Social Security (age{" "}
              {ssClaimAge}) are your best opportunity. Income is lowest, so you can fill
              low brackets with Roth conversions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const YearByYearOptimizer: React.FC<{
  opportunities: YearlyOpportunity[];
}> = ({ opportunities }) => {
  const primeOpportunities = opportunities.filter((o) => o.isPrimeYear);

  if (primeOpportunities.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 text-center">
        <p className="text-muted-foreground">
          No prime conversion opportunities detected based on current projections.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[400px] overflow-y-auto">
      {primeOpportunities.slice(0, 15).map((opp, index) => (
        <div
          key={index}
          className={`rounded-lg p-4 border ${
            opp.opportunityType === "both"
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              : opp.opportunityType === "roth-conversion"
              ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
              : "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {opp.year}
                </Badge>
                <span className="text-sm font-medium">Age {opp.age}</span>
                {opp.isPrimeYear && (
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    PRIME
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">{opp.reason}</p>
            </div>
            <div className="text-right">
              {opp.bracketRoom > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Bracket room: </span>
                  <span className="font-semibold text-purple-700 dark:text-purple-300">
                    {formatCurrency(opp.bracketRoom)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-1">
                    @{opp.targetBracket}%
                  </span>
                </div>
              )}
              {opp.ltcgRoom > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">0% LTCG room: </span>
                  <span className="font-semibold text-green-700 dark:text-green-300">
                    {formatCurrency(opp.ltcgRoom)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Specific recommendation */}
          {opp.recommendedConversion > 5000 && (
            <div className="mt-3 pt-3 border-t border-current/10">
              <div className="flex items-center gap-2 text-sm">
                <ArrowRight className="h-4 w-4 text-purple-600" />
                <span>
                  Convert <strong>{formatCurrency(opp.recommendedConversion)}</strong> to Roth
                  at {opp.targetBracket}%
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ZeroCapitalGainsBracket: React.FC<{
  status: FilingStatus;
  currentIncome: number;
  taxableGains: number;
}> = ({ status, currentIncome, taxableGains }) => {
  const zeroLimit = getLTCGZeroBracketLimit(status);
  const room = Math.max(0, zeroLimit - currentIncome);
  const canHarvest = room > 0 && taxableGains > 0;
  const harvestAmount = Math.min(room, taxableGains);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
          <div className="text-sm text-muted-foreground mb-1">0% LTCG Threshold</div>
          <div className="text-2xl font-bold">{formatCurrencyFull(zeroLimit)}</div>
          <div className="text-xs text-muted-foreground mt-1">
            {status === "married" ? "Married Filing Jointly" : "Single"} (2026)
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
          <div className="text-sm text-muted-foreground mb-1">Your Income</div>
          <div className="text-2xl font-bold">{formatCurrencyFull(currentIncome)}</div>
          <div className="text-xs text-muted-foreground mt-1">Projected taxable income</div>
        </div>

        <div
          className={`rounded-lg p-4 border ${
            room > 0
              ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
          }`}
        >
          <div className="text-sm text-muted-foreground mb-1">Room for 0% Gains</div>
          <div
            className={`text-2xl font-bold ${
              room > 0
                ? "text-green-700 dark:text-green-300"
                : "text-red-700 dark:text-red-300"
            }`}
          >
            {formatCurrencyFull(room)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {room > 0 ? "Available for tax-free harvesting" : "No room - income too high"}
          </div>
        </div>
      </div>

      {canHarvest && (
        <div className="bg-green-50 dark:bg-green-950/30 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-green-900 dark:text-green-100 text-lg">
                Tax-Free Gain Harvesting Available!
              </div>
              <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                You can sell up to <strong>{formatCurrencyFull(harvestAmount)}</strong> in
                appreciated assets completely TAX-FREE. Immediately rebuy to reset your cost
                basis higher.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-gray-900 rounded p-2">
                  <div className="text-xs text-muted-foreground">Tax Saved</div>
                  <div className="font-bold text-green-700 dark:text-green-300">
                    {formatCurrencyFull(harvestAmount * 0.15)}
                  </div>
                  <div className="text-xs text-muted-foreground">vs 15% LTCG rate</div>
                </div>
                <div className="bg-white dark:bg-gray-900 rounded p-2">
                  <div className="text-xs text-muted-foreground">New Cost Basis</div>
                  <div className="font-bold">Stepped Up</div>
                  <div className="text-xs text-muted-foreground">Future gains reduced</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!canHarvest && room === 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100">
                Wait for a Low-Income Year
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                Your income is too high for 0% capital gains. Consider harvesting gains in
                retirement years before Social Security starts, when your income will be lower.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ActionItemsTimeline: React.FC<{
  actions: ActionItem[];
}> = ({ actions }) => {
  if (actions.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6 text-center">
        <PiggyBank className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          No immediate action items. Keep monitoring for low-income opportunities.
        </p>
      </div>
    );
  }

  const totalSavings = actions.reduce((sum, a) => sum + a.taxSavings, 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-green-700 dark:text-green-400">
              Potential Tax Savings
            </div>
            <div className="text-3xl font-bold text-green-900 dark:text-green-100">
              {formatCurrencyFull(totalSavings)}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">{actions.length} action items</div>
            <div className="text-sm text-muted-foreground">
              across {new Set(actions.map((a) => a.year)).size} years
            </div>
          </div>
        </div>
      </div>

      {/* Action list */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {actions.map((action, index) => (
          <div
            key={index}
            className={`rounded-lg p-4 border ${
              action.priority === "high"
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                : action.priority === "medium"
                ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800"
                : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                    action.priority === "high"
                      ? "bg-green-500"
                      : action.priority === "medium"
                      ? "bg-yellow-500"
                      : "bg-gray-400"
                  }`}
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs">
                      {action.year}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      Age {action.age}
                    </span>
                    <Badge
                      className={`text-xs ${
                        action.type === "roth"
                          ? "bg-purple-100 text-purple-800"
                          : action.type === "ltcg"
                          ? "bg-green-100 text-green-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {action.type === "roth"
                        ? "Roth"
                        : action.type === "ltcg"
                        ? "LTCG"
                        : action.type}
                    </Badge>
                  </div>
                  <p className="font-medium">{action.action}</p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm text-muted-foreground">Tax Saved</div>
                <div className="font-bold text-green-700 dark:text-green-300">
                  {formatCurrencyFull(action.taxSavings)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

export const BracketFiller: React.FC<BracketFillerProps> = React.memo(
  function BracketFiller(props) {
    const {
      currentAge,
      retirementAge,
      maritalStatus,
      currentIncome,
      socialSecurityIncome = 0,
      ssClaimAge = 67,
      taxableUnrealizedGains = 0,
    } = props;

    // Calculate opportunities
    const opportunities = useMemo(
      () => projectYearlyOpportunities(props),
      [props]
    );

    // Generate action items
    const actionItems = useMemo(
      () => generateActionItems(opportunities, props),
      [opportunities, props]
    );

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
            <BarChart3 className="h-8 w-8 text-purple-600" />
            Tax Bracket Fill Optimizer
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            The wealthy fill lower tax brackets strategically. Here is how you can too.
            Find low-income years and fill them with Roth conversions and tax-free gains.
          </p>
        </div>

        {/* Section 1: Current Bracket Analysis */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-600" />
              <CardTitle>Current Bracket Analysis</CardTitle>
            </div>
            <CardDescription>
              Where you are in the 2026 tax brackets and how much room you have
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BracketVisualization income={currentIncome} status={maritalStatus} />
          </CardContent>
        </Card>

        {/* Section 2: Opportunities to Fill Brackets */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              <CardTitle>Strategies to Fill Lower Brackets</CardTitle>
            </div>
            <CardDescription>
              Four powerful strategies the wealthy use to minimize lifetime taxes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OpportunityStrategies status={maritalStatus} />
          </CardContent>
        </Card>

        {/* Section 3: The 0% Capital Gains Bracket */}
        <Card className="border-2 border-green-200 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <CardTitle>The 0% Capital Gains Bracket</CardTitle>
            </div>
            <CardDescription>
              If your income is low enough, you can harvest gains completely tax-free
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ZeroCapitalGainsBracket
              status={maritalStatus}
              currentIncome={currentIncome}
              taxableGains={taxableUnrealizedGains}
            />
          </CardContent>
        </Card>

        {/* Section 4: Roth Conversion Corridors */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-600" />
              <CardTitle>Roth Conversion Corridors</CardTitle>
            </div>
            <CardDescription>
              The years between key milestones are your prime conversion opportunities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ConversionCorridorTimeline
              currentAge={currentAge}
              retirementAge={retirementAge}
              ssClaimAge={ssClaimAge}
            />
          </CardContent>
        </Card>

        {/* Section 5: Year-by-Year Optimizer */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <CardTitle>Year-by-Year Opportunities</CardTitle>
            </div>
            <CardDescription>
              Projected low-income years where you can fill brackets strategically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <YearByYearOptimizer opportunities={opportunities} />
          </CardContent>
        </Card>

        {/* Section 6: Action Items Timeline */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 dark:border-purple-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              <CardTitle>Your Action Items</CardTitle>
            </div>
            <CardDescription>
              Specific actions to take each year to minimize your lifetime tax burden
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ActionItemsTimeline actions={actionItems} />
          </CardContent>
        </Card>

        {/* Key Insight */}
        <div className="bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/50 dark:to-blue-950/50 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-4">
            <Info className="h-6 w-6 text-purple-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100 mb-2">
                Why This Matters
              </h3>
              <p className="text-purple-800 dark:text-purple-200 mb-4">
                The wealthy do not just save money - they strategically time their income
                recognition. By filling lower brackets in low-income years, they pay 12-22%
                on money that would otherwise be taxed at 32%+ when RMDs force withdrawals.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    Pay Tax Now
                  </div>
                  <div className="text-2xl font-bold text-green-600">12-22%</div>
                  <div className="text-xs text-muted-foreground">In low-income years</div>
                </div>
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    vs Later
                  </div>
                  <div className="text-2xl font-bold text-red-600">32%+</div>
                  <div className="text-xs text-muted-foreground">When RMDs force it</div>
                </div>
                <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-3">
                  <div className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                    You Save
                  </div>
                  <div className="text-2xl font-bold text-purple-600">10-20%</div>
                  <div className="text-xs text-muted-foreground">On every dollar converted</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <p>
            This analysis is for educational purposes. Tax situations are complex and
            individual. Consult a qualified tax professional before executing bracket-filling
            strategies. Consider state taxes, IRMAA thresholds, and other factors specific
            to your situation.
          </p>
        </div>
      </div>
    );
  }
);

BracketFiller.displayName = "BracketFiller";

export default BracketFiller;
