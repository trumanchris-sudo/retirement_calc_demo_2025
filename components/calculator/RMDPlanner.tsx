"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Calendar,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Heart,
  Users,
  Clock,
  CheckCircle2,
  ArrowRight,
  Info,
  Lightbulb,
  Shield,
} from "lucide-react";
import { calcRMD } from "@/lib/calculations/shared/rmd";
import { RMD_START_AGE, RMD_DIVISORS, TAX_BRACKETS } from "@/lib/calculations/shared/constants";
import type { FilingStatus } from "@/types/planner";

interface RMDPlannerProps {
  currentAge: number;
  pretaxBalance: number;
  retirementAge: number;
  expectedReturn?: number;
  filingStatus?: FilingStatus;
  otherIncome?: number;
  spouseAge?: number;
}

// Joint Life Expectancy Table (for spouse 10+ years younger)
const JOINT_LIFE_DIVISORS: Record<number, Record<number, number>> = {
  // Owner age -> Spouse age diff (10+) -> divisor
  // Simplified: shows divisors when spouse is 10+ years younger
  73: { 10: 28.4, 15: 30.5, 20: 32.3 },
  74: { 10: 27.5, 15: 29.5, 20: 31.3 },
  75: { 10: 26.6, 15: 28.5, 20: 30.3 },
  76: { 10: 25.7, 15: 27.6, 20: 29.3 },
  77: { 10: 24.8, 15: 26.7, 20: 28.3 },
  78: { 10: 23.9, 15: 25.8, 20: 27.4 },
  79: { 10: 23.1, 15: 24.9, 20: 26.5 },
  80: { 10: 22.2, 15: 24.0, 20: 25.6 },
  85: { 10: 18.6, 15: 20.1, 20: 21.5 },
  90: { 10: 15.3, 15: 16.5, 20: 17.7 },
};

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}k`;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatCurrencyFull(value: number): string {
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getTaxBracket(income: number, filingStatus: FilingStatus): { rate: number; bracket: string } {
  const brackets = TAX_BRACKETS[filingStatus].rates;
  const deduction = TAX_BRACKETS[filingStatus].deduction;
  const taxableIncome = Math.max(0, income - deduction);

  for (const bracket of brackets) {
    if (taxableIncome <= bracket.limit) {
      return { rate: bracket.rate, bracket: `${(bracket.rate * 100).toFixed(0)}%` };
    }
  }
  return { rate: 0.37, bracket: "37%" };
}

function calculateProjectedBalance(
  currentBalance: number,
  currentAge: number,
  targetAge: number,
  annualReturn: number
): number {
  const years = targetAge - currentAge;
  if (years <= 0) return currentBalance;
  return currentBalance * Math.pow(1 + annualReturn, years);
}

export const RMDPlanner = React.memo(function RMDPlanner({
  currentAge,
  pretaxBalance,
  retirementAge,
  expectedReturn = 0.06,
  filingStatus = "married",
  otherIncome = 40000,
  spouseAge,
}: RMDPlannerProps) {
  const [activeTab, setActiveTab] = useState("calculator");

  // Calculate the year when RMDs start
  const rmdStartYear = new Date().getFullYear() + (RMD_START_AGE - currentAge);
  const yearsUntilRMD = Math.max(0, RMD_START_AGE - currentAge);

  // Check if spouse is 10+ years younger
  const spouseAgeDiff = spouseAge ? currentAge - spouseAge : 0;
  const useJointTable = spouseAgeDiff >= 10;

  // Project RMDs from current age to 100
  const rmdProjections = useMemo(() => {
    const projections: {
      age: number;
      balance: number;
      rmd: number;
      divisor: number;
      taxBracket: string;
      taxOnRmd: number;
      cumulativeRmd: number;
      cumulativeTax: number;
    }[] = [];

    let runningBalance = pretaxBalance;
    let cumulativeRmd = 0;
    let cumulativeTax = 0;

    for (let age = currentAge; age <= 100; age++) {
      // Project growth
      if (age > currentAge) {
        runningBalance = runningBalance * (1 + expectedReturn);
      }

      let rmd = 0;
      let divisor = 0;
      let taxOnRmd = 0;

      if (age >= RMD_START_AGE && runningBalance > 0) {
        // Get appropriate divisor
        if (useJointTable && JOINT_LIFE_DIVISORS[age]) {
          const ageDiffKey = spouseAgeDiff >= 20 ? 20 : spouseAgeDiff >= 15 ? 15 : 10;
          divisor = JOINT_LIFE_DIVISORS[age][ageDiffKey] || RMD_DIVISORS[age] || 2.0;
        } else {
          divisor = RMD_DIVISORS[age] || 2.0;
        }

        rmd = runningBalance / divisor;
        runningBalance -= rmd;
        cumulativeRmd += rmd;

        // Calculate tax on RMD
        const totalIncome = otherIncome + rmd;
        const { rate } = getTaxBracket(totalIncome, filingStatus);
        taxOnRmd = rmd * rate;
        cumulativeTax += taxOnRmd;
      }

      const { bracket } = getTaxBracket(otherIncome + rmd, filingStatus);

      projections.push({
        age,
        balance: Math.max(0, runningBalance),
        rmd,
        divisor,
        taxBracket: bracket,
        taxOnRmd,
        cumulativeRmd,
        cumulativeTax,
      });
    }

    return projections;
  }, [currentAge, pretaxBalance, expectedReturn, otherIncome, filingStatus, useJointTable, spouseAgeDiff]);

  // Get key metrics
  const firstRMD = rmdProjections.find((p) => p.rmd > 0);
  const peakRMD = rmdProjections.reduce((max, p) => (p.rmd > max.rmd ? p : max), { rmd: 0, age: 0, taxBracket: "0%" });
  const totalRMDs = rmdProjections[rmdProjections.length - 1]?.cumulativeRmd || 0;
  const totalTaxOnRMDs = rmdProjections[rmdProjections.length - 1]?.cumulativeTax || 0;

  // Calculate bracket bump
  const currentBracket = getTaxBracket(otherIncome, filingStatus);
  const bracketWithFirstRMD = firstRMD ? getTaxBracket(otherIncome + firstRMD.rmd, filingStatus) : currentBracket;
  const bracketBump = bracketWithFirstRMD.rate > currentBracket.rate;

  // Get the RMD projections for display (age 73-100)
  const rmdDisplayData = rmdProjections.filter((p) => p.age >= RMD_START_AGE);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-orange-600" />
          RMD Planner
        </CardTitle>
        <CardDescription>
          Required Minimum Distributions - The IRS forces withdrawals starting at age 73
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-6">
            <TabsTrigger value="calculator">Calculator</TabsTrigger>
            <TabsTrigger value="problem">The Problem</TabsTrigger>
            <TabsTrigger value="strategies">Strategies</TabsTrigger>
            <TabsTrigger value="deadlines">Deadlines</TabsTrigger>
            <TabsTrigger value="inherited">Inherited IRAs</TabsTrigger>
            <TabsTrigger value="spouse">Spouse Rules</TabsTrigger>
          </TabsList>

          {/* Tab 1: RMD Calculator */}
          <TabsContent value="calculator" className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Years Until RMDs</div>
                <div className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {yearsUntilRMD > 0 ? yearsUntilRMD : "Now"}
                </div>
                <div className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                  {yearsUntilRMD > 0 ? `Starting age ${RMD_START_AGE}` : "RMDs required"}
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">First RMD (Est.)</div>
                <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                  {firstRMD ? formatCurrency(firstRMD.rmd) : "N/A"}
                </div>
                <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  At age {RMD_START_AGE} in {rmdStartYear}
                </div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">Peak RMD</div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                  {formatCurrency(peakRMD.rmd)}
                </div>
                <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">At age {peakRMD.age}</div>
              </div>

              <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                <div className="text-sm text-red-700 dark:text-red-400 mb-1">Lifetime RMD Tax</div>
                <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(totalTaxOnRMDs)}
                </div>
                <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                  On {formatCurrency(totalRMDs)} total RMDs
                </div>
              </div>
            </div>

            {/* RMD Schedule Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Projected RMD Schedule</h3>
                <Badge variant="outline" className="text-xs">
                  {expectedReturn * 100}% annual growth assumed
                </Badge>
              </div>

              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border overflow-hidden">
                <div className="max-h-80 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800">
                      <tr>
                        <th className="text-left p-3 font-medium">Age</th>
                        <th className="text-right p-3 font-medium">Balance</th>
                        <th className="text-right p-3 font-medium">Divisor</th>
                        <th className="text-right p-3 font-medium">RMD</th>
                        <th className="text-right p-3 font-medium">Tax Bracket</th>
                        <th className="text-right p-3 font-medium">Est. Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rmdDisplayData.map((row, idx) => (
                        <tr
                          key={row.age}
                          className={`border-t border-gray-200 dark:border-gray-700 ${
                            idx === 0 ? "bg-orange-50 dark:bg-orange-950/30" : ""
                          }`}
                        >
                          <td className="p-3 font-medium">
                            {row.age}
                            {idx === 0 && (
                              <Badge variant="outline" className="ml-2 text-xs bg-orange-100 text-orange-800">
                                First
                              </Badge>
                            )}
                          </td>
                          <td className="text-right p-3">{formatCurrencyFull(row.balance)}</td>
                          <td className="text-right p-3 text-muted-foreground">{row.divisor.toFixed(1)}</td>
                          <td className="text-right p-3 font-semibold text-orange-600">{formatCurrencyFull(row.rmd)}</td>
                          <td className="text-right p-3">
                            <Badge
                              variant={
                                parseFloat(row.taxBracket) >= 32 ? "destructive" : parseFloat(row.taxBracket) >= 24 ? "default" : "secondary"
                              }
                            >
                              {row.taxBracket}
                            </Badge>
                          </td>
                          <td className="text-right p-3 text-red-600">{formatCurrencyFull(row.taxOnRmd)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                * Projections assume {(expectedReturn * 100).toFixed(0)}% annual returns and{" "}
                {formatCurrencyFull(otherIncome)} other income. Actual RMDs depend on Dec 31 balance.
              </p>
            </div>
          </TabsContent>

          {/* Tab 2: The RMD Problem Visualized */}
          <TabsContent value="problem" className="space-y-6">
            {/* The Forced Withdrawal Alert */}
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-lg p-6">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0 mt-1" />
                <div className="space-y-3">
                  <h3 className="text-xl font-bold text-red-900 dark:text-red-100">The Forced Withdrawal Problem</h3>
                  <p className="text-red-800 dark:text-red-200 text-lg">
                    At age 73, you <strong>MUST</strong> withdraw{" "}
                    <span className="font-bold text-red-600">{firstRMD ? formatCurrencyFull(firstRMD.rmd) : "$X"}</span>{" "}
                    whether you need it or not.
                  </p>
                  {bracketBump && firstRMD && (
                    <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-4 mt-3">
                      <p className="font-semibold text-red-900 dark:text-red-100">
                        This pushes you from {currentBracket.bracket} to {bracketWithFirstRMD.bracket} bracket!
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Extra tax cost:{" "}
                        {formatCurrencyFull(firstRMD.rmd * (bracketWithFirstRMD.rate - currentBracket.rate))} just from
                        the bracket bump
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tax Spike Visualization */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                The Tax Spike at 73
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Before RMDs */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">Before RMDs (Age 72)</div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Other Income:</span>
                        <span className="font-medium">{formatCurrencyFull(otherIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forced Withdrawal:</span>
                        <span className="font-medium text-green-600">$0</span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Tax Bracket:</span>
                        <Badge className="bg-green-100 text-green-800">{currentBracket.bracket}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-muted-foreground">You control your withdrawals</div>
                </div>

                {/* After RMDs */}
                <div className="space-y-3">
                  <div className="text-sm font-medium text-muted-foreground">After RMDs (Age 73+)</div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Other Income:</span>
                        <span className="font-medium">{formatCurrencyFull(otherIncome)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Forced RMD:</span>
                        <span className="font-medium text-red-600">
                          +{firstRMD ? formatCurrencyFull(firstRMD.rmd) : "$0"}
                        </span>
                      </div>
                      <div className="border-t pt-2 flex justify-between font-semibold">
                        <span>Tax Bracket:</span>
                        <Badge variant="destructive">{bracketWithFirstRMD.bracket}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="text-center text-sm text-red-600 font-medium">IRS controls your withdrawals</div>
                </div>
              </div>

              {/* Arrow between */}
              <div className="flex justify-center">
                <div className="flex items-center gap-2 text-red-600">
                  <ArrowRight className="h-6 w-6" />
                  <span className="font-semibold">
                    {bracketBump
                      ? `Bracket jump = ${((bracketWithFirstRMD.rate - currentBracket.rate) * 100).toFixed(0)}% more tax on EVERY dollar!`
                      : "Same bracket, but higher marginal taxes"}
                  </span>
                </div>
              </div>
            </div>

            {/* Why This Matters */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Why Large RMDs Hurt</h4>
                  <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                    <li>Higher tax brackets mean less after-tax spending power</li>
                    <li>Social Security becomes up to 85% taxable</li>
                    <li>Medicare premiums spike (IRMAA surcharges)</li>
                    <li>May trigger Net Investment Income Tax (3.8%)</li>
                    <li>State taxes add another layer</li>
                    <li>Heirs inherit the tax problem if you don't spend it</li>
                  </ul>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: RMD Reduction Strategies */}
          <TabsContent value="strategies" className="space-y-6">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-100 mb-1">The Good News</h4>
                  <p className="text-sm text-green-800 dark:text-green-200">
                    RMDs are manageable with planning. The key is acting <strong>before</strong> age 73.
                  </p>
                </div>
              </div>
            </div>

            <Accordion type="multiple" className="w-full space-y-2">
              {/* Strategy 1: Roth Conversions */}
              <AccordionItem value="roth" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Roth Conversions Before 73</div>
                      <div className="text-sm text-muted-foreground">Fill lower brackets now</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 pl-11">
                    <p className="text-sm">
                      Convert Traditional IRA money to Roth each year, paying taxes at today's lower rates to avoid
                      forced higher-bracket RMDs later.
                    </p>
                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                      <h5 className="font-medium mb-2">The Strategy:</h5>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>"Fill the bracket" - Convert up to the top of your current bracket each year</li>
                        <li>Pay taxes now at 12-22% instead of 24-32% later</li>
                        <li>Reduces future RMDs (Roth has NO RMDs during your lifetime)</li>
                        <li>Tax-free growth forever in Roth</li>
                      </ul>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                      <CheckCircle2 className="h-4 w-4" />
                      See the Roth Conversion Optimizer for your personalized recommendation
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Strategy 2: QCDs */}
              <AccordionItem value="qcd" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-pink-100 dark:bg-pink-900/50 flex items-center justify-center">
                      <Heart className="h-4 w-4 text-pink-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Qualified Charitable Distributions (QCDs)</div>
                      <div className="text-sm text-muted-foreground">Satisfy RMD + donate tax-free</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 pl-11">
                    <p className="text-sm">
                      If you're 70 1/2 or older, donate directly from your IRA to charity. The donation counts toward
                      your RMD but isn't included in taxable income!
                    </p>
                    <div className="bg-pink-50 dark:bg-pink-950/20 rounded-lg p-4">
                      <h5 className="font-medium mb-2">QCD Benefits:</h5>
                      <ul className="text-sm space-y-1 list-disc list-inside">
                        <li>Up to $105,000 per year (2024, indexed for inflation)</li>
                        <li>Satisfies RMD requirement without increasing AGI</li>
                        <li>Better than donating + standard deduction in most cases</li>
                        <li>Keeps income lower for IRMAA, SS taxation, ACA subsidies</li>
                        <li>Perfect for those who already donate to charity</li>
                      </ul>
                    </div>
                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded p-3 text-sm">
                      <strong>Example:</strong> $10k RMD + $10k charitable giving = $10k QCD. Same charity amount, but
                      $10k less taxable income!
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Strategy 3: Fill Lower Brackets */}
              <AccordionItem value="brackets" className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <TrendingDown className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold">Fill Lower Brackets Now</div>
                      <div className="text-sm text-muted-foreground">Avoid forced higher brackets later</div>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4 pl-11">
                    <p className="text-sm">
                      If you have low-income years before RMDs start (early retirement, gap year), take voluntary
                      distributions to "use up" lower brackets.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                      <h5 className="font-medium mb-2">The Math:</h5>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">Withdraw now at:</div>
                          <div className="font-semibold text-green-600">10-12% bracket</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">vs. RMD later at:</div>
                          <div className="font-semibold text-red-600">24-32% bracket</div>
                        </div>
                      </div>
                      <div className="mt-3 text-sm">
                        <strong>Savings:</strong> 12-20 cents per dollar - that's real money!
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      This is especially valuable in the "gap years" between retirement and RMDs/Social Security.
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </TabsContent>

          {/* Tab 4: Calendar & Deadlines */}
          <TabsContent value="deadlines" className="space-y-6">
            {/* Key Deadlines */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Critical RMD Deadlines
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First RMD */}
                <div className="bg-orange-50 dark:bg-orange-950/20 border-2 border-orange-200 dark:border-orange-900 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-orange-100 text-orange-800">
                      First RMD
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-orange-900 dark:text-orange-100 mb-2">
                    April 1 of year after turning 73
                  </div>
                  <p className="text-sm text-orange-700 dark:text-orange-300">
                    You can delay your first RMD until April 1, but then you'll have <strong>two RMDs</strong> in the
                    same tax year! (First year + current year)
                  </p>
                </div>

                {/* Subsequent RMDs */}
                <div className="bg-blue-50 dark:bg-blue-950/20 border-2 border-blue-200 dark:border-blue-900 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="bg-blue-100 text-blue-800">
                      All Other RMDs
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-2">December 31 each year</div>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Every subsequent year, your RMD must be taken by December 31. No extensions, no exceptions.
                  </p>
                </div>
              </div>
            </div>

            {/* Penalty Warning */}
            <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-200 dark:border-red-900 rounded-lg p-5">
              <div className="flex items-start gap-4">
                <AlertTriangle className="h-8 w-8 text-red-600 flex-shrink-0" />
                <div>
                  <h4 className="text-xl font-bold text-red-900 dark:text-red-100 mb-2">Missed RMD Penalty</h4>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <Badge variant="destructive" className="text-lg px-3 py-1">
                        25%
                      </Badge>
                      <span className="text-red-800 dark:text-red-200">of the amount you should have withdrawn</span>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      <strong>Good news:</strong> This was reduced from 50% by SECURE Act 2.0! And if you correct within
                      2 years, it drops to 10%.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Example Timeline */}
            <div className="space-y-3">
              <h4 className="font-semibold">Your Timeline Example:</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                {currentAge < 73 && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                        <span className="text-lg font-bold text-green-700">{currentAge}</span>
                      </div>
                      <div>
                        <div className="font-medium">Today</div>
                        <div className="text-sm text-muted-foreground">No RMDs required - time to plan!</div>
                      </div>
                    </div>
                    <div className="border-l-2 border-dashed border-gray-300 ml-8 h-8" />
                  </>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                    <span className="text-lg font-bold text-orange-700">73</span>
                  </div>
                  <div>
                    <div className="font-medium">Turn 73 in {rmdStartYear}</div>
                    <div className="text-sm text-muted-foreground">
                      First RMD due by April 1, {rmdStartYear + 1}
                    </div>
                  </div>
                </div>
                <div className="border-l-2 border-dashed border-gray-300 ml-8 h-8" />
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-700">74+</span>
                  </div>
                  <div>
                    <div className="font-medium">Every Year After</div>
                    <div className="text-sm text-muted-foreground">RMD due by December 31 annually</div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Tab 5: Inherited IRA RMDs */}
          <TabsContent value="inherited" className="space-y-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-1">New Rules Since 2020</h4>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    The SECURE Act significantly changed inherited IRA rules. Most non-spouse beneficiaries must empty
                    the account within 10 years.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Spouse Beneficiary */}
              <div className="border rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold">Spouse Beneficiary</h4>
                  <Badge className="bg-green-100 text-green-800 ml-auto">Best Options</Badge>
                </div>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>Can treat as their own IRA (rollover)</li>
                  <li>Can remain as beneficiary</li>
                  <li>RMDs based on their own age</li>
                  <li>No 10-year rule applies</li>
                </ul>
              </div>

              {/* Non-Spouse Beneficiary */}
              <div className="border-2 border-orange-200 dark:border-orange-800 rounded-lg p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-600" />
                  <h4 className="font-semibold">Non-Spouse Beneficiary</h4>
                  <Badge variant="outline" className="bg-orange-100 text-orange-800 ml-auto">
                    10-Year Rule
                  </Badge>
                </div>
                <ul className="text-sm space-y-2 list-disc list-inside">
                  <li>
                    <strong>Must empty account within 10 years</strong>
                  </li>
                  <li>Annual RMDs required each year (new IRS guidance!)</li>
                  <li>Full balance due by Dec 31 of year 10</li>
                  <li>Can be a significant tax burden for heirs</li>
                </ul>
              </div>
            </div>

            {/* Annual RMDs within 10-year */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                    Important: Annual RMDs Within 10 Years
                  </h4>
                  <p className="text-sm text-amber-800 dark:text-amber-200 mb-3">
                    The IRS finalized guidance in 2024: if the original owner had started RMDs before death, the
                    beneficiary must take annual RMDs in years 1-9, plus empty the account by year 10.
                  </p>
                  <div className="bg-white dark:bg-gray-900 rounded p-3 text-sm">
                    <strong>Example:</strong> Parent dies at 75 (was taking RMDs). Adult child inherits $500k IRA. Child
                    must take annual RMDs years 1-9 based on their life expectancy, then withdraw remaining balance by
                    year 10.
                  </div>
                </div>
              </div>
            </div>

            {/* Eligible Designated Beneficiaries */}
            <div className="space-y-3">
              <h4 className="font-semibold">Eligible Designated Beneficiaries (No 10-Year Rule)</h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  { label: "Surviving Spouse", icon: Heart },
                  { label: "Minor Child*", icon: Users },
                  { label: "Disabled", icon: Shield },
                  { label: "Chronically Ill", icon: Shield },
                  { label: "Within 10 yrs age", icon: Users },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-3 text-center"
                  >
                    <item.icon className="h-5 w-5 text-green-600 mx-auto mb-1" />
                    <div className="text-xs font-medium">{item.label}</div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                * Minor children must start 10-year countdown when they reach age of majority (18-26 depending on
                state)
              </p>
            </div>
          </TabsContent>

          {/* Tab 6: Spouse Age Difference */}
          <TabsContent value="spouse" className="space-y-6">
            <div className="bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-purple-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                    Joint Life Expectancy Table
                  </h4>
                  <p className="text-sm text-purple-800 dark:text-purple-200">
                    If your spouse is the sole beneficiary AND is 10+ years younger, you can use the Joint Life
                    Expectancy Table for smaller RMDs.
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status */}
            <div className="border rounded-lg p-5">
              <h4 className="font-semibold mb-4">Your Situation</h4>
              {spouseAge ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Your Age</div>
                      <div className="text-2xl font-bold">{currentAge}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Spouse Age</div>
                      <div className="text-2xl font-bold">{spouseAge}</div>
                    </div>
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <div className="text-sm text-muted-foreground">Difference</div>
                      <div className="text-2xl font-bold">{spouseAgeDiff} years</div>
                    </div>
                  </div>

                  {useJointTable ? (
                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-semibold">You qualify for the Joint Life Table!</span>
                      </div>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                        Your RMDs will be smaller because the IRS uses a longer joint life expectancy.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Spouse age difference is less than 10 years. Standard Uniform Lifetime Table applies.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Spouse age not provided. Enter spouse age to see if you qualify for smaller RMDs.</p>
                </div>
              )}
            </div>

            {/* Comparison Table */}
            <div className="space-y-3">
              <h4 className="font-semibold">Divisor Comparison (Smaller Divisor = Larger RMD)</h4>
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg border overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-800">
                    <tr>
                      <th className="text-left p-3">Owner Age</th>
                      <th className="text-right p-3">Uniform Table</th>
                      <th className="text-right p-3">Joint (10yr younger)</th>
                      <th className="text-right p-3">Joint (20yr younger)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[73, 75, 80, 85, 90].map((age) => (
                      <tr key={age} className="border-t">
                        <td className="p-3 font-medium">{age}</td>
                        <td className="text-right p-3">{RMD_DIVISORS[age]?.toFixed(1)}</td>
                        <td className="text-right p-3 text-green-600">
                          {JOINT_LIFE_DIVISORS[age]?.[10]?.toFixed(1) || "-"}
                        </td>
                        <td className="text-right p-3 text-green-600 font-semibold">
                          {JOINT_LIFE_DIVISORS[age]?.[20]?.toFixed(1) || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">
                Higher divisor = smaller RMD. With a spouse 20 years younger at age 73, your divisor is 32.3 vs 26.5 -
                that's 18% smaller RMDs!
              </p>
            </div>

            {/* Requirements */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">Requirements for Joint Table</h4>
              <ul className="text-sm text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                <li>Spouse must be the SOLE beneficiary of the IRA</li>
                <li>Spouse must be 10+ years younger than you</li>
                <li>Must recalculate each year based on both ages</li>
                <li>Does not apply if trust is beneficiary (even for spouse)</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

RMDPlanner.displayName = "RMDPlanner";

export default RMDPlanner;
