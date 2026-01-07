'use client'

import { useMemo } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { CalculationResult } from '@/types/calculator'
import type { BatchSummary } from '@/types/planner'
import { fmt } from '@/lib/utils'
import { InfoTooltip, TOOLTIP_CONTENT } from '@/components/ui/InfoTooltip'

interface PlanSummaryCardProps {
  result: CalculationResult | null
  batchSummary: BatchSummary | null
}

type PlanStatus = 'on-track' | 'reasonable' | 'vulnerable'

interface PlanStatusData {
  status: PlanStatus
  label: string
  message: string
  color: 'green' | 'yellow' | 'red'
  icon: React.ComponentType<any>
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

export function PlanSummaryCard({ result, batchSummary }: PlanSummaryCardProps) {
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
      badge: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      border: 'border-green-200 dark:border-green-800',
      iconBg: 'bg-green-100 dark:bg-green-900/30',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    yellow: {
      badge: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      border: 'border-yellow-200 dark:border-yellow-800',
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    },
    red: {
      badge: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <Card className={`border-2 ${classes.border}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">Plan Summary</CardTitle>
            <Badge className={`${classes.badge} border-0`}>{label}</Badge>
          </div>
          <div className={`p-3 rounded-full ${classes.iconBg}`}>
            <Icon className={`h-8 w-8 ${classes.iconColor}`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Message */}
        <p className="text-sm text-muted-foreground leading-relaxed">
          {message}
        </p>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          {/* Success Rate (if available) */}
          {successRate !== undefined && (
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Success Rate
                </p>
                <InfoTooltip {...TOOLTIP_CONTENT.successRate} side="top" />
              </div>
              <p className="text-2xl font-bold">{successRate.toFixed(0)}%</p>
              <p className="text-xs text-muted-foreground">
                Chance of not running out
              </p>
            </div>
          )}

          {/* Safe Withdrawal */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Annual After-Tax Income
              </p>
              <InfoTooltip {...TOOLTIP_CONTENT.afterTaxWithdrawal} side="top" />
            </div>
            <p className="text-2xl font-bold">{fmt(safeWithdrawal)}</p>
            <p className="text-xs text-muted-foreground">
              In retirement (inflation-adjusted)
            </p>
          </div>

          {/* End-of-Life Wealth */}
          <div className="space-y-1">
            <div className="flex items-center gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                End-of-Life Wealth
              </p>
              <InfoTooltip {...TOOLTIP_CONTENT.endOfLifeWealth} side="top" />
            </div>
            <p className="text-2xl font-bold">{fmt(eolWealthRange)}</p>
            <p className="text-xs text-muted-foreground">
              Remaining assets (real)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
