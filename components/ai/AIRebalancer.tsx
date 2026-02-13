"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  ReferenceLine,
  Legend,
  ComposedChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Info,
  RefreshCw,
  Clock,
  Zap,
  Shield,
  DollarSign,
  PieChart,
  ArrowRight,
  Sparkles,
  Calendar,
  Building2,
  Wallet,
  ArrowUpDown,
  Calculator,
  BarChart3,
  History,
  Lightbulb,
  Scale,
  AlertCircle,
  ChevronRight,
  Bot,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, fmtPercent, fmtPctRaw } from "@/lib/utils";

// ==================== Types ====================

interface AssetAllocation {
  stocks: number;
  bonds: number;
  cash: number;
  other?: number;
}

interface AccountHolding {
  id: string;
  name: string;
  accountType: "401k" | "ira" | "roth" | "taxable" | "hsa";
  balance: number;
  allocation: AssetAllocation;
  taxEfficiency: "high" | "medium" | "low";
  rebalancingCost: "none" | "low" | "high"; // tax cost
}

interface RebalancingTrade {
  accountId: string;
  accountName: string;
  accountType: AccountHolding["accountType"];
  assetClass: keyof AssetAllocation;
  action: "buy" | "sell";
  amount: number;
  taxImpact: number;
  reason: string;
}

interface DriftDataPoint {
  date: string;
  actualStocks: number;
  targetStocks: number;
  drift: number;
}

interface HistoricalRebalanceEvent {
  date: string;
  beforeAllocation: AssetAllocation;
  afterAllocation: AssetAllocation;
  trades: { asset: string; amount: number }[];
  method: "calendar" | "threshold" | "opportunistic";
  taxCost: number;
  gainsSinceRebalance: number;
}

interface AIRebalancerProps {
  accounts?: AccountHolding[];
  targetAllocation?: AssetAllocation;
  currentAge?: number;
  retirementAge?: number;
  riskTolerance?: "conservative" | "moderate" | "aggressive";
  onRebalance?: (trades: RebalancingTrade[]) => void;
}

// ==================== Constants ====================

const DEFAULT_ACCOUNTS: AccountHolding[] = [
  {
    id: "1",
    name: "401(k) - Employer",
    accountType: "401k",
    balance: 450000,
    allocation: { stocks: 75, bonds: 20, cash: 5 },
    taxEfficiency: "high",
    rebalancingCost: "none",
  },
  {
    id: "2",
    name: "Traditional IRA",
    accountType: "ira",
    balance: 125000,
    allocation: { stocks: 80, bonds: 15, cash: 5 },
    taxEfficiency: "high",
    rebalancingCost: "none",
  },
  {
    id: "3",
    name: "Roth IRA",
    accountType: "roth",
    balance: 85000,
    allocation: { stocks: 90, bonds: 8, cash: 2 },
    taxEfficiency: "high",
    rebalancingCost: "none",
  },
  {
    id: "4",
    name: "Taxable Brokerage",
    accountType: "taxable",
    balance: 180000,
    allocation: { stocks: 65, bonds: 30, cash: 5 },
    taxEfficiency: "low",
    rebalancingCost: "high",
  },
  {
    id: "5",
    name: "HSA",
    accountType: "hsa",
    balance: 35000,
    allocation: { stocks: 100, bonds: 0, cash: 0 },
    taxEfficiency: "high",
    rebalancingCost: "none",
  },
];

const ACCOUNT_TYPE_LABELS: Record<AccountHolding["accountType"], string> = {
  "401k": "401(k)",
  ira: "Traditional IRA",
  roth: "Roth IRA",
  taxable: "Taxable",
  hsa: "HSA",
};

const ACCOUNT_TYPE_COLORS: Record<AccountHolding["accountType"], string> = {
  "401k": "#3B82F6",
  ira: "#8B5CF6",
  roth: "#10B981",
  taxable: "#F59E0B",
  hsa: "#EC4899",
};

const ASSET_COLORS = {
  stocks: "#3B82F6",
  bonds: "#10B981",
  cash: "#F59E0B",
  other: "#8B5CF6",
};

// ==================== Utility Functions ====================

function calculateCurrentAllocation(accounts: AccountHolding[]): AssetAllocation {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  if (totalBalance === 0) return { stocks: 0, bonds: 0, cash: 0 };

  const weighted = accounts.reduce(
    (acc, account) => {
      const weight = account.balance / totalBalance;
      return {
        stocks: acc.stocks + account.allocation.stocks * weight,
        bonds: acc.bonds + account.allocation.bonds * weight,
        cash: acc.cash + account.allocation.cash * weight,
      };
    },
    { stocks: 0, bonds: 0, cash: 0 }
  );

  return {
    stocks: Math.round(weighted.stocks * 10) / 10,
    bonds: Math.round(weighted.bonds * 10) / 10,
    cash: Math.round(weighted.cash * 10) / 10,
  };
}

function calculateTargetAllocation(
  age: number,
  riskTolerance: "conservative" | "moderate" | "aggressive"
): AssetAllocation {
  // Base stock allocation using age-based rule with risk tolerance adjustment
  const riskModifier = { conservative: -10, moderate: 0, aggressive: 10 };
  let stockPct = Math.max(20, Math.min(95, 110 - age + riskModifier[riskTolerance]));

  // Ensure minimum bond allocation for diversification
  const bondPct = Math.max(5, 100 - stockPct - 5);
  const cashPct = 100 - stockPct - bondPct;

  return {
    stocks: stockPct,
    bonds: bondPct,
    cash: Math.max(0, cashPct),
  };
}

function calculateDrift(current: AssetAllocation, target: AssetAllocation): number {
  const stocksDrift = Math.abs(current.stocks - target.stocks);
  const bondsDrift = Math.abs(current.bonds - target.bonds);
  const cashDrift = Math.abs(current.cash - target.cash);
  return Math.max(stocksDrift, bondsDrift, cashDrift);
}

function generateDriftHistory(
  current: AssetAllocation,
  target: AssetAllocation
): DriftDataPoint[] {
  const history: DriftDataPoint[] = [];
  const now = new Date();

  for (let i = 11; i >= 0; i--) {
    const date = new Date(now);
    date.setMonth(date.getMonth() - i);

    // Simulate historical drift with some variation
    const variance = (Math.sin(i * 0.5) * 3) + (Math.random() - 0.5) * 2;
    const historicalStocks = target.stocks + variance + (i === 0 ? current.stocks - target.stocks : 0);

    history.push({
      date: date.toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
      actualStocks: Math.round(historicalStocks * 10) / 10,
      targetStocks: target.stocks,
      drift: Math.round(Math.abs(historicalStocks - target.stocks) * 10) / 10,
    });
  }

  return history;
}

function generateHistoricalRebalances(): HistoricalRebalanceEvent[] {
  const events: HistoricalRebalanceEvent[] = [
    {
      date: "2024-01-15",
      beforeAllocation: { stocks: 78, bonds: 17, cash: 5 },
      afterAllocation: { stocks: 70, bonds: 25, cash: 5 },
      trades: [
        { asset: "Stocks", amount: -52000 },
        { asset: "Bonds", amount: 52000 },
      ],
      method: "threshold",
      taxCost: 0,
      gainsSinceRebalance: 8.2,
    },
    {
      date: "2023-06-01",
      beforeAllocation: { stocks: 65, bonds: 30, cash: 5 },
      afterAllocation: { stocks: 72, bonds: 23, cash: 5 },
      trades: [
        { asset: "Stocks", amount: 35000 },
        { asset: "Bonds", amount: -35000 },
      ],
      method: "calendar",
      taxCost: 1250,
      gainsSinceRebalance: 15.4,
    },
    {
      date: "2022-12-15",
      beforeAllocation: { stocks: 58, bonds: 35, cash: 7 },
      afterAllocation: { stocks: 70, bonds: 25, cash: 5 },
      trades: [
        { asset: "Stocks", amount: 68000 },
        { asset: "Bonds", amount: -56000 },
        { asset: "Cash", amount: -12000 },
      ],
      method: "opportunistic",
      taxCost: 0,
      gainsSinceRebalance: 22.1,
    },
  ];

  return events;
}

function generateRebalancingTrades(
  accounts: AccountHolding[],
  current: AssetAllocation,
  target: AssetAllocation
): RebalancingTrade[] {
  const trades: RebalancingTrade[] = [];
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // Calculate total needed changes
  const stocksChange = ((target.stocks - current.stocks) / 100) * totalBalance;
  const bondsChange = ((target.bonds - current.bonds) / 100) * totalBalance;

  // Prioritize tax-advantaged accounts for rebalancing
  const sortedAccounts = [...accounts].sort((a, b) => {
    const costOrder = { none: 0, low: 1, high: 2 };
    return costOrder[a.rebalancingCost] - costOrder[b.rebalancingCost];
  });

  let remainingStocksChange = stocksChange;
  let remainingBondsChange = bondsChange;

  for (const account of sortedAccounts) {
    if (Math.abs(remainingStocksChange) < 100 && Math.abs(remainingBondsChange) < 100) break;

    const accountCapacity = account.balance * 0.3; // Max 30% change per account

    if (remainingStocksChange !== 0) {
      const tradeAmount = Math.min(
        Math.abs(remainingStocksChange),
        accountCapacity
      );

      if (tradeAmount >= 100) {
        const isBuying = remainingStocksChange > 0;
        trades.push({
          accountId: account.id,
          accountName: account.name,
          accountType: account.accountType,
          assetClass: "stocks",
          action: isBuying ? "buy" : "sell",
          amount: tradeAmount,
          taxImpact: account.rebalancingCost === "high" ? tradeAmount * 0.15 * 0.2 : 0,
          reason: isBuying
            ? `Increase stock allocation to meet ${target.stocks}% target`
            : `Reduce stock allocation from ${current.stocks.toFixed(1)}% to ${target.stocks}%`,
        });

        remainingStocksChange -= isBuying ? tradeAmount : -tradeAmount;
      }
    }

    if (remainingBondsChange !== 0) {
      const tradeAmount = Math.min(
        Math.abs(remainingBondsChange),
        accountCapacity
      );

      if (tradeAmount >= 100) {
        const isBuying = remainingBondsChange > 0;
        trades.push({
          accountId: account.id,
          accountName: account.name,
          accountType: account.accountType,
          assetClass: "bonds",
          action: isBuying ? "buy" : "sell",
          amount: tradeAmount,
          taxImpact: 0,
          reason: isBuying
            ? `Increase bond allocation for stability`
            : `Reduce bond allocation to fund stock purchases`,
        });

        remainingBondsChange -= isBuying ? tradeAmount : -tradeAmount;
      }
    }
  }

  return trades;
}

// ==================== Sub-components ====================

interface AllocationComparisonProps {
  current: AssetAllocation;
  target: AssetAllocation;
}

function AllocationComparison({ current, target }: AllocationComparisonProps) {
  const data = [
    {
      asset: "Stocks",
      current: current.stocks,
      target: target.stocks,
      diff: current.stocks - target.stocks,
    },
    {
      asset: "Bonds",
      current: current.bonds,
      target: target.bonds,
      diff: current.bonds - target.bonds,
    },
    {
      asset: "Cash",
      current: current.cash,
      target: target.cash,
      diff: current.cash - target.cash,
    },
  ];

  const chartConfig: ChartConfig = {
    current: { label: "Current", color: "#3B82F6" },
    target: { label: "Target", color: "#10B981" },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {data.map((item) => (
          <div
            key={item.asset}
            className={cn(
              "p-4 rounded-lg border",
              Math.abs(item.diff) > 5 && "border-amber-500/50 bg-amber-500/5"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">
                {item.asset}
              </span>
              {Math.abs(item.diff) > 5 && (
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              )}
            </div>
            <div className="flex items-end gap-2">
              <span className="text-2xl font-bold">{item.current.toFixed(1)}%</span>
              <span
                className={cn(
                  "text-sm mb-0.5",
                  item.diff > 0 ? "text-blue-500" : item.diff < 0 ? "text-amber-500" : "text-green-500"
                )}
              >
                {item.diff > 0 ? "+" : ""}
                {item.diff.toFixed(1)}%
              </span>
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Target: {item.target}%
              </div>
            </div>
          </div>
        ))}
      </div>

      <ChartContainer config={chartConfig} className="h-[200px]">
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
          <YAxis type="category" dataKey="asset" width={60} />
          <ChartTooltip
            content={<ChartTooltipContent formatter={(value) => `${value}%`} />}
          />
          <Bar dataKey="current" name="Current" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={16} />
          <Bar dataKey="target" name="Target" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
        </BarChart>
      </ChartContainer>
    </div>
  );
}

interface DriftVisualizationProps {
  driftHistory: DriftDataPoint[];
  threshold: number;
}

function DriftVisualization({ driftHistory, threshold }: DriftVisualizationProps) {
  const chartConfig: ChartConfig = {
    actualStocks: { label: "Actual Stocks %", color: "#3B82F6" },
    targetStocks: { label: "Target", color: "#10B981" },
    drift: { label: "Drift", color: "#F59E0B" },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          12-month allocation drift from target
        </div>
        <Badge variant="outline" className="text-amber-600 border-amber-600">
          Threshold: {threshold}%
        </Badge>
      </div>

      <ChartContainer config={chartConfig} className="h-[250px]">
        <ComposedChart data={driftHistory}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} />
          <YAxis
            yAxisId="left"
            domain={[50, 90]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 15]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 12 }}
          />
          <ChartTooltip
            content={<ChartTooltipContent />}
          />
          <Legend />
          <ReferenceLine
            yAxisId="right"
            y={threshold}
            stroke="#EF4444"
            strokeDasharray="5 5"
            label={{ value: "Rebalance Trigger", position: "right", fill: "#EF4444", fontSize: 10 }}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="actualStocks"
            name="Actual Stocks %"
            stroke="#3B82F6"
            fill="#3B82F6"
            fillOpacity={0.2}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="targetStocks"
            name="Target"
            stroke="#10B981"
            strokeDasharray="5 5"
            strokeWidth={2}
            dot={false}
          />
          <Bar
            yAxisId="right"
            dataKey="drift"
            name="Drift"
            fill="#F59E0B"
            fillOpacity={0.6}
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </ComposedChart>
      </ChartContainer>
    </div>
  );
}

interface AccountRebalancingAdviceProps {
  accounts: AccountHolding[];
  trades: RebalancingTrade[];
}

function AccountRebalancingAdvice({ accounts, trades }: AccountRebalancingAdviceProps) {
  const tradesByAccount = trades.reduce((acc, trade) => {
    if (!acc[trade.accountId]) {
      acc[trade.accountId] = [];
    }
    acc[trade.accountId].push(trade);
    return acc;
  }, {} as Record<string, RebalancingTrade[]>);

  const accountsWithAdvice = accounts.map((account) => ({
    ...account,
    trades: tradesByAccount[account.id] || [],
    shouldRebalance: (tradesByAccount[account.id] || []).length > 0,
  }));

  return (
    <div className="space-y-4">
      {accountsWithAdvice.map((account) => (
        <div
          key={account.id}
          className={cn(
            "p-4 rounded-lg border transition-all",
            account.shouldRebalance
              ? "border-blue-500/50 bg-blue-500/5"
              : "border-muted"
          )}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: ACCOUNT_TYPE_COLORS[account.accountType] }}
              />
              <div>
                <div className="font-medium">{account.name}</div>
                <div className="text-sm text-muted-foreground">
                  {fmt(account.balance)} | {ACCOUNT_TYPE_LABELS[account.accountType]}
                </div>
              </div>
            </div>
            <Badge
              variant={account.rebalancingCost === "none" ? "default" : "outline"}
              className={cn(
                account.rebalancingCost === "none" && "bg-green-600",
                account.rebalancingCost === "high" && "border-red-500 text-red-500"
              )}
            >
              {account.rebalancingCost === "none"
                ? "Tax-Free Rebalancing"
                : account.rebalancingCost === "low"
                ? "Low Tax Cost"
                : "High Tax Cost"}
            </Badge>
          </div>

          {account.shouldRebalance ? (
            <div className="space-y-2">
              <div className="text-sm font-medium text-blue-600 flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                Recommended Actions:
              </div>
              {account.trades.map((trade, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm bg-muted/50 p-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    {trade.action === "buy" ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                    <span className="capitalize">{trade.action}</span>
                    <span className="capitalize font-medium">{trade.assetClass}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{fmt(trade.amount)}</div>
                    {trade.taxImpact > 0 && (
                      <div className="text-xs text-amber-600">
                        Est. tax: {fmt(trade.taxImpact)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-green-500" />
              No rebalancing needed in this account
            </div>
          )}
        </div>
      ))}

      <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
        <div className="flex items-start gap-3">
          <Lightbulb className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium mb-1">Tax-Efficient Strategy</div>
            <p className="text-muted-foreground">
              Rebalance in tax-advantaged accounts (401k, IRA, Roth) first to avoid
              capital gains taxes. Only rebalance in taxable accounts when necessary
              or when you have losses to offset gains.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RebalanceRecommendationProps {
  shouldRebalance: boolean;
  drift: number;
  threshold: number;
  totalTaxCost: number;
  lastRebalanceDate?: string;
}

function RebalanceRecommendation({
  shouldRebalance,
  drift,
  threshold,
  totalTaxCost,
  lastRebalanceDate,
}: RebalanceRecommendationProps) {
  const daysSinceRebalance = lastRebalanceDate
    ? Math.floor(
        (new Date().getTime() - new Date(lastRebalanceDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  const urgency = drift > threshold * 1.5 ? "high" : drift > threshold ? "medium" : "low";

  return (
    <div
      className={cn(
        "p-6 rounded-xl border-2 transition-all",
        shouldRebalance
          ? urgency === "high"
            ? "border-red-500 bg-red-500/5"
            : "border-amber-500 bg-amber-500/5"
          : "border-green-500 bg-green-500/5"
      )}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {shouldRebalance ? (
            urgency === "high" ? (
              <AlertCircle className="h-8 w-8 text-red-500" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-amber-500" />
            )
          ) : (
            <CheckCircle className="h-8 w-8 text-green-500" />
          )}
          <div>
            <h3 className="text-xl font-bold">
              {shouldRebalance ? "Rebalance Recommended" : "Stay the Course"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {shouldRebalance
                ? `Portfolio drift of ${drift.toFixed(1)}% exceeds ${threshold}% threshold`
                : `Portfolio drift of ${drift.toFixed(1)}% is within acceptable range`}
            </p>
          </div>
        </div>
        <Button
          size="lg"
          variant={shouldRebalance ? "default" : "outline"}
          className={cn(
            shouldRebalance && "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          )}
        >
          {shouldRebalance ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Rebalance Now
            </>
          ) : (
            <>
              <Clock className="h-4 w-4 mr-2" />
              Wait
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Current Drift</div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              drift > threshold ? "text-amber-500" : "text-green-500"
            )}>
              {drift.toFixed(1)}%
            </span>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Est. Tax Cost</div>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              totalTaxCost > 0 ? "text-amber-500" : "text-green-500"
            )}>
              {totalTaxCost > 0 ? fmt(totalTaxCost) : "$0"}
            </span>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="p-3 bg-background/50 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Last Rebalance</div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold">
              {daysSinceRebalance !== null ? `${daysSinceRebalance}d` : "N/A"}
            </span>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {shouldRebalance && (
        <div className="mt-4 p-3 bg-background/50 rounded-lg">
          <div className="flex items-start gap-2">
            <Bot className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <span className="font-medium text-purple-500">AI Insight: </span>
              {urgency === "high" ? (
                <span>
                  Your portfolio has drifted significantly. Rebalancing now will help
                  maintain your risk profile and may improve long-term returns through
                  disciplined selling high and buying low.
                </span>
              ) : (
                <span>
                  Consider rebalancing soon, but no urgent action needed. You could wait
                  for a market dip to buy stocks or a rally to sell, potentially
                  improving tax efficiency.
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface HistoricalImpactProps {
  events: HistoricalRebalanceEvent[];
}

function HistoricalImpact({ events }: HistoricalImpactProps) {
  const totalTaxCost = events.reduce((sum, e) => sum + e.taxCost, 0);
  const avgGains = events.reduce((sum, e) => sum + e.gainsSinceRebalance, 0) / events.length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">Total Rebalances</div>
          <div className="text-2xl font-bold">{events.length}</div>
          <div className="text-xs text-muted-foreground">in 2 years</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">Total Tax Cost</div>
          <div className="text-2xl font-bold text-amber-500">{fmt(totalTaxCost)}</div>
          <div className="text-xs text-muted-foreground">from taxable sales</div>
        </div>
        <div className="p-4 rounded-lg bg-muted/30">
          <div className="text-sm text-muted-foreground">Avg. Post-Rebalance Gain</div>
          <div className="text-2xl font-bold text-green-500">+{avgGains.toFixed(1)}%</div>
          <div className="text-xs text-muted-foreground">before next rebalance</div>
        </div>
      </div>

      <div className="space-y-3">
        {events.map((event, idx) => (
          <div key={idx} className="p-4 rounded-lg border">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {new Date(event.date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <Badge variant="outline" className="text-xs capitalize">
                  {event.method}
                </Badge>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {event.taxCost > 0 && (
                  <span className="text-amber-500">Tax: {fmt(event.taxCost)}</span>
                )}
                <span className="text-green-500 font-medium">
                  +{event.gainsSinceRebalance}% since
                </span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                Stocks: {event.beforeAllocation.stocks}% → {event.afterAllocation.stocks}%
              </span>
              <span>
                Bonds: {event.beforeAllocation.bonds}% → {event.afterAllocation.bonds}%
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
        <div className="flex items-start gap-3">
          <BarChart3 className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium mb-1">Rebalancing Impact Analysis</div>
            <p className="text-muted-foreground">
              Your disciplined rebalancing approach has maintained your target allocation
              while minimizing tax costs by prioritizing tax-advantaged accounts. The
              average post-rebalance gain of {avgGains.toFixed(1)}% suggests the strategy
              is effectively capturing mean reversion benefits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function AIRebalancer({
  accounts = DEFAULT_ACCOUNTS,
  targetAllocation: propTarget,
  currentAge = 45,
  retirementAge = 65,
  riskTolerance = "moderate",
  onRebalance,
}: AIRebalancerProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [driftThreshold, setDriftThreshold] = useState(5);
  const [showTaxLots, setShowTaxLots] = useState(false);
  const [customTarget, setCustomTarget] = useState<AssetAllocation | null>(null);

  // Calculate allocations
  const currentAllocation = useMemo(
    () => calculateCurrentAllocation(accounts),
    [accounts]
  );

  const targetAllocation = useMemo(() => {
    if (customTarget) return customTarget;
    if (propTarget) return propTarget;
    return calculateTargetAllocation(currentAge, riskTolerance);
  }, [customTarget, propTarget, currentAge, riskTolerance]);

  const drift = useMemo(
    () => calculateDrift(currentAllocation, targetAllocation),
    [currentAllocation, targetAllocation]
  );

  const shouldRebalance = drift > driftThreshold;

  const driftHistory = useMemo(
    () => generateDriftHistory(currentAllocation, targetAllocation),
    [currentAllocation, targetAllocation]
  );

  const trades = useMemo(
    () =>
      shouldRebalance
        ? generateRebalancingTrades(accounts, currentAllocation, targetAllocation)
        : [],
    [shouldRebalance, accounts, currentAllocation, targetAllocation]
  );

  const totalTaxCost = useMemo(
    () => trades.reduce((sum, t) => sum + t.taxImpact, 0),
    [trades]
  );

  const historicalEvents = useMemo(() => generateHistoricalRebalances(), []);

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + acc.balance, 0),
    [accounts]
  );

  const handleRebalance = useCallback(() => {
    if (onRebalance && trades.length > 0) {
      onRebalance(trades);
    }
  }, [onRebalance, trades]);

  const handleTargetChange = useCallback(
    (asset: keyof AssetAllocation, value: number) => {
      const current = customTarget || targetAllocation;
      const newTarget = { ...current, [asset]: value };

      // Adjust other assets proportionally
      const total = newTarget.stocks + newTarget.bonds + newTarget.cash;
      if (total !== 100) {
        const diff = 100 - total;
        if (asset === "stocks") {
          newTarget.bonds += diff * (current.bonds / (current.bonds + current.cash));
          newTarget.cash = 100 - newTarget.stocks - newTarget.bonds;
        } else if (asset === "bonds") {
          newTarget.stocks += diff * (current.stocks / (current.stocks + current.cash));
          newTarget.cash = 100 - newTarget.stocks - newTarget.bonds;
        } else {
          newTarget.stocks += diff * (current.stocks / (current.stocks + current.bonds));
          newTarget.bonds = 100 - newTarget.stocks - newTarget.cash;
        }
      }

      setCustomTarget({
        stocks: Math.round(Math.max(0, Math.min(100, newTarget.stocks)) * 10) / 10,
        bonds: Math.round(Math.max(0, Math.min(100, newTarget.bonds)) * 10) / 10,
        cash: Math.round(Math.max(0, Math.min(100, newTarget.cash)) * 10) / 10,
      });
    },
    [customTarget, targetAllocation]
  );

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20">
                <Scale className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  AI Rebalancing Assistant
                  <Badge variant="secondary" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Smart
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Intelligent portfolio rebalancing recommendations with tax optimization
                </CardDescription>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">{fmt(totalBalance)}</div>
              <div className="text-sm text-muted-foreground">Total Portfolio</div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Main Recommendation */}
          <RebalanceRecommendation
            shouldRebalance={shouldRebalance}
            drift={drift}
            threshold={driftThreshold}
            totalTaxCost={totalTaxCost}
            lastRebalanceDate={historicalEvents[0]?.date}
          />

          {/* Settings Row */}
          <div className="flex items-center gap-6 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-3">
              <Label htmlFor="threshold" className="whitespace-nowrap">
                Drift Threshold:
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="threshold"
                  type="number"
                  value={driftThreshold}
                  onChange={(e) => setDriftThreshold(Number(e.target.value))}
                  className="w-16 text-center"
                  min={1}
                  max={20}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="h-4 w-4 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">
                    Rebalancing is triggered when any asset class drifts more than
                    this percentage from its target. Common thresholds are 5-10%.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="h-6 w-px bg-border" />

            <div className="flex items-center gap-2">
              <Switch
                id="taxLots"
                checked={showTaxLots}
                onCheckedChange={setShowTaxLots}
              />
              <Label htmlFor="taxLots">Show Tax Lot Details</Label>
            </div>

            {customTarget && (
              <>
                <div className="h-6 w-px bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCustomTarget(null)}
                >
                  Reset to Age-Based Target
                </Button>
              </>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center gap-2">
                <PieChart className="h-4 w-4" />
                <span className="hidden sm:inline">Allocation</span>
              </TabsTrigger>
              <TabsTrigger value="accounts" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">By Account</span>
              </TabsTrigger>
              <TabsTrigger value="drift" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span className="hidden sm:inline">Drift History</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                <span className="hidden sm:inline">Past Rebalances</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid gap-6 lg:grid-cols-2">
                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Current vs Target Allocation
                  </h4>
                  <AllocationComparison
                    current={currentAllocation}
                    target={targetAllocation}
                  />
                </div>

                <div>
                  <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Customize Target Allocation
                  </h4>
                  <div className="space-y-4">
                    {(["stocks", "bonds", "cash"] as const).map((asset) => (
                      <div key={asset} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="capitalize">{asset}</Label>
                          <span className="text-sm font-medium">
                            {(customTarget || targetAllocation)[asset].toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <input
                            type="range"
                            min={0}
                            max={100}
                            step={1}
                            value={(customTarget || targetAllocation)[asset]}
                            onChange={(e) =>
                              handleTargetChange(asset, Number(e.target.value))
                            }
                            className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-blue-500"
                          />
                          <Input
                            type="number"
                            value={(customTarget || targetAllocation)[asset]}
                            onChange={(e) =>
                              handleTargetChange(asset, Number(e.target.value))
                            }
                            className="w-20"
                            min={0}
                            max={100}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4" />
                        Age-Based Recommendation
                      </div>
                      <p>
                        At age {currentAge} with {riskTolerance} risk tolerance,
                        the suggested allocation is{" "}
                        {calculateTargetAllocation(currentAge, riskTolerance).stocks}%
                        stocks / {calculateTargetAllocation(currentAge, riskTolerance).bonds}%
                        bonds.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="accounts" className="mt-6">
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Account-Specific Rebalancing Advice
              </h4>
              <AccountRebalancingAdvice accounts={accounts} trades={trades} />
            </TabsContent>

            <TabsContent value="drift" className="mt-6">
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Portfolio Drift Visualization
              </h4>
              <DriftVisualization
                driftHistory={driftHistory}
                threshold={driftThreshold}
              />
            </TabsContent>

            <TabsContent value="history" className="mt-6">
              <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                <History className="h-4 w-4" />
                Historical Rebalancing Impact
              </h4>
              <HistoricalImpact events={historicalEvents} />
            </TabsContent>
          </Tabs>

          {/* Action Button */}
          {shouldRebalance && trades.length > 0 && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border border-blue-500/20">
              <div>
                <div className="font-medium">Ready to Rebalance</div>
                <div className="text-sm text-muted-foreground">
                  {trades.length} trade{trades.length > 1 ? "s" : ""} across{" "}
                  {new Set(trades.map((t) => t.accountId)).size} account
                  {new Set(trades.map((t) => t.accountId)).size > 1 ? "s" : ""}
                  {totalTaxCost > 0 && ` | Est. tax cost: ${fmt(totalTaxCost)}`}
                </div>
              </div>
              <Button
                onClick={handleRebalance}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Execute Rebalance
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

export default AIRebalancer;
