"use client";

import React, { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Calculator,
  Info,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Lightbulb,
  FileText,
  HelpCircle,
  Percent,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface FeeInputs {
  expenseRatio: number; // percentage (e.g., 0.5 for 0.5%)
  advisoryFee: number; // percentage of AUM
  planFees401k: number; // percentage
  tradingCommissions: number; // annual dollar amount
  portfolioValue: number; // current portfolio value
  annualContribution: number; // annual contribution
  yearsToRetirement: number; // investment horizon
  expectedReturn: number; // annual expected return percentage
}

interface LowCostAlternative {
  name: string;
  ticker: string;
  expenseRatio: number;
  provider: string;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const LOW_COST_ALTERNATIVES: LowCostAlternative[] = [
  {
    name: "Vanguard Total Stock Market Index",
    ticker: "VTSAX / VTI",
    expenseRatio: 0.03,
    provider: "Vanguard",
    description: "Entire US stock market",
  },
  {
    name: "Fidelity ZERO Total Market Index",
    ticker: "FZROX",
    expenseRatio: 0.0,
    provider: "Fidelity",
    description: "Zero expense ratio",
  },
  {
    name: "Schwab Total Stock Market Index",
    ticker: "SWTSX",
    expenseRatio: 0.03,
    provider: "Schwab",
    description: "Entire US stock market",
  },
  {
    name: "Vanguard Total International Stock",
    ticker: "VTIAX / VXUS",
    expenseRatio: 0.07,
    provider: "Vanguard",
    description: "International diversification",
  },
  {
    name: "Vanguard Total Bond Market",
    ticker: "VBTLX / BND",
    expenseRatio: 0.03,
    provider: "Vanguard",
    description: "Broad bond exposure",
  },
  {
    name: "Vanguard Target Retirement Funds",
    ticker: "VTTVX series",
    expenseRatio: 0.08,
    provider: "Vanguard",
    description: "All-in-one solution",
  },
];

const ADVISOR_VALUE_ITEMS = [
  {
    service: "Tax-loss harvesting",
    potentialValue: "0.2-0.5% annually",
    description: "Offsetting gains with losses to reduce tax burden",
  },
  {
    service: "Behavioral coaching",
    potentialValue: "1-2% during downturns",
    description: "Preventing panic selling during market crashes",
  },
  {
    service: "Asset location optimization",
    potentialValue: "0.1-0.3% annually",
    description: "Placing investments in tax-optimal accounts",
  },
  {
    service: "Rebalancing discipline",
    potentialValue: "0.1-0.2% annually",
    description: "Maintaining target allocation systematically",
  },
  {
    service: "Withdrawal strategy",
    potentialValue: "0.5-1.0% in retirement",
    description: "Tax-efficient distribution planning",
  },
];

const FORM_ADV_QUESTIONS = [
  "What is your total all-in fee including fund expenses?",
  "Are there any transaction fees or trading costs?",
  "Do you receive any compensation from fund companies (12b-1 fees)?",
  "What services are included vs. extra?",
  "How are you compensated - fee-only, commission, or hybrid?",
  "Can I see your Form ADV Part 2A (fee disclosure document)?",
  "What is your fiduciary duty to me?",
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return "$0";
  const abs = Math.abs(value);
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Calculate future value with fees dragging on returns
 */
const calculateFutureValue = (
  principal: number,
  annualContribution: number,
  years: number,
  nominalReturn: number,
  totalFeePct: number
): number => {
  const effectiveReturn = (nominalReturn - totalFeePct) / 100;
  let balance = principal;

  for (let year = 0; year < years; year++) {
    balance = balance * (1 + effectiveReturn) + annualContribution;
  }

  return balance;
};

/**
 * Calculate lifetime fee cost (opportunity cost)
 */
const calculateLifetimeFees = (
  principal: number,
  annualContribution: number,
  years: number,
  nominalReturn: number,
  totalFeePct: number
): number => {
  const withFees = calculateFutureValue(
    principal,
    annualContribution,
    years,
    nominalReturn,
    totalFeePct
  );
  const withoutFees = calculateFutureValue(
    principal,
    annualContribution,
    years,
    nominalReturn,
    0
  );
  return withoutFees - withFees;
};

// ============================================================================
// Sub-Components
// ============================================================================

interface FeeInputSectionProps {
  inputs: FeeInputs;
  onInputChange: (field: keyof FeeInputs, value: number) => void;
}

const FeeInputSection: React.FC<FeeInputSectionProps> = ({
  inputs,
  onInputChange,
}) => {
  const totalFeePercent =
    inputs.expenseRatio + inputs.advisoryFee + inputs.planFees401k;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-blue-600" />
          Fee Input Calculator
        </CardTitle>
        <CardDescription>
          Enter your current investment fees to see their true cost
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Current Portfolio Value
          </label>
          <Input
            type="number"
            value={inputs.portfolioValue || ""}
            onChange={(e) =>
              onInputChange("portfolioValue", parseFloat(e.target.value) || 0)
            }
            placeholder="500000"
            className="font-mono"
          />
        </div>

        {/* Annual Contribution */}
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Annual Contribution
          </label>
          <Input
            type="number"
            value={inputs.annualContribution || ""}
            onChange={(e) =>
              onInputChange(
                "annualContribution",
                parseFloat(e.target.value) || 0
              )
            }
            placeholder="20000"
            className="font-mono"
          />
        </div>

        {/* Years to Retirement */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Years to Retirement: {inputs.yearsToRetirement}
          </label>
          <Slider
            value={[inputs.yearsToRetirement]}
            onValueChange={(v) => onInputChange("yearsToRetirement", v[0])}
            min={5}
            max={40}
            step={1}
            thumbLabel="Years to retirement"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 years</span>
            <span>40 years</span>
          </div>
        </div>

        {/* Expected Return */}
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Expected Annual Return: {formatPercent(inputs.expectedReturn)}
          </label>
          <Slider
            value={[inputs.expectedReturn]}
            onValueChange={(v) => onInputChange("expectedReturn", v[0])}
            min={4}
            max={12}
            step={0.5}
            thumbLabel="Expected return"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>4%</span>
            <span>12%</span>
          </div>
        </div>

        <div className="border-t pt-4 space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4 text-red-600" />
            Your Fees
          </h4>

          {/* Expense Ratio */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Fund Expense Ratio</span>
              <Badge variant="outline" className="font-mono">
                {formatPercent(inputs.expenseRatio)}
              </Badge>
            </label>
            <Slider
              value={[inputs.expenseRatio]}
              onValueChange={(v) => onInputChange("expenseRatio", v[0])}
              min={0}
              max={2}
              step={0.01}
              thumbLabel="Expense ratio"
              gradient={false}
            />
            <p className="text-xs text-muted-foreground">
              Average actively managed fund: 0.5-1.0%. Index funds: 0.03-0.20%
            </p>
          </div>

          {/* Advisory Fee */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>Advisory Fee (% of AUM)</span>
              <Badge variant="outline" className="font-mono">
                {formatPercent(inputs.advisoryFee)}
              </Badge>
            </label>
            <Slider
              value={[inputs.advisoryFee]}
              onValueChange={(v) => onInputChange("advisoryFee", v[0])}
              min={0}
              max={2}
              step={0.05}
              thumbLabel="Advisory fee"
              gradient={false}
            />
            <p className="text-xs text-muted-foreground">
              Typical financial advisor: 0.5-1.5%. Robo-advisors: 0.15-0.50%
            </p>
          </div>

          {/* 401k Plan Fees */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center justify-between">
              <span>401(k) Plan Fees</span>
              <Badge variant="outline" className="font-mono">
                {formatPercent(inputs.planFees401k)}
              </Badge>
            </label>
            <Slider
              value={[inputs.planFees401k]}
              onValueChange={(v) => onInputChange("planFees401k", v[0])}
              min={0}
              max={1.5}
              step={0.05}
              thumbLabel="401k fees"
              gradient={false}
            />
            <p className="text-xs text-muted-foreground">
              Good plans: 0.1-0.3%. Poor plans: 0.5-1.5%+
            </p>
          </div>

          {/* Trading Commissions */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Annual Trading Commissions
            </label>
            <Input
              type="number"
              value={inputs.tradingCommissions || ""}
              onChange={(e) =>
                onInputChange(
                  "tradingCommissions",
                  parseFloat(e.target.value) || 0
                )
              }
              placeholder="0"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Most brokers offer free trading. Legacy brokers may charge $5-20
              per trade.
            </p>
          </div>
        </div>

        {/* Total Fee Summary */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <span className="font-semibold">Total Annual Fee Drag</span>
            </div>
            <Badge variant="destructive" className="text-lg font-mono">
              {formatPercent(totalFeePercent)}
            </Badge>
          </div>
          {inputs.tradingCommissions > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Plus {formatCurrency(inputs.tradingCommissions)} in trading costs
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface LifetimeCostVisualizerProps {
  inputs: FeeInputs;
}

const LifetimeCostVisualizer: React.FC<LifetimeCostVisualizerProps> = ({
  inputs,
}) => {
  const totalFeePercent =
    inputs.expenseRatio + inputs.advisoryFee + inputs.planFees401k;

  const lifetimeCost = useMemo(() => {
    return calculateLifetimeFees(
      inputs.portfolioValue,
      inputs.annualContribution,
      inputs.yearsToRetirement,
      inputs.expectedReturn,
      totalFeePercent
    );
  }, [inputs, totalFeePercent]);

  const futureValueWithFees = useMemo(() => {
    return calculateFutureValue(
      inputs.portfolioValue,
      inputs.annualContribution,
      inputs.yearsToRetirement,
      inputs.expectedReturn,
      totalFeePercent
    );
  }, [inputs, totalFeePercent]);

  const futureValueWithoutFees = useMemo(() => {
    return calculateFutureValue(
      inputs.portfolioValue,
      inputs.annualContribution,
      inputs.yearsToRetirement,
      inputs.expectedReturn,
      0
    );
  }, [inputs]);

  const lowCostFutureValue = useMemo(() => {
    return calculateFutureValue(
      inputs.portfolioValue,
      inputs.annualContribution,
      inputs.yearsToRetirement,
      inputs.expectedReturn,
      0.1 // Low-cost index fund assumption
    );
  }, [inputs]);

  const savingsBySwitch = lowCostFutureValue - futureValueWithFees;

  // Calculate year-by-year growth for visualization
  const growthData = useMemo(() => {
    const data = [];
    for (let year = 0; year <= inputs.yearsToRetirement; year += 5) {
      const withFees = calculateFutureValue(
        inputs.portfolioValue,
        inputs.annualContribution,
        year,
        inputs.expectedReturn,
        totalFeePercent
      );
      const withoutFees = calculateFutureValue(
        inputs.portfolioValue,
        inputs.annualContribution,
        year,
        inputs.expectedReturn,
        0
      );
      data.push({
        year,
        withFees,
        withoutFees,
        gap: withoutFees - withFees,
      });
    }
    return data;
  }, [inputs, totalFeePercent]);

  return (
    <Card className="border-2 border-red-200 dark:border-red-900">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-red-600" />
          The Silent Killer: Your Lifetime Fee Cost
        </CardTitle>
        <CardDescription>
          Over {inputs.yearsToRetirement} years, fees compound against you
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Headline Number */}
        <div className="text-center py-6 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 rounded-lg border border-red-200 dark:border-red-900">
          <p className="text-sm text-muted-foreground mb-2">
            A {formatPercent(totalFeePercent)} fee costs you
          </p>
          <p className="text-5xl md:text-6xl font-bold text-red-600">
            {formatCurrency(lifetimeCost)}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Over {inputs.yearsToRetirement} years of investing
          </p>
        </div>

        {/* Visual Comparison Bars */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Portfolio Value Comparison</h4>

          {/* Without Fees */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                No fees (theoretical max)
              </span>
              <span className="font-mono font-semibold">
                {formatCurrency(futureValueWithoutFees)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-500 to-emerald-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{ width: "100%" }}
              >
                <span className="text-xs text-white font-medium">100%</span>
              </div>
            </div>
          </div>

          {/* Low-cost Index Funds */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-blue-600" />
                Low-cost index funds (0.10%)
              </span>
              <span className="font-mono font-semibold">
                {formatCurrency(lowCostFutureValue)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-cyan-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${(lowCostFutureValue / futureValueWithoutFees) * 100}%`,
                }}
              >
                <span className="text-xs text-white font-medium">
                  {((lowCostFutureValue / futureValueWithoutFees) * 100).toFixed(
                    0
                  )}
                  %
                </span>
              </div>
            </div>
          </div>

          {/* Your Current Fees */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-600" />
                Your current fees ({formatPercent(totalFeePercent)})
              </span>
              <span className="font-mono font-semibold">
                {formatCurrency(futureValueWithFees)}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-6 overflow-hidden">
              <div
                className="bg-gradient-to-r from-red-500 to-orange-500 h-full rounded-full flex items-center justify-end pr-2"
                style={{
                  width: `${(futureValueWithFees / futureValueWithoutFees) * 100}%`,
                }}
              >
                <span className="text-xs text-white font-medium">
                  {((futureValueWithFees / futureValueWithoutFees) * 100).toFixed(
                    0
                  )}
                  %
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Compound Effect Over Time */}
        <div className="border-t pt-4 space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
            Fee Drag Over Time
          </h4>
          <div className="grid grid-cols-4 gap-2 text-center">
            {growthData.map((d) => (
              <div
                key={d.year}
                className="bg-muted/50 rounded-lg p-2"
              >
                <div className="text-xs text-muted-foreground">
                  Year {d.year}
                </div>
                <div className="text-sm font-semibold text-red-600">
                  -{formatCurrency(d.gap)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action */}
        {savingsBySwitch > 0 && (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Switching to Low-Cost Index Funds Could Save You
                </div>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(savingsBySwitch)}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  Over your {inputs.yearsToRetirement}-year investment horizon
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FeeComparisonTable: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-5 w-5 text-green-600" />
          Low-Cost Fund Recommendations
        </CardTitle>
        <CardDescription>
          Switch from high-cost funds to these low-cost alternatives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 font-semibold">Fund Name</th>
                <th className="text-left py-3 px-2 font-semibold">Ticker</th>
                <th className="text-center py-3 px-2 font-semibold">
                  Expense Ratio
                </th>
                <th className="text-left py-3 px-2 font-semibold hidden sm:table-cell">
                  Provider
                </th>
              </tr>
            </thead>
            <tbody>
              {LOW_COST_ALTERNATIVES.map((fund, idx) => (
                <tr
                  key={idx}
                  className="border-b hover:bg-muted/50 transition-colors"
                >
                  <td className="py-3 px-2">
                    <div className="font-medium">{fund.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {fund.description}
                    </div>
                  </td>
                  <td className="py-3 px-2 font-mono text-blue-600">
                    {fund.ticker}
                  </td>
                  <td className="py-3 px-2 text-center">
                    <Badge
                      variant={fund.expenseRatio === 0 ? "default" : "secondary"}
                      className={cn(
                        "font-mono",
                        fund.expenseRatio === 0 &&
                          "bg-green-600 hover:bg-green-700"
                      )}
                    >
                      {fund.expenseRatio === 0
                        ? "FREE"
                        : formatPercent(fund.expenseRatio)}
                    </Badge>
                  </td>
                  <td className="py-3 px-2 hidden sm:table-cell text-muted-foreground">
                    {fund.provider}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              These are general recommendations. Consider factors like tax
              implications, account minimums, and your specific situation before
              switching funds.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface K401TrapSectionProps {
  inputs: FeeInputs;
}

const K401TrapSection: React.FC<K401TrapSectionProps> = ({ inputs }) => {
  const has401kFees = inputs.planFees401k > 0.3; // Above average is a concern

  const annualFeeInDollars =
    (inputs.portfolioValue * inputs.planFees401k) / 100;
  const lifetimeFees = useMemo(() => {
    return calculateLifetimeFees(
      inputs.portfolioValue,
      inputs.annualContribution,
      inputs.yearsToRetirement,
      inputs.expectedReturn,
      inputs.planFees401k
    );
  }, [inputs]);

  return (
    <Card className={cn(has401kFees && "border-yellow-300 dark:border-yellow-900")}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle
            className={cn(
              "h-5 w-5",
              has401kFees ? "text-yellow-600" : "text-gray-600"
            )}
          />
          The 401(k) Trap
        </CardTitle>
        <CardDescription>
          Many employer plans have limited, expensive options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {has401kFees ? (
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                  Your 401(k) Fees Are Above Average
                </div>
                <div className="space-y-2 text-sm text-yellow-800 dark:text-yellow-200">
                  <p>
                    At {formatPercent(inputs.planFees401k)}, your plan fees cost
                    you:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>
                      <strong>{formatCurrency(annualFeeInDollars)}</strong> this
                      year alone
                    </li>
                    <li>
                      <strong>{formatCurrency(lifetimeFees)}</strong> over{" "}
                      {inputs.yearsToRetirement} years
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  Your 401(k) Fees Are Reasonable
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  At {formatPercent(inputs.planFees401k)}, your plan is
                  competitively priced. Maximize your contributions!
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <h4 className="font-semibold">The &ldquo;Max Match, Then Elsewhere&rdquo; Strategy</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge className="shrink-0">1</Badge>
              <p>
                <strong>Max the match:</strong> Always contribute enough to get
                the full employer match. That&apos;s free money (100% return).
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge className="shrink-0">2</Badge>
              <p>
                <strong>Then go to IRA:</strong> If your 401(k) has bad options,
                max out a Roth or Traditional IRA ($7,000/year for 2024) at
                Vanguard, Fidelity, or Schwab.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge className="shrink-0">3</Badge>
              <p>
                <strong>Then back to 401(k):</strong> If you still have savings
                capacity, max out the 401(k) ($23,000 for 2024) for the tax
                benefits despite the fees.
              </p>
            </div>
            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Badge className="shrink-0">4</Badge>
              <p>
                <strong>Taxable brokerage:</strong> Any remaining savings go
                into a taxable account with your preferred low-cost index funds.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800 dark:text-blue-200">
              <strong>Pro tip:</strong> When you leave an employer, roll your
              401(k) to an IRA at a low-cost provider. You&apos;ll gain access to
              better fund options and lower fees.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface AdvisorFeeAnalysisProps {
  inputs: FeeInputs;
}

const AdvisorFeeAnalysis: React.FC<AdvisorFeeAnalysisProps> = ({ inputs }) => {
  const hasAdvisorFee = inputs.advisoryFee > 0;

  const annualFeeInDollars =
    (inputs.portfolioValue * inputs.advisoryFee) / 100;

  // Project fees over time assuming portfolio grows
  const feeProjections = useMemo(() => {
    const projections = [];
    let balance = inputs.portfolioValue;
    const growthRate = (inputs.expectedReturn - inputs.advisoryFee) / 100;

    for (let year = 1; year <= Math.min(inputs.yearsToRetirement, 30); year++) {
      balance = balance * (1 + growthRate) + inputs.annualContribution;
      const fee = (balance * inputs.advisoryFee) / 100;
      projections.push({ year, balance, fee });
    }

    return projections;
  }, [inputs]);

  const totalFeesPaid = feeProjections.reduce((sum, p) => sum + p.fee, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-purple-600" />
          Advisor Fee Analysis
        </CardTitle>
        <CardDescription>
          1% seems small... until you see the real numbers
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {hasAdvisorFee ? (
          <>
            {/* The Reality Check */}
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3">
                The Reality of {formatPercent(inputs.advisoryFee)} AUM
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    This Year
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(annualFeeInDollars)}
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    In 10 Years
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {feeProjections[9]
                      ? formatCurrency(feeProjections[9].fee)
                      : "N/A"}
                  </p>
                </div>
                <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">
                    Total Over {feeProjections.length} Years
                  </p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(totalFeesPaid)}
                  </p>
                </div>
              </div>
            </div>

            {/* Example with $1M */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold">Example: $1M Portfolio</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b">
                  <span>Annual fee (1% of $1M)</span>
                  <span className="font-mono font-semibold">$10,000/year</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Monthly fee</span>
                  <span className="font-mono font-semibold">$833/month</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span>Over 20 years (fees compound)</span>
                  <span className="font-mono font-semibold text-red-600">
                    $200,000+
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span>Over 30 years</span>
                  <span className="font-mono font-semibold text-red-600">
                    $400,000+
                  </span>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-green-900 dark:text-green-100 mb-1">
                  No Advisory Fee Detected
                </div>
                <p className="text-sm text-green-800 dark:text-green-200">
                  You&apos;re either self-managing or using a low-cost service. This
                  saves you significant money over time.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* When Advisors Are Worth It */}
        <Accordion type="single" collapsible>
          <AccordionItem value="worth-it">
            <AccordionTrigger className="text-sm font-semibold">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                When Are Advisor Fees Worth It?
              </span>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  A good advisor can add value that exceeds their fee. Here&apos;s
                  what to look for:
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 font-semibold">
                          Service
                        </th>
                        <th className="text-center py-2 font-semibold">
                          Potential Value
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {ADVISOR_VALUE_ITEMS.map((item, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2">
                            <div className="font-medium">{item.service}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </td>
                          <td className="py-2 text-center">
                            <Badge variant="outline" className="font-mono">
                              {item.potentialValue}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg">
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>Key insight:</strong> If you&apos;re disciplined, have a
                    simple situation, and are willing to learn, you may not need
                    to pay for advice. But if you&apos;d panic sell in a crash or
                    have complex taxes, an advisor can pay for themselves.
                  </p>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
};

const FeeTransparencySection: React.FC = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-blue-600" />
          Fee Transparency: Know What You&apos;re Paying
        </CardTitle>
        <CardDescription>
          Understanding Form ADV and how to get fee disclosure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form ADV Explanation */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-muted-foreground" />
            What is Form ADV?
          </h4>
          <p className="text-sm text-muted-foreground">
            Form ADV is the uniform form used by investment advisers to register
            with the SEC and state securities authorities. Part 2A (the
            &ldquo;Brochure&rdquo;) contains crucial information about services, fees, and
            conflicts of interest.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-1">Form ADV Part 2A</div>
              <p className="text-xs text-muted-foreground">
                The &ldquo;firm brochure&rdquo; - describes services, fees, disciplinary
                history, and conflicts of interest
              </p>
            </div>
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="font-medium text-sm mb-1">Form ADV Part 2B</div>
              <p className="text-xs text-muted-foreground">
                The &ldquo;brochure supplement&rdquo; - info about specific advisers who
                will work with you
              </p>
            </div>
          </div>
        </div>

        {/* Questions to Ask */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            Questions to Ask Your Advisor
          </h4>
          <div className="space-y-2">
            {FORM_ADV_QUESTIONS.map((question, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded-lg transition-colors"
              >
                <Badge variant="outline" className="shrink-0 mt-0.5">
                  {idx + 1}
                </Badge>
                <p className="text-sm">{question}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Red Flags */}
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-4">
          <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Red Flags to Watch For
          </h4>
          <ul className="text-sm text-red-800 dark:text-red-200 space-y-1 list-disc list-inside">
            <li>Unwillingness to discuss or disclose fees</li>
            <li>Fees hidden in fund expense ratios or trading costs</li>
            <li>Commission-based products (12b-1 fees, load funds)</li>
            <li>Not a fiduciary (only &ldquo;suitability&rdquo; standard)</li>
            <li>Pressure to make quick decisions</li>
            <li>Proprietary products with higher fees</li>
          </ul>
        </div>

        {/* Green Flags */}
        <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
          <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Green Flags
          </h4>
          <ul className="text-sm text-green-800 dark:text-green-200 space-y-1 list-disc list-inside">
            <li>Fee-only compensation (no commissions)</li>
            <li>Fiduciary duty to act in your best interest</li>
            <li>Transparent, all-in fee disclosure</li>
            <li>Uses low-cost index funds or ETFs</li>
            <li>CFP, CFA, or other reputable credentials</li>
            <li>Clear Form ADV provided without asking</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export interface FeeAnalyzerProps {
  defaultPortfolioValue?: number;
  defaultAnnualContribution?: number;
  defaultYearsToRetirement?: number;
}

export const FeeAnalyzer: React.FC<FeeAnalyzerProps> = ({
  defaultPortfolioValue = 250000,
  defaultAnnualContribution = 20000,
  defaultYearsToRetirement = 25,
}) => {
  const [inputs, setInputs] = useState<FeeInputs>({
    expenseRatio: 0.5,
    advisoryFee: 1.0,
    planFees401k: 0.3,
    tradingCommissions: 0,
    portfolioValue: defaultPortfolioValue,
    annualContribution: defaultAnnualContribution,
    yearsToRetirement: defaultYearsToRetirement,
    expectedReturn: 7,
  });

  const handleInputChange = useCallback(
    (field: keyof FeeInputs, value: number) => {
      setInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const totalFees =
    inputs.expenseRatio + inputs.advisoryFee + inputs.planFees401k;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl sm:text-3xl font-bold flex items-center justify-center gap-3">
          <TrendingDown className="h-7 w-7 text-red-600" />
          Investment Fee Analyzer
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          The silent killer of wealth: fees compound against you. See the true
          cost of what you&apos;re paying and how to keep more of your money.
        </p>
      </div>

      {/* Quick Stats Banner */}
      {totalFees > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Total Fee Drag</div>
            <div className="text-xl font-bold text-red-600">
              {formatPercent(totalFees)}
            </div>
          </div>
          <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Annual Cost</div>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency((inputs.portfolioValue * totalFees) / 100)}
            </div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">
              Monthly Cost
            </div>
            <div className="text-xl font-bold text-yellow-600">
              {formatCurrency((inputs.portfolioValue * totalFees) / 100 / 12)}
            </div>
          </div>
          <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-3 text-center">
            <div className="text-xs text-muted-foreground">Daily Cost</div>
            <div className="text-xl font-bold text-purple-600">
              {formatCurrency((inputs.portfolioValue * totalFees) / 100 / 365)}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="calculator">Calculator</TabsTrigger>
          <TabsTrigger value="401k">401(k) Trap</TabsTrigger>
          <TabsTrigger value="advisor">Advisor Fees</TabsTrigger>
          <TabsTrigger value="transparency">Transparency</TabsTrigger>
        </TabsList>

        <TabsContent value="calculator" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FeeInputSection
              inputs={inputs}
              onInputChange={handleInputChange}
            />
            <LifetimeCostVisualizer inputs={inputs} />
          </div>
          <FeeComparisonTable />
        </TabsContent>

        <TabsContent value="401k" className="mt-6">
          <K401TrapSection inputs={inputs} />
        </TabsContent>

        <TabsContent value="advisor" className="mt-6">
          <AdvisorFeeAnalysis inputs={inputs} />
        </TabsContent>

        <TabsContent value="transparency" className="mt-6">
          <FeeTransparencySection />
        </TabsContent>
      </Tabs>

      {/* Bottom CTA */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 dark:from-blue-950/20 dark:to-green-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-6 text-center">
        <h3 className="font-bold text-lg mb-2">The Bottom Line</h3>
        <p className="text-sm text-muted-foreground max-w-2xl mx-auto mb-4">
          Every 0.1% in fees you save compounds over decades. A 1% reduction in
          fees can add <strong>years</strong> to your retirement or{" "}
          <strong>hundreds of thousands</strong> to your nest egg. Know what
          you&apos;re paying. Question every fee. Keep more of your money.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="secondary">Low-cost index funds</Badge>
          <Badge variant="secondary">Fee-only advisors</Badge>
          <Badge variant="secondary">401(k) rollovers</Badge>
          <Badge variant="secondary">DIY investing</Badge>
        </div>
      </div>
    </div>
  );
};

export default FeeAnalyzer;
