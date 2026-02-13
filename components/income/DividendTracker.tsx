"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  TrendingUp,
  Calendar,
  DollarSign,
  Award,
  RefreshCw,
  PieChart,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Info,
  Crown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Area,
  AreaChart,
  ComposedChart,
  Tooltip,
} from "recharts";
import { cn, fmt, fmtFull, fmtPctRaw } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface DividendHolding {
  id: string;
  ticker: string;
  shares: number;
  costBasis: number;
  currentPrice: number;
  annualDividend: number;
  dividendFrequency: "monthly" | "quarterly" | "semi-annual" | "annual";
  exDividendMonth: number; // 1-12 for quarterly, 1-12 for monthly payments
  dividendGrowthRate: number; // Annual growth rate %
  yearsOfGrowth: number; // Consecutive years of dividend growth
  isQualified: boolean;
  dripEnabled: boolean;
}

export interface DividendTrackerProps {
  /** Initial holdings (optional) */
  initialHoldings?: DividendHolding[];
  /** Callback when holdings change */
  onHoldingsChange?: (holdings: DividendHolding[]) => void;
  /** Number of years to project */
  projectionYears?: number;
  /** Tax rate for qualified dividends */
  qualifiedTaxRate?: number;
  /** Tax rate for non-qualified dividends */
  nonQualifiedTaxRate?: number;
  /** Expected annual share price appreciation */
  priceAppreciationRate?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DIVIDEND_ARISTOCRAT_YEARS = 25;
const DIVIDEND_KING_YEARS = 50;
const DIVIDEND_ACHIEVER_YEARS = 10;

const FREQUENCY_PAYMENTS: Record<DividendHolding["dividendFrequency"], number> = {
  monthly: 12,
  quarterly: 4,
  "semi-annual": 2,
  annual: 1,
};

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const DEFAULT_HOLDING: Omit<DividendHolding, "id"> = {
  ticker: "",
  shares: 0,
  costBasis: 0,
  currentPrice: 0,
  annualDividend: 0,
  dividendFrequency: "quarterly",
  exDividendMonth: 1,
  dividendGrowthRate: 5,
  yearsOfGrowth: 0,
  isQualified: true,
  dripEnabled: false,
};

const CHART_COLORS = {
  primary: "hsl(221, 83%, 53%)",
  secondary: "hsl(142, 71%, 45%)",
  tertiary: "hsl(262, 83%, 58%)",
  quaternary: "hsl(25, 95%, 53%)",
  qualified: "hsl(142, 71%, 45%)",
  nonQualified: "hsl(0, 84%, 60%)",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const calculateYieldOnCost = (annualDividend: number, costBasis: number): number => {
  if (costBasis <= 0) return 0;
  return (annualDividend / costBasis) * 100;
};

const calculateCurrentYield = (annualDividend: number, currentPrice: number): number => {
  if (currentPrice <= 0) return 0;
  return (annualDividend / currentPrice) * 100;
};

const getDividendStatus = (yearsOfGrowth: number): { label: string; color: string; icon: React.ReactNode } => {
  if (yearsOfGrowth >= DIVIDEND_KING_YEARS) {
    return { label: "Dividend King", color: "text-yellow-600 bg-yellow-100 border-yellow-300", icon: <Crown className="w-3 h-3" /> };
  }
  if (yearsOfGrowth >= DIVIDEND_ARISTOCRAT_YEARS) {
    return { label: "Dividend Aristocrat", color: "text-purple-600 bg-purple-100 border-purple-300", icon: <Award className="w-3 h-3" /> };
  }
  if (yearsOfGrowth >= DIVIDEND_ACHIEVER_YEARS) {
    return { label: "Dividend Achiever", color: "text-blue-600 bg-blue-100 border-blue-300", icon: <CheckCircle2 className="w-3 h-3" /> };
  }
  return { label: "", color: "", icon: null };
};

const getExDividendDates = (
  holding: DividendHolding,
  year: number
): Date[] => {
  const dates: Date[] = [];
  const paymentsPerYear = FREQUENCY_PAYMENTS[holding.dividendFrequency];
  const monthInterval = 12 / paymentsPerYear;

  for (let i = 0; i < paymentsPerYear; i++) {
    const month = ((holding.exDividendMonth - 1 + i * monthInterval) % 12);
    dates.push(new Date(year, month, 15)); // Assuming 15th of month
  }

  return dates.sort((a, b) => a.getTime() - b.getTime());
};

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface HoldingRowProps {
  holding: DividendHolding;
  onUpdate: (id: string, updates: Partial<DividendHolding>) => void;
  onDelete: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const HoldingRow: React.FC<HoldingRowProps> = ({
  holding,
  onUpdate,
  onDelete,
  isExpanded,
  onToggleExpand,
}) => {
  const totalValue = holding.shares * holding.currentPrice;
  const totalCost = holding.shares * holding.costBasis;
  const annualIncome = holding.shares * holding.annualDividend;
  const yieldOnCost = calculateYieldOnCost(holding.annualDividend, holding.costBasis);
  const currentYield = calculateCurrentYield(holding.annualDividend, holding.currentPrice);
  const dividendStatus = getDividendStatus(holding.yearsOfGrowth);

  return (
    <div className="border rounded-lg p-4 space-y-4">
      {/* Collapsed View */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleExpand}
            className="p-1 hover:bg-muted rounded"
            aria-label={isExpanded ? "Collapse holding details" : "Expand holding details"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{holding.ticker || "NEW"}</span>
              {dividendStatus.label && (
                <Badge variant="outline" className={cn("flex items-center gap-1 text-xs", dividendStatus.color)}>
                  {dividendStatus.icon}
                  {dividendStatus.label}
                </Badge>
              )}
              {holding.dripEnabled && (
                <Badge variant="secondary" className="text-xs">
                  <RefreshCw className="w-3 h-3 mr-1" />
                  DRIP
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              {holding.shares.toLocaleString()} shares @ {fmt(holding.currentPrice)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Annual Income</div>
            <div className="font-semibold text-green-600">{fmt(annualIncome)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-muted-foreground">Yield on Cost</div>
            <div className="font-semibold">{fmtPctRaw(yieldOnCost, 2)}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(holding.id)}
            className="text-destructive hover:text-destructive"
            aria-label="Delete holding"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Expanded View */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <Label htmlFor={`ticker-${holding.id}`}>Ticker Symbol</Label>
            <Input
              id={`ticker-${holding.id}`}
              value={holding.ticker}
              onChange={(e) => onUpdate(holding.id, { ticker: e.target.value.toUpperCase() })}
              placeholder="AAPL"
              className="uppercase"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`shares-${holding.id}`}>Shares</Label>
            <Input
              id={`shares-${holding.id}`}
              type="number"
              value={holding.shares || ""}
              onChange={(e) => onUpdate(holding.id, { shares: parseFloat(e.target.value) || 0 })}
              placeholder="100"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`costBasis-${holding.id}`}>Cost Basis (per share)</Label>
            <Input
              id={`costBasis-${holding.id}`}
              type="number"
              step="0.01"
              value={holding.costBasis || ""}
              onChange={(e) => onUpdate(holding.id, { costBasis: parseFloat(e.target.value) || 0 })}
              placeholder="50.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`currentPrice-${holding.id}`}>Current Price</Label>
            <Input
              id={`currentPrice-${holding.id}`}
              type="number"
              step="0.01"
              value={holding.currentPrice || ""}
              onChange={(e) => onUpdate(holding.id, { currentPrice: parseFloat(e.target.value) || 0 })}
              placeholder="75.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`annualDividend-${holding.id}`}>Annual Dividend (per share)</Label>
            <Input
              id={`annualDividend-${holding.id}`}
              type="number"
              step="0.01"
              value={holding.annualDividend || ""}
              onChange={(e) => onUpdate(holding.id, { annualDividend: parseFloat(e.target.value) || 0 })}
              placeholder="2.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`frequency-${holding.id}`}>Payment Frequency</Label>
            <select
              id={`frequency-${holding.id}`}
              value={holding.dividendFrequency}
              onChange={(e) => onUpdate(holding.id, { dividendFrequency: e.target.value as DividendHolding["dividendFrequency"] })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="semi-annual">Semi-Annual</option>
              <option value="annual">Annual</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`exMonth-${holding.id}`}>First Ex-Dividend Month</Label>
            <select
              id={`exMonth-${holding.id}`}
              value={holding.exDividendMonth}
              onChange={(e) => onUpdate(holding.id, { exDividendMonth: parseInt(e.target.value) })}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {MONTH_NAMES.map((month, index) => (
                <option key={month} value={index + 1}>{month}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`growthRate-${holding.id}`}>Dividend Growth Rate (%)</Label>
            <Input
              id={`growthRate-${holding.id}`}
              type="number"
              step="0.1"
              value={holding.dividendGrowthRate || ""}
              onChange={(e) => onUpdate(holding.id, { dividendGrowthRate: parseFloat(e.target.value) || 0 })}
              placeholder="5.0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`yearsGrowth-${holding.id}`}>Consecutive Years of Growth</Label>
            <Input
              id={`yearsGrowth-${holding.id}`}
              type="number"
              value={holding.yearsOfGrowth || ""}
              onChange={(e) => onUpdate(holding.id, { yearsOfGrowth: parseInt(e.target.value) || 0 })}
              placeholder="25"
            />
          </div>
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center space-x-2">
              <Switch
                id={`qualified-${holding.id}`}
                checked={holding.isQualified}
                onCheckedChange={(checked) => onUpdate(holding.id, { isQualified: checked })}
              />
              <Label htmlFor={`qualified-${holding.id}`}>Qualified Dividends</Label>
            </div>
          </div>
          <div className="flex items-center gap-4 pt-6">
            <div className="flex items-center space-x-2">
              <Switch
                id={`drip-${holding.id}`}
                checked={holding.dripEnabled}
                onCheckedChange={(checked) => onUpdate(holding.id, { dripEnabled: checked })}
              />
              <Label htmlFor={`drip-${holding.id}`}>DRIP Enabled</Label>
            </div>
          </div>

          {/* Calculated Metrics */}
          <div className="col-span-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-xs text-muted-foreground">Total Value</div>
              <div className="font-semibold">{fmt(totalValue)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Cost</div>
              <div className="font-semibold">{fmt(totalCost)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Current Yield</div>
              <div className="font-semibold">{fmtPctRaw(currentYield, 2)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Gain/Loss</div>
              <div className={cn("font-semibold", totalValue >= totalCost ? "text-green-600" : "text-red-600")}>
                {fmt(totalValue - totalCost)} ({fmtPctRaw(((totalValue - totalCost) / totalCost) * 100, 1)})
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DividendTracker: React.FC<DividendTrackerProps> = ({
  initialHoldings = [],
  onHoldingsChange,
  projectionYears = 20,
  qualifiedTaxRate = 15,
  nonQualifiedTaxRate = 32,
  priceAppreciationRate = 3,
}) => {
  const [holdings, setHoldings] = useState<DividendHolding[]>(
    initialHoldings.length > 0
      ? initialHoldings
      : [{ ...DEFAULT_HOLDING, id: generateId() }]
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set([holdings[0]?.id]));
  const [activeTab, setActiveTab] = useState("overview");

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAddHolding = useCallback(() => {
    const newHolding: DividendHolding = { ...DEFAULT_HOLDING, id: generateId() };
    const newHoldings = [...holdings, newHolding];
    setHoldings(newHoldings);
    setExpandedIds((prev) => new Set([...prev, newHolding.id]));
    onHoldingsChange?.(newHoldings);
  }, [holdings, onHoldingsChange]);

  const handleUpdateHolding = useCallback((id: string, updates: Partial<DividendHolding>) => {
    const newHoldings = holdings.map((h) => (h.id === id ? { ...h, ...updates } : h));
    setHoldings(newHoldings);
    onHoldingsChange?.(newHoldings);
  }, [holdings, onHoldingsChange]);

  const handleDeleteHolding = useCallback((id: string) => {
    const newHoldings = holdings.filter((h) => h.id !== id);
    setHoldings(newHoldings);
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    onHoldingsChange?.(newHoldings);
  }, [holdings, onHoldingsChange]);

  const toggleExpanded = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ============================================================================
  // CALCULATIONS
  // ============================================================================

  const validHoldings = useMemo(() =>
    holdings.filter((h) => h.shares > 0 && h.annualDividend > 0),
    [holdings]
  );

  // Annual dividend income projection
  const annualIncomeProjection = useMemo(() => {
    const data: Array<{
      year: number;
      income: number;
      incomeWithDrip: number;
      cumulativeIncome: number;
      cumulativeWithDrip: number;
    }> = [];

    let cumulativeIncome = 0;
    let cumulativeWithDrip = 0;
    const currentYear = new Date().getFullYear();

    // Track shares for DRIP calculation
    const sharesMap = new Map(validHoldings.map((h) => [h.id, h.shares]));
    const dividendMap = new Map(validHoldings.map((h) => [h.id, h.annualDividend]));
    const priceMap = new Map(validHoldings.map((h) => [h.id, h.currentPrice]));

    for (let year = 0; year <= projectionYears; year++) {
      let yearlyIncome = 0;
      let yearlyIncomeWithDrip = 0;

      validHoldings.forEach((holding) => {
        const growthMultiplier = Math.pow(1 + holding.dividendGrowthRate / 100, year);
        const adjustedDividend = holding.annualDividend * growthMultiplier;

        // Without DRIP
        yearlyIncome += holding.shares * adjustedDividend;

        // With DRIP
        const shares = sharesMap.get(holding.id) || holding.shares;
        const dividend = dividendMap.get(holding.id) || holding.annualDividend;
        const price = priceMap.get(holding.id) || holding.currentPrice;

        const dripIncome = shares * dividend * growthMultiplier;
        yearlyIncomeWithDrip += dripIncome;

        // Reinvest dividends if DRIP enabled
        if (holding.dripEnabled && price > 0) {
          const newShares = dripIncome / price;
          sharesMap.set(holding.id, shares + newShares);
          // Price appreciation
          priceMap.set(holding.id, price * (1 + priceAppreciationRate / 100));
        }

        // Update dividend for next year
        dividendMap.set(holding.id, dividend * (1 + holding.dividendGrowthRate / 100));
      });

      cumulativeIncome += yearlyIncome;
      cumulativeWithDrip += yearlyIncomeWithDrip;

      data.push({
        year: currentYear + year,
        income: Math.round(yearlyIncome),
        incomeWithDrip: Math.round(yearlyIncomeWithDrip),
        cumulativeIncome: Math.round(cumulativeIncome),
        cumulativeWithDrip: Math.round(cumulativeWithDrip),
      });
    }

    return data;
  }, [validHoldings, projectionYears, priceAppreciationRate]);

  // Dividend growth visualization data
  const dividendGrowthData = useMemo(() => {
    return validHoldings.map((holding) => {
      const years = Array.from({ length: 11 }, (_, i) => i);
      const projections = years.map((year) => ({
        year,
        dividend: holding.annualDividend * Math.pow(1 + holding.dividendGrowthRate / 100, year),
      }));
      return {
        ticker: holding.ticker,
        growthRate: holding.dividendGrowthRate,
        projections,
      };
    });
  }, [validHoldings]);

  // Yield on cost calculations
  const yieldOnCostData = useMemo(() => {
    return validHoldings.map((holding) => ({
      ticker: holding.ticker,
      yieldOnCost: calculateYieldOnCost(holding.annualDividend, holding.costBasis),
      currentYield: calculateCurrentYield(holding.annualDividend, holding.currentPrice),
      annualIncome: holding.shares * holding.annualDividend,
    }));
  }, [validHoldings]);

  // Ex-dividend calendar
  const exDividendCalendar = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const calendar: Array<{
      date: Date;
      ticker: string;
      amount: number;
      frequency: string;
    }> = [];

    validHoldings.forEach((holding) => {
      const exDates = getExDividendDates(holding, currentYear);
      const paymentAmount = (holding.shares * holding.annualDividend) / FREQUENCY_PAYMENTS[holding.dividendFrequency];

      exDates.forEach((date) => {
        calendar.push({
          date,
          ticker: holding.ticker,
          amount: paymentAmount,
          frequency: holding.dividendFrequency,
        });
      });
    });

    return calendar.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [validHoldings]);

  // Monthly income breakdown for calendar view
  const monthlyIncomeBreakdown = useMemo(() => {
    const breakdown = MONTH_NAMES.map((month) => ({
      month,
      income: 0,
      holdings: [] as string[],
    }));

    exDividendCalendar.forEach((entry) => {
      const monthIndex = entry.date.getMonth();
      breakdown[monthIndex].income += entry.amount;
      if (!breakdown[monthIndex].holdings.includes(entry.ticker)) {
        breakdown[monthIndex].holdings.push(entry.ticker);
      }
    });

    return breakdown;
  }, [exDividendCalendar]);

  // Dividend aristocrat identification
  const aristocratBreakdown = useMemo(() => {
    const kings = validHoldings.filter((h) => h.yearsOfGrowth >= DIVIDEND_KING_YEARS);
    const aristocrats = validHoldings.filter((h) => h.yearsOfGrowth >= DIVIDEND_ARISTOCRAT_YEARS && h.yearsOfGrowth < DIVIDEND_KING_YEARS);
    const achievers = validHoldings.filter((h) => h.yearsOfGrowth >= DIVIDEND_ACHIEVER_YEARS && h.yearsOfGrowth < DIVIDEND_ARISTOCRAT_YEARS);
    const other = validHoldings.filter((h) => h.yearsOfGrowth < DIVIDEND_ACHIEVER_YEARS);

    return { kings, aristocrats, achievers, other };
  }, [validHoldings]);

  // DRIP impact modeling
  const dripImpactData = useMemo(() => {
    const withDrip = annualIncomeProjection[projectionYears]?.cumulativeWithDrip || 0;
    const withoutDrip = annualIncomeProjection[projectionYears]?.cumulativeIncome || 0;
    const difference = withDrip - withoutDrip;
    const percentIncrease = withoutDrip > 0 ? (difference / withoutDrip) * 100 : 0;

    return {
      withDrip,
      withoutDrip,
      difference,
      percentIncrease,
      yearlyComparison: annualIncomeProjection,
    };
  }, [annualIncomeProjection, projectionYears]);

  // Qualified vs non-qualified breakdown
  const taxBreakdown = useMemo(() => {
    let qualifiedIncome = 0;
    let nonQualifiedIncome = 0;

    validHoldings.forEach((holding) => {
      const income = holding.shares * holding.annualDividend;
      if (holding.isQualified) {
        qualifiedIncome += income;
      } else {
        nonQualifiedIncome += income;
      }
    });

    const qualifiedTax = qualifiedIncome * (qualifiedTaxRate / 100);
    const nonQualifiedTax = nonQualifiedIncome * (nonQualifiedTaxRate / 100);
    const totalTax = qualifiedTax + nonQualifiedTax;
    const totalIncome = qualifiedIncome + nonQualifiedIncome;
    const effectiveTaxRate = totalIncome > 0 ? (totalTax / totalIncome) * 100 : 0;

    return {
      qualifiedIncome,
      nonQualifiedIncome,
      qualifiedTax,
      nonQualifiedTax,
      totalTax,
      totalIncome,
      effectiveTaxRate,
      afterTaxIncome: totalIncome - totalTax,
    };
  }, [validHoldings, qualifiedTaxRate, nonQualifiedTaxRate]);

  // Portfolio summary
  const portfolioSummary = useMemo(() => {
    const totalValue = validHoldings.reduce((sum, h) => sum + h.shares * h.currentPrice, 0);
    const totalCost = validHoldings.reduce((sum, h) => sum + h.shares * h.costBasis, 0);
    const totalAnnualIncome = validHoldings.reduce((sum, h) => sum + h.shares * h.annualDividend, 0);
    const weightedYieldOnCost = totalCost > 0
      ? validHoldings.reduce((sum, h) => {
          const holdingCost = h.shares * h.costBasis;
          return sum + (holdingCost / totalCost) * calculateYieldOnCost(h.annualDividend, h.costBasis);
        }, 0)
      : 0;
    const weightedCurrentYield = totalValue > 0
      ? validHoldings.reduce((sum, h) => {
          const holdingValue = h.shares * h.currentPrice;
          return sum + (holdingValue / totalValue) * calculateCurrentYield(h.annualDividend, h.currentPrice);
        }, 0)
      : 0;
    const avgDividendGrowth = validHoldings.length > 0
      ? validHoldings.reduce((sum, h) => sum + h.dividendGrowthRate, 0) / validHoldings.length
      : 0;

    return {
      totalValue,
      totalCost,
      totalAnnualIncome,
      monthlyIncome: totalAnnualIncome / 12,
      weightedYieldOnCost,
      weightedCurrentYield,
      avgDividendGrowth,
      holdingsCount: validHoldings.length,
      dripEnabledCount: validHoldings.filter((h) => h.dripEnabled).length,
    };
  }, [validHoldings]);

  // Chart configs
  const projectionChartConfig: ChartConfig = {
    income: {
      label: "Without DRIP",
      color: CHART_COLORS.primary,
    },
    incomeWithDrip: {
      label: "With DRIP",
      color: CHART_COLORS.secondary,
    },
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            <CardTitle className="text-2xl">Dividend Income Tracker</CardTitle>
          </div>
          <CardDescription>
            Track your passive income potential with dividend growth projections, DRIP modeling, and tax-efficient planning
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Portfolio Value</div>
            <div className="text-2xl font-bold">{fmt(portfolioSummary.totalValue)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Annual Income</div>
            <div className="text-2xl font-bold text-green-600">{fmt(portfolioSummary.totalAnnualIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Monthly Income</div>
            <div className="text-2xl font-bold text-green-600">{fmt(portfolioSummary.monthlyIncome)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-muted-foreground">Avg Yield on Cost</div>
            <div className="text-2xl font-bold">{fmtPctRaw(portfolioSummary.weightedYieldOnCost, 2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projection">Projections</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="drip">DRIP Impact</TabsTrigger>
          <TabsTrigger value="taxes">Tax Analysis</TabsTrigger>
          <TabsTrigger value="holdings">Holdings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Aristocrat Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-purple-600" />
                Dividend Quality Distribution
              </CardTitle>
              <CardDescription>
                Breakdown by consecutive years of dividend increases
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Crown className="w-4 h-4 text-yellow-600" />
                    <span className="font-semibold text-yellow-800 dark:text-yellow-200">Dividend Kings</span>
                  </div>
                  <div className="text-2xl font-bold">{aristocratBreakdown.kings.length}</div>
                  <div className="text-xs text-muted-foreground">50+ years of growth</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-purple-800 dark:text-purple-200">Aristocrats</span>
                  </div>
                  <div className="text-2xl font-bold">{aristocratBreakdown.aristocrats.length}</div>
                  <div className="text-xs text-muted-foreground">25-49 years of growth</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-800 dark:text-blue-200">Achievers</span>
                  </div>
                  <div className="text-2xl font-bold">{aristocratBreakdown.achievers.length}</div>
                  <div className="text-xs text-muted-foreground">10-24 years of growth</div>
                </div>
                <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-950/20 border border-gray-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold text-gray-800 dark:text-gray-200">Other</span>
                  </div>
                  <div className="text-2xl font-bold">{aristocratBreakdown.other.length}</div>
                  <div className="text-xs text-muted-foreground">&lt;10 years of growth</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Yield on Cost Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Yield on Cost Analysis
              </CardTitle>
              <CardDescription>
                Compare your effective yield based on original purchase price vs current market price
              </CardDescription>
            </CardHeader>
            <CardContent>
              {yieldOnCostData.length > 0 ? (
                <div className="space-y-4">
                  {yieldOnCostData.map((data) => (
                    <div key={data.ticker} className="flex items-center gap-4 p-4 border rounded-lg">
                      <div className="w-20 font-bold">{data.ticker}</div>
                      <div className="flex-1 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Yield on Cost</span>
                          <span className="font-semibold text-green-600">{fmtPctRaw(data.yieldOnCost, 2)}</span>
                        </div>
                        <Progress value={Math.min(data.yieldOnCost * 10, 100)} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Current Yield: {fmtPctRaw(data.currentYield, 2)}</span>
                          <span>Annual Income: {fmt(data.annualIncome)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Add holdings to see yield on cost analysis
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projection Tab */}
        <TabsContent value="projection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                {projectionYears}-Year Income Projection
              </CardTitle>
              <CardDescription>
                Annual dividend income projection with and without dividend reinvestment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {annualIncomeProjection.length > 0 ? (
                <ChartContainer config={projectionChartConfig} className="h-[400px] w-full">
                  <AreaChart data={annualIncomeProjection}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: number) => fmtFull(value)}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="income"
                      name="Without DRIP"
                      stroke={CHART_COLORS.primary}
                      fill={CHART_COLORS.primary}
                      fillOpacity={0.3}
                    />
                    <Area
                      type="monotone"
                      dataKey="incomeWithDrip"
                      name="With DRIP"
                      stroke={CHART_COLORS.secondary}
                      fill={CHART_COLORS.secondary}
                      fillOpacity={0.3}
                    />
                  </AreaChart>
                </ChartContainer>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Add holdings to see income projections
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dividend Growth by Holding */}
          <Card>
            <CardHeader>
              <CardTitle>Dividend Growth by Holding</CardTitle>
              <CardDescription>
                Projected per-share dividend over the next 10 years based on historical growth rates
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dividendGrowthData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" type="number" domain={[0, 10]} />
                      <YAxis tickFormatter={(value) => `$${value.toFixed(2)}`} />
                      <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
                      <Legend />
                      {dividendGrowthData.map((holding, index) => (
                        <Line
                          key={holding.ticker}
                          data={holding.projections}
                          type="monotone"
                          dataKey="dividend"
                          name={`${holding.ticker} (${holding.growthRate}% growth)`}
                          stroke={`hsl(${(index * 50) % 360}, 70%, 50%)`}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Add holdings to see dividend growth projections
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Calendar Tab */}
        <TabsContent value="calendar" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Ex-Dividend Calendar
              </CardTitle>
              <CardDescription>
                Upcoming dividend payment schedule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Monthly Income Chart */}
              <div className="h-[250px] mb-6">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyIncomeBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => fmt(value)} />
                    <Tooltip
                      formatter={(value: number) => fmtFull(value)}
                      labelFormatter={(label) => `${label} Dividends`}
                    />
                    <Bar dataKey="income" fill={CHART_COLORS.secondary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Calendar List */}
              <div className="space-y-2">
                {exDividendCalendar.length > 0 ? (
                  exDividendCalendar.map((entry, index) => (
                    <div
                      key={`${entry.ticker}-${index}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center">
                          <span className="text-xs font-semibold">{MONTH_NAMES[entry.date.getMonth()]}</span>
                          <span className="text-lg font-bold">{entry.date.getDate()}</span>
                        </div>
                        <div>
                          <div className="font-semibold">{entry.ticker}</div>
                          <div className="text-xs text-muted-foreground capitalize">{entry.frequency} Payment</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{fmt(entry.amount)}</div>
                        <div className="text-xs text-muted-foreground">Expected</div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Add holdings to see dividend calendar
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* DRIP Impact Tab */}
        <TabsContent value="drip" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-purple-600" />
                DRIP Impact Analysis
              </CardTitle>
              <CardDescription>
                See how dividend reinvestment compounds your wealth over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="text-sm text-muted-foreground">Cumulative Without DRIP</div>
                  <div className="text-2xl font-bold">{fmt(dripImpactData.withoutDrip)}</div>
                  <div className="text-xs text-muted-foreground">Over {projectionYears} years</div>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                  <div className="text-sm text-muted-foreground">Cumulative With DRIP</div>
                  <div className="text-2xl font-bold text-green-600">{fmt(dripImpactData.withDrip)}</div>
                  <div className="text-xs text-muted-foreground">Over {projectionYears} years</div>
                </div>
                <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200">
                  <div className="text-sm text-muted-foreground">DRIP Advantage</div>
                  <div className="text-2xl font-bold text-purple-600">+{fmt(dripImpactData.difference)}</div>
                  <div className="text-xs text-muted-foreground">+{fmtPctRaw(dripImpactData.percentIncrease, 1)} more income</div>
                </div>
              </div>

              {/* Comparison Chart */}
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={dripImpactData.yearlyComparison}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" />
                    <YAxis yAxisId="left" tickFormatter={(value) => fmt(value)} />
                    <YAxis yAxisId="right" orientation="right" tickFormatter={(value) => fmt(value)} />
                    <Tooltip formatter={(value: number) => fmtFull(value)} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="income" name="Annual (No DRIP)" fill={CHART_COLORS.primary} opacity={0.7} />
                    <Bar yAxisId="left" dataKey="incomeWithDrip" name="Annual (With DRIP)" fill={CHART_COLORS.secondary} opacity={0.7} />
                    <Line yAxisId="right" type="monotone" dataKey="cumulativeWithDrip" name="Cumulative (DRIP)" stroke={CHART_COLORS.tertiary} strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              {/* DRIP Status by Holding */}
              <div className="space-y-2">
                <h4 className="font-semibold">DRIP Status by Holding</h4>
                {validHoldings.map((holding) => (
                  <div
                    key={holding.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-semibold">{holding.ticker}</span>
                      {holding.dripEnabled ? (
                        <Badge variant="default" className="bg-green-600">
                          <RefreshCw className="w-3 h-3 mr-1" />
                          DRIP Active
                        </Badge>
                      ) : (
                        <Badge variant="secondary">DRIP Disabled</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUpdateHolding(holding.id, { dripEnabled: !holding.dripEnabled })}
                    >
                      {holding.dripEnabled ? "Disable" : "Enable"} DRIP
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Analysis Tab */}
        <TabsContent value="taxes" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5 text-orange-600" />
                Qualified vs Non-Qualified Analysis
              </CardTitle>
              <CardDescription>
                Tax efficiency breakdown of your dividend income (assumes {qualifiedTaxRate}% qualified / {nonQualifiedTaxRate}% non-qualified rates)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200">
                  <div className="text-sm text-muted-foreground">Qualified Dividends</div>
                  <div className="text-2xl font-bold text-green-600">{fmt(taxBreakdown.qualifiedIncome)}</div>
                  <div className="text-xs text-muted-foreground">Tax: {fmt(taxBreakdown.qualifiedTax)}</div>
                </div>
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200">
                  <div className="text-sm text-muted-foreground">Non-Qualified Dividends</div>
                  <div className="text-2xl font-bold text-red-600">{fmt(taxBreakdown.nonQualifiedIncome)}</div>
                  <div className="text-xs text-muted-foreground">Tax: {fmt(taxBreakdown.nonQualifiedTax)}</div>
                </div>
                <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200">
                  <div className="text-sm text-muted-foreground">Total Tax</div>
                  <div className="text-2xl font-bold text-orange-600">{fmt(taxBreakdown.totalTax)}</div>
                  <div className="text-xs text-muted-foreground">Effective Rate: {fmtPctRaw(taxBreakdown.effectiveTaxRate, 1)}</div>
                </div>
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200">
                  <div className="text-sm text-muted-foreground">After-Tax Income</div>
                  <div className="text-2xl font-bold text-blue-600">{fmt(taxBreakdown.afterTaxIncome)}</div>
                  <div className="text-xs text-muted-foreground">Annual take-home</div>
                </div>
              </div>

              {/* Pie Chart */}
              {taxBreakdown.totalIncome > 0 && (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={[
                          { name: "Qualified", value: taxBreakdown.qualifiedIncome, fill: CHART_COLORS.qualified },
                          { name: "Non-Qualified", value: taxBreakdown.nonQualifiedIncome, fill: CHART_COLORS.nonQualified },
                        ]}
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        dataKey="value"
                      >
                        <Cell fill={CHART_COLORS.qualified} />
                        <Cell fill={CHART_COLORS.nonQualified} />
                      </Pie>
                      <Tooltip formatter={(value: number) => fmtFull(value)} />
                      <Legend />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Holdings by Qualification Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Qualified Holdings
                  </h4>
                  <div className="space-y-2">
                    {validHoldings.filter((h) => h.isQualified).map((holding) => (
                      <div key={holding.id} className="flex justify-between p-2 bg-green-50 dark:bg-green-950/20 rounded">
                        <span>{holding.ticker}</span>
                        <span className="font-semibold">{fmt(holding.shares * holding.annualDividend)}</span>
                      </div>
                    ))}
                    {validHoldings.filter((h) => h.isQualified).length === 0 && (
                      <div className="text-sm text-muted-foreground">No qualified holdings</div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-600 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Non-Qualified Holdings
                  </h4>
                  <div className="space-y-2">
                    {validHoldings.filter((h) => !h.isQualified).map((holding) => (
                      <div key={holding.id} className="flex justify-between p-2 bg-red-50 dark:bg-red-950/20 rounded">
                        <span>{holding.ticker}</span>
                        <span className="font-semibold">{fmt(holding.shares * holding.annualDividend)}</span>
                      </div>
                    ))}
                    {validHoldings.filter((h) => !h.isQualified).length === 0 && (
                      <div className="text-sm text-muted-foreground">No non-qualified holdings</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tax Optimization Tips */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Info className="w-4 h-4" />
                  Tax Optimization Tips
                </h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Hold dividend stocks for at least 60 days to qualify for lower tax rates</li>
                  <li>Consider holding REITs and bond funds in tax-advantaged accounts</li>
                  <li>Municipal bond funds may offer tax-free income in some states</li>
                  <li>Your effective tax rate of {fmtPctRaw(taxBreakdown.effectiveTaxRate, 1)} is {taxBreakdown.effectiveTaxRate < 20 ? "relatively efficient" : "could be optimized"}</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Holdings Tab */}
        <TabsContent value="holdings" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Dividend Holdings</CardTitle>
                  <CardDescription>
                    Manage your dividend-paying stock positions
                  </CardDescription>
                </div>
                <Button onClick={handleAddHolding} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Add Holding
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {holdings.map((holding) => (
                <HoldingRow
                  key={holding.id}
                  holding={holding}
                  onUpdate={handleUpdateHolding}
                  onDelete={handleDeleteHolding}
                  isExpanded={expandedIds.has(holding.id)}
                  onToggleExpand={() => toggleExpanded(holding.id)}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Passive Income Potential Summary */}
      <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Passive Income Potential
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">
                {fmt(portfolioSummary.monthlyIncome)}
              </div>
              <div className="text-sm text-muted-foreground">Current Monthly Income</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">
                {fmt(annualIncomeProjection[10]?.incomeWithDrip || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Projected Annual Income (10yr)</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">
                {fmt(annualIncomeProjection[projectionYears]?.cumulativeWithDrip || 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Income ({projectionYears}yr with DRIP)</div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
            <div className="text-sm text-center text-muted-foreground">
              Based on your current holdings with {portfolioSummary.dripEnabledCount} of {portfolioSummary.holdingsCount} positions
              enrolled in DRIP and an average dividend growth rate of {fmtPctRaw(portfolioSummary.avgDividendGrowth, 1)} per year.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DividendTracker;
