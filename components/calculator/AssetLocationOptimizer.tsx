"use client";

import React, { useState, useCallback, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  DollarSign,
  TrendingUp,
  RefreshCw,
  Info,
  Wallet,
  Building,
  Sparkles,
  GripVertical,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import {
  type AssetClass,
  type AccountType,
  type AssetHolding,
  type Account,
  type PortfolioAnalysis,
  type RebalancingStrategy,
  type WithdrawalOrderStep,
  ASSET_TAX_PROFILES,
  analyzePortfolio,
  getRebalancingStrategies,
  getWithdrawalOrder,
  createDefaultHoldings,
  getMarginalRate,
  getLTCGRate,
} from "@/lib/calculations/assetLocationEngine";
import type { FilingStatus } from "@/types/calculator";

// ==================== Props ====================

interface AssetLocationOptimizerProps {
  // Account balances
  taxableBalance: number;
  traditionalBalance: number;
  rothBalance: number;

  // User info for tax calculations
  income: number;
  filingStatus: FilingStatus;
  age: number;

  // Optional custom holdings (if not provided, we'll create defaults)
  holdings?: AssetHolding[];

  // Callbacks
  onOptimize?: (analysis: PortfolioAnalysis) => void;
}

// ==================== Helper Components ====================

/**
 * Tax efficiency score indicator
 */
function TaxEfficiencyScore({
  score,
  label,
  size = "normal",
}: {
  score: number;
  label: string;
  size?: "normal" | "large";
}) {
  const getColor = (s: number) => {
    if (s >= 80) return "text-green-600 bg-green-100 dark:bg-green-900/30";
    if (s >= 60) return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30";
    return "text-red-600 bg-red-100 dark:bg-red-900/30";
  };

  const sizeClasses =
    size === "large"
      ? "text-4xl font-bold w-20 h-20"
      : "text-2xl font-bold w-14 h-14";

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses} ${getColor(score)} rounded-full flex items-center justify-center`}
      >
        {score}
      </div>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

/**
 * Account bucket visualization
 */
function AccountBucket({
  type,
  holdings,
  totalValue,
  onDrop,
  onRemove,
  isOptimal = false,
}: {
  type: AccountType;
  holdings: AssetHolding[];
  totalValue: number;
  onDrop?: (holding: AssetHolding, fromAccount: AccountType) => void;
  onRemove?: (holdingId: string) => void;
  isOptimal?: boolean;
}) {
  const [isDragOver, setIsDragOver] = useState(false);

  const accountInfo = {
    taxable: {
      label: "Taxable Brokerage",
      icon: Wallet,
      color: "border-blue-500 bg-blue-50 dark:bg-blue-950/20",
      headerColor: "bg-blue-500",
      description: "Growth stocks, International (FTC)",
    },
    traditional: {
      label: "Traditional 401(k)/IRA",
      icon: Building,
      color: "border-amber-500 bg-amber-50 dark:bg-amber-950/20",
      headerColor: "bg-amber-500",
      description: "Bonds, REITs, High-yield assets",
    },
    roth: {
      label: "Roth IRA/401(k)",
      icon: Sparkles,
      color: "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      headerColor: "bg-emerald-500",
      description: "High-growth, highest expected return",
    },
  };

  const info = accountInfo[type];
  const Icon = info.icon;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      if (data.fromAccount !== type && onDrop) {
        onDrop(data.holding, data.fromAccount);
      }
    } catch {
      // Invalid drop data
    }
  };

  return (
    <div
      className={`rounded-lg border-2 ${info.color} ${isDragOver ? "ring-2 ring-primary" : ""} transition-all`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Header */}
      <div
        className={`${info.headerColor} text-white px-4 py-2 rounded-t-md flex items-center gap-2`}
      >
        <Icon className="h-4 w-4" />
        <span className="font-semibold text-sm">{info.label}</span>
        <span className="ml-auto text-sm opacity-90">
          ${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Holdings */}
      <div className="p-3 min-h-[120px]">
        {isOptimal && (
          <div className="text-xs text-muted-foreground mb-2 italic">
            {info.description}
          </div>
        )}
        <div className="space-y-2">
          {holdings.map((holding) => (
            <HoldingChip
              key={holding.id}
              holding={holding}
              accountType={type}
              onRemove={onRemove}
              draggable={!!onDrop}
            />
          ))}
          {holdings.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-4">
              {onDrop ? "Drop assets here" : "No assets"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual holding chip (draggable)
 */
function HoldingChip({
  holding,
  accountType,
  onRemove,
  draggable = true,
}: {
  holding: AssetHolding;
  accountType: AccountType;
  onRemove?: (holdingId: string) => void;
  draggable?: boolean;
}) {
  const profile = ASSET_TAX_PROFILES[holding.assetClass];
  const [isDragging, setIsDragging] = useState(false);

  const efficiencyColor =
    profile.taxEfficiencyScore >= 7
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
      : profile.taxEfficiencyScore >= 4
        ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.setData(
      "application/json",
      JSON.stringify({ holding, fromAccount: accountType })
    );
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 ${
        isDragging ? "opacity-50" : ""
      } ${draggable ? "cursor-grab active:cursor-grabbing" : ""}`}
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {draggable && (
        <GripVertical className="h-4 w-4 text-gray-400 flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{holding.name}</div>
        <div className="text-xs text-muted-foreground">
          $
          {holding.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </div>
      </div>
      <Badge className={`${efficiencyColor} text-xs flex-shrink-0`}>
        {profile.taxEfficiencyScore}/10
      </Badge>
      {onRemove && (
        <button
          onClick={() => onRemove(holding.id)}
          className="text-gray-400 hover:text-red-500 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * Recommendation card
 */
function RecommendationCard({
  recommendation,
  index,
}: {
  recommendation: {
    priority: string;
    action: string;
    fromAccount: AccountType;
    toAccount: AccountType;
    annualBenefit: number;
    twentyYearBenefit: number;
    rationale: string;
  };
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);

  const priorityColor = {
    high: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    medium:
      "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800",
    low: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
  };

  return (
    <div
      className={`rounded-lg border p-4 ${priorityColor[recommendation.priority as keyof typeof priorityColor]}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{recommendation.action}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {recommendation.priority} Priority
            </Badge>
          </div>
          <div className="text-sm mt-1 opacity-80">
            <span className="font-medium">Annual Savings:</span> $
            {recommendation.annualBenefit.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}{" "}
            |
            <span className="font-medium ml-2">20-Year Impact:</span> $
            {recommendation.twentyYearBenefit.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}
          </div>
          {expanded && (
            <div className="mt-2 text-sm italic opacity-70">
              {recommendation.rationale}
            </div>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs underline mt-1 opacity-70 hover:opacity-100"
          >
            {expanded ? "Less" : "More"} details
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Rebalancing strategy card
 */
function RebalancingStrategyCard({
  strategy,
}: {
  strategy: RebalancingStrategy;
}) {
  const [expanded, setExpanded] = useState(false);

  const taxImpactColor = {
    none: "bg-green-100 text-green-800 dark:bg-green-900/30",
    minimal: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30",
    significant: "bg-red-100 text-red-800 dark:bg-red-900/30",
  };

  const methodLabels = {
    new_contributions: "Direct New Contributions",
    within_accounts: "Rebalance Within Accounts",
    tax_loss_harvest: "Tax-Loss Harvesting",
    exchange: "Fund Exchange",
  };

  return (
    <div className="rounded-lg border bg-white dark:bg-gray-900 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold">
            {methodLabels[strategy.method as keyof typeof methodLabels]}
          </span>
        </div>
        <Badge
          className={`${taxImpactColor[strategy.taxImpact]} text-xs capitalize`}
        >
          {strategy.taxImpact === "none" ? "No Tax Impact" : `${strategy.taxImpact} Tax Impact`}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground mt-2">
        {strategy.description}
      </p>

      {expanded && (
        <div className="mt-3 space-y-2">
          <div className="text-sm font-medium">Steps:</div>
          <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
            {strategy.steps.map((step, idx) => (
              <li key={idx}>{step}</li>
            ))}
          </ol>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1 text-xs text-primary mt-2"
      >
        {expanded ? (
          <>
            <ChevronUp className="h-3 w-3" /> Hide steps
          </>
        ) : (
          <>
            <ChevronDown className="h-3 w-3" /> Show steps
          </>
        )}
      </button>
    </div>
  );
}

/**
 * Withdrawal order visualization
 */
function WithdrawalOrderPreview({
  steps,
}: {
  steps: WithdrawalOrderStep[];
}) {
  const accountIcons = {
    taxable: Wallet,
    traditional: Building,
    roth: Sparkles,
  };

  const accountColors = {
    taxable: "bg-blue-500",
    traditional: "bg-amber-500",
    roth: "bg-emerald-500",
  };

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const Icon = accountIcons[step.accountType];
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.order} className="relative">
            <div className="flex items-start gap-4">
              {/* Order number and connector line */}
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full ${accountColors[step.accountType]} text-white flex items-center justify-center font-bold text-lg`}
                >
                  {step.order}
                </div>
                {!isLast && (
                  <div className="w-0.5 h-full bg-gray-300 dark:bg-gray-700 absolute top-10 left-5" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-semibold capitalize">
                    {step.accountType === "traditional"
                      ? "Traditional 401(k)/IRA"
                      : step.accountType === "roth"
                        ? "Roth IRA/401(k)"
                        : "Taxable Brokerage"}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {step.rationale}
                </p>
                <div className="mt-2 text-xs">
                  <span className="font-medium">Tax Impact:</span>{" "}
                  <span className="text-muted-foreground">
                    {step.taxImplication}
                  </span>
                </div>
                {step.conditions && (
                  <div className="mt-1 text-xs italic text-muted-foreground">
                    {step.conditions}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ==================== Main Component ====================

export const AssetLocationOptimizer = React.memo(
  function AssetLocationOptimizer({
    taxableBalance,
    traditionalBalance,
    rothBalance,
    income,
    filingStatus,
    age,
    holdings: initialHoldings,
    onOptimize,
  }: AssetLocationOptimizerProps) {
    // State for custom holdings (drag and drop)
    const [holdings, setHoldings] = useState<AssetHolding[]>(() => {
      return (
        initialHoldings ||
        createDefaultHoldings(taxableBalance, traditionalBalance, rothBalance)
      );
    });

    const [activeTab, setActiveTab] = useState("overview");
    const [showAddAsset, setShowAddAsset] = useState(false);

    // Derived analysis
    const analysis = useMemo(() => {
      const accounts: Account[] = [
        {
          type: "taxable",
          balance: taxableBalance,
          holdings: holdings.filter((h) => h.accountType === "taxable"),
        },
        {
          type: "traditional",
          balance: traditionalBalance,
          holdings: holdings.filter((h) => h.accountType === "traditional"),
        },
        {
          type: "roth",
          balance: rothBalance,
          holdings: holdings.filter((h) => h.accountType === "roth"),
        },
      ];

      return analyzePortfolio(accounts, income, filingStatus);
    }, [
      holdings,
      taxableBalance,
      traditionalBalance,
      rothBalance,
      income,
      filingStatus,
    ]);

    // Tax rates for display
    const marginalRate = getMarginalRate(income, filingStatus);
    const ltcgRate = getLTCGRate(income, filingStatus);

    // Rebalancing strategies
    const rebalancingStrategies = useMemo(
      () => getRebalancingStrategies(),
      []
    );

    // Withdrawal order
    const withdrawalOrder = useMemo(
      () =>
        getWithdrawalOrder(
          taxableBalance > 0,
          traditionalBalance > 0,
          rothBalance > 0,
          age
        ),
      [taxableBalance, traditionalBalance, rothBalance, age]
    );

    // Handle drag and drop
    const handleDrop = useCallback(
      (
        holding: AssetHolding,
        fromAccount: AccountType,
        toAccount: AccountType
      ) => {
        setHoldings((prev) =>
          prev.map((h) =>
            h.id === holding.id ? { ...h, accountType: toAccount } : h
          )
        );
      },
      []
    );

    // Handle adding a new asset
    const handleAddAsset = useCallback(
      (assetClass: AssetClass, value: number, accountType: AccountType) => {
        const profile = ASSET_TAX_PROFILES[assetClass];
        const newHolding: AssetHolding = {
          id: `${assetClass}-${Date.now()}`,
          name: profile.name,
          assetClass,
          value,
          accountType,
        };
        setHoldings((prev) => [...prev, newHolding]);
        setShowAddAsset(false);
      },
      []
    );

    // Handle removing an asset
    const handleRemoveAsset = useCallback((holdingId: string) => {
      setHoldings((prev) => prev.filter((h) => h.id !== holdingId));
    }, []);

    // Reset to defaults
    const handleReset = useCallback(() => {
      setHoldings(
        createDefaultHoldings(taxableBalance, traditionalBalance, rothBalance)
      );
    }, [taxableBalance, traditionalBalance, rothBalance]);

    // Apply optimal placement
    const handleApplyOptimal = useCallback(() => {
      const optimalHoldings = [
        ...analysis.optimalPlacement.taxable,
        ...analysis.optimalPlacement.traditional,
        ...analysis.optimalPlacement.roth,
      ];
      setHoldings(optimalHoldings);
      onOptimize?.(analysis);
    }, [analysis, onOptimize]);

    // Total portfolio value
    const totalValue = taxableBalance + traditionalBalance + rothBalance;

    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-emerald-600" />
            Asset Location Optimizer
          </CardTitle>
          <CardDescription>
            Place your investments in the most tax-efficient account types.
            Asset location can add{" "}
            <span className="font-semibold text-emerald-600">
              0.5-1% annually
            </span>{" "}
            to your after-tax returns - that's{" "}
            <span className="font-semibold text-emerald-600">
              15-30% more wealth
            </span>{" "}
            over 30 years.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="placement">Asset Placement</TabsTrigger>
              <TabsTrigger value="rebalance">Rebalancing</TabsTrigger>
              <TabsTrigger value="withdrawal">Withdrawal Order</TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6 mt-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      Annual Tax Savings
                    </span>
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400">
                    $
                    {analysis.annualSavings.toLocaleString(undefined, {
                      maximumFractionDigits: 0,
                    })}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Potential annual improvement
                  </div>
                </div>

                <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      20-Year Impact
                    </span>
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-400">
                    $
                    {(analysis.twentyYearImpact / 1000).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}
                    k
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Compounded savings
                  </div>
                </div>

                <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">
                      30-Year Impact
                    </span>
                    <Sparkles className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="text-3xl font-bold text-purple-700 dark:text-purple-400">
                    $
                    {(analysis.thirtyYearImpact / 1000).toLocaleString(
                      undefined,
                      { maximumFractionDigits: 0 }
                    )}
                    k
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    FREE alpha
                  </div>
                </div>
              </div>

              {/* Efficiency Comparison */}
              <div className="rounded-lg border p-6">
                <h3 className="font-semibold mb-4">
                  Tax Efficiency Comparison
                </h3>
                <div className="flex items-center justify-around">
                  <TaxEfficiencyScore
                    score={analysis.currentEfficiencyScore}
                    label="Current Score"
                    size="large"
                  />
                  <ArrowRight className="h-8 w-8 text-muted-foreground" />
                  <TaxEfficiencyScore
                    score={analysis.optimalEfficiencyScore}
                    label="Optimal Score"
                    size="large"
                  />
                </div>

                {analysis.currentEfficiencyScore < analysis.optimalEfficiencyScore && (
                  <div className="mt-4 text-center text-sm text-muted-foreground">
                    Optimizing your asset location could improve your tax
                    efficiency by{" "}
                    <span className="font-semibold text-green-600">
                      {analysis.optimalEfficiencyScore -
                        analysis.currentEfficiencyScore}{" "}
                      points
                    </span>
                  </div>
                )}

                {analysis.currentEfficiencyScore >= analysis.optimalEfficiencyScore && (
                  <div className="mt-4 flex items-center justify-center gap-2 text-green-600">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="font-medium">
                      Your assets are optimally located!
                    </span>
                  </div>
                )}
              </div>

              {/* Tax Rate Context */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 border p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-sm mb-1">
                      Your Tax Rates
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Based on ${income.toLocaleString()} income ({filingStatus}{" "}
                      filing):
                      <ul className="mt-1 list-disc list-inside">
                        <li>
                          Marginal ordinary rate:{" "}
                          <span className="font-medium">
                            {(marginalRate * 100).toFixed(0)}%
                          </span>
                        </li>
                        <li>
                          Long-term capital gains rate:{" "}
                          <span className="font-medium">
                            {(ltcgRate * 100).toFixed(0)}%
                          </span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">Top Recommendations</h3>
                  {analysis.recommendations.slice(0, 3).map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      recommendation={rec}
                      index={idx}
                    />
                  ))}
                  {analysis.recommendations.length > 3 && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setActiveTab("placement")}
                    >
                      View all {analysis.recommendations.length} recommendations
                    </Button>
                  )}
                </div>
              )}

              {/* Key Insight */}
              <div className="rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                      The Power of Asset Location
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300">
                      On a $
                      {totalValue.toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}{" "}
                      portfolio, proper asset location can add $
                      {((totalValue * 0.005) / 1000).toFixed(0)}k-$
                      {((totalValue * 0.01) / 1000).toFixed(0)}k per year in
                      after-tax returns. Over 30 years at 7% growth, that's{" "}
                      <strong>
                        $
                        {(
                          analysis.thirtyYearImpact /
                          (analysis.twentyYearImpact || 1)
                        ).toFixed(1)}
                        x your 20-year impact
                      </strong>
                      . This is one of the few "free lunches" in investing.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Asset Placement Tab */}
            <TabsContent value="placement" className="space-y-6 mt-6">
              {/* Current vs Optimal */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Current Asset Location</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleReset}>
                      Reset
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleApplyOptimal}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Sparkles className="h-4 w-4 mr-1" />
                      Apply Optimal
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground mb-2">
                  Drag and drop assets between accounts to see the tax impact
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AccountBucket
                    type="taxable"
                    holdings={holdings.filter((h) => h.accountType === "taxable")}
                    totalValue={holdings
                      .filter((h) => h.accountType === "taxable")
                      .reduce((sum, h) => sum + h.value, 0)}
                    onDrop={(holding, from) =>
                      handleDrop(holding, from, "taxable")
                    }
                    onRemove={handleRemoveAsset}
                  />
                  <AccountBucket
                    type="traditional"
                    holdings={holdings.filter(
                      (h) => h.accountType === "traditional"
                    )}
                    totalValue={holdings
                      .filter((h) => h.accountType === "traditional")
                      .reduce((sum, h) => sum + h.value, 0)}
                    onDrop={(holding, from) =>
                      handleDrop(holding, from, "traditional")
                    }
                    onRemove={handleRemoveAsset}
                  />
                  <AccountBucket
                    type="roth"
                    holdings={holdings.filter((h) => h.accountType === "roth")}
                    totalValue={holdings
                      .filter((h) => h.accountType === "roth")
                      .reduce((sum, h) => sum + h.value, 0)}
                    onDrop={(holding, from) => handleDrop(holding, from, "roth")}
                    onRemove={handleRemoveAsset}
                  />
                </div>
              </div>

              {/* Optimal Placement Reference */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-600" />
                  Optimal Asset Location
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AccountBucket
                    type="taxable"
                    holdings={analysis.optimalPlacement.taxable}
                    totalValue={analysis.optimalPlacement.taxable.reduce(
                      (sum, h) => sum + h.value,
                      0
                    )}
                    isOptimal
                  />
                  <AccountBucket
                    type="traditional"
                    holdings={analysis.optimalPlacement.traditional}
                    totalValue={analysis.optimalPlacement.traditional.reduce(
                      (sum, h) => sum + h.value,
                      0
                    )}
                    isOptimal
                  />
                  <AccountBucket
                    type="roth"
                    holdings={analysis.optimalPlacement.roth}
                    totalValue={analysis.optimalPlacement.roth.reduce(
                      (sum, h) => sum + h.value,
                      0
                    )}
                    isOptimal
                  />
                </div>
              </div>

              {/* Add Custom Asset */}
              {showAddAsset ? (
                <AddAssetForm
                  onAdd={handleAddAsset}
                  onCancel={() => setShowAddAsset(false)}
                />
              ) : (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowAddAsset(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Custom Asset
                </Button>
              )}

              {/* Asset Class Reference */}
              <div className="rounded-lg border p-4">
                <h3 className="font-semibold mb-3">
                  Tax Efficiency by Asset Class
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Object.values(ASSET_TAX_PROFILES).map((profile) => (
                    <div
                      key={profile.assetClass}
                      className="flex items-center gap-2 text-sm"
                    >
                      <Badge
                        className={`w-10 justify-center ${
                          profile.taxEfficiencyScore >= 7
                            ? "bg-green-100 text-green-800"
                            : profile.taxEfficiencyScore >= 4
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                        }`}
                      >
                        {profile.taxEfficiencyScore}
                      </Badge>
                      <span className="font-medium">{profile.name}</span>
                      <span className="text-muted-foreground text-xs ml-auto capitalize">
                        Best: {profile.preferredLocation}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* All Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold">All Recommendations</h3>
                  {analysis.recommendations.map((rec, idx) => (
                    <RecommendationCard
                      key={idx}
                      recommendation={rec}
                      index={idx}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Rebalancing Tab */}
            <TabsContent value="rebalance" className="space-y-6 mt-6">
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                      Tax-Efficient Rebalancing
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Moving assets between account types can trigger taxes.
                      Here are strategies to reposition your assets while
                      minimizing or eliminating tax impact.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {rebalancingStrategies.map((strategy, idx) => (
                  <RebalancingStrategyCard key={idx} strategy={strategy} />
                ))}
              </div>

              {/* Best Practices */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Best Practices
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>
                    <strong>New contributions:</strong> Always direct new money
                    to underweight asset classes in each account
                  </li>
                  <li>
                    <strong>401(k) rebalancing:</strong> No tax impact -
                    rebalance freely within these accounts
                  </li>
                  <li>
                    <strong>Taxable account:</strong> Use tax-loss harvesting
                    opportunities to make changes
                  </li>
                  <li>
                    <strong>Annual review:</strong> Check asset location during
                    annual rebalancing
                  </li>
                  <li>
                    <strong>RMDs:</strong> Use RMD distributions to naturally
                    shift allocation over time
                  </li>
                </ul>
              </div>
            </TabsContent>

            {/* Withdrawal Order Tab */}
            <TabsContent value="withdrawal" className="space-y-6 mt-6">
              <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-purple-800 dark:text-purple-200 mb-1">
                      Withdrawal Order Strategy
                    </div>
                    <p className="text-sm text-purple-700 dark:text-purple-300">
                      In retirement, the order you withdraw from accounts
                      affects your tax bill and how long your money lasts. Asset
                      location determines optimal withdrawal sequencing.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-6">
                <h3 className="font-semibold mb-4">
                  Your Recommended Withdrawal Order
                </h3>
                <WithdrawalOrderPreview steps={withdrawalOrder} />
              </div>

              {/* RMD Warning */}
              {age < 73 && traditionalBalance > 0 && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                        RMDs Starting at Age 73
                      </div>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        You have {73 - age} years until Required Minimum
                        Distributions begin. Consider Roth conversions now to
                        reduce future RMD amounts and give you more withdrawal
                        flexibility in retirement.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Withdrawal Efficiency */}
              <div className="rounded-lg border p-4 space-y-3">
                <h3 className="font-semibold">Why This Order Matters</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Wallet className="h-4 w-4 text-blue-500" />
                      Taxable First
                    </div>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Only gains are taxed (at LTCG rates)</li>
                      <li>Basis (what you invested) is tax-free</li>
                      <li>
                        Allows tax-advantaged accounts to grow longer
                      </li>
                      <li>Step-up in basis at death for heirs</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <div className="font-medium flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Roth Last
                    </div>
                    <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                      <li>100% tax-free (contributions AND earnings)</li>
                      <li>No RMDs - grows tax-free for life</li>
                      <li>Best hedge against future tax increases</li>
                      <li>Tax-free inheritance for beneficiaries</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Exception Cases */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900/50 border p-4">
                <h3 className="font-semibold mb-2">
                  When to Deviate from This Order
                </h3>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>
                    <strong>Low-income years:</strong> Withdraw from Traditional
                    to fill low tax brackets
                  </li>
                  <li>
                    <strong>IRMAA thresholds:</strong> Reduce Traditional
                    withdrawals to avoid Medicare surcharges
                  </li>
                  <li>
                    <strong>Roth conversion ladder:</strong> Convert and withdraw
                    strategically
                  </li>
                  <li>
                    <strong>Social Security taxation:</strong> Manage income to
                    reduce SS tax
                  </li>
                </ul>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }
);

AssetLocationOptimizer.displayName = "AssetLocationOptimizer";

// ==================== Add Asset Form ====================

function AddAssetForm({
  onAdd,
  onCancel,
}: {
  onAdd: (assetClass: AssetClass, value: number, accountType: AccountType) => void;
  onCancel: () => void;
}) {
  const [assetClass, setAssetClass] = useState<AssetClass>("us_stocks");
  const [value, setValue] = useState<string>("10000");
  const [accountType, setAccountType] = useState<AccountType>("taxable");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseFloat(value.replace(/,/g, ""));
    if (!isNaN(numValue) && numValue > 0) {
      onAdd(assetClass, numValue, accountType);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border p-4 space-y-4 bg-white dark:bg-gray-900"
    >
      <h4 className="font-semibold">Add Custom Asset</h4>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Asset Class</label>
          <Select
            value={assetClass}
            onValueChange={(v) => setAssetClass(v as AssetClass)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(ASSET_TAX_PROFILES).map((profile) => (
                <SelectItem key={profile.assetClass} value={profile.assetClass}>
                  {profile.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Value ($)</label>
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-3 py-2 rounded-md border bg-background"
            placeholder="10,000"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Account Type</label>
          <Select
            value={accountType}
            onValueChange={(v) => setAccountType(v as AccountType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="taxable">Taxable</SelectItem>
              <SelectItem value="traditional">Traditional</SelectItem>
              <SelectItem value="roth">Roth</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Add Asset</Button>
      </div>
    </form>
  );
}

export default AssetLocationOptimizer;
