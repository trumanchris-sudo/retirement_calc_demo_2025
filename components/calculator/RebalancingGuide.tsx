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
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RefreshCw,
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Shield,
  Wallet,
  Building,
  Sparkles,
  Calculator,
  AlertCircle,
  CheckCircle2,
  Info,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Clock,
  Zap,
  BarChart3,
} from "lucide-react";

// ==================== Types ====================

interface AllocationInput {
  stocks: number;
  bonds: number;
  other?: number;
}

interface RebalanceResult {
  asset: string;
  current: number;
  target: number;
  difference: number;
  action: "buy" | "sell" | "hold";
  amount: number;
}

// ==================== Helper Components ====================

/**
 * Visual allocation bar showing current vs target
 */
function AllocationBar({
  label,
  current,
  target,
  color,
}: {
  label: string;
  current: number;
  target: number;
  color: string;
}) {
  const diff = current - target;
  const isOff = Math.abs(diff) >= 5;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {current}% / {target}% target
          {isOff && (
            <Badge
              variant="outline"
              className={`ml-2 ${
                diff > 0
                  ? "text-amber-600 border-amber-300"
                  : "text-blue-600 border-blue-300"
              }`}
            >
              {diff > 0 ? "+" : ""}
              {diff}%
            </Badge>
          )}
        </span>
      </div>
      <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        {/* Target marker */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-gray-800 dark:bg-white z-10"
          style={{ left: `${target}%` }}
        />
        {/* Current allocation */}
        <div
          className={`h-full ${color} transition-all duration-500`}
          style={{ width: `${current}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Expandable section component
 */
function ExpandableSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
  badge,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  badge?: string;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <span className="font-semibold">{title}</span>
          {badge && (
            <Badge variant="secondary" className="text-xs">
              {badge}
            </Badge>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>
      {expanded && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

/**
 * Method card for rebalancing approaches
 */
function MethodCard({
  title,
  description,
  icon: Icon,
  pros,
  cons,
  recommended,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  pros: string[];
  cons: string[];
  recommended?: boolean;
}) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      className={`rounded-lg border p-4 ${
        recommended
          ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
          : "bg-white dark:bg-gray-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            recommended ? "bg-emerald-100 dark:bg-emerald-900/50" : "bg-gray-100 dark:bg-gray-800"
          }`}
        >
          <Icon
            className={`h-5 w-5 ${
              recommended ? "text-emerald-600" : "text-muted-foreground"
            }`}
          />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{title}</h4>
            {recommended && (
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                Recommended
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>

          {showDetails && (
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="font-medium text-green-700 dark:text-green-400 mb-1">
                  Pros
                </div>
                <ul className="space-y-1">
                  {pros.map((pro, idx) => (
                    <li key={idx} className="flex items-start gap-1 text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-600 mt-0.5 flex-shrink-0" />
                      {pro}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-medium text-red-700 dark:text-red-400 mb-1">
                  Cons
                </div>
                <ul className="space-y-1">
                  {cons.map((con, idx) => (
                    <li key={idx} className="flex items-start gap-1 text-muted-foreground">
                      <AlertCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                      {con}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-xs text-primary mt-2 flex items-center gap-1"
          >
            {showDetails ? (
              <>
                <ChevronUp className="h-3 w-3" /> Less details
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" /> More details
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Automation option card
 */
function AutomationCard({
  title,
  description,
  features,
  icon: Icon,
}: {
  title: string;
  description: string;
  features: string[];
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-5 w-5 text-primary" />
        <h4 className="font-semibold">{title}</h4>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <ul className="space-y-1">
        {features.map((feature, idx) => (
          <li key={idx} className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ==================== Rebalancing Calculator ====================

function RebalancingCalculator() {
  const [portfolioValue, setPortfolioValue] = useState<string>("100000");
  const [currentStocks, setCurrentStocks] = useState<string>("90");
  const [currentBonds, setCurrentBonds] = useState<string>("10");
  const [targetStocks, setTargetStocks] = useState<string>("80");
  const [targetBonds, setTargetBonds] = useState<string>("20");

  const results = useMemo((): RebalanceResult[] => {
    const portfolio = parseFloat(portfolioValue.replace(/,/g, "")) || 0;
    const currStocks = parseFloat(currentStocks) || 0;
    const currBonds = parseFloat(currentBonds) || 0;
    const targStocks = parseFloat(targetStocks) || 0;
    const targBonds = parseFloat(targetBonds) || 0;

    const currentStockValue = (portfolio * currStocks) / 100;
    const currentBondValue = (portfolio * currBonds) / 100;
    const targetStockValue = (portfolio * targStocks) / 100;
    const targetBondValue = (portfolio * targBonds) / 100;

    const stockDiff = targStocks - currStocks;
    const bondDiff = targBonds - currBonds;
    const stockAmount = targetStockValue - currentStockValue;
    const bondAmount = targetBondValue - currentBondValue;

    return [
      {
        asset: "Stocks",
        current: currStocks,
        target: targStocks,
        difference: stockDiff,
        action: stockDiff > 0 ? "buy" : stockDiff < 0 ? "sell" : "hold",
        amount: Math.abs(stockAmount),
      },
      {
        asset: "Bonds",
        current: currBonds,
        target: targBonds,
        difference: bondDiff,
        action: bondDiff > 0 ? "buy" : bondDiff < 0 ? "sell" : "hold",
        amount: Math.abs(bondAmount),
      },
    ];
  }, [portfolioValue, currentStocks, currentBonds, targetStocks, targetBonds]);

  const formatCurrency = (value: number) =>
    value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Portfolio Value */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Total Portfolio Value ($)</label>
          <input
            type="text"
            value={portfolioValue}
            onChange={(e) => setPortfolioValue(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background"
            placeholder="100,000"
          />
        </div>

        {/* Empty space for alignment */}
        <div />

        {/* Current Allocation */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Current Allocation</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-16">Stocks:</label>
              <input
                type="number"
                value={currentStocks}
                onChange={(e) => setCurrentStocks(e.target.value)}
                className="w-20 px-2 py-1 rounded-md border bg-background text-sm"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-16">Bonds:</label>
              <input
                type="number"
                value={currentBonds}
                onChange={(e) => setCurrentBonds(e.target.value)}
                className="w-20 px-2 py-1 rounded-md border bg-background text-sm"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>

        {/* Target Allocation */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Target Allocation</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-16">Stocks:</label>
              <input
                type="number"
                value={targetStocks}
                onChange={(e) => setTargetStocks(e.target.value)}
                className="w-20 px-2 py-1 rounded-md border bg-background text-sm"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-muted-foreground w-16">Bonds:</label>
              <input
                type="number"
                value={targetBonds}
                onChange={(e) => setTargetBonds(e.target.value)}
                className="w-20 px-2 py-1 rounded-md border bg-background text-sm"
                min="0"
                max="100"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border bg-gray-50 dark:bg-gray-900/50 p-4">
        <h4 className="font-semibold mb-3 flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Rebalancing Actions
        </h4>
        <div className="space-y-3">
          {results.map((result) => (
            <div
              key={result.asset}
              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-800"
            >
              <div>
                <span className="font-medium">{result.asset}</span>
                <span className="text-sm text-muted-foreground ml-2">
                  ({result.current}% &rarr; {result.target}%)
                </span>
              </div>
              <div className="flex items-center gap-2">
                {result.action === "buy" && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    Buy {formatCurrency(result.amount)}
                  </Badge>
                )}
                {result.action === "sell" && (
                  <Badge className="bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    Sell {formatCurrency(result.amount)}
                  </Badge>
                )}
                {result.action === "hold" && (
                  <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                    No change needed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 5/25 Rule Explainer ====================

function FiveTwentyFiveRuleExplainer() {
  const [targetBonds, setTargetBonds] = useState<string>("20");
  const target = parseFloat(targetBonds) || 20;

  const thresholds = useMemo(() => {
    // 5% rule: If overall allocation is 5 percentage points off
    const overallLower = Math.max(0, target - 5);
    const overallUpper = Math.min(100, target + 5);

    // 25% rule: If asset class deviates by 25% of its target
    const relativeDeviation = target * 0.25;
    const relativeLower = Math.max(0, target - relativeDeviation);
    const relativeUpper = Math.min(100, target + relativeDeviation);

    return {
      overallLower,
      overallUpper,
      relativeLower,
      relativeUpper,
    };
  }, [target]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <label className="text-sm font-medium">Target Bond Allocation:</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={targetBonds}
            onChange={(e) => setTargetBonds(e.target.value)}
            className="w-20 px-2 py-1 rounded-md border bg-background text-sm"
            min="5"
            max="95"
          />
          <span className="text-sm text-muted-foreground">%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-5 w-5 text-blue-600" />
            <span className="font-semibold">5% Rule (Absolute)</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Rebalance when any asset class is 5 percentage points off target.
          </p>
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span>Rebalance trigger:</span>
              <span className="font-mono font-medium">
                Below {thresholds.overallLower}% or above {thresholds.overallUpper}%
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-4 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center gap-2 mb-2">
            <Scale className="h-5 w-5 text-purple-600" />
            <span className="font-semibold">25% Rule (Relative)</span>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Rebalance when any asset class deviates by 25% of its target.
          </p>
          <div className="text-sm">
            <div className="flex items-center justify-between">
              <span>Rebalance trigger:</span>
              <span className="font-mono font-medium">
                Below {thresholds.relativeLower.toFixed(0)}% or above{" "}
                {thresholds.relativeUpper.toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 border p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <strong>Example with {target}% bonds target:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>
                5% rule: Rebalance if bonds fall below {thresholds.overallLower}% or rise
                above {thresholds.overallUpper}%
              </li>
              <li>
                25% rule: Rebalance if bonds fall below {thresholds.relativeLower.toFixed(0)}%
                or rise above {thresholds.relativeUpper.toFixed(0)}%
              </li>
              <li>
                Use whichever threshold is breached first (OR, not AND)
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export const RebalancingGuide = React.memo(function RebalancingGuide() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5 text-blue-600" />
          Rebalancing Strategy Guide
        </CardTitle>
        <CardDescription>
          Keep your portfolio on track with systematic rebalancing. Maintain your
          target allocation and manage risk effectively.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="methods">Methods</TabsTrigger>
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="automation">Automation</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* What is Rebalancing */}
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Scale className="h-5 w-5 text-blue-600" />
                What is Rebalancing?
              </h3>

              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Rebalancing restores your portfolio to its target allocation after market
                  movements cause drift.
                </p>

                {/* Visual Example */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="rounded-lg bg-white dark:bg-gray-900 p-4 text-center">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Your Target
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-4 bg-blue-500 rounded" />
                      <span className="text-sm font-medium">80%</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="w-4 h-4 bg-emerald-500 rounded" />
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      80/20 Stocks/Bonds
                    </div>
                  </div>

                  <div className="rounded-lg bg-white dark:bg-gray-900 p-4 text-center border-2 border-amber-300">
                    <div className="text-sm font-medium text-amber-600 mb-2">
                      After Bull Run
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-[72px] h-4 bg-blue-500 rounded" />
                      <span className="text-sm font-medium">90%</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="w-2 h-4 bg-emerald-500 rounded" />
                      <span className="text-sm font-medium">10%</span>
                    </div>
                    <div className="text-xs text-amber-600 mt-2">
                      Drifted to 90/10
                    </div>
                  </div>

                  <div className="rounded-lg bg-white dark:bg-gray-900 p-4 text-center border-2 border-green-300">
                    <div className="text-sm font-medium text-green-600 mb-2">
                      After Rebalancing
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-16 h-4 bg-blue-500 rounded" />
                      <span className="text-sm font-medium">80%</span>
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-1">
                      <div className="w-4 h-4 bg-emerald-500 rounded" />
                      <span className="text-sm font-medium">20%</span>
                    </div>
                    <div className="text-xs text-green-600 mt-2">
                      Restored to 80/20
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Action:</span>
                  <Badge variant="outline" className="text-red-600 border-red-300">
                    Sell Stocks
                  </Badge>
                  <ArrowRight className="h-4 w-4" />
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    Buy Bonds
                  </Badge>
                </div>
              </div>
            </div>

            {/* Why Rebalance */}
            <ExpandableSection
              title="Why Rebalance?"
              icon={Shield}
              defaultExpanded={true}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold">Maintain Risk Level</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Without rebalancing, a portfolio naturally becomes riskier as stocks
                    outperform bonds over time. Stay aligned with your risk tolerance.
                  </p>
                </div>

                <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <span className="font-semibold">Buy Low, Sell High</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Rebalancing forces you to sell assets that have risen and buy those
                    that have fallen. It's automatic contrarian investing.
                  </p>
                </div>

                <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-5 w-5 text-purple-600" />
                    <span className="font-semibold">Prevent Drift</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Left unchecked, a 60/40 portfolio can drift to 80/20 or beyond,
                    exposing you to more risk than intended.
                  </p>
                </div>
              </div>
            </ExpandableSection>

            {/* The 5/25 Rule */}
            <ExpandableSection
              title="The 5/25 Rule"
              icon={Scale}
              badge="Popular Strategy"
            >
              <div className="mt-3 space-y-4">
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                        A Simple, Effective Rule
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Rebalance when <strong>5% of overall portfolio</strong> is off
                        target, OR when <strong>25% of any asset class</strong> is off.
                        This balances trading costs against portfolio drift.
                      </p>
                    </div>
                  </div>
                </div>

                <FiveTwentyFiveRuleExplainer />
              </div>
            </ExpandableSection>

            {/* Tax-Efficient Rebalancing */}
            <ExpandableSection
              title="Tax-Efficient Rebalancing"
              icon={DollarSign}
              badge="Save Money"
            >
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Building className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold">1. Rebalance in 401k/IRA First</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No tax impact! Trades within tax-advantaged accounts don't trigger
                      capital gains. Do as much rebalancing here as possible.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">2. Use New Contributions</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Direct new money to underweight asset classes. This rebalances
                      without selling anything.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="h-5 w-5 text-blue-600" />
                      <span className="font-semibold">3. Only Sell in Taxable if Necessary</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If you must sell in taxable, prioritize lots with losses or minimal
                      gains. Hold winners for long-term rates.
                    </p>
                  </div>

                  <div className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingDown className="h-5 w-5 text-red-600" />
                      <span className="font-semibold">4. Harvest Losses While Rebalancing</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If rebalancing involves selling losers, you can offset gains
                      elsewhere. Two birds, one stone.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                        Pro Tip: Tactical Account Rebalancing
                      </div>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        Consider holding different asset allocations in different account
                        types. Hold bonds in Traditional (ordinary income anyway), stocks
                        in Roth (tax-free growth). Rebalance across the total portfolio.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </ExpandableSection>
          </TabsContent>

          {/* Methods Tab */}
          <TabsContent value="methods" className="space-y-6 mt-6">
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4 mb-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                    Choose Your Approach
                  </div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    There's no single "best" method. The right choice depends on your tax
                    situation, portfolio size, and how hands-on you want to be.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <MethodCard
                title="Calendar Rebalancing"
                description="Rebalance on a fixed schedule: monthly, quarterly, or annually."
                icon={Calendar}
                pros={[
                  "Simple and predictable",
                  "Easy to remember",
                  "Removes emotional decision-making",
                ]}
                cons={[
                  "May trade when unnecessary",
                  "Can miss large drift between dates",
                  "May not be tax-optimal",
                ]}
              />

              <MethodCard
                title="Threshold Rebalancing"
                description="Rebalance when allocation drifts more than 5% from target."
                icon={Target}
                pros={[
                  "Only trades when needed",
                  "Responds to market moves",
                  "More tax-efficient",
                ]}
                cons={[
                  "Requires monitoring",
                  "May never trigger in calm markets",
                  "Could lead to frequent trading in volatile periods",
                ]}
                recommended
              />

              <MethodCard
                title="Tactical (Tax-Advantaged Only)"
                description="Only rebalance within 401k/IRA accounts to avoid any tax impact."
                icon={Shield}
                pros={[
                  "Zero tax impact",
                  "No wash sale concerns",
                  "Simple implementation",
                ]}
                cons={[
                  "May not fully rebalance",
                  "Depends on account sizes",
                  "Taxable portion may drift",
                ]}
              />

              <MethodCard
                title="Cash Flow Rebalancing"
                description="Direct new contributions and dividends to underweight assets."
                icon={TrendingUp}
                pros={[
                  "No selling required",
                  "Completely tax-free",
                  "Natural dollar-cost averaging",
                ]}
                cons={[
                  "Slow if contributions are small",
                  "May not keep up with drift",
                  "Requires consistent contributions",
                ]}
              />
            </div>

            {/* Frequency Comparison */}
            <div className="rounded-lg border p-6 mt-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Rebalancing Frequency Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 pr-4">Frequency</th>
                      <th className="text-left py-2 pr-4">Trading Costs</th>
                      <th className="text-left py-2 pr-4">Tax Impact</th>
                      <th className="text-left py-2 pr-4">Drift Control</th>
                      <th className="text-left py-2">Effort</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium">Monthly</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-red-600">High</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-red-600">High</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Excellent</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-red-600">High</Badge>
                      </td>
                    </tr>
                    <tr className="border-b">
                      <td className="py-2 pr-4 font-medium">Quarterly</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Good</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                      </td>
                    </tr>
                    <tr className="border-b bg-emerald-50/50 dark:bg-emerald-950/10">
                      <td className="py-2 pr-4 font-medium">
                        Annually
                        <Badge className="ml-2 bg-emerald-100 text-emerald-700 text-xs">
                          Sweet Spot
                        </Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Low</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Low</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-yellow-600">Good</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-green-600">Low</Badge>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 font-medium">5% Threshold</td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Variable</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                      </td>
                      <td className="py-2 pr-4">
                        <Badge variant="outline" className="text-green-600">Excellent</Badge>
                      </td>
                      <td className="py-2">
                        <Badge variant="outline" className="text-yellow-600">Medium</Badge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          {/* Calculator Tab */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Calculator className="h-5 w-5 text-primary" />
                Rebalancing Calculator
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Enter your current and target allocations to see exactly what to buy and
                sell.
              </p>
              <RebalancingCalculator />
            </div>

            {/* Tips */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                      Before You Trade
                    </div>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                      <li>Check for tax-loss harvesting opportunities</li>
                      <li>Consider using dividends for rebalancing</li>
                      <li>Review across all accounts, not just one</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                      Watch Out For
                    </div>
                    <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1 list-disc list-inside">
                      <li>Wash sale rules (30-day window)</li>
                      <li>Transaction fees eating into savings</li>
                      <li>Short-term capital gains if selling</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Automation Tab */}
          <TabsContent value="automation" className="space-y-6 mt-6">
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 mb-6">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                    Make Maintenance Easy
                  </div>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    The best rebalancing strategy is one you'll actually follow. Consider
                    automation options that fit your style.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <AutomationCard
                title="Target Date Funds"
                description="Set it and forget it. The fund automatically rebalances and adjusts allocation as you age."
                icon={Calendar}
                features={[
                  "Automatic rebalancing",
                  "Glide path adjustment",
                  "Single fund simplicity",
                  "Low maintenance",
                ]}
              />

              <AutomationCard
                title="Robo-Advisors"
                description="Algorithms handle rebalancing, tax-loss harvesting, and more for a small fee."
                icon={BarChart3}
                features={[
                  "Automatic rebalancing",
                  "Tax-loss harvesting",
                  "Dividend reinvestment",
                  "Low cost (0.25-0.50%)",
                ]}
              />

              <AutomationCard
                title="DIY with Reminders"
                description="Manual control with calendar reminders to review quarterly or annually."
                icon={Clock}
                features={[
                  "Full control",
                  "Choose your timing",
                  "No management fees",
                  "Learn by doing",
                ]}
              />
            </div>

            {/* DIY Calendar Setup */}
            <div className="rounded-lg border p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                DIY Rebalancing Calendar
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                If you prefer manual control, set up these recurring reminders:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="font-medium mb-2">Quarterly Check (Optional)</div>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Review allocation drift</li>
                    <li>Direct new contributions to underweight</li>
                    <li>Only rebalance if 5%+ off target</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 p-4">
                  <div className="font-medium mb-2">Annual Review (Required)</div>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Full portfolio rebalancing</li>
                    <li>Tax-loss harvesting review</li>
                    <li>Update target allocation if needed</li>
                    <li>Review across all account types</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Best Practices Summary */}
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Best Practices Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Rebalance in tax-advantaged accounts first</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Use new contributions to rebalance when possible</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Consider the 5/25 rule for threshold rebalancing</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Annual rebalancing is sufficient for most investors</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Look for tax-loss harvesting opportunities</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Automate if you prefer hands-off investing</span>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

RebalancingGuide.displayName = "RebalancingGuide";

export default RebalancingGuide;
