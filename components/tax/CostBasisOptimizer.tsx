"use client";

/**
 * Cost Basis Optimizer Component
 *
 * Tax lot optimization tool helping users minimize taxes on investment sales:
 * 1. FIFO vs LIFO vs Specific Lot comparison
 * 2. Tax-loss harvesting opportunities
 * 3. Wash sale warning detection
 * 4. Long-term vs short-term gains analysis
 * 5. Optimal lot selection for withdrawals
 * 6. Year-end tax projection
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Info,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Calculator,
  ChevronDown,
  ChevronUp,
  ArrowRightLeft,
  Percent,
  Clock,
  Layers,
  Target,
  Shield,
  Lightbulb,
  BarChart3,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { fmt, fmtFull } from "@/lib/utils";
import {
  CAPITAL_GAINS_BRACKETS_2026,
  TAX_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  type FilingStatus,
} from "@/lib/constants/tax2026";

// ==================== Types ====================

interface TaxLot {
  id: string;
  purchaseDate: Date;
  shares: number;
  costBasis: number; // per share
  currentPrice: number;
  symbol: string;
}

interface LotAnalysis {
  lot: TaxLot;
  gain: number;
  gainPercent: number;
  isLongTerm: boolean;
  holdingPeriodDays: number;
  daysUntilLongTerm: number;
  taxRate: number;
  taxLiability: number;
  netProceeds: number;
}

interface MethodComparison {
  method: "FIFO" | "LIFO" | "HIFO" | "Specific";
  lotsUsed: LotAnalysis[];
  totalGain: number;
  shortTermGain: number;
  longTermGain: number;
  totalTax: number;
  netProceeds: number;
  taxSavings: number; // vs worst method
}

interface HarvestOpportunity {
  lot: TaxLot;
  potentialLoss: number;
  taxSavings: number;
  washSaleRisk: boolean;
  washSaleEndDate: Date;
  recommendation: string;
}

interface YearEndProjection {
  realizedGains: number;
  realizedLosses: number;
  netGainLoss: number;
  unrealizedGains: number;
  unrealizedLosses: number;
  harvestableOpportunity: number;
  projectedTaxLiability: number;
  optimizedTaxLiability: number;
  potentialSavings: number;
}

interface CostBasisOptimizerProps {
  taxLots?: TaxLot[];
  currentPrice?: number;
  sharesToSell?: number;
  filingStatus?: FilingStatus;
  taxableIncome?: number;
  realizedGainsYTD?: number;
  realizedLossesYTD?: number;
  recentPurchases?: { symbol: string; date: Date }[];
}

// ==================== Sample Data ====================

const generateSampleLots = (): TaxLot[] => {
  const now = new Date();
  return [
    {
      id: "lot-1",
      purchaseDate: new Date(now.getFullYear() - 3, 2, 15),
      shares: 100,
      costBasis: 145.00,
      currentPrice: 185.50,
      symbol: "VTI",
    },
    {
      id: "lot-2",
      purchaseDate: new Date(now.getFullYear() - 2, 6, 22),
      shares: 50,
      costBasis: 162.50,
      currentPrice: 185.50,
      symbol: "VTI",
    },
    {
      id: "lot-3",
      purchaseDate: new Date(now.getFullYear() - 1, 0, 10),
      shares: 75,
      costBasis: 171.25,
      currentPrice: 185.50,
      symbol: "VTI",
    },
    {
      id: "lot-4",
      purchaseDate: new Date(now.getFullYear(), 1, 5),
      shares: 40,
      costBasis: 195.00,
      currentPrice: 185.50,
      symbol: "VTI",
    },
    {
      id: "lot-5",
      purchaseDate: new Date(now.getFullYear(), 4, 20),
      shares: 60,
      costBasis: 178.75,
      currentPrice: 185.50,
      symbol: "VTI",
    },
    {
      id: "lot-6",
      purchaseDate: new Date(now.getFullYear(), 8, 1),
      shares: 25,
      costBasis: 192.00,
      currentPrice: 185.50,
      symbol: "VTI",
    },
  ];
};

// ==================== Helper Functions ====================

const LONG_TERM_DAYS = 366; // More than 1 year

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / oneDay));
}

/**
 * Check if a lot qualifies for long-term capital gains
 */
function isLongTerm(purchaseDate: Date, sellDate: Date = new Date()): boolean {
  return daysBetween(purchaseDate, sellDate) >= LONG_TERM_DAYS;
}

/**
 * Get capital gains tax rate based on income and gain type
 */
function getCapitalGainsTaxRate(
  taxableIncome: number,
  filingStatus: FilingStatus,
  isLongTermGain: boolean
): number {
  if (!isLongTermGain) {
    // Short-term gains taxed as ordinary income
    const brackets = TAX_BRACKETS_2026[filingStatus];
    for (let i = brackets.length - 1; i >= 0; i--) {
      if (taxableIncome > brackets[i].min) {
        return brackets[i].rate;
      }
    }
    return brackets[0].rate;
  }

  // Long-term capital gains rates
  const brackets = CAPITAL_GAINS_BRACKETS_2026[filingStatus];
  for (let i = brackets.length - 1; i >= 0; i--) {
    if (taxableIncome > brackets[i].min) {
      return brackets[i].rate;
    }
  }
  return brackets[0].rate;
}

/**
 * Analyze a single tax lot
 */
function analyzeLot(
  lot: TaxLot,
  sellDate: Date,
  taxableIncome: number,
  filingStatus: FilingStatus
): LotAnalysis {
  const gain = (lot.currentPrice - lot.costBasis) * lot.shares;
  const gainPercent = ((lot.currentPrice - lot.costBasis) / lot.costBasis) * 100;
  const holdingPeriodDays = daysBetween(lot.purchaseDate, sellDate);
  const longTerm = holdingPeriodDays >= LONG_TERM_DAYS;
  const daysUntilLongTerm = longTerm ? 0 : LONG_TERM_DAYS - holdingPeriodDays;
  const taxRate = getCapitalGainsTaxRate(taxableIncome, filingStatus, longTerm);
  const taxLiability = Math.max(0, gain * taxRate);
  const netProceeds = lot.currentPrice * lot.shares - taxLiability;

  return {
    lot,
    gain,
    gainPercent,
    isLongTerm: longTerm,
    holdingPeriodDays,
    daysUntilLongTerm,
    taxRate,
    taxLiability,
    netProceeds,
  };
}

/**
 * Compare different lot selection methods
 */
function compareMethods(
  lots: TaxLot[],
  sharesToSell: number,
  taxableIncome: number,
  filingStatus: FilingStatus
): MethodComparison[] {
  const sellDate = new Date();
  const analyzedLots = lots.map((lot) => analyzeLot(lot, sellDate, taxableIncome, filingStatus));

  const methods: MethodComparison[] = [];

  // FIFO - First In, First Out
  const fifoLots = [...analyzedLots].sort(
    (a, b) => a.lot.purchaseDate.getTime() - b.lot.purchaseDate.getTime()
  );
  methods.push(calculateMethodResult("FIFO", fifoLots, sharesToSell, taxableIncome, filingStatus));

  // LIFO - Last In, First Out
  const lifoLots = [...analyzedLots].sort(
    (a, b) => b.lot.purchaseDate.getTime() - a.lot.purchaseDate.getTime()
  );
  methods.push(calculateMethodResult("LIFO", lifoLots, sharesToSell, taxableIncome, filingStatus));

  // HIFO - Highest In, First Out (minimize gains by selling highest cost first)
  const hifoLots = [...analyzedLots].sort((a, b) => b.lot.costBasis - a.lot.costBasis);
  methods.push(calculateMethodResult("HIFO", hifoLots, sharesToSell, taxableIncome, filingStatus));

  // Calculate optimal specific lot selection
  const specificLots = optimizeSpecificLots(analyzedLots, sharesToSell, taxableIncome, filingStatus);
  methods.push(specificLots);

  // Calculate tax savings vs worst method
  const maxTax = Math.max(...methods.map((m) => m.totalTax));
  methods.forEach((m) => {
    m.taxSavings = maxTax - m.totalTax;
  });

  return methods;
}

/**
 * Calculate result for a lot selection method
 */
function calculateMethodResult(
  method: "FIFO" | "LIFO" | "HIFO" | "Specific",
  sortedLots: LotAnalysis[],
  sharesToSell: number,
  taxableIncome: number,
  filingStatus: FilingStatus
): MethodComparison {
  const lotsUsed: LotAnalysis[] = [];
  let remainingShares = sharesToSell;
  let totalGain = 0;
  let shortTermGain = 0;
  let longTermGain = 0;
  let totalTax = 0;
  let netProceeds = 0;

  for (const analysis of sortedLots) {
    if (remainingShares <= 0) break;

    const sharesToUse = Math.min(remainingShares, analysis.lot.shares);
    const proportion = sharesToUse / analysis.lot.shares;

    const lotGain = analysis.gain * proportion;
    const lotTax = analysis.taxLiability * proportion;
    const lotProceeds = analysis.netProceeds * proportion;

    lotsUsed.push({
      ...analysis,
      lot: { ...analysis.lot, shares: sharesToUse },
      gain: lotGain,
      taxLiability: lotTax,
      netProceeds: lotProceeds,
    });

    totalGain += lotGain;
    if (analysis.isLongTerm) {
      longTermGain += lotGain;
    } else {
      shortTermGain += lotGain;
    }
    totalTax += lotTax;
    netProceeds += lotProceeds;
    remainingShares -= sharesToUse;
  }

  return {
    method,
    lotsUsed,
    totalGain,
    shortTermGain,
    longTermGain,
    totalTax,
    netProceeds,
    taxSavings: 0,
  };
}

/**
 * Optimize specific lot selection for minimum tax
 */
function optimizeSpecificLots(
  analyzedLots: LotAnalysis[],
  sharesToSell: number,
  taxableIncome: number,
  filingStatus: FilingStatus
): MethodComparison {
  // Strategy: Prioritize losses, then long-term gains with lowest rates, then short-term
  const sorted = [...analyzedLots].sort((a, b) => {
    // Losses first (most negative gain)
    if (a.gain < 0 && b.gain >= 0) return -1;
    if (b.gain < 0 && a.gain >= 0) return 1;
    if (a.gain < 0 && b.gain < 0) return a.gain - b.gain;

    // Then long-term gains (lower tax rate)
    if (a.isLongTerm && !b.isLongTerm) return -1;
    if (!a.isLongTerm && b.isLongTerm) return 1;

    // Within same category, lower gain percentage first
    return a.gainPercent - b.gainPercent;
  });

  return calculateMethodResult("Specific", sorted, sharesToSell, taxableIncome, filingStatus);
}

/**
 * Find tax-loss harvesting opportunities
 */
function findHarvestingOpportunities(
  lots: TaxLot[],
  taxableIncome: number,
  filingStatus: FilingStatus,
  recentPurchases: { symbol: string; date: Date }[] = []
): HarvestOpportunity[] {
  const opportunities: HarvestOpportunity[] = [];
  const now = new Date();
  const washSaleWindow = 30; // days

  for (const lot of lots) {
    const gain = (lot.currentPrice - lot.costBasis) * lot.shares;
    if (gain >= 0) continue; // Only losses

    const potentialLoss = Math.abs(gain);
    const marginalRate = getCapitalGainsTaxRate(taxableIncome, filingStatus, false);
    const taxSavings = potentialLoss * marginalRate;

    // Check for wash sale risk
    const washSaleEndDate = new Date(now);
    washSaleEndDate.setDate(washSaleEndDate.getDate() + washSaleWindow);

    const washSaleRisk = recentPurchases.some((p) => {
      if (p.symbol !== lot.symbol) return false;
      const daysSincePurchase = daysBetween(p.date, now);
      return daysSincePurchase <= washSaleWindow;
    });

    let recommendation = "";
    if (washSaleRisk) {
      recommendation = `Wait until wash sale window ends or sell different position. Avoid repurchasing ${lot.symbol} within 30 days.`;
    } else if (potentialLoss > 3000) {
      recommendation = `Consider harvesting ${fmtFull(potentialLoss)} loss. If losses exceed gains, up to $3,000 can offset ordinary income.`;
    } else {
      recommendation = `Harvest ${fmtFull(potentialLoss)} loss to offset gains. Can immediately buy similar (not identical) fund.`;
    }

    opportunities.push({
      lot,
      potentialLoss,
      taxSavings,
      washSaleRisk,
      washSaleEndDate,
      recommendation,
    });
  }

  return opportunities.sort((a, b) => b.taxSavings - a.taxSavings);
}

/**
 * Calculate year-end tax projection
 */
function calculateYearEndProjection(
  lots: TaxLot[],
  realizedGainsYTD: number,
  realizedLossesYTD: number,
  taxableIncome: number,
  filingStatus: FilingStatus
): YearEndProjection {
  let unrealizedGains = 0;
  let unrealizedLosses = 0;

  for (const lot of lots) {
    const gain = (lot.currentPrice - lot.costBasis) * lot.shares;
    if (gain >= 0) {
      unrealizedGains += gain;
    } else {
      unrealizedLosses += Math.abs(gain);
    }
  }

  const netGainLoss = realizedGainsYTD - realizedLossesYTD;
  const harvestableOpportunity = Math.min(unrealizedLosses, Math.max(0, netGainLoss));

  // Current projection
  const shortTermRate = getCapitalGainsTaxRate(taxableIncome, filingStatus, false);
  const longTermRate = getCapitalGainsTaxRate(taxableIncome, filingStatus, true);
  const avgRate = (shortTermRate + longTermRate) / 2;
  const projectedTaxLiability = Math.max(0, netGainLoss) * avgRate;

  // Optimized projection (if we harvest losses)
  const optimizedNetGain = Math.max(0, netGainLoss - harvestableOpportunity);
  const optimizedTaxLiability = optimizedNetGain * avgRate;
  const potentialSavings = projectedTaxLiability - optimizedTaxLiability;

  return {
    realizedGains: realizedGainsYTD,
    realizedLosses: realizedLossesYTD,
    netGainLoss,
    unrealizedGains,
    unrealizedLosses,
    harvestableOpportunity,
    projectedTaxLiability,
    optimizedTaxLiability,
    potentialSavings,
  };
}

// ==================== Sub-Components ====================

/**
 * Method comparison card
 */
function MethodCard({
  comparison,
  isBest,
  isWorst,
}: {
  comparison: MethodComparison;
  isBest: boolean;
  isWorst: boolean;
}) {
  const methodLabels = {
    FIFO: "First In, First Out",
    LIFO: "Last In, First Out",
    HIFO: "Highest Cost First",
    Specific: "Optimized Selection",
  };

  const methodDescriptions = {
    FIFO: "Sells oldest shares first. Default method if you don't specify.",
    LIFO: "Sells newest shares first. May result in more short-term gains.",
    HIFO: "Sells highest cost basis first. Minimizes taxable gains.",
    Specific: "AI-optimized lot selection for minimum tax liability.",
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4 transition-all",
        isBest && "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/30",
        isWorst && "border-red-200 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20",
        !isBest && !isWorst && "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{comparison.method}</h4>
            {isBest && (
              <Badge className="bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Best
              </Badge>
            )}
            {isWorst && (
              <Badge variant="outline" className="text-red-600 border-red-300">
                Highest Tax
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{methodLabels[comparison.method]}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{methodDescriptions[comparison.method]}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Total Gain</div>
          <div
            className={cn(
              "font-bold",
              comparison.totalGain >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {comparison.totalGain >= 0 ? "+" : ""}
            {fmtFull(comparison.totalGain)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Tax Liability</div>
          <div className="font-bold text-amber-600">{fmtFull(comparison.totalTax)}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Short-term:</span>
          <span
            className={cn(
              "font-medium",
              comparison.shortTermGain >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {comparison.shortTermGain >= 0 ? "+" : ""}
            {fmt(comparison.shortTermGain)}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Long-term:</span>
          <span
            className={cn(
              "font-medium",
              comparison.longTermGain >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {comparison.longTermGain >= 0 ? "+" : ""}
            {fmt(comparison.longTermGain)}
          </span>
        </div>
      </div>

      <div className="pt-3 border-t">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Net Proceeds</span>
          <span className="text-lg font-bold text-blue-600">{fmtFull(comparison.netProceeds)}</span>
        </div>
        {isBest && comparison.taxSavings > 0 && (
          <div className="mt-2 text-xs text-green-600 font-medium flex items-center gap-1">
            <TrendingDown className="h-3 w-3" />
            Saves {fmtFull(comparison.taxSavings)} vs worst method
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Lot details table
 */
function LotDetailsTable({ lots }: { lots: LotAnalysis[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Purchase Date</TableHead>
          <TableHead className="text-right">Shares</TableHead>
          <TableHead className="text-right">Cost Basis</TableHead>
          <TableHead className="text-right">Gain/Loss</TableHead>
          <TableHead>Type</TableHead>
          <TableHead className="text-right">Tax Rate</TableHead>
          <TableHead className="text-right">Tax</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {lots.map((analysis, idx) => (
          <TableRow key={idx}>
            <TableCell>
              {analysis.lot.purchaseDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </TableCell>
            <TableCell className="text-right">{analysis.lot.shares.toFixed(2)}</TableCell>
            <TableCell className="text-right">{fmtFull(analysis.lot.costBasis)}</TableCell>
            <TableCell
              className={cn(
                "text-right font-medium",
                analysis.gain >= 0 ? "text-green-600" : "text-red-600"
              )}
            >
              {analysis.gain >= 0 ? "+" : ""}
              {fmtFull(analysis.gain)}
            </TableCell>
            <TableCell>
              <Badge variant={analysis.isLongTerm ? "default" : "secondary"}>
                {analysis.isLongTerm ? "Long-Term" : "Short-Term"}
              </Badge>
            </TableCell>
            <TableCell className="text-right">{(analysis.taxRate * 100).toFixed(0)}%</TableCell>
            <TableCell className="text-right font-medium text-amber-600">
              {fmtFull(analysis.taxLiability)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * Tax-loss harvesting card
 */
function HarvestingOpportunityCard({ opportunity }: { opportunity: HarvestOpportunity }) {
  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        opportunity.washSaleRisk
          ? "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/30"
          : "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{opportunity.lot.symbol}</Badge>
            <span className="text-sm text-muted-foreground">
              {opportunity.lot.shares} shares @ {fmtFull(opportunity.lot.costBasis)}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Purchased{" "}
            {opportunity.lot.purchaseDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </div>
        </div>
        {opportunity.washSaleRisk && (
          <Badge className="bg-yellow-500">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Wash Sale Risk
          </Badge>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-3">
        <div>
          <div className="text-xs text-muted-foreground">Harvestable Loss</div>
          <div className="text-xl font-bold text-red-600">
            -{fmtFull(opportunity.potentialLoss)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Potential Tax Savings</div>
          <div className="text-xl font-bold text-green-600">{fmtFull(opportunity.taxSavings)}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-muted-foreground">{opportunity.recommendation}</p>
        </div>
      </div>

      {opportunity.washSaleRisk && (
        <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400">
          Wash sale window ends:{" "}
          {opportunity.washSaleEndDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Year-end projection visualization
 */
function YearEndProjectionCard({ projection }: { projection: YearEndProjection }) {
  const hasOpportunity = projection.potentialSavings > 0;

  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        {/* Current Position */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-600" />
            YTD Realized Position
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Realized Gains</span>
              <span className="font-medium text-green-600">
                +{fmtFull(projection.realizedGains)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Realized Losses</span>
              <span className="font-medium text-red-600">-{fmtFull(projection.realizedLosses)}</span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Net Gain/Loss</span>
              <span
                className={cn(
                  "font-bold",
                  projection.netGainLoss >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {projection.netGainLoss >= 0 ? "+" : ""}
                {fmtFull(projection.netGainLoss)}
              </span>
            </div>
          </div>
        </div>

        {/* Unrealized Position */}
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            Unrealized Position
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unrealized Gains</span>
              <span className="font-medium text-green-600">
                +{fmtFull(projection.unrealizedGains)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Unrealized Losses</span>
              <span className="font-medium text-red-600">
                -{fmtFull(projection.unrealizedLosses)}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium">Harvestable</span>
              <span className="font-bold text-amber-600">
                {fmtFull(projection.harvestableOpportunity)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Projection Comparison */}
      <div
        className={cn(
          "rounded-xl p-4 border-2",
          hasOpportunity
            ? "border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30"
            : "border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900/50"
        )}
      >
        <h4 className="font-semibold mb-4 flex items-center gap-2">
          <Target className="h-4 w-4 text-green-600" />
          Tax Projection Comparison
        </h4>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>Current Trajectory</span>
              <span className="font-medium">{fmtFull(projection.projectedTaxLiability)}</span>
            </div>
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full" style={{ width: "100%" }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>With Tax-Loss Harvesting</span>
              <span className="font-medium text-green-600">
                {fmtFull(projection.optimizedTaxLiability)}
              </span>
            </div>
            <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{
                  width: `${
                    projection.projectedTaxLiability > 0
                      ? (projection.optimizedTaxLiability / projection.projectedTaxLiability) * 100
                      : 0
                  }%`,
                }}
              />
            </div>
          </div>
        </div>

        {hasOpportunity && (
          <div className="mt-4 p-3 bg-white dark:bg-gray-900 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                <span className="font-medium">Potential Tax Savings</span>
              </div>
              <span className="text-2xl font-bold text-green-600">
                {fmtFull(projection.potentialSavings)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Wash sale warning panel
 */
function WashSaleWarning({ recentPurchases }: { recentPurchases: { symbol: string; date: Date }[] }) {
  if (recentPurchases.length === 0) return null;

  const now = new Date();
  const activeRisks = recentPurchases.filter((p) => daysBetween(p.date, now) <= 30);

  if (activeRisks.length === 0) return null;

  return (
    <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
        <div>
          <h4 className="font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
            Wash Sale Warning
          </h4>
          <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
            You have recent purchases that may trigger wash sale rules if you sell losses in the same
            securities:
          </p>
          <div className="space-y-1">
            {activeRisks.map((p, idx) => {
              const daysRemaining = 30 - daysBetween(p.date, now);
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded p-2"
                >
                  <span className="font-medium">{p.symbol}</span>
                  <span className="text-muted-foreground">
                    {daysRemaining} days until window closes
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-yellow-700 dark:text-yellow-400">
            <strong>Wash Sale Rule:</strong> If you sell a security at a loss and buy the same or
            substantially identical security within 30 days before or after, the loss is disallowed.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export function CostBasisOptimizer({
  taxLots = generateSampleLots(),
  sharesToSell: initialSharesToSell = 50,
  filingStatus: initialFilingStatus = "single",
  taxableIncome: initialTaxableIncome = 85000,
  realizedGainsYTD = 5000,
  realizedLossesYTD = 1200,
  recentPurchases = [],
}: CostBasisOptimizerProps) {
  // State
  const [filingStatus, setFilingStatus] = useState<FilingStatus>(initialFilingStatus);
  const [taxableIncome, setTaxableIncome] = useState(initialTaxableIncome);
  const [sharesToSell, setSharesToSell] = useState(initialSharesToSell);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [showLotDetails, setShowLotDetails] = useState(false);

  // Total available shares
  const totalShares = useMemo(() => taxLots.reduce((sum, lot) => sum + lot.shares, 0), [taxLots]);

  // Method comparisons
  const methodComparisons = useMemo(
    () => compareMethods(taxLots, sharesToSell, taxableIncome, filingStatus),
    [taxLots, sharesToSell, taxableIncome, filingStatus]
  );

  // Best and worst methods
  const bestMethod = useMemo(
    () => methodComparisons.reduce((best, m) => (m.totalTax < best.totalTax ? m : best)),
    [methodComparisons]
  );

  const worstMethod = useMemo(
    () => methodComparisons.reduce((worst, m) => (m.totalTax > worst.totalTax ? m : worst)),
    [methodComparisons]
  );

  // Tax-loss harvesting opportunities
  const harvestingOpportunities = useMemo(
    () => findHarvestingOpportunities(taxLots, taxableIncome, filingStatus, recentPurchases),
    [taxLots, taxableIncome, filingStatus, recentPurchases]
  );

  // Year-end projection
  const yearEndProjection = useMemo(
    () =>
      calculateYearEndProjection(taxLots, realizedGainsYTD, realizedLossesYTD, taxableIncome, filingStatus),
    [taxLots, realizedGainsYTD, realizedLossesYTD, taxableIncome, filingStatus]
  );

  // Selected method details
  const selectedMethodDetails = useMemo(
    () => methodComparisons.find((m) => m.method === selectedMethod) || bestMethod,
    [methodComparisons, selectedMethod, bestMethod]
  );

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Cost Basis Optimizer
        </CardTitle>
        <CardDescription>
          Minimize your tax liability by comparing lot selection methods and identifying tax-loss
          harvesting opportunities.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="grid md:grid-cols-4 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="space-y-2">
            <Label className="text-xs">Shares to Sell</Label>
            <Select
              value={sharesToSell.toString()}
              onValueChange={(v) => setSharesToSell(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[25, 50, 75, 100, 150, 200].map((n) => (
                  <SelectItem key={n} value={n.toString()} disabled={n > totalShares}>
                    {n} shares {n > totalShares ? "(exceeds available)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground">Available: {totalShares.toFixed(0)}</div>
          </div>

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

          <div className="space-y-2">
            <Label className="text-xs">Taxable Income</Label>
            <Select
              value={taxableIncome.toString()}
              onValueChange={(v) => setTaxableIncome(Number(v))}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50000">$50,000</SelectItem>
                <SelectItem value="85000">$85,000</SelectItem>
                <SelectItem value="125000">$125,000</SelectItem>
                <SelectItem value="200000">$200,000</SelectItem>
                <SelectItem value="400000">$400,000</SelectItem>
                <SelectItem value="600000">$600,000</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Current Price</Label>
            <div className="h-9 flex items-center px-3 bg-white dark:bg-gray-800 border rounded-md">
              <span className="font-medium">{fmtFull(taxLots[0]?.currentPrice || 0)}</span>
              <span className="text-xs text-muted-foreground ml-1">/share</span>
            </div>
          </div>
        </div>

        {/* Wash Sale Warning */}
        <WashSaleWarning recentPurchases={recentPurchases} />

        {/* Tabs */}
        <Tabs defaultValue="compare" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="compare" className="flex items-center gap-1">
              <ArrowRightLeft className="h-3 w-3" />
              <span className="hidden sm:inline">Compare</span>
            </TabsTrigger>
            <TabsTrigger value="harvest" className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              <span className="hidden sm:inline">Harvest</span>
            </TabsTrigger>
            <TabsTrigger value="projection" className="flex items-center gap-1">
              <BarChart3 className="h-3 w-3" />
              <span className="hidden sm:inline">Year-End</span>
            </TabsTrigger>
            <TabsTrigger value="lots" className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              <span className="hidden sm:inline">Lots</span>
            </TabsTrigger>
          </TabsList>

          {/* Compare Methods Tab */}
          <TabsContent value="compare" className="space-y-4 mt-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    About Lot Selection Methods
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    When selling shares, you can choose which lots (purchase batches) to sell.
                    Different methods result in different tax outcomes. The IRS allows specific
                    identification if you document which lots you're selling.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {methodComparisons.map((comparison) => (
                <MethodCard
                  key={comparison.method}
                  comparison={comparison}
                  isBest={comparison.method === bestMethod.method}
                  isWorst={comparison.method === worstMethod.method}
                />
              ))}
            </div>

            {/* Recommendation */}
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">
                    Recommendation: Use {bestMethod.method}
                  </h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    Selling {sharesToSell} shares using the {bestMethod.method} method results in{" "}
                    <strong>{fmtFull(bestMethod.totalTax)}</strong> in taxes, saving you{" "}
                    <strong>{fmtFull(bestMethod.taxSavings)}</strong> compared to the worst option.
                    {bestMethod.longTermGain > bestMethod.shortTermGain && (
                      <> Most gains are long-term, qualifying for the lower {(getCapitalGainsTaxRate(taxableIncome, filingStatus, true) * 100).toFixed(0)}% rate.</>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Lot details toggle */}
            <button
              onClick={() => setShowLotDetails(!showLotDetails)}
              className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
            >
              {showLotDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              {showLotDetails ? "Hide" : "Show"} Lot Details for {bestMethod.method}
            </button>

            {showLotDetails && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <LotDetailsTable lots={selectedMethodDetails.lotsUsed} />
              </div>
            )}
          </TabsContent>

          {/* Tax-Loss Harvesting Tab */}
          <TabsContent value="harvest" className="space-y-4 mt-4">
            <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Tax-Loss Harvesting
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    Selling investments at a loss to offset capital gains. Losses exceeding gains can
                    offset up to $3,000 of ordinary income per year. Unused losses carry forward
                    indefinitely.
                  </p>
                </div>
              </div>
            </div>

            {harvestingOpportunities.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Harvesting Opportunities</h4>
                  <Badge variant="outline" className="text-green-600 border-green-300">
                    {harvestingOpportunities.length} Available
                  </Badge>
                </div>

                <div className="space-y-3">
                  {harvestingOpportunities.map((opp, idx) => (
                    <HarvestingOpportunityCard key={idx} opportunity={opp} />
                  ))}
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-1">
                        Wash Sale Rule Reminder
                      </h4>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Avoid repurchasing the same or "substantially identical" security within 30 days
                        before or after the sale. Consider buying a similar but different fund (e.g.,
                        switch from VTI to ITOT) to maintain market exposure while harvesting the loss.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h4 className="font-semibold mb-2">No Harvesting Opportunities</h4>
                <p className="text-sm">All your positions are currently at a gain. Check back when markets decline.</p>
              </div>
            )}
          </TabsContent>

          {/* Year-End Projection Tab */}
          <TabsContent value="projection" className="space-y-4 mt-4">
            <YearEndProjectionCard projection={yearEndProjection} />

            {/* Action Items */}
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Year-End Tax Planning Checklist
              </h4>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Review unrealized losses for harvesting opportunities before December 31
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Check lots approaching 1-year holding period - consider waiting for long-term
                    treatment
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Coordinate with other income sources to optimize your tax bracket
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Consider gifting appreciated securities to charity for double benefit
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <span>
                    Watch for wash sale rule violations through December and into January
                  </span>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* All Lots Tab */}
          <TabsContent value="lots" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">All Tax Lots ({taxLots.length})</h4>
              <div className="text-sm text-muted-foreground">
                Total Value:{" "}
                <span className="font-medium">
                  {fmtFull(taxLots.reduce((sum, lot) => sum + lot.currentPrice * lot.shares, 0))}
                </span>
              </div>
            </div>

            <LotDetailsTable
              lots={taxLots.map((lot) => analyzeLot(lot, new Date(), taxableIncome, filingStatus))}
            />

            {/* Long-term vs Short-term Summary */}
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-600" />
                  <span className="font-medium">Long-Term Lots</span>
                </div>
                <div className="text-2xl font-bold text-green-600">
                  {taxLots.filter((lot) => isLongTerm(lot.purchaseDate)).length} lots
                </div>
                <div className="text-sm text-muted-foreground">
                  {taxLots
                    .filter((lot) => isLongTerm(lot.purchaseDate))
                    .reduce((sum, lot) => sum + lot.shares, 0)
                    .toFixed(0)}{" "}
                  shares qualify for lower rates
                </div>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="font-medium">Short-Term Lots</span>
                </div>
                <div className="text-2xl font-bold text-amber-600">
                  {taxLots.filter((lot) => !isLongTerm(lot.purchaseDate)).length} lots
                </div>
                <div className="text-sm text-muted-foreground">
                  {taxLots
                    .filter((lot) => !isLongTerm(lot.purchaseDate))
                    .reduce((sum, lot) => sum + lot.shares, 0)
                    .toFixed(0)}{" "}
                  shares taxed at ordinary income rates
                </div>
              </div>
            </div>

            {/* Lots approaching long-term status */}
            {(() => {
              const now = new Date();
              const approaching = taxLots.filter((lot) => {
                const days = daysBetween(lot.purchaseDate, now);
                return days < LONG_TERM_DAYS && days >= LONG_TERM_DAYS - 60;
              });

              if (approaching.length === 0) return null;

              return (
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                        Lots Approaching Long-Term Status
                      </h4>
                      <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                        These lots will qualify for lower long-term capital gains rates soon. Consider
                        waiting before selling:
                      </p>
                      <div className="space-y-2">
                        {approaching.map((lot, idx) => {
                          const daysToLT = LONG_TERM_DAYS - daysBetween(lot.purchaseDate, now);
                          return (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm bg-white dark:bg-gray-900 rounded p-2"
                            >
                              <span>
                                {lot.shares} shares @ {fmtFull(lot.costBasis)}
                              </span>
                              <Badge variant="outline" className="text-purple-600">
                                {daysToLT} days until long-term
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </TabsContent>
        </Tabs>

        {/* Footer disclaimer */}
        <div className="text-xs text-center text-muted-foreground pt-4 border-t">
          Tax calculations are estimates based on 2026 federal rates. Does not include state taxes, AMT, or
          NIIT. Consult a tax professional before making investment decisions. Past performance does not
          guarantee future results.
        </div>
      </CardContent>
    </Card>
  );
}

export default CostBasisOptimizer;
