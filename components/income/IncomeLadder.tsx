"use client";

import React, { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, fmt, fmtFull } from "@/lib/utils";
import {
  GripVertical,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  DollarSign,
  Shield,
  Zap,
  Clock,
  ChevronDown,
  ChevronUp,
  Info,
  Landmark,
  Briefcase,
  Heart,
  PiggyBank,
  Building2,
  Coins,
  LineChart,
  BarChart3,
  Scale,
  Target,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export type IncomeSourceType =
  | "social_security"
  | "pension"
  | "annuity"
  | "401k"
  | "ira"
  | "roth"
  | "brokerage"
  | "rental"
  | "part_time"
  | "other";

export type IncomeCategory = "guaranteed" | "variable";

export interface IncomeSource {
  id: string;
  name: string;
  type: IncomeSourceType;
  category: IncomeCategory;
  annualAmount: number;
  startAge: number;
  endAge: number | null; // null = lifetime
  inflationAdjusted: boolean;
  taxable: boolean;
  // Social Security specific
  ssClaimAge?: number;
  ssBenefitAtFRA?: number;
  // Pension specific
  pensionLumpSum?: number;
  pensionCOLA?: number;
  // Additional metadata
  notes?: string;
  order: number;
}

export interface IncomeGap {
  startAge: number;
  endAge: number;
  annualGap: number;
  totalGap: number;
  severity: "low" | "medium" | "high" | "critical";
}

export interface SocialSecurityScenario {
  claimAge: number;
  monthlyBenefit: number;
  annualBenefit: number;
  lifetimeTotal: number;
  breakEvenAge: number;
}

export interface PensionComparison {
  annuityValue: number;
  lumpSumValue: number;
  discountRate: number;
  breakEvenYears: number;
  recommendation: "annuity" | "lump_sum" | "neutral";
}

export interface BridgeStrategy {
  name: string;
  description: string;
  sources: string[];
  startAge: number;
  endAge: number;
  annualWithdrawal: number;
  taxEfficiency: "low" | "medium" | "high";
}

export interface IncomeLadderProps {
  currentAge: number;
  retirementAge: number;
  targetRetirementIncome: number;
  lifeExpectancy?: number;
  inflationRate?: number;
  onSave?: (sources: IncomeSource[]) => void;
  initialSources?: IncomeSource[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INCOME_TYPE_CONFIG: Record<
  IncomeSourceType,
  {
    label: string;
    icon: React.ReactNode;
    color: string;
    category: IncomeCategory;
    description: string;
  }
> = {
  social_security: {
    label: "Social Security",
    icon: <Landmark className="w-4 h-4" />,
    color: "bg-blue-500",
    category: "guaranteed",
    description: "Federal retirement benefits based on work history",
  },
  pension: {
    label: "Pension",
    icon: <Building2 className="w-4 h-4" />,
    color: "bg-purple-500",
    category: "guaranteed",
    description: "Employer-sponsored defined benefit plan",
  },
  annuity: {
    label: "Annuity",
    icon: <Shield className="w-4 h-4" />,
    color: "bg-green-500",
    category: "guaranteed",
    description: "Insurance product providing guaranteed income",
  },
  "401k": {
    label: "401(k)",
    icon: <PiggyBank className="w-4 h-4" />,
    color: "bg-orange-500",
    category: "variable",
    description: "Employer-sponsored retirement savings",
  },
  ira: {
    label: "Traditional IRA",
    icon: <Briefcase className="w-4 h-4" />,
    color: "bg-yellow-500",
    category: "variable",
    description: "Individual retirement account (pre-tax)",
  },
  roth: {
    label: "Roth IRA/401(k)",
    icon: <Coins className="w-4 h-4" />,
    color: "bg-emerald-500",
    category: "variable",
    description: "Tax-free retirement withdrawals",
  },
  brokerage: {
    label: "Taxable Brokerage",
    icon: <LineChart className="w-4 h-4" />,
    color: "bg-cyan-500",
    category: "variable",
    description: "Non-retirement investment account",
  },
  rental: {
    label: "Rental Income",
    icon: <Heart className="w-4 h-4" />,
    color: "bg-pink-500",
    category: "variable",
    description: "Real estate investment income",
  },
  part_time: {
    label: "Part-Time Work",
    icon: <Clock className="w-4 h-4" />,
    color: "bg-indigo-500",
    category: "variable",
    description: "Continued employment in retirement",
  },
  other: {
    label: "Other Income",
    icon: <DollarSign className="w-4 h-4" />,
    color: "bg-gray-500",
    category: "variable",
    description: "Miscellaneous income sources",
  },
};

// Social Security benefit adjustments by claim age
const SS_ADJUSTMENT_FACTORS: Record<number, number> = {
  62: 0.70,
  63: 0.75,
  64: 0.80,
  65: 0.867,
  66: 0.933,
  67: 1.0, // FRA
  68: 1.08,
  69: 1.16,
  70: 1.24,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substring(2, 11);

const calculateSSBenefit = (fraAmount: number, claimAge: number): number => {
  const factor = SS_ADJUSTMENT_FACTORS[claimAge] || 1.0;
  return Math.round(fraAmount * factor);
};

const calculateSSLifetimeTotal = (
  monthlyBenefit: number,
  claimAge: number,
  lifeExpectancy: number
): number => {
  const yearsReceiving = Math.max(0, lifeExpectancy - claimAge);
  return monthlyBenefit * 12 * yearsReceiving;
};

const calculateSSBreakEven = (
  earlyBenefit: number,
  lateBenefit: number,
  earlyAge: number,
  lateAge: number
): number => {
  if (lateBenefit <= earlyBenefit) return Infinity;
  const yearsDifference = lateAge - earlyAge;
  const annualEarly = earlyBenefit * 12;
  const annualLate = lateBenefit * 12;
  const foregoneIncome = yearsDifference * annualEarly;
  const annualGain = annualLate - annualEarly;
  return lateAge + Math.ceil(foregoneIncome / annualGain);
};

const calculatePensionPV = (
  annualPayment: number,
  years: number,
  discountRate: number,
  cola: number = 0
): number => {
  let pv = 0;
  for (let y = 0; y < years; y++) {
    const adjustedPayment = annualPayment * Math.pow(1 + cola, y);
    pv += adjustedPayment / Math.pow(1 + discountRate, y + 1);
  }
  return pv;
};

const getGapSeverity = (
  gap: number,
  targetIncome: number
): "low" | "medium" | "high" | "critical" => {
  const ratio = gap / targetIncome;
  if (ratio <= 0.1) return "low";
  if (ratio <= 0.25) return "medium";
  if (ratio <= 0.5) return "high";
  return "critical";
};

// ============================================================================
// DRAGGABLE INCOME SOURCE COMPONENT
// ============================================================================

interface DraggableIncomeSourceProps {
  source: IncomeSource;
  index: number;
  currentAge: number;
  onUpdate: (id: string, updates: Partial<IncomeSource>) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const DraggableIncomeSource: React.FC<DraggableIncomeSourceProps> = ({
  source,
  index,
  currentAge,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isExpanded,
  onToggleExpand,
}) => {
  const config = INCOME_TYPE_CONFIG[source.type];
  const yearsUntilStart = Math.max(0, source.startAge - currentAge);
  const isActive = currentAge >= source.startAge && (source.endAge === null || currentAge <= source.endAge);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        "border rounded-lg transition-all duration-200",
        isDragging ? "opacity-50 scale-95" : "opacity-100",
        isActive ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : "border-border",
        "hover:shadow-md"
      )}
    >
      {/* Header Row */}
      <div className="flex items-center gap-3 p-4">
        {/* Drag Handle */}
        <div
          className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Order Badge */}
        <Badge variant="outline" className="font-mono min-w-[2rem] justify-center">
          {index + 1}
        </Badge>

        {/* Type Icon */}
        <div className={cn("p-2 rounded-full text-white", config.color)}>
          {config.icon}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold truncate">{source.name}</span>
            <Badge variant={source.category === "guaranteed" ? "default" : "secondary"}>
              {source.category === "guaranteed" ? (
                <Shield className="w-3 h-3 mr-1" />
              ) : (
                <LineChart className="w-3 h-3 mr-1" />
              )}
              {source.category}
            </Badge>
            {source.taxable && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">
                Taxable
              </Badge>
            )}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
            <span>{config.label}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>
              Age {source.startAge}
              {source.endAge ? ` - ${source.endAge}` : "+"}
            </span>
            {yearsUntilStart > 0 && (
              <>
                <span className="text-muted-foreground/50">|</span>
                <span className="text-blue-600 dark:text-blue-400">
                  Starts in {yearsUntilStart} {yearsUntilStart === 1 ? "year" : "years"}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Amount */}
        <div className="text-right">
          <div className="font-bold text-lg">{fmt(source.annualAmount)}</div>
          <div className="text-xs text-muted-foreground">/year</div>
        </div>

        {/* Expand/Collapse */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleExpand}
          aria-label={isExpanded ? "Collapse" : "Expand"}
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(source.id)}
          className="text-destructive hover:text-destructive"
          aria-label="Delete income source"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor={`name-${source.id}`}>Name</Label>
              <Input
                id={`name-${source.id}`}
                value={source.name}
                onChange={(e) => onUpdate(source.id, { name: e.target.value })}
              />
            </div>

            {/* Annual Amount */}
            <div className="space-y-2">
              <Label htmlFor={`amount-${source.id}`}>Annual Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id={`amount-${source.id}`}
                  type="number"
                  value={source.annualAmount}
                  onChange={(e) =>
                    onUpdate(source.id, { annualAmount: Number(e.target.value) || 0 })
                  }
                  className="pl-9"
                />
              </div>
            </div>

            {/* Start Age */}
            <div className="space-y-2">
              <Label htmlFor={`start-${source.id}`}>Start Age</Label>
              <Input
                id={`start-${source.id}`}
                type="number"
                min={currentAge}
                max={100}
                value={source.startAge}
                onChange={(e) =>
                  onUpdate(source.id, { startAge: Number(e.target.value) || currentAge })
                }
              />
            </div>

            {/* End Age */}
            <div className="space-y-2">
              <Label htmlFor={`end-${source.id}`}>End Age (blank = lifetime)</Label>
              <Input
                id={`end-${source.id}`}
                type="number"
                min={source.startAge}
                max={120}
                value={source.endAge || ""}
                onChange={(e) =>
                  onUpdate(source.id, {
                    endAge: e.target.value ? Number(e.target.value) : null,
                  })
                }
                placeholder="Lifetime"
              />
            </div>
          </div>

          {/* Toggles Row */}
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Switch
                id={`inflation-${source.id}`}
                checked={source.inflationAdjusted}
                onCheckedChange={(checked) =>
                  onUpdate(source.id, { inflationAdjusted: checked })
                }
              />
              <Label htmlFor={`inflation-${source.id}`} className="cursor-pointer">
                Inflation Adjusted
              </Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id={`taxable-${source.id}`}
                checked={source.taxable}
                onCheckedChange={(checked) => onUpdate(source.id, { taxable: checked })}
              />
              <Label htmlFor={`taxable-${source.id}`} className="cursor-pointer">
                Taxable Income
              </Label>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor={`notes-${source.id}`}>Notes</Label>
            <Input
              id={`notes-${source.id}`}
              value={source.notes || ""}
              onChange={(e) => onUpdate(source.id, { notes: e.target.value })}
              placeholder="Add any notes about this income source..."
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// YEAR-BY-YEAR INCOME TABLE
// ============================================================================

interface YearByYearTableProps {
  sources: IncomeSource[];
  currentAge: number;
  lifeExpectancy: number;
  targetIncome: number;
  inflationRate: number;
}

const YearByYearTable: React.FC<YearByYearTableProps> = ({
  sources,
  currentAge,
  lifeExpectancy,
  targetIncome,
  inflationRate,
}) => {
  const years = useMemo(() => {
    const result = [];
    for (let age = currentAge; age <= lifeExpectancy; age++) {
      const yearSources = sources.filter(
        (s) => age >= s.startAge && (s.endAge === null || age <= s.endAge)
      );
      const guaranteedIncome = yearSources
        .filter((s) => s.category === "guaranteed")
        .reduce((sum, s) => sum + s.annualAmount, 0);
      const variableIncome = yearSources
        .filter((s) => s.category === "variable")
        .reduce((sum, s) => sum + s.annualAmount, 0);
      const totalIncome = guaranteedIncome + variableIncome;
      const yearsFromNow = age - currentAge;
      const inflationAdjustedTarget = targetIncome * Math.pow(1 + inflationRate, yearsFromNow);
      const gap = inflationAdjustedTarget - totalIncome;

      result.push({
        age,
        year: new Date().getFullYear() + yearsFromNow,
        sources: yearSources,
        guaranteedIncome,
        variableIncome,
        totalIncome,
        target: inflationAdjustedTarget,
        gap,
        coveragePercent: (totalIncome / inflationAdjustedTarget) * 100,
      });
    }
    return result;
  }, [sources, currentAge, lifeExpectancy, targetIncome, inflationRate]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-background z-10">
          <tr className="border-b-2">
            <th className="py-3 px-4 text-left font-bold">Age</th>
            <th className="py-3 px-4 text-left font-bold">Year</th>
            <th className="py-3 px-4 text-right font-bold">
              <div className="flex items-center justify-end gap-1">
                <Shield className="w-4 h-4 text-green-600" />
                Guaranteed
              </div>
            </th>
            <th className="py-3 px-4 text-right font-bold">
              <div className="flex items-center justify-end gap-1">
                <LineChart className="w-4 h-4 text-blue-600" />
                Variable
              </div>
            </th>
            <th className="py-3 px-4 text-right font-bold">Total</th>
            <th className="py-3 px-4 text-right font-bold">Target</th>
            <th className="py-3 px-4 text-right font-bold">Gap</th>
            <th className="py-3 px-4 text-center font-bold">Coverage</th>
          </tr>
        </thead>
        <tbody>
          {years.map((row) => (
            <tr
              key={row.age}
              className={cn(
                "border-b hover:bg-muted/30 transition-colors",
                row.gap > 0 && "bg-red-50/50 dark:bg-red-950/10",
                row.gap <= 0 && "bg-green-50/30 dark:bg-green-950/10"
              )}
            >
              <td className="py-2 px-4 font-mono">{row.age}</td>
              <td className="py-2 px-4 font-mono text-muted-foreground">{row.year}</td>
              <td className="py-2 px-4 text-right font-mono text-green-700 dark:text-green-400">
                {fmt(row.guaranteedIncome)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-blue-700 dark:text-blue-400">
                {fmt(row.variableIncome)}
              </td>
              <td className="py-2 px-4 text-right font-mono font-semibold">
                {fmt(row.totalIncome)}
              </td>
              <td className="py-2 px-4 text-right font-mono text-muted-foreground">
                {fmt(row.target)}
              </td>
              <td
                className={cn(
                  "py-2 px-4 text-right font-mono",
                  row.gap > 0
                    ? "text-red-600 dark:text-red-400"
                    : "text-green-600 dark:text-green-400"
                )}
              >
                {row.gap > 0 ? `-${fmt(row.gap)}` : `+${fmt(Math.abs(row.gap))}`}
              </td>
              <td className="py-2 px-4">
                <div className="flex items-center justify-center gap-2">
                  <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        row.coveragePercent >= 100
                          ? "bg-green-500"
                          : row.coveragePercent >= 75
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      )}
                      style={{ width: `${Math.min(100, row.coveragePercent)}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs w-12 text-right">
                    {row.coveragePercent.toFixed(0)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ============================================================================
// GAP ANALYSIS COMPONENT
// ============================================================================

interface GapAnalysisProps {
  gaps: IncomeGap[];
  totalLifetimeGap: number;
  strategies: BridgeStrategy[];
  onApplyStrategy: (strategy: BridgeStrategy) => void;
}

const GapAnalysis: React.FC<GapAnalysisProps> = ({
  gaps,
  totalLifetimeGap,
  strategies,
  onApplyStrategy,
}) => {
  if (gaps.length === 0 && totalLifetimeGap <= 0) {
    return (
      <Card className="border-green-500 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-semibold text-green-800 dark:text-green-200">
                No Income Gaps Detected
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Your income sources fully cover your target retirement income throughout retirement.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Alert */}
      <Card className="border-amber-500 bg-amber-50/50 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-8 h-8 text-amber-600 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <h3 className="font-semibold text-amber-800 dark:text-amber-200">
                Income Gaps Identified
              </h3>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                We found {gaps.length} period{gaps.length !== 1 ? "s" : ""} where your income
                falls short of your target. Total lifetime shortfall:{" "}
                <span className="font-bold">{fmt(totalLifetimeGap)}</span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gap Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gaps.map((gap, index) => (
          <Card
            key={index}
            className={cn(
              "border-l-4",
              gap.severity === "critical"
                ? "border-l-red-500"
                : gap.severity === "high"
                ? "border-l-orange-500"
                : gap.severity === "medium"
                ? "border-l-yellow-500"
                : "border-l-blue-500"
            )}
          >
            <CardContent className="pt-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="text-sm text-muted-foreground">
                    Ages {gap.startAge} - {gap.endAge}
                  </div>
                  <div className="font-semibold text-lg">
                    {fmt(gap.annualGap)}
                    <span className="text-sm font-normal text-muted-foreground">/year</span>
                  </div>
                </div>
                <Badge
                  variant={
                    gap.severity === "critical" || gap.severity === "high"
                      ? "destructive"
                      : "secondary"
                  }
                >
                  {gap.severity}
                </Badge>
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                Total gap: {fmt(gap.totalGap)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bridge Strategies */}
      {strategies.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Zap className="w-5 h-5 text-purple-600" />
              Suggested Bridge Strategies
            </CardTitle>
            <CardDescription>
              Consider these strategies to fill your income gaps
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {strategies.map((strategy, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-semibold">{strategy.name}</div>
                  <div className="text-sm text-muted-foreground">{strategy.description}</div>
                  <div className="flex items-center gap-4 mt-2 text-xs">
                    <span>Ages {strategy.startAge} - {strategy.endAge}</span>
                    <span>{fmt(strategy.annualWithdrawal)}/year</span>
                    <Badge
                      variant="outline"
                      className={cn(
                        strategy.taxEfficiency === "high"
                          ? "text-green-600 border-green-300"
                          : strategy.taxEfficiency === "medium"
                          ? "text-yellow-600 border-yellow-300"
                          : "text-red-600 border-red-300"
                      )}
                    >
                      {strategy.taxEfficiency} tax efficiency
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onApplyStrategy(strategy)}
                >
                  Apply
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

// ============================================================================
// SOCIAL SECURITY OPTIMIZER
// ============================================================================

interface SocialSecurityOptimizerProps {
  fraMonthlyBenefit: number;
  lifeExpectancy: number;
  onSelectClaimAge: (age: number, annualBenefit: number) => void;
}

const SocialSecurityOptimizer: React.FC<SocialSecurityOptimizerProps> = ({
  fraMonthlyBenefit,
  lifeExpectancy,
  onSelectClaimAge,
}) => {
  const [selectedAge, setSelectedAge] = useState(67);

  const scenarios = useMemo(() => {
    const ages = [62, 63, 64, 65, 66, 67, 68, 69, 70];
    return ages.map((claimAge) => {
      const monthlyBenefit = calculateSSBenefit(fraMonthlyBenefit, claimAge);
      const annualBenefit = monthlyBenefit * 12;
      const lifetimeTotal = calculateSSLifetimeTotal(monthlyBenefit, claimAge, lifeExpectancy);

      // Calculate break-even vs claiming at 62
      const earlyBenefit = calculateSSBenefit(fraMonthlyBenefit, 62);
      const breakEvenAge =
        claimAge === 62
          ? 62
          : calculateSSBreakEven(earlyBenefit, monthlyBenefit, 62, claimAge);

      return {
        claimAge,
        monthlyBenefit,
        annualBenefit,
        lifetimeTotal,
        breakEvenAge,
        percentOfFRA: (monthlyBenefit / fraMonthlyBenefit) * 100,
      };
    });
  }, [fraMonthlyBenefit, lifeExpectancy]);

  const optimalAge = useMemo(() => {
    let best = scenarios[0];
    for (const s of scenarios) {
      if (s.lifetimeTotal > best.lifetimeTotal) {
        best = s;
      }
    }
    return best.claimAge;
  }, [scenarios]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Landmark className="w-5 h-5 text-blue-600" />
          Social Security Timing Optimizer
        </CardTitle>
        <CardDescription>
          Compare claiming ages to maximize lifetime benefits based on your life expectancy of{" "}
          {lifeExpectancy}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Slider */}
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Early (Reduced)</span>
            <span>Full Retirement Age</span>
            <span>Delayed (Increased)</span>
          </div>
          <Slider
            value={[selectedAge]}
            min={62}
            max={70}
            step={1}
            onValueChange={(value) => setSelectedAge(value[0])}
            className="py-4"
          />
          <div className="flex justify-between text-xs font-mono">
            {[62, 63, 64, 65, 66, 67, 68, 69, 70].map((age) => (
              <span
                key={age}
                className={cn(
                  age === selectedAge && "font-bold text-primary",
                  age === optimalAge && "text-green-600"
                )}
              >
                {age}
              </span>
            ))}
          </div>
        </div>

        {/* Selected Scenario Details */}
        {scenarios.find((s) => s.claimAge === selectedAge) && (
          <div className="p-4 border rounded-lg bg-muted/30">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Monthly Benefit</div>
                <div className="text-2xl font-bold">
                  {fmtFull(scenarios.find((s) => s.claimAge === selectedAge)!.monthlyBenefit)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Annual Benefit</div>
                <div className="text-2xl font-bold">
                  {fmt(scenarios.find((s) => s.claimAge === selectedAge)!.annualBenefit)}
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">% of FRA Benefit</div>
                <div className="text-2xl font-bold">
                  {scenarios.find((s) => s.claimAge === selectedAge)!.percentOfFRA.toFixed(0)}%
                </div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Lifetime Total</div>
                <div className="text-2xl font-bold">
                  {fmt(scenarios.find((s) => s.claimAge === selectedAge)!.lifetimeTotal)}
                </div>
              </div>
            </div>
            {selectedAge !== 62 && (
              <div className="mt-4 text-sm text-muted-foreground">
                Break-even vs. claiming at 62:{" "}
                <span className="font-semibold">
                  Age {scenarios.find((s) => s.claimAge === selectedAge)!.breakEvenAge}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b-2">
              <tr>
                <th className="py-2 px-3 text-left">Claim Age</th>
                <th className="py-2 px-3 text-right">Monthly</th>
                <th className="py-2 px-3 text-right">Annual</th>
                <th className="py-2 px-3 text-right">% of FRA</th>
                <th className="py-2 px-3 text-right">Lifetime Total</th>
                <th className="py-2 px-3 text-center">Break-Even</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => (
                <tr
                  key={scenario.claimAge}
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors cursor-pointer",
                    scenario.claimAge === selectedAge && "bg-primary/10",
                    scenario.claimAge === optimalAge && "bg-green-50 dark:bg-green-950/20"
                  )}
                  onClick={() => setSelectedAge(scenario.claimAge)}
                >
                  <td className="py-2 px-3 font-mono">
                    {scenario.claimAge}
                    {scenario.claimAge === 67 && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        FRA
                      </Badge>
                    )}
                    {scenario.claimAge === optimalAge && (
                      <Badge className="ml-2 text-xs bg-green-600">Optimal</Badge>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">
                    {fmtFull(scenario.monthlyBenefit)}
                  </td>
                  <td className="py-2 px-3 text-right font-mono">{fmt(scenario.annualBenefit)}</td>
                  <td className="py-2 px-3 text-right font-mono">
                    {scenario.percentOfFRA.toFixed(0)}%
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-semibold">
                    {fmt(scenario.lifetimeTotal)}
                  </td>
                  <td className="py-2 px-3 text-center font-mono">
                    {scenario.claimAge === 62 ? "-" : scenario.breakEvenAge}
                  </td>
                  <td className="py-2 px-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectClaimAge(scenario.claimAge, scenario.annualBenefit);
                      }}
                    >
                      Use
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
          <Info className="w-4 h-4 inline mr-1" />
          Analysis assumes a life expectancy of {lifeExpectancy}. Benefits are reduced by 5/9 of 1%
          per month for the first 36 months before FRA, and 5/12 of 1% per month thereafter. Delayed
          credits of 8% per year apply after FRA up to age 70.
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// PENSION VS LUMP SUM ANALYZER
// ============================================================================

interface PensionAnalyzerProps {
  onSelectOption: (type: "annuity" | "lump_sum", value: number) => void;
}

const PensionAnalyzer: React.FC<PensionAnalyzerProps> = ({ onSelectOption }) => {
  const [annuityAmount, setAnnuityAmount] = useState(36000);
  const [lumpSum, setLumpSum] = useState(500000);
  const [discountRate, setDiscountRate] = useState(5);
  const [yearsToReceive, setYearsToReceive] = useState(25);
  const [cola, setCola] = useState(0);

  const analysis = useMemo((): PensionComparison => {
    const pv = calculatePensionPV(annuityAmount, yearsToReceive, discountRate / 100, cola / 100);
    const breakEvenYears = lumpSum > 0 ? Math.ceil(lumpSum / annuityAmount) : 0;

    let recommendation: "annuity" | "lump_sum" | "neutral";
    if (pv > lumpSum * 1.1) {
      recommendation = "annuity";
    } else if (lumpSum > pv * 1.1) {
      recommendation = "lump_sum";
    } else {
      recommendation = "neutral";
    }

    return {
      annuityValue: pv,
      lumpSumValue: lumpSum,
      discountRate: discountRate / 100,
      breakEvenYears,
      recommendation,
    };
  }, [annuityAmount, lumpSum, discountRate, yearsToReceive, cola]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="w-5 h-5 text-purple-600" />
          Pension vs. Lump Sum Analysis
        </CardTitle>
        <CardDescription>
          Compare the present value of pension payments against a lump sum offer
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label>Annual Pension Payment</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={annuityAmount}
                onChange={(e) => setAnnuityAmount(Number(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Lump Sum Offer</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                value={lumpSum}
                onChange={(e) => setLumpSum(Number(e.target.value) || 0)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Expected Years to Receive</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={yearsToReceive}
              onChange={(e) => setYearsToReceive(Number(e.target.value) || 25)}
            />
          </div>

          <div className="space-y-2">
            <Label>Discount Rate (%)</Label>
            <Input
              type="number"
              min={0}
              max={15}
              step={0.5}
              value={discountRate}
              onChange={(e) => setDiscountRate(Number(e.target.value) || 5)}
            />
          </div>
        </div>

        {/* COLA Toggle */}
        <div className="flex items-center gap-4">
          <Label>Cost of Living Adjustment (COLA)</Label>
          <Input
            type="number"
            min={0}
            max={5}
            step={0.5}
            value={cola}
            onChange={(e) => setCola(Number(e.target.value) || 0)}
            className="w-24"
          />
          <span className="text-sm text-muted-foreground">% per year</span>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            className={cn(
              "border-2",
              analysis.recommendation === "annuity" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""
            )}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Pension Present Value</div>
              <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                {fmt(analysis.annuityValue)}
              </div>
              {analysis.recommendation === "annuity" && (
                <Badge className="mt-2 bg-green-600">Recommended</Badge>
              )}
            </CardContent>
          </Card>

          <Card
            className={cn(
              "border-2",
              analysis.recommendation === "lump_sum" ? "border-green-500 bg-green-50/50 dark:bg-green-950/20" : ""
            )}
          >
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Lump Sum Value</div>
              <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
                {fmt(analysis.lumpSumValue)}
              </div>
              {analysis.recommendation === "lump_sum" && (
                <Badge className="mt-2 bg-green-600">Recommended</Badge>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="text-sm text-muted-foreground">Break-Even Point</div>
              <div className="text-2xl font-bold">{analysis.breakEvenYears} years</div>
              <div className="text-xs text-muted-foreground mt-1">
                Time to recover lump sum at pension rate
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Value Comparison Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Pension PV</span>
            <span>Lump Sum</span>
          </div>
          <div className="relative h-8 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-purple-500 flex items-center justify-end pr-2 text-white text-xs font-semibold"
              style={{
                width: `${(analysis.annuityValue / (analysis.annuityValue + analysis.lumpSumValue)) * 100}%`,
              }}
            >
              {fmt(analysis.annuityValue)}
            </div>
            <div
              className="absolute right-0 top-0 h-full bg-orange-500 flex items-center justify-start pl-2 text-white text-xs font-semibold"
              style={{
                width: `${(analysis.lumpSumValue / (analysis.annuityValue + analysis.lumpSumValue)) * 100}%`,
              }}
            >
              {fmt(analysis.lumpSumValue)}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Button
            variant={analysis.recommendation === "annuity" ? "default" : "outline"}
            onClick={() => onSelectOption("annuity", annuityAmount)}
          >
            Use Pension Annuity
          </Button>
          <Button
            variant={analysis.recommendation === "lump_sum" ? "default" : "outline"}
            onClick={() => onSelectOption("lump_sum", lumpSum)}
          >
            Take Lump Sum
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg">
          <Info className="w-4 h-4 inline mr-1" />
          The discount rate represents your expected investment return if taking the lump sum. A
          higher rate makes the lump sum more attractive. Consider your risk tolerance, health, and
          other guaranteed income sources when deciding.
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// INCOME MIX VISUALIZER
// ============================================================================

interface IncomeMixVisualizerProps {
  sources: IncomeSource[];
  currentAge: number;
  lifeExpectancy: number;
}

const IncomeMixVisualizer: React.FC<IncomeMixVisualizerProps> = ({
  sources,
  currentAge,
  lifeExpectancy,
}) => {
  const [selectedAge, setSelectedAge] = useState(currentAge);

  const mixAtAge = useMemo(() => {
    const activeSources = sources.filter(
      (s) => selectedAge >= s.startAge && (s.endAge === null || selectedAge <= s.endAge)
    );

    const guaranteed = activeSources
      .filter((s) => s.category === "guaranteed")
      .reduce((sum, s) => sum + s.annualAmount, 0);
    const variable = activeSources
      .filter((s) => s.category === "variable")
      .reduce((sum, s) => sum + s.annualAmount, 0);
    const total = guaranteed + variable;

    return {
      sources: activeSources,
      guaranteed,
      variable,
      total,
      guaranteedPct: total > 0 ? (guaranteed / total) * 100 : 0,
      variablePct: total > 0 ? (variable / total) * 100 : 0,
    };
  }, [sources, selectedAge]);

  const getRecommendation = (guaranteedPct: number): { status: string; message: string } => {
    if (guaranteedPct >= 70) {
      return {
        status: "Excellent",
        message: "Strong guaranteed income foundation provides security against market volatility.",
      };
    } else if (guaranteedPct >= 50) {
      return {
        status: "Good",
        message: "Balanced mix of guaranteed and variable income. Consider your risk tolerance.",
      };
    } else if (guaranteedPct >= 30) {
      return {
        status: "Moderate",
        message:
          "Higher reliance on variable income. Ensure you can weather market downturns.",
      };
    } else {
      return {
        status: "Review Needed",
        message:
          "Heavy reliance on variable income. Consider adding guaranteed sources like annuities.",
      };
    }
  };

  const recommendation = getRecommendation(mixAtAge.guaranteedPct);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cyan-600" />
          Guaranteed vs. Variable Income Mix
        </CardTitle>
        <CardDescription>
          Analyze your income stability and market exposure at different ages
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Age Selector */}
        <div className="space-y-2">
          <Label>View income mix at age: {selectedAge}</Label>
          <Slider
            value={[selectedAge]}
            min={currentAge}
            max={lifeExpectancy}
            step={1}
            onValueChange={(value) => setSelectedAge(value[0])}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Age {currentAge}</span>
            <span>Age {lifeExpectancy}</span>
          </div>
        </div>

        {/* Mix Visualization */}
        <div className="space-y-4">
          <div className="relative h-16 bg-muted rounded-lg overflow-hidden flex">
            {mixAtAge.guaranteedPct > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-600 flex items-center justify-center text-white font-semibold transition-all duration-300"
                      style={{ width: `${mixAtAge.guaranteedPct}%` }}
                    >
                      {mixAtAge.guaranteedPct >= 15 && (
                        <div className="flex items-center gap-1">
                          <Shield className="w-4 h-4" />
                          {mixAtAge.guaranteedPct.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Guaranteed Income: {fmt(mixAtAge.guaranteed)}/year</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {mixAtAge.variablePct > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold transition-all duration-300"
                      style={{ width: `${mixAtAge.variablePct}%` }}
                    >
                      {mixAtAge.variablePct >= 15 && (
                        <div className="flex items-center gap-1">
                          <LineChart className="w-4 h-4" />
                          {mixAtAge.variablePct.toFixed(0)}%
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Variable Income: {fmt(mixAtAge.variable)}/year</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {mixAtAge.total === 0 && (
              <div className="w-full flex items-center justify-center text-muted-foreground">
                No income sources active at this age
              </div>
            )}
          </div>

          {/* Legend */}
          <div className="flex justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-green-500"></div>
              <span className="text-sm">
                Guaranteed: {fmt(mixAtAge.guaranteed)} ({mixAtAge.guaranteedPct.toFixed(0)}%)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-blue-500"></div>
              <span className="text-sm">
                Variable: {fmt(mixAtAge.variable)} ({mixAtAge.variablePct.toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <Card
          className={cn(
            "border-l-4",
            recommendation.status === "Excellent"
              ? "border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
              : recommendation.status === "Good"
              ? "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
              : recommendation.status === "Moderate"
              ? "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20"
              : "border-l-red-500 bg-red-50/50 dark:bg-red-950/20"
          )}
        >
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              <Target className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold">{recommendation.status}</div>
                <p className="text-sm text-muted-foreground">{recommendation.message}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Active Sources List */}
        {mixAtAge.sources.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Active Income Sources at Age {selectedAge}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {mixAtAge.sources.map((source) => {
                const config = INCOME_TYPE_CONFIG[source.type];
                return (
                  <div
                    key={source.id}
                    className="flex items-center gap-2 p-2 border rounded text-sm"
                  >
                    <div className={cn("p-1 rounded text-white", config.color)}>
                      {config.icon}
                    </div>
                    <span className="flex-1">{source.name}</span>
                    <Badge variant={source.category === "guaranteed" ? "default" : "secondary"}>
                      {source.category}
                    </Badge>
                    <span className="font-mono">{fmt(source.annualAmount)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IncomeLadder: React.FC<IncomeLadderProps> = ({
  currentAge,
  retirementAge,
  targetRetirementIncome,
  lifeExpectancy = 95,
  inflationRate = 0.025,
  onSave,
  initialSources = [],
}) => {
  // State
  const [sources, setSources] = useState<IncomeSource[]>(
    initialSources.length > 0
      ? initialSources
      : [
          // Default sample sources
          {
            id: generateId(),
            name: "Social Security - Self",
            type: "social_security",
            category: "guaranteed",
            annualAmount: 30000,
            startAge: 67,
            endAge: null,
            inflationAdjusted: true,
            taxable: true,
            order: 0,
          },
          {
            id: generateId(),
            name: "401(k) Withdrawals",
            type: "401k",
            category: "variable",
            annualAmount: 40000,
            startAge: retirementAge,
            endAge: null,
            inflationAdjusted: false,
            taxable: true,
            order: 1,
          },
        ]
  );

  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("ladder");

  // SS Optimizer State
  const [ssMonthlyBenefit, setSSMonthlyBenefit] = useState(2500);

  // Handlers
  const addSource = useCallback((type: IncomeSourceType) => {
    const config = INCOME_TYPE_CONFIG[type];
    const newSource: IncomeSource = {
      id: generateId(),
      name: config.label,
      type,
      category: config.category,
      annualAmount: 0,
      startAge: retirementAge,
      endAge: null,
      inflationAdjusted: type === "social_security",
      taxable: type !== "roth",
      order: sources.length,
    };
    setSources((prev) => [...prev, newSource]);
    setExpandedIds((prev) => new Set([...prev, newSource.id]));
  }, [retirementAge, sources.length]);

  const updateSource = useCallback((id: string, updates: Partial<IncomeSource>) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
  }, []);

  const deleteSource = useCallback((id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Drag and Drop
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, targetIndex: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;

      setSources((prev) => {
        const items = [...prev];
        const [draggedItem] = items.splice(draggedIndex, 1);
        items.splice(targetIndex, 0, draggedItem);
        return items.map((item, idx) => ({ ...item, order: idx }));
      });
      setDraggedIndex(targetIndex);
    },
    [draggedIndex]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  // Gap Analysis
  const gapAnalysis = useMemo(() => {
    const gaps: IncomeGap[] = [];
    let totalLifetimeGap = 0;

    for (let age = retirementAge; age <= lifeExpectancy; age++) {
      const activeSources = sources.filter(
        (s) => age >= s.startAge && (s.endAge === null || age <= s.endAge)
      );
      const totalIncome = activeSources.reduce((sum, s) => sum + s.annualAmount, 0);
      const yearsFromNow = age - currentAge;
      const inflationAdjustedTarget = targetRetirementIncome * Math.pow(1 + inflationRate, yearsFromNow);
      const gap = inflationAdjustedTarget - totalIncome;

      if (gap > 0) {
        totalLifetimeGap += gap;

        // Merge with previous gap if consecutive
        const lastGap = gaps[gaps.length - 1];
        if (lastGap && lastGap.endAge === age - 1 && Math.abs(lastGap.annualGap - gap) < 1000) {
          lastGap.endAge = age;
          lastGap.totalGap += gap;
        } else {
          gaps.push({
            startAge: age,
            endAge: age,
            annualGap: gap,
            totalGap: gap,
            severity: getGapSeverity(gap, targetRetirementIncome),
          });
        }
      }
    }

    return { gaps, totalLifetimeGap };
  }, [sources, retirementAge, lifeExpectancy, currentAge, targetRetirementIncome, inflationRate]);

  // Bridge Strategies
  const bridgeStrategies = useMemo((): BridgeStrategy[] => {
    const strategies: BridgeStrategy[] = [];

    // Early retirement to SS bridge
    const ssSource = sources.find((s) => s.type === "social_security");
    if (ssSource && retirementAge < ssSource.startAge) {
      strategies.push({
        name: "Roth IRA Bridge",
        description: "Use Roth IRA for tax-free early retirement income",
        sources: ["Roth IRA"],
        startAge: retirementAge,
        endAge: ssSource.startAge - 1,
        annualWithdrawal:
          gapAnalysis.gaps.find((g) => g.startAge <= retirementAge)?.annualGap || 30000,
        taxEfficiency: "high",
      });

      strategies.push({
        name: "Taxable Account Bridge",
        description: "Draw from taxable brokerage for LTCG tax rates",
        sources: ["Taxable Brokerage"],
        startAge: retirementAge,
        endAge: ssSource.startAge - 1,
        annualWithdrawal:
          gapAnalysis.gaps.find((g) => g.startAge <= retirementAge)?.annualGap || 30000,
        taxEfficiency: "medium",
      });
    }

    // Part-time work strategy
    if (gapAnalysis.gaps.some((g) => g.startAge < 70)) {
      strategies.push({
        name: "Part-Time Work Bridge",
        description: "Supplement income with part-time employment",
        sources: ["Part-Time Work"],
        startAge: retirementAge,
        endAge: 70,
        annualWithdrawal: Math.min(
          20000,
          gapAnalysis.gaps.find((g) => g.startAge <= retirementAge)?.annualGap || 20000
        ),
        taxEfficiency: "low",
      });
    }

    return strategies;
  }, [sources, retirementAge, gapAnalysis.gaps]);

  // Handle SS Optimizer Selection
  const handleSSClaimAge = useCallback(
    (age: number, annualBenefit: number) => {
      const existingSS = sources.find((s) => s.type === "social_security");
      if (existingSS) {
        updateSource(existingSS.id, {
          startAge: age,
          annualAmount: annualBenefit,
          ssClaimAge: age,
        });
      } else {
        const newSource: IncomeSource = {
          id: generateId(),
          name: "Social Security",
          type: "social_security",
          category: "guaranteed",
          annualAmount: annualBenefit,
          startAge: age,
          endAge: null,
          inflationAdjusted: true,
          taxable: true,
          ssClaimAge: age,
          order: sources.length,
        };
        setSources((prev) => [...prev, newSource]);
      }
      setActiveTab("ladder");
    },
    [sources, updateSource]
  );

  // Handle Pension Selection
  const handlePensionOption = useCallback(
    (type: "annuity" | "lump_sum", value: number) => {
      if (type === "annuity") {
        const newSource: IncomeSource = {
          id: generateId(),
          name: "Pension Annuity",
          type: "pension",
          category: "guaranteed",
          annualAmount: value,
          startAge: retirementAge,
          endAge: null,
          inflationAdjusted: false,
          taxable: true,
          order: sources.length,
        };
        setSources((prev) => [...prev, newSource]);
      }
      // Lump sum would typically be added to investment accounts
      setActiveTab("ladder");
    },
    [retirementAge, sources.length]
  );

  // Handle Bridge Strategy Apply
  const handleApplyStrategy = useCallback(
    (strategy: BridgeStrategy) => {
      const sourceType =
        strategy.sources[0] === "Roth IRA"
          ? "roth"
          : strategy.sources[0] === "Taxable Brokerage"
          ? "brokerage"
          : "part_time";

      const newSource: IncomeSource = {
        id: generateId(),
        name: strategy.name,
        type: sourceType,
        category: "variable",
        annualAmount: strategy.annualWithdrawal,
        startAge: strategy.startAge,
        endAge: strategy.endAge,
        inflationAdjusted: false,
        taxable: sourceType !== "roth",
        order: sources.length,
      };
      setSources((prev) => [...prev, newSource]);
    },
    [sources.length]
  );

  // Summary Stats
  const summaryStats = useMemo(() => {
    const atRetirement = sources
      .filter(
        (s) =>
          retirementAge >= s.startAge && (s.endAge === null || retirementAge <= s.endAge)
      )
      .reduce((sum, s) => sum + s.annualAmount, 0);

    const guaranteed = sources
      .filter((s) => s.category === "guaranteed")
      .reduce((sum, s) => sum + s.annualAmount, 0);

    const variable = sources
      .filter((s) => s.category === "variable")
      .reduce((sum, s) => sum + s.annualAmount, 0);

    return {
      totalSources: sources.length,
      atRetirement,
      guaranteed,
      variable,
      coverageAtRetirement: (atRetirement / targetRetirementIncome) * 100,
    };
  }, [sources, retirementAge, targetRetirementIncome]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-600" />
            Retirement Income Ladder
          </CardTitle>
          <CardDescription>
            Plan the perfect income sequence for retirement. Drag to reorder priority, analyze gaps,
            and optimize timing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{summaryStats.totalSources}</div>
              <div className="text-sm text-muted-foreground">Income Sources</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{fmt(summaryStats.atRetirement)}</div>
              <div className="text-sm text-muted-foreground">At Retirement</div>
            </div>
            <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
              <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                {fmt(summaryStats.guaranteed)}
              </div>
              <div className="text-sm text-muted-foreground">Guaranteed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
              <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                {fmt(summaryStats.variable)}
              </div>
              <div className="text-sm text-muted-foreground">Variable</div>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div
                className={cn(
                  "text-2xl font-bold",
                  summaryStats.coverageAtRetirement >= 100
                    ? "text-green-600"
                    : summaryStats.coverageAtRetirement >= 75
                    ? "text-yellow-600"
                    : "text-red-600"
                )}
              >
                {summaryStats.coverageAtRetirement.toFixed(0)}%
              </div>
              <div className="text-sm text-muted-foreground">Target Coverage</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 h-auto">
          <TabsTrigger value="ladder" className="gap-1">
            <GripVertical className="w-4 h-4" />
            <span className="hidden sm:inline">Ladder</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1">
            <Calendar className="w-4 h-4" />
            <span className="hidden sm:inline">Timeline</span>
          </TabsTrigger>
          <TabsTrigger value="gaps" className="gap-1">
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Gaps</span>
          </TabsTrigger>
          <TabsTrigger value="ss-optimizer" className="gap-1">
            <Landmark className="w-4 h-4" />
            <span className="hidden sm:inline">SS Timing</span>
          </TabsTrigger>
          <TabsTrigger value="pension" className="gap-1">
            <Scale className="w-4 h-4" />
            <span className="hidden sm:inline">Pension</span>
          </TabsTrigger>
          <TabsTrigger value="mix" className="gap-1">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Mix</span>
          </TabsTrigger>
        </TabsList>

        {/* Ladder Tab - Drag and Drop Sources */}
        <TabsContent value="ladder" className="space-y-4">
          {/* Add Source Dropdown */}
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(value) => addSource(value as IncomeSourceType)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Add income source..." />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(INCOME_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1 rounded text-white", config.color)}>
                        {config.icon}
                      </div>
                      {config.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">
              Drag items to set withdrawal priority order
            </span>
          </div>

          {/* Draggable Source List */}
          <div className="space-y-3">
            {sources
              .sort((a, b) => a.order - b.order)
              .map((source, index) => (
                <DraggableIncomeSource
                  key={source.id}
                  source={source}
                  index={index}
                  currentAge={currentAge}
                  onUpdate={updateSource}
                  onDelete={deleteSource}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={draggedIndex === index}
                  isExpanded={expandedIds.has(source.id)}
                  onToggleExpand={() => toggleExpand(source.id)}
                />
              ))}
          </div>

          {sources.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Plus className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Income Sources</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add your retirement income sources to build your income ladder
                </p>
                <Select onValueChange={(value) => addSource(value as IncomeSourceType)}>
                  <SelectTrigger className="w-[200px] mx-auto">
                    <SelectValue placeholder="Add first source..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(INCOME_TYPE_CONFIG).map(([type, config]) => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <div className={cn("p-1 rounded text-white", config.color)}>
                            {config.icon}
                          </div>
                          {config.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Timeline Tab - Year by Year */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Year-by-Year Income Projection
              </CardTitle>
              <CardDescription>
                See how your income sources stack up against your target throughout retirement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <YearByYearTable
                sources={sources}
                currentAge={retirementAge}
                lifeExpectancy={lifeExpectancy}
                targetIncome={targetRetirementIncome}
                inflationRate={inflationRate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Gap Analysis Tab */}
        <TabsContent value="gaps">
          <GapAnalysis
            gaps={gapAnalysis.gaps}
            totalLifetimeGap={gapAnalysis.totalLifetimeGap}
            strategies={bridgeStrategies}
            onApplyStrategy={handleApplyStrategy}
          />
        </TabsContent>

        {/* Social Security Optimizer Tab */}
        <TabsContent value="ss-optimizer">
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <div className="flex-1 space-y-2">
                    <Label>Your Monthly Benefit at Full Retirement Age (67)</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={ssMonthlyBenefit}
                        onChange={(e) => setSSMonthlyBenefit(Number(e.target.value) || 2500)}
                        className="pl-9"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Find this on your Social Security statement at ssa.gov
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <SocialSecurityOptimizer
              fraMonthlyBenefit={ssMonthlyBenefit}
              lifeExpectancy={lifeExpectancy}
              onSelectClaimAge={handleSSClaimAge}
            />
          </div>
        </TabsContent>

        {/* Pension Analysis Tab */}
        <TabsContent value="pension">
          <PensionAnalyzer onSelectOption={handlePensionOption} />
        </TabsContent>

        {/* Income Mix Tab */}
        <TabsContent value="mix">
          <IncomeMixVisualizer
            sources={sources}
            currentAge={retirementAge}
            lifeExpectancy={lifeExpectancy}
          />
        </TabsContent>
      </Tabs>

      {/* Save Button */}
      {onSave && (
        <div className="flex justify-end">
          <Button onClick={() => onSave(sources)} className="gap-2">
            <CheckCircle2 className="w-4 h-4" />
            Save Income Plan
          </Button>
        </div>
      )}
    </div>
  );
};

export default IncomeLadder;
