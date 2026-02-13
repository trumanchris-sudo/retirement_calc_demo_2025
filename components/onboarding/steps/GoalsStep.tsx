'use client'

import { useMemo, useEffect } from 'react'
import { Sparkles, Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type {
  OnboardingGoalsData,
  OnboardingSavingsData,
  LifestylePreset,
} from '@/types/onboarding'
import { calculateRetirementSpending } from '@/types/onboarding'
import { useAIDefaults } from '@/hooks/useAIDefaults'

interface GoalsStepProps {
  data: OnboardingGoalsData
  savingsData: OnboardingSavingsData
  basicsData: { age: number; spouseAge?: number; maritalStatus: 'single' | 'married'; state?: string }
  onChange: (data: Partial<OnboardingGoalsData>) => void
}

export function GoalsStep({ data, savingsData, basicsData, onChange }: GoalsStepProps) {
  const totalIncome = savingsData.income + (savingsData.spouseIncome || 0)
  const { defaults } = useAIDefaults()

  // Apply AI-suggested retirement age if user hasn't changed from default
  useEffect(() => {
    if (defaults?.retirementAge && data.retirementAge === 65) {
      // Only auto-update if still at default value
      onChange({ retirementAge: defaults.retirementAge })
    }
  }, [defaults, data.retirementAge, onChange])

  const estimatedSpending = useMemo(() => {
    return calculateRetirementSpending(
      savingsData.income,
      savingsData.spouseIncome,
      data.lifestylePreset,
      data.customSpending
    )
  }, [savingsData.income, savingsData.spouseIncome, data.lifestylePreset, data.customSpending])

  const handleRetirementAgeChange = (value: number[]) => {
    onChange({ retirementAge: value[0] })
  }

  const handleRetirementAgeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value)) {
      // Constrain to valid range (must be > current age and within 50-80)
      const minAge = Math.max(50, basicsData.age + 1)
      const constrainedAge = Math.min(80, Math.max(minAge, value))
      onChange({ retirementAge: constrainedAge })
    }
  }

  const handleLifestyleChange = (value: string) => {
    onChange({ lifestylePreset: value as LifestylePreset })
  }

  const handleCustomSpendingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0) {
      onChange({ customSpending: value })
    }
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        We&apos;ll translate this into a spending plan, with taxes and market risk included.
      </p>

      {/* Target Retirement Age */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label htmlFor="retirementAge">Target retirement age</Label>
          <Input
            id="retirementAge"
            type="number"
            min={50}
            max={80}
            value={data.retirementAge}
            onChange={handleRetirementAgeInputChange}
            className="w-20 text-center"
          />
        </div>
        <Slider
          value={[data.retirementAge]}
          onValueChange={handleRetirementAgeChange}
          min={50}
          max={80}
          step={1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>50</span>
          <span>65</span>
          <span>80</span>
        </div>
        {defaults && (
          <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
            <Info className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <AlertDescription className="text-sm text-purple-900 dark:text-purple-100">
              Based on your age ({basicsData.age}) and income, retiring at age {defaults.retirementAge} provides a balanced timeline. Adjust if needed!
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Retirement Lifestyle */}
      <div className="space-y-3">
        <Label>Desired retirement lifestyle</Label>
        <RadioGroup
          value={data.lifestylePreset}
          onValueChange={handleLifestyleChange}
          className="space-y-3"
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="lean" id="lean" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="lean" className="font-normal cursor-pointer">
                Lean
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Modest lifestyle, ~60% of pre-retirement income
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="comfortable" id="comfortable" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="comfortable" className="font-normal cursor-pointer">
                Comfortable
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Maintain current lifestyle, ~80% of pre-retirement income
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="luxurious" id="luxurious" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="luxurious" className="font-normal cursor-pointer">
                Luxurious
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Enhanced lifestyle, ~120% of pre-retirement income
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="custom" id="custom-lifestyle" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="custom-lifestyle" className="font-normal cursor-pointer">
                Custom amount
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Specify your own target spending
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Custom Spending (if selected) */}
      {data.lifestylePreset === 'custom' && (
        <div className="space-y-2 pl-6 border-l-2">
          <Label htmlFor="customSpending">Annual retirement spending (today&apos;s dollars)</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="customSpending"
              type="number"
              min={0}
              step={1000}
              value={data.customSpending || ''}
              onChange={handleCustomSpendingChange}
              placeholder="60000"
              className="pl-7"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This is your desired after-tax spending in retirement, adjusted for inflation.
          </p>
        </div>
      )}

      {/* Estimated Spending Summary */}
      {totalIncome > 0 && estimatedSpending > 0 && (
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">
            Based on your selections:
          </p>
          <p className="text-lg font-bold text-primary">
            ${estimatedSpending.toLocaleString()}/year
          </p>
          <p className="text-xs text-muted-foreground">
            This is your estimated annual after-tax spending in retirement (in today&apos;s dollars).
            We&apos;ll account for inflation, taxes, and market volatility in the full calculation.
          </p>
        </div>
      )}

      {/* Helpful context */}
      <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-900 dark:text-blue-100">
          <strong>Quick tip:</strong> Most people need 70-80% of their pre-retirement income
          to maintain their lifestyle. We&apos;ve already factored in that you won&apos;t be
          saving for retirement anymore, but you&apos;ll want to account for healthcare,
          travel, and other expenses.
        </p>
      </div>
    </div>
  )
}
