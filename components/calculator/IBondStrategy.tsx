"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  ExternalLink,
  Gift,
  HelpCircle,
  Home,
  Info,
  Landmark,
  Lock,
  PiggyBank,
  RefreshCw,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  GraduationCap,
} from "lucide-react"
import { TYPOGRAPHY, METRIC_COLORS } from "@/lib/designTokens"
import { fmtFull, fmtPctRaw } from "@/lib/utils"

// ==================== Types & Constants ====================

interface IBondRates {
  compositeRate: number // Annual composite rate as decimal (e.g., 0.0490 = 4.90%)
  fixedRate: number // Fixed rate component
  inflationRate: number // Inflation rate component (semiannual)
  effectiveDate: string // When this rate took effect
  nextResetDate: string // When rate will next reset
}

// Current I-Bond rates (as of May 2025 - update as needed)
const CURRENT_RATES: IBondRates = {
  compositeRate: 0.0490,
  fixedRate: 0.012, // 1.20% fixed
  inflationRate: 0.0185, // 1.85% semiannual inflation
  effectiveDate: "May 1, 2025",
  nextResetDate: "November 1, 2025",
}

// Purchase limits
const PURCHASE_LIMITS = {
  electronic: 10000, // Per person per calendar year
  paperTaxRefund: 5000, // Via tax refund
  total: 15000, // Maximum per person per year
}

interface IBondCalculatorInputs {
  purchaseAmount: number
  holdingYears: number
  assumedInflationRate: number // Annual inflation assumption
  taxBracket: number // Federal marginal tax bracket
  stateIncomeGap: number // State income tax rate avoided
}

interface ProjectedValue {
  year: number
  nominalValue: number
  realValue: number
  interestEarned: number
  effectiveAfterTaxYield: number
}

// ==================== Helper Functions ====================

/**
 * Calculate I-Bond composite rate from fixed and inflation components
 * Formula: Composite = Fixed + (2 x Inflation) + (Fixed x Inflation)
 */
function calculateCompositeRate(fixedRate: number, inflationRate: number): number {
  return fixedRate + 2 * inflationRate + fixedRate * inflationRate
}

/**
 * Project I-Bond value over time
 */
function projectIBondValue(
  initialAmount: number,
  holdingYears: number,
  fixedRate: number,
  annualInflation: number
): ProjectedValue[] {
  const projections: ProjectedValue[] = []
  let currentValue = initialAmount
  let totalInterest = 0

  // Semiannual inflation rate
  const semiannualInflation = annualInflation / 2

  for (let year = 1; year <= holdingYears; year++) {
    // Calculate composite rate for each 6-month period
    const compositeRate = calculateCompositeRate(fixedRate, semiannualInflation)

    // Apply rate semiannually (compounded)
    const yearStartValue = currentValue
    currentValue = currentValue * (1 + compositeRate / 2)
    currentValue = currentValue * (1 + compositeRate / 2)

    const yearInterest = currentValue - yearStartValue
    totalInterest += yearInterest

    // Calculate real value (inflation-adjusted)
    const realValue = currentValue / Math.pow(1 + annualInflation, year)

    projections.push({
      year,
      nominalValue: currentValue,
      realValue,
      interestEarned: totalInterest,
      effectiveAfterTaxYield: compositeRate,
    })
  }

  return projections
}

/**
 * Calculate effective after-tax yield considering tax deferral
 */
function calculateAfterTaxAdvantage(
  nominalYield: number,
  holdingYears: number,
  federalTaxBracket: number,
  stateTaxRate: number
): {
  ibondAfterTax: number
  taxableEquivalent: number
  annualTaxSavings: number
} {
  // I-Bonds: State tax exempt, federal deferred
  // At redemption, only federal tax applies
  const ibondAfterTax = nominalYield * (1 - federalTaxBracket)

  // Taxable bond would pay both state and federal annually
  const taxableAfterTax = nominalYield * (1 - federalTaxBracket - stateTaxRate)

  // Tax-equivalent yield (what taxable bond would need to yield)
  const taxableEquivalent = ibondAfterTax / (1 - stateTaxRate)

  // Annual savings from state tax exemption
  const annualTaxSavings = nominalYield * stateTaxRate

  return {
    ibondAfterTax,
    taxableEquivalent,
    annualTaxSavings,
  }
}

// ==================== Sub-Components ====================

interface RateDisplayProps {
  rates: IBondRates
}

function RateDisplay({ rates }: RateDisplayProps) {
  const compositePercent = rates.compositeRate * 100
  const fixedPercent = rates.fixedRate * 100
  const inflationPercent = rates.inflationRate * 100

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-emerald-600" />
          Current I-Bond Rate
        </h3>
        <Badge variant="outline" className="bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
          Effective {rates.effectiveDate}
        </Badge>
      </div>

      <div className="text-center mb-4">
        <div className={`${TYPOGRAPHY.metricLarge} text-emerald-700 dark:text-emerald-300`}>
          {fmtPctRaw(compositePercent, 2)}
        </div>
        <div className={TYPOGRAPHY.bodyMuted}>Composite Annual Rate</div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
          <div className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
            {fmtPctRaw(fixedPercent, 2)}
          </div>
          <div className={TYPOGRAPHY.helperText}>Fixed Rate</div>
          <div className="text-xs text-muted-foreground">(locked for 30 years)</div>
        </div>
        <div className="text-center p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
          <div className={`${TYPOGRAPHY.metricSmall} text-amber-600 dark:text-amber-400`}>
            {fmtPctRaw(inflationPercent, 2)}
          </div>
          <div className={TYPOGRAPHY.helperText}>Inflation Rate</div>
          <div className="text-xs text-muted-foreground">(adjusts every 6 mo)</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <RefreshCw className="h-4 w-4" />
        <span>Rates reset {rates.nextResetDate}</span>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export interface IBondStrategyProps {
  /** Initial purchase amount for calculator */
  defaultPurchaseAmount?: number
  /** Initial holding period */
  defaultHoldingYears?: number
  /** User's federal tax bracket */
  defaultTaxBracket?: number
  /** Compact mode for embedding */
  compact?: boolean
}

export function IBondStrategy({
  defaultPurchaseAmount = 10000,
  defaultHoldingYears = 5,
  defaultTaxBracket = 0.24,
  compact = false,
}: IBondStrategyProps) {
  // Form state
  const [inputs, setInputs] = useState<IBondCalculatorInputs>({
    purchaseAmount: defaultPurchaseAmount,
    holdingYears: defaultHoldingYears,
    assumedInflationRate: 0.03, // 3% default inflation assumption
    taxBracket: defaultTaxBracket,
    stateIncomeGap: 0.05, // 5% state tax rate
  })

  const [activeTab, setActiveTab] = useState("overview")

  // Update handler
  const updateInput = useCallback(
    <K extends keyof IBondCalculatorInputs>(key: K, value: IBondCalculatorInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Calculations
  const projections = useMemo(
    () =>
      projectIBondValue(
        inputs.purchaseAmount,
        inputs.holdingYears,
        CURRENT_RATES.fixedRate,
        inputs.assumedInflationRate
      ),
    [inputs.purchaseAmount, inputs.holdingYears, inputs.assumedInflationRate]
  )

  const finalProjection = projections[projections.length - 1] || {
    nominalValue: inputs.purchaseAmount,
    realValue: inputs.purchaseAmount,
    interestEarned: 0,
  }

  const taxAdvantage = useMemo(
    () =>
      calculateAfterTaxAdvantage(
        CURRENT_RATES.compositeRate,
        inputs.holdingYears,
        inputs.taxBracket,
        inputs.stateIncomeGap
      ),
    [inputs.holdingYears, inputs.taxBracket, inputs.stateIncomeGap]
  )

  // Penalty calculation
  const earlyRedemptionPenalty = useMemo(() => {
    if (inputs.holdingYears < 1) {
      return {
        canRedeem: false,
        penalty: "Cannot redeem - 12-month lockup",
        penaltyAmount: 0,
      }
    }
    if (inputs.holdingYears < 5) {
      // 3 months interest penalty
      const monthlyInterest = finalProjection.interestEarned / (inputs.holdingYears * 12)
      const penalty = monthlyInterest * 3
      return {
        canRedeem: true,
        penalty: "3-month interest penalty applies",
        penaltyAmount: penalty,
      }
    }
    return {
      canRedeem: true,
      penalty: "No penalty - held 5+ years",
      penaltyAmount: 0,
    }
  }, [inputs.holdingYears, finalProjection.interestEarned])

  // Married couple maximum
  const marriedMaxPurchase = PURCHASE_LIMITS.electronic * 2 + PURCHASE_LIMITS.paperTaxRefund * 2

  return (
    <Card className={compact ? "" : "w-full"}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-emerald-600" />
          I-Bond Strategy Guide
        </CardTitle>
        <CardDescription>
          The best risk-free investment you have never heard of. Treasury savings bonds with
          inflation protection, tax advantages, and zero default risk.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">
              <Info className="h-4 w-4 mr-1 hidden sm:inline" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="rates" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Rates
            </TabsTrigger>
            <TabsTrigger value="limits" className="text-xs sm:text-sm">
              <Lock className="h-4 w-4 mr-1 hidden sm:inline" />
              Limits
            </TabsTrigger>
            <TabsTrigger value="strategy" className="text-xs sm:text-sm">
              <Sparkles className="h-4 w-4 mr-1 hidden sm:inline" />
              Strategy
            </TabsTrigger>
            <TabsTrigger value="redemption" className="text-xs sm:text-sm">
              <Clock className="h-4 w-4 mr-1 hidden sm:inline" />
              Rules
            </TabsTrigger>
            <TabsTrigger value="uses" className="text-xs sm:text-sm">
              <Wallet className="h-4 w-4 mr-1 hidden sm:inline" />
              Uses
            </TabsTrigger>
            <TabsTrigger value="calculator" className="text-xs sm:text-sm">
              <Calculator className="h-4 w-4 mr-1 hidden sm:inline" />
              Calc
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Overview - What are I-Bonds? */}
          <TabsContent value="overview" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* What are I-Bonds */}
              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-900">
                  <h3 className="font-semibold text-lg mb-4 flex items-center gap-2 text-blue-900 dark:text-blue-100">
                    <Shield className="h-5 w-5 text-blue-600" />
                    What are I-Bonds?
                  </h3>
                  <ul className="space-y-3">
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Treasury Savings Bonds</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Backed by the full faith and credit of the U.S. government - zero default risk
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Inflation-Protected</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Rate adjusts every 6 months based on CPI-U inflation
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">Tax-Deferred Growth</div>
                        <p className={TYPOGRAPHY.helperText}>
                          No taxes until you redeem - compound your full earnings
                        </p>
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <div className="font-medium">State Tax Exempt</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Interest is exempt from state and local income taxes
                        </p>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Comparison to alternatives */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    How I-Bonds Compare
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>High-Yield Savings (HYSA)</span>
                      <span className="text-muted-foreground">Taxed annually, no inflation lock</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TIPS (Treasury Inflation Protected)</span>
                      <span className="text-muted-foreground">Market price risk, phantom tax</span>
                    </div>
                    <div className="flex justify-between">
                      <span>CDs</span>
                      <span className="text-muted-foreground">Fixed rate, no inflation protection</span>
                    </div>
                    <div className="flex justify-between font-medium text-emerald-600 dark:text-emerald-400">
                      <span>I-Bonds</span>
                      <span>Best of all worlds</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Current Rate Display */}
              <div className="space-y-4">
                <RateDisplay rates={CURRENT_RATES} />

                {/* Key Features */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className={`${TYPOGRAPHY.metricSmall} text-emerald-700 dark:text-emerald-300`}>
                      0%
                    </div>
                    <div className={TYPOGRAPHY.helperText}>Default Risk</div>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-center">
                    <div className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                      30 yrs
                    </div>
                    <div className={TYPOGRAPHY.helperText}>Maturity</div>
                  </div>
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-center">
                    <div className={`${TYPOGRAPHY.metricSmall} text-amber-700 dark:text-amber-300`}>
                      1 yr
                    </div>
                    <div className={TYPOGRAPHY.helperText}>Min Hold</div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 text-center">
                    <div className={`${TYPOGRAPHY.metricSmall} text-purple-700 dark:text-purple-300`}>
                      $25
                    </div>
                    <div className={TYPOGRAPHY.helperText}>Minimum</div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-900">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="font-medium text-yellow-900 dark:text-yellow-100">
                        The Hidden Gem
                      </h4>
                      <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                        I-Bonds are one of the best-kept secrets in personal finance. Low purchase
                        limits make them unavailable to institutional investors, so they remain
                        underadvertised but incredibly valuable for individual savers.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Current Rates */}
          <TabsContent value="rates" className="space-y-6 mt-6">
            <RateDisplay rates={CURRENT_RATES} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* How rates work */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  How the Rate Works
                </h3>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Composite Rate Formula</h4>
                    <div className="font-mono text-sm bg-white dark:bg-gray-800 p-3 rounded border">
                      Composite = Fixed + (2 x Inflation) + (Fixed x Inflation)
                    </div>
                    <p className={`${TYPOGRAPHY.helperText} mt-2`}>
                      The fixed rate is locked when you buy. The inflation rate adjusts every 6 months.
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <h4 className="font-medium mb-2">Rate Components</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="bg-blue-50">Fixed</Badge>
                        <span>Set by Treasury when you buy, never changes for your bond</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <Badge variant="outline" className="bg-amber-50">Inflation</Badge>
                        <span>Based on CPI-U, resets every May 1 and November 1</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Floor Protection
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    If deflation occurs, your I-Bond value can never go down. The inflation component
                    can go negative, but your principal is protected. Worst case: you earn 0% for that period.
                  </p>
                </div>
              </div>

              {/* Rate history and reset schedule */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  Rate Reset Schedule
                </h3>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                      <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">
                        May
                      </div>
                      <div>
                        <div className="font-medium">May 1 Rate Reset</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Based on October-March CPI-U data
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800">
                      <div className="w-12 h-12 rounded-full bg-orange-600 text-white flex items-center justify-center font-bold">
                        Nov
                      </div>
                      <div>
                        <div className="font-medium">November 1 Rate Reset</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Based on April-September CPI-U data
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t">
                    <p className={TYPOGRAPHY.bodyMuted}>
                      <strong>Your rate anniversary:</strong> Your I-Bond earns the rate in effect when you
                      bought it for 6 months, then switches to the new rate. This happens every 6 months
                      from your purchase date.
                    </p>
                  </div>
                </div>

                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Rate Arbitrage Tip
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    If the current rate is high and the upcoming reset is expected to be lower, buy
                    before the reset. You will lock in the higher rate for 6 months. Vice versa if the
                    new rate is expected to be higher.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Purchase Limits */}
          <TabsContent value="limits" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Purchase limits breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-emerald-600" />
                  Annual Purchase Limits
                </h3>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-5 w-5 text-blue-600" />
                        <span className="font-medium">Electronic (TreasuryDirect)</span>
                      </div>
                      <span className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                        {fmtFull(PURCHASE_LIMITS.electronic)}
                      </span>
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Per Social Security Number, per calendar year
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <PiggyBank className="h-5 w-5 text-amber-600" />
                        <span className="font-medium">Paper (Tax Refund)</span>
                      </div>
                      <span className={`${TYPOGRAPHY.metricSmall} text-amber-700 dark:text-amber-300`}>
                        {fmtFull(PURCHASE_LIMITS.paperTaxRefund)}
                      </span>
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Via IRS Form 8888 with your tax refund
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-emerald-600" />
                        <span className="font-medium">Per Person Total</span>
                      </div>
                      <span className={`${TYPOGRAPHY.metricSmall} text-emerald-700 dark:text-emerald-300`}>
                        {fmtFull(PURCHASE_LIMITS.total)}
                      </span>
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Maximum including both electronic and paper
                    </p>
                  </div>
                </div>
              </div>

              {/* Married couple strategy */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-600" />
                  Married Couple Strategy
                </h3>

                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                  <div className="text-center mb-4">
                    <div className={`${TYPOGRAPHY.metricLarge} text-purple-700 dark:text-purple-300`}>
                      {fmtFull(marriedMaxPurchase)}
                    </div>
                    <div className={TYPOGRAPHY.bodyMuted}>Maximum per year (married couple)</div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                      <span>Spouse 1 Electronic</span>
                      <span className="font-medium">{fmtFull(PURCHASE_LIMITS.electronic)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                      <span>Spouse 2 Electronic</span>
                      <span className="font-medium">{fmtFull(PURCHASE_LIMITS.electronic)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                      <span>Spouse 1 Paper (Tax Refund)</span>
                      <span className="font-medium">{fmtFull(PURCHASE_LIMITS.paperTaxRefund)}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/50 dark:bg-gray-900/50 rounded">
                      <span>Spouse 2 Paper (Tax Refund)</span>
                      <span className="font-medium">{fmtFull(PURCHASE_LIMITS.paperTaxRefund)}</span>
                    </div>
                    <div className="flex justify-between p-2 font-semibold border-t pt-3">
                      <span>Total</span>
                      <span className="text-purple-700 dark:text-purple-300">{fmtFull(marriedMaxPurchase)}</span>
                    </div>
                  </div>
                </div>

                {/* Trust and entity options */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-muted-foreground" />
                    Additional Capacity
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Living Trust:</strong> Can purchase $10K/year as separate entity
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Business:</strong> LLCs, corporations can each buy $10K/year
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>
                        <strong>Children:</strong> Each child with SSN can have $10K/year
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 4: Purchase Strategy */}
          <TabsContent value="strategy" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Timing strategy */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-blue-600" />
                  When to Buy
                </h3>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                      Buy BEFORE Reset When:
                    </h4>
                    <ul className="space-y-1 text-sm text-emerald-800 dark:text-emerald-200">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Current rate is high and expected to drop
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        CPI data suggests lower inflation ahead
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Lock in current fixed rate if it is attractive
                      </li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-2">
                      Wait for Reset When:
                    </h4>
                    <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        New rate is expected to be significantly higher
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        New fixed rate is expected to increase
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        CPI data shows rising inflation
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Pro Tip: Monthly Purchases
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Instead of buying $10K in January, consider spreading purchases across the year
                    ($833/month). This dollar-cost averages your entry into different rate cycles
                    and creates a "ladder" of redemption dates.
                  </p>
                </div>
              </div>

              {/* Gift box strategy */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Gift className="h-5 w-5 text-purple-600" />
                  Gift Box Strategy
                </h3>

                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                  <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                    You can buy I-Bonds as gifts for others, even yourself! The purchase counts
                    against YOUR limit, but the bond sits in your "gift box" until delivered.
                  </p>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        1
                      </div>
                      <div>
                        <div className="font-medium">Buy as Gift (Dec 2025)</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Purchase up to $10K for spouse as a gift - uses YOUR 2025 limit
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        2
                      </div>
                      <div>
                        <div className="font-medium">Hold in Gift Box</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Bond earns interest but stays in your account
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-white/50 dark:bg-gray-900/50 rounded-lg">
                      <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        3
                      </div>
                      <div>
                        <div className="font-medium">Deliver in January 2026</div>
                        <p className={TYPOGRAPHY.helperText}>
                          Counts against spouse's 2026 limit, not 2025
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded border border-yellow-200 dark:border-yellow-800">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      <strong>Result:</strong> In a single calendar year, one spouse could have up to
                      $20K in I-Bonds by receiving a gift + buying their own $10K.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Redemption Rules */}
          <TabsContent value="redemption" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Redemption rules */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Redemption Rules
                </h3>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                    <div className="flex items-center gap-3 mb-2">
                      <Lock className="h-5 w-5 text-red-600" />
                      <span className="font-semibold text-red-900 dark:text-red-100">
                        12-Month Lockup
                      </span>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">
                      You cannot redeem I-Bonds within the first 12 months. This is non-negotiable -
                      no exceptions for any reason.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center gap-3 mb-2">
                      <AlertCircle className="h-5 w-5 text-amber-600" />
                      <span className="font-semibold text-amber-900 dark:text-amber-100">
                        3-Month Interest Penalty (Year 1-5)
                      </span>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      If you redeem between 1-5 years, you forfeit the last 3 months of interest.
                      Example: After 18 months, you receive 15 months of interest.
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex items-center gap-3 mb-2">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-900 dark:text-emerald-100">
                        No Penalty After 5 Years
                      </span>
                    </div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200">
                      After holding for 5 years, you can redeem anytime with no penalty.
                      Full interest retained.
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax implications */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-blue-600" />
                  Tax Treatment at Redemption
                </h3>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">Federal Income Tax</span>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Interest is taxed as ordinary income in the year of redemption.
                      You receive a 1099-INT.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span className="font-medium">State/Local Tax: EXEMPT</span>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Interest is fully exempt from state and local income taxes.
                    </p>
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Education Tax Exclusion</span>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      If used for qualified higher education expenses, interest may be
                      100% tax-free (income limits apply). Must meet ownership requirements.
                    </p>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    Partial Redemption
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    You can redeem any amount over $25 (minimum redemption). You do not have to
                    cash out the entire bond. This allows tax planning by spreading redemptions
                    across tax years.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeline visualization */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
              <h4 className="font-semibold mb-4">I-Bond Timeline</h4>
              <div className="relative">
                <div className="absolute top-4 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="relative flex justify-between">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm z-10">
                      0
                    </div>
                    <div className="mt-2 text-center">
                      <div className="font-medium text-sm">Purchase</div>
                      <div className={TYPOGRAPHY.helperText}>Start earning</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-bold text-sm z-10">
                      1
                    </div>
                    <div className="mt-2 text-center">
                      <div className="font-medium text-sm">Year 1</div>
                      <div className={TYPOGRAPHY.helperText}>Lockup ends</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-sm z-10">
                      5
                    </div>
                    <div className="mt-2 text-center">
                      <div className="font-medium text-sm">Year 5</div>
                      <div className={TYPOGRAPHY.helperText}>No penalty</div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-sm z-10">
                      30
                    </div>
                    <div className="mt-2 text-center">
                      <div className="font-medium text-sm">Year 30</div>
                      <div className={TYPOGRAPHY.helperText}>Maturity</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Where I-Bonds Fit */}
          <TabsContent value="uses" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Emergency Fund */}
              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                    <Shield className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="font-semibold">Emergency Fund</h3>
                </div>
                <p className={`${TYPOGRAPHY.bodyMuted} mb-3`}>
                  Use I-Bonds as a second-tier emergency fund component after you have 3-6 months
                  in a regular HYSA.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Inflation-protected emergency savings</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    <span>Higher yield than most HYSAs</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                    <span>Remember: 12-month lockup</span>
                  </div>
                </div>
              </div>

              {/* Bond Allocation */}
              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="font-semibold">Bond Allocation</h3>
                </div>
                <p className={`${TYPOGRAPHY.bodyMuted} mb-3`}>
                  Replace part of your traditional bond allocation with I-Bonds for better
                  inflation protection and tax efficiency.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>No interest rate risk (unlike bond funds)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>True inflation protection (vs TIPS)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span>Tax-deferred compounding</span>
                  </div>
                </div>
              </div>

              {/* Known Future Expenses */}
              <div className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="font-semibold">Future Expenses</h3>
                </div>
                <p className={`${TYPOGRAPHY.bodyMuted} mb-3`}>
                  Perfect for known expenses 5+ years out: house down payment, car, education,
                  wedding, etc.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <GraduationCap className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>College savings (tax-free if qualified)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Home className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>House down payment (inflation-matched)</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Wallet className="h-4 w-4 text-purple-500 mt-0.5 flex-shrink-0" />
                    <span>Any planned purchase 5+ years out</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Asset Location */}
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Landmark className="h-5 w-5 text-blue-600" />
                Asset Location: Where I-Bonds Belong
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                  <h4 className="font-medium text-emerald-900 dark:text-emerald-100 mb-2">
                    Taxable Account
                  </h4>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">Best Location</span>
                  </div>
                  <p className={TYPOGRAPHY.helperText}>
                    Already tax-deferred. State tax exempt. Perfect for taxable accounts.
                  </p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border">
                  <h4 className="font-medium mb-2">401(k) / IRA</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium text-muted-foreground">Not Possible</span>
                  </div>
                  <p className={TYPOGRAPHY.helperText}>
                    I-Bonds cannot be held in retirement accounts.
                  </p>
                </div>
                <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border">
                  <h4 className="font-medium mb-2">Roth IRA</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                    <span className="font-medium text-muted-foreground">Not Possible</span>
                  </div>
                  <p className={TYPOGRAPHY.helperText}>
                    I-Bonds are only available through TreasuryDirect, not brokerages.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 7: Calculator */}
          <TabsContent value="calculator" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Calculator inputs */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  I-Bond Calculator
                </h3>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                  {/* Purchase Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="purchaseAmount" className={TYPOGRAPHY.inputLabel}>
                      Purchase Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="purchaseAmount"
                        type="number"
                        value={inputs.purchaseAmount}
                        onChange={(e) => updateInput("purchaseAmount", Number(e.target.value) || 0)}
                        max={PURCHASE_LIMITS.total}
                        className="pl-8"
                      />
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      Max ${PURCHASE_LIMITS.electronic.toLocaleString()}/year electronic,
                      ${PURCHASE_LIMITS.total.toLocaleString()} total
                    </p>
                  </div>

                  {/* Holding Period */}
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>
                      Holding Period: {inputs.holdingYears} years
                    </Label>
                    <Slider
                      value={[inputs.holdingYears]}
                      onValueChange={([v]) => updateInput("holdingYears", v)}
                      min={1}
                      max={30}
                      step={1}
                      thumbLabel="Years"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 year (min)</span>
                      <span>5 years (no penalty)</span>
                      <span>30 years (maturity)</span>
                    </div>
                  </div>

                  {/* Inflation Assumption */}
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>
                      Assumed Annual Inflation: {fmtPctRaw(inputs.assumedInflationRate * 100, 1)}
                    </Label>
                    <Slider
                      value={[inputs.assumedInflationRate * 100]}
                      onValueChange={([v]) => updateInput("assumedInflationRate", v / 100)}
                      min={0}
                      max={10}
                      step={0.5}
                      thumbLabel="Inflation"
                    />
                    <p className={TYPOGRAPHY.helperText}>
                      Historical average: ~3%. This affects the inflation component of your rate.
                    </p>
                  </div>

                  {/* Tax Bracket */}
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>
                      Federal Tax Bracket: {fmtPctRaw(inputs.taxBracket * 100, 0)}
                    </Label>
                    <Slider
                      value={[inputs.taxBracket * 100]}
                      onValueChange={([v]) => updateInput("taxBracket", v / 100)}
                      min={10}
                      max={37}
                      step={1}
                      thumbLabel="Tax bracket"
                    />
                  </div>

                  {/* State Tax */}
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>
                      State Income Tax: {fmtPctRaw(inputs.stateIncomeGap * 100, 1)}
                    </Label>
                    <Slider
                      value={[inputs.stateIncomeGap * 100]}
                      onValueChange={([v]) => updateInput("stateIncomeGap", v / 100)}
                      min={0}
                      max={13}
                      step={0.5}
                      thumbLabel="State tax"
                    />
                    <p className={TYPOGRAPHY.helperText}>
                      You save this rate on I-Bond interest (state tax exempt)
                    </p>
                  </div>
                </div>
              </div>

              {/* Calculator results */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  Projected Results
                </h3>

                {/* Main results */}
                <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-lg p-6 border border-emerald-200 dark:border-emerald-800">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center">
                      <div className={TYPOGRAPHY.metricLabel}>Initial Investment</div>
                      <div className={`${TYPOGRAPHY.metricMedium} text-gray-700 dark:text-gray-300`}>
                        {fmtFull(inputs.purchaseAmount)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={TYPOGRAPHY.metricLabel}>
                        After {inputs.holdingYears} Years
                      </div>
                      <div className={`${TYPOGRAPHY.metricMedium} text-emerald-700 dark:text-emerald-300`}>
                        {fmtFull(finalProjection.nominalValue)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
                    <div className="text-center">
                      <div className={TYPOGRAPHY.metricLabel}>Total Interest</div>
                      <div className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                        +{fmtFull(finalProjection.interestEarned)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className={TYPOGRAPHY.metricLabel}>Real Value</div>
                      <div className={`${TYPOGRAPHY.metricSmall} text-purple-600 dark:text-purple-400`}>
                        {fmtFull(finalProjection.realValue)}
                      </div>
                      <div className={TYPOGRAPHY.helperText}>(inflation-adjusted)</div>
                    </div>
                  </div>
                </div>

                {/* Early redemption warning */}
                <div
                  className={`rounded-lg p-4 border ${
                    earlyRedemptionPenalty.canRedeem
                      ? earlyRedemptionPenalty.penaltyAmount > 0
                        ? "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800"
                        : "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
                      : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {earlyRedemptionPenalty.canRedeem ? (
                      earlyRedemptionPenalty.penaltyAmount > 0 ? (
                        <AlertCircle className="h-5 w-5 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      )
                    ) : (
                      <Lock className="h-5 w-5 text-red-600" />
                    )}
                    <div>
                      <div className="font-medium">{earlyRedemptionPenalty.penalty}</div>
                      {earlyRedemptionPenalty.penaltyAmount > 0 && (
                        <div className={TYPOGRAPHY.helperText}>
                          Penalty: ~{fmtFull(earlyRedemptionPenalty.penaltyAmount)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tax advantage */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Tax Advantage
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>I-Bond After-Tax Yield</span>
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        {fmtPctRaw(taxAdvantage.ibondAfterTax * 100, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Taxable Equivalent Yield</span>
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {fmtPctRaw(taxAdvantage.taxableEquivalent * 100, 2)}
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span>Annual State Tax Savings</span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {fmtFull(inputs.purchaseAmount * taxAdvantage.annualTaxSavings)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Year-by-year projections */}
                {projections.length > 0 && (
                  <Accordion type="single" collapsible>
                    <AccordionItem value="projections">
                      <AccordionTrigger>Year-by-Year Projections</AccordionTrigger>
                      <AccordionContent>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                              <tr>
                                <th className="p-2 text-left">Year</th>
                                <th className="p-2 text-right">Value</th>
                                <th className="p-2 text-right">Interest</th>
                              </tr>
                            </thead>
                            <tbody>
                              {projections.map((proj) => (
                                <tr key={proj.year} className="border-t">
                                  <td className="p-2">{proj.year}</td>
                                  <td className="p-2 text-right font-mono">
                                    {fmtFull(proj.nominalValue)}
                                  </td>
                                  <td className="p-2 text-right font-mono text-emerald-600 dark:text-emerald-400">
                                    +{fmtFull(proj.interestEarned)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </div>
            </div>

            {/* TreasuryDirect link */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/50">
                    <Landmark className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Ready to Buy I-Bonds?</h4>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Purchase directly from TreasuryDirect.gov (the only way to buy)
                    </p>
                  </div>
                </div>
                <Button asChild className="whitespace-nowrap">
                  <a
                    href="https://www.treasurydirect.gov/savings-bonds/i-bonds/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Go to TreasuryDirect
                  </a>
                </Button>
              </div>

              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-700">
                <h5 className="font-medium mb-2 text-sm">TreasuryDirect Tips</h5>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    The website is outdated but functional - be patient
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Set up your bank account during registration
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Create a "Custom Security Question" - write it down!
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    Choose "BuyDirect" then "Series I" to purchase
                  </li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Disclaimer */}
        <div className="mt-8 p-4 rounded-lg bg-muted/30 border">
          <p className={`${TYPOGRAPHY.helperText} text-center`}>
            I-Bond rates and rules are set by the U.S. Treasury and may change. This guide
            is for educational purposes. Verify current rates at TreasuryDirect.gov before
            making purchase decisions. Interest projections are estimates based on assumed
            future inflation rates.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

export default IBondStrategy
