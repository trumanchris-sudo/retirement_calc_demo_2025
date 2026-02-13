"use client";

import React, { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
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
  Home,
  Heart,
  ShoppingBag,
  Receipt,
  TrendingDown,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Info,
  Car,
  Utensils,
  Plane,
  Tv,
  Gift,
  DollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { fmt, fmtPercent } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface ExpenseCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
  icon: React.ElementType;
  subcategories?: SubCategory[];
}

export interface SubCategory {
  id: string;
  name: string;
  amount: number;
  color: string;
}

export interface SpendingBreakdownProps {
  /** Total annual spending in retirement */
  retirementSpending: number;
  /** Total annual spending before retirement (for comparison) */
  preRetirementSpending?: number;
  /** Custom expense categories (optional - uses defaults if not provided) */
  categories?: ExpenseCategory[];
  /** Whether to show the comparison view */
  showComparison?: boolean;
  /** Whether the component is in loading state */
  isLoading?: boolean;
  /** Callback when user clicks optimize */
  onOptimize?: (categoryId: string, suggestion: string) => void;
  /** Annual income (for context) */
  annualIncome?: number;
}

// ============================================================================
// Constants & Data
// ============================================================================

// National average spending percentages for retirees (BLS Consumer Expenditure Survey)
const NATIONAL_AVERAGES = {
  housing: 0.33,
  healthcare: 0.14,
  transportation: 0.12,
  food: 0.13,
  entertainment: 0.05,
  discretionary: 0.08,
  taxes: 0.10,
  other: 0.05,
};

// Category colors - beautiful gradient-friendly palette
const CATEGORY_COLORS = {
  housing: "#3B82F6", // Blue
  healthcare: "#EF4444", // Red
  transportation: "#8B5CF6", // Purple
  food: "#F59E0B", // Amber
  entertainment: "#EC4899", // Pink
  discretionary: "#10B981", // Emerald
  taxes: "#6B7280", // Gray
  other: "#14B8A6", // Teal
};

// Icons for each category
const CATEGORY_ICONS = {
  housing: Home,
  healthcare: Heart,
  transportation: Car,
  food: Utensils,
  entertainment: Tv,
  discretionary: ShoppingBag,
  taxes: Receipt,
  other: Gift,
};

// Default retirement spending breakdown (typical retiree)
const getDefaultCategories = (totalSpending: number): ExpenseCategory[] => [
  {
    id: "housing",
    name: "Housing",
    amount: totalSpending * 0.30,
    color: CATEGORY_COLORS.housing,
    icon: Home,
    subcategories: [
      { id: "mortgage", name: "Mortgage/Rent", amount: totalSpending * 0.15, color: "#60A5FA" },
      { id: "utilities", name: "Utilities", amount: totalSpending * 0.05, color: "#93C5FD" },
      { id: "maintenance", name: "Maintenance", amount: totalSpending * 0.05, color: "#BFDBFE" },
      { id: "insurance_home", name: "Home Insurance", amount: totalSpending * 0.03, color: "#DBEAFE" },
      { id: "property_tax", name: "Property Tax", amount: totalSpending * 0.02, color: "#2563EB" },
    ],
  },
  {
    id: "healthcare",
    name: "Healthcare",
    amount: totalSpending * 0.18,
    color: CATEGORY_COLORS.healthcare,
    icon: Heart,
    subcategories: [
      { id: "insurance_health", name: "Health Insurance", amount: totalSpending * 0.08, color: "#F87171" },
      { id: "medications", name: "Medications", amount: totalSpending * 0.04, color: "#FCA5A5" },
      { id: "medical_services", name: "Medical Services", amount: totalSpending * 0.04, color: "#FECACA" },
      { id: "dental_vision", name: "Dental & Vision", amount: totalSpending * 0.02, color: "#DC2626" },
    ],
  },
  {
    id: "transportation",
    name: "Transportation",
    amount: totalSpending * 0.10,
    color: CATEGORY_COLORS.transportation,
    icon: Car,
    subcategories: [
      { id: "car_payment", name: "Car Payment/Lease", amount: totalSpending * 0.03, color: "#A78BFA" },
      { id: "gas", name: "Gas & Fuel", amount: totalSpending * 0.03, color: "#C4B5FD" },
      { id: "insurance_auto", name: "Auto Insurance", amount: totalSpending * 0.02, color: "#DDD6FE" },
      { id: "maintenance_auto", name: "Maintenance", amount: totalSpending * 0.02, color: "#7C3AED" },
    ],
  },
  {
    id: "food",
    name: "Food",
    amount: totalSpending * 0.12,
    color: CATEGORY_COLORS.food,
    icon: Utensils,
    subcategories: [
      { id: "groceries", name: "Groceries", amount: totalSpending * 0.08, color: "#FBBF24" },
      { id: "dining_out", name: "Dining Out", amount: totalSpending * 0.04, color: "#FCD34D" },
    ],
  },
  {
    id: "entertainment",
    name: "Entertainment",
    amount: totalSpending * 0.08,
    color: CATEGORY_COLORS.entertainment,
    icon: Tv,
    subcategories: [
      { id: "travel", name: "Travel", amount: totalSpending * 0.04, color: "#F472B6" },
      { id: "hobbies", name: "Hobbies", amount: totalSpending * 0.02, color: "#F9A8D4" },
      { id: "subscriptions", name: "Subscriptions", amount: totalSpending * 0.02, color: "#DB2777" },
    ],
  },
  {
    id: "discretionary",
    name: "Discretionary",
    amount: totalSpending * 0.07,
    color: CATEGORY_COLORS.discretionary,
    icon: ShoppingBag,
    subcategories: [
      { id: "clothing", name: "Clothing", amount: totalSpending * 0.02, color: "#34D399" },
      { id: "personal_care", name: "Personal Care", amount: totalSpending * 0.02, color: "#6EE7B7" },
      { id: "gifts", name: "Gifts & Donations", amount: totalSpending * 0.03, color: "#059669" },
    ],
  },
  {
    id: "taxes",
    name: "Taxes",
    amount: totalSpending * 0.10,
    color: CATEGORY_COLORS.taxes,
    icon: Receipt,
    subcategories: [
      { id: "federal_tax", name: "Federal Income Tax", amount: totalSpending * 0.06, color: "#9CA3AF" },
      { id: "state_tax", name: "State Income Tax", amount: totalSpending * 0.03, color: "#D1D5DB" },
      { id: "other_tax", name: "Other Taxes", amount: totalSpending * 0.01, color: "#4B5563" },
    ],
  },
  {
    id: "other",
    name: "Other",
    amount: totalSpending * 0.05,
    color: CATEGORY_COLORS.other,
    icon: Gift,
    subcategories: [
      { id: "miscellaneous", name: "Miscellaneous", amount: totalSpending * 0.03, color: "#2DD4BF" },
      { id: "emergency_fund", name: "Emergency Fund", amount: totalSpending * 0.02, color: "#5EEAD4" },
    ],
  },
];

// Pre-retirement spending (working years - typically higher income, different priorities)
const getPreRetirementCategories = (totalSpending: number): ExpenseCategory[] => [
  {
    id: "housing",
    name: "Housing",
    amount: totalSpending * 0.28,
    color: CATEGORY_COLORS.housing,
    icon: Home,
  },
  {
    id: "healthcare",
    name: "Healthcare",
    amount: totalSpending * 0.08,
    color: CATEGORY_COLORS.healthcare,
    icon: Heart,
  },
  {
    id: "transportation",
    name: "Transportation",
    amount: totalSpending * 0.15,
    color: CATEGORY_COLORS.transportation,
    icon: Car,
  },
  {
    id: "food",
    name: "Food",
    amount: totalSpending * 0.12,
    color: CATEGORY_COLORS.food,
    icon: Utensils,
  },
  {
    id: "entertainment",
    name: "Entertainment",
    amount: totalSpending * 0.06,
    color: CATEGORY_COLORS.entertainment,
    icon: Tv,
  },
  {
    id: "discretionary",
    name: "Discretionary",
    amount: totalSpending * 0.10,
    color: CATEGORY_COLORS.discretionary,
    icon: ShoppingBag,
  },
  {
    id: "taxes",
    name: "Taxes",
    amount: totalSpending * 0.18,
    color: CATEGORY_COLORS.taxes,
    icon: Receipt,
  },
  {
    id: "other",
    name: "Other",
    amount: totalSpending * 0.03,
    color: CATEGORY_COLORS.other,
    icon: Gift,
  },
];

// Optimization recommendations by category
const OPTIMIZATION_TIPS: Record<string, { title: string; tips: string[]; potentialSavings: string }> = {
  housing: {
    title: "Housing Optimization",
    tips: [
      "Consider downsizing to a smaller home after kids leave",
      "Relocate to a lower cost-of-living area",
      "Pay off mortgage before retirement to eliminate monthly payments",
      "Look into reverse mortgage options for home equity access",
      "Review property tax exemptions for seniors",
    ],
    potentialSavings: "10-30%",
  },
  healthcare: {
    title: "Healthcare Cost Management",
    tips: [
      "Maximize HSA contributions while working for tax-free healthcare savings",
      "Compare Medicare Advantage vs Original Medicare + Medigap",
      "Use generic medications when available",
      "Consider medical tourism for elective procedures",
      "Take advantage of preventive care (covered 100% by Medicare)",
    ],
    potentialSavings: "15-25%",
  },
  transportation: {
    title: "Transportation Savings",
    tips: [
      "Downsize to one car if feasible",
      "Consider public transportation or ride-sharing",
      "Move to a walkable community",
      "Buy reliable used cars instead of new",
      "Bundle auto insurance for discounts",
    ],
    potentialSavings: "20-40%",
  },
  food: {
    title: "Food Budget Optimization",
    tips: [
      "Meal planning reduces waste and impulse purchases",
      "Senior discounts at many restaurants (typically 10-15%)",
      "Cook at home more often - healthier and cheaper",
      "Buy in bulk for non-perishables",
      "Grow a small vegetable garden",
    ],
    potentialSavings: "15-25%",
  },
  entertainment: {
    title: "Entertainment & Travel",
    tips: [
      "Travel during off-peak seasons for 30-50% savings",
      "Senior discounts at museums, movies, and attractions",
      "Use credit card rewards for travel expenses",
      "Consider house-sitting or home exchanges",
      "Explore free community events and activities",
    ],
    potentialSavings: "20-35%",
  },
  discretionary: {
    title: "Discretionary Spending",
    tips: [
      "Wait 48 hours before non-essential purchases",
      "Use cashback and rewards programs strategically",
      "Shop seasonal sales for clothing",
      "Consider secondhand for quality items",
      "Set a monthly discretionary budget",
    ],
    potentialSavings: "25-40%",
  },
  taxes: {
    title: "Tax Optimization Strategies",
    tips: [
      "Roth conversions during low-income years",
      "Tax-loss harvesting in taxable accounts",
      "Qualified Charitable Distributions (QCDs) after 70.5",
      "Strategic Social Security claiming",
      "Consider relocating to a tax-friendly state",
    ],
    potentialSavings: "15-35%",
  },
  other: {
    title: "Other Expenses",
    tips: [
      "Review and cancel unused subscriptions",
      "Negotiate better rates on recurring services",
      "Consider bundling insurance policies",
      "Build and maintain an emergency fund",
      "Review estate planning to minimize costs",
    ],
    potentialSavings: "10-20%",
  },
};

// ============================================================================
// Sub-Components
// ============================================================================

interface AnimatedPieChartProps {
  data: ExpenseCategory[];
  onCategoryClick: (category: ExpenseCategory) => void;
  selectedCategory: string | null;
  totalSpending: number;
}

const AnimatedPieChart: React.FC<AnimatedPieChartProps> = ({
  data,
  onCategoryClick,
  selectedCategory,
  totalSpending,
}) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const pieData = useMemo(
    () =>
      data.map((cat) => ({
        ...cat,
        value: cat.amount,
        percentage: (cat.amount / totalSpending) * 100,
      })),
    [data, totalSpending]
  );

  const handlePieEnter = useCallback((_: unknown, index: number) => {
    setActiveIndex(index);
  }, []);

  const handlePieLeave = useCallback(() => {
    setActiveIndex(null);
  }, []);

  return (
    <div className="relative h-[350px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={pieData}
            cx="50%"
            cy="50%"
            innerRadius={70}
            outerRadius={activeIndex !== null ? 130 : 120}
            paddingAngle={2}
            dataKey="value"
            onMouseEnter={handlePieEnter}
            onMouseLeave={handlePieLeave}
            onClick={(_, index) => onCategoryClick(pieData[index])}
            animationBegin={0}
            animationDuration={800}
            animationEasing="ease-out"
          >
            {pieData.map((entry, index) => (
              <Cell
                key={`cell-${entry.id}`}
                fill={entry.color}
                stroke={selectedCategory === entry.id ? "#fff" : "transparent"}
                strokeWidth={selectedCategory === entry.id ? 3 : 0}
                style={{
                  filter:
                    activeIndex === index
                      ? "drop-shadow(0 4px 12px rgba(0,0,0,0.3))"
                      : selectedCategory === entry.id
                      ? "drop-shadow(0 2px 8px rgba(0,0,0,0.2))"
                      : "none",
                  cursor: "pointer",
                  transform: activeIndex === index ? "scale(1.05)" : "scale(1)",
                  transformOrigin: "center",
                  transition: "all 0.2s ease-out",
                }}
              />
            ))}
          </Pie>
          <Tooltip
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const data = payload[0].payload;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl p-3"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: data.color }}
                      />
                      <span className="font-semibold">{data.name}</span>
                    </div>
                    <div className="text-lg font-bold">{fmt(data.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      {data.percentage.toFixed(1)}% of total
                    </div>
                  </motion.div>
                );
              }
              return null;
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <div className="text-sm text-muted-foreground">Annual Total</div>
          <div className="text-2xl font-bold">{fmt(totalSpending)}</div>
          <div className="text-xs text-muted-foreground">
            {fmt(totalSpending / 12)}/month
          </div>
        </motion.div>
      </div>
    </div>
  );
};

interface CategoryLegendProps {
  data: ExpenseCategory[];
  selectedCategory: string | null;
  onCategoryClick: (category: ExpenseCategory) => void;
}

const CategoryLegend: React.FC<CategoryLegendProps> = ({
  data,
  selectedCategory,
  onCategoryClick,
}) => {
  const totalSpending = useMemo(
    () => data.reduce((sum, cat) => sum + cat.amount, 0),
    [data]
  );

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {data.map((category, index) => {
        const Icon = category.icon;
        const percentage = (category.amount / totalSpending) * 100;
        const isSelected = selectedCategory === category.id;

        return (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onCategoryClick(category)}
            className={cn(
              "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
              "hover:shadow-md hover:border-primary/50",
              isSelected
                ? "bg-primary/10 border-primary shadow-md"
                : "bg-background border-border"
            )}
          >
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${category.color}20` }}
            >
              <Icon className="h-4 w-4" style={{ color: category.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{category.name}</div>
              <div className="text-xs text-muted-foreground">
                {percentage.toFixed(0)}%
              </div>
            </div>
            <ChevronRight
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isSelected && "rotate-90"
              )}
            />
          </motion.button>
        );
      })}
    </div>
  );
};

interface CategoryDrilldownProps {
  category: ExpenseCategory;
  nationalAverage: number;
  totalSpending: number;
  onBack: () => void;
  onOptimize?: (categoryId: string, suggestion: string) => void;
}

const CategoryDrilldown: React.FC<CategoryDrilldownProps> = ({
  category,
  nationalAverage,
  totalSpending,
  onBack,
  onOptimize,
}) => {
  const Icon = category.icon;
  const categoryPercentage = (category.amount / totalSpending) * 100;
  const nationalPercentage = nationalAverage * 100;
  const variance = categoryPercentage - nationalPercentage;
  const tips = OPTIMIZATION_TIPS[category.id] || OPTIMIZATION_TIPS.other;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div
            className="p-3 rounded-xl"
            style={{ backgroundColor: `${category.color}20` }}
          >
            <Icon className="h-6 w-6" style={{ color: category.color }} />
          </div>
          <div>
            <h3 className="text-xl font-bold">{category.name}</h3>
            <p className="text-sm text-muted-foreground">
              {fmt(category.amount)}/year ({fmt(category.amount / 12)}/month)
            </p>
          </div>
        </div>
      </div>

      {/* Comparison to National Average */}
      <div className="bg-muted/50 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Your Spending</span>
          <span className="font-bold">{categoryPercentage.toFixed(1)}%</span>
        </div>
        <div className="relative h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(categoryPercentage * 2, 100)}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute inset-y-0 left-0 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <div
            className="absolute inset-y-0 w-0.5 bg-foreground/70"
            style={{ left: `${Math.min(nationalPercentage * 2, 100)}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            National Average: {nationalPercentage.toFixed(1)}%
          </span>
          <Badge
            variant={variance > 0 ? "destructive" : "default"}
            className={cn(
              "text-xs",
              variance <= 0 && "bg-green-500/10 text-green-600 hover:bg-green-500/20"
            )}
          >
            {variance > 0 ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {Math.abs(variance).toFixed(1)}% {variance > 0 ? "above" : "below"}
          </Badge>
        </div>
      </div>

      {/* Subcategories Breakdown */}
      {category.subcategories && category.subcategories.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Breakdown
          </h4>
          <div className="space-y-2">
            {category.subcategories.map((sub, index) => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between p-3 bg-background rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: sub.color }}
                  />
                  <span className="text-sm">{sub.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-medium">{fmt(sub.amount)}</div>
                  <div className="text-xs text-muted-foreground">
                    {((sub.amount / category.amount) * 100).toFixed(0)}% of{" "}
                    {category.name}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Optimization Recommendations */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-amber-500" />
            Optimization Tips
          </h4>
          <Badge variant="outline" className="text-xs">
            Potential Savings: {tips.potentialSavings}
          </Badge>
        </div>
        <div className="space-y-2">
          {tips.tips.map((tip, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.05 }}
              className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900"
            >
              <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-green-800 dark:text-green-200">
                {tip}
              </span>
            </motion.div>
          ))}
        </div>
        {onOptimize && (
          <Button
            variant="outline"
            className="w-full mt-3 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950/30"
            onClick={() => onOptimize(category.id, tips.tips[0])}
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Apply Optimization Suggestions
          </Button>
        )}
      </div>
    </motion.div>
  );
};

interface ComparisonViewProps {
  retirementCategories: ExpenseCategory[];
  preRetirementCategories: ExpenseCategory[];
  retirementTotal: number;
  preRetirementTotal: number;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  retirementCategories,
  preRetirementCategories,
  retirementTotal,
  preRetirementTotal,
}) => {
  const comparisonData = useMemo(() => {
    return retirementCategories.map((retCat) => {
      const preCat = preRetirementCategories.find((c) => c.id === retCat.id);
      return {
        name: retCat.name,
        retirement: (retCat.amount / retirementTotal) * 100,
        preRetirement: preCat
          ? (preCat.amount / preRetirementTotal) * 100
          : 0,
        retirementAmount: retCat.amount,
        preRetirementAmount: preCat?.amount || 0,
        color: retCat.color,
      };
    });
  }, [retirementCategories, preRetirementCategories, retirementTotal, preRetirementTotal]);

  const totalChange = retirementTotal - preRetirementTotal;
  const percentChange = (totalChange / preRetirementTotal) * 100;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-4 border border-blue-200 dark:border-blue-900"
        >
          <div className="text-sm text-blue-600 dark:text-blue-400 mb-1">
            Pre-Retirement Spending
          </div>
          <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
            {fmt(preRetirementTotal)}
          </div>
          <div className="text-xs text-blue-600/70 dark:text-blue-400/70">
            {fmt(preRetirementTotal / 12)}/month
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-green-50 dark:bg-green-950/20 rounded-xl p-4 border border-green-200 dark:border-green-900"
        >
          <div className="text-sm text-green-600 dark:text-green-400 mb-1">
            Retirement Spending
          </div>
          <div className="text-2xl font-bold text-green-900 dark:text-green-100">
            {fmt(retirementTotal)}
          </div>
          <div className="text-xs text-green-600/70 dark:text-green-400/70">
            {fmt(retirementTotal / 12)}/month
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={cn(
            "rounded-xl p-4 border",
            totalChange < 0
              ? "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900"
              : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900"
          )}
        >
          <div
            className={cn(
              "text-sm mb-1",
              totalChange < 0
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-amber-600 dark:text-amber-400"
            )}
          >
            Change in Spending
          </div>
          <div
            className={cn(
              "text-2xl font-bold flex items-center gap-2",
              totalChange < 0
                ? "text-emerald-900 dark:text-emerald-100"
                : "text-amber-900 dark:text-amber-100"
            )}
          >
            {totalChange < 0 ? (
              <TrendingDown className="h-6 w-6" />
            ) : (
              <TrendingUp className="h-6 w-6" />
            )}
            {fmt(Math.abs(totalChange))}
          </div>
          <div
            className={cn(
              "text-xs",
              totalChange < 0
                ? "text-emerald-600/70 dark:text-emerald-400/70"
                : "text-amber-600/70 dark:text-amber-400/70"
            )}
          >
            {percentChange > 0 ? "+" : ""}
            {percentChange.toFixed(1)}% {totalChange < 0 ? "savings" : "increase"}
          </div>
        </motion.div>
      </div>

      {/* Comparison Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={comparisonData}
            layout="vertical"
            margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              domain={[0, 40]}
              tickFormatter={(value) => `${value}%`}
              stroke="#9ca3af"
            />
            <YAxis
              type="category"
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl p-3"
                    >
                      <div className="font-semibold mb-2">{data.name}</div>
                      <div className="space-y-1 text-sm">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-blue-600">Pre-Retirement:</span>
                          <span className="font-medium">
                            {fmt(data.preRetirementAmount)} (
                            {data.preRetirement.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-green-600">Retirement:</span>
                          <span className="font-medium">
                            {fmt(data.retirementAmount)} (
                            {data.retirement.toFixed(1)}%)
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="preRetirement"
              fill="#3B82F6"
              name="Pre-Retirement"
              radius={[0, 4, 4, 0]}
              animationDuration={800}
            />
            <Bar
              dataKey="retirement"
              fill="#10B981"
              name="Retirement"
              radius={[0, 4, 4, 0]}
              animationDuration={800}
              animationBegin={400}
            />
            <Legend />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Key Insights */}
      <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div>
            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Key Spending Changes in Retirement
            </div>
            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
              <li>
                <strong>Healthcare costs typically increase 50-100%</strong> as
                you age and lose employer coverage
              </li>
              <li>
                <strong>Transportation costs often decrease 30-50%</strong> with
                no daily commute
              </li>
              <li>
                <strong>Taxes typically decrease</strong> as income sources
                change and you may qualify for senior exemptions
              </li>
              <li>
                <strong>Entertainment may increase initially</strong> in early
                retirement, then decrease over time
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

interface NationalAverageComparisonProps {
  categories: ExpenseCategory[];
  totalSpending: number;
}

const NationalAverageComparison: React.FC<NationalAverageComparisonProps> = ({
  categories,
  totalSpending,
}) => {
  const comparisonData = useMemo(() => {
    return categories.map((cat) => {
      const nationalAvg =
        NATIONAL_AVERAGES[cat.id as keyof typeof NATIONAL_AVERAGES] || 0.05;
      const userPercent = cat.amount / totalSpending;
      const variance = userPercent - nationalAvg;
      return {
        ...cat,
        nationalAverage: nationalAvg * 100,
        userPercent: userPercent * 100,
        variance: variance * 100,
        status:
          Math.abs(variance) < 0.02
            ? "normal"
            : variance > 0
            ? "high"
            : "low",
      };
    });
  }, [categories, totalSpending]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Compared to national averages for retired households (BLS Consumer
          Expenditure Survey)
        </span>
      </div>

      <div className="space-y-3">
        {comparisonData.map((item, index) => {
          const Icon = item.icon;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-background rounded-lg border"
            >
              <div
                className="p-2 rounded-lg"
                style={{ backgroundColor: `${item.color}20` }}
              >
                <Icon className="h-5 w-5" style={{ color: item.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      National: {item.nationalAverage.toFixed(0)}%
                    </span>
                    <Badge
                      variant={
                        item.status === "high"
                          ? "destructive"
                          : item.status === "low"
                          ? "default"
                          : "secondary"
                      }
                      className={cn(
                        "text-xs",
                        item.status === "low" &&
                          "bg-green-500/10 text-green-600 hover:bg-green-500/20"
                      )}
                    >
                      {item.status === "high" ? (
                        <AlertTriangle className="h-3 w-3 mr-1" />
                      ) : item.status === "low" ? (
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                      ) : null}
                      {item.userPercent.toFixed(0)}%
                    </Badge>
                  </div>
                </div>

                <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                  {/* National average marker */}
                  <div
                    className="absolute inset-y-0 w-0.5 bg-foreground/50 z-10"
                    style={{
                      left: `${Math.min(item.nationalAverage * 2.5, 100)}%`,
                    }}
                  />
                  {/* User spending bar */}
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(item.userPercent * 2.5, 100)}%`,
                    }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      item.status === "high"
                        ? "bg-red-500"
                        : item.status === "low"
                        ? "bg-green-500"
                        : "bg-blue-500"
                    )}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export const SpendingBreakdown = React.memo(function SpendingBreakdown({
  retirementSpending,
  preRetirementSpending,
  categories: customCategories,
  showComparison = true,
  isLoading = false,
  onOptimize,
  annualIncome,
}: SpendingBreakdownProps) {
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(
    null
  );
  const [activeTab, setActiveTab] = useState<string>("breakdown");

  // Use custom categories or generate defaults
  const retirementCategories = useMemo(
    () => customCategories || getDefaultCategories(retirementSpending),
    [customCategories, retirementSpending]
  );

  const preRetirementCategories = useMemo(
    () =>
      preRetirementSpending
        ? getPreRetirementCategories(preRetirementSpending)
        : [],
    [preRetirementSpending]
  );

  const totalRetirementSpending = useMemo(
    () => retirementCategories.reduce((sum, cat) => sum + cat.amount, 0),
    [retirementCategories]
  );

  const handleCategoryClick = useCallback((category: ExpenseCategory) => {
    setSelectedCategory((prev) =>
      prev?.id === category.id ? null : category
    );
  }, []);

  const handleBack = useCallback(() => {
    setSelectedCategory(null);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary animate-pulse" />
            Spending Breakdown
          </CardTitle>
          <CardDescription>Analyzing your expense categories...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <div className="text-muted-foreground">Loading breakdown...</div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              Spending Breakdown
            </CardTitle>
            <CardDescription>
              Visualize where your retirement dollars go
            </CardDescription>
          </div>
          {annualIncome && (
            <Badge variant="outline" className="text-xs">
              {fmtPercent(totalRetirementSpending / annualIncome)} of income
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
            <TabsTrigger value="comparison" disabled={!preRetirementSpending}>
              Comparison
            </TabsTrigger>
            <TabsTrigger value="national">vs National</TabsTrigger>
          </TabsList>

          <TabsContent value="breakdown" className="mt-6">
            <AnimatePresence mode="wait">
              {selectedCategory ? (
                <CategoryDrilldown
                  key="drilldown"
                  category={selectedCategory}
                  nationalAverage={
                    NATIONAL_AVERAGES[
                      selectedCategory.id as keyof typeof NATIONAL_AVERAGES
                    ] || 0.05
                  }
                  totalSpending={totalRetirementSpending}
                  onBack={handleBack}
                  onOptimize={onOptimize}
                />
              ) : (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-6"
                >
                  <AnimatedPieChart
                    data={retirementCategories}
                    onCategoryClick={handleCategoryClick}
                    selectedCategory={null}
                    totalSpending={totalRetirementSpending}
                  />
                  <CategoryLegend
                    data={retirementCategories}
                    selectedCategory={null}
                    onCategoryClick={handleCategoryClick}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            {preRetirementSpending && (
              <ComparisonView
                retirementCategories={retirementCategories}
                preRetirementCategories={preRetirementCategories}
                retirementTotal={totalRetirementSpending}
                preRetirementTotal={preRetirementSpending}
              />
            )}
          </TabsContent>

          <TabsContent value="national" className="mt-6">
            <NationalAverageComparison
              categories={retirementCategories}
              totalSpending={totalRetirementSpending}
            />
          </TabsContent>
        </Tabs>

        {/* Quick Insights Footer */}
        {!selectedCategory && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="border-t pt-4"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Pro tip:</span>{" "}
                Click on any category to see detailed breakdowns, subcategories,
                and personalized optimization recommendations.
              </div>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
});

export default SpendingBreakdown;
