"use client";

import React, { useState } from "react";
import { ArrowLeft, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TopBanner } from "@/components/layout/TopBanner";
import { useBudget } from "@/lib/budget-context";

type FilingStatus = "single" | "married";
type PayFrequency = "biweekly" | "semimonthly" | "monthly" | "weekly";

interface PayEvent {
  date: Date;
  person: 'p1' | 'p2';
  checkNumberForPerson: number; // e.g., P1's 5th check
}

export default function Income2026Page() {
  useBudget();
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
    paychecks: Array<any>;
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

  // Calculation key to force re-render of table when inputs change
  const [calculationKey, setCalculationKey] = useState(0);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December", "None"
  ];

  const isMarried = maritalStatus === "married";

  // --- HELPER FUNCTIONS ---

  const calculateRecommendedLifeInsurance = (income: number, age?: number): number => {
    if (income === 0) return 0;
    const baseAge = age || 35;
    let multiplier = 15;
    if (baseAge < 30) multiplier = 15;
    else if (baseAge < 40) multiplier = 14;
    else if (baseAge < 50) multiplier = 12;
    else if (baseAge < 60) multiplier = 10;
    else multiplier = 8;
    return Math.round(income * multiplier / 100000) * 100000;
  };

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

  // --- MAIN CALCULATION LOGIC ---
  const handleCalculate = () => {
    console.log("Calculating 2026 unified forecast...");
    setCalculationKey(prev => prev + 1);

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
                                        p1Dates[event.checkNumberForPerson - 2].getMonth() !== monthOfPaycheck;
            
            if (p1BonusMonthIdx === monthOfPaycheck && isFirstCheckOfMonth) {
                currentBonus = p1Bonus;
            }
        } else {
            currentBaseGross = p2PayPerCheck;
            const p2BonusMonthIdx = months.indexOf(p2BonusMonth);
            const isFirstCheckOfMonth = event.checkNumberForPerson === 1 || 
                                        p2Dates[event.checkNumberForPerson - 2].getMonth() !== monthOfPaycheck;
            
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
        const ytdDepFSA_Person = person === 'p1' ? p1YtdDepFSA : p2YtdDepFSA;
        const ytdMedFSA_Person = person === 'p1' ? p1YtdMedFSA : p2YtdMedFSA;

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
    } as any);

    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Helper component for dual input fields
  const DualInputField = ({ label, idPrefix, value1, onChange1, value2, onChange2, defaultValue = 0 }: any) => {
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <Input label={`${label} (Your)`} value={value1} setter={onChange1} defaultValue={defaultValue} />
        {isMarried && (
          <Input label={`${label} (Spouse)`} value={value2} setter={onChange2} defaultValue={defaultValue} />
        )}
      </div>
    );
  };

  // Helper component for dual select fields
  const DualSelectField = ({ label, idPrefix, value1, onChange1, value2, onChange2, options }: any) => (
    <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
        <select
          id={`${idPrefix}-your`}
          value={value1}
          onChange={(e) => onChange1(e.target.value)}
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
            onChange={(e) => onChange2(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
             {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      )}
    </div>
  );

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
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="w-5 h-5" />Comprehensive Income Modeling</CardTitle>
            <CardDescription>Model your full 2026 income stream with detailed deductions, cash flow buckets, and wealth accumulation tracking.</CardDescription>
          </CardHeader>
        </Card>

        <Card className="mb-6">
          <CardHeader><CardTitle>Household Setup</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="marital-status">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={(value: FilingStatus) => setMaritalStatus(value)}>
                <SelectTrigger id="marital-status"><SelectValue placeholder="Select marital status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isMarried ? "YOUR INCOME" : "INCOME DETAILS"}</CardTitle>
            <CardDescription>{isMarried ? "Income details for you and your spouse" : "Your income details"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income Sources</h4>
                <div className="space-y-4">
                  <DualInputField label="Base Annual Salary" idPrefix="base-salary" value1={p1BaseIncome} onChange1={setP1BaseIncome} value2={p2BaseIncome} onChange2={setP2BaseIncome} />
                  <DualInputField label="Annual Bonus" idPrefix="bonus" value1={p1Bonus} onChange1={setP1Bonus} value2={p2Bonus} onChange2={setP2Bonus} />
                  <DualSelectField label="Bonus Payment Month" idPrefix="bonus-month" value1={p1BonusMonth} onChange1={setP1BonusMonth} value2={p2BonusMonth} onChange2={setP2BonusMonth} options={months.slice(0, 12)} />
                  <DualInputField label="Estimated Monthly Overtime" idPrefix="overtime" value1={p1OvertimeMonthly} onChange1={setP1OvertimeMonthly} value2={p2OvertimeMonthly} onChange2={setP2OvertimeMonthly} />
                  <DualSelectField label="Pay Frequency" idPrefix="pay-frequency" value1={p1PayFrequency} onChange1={(v: any) => setP1PayFrequency(v)} value2={p2PayFrequency} onChange2={(v: any) => setP2PayFrequency(v)} options={["biweekly", "semimonthly", "monthly", "weekly"]} />
                  
                  <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
                    <div className="space-y-2">
                      <Label htmlFor="p1-first-pay-date">First Pay Date (Your)</Label>
                      <UIInput id="p1-first-pay-date" type="date" value={p1FirstPayDate} onChange={(e) => setP1FirstPayDate(e.target.value)} className="w-full" />
                    </div>
                    {isMarried && (
                      <div className="space-y-2">
                        <Label htmlFor="p2-first-pay-date">First Pay Date (Spouse)</Label>
                        <UIInput id="p2-first-pay-date" type="date" value={p2FirstPayDate} onChange={(e) => setP2FirstPayDate(e.target.value)} className="w-full" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Annual Pre-Tax Deductions</h4>
                <div className="space-y-4">
                  <DualInputField label="401(k) Contribution (Annual)" idPrefix="401k" value1={p1PreTax401k} onChange1={setP1PreTax401k} value2={p2PreTax401k} onChange2={setP2PreTax401k} />
                  <DualInputField label="Health Insurance Premium" idPrefix="health" value1={p1PreTaxHealthInsurance} onChange1={setP1PreTaxHealthInsurance} value2={p2PreTaxHealthInsurance} onChange2={setP2PreTaxHealthInsurance} />
                  <DualInputField label="HSA Contribution" idPrefix="hsa" value1={p1PreTaxHSA} onChange1={setP1PreTaxHSA} value2={p2PreTaxHSA} onChange2={setP2PreTaxHSA} />
                  <DualInputField label="FSA Contribution" idPrefix="fsa" value1={p1PreTaxFSA} onChange1={setP1PreTaxFSA} value2={p2PreTaxFSA} onChange2={setP2PreTaxFSA} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
            <CardHeader><CardTitle>Housing & Expenses</CardTitle></CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <Label htmlFor="housing-type">Housing Type</Label>
                        <Select value={housingType} onValueChange={(value: "rent" | "own") => setHousingType(value)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="rent">Rent</SelectItem><SelectItem value="own">Own</SelectItem></SelectContent>
                        </Select>
                    </div>
                    {housingType === "rent" ? (
                        <Input label="Monthly Rent" value={rentPayment} setter={setRentPayment} />
                    ) : (
                        <Input label="Monthly Mortgage" value={mortgagePayment} setter={setMortgagePayment} defaultValue={5859} />
                    )}
                    <Input label="Household Expenses" value={householdExpenses} setter={setHouseholdExpenses} />
                    <Input label="Discretionary" value={discretionarySpending} setter={setDiscretionarySpending} />
                </div>
            </CardContent>
        </Card>

        <div className="flex justify-center pb-8">
          <Button size="lg" onClick={handleCalculate} className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" /> Calculate 2026 Projections
          </Button>
        </div>

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
                              {chunk.map((p: any) => (
                                <th key={p.paycheckNum} className="text-right py-2 px-2 font-semibold min-w-[100px] border-l bg-background">
                                  #{p.paycheckNum} <br/><span className="text-[10px] font-normal text-muted-foreground">{p.personLabel}</span>
                                </th>
                              ))}
                            </tr>
                            <tr className="border-b">
                                <th className="text-left py-1 px-2 bg-background">Date</th>
                                {chunk.map((p: any) => <th key={p.paycheckNum} className="text-right py-1 px-2 border-l bg-background">{new Date(p.date + 'T12:00:00').toLocaleDateString('en-US', {month:'short', day:'numeric'})}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-muted/50">
                                <td className="py-1 px-2 font-medium">Total Gross</td>
                                {chunk.map((p: any) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">${(p.totalGross ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                            <tr className="hover:bg-muted/50 text-red-600">
                                <td className="py-1 px-2">Taxes & FICA</td>
                                {chunk.map((p: any) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">-${((p.totalFIT ?? 0) + (p.ss ?? 0) + (p.totalMed ?? 0)).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                             <tr className="hover:bg-muted/50 text-blue-600">
                                <td className="py-1 px-2">401k Contrib</td>
                                {chunk.map((p: any) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">-${(p.contribution401k ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
                            </tr>
                            <tr className="bg-muted/30 font-bold">
                                <td className="py-1 px-2">Net Remainder</td>
                                {chunk.map((p: any) => <td key={p.paycheckNum} className="text-right py-1 px-2 border-l">${(p.brokerageContribution ?? 0).toLocaleString(undefined, {maximumFractionDigits:0})}</td>)}
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
    </div>
  );
}
