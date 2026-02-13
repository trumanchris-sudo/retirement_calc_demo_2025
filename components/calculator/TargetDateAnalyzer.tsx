"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Target,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  Calculator,
  PieChart,
  BarChart3,
  DollarSign,
  Clock,
  Layers,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Types & Data
// ============================================================================

interface TargetDateFund {
  provider: string;
  name: string;
  expenseRatio: number;
  type: "index" | "active";
  glidePathType: "to" | "through";
  landingAllocation: number; // Stock % at retirement
  finalAllocation: number; // Stock % at age 85+
}

interface GlidePathPoint {
  age: number;
  vanguard: number;
  fidelity: number;
  schwab: number;
  tRowePrice: number;
}

interface UnderlyingHolding {
  name: string;
  type: "stock" | "bond" | "international" | "tips";
  percentage: number;
}

// Target Date Fund Data
const TARGET_DATE_FUNDS: TargetDateFund[] = [
  {
    provider: "Vanguard",
    name: "Target Retirement",
    expenseRatio: 0.08,
    type: "index",
    glidePathType: "through",
    landingAllocation: 50,
    finalAllocation: 30,
  },
  {
    provider: "Fidelity",
    name: "Freedom Index",
    expenseRatio: 0.12,
    type: "index",
    glidePathType: "to",
    landingAllocation: 46,
    finalAllocation: 24,
  },
  {
    provider: "Schwab",
    name: "Target Index",
    expenseRatio: 0.08,
    type: "index",
    glidePathType: "to",
    landingAllocation: 40,
    finalAllocation: 25,
  },
  {
    provider: "T. Rowe Price",
    name: "Retirement",
    expenseRatio: 0.55,
    type: "active",
    glidePathType: "through",
    landingAllocation: 55,
    finalAllocation: 30,
  },
  {
    provider: "American Funds",
    name: "Target Date",
    expenseRatio: 0.67,
    type: "active",
    glidePathType: "through",
    landingAllocation: 55,
    finalAllocation: 35,
  },
  {
    provider: "Fidelity",
    name: "Freedom (Active)",
    expenseRatio: 0.65,
    type: "active",
    glidePathType: "to",
    landingAllocation: 46,
    finalAllocation: 24,
  },
];

// Glide path data for different providers (stock allocation %)
const GLIDE_PATH_DATA: GlidePathPoint[] = [
  { age: 25, vanguard: 90, fidelity: 90, schwab: 90, tRowePrice: 90 },
  { age: 30, vanguard: 90, fidelity: 90, schwab: 90, tRowePrice: 90 },
  { age: 35, vanguard: 90, fidelity: 85, schwab: 85, tRowePrice: 88 },
  { age: 40, vanguard: 85, fidelity: 80, schwab: 80, tRowePrice: 85 },
  { age: 45, vanguard: 80, fidelity: 75, schwab: 72, tRowePrice: 80 },
  { age: 50, vanguard: 72, fidelity: 67, schwab: 65, tRowePrice: 72 },
  { age: 55, vanguard: 65, fidelity: 58, schwab: 55, tRowePrice: 65 },
  { age: 60, vanguard: 55, fidelity: 50, schwab: 45, tRowePrice: 58 },
  { age: 65, vanguard: 50, fidelity: 46, schwab: 40, tRowePrice: 55 },
  { age: 70, vanguard: 42, fidelity: 35, schwab: 32, tRowePrice: 45 },
  { age: 75, vanguard: 35, fidelity: 28, schwab: 28, tRowePrice: 38 },
  { age: 80, vanguard: 32, fidelity: 24, schwab: 25, tRowePrice: 32 },
  { age: 85, vanguard: 30, fidelity: 24, schwab: 25, tRowePrice: 30 },
];

// Example underlying holdings for a typical 2055 Target Date Fund
const UNDERLYING_HOLDINGS: UnderlyingHolding[] = [
  { name: "Total Stock Market Index", type: "stock", percentage: 54 },
  { name: "International Stock Index", type: "international", percentage: 36 },
  { name: "Total Bond Market Index", type: "bond", percentage: 7 },
  { name: "International Bond Index", type: "bond", percentage: 3 },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatPercent = (value: number): string => `${value.toFixed(2)}%`;
const formatCurrency = (value: number): string =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

// Calculate fee savings over time
const calculateFeeSavings = (
  portfolioValue: number,
  targetDateER: number,
  diyER: number,
  years: number,
  annualReturn: number = 0.07
): { targetDateFinal: number; diyFinal: number; savings: number } => {
  let targetDateValue = portfolioValue;
  let diyValue = portfolioValue;

  for (let i = 0; i < years; i++) {
    targetDateValue = targetDateValue * (1 + annualReturn - targetDateER / 100);
    diyValue = diyValue * (1 + annualReturn - diyER / 100);
  }

  return {
    targetDateFinal: targetDateValue,
    diyFinal: diyValue,
    savings: diyValue - targetDateValue,
  };
};

// ============================================================================
// Sub-Components
// ============================================================================

// How Target Date Funds Work Section
const HowTheyWorkSection: React.FC = () => (
  <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Target className="h-6 w-6 text-blue-600" />
        <CardTitle className="text-xl">How Target Date Funds Work</CardTitle>
      </div>
      <CardDescription>The "set it and forget it" approach to retirement investing</CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold">1. Pick Your Year</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose the fund closest to when you plan to retire (e.g., Target 2055 if retiring around 2055).
            The year in the name is your expected retirement date.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            <h4 className="font-semibold">2. Starts Aggressive</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            When you're young and far from retirement, the fund holds mostly stocks (80-90%)
            for maximum growth potential.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown className="h-5 w-5 text-orange-600" />
            <h4 className="font-semibold">3. Gets Conservative</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            As you approach retirement, it automatically shifts to more bonds (40-60%)
            to protect your savings from market volatility.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-blue-100 dark:border-blue-900">
          <div className="flex items-center gap-2 mb-2">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            <h4 className="font-semibold">4. Auto-Rebalancing</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            The fund automatically rebalances quarterly or annually to maintain target allocations.
            No action required from you.
          </p>
        </div>
      </div>

      <div className="bg-blue-100 dark:bg-blue-900/30 rounded-lg p-4 mt-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
          Bottom Line: One investment handles everything - diversification, rebalancing,
          and age-appropriate risk management. Perfect for people who want simplicity.
        </p>
      </div>
    </CardContent>
  </Card>
);

// Provider Comparison Section
const ProviderComparisonSection: React.FC = () => {
  const indexFunds = TARGET_DATE_FUNDS.filter((f) => f.type === "index");
  const activeFunds = TARGET_DATE_FUNDS.filter((f) => f.type === "active");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-green-600" />
          <CardTitle className="text-xl">Provider Comparison</CardTitle>
        </div>
        <CardDescription>Expense ratios matter - lower fees mean more money for retirement</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Index Funds */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-green-100 text-green-800 border-green-200">Recommended</Badge>
            Index Target Date Funds
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Expense Ratio</TableHead>
                <TableHead className="text-center">Glide Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indexFunds.map((fund) => (
                <TableRow key={`${fund.provider}-${fund.name}`}>
                  <TableCell className="font-medium">{fund.provider}</TableCell>
                  <TableCell>{fund.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {formatPercent(fund.expenseRatio)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {fund.glidePathType === "through" ? "Through" : "To"} retirement
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Active Funds */}
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Badge className="bg-orange-100 text-orange-800 border-orange-200">Higher Cost</Badge>
            Active Target Date Funds
          </h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Provider</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead className="text-right">Expense Ratio</TableHead>
                <TableHead className="text-center">Glide Path</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeFunds.map((fund) => (
                <TableRow key={`${fund.provider}-${fund.name}`}>
                  <TableCell className="font-medium">{fund.provider}</TableCell>
                  <TableCell>{fund.name}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      {formatPercent(fund.expenseRatio)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">
                      {fund.glidePathType === "through" ? "Through" : "To"} retirement
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                Fee Impact Over 30 Years
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                On a $100,000 portfolio growing at 7%, a 0.55% fee difference (active vs index) costs you
                approximately <strong>$47,000</strong> over 30 years. Always prefer low-cost index options.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Glide Path Comparison Section
const GlidePathComparisonSection: React.FC<{ currentAge: number }> = ({ currentAge }) => {
  const getStockAllocation = (age: number, provider: keyof Omit<GlidePathPoint, "age">): number => {
    const point = GLIDE_PATH_DATA.find((p) => p.age >= age);
    if (!point) return GLIDE_PATH_DATA[GLIDE_PATH_DATA.length - 1][provider];

    const prevPoint = GLIDE_PATH_DATA.find((p) => p.age <= age);
    if (!prevPoint || prevPoint.age === point.age) return point[provider];

    // Interpolate between points
    const progress = (age - prevPoint.age) / (point.age - prevPoint.age);
    return prevPoint[provider] + (point[provider] - prevPoint[provider]) * progress;
  };

  const providers = [
    { key: "vanguard" as const, name: "Vanguard", color: "bg-red-500" },
    { key: "fidelity" as const, name: "Fidelity", color: "bg-green-500" },
    { key: "schwab" as const, name: "Schwab", color: "bg-blue-500" },
    { key: "tRowePrice" as const, name: "T. Rowe Price", color: "bg-purple-500" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingDown className="h-6 w-6 text-purple-600" />
          <CardTitle className="text-xl">Glide Path Comparison</CardTitle>
        </div>
        <CardDescription>
          "To" retirement funds are more conservative at retirement. "Through" funds stay
          more aggressive, assuming you'll live 20+ years after retiring.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visual Glide Path */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            {providers.map((p) => (
              <div key={p.key} className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${p.color}`} />
                <span className="text-sm">{p.name}</span>
              </div>
            ))}
          </div>

          {/* Simple bar chart visualization */}
          <div className="space-y-3">
            {GLIDE_PATH_DATA.filter((_, i) => i % 2 === 0).map((point) => (
              <div key={point.age} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium w-16">
                    Age {point.age}
                    {point.age === currentAge && (
                      <Badge className="ml-2 text-xs" variant="outline">You</Badge>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {Math.round(point.vanguard)}-{Math.round(point.tRowePrice)}% stocks
                  </span>
                </div>
                <div className="flex gap-1">
                  {providers.map((p) => (
                    <div
                      key={p.key}
                      className={`h-4 ${p.color} rounded transition-all duration-300`}
                      style={{ width: `${point[p.key]}%`, maxWidth: "25%" }}
                      title={`${p.name}: ${point[p.key]}% stocks`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Current allocations for user's age */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {providers.map((p) => {
            const allocation = Math.round(getStockAllocation(currentAge, p.key));
            return (
              <div
                key={p.key}
                className="bg-white dark:bg-gray-900 rounded-lg p-3 border text-center"
              >
                <div className="text-sm font-medium mb-1">{p.name}</div>
                <div className="text-2xl font-bold">{allocation}%</div>
                <div className="text-xs text-muted-foreground">stocks at age {currentAge}</div>
              </div>
            );
          })}
        </div>

        {/* To vs Through explanation */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
            <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              "To" Retirement (Conservative)
            </h4>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Reaches final allocation AT retirement. More conservative, assumes you'll
              shift to income-focused strategy immediately. (Fidelity Index, Schwab)
            </p>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
            <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
              "Through" Retirement (Aggressive)
            </h4>
            <p className="text-sm text-purple-800 dark:text-purple-200">
              Continues adjusting AFTER retirement. More aggressive, accounts for
              20-30 years of retirement needs. (Vanguard, T. Rowe Price)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Pros and Cons Section
const ProsConsSection: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        <CardTitle className="text-xl">Pros and Cons</CardTitle>
      </div>
      <CardDescription>Target date funds are right for most people, but not everyone</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pros */}
        <div className="space-y-3">
          <h4 className="font-semibold text-green-700 dark:text-green-400 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" /> Advantages
          </h4>
          <ul className="space-y-2">
            {[
              { title: "Simple", desc: "One fund does everything - no decisions needed" },
              { title: "Auto Rebalancing", desc: "Never worry about drift or market timing" },
              { title: "Age-Appropriate", desc: "Risk automatically adjusts as you age" },
              { title: "Set & Forget", desc: "Perfect for busy people or beginners" },
              { title: "Diversified", desc: "Instant access to broad market exposure" },
              { title: "Low Minimums", desc: "Often $1 or no minimum to start" },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-medium">{item.title}:</span>{" "}
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Cons */}
        <div className="space-y-3">
          <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2">
            <XCircle className="h-5 w-5" /> Disadvantages
          </h4>
          <ul className="space-y-2">
            {[
              { title: "One-Size-Fits-All", desc: "Doesn't account for individual circumstances" },
              { title: "No Customization", desc: "Can't adjust stock/bond mix to your preference" },
              { title: "May Be Conservative", desc: "Some people can handle more risk" },
              { title: "Ignores Other Assets", desc: "Doesn't consider spouse's 401k or taxable accounts" },
              { title: "Higher ER Than DIY", desc: "Still more expensive than building your own" },
              { title: "Tax Inefficient", desc: "Can't do tax-loss harvesting or asset location" },
            ].map((item) => (
              <li key={item.title} className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-600 mt-1 flex-shrink-0" />
                <div>
                  <span className="font-medium">{item.title}:</span>{" "}
                  <span className="text-sm text-muted-foreground">{item.desc}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CardContent>
  </Card>
);

// When NOT to Use Section
const WhenNotToUseSection: React.FC = () => (
  <Card className="border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/20">
    <CardHeader>
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-6 w-6 text-orange-600" />
        <CardTitle className="text-xl">When NOT to Use Target Date Funds</CardTitle>
      </div>
      <CardDescription>These situations may warrant a different approach</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            title: "Significant Other Assets",
            desc: "Large taxable brokerage account, real estate portfolio, or spouse's retirement accounts. Your overall allocation may already be balanced.",
            icon: DollarSign,
          },
          {
            title: "You Want to Customize",
            desc: "You prefer a more aggressive or conservative allocation than the fund provides, or want specific sector exposure.",
            icon: PieChart,
          },
          {
            title: "You Have a Pension",
            desc: "Pensions are like bonds - guaranteed income. With a pension, you may want MORE stocks since you already have 'bond-like' income.",
            icon: TrendingUp,
          },
          {
            title: "You're Sophisticated",
            desc: "You understand asset location, tax-loss harvesting, and factor tilts. DIY 3-fund portfolio may be more efficient.",
            icon: Calculator,
          },
          {
            title: "Multiple 401k Plans",
            desc: "If you and spouse both have workplace plans, target date in each may result in unintended overlap.",
            icon: Layers,
          },
          {
            title: "Cost-Conscious",
            desc: "Even low-cost target date funds (0.08%) are pricier than DIY (0.03%). On $1M+, this adds up.",
            icon: BarChart3,
          },
        ].map((item) => (
          <div
            key={item.title}
            className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-orange-100 dark:border-orange-900"
          >
            <div className="flex items-center gap-2 mb-2">
              <item.icon className="h-5 w-5 text-orange-600" />
              <h4 className="font-semibold">{item.title}</h4>
            </div>
            <p className="text-sm text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </CardContent>
  </Card>
);

// Underlying Holdings Section
const UnderlyingHoldingsSection: React.FC = () => (
  <Card>
    <CardHeader>
      <div className="flex items-center gap-2">
        <Layers className="h-6 w-6 text-indigo-600" />
        <CardTitle className="text-xl">What's Inside a Target Date Fund?</CardTitle>
      </div>
      <CardDescription>
        It's just a "fund of funds" - typically 3-4 low-cost index funds in a wrapper
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="text-center mb-4">
        <Badge variant="outline" className="text-lg px-4 py-1">
          Example: Vanguard Target Retirement 2055
        </Badge>
      </div>

      {/* Visual breakdown */}
      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {UNDERLYING_HOLDINGS.map((holding) => {
          const colorMap = {
            stock: "bg-blue-500",
            international: "bg-green-500",
            bond: "bg-orange-400",
            tips: "bg-purple-400",
          };
          return (
            <div
              key={holding.name}
              className={`${colorMap[holding.type]} text-white rounded-lg p-3 text-center`}
              style={{ width: `${Math.max(holding.percentage * 1.5, 80)}px` }}
            >
              <div className="text-lg font-bold">{holding.percentage}%</div>
              <div className="text-xs opacity-90">{holding.type}</div>
            </div>
          );
        })}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Fund</TableHead>
            <TableHead className="text-center">Type</TableHead>
            <TableHead className="text-right">Allocation</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {UNDERLYING_HOLDINGS.map((holding) => (
            <TableRow key={holding.name}>
              <TableCell className="font-medium">{holding.name}</TableCell>
              <TableCell className="text-center">
                <Badge
                  variant="outline"
                  className={
                    holding.type === "stock"
                      ? "bg-blue-50 text-blue-700"
                      : holding.type === "international"
                      ? "bg-green-50 text-green-700"
                      : "bg-orange-50 text-orange-700"
                  }
                >
                  {holding.type === "stock"
                    ? "US Stocks"
                    : holding.type === "international"
                    ? "Int'l Stocks"
                    : "Bonds"}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-semibold">{holding.percentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4 border border-indigo-200 dark:border-indigo-900">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-indigo-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-indigo-900 dark:text-indigo-100 mb-1">
              The DIY Alternative: 3-Fund Portfolio
            </div>
            <p className="text-sm text-indigo-800 dark:text-indigo-200">
              You can replicate this yourself with: Total Stock Market (VTI/VTSAX),
              Total International (VXUS/VTIAX), and Total Bond (BND/VBTLX).
              The only difference? You handle rebalancing and adjust allocation yourself.
            </p>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

// Fee Calculator Section
const FeeCalculatorSection: React.FC = () => {
  const [portfolioValue, setPortfolioValue] = useState(100000);
  const [targetDateER, setTargetDateER] = useState(0.12);
  const [diyER, setDiyER] = useState(0.03);
  const [years, setYears] = useState(30);

  const results = useMemo(
    () => calculateFeeSavings(portfolioValue, targetDateER, diyER, years),
    [portfolioValue, targetDateER, diyER, years]
  );

  return (
    <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Calculator className="h-6 w-6 text-green-600" />
          <CardTitle className="text-xl">Target Date vs DIY Calculator</CardTitle>
        </div>
        <CardDescription>Compare the long-term cost of target date funds vs DIY 3-fund portfolio</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Current Portfolio Value: {formatCurrency(portfolioValue)}
              </label>
              <Slider
                value={[portfolioValue]}
                onValueChange={(v) => setPortfolioValue(v[0])}
                min={10000}
                max={2000000}
                step={10000}
                thumbLabel="Portfolio value"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>$10k</span>
                <span>$2M</span>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Time Horizon: {years} years
              </label>
              <Slider
                value={[years]}
                onValueChange={(v) => setYears(v[0])}
                min={5}
                max={40}
                step={1}
                thumbLabel="Years"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>5 years</span>
                <span>40 years</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Target Date Fund ER
              </label>
              <Select
                value={targetDateER.toString()}
                onValueChange={(v) => setTargetDateER(parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.08">Vanguard/Schwab Index (0.08%)</SelectItem>
                  <SelectItem value="0.12">Fidelity Freedom Index (0.12%)</SelectItem>
                  <SelectItem value="0.55">T. Rowe Price Active (0.55%)</SelectItem>
                  <SelectItem value="0.65">Fidelity Freedom Active (0.65%)</SelectItem>
                  <SelectItem value="0.75">Average Active TDF (0.75%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                DIY 3-Fund ER
              </label>
              <Select
                value={diyER.toString()}
                onValueChange={(v) => setDiyER(parseFloat(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.03">Vanguard ETFs (0.03%)</SelectItem>
                  <SelectItem value="0.04">Fidelity Zero + Index (0.04%)</SelectItem>
                  <SelectItem value="0.05">Schwab ETFs (0.05%)</SelectItem>
                  <SelectItem value="0.10">Average Index Funds (0.10%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
            <div className="text-sm text-muted-foreground mb-1">Target Date Fund</div>
            <div className="text-2xl font-bold">{formatCurrency(results.targetDateFinal)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPercent(targetDateER)} expense ratio
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border text-center">
            <div className="text-sm text-muted-foreground mb-1">DIY 3-Fund Portfolio</div>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(results.diyFinal)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {formatPercent(diyER)} expense ratio
            </div>
          </div>

          <div className="bg-green-100 dark:bg-green-900/30 rounded-lg p-4 border border-green-200 text-center">
            <div className="text-sm text-green-700 dark:text-green-400 mb-1">DIY Savings</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {formatCurrency(results.savings)}
            </div>
            <div className="text-xs text-green-600 dark:text-green-500 mt-1">
              over {years} years
            </div>
          </div>
        </div>

        {/* Comparison bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Target Date Fund</span>
            <span>DIY Portfolio</span>
          </div>
          <div className="relative w-full bg-gray-200 dark:bg-gray-800 rounded-full h-8">
            <div
              className="absolute left-0 top-0 bg-orange-400 h-8 rounded-l-full flex items-center justify-end pr-2 text-white text-sm font-medium"
              style={{
                width: `${(results.targetDateFinal / results.diyFinal) * 50}%`,
              }}
            >
              {formatCurrency(results.targetDateFinal)}
            </div>
            <div
              className="absolute right-0 top-0 bg-green-500 h-8 rounded-r-full flex items-center justify-start pl-2 text-white text-sm font-medium"
              style={{ width: "50%" }}
            >
              {formatCurrency(results.diyFinal)}
            </div>
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Is the Savings Worth It?
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                For most people, the convenience of target date funds is worth the small fee difference
                (0.05-0.10%). However, if you're comfortable rebalancing annually and have $100k+,
                DIY can save you {formatCurrency(results.savings / years)}/year.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Recommendation Section
const RecommendationSection: React.FC = () => (
  <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30">
    <CardHeader>
      <div className="flex items-center gap-2">
        <Target className="h-6 w-6 text-emerald-600" />
        <CardTitle className="text-xl">The Bottom Line</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg p-6 border-2 border-emerald-300 dark:border-emerald-800">
        <h3 className="text-lg font-bold text-emerald-800 dark:text-emerald-200 mb-3">
          For Most 401(k) Investors, Target Date Index Funds Are the Right Choice
        </h3>
        <ul className="space-y-2 text-sm">
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Choose a low-cost index option</strong> - Vanguard (0.08%), Schwab (0.08%),
              or Fidelity Freedom Index (0.12%)
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Pick the year closest to age 65</strong> - If you're 30, that's Target 2055 or 2060
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Contribute consistently and forget about it</strong> - The fund handles everything else
            </span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
            <span>
              <strong>Avoid active target date funds</strong> - The extra 0.50%+ in fees isn't worth it
            </span>
          </li>
        </ul>
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Target date funds handle 90% of what most people need. The remaining 10% (tax optimization,
          asset location) only matters at larger portfolio sizes. Start simple, optimize later.
        </p>
      </div>
    </CardContent>
  </Card>
);

// ============================================================================
// Main Component
// ============================================================================

interface TargetDateAnalyzerProps {
  currentAge?: number;
}

export const TargetDateAnalyzer: React.FC<TargetDateAnalyzerProps> = ({ currentAge = 35 }) => {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Target className="h-8 w-8 text-blue-600" />
          <h1 className="text-3xl font-bold">Target Date Fund Analyzer</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The "set-and-forget" option for retirement investing. Understand how they work,
          compare providers, and decide if they're right for you.
        </p>
        <Badge className="bg-blue-100 text-blue-800 border-blue-200">
          Recommended for most 401(k) investors
        </Badge>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="compare">Compare Funds</TabsTrigger>
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="decision">Should I Use?</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          <HowTheyWorkSection />
          <UnderlyingHoldingsSection />
        </TabsContent>

        <TabsContent value="compare" className="space-y-6 mt-6">
          <ProviderComparisonSection />
          <GlidePathComparisonSection currentAge={currentAge} />
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6 mt-6">
          <FeeCalculatorSection />
        </TabsContent>

        <TabsContent value="decision" className="space-y-6 mt-6">
          <ProsConsSection />
          <WhenNotToUseSection />
          <RecommendationSection />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TargetDateAnalyzer;
