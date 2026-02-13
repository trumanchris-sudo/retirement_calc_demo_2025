"use client";

import React, { useState, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Briefcase,
  Heart,
  Gift,
  TrendingDown,
  Accessibility,
  PartyPopper,
  Trophy,
  ArrowRight,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Info,
  DollarSign,
  Calendar,
  Percent,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";

// ============================================================================
// Types
// ============================================================================

export type LifeEventType =
  | "job_loss"
  | "medical_emergency"
  | "inheritance"
  | "market_crash"
  | "disability"
  | "early_retirement"
  | "windfall";

export interface LifeEvent {
  id: LifeEventType;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  category: "negative" | "positive" | "neutral";
}

export interface LifeEventParams {
  // Job Loss
  jobLossDuration: number; // months without income
  severanceMonths: number; // months of severance pay
  unemploymentBenefit: number; // monthly unemployment benefit

  // Medical Emergency
  medicalCost: number; // total out-of-pocket cost
  recoveryMonths: number; // months of reduced income
  incomeReductionPercent: number; // % income reduction during recovery

  // Inheritance
  inheritanceAmount: number; // total inheritance
  inheritanceTaxRate: number; // estate/inheritance tax %
  inheritanceYear: number; // years from now

  // Market Crash
  crashType: "2008" | "2020" | "custom";
  crashPercent: number; // % portfolio decline
  recoveryYears: number; // years to recover

  // Disability
  disabilityType: "short_term" | "long_term" | "permanent";
  disabilityIncomePercent: number; // % of income from disability insurance
  disabilityDuration: number; // years (if not permanent)

  // Early Retirement
  earlyRetirementYears: number; // years earlier than planned
  penaltyPercent: number; // early withdrawal penalty if applicable
  reducedSSPercent: number; // reduced Social Security benefit

  // Windfall
  windfallAmount: number;
  windfallTaxRate: number; // applicable tax rate
  windfallType: "lottery" | "business_sale" | "stock_options" | "other";
}

export interface SimulationInputs {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  annualIncome: number;
  annualContributions: number;
  expectedReturn: number;
  inflationRate: number;
  withdrawalRate: number;
  socialSecurityMonthly: number;
  ssClaimAge: number;
}

interface ProjectionYear {
  year: number;
  age: number;
  baseline: number;
  withEvent: number;
  difference: number;
  phase: "accumulation" | "retirement";
  eventImpact?: string;
}

interface ComparisonMetrics {
  baselineRetirementBalance: number;
  eventRetirementBalance: number;
  baselineEndOfLife: number;
  eventEndOfLife: number;
  retirementAgeImpact: number; // years delayed or advanced
  successProbabilityChange: number; // percentage point change
  lifetimeIncomeImpact: number; // total income difference
}

// ============================================================================
// Life Event Definitions
// ============================================================================

const LIFE_EVENTS: LifeEvent[] = [
  {
    id: "job_loss",
    name: "Job Loss",
    description:
      "Unexpected unemployment with gap in income. Models severance, unemployment benefits, and time to find new employment.",
    icon: <Briefcase className="w-5 h-5" />,
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    borderColor: "border-red-200 dark:border-red-800",
    category: "negative",
  },
  {
    id: "medical_emergency",
    name: "Medical Emergency",
    description:
      "Major health event with significant out-of-pocket costs and potential income reduction during recovery.",
    icon: <Heart className="w-5 h-5" />,
    color: "text-rose-600",
    bgColor: "bg-rose-50 dark:bg-rose-950/30",
    borderColor: "border-rose-200 dark:border-rose-800",
    category: "negative",
  },
  {
    id: "inheritance",
    name: "Inheritance Received",
    description:
      "Unexpected inheritance from family. Models timing, tax implications, and impact on retirement trajectory.",
    icon: <Gift className="w-5 h-5" />,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    borderColor: "border-emerald-200 dark:border-emerald-800",
    category: "positive",
  },
  {
    id: "market_crash",
    name: "Market Crash",
    description:
      "Major market downturn similar to 2008 financial crisis or 2020 COVID crash. Models sequence of returns risk.",
    icon: <TrendingDown className="w-5 h-5" />,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    borderColor: "border-orange-200 dark:border-orange-800",
    category: "negative",
  },
  {
    id: "disability",
    name: "Disability",
    description:
      "Short-term, long-term, or permanent disability affecting earning capacity. Models disability insurance coverage.",
    icon: <Accessibility className="w-5 h-5" />,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    category: "negative",
  },
  {
    id: "early_retirement",
    name: "Early Retirement Opportunity",
    description:
      "Option to retire earlier than planned. Models reduced savings time, early withdrawal penalties, and lower Social Security.",
    icon: <Trophy className="w-5 h-5" />,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    category: "neutral",
  },
  {
    id: "windfall",
    name: "Windfall",
    description:
      "Unexpected large sum from lottery, business sale, stock options vesting, or other one-time event.",
    icon: <PartyPopper className="w-5 h-5" />,
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    borderColor: "border-amber-200 dark:border-amber-800",
    category: "positive",
  },
];

// ============================================================================
// Default Parameters
// ============================================================================

const DEFAULT_EVENT_PARAMS: LifeEventParams = {
  // Job Loss
  jobLossDuration: 6,
  severanceMonths: 3,
  unemploymentBenefit: 2000,

  // Medical Emergency
  medicalCost: 50000,
  recoveryMonths: 6,
  incomeReductionPercent: 50,

  // Inheritance
  inheritanceAmount: 200000,
  inheritanceTaxRate: 0,
  inheritanceYear: 10,

  // Market Crash
  crashType: "2008",
  crashPercent: 50,
  recoveryYears: 4,

  // Disability
  disabilityType: "long_term",
  disabilityIncomePercent: 60,
  disabilityDuration: 5,

  // Early Retirement
  earlyRetirementYears: 5,
  penaltyPercent: 10,
  reducedSSPercent: 30,

  // Windfall
  windfallAmount: 500000,
  windfallTaxRate: 37,
  windfallType: "business_sale",
};

const DEFAULT_SIMULATION_INPUTS: SimulationInputs = {
  currentAge: 40,
  retirementAge: 65,
  currentSavings: 500000,
  annualIncome: 150000,
  annualContributions: 30000,
  expectedReturn: 7,
  inflationRate: 2.5,
  withdrawalRate: 4,
  socialSecurityMonthly: 2500,
  ssClaimAge: 67,
};

// ============================================================================
// Simulation Logic
// ============================================================================

function runBaselineProjection(
  inputs: SimulationInputs,
  yearsToProject: number
): ProjectionYear[] {
  const {
    currentAge,
    retirementAge,
    currentSavings,
    annualContributions,
    expectedReturn,
    inflationRate,
    withdrawalRate,
    socialSecurityMonthly,
    ssClaimAge,
  } = inputs;

  const results: ProjectionYear[] = [];
  let balance = currentSavings;
  const realReturn = (1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1;

  for (let year = 0; year <= yearsToProject; year++) {
    const age = currentAge + year;
    const isRetired = age >= retirementAge;

    if (isRetired) {
      // Retirement phase
      const ssIncome =
        age >= ssClaimAge ? socialSecurityMonthly * 12 : 0;
      const withdrawal = balance * (withdrawalRate / 100);
      balance = balance * (1 + realReturn) - withdrawal + ssIncome * 0.5; // SS partially offsets withdrawal
    } else {
      // Accumulation phase
      balance = (balance + annualContributions * 0.5) * (1 + realReturn) + annualContributions * 0.5;
    }

    results.push({
      year: new Date().getFullYear() + year,
      age,
      baseline: Math.max(0, balance),
      withEvent: Math.max(0, balance),
      difference: 0,
      phase: isRetired ? "retirement" : "accumulation",
    });
  }

  return results;
}

function applyLifeEvent(
  baseline: ProjectionYear[],
  eventType: LifeEventType,
  eventParams: LifeEventParams,
  inputs: SimulationInputs
): ProjectionYear[] {
  const results = baseline.map((year) => ({ ...year }));
  const eventYear = 3; // Event occurs 3 years from now by default
  const {
    retirementAge,
    annualIncome,
    annualContributions,
    expectedReturn,
    inflationRate,
    withdrawalRate,
  } = inputs;
  const realReturn = (1 + expectedReturn / 100) / (1 + inflationRate / 100) - 1;

  for (let i = 0; i < results.length; i++) {
    const year = results[i];
    const yearIndex = i;
    let eventImpact = "";

    // Start from baseline but apply any carry-forward impact
    if (i > 0) {
      const prevWithEvent = results[i - 1].withEvent;
      const isRetired = year.age >= retirementAge;

      if (isRetired) {
        const withdrawal = prevWithEvent * (withdrawalRate / 100);
        year.withEvent = prevWithEvent * (1 + realReturn) - withdrawal;
      } else {
        year.withEvent =
          (prevWithEvent + annualContributions * 0.5) * (1 + realReturn) +
          annualContributions * 0.5;
      }
    }

    // Apply event-specific impacts
    switch (eventType) {
      case "job_loss":
        if (
          yearIndex >= eventYear &&
          yearIndex < eventYear + Math.ceil(eventParams.jobLossDuration / 12)
        ) {
          // Lost income minus severance and unemployment
          const monthsInYear = Math.min(
            12,
            eventParams.jobLossDuration - (yearIndex - eventYear) * 12
          );
          const severanceInYear =
            yearIndex === eventYear
              ? (annualIncome / 12) * eventParams.severanceMonths
              : 0;
          const unemploymentInYear = eventParams.unemploymentBenefit * monthsInYear;
          const lostContributions =
            (annualContributions / 12) * monthsInYear;
          const lostIncome =
            (annualIncome / 12) * monthsInYear -
            severanceInYear -
            unemploymentInYear;

          year.withEvent -= lostContributions + lostIncome * 0.3; // 30% of lost income drawn from savings
          eventImpact = `Job loss: -$${Math.round(lostContributions + lostIncome * 0.3).toLocaleString()} impact`;
        }
        break;

      case "medical_emergency":
        if (yearIndex === eventYear) {
          year.withEvent -= eventParams.medicalCost;
          eventImpact = `Medical costs: -$${eventParams.medicalCost.toLocaleString()}`;
        }
        if (
          yearIndex >= eventYear &&
          yearIndex < eventYear + Math.ceil(eventParams.recoveryMonths / 12)
        ) {
          const reducedContrib =
            annualContributions * (eventParams.incomeReductionPercent / 100);
          year.withEvent -= reducedContrib;
          if (!eventImpact)
            eventImpact = `Recovery period: -$${Math.round(reducedContrib).toLocaleString()} reduced savings`;
        }
        break;

      case "inheritance":
        if (yearIndex === eventParams.inheritanceYear) {
          const netInheritance =
            eventParams.inheritanceAmount *
            (1 - eventParams.inheritanceTaxRate / 100);
          year.withEvent += netInheritance;
          eventImpact = `Inheritance: +$${Math.round(netInheritance).toLocaleString()}`;
        }
        break;

      case "market_crash":
        if (yearIndex === eventYear) {
          year.withEvent *= 1 - eventParams.crashPercent / 100;
          eventImpact = `Market crash: -${eventParams.crashPercent}% portfolio value`;
        }
        // Recovery period with potentially higher returns
        if (
          yearIndex > eventYear &&
          yearIndex <= eventYear + eventParams.recoveryYears
        ) {
          // Model V-shaped or gradual recovery
          const recoveryBoost = eventParams.crashType === "2020" ? 0.15 : 0.08;
          year.withEvent *= 1 + recoveryBoost;
          eventImpact = `Recovery: +${Math.round(recoveryBoost * 100)}% bounce`;
        }
        break;

      case "disability":
        const disabilityStart = eventYear;
        const disabilityEnd =
          eventParams.disabilityType === "permanent"
            ? results.length
            : eventYear + eventParams.disabilityDuration;

        if (yearIndex >= disabilityStart && yearIndex < disabilityEnd) {
          const normalContrib = annualContributions;
          const reducedContrib =
            normalContrib * (eventParams.disabilityIncomePercent / 100);
          const lostContrib = normalContrib - reducedContrib;
          year.withEvent -= lostContrib;
          eventImpact = `Disability: -$${Math.round(lostContrib).toLocaleString()} reduced contributions`;
        }
        break;

      case "early_retirement":
        const earlyRetAge = retirementAge - eventParams.earlyRetirementYears;
        if (year.age >= earlyRetAge && year.age < retirementAge) {
          // Now in early retirement - no more contributions, start withdrawing
          if (i > 0) {
            const prevBalance = results[i - 1].withEvent;
            // Early withdrawal with potential penalty
            const withdrawal =
              prevBalance *
              (withdrawalRate / 100) *
              (1 + eventParams.penaltyPercent / 100);
            year.withEvent = prevBalance * (1 + realReturn) - withdrawal;
            eventImpact = `Early retirement: -$${Math.round(withdrawal).toLocaleString()} withdrawal`;
          }
        }
        // Reduced SS when claimed
        if (year.age >= inputs.ssClaimAge) {
          const ssReduction =
            inputs.socialSecurityMonthly *
            12 *
            (eventParams.reducedSSPercent / 100);
          year.withEvent -= ssReduction * 0.5;
        }
        break;

      case "windfall":
        if (yearIndex === eventYear) {
          const netWindfall =
            eventParams.windfallAmount *
            (1 - eventParams.windfallTaxRate / 100);
          year.withEvent += netWindfall;
          eventImpact = `Windfall: +$${Math.round(netWindfall).toLocaleString()} (after ${eventParams.windfallTaxRate}% tax)`;
        }
        break;
    }

    year.withEvent = Math.max(0, year.withEvent);
    year.difference = year.withEvent - year.baseline;
    if (eventImpact) year.eventImpact = eventImpact;
  }

  return results;
}

function calculateMetrics(
  projection: ProjectionYear[],
  inputs: SimulationInputs
): ComparisonMetrics {
  const retirementYearIndex = inputs.retirementAge - inputs.currentAge;
  const retirementYear = projection[retirementYearIndex] || projection[projection.length - 1];
  const endOfLife = projection[projection.length - 1];

  // Calculate retirement age impact
  const baselineRetirementAge = inputs.retirementAge;
  let eventRetirementAge = inputs.retirementAge;

  // Check if event scenario reaches target balance earlier or later
  const targetBalance = retirementYear.baseline;
  for (let i = 0; i < projection.length; i++) {
    if (projection[i].withEvent >= targetBalance && i < retirementYearIndex) {
      eventRetirementAge = inputs.currentAge + i;
      break;
    }
  }

  // Calculate success probability change (simplified)
  const baselineSuccessProb = retirementYear.baseline > 0 ? 95 : 50;
  const eventSuccessProb =
    retirementYear.withEvent > retirementYear.baseline * 0.8
      ? 95
      : retirementYear.withEvent > retirementYear.baseline * 0.5
      ? 75
      : 50;

  // Calculate lifetime income impact
  const lifetimeBaselineWithdrawals = projection
    .filter((y) => y.phase === "retirement")
    .reduce((sum, y) => sum + y.baseline * (inputs.withdrawalRate / 100), 0);
  const lifetimeEventWithdrawals = projection
    .filter((y) => y.phase === "retirement")
    .reduce((sum, y) => sum + y.withEvent * (inputs.withdrawalRate / 100), 0);

  return {
    baselineRetirementBalance: retirementYear.baseline,
    eventRetirementBalance: retirementYear.withEvent,
    baselineEndOfLife: endOfLife.baseline,
    eventEndOfLife: endOfLife.withEvent,
    retirementAgeImpact: eventRetirementAge - baselineRetirementAge,
    successProbabilityChange: eventSuccessProb - baselineSuccessProb,
    lifetimeIncomeImpact: lifetimeEventWithdrawals - lifetimeBaselineWithdrawals,
  };
}

// ============================================================================
// Components
// ============================================================================

interface EventCardProps {
  event: LifeEvent;
  isSelected: boolean;
  onSelect: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, isSelected, onSelect }) => (
  <button
    onClick={onSelect}
    className={`
      w-full p-4 rounded-lg border-2 transition-all duration-200
      text-left flex items-start gap-3
      ${
        isSelected
          ? `${event.bgColor} ${event.borderColor} ring-2 ring-offset-2 ring-blue-500`
          : "bg-card border-border hover:border-muted-foreground/50"
      }
    `}
  >
    <div className={`p-2 rounded-full ${event.bgColor} ${event.color}`}>
      {event.icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm">{event.name}</span>
        <Badge
          variant={
            event.category === "positive"
              ? "default"
              : event.category === "negative"
              ? "destructive"
              : "secondary"
          }
          className="text-xs"
        >
          {event.category === "positive"
            ? "+"
            : event.category === "negative"
            ? "-"
            : "~"}
        </Badge>
      </div>
      <p className="text-xs text-muted-foreground line-clamp-2">
        {event.description}
      </p>
    </div>
  </button>
);

interface ParameterEditorProps {
  eventType: LifeEventType;
  params: LifeEventParams;
  onParamsChange: (params: LifeEventParams) => void;
  inputs: SimulationInputs;
}

const ParameterEditor: React.FC<ParameterEditorProps> = ({
  eventType,
  params,
  onParamsChange,
  inputs,
}) => {
  const updateParam = <K extends keyof LifeEventParams>(
    key: K,
    value: LifeEventParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  switch (eventType) {
    case "job_loss":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Unemployment Duration (months)
            </Label>
            <Slider
              value={[params.jobLossDuration]}
              onValueChange={([v]) => updateParam("jobLossDuration", v)}
              min={1}
              max={24}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.jobLossDuration} months
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Severance (months of pay)
            </Label>
            <Slider
              value={[params.severanceMonths]}
              onValueChange={([v]) => updateParam("severanceMonths", v)}
              min={0}
              max={12}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.severanceMonths} months ({formatCurrency((inputs.annualIncome / 12) * params.severanceMonths)})
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Monthly Unemployment Benefit
            </Label>
            <Input
              type="number"
              value={params.unemploymentBenefit}
              onChange={(e) =>
                updateParam("unemploymentBenefit", Number(e.target.value))
              }
            />
          </div>
        </div>
      );

    case "medical_emergency":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Total Medical Costs (Out-of-Pocket)
            </Label>
            <Slider
              value={[params.medicalCost]}
              onValueChange={([v]) => updateParam("medicalCost", v)}
              min={5000}
              max={500000}
              step={5000}
            />
            <div className="text-sm text-muted-foreground text-right">
              {formatCurrency(params.medicalCost)}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Recovery Period (months)
            </Label>
            <Slider
              value={[params.recoveryMonths]}
              onValueChange={([v]) => updateParam("recoveryMonths", v)}
              min={0}
              max={24}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.recoveryMonths} months
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Income Reduction During Recovery
            </Label>
            <Slider
              value={[params.incomeReductionPercent]}
              onValueChange={([v]) => updateParam("incomeReductionPercent", v)}
              min={0}
              max={100}
              step={5}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.incomeReductionPercent}% reduction
            </div>
          </div>
        </div>
      );

    case "inheritance":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Inheritance Amount
            </Label>
            <Slider
              value={[params.inheritanceAmount]}
              onValueChange={([v]) => updateParam("inheritanceAmount", v)}
              min={10000}
              max={2000000}
              step={10000}
            />
            <div className="text-sm text-muted-foreground text-right">
              {formatCurrency(params.inheritanceAmount)}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Years Until Received
            </Label>
            <Slider
              value={[params.inheritanceYear]}
              onValueChange={([v]) => updateParam("inheritanceYear", v)}
              min={1}
              max={30}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.inheritanceYear} years from now
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Estate/Inheritance Tax Rate
            </Label>
            <Slider
              value={[params.inheritanceTaxRate]}
              onValueChange={([v]) => updateParam("inheritanceTaxRate", v)}
              min={0}
              max={40}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.inheritanceTaxRate}% (Net: {formatCurrency(params.inheritanceAmount * (1 - params.inheritanceTaxRate / 100))})
            </div>
          </div>
        </div>
      );

    case "market_crash":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Crash Scenario</Label>
            <Select
              value={params.crashType}
              onValueChange={(v) =>
                updateParam("crashType", v as "2008" | "2020" | "custom")
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2008">
                  2008 Financial Crisis (-50%, 4yr recovery)
                </SelectItem>
                <SelectItem value="2020">
                  2020 COVID Crash (-34%, 6mo recovery)
                </SelectItem>
                <SelectItem value="custom">Custom Scenario</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {params.crashType === "custom" && (
            <>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Portfolio Decline
                </Label>
                <Slider
                  value={[params.crashPercent]}
                  onValueChange={([v]) => updateParam("crashPercent", v)}
                  min={10}
                  max={70}
                  step={5}
                />
                <div className="text-sm text-muted-foreground text-right">
                  -{params.crashPercent}%
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Recovery Period (years)
                </Label>
                <Slider
                  value={[params.recoveryYears]}
                  onValueChange={([v]) => updateParam("recoveryYears", v)}
                  min={1}
                  max={10}
                  step={1}
                />
                <div className="text-sm text-muted-foreground text-right">
                  {params.recoveryYears} years
                </div>
              </div>
            </>
          )}
          <div className="p-3 bg-muted rounded-lg text-sm">
            <Info className="w-4 h-4 inline mr-2" />
            {params.crashType === "2008" && (
              <>
                The 2008 crash saw S&P 500 decline ~50% from peak to trough over 17
                months, with recovery taking about 4 years.
              </>
            )}
            {params.crashType === "2020" && (
              <>
                The COVID crash saw a rapid ~34% decline over 33 days, followed by
                one of the fastest recoveries in history (~6 months to new highs).
              </>
            )}
            {params.crashType === "custom" && (
              <>Configure your own crash scenario to stress test your plan.</>
            )}
          </div>
        </div>
      );

    case "disability":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Disability Type</Label>
            <Select
              value={params.disabilityType}
              onValueChange={(v) =>
                updateParam(
                  "disabilityType",
                  v as "short_term" | "long_term" | "permanent"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="short_term">
                  Short-Term (up to 1 year)
                </SelectItem>
                <SelectItem value="long_term">
                  Long-Term (1-10 years)
                </SelectItem>
                <SelectItem value="permanent">Permanent Disability</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Disability Insurance Coverage (% of income)
            </Label>
            <Slider
              value={[params.disabilityIncomePercent]}
              onValueChange={([v]) => updateParam("disabilityIncomePercent", v)}
              min={0}
              max={80}
              step={5}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.disabilityIncomePercent}% (
              {formatCurrency((inputs.annualIncome * params.disabilityIncomePercent) / 100)}/year)
            </div>
          </div>
          {params.disabilityType !== "permanent" && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Duration (years)
              </Label>
              <Slider
                value={[params.disabilityDuration]}
                onValueChange={([v]) => updateParam("disabilityDuration", v)}
                min={1}
                max={params.disabilityType === "short_term" ? 1 : 10}
                step={1}
              />
              <div className="text-sm text-muted-foreground text-right">
                {params.disabilityDuration} years
              </div>
            </div>
          )}
        </div>
      );

    case "early_retirement":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Years Earlier Than Planned
            </Label>
            <Slider
              value={[params.earlyRetirementYears]}
              onValueChange={([v]) => updateParam("earlyRetirementYears", v)}
              min={1}
              max={Math.min(15, inputs.retirementAge - inputs.currentAge - 5)}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              Retire at age {inputs.retirementAge - params.earlyRetirementYears} instead of{" "}
              {inputs.retirementAge}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Early Withdrawal Penalty (if under 59.5)
            </Label>
            <Slider
              value={[params.penaltyPercent]}
              onValueChange={([v]) => updateParam("penaltyPercent", v)}
              min={0}
              max={20}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.penaltyPercent}% penalty on withdrawals
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Social Security Reduction
            </Label>
            <Slider
              value={[params.reducedSSPercent]}
              onValueChange={([v]) => updateParam("reducedSSPercent", v)}
              min={0}
              max={40}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.reducedSSPercent}% reduction (claiming early or fewer work credits)
            </div>
          </div>
        </div>
      );

    case "windfall":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Windfall Type</Label>
            <Select
              value={params.windfallType}
              onValueChange={(v) =>
                updateParam(
                  "windfallType",
                  v as "lottery" | "business_sale" | "stock_options" | "other"
                )
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lottery">Lottery / Gambling Win</SelectItem>
                <SelectItem value="business_sale">Sale of Business</SelectItem>
                <SelectItem value="stock_options">
                  Stock Options / IPO
                </SelectItem>
                <SelectItem value="other">Other Windfall</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Windfall Amount (before tax)
            </Label>
            <Slider
              value={[params.windfallAmount]}
              onValueChange={([v]) => updateParam("windfallAmount", v)}
              min={50000}
              max={5000000}
              step={50000}
            />
            <div className="text-sm text-muted-foreground text-right">
              {formatCurrency(params.windfallAmount)}
            </div>
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Percent className="w-4 h-4" />
              Effective Tax Rate
            </Label>
            <Slider
              value={[params.windfallTaxRate]}
              onValueChange={([v]) => updateParam("windfallTaxRate", v)}
              min={0}
              max={50}
              step={1}
            />
            <div className="text-sm text-muted-foreground text-right">
              {params.windfallTaxRate}% (Net: {formatCurrency(params.windfallAmount * (1 - params.windfallTaxRate / 100))})
            </div>
          </div>
          <div className="p-3 bg-muted rounded-lg text-sm">
            <Info className="w-4 h-4 inline mr-2" />
            {params.windfallType === "lottery" && (
              <>
                Lottery winnings are taxed as ordinary income at federal rates up
                to 37%, plus state taxes.
              </>
            )}
            {params.windfallType === "business_sale" && (
              <>
                Business sale proceeds may qualify for long-term capital gains
                rates (0-20%) if held over 1 year.
              </>
            )}
            {params.windfallType === "stock_options" && (
              <>
                ISO options may receive favorable tax treatment; NQSOs are taxed
                as ordinary income.
              </>
            )}
            {params.windfallType === "other" && (
              <>Tax treatment varies based on the source of the windfall.</>
            )}
          </div>
        </div>
      );

    default:
      return null;
  }
};

interface ComparisonChartProps {
  data: ProjectionYear[];
  retirementAge: number;
  currentAge: number;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({
  data,
  retirementAge,
  currentAge,
}) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);

  const retirementYear =
    new Date().getFullYear() + (retirementAge - currentAge);

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <defs>
          <linearGradient id="baselineGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="eventGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="year"
          tick={{ fontSize: 12 }}
          tickLine={false}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(v) => formatCurrency(v)}
          tick={{ fontSize: 12 }}
          tickLine={false}
          className="text-muted-foreground"
        />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatCurrency(value),
            name,
          ]}
          labelFormatter={(label) => `Year ${label}`}
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
          }}
        />
        <Legend />
        <ReferenceLine
          x={retirementYear}
          stroke="#f59e0b"
          strokeDasharray="5 5"
          label={{
            value: "Retirement",
            position: "top",
            fill: "#f59e0b",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="baseline"
          fill="url(#baselineGradient)"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Baseline Plan"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="withEvent"
          stroke="#10b981"
          strokeWidth={3}
          name="With Life Event"
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
};

interface MetricsComparisonProps {
  metrics: ComparisonMetrics;
  event: LifeEvent;
}

const MetricsComparison: React.FC<MetricsComparisonProps> = ({
  metrics,
  event,
}) => {
  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);

  const balanceDiff =
    metrics.eventRetirementBalance - metrics.baselineRetirementBalance;
  const eolDiff = metrics.eventEndOfLife - metrics.baselineEndOfLife;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* At Retirement */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Balance at Retirement</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Baseline</span>
              <span>{formatCurrency(metrics.baselineRetirementBalance)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">With Event</span>
              <span className={event.color}>
                {formatCurrency(metrics.eventRetirementBalance)}
              </span>
            </div>
            <div
              className={`flex items-center justify-end gap-1 font-semibold ${
                balanceDiff >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {balanceDiff >= 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              {formatCurrency(Math.abs(balanceDiff))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* End of Life */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Balance at Age 95</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Baseline</span>
              <span>{formatCurrency(metrics.baselineEndOfLife)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">With Event</span>
              <span className={event.color}>
                {formatCurrency(metrics.eventEndOfLife)}
              </span>
            </div>
            <div
              className={`flex items-center justify-end gap-1 font-semibold ${
                eolDiff >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {eolDiff >= 0 ? (
                <ArrowUp className="w-4 h-4" />
              ) : (
                <ArrowDown className="w-4 h-4" />
              )}
              {formatCurrency(Math.abs(eolDiff))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retirement Age Impact */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Retirement Age Impact</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-center py-2">
            <span
              className={`text-3xl font-bold ${
                metrics.retirementAgeImpact <= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {metrics.retirementAgeImpact === 0
                ? "No Change"
                : metrics.retirementAgeImpact > 0
                ? `+${metrics.retirementAgeImpact} years`
                : `${metrics.retirementAgeImpact} years`}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            {metrics.retirementAgeImpact < 0
              ? "Could retire earlier"
              : metrics.retirementAgeImpact > 0
              ? "May need to delay retirement"
              : "On track for planned retirement"}
          </p>
        </CardContent>
      </Card>

      {/* Lifetime Income Impact */}
      <Card className="overflow-hidden">
        <CardHeader className="p-4 pb-2">
          <CardDescription>Lifetime Withdrawal Impact</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-center py-2">
            <span
              className={`text-2xl font-bold ${
                metrics.lifetimeIncomeImpact >= 0
                  ? "text-green-600"
                  : "text-red-600"
              }`}
            >
              {metrics.lifetimeIncomeImpact >= 0 ? "+" : ""}
              {formatCurrency(metrics.lifetimeIncomeImpact)}
            </span>
          </div>
          <p className="text-xs text-center text-muted-foreground">
            Total change in retirement withdrawals
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export interface LifeEventSimulatorProps {
  /** Initial simulation inputs - if provided, overrides defaults */
  initialInputs?: Partial<SimulationInputs>;
  /** Callback when simulation completes */
  onSimulationComplete?: (
    projection: ProjectionYear[],
    metrics: ComparisonMetrics
  ) => void;
}

export const LifeEventSimulator: React.FC<LifeEventSimulatorProps> = ({
  initialInputs,
  onSimulationComplete,
}) => {
  // State
  const [selectedEvent, setSelectedEvent] = useState<LifeEventType>("job_loss");
  const [eventParams, setEventParams] = useState<LifeEventParams>(DEFAULT_EVENT_PARAMS);
  const [inputs, setInputs] = useState<SimulationInputs>({
    ...DEFAULT_SIMULATION_INPUTS,
    ...initialInputs,
  });
  const [activeTab, setActiveTab] = useState<"events" | "customize" | "results">(
    "events"
  );

  // Memoized calculations
  const yearsToProject = useMemo(
    () => Math.max(30, 95 - inputs.currentAge),
    [inputs.currentAge]
  );

  const baseline = useMemo(
    () => runBaselineProjection(inputs, yearsToProject),
    [inputs, yearsToProject]
  );

  const projection = useMemo(
    () => applyLifeEvent(baseline, selectedEvent, eventParams, inputs),
    [baseline, selectedEvent, eventParams, inputs]
  );

  const metrics = useMemo(
    () => calculateMetrics(projection, inputs),
    [projection, inputs]
  );

  const selectedEventData = LIFE_EVENTS.find((e) => e.id === selectedEvent)!;

  // Handlers
  const handleEventSelect = useCallback((eventId: LifeEventType) => {
    setSelectedEvent(eventId);
    // Reset params to defaults for new event
    setEventParams(DEFAULT_EVENT_PARAMS);
    // Auto-advance to customize tab on mobile
    if (window.innerWidth < 768) {
      setActiveTab("customize");
    }
  }, []);

  const handleReset = useCallback(() => {
    setEventParams(DEFAULT_EVENT_PARAMS);
    setInputs({ ...DEFAULT_SIMULATION_INPUTS, ...initialInputs });
  }, [initialInputs]);

  // Effect to notify parent of simulation results
  React.useEffect(() => {
    onSimulationComplete?.(projection, metrics);
  }, [projection, metrics, onSimulationComplete]);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Life Event Simulator
            </CardTitle>
            <CardDescription>
              Model how major life events affect your retirement plan with
              before/after comparison
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="events">1. Select Event</TabsTrigger>
            <TabsTrigger value="customize">2. Customize</TabsTrigger>
            <TabsTrigger value="results">3. Results</TabsTrigger>
          </TabsList>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {LIFE_EVENTS.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  isSelected={selectedEvent === event.id}
                  onSelect={() => handleEventSelect(event.id)}
                />
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setActiveTab("customize")}>
                Customize Parameters
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Customize Tab */}
          <TabsContent value="customize" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Event Parameters */}
              <Card className={`${selectedEventData.bgColor} ${selectedEventData.borderColor} border-2`}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <span className={selectedEventData.color}>
                      {selectedEventData.icon}
                    </span>
                    {selectedEventData.name} Parameters
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ParameterEditor
                    eventType={selectedEvent}
                    params={eventParams}
                    onParamsChange={setEventParams}
                    inputs={inputs}
                  />
                </CardContent>
              </Card>

              {/* Base Plan Parameters */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Your Plan Settings</CardTitle>
                  <CardDescription>
                    Adjust your baseline retirement assumptions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Current Age</Label>
                      <Input
                        type="number"
                        value={inputs.currentAge}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            currentAge: Number(e.target.value),
                          })
                        }
                        min={20}
                        max={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Retirement Age</Label>
                      <Input
                        type="number"
                        value={inputs.retirementAge}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            retirementAge: Number(e.target.value),
                          })
                        }
                        min={inputs.currentAge + 1}
                        max={80}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Current Savings</Label>
                      <Input
                        type="number"
                        value={inputs.currentSavings}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            currentSavings: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual Income</Label>
                      <Input
                        type="number"
                        value={inputs.annualIncome}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            annualIncome: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Annual Contributions</Label>
                      <Input
                        type="number"
                        value={inputs.annualContributions}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            annualContributions: Number(e.target.value),
                          })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Return (%)</Label>
                      <Input
                        type="number"
                        value={inputs.expectedReturn}
                        onChange={(e) =>
                          setInputs({
                            ...inputs,
                            expectedReturn: Number(e.target.value),
                          })
                        }
                        step={0.5}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("events")}>
                Back to Events
              </Button>
              <Button onClick={() => setActiveTab("results")}>
                View Results
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </TabsContent>

          {/* Results Tab */}
          <TabsContent value="results" className="space-y-6">
            {/* Summary Banner */}
            <Card
              className={`${selectedEventData.bgColor} ${selectedEventData.borderColor} border-2`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-full bg-background ${selectedEventData.color}`}>
                    {selectedEventData.icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{selectedEventData.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      Impact analysis on your retirement plan
                    </p>
                  </div>
                  <Badge
                    variant={
                      selectedEventData.category === "positive"
                        ? "default"
                        : selectedEventData.category === "negative"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {selectedEventData.category === "positive"
                      ? "Positive Impact"
                      : selectedEventData.category === "negative"
                      ? "Negative Impact"
                      : "Mixed Impact"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Metrics Comparison */}
            <MetricsComparison metrics={metrics} event={selectedEventData} />

            {/* Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Wealth Trajectory Comparison</CardTitle>
                <CardDescription>
                  Baseline plan vs. plan with {selectedEventData.name.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ComparisonChart
                  data={projection}
                  retirementAge={inputs.retirementAge}
                  currentAge={inputs.currentAge}
                />
              </CardContent>
            </Card>

            {/* Event Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Event Impact Timeline</CardTitle>
                <CardDescription>
                  Key moments where the event affects your plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {projection
                    .filter((y) => y.eventImpact)
                    .slice(0, 10)
                    .map((year, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted"
                      >
                        <Badge variant="outline">{year.year}</Badge>
                        <span className="text-sm text-muted-foreground">
                          Age {year.age}
                        </span>
                        <span className="flex-1 text-sm">{year.eventImpact}</span>
                        <span
                          className={`font-mono text-sm ${
                            year.difference >= 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {year.difference >= 0 ? "+" : ""}
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                            notation: "compact",
                          }).format(year.difference)}
                        </span>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-500" />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {selectedEvent === "job_loss" && (
                    <>
                      <p className="text-sm">
                        - Maintain 6-12 months of expenses in an emergency fund
                      </p>
                      <p className="text-sm">
                        - Consider disability insurance to protect income
                      </p>
                      <p className="text-sm">
                        - Keep skills current and network active for faster
                        reemployment
                      </p>
                    </>
                  )}
                  {selectedEvent === "medical_emergency" && (
                    <>
                      <p className="text-sm">
                        - Maximize HSA contributions for tax-advantaged medical
                        savings
                      </p>
                      <p className="text-sm">
                        - Review health insurance deductibles and out-of-pocket
                        maximums
                      </p>
                      <p className="text-sm">
                        - Consider supplemental critical illness insurance
                      </p>
                    </>
                  )}
                  {selectedEvent === "inheritance" && (
                    <>
                      <p className="text-sm">
                        - Consult tax advisor on optimal asset placement
                      </p>
                      <p className="text-sm">
                        - Consider paying down high-interest debt first
                      </p>
                      <p className="text-sm">
                        - Avoid lifestyle inflation - invest for long-term growth
                      </p>
                    </>
                  )}
                  {selectedEvent === "market_crash" && (
                    <>
                      <p className="text-sm">
                        - Maintain age-appropriate asset allocation to reduce
                        sequence risk
                      </p>
                      <p className="text-sm">
                        - Keep 2-3 years of expenses in stable investments near
                        retirement
                      </p>
                      <p className="text-sm">
                        - Avoid panic selling - stay invested for recovery
                      </p>
                    </>
                  )}
                  {selectedEvent === "disability" && (
                    <>
                      <p className="text-sm">
                        - Obtain long-term disability insurance covering 60-70% of
                        income
                      </p>
                      <p className="text-sm">
                        - Understand your employer&apos;s STD/LTD benefits
                      </p>
                      <p className="text-sm">
                        - Consider own-occupation disability coverage
                      </p>
                    </>
                  )}
                  {selectedEvent === "early_retirement" && (
                    <>
                      <p className="text-sm">
                        - Build taxable account bridge for pre-59.5 expenses
                      </p>
                      <p className="text-sm">
                        - Plan for healthcare coverage before Medicare eligibility
                      </p>
                      <p className="text-sm">
                        - Calculate reduced Social Security benefits carefully
                      </p>
                    </>
                  )}
                  {selectedEvent === "windfall" && (
                    <>
                      <p className="text-sm">
                        - Consult tax professional immediately on tax-efficient
                        strategies
                      </p>
                      <p className="text-sm">
                        - Consider phased approach to avoid lifestyle inflation
                      </p>
                      <p className="text-sm">
                        - Max out tax-advantaged accounts before taxable investing
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-start">
              <Button variant="outline" onClick={() => setActiveTab("customize")}>
                Adjust Parameters
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default LifeEventSimulator;
