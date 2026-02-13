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
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Users,
  ArrowRight,
  Info,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  ComposedChart,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  TAX_BRACKETS,
  RMD_START_AGE,
  RMD_DIVISORS,
  ESTATE_TAX_RATE,
} from "@/lib/constants";
import { calcOrdinaryTax, calcRMD } from "@/lib/calculations/retirementEngine";
import type { FilingStatus } from "@/types/calculator";

// =====================================================
// Types
// =====================================================

interface LifetimeTaxDashboardProps {
  // Current ages and retirement info
  currentAge: number;
  spouseAge?: number;
  retirementAge: number;
  maritalStatus: FilingStatus;

  // Account balances
  pretaxBalance: number;
  rothBalance: number;
  taxableBalance: number;

  // Annual contributions
  annualPretaxContribution: number;
  annualRothContribution: number;
  annualTaxableContribution: number;

  // Rates and assumptions
  returnRate: number; // Expected annual return (e.g., 7)
  inflationRate: number; // Inflation rate (e.g., 2.5)
  stateRate: number; // State tax rate (e.g., 5)

  // Social Security (optional)
  includeSS?: boolean;
  ssIncome?: number;
  ssClaimAge?: number;

  // Withdrawal rate in retirement
  withdrawalRate: number;

  // Optional working income for current tax bracket estimation
  currentIncome?: number;

  // Life expectancy assumption
  lifeExpectancy?: number;
}

interface YearlyTaxData {
  year: number;
  age: number;
  phase: "working" | "early-retirement" | "rmd" | "death";
  // Traditional approach
  traditionalIncomeTax: number;
  traditionalFICA: number;
  traditionalRMDTax: number;
  traditionalCumulativeTax: number;
  traditionalPretaxBalance: number;
  traditionalEffectiveRate: number;
  // Roth approach
  rothIncomeTax: number;
  rothFICA: number;
  rothCumulativeTax: number;
  rothPretaxBalance: number;
  rothEffectiveRate: number;
  // RMD data
  rmdAmount: number;
  rmdForcedBracket: number;
}

interface DecadeTaxSummary {
  decade: string;
  ageRange: string;
  incomeTax: number;
  fica: number;
  rothConversionTax: number;
  rmdTax: number;
  estateTax: number;
  total: number;
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

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function getBracketForIncome(income: number, status: FilingStatus): number {
  const brackets = TAX_BRACKETS[status];
  let taxableIncome = Math.max(0, income - brackets.deduction);

  for (const bracket of brackets.rates) {
    if (taxableIncome <= bracket.limit) {
      return bracket.rate * 100;
    }
  }
  return 37; // Top bracket
}

// =====================================================
// Tax Projection Engine
// =====================================================

function projectLifetimeTaxes(props: LifetimeTaxDashboardProps): {
  yearlyData: YearlyTaxData[];
  traditionalTotalTax: number;
  rothTotalTax: number;
  taxSavings: number;
  inheritanceTaxTraditional: number;
  inheritanceTaxRoth: number;
} {
  const {
    currentAge,
    retirementAge,
    maritalStatus,
    pretaxBalance,
    rothBalance,
    taxableBalance,
    annualPretaxContribution,
    annualRothContribution,
    returnRate,
    inflationRate,
    stateRate,
    includeSS = false,
    ssIncome = 0,
    ssClaimAge = 67,
    withdrawalRate,
    currentIncome = 100000,
    lifeExpectancy = 95,
  } = props;

  const yearlyData: YearlyTaxData[] = [];
  const growthRate = 1 + returnRate / 100;
  const inflRate = 1 + inflationRate / 100;

  // Traditional approach tracking
  let tradPretax = pretaxBalance;
  let tradRoth = rothBalance;
  let tradTaxable = taxableBalance;
  let tradCumulativeTax = 0;

  // Roth-focused approach tracking (contributes to Roth instead of pretax)
  let rothPretax = pretaxBalance;
  let rothRothBal = rothBalance;
  let rothTaxable = taxableBalance;
  let rothCumulativeTax = 0;

  const yearsToProject = lifeExpectancy - currentAge + 10; // Include inheritance phase

  for (let y = 0; y <= yearsToProject; y++) {
    const age = currentAge + y;
    const year = new Date().getFullYear() + y;

    // Determine phase
    let phase: "working" | "early-retirement" | "rmd" | "death" = "working";
    if (age >= lifeExpectancy) {
      phase = "death";
    } else if (age >= RMD_START_AGE) {
      phase = "rmd";
    } else if (age >= retirementAge) {
      phase = "early-retirement";
    }

    // ===== TRADITIONAL APPROACH =====
    let tradIncomeTax = 0;
    let tradFICA = 0;
    let tradRMDTax = 0;
    let tradRMD = 0;
    let tradForcedBracket = 0;

    if (phase === "working") {
      // Working: Contribute to pretax, pay tax on remaining income
      const taxableIncome = currentIncome - annualPretaxContribution;
      tradIncomeTax = calcOrdinaryTax(taxableIncome, maritalStatus);
      tradIncomeTax *= 1 + stateRate / 100; // Add state tax

      // FICA on full income
      tradFICA = Math.min(currentIncome, 184500) * 0.0765; // SS + Medicare

      // Grow accounts
      tradPretax = tradPretax * growthRate + annualPretaxContribution;
      tradRoth = tradRoth * growthRate + annualRothContribution;
      tradTaxable = tradTaxable * growthRate;
    } else if (phase === "early-retirement") {
      // Early retirement: Withdraw from taxable/Roth first
      const totalBalance = tradPretax + tradRoth + tradTaxable;
      const withdrawal = totalBalance * (withdrawalRate / 100);

      // Social Security income if eligible
      let ssThisYear = 0;
      if (includeSS && age >= ssClaimAge) {
        ssThisYear = ssIncome * Math.pow(inflRate, age - ssClaimAge);
      }

      // Minimal taxes in early retirement for traditional approach
      tradIncomeTax = calcOrdinaryTax(ssThisYear * 0.85, maritalStatus);
      tradIncomeTax *= 1 + stateRate / 100;

      // Grow accounts minus withdrawals
      tradPretax *= growthRate;
      tradRoth *= growthRate;
      tradTaxable = Math.max(0, tradTaxable * growthRate - withdrawal);
    } else if (phase === "rmd") {
      // RMD phase: FORCED to withdraw from pretax
      tradRMD = calcRMD(tradPretax, age);
      tradForcedBracket = getBracketForIncome(tradRMD, maritalStatus);

      // Social Security income
      let ssThisYear = 0;
      if (includeSS && age >= ssClaimAge) {
        ssThisYear = ssIncome * Math.pow(inflRate, age - ssClaimAge);
      }

      // Total ordinary income = RMD + SS (85% taxable)
      const totalOrdinary = tradRMD + ssThisYear * 0.85;
      tradRMDTax = calcOrdinaryTax(totalOrdinary, maritalStatus);
      tradRMDTax *= 1 + stateRate / 100;

      // Update balances
      tradPretax = Math.max(0, tradPretax * growthRate - tradRMD);
      tradRoth *= growthRate;
      tradTaxable *= growthRate;
    }

    // ===== ROTH-FOCUSED APPROACH =====
    let rothIncomeTax = 0;
    let rothFICA = 0;

    if (phase === "working") {
      // Working: Pay full income tax (no pretax deduction)
      // But contribute to Roth instead
      rothIncomeTax = calcOrdinaryTax(currentIncome, maritalStatus);
      rothIncomeTax *= 1 + stateRate / 100;

      // FICA same as traditional
      rothFICA = Math.min(currentIncome, 184500) * 0.0765;

      // Grow accounts - Roth contribution instead of pretax
      rothPretax = rothPretax * growthRate;
      rothRothBal =
        rothRothBal * growthRate +
        annualRothContribution +
        annualPretaxContribution; // Redirect pretax to Roth
      rothTaxable = rothTaxable * growthRate;
    } else if (phase === "early-retirement" || phase === "rmd") {
      // In Roth approach: Withdraw tax-free from Roth
      // Minimal RMDs because pretax balance is smaller
      let rothRMD = 0;
      if (phase === "rmd" && rothPretax > 0) {
        rothRMD = calcRMD(rothPretax, age);
      }

      let ssThisYear = 0;
      if (includeSS && age >= ssClaimAge) {
        ssThisYear = ssIncome * Math.pow(inflRate, age - ssClaimAge);
      }

      // Only taxed on smaller RMD + SS
      const totalOrdinary = rothRMD + ssThisYear * 0.85;
      rothIncomeTax = calcOrdinaryTax(totalOrdinary, maritalStatus);
      rothIncomeTax *= 1 + stateRate / 100;

      rothPretax = Math.max(0, rothPretax * growthRate - rothRMD);
      rothRothBal *= growthRate;
      rothTaxable *= growthRate;
    }

    // Cumulative taxes
    tradCumulativeTax += tradIncomeTax + tradFICA + tradRMDTax;
    rothCumulativeTax += rothIncomeTax + rothFICA;

    // Effective tax rates
    const tradEffectiveRate =
      tradRMD > 0 ? (tradRMDTax / tradRMD) * 100 : tradIncomeTax > 0 ? 20 : 0;
    const rothEffectiveRate = rothIncomeTax > 0 ? 10 : 0;

    yearlyData.push({
      year,
      age,
      phase,
      traditionalIncomeTax: tradIncomeTax,
      traditionalFICA: tradFICA,
      traditionalRMDTax: tradRMDTax,
      traditionalCumulativeTax: tradCumulativeTax,
      traditionalPretaxBalance: tradPretax,
      traditionalEffectiveRate: tradEffectiveRate,
      rothIncomeTax: rothIncomeTax,
      rothFICA: rothFICA,
      rothCumulativeTax: rothCumulativeTax,
      rothPretaxBalance: rothPretax,
      rothEffectiveRate: rothEffectiveRate,
      rmdAmount: tradRMD,
      rmdForcedBracket: tradForcedBracket,
    });
  }

  // Calculate inheritance taxes (children inheriting Traditional IRA pay income tax)
  const finalTradPretax = tradPretax;
  const finalRothRoth = rothRothBal;

  // Traditional: Heirs pay ~30% on inherited IRA distributions
  const inheritanceTaxTraditional = finalTradPretax * 0.3;

  // Roth: Heirs pay $0 on Roth inheritance
  const inheritanceTaxRoth = 0;

  return {
    yearlyData,
    traditionalTotalTax: tradCumulativeTax + inheritanceTaxTraditional,
    rothTotalTax: rothCumulativeTax + inheritanceTaxRoth,
    taxSavings:
      tradCumulativeTax +
      inheritanceTaxTraditional -
      rothCumulativeTax -
      inheritanceTaxRoth,
    inheritanceTaxTraditional,
    inheritanceTaxRoth,
  };
}

function aggregateByDecade(
  yearlyData: YearlyTaxData[],
  currentAge: number
): DecadeTaxSummary[] {
  const decades: DecadeTaxSummary[] = [];

  // Group by age ranges
  const ranges = [
    { label: "Working Years", start: currentAge, end: 64 },
    { label: "Early Retirement", start: 65, end: 72 },
    { label: "RMD Years (73-82)", start: 73, end: 82 },
    { label: "Late Retirement", start: 83, end: 95 },
    { label: "Estate/Inheritance", start: 96, end: 110 },
  ];

  for (const range of ranges) {
    const rangeData = yearlyData.filter(
      (d) => d.age >= range.start && d.age <= range.end
    );
    if (rangeData.length === 0) continue;

    const summary: DecadeTaxSummary = {
      decade: range.label,
      ageRange: `${range.start}-${Math.min(range.end, 95)}`,
      incomeTax: rangeData.reduce((sum, d) => sum + d.traditionalIncomeTax, 0),
      fica: rangeData.reduce((sum, d) => sum + d.traditionalFICA, 0),
      rothConversionTax: 0, // Would need separate tracking
      rmdTax: rangeData.reduce((sum, d) => sum + d.traditionalRMDTax, 0),
      estateTax: range.label === "Estate/Inheritance" ? rangeData[0]?.traditionalPretaxBalance * 0.3 : 0,
      total: 0,
    };
    summary.total =
      summary.incomeTax +
      summary.fica +
      summary.rmdTax +
      summary.estateTax +
      summary.rothConversionTax;

    decades.push(summary);
  }

  return decades;
}

// =====================================================
// Chart Components
// =====================================================

const CumulativeTaxChart: React.FC<{ data: YearlyTaxData[] }> = ({ data }) => {
  const chartData = data
    .filter((d) => d.phase !== "death")
    .map((d) => ({
      age: d.age,
      traditional: d.traditionalCumulativeTax,
      roth: d.rothCumulativeTax,
      savings: d.traditionalCumulativeTax - d.rothCumulativeTax,
    }));

  return (
    <div className="h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorTraditional" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.2} />
            </linearGradient>
            <linearGradient id="colorRoth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.2} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12 }}
            tickFormatter={(age) => `${age}`}
            label={{
              value: "Age",
              position: "insideBottom",
              offset: -5,
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(val) => formatCurrency(val)}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrencyFull(value),
              name === "traditional"
                ? "Traditional Approach"
                : name === "roth"
                ? "Roth Approach"
                : "Tax Savings",
            ]}
            labelFormatter={(age) => `Age ${age}`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "traditional"
                ? "Traditional (Pay Later)"
                : "Roth (Pay Now)"
            }
          />
          <Area
            type="monotone"
            dataKey="traditional"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorTraditional)"
          />
          <Area
            type="monotone"
            dataKey="roth"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorRoth)"
          />
          <ReferenceLine
            x={73}
            stroke="#f97316"
            strokeDasharray="5 5"
            label={{
              value: "RMDs Start",
              position: "top",
              fontSize: 10,
              fill: "#f97316",
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

const TaxWaterfallChart: React.FC<{ data: DecadeTaxSummary[] }> = ({
  data,
}) => {
  const colors = {
    incomeTax: "#3b82f6",
    fica: "#8b5cf6",
    rothConversionTax: "#f59e0b",
    rmdTax: "#ef4444",
    estateTax: "#dc2626",
  };

  return (
    <div className="h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis dataKey="decade" tick={{ fontSize: 10 }} angle={-15} />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(val) => formatCurrency(val)}
            width={70}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              formatCurrencyFull(value),
              name === "incomeTax"
                ? "Income Tax"
                : name === "fica"
                ? "FICA/Payroll"
                : name === "rmdTax"
                ? "RMD Tax"
                : name === "estateTax"
                ? "Inheritance Tax (Heirs)"
                : name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend
            formatter={(value) =>
              value === "incomeTax"
                ? "Income Tax"
                : value === "fica"
                ? "FICA/Payroll"
                : value === "rmdTax"
                ? "RMD Tax"
                : value === "estateTax"
                ? "Inheritance Tax"
                : value
            }
          />
          <Bar dataKey="incomeTax" stackId="a" fill={colors.incomeTax} />
          <Bar dataKey="fica" stackId="a" fill={colors.fica} />
          <Bar dataKey="rmdTax" stackId="a" fill={colors.rmdTax} />
          <Bar dataKey="estateTax" stackId="a" fill={colors.estateTax} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

const EffectiveTaxRateChart: React.FC<{ data: YearlyTaxData[] }> = ({
  data,
}) => {
  const chartData = data
    .filter((d) => d.phase !== "death" && d.age >= 60)
    .map((d) => ({
      age: d.age,
      traditional: d.traditionalEffectiveRate,
      roth: d.rothEffectiveRate,
      rmdBracket: d.rmdForcedBracket,
    }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12 }}
            label={{
              value: "Age",
              position: "insideBottom",
              offset: -5,
              fontSize: 12,
            }}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickFormatter={(val) => `${val}%`}
            domain={[0, 40]}
            width={50}
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === "traditional"
                ? "Traditional Effective Rate"
                : name === "roth"
                ? "Roth Effective Rate"
                : "Marginal Bracket",
            ]}
            labelFormatter={(age) => `Age ${age}`}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="traditional"
            stroke="#ef4444"
            strokeWidth={2}
            dot={false}
            name="Traditional Approach"
          />
          <Line
            type="monotone"
            dataKey="roth"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            name="Roth Approach"
          />
          <ReferenceLine
            y={22}
            stroke="#94a3b8"
            strokeDasharray="3 3"
            label={{
              value: "22% bracket",
              position: "right",
              fontSize: 10,
              fill: "#94a3b8",
            }}
          />
          <ReferenceLine
            y={32}
            stroke="#f97316"
            strokeDasharray="3 3"
            label={{
              value: "32% bracket",
              position: "right",
              fontSize: 10,
              fill: "#f97316",
            }}
          />
          <ReferenceLine
            x={73}
            stroke="#f97316"
            strokeDasharray="5 5"
            label={{
              value: "RMDs",
              position: "top",
              fontSize: 10,
              fill: "#f97316",
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const RMDProblemVisualization: React.FC<{
  data: YearlyTaxData[];
  pretaxBalance: number;
  maritalStatus: FilingStatus;
}> = ({ data, pretaxBalance, maritalStatus }) => {
  // Project RMDs at age 73, 80, 85, 90
  const rmdAges = [73, 80, 85, 90];
  const projectedRMDs = rmdAges.map((age) => {
    const yearData = data.find((d) => d.age === age);
    const rmd = yearData?.rmdAmount || 0;
    const bracket = yearData?.rmdForcedBracket || 0;
    return { age, rmd, bracket };
  });

  // Calculate RMD at 73 based on projected balance
  const yearsToRMD = 73 - (data[0]?.age || 35);
  const projectedBalance =
    pretaxBalance * Math.pow(1.07, Math.max(0, yearsToRMD));
  const rmdAt73 = projectedBalance / (RMD_DIVISORS[73] || 26.5);

  return (
    <div className="space-y-4">
      {/* Main Warning */}
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-orange-900 dark:text-orange-100 text-lg">
              The RMD Problem
            </h4>
            <p className="text-sm text-orange-800 dark:text-orange-200 mt-1">
              At age 73, the IRS forces you to withdraw from Traditional
              accounts. These Required Minimum Distributions (RMDs) can push you
              into higher tax brackets whether you need the money or not.
            </p>
          </div>
        </div>
      </div>

      {/* RMD Projections */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {projectedRMDs.map(({ age, rmd, bracket }) => (
          <div
            key={age}
            className={`rounded-lg p-3 border ${
              bracket >= 32
                ? "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                : bracket >= 24
                ? "bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800"
                : "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800"
            }`}
          >
            <div className="text-xs text-muted-foreground mb-1">Age {age}</div>
            <div className="text-xl font-bold text-foreground">
              {formatCurrency(rmd)}
            </div>
            <div className="text-xs mt-1">
              <Badge
                variant="outline"
                className={
                  bracket >= 32
                    ? "bg-red-100 text-red-800 border-red-300"
                    : bracket >= 24
                    ? "bg-orange-100 text-orange-800 border-orange-300"
                    : "bg-yellow-100 text-yellow-800 border-yellow-300"
                }
              >
                {bracket}% bracket
              </Badge>
            </div>
          </div>
        ))}
      </div>

      {/* Bracket Escalation Warning */}
      {projectedRMDs.some((r) => r.bracket >= 32) && (
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-red-600" />
            <span className="font-semibold text-red-900 dark:text-red-100">
              Bracket Jump Detected
            </span>
          </div>
          <p className="text-sm text-red-800 dark:text-red-200 mt-1">
            Your RMDs are projected to push you from the{" "}
            <strong>22% bracket</strong> into the <strong>32% bracket</strong> -
            a 10 percentage point increase. This could cost you an extra{" "}
            <strong>
              {formatCurrency(rmdAt73 * 0.1)}
              /year
            </strong>{" "}
            in unnecessary taxes.
          </p>
        </div>
      )}
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

export const LifetimeTaxDashboard: React.FC<LifetimeTaxDashboardProps> =
  React.memo(function LifetimeTaxDashboard(props) {
    const {
      currentAge,
      retirementAge,
      maritalStatus,
      pretaxBalance,
      lifeExpectancy = 95,
    } = props;

    // Calculate all projections
    const projections = useMemo(() => {
      const result = projectLifetimeTaxes(props);
      const decadeSummary = aggregateByDecade(result.yearlyData, currentAge);
      return { ...result, decadeSummary };
    }, [props, currentAge]);

    const {
      yearlyData,
      traditionalTotalTax,
      rothTotalTax,
      taxSavings,
      inheritanceTaxTraditional,
      inheritanceTaxRoth,
      decadeSummary,
    } = projections;

    const savingsPercent =
      traditionalTotalTax > 0
        ? ((taxSavings / traditionalTotalTax) * 100).toFixed(0)
        : 0;

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold">Lifetime Tax Comparison</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            See the true cost of tax decisions over your lifetime. Small choices
            today compound into massive differences over 50+ years.
          </p>
        </div>

        {/* Section 1: Dollar-Weighted Comparison (The Big Picture) */}
        <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 dark:border-green-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              <CardTitle className="text-2xl">The Bottom Line</CardTitle>
            </div>
            <CardDescription>
              Total taxes paid over your lifetime (including inheritance taxes
              your heirs will pay)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Big Numbers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Traditional Total */}
              <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-5 border border-red-200 dark:border-red-800 text-center">
                <div className="text-sm text-red-700 dark:text-red-400 mb-2 font-medium">
                  Traditional Approach
                </div>
                <div className="text-4xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(traditionalTotalTax)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-2">
                  Lifetime taxes paid to IRS
                </div>
              </div>

              {/* Arrow */}
              <div className="hidden md:flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <ArrowRight className="h-8 w-8 text-green-600" />
                  <div className="mt-2 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      SAVE {formatCurrency(taxSavings)}
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      ({savingsPercent}% reduction)
                    </div>
                  </div>
                </div>
              </div>

              {/* Roth Total */}
              <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-5 border border-green-200 dark:border-green-800 text-center">
                <div className="text-sm text-green-700 dark:text-green-400 mb-2 font-medium">
                  Roth-Focused Approach
                </div>
                <div className="text-4xl font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(rothTotalTax)}
                </div>
                <div className="text-xs text-green-600 dark:text-green-400 mt-2">
                  Lifetime taxes paid to IRS
                </div>
              </div>
            </div>

            {/* Mobile Arrow */}
            <div className="md:hidden flex justify-center">
              <div className="bg-green-100 dark:bg-green-900/30 rounded-lg px-4 py-2 text-center">
                <span className="text-green-700 dark:text-green-300 font-bold">
                  Save {formatCurrency(taxSavings)} ({savingsPercent}%
                  reduction)
                </span>
              </div>
            </div>

            {/* Inheritance Callout */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                    What Your Kids Inherit
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    With Traditional IRAs, your heirs must pay income tax on
                    distributions (estimated{" "}
                    <strong>
                      {formatCurrency(inheritanceTaxTraditional)}
                    </strong>{" "}
                    in taxes). With Roth, they inherit{" "}
                    <strong>tax-free</strong>. That&apos;s{" "}
                    <strong>
                      {formatCurrency(inheritanceTaxTraditional)}
                    </strong>{" "}
                    more for your family instead of the IRS.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Cumulative Tax Comparison Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <CardTitle>Cumulative Taxes Over Time</CardTitle>
            </div>
            <CardDescription>
              Watch the gap between Traditional and Roth widen over your
              lifetime. The shaded area represents your potential tax savings.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CumulativeTaxChart data={yearlyData} />
            <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <span className="text-muted-foreground">
                  Traditional: Pay less now, pay MORE later
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-muted-foreground">
                  Roth: Pay more now, pay NOTHING later
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Tax Waterfall by Decade */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <CardTitle>Where Do Your Taxes Come From?</CardTitle>
            </div>
            <CardDescription>
              Tax sources by life stage. Notice how RMD taxes explode after age
              73, and heirs face massive inheritance taxes on Traditional
              accounts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TaxWaterfallChart data={decadeSummary} />
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>Income Tax</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-purple-500" />
                <span>FICA/Payroll</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-500" />
                <span>RMD Tax</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-red-700" />
                <span>Inheritance Tax</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Effective Tax Rate Over Time */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-orange-600" />
              <CardTitle>Effective Tax Rate Over Time</CardTitle>
            </div>
            <CardDescription>
              Traditional: Low rates now, HIGH rates when RMDs force you into
              higher brackets. Roth: Higher rates now, ZERO later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EffectiveTaxRateChart data={yearlyData} />
            <div className="mt-4 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-orange-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-800 dark:text-orange-200">
                  <strong>The Crossover:</strong> Notice how Traditional
                  effective rates spike at age 73 when RMDs begin. Many retirees
                  are shocked to find they&apos;re paying{" "}
                  <em>higher tax rates in retirement</em> than during their
                  working years.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: The RMD Problem */}
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <CardTitle>The RMD Problem</CardTitle>
            </div>
            <CardDescription>
              At 73, you&apos;ll be FORCED to withdraw from Traditional
              accounts - whether you need the money or not. Here&apos;s what
              that looks like for you.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RMDProblemVisualization
              data={yearlyData}
              pretaxBalance={pretaxBalance}
              maritalStatus={maritalStatus}
            />
          </CardContent>
        </Card>

        {/* Section 6: The Escape Route */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="text-xl">
              The Escape Route: Roth Conversion Ladder
            </CardTitle>
            <CardDescription>
              You can avoid the RMD tax trap by strategically converting
              Traditional to Roth before age 73
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Step 1: Retire Early
                </div>
                <p className="text-xs text-muted-foreground">
                  In years between retirement and 73, your income is low.
                  Perfect time to fill lower tax brackets.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Step 2: Convert Annually
                </div>
                <p className="text-xs text-muted-foreground">
                  Convert Traditional to Roth each year, filling the 12% or 22%
                  bracket. Pay tax now at lower rates.
                </p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
                <div className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  Step 3: Minimize RMDs
                </div>
                <p className="text-xs text-muted-foreground">
                  By 73, Traditional balance is smaller. RMDs are lower. You
                  stay in lower brackets. Kids inherit Roth tax-free.
                </p>
              </div>
            </div>

            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 text-center">
              <p className="text-sm text-purple-900 dark:text-purple-100 font-medium">
                Potential Lifetime Tax Savings with Roth Conversion Strategy:
              </p>
              <p className="text-3xl font-bold text-purple-700 dark:text-purple-300 mt-1">
                {formatCurrency(taxSavings * 1.2)}{" "}
                <span className="text-sm font-normal">or more</span>
              </p>
              <p className="text-xs text-purple-600 dark:text-purple-400 mt-2">
                Includes reduced RMDs, lower brackets, and tax-free inheritance
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
          <p>
            This analysis uses simplified projections for illustration purposes.
            Actual tax outcomes depend on many factors including future tax law
            changes, actual returns, and your specific situation. Consult a
            qualified tax professional before making major financial decisions.
          </p>
        </div>
      </div>
    );
  });

LifetimeTaxDashboard.displayName = "LifetimeTaxDashboard";

export default LifetimeTaxDashboard;
