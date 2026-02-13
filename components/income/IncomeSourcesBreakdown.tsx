"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartConfig,
} from "@/components/ui/chart";
import {
  Shield,
  TrendingUp,
  Info,
  DollarSign,
  Briefcase,
  Building2,
  Landmark,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, fmtFull } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface IncomeSource {
  /** Unique identifier for the income source */
  id: string;
  /** Display name */
  name: string;
  /** Annual amount (nominal) */
  amount: number;
  /** Start age for this income source */
  startAge: number;
  /** End age for this income source (null = lifetime) */
  endAge: number | null;
  /** Type of income for tax purposes */
  taxType: "taxable" | "tax-deferred" | "tax-free";
  /** Whether this income is guaranteed (SS, pension) or variable (investments) */
  reliability: "guaranteed" | "variable";
  /** Optional inflation adjustment rate (decimal, e.g., 0.02 for 2%) */
  inflationAdjustment?: number;
  /** Color for chart visualization */
  color?: string;
}

export interface IncomeSourcesBreakdownProps {
  /** Current age of primary person */
  currentAge: number;
  /** Planned retirement age */
  retirementAge: number;
  /** Expected end of simulation age */
  endAge?: number;
  /** Social Security benefit (annual) */
  socialSecurityIncome?: number;
  /** Social Security claim age */
  socialSecurityStartAge?: number;
  /** Spouse Social Security benefit (annual) */
  spouseSocialSecurityIncome?: number;
  /** Spouse Social Security claim age */
  spouseSocialSecurityStartAge?: number;
  /** 401k/IRA withdrawal amount (annual) */
  traditionalWithdrawal?: number;
  /** Roth withdrawal amount (annual) */
  rothWithdrawal?: number;
  /** Pension income (annual) */
  pensionIncome?: number;
  /** Pension start age */
  pensionStartAge?: number;
  /** Part-time work income (annual) */
  partTimeIncome?: number;
  /** Part-time work end age */
  partTimeEndAge?: number;
  /** Other income sources */
  otherIncomeSources?: IncomeSource[];
  /** Minimum annual income needed (for floor analysis) */
  minimumIncomeNeeded?: number;
  /** Inflation rate for projections */
  inflationRate?: number;
  /** Whether to show real (inflation-adjusted) values */
  showRealValues?: boolean;
  /** Whether the component is in a loading state */
  isLoading?: boolean;
  /** Custom chart height */
  chartHeight?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const INCOME_SOURCE_COLORS = {
  socialSecurity: "hsl(220, 70%, 50%)",      // Blue
  spouseSocialSecurity: "hsl(220, 70%, 65%)", // Lighter blue
  traditional401k: "hsl(280, 60%, 50%)",      // Purple
  roth: "hsl(150, 60%, 45%)",                 // Green
  pension: "hsl(35, 80%, 50%)",               // Orange
  partTime: "hsl(340, 65%, 50%)",             // Pink/Red
  other: "hsl(180, 50%, 45%)",                // Teal
};

const CHART_CONFIG: ChartConfig = {
  socialSecurity: {
    label: "Social Security",
    color: INCOME_SOURCE_COLORS.socialSecurity,
  },
  spouseSocialSecurity: {
    label: "Spouse SS",
    color: INCOME_SOURCE_COLORS.spouseSocialSecurity,
  },
  traditional401k: {
    label: "401(k)/IRA",
    color: INCOME_SOURCE_COLORS.traditional401k,
  },
  roth: {
    label: "Roth",
    color: INCOME_SOURCE_COLORS.roth,
  },
  pension: {
    label: "Pension",
    color: INCOME_SOURCE_COLORS.pension,
  },
  partTime: {
    label: "Part-time Work",
    color: INCOME_SOURCE_COLORS.partTime,
  },
  other: {
    label: "Other",
    color: INCOME_SOURCE_COLORS.other,
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function getInflationFactor(years: number, rate: number): number {
  return Math.pow(1 + rate, years);
}

// ============================================================================
// CUSTOM TOOLTIP
// ============================================================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
  minimumIncomeNeeded?: number;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  minimumIncomeNeeded,
}) => {
  if (!active || !payload || payload.length === 0) return null;

  const totalIncome = payload.reduce((sum, entry) => sum + (entry.value || 0), 0);
  const guaranteedIncome = payload
    .filter((p) => ["socialSecurity", "spouseSocialSecurity", "pension"].includes(p.dataKey))
    .reduce((sum, entry) => sum + (entry.value || 0), 0);
  const variableIncome = totalIncome - guaranteedIncome;
  const taxableIncome = payload
    .filter((p) => ["traditional401k", "partTime"].includes(p.dataKey))
    .reduce((sum, entry) => sum + (entry.value || 0), 0);
  const taxFreeIncome = payload
    .filter((p) => p.dataKey === "roth")
    .reduce((sum, entry) => sum + (entry.value || 0), 0);

  const meetsFloor = !minimumIncomeNeeded || totalIncome >= minimumIncomeNeeded;

  return (
    <div className="bg-background border border-border rounded-lg shadow-xl p-4 min-w-[280px]">
      <div className="font-semibold text-lg mb-3 flex items-center justify-between">
        <span>Age {label}</span>
        {minimumIncomeNeeded && (
          <Badge
            variant={meetsFloor ? "default" : "destructive"}
            className={cn(
              "ml-2",
              meetsFloor
                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                : ""
            )}
          >
            {meetsFloor ? "Meets Floor" : "Below Floor"}
          </Badge>
        )}
      </div>

      {/* Income Sources */}
      <div className="space-y-2 mb-4">
        {payload
          .filter((entry) => entry.value > 0)
          .sort((a, b) => b.value - a.value)
          .map((entry) => (
            <div key={entry.dataKey} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-sm text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-mono text-sm font-medium">
                {fmtFull(entry.value)}
              </span>
            </div>
          ))}
      </div>

      {/* Summary Stats */}
      <div className="border-t pt-3 space-y-2">
        <div className="flex justify-between font-semibold">
          <span>Total Income</span>
          <span className="font-mono">{fmtFull(totalIncome)}</span>
        </div>

        {minimumIncomeNeeded && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Income Floor</span>
            <span className="font-mono">{fmtFull(minimumIncomeNeeded)}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded p-2">
            <div className="text-blue-700 dark:text-blue-300 font-medium">Guaranteed</div>
            <div className="font-mono text-blue-900 dark:text-blue-100">
              {fmtFull(guaranteedIncome)}
            </div>
            <div className="text-blue-600 dark:text-blue-400">
              {totalIncome > 0 ? ((guaranteedIncome / totalIncome) * 100).toFixed(0) : 0}%
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/30 rounded p-2">
            <div className="text-purple-700 dark:text-purple-300 font-medium">Variable</div>
            <div className="font-mono text-purple-900 dark:text-purple-100">
              {fmtFull(variableIncome)}
            </div>
            <div className="text-purple-600 dark:text-purple-400">
              {totalIncome > 0 ? ((variableIncome / totalIncome) * 100).toFixed(0) : 0}%
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-amber-50 dark:bg-amber-950/30 rounded p-2">
            <div className="text-amber-700 dark:text-amber-300 font-medium">Taxable</div>
            <div className="font-mono text-amber-900 dark:text-amber-100">
              {fmtFull(taxableIncome + (payload.find(p => p.dataKey === "socialSecurity")?.value || 0) * 0.85)}
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-950/30 rounded p-2">
            <div className="text-green-700 dark:text-green-300 font-medium">Tax-Free</div>
            <div className="font-mono text-green-900 dark:text-green-100">
              {fmtFull(taxFreeIncome)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const IncomeSourcesBreakdown = React.memo(function IncomeSourcesBreakdown({
  currentAge,
  retirementAge,
  endAge = 95,
  socialSecurityIncome = 0,
  socialSecurityStartAge = 67,
  spouseSocialSecurityIncome = 0,
  spouseSocialSecurityStartAge = 67,
  traditionalWithdrawal = 0,
  rothWithdrawal = 0,
  pensionIncome = 0,
  pensionStartAge,
  partTimeIncome = 0,
  partTimeEndAge,
  otherIncomeSources = [],
  minimumIncomeNeeded,
  inflationRate = 0.025,
  showRealValues = true,
  isLoading = false,
  chartHeight = 400,
}: IncomeSourcesBreakdownProps) {
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);
  const [selectedView, setSelectedView] = useState<"all" | "taxType" | "reliability">("all");

  // Calculate chart data for each year
  const chartData = useMemo(() => {
    const data: Array<{
      age: number;
      year: number;
      socialSecurity: number;
      spouseSocialSecurity: number;
      traditional401k: number;
      roth: number;
      pension: number;
      partTime: number;
      other: number;
      total: number;
      guaranteed: number;
      variable: number;
      taxable: number;
      taxFree: number;
    }> = [];

    const pensionStart = pensionStartAge ?? retirementAge;
    const partTimeEnd = partTimeEndAge ?? retirementAge + 5;
    const currentYear = new Date().getFullYear();

    for (let age = retirementAge; age <= endAge; age++) {
      const yearsFromNow = age - currentAge;
      const yearsInRetirement = age - retirementAge;
      const inflationFactor = showRealValues ? 1 : getInflationFactor(yearsFromNow, inflationRate);
      const deflationFactor = showRealValues ? getInflationFactor(yearsFromNow, -inflationRate) : 1;

      // Calculate each income source for this age
      const ss = age >= socialSecurityStartAge ? socialSecurityIncome * deflationFactor : 0;
      const spouseSS = age >= spouseSocialSecurityStartAge ? spouseSocialSecurityIncome * deflationFactor : 0;
      const trad = age >= retirementAge ? traditionalWithdrawal * deflationFactor : 0;
      const rothAmt = age >= retirementAge ? rothWithdrawal * deflationFactor : 0;
      const pensionAmt = age >= pensionStart ? pensionIncome * deflationFactor : 0;
      const partTimeAmt = age >= retirementAge && age <= partTimeEnd ? partTimeIncome * deflationFactor : 0;

      // Calculate other income sources
      let otherTotal = 0;
      for (const source of otherIncomeSources) {
        const sourceEndAge = source.endAge ?? endAge;
        if (age >= source.startAge && age <= sourceEndAge) {
          const sourceInflation = source.inflationAdjustment ?? 0;
          const yearsActive = age - source.startAge;
          const sourceAmount = source.amount * getInflationFactor(yearsActive, sourceInflation);
          otherTotal += showRealValues ? sourceAmount * deflationFactor : sourceAmount;
        }
      }

      const total = ss + spouseSS + trad + rothAmt + pensionAmt + partTimeAmt + otherTotal;
      const guaranteed = ss + spouseSS + pensionAmt;
      const variable = trad + rothAmt + partTimeAmt + otherTotal;

      // Rough tax categorization (simplified)
      const taxable = trad + partTimeAmt + ss * 0.85; // Up to 85% of SS can be taxable
      const taxFree = rothAmt;

      data.push({
        age,
        year: currentYear + yearsFromNow,
        socialSecurity: Math.round(ss),
        spouseSocialSecurity: Math.round(spouseSS),
        traditional401k: Math.round(trad),
        roth: Math.round(rothAmt),
        pension: Math.round(pensionAmt),
        partTime: Math.round(partTimeAmt),
        other: Math.round(otherTotal),
        total: Math.round(total),
        guaranteed: Math.round(guaranteed),
        variable: Math.round(variable),
        taxable: Math.round(taxable),
        taxFree: Math.round(taxFree),
      });
    }

    return data;
  }, [
    currentAge,
    retirementAge,
    endAge,
    socialSecurityIncome,
    socialSecurityStartAge,
    spouseSocialSecurityIncome,
    spouseSocialSecurityStartAge,
    traditionalWithdrawal,
    rothWithdrawal,
    pensionIncome,
    pensionStartAge,
    partTimeIncome,
    partTimeEndAge,
    otherIncomeSources,
    inflationRate,
    showRealValues,
  ]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    if (chartData.length === 0) return null;

    const totalLifetimeIncome = chartData.reduce((sum, d) => sum + d.total, 0);
    const avgAnnualIncome = totalLifetimeIncome / chartData.length;
    const minIncome = Math.min(...chartData.map((d) => d.total));
    const maxIncome = Math.max(...chartData.map((d) => d.total));

    // Find years below income floor
    const yearsbelowFloor = minimumIncomeNeeded
      ? chartData.filter((d) => d.total < minimumIncomeNeeded).length
      : 0;

    // Calculate average guaranteed percentage
    const avgGuaranteedPct =
      chartData.reduce((sum, d) => sum + (d.total > 0 ? d.guaranteed / d.total : 0), 0) /
      chartData.length;

    // Find when income composition changes significantly
    const ssStartData = chartData.find((d) => d.socialSecurity > 0);
    const partTimeEndData = chartData.filter((d) => d.partTime > 0).slice(-1)[0];

    return {
      totalLifetimeIncome,
      avgAnnualIncome,
      minIncome,
      maxIncome,
      yearsbelowFloor,
      avgGuaranteedPct,
      ssStartAge: ssStartData?.age,
      partTimeEndAge: partTimeEndData?.age,
      retirementYears: chartData.length,
    };
  }, [chartData, minimumIncomeNeeded]);

  // Income floor analysis
  const floorAnalysis = useMemo(() => {
    if (!minimumIncomeNeeded || chartData.length === 0) return null;

    const yearsAboveFloor = chartData.filter((d) => d.guaranteed >= minimumIncomeNeeded).length;
    const guaranteedCoversFloor = yearsAboveFloor === chartData.length;

    // Find the age where guaranteed income meets the floor
    const floorMetAge = chartData.find((d) => d.guaranteed >= minimumIncomeNeeded)?.age;

    // Calculate shortfall in early years
    const shortfallYears = chartData
      .filter((d) => d.guaranteed < minimumIncomeNeeded)
      .map((d) => ({
        age: d.age,
        shortfall: minimumIncomeNeeded - d.guaranteed,
        coveredBy: d.total >= minimumIncomeNeeded ? "variable" : "none",
      }));

    return {
      guaranteedCoversFloor,
      yearsAboveFloor,
      floorMetAge,
      shortfallYears,
      totalShortfall: shortfallYears.reduce((sum, y) => sum + y.shortfall, 0),
    };
  }, [chartData, minimumIncomeNeeded]);

  // Render loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600 animate-pulse" />
            Retirement Income Sources
          </CardTitle>
          <CardDescription>Analyzing your income streams...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-pulse text-muted-foreground">
              Building income projection...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check if we have any income data
  const hasIncomeData =
    socialSecurityIncome > 0 ||
    spouseSocialSecurityIncome > 0 ||
    traditionalWithdrawal > 0 ||
    rothWithdrawal > 0 ||
    pensionIncome > 0 ||
    partTimeIncome > 0 ||
    otherIncomeSources.length > 0;

  if (!hasIncomeData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Retirement Income Sources
          </CardTitle>
          <CardDescription>
            Visualize your complete retirement income picture
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center h-[300px] text-center">
            <Info className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-2">
              No income sources configured yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Add Social Security, 401(k) withdrawals, pension, or other income sources
              to see your retirement income breakdown.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Retirement Income Sources Breakdown
        </CardTitle>
        <CardDescription>
          {showRealValues ? "Inflation-adjusted" : "Nominal"} annual income by source from
          age {retirementAge} to {endAge}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        {summaryStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-400 text-sm mb-1">
                <TrendingUp className="h-4 w-4" />
                Average Annual
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                {fmt(summaryStats.avgAnnualIncome)}
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 text-sm mb-1">
                <Shield className="h-4 w-4" />
                Guaranteed Income
              </div>
              <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {(summaryStats.avgGuaranteedPct * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                of total (avg)
              </div>
            </div>

            <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 text-sm mb-1">
                <PiggyBank className="h-4 w-4" />
                Lifetime Total
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {fmt(summaryStats.totalLifetimeIncome)}
              </div>
              <div className="text-xs text-purple-600 dark:text-purple-400">
                over {summaryStats.retirementYears} years
              </div>
            </div>

            <div
              className={cn(
                "rounded-lg p-4 border",
                summaryStats.yearsbelowFloor > 0
                  ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
                  : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
              )}
            >
              <div
                className={cn(
                  "flex items-center gap-2 text-sm mb-1",
                  summaryStats.yearsbelowFloor > 0
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-emerald-700 dark:text-emerald-400"
                )}
              >
                {summaryStats.yearsbelowFloor > 0 ? (
                  <AlertTriangle className="h-4 w-4" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Income Floor
              </div>
              <div
                className={cn(
                  "text-2xl font-bold",
                  summaryStats.yearsbelowFloor > 0
                    ? "text-amber-900 dark:text-amber-100"
                    : "text-emerald-900 dark:text-emerald-100"
                )}
              >
                {summaryStats.yearsbelowFloor > 0
                  ? `${summaryStats.yearsbelowFloor} yrs`
                  : "Met"}
              </div>
              <div
                className={cn(
                  "text-xs",
                  summaryStats.yearsbelowFloor > 0
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                )}
              >
                {summaryStats.yearsbelowFloor > 0 ? "below minimum" : "all years"}
              </div>
            </div>
          </div>
        )}

        {/* Income Floor Analysis */}
        {floorAnalysis && minimumIncomeNeeded && (
          <div
            className={cn(
              "rounded-lg p-4 border",
              floorAnalysis.guaranteedCoversFloor
                ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
                : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
            )}
          >
            <div className="flex items-start gap-3">
              {floorAnalysis.guaranteedCoversFloor ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="flex-1">
                <div
                  className={cn(
                    "font-semibold mb-1",
                    floorAnalysis.guaranteedCoversFloor
                      ? "text-emerald-900 dark:text-emerald-100"
                      : "text-amber-900 dark:text-amber-100"
                  )}
                >
                  Income Floor Analysis
                </div>
                <p
                  className={cn(
                    "text-sm",
                    floorAnalysis.guaranteedCoversFloor
                      ? "text-emerald-800 dark:text-emerald-200"
                      : "text-amber-800 dark:text-amber-200"
                  )}
                >
                  {floorAnalysis.guaranteedCoversFloor ? (
                    <>
                      Your guaranteed income (Social Security + Pension) of{" "}
                      <strong>{fmt(chartData[0]?.guaranteed || 0)}</strong> fully covers your
                      minimum income need of <strong>{fmt(minimumIncomeNeeded)}</strong>{" "}
                      throughout retirement. This provides strong income security regardless
                      of market conditions.
                    </>
                  ) : (
                    <>
                      Your guaranteed income covers your{" "}
                      <strong>{fmt(minimumIncomeNeeded)}</strong> floor for{" "}
                      <strong>{floorAnalysis.yearsAboveFloor}</strong> of{" "}
                      <strong>{chartData.length}</strong> retirement years.
                      {floorAnalysis.floorMetAge && (
                        <>
                          {" "}
                          Guaranteed income meets the floor starting at age{" "}
                          <strong>{floorAnalysis.floorMetAge}</strong>.
                        </>
                      )}
                      {floorAnalysis.totalShortfall > 0 && (
                        <>
                          {" "}
                          Total shortfall from guaranteed sources:{" "}
                          <strong>{fmt(floorAnalysis.totalShortfall)}</strong>.
                        </>
                      )}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Legend / View Selector */}
        <div className="flex flex-wrap items-center gap-4 pb-2">
          <div className="flex items-center gap-4 flex-wrap">
            {socialSecurityIncome > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.socialSecurity }}
                />
                <span className="text-sm">Social Security</span>
                <Badge variant="outline" className="text-xs">
                  Guaranteed
                </Badge>
              </div>
            )}
            {spouseSocialSecurityIncome > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.spouseSocialSecurity }}
                />
                <span className="text-sm">Spouse SS</span>
                <Badge variant="outline" className="text-xs">
                  Guaranteed
                </Badge>
              </div>
            )}
            {traditionalWithdrawal > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.traditional401k }}
                />
                <span className="text-sm">401(k)/IRA</span>
                <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                  Taxable
                </Badge>
              </div>
            )}
            {rothWithdrawal > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.roth }}
                />
                <span className="text-sm">Roth</span>
                <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                  Tax-Free
                </Badge>
              </div>
            )}
            {pensionIncome > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.pension }}
                />
                <span className="text-sm">Pension</span>
                <Badge variant="outline" className="text-xs">
                  Guaranteed
                </Badge>
              </div>
            )}
            {partTimeIncome > 0 && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: INCOME_SOURCE_COLORS.partTime }}
                />
                <span className="text-sm">Part-time Work</span>
              </div>
            )}
          </div>
        </div>

        {/* Stacked Bar Chart */}
        <ChartContainer config={CHART_CONFIG} className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              // Reason: recharts v3 type incompatibility
              onMouseMove={(state) => {
                const s = state as Record<string, unknown>;
                const activePayload = s?.activePayload as Array<{ payload: { age: number } }> | undefined;
                if (activePayload?.[0]) {
                  setHoveredYear(activePayload[0].payload.age);
                }
              }}
              onMouseLeave={() => setHoveredYear(null)}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="age"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{
                  value: "Age",
                  position: "insideBottom",
                  offset: -10,
                  style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
                }}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatCurrency(value)}
                label={{
                  value: showRealValues ? "Annual Income (Real $)" : "Annual Income",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip
                content={<CustomTooltip minimumIncomeNeeded={minimumIncomeNeeded} />}
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
              />

              {/* Income Floor Reference Line */}
              {minimumIncomeNeeded && (
                <ReferenceLine
                  y={minimumIncomeNeeded}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `Floor: ${formatCurrency(minimumIncomeNeeded)}`,
                    position: "right",
                    fill: "hsl(var(--destructive))",
                    fontSize: 11,
                  }}
                />
              )}

              {/* Stacked Bars - Order matters for visual stacking */}
              {partTimeIncome > 0 && (
                <Bar
                  dataKey="partTime"
                  name="Part-time Work"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.partTime}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {otherIncomeSources.length > 0 && (
                <Bar
                  dataKey="other"
                  name="Other Income"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.other}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {rothWithdrawal > 0 && (
                <Bar
                  dataKey="roth"
                  name="Roth"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.roth}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {traditionalWithdrawal > 0 && (
                <Bar
                  dataKey="traditional401k"
                  name="401(k)/IRA"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.traditional401k}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {pensionIncome > 0 && (
                <Bar
                  dataKey="pension"
                  name="Pension"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.pension}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {spouseSocialSecurityIncome > 0 && (
                <Bar
                  dataKey="spouseSocialSecurity"
                  name="Spouse SS"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.spouseSocialSecurity}
                  radius={[0, 0, 0, 0]}
                />
              )}
              {socialSecurityIncome > 0 && (
                <Bar
                  dataKey="socialSecurity"
                  name="Social Security"
                  stackId="income"
                  fill={INCOME_SOURCE_COLORS.socialSecurity}
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Tax-Advantaged vs Taxable Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Guaranteed vs Variable Income</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Guaranteed (SS + Pension)</span>
                  <span className="font-mono">
                    {fmt(chartData[Math.floor(chartData.length / 2)]?.guaranteed || 0)}/yr
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        chartData[Math.floor(chartData.length / 2)]?.total
                          ? ((chartData[Math.floor(chartData.length / 2)]?.guaranteed || 0) /
                              chartData[Math.floor(chartData.length / 2)]?.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Variable (Investments)</span>
                  <span className="font-mono">
                    {fmt(chartData[Math.floor(chartData.length / 2)]?.variable || 0)}/yr
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-purple-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        chartData[Math.floor(chartData.length / 2)]?.total
                          ? ((chartData[Math.floor(chartData.length / 2)]?.variable || 0) /
                              chartData[Math.floor(chartData.length / 2)]?.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Guaranteed income provides stability regardless of market conditions.
              Higher guaranteed percentage = more income security.
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <Landmark className="h-5 w-5 text-amber-600" />
              <span className="font-semibold">Tax Treatment</span>
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Taxable Income</span>
                  <span className="font-mono">
                    {fmt(chartData[Math.floor(chartData.length / 2)]?.taxable || 0)}/yr
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-amber-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        chartData[Math.floor(chartData.length / 2)]?.total
                          ? ((chartData[Math.floor(chartData.length / 2)]?.taxable || 0) /
                              chartData[Math.floor(chartData.length / 2)]?.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Tax-Free (Roth)</span>
                  <span className="font-mono">
                    {fmt(chartData[Math.floor(chartData.length / 2)]?.taxFree || 0)}/yr
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${
                        chartData[Math.floor(chartData.length / 2)]?.total
                          ? ((chartData[Math.floor(chartData.length / 2)]?.taxFree || 0) /
                              chartData[Math.floor(chartData.length / 2)]?.total) *
                            100
                          : 0
                      }%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Tax-free Roth withdrawals can reduce your tax burden and help manage
              Medicare IRMAA thresholds.
            </p>
          </div>
        </div>

        {/* Key Insights */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Key Income Milestones
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                {socialSecurityStartAge > retirementAge && (
                  <li>
                    <strong>Age {socialSecurityStartAge}:</strong> Social Security begins
                    ({fmt(socialSecurityIncome)}/year)
                  </li>
                )}
                {spouseSocialSecurityIncome > 0 && spouseSocialSecurityStartAge > retirementAge && (
                  <li>
                    <strong>Age {spouseSocialSecurityStartAge}:</strong> Spouse Social
                    Security begins ({fmt(spouseSocialSecurityIncome)}/year)
                  </li>
                )}
                {partTimeIncome > 0 && partTimeEndAge && (
                  <li>
                    <strong>Age {partTimeEndAge}:</strong> Part-time work income ends
                    (transition to full retirement)
                  </li>
                )}
                {pensionIncome > 0 && pensionStartAge && pensionStartAge > retirementAge && (
                  <li>
                    <strong>Age {pensionStartAge}:</strong> Pension benefits begin (
                    {fmt(pensionIncome)}/year)
                  </li>
                )}
                <li>
                  <strong>Income Range:</strong> {fmt(summaryStats?.minIncome || 0)} to{" "}
                  {fmt(summaryStats?.maxIncome || 0)} per year
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

export default IncomeSourcesBreakdown;
