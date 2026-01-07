'use client'

import { LightbulbIcon, TrendingUp, DollarSign, Calendar, Shield } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { CalculationResult } from '@/types/calculator'
import type { BatchSummary } from '@/types/planner'

interface NextStepsCardProps {
  result: CalculationResult | null
  batchSummary: BatchSummary | null
}

interface Suggestion {
  icon: React.ComponentType<any>
  text: string
  color: string
}

/**
 * Generate personalized next steps based on plan results
 */
function generateSuggestions(
  result: CalculationResult | null,
  batchSummary: BatchSummary | null
): Suggestion[] {
  if (!result) {
    return [
      {
        icon: LightbulbIcon,
        text: 'Run your first plan calculation to see personalized recommendations.',
        color: 'text-blue-600 dark:text-blue-400',
      },
    ]
  }

  const suggestions: Suggestion[] = []

  // Determine success rate
  let successRate = 0
  if (batchSummary && batchSummary.successRate !== undefined) {
    successRate = batchSummary.successRate
  } else {
    const survivalYears = result.survYrs || 0
    const totalYears = result.yrsToSim || 1
    successRate = Math.min(100, (survivalYears / totalYears) * 100)
  }

  // Suggestion 1: Based on success rate
  if (successRate < 75) {
    suggestions.push({
      icon: TrendingUp,
      text: 'Consider increasing your savings rate by 2-3% to improve plan resilience. Even small increases compound significantly over time.',
      color: 'text-orange-600 dark:text-orange-400',
    })

    suggestions.push({
      icon: Calendar,
      text: 'Explore delaying retirement by 1-2 years. This gives your portfolio more time to grow while reducing withdrawal period.',
      color: 'text-purple-600 dark:text-purple-400',
    })

    suggestions.push({
      icon: DollarSign,
      text: 'Review your retirement spending target. A 10-15% reduction can dramatically improve success rate without major lifestyle changes.',
      color: 'text-green-600 dark:text-green-400',
    })
  } else if (successRate >= 75 && successRate < 90) {
    suggestions.push({
      icon: Shield,
      text: 'Your plan is viable but could benefit from more cushion. Consider building an emergency fund equal to 1-2 years of expenses.',
      color: 'text-blue-600 dark:text-blue-400',
    })

    suggestions.push({
      icon: TrendingUp,
      text: 'Explore tax optimization strategies like Roth conversions or strategic withdrawal sequencing to maximize after-tax income.',
      color: 'text-indigo-600 dark:text-indigo-400',
    })
  } else if (successRate >= 90) {
    // High success rate - different suggestions
    const eolWealth = result.eolReal || 0

    if (eolWealth > 1_000_000) {
      suggestions.push({
        icon: LightbulbIcon,
        text: 'Your plan shows substantial end-of-life wealth. Consider legacy planning, charitable giving, or earlier retirement.',
        color: 'text-green-600 dark:text-green-400',
      })

      suggestions.push({
        icon: DollarSign,
        text: 'Explore generational wealth strategies to efficiently transfer assets to beneficiaries and minimize estate taxes.',
        color: 'text-purple-600 dark:text-purple-400',
      })
    } else {
      suggestions.push({
        icon: Shield,
        text: 'Your plan is on track! Focus on maintaining consistency and reviewing annually as circumstances change.',
        color: 'text-green-600 dark:text-green-400',
      })

      suggestions.push({
        icon: TrendingUp,
        text: 'Consider stress-testing your plan against bear markets and high inflation to ensure resilience.',
        color: 'text-blue-600 dark:text-blue-400',
      })
    }
  }

  // Tax optimization suggestion (if heavy taxable withdrawals)
  const totalTax = result.tax?.tot || 0
  const withdrawal = result.wd || 1
  const effectiveTaxRate = (totalTax / withdrawal) * 100

  if (effectiveTaxRate > 20 && result.eolAccounts?.pretax && result.eolAccounts.pretax > 500000) {
    suggestions.push({
      icon: DollarSign,
      text: 'High tax burden detected. Review Roth conversion opportunities and withdrawal sequencing strategies to minimize lifetime taxes.',
      color: 'text-red-600 dark:text-red-400',
    })
  }

  // Ensure we have at least 2-4 suggestions
  if (suggestions.length === 0) {
    suggestions.push({
      icon: LightbulbIcon,
      text: 'Review your plan annually and adjust as life circumstances, tax laws, and market conditions change.',
      color: 'text-blue-600 dark:text-blue-400',
    })
  }

  return suggestions.slice(0, 4) // Limit to 4 suggestions
}

export function NextStepsCard({ result, batchSummary }: NextStepsCardProps) {
  const suggestions = generateSuggestions(result, batchSummary)

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LightbulbIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          What Should I Do Next?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Based on your plan results, here are some actions to consider:
          </p>

          <ul className="space-y-3">
            {suggestions.map((suggestion, index) => {
              const Icon = suggestion.icon
              return (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Icon className={`h-5 w-5 ${suggestion.color}`} />
                  </div>
                  <p className="text-sm leading-relaxed">{suggestion.text}</p>
                </li>
              )
            })}
          </ul>

          <div className="pt-4 border-t">
            <p className="text-xs text-muted-foreground italic">
              These are informational suggestions, not financial advice. Consider consulting with a fiduciary advisor for personalized guidance.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
