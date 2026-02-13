'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Wallet,
  PiggyBank,
  Building2,
  Users,
  Briefcase,
  Calculator,
  Info,
  ChevronRight,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens'
import { fmt, fmtFull } from '@/lib/utils'

// ==================== Types ====================

type IncomeType = 'single' | 'dual-stable' | 'dual-one-variable' | 'variable' | 'self-employed'
type JobStability = 'very-stable' | 'stable' | 'moderate' | 'unstable'

interface EmergencyFundInputs {
  // Monthly expenses
  monthlyExpenses: number
  // Income situation
  incomeType: IncomeType
  jobStability: JobStability
  // Family situation
  dependents: number
  // Insurance deductibles
  healthDeductible: number
  autoDeductible: number
  homeDeductible: number
  // Current savings
  currentEmergencyFund: number
  checkingBuffer: number
  // Monthly savings capacity
  monthlySavingsCapacity: number
}

interface TwoTierAllocation {
  checkingBuffer: number
  savingsCushion: number
  total: number
}

interface WhereToKeepRecommendation {
  hysa: number
  iBonds: number
  moneyMarket: number
  description: string
}

// ==================== Helper Functions ====================

/**
 * Calculate recommended emergency fund months based on personal situation
 */
function calculateRecommendedMonths(inputs: EmergencyFundInputs): {
  minMonths: number
  maxMonths: number
  recommendedMonths: number
  reasoning: string[]
} {
  let minMonths = 3
  let maxMonths = 6
  const reasoning: string[] = []

  // Income type adjustments
  switch (inputs.incomeType) {
    case 'single':
      minMonths = 6
      maxMonths = 9
      reasoning.push('Single income household: 6-9 months recommended for security')
      break
    case 'dual-stable':
      minMonths = 3
      maxMonths = 4
      reasoning.push('Dual stable income: 3-4 months provides adequate coverage')
      break
    case 'dual-one-variable':
      minMonths = 4
      maxMonths = 6
      reasoning.push('One variable income: 4-6 months accounts for income fluctuations')
      break
    case 'variable':
      minMonths = 9
      maxMonths = 12
      reasoning.push('Variable/commission income: 9-12 months protects against income gaps')
      break
    case 'self-employed':
      minMonths = 9
      maxMonths = 12
      reasoning.push('Self-employed: 9-12 months covers business cycles and client gaps')
      break
  }

  // Job stability adjustments
  switch (inputs.jobStability) {
    case 'very-stable':
      // No adjustment needed
      break
    case 'stable':
      minMonths += 1
      reasoning.push('+1 month for moderate job stability')
      break
    case 'moderate':
      minMonths += 2
      maxMonths += 1
      reasoning.push('+2-1 months for uncertain job market')
      break
    case 'unstable':
      minMonths += 3
      maxMonths += 2
      reasoning.push('+3-2 months for high job volatility')
      break
  }

  // Dependent adjustments
  if (inputs.dependents > 0) {
    const additionalMonths = Math.min(inputs.dependents, 3) // Cap at 3 extra months
    minMonths += additionalMonths
    maxMonths += additionalMonths
    reasoning.push(`+${additionalMonths} month(s) for ${inputs.dependents} dependent(s)`)
  }

  // Calculate recommended (middle of range, weighted toward min)
  const recommendedMonths = Math.round(minMonths + (maxMonths - minMonths) * 0.4)

  return { minMonths, maxMonths, recommendedMonths, reasoning }
}

/**
 * Calculate insurance deductible buffer needed
 */
function calculateDeductibleBuffer(inputs: EmergencyFundInputs): {
  total: number
  breakdown: { label: string; amount: number }[]
} {
  const breakdown = [
    { label: 'Health Insurance Deductible', amount: inputs.healthDeductible },
    { label: 'Auto Insurance Deductible', amount: inputs.autoDeductible },
    { label: 'Home/Renters Deductible', amount: inputs.homeDeductible },
  ].filter(item => item.amount > 0)

  const total = breakdown.reduce((sum, item) => sum + item.amount, 0)

  return { total, breakdown }
}

/**
 * Calculate two-tier system allocation
 */
function calculateTwoTierAllocation(
  targetEmergencyFund: number,
  monthlyExpenses: number
): TwoTierAllocation {
  // Checking buffer: 1-2 months expenses for immediate access
  const checkingBuffer = Math.round(monthlyExpenses * 1.5)
  // Rest goes to savings
  const savingsCushion = Math.max(0, targetEmergencyFund - checkingBuffer)

  return {
    checkingBuffer,
    savingsCushion,
    total: checkingBuffer + savingsCushion,
  }
}

/**
 * Generate where to keep recommendations
 */
function generateWhereToKeepRecommendation(
  targetAmount: number,
  currentAmount: number
): WhereToKeepRecommendation {
  // Basic allocation strategy:
  // - First $10K: HYSA for immediate liquidity
  // - Next portion: Consider I-Bonds (up to $10K/year limit)
  // - Remainder: Money market or HYSA

  const hysaBase = Math.min(targetAmount, 10000)
  const remaining = Math.max(0, targetAmount - hysaBase)

  // I-Bonds: Good for longer-term portion, but limited to $10K/year purchase
  const iBondsAllocation = Math.min(remaining * 0.3, 10000)
  const moneyMarketAllocation = remaining - iBondsAllocation

  let description = ''
  if (targetAmount <= 10000) {
    description =
      'Keep your full emergency fund in a High-Yield Savings Account (HYSA) for maximum liquidity and competitive interest rates.'
  } else if (targetAmount <= 20000) {
    description =
      'Consider splitting between HYSA for immediate needs and I-Bonds for inflation protection. I-Bonds have a 1-year lock-up period.'
  } else {
    description =
      'Diversify across HYSA (immediate access), I-Bonds (inflation protection), and money market funds (competitive yields with check-writing).'
  }

  return {
    hysa: hysaBase + moneyMarketAllocation * 0.5,
    iBonds: iBondsAllocation,
    moneyMarket: moneyMarketAllocation * 0.5,
    description,
  }
}

/**
 * Calculate months to reach target
 */
function calculateBuildUpPlan(
  currentAmount: number,
  targetAmount: number,
  monthlySavings: number
): {
  monthsToTarget: number
  formattedTime: string
  milestones: { month: number; amount: number; label: string }[]
} {
  const gap = Math.max(0, targetAmount - currentAmount)

  if (gap === 0 || monthlySavings <= 0) {
    return {
      monthsToTarget: 0,
      formattedTime: 'Already at target!',
      milestones: [],
    }
  }

  const monthsToTarget = Math.ceil(gap / monthlySavings)

  // Format time
  let formattedTime: string
  if (monthsToTarget <= 12) {
    formattedTime = `${monthsToTarget} month${monthsToTarget > 1 ? 's' : ''}`
  } else {
    const years = Math.floor(monthsToTarget / 12)
    const remainingMonths = monthsToTarget % 12
    formattedTime =
      remainingMonths > 0
        ? `${years} year${years > 1 ? 's' : ''}, ${remainingMonths} month${remainingMonths > 1 ? 's' : ''}`
        : `${years} year${years > 1 ? 's' : ''}`
  }

  // Generate milestones
  const milestones: { month: number; amount: number; label: string }[] = []
  const quarterTarget = targetAmount * 0.25
  const halfTarget = targetAmount * 0.5
  const threeQuarterTarget = targetAmount * 0.75

  const checkpoints = [
    { amount: quarterTarget, label: '25% of target' },
    { amount: halfTarget, label: '50% of target' },
    { amount: threeQuarterTarget, label: '75% of target' },
    { amount: targetAmount, label: 'Full target' },
  ]

  checkpoints.forEach(cp => {
    if (cp.amount > currentAmount) {
      const monthsNeeded = Math.ceil((cp.amount - currentAmount) / monthlySavings)
      milestones.push({ month: monthsNeeded, amount: cp.amount, label: cp.label })
    }
  })

  return { monthsToTarget, formattedTime, milestones }
}

// ==================== Sub-Components ====================

interface ProgressRingProps {
  progress: number
  size?: number
  strokeWidth?: number
  className?: string
}

function ProgressRing({ progress, size = 120, strokeWidth = 12, className = '' }: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (Math.min(progress, 100) / 100) * circumference

  const getColor = () => {
    if (progress >= 100) return 'text-green-500'
    if (progress >= 75) return 'text-blue-500'
    if (progress >= 50) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-muted"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`fill-none ${getColor()} stroke-current transition-all duration-500`}
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className={`${TYPOGRAPHY.metricMedium} ${getColor()}`}>{Math.round(progress)}%</span>
        <span className={TYPOGRAPHY.helperText}>funded</span>
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export interface EmergencyFundCalculatorProps {
  /** Initial monthly expenses (can come from context) */
  initialMonthlyExpenses?: number
  /** Initial emergency fund balance */
  initialEmergencyFund?: number
  /** Compact mode for embedding in other views */
  compact?: boolean
}

export function EmergencyFundCalculator({
  initialMonthlyExpenses = 5000,
  initialEmergencyFund = 0,
  compact = false,
}: EmergencyFundCalculatorProps) {
  // Form state
  const [inputs, setInputs] = useState<EmergencyFundInputs>({
    monthlyExpenses: initialMonthlyExpenses,
    incomeType: 'single',
    jobStability: 'stable',
    dependents: 0,
    healthDeductible: 3000,
    autoDeductible: 500,
    homeDeductible: 1000,
    currentEmergencyFund: initialEmergencyFund,
    checkingBuffer: 2000,
    monthlySavingsCapacity: 500,
  })

  // Update handler
  const updateInput = useCallback(
    <K extends keyof EmergencyFundInputs>(key: K, value: EmergencyFundInputs[K]) => {
      setInputs(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  // Calculations
  const recommendations = useMemo(() => calculateRecommendedMonths(inputs), [inputs])

  const targetEmergencyFund = useMemo(
    () => recommendations.recommendedMonths * inputs.monthlyExpenses,
    [recommendations.recommendedMonths, inputs.monthlyExpenses]
  )

  const deductibleBuffer = useMemo(() => calculateDeductibleBuffer(inputs), [inputs])

  const totalTarget = useMemo(
    () => targetEmergencyFund + deductibleBuffer.total,
    [targetEmergencyFund, deductibleBuffer.total]
  )

  const currentTotal = useMemo(
    () => inputs.currentEmergencyFund + inputs.checkingBuffer,
    [inputs.currentEmergencyFund, inputs.checkingBuffer]
  )

  const progress = useMemo(
    () => (totalTarget > 0 ? (currentTotal / totalTarget) * 100 : 0),
    [currentTotal, totalTarget]
  )

  const twoTierAllocation = useMemo(
    () => calculateTwoTierAllocation(totalTarget, inputs.monthlyExpenses),
    [totalTarget, inputs.monthlyExpenses]
  )

  const whereToKeep = useMemo(
    () => generateWhereToKeepRecommendation(totalTarget, currentTotal),
    [totalTarget, currentTotal]
  )

  const buildUpPlan = useMemo(
    () => calculateBuildUpPlan(currentTotal, totalTarget, inputs.monthlySavingsCapacity),
    [currentTotal, totalTarget, inputs.monthlySavingsCapacity]
  )

  const gap = Math.max(0, totalTarget - currentTotal)

  // Status determination
  const getStatus = () => {
    if (progress >= 100) return { label: 'Fully Funded', color: 'success' as const, icon: CheckCircle2 }
    if (progress >= 75) return { label: 'Nearly There', color: 'neutral' as const, icon: TrendingUp }
    if (progress >= 50) return { label: 'Making Progress', color: 'warning' as const, icon: AlertTriangle }
    return { label: 'Building Up', color: 'negative' as const, icon: AlertTriangle }
  }

  const status = getStatus()
  const StatusIcon = status.icon
  const colors = METRIC_COLORS[status.color]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header Card - Progress Overview */}
      <Card className={`border-2 ${colors.border}`}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Emergency Fund Calculator
              </CardTitle>
              <CardDescription>
                Build a personalized safety net based on your unique situation
              </CardDescription>
            </div>
            <Badge className={`${colors.bg} ${colors.text} border-0`}>{status.label}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress Ring */}
            <div className="flex flex-col items-center justify-center">
              <ProgressRing progress={progress} size={140} />
              <p className={`${TYPOGRAPHY.bodyMuted} mt-2 text-center`}>
                {fmtFull(currentTotal)} of {fmtFull(totalTarget)}
              </p>
            </div>

            {/* Key Metrics */}
            <div className="space-y-4 md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg ${colors.bg}`}>
                  <p className={TYPOGRAPHY.metricLabel}>Target Fund</p>
                  <p className={`${TYPOGRAPHY.metricMedium} ${colors.text}`}>{fmt(totalTarget)}</p>
                  <p className={TYPOGRAPHY.helperText}>
                    {recommendations.recommendedMonths} months of expenses
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className={TYPOGRAPHY.metricLabel}>Gap to Fill</p>
                  <p className={TYPOGRAPHY.metricMedium}>{fmt(gap)}</p>
                  {buildUpPlan.monthsToTarget > 0 && (
                    <p className={TYPOGRAPHY.helperText}>{buildUpPlan.formattedTime} at current rate</p>
                  )}
                </div>
              </div>

              {/* Linear Progress */}
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className={TYPOGRAPHY.metricLabel}>Progress to Target</span>
                  <span className={TYPOGRAPHY.body}>{Math.round(progress)}%</span>
                </div>
                <Progress value={Math.min(progress, 100)} className="h-3" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Your Situation
            </CardTitle>
            <CardDescription>Personalize your emergency fund target</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Monthly Expenses */}
            <div className="space-y-2">
              <Label htmlFor="monthlyExpenses" className={TYPOGRAPHY.inputLabel}>
                Monthly Expenses
              </Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="monthlyExpenses"
                  type="number"
                  value={inputs.monthlyExpenses}
                  onChange={e => updateInput('monthlyExpenses', Number(e.target.value) || 0)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Income Type */}
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.inputLabel}>Income Situation</Label>
              <Select
                value={inputs.incomeType}
                onValueChange={v => updateInput('incomeType', v as IncomeType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">
                    <span className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" /> Single Income Household
                    </span>
                  </SelectItem>
                  <SelectItem value="dual-stable">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Dual Income (Both Stable)
                    </span>
                  </SelectItem>
                  <SelectItem value="dual-one-variable">
                    <span className="flex items-center gap-2">
                      <Users className="h-4 w-4" /> Dual Income (One Variable)
                    </span>
                  </SelectItem>
                  <SelectItem value="variable">
                    <span className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" /> Variable/Commission-Based
                    </span>
                  </SelectItem>
                  <SelectItem value="self-employed">
                    <span className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Self-Employed/Business Owner
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Job Stability */}
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.inputLabel}>Job Stability</Label>
              <Select
                value={inputs.jobStability}
                onValueChange={v => updateInput('jobStability', v as JobStability)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="very-stable">Very Stable (Government, Tenured, etc.)</SelectItem>
                  <SelectItem value="stable">Stable (Established company, good outlook)</SelectItem>
                  <SelectItem value="moderate">Moderate (Some industry uncertainty)</SelectItem>
                  <SelectItem value="unstable">Unstable (Layoff risk, volatile industry)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Dependents */}
            <div className="space-y-2">
              <Label className={TYPOGRAPHY.inputLabel}>Number of Dependents</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[inputs.dependents]}
                  onValueChange={([v]) => updateInput('dependents', v)}
                  min={0}
                  max={5}
                  step={1}
                  className="flex-1"
                  thumbLabel="Dependents"
                />
                <span className={`${TYPOGRAPHY.metricSmall} w-8 text-center`}>{inputs.dependents}</span>
              </div>
            </div>

            {/* Insurance Deductibles */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <Label className={TYPOGRAPHY.inputLabel}>Insurance Deductibles</Label>
              </div>
              <p className={TYPOGRAPHY.helperText}>
                Higher deductibles mean you need more emergency savings to cover potential claims.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="healthDeductible" className={TYPOGRAPHY.helperText}>
                    Health
                  </Label>
                  <Input
                    id="healthDeductible"
                    type="number"
                    value={inputs.healthDeductible}
                    onChange={e => updateInput('healthDeductible', Number(e.target.value) || 0)}
                    placeholder="3000"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="autoDeductible" className={TYPOGRAPHY.helperText}>
                    Auto
                  </Label>
                  <Input
                    id="autoDeductible"
                    type="number"
                    value={inputs.autoDeductible}
                    onChange={e => updateInput('autoDeductible', Number(e.target.value) || 0)}
                    placeholder="500"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="homeDeductible" className={TYPOGRAPHY.helperText}>
                    Home/Renters
                  </Label>
                  <Input
                    id="homeDeductible"
                    type="number"
                    value={inputs.homeDeductible}
                    onChange={e => updateInput('homeDeductible', Number(e.target.value) || 0)}
                    placeholder="1000"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations Section */}
        <div className="space-y-6">
          {/* Personalized Target Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                Why {recommendations.recommendedMonths} Months?
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {recommendations.reasoning.map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <ChevronRight className="h-4 w-4 mt-0.5 text-blue-500 flex-shrink-0" />
                    <span className={TYPOGRAPHY.body}>{reason}</span>
                  </li>
                ))}
              </ul>

              {deductibleBuffer.total > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <p className={`${TYPOGRAPHY.subSectionHeader} mb-2`}>+ Deductible Buffer</p>
                  <div className="space-y-1">
                    {deductibleBuffer.breakdown.map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className={TYPOGRAPHY.bodyMuted}>{item.label}</span>
                        <span className={TYPOGRAPHY.body}>{fmtFull(item.amount)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-semibold">
                      <span>Total Buffer</span>
                      <span>{fmtFull(deductibleBuffer.total)}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className={`${TYPOGRAPHY.metricLabel} text-blue-800 dark:text-blue-200`}>
                  Your Personalized Target
                </p>
                <p className={`${TYPOGRAPHY.metricMedium} text-blue-600 dark:text-blue-400`}>
                  {fmtFull(totalTarget)}
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  ({recommendations.recommendedMonths} months x {fmtFull(inputs.monthlyExpenses)}) +{' '}
                  {fmtFull(deductibleBuffer.total)} deductibles
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Two-Tier System */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Two-Tier System
              </CardTitle>
              <CardDescription>Split your emergency fund for optimal access and growth</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Tier 1: Checking Buffer */}
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    <span className={`${TYPOGRAPHY.sectionHeader} text-amber-800 dark:text-amber-200`}>
                      Tier 1: Checking Buffer
                    </span>
                  </div>
                  <p className={`${TYPOGRAPHY.metricMedium} text-amber-700 dark:text-amber-300`}>
                    {fmtFull(twoTierAllocation.checkingBuffer)}
                  </p>
                  <p className={`${TYPOGRAPHY.bodyMuted} mt-1`}>
                    ~1.5 months expenses in checking for immediate access. Covers unexpected bills
                    without touching savings.
                  </p>
                  <div className="mt-2">
                    <Label htmlFor="checkingBuffer" className={TYPOGRAPHY.helperText}>
                      Your Current Checking Buffer
                    </Label>
                    <Input
                      id="checkingBuffer"
                      type="number"
                      value={inputs.checkingBuffer}
                      onChange={e => updateInput('checkingBuffer', Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Tier 2: Savings Cushion */}
                <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center gap-2 mb-2">
                    <PiggyBank className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    <span className={`${TYPOGRAPHY.sectionHeader} text-emerald-800 dark:text-emerald-200`}>
                      Tier 2: Savings Cushion
                    </span>
                  </div>
                  <p className={`${TYPOGRAPHY.metricMedium} text-emerald-700 dark:text-emerald-300`}>
                    {fmtFull(twoTierAllocation.savingsCushion)}
                  </p>
                  <p className={`${TYPOGRAPHY.bodyMuted} mt-1`}>
                    Remaining emergency fund in high-yield savings. Earns interest while staying accessible
                    for major emergencies.
                  </p>
                  <div className="mt-2">
                    <Label htmlFor="currentEmergencyFund" className={TYPOGRAPHY.helperText}>
                      Your Current Emergency Savings
                    </Label>
                    <Input
                      id="currentEmergencyFund"
                      type="number"
                      value={inputs.currentEmergencyFund}
                      onChange={e => updateInput('currentEmergencyFund', Number(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Where to Keep It */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Where to Keep Your Emergency Fund
          </CardTitle>
          <CardDescription>{whereToKeep.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* HYSA */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className={TYPOGRAPHY.sectionHeader}>High-Yield Savings</p>
                  <p className={TYPOGRAPHY.helperText}>4-5% APY typical</p>
                </div>
              </div>
              <p className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                {fmtFull(whereToKeep.hysa)}
              </p>
              <ul className={`${TYPOGRAPHY.helperText} mt-2 space-y-1`}>
                <li>+ Instant liquidity</li>
                <li>+ FDIC insured</li>
                <li>+ No lock-up period</li>
              </ul>
            </div>

            {/* I-Bonds */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className={TYPOGRAPHY.sectionHeader}>I-Bonds</p>
                  <p className={TYPOGRAPHY.helperText}>Inflation-indexed</p>
                </div>
              </div>
              <p className={`${TYPOGRAPHY.metricSmall} text-purple-600 dark:text-purple-400`}>
                {fmtFull(whereToKeep.iBonds)}
              </p>
              <ul className={`${TYPOGRAPHY.helperText} mt-2 space-y-1`}>
                <li>+ Inflation protection</li>
                <li>+ Tax-deferred</li>
                <li>- 1-year lock-up</li>
                <li>- $10K/year limit</li>
              </ul>
            </div>

            {/* Money Market */}
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-full bg-green-100 dark:bg-green-900/30">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className={TYPOGRAPHY.sectionHeader}>Money Market</p>
                  <p className={TYPOGRAPHY.helperText}>4-5% APY typical</p>
                </div>
              </div>
              <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
                {fmtFull(whereToKeep.moneyMarket)}
              </p>
              <ul className={`${TYPOGRAPHY.helperText} mt-2 space-y-1`}>
                <li>+ Check-writing access</li>
                <li>+ Competitive rates</li>
                <li>+ Very liquid</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Build-Up Plan */}
      {gap > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              Your Build-Up Plan
            </CardTitle>
            <CardDescription>How to reach your emergency fund target</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Monthly Savings Input */}
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="monthlySavings" className={TYPOGRAPHY.inputLabel}>
                      Monthly Savings Capacity
                    </Label>
                    <p className={TYPOGRAPHY.helperText}>How much can you save per month?</p>
                  </div>
                  <div className="relative w-full sm:w-48">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="monthlySavings"
                      type="number"
                      value={inputs.monthlySavingsCapacity}
                      onChange={e => updateInput('monthlySavingsCapacity', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              {/* Timeline */}
              {inputs.monthlySavingsCapacity > 0 ? (
                <>
                  <div className="text-center py-4">
                    <p className={TYPOGRAPHY.bodyMuted}>
                      At <span className="font-semibold">{fmtFull(inputs.monthlySavingsCapacity)}/month</span>,
                      you will reach your target in:
                    </p>
                    <p className={`${TYPOGRAPHY.metricLarge} text-blue-600 dark:text-blue-400 mt-2`}>
                      {buildUpPlan.formattedTime}
                    </p>
                  </div>

                  {/* Milestones */}
                  {buildUpPlan.milestones.length > 0 && (
                    <div className="space-y-3">
                      <p className={TYPOGRAPHY.subSectionHeader}>Milestones</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {buildUpPlan.milestones.map((milestone, idx) => (
                          <div
                            key={idx}
                            className="p-3 rounded-lg bg-muted/50 border text-center"
                          >
                            <p className={TYPOGRAPHY.metricTiny}>{milestone.label}</p>
                            <p className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                              {fmtFull(milestone.amount)}
                            </p>
                            <p className={TYPOGRAPHY.helperText}>
                              Month {milestone.month}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Savings Tips */}
                  <div className="p-4 rounded-lg bg-muted/30 border">
                    <p className={`${TYPOGRAPHY.subSectionHeader} mb-2`}>Tips to Accelerate</p>
                    <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1`}>
                      <li>
                        <ChevronRight className="h-3 w-3 inline mr-1" />
                        Direct deposit a portion of each paycheck to savings
                      </li>
                      <li>
                        <ChevronRight className="h-3 w-3 inline mr-1" />
                        Save tax refunds, bonuses, and windfalls
                      </li>
                      <li>
                        <ChevronRight className="h-3 w-3 inline mr-1" />
                        Temporarily reduce discretionary spending
                      </li>
                      <li>
                        <ChevronRight className="h-3 w-3 inline mr-1" />
                        Consider a side gig for extra income
                      </li>
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-6">
                  <p className={TYPOGRAPHY.bodyMuted}>
                    Enter your monthly savings capacity to see your personalized build-up plan.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Fully Funded Celebration */}
      {progress >= 100 && (
        <Card className="border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className={`${TYPOGRAPHY.metricMedium} text-green-700 dark:text-green-300`}>
                  Congratulations! Your emergency fund is fully funded.
                </p>
                <p className={`${TYPOGRAPHY.bodyMuted} mt-2 max-w-md mx-auto`}>
                  You have {fmtFull(currentTotal)} saved, which covers {recommendations.recommendedMonths}{' '}
                  months of expenses plus your insurance deductibles. You are well-protected against
                  unexpected financial emergencies.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This calculator provides general guidance. Your specific needs may vary based on factors like
          health conditions, industry trends, or upcoming life changes. Consider consulting a financial
          advisor for personalized advice.
        </p>
      </div>
    </div>
  )
}

export default EmergencyFundCalculator
