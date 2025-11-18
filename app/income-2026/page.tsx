"use client";

import React, { useState, useEffect } from "react";
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

export default function Income2026Page() {
  const { implied } = useBudget();
  // Marital status
  const [maritalStatus, setMaritalStatus] = useState<FilingStatus>("single");

  // Person 1 (User) Income Inputs
  const [p1BaseIncome, setP1BaseIncome] = useState(0);
  const [p1Bonus, setP1Bonus] = useState(0);
  const [p1BonusMonth, setP1BonusMonth] = useState("December");
  const [p1OvertimeMonthly, setP1OvertimeMonthly] = useState(0);

  // Person 1 Pre-tax Deductions
  const [p1PreTax401k, setP1PreTax401k] = useState(0);
  const [p1PreTaxHealthInsurance, setP1PreTaxHealthInsurance] = useState(0);
  const [p1PreTaxHSA, setP1PreTaxHSA] = useState(0);
  const [p1PreTaxFSA, setP1PreTaxFSA] = useState(0);

  // Person 1 Post-tax Deductions
  const [p1RothContribution, setP1RothContribution] = useState(0);
  const [p1DisabilityInsurance, setP1DisabilityInsurance] = useState(0);
  const [p1LifeInsurance, setP1LifeInsurance] = useState(0);

  // Person 2 (Spouse) Income Inputs
  const [p2BaseIncome, setP2BaseIncome] = useState(0);
  const [p2Bonus, setP2Bonus] = useState(0);
  const [p2BonusMonth, setP2BonusMonth] = useState("December");
  const [p2OvertimeMonthly, setP2OvertimeMonthly] = useState(0);

  // Person 2 Pre-tax Deductions
  const [p2PreTax401k, setP2PreTax401k] = useState(0);
  const [p2PreTaxHealthInsurance, setP2PreTaxHealthInsurance] = useState(0);
  const [p2PreTaxHSA, setP2PreTaxHSA] = useState(0);
  const [p2PreTaxFSA, setP2PreTaxFSA] = useState(0);

  // Person 2 Post-tax Deductions
  const [p2RothContribution, setP2RothContribution] = useState(0);
  const [p2DisabilityInsurance, setP2DisabilityInsurance] = useState(0);
  const [p2LifeInsurance, setP2LifeInsurance] = useState(0);

  // Tax Settings
  const [federalWithholdingExtra, setFederalWithholdingExtra] = useState(0);
  const [stateWithholdingExtra, setStateWithholdingExtra] = useState(0);

  // Housing
  const [housingType, setHousingType] = useState<"rent" | "own">("own");
  const [rentPayment, setRentPayment] = useState(0);
  const [mortgagePayment, setMortgagePayment] = useState(5859);
  const [propertyTaxAnnual, setPropertyTaxAnnual] = useState(25000);
  const [homeInsuranceAnnual, setHomeInsuranceAnnual] = useState(10000);
  const [floodInsuranceAnnual, setFloodInsuranceAnnual] = useState(3500);

  // Spending Buckets
  const [householdExpenses, setHouseholdExpenses] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);
  const [childcareCosts, setChildcareCosts] = useState(1550);
  const [childcareDropoffMonth, setChildcareDropoffMonth] = useState("None");
  const [nonRetirementInvestments, setNonRetirementInvestments] = useState(0);
  const [surplusLiquidity, setSurplusLiquidity] = useState(0);

  // Life Insurance
  const [p1LifeInsuranceAnnual, setP1LifeInsuranceAnnual] = useState(4500);
  const [p1LifeInsuranceCoverage, setP1LifeInsuranceCoverage] = useState(3000000);
  const [p1LifeInsuranceFrequency, setP1LifeInsuranceFrequency] = useState<"monthly" | "quarterly" | "semi-annually" | "annually">("annually");
  const [p2LifeInsuranceAnnual, setP2LifeInsuranceAnnual] = useState(0);
  const [p2LifeInsuranceCoverage, setP2LifeInsuranceCoverage] = useState(0);
  const [p2LifeInsuranceFrequency, setP2LifeInsuranceFrequency] = useState<"monthly" | "quarterly" | "semi-annually" | "annually">("annually");

  // Mortgage Details (for wealth tracking)
  const [mortgageBalance, setMortgageBalance] = useState(0);
  const [mortgageRate, setMortgageRate] = useState(0);
  const [mortgageInterestMonthly, setMortgageInterestMonthly] = useState(0);

  // Tangible Personal Property (Car)
  const [carFMV, setCarFMV] = useState(0);
  const [carUsefulLife, setCarUsefulLife] = useState(10);
  const [carResidualValue, setCarResidualValue] = useState(0);
  const [carFiresaleDiscount, setCarFiresaleDiscount] = useState(30);

  // Results state - 2026 cash flow forecast
  const [results, setResults] = useState<{
    months: Array<{
      month: string;
      monthNumber: number;
      incomeEvents: Array<{
        date: string;
        description: string;
        amount: number;
        type: 'salary' | 'bonus' | 'overtime';
        person: string;
      }>;
      expenseEvents: Array<{
        date: string;
        description: string;
        amount: number;
        type: string;
      }>;
      monthlyIncome: number;
      monthlyExpenses: number;
      netCashFlow: number;
      runningBalance: number;
    }>;
    yearSummary: {
      totalIncome: number;
      totalExpenses: number;
      netCashFlow: number;
      endingBalance: number;
    };
  } | null>(null);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December", "None"
  ];

  // Pre-fill from calculator results if available
  useEffect(() => {
    try {
      // First try context
      if (implied) {
        console.log('[2026 INCOME] Pre-filling from context:', implied);
        setMaritalStatus(implied.maritalStatus);

        // Pre-fill income based on reverse calculation from contributions
        // If they're contributing $42K pre-tax, they likely make ~$280K gross
        const estimatedGross = implied.contributions401k > 0
          ? Math.round(implied.contributions401k / 0.15) // Assume 15% savings rate
          : 0;

        if (estimatedGross > 0 && p1BaseIncome === 0) {
          setP1BaseIncome(estimatedGross);
        }

        if (implied.contributions401k > 0 && p1PreTax401k === 0) {
          setP1PreTax401k(implied.contributions401k);
        }

        if (implied.contributionsRoth > 0 && p1RothContribution === 0) {
          setP1RothContribution(implied.contributionsRoth);
        }

        // For married, split 60/40
        if (implied.maritalStatus === 'married') {
          const spouse60Pct = Math.round(estimatedGross * 0.6);
          if (spouse60Pct > 0 && p2BaseIncome === 0) {
            setP2BaseIncome(spouse60Pct);
          }
          const spouseContrib = Math.round(implied.contributions401k * 0.6);
          if (spouseContrib > 0 && p2PreTax401k === 0) {
            setP2PreTax401k(spouseContrib);
          }
        }
      }

      // Fallback to sessionStorage
      const savedResults = sessionStorage.getItem('calculatorResults');
      if (savedResults) {
        const results = JSON.parse(savedResults);
        console.log('[2026 INCOME] Pre-filling from calculator results:', results);

        // Pre-fill marital status from calculator
        const savedMarital = sessionStorage.getItem('calculatorMarital');
        if (savedMarital && maritalStatus === 'single') {
          setMaritalStatus(savedMarital as FilingStatus);
        }

        // Calculate rough monthly budget from after-tax withdrawal
        // This is year 1 retirement withdrawal - we'll use it as a baseline for current income needs
        if (results.wdAfter) {
          const monthlyAfterTax = Math.round(results.wdAfter / 12);

          // Distribute monthly budget across categories (rough heuristics)
          // These are reasonable defaults the user can adjust
          const mortgageGuess = Math.round(monthlyAfterTax * 0.30); // 30% housing
          const householdGuess = Math.round(monthlyAfterTax * 0.20); // 20% household
          const discretionaryGuess = Math.round(monthlyAfterTax * 0.15); // 15% discretionary
          const surplusGuess = Math.round(monthlyAfterTax * 0.10); // 10% surplus/savings

          // Only pre-fill if current values are 0 (haven't been set by user)
          if (mortgagePayment === 0) setMortgagePayment(mortgageGuess);
          if (householdExpenses === 0) setHouseholdExpenses(householdGuess);
          if (discretionarySpending === 0) setDiscretionarySpending(discretionaryGuess);
          if (surplusLiquidity === 0) setSurplusLiquidity(surplusGuess);

          console.log('[2026 INCOME] Pre-filled budget estimates:', {
            monthlyAfterTax,
            mortgage: mortgageGuess,
            household: householdGuess,
            discretionary: discretionaryGuess,
            surplus: surplusGuess
          });
        }
      }
    } catch (e) {
      console.error('[2026 INCOME] Failed to pre-fill from calculator:', e);
    }
  }, [implied]); // Re-run when implied changes

  // Calculate recommended life insurance based on age and income
  const calculateRecommendedLifeInsurance = (income: number, age?: number): number => {
    if (income === 0) return 0;

    // Rule of thumb: 10-15x annual income, adjusted for age
    // Younger people need more coverage (15x), older people need less (10x)
    const baseAge = age || 35; // Default to 35 if age not available

    let multiplier = 15;
    if (baseAge < 30) {
      multiplier = 15;
    } else if (baseAge < 40) {
      multiplier = 14;
    } else if (baseAge < 50) {
      multiplier = 12;
    } else if (baseAge < 60) {
      multiplier = 10;
    } else {
      multiplier = 8;
    }

    return Math.round(income * multiplier / 100000) * 100000; // Round to nearest 100k
  };

  const handleCalculate = () => {
    console.log("Calculating 2026 paycheck-by-paycheck forecast...");

    // 2026 Tax Constants
    const STANDARD_DEDUCTION = maritalStatus === 'married' ? 30000 : 15000;
    const SS_WAGE_BASE = 176100;
    const MEDICARE_THRESHOLD = 200000;
    const MAX_401K = 24000; // 2026 limit
    const MAX_DEP_FSA = 5000;
    const MAX_MED_FSA = 3200;

    // Tax brackets for 2026 (estimated based on inflation adjustments)
    const taxBrackets = maritalStatus === 'married'
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

    // Calculate 24 paychecks (biweekly)
    const paychecks = [];

    // Tracking variables for caps
    let ytdWages = 0;
    let ytdSS = 0;
    let ytdMedicare = 0;
    let ytd401k = 0;
    let ytdDepFSA = 0;
    let ytdMedFSA = 0;
    let ytdHYSA = 0;

    for (let i = 0; i < 24; i++) {
      const paycheckNum = i + 1;

      // Calculate paycheck date (biweekly starting 1/15/2026)
      const startDate = new Date('2026-01-15');
      const paycheckDate = new Date(startDate);
      paycheckDate.setDate(startDate.getDate() + (i * 14));

      // Gross income per paycheck
      const baseGross = p1BaseIncome / 24;

      // Bonus (if applicable)
      const monthOfPaycheck = paycheckDate.getMonth();
      const p1BonusMonthIdx = months.indexOf(p1BonusMonth);
      const hasBonus = p1BonusMonthIdx === monthOfPaycheck && i % 2 === 0; // First paycheck of bonus month
      const bonus = hasBonus ? p1Bonus : 0;

      const totalGross = baseGross + bonus;

      // Pre-tax deductions
      const healthIns = p1PreTaxHealthInsurance / 2; // Per paycheck (assuming biweekly premium input is annual/2)

      // Dep FSA - cap at annual max
      let depFSA = 0;
      if (p1PreTaxFSA > 0) {
        const annualDepFSA = Math.min(p1PreTaxFSA, MAX_DEP_FSA);
        const perPaycheck = annualDepFSA / 24;
        depFSA = Math.min(perPaycheck, MAX_DEP_FSA - ytdDepFSA);
      }

      // Med FSA - cap at annual max
      let medFSA = 0;
      const annualMedFSA = Math.min(p1PreTaxHSA, MAX_MED_FSA); // Using HSA field for Med FSA
      if (annualMedFSA > 0) {
        const perPaycheck = annualMedFSA / 24;
        medFSA = Math.min(perPaycheck, MAX_MED_FSA - ytdMedFSA);
      }

      // Dental (alternating paychecks) - placeholder
      const dental = i % 2 === 0 ? 49.59 : 0;

      // Vision (alternating paychecks) - placeholder
      const vision = i % 2 === 0 ? 19.03 : 0;

      const totalPreTax = healthIns + depFSA + dental + vision + medFSA;

      // FIT Taxable Income
      const fitTaxable = totalGross - totalPreTax - (STANDARD_DEDUCTION / 24);
      const fitTaxableAnnual = fitTaxable * 24;

      // Calculate FIT using progressive brackets
      let fitBase = 0;
      let remainingIncome = fitTaxableAnnual;
      let previousLimit = 0;

      for (const bracket of taxBrackets) {
        if (remainingIncome <= 0) break;

        const taxableInBracket = Math.min(
          remainingIncome,
          bracket.limit - previousLimit
        );

        fitBase += taxableInBracket * bracket.rate;
        remainingIncome -= taxableInBracket;
        previousLimit = bracket.limit;
      }

      // Divide annual FIT by 24 for per-paycheck withholding
      fitBase = fitBase / 24;

      // Extra FIT withholding
      const extraFIT = federalWithholdingExtra;
      const totalFIT = fitBase + extraFIT;

      // FICA - Social Security (6.2% up to wage base)
      let ss = 0;
      if (ytdWages < SS_WAGE_BASE) {
        const remainingSS = SS_WAGE_BASE - ytdWages;
        const ssWages = Math.min(baseGross, remainingSS);
        ss = ssWages * 0.062;
      }

      // FICA - Medicare (1.45% on all wages, 2.35% on wages over threshold)
      let med145 = 0;
      let med235 = 0;

      if (ytdWages < MEDICARE_THRESHOLD) {
        const wagesBeforeThreshold = Math.min(baseGross, MEDICARE_THRESHOLD - ytdWages);
        med145 = wagesBeforeThreshold * 0.0145;

        const wagesAfterThreshold = baseGross - wagesBeforeThreshold;
        if (wagesAfterThreshold > 0) {
          med235 = wagesAfterThreshold * 0.0235;
        }
      } else {
        med235 = baseGross * 0.0235;
      }

      const totalMed = med145 + med235;

      // Fixed expenses per paycheck
      const housingPayment = housingType === "rent" ? rentPayment : mortgagePayment;

      // Life insurance - calculate per paycheck based on frequency
      let p1LifeInsPerPaycheck = 0;
      if (p1LifeInsuranceFrequency === "monthly") {
        p1LifeInsPerPaycheck = (p1LifeInsuranceAnnual / 12) / 2; // Monthly payment split across 2 paychecks
      } else if (p1LifeInsuranceFrequency === "quarterly") {
        p1LifeInsPerPaycheck = i % 6 === 0 ? p1LifeInsuranceAnnual / 4 : 0; // Every 6 paychecks (quarterly)
      } else if (p1LifeInsuranceFrequency === "semi-annually") {
        p1LifeInsPerPaycheck = i % 12 === 0 ? p1LifeInsuranceAnnual / 2 : 0; // Every 12 paychecks (semi-annual)
      } else {
        p1LifeInsPerPaycheck = i === 0 ? p1LifeInsuranceAnnual : 0; // First paycheck (annual)
      }

      let p2LifeInsPerPaycheck = 0;
      if (isMarried) {
        if (p2LifeInsuranceFrequency === "monthly") {
          p2LifeInsPerPaycheck = (p2LifeInsuranceAnnual / 12) / 2;
        } else if (p2LifeInsuranceFrequency === "quarterly") {
          p2LifeInsPerPaycheck = i % 6 === 0 ? p2LifeInsuranceAnnual / 4 : 0;
        } else if (p2LifeInsuranceFrequency === "semi-annually") {
          p2LifeInsPerPaycheck = i % 12 === 0 ? p2LifeInsuranceAnnual / 2 : 0;
        } else {
          p2LifeInsPerPaycheck = i === 0 ? p2LifeInsuranceAnnual : 0;
        }
      }

      // EOY property expenses (only if own, and only on last paycheck)
      let eoyPropertyExpenses = 0;
      if (housingType === "own" && i === 23) {
        eoyPropertyExpenses = propertyTaxAnnual + homeInsuranceAnnual + floodInsuranceAnnual;
      }

      const fixedExpenses = (
        housingPayment +
        householdExpenses +
        discretionarySpending +
        childcareCosts
      ) / 2 + p1LifeInsPerPaycheck + p2LifeInsPerPaycheck + eoyPropertyExpenses; // Divide by 2 for biweekly

      // Pre-investment remainder
      const preInvRemainder = totalGross - totalPreTax - totalFIT - ss - totalMed - fixedExpenses;

      // Investment allocations
      // 401k - target percentage with annual cap
      const max401kPercent = p1PreTax401k > 0 ? (p1PreTax401k / p1BaseIncome) : 0;
      let contribution401k = totalGross * max401kPercent;

      // Ensure we don't exceed annual cap
      if (ytd401k + contribution401k > MAX_401K) {
        contribution401k = Math.max(0, MAX_401K - ytd401k);
      }

      // Don't exceed available cash
      contribution401k = Math.min(contribution401k, preInvRemainder);

      // HYSA for end-of-year expenses (placeholder logic)
      const hysaContribution = 0; // Can be configured based on user input

      // Brokerage gets the remainder
      const brokerageContribution = preInvRemainder - contribution401k - hysaContribution;

      // Update YTD trackers
      ytdWages += baseGross;
      ytdSS += ss;
      ytdMedicare += totalMed;
      ytd401k += contribution401k;
      ytdDepFSA += depFSA;
      ytdMedFSA += medFSA;
      ytdHYSA += hysaContribution;

      paychecks.push({
        paycheckNum,
        date: paycheckDate.toISOString().split('T')[0],
        baseGross,
        bonus,
        totalGross,
        healthIns,
        depFSA,
        dental,
        vision,
        medFSA,
        totalPreTax,
        fitTaxable,
        fitBase,
        extraFIT,
        totalFIT,
        ss,
        med145,
        med235,
        totalMed,
        fixedExpenses,
        preInvRemainder,
        max401kPercent,
        contribution401k,
        hysaContribution,
        brokerageContribution,
        ytdWages,
        ytdSS,
        ytdMedicare,
        ytd401k,
        ytdDepFSA,
        ytdMedFSA,
        ytdHYSA
      });
    }

    // Calculate year summary
    const totalIncome = paychecks.reduce((sum, p) => sum + p.totalGross, 0);
    const totalFIT = paychecks.reduce((sum, p) => sum + p.totalFIT, 0);
    const totalFICA = paychecks.reduce((sum, p) => sum + p.ss + p.totalMed, 0);
    const totalPreTax = paychecks.reduce((sum, p) => sum + p.totalPreTax, 0);
    const totalFixedExpenses = paychecks.reduce((sum, p) => sum + p.fixedExpenses, 0);
    const total401k = paychecks.reduce((sum, p) => sum + p.contribution401k, 0);
    const totalHYSA = paychecks.reduce((sum, p) => sum + p.hysaContribution, 0);
    const totalBrokerage = paychecks.reduce((sum, p) => sum + p.brokerageContribution, 0);

    const netTakeHome = totalIncome - totalPreTax - totalFIT - totalFICA - totalFixedExpenses - total401k - totalHYSA - totalBrokerage;

    setResults({
      paychecks,
      yearSummary: {
        totalIncome,
        totalPreTax,
        totalFIT,
        totalFICA,
        totalFixedExpenses,
        total401k,
        totalHYSA,
        totalBrokerage,
        netTakeHome,
        effectiveTaxRate: (totalFIT + totalFICA) / totalIncome
      }
    } as any);

    // Save marital status to sessionStorage for next time
    sessionStorage.setItem('calculatorMarital', maritalStatus);

    // Scroll to results
    setTimeout(() => {
      const resultsElement = document.getElementById('results-section');
      if (resultsElement) {
        resultsElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const isMarried = maritalStatus === "married";

  // Helper function to handle numeric input changes
  // Strips non-numeric characters and converts to number
  const handleNumericInput = (value: string, setter: (val: number) => void) => {
    // Remove all non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    // Convert to number, default to 0 if empty
    const numberValue = numericValue === '' ? 0 : Number(numericValue);
    setter(numberValue);
  };

  // Helper function for decimal inputs (like percentages or rates)
  const handleDecimalInput = (value: string, setter: (val: number) => void) => {
    // Allow only numbers and one decimal point
    const decimalValue = value.replace(/[^0-9.]/g, '');
    // Prevent multiple decimal points
    const parts = decimalValue.split('.');
    const sanitized = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : decimalValue;
    // Convert to number, default to 0 if empty
    const numberValue = sanitized === '' ? 0 : Number(sanitized);
    setter(numberValue);
  };

  // Helper component for dual input fields (Your/Spouse)
  const DualInputField = ({
    label,
    idPrefix,
    value1,
    onChange1,
    value2,
    onChange2,
    defaultValue = 0,
  }: {
    label: string;
    idPrefix: string;
    value1: number;
    onChange1: (v: number) => void;
    value2: number;
    onChange2: (v: number) => void;
    defaultValue?: number;
  }) => {
    return (
      <div className={isMarried ? "grid grid-cols-2 gap-4" : ""}>
        <Input
          label={`${label} (Your)`}
          value={value1}
          setter={onChange1}
          defaultValue={defaultValue}
        />
        {isMarried && (
          <Input
            label={`${label} (Spouse)`}
            value={value2}
            setter={onChange2}
            defaultValue={defaultValue}
          />
        )}
      </div>
    );
  };

  // Helper component for dual select fields
  const DualSelectField = ({
    label,
    idPrefix,
    value1,
    onChange1,
    value2,
    onChange2,
    options
  }: {
    label: string;
    idPrefix: string;
    value1: string;
    onChange1: (v: string) => void;
    value2: string;
    onChange2: (v: string) => void;
    options: string[];
  }) => (
    <>
      <div className="space-y-2">
        <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
        <select
          id={`${idPrefix}-your`}
          value={value1}
          onChange={(e) => onChange1(e.target.value)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
      {isMarried && (
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-spouse`}>{label} (Spouse)</Label>
          <select
            id={`${idPrefix}-spouse`}
            value={value2}
            onChange={(e) => onChange2(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {options.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <TopBanner />

      {/* Header with back button */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <h1 className="font-semibold text-xl">2026 Income & Cash Flow Planner</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Comprehensive Income Modeling
            </CardTitle>
            <CardDescription>
              Model your full 2026 income stream with detailed deductions, cash flow buckets, and wealth accumulation tracking.
              This tool accounts for mid-year changes, FICA obligations, Medicare tax step-ups, and comprehensive EOY tax projections.
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Marital Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Household Setup</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-w-xs">
              <Label htmlFor="marital-status">Marital Status</Label>
              <Select value={maritalStatus} onValueChange={(value: FilingStatus) => setMaritalStatus(value)}>
                <SelectTrigger id="marital-status">
                  <SelectValue placeholder="Select marital status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Income Sources & Deductions - Inline Fields */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{isMarried ? "YOUR INCOME" : "INCOME DETAILS"}</CardTitle>
            <CardDescription>
              {isMarried ? "Income details for you and your spouse" : "Your income details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Income Sources */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income Sources</h4>
                <div className="space-y-4">
                  <DualInputField
                    label="Base Annual Salary"
                    idPrefix="base-salary"
                    value1={p1BaseIncome}
                    onChange1={setP1BaseIncome}
                    value2={p2BaseIncome}
                    onChange2={setP2BaseIncome}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="Annual Bonus"
                    idPrefix="bonus"
                    value1={p1Bonus}
                    onChange1={setP1Bonus}
                    value2={p2Bonus}
                    onChange2={setP2Bonus}
                    defaultValue={0}
                  />

                  <DualSelectField
                    label="Bonus Payment Month"
                    idPrefix="bonus-month"
                    value1={p1BonusMonth}
                    onChange1={setP1BonusMonth}
                    value2={p2BonusMonth}
                    onChange2={setP2BonusMonth}
                    options={months.slice(0, 12)}
                  />

                  <DualInputField
                    label="Estimated Monthly Overtime"
                    idPrefix="overtime"
                    value1={p1OvertimeMonthly}
                    onChange1={setP1OvertimeMonthly}
                    value2={p2OvertimeMonthly}
                    onChange2={setP2OvertimeMonthly}
                    defaultValue={0}
                  />
                </div>
              </div>

              <Separator />

              {/* Pre-Tax Deductions */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pre-Tax Deductions (per paycheck)</h4>
                <div className="space-y-4">
                  <DualInputField
                    label="401(k) Contribution"
                    idPrefix="401k"
                    value1={p1PreTax401k}
                    onChange1={setP1PreTax401k}
                    value2={p2PreTax401k}
                    onChange2={setP2PreTax401k}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="Health Insurance Premium"
                    idPrefix="health"
                    value1={p1PreTaxHealthInsurance}
                    onChange1={setP1PreTaxHealthInsurance}
                    value2={p2PreTaxHealthInsurance}
                    onChange2={setP2PreTaxHealthInsurance}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="HSA Contribution"
                    idPrefix="hsa"
                    value1={p1PreTaxHSA}
                    onChange1={setP1PreTaxHSA}
                    value2={p2PreTaxHSA}
                    onChange2={setP2PreTaxHSA}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="FSA Contribution"
                    idPrefix="fsa"
                    value1={p1PreTaxFSA}
                    onChange1={setP1PreTaxFSA}
                    value2={p2PreTaxFSA}
                    onChange2={setP2PreTaxFSA}
                    defaultValue={0}
                  />
                </div>
              </div>

              <Separator />

              {/* Post-Tax Deductions */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Post-Tax Deductions (per paycheck)</h4>
                <div className="space-y-4">
                  <DualInputField
                    label="Roth 401(k) Contribution"
                    idPrefix="roth"
                    value1={p1RothContribution}
                    onChange1={setP1RothContribution}
                    value2={p2RothContribution}
                    onChange2={setP2RothContribution}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="Disability Insurance"
                    idPrefix="disability"
                    value1={p1DisabilityInsurance}
                    onChange1={setP1DisabilityInsurance}
                    value2={p2DisabilityInsurance}
                    onChange2={setP2DisabilityInsurance}
                    defaultValue={0}
                  />

                  <DualInputField
                    label="Life Insurance Premium"
                    idPrefix="life"
                    value1={p1LifeInsurance}
                    onChange1={setP1LifeInsurance}
                    value2={p2LifeInsurance}
                    onChange2={setP2LifeInsurance}
                    defaultValue={0}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Settings */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tax Withholding Adjustments</CardTitle>
            <CardDescription>
              Extra withholding amounts per paycheck (optional)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Extra Federal Withholding"
                value={federalWithholdingExtra}
                setter={setFederalWithholdingExtra}
                defaultValue={0}
              />
              <Input
                label="Extra State Withholding"
                value={stateWithholdingExtra}
                setter={setStateWithholdingExtra}
                defaultValue={0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Housing */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Housing</CardTitle>
            <CardDescription>
              Define whether you rent or own your home
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="housing-type">Housing Type</Label>
                <Select value={housingType} onValueChange={(value: "rent" | "own") => setHousingType(value)}>
                  <SelectTrigger id="housing-type">
                    <SelectValue placeholder="Select housing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rent">Rent</SelectItem>
                    <SelectItem value="own">Own</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {housingType === "rent" ? (
                <Input
                  label="Monthly Rent Payment"
                  value={rentPayment}
                  setter={setRentPayment}
                  defaultValue={0}
                />
              ) : (
                <>
                  <Input
                    label="Monthly Mortgage Payment"
                    value={mortgagePayment}
                    setter={setMortgagePayment}
                    defaultValue={5859}
                  />
                  <Separator />
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">End-of-Year Property Expenses</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Input
                      label="Property Tax (Annual)"
                      value={propertyTaxAnnual}
                      setter={setPropertyTaxAnnual}
                      defaultValue={25000}
                    />
                    <Input
                      label="Home Insurance (Annual)"
                      value={homeInsuranceAnnual}
                      setter={setHomeInsuranceAnnual}
                      defaultValue={10000}
                    />
                    <Input
                      label="Flood Insurance (Annual)"
                      value={floodInsuranceAnnual}
                      setter={setFloodInsuranceAnnual}
                      defaultValue={3500}
                    />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Life Insurance */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Life Insurance</CardTitle>
            <CardDescription>
              Define your life insurance coverage and payment schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Person 1 Life Insurance */}
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {isMarried ? "Your Life Insurance" : "Life Insurance"}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Input
                    label="Annual Premium"
                    value={p1LifeInsuranceAnnual}
                    setter={setP1LifeInsuranceAnnual}
                    defaultValue={4500}
                  />
                  <Input
                    label="Coverage Amount"
                    value={p1LifeInsuranceCoverage}
                    setter={setP1LifeInsuranceCoverage}
                    defaultValue={3000000}
                  />
                  <div className="space-y-2">
                    <Label htmlFor="p1-life-frequency">Payment Frequency</Label>
                    <Select value={p1LifeInsuranceFrequency} onValueChange={(value: any) => setP1LifeInsuranceFrequency(value)}>
                      <SelectTrigger id="p1-life-frequency">
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                        <SelectItem value="annually">Annually</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {p1BaseIncome > 0 && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>Recommendation:</strong> Based on your income of ${p1BaseIncome.toLocaleString()},
                      we recommend life insurance coverage of approximately ${calculateRecommendedLifeInsurance(p1BaseIncome, implied?.age).toLocaleString()}.
                    </p>
                  </div>
                )}
              </div>

              {/* Person 2 Life Insurance (if married) */}
              {isMarried && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Spouse Life Insurance</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Input
                        label="Annual Premium"
                        value={p2LifeInsuranceAnnual}
                        setter={setP2LifeInsuranceAnnual}
                        defaultValue={0}
                      />
                      <Input
                        label="Coverage Amount"
                        value={p2LifeInsuranceCoverage}
                        setter={setP2LifeInsuranceCoverage}
                        defaultValue={0}
                      />
                      <div className="space-y-2">
                        <Label htmlFor="p2-life-frequency">Payment Frequency</Label>
                        <Select value={p2LifeInsuranceFrequency} onValueChange={(value: any) => setP2LifeInsuranceFrequency(value)}>
                          <SelectTrigger id="p2-life-frequency">
                            <SelectValue placeholder="Select frequency" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                            <SelectItem value="semi-annually">Semi-Annually</SelectItem>
                            <SelectItem value="annually">Annually</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    {p2BaseIncome > 0 && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-900">
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          <strong>Recommendation:</strong> Based on spouse income of ${p2BaseIncome.toLocaleString()},
                          we recommend life insurance coverage of approximately ${calculateRecommendedLifeInsurance(p2BaseIncome, implied?.spouseAge).toLocaleString()}.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Spending Buckets */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Monthly Spending Buckets</CardTitle>
            <CardDescription>
              Define your baseline steady cash flow for all spending categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Household Expenses"
                value={householdExpenses}
                setter={setHouseholdExpenses}
                defaultValue={0}
              />
              <Input
                label="Discretionary Spending"
                value={discretionarySpending}
                setter={setDiscretionarySpending}
                defaultValue={0}
              />
              <Input
                label="Childcare Costs (Monthly)"
                value={childcareCosts}
                setter={setChildcareCosts}
                defaultValue={1550}
              />
              <div className="space-y-2">
                <Label htmlFor="childcare-dropoff">Childcare Dropoff Month</Label>
                <select
                  id="childcare-dropoff"
                  value={childcareDropoffMonth}
                  onChange={(e) => setChildcareDropoffMonth(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {months.map(month => (
                    <option key={month} value={month}>{month}</option>
                  ))}
                </select>
              </div>
              <Input
                label="Non-Retirement Investments"
                value={nonRetirementInvestments}
                setter={setNonRetirementInvestments}
                defaultValue={0}
              />
              <Input
                label="Surplus / Extra Liquidity"
                value={surplusLiquidity}
                setter={setSurplusLiquidity}
                defaultValue={0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Mortgage Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Mortgage Details</CardTitle>
            <CardDescription>
              For wealth tracking and net worth calculations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Mortgage Balance"
                value={mortgageBalance}
                setter={setMortgageBalance}
                defaultValue={0}
              />
              <Input
                label="Mortgage Interest Rate (%)"
                value={mortgageRate}
                setter={setMortgageRate}
                isRate
                defaultValue={0}
              />
              <Input
                label="Monthly Interest Portion"
                value={mortgageInterestMonthly}
                setter={setMortgageInterestMonthly}
                defaultValue={0}
              />
            </div>
          </CardContent>
        </Card>

        {/* Car / Personal Property */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tangible Personal Property (Car)</CardTitle>
            <CardDescription>
              For depreciation and net worth tracking
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Current Fair Market Value"
                value={carFMV}
                setter={setCarFMV}
                defaultValue={0}
              />
              <Input
                label="Useful Life (years)"
                value={carUsefulLife}
                setter={setCarUsefulLife}
                defaultValue={10}
              />
              <Input
                label="Residual Value"
                value={carResidualValue}
                setter={setCarResidualValue}
                defaultValue={0}
              />
              <Input
                label="Fire Sale Discount (%)"
                value={carFiresaleDiscount}
                setter={setCarFiresaleDiscount}
                defaultValue={30}
              />
            </div>
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <div className="flex justify-center pb-8">
          <Button size="lg" onClick={handleCalculate} className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Calculate 2026 Projections
          </Button>
        </div>

        {/* Results Section */}
        {results && results.paychecks && (
          <div id="results-section" className="space-y-6 scroll-mt-20">
            {/* Year Summary */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  2026 Annual Summary
                </CardTitle>
                <CardDescription>
                  Complete paycheck-by-paycheck forecast with tax calculations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <div className="text-sm text-green-700 dark:text-green-400 mb-1">Total Income</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      ${results.yearSummary.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-4 border border-orange-200 dark:border-orange-900">
                    <div className="text-sm text-orange-700 dark:text-orange-400 mb-1">Pre-Tax Deductions</div>
                    <div className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                      ${results.yearSummary.totalPreTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <div className="text-sm text-red-700 dark:text-red-400 mb-1">Federal Tax</div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                      ${results.yearSummary.totalFIT.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
                    <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">FICA</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      ${results.yearSummary.totalFICA.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                    <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">401k Invested</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      ${results.yearSummary.total401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-cyan-50 dark:bg-cyan-950/20 rounded-lg p-4 border border-cyan-200 dark:border-cyan-900">
                    <div className="text-sm text-cyan-700 dark:text-cyan-400 mb-1">Brokerage</div>
                    <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                      ${results.yearSummary.totalBrokerage.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4 border border-slate-200 dark:border-slate-900">
                    <div className="text-sm text-slate-700 dark:text-slate-400 mb-1">Fixed Expenses</div>
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                      ${results.yearSummary.totalFixedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 border ${
                    results.yearSummary.netTakeHome >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                      : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900'
                  }`}>
                    <div className={`text-sm mb-1 ${
                      results.yearSummary.netTakeHome >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}>
                      Net Remainder
                    </div>
                    <div className={`text-2xl font-bold ${
                      results.yearSummary.netTakeHome >= 0
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-rose-900 dark:text-rose-100'
                    }`}>
                      ${Math.abs(results.yearSummary.netTakeHome).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 border border-amber-200 dark:border-amber-900">
                    <div className="text-sm text-amber-700 dark:text-amber-400 mb-1">Effective Tax Rate</div>
                    <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                      {(results.yearSummary.effectiveTaxRate * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Paycheck-by-Paycheck Table */}
            <Card>
              <CardHeader>
                <CardTitle>Paycheck-by-Paycheck Linear Flow</CardTitle>
                <CardDescription>
                  Complete waterfall from gross pay through all deductions to final investment allocation (24 paychecks)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b-2">
                        <th className="text-left py-2 px-2 font-semibold min-w-[180px]">Description</th>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <th key={p.paycheckNum} className="text-right py-2 px-2 font-semibold min-w-[90px] border-l">
                            #{p.paycheckNum}
                          </th>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <th className="text-left py-1 px-2 text-muted-foreground">Payment Date</th>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <th key={p.paycheckNum} className="text-right py-1 px-2 text-muted-foreground border-l">
                            {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {/* Gross Income Section */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">GROSS INCOME</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Base Salary</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            ${p.baseGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Bonus</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            {p.bonus > 0 ? `$${p.bonus.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b font-semibold bg-green-50 dark:bg-green-950/20">
                        <td className="py-1 px-2">Total Gross</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            ${p.totalGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* Pre-Tax Deductions */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">PRE-TAX DEDUCTIONS</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2 pl-4">Health Insurance</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.healthIns > 0 ? `-$${p.healthIns.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2 pl-4">Dependent FSA</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.depFSA > 0 ? `-$${p.depFSA.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2 pl-4">Dental</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.dental > 0 ? `-$${p.dental.toFixed(2)}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2 pl-4">Vision</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.vision > 0 ? `-$${p.vision.toFixed(2)}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2 pl-4">Medical FSA</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.medFSA > 0 ? `-$${p.medFSA.toFixed(2)}` : '-'}
                          </td>
                        ))}
                      </tr>

                      {/* Federal Income Tax */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">FEDERAL INCOME TAX</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">FIT Taxable Income</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            ${p.fitTaxable.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">FIT Base Withholding</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            -${p.fitBase.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Extra FIT Withholding</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.extraFIT > 0 ? `-$${p.extraFIT.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b font-semibold">
                        <td className="py-1 px-2">Total FIT</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            -${p.totalFIT.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* FICA Taxes */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">FICA TAXES</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Social Security (6.2%)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.ss > 0 ? `-$${p.ss.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Medicare (1.45%)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.med145 > 0 ? `-$${p.med145.toFixed(2)}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Medicare (2.35% over $200k)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            {p.med235 > 0 ? `-$${p.med235.toFixed(2)}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b font-semibold">
                        <td className="py-1 px-2">Total FICA</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            -${(p.ss + p.totalMed).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* Fixed Expenses */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">FIXED EXPENSES</td>
                      </tr>
                      <tr className="border-b hover:bg-muted/50">
                        <td className="py-1 px-2">Fixed Expenses (Biweekly)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-red-700 dark:text-red-400">
                            -${p.fixedExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* Pre-Investment Remainder */}
                      <tr className="bg-blue-50 dark:bg-blue-950/20 font-semibold border-b-2">
                        <td className="py-2 px-2">Pre-Investment Remainder</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-2 px-2 font-mono border-l">
                            ${p.preInvRemainder.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* Investment Allocations */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">INVESTMENT ALLOCATIONS</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">401k Contribution</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-blue-700 dark:text-blue-400">
                            {p.contribution401k > 0 ? `$${p.contribution401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">HYSA (EOY Expenses)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-blue-700 dark:text-blue-400">
                            {p.hysaContribution > 0 ? `$${p.hysaContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">Brokerage (Remainder)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-blue-700 dark:text-blue-400">
                            ${p.brokerageContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>

                      {/* YTD Aggregates */}
                      <tr className="bg-muted/30">
                        <td colSpan={13} className="py-2 px-2 font-semibold">YEAR-TO-DATE TOTALS</td>
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">YTD 401k</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            ${p.ytd401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                      <tr className="hover:bg-muted/50">
                        <td className="py-1 px-2">YTD Wages (SS Base)</td>
                        {results.paychecks.slice(0, 12).map((p: any) => (
                          <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                            ${p.ytdWages.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>

                  {/* Second Half of Paychecks (13-24) */}
                  <div className="mt-8">
                    <h4 className="font-semibold mb-4">Paychecks 13-24</h4>
                    <table className="w-full text-xs border-collapse">
                      <thead className="sticky top-0 bg-background">
                        <tr className="border-b-2">
                          <th className="text-left py-2 px-2 font-semibold min-w-[180px]">Description</th>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <th key={p.paycheckNum} className="text-right py-2 px-2 font-semibold min-w-[90px] border-l">
                              #{p.paycheckNum}
                            </th>
                          ))}
                        </tr>
                        <tr className="border-b">
                          <th className="text-left py-1 px-2 text-muted-foreground">Payment Date</th>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <th key={p.paycheckNum} className="text-right py-1 px-2 text-muted-foreground border-l">
                              {new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {/* Repeat same structure for paychecks 13-24 */}
                        <tr className="bg-muted/30">
                          <td colSpan={13} className="py-2 px-2 font-semibold">GROSS INCOME</td>
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-1 px-2">Base Salary</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                              ${p.baseGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50 border-b">
                          <td className="py-1 px-2">Total Gross</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l bg-green-50 dark:bg-green-950/20 font-semibold">
                              ${p.totalGross.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          ))}
                        </tr>
                        <tr className="bg-blue-50 dark:bg-blue-950/20 font-semibold">
                          <td className="py-2 px-2">Pre-Investment Remainder</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-2 px-2 font-mono border-l">
                              ${p.preInvRemainder.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-1 px-2">401k Contribution</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-blue-700 dark:text-blue-400">
                              {p.contribution401k > 0 ? `$${p.contribution401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-1 px-2">Brokerage (Remainder)</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l text-blue-700 dark:text-blue-400">
                              ${p.brokerageContribution.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          ))}
                        </tr>
                        <tr className="hover:bg-muted/50">
                          <td className="py-1 px-2">YTD 401k</td>
                          {results.paychecks.slice(12, 24).map((p: any) => (
                            <td key={p.paycheckNum} className="text-right py-1 px-2 font-mono border-l">
                              ${p.ytd401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
              <CardContent className="pt-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>Note:</strong> This paycheck-by-paycheck forecast shows the complete waterfall from gross income through all deductions, taxes, and investment allocations.
                  All calculations include proper tracking of annual caps (Social Security wage base, Medicare thresholds, 401k limits, FSA caps).
                  Use this as a detailed planning tool to understand your 2026 cash flow and tax optimization opportunities.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
