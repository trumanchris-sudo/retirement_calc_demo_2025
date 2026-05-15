'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CalculationResult } from '@/types/calculator'
import type { BatchSummary } from '@/types/planner'
import { fmt } from '@/lib/utils'
import { InfoTooltip, TOOLTIP_CONTENT } from '@/components/ui/InfoTooltip'
import { TYPOGRAPHY } from '@/lib/designTokens'
import { Sparkline } from '@/components/ui/Sparkline'

interface PlanSummaryCardProps {
  result: CalculationResult | null
  batchSummary: BatchSummary | null
  /** Optional wealth trajectory data for sparkline visualization */
  wealthTrajectory?: number[]
}

type PlanStatus = 'on-track' | 'reasonable' | 'vulnerable'

interface PlanStatusData {
  status: PlanStatus
  label: string
  message: string
  color: 'green' | 'yellow' | 'red'
  icon: React.ComponentType<{ className?: string }> // Reason: Lucide icon props vary by icon
}

/**
 * Determine plan status based on success rate and other heuristics
 */
function determinePlanStatus(
  result: CalculationResult | null,
  batchSummary: BatchSummary | null
): PlanStatusData {
  if (!result) {
    return {
      status: 'vulnerable',
      label: 'No Results',
      message: 'Run a plan calculation to see your retirement outlook.',
      color: 'yellow',
      icon: AlertCircle,
    }
  }

  // Use Monte Carlo success rate if available, otherwise use deterministic survival
  let successRate = 0

  if (batchSummary && batchSummary.probRuin !== undefined) {
    // Calculate success rate from probability of ruin
    successRate = (1 - batchSummary.probRuin) * 100
  } else {
    // For deterministic mode, calculate a pseudo-success-rate based on survival
    const survivalYears = result.survYrs || 0
    const totalYears = result.yrsToSim || 1
    successRate = Math.min(100, (survivalYears / totalYears) * 100)
  }

  // Heuristics for status determination
  if (successRate >= 90) {
    return {
      status: 'on-track',
      label: 'On Track',
      message:
        'Your plan shows strong resilience across a wide range of market conditions. You have substantial flexibility to adjust spending or weather unexpected expenses.',
      color: 'green',
      icon: CheckCircle2,
    }
  }

  if (successRate >= 75) {
    return {
      status: 'reasonable',
      label: 'Reasonably Close',
      message:
        'Your plan is viable, but success is not guaranteed in all market scenarios. Consider building additional buffer through increased savings or delayed retirement.',
      color: 'yellow',
      icon: AlertTriangle,
    }
  }

  return {
    status: 'vulnerable',
    label: 'Needs Adjustment',
    message:
      'Your plan faces significant risk of portfolio depletion. We recommend increasing contributions, reducing retirement spending, or delaying retirement to improve outcomes.',
    color: 'red',
    icon: AlertCircle,
  }
}

export function PlanSummaryCard({ result, batchSummary, wealthTrajectory }: PlanSummaryCardProps) {
  const statusData = useMemo(
    () => determinePlanStatus(result, batchSummary),
    [result, batchSummary]
  )

  if (!result) {
    return null
  }

  const { label, message, color, icon: Icon } = statusData

  const successRate = batchSummary?.probRuin !== undefined
    ? (1 - batchSummary.probRuin) * 100
    : undefined
  const safeWithdrawal = result.wdAfter
  const eolWealthRange = result.eolReal

  const colorClasses = {
    green: {
      badge: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-300',
      iconBg: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:ring-emerald-900',
      metric: 'text-emerald-700 dark:text-emerald-300',
    },
    yellow: {
      badge: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300',
      iconBg: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:ring-amber-900',
      metric: 'text-amber-700 dark:text-amber-300',
    },
    red: {
      badge: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300',
      iconBg: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300 dark:ring-red-900',
      metric: 'text-red-700 dark:text-red-300',
    },
  }

  const classes = colorClasses[color]

  return (
    <Card className="overflow-hidden border bg-card shadow-sm">
      <CardContent className="p-0">
        <div className="border-b bg-muted/30 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-3 ring-1 ${classes.iconBg}`} aria-hidden="true">
                <Icon className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                  Plan Outlook
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {label}
                </h2>
              </div>
            </div>
            <Badge variant="outline" className={`${classes.badge} shrink-0`}>
              {successRate !== undefined ? `${successRate.toFixed(0)}% success` : label}
            </Badge>
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {message}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-3">
          {/* Success Rate (if available) */}
          {successRate !== undefined && (
            <div className="rounded-xl border bg-background p-4">
              <div className="flex items-center gap-1">
                <p className={TYPOGRAPHY.tableHeader}>
                  Success Rate
                </p>
                <InfoTooltip {...TOOLTIP_CONTENT.successRate} side="top" />
              </div>
              <p className={`mt-2 text-3xl font-semibold tracking-tight ${classes.metric}`}>{successRate.toFixed(0)}%</p>
              <p className={TYPOGRAPHY.tableCellCompact + ' text-muted-foreground'}>
                Chance of not running out during retirement
              </p>
            </div>
          )}

          {/* Safe Withdrawal */}
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-1">
              <p className={TYPOGRAPHY.tableHeader}>
                Annual After-Tax Income
              </p>
              <InfoTooltip {...TOOLTIP_CONTENT.afterTaxWithdrawal} side="top" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{fmt(safeWithdrawal)}</p>
            <p className={TYPOGRAPHY.tableCellCompact + ' text-muted-foreground'}>
              In retirement (real)
            </p>
          </div>

          {/* End-of-Life Wealth */}
          <div className="rounded-xl border bg-background p-4">
            <div className="flex items-center gap-1">
              <p className={TYPOGRAPHY.tableHeader}>
                End-of-Life Wealth
              </p>
              <InfoTooltip {...TOOLTIP_CONTENT.endOfLifeWealth} side="top" />
            </div>
            <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{fmt(eolWealthRange)}</p>
            <p className={TYPOGRAPHY.tableCellCompact + ' text-muted-foreground'}>
              Remaining assets (real)
            </p>
          </div>
        </div>

        {/* Wealth Trajectory Sparkline */}
        {wealthTrajectory && wealthTrajectory.length > 2 && (
          <div className="border-t p-4">
            <div className="flex items-center justify-between mb-2">
              <p className={`${TYPOGRAPHY.tableHeader} text-muted-foreground`}>
                Wealth Trajectory
              </p>
              <span className={`${TYPOGRAPHY.tableCellCompact} text-muted-foreground`}>
                Over time
              </span>
            </div>
            <Sparkline
              data={wealthTrajectory}
              width={260}
              height={40}
              variant="area"
              colorMode="auto"
              showTooltip={true}
              formatValue={(v) => fmt(v)}
              strokeWidth={2}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
