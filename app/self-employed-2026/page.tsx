"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Calculator, TrendingUp, Info, DollarSign, Building2, Home } from "lucide-react";
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
import { useBudget } from "@/lib/budget-context";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import { loadSharedIncomeData, hasRecentIncomeData } from "@/lib/sharedIncomeData";
import {
  FilingStatus as SEFilingStatus,
  PayFrequency,
  getMax401kContribution,
  getMaxHSAContribution,
  SE_TAX_2026,
  HSA_LIMITS_2026,
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
import { fmtFull, fmtPercent } from "@/lib/utils";

// Shared components and hooks
import {
  IncomeCalculatorLayout,
  SectionCard,
} from "@/components/income/IncomeCalculatorLayout";
import {
  useScrollState,
  useCalculationState,
} from "@/hooks/useIncomeCalculator";

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function SelfEmployed2026Page() {
  useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  // Use shared hooks
  const scrollState = useScrollState();
  const calculationState = useCalculationState();

  // ============================================================================
  // DEFAULTS FOR FALLBACK VALUES
  // ============================================================================
  const DEFAULTS = useMemo(() => createDefaultPlanConfig(), []);

  // ============================================================================
  // DERIVED STATE FROM PLANCONFIG (Single Source of Truth)
  // ============================================================================

  const filingStatus: SEFilingStatus = planConfig.marital === 'married' ? 'mfj' : 'single';
  const age = planConfig.age1 ?? DEFAULTS.age1;
  const spouseAge = planConfig.age2 ?? DEFAULTS.age2;
  const spouseW2Income = planConfig.spouseIncome ?? 0;
  const traditional401k = planConfig.cPre1 ?? DEFAULTS.cPre1;
  const roth401k = planConfig.cPost1 ?? DEFAULTS.cPost1;
  const spouseTraditional401k = planConfig.cPre2 ?? 0;
  const spouseRoth401k = planConfig.cPost2 ?? 0;
  const solo401kEmployer = planConfig.cMatch1 ?? 0;
  const stateRate = planConfig.stateRate ?? DEFAULTS.stateRate;
  const guaranteedPayments = planConfig.primaryIncome ?? 0;

  // ============================================================================
  // PAGE-LOCAL STATE (not in PlanConfig)
  // ============================================================================

  // grossCompensation: user can set independently from guaranteedPayments
  const [grossCompensation, setGrossCompensation] = useState(() =>
    Math.round((planConfig.primaryIncome ?? 0) * 1.3)
  );
  const [payFrequency, setPayFrequency] = useState<PayFrequency>("semimonthly");

  // Distributive Share Schedule
  const [distributionTiming, setDistributionTiming] = useState<'quarterly' | 'annual' | 'monthly' | 'none'>('quarterly');
  const [annualDistributionMonth, setAnnualDistributionMonth] = useState(11);
  const [statePTETAlreadyPaid, setStatePTETAlreadyPaid] = useState(false);
  const [federalEstimatesAlreadyPaid, setFederalEstimatesAlreadyPaid] = useState(false);

  // Spouse local-only fields
  const [spouseWithholding, setSpouseWithholding] = useState(1577);
  const [spousePayFrequency, setSpousePayFrequency] = useState<PayFrequency>("biweekly");

  // Retirement (page-local, not in PlanConfig)
  const [definedBenefitPlan, setDefinedBenefitPlan] = useState(26500);
  const [sepIRA, setSepIRA] = useState(0);

  // Health Benefits
  const [healthInsuranceCoverage, setHealthInsuranceCoverage] = useState<'self' | 'self_spouse' | 'family' | 'none'>('self');
  const [healthInsurancePremium, setHealthInsurancePremium] = useState(677 * 12);
  const [dentalVisionPremium, setDentalVisionPremium] = useState(80 * 12);
  const [hsaContribution, setHsaContribution] = useState(4400);
  const [dependentCareFSA, setDependentCareFSA] = useState(5000);
  const [healthFSA, setHealthFSA] = useState(0);

  // State tax local-only fields
  const [withholdingMethod, setWithholdingMethod] = useState<'partnership_withholds' | 'quarterly_estimates'>('partnership_withholds');

  // Fixed Expenses
  const [mortgage, setMortgage] = useState(2930);
  const [householdExpenses, setHouseholdExpenses] = useState(1500);
  const [discretionaryBudget, setDiscretionaryBudget] = useState(2500);

  // Results
  const [results, setResults] = useState<{
    periods: PerPeriodCashFlow[];
    yearSummary: YearSummary;
    // Reason: seTaxResult and federalTaxResult come from calculation engine with dynamic shape
    seTaxResult: any;
    federalTaxResult: any;
  } | null>(null);

  // AI Onboarding state
  const [isFromAIOnboarding, setIsFromAIOnboarding] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const distributiveShare = grossCompensation - guaranteedPayments;
  const max401k = getMax401kContribution(age);
  const maxHSA = getMaxHSAContribution(healthInsuranceCoverage === 'self' ? 'self' : 'family', age);
  const isMarried = filingStatus === 'mfj';

  // ============================================================================
  // FILING STATUS HANDLER
  // ============================================================================

  const handleFilingStatusChange = useCallback((newStatus: string) => {
    const maritalValue = newStatus === 'mfj' ? 'married' : 'single';
    updatePlanConfig({ marital: maritalValue }, 'user-entered');
    if (maritalValue === 'single') {
      updatePlanConfig({ spouseIncome: 0, cPre2: 0, cPost2: 0 }, 'user-entered');
      // Clear local-only spouse fields
      setSpouseWithholding(0);
      setSpousePayFrequency("biweekly");
    }
  }, [updatePlanConfig]);

  // ============================================================================
  // EFFECTS - INITIALIZE PAGE-LOCAL STATE FROM PLANCONFIG (one-time setup)
  // ============================================================================

  useEffect(() => {
    // Initialize health insurance coverage based on marital status
    if (planConfig.marital === 'married') {
      if (planConfig.numChildren && planConfig.numChildren > 0) {
        setHealthInsuranceCoverage('family');
      } else {
        setHealthInsuranceCoverage('self_spouse');
      }
    } else {
      setHealthInsuranceCoverage('self');
    }

    if (planConfig.monthlyHealthcareP1 && planConfig.monthlyHealthcareP1 > 0) {
      const totalMonthlyHealthcare = planConfig.monthlyHealthcareP1 + (planConfig.monthlyHealthcareP2 ?? 0);
      setHealthInsurancePremium(totalMonthlyHealthcare * 12);
    }

    const currentAge = planConfig.age1 ?? 35;
    const isFamilyCoverage = planConfig.marital === 'married';
    const hsaBaseLimit = isFamilyCoverage ? HSA_LIMITS_2026.FAMILY : HSA_LIMITS_2026.SELF_ONLY;
    const hsaCatchUp = currentAge >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0;
    const maxHSAContrib = hsaBaseLimit + hsaCatchUp;
    setHsaContribution(maxHSAContrib);

    if (planConfig.monthlyMortgageRent && planConfig.monthlyMortgageRent > 0) {
      setMortgage(planConfig.monthlyMortgageRent);
    }

    if (planConfig.monthlyHouseholdExpenses && planConfig.monthlyHouseholdExpenses > 0) {
      setHouseholdExpenses(planConfig.monthlyHouseholdExpenses);
    } else {
      let totalHouseholdExpenses = 1500;
      if (planConfig.monthlyUtilities && planConfig.monthlyUtilities > 0) {
        totalHouseholdExpenses = planConfig.monthlyUtilities;
      }
      if (planConfig.monthlyOtherExpenses && planConfig.monthlyOtherExpenses > 0) {
        totalHouseholdExpenses += planConfig.monthlyOtherExpenses;
      }
      if (planConfig.monthlyInsurancePropertyTax && planConfig.monthlyInsurancePropertyTax > 0) {
        totalHouseholdExpenses += planConfig.monthlyInsurancePropertyTax;
      }
      if (totalHouseholdExpenses > 1500) {
        setHouseholdExpenses(totalHouseholdExpenses);
      }
    }

    if (planConfig.monthlyDiscretionary && planConfig.monthlyDiscretionary > 0) {
      setDiscretionaryBudget(planConfig.monthlyDiscretionary);
    }

    // Initialize grossCompensation from primaryIncome
    const isSelfEmployed =
      planConfig.employmentType1 === 'self-employed' ||
      planConfig.employmentType1 === 'both';

    if (isSelfEmployed && planConfig.primaryIncome && planConfig.primaryIncome > 0) {
      setGrossCompensation(Math.round(planConfig.primaryIncome * 1.3));
    }

    // Detect AI onboarding
    const hasAISuggestedFields = planConfig.fieldMetadata &&
      Object.values(planConfig.fieldMetadata).some((meta) => meta?.source === 'ai-suggested');
    if (hasAISuggestedFields) {
      setIsFromAIOnboarding(true);
      setShowAIBanner(true);
    }

    // Legacy sharedIncomeData fallback
    if (!hasAISuggestedFields && (!isSelfEmployed || !planConfig.primaryIncome)) {
      if (hasRecentIncomeData()) {
        const sharedData = loadSharedIncomeData();
        if (
          sharedData &&
          sharedData.source === 'ai-onboarding' &&
          (sharedData.employmentType1 === 'self-employed' || sharedData.employmentType1 === 'both')
        ) {
          // Write to PlanConfig SSOT instead of local state
          updatePlanConfig({ primaryIncome: sharedData.primaryIncome }, 'imported');
          setGrossCompensation(Math.round(sharedData.primaryIncome * 1.3));

          if (sharedData.maritalStatus === 'married' && sharedData.spouseIncome) {
            updatePlanConfig({ spouseIncome: sharedData.spouseIncome }, 'imported');
          }

          setIsFromAIOnboarding(true);
          setShowAIBanner(true);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClearAIData = useCallback(() => {
    setIsFromAIOnboarding(false);
    setShowAIBanner(false);
    updatePlanConfig({ marital: 'single', primaryIncome: 0, spouseIncome: 0 }, 'user-entered');
    setGrossCompensation(0);
  }, [updatePlanConfig]);

  const handleApplyToMainPlan = useCallback(() => {
    const seTaxDeductible = results?.seTaxResult?.deductiblePortion ?? 0;
    const adjustedIncome1 = guaranteedPayments + distributiveShare - seTaxDeductible;

    const totalRetirement1 = traditional401k + roth401k + definedBenefitPlan + sepIRA + solo401kEmployer;
    const totalRetirement2 = isMarried ? (spouseTraditional401k + spouseRoth401k) : 0;

    const max401kPerson1 = getMax401kContribution(age);
    const max401kPerson2 = isMarried ? getMax401kContribution(spouseAge) : 0;

    updatePlanConfig({
      marital: isMarried ? 'married' : 'single',
      employmentType1: 'self-employed',
      employmentType2: isMarried ? 'w2' : undefined,
      age1: age,
      age2: isMarried ? spouseAge : planConfig.age2,
      primaryIncome: adjustedIncome1,
      spouseIncome: isMarried ? spouseW2Income : 0,
      cPre1: traditional401k + definedBenefitPlan + sepIRA,
      cPost1: roth401k,
      cPre2: isMarried ? spouseTraditional401k : 0,
      cPost2: isMarried ? spouseRoth401k : 0,
      cMatch1: solo401kEmployer,
      cMatch2: isMarried ? planConfig.cMatch2 : 0,
      stateRate: stateRate,
      monthlyHealthcareP1: Math.round(healthInsurancePremium / 12),
      monthlyHealthcareP2: isMarried ? Math.round(dentalVisionPremium / 12) : 0,
      monthlyMortgageRent: mortgage,
      monthlyUtilities: Math.round(householdExpenses * 0.3),
      monthlyOtherExpenses: Math.round(householdExpenses * 0.7 + discretionaryBudget),
    }, 'user-entered');

    const summaryMsg = `Self-employed 2026 data applied to main retirement plan:
- Adjusted Annual Income: $${adjustedIncome1.toLocaleString()}
- Total Retirement Contributions: $${totalRetirement1.toLocaleString()}
- Max 401(k) for Age ${age}: $${max401kPerson1.toLocaleString()}
${isMarried ? `- Spouse Income: $${spouseW2Income.toLocaleString()}
- Spouse Retirement: $${totalRetirement2.toLocaleString()}
- Spouse Max 401(k) for Age ${spouseAge}: $${max401kPerson2.toLocaleString()}` : ''}`;

    alert(summaryMsg);
  }, [
    results, guaranteedPayments, distributiveShare, traditional401k, roth401k,
    definedBenefitPlan, sepIRA, solo401kEmployer, isMarried, spouseTraditional401k,
    spouseRoth401k, age, spouseAge, spouseW2Income, stateRate, healthInsurancePremium,
    dentalVisionPremium, mortgage, householdExpenses, discretionaryBudget,
    planConfig.age2, planConfig.cMatch2, updatePlanConfig
  ]);

  // ============================================================================
  // CALCULATION HANDLER
  // ============================================================================

  const handleCalculate = useCallback(() => {
    calculationState.setIsCalculating(true);
    calculationState.setCalculationError(null);
    calculationState.setIsDirty(false);

    try {
      const inputs: CalculationInputs = {
        partnerIncome: {
          grossCompensation,
          guaranteedPayments,
          distributiveShare,
          payFrequency,
          distributiveShareSchedule: {
            timing: distributionTiming,
            annualDistributionMonth,
            quarterlyDistributionMonths: [2, 5, 8, 11],
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

      scrollState.scrollToResults();
      calculationState.setIsCalculating(false);
    } catch (error) {
      console.error('[SelfEmployed2026] Calculation error:', error);
      calculationState.setCalculationError(error instanceof Error ? error.message : 'An unexpected error occurred during calculation.');
      setResults(null);
      calculationState.setIsCalculating(false);
    }
  }, [
    grossCompensation, guaranteedPayments, distributiveShare, payFrequency,
    distributionTiming, annualDistributionMonth, statePTETAlreadyPaid,
    federalEstimatesAlreadyPaid, filingStatus, isMarried, spouseW2Income,
    spouseWithholding, spousePayFrequency, traditional401k, roth401k,
    definedBenefitPlan, sepIRA, solo401kEmployer, age, healthInsurancePremium,
    healthInsuranceCoverage, dentalVisionPremium, hsaContribution, dependentCareFSA,
    healthFSA, stateRate, withholdingMethod, mortgage, householdExpenses,
    discretionaryBudget, calculationState, scrollState
  ]);

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

  // ============================================================================
  // RESULTS SECTION
  // ============================================================================

  const renderResults = () => {
    if (!results) return null;

    return (
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
                <div className="text-xl font-bold">{fmtFull(results.yearSummary.totalGrossIncome ?? 0)}</div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-lg border border-red-200 dark:border-red-900">
                <div className="text-sm text-red-700 dark:text-red-400">Total Taxes</div>
                <div className="text-xl font-bold">
                  {fmtFull((results.yearSummary.totalSelfEmploymentTax ?? 0) + (results.yearSummary.totalFederalTax ?? 0) + (results.yearSummary.totalStateTax ?? 0))}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {fmtPercent(results.yearSummary.effectiveTaxRate ?? 0)} effective
                </div>
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
                <div className="text-sm text-blue-700 dark:text-blue-400">Retirement Saved</div>
                <div className="text-xl font-bold">{fmtFull(results.yearSummary.totalRetirement ?? 0)}</div>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-lg border border-emerald-200 dark:border-emerald-900">
                <div className="text-sm text-emerald-700 dark:text-emerald-400">Investable Proceeds</div>
                <div className="text-xl font-bold">{fmtFull(results.yearSummary.totalInvestableProceeds ?? 0)}</div>
              </div>
            </div>

            <Separator className="my-6" />

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-muted-foreground">Self-Employment Tax</div>
                <div className="font-semibold">{fmtFull(results.seTaxResult.totalSETax ?? 0)}</div>
                <div className="text-xs text-muted-foreground">
                  SS: {fmtFull(results.seTaxResult.socialSecurityTax ?? 0)} |
                  Medicare: {fmtFull((results.seTaxResult.medicareTax ?? 0) + (results.seTaxResult.additionalMedicareTax ?? 0))}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Federal Income Tax</div>
                <div className="font-semibold">{fmtFull(results.yearSummary.totalFederalTax ?? 0)}</div>
                <div className="text-xs text-muted-foreground">
                  {fmtPercent(results.yearSummary.marginalTaxRate ?? 0, 0)} marginal bracket
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">State Tax</div>
                <div className="font-semibold">{fmtFull(results.yearSummary.totalStateTax ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Health Benefits</div>
                <div className="font-semibold">{fmtFull(results.yearSummary.totalHealthBenefits ?? 0)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Fixed Expenses</div>
                <div className="font-semibold">{fmtFull(results.yearSummary.totalFixedExpenses ?? 0)}</div>
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
                              {period.isDistributionPeriod && <span className="ml-1 text-emerald-600">*</span>}
                              <br/>
                              <span className="text-[10px] font-normal text-muted-foreground">
                                {period.periodDate.toLocaleDateString('en-US', {month:'short', day:'numeric'})}
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
                              ${(period.guaranteedPaymentAmount ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-1 px-2 sticky left-0 bg-background">Distributive Share</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              {period.isDistributionPeriod ? (
                                <span className="text-emerald-600 font-semibold">${(period.distributiveShareAmount ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          ))}
                        </tr>
                        <tr className="font-bold bg-muted/30">
                          <td className="py-1 px-2 sticky left-0 bg-muted/30">Total Gross Income</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-100 dark:bg-emerald-950/30' : 'bg-muted/30'}`}>
                              ${(period.grossPay ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>

                        {/* DEDUCTIONS SECTION */}
                        <tr className="bg-red-50 dark:bg-red-950/20">
                          <td colSpan={chunk.length + 1} className="py-1 px-2 font-semibold text-xs">DEDUCTIONS FROM PAYCHECK</td>
                        </tr>
                        <tr className="hover:bg-muted/50 text-red-600">
                          <td className="py-1 px-2 pl-4 sticky left-0 bg-background">SE Tax (SS + Medicare)</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              -${((period.socialSecurityTax ?? 0) + (period.medicareTax ?? 0)).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50 text-red-600">
                          <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Federal Income Tax</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              -${(period.federalTaxWithholding ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50 text-red-600">
                          <td className="py-1 px-2 pl-4 sticky left-0 bg-background">State Income Tax</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              -${(period.stateTaxWithholding ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50 text-blue-600">
                          <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Traditional 401(k)</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              -${(period.retirement401k ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="font-bold bg-amber-50 dark:bg-amber-950/20">
                          <td className="py-1 px-2 sticky left-0 bg-amber-50 dark:bg-amber-950/20">= Net Pay (to Bank Account)</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-amber-100 dark:bg-amber-950/30' : 'bg-amber-50 dark:bg-amber-950/20'}`}>
                              ${(period.netPay ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>

                        {/* POST-PAYMENT EXPENSES */}
                        <tr className="bg-orange-50 dark:bg-orange-950/20">
                          <td colSpan={chunk.length + 1} className="py-1 px-2 font-semibold text-xs">POST-PAYMENT EXPENSES</td>
                        </tr>
                        <tr className="hover:bg-muted/50 text-orange-600">
                          <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Mortgage/Rent</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                              -${(period.mortgage ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                            </td>
                          ))}
                        </tr>
                        <tr className="font-bold bg-green-50 dark:bg-green-950/20">
                          <td className="py-1 px-2 sticky left-0 bg-green-50 dark:bg-green-950/20">= Investable Proceeds</td>
                          {chunk.map((period) => (
                            <td key={period.periodNumber} className={`text-right py-1 px-2 border-l text-green-600 ${period.isDistributionPeriod ? 'bg-green-100 dark:bg-green-950/30' : 'bg-green-50 dark:bg-green-950/20'}`}>
                              ${(period.investableProceeds ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
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
                                `$${(period.ssWageBaseRemaining ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}`
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
                  <span className="text-emerald-600 mr-2">*</span> Distribution Periods
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
                <strong>Social Security Cap Tracking:</strong> The SS wage base for 2026 is {fmtFull(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)}.
                Social Security tax stops once you reach this threshold.
              </p>
              <p className="text-sm mt-2">
                <strong>Max SS Tax for 2026:</strong> {fmtFull(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE * SE_TAX_2026.SOCIAL_SECURITY_RATE)}
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
                You can deduct {fmtFull(results.seTaxResult.deductiblePortion)} (50% of SE tax excluding additional Medicare) as an above-the-line deduction.
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
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <IncomeCalculatorLayout
      title="Self-Employed / K-1 Partner Budget Calculator (2026)"
      cardTitle="2026 Self-Employment Tax & Cash Flow Planner"
      cardDescription="Model your K-1 partnership income, self-employment taxes, retirement contributions, and cash flow. Built for law firm partners, accounting partners, private equity partners, and other self-employed professionals."
      cardIcon={<Calculator className="w-5 h-5" />}
      aiOnboarding={{
        isFromAIOnboarding,
        showAIBanner,
        onClearAIData: handleClearAIData,
        onDismissBanner: () => setShowAIBanner(false),
        bannerDescription: "Your income, expenses, and healthcare estimates have been pre-filled from your onboarding conversation. Review and edit any values below, then calculate to see your 2026 projections.",
      }}
      calculation={{
        isDirty: calculationState.isDirty,
        isCalculating: calculationState.isCalculating,
        error: calculationState.calculationError,
        hasResults: results !== null,
        onCalculate: handleCalculate,
        calculateButtonText: "Calculate 2026 Tax & Cash Flow",
        calculateButtonIcon: <Calculator className="w-5 h-5" />,
      }}
      onApplyToMainPlan={handleApplyToMainPlan}
      backToTop={{
        showButton: scrollState.showBackToTop,
        onScrollToTop: scrollState.scrollToTop,
      }}
      resultsSection={renderResults()}
    >
      {/* INCOME SECTION */}
      <SectionCard
        icon={<DollarSign className="w-5 h-5" />}
        title="Partnership Income"
        description="Your total K-1 compensation and payment structure"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Input
              label={
                <span className="flex items-center">
                  Total Annual Compensation (Gross)
                  <InfoTooltip content="Your total K-1 income including both guaranteed payments and distributive share" />
                </span>
              }
              value={grossCompensation}
              setter={(v) => { setGrossCompensation(v); calculationState.handleInputChange(); }}
            />
          </div>
          <div>
            <Input
              label={
                <span className="flex items-center">
                  Guaranteed Payments
                  <InfoTooltip content="The portion subject to self-employment tax (like W-2 wages). The remainder is your distributive share." />
                </span>
              }
              value={guaranteedPayments}
              setter={(v) => { updatePlanConfig({ primaryIncome: v }, 'user-entered'); calculationState.handleInputChange(); }}
            />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-900">
          <p className="text-sm">
            <strong>Distributive Share (calculated):</strong> {fmtFull(distributiveShare)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            This is your profit allocation and has different tax treatment than guaranteed payments.
          </p>
        </div>

        <div>
          <Label>Pay Frequency (Guaranteed Payments)</Label>
          <Select value={payFrequency} onValueChange={(value: PayFrequency) => { setPayFrequency(value); calculationState.handleInputChange(); }}>
            <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Select value={distributionTiming} onValueChange={(value: any) => { setDistributionTiming(value); calculationState.handleInputChange(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
              <Select value={annualDistributionMonth.toString()} onValueChange={(value: string) => { setAnnualDistributionMonth(parseInt(value)); calculationState.handleInputChange(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
                  ))}
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
                onChange={(e) => { setStatePTETAlreadyPaid(e.target.checked); calculationState.handleInputChange(); }}
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
                onChange={(e) => { setFederalEstimatesAlreadyPaid(e.target.checked); calculationState.handleInputChange(); }}
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
        icon={<Building2 className="w-5 h-5" />}
        title="Filing Status & Household"
        description="Your tax filing status and spouse's income (if applicable)"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label>Filing Status</Label>
            <Select value={filingStatus} onValueChange={(value: SEFilingStatus) => { handleFilingStatusChange(value); calculationState.handleInputChange(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
                setter={(v) => { updatePlanConfig({ spouseIncome: v }, 'user-entered'); calculationState.handleInputChange(); }}
              />
              <Input
                label="Spouse Federal Withholding (per paycheck)"
                value={spouseWithholding}
                setter={(v) => { setSpouseWithholding(v); calculationState.handleInputChange(); }}
              />
            </div>
            <div>
              <Label>Spouse Pay Frequency</Label>
              <Select value={spousePayFrequency} onValueChange={(value: PayFrequency) => { setSpousePayFrequency(value); calculationState.handleInputChange(); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
        icon={<TrendingUp className="w-5 h-5" />}
        title="Retirement & Benefits"
        description="Your retirement contributions and health benefits"
      >
        <div>
          <Input
            label="Your Age"
            value={age}
            setter={(v) => { updatePlanConfig({ age1: v }, 'user-entered'); calculationState.handleInputChange(); }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Age {age}: Max 401(k) is {fmtFull(max401k)}
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
            setter={(v) => { updatePlanConfig({ cPre1: v }, 'user-entered'); calculationState.handleInputChange(); }}
          />
          <Input
            label="Roth 401(k)"
            value={roth401k}
            setter={(v) => { updatePlanConfig({ cPost1: v }, 'user-entered'); calculationState.handleInputChange(); }}
          />
          <Input
            label="Defined Benefit Plan"
            value={definedBenefitPlan}
            setter={(v) => { setDefinedBenefitPlan(v); calculationState.handleInputChange(); }}
          />
          <Input
            label="SEP-IRA"
            value={sepIRA}
            setter={(v) => { setSepIRA(v); calculationState.handleInputChange(); }}
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
                setter={(v) => { updatePlanConfig({ age2: v }, 'user-entered'); calculationState.handleInputChange(); }}
              />
              <Input
                label="Spouse Traditional 401(k)"
                value={spouseTraditional401k}
                setter={(v) => { updatePlanConfig({ cPre2: v }, 'user-entered'); calculationState.handleInputChange(); }}
              />
              <Input
                label="Spouse Roth 401(k)"
                value={spouseRoth401k}
                setter={(v) => { updatePlanConfig({ cPost2: v }, 'user-entered'); calculationState.handleInputChange(); }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Spouse age {spouseAge}: Max 401(k) is {fmtFull(getMax401kContribution(spouseAge))}
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
            <Select value={healthInsuranceCoverage} onValueChange={(value: any) => { setHealthInsuranceCoverage(value); calculationState.handleInputChange(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            setter={(v) => { setHealthInsurancePremium(v); calculationState.handleInputChange(); }}
          />
          <Input
            label="Dental/Vision Premium (Annual)"
            value={dentalVisionPremium}
            setter={(v) => { setDentalVisionPremium(v); calculationState.handleInputChange(); }}
          />
          <div>
            <Input
              label="HSA Contribution (Annual)"
              value={hsaContribution}
              setter={(v) => { setHsaContribution(v); calculationState.handleInputChange(); }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max: {fmtFull(maxHSA)}
            </p>
          </div>
          <Input
            label="Dependent Care FSA (Annual)"
            value={dependentCareFSA}
            setter={(v) => { setDependentCareFSA(v); calculationState.handleInputChange(); }}
          />
        </div>
      </SectionCard>

      {/* STATE TAXES */}
      <SectionCard
        icon={<Building2 className="w-5 h-5" />}
        title="State Taxes"
        description="Estimated state income tax on partnership income"
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Input
              label="Estimated State Tax Rate (%)"
              value={stateRate}
              setter={(v) => { updatePlanConfig({ stateRate: v }, 'user-entered'); calculationState.handleInputChange(); }}
              isRate
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter your expected effective state tax rate (e.g., 4.5 for 4.5%)
            </p>
          </div>
          <div>
            <Label>Withholding Method</Label>
            <Select value={withholdingMethod} onValueChange={(value: any) => { setWithholdingMethod(value); calculationState.handleInputChange(); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
        icon={<Home className="w-5 h-5" />}
        title="Fixed Expenses"
        description="Your monthly fixed expenses (entered as monthly amounts)"
      >
        <div className="grid md:grid-cols-3 gap-4">
          <Input
            label="Mortgage/Rent (monthly)"
            value={mortgage}
            setter={(v) => { setMortgage(v); calculationState.handleInputChange(); }}
          />
          <Input
            label="Household Expenses (monthly)"
            value={householdExpenses}
            setter={(v) => { setHouseholdExpenses(v); calculationState.handleInputChange(); }}
          />
          <Input
            label="Discretionary Budget (monthly)"
            value={discretionaryBudget}
            setter={(v) => { setDiscretionaryBudget(v); calculationState.handleInputChange(); }}
          />
        </div>
      </SectionCard>
    </IncomeCalculatorLayout>
  );
}
