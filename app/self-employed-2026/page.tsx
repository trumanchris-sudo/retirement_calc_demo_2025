"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calculator, TrendingUp, Info, DollarSign, Building2, Heart, Home, Sparkles, X } from "lucide-react";
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
import { usePlanConfig } from "@/lib/plan-config-context";
import { loadSharedIncomeData, clearSharedIncomeData, hasRecentIncomeData } from "@/lib/sharedIncomeData";
import {
  FilingStatus,
  PayFrequency,
  getMax401kContribution,
  getMaxHSAContribution,
  SE_TAX_2026,
  RETIREMENT_LIMITS_2026,
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

export default function SelfEmployed2026Page() {
  useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

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
  const [traditional401k, setTraditional401k] = useState(24500); // 2026 limit
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

  // AI Onboarding auto-fill state
  const [isFromAIOnboarding, setIsFromAIOnboarding] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);

  // ============================================================================
  // BIDIRECTIONAL SYNC FUNCTIONS (SSOT)
  // ============================================================================
  // These functions update local state AND sync back to PlanConfig for consistency
  // across all calculators and tabs. This follows the same pattern as income-2026.

  // 1. Marital Status (Filing Status) sync
  const updateMaritalInSSOT = (value: string) => {
    const previousStatus = filingStatus;
    const newIsSingle = value !== 'mfj';
    const wasMarried = previousStatus === 'mfj';

    setFilingStatus(value as FilingStatus);
    updatePlanConfig({
      marital: value === 'mfj' ? 'married' : 'single'
    }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote marital status to PlanConfig SSOT:', value);

    // Clear spouse-related local state when switching from married to single
    if (newIsSingle && wasMarried) {
      console.log('[SelfEmployed2026] Clearing spouse data (switched to single)');
      setSpouseW2Income(0);
      setSpouseWithholding(0);
      setSpousePayFrequency("biweekly");
      setSpouseAge(30);
      setSpouseTraditional401k(0);
      setSpouseRoth401k(0);
    }
  };

  // 2. Primary Income (Guaranteed Payments) sync
  const updateGuaranteedPaymentsInSSOT = (value: number) => {
    setGuaranteedPayments(value);
    updatePlanConfig({ annualIncome1: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote guaranteed payments to PlanConfig SSOT:', value);
  };

  // 3. Spouse W2 Income sync
  const updateSpouseIncomeInSSOT = (value: number) => {
    setSpouseW2Income(value);
    updatePlanConfig({ annualIncome2: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote spouse W2 income to PlanConfig SSOT:', value);
  };

  // 4. Traditional 401(k) sync
  const updateTraditional401kInSSOT = (value: number) => {
    setTraditional401k(value);
    updatePlanConfig({ cPre1: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote traditional 401k to PlanConfig SSOT:', value);
  };

  // 5. Roth 401(k) sync
  const updateRoth401kInSSOT = (value: number) => {
    setRoth401k(value);
    updatePlanConfig({ cPost1: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote roth 401k to PlanConfig SSOT:', value);
  };

  // 6. Spouse Traditional 401(k) sync
  const updateSpouseTraditional401kInSSOT = (value: number) => {
    setSpouseTraditional401k(value);
    updatePlanConfig({ cPre2: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote spouse traditional 401k to PlanConfig SSOT:', value);
  };

  // 7. Spouse Roth 401(k) sync
  const updateSpouseRoth401kInSSOT = (value: number) => {
    setSpouseRoth401k(value);
    updatePlanConfig({ cPost2: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote spouse roth 401k to PlanConfig SSOT:', value);
  };

  // 8. Age sync
  const updateAgeInSSOT = (value: number) => {
    setAge(value);
    updatePlanConfig({ age1: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote age to PlanConfig SSOT:', value);
  };

  // 9. Spouse Age sync
  const updateSpouseAgeInSSOT = (value: number) => {
    setSpouseAge(value);
    updatePlanConfig({ age2: value }, 'user-entered');
    console.log('[SelfEmployed2026] Wrote spouse age to PlanConfig SSOT:', value);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const distributiveShare = grossCompensation - guaranteedPayments;
  const max401k = getMax401kContribution(age);
  const maxHSA = getMaxHSAContribution(healthInsuranceCoverage === 'self' ? 'self' : 'family', age);
  const isMarried = filingStatus === 'mfj';

  // ============================================================================
  // AI ONBOARDING AUTO-FILL
  // ============================================================================

  // Auto-fill from AI Onboarding data (only for self-employed users)
  // Pre-populate form from PlanConfig (single source of truth)
  useEffect(() => {
    // Priority 1: Use direct values from PlanConfig if available

    // ===== FILING STATUS (from marital status) =====
    if (planConfig.marital) {
      // Map planConfig marital status to FilingStatus
      // 'married' -> 'mfj', 'single' -> 'single'
      // Note: PlanConfig uses 'married'/'single', this page uses FilingStatus enum
      setFilingStatus(planConfig.marital === 'married' ? 'mfj' : 'single');
    }

    // ===== AGES =====
    if (planConfig.age1 && planConfig.age1 > 0) {
      setAge(planConfig.age1);
    }

    if (planConfig.age2 && planConfig.age2 > 0) {
      setSpouseAge(planConfig.age2);
    }

    // ===== STATE SELECTION (pre-populate state tax rate) =====
    // The stateRate in planConfig is already a percentage (e.g., 4.5 for 4.5%)
    if (planConfig.stateRate !== undefined && planConfig.stateRate > 0) {
      setStateRate(planConfig.stateRate);
    }

    // ===== INCOME PRE-POPULATION =====
    // Check if user is self-employed (includes K-1 income)
    const isSelfEmployed =
      planConfig.employmentType1 === 'self-employed' ||
      planConfig.employmentType1 === 'both';

    if (isSelfEmployed && planConfig.annualIncome1 && planConfig.annualIncome1 > 0) {
      // For self-employed, annualIncome1 represents guaranteed payments
      setGuaranteedPayments(planConfig.annualIncome1);

      // Set gross compensation higher than guaranteed payments by default
      // (distributive share = grossCompensation - guaranteedPayments)
      // If no specific gross comp is set, estimate as 1.3x guaranteed payments
      const estimatedGross = Math.round(planConfig.annualIncome1 * 1.3);
      setGrossCompensation(estimatedGross);
    }

    // ===== SPOUSE INCOME =====
    if (planConfig.marital === 'married' && planConfig.annualIncome2 && planConfig.annualIncome2 > 0) {
      setSpouseW2Income(planConfig.annualIncome2);

      // If spouse is also self-employed, detect it
      if (planConfig.employmentType2 === 'self-employed' || planConfig.employmentType2 === 'both') {
        // Spouse is also self-employed - could add additional handling here
        console.log('[SelfEmployed2026] Spouse also self-employed - income set as W2 equivalent');
      }
    }

    // ===== RETIREMENT CONTRIBUTIONS =====
    // Pre-fill retirement contributions from PlanConfig
    if (planConfig.cPre1 !== undefined && planConfig.cPre1 > 0) {
      setTraditional401k(planConfig.cPre1);
    }

    if (planConfig.cPost1 !== undefined && planConfig.cPost1 > 0) {
      setRoth401k(planConfig.cPost1);
    }

    // Pre-fill spouse retirement contributions
    if (planConfig.marital === 'married') {
      if (planConfig.cPre2 !== undefined && planConfig.cPre2 > 0) {
        setSpouseTraditional401k(planConfig.cPre2);
      }

      if (planConfig.cPost2 !== undefined && planConfig.cPost2 > 0) {
        setSpouseRoth401k(planConfig.cPost2);
      }
    }

    // ===== HEALTHCARE PRE-POPULATION =====
    // Set health insurance coverage type based on marital status and family
    if (planConfig.marital === 'married') {
      // If married, default to self+spouse or family coverage
      if (planConfig.numChildren && planConfig.numChildren > 0) {
        setHealthInsuranceCoverage('family');
      } else {
        setHealthInsuranceCoverage('self_spouse');
      }
    } else {
      setHealthInsuranceCoverage('self');
    }

    // Pre-fill healthcare costs from planConfig
    if (planConfig.monthlyHealthcareP1 && planConfig.monthlyHealthcareP1 > 0) {
      // Use wizard healthcare estimate for health insurance premium (annualized)
      const totalMonthlyHealthcare = planConfig.monthlyHealthcareP1 + (planConfig.monthlyHealthcareP2 ?? 0);
      setHealthInsurancePremium(totalMonthlyHealthcare * 12);
    }

    // ===== HSA PRE-POPULATION WITH 2026 LIMITS =====
    // Calculate correct HSA max based on coverage type and age
    const currentAge = planConfig.age1 || 42;
    const isFamilyCoverage = planConfig.marital === 'married';
    const hsaBaseLimit = isFamilyCoverage ? HSA_LIMITS_2026.FAMILY : HSA_LIMITS_2026.SELF_ONLY;
    const hsaCatchUp = currentAge >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0;
    const maxHSAContrib = hsaBaseLimit + hsaCatchUp;

    // Set a reasonable default HSA contribution (max allowed)
    setHsaContribution(maxHSAContrib);

    // ===== EXPENSE PRE-POPULATION =====
    // Pre-fill expenses from PlanConfig (if available)
    if (planConfig.monthlyMortgageRent && planConfig.monthlyMortgageRent > 0) {
      setMortgage(planConfig.monthlyMortgageRent);
    }

    // ===== NEW EXPENSE CATEGORIES (for 2026 calculators) =====
    // Pre-fill household expenses directly from PlanConfig (if available)
    if (planConfig.monthlyHouseholdExpenses && planConfig.monthlyHouseholdExpenses > 0) {
      setHouseholdExpenses(planConfig.monthlyHouseholdExpenses);
      console.log('[SelfEmployed2026] ✅ Loaded household expenses from PlanConfig:', planConfig.monthlyHouseholdExpenses);
    } else {
      // Fallback: Calculate total household expenses from various planConfig fields
      let totalHouseholdExpenses = 1500; // Default base
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

    // Pre-fill discretionary spending directly from PlanConfig (if available)
    if (planConfig.monthlyDiscretionary && planConfig.monthlyDiscretionary > 0) {
      setDiscretionaryBudget(planConfig.monthlyDiscretionary);
      console.log('[SelfEmployed2026] ✅ Loaded discretionary spending from PlanConfig:', planConfig.monthlyDiscretionary);
    }

    // ===== AI ONBOARDING DETECTION =====
    // Detect if data came from AI onboarding via PlanConfig fieldMetadata (preferred)
    const hasAISuggestedFields = planConfig.fieldMetadata &&
      Object.values(planConfig.fieldMetadata).some((meta: any) => meta?.source === 'ai-suggested');
    if (hasAISuggestedFields) {
      setIsFromAIOnboarding(true);
      setShowAIBanner(true);
    }

    // Priority 2: Fall back to legacy sharedIncomeData for backward compatibility
    if (!hasAISuggestedFields && (!isSelfEmployed || !planConfig.annualIncome1)) {
      if (hasRecentIncomeData()) {
        const sharedData = loadSharedIncomeData();
        if (
          sharedData &&
          sharedData.source === 'ai-onboarding' &&
          (sharedData.employmentType1 === 'self-employed' || sharedData.employmentType1 === 'both')
        ) {
          setGuaranteedPayments(sharedData.annualIncome1);
          // Also set gross compensation based on shared data
          setGrossCompensation(Math.round(sharedData.annualIncome1 * 1.3));

          if (sharedData.maritalStatus === 'married' && sharedData.annualIncome2) {
            setSpouseW2Income(sharedData.annualIncome2);
          }

          // Pre-populate state if available from sharedData
          if (sharedData.state) {
            // Could map state abbreviation to tax rate here if needed
            console.log('[SelfEmployed2026] State from AI onboarding:', sharedData.state);
          }

          setIsFromAIOnboarding(true);
          setShowAIBanner(true);
        }
      }
    }
  }, [planConfig]); // Re-run when PlanConfig changes

  // Clear and start fresh
  const handleClearAIData = () => {
    clearSharedIncomeData();
    setIsFromAIOnboarding(false);
    setShowAIBanner(false);
    // Reset to defaults
    setFilingStatus('mfj');
    setGrossCompensation(750000);
    setGuaranteedPayments(550000);
    setSpouseW2Income(145000);
  };

  // Apply 2026 self-employed planner values to main retirement plan
  const handleApplyToMainPlan = () => {
    const isMarried = filingStatus === 'mfj';

    // Calculate adjusted income after SE tax deduction
    // This is the "adjusted gross income" concept for retirement planning
    const seTaxDeductible = results?.seTaxResult?.deductiblePortion ?? 0;
    const adjustedIncome1 = guaranteedPayments + distributiveShare - seTaxDeductible;

    // Calculate total retirement contributions including employer portions
    const totalRetirement1 = traditional401k + roth401k + definedBenefitPlan + sepIRA + solo401kEmployer;
    const totalRetirement2 = isMarried ? (spouseTraditional401k + spouseRoth401k) : 0;

    // Max 401k contribution limits based on age (for validation/reference)
    const max401kPerson1 = getMax401kContribution(age);
    const max401kPerson2 = isMarried ? getMax401kContribution(spouseAge) : 0;

    updatePlanConfig({
      // Basic info
      marital: isMarried ? 'married' : 'single',
      employmentType1: 'self-employed',
      employmentType2: isMarried ? 'w2' : undefined,

      // Ages
      age1: age,
      age2: isMarried ? spouseAge : planConfig.age2,

      // Income (use adjusted income for better retirement projections)
      annualIncome1: adjustedIncome1,
      annualIncome2: isMarried ? spouseW2Income : 0,

      // Retirement contributions
      cPre1: traditional401k + definedBenefitPlan + sepIRA, // All pre-tax contributions
      cPost1: roth401k,
      cPre2: isMarried ? spouseTraditional401k : 0,
      cPost2: isMarried ? spouseRoth401k : 0,

      // Employer match equivalent (solo 401k employer portion)
      cMatch1: solo401kEmployer,
      cMatch2: isMarried ? planConfig.cMatch2 : 0,

      // State tax rate
      stateRate: stateRate,

      // Healthcare expenses (monthly)
      monthlyHealthcareP1: Math.round(healthInsurancePremium / 12),
      monthlyHealthcareP2: isMarried ? Math.round(dentalVisionPremium / 12) : 0,

      // Expense fields
      monthlyMortgageRent: mortgage,
      monthlyUtilities: Math.round(householdExpenses * 0.3), // Estimate utilities as 30% of household
      monthlyOtherExpenses: Math.round(householdExpenses * 0.7 + discretionaryBudget),
    }, 'user-entered');

    // Show confirmation with summary
    const summaryMsg = `Self-employed 2026 data applied to main retirement plan:
- Adjusted Annual Income: $${adjustedIncome1.toLocaleString()}
- Total Retirement Contributions: $${totalRetirement1.toLocaleString()}
- Max 401(k) for Age ${age}: $${max401kPerson1.toLocaleString()}
${isMarried ? `- Spouse Income: $${spouseW2Income.toLocaleString()}
- Spouse Retirement: $${totalRetirement2.toLocaleString()}
- Spouse Max 401(k) for Age ${spouseAge}: $${max401kPerson2.toLocaleString()}` : ''}`;

    alert(summaryMsg);
  };

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
            <Button variant="ghost" size="icon" aria-label="Go back to home page"><ArrowLeft className="w-4 h-4" aria-hidden="true" /></Button>
          </Link>
          <h1 className="font-semibold text-xl">Self-Employed / K-1 Partner Budget Calculator (2026)</h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* AI Onboarding Auto-fill Banner */}
        {showAIBanner && isFromAIOnboarding && (
          <Card className="mb-6 border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <CardTitle className="text-blue-900 dark:text-blue-100 text-base mb-1">
                      Pre-filled from AI Onboarding
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Your income, expenses, and healthcare estimates have been pre-filled from your onboarding conversation. Review and edit any values below, then calculate to see your 2026 projections.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAIData}
                    className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                  >
                    Clear & Start Fresh
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowAIBanner(false)}
                    className="text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                    aria-label="Dismiss AI onboarding banner"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

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
              <Input
                label={
                  <span className="flex items-center">
                    Total Annual Compensation (Gross)
                    <InfoTooltip content="Your total K-1 income including both guaranteed payments and distributive share" />
                  </span>
                }
                value={grossCompensation}
                setter={setGrossCompensation}
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
                setter={updateGuaranteedPaymentsInSSOT}
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
              <Select value={filingStatus} onValueChange={(value: FilingStatus) => updateMaritalInSSOT(value)}>
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
                  setter={updateSpouseIncomeInSSOT}
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
            <Input
              label="Your Age"
              value={age}
              setter={updateAgeInSSOT}
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
              setter={updateTraditional401kInSSOT}
            />
            <Input
              label="Roth 401(k)"
              value={roth401k}
              setter={updateRoth401kInSSOT}
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
                  setter={updateSpouseAgeInSSOT}
                />
                <Input
                  label="Spouse Traditional 401(k)"
                  value={spouseTraditional401k}
                  setter={updateSpouseTraditional401kInSSOT}
                />
                <Input
                  label="Spouse Roth 401(k)"
                  value={spouseRoth401k}
                  setter={updateSpouseRoth401kInSSOT}
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
                Max: {fmtFull(maxHSA)}
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
        <div className="flex justify-center gap-4 pb-8">
          <Button size="lg" onClick={handleCalculate} className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculate 2026 Tax & Cash Flow
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleApplyToMainPlan}
            className="flex items-center gap-2"
            title="Save these values to your main retirement plan"
          >
            <Sparkles className="w-5 h-5" /> Apply to Main Plan
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
                                  {period.isDistributionPeriod && <span className="ml-1 text-emerald-600">●</span>}
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
                                    <span className="text-muted-foreground">—</span>
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

                            {/* PAYCHECK DEDUCTIONS SECTION */}
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
                            <tr className="hover:bg-muted/50 text-blue-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Roth 401(k)</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.roth401k ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-blue-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Defined Benefit Plan</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.definedBenefitPlan ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Health Insurance</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.healthInsurance ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Dental/Vision</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.dentalVision ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">HSA Contribution</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.hsa ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-purple-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Dependent Care FSA</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.dependentCareFSA ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
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

                            {/* POST-PAYMENT EXPENSES SECTION */}
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
                            <tr className="hover:bg-muted/50 text-orange-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Household Expenses</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.householdExpenses ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
                                </td>
                              ))}
                            </tr>
                            <tr className="hover:bg-muted/50 text-orange-600">
                              <td className="py-1 px-2 pl-4 sticky left-0 bg-background">Discretionary Budget</td>
                              {chunk.map((period) => (
                                <td key={period.periodNumber} className={`text-right py-1 px-2 border-l ${period.isDistributionPeriod ? 'bg-emerald-50 dark:bg-emerald-950/20' : ''}`}>
                                  -${(period.discretionaryBudget ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}
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
                    <strong>Social Security Cap Tracking:</strong> The SS wage base for 2026 is {fmtFull(SE_TAX_2026.SOCIAL_SECURITY_WAGE_BASE)}.
                    Social Security tax stops once you reach this threshold. The table shows remaining room in the "SS Cap" column.
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
        )}
      </main>
    </div>
  );
}
