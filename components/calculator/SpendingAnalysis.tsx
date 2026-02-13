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
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import {
  Home,
  Car,
  UtensilsCrossed,
  Heart,
  Shield,
  CreditCard,
  Baby,
  PartyPopper,
  HandHeart,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Target,
  Info,
  DollarSign,
  PiggyBank,
  Calculator,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlanConfig } from "@/lib/plan-config-context";

// ==================== Types ====================

interface SpendingCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  subcategories: {
    id: string;
    name: string;
    placeholder: string;
  }[];
  recommendedPct: number; // Recommended percentage of gross income
  retirementAdjustment: number; // Multiplier in retirement (1.0 = same, 0.5 = halved, 1.5 = 50% more)
}

interface SpendingBreakdown {
  housing: {
    mortgageRent: number;
    utilities: number;
    maintenance: number;
  };
  transportation: {
    carPayment: number;
    insurance: number;
    gas: number;
    maintenance: number;
  };
  food: {
    groceries: number;
    diningOut: number;
  };
  healthcare: {
    premiums: number;
    outOfPocket: number;
  };
  insurance: {
    life: number;
    disability: number;
    umbrella: number;
  };
  debt: {
    payments: number;
  };
  kids: {
    childcare: number;
    activities: number;
    education: number;
  };
  discretionary: {
    entertainment: number;
    travel: number;
    hobbies: number;
  };
  giving: {
    charity: number;
    familySupport: number;
  };
  other: {
    miscellaneous: number;
  };
}

interface SpendingAnalysisProps {
  onRetirementSpendingUpdate?: (adjustedMonthlySpending: number) => void;
}

// ==================== Constants ====================

const SPENDING_CATEGORIES: SpendingCategory[] = [
  {
    id: "housing",
    name: "Housing",
    icon: <Home className="h-4 w-4" />,
    color: "#3B82F6", // blue-500
    subcategories: [
      { id: "mortgageRent", name: "Mortgage/Rent", placeholder: "2000" },
      { id: "utilities", name: "Utilities", placeholder: "300" },
      { id: "maintenance", name: "Maintenance", placeholder: "200" },
    ],
    recommendedPct: 28,
    retirementAdjustment: 0.7, // Lower if mortgage paid off
  },
  {
    id: "transportation",
    name: "Transportation",
    icon: <Car className="h-4 w-4" />,
    color: "#8B5CF6", // violet-500
    subcategories: [
      { id: "carPayment", name: "Car Payment", placeholder: "500" },
      { id: "insurance", name: "Auto Insurance", placeholder: "150" },
      { id: "gas", name: "Gas", placeholder: "200" },
      { id: "maintenance", name: "Maintenance", placeholder: "100" },
    ],
    recommendedPct: 15,
    retirementAdjustment: 0.6, // No commute
  },
  {
    id: "food",
    name: "Food",
    icon: <UtensilsCrossed className="h-4 w-4" />,
    color: "#F59E0B", // amber-500
    subcategories: [
      { id: "groceries", name: "Groceries", placeholder: "600" },
      { id: "diningOut", name: "Dining Out", placeholder: "300" },
    ],
    recommendedPct: 12,
    retirementAdjustment: 0.9, // Slightly lower, more time to cook
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: <Heart className="h-4 w-4" />,
    color: "#EF4444", // red-500
    subcategories: [
      { id: "premiums", name: "Insurance Premiums", placeholder: "500" },
      { id: "outOfPocket", name: "Out of Pocket", placeholder: "200" },
    ],
    recommendedPct: 8,
    retirementAdjustment: 1.5, // Healthcare costs rise significantly
  },
  {
    id: "insurance",
    name: "Insurance",
    icon: <Shield className="h-4 w-4" />,
    color: "#06B6D4", // cyan-500
    subcategories: [
      { id: "life", name: "Life Insurance", placeholder: "100" },
      { id: "disability", name: "Disability Insurance", placeholder: "50" },
      { id: "umbrella", name: "Umbrella/Other", placeholder: "25" },
    ],
    recommendedPct: 3,
    retirementAdjustment: 0.3, // Less need for life/disability
  },
  {
    id: "debt",
    name: "Debt Payments",
    icon: <CreditCard className="h-4 w-4" />,
    color: "#DC2626", // red-600
    subcategories: [
      { id: "payments", name: "Debt Payments", placeholder: "500" },
    ],
    recommendedPct: 10,
    retirementAdjustment: 0.0, // Should be paid off
  },
  {
    id: "kids",
    name: "Kids",
    icon: <Baby className="h-4 w-4" />,
    color: "#EC4899", // pink-500
    subcategories: [
      { id: "childcare", name: "Childcare", placeholder: "1500" },
      { id: "activities", name: "Activities", placeholder: "200" },
      { id: "education", name: "Education", placeholder: "300" },
    ],
    recommendedPct: 15,
    retirementAdjustment: 0.0, // Kids should be grown
  },
  {
    id: "discretionary",
    name: "Discretionary",
    icon: <PartyPopper className="h-4 w-4" />,
    color: "#10B981", // emerald-500
    subcategories: [
      { id: "entertainment", name: "Entertainment", placeholder: "200" },
      { id: "travel", name: "Travel", placeholder: "300" },
      { id: "hobbies", name: "Hobbies", placeholder: "150" },
    ],
    recommendedPct: 10,
    retirementAdjustment: 1.3, // More time for hobbies/travel
  },
  {
    id: "giving",
    name: "Giving",
    icon: <HandHeart className="h-4 w-4" />,
    color: "#F97316", // orange-500
    subcategories: [
      { id: "charity", name: "Charity", placeholder: "200" },
      { id: "familySupport", name: "Family Support", placeholder: "0" },
    ],
    recommendedPct: 5,
    retirementAdjustment: 1.0, // Same in retirement
  },
  {
    id: "other",
    name: "Everything Else",
    icon: <MoreHorizontal className="h-4 w-4" />,
    color: "#6B7280", // gray-500
    subcategories: [
      { id: "miscellaneous", name: "Miscellaneous", placeholder: "300" },
    ],
    recommendedPct: 5,
    retirementAdjustment: 1.0,
  },
];

const FIRE_TARGETS = [
  { rate: 25, label: "Coast FIRE", description: "Retire eventually, save enough for compound growth" },
  { rate: 50, label: "Lean FIRE", description: "Retire early with modest lifestyle" },
  { rate: 75, label: "Fat FIRE", description: "Retire early with abundant lifestyle" },
];

const DEFAULT_SPENDING: SpendingBreakdown = {
  housing: { mortgageRent: 0, utilities: 0, maintenance: 0 },
  transportation: { carPayment: 0, insurance: 0, gas: 0, maintenance: 0 },
  food: { groceries: 0, diningOut: 0 },
  healthcare: { premiums: 0, outOfPocket: 0 },
  insurance: { life: 0, disability: 0, umbrella: 0 },
  debt: { payments: 0 },
  kids: { childcare: 0, activities: 0, education: 0 },
  discretionary: { entertainment: 0, travel: 0, hobbies: 0 },
  giving: { charity: 0, familySupport: 0 },
  other: { miscellaneous: 0 },
};

// ==================== Helper Functions ====================

function formatCurrency(value: number): string {
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

// ==================== Component ====================

export default function SpendingAnalysis({
  onRetirementSpendingUpdate,
}: SpendingAnalysisProps) {
  const { config, updateConfig } = usePlanConfig();

  // State for spending breakdown
  const [spending, setSpending] = useState<SpendingBreakdown>(DEFAULT_SPENDING);
  const [showRetirementAdjustment, setShowRetirementAdjustment] = useState(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(["housing", "transportation", "food"])
  );

  // Calculate gross monthly income from config
  const grossMonthlyIncome = useMemo(() => {
    const primary = config.primaryIncome || 0;
    const spouse = config.spouseIncome || 0;
    return (primary + spouse) / 12;
  }, [config.primaryIncome, config.spouseIncome]);

  // Calculate totals by category
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    SPENDING_CATEGORIES.forEach((category) => {
      const categorySpending = spending[category.id as keyof SpendingBreakdown];
      if (categorySpending && typeof categorySpending === "object") {
        totals[category.id] = Object.values(categorySpending).reduce(
          (sum, val) => sum + (val || 0),
          0
        );
      }
    });

    return totals;
  }, [spending]);

  // Total monthly spending
  const totalMonthlySpending = useMemo(() => {
    return Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
  }, [categoryTotals]);

  // Calculate retirement-adjusted spending
  const retirementAdjustedSpending = useMemo(() => {
    let adjustedTotal = 0;

    SPENDING_CATEGORIES.forEach((category) => {
      const categoryTotal = categoryTotals[category.id] || 0;
      adjustedTotal += categoryTotal * category.retirementAdjustment;
    });

    return adjustedTotal;
  }, [categoryTotals]);

  // Monthly savings
  const monthlySavings = useMemo(() => {
    const totalContributions =
      (config.cTax1 || 0) +
      (config.cPre1 || 0) +
      (config.cPost1 || 0) +
      (config.cMatch1 || 0) +
      (config.cTax2 || 0) +
      (config.cPre2 || 0) +
      (config.cPost2 || 0) +
      (config.cMatch2 || 0);

    return totalContributions / 12;
  }, [config]);

  // Savings rate
  const savingsRate = useMemo(() => {
    if (grossMonthlyIncome <= 0) return 0;
    return (monthlySavings / grossMonthlyIncome) * 100;
  }, [monthlySavings, grossMonthlyIncome]);

  // Income - Spending = Leftover (should match savings)
  const impliedMonthlySavings = grossMonthlyIncome - totalMonthlySpending;
  const savingsGap = monthlySavings - impliedMonthlySavings;

  // Pie chart data
  const pieData = useMemo(() => {
    return SPENDING_CATEGORIES.filter(
      (category) => categoryTotals[category.id] > 0
    ).map((category) => ({
      name: category.name,
      value: categoryTotals[category.id],
      color: category.color,
      percent: grossMonthlyIncome > 0
        ? (categoryTotals[category.id] / grossMonthlyIncome) * 100
        : 0,
    }));
  }, [categoryTotals, grossMonthlyIncome]);

  // Chart config for recharts
  const chartConfig: ChartConfig = useMemo(() => {
    const config: ChartConfig = {};
    SPENDING_CATEGORIES.forEach((category) => {
      config[category.id] = {
        label: category.name,
        color: category.color,
      };
    });
    return config;
  }, []);

  // Spending optimization suggestions
  const suggestions = useMemo(() => {
    const issues: Array<{
      category: string;
      icon: React.ReactNode;
      message: string;
      severity: "warning" | "info";
      potential: number;
    }> = [];

    SPENDING_CATEGORIES.forEach((category) => {
      const categoryTotal = categoryTotals[category.id] || 0;
      const percentOfIncome =
        grossMonthlyIncome > 0
          ? (categoryTotal / grossMonthlyIncome) * 100
          : 0;
      const overAmount = percentOfIncome - category.recommendedPct;

      if (overAmount > 5 && categoryTotal > 0) {
        const potentialSavings =
          categoryTotal -
          (grossMonthlyIncome * category.recommendedPct) / 100;

        issues.push({
          category: category.name,
          icon: category.icon,
          message: `Your ${category.name.toLowerCase()} is ${formatPercent(
            percentOfIncome
          )} of income - target is <${category.recommendedPct}%`,
          severity: overAmount > 15 ? "warning" : "info",
          potential: Math.max(0, potentialSavings),
        });
      }
    });

    // Sort by potential savings descending
    return issues.sort((a, b) => b.potential - a.potential);
  }, [categoryTotals, grossMonthlyIncome]);

  // Handle spending update
  const handleSpendingChange = useCallback(
    (categoryId: string, subcategoryId: string, value: number) => {
      setSpending((prev) => {
        const newSpending = { ...prev };
        const categoryKey = categoryId as keyof SpendingBreakdown;
        if (newSpending[categoryKey]) {
          (newSpending[categoryKey] as Record<string, number>)[subcategoryId] =
            value;
        }
        return newSpending;
      });
    },
    []
  );

  // Toggle category expansion
  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  // Apply retirement spending to main calculator
  const applyToCalculator = useCallback(() => {
    const adjustedSpending = showRetirementAdjustment
      ? retirementAdjustedSpending
      : totalMonthlySpending;

    // Update the plan config with expense details
    updateConfig({
      monthlyHouseholdExpenses: spending.housing.mortgageRent + spending.housing.utilities + spending.housing.maintenance,
      monthlyDiscretionary: spending.discretionary.entertainment + spending.discretionary.travel + spending.discretionary.hobbies,
      monthlyChildcare: spending.kids.childcare,
    });

    if (onRetirementSpendingUpdate) {
      onRetirementSpendingUpdate(adjustedSpending);
    }
  }, [
    showRetirementAdjustment,
    retirementAdjustedSpending,
    totalMonthlySpending,
    spending,
    updateConfig,
    onRetirementSpendingUpdate,
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Calculator className="h-8 w-8 text-blue-600" />
          Spending Analysis
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Know thy spending = know thy future. Track where every dollar goes to
          build an accurate retirement plan.
        </p>
      </div>

      {/* Income Summary */}
      <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Your Income
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Gross Annual</div>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  (config.primaryIncome || 0) + (config.spouseIncome || 0)
                )}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Gross Monthly</div>
              <div className="text-2xl font-bold">
                {formatCurrency(grossMonthlyIncome)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Monthly Spending
              </div>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(totalMonthlySpending)}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">
                Monthly Savings
              </div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(monthlySavings)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Spending Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Monthly Spending Breakdown
            </CardTitle>
            <CardDescription>
              Enter your monthly expenses in each category
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
            {SPENDING_CATEGORIES.map((category) => {
              const isExpanded = expandedCategories.has(category.id);
              const categoryTotal = categoryTotals[category.id] || 0;
              const percentOfIncome =
                grossMonthlyIncome > 0
                  ? (categoryTotal / grossMonthlyIncome) * 100
                  : 0;
              const isOverBudget = percentOfIncome > category.recommendedPct;

              return (
                <div
                  key={category.id}
                  className={cn(
                    "border rounded-lg overflow-hidden transition-all",
                    isExpanded && "ring-2 ring-blue-200 dark:ring-blue-800"
                  )}
                >
                  {/* Category Header */}
                  <button
                    onClick={() => toggleCategory(category.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors",
                      isExpanded && "bg-muted/30"
                    )}
                    aria-expanded={isExpanded}
                    type="button"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded"
                        style={{ backgroundColor: `${category.color}20` }}
                      >
                        <span style={{ color: category.color }}>
                          {category.icon}
                        </span>
                      </div>
                      <span className="font-medium">{category.name}</span>
                      {categoryTotal > 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            isOverBudget
                              ? "border-orange-500 text-orange-600"
                              : ""
                          )}
                        >
                          {formatCurrency(categoryTotal)}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {categoryTotal > 0 && (
                        <span
                          className={cn(
                            "text-xs",
                            isOverBudget
                              ? "text-orange-600"
                              : "text-muted-foreground"
                          )}
                        >
                          {formatPercent(percentOfIncome)} of income
                        </span>
                      )}
                      <svg
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Subcategories */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 space-y-3 border-t bg-muted/10">
                      {category.subcategories.map((sub) => (
                        <div key={sub.id} className="space-y-1">
                          <Label
                            htmlFor={`${category.id}-${sub.id}`}
                            className="text-sm text-muted-foreground"
                          >
                            {sub.name}
                          </Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                              $
                            </span>
                            <Input
                              id={`${category.id}-${sub.id}`}
                              type="number"
                              inputMode="numeric"
                              min={0}
                              placeholder={sub.placeholder}
                              value={
                                (
                                  spending[
                                    category.id as keyof SpendingBreakdown
                                  ] as Record<string, number>
                                )[sub.id] || ""
                              }
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleSpendingChange(category.id, sub.id, val);
                              }}
                              className="pl-7 font-mono"
                            />
                          </div>
                        </div>
                      ))}

                      {/* Category recommended percentage */}
                      <div className="pt-2 border-t mt-2">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Recommended: {category.recommendedPct}%</span>
                          <span>
                            Retirement adjustment:{" "}
                            {category.retirementAdjustment === 0
                              ? "Likely zero"
                              : category.retirementAdjustment < 1
                              ? `${((1 - category.retirementAdjustment) * 100).toFixed(0)}% lower`
                              : category.retirementAdjustment > 1
                              ? `${((category.retirementAdjustment - 1) * 100).toFixed(0)}% higher`
                              : "Same"}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Right Column: Visualizations */}
        <div className="space-y-6">
          {/* Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PiggyBank className="h-5 w-5" />
                Where Does Each Dollar Go?
              </CardTitle>
              <CardDescription>
                Visual breakdown of your monthly spending
              </CardDescription>
            </CardHeader>
            <CardContent>
              {totalMonthlySpending > 0 ? (
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) =>
                          `${name}: ${percent.toFixed(0)}%`
                        }
                        labelLine={true}
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            formatter={(value, name) => [
                              formatCurrency(value as number),
                              name,
                            ]}
                          />
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <Calculator className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Enter your spending to see the breakdown</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Savings Rate Card */}
          <Card
            className={cn(
              "border-2",
              savingsRate >= 50
                ? "border-green-200 bg-green-50/50 dark:bg-green-950/20"
                : savingsRate >= 25
                ? "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20"
            )}
          >
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5" />
                Savings Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div
                  className={cn(
                    "text-5xl font-bold",
                    savingsRate >= 50
                      ? "text-green-600"
                      : savingsRate >= 25
                      ? "text-blue-600"
                      : "text-orange-600"
                  )}
                >
                  {formatPercent(savingsRate)}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {formatCurrency(monthlySavings)}/month saved
                </div>
              </div>

              {/* FIRE Targets */}
              <div className="space-y-2">
                {FIRE_TARGETS.map((target) => {
                  const achieved = savingsRate >= target.rate;
                  return (
                    <div key={target.rate} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {achieved ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Target className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span
                            className={cn(
                              "font-medium",
                              achieved
                                ? "text-green-700"
                                : "text-muted-foreground"
                            )}
                          >
                            {target.label} ({target.rate}%)
                          </span>
                        </div>
                        {achieved && (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            Achieved
                          </Badge>
                        )}
                      </div>
                      <Progress
                        value={Math.min((savingsRate / target.rate) * 100, 100)}
                        className="h-2"
                      />
                      <p className="text-xs text-muted-foreground">
                        {target.description}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Savings Gap Analysis */}
              {totalMonthlySpending > 0 && Math.abs(savingsGap) > 100 && (
                <div
                  className={cn(
                    "p-3 rounded-lg border",
                    savingsGap > 0
                      ? "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20"
                      : "bg-red-50 border-red-200 dark:bg-red-950/20"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle
                      className={cn(
                        "h-4 w-4 mt-0.5",
                        savingsGap > 0 ? "text-yellow-600" : "text-red-600"
                      )}
                    />
                    <div className="text-sm">
                      <div className="font-medium">
                        {savingsGap > 0 ? "Unaccounted Spending" : "Budget Gap"}
                      </div>
                      <p className="text-muted-foreground">
                        {savingsGap > 0
                          ? `Your stated savings (${formatCurrency(
                              monthlySavings
                            )}) exceeds income minus spending by ${formatCurrency(
                              savingsGap
                            )}. You may have missing expenses.`
                          : `Your spending exceeds income minus savings by ${formatCurrency(
                              Math.abs(savingsGap)
                            )}. Check your numbers.`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Retirement Spending Adjustment */}
      <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-purple-600" />
            Retirement Spending Projection
          </CardTitle>
          <CardDescription>
            In retirement, some costs go down (commute), some go up (healthcare)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="retirement-adjustment">
                Apply Retirement Adjustments
              </Label>
              <p className="text-xs text-muted-foreground">
                Automatically adjust spending based on typical retirement
                changes
              </p>
            </div>
            <Switch
              id="retirement-adjustment"
              checked={showRetirementAdjustment}
              onCheckedChange={setShowRetirementAdjustment}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border">
              <div className="text-sm text-muted-foreground mb-1">
                Current Monthly
              </div>
              <div className="text-2xl font-bold">
                {formatCurrency(totalMonthlySpending)}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border flex items-center justify-center">
              <TrendingDown className="h-6 w-6 text-purple-600" />
            </div>
            <div className="bg-purple-100 dark:bg-purple-900/30 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
              <div className="text-sm text-purple-700 dark:text-purple-300 mb-1">
                Retirement Monthly
              </div>
              <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {formatCurrency(
                  showRetirementAdjustment
                    ? retirementAdjustedSpending
                    : totalMonthlySpending
                )}
              </div>
              {showRetirementAdjustment &&
                totalMonthlySpending > 0 &&
                retirementAdjustedSpending !== totalMonthlySpending && (
                  <div className="text-xs text-purple-600 mt-1">
                    {retirementAdjustedSpending < totalMonthlySpending ? (
                      <>
                        <TrendingDown className="h-3 w-3 inline mr-1" />
                        {formatPercent(
                          ((totalMonthlySpending - retirementAdjustedSpending) /
                            totalMonthlySpending) *
                            100
                        )}{" "}
                        reduction
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-3 w-3 inline mr-1" />
                        {formatPercent(
                          ((retirementAdjustedSpending - totalMonthlySpending) /
                            totalMonthlySpending) *
                            100
                        )}{" "}
                        increase
                      </>
                    )}
                  </div>
                )}
            </div>
          </div>

          {/* Adjustment Breakdown */}
          {showRetirementAdjustment && totalMonthlySpending > 0 && (
            <div className="pt-2 space-y-2">
              <div className="text-sm font-medium">Adjustment Breakdown:</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {SPENDING_CATEGORIES.filter(
                  (c) =>
                    c.retirementAdjustment !== 1 && categoryTotals[c.id] > 0
                ).map((category) => {
                  const current = categoryTotals[category.id] || 0;
                  const adjusted = current * category.retirementAdjustment;
                  const diff = adjusted - current;

                  return (
                    <div
                      key={category.id}
                      className="flex items-center justify-between p-2 bg-white dark:bg-gray-900 rounded border"
                    >
                      <span className="flex items-center gap-1">
                        {category.icon}
                        {category.name}
                      </span>
                      <span
                        className={cn(
                          "font-mono",
                          diff < 0 ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {diff < 0 ? "" : "+"}
                        {formatCurrency(diff)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Apply to Calculator Button */}
          {totalMonthlySpending > 0 && (
            <button
              onClick={applyToCalculator}
              className="w-full mt-4 py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              type="button"
            >
              <Calculator className="h-4 w-4" />
              Use This Spending in Calculator
            </button>
          )}
        </CardContent>
      </Card>

      {/* Spending Optimization Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-2 border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-600" />
              Spending Optimization Opportunities
            </CardTitle>
            <CardDescription>
              Big wins: Housing, transportation, and food are the largest levers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestions.slice(0, 5).map((suggestion, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-4 rounded-lg border flex items-start gap-3",
                  suggestion.severity === "warning"
                    ? "bg-orange-50 border-orange-200 dark:bg-orange-950/20"
                    : "bg-blue-50 border-blue-200 dark:bg-blue-950/20"
                )}
              >
                <div
                  className={cn(
                    "mt-0.5",
                    suggestion.severity === "warning"
                      ? "text-orange-600"
                      : "text-blue-600"
                  )}
                >
                  {suggestion.icon}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{suggestion.message}</div>
                  {suggestion.potential > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      Potential monthly savings:{" "}
                      <span className="font-semibold text-green-600">
                        {formatCurrency(suggestion.potential)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {suggestions.length > 0 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">
                    Total Potential Monthly Savings:
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    {formatCurrency(
                      suggestions.reduce((sum, s) => sum + s.potential, 0)
                    )}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  That&apos;s{" "}
                  {formatCurrency(
                    suggestions.reduce((sum, s) => sum + s.potential, 0) * 12
                  )}{" "}
                  per year you could redirect to savings
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Educational Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold mb-2">
                Why Spending Analysis Matters
              </div>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>
                  Most retirement calculators assume a fixed expense ratio -
                  your actual spending may differ significantly
                </li>
                <li>
                  Understanding where your money goes today helps project future
                  needs more accurately
                </li>
                <li>
                  The 4% rule assumes constant spending - but retirement
                  spending often follows a &quot;smile&quot; curve (higher early, lower
                  mid, higher late)
                </li>
                <li>
                  Healthcare costs typically increase 5-7% annually vs 2-3%
                  general inflation
                </li>
                <li>
                  Mortgage payoff and empty nest can significantly reduce
                  housing and kid-related expenses
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Named export for flexibility
export { SpendingAnalysis };
