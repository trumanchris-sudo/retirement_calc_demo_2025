'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Home,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calculator,
  Info,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Scale,
  ArrowRight,
  PiggyBank,
  Building2,
  Users,
  Heart,
  Shield,
  FileText,
  HelpCircle,
  ChevronRight,
  Percent,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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

// ==================== Types ====================

interface HomeEquityInputs {
  // Current home situation
  homeValue: number
  mortgageBalance: number
  monthlyMortgagePayment: number
  mortgageRate: number
  yearsRemaining: number
  // Net worth context
  totalNetWorth: number
  // Downsizing scenario
  newHomePrice: number
  movingCosts: number
  sellingCosts: number // Realtor fees, closing costs (typically 8-10%)
  // Reverse mortgage
  age: number
  spouseAge: number
  // Investment assumptions
  expectedReturn: number
  inflationRate: number
  // State for property taxes
  state: string
}

interface EquityAccessOption {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  pros: string[]
  cons: string[]
  bestFor: string
}

interface DownsizeResult {
  grossProceeds: number
  sellingCosts: number
  netProceeds: number
  newHomeCost: number
  movingCosts: number
  netEquityReleased: number
  investmentProjection10Year: number
  investmentProjection20Year: number
  monthlyIncomeAt4Percent: number
}

interface MortgagePayoffComparison {
  payOffNow: {
    totalInterestSaved: number
    opportunityCost: number
    netBenefit: number
  }
  investInstead: {
    projectedGrowth: number
    netGain: number
  }
  recommendation: 'payoff' | 'invest' | 'neutral'
  reasoning: string
}

// ==================== Constants ====================

const EQUITY_ACCESS_OPTIONS: EquityAccessOption[] = [
  {
    id: 'downsize',
    name: 'Downsize',
    description: 'Sell current home, buy smaller/cheaper property, invest the difference',
    icon: <Building2 className="h-5 w-5" />,
    pros: [
      'Unlock substantial equity',
      'Lower maintenance costs',
      'Reduced property taxes',
      'Full ownership of proceeds',
    ],
    cons: [
      'Emotional attachment to home',
      'Moving costs and hassle',
      'Market timing risk',
      'May need to move away from community',
    ],
    bestFor: 'Retirees with more space than needed who want to simplify and unlock equity',
  },
  {
    id: 'reverse',
    name: 'Reverse Mortgage (HECM)',
    description: 'Borrow against equity, no payments required while living in home',
    icon: <Home className="h-5 w-5" />,
    pros: [
      'Stay in your home',
      'No monthly payments required',
      'Non-recourse (can\'t owe more than home value)',
      'Flexible payout options',
    ],
    cons: [
      'Fees can be high (2-5% of home value)',
      'Reduces inheritance for heirs',
      'Must maintain home and pay taxes',
      'Complex product to understand',
    ],
    bestFor: 'Homeowners 62+ who want to age in place and need supplemental income',
  },
  {
    id: 'heloc',
    name: 'Home Equity Loan/HELOC',
    description: 'Borrow against equity with regular payments required',
    icon: <DollarSign className="h-5 w-5" />,
    pros: [
      'Lower interest rates than unsecured debt',
      'Keep your home',
      'Interest may be tax-deductible',
      'Flexible access to funds',
    ],
    cons: [
      'Monthly payments required',
      'Risk of foreclosure if can\'t pay',
      'Variable rates on HELOC',
      'Reduces equity over time',
    ],
    bestFor: 'Those who need one-time funds and have income to make payments',
  },
  {
    id: 'rent',
    name: 'Rent Out Rooms',
    description: 'Generate income while keeping your home',
    icon: <Users className="h-5 w-5" />,
    pros: [
      'Keep your home',
      'Steady income stream',
      'Companionship benefit',
      'No borrowing required',
    ],
    cons: [
      'Loss of privacy',
      'Landlord responsibilities',
      'Finding good tenants',
      'May affect property insurance',
    ],
    bestFor: 'Retirees comfortable with housemates who want extra income',
  },
]

// Senior property tax exemptions by state (simplified)
const STATE_EXEMPTIONS: Record<string, { name: string; exemption: string; age: number }> = {
  CA: { name: 'California', exemption: 'Prop 13 limits increases to 2%/year', age: 55 },
  TX: { name: 'Texas', exemption: 'Over-65 exemption + school tax freeze', age: 65 },
  FL: { name: 'Florida', exemption: 'Additional $50K homestead for 65+', age: 65 },
  NY: { name: 'New York', exemption: 'STAR Plus Enhanced (65+)', age: 65 },
  PA: { name: 'Pennsylvania', exemption: 'Property Tax/Rent Rebate program', age: 65 },
  AZ: { name: 'Arizona', exemption: 'Senior freeze + widow exemption', age: 65 },
  NV: { name: 'Nevada', exemption: 'Senior citizen tax rebate', age: 62 },
  WA: { name: 'Washington', exemption: 'Senior exemption program', age: 61 },
  CO: { name: 'Colorado', exemption: 'Senior homestead exemption', age: 65 },
  GA: { name: 'Georgia', exemption: 'Double homestead for 65+', age: 65 },
}

// ==================== Helper Functions ====================

function calculateEquity(homeValue: number, mortgageBalance: number): number {
  return Math.max(0, homeValue - mortgageBalance)
}

function calculateEquityPercentOfNetWorth(equity: number, netWorth: number): number {
  if (netWorth <= 0) return 0
  return (equity / netWorth) * 100
}

function calculateDownsizeScenario(
  inputs: HomeEquityInputs
): DownsizeResult {
  const grossProceeds = inputs.homeValue
  const sellingCosts = inputs.homeValue * (inputs.sellingCosts / 100)
  const netProceeds = grossProceeds - sellingCosts - inputs.mortgageBalance
  const netEquityReleased = netProceeds - inputs.newHomePrice - inputs.movingCosts

  // Investment projection using compound interest
  const monthlyReturn = inputs.expectedReturn / 100 / 12
  const months10Year = 120
  const months20Year = 240

  const investmentProjection10Year = netEquityReleased * Math.pow(1 + inputs.expectedReturn / 100, 10)
  const investmentProjection20Year = netEquityReleased * Math.pow(1 + inputs.expectedReturn / 100, 20)

  // Monthly income at 4% safe withdrawal rate
  const monthlyIncomeAt4Percent = (netEquityReleased * 0.04) / 12

  return {
    grossProceeds,
    sellingCosts,
    netProceeds,
    newHomeCost: inputs.newHomePrice,
    movingCosts: inputs.movingCosts,
    netEquityReleased,
    investmentProjection10Year,
    investmentProjection20Year,
    monthlyIncomeAt4Percent,
  }
}

function calculateReverseMortgageEstimate(
  homeValue: number,
  age: number,
  mortgageBalance: number
): { principalLimit: number; availableEquity: number; disclaimer: string } {
  // Simplified HECM principal limit calculation
  // Real calculation depends on expected interest rates and age
  // Using rough PLF (Principal Limit Factor) estimates

  if (age < 62) {
    return {
      principalLimit: 0,
      availableEquity: 0,
      disclaimer: 'Must be 62 or older to qualify for HECM reverse mortgage',
    }
  }

  // PLF increases with age, roughly 40-75% of home value
  const basePLF = 0.40
  const ageBonus = Math.min((age - 62) * 0.01, 0.35) // 1% per year over 62, max 35%
  const plf = basePLF + ageBonus

  // HUD maximum claim amount (2026 limit)
  const maxClaimAmount = Math.min(homeValue, 1149825)

  const principalLimit = maxClaimAmount * plf
  const availableEquity = Math.max(0, principalLimit - mortgageBalance)

  return {
    principalLimit,
    availableEquity,
    disclaimer: 'Estimate only. Actual amounts depend on current interest rates and HUD limits.',
  }
}

function calculateMortgagePayoffComparison(
  mortgageBalance: number,
  mortgageRate: number,
  yearsRemaining: number,
  monthlyPayment: number,
  expectedReturn: number
): MortgagePayoffComparison {
  // Calculate total interest remaining on mortgage
  const totalPayments = monthlyPayment * yearsRemaining * 12
  const totalInterest = totalPayments - mortgageBalance

  // Calculate opportunity cost (investing mortgage balance instead)
  const investedGrowth = mortgageBalance * (Math.pow(1 + expectedReturn / 100, yearsRemaining) - 1)

  // If investing returns > mortgage rate, math says invest
  // But include emotional value of debt-free
  const netPayoff = totalInterest - 0 // No opportunity cost if you pay off
  const netInvest = investedGrowth - totalInterest

  const mathFavorsInvesting = expectedReturn > mortgageRate
  const difference = Math.abs(netInvest)
  const isSignificant = difference > mortgageBalance * 0.1 // More than 10% difference

  let recommendation: 'payoff' | 'invest' | 'neutral'
  let reasoning: string

  if (!isSignificant) {
    recommendation = 'neutral'
    reasoning = `The difference is small (${fmtFull(difference)}). Consider the emotional value of being debt-free.`
  } else if (mathFavorsInvesting) {
    recommendation = 'invest'
    reasoning = `Investing could earn ${fmtFull(netInvest)} more than paying off the mortgage, given your ${expectedReturn}% expected return vs ${mortgageRate}% mortgage rate.`
  } else {
    recommendation = 'payoff'
    reasoning = `Paying off saves ${fmtFull(totalInterest)} in interest. With your ${mortgageRate}% mortgage rate exceeding likely investment returns, this is the safer choice.`
  }

  return {
    payOffNow: {
      totalInterestSaved: totalInterest,
      opportunityCost: investedGrowth,
      netBenefit: totalInterest - investedGrowth,
    },
    investInstead: {
      projectedGrowth: mortgageBalance + investedGrowth,
      netGain: investedGrowth - totalInterest,
    },
    recommendation,
    reasoning,
  }
}

// ==================== Sub-Components ====================

interface EquityGaugeProps {
  equity: number
  percentOfNetWorth: number
  homeValue: number
}

function EquityGauge({ equity, percentOfNetWorth, homeValue }: EquityGaugeProps) {
  const ltv = homeValue > 0 ? ((homeValue - equity) / homeValue) * 100 : 0

  const getEquityColor = () => {
    if (percentOfNetWorth > 70) return 'text-amber-600'
    if (percentOfNetWorth > 50) return 'text-blue-600'
    return 'text-green-600'
  }

  const getLTVColor = () => {
    if (ltv > 80) return 'text-red-600'
    if (ltv > 60) return 'text-amber-600'
    return 'text-green-600'
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Home className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className={TYPOGRAPHY.metricLabel}>Home Equity</span>
          </div>
          <p className={`${TYPOGRAPHY.metricLarge} text-blue-700 dark:text-blue-300`}>
            {fmt(equity)}
          </p>
          <p className={TYPOGRAPHY.helperText}>
            {homeValue > 0 ? `${(100 - ltv).toFixed(0)}% of home value` : 'Enter home value'}
          </p>
        </div>

        <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <PiggyBank className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            <span className={TYPOGRAPHY.metricLabel}>% of Net Worth</span>
          </div>
          <p className={`${TYPOGRAPHY.metricLarge} ${getEquityColor()}`}>
            {percentOfNetWorth.toFixed(0)}%
          </p>
          <p className={TYPOGRAPHY.helperText}>
            {percentOfNetWorth > 50 ? 'Home-heavy portfolio' : 'Diversified portfolio'}
          </p>
        </div>
      </div>

      {/* LTV Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className={TYPOGRAPHY.metricLabel}>Loan-to-Value Ratio</span>
          <span className={`font-medium ${getLTVColor()}`}>{ltv.toFixed(0)}%</span>
        </div>
        <div className="relative h-4 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              ltv > 80 ? 'bg-red-500' : ltv > 60 ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(ltv, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0% (Paid off)</span>
          <span>80% (High LTV)</span>
          <span>100%</span>
        </div>
      </div>

      {percentOfNetWorth > 60 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className={TYPOGRAPHY.helperText}>
              Your home represents {percentOfNetWorth.toFixed(0)}% of your net worth.
              Consider diversifying by accessing some equity for investments.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== Main Component ====================

export interface HomeEquityRetirementProps {
  /** Initial home value from net worth */
  initialHomeValue?: number
  /** Initial mortgage balance */
  initialMortgageBalance?: number
  /** Total net worth for context */
  totalNetWorth?: number
  /** Current age for reverse mortgage calculations */
  currentAge?: number
  /** Expected investment return */
  expectedReturn?: number
  /** Compact mode for embedding */
  compact?: boolean
}

export function HomeEquityRetirement({
  initialHomeValue = 600000,
  initialMortgageBalance = 200000,
  totalNetWorth = 1000000,
  currentAge = 65,
  expectedReturn = 7,
  compact = false,
}: HomeEquityRetirementProps) {
  // Form state
  const [inputs, setInputs] = useState<HomeEquityInputs>({
    homeValue: initialHomeValue,
    mortgageBalance: initialMortgageBalance,
    monthlyMortgagePayment: 1500,
    mortgageRate: 4.5,
    yearsRemaining: 15,
    totalNetWorth: totalNetWorth,
    newHomePrice: 400000,
    movingCosts: 15000,
    sellingCosts: 8,
    age: currentAge,
    spouseAge: currentAge - 2,
    expectedReturn: expectedReturn,
    inflationRate: 2.5,
    state: 'CA',
  })

  const [activeTab, setActiveTab] = useState('overview')
  const [selectedOption, setSelectedOption] = useState<string | null>(null)

  // Update handler
  const updateInput = useCallback(
    <K extends keyof HomeEquityInputs>(key: K, value: HomeEquityInputs[K]) => {
      setInputs(prev => ({ ...prev, [key]: value }))
    },
    []
  )

  // Calculations
  const equity = useMemo(
    () => calculateEquity(inputs.homeValue, inputs.mortgageBalance),
    [inputs.homeValue, inputs.mortgageBalance]
  )

  const equityPercentOfNetWorth = useMemo(
    () => calculateEquityPercentOfNetWorth(equity, inputs.totalNetWorth),
    [equity, inputs.totalNetWorth]
  )

  const downsizeResult = useMemo(
    () => calculateDownsizeScenario(inputs),
    [inputs]
  )

  const reverseMortgage = useMemo(
    () => calculateReverseMortgageEstimate(inputs.homeValue, inputs.age, inputs.mortgageBalance),
    [inputs.homeValue, inputs.age, inputs.mortgageBalance]
  )

  const mortgageComparison = useMemo(
    () => calculateMortgagePayoffComparison(
      inputs.mortgageBalance,
      inputs.mortgageRate,
      inputs.yearsRemaining,
      inputs.monthlyMortgagePayment,
      inputs.expectedReturn
    ),
    [inputs.mortgageBalance, inputs.mortgageRate, inputs.yearsRemaining, inputs.monthlyMortgagePayment, inputs.expectedReturn]
  )

  const stateExemption = useMemo(
    () => STATE_EXEMPTIONS[inputs.state] || null,
    [inputs.state]
  )

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header */}
      <Card className="border-2 border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-background">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                Home Equity in Retirement
              </CardTitle>
              <CardDescription className="max-w-xl">
                For many retirees, their home is their biggest asset.
                Learn how to use it wisely - whether staying, downsizing, or accessing equity.
              </CardDescription>
            </div>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200">
              Your Biggest Asset
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <EquityGauge
            equity={equity}
            percentOfNetWorth={equityPercentOfNetWorth}
            homeValue={inputs.homeValue}
          />
        </CardContent>
      </Card>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="downsize">Downsize</TabsTrigger>
          <TabsTrigger value="reverse">Reverse Mtg</TabsTrigger>
          <TabsTrigger value="payoff">Payoff vs Invest</TabsTrigger>
          <TabsTrigger value="taxes">Property Tax</TabsTrigger>
          <TabsTrigger value="estate">Estate</TabsTrigger>
        </TabsList>

        {/* Overview Tab - Current Equity & Options */}
        <TabsContent value="overview" className="space-y-6 mt-4">
          {/* Input Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="h-5 w-5" />
                  Your Home Situation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>Home Value</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.homeValue}
                        onChange={e => updateInput('homeValue', Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>Mortgage Balance</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.mortgageBalance}
                        onChange={e => updateInput('mortgageBalance', Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>Total Net Worth</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.totalNetWorth}
                        onChange={e => updateInput('totalNetWorth', Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>Your Age</Label>
                    <Input
                      type="number"
                      value={inputs.age}
                      onChange={e => updateInput('age', Number(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="pt-4 border-t space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Mortgage Details</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label className={TYPOGRAPHY.helperText}>Monthly Payment</Label>
                      <Input
                        type="number"
                        value={inputs.monthlyMortgagePayment}
                        onChange={e => updateInput('monthlyMortgagePayment', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={TYPOGRAPHY.helperText}>Interest Rate %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={inputs.mortgageRate}
                        onChange={e => updateInput('mortgageRate', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className={TYPOGRAPHY.helperText}>Years Left</Label>
                      <Input
                        type="number"
                        value={inputs.yearsRemaining}
                        onChange={e => updateInput('yearsRemaining', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Options Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Info className="h-5 w-5" />
                  Options for Accessing Equity
                </CardTitle>
                <CardDescription>
                  Click an option to learn more
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {EQUITY_ACCESS_OPTIONS.map(option => (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedOption === option.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                          : 'border-border hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                      }`}
                      onClick={() => setSelectedOption(selectedOption === option.id ? null : option.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedOption === option.id
                            ? 'bg-blue-100 dark:bg-blue-900/50'
                            : 'bg-slate-100 dark:bg-slate-800'
                        }`}>
                          {option.icon}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">{option.name}</h4>
                          <p className={TYPOGRAPHY.helperText}>{option.description}</p>
                        </div>
                        <ChevronRight className={`h-5 w-5 text-muted-foreground transition-transform ${
                          selectedOption === option.id ? 'rotate-90' : ''
                        }`} />
                      </div>

                      {selectedOption === option.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <h5 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center gap-1">
                                <CheckCircle2 className="h-4 w-4" /> Pros
                              </h5>
                              <ul className="space-y-1">
                                {option.pros.map((pro, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="text-green-500">+</span> {pro}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <h5 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2 flex items-center gap-1">
                                <XCircle className="h-4 w-4" /> Cons
                              </h5>
                              <ul className="space-y-1">
                                {option.cons.map((con, i) => (
                                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                    <span className="text-red-500">-</span> {con}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                          <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                            <strong>Best for:</strong> {option.bestFor}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Downsize Calculator Tab */}
        <TabsContent value="downsize" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Downsize Calculator
                </CardTitle>
                <CardDescription>
                  See how much you could unlock by moving to a smaller home
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className={TYPOGRAPHY.body}>Current Home Value</span>
                    <span className="font-semibold">{fmtFull(inputs.homeValue)}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span className={TYPOGRAPHY.body}>Mortgage Balance</span>
                    <span className="font-semibold text-red-600">-{fmtFull(inputs.mortgageBalance)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Current Equity</span>
                    <span className="font-bold text-green-600">{fmtFull(equity)}</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className={TYPOGRAPHY.inputLabel}>New Home Price</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="number"
                        value={inputs.newHomePrice}
                        onChange={e => updateInput('newHomePrice', Number(e.target.value) || 0)}
                        className="pl-9"
                      />
                    </div>
                    <Slider
                      value={[inputs.newHomePrice]}
                      onValueChange={([v]) => updateInput('newHomePrice', v)}
                      min={100000}
                      max={inputs.homeValue}
                      step={10000}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Moving Costs</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          value={inputs.movingCosts}
                          onChange={e => updateInput('movingCosts', Number(e.target.value) || 0)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Selling Costs %</Label>
                      <div className="relative">
                        <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="number"
                          step="0.5"
                          value={inputs.sellingCosts}
                          onChange={e => updateInput('sellingCosts', Number(e.target.value) || 0)}
                          className="pl-9"
                        />
                      </div>
                      <p className={TYPOGRAPHY.helperText}>Realtor fees, closing costs (~8%)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Downsize Results
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Transaction Summary */}
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className={TYPOGRAPHY.bodyMuted}>Gross Proceeds</span>
                    <span>{fmtFull(downsizeResult.grossProceeds)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Selling Costs ({inputs.sellingCosts}%)</span>
                    <span>-{fmtFull(downsizeResult.sellingCosts)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Mortgage Payoff</span>
                    <span>-{fmtFull(inputs.mortgageBalance)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span className="font-medium">Net Proceeds</span>
                    <span className="font-medium">{fmtFull(downsizeResult.netProceeds)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>New Home Cost</span>
                    <span>-{fmtFull(downsizeResult.newHomeCost)}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Moving Costs</span>
                    <span>-{fmtFull(downsizeResult.movingCosts)}</span>
                  </div>
                </div>

                {/* Net Result */}
                <div className={`p-4 rounded-lg ${
                  downsizeResult.netEquityReleased > 0
                    ? 'bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800'
                    : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800'
                }`}>
                  <div className="text-center">
                    <p className={TYPOGRAPHY.metricLabel}>Net Equity Released</p>
                    <p className={`${TYPOGRAPHY.metricLarge} ${
                      downsizeResult.netEquityReleased > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {fmtFull(downsizeResult.netEquityReleased)}
                    </p>
                  </div>
                </div>

                {downsizeResult.netEquityReleased > 0 && (
                  <>
                    {/* Investment Projections */}
                    <div className="space-y-3">
                      <h4 className="font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        If Invested at {inputs.expectedReturn}% Return
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                          <p className={TYPOGRAPHY.metricLabel}>After 10 Years</p>
                          <p className="text-xl font-bold text-blue-600">
                            {fmt(downsizeResult.investmentProjection10Year)}
                          </p>
                        </div>
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 rounded-lg">
                          <p className={TYPOGRAPHY.metricLabel}>After 20 Years</p>
                          <p className="text-xl font-bold text-purple-600">
                            {fmt(downsizeResult.investmentProjection20Year)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Monthly Income */}
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
                      <div className="text-center">
                        <p className={TYPOGRAPHY.metricLabel}>Monthly Income at 4% Withdrawal</p>
                        <p className={`${TYPOGRAPHY.metricMedium} text-emerald-600`}>
                          {fmtFull(downsizeResult.monthlyIncomeAt4Percent)}/mo
                        </p>
                        <p className={TYPOGRAPHY.helperText}>
                          {fmtFull(downsizeResult.monthlyIncomeAt4Percent * 12)}/year sustainable income
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reverse Mortgage Tab */}
        <TabsContent value="reverse" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Reverse Mortgage (HECM) Basics
                </CardTitle>
                <CardDescription>
                  Home Equity Conversion Mortgage - Stay in your home, access your equity
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Age Check */}
                {inputs.age < 62 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Age Requirement Not Met</h4>
                        <p className={TYPOGRAPHY.bodyMuted}>
                          You must be 62 or older to qualify for a HECM reverse mortgage.
                          You are currently {inputs.age}. Check back in {62 - inputs.age} years.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span className="font-medium">You meet the age requirement (62+)</span>
                    </div>
                  </div>
                )}

                {/* Estimate */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <h4 className="font-medium mb-3">Estimated Available Equity</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>Principal Limit</span>
                      <span className="font-medium">{fmtFull(reverseMortgage.principalLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.bodyMuted}>Less Mortgage Payoff</span>
                      <span className="text-red-600">-{fmtFull(inputs.mortgageBalance)}</span>
                    </div>
                    <div className="flex justify-between pt-2 border-t">
                      <span className="font-medium">Available to You</span>
                      <span className="font-bold text-blue-600">{fmtFull(reverseMortgage.availableEquity)}</span>
                    </div>
                  </div>
                  <p className={`${TYPOGRAPHY.helperText} mt-3 italic`}>
                    {reverseMortgage.disclaimer}
                  </p>
                </div>

                {/* Payout Options */}
                <div className="space-y-3">
                  <h4 className="font-medium">Payout Options</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { name: 'Lump Sum', desc: 'One-time payment at closing' },
                      { name: 'Line of Credit', desc: 'Access as needed, grows if unused' },
                      { name: 'Monthly Tenure', desc: 'Equal payments for life' },
                      { name: 'Term Payments', desc: 'Equal payments for set period' },
                    ].map((opt, i) => (
                      <div key={i} className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                        <h5 className="font-medium text-sm">{opt.name}</h5>
                        <p className={TYPOGRAPHY.helperText}>{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5" />
                  The Truth About Reverse Mortgages
                </CardTitle>
                <CardDescription>
                  Not as scary as people think
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger>Can the bank take my home?</AccordionTrigger>
                    <AccordionContent>
                      <p className={TYPOGRAPHY.body}>
                        <strong>No.</strong> As long as you live in the home, pay property taxes,
                        maintain homeowners insurance, and keep the home in reasonable condition,
                        you cannot be forced out. This is protected by federal regulations.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-2">
                    <AccordionTrigger>Can I owe more than my home is worth?</AccordionTrigger>
                    <AccordionContent>
                      <p className={TYPOGRAPHY.body}>
                        <strong>You can, but you never have to pay the difference.</strong> HECM loans
                        are "non-recourse" - if the loan balance exceeds the home value when you die or
                        sell, FHA insurance covers the difference. Your heirs are protected.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-3">
                    <AccordionTrigger>What happens when I die?</AccordionTrigger>
                    <AccordionContent>
                      <p className={TYPOGRAPHY.body}>
                        Your heirs have options: (1) Pay off the loan and keep the home,
                        (2) Sell the home and keep any equity above the loan balance, or
                        (3) Walk away if the loan exceeds home value (no obligation to pay difference).
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-4">
                    <AccordionTrigger>What are the downsides?</AccordionTrigger>
                    <AccordionContent>
                      <div className={TYPOGRAPHY.body}>
                        <ul className="list-disc pl-4 space-y-2">
                          <li><strong>Fees:</strong> Origination fees, closing costs, and mortgage insurance
                          can total 2-5% of home value.</li>
                          <li><strong>Reduced inheritance:</strong> Less equity passes to heirs.</li>
                          <li><strong>Rising balance:</strong> Interest accrues, increasing what is owed over time.</li>
                          <li><strong>Complexity:</strong> Requires HUD counseling to ensure you understand.</li>
                        </ul>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="item-5">
                    <AccordionTrigger>Who is it good for?</AccordionTrigger>
                    <AccordionContent>
                      <p className={TYPOGRAPHY.body}>
                        Reverse mortgages work well for homeowners who: plan to age in place,
                        need supplemental income, have significant home equity, do not plan to leave
                        the home to heirs, and can afford ongoing property taxes and maintenance.
                      </p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <div className="flex items-start gap-2">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <p className={TYPOGRAPHY.body}>
                      <strong>Required:</strong> All HECM borrowers must complete independent
                      HUD-approved counseling before getting a reverse mortgage. This protects
                      you from predatory lending.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payoff vs Invest Tab */}
        <TabsContent value="payoff" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5" />
                Should You Pay Off Your Mortgage?
              </CardTitle>
              <CardDescription>
                The eternal debate: emotional peace vs. mathematical optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Scenario Inputs */}
                <div className="space-y-4">
                  <h4 className="font-medium">Your Situation</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Mortgage Balance</Label>
                      <Input
                        type="number"
                        value={inputs.mortgageBalance}
                        onChange={e => updateInput('mortgageBalance', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Mortgage Rate %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={inputs.mortgageRate}
                        onChange={e => updateInput('mortgageRate', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Years Remaining</Label>
                      <Input
                        type="number"
                        value={inputs.yearsRemaining}
                        onChange={e => updateInput('yearsRemaining', Number(e.target.value) || 0)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className={TYPOGRAPHY.inputLabel}>Expected Return %</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={inputs.expectedReturn}
                        onChange={e => updateInput('expectedReturn', Number(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Comparison Results */}
                <div className="space-y-4">
                  <h4 className="font-medium">The Math</h4>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Pay Off Scenario */}
                    <div className={`p-4 rounded-lg border ${
                      mortgageComparison.recommendation === 'payoff'
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : 'bg-slate-50 dark:bg-slate-900/50'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="h-5 w-5 text-green-600" />
                        <h5 className="font-medium">Pay Off Now</h5>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Interest Saved</span>
                          <span className="font-medium text-green-600">
                            +{fmtFull(mortgageComparison.payOffNow.totalInterestSaved)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Opportunity Cost</span>
                          <span className="font-medium text-red-600">
                            -{fmtFull(mortgageComparison.payOffNow.opportunityCost)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium">Net Benefit</span>
                          <span className={`font-bold ${
                            mortgageComparison.payOffNow.netBenefit > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mortgageComparison.payOffNow.netBenefit > 0 ? '+' : ''}
                            {fmtFull(mortgageComparison.payOffNow.netBenefit)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Invest Instead Scenario */}
                    <div className={`p-4 rounded-lg border ${
                      mortgageComparison.recommendation === 'invest'
                        ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                        : 'bg-slate-50 dark:bg-slate-900/50'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <h5 className="font-medium">Invest Instead</h5>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Projected Growth</span>
                          <span className="font-medium text-blue-600">
                            {fmtFull(mortgageComparison.investInstead.projectedGrowth)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Minus Interest Paid</span>
                          <span className="font-medium text-red-600">
                            -{fmtFull(mortgageComparison.payOffNow.totalInterestSaved)}
                          </span>
                        </div>
                        <div className="flex justify-between pt-2 border-t">
                          <span className="font-medium">Net Gain</span>
                          <span className={`font-bold ${
                            mortgageComparison.investInstead.netGain > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {mortgageComparison.investInstead.netGain > 0 ? '+' : ''}
                            {fmtFull(mortgageComparison.investInstead.netGain)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div className={`p-4 rounded-lg border ${
                    mortgageComparison.recommendation === 'payoff'
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200'
                      : mortgageComparison.recommendation === 'invest'
                      ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      {mortgageComparison.recommendation === 'payoff' ? (
                        <Heart className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : mortgageComparison.recommendation === 'invest' ? (
                        <TrendingUp className="h-5 w-5 text-blue-600 mt-0.5" />
                      ) : (
                        <Scale className="h-5 w-5 text-amber-600 mt-0.5" />
                      )}
                      <div>
                        <h4 className="font-medium">
                          {mortgageComparison.recommendation === 'payoff' && 'Leaning: Pay Off Mortgage'}
                          {mortgageComparison.recommendation === 'invest' && 'Leaning: Keep Investing'}
                          {mortgageComparison.recommendation === 'neutral' && 'It is Close Either Way'}
                        </h4>
                        <p className={TYPOGRAPHY.bodyMuted}>{mortgageComparison.reasoning}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Emotional vs Mathematical */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Beyond the Math</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg">
                    <h5 className="font-medium text-green-800 dark:text-green-200 flex items-center gap-2 mb-2">
                      <Heart className="h-4 w-4" /> Reasons to Pay Off
                    </h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>+ Peace of mind - no debt in retirement</li>
                      <li>+ Guaranteed return equal to mortgage rate</li>
                      <li>+ Lower monthly expenses = more flexibility</li>
                      <li>+ Sleep better at night</li>
                      <li>+ Simplified finances</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                    <h5 className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" /> Reasons to Invest
                    </h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>+ Higher expected returns than mortgage rate</li>
                      <li>+ Maintain liquidity for emergencies</li>
                      <li>+ Tax diversification opportunities</li>
                      <li>+ Mortgage interest may be deductible</li>
                      <li>+ Inflation erodes debt over time</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Property Tax Tab */}
        <TabsContent value="taxes" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Senior Property Tax Exemptions
              </CardTitle>
              <CardDescription>
                Many states offer property tax relief for seniors - do not leave money on the table
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* State Selector */}
                <div className="flex items-center gap-4">
                  <Label className={TYPOGRAPHY.inputLabel}>Your State</Label>
                  <Select
                    value={inputs.state}
                    onValueChange={v => updateInput('state', v)}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STATE_EXEMPTIONS).map(([code, info]) => (
                        <SelectItem key={code} value={code}>
                          {info.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="OTHER">Other State</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* State Info */}
                {stateExemption ? (
                  <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">{stateExemption.name} Senior Exemptions</h4>
                        <p className={TYPOGRAPHY.body}>{stateExemption.exemption}</p>
                        <p className={TYPOGRAPHY.helperText}>
                          Minimum age: {stateExemption.age} years old
                          {inputs.age >= stateExemption.age
                            ? ' - You qualify!'
                            : ` - You'll qualify in ${stateExemption.age - inputs.age} years`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium">Check Your State</h4>
                        <p className={TYPOGRAPHY.body}>
                          Most states offer some form of property tax relief for seniors.
                          Contact your local tax assessor's office to learn about available programs.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Exemptions Table */}
                <div>
                  <h4 className="font-medium mb-3">Common Senior Property Tax Programs</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">State</th>
                          <th className="text-left p-2">Program</th>
                          <th className="text-right p-2">Min Age</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(STATE_EXEMPTIONS).map(([code, info]) => (
                          <tr key={code} className="border-b hover:bg-slate-50 dark:hover:bg-slate-900">
                            <td className="p-2 font-medium">{info.name}</td>
                            <td className="p-2 text-muted-foreground">{info.exemption}</td>
                            <td className="p-2 text-right">{info.age}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Prop 13 Deep Dive */}
                <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Prop 13-Style Protections
                  </h4>
                  <p className={TYPOGRAPHY.body}>
                    California's Proposition 13 (and similar laws in other states) caps annual
                    property tax increases at 1-2%. This means your property taxes cannot spike
                    even if your home value increases dramatically. If you have owned your home
                    for decades, your tax basis may be far below market value.
                  </p>
                  <div className="mt-2 p-3 bg-amber-100 dark:bg-amber-900/30 rounded">
                    <p className={TYPOGRAPHY.helperText}>
                      <strong>Important:</strong> Moving to a new home typically resets your tax
                      basis to current market value. Some states allow seniors to transfer their
                      tax basis (CA Prop 19). Consider this carefully when downsizing.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estate Planning Tab */}
        <TabsContent value="estate" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Estate Planning Implications
              </CardTitle>
              <CardDescription>
                How your home equity decisions affect your heirs
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Stepped-Up Basis */}
              <div className="p-4 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  The Magic of Stepped-Up Basis
                </h4>
                <p className={TYPOGRAPHY.body}>
                  When your heirs inherit your home, they receive it at its current market value
                  (stepped-up basis), not what you originally paid. This means all capital gains
                  during your ownership are forgiven.
                </p>
                <div className="mt-3 p-3 bg-white dark:bg-slate-900 rounded">
                  <div className="flex items-center justify-between text-sm">
                    <span>Example: You bought for</span>
                    <span className="font-medium">$150,000</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Current value</span>
                    <span className="font-medium">{fmtFull(inputs.homeValue)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span>Unrealized gain</span>
                    <span className="font-medium text-amber-600">{fmtFull(inputs.homeValue - 150000)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm pt-2 border-t">
                    <span>Tax heirs would owe if inherited</span>
                    <span className="font-bold text-green-600">$0</span>
                  </div>
                </div>
              </div>

              {/* Reverse Mortgage & Estate */}
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <h4 className="font-medium flex items-center gap-2 mb-3">
                  <Home className="h-5 w-5 text-amber-600" />
                  Reverse Mortgage & Your Estate
                </h4>
                <p className={TYPOGRAPHY.body}>
                  If you have a reverse mortgage, the loan must be repaid when you die (or move).
                  Your heirs have options:
                </p>
                <ul className="mt-3 space-y-2">
                  {[
                    { opt: 'Pay off the loan', desc: 'Refinance or use other assets to keep the home' },
                    { opt: 'Sell the home', desc: 'Keep any equity above the loan balance' },
                    { opt: 'Walk away', desc: 'If loan exceeds value, heirs owe nothing (non-recourse)' },
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="font-medium">{item.opt}:</span>{' '}
                        <span className="text-muted-foreground">{item.desc}</span>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 p-3 bg-white dark:bg-slate-900 rounded">
                  <p className={TYPOGRAPHY.helperText}>
                    <strong>Important:</strong> Heirs typically have 6-12 months to decide what to do
                    after the borrower passes. The loan servicer cannot force a quick sale.
                  </p>
                </div>
              </div>

              {/* Strategic Considerations */}
              <div className="space-y-3">
                <h4 className="font-medium">Strategic Considerations</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">If Leaving Home to Heirs</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>+ Consider keeping the home (stepped-up basis)</li>
                      <li>+ Avoid reverse mortgage if possible</li>
                      <li>+ Pay off mortgage to maximize inheritance</li>
                      <li>+ Consider life insurance to cover estate taxes</li>
                    </ul>
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                    <h5 className="font-medium text-sm mb-2">If Maximizing Your Retirement</h5>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>+ Use home equity for your needs</li>
                      <li>+ Reverse mortgage is a valid option</li>
                      <li>+ Downsize and enjoy the proceeds</li>
                      <li>+ Your financial security comes first</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Summary Quote */}
              <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-center">
                <p className={`${TYPOGRAPHY.body} italic`}>
                  "The best inheritance you can leave your children is to not be a financial burden
                  to them in your old age. Do not feel guilty about using your home equity for
                  your own retirement."
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This calculator provides general guidance only. Consult with a HUD-approved counselor
          for reverse mortgage decisions, a tax professional for tax implications, and an estate
          planning attorney for inheritance strategies.
        </p>
      </div>
    </div>
  )
}

export default HomeEquityRetirement
