"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { NumericInput } from "@/components/form/NumericInput";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import {
  Heart,
  Shield,
  TrendingUp,
  CheckCircle2,
  XCircle,
  DollarSign,
  AlertTriangle,
  Sparkles,
  Receipt,
  PiggyBank,
  Calendar,
  HelpCircle,
  ArrowRight,
  Trophy,
  Banknote,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

// 2024 HSA contribution limits
const HSA_LIMITS_2024 = {
  self: 4150,
  family: 8300,
  catchUp: 1000, // Additional contribution for 55+
};

// HDHP minimums for 2024
const HDHP_MINIMUMS_2024 = {
  selfDeductible: 1600,
  familyDeductible: 3200,
  selfMaxOutOfPocket: 8050,
  familyMaxOutOfPocket: 16100,
};

interface HSAStrategyProps {
  currentAge?: number;
  retirementAge?: number;
  currentHSABalance?: number;
  annualMedicalExpenses?: number;
  className?: string;
}

interface EligibilityCheckState {
  hasHDHP: boolean | null;
  deductibleAmount: number;
  coverageType: "self" | "family";
  hasMedicare: boolean;
  hasOtherCoverage: boolean;
}

export default function HSAStrategy({
  currentAge = 35,
  retirementAge = 65,
  currentHSABalance = 0,
  annualMedicalExpenses = 5000,
  className,
}: HSAStrategyProps) {
  // State for interactive eligibility checker
  const [eligibility, setEligibility] = useState<EligibilityCheckState>({
    hasHDHP: null,
    deductibleAmount: 2000,
    coverageType: "self",
    hasMedicare: false,
    hasOtherCoverage: false,
  });

  // State for projection inputs
  const [hsaInputs, setHsaInputs] = useState({
    currentBalance: currentHSABalance,
    annualContribution: HSA_LIMITS_2024.self,
    expectedReturn: 7,
    annualMedicalExpenses: annualMedicalExpenses,
    saveReceiptsStrategy: true,
  });

  // Calculate eligibility
  const isEligible = useMemo(() => {
    if (eligibility.hasMedicare) return false;
    if (eligibility.hasOtherCoverage) return false;
    if (eligibility.hasHDHP === false) return false;
    if (eligibility.hasHDHP === null) return null;

    const minDeductible =
      eligibility.coverageType === "self"
        ? HDHP_MINIMUMS_2024.selfDeductible
        : HDHP_MINIMUMS_2024.familyDeductible;

    return eligibility.deductibleAmount >= minDeductible;
  }, [eligibility]);

  // Calculate contribution limit
  const contributionLimit = useMemo(() => {
    const base =
      eligibility.coverageType === "self"
        ? HSA_LIMITS_2024.self
        : HSA_LIMITS_2024.family;
    const catchUp = currentAge >= 55 ? HSA_LIMITS_2024.catchUp : 0;
    return base + catchUp;
  }, [eligibility.coverageType, currentAge]);

  // Calculate HSA projection
  const hsaProjection = useMemo(() => {
    const yearsToRetirement = Math.max(0, retirementAge - currentAge);
    const yearsToMedicare = Math.max(0, 65 - currentAge);
    const contributionYears = Math.min(yearsToRetirement, yearsToMedicare);
    const r = hsaInputs.expectedReturn / 100;

    let balance = hsaInputs.currentBalance;
    const yearlyBalances: number[] = [balance];

    // Accumulation phase (can contribute until Medicare at 65)
    for (let y = 0; y < contributionYears; y++) {
      balance = balance * (1 + r) + hsaInputs.annualContribution;
      yearlyBalances.push(balance);
    }

    // Growth phase after Medicare (can still invest, just can't contribute)
    for (let y = contributionYears; y < yearsToRetirement; y++) {
      balance = balance * (1 + r);
      yearlyBalances.push(balance);
    }

    // Calculate receipt strategy value
    const totalReceiptValue = hsaInputs.saveReceiptsStrategy
      ? hsaInputs.annualMedicalExpenses * contributionYears
      : 0;

    return {
      finalBalance: balance,
      yearlyBalances,
      totalContributions: hsaInputs.annualContribution * contributionYears,
      totalGrowth:
        balance -
        hsaInputs.currentBalance -
        hsaInputs.annualContribution * contributionYears,
      receiptValue: totalReceiptValue,
      contributionYears,
    };
  }, [
    hsaInputs,
    currentAge,
    retirementAge,
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Hero Section - The HSA Secret */}
      <Card className="border-2 border-emerald-500 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-teal-500/10 rounded-full -ml-12 -mb-12" />

        <CardHeader className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-emerald-600 hover:bg-emerald-600">
              <Trophy className="w-3 h-3 mr-1" />
              Best Kept Secret
            </Badge>
            <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-400">
              Triple Tax Advantage
            </Badge>
          </div>
          <CardTitle className="text-2xl sm:text-3xl flex items-center gap-2">
            <Shield className="h-7 w-7 text-emerald-600" />
            The HSA: America's Most Underutilized Retirement Account
          </CardTitle>
          <CardDescription className="text-base">
            Forget Traditional vs Roth debates. The HSA is the ONLY account with a{" "}
            <span className="font-bold text-emerald-700 dark:text-emerald-400">
              triple tax advantage
            </span>
            . Most people don't even know it exists.
          </CardDescription>
        </CardHeader>

        <CardContent className="relative space-y-6">
          {/* Triple Tax Advantage Visual */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tax Free In */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">1</span>
                </div>
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Tax-Free In
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Contributions are pre-tax, reducing your taxable income
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Like Traditional 401(k)</span>
              </div>
            </div>

            {/* Tax Free Growth */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">2</span>
                </div>
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Tax-Free Growth
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Investments grow completely tax-free, no capital gains
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>Like Roth IRA</span>
              </div>
            </div>

            {/* Tax Free Out */}
            <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center">
                  <span className="text-emerald-700 dark:text-emerald-300 font-bold">3</span>
                </div>
                <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Tax-Free Out
                </h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Withdrawals for medical expenses are 100% tax-free
              </p>
              <div className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                <span>UNIQUE to HSA</span>
              </div>
            </div>
          </div>

          {/* No Other Account Has This */}
          <div className="bg-emerald-100/50 dark:bg-emerald-900/30 rounded-lg p-4 border border-emerald-300 dark:border-emerald-700">
            <p className="text-center font-medium text-emerald-800 dark:text-emerald-200">
              <Sparkles className="inline w-4 h-4 mr-1" />
              No other retirement account in America offers ALL THREE tax benefits.
              <Sparkles className="inline w-4 h-4 ml-1" />
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Table: HSA vs Traditional vs Roth */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            HSA vs Traditional vs Roth: The Clear Winner
          </CardTitle>
          <CardDescription>
            For medical expenses in retirement, HSA wins every time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Tax Benefit</th>
                  <th className="text-center py-3 px-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-100 dark:bg-emerald-900 rounded-full text-emerald-700 dark:text-emerald-300 font-semibold">
                      <Trophy className="w-3 h-3" />
                      HSA
                    </span>
                  </th>
                  <th className="text-center py-3 px-2 font-medium">Traditional 401(k)/IRA</th>
                  <th className="text-center py-3 px-2 font-medium">Roth 401(k)/IRA</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">Contributions are tax-deductible</td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">Tax-free growth</td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">Tax-free withdrawals (medical)</td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b hover:bg-muted/50">
                  <td className="py-3 px-2">No RMDs ever</td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <XCircle className="w-5 h-5 text-gray-400 mx-auto" />
                  </td>
                  <td className="text-center py-3 px-2">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 mx-auto" />
                  </td>
                </tr>
                <tr className="hover:bg-muted/50">
                  <td className="py-3 px-2 font-semibold">Total Tax Benefits</td>
                  <td className="text-center py-3 px-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded-full font-bold">
                      3/3
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full font-medium">
                      1/3
                    </span>
                  </td>
                  <td className="text-center py-3 px-2">
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full font-medium">
                      2/3
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/50 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>The math:</strong> For every $1,000 in medical expenses, an HSA user in the
              25% tax bracket saves{" "}
              <span className="font-bold">$250+ in taxes</span> compared to paying out of pocket.
              Over 30 years of retirement medical costs, this adds up to{" "}
              <span className="font-bold">tens of thousands</span> in tax savings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* The Stealth IRA Strategy */}
      <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-purple-600 hover:bg-purple-600">
              <Sparkles className="w-3 h-3 mr-1" />
              Advanced Strategy
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-purple-600" />
            The "Stealth IRA" Receipt Strategy
          </CardTitle>
          <CardDescription>
            The most powerful HSA hack that almost nobody uses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-purple-700 dark:text-purple-400 mb-3">
              The Strategy in 4 Steps:
            </h4>
            <ol className="space-y-3">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                  1
                </span>
                <div>
                  <p className="font-medium">Pay medical expenses out of pocket today</p>
                  <p className="text-sm text-muted-foreground">
                    Don't touch your HSA for current medical bills
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                  2
                </span>
                <div>
                  <p className="font-medium">Save all your medical receipts</p>
                  <p className="text-sm text-muted-foreground">
                    Store them digitally - there's NO time limit to claim reimbursement
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                  3
                </span>
                <div>
                  <p className="font-medium">Invest your HSA contributions aggressively</p>
                  <p className="text-sm text-muted-foreground">
                    Let the money grow tax-free for decades
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-sm">
                  4
                </span>
                <div>
                  <p className="font-medium">Reimburse yourself TAX-FREE in retirement</p>
                  <p className="text-sm text-muted-foreground">
                    Withdraw the full amount of your saved receipts - completely tax-free!
                  </p>
                </div>
              </li>
            </ol>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-4">
              <h5 className="font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Why This Works
              </h5>
              <p className="text-sm text-muted-foreground">
                The IRS allows you to reimburse yourself for ANY qualified medical expense
                incurred after your HSA was established - even expenses from 20+ years ago.
                There is no time limit!
              </p>
            </div>
            <div className="bg-purple-100/50 dark:bg-purple-900/30 rounded-lg p-4">
              <h5 className="font-semibold text-purple-700 dark:text-purple-400 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                The Power of Time
              </h5>
              <p className="text-sm text-muted-foreground">
                A $1,000 medical expense paid out of pocket today could let that $1,000 grow
                tax-free in your HSA for 30 years. At 7% returns, that's $7,612 you can
                withdraw tax-free!
              </p>
            </div>
          </div>

          {/* Receipt Value Calculator */}
          <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center justify-between mb-3">
              <h5 className="font-semibold text-purple-700 dark:text-purple-400">
                Your Receipt Savings Potential
              </h5>
              <div className="flex items-center gap-2">
                <Label htmlFor="receipt-toggle" className="text-sm">
                  Use this strategy?
                </Label>
                <Switch
                  id="receipt-toggle"
                  checked={hsaInputs.saveReceiptsStrategy}
                  onCheckedChange={(checked) =>
                    setHsaInputs((prev) => ({ ...prev, saveReceiptsStrategy: checked }))
                  }
                />
              </div>
            </div>
            {hsaInputs.saveReceiptsStrategy && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Annual medical expenses (paid out of pocket):
                  </span>
                  <span className="font-medium">
                    {formatCurrency(hsaInputs.annualMedicalExpenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Years of saving receipts:</span>
                  <span className="font-medium">{hsaProjection.contributionYears} years</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold">
                  <span className="text-purple-700 dark:text-purple-400">
                    Total tax-free reimbursement potential:
                  </span>
                  <span className="text-purple-600">
                    {formatCurrency(hsaProjection.receiptValue)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* HDHP Eligibility Checker */}
      <Card className="border-2 border-amber-200 dark:border-amber-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-amber-600" />
            Are You Eligible for an HSA?
          </CardTitle>
          <CardDescription>
            Check if you qualify for the most powerful retirement account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Question 1: HDHP */}
          <div className="space-y-2">
            <Label className="text-base font-medium">
              Do you have a High Deductible Health Plan (HDHP)?
            </Label>
            <div className="flex gap-4">
              <button
                onClick={() =>
                  setEligibility((prev) => ({ ...prev, hasHDHP: true }))
                }
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg border transition-all",
                  eligibility.hasHDHP === true
                    ? "bg-emerald-100 border-emerald-500 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                    : "hover:bg-muted"
                )}
              >
                Yes
              </button>
              <button
                onClick={() =>
                  setEligibility((prev) => ({ ...prev, hasHDHP: false }))
                }
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg border transition-all",
                  eligibility.hasHDHP === false
                    ? "bg-red-100 border-red-500 text-red-700 dark:bg-red-900/50 dark:text-red-300"
                    : "hover:bg-muted"
                )}
              >
                No
              </button>
              <button
                onClick={() =>
                  setEligibility((prev) => ({ ...prev, hasHDHP: null }))
                }
                className={cn(
                  "flex-1 py-2 px-4 rounded-lg border transition-all",
                  eligibility.hasHDHP === null
                    ? "bg-gray-100 border-gray-500 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                    : "hover:bg-muted"
                )}
              >
                Not Sure
              </button>
            </div>
          </div>

          {eligibility.hasHDHP !== false && (
            <>
              {/* Question 2: Coverage Type */}
              <div className="space-y-2">
                <Label className="text-base font-medium">Coverage Type</Label>
                <div className="flex gap-4">
                  <button
                    onClick={() =>
                      setEligibility((prev) => ({ ...prev, coverageType: "self" }))
                    }
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all",
                      eligibility.coverageType === "self"
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "hover:bg-muted"
                    )}
                  >
                    Self-Only
                  </button>
                  <button
                    onClick={() =>
                      setEligibility((prev) => ({ ...prev, coverageType: "family" }))
                    }
                    className={cn(
                      "flex-1 py-2 px-4 rounded-lg border transition-all",
                      eligibility.coverageType === "family"
                        ? "bg-blue-100 border-blue-500 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "hover:bg-muted"
                    )}
                  >
                    Family
                  </button>
                </div>
              </div>

              {/* Question 3: Deductible */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">
                    Your Annual Deductible
                  </Label>
                  <InfoTooltip
                    content={`For 2024, HDHP minimum deductible is $${
                      eligibility.coverageType === "self"
                        ? HDHP_MINIMUMS_2024.selfDeductible.toLocaleString()
                        : HDHP_MINIMUMS_2024.familyDeductible.toLocaleString()
                    } for ${eligibility.coverageType === "self" ? "self-only" : "family"} coverage.`}
                  />
                </div>
                <NumericInput
                  value={eligibility.deductibleAmount}
                  onChange={(value) =>
                    setEligibility((prev) => ({ ...prev, deductibleAmount: value }))
                  }
                  min={0}
                  max={50000}
                  prefix="$"
                  aria-label="Annual deductible amount"
                />
                <p className="text-xs text-muted-foreground">
                  Minimum required:{" "}
                  {formatCurrency(
                    eligibility.coverageType === "self"
                      ? HDHP_MINIMUMS_2024.selfDeductible
                      : HDHP_MINIMUMS_2024.familyDeductible
                  )}
                </p>
              </div>

              {/* Question 4: Medicare */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">
                    Are you enrolled in Medicare?
                  </Label>
                  <InfoTooltip content="You cannot contribute to an HSA once enrolled in any part of Medicare (A, B, C, or D)." />
                </div>
                <Switch
                  checked={eligibility.hasMedicare}
                  onCheckedChange={(checked) =>
                    setEligibility((prev) => ({ ...prev, hasMedicare: checked }))
                  }
                />
              </div>

              {/* Question 5: Other Coverage */}
              <div className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Label className="text-base font-medium">
                    Other non-HDHP health coverage?
                  </Label>
                  <InfoTooltip content="Having other health coverage (like a spouse's non-HDHP plan) generally disqualifies you from HSA contributions." />
                </div>
                <Switch
                  checked={eligibility.hasOtherCoverage}
                  onCheckedChange={(checked) =>
                    setEligibility((prev) => ({ ...prev, hasOtherCoverage: checked }))
                  }
                />
              </div>
            </>
          )}

          {/* Eligibility Result */}
          <div
            className={cn(
              "rounded-lg p-4 mt-4",
              isEligible === true
                ? "bg-emerald-100 dark:bg-emerald-900/50"
                : isEligible === false
                ? "bg-red-100 dark:bg-red-900/50"
                : "bg-gray-100 dark:bg-gray-800"
            )}
          >
            {isEligible === true && (
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    You're Eligible for an HSA!
                  </p>
                  <p className="text-sm text-emerald-600 dark:text-emerald-400">
                    Your {new Date().getFullYear()} contribution limit:{" "}
                    <strong>{formatCurrency(contributionLimit)}</strong>
                    {currentAge >= 55 && " (includes $1,000 catch-up)"}
                  </p>
                </div>
              </div>
            )}
            {isEligible === false && (
              <div className="flex items-center gap-3">
                <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-700 dark:text-red-300">
                    Not Currently Eligible
                  </p>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {eligibility.hasMedicare
                      ? "Medicare enrollment disqualifies you from HSA contributions."
                      : eligibility.hasOtherCoverage
                      ? "Other health coverage disqualifies you."
                      : eligibility.hasHDHP === false
                      ? "You need an HDHP to qualify. Consider switching during open enrollment."
                      : "Your deductible doesn't meet HDHP minimums."}
                  </p>
                </div>
              </div>
            )}
            {isEligible === null && (
              <div className="flex items-center gap-3">
                <HelpCircle className="w-6 h-6 text-gray-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-gray-700 dark:text-gray-300">
                    Complete the questions above
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Answer all questions to see if you qualify for an HSA.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Contribution Limits */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            2024 HSA Contribution Limits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Self-Only Coverage</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(HSA_LIMITS_2024.self)}
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Family Coverage</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-400">
                {formatCurrency(HSA_LIMITS_2024.family)}
              </p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 text-center">
              <p className="text-sm text-muted-foreground mb-1">Catch-Up (55+)</p>
              <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                +{formatCurrency(HSA_LIMITS_2024.catchUp)}
              </p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Pro tip:</strong> These limits include employer contributions. If your employer
              contributes $500, you can only contribute{" "}
              {formatCurrency(HSA_LIMITS_2024.self - 500)} for self-only coverage.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Investment Options - Don't Leave it in Cash! */}
      <Card className="border-2 border-orange-200 dark:border-orange-800">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge className="bg-orange-600 hover:bg-orange-600">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Critical Mistake
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <PiggyBank className="h-5 w-5 text-orange-600" />
            Don't Leave Your HSA in Cash!
          </CardTitle>
          <CardDescription>
            The #1 mistake HSA holders make - and it costs them thousands
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border border-orange-200 dark:border-orange-700">
            <p className="text-orange-800 dark:text-orange-200">
              <strong>The Problem:</strong> 87% of HSA dollars sit uninvested in cash, earning
              near-zero interest. Over 30 years, you could be leaving{" "}
              <span className="font-bold">$100,000+ on the table</span>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <XCircle className="w-4 h-4 text-red-500" />
                Uninvested HSA
              </h4>
              <p className="text-2xl font-bold text-gray-600">
                {formatCurrency(HSA_LIMITS_2024.self * 30)}
              </p>
              <p className="text-sm text-muted-foreground">
                30 years of contributions at 0.5% APY
              </p>
            </div>
            <div className="border-2 border-emerald-500 rounded-lg p-4 bg-emerald-50/50 dark:bg-emerald-900/20">
              <h4 className="font-semibold flex items-center gap-2 mb-2 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                Invested HSA (7% avg)
              </h4>
              <p className="text-2xl font-bold text-emerald-600">
                {formatCurrency(
                  calculateFutureValue(0, HSA_LIMITS_2024.self, 7, 30)
                )}
              </p>
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                30 years of contributions invested in index funds
              </p>
            </div>
          </div>

          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="invest-tips">
              <AccordionTrigger>How to invest your HSA</AccordionTrigger>
              <AccordionContent className="space-y-2">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                    <span>
                      <strong>Check your HSA provider's investment options</strong> - Many now offer
                      low-cost index funds similar to your 401(k)
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                    <span>
                      <strong>Keep a cash buffer</strong> - Maintain 1-2 years of expected medical
                      expenses in cash, invest the rest
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                    <span>
                      <strong>Consider a transfer</strong> - If your HSA provider has poor investment
                      options, you can transfer to Fidelity, Lively, or other HSA custodians with better
                      options
                    </span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-600" />
                    <span>
                      <strong>Target-date funds work great</strong> - Set it and forget it with a fund
                      matched to your retirement year
                    </span>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Medicare Gotcha */}
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Important Warning
            </Badge>
          </div>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-600" />
            The Medicare Gotcha
          </CardTitle>
          <CardDescription>
            What happens to your HSA at age 65
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="w-4 h-4" />
                What You CAN'T Do
              </h4>
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                <li>- Contribute to HSA after Medicare enrollment</li>
                <li>- Enroll in Medicare Part A without affecting HSA</li>
                <li>- Retroactive Medicare enrollment (6 months back!)</li>
              </ul>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                What You CAN Do
              </h4>
              <ul className="space-y-1 text-sm text-emerald-700 dark:text-emerald-300">
                <li>+ Use existing HSA funds for qualified expenses</li>
                <li>+ Pay Medicare premiums tax-free from HSA</li>
                <li>+ Keep investing your HSA balance</li>
                <li>+ After 65, use for ANY expense (taxed like 401k)</li>
              </ul>
            </div>
          </div>

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-700">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-2">
              Planning Tip: Stop HSA Contributions 6 Months Before Medicare
            </h4>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Medicare Part A is retroactive up to 6 months. If you're still working at 65 and want
              to keep contributing to your HSA, you can delay Medicare. But once you enroll, stop
              contributions 6 months before your enrollment date to avoid tax penalties.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* HSA Balance Projection */}
      <Card className="border-2 border-indigo-200 dark:border-indigo-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-indigo-600" />
            Your HSA Growth Projection
          </CardTitle>
          <CardDescription>
            See how your HSA could grow alongside your other retirement accounts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <div>
                <Label htmlFor="current-hsa">Current HSA Balance</Label>
                <NumericInput
                  id="current-hsa"
                  value={hsaInputs.currentBalance}
                  onChange={(value) =>
                    setHsaInputs((prev) => ({ ...prev, currentBalance: value }))
                  }
                  min={0}
                  prefix="$"
                  aria-label="Current HSA balance"
                />
              </div>
              <div>
                <Label htmlFor="annual-contrib">Annual Contribution</Label>
                <NumericInput
                  id="annual-contrib"
                  value={hsaInputs.annualContribution}
                  onChange={(value) =>
                    setHsaInputs((prev) => ({ ...prev, annualContribution: value }))
                  }
                  min={0}
                  max={contributionLimit}
                  prefix="$"
                  aria-label="Annual HSA contribution"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {formatCurrency(contributionLimit)}
                </p>
              </div>
              <div>
                <Label htmlFor="expected-return">Expected Return (%)</Label>
                <NumericInput
                  id="expected-return"
                  value={hsaInputs.expectedReturn}
                  onChange={(value) =>
                    setHsaInputs((prev) => ({ ...prev, expectedReturn: value }))
                  }
                  min={0}
                  max={15}
                  suffix="%"
                  decimalPlaces={1}
                  aria-label="Expected annual return"
                />
              </div>
            </div>

            <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
              <h4 className="font-semibold text-indigo-700 dark:text-indigo-400 mb-4">
                At Retirement (Age {retirementAge})
              </h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Contributions:</span>
                  <span className="font-medium">
                    {formatCurrency(
                      hsaInputs.currentBalance + hsaProjection.totalContributions
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Investment Growth:</span>
                  <span className="font-medium text-emerald-600">
                    +{formatCurrency(hsaProjection.totalGrowth)}
                  </span>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-semibold">Projected HSA Balance:</span>
                    <span className="font-bold text-indigo-600">
                      {formatCurrency(hsaProjection.finalBalance)}
                    </span>
                  </div>
                </div>
                {hsaInputs.saveReceiptsStrategy && hsaProjection.receiptValue > 0 && (
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-purple-600 dark:text-purple-400">
                        + Receipt reimbursement potential:
                      </span>
                      <span className="font-medium text-purple-600 dark:text-purple-400">
                        {formatCurrency(hsaProjection.receiptValue)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Visual Growth Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Contribution Years: {hsaProjection.contributionYears}</span>
              <span>Until Medicare at 65</span>
            </div>
            <Progress
              value={
                (hsaProjection.contributionYears /
                  Math.max(1, retirementAge - currentAge)) *
                100
              }
              className="h-3"
            />
          </div>

          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This projection assumes you can contribute until age 65
              (Medicare enrollment). If you plan to work past 65 and delay Medicare, you may be able
              to contribute longer. After 65, your HSA continues to grow tax-free even without new
              contributions.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="faq-1">
              <AccordionTrigger>
                What counts as a qualified medical expense?
              </AccordionTrigger>
              <AccordionContent>
                <p className="mb-2">Qualified expenses include:</p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Doctor visits, prescriptions, and hospital stays</li>
                  <li>Dental work, vision care, and contacts/glasses</li>
                  <li>Mental health services and therapy</li>
                  <li>Medical equipment (CPAP, wheelchairs, etc.)</li>
                  <li>Long-term care insurance premiums (with limits)</li>
                  <li>Medicare premiums (Parts B, C, and D - not Medigap)</li>
                  <li>COBRA premiums</li>
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  See IRS Publication 502 for the complete list.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2">
              <AccordionTrigger>
                What happens to my HSA if I change jobs?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  Your HSA is yours forever - it's not tied to your employer. You can keep the same
                  HSA when you change jobs, or transfer/rollover to a new HSA custodian with better
                  investment options. There are no "use it or lose it" rules like FSAs.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3">
              <AccordionTrigger>
                Can I use HSA funds for my spouse or dependents?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  Yes! You can use your HSA to pay for qualified medical expenses for your spouse
                  and tax dependents, even if they're not covered by your HDHP. This is true even
                  for self-only HSA coverage.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4">
              <AccordionTrigger>
                What if I use HSA money for non-medical expenses?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  Before age 65: You'll pay income tax plus a 20% penalty on non-qualified
                  withdrawals. After age 65: The 20% penalty disappears, and you only pay regular
                  income tax - making your HSA work just like a traditional IRA for non-medical
                  expenses.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5">
              <AccordionTrigger>
                Should I max out my HSA before my 401(k)?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground">
                  A common strategy is: (1) Contribute enough to 401(k) to get full employer match,
                  (2) Max out HSA, (3) Then max out 401(k)/IRA. The HSA's triple tax advantage often
                  makes it more valuable than additional 401(k) contributions, especially if you
                  expect healthcare costs in retirement.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6">
              <AccordionTrigger>
                How do I save receipts for the "Stealth IRA" strategy?
              </AccordionTrigger>
              <AccordionContent>
                <p className="text-muted-foreground mb-2">
                  Create a dedicated folder (digital or physical) for HSA receipts. For each medical
                  expense:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Save the receipt/EOB showing the service and amount paid</li>
                  <li>Note the date the expense occurred</li>
                  <li>Keep proof of payment (credit card statement, check copy)</li>
                  <li>
                    Consider apps like "HSA Store" or a simple spreadsheet to track totals
                  </li>
                </ul>
                <p className="mt-2 text-sm text-muted-foreground">
                  The IRS has no deadline for reimbursement - just keep good records!
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-200">
              The Bottom Line
            </h3>
            <p className="text-emerald-700 dark:text-emerald-300 max-w-2xl mx-auto">
              The HSA is the most powerful retirement account available to Americans - yet most
              people either don't know about it, don't contribute enough, or leave the money
              uninvested. If you're eligible, maximize this account first.
            </p>
            <div className="flex flex-wrap justify-center gap-2 pt-2">
              <Badge className="bg-emerald-600 text-white">Triple Tax Advantage</Badge>
              <Badge className="bg-emerald-600 text-white">No RMDs</Badge>
              <Badge className="bg-emerald-600 text-white">Portable Forever</Badge>
              <Badge className="bg-emerald-600 text-white">Invest for Growth</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        This information is for educational purposes only and should not be considered tax or
        investment advice. Consult with a qualified tax professional or financial advisor for
        guidance specific to your situation. Contribution limits and eligibility rules are subject
        to change annually.
      </div>
    </div>
  );
}

/**
 * Calculate future value of regular contributions with compound growth
 */
function calculateFutureValue(
  presentValue: number,
  annualContribution: number,
  annualReturnPercent: number,
  years: number
): number {
  const r = annualReturnPercent / 100;
  let balance = presentValue;

  for (let y = 0; y < years; y++) {
    balance = balance * (1 + r) + annualContribution;
  }

  return balance;
}
