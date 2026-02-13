'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Home,
  Car,
  Clock,
  Shield,
  Target,
  Info,
  ChevronRight,
  Zap,
  Eye,
  AlertCircle,
  Calculator,
  ArrowRight,
  Star,
  RefreshCw,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens'
import { cn } from '@/lib/utils'

// ==================== Types ====================

type CreditScoreTier = 'excellent' | 'good' | 'fair' | 'poor'

interface CreditScoreData {
  score: number
  tier: CreditScoreTier
  rateAdjustment: number
  color: string
  label: string
}

interface LoanScenario {
  loanType: 'mortgage' | 'auto' | 'creditCard'
  principal: number
  termYears: number
  baseRate: number
}

// ==================== Constants ====================

const CREDIT_TIERS: Record<CreditScoreTier, CreditScoreData> = {
  excellent: {
    score: 760,
    tier: 'excellent',
    rateAdjustment: 0,
    color: '#22c55e',
    label: 'Excellent (760+)',
  },
  good: {
    score: 700,
    tier: 'good',
    rateAdjustment: 0.5,
    color: '#3b82f6',
    label: 'Good (700-759)',
  },
  fair: {
    score: 650,
    tier: 'fair',
    rateAdjustment: 1.5,
    color: '#f59e0b',
    label: 'Fair (650-699)',
  },
  poor: {
    score: 600,
    tier: 'poor',
    rateAdjustment: 4,
    color: '#ef4444',
    label: 'Poor (<650)',
  },
}

const SCORE_FACTORS = [
  {
    name: 'Payment History',
    percentage: 35,
    description: 'Pay every bill on time, every time',
    icon: Clock,
    tips: ['Set up autopay for at least minimum payments', 'One late payment can drop score 100+ points', 'Late payments stay on report for 7 years'],
  },
  {
    name: 'Credit Utilization',
    percentage: 30,
    description: 'Keep balances under 30% of limits',
    icon: CreditCard,
    tips: ['Under 10% utilization is ideal', 'Pay down balances before statement closes', 'Ask for credit limit increases (no hard pull)'],
  },
  {
    name: 'Length of Credit History',
    percentage: 15,
    description: 'Keep old accounts open',
    icon: Clock,
    tips: ["Don't close your oldest credit card", 'Average age of accounts matters', 'Become an authorized user on old accounts'],
  },
  {
    name: 'Credit Mix',
    percentage: 10,
    description: 'Mix of credit types is helpful',
    icon: Target,
    tips: ['Installment loans + revolving credit', "Don't open accounts just for mix", 'Quality over quantity'],
  },
  {
    name: 'New Credit Inquiries',
    percentage: 10,
    description: 'Limit hard pulls',
    icon: Eye,
    tips: ['Hard inquiries affect score for 12 months', 'Rate shopping within 14-45 days counts as one inquiry', 'Checking your own score is a soft pull'],
  },
]

const CREDIT_BOOSTERS = [
  {
    title: 'Pay On Time',
    impact: 'High',
    timeframe: '1-3 months',
    description: '35% of your score. Set up autopay for at least minimums.',
    color: '#22c55e',
  },
  {
    title: 'Lower Utilization',
    impact: 'High',
    timeframe: 'Immediate',
    description: '30% of score. Pay down to under 10% of limits before statement date.',
    color: '#22c55e',
  },
  {
    title: 'Keep Old Cards Open',
    impact: 'Medium',
    timeframe: 'Ongoing',
    description: '15% of score. Use oldest card occasionally to keep it active.',
    color: '#3b82f6',
  },
  {
    title: 'Dispute Errors',
    impact: 'Variable',
    timeframe: '30-45 days',
    description: '79% of reports have errors. Free to dispute online.',
    color: '#8b5cf6',
  },
  {
    title: 'Limit New Applications',
    impact: 'Medium',
    timeframe: '6-12 months',
    description: 'Each hard inquiry can drop score 5-10 points.',
    color: '#f59e0b',
  },
  {
    title: 'Become Authorized User',
    impact: 'Medium',
    timeframe: '1-2 months',
    description: "Piggyback on someone's excellent payment history.",
    color: '#3b82f6',
  },
]

const FREE_MONITORING = [
  { name: 'Credit Karma', type: 'VantageScore', frequency: 'Weekly', bureaus: 'TransUnion, Equifax' },
  { name: 'AnnualCreditReport.com', type: 'Full Reports', frequency: 'Annual (free)', bureaus: 'All 3' },
  { name: 'Credit Sesame', type: 'VantageScore', frequency: 'Monthly', bureaus: 'TransUnion' },
  { name: 'Discover Credit Scorecard', type: 'FICO', frequency: 'Monthly', bureaus: 'Experian' },
  { name: 'Bank/Card Apps', type: 'FICO (varies)', frequency: 'Monthly', bureaus: 'Varies' },
]

// ==================== Helper Functions ====================

function getCreditTier(score: number): CreditScoreTier {
  if (score >= 760) return 'excellent'
  if (score >= 700) return 'good'
  if (score >= 650) return 'fair'
  return 'poor'
}

function getRateAdjustment(score: number): number {
  if (score >= 760) return 0
  if (score >= 700) return 0.5
  if (score >= 650) return 1.5
  return 4
}

function calculateMonthlyPayment(principal: number, annualRate: number, termYears: number): number {
  const monthlyRate = annualRate / 100 / 12
  const numPayments = termYears * 12

  if (monthlyRate === 0) return principal / numPayments

  return (principal * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
         (Math.pow(1 + monthlyRate, numPayments) - 1)
}

function calculateTotalCost(principal: number, annualRate: number, termYears: number): number {
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, termYears)
  return monthlyPayment * termYears * 12
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatCurrencyCompact(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`
  }
  return formatCurrency(value)
}

// ==================== Sub-Components ====================

interface ScoreMeterProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
}

function ScoreMeter({ score, size = 'md' }: ScoreMeterProps) {
  const tier = getCreditTier(score)
  const tierData = CREDIT_TIERS[tier]

  // Calculate percentage for arc (300-850 range)
  const minScore = 300
  const maxScore = 850
  const percentage = ((score - minScore) / (maxScore - minScore)) * 100

  const sizeClasses = {
    sm: 'w-24 h-16',
    md: 'w-32 h-20',
    lg: 'w-40 h-24',
  }

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  }

  return (
    <div className={cn('relative flex flex-col items-center', sizeClasses[size])}>
      {/* Semi-circle progress */}
      <svg className="w-full h-full" viewBox="0 0 100 60">
        {/* Background arc */}
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="8"
          strokeLinecap="round"
        />
        {/* Progress arc */}
        <path
          d="M 10 55 A 40 40 0 0 1 90 55"
          fill="none"
          stroke={tierData.color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={`${percentage * 1.26} 126`}
          className="transition-all duration-500"
        />
      </svg>
      {/* Score display */}
      <div className="absolute bottom-0 text-center">
        <div className={cn('font-bold tabular-nums', textSizes[size])} style={{ color: tierData.color }}>
          {score}
        </div>
        <div className="text-xs text-muted-foreground">{tierData.label.split(' ')[0]}</div>
      </div>
    </div>
  )
}

interface LoanComparisonCardProps {
  loanType: 'mortgage' | 'auto' | 'creditCard'
  principal: number
  termYears: number
  baseRate: number
  currentScore: number
}

function LoanComparisonCard({ loanType, principal, termYears, baseRate, currentScore }: LoanComparisonCardProps) {
  const currentTier = getCreditTier(currentScore)
  const currentRateAdj = getRateAdjustment(currentScore)
  const currentRate = baseRate + currentRateAdj

  const excellentRate = baseRate
  const currentTotalCost = calculateTotalCost(principal, currentRate, termYears)
  const excellentTotalCost = calculateTotalCost(principal, excellentRate, termYears)
  const difference = currentTotalCost - excellentTotalCost

  const currentMonthly = calculateMonthlyPayment(principal, currentRate, termYears)
  const excellentMonthly = calculateMonthlyPayment(principal, excellentRate, termYears)
  const monthlyDiff = currentMonthly - excellentMonthly

  const icons = {
    mortgage: Home,
    auto: Car,
    creditCard: CreditCard,
  }

  const labels = {
    mortgage: 'Mortgage',
    auto: 'Auto Loan',
    creditCard: 'Credit Card',
  }

  const Icon = icons[loanType]

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
            <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <div className="font-semibold">{labels[loanType]}</div>
            <div className="text-xs text-muted-foreground">
              {formatCurrency(principal)} over {termYears} years
            </div>
          </div>
        </div>
        <Badge variant="outline">{baseRate}% base</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* With excellent credit */}
        <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
          <div className="text-xs text-green-700 dark:text-green-300 mb-1">760+ Score</div>
          <div className="text-lg font-bold text-green-700 dark:text-green-300">{excellentRate.toFixed(2)}%</div>
          <div className="text-xs text-muted-foreground">{formatCurrency(excellentMonthly)}/mo</div>
          <div className="text-xs text-green-600 dark:text-green-400 mt-1">
            Total: {formatCurrencyCompact(excellentTotalCost)}
          </div>
        </div>

        {/* With current credit */}
        <div
          className={cn(
            'p-3 rounded-lg border',
            currentTier === 'excellent'
              ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
              : currentTier === 'good'
              ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800'
              : currentTier === 'fair'
              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
          )}
        >
          <div className="text-xs text-muted-foreground mb-1">Your Score ({currentScore})</div>
          <div className="text-lg font-bold">{currentRate.toFixed(2)}%</div>
          <div className="text-xs text-muted-foreground">{formatCurrency(currentMonthly)}/mo</div>
          <div className="text-xs mt-1">
            Total: {formatCurrencyCompact(currentTotalCost)}
          </div>
        </div>
      </div>

      {/* Cost difference */}
      {difference > 0 && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-300">
                Credit Score Tax: {formatCurrency(difference)}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                Extra {formatCurrency(monthlyDiff)}/month for {termYears} years
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Main Component ====================

export interface CreditImpactProps {
  /** Initial credit score */
  initialScore?: number
  /** Compact mode for embedding */
  compact?: boolean
}

export function CreditImpact({
  initialScore = 680,
  compact = false,
}: CreditImpactProps) {
  // State
  const [creditScore, setCreditScore] = useState(initialScore)
  const [mortgageAmount, setMortgageAmount] = useState(400000)
  const [autoLoanAmount, setAutoLoanAmount] = useState(35000)

  // Derived values
  const tier = getCreditTier(creditScore)
  const tierData = CREDIT_TIERS[tier]
  const rateAdjustment = getRateAdjustment(creditScore)

  // Calculate lifetime costs
  const mortgageBaseRate = 6.5
  const autoBaseRate = 7.0
  const creditCardBaseRate = 20.0

  const mortgageCostAtExcellent = calculateTotalCost(mortgageAmount, mortgageBaseRate, 30)
  const mortgageCostAtCurrent = calculateTotalCost(mortgageAmount, mortgageBaseRate + rateAdjustment, 30)
  const mortgageDifference = mortgageCostAtCurrent - mortgageCostAtExcellent

  const autoCostAtExcellent = calculateTotalCost(autoLoanAmount, autoBaseRate, 5)
  const autoCostAtCurrent = calculateTotalCost(autoLoanAmount, autoBaseRate + rateAdjustment, 5)
  const autoDifference = autoCostAtCurrent - autoCostAtExcellent

  // Path to 800 calculation
  const pointsTo800 = Math.max(0, 800 - creditScore)
  const estimatedMonths = useMemo(() => {
    if (creditScore >= 800) return 0
    if (creditScore >= 750) return 6
    if (creditScore >= 700) return 12
    if (creditScore >= 650) return 18
    return 24
  }, [creditScore])

  // Handle slider change
  const handleScoreChange = useCallback((value: number[]) => {
    setCreditScore(value[0])
  }, [])

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header Card */}
      <Card className={cn('border-2', tierData.color === '#22c55e' ? 'border-green-200 dark:border-green-800' : tierData.color === '#3b82f6' ? 'border-blue-200 dark:border-blue-800' : tierData.color === '#f59e0b' ? 'border-amber-200 dark:border-amber-800' : 'border-red-200 dark:border-red-800')}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Credit Score Wealth Impact Calculator
              </CardTitle>
              <CardDescription>
                Good credit is free money. Bad credit is an invisible tax on everything you buy.
              </CardDescription>
            </div>
            <Badge
              className={cn(
                'text-white border-0',
                tierData.color === '#22c55e' ? 'bg-green-600' :
                tierData.color === '#3b82f6' ? 'bg-blue-600' :
                tierData.color === '#f59e0b' ? 'bg-amber-600' :
                'bg-red-600'
              )}
            >
              {tierData.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display and Slider */}
          <div className="flex flex-col md:flex-row items-center gap-6">
            <ScoreMeter score={creditScore} size="lg" />

            <div className="flex-1 space-y-4 w-full">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label className={TYPOGRAPHY.inputLabel}>Your Credit Score</Label>
                  <span className="text-sm font-mono tabular-nums">{creditScore}</span>
                </div>
                <Slider
                  value={[creditScore]}
                  onValueChange={handleScoreChange}
                  min={300}
                  max={850}
                  step={5}
                  className="w-full"
                  thumbLabel="Credit score"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Poor (300)</span>
                  <span>Fair</span>
                  <span>Good</span>
                  <span>Excellent (850)</span>
                </div>
              </div>

              {/* Rate Adjustment Display */}
              <div className={cn(
                'p-3 rounded-lg',
                tier === 'excellent' ? 'bg-green-50 dark:bg-green-950/20' :
                tier === 'good' ? 'bg-blue-50 dark:bg-blue-950/20' :
                tier === 'fair' ? 'bg-amber-50 dark:bg-amber-950/20' :
                'bg-red-50 dark:bg-red-950/20'
              )}>
                <div className="flex items-center justify-between">
                  <span className={TYPOGRAPHY.metricLabel}>Interest Rate Impact</span>
                  <span className={cn(
                    'font-semibold',
                    tier === 'excellent' ? 'text-green-700 dark:text-green-300' :
                    tier === 'good' ? 'text-blue-700 dark:text-blue-300' :
                    tier === 'fair' ? 'text-amber-700 dark:text-amber-300' :
                    'text-red-700 dark:text-red-300'
                  )}>
                    {rateAdjustment === 0 ? 'Best Rates' : `+${rateAdjustment.toFixed(1)}% on all loans`}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className={TYPOGRAPHY.metricLabel}>Score Tier</div>
              <div className={TYPOGRAPHY.metricSmall} style={{ color: tierData.color }}>
                {tier.charAt(0).toUpperCase() + tier.slice(1)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className={TYPOGRAPHY.metricLabel}>Rate Penalty</div>
              <div className={TYPOGRAPHY.metricSmall}>
                {rateAdjustment === 0 ? 'None' : `+${rateAdjustment}%`}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className={TYPOGRAPHY.metricLabel}>Mortgage Extra</div>
              <div className={cn(TYPOGRAPHY.metricSmall, mortgageDifference > 0 ? 'text-red-600' : 'text-green-600')}>
                {formatCurrencyCompact(mortgageDifference)}
              </div>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <div className={TYPOGRAPHY.metricLabel}>Auto Loan Extra</div>
              <div className={cn(TYPOGRAPHY.metricSmall, autoDifference > 0 ? 'text-red-600' : 'text-green-600')}>
                {formatCurrencyCompact(autoDifference)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different sections */}
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-1 h-auto">
          <TabsTrigger value="calculator" className="text-xs">
            <Calculator className="h-3 w-3 mr-1" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="factors" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Score Factors
          </TabsTrigger>
          <TabsTrigger value="boosters" className="text-xs">
            <Zap className="h-3 w-3 mr-1" />
            Quick Boosters
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="text-xs">
            <Eye className="h-3 w-3 mr-1" />
            Monitoring
          </TabsTrigger>
          <TabsTrigger value="path" className="text-xs">
            <Star className="h-3 w-3 mr-1" />
            Path to 800+
          </TabsTrigger>
        </TabsList>

        {/* CALCULATOR TAB */}
        <TabsContent value="calculator">
          <div className="space-y-6">
            {/* Loan Amount Inputs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Lifetime Cost Calculator
                </CardTitle>
                <CardDescription>
                  See how your credit score affects the total cost of major purchases
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="mortgageAmount" className={TYPOGRAPHY.inputLabel}>
                      Mortgage Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="mortgageAmount"
                        type="number"
                        value={mortgageAmount}
                        onChange={(e) => setMortgageAmount(Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autoAmount" className={TYPOGRAPHY.inputLabel}>
                      Auto Loan Amount
                    </Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="autoAmount"
                        type="number"
                        value={autoLoanAmount}
                        onChange={(e) => setAutoLoanAmount(Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Loan Comparisons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LoanComparisonCard
                loanType="mortgage"
                principal={mortgageAmount}
                termYears={30}
                baseRate={mortgageBaseRate}
                currentScore={creditScore}
              />
              <LoanComparisonCard
                loanType="auto"
                principal={autoLoanAmount}
                termYears={5}
                baseRate={autoBaseRate}
                currentScore={creditScore}
              />
            </div>

            {/* Example: $400K Mortgage */}
            <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Example: $400,000 Mortgage (30 Years)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Credit Score</th>
                        <th className="text-left py-2 px-3 font-medium">Interest Rate</th>
                        <th className="text-left py-2 px-3 font-medium">Monthly Payment</th>
                        <th className="text-left py-2 px-3 font-medium">Total Cost</th>
                        <th className="text-left py-2 px-3 font-medium">Extra Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(['excellent', 'good', 'fair', 'poor'] as CreditScoreTier[]).map((t) => {
                        const data = CREDIT_TIERS[t]
                        const rate = mortgageBaseRate + data.rateAdjustment
                        const monthly = calculateMonthlyPayment(400000, rate, 30)
                        const total = calculateTotalCost(400000, rate, 30)
                        const excellentTotal = calculateTotalCost(400000, mortgageBaseRate, 30)
                        const extra = total - excellentTotal

                        return (
                          <tr key={t} className={cn('border-b', t === tier && 'bg-blue-100 dark:bg-blue-900/30')}>
                            <td className="py-2 px-3">
                              <span className="flex items-center gap-2">
                                <span
                                  className="w-3 h-3 rounded-full"
                                  style={{ backgroundColor: data.color }}
                                />
                                {data.label}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono">{rate.toFixed(2)}%</td>
                            <td className="py-2 px-3 font-mono">{formatCurrency(monthly)}</td>
                            <td className="py-2 px-3 font-mono">{formatCurrency(total)}</td>
                            <td className={cn('py-2 px-3 font-mono', extra > 0 ? 'text-red-600' : 'text-green-600')}>
                              {extra > 0 ? `+${formatCurrency(extra)}` : '-'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-semibold text-red-900 dark:text-red-100">
                        The Difference: {formatCurrency(calculateTotalCost(400000, mortgageBaseRate + 1, 30) - calculateTotalCost(400000, mortgageBaseRate, 30))} for the Same House
                      </div>
                      <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                        A 1% rate difference on a $400K mortgage costs nearly $100,000 over 30 years.
                        Your credit score determines whether that money goes to the bank or stays in your pocket.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Credit Card APR Warning */}
            <Card className="border-2 border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-red-600 dark:text-red-400" />
                  The Credit Card Trap
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border text-center">
                    <div className="text-3xl font-bold text-green-600">20-24%</div>
                    <div className="text-sm text-muted-foreground">Good Credit APR</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border text-center">
                    <div className="text-3xl font-bold text-red-600">29-36%</div>
                    <div className="text-sm text-muted-foreground">Poor Credit APR</div>
                  </div>
                  <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border text-center">
                    <div className="text-3xl font-bold text-gray-600">$5,000</div>
                    <div className="text-sm text-muted-foreground">Balance</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                    <span>$5K balance at 20% APR, minimum payments:</span>
                    <span className="font-semibold">~$8,000 total (5+ years)</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-white dark:bg-gray-900 rounded-lg border">
                    <span>$5K balance at 29% APR, minimum payments:</span>
                    <span className="font-semibold text-red-600">~$12,000+ total (8+ years)</span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-sm text-amber-800 dark:text-amber-200">
                      <strong>The real trap:</strong> High APR makes it nearly impossible to pay down the balance.
                      Interest accrues faster than most people can pay. This is why credit card debt is an emergency.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* SCORE FACTORS TAB */}
        <TabsContent value="factors">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                What Makes Up Your Credit Score
              </CardTitle>
              <CardDescription>
                Understanding the formula helps you optimize faster
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SCORE_FACTORS.map((factor) => {
                const Icon = factor.icon
                return (
                  <div key={factor.name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <span className="font-medium">{factor.name}</span>
                      </div>
                      <Badge variant="outline" className="font-mono">{factor.percentage}%</Badge>
                    </div>
                    <Progress value={factor.percentage} className="h-2" />
                    <p className={TYPOGRAPHY.bodyMuted}>{factor.description}</p>
                    <div className="pl-6 space-y-1">
                      {factor.tips.map((tip, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                          <span>{tip}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUICK BOOSTERS TAB */}
        <TabsContent value="boosters">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Quick Credit Score Boosters
              </CardTitle>
              <CardDescription>
                Actionable steps to improve your score starting today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CREDIT_BOOSTERS.map((booster, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border bg-white dark:bg-gray-900 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{booster.title}</span>
                      <Badge
                        variant="outline"
                        style={{
                          backgroundColor: `${booster.color}20`,
                          borderColor: booster.color,
                          color: booster.color,
                        }}
                      >
                        {booster.impact} Impact
                      </Badge>
                    </div>
                    <p className={TYPOGRAPHY.bodyMuted}>{booster.description}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Timeframe: {booster.timeframe}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Priority Actions */}
              <div className="mt-6 p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-green-900 dark:text-green-100">
                      The 80/20 Rule for Credit
                    </div>
                    <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1 list-disc list-inside">
                      <li>65% of your score is payment history + utilization</li>
                      <li>Pay on time (set up autopay) and keep utilization under 10%</li>
                      <li>These two things alone can move your score 50-100 points</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MONITORING TAB */}
        <TabsContent value="monitoring">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Free Credit Monitoring Options
                </CardTitle>
                <CardDescription>
                  Check your score regularly - it's free and doesn't hurt your credit
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3 font-medium">Service</th>
                        <th className="text-left py-2 px-3 font-medium">Score Type</th>
                        <th className="text-left py-2 px-3 font-medium">Update Frequency</th>
                        <th className="text-left py-2 px-3 font-medium">Bureaus</th>
                      </tr>
                    </thead>
                    <tbody>
                      {FREE_MONITORING.map((service, idx) => (
                        <tr key={idx} className="border-b">
                          <td className="py-2 px-3 font-medium">{service.name}</td>
                          <td className="py-2 px-3">{service.type}</td>
                          <td className="py-2 px-3">{service.frequency}</td>
                          <td className="py-2 px-3">{service.bureaus}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* When to Check */}
            <Card>
              <CardHeader>
                <CardTitle>When to Check Your Credit</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="font-semibold text-green-700 dark:text-green-300 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Check Regularly
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        Monthly via free apps (soft pull)
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        Before applying for major credit (mortgage, auto)
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        After disputing errors (30-45 days)
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        Annual full report from AnnualCreditReport.com
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-3">
                    <div className="font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Dispute Errors
                    </div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        79% of credit reports contain errors
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        Dispute online directly with each bureau
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        30-45 days for investigation
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        Free to dispute - never pay for this
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* PATH TO 800+ TAB */}
        <TabsContent value="path">
          <div className="space-y-6">
            <Card className="border-2 border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  Your Path to 800+
                </CardTitle>
                <CardDescription>
                  From {creditScore} to 800+ - here's your roadmap
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Progress to 800 */}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className={TYPOGRAPHY.metricLabel}>Progress to 800</span>
                    <span className="font-mono">{creditScore} / 800</span>
                  </div>
                  <Progress value={(creditScore / 800) * 100} className="h-3" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Current: {creditScore}</span>
                    <span>{pointsTo800} points to go</span>
                    <span>Target: 800</span>
                  </div>
                </div>

                {/* Timeline Estimate */}
                <div className="p-4 rounded-lg bg-white dark:bg-gray-900 border">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-purple-600" />
                      <span className="font-semibold">Estimated Timeline</span>
                    </div>
                    <Badge variant="outline" className="font-mono">
                      {creditScore >= 800 ? 'You made it!' : `~${estimatedMonths} months`}
                    </Badge>
                  </div>

                  {creditScore >= 800 ? (
                    <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-center">
                      <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                      <div className="font-semibold text-green-800 dark:text-green-200">
                        Congratulations! You've achieved excellent credit.
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        You qualify for the best rates on everything. Keep up the good habits!
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Timeline */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2">
                        {[0, Math.ceil(estimatedMonths / 3), Math.ceil(estimatedMonths * 2 / 3), estimatedMonths].map((month, idx) => {
                          const estimatedScore = Math.min(800, creditScore + ((800 - creditScore) * idx / 3))
                          return (
                            <div key={idx} className="flex-1 min-w-[80px]">
                              <div className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                                   style={{ opacity: 0.3 + (idx * 0.23) }} />
                              <div className="mt-2 text-center">
                                <div className="text-xs text-muted-foreground">Month {month}</div>
                                <div className="text-sm font-semibold">{Math.round(estimatedScore)}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Behaviors that build credit */}
                {creditScore < 800 && (
                  <div className="space-y-3">
                    <div className="font-semibold">Monthly Habits for 800+</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {[
                        { icon: CheckCircle2, text: 'Pay all bills on time, every time', color: 'green' },
                        { icon: CreditCard, text: 'Keep utilization under 10%', color: 'blue' },
                        { icon: Shield, text: 'Keep old accounts open and active', color: 'purple' },
                        { icon: Eye, text: 'Monitor for errors and fraud', color: 'amber' },
                        { icon: AlertCircle, text: 'Avoid opening unnecessary new accounts', color: 'orange' },
                        { icon: Clock, text: 'Be patient - time is your friend', color: 'cyan' },
                      ].map((item, idx) => {
                        const Icon = item.icon
                        return (
                          <div key={idx} className="flex items-center gap-2 p-3 rounded-lg bg-white dark:bg-gray-900 border">
                            <Icon className={`h-4 w-4 text-${item.color}-600`} />
                            <span className="text-sm">{item.text}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Integration with Debt Planning */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Integration with Debt Planning
                </CardTitle>
                <CardDescription>
                  Improve score first, then refinance for maximum savings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    The Refinancing Strategy
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-900 rounded-full border text-sm">
                      <Target className="h-3 w-3" />
                      Improve Score
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-900 rounded-full border text-sm">
                      <RefreshCw className="h-3 w-3" />
                      Refinance Debt
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full border border-green-200 text-sm text-green-700 dark:text-green-300">
                      <DollarSign className="h-3 w-3" />
                      Save Money
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                    <div className="font-semibold mb-2">When to Refinance</div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        Score improved 50+ points since original loan
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        Interest rates have dropped
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        Closing costs break even within 2 years
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border bg-white dark:bg-gray-900">
                    <div className="font-semibold mb-2">What to Refinance</div>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start gap-2">
                        <Home className="h-4 w-4 text-blue-600 mt-0.5" />
                        Mortgage (biggest savings potential)
                      </li>
                      <li className="flex items-start gap-2">
                        <Car className="h-4 w-4 text-purple-600 mt-0.5" />
                        Auto loan (if over 2+ years remaining)
                      </li>
                      <li className="flex items-start gap-2">
                        <CreditCard className="h-4 w-4 text-amber-600 mt-0.5" />
                        Credit card balance transfers (0% intro APR)
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* The Mindset */}
            <div className="p-6 rounded-xl bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800">
              <div className="text-center space-y-4">
                <div className="inline-flex p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <CreditCard className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-xl font-bold text-blue-900 dark:text-blue-100">
                  "Credit is a tool, not a trap."
                </div>
                <p className={cn(TYPOGRAPHY.bodyMuted, 'max-w-lg mx-auto')}>
                  Good credit unlocks the best rates on mortgages, auto loans, and credit cards.
                  It can save you hundreds of thousands of dollars over your lifetime.
                  The work you put in now pays dividends for decades.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Summary Call-to-Action */}
      <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-semibold text-green-900 dark:text-green-100 mb-2">
                Good Credit is Free Money
              </div>
              <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1 list-disc list-inside')}>
                <li>A 760+ score gets you the best rates on everything</li>
                <li>The difference between 660 and 760 can cost $100,000+ on a mortgage</li>
                <li>65% of your score is just: pay on time + keep utilization low</li>
                <li>Check your score monthly for free - it doesn't hurt your credit</li>
                <li>Dispute errors - 79% of reports have them</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default CreditImpact
