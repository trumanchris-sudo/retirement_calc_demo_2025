"use client";

import React, { useState } from "react";
import { ArrowLeft, Calculator, TrendingUp, Info, DollarSign, Building2, Heart, Home } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/calculator/InputHelpers";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TopBanner } from "@/components/layout/TopBanner";
import { useBudget } from "@/lib/budget-context";
import {
  FilingStatus,
  PayFrequency,
  getMax401kContribution,
  getMaxHSAContribution,
  SE_TAX_2026,
  RETIREMENT_LIMITS_2026,
} from "@/lib/constants/tax2026";
import {
  calculateSelfEmployedBudget,
  CalculationInputs,
  PerPeriodCashFlow,
  YearSummary,
} from "@/lib/calculations/selfEmployed2026";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function SelfEmployed2026Page() {
  useBudget();

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Income Section
  const [grossCompensation, setGrossCompensation] = useState(750000);
  const [guaranteedPayments, setGuaranteedPayments] = useState(550000);
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("semimonthly");

  // Filing Status & Spouse
  const [filingStatus, setFilingStatus] = useState<FilingStatus>("mfj");
  const [spouseW2Income, setSpouseW2Income] = useState(145000);
  const [spouseWithholding, setSpouseWithholding] = useState(1577);
  const [spousePayFrequency, setSpousePayFrequency] = useState<PayFrequency>("biweekly");

  // Retirement & Benefits
  const [age, setAge] = useState(42);
  const [traditional401k, setTraditional401k] = useState(24000);
  const [roth401k, setRoth401k] = useState(0);
  const [definedBenefitPlan, setDefinedBenefitPlan] = useState(26500);
  const [sepIRA, setSepIRA] = useState(0);
  const [solo401kEmployer, setSolo401kEmployer] = useState(0);

  // Health Benefits
  const [healthInsuranceCoverage, setHealthInsuranceCoverage] = useState<'self' | 'self_spouse' | 'family' | 'none'>('self');
  const [healthInsurancePremium, setHealthInsurancePremium] = useState(677 * 12); // Annual
  const [dentalVisionPremium, setDentalVisionPremium] = useState(80 * 12); // Annual
  const [hsaContribution, setHsaContribution] = useState(4400);
  const [dependentCareFSA, setDependentCareFSA] = useState(5000);
  const [healthFSA, setHealthFSA] = useState(0);

  // State Taxes
  const [stateRate, setStateRate] = useState(4.5);
  const [withholdingMethod, setWithholdingMethod] = useState<'partnership_withholds' | 'quarterly_estimates'>('partnership_withholds');

  // Fixed Expenses
  const [mortgage, setMortgage] = useState(2930);
  const [householdExpenses, setHouseholdExpenses] = useState(1500);
  const [discretionaryBudget, setDiscretionaryBudget] = useState(2500);

  // Results
  const [results, setResults] = useState<{
    periods: PerPeriodCashFlow[];
    yearSummary: YearSummary;
    seTaxResult: any;
    federalTaxResult: any;
  } | null>(null);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const distributiveShare = grossCompensation - guaranteedPayments;
  const max401k = getMax401kContribution(age);
  const maxHSA = getMaxHSAContribution(healthInsuranceCoverage === 'self' ? 'self' : 'family', age);
  const isMarried = filingStatus === 'mfj';

  // ============================================================================
  // CALCULATION HANDLER
  // ============================================================================

  const handleCalculate = () => {
    const inputs: CalculationInputs = {
      partnerIncome: {
        grossCompensation,
        guaranteedPayments,
        distributiveShare,
        payFrequency,
      },
      filingStatus,
      spouseW2Income: isMarried ? spouseW2Income : 0,
      spouseWithholding: isMarried ? spouseWithholding : 0,
      spousePayFrequency,
      retirementContributions: {
        traditional401k,
        roth401k,
        definedBenefitPlan,
        sepIRA,
        solo401kEmployer,
        age,
      },
      healthBenefits: {
        healthInsurancePremium,
        healthInsuranceCoverage,
        dentalVisionPremium,
        hsaContribution,
        dependentCareFSA,
        healthFSA,
      },
      statePartnershipTax: {
        estimatedStateRate: stateRate / 100,
        withholdingMethod,
      },
      fixedExpenses: {
        mortgage,
        householdExpenses,
        discretionaryBudget,
      },
    };

    const calculationResults = calculateSelfEmployedBudget(inputs);
    setResults(calculationResults);

    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // ============================================================================
  // HELPER COMPONENTS
  // ============================================================================

  const InfoTooltip = ({ content }: { content: string }) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="w-4 h-4 text-muted-foreground cursor-help inline-block ml-1" />
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  const SectionCard = ({ icon: Icon, title, description, children }: any) => (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon className="w-5 h-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="font-semibold text-xl">Self-Employed / K-1 Partner Budget Calculator (2026)</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              2026 Self-Employment Tax & Cash Flow Planner
            </CardTitle>
            <CardDescription>
              Model your K-1 partnership income, self-employment taxes, retirement contributions, and cash flow.
              Built for law firm partners, accounting partners, private equity partners, and other self-employed professionals.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* INCOME SECTION */}
        <SectionCard
          icon={DollarSign}
          title="Partnership Income"
          description="Your total K-1 compensation and payment structure"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label className="flex items-center">
                Total Annual Compensation (Gross)
                <InfoTooltip content="Your total K-1 income including both guaranteed payments and distributive share" />
              </Label>
              <Input value={grossCompensation} setter={setGrossCompensation} />
            </div>
            <div>
              <Label className="flex items-center">
                Guaranteed Payments
                <InfoTooltip content="The portion subject to self-employment tax (like W-2 wages). The remainder is your distributive share." />
              </Label>
              <Input value={guaranteedPayments} setter={setGuaranteedPayments} />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
            <p className="text-sm">
              <strong>Distributive Share (calculated):</strong> ${distributiveShare.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              This is your profit allocation and has different tax treatment than guaranteed payments.
            </p>
          </div>

          <div>
            <Label>Pay Frequency</Label>
            <Select value={payFrequency} onValueChange={(value: PayFrequency) => setPayFrequency(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly (12 payments)</SelectItem>
                <SelectItem value="semimonthly">Semi-Monthly (24 payments)</SelectItem>
                <SelectItem value="biweekly">Bi-Weekly (26 payments)</SelectItem>
                <SelectItem value="weekly">Weekly (52 payments)</SelectItem>
                <SelectItem value="quarterly">Quarterly (4 payments)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </SectionCard>

        {/* FILING STATUS & SPOUSE */}
        <SectionCard
          icon={Building2}
          title="Filing Status & Household"
          description="Your tax filing status and spouse's income (if applicable)"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Filing Status</Label>
              <Select value={filingStatus} onValueChange={(value: FilingStatus) => setFilingStatus(value)}>
                <SelectTrigger>
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
          </div>

          {isMarried && (
            <>
              <Separator className="my-4" />
              <h4 className="font-semibold text-sm mb-3">Spouse Information</h4>
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Spouse W-2 Annual Income"
                  value={spouseW2Income}
                  setter={setSpouseW2Income}
                />
                <Input
                  label="Spouse Federal Withholding (per paycheck)"
                  value={spouseWithholding}
                  setter={setSpouseWithholding}
                />
              </div>
              <div>
                <Label>Spouse Pay Frequency</Label>
                <Select value={spousePayFrequency} onValueChange={(value: PayFrequency) => setSpousePayFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="semimonthly">Semi-Monthly</SelectItem>
                    <SelectItem value="biweekly">Bi-Weekly</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </SectionCard>

        {/* RETIREMENT & BENEFITS */}
        <SectionCard
          icon={TrendingUp}
          title="Retirement & Benefits"
          description="Your retirement contributions and health benefits"
        >
          <div>
            <Label>Your Age</Label>
            <Input value={age} setter={setAge} />
            <p className="text-xs text-muted-foreground mt-1">
              Age {age}: Max 401(k) is ${max401k.toLocaleString()}
              {age >= 50 && age < 60 && " (includes $8,000 catch-up)"}
              {age >= 60 && age <= 63 && " (includes $11,250 super catch-up)"}
            </p>
          </div>

          <Separator />

          <h4 className="font-semibold text-sm">Retirement Contributions (Annual)</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Traditional 401(k)"
              value={traditional401k}
              setter={setTraditional401k}
            />
            <Input
              label="Roth 401(k)"
              value={roth401k}
              setter={setRoth401k}
            />
            <Input
              label="Defined Benefit Plan"
              value={definedBenefitPlan}
              setter={setDefinedBenefitPlan}
            />
            <Input
              label="SEP-IRA"
              value={sepIRA}
              setter={setSepIRA}
            />
          </div>

          {age >= 50 && (
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
              <p className="text-sm font-semibold">SECURE 2.0 Alert</p>
              <p className="text-xs text-muted-foreground mt-1">
                If your prior year FICA wages exceeded $150,000, catch-up contributions must be made as Roth starting in 2026.
              </p>
            </div>
          )}

          <Separator />

          <h4 className="font-semibold text-sm">Health Benefits (Annual)</h4>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Health Insurance Coverage</Label>
              <Select value={healthInsuranceCoverage} onValueChange={(value: any) => setHealthInsuranceCoverage(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="self">Self Only</SelectItem>
                  <SelectItem value="self_spouse">Self + Spouse</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              label="Health Insurance Premium (Annual)"
              value={healthInsurancePremium}
              setter={setHealthInsurancePremium}
            />
            <Input
              label="Dental/Vision Premium (Annual)"
              value={dentalVisionPremium}
              setter={setDentalVisionPremium}
            />
            <div>
              <Input
                label="HSA Contribution (Annual)"
                value={hsaContribution}
                setter={setHsaContribution}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Max: ${maxHSA.toLocaleString()}
              </p>
            </div>
            <Input
              label="Dependent Care FSA (Annual)"
              value={dependentCareFSA}
              setter={setDependentCareFSA}
            />
          </div>
        </SectionCard>

        {/* STATE TAXES */}
        <SectionCard
          icon={Building2}
          title="State Taxes"
          description="Estimated state income tax on partnership income"
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Estimated State Tax Rate (%)"
                value={stateRate}
                setter={setStateRate}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter your expected effective state tax rate (e.g., 4.5 for 4.5%)
              </p>
            </div>
            <div>
              <Label>Withholding Method</Label>
              <Select value={withholdingMethod} onValueChange={(value: any) => setWithholdingMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="partnership_withholds">Partnership Withholds (PTET)</SelectItem>
                  <SelectItem value="quarterly_estimates">Quarterly Estimates</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </SectionCard>

        {/* FIXED EXPENSES */}
        <SectionCard
          icon={Home}
          title="Fixed Expenses"
          description="Your monthly fixed expenses (per period)"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              label="Mortgage/Rent (per period)"
              value={mortgage}
              setter={setMortgage}
            />
            <Input
              label="Household Expenses (per period)"
              value={householdExpenses}
              setter={setHouseholdExpenses}
            />
            <Input
              label="Discretionary Budget (per period)"
              value={discretionaryBudget}
              setter={setDiscretionaryBudget}
            />
          </div>
        </SectionCard>

        {/* CALCULATE BUTTON */}
        <div className="flex justify-center pb-8">
          <Button size="lg" onClick={handleCalculate} className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculate 2026 Tax & Cash Flow
          </Button>
        </div>

        {/* RESULTS SECTION */}
        {results && (
          <div id="results-section" className="space-y-6 scroll-mt-20">
            {/* Annual Summary */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  2026 Annual Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-900">
                    <div className="text-sm text-green-700 dark:text-green-400">Gross Income</div>
                    <div className="text-xl font-bold">${results.yearSummary.totalGrossIncome.toLocaleString()}</div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
                    <div className="text-sm text-red-700 dark:text-red-400">Total Taxes</div>
                    <div className="text-xl font-bold">
                      ${(results.yearSummary.totalSelfEmploymentTax + results.yearSummary.totalFederalTax + results.yearSummary.totalStateTax).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {(results.yearSummary.effectiveTaxRate * 100).toFixed(1)}% effective
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                    <div className="text-sm text-blue-700 dark:text-blue-400">Retirement Saved</div>
                    <div className="text-xl font-bold">${results.yearSummary.totalRetirement.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <div className="text-sm text-emerald-700 dark:text-emerald-400">Investable Proceeds</div>
                    <div className="text-xl font-bold">${results.yearSummary.totalInvestableProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Self-Employment Tax</div>
                    <div className="font-semibold">${results.seTaxResult.totalSETax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-muted-foreground">
                      SS: ${results.seTaxResult.socialSecurityTax.toLocaleString(undefined, { maximumFractionDigits: 0 })} |
                      Medicare: ${(results.seTaxResult.medicareTax + results.seTaxResult.additionalMedicareTax).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Federal Income Tax</div>
                    <div className="font-semibold">${results.yearSummary.totalFederalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                    <div className="text-xs text-muted-foreground">
                      {(results.yearSummary.marginalTaxRate * 100).toFixed(0)}% marginal bracket
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">State Tax</div>
                    <div className="font-semibold">${results.yearSummary.totalStateTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Health Benefits</div>
                    <div className="font-semibold">${results.yearSummary.totalHealthBenefits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Fixed Expenses</div>
                    <div className="font-semibold">${results.yearSummary.totalFixedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cash Flow Table */}
            <Card>
              <CardHeader>
                <CardTitle>Per-Period Cash Flow</CardTitle>
                <CardDescription>
                  Showing {results.periods.length} payment periods with detailed breakdown
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-muted">
                      <tr className="border-b">
                        <th className="text-left p-2">Period</th>
                        <th className="text-right p-2">Gross</th>
                        <th className="text-right p-2">Fed Tax</th>
                        <th className="text-right p-2">SE Tax</th>
                        <th className="text-right p-2">State</th>
                        <th className="text-right p-2">401k</th>
                        <th className="text-right p-2">Benefits</th>
                        <th className="text-right p-2">Net Pay</th>
                        <th className="text-right p-2">Expenses</th>
                        <th className="text-right p-2">Investable</th>
                        <th className="text-right p-2">SS Cap</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.periods.map((period) => (
                        <tr key={period.periodNumber} className="border-b hover:bg-muted/50">
                          <td className="p-2">{period.periodNumber}</td>
                          <td className="text-right p-2">${period.grossPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 text-red-600">${period.federalTaxWithholding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 text-red-600">${(period.socialSecurityTax + period.medicareTax).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 text-red-600">${period.stateTaxWithholding.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 text-blue-600">${period.retirement401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2">${(period.healthInsurance + period.hsa).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 font-semibold">${period.netPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2">${period.totalFixedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2 text-green-600 font-semibold">${period.investableProceeds.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="text-right p-2">
                            {period.ssCapReached ? (
                              <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                                Cap Reached
                              </span>
                            ) : (
                              <span className="text-xs">${period.ssWageBaseRemaining.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm">
                    <strong>Social Security Cap Tracking:</strong> The SS wage base for 2026 is ${SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE.toLocaleString()}.
                    Social Security tax stops once you reach this threshold. The table shows remaining room in the "SS Cap" column.
                  </p>
                  <p className="text-sm mt-2">
                    <strong>Max SS Tax for 2026:</strong> ${(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE * SE_TAX_2026.SOCIAL_SECURITY_RATE).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Tax Insights */}
            <Card>
              <CardHeader>
                <CardTitle>Tax Insights</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-900">
                  <p className="text-sm font-semibold">SE Tax Deduction</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    You can deduct ${results.seTaxResult.deductiblePortion.toLocaleString(undefined, { maximumFractionDigits: 0 })} (50% of SE tax excluding additional Medicare) as an above-the-line deduction.
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                  <p className="text-sm font-semibold">Quarterly Estimate Guidance</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Safe Harbor: Pay 100% of prior year tax (or 110% if AGI &gt; $150K). For quarterly estimates, divide your annual tax by 4.
                    Due dates: Q1 (Apr 15), Q2 (Jun 15), Q3 (Sep 15), Q4 (Jan 15 next year).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
