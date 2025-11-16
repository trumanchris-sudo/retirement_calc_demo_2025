"use client";

import React, { useState } from "react";
import { ArrowLeft, Calculator, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { TopBanner } from "@/components/layout/TopBanner";

export default function Income2026Page() {
  // Marital status
  const [isMarried, setIsMarried] = useState(false);

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
            <div className="flex items-center space-x-2">
              <Checkbox
                id="married"
                checked={isMarried}
                onCheckedChange={(checked) => setIsMarried(!!checked)}
              />
              <label
                htmlFor="married"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Married (include spouse income)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Income Tabs */}
        <Tabs defaultValue="person1" className="mb-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="person1">{p1Name}</TabsTrigger>
            <TabsTrigger value="person2" disabled={!isMarried}>{p2Name} {!isMarried && "(Married Only)"}</TabsTrigger>
          </TabsList>

          {/* Person 1 Income */}
          <TabsContent value="person1">
            <Card>
              <CardHeader>
                <CardTitle>Income Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="p1-name">Name/Label</Label>
                    <Input
                      id="p1-name"
                      value={p1Name}
                      onChange={(e) => setP1Name(e.target.value)}
                      placeholder="e.g., John, Primary Earner"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p1-base">Base Annual Salary</Label>
                    <Input
                      id="p1-base"
                      type="number"
                      value={p1BaseIncome}
                      onChange={(e) => setP1BaseIncome(Number(e.target.value))}
                      placeholder="150000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p1-bonus">Annual Bonus</Label>
                    <Input
                      id="p1-bonus"
                      type="number"
                      value={p1Bonus}
                      onChange={(e) => setP1Bonus(Number(e.target.value))}
                      placeholder="15000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p1-bonus-month">Bonus Payment Month</Label>
                    <select
                      id="p1-bonus-month"
                      value={p1BonusMonth}
                      onChange={(e) => setP1BonusMonth(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {months.slice(0, 12).map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p1-overtime">Estimated Monthly Overtime</Label>
                    <Input
                      id="p1-overtime"
                      type="number"
                      value={p1OvertimeMonthly}
                      onChange={(e) => setP1OvertimeMonthly(Number(e.target.value))}
                      placeholder="500"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Pre-Tax Deductions (per paycheck)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="p1-401k">401(k) Contribution</Label>
                      <Input
                        id="p1-401k"
                        type="number"
                        value={p1PreTax401k}
                        onChange={(e) => setP1PreTax401k(Number(e.target.value))}
                        placeholder="750"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p1-health">Health Insurance Premium</Label>
                      <Input
                        id="p1-health"
                        type="number"
                        value={p1PreTaxHealthInsurance}
                        onChange={(e) => setP1PreTaxHealthInsurance(Number(e.target.value))}
                        placeholder="200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p1-hsa">HSA Contribution</Label>
                      <Input
                        id="p1-hsa"
                        type="number"
                        value={p1PreTaxHSA}
                        onChange={(e) => setP1PreTaxHSA(Number(e.target.value))}
                        placeholder="300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p1-fsa">FSA Contribution</Label>
                      <Input
                        id="p1-fsa"
                        type="number"
                        value={p1PreTaxFSA}
                        onChange={(e) => setP1PreTaxFSA(Number(e.target.value))}
                        placeholder="100"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Post-Tax Deductions (per paycheck)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="p1-roth">Roth 401(k) Contribution</Label>
                      <Input
                        id="p1-roth"
                        type="number"
                        value={p1RothContribution}
                        onChange={(e) => setP1RothContribution(Number(e.target.value))}
                        placeholder="250"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p1-disability">Disability Insurance</Label>
                      <Input
                        id="p1-disability"
                        type="number"
                        value={p1DisabilityInsurance}
                        onChange={(e) => setP1DisabilityInsurance(Number(e.target.value))}
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p1-life">Life Insurance Premium</Label>
                      <Input
                        id="p1-life"
                        type="number"
                        value={p1LifeInsurance}
                        onChange={(e) => setP1LifeInsurance(Number(e.target.value))}
                        placeholder="25"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Person 2 Income (Spouse) */}
          <TabsContent value="person2">
            <Card>
              <CardHeader>
                <CardTitle>Spouse Income Sources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="p2-name">Name/Label</Label>
                    <Input
                      id="p2-name"
                      value={p2Name}
                      onChange={(e) => setP2Name(e.target.value)}
                      placeholder="e.g., Jane, Spouse"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p2-base">Base Annual Salary</Label>
                    <Input
                      id="p2-base"
                      type="number"
                      value={p2BaseIncome}
                      onChange={(e) => setP2BaseIncome(Number(e.target.value))}
                      placeholder="120000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p2-bonus">Annual Bonus</Label>
                    <Input
                      id="p2-bonus"
                      type="number"
                      value={p2Bonus}
                      onChange={(e) => setP2Bonus(Number(e.target.value))}
                      placeholder="10000"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p2-bonus-month">Bonus Payment Month</Label>
                    <select
                      id="p2-bonus-month"
                      value={p2BonusMonth}
                      onChange={(e) => setP2BonusMonth(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {months.slice(0, 12).map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="p2-overtime">Estimated Monthly Overtime</Label>
                    <Input
                      id="p2-overtime"
                      type="number"
                      value={p2OvertimeMonthly}
                      onChange={(e) => setP2OvertimeMonthly(Number(e.target.value))}
                      placeholder="500"
                    />
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Pre-Tax Deductions (per paycheck)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="p2-401k">401(k) Contribution</Label>
                      <Input
                        id="p2-401k"
                        type="number"
                        value={p2PreTax401k}
                        onChange={(e) => setP2PreTax401k(Number(e.target.value))}
                        placeholder="750"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p2-health">Health Insurance Premium</Label>
                      <Input
                        id="p2-health"
                        type="number"
                        value={p2PreTaxHealthInsurance}
                        onChange={(e) => setP2PreTaxHealthInsurance(Number(e.target.value))}
                        placeholder="150"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p2-hsa">HSA Contribution</Label>
                      <Input
                        id="p2-hsa"
                        type="number"
                        value={p2PreTaxHSA}
                        onChange={(e) => setP2PreTaxHSA(Number(e.target.value))}
                        placeholder="200"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p2-fsa">FSA Contribution</Label>
                      <Input
                        id="p2-fsa"
                        type="number"
                        value={p2PreTaxFSA}
                        onChange={(e) => setP2PreTaxFSA(Number(e.target.value))}
                        placeholder="50"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-4">Post-Tax Deductions (per paycheck)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="p2-roth">Roth 401(k) Contribution</Label>
                      <Input
                        id="p2-roth"
                        type="number"
                        value={p2RothContribution}
                        onChange={(e) => setP2RothContribution(Number(e.target.value))}
                        placeholder="250"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p2-disability">Disability Insurance</Label>
                      <Input
                        id="p2-disability"
                        type="number"
                        value={p2DisabilityInsurance}
                        onChange={(e) => setP2DisabilityInsurance(Number(e.target.value))}
                        placeholder="50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="p2-life">Life Insurance Premium</Label>
                      <Input
                        id="p2-life"
                        type="number"
                        value={p2LifeInsurance}
                        onChange={(e) => setP2LifeInsurance(Number(e.target.value))}
                        placeholder="20"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
                  type="number"
                  value={mortgagePayment}
                  onChange={(e) => setMortgagePayment(Number(e.target.value))}
                  placeholder="2500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="household">Household Expenses</Label>
                <Input
                  id="household"
                  type="number"
                  value={householdExpenses}
                  onChange={(e) => setHouseholdExpenses(Number(e.target.value))}
                  placeholder="1500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discretionary">Discretionary Spending</Label>
                <Input
                  id="discretionary"
                  type="number"
                  value={discretionarySpending}
                  onChange={(e) => setDiscretionarySpending(Number(e.target.value))}
                  placeholder="1000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="childcare">Childcare Costs</Label>
                <Input
                  id="childcare"
                  type="number"
                  value={childcareCosts}
                  onChange={(e) => setChildcareCosts(Number(e.target.value))}
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
                  type="number"
                  value={nonRetirementInvestments}
                  onChange={(e) => setNonRetirementInvestments(Number(e.target.value))}
                  placeholder="500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="surplus">Surplus Liquidity Savings</Label>
                <Input
                  id="surplus"
                  type="number"
                  value={surplusLiquidity}
                  onChange={(e) => setSurplusLiquidity(Number(e.target.value))}
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
                  type="number"
                  value={mortgageBalance}
                  onChange={(e) => setMortgageBalance(Number(e.target.value))}
                  placeholder="350000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-rate">Mortgage Interest Rate (%)</Label>
                <Input
                  id="mortgage-rate"
                  type="number"
                  step="0.01"
                  value={mortgageRate}
                  onChange={(e) => setMortgageRate(Number(e.target.value))}
                  placeholder="3.25"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mortgage-interest">Est. Monthly Interest Portion</Label>
                <Input
                  id="mortgage-interest"
                  type="number"
                  value={mortgageInterestMonthly}
                  onChange={(e) => setMortgageInterestMonthly(Number(e.target.value))}
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
                  type="number"
                  value={carFMV}
                  onChange={(e) => setCarFMV(Number(e.target.value))}
                  placeholder="35000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-life">Estimated Useful Life (years)</Label>
                <Input
                  id="car-life"
                  type="number"
                  value={carUsefulLife}
                  onChange={(e) => setCarUsefulLife(Number(e.target.value))}
                  placeholder="10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-residual">Residual Value Floor</Label>
                <Input
                  id="car-residual"
                  type="number"
                  value={carResidualValue}
                  onChange={(e) => setCarResidualValue(Number(e.target.value))}
                  placeholder="5000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="car-firesale">Firesale Discount (%)</Label>
                <Input
                  id="car-firesale"
                  type="number"
                  value={carFiresaleDiscount}
                  onChange={(e) => setCarFiresaleDiscount(Number(e.target.value))}
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
                  type="number"
                  value={federalWithholdingExtra}
                  onChange={(e) => setFederalWithholdingExtra(Number(e.target.value))}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state-extra">State Withholding (per paycheck)</Label>
                <Input
                  id="state-extra"
                  type="number"
                  value={stateWithholdingExtra}
                  onChange={(e) => setStateWithholdingExtra(Number(e.target.value))}
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
