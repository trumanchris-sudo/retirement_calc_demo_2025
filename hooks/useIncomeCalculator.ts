"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlanConfig } from "@/lib/plan-config-context";
import { useBudget } from "@/lib/budget-context";

/**
 * Shared types for income calculators
 */
export type FilingStatus = "single" | "married";
export type PayFrequency = "biweekly" | "semimonthly" | "monthly" | "weekly" | "quarterly";

export interface AIOnboardingState {
  isFromAIOnboarding: boolean;
  showAIBanner: boolean;
  setShowAIBanner: (show: boolean) => void;
  handleClearAIData: () => void;
}

export interface ScrollState {
  showBackToTop: boolean;
  scrollToResults: () => void;
  scrollToTop: () => void;
}

export interface CalculationState {
  isDirty: boolean;
  isCalculating: boolean;
  calculationError: string | null;
  setIsDirty: (dirty: boolean) => void;
  setIsCalculating: (calculating: boolean) => void;
  setCalculationError: (error: string | null) => void;
  handleInputChange: () => void;
}

export interface MaritalState {
  maritalStatus: FilingStatus;
  isMarried: boolean;
  updateMaritalStatusInSSOT: (status: FilingStatus) => void;
}

export interface PersonIncomeState {
  baseIncome: number;
  setBaseIncome: (value: number) => void;
  updateIncomeInSSOT: (value: number) => void;
  preTax401k: number;
  setPreTax401k: (value: number) => void;
  update401kInSSOT: (value: number) => void;
  postTaxRoth: number;
  setPostTaxRoth: (value: number) => void;
  updateRothInSSOT: (value: number) => void;
  age: number;
  setAge: (value: number) => void;
}

export interface HousingState {
  housingType: "rent" | "own";
  setHousingType: (type: "rent" | "own") => void;
  rentPayment: number;
  setRentPayment: (value: number) => void;
  mortgagePayment: number;
  setMortgagePayment: (value: number) => void;
  updateMortgageInSSOT: (value: number) => void;
  propertyTaxAnnual: number;
  setPropertyTaxAnnual: (value: number) => void;
  homeInsuranceAnnual: number;
  setHomeInsuranceAnnual: (value: number) => void;
  floodInsuranceAnnual: number;
  setFloodInsuranceAnnual: (value: number) => void;
}

export interface ExpenseState {
  monthlyUtilities: number;
  setMonthlyUtilities: (value: number) => void;
  monthlyHealthcare: number;
  setMonthlyHealthcare: (value: number) => void;
  monthlyOtherExpenses: number;
  setMonthlyOtherExpenses: (value: number) => void;
  householdExpenses: number;
  setHouseholdExpenses: (value: number) => void;
  discretionarySpending: number;
  setDiscretionarySpending: (value: number) => void;
  childcareCosts: number;
  setChildcareCosts: (value: number) => void;
}

/**
 * Hook for managing AI onboarding state
 */
export function useAIOnboardingState(): AIOnboardingState {
  const [isFromAIOnboarding, setIsFromAIOnboarding] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);

  const handleClearAIData = useCallback(() => {
    setIsFromAIOnboarding(false);
    setShowAIBanner(false);
  }, []);

  return {
    isFromAIOnboarding,
    showAIBanner,
    setShowAIBanner,
    handleClearAIData,
  };
}

/**
 * Hook for scroll-related functionality
 */
export function useScrollState(): ScrollState {
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToResults = useCallback(() => {
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  return {
    showBackToTop,
    scrollToResults,
    scrollToTop,
  };
}

/**
 * Hook for calculation state management
 */
export function useCalculationState(): CalculationState {
  const [isDirty, setIsDirty] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const handleInputChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  return {
    isDirty,
    isCalculating,
    calculationError,
    setIsDirty,
    setIsCalculating,
    setCalculationError,
    handleInputChange,
  };
}

/**
 * Hook for marital status with SSOT sync
 */
export function useMaritalState(
  onSpouseCleared?: () => void
): MaritalState {
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();
  const [maritalStatus, setMaritalStatus] = useState<FilingStatus>("single");

  // Initialize from PlanConfig
  useEffect(() => {
    if (planConfig.marital) {
      setMaritalStatus(planConfig.marital);
    }
  }, [planConfig.marital]);

  const updateMaritalStatusInSSOT = useCallback((value: FilingStatus) => {
    const previousStatus = maritalStatus;
    setMaritalStatus(value);
    updatePlanConfig({ marital: value }, 'user-entered');
    console.log('[useIncomeCalculator] Wrote marital status to PlanConfig SSOT:', value);

    // Clear spouse data when switching from married to single
    if (value === 'single' && previousStatus === 'married') {
      console.log('[useIncomeCalculator] Clearing spouse data (switched to single)');
      onSpouseCleared?.();
    }
  }, [maritalStatus, updatePlanConfig, onSpouseCleared]);

  return {
    maritalStatus,
    isMarried: maritalStatus === "married",
    updateMaritalStatusInSSOT,
  };
}

/**
 * Hook for housing-related state with SSOT sync
 */
export function useHousingState(): HousingState {
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  const [housingType, setHousingType] = useState<"rent" | "own">("own");
  const [rentPayment, setRentPayment] = useState(0);
  const [mortgagePayment, setMortgagePayment] = useState(0);
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState(0);
  const [homeInsuranceAnnual, setHomeInsuranceAnnual] = useState(0);
  const [floodInsuranceAnnual, setFloodInsuranceAnnual] = useState(0);

  // Initialize from PlanConfig
  useEffect(() => {
    if (planConfig.monthlyMortgageRent && planConfig.monthlyMortgageRent > 0) {
      setMortgagePayment(planConfig.monthlyMortgageRent);
    }
    if (planConfig.monthlyInsurancePropertyTax && planConfig.monthlyInsurancePropertyTax > 0) {
      const annualTotal = planConfig.monthlyInsurancePropertyTax * 12;
      setPropertyTaxAnnual(Math.round(annualTotal * 0.6));
      setHomeInsuranceAnnual(Math.round(annualTotal * 0.4));
    }
  }, [planConfig.monthlyMortgageRent, planConfig.monthlyInsurancePropertyTax]);

  const updateMortgageInSSOT = useCallback((value: number) => {
    setMortgagePayment(value);
    updatePlanConfig({ monthlyMortgageRent: value }, 'user-entered');
    console.log('[useIncomeCalculator] Wrote mortgage to PlanConfig SSOT:', value);
  }, [updatePlanConfig]);

  return {
    housingType,
    setHousingType,
    rentPayment,
    setRentPayment,
    mortgagePayment,
    setMortgagePayment,
    updateMortgageInSSOT,
    propertyTaxAnnual,
    setPropertyTaxAnnual,
    homeInsuranceAnnual,
    setHomeInsuranceAnnual,
    floodInsuranceAnnual,
    setFloodInsuranceAnnual,
  };
}

/**
 * Hook for expense state
 */
export function useExpenseState(): ExpenseState {
  const { config: planConfig } = usePlanConfig();

  const [monthlyUtilities, setMonthlyUtilities] = useState(0);
  const [monthlyHealthcare, setMonthlyHealthcare] = useState(0);
  const [monthlyOtherExpenses, setMonthlyOtherExpenses] = useState(0);
  const [householdExpenses, setHouseholdExpenses] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);
  const [childcareCosts, setChildcareCosts] = useState(0);

  // Initialize from PlanConfig
  useEffect(() => {
    if (planConfig.monthlyUtilities && planConfig.monthlyUtilities > 0) {
      setMonthlyUtilities(planConfig.monthlyUtilities);
    }
    if (planConfig.monthlyHealthcareP1 && planConfig.monthlyHealthcareP1 > 0) {
      setMonthlyHealthcare(planConfig.monthlyHealthcareP1 + (planConfig.monthlyHealthcareP2 ?? 0));
    }
    if (planConfig.monthlyOtherExpenses && planConfig.monthlyOtherExpenses > 0) {
      setMonthlyOtherExpenses(planConfig.monthlyOtherExpenses);
    }
    if (planConfig.monthlyHouseholdExpenses && planConfig.monthlyHouseholdExpenses > 0) {
      setHouseholdExpenses(planConfig.monthlyHouseholdExpenses);
    }
    if (planConfig.monthlyDiscretionary && planConfig.monthlyDiscretionary > 0) {
      setDiscretionarySpending(planConfig.monthlyDiscretionary);
    }
    if (planConfig.monthlyChildcare && planConfig.monthlyChildcare > 0) {
      setChildcareCosts(planConfig.monthlyChildcare);
    }
  }, [
    planConfig.monthlyUtilities,
    planConfig.monthlyHealthcareP1,
    planConfig.monthlyHealthcareP2,
    planConfig.monthlyOtherExpenses,
    planConfig.monthlyHouseholdExpenses,
    planConfig.monthlyDiscretionary,
    planConfig.monthlyChildcare,
  ]);

  return {
    monthlyUtilities,
    setMonthlyUtilities,
    monthlyHealthcare,
    setMonthlyHealthcare,
    monthlyOtherExpenses,
    setMonthlyOtherExpenses,
    householdExpenses,
    setHouseholdExpenses,
    discretionarySpending,
    setDiscretionarySpending,
    childcareCosts,
    setChildcareCosts,
  };
}

/**
 * Hook to detect and handle AI onboarding data
 */
export function useDetectAIOnboarding(
  setIsFromAIOnboarding: (value: boolean) => void,
  setShowAIBanner: (value: boolean) => void
) {
  const { config: planConfig } = usePlanConfig();

  useEffect(() => {
    // Detect if data came from AI onboarding via PlanConfig fieldMetadata
    const hasAISuggestedFields = planConfig.fieldMetadata &&
      Object.values(planConfig.fieldMetadata).some((meta: { source?: string }) => meta?.source === 'ai-suggested');

    if (hasAISuggestedFields) {
      setIsFromAIOnboarding(true);
      setShowAIBanner(true);
      console.log('[useIncomeCalculator] Detected AI-suggested data via PlanConfig fieldMetadata');
    }
  }, [planConfig.fieldMetadata, setIsFromAIOnboarding, setShowAIBanner]);
}

/**
 * Common months array for bonus selection
 */
export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December", "None"
];

/**
 * Helper function: Get number of paychecks per year based on frequency
 */
export function getPaychecksPerYear(frequency: PayFrequency): number {
  switch (frequency) {
    case 'weekly': return 52;
    case 'biweekly': return 26;
    case 'semimonthly': return 24;
    case 'monthly': return 12;
    case 'quarterly': return 4;
    default: return 26;
  }
}

/**
 * Helper function: Adjust date for weekends (move to Friday)
 */
export function adjustForWeekend(date: Date): Date {
  const dayOfWeek = date.getDay();
  const adjusted = new Date(date);
  if (dayOfWeek === 0) adjusted.setDate(date.getDate() - 2); // Sunday -> Friday
  else if (dayOfWeek === 6) adjusted.setDate(date.getDate() - 1); // Saturday -> Friday
  return adjusted;
}

/**
 * Helper function: Generate paycheck dates for a year
 */
export function generatePaycheckDates(
  frequency: PayFrequency,
  firstPayDate: string,
  year: number = 2026
): Date[] {
  const dates: Date[] = [];
  const startDate = new Date(firstPayDate);

  // Safety check for invalid date
  if (isNaN(startDate.getTime())) return [];

  if (frequency === 'semimonthly') {
    for (let month = 0; month < 12; month++) {
      const fifteenth = adjustForWeekend(new Date(year, month, 15));
      dates.push(fifteenth);
      const lastDay = adjustForWeekend(new Date(year, month + 1, 0));
      dates.push(lastDay);
    }
  } else if (frequency === 'monthly') {
    const dayOfMonth = startDate.getDate();
    for (let month = 0; month < 12; month++) {
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
      const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
      const payDate = adjustForWeekend(new Date(year, month, actualDay));
      dates.push(payDate);
    }
  } else if (frequency === 'quarterly') {
    for (let quarter = 0; quarter < 4; quarter++) {
      const month = quarter * 3 + 2; // Mar, Jun, Sep, Dec
      const lastDay = adjustForWeekend(new Date(year, month + 1, 0));
      dates.push(lastDay);
    }
  } else {
    const daysInterval = frequency === 'weekly' ? 7 : 14;
    const numPaychecks = getPaychecksPerYear(frequency);
    for (let i = 0; i < numPaychecks; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + (i * daysInterval));
      if (date.getFullYear() === year) {
        dates.push(date);
      }
    }
  }

  return dates.filter(d => d.getFullYear() === year).sort((a, b) => a.getTime() - b.getTime());
}
