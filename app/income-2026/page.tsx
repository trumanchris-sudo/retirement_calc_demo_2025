"use client";

import React, { useState } from "react";
import { ArrowLeft, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

type FilingStatus = "single" | "married";

export default function Income2026Page() {
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

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December", "None"
  ];

  const handleCalculate = () => {
    // TODO: Implement calculation logic
    console.log("Calculating 2026 income projections...");
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
    placeholder = "0",
    isNumeric = true
  }: {
    label: string;
    idPrefix: string;
    value1: number | string;
    onChange1: (v: any) => void;
    value2: number | string;
    onChange2: (v: any) => void;
    placeholder?: string;
    isNumeric?: boolean;
  }) => {
    const handleChange = isNumeric ? handleNumericInput : (v: string, setter: any) => setter(v);

    return (
      <>
        <div className="space-y-2">
          <Label htmlFor={`${idPrefix}-your`}>{label} (Your)</Label>
          <Input
            id={`${idPrefix}-your`}
            type="text"
            inputMode={isNumeric ? "numeric" : "text"}
            pattern={isNumeric ? "[0-9]*" : undefined}
            value={value1}
            onChange={(e) => handleChange(e.target.value, onChange1)}
            placeholder={placeholder}
          />
        </div>
        {isMarried && (
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-spouse`}>{label} (Spouse)</Label>
            <Input
              id={`${idPrefix}-spouse`}
              type="text"
              inputMode={isNumeric ? "numeric" : "text"}
              pattern={isNumeric ? "[0-9]*" : undefined}
              value={value2}
              onChange={(e) => handleChange(e.target.value, onChange2)}
              placeholder={placeholder}
            />
          </div>
        )}
      </>
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
                    placeholder="150000"
                  />

                  <DualInputField
                    label="Annual Bonus"
                    idPrefix="bonus"
                    value1={p1Bonus}
                    onChange1={setP1Bonus}
                    value2={p2Bonus}
                    onChange2={setP2Bonus}
                    placeholder="15000"
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
                    placeholder="500"
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
                    placeholder="750"
                  />

                  <DualInputField
                    label="Health Insurance Premium"
                    idPrefix="health"
                    value1={p1PreTaxHealthInsurance}
                    onChange1={setP1PreTaxHealthInsurance}
                    value2={p2PreTaxHealthInsurance}
                    onChange2={setP2PreTaxHealthInsurance}
                    placeholder="200"
                  />

                  <DualInputField
                    label="HSA Contribution"
                    idPrefix="hsa"
                    value1={p1PreTaxHSA}
                    onChange1={setP1PreTaxHSA}
                    value2={p2PreTaxHSA}
                    onChange2={setP2PreTaxHSA}
                    placeholder="300"
                  />

                  <DualInputField
                    label="FSA Contribution"
                    idPrefix="fsa"
                    value1={p1PreTaxFSA}
                    onChange1={setP1PreTaxFSA}
                    value2={p2PreTaxFSA}
                    onChange2={setP2PreTaxFSA}
                    placeholder="100"
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
                    placeholder="250"
                  />

                  <DualInputField
                    label="Disability Insurance"
                    idPrefix="disability"
                    value1={p1DisabilityInsurance}
                    onChange1={setP1DisabilityInsurance}
                    value2={p2DisabilityInsurance}
                    onChange2={setP2DisabilityInsurance}
                    placeholder="50"
                  />

                  <DualInputField
                    label="Life Insurance Premium"
                    idPrefix="life"
                    value1={p1LifeInsurance}
                    onChange1={setP1LifeInsurance}
                    value2={p2LifeInsurance}
                    onChange2={setP2LifeInsurance}
                    placeholder="25"
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
              <div className="space-y-2">
                <Label htmlFor="federal-extra">Extra Federal Withholding</Label>
                <Input
                  id="federal-extra"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={federalWithholdingExtra}
                  onChange={(e) => handleNumericInput(e.target.value, setFederalWithholdingExtra)}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state-extra">Extra State Withholding</Label>
                <Input
                  id="state-extra"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={stateWithholdingExtra}
                  onChange={(e) => handleNumericInput(e.target.value, setStateWithholdingExtra)}
                  placeholder="0"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="mortgage">Mortgage Payment</Label>
                <Input
                  id="mortgage"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mortgagePayment}
                  onChange={(e) => handleNumericInput(e.target.value, setMortgagePayment)}
                  placeholder="2500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="household">Household Expenses</Label>
                <Input
                  id="household"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={householdExpenses}
                  onChange={(e) => handleNumericInput(e.target.value, setHouseholdExpenses)}
                  placeholder="1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discretionary">Discretionary Spending</Label>
                <Input
                  id="discretionary"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={discretionarySpending}
                  onChange={(e) => handleNumericInput(e.target.value, setDiscretionarySpending)}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childcare">Childcare Costs</Label>
                <Input
                  id="childcare"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={childcareCosts}
                  onChange={(e) => handleNumericInput(e.target.value, setChildcareCosts)}
                  placeholder="2000"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="investments">Non-Retirement Investments</Label>
                <Input
                  id="investments"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={nonRetirementInvestments}
                  onChange={(e) => handleNumericInput(e.target.value, setNonRetirementInvestments)}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surplus">Surplus / Extra Liquidity</Label>
                <Input
                  id="surplus"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={surplusLiquidity}
                  onChange={(e) => handleNumericInput(e.target.value, setSurplusLiquidity)}
                  placeholder="1000"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="mortgage-balance">Mortgage Balance</Label>
                <Input
                  id="mortgage-balance"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mortgageBalance}
                  onChange={(e) => handleNumericInput(e.target.value, setMortgageBalance)}
                  placeholder="400000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-rate">Mortgage Interest Rate (%)</Label>
                <Input
                  id="mortgage-rate"
                  type="text"
                  inputMode="decimal"
                  value={mortgageRate}
                  onChange={(e) => handleDecimalInput(e.target.value, setMortgageRate)}
                  placeholder="3.5"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-interest">Monthly Interest Portion</Label>
                <Input
                  id="mortgage-interest"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mortgageInterestMonthly}
                  onChange={(e) => handleNumericInput(e.target.value, setMortgageInterestMonthly)}
                  placeholder="1200"
                />
              </div>
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
              <div className="space-y-2">
                <Label htmlFor="car-fmv">Current Fair Market Value</Label>
                <Input
                  id="car-fmv"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={carFMV}
                  onChange={(e) => handleNumericInput(e.target.value, setCarFMV)}
                  placeholder="25000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-life">Useful Life (years)</Label>
                <Input
                  id="car-life"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={carUsefulLife}
                  onChange={(e) => handleNumericInput(e.target.value, setCarUsefulLife)}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-residual">Residual Value</Label>
                <Input
                  id="car-residual"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={carResidualValue}
                  onChange={(e) => handleNumericInput(e.target.value, setCarResidualValue)}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-discount">Fire Sale Discount (%)</Label>
                <Input
                  id="car-discount"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={carFiresaleDiscount}
                  onChange={(e) => handleNumericInput(e.target.value, setCarFiresaleDiscount)}
                  placeholder="30"
                />
              </div>
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
      </main>
    </div>
  );
}
