"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeft, Calculator, TrendingUp, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input as UIInput } from "@/components/ui/input";
import { Input, Spinner } from "@/components/calculator/InputHelpers";
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

type FilingStatus = "single" | "married";
type PayFrequency = "biweekly" | "semimonthly" | "monthly" | "weekly";

interface PayEvent {
  date: Date;
  person: 'p1' | 'p2';
  checkNumberForPerson: number; // e.g., P1's 5th check
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

export default function Income2026Page() {
  const { implied, setImplied } = useBudget();
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  // Marital status
  const [maritalStatus, setMaritalStatus] = useState<FilingStatus>("single");

  // Person 1 (User) Income Inputs
  const [p1BaseIncome, setP1BaseIncome] = useState(0);
  const [p1Bonus, setP1Bonus] = useState(0);
  const [p1BonusMonth, setP1BonusMonth] = useState("December");
  const [p1OvertimeMonthly, setP1OvertimeMonthly] = useState(0);
  const [p1PayFrequency, setP1PayFrequency] = useState<PayFrequency>("biweekly");
  const [p1FirstPayDate, setP1FirstPayDate] = useState("2026-01-15");

  // Person 1 Pre-tax Deductions
  const [p1PreTax401k, setP1PreTax401k] = useState(0);
  const [p1PreTaxHealthInsurance, setP1PreTaxHealthInsurance] = useState(0);
  const [p1PreTaxHSA, setP1PreTaxHSA] = useState(0);
  const [p1PreTaxFSA, setP1PreTaxFSA] = useState(0);

  // Person 2 (Spouse) Income Inputs
  const [p2BaseIncome, setP2BaseIncome] = useState(0);
  const [p2Bonus, setP2Bonus] = useState(0);
  const [p2BonusMonth, setP2BonusMonth] = useState("December");
  const [p2OvertimeMonthly, setP2OvertimeMonthly] = useState(0);
  const [p2PayFrequency, setP2PayFrequency] = useState<PayFrequency>("biweekly");
  const [p2FirstPayDate, setP2FirstPayDate] = useState("2026-01-15");

  // Person 2 Pre-tax Deductions
  const [p2PreTax401k, setP2PreTax401k] = useState(0);
  const [p2PreTaxHealthInsurance, setP2PreTaxHealthInsurance] = useState(0);
  const [p2PreTaxHSA, setP2PreTaxHSA] = useState(0);
  const [p2PreTaxFSA, setP2PreTaxFSA] = useState(0);

  // Tax Settings
  const [federalWithholdingExtra] = useState(0);
  const [stateWithholdingExtra] = useState(0);

  // Housing
  const [housingType, setHousingType] = useState<"rent" | "own">("own");
  const [rentPayment, setRentPayment] = useState(0);
  const [mortgagePayment, setMortgagePayment] = useState(5859);
  const [propertyTaxAnnual] = useState(25000);
  const [homeInsuranceAnnual] = useState(10000);
  const [floodInsuranceAnnual] = useState(3500);

  // Spending Buckets
  const [householdExpenses, setHouseholdExpenses] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);
  const [childcareCosts] = useState(1550);

  // Life Insurance
  const [p1LifeInsuranceAnnual] = useState(4500);
  const [p2LifeInsuranceAnnual] = useState(0);

  // Post-tax Deductions (Not Yet Implemented)
  const [p1RothContribution] = useState(0);
  const [p2RothContribution] = useState(0);
  const [p1DisabilityInsurance] = useState(0);

  // TODO: Net Worth Tracking Feature (Not Yet Implemented)
  // Uncomment these when implementing net worth tracking functionality
  // const [mortgageBalance, setMortgageBalance] = useState(0);
  // const [mortgageRate, setMortgageRate] = useState(0);
  // const [mortgageInterestMonthly, setMortgageInterestMonthly] = useState(0);
  // const [carFMV, setCarFMV] = useState(0);
  // const [carUsefulLife, setCarUsefulLife] = useState(10);
  // const [carResidualValue, setCarResidualValue] = useState(0);
  // const [carFiresaleDiscount, setCarFiresaleDiscount] = useState(30);

  // Results state
  const [results, setResults] = useState<{
    paychecks: PaycheckResult[];
    yearSummary: {
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
    };
  } | null>(null);

  // Error state
  const [calculationError, setCalculationError] = useState<string | null>(null);

  // Dirty state to track when inputs change
  const [isDirty, setIsDirty] = useState(false);

  // Show back to top button after scrolling
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Loading state for calculation
  const [isCalculating, setIsCalculating] = useState(false);

  // AI Onboarding auto-fill state
  const [isFromAIOnboarding, setIsFromAIOnboarding] = useState(false);
  const [showAIBanner, setShowAIBanner] = useState(false);

  // Handle scroll to show/hide back to top button
  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Pre-populate form from PlanConfig (single source of truth)
  useEffect(() => {
    console.log('[INCOME-2026] Pre-populating from PlanConfig:', planConfig);

    // Priority 1: Use direct values from PlanConfig if available
    if (planConfig.marital) {
      setMaritalStatus(planConfig.marital);
    }

    if (planConfig.annualIncome1 && planConfig.annualIncome1 > 0) {
      setP1BaseIncome(planConfig.annualIncome1);
      console.log('[INCOME-2026] Loaded Person 1 income from PlanConfig:', planConfig.annualIncome1);
    }

    if (planConfig.marital === 'married' && planConfig.annualIncome2 && planConfig.annualIncome2 > 0) {
      setP2BaseIncome(planConfig.annualIncome2);
      console.log('[INCOME-2026] Loaded Person 2 income from PlanConfig:', planConfig.annualIncome2);
    }

    // Pre-fill 401k contributions from PlanConfig
    if (planConfig.cPre1 && planConfig.cPre1 > 0) {
      setP1PreTax401k(planConfig.cPre1);
    }

    if (planConfig.marital === 'married' && planConfig.cPre2 && planConfig.cPre2 > 0) {
      setP2PreTax401k(planConfig.cPre2);
    }

    // Priority 2: Fall back to budget context estimates if PlanConfig is empty
    if (!planConfig.annualIncome1 || planConfig.annualIncome1 === 0) {
      if (implied && implied.grossIncome > 0) {
        console.log('[INCOME-2026] Falling back to budget context estimates');
        const estimatedBaseIncome = implied.grossIncome * 0.5;
        setP1BaseIncome(Math.round(estimatedBaseIncome));
        if (implied.maritalStatus === 'married') {
          setP2BaseIncome(Math.round(estimatedBaseIncome));
        }
      }
    }

    // Priority 3: Check legacy sharedIncomeData for backward compatibility
    if (hasRecentIncomeData()) {
      const sharedData = loadSharedIncomeData();
      if (sharedData && sharedData.source === 'ai-onboarding') {
        console.log('[INCOME-2026] Found legacy AI onboarding data:', sharedData);
        // Only use if PlanConfig doesn't have this data
        if (!planConfig.annualIncome1) {
          setP1BaseIncome(sharedData.annualIncome1);
        }
        if (!planConfig.annualIncome2 && sharedData.annualIncome2) {
          setP2BaseIncome(sharedData.annualIncome2);
        }
        setIsFromAIOnboarding(true);
        setShowAIBanner(true);
      }
    }

    console.log('[INCOME-2026] Form pre-populated successfully');
  }, [planConfig, implied]); // Re-run when PlanConfig or budget context changes

  // Clear and start fresh
  const handleClearAIData = () => {
    clearSharedIncomeData();
    setIsFromAIOnboarding(false);
    setShowAIBanner(false);
    // Reset to defaults
    setMaritalStatus('single');
    setP1BaseIncome(0);
    setP2BaseIncome(0);
    console.log('[INCOME-2026] Cleared AI onboarding data');
  };

  // Apply 2026 income planner values to main retirement plan
  const handleApplyToMainPlan = () => {
    console.log('[INCOME-2026] Applying values to main retirement plan (PlanConfig)');

    updatePlanConfig({
      marital: maritalStatus,
      annualIncome1: p1BaseIncome,
      annualIncome2: isMarried ? p2BaseIncome : 0,
      cPre1: p1PreTax401k,
      cPre2: isMarried ? p2PreTax401k : 0,
    }, 'user-entered');

    alert('✅ Your 2026 income data has been applied to your main retirement plan!');
    console.log('[INCOME-2026] Successfully updated PlanConfig with 2026 values');
  };

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December", "None"
  ];

  const isMarried = maritalStatus === "married";

  // --- HELPER FUNCTIONS ---


  const getPaychecksPerYear = (frequency: PayFrequency): number => {
    switch (frequency) {
      case 'weekly': return 52;
      case 'biweekly': return 26;
      case 'semimonthly': return 24;
      case 'monthly': return 12;
      default: return 26;
    }
  };

  const adjustForWeekend = (date: Date): Date => {
    const dayOfWeek = date.getDay();
    const adjusted = new Date(date);
    if (dayOfWeek === 0) adjusted.setDate(date.getDate() - 2); // Sunday -> Friday
    else if (dayOfWeek === 6) adjusted.setDate(date.getDate() - 1); // Saturday -> Friday
    return adjusted;
  };

  const generatePaycheckDates = (frequency: PayFrequency, firstPayDate: string): Date[] => {
    const dates: Date[] = [];
    const startDate = new Date(firstPayDate);
    // Safety check for invalid date
    if (isNaN(startDate.getTime())) return [];

    if (frequency === 'semimonthly') {
      for (let month = 0; month < 12; month++) {
        const fifteenth = adjustForWeekend(new Date(2026, month, 15));
        dates.push(fifteenth);
        const lastDay = adjustForWeekend(new Date(2026, month + 1, 0));
        dates.push(lastDay);
      }
    } else if (frequency === 'monthly') {
      const dayOfMonth = startDate.getDate();
      for (let month = 0; month < 12; month++) {
        const lastDayOfMonth = new Date(2026, month + 1, 0).getDate();
        const actualDay = Math.min(dayOfMonth, lastDayOfMonth);
        const payDate = adjustForWeekend(new Date(2026, month, actualDay));
        dates.push(payDate);
      }
    } else {
      const daysInterval = frequency === 'weekly' ? 7 : 14;
      const numPaychecks = getPaychecksPerYear(frequency);
      for (let i = 0; i < numPaychecks; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + (i * daysInterval));
        if (date.getFullYear() === 2026) {
          dates.push(date);
        }
      }
    }
    return dates.filter(d => d.getFullYear() === 2026).sort((a, b) => a.getTime() - b.getTime());
  };

  // Track input changes
  const handleInputChange = () => {
    setIsDirty(true);
  };

  // --- MAIN CALCULATION LOGIC ---
  const handleCalculate = () => {
    console.log("Calculating 2026 unified forecast...");
    setIsCalculating(true);
    setCalculationError(null);
    setIsDirty(false); // Reset dirty flag on successful calculation

    try {
      // Input validation
      if (p1BaseIncome < 0 || p2BaseIncome < 0) {
        throw new Error("Base income cannot be negative");
      }
      if (p1PreTax401k < 0 || p2PreTax401k < 0) {
        throw new Error("401(k) contributions cannot be negative");
      }
      if (p1PreTax401k > 24000) {
        throw new Error("Your 401(k) contribution exceeds the 2026 limit of $24,000");
      }
      if (p2PreTax401k > 24000) {
        throw new Error("Spouse 401(k) contribution exceeds the 2026 limit of $24,000");
      }
      if (p1PreTaxHSA < 0 || p2PreTaxHSA < 0) {
        throw new Error("HSA contributions cannot be negative");
      }
      if (p1PreTaxFSA < 0 || p2PreTaxFSA < 0) {
        throw new Error("FSA contributions cannot be negative");
      }
      if (p1PreTaxHealthInsurance < 0 || p2PreTaxHealthInsurance < 0) {
        throw new Error("Health insurance premiums cannot be negative");
      }
      if (isMarried && p1BaseIncome === 0 && p2BaseIncome === 0) {
        throw new Error("At least one person must have income");
      }
      if (!isMarried && p1BaseIncome === 0) {
        throw new Error("Please enter your base income");
      }
      if (mortgagePayment < 0 || rentPayment < 0) {
        throw new Error("Housing payments cannot be negative");
      }
      if (householdExpenses < 0 || discretionarySpending < 0) {
        throw new Error("Expenses cannot be negative");
      }
      // Validate dates
      const p1Date = new Date(p1FirstPayDate);
      const p2Date = new Date(p2FirstPayDate);
      if (isNaN(p1Date.getTime())) {
        throw new Error("Invalid first pay date for you");
      }
      if (isMarried && p2BaseIncome > 0 && isNaN(p2Date.getTime())) {
        throw new Error("Invalid first pay date for spouse");
      }
      if (p1Date.getFullYear() !== 2026) {
        throw new Error("First pay date must be in 2026");
      }
      if (isMarried && p2BaseIncome > 0 && p2Date.getFullYear() !== 2026) {
        throw new Error("Spouse first pay date must be in 2026");
      }

    // Constants
    const STANDARD_DEDUCTION = isMarried ? 30000 : 15000;
    const SS_WAGE_BASE = 176100;
    const MEDICARE_THRESHOLD = 200000;
    const MAX_401K = 24000; 
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

    // 1. Generate ALL Pay Dates for P1 and P2 independently
    const p1Dates = generatePaycheckDates(p1PayFrequency, p1FirstPayDate);
    const p2Dates = (isMarried && p2BaseIncome > 0) ? generatePaycheckDates(p2PayFrequency, p2FirstPayDate) : [];

    // 2. Create a Unified Event Timeline
    const events: PayEvent[] = [];
    p1Dates.forEach((d, i) => events.push({ date: d, person: 'p1', checkNumberForPerson: i + 1 }));
    p2Dates.forEach((d, i) => events.push({ date: d, person: 'p2', checkNumberForPerson: i + 1 }));
    
    // Sort chronologically
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // 3. Initialize Trackers
    let p1YtdWages = 0, p2YtdWages = 0;
    let p1Ytd401k = 0, p2Ytd401k = 0;
    let p1YtdDepFSA = 0, p2YtdDepFSA = 0;
    let p1YtdMedFSA = 0, p2YtdMedFSA = 0;
    
    // Household Aggregates
    let householdYtdWages = 0;
    
    const paychecks = [];
    
    // Pre-calculate per-check amounts (Base Salary)
    const p1PayPerCheck = p1BaseIncome / Math.max(1, p1Dates.length);
    const p2PayPerCheck = p2BaseIncome / Math.max(1, p2Dates.length);

    // Fixed expenses are spread across ALL household paychecks to smooth cash flow
    const totalChecks = events.length;
    const eoyPropertyExpenses = (housingType === "own") ? (propertyTaxAnnual + homeInsuranceAnnual + floodInsuranceAnnual) : 0;
    
    // Annual fixed costs
    const totalAnnualFixed = (
      (housingType === "rent" ? rentPayment : mortgagePayment) * 12 +
      householdExpenses * 12 +
      discretionarySpending * 12 +
      childcareCosts * 12 +
      p1LifeInsuranceAnnual + 
      (isMarried ? p2LifeInsuranceAnnual : 0) +
      eoyPropertyExpenses
    );
    
    const fixedExpensePerCheck = totalAnnualFixed / Math.max(1, totalChecks);

    // 4. Iterate the Unified Timeline
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const person = event.person;
        const paycheckDate = event.date;
        const monthOfPaycheck = paycheckDate.getMonth(); // 0-11

        // --- A. GROSS INCOME ---
        let currentBaseGross = 0;
        let currentBonus = 0;
        
        if (person === 'p1') {
            currentBaseGross = p1PayPerCheck;
            // Check Bonus (First check of bonus month)
            const p1BonusMonthIdx = months.indexOf(p1BonusMonth);
            // Is this the first check for P1 in this month?
            const isFirstCheckOfMonth = event.checkNumberForPerson === 1 ||
                                        (event.checkNumberForPerson > 1 && p1Dates[event.checkNumberForPerson - 2]?.getMonth() !== monthOfPaycheck);

            if (p1BonusMonthIdx === monthOfPaycheck && isFirstCheckOfMonth) {
                currentBonus = p1Bonus;
            }
        } else {
            currentBaseGross = p2PayPerCheck;
            const p2BonusMonthIdx = months.indexOf(p2BonusMonth);
            const isFirstCheckOfMonth = event.checkNumberForPerson === 1 ||
                                        (event.checkNumberForPerson > 1 && p2Dates[event.checkNumberForPerson - 2]?.getMonth() !== monthOfPaycheck);

            if (p2BonusMonthIdx === monthOfPaycheck && isFirstCheckOfMonth) {
                currentBonus = p2Bonus;
            }
        }

        const totalGross = currentBaseGross + currentBonus;

        // --- B. PRE-TAX DEDUCTIONS ---
        // Calculate individual check deductions
        // Note: We distribute annual deductions evenly across that person's checks

        let healthIns = 0, depFSA = 0, medFSA = 0, dental = 0, vision = 0;
        const numChecksForPerson = person === 'p1' ? p1Dates.length : p2Dates.length;

        if (person === 'p1') {
            healthIns = p1PreTaxHealthInsurance / numChecksForPerson;
            
            if (p1PreTaxFSA > 0) {
                 const ideal = Math.min(p1PreTaxFSA, MAX_DEP_FSA) / numChecksForPerson;
                 depFSA = Math.min(ideal, MAX_DEP_FSA - p1YtdDepFSA);
            }
            if (p1PreTaxHSA > 0) { // Using HSA input for Med FSA per previous logic
                 const ideal = Math.min(p1PreTaxHSA, MAX_MED_FSA) / numChecksForPerson;
                 medFSA = Math.min(ideal, MAX_MED_FSA - p1YtdMedFSA);
            }
            // P1 carries the dental/vision load in this simplified model
            dental = (event.checkNumberForPerson % 2 !== 0) ? 49.59 : 0; // e.g. odd checks
            vision = (event.checkNumberForPerson % 2 !== 0) ? 19.03 : 0;
        } else {
            // P2
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

        // --- C. FEDERAL TAX (Progressive) ---
        // Estimate annual taxable income to find bracket
        // Then divide tax by number of pay periods? 
        // BETTER: Annualize *this* check, calc tax, divide back.
        
        const fitTaxable = totalGross - totalPreTax;
        // Annualize based on this person's frequency to find withholding rate
        const annualizer = getPaychecksPerYear(person === 'p1' ? p1PayFrequency : p2PayFrequency);
        const annualizedTaxable = (fitTaxable * annualizer) - STANDARD_DEDUCTION;
        
        // Calculate Tax on Annualized
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
        const totalFIT = fitBase + federalWithholdingExtra + stateWithholdingExtra; // Grouping state here for simplicity

        // --- D. FICA ---
        const currentYtdWages = person === 'p1' ? p1YtdWages : p2YtdWages;
        
        // Social Security (6.2% up to 176,100)
        let ssTax = 0;
        if (currentYtdWages < SS_WAGE_BASE) {
            const taxableSS = Math.min(totalGross, SS_WAGE_BASE - currentYtdWages);
            ssTax = taxableSS * 0.062;
        }
        
        // Medicare (1.45% flat + 0.9% over 200k Household)
        // Note: Additional Medicare Tax triggers on *Household* wages > 200k (or 250k married filing joint, but employers withhold based on 200k usually)
        // We'll use householdYtdWages for the 0.9% trigger if Married
        
        let medTax = totalGross * 0.0145;
        if (householdYtdWages + totalGross > MEDICARE_THRESHOLD) {
            // Determine how much of THIS check is above threshold
            const amountAlreadyOver = Math.max(0, householdYtdWages - MEDICARE_THRESHOLD);
            const amountOfCheckOver = Math.max(0, (householdYtdWages + totalGross) - MEDICARE_THRESHOLD - amountAlreadyOver);
            medTax += amountOfCheckOver * 0.009;
        }

        // --- E. 401k ---
        // Calculated on GROSS (Base + Bonus usually, unless specified otherwise. We assume all eligible)
        // But strictly capped at 24,000 YTD per person
        
        const userTarget401k = person === 'p1' ? p1PreTax401k : p2PreTax401k;
        const personYtd401k = person === 'p1' ? p1Ytd401k : p2Ytd401k;
        
        let contribution401k = 0;
        
        // Logic: Attempt to contribute pro-rata share of annual target, but accelerate if bonus
        // Simple approach: % of gross based on (Target / Est Income)
        const estTotalIncome = (person === 'p1' ? (p1BaseIncome + p1Bonus) : (p2BaseIncome + p2Bonus));
        const contributionRate = estTotalIncome > 0 ? (userTarget401k / estTotalIncome) : 0;
        
        contribution401k = totalGross * contributionRate;
        
        // Hard Cap Check
        if (personYtd401k + contribution401k > MAX_401K) {
            contribution401k = Math.max(0, MAX_401K - personYtd401k);
        }

        // --- F. REMAINDERS ---
        // Cash available before investments
        const preInvRemainder = totalGross - totalPreTax - totalFIT - ssTax - medTax - fixedExpensePerCheck;
        
        // Ensure 401k doesn't exceed paycheck
        if (contribution401k > preInvRemainder + fixedExpensePerCheck) { // allow eating into fixed expenses logic if desperate? No.
             // Should technically reduce 401k if net pay < 0, but realistically 401k is pre-tax. 
             // However, you still need money for FICA/FIT. 
             // Simplified: We assume 401k is prioritized, but let's not go negative.
        }

        const brokerageContribution = Math.max(0, preInvRemainder - contribution401k); // Dump rest to brokerage

        // --- UPDATE TRACKERS ---
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

        // Push to result array
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
            fitTaxable, // approximate
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

    // Aggregate Year Summary
    const totalIncome = paychecks.reduce((sum, p) => sum + p.totalGross, 0);
    const totalFIT = paychecks.reduce((sum, p) => sum + p.totalFIT, 0);
    const totalFICA = paychecks.reduce((sum, p) => sum + p.ss + p.totalMed, 0);
    const totalPreTax = paychecks.reduce((sum, p) => sum + p.totalPreTax, 0);
    const totalFixedExpenses = paychecks.reduce((sum, p) => sum + p.fixedExpenses, 0);
    const total401k = paychecks.reduce((sum, p) => sum + p.contribution401k, 0);
    const totalBrokerage = paychecks.reduce((sum, p) => sum + p.brokerageContribution, 0);

    // Calculate annual post-tax deductions
    const totalPostTaxDeductions =
      p1RothContribution +
      (isMarried ? p2RothContribution : 0) +
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

    // Write back to budget context for consistency with main calculator
    setImplied({
      grossIncome: totalIncome,
      taxes: totalFIT + totalFICA,
      housing: (housingType === "own" ? mortgagePayment : rentPayment) * 12,
      discretionary: discretionarySpending * 12,
      contributions401k: total401k,
      contributionsRoth: p1RothContribution + (isMarried ? p2RothContribution : 0),
      contributionsTaxable: totalBrokerage,
      maritalStatus: maritalStatus,
    });

    console.log('[INCOME-2026] Updated budget context with calculated values');

    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      setIsCalculating(false);
    }, 100);
    } catch (error) {
      console.error('[INCOME-2026] Calculation error:', error);
      setCalculationError(error instanceof Error ? error.message : 'An unexpected error occurred during calculation. Please check your inputs and try again.');
      setResults(null);
      setIsCalculating(false);
    }
  };

  // Helper component for dual input fields
  const DualInputField = ({ label, value1, onChange1, value2, onChange2, defaultValue = 0 }: {
    label: string;
    value1: number;
    onChange1: (v: number) => void;
    value2: number;
    onChange2: (v: number) => void;
    defaultValue?: number;
  }) => {
    const wrappedOnChange1 = (val: number) => {
      onChange1(val);
      handleInputChange();
    };
    const wrappedOnChange2 = (val: number) => {
      onChange2(val);
      handleInputChange();
    };
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <Input label={`${label} (Your)`} value={value1} setter={wrappedOnChange1} defaultValue={defaultValue} onInputChange={handleInputChange} />
        {isMarried && (
          <Input label={`${label} (Spouse)`} value={value2} setter={wrappedOnChange2} defaultValue={defaultValue} onInputChange={handleInputChange} />
        )}
      </div>
    );
  };

  // Helper component for dual select fields
  const DualSelectField = ({ label, idPrefix, value1, onChange1, value2, onChange2, options }: {
    label: string;
    idPrefix: string;
    value1: string;
    onChange1: (v: string) => void;
    value2: string;
    onChange2: (v: string) => void;
    options: string[];
  }) => {
    const wrappedOnChange1 = (val: string) => {
      onChange1(val);
      handleInputChange();
    };
    const wrappedOnChange2 = (val: string) => {
      onChange2(val);
      handleInputChange();
    };
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

  // Helper component for dual date fields
  const DualDateField = ({ label, idPrefix, value1, onChange1, value2, onChange2 }: {
    label: string;
    idPrefix: string;
    value1: string;
    onChange1: (v: string) => void;
    value2: string;
    onChange2: (v: string) => void;
  }) => {
    const wrappedOnChange1 = (val: string) => {
      onChange1(val);
      handleInputChange();
    };
    const wrappedOnChange2 = (val: string) => {
      onChange2(val);
      handleInputChange();
    };
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
          <UIInput
            id={`${idPrefix}-your`}
            type="date"
            value={value1}
            onChange={(e) => wrappedOnChange1(e.target.value)}
            className="w-full"
          />
        </div>
        {isMarried && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-spouse`}>{label} (Spouse)</Label>
            <UIInput
              id={`${idPrefix}-spouse`}
              type="date"
              value={value2}
              onChange={(e) => wrappedOnChange2(e.target.value)}
              className="w-full"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
          </Link>
          <h1 className="font-semibold text-xl">2026 Income & Cash Flow Planner</h1>
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
                      Auto-filled from AI Onboarding
                    </CardTitle>
                    <CardDescription className="text-blue-700 dark:text-blue-300">
                      Your income information has been pre-filled based on your onboarding conversation. You can edit any values below.
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
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Comprehensive Income Modeling</CardTitle>
            <CardDescription>Model your full 2026 income stream with detailed deductions, cash flow buckets, and wealth accumulation tracking.</CardDescription>
          </CardHeader>
        </Card>

        {/* QUICK NAVIGATION */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => document.getElementById('household-setup')?.scrollIntoView({ behavior: 'smooth' })}>
                Household Setup
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('income-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Income Details
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('housing-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Housing & Expenses
              </Button>
              <Button variant="outline" size="sm" onClick={() => document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' })}>
                Results
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6" id="household-setup">
          <CardHeader><CardTitle>Household Setup</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="marital-status">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={(value: FilingStatus) => { setMaritalStatus(value); handleInputChange(); }}>
                <SelectTrigger id="marital-status"><SelectValue placeholder="Select marital status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6" id="income-section">
          <CardHeader>
            <CardTitle>{isMarried ? "YOUR INCOME" : "INCOME DETAILS"}</CardTitle>
            <CardDescription>{isMarried ? "Income details for you and your spouse" : "Your income details"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income Sources</h4>
                <div className="space-y-4">
                  <DualInputField label="Base Annual Salary" value1={p1BaseIncome} onChange1={setP1BaseIncome} value2={p2BaseIncome} onChange2={setP2BaseIncome} />
                  <DualInputField label="Annual Bonus" value1={p1Bonus} onChange1={setP1Bonus} value2={p2Bonus} onChange2={setP2Bonus} />
                  <DualSelectField label="Bonus Payment Month" idPrefix="bonus-month" value1={p1BonusMonth} onChange1={setP1BonusMonth} value2={p2BonusMonth} onChange2={setP2BonusMonth} options={months.slice(0, 12)} />
                  <DualInputField label="Estimated Monthly Overtime" value1={p1OvertimeMonthly} onChange1={setP1OvertimeMonthly} value2={p2OvertimeMonthly} onChange2={setP2OvertimeMonthly} />
                  <DualSelectField label="Pay Frequency" idPrefix="pay-frequency" value1={p1PayFrequency} onChange1={(v) => setP1PayFrequency(v as PayFrequency)} value2={p2PayFrequency} onChange2={(v) => setP2PayFrequency(v as PayFrequency)} options={["biweekly", "semimonthly", "monthly", "weekly"]} />
                  <DualDateField label="First Pay Date" idPrefix="first-pay-date" value1={p1FirstPayDate} onChange1={setP1FirstPayDate} value2={p2FirstPayDate} onChange2={setP2FirstPayDate} />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Annual Pre-Tax Deductions</h4>
                <div className="space-y-4">
                  <DualInputField label="401(k) Contribution (Annual)" value1={p1PreTax401k} onChange1={setP1PreTax401k} value2={p2PreTax401k} onChange2={setP2PreTax401k} />
                  <DualInputField label="Health Insurance Premium" value1={p1PreTaxHealthInsurance} onChange1={setP1PreTaxHealthInsurance} value2={p2PreTaxHealthInsurance} onChange2={setP2PreTaxHealthInsurance} />
                  <DualInputField label="HSA Contribution" value1={p1PreTaxHSA} onChange1={setP1PreTaxHSA} value2={p2PreTaxHSA} onChange2={setP2PreTaxHSA} />
                  <DualInputField label="FSA Contribution" value1={p1PreTaxFSA} onChange1={setP1PreTaxFSA} value2={p2PreTaxFSA} onChange2={setP2PreTaxFSA} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6" id="housing-section">
            <CardHeader><CardTitle>Housing & Expenses</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="housing-type">Housing Type</Label>
                        <Select value={housingType} onValueChange={(value: "rent" | "own") => { setHousingType(value); handleInputChange(); }}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="rent">Rent</SelectItem><SelectItem value="own">Own</SelectItem></SelectContent>
                        </Select>
                    </div>
                    {housingType === "rent" ? (
                        <Input label="Monthly Rent" value={rentPayment} setter={(v) => { setRentPayment(v); handleInputChange(); }} onInputChange={handleInputChange} />
                    ) : (
                        <Input label="Monthly Mortgage" value={mortgagePayment} setter={(v) => { setMortgagePayment(v); handleInputChange(); }} defaultValue={5859} onInputChange={handleInputChange} />
                    )}
                    <Input label="Household Expenses" value={householdExpenses} setter={(v) => { setHouseholdExpenses(v); handleInputChange(); }} onInputChange={handleInputChange} />
                    <Input label="Discretionary" value={discretionarySpending} setter={(v) => { setDiscretionarySpending(v); handleInputChange(); }} onInputChange={handleInputChange} />
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-center gap-4 pb-8">
          <Button size="lg" onClick={handleCalculate} disabled={isCalculating} className="flex items-center gap-2">
            {isCalculating ? (
              <>
                <Spinner className="w-5 h-5" /> Calculating...
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" /> Calculate 2026 Projections
              </>
            )}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={handleApplyToMainPlan}
            className="flex items-center gap-2"
            title="Save these income values to your main retirement plan"
          >
            <Sparkles className="w-5 h-5" /> Apply to Main Plan
          </Button>
        </div>

        {/* RECALCULATION BANNER */}
        {isDirty && results && (
          <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="text-yellow-600 dark:text-yellow-500">⚠️</div>
                  <div>
                    <p className="font-semibold text-yellow-800 dark:text-yellow-200">Inputs Modified</p>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300">Recalculate to see updated projections</p>
                  </div>
                </div>
                <Button onClick={handleCalculate} disabled={isCalculating} variant="default" className="flex items-center gap-2">
                  {isCalculating ? (
                    <>
                      <Spinner className="w-4 h-4" /> Calculating...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" /> Recalculate
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ERROR MESSAGE */}
        {calculationError && (
          <Card className="mb-6 border-destructive">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="text-destructive">⚠️</div>
                <div>
                  <p className="font-semibold text-destructive">Calculation Error</p>
                  <p className="text-sm text-muted-foreground mt-1">{calculationError}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* RESULTS */}
        {results && results.paychecks && (
          <div id="results-section" className="space-y-6 scroll-mt-20">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="w-5 h-5" /> 2026 Annual Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-green-50 p-4 rounded-lg border border-green-200"><div className="text-sm text-green-700">Total Income</div><div className="text-xl font-bold">${(results.yearSummary.totalIncome ?? 0).toLocaleString()}</div></div>
                    <div className="bg-red-50 p-4 rounded-lg border border-red-200"><div className="text-sm text-red-700">Total Tax (Fed+FICA)</div><div className="text-xl font-bold">${((results.yearSummary.totalFIT ?? 0) + (results.yearSummary.totalFICA ?? 0)).toLocaleString()}</div></div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200"><div className="text-sm text-blue-700">401k Invested</div><div className="text-xl font-bold">${(results.yearSummary.total401k ?? 0).toLocaleString()}</div></div>
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200"><div className="text-sm text-emerald-700">Net Cash Flow</div><div className="text-xl font-bold">${(results.yearSummary.netTakeHome ?? 0).toLocaleString()}</div></div>
                </div>
              </CardContent>
            </Card>

            {/* DYNAMIC PAYCHECK TABLE */}
            <Card>
              <CardHeader>
                <CardTitle>Paycheck-by-Paycheck Waterfall</CardTitle>
                <CardDescription>Showing {results.paychecks.length} individual income events chronologically.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  {(() => {
                    const chunkSize = 12;
                    const chunks = [];
                    for (let i = 0; i < results.paychecks.length; i += chunkSize) {
                      chunks.push(results.paychecks.slice(i, i + chunkSize));
                    }
                    return chunks.map((chunk, chunkIndex) => (
                      <div key={chunkIndex} className="mb-8 last:mb-0">
                         <table className="w-full text-xs border-collapse mb-4">
                          <thead className="sticky top-0 bg-background z-10">
                            <tr className="border-b-2">
                              <th className="text-left py-2 px-2 font-semibold min-w-[150px] bg-background">Item</th>
                              {chunk.map((p: PaycheckResult) => (
                                <th key={p.paycheckNum} className="text-right py-2 px-2 font-semibold min-w-[100px] border-l bg-background">
                                  #{p.paycheckNum} <br/><span className="text-[10px] font-normal text-muted-foreground">{p.personLabel}</span>
                                </th>
                              ))}
                            </tr>
                            <tr className="border-b">
                                <th className="text-left py-1 px-2 bg-background">Date</th>
                                {chunk.map((p: PaycheckResult) => <th key={p.paycheckNum} className="text-right py-1 px-2 border-l bg-background">{new Date(p.date).toLocaleDateString('en-US', {month:'short', day:'numeric'})}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-muted/50">
                                <td className="py-1 px-2 font-medium">Total Gross</td>
                                {chunk.map((p: PaycheckResult) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">${(p.totalGross ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                            <tr className="hover:bg-muted/50 text-red-600">
                                <td className="py-1 px-2">Taxes & FICA</td>
                                {chunk.map((p: PaycheckResult) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">-${((p.totalFIT ?? 0) + (p.ss ?? 0) + (p.totalMed ?? 0)).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                             <tr className="hover:bg-muted/50 text-blue-600">
                                <td className="py-1 px-2">401k Contrib</td>
                                {chunk.map((p: PaycheckResult) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">-${(p.contribution401k ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                            <tr className="bg-muted/30 font-bold">
                                <td className="py-1 px-2">Net Remainder</td>
                                {chunk.map((p: PaycheckResult) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">${(p.brokerageContribution ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    ));
                  })()}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* BACK TO TOP BUTTON */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 z-50 flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all"
          aria-label="Back to top"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m18 15-6-6-6 6"/>
          </svg>
        </button>
      )}
    </div>
  );
}
