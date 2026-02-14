"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import { Calculator, TrendingUp, ArrowLeft, Info } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
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
import { fmtFull } from "@/lib/utils";
import { METRIC_COLORS, TYPOGRAPHY } from "@/lib/designTokens";

// Shared components and hooks
import {
  IncomeCalculatorLayout,
  SectionCard,
} from "@/components/income/IncomeCalculatorLayout";
import {
  useScrollState,
  useCalculationState,
  useHousingState,
  useExpenseState,
  MONTHS,
  getPaychecksPerYear,
  adjustForWeekend,
  generatePaycheckDates,
  type FilingStatus,
  type PayFrequency,
} from "@/hooks/useIncomeCalculator";

// ============================================================================
// TYPES
// ============================================================================

interface PayEvent {
  date: Date;
  person: 'p1' | 'p2';
  checkNumberForPerson: number;
}

interface PaycheckResult {
  paycheckNum: number;
  date: string;
  personLabel: string;
  baseGross: number;
  bonus: number;
  totalGross: number;
  healthIns: number;
  depFSA: number;
  dental: number;
  vision: number;
  medFSA: number;
  totalPreTax: number;
  fitTaxable: number;
  fitBase: number;
  extraFIT: number;
  totalFIT: number;
  ss: number;
  totalMed: number;
  fixedExpenses: number;
  preInvRemainder: number;
  contribution401k: number;
  hysaContribution: number;
  brokerageContribution: number;
  ytdWages: number;
  ytd401k: number;
}

interface YearSummary {
  totalIncome: number;
  totalPreTax: number;
  totalFIT: number;
  totalFICA: number;
  total401k: number;
  totalHYSA: number;
  totalBrokerage: number;
  totalFixedExpenses: number;
  netTakeHome: number;
  effectiveTaxRate: number;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Income2026Page() {
  const { setImplied } = useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  // Route guard: check if PlanConfig has been meaningfully configured.
  // If fieldMetadata is empty, the user has not interacted with the calculator yet.
  const hasUserData = Object.keys(planConfig.fieldMetadata).length > 0;

  // Use shared hooks
  const scrollState = useScrollState();
  const calculationState = useCalculationState();
  const housingState = useHousingState();
  const expenseState = useExpenseState();

  // ============================================================================
  // DEFAULTS (module-level would cause SSR issues, so use a stable ref)
  // ============================================================================
  const DEFAULTS = React.useMemo(() => createDefaultPlanConfig(), []);

  // ============================================================================
  // DERIVED STATE FROM PLANCONFIG (SSOT reads)
  // ============================================================================

  const maritalStatus = planConfig.marital ?? DEFAULTS.marital;
  const p1BaseIncome = planConfig.primaryIncome ?? 0;
  const p2BaseIncome = planConfig.spouseIncome ?? 0;
  const p1Bonus = planConfig.eoyBonusAmount ?? 0;
  const p1BonusMonth = planConfig.eoyBonusMonth ?? "December";
  const p1FirstPayDate = planConfig.firstPayDate ?? "2026-01-15";
  const p1PreTax401k = planConfig.cPre1 ?? 0;
  const p1PostTaxRoth = planConfig.cPost1 ?? 0;
  const p2PreTax401k = planConfig.cPre2 ?? 0;
  const p2PostTaxRoth = planConfig.cPost2 ?? 0;
  const p1LifeInsuranceAnnual = planConfig.annualLifeInsuranceP1 ?? 0;
  const p2LifeInsuranceAnnual = planConfig.annualLifeInsuranceP2 ?? 0;

  // ============================================================================
  // PAGE-LOCAL STATE (not in PlanConfig)
  // ============================================================================

  // Person 1 page-local
  const [p1OvertimeMonthly, setP1OvertimeMonthly] = useState(0);
  const [p1PayFrequency, setP1PayFrequency] = useState<PayFrequency>("biweekly");

  // Person 1 Pre-tax Deductions (page-local)
  const [p1PreTaxHealthInsurance, setP1PreTaxHealthInsurance] = useState(0);
  const [p1PreTaxHSA, setP1PreTaxHSA] = useState(0);
  const [p1PreTaxFSA, setP1PreTaxFSA] = useState(0);

  // Person 2 page-local
  const [p2Bonus, setP2Bonus] = useState(0);
  const [p2BonusMonth, setP2BonusMonth] = useState("December");
  const [p2OvertimeMonthly, setP2OvertimeMonthly] = useState(0);
  const [p2PayFrequency, setP2PayFrequency] = useState<PayFrequency>("biweekly");
  const [p2FirstPayDate, setP2FirstPayDate] = useState("2026-01-15");

  // Person 2 Pre-tax Deductions (page-local)
  const [p2PreTaxHealthInsurance, setP2PreTaxHealthInsurance] = useState(0);
  const [p2PreTaxHSA, setP2PreTaxHSA] = useState(0);
  const [p2PreTaxFSA, setP2PreTaxFSA] = useState(0);

  // Tax Settings (page-local)
  const [federalWithholdingExtra] = useState(0);
  const [stateWithholdingExtra] = useState(0);

  // Other deductions (page-local)
  const [p1DisabilityInsurance] = useState(0);

  // Results state
  const [results, setResults] = useState<{
    paychecks: PaycheckResult[];
    yearSummary: YearSummary;
  } | null>(null);

  // AI Onboarding state
  const [isFromAIOnboarding, setIsFromAIOnboarding] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);

  const isMarried = maritalStatus === "married";

  // ============================================================================
  // HANDLERS - direct PlanConfig updates (no sync functions needed)
  // ============================================================================

  const handleMaritalStatusChange = useCallback((newStatus: FilingStatus) => {
    updatePlanConfig({ marital: newStatus }, 'user-entered');
    if (newStatus === 'single') {
      updatePlanConfig({
        spouseIncome: 0, cPre2: 0, cPost2: 0,
        annualLifeInsuranceP2: 0
      }, 'user-entered');
      // Also reset page-local spouse state
      setP2Bonus(0);
      setP2BonusMonth("December");
      setP2OvertimeMonthly(0);
      setP2PayFrequency("biweekly");
      setP2FirstPayDate("2026-01-15");
      setP2PreTaxHealthInsurance(0);
      setP2PreTaxHSA(0);
      setP2PreTaxFSA(0);
    }
  }, [updatePlanConfig]);

  // ============================================================================
  // EFFECTS - Detect AI onboarding (no pre-population needed)
  // ============================================================================

  useEffect(() => {
    const hasAISuggestedFields = planConfig.fieldMetadata &&
      Object.values(planConfig.fieldMetadata).some((meta: { source?: string }) => meta?.source === 'ai-suggested');
    if (hasAISuggestedFields) {
      setIsFromAIOnboarding(true);
      setShowAIBanner(true);
    }

    // Legacy sharedIncomeData
    if (!hasAISuggestedFields && hasRecentIncomeData()) {
      const sharedData = loadSharedIncomeData();
      if (sharedData && sharedData.source === 'ai-onboarding') {
        if (!planConfig.primaryIncome) updatePlanConfig({ primaryIncome: sharedData.primaryIncome }, 'imported');
        if (!planConfig.spouseIncome && sharedData.spouseIncome) updatePlanConfig({ spouseIncome: sharedData.spouseIncome }, 'imported');
        setIsFromAIOnboarding(true);
        setShowAIBanner(true);
      }
    }
  }, [planConfig, updatePlanConfig]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleClearAIData = useCallback(() => {
    setIsFromAIOnboarding(false);
    setShowAIBanner(false);
    updatePlanConfig({ marital: 'single', primaryIncome: 0, spouseIncome: 0 }, 'user-entered');
  }, [updatePlanConfig]);

  const handleApplyToMainPlan = useCallback(() => {
    const effectiveTaxRate = results?.yearSummary?.effectiveTaxRate ?? 0;

    // Income fields are already in PlanConfig; push housing/expense fields
    updatePlanConfig({
      monthlyMortgageRent: housingState.housingType === 'rent' ? housingState.rentPayment : housingState.mortgagePayment,
      monthlyUtilities: expenseState.monthlyUtilities,
      monthlyHealthcareP1: expenseState.monthlyHealthcare,
      monthlyOtherExpenses: expenseState.monthlyOtherExpenses,
    }, 'user-entered');

    console.log('[INCOME-2026] Calculated effective tax rate:', (effectiveTaxRate * 100).toFixed(1) + '%');
    toast.success('Your 2026 income data has been applied to your main retirement plan!');
  }, [results, housingState, expenseState, updatePlanConfig]);

  // ============================================================================
  // CALCULATION LOGIC
  // ============================================================================

  const handleCalculate = useCallback(() => {
    console.log("Calculating 2026 unified forecast...");
    calculationState.setIsCalculating(true);
    calculationState.setCalculationError(null);
    calculationState.setIsDirty(false);

    try {
      // Input validation
      if (p1BaseIncome < 0 || p2BaseIncome < 0) throw new Error("Base income cannot be negative");
      if (p1PreTax401k < 0 || p2PreTax401k < 0) throw new Error("401(k) contributions cannot be negative");
      if (p1PreTax401k > 24500) throw new Error("Your 401(k) contribution exceeds the 2026 limit of $24,500");
      if (p2PreTax401k > 24500) throw new Error("Spouse 401(k) contribution exceeds the 2026 limit of $24,500");
      if (p1PreTaxHSA < 0 || p2PreTaxHSA < 0) throw new Error("HSA contributions cannot be negative");
      if (p1PreTaxFSA < 0 || p2PreTaxFSA < 0) throw new Error("FSA contributions cannot be negative");
      if (p1PreTaxHealthInsurance < 0 || p2PreTaxHealthInsurance < 0) throw new Error("Health insurance premiums cannot be negative");
      if (isMarried && p1BaseIncome === 0 && p2BaseIncome === 0) throw new Error("At least one person must have income");
      if (!isMarried && p1BaseIncome === 0) throw new Error("Please enter your base income");
      if (housingState.mortgagePayment < 0 || housingState.rentPayment < 0) throw new Error("Housing payments cannot be negative");
      if (expenseState.householdExpenses < 0 || expenseState.discretionarySpending < 0) throw new Error("Expenses cannot be negative");

      const p1Date = new Date(p1FirstPayDate);
      const p2Date = new Date(p2FirstPayDate);
      if (isNaN(p1Date.getTime())) throw new Error("Invalid first pay date for you");
      if (isMarried && p2BaseIncome > 0 && isNaN(p2Date.getTime())) throw new Error("Invalid first pay date for spouse");
      if (p1Date.getFullYear() !== 2026) throw new Error("First pay date must be in 2026");
      if (isMarried && p2BaseIncome > 0 && p2Date.getFullYear() !== 2026) throw new Error("Spouse first pay date must be in 2026");

      // Constants
      const STANDARD_DEDUCTION = isMarried ? 30000 : 15000;
      const SS_WAGE_BASE = 184500;
      const MEDICARE_THRESHOLD = 200000;
      const MAX_401K = 24500;
      const MAX_DEP_FSA = 5000;
      const MAX_MED_FSA = 3200;

      const taxBrackets = isMarried
        ? [
            { limit: 23850, rate: 0.10 },
            { limit: 96950, rate: 0.12 },
            { limit: 206700, rate: 0.22 },
            { limit: 394600, rate: 0.24 },
            { limit: 501050, rate: 0.32 },
            { limit: 751600, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
          ]
        : [
            { limit: 11925, rate: 0.10 },
            { limit: 48475, rate: 0.12 },
            { limit: 103350, rate: 0.22 },
            { limit: 197300, rate: 0.24 },
            { limit: 250525, rate: 0.32 },
            { limit: 626350, rate: 0.35 },
            { limit: Infinity, rate: 0.37 }
          ];

      // Generate pay dates
      const p1Dates = generatePaycheckDates(p1PayFrequency, p1FirstPayDate, 2026);
      const p2Dates = (isMarried && p2BaseIncome > 0) ? generatePaycheckDates(p2PayFrequency, p2FirstPayDate, 2026) : [];

      // Create unified timeline
      const events: PayEvent[] = [];
      p1Dates.forEach((d, i) => events.push({ date: d, person: 'p1', checkNumberForPerson: i + 1 }));
      p2Dates.forEach((d, i) => events.push({ date: d, person: 'p2', checkNumberForPerson: i + 1 }));
      events.sort((a, b) => a.date.getTime() - b.date.getTime());

      // Initialize trackers
      let p1YtdWages = 0, p2YtdWages = 0;
      let p1Ytd401k = 0, p2Ytd401k = 0;
      let p1YtdDepFSA = 0, p2YtdDepFSA = 0;
      let p1YtdMedFSA = 0, p2YtdMedFSA = 0;
      let householdYtdWages = 0;

      const paychecks: PaycheckResult[] = [];

      const p1PayPerCheck = p1BaseIncome / Math.max(1, p1Dates.length);
      const p2PayPerCheck = p2BaseIncome / Math.max(1, p2Dates.length);

      const totalChecks = events.length;
      const eoyPropertyExpenses = (housingState.housingType === "own")
        ? (housingState.propertyTaxAnnual + housingState.homeInsuranceAnnual + housingState.floodInsuranceAnnual)
        : 0;

      const totalAnnualFixed = (
        (housingState.housingType === "rent" ? housingState.rentPayment : housingState.mortgagePayment) * 12 +
        expenseState.monthlyUtilities * 12 +
        expenseState.monthlyHealthcare * 12 +
        expenseState.monthlyOtherExpenses * 12 +
        expenseState.householdExpenses * 12 +
        expenseState.discretionarySpending * 12 +
        expenseState.childcareCosts * 12 +
        p1LifeInsuranceAnnual +
        (isMarried ? p2LifeInsuranceAnnual : 0) +
        eoyPropertyExpenses
      );

      const fixedExpensePerCheck = totalAnnualFixed / Math.max(1, totalChecks);

      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const person = event.person;
        const paycheckDate = event.date;
        const monthOfPaycheck = paycheckDate.getMonth();

        let currentBaseGross = 0;
        let currentBonus = 0;

        if (person === 'p1') {
          currentBaseGross = p1PayPerCheck;
          const p1BonusMonthIdx = MONTHS.indexOf(p1BonusMonth);
          const isFirstCheckOfMonth = event.checkNumberForPerson === 1 ||
            (event.checkNumberForPerson > 1 && p1Dates[event.checkNumberForPerson - 2]?.getMonth() !== monthOfPaycheck);
          if (p1BonusMonthIdx === monthOfPaycheck && isFirstCheckOfMonth) {
            currentBonus = p1Bonus;
          }
        } else {
          currentBaseGross = p2PayPerCheck;
          const p2BonusMonthIdx = MONTHS.indexOf(p2BonusMonth);
          const isFirstCheckOfMonth = event.checkNumberForPerson === 1 ||
            (event.checkNumberForPerson > 1 && p2Dates[event.checkNumberForPerson - 2]?.getMonth() !== monthOfPaycheck);
          if (p2BonusMonthIdx === monthOfPaycheck && isFirstCheckOfMonth) {
            currentBonus = p2Bonus;
          }
        }

        const totalGross = currentBaseGross + currentBonus;

        let healthIns = 0, depFSA = 0, medFSA = 0, dental = 0, vision = 0;
        const numChecksForPerson = person === 'p1' ? p1Dates.length : p2Dates.length;

        if (person === 'p1') {
          healthIns = p1PreTaxHealthInsurance / numChecksForPerson;
          if (p1PreTaxFSA > 0) {
            const ideal = Math.min(p1PreTaxFSA, MAX_DEP_FSA) / numChecksForPerson;
            depFSA = Math.min(ideal, MAX_DEP_FSA - p1YtdDepFSA);
          }
          if (p1PreTaxHSA > 0) {
            const ideal = Math.min(p1PreTaxHSA, MAX_MED_FSA) / numChecksForPerson;
            medFSA = Math.min(ideal, MAX_MED_FSA - p1YtdMedFSA);
          }
          dental = (event.checkNumberForPerson % 2 !== 0) ? 49.59 : 0;
          vision = (event.checkNumberForPerson % 2 !== 0) ? 19.03 : 0;
        } else {
          healthIns = p2PreTaxHealthInsurance / numChecksForPerson;
          if (p2PreTaxFSA > 0) {
            const ideal = Math.min(p2PreTaxFSA, MAX_DEP_FSA) / numChecksForPerson;
            depFSA = Math.min(ideal, MAX_DEP_FSA - p2YtdDepFSA);
          }
          if (p2PreTaxHSA > 0) {
            const ideal = Math.min(p2PreTaxHSA, MAX_MED_FSA) / numChecksForPerson;
            medFSA = Math.min(ideal, MAX_MED_FSA - p2YtdMedFSA);
          }
        }

        const totalPreTax = healthIns + depFSA + medFSA + dental + vision;

        const fitTaxable = totalGross - totalPreTax;
        const annualizer = getPaychecksPerYear(person === 'p1' ? p1PayFrequency : p2PayFrequency);
        const annualizedTaxable = (fitTaxable * annualizer) - STANDARD_DEDUCTION;

        let fitAnnual = 0;
        let remainingInc = annualizedTaxable;
        let prevLim = 0;

        for (const bracket of taxBrackets) {
          if (remainingInc <= 0) break;
          const taxableInBracket = Math.min(remainingInc, bracket.limit - prevLim);
          fitAnnual += taxableInBracket * bracket.rate;
          remainingInc -= taxableInBracket;
          prevLim = bracket.limit;
        }

        const fitBase = Math.max(0, fitAnnual / annualizer);
        const totalFIT = fitBase + federalWithholdingExtra + stateWithholdingExtra;

        const currentYtdWages = person === 'p1' ? p1YtdWages : p2YtdWages;

        let ssTax = 0;
        if (currentYtdWages < SS_WAGE_BASE) {
          const taxableSS = Math.min(totalGross, SS_WAGE_BASE - currentYtdWages);
          ssTax = taxableSS * 0.062;
        }

        let medTax = totalGross * 0.0145;
        if (householdYtdWages + totalGross > MEDICARE_THRESHOLD) {
          const amountAlreadyOver = Math.max(0, householdYtdWages - MEDICARE_THRESHOLD);
          const amountOfCheckOver = Math.max(0, (householdYtdWages + totalGross) - MEDICARE_THRESHOLD - amountAlreadyOver);
          medTax += amountOfCheckOver * 0.009;
        }

        const userTarget401k = person === 'p1' ? p1PreTax401k : p2PreTax401k;
        const personYtd401k = person === 'p1' ? p1Ytd401k : p2Ytd401k;

        let contribution401k = 0;
        const estTotalIncome = (person === 'p1' ? (p1BaseIncome + p1Bonus) : (p2BaseIncome + p2Bonus));
        const contributionRate = estTotalIncome > 0 ? (userTarget401k / estTotalIncome) : 0;
        contribution401k = totalGross * contributionRate;

        if (personYtd401k + contribution401k > MAX_401K) {
          contribution401k = Math.max(0, MAX_401K - personYtd401k);
        }

        const preInvRemainder = totalGross - totalPreTax - totalFIT - ssTax - medTax - fixedExpensePerCheck;
        const brokerageContribution = Math.max(0, preInvRemainder - contribution401k);

        if (person === 'p1') {
          p1YtdWages += totalGross;
          p1Ytd401k += contribution401k;
          p1YtdDepFSA += depFSA;
          p1YtdMedFSA += medFSA;
        } else {
          p2YtdWages += totalGross;
          p2Ytd401k += contribution401k;
          p2YtdDepFSA += depFSA;
          p2YtdMedFSA += medFSA;
        }
        householdYtdWages += totalGross;

        paychecks.push({
          paycheckNum: i + 1,
          date: paycheckDate.toISOString().split('T')[0],
          personLabel: person === 'p1' ? 'You' : 'Spouse',
          baseGross: currentBaseGross,
          bonus: currentBonus,
          totalGross,
          healthIns,
          depFSA,
          dental,
          vision,
          medFSA,
          totalPreTax,
          fitTaxable,
          fitBase,
          extraFIT: federalWithholdingExtra + stateWithholdingExtra,
          totalFIT,
          ss: ssTax,
          totalMed: medTax,
          fixedExpenses: fixedExpensePerCheck,
          preInvRemainder,
          contribution401k,
          hysaContribution: 0,
          brokerageContribution,
          ytdWages: householdYtdWages,
          ytd401k: p1Ytd401k + p2Ytd401k
        });
      }

      const totalIncome = paychecks.reduce((sum, p) => sum + p.totalGross, 0);
      const totalFIT = paychecks.reduce((sum, p) => sum + p.totalFIT, 0);
      const totalFICA = paychecks.reduce((sum, p) => sum + p.ss + p.totalMed, 0);
      const totalPreTax = paychecks.reduce((sum, p) => sum + p.totalPreTax, 0);
      const totalFixedExpenses = paychecks.reduce((sum, p) => sum + p.fixedExpenses, 0);
      const total401k = paychecks.reduce((sum, p) => sum + p.contribution401k, 0);
      const totalBrokerage = paychecks.reduce((sum, p) => sum + p.brokerageContribution, 0);

      const totalPostTaxDeductions =
        p1PostTaxRoth +
        (isMarried ? p2PostTaxRoth : 0) +
        p1DisabilityInsurance +
        p1LifeInsuranceAnnual;

      const netTakeHome = totalIncome - totalPreTax - totalFIT - totalFICA - totalFixedExpenses - total401k - totalBrokerage - totalPostTaxDeductions;

      setResults({
        paychecks,
        yearSummary: {
          totalIncome,
          totalPreTax,
          totalFIT,
          totalFICA,
          total401k,
          totalHYSA: 0,
          totalBrokerage,
          totalFixedExpenses,
          netTakeHome,
          effectiveTaxRate: totalIncome > 0 ? (totalFIT + totalFICA) / totalIncome : 0
        }
      });

      setImplied({
        grossIncome: totalIncome,
        taxes: totalFIT + totalFICA,
        housing: (housingState.housingType === "own" ? housingState.mortgagePayment : housingState.rentPayment) * 12,
        discretionary: expenseState.discretionarySpending * 12,
        contributions401k: total401k,
        contributionsRoth: p1PostTaxRoth + (isMarried ? p2PostTaxRoth : 0),
        contributionsTaxable: totalBrokerage,
        maritalStatus: maritalStatus,
      });

      scrollState.scrollToResults();
      calculationState.setIsCalculating(false);
    } catch (error) {
      console.error('[INCOME-2026] Calculation error:', error);
      calculationState.setCalculationError(error instanceof Error ? error.message : 'An unexpected error occurred during calculation. Please check your inputs and try again.');
      setResults(null);
      calculationState.setIsCalculating(false);
    }
  }, [
    p1BaseIncome, p2BaseIncome, p1PreTax401k, p2PreTax401k, p1PreTaxHSA, p2PreTaxHSA,
    p1PreTaxFSA, p2PreTaxFSA, p1PreTaxHealthInsurance, p2PreTaxHealthInsurance,
    isMarried, housingState, expenseState, p1Bonus, p2Bonus, p1BonusMonth, p2BonusMonth,
    p1FirstPayDate, p2FirstPayDate, p1PayFrequency, p2PayFrequency,
    p1LifeInsuranceAnnual, p2LifeInsuranceAnnual, p1PostTaxRoth, p2PostTaxRoth,
    p1DisabilityInsurance, federalWithholdingExtra, stateWithholdingExtra, maritalStatus,
    calculationState, scrollState, setImplied
  ]);

  // ============================================================================
  // HELPER COMPONENTS
  // ============================================================================

  const DualInputField = ({ label, value1, onChange1, value2, onChange2, defaultValue = 0 }: {
    label: string;
    value1: number;
    onChange1: (v: number) => void;
    value2: number;
    onChange2: (v: number) => void;
    defaultValue?: number;
  }) => {
    const wrappedOnChange1 = (val: number) => { onChange1(val); calculationState.handleInputChange(); };
    const wrappedOnChange2 = (val: number) => { onChange2(val); calculationState.handleInputChange(); };
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <Input label={`${label} (Your)`} value={value1} setter={wrappedOnChange1} defaultValue={defaultValue} onInputChange={calculationState.handleInputChange} />
        {isMarried && (
          <Input label={`${label} (Spouse)`} value={value2} setter={wrappedOnChange2} defaultValue={defaultValue} onInputChange={calculationState.handleInputChange} />
        )}
      </div>
    );
  };

  const DualSelectField = ({ label, idPrefix, value1, onChange1, value2, onChange2, options }: {
    label: string;
    idPrefix: string;
    value1: string;
    onChange1: (v: string) => void;
    value2: string;
    onChange2: (v: string) => void;
    options: string[];
  }) => {
    const wrappedOnChange1 = (val: string) => { onChange1(val); calculationState.handleInputChange(); };
    const wrappedOnChange2 = (val: string) => { onChange2(val); calculationState.handleInputChange(); };
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
          <select
            id={`${idPrefix}-your`}
            value={value1}
            onChange={(e) => wrappedOnChange1(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        {isMarried && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-spouse`}>{label} (Spouse)</Label>
            <select
              id={`${idPrefix}-spouse`}
              value={value2}
              onChange={(e) => wrappedOnChange2(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>
        )}
      </div>
    );
  };

  const DualDateField = ({ label, idPrefix, value1, onChange1, value2, onChange2 }: {
    label: string;
    idPrefix: string;
    value1: string;
    onChange1: (v: string) => void;
    value2: string;
    onChange2: (v: string) => void;
  }) => {
    const wrappedOnChange1 = (val: string) => { onChange1(val); calculationState.handleInputChange(); };
    const wrappedOnChange2 = (val: string) => { onChange2(val); calculationState.handleInputChange(); };
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
          <UIInput id={`${idPrefix}-your`} type="date" value={value1} onChange={(e) => wrappedOnChange1(e.target.value)} className="w-full" />
        </div>
        {isMarried && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-spouse`}>{label} (Spouse)</Label>
            <UIInput id={`${idPrefix}-spouse`} type="date" value={value2} onChange={(e) => wrappedOnChange2(e.target.value)} className="w-full" />
          </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // RESULTS SECTION
  // ============================================================================

  const renderResults = () => {
    if (!results || !results.paychecks) return null;

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return (
      <div id="results-section" className="space-y-6 scroll-mt-20">
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> 2026 Annual Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className={`${METRIC_COLORS.positive.bg} p-4 rounded-lg border ${METRIC_COLORS.positive.border}`}>
                <div className={`${TYPOGRAPHY.metricLabel} ${METRIC_COLORS.positive.text}`}>Total Income</div>
                <div className={TYPOGRAPHY.metricSmall}>{fmtFull(results.yearSummary.totalIncome ?? 0)}</div>
              </div>
              <div className={`${METRIC_COLORS.negative.bg} p-4 rounded-lg border ${METRIC_COLORS.negative.border}`}>
                <div className={`${TYPOGRAPHY.metricLabel} ${METRIC_COLORS.negative.text}`}>Total Tax (Fed+FICA)</div>
                <div className={TYPOGRAPHY.metricSmall}>{fmtFull((results.yearSummary.totalFIT ?? 0) + (results.yearSummary.totalFICA ?? 0))}</div>
              </div>
              <div className={`${METRIC_COLORS.neutral.bg} p-4 rounded-lg border ${METRIC_COLORS.neutral.border}`}>
                <div className={`${TYPOGRAPHY.metricLabel} ${METRIC_COLORS.neutral.text}`}>401(k) Invested</div>
                <div className={TYPOGRAPHY.metricSmall}>{fmtFull(results.yearSummary.total401k ?? 0)}</div>
              </div>
              <div className={`${METRIC_COLORS.success.bg} p-4 rounded-lg border ${METRIC_COLORS.success.border}`}>
                <div className={`${TYPOGRAPHY.metricLabel} ${METRIC_COLORS.success.text}`}>Net Cash Flow</div>
                <div className={TYPOGRAPHY.metricSmall}>{fmtFull(results.yearSummary.netTakeHome ?? 0)}</div>
              </div>
            </div>
            <div className={`mt-3 ${TYPOGRAPHY.bodyMuted} text-center`}>
              Effective Tax Rate: {((results.yearSummary.effectiveTaxRate ?? 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Monthly Budget Overview */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Budget Overview</CardTitle>
            <CardDescription>Estimated monthly income and expenses based on your inputs.</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const monthlyGross = results.yearSummary.totalIncome / 12;
              const monthlyTax = (results.yearSummary.totalFIT + results.yearSummary.totalFICA) / 12;
              const monthly401k = results.yearSummary.total401k / 12;
              const monthlyPreTax = results.yearSummary.totalPreTax / 12;
              const monthlyHousing = housingState.housingType === "rent" ? housingState.rentPayment : housingState.mortgagePayment;
              const monthlyPropertyCosts = housingState.housingType === "own" ? (housingState.propertyTaxAnnual + housingState.homeInsuranceAnnual + housingState.floodInsuranceAnnual) / 12 : 0;
              const monthlyNet = monthlyGross - monthlyTax - monthly401k - monthlyPreTax - monthlyHousing - monthlyPropertyCosts - expenseState.monthlyUtilities - expenseState.monthlyHealthcare - expenseState.householdExpenses - expenseState.discretionarySpending - expenseState.childcareCosts - expenseState.monthlyOtherExpenses;

              const budgetLines = [
                { label: 'Gross Monthly Income', amount: monthlyGross, color: 'text-green-700 dark:text-green-400', bold: true },
                { label: 'Federal Tax + FICA', amount: -monthlyTax, color: 'text-red-600 dark:text-red-400' },
                { label: 'Pre-Tax Deductions', amount: -monthlyPreTax, color: 'text-muted-foreground' },
                { label: '401(k) Contributions', amount: -monthly401k, color: 'text-blue-600 dark:text-blue-400' },
                { label: `Housing (${housingState.housingType === 'rent' ? 'Rent' : 'Mortgage'})`, amount: -monthlyHousing, color: 'text-orange-600 dark:text-orange-400' },
                ...(housingState.housingType === 'own' && monthlyPropertyCosts > 0 ? [{ label: 'Property Tax & Insurance', amount: -monthlyPropertyCosts, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.monthlyUtilities > 0 ? [{ label: 'Utilities', amount: -expenseState.monthlyUtilities, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.monthlyHealthcare > 0 ? [{ label: 'Healthcare', amount: -expenseState.monthlyHealthcare, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.householdExpenses > 0 ? [{ label: 'Household Expenses', amount: -expenseState.householdExpenses, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.discretionarySpending > 0 ? [{ label: 'Discretionary', amount: -expenseState.discretionarySpending, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.childcareCosts > 0 ? [{ label: 'Childcare', amount: -expenseState.childcareCosts, color: 'text-orange-600 dark:text-orange-400' }] : []),
                ...(expenseState.monthlyOtherExpenses > 0 ? [{ label: 'Other Expenses', amount: -expenseState.monthlyOtherExpenses, color: 'text-orange-600 dark:text-orange-400' }] : []),
              ];

              return (
                <div className="max-w-lg">
                  <div className="space-y-2">
                    {budgetLines.map((line, i) => (
                      <div key={i} className={`flex justify-between py-1 ${line.bold ? 'font-bold' : ''}`}>
                        <span>{line.label}</span>
                        <span className={line.color}>{line.amount >= 0 ? fmtFull(line.amount) : '-' + fmtFull(Math.abs(line.amount))}</span>
                      </div>
                    ))}
                  </div>
                  <Separator className="my-3" />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Estimated Monthly Surplus</span>
                    <span className={monthlyNet >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                      {monthlyNet >= 0 ? fmtFull(monthlyNet) : '-' + fmtFull(Math.abs(monthlyNet))}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">Available for savings, investments, or additional spending.</p>
                </div>
              );
            })()}
          </CardContent>
        </Card>

        {/* Monthly Cash Flow Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Cash Flow Summary</CardTitle>
            <CardDescription>Consolidated view of {results.paychecks.length} paychecks aggregated by month.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              {(() => {
                const monthlyData = monthNames.map((name, idx) => {
                  const monthPaychecks = results.paychecks.filter((p: PaycheckResult) => new Date(p.date).getMonth() === idx);
                  return {
                    month: name,
                    numChecks: monthPaychecks.length,
                    gross: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.totalGross, 0),
                    preTax: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.totalPreTax, 0),
                    fedTax: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.totalFIT, 0),
                    fica: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.ss + p.totalMed, 0),
                    k401: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.contribution401k, 0),
                    fixedExp: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.fixedExpenses, 0),
                    net: monthPaychecks.reduce((s: number, p: PaycheckResult) => s + p.brokerageContribution, 0),
                  };
                }).filter(m => m.numChecks > 0);

                const fmtNeg = (n: number) => '-' + fmtFull(Math.abs(n));

                return (
                  <table className="w-full text-sm border-collapse">
                    <thead className="sticky top-0 bg-background z-10">
                      <tr className="border-b-2">
                        <th className="text-left py-2 px-3 font-semibold">Month</th>
                        <th className="text-right py-2 px-3 font-semibold">Gross Income</th>
                        <th className="text-right py-2 px-3 font-semibold">Pre-Tax</th>
                        <th className="text-right py-2 px-3 font-semibold">Fed Tax</th>
                        <th className="text-right py-2 px-3 font-semibold">FICA</th>
                        <th className="text-right py-2 px-3 font-semibold">401(k)</th>
                        <th className="text-right py-2 px-3 font-semibold">Expenses</th>
                        <th className="text-right py-2 px-3 font-semibold">Net Cash</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyData.map((m) => (
                        <tr key={m.month} className="hover:bg-muted/50 border-b">
                          <td className="py-2 px-3 font-medium">{m.month}</td>
                          <td className="text-right py-2 px-3 text-green-700 dark:text-green-400">{fmtFull(m.gross)}</td>
                          <td className="text-right py-2 px-3 text-muted-foreground">{m.preTax > 0 ? fmtNeg(m.preTax) : '-'}</td>
                          <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{fmtNeg(m.fedTax)}</td>
                          <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{fmtNeg(m.fica)}</td>
                          <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400">{m.k401 > 0 ? fmtNeg(m.k401) : '-'}</td>
                          <td className="text-right py-2 px-3 text-orange-600 dark:text-orange-400">{fmtNeg(m.fixedExp)}</td>
                          <td className="text-right py-2 px-3 font-bold">{fmtFull(m.net)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 font-bold bg-muted/30">
                        <td className="py-2 px-3">Total</td>
                        <td className="text-right py-2 px-3 text-green-700 dark:text-green-400">{fmtFull(monthlyData.reduce((s, m) => s + m.gross, 0))}</td>
                        <td className="text-right py-2 px-3 text-muted-foreground">{fmtNeg(monthlyData.reduce((s, m) => s + m.preTax, 0))}</td>
                        <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{fmtNeg(monthlyData.reduce((s, m) => s + m.fedTax, 0))}</td>
                        <td className="text-right py-2 px-3 text-red-600 dark:text-red-400">{fmtNeg(monthlyData.reduce((s, m) => s + m.fica, 0))}</td>
                        <td className="text-right py-2 px-3 text-blue-600 dark:text-blue-400">{fmtNeg(monthlyData.reduce((s, m) => s + m.k401, 0))}</td>
                        <td className="text-right py-2 px-3 text-orange-600 dark:text-orange-400">{fmtNeg(monthlyData.reduce((s, m) => s + m.fixedExp, 0))}</td>
                        <td className="text-right py-2 px-3">{fmtFull(monthlyData.reduce((s, m) => s + m.net, 0))}</td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  // Route guard: show setup prompt if user hasn't configured their plan yet
  if (!hasUserData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
              Setup Required
            </CardTitle>
            <CardDescription>
              Please complete the main calculator setup first so your income,
              age, and contribution data are available for this planner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/">
              <Button
                className="min-h-[44px] w-full flex items-center gap-2"
                aria-label="Go back to the main retirement calculator"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                Go to Calculator Setup
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <IncomeCalculatorLayout
      title="2026 Income & Cash Flow Planner"
      cardTitle="Comprehensive Income Modeling"
      cardDescription="Model your full 2026 income stream with detailed deductions, cash flow buckets, and wealth accumulation tracking."
      cardIcon={<Calculator className="w-5 h-5" />}
      aiOnboarding={{
        isFromAIOnboarding,
        showAIBanner,
        onClearAIData: handleClearAIData,
        onDismissBanner: () => setShowAIBanner(false),
        bannerDescription: "Your income, housing, and estimated monthly expenses have been pre-filled from your onboarding conversation. Review and edit any values below, then calculate to see your 2026 projections.",
      }}
      calculation={{
        isDirty: calculationState.isDirty,
        isCalculating: calculationState.isCalculating,
        error: calculationState.calculationError,
        hasResults: results !== null,
        onCalculate: handleCalculate,
        calculateButtonText: "Calculate 2026 Projections",
        calculateButtonIcon: <TrendingUp className="w-5 h-5" />,
      }}
      onApplyToMainPlan={handleApplyToMainPlan}
      quickNavLinks={[
        { label: "Household Setup", targetId: "household-setup" },
        { label: "Income Details", targetId: "income-section" },
        { label: "Housing & Expenses", targetId: "housing-section" },
        { label: "Results", targetId: "results-section" },
      ]}
      backToTop={{
        showButton: scrollState.showBackToTop,
        onScrollToTop: scrollState.scrollToTop,
      }}
      resultsSection={renderResults()}
    >
      {/* Household Setup */}
      <SectionCard id="household-setup" title="Household Setup">
        <div className="space-y-2 max-w-xs">
          <Label htmlFor="marital-status">Marital Status</Label>
          <Select value={maritalStatus} onValueChange={(value: FilingStatus) => { handleMaritalStatusChange(value); calculationState.handleInputChange(); }}>
            <SelectTrigger id="marital-status"><SelectValue placeholder="Select marital status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single</SelectItem>
              <SelectItem value="married">Married</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </SectionCard>

      {/* Income Details */}
      <SectionCard
        id="income-section"
        title={isMarried ? "YOUR INCOME" : "INCOME DETAILS"}
        description={isMarried ? "Income details for you and your spouse" : "Your income details"}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income Sources</h4>
            <div className="space-y-4">
              <DualInputField label="Base Annual Salary" value1={p1BaseIncome} onChange1={(v) => updatePlanConfig({ primaryIncome: v }, 'user-entered')} value2={p2BaseIncome} onChange2={(v) => updatePlanConfig({ spouseIncome: v }, 'user-entered')} />
              <DualInputField label="Annual Bonus" value1={p1Bonus} onChange1={(v) => updatePlanConfig({ eoyBonusAmount: v }, 'user-entered')} value2={p2Bonus} onChange2={setP2Bonus} />
              <DualSelectField label="Bonus Payment Month" idPrefix="bonus-month" value1={p1BonusMonth} onChange1={(v) => updatePlanConfig({ eoyBonusMonth: v }, 'user-entered')} value2={p2BonusMonth} onChange2={setP2BonusMonth} options={MONTHS.slice(0, 12)} />
              <DualInputField label="Estimated Monthly Overtime" value1={p1OvertimeMonthly} onChange1={setP1OvertimeMonthly} value2={p2OvertimeMonthly} onChange2={setP2OvertimeMonthly} />
              <DualSelectField label="Pay Frequency" idPrefix="pay-frequency" value1={p1PayFrequency} onChange1={(v) => setP1PayFrequency(v as PayFrequency)} value2={p2PayFrequency} onChange2={(v) => setP2PayFrequency(v as PayFrequency)} options={["biweekly", "semimonthly", "monthly", "weekly"]} />
              <DualDateField label="First Pay Date" idPrefix="first-pay-date" value1={p1FirstPayDate} onChange1={(v) => updatePlanConfig({ firstPayDate: v }, 'user-entered')} value2={p2FirstPayDate} onChange2={setP2FirstPayDate} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Annual Pre-Tax Deductions</h4>
            <div className="space-y-4">
              <DualInputField label="401(k) Contribution (Annual)" value1={p1PreTax401k} onChange1={(v) => updatePlanConfig({ cPre1: v }, 'user-entered')} value2={p2PreTax401k} onChange2={(v) => updatePlanConfig({ cPre2: v }, 'user-entered')} />
              <DualInputField label="Health Insurance Premium" value1={p1PreTaxHealthInsurance} onChange1={setP1PreTaxHealthInsurance} value2={p2PreTaxHealthInsurance} onChange2={setP2PreTaxHealthInsurance} />
              <DualInputField label="HSA Contribution" value1={p1PreTaxHSA} onChange1={setP1PreTaxHSA} value2={p2PreTaxHSA} onChange2={setP2PreTaxHSA} />
              <DualInputField label="FSA Contribution" value1={p1PreTaxFSA} onChange1={setP1PreTaxFSA} value2={p2PreTaxFSA} onChange2={setP2PreTaxFSA} />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Post-Tax Retirement Contributions</h4>
            <div className="space-y-4">
              <DualInputField label="Roth IRA/401(k) Contribution (Annual)" value1={p1PostTaxRoth} onChange1={(v) => updatePlanConfig({ cPost1: v }, 'user-entered')} value2={p2PostTaxRoth} onChange2={(v) => updatePlanConfig({ cPost2: v }, 'user-entered')} />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Housing & Monthly Expenses */}
      <SectionCard
        id="housing-section"
        title="Housing & Monthly Expenses"
        description="Monthly costs populated from your onboarding wizard. Edit any values below."
      >
        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Housing</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="housing-type">Housing Type</Label>
                <Select value={housingState.housingType} onValueChange={(value: "rent" | "own") => { housingState.setHousingType(value); calculationState.handleInputChange(); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="rent">Rent</SelectItem><SelectItem value="own">Own</SelectItem></SelectContent>
                </Select>
              </div>
              {housingState.housingType === "rent" ? (
                <Input label="Monthly Rent" value={housingState.rentPayment} setter={(v) => { housingState.setRentPayment(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              ) : (
                <Input label="Monthly Mortgage" value={housingState.mortgagePayment} setter={(v) => { housingState.updateMortgageInSSOT(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              )}
              {housingState.housingType === "own" && (
                <>
                  <Input label="Property Tax (Annual)" value={housingState.propertyTaxAnnual} setter={(v) => { housingState.setPropertyTaxAnnual(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
                  <Input label="Home Insurance (Annual)" value={housingState.homeInsuranceAnnual} setter={(v) => { housingState.setHomeInsuranceAnnual(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
                  <Input label="Flood Insurance (Annual)" value={housingState.floodInsuranceAnnual} setter={(v) => { housingState.setFloodInsuranceAnnual(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
                </>
              )}
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Monthly Bills & Living Expenses</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Utilities (Monthly)" value={expenseState.monthlyUtilities} setter={(v) => { expenseState.setMonthlyUtilities(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              <Input label="Healthcare (Monthly)" value={expenseState.monthlyHealthcare} setter={(v) => { expenseState.setMonthlyHealthcare(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              <Input label="Household Expenses (Monthly)" value={expenseState.householdExpenses} setter={(v) => { expenseState.setHouseholdExpenses(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              <Input label="Discretionary (Monthly)" value={expenseState.discretionarySpending} setter={(v) => { expenseState.setDiscretionarySpending(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              <Input label="Childcare (Monthly)" value={expenseState.childcareCosts} setter={(v) => { expenseState.setChildcareCosts(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              <Input label="Other Expenses (Monthly)" value={expenseState.monthlyOtherExpenses} setter={(v) => { expenseState.setMonthlyOtherExpenses(v); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
            </div>
          </div>

          <Separator />

          <div>
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Life Insurance</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Your Life Insurance (Annual)" value={p1LifeInsuranceAnnual} setter={(v) => { updatePlanConfig({ annualLifeInsuranceP1: v }, 'user-entered'); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              {isMarried && (
                <Input label="Spouse Life Insurance (Annual)" value={p2LifeInsuranceAnnual} setter={(v) => { updatePlanConfig({ annualLifeInsuranceP2: v }, 'user-entered'); calculationState.handleInputChange(); }} onInputChange={calculationState.handleInputChange} />
              )}
            </div>
          </div>
        </div>
      </SectionCard>
    </IncomeCalculatorLayout>
  );
}
