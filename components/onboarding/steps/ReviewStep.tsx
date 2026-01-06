'use client'

import { useMemo } from 'react'
import { User, DollarSign, Target, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { OnboardingWizardData } from '@/types/onboarding'
import {
  getTypicalSavingsRate,
  calculateRetirementSpending,
  IRS_LIMITS_2026,
} from '@/types/onboarding'

interface ReviewStepProps {
  wizardData: OnboardingWizardData
  onRunPlan: () => void
  isSubmitting: boolean
}

export function ReviewStep({ wizardData, onRunPlan, isSubmitting }: ReviewStepProps) {
  const { basics, savings, goals } = wizardData

  // Calculate total savings for display
  const totalAnnualSavings = useMemo(() => {
    let total = 0

    // Person 1 savings
    if (savings.savingsMode === 'typical' && savings.income > 0) {
      const rate = getTypicalSavingsRate(savings.income)
      total += savings.income * rate
    } else if (savings.savingsMode === 'custom') {
      total += (savings.custom401k || 0) + (savings.customIRA || 0) + (savings.customBackdoorRoth || 0) + (savings.customTaxable || 0)
    } else if (savings.savingsMode === 'max401k') {
      total += IRS_LIMITS_2026['401k']
    } else if (savings.savingsMode === 'supersaver') {
      total += IRS_LIMITS_2026['401k'] + IRS_LIMITS_2026.ira
    }

    // Person 2 savings (if married)
    if (basics.maritalStatus === 'married' && savings.spouseIncome) {
      if (savings.spouseSavingsMode === 'typical') {
        const rate = getTypicalSavingsRate(savings.spouseIncome)
        total += savings.spouseIncome * rate
      } else if (savings.spouseSavingsMode === 'custom') {
        total += (savings.spouseCustom401k || 0) + (savings.spouseCustomIRA || 0) + (savings.spouseCustomBackdoorRoth || 0) + (savings.spouseCustomTaxable || 0)
      } else if (savings.spouseSavingsMode === 'max401k') {
        total += IRS_LIMITS_2026['401k']
      } else if (savings.spouseSavingsMode === 'supersaver') {
        total += IRS_LIMITS_2026['401k'] + IRS_LIMITS_2026.ira
      }
    }

    return total
  }, [basics.maritalStatus, savings])

  const estimatedRetirementSpending = useMemo(() => {
    return calculateRetirementSpending(
      savings.income,
      savings.spouseIncome,
      goals.lifestylePreset,
      goals.customSpending
    )
  }, [savings.income, savings.spouseIncome, goals.lifestylePreset, goals.customSpending])

  const totalIncome = savings.income + (savings.spouseIncome || 0)

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        If this looks roughly right, let&apos;s run your plan. You can refine everything afterward.
      </p>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Personal Info Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Personal Info</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Age</p>
              <p className="text-lg font-semibold">{basics.age} years old</p>
            </div>
            {basics.maritalStatus === 'married' && basics.spouseAge && (
              <div>
                <p className="text-xs text-muted-foreground">Spouse Age</p>
                <p className="text-lg font-semibold">{basics.spouseAge} years old</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="text-lg font-semibold capitalize">{basics.maritalStatus}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">State</p>
              <p className="text-lg font-semibold">{basics.state || 'Not specified'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Income & Savings Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Income & Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div>
              <p className="text-xs text-muted-foreground">Total Annual Income</p>
              <p className="text-lg font-semibold">${totalIncome.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Annual Savings</p>
              <p className="text-lg font-semibold">${totalAnnualSavings.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Savings Rate</p>
              <p className="text-lg font-semibold">
                {totalIncome > 0 ? ((totalAnnualSavings / totalIncome) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Retirement Goals Card */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retirement Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Target Retirement Age</p>
                <p className="text-lg font-semibold">{goals.retirementAge}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Years Until Retirement</p>
                <p className="text-lg font-semibold">{goals.retirementAge - basics.age}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Lifestyle Preference</p>
                <p className="text-lg font-semibold capitalize">{goals.lifestylePreset}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Target Annual Spending</p>
                <p className="text-lg font-semibold">
                  ${estimatedRetirementSpending.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reassuring message */}
      <div className="bg-muted p-4 rounded-lg border">
        <p className="text-sm">
          <strong>Remember:</strong> This isn&apos;t about predicting the future – it&apos;s
          about preparing wisely for uncertainty. You don&apos;t need to get this perfect today.
          Small adjustments compound over time.
        </p>
      </div>

      {/* Run Plan Button */}
      <div className="flex flex-col items-center gap-3 pt-4">
        <Button
          size="lg"
          onClick={onRunPlan}
          disabled={isSubmitting}
          className="w-full md:w-auto"
        >
          {isSubmitting ? (
            'Running your plan...'
          ) : (
            <>
              Run my plan
              <ArrowRight className="ml-2 h-5 w-5" />
            </>
          )}
        </Button>
        <p className="text-xs text-muted-foreground text-center max-w-md">
          We&apos;ll run thousands of simulations to see how your plan performs across
          different market conditions.
        </p>
      </div>
    </div>
  )
}
