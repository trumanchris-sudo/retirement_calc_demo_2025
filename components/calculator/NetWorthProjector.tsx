"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { cn, fmt, fmtFull } from "@/lib/utils";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  Area,
  ComposedChart,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Target,
  Clock,
  Rocket,
  DollarSign,
  PiggyBank,
  LineChart as LineChartIcon,
  Award,
  Zap,
  Info,
  Flag,
  Timer,
  Quote,
} from "lucide-react";

// ==================== Types ====================

interface NetWorthProjectorProps {
  // Current financial snapshot
  totalAssets: number;
  totalLiabilities: number;
  currentNetWorth?: number; // Optional override

  // Account balances
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;

  // Annual contributions
  annualContributions: number;
  employerMatch?: number;

  // Debt info (optional)
  annualDebtPaydown?: number;
  totalDebt?: number;

  // Growth assumptions
  defaultReturnRate?: number; // Default 7%
  inflationRate?: number; // Default 3%

  // Goals integration
  fiNumber?: number; // Financial Independence target
  retirementTarget?: number;
  coastFIAge?: number;
  coastFINumber?: number;

  // User info
  currentAge: number;
  retirementAge?: number;

  // Projection settings
  projectionYears?: number; // How many years to project
}

interface ProjectionDataPoint {
  year: number;
  age: number;
  // Nominal values
  conservative: number;
  moderate: number;
  aggressive: number;
  // Real (inflation-adjusted) values
  conservativeReal: number;
  moderateReal: number;
  aggressiveReal: number;
  // Growth drivers
  cumulativeContributions: number;
  cumulativeReturns: number;
  cumulativeDebtPaydown: number;
  // Year-over-year drivers
  yearContributions: number;
  yearReturns: number;
  yearDebtPaydown: number;
}

interface MilestoneInfo {
  amount: number;
  label: string;
  yearsToReach: {
    conservative: number | null;
    moderate: number | null;
    aggressive: number | null;
  };
  icon: React.ReactNode;
}

interface HundredKMilestone {
  milestone: number;
  yearsToReach: number;
  cumulativeYears: number;
  age: number;
}

// ==================== Constants ====================

const RETURN_RATES = {
  conservative: 0.05,
  moderate: 0.07,
  aggressive: 0.09,
};

const MILESTONES = [100000, 250000, 500000, 750000, 1000000, 2000000, 5000000];

const CHART_CONFIG = {
  conservative: {
    label: "Conservative (5%)",
    color: "hsl(220, 70%, 50%)",
  },
  moderate: {
    label: "Moderate (7%)",
    color: "hsl(142, 70%, 45%)",
  },
  aggressive: {
    label: "Aggressive (9%)",
    color: "hsl(280, 70%, 50%)",
  },
  contributions: {
    label: "Contributions",
    color: "hsl(200, 70%, 50%)",
  },
  returns: {
    label: "Returns",
    color: "hsl(142, 70%, 45%)",
  },
  debtPaydown: {
    label: "Debt Paydown",
    color: "hsl(45, 70%, 50%)",
  },
  fiNumber: {
    label: "FI Target",
    color: "hsl(0, 70%, 50%)",
  },
  retirement: {
    label: "Retirement Target",
    color: "hsl(280, 70%, 50%)",
  },
  coastFI: {
    label: "Coast FI",
    color: "hsl(45, 70%, 50%)",
  },
};

// ==================== Utility Functions ====================

function formatMilestone(amount: number): string {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(amount % 1000000 === 0 ? 0 : 1)}M`;
  }
  return `$${(amount / 1000).toFixed(0)}K`;
}

function formatYears(years: number | null): string {
  if (years === null) return "N/A";
  if (years <= 0) return "Achieved!";
  const wholeYears = Math.floor(years);
  const months = Math.round((years - wholeYears) * 12);
  if (months === 0) return `${wholeYears} yrs`;
  return `${wholeYears}.${Math.round(years % 1 * 10)} yrs`;
}

// ==================== Sub-Components ====================

// Current Net Worth Snapshot
const NetWorthSnapshot: React.FC<{
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
}> = React.memo(
  ({
    totalAssets,
    totalLiabilities,
    netWorth,
    taxableBalance,
    pretaxBalance,
    rothBalance,
  }) => {
    const assetBreakdown = useMemo(() => {
      const total = taxableBalance + pretaxBalance + rothBalance;
      if (total === 0) return { taxable: 0, pretax: 0, roth: 0 };
      return {
        taxable: (taxableBalance / total) * 100,
        pretax: (pretaxBalance / total) * 100,
        roth: (rothBalance / total) * 100,
      };
    }, [taxableBalance, pretaxBalance, rothBalance]);

    return (
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 dark:from-emerald-500/20 dark:to-emerald-600/10">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <CardTitle>Current Net Worth</CardTitle>
          </div>
          <CardDescription>Your wealth snapshot today</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Big Number Display */}
          <div className="text-center mb-6">
            <div
              className={cn(
                "text-4xl md:text-5xl lg:text-6xl font-bold font-mono tracking-tight",
                netWorth >= 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-red-600 dark:text-red-400"
              )}
            >
              {fmtFull(netWorth)}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Assets - Liabilities = Net Worth
            </p>
          </div>

          {/* Assets vs Liabilities */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
              <p className="text-sm text-muted-foreground mb-1">Total Assets</p>
              <p className="text-xl font-semibold font-mono text-emerald-700 dark:text-emerald-300">
                {fmt(totalAssets)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p className="text-sm text-muted-foreground mb-1">
                Total Liabilities
              </p>
              <p className="text-xl font-semibold font-mono text-red-700 dark:text-red-300">
                {fmt(totalLiabilities)}
              </p>
            </div>
          </div>

          {/* Account Breakdown */}
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Account Breakdown
            </p>
            <div className="flex h-3 rounded-full overflow-hidden bg-muted">
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${assetBreakdown.taxable}%` }}
              />
              <div
                className="bg-amber-500 transition-all duration-500"
                style={{ width: `${assetBreakdown.pretax}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${assetBreakdown.roth}%` }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Taxable</span>
                <span className="font-mono font-medium ml-auto">
                  {fmt(taxableBalance)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-muted-foreground">Pre-tax</span>
                <span className="font-mono font-medium ml-auto">
                  {fmt(pretaxBalance)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground">Roth</span>
                <span className="font-mono font-medium ml-auto">
                  {fmt(rothBalance)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
);
NetWorthSnapshot.displayName = "NetWorthSnapshot";

// Growth Projection Chart
const GrowthProjectionChart: React.FC<{
  data: ProjectionDataPoint[];
  showInflationAdjusted: boolean;
  milestones: MilestoneInfo[];
  fiNumber?: number;
  retirementTarget?: number;
  coastFINumber?: number;
  coastFIAge?: number;
  currentAge: number;
  retirementAge?: number;
}> = React.memo(
  ({
    data,
    showInflationAdjusted,
    milestones,
    fiNumber,
    retirementTarget,
    coastFINumber: _coastFINumber,
    coastFIAge,
    currentAge,
    retirementAge,
  }) => {
    // coastFINumber is used for reference line display via coastFIAge
    void _coastFINumber;
    const maxValue = useMemo(() => {
      const dataMax = Math.max(
        ...data.map((d) =>
          showInflationAdjusted ? d.aggressiveReal : d.aggressive
        )
      );
      const targetMax = Math.max(fiNumber || 0, retirementTarget || 0);
      return Math.max(dataMax, targetMax) * 1.1;
    }, [data, showInflationAdjusted, fiNumber, retirementTarget]);

    // Find which milestones are reached within projection
    const reachedMilestones = useMemo(() => {
      return milestones.filter(
        (m) => m.yearsToReach.aggressive !== null && m.amount < maxValue
      );
    }, [milestones, maxValue]);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <CardTitle>Growth Projection</CardTitle>
            </div>
            <Badge variant="outline" className="font-mono">
              {showInflationAdjusted ? "Real" : "Nominal"}
            </Badge>
          </div>
          <CardDescription>
            Year-by-year net worth projection with scenario ranges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={CHART_CONFIG} className="h-[400px] w-full">
            <ComposedChart data={data}>
              <defs>
                <linearGradient id="conservativeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(220, 70%, 50%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="moderateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 70%, 45%)" stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="aggressiveGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(280, 70%, 50%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(280, 70%, 50%)" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="year"
                tickFormatter={(year) => `'${String(year).slice(2)}`}
                className="text-xs"
              />
              <YAxis
                tickFormatter={(val) => fmt(val)}
                domain={[0, maxValue]}
                className="text-xs"
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) => (
                      <span className="font-mono">{fmtFull(value as number)}</span>
                    )}
                    labelFormatter={(label) => `Year ${label}`}
                  />
                }
              />

              {/* Area fills for ranges */}
              <Area
                type="monotone"
                dataKey={showInflationAdjusted ? "aggressiveReal" : "aggressive"}
                stroke="none"
                fill="url(#aggressiveGradient)"
                fillOpacity={1}
              />

              {/* Scenario lines */}
              <Line
                type="monotone"
                dataKey={showInflationAdjusted ? "conservativeReal" : "conservative"}
                stroke="hsl(220, 70%, 50%)"
                strokeWidth={2}
                dot={false}
                name="Conservative (5%)"
              />
              <Line
                type="monotone"
                dataKey={showInflationAdjusted ? "moderateReal" : "moderate"}
                stroke="hsl(142, 70%, 45%)"
                strokeWidth={3}
                dot={false}
                name="Moderate (7%)"
              />
              <Line
                type="monotone"
                dataKey={showInflationAdjusted ? "aggressiveReal" : "aggressive"}
                stroke="hsl(280, 70%, 50%)"
                strokeWidth={2}
                dot={false}
                name="Aggressive (9%)"
              />

              {/* FI Number reference line */}
              {fiNumber && fiNumber > 0 && (
                <ReferenceLine
                  y={fiNumber}
                  stroke="hsl(0, 70%, 50%)"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `FI: ${fmt(fiNumber)}`,
                    position: "right",
                    fill: "hsl(0, 70%, 50%)",
                    fontSize: 12,
                  }}
                />
              )}

              {/* Retirement target reference line */}
              {retirementTarget && retirementTarget > 0 && retirementTarget !== fiNumber && (
                <ReferenceLine
                  y={retirementTarget}
                  stroke="hsl(280, 70%, 50%)"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  label={{
                    value: `Retire: ${fmt(retirementTarget)}`,
                    position: "right",
                    fill: "hsl(280, 70%, 50%)",
                    fontSize: 12,
                  }}
                />
              )}

              {/* Coast FI age marker */}
              {coastFIAge && retirementAge && (
                <ReferenceLine
                  x={new Date().getFullYear() + (coastFIAge - currentAge)}
                  stroke="hsl(45, 70%, 50%)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Coast FI",
                    position: "top",
                    fill: "hsl(45, 70%, 50%)",
                    fontSize: 11,
                  }}
                />
              )}

              {/* Retirement age marker */}
              {retirementAge && (
                <ReferenceLine
                  x={new Date().getFullYear() + (retirementAge - currentAge)}
                  stroke="hsl(142, 70%, 45%)"
                  strokeDasharray="3 3"
                  strokeWidth={1.5}
                  label={{
                    value: "Retirement",
                    position: "top",
                    fill: "hsl(142, 70%, 45%)",
                    fontSize: 11,
                  }}
                />
              )}

              {/* Milestone markers */}
              {reachedMilestones.slice(0, 4).map((milestone) => (
                <ReferenceLine
                  key={milestone.amount}
                  y={milestone.amount}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="2 4"
                  strokeWidth={1}
                  strokeOpacity={0.5}
                />
              ))}

              <Legend />
            </ComposedChart>
          </ChartContainer>

          {/* Milestone markers legend */}
          <div className="flex flex-wrap gap-2 mt-4 justify-center">
            {reachedMilestones.slice(0, 5).map((milestone) => (
              <Badge key={milestone.amount} variant="secondary" className="font-mono text-xs">
                {milestone.icon}
                <span className="ml-1">{milestone.label}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);
GrowthProjectionChart.displayName = "GrowthProjectionChart";

// Growth Drivers Analysis
const GrowthDriversChart: React.FC<{
  data: ProjectionDataPoint[];
  showInflationAdjusted: boolean;
}> = React.memo(({ data, showInflationAdjusted: _showInflationAdjusted }) => {
  // showInflationAdjusted reserved for future real vs nominal driver view
  void _showInflationAdjusted;
  // Sample years to show growth drivers
  const sampleYears = useMemo(() => {
    const years = [5, 10, 15, 20, 25, 30];
    return years
      .filter((y) => y <= data.length)
      .map((y) => data[y - 1])
      .filter(Boolean);
  }, [data]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          <CardTitle>What Drives Growth</CardTitle>
        </div>
        <CardDescription>
          Contributions vs Returns: Early years favor saving, later years favor
          compounding
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={CHART_CONFIG} className="h-[300px] w-full">
          <BarChart data={sampleYears} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis type="number" tickFormatter={(val) => fmt(val)} />
            <YAxis
              type="category"
              dataKey="year"
              tickFormatter={(year) => `Year ${new Date().getFullYear() - data[0]?.year + year - data[0]?.year + 1}`}
              width={80}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => (
                    <span className="font-mono">{fmtFull(value as number)}</span>
                  )}
                />
              }
            />
            <Bar
              dataKey="cumulativeContributions"
              stackId="total"
              fill="hsl(200, 70%, 50%)"
              name="Contributions"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="cumulativeReturns"
              stackId="total"
              fill="hsl(142, 70%, 45%)"
              name="Returns"
              radius={[0, 4, 4, 0]}
            />
            {sampleYears[0]?.cumulativeDebtPaydown > 0 && (
              <Bar
                dataKey="cumulativeDebtPaydown"
                stackId="total"
                fill="hsl(45, 70%, 50%)"
                name="Debt Paydown"
                radius={[0, 4, 4, 0]}
              />
            )}
            <Legend />
          </BarChart>
        </ChartContainer>

        {/* Insight callout */}
        <div className="mt-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-emerald-50 dark:from-blue-950/30 dark:to-emerald-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                The Crossover Point
              </p>
              <p className="text-blue-700 dark:text-blue-300">
                {sampleYears.length > 0 && (
                  <>
                    {(() => {
                      const crossover = data.findIndex(
                        (d) => d.cumulativeReturns > d.cumulativeContributions
                      );
                      if (crossover === -1) {
                        return "With consistent saving, your investment returns will eventually exceed your contributions.";
                      }
                      return `Around year ${crossover + 1}, your investment returns will surpass your total contributions. This is when compounding truly accelerates!`;
                    })()}
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
GrowthDriversChart.displayName = "GrowthDriversChart";

// Scenario Comparison
const ScenarioComparison: React.FC<{
  data: ProjectionDataPoint[];
  showInflationAdjusted: boolean;
  currentNetWorth: number;
}> = React.memo(({ data, showInflationAdjusted, currentNetWorth }) => {
  const projectionYearsToShow = [5, 10, 15, 20, 25, 30];

  const scenarioData = useMemo(() => {
    return projectionYearsToShow
      .filter((y) => y <= data.length)
      .map((years) => {
        const point = data[years - 1];
        if (!point) return null;

        const getValue = (scenario: 'conservative' | 'moderate' | 'aggressive') => {
          return showInflationAdjusted
            ? point[`${scenario}Real` as keyof ProjectionDataPoint] as number
            : point[scenario];
        };

        return {
          years,
          conservative: getValue('conservative'),
          moderate: getValue('moderate'),
          aggressive: getValue('aggressive'),
          conservativeGain: getValue('conservative') - currentNetWorth,
          moderateGain: getValue('moderate') - currentNetWorth,
          aggressiveGain: getValue('aggressive') - currentNetWorth,
        };
      })
      .filter(Boolean);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, showInflationAdjusted, currentNetWorth]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <LineChartIcon className="h-5 w-5 text-purple-500" />
          <CardTitle>Scenario Comparison</CardTitle>
        </div>
        <CardDescription>
          Range of outcomes based on different return assumptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2">Years</th>
                <th className="text-right py-3 px-2">
                  <span className="text-blue-600 dark:text-blue-400">Conservative</span>
                  <span className="block text-xs font-normal text-muted-foreground">5% return</span>
                </th>
                <th className="text-right py-3 px-2">
                  <span className="text-emerald-600 dark:text-emerald-400">Moderate</span>
                  <span className="block text-xs font-normal text-muted-foreground">7% return</span>
                </th>
                <th className="text-right py-3 px-2">
                  <span className="text-purple-600 dark:text-purple-400">Aggressive</span>
                  <span className="block text-xs font-normal text-muted-foreground">9% return</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {scenarioData.map((row) => row && (
                <tr key={row.years} className="border-b border-muted/50 hover:bg-muted/30">
                  <td className="py-3 px-2 font-medium">{row.years} years</td>
                  <td className="text-right py-3 px-2 font-mono">
                    <div>{fmt(row.conservative)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      +{fmt(row.conservativeGain)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 font-mono bg-emerald-50/50 dark:bg-emerald-950/20">
                    <div className="font-semibold">{fmt(row.moderate)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      +{fmt(row.moderateGain)}
                    </div>
                  </td>
                  <td className="text-right py-3 px-2 font-mono">
                    <div>{fmt(row.aggressive)}</div>
                    <div className="text-xs text-emerald-600 dark:text-emerald-400">
                      +{fmt(row.aggressiveGain)}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
});
ScenarioComparison.displayName = "ScenarioComparison";

// Time to Milestones
const TimeToMilestones: React.FC<{
  milestones: MilestoneInfo[];
  currentNetWorth: number;
}> = React.memo(({ milestones, currentNetWorth }) => {
  // Filter milestones that are ahead of current net worth
  const futureMilestones = useMemo(() => {
    return milestones.filter((m) => m.amount > currentNetWorth);
  }, [milestones, currentNetWorth]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Timer className="h-5 w-5 text-orange-500" />
          <CardTitle>Time to Milestones</CardTitle>
        </div>
        <CardDescription>
          Countdown to your next wealth milestones
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {futureMilestones.slice(0, 5).map((milestone, index) => (
            <div
              key={milestone.amount}
              className={cn(
                "p-4 rounded-lg border transition-all",
                index === 0
                  ? "bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-200 dark:border-amber-800"
                  : "bg-muted/30 border-muted"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {milestone.icon}
                  <span className="font-semibold">{milestone.label}</span>
                </div>
                {index === 0 && (
                  <Badge className="bg-amber-500 text-white">Next</Badge>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="text-center p-2 rounded bg-blue-100 dark:bg-blue-900/30">
                  <p className="text-xs text-muted-foreground mb-1">Conservative</p>
                  <p className="font-mono font-medium text-blue-700 dark:text-blue-300">
                    {formatYears(milestone.yearsToReach.conservative)}
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-emerald-100 dark:bg-emerald-900/30">
                  <p className="text-xs text-muted-foreground mb-1">Moderate</p>
                  <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-300">
                    {formatYears(milestone.yearsToReach.moderate)}
                  </p>
                </div>
                <div className="text-center p-2 rounded bg-purple-100 dark:bg-purple-900/30">
                  <p className="text-xs text-muted-foreground mb-1">Aggressive</p>
                  <p className="font-mono font-medium text-purple-700 dark:text-purple-300">
                    {formatYears(milestone.yearsToReach.aggressive)}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {futureMilestones.length === 0 && (
            <div className="text-center py-8">
              <Award className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <p className="font-medium text-lg">Congratulations!</p>
              <p className="text-muted-foreground">
                You&apos;ve reached all projected milestones!
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
TimeToMilestones.displayName = "TimeToMilestones";

// First $100K is the Hardest
const First100KCard: React.FC<{
  hundredKMilestones: HundredKMilestone[];
  currentNetWorth: number;
}> = React.memo(({ hundredKMilestones, currentNetWorth }) => {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900">
        <div className="flex items-center gap-2">
          <Quote className="h-5 w-5 text-slate-600 dark:text-slate-400" />
          <CardTitle>&quot;The First $100,000 is the Hardest&quot;</CardTitle>
        </div>
        <CardDescription>
          Charlie Munger&apos;s timeless wisdom on wealth building
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Quote highlight */}
        <blockquote className="border-l-4 border-slate-300 dark:border-slate-700 pl-4 mb-6 italic text-muted-foreground">
          &quot;The first $100,000 is a b****, but you gotta do it. I don&apos;t
          care what you have to do - if it means walking everywhere and not
          eating anything that wasn&apos;t purchased with a coupon, find a way
          to get your hands on $100,000.&quot;
          <footer className="mt-2 text-sm font-medium not-italic">
            - Charlie Munger
          </footer>
        </blockquote>

        {/* Visual timeline */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground mb-4">
            Time to each $100K (moderate scenario)
          </p>

          {hundredKMilestones.slice(0, 6).map((milestone, index) => {
            const isPast = currentNetWorth >= milestone.milestone;
            const isCurrent =
              currentNetWorth >= (hundredKMilestones[index - 1]?.milestone || 0) &&
              currentNetWorth < milestone.milestone;

            return (
              <div key={milestone.milestone} className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-16 text-right font-mono text-sm",
                    isPast
                      ? "text-emerald-600 dark:text-emerald-400"
                      : isCurrent
                      ? "text-amber-600 dark:text-amber-400 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {formatMilestone(milestone.milestone)}
                </div>
                <div className="flex-1 relative">
                  <div className="h-8 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-500 flex items-center justify-end pr-3",
                        isPast
                          ? "bg-emerald-500"
                          : isCurrent
                          ? "bg-gradient-to-r from-amber-400 to-amber-500"
                          : "bg-slate-300 dark:bg-slate-700"
                      )}
                      style={{
                        width: `${Math.min(100, (milestone.yearsToReach / hundredKMilestones[0].yearsToReach) * 100)}%`,
                      }}
                    >
                      <span className="text-xs font-mono text-white font-medium">
                        {milestone.yearsToReach.toFixed(1)} yrs
                      </span>
                    </div>
                  </div>
                </div>
                {index > 0 && (
                  <div className="w-20 text-xs text-right">
                    <span
                      className={cn(
                        "font-medium",
                        milestone.yearsToReach < hundredKMilestones[index - 1].yearsToReach
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-muted-foreground"
                      )}
                    >
                      {milestone.yearsToReach < hundredKMilestones[index - 1].yearsToReach
                        ? `${(hundredKMilestones[index - 1].yearsToReach - milestone.yearsToReach).toFixed(1)} yrs faster`
                        : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <p className="text-sm text-emerald-800 dark:text-emerald-200">
            <strong>Why it accelerates:</strong> As your portfolio grows,
            investment returns contribute more than your savings. The first
            $100K is mostly effort; subsequent $100Ks are increasingly momentum.
          </p>
        </div>
      </CardContent>
    </Card>
  );
});
First100KCard.displayName = "First100KCard";

// Goals Integration
const GoalsOverlay: React.FC<{
  currentNetWorth: number;
  fiNumber?: number;
  retirementTarget?: number;
  coastFINumber?: number;
  data: ProjectionDataPoint[];
}> = React.memo(
  ({ currentNetWorth, fiNumber, retirementTarget, coastFINumber, data }) => {
    const calculateProgress = useCallback(
      (target: number) => {
        return Math.min(100, (currentNetWorth / target) * 100);
      },
      [currentNetWorth]
    );

    const findYearsToTarget = useCallback(
      (target: number) => {
        const index = data.findIndex((d) => d.moderate >= target);
        return index === -1 ? null : index + 1;
      },
      [data]
    );

    const goals = useMemo(() => {
      const items = [];

      if (coastFINumber && coastFINumber > 0) {
        items.push({
          label: "Coast FI",
          target: coastFINumber,
          progress: calculateProgress(coastFINumber),
          yearsToTarget: findYearsToTarget(coastFINumber),
          color: "amber",
          icon: <PiggyBank className="h-4 w-4" />,
          description: "Stop saving, let compounding do the rest",
        });
      }

      if (fiNumber && fiNumber > 0) {
        items.push({
          label: "Financial Independence",
          target: fiNumber,
          progress: calculateProgress(fiNumber),
          yearsToTarget: findYearsToTarget(fiNumber),
          color: "emerald",
          icon: <Flag className="h-4 w-4" />,
          description: "Work becomes optional",
        });
      }

      if (retirementTarget && retirementTarget > 0 && retirementTarget !== fiNumber) {
        items.push({
          label: "Retirement Target",
          target: retirementTarget,
          progress: calculateProgress(retirementTarget),
          yearsToTarget: findYearsToTarget(retirementTarget),
          color: "purple",
          icon: <Rocket className="h-4 w-4" />,
          description: "Full retirement funding goal",
        });
      }

      return items;
    }, [coastFINumber, fiNumber, retirementTarget, calculateProgress, findYearsToTarget]);

    if (goals.length === 0) {
      return null;
    }

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5 text-emerald-500" />
            <CardTitle>Goals Progress</CardTitle>
          </div>
          <CardDescription>
            How close you are to your financial milestones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {goals.map((goal) => (
              <div key={goal.label}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={cn(
                        "p-1.5 rounded",
                        goal.color === "amber" && "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
                        goal.color === "emerald" && "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
                        goal.color === "purple" && "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
                      )}
                    >
                      {goal.icon}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{goal.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {goal.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-semibold">{fmt(goal.target)}</p>
                    {goal.yearsToTarget !== null && goal.progress < 100 && (
                      <p className="text-xs text-muted-foreground">
                        ~{goal.yearsToTarget} years
                      </p>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-700 rounded-full",
                        goal.color === "amber" && "bg-gradient-to-r from-amber-400 to-amber-500",
                        goal.color === "emerald" && "bg-gradient-to-r from-emerald-400 to-emerald-500",
                        goal.color === "purple" && "bg-gradient-to-r from-purple-400 to-purple-500"
                      )}
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>{fmt(currentNetWorth)}</span>
                    <span className="font-medium">
                      {goal.progress >= 100 ? "Complete!" : `${goal.progress.toFixed(1)}%`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }
);
GoalsOverlay.displayName = "GoalsOverlay";

// ==================== Main Component ====================

export const NetWorthProjector: React.FC<NetWorthProjectorProps> = React.memo(
  ({
    totalAssets,
    totalLiabilities,
    currentNetWorth: currentNetWorthOverride,
    taxableBalance,
    pretaxBalance,
    rothBalance,
    annualContributions,
    employerMatch = 0,
    annualDebtPaydown = 0,
    // totalDebt and defaultReturnRate reserved for future features
    totalDebt: _totalDebt = 0,
    defaultReturnRate: _defaultReturnRate = 7,
    inflationRate = 3,
    fiNumber,
    retirementTarget,
    coastFIAge,
    coastFINumber,
    currentAge,
    retirementAge,
    projectionYears = 40,
  }) => {
    // Silence unused variable warnings for reserved props
    void _totalDebt;
    void _defaultReturnRate;

    // State
    const [showInflationAdjusted, setShowInflationAdjusted] = useState(false);
    const [activeTab, setActiveTab] = useState("projection");

    // Calculate current net worth
    const currentNetWorth = useMemo(() => {
      return currentNetWorthOverride ?? totalAssets - totalLiabilities;
    }, [currentNetWorthOverride, totalAssets, totalLiabilities]);

    // Total annual savings
    const totalAnnualSavings = useMemo(() => {
      return annualContributions + employerMatch + annualDebtPaydown;
    }, [annualContributions, employerMatch, annualDebtPaydown]);

    // Generate projection data
    const projectionData = useMemo((): ProjectionDataPoint[] => {
      const data: ProjectionDataPoint[] = [];
      const currentYear = new Date().getFullYear();
      const inflationMultiplier = 1 + inflationRate / 100;

      let conservativeBalance = currentNetWorth;
      let moderateBalance = currentNetWorth;
      let aggressiveBalance = currentNetWorth;

      let cumulativeContributions = 0;
      let cumulativeReturnsModerate = 0;
      let cumulativeDebtPaydown = 0;

      for (let year = 0; year <= projectionYears; year++) {
        const yearContributions = annualContributions + employerMatch;
        const yearDebtPaydown = annualDebtPaydown;

        // Calculate returns for each scenario
        const conservativeReturn =
          conservativeBalance * RETURN_RATES.conservative;
        const moderateReturn = moderateBalance * RETURN_RATES.moderate;
        const aggressiveReturn = aggressiveBalance * RETURN_RATES.aggressive;

        // Update balances
        if (year > 0) {
          conservativeBalance +=
            conservativeReturn + yearContributions + yearDebtPaydown;
          moderateBalance +=
            moderateReturn + yearContributions + yearDebtPaydown;
          aggressiveBalance +=
            aggressiveReturn + yearContributions + yearDebtPaydown;

          cumulativeContributions += yearContributions;
          cumulativeReturnsModerate += moderateReturn;
          cumulativeDebtPaydown += yearDebtPaydown;
        }

        // Calculate real (inflation-adjusted) values
        const inflationFactor = Math.pow(inflationMultiplier, year);

        data.push({
          year: currentYear + year,
          age: currentAge + year,
          conservative: conservativeBalance,
          moderate: moderateBalance,
          aggressive: aggressiveBalance,
          conservativeReal: conservativeBalance / inflationFactor,
          moderateReal: moderateBalance / inflationFactor,
          aggressiveReal: aggressiveBalance / inflationFactor,
          cumulativeContributions,
          cumulativeReturns: cumulativeReturnsModerate,
          cumulativeDebtPaydown,
          yearContributions,
          yearReturns: moderateReturn,
          yearDebtPaydown,
        });
      }

      return data;
    }, [
      currentNetWorth,
      annualContributions,
      employerMatch,
      annualDebtPaydown,
      inflationRate,
      projectionYears,
      currentAge,
    ]);

    // Calculate milestones
    const milestones = useMemo((): MilestoneInfo[] => {
      return MILESTONES.map((amount) => {
        const findYearsToReach = (
          scenario: "conservative" | "moderate" | "aggressive"
        ): number | null => {
          const key = showInflationAdjusted
            ? (`${scenario}Real` as const)
            : scenario;
          const index = projectionData.findIndex(
            (d) => (d[key] as number) >= amount
          );
          if (index === -1) return null;
          if (index === 0) return 0;

          // Interpolate
          const prev = projectionData[index - 1][key] as number;
          const curr = projectionData[index][key] as number;
          const fraction = (amount - prev) / (curr - prev);
          return index - 1 + fraction;
        };

        const iconMap: Record<number, React.ReactNode> = {
          100000: <Award className="h-3 w-3" />,
          250000: <Award className="h-3 w-3" />,
          500000: <Award className="h-3 w-3" />,
          750000: <Award className="h-3 w-3" />,
          1000000: <Rocket className="h-3 w-3" />,
          2000000: <Rocket className="h-3 w-3" />,
          5000000: <Rocket className="h-3 w-3" />,
        };

        return {
          amount,
          label: formatMilestone(amount),
          yearsToReach: {
            conservative: findYearsToReach("conservative"),
            moderate: findYearsToReach("moderate"),
            aggressive: findYearsToReach("aggressive"),
          },
          icon: iconMap[amount] || <Target className="h-3 w-3" />,
        };
      });
    }, [projectionData, showInflationAdjusted]);

    // Calculate $100K milestones for Munger quote section
    const hundredKMilestones = useMemo((): HundredKMilestone[] => {
      const milestoneAmounts = [
        100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 900000,
        1000000,
      ];
      const results: HundredKMilestone[] = [];
      let lastYear = 0;

      milestoneAmounts.forEach((amount) => {
        const index = projectionData.findIndex((d) => d.moderate >= amount);
        if (index !== -1) {
          // Interpolate for accuracy
          const prev =
            index > 0 ? projectionData[index - 1].moderate : currentNetWorth;
          const curr = projectionData[index].moderate;
          const fraction = (amount - prev) / (curr - prev);
          const exactYear = index - 1 + fraction + 1;

          results.push({
            milestone: amount,
            yearsToReach: Math.max(0, exactYear - lastYear),
            cumulativeYears: exactYear,
            age: currentAge + Math.ceil(exactYear),
          });

          lastYear = exactYear;
        }
      });

      return results;
    }, [projectionData, currentNetWorth, currentAge]);

    return (
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header with Real/Nominal Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Your Wealth Trajectory
              </h2>
              <p className="text-muted-foreground">
                Visualize your journey to financial independence
              </p>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <span
                className={cn(
                  "text-sm transition-colors",
                  !showInflationAdjusted
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Nominal
              </span>
              <Switch
                checked={showInflationAdjusted}
                onCheckedChange={setShowInflationAdjusted}
                aria-label="Toggle inflation adjustment"
              />
              <span
                className={cn(
                  "text-sm transition-colors",
                  showInflationAdjusted
                    ? "font-medium text-foreground"
                    : "text-muted-foreground"
                )}
              >
                Real
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-sm">
                    <strong>Nominal:</strong> Future dollars at face value.
                    <br />
                    <strong>Real:</strong> Adjusted for inflation - what your
                    money can actually buy in today&apos;s dollars.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Current Net Worth Snapshot */}
          <NetWorthSnapshot
            totalAssets={totalAssets}
            totalLiabilities={totalLiabilities}
            netWorth={currentNetWorth}
            taxableBalance={taxableBalance}
            pretaxBalance={pretaxBalance}
            rothBalance={rothBalance}
          />

          {/* Main Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="projection" className="gap-1">
                <TrendingUp className="h-4 w-4 hidden sm:block" />
                Projection
              </TabsTrigger>
              <TabsTrigger value="drivers" className="gap-1">
                <Zap className="h-4 w-4 hidden sm:block" />
                Drivers
              </TabsTrigger>
              <TabsTrigger value="milestones" className="gap-1">
                <Target className="h-4 w-4 hidden sm:block" />
                Milestones
              </TabsTrigger>
              <TabsTrigger value="scenarios" className="gap-1">
                <LineChartIcon className="h-4 w-4 hidden sm:block" />
                Scenarios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projection" className="mt-6 space-y-6">
              {/* Growth Projection Chart */}
              <GrowthProjectionChart
                data={projectionData}
                showInflationAdjusted={showInflationAdjusted}
                milestones={milestones}
                fiNumber={fiNumber}
                retirementTarget={retirementTarget}
                coastFINumber={coastFINumber}
                coastFIAge={coastFIAge}
                currentAge={currentAge}
                retirementAge={retirementAge}
              />

              {/* Goals Integration */}
              {(fiNumber || retirementTarget || coastFINumber) && (
                <GoalsOverlay
                  currentNetWorth={currentNetWorth}
                  fiNumber={fiNumber}
                  retirementTarget={retirementTarget}
                  coastFINumber={coastFINumber}
                  data={projectionData}
                />
              )}
            </TabsContent>

            <TabsContent value="drivers" className="mt-6 space-y-6">
              {/* Growth Drivers */}
              <GrowthDriversChart
                data={projectionData}
                showInflationAdjusted={showInflationAdjusted}
              />

              {/* First $100K Card */}
              <First100KCard
                hundredKMilestones={hundredKMilestones}
                currentNetWorth={currentNetWorth}
              />
            </TabsContent>

            <TabsContent value="milestones" className="mt-6 space-y-6">
              {/* Time to Milestones */}
              <TimeToMilestones
                milestones={milestones}
                currentNetWorth={currentNetWorth}
              />

              {/* First $100K Card (duplicate in this tab for emphasis) */}
              <First100KCard
                hundredKMilestones={hundredKMilestones}
                currentNetWorth={currentNetWorth}
              />
            </TabsContent>

            <TabsContent value="scenarios" className="mt-6 space-y-6">
              {/* Scenario Comparison */}
              <ScenarioComparison
                data={projectionData}
                showInflationAdjusted={showInflationAdjusted}
                currentNetWorth={currentNetWorth}
              />
            </TabsContent>
          </Tabs>

          {/* Key Insights Footer */}
          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Time in Market</p>
                    <p className="text-xs text-muted-foreground">
                      {projectionYears} years of projection
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                    <PiggyBank className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Annual Savings</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {fmt(totalAnnualSavings)}/year
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Projected Growth</p>
                    <p className="text-xs text-muted-foreground font-mono">
                      {fmt(
                        projectionData[projectionData.length - 1]?.moderate -
                          currentNetWorth || 0
                      )}{" "}
                      total
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>
    );
  }
);

NetWorthProjector.displayName = "NetWorthProjector";

export default NetWorthProjector;
