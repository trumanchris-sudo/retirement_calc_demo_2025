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

  // Spending Buckets
  const [mortgagePayment, setMortgagePayment] = useState(0);
  const [householdExpenses, setHouseholdExpenses] = useState(0);
  const [discretionarySpending, setDiscretionarySpending] = useState(0);
  const [childcareCosts, setChildcareCosts] = useState(0);
  const [childcareDropoffMonth, setChildcareDropoffMonth] = useState("None");
  const [nonRetirementInvestments, setNonRetirementInvestments] = useState(0);
  const [surplusLiquidity, setSurplusLiquidity] = useState(0);

  // Mortgage Details (for wealth tracking)
  const [mortgageBalance, setMortgageBalance] = useState(0);
  const [mortgageRate, setMortgageRate] = useState(0);
  const [mortgageInterestMonthly, setMortgageInterestMonthly] = useState(0);

  // Tangible Personal Property (Car)
  const [carFMV, setCarFMV] = useState(0);
  const [carUsefulLife, setCarUsefulLife] = useState(10);
  const [carResidualValue, setCarResidualValue] = useState(0);
  const [carFiresaleDiscount, setCarFiresaleDiscount] = useState(30);

  // Results state
  const [results, setResults] = useState<{
    grossIncome: number;
    preTaxDeductions: number;
    taxableIncome: number;
    federalTax: number;
    stateTax: number;
    postTaxDeductions: number;
    netMonthlyIncome: number;
    totalMonthlyExpenses: number;
    monthlySurplus: number;
    annualSummary: {
      grossAnnual: number;
      netAnnual: number;
      taxes: number;
      retirement401k: number;
      rothContributions: number;
      investments: number;
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

  const handleCalculate = () => {
    console.log("Calculating 2026 income projections...");

    // Calculate gross annual income
    const p1Annual = p1BaseIncome + p1Bonus + (p1OvertimeMonthly * 12);
    const p2Annual = isMarried ? p2BaseIncome + p2Bonus + (p2OvertimeMonthly * 12) : 0;
    const grossAnnual = p1Annual + p2Annual;

    // Calculate pre-tax deductions (annual)
    const p1PreTaxAnnual = p1PreTax401k + p1PreTaxHealthInsurance + p1PreTaxHSA + p1PreTaxFSA;
    const p2PreTaxAnnual = isMarried ? p2PreTax401k + p2PreTaxHealthInsurance + p2PreTaxHSA + p2PreTaxFSA : 0;
    const totalPreTaxDeductions = p1PreTaxAnnual + p2PreTaxAnnual;

    // Calculate taxable income
    const taxableIncome = grossAnnual - totalPreTaxDeductions;

    // Simplified tax estimation (rough approximation - not exact)
    // Uses effective tax rates based on marital status and income level
    let federalTaxRate = 0.12; // Default to 12% bracket
    if (maritalStatus === 'single') {
      if (taxableIncome > 250000) federalTaxRate = 0.32;
      else if (taxableIncome > 197000) federalTaxRate = 0.24;
      else if (taxableIncome > 103000) federalTaxRate = 0.22;
      else if (taxableIncome > 48000) federalTaxRate = 0.12;
      else federalTaxRate = 0.10;
    } else {
      if (taxableIncome > 500000) federalTaxRate = 0.32;
      else if (taxableIncome > 394000) federalTaxRate = 0.24;
      else if (taxableIncome > 206000) federalTaxRate = 0.22;
      else if (taxableIncome > 96000) federalTaxRate = 0.12;
      else federalTaxRate = 0.10;
    }

    // Estimate federal tax (simplified - does not account for progressive brackets exactly)
    const estimatedFederalTax = Math.max(0, taxableIncome * federalTaxRate);

    // Estimate state tax (7% average - user can adjust)
    const estimatedStateTax = Math.max(0, taxableIncome * 0.05); // 5% default state rate

    // Calculate post-tax deductions (annual)
    const p1PostTaxAnnual = p1RothContribution + p1DisabilityInsurance + p1LifeInsurance;
    const p2PostTaxAnnual = isMarried ? p2RothContribution + p2DisabilityInsurance + p2LifeInsurance : 0;
    const totalPostTaxDeductions = p1PostTaxAnnual + p2PostTaxAnnual;

    // Calculate net annual income
    const netAnnual = grossAnnual - totalPreTaxDeductions - estimatedFederalTax - estimatedStateTax - totalPostTaxDeductions - (federalWithholdingExtra * 12) - (stateWithholdingExtra * 12);

    // Convert to monthly
    const netMonthly = netAnnual / 12;

    // Calculate monthly expenses
    const monthlyExpenses = mortgagePayment + householdExpenses + discretionarySpending +
                           childcareCosts + nonRetirementInvestments + surplusLiquidity;

    // Calculate monthly surplus/deficit
    const monthlySurplus = netMonthly - monthlyExpenses;

    // Set results
    setResults({
      grossIncome: grossAnnual / 12,
      preTaxDeductions: totalPreTaxDeductions / 12,
      taxableIncome: taxableIncome / 12,
      federalTax: estimatedFederalTax / 12,
      stateTax: estimatedStateTax / 12,
      postTaxDeductions: totalPostTaxDeductions / 12,
      netMonthlyIncome: netMonthly,
      totalMonthlyExpenses: monthlyExpenses,
      monthlySurplus: monthlySurplus,
      annualSummary: {
        grossAnnual,
        netAnnual,
        taxes: estimatedFederalTax + estimatedStateTax,
        retirement401k: p1PreTax401k + (isMarried ? p2PreTax401k : 0),
        rothContributions: p1RothContribution + (isMarried ? p2RothContribution : 0),
        investments: nonRetirementInvestments * 12,
      }
    });

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <h1 className="font-semibold text-xl">2026 Income & Cash Flow Planner</h1>
          </div>
          <Button onClick={handleCalculate} className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Calculate
          </Button>
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
                label="Mortgage Payment"
                value={mortgagePayment}
                setter={setMortgagePayment}
                defaultValue={0}
              />
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
                label="Childcare Costs"
                value={childcareCosts}
                setter={setChildcareCosts}
                defaultValue={0}
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
        {results && (
          <div id="results-section" className="space-y-6 scroll-mt-20">
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  2026 Cash Flow Summary
                </CardTitle>
                <CardDescription>
                  Monthly income, expenses, and surplus/deficit breakdown
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Monthly Income Waterfall */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Monthly Income Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center py-2 border-b">
                      <span className="font-medium">Gross Monthly Income</span>
                      <span className="font-bold text-lg">
                        ${results.grossIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-red-600">
                      <span className="pl-4">- Pre-tax Deductions</span>
                      <span>
                        -${results.preTaxDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-red-600">
                      <span className="pl-4">- Federal Tax (estimated)</span>
                      <span>
                        -${results.federalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-red-600">
                      <span className="pl-4">- State Tax (estimated)</span>
                      <span>
                        -${results.stateTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b text-red-600">
                      <span className="pl-4">- Post-tax Deductions</span>
                      <span>
                        -${results.postTaxDeductions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-3 bg-green-50 dark:bg-green-950/20 rounded-lg px-4">
                      <span className="font-semibold text-green-900 dark:text-green-100">
                        Net Monthly Income
                      </span>
                      <span className="font-bold text-xl text-green-900 dark:text-green-100">
                        ${results.netMonthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Monthly Expenses */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Monthly Expenses</h3>
                  <div className="flex justify-between items-center py-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg px-4">
                    <span className="font-semibold text-blue-900 dark:text-blue-100">
                      Total Monthly Expenses
                    </span>
                    <span className="font-bold text-xl text-blue-900 dark:text-blue-100">
                      ${results.totalMonthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>

                {/* Monthly Surplus/Deficit */}
                <div className="space-y-3">
                  <h3 className="font-semibold text-lg">Monthly Cash Flow</h3>
                  <div className={`flex justify-between items-center py-4 rounded-lg px-4 ${
                    results.monthlySurplus >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20'
                      : 'bg-red-50 dark:bg-red-950/20'
                  }`}>
                    <span className={`font-semibold text-lg ${
                      results.monthlySurplus >= 0
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {results.monthlySurplus >= 0 ? 'Monthly Surplus' : 'Monthly Deficit'}
                    </span>
                    <span className={`font-bold text-2xl ${
                      results.monthlySurplus >= 0
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-red-900 dark:text-red-100'
                    }`}>
                      {results.monthlySurplus >= 0 ? '+' : ''}
                      ${results.monthlySurplus.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  {results.monthlySurplus < 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4">
                      <p className="text-sm text-yellow-800 dark:text-yellow-200">
                        ⚠️ <strong>Warning:</strong> Your monthly expenses exceed your net income by{' '}
                        <strong>${Math.abs(results.monthlySurplus).toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>.
                        Consider reducing expenses or increasing income.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Annual Summary */}
            <Card>
              <CardHeader>
                <CardTitle>2026 Annual Summary</CardTitle>
                <CardDescription>
                  Projected totals for the full year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground mb-1">Gross Annual Income</div>
                    <div className="text-2xl font-bold">
                      ${results.annualSummary.grossAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4">
                    <div className="text-sm text-green-700 dark:text-green-400 mb-1">Net Annual Income</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      ${results.annualSummary.netAnnual.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4">
                    <div className="text-sm text-red-700 dark:text-red-400 mb-1">Total Taxes</div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                      ${results.annualSummary.taxes.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4">
                    <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">401(k) Contributions</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      ${results.annualSummary.retirement401k.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4">
                    <div className="text-sm text-purple-700 dark:text-purple-400 mb-1">Roth Contributions</div>
                    <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                      ${results.annualSummary.rothContributions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-4">
                    <div className="text-sm text-indigo-700 dark:text-indigo-400 mb-1">Taxable Investments</div>
                    <div className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      ${results.annualSummary.investments.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Disclaimer */}
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> Tax estimates are simplified and approximate. Actual taxes depend on deductions,
                  credits, and other factors. Consult a tax professional for accurate tax planning.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
