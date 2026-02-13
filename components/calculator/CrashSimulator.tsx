"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Shield,
  Clock,
  DollarSign,
  Wallet,
  RefreshCcw,
  Users,
  Brain,
  Target,
  ChevronRight,
  Flame,
  Snowflake,
  ShoppingCart,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from "@/lib/designTokens"
import { fmt, fmtFull } from "@/lib/utils"

// ==================== Types ====================

interface HistoricalCrash {
  name: string
  years: string
  drop: number // Percentage drop (negative)
  recoveryYears: number // Years to recover to previous high
  description: string
  cause: string
}

type InvestorType = "accumulator" | "retiree"

interface CrashSimulatorProps {
  /** Current portfolio value */
  portfolioValue: number
  /** Annual expenses (for emergency fund calculation) */
  annualExpenses?: number
  /** Current emergency fund balance */
  emergencyFund?: number
  /** Current bond allocation percentage */
  bondAllocation?: number
  /** Years to retirement (negative if already retired) */
  yearsToRetirement?: number
  /** Monthly contribution during accumulation */
  monthlyContribution?: number
  /** Annual withdrawal rate in retirement */
  withdrawalRate?: number
  /** Current age */
  currentAge?: number
}

// ==================== Historical Data ====================

const HISTORICAL_CRASHES: HistoricalCrash[] = [
  {
    name: "2008 Financial Crisis",
    years: "2008-2009",
    drop: -37,
    recoveryYears: 4,
    description: "Housing bubble burst, bank failures, credit freeze",
    cause: "Subprime mortgages, excessive leverage, financial deregulation",
  },
  {
    name: "Dot-Com Bust",
    years: "2000-2002",
    drop: -49,
    recoveryYears: 7,
    description: "Tech bubble collapse, overvalued internet companies",
    cause: "Speculation, unrealistic valuations, Y2K spending hangover",
  },
  {
    name: "1973-74 Bear Market",
    years: "1973-1974",
    drop: -48,
    recoveryYears: 7,
    description: "Oil embargo, stagflation, Nixon resignation",
    cause: "OPEC oil embargo, high inflation, political instability",
  },
  {
    name: "COVID Crash",
    years: "2020",
    drop: -34,
    recoveryYears: 0.5,
    description: "Fastest crash in history, rapid recovery",
    cause: "Global pandemic, economic shutdown, unprecedented stimulus",
  },
  {
    name: "Black Monday",
    years: "1987",
    drop: -22,
    recoveryYears: 2,
    description: "Single-day 22% drop, program trading blamed",
    cause: "Program trading, portfolio insurance, overvaluation",
  },
  {
    name: "Great Depression",
    years: "1929-1932",
    drop: -89,
    recoveryYears: 25,
    description: "The worst market crash in US history",
    cause: "Speculation, margin buying, bank failures, policy errors",
  },
]

// ==================== Helper Functions ====================

/**
 * Calculate portfolio value after a crash
 */
function calculatePostCrashValue(currentValue: number, crashPercent: number): number {
  return currentValue * (1 + crashPercent / 100)
}

/**
 * Calculate recovery trajectory with DCA
 */
function calculateRecoveryWithDCA(
  postCrashValue: number,
  monthlyContribution: number,
  recoveryYears: number,
  annualReturn: number = 10 // Historical average post-crash returns are often higher
): { month: number; value: number; contributions: number }[] {
  const months = Math.ceil(recoveryYears * 12)
  const monthlyReturn = (1 + annualReturn / 100) ** (1 / 12) - 1
  const trajectory: { month: number; value: number; contributions: number }[] = []

  let value = postCrashValue
  let totalContributions = 0

  for (let m = 0; m <= months; m++) {
    trajectory.push({ month: m, value, contributions: totalContributions })
    if (m < months) {
      value = value * (1 + monthlyReturn) + monthlyContribution
      totalContributions += monthlyContribution
    }
  }

  return trajectory
}

/**
 * Calculate emergency fund runway in months
 */
function calculateEmergencyRunway(emergencyFund: number, monthlyExpenses: number): number {
  if (monthlyExpenses <= 0) return 0
  return Math.floor(emergencyFund / monthlyExpenses)
}

/**
 * Calculate sequence risk impact for retirees
 */
function calculateSequenceRisk(
  portfolioValue: number,
  withdrawalRate: number,
  crashPercent: number
): {
  precrashWithdrawal: number
  postcrashWithdrawal: number
  sustainableRate: number
  yearsImpacted: number
} {
  const postCrashValue = calculatePostCrashValue(portfolioValue, crashPercent)
  const precrashWithdrawal = portfolioValue * (withdrawalRate / 100)
  const postcrashWithdrawal = postCrashValue * (withdrawalRate / 100)

  // Calculate sustainable withdrawal rate post-crash (keeping absolute withdrawal same)
  const sustainableRate = (precrashWithdrawal / postCrashValue) * 100

  // Estimate years of retirement impacted by the crash
  const yearsImpacted = Math.abs(crashPercent) / 5 // Rough estimate

  return {
    precrashWithdrawal,
    postcrashWithdrawal,
    sustainableRate,
    yearsImpacted,
  }
}

/**
 * Calculate rebalancing opportunity value
 */
function calculateRebalancingOpportunity(
  portfolioValue: number,
  bondAllocation: number,
  crashPercent: number
): {
  bondsToSell: number
  stocksToBuy: number
  potentialGain: number
} {
  const postCrashValue = calculatePostCrashValue(portfolioValue, crashPercent)
  const currentBonds = portfolioValue * (bondAllocation / 100)
  const targetBonds = postCrashValue * (bondAllocation / 100)

  // In a crash, stocks drop but bonds typically hold steady or rise
  // So bonds become overweight relative to target
  const bondsExcess = currentBonds - targetBonds
  const bondsToSell = Math.max(0, bondsExcess)
  const stocksToBuy = bondsToSell

  // Potential gain from buying low (assuming 20% recovery)
  const potentialGain = stocksToBuy * 0.2

  return { bondsToSell, stocksToBuy, potentialGain }
}

// ==================== Sub-Components ====================

interface CrashCardProps {
  crash: HistoricalCrash
  portfolioValue: number
  isSelected: boolean
  onSelect: () => void
}

function CrashCard({ crash, portfolioValue, isSelected, onSelect }: CrashCardProps) {
  const postCrashValue = calculatePostCrashValue(portfolioValue, crash.drop)
  const loss = portfolioValue - postCrashValue

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
        isSelected
          ? "border-red-500 bg-red-50 dark:bg-red-950/30"
          : "border-border hover:border-red-300 dark:hover:border-red-700"
      }`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className={`${TYPOGRAPHY.sectionHeader} ${isSelected ? "text-red-700 dark:text-red-300" : ""}`}>
            {crash.name}
          </h4>
          <p className={TYPOGRAPHY.helperText}>{crash.years}</p>
        </div>
        <Badge
          variant="destructive"
          className="text-lg font-bold"
        >
          {crash.drop}%
        </Badge>
      </div>
      <p className={`${TYPOGRAPHY.bodyMuted} mb-3`}>{crash.description}</p>
      <div className="flex items-center justify-between">
        <div>
          <p className={TYPOGRAPHY.helperText}>Your Portfolio Would Drop</p>
          <p className={`${TYPOGRAPHY.metricSmall} text-red-600 dark:text-red-400`}>
            -{fmt(loss)}
          </p>
        </div>
        <div className="text-right">
          <p className={TYPOGRAPHY.helperText}>Recovery Time</p>
          <p className={TYPOGRAPHY.body}>
            ~{crash.recoveryYears} {crash.recoveryYears === 1 ? "year" : "years"}
          </p>
        </div>
      </div>
    </button>
  )
}

interface CrashImpactVisualizerProps {
  preValue: number
  postValue: number
  crashPercent: number
}

function CrashImpactVisualizer({ preValue, postValue, crashPercent }: CrashImpactVisualizerProps) {
  const loss = preValue - postValue
  const postPercentage = (postValue / preValue) * 100

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <p className={TYPOGRAPHY.metricLabel}>Before Crash</p>
          <p className={`${TYPOGRAPHY.metricMedium} text-green-600 dark:text-green-400`}>
            {fmt(preValue)}
          </p>
        </div>
        <TrendingDown className="h-8 w-8 text-red-500 animate-pulse" />
        <div className="flex-1 text-right">
          <p className={TYPOGRAPHY.metricLabel}>After Crash</p>
          <p className={`${TYPOGRAPHY.metricMedium} text-red-600 dark:text-red-400`}>
            {fmt(postValue)}
          </p>
        </div>
      </div>

      <div className="relative h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-lg overflow-hidden">
        <div
          className="absolute right-0 top-0 bottom-0 bg-red-500/80 flex items-center justify-center transition-all duration-500"
          style={{ width: `${Math.abs(crashPercent)}%` }}
        >
          <span className="text-white font-bold text-sm">
            -{fmt(loss)}
          </span>
        </div>
        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white font-bold">
          {fmt(postValue)}
        </div>
      </div>

      <div className="flex justify-between text-sm">
        <span className={TYPOGRAPHY.helperText}>
          {postPercentage.toFixed(0)}% remaining
        </span>
        <span className="text-red-600 dark:text-red-400 font-semibold">
          {crashPercent}% lost
        </span>
      </div>
    </div>
  )
}

interface DCAOpportunityProps {
  monthlyContribution: number
  crashPercent: number
  recoveryYears: number
}

function DCAOpportunity({ monthlyContribution, crashPercent, recoveryYears }: DCAOpportunityProps) {
  const sharesBefore = 1 // Normalized
  const sharesAfterCrash = 1 / (1 + crashPercent / 100) // How many shares same money buys

  const extraSharesPercent = ((sharesAfterCrash - sharesBefore) / sharesBefore) * 100

  return (
    <Card className="border-2 border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          Crashes Are Sales for Accumulators
        </CardTitle>
        <CardDescription>
          Your monthly {fmt(monthlyContribution)} contribution buys more during market downturns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-white dark:bg-card border">
            <p className={TYPOGRAPHY.metricLabel}>Normal Market</p>
            <p className={TYPOGRAPHY.body}>
              {fmt(monthlyContribution)} buys <strong>1 share</strong>
            </p>
            <p className={TYPOGRAPHY.helperText}>(at $100/share)</p>
          </div>
          <div className="p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
            <p className={TYPOGRAPHY.metricLabel}>After {crashPercent}% Crash</p>
            <p className={`${TYPOGRAPHY.body} text-emerald-700 dark:text-emerald-300`}>
              {fmt(monthlyContribution)} buys <strong>{sharesAfterCrash.toFixed(2)} shares</strong>
            </p>
            <p className={TYPOGRAPHY.helperText}>(at ${(100 * (1 + crashPercent / 100)).toFixed(0)}/share)</p>
          </div>
        </div>

        <div className="p-4 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-300 dark:border-emerald-700">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className={`${TYPOGRAPHY.sectionHeader} text-emerald-700 dark:text-emerald-300`}>
              +{extraSharesPercent.toFixed(0)}% More Shares Per Dollar
            </span>
          </div>
          <p className={TYPOGRAPHY.bodyMuted}>
            If you invest {fmt(monthlyContribution)}/month during a {Math.abs(crashPercent)}% downturn
            and recovery takes ~{recoveryYears} years, you will accumulate significantly more shares
            at lower prices. When the market recovers, those extra shares grow too.
          </p>
        </div>

        <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <p className={`${TYPOGRAPHY.helperText} text-amber-800 dark:text-amber-200`}>
            <strong>Key insight:</strong> Young investors should actually hope for market crashes.
            Buying low and holding for decades is how fortunes are built.
            The worst thing for a young investor is a market that only goes up.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface SequenceRiskCardProps {
  portfolioValue: number
  withdrawalRate: number
  crashPercent: number
  currentAge: number
}

function SequenceRiskCard({ portfolioValue, withdrawalRate, crashPercent, currentAge }: SequenceRiskCardProps) {
  const impact = calculateSequenceRisk(portfolioValue, withdrawalRate, crashPercent)
  const postCrashValue = calculatePostCrashValue(portfolioValue, crashPercent)

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
          Sequence of Returns Risk
        </CardTitle>
        <CardDescription>
          Why crashes hurt retirees more than accumulators
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800">
          <p className={TYPOGRAPHY.body}>
            A {Math.abs(crashPercent)}% crash at age {currentAge} (early retirement)
            is far more damaging than the same crash at age {currentAge + 20}.
            You are withdrawing from a depleted portfolio during recovery.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className={TYPOGRAPHY.metricLabel}>Pre-Crash Withdrawal</p>
            <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
              {fmtFull(Math.round(impact.precrashWithdrawal))}/yr
            </p>
            <p className={TYPOGRAPHY.helperText}>
              {withdrawalRate}% of {fmt(portfolioValue)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted/50">
            <p className={TYPOGRAPHY.metricLabel}>Post-Crash Withdrawal</p>
            <p className={`${TYPOGRAPHY.metricSmall} text-red-600 dark:text-red-400`}>
              {fmtFull(Math.round(impact.postcrashWithdrawal))}/yr
            </p>
            <p className={TYPOGRAPHY.helperText}>
              {withdrawalRate}% of {fmt(postCrashValue)}
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <p className={TYPOGRAPHY.subSectionHeader}>The Dilemma</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
              <p className={`${TYPOGRAPHY.body} font-semibold text-red-700 dark:text-red-300 mb-1`}>
                Option A: Keep Same Dollar Amount
              </p>
              <p className={TYPOGRAPHY.helperText}>
                Withdraw {fmtFull(Math.round(impact.precrashWithdrawal))}/yr = {impact.sustainableRate.toFixed(1)}% rate
              </p>
              <p className={`${TYPOGRAPHY.helperText} text-red-600 dark:text-red-400 mt-1`}>
                Risk: Depleting portfolio too fast
              </p>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
              <p className={`${TYPOGRAPHY.body} font-semibold text-amber-700 dark:text-amber-300 mb-1`}>
                Option B: Keep Same Percentage
              </p>
              <p className={TYPOGRAPHY.helperText}>
                Withdraw {fmtFull(Math.round(impact.postcrashWithdrawal))}/yr = {withdrawalRate}% rate
              </p>
              <p className={`${TYPOGRAPHY.helperText} text-amber-600 dark:text-amber-400 mt-1`}>
                Trade-off: Reduced lifestyle
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className={`${TYPOGRAPHY.body} text-blue-800 dark:text-blue-200`}>
            <strong>Recommendation:</strong> Reduce spending by 10-20% during downturns.
            Have a "floor" lifestyle you can sustain. The first 5 years of retirement
            are the most vulnerable to sequence risk.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface EmotionalPreparationProps {
  crashPercent: number
  portfolioLoss: number
}

function EmotionalPreparation({ crashPercent, portfolioLoss }: EmotionalPreparationProps) {
  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Emotional Preparation
        </CardTitle>
        <CardDescription>
          What to do (and NOT do) when the crash happens
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            <span className={`${TYPOGRAPHY.sectionHeader} text-red-700 dark:text-red-300 text-lg`}>
              WHEN THIS HAPPENS, DO NOT SELL
            </span>
          </div>
          <p className={`${TYPOGRAPHY.body} text-red-800 dark:text-red-200`}>
            You are reading this with a clear head. When you see -{fmt(portfolioLoss)} on your screen,
            you will feel panic. Your brain will scream "SELL BEFORE IT GETS WORSE!"
          </p>
          <p className={`${TYPOGRAPHY.body} text-red-800 dark:text-red-200 mt-2 font-semibold`}>
            That is exactly when you must NOT sell. History shows that panic-selling
            is the single worst financial decision you can make.
          </p>
        </div>

        <div className="space-y-3">
          <p className={TYPOGRAPHY.subSectionHeader}>Your Crash Action Plan</p>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-card border">
            <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
              <Snowflake className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className={`${TYPOGRAPHY.body} font-semibold`}>1. Freeze</p>
              <p className={TYPOGRAPHY.bodyMuted}>
                Do nothing for 48 hours. No logging into accounts. No checking balances.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-card border">
            <div className="p-2 rounded-full bg-orange-100 dark:bg-orange-900/30">
              <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <p className={`${TYPOGRAPHY.body} font-semibold`}>2. Remember History</p>
              <p className={TYPOGRAPHY.bodyMuted}>
                Every crash has recovered. 2008 (-37%) recovered in 4 years.
                COVID (-34%) recovered in 6 months.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-card border">
            <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
              <ShoppingCart className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className={`${TYPOGRAPHY.body} font-semibold`}>3. If Accumulating: Buy More</p>
              <p className={TYPOGRAPHY.bodyMuted}>
                This is the best buying opportunity you may see for years. Increase contributions if possible.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-lg bg-white dark:bg-card border">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <RefreshCcw className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className={`${TYPOGRAPHY.body} font-semibold`}>4. Consider Rebalancing</p>
              <p className={TYPOGRAPHY.bodyMuted}>
                If you have bonds, sell some to buy stocks at discount. This is rebalancing, not panic-selling.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700 rounded-lg">
          <p className={`${TYPOGRAPHY.helperText} text-purple-800 dark:text-purple-200`}>
            <strong>Print this out.</strong> Put it where you will see it during a crash.
            Your future panicked self will thank your current rational self.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface CrashPlanProps {
  emergencyFund: number
  annualExpenses: number
  bondAllocation: number
  portfolioValue: number
  crashPercent: number
}

function CrashPlan({ emergencyFund, annualExpenses, bondAllocation, portfolioValue, crashPercent }: CrashPlanProps) {
  const monthlyExpenses = annualExpenses / 12
  const runwayMonths = calculateEmergencyRunway(emergencyFund, monthlyExpenses)
  const rebalancing = calculateRebalancingOpportunity(portfolioValue, bondAllocation, crashPercent)

  const runwayStatus = runwayMonths >= 12 ? "success" : runwayMonths >= 6 ? "warning" : "negative"
  const colors = METRIC_COLORS[runwayStatus]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Your Crash Plan
        </CardTitle>
        <CardDescription>
          How prepared are you for a {crashPercent}% market drop?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Emergency Fund Runway */}
        <div className={`p-4 rounded-lg border-2 ${colors.border} ${colors.bg}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              <span className={TYPOGRAPHY.sectionHeader}>Emergency Fund Runway</span>
            </div>
            <Badge className={runwayStatus === "success" ? STATUS.success : runwayStatus === "warning" ? STATUS.warning : STATUS.error}>
              {runwayMonths} months
            </Badge>
          </div>
          <Progress value={Math.min((runwayMonths / 12) * 100, 100)} className="h-3 mb-2" />
          <div className="flex justify-between">
            <span className={TYPOGRAPHY.helperText}>
              {fmtFull(emergencyFund)} / {fmtFull(monthlyExpenses)}/mo
            </span>
            <span className={TYPOGRAPHY.helperText}>
              Target: 6-12 months
            </span>
          </div>
          <p className={`${TYPOGRAPHY.bodyMuted} mt-2`}>
            {runwayMonths >= 12
              ? "Excellent! You can weather a crash without touching investments."
              : runwayMonths >= 6
              ? "Good, but consider building to 12 months for extra security."
              : "Priority: Build emergency fund before investing more. You may be forced to sell during crashes."
            }
          </p>
        </div>

        {/* Bond Allocation / Rebalancing Opportunity */}
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-3">
            <RefreshCcw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className={TYPOGRAPHY.sectionHeader}>Rebalancing Opportunity</span>
          </div>
          <p className={TYPOGRAPHY.body}>
            With {bondAllocation}% in bonds, a {crashPercent}% stock crash creates a rebalancing opportunity:
          </p>
          <div className="grid grid-cols-3 gap-3 mt-3">
            <div className="text-center p-3 rounded-lg bg-white dark:bg-card">
              <p className={TYPOGRAPHY.metricLabel}>Bonds to Sell</p>
              <p className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                {fmt(rebalancing.bondsToSell)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white dark:bg-card">
              <p className={TYPOGRAPHY.metricLabel}>Stocks to Buy</p>
              <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
                {fmt(rebalancing.stocksToBuy)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-white dark:bg-card">
              <p className={TYPOGRAPHY.metricLabel}>Potential Gain*</p>
              <p className={`${TYPOGRAPHY.metricSmall} text-emerald-600 dark:text-emerald-400`}>
                +{fmt(rebalancing.potentialGain)}
              </p>
            </div>
          </div>
          <p className={`${TYPOGRAPHY.helperText} mt-2`}>
            *Assumes 20% recovery from crash lows. Selling bonds to buy stocks at the bottom is the optimal move.
          </p>
        </div>

        {/* Preparation Checklist */}
        <div className="space-y-2">
          <p className={TYPOGRAPHY.subSectionHeader}>Pre-Crash Checklist</p>
          <div className="space-y-2">
            {[
              { done: runwayMonths >= 6, text: "6+ months emergency fund" },
              { done: bondAllocation >= 10, text: "10%+ bond allocation for rebalancing ammo" },
              { done: true, text: "Automated investments (won't stop during panic)" },
              { done: true, text: "Written plan for crash scenario (this page!)" },
              { done: false, text: "Discussed plan with spouse/partner" },
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                  item.done
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 dark:bg-gray-700"
                }`}>
                  {item.done && <ChevronRight className="h-3 w-3" />}
                </div>
                <span className={item.done ? TYPOGRAPHY.body : TYPOGRAPHY.bodyMuted}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ==================== Main Component ====================

export function CrashSimulator({
  portfolioValue,
  annualExpenses = 60000,
  emergencyFund = 30000,
  bondAllocation = 20,
  yearsToRetirement = 20,
  monthlyContribution = 1000,
  withdrawalRate = 4,
  currentAge = 45,
}: CrashSimulatorProps) {
  const [selectedCrash, setSelectedCrash] = useState<HistoricalCrash>(HISTORICAL_CRASHES[0])
  const [customCrashPercent, setCustomCrashPercent] = useState(-37)
  const [activeTab, setActiveTab] = useState("historical")

  const investorType: InvestorType = yearsToRetirement > 0 ? "accumulator" : "retiree"

  // Calculate values based on selected or custom crash
  const crashPercent = activeTab === "custom" ? customCrashPercent : selectedCrash.drop
  const postCrashValue = useMemo(
    () => calculatePostCrashValue(portfolioValue, crashPercent),
    [portfolioValue, crashPercent]
  )
  const portfolioLoss = portfolioValue - postCrashValue

  const handleCrashSelect = useCallback((crash: HistoricalCrash) => {
    setSelectedCrash(crash)
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Flame className="h-6 w-6 text-red-600 dark:text-red-400" />
                Market Crash Simulator
              </CardTitle>
              <CardDescription className="text-base">
                Turn fear into preparedness. See exactly what a crash would do to your portfolio.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {investorType === "accumulator" ? (
                <span className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  Accumulator
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-blue-600" />
                  Retiree
                </span>
              )}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="historical">Historical Crashes</TabsTrigger>
          <TabsTrigger value="custom">Custom Scenario</TabsTrigger>
        </TabsList>

        <TabsContent value="historical" className="space-y-6">
          {/* Historical Crashes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {HISTORICAL_CRASHES.map((crash) => (
              <CrashCard
                key={crash.name}
                crash={crash}
                portfolioValue={portfolioValue}
                isSelected={selectedCrash.name === crash.name}
                onSelect={() => handleCrashSelect(crash)}
              />
            ))}
          </div>

          {/* Selected Crash Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {selectedCrash.name} - What Would Happen
              </CardTitle>
              <CardDescription>
                <strong>Cause:</strong> {selectedCrash.cause}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <CrashImpactVisualizer
                preValue={portfolioValue}
                postValue={postCrashValue}
                crashPercent={selectedCrash.drop}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 text-center">
                  <p className={TYPOGRAPHY.metricLabel}>Immediate Loss</p>
                  <p className={`${TYPOGRAPHY.metricMedium} text-red-600 dark:text-red-400`}>
                    -{fmt(portfolioLoss)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-center">
                  <p className={TYPOGRAPHY.metricLabel}>Recovery Time</p>
                  <p className={`${TYPOGRAPHY.metricMedium} text-amber-600 dark:text-amber-400`}>
                    ~{selectedCrash.recoveryYears} years
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 text-center">
                  <p className={TYPOGRAPHY.metricLabel}>Post-Recovery Value</p>
                  <p className={`${TYPOGRAPHY.metricMedium} text-green-600 dark:text-green-400`}>
                    {fmt(portfolioValue)}
                  </p>
                  <p className={TYPOGRAPHY.helperText}>Back to original</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="custom" className="space-y-6">
          {/* Interactive Slider */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Drag to Simulate a Crash
              </CardTitle>
              <CardDescription>
                Watch your portfolio value change in real-time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className={TYPOGRAPHY.sectionHeader}>Crash Severity</span>
                  <Badge
                    variant={customCrashPercent > -20 ? "outline" : customCrashPercent > -40 ? "default" : "destructive"}
                    className="text-lg px-4 py-2"
                  >
                    {customCrashPercent}%
                  </Badge>
                </div>
                <Slider
                  value={[customCrashPercent]}
                  onValueChange={([value]) => setCustomCrashPercent(value)}
                  min={-90}
                  max={-5}
                  step={1}
                  className="py-4"
                  thumbLabel="Crash %"
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>-90% (Depression)</span>
                  <span>-5% (Correction)</span>
                </div>
              </div>

              <CrashImpactVisualizer
                preValue={portfolioValue}
                postValue={postCrashValue}
                crashPercent={customCrashPercent}
              />

              {/* Comparable Historical Events */}
              <div className="p-4 rounded-lg bg-muted/50">
                <p className={TYPOGRAPHY.subSectionHeader}>Similar Historical Events</p>
                <div className="mt-2 space-y-1">
                  {HISTORICAL_CRASHES.filter(
                    (c) => Math.abs(c.drop - customCrashPercent) <= 15
                  ).map((c) => (
                    <div key={c.name} className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>{c.name}</span>
                      <span className={TYPOGRAPHY.bodyMuted}>
                        {c.drop}% ({c.years})
                      </span>
                    </div>
                  ))}
                  {HISTORICAL_CRASHES.filter(
                    (c) => Math.abs(c.drop - customCrashPercent) <= 15
                  ).length === 0 && (
                    <p className={TYPOGRAPHY.bodyMuted}>
                      No exact matches, but any crash of this magnitude would be significant.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Conditional Content Based on Investor Type */}
      <div className="space-y-6">
        {investorType === "accumulator" ? (
          <>
            <DCAOpportunity
              monthlyContribution={monthlyContribution}
              crashPercent={crashPercent}
              recoveryYears={selectedCrash.recoveryYears}
            />
          </>
        ) : (
          <>
            <SequenceRiskCard
              portfolioValue={portfolioValue}
              withdrawalRate={withdrawalRate}
              crashPercent={crashPercent}
              currentAge={currentAge}
            />
          </>
        )}
      </div>

      {/* Always Show These */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CrashPlan
          emergencyFund={emergencyFund}
          annualExpenses={annualExpenses}
          bondAllocation={bondAllocation}
          portfolioValue={portfolioValue}
          crashPercent={crashPercent}
        />
        <EmotionalPreparation
          crashPercent={crashPercent}
          portfolioLoss={portfolioLoss}
        />
      </div>

      {/* Recovery Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600 dark:text-green-400" />
            Historical Recovery Timelines
          </CardTitle>
          <CardDescription>
            Every crash in history has recovered. The question is when, not if.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {HISTORICAL_CRASHES.map((crash) => (
              <div key={crash.name} className="flex items-center gap-4">
                <div className="w-40 flex-shrink-0">
                  <p className={TYPOGRAPHY.body}>{crash.name}</p>
                  <p className={TYPOGRAPHY.helperText}>{crash.years}</p>
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" className="w-16 justify-center">
                      {crash.drop}%
                    </Badge>
                    <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 via-amber-500 to-green-500"
                        style={{ width: `${Math.min(crash.recoveryYears * 10, 100)}%` }}
                      />
                    </div>
                    <Badge variant="outline" className="w-24 justify-center">
                      {crash.recoveryYears < 1
                        ? `${Math.round(crash.recoveryYears * 12)} months`
                        : `${crash.recoveryYears} years`}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className={`${TYPOGRAPHY.sectionHeader} text-green-700 dark:text-green-300`}>
                Key Insight
              </span>
            </div>
            <p className={`${TYPOGRAPHY.body} text-green-800 dark:text-green-200`}>
              The average bear market lasts 9.6 months. The average recovery takes 2.7 years.
              But if you stay invested (and ideally keep buying), you historically come out ahead.
              The only people who permanently lose money are those who sell at the bottom.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This simulator uses historical data for educational purposes. Past performance does not guarantee
          future results. Future crashes may be more or less severe. This is not financial advice -
          consult a fiduciary advisor for personalized guidance.
        </p>
      </div>
    </div>
  )
}

export default CrashSimulator
