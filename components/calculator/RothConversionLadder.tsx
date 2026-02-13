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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  DollarSign,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  ArrowRight,
  Info,
  Shield,
  Target,
  Zap,
} from "lucide-react";
import {
  generateConversionLadder,
  validateRothLadderInputs,
  type RothLadderInputs,
  type RothLadderResult,
  type ConversionYear,
  type TimelineEntry,
} from "@/lib/calculations/rothConversionOptimizer";
import type { FilingStatus } from "@/types/planner";

// ===============================
// Types
// ===============================

interface RothConversionLadderProps {
  /** Initial values from parent form (optional) */
  initialValues?: Partial<RothLadderInputs>;
  /** Callback when values change */
  onValuesChange?: (values: RothLadderInputs) => void;
  /** Whether the calculator is in a loading state */
  isLoading?: boolean;
}

// ===============================
// Utility Functions
// ===============================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

// ===============================
// Sub-Components
// ===============================

interface LadderVisualizationProps {
  conversionSchedule: ConversionYear[];
  currentAge: number;
  retirementAge: number;
}

const LadderVisualization = React.memo(function LadderVisualization({
  conversionSchedule,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentAge,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  retirementAge,
}: LadderVisualizationProps) {
  if (conversionSchedule.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Enter your details to see your conversion ladder</p>
      </div>
    );
  }

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-4">
      {/* Ladder Header */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Conversion Year</span>
        <span>5-Year Rule</span>
        <span>Accessible</span>
      </div>

      {/* Ladder Rungs */}
      <div className="space-y-2">
        {conversionSchedule.slice(0, 10).map((conversion, index) => {
          const yearsUntilAccessible = conversion.accessibleYear - currentYear;
          const isAccessibleNow = yearsUntilAccessible <= 0;
          const progressPercent = Math.min(100, ((5 - Math.max(0, yearsUntilAccessible)) / 5) * 100);

          return (
            <div
              key={conversion.year}
              className="relative border rounded-lg p-3 bg-gradient-to-r from-blue-50 to-transparent dark:from-blue-950/30 dark:to-transparent"
            >
              {/* Connection line to next rung */}
              {index < conversionSchedule.length - 1 && index < 9 && (
                <div className="absolute left-6 top-full w-0.5 h-2 bg-blue-200 dark:bg-blue-800 z-0" />
              )}

              <div className="flex items-center justify-between gap-4">
                {/* Year & Amount */}
                <div className="flex items-center gap-3 min-w-[180px]">
                  <div className="h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                    {conversion.year}
                  </div>
                  <div>
                    <div className="font-semibold">
                      {formatCurrency(conversion.conversionAmount)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Age {conversion.age} ({conversion.calendarYear})
                    </div>
                  </div>
                </div>

                {/* Progress Bar (5-year rule) */}
                <div className="flex-1 max-w-[200px]">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        isAccessibleNow
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    {isAccessibleNow
                      ? "Ready!"
                      : `${yearsUntilAccessible} years remaining`}
                  </div>
                </div>

                {/* Accessible Info */}
                <div className="text-right min-w-[100px]">
                  {isAccessibleNow ? (
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Accessible
                    </Badge>
                  ) : (
                    <div className="text-sm">
                      <div className="font-medium">Age {conversion.accessibleAge}</div>
                      <div className="text-xs text-muted-foreground">
                        {conversion.accessibleYear}
                      </div>
                    </div>
                  )}
                </div>

                {/* Tax Info */}
                <div className="text-right min-w-[80px]">
                  <div className="text-sm text-muted-foreground">Tax:</div>
                  <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                    {formatCurrency(conversion.totalTax)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {conversionSchedule.length > 10 && (
          <div className="text-center text-sm text-muted-foreground py-2">
            ...and {conversionSchedule.length - 10} more years
          </div>
        )}
      </div>
    </div>
  );
});

interface TimelineVisualizationProps {
  timeline: TimelineEntry[];
  currentAge: number;
}

const TimelineVisualization = React.memo(function TimelineVisualization({
  timeline,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentAge,
}: TimelineVisualizationProps) {
  if (timeline.length === 0) {
    return null;
  }

  const colorMap: Record<TimelineEntry["color"], string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    orange: "bg-orange-500",
    purple: "bg-purple-500",
    red: "bg-red-500",
  };

  const iconMap: Record<TimelineEntry["event"], React.ReactNode> = {
    conversion: <DollarSign className="h-4 w-4" />,
    accessible: <CheckCircle2 className="h-4 w-4" />,
    age59_5: <Shield className="h-4 w-4" />,
    rmd_start: <AlertTriangle className="h-4 w-4" />,
    retirement: <Target className="h-4 w-4" />,
  };

  // Group consecutive conversions to avoid clutter
  const condensedTimeline = timeline.reduce<TimelineEntry[]>((acc, entry) => {
    if (entry.event === "conversion") {
      const lastEntry = acc[acc.length - 1];
      if (
        lastEntry?.event === "conversion" &&
        entry.age - (acc.filter((e) => e.event === "conversion").length > 5 ? 0 : 1) === lastEntry.age
      ) {
        // Skip showing every single conversion after the first few
        if (acc.filter((e) => e.event === "conversion").length < 3) {
          acc.push(entry);
        }
        return acc;
      }
    }
    acc.push(entry);
    return acc;
  }, []);

  // Show first 3 conversions, key milestones, and last conversion
  const significantEvents = condensedTimeline.filter(
    (e) =>
      e.event !== "conversion" ||
      condensedTimeline.filter((x) => x.event === "conversion").indexOf(e) < 3
  );

  return (
    <div className="relative">
      {/* Horizontal scrollable timeline */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max px-2">
          {significantEvents.slice(0, 12).map((entry, index) => (
            <div
              key={`${entry.event}-${entry.age}-${index}`}
              className="relative flex flex-col items-center min-w-[140px]"
            >
              {/* Connection line */}
              {index < significantEvents.length - 1 && (
                <div className="absolute top-6 left-[50%] w-full h-0.5 bg-border z-0" />
              )}

              {/* Event node */}
              <div
                className={`relative z-10 h-12 w-12 rounded-full ${
                  colorMap[entry.color]
                } flex items-center justify-center text-white shadow-lg mb-2`}
              >
                {iconMap[entry.event]}
              </div>

              {/* Event details */}
              <div className="text-center space-y-1">
                <Badge variant="outline" className="font-mono text-xs">
                  Age {entry.age}
                </Badge>
                <div className="font-semibold text-sm">{entry.description}</div>
                <div className="text-xs text-muted-foreground">
                  {entry.calendarYear}
                </div>
                {entry.amount && (
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">
                    {formatCurrency(entry.amount)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

interface BridgeAnalysisCardProps {
  result: RothLadderResult;
  annualSpending: number;
}

const BridgeAnalysisCard = React.memo(function BridgeAnalysisCard({
  result,
  annualSpending,
}: BridgeAnalysisCardProps) {
  const { bridgeAnalysis } = result;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-purple-600" />
          Early Retirement Bridge Analysis
        </CardTitle>
        <CardDescription>
          How you will fund spending before Roth conversions become accessible
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900">
            <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">
              Bridge Period
            </div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {bridgeAnalysis.yearsUntilFirstConversionAccessible} years
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
              Until first conversion accessible
            </div>
          </div>

          <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
            <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">
              Bridge Funding Needed
            </div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(bridgeAnalysis.totalBridgeFundingNeeded)}
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              {formatCurrency(annualSpending)}/year spending
            </div>
          </div>

          <div
            className={`rounded-lg border p-4 ${
              bridgeAnalysis.isBridgeFunded
                ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
            }`}
          >
            <div
              className={`text-sm mb-1 ${
                bridgeAnalysis.isBridgeFunded
                  ? "text-green-700 dark:text-green-400"
                  : "text-red-700 dark:text-red-400"
              }`}
            >
              {bridgeAnalysis.isBridgeFunded ? "Bridge Status" : "Funding Gap"}
            </div>
            <div
              className={`text-2xl font-bold ${
                bridgeAnalysis.isBridgeFunded
                  ? "text-green-900 dark:text-green-100"
                  : "text-red-900 dark:text-red-100"
              }`}
            >
              {bridgeAnalysis.isBridgeFunded ? (
                <span className="flex items-center gap-2">
                  <CheckCircle2 className="h-6 w-6" />
                  Funded
                </span>
              ) : (
                formatCurrency(bridgeAnalysis.bridgeFundingGap)
              )}
            </div>
            <div
              className={`text-xs mt-1 ${
                bridgeAnalysis.isBridgeFunded
                  ? "text-green-600 dark:text-green-400"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {bridgeAnalysis.isBridgeFunded
                ? "Taxable + Roth basis covers bridge"
                : "Additional savings needed"}
            </div>
          </div>
        </div>

        {/* Bridge Funding Sources */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Available Bridge Funds</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500" />
                <span className="text-sm">Taxable Brokerage</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(bridgeAnalysis.taxableAccountBalance)}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border bg-card">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-500" />
                <span className="text-sm">Roth Contribution Basis</span>
              </div>
              <span className="font-semibold">
                {formatCurrency(bridgeAnalysis.rothContributionBasis)}
              </span>
            </div>
          </div>
        </div>

        {/* Withdrawal Schedule Preview */}
        {bridgeAnalysis.withdrawalSchedule.length > 0 && (
          <div className="space-y-3">
            <div className="text-sm font-medium">Withdrawal Strategy (First 5 Years)</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Year</th>
                    <th className="text-left py-2 px-2">Age</th>
                    <th className="text-left py-2 px-2">Source</th>
                    <th className="text-right py-2 px-2">Amount</th>
                    <th className="text-right py-2 px-2">Tax/Penalty</th>
                  </tr>
                </thead>
                <tbody>
                  {bridgeAnalysis.withdrawalSchedule.slice(0, 5).map((w) => (
                    <tr key={w.year} className="border-b last:border-0">
                      <td className="py-2 px-2">{w.year}</td>
                      <td className="py-2 px-2">{w.age}</td>
                      <td className="py-2 px-2">
                        <Badge
                          variant="outline"
                          className={
                            w.source === "taxable"
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : w.source === "roth_basis"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : w.source === "roth_conversion"
                              ? "bg-purple-50 text-purple-700 border-purple-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }
                        >
                          {w.source.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Badge>
                      </td>
                      <td className="py-2 px-2 text-right font-medium">
                        {formatCurrency(w.amount)}
                      </td>
                      <td className="py-2 px-2 text-right text-orange-600">
                        {w.taxOrPenalty > 0 ? formatCurrency(w.taxOrPenalty) : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Bridge Fund Strategy
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>
                  <strong>Taxable accounts:</strong> Withdraw first (favorable LTCG rates on gains)
                </li>
                <li>
                  <strong>Roth contributions:</strong> Withdraw tax and penalty free anytime
                </li>
                <li>
                  <strong>Roth conversions:</strong> Wait 5 years, then withdraw tax/penalty free
                </li>
                <li>
                  <strong>Traditional 401k/IRA:</strong> Last resort (10% penalty + income tax before 59.5)
                </li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

interface OptimizationSummaryProps {
  result: RothLadderResult;
}

const OptimizationSummary = React.memo(function OptimizationSummary({
  result,
}: OptimizationSummaryProps) {
  const { summary } = result;

  return (
    <div className="space-y-6">
      {/* Key Recommendation */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-900 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Zap className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
              Recommended Strategy
            </div>
            <p className="text-sm text-green-800 dark:text-green-200">
              Convert{" "}
              <strong>
                {formatCurrency(summary.avgAnnualConversion)}/year
              </strong>{" "}
              over <strong>{summary.conversionYears} years</strong> to fill the{" "}
              <strong>{formatPercent(summary.targetBracket)}</strong> tax bracket.
              This strategy could save you{" "}
              <strong>{formatCurrency(summary.lifetimeTaxSavings)}</strong> in
              lifetime taxes.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">Total to Convert</div>
          <div className="text-2xl font-bold">
            {formatCurrency(summary.totalToConvert)}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">Conversion Taxes</div>
          <div className="text-2xl font-bold text-orange-600">
            {formatCurrency(summary.totalConversionTaxes)}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">Effective Rate</div>
          <div className="text-2xl font-bold">
            {formatPercent(summary.effectiveConversionRate)}
          </div>
        </div>
        <div className="rounded-lg border p-4 bg-card">
          <div className="text-sm text-muted-foreground mb-1">RMD Reduction</div>
          <div className="text-2xl font-bold text-green-600">
            {formatCurrency(summary.rmdReduction)}
          </div>
        </div>
      </div>

      {/* Tax Comparison */}
      <div className="space-y-3">
        <div className="text-sm font-medium">Tax Strategy Comparison</div>
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-lg border bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">No Conversions</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Estimated taxes at 32%+ bracket
              </div>
              <div className="font-semibold text-red-700">
                {formatCurrency(
                  summary.totalToConvert * 0.32 + summary.lifetimeTaxSavings
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 rounded-lg border bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">With Conversion Ladder</span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                Taxes at {formatPercent(summary.targetBracket)} bracket
              </div>
              <div className="font-semibold text-green-700">
                {formatCurrency(summary.totalConversionTaxes)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center gap-2 text-green-600 font-semibold">
          <TrendingUp className="h-5 w-5" />
          <span>
            Lifetime Savings: {formatCurrency(summary.lifetimeTaxSavings)}
          </span>
        </div>
      </div>

      {/* Warnings */}
      {summary.warnings.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Considerations
              </div>
              <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                {summary.warnings.map((warning, i) => (
                  <li key={i}>{warning}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// ===============================
// Main Component
// ===============================

export const RothConversionLadder = React.memo(function RothConversionLadder({
  initialValues,
  onValuesChange,
  isLoading,
}: RothConversionLadderProps) {
  // Form state
  const [currentAge, setCurrentAge] = useState(initialValues?.currentAge ?? 35);
  const [retirementAge, setRetirementAge] = useState(initialValues?.retirementAge ?? 45);
  const [traditionalBalance, setTraditionalBalance] = useState(
    initialValues?.traditionalBalance ?? 500000
  );
  const [rothBalance, setRothBalance] = useState(initialValues?.rothBalance ?? 100000);
  const [rothContributionBasis, setRothContributionBasis] = useState(
    initialValues?.rothContributionBasis ?? 50000
  );
  const [taxableBalance, setTaxableBalance] = useState(
    initialValues?.taxableBalance ?? 200000
  );
  const [annualSpending, setAnnualSpending] = useState(
    initialValues?.annualSpending ?? 50000
  );
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(
    initialValues?.filingStatus ?? "married"
  );
  const [stateRate, setStateRate] = useState(initialValues?.stateRate ?? 5);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [expectedReturn, _setExpectedReturn] = useState(
    initialValues?.expectedReturn ?? 7
  );
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [inflationRate, _setInflationRate] = useState(
    initialValues?.inflationRate ?? 3
  );
  const [considerACASubsidies, setConsiderACASubsidies] = useState(
    initialValues?.considerACASubsidies ?? false
  );
  const [householdSize, setHouseholdSize] = useState(
    initialValues?.householdSize ?? 2
  );

  // Build inputs object
  const inputs: RothLadderInputs = useMemo(
    () => ({
      currentAge,
      retirementAge,
      traditionalBalance,
      rothBalance,
      rothContributionBasis,
      taxableBalance,
      annualSpending,
      filingStatus,
      stateRate,
      expectedReturn,
      inflationRate,
      considerACASubsidies,
      householdSize,
    }),
    [
      currentAge,
      retirementAge,
      traditionalBalance,
      rothBalance,
      rothContributionBasis,
      taxableBalance,
      annualSpending,
      filingStatus,
      stateRate,
      expectedReturn,
      inflationRate,
      considerACASubsidies,
      householdSize,
    ]
  );

  // Validate inputs
  const validationErrors = useMemo(
    () => validateRothLadderInputs(inputs),
    [inputs]
  );

  // Calculate result
  const result: RothLadderResult | null = useMemo(() => {
    if (validationErrors.length > 0) {
      return null;
    }
    try {
      return generateConversionLadder(inputs);
    } catch (error) {
      console.error("Error generating conversion ladder:", error);
      return null;
    }
  }, [inputs, validationErrors]);

  // Notify parent of changes (available for future integration)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _handleValuesChange = useCallback(() => {
    if (onValuesChange) {
      onValuesChange(inputs);
    }
  }, [inputs, onValuesChange]);

  // Parse numeric input safely
  const parseNumericInput = (value: string, defaultValue: number): number => {
    const parsed = parseFloat(value.replace(/[^0-9.-]/g, ""));
    return isNaN(parsed) ? defaultValue : parsed;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600 animate-pulse" />
            Roth Conversion Ladder Calculator
          </CardTitle>
          <CardDescription>Calculating optimal conversion strategy...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card with Explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Roth Conversion Ladder Calculator
          </CardTitle>
          <CardDescription>
            Plan your tax-free early retirement withdrawals using the 5-year conversion ladder strategy
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  What is a Roth Conversion Ladder?
                </div>
                <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                  <p>
                    Early retirees (before age 59.5) can access retirement funds without the
                    10% early withdrawal penalty by using a Roth conversion ladder:
                  </p>
                  <ol className="list-decimal list-inside space-y-1 ml-2">
                    <li>
                      <strong>Convert</strong> Traditional IRA/401k to Roth IRA
                    </li>
                    <li>
                      <strong>Pay</strong> ordinary income tax on the conversion (ideally in low tax brackets)
                    </li>
                    <li>
                      <strong>Wait 5 years</strong> (the 5-year rule for converted amounts)
                    </li>
                    <li>
                      <strong>Withdraw</strong> the converted amount tax and penalty free
                    </li>
                  </ol>
                  <p className="mt-2 text-xs">
                    <strong>Note:</strong> You need a bridge fund (taxable accounts or Roth contribution basis) to cover
                    the first 5 years while waiting for conversions to become accessible.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Input Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Information</CardTitle>
          <CardDescription>
            Enter your details to calculate your optimal conversion strategy
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Age and Retirement */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Retirement Planning</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="currentAge">Current Age</Label>
                  <span className="text-sm font-medium">{currentAge}</span>
                </div>
                <Slider
                  id="currentAge"
                  value={[currentAge]}
                  onValueChange={([value]) => setCurrentAge(value)}
                  min={25}
                  max={65}
                  step={1}
                  thumbLabel="Current age"
                />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <Label htmlFor="retirementAge">Target Retirement Age</Label>
                  <span className="text-sm font-medium">{retirementAge}</span>
                </div>
                <Slider
                  id="retirementAge"
                  value={[retirementAge]}
                  onValueChange={([value]) => setRetirementAge(value)}
                  min={Math.max(30, currentAge + 1)}
                  max={70}
                  step={1}
                  thumbLabel="Retirement age"
                />
              </div>
            </div>
          </div>

          {/* Account Balances */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Account Balances</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="traditionalBalance">Traditional IRA/401k</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="traditionalBalance"
                    type="text"
                    value={traditionalBalance.toLocaleString()}
                    onChange={(e) =>
                      setTraditionalBalance(parseNumericInput(e.target.value, 0))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rothBalance">Roth IRA Balance</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rothBalance"
                    type="text"
                    value={rothBalance.toLocaleString()}
                    onChange={(e) =>
                      setRothBalance(parseNumericInput(e.target.value, 0))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rothContributionBasis">
                  Roth Contribution Basis
                  <span className="text-xs text-muted-foreground ml-1">
                    (Original contributions)
                  </span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="rothContributionBasis"
                    type="text"
                    value={rothContributionBasis.toLocaleString()}
                    onChange={(e) =>
                      setRothContributionBasis(parseNumericInput(e.target.value, 0))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxableBalance">
                  Taxable Brokerage
                  <span className="text-xs text-muted-foreground ml-1">
                    (Bridge fund)
                  </span>
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="taxableBalance"
                    type="text"
                    value={taxableBalance.toLocaleString()}
                    onChange={(e) =>
                      setTaxableBalance(parseNumericInput(e.target.value, 0))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Spending and Tax Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-muted-foreground" />
              <Label className="font-semibold">Spending and Tax Details</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="annualSpending">Annual Spending (Retirement)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="annualSpending"
                    type="text"
                    value={annualSpending.toLocaleString()}
                    onChange={(e) =>
                      setAnnualSpending(parseNumericInput(e.target.value, 0))
                    }
                    className="pl-8"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filingStatus">Filing Status</Label>
                <Select
                  value={filingStatus}
                  onValueChange={(value) => setFilingStatus(value as FilingStatus)}
                >
                  <SelectTrigger id="filingStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="married">Married Filing Jointly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="stateRate">State Income Tax Rate (%)</Label>
                <Input
                  id="stateRate"
                  type="number"
                  value={stateRate}
                  onChange={(e) =>
                    setStateRate(parseNumericInput(e.target.value, 0))
                  }
                  min={0}
                  max={15}
                  step={0.1}
                />
              </div>
            </div>
          </div>

          {/* ACA Subsidies */}
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className="font-semibold">ACA Healthcare Subsidies</Label>
              </div>
              <Switch
                checked={considerACASubsidies}
                onCheckedChange={setConsiderACASubsidies}
              />
            </div>
            {considerACASubsidies && (
              <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Limiting conversions to stay below the ACA subsidy cliff (400% FPL) can
                      preserve thousands in healthcare subsidies. Household size affects the income threshold.
                    </p>
                    <div className="mt-3">
                      <Label htmlFor="householdSize" className="text-sm">
                        Household Size
                      </Label>
                      <Select
                        value={householdSize.toString()}
                        onValueChange={(value) => setHouseholdSize(parseInt(value))}
                      >
                        <SelectTrigger id="householdSize" className="mt-1 w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 person</SelectItem>
                          <SelectItem value="2">2 people</SelectItem>
                          <SelectItem value="3">3 people</SelectItem>
                          <SelectItem value="4">4+ people</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                    Please correct the following:
                  </div>
                  <ul className="text-sm text-red-800 dark:text-red-200 list-disc list-inside">
                    {validationErrors.map((error, i) => (
                      <li key={i}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {result && (
        <Tabs defaultValue="ladder" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="ladder">Conversion Ladder</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="bridge">Bridge Analysis</TabsTrigger>
            <TabsTrigger value="optimization">Optimization</TabsTrigger>
          </TabsList>

          <TabsContent value="ladder" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5 text-blue-600" />
                  Your Conversion Ladder
                </CardTitle>
                <CardDescription>
                  Annual conversions with 5-year accessibility tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LadderVisualization
                  conversionSchedule={result.conversionSchedule}
                  currentAge={currentAge}
                  retirementAge={retirementAge}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-purple-600" />
                  Retirement Timeline
                </CardTitle>
                <CardDescription>
                  Key milestones in your early retirement journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TimelineVisualization timeline={result.timeline} currentAge={currentAge} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bridge" className="mt-4">
            <BridgeAnalysisCard result={result} annualSpending={annualSpending} />
          </TabsContent>

          <TabsContent value="optimization" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Optimization Summary
                </CardTitle>
                <CardDescription>
                  Tax savings and strategy analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <OptimizationSummary result={result} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Educational Footer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            Important Considerations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="font-semibold text-sm">5-Year Rule</div>
              <p className="text-sm text-muted-foreground">
                Each Roth conversion has its own 5-year clock. Converted amounts can be
                withdrawn tax and penalty free after 5 years AND reaching age 59.5.
                Before 59.5, the 5-year rule applies to each conversion separately.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm">Rule of 55</div>
              <p className="text-sm text-muted-foreground">
                If you leave your job at age 55 or later, you may be able to access
                your 401(k) without penalty through the Rule of 55. This can provide
                additional bridge funding while conversions mature.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm">Healthcare Costs</div>
              <p className="text-sm text-muted-foreground">
                Early retirees must fund healthcare before Medicare eligibility at 65.
                ACA subsidies can significantly reduce costs but have income limits.
                Factor this into your annual spending estimates.
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-semibold text-sm">Pro Rata Rule</div>
              <p className="text-sm text-muted-foreground">
                If you have both pre-tax and after-tax funds in Traditional IRAs,
                conversions are taxed proportionally across all IRAs. Consider
                consolidating or rolling over to simplify conversions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

RothConversionLadder.displayName = "RothConversionLadder";

export default RothConversionLadder;
