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

  const handleCalculate = () => {
    console.log("Calculating 2026 cash flow forecast...");

    const monthNames = ["January", "February", "March", "April", "May", "June",
                        "July", "August", "September", "October", "November", "December"];

    // Calculate biweekly amounts (26 pay periods per year)
    const p1BiweeklyGross = p1BaseIncome / 26;
    const p2BiweeklyGross = isMarried ? p2BaseIncome / 26 : 0;

    // Track which month bonuses occur
    const p1BonusMonthIdx = months.indexOf(p1BonusMonth);
    const p2BonusMonthIdx = months.indexOf(p2BonusMonth);
    const childcareDropMonth = months.indexOf(childcareDropoffMonth);

    let runningBalance = 0;
    const monthlyData = [];

    for (let m = 0; m < 12; m++) {
      const month = monthNames[m];
      const incomeEvents = [];
      const expenseEvents = [];

      // Income events - Biweekly paychecks (2 per month, some months 3)
      // Simplified: assume 2 paychecks per month (15th and 30th)
      const paycheckDates = [`2026-${String(m + 1).padStart(2, '0')}-15`, `2026-${String(m + 1).padStart(2, '0')}-${m === 1 ? '28' : '30'}`];

      paycheckDates.forEach(date => {
        if (p1BaseIncome > 0) {
          incomeEvents.push({
            date,
            description: "Paycheck (Your)",
            amount: p1BiweeklyGross + p1OvertimeMonthly / 2,
            type: 'salary' as const,
            person: "Your"
          });
        }
        if (isMarried && p2BaseIncome > 0) {
          incomeEvents.push({
            date,
            description: "Paycheck (Spouse)",
            amount: p2BiweeklyGross + p2OvertimeMonthly / 2,
            type: 'salary' as const,
            person: "Spouse"
          });
        }
      });

      // Bonus events
      if (p1BonusMonthIdx === m && p1Bonus > 0) {
        incomeEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-15`,
          description: "Annual Bonus (Your)",
          amount: p1Bonus,
          type: 'bonus' as const,
          person: "Your"
        });
      }
      if (p2BonusMonthIdx === m && p2Bonus > 0) {
        incomeEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-15`,
          description: "Annual Bonus (Spouse)",
          amount: p2Bonus,
          type: 'bonus' as const,
          person: "Spouse"
        });
      }

      // Expense events - Monthly recurring expenses (due on 1st of month)
      if (mortgagePayment > 0) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-01`,
          description: "Mortgage Payment",
          amount: -mortgagePayment,
          type: "Housing"
        });
      }
      if (householdExpenses > 0) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-01`,
          description: "Household Expenses",
          amount: -householdExpenses,
          type: "Living"
        });
      }
      if (discretionarySpending > 0) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-15`,
          description: "Discretionary Spending",
          amount: -discretionarySpending,
          type: "Discretionary"
        });
      }

      // Childcare - stop if dropoff month reached
      const isBeforeDropoff = childcareDropMonth === -1 || m < childcareDropMonth;
      if (childcareCosts > 0 && isBeforeDropoff) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-01`,
          description: "Childcare",
          amount: -childcareCosts,
          type: "Childcare"
        });
      }

      if (nonRetirementInvestments > 0) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-01`,
          description: "Investment Contribution",
          amount: -nonRetirementInvestments,
          type: "Investment"
        });
      }

      if (surplusLiquidity > 0) {
        expenseEvents.push({
          date: `2026-${String(m + 1).padStart(2, '0')}-01`,
          description: "Surplus Savings",
          amount: -surplusLiquidity,
          type: "Savings"
        });
      }

      // Calculate monthly totals
      const monthlyIncome = incomeEvents.reduce((sum, e) => sum + e.amount, 0);
      const monthlyExpenses = Math.abs(expenseEvents.reduce((sum, e) => sum + e.amount, 0));
      const netCashFlow = monthlyIncome - monthlyExpenses;
      runningBalance += netCashFlow;

      monthlyData.push({
        month,
        monthNumber: m + 1,
        incomeEvents,
        expenseEvents,
        monthlyIncome,
        monthlyExpenses,
        netCashFlow,
        runningBalance
      });
    }

    // Calculate year summary
    const totalIncome = monthlyData.reduce((sum, m) => sum + m.monthlyIncome, 0);
    const totalExpenses = monthlyData.reduce((sum, m) => sum + m.monthlyExpenses, 0);

    setResults({
      months: monthlyData,
      yearSummary: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
        endingBalance: runningBalance
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
            {/* Year Summary */}
            <Card className="border-2 border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  2026 Annual Summary
                </CardTitle>
                <CardDescription>
                  Complete cash flow forecast for the year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 border border-green-200 dark:border-green-900">
                    <div className="text-sm text-green-700 dark:text-green-400 mb-1">Total Income</div>
                    <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                      ${results.yearSummary.totalIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-4 border border-red-200 dark:border-red-900">
                    <div className="text-sm text-red-700 dark:text-red-400 mb-1">Total Expenses</div>
                    <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                      ${results.yearSummary.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className={`rounded-lg p-4 border ${
                    results.yearSummary.netCashFlow >= 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900'
                      : 'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-900'
                  }`}>
                    <div className={`text-sm mb-1 ${
                      results.yearSummary.netCashFlow >= 0
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-orange-700 dark:text-orange-400'
                    }`}>
                      Net Cash Flow
                    </div>
                    <div className={`text-2xl font-bold ${
                      results.yearSummary.netCashFlow >= 0
                        ? 'text-emerald-900 dark:text-emerald-100'
                        : 'text-orange-900 dark:text-orange-100'
                    }`}>
                      {results.yearSummary.netCashFlow >= 0 ? '+' : ''}
                      ${results.yearSummary.netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
                    <div className="text-sm text-blue-700 dark:text-blue-400 mb-1">Ending Balance</div>
                    <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                      ${results.yearSummary.endingBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Monthly Breakdown */}
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Month-by-Month Cash Flow</h3>

              {results.months.map((monthData) => {
                // Combine all events and sort by date
                const allEvents = [
                  ...monthData.incomeEvents.map(e => ({ ...e, isIncome: true })),
                  ...monthData.expenseEvents.map(e => ({ ...e, isIncome: false })),
                ].sort((a, b) => a.date.localeCompare(b.date));

                let runningBalance = monthData.monthNumber === 1 ? 0 : results.months[monthData.monthNumber - 2].runningBalance;

                return (
                  <Card key={monthData.monthNumber}>
                    <CardHeader>
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <CardTitle className="text-lg">{monthData.month} 2026</CardTitle>
                        <div className="flex items-center gap-4 text-sm">
                          <div className="text-green-700 dark:text-green-400">
                            Income: ${monthData.monthlyIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className="text-red-700 dark:text-red-400">
                            Expenses: ${monthData.monthlyExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                          <div className={monthData.netCashFlow >= 0 ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-orange-700 dark:text-orange-400 font-semibold'}>
                            Net: {monthData.netCashFlow >= 0 ? '+' : ''}${monthData.netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-2">Date</th>
                              <th className="text-left py-2 px-2">Description</th>
                              <th className="text-right py-2 px-2">Amount</th>
                              <th className="text-right py-2 px-2">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {allEvents.map((event, idx) => {
                              const amount = event.isIncome ? event.amount : event.amount;
                              runningBalance += amount;

                              return (
                                <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                  <td className="py-2 px-2">
                                    {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </td>
                                  <td className="py-2 px-2">
                                    {event.description}
                                  </td>
                                  <td className={`py-2 px-2 text-right font-medium ${
                                    event.isIncome ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                                  }`}>
                                    {event.isIncome ? '+' : ''}${Math.abs(amount).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono">
                                    ${runningBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </td>
                                </tr>
                              );
                            })}
                            <tr className="bg-muted/30 font-semibold">
                              <td colSpan={2} className="py-2 px-2">
                                End of {monthData.month}
                              </td>
                              <td className="py-2 px-2 text-right">
                                {monthData.netCashFlow >= 0 ? '+' : ''}${monthData.netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                              <td className="py-2 px-2 text-right font-mono">
                                ${monthData.runningBalance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Disclaimer */}
            <Card className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900">
              <CardContent className="pt-6">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Note:</strong> This forecast shows gross income and expenses. Actual take-home pay will be lower after taxes and deductions.
                  Use this as a planning tool to understand your 2026 cash flow patterns.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
