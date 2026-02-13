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
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Home,
  Wallet,
  PiggyBank,
  CreditCard,
  Target,
  Trophy,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Circle,
  Landmark,
  Building2,
  Car,
  Gem,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, fmtFull, fmtPercent } from "@/lib/utils";

// ==================== Types ====================

interface Asset {
  name: string;
  value: number;
  category: "retirement" | "real_estate" | "other";
  icon?: React.ReactNode;
}

interface Liability {
  name: string;
  balance: number;
  originalAmount?: number;
  interestRate?: number;
  monthlyPayment?: number;
}

interface NetWorthSnapshot {
  date: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
}

interface Milestone {
  amount: number;
  label: string;
  achieved: boolean;
  achievedDate?: string;
}

interface AgeGroupComparison {
  ageRange: string;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

interface NetWorthDashboardProps {
  assets: Asset[];
  liabilities: Liability[];
  history: NetWorthSnapshot[];
  currentAge: number;
  ageGroupData?: AgeGroupComparison;
  className?: string;
}

// ==================== Constants ====================

const CATEGORY_COLORS = {
  retirement: "hsl(142, 76%, 36%)",
  real_estate: "hsl(221, 83%, 53%)",
  other: "hsl(45, 93%, 47%)",
};

const CATEGORY_LABELS = {
  retirement: "Retirement Accounts",
  real_estate: "Real Estate",
  other: "Other Assets",
};

const CATEGORY_ICONS = {
  retirement: <PiggyBank className="w-4 h-4" />,
  real_estate: <Home className="w-4 h-4" />,
  other: <Wallet className="w-4 h-4" />,
};

const DEFAULT_MILESTONES: Milestone[] = [
  { amount: 10000, label: "$10K - Emergency Fund", achieved: false },
  { amount: 50000, label: "$50K - Starter Saver", achieved: false },
  { amount: 100000, label: "$100K - Six Figures Club", achieved: false },
  { amount: 250000, label: "$250K - Quarter Millionaire", achieved: false },
  { amount: 500000, label: "$500K - Half Million", achieved: false },
  { amount: 750000, label: "$750K - Three Quarters", achieved: false },
  { amount: 1000000, label: "$1M - Millionaire", achieved: false },
  { amount: 2000000, label: "$2M - Double Millionaire", achieved: false },
  { amount: 5000000, label: "$5M - High Net Worth", achieved: false },
  { amount: 10000000, label: "$10M - Eight Figures", achieved: false },
];

const DEFAULT_AGE_GROUP_DATA: Record<string, AgeGroupComparison> = {
  "20-24": { ageRange: "20-24", p25: 1000, p50: 10000, p75: 30000, p90: 75000 },
  "25-29": { ageRange: "25-29", p25: 5000, p50: 25000, p75: 75000, p90: 150000 },
  "30-34": { ageRange: "30-34", p25: 15000, p50: 50000, p75: 150000, p90: 300000 },
  "35-39": { ageRange: "35-39", p25: 30000, p50: 100000, p75: 300000, p90: 550000 },
  "40-44": { ageRange: "40-44", p25: 50000, p50: 175000, p75: 450000, p90: 850000 },
  "45-49": { ageRange: "45-49", p25: 75000, p50: 250000, p75: 650000, p90: 1200000 },
  "50-54": { ageRange: "50-54", p25: 100000, p50: 350000, p75: 900000, p90: 1700000 },
  "55-59": { ageRange: "55-59", p25: 125000, p50: 500000, p75: 1200000, p90: 2200000 },
  "60-64": { ageRange: "60-64", p25: 150000, p50: 600000, p75: 1500000, p90: 2800000 },
  "65-69": { ageRange: "65-69", p25: 175000, p50: 700000, p75: 1700000, p90: 3200000 },
  "70+": { ageRange: "70+", p25: 150000, p50: 650000, p75: 1600000, p90: 3000000 },
};

const chartConfig: ChartConfig = {
  netWorth: {
    label: "Net Worth",
    color: "hsl(142, 76%, 36%)",
  },
  totalAssets: {
    label: "Total Assets",
    color: "hsl(221, 83%, 53%)",
  },
  totalLiabilities: {
    label: "Total Liabilities",
    color: "hsl(0, 84%, 60%)",
  },
  retirement: {
    label: "Retirement",
    color: CATEGORY_COLORS.retirement,
  },
  real_estate: {
    label: "Real Estate",
    color: CATEGORY_COLORS.real_estate,
  },
  other: {
    label: "Other",
    color: CATEGORY_COLORS.other,
  },
};

// ==================== Helper Functions ====================

function getAgeGroup(age: number): string {
  if (age < 25) return "20-24";
  if (age < 30) return "25-29";
  if (age < 35) return "30-34";
  if (age < 40) return "35-39";
  if (age < 45) return "40-44";
  if (age < 50) return "45-49";
  if (age < 55) return "50-54";
  if (age < 60) return "55-59";
  if (age < 65) return "60-64";
  if (age < 70) return "65-69";
  return "70+";
}

function calculatePercentile(value: number, comparison: AgeGroupComparison): number {
  if (value <= comparison.p25) {
    return Math.round((value / comparison.p25) * 25);
  } else if (value <= comparison.p50) {
    return 25 + Math.round(((value - comparison.p25) / (comparison.p50 - comparison.p25)) * 25);
  } else if (value <= comparison.p75) {
    return 50 + Math.round(((value - comparison.p50) / (comparison.p75 - comparison.p50)) * 25);
  } else if (value <= comparison.p90) {
    return 75 + Math.round(((value - comparison.p75) / (comparison.p90 - comparison.p75)) * 15);
  } else {
    return Math.min(99, 90 + Math.round(((value - comparison.p90) / comparison.p90) * 9));
  }
}

function getPercentileLabel(percentile: number): string {
  if (percentile >= 90) return "Exceptional";
  if (percentile >= 75) return "Above Average";
  if (percentile >= 50) return "Average";
  if (percentile >= 25) return "Below Average";
  return "Building";
}

function getPercentileColor(percentile: number): string {
  if (percentile >= 90) return "text-green-500";
  if (percentile >= 75) return "text-emerald-500";
  if (percentile >= 50) return "text-yellow-500";
  if (percentile >= 25) return "text-orange-500";
  return "text-red-500";
}

// ==================== Sub-Components ====================

interface StatCardProps {
  title: string;
  value: string;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  className,
}) => {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
            {change !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                {trend === "up" && (
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                )}
                {trend === "down" && (
                  <ArrowDownRight className="w-4 h-4 text-red-500" />
                )}
                <span
                  className={cn(
                    "font-medium",
                    trend === "up" && "text-green-500",
                    trend === "down" && "text-red-500",
                    trend === "neutral" && "text-muted-foreground"
                  )}
                >
                  {change >= 0 ? "+" : ""}
                  {fmtFull(change)}
                </span>
                {changeLabel && (
                  <span className="text-muted-foreground">{changeLabel}</span>
                )}
              </div>
            )}
          </div>
          <div className="p-2 sm:p-3 rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AssetCategoryCardProps {
  category: "retirement" | "real_estate" | "other";
  assets: Asset[];
  totalNetWorth: number;
}

const AssetCategoryCard: React.FC<AssetCategoryCardProps> = ({
  category,
  assets,
  totalNetWorth,
}) => {
  const categoryTotal = assets.reduce((sum, a) => sum + a.value, 0);
  const percentage = totalNetWorth > 0 ? (categoryTotal / totalNetWorth) * 100 : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${CATEGORY_COLORS[category]}20` }}
            >
              <span style={{ color: CATEGORY_COLORS[category] }}>
                {CATEGORY_ICONS[category]}
              </span>
            </div>
            <CardTitle className="text-base sm:text-lg">
              {CATEGORY_LABELS[category]}
            </CardTitle>
          </div>
          <Badge variant="secondary" className="font-mono">
            {percentage.toFixed(1)}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-2xl font-bold">{fmt(categoryTotal)}</div>
        <Progress
          value={percentage}
          className="h-2"
          style={
            {
              "--progress-background": CATEGORY_COLORS[category],
            } as React.CSSProperties
          }
        />
        <div className="space-y-2">
          {assets.map((asset, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm"
            >
              <div className="flex items-center gap-2">
                {asset.icon || <Circle className="w-3 h-3" />}
                <span className="text-muted-foreground">{asset.name}</span>
              </div>
              <span className="font-mono">{fmt(asset.value)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface LiabilityCardProps {
  liabilities: Liability[];
}

const LiabilityCard: React.FC<LiabilityCardProps> = ({ liabilities }) => {
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-red-500/10">
              <CreditCard className="w-4 h-4 text-red-500" />
            </div>
            <CardTitle className="text-base sm:text-lg">Liabilities</CardTitle>
          </div>
          <Badge variant="destructive" className="font-mono">
            {fmt(totalLiabilities)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {liabilities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No liabilities - Debt free!
          </p>
        ) : (
          liabilities.map((liability, index) => {
            const payoffProgress = liability.originalAmount
              ? ((liability.originalAmount - liability.balance) /
                  liability.originalAmount) *
                100
              : 0;

            return (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{liability.name}</span>
                    {liability.interestRate && (
                      <Badge variant="outline" className="text-xs">
                        {liability.interestRate}% APR
                      </Badge>
                    )}
                  </div>
                  <span className="font-mono text-red-500">
                    -{fmt(liability.balance)}
                  </span>
                </div>
                {liability.originalAmount && (
                  <div className="space-y-1">
                    <Progress value={payoffProgress} className="h-1.5" />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>
                        {fmt(liability.originalAmount - liability.balance)} paid
                      </span>
                      <span>{payoffProgress.toFixed(0)}% complete</span>
                    </div>
                  </div>
                )}
                {liability.monthlyPayment && (
                  <p className="text-xs text-muted-foreground">
                    Monthly payment: {fmt(liability.monthlyPayment)}
                  </p>
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
};

interface MilestoneTrackerProps {
  netWorth: number;
  milestones?: Milestone[];
}

const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  netWorth,
  milestones = DEFAULT_MILESTONES,
}) => {
  const updatedMilestones = milestones.map((m) => ({
    ...m,
    achieved: netWorth >= m.amount,
  }));

  const achievedCount = updatedMilestones.filter((m) => m.achieved).length;
  const nextMilestone = updatedMilestones.find((m) => !m.achieved);
  const progressToNext = nextMilestone
    ? (netWorth / nextMilestone.amount) * 100
    : 100;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              Wealth Milestones
            </CardTitle>
          </div>
          <Badge variant="secondary">
            {achievedCount}/{milestones.length}
          </Badge>
        </div>
        <CardDescription>
          Track your journey to financial independence
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {nextMilestone && (
          <div className="p-4 rounded-lg bg-muted/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Next Milestone</span>
              <Badge variant="outline">{nextMilestone.label}</Badge>
            </div>
            <Progress value={Math.min(progressToNext, 100)} className="h-3" />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{fmt(netWorth)}</span>
              <span>{fmt(nextMilestone.amount - netWorth)} to go</span>
            </div>
          </div>
        )}

        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {updatedMilestones.map((milestone, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-3 p-2 rounded-lg transition-colors",
                milestone.achieved
                  ? "bg-green-500/10"
                  : "bg-muted/30 opacity-60"
              )}
            >
              {milestone.achieved ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              )}
              <span
                className={cn(
                  "text-sm",
                  milestone.achieved && "font-medium"
                )}
              >
                {milestone.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

interface AgeComparisonCardProps {
  netWorth: number;
  currentAge: number;
  ageGroupData?: AgeGroupComparison;
}

const AgeComparisonCard: React.FC<AgeComparisonCardProps> = ({
  netWorth,
  currentAge,
  ageGroupData,
}) => {
  const ageGroup = getAgeGroup(currentAge);
  const comparison = ageGroupData || DEFAULT_AGE_GROUP_DATA[ageGroup];
  const percentile = calculatePercentile(netWorth, comparison);
  const percentileLabel = getPercentileLabel(percentile);
  const percentileColor = getPercentileColor(percentile);

  const comparisonData = [
    { label: "25th", value: comparison.p25, yours: netWorth >= comparison.p25 },
    { label: "50th (Median)", value: comparison.p50, yours: netWorth >= comparison.p50 },
    { label: "75th", value: comparison.p75, yours: netWorth >= comparison.p75 },
    { label: "90th", value: comparison.p90, yours: netWorth >= comparison.p90 },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <Users className="w-4 h-4 text-purple-500" />
            </div>
            <CardTitle className="text-base sm:text-lg">
              Age Group Comparison
            </CardTitle>
          </div>
          <Badge variant="outline">{ageGroup}</Badge>
        </div>
        <CardDescription>
          How your net worth compares to others in your age group
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl font-bold">
            {percentile}
            <span className="text-2xl text-muted-foreground">th</span>
          </div>
          <Badge className={cn("text-lg px-4 py-1", percentileColor)}>
            {percentileLabel}
          </Badge>
          <p className="text-sm text-muted-foreground">
            You're ahead of {percentile}% of your peers
          </p>
        </div>

        <div className="space-y-3">
          {comparisonData.map((item, index) => (
            <div key={index} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-mono">{fmt(item.value)}</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn(
                    "absolute h-full rounded-full transition-all",
                    item.yours ? "bg-green-500" : "bg-muted-foreground/30"
                  )}
                  style={{
                    width: `${Math.min((item.value / comparison.p90) * 100, 100)}%`,
                  }}
                />
                {netWorth > 0 && (
                  <div
                    className="absolute top-0 w-1 h-full bg-primary"
                    style={{
                      left: `${Math.min((netWorth / comparison.p90) * 100, 100)}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-muted/50 text-center">
          <p className="text-sm">
            {netWorth >= comparison.p50 ? (
              <span className="text-green-600 dark:text-green-400">
                You're {fmt(netWorth - comparison.p50)} above the median for your age
              </span>
            ) : (
              <span className="text-amber-600 dark:text-amber-400">
                {fmt(comparison.p50 - netWorth)} more to reach the median
              </span>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface AllocationChartProps {
  assets: Asset[];
}

const AllocationChart: React.FC<AllocationChartProps> = ({ assets }) => {
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {
      retirement: 0,
      real_estate: 0,
      other: 0,
    };

    assets.forEach((asset) => {
      totals[asset.category] += asset.value;
    });

    return Object.entries(totals)
      .filter(([, value]) => value > 0)
      .map(([category, value]) => ({
        name: CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS],
        value,
        color: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
      }));
  }, [assets]);

  const total = categoryTotals.reduce((sum, c) => sum + c.value, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <Target className="w-4 h-4 text-blue-500" />
          </div>
          <CardTitle className="text-base sm:text-lg">
            Asset Allocation
          </CardTitle>
        </div>
        <CardDescription>Distribution of your assets by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-full md:w-1/2 h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryTotals}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {categoryTotals.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-full md:w-1/2 space-y-3">
            {categoryTotals.map((category, index) => (
              <div key={index} className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </div>
                  <span className="font-mono text-sm">
                    {((category.value / total) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fmt(category.value)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// ==================== Main Component ====================

export const NetWorthDashboard: React.FC<NetWorthDashboardProps> = ({
  assets,
  liabilities,
  history,
  currentAge,
  ageGroupData,
  className,
}) => {
  // Calculate totals
  const totalAssets = useMemo(
    () => assets.reduce((sum, a) => sum + a.value, 0),
    [assets]
  );

  const totalLiabilities = useMemo(
    () => liabilities.reduce((sum, l) => sum + l.balance, 0),
    [liabilities]
  );

  const netWorth = totalAssets - totalLiabilities;

  // Calculate monthly change
  const monthlyChange = useMemo(() => {
    if (history.length < 2) return { amount: 0, percentage: 0 };
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const amount = current.netWorth - previous.netWorth;
    const percentage =
      previous.netWorth !== 0
        ? ((current.netWorth - previous.netWorth) / Math.abs(previous.netWorth)) * 100
        : 0;
    return { amount, percentage };
  }, [history]);

  // Group assets by category
  const assetsByCategory = useMemo(() => {
    const grouped: Record<string, Asset[]> = {
      retirement: [],
      real_estate: [],
      other: [],
    };
    assets.forEach((asset) => {
      grouped[asset.category].push(asset);
    });
    return grouped;
  }, [assets]);

  // Format history data for chart
  const chartData = useMemo(() => {
    return history.map((snapshot) => ({
      date: snapshot.date,
      netWorth: snapshot.netWorth,
      totalAssets: snapshot.totalAssets,
      totalLiabilities: snapshot.totalLiabilities,
    }));
  }, [history]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Net Worth"
          value={fmt(netWorth)}
          change={monthlyChange.amount}
          changeLabel="this month"
          icon={<Landmark className="w-5 h-5" />}
          trend={monthlyChange.amount >= 0 ? "up" : "down"}
        />
        <StatCard
          title="Total Assets"
          value={fmt(totalAssets)}
          icon={<Wallet className="w-5 h-5" />}
          trend="neutral"
        />
        <StatCard
          title="Total Liabilities"
          value={fmt(totalLiabilities)}
          icon={<CreditCard className="w-5 h-5" />}
          trend="neutral"
        />
        <StatCard
          title="Monthly Change"
          value={`${monthlyChange.percentage >= 0 ? "+" : ""}${monthlyChange.percentage.toFixed(1)}%`}
          change={monthlyChange.amount}
          icon={
            monthlyChange.amount >= 0 ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )
          }
          trend={monthlyChange.amount >= 0 ? "up" : "down"}
        />
      </div>

      {/* Net Worth Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Trend</CardTitle>
          <CardDescription>
            Track your wealth growth over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => fmt(value)}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value) =>
                      typeof value === "number" ? fmtFull(value) : value
                    }
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="netWorth"
                stroke="hsl(142, 76%, 36%)"
                strokeWidth={2}
                fill="url(#netWorthGradient)"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Asset Categories & Liabilities */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        {Object.entries(assetsByCategory).map(([category, categoryAssets]) =>
          categoryAssets.length > 0 ? (
            <AssetCategoryCard
              key={category}
              category={category as "retirement" | "real_estate" | "other"}
              assets={categoryAssets}
              totalNetWorth={totalAssets}
            />
          ) : null
        )}
        <LiabilityCard liabilities={liabilities} />
      </div>

      {/* Bottom Section: Milestones, Age Comparison, Allocation */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
        <MilestoneTracker netWorth={netWorth} />
        <AgeComparisonCard
          netWorth={netWorth}
          currentAge={currentAge}
          ageGroupData={ageGroupData}
        />
        <AllocationChart assets={assets} />
      </div>
    </div>
  );
};

// ==================== Demo/Example Data Export ====================

export const DEMO_ASSETS: Asset[] = [
  { name: "401(k)", value: 185000, category: "retirement", icon: <Building2 className="w-3 h-3" /> },
  { name: "Roth IRA", value: 45000, category: "retirement", icon: <PiggyBank className="w-3 h-3" /> },
  { name: "Traditional IRA", value: 32000, category: "retirement", icon: <Landmark className="w-3 h-3" /> },
  { name: "Primary Residence", value: 425000, category: "real_estate", icon: <Home className="w-3 h-3" /> },
  { name: "Rental Property", value: 280000, category: "real_estate", icon: <Building2 className="w-3 h-3" /> },
  { name: "Brokerage Account", value: 78000, category: "other", icon: <Wallet className="w-3 h-3" /> },
  { name: "Emergency Fund", value: 25000, category: "other", icon: <PiggyBank className="w-3 h-3" /> },
  { name: "Vehicles", value: 35000, category: "other", icon: <Car className="w-3 h-3" /> },
  { name: "Collectibles", value: 12000, category: "other", icon: <Gem className="w-3 h-3" /> },
];

export const DEMO_LIABILITIES: Liability[] = [
  {
    name: "Mortgage (Primary)",
    balance: 285000,
    originalAmount: 380000,
    interestRate: 3.25,
    monthlyPayment: 1650,
  },
  {
    name: "Mortgage (Rental)",
    balance: 195000,
    originalAmount: 224000,
    interestRate: 4.5,
    monthlyPayment: 1135,
  },
  {
    name: "Auto Loan",
    balance: 12500,
    originalAmount: 28000,
    interestRate: 5.9,
    monthlyPayment: 485,
  },
];

export const DEMO_HISTORY: NetWorthSnapshot[] = [
  { date: "Jan 2025", totalAssets: 950000, totalLiabilities: 520000, netWorth: 430000 },
  { date: "Feb 2025", totalAssets: 975000, totalLiabilities: 515000, netWorth: 460000 },
  { date: "Mar 2025", totalAssets: 990000, totalLiabilities: 510000, netWorth: 480000 },
  { date: "Apr 2025", totalAssets: 1010000, totalLiabilities: 505000, netWorth: 505000 },
  { date: "May 2025", totalAssets: 1025000, totalLiabilities: 500000, netWorth: 525000 },
  { date: "Jun 2025", totalAssets: 1050000, totalLiabilities: 495000, netWorth: 555000 },
  { date: "Jul 2025", totalAssets: 1080000, totalLiabilities: 492500, netWorth: 587500 },
  { date: "Aug 2025", totalAssets: 1100000, totalLiabilities: 490000, netWorth: 610000 },
  { date: "Sep 2025", totalAssets: 1090000, totalLiabilities: 487500, netWorth: 602500 },
  { date: "Oct 2025", totalAssets: 1110000, totalLiabilities: 495000, netWorth: 615000 },
  { date: "Nov 2025", totalAssets: 1115000, totalLiabilities: 492500, netWorth: 622500 },
  { date: "Dec 2025", totalAssets: 1117000, totalLiabilities: 492500, netWorth: 624500 },
];

export default NetWorthDashboard;
