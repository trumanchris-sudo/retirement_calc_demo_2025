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
  const [p1Name, setP1Name] = useState("Person 1");
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
  const [p2Name, setP2Name] = useState("Person 2");
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

  // Helper component for income input section
  const IncomeSection = ({
    label,
    nameValue, onNameChange,
    baseIncome, onBaseIncomeChange,
    bonus, onBonusChange,
    bonusMonth, onBonusMonthChange,
    overtime, onOvertimeChange,
    preTax401k, onPreTax401kChange,
    preTaxHealth, onPreTaxHealthChange,
    preTaxHSA, onPreTaxHSAChange,
    preTaxFSA, onPreTaxFSAChange,
    rothContrib, onRothContribChange,
    disability, onDisabilityChange,
    life, onLifeChange,
    idPrefix
  }: {
    label: string;
    nameValue: string;
    onNameChange: (v: string) => void;
    baseIncome: number;
    onBaseIncomeChange: (v: number) => void;
    bonus: number;
    onBonusChange: (v: number) => void;
    bonusMonth: string;
    onBonusMonthChange: (v: string) => void;
    overtime: number;
    onOvertimeChange: (v: number) => void;
    preTax401k: number;
    onPreTax401kChange: (v: number) => void;
    preTaxHealth: number;
    onPreTaxHealthChange: (v: number) => void;
    preTaxHSA: number;
    onPreTaxHSAChange: (v: number) => void;
    preTaxFSA: number;
    onPreTaxFSAChange: (v: number) => void;
    rothContrib: number;
    onRothContribChange: (v: number) => void;
    disability: number;
    onDisabilityChange: (v: number) => void;
    life: number;
    onLifeChange: (v: number) => void;
    idPrefix: string;
  }) => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-foreground">{label}</h3>

      {/* Income Sources */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Income Sources</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-name`}>Name/Label</Label>
            <Input
              id={`${idPrefix}-name`}
              value={nameValue}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g., John, Primary Earner"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-base`}>Base Annual Salary</Label>
            <Input
              id={`${idPrefix}-base`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={baseIncome}
              onChange={(e) => handleNumericInput(e.target.value, onBaseIncomeChange)}
              placeholder="150000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-bonus`}>Annual Bonus</Label>
            <Input
              id={`${idPrefix}-bonus`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={bonus}
              onChange={(e) => handleNumericInput(e.target.value, onBonusChange)}
              placeholder="15000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-bonus-month`}>Bonus Payment Month</Label>
            <select
              id={`${idPrefix}-bonus-month`}
              value={bonusMonth}
              onChange={(e) => onBonusMonthChange(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {months.slice(0, 12).map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-overtime`}>Estimated Monthly Overtime</Label>
            <Input
              id={`${idPrefix}-overtime`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={overtime}
              onChange={(e) => handleNumericInput(e.target.value, onOvertimeChange)}
              placeholder="500"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Pre-Tax Deductions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Pre-Tax Deductions (per paycheck)</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-401k`}>401(k) Contribution</Label>
            <Input
              id={`${idPrefix}-401k`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={preTax401k}
              onChange={(e) => handleNumericInput(e.target.value, onPreTax401kChange)}
              placeholder="750"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-health`}>Health Insurance Premium</Label>
            <Input
              id={`${idPrefix}-health`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={preTaxHealth}
              onChange={(e) => handleNumericInput(e.target.value, onPreTaxHealthChange)}
              placeholder="200"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-hsa`}>HSA Contribution</Label>
            <Input
              id={`${idPrefix}-hsa`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={preTaxHSA}
              onChange={(e) => handleNumericInput(e.target.value, onPreTaxHSAChange)}
              placeholder="300"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-fsa`}>FSA Contribution</Label>
            <Input
              id={`${idPrefix}-fsa`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={preTaxFSA}
              onChange={(e) => handleNumericInput(e.target.value, onPreTaxFSAChange)}
              placeholder="100"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Post-Tax Deductions */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Post-Tax Deductions (per paycheck)</h4>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-roth`}>Roth 401(k) Contribution</Label>
            <Input
              id={`${idPrefix}-roth`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rothContrib}
              onChange={(e) => handleNumericInput(e.target.value, onRothContribChange)}
              placeholder="250"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-disability`}>Disability Insurance</Label>
            <Input
              id={`${idPrefix}-disability`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={disability}
              onChange={(e) => handleNumericInput(e.target.value, onDisabilityChange)}
              placeholder="50"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${idPrefix}-life`}>Life Insurance Premium</Label>
            <Input
              id={`${idPrefix}-life`}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={life}
              onChange={(e) => handleNumericInput(e.target.value, onLifeChange)}
              placeholder="25"
            />
          </div>
        </div>
      </div>
    </div>
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

        {/* Income Sections - Stacked vertically */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Income Sources & Deductions</CardTitle>
            <CardDescription>
              {isMarried ? "Enter income details for both you and your spouse" : "Enter your income details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {/* Person 1 / Your Income */}
              <div>
                <div className="mb-4 pb-2 border-b-2 border-border">
                  <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                    {isMarried ? "Your Income" : "Income Details"}
                  </h3>
                </div>
                <IncomeSection
                  label=""
                  nameValue={p1Name}
                  onNameChange={setP1Name}
                  baseIncome={p1BaseIncome}
                  onBaseIncomeChange={setP1BaseIncome}
                  bonus={p1Bonus}
                  onBonusChange={setP1Bonus}
                  bonusMonth={p1BonusMonth}
                  onBonusMonthChange={setP1BonusMonth}
                  overtime={p1OvertimeMonthly}
                  onOvertimeChange={setP1OvertimeMonthly}
                  preTax401k={p1PreTax401k}
                  onPreTax401kChange={setP1PreTax401k}
                  preTaxHealth={p1PreTaxHealthInsurance}
                  onPreTaxHealthChange={setP1PreTaxHealthInsurance}
                  preTaxHSA={p1PreTaxHSA}
                  onPreTaxHSAChange={setP1PreTaxHSA}
                  preTaxFSA={p1PreTaxFSA}
                  onPreTaxFSAChange={setP1PreTaxFSA}
                  rothContrib={p1RothContribution}
                  onRothContribChange={setP1RothContribution}
                  disability={p1DisabilityInsurance}
                  onDisabilityChange={setP1DisabilityInsurance}
                  life={p1LifeInsurance}
                  onLifeChange={setP1LifeInsurance}
                  idPrefix="p1"
                />
              </div>

              {/* Person 2 / Spouse's Income (only if married) */}
              {isMarried && (
                <div>
                  <div className="mb-4 pb-2 border-b-2 border-border">
                    <h3 className="text-lg font-semibold text-foreground uppercase tracking-wide">
                      Spouse's Income
                    </h3>
                  </div>
                  <IncomeSection
                    label=""
                    nameValue={p2Name}
                    onNameChange={setP2Name}
                    baseIncome={p2BaseIncome}
                    onBaseIncomeChange={setP2BaseIncome}
                    bonus={p2Bonus}
                    onBonusChange={setP2Bonus}
                    bonusMonth={p2BonusMonth}
                    onBonusMonthChange={setP2BonusMonth}
                    overtime={p2OvertimeMonthly}
                    onOvertimeChange={setP2OvertimeMonthly}
                    preTax401k={p2PreTax401k}
                    onPreTax401kChange={setP2PreTax401k}
                    preTaxHealth={p2PreTaxHealthInsurance}
                    onPreTaxHealthChange={setP2PreTaxHealthInsurance}
                    preTaxHSA={p2PreTaxHSA}
                    onPreTaxHSAChange={setP2PreTaxHSA}
                    preTaxFSA={p2PreTaxFSA}
                    onPreTaxFSAChange={setP2PreTaxFSA}
                    rothContrib={p2RothContribution}
                    onRothContribChange={setP2RothContribution}
                    disability={p2DisabilityInsurance}
                    onDisabilityChange={setP2DisabilityInsurance}
                    life={p2LifeInsurance}
                    onLifeChange={setP2LifeInsurance}
                    idPrefix="p2"
                  />
                </div>
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
                <Label htmlFor="childcare-dropoff">Childcare Ends (Month)</Label>
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
                <Label htmlFor="surplus">Surplus Liquidity Savings</Label>
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
            <CardTitle>Mortgage Details (for Net Worth Tracking)</CardTitle>
            <CardDescription>
              Track principal repayment and interest deductions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mortgage-balance">Current Mortgage Balance</Label>
                <Input
                  id="mortgage-balance"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mortgageBalance}
                  onChange={(e) => handleNumericInput(e.target.value, setMortgageBalance)}
                  placeholder="350000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-rate">Mortgage Interest Rate (%)</Label>
                <Input
                  id="mortgage-rate"
                  type="text"
                  inputMode="decimal"
                  pattern="[0-9.]*"
                  value={mortgageRate}
                  onChange={(e) => handleDecimalInput(e.target.value, setMortgageRate)}
                  placeholder="3.25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-interest">Est. Monthly Interest Portion</Label>
                <Input
                  id="mortgage-interest"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={mortgageInterestMonthly}
                  onChange={(e) => handleNumericInput(e.target.value, setMortgageInterestMonthly)}
                  placeholder="950"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tangible Personal Property */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Tangible Personal Property (Vehicle Tracking)</CardTitle>
            <CardDescription>
              Model depreciation, FMV, and firesale liquidation values
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
                  placeholder="35000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-life">Estimated Useful Life (years)</Label>
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
                <Label htmlFor="car-residual">Residual Value Floor</Label>
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
                <Label htmlFor="car-firesale">Firesale Discount (%)</Label>
                <Input
                  id="car-firesale"
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

        {/* Tax Withholding */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Additional Tax Withholding</CardTitle>
            <CardDescription>
              Extra withholding per paycheck to cover excess obligations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="federal-extra">Federal Withholding (per paycheck)</Label>
                <Input
                  id="federal-extra"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={federalWithholdingExtra}
                  onChange={(e) => handleNumericInput(e.target.value, setFederalWithholdingExtra)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state-extra">State Withholding (per paycheck)</Label>
                <Input
                  id="state-extra"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={stateWithholdingExtra}
                  onChange={(e) => handleNumericInput(e.target.value, setStateWithholdingExtra)}
                  placeholder="50"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calculate Button */}
        <div className="flex justify-center mb-8">
          <Button
            onClick={handleCalculate}
            size="lg"
            className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all"
          >
            <TrendingUp className="w-5 h-5 mr-2" />
            Calculate 2026 Income Projection
          </Button>
        </div>

        {/* Results Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>2026 Income Projection Results</CardTitle>
            <CardDescription>
              Click "Calculate" to see your comprehensive income analysis
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12 text-muted-foreground">
            Results will appear here after calculation
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
