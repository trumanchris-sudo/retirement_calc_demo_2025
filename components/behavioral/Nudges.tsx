'use client'

import * as React from 'react'
import { useState, useMemo, useCallback } from 'react'
import {
  DollarSign,
  TrendingUp,
  Users,
  Target,
  AlertTriangle,
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  ArrowRight,
  Gift,
  PiggyBank,
  Zap,
  Heart,
  Shield,
  Star,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'

// ==================== Types ====================

export interface UserFinancialProfile {
  // Current savings behavior
  currentSavingsRate: number // percentage of income
  monthlyContribution: number
  annualIncome: number

  // Employer match info
  employerMatchPercent: number // e.g., 50% match
  employerMatchLimit: number // up to X% of salary
  currentContributionPercent: number // current 401k contribution %

  // Account balances
  totalBalance: number
  taxableBalance: number
  pretaxBalance: number
  rothBalance: number

  // Demographics for social proof
  age: number
  incomePercentile?: number // 0-100

  // Goals
  retirementAge: number
  retirementGoal: number

  // Tax situation
  marginalTaxRate: number
  stateTaxRate: number

  // Behavioral data
  lastContributionIncrease?: Date
  missedContributions?: number
  consecutiveSavingMonths?: number
}

export interface NudgeAction {
  label: string
  onClick?: () => void
  href?: string
  variant?: 'default' | 'outline' | 'ghost'
}

export interface Nudge {
  id: string
  type: 'employer-match' | 'social-proof' | 'round-number' | 'loss-aversion' | 'future-self' | 'commitment'
  priority: number // 1-10, higher = more important
  title: string
  message: string
  impact?: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  actions?: NudgeAction[]
  dismissed?: boolean
}

export interface NudgesProps {
  profile: UserFinancialProfile
  maxNudges?: number
  onAction?: (nudgeId: string, action: string) => void
  onDismiss?: (nudgeId: string) => void
  className?: string
}

export interface CommitmentDevice {
  id: string
  type: 'contribution-increase' | 'savings-rate' | 'milestone' | 'deadline'
  title: string
  targetValue: number
  currentValue: number
  deadline: Date
  commitmentDate: Date
  status: 'active' | 'completed' | 'failed' | 'pending'
}

export interface CommitmentDeviceProps {
  commitments: CommitmentDevice[]
  onCreateCommitment?: (type: CommitmentDevice['type']) => void
  onUpdateCommitment?: (id: string, updates: Partial<CommitmentDevice>) => void
  className?: string
}

// ==================== Utility Functions ====================

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`
  }
  return `$${value.toFixed(0)}`
}

function formatCurrencyFull(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function calculateNextRoundNumber(value: number): { target: number; remaining: number } {
  const thresholds = [10000, 25000, 50000, 75000, 100000, 150000, 200000, 250000,
                      300000, 400000, 500000, 750000, 1000000, 1500000, 2000000]

  for (const threshold of thresholds) {
    if (value < threshold) {
      return { target: threshold, remaining: threshold - value }
    }
  }

  // For values over 2M, round to next 500K
  const nextTarget = Math.ceil(value / 500000) * 500000
  return { target: nextTarget, remaining: nextTarget - value }
}

function getAgeBasedSavingsRate(age: number): { average: number; recommended: number } {
  // Based on behavioral research and industry benchmarks
  if (age < 30) return { average: 8, recommended: 15 }
  if (age < 40) return { average: 10, recommended: 18 }
  if (age < 50) return { average: 12, recommended: 20 }
  if (age < 60) return { average: 14, recommended: 22 }
  return { average: 16, recommended: 25 }
}

function calculateFutureValue(
  presentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
): number {
  const monthlyRate = annualReturn / 12
  const months = years * 12

  // Future value of lump sum
  const fvLumpSum = presentValue * Math.pow(1 + annualReturn, years)

  // Future value of annuity (monthly contributions)
  const fvAnnuity = monthlyContribution *
    ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate) *
    (1 + monthlyRate)

  return fvLumpSum + fvAnnuity
}

// ==================== Nudge Generation ====================

function generateEmployerMatchNudge(profile: UserFinancialProfile): Nudge | null {
  const { employerMatchPercent, employerMatchLimit, currentContributionPercent, annualIncome } = profile

  if (!employerMatchPercent || !employerMatchLimit) return null

  // Calculate how much match they're leaving on the table
  const maxMatchableContribution = annualIncome * (employerMatchLimit / 100)
  const currentContribution = annualIncome * (currentContributionPercent / 100)
  const currentMatch = Math.min(currentContribution, maxMatchableContribution) * (employerMatchPercent / 100)
  const maxMatch = maxMatchableContribution * (employerMatchPercent / 100)
  const missedMatch = maxMatch - currentMatch

  if (missedMatch <= 0) return null

  // Calculate 30-year compound impact (assuming 7% returns)
  const yearsToRetirement = Math.max(profile.retirementAge - profile.age, 1)
  const compoundedLoss = missedMatch * Math.pow(1.07, yearsToRetirement)

  return {
    id: 'employer-match',
    type: 'employer-match',
    priority: 10, // Highest priority - free money!
    title: "You're leaving money on the table",
    message: `Your employer offers a ${employerMatchPercent}% match up to ${employerMatchLimit}% of your salary. By not contributing enough, you're missing out on ${formatCurrencyFull(missedMatch)} in FREE money every year.`,
    impact: `Over ${yearsToRetirement} years, this could grow to ${formatCurrencyFull(compoundedLoss)} with compound growth.`,
    icon: Gift,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/30',
    borderColor: 'border-red-200 dark:border-red-800',
    actions: [
      { label: `Increase to ${employerMatchLimit}%`, variant: 'default' },
      { label: 'Learn more', variant: 'outline' },
    ],
  }
}

function generateSocialProofNudge(profile: UserFinancialProfile): Nudge | null {
  const { age, currentSavingsRate, incomePercentile } = profile
  const { average, recommended } = getAgeBasedSavingsRate(age)

  // Only show if they're below average
  if (currentSavingsRate >= average) {
    // Positive reinforcement if above average
    if (currentSavingsRate >= recommended) {
      return {
        id: 'social-proof-positive',
        type: 'social-proof',
        priority: 3,
        title: "You're a savings superstar!",
        message: `You're saving ${currentSavingsRate.toFixed(0)}% of your income, putting you ahead of ${Math.min(90, 50 + (currentSavingsRate - average) * 3).toFixed(0)}% of people your age.`,
        icon: Star,
        color: 'text-green-600 dark:text-green-400',
        bgColor: 'bg-green-50 dark:bg-green-950/30',
        borderColor: 'border-green-200 dark:border-green-800',
      }
    }
    return null
  }

  const percentileBehind = Math.min(70, (average - currentSavingsRate) * 5)

  return {
    id: 'social-proof',
    type: 'social-proof',
    priority: 7,
    title: 'People like you save more',
    message: `People your age with similar incomes save an average of ${average}% of their income. You're currently at ${currentSavingsRate.toFixed(0)}%.`,
    impact: `Increasing to ${average}% would put you ahead of ${(50 + percentileBehind).toFixed(0)}% of your peers.`,
    icon: Users,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    actions: [
      { label: `Match the average (${average}%)`, variant: 'default' },
      { label: `Go above average (${recommended}%)`, variant: 'outline' },
    ],
  }
}

function generateRoundNumberNudge(profile: UserFinancialProfile): Nudge | null {
  const { totalBalance, monthlyContribution } = profile
  const { target, remaining } = calculateNextRoundNumber(totalBalance)

  // Only show if they're close (within 15% of the milestone)
  const percentToTarget = (remaining / target) * 100
  if (percentToTarget > 15) return null

  // Calculate months to reach milestone
  const monthsToMilestone = remaining / (monthlyContribution + (totalBalance * 0.07 / 12))

  return {
    id: 'round-number',
    type: 'round-number',
    priority: 6,
    title: `You're so close to ${formatCurrency(target)}!`,
    message: `You're only ${formatCurrencyFull(remaining)} away from hitting ${formatCurrency(target)}. At your current pace, you'll reach this milestone in about ${Math.ceil(monthsToMilestone)} months.`,
    impact: percentToTarget < 5
      ? "You're in the home stretch! A small extra contribution could get you there this month."
      : `Every extra dollar brings you closer to this exciting milestone.`,
    icon: Target,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    actions: [
      { label: `Add ${formatCurrency(Math.min(remaining, 500))} now`, variant: 'default' },
      { label: 'Set milestone reminder', variant: 'outline' },
    ],
  }
}

function generateLossAversionNudge(profile: UserFinancialProfile): Nudge | null {
  const { marginalTaxRate, stateTaxRate, pretaxBalance, rothBalance, age } = profile

  // Multiple tax optimization opportunities
  const nudges: Array<{ priority: number; content: Omit<Nudge, 'id' | 'type' | 'priority'> }> = []

  // 1. Roth conversion opportunity in lower income years
  if (marginalTaxRate < 24 && pretaxBalance > 100000 && age >= 55) {
    const conversionAmount = Math.min(pretaxBalance, 50000)
    const taxNow = conversionAmount * (marginalTaxRate / 100)
    const taxLater = conversionAmount * 0.32 // Assuming higher bracket later
    const savings = taxLater - taxNow

    nudges.push({
      priority: 8,
      content: {
        title: 'Tax savings slipping away',
        message: `You're in a lower tax bracket now (${marginalTaxRate}%). Converting ${formatCurrencyFull(conversionAmount)} to Roth could save you ${formatCurrencyFull(savings)} in future taxes.`,
        impact: `If tax rates rise or you move to a higher bracket, this opportunity disappears forever.`,
        icon: AlertTriangle,
        color: 'text-amber-600 dark:text-amber-400',
        bgColor: 'bg-amber-50 dark:bg-amber-950/30',
        borderColor: 'border-amber-200 dark:border-amber-800',
        actions: [
          { label: 'Explore Roth conversion', variant: 'default' },
          { label: 'Calculate my savings', variant: 'outline' },
        ],
      },
    })
  }

  // 2. State tax efficiency
  if (stateTaxRate > 5 && pretaxBalance > rothBalance) {
    const potentialStateTax = pretaxBalance * (stateTaxRate / 100)

    nudges.push({
      priority: 5,
      content: {
        title: 'State taxes could eat your retirement',
        message: `Living in a high-tax state means ${formatCurrencyFull(potentialStateTax)} of your pre-tax savings could go to state taxes in retirement.`,
        impact: 'Consider tax-efficient withdrawal strategies or relocating in retirement.',
        icon: Shield,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30',
        borderColor: 'border-orange-200 dark:border-orange-800',
        actions: [
          { label: 'Review tax strategy', variant: 'default' },
        ],
      },
    })
  }

  // 3. RMD warning for heavy pre-tax
  if (pretaxBalance > 500000 && age >= 50) {
    const rmdAge = 73
    const yearsToRMD = rmdAge - age
    const projectedBalance = pretaxBalance * Math.pow(1.07, yearsToRMD)
    const estimatedFirstRMD = projectedBalance / 26.5 // Approximate RMD divisor

    nudges.push({
      priority: 6,
      content: {
        title: 'RMD tax bomb ahead',
        message: `Your pre-tax balance could grow to ${formatCurrency(projectedBalance)} by age ${rmdAge}. That means forced withdrawals of ${formatCurrencyFull(estimatedFirstRMD)}+ per year.`,
        impact: 'Large RMDs can push you into higher tax brackets and increase Medicare premiums.',
        icon: Zap,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-950/30',
        borderColor: 'border-red-200 dark:border-red-800',
        actions: [
          { label: 'Plan RMD strategy', variant: 'default' },
          { label: 'Start Roth conversions', variant: 'outline' },
        ],
      },
    })
  }

  if (nudges.length === 0) return null

  // Return highest priority nudge
  const bestNudge = nudges.sort((a, b) => b.priority - a.priority)[0]

  return {
    id: 'loss-aversion',
    type: 'loss-aversion',
    priority: bestNudge.priority,
    ...bestNudge.content,
  }
}

function generateFutureSelfNudge(profile: UserFinancialProfile): Nudge | null {
  const { age, retirementAge, totalBalance, monthlyContribution, retirementGoal, annualIncome } = profile
  const yearsToRetirement = retirementAge - age

  if (yearsToRetirement <= 0) return null

  // Calculate projected retirement wealth
  const projectedWealth = calculateFutureValue(totalBalance, monthlyContribution, 0.07, yearsToRetirement)
  const monthlyRetirementIncome = (projectedWealth * 0.04) / 12
  const currentMonthlyIncome = annualIncome / 12
  const incomeReplacement = (monthlyRetirementIncome / currentMonthlyIncome) * 100

  // Calculate what an extra $100/month would add
  const extraContribution = 100
  const projectedWithExtra = calculateFutureValue(totalBalance, monthlyContribution + extraContribution, 0.07, yearsToRetirement)
  const additionalWealth = projectedWithExtra - projectedWealth
  const additionalMonthlyIncome = (additionalWealth * 0.04) / 12

  // Calculate age-specific messaging
  const futureAge = retirementAge
  const futureYear = new Date().getFullYear() + yearsToRetirement

  return {
    id: 'future-self',
    type: 'future-self',
    priority: 7,
    title: `Meet your ${futureAge}-year-old self`,
    message: `In ${futureYear}, you'll be ${futureAge}. Your current savings path provides ${formatCurrencyFull(monthlyRetirementIncome)}/month in retirement income (${incomeReplacement.toFixed(0)}% of your current income).`,
    impact: `Adding just ${formatCurrencyFull(extraContribution)}/month now gives your future self an extra ${formatCurrencyFull(additionalMonthlyIncome)}/month forever - that's ${formatCurrencyFull(additionalWealth)} more in retirement wealth.`,
    icon: Heart,
    color: 'text-pink-600 dark:text-pink-400',
    bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    borderColor: 'border-pink-200 dark:border-pink-800',
    actions: [
      { label: `Help future me (+$${extraContribution}/mo)`, variant: 'default' },
      { label: 'Write a letter to future self', variant: 'outline' },
    ],
  }
}

function generateCommitmentNudge(profile: UserFinancialProfile): Nudge | null {
  const { lastContributionIncrease, currentSavingsRate, consecutiveSavingMonths } = profile

  // Check if it's been a while since last increase
  const monthsSinceIncrease = lastContributionIncrease
    ? Math.floor((Date.now() - lastContributionIncrease.getTime()) / (1000 * 60 * 60 * 24 * 30))
    : 24

  // Streak celebration
  if (consecutiveSavingMonths && consecutiveSavingMonths >= 6) {
    return {
      id: 'commitment-streak',
      type: 'commitment',
      priority: 4,
      title: `${consecutiveSavingMonths} months strong!`,
      message: `You've contributed consistently for ${consecutiveSavingMonths} months straight. This discipline is the foundation of wealth building.`,
      impact: 'Keep the momentum! Consider locking in an automatic 1% increase each year.',
      icon: Sparkles,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
      borderColor: 'border-emerald-200 dark:border-emerald-800',
      actions: [
        { label: 'Set auto-escalation', variant: 'default' },
        { label: 'Share my streak', variant: 'outline' },
      ],
    }
  }

  // Time for an increase
  if (monthsSinceIncrease >= 12 && currentSavingsRate < 20) {
    return {
      id: 'commitment-increase',
      type: 'commitment',
      priority: 5,
      title: 'Time to level up your savings',
      message: `It's been ${monthsSinceIncrease} months since your last contribution increase. Your income has likely grown, but your savings rate hasn't kept pace.`,
      impact: 'Commit to a 1% increase now. Most people don\'t notice the difference in their paycheck.',
      icon: TrendingUp,
      color: 'text-indigo-600 dark:text-indigo-400',
      bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
      borderColor: 'border-indigo-200 dark:border-indigo-800',
      actions: [
        { label: 'Increase by 1%', variant: 'default' },
        { label: 'Schedule for next raise', variant: 'outline' },
      ],
    }
  }

  return null
}

// ==================== Components ====================

/**
 * Individual nudge card with behavioral finance messaging
 */
function NudgeCard({
  nudge,
  onAction,
  onDismiss,
}: {
  nudge: Nudge
  onAction?: (action: string) => void
  onDismiss?: () => void
}) {
  const Icon = nudge.icon

  return (
    <Card className={cn(
      'relative overflow-hidden transition-all duration-200 hover:shadow-md',
      nudge.borderColor,
      nudge.bgColor,
      'border-2'
    )}>
      {/* Priority indicator */}
      {nudge.priority >= 8 && (
        <div className="absolute top-0 right-0">
          <Badge
            variant="destructive"
            className="rounded-none rounded-bl-lg text-xs font-bold"
          >
            High Priority
          </Badge>
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <div className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            nudge.bgColor,
            'ring-2 ring-white dark:ring-gray-900'
          )}>
            <Icon className={cn('h-5 w-5', nudge.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold leading-tight">
              {nudge.title}
            </CardTitle>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-50 hover:opacity-100"
              onClick={onDismiss}
              aria-label="Dismiss nudge"
            >
              <span className="sr-only">Dismiss</span>
              <span aria-hidden="true">&times;</span>
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {nudge.message}
        </p>

        {nudge.impact && (
          <div className={cn(
            'flex items-start gap-2 rounded-lg p-3',
            'bg-white/50 dark:bg-gray-900/50'
          )}>
            <Sparkles className={cn('h-4 w-4 mt-0.5 shrink-0', nudge.color)} />
            <p className="text-sm font-medium">
              {nudge.impact}
            </p>
          </div>
        )}

        {nudge.actions && nudge.actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {nudge.actions.map((action, index) => (
              <Button
                key={index}
                variant={action.variant || 'default'}
                size="sm"
                onClick={() => {
                  action.onClick?.()
                  onAction?.(action.label)
                }}
                className={index === 0 ? cn(nudge.color.replace('text-', 'bg-').replace('-600', '-500').replace('-400', '-500'), 'text-white hover:opacity-90') : ''}
              >
                {action.label}
                {index === 0 && <ArrowRight className="h-4 w-4 ml-1" />}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Main Nudges component - generates and displays behavioral finance nudges
 */
export function Nudges({
  profile,
  maxNudges = 3,
  onAction,
  onDismiss,
  className,
}: NudgesProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set())

  // Generate all applicable nudges
  const allNudges = useMemo(() => {
    const nudges: Nudge[] = []

    const employerMatch = generateEmployerMatchNudge(profile)
    if (employerMatch) nudges.push(employerMatch)

    const socialProof = generateSocialProofNudge(profile)
    if (socialProof) nudges.push(socialProof)

    const roundNumber = generateRoundNumberNudge(profile)
    if (roundNumber) nudges.push(roundNumber)

    const lossAversion = generateLossAversionNudge(profile)
    if (lossAversion) nudges.push(lossAversion)

    const futureSelf = generateFutureSelfNudge(profile)
    if (futureSelf) nudges.push(futureSelf)

    const commitment = generateCommitmentNudge(profile)
    if (commitment) nudges.push(commitment)

    // Sort by priority (highest first) and filter dismissed
    return nudges
      .filter(n => !dismissedIds.has(n.id))
      .sort((a, b) => b.priority - a.priority)
  }, [profile, dismissedIds])

  const visibleNudges = allNudges.slice(0, maxNudges)

  const handleDismiss = useCallback((nudgeId: string) => {
    setDismissedIds(prev => new Set([...prev, nudgeId]))
    onDismiss?.(nudgeId)
  }, [onDismiss])

  const handleAction = useCallback((nudgeId: string, action: string) => {
    onAction?.(nudgeId, action)
  }, [onAction])

  if (visibleNudges.length === 0) {
    return null
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-amber-500" />
          Smart Money Moves
        </h3>
        {allNudges.length > maxNudges && (
          <Badge variant="secondary">
            +{allNudges.length - maxNudges} more
          </Badge>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {visibleNudges.map(nudge => (
          <NudgeCard
            key={nudge.id}
            nudge={nudge}
            onAction={(action) => handleAction(nudge.id, action)}
            onDismiss={() => handleDismiss(nudge.id)}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Commitment Device component - helps users set and track financial commitments
 */
export function CommitmentDeviceCard({
  commitments,
  onCreateCommitment,
  onUpdateCommitment,
  className,
}: CommitmentDeviceProps) {
  const activeCommitments = commitments.filter(c => c.status === 'active')
  const completedCommitments = commitments.filter(c => c.status === 'completed')

  return (
    <Card className={cn('', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          My Commitments
        </CardTitle>
        <CardDescription>
          Lock in your intentions and track your progress
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {activeCommitments.length > 0 ? (
          <div className="space-y-3">
            {activeCommitments.map(commitment => {
              const progress = (commitment.currentValue / commitment.targetValue) * 100
              const daysRemaining = Math.ceil(
                (commitment.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )

              return (
                <div
                  key={commitment.id}
                  className="rounded-lg border p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{commitment.title}</span>
                    <Badge variant={daysRemaining < 7 ? 'destructive' : 'secondary'}>
                      <Clock className="h-3 w-3 mr-1" />
                      {daysRemaining} days left
                    </Badge>
                  </div>

                  <Progress value={progress} className="h-2" />

                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>
                      {commitment.type === 'savings-rate' || commitment.type === 'contribution-increase'
                        ? `${commitment.currentValue.toFixed(1)}%`
                        : formatCurrency(commitment.currentValue)}
                    </span>
                    <span>
                      Goal: {commitment.type === 'savings-rate' || commitment.type === 'contribution-increase'
                        ? `${commitment.targetValue.toFixed(1)}%`
                        : formatCurrency(commitment.targetValue)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            <PiggyBank className="h-12 w-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No active commitments yet.</p>
            <p className="text-sm">Set a goal to keep yourself accountable!</p>
          </div>
        )}

        {completedCommitments.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-sm font-medium mb-2 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              Completed ({completedCommitments.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {completedCommitments.slice(0, 3).map(c => (
                <Badge key={c.id} variant="outline" className="text-green-600">
                  {c.title}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {onCreateCommitment && (
          <div className="flex flex-wrap gap-2 pt-4 border-t">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateCommitment('savings-rate')}
            >
              <TrendingUp className="h-4 w-4 mr-1" />
              Savings Goal
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateCommitment('milestone')}
            >
              <Target className="h-4 w-4 mr-1" />
              Balance Milestone
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onCreateCommitment('contribution-increase')}
            >
              <DollarSign className="h-4 w-4 mr-1" />
              Increase Contribution
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

/**
 * Future Self Visualization - detailed projection with personalization
 */
export function FutureSelfVisualization({
  profile,
  className,
}: {
  profile: UserFinancialProfile
  className?: string
}) {
  const yearsToRetirement = profile.retirementAge - profile.age
  const futureYear = new Date().getFullYear() + yearsToRetirement

  // Calculate different scenarios
  const scenarios = useMemo(() => {
    const current = calculateFutureValue(
      profile.totalBalance,
      profile.monthlyContribution,
      0.07,
      yearsToRetirement
    )

    const withExtra100 = calculateFutureValue(
      profile.totalBalance,
      profile.monthlyContribution + 100,
      0.07,
      yearsToRetirement
    )

    const withExtra500 = calculateFutureValue(
      profile.totalBalance,
      profile.monthlyContribution + 500,
      0.07,
      yearsToRetirement
    )

    const withDouble = calculateFutureValue(
      profile.totalBalance,
      profile.monthlyContribution * 2,
      0.07,
      yearsToRetirement
    )

    return {
      current,
      withExtra100,
      withExtra500,
      withDouble,
      currentMonthly: (current * 0.04) / 12,
      extra100Monthly: (withExtra100 * 0.04) / 12,
      extra500Monthly: (withExtra500 * 0.04) / 12,
      doubleMonthly: (withDouble * 0.04) / 12,
    }
  }, [profile, yearsToRetirement])

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30">
        <CardTitle className="flex items-center gap-2">
          <Heart className="h-5 w-5 text-pink-600 dark:text-pink-400" />
          Your Future Self in {futureYear}
        </CardTitle>
        <CardDescription>
          At age {profile.retirementAge}, here&apos;s what your savings could look like
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* Current path */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Path</span>
            <span className="text-lg font-bold">{formatCurrency(scenarios.current)}</span>
          </div>
          <Progress value={100} className="h-3 bg-gray-200 dark:bg-gray-700" />
          <p className="text-sm text-muted-foreground">
            = {formatCurrencyFull(scenarios.currentMonthly)}/month in retirement
          </p>
        </div>

        {/* With extra $100 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              +$100/month
            </span>
            <span className="text-lg font-bold text-green-600 dark:text-green-400">
              {formatCurrency(scenarios.withExtra100)}
            </span>
          </div>
          <Progress
            value={(scenarios.withExtra100 / scenarios.withDouble) * 100}
            className="h-3 bg-gray-200 dark:bg-gray-700 [&>div]:bg-green-500"
          />
          <p className="text-sm text-muted-foreground">
            = {formatCurrencyFull(scenarios.extra100Monthly)}/month
            <span className="text-green-600 dark:text-green-400 font-medium">
              {' '}(+{formatCurrencyFull(scenarios.extra100Monthly - scenarios.currentMonthly)})
            </span>
          </p>
        </div>

        {/* With extra $500 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
              +$500/month
            </span>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {formatCurrency(scenarios.withExtra500)}
            </span>
          </div>
          <Progress
            value={(scenarios.withExtra500 / scenarios.withDouble) * 100}
            className="h-3 bg-gray-200 dark:bg-gray-700 [&>div]:bg-blue-500"
          />
          <p className="text-sm text-muted-foreground">
            = {formatCurrencyFull(scenarios.extra500Monthly)}/month
            <span className="text-blue-600 dark:text-blue-400 font-medium">
              {' '}(+{formatCurrencyFull(scenarios.extra500Monthly - scenarios.currentMonthly)})
            </span>
          </p>
        </div>

        {/* Motivational message */}
        <div className="rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 p-4 border border-amber-200 dark:border-amber-800">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Small changes today create big differences for your future self.
            What will you do for the person you&apos;ll become?
          </p>
        </div>

        <div className="flex gap-2">
          <Button className="flex-1 bg-pink-600 hover:bg-pink-700">
            <Heart className="h-4 w-4 mr-2" />
            Help My Future Self
          </Button>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Write a Letter
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Round Number Progress - gamified milestone tracking
 */
export function RoundNumberProgress({
  currentBalance,
  className,
}: {
  currentBalance: number
  className?: string
}) {
  const { target, remaining } = calculateNextRoundNumber(currentBalance)
  const progress = ((target - remaining) / target) * 100

  // Celebratory colors based on how close they are
  const isAlmostThere = remaining / target < 0.05
  const isClose = remaining / target < 0.15

  return (
    <Card className={cn(
      'overflow-hidden transition-all',
      isAlmostThere && 'ring-2 ring-purple-400 dark:ring-purple-600',
      className
    )}>
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className={cn(
              'text-4xl font-bold',
              isAlmostThere ? 'text-purple-600 dark:text-purple-400 animate-pulse' : ''
            )}>
              {formatCurrency(target)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isAlmostThere
                ? "You're so close!"
                : isClose
                  ? "Almost there!"
                  : "Your next milestone"}
            </p>
          </div>

          <div className="relative pt-1">
            <Progress
              value={progress}
              className={cn(
                'h-4',
                isAlmostThere && '[&>div]:bg-purple-500'
              )}
            />
            <div className="flex justify-between mt-2 text-sm">
              <span>{formatCurrency(currentBalance)}</span>
              <span className="font-medium text-purple-600 dark:text-purple-400">
                {formatCurrency(remaining)} to go
              </span>
            </div>
          </div>

          {isAlmostThere && (
            <div className="flex items-center justify-center gap-2 text-purple-600 dark:text-purple-400">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">One more push!</span>
              <Sparkles className="h-4 w-4" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default Nudges
