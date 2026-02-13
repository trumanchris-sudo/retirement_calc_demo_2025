"use client"

import React, { useState, useMemo, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Switch } from "@/components/ui/switch"
import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Calculator,
  CheckCircle2,
  ChevronRight,
  Clock,
  DollarSign,
  FileText,
  HelpCircle,
  Info,
  Landmark,
  PiggyBank,
  Shield,
  Sparkles,
  TrendingUp,
  XCircle,
} from "lucide-react"

// 2026 IRS limits (from onboarding.ts)
const IRS_LIMITS_2026 = {
  iraContribution: 7500,
  iraCatchUp: 1100,
  rothIncomeLimit: {
    single: 165000,
    marriedFilingJointly: 246000,
    marriedFilingSeparately: 10000,
  },
  rothPhaseoutStart: {
    single: 150000,
    marriedFilingJointly: 230000,
  },
  employee401k: 24500,
  catchUp401k: 8000,
  total401k: 72000, // Employee + employer contributions (for mega backdoor calculations)
  afterTax401k: 72000 - 24500, // Max after-tax = total limit - employee limit
}

interface BackdoorRothGuideProps {
  // Optional: pre-fill from user's plan data
  defaultIncome?: number
  defaultAge?: number
  defaultFilingStatus?: "single" | "married"
  defaultTraditionalIRABalance?: number
  defaultHas401kAccess?: boolean
  defaultAfterTax401kAllowed?: boolean
}

interface EligibilityResult {
  eligible: boolean
  reason: string
  recommendation: "backdoor" | "direct" | "partial" | "mega" | "none"
  details: string[]
}

interface ProRataResult {
  taxablePercent: number
  taxableAmount: number
  taxFreeAmount: number
  effectiveTaxRate: number
  recommendation: string
}

type Brokerage = "fidelity" | "vanguard" | "schwab"

const BrokerageSteps: Record<Brokerage, { name: string; steps: string[]; tips: string[] }> = {
  fidelity: {
    name: "Fidelity",
    steps: [
      "Log into Fidelity.com and go to 'Open an Account'",
      "Select 'Traditional IRA' (NOT Roth) - this is the non-deductible contribution",
      "Fund the account with $7,500 (or $8,600 if 50+) - bank transfer or check",
      "Wait 1-3 business days for funds to settle (IMPORTANT: don't convert same day)",
      "Go to 'Accounts & Trade' -> 'Transfer' -> 'Roth Conversion'",
      "Select your Traditional IRA as source, Roth IRA as destination",
      "Convert the ENTIRE balance (should be close to $7,500)",
      "Confirm conversion - you'll see it in Roth within 1-2 business days",
    ],
    tips: [
      "Use 'SPAXX' (money market) as holding fund to avoid gains before conversion",
      "Fidelity has a 'Backdoor Roth Conversion' checklist in their Help Center",
      "You can call 800-343-3548 and say 'backdoor Roth' - they know exactly what you want",
    ],
  },
  vanguard: {
    name: "Vanguard",
    steps: [
      "Log into Vanguard.com and click 'Open an account'",
      "Choose 'Traditional IRA' and fund with $7,500 (or $8,600 if 50+)",
      "Select 'Vanguard Federal Money Market Fund (VMFXX)' as initial investment",
      "Wait for contribution to settle (usually next business day)",
      "Go to 'My Accounts' -> 'Convert to Roth IRA'",
      "Select 'Convert all' to move entire Traditional IRA balance",
      "Review and confirm - conversion processes within 1 business day",
      "Verify conversion completed in your Roth IRA transaction history",
    ],
    tips: [
      "Vanguard's interface calls it 'Convert to Roth' - not 'backdoor'",
      "Keep funds in money market (VMFXX) until conversion to minimize gains",
      "Vanguard has a minimum to open mutual funds, but no minimum for ETFs",
    ],
  },
  schwab: {
    name: "Charles Schwab",
    steps: [
      "Log into Schwab.com and go to 'Accounts' -> 'Open an Account'",
      "Select 'Traditional IRA' and complete the application",
      "Fund with $7,500 (or $8,600 if 50+) via bank transfer",
      "Keep funds in 'SWVXX' (Schwab Value Advantage Money Fund)",
      "Wait 1 business day for settlement",
      "Go to 'Service' -> 'Roth Conversion'",
      "Select your Traditional IRA and convert the full balance",
      "Confirm conversion - typically completes same or next business day",
    ],
    tips: [
      "Schwab's chat support can walk you through the conversion live",
      "The Schwab Intelligent Portfolios team understands backdoor Roth",
      "You can schedule a free consultation with a Schwab financial consultant",
    ],
  },
}

export function BackdoorRothGuide({
  defaultIncome = 0,
  defaultAge = 35,
  defaultFilingStatus = "single",
  defaultTraditionalIRABalance = 0,
  defaultHas401kAccess = true,
  defaultAfterTax401kAllowed = false,
}: BackdoorRothGuideProps) {
  // Form state
  const [income, setIncome] = useState(defaultIncome)
  const [age, setAge] = useState(defaultAge)
  const [filingStatus, setFilingStatus] = useState<"single" | "married">(defaultFilingStatus)
  const [traditionalIRABalance, setTraditionalIRABalance] = useState(defaultTraditionalIRABalance)
  const [has401kAccess, setHas401kAccess] = useState(defaultHas401kAccess)
  const [afterTax401kAllowed, setAfterTax401kAllowed] = useState(defaultAfterTax401kAllowed)
  const [selectedBrokerage, setSelectedBrokerage] = useState<Brokerage>("fidelity")

  // Active tab
  const [activeTab, setActiveTab] = useState("eligibility")

  // Calculate catch-up contribution
  const catchUpEligible = age >= 50
  const maxIRAContribution = catchUpEligible
    ? IRS_LIMITS_2026.iraContribution + IRS_LIMITS_2026.iraCatchUp
    : IRS_LIMITS_2026.iraContribution

  // Eligibility calculation
  const eligibility = useMemo((): EligibilityResult => {
    const limits = IRS_LIMITS_2026.rothIncomeLimit
    const phaseout = IRS_LIMITS_2026.rothPhaseoutStart

    // Check direct Roth eligibility
    const incomeLimit = filingStatus === "married" ? limits.marriedFilingJointly : limits.single
    const phaseoutStart = filingStatus === "married" ? phaseout.marriedFilingJointly : phaseout.single

    if (income === 0) {
      return {
        eligible: false,
        reason: "Enter your income to check eligibility",
        recommendation: "none",
        details: [],
      }
    }

    // Can contribute directly to Roth
    if (income < phaseoutStart) {
      return {
        eligible: true,
        reason: "You can contribute directly to a Roth IRA!",
        recommendation: "direct",
        details: [
          `Your income ($${income.toLocaleString()}) is below the phaseout threshold ($${phaseoutStart.toLocaleString()})`,
          `You can contribute the full $${maxIRAContribution.toLocaleString()} directly to a Roth IRA`,
          "No backdoor conversion needed - just contribute directly",
        ],
      }
    }

    // In phaseout range - partial contribution allowed
    if (income >= phaseoutStart && income < incomeLimit) {
      const phaseoutRange = incomeLimit - phaseoutStart
      const incomeInPhaseout = income - phaseoutStart
      const reductionPercent = incomeInPhaseout / phaseoutRange
      const allowedContribution = Math.floor(maxIRAContribution * (1 - reductionPercent))

      return {
        eligible: true,
        reason: "You're in the phaseout range - consider Backdoor Roth",
        recommendation: "partial",
        details: [
          `Your income ($${income.toLocaleString()}) is in the phaseout range ($${phaseoutStart.toLocaleString()} - $${incomeLimit.toLocaleString()})`,
          `Direct Roth contribution limited to ~$${allowedContribution.toLocaleString()}`,
          `Use Backdoor Roth to contribute the full $${maxIRAContribution.toLocaleString()}`,
        ],
      }
    }

    // Over the limit - must use backdoor
    if (income >= incomeLimit) {
      // Check for mega backdoor opportunity
      if (afterTax401kAllowed && has401kAccess) {
        const megaBackdoorMax = IRS_LIMITS_2026.afterTax401k
        return {
          eligible: true,
          reason: "You qualify for BOTH Backdoor Roth AND Mega Backdoor Roth!",
          recommendation: "mega",
          details: [
            `Your income ($${income.toLocaleString()}) exceeds the Roth IRA limit ($${incomeLimit.toLocaleString()})`,
            `Backdoor Roth IRA: Contribute $${maxIRAContribution.toLocaleString()}/year`,
            `Mega Backdoor Roth: Contribute up to $${megaBackdoorMax.toLocaleString()}/year via after-tax 401(k)`,
            `Combined potential: $${(maxIRAContribution + megaBackdoorMax).toLocaleString()}/year in Roth contributions!`,
          ],
        }
      }

      return {
        eligible: true,
        reason: "Backdoor Roth is your path to Roth contributions",
        recommendation: "backdoor",
        details: [
          `Your income ($${income.toLocaleString()}) exceeds the Roth IRA limit ($${incomeLimit.toLocaleString()})`,
          "You cannot contribute directly to a Roth IRA",
          `Use Backdoor Roth to contribute $${maxIRAContribution.toLocaleString()}/year`,
          has401kAccess && !afterTax401kAllowed
            ? "Check if your 401(k) allows after-tax contributions for Mega Backdoor"
            : "",
        ].filter(Boolean),
      }
    }

    return {
      eligible: false,
      reason: "Unable to determine eligibility",
      recommendation: "none",
      details: [],
    }
  }, [income, filingStatus, maxIRAContribution, has401kAccess, afterTax401kAllowed])

  // Pro-rata calculation
  const proRata = useMemo((): ProRataResult => {
    if (traditionalIRABalance === 0) {
      return {
        taxablePercent: 0,
        taxableAmount: 0,
        taxFreeAmount: maxIRAContribution,
        effectiveTaxRate: 0,
        recommendation:
          "No existing Traditional IRA balance - your conversion will be tax-free!",
      }
    }

    // Pro-rata formula: Taxable % = Pre-tax balance / (Pre-tax balance + contribution)
    const totalIRABalance = traditionalIRABalance + maxIRAContribution
    const taxablePercent = (traditionalIRABalance / totalIRABalance) * 100
    const taxableAmount = (maxIRAContribution * traditionalIRABalance) / totalIRABalance
    const taxFreeAmount = maxIRAContribution - taxableAmount

    // Estimate tax (assume 24% marginal rate for high earners)
    const estimatedTaxRate = 0.24
    const effectiveTaxRate = taxablePercent * estimatedTaxRate

    let recommendation = ""
    if (taxablePercent < 10) {
      recommendation =
        "Low pro-rata impact - backdoor Roth is still very beneficial. Proceed with conversion."
    } else if (taxablePercent < 30) {
      recommendation =
        "Moderate pro-rata impact. Consider rolling Traditional IRA into 401(k) first to eliminate the balance."
    } else if (taxablePercent < 50) {
      recommendation =
        "Significant pro-rata impact. Strongly recommend rolling IRA into 401(k) before backdoor conversion."
    } else {
      recommendation =
        "High pro-rata impact. Rolling IRA into 401(k) is essential before backdoor Roth makes sense."
    }

    return {
      taxablePercent,
      taxableAmount,
      taxFreeAmount,
      effectiveTaxRate,
      recommendation,
    }
  }, [traditionalIRABalance, maxIRAContribution])

  // Format currency helper
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }, [])

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-purple-600" />
          Backdoor Roth IRA Guide
        </CardTitle>
        <CardDescription>
          High earners can still contribute to Roth IRA through this legal "backdoor" strategy.
          Follow this step-by-step guide to maximize your tax-free retirement savings.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-1">
            <TabsTrigger value="eligibility" className="text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 mr-1 hidden sm:inline" />
              Eligibility
            </TabsTrigger>
            <TabsTrigger value="prorata" className="text-xs sm:text-sm">
              <Calculator className="h-4 w-4 mr-1 hidden sm:inline" />
              Pro-Rata
            </TabsTrigger>
            <TabsTrigger value="steps" className="text-xs sm:text-sm">
              <ChevronRight className="h-4 w-4 mr-1 hidden sm:inline" />
              Steps
            </TabsTrigger>
            <TabsTrigger value="mega" className="text-xs sm:text-sm">
              <TrendingUp className="h-4 w-4 mr-1 hidden sm:inline" />
              Mega
            </TabsTrigger>
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="taxes" className="text-xs sm:text-sm">
              <FileText className="h-4 w-4 mr-1 hidden sm:inline" />
              Form 8606
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Eligibility Checker */}
          <TabsContent value="eligibility" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Input Form */}
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                  <h3 className="font-semibold text-lg flex items-center gap-2">
                    <HelpCircle className="h-5 w-5 text-blue-600" />
                    Check Your Eligibility
                  </h3>

                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="income">Annual Income (MAGI)</Label>
                      <div className="relative mt-1">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="income"
                          type="number"
                          value={income || ""}
                          onChange={(e) => setIncome(Number(e.target.value))}
                          placeholder="150000"
                          className="pl-8"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Modified Adjusted Gross Income from your tax return
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="age">Your Age</Label>
                      <Input
                        id="age"
                        type="number"
                        value={age}
                        onChange={(e) => setAge(Number(e.target.value))}
                        placeholder="35"
                        className="mt-1"
                      />
                      {catchUpEligible && (
                        <Badge variant="outline" className="mt-1 bg-green-50 text-green-700">
                          50+ Catch-up eligible: +$1,100
                        </Badge>
                      )}
                    </div>

                    <div>
                      <Label>Filing Status</Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          variant={filingStatus === "single" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilingStatus("single")}
                        >
                          Single
                        </Button>
                        <Button
                          variant={filingStatus === "married" ? "default" : "outline"}
                          size="sm"
                          onClick={() => setFilingStatus("married")}
                        >
                          Married Filing Jointly
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="has401k">Have access to 401(k)?</Label>
                      <Switch
                        id="has401k"
                        checked={has401kAccess}
                        onCheckedChange={setHas401kAccess}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="afterTax401k">401(k) allows after-tax contributions?</Label>
                      <Switch
                        id="afterTax401k"
                        checked={afterTax401kAllowed}
                        onCheckedChange={setAfterTax401kAllowed}
                        disabled={!has401kAccess}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Results */}
              <div className="space-y-4">
                {/* Eligibility Result Card */}
                <div
                  className={`rounded-lg p-4 border ${
                    eligibility.recommendation === "direct"
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900"
                      : eligibility.recommendation === "mega"
                      ? "bg-purple-50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-900"
                      : eligibility.recommendation === "backdoor" ||
                        eligibility.recommendation === "partial"
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900"
                      : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {eligibility.recommendation === "direct" ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 mt-0.5 flex-shrink-0" />
                    ) : eligibility.recommendation === "mega" ? (
                      <Sparkles className="h-6 w-6 text-purple-600 mt-0.5 flex-shrink-0" />
                    ) : eligibility.recommendation !== "none" ? (
                      <ArrowRight className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                    ) : (
                      <HelpCircle className="h-6 w-6 text-gray-400 mt-0.5 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h4 className="font-semibold text-lg">{eligibility.reason}</h4>
                      <ul className="mt-2 space-y-1">
                        {eligibility.details.map((detail, idx) => (
                          <li key={idx} className="text-sm flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* 2026 Income Limits Reference */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 border border-gray-200 dark:border-gray-800">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    2026 Roth IRA Income Limits
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-muted-foreground">Single</div>
                      <div>
                        Phaseout: ${IRS_LIMITS_2026.rothPhaseoutStart.single.toLocaleString()} -
                        ${IRS_LIMITS_2026.rothIncomeLimit.single.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Married Filing Jointly</div>
                      <div>
                        Phaseout: ${IRS_LIMITS_2026.rothPhaseoutStart.marriedFilingJointly.toLocaleString()} -
                        ${IRS_LIMITS_2026.rothIncomeLimit.marriedFilingJointly.toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-full pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="text-muted-foreground">Contribution Limits</div>
                      <div>
                        Under 50: ${IRS_LIMITS_2026.iraContribution.toLocaleString()} |{" "}
                        50+: ${(IRS_LIMITS_2026.iraContribution + IRS_LIMITS_2026.iraCatchUp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* What is Backdoor Roth? */}
                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    What is Backdoor Roth?
                  </h4>
                  <div className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
                    <p>
                      The "backdoor" strategy lets high earners contribute to a Roth IRA even when
                      their income exceeds the limits:
                    </p>
                    <ol className="list-decimal list-inside space-y-1 pl-2">
                      <li>Contribute to a <strong>Traditional IRA</strong> (non-deductible)</li>
                      <li>Immediately <strong>convert</strong> to Roth IRA</li>
                      <li>Pay tax only on <strong>gains</strong> (usually near $0)</li>
                    </ol>
                    <p className="text-xs mt-2 opacity-80">
                      This is 100% legal and has been explicitly allowed by Congress and the IRS since 2010.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 2: Pro-Rata Calculator */}
          <TabsContent value="prorata" className="space-y-6 mt-6">
            <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">
                    The Pro-Rata Rule: Why It Matters
                  </h4>
                  <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                    If you have existing pre-tax Traditional IRA money, the IRS requires you to pay tax
                    on a proportional amount of your conversion. This is called the "pro-rata rule."
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Calculator Input */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-blue-600" />
                  Calculate Your Pro-Rata Impact
                </h3>

                <div>
                  <Label htmlFor="traditionalBalance">Existing Traditional IRA Balance</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="traditionalBalance"
                      type="number"
                      value={traditionalIRABalance || ""}
                      onChange={(e) => setTraditionalIRABalance(Number(e.target.value))}
                      placeholder="0"
                      className="pl-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Include all Traditional, SEP, and SIMPLE IRA balances (as of Dec 31)
                  </p>
                </div>

                <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Backdoor contribution:</span>
                      <span className="font-medium">{formatCurrency(maxIRAContribution)}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-muted-foreground">Total IRA after contribution:</span>
                      <span className="font-medium">
                        {formatCurrency(traditionalIRABalance + maxIRAContribution)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pro-Rata Results */}
              <div className="space-y-4">
                {/* Visual breakdown */}
                <div className="rounded-lg border p-4">
                  <h4 className="font-medium mb-3">Conversion Tax Breakdown</h4>

                  {traditionalIRABalance === 0 ? (
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 text-center">
                      <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                      <div className="font-semibold text-green-900 dark:text-green-100">
                        100% Tax-Free Conversion!
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        No existing IRA balance = no pro-rata tax
                      </p>
                    </div>
                  ) : (
                    <>
                      {/* Progress bar visualization */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Tax-free portion</span>
                          <span className="font-medium text-green-600">
                            {formatCurrency(proRata.taxFreeAmount)} ({(100 - proRata.taxablePercent).toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full h-6 bg-red-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 transition-all duration-500"
                            style={{ width: `${100 - proRata.taxablePercent}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Taxable portion</span>
                          <span className="font-medium text-red-600">
                            {formatCurrency(proRata.taxableAmount)} ({proRata.taxablePercent.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex justify-between text-sm">
                          <span>Estimated tax (at 24% bracket):</span>
                          <span className="font-semibold text-red-600">
                            {formatCurrency(proRata.taxableAmount * 0.24)}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Recommendation */}
                <div
                  className={`rounded-lg p-4 border ${
                    proRata.taxablePercent === 0
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200"
                      : proRata.taxablePercent < 30
                      ? "bg-blue-50 dark:bg-blue-950/20 border-blue-200"
                      : "bg-orange-50 dark:bg-orange-950/20 border-orange-200"
                  }`}
                >
                  <h4 className="font-medium mb-2">Recommendation</h4>
                  <p className="text-sm">{proRata.recommendation}</p>
                </div>

                {/* Solution for high pro-rata */}
                {traditionalIRABalance > 0 && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                      <Landmark className="h-4 w-4" />
                      Solution: Reverse Rollover
                    </h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200 mb-3">
                      Roll your Traditional IRA into your employer's 401(k) to eliminate the pro-rata issue:
                    </p>
                    <ol className="text-sm text-purple-800 dark:text-purple-200 list-decimal list-inside space-y-1">
                      <li>Check if your 401(k) accepts incoming rollovers</li>
                      <li>Contact your 401(k) provider to initiate the rollover</li>
                      <li>Roll entire Traditional IRA balance into 401(k)</li>
                      <li>Once complete, your IRA balance is $0</li>
                      <li>Now do backdoor Roth with no pro-rata impact!</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Step-by-Step Instructions */}
          <TabsContent value="steps" className="space-y-6 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
              {(["fidelity", "vanguard", "schwab"] as Brokerage[]).map((brokerage) => (
                <Button
                  key={brokerage}
                  variant={selectedBrokerage === brokerage ? "default" : "outline"}
                  onClick={() => setSelectedBrokerage(brokerage)}
                  className="justify-start"
                >
                  <Landmark className="h-4 w-4 mr-2" />
                  {BrokerageSteps[brokerage].name}
                </Button>
              ))}
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-6">
              <h3 className="font-semibold text-xl mb-4 flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-blue-600" />
                Step-by-Step: {BrokerageSteps[selectedBrokerage].name}
              </h3>

              <div className="space-y-4">
                {BrokerageSteps[selectedBrokerage].steps.map((step, idx) => (
                  <div key={idx} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                      {idx + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-sm">{step}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tips */}
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-yellow-500" />
                  Pro Tips for {BrokerageSteps[selectedBrokerage].name}
                </h4>
                <ul className="space-y-2">
                  {BrokerageSteps[selectedBrokerage].tips.map((tip, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Common Mistakes */}
            <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
              <h4 className="font-semibold text-red-900 dark:text-red-100 mb-3 flex items-center gap-2">
                <XCircle className="h-5 w-5" />
                Common Mistakes to Avoid
              </h4>
              <ul className="space-y-2 text-sm text-red-800 dark:text-red-200">
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Don't invest before converting:</strong> Keep funds in money market to avoid gains
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Don't convert same day:</strong> Wait for funds to settle (1-3 days)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Don't forget Form 8606:</strong> File with your tax return every year
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>
                    <strong>Don't leave money in Traditional IRA:</strong> Convert everything, even small gains
                  </span>
                </li>
              </ul>
            </div>
          </TabsContent>

          {/* Tab 4: Mega Backdoor Roth */}
          <TabsContent value="mega" className="space-y-6 mt-6">
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <TrendingUp className="h-6 w-6 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 text-lg">
                    Mega Backdoor Roth: The Ultimate Tax-Free Savings
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">
                    If your employer allows after-tax 401(k) contributions AND in-service withdrawals
                    or in-plan conversions, you can save up to{" "}
                    <strong>${IRS_LIMITS_2026.afterTax401k.toLocaleString()}/year</strong> extra in Roth!
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Requirements Checklist</h3>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex-shrink-0">
                      {has401kAccess ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">Access to 401(k)</div>
                      <p className="text-sm text-muted-foreground">
                        You need an employer-sponsored 401(k) plan
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex-shrink-0">
                      {afterTax401kAllowed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <HelpCircle className="h-5 w-5 text-yellow-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">After-Tax Contributions Allowed</div>
                      <p className="text-sm text-muted-foreground">
                        Check your plan documents or HR - not all 401(k)s allow this
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex-shrink-0">
                      <HelpCircle className="h-5 w-5 text-yellow-500" />
                    </div>
                    <div>
                      <div className="font-medium">In-Plan Conversion or In-Service Withdrawal</div>
                      <p className="text-sm text-muted-foreground">
                        Your plan must allow converting after-tax to Roth 401(k) OR withdrawing to Roth IRA
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                    How to Find Out
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>Check your 401(k) Summary Plan Description (SPD)</li>
                    <li>Search for "after-tax" and "in-service" or "in-plan conversion"</li>
                    <li>Call your 401(k) provider and ask specifically</li>
                    <li>Ask HR if they offer "mega backdoor Roth"</li>
                  </ol>
                </div>
              </div>

              {/* Contribution Limits Breakdown */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">2026 401(k) Contribution Limits</h3>

                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                        <td className="p-3">Employee Pre-Tax/Roth 401(k)</td>
                        <td className="p-3 text-right font-medium">
                          ${IRS_LIMITS_2026.employee401k.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3">Catch-Up (50+)</td>
                        <td className="p-3 text-right font-medium">
                          +${IRS_LIMITS_2026.catchUp401k.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                        <td className="p-3">Total 401(k) Limit (incl. employer)</td>
                        <td className="p-3 text-right font-medium">
                          ${IRS_LIMITS_2026.total401k.toLocaleString()}
                        </td>
                      </tr>
                      <tr className="bg-purple-50 dark:bg-purple-950/20">
                        <td className="p-3 font-medium">After-Tax Space (Mega Backdoor)</td>
                        <td className="p-3 text-right font-bold text-purple-700 dark:text-purple-300">
                          Up to ${IRS_LIMITS_2026.afterTax401k.toLocaleString()}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="text-sm text-muted-foreground">
                  <p>
                    <strong>Formula:</strong> After-tax space = $72,000 - (your contributions) - (employer match)
                  </p>
                  <p className="mt-1">
                    Example: If you contribute $24,500 and get $8,000 match, your after-tax space is
                    $72,000 - $24,500 - $8,000 = <strong>$39,500</strong>
                  </p>
                </div>

                {/* Mega Backdoor Steps */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium mb-3">Mega Backdoor Steps</h4>
                  <ol className="text-sm space-y-2 list-decimal list-inside">
                    <li>Max out your regular pre-tax/Roth 401(k) contributions</li>
                    <li>Elect after-tax contributions (up to your available space)</li>
                    <li>
                      Immediately convert/withdraw after-tax funds to:
                      <ul className="ml-6 mt-1 list-disc">
                        <li>Roth 401(k) (in-plan conversion), OR</li>
                        <li>Roth IRA (in-service withdrawal + rollover)</li>
                      </ul>
                    </li>
                    <li>Repeat with each paycheck (some plans allow automatic conversion)</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Combined Maximum */}
            {afterTax401kAllowed && (
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-6 text-center">
                <div className="text-sm text-green-700 dark:text-green-400 mb-1">
                  Your Maximum Annual Roth Contributions
                </div>
                <div className="text-4xl font-bold text-green-900 dark:text-green-100">
                  ${(maxIRAContribution + IRS_LIMITS_2026.afterTax401k).toLocaleString()}
                </div>
                <div className="text-sm text-green-700 dark:text-green-400 mt-2">
                  Backdoor Roth IRA (${maxIRAContribution.toLocaleString()}) + Mega Backdoor ($
                  {IRS_LIMITS_2026.afterTax401k.toLocaleString()})
                </div>
              </div>
            )}
          </TabsContent>

          {/* Tab 5: Calendar Reminder */}
          <TabsContent value="calendar" className="space-y-6 mt-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Calendar className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                    Make It a January Ritual
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    The most tax-efficient approach is to do your Backdoor Roth at the start of each year.
                    This maximizes time in the market and simplifies tax filing.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Annual Checklist */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Annual Backdoor Roth Checklist
                </h3>

                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        J
                      </div>
                      <div>
                        <div className="font-medium">January 2-5</div>
                        <p className="text-sm text-muted-foreground">
                          Contribute ${maxIRAContribution.toLocaleString()} to Traditional IRA
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        J
                      </div>
                      <div>
                        <div className="font-medium">January 5-10</div>
                        <p className="text-sm text-muted-foreground">
                          Convert to Roth IRA (after settlement)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-400 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        J
                      </div>
                      <div>
                        <div className="font-medium">January 10-15</div>
                        <p className="text-sm text-muted-foreground">
                          Invest converted funds in your target allocation
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-400 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
                        A
                      </div>
                      <div>
                        <div className="font-medium">April (Tax Time)</div>
                        <p className="text-sm text-muted-foreground">
                          File Form 8606 with your tax return
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Set Reminder */}
                <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200">
                  <h4 className="font-medium text-green-900 dark:text-green-100 mb-3">
                    Set Your Reminder
                  </h4>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start" asChild>
                      <a
                        href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=Backdoor%20Roth%20IRA%20Contribution&dates=${new Date().getFullYear() + 1}0102T090000/${new Date().getFullYear() + 1}0102T100000&details=1.%20Contribute%20%24${maxIRAContribution}%20to%20Traditional%20IRA%0A2.%20Wait%203%20days%20for%20settlement%0A3.%20Convert%20to%20Roth%20IRA&recur=RRULE:FREQ=YEARLY`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Add to Google Calendar (Yearly)
                      </a>
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Creates a recurring January 2nd reminder
                    </p>
                  </div>
                </div>
              </div>

              {/* Tax Year Timeline */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Important Deadlines</h3>

                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="p-3 text-left">Deadline</th>
                        <th className="p-3 text-left">What It Means</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="p-3 font-medium">January 1</td>
                        <td className="p-3">
                          New contribution year begins - can start contributing immediately
                        </td>
                      </tr>
                      <tr className="border-b bg-gray-50 dark:bg-gray-900/50">
                        <td className="p-3 font-medium">April 15</td>
                        <td className="p-3">
                          Last day to contribute for PRIOR year (e.g., April 15, 2027 for 2026)
                        </td>
                      </tr>
                      <tr className="border-b">
                        <td className="p-3 font-medium">December 31</td>
                        <td className="p-3">
                          IRA balances are calculated for pro-rata rule as of this date
                        </td>
                      </tr>
                      <tr className="bg-yellow-50 dark:bg-yellow-950/20">
                        <td className="p-3 font-medium">Anytime</td>
                        <td className="p-3">
                          Roth conversions can be done anytime - no deadline
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-4 border border-yellow-200">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-100 mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Why January is Best
                  </h4>
                  <ul className="text-sm text-yellow-800 dark:text-yellow-200 space-y-1 list-disc list-inside">
                    <li>Full year of tax-free growth in Roth</li>
                    <li>No confusion about which tax year applies</li>
                    <li>Easier to track and remember</li>
                    <li>Minimal gains between contribution and conversion</li>
                    <li>Aligns with New Year financial planning</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 6: Form 8606 */}
          <TabsContent value="taxes" className="space-y-6 mt-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <FileText className="h-6 w-6 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 text-lg">
                    Form 8606: Nondeductible IRAs
                  </h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                    You MUST file Form 8606 with your tax return every year you do a Backdoor Roth.
                    This tracks your non-deductible contributions and reports the conversion.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form 8606 Parts Explanation */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Understanding Form 8606</h3>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="part1">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge>Part I</Badge>
                        Nondeductible Contributions
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>
                          <strong>Line 1:</strong> Your nondeductible contribution for this year
                          (${maxIRAContribution.toLocaleString()})
                        </p>
                        <p>
                          <strong>Line 2:</strong> Total basis from prior years (from last year's Line 14)
                        </p>
                        <p>
                          <strong>Line 3:</strong> Add Lines 1 + 2 = Your total basis
                        </p>
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded">
                          <strong>Key point:</strong> This tracks your "basis" - the money you already paid taxes on.
                          You don't pay tax again on this when you convert.
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="part2">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge>Part II</Badge>
                        Conversions to Roth IRA
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-3 text-sm">
                        <p>
                          <strong>Line 16:</strong> Amount converted to Roth this year
                        </p>
                        <p>
                          <strong>Line 17:</strong> Your basis (non-taxable portion)
                        </p>
                        <p>
                          <strong>Line 18:</strong> Taxable amount = Line 16 - Line 17
                        </p>
                        <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded">
                          <strong>For clean Backdoor Roth:</strong> If you have no other IRA balances
                          and converted immediately, Line 18 should be very small (just any gains).
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="part3">
                    <AccordionTrigger>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Part III</Badge>
                        Distributions (Usually Skip)
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm">
                        <p>
                          Part III is for distributions from Traditional/SEP/SIMPLE IRAs that
                          include non-deductible contributions. For a clean Backdoor Roth
                          (no existing IRA balance), you typically skip this section.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Sample Filled Form */}
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mt-4">
                  <h4 className="font-medium mb-3">Example: Clean Backdoor Roth</h4>
                  <div className="font-mono text-sm space-y-1">
                    <div className="flex justify-between border-b pb-1">
                      <span>Line 1 (contribution):</span>
                      <span>${maxIRAContribution.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Line 2 (prior basis):</span>
                      <span>$0</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Line 3 (total basis):</span>
                      <span>${maxIRAContribution.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1 pt-2">
                      <span>Line 16 (converted):</span>
                      <span>${maxIRAContribution.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-b pb-1">
                      <span>Line 17 (basis):</span>
                      <span>${maxIRAContribution.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between font-bold text-green-600">
                      <span>Line 18 (taxable):</span>
                      <span>$0</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Common Questions */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Tax FAQ</h3>

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="faq1">
                    <AccordionTrigger>Do I need to file Form 8606 every year?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        <strong>Yes!</strong> File Form 8606 every year you make a nondeductible
                        Traditional IRA contribution OR convert to Roth. Even if you forget one
                        year, file it late - there's a $50 penalty for not filing, and you need
                        the paper trail.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq2">
                    <AccordionTrigger>Will I get a 1099-R?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        <strong>Yes.</strong> Your brokerage will send you a 1099-R showing the
                        conversion in Box 1. Box 2a (taxable amount) might show the full amount
                        or be blank - either way, Form 8606 is where you calculate the actual
                        taxable amount.
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq3">
                    <AccordionTrigger>What if I had gains before converting?</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm">
                        Any gains between contribution and conversion are taxable. This is why
                        we recommend converting quickly and keeping funds in money market.
                        If you had $50 in gains, you'll pay tax on $50 (probably ~$12 at 24% bracket).
                      </p>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq4">
                    <AccordionTrigger>Do I need a tax professional?</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm space-y-2">
                        <p>
                          <strong>For a clean Backdoor Roth</strong> (no existing IRA balance):
                          You can likely do this yourself with TurboTax, H&R Block, or similar software.
                          They have specific Backdoor Roth interview questions.
                        </p>
                        <p>
                          <strong>If you have existing IRA balances</strong> or complex situations:
                          Consider consulting a CPA or tax professional, at least the first year.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="faq5">
                    <AccordionTrigger>Is Backdoor Roth actually legal?</AccordionTrigger>
                    <AccordionContent>
                      <div className="text-sm space-y-2">
                        <p>
                          <strong>100% legal.</strong> Congress explicitly allowed Roth conversions
                          for everyone (regardless of income) starting in 2010. The IRS has never
                          challenged a properly executed Backdoor Roth.
                        </p>
                        <p>
                          The "step transaction doctrine" concern has been discussed but never applied.
                          Multiple IRS and Treasury officials have acknowledged this strategy is valid.
                        </p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Software Tips */}
                <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200">
                  <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-2 flex items-center gap-2">
                    <PiggyBank className="h-4 w-4" />
                    Tax Software Tips
                  </h4>
                  <ul className="text-sm text-purple-800 dark:text-purple-200 space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                      <span>
                        <strong>TurboTax:</strong> Use "Deductions & Credits" then "Retirement Savings."
                        Answer "No" when asked if your contribution was deductible.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                      <span>
                        <strong>H&R Block:</strong> Look for "IRA Contributions" and "IRA Conversions"
                        in the Retirement section.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-purple-600" />
                      <span>
                        <strong>FreeTaxUSA:</strong> Supports Form 8606 in the paid version (~$15).
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Bottom Summary */}
        <div className="mt-8 pt-6 border-t">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 rounded-lg p-6">
            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-purple-600" />
              Your Backdoor Roth Summary
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {formatCurrency(maxIRAContribution)}
                </div>
                <div className="text-sm text-muted-foreground">Annual Backdoor Roth</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {proRata.taxablePercent.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Pro-Rata Impact</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {eligibility.recommendation === "mega"
                    ? formatCurrency(maxIRAContribution + IRS_LIMITS_2026.afterTax401k)
                    : formatCurrency(maxIRAContribution)}
                </div>
                <div className="text-sm text-muted-foreground">Total Roth Potential</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-600">Jan</div>
                <div className="text-sm text-muted-foreground">Best Time to Start</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default BackdoorRothGuide
