'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Share2,
  Award,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { InfoTooltip } from '@/components/ui/InfoTooltip'
import { AnimatedSection } from '@/components/ui/AnimatedSection'
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens'
import { fmt } from '@/lib/utils'
import {
  calculateBenchmarkResult,
  getComparisonMessage,
  SAVINGS_RATE_BENCHMARKS,
  type BenchmarkResult,
  type BenchmarkPanelProps,
} from '@/lib/benchmarks'

/**
 * Percentile Gauge Component
 *
 * Visual gauge showing user's percentile ranking with gradient coloring.
 */
function PercentileGauge({
  percentile,
  label,
}: {
  percentile: number
  label: string
}) {
  // Determine color based on percentile
  const getGaugeColor = (p: number): string => {
    if (p >= 75) return 'bg-emerald-500'
    if (p >= 50) return 'bg-blue-500'
    if (p >= 25) return 'bg-amber-500'
    return 'bg-red-500'
  }

  const getTextColor = (p: number): string => {
    if (p >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (p >= 50) return 'text-blue-600 dark:text-blue-400'
    if (p >= 25) return 'text-amber-600 dark:text-amber-400'
    return 'text-red-600 dark:text-red-400'
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={TYPOGRAPHY.metricLabel}>Your Percentile</span>
        <Badge className={STATUS.info}>{label}</Badge>
      </div>

      {/* Gauge Track */}
      <div className="relative h-4 bg-gradient-to-r from-red-200 via-amber-200 via-blue-200 to-emerald-200 dark:from-red-900/30 dark:via-amber-900/30 dark:via-blue-900/30 dark:to-emerald-900/30 rounded-full overflow-hidden">
        {/* Percentile Markers */}
        <div className="absolute inset-0 flex items-center">
          <div className="absolute left-[25%] w-px h-full bg-gray-400/50" />
          <div className="absolute left-[50%] w-px h-full bg-gray-400/50" />
          <div className="absolute left-[75%] w-px h-full bg-gray-400/50" />
        </div>

        {/* User Position Indicator */}
        <div
          className="absolute top-0 bottom-0 flex items-center transition-all duration-700 ease-out"
          style={{ left: `${Math.min(98, Math.max(2, percentile))}%` }}
        >
          <div
            className={`w-5 h-5 -ml-2.5 rounded-full ${getGaugeColor(percentile)} border-2 border-white dark:border-gray-800 shadow-lg`}
          />
        </div>
      </div>

      {/* Labels */}
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>25</span>
        <span>50</span>
        <span>75</span>
        <span>100</span>
      </div>

      {/* Percentile Value */}
      <div className="text-center">
        <span className={`${TYPOGRAPHY.metricLarge} ${getTextColor(percentile)}`}>
          {Math.round(percentile)}
        </span>
        <span className={`${TYPOGRAPHY.metricSmall} ${getTextColor(percentile)}`}>
          th percentile
        </span>
      </div>
    </div>
  )
}

/**
 * Trajectory Line Component
 *
 * Shows improvement trajectory over time.
 */
function TrajectoryLine({
  current,
  projected,
  targetAge,
  isImproving,
}: {
  current: number
  projected: number
  targetAge: number
  isImproving: boolean
}) {
  return (
    <div className="relative h-24 w-full">
      {/* SVG Line */}
      <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="currentColor" strokeOpacity="0.1" strokeDasharray="2,2" />

        {/* Trajectory path */}
        <path
          d={`M 10 ${50 - (current / 100) * 40} Q 50 ${50 - ((current + projected) / 2 / 100) * 40 - 5} 90 ${50 - (projected / 100) * 40}`}
          fill="none"
          stroke={isImproving ? '#10b981' : '#f59e0b'}
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Start point */}
        <circle cx="10" cy={50 - (current / 100) * 40} r="4" fill="#3b82f6" />

        {/* End point */}
        <circle cx="90" cy={50 - (projected / 100) * 40} r="4" fill={isImproving ? '#10b981' : '#f59e0b'} />
      </svg>

      {/* Labels */}
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-muted-foreground">
        <span>Now</span>
        <span>Age {targetAge}</span>
      </div>
    </div>
  )
}

/**
 * Usage Counter Component
 *
 * Displays how many people have used the calculator.
 */
function UsageCounterDisplay({
  totalCalculations,
  isSimulated,
}: {
  totalCalculations: number
  isSimulated: boolean
}) {
  const [displayCount, setDisplayCount] = useState(totalCalculations - 100)

  // Animate counting up
  useEffect(() => {
    const duration = 2000
    const steps = 50
    const increment = (totalCalculations - displayCount) / steps
    const interval = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      if (currentStep >= steps) {
        setDisplayCount(totalCalculations)
        clearInterval(timer)
      } else {
        setDisplayCount((prev) => Math.floor(prev + increment))
      }
    }, interval)

    return () => clearInterval(timer)
  }, [totalCalculations])

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Users className="w-4 h-4" />
      <span className="tabular-nums font-medium">{displayCount.toLocaleString()}</span>
      <span>people have planned their retirement</span>
      {isSimulated && (
        <span className="text-xs opacity-50">(demo)</span>
      )}
    </div>
  )
}

/**
 * Savings Rate Comparison Card
 */
function SavingsRateCard({
  userRate,
  nationalAverage,
  multiple,
  category,
  description,
}: {
  userRate: number
  nationalAverage: number
  multiple: number
  category: string
  description: string
}) {
  const isAboveAverage = userRate > nationalAverage

  return (
    <div className={`p-4 rounded-lg border ${isAboveAverage ? METRIC_COLORS.positive.border : METRIC_COLORS.warning.border} ${isAboveAverage ? METRIC_COLORS.positive.bg : METRIC_COLORS.warning.bg}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className={`w-5 h-5 ${isAboveAverage ? METRIC_COLORS.positive.text : METRIC_COLORS.warning.text}`} />
          <span className={TYPOGRAPHY.sectionHeader}>Savings Rate</span>
        </div>
        <Badge className={isAboveAverage ? STATUS.success : STATUS.warning}>
          {category.replace('-', ' ')}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <p className={TYPOGRAPHY.metricLabel}>Your Rate</p>
          <p className={TYPOGRAPHY.metricMedium}>{userRate}%</p>
        </div>
        <div>
          <p className={TYPOGRAPHY.metricLabel}>National Avg</p>
          <p className={TYPOGRAPHY.metricMedium}>{nationalAverage}%</p>
        </div>
      </div>

      {isAboveAverage && (
        <div className="mt-3 flex items-center gap-1 text-sm">
          <TrendingUp className={`w-4 h-4 ${METRIC_COLORS.positive.text}`} />
          <span className={METRIC_COLORS.positive.text}>
            You're saving {multiple}x the national average
          </span>
        </div>
      )}

      <p className={`${TYPOGRAPHY.helperText} mt-2`}>{description}</p>
    </div>
  )
}

/**
 * Movement Impact Card
 */
function MovementCard({
  impact,
  onShare,
}: {
  impact: {
    povertyReductionPercent: number
    additionalRetirementYears: number
    message: string
    isContributor: boolean
  }
  onShare?: () => void
}) {
  return (
    <div className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/50">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h4 className={`${TYPOGRAPHY.sectionHeader} text-purple-900 dark:text-purple-100`}>
            The Movement
          </h4>
          <p className={`${TYPOGRAPHY.bodyMuted} mt-1`}>
            {impact.message}
          </p>
        </div>
      </div>

      {impact.isContributor && impact.povertyReductionPercent > 0 && (
        <div className="mb-4 p-3 rounded-md bg-white/60 dark:bg-gray-900/40">
          <p className="text-sm text-purple-800 dark:text-purple-200">
            If everyone saved like you, retirement poverty could drop by an estimated{' '}
            <strong>{impact.povertyReductionPercent}%</strong>
          </p>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          variant="outline"
          className="flex-1 border-purple-300 dark:border-purple-700 hover:bg-purple-100 dark:hover:bg-purple-900/50"
          onClick={onShare}
        >
          <Share2 className="w-4 h-4 mr-2" />
          Share This Calculator
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50"
          asChild
        >
          <a
            href="https://www.federalreserve.gov/econres/scfindex.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            View SCF Data
          </a>
        </Button>
      </div>
    </div>
  )
}

/**
 * BenchmarkPanel Component
 *
 * Main component showing user's retirement savings compared to national benchmarks.
 * Displays percentile ranking, projections, savings rate comparison, and inspirational
 * "movement" messaging to encourage financial wellness.
 */
export function BenchmarkPanel({
  age,
  totalSavings,
  annualContributions,
  grossIncome,
  returnRate = 7,
  retirementAge = 65,
  expanded = false,
  onShare,
}: BenchmarkPanelProps) {
  const [isExpanded, setIsExpanded] = useState(expanded)

  // Calculate all benchmark data
  const benchmarkResult = useMemo<BenchmarkResult>(() => {
    return calculateBenchmarkResult(
      age,
      totalSavings,
      annualContributions,
      grossIncome,
      returnRate,
      retirementAge
    )
  }, [age, totalSavings, annualContributions, grossIncome, returnRate, retirementAge])

  const { ranking, projectedStanding, savingsRateComparison, movementImpact, usageStats } = benchmarkResult
  const comparisonMessage = useMemo(() => getComparisonMessage(ranking), [ranking])

  // Handle share action
  const handleShare = async () => {
    if (onShare) {
      onShare()
      return
    }

    // Default share behavior
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Retirement Calculator',
          text: `I just calculated my retirement plan! I'm in the ${ranking.label} of Americans my age for retirement savings.`,
          url: window.location.href,
        })
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href)
        // Could add toast notification here
      } catch {
        // Clipboard failed
      }
    }
  }

  return (
    <AnimatedSection animation="slide-up" delay={200}>
      <Card className="overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-b">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className={TYPOGRAPHY.cardTitle}>
                How You Compare
              </CardTitle>
              <CardDescription className="mt-1">
                Based on Federal Reserve Survey of Consumer Finances (2022)
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {ranking.percentile >= 75 && (
                <Badge className={`${STATUS.success} gap-1`}>
                  <Award className="w-3 h-3" />
                  Top Performer
                </Badge>
              )}
              <InfoTooltip
                content="Percentile ranking shows how your retirement savings compare to other Americans in your age group. Based on the Federal Reserve's triennial Survey of Consumer Finances."
                side="left"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Current Standing Section */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Percentile Gauge */}
            <div>
              <PercentileGauge percentile={ranking.percentile} label={ranking.label} />
              <p className={`${TYPOGRAPHY.body} text-center mt-4`}>
                You have more saved than{' '}
                <strong className="text-primary">{Math.round(ranking.percentile)}%</strong>{' '}
                of Americans your age
              </p>
            </div>

            {/* Median Comparison */}
            <div className="space-y-4">
              <h4 className={TYPOGRAPHY.subSectionHeader}>vs Median</h4>
              <div className="p-4 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between mb-2">
                  <span className={TYPOGRAPHY.metricLabel}>Your Savings</span>
                  <span className={TYPOGRAPHY.metricSmall}>{fmt(totalSavings)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className={TYPOGRAPHY.metricLabel}>Age {age} Median</span>
                  <span className={TYPOGRAPHY.metricSmall}>{fmt(ranking.vsMedian.difference + totalSavings - ranking.vsMedian.difference)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2">
                    {ranking.vsMedian.position === 'above' ? (
                      <TrendingUp className="w-5 h-5 text-emerald-500" />
                    ) : ranking.vsMedian.position === 'below' ? (
                      <TrendingDown className="w-5 h-5 text-amber-500" />
                    ) : (
                      <span className="w-5 h-5 text-blue-500">=</span>
                    )}
                    <span className={TYPOGRAPHY.body}>{comparisonMessage}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Projected Standing */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-4">
              <h4 className={TYPOGRAPHY.subSectionHeader}>Projected Standing at {projectedStanding.targetAge}</h4>
              {projectedStanding.isImproving && (
                <Badge className={STATUS.success}>
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Improving
                </Badge>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <TrajectoryLine
                current={ranking.percentile}
                projected={projectedStanding.projectedPercentile}
                targetAge={projectedStanding.targetAge}
                isImproving={projectedStanding.isImproving}
              />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className={TYPOGRAPHY.metricLabel}>Projected Savings</span>
                  <span className={TYPOGRAPHY.metricSmall}>{fmt(projectedStanding.projectedSavings)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className={TYPOGRAPHY.metricLabel}>Projected Percentile</span>
                  <span className={TYPOGRAPHY.metricSmall}>{Math.round(projectedStanding.projectedPercentile)}th</span>
                </div>
                {projectedStanding.percentileChange !== 0 && (
                  <div className="flex justify-between items-center">
                    <span className={TYPOGRAPHY.metricLabel}>Change</span>
                    <span className={`${TYPOGRAPHY.metricSmall} ${projectedStanding.percentileChange > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {projectedStanding.percentileChange > 0 ? '+' : ''}{Math.round(projectedStanding.percentileChange)} points
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Expandable Section */}
          <div>
            <Button
              variant="ghost"
              className="w-full justify-center"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Show More Insights
                </>
              )}
            </Button>
          </div>

          {isExpanded && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
              {/* Savings Rate Comparison */}
              {savingsRateComparison && (
                <SavingsRateCard
                  userRate={savingsRateComparison.userRate}
                  nationalAverage={savingsRateComparison.nationalAverage}
                  multiple={savingsRateComparison.multiple}
                  category={savingsRateComparison.category}
                  description={savingsRateComparison.description}
                />
              )}

              {/* The Movement */}
              <MovementCard impact={movementImpact} onShare={handleShare} />

              {/* Usage Counter */}
              <div className="flex justify-center pt-2">
                <UsageCounterDisplay
                  totalCalculations={usageStats.totalCalculations}
                  isSimulated={usageStats.isSimulated}
                />
              </div>

              {/* Data Source Attribution */}
              <div className="text-center pt-4 border-t">
                <p className={TYPOGRAPHY.helperText}>
                  Data source: Federal Reserve Board,{' '}
                  <a
                    href="https://www.federalreserve.gov/econres/scfindex.htm"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    2022 Survey of Consumer Finances
                  </a>
                  . Values inflation-adjusted to 2026.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </AnimatedSection>
  )
}

export default BenchmarkPanel
