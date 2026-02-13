'use client'

import React, { useMemo, useState, useEffect } from 'react'
import {
  Shield,
  TrendingUp,
  TrendingDown,
  Minus,
  PiggyBank,
  CreditCard,
  Umbrella,
  Heart,
  Trophy,
  Star,
  ChevronRight,
  Sparkles,
  Target,
  Award,
  Users,
  ArrowUp,
  ArrowDown,
  Info,
  CheckCircle2,
  AlertCircle,
  Zap,
  Crown,
  Medal,
  Flame,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

// ==================== Types ====================

export interface FinancialData {
  // Emergency Fund
  emergencyFund: number
  monthlyExpenses: number

  // Debt
  totalDebt: number
  monthlyDebtPayment: number
  monthlyIncome: number
  highInterestDebt: number // Debt above 10% APR

  // Savings & Investment
  savingsRate: number // Percentage of income saved
  retirementBalance: number
  targetRetirementBalance: number
  monthlyRetirementContribution: number

  // Insurance
  hasHealthInsurance: boolean
  hasLifeInsurance: boolean
  hasDisabilityInsurance: boolean
  hasUmbrellaInsurance: boolean
  dependents: number

  // Personal Info (for age group comparison)
  age: number

  // Historical scores for trend
  historicalScores?: { date: string; score: number }[]
}

export interface ComponentScore {
  name: string
  score: number
  maxScore: number
  status: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  icon: React.ComponentType<{ className?: string }>
  description: string
  recommendations: string[]
  weight: number
}

export interface LevelInfo {
  level: number
  title: string
  minScore: number
  maxScore: number
  icon: React.ComponentType<{ className?: string }>
  color: string
  bgColor: string
  borderColor: string
  description: string
}

export interface AgeGroupComparison {
  ageGroup: string
  averageScore: number
  percentile: number
  betterThan: number // Percentage of peers doing worse
}

export interface FinancialHealthScoreProps {
  data: FinancialData
  onRecommendationClick?: (recommendation: string, category: string) => void
  className?: string
  compact?: boolean
}

// ==================== Constants ====================

const LEVELS: LevelInfo[] = [
  {
    level: 1,
    title: 'Beginner',
    minScore: 0,
    maxScore: 19,
    icon: Medal,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-600',
    description: 'Starting your financial journey',
  },
  {
    level: 2,
    title: 'Apprentice',
    minScore: 20,
    maxScore: 39,
    icon: Star,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-900/20',
    borderColor: 'border-amber-300 dark:border-amber-700',
    description: 'Building financial foundations',
  },
  {
    level: 3,
    title: 'Achiever',
    minScore: 40,
    maxScore: 59,
    icon: Award,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
    description: 'Making solid progress',
  },
  {
    level: 4,
    title: 'Expert',
    minScore: 60,
    maxScore: 79,
    icon: Trophy,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
    description: 'Strong financial health',
  },
  {
    level: 5,
    title: 'Master',
    minScore: 80,
    maxScore: 89,
    icon: Crown,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-900/20',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    description: 'Excellent financial wellness',
  },
  {
    level: 6,
    title: 'Legend',
    minScore: 90,
    maxScore: 100,
    icon: Flame,
    color: 'text-orange-500',
    bgColor: 'bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
    borderColor: 'border-orange-400 dark:border-orange-600',
    description: 'Financial freedom achieved',
  },
]

// Age group benchmark data (national averages, simplified)
const AGE_GROUP_BENCHMARKS: Record<string, { avgScore: number; distribution: number[] }> = {
  '18-24': { avgScore: 35, distribution: [15, 25, 30, 20, 8, 2] },
  '25-34': { avgScore: 45, distribution: [10, 20, 30, 25, 12, 3] },
  '35-44': { avgScore: 52, distribution: [8, 15, 27, 30, 15, 5] },
  '45-54': { avgScore: 58, distribution: [6, 12, 25, 32, 18, 7] },
  '55-64': { avgScore: 62, distribution: [5, 10, 22, 33, 22, 8] },
  '65+': { avgScore: 65, distribution: [5, 8, 20, 32, 25, 10] },
}

// ==================== Utility Functions ====================

function getAgeGroup(age: number): string {
  if (age < 25) return '18-24'
  if (age < 35) return '25-34'
  if (age < 45) return '35-44'
  if (age < 55) return '45-54'
  if (age < 65) return '55-64'
  return '65+'
}

function getStatus(score: number, max: number): ComponentScore['status'] {
  const percentage = (score / max) * 100
  if (percentage >= 90) return 'excellent'
  if (percentage >= 70) return 'good'
  if (percentage >= 50) return 'fair'
  if (percentage >= 30) return 'poor'
  return 'critical'
}

function getStatusColor(status: ComponentScore['status']): string {
  switch (status) {
    case 'excellent': return 'text-emerald-500'
    case 'good': return 'text-blue-500'
    case 'fair': return 'text-amber-500'
    case 'poor': return 'text-orange-500'
    case 'critical': return 'text-red-500'
  }
}

function getStatusBgColor(status: ComponentScore['status']): string {
  switch (status) {
    case 'excellent': return 'bg-emerald-100 dark:bg-emerald-900/30'
    case 'good': return 'bg-blue-100 dark:bg-blue-900/30'
    case 'fair': return 'bg-amber-100 dark:bg-amber-900/30'
    case 'poor': return 'bg-orange-100 dark:bg-orange-900/30'
    case 'critical': return 'bg-red-100 dark:bg-red-900/30'
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return 'text-emerald-500'
  if (score >= 60) return 'text-blue-500'
  if (score >= 40) return 'text-amber-500'
  if (score >= 20) return 'text-orange-500'
  return 'text-red-500'
}

function getScoreGradient(score: number): string {
  if (score >= 80) return 'from-emerald-500 to-emerald-600'
  if (score >= 60) return 'from-blue-500 to-blue-600'
  if (score >= 40) return 'from-amber-500 to-amber-600'
  if (score >= 20) return 'from-orange-500 to-orange-600'
  return 'from-red-500 to-red-600'
}

function getLevelForScore(score: number): LevelInfo {
  return LEVELS.find(l => score >= l.minScore && score <= l.maxScore) || LEVELS[0]
}

function getPointsToNextLevel(score: number): number {
  const currentLevel = getLevelForScore(score)
  const nextLevel = LEVELS.find(l => l.minScore > currentLevel.maxScore)
  if (!nextLevel) return 0
  return nextLevel.minScore - score
}

// ==================== Calculation Functions ====================

function calculateEmergencyFundScore(data: FinancialData): ComponentScore {
  const monthsCovered = data.monthlyExpenses > 0
    ? data.emergencyFund / data.monthlyExpenses
    : 0

  // Score: 0-25 points based on months covered (target: 6 months = full points)
  const score = Math.min(25, Math.round((monthsCovered / 6) * 25))

  const recommendations: string[] = []
  if (monthsCovered < 1) {
    recommendations.push('Start with $1,000 emergency fund as first goal')
    recommendations.push('Automate weekly transfers to savings account')
  } else if (monthsCovered < 3) {
    recommendations.push('Build to 3 months of expenses')
    recommendations.push('Keep emergency fund in high-yield savings')
  } else if (monthsCovered < 6) {
    recommendations.push('Target 6 months for complete security')
    recommendations.push('Consider job stability when setting target')
  }

  return {
    name: 'Emergency Fund',
    score,
    maxScore: 25,
    status: getStatus(score, 25),
    icon: Shield,
    description: `${monthsCovered.toFixed(1)} months of expenses covered`,
    recommendations,
    weight: 0.25,
  }
}

function calculateDebtScore(data: FinancialData): ComponentScore {
  // Debt-to-Income ratio (monthly)
  const dti = data.monthlyIncome > 0
    ? (data.monthlyDebtPayment / data.monthlyIncome) * 100
    : 100

  // High interest debt penalty
  const highInterestPenalty = data.highInterestDebt > 0 ? 5 : 0

  // Score: Start at 25, subtract based on DTI
  // DTI < 10%: 25 points
  // DTI 10-20%: 20 points
  // DTI 20-35%: 15 points
  // DTI 35-50%: 10 points
  // DTI > 50%: 5 points
  let baseScore = 25
  if (dti >= 50) baseScore = 5
  else if (dti >= 35) baseScore = 10
  else if (dti >= 20) baseScore = 15
  else if (dti >= 10) baseScore = 20

  const score = Math.max(0, baseScore - highInterestPenalty)

  const recommendations: string[] = []
  if (data.highInterestDebt > 0) {
    recommendations.push('Prioritize paying off high-interest debt (>10% APR)')
    recommendations.push('Consider balance transfer or debt consolidation')
  }
  if (dti > 35) {
    recommendations.push('Aim to reduce debt-to-income ratio below 35%')
    recommendations.push('Use debt avalanche method for fastest payoff')
  }
  if (dti > 20 && dti <= 35) {
    recommendations.push('Continue debt reduction to reach healthy DTI')
  }
  if (data.totalDebt === 0) {
    recommendations.push('Excellent! Stay debt-free or use debt strategically')
  }

  return {
    name: 'Debt Management',
    score,
    maxScore: 25,
    status: getStatus(score, 25),
    icon: CreditCard,
    description: dti > 0 ? `${dti.toFixed(1)}% debt-to-income ratio` : 'Debt-free',
    recommendations,
    weight: 0.25,
  }
}

function calculateSavingsScore(data: FinancialData): ComponentScore {
  // Savings rate score (target: 20% = full points)
  const savingsRateScore = Math.min(15, Math.round((data.savingsRate / 20) * 15))

  // Retirement progress score (are you on track?)
  const retirementProgress = data.targetRetirementBalance > 0
    ? (data.retirementBalance / data.targetRetirementBalance) * 100
    : 50
  const retirementScore = Math.min(10, Math.round((retirementProgress / 100) * 10))

  const score = savingsRateScore + retirementScore

  const recommendations: string[] = []
  if (data.savingsRate < 10) {
    recommendations.push('Increase savings rate to at least 10% of income')
    recommendations.push('Start with 1% increase every few months')
  } else if (data.savingsRate < 15) {
    recommendations.push('Target 15% savings rate for solid retirement')
    recommendations.push('Maximize employer 401(k) match')
  } else if (data.savingsRate < 20) {
    recommendations.push('Push to 20% for accelerated wealth building')
  }

  if (retirementProgress < 50) {
    recommendations.push('Consider catch-up contributions if available')
    recommendations.push('Review investment allocation for growth')
  }

  return {
    name: 'Savings & Investing',
    score,
    maxScore: 25,
    status: getStatus(score, 25),
    icon: PiggyBank,
    description: `${data.savingsRate.toFixed(1)}% savings rate`,
    recommendations,
    weight: 0.25,
  }
}

function calculateInsuranceScore(data: FinancialData): ComponentScore {
  let score = 0
  const recommendations: string[] = []

  // Health insurance (8 points - essential)
  if (data.hasHealthInsurance) {
    score += 8
  } else {
    recommendations.push('Health insurance is critical - explore marketplace options')
  }

  // Life insurance if dependents (8 points)
  if (data.dependents > 0) {
    if (data.hasLifeInsurance) {
      score += 8
    } else {
      recommendations.push('Get term life insurance to protect dependents')
    }
  } else {
    score += 4 // Half points if no dependents
    if (!data.hasLifeInsurance) {
      recommendations.push('Consider term life for estate planning')
    }
  }

  // Disability insurance (5 points)
  if (data.hasDisabilityInsurance) {
    score += 5
  } else {
    recommendations.push('Disability insurance protects your earning power')
  }

  // Umbrella insurance (4 points)
  if (data.hasUmbrellaInsurance) {
    score += 4
  } else {
    recommendations.push('Umbrella insurance provides extra liability protection')
  }

  if (recommendations.length === 0) {
    recommendations.push('Insurance coverage is complete - review annually')
  }

  return {
    name: 'Insurance Coverage',
    score,
    maxScore: 25,
    status: getStatus(score, 25),
    icon: Umbrella,
    description: `${Math.round((score / 25) * 100)}% coverage score`,
    recommendations,
    weight: 0.25,
  }
}

function calculateAgeGroupComparison(score: number, age: number): AgeGroupComparison {
  const ageGroup = getAgeGroup(age)
  const benchmark = AGE_GROUP_BENCHMARKS[ageGroup]

  // Calculate percentile based on score vs distribution
  let cumulativePercent = 0
  const levelIndex = LEVELS.findIndex(l => score >= l.minScore && score <= l.maxScore)

  for (let i = 0; i <= levelIndex; i++) {
    if (i < levelIndex) {
      cumulativePercent += benchmark.distribution[i]
    } else {
      // Interpolate within the level
      const levelRange = LEVELS[i].maxScore - LEVELS[i].minScore
      const positionInLevel = (score - LEVELS[i].minScore) / levelRange
      cumulativePercent += benchmark.distribution[i] * positionInLevel
    }
  }

  return {
    ageGroup,
    averageScore: benchmark.avgScore,
    percentile: Math.round(cumulativePercent),
    betterThan: Math.round(cumulativePercent),
  }
}

// ==================== Sub-Components ====================

interface ScoreRingProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showAnimation?: boolean
}

function ScoreRing({ score, size = 'lg', showAnimation = true }: ScoreRingProps) {
  const [displayScore, setDisplayScore] = useState(showAnimation ? 0 : score)

  useEffect(() => {
    if (!showAnimation) {
      setDisplayScore(score)
      return
    }

    const duration = 1500
    const steps = 60
    const increment = score / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= score) {
        setDisplayScore(score)
        clearInterval(timer)
      } else {
        setDisplayScore(Math.round(current))
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [score, showAnimation])

  const sizeClasses = {
    sm: { container: 'w-20 h-20', text: 'text-xl', label: 'text-[10px]' },
    md: { container: 'w-32 h-32', text: 'text-3xl', label: 'text-xs' },
    lg: { container: 'w-40 h-40', text: 'text-5xl', label: 'text-sm' },
  }

  const radius = size === 'lg' ? 70 : size === 'md' ? 56 : 35
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (displayScore / 100) * circumference

  return (
    <div className={cn('relative', sizeClasses[size].container)}>
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        {/* Background circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        {/* Progress circle */}
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="url(#scoreGradient)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" className={cn('stop-color-current', getScoreColor(score))} stopColor={score >= 80 ? '#10b981' : score >= 60 ? '#3b82f6' : score >= 40 ? '#f59e0b' : score >= 20 ? '#f97316' : '#ef4444'} />
            <stop offset="100%" className={cn('stop-color-current', getScoreColor(score))} stopColor={score >= 80 ? '#059669' : score >= 60 ? '#2563eb' : score >= 40 ? '#d97706' : score >= 20 ? '#ea580c' : '#dc2626'} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn('font-bold tabular-nums', sizeClasses[size].text, getScoreColor(score))}>
          {displayScore}
        </span>
        <span className={cn('text-muted-foreground', sizeClasses[size].label)}>
          out of 100
        </span>
      </div>
    </div>
  )
}

interface ComponentScoreCardProps {
  component: ComponentScore
  onRecommendationClick?: (recommendation: string, category: string) => void
  expanded?: boolean
  onToggle?: () => void
}

function ComponentScoreCard({ component, onRecommendationClick, expanded, onToggle }: ComponentScoreCardProps) {
  const Icon = component.icon
  const percentage = Math.round((component.score / component.maxScore) * 100)

  return (
    <div
      className={cn(
        'rounded-lg border p-4 transition-all cursor-pointer hover:shadow-md',
        getStatusBgColor(component.status),
        expanded && 'ring-2 ring-primary'
      )}
      onClick={onToggle}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', getStatusBgColor(component.status))}>
            <Icon className={cn('w-5 h-5', getStatusColor(component.status))} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold">{component.name}</h4>
              <Badge variant="outline" className={cn('text-xs', getStatusColor(component.status))}>
                {component.status.charAt(0).toUpperCase() + component.status.slice(1)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{component.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('text-2xl font-bold', getStatusColor(component.status))}>
            {component.score}
          </span>
          <span className="text-sm text-muted-foreground">/{component.maxScore}</span>
          <ChevronRight className={cn('w-5 h-5 text-muted-foreground transition-transform', expanded && 'rotate-90')} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3">
        <Progress value={percentage} className="h-2" />
      </div>

      {/* Expanded recommendations */}
      {expanded && component.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border/50">
          <h5 className="text-sm font-medium mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Recommendations to Improve
          </h5>
          <ul className="space-y-2">
            {component.recommendations.map((rec, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer group"
                onClick={(e) => {
                  e.stopPropagation()
                  onRecommendationClick?.(rec, component.name)
                }}
              >
                <ChevronRight className="w-4 h-4 mt-0.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

interface TrendChartProps {
  data: { date: string; score: number }[]
}

function TrendChart({ data }: TrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
        Not enough data to show trend
      </div>
    )
  }

  const maxScore = Math.max(...data.map(d => d.score))
  const minScore = Math.min(...data.map(d => d.score))
  const range = maxScore - minScore || 1

  // Calculate trend
  const firstScore = data[0].score
  const lastScore = data[data.length - 1].score
  const change = lastScore - firstScore
  const changePercent = firstScore > 0 ? ((change / firstScore) * 100).toFixed(1) : '0'

  return (
    <div className="space-y-4">
      {/* Trend indicator */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">Score Trend</span>
        <div className={cn(
          'flex items-center gap-1 text-sm font-medium',
          change > 0 ? 'text-emerald-500' : change < 0 ? 'text-red-500' : 'text-muted-foreground'
        )}>
          {change > 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : change < 0 ? (
            <TrendingDown className="w-4 h-4" />
          ) : (
            <Minus className="w-4 h-4" />
          )}
          <span>{change > 0 ? '+' : ''}{change} pts ({change > 0 ? '+' : ''}{changePercent}%)</span>
        </div>
      </div>

      {/* Mini chart */}
      <div className="relative h-24 w-full">
        <svg className="w-full h-full" preserveAspectRatio="none">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map(line => (
            <line
              key={line}
              x1="0"
              x2="100%"
              y1={`${100 - line}%`}
              y2={`${100 - line}%`}
              stroke="currentColor"
              strokeOpacity="0.1"
              strokeDasharray="4 4"
            />
          ))}

          {/* Area fill */}
          <path
            d={`
              M 0 ${100 - ((data[0].score - minScore) / range) * 80 - 10}
              ${data.map((d, i) =>
                `L ${(i / (data.length - 1)) * 100}% ${100 - ((d.score - minScore) / range) * 80 - 10}%`
              ).join(' ')}
              L 100% 100%
              L 0 100%
              Z
            `}
            fill="url(#trendGradient)"
            fillOpacity="0.2"
          />

          {/* Line */}
          <path
            d={`
              M 0 ${100 - ((data[0].score - minScore) / range) * 80 - 10}%
              ${data.map((d, i) =>
                `L ${(i / (data.length - 1)) * 100}% ${100 - ((d.score - minScore) / range) * 80 - 10}%`
              ).join(' ')}
            `}
            fill="none"
            stroke={change >= 0 ? '#10b981' : '#ef4444'}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points */}
          {data.map((d, i) => (
            <circle
              key={i}
              cx={`${(i / (data.length - 1)) * 100}%`}
              cy={`${100 - ((d.score - minScore) / range) * 80 - 10}%`}
              r="4"
              fill="white"
              stroke={change >= 0 ? '#10b981' : '#ef4444'}
              strokeWidth="2"
            />
          ))}

          <defs>
            <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={change >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0.3" />
              <stop offset="100%" stopColor={change >= 0 ? '#10b981' : '#ef4444'} stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* X-axis labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground">
          <span>{data[0].date}</span>
          <span>{data[data.length - 1].date}</span>
        </div>
      </div>
    </div>
  )
}

interface LevelProgressProps {
  score: number
  level: LevelInfo
}

function LevelProgress({ score, level }: LevelProgressProps) {
  const LevelIcon = level.icon
  const pointsToNext = getPointsToNextLevel(score)
  const nextLevel = LEVELS.find(l => l.minScore > level.maxScore)
  const progressInLevel = ((score - level.minScore) / (level.maxScore - level.minScore + 1)) * 100

  return (
    <div className={cn('rounded-xl p-4 border-2', level.bgColor, level.borderColor)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', level.bgColor)}>
            <LevelIcon className={cn('w-6 h-6', level.color)} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={cn('font-bold text-lg', level.color)}>Level {level.level}</span>
              <Badge className={cn(level.color, level.bgColor, 'border-0')}>
                {level.title}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{level.description}</p>
          </div>
        </div>
        {nextLevel && (
          <div className="text-right">
            <div className="flex items-center gap-1 text-sm">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="font-medium">{pointsToNext} pts to Level {nextLevel.level}</span>
            </div>
            <p className="text-xs text-muted-foreground">{nextLevel.title}</p>
          </div>
        )}
      </div>

      {/* Level progress bar */}
      <div className="relative">
        <div className="h-3 bg-muted/30 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full bg-gradient-to-r transition-all duration-500', getScoreGradient(score))}
            style={{ width: `${progressInLevel}%` }}
          />
        </div>
        <div className="flex justify-between mt-1 text-xs text-muted-foreground">
          <span>{level.minScore}</span>
          <span>{level.maxScore}</span>
        </div>
      </div>
    </div>
  )
}

interface AgeComparisonProps {
  comparison: AgeGroupComparison
}

function AgeComparison({ comparison }: AgeComparisonProps) {
  const isAboveAverage = comparison.percentile > 50

  return (
    <div className="rounded-lg border p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="flex items-center gap-2 mb-3">
        <Users className="w-5 h-5 text-primary" />
        <h4 className="font-semibold">Age Group Comparison</h4>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">{comparison.ageGroup}</div>
          <div className="text-xs text-muted-foreground">Your Age Group</div>
        </div>
        <div className="text-center border-x border-border/50">
          <div className="text-2xl font-bold">{comparison.averageScore}</div>
          <div className="text-xs text-muted-foreground">Group Average</div>
        </div>
        <div className="text-center">
          <div className={cn('text-2xl font-bold', isAboveAverage ? 'text-emerald-500' : 'text-amber-500')}>
            {comparison.percentile}%
          </div>
          <div className="text-xs text-muted-foreground">Your Percentile</div>
        </div>
      </div>

      <div className={cn(
        'mt-4 p-3 rounded-lg flex items-center gap-2',
        isAboveAverage ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
      )}>
        {isAboveAverage ? (
          <>
            <ArrowUp className="w-5 h-5 text-emerald-500" />
            <span className="text-sm">
              You&apos;re doing <strong>better than {comparison.betterThan}%</strong> of people in your age group!
            </span>
          </>
        ) : (
          <>
            <ArrowDown className="w-5 h-5 text-amber-500" />
            <span className="text-sm">
              You have room to grow! {100 - comparison.betterThan}% of your peers have higher scores.
            </span>
          </>
        )}
      </div>
    </div>
  )
}

// ==================== Main Component ====================

export function FinancialHealthScore({
  data,
  onRecommendationClick,
  className,
  compact = false,
}: FinancialHealthScoreProps) {
  const [expandedComponent, setExpandedComponent] = useState<string | null>(null)

  // Calculate all component scores
  const componentScores = useMemo(() => ({
    emergencyFund: calculateEmergencyFundScore(data),
    debt: calculateDebtScore(data),
    savings: calculateSavingsScore(data),
    insurance: calculateInsuranceScore(data),
  }), [data])

  // Calculate overall score (weighted average)
  const overallScore = useMemo(() => {
    const scores = Object.values(componentScores)
    const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0)
    const weightedSum = scores.reduce((sum, s) => sum + (s.score / s.maxScore) * s.weight * 100, 0)
    return Math.round(weightedSum / totalWeight)
  }, [componentScores])

  // Get level info
  const level = getLevelForScore(overallScore)

  // Age group comparison
  const ageComparison = useMemo(
    () => calculateAgeGroupComparison(overallScore, data.age),
    [overallScore, data.age]
  )

  // Get top recommendations (one from each low-scoring component)
  const topRecommendations = useMemo(() => {
    return Object.values(componentScores)
      .filter(c => c.recommendations.length > 0 && c.status !== 'excellent')
      .sort((a, b) => a.score / a.maxScore - b.score / b.maxScore)
      .slice(0, 3)
      .map(c => ({
        category: c.name,
        recommendation: c.recommendations[0],
        impact: c.status === 'critical' ? 'high' : c.status === 'poor' ? 'medium' : 'low',
      }))
  }, [componentScores])

  if (compact) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <ScoreRing score={overallScore} size="sm" showAnimation={false} />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Financial Health</span>
                <Badge className={cn(level.color, level.bgColor, 'border-0')}>
                  {level.title}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Shield className={cn('w-3 h-3', getStatusColor(componentScores.emergencyFund.status))} />
                  {componentScores.emergencyFund.score}/{componentScores.emergencyFund.maxScore}
                </span>
                <span className="flex items-center gap-1">
                  <CreditCard className={cn('w-3 h-3', getStatusColor(componentScores.debt.status))} />
                  {componentScores.debt.score}/{componentScores.debt.maxScore}
                </span>
                <span className="flex items-center gap-1">
                  <PiggyBank className={cn('w-3 h-3', getStatusColor(componentScores.savings.status))} />
                  {componentScores.savings.score}/{componentScores.savings.maxScore}
                </span>
                <span className="flex items-center gap-1">
                  <Umbrella className={cn('w-3 h-3', getStatusColor(componentScores.insurance.status))} />
                  {componentScores.insurance.score}/{componentScores.insurance.maxScore}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <div className={cn('space-y-6', className)}>
        {/* Main Score Card */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-6 h-6 text-primary" />
                  Financial Health Score
                </CardTitle>
                <CardDescription>
                  Your comprehensive financial wellness rating
                </CardDescription>
              </div>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-5 h-5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p>Your score is calculated from four key areas: emergency fund, debt management, savings rate, and insurance coverage.</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              {/* Score Ring */}
              <div className="flex flex-col items-center">
                <ScoreRing score={overallScore} />
                <div className="mt-4 flex items-center gap-2">
                  {overallScore >= 80 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                  ) : overallScore >= 40 ? (
                    <AlertCircle className="w-5 h-5 text-amber-500" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className={cn('font-medium', getScoreColor(overallScore))}>
                    {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : overallScore >= 40 ? 'Fair' : 'Needs Attention'}
                  </span>
                </div>
              </div>

              {/* Level Progress */}
              <div className="flex-1 w-full">
                <LevelProgress score={overallScore} level={level} />

                {/* Quick Stats */}
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {Object.values(componentScores).map((comp) => {
                    const Icon = comp.icon
                    return (
                      <Tooltip key={comp.name}>
                        <TooltipTrigger>
                          <div className={cn(
                            'p-2 rounded-lg text-center cursor-pointer transition-all hover:scale-105',
                            getStatusBgColor(comp.status)
                          )}>
                            <Icon className={cn('w-5 h-5 mx-auto', getStatusColor(comp.status))} />
                            <div className={cn('text-lg font-bold mt-1', getStatusColor(comp.status))}>
                              {comp.score}
                            </div>
                            <div className="text-[10px] text-muted-foreground truncate">
                              {comp.name}
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{comp.name}: {comp.description}</p>
                        </TooltipContent>
                      </Tooltip>
                    )
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Component Scores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Component Breakdown
            </CardTitle>
            <CardDescription>
              Click each category to see personalized recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {Object.values(componentScores).map((comp) => (
                <ComponentScoreCard
                  key={comp.name}
                  component={comp}
                  expanded={expandedComponent === comp.name}
                  onToggle={() => setExpandedComponent(
                    expandedComponent === comp.name ? null : comp.name
                  )}
                  onRecommendationClick={onRecommendationClick}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trend & Comparison Row */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="w-5 h-5 text-primary" />
                Score History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TrendChart data={data.historicalScores || []} />
            </CardContent>
          </Card>

          {/* Age Comparison */}
          <Card>
            <CardContent className="pt-6">
              <AgeComparison comparison={ageComparison} />
            </CardContent>
          </Card>
        </div>

        {/* Top Recommendations */}
        {topRecommendations.length > 0 && (
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-background">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Priority Actions
              </CardTitle>
              <CardDescription>
                Focus on these to boost your score the fastest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topRecommendations.map((rec, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-background border cursor-pointer hover:border-primary transition-colors"
                    onClick={() => onRecommendationClick?.(rec.recommendation, rec.category)}
                  >
                    <div className={cn(
                      'p-1.5 rounded-full',
                      rec.impact === 'high' ? 'bg-red-100 dark:bg-red-900/30' :
                      rec.impact === 'medium' ? 'bg-amber-100 dark:bg-amber-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    )}>
                      <Star className={cn(
                        'w-4 h-4',
                        rec.impact === 'high' ? 'text-red-500' :
                        rec.impact === 'medium' ? 'text-amber-500' :
                        'text-blue-500'
                      )} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {rec.category}
                        </Badge>
                        <Badge variant="outline" className={cn(
                          'text-xs',
                          rec.impact === 'high' ? 'text-red-500 border-red-300' :
                          rec.impact === 'medium' ? 'text-amber-500 border-amber-300' :
                          'text-blue-500 border-blue-300'
                        )}>
                          {rec.impact} impact
                        </Badge>
                      </div>
                      <p className="text-sm mt-1">{rec.recommendation}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gamification Section */}
        <Card className="overflow-hidden">
          <div className={cn('p-6', level.bgColor)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={cn('p-3 rounded-xl bg-white/80 dark:bg-black/20')}>
                  <level.icon className={cn('w-8 h-8', level.color)} />
                </div>
                <div>
                  <h3 className={cn('text-xl font-bold', level.color)}>
                    Level {level.level}: {level.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{level.description}</p>
                </div>
              </div>

              {getPointsToNextLevel(overallScore) > 0 && (
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <span className="font-bold text-lg">{getPointsToNextLevel(overallScore)} points</span>
                  </div>
                  <p className="text-sm text-muted-foreground">to next level</p>
                </div>
              )}
            </div>

            {/* All levels preview */}
            <div className="mt-6 grid grid-cols-6 gap-2">
              {LEVELS.map((lvl) => {
                const LvlIcon = lvl.icon
                const isCurrentOrPast = overallScore >= lvl.minScore
                const isCurrent = level.level === lvl.level

                return (
                  <Tooltip key={lvl.level}>
                    <TooltipTrigger>
                      <div className={cn(
                        'p-2 rounded-lg text-center transition-all',
                        isCurrentOrPast ? lvl.bgColor : 'bg-muted/30',
                        isCurrent && 'ring-2 ring-primary scale-110'
                      )}>
                        <LvlIcon className={cn(
                          'w-5 h-5 mx-auto',
                          isCurrentOrPast ? lvl.color : 'text-muted-foreground/50'
                        )} />
                        <div className={cn(
                          'text-xs mt-1 font-medium',
                          isCurrentOrPast ? lvl.color : 'text-muted-foreground/50'
                        )}>
                          {lvl.level}
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="font-medium">{lvl.title}</p>
                      <p className="text-xs text-muted-foreground">Score: {lvl.minScore}-{lvl.maxScore}</p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </div>
        </Card>
      </div>
    </TooltipProvider>
  )
}

export default FinancialHealthScore
