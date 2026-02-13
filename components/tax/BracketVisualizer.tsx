"use client";

/**
 * Tax Bracket Visualizer Component
 *
 * Interactive waterfall chart showing marginal tax rates with:
 * 1. Visual waterfall chart displaying progressive bracket structure
 * 2. "You are here" indicator showing current position
 * 3. Precise income placement within brackets
 * 4. Effective vs marginal rate comparison
 * 5. Combined federal + state tax view
 * 6. Interactive income slider for real-time bracket exploration
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  Info,
  MapPin,
  Percent,
  Calculator,
  ChevronDown,
  ChevronUp,
  Building2,
  Landmark,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmt, fmtFull } from "@/lib/utils";
import {
  TAX_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  type FilingStatus,
} from "@/lib/constants/tax2026";

// ==================== Types ====================

interface BracketVisualizerProps {
  initialIncome?: number;
  filingStatus?: FilingStatus;
  stateCode?: string;
  showStateComparison?: boolean;
}

interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

interface BracketSegment {
  bracket: TaxBracket;
  taxableInBracket: number;
  taxInBracket: number;
  cumulativeTax: number;
  percentOfTotal: number;
  isCurrentBracket: boolean;
  bracketIndex: number;
}

// ==================== State Tax Data ====================

// Simplified state tax rates (flat or top marginal for visualization)
const STATE_TAX_RATES: Record<string, { name: string; rate: number; brackets?: TaxBracket[] }> = {
  "NONE": { name: "No State Tax", rate: 0 },
  "CA": {
    name: "California",
    rate: 13.3,
    brackets: [
      { min: 0, max: 10412, rate: 1.0 },
      { min: 10412, max: 24684, rate: 2.0 },
      { min: 24684, max: 38959, rate: 4.0 },
      { min: 38959, max: 54081, rate: 6.0 },
      { min: 54081, max: 68350, rate: 8.0 },
      { min: 68350, max: 349137, rate: 9.3 },
      { min: 349137, max: 418961, rate: 10.3 },
      { min: 418961, max: 698271, rate: 11.3 },
      { min: 698271, max: 1000000, rate: 12.3 },
      { min: 1000000, max: Infinity, rate: 13.3 },
    ],
  },
  "NY": {
    name: "New York",
    rate: 10.9,
    brackets: [
      { min: 0, max: 8500, rate: 4.0 },
      { min: 8500, max: 11700, rate: 4.5 },
      { min: 11700, max: 13900, rate: 5.25 },
      { min: 13900, max: 80650, rate: 5.5 },
      { min: 80650, max: 215400, rate: 6.0 },
      { min: 215400, max: 1077550, rate: 6.85 },
      { min: 1077550, max: 5000000, rate: 9.65 },
      { min: 5000000, max: 25000000, rate: 10.3 },
      { min: 25000000, max: Infinity, rate: 10.9 },
    ],
  },
  "TX": { name: "Texas", rate: 0 },
  "FL": { name: "Florida", rate: 0 },
  "WA": { name: "Washington", rate: 0 },
  "NV": { name: "Nevada", rate: 0 },
  "TN": { name: "Tennessee", rate: 0 },
  "AZ": { name: "Arizona", rate: 2.5 },
  "NC": { name: "North Carolina", rate: 4.5 },
  "CO": { name: "Colorado", rate: 4.4 },
  "IL": { name: "Illinois", rate: 4.95 },
  "PA": { name: "Pennsylvania", rate: 3.07 },
  "NJ": {
    name: "New Jersey",
    rate: 10.75,
    brackets: [
      { min: 0, max: 20000, rate: 1.4 },
      { min: 20000, max: 35000, rate: 1.75 },
      { min: 35000, max: 40000, rate: 3.5 },
      { min: 40000, max: 75000, rate: 5.525 },
      { min: 75000, max: 500000, rate: 6.37 },
      { min: 500000, max: 1000000, rate: 8.97 },
      { min: 1000000, max: Infinity, rate: 10.75 },
    ],
  },
  "MA": { name: "Massachusetts", rate: 5.0 },
  "GA": { name: "Georgia", rate: 5.75 },
  "VA": { name: "Virginia", rate: 5.75 },
  "OH": { name: "Ohio", rate: 3.75 },
  "MI": { name: "Michigan", rate: 4.25 },
  "MN": {
    name: "Minnesota",
    rate: 9.85,
    brackets: [
      { min: 0, max: 31690, rate: 5.35 },
      { min: 31690, max: 104090, rate: 6.8 },
      { min: 104090, max: 193240, rate: 7.85 },
      { min: 193240, max: Infinity, rate: 9.85 },
    ],
  },
  "OR": {
    name: "Oregon",
    rate: 9.9,
    brackets: [
      { min: 0, max: 4300, rate: 4.75 },
      { min: 4300, max: 10750, rate: 6.75 },
      { min: 10750, max: 125000, rate: 8.75 },
      { min: 125000, max: Infinity, rate: 9.9 },
    ],
  },
};

// ==================== Bracket Colors ====================

const BRACKET_COLORS = [
  { bg: "bg-emerald-100 dark:bg-emerald-900/40", border: "border-emerald-300 dark:border-emerald-700", text: "text-emerald-700 dark:text-emerald-300", fill: "#10B981" },
  { bg: "bg-green-100 dark:bg-green-900/40", border: "border-green-300 dark:border-green-700", text: "text-green-700 dark:text-green-300", fill: "#22C55E" },
  { bg: "bg-lime-100 dark:bg-lime-900/40", border: "border-lime-300 dark:border-lime-700", text: "text-lime-700 dark:text-lime-300", fill: "#84CC16" },
  { bg: "bg-yellow-100 dark:bg-yellow-900/40", border: "border-yellow-300 dark:border-yellow-700", text: "text-yellow-700 dark:text-yellow-300", fill: "#EAB308" },
  { bg: "bg-amber-100 dark:bg-amber-900/40", border: "border-amber-300 dark:border-amber-700", text: "text-amber-700 dark:text-amber-300", fill: "#F59E0B" },
  { bg: "bg-orange-100 dark:bg-orange-900/40", border: "border-orange-300 dark:border-orange-700", text: "text-orange-700 dark:text-orange-300", fill: "#F97316" },
  { bg: "bg-red-100 dark:bg-red-900/40", border: "border-red-300 dark:border-red-700", text: "text-red-700 dark:text-red-300", fill: "#EF4444" },
];

// ==================== Helper Functions ====================

/**
 * Calculate federal income tax with bracket breakdown
 */
function calculateFederalTax(
  grossIncome: number,
  filingStatus: FilingStatus
): { totalTax: number; segments: BracketSegment[]; taxableIncome: number } {
  const deduction = STANDARD_DEDUCTION_2026[filingStatus];
  const taxableIncome = Math.max(0, grossIncome - deduction);
  const brackets = TAX_BRACKETS_2026[filingStatus];

  const segments: BracketSegment[] = [];
  let remainingIncome = taxableIncome;
  let cumulativeTax = 0;
  let previousMax = 0;

  for (let i = 0; i < brackets.length; i++) {
    const bracket = brackets[i];
    const bracketSize = bracket.max - bracket.min;
    const taxableInBracket = Math.min(Math.max(0, remainingIncome), bracketSize);
    const taxInBracket = taxableInBracket * (bracket.rate / 100);

    cumulativeTax += taxInBracket;
    remainingIncome -= taxableInBracket;

    // Determine if this is the bracket containing current income
    const isCurrentBracket = taxableIncome > bracket.min && taxableIncome <= bracket.max;

    segments.push({
      bracket,
      taxableInBracket,
      taxInBracket,
      cumulativeTax,
      percentOfTotal: 0, // Will calculate after
      isCurrentBracket,
      bracketIndex: i,
    });

    previousMax = bracket.max;
    if (remainingIncome <= 0) break;
  }

  // Calculate percentages
  const totalTax = cumulativeTax;
  segments.forEach(seg => {
    seg.percentOfTotal = totalTax > 0 ? (seg.taxInBracket / totalTax) * 100 : 0;
  });

  return { totalTax, segments, taxableIncome };
}

/**
 * Calculate state income tax
 */
function calculateStateTax(
  taxableIncome: number,
  stateCode: string
): { totalTax: number; effectiveRate: number; marginalRate: number } {
  const stateData = STATE_TAX_RATES[stateCode];
  if (!stateData || stateData.rate === 0) {
    return { totalTax: 0, effectiveRate: 0, marginalRate: 0 };
  }

  // If state has progressive brackets
  if (stateData.brackets) {
    let totalTax = 0;
    let marginalRate = stateData.brackets[0].rate;
    let remainingIncome = taxableIncome;

    for (const bracket of stateData.brackets) {
      const bracketSize = bracket.max - bracket.min;
      const taxableInBracket = Math.min(Math.max(0, remainingIncome), bracketSize);
      totalTax += taxableInBracket * (bracket.rate / 100);

      if (taxableIncome > bracket.min && taxableIncome <= bracket.max) {
        marginalRate = bracket.rate;
      } else if (taxableIncome > bracket.max) {
        marginalRate = bracket.rate;
      }

      remainingIncome -= taxableInBracket;
      if (remainingIncome <= 0) break;
    }

    return {
      totalTax,
      effectiveRate: taxableIncome > 0 ? (totalTax / taxableIncome) * 100 : 0,
      marginalRate,
    };
  }

  // Flat tax state
  const totalTax = taxableIncome * (stateData.rate / 100);
  return {
    totalTax,
    effectiveRate: stateData.rate,
    marginalRate: stateData.rate,
  };
}

// ==================== Sub-Components ====================

/**
 * Waterfall bracket bar
 */
function BracketBar({
  segment,
  maxTaxableAmount,
  showAmount = true,
}: {
  segment: BracketSegment;
  maxTaxableAmount: number;
  showAmount?: boolean;
}) {
  const colors = BRACKET_COLORS[Math.min(segment.bracketIndex, BRACKET_COLORS.length - 1)];
  const widthPercent = maxTaxableAmount > 0
    ? (segment.taxableInBracket / maxTaxableAmount) * 100
    : 0;

  return (
    <div className="flex items-center gap-3 py-1.5">
      <div className="w-14 text-right text-sm font-medium">
        {segment.bracket.rate}%
      </div>
      <div className="flex-1 relative">
        <div className="w-full h-8 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
          <div
            className={cn(
              "h-full rounded-lg transition-all duration-500 flex items-center justify-end pr-2",
              colors.bg,
              segment.isCurrentBracket && "ring-2 ring-blue-500 ring-offset-1"
            )}
            style={{ width: `${Math.max(widthPercent, segment.taxableInBracket > 0 ? 5 : 0)}%` }}
          >
            {showAmount && widthPercent > 20 && (
              <span className={cn("text-xs font-medium", colors.text)}>
                {fmt(segment.taxableInBracket)}
              </span>
            )}
          </div>
          {segment.isCurrentBracket && (
            <div
              className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1"
              style={{ left: `${Math.min(widthPercent + 2, 85)}%` }}
            >
              <MapPin className="h-4 w-4 text-blue-600 animate-pulse" />
              <span className="text-xs font-bold text-blue-600 whitespace-nowrap">You are here</span>
            </div>
          )}
        </div>
      </div>
      <div className="w-20 text-right text-sm text-muted-foreground">
        {fmt(segment.taxInBracket)}
      </div>
    </div>
  );
}

/**
 * Rate comparison gauge
 */
function RateGauge({
  label,
  rate,
  maxRate = 50,
  color = "blue",
  icon: Icon,
}: {
  label: string;
  rate: number;
  maxRate?: number;
  color?: "blue" | "green" | "amber" | "red";
  icon: React.ElementType;
}) {
  const colorClasses = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    amber: "bg-amber-500",
    red: "bg-red-500",
  };

  const widthPercent = Math.min((rate / maxRate) * 100, 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {label}
        </div>
        <span className="text-lg font-bold">{rate.toFixed(1)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700", colorClasses[color])}
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Bracket range indicator
 */
function BracketRangeIndicator({
  brackets,
  taxableIncome,
  filingStatus,
}: {
  brackets: TaxBracket[];
  taxableIncome: number;
  filingStatus: FilingStatus;
}) {
  // Find current bracket
  const currentBracketIndex = brackets.findIndex(
    (b) => taxableIncome >= b.min && taxableIncome < b.max
  );
  const currentBracket = brackets[currentBracketIndex] || brackets[brackets.length - 1];

  // Calculate position within bracket
  const bracketSize = currentBracket.max - currentBracket.min;
  const positionInBracket = taxableIncome - currentBracket.min;
  const percentInBracket = bracketSize < Infinity
    ? (positionInBracket / bracketSize) * 100
    : Math.min((positionInBracket / 1000000) * 100, 100);

  // Distance to next bracket
  const distanceToNextBracket = currentBracket.max - taxableIncome;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="h-5 w-5 text-blue-600" />
        <h4 className="font-semibold text-blue-900 dark:text-blue-100">Your Position in the {currentBracket.rate}% Bracket</h4>
      </div>

      <div className="space-y-3">
        {/* Visual bracket position */}
        <div className="relative h-10 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
          {/* Filled portion */}
          <div
            className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-500"
            style={{ width: `${percentInBracket}%` }}
          />
          {/* Position marker */}
          <div
            className="absolute top-0 h-full w-1 bg-blue-800 dark:bg-blue-300"
            style={{ left: `${percentInBracket}%` }}
          />
          {/* Labels */}
          <div className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-medium text-white">
            {fmtFull(currentBracket.min)}
          </div>
          {currentBracket.max < Infinity && (
            <div className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600 dark:text-gray-300">
              {fmtFull(currentBracket.max)}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Taxable Income</div>
            <div className="font-bold text-lg">{fmtFull(taxableIncome)}</div>
          </div>
          {currentBracket.max < Infinity && (
            <div>
              <div className="text-muted-foreground">Until {currentBracket.rate + (brackets[currentBracketIndex + 1]?.rate - currentBracket.rate || 0)}% Bracket</div>
              <div className="font-bold text-lg text-amber-600">{fmtFull(distanceToNextBracket)}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function BracketVisualizer({
  initialIncome = 100000,
  filingStatus: initialFilingStatus = "single",
  stateCode: initialStateCode = "NONE",
  showStateComparison = true,
}: BracketVisualizerProps) {
  // State
  const [income, setIncome] = useState(initialIncome);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(initialFilingStatus);
  const [stateCode, setStateCode] = useState(initialStateCode);
  const [showDetails, setShowDetails] = useState(false);

  // Calculations
  const federalResult = useMemo(
    () => calculateFederalTax(income, filingStatus),
    [income, filingStatus]
  );

  const stateResult = useMemo(
    () => calculateStateTax(federalResult.taxableIncome, stateCode),
    [federalResult.taxableIncome, stateCode]
  );

  const combinedTax = federalResult.totalTax + stateResult.totalTax;
  const effectiveRate = income > 0 ? (combinedTax / income) * 100 : 0;

  // Federal marginal rate
  const federalMarginalRate = useMemo(() => {
    const brackets = TAX_BRACKETS_2026[filingStatus];
    for (let i = brackets.length - 1; i >= 0; i--) {
      if (federalResult.taxableIncome > brackets[i].min) {
        return brackets[i].rate;
      }
    }
    return brackets[0].rate;
  }, [federalResult.taxableIncome, filingStatus]);

  const combinedMarginalRate = federalMarginalRate + stateResult.marginalRate;

  // Max amount for scaling bars
  const maxTaxableAmount = useMemo(() => {
    return Math.max(...federalResult.segments.map(s => s.taxableInBracket), 1);
  }, [federalResult.segments]);

  // Handle income change
  const handleIncomeChange = useCallback((values: number[]) => {
    setIncome(values[0]);
  }, []);

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Tax Bracket Visualizer
        </CardTitle>
        <CardDescription>
          Understand exactly how progressive tax brackets work and where your income falls.
          Drag the slider to see how changes in income affect your tax liability.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid md:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          {/* Income Slider */}
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <DollarSign className="h-4 w-4" />
                Gross Income
              </Label>
              <span className="text-2xl font-bold text-blue-600">{fmtFull(income)}</span>
            </div>
            <Slider
              value={[income]}
              onValueChange={handleIncomeChange}
              min={0}
              max={1000000}
              step={1000}
              thumbLabel="Adjust gross income"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$0</span>
              <span>$250K</span>
              <span>$500K</span>
              <span>$750K</span>
              <span>$1M</span>
            </div>
          </div>

          {/* Filing Status & State */}
          <div className="space-y-3">
            <div className="space-y-2">
              <Label className="text-xs">Filing Status</Label>
              <Select value={filingStatus} onValueChange={(v) => setFilingStatus(v as FilingStatus)}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="mfj">Married Filing Jointly</SelectItem>
                  <SelectItem value="mfs">Married Filing Separately</SelectItem>
                  <SelectItem value="hoh">Head of Household</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showStateComparison && (
              <div className="space-y-2">
                <Label className="text-xs">State</Label>
                <Select value={stateCode} onValueChange={setStateCode}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">No State Tax</SelectItem>
                    <SelectItem value="CA">California (13.3%)</SelectItem>
                    <SelectItem value="NY">New York (10.9%)</SelectItem>
                    <SelectItem value="NJ">New Jersey (10.75%)</SelectItem>
                    <SelectItem value="OR">Oregon (9.9%)</SelectItem>
                    <SelectItem value="MN">Minnesota (9.85%)</SelectItem>
                    <SelectItem value="MA">Massachusetts (5%)</SelectItem>
                    <SelectItem value="IL">Illinois (4.95%)</SelectItem>
                    <SelectItem value="NC">North Carolina (4.5%)</SelectItem>
                    <SelectItem value="CO">Colorado (4.4%)</SelectItem>
                    <SelectItem value="AZ">Arizona (2.5%)</SelectItem>
                    <SelectItem value="TX">Texas (0%)</SelectItem>
                    <SelectItem value="FL">Florida (0%)</SelectItem>
                    <SelectItem value="WA">Washington (0%)</SelectItem>
                    <SelectItem value="NV">Nevada (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Key Metrics - Effective vs Marginal */}
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4 p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 rounded-xl border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-green-600" />
                <span className="font-semibold">Effective Tax Rate</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Your effective rate is the actual percentage of your total income paid in taxes. It's always lower than your marginal rate because of progressive brackets.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-4xl font-bold text-green-700 dark:text-green-400">
              {effectiveRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Total tax: <span className="font-semibold text-foreground">{fmtFull(combinedTax)}</span>
            </div>
            <RateGauge
              label="Federal"
              rate={income > 0 ? (federalResult.totalTax / income) * 100 : 0}
              color="green"
              icon={Landmark}
            />
            {stateCode !== "NONE" && (
              <RateGauge
                label={STATE_TAX_RATES[stateCode]?.name || "State"}
                rate={income > 0 ? (stateResult.totalTax / income) * 100 : 0}
                color="blue"
                icon={Building2}
              />
            )}
          </div>

          <div className="space-y-4 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-xl border border-amber-200 dark:border-amber-800">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-600" />
                <span className="font-semibold">Marginal Tax Rate</span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Your marginal rate is the tax rate on your next dollar of income. This is what you save by taking deductions or contributing to pre-tax accounts.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="text-4xl font-bold text-amber-700 dark:text-amber-400">
              {combinedMarginalRate.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              Each additional $1,000 costs: <span className="font-semibold text-foreground">${(combinedMarginalRate * 10).toFixed(0)}</span>
            </div>
            <RateGauge
              label="Federal Bracket"
              rate={federalMarginalRate}
              color="amber"
              icon={Landmark}
            />
            {stateCode !== "NONE" && (
              <RateGauge
                label={STATE_TAX_RATES[stateCode]?.name || "State"}
                rate={stateResult.marginalRate}
                color="red"
                icon={Building2}
              />
            )}
          </div>
        </div>

        {/* Key Insight Card */}
        <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Why Effective Rate is Lower Than Marginal
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                With {fmtFull(income)} gross income, you first get a {fmtFull(STANDARD_DEDUCTION_2026[filingStatus])} standard deduction.
                Then, your first ${TAX_BRACKETS_2026[filingStatus][0].max.toLocaleString()} is taxed at just {TAX_BRACKETS_2026[filingStatus][0].rate}%,
                the next portion at {TAX_BRACKETS_2026[filingStatus][1].rate}%, and so on. Only income above {fmtFull(TAX_BRACKETS_2026[filingStatus].find(b => b.rate === federalMarginalRate)?.min || 0)}
                hits the {federalMarginalRate}% bracket.
              </p>
            </div>
          </div>
        </div>

        {/* Bracket Position Indicator */}
        <BracketRangeIndicator
          brackets={TAX_BRACKETS_2026[filingStatus]}
          taxableIncome={federalResult.taxableIncome}
          filingStatus={filingStatus}
        />

        {/* Waterfall Chart Toggle */}
        <div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
          >
            {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showDetails ? "Hide" : "Show"} Detailed Bracket Breakdown
          </button>
        </div>

        {/* Detailed Waterfall Chart */}
        {showDetails && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Landmark className="h-4 w-4" />
                Federal Tax by Bracket
              </h3>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>Rate</span>
                <span className="w-20"></span>
                <span>Amount Taxed</span>
                <span className="w-20 text-right">Tax</span>
              </div>
            </div>

            <div className="space-y-1 p-4 border rounded-lg bg-white dark:bg-gray-950">
              {federalResult.segments.map((segment, idx) => (
                <BracketBar
                  key={idx}
                  segment={segment}
                  maxTaxableAmount={maxTaxableAmount}
                />
              ))}

              {/* Total */}
              <div className="flex items-center gap-3 pt-3 mt-3 border-t">
                <div className="w-14 text-right text-sm font-bold">Total</div>
                <div className="flex-1">
                  <div className="text-sm text-muted-foreground">
                    Taxable income: {fmtFull(federalResult.taxableIncome)}
                  </div>
                </div>
                <div className="w-20 text-right text-lg font-bold text-blue-600">
                  {fmtFull(federalResult.totalTax)}
                </div>
              </div>
            </div>

            {/* Bracket Reference Table */}
            <div className="mt-4">
              <h4 className="text-sm font-semibold mb-2">2026 Federal Tax Brackets ({filingStatus === "mfj" ? "Married Filing Jointly" : filingStatus === "mfs" ? "Married Filing Separately" : filingStatus === "hoh" ? "Head of Household" : "Single"})</h4>
              <div className="grid grid-cols-7 gap-2 text-xs">
                {TAX_BRACKETS_2026[filingStatus].map((bracket, idx) => {
                  const colors = BRACKET_COLORS[Math.min(idx, BRACKET_COLORS.length - 1)];
                  const isCurrentBracket = federalResult.taxableIncome > bracket.min && federalResult.taxableIncome <= bracket.max;

                  return (
                    <div
                      key={idx}
                      className={cn(
                        "p-2 rounded text-center",
                        colors.bg,
                        isCurrentBracket && "ring-2 ring-blue-500"
                      )}
                    >
                      <div className={cn("font-bold", colors.text)}>{bracket.rate}%</div>
                      <div className="text-gray-600 dark:text-gray-400 mt-1">
                        {bracket.max < Infinity ? (
                          <>
                            ${(bracket.min / 1000).toFixed(0)}K-
                            <br />${(bracket.max / 1000).toFixed(0)}K
                          </>
                        ) : (
                          <>${(bracket.min / 1000).toFixed(0)}K+</>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Combined View Summary */}
        {stateCode !== "NONE" && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 rounded-xl border border-purple-200 dark:border-purple-800">
            <h3 className="font-semibold flex items-center gap-2 mb-4">
              <Building2 className="h-4 w-4 text-purple-600" />
              Combined Federal + State Tax Summary
            </h3>

            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                <div className="text-xs text-muted-foreground">Gross Income</div>
                <div className="text-lg font-bold">{fmtFull(income)}</div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                <div className="text-xs text-muted-foreground">Federal Tax</div>
                <div className="text-lg font-bold text-blue-600">{fmtFull(federalResult.totalTax)}</div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg">
                <div className="text-xs text-muted-foreground">State Tax</div>
                <div className="text-lg font-bold text-purple-600">{fmtFull(stateResult.totalTax)}</div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-900 rounded-lg border-2 border-green-300 dark:border-green-700">
                <div className="text-xs text-muted-foreground">Take-Home</div>
                <div className="text-lg font-bold text-green-600">{fmtFull(income - combinedTax)}</div>
              </div>
            </div>

            {/* Visual breakdown bar */}
            <div className="mt-4">
              <div className="h-8 w-full rounded-lg overflow-hidden flex">
                <div
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${((income - combinedTax) / income) * 100}%` }}
                >
                  {((income - combinedTax) / income * 100).toFixed(0)}% Take-Home
                </div>
                <div
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(federalResult.totalTax / income) * 100}%` }}
                >
                  {(federalResult.totalTax / income * 100).toFixed(0)}% Fed
                </div>
                <div
                  className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(stateResult.totalTax / income) * 100}%` }}
                >
                  {(stateResult.totalTax / income * 100).toFixed(0)}% State
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer disclaimer */}
        <div className="text-xs text-center text-muted-foreground pt-4 border-t">
          Based on 2026 federal tax brackets (TCJA rates made permanent by OBBBA July 2025).
          Does not include FICA taxes, AMT, or other deductions. For educational purposes only.
        </div>
      </CardContent>
    </Card>
  );
}

export default BracketVisualizer;
