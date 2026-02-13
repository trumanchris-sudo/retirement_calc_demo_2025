'use client'

import React, { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Shield,
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  Calculator,
  Info,
  ChevronRight,
  DollarSign,
  Clock,
  Briefcase,
  Heart,
  Users,
  AlertCircle,
  Wallet,
  Target,
  Building2,
  Award,
  XCircle,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens'
import { fmt, fmtFull } from '@/lib/utils'
import { loadSharedIncomeData, type SharedIncomeData } from '@/lib/sharedIncomeData'

// ==================== Types ====================

type OccupationClass = '1' | '2' | '3' | '4' | '5' // 1 = low risk (office), 5 = high risk (manual labor)
type HealthStatus = 'excellent' | 'good' | 'fair' | 'poor'
type PolicyType = 'short-term' | 'long-term' | 'both'
type DisabilityDefinition = 'own-occupation' | 'any-occupation' | 'hybrid'

interface DisabilityInputs {
  // Income
  annualIncome: number
  bonusIncome: number // Usually excluded from employer coverage
  // Employer Coverage
  hasEmployerCoverage: boolean
  employerCoveragePct: number // Usually 60% of base salary
  employerCoverageMax: number // Often capped at $10-15K/month
  employerCoverageTaxable: boolean // Employer-paid = taxable benefits
  // Individual Policy Goals
  targetReplacementPct: number // Total desired replacement (70-80%)
  // Personal Factors
  age: number
  occupationClass: OccupationClass
  healthStatus: HealthStatus
  // Coverage Preferences
  policyType: PolicyType
  disabilityDefinition: DisabilityDefinition
  eliminationPeriod: number // Days before benefits start (30, 60, 90, 180, 365)
  benefitPeriod: number // Years of coverage (2, 5, 10, to age 65/67)
  // Retirement Integration
  currentSavings: number
  monthlyExpenses: number
  retirementAge: number
}

interface CoverageAnalysis {
  totalIncomeToProtect: number
  employerCoverageAmount: number
  employerCoverageAfterTax: number
  individualCoverageNeeded: number
  targetMonthlyBenefit: number
  employerMonthlyBenefit: number
  individualMonthlyBenefit: number
  gapMonthly: number
  replacementRatio: number
}

interface PremiumEstimate {
  annualPremium: number
  monthlyPremium: number
  premiumAsPercentOfIncome: number
  factors: { label: string; impact: 'increases' | 'decreases' | 'neutral'; detail: string }[]
}

interface DisabilityImpact {
  monthsUntilSavingsDepleted: number
  yearsUntilSavingsDepleted: number
  retirementDelayYears: number
  totalFinancialLoss: number
}

// ==================== Constants ====================

// Disability statistics
const DISABILITY_STATS = {
  oddsBeforeAge67: 0.25, // 1 in 4 workers
  avgDurationMonths: 34.6,
  percentOver90Days: 0.65,
  topCauses: [
    { cause: 'Musculoskeletal/Back', percentage: 29 },
    { cause: 'Cancer', percentage: 15 },
    { cause: 'Mental Health', percentage: 14 },
    { cause: 'Cardiovascular', percentage: 12 },
    { cause: 'Injuries', percentage: 9 },
  ],
}

// Premium rate factors (per $100 of monthly benefit, annualized)
// Based on industry averages - actual rates vary by carrier
const BASE_PREMIUM_RATES: Record<OccupationClass, number> = {
  '1': 1.5, // Office workers, executives
  '2': 2.0, // Light physical work
  '3': 2.5, // Moderate physical work
  '4': 3.5, // Heavy physical work
  '5': 5.0, // High-risk occupations
}

const AGE_PREMIUM_MULTIPLIERS: Record<string, number> = {
  '25-29': 0.7,
  '30-34': 0.85,
  '35-39': 1.0,
  '40-44': 1.25,
  '45-49': 1.55,
  '50-54': 2.0,
  '55-59': 2.6,
  '60-64': 3.5,
}

const HEALTH_PREMIUM_MULTIPLIERS: Record<HealthStatus, number> = {
  excellent: 0.9,
  good: 1.0,
  fair: 1.35,
  poor: 2.0, // Often declined or rated heavily
}

// Elimination period discounts (longer wait = lower premium)
const ELIMINATION_PERIOD_MULTIPLIERS: Record<number, number> = {
  30: 1.3,
  60: 1.15,
  90: 1.0, // Standard
  180: 0.85,
  365: 0.7,
}

// Benefit period multipliers
const BENEFIT_PERIOD_MULTIPLIERS: Record<number, number> = {
  2: 0.6,
  5: 0.8,
  10: 0.95,
  67: 1.0, // To age 65/67 - standard
}

// Definition multipliers
const DEFINITION_MULTIPLIERS: Record<DisabilityDefinition, number> = {
  'own-occupation': 1.25, // Most expensive, best coverage
  'hybrid': 1.0, // Own-occ for 2-5 years, then any-occ
  'any-occupation': 0.75, // Cheapest, hardest to qualify
}

// ==================== Helper Functions ====================

function getAgeBracket(age: number): string {
  if (age < 25) return '25-29'
  if (age < 30) return '25-29'
  if (age < 35) return '30-34'
  if (age < 40) return '35-39'
  if (age < 45) return '40-44'
  if (age < 50) return '45-49'
  if (age < 55) return '50-54'
  if (age < 60) return '55-59'
  return '60-64'
}

function calculateCoverageAnalysis(inputs: DisabilityInputs): CoverageAnalysis {
  const totalIncomeToProtect = inputs.annualIncome + inputs.bonusIncome

  // Employer coverage calculation
  let employerCoverageAmount = 0
  let employerCoverageAfterTax = 0

  if (inputs.hasEmployerCoverage) {
    // Employer coverage typically covers base salary only (excludes bonus)
    const baseCoverage = inputs.annualIncome * (inputs.employerCoveragePct / 100)
    // Apply monthly max cap
    const monthlyMaxAnnualized = inputs.employerCoverageMax * 12
    employerCoverageAmount = Math.min(baseCoverage, monthlyMaxAnnualized)

    // If employer pays premium, benefits are taxable
    // Assume ~30% effective tax rate on disability benefits
    employerCoverageAfterTax = inputs.employerCoverageTaxable
      ? employerCoverageAmount * 0.7
      : employerCoverageAmount
  }

  // Target total coverage
  const targetCoverage = totalIncomeToProtect * (inputs.targetReplacementPct / 100)

  // Gap to fill with individual policy
  const individualCoverageNeeded = Math.max(0, targetCoverage - employerCoverageAfterTax)

  // Monthly calculations
  const targetMonthlyBenefit = targetCoverage / 12
  const employerMonthlyBenefit = employerCoverageAfterTax / 12
  const individualMonthlyBenefit = individualCoverageNeeded / 12

  // Current gap
  const gapMonthly = Math.max(0, targetMonthlyBenefit - employerMonthlyBenefit)

  // Replacement ratio with current coverage
  const replacementRatio = employerCoverageAfterTax / totalIncomeToProtect

  return {
    totalIncomeToProtect,
    employerCoverageAmount,
    employerCoverageAfterTax,
    individualCoverageNeeded,
    targetMonthlyBenefit,
    employerMonthlyBenefit,
    individualMonthlyBenefit,
    gapMonthly,
    replacementRatio,
  }
}

function calculatePremiumEstimate(
  inputs: DisabilityInputs,
  monthlyBenefit: number
): PremiumEstimate {
  const factors: PremiumEstimate['factors'] = []

  // Base rate by occupation
  const baseRate = BASE_PREMIUM_RATES[inputs.occupationClass]
  const occClass = parseInt(inputs.occupationClass)
  factors.push({
    label: 'Occupation Class',
    impact: occClass <= 2 ? 'decreases' : occClass >= 4 ? 'increases' : 'neutral',
    detail: `Class ${inputs.occupationClass} - ${
      occClass === 1 ? 'Professional/Office' :
      occClass === 2 ? 'Light Physical' :
      occClass === 3 ? 'Moderate Physical' :
      occClass === 4 ? 'Heavy Physical' : 'High Risk'
    }`,
  })

  // Age multiplier
  const ageBracket = getAgeBracket(inputs.age)
  const ageMultiplier = AGE_PREMIUM_MULTIPLIERS[ageBracket] ?? 1.0
  factors.push({
    label: 'Age',
    impact: inputs.age < 35 ? 'decreases' : inputs.age > 50 ? 'increases' : 'neutral',
    detail: `Age ${inputs.age} - ${inputs.age < 35 ? 'younger = lower risk' : inputs.age > 50 ? 'higher risk = higher premium' : 'standard rates'}`,
  })

  // Health multiplier
  const healthMultiplier = HEALTH_PREMIUM_MULTIPLIERS[inputs.healthStatus]
  factors.push({
    label: 'Health Status',
    impact: inputs.healthStatus === 'excellent' ? 'decreases' :
            inputs.healthStatus === 'fair' || inputs.healthStatus === 'poor' ? 'increases' : 'neutral',
    detail: `${inputs.healthStatus.charAt(0).toUpperCase() + inputs.healthStatus.slice(1)} health`,
  })

  // Elimination period
  const elimMultiplier = ELIMINATION_PERIOD_MULTIPLIERS[inputs.eliminationPeriod] ?? 1.0
  factors.push({
    label: 'Elimination Period',
    impact: inputs.eliminationPeriod >= 180 ? 'decreases' : inputs.eliminationPeriod <= 30 ? 'increases' : 'neutral',
    detail: `${inputs.eliminationPeriod} days - ${inputs.eliminationPeriod >= 180 ? 'longer wait = lower premium' : 'shorter wait = higher premium'}`,
  })

  // Benefit period
  const benefitMultiplier = BENEFIT_PERIOD_MULTIPLIERS[inputs.benefitPeriod] ?? 1.0
  factors.push({
    label: 'Benefit Period',
    impact: inputs.benefitPeriod <= 5 ? 'decreases' : 'neutral',
    detail: `${inputs.benefitPeriod === 67 ? 'To age 65/67' : `${inputs.benefitPeriod} years`}`,
  })

  // Definition type
  const defMultiplier = DEFINITION_MULTIPLIERS[inputs.disabilityDefinition]
  factors.push({
    label: 'Disability Definition',
    impact: inputs.disabilityDefinition === 'own-occupation' ? 'increases' :
            inputs.disabilityDefinition === 'any-occupation' ? 'decreases' : 'neutral',
    detail: inputs.disabilityDefinition === 'own-occupation'
      ? 'Own-occupation (best coverage, higher premium)'
      : inputs.disabilityDefinition === 'any-occupation'
      ? 'Any-occupation (limited coverage, lower premium)'
      : 'Hybrid (own-occ transitioning to any-occ)',
  })

  // Calculate final premium
  // Formula: (monthlyBenefit / 100) * baseRate * all multipliers * 12
  const benefitUnits = monthlyBenefit / 100
  const annualPremium = benefitUnits * baseRate * ageMultiplier * healthMultiplier *
                         elimMultiplier * benefitMultiplier * defMultiplier * 12

  const monthlyPremium = annualPremium / 12
  const premiumAsPercentOfIncome = (annualPremium / inputs.annualIncome) * 100

  return {
    annualPremium,
    monthlyPremium,
    premiumAsPercentOfIncome,
    factors,
  }
}

function calculateDisabilityImpact(inputs: DisabilityInputs): DisabilityImpact {
  // If disabled tomorrow with no coverage, how long until savings depleted?
  const monthlyNeed = inputs.monthlyExpenses
  const savings = inputs.currentSavings

  const monthsUntilDepleted = savings / monthlyNeed
  const yearsUntilDepleted = monthsUntilDepleted / 12

  // Retirement impact
  // Lost earning years + depleted savings
  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.age)
  const avgDisabilityYears = DISABILITY_STATS.avgDurationMonths / 12

  // If disabled for average duration, delay retirement by ~same amount
  // Plus time to rebuild depleted savings
  const rebuildTime = Math.min(5, yearsUntilDepleted) // Estimate 5 years to rebuild
  const retirementDelayYears = Math.round(avgDisabilityYears + rebuildTime)

  // Total financial loss (lost income + depleted savings)
  const lostIncomeYears = Math.min(avgDisabilityYears, yearsToRetirement)
  const totalFinancialLoss = (inputs.annualIncome * lostIncomeYears) +
                              Math.min(savings, monthlyNeed * DISABILITY_STATS.avgDurationMonths)

  return {
    monthsUntilSavingsDepleted: monthsUntilDepleted,
    yearsUntilSavingsDepleted: yearsUntilDepleted,
    retirementDelayYears,
    totalFinancialLoss,
  }
}

// ==================== Sub-Components ====================

interface StatCardProps {
  icon: React.ReactNode
  value: string
  label: string
  sublabel?: string
  variant?: 'default' | 'warning' | 'success' | 'danger'
}

function StatCard({ icon, value, label, sublabel, variant = 'default' }: StatCardProps) {
  const variantStyles = {
    default: 'bg-muted/50',
    warning: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800',
    success: 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800',
    danger: 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800',
  }

  const textStyles = {
    default: 'text-foreground',
    warning: 'text-amber-700 dark:text-amber-300',
    success: 'text-emerald-700 dark:text-emerald-300',
    danger: 'text-red-700 dark:text-red-300',
  }

  return (
    <div className={`p-4 rounded-lg ${variantStyles[variant]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className={TYPOGRAPHY.metricLabel}>{label}</span>
      </div>
      <p className={`${TYPOGRAPHY.metricMedium} ${textStyles[variant]}`}>{value}</p>
      {sublabel && <p className={TYPOGRAPHY.helperText}>{sublabel}</p>}
    </div>
  )
}

// ==================== Main Component ====================

export interface DisabilityInsuranceProps {
  /** Initial annual income */
  initialIncome?: number
  /** Initial current savings */
  initialSavings?: number
  /** Initial monthly expenses */
  initialExpenses?: number
  /** Current age */
  initialAge?: number
  /** Retirement age */
  initialRetirementAge?: number
  /** Compact mode for embedding */
  compact?: boolean
}

export function DisabilityInsurance({
  initialIncome,
  initialSavings = 100000,
  initialExpenses = 5000,
  initialAge = 35,
  initialRetirementAge = 65,
  compact = false,
}: DisabilityInsuranceProps) {
  // Load shared income data
  const [sharedData, setSharedData] = useState<SharedIncomeData | null>(null)

  useEffect(() => {
    const data = loadSharedIncomeData()
    if (data) {
      setSharedData(data)
    }
  }, [])

  // Determine initial income from props or shared data
  const defaultIncome = initialIncome ?? sharedData?.primaryIncome ?? 100000

  // Form state
  const [inputs, setInputs] = useState<DisabilityInputs>({
    annualIncome: defaultIncome,
    bonusIncome: 0,
    hasEmployerCoverage: true,
    employerCoveragePct: 60,
    employerCoverageMax: 10000, // $10K/month max
    employerCoverageTaxable: true,
    targetReplacementPct: 70,
    age: initialAge,
    occupationClass: '1',
    healthStatus: 'good',
    policyType: 'long-term',
    disabilityDefinition: 'hybrid',
    eliminationPeriod: 90,
    benefitPeriod: 67,
    currentSavings: initialSavings,
    monthlyExpenses: initialExpenses,
    retirementAge: initialRetirementAge,
  })

  // Update income when shared data loads
  useEffect(() => {
    if (sharedData && !initialIncome) {
      setInputs(prev => ({
        ...prev,
        annualIncome: sharedData.primaryIncome,
      }))
    }
  }, [sharedData, initialIncome])

  // Update handler
  const updateInput = useCallback(
    <K extends keyof DisabilityInputs>(key: K, value: DisabilityInputs[K]) => {
      setInputs(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  // Calculations
  const coverageAnalysis = useMemo(() => calculateCoverageAnalysis(inputs), [inputs])

  const premiumEstimate = useMemo(
    () => calculatePremiumEstimate(inputs, coverageAnalysis.individualMonthlyBenefit),
    [inputs, coverageAnalysis.individualMonthlyBenefit]
  )

  const disabilityImpact = useMemo(() => calculateDisabilityImpact(inputs), [inputs])

  // Financial independence check
  const yearsToRetirement = Math.max(0, inputs.retirementAge - inputs.age)
  const annualExpenses = inputs.monthlyExpenses * 12
  const savingsToExpenseRatio = inputs.currentSavings / annualExpenses
  const isFinanciallyIndependent = savingsToExpenseRatio >= 25 // 25x expenses = FI

  // Coverage status
  const getCoverageStatus = () => {
    if (isFinanciallyIndependent) {
      return { label: 'Self-Insured', color: 'success' as const, icon: Award }
    }
    if (coverageAnalysis.replacementRatio >= 0.6) {
      return { label: 'Adequately Covered', color: 'success' as const, icon: CheckCircle2 }
    }
    if (coverageAnalysis.replacementRatio >= 0.4) {
      return { label: 'Partial Coverage', color: 'warning' as const, icon: AlertTriangle }
    }
    return { label: 'Underinsured', color: 'negative' as const, icon: AlertCircle }
  }

  const coverageStatus = getCoverageStatus()
  const StatusIcon = coverageStatus.icon
  const colors = METRIC_COLORS[coverageStatus.color]

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header Card - The Wake-Up Call */}
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                Disability Insurance Calculator
              </CardTitle>
              <CardDescription className="text-amber-700 dark:text-amber-300 font-medium">
                Protect the Golden Goose: Your Income is Your Most Valuable Asset
              </CardDescription>
            </div>
            <Badge className={`${colors.bg} ${colors.text} border-0`}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {coverageStatus.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* The Overlooked Risk */}
          <div className="p-4 rounded-lg bg-white/50 dark:bg-black/20 border border-amber-200 dark:border-amber-800 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className={`${TYPOGRAPHY.sectionHeader} text-amber-800 dark:text-amber-200`}>
                The Overlooked Risk
              </span>
            </div>
            <p className={`${TYPOGRAPHY.body} text-amber-900 dark:text-amber-100 mb-3`}>
              You are <strong>more likely to become disabled than die</strong> before age 65.
              Yet most people have life insurance but skip disability coverage.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className={`${TYPOGRAPHY.metricLarge} text-amber-700 dark:text-amber-300`}>1 in 4</p>
                <p className={TYPOGRAPHY.helperText}>workers disabled before 67</p>
              </div>
              <div className="text-center">
                <p className={`${TYPOGRAPHY.metricLarge} text-amber-700 dark:text-amber-300`}>
                  {DISABILITY_STATS.avgDurationMonths.toFixed(0)}
                </p>
                <p className={TYPOGRAPHY.helperText}>average disability (months)</p>
              </div>
              <div className="text-center">
                <p className={`${TYPOGRAPHY.metricLarge} text-amber-700 dark:text-amber-300`}>65%</p>
                <p className={TYPOGRAPHY.helperText}>last more than 90 days</p>
              </div>
              <div className="text-center">
                <p className={`${TYPOGRAPHY.metricLarge} text-amber-700 dark:text-amber-300`}>
                  {fmt(inputs.annualIncome * yearsToRetirement)}
                </p>
                <p className={TYPOGRAPHY.helperText}>your future earnings</p>
              </div>
            </div>
          </div>

          {/* Top Causes */}
          <div className="grid grid-cols-5 gap-2">
            {DISABILITY_STATS.topCauses.map(({ cause, percentage }) => (
              <div key={cause} className="text-center p-2 rounded-lg bg-muted/50">
                <p className={TYPOGRAPHY.metricTiny}>{percentage}%</p>
                <p className={`${TYPOGRAPHY.helperText} truncate`} title={cause}>{cause}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* What If Scenario */}
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <TrendingDown className="h-5 w-5" />
            What If You Became Disabled Tomorrow?
          </CardTitle>
          <CardDescription>Without adequate coverage, this is your reality</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={<Clock className="h-4 w-4 text-red-600 dark:text-red-400" />}
              value={disabilityImpact.monthsUntilSavingsDepleted < 120
                ? `${disabilityImpact.monthsUntilSavingsDepleted.toFixed(0)} months`
                : `${disabilityImpact.yearsUntilSavingsDepleted.toFixed(1)} years`}
              label="Savings Runway"
              sublabel="Until savings depleted"
              variant="danger"
            />
            <StatCard
              icon={<Target className="h-4 w-4 text-red-600 dark:text-red-400" />}
              value={`+${disabilityImpact.retirementDelayYears} years`}
              label="Retirement Delay"
              sublabel="To recover financially"
              variant="danger"
            />
            <StatCard
              icon={<DollarSign className="h-4 w-4 text-red-600 dark:text-red-400" />}
              value={fmt(disabilityImpact.totalFinancialLoss)}
              label="Total Financial Loss"
              sublabel="Lost income + depleted savings"
              variant="danger"
            />
            <StatCard
              icon={<Wallet className="h-4 w-4 text-muted-foreground" />}
              value={fmtFull(inputs.monthlyExpenses)}
              label="Monthly Need"
              sublabel="Living expenses continue"
              variant="default"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income & Coverage Inputs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Your Income & Coverage
            </CardTitle>
            <CardDescription>Analyze your current protection level</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Income Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <span className={TYPOGRAPHY.subSectionHeader}>Income</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="annualIncome" className={TYPOGRAPHY.inputLabel}>
                    Annual Salary
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="annualIncome"
                      type="number"
                      value={inputs.annualIncome}
                      onChange={e => updateInput('annualIncome', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bonusIncome" className={TYPOGRAPHY.inputLabel}>
                    Bonus/Variable Income
                  </Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="bonusIncome"
                      type="number"
                      value={inputs.bonusIncome}
                      onChange={e => updateInput('bonusIncome', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                  <p className={TYPOGRAPHY.helperText}>Usually excluded from employer coverage</p>
                </div>
              </div>
            </div>

            {/* Employer Coverage Section */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className={TYPOGRAPHY.subSectionHeader}>Employer Coverage</span>
                </div>
                <Switch
                  checked={inputs.hasEmployerCoverage}
                  onCheckedChange={v => updateInput('hasEmployerCoverage', v)}
                />
              </div>

              {inputs.hasEmployerCoverage && (
                <div className="space-y-4 pl-6 border-l-2 border-muted">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="employerCoveragePct" className={TYPOGRAPHY.inputLabel}>
                        Coverage Percentage
                      </Label>
                      <div className="flex items-center gap-2">
                        <Slider
                          value={[inputs.employerCoveragePct]}
                          onValueChange={([v]) => updateInput('employerCoveragePct', v)}
                          min={40}
                          max={70}
                          step={5}
                          className="flex-1"
                          thumbLabel="Coverage %"
                        />
                        <span className={`${TYPOGRAPHY.metricTiny} w-12 text-right`}>
                          {inputs.employerCoveragePct}%
                        </span>
                      </div>
                      <p className={TYPOGRAPHY.helperText}>Most employers offer 60% of base</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="employerCoverageMax" className={TYPOGRAPHY.inputLabel}>
                        Monthly Benefit Cap
                      </Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="employerCoverageMax"
                          type="number"
                          value={inputs.employerCoverageMax}
                          onChange={e => updateInput('employerCoverageMax', Number(e.target.value) || 0)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <Switch
                      id="employerTaxable"
                      checked={inputs.employerCoverageTaxable}
                      onCheckedChange={v => updateInput('employerCoverageTaxable', v)}
                    />
                    <div>
                      <Label htmlFor="employerTaxable" className={TYPOGRAPHY.inputLabel}>
                        Employer Pays Premium
                      </Label>
                      <p className={TYPOGRAPHY.helperText}>
                        {inputs.employerCoverageTaxable
                          ? 'Benefits will be taxable (~30% reduction)'
                          : 'Benefits will be tax-free'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Target Coverage */}
            <div className="space-y-2 pt-4 border-t">
              <Label className={TYPOGRAPHY.inputLabel}>Target Income Replacement</Label>
              <div className="flex items-center gap-4">
                <Slider
                  value={[inputs.targetReplacementPct]}
                  onValueChange={([v]) => updateInput('targetReplacementPct', v)}
                  min={50}
                  max={80}
                  step={5}
                  className="flex-1"
                  thumbLabel="Target %"
                />
                <span className={`${TYPOGRAPHY.metricSmall} w-12 text-right`}>
                  {inputs.targetReplacementPct}%
                </span>
              </div>
              <p className={TYPOGRAPHY.helperText}>
                70-80% is ideal. Taxes and work expenses decrease when disabled.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Coverage Gap Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Coverage Gap Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Visual Breakdown */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className={TYPOGRAPHY.metricLabel}>Total Income to Protect</span>
                <span className={TYPOGRAPHY.metricSmall}>
                  {fmtFull(coverageAnalysis.totalIncomeToProtect)}/yr
                </span>
              </div>

              {/* Progress bar showing coverage breakdown */}
              <div className="space-y-2">
                <Progress
                  value={coverageAnalysis.replacementRatio * 100}
                  className="h-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>{Math.round(coverageAnalysis.replacementRatio * 100)}% covered</span>
                  <span>{inputs.targetReplacementPct}% target</span>
                </div>
              </div>

              {/* Breakdown Cards */}
              <div className="grid grid-cols-1 gap-3">
                {inputs.hasEmployerCoverage && (
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-blue-600" />
                        <span className={TYPOGRAPHY.body}>Employer Coverage</span>
                      </div>
                      <span className={`${TYPOGRAPHY.metricTiny} text-blue-700 dark:text-blue-300`}>
                        {fmtFull(coverageAnalysis.employerMonthlyBenefit)}/mo
                      </span>
                    </div>
                    {inputs.employerCoverageTaxable && (
                      <p className={`${TYPOGRAPHY.helperText} text-blue-600 mt-1`}>
                        After-tax: {fmtFull(coverageAnalysis.employerCoverageAfterTax)}/yr
                      </p>
                    )}
                  </div>
                )}

                <div className={`p-3 rounded-lg ${coverageAnalysis.gapMonthly > 0
                  ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                  : 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800'
                }`}>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {coverageAnalysis.gapMonthly > 0 ? (
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      )}
                      <span className={TYPOGRAPHY.body}>Coverage Gap</span>
                    </div>
                    <span className={`${TYPOGRAPHY.metricTiny} ${
                      coverageAnalysis.gapMonthly > 0
                        ? 'text-amber-700 dark:text-amber-300'
                        : 'text-emerald-700 dark:text-emerald-300'
                    }`}>
                      {fmtFull(coverageAnalysis.gapMonthly)}/mo
                    </span>
                  </div>
                </div>

                {coverageAnalysis.individualCoverageNeeded > 0 && (
                  <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-emerald-600" />
                        <span className={TYPOGRAPHY.body}>Individual Policy Needed</span>
                      </div>
                      <span className={`${TYPOGRAPHY.metricTiny} text-emerald-700 dark:text-emerald-300`}>
                        {fmtFull(coverageAnalysis.individualMonthlyBenefit)}/mo
                      </span>
                    </div>
                    <p className={TYPOGRAPHY.helperText}>
                      {fmtFull(coverageAnalysis.individualCoverageNeeded)}/yr in coverage
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Key Insight */}
            <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className={`${TYPOGRAPHY.body} font-medium text-blue-800 dark:text-blue-200`}>
                    Why Your Employer Coverage is Not Enough
                  </p>
                  <ul className={`${TYPOGRAPHY.bodyMuted} mt-2 space-y-1`}>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Only covers base salary (excludes bonuses)</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Usually capped at $10-15K/month</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Benefits are taxable if employer pays premium</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Coverage ends when you leave the job</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Often uses restrictive "any occupation" definition</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Policy Configuration & Premium Estimate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Policy Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Individual Policy Options
            </CardTitle>
            <CardDescription>Configure your ideal coverage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Personal Factors */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-muted-foreground" />
                <span className={TYPOGRAPHY.subSectionHeader}>Personal Factors</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age" className={TYPOGRAPHY.inputLabel}>Your Age</Label>
                  <Input
                    id="age"
                    type="number"
                    value={inputs.age}
                    onChange={e => updateInput('age', Number(e.target.value) || 35)}
                    min={18}
                    max={64}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Health Status</Label>
                  <Select
                    value={inputs.healthStatus}
                    onValueChange={v => updateInput('healthStatus', v as HealthStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor (may be declined)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className={TYPOGRAPHY.inputLabel}>Occupation Class</Label>
                <Select
                  value={inputs.occupationClass}
                  onValueChange={v => updateInput('occupationClass', v as OccupationClass)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Class 1 - Professional/Executive (lowest risk)</SelectItem>
                    <SelectItem value="2">Class 2 - Light Physical/Sales</SelectItem>
                    <SelectItem value="3">Class 3 - Moderate Physical</SelectItem>
                    <SelectItem value="4">Class 4 - Heavy Physical</SelectItem>
                    <SelectItem value="5">Class 5 - High Risk Occupations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coverage Options */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-muted-foreground" />
                <span className={TYPOGRAPHY.subSectionHeader}>Coverage Options</span>
              </div>

              <div className="space-y-2">
                <Label className={TYPOGRAPHY.inputLabel}>Disability Definition</Label>
                <Select
                  value={inputs.disabilityDefinition}
                  onValueChange={v => updateInput('disabilityDefinition', v as DisabilityDefinition)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="own-occupation">
                      Own-Occupation (best - unable to do YOUR job)
                    </SelectItem>
                    <SelectItem value="hybrid">
                      Hybrid (own-occ for 2-5 yrs, then any-occ)
                    </SelectItem>
                    <SelectItem value="any-occupation">
                      Any-Occupation (hardest to qualify)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className={TYPOGRAPHY.helperText}>
                  {inputs.disabilityDefinition === 'own-occupation'
                    ? 'Pays if you cannot perform your specific occupation. A surgeon who loses fine motor skills qualifies even if they could teach.'
                    : inputs.disabilityDefinition === 'hybrid'
                    ? 'Own-occupation coverage transitions to any-occupation after 2-5 years. Good balance of coverage and cost.'
                    : 'Must be unable to perform ANY job for which you are reasonably suited. Hard to qualify.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Elimination Period</Label>
                  <Select
                    value={inputs.eliminationPeriod.toString()}
                    onValueChange={v => updateInput('eliminationPeriod', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days (standard)</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">365 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={TYPOGRAPHY.helperText}>Waiting period before benefits start</p>
                </div>

                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Benefit Period</Label>
                  <Select
                    value={inputs.benefitPeriod.toString()}
                    onValueChange={v => updateInput('benefitPeriod', parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2">2 years</SelectItem>
                      <SelectItem value="5">5 years</SelectItem>
                      <SelectItem value="10">10 years</SelectItem>
                      <SelectItem value="67">To age 65/67 (recommended)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className={TYPOGRAPHY.helperText}>How long benefits are paid</p>
                </div>
              </div>
            </div>

            {/* Financial Context */}
            <div className="space-y-4 pt-4 border-t">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className={TYPOGRAPHY.subSectionHeader}>Financial Context</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="currentSavings" className={TYPOGRAPHY.inputLabel}>Current Savings</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="currentSavings"
                      type="number"
                      value={inputs.currentSavings}
                      onChange={e => updateInput('currentSavings', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses" className={TYPOGRAPHY.inputLabel}>Monthly Expenses</Label>
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Estimate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-5 w-5" />
              Premium Estimate
            </CardTitle>
            <CardDescription>
              For {fmtFull(coverageAnalysis.individualMonthlyBenefit)}/month benefit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Premium Summary */}
            <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 border border-emerald-200 dark:border-emerald-800">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className={TYPOGRAPHY.metricLabel}>Annual Premium</p>
                  <p className={`${TYPOGRAPHY.metricLarge} text-emerald-700 dark:text-emerald-300`}>
                    {fmtFull(premiumEstimate.annualPremium)}
                  </p>
                  <p className={TYPOGRAPHY.helperText}>
                    {fmtFull(premiumEstimate.monthlyPremium)}/month
                  </p>
                </div>
                <div>
                  <p className={TYPOGRAPHY.metricLabel}>% of Income</p>
                  <p className={`${TYPOGRAPHY.metricLarge} text-emerald-700 dark:text-emerald-300`}>
                    {premiumEstimate.premiumAsPercentOfIncome.toFixed(1)}%
                  </p>
                  <p className={TYPOGRAPHY.helperText}>
                    {premiumEstimate.premiumAsPercentOfIncome <= 3
                      ? 'Within recommended range'
                      : 'Above typical 1-3% range'}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-emerald-200 dark:border-emerald-700">
                <p className={`${TYPOGRAPHY.body} text-emerald-800 dark:text-emerald-200`}>
                  <strong>1-3% of income to protect 100% of income.</strong>
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  That is {fmtFull(coverageAnalysis.individualCoverageNeeded)}/year in coverage for{' '}
                  {fmtFull(premiumEstimate.annualPremium)}/year in premiums.
                </p>
              </div>
            </div>

            {/* Price Factors */}
            <div className="space-y-3">
              <p className={TYPOGRAPHY.subSectionHeader}>What Affects Your Premium</p>
              {premiumEstimate.factors.map((factor, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-2">
                    {factor.impact === 'increases' ? (
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                    ) : factor.impact === 'decreases' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <Info className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={TYPOGRAPHY.body}>{factor.label}</span>
                  </div>
                  <span className={TYPOGRAPHY.helperText}>{factor.detail}</span>
                </div>
              ))}
            </div>

            <p className={TYPOGRAPHY.helperText}>
              Note: This is an estimate. Actual premiums depend on carrier, underwriting, and policy details.
              Individual policies are typically 20-40% more expensive than group rates but offer better coverage.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Types of Policies & Alternative Coverage */}
      <Accordion type="multiple" defaultValue={['types', 'alternatives', 'when-to-drop']}>
        <AccordionItem value="types">
          <AccordionTrigger className={TYPOGRAPHY.sectionHeader}>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Types of Disability Policies
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
              {/* Short-Term */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    Short-Term Disability (STD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Coverage: 3-6 months</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Waiting period: 0-14 days</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Usually employer-provided</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Covers recovery from surgery, pregnancy, injuries</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />60-70% of salary typical</li>
                  </ul>
                  <div className="mt-3 p-2 rounded bg-blue-50 dark:bg-blue-950/30">
                    <p className={`${TYPOGRAPHY.helperText} text-blue-700 dark:text-blue-300`}>
                      Good to have but not critical - your emergency fund can cover this period.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Long-Term */}
              <Card className="border-emerald-200 dark:border-emerald-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    Long-Term Disability (LTD)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Coverage: 2 years to age 65/67</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Waiting period: 90-180 days</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />This is the critical coverage</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />Protects against catastrophic disability</li>
                    <li><ChevronRight className="h-3 w-3 inline mr-1" />60-70% of salary typical</li>
                  </ul>
                  <div className="mt-3 p-2 rounded bg-emerald-50 dark:bg-emerald-950/30">
                    <p className={`${TYPOGRAPHY.helperText} text-emerald-700 dark:text-emerald-300`}>
                      <strong>CRITICAL:</strong> This protects against the disabilities that ruin retirement plans.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Own-Occupation vs Any-Occupation */}
              <Card className="md:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">The Definition of Disability Matters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className={`${TYPOGRAPHY.body} font-semibold text-emerald-800 dark:text-emerald-200`}>
                          Own-Occupation
                        </span>
                      </div>
                      <p className={`${TYPOGRAPHY.bodyMuted} mb-2`}>
                        "Unable to perform the duties of YOUR specific occupation."
                      </p>
                      <p className={TYPOGRAPHY.helperText}>
                        <strong>Example:</strong> A surgeon who loses fine motor skills qualifies,
                        even if they could work as a medical consultant.
                      </p>
                      <Badge className="mt-2 bg-emerald-100 text-emerald-800">Best Coverage</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-5 w-5 text-blue-600" />
                        <span className={`${TYPOGRAPHY.body} font-semibold text-blue-800 dark:text-blue-200`}>
                          Hybrid/Modified Own-Occ
                        </span>
                      </div>
                      <p className={`${TYPOGRAPHY.bodyMuted} mb-2`}>
                        "Own-occupation for first 2-5 years, then transitions to any-occupation."
                      </p>
                      <p className={TYPOGRAPHY.helperText}>
                        <strong>Good balance:</strong> Covers most disabilities while keeping premiums
                        lower than pure own-occupation.
                      </p>
                      <Badge className="mt-2 bg-blue-100 text-blue-800">Good Value</Badge>
                    </div>

                    <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <span className={`${TYPOGRAPHY.body} font-semibold text-amber-800 dark:text-amber-200`}>
                          Any-Occupation
                        </span>
                      </div>
                      <p className={`${TYPOGRAPHY.bodyMuted} mb-2`}>
                        "Unable to perform ANY job for which you are reasonably suited."
                      </p>
                      <p className={TYPOGRAPHY.helperText}>
                        <strong>Warning:</strong> Very hard to qualify. The surgeon example would be
                        denied because they could "reasonably" work another job.
                      </p>
                      <Badge className="mt-2 bg-amber-100 text-amber-800">Buyer Beware</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="alternatives">
          <AccordionTrigger className={TYPOGRAPHY.sectionHeader}>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alternative Coverage Sources
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* SSDI */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Social Security Disability (SSDI)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>68% of initial claims denied</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Average wait: 3-6 months (can be 2+ years with appeals)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Avg benefit only ~$1,500/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Strict "any occupation" definition</span>
                    </li>
                  </ul>
                  <div className="mt-3 p-2 rounded bg-red-50 dark:bg-red-950/30">
                    <p className={`${TYPOGRAPHY.helperText} text-red-700 dark:text-red-300`}>
                      <strong>Do not rely on this.</strong> Consider it a backup, not primary coverage.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Workers' Comp */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Workers' Compensation
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Covers work-related injuries/illness</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Only covers ~5% of disabilities</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Most disabilities are NOT work-related</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span>Heart disease? Cancer? Mental health? Not covered.</span>
                    </li>
                  </ul>
                  <div className="mt-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30">
                    <p className={`${TYPOGRAPHY.helperText} text-amber-700 dark:text-amber-300`}>
                      Only relevant if you have a high-risk physical job.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Emergency Fund */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Emergency Fund Runway
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>Covers elimination period</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>3-6 months = bridges to LTD benefits</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span>Not a substitute for insurance</span>
                    </li>
                  </ul>
                  <div className="mt-3 p-3 rounded bg-blue-50 dark:bg-blue-950/30">
                    <p className={TYPOGRAPHY.metricLabel}>Your Runway</p>
                    <p className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                      {disabilityImpact.monthsUntilSavingsDepleted.toFixed(0)} months
                    </p>
                    <p className={`${TYPOGRAPHY.helperText} mt-1`}>
                      {disabilityImpact.monthsUntilSavingsDepleted >= 6
                        ? 'Enough to cover a 90-180 day elimination period'
                        : 'Consider building this up to 6+ months'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="when-to-drop">
          <AccordionTrigger className={TYPOGRAPHY.sectionHeader}>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              When to Drop Disability Coverage
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="pt-4 space-y-4">
              <Card className={isFinanciallyIndependent
                ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-muted'
              }>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-full ${
                      isFinanciallyIndependent
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-muted'
                    }`}>
                      <Award className={`h-8 w-8 ${
                        isFinanciallyIndependent
                          ? 'text-emerald-600'
                          : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <h3 className={`${TYPOGRAPHY.sectionHeader} mb-2`}>
                        Once You Reach Financial Independence, You Do Not Need It
                      </h3>
                      <p className={TYPOGRAPHY.body}>
                        When your wealth can sustain your lifestyle indefinitely, you become
                        <strong> self-insured</strong>. Your portfolio replaces the need for
                        disability insurance because you no longer depend on earned income.
                      </p>

                      <div className="mt-4 p-4 rounded-lg bg-white/50 dark:bg-black/20 border">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className={TYPOGRAPHY.metricLabel}>Your FI Number</p>
                            <p className={`${TYPOGRAPHY.metricMedium} ${
                              isFinanciallyIndependent ? 'text-emerald-600' : 'text-foreground'
                            }`}>
                              {fmtFull(annualExpenses * 25)}
                            </p>
                            <p className={TYPOGRAPHY.helperText}>25x annual expenses</p>
                          </div>
                          <div>
                            <p className={TYPOGRAPHY.metricLabel}>Your Current Savings</p>
                            <p className={TYPOGRAPHY.metricMedium}>{fmtFull(inputs.currentSavings)}</p>
                            <p className={TYPOGRAPHY.helperText}>
                              {savingsToExpenseRatio.toFixed(1)}x expenses
                            </p>
                          </div>
                        </div>

                        {isFinanciallyIndependent ? (
                          <div className="mt-4 p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                            <div className="flex items-center gap-2">
                              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                              <span className={`${TYPOGRAPHY.body} text-emerald-800 dark:text-emerald-200`}>
                                You are financially independent! Disability insurance is optional.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="mt-4">
                            <p className={TYPOGRAPHY.metricLabel}>Progress to FI</p>
                            <Progress
                              value={(savingsToExpenseRatio / 25) * 100}
                              className="h-3 mt-2"
                            />
                            <p className={`${TYPOGRAPHY.helperText} mt-1`}>
                              {((savingsToExpenseRatio / 25) * 100).toFixed(0)}% of the way there.
                              Keep disability insurance until you reach FI.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-emerald-700 dark:text-emerald-300">
                      Signs You Can Drop Coverage
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Net worth exceeds 25x annual expenses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Investment income covers living expenses</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>You could retire tomorrow if needed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span>Approaching age 60+ (policies often end at 65)</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg text-amber-700 dark:text-amber-300">
                      Signs You Still Need It
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className={`${TYPOGRAPHY.bodyMuted} space-y-2`}>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>Depend on earned income to pay bills</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>Have a mortgage or significant debt</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>Supporting dependents (kids, aging parents)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <span>Have not reached your FI number yet</span>
                      </li>
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Bottom Line */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h3 className={`${TYPOGRAPHY.sectionHeader} text-blue-800 dark:text-blue-200 mb-2`}>
                The Bottom Line: Protect the Golden Goose
              </h3>
              <p className={`${TYPOGRAPHY.body} text-blue-900 dark:text-blue-100`}>
                Your ability to earn income is worth <strong>{fmt(inputs.annualIncome * yearsToRetirement)}</strong> over
                your remaining career. You insure your car ({fmt(30000)}), your home ({fmt(400000)}), but not the asset
                that pays for everything else?
              </p>
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className={TYPOGRAPHY.metricLabel}>Recommended Coverage</p>
                  <p className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                    {fmtFull(coverageAnalysis.individualMonthlyBenefit)}/mo
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className={TYPOGRAPHY.metricLabel}>Estimated Premium</p>
                  <p className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                    {fmtFull(premiumEstimate.monthlyPremium)}/mo
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-white/50 dark:bg-black/20">
                  <p className={TYPOGRAPHY.metricLabel}>ROI</p>
                  <p className={`${TYPOGRAPHY.metricSmall} text-blue-700 dark:text-blue-300`}>
                    {(coverageAnalysis.individualMonthlyBenefit / premiumEstimate.monthlyPremium).toFixed(0)}x
                  </p>
                  <p className={TYPOGRAPHY.helperText}>benefit per premium dollar</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This calculator provides educational estimates only. Actual premiums depend on carrier underwriting,
          policy specifics, and your complete medical history. Consult with a licensed insurance professional
          for personalized quotes and recommendations.
        </p>
      </div>
    </div>
  )
}

export default DisabilityInsurance
