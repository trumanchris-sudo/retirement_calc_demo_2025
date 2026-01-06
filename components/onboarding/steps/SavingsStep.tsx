'use client'

import { useMemo, useEffect } from 'react'
import { Sparkles, Loader2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type {
  OnboardingSavingsData,
  OnboardingBasicsData,
  SavingsMode,
} from '@/types/onboarding'
import { getTypicalSavingsRate, IRS_LIMITS_2026 } from '@/types/onboarding'
import { useAIDefaults } from '@/hooks/useAIDefaults'

interface SavingsStepProps {
  data: OnboardingSavingsData
  basicsData: OnboardingBasicsData
  onChange: (data: Partial<OnboardingSavingsData>) => void
}

export function SavingsStep({ data, basicsData, onChange }: SavingsStepProps) {
  const isMarried = basicsData.maritalStatus === 'married'
  const { defaults, loading, fetchDefaults } = useAIDefaults()

  // Fetch AI defaults when component mounts with income data
  useEffect(() => {
    const shouldFetchDefaults =
      basicsData.age > 0 &&
      data.income > 0 &&
      data.savingsMode === 'typical' && // Only for typical mode
      !defaults && // Haven't fetched yet
      !loading // Not currently loading

    if (shouldFetchDefaults) {
      fetchDefaults({
        age: basicsData.age,
        spouseAge: basicsData.spouseAge,
        maritalStatus: basicsData.maritalStatus,
        income: data.income,
        spouseIncome: data.spouseIncome,
        state: basicsData.state || undefined,
      })
    }
  }, [basicsData, data.income, data.spouseIncome, data.savingsMode, defaults, loading, fetchDefaults])

  // Calculate typical savings rate and amounts
  // Use AI-suggested rate if available, otherwise use heuristic
  const typicalSavingsRate = useMemo(() => {
    if (defaults?.savingsRate) {
      return defaults.savingsRate
    }
    if (data.income > 0) {
      return getTypicalSavingsRate(data.income)
    }
    return 0.12 // Default 12%
  }, [data.income, defaults])

  const typicalSpouseSavingsRate = useMemo(() => {
    if (data.spouseIncome && data.spouseIncome > 0) {
      return getTypicalSavingsRate(data.spouseIncome)
    }
    return 0.12
  }, [data.spouseIncome])

  const totalSavingsAmount = useMemo(() => {
    let total = 0

    // Person 1 savings
    if (data.savingsMode === 'typical' && data.income > 0) {
      total += data.income * typicalSavingsRate
    } else if (data.savingsMode === 'custom') {
      total += (data.custom401k || 0) + (data.customIRA || 0) + (data.customBackdoorRoth || 0) + (data.customTaxable || 0)
    } else if (data.savingsMode === 'max401k') {
      total += IRS_LIMITS_2026['401k']
    } else if (data.savingsMode === 'supersaver') {
      // Max 401k + Backdoor Roth IRA
      total += IRS_LIMITS_2026['401k'] + IRS_LIMITS_2026.ira
    }

    // Person 2 savings (if married)
    if (isMarried && data.spouseIncome) {
      if (data.spouseSavingsMode === 'typical') {
        total += data.spouseIncome * typicalSpouseSavingsRate
      } else if (data.spouseSavingsMode === 'custom') {
        total += (data.spouseCustom401k || 0) + (data.spouseCustomIRA || 0) + (data.spouseCustomBackdoorRoth || 0) + (data.spouseCustomTaxable || 0)
      } else if (data.spouseSavingsMode === 'max401k') {
        total += IRS_LIMITS_2026['401k']
      } else if (data.spouseSavingsMode === 'supersaver') {
        total += IRS_LIMITS_2026['401k'] + IRS_LIMITS_2026.ira
      }
    }

    return total
  }, [data, isMarried, typicalSavingsRate, typicalSpouseSavingsRate])

  const totalIncome = data.income + (isMarried && data.spouseIncome ? data.spouseIncome : 0)
  const savingsPercentage = totalIncome > 0 ? (totalSavingsAmount / totalIncome) * 100 : 0

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0) {
      onChange({ income: value })
    }
  }

  const handleSpouseIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value)
    if (!isNaN(value) && value >= 0) {
      onChange({ spouseIncome: value })
    } else if (e.target.value === '') {
      onChange({ spouseIncome: undefined })
    }
  }

  const handleSavingsModeChange = (value: string) => {
    onChange({ savingsMode: value as SavingsMode })
  }

  const handleSpouseSavingsModeChange = (value: string) => {
    onChange({ spouseSavingsMode: value as SavingsMode })
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Tell us about your income and how much you&apos;re currently saving.
      </p>

      {/* Annual Income */}
      <div className="space-y-2">
        <Label htmlFor="income">Your annual income</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            $
          </span>
          <Input
            id="income"
            type="number"
            min={0}
            step={1000}
            value={data.income || ''}
            onChange={handleIncomeChange}
            placeholder="75000"
            className="pl-7"
          />
        </div>
      </div>

      {/* Spouse Annual Income (if married) */}
      {isMarried && (
        <div className="space-y-2">
          <Label htmlFor="spouseIncome">Spouse&apos;s annual income</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="spouseIncome"
              type="number"
              min={0}
              step={1000}
              value={data.spouseIncome || ''}
              onChange={handleSpouseIncomeChange}
              placeholder="75000"
              className="pl-7"
            />
          </div>
        </div>
      )}

      {/* AI-Generated Suggestions */}
      {loading && data.savingsMode === 'typical' && (
        <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
          <AlertDescription className="text-blue-900 dark:text-blue-100">
            Analyzing your profile to suggest optimal savings rates...
          </AlertDescription>
        </Alert>
      )}

      {defaults && data.savingsMode === 'typical' && (
        <Alert className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 border-purple-200 dark:border-purple-800">
          <Sparkles className="h-4 w-4 text-purple-600" />
          <AlertDescription className="space-y-2">
            <p className="font-medium text-purple-900 dark:text-purple-100">
              AI-Suggested Savings Plan
            </p>
            <ul className="space-y-1 text-sm text-purple-800 dark:text-purple-200">
              {defaults.reasoning.map((reason, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-purple-500 mt-0.5">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-purple-700 dark:text-purple-300 pt-2">
              These are personalized suggestions based on your age and income. You can adjust or choose a different savings approach below.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Savings Mode - Person 1 */}
      <div className="space-y-3">
        <Label>Your savings approach</Label>
        <RadioGroup
          value={data.savingsMode}
          onValueChange={handleSavingsModeChange}
          className="space-y-3"
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="max401k" id="max401k" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="max401k" className="font-normal cursor-pointer">
                Max out 401(k)
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Contribute the IRS maximum (${IRS_LIMITS_2026['401k'].toLocaleString()}/year)
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="supersaver" id="supersaver" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="supersaver" className="font-normal cursor-pointer">
                Super Saver
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Max 401(k) + Backdoor Roth IRA (${(IRS_LIMITS_2026['401k'] + IRS_LIMITS_2026.ira).toLocaleString()}/year)
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="typical" id="typical" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="typical" className="font-normal cursor-pointer">
                Typical savings rate
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                We&apos;ll use {(typicalSavingsRate * 100).toFixed(0)}% based on your income
              </p>
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="flex-1">
              <Label htmlFor="custom" className="font-normal cursor-pointer">
                Custom amounts
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Specify exact contribution amounts
              </p>
            </div>
          </div>
        </RadioGroup>
      </div>

      {/* Custom amounts for Person 1 */}
      {data.savingsMode === 'custom' && (
        <div className="space-y-4 pl-6 border-l-2">
          <div className="space-y-2">
            <Label htmlFor="custom401k">401(k) contribution</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="custom401k"
                type="number"
                min={0}
                value={data.custom401k || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  onChange({ custom401k: isNaN(value) ? 0 : value })
                }}
                placeholder="10000"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customIRA">Traditional IRA contribution</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="customIRA"
                type="number"
                min={0}
                value={data.customIRA || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  onChange({ customIRA: isNaN(value) ? 0 : value })
                }}
                placeholder="0"
                className="pl-7"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customBackdoorRoth">Backdoor Roth IRA</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="customBackdoorRoth"
                type="number"
                min={0}
                value={data.customBackdoorRoth || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  onChange({ customBackdoorRoth: isNaN(value) ? 0 : value })
                }}
                placeholder="7000"
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Annual contribution that will be converted to Roth (typically $7,000)
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="customTaxable">Other taxable savings</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="customTaxable"
                type="number"
                min={0}
                value={data.customTaxable || ''}
                onChange={(e) => {
                  const value = parseFloat(e.target.value)
                  onChange({ customTaxable: isNaN(value) ? 0 : value })
                }}
                placeholder="5000"
                className="pl-7"
              />
            </div>
          </div>
        </div>
      )}

      {/* Savings Mode - Person 2 (if married) */}
      {isMarried && data.spouseIncome && data.spouseIncome > 0 && (
        <>
          <div className="space-y-3">
            <Label>Spouse&apos;s savings approach</Label>
            <RadioGroup
              value={data.spouseSavingsMode || 'typical'}
              onValueChange={handleSpouseSavingsModeChange}
              className="space-y-3"
            >
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="max401k" id="spouse-max401k" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="spouse-max401k" className="font-normal cursor-pointer">
                    Max out 401(k)
                  </Label>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="supersaver" id="spouse-supersaver" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="spouse-supersaver" className="font-normal cursor-pointer">
                    Super Saver
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Max 401(k) + Backdoor Roth IRA
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="typical" id="spouse-typical" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="spouse-typical" className="font-normal cursor-pointer">
                    Typical savings rate
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {(typicalSpouseSavingsRate * 100).toFixed(0)}% based on spouse income
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="custom" id="spouse-custom" className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor="spouse-custom" className="font-normal cursor-pointer">
                    Custom amounts
                  </Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {/* Custom amounts for Person 2 */}
          {data.spouseSavingsMode === 'custom' && (
            <div className="space-y-4 pl-6 border-l-2">
              <div className="space-y-2">
                <Label htmlFor="spouseCustom401k">401(k) contribution</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="spouseCustom401k"
                    type="number"
                    min={0}
                    value={data.spouseCustom401k || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      onChange({ spouseCustom401k: isNaN(value) ? 0 : value })
                    }}
                    placeholder="10000"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouseCustomIRA">Traditional IRA contribution</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="spouseCustomIRA"
                    type="number"
                    min={0}
                    value={data.spouseCustomIRA || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      onChange({ spouseCustomIRA: isNaN(value) ? 0 : value })
                    }}
                    placeholder="0"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouseCustomBackdoorRoth">Backdoor Roth IRA</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="spouseCustomBackdoorRoth"
                    type="number"
                    min={0}
                    value={data.spouseCustomBackdoorRoth || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      onChange({ spouseCustomBackdoorRoth: isNaN(value) ? 0 : value })
                    }}
                    placeholder="7000"
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spouseCustomTaxable">Other taxable savings</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    id="spouseCustomTaxable"
                    type="number"
                    min={0}
                    value={data.spouseCustomTaxable || ''}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value)
                      onChange({ spouseCustomTaxable: isNaN(value) ? 0 : value })
                    }}
                    placeholder="5000"
                    className="pl-7"
                  />
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Summary */}
      {totalIncome > 0 && totalSavingsAmount > 0 && (
        <div className="bg-muted p-4 rounded-lg">
          <p className="text-sm font-medium">
            You&apos;re currently planning to save about{' '}
            <span className="text-primary font-bold">
              {savingsPercentage.toFixed(1)}%
            </span>{' '}
            of your gross income (
            <span className="font-semibold">
              ${totalSavingsAmount.toLocaleString()}
            </span>
            /year).
          </p>
        </div>
      )}
    </div>
  )
}
