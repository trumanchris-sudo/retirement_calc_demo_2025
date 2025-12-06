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

  // Distributive Share Schedule
  const [distributionTiming, setDistributionTiming] = useState<'quarterly' | 'annual' | 'monthly' | 'none'>('quarterly');
  const [annualDistributionMonth, setAnnualDistributionMonth] = useState(11); // December
  const [statePTETAlreadyPaid, setStatePTETAlreadyPaid] = useState(false);
  const [federalEstimatesAlreadyPaid, setFederalEstimatesAlreadyPaid] = useState(false);

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

  // Spouse Retirement (if married)
  const [spouseAge, setSpouseAge] = useState(40);
  const [spouseTraditional401k, setSpouseTraditional401k] = useState(0);
  const [spouseRoth401k, setSpouseRoth401k] = useState(0);

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
        distributiveShareSchedule: {
          timing: distributionTiming,
          annualDistributionMonth,
          quarterlyDistributionMonths: [2, 5, 8, 11], // Mar, Jun, Sep, Dec
          statePTETAlreadyPaid,
          federalEstimatesAlreadyPaid,
        },
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
            <Label>Pay Frequency (Guaranteed Payments)</Label>
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

          <Separator className="my-4" />

          <h4 className="font-semibold text-sm mb-3 flex items-center">
            Distributive Share Distribution Schedule
            <InfoTooltip content="When do you receive your profit distributions? These are NOT subject to SE tax but may have state PTET or federal estimates already paid." />
          </h4>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Distribution Timing</Label>
              <Select value={distributionTiming} onValueChange={(value: any) => setDistributionTiming(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="quarterly">Quarterly (Mar, Jun, Sep, Dec)</SelectItem>
                  <SelectItem value="annual">Annual Lump Sum</SelectItem>
                  <SelectItem value="monthly">Monthly (with regular payments)</SelectItem>
                  <SelectItem value="none">No distributions modeled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {distributionTiming === 'annual' && (
              <div>
                <Label>Distribution Month</Label>
                <Select value={annualDistributionMonth.toString()} onValueChange={(value: string) => setAnnualDistributionMonth(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">January</SelectItem>
                    <SelectItem value="1">February</SelectItem>
                    <SelectItem value="2">March</SelectItem>
                    <SelectItem value="3">April</SelectItem>
                    <SelectItem value="4">May</SelectItem>
                    <SelectItem value="5">June</SelectItem>
                    <SelectItem value="6">July</SelectItem>
                    <SelectItem value="7">August</SelectItem>
                    <SelectItem value="8">September</SelectItem>
                    <SelectItem value="9">October</SelectItem>
                    <SelectItem value="10">November</SelectItem>
                    <SelectItem value="11">December</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {distributionTiming !== 'none' && (
            <div className="space-y-3 mt-4">
              <Label className="text-sm font-semibold">Tax Payment Status (for Distributive Share)</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="state-ptet"
                  checked={statePTETAlreadyPaid}
                  onChange={(e) => setStatePTETAlreadyPaid(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="state-ptet" className="font-normal cursor-pointer flex items-center">
                  State PTET already paid by partnership
                  <InfoTooltip content="Many states allow partnerships to pay state income tax at the entity level, avoiding the $10K SALT cap" />
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="federal-estimates"
                  checked={federalEstimatesAlreadyPaid}
                  onChange={(e) => setFederalEstimatesAlreadyPaid(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="federal-estimates" className="font-normal cursor-pointer flex items-center">
                  Federal quarterly estimates already paid
                  <InfoTooltip content="Check if you've already made quarterly estimated tax payments covering this income" />
                </Label>
              </div>
            </div>
          )}
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

          {isMarried && (
            <>
              <Separator />
              <h4 className="font-semibold text-sm">Spouse Retirement Contributions (Annual)</h4>
              <div className="grid md:grid-cols-3 gap-4">
                <Input
                  label="Spouse Age"
                  value={spouseAge}
                  setter={setSpouseAge}
                />
                <Input
                  label="Spouse Traditional 401(k)"
                  value={spouseTraditional401k}
                  setter={setSpouseTraditional401k}
                />
                <Input
                  label="Spouse Roth 401(k)"
                  value={spouseRoth401k}
                  setter={setSpouseRoth401k}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Spouse age {spouseAge}: Max 401(k) is ${getMax401kContribution(spouseAge).toLocaleString()}
                {spouseAge >= 50 && spouseAge < 60 && " (includes $8,000 catch-up)"}
                {spouseAge >= 60 && spouseAge <= 63 && " (includes $11,250 super catch-up)"}
              </p>
            </>
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
          description="Your monthly fixed expenses (entered as monthly amounts)"
        >
          <div className="grid md:grid-cols-3 gap-4">
            <Input
              label="Mortgage/Rent (monthly)"
              value={mortgage}
              setter={setMortgage}
            />
            <Input
              label="Household Expenses (monthly)"
              value={householdExpenses}
              setter={setHouseholdExpenses}
            />
            <Input
              label="Discretionary Budget (monthly)"
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
                <div className="space-y-8">
                  {(() => {
                    const chunkSize = 6;
                    const chunks: any[][] = [];
                    for (let i = 0; i < results.periods.length; i += chunkSize) {
                      chunks.push(results.periods.slice(i, i + chunkSize));
                    }
                    return chunks.map((chunk, chunkIdx) => (
                      <div key={chunkIdx} className="overflow-x-auto border rounded-lg">
                        <table className="w-full text-xs border-collapse">
                          <thead>
                            <tr className="border-b-2">
                              <th className="text-left py-2 px-2 font-semibold min-w-[180px] bg-background sticky left-0">Item</th>
                              {chunk.map((period) => (
                                <th key={period.periodNumber} className={`text-right py-2 px-2 font-semibold min-w-[90px] border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-background'}`}>
                                  #{period.periodNumber}
                                  {period.isDistributionPeriod && <span className="ml-1 text-emerald-600">●</span>}
                                  <br/>
                                  <span className="text-[10px] font-normal text-muted-foreground">
                                    {new Date(period.periodDate + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'})}
                                  </span>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {/* INCOME SECTION */}
                            <tr className="bg-blue-50 dark:bg-blue-950/20">
                              <td colSpan={chunk.length + 1} className="py-1 px-2 font-semibold text-xs">INCOME</td>
                            </tr>
                            <tr className="hover:bg-muted/50">
                              <td className="py-1 px-2 sticky left-0 bg-background">Guaranteed Payments</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  ${period.guaranteedPaymentAmount.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50">
                              <td className="py-1 px-2 sticky left-0 bg-background">Distributive Share</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  {period.isDistributionPeriod ? (
                                    <span className="text-emerald-600 font-semibold">${period.distributiveShareAmount.toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              ))}
                            </tr>
                            <tr className="font-bold bg-muted/30">
                              <td className="py-1 px-2 sticky left-0 bg-muted/30">Total Gross Income</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-muted/30'}`}>
                                  ${period.grossPay.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>

                            {/* PAYCHECK DEDUCTIONS SECTION */}
                            <tr className="bg-red-50 dark:bg-red-950/20">
                              <td colSpan={chunk.length + 1} className="py-1 px-2 font-semibold text-xs">DEDUCTIONS FROM PAYCHECK</td>
                            </tr>
                            <tr className="hover:bg-muted/50 text-red-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">SE Tax (SS + Medicare)</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.socialSecurityTax + period.medicareTax).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-red-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Federal Income Tax</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.federalTaxWithholding.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-red-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">State Income Tax</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.stateTaxWithholding.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-blue-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Traditional 401(k)</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.retirement401k.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-blue-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Roth 401(k)</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.roth401k.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-blue-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Defined Benefit Plan</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.definedBenefitPlan.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Health Insurance</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.healthInsurance.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Dental/Vision</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.dentalVision.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">HSA Contribution</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.hsa.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Dependent Care FSA</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.dependentCareFSA.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="font-bold bg-amber-50 dark:bg-amber-950/20">
                              <td className="py-1 px-2 sticky left-0 bg-amber-50 dark:bg-amber-950/20">= Net Pay (to Bank Account)</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                                  ${period.netPay.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>

                            {/* POST-PAYMENT EXPENSES SECTION */}
                            <tr className="bg-orange-50 dark:bg-orange-950/20">
                              <td colSpan={chunk.length + 1} className="py-1 px-2 font-semibold text-xs">POST-PAYMENT EXPENSES</td>
                            </tr>
                            <tr className="hover:bg-muted/50 text-orange-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Mortgage/Rent</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.mortgage.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-orange-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Household Expenses</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.householdExpenses.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-orange-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Discretionary Budget</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${period.discretionaryBudget.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="font-bold bg-green-50 dark:bg-green-950/20">
                              <td className="py-1 px-2 sticky left-0 bg-green-50 dark:bg-green-950/20">= Investable Proceeds</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l text-green-600 ${period.isDistributionPeriod ? 'bg-green-100 dark:bg-green-950/30' : 'bg-green-50 dark:bg-green-950/20'}`}>
                                  ${period.investableProceeds.toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>

                            {/* SS CAP TRACKING */}
                            <tr className="bg-slate-50 dark:bg-slate-950/20 border-t-2">
                              <td className="py-1 px-2 text-xs font-semibold sticky left-0 bg-slate-50 dark:bg-slate-950/20">SS Wage Base Remaining</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l text-xs ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-slate-50 dark:bg-slate-950/20'}`}>
                                  {period.ssCapReached ? (
                                    <span className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">Cap Reached</span>
                                  ) : (
                                    `$${period.ssWageBaseRemaining.toLocaleString(undefined, {maximumFractionDigits:0})}`
                                  )}
                                </td>
                              ))}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ));
                  })()}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-900">
                    <p className="text-sm font-semibold flex items-center">
                      <span className="text-emerald-600 mr-2">●</span> Distribution Periods
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Periods highlighted in green receive distributive share distributions. These are NOT subject to self-employment tax.
                      {statePTETAlreadyPaid && " State PTET already paid by partnership."}
                      {federalEstimatesAlreadyPaid && " Federal quarterly estimates already paid."}
                    </p>
                  </div>
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
