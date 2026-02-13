'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  AlertTriangle,
  Calculator,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  DollarSign,
  FileText,
  Heart,
  Home,
  Info,
  Landmark,
  Lightbulb,
  Package,
  PiggyBank,
  Receipt,
  Shield,
  TrendingUp,
  Zap,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens'
import { fmt, fmtFull, fmtPercent } from '@/lib/utils'
import {
  SE_TAX_2026,
  TAX_BRACKETS_2026,
  STANDARD_DEDUCTION_2026,
  RETIREMENT_LIMITS_2026,
  FilingStatus,
  getMarginalRate,
  getAdditionalMedicareThreshold,
} from '@/lib/constants/tax2026'

// =============================================================================
// TYPES
// =============================================================================

interface SideHustleInputs {
  // 1099 Income
  gross1099Income: number

  // Business Expenses / Deductions
  homeOfficeDeduction: number
  vehicleMileage: number
  equipmentSupplies: number
  otherDeductions: number

  // Self-employed health insurance
  healthInsurancePremium: number

  // W-2 Integration
  hasW2Job: boolean
  w2Income: number
  w2FederalWithholding: number
  w2SocialSecurityWithheld: number

  // Filing status
  filingStatus: FilingStatus

  // Age (for catch-up contributions)
  age: number
}

interface QuarterlyPayment {
  quarter: string
  dueDate: string
  amount: number
  cumulativeIncome: number
  isPast: boolean
}

interface DeductionItem {
  id: string
  label: string
  amount: number
  description: string
  icon: React.ReactNode
  tipText: string
}

interface RetirementOption {
  name: string
  employeeContribution: number
  employerContribution: number
  totalContribution: number
  taxSavings: number
  description: string
}

// =============================================================================
// CONSTANTS
// =============================================================================

const MILEAGE_RATE_2026 = 0.70 // IRS standard mileage rate estimate for 2026

const QUARTERLY_DUE_DATES = [
  { quarter: 'Q1', dueDate: 'April 15, 2026', period: 'Jan 1 - Mar 31' },
  { quarter: 'Q2', dueDate: 'June 15, 2026', period: 'Apr 1 - May 31' },
  { quarter: 'Q3', dueDate: 'September 15, 2026', period: 'Jun 1 - Aug 31' },
  { quarter: 'Q4', dueDate: 'January 15, 2027', period: 'Sep 1 - Dec 31' },
]

// =============================================================================
// CALCULATION FUNCTIONS
// =============================================================================

function calculateNetSelfEmploymentIncome(inputs: SideHustleInputs): number {
  const totalDeductions =
    inputs.homeOfficeDeduction +
    (inputs.vehicleMileage * MILEAGE_RATE_2026) +
    inputs.equipmentSupplies +
    inputs.otherDeductions

  return Math.max(0, inputs.gross1099Income - totalDeductions)
}

function calculateSelfEmploymentTax(
  netSEIncome: number,
  filingStatus: FilingStatus,
  w2Income: number,
  w2SocialSecurityWithheld: number
): {
  seTaxBase: number
  socialSecurityTax: number
  medicareTax: number
  additionalMedicareTax: number
  totalSETax: number
  deductiblePortion: number
  ssWageBaseRemaining: number
  w2SocialSecurityCredit: number
} {
  // SE tax base is 92.35% of net SE income
  const seTaxBase = netSEIncome * SE_TAX_2026.SE_TAX_BASE_MULTIPLIER

  // Calculate how much of SS wage base was used by W-2 income
  // W-2 employer withholds 6.2%, so total SS from W-2 is based on wages up to SS base
  const w2WagesSubjectToSS = Math.min(w2Income, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)
  const ssWageBaseRemaining = Math.max(0, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE - w2WagesSubjectToSS)

  // Social Security portion (12.4%) - only on income up to remaining SS wage base
  const ssTaxableIncome = Math.min(seTaxBase, ssWageBaseRemaining)
  const socialSecurityTax = ssTaxableIncome * SE_TAX_2026.SOCIAL_SECURITY_RATE

  // Medicare portion (2.9%) - uncapped
  const medicareTax = seTaxBase * SE_TAX_2026.MEDICARE_RATE

  // Additional Medicare Tax (0.9% over threshold)
  const medicareThreshold = getAdditionalMedicareThreshold(filingStatus)
  const combinedEarnedIncome = netSEIncome + w2Income
  const additionalMedicareTax = Math.max(0, combinedEarnedIncome - medicareThreshold) * SE_TAX_2026.ADDITIONAL_MEDICARE_RATE

  const totalSETax = socialSecurityTax + medicareTax + additionalMedicareTax

  // 50% deduction only applies to SS + base Medicare (not additional Medicare tax)
  const deductiblePortion = (socialSecurityTax + medicareTax) / 2

  return {
    seTaxBase,
    socialSecurityTax,
    medicareTax,
    additionalMedicareTax,
    totalSETax,
    deductiblePortion,
    ssWageBaseRemaining,
    w2SocialSecurityCredit: w2SocialSecurityWithheld,
  }
}

function calculateFederalIncomeTax(
  netSEIncome: number,
  seTaxDeduction: number,
  healthInsurancePremium: number,
  filingStatus: FilingStatus,
  w2Income: number
): {
  grossIncome: number
  aboveLineDeductions: number
  agi: number
  standardDeduction: number
  taxableIncome: number
  federalTax: number
  effectiveRate: number
  marginalRate: number
} {
  const grossIncome = netSEIncome + w2Income

  // Above-the-line deductions
  const aboveLineDeductions = seTaxDeduction + healthInsurancePremium

  const agi = grossIncome - aboveLineDeductions
  const standardDeduction = STANDARD_DEDUCTION_2026[filingStatus]
  const taxableIncome = Math.max(0, agi - standardDeduction)

  // Calculate tax using brackets
  let federalTax = 0
  const brackets = TAX_BRACKETS_2026[filingStatus]

  for (const bracket of brackets) {
    if (taxableIncome > bracket.min) {
      const taxableInBracket = Math.min(taxableIncome, bracket.max) - bracket.min
      federalTax += taxableInBracket * bracket.rate
    }
  }

  const marginalRate = getMarginalRate(taxableIncome, filingStatus)
  const effectiveRate = grossIncome > 0 ? federalTax / grossIncome : 0

  return {
    grossIncome,
    aboveLineDeductions,
    agi,
    standardDeduction,
    taxableIncome,
    federalTax,
    effectiveRate,
    marginalRate,
  }
}

function calculateQuarterlyPayments(
  annualTaxOwed: number,
  w2Withholding: number
): QuarterlyPayment[] {
  const netTaxOwed = Math.max(0, annualTaxOwed - w2Withholding)
  const quarterlyAmount = netTaxOwed / 4

  const today = new Date()

  return QUARTERLY_DUE_DATES.map((q, index) => {
    // Assume income is earned evenly throughout the year
    const cumulativeIncome = ((index + 1) / 4) * 100 // Percentage

    // Parse due date to check if past
    const dueDate = new Date(q.dueDate)
    const isPast = today > dueDate

    return {
      quarter: q.quarter,
      dueDate: q.dueDate,
      amount: quarterlyAmount,
      cumulativeIncome,
      isPast,
    }
  })
}

function calculateRetirementOptions(
  netSEIncome: number,
  marginalRate: number,
  age: number
): RetirementOption[] {
  // Net earnings for SE retirement = Net SE income - 50% of SE tax
  // Simplified: use 92.35% of net SE income as the base
  const netEarningsForRetirement = netSEIncome * SE_TAX_2026.SE_TAX_BASE_MULTIPLIER

  // Solo 401(k) calculations
  const employeeLimit = age >= 60 && age <= 63
    ? RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63
    : age >= 50
      ? RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS
      : RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT

  // Employer contribution is 25% of net earnings (after SE tax deduction)
  const employerContributionMax = netEarningsForRetirement * 0.25

  // Total 401(k) limit (employee + employer)
  const totalLimit = age >= 60 && age <= 63
    ? RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_60_TO_63
    : age >= 50
      ? RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_50_PLUS
      : RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_UNDER_50

  const solo401kEmployee = Math.min(employeeLimit, netEarningsForRetirement)
  const solo401kEmployer = Math.min(employerContributionMax, totalLimit - solo401kEmployee)
  const solo401kTotal = solo401kEmployee + solo401kEmployer

  // SEP-IRA calculations - just employer contribution (25%)
  const sepLimit = RETIREMENT_LIMITS_2026.SEP_IRA_LIMIT
  const sepContribution = Math.min(employerContributionMax, sepLimit)

  return [
    {
      name: 'Solo 401(k)',
      employeeContribution: solo401kEmployee,
      employerContribution: solo401kEmployer,
      totalContribution: Math.min(solo401kTotal, totalLimit),
      taxSavings: Math.min(solo401kTotal, totalLimit) * marginalRate,
      description: `Max employee: ${fmtFull(employeeLimit)} + employer: 25% of net earnings`,
    },
    {
      name: 'SEP-IRA',
      employeeContribution: 0,
      employerContribution: sepContribution,
      totalContribution: sepContribution,
      taxSavings: sepContribution * marginalRate,
      description: 'Simpler setup, just employer contribution (25% of net)',
    },
  ]
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

interface TaxShockCardProps {
  seTax: number
  federalTax: number
  totalTax: number
  gross1099Income: number
  effectiveRate: number
}

function TaxShockCard({ seTax, federalTax, totalTax, gross1099Income, effectiveRate }: TaxShockCardProps) {
  const sePercentage = gross1099Income > 0 ? (seTax / gross1099Income) * 100 : 0

  return (
    <Card className="border-2 border-red-200 dark:border-red-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-red-600 dark:text-red-400" />
              Self-Employment Tax Shock
            </CardTitle>
            <CardDescription>
              You pay BOTH halves of Social Security and Medicare
            </CardDescription>
          </div>
          <Badge className={`${STATUS.error} border-0`}>15.3% Extra</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* SE Tax Breakdown */}
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className={TYPOGRAPHY.metricLabel}>Social Security</p>
              <p className={`${TYPOGRAPHY.metricSmall} text-red-700 dark:text-red-300`}>12.4%</p>
              <p className={TYPOGRAPHY.helperText}>Employee 6.2% + Employer 6.2%</p>
            </div>
            <div>
              <p className={TYPOGRAPHY.metricLabel}>Medicare</p>
              <p className={`${TYPOGRAPHY.metricSmall} text-red-700 dark:text-red-300`}>2.9%</p>
              <p className={TYPOGRAPHY.helperText}>Employee 1.45% + Employer 1.45%</p>
            </div>
          </div>
          <div className="pt-3 border-t border-red-200 dark:border-red-700">
            <div className="flex justify-between items-center">
              <div>
                <p className={`${TYPOGRAPHY.sectionHeader} text-red-800 dark:text-red-200`}>
                  Total SE Tax
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  {sePercentage.toFixed(1)}% of your gross 1099 income
                </p>
              </div>
              <p className={`${TYPOGRAPHY.metricMedium} text-red-600 dark:text-red-400`}>
                {fmtFull(seTax)}
              </p>
            </div>
          </div>
        </div>

        {/* Why It Hurts */}
        <div className="space-y-3">
          <p className={`${TYPOGRAPHY.subSectionHeader}`}>Why This Hurts</p>
          <ul className="space-y-2">
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <span className={TYPOGRAPHY.body}>
                W-2 employees only pay 7.65% - their employer pays the other half
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <span className={TYPOGRAPHY.body}>
                This is ON TOP of your regular income tax
              </span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-500 flex-shrink-0" />
              <span className={TYPOGRAPHY.body}>
                Social Security applies to first ${fmtFull(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)} of combined wages
              </span>
            </li>
          </ul>
        </div>

        {/* Silver Lining */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center gap-2 mb-2">
            <Lightbulb className="h-5 w-5 text-green-600 dark:text-green-400" />
            <span className={`${TYPOGRAPHY.sectionHeader} text-green-800 dark:text-green-200`}>
              Silver Lining
            </span>
          </div>
          <p className={TYPOGRAPHY.body}>
            You can deduct 50% of SE tax ({fmtFull(seTax / 2)}) from your income,
            reducing your income tax. This is built into the calculations below.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

interface QuarterlyPaymentsCardProps {
  payments: QuarterlyPayment[]
  annualTaxOwed: number
  w2Withholding: number
}

function QuarterlyPaymentsCard({ payments, annualTaxOwed, w2Withholding }: QuarterlyPaymentsCardProps) {
  const netTaxOwed = Math.max(0, annualTaxOwed - w2Withholding)
  const safeHarborAmount = annualTaxOwed * 0.9

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Quarterly Estimated Tax Payments
        </CardTitle>
        <CardDescription>
          Avoid underpayment penalties by paying quarterly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Schedule */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {payments.map((payment) => (
            <div
              key={payment.quarter}
              className={`p-4 rounded-lg border ${
                payment.isPast
                  ? 'bg-muted/50 border-muted'
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`${TYPOGRAPHY.sectionHeader} ${payment.isPast ? 'text-muted-foreground' : ''}`}>
                  {payment.quarter}
                </span>
                {payment.isPast && (
                  <Badge variant="outline" className="text-xs">Past</Badge>
                )}
              </div>
              <p className={`${TYPOGRAPHY.metricSmall} ${payment.isPast ? 'text-muted-foreground' : 'text-blue-600 dark:text-blue-400'}`}>
                {fmtFull(payment.amount)}
              </p>
              <p className={TYPOGRAPHY.helperText}>Due: {payment.dueDate}</p>
            </div>
          ))}
        </div>

        {/* Safe Harbor Explanation */}
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <span className={`${TYPOGRAPHY.sectionHeader} text-amber-800 dark:text-amber-200`}>
              Avoiding Penalties
            </span>
          </div>
          <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1`}>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Pay at least 90% of current year tax ({fmtFull(safeHarborAmount)}), OR
            </li>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Pay 100% of prior year tax (110% if AGI over $150K)
            </li>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Underpayment penalty is ~8% annually on amount owed
            </li>
          </ul>
        </div>

        {/* W-2 Credit */}
        {w2Withholding > 0 && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between">
              <div>
                <p className={`${TYPOGRAPHY.sectionHeader} text-green-800 dark:text-green-200`}>
                  W-2 Withholding Credit
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  Your W-2 withholding reduces quarterly payment amounts
                </p>
              </div>
              <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
                -{fmtFull(w2Withholding)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface DeductionFinderProps {
  inputs: SideHustleInputs
  onUpdate: <K extends keyof SideHustleInputs>(key: K, value: SideHustleInputs[K]) => void
  marginalRate: number
}

function DeductionFinder({ inputs, onUpdate, marginalRate }: DeductionFinderProps) {
  const vehicleDeduction = inputs.vehicleMileage * MILEAGE_RATE_2026

  const deductions: DeductionItem[] = [
    {
      id: 'homeOffice',
      label: 'Home Office Deduction',
      amount: inputs.homeOfficeDeduction,
      description: 'Simplified: $5/sq ft up to 300 sq ft, OR actual expenses',
      icon: <Home className="h-5 w-5" />,
      tipText: 'Measure your dedicated workspace. Even a corner of a room counts!',
    },
    {
      id: 'vehicle',
      label: 'Vehicle Mileage',
      amount: vehicleDeduction,
      description: `${inputs.vehicleMileage.toLocaleString()} miles x ${fmtFull(MILEAGE_RATE_2026)}/mile`,
      icon: <Car className="h-5 w-5" />,
      tipText: 'Track every business mile with an app. Commuting does not count.',
    },
    {
      id: 'equipment',
      label: 'Equipment and Supplies',
      amount: inputs.equipmentSupplies,
      description: 'Computer, software, office supplies, tools',
      icon: <Package className="h-5 w-5" />,
      tipText: 'Items over $2,500 may need to be depreciated over time.',
    },
    {
      id: 'health',
      label: 'Health Insurance',
      amount: inputs.healthInsurancePremium,
      description: 'Self-employed health insurance deduction (above-the-line)',
      icon: <Heart className="h-5 w-5" />,
      tipText: 'Deduct premiums for yourself, spouse, and dependents.',
    },
    {
      id: 'other',
      label: 'Other Business Expenses',
      amount: inputs.otherDeductions,
      description: 'Professional services, marketing, education, etc.',
      icon: <FileText className="h-5 w-5" />,
      tipText: 'Keep receipts for everything business-related.',
    },
  ]

  const totalDeductions = deductions.reduce((sum, d) => sum + d.amount, 0)
  const taxSavings = totalDeductions * marginalRate

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          Deduction Finder
        </CardTitle>
        <CardDescription>
          Every dollar deducted saves {fmtPercent(marginalRate)} in taxes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Deduction Inputs */}
        <div className="space-y-4">
          {/* Home Office */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/30">
                <Home className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="homeOffice" className={TYPOGRAPHY.inputLabel}>
                  Home Office Deduction
                </Label>
                <p className={TYPOGRAPHY.helperText}>
                  Simplified: $5/sq ft up to 300 sq ft = $1,500 max
                </p>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="homeOffice"
                type="number"
                value={inputs.homeOfficeDeduction || ''}
                onChange={(e) => onUpdate('homeOfficeDeduction', Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="0"
              />
            </div>
          </div>

          {/* Vehicle Mileage */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <Car className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="mileage" className={TYPOGRAPHY.inputLabel}>
                  Business Miles Driven
                </Label>
                <p className={TYPOGRAPHY.helperText}>
                  2026 rate: {fmtFull(MILEAGE_RATE_2026)}/mile = {fmtFull(vehicleDeduction)} deduction
                </p>
              </div>
            </div>
            <Input
              id="mileage"
              type="number"
              value={inputs.vehicleMileage || ''}
              onChange={(e) => onUpdate('vehicleMileage', Number(e.target.value) || 0)}
              placeholder="0"
            />
          </div>

          {/* Equipment */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                <Package className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="equipment" className={TYPOGRAPHY.inputLabel}>
                  Equipment and Supplies
                </Label>
                <p className={TYPOGRAPHY.helperText}>
                  Computer, software, tools, office supplies
                </p>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="equipment"
                type="number"
                value={inputs.equipmentSupplies || ''}
                onChange={(e) => onUpdate('equipmentSupplies', Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="0"
              />
            </div>
          </div>

          {/* Health Insurance */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/30">
                <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="health" className={TYPOGRAPHY.inputLabel}>
                  Health Insurance Premium (Annual)
                </Label>
                <p className={TYPOGRAPHY.helperText}>
                  Self-employed deduction - deducted above-the-line
                </p>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="health"
                type="number"
                value={inputs.healthInsurancePremium || ''}
                onChange={(e) => onUpdate('healthInsurancePremium', Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="0"
              />
            </div>
          </div>

          {/* Other Deductions */}
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <FileText className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="flex-1">
                <Label htmlFor="other" className={TYPOGRAPHY.inputLabel}>
                  Other Business Expenses
                </Label>
                <p className={TYPOGRAPHY.helperText}>
                  Marketing, professional services, education, subscriptions
                </p>
              </div>
            </div>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="other"
                type="number"
                value={inputs.otherDeductions || ''}
                onChange={(e) => onUpdate('otherDeductions', Number(e.target.value) || 0)}
                className="pl-9"
                placeholder="0"
              />
            </div>
          </div>
        </div>

        {/* Total Savings */}
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <div className="flex items-center justify-between">
            <div>
              <p className={`${TYPOGRAPHY.sectionHeader} text-green-800 dark:text-green-200`}>
                Total Deductions
              </p>
              <p className={TYPOGRAPHY.helperText}>
                Tax savings at {fmtPercent(marginalRate)} marginal rate
              </p>
            </div>
            <div className="text-right">
              <p className={`${TYPOGRAPHY.metricMedium} text-green-600 dark:text-green-400`}>
                {fmtFull(totalDeductions)}
              </p>
              <p className={`${TYPOGRAPHY.metricSmall} text-green-700 dark:text-green-300`}>
                Saves {fmtFull(taxSavings)}
              </p>
            </div>
          </div>
        </div>

        {/* Pro Tips */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className={`${TYPOGRAPHY.subSectionHeader} mb-2`}>Receipt Reminder</p>
          <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1`}>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Keep receipts for everything - the IRS can audit 3 years back
            </li>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Use a separate bank account for business transactions
            </li>
            <li>
              <ChevronRight className="h-3 w-3 inline mr-1" />
              Apps like Expensify or QuickBooks Self-Employed help track
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

interface RetirementOpportunityProps {
  options: RetirementOption[]
  netSEIncome: number
  marginalRate: number
  age: number
}

function RetirementOpportunity({ options, netSEIncome, marginalRate, age }: RetirementOpportunityProps) {
  const solo401k = options.find(o => o.name === 'Solo 401(k)')
  const sepIRA = options.find(o => o.name === 'SEP-IRA')

  return (
    <Card className="border-2 border-green-200 dark:border-green-800">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <PiggyBank className="h-5 w-5 text-green-600 dark:text-green-400" />
              Turn Tax Shock Into Tax Shelter
            </CardTitle>
            <CardDescription>
              Your side hustle unlocks powerful retirement savings options
            </CardDescription>
          </div>
          <Badge className={`${STATUS.success} border-0`}>Opportunity</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Solo 401(k) */}
        {solo401k && (
          <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="h-5 w-5 text-green-600 dark:text-green-400" />
              <span className={`${TYPOGRAPHY.sectionHeader} text-green-800 dark:text-green-200`}>
                Solo 401(k) - The Power Move
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 rounded bg-white dark:bg-gray-900">
                <p className={TYPOGRAPHY.metricLabel}>Employee Contribution</p>
                <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
                  {fmtFull(solo401k.employeeContribution)}
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  Up to ${RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT.toLocaleString()}
                  {age >= 50 && age < 60 && ` (+$${RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS.toLocaleString()} catch-up)`}
                  {age >= 60 && age <= 63 && ` (+$${RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63.toLocaleString()} super catch-up)`}
                </p>
              </div>
              <div className="p-3 rounded bg-white dark:bg-gray-900">
                <p className={TYPOGRAPHY.metricLabel}>Employer Contribution</p>
                <p className={`${TYPOGRAPHY.metricSmall} text-green-600 dark:text-green-400`}>
                  {fmtFull(solo401k.employerContribution)}
                </p>
                <p className={TYPOGRAPHY.helperText}>25% of net SE earnings</p>
              </div>
              <div className="p-3 rounded bg-white dark:bg-gray-900">
                <p className={TYPOGRAPHY.metricLabel}>Total Tax Shelter</p>
                <p className={`${TYPOGRAPHY.metricMedium} text-green-600 dark:text-green-400`}>
                  {fmtFull(solo401k.totalContribution)}
                </p>
                <p className={TYPOGRAPHY.helperText}>
                  Saves {fmtFull(solo401k.taxSavings)} in taxes
                </p>
              </div>
            </div>

            <div className="pt-3 border-t border-green-200 dark:border-green-700">
              <p className={`${TYPOGRAPHY.body} text-green-800 dark:text-green-200`}>
                <strong>The math:</strong> You are an employer AND employee. You can contribute
                as both, up to {fmtFull(
                  age >= 60 && age <= 63
                    ? RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_60_TO_63
                    : age >= 50
                      ? RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_50_PLUS
                      : RETIREMENT_LIMITS_2026.TOTAL_401K_LIMIT_UNDER_50
                )} total for 2026.
              </p>
            </div>
          </div>
        )}

        {/* SEP-IRA */}
        {sepIRA && (
          <div className="p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2 mb-4">
              <Landmark className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span className={`${TYPOGRAPHY.sectionHeader}`}>
                SEP-IRA - The Simple Alternative
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-3 rounded bg-muted/50">
                <p className={TYPOGRAPHY.metricLabel}>Max Contribution</p>
                <p className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                  {fmtFull(sepIRA.totalContribution)}
                </p>
                <p className={TYPOGRAPHY.helperText}>25% of net earnings, up to ${RETIREMENT_LIMITS_2026.SEP_IRA_LIMIT.toLocaleString()}</p>
              </div>
              <div className="p-3 rounded bg-muted/50">
                <p className={TYPOGRAPHY.metricLabel}>Tax Savings</p>
                <p className={`${TYPOGRAPHY.metricSmall} text-blue-600 dark:text-blue-400`}>
                  {fmtFull(sepIRA.taxSavings)}
                </p>
                <p className={TYPOGRAPHY.helperText}>At {fmtPercent(marginalRate)} marginal rate</p>
              </div>
            </div>

            <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1`}>
              <li>
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                Simpler to set up than Solo 401(k)
              </li>
              <li>
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                No employee contribution option (just employer)
              </li>
              <li>
                <CheckCircle2 className="h-3 w-3 inline mr-1 text-green-500" />
                Good if you do not want to max out contributions
              </li>
            </ul>
          </div>
        )}

        {/* Comparison */}
        <div className="p-4 rounded-lg bg-muted/30 border">
          <p className={`${TYPOGRAPHY.subSectionHeader} mb-3`}>When to Choose What</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={`${TYPOGRAPHY.inputLabel} text-green-700 dark:text-green-300`}>Choose Solo 401(k) if:</p>
              <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1 mt-1`}>
                <li>- You want to maximize contributions</li>
                <li>- You earn enough to contribute more</li>
                <li>- You want Roth 401(k) option</li>
              </ul>
            </div>
            <div>
              <p className={`${TYPOGRAPHY.inputLabel} text-blue-700 dark:text-blue-300`}>Choose SEP-IRA if:</p>
              <ul className={`${TYPOGRAPHY.bodyMuted} space-y-1 mt-1`}>
                <li>- You want simplicity</li>
                <li>- 25% of earnings is enough</li>
                <li>- You are starting out</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface W2IntegrationProps {
  inputs: SideHustleInputs
  onUpdate: <K extends keyof SideHustleInputs>(key: K, value: SideHustleInputs[K]) => void
  ssWageBaseRemaining: number
}

function W2Integration({ inputs, onUpdate, ssWageBaseRemaining }: W2IntegrationProps) {
  const w2WagesSubjectToSS = Math.min(inputs.w2Income, SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)
  const ssUsedByW2 = SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE - ssWageBaseRemaining
  const ssCapReached = ssWageBaseRemaining <= 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
          W-2 and 1099 Integration
        </CardTitle>
        <CardDescription>
          How your day job and side hustle interact
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
          <div>
            <Label htmlFor="hasW2" className={TYPOGRAPHY.inputLabel}>
              I have a W-2 day job
            </Label>
            <p className={TYPOGRAPHY.helperText}>
              Your W-2 withholding reduces quarterly payments needed
            </p>
          </div>
          <Switch
            id="hasW2"
            checked={inputs.hasW2Job}
            onCheckedChange={(checked) => onUpdate('hasW2Job', checked)}
          />
        </div>

        {inputs.hasW2Job && (
          <>
            {/* W-2 Inputs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="w2Income" className={TYPOGRAPHY.inputLabel}>
                  W-2 Annual Income
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="w2Income"
                    type="number"
                    value={inputs.w2Income || ''}
                    onChange={(e) => onUpdate('w2Income', Number(e.target.value) || 0)}
                    className="pl-9"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w2Withholding" className={TYPOGRAPHY.inputLabel}>
                  Federal Tax Withheld (Annual)
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="w2Withholding"
                    type="number"
                    value={inputs.w2FederalWithholding || ''}
                    onChange={(e) => onUpdate('w2FederalWithholding', Number(e.target.value) || 0)}
                    className="pl-9"
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="w2SS" className={TYPOGRAPHY.inputLabel}>
                  Social Security Withheld
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="w2SS"
                    type="number"
                    value={inputs.w2SocialSecurityWithheld || ''}
                    onChange={(e) => onUpdate('w2SocialSecurityWithheld', Number(e.target.value) || 0)}
                    className="pl-9"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Social Security Interaction */}
            <div className="p-4 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                <span className={`${TYPOGRAPHY.sectionHeader} text-indigo-800 dark:text-indigo-200`}>
                  Social Security Wage Base Interaction
                </span>
              </div>

              <div className="mb-4">
                <div className="flex justify-between mb-2">
                  <span className={TYPOGRAPHY.body}>SS Wage Base Used</span>
                  <span className={TYPOGRAPHY.body}>
                    {fmtFull(ssUsedByW2)} of {fmtFull(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)}
                  </span>
                </div>
                <Progress
                  value={(ssUsedByW2 / SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE) * 100}
                  className="h-3"
                />
              </div>

              {ssCapReached ? (
                <div className="p-3 rounded bg-green-100 dark:bg-green-900/30">
                  <p className={`${TYPOGRAPHY.body} text-green-800 dark:text-green-200`}>
                    <CheckCircle2 className="h-4 w-4 inline mr-1" />
                    <strong>Good news!</strong> Your W-2 income already maxes the SS wage base.
                    You will NOT pay the 12.4% Social Security portion of SE tax on your 1099 income.
                  </p>
                </div>
              ) : (
                <div className="p-3 rounded bg-amber-100 dark:bg-amber-900/30">
                  <p className={`${TYPOGRAPHY.body} text-amber-800 dark:text-amber-200`}>
                    <AlertTriangle className="h-4 w-4 inline mr-1" />
                    You have {fmtFull(ssWageBaseRemaining)} of SS wage base remaining.
                    Your 1099 income will be subject to 12.4% SS tax up to this amount.
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export interface SideHustleTaxProps {
  /** Initial 1099 income */
  initialIncome?: number
  /** Compact mode for embedding */
  compact?: boolean
}

export function SideHustleTax({
  initialIncome = 25000,
  compact = false,
}: SideHustleTaxProps) {
  // Form state
  const [inputs, setInputs] = useState<SideHustleInputs>({
    gross1099Income: initialIncome,
    homeOfficeDeduction: 0,
    vehicleMileage: 0,
    equipmentSupplies: 0,
    otherDeductions: 0,
    healthInsurancePremium: 0,
    hasW2Job: false,
    w2Income: 0,
    w2FederalWithholding: 0,
    w2SocialSecurityWithheld: 0,
    filingStatus: 'single',
    age: 35,
  })

  const [activeTab, setActiveTab] = useState('overview')

  // Update handler
  const updateInput = useCallback(
    <K extends keyof SideHustleInputs>(key: K, value: SideHustleInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }))
    },
    []
  )

  // Calculations
  const netSEIncome = useMemo(() => calculateNetSelfEmploymentIncome(inputs), [inputs])

  const seTaxResult = useMemo(
    () =>
      calculateSelfEmploymentTax(
        netSEIncome,
        inputs.filingStatus,
        inputs.hasW2Job ? inputs.w2Income : 0,
        inputs.hasW2Job ? inputs.w2SocialSecurityWithheld : 0
      ),
    [netSEIncome, inputs.filingStatus, inputs.hasW2Job, inputs.w2Income, inputs.w2SocialSecurityWithheld]
  )

  const federalTaxResult = useMemo(
    () =>
      calculateFederalIncomeTax(
        netSEIncome,
        seTaxResult.deductiblePortion,
        inputs.healthInsurancePremium,
        inputs.filingStatus,
        inputs.hasW2Job ? inputs.w2Income : 0
      ),
    [netSEIncome, seTaxResult.deductiblePortion, inputs.healthInsurancePremium, inputs.filingStatus, inputs.hasW2Job, inputs.w2Income]
  )

  const totalTaxOwed = seTaxResult.totalSETax + federalTaxResult.federalTax

  const quarterlyPayments = useMemo(
    () =>
      calculateQuarterlyPayments(
        totalTaxOwed,
        inputs.hasW2Job ? inputs.w2FederalWithholding : 0
      ),
    [totalTaxOwed, inputs.hasW2Job, inputs.w2FederalWithholding]
  )

  const retirementOptions = useMemo(
    () => calculateRetirementOptions(netSEIncome, federalTaxResult.marginalRate, inputs.age),
    [netSEIncome, federalTaxResult.marginalRate, inputs.age]
  )

  // Derived values
  const effectiveTaxRate = inputs.gross1099Income > 0
    ? totalTaxOwed / inputs.gross1099Income
    : 0
  const takeHomePay = inputs.gross1099Income - totalTaxOwed

  return (
    <div className={compact ? 'space-y-4' : 'space-y-6'}>
      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Side Hustle / 1099 Tax Calculator
              </CardTitle>
              <CardDescription>
                Turn the self-employment tax shock into a retirement opportunity
              </CardDescription>
            </div>
            <Badge className={METRIC_COLORS.neutral.bg + ' ' + METRIC_COLORS.neutral.text + ' border-0'}>
              2026 Tax Year
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Income Input */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="gross1099" className={TYPOGRAPHY.inputLabel}>
                  Gross 1099 Income
                </Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="gross1099"
                    type="number"
                    value={inputs.gross1099Income || ''}
                    onChange={(e) => updateInput('gross1099Income', Number(e.target.value) || 0)}
                    className="pl-9 text-lg"
                    placeholder="25000"
                  />
                </div>
                <p className={TYPOGRAPHY.helperText}>
                  Total 1099-NEC, 1099-K, or freelance income before expenses
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="filingStatus" className={TYPOGRAPHY.inputLabel}>
                    Filing Status
                  </Label>
                  <Select
                    value={inputs.filingStatus}
                    onValueChange={(v) => updateInput('filingStatus', v as FilingStatus)}
                  >
                    <SelectTrigger id="filingStatus">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single</SelectItem>
                      <SelectItem value="mfj">Married Filing Jointly</SelectItem>
                      <SelectItem value="mfs">Married Filing Separately</SelectItem>
                      <SelectItem value="hoh">Head of Household</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="age" className={TYPOGRAPHY.inputLabel}>
                    Your Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={inputs.age || ''}
                    onChange={(e) => updateInput('age', Number(e.target.value) || 35)}
                    placeholder="35"
                  />
                </div>
              </div>
            </div>

            {/* Quick Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className={TYPOGRAPHY.metricLabel}>Net SE Income</p>
                <p className={TYPOGRAPHY.metricMedium}>{fmtFull(netSEIncome)}</p>
                <p className={TYPOGRAPHY.helperText}>After deductions</p>
              </div>
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30">
                <p className={TYPOGRAPHY.metricLabel}>Total Tax Owed</p>
                <p className={`${TYPOGRAPHY.metricMedium} text-red-600 dark:text-red-400`}>
                  {fmtFull(totalTaxOwed)}
                </p>
                <p className={TYPOGRAPHY.helperText}>SE Tax + Income Tax</p>
              </div>
              <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30">
                <p className={TYPOGRAPHY.metricLabel}>Effective Tax Rate</p>
                <p className={`${TYPOGRAPHY.metricMedium} text-amber-600 dark:text-amber-400`}>
                  {fmtPercent(effectiveTaxRate)}
                </p>
                <p className={TYPOGRAPHY.helperText}>On gross income</p>
              </div>
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30">
                <p className={TYPOGRAPHY.metricLabel}>Take-Home Pay</p>
                <p className={`${TYPOGRAPHY.metricMedium} text-green-600 dark:text-green-400`}>
                  {fmtFull(takeHomePay)}
                </p>
                <p className={TYPOGRAPHY.helperText}>After all taxes</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">SE Tax</TabsTrigger>
          <TabsTrigger value="deductions">Deductions</TabsTrigger>
          <TabsTrigger value="quarterly">Quarterly</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="w2">W-2 + 1099</TabsTrigger>
        </TabsList>

        {/* SE Tax Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <TaxShockCard
            seTax={seTaxResult.totalSETax}
            federalTax={federalTaxResult.federalTax}
            totalTax={totalTaxOwed}
            gross1099Income={inputs.gross1099Income}
            effectiveRate={effectiveTaxRate}
          />

          {/* Tax Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Complete Tax Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Income Section */}
                <div className="p-4 rounded-lg bg-muted/30 border">
                  <p className={TYPOGRAPHY.subSectionHeader}>Income</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>Gross 1099 Income</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(inputs.gross1099Income)}</span>
                    </div>
                    <div className="flex justify-between text-red-600 dark:text-red-400">
                      <span>Less: Business Deductions</span>
                      <span>-{fmtFull(inputs.gross1099Income - netSEIncome)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t">
                      <span>Net Self-Employment Income</span>
                      <span>{fmtFull(netSEIncome)}</span>
                    </div>
                  </div>
                </div>

                {/* SE Tax Section */}
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className={`${TYPOGRAPHY.subSectionHeader} text-red-800 dark:text-red-200`}>
                    Self-Employment Tax (15.3%)
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>SE Tax Base (92.35% of net)</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(seTaxResult.seTaxBase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>Social Security (12.4%)</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(seTaxResult.socialSecurityTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>Medicare (2.9%)</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(seTaxResult.medicareTax)}</span>
                    </div>
                    {seTaxResult.additionalMedicareTax > 0 && (
                      <div className="flex justify-between">
                        <span className={TYPOGRAPHY.body}>Additional Medicare (0.9%)</span>
                        <span className={TYPOGRAPHY.body}>{fmtFull(seTaxResult.additionalMedicareTax)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold pt-2 border-t border-red-200 dark:border-red-700">
                      <span>Total SE Tax</span>
                      <span>{fmtFull(seTaxResult.totalSETax)}</span>
                    </div>
                  </div>
                </div>

                {/* Federal Income Tax Section */}
                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className={`${TYPOGRAPHY.subSectionHeader} text-blue-800 dark:text-blue-200`}>
                    Federal Income Tax
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>Gross Income</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(federalTaxResult.grossIncome)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Less: 50% SE Tax Deduction</span>
                      <span>-{fmtFull(seTaxResult.deductiblePortion)}</span>
                    </div>
                    {inputs.healthInsurancePremium > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Less: Health Insurance</span>
                        <span>-{fmtFull(inputs.healthInsurancePremium)}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>AGI</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(federalTaxResult.agi)}</span>
                    </div>
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Less: Standard Deduction</span>
                      <span>-{fmtFull(federalTaxResult.standardDeduction)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.body}>Taxable Income</span>
                      <span className={TYPOGRAPHY.body}>{fmtFull(federalTaxResult.taxableIncome)}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-blue-200 dark:border-blue-700">
                      <span>Federal Income Tax</span>
                      <span>{fmtFull(federalTaxResult.federalTax)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={TYPOGRAPHY.helperText}>Marginal Rate</span>
                      <span className={TYPOGRAPHY.helperText}>{fmtPercent(federalTaxResult.marginalRate)}</span>
                    </div>
                  </div>
                </div>

                {/* Total */}
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border-2">
                  <div className="flex justify-between">
                    <span className={TYPOGRAPHY.sectionHeader}>Total Tax Liability</span>
                    <span className={TYPOGRAPHY.metricMedium}>{fmtFull(totalTaxOwed)}</span>
                  </div>
                  <div className="flex justify-between mt-2">
                    <span className={TYPOGRAPHY.bodyMuted}>Effective Rate on Gross Income</span>
                    <span className={TYPOGRAPHY.body}>{fmtPercent(effectiveTaxRate)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deductions */}
        <TabsContent value="deductions" className="mt-6">
          <DeductionFinder
            inputs={inputs}
            onUpdate={updateInput}
            marginalRate={federalTaxResult.marginalRate + 0.153} // Include SE tax savings
          />
        </TabsContent>

        {/* Quarterly Payments */}
        <TabsContent value="quarterly" className="mt-6">
          <QuarterlyPaymentsCard
            payments={quarterlyPayments}
            annualTaxOwed={totalTaxOwed}
            w2Withholding={inputs.hasW2Job ? inputs.w2FederalWithholding : 0}
          />
        </TabsContent>

        {/* Retirement */}
        <TabsContent value="retirement" className="mt-6">
          <RetirementOpportunity
            options={retirementOptions}
            netSEIncome={netSEIncome}
            marginalRate={federalTaxResult.marginalRate}
            age={inputs.age}
          />
        </TabsContent>

        {/* W-2 Integration */}
        <TabsContent value="w2" className="mt-6">
          <W2Integration
            inputs={inputs}
            onUpdate={updateInput}
            ssWageBaseRemaining={seTaxResult.ssWageBaseRemaining}
          />
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This calculator provides estimates based on 2026 tax rules. Actual tax liability may vary.
          Consult a qualified tax professional for personalized advice. State taxes are not included.
        </p>
      </div>
    </div>
  )
}

export default SideHustleTax
