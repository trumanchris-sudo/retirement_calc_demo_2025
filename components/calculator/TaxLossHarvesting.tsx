"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  TrendingDown,
  Calendar,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  PiggyBank,
  Info,
  Lightbulb,
  Shield,
  Building2,
  Scale,
  Clock,
  Ban,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

interface HarvestOpportunity {
  id: string;
  asset: string;
  currentLoss: number;
  purchaseDate: Date;
  isShortTerm: boolean;
}

interface DecemberChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
}

interface TaxLossHarvestingProps {
  portfolioValue?: number;
  expectedVolatility?: number; // As decimal, e.g., 0.15 for 15%
  taxBracket?: number; // As decimal, e.g., 0.24 for 24%
  capitalGains?: number; // Current year realized gains
}

// ============================================================================
// Constants
// ============================================================================

const ORDINARY_INCOME_DEDUCTION_LIMIT = 3000;

const DEFAULT_CHECKLIST: Omit<DecemberChecklistItem, "completed">[] = [
  {
    id: "review-losses",
    label: "Review unrealized losses in taxable accounts",
    description:
      "Check each position in your brokerage account for losses greater than $100",
  },
  {
    id: "calculate-gains",
    label: "Calculate total realized gains for the year",
    description:
      "Add up all capital gains distributions and sales from mutual funds, ETFs, and stocks",
  },
  {
    id: "check-wash-sale",
    label: "Check 30-day wash sale windows",
    description:
      "Ensure you haven't bought substantially identical securities in the last 30 days",
  },
  {
    id: "identify-replacements",
    label: "Identify replacement investments",
    description:
      "Find similar (but not substantially identical) funds to maintain market exposure",
  },
  {
    id: "review-401k",
    label: "Review 401(k)/IRA for rebalancing opportunities",
    description:
      "Use tax-advantaged accounts to adjust overall allocation while harvesting in taxable",
  },
  {
    id: "document-trades",
    label: "Document all trades and reasoning",
    description: "Keep records for tax filing and to track cost basis changes",
  },
  {
    id: "set-calendar",
    label: "Set calendar reminder for 31 days post-sale",
    description: "Mark when you can safely repurchase the original investment",
  },
  {
    id: "consult-advisor",
    label: "Consider consulting a tax advisor for large harvests",
    description:
      "Harvests over $10,000 may benefit from professional guidance on timing and strategy",
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

/**
 * Estimate annual tax loss harvesting opportunity based on portfolio volatility
 * This uses a simplified model based on expected drawdown frequency
 */
const estimateHarvestOpportunity = (
  portfolioValue: number,
  volatility: number
): { lowEstimate: number; midEstimate: number; highEstimate: number } => {
  // In a typical year with normal volatility, 20-40% of portfolio may experience
  // temporary losses at some point. Higher volatility increases opportunities.
  const baseOpportunityRate = 0.15; // 15% of portfolio typically harvestable
  const volatilityMultiplier = volatility / 0.15; // Normalized to 15% baseline

  const adjustedRate = baseOpportunityRate * volatilityMultiplier;

  // Assume average loss when harvesting is 5-15% of the harvestable portion
  const lowLossRate = 0.05;
  const midLossRate = 0.08;
  const highLossRate = 0.12;

  const harvestableAmount = portfolioValue * Math.min(adjustedRate, 0.5);

  return {
    lowEstimate: harvestableAmount * lowLossRate,
    midEstimate: harvestableAmount * midLossRate,
    highEstimate: harvestableAmount * highLossRate,
  };
};

// ============================================================================
// Sub-Components
// ============================================================================

/**
 * Visual explainer showing how tax loss harvesting works
 */
function ConceptExplainer() {
  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-xl">How Tax Loss Harvesting Works</CardTitle>
        </div>
        <CardDescription>
          Turn investment losses into tax savings without changing your strategy
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Visual Flow */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-3">
              <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <h4 className="font-semibold text-sm mb-2">1. Spot a Loss</h4>
            <p className="text-xs text-muted-foreground">
              Investment drops below what you paid. You have an "unrealized loss."
            </p>
            <div className="mt-3 p-2 bg-white dark:bg-neutral-800 rounded text-xs">
              <span className="text-muted-foreground">Bought at:</span>{" "}
              <span className="font-mono">$10,000</span>
              <br />
              <span className="text-muted-foreground">Now worth:</span>{" "}
              <span className="font-mono text-red-600">$8,500</span>
              <br />
              <span className="text-muted-foreground">Loss:</span>{" "}
              <span className="font-mono text-red-600">-$1,500</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="hidden md:flex items-center justify-center">
            <ArrowRight className="h-8 w-8 text-gray-400" />
          </div>
          <div className="md:hidden flex justify-center">
            <ArrowDown className="h-8 w-8 text-gray-400" />
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center text-center p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800 md:col-start-1 md:row-start-1 md:col-span-1">
            {/* This is a visual placeholder - the actual step 2 follows */}
          </div>
        </div>

        {/* Full 3-step process */}
        <div className="grid grid-cols-1 gap-4">
          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              1
            </div>
            <div>
              <h4 className="font-semibold">Sell the losing investment</h4>
              <p className="text-sm text-muted-foreground mt-1">
                This "realizes" the loss, making it usable on your taxes. You
                haven't actually lost money - you've just converted paper losses
                into tax benefits.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              2
            </div>
            <div>
              <h4 className="font-semibold">Buy a similar (but not identical) investment</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Immediately purchase a comparable investment to maintain your
                market exposure. Sold S&P 500 ETF? Buy a total market ETF instead.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              3
            </div>
            <div>
              <h4 className="font-semibold">Use the loss on your taxes</h4>
              <p className="text-sm text-muted-foreground mt-1">
                Offset capital gains dollar-for-dollar. If you have excess losses,
                deduct up to $3,000 from ordinary income. Remaining losses carry
                forward forever.
              </p>
            </div>
          </div>
        </div>

        {/* Tax Benefit Visualization */}
        <div className="mt-6 p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-3">
            <DollarSign className="h-5 w-5" />
            The Tax Benefit
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium mb-2">Offset Capital Gains</p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  $5,000 gain + $5,000 loss = <span className="text-green-600 font-semibold">$0 taxable</span>
                </p>
                <p className="text-xs">
                  At 15% cap gains rate = <span className="text-green-600">$750 saved</span>
                </p>
              </div>
            </div>
            <div>
              <p className="font-medium mb-2">Offset Ordinary Income</p>
              <div className="space-y-1 text-muted-foreground">
                <p>
                  Up to $3,000/year against salary/wages
                </p>
                <p className="text-xs">
                  At 24% tax bracket = <span className="text-green-600">$720 saved</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Wash Sale Rule explanation with interactive calendar visualization
 */
function WashSaleRule() {
  const [saleDate, setSaleDate] = useState<Date>(new Date());

  // Calculate the 61-day wash sale window (30 days before + sale day + 30 days after)
  const windowStart = new Date(saleDate);
  windowStart.setDate(windowStart.getDate() - 30);

  const windowEnd = new Date(saleDate);
  windowEnd.setDate(windowEnd.getDate() + 30);

  const safeDate = new Date(saleDate);
  safeDate.setDate(safeDate.getDate() + 31);

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-600" />
          <CardTitle className="text-xl">The Wash Sale Rule</CardTitle>
        </div>
        <CardDescription>
          The IRS disallows losses if you buy back "substantially identical"
          securities within 30 days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Simple Explanation */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>30-Day Window</AlertTitle>
          <AlertDescription>
            If you sell at a loss and buy the same (or substantially identical)
            investment within 30 days before OR after the sale, the IRS
            disallows the loss. It's a 61-day total window.
          </AlertDescription>
        </Alert>

        {/* Visual Timeline */}
        <div className="space-y-4">
          <h4 className="font-semibold">The Wash Sale Window</h4>
          <div className="relative">
            {/* Timeline bar */}
            <div className="h-12 bg-gray-100 dark:bg-neutral-800 rounded-lg overflow-hidden flex">
              <div className="w-[30%] bg-red-200 dark:bg-red-900/50 flex items-center justify-center border-r border-red-300">
                <span className="text-xs font-medium text-red-800 dark:text-red-200">
                  30 days before
                </span>
              </div>
              <div className="w-[5%] bg-red-400 dark:bg-red-700 flex items-center justify-center">
                <span className="text-xs font-bold text-white">SELL</span>
              </div>
              <div className="w-[30%] bg-red-200 dark:bg-red-900/50 flex items-center justify-center border-l border-red-300">
                <span className="text-xs font-medium text-red-800 dark:text-red-200">
                  30 days after
                </span>
              </div>
              <div className="flex-1 bg-green-200 dark:bg-green-900/50 flex items-center justify-center">
                <span className="text-xs font-medium text-green-800 dark:text-green-200">
                  Safe to buy back
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-red-200 dark:bg-red-900/50 rounded" />
                <span>Cannot buy identical security</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-green-200 dark:bg-green-900/50 rounded" />
                <span>Safe to repurchase</span>
              </div>
            </div>
          </div>
        </div>

        {/* Date Calculator */}
        <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg space-y-4">
          <h4 className="font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Wash Sale Date Calculator
          </h4>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Sale Date:
              </label>
              <input
                type="date"
                value={saleDate.toISOString().split("T")[0]}
                onChange={(e) => setSaleDate(new Date(e.target.value))}
                className="px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-sm"
              />
            </div>
            <ArrowRight className="h-5 w-5 text-gray-400 hidden sm:block" />
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Ban className="h-4 w-4 text-red-500" />
                <span className="text-sm">
                  <span className="font-medium">No-buy window:</span>{" "}
                  {formatDate(windowStart)} - {formatDate(windowEnd)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">
                  <span className="font-medium">Safe to repurchase:</span>{" "}
                  {formatDate(safeDate)} or later
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* What Triggers Wash Sale */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
            <h5 className="font-semibold text-red-800 dark:text-red-200 flex items-center gap-2 mb-3">
              <X className="h-4 w-4" />
              Triggers Wash Sale
            </h5>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Buying the same stock/fund back</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Buying in IRA/401(k) while selling in taxable</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Spouse buying the same security</span>
              </li>
              <li className="flex items-start gap-2">
                <X className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <span>Options on the same stock</span>
              </li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
            <h5 className="font-semibold text-green-800 dark:text-green-200 flex items-center gap-2 mb-3">
              <Check className="h-4 w-4" />
              Safe to Do
            </h5>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Buy a different ETF tracking similar index</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Wait 31+ days then repurchase</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Buy a mutual fund vs. ETF (different funds)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                <span>Buy individual stocks instead of index fund</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Annual opportunity estimator based on portfolio volatility
 */
function OpportunityEstimator({
  portfolioValue = 500000,
  expectedVolatility = 0.15,
  taxBracket = 0.24,
  capitalGains = 0,
}: {
  portfolioValue?: number;
  expectedVolatility?: number;
  taxBracket?: number;
  capitalGains?: number;
}) {
  const [customPortfolio, setCustomPortfolio] = useState(portfolioValue);
  const [customVolatility, setCustomVolatility] = useState(expectedVolatility);
  const [customTaxBracket, setCustomTaxBracket] = useState(taxBracket);
  const [customGains, setCustomGains] = useState(capitalGains);

  const estimates = useMemo(
    () => estimateHarvestOpportunity(customPortfolio, customVolatility),
    [customPortfolio, customVolatility]
  );

  const potentialSavings = useMemo(() => {
    const harvestableForGains = Math.min(estimates.midEstimate, customGains);
    const excessLosses = Math.max(0, estimates.midEstimate - customGains);
    const ordinaryIncomeOffset = Math.min(excessLosses, ORDINARY_INCOME_DEDUCTION_LIMIT);
    const carryForward = Math.max(0, excessLosses - ORDINARY_INCOME_DEDUCTION_LIMIT);

    // Long-term capital gains rate (simplified)
    const ltcgRate = customTaxBracket <= 0.12 ? 0 : customTaxBracket <= 0.35 ? 0.15 : 0.20;

    const savingsFromGains = harvestableForGains * ltcgRate;
    const savingsFromOrdinary = ordinaryIncomeOffset * customTaxBracket;

    return {
      harvestableForGains,
      excessLosses,
      ordinaryIncomeOffset,
      carryForward,
      savingsFromGains,
      savingsFromOrdinary,
      totalSavings: savingsFromGains + savingsFromOrdinary,
    };
  }, [estimates, customGains, customTaxBracket]);

  return (
    <Card className="border-2 border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <PiggyBank className="h-6 w-6 text-green-600" />
          <CardTitle className="text-xl">Annual Harvest Opportunity</CardTitle>
        </div>
        <CardDescription>
          Estimate your potential tax savings based on portfolio characteristics
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Taxable Portfolio Value
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                value={customPortfolio}
                onChange={(e) => setCustomPortfolio(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-sm"
                step={10000}
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Expected Volatility
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Stock-heavy portfolios: 15-20%. Balanced: 10-15%. Conservative: 5-10%.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                value={customVolatility * 100}
                onChange={(e) => setCustomVolatility(Number(e.target.value) / 100)}
                className="flex-1"
                min={5}
                max={30}
                step={1}
              />
              <span className="w-16 text-right font-mono text-sm">
                {formatPercent(customVolatility)}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Marginal Tax Bracket
            </label>
            <select
              value={customTaxBracket}
              onChange={(e) => setCustomTaxBracket(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-sm"
            >
              <option value={0.10}>10%</option>
              <option value={0.12}>12%</option>
              <option value={0.22}>22%</option>
              <option value={0.24}>24%</option>
              <option value={0.32}>32%</option>
              <option value={0.35}>35%</option>
              <option value={0.37}>37%</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Realized Capital Gains This Year
            </label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <input
                type="number"
                value={customGains}
                onChange={(e) => setCustomGains(Number(e.target.value))}
                className="flex-1 px-3 py-2 border rounded-md bg-white dark:bg-neutral-900 text-sm"
                step={1000}
                min={0}
              />
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">Low Estimate</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {formatCurrency(estimates.lowEstimate)}
            </p>
          </div>
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-lg text-center border-2 border-green-300 dark:border-green-700">
            <p className="text-sm text-muted-foreground mb-1">Mid Estimate</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(estimates.midEstimate)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Potential harvestable losses
            </p>
          </div>
          <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-center">
            <p className="text-sm text-muted-foreground mb-1">High Estimate</p>
            <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">
              {formatCurrency(estimates.highEstimate)}
            </p>
          </div>
        </div>

        {/* Tax Savings Breakdown */}
        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
          <h4 className="font-semibold text-green-800 dark:text-green-200 mb-3">
            Potential Tax Savings Breakdown
          </h4>
          <div className="space-y-3 text-sm">
            {potentialSavings.harvestableForGains > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Offset {formatCurrency(potentialSavings.harvestableForGains)} in capital gains
                </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(potentialSavings.savingsFromGains)} saved
                </span>
              </div>
            )}
            {potentialSavings.ordinaryIncomeOffset > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Offset {formatCurrency(potentialSavings.ordinaryIncomeOffset)} ordinary income
                </span>
                <span className="font-semibold text-green-600">
                  {formatCurrency(potentialSavings.savingsFromOrdinary)} saved
                </span>
              </div>
            )}
            {potentialSavings.carryForward > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Carry forward to future years
                </span>
                <span className="font-medium">
                  {formatCurrency(potentialSavings.carryForward)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-green-300 dark:border-green-700 flex justify-between">
              <span className="font-semibold">Estimated Annual Tax Savings</span>
              <span className="font-bold text-green-600 text-lg">
                {formatCurrency(potentialSavings.totalSavings)}
              </span>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          These are rough estimates based on historical market patterns. Actual
          opportunities depend on specific holdings, timing, and market conditions.
        </p>
      </CardContent>
    </Card>
  );
}

/**
 * December harvest checklist with progress tracking
 */
function HarvestChecklist() {
  const [checklist, setChecklist] = useState<DecemberChecklistItem[]>(() =>
    DEFAULT_CHECKLIST.map((item) => ({ ...item, completed: false }))
  );

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  const toggleItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-xl">December Harvest Checklist</CardTitle>
          </div>
          <Badge
            variant={completedCount === checklist.length ? "default" : "secondary"}
            className={
              completedCount === checklist.length
                ? "bg-green-600"
                : ""
            }
          >
            {completedCount}/{checklist.length} Complete
          </Badge>
        </div>
        <CardDescription>
          Year-end tax loss harvesting tasks to maximize your savings
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{Math.round(progressPercent)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        {/* Checklist Items */}
        <div className="space-y-2">
          {checklist.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                item.completed
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                  : "bg-white dark:bg-neutral-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-neutral-700"
              )}
              onClick={() => toggleItem(item.id)}
            >
              <Checkbox
                checked={item.completed}
                onCheckedChange={() => toggleItem(item.id)}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium text-sm",
                    item.completed && "line-through text-muted-foreground"
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {completedCount === checklist.length && (
          <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800 dark:text-green-200">
              All tasks complete!
            </AlertTitle>
            <AlertDescription className="text-green-700 dark:text-green-300">
              You've completed your year-end tax loss harvesting review. Don't
              forget to document everything for tax time.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Substantially Identical Rule explanation
 */
function SubstantiallyIdenticalRule() {
  const examples = [
    {
      sell: "Vanguard S&P 500 ETF (VOO)",
      buy: "iShares Core S&P 500 ETF (IVV)",
      safe: false,
      reason: "Both track the exact same index",
    },
    {
      sell: "Vanguard S&P 500 ETF (VOO)",
      buy: "Vanguard Total Stock Market ETF (VTI)",
      safe: true,
      reason: "Different indexes with different holdings",
    },
    {
      sell: "AAPL (Apple Stock)",
      buy: "Tech sector ETF (XLK)",
      safe: true,
      reason: "Individual stock vs. diversified fund",
    },
    {
      sell: "AAPL (Apple Stock)",
      buy: "AAPL (same stock)",
      safe: false,
      reason: "Identical security",
    },
    {
      sell: "Fidelity 500 Index Fund (FXAIX)",
      buy: "Schwab S&P 500 Index Fund (SWPPX)",
      safe: false,
      reason: "Both track S&P 500, substantially identical",
    },
    {
      sell: "Vanguard Growth ETF (VUG)",
      buy: "Vanguard Value ETF (VTV)",
      safe: true,
      reason: "Different investment strategies/holdings",
    },
  ];

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-indigo-600" />
          <CardTitle className="text-xl">Substantially Identical Securities</CardTitle>
        </div>
        <CardDescription>
          Understanding what you can and cannot buy as a replacement
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Concept */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>The Gray Area</AlertTitle>
          <AlertDescription>
            The IRS doesn't provide a precise definition of "substantially
            identical." Generally, two securities tracking the same index are
            considered substantially identical, while different indexes or
            strategies are not.
          </AlertDescription>
        </Alert>

        {/* Examples Table */}
        <div className="space-y-3">
          <h4 className="font-semibold">Common Swap Examples</h4>
          <div className="space-y-2">
            {examples.map((example, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 rounded-lg border",
                  example.safe
                    ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                    : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800"
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  {example.safe ? (
                    <Badge className="bg-green-600">Safe Swap</Badge>
                  ) : (
                    <Badge variant="destructive">Wash Sale Risk</Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Sell: </span>
                    <span className="font-medium">{example.sell}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Buy: </span>
                    <span className="font-medium">{example.buy}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {example.reason}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Safe Swap Strategies */}
        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
          <h4 className="font-semibold text-indigo-800 dark:text-indigo-200 mb-3">
            Safe Swap Strategies
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>S&P 500 → Total Market:</strong> VOO/SPY → VTI/ITOT
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Total International → Developed Markets:</strong> VXUS → VEA + VWO
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Bond Index → Different Duration:</strong> BND → BSV or BLV
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Individual Stock → Sector ETF:</strong> AAPL → XLK (tech sector)
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Integration with Asset Location strategy
 */
function AssetLocationIntegration() {
  return (
    <Card className="border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-br from-teal-50 to-white dark:from-teal-950/30 dark:to-neutral-900">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-teal-600" />
          <CardTitle className="text-xl">
            Coordinating with Your 401(k)/IRA
          </CardTitle>
        </div>
        <CardDescription>
          Use tax-advantaged accounts strategically while harvesting losses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* The Strategy */}
        <div className="p-4 bg-teal-100 dark:bg-teal-900/30 rounded-lg">
          <h4 className="font-semibold text-teal-800 dark:text-teal-200 mb-3 flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            The "Harvest & Rebalance" Strategy
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            When you sell a position in your taxable account to harvest losses,
            you can immediately buy that same position in your 401(k) or IRA
            without triggering a wash sale—as long as you don't buy it back in
            the taxable account for 31 days.
          </p>
          <div className="text-sm space-y-2">
            <p className="font-medium">This lets you:</p>
            <ul className="space-y-1 ml-4 text-muted-foreground">
              <li>• Harvest the tax loss in your taxable account</li>
              <li>• Maintain overall portfolio allocation via 401(k)/IRA</li>
              <li>• Avoid market timing risk during the 31-day window</li>
            </ul>
          </div>
        </div>

        {/* Visual Flow */}
        <div className="space-y-4">
          <h4 className="font-semibold">Step-by-Step</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Taxable Account */}
            <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Taxable Account
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <span>Sell S&P 500 ETF at a loss</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <span>Buy Total Stock Market ETF</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-xs font-bold">
                    4
                  </div>
                  <span>After 31 days: swap back if desired</span>
                </div>
              </div>
            </div>

            {/* Tax-Advantaged */}
            <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border-2 border-dashed border-teal-300 dark:border-teal-600">
              <h5 className="font-medium mb-2 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                401(k) / IRA
              </h5>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <span>Rebalance to maintain allocation</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  You can freely buy/sell the same funds here without affecting
                  the loss in your taxable account
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Critical Warning</AlertTitle>
          <AlertDescription>
            <strong>Never</strong> buy in your IRA/401(k) at the same time you
            sell in taxable if you want to claim the loss. The wash sale rule
            applies across ALL your accounts, including retirement accounts.
            The retirement account purchase "taints" the loss.
          </AlertDescription>
        </Alert>

        {/* Best Practices */}
        <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-lg border border-teal-200 dark:border-teal-800">
          <h4 className="font-semibold text-teal-800 dark:text-teal-200 mb-3">
            Best Practices
          </h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <span>
                Check 401(k) for recent purchases before harvesting in taxable
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <span>
                Turn off auto-invest/dividend reinvestment during harvest window
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <span>
                Coordinate with spouse's accounts too—wash sale applies there
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Check className="h-4 w-4 text-teal-500 flex-shrink-0 mt-0.5" />
              <span>
                Keep detailed records of all trades across accounts
              </span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function TaxLossHarvesting({
  portfolioValue = 500000,
  expectedVolatility = 0.15,
  taxBracket = 0.24,
  capitalGains = 0,
}: TaxLossHarvestingProps) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Tax Loss Harvesting</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Turn investment losses into tax savings. Sell investments at a loss
          to offset gains—up to $3,000 of excess losses can offset ordinary
          income each year, and unused losses carry forward forever.
        </p>
      </div>

      {/* Quick Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">$3,000</p>
          <p className="text-xs text-muted-foreground">
            Annual ordinary income offset
          </p>
        </div>
        <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">100%</p>
          <p className="text-xs text-muted-foreground">
            Capital gains offset
          </p>
        </div>
        <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-purple-600">Forever</p>
          <p className="text-xs text-muted-foreground">
            Loss carryforward
          </p>
        </div>
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 rounded-lg text-center">
          <p className="text-2xl font-bold text-amber-600">30 Days</p>
          <p className="text-xs text-muted-foreground">
            Wash sale window
          </p>
        </div>
      </div>

      {/* Main Content Sections */}
      <Accordion type="single" collapsible className="space-y-4">
        <AccordionItem value="concept" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-blue-600" />
              How Tax Loss Harvesting Works
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <ConceptExplainer />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="wash-sale" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              The Wash Sale Rule (30-Day Rule)
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <WashSaleRule />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="opportunity" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-green-600" />
              Annual Opportunity Estimator
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <OpportunityEstimator
              portfolioValue={portfolioValue}
              expectedVolatility={expectedVolatility}
              taxBracket={taxBracket}
              capitalGains={capitalGains}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="checklist" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-600" />
              December Harvest Checklist
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <HarvestChecklist />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="identical" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-indigo-600" />
              Substantially Identical Securities
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <SubstantiallyIdenticalRule />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="asset-location" className="border rounded-lg px-4">
          <AccordionTrigger className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-600" />
              Integration with 401(k)/IRA
            </span>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <AssetLocationIntegration />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Disclaimer */}
      <div className="p-4 bg-gray-100 dark:bg-neutral-800 rounded-lg text-center">
        <p className="text-xs text-muted-foreground">
          This information is educational only and not tax advice. Tax laws are
          complex and change frequently. Consult a qualified tax professional
          before making decisions based on this information. Individual
          circumstances vary significantly.
        </p>
      </div>
    </div>
  );
}
