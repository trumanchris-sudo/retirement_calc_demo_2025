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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeDollarSign,
  BarChart3,
  Building2,
  Calculator,
  Calendar,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Gift,
  Heart,
  HelpCircle,
  Info,
  Lightbulb,
  LineChart,
  Lock,
  PieChart,
  Plus,
  Receipt,
  Scale,
  Shield,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Unlock,
  Wallet,
  X,
} from "lucide-react";
import { TAX_BRACKETS, LTCG_BRACKETS, NIIT_THRESHOLD } from "@/lib/constants";
import { AMT_2026, TAX_BRACKETS_2026 } from "@/lib/constants/tax2026";
import type { FilingStatus } from "@/types/calculator";

// ==================== Types ====================

type EquityType = "RSU" | "ISO" | "NSO" | "ESPP";
type FilingStatusExtended = "single" | "married";

interface VestingEvent {
  id: string;
  type: EquityType;
  date: string;
  shares: number;
  grantPrice: number; // For ISO/NSO: exercise price; For RSU/ESPP: $0
  vestPrice: number; // FMV at vest
  currentPrice: number;
  costBasis?: number; // For tax calculations
  exercised?: boolean; // For ISO/NSO
  sold?: boolean;
}

interface ESPPPurchase {
  id: string;
  purchaseDate: string;
  grantDate: string;
  shares: number;
  purchasePrice: number; // 15% discount price
  marketPriceAtPurchase: number;
  currentPrice: number;
}

interface TaxProjection {
  ordinaryIncome: number;
  capitalGains: number;
  amtIncome: number;
  totalTax: number;
  effectiveRate: number;
  withholdingGap: number;
  setAsideRecommendation: number;
}

interface ConcentrationAnalysis {
  companyStockValue: number;
  totalNetWorth: number;
  concentrationPercent: number;
  riskLevel: "low" | "medium" | "high" | "extreme";
  recommendation: string;
  diversificationTimeline: number; // months to reach target
}

interface StockCompensationProps {
  filingStatus: FilingStatusExtended;
  currentIncome: number;
  totalNetWorth?: number;
  age?: number;
  isInsider?: boolean;
  onUpdateProjections?: (projections: TaxProjection) => void;
}

// ==================== Constants ====================

const FEDERAL_WITHHOLDING_RATE = 0.22; // Default 22% for supplemental income
const STATE_WITHHOLDING_RATE = 0.10; // Approximate
const FICA_RATE = 0.0765; // SS + Medicare (up to SS limit)
const SS_WAGE_BASE_2026 = 184500;

const CONCENTRATION_THRESHOLDS = {
  target: 0.10, // Ideal: <10% in any single stock
  elevated: 0.20, // Elevated: 10-20%
  high: 0.35, // High: 20-35%
  extreme: 0.50, // Extreme: >35%
};

// ==================== Helper Functions ====================

/**
 * Calculate federal income tax using progressive brackets
 */
function calcFederalTax(taxableIncome: number, status: FilingStatusExtended): number {
  const brackets = TAX_BRACKETS[status as keyof typeof TAX_BRACKETS];
  const deduction = brackets.deduction;
  let adj = Math.max(0, taxableIncome - deduction);
  let tax = 0;
  let prev = 0;
  for (const b of brackets.rates) {
    const amount = Math.min(adj, b.limit - prev);
    tax += amount * b.rate;
    adj -= amount;
    prev = b.limit;
    if (adj <= 0) break;
  }
  return tax;
}

/**
 * Calculate Alternative Minimum Tax
 */
function calcAMT(
  regularTaxableIncome: number,
  isoSpread: number,
  status: FilingStatusExtended
): { amtLiability: number; inAMT: boolean; amtIncome: number } {
  // AMT Income = Regular taxable income + ISO spread + other preference items
  const amtIncome = regularTaxableIncome + isoSpread;

  // AMT Exemption
  const exemption = status === "married" ? AMT_2026.EXEMPTION_MFJ : AMT_2026.EXEMPTION_SINGLE;
  const phaseoutThreshold = status === "married" ? AMT_2026.PHASEOUT_MFJ : AMT_2026.PHASEOUT_SINGLE;

  // Phase out exemption
  let adjustedExemption: number = exemption;
  if (amtIncome > phaseoutThreshold) {
    const phaseoutAmount = (amtIncome - phaseoutThreshold) * AMT_2026.PHASEOUT_RATE;
    adjustedExemption = Math.max(0, exemption - phaseoutAmount);
  }

  // Calculate AMT base
  const amtBase = Math.max(0, amtIncome - adjustedExemption);

  // Calculate tentative minimum tax (26% up to threshold, 28% above)
  let amt = 0;
  if (amtBase <= AMT_2026.RATE_28_THRESHOLD) {
    amt = amtBase * AMT_2026.RATE_26;
  } else {
    amt = AMT_2026.RATE_28_THRESHOLD * AMT_2026.RATE_26 +
          (amtBase - AMT_2026.RATE_28_THRESHOLD) * AMT_2026.RATE_28;
  }

  // Compare to regular tax
  const regularTax = calcFederalTax(regularTaxableIncome, status);
  const amtLiability = Math.max(0, amt - regularTax);

  return {
    amtLiability,
    inAMT: amtLiability > 0,
    amtIncome,
  };
}

/**
 * Calculate LTCG tax
 */
function calcLTCGTax(
  capitalGains: number,
  ordinaryIncome: number,
  status: FilingStatusExtended
): number {
  if (capitalGains <= 0) return 0;

  const brackets = LTCG_BRACKETS[status as keyof typeof LTCG_BRACKETS];
  const deduction = TAX_BRACKETS[status as keyof typeof TAX_BRACKETS].deduction;
  const adjustedOrdinary = Math.max(0, ordinaryIncome - deduction);

  let remainingGains = capitalGains;
  let tax = 0;
  let cumulativeIncome = adjustedOrdinary;

  for (const b of brackets) {
    const bracketRoom = Math.max(0, b.limit - cumulativeIncome);
    const taxedHere = Math.min(remainingGains, bracketRoom);

    if (taxedHere > 0) {
      tax += taxedHere * b.rate;
      remainingGains -= taxedHere;
      cumulativeIncome += taxedHere;
    }

    if (remainingGains <= 0) break;
  }

  if (remainingGains > 0) {
    tax += remainingGains * 0.20;
  }

  return tax;
}

/**
 * Calculate NIIT (3.8% Medicare surtax)
 */
function calcNIIT(
  investmentIncome: number,
  totalIncome: number,
  status: FilingStatusExtended
): number {
  const threshold = NIIT_THRESHOLD[status as keyof typeof NIIT_THRESHOLD];
  const excess = Math.max(0, totalIncome - threshold);
  if (excess <= 0) return 0;
  return Math.min(investmentIncome, excess) * 0.038;
}

/**
 * Format currency
 */
function fmt(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 100_000) {
    return `$${(value / 1_000).toFixed(0)}k`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

/**
 * Format percentage
 */
function fmtPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/**
 * Calculate days until date
 */
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Format date
 */
function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ==================== Sub-Components ====================

/**
 * RSU Basics Section
 */
function RSUBasics({
  vestingEvents,
  currentIncome,
  filingStatus,
}: {
  vestingEvents: VestingEvent[];
  currentIncome: number;
  filingStatus: FilingStatusExtended;
}) {
  const rsuEvents = vestingEvents.filter((e) => e.type === "RSU");

  const totalRSUIncome = useMemo(() => {
    return rsuEvents.reduce((sum, e) => sum + e.shares * e.vestPrice, 0);
  }, [rsuEvents]);

  const withholdingAnalysis = useMemo(() => {
    const standardWithholding = totalRSUIncome * FEDERAL_WITHHOLDING_RATE;
    const totalIncome = currentIncome + totalRSUIncome;
    const actualTax = calcFederalTax(totalIncome, filingStatus);
    const baseTax = calcFederalTax(currentIncome, filingStatus);
    const incrementalTax = actualTax - baseTax;
    const gap = incrementalTax - standardWithholding;

    return {
      standardWithholding,
      actualTaxOwed: incrementalTax,
      gap,
      effectiveRate: totalRSUIncome > 0 ? incrementalTax / totalRSUIncome : 0,
    };
  }, [totalRSUIncome, currentIncome, filingStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Award className="h-5 w-5 text-blue-600" />
          RSU Basics
        </CardTitle>
        <CardDescription>
          Restricted Stock Units: Taxed as ordinary income at vesting
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Concept */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                How RSU Taxation Works
              </div>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li>RSUs are taxed as <strong>ordinary income</strong> when they vest</li>
                <li>Fair Market Value (FMV) at vest becomes your cost basis</li>
                <li>Your company typically withholds shares to cover taxes</li>
                <li>Default withholding is 22% federal - often not enough!</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Withholding Gap Warning */}
        {withholdingAnalysis.gap > 0 && (
          <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  Withholding Gap Alert
                </div>
                <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                  Based on your income, you may owe an additional <strong>{fmt(withholdingAnalysis.gap)}</strong> at tax time.
                  Your RSU income is being taxed at your marginal rate of {fmtPct(withholdingAnalysis.effectiveRate)},
                  but only 22% is being withheld.
                </p>
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-semibold">Withheld:</span>
                    <span>{fmt(withholdingAnalysis.standardWithholding)}</span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-red-400" />
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-semibold">Actually Owed:</span>
                    <span>{fmt(withholdingAnalysis.actualTaxOwed)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RSU Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Total RSU Income</div>
            <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
              {fmt(totalRSUIncome)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              From {rsuEvents.length} vesting event(s)
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Effective Tax Rate</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {fmtPct(withholdingAnalysis.effectiveRate)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              On RSU income (marginal)
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Cost Basis Established</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {fmt(totalRSUIncome)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              FMV at vest = future cost basis
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            RSU Tax Planning Tips
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>Estimated taxes:</strong> File quarterly estimated payments to avoid underpayment penalties
            </li>
            <li>
              <strong>Sell-to-cover:</strong> Most common - company sells shares to cover tax withholding
            </li>
            <li>
              <strong>Track cost basis:</strong> When you sell, only gains above vest-day FMV are taxed again
            </li>
            <li>
              <strong>Hold for LTCG:</strong> Hold shares 1+ year after vest for 15% capital gains rate vs. 37% ordinary
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ISO vs NSO Comparison
 */
function ISOvsNSO({
  vestingEvents,
  currentIncome,
  filingStatus,
}: {
  vestingEvents: VestingEvent[];
  currentIncome: number;
  filingStatus: FilingStatusExtended;
}) {
  const isoEvents = vestingEvents.filter((e) => e.type === "ISO");
  const nsoEvents = vestingEvents.filter((e) => e.type === "NSO");

  const isoAnalysis = useMemo(() => {
    const totalSpread = isoEvents.reduce(
      (sum, e) => sum + e.shares * (e.currentPrice - e.grantPrice),
      0
    );
    const { amtLiability, inAMT } = calcAMT(currentIncome, totalSpread, filingStatus);

    return {
      totalShares: isoEvents.reduce((sum, e) => sum + e.shares, 0),
      totalSpread,
      amtLiability,
      inAMT,
      potentialLTCGSavings: totalSpread * 0.22, // Difference between ordinary and LTCG
    };
  }, [isoEvents, currentIncome, filingStatus]);

  const nsoAnalysis = useMemo(() => {
    const totalSpread = nsoEvents.reduce(
      (sum, e) => sum + e.shares * (e.currentPrice - e.grantPrice),
      0
    );
    const tax = calcFederalTax(currentIncome + totalSpread, filingStatus) -
                calcFederalTax(currentIncome, filingStatus);

    return {
      totalShares: nsoEvents.reduce((sum, e) => sum + e.shares, 0),
      totalSpread,
      taxAtExercise: tax,
    };
  }, [nsoEvents, currentIncome, filingStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5 text-purple-600" />
          ISO vs NSO Comparison
        </CardTitle>
        <CardDescription>
          Incentive Stock Options vs. Non-Qualified Stock Options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4"></th>
                <th className="text-center py-3 px-4 bg-green-50 dark:bg-green-950/20">
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ISO
                  </div>
                </th>
                <th className="text-center py-3 px-4 bg-blue-50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-center gap-2">
                    <BadgeDollarSign className="h-4 w-4 text-blue-600" />
                    NSO
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">Tax at Exercise</td>
                <td className="py-3 px-4 text-center bg-green-50/50 dark:bg-green-950/10">
                  <span className="text-green-700 dark:text-green-400 font-semibold">None*</span>
                  <div className="text-xs text-muted-foreground">*But watch for AMT</div>
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10">
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">Ordinary Income</span>
                  <div className="text-xs text-muted-foreground">On spread (FMV - strike)</div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">Tax at Sale (if held)</td>
                <td className="py-3 px-4 text-center bg-green-50/50 dark:bg-green-950/10">
                  <span className="text-green-700 dark:text-green-400 font-semibold">LTCG (15-20%)</span>
                  <div className="text-xs text-muted-foreground">If qualifying disposition</div>
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10">
                  <span className="text-blue-700 dark:text-blue-400 font-semibold">LTCG (15-20%)</span>
                  <div className="text-xs text-muted-foreground">On gain above FMV at exercise</div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">Holding Requirement</td>
                <td className="py-3 px-4 text-center bg-green-50/50 dark:bg-green-950/10">
                  <span className="font-semibold">1 year from exercise</span>
                  <div className="text-xs text-muted-foreground">+ 2 years from grant</div>
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10">
                  <span className="font-semibold">1 year from exercise</span>
                  <div className="text-xs text-muted-foreground">For LTCG treatment</div>
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-3 px-4 font-medium">AMT Risk</td>
                <td className="py-3 px-4 text-center bg-green-50/50 dark:bg-green-950/10">
                  <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
                    Yes - Major Risk
                  </Badge>
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    No AMT Impact
                  </Badge>
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Best For</td>
                <td className="py-3 px-4 text-center bg-green-50/50 dark:bg-green-950/10">
                  <span className="text-sm">Long-term holders with low AMT risk</span>
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/50 dark:bg-blue-950/10">
                  <span className="text-sm">Immediate liquidity needs</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Your Position Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isoEvents.length > 0 && (
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4">
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Your ISO Position
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Shares:</span>
                  <span className="font-medium">{isoAnalysis.totalShares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Spread:</span>
                  <span className="font-medium">{fmt(isoAnalysis.totalSpread)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">AMT Exposure:</span>
                  <span className={`font-medium ${isoAnalysis.inAMT ? "text-amber-600" : "text-green-600"}`}>
                    {isoAnalysis.inAMT ? fmt(isoAnalysis.amtLiability) : "None"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Potential LTCG Savings:</span>
                  <span className="font-medium text-green-600">{fmt(isoAnalysis.potentialLTCGSavings)}</span>
                </div>
              </div>
            </div>
          )}

          {nsoEvents.length > 0 && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 p-4">
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Your NSO Position
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Shares:</span>
                  <span className="font-medium">{nsoAnalysis.totalShares.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Spread:</span>
                  <span className="font-medium">{fmt(nsoAnalysis.totalSpread)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax at Exercise:</span>
                  <span className="font-medium text-blue-600">{fmt(nsoAnalysis.taxAtExercise)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ISO Qualifying Disposition Requirements */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                ISO Qualifying Disposition Requirements
              </div>
              <div className="text-sm text-amber-800 dark:text-amber-200">
                To get LTCG treatment on ISOs, you must hold:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li><strong>1+ year</strong> after exercise date</li>
                  <li><strong>2+ years</strong> after grant date</li>
                </ul>
                <p className="mt-2 italic">
                  Selling before meeting both requirements triggers ordinary income tax (disqualifying disposition).
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
 * AMT Calculator
 */
function AMTCalculator({
  currentIncome,
  isoSpread,
  filingStatus,
  onSpreadChange,
}: {
  currentIncome: number;
  isoSpread: number;
  filingStatus: FilingStatusExtended;
  onSpreadChange: (spread: number) => void;
}) {
  const [localSpread, setLocalSpread] = useState(isoSpread.toString());

  const amtAnalysis = useMemo(() => {
    const spread = parseFloat(localSpread) || 0;
    return calcAMT(currentIncome, spread, filingStatus);
  }, [currentIncome, localSpread, filingStatus]);

  const regularTax = calcFederalTax(currentIncome, filingStatus);

  // Calculate AMT trap threshold - where AMT kicks in
  const amtTrapThreshold = useMemo(() => {
    // Binary search for the spread that triggers AMT
    let low = 0;
    let high = 1000000;
    while (high - low > 1000) {
      const mid = (low + high) / 2;
      const { inAMT } = calcAMT(currentIncome, mid, filingStatus);
      if (inAMT) {
        high = mid;
      } else {
        low = mid;
      }
    }
    return low;
  }, [currentIncome, filingStatus]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-amber-600" />
          AMT Calculator
        </CardTitle>
        <CardDescription>
          Alternative Minimum Tax impact from ISO exercises
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* AMT Trap Warning */}
        <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-red-900 dark:text-red-100 mb-2">
                The AMT Trap
              </div>
              <p className="text-sm text-red-800 dark:text-red-200">
                When you exercise ISOs, the <strong>spread</strong> (current price minus strike price)
                is added to your income for AMT purposes - even though you receive no cash.
                This can create a large tax bill on "phantom income" you never received.
              </p>
            </div>
          </div>
        </div>

        {/* Calculator Input */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>ISO Spread (FMV - Strike Price) x Shares</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={localSpread}
                onChange={(e) => {
                  setLocalSpread(e.target.value);
                  const val = parseFloat(e.target.value) || 0;
                  onSpreadChange(val);
                }}
                className="pl-8"
                placeholder="Enter ISO spread amount"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Example: 1,000 shares x ($50 FMV - $10 strike) = $40,000 spread
            </p>
          </div>
        </div>

        {/* Results */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Regular Tax</div>
            <div className="text-2xl font-bold">{fmt(regularTax)}</div>
            <div className="text-xs text-muted-foreground">
              On {fmt(currentIncome)} income
            </div>
          </div>

          <div className={`rounded-lg border p-4 ${amtAnalysis.inAMT ? "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"}`}>
            <div className="text-sm text-muted-foreground mb-1">AMT Liability</div>
            <div className={`text-2xl font-bold ${amtAnalysis.inAMT ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
              {amtAnalysis.inAMT ? fmt(amtAnalysis.amtLiability) : "$0"}
            </div>
            <div className="text-xs text-muted-foreground">
              {amtAnalysis.inAMT ? "Additional tax due" : "No AMT triggered"}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">AMT Income</div>
            <div className="text-2xl font-bold">{fmt(amtAnalysis.amtIncome)}</div>
            <div className="text-xs text-muted-foreground">
              Regular income + ISO spread
            </div>
          </div>
        </div>

        {/* Safe Harbor */}
        <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Safe Exercise Amount
              </div>
              <p className="text-sm text-green-800 dark:text-green-200">
                Based on your current income, you can exercise ISOs with up to{" "}
                <strong>{fmt(amtTrapThreshold)}</strong> in spread without triggering AMT.
                This assumes no other AMT preference items.
              </p>
            </div>
          </div>
        </div>

        {/* AMT Avoidance Strategies */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-yellow-500" />
            Strategies to Avoid the AMT Trap
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>Exercise in low-income years:</strong> Sabbatical, career break, or between jobs
            </li>
            <li>
              <strong>Spread exercises over multiple years:</strong> Stay below AMT threshold each year
            </li>
            <li>
              <strong>Same-day sale:</strong> Disqualifying disposition avoids AMT (but triggers ordinary income)
            </li>
            <li>
              <strong>Donate shares to charity:</strong> Avoid tax and get deduction (consult tax advisor)
            </li>
            <li>
              <strong>Early exercise with 83(b):</strong> Exercise when spread is minimal (startup equity)
            </li>
          </ul>
        </div>

        {/* AMT Credit Note */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                AMT Credit Recovery
              </div>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                If you pay AMT, you may be able to recover it as a credit in future years when your
                regular tax exceeds AMT. This "AMT credit carryforward" can take years to fully recover.
                Track your AMT payments carefully.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Concentration Risk Analyzer
 */
function ConcentrationRisk({
  companyStockValue,
  totalNetWorth,
  isInsider,
}: {
  companyStockValue: number;
  totalNetWorth: number;
  isInsider: boolean;
}) {
  const analysis = useMemo((): ConcentrationAnalysis => {
    const concentrationPercent = totalNetWorth > 0 ? companyStockValue / totalNetWorth : 0;

    let riskLevel: "low" | "medium" | "high" | "extreme";
    let recommendation: string;
    let diversificationTimeline: number;

    if (concentrationPercent <= CONCENTRATION_THRESHOLDS.target) {
      riskLevel = "low";
      recommendation = "Your position is well-diversified. Maintain this allocation.";
      diversificationTimeline = 0;
    } else if (concentrationPercent <= CONCENTRATION_THRESHOLDS.elevated) {
      riskLevel = "medium";
      recommendation = "Consider gradual diversification. Target 10% over 1-2 years.";
      diversificationTimeline = 18;
    } else if (concentrationPercent <= CONCENTRATION_THRESHOLDS.high) {
      riskLevel = "high";
      recommendation = "Significant single-stock risk. Prioritize diversification over 6-12 months.";
      diversificationTimeline = 9;
    } else {
      riskLevel = "extreme";
      recommendation = "Extreme concentration. Consider aggressive diversification strategy immediately.";
      diversificationTimeline = 6;
    }

    return {
      companyStockValue,
      totalNetWorth,
      concentrationPercent,
      riskLevel,
      recommendation,
      diversificationTimeline,
    };
  }, [companyStockValue, totalNetWorth]);

  const riskColors = {
    low: "text-green-600 bg-green-50 border-green-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    extreme: "text-red-600 bg-red-50 border-red-200",
  };

  const targetValue = totalNetWorth * CONCENTRATION_THRESHOLDS.target;
  const excessValue = Math.max(0, companyStockValue - targetValue);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5 text-indigo-600" />
          Concentration Risk
        </CardTitle>
        <CardDescription>
          "Don't let one stock be more than 10% of net worth"
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Level Indicator */}
        <div className={`rounded-lg border p-4 ${riskColors[analysis.riskLevel]}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="font-semibold text-lg capitalize">{analysis.riskLevel} Risk</div>
              <div className="text-sm opacity-80">{analysis.recommendation}</div>
            </div>
            <div className="text-4xl font-bold">
              {fmtPct(analysis.concentrationPercent)}
            </div>
          </div>

          {/* Visual Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Target: 10%</span>
              <span>Current: {fmtPct(analysis.concentrationPercent)}</span>
            </div>
            <div className="relative h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`absolute left-0 top-0 h-full ${
                  analysis.riskLevel === "low" ? "bg-green-500" :
                  analysis.riskLevel === "medium" ? "bg-yellow-500" :
                  analysis.riskLevel === "high" ? "bg-orange-500" : "bg-red-500"
                } transition-all`}
                style={{ width: `${Math.min(100, analysis.concentrationPercent * 100)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-green-700"
                style={{ left: "10%" }}
              />
            </div>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Company Stock</div>
            <div className="text-2xl font-bold">{fmt(companyStockValue)}</div>
            <div className="text-xs text-muted-foreground">
              {fmtPct(analysis.concentrationPercent)} of net worth
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Target Allocation</div>
            <div className="text-2xl font-bold">{fmt(targetValue)}</div>
            <div className="text-xs text-muted-foreground">
              10% of {fmt(totalNetWorth)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Excess to Diversify</div>
            <div className={`text-2xl font-bold ${excessValue > 0 ? "text-red-600" : "text-green-600"}`}>
              {fmt(excessValue)}
            </div>
            <div className="text-xs text-muted-foreground">
              {excessValue > 0 ? "Over target allocation" : "At or below target"}
            </div>
          </div>
        </div>

        {/* Diversification Timeline */}
        {analysis.diversificationTimeline > 0 && (
          <div className="rounded-lg border p-4">
            <h4 className="font-semibold mb-3">Recommended Diversification Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <CalendarClock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Target: {analysis.diversificationTimeline} months</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Monthly sell target</span>
                  <span className="font-medium">{fmt(excessValue / analysis.diversificationTimeline)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Quarterly sell target</span>
                  <span className="font-medium">{fmt((excessValue / analysis.diversificationTimeline) * 3)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 10b5-1 Plan for Insiders */}
        {isInsider && (
          <div className="rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 p-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                  10b5-1 Trading Plan
                </div>
                <p className="text-sm text-purple-800 dark:text-purple-200 mb-2">
                  As an insider, consider establishing a 10b5-1 plan to sell shares on a predetermined schedule:
                </p>
                <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-1 list-disc list-inside">
                  <li>Trade during blackout periods without insider trading liability</li>
                  <li>Systematic diversification regardless of stock price</li>
                  <li>Must be established when not in possession of MNPI</li>
                  <li>Required 90-day cooling-off period (SEC Rule 10b5-1)</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Diversification Strategies */}
        <div className="rounded-lg border p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-indigo-500" />
            Diversification Strategies
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
            <li>
              <strong>Dollar-cost averaging out:</strong> Sell fixed dollar amount monthly
            </li>
            <li>
              <strong>Tax-loss harvesting:</strong> Offset gains with losses elsewhere
            </li>
            <li>
              <strong>Charitable giving:</strong> Donate appreciated shares to DAF (avoid cap gains + get deduction)
            </li>
            <li>
              <strong>Exchange funds:</strong> Pool stock with others for diversification (accredited investors)
            </li>
            <li>
              <strong>Collar strategy:</strong> Options to protect downside while maintaining upside (consult advisor)
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Tax Optimization Strategies
 */
function TaxOptimization({
  filingStatus,
  currentIncome,
  hasISOs,
  hasESPP,
}: {
  filingStatus: FilingStatusExtended;
  currentIncome: number;
  hasISOs: boolean;
  hasESPP: boolean;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const strategies = [
    {
      id: "low-income-exercise",
      title: "Exercise ISOs in Low-Income Years",
      icon: TrendingDown,
      relevance: hasISOs ? "high" : "none",
      description: "Minimize AMT by exercising when your regular income is low",
      details: [
        "Between jobs or career transitions",
        "Taking a sabbatical or extended leave",
        "Early retirement before other income kicks in",
        "Year of significant deductions (medical, etc.)",
      ],
      savings: "Potential AMT savings of 26-28% of spread",
    },
    {
      id: "83b-election",
      title: "83(b) Election for Early-Stage Equity",
      icon: Clock,
      relevance: "medium",
      description: "Pay tax on grant value instead of vesting value for startup equity",
      details: [
        "Must file within 30 days of grant - NO EXCEPTIONS",
        "Pay ordinary income tax on (FMV - price paid) at grant",
        "All future appreciation taxed as capital gains",
        "Risk: If you forfeit shares, no refund on taxes paid",
        "Best for: Low FMV early-stage company grants",
      ],
      savings: "Can convert 100% of growth from ordinary income to LTCG",
    },
    {
      id: "donate-appreciated",
      title: "Donate Appreciated Shares to DAF",
      icon: Heart,
      relevance: "high",
      description: "Avoid capital gains AND get charitable deduction",
      details: [
        "Donate shares directly - never sell first",
        "Deduction = FMV (up to 30% of AGI for appreciated stock)",
        "Avoid 15-20% capital gains + 3.8% NIIT",
        "Donor Advised Fund (DAF) gives you time to decide recipients",
        "Must hold shares 1+ year for full FMV deduction",
      ],
      savings: "Save capital gains tax + get deduction = 40%+ effective benefit",
    },
    {
      id: "espp-qualifying",
      title: "ESPP Qualifying Disposition",
      icon: Calendar,
      relevance: hasESPP ? "high" : "none",
      description: "Hold ESPP shares to convert ordinary income to capital gains",
      details: [
        "Must hold 2 years from offering date + 1 year from purchase",
        "Only the discount (15%) is taxed as ordinary income",
        "All additional gains are long-term capital gains",
        "Disqualifying: Full spread taxed as ordinary income",
      ],
      savings: "Save up to 22% on gains above the 15% discount",
    },
    {
      id: "installment-sale",
      title: "Spread Gains Across Tax Years",
      icon: CalendarClock,
      relevance: "medium",
      description: "Sell in December/January to split gains across tax years",
      details: [
        "Large gain? Sell half in December, half in January",
        "Keeps you in lower brackets each year",
        "Particularly effective near bracket boundaries",
        "Can combine with tax-loss harvesting",
      ],
      savings: "Reduce marginal rate by 5-10% on split portion",
    },
  ].filter((s) => s.relevance !== "none");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Tax Optimization Strategies
        </CardTitle>
        <CardDescription>
          Strategies advisors charge thousands for - now free
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {strategies.map((strategy) => {
          const Icon = strategy.icon;
          const isExpanded = expanded === strategy.id;

          return (
            <div
              key={strategy.id}
              className={`rounded-lg border p-4 transition-all ${
                strategy.relevance === "high"
                  ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/10"
                  : "border-gray-200 dark:border-gray-800"
              }`}
            >
              <button
                className="w-full text-left"
                onClick={() => setExpanded(isExpanded ? null : strategy.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Icon className={`h-5 w-5 mt-0.5 ${
                      strategy.relevance === "high" ? "text-green-600" : "text-muted-foreground"
                    }`} />
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {strategy.title}
                        {strategy.relevance === "high" && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            Recommended
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {strategy.description}
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t space-y-3">
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    {strategy.details.map((detail, idx) => (
                      <li key={idx}>{detail}</li>
                    ))}
                  </ul>
                  <div className="rounded-lg bg-green-50 dark:bg-green-950/20 p-3">
                    <div className="text-sm font-medium text-green-800 dark:text-green-200">
                      Potential Savings: {strategy.savings}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

/**
 * Vest Date Calendar
 */
function VestDateCalendar({
  vestingEvents,
  onAddEvent,
  onRemoveEvent,
  filingStatus,
  currentIncome,
}: {
  vestingEvents: VestingEvent[];
  onAddEvent: (event: Omit<VestingEvent, "id">) => void;
  onRemoveEvent: (id: string) => void;
  filingStatus: FilingStatusExtended;
  currentIncome: number;
}) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    type: "RSU" as EquityType,
    date: "",
    shares: 0,
    grantPrice: 0,
    vestPrice: 0,
    currentPrice: 0,
  });

  // Sort events by date
  const sortedEvents = useMemo(() => {
    return [...vestingEvents].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [vestingEvents]);

  // Calculate tax projections for upcoming events
  const taxProjections = useMemo(() => {
    let cumulativeIncome = currentIncome;

    return sortedEvents.map((event) => {
      let eventIncome = 0;
      let eventCapGains = 0;

      if (event.type === "RSU") {
        eventIncome = event.shares * event.vestPrice;
      } else if (event.type === "NSO") {
        eventIncome = event.shares * (event.vestPrice - event.grantPrice);
      } else if (event.type === "ISO") {
        // ISO: No regular income, but track for AMT
        eventCapGains = event.shares * (event.currentPrice - event.grantPrice);
      } else if (event.type === "ESPP") {
        eventIncome = event.shares * event.vestPrice * 0.15; // 15% discount
      }

      const newTotal = cumulativeIncome + eventIncome;
      const incrementalTax = calcFederalTax(newTotal, filingStatus) -
                             calcFederalTax(cumulativeIncome, filingStatus);

      const withholding = eventIncome * FEDERAL_WITHHOLDING_RATE;
      const gap = incrementalTax - withholding;

      cumulativeIncome = newTotal;

      return {
        event,
        eventIncome,
        incrementalTax,
        withholding,
        gap,
        setAside: Math.max(0, gap) * 1.1, // 10% buffer
      };
    });
  }, [sortedEvents, currentIncome, filingStatus]);

  const handleAdd = () => {
    if (newEvent.date && newEvent.shares > 0) {
      onAddEvent(newEvent);
      setNewEvent({
        type: "RSU",
        date: "",
        shares: 0,
        grantPrice: 0,
        vestPrice: 0,
        currentPrice: 0,
      });
      setShowAddForm(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-teal-600" />
          Vest Date Calendar
        </CardTitle>
        <CardDescription>
          Track vesting events and tax liability projections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/20 dark:to-cyan-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Events</div>
            <div className="text-2xl font-bold text-teal-700 dark:text-teal-400">
              {vestingEvents.length}
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Total Tax Liability</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {fmt(taxProjections.reduce((sum, p) => sum + p.incrementalTax, 0))}
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">Set Aside Needed</div>
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {fmt(taxProjections.reduce((sum, p) => sum + p.setAside, 0))}
            </div>
          </div>
        </div>

        {/* Event List */}
        <div className="space-y-3">
          {taxProjections.map((projection, idx) => {
            const { event } = projection;
            const daysUntilVest = daysUntil(event.date);
            const isPast = daysUntilVest < 0;
            const isUpcoming = daysUntilVest >= 0 && daysUntilVest <= 30;

            return (
              <div
                key={event.id}
                className={`rounded-lg border p-4 ${
                  isPast
                    ? "bg-gray-50 dark:bg-gray-900/50 opacity-60"
                    : isUpcoming
                      ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                      : ""
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-full p-2 ${
                      event.type === "RSU" ? "bg-blue-100 text-blue-600" :
                      event.type === "ISO" ? "bg-green-100 text-green-600" :
                      event.type === "NSO" ? "bg-purple-100 text-purple-600" :
                      "bg-teal-100 text-teal-600"
                    }`}>
                      {event.type === "RSU" && <Award className="h-4 w-4" />}
                      {event.type === "ISO" && <CheckCircle2 className="h-4 w-4" />}
                      {event.type === "NSO" && <BadgeDollarSign className="h-4 w-4" />}
                      {event.type === "ESPP" && <Building2 className="h-4 w-4" />}
                    </div>
                    <div>
                      <div className="font-semibold flex items-center gap-2">
                        {event.type}
                        <Badge variant="outline">
                          {event.shares.toLocaleString()} shares
                        </Badge>
                        {isUpcoming && (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                            {daysUntilVest} days
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {formatDate(event.date)} | Vest Price: ${event.vestPrice}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-semibold">{fmt(projection.eventIncome)}</div>
                    <div className="text-sm text-muted-foreground">
                      Tax: {fmt(projection.incrementalTax)}
                    </div>
                    {projection.gap > 0 && (
                      <div className="text-sm text-red-600 font-medium">
                        Set aside: {fmt(projection.setAside)}
                      </div>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-red-500 hover:text-red-700"
                  onClick={() => onRemoveEvent(event.id)}
                >
                  <X className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>
            );
          })}

          {vestingEvents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No vesting events added yet</p>
            </div>
          )}
        </div>

        {/* Add Event Form */}
        {showAddForm ? (
          <div className="rounded-lg border p-4 space-y-4">
            <h4 className="font-semibold">Add Vesting Event</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={newEvent.type}
                  onValueChange={(v) => setNewEvent({ ...newEvent, type: v as EquityType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RSU">RSU</SelectItem>
                    <SelectItem value="ISO">ISO</SelectItem>
                    <SelectItem value="NSO">NSO</SelectItem>
                    <SelectItem value="ESPP">ESPP</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Vest Date</Label>
                <Input
                  type="date"
                  value={newEvent.date}
                  onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Shares</Label>
                <Input
                  type="number"
                  value={newEvent.shares || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, shares: parseInt(e.target.value) || 0 })}
                />
              </div>

              {(newEvent.type === "ISO" || newEvent.type === "NSO") && (
                <div className="space-y-2">
                  <Label>Grant/Strike Price</Label>
                  <Input
                    type="number"
                    value={newEvent.grantPrice || ""}
                    onChange={(e) => setNewEvent({ ...newEvent, grantPrice: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Vest Price (FMV)</Label>
                <Input
                  type="number"
                  value={newEvent.vestPrice || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, vestPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Current Price</Label>
                <Input
                  type="number"
                  value={newEvent.currentPrice || ""}
                  onChange={(e) => setNewEvent({ ...newEvent, currentPrice: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleAdd}>Add Event</Button>
              <Button variant="outline" onClick={() => setShowAddForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Vesting Event
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ESPP Integration
 */
function ESPPIntegration() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-cyan-600" />
          ESPP Integration
        </CardTitle>
        <CardDescription>
          Employee Stock Purchase Plan tax treatment
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ESPP Basics */}
        <div className="rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900 p-4">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-cyan-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-cyan-900 dark:text-cyan-100 mb-2">
                The 15% ESPP Discount
              </div>
              <p className="text-sm text-cyan-800 dark:text-cyan-200">
                Most ESPPs let you buy company stock at a 15% discount from the lower of:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Stock price at offering start (lookback)</li>
                  <li>Stock price at purchase date</li>
                </ul>
                This discount is essentially "free money" - with the right tax treatment.
              </p>
            </div>
          </div>
        </div>

        {/* Qualifying vs Disqualifying */}
        <div className="space-y-4">
          <h4 className="font-semibold">Qualifying vs Disqualifying Dispositions</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20 p-4">
              <div className="font-semibold text-green-800 dark:text-green-200 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Qualifying Disposition
              </div>
              <ul className="text-sm text-green-700 dark:text-green-300 space-y-1 list-disc list-inside">
                <li>Hold 2+ years from offering date</li>
                <li>Hold 1+ year from purchase date</li>
                <li>Only 15% discount = ordinary income</li>
                <li>Remaining gain = LTCG (15-20%)</li>
              </ul>
            </div>

            <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20 p-4">
              <div className="font-semibold text-red-800 dark:text-red-200 mb-2 flex items-center gap-2">
                <X className="h-4 w-4" />
                Disqualifying Disposition
              </div>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                <li>Sold before meeting hold requirements</li>
                <li>Full discount = ordinary income</li>
                <li>If sold at gain: more ordinary income</li>
                <li>Higher overall tax bill</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Example Calculation */}
        <div className="rounded-lg border p-4">
          <h4 className="font-semibold mb-3">Example Calculation</h4>
          <div className="text-sm space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <span className="text-muted-foreground">Offering date price:</span>
              <span>$100</span>
              <span className="text-muted-foreground">Purchase date price:</span>
              <span>$120</span>
              <span className="text-muted-foreground">Your purchase price (15% off lower):</span>
              <span className="font-medium">$85 ($100 x 0.85)</span>
              <span className="text-muted-foreground">Current price:</span>
              <span>$150</span>
            </div>
            <div className="border-t pt-2 mt-2">
              <div className="grid grid-cols-2 gap-2">
                <span className="font-medium">Qualifying Disposition:</span>
                <span></span>
                <span className="text-muted-foreground pl-4">Ordinary income:</span>
                <span>$15 (15% discount)</span>
                <span className="text-muted-foreground pl-4">LTCG:</span>
                <span>$50 ($150 - $100)</span>

                <span className="font-medium mt-2">Disqualifying Disposition:</span>
                <span></span>
                <span className="text-muted-foreground pl-4">Ordinary income:</span>
                <span>$35 ($120 - $85)</span>
                <span className="text-muted-foreground pl-4">Cap gains:</span>
                <span>$30 ($150 - $120)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Recommendation */}
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 p-4">
          <div className="flex items-start gap-3">
            <Lightbulb className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                When to Disqualify Intentionally
              </div>
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                If the stock has dropped below your purchase price, a disqualifying disposition
                can create an ordinary loss (more valuable than capital loss). Also consider
                disqualifying if you need liquidity and concentration risk is high.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Integration with Main Calculator
 */
function IntegrationPanel({
  vestingEvents,
  currentIncome,
  filingStatus,
  totalNetWorth,
}: {
  vestingEvents: VestingEvent[];
  currentIncome: number;
  filingStatus: FilingStatusExtended;
  totalNetWorth: number;
}) {
  const [includeUnvested, setIncludeUnvested] = useState(false);
  const [riskAdjustment, setRiskAdjustment] = useState(0.5); // 50% haircut for unvested

  const equityValue = useMemo(() => {
    const vestedValue = vestingEvents
      .filter((e) => daysUntil(e.date) <= 0)
      .reduce((sum, e) => sum + e.shares * e.currentPrice, 0);

    const unvestedValue = vestingEvents
      .filter((e) => daysUntil(e.date) > 0)
      .reduce((sum, e) => sum + e.shares * e.currentPrice, 0);

    return {
      vested: vestedValue,
      unvested: unvestedValue,
      adjusted: vestedValue + (includeUnvested ? unvestedValue * riskAdjustment : 0),
    };
  }, [vestingEvents, includeUnvested, riskAdjustment]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LineChart className="h-5 w-5 text-indigo-600" />
          Main Calculator Integration
        </CardTitle>
        <CardDescription>
          Include equity compensation in retirement projections
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Include Unvested Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <div className="font-medium">Include Unvested Equity</div>
            <div className="text-sm text-muted-foreground">
              Add unvested grants to net worth projections
            </div>
          </div>
          <Switch
            checked={includeUnvested}
            onCheckedChange={setIncludeUnvested}
          />
        </div>

        {/* Risk Adjustment */}
        {includeUnvested && (
          <div className="space-y-3">
            <div className="flex justify-between">
              <Label>Risk Adjustment (Haircut)</Label>
              <span className="text-sm font-medium">{(riskAdjustment * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={riskAdjustment * 100}
              onChange={(e) => setRiskAdjustment(parseInt(e.target.value) / 100)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0% (ignore unvested)</span>
              <span>100% (full value)</span>
            </div>
          </div>
        )}

        {/* Value Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Vested Equity</div>
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {fmt(equityValue.vested)}
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <div className="text-sm text-muted-foreground mb-1">Unvested Equity</div>
            <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {fmt(equityValue.unvested)}
            </div>
            <div className="text-xs text-muted-foreground">
              {includeUnvested && `(${fmtPct(riskAdjustment)} = ${fmt(equityValue.unvested * riskAdjustment)})`}
            </div>
          </div>

          <div className="rounded-lg border bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 p-4">
            <div className="text-sm text-muted-foreground mb-1">For Projections</div>
            <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-400">
              {fmt(equityValue.adjusted)}
            </div>
          </div>
        </div>

        {/* Concentration Warning */}
        {totalNetWorth > 0 && equityValue.adjusted / totalNetWorth > 0.2 && (
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <div className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                  Concentration Risk Adjustment Recommended
                </div>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  Equity represents {fmtPct(equityValue.adjusted / totalNetWorth)} of your projected net worth.
                  Consider using a more conservative growth rate or higher risk adjustment
                  in your retirement projections.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Apply to Calculator Button */}
        <Button className="w-full" size="lg">
          <Sparkles className="h-4 w-4 mr-2" />
          Apply to Main Calculator
        </Button>
      </CardContent>
    </Card>
  );
}

// ==================== Main Component ====================

export const StockCompensation = React.memo(function StockCompensation({
  filingStatus = "single",
  currentIncome = 150000,
  totalNetWorth = 500000,
  age = 35,
  isInsider = false,
  onUpdateProjections,
}: StockCompensationProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [vestingEvents, setVestingEvents] = useState<VestingEvent[]>([]);
  const [isoSpread, setIsoSpread] = useState(0);
  const [companyStockValue, setCompanyStockValue] = useState(100000);

  // Add sample vesting event
  const handleAddEvent = useCallback((event: Omit<VestingEvent, "id">) => {
    const newEvent: VestingEvent = {
      ...event,
      id: `event-${Date.now()}`,
    };
    setVestingEvents((prev) => [...prev, newEvent]);
  }, []);

  const handleRemoveEvent = useCallback((id: string) => {
    setVestingEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  // Calculate overall tax projection
  const overallProjection = useMemo((): TaxProjection => {
    const rsuIncome = vestingEvents
      .filter((e) => e.type === "RSU")
      .reduce((sum, e) => sum + e.shares * e.vestPrice, 0);

    const nsoIncome = vestingEvents
      .filter((e) => e.type === "NSO")
      .reduce((sum, e) => sum + e.shares * (e.vestPrice - e.grantPrice), 0);

    const totalOrdinaryIncome = currentIncome + rsuIncome + nsoIncome;
    const federalTax = calcFederalTax(totalOrdinaryIncome, filingStatus);
    const standardWithholding = (rsuIncome + nsoIncome) * FEDERAL_WITHHOLDING_RATE;

    const { amtLiability } = calcAMT(currentIncome, isoSpread, filingStatus);

    return {
      ordinaryIncome: rsuIncome + nsoIncome,
      capitalGains: 0,
      amtIncome: isoSpread,
      totalTax: federalTax + amtLiability,
      effectiveRate: totalOrdinaryIncome > 0 ? (federalTax + amtLiability) / totalOrdinaryIncome : 0,
      withholdingGap: (federalTax - calcFederalTax(currentIncome, filingStatus)) - standardWithholding,
      setAsideRecommendation: Math.max(0, (federalTax - calcFederalTax(currentIncome, filingStatus)) - standardWithholding) * 1.1,
    };
  }, [vestingEvents, currentIncome, filingStatus, isoSpread]);

  // Determine what equity types user has
  const hasISOs = vestingEvents.some((e) => e.type === "ISO");
  const hasESPP = vestingEvents.some((e) => e.type === "ESPP");

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-emerald-600" />
          Stock Compensation Tax Planner
        </CardTitle>
        <CardDescription>
          RSUs, ISOs, NSOs, and ESPP - the complete guide to equity compensation taxes.
          Knowledge advisors charge thousands for, now free.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:grid-cols-8">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="rsu">RSUs</TabsTrigger>
            <TabsTrigger value="options">ISO/NSO</TabsTrigger>
            <TabsTrigger value="amt">AMT</TabsTrigger>
            <TabsTrigger value="concentration">Risk</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="espp">ESPP</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
                <div className="text-sm text-muted-foreground mb-1">Equity Income</div>
                <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                  {fmt(overallProjection.ordinaryIncome)}
                </div>
                <div className="text-xs text-muted-foreground">RSU + NSO this year</div>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
                <div className="text-sm text-muted-foreground mb-1">Est. Tax Liability</div>
                <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                  {fmt(overallProjection.totalTax - calcFederalTax(currentIncome, filingStatus))}
                </div>
                <div className="text-xs text-muted-foreground">On equity income</div>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950/20 dark:to-pink-950/20 p-4">
                <div className="text-sm text-muted-foreground mb-1">Withholding Gap</div>
                <div className={`text-2xl font-bold ${overallProjection.withholdingGap > 0 ? "text-red-700 dark:text-red-400" : "text-green-700 dark:text-green-400"}`}>
                  {overallProjection.withholdingGap > 0 ? fmt(overallProjection.withholdingGap) : "$0"}
                </div>
                <div className="text-xs text-muted-foreground">Additional tax owed</div>
              </div>

              <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-950/20 dark:to-violet-950/20 p-4">
                <div className="text-sm text-muted-foreground mb-1">Set Aside Now</div>
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                  {fmt(overallProjection.setAsideRecommendation)}
                </div>
                <div className="text-xs text-muted-foreground">For tax payments</div>
              </div>
            </div>

            {/* Getting Started */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Getting Started
                  </div>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                    <li>Add your vesting events in the Calendar tab</li>
                    <li>Review RSU basics if you have RSUs</li>
                    <li>Check ISO/NSO tab for stock options</li>
                    <li>Run the AMT calculator if you have ISOs</li>
                    <li>Assess concentration risk in the Risk tab</li>
                    <li>Review optimization strategies</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Quick Reference */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Equity Type Summary
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-blue-100 text-blue-800">RSU</Badge>
                      Restricted Stock Units
                    </span>
                    <span className="text-muted-foreground">Ordinary income at vest</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-green-100 text-green-800">ISO</Badge>
                      Incentive Stock Options
                    </span>
                    <span className="text-muted-foreground">No tax at exercise*</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-purple-100 text-purple-800">NSO</Badge>
                      Non-Qualified Options
                    </span>
                    <span className="text-muted-foreground">Ordinary income at exercise</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Badge className="bg-cyan-100 text-cyan-800">ESPP</Badge>
                      Employee Stock Purchase
                    </span>
                    <span className="text-muted-foreground">15% discount, special rules</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Common Mistakes
                </h4>
                <ul className="text-sm text-muted-foreground space-y-2 list-disc list-inside">
                  <li>Assuming 22% withholding is enough (it's not)</li>
                  <li>Exercising ISOs without checking AMT</li>
                  <li>Holding too much in company stock</li>
                  <li>Selling ESPP before qualifying period</li>
                  <li>Missing the 83(b) 30-day deadline</li>
                </ul>
              </div>
            </div>
          </TabsContent>

          {/* RSU Tab */}
          <TabsContent value="rsu" className="mt-6">
            <RSUBasics
              vestingEvents={vestingEvents}
              currentIncome={currentIncome}
              filingStatus={filingStatus}
            />
          </TabsContent>

          {/* ISO/NSO Tab */}
          <TabsContent value="options" className="mt-6">
            <ISOvsNSO
              vestingEvents={vestingEvents}
              currentIncome={currentIncome}
              filingStatus={filingStatus}
            />
          </TabsContent>

          {/* AMT Tab */}
          <TabsContent value="amt" className="mt-6">
            <AMTCalculator
              currentIncome={currentIncome}
              isoSpread={isoSpread}
              filingStatus={filingStatus}
              onSpreadChange={setIsoSpread}
            />
          </TabsContent>

          {/* Concentration Risk Tab */}
          <TabsContent value="concentration" className="mt-6">
            <ConcentrationRisk
              companyStockValue={companyStockValue}
              totalNetWorth={totalNetWorth}
              isInsider={isInsider}
            />
          </TabsContent>

          {/* Strategies Tab */}
          <TabsContent value="strategies" className="mt-6">
            <TaxOptimization
              filingStatus={filingStatus}
              currentIncome={currentIncome}
              hasISOs={hasISOs}
              hasESPP={hasESPP}
            />
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar" className="mt-6">
            <VestDateCalendar
              vestingEvents={vestingEvents}
              onAddEvent={handleAddEvent}
              onRemoveEvent={handleRemoveEvent}
              filingStatus={filingStatus}
              currentIncome={currentIncome}
            />
          </TabsContent>

          {/* ESPP Tab */}
          <TabsContent value="espp" className="mt-6">
            <ESPPIntegration />
          </TabsContent>
        </Tabs>

        {/* Integration Panel - Always visible at bottom */}
        <div className="mt-8 pt-8 border-t">
          <IntegrationPanel
            vestingEvents={vestingEvents}
            currentIncome={currentIncome}
            filingStatus={filingStatus}
            totalNetWorth={totalNetWorth}
          />
        </div>
      </CardContent>
    </Card>
  );
});

StockCompensation.displayName = "StockCompensation";

export default StockCompensation;
