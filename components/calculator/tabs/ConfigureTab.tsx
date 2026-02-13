"use client"

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";
import { SliderInput } from "@/components/form/SliderInput";
import { Input, Spinner, Tip, TrendingUpIcon } from "@/components/calculator/InputHelpers";
import {
  validateAge,
  validateRetirementAge,
  validateBalance,
  validate401kContribution,
  validateIRAContribution,
  validateRate,
} from "@/lib/fieldValidation";
import { calculateBondAllocation } from "@/lib/bondAllocation";
import { RMD_START_AGE } from "@/lib/constants";
import type { FilingStatus } from "@/lib/calculations/taxCalculations";
import type { ReturnMode, WalkSeries } from "@/types/planner";
import type { BondGlidePath, CalculationProgress } from "@/types/calculator";

export interface ConfigureTabProps {
  // Personal Information
  marital: FilingStatus;
  setMarital: (value: FilingStatus) => void;
  age1: number;
  setAge1: (value: number) => void;
  age2: number;
  setAge2: (value: number) => void;
  retirementAge: number;
  setRetirementAge: (value: number) => void;
  isMar: boolean;

  // Starting Balances
  taxableBalance: number;
  setTaxableBalance: (value: number) => void;
  pretaxBalance: number;
  setPretaxBalance: (value: number) => void;
  rothBalance: number;
  setRothBalance: (value: number) => void;

  // Person 1 Contributions
  cTax1: number;
  setCTax1: (value: number) => void;
  cPre1: number;
  setCPre1: (value: number) => void;
  cPost1: number;
  setCPost1: (value: number) => void;
  cMatch1: number;
  setCMatch1: (value: number) => void;

  // Person 2 Contributions
  cTax2: number;
  setCTax2: (value: number) => void;
  cPre2: number;
  setCPre2: (value: number) => void;
  cPost2: number;
  setCPost2: (value: number) => void;
  cMatch2: number;
  setCMatch2: (value: number) => void;

  // Rates
  retRate: number;
  setRetRate: (value: number) => void;
  inflationRate: number;
  setInflationRate: (value: number) => void;
  stateRate: number;
  setStateRate: (value: number) => void;
  incContrib: boolean;
  setIncContrib: (value: boolean) => void;
  incRate: number;
  setIncRate: (value: number) => void;
  wdRate: number;
  setWdRate: (value: number) => void;

  // Simulation Settings
  returnMode: ReturnMode;
  setReturnMode: (value: ReturnMode) => void;
  randomWalkSeries: WalkSeries;
  setRandomWalkSeries: (value: WalkSeries) => void;

  // Asset Allocation
  allocationStrategy: 'aggressive' | 'ageBased' | 'custom';
  setAllocationStrategy: (value: 'aggressive' | 'ageBased' | 'custom') => void;
  bondStartPct: number;
  setBondStartPct: (value: number) => void;
  bondEndPct: number;
  setBondEndPct: (value: number) => void;
  bondStartAge: number;
  setBondStartAge: (value: number) => void;
  bondEndAge: number;
  setBondEndAge: (value: number) => void;
  glidePathShape: 'linear' | 'accelerated' | 'decelerated';
  setGlidePathShape: (value: 'linear' | 'accelerated' | 'decelerated') => void;
  bondGlidePath: BondGlidePath | null;

  // Social Security
  includeSS: boolean;
  setIncludeSS: (value: boolean) => void;
  ssIncome: number;
  setSSIncome: (value: number) => void;
  ssClaimAge: number;
  setSSClaimAge: (value: number) => void;
  ssIncome2: number;
  setSSIncome2: (value: number) => void;
  ssClaimAge2: number;
  setSSClaimAge2: (value: number) => void;

  // Healthcare
  includeMedicare: boolean;
  setIncludeMedicare: (value: boolean) => void;
  medicarePremium: number;
  setMedicarePremium: (value: number) => void;
  medicalInflation: number;
  setMedicalInflation: (value: number) => void;

  // Long-Term Care
  includeLTC: boolean;
  setIncludeLTC: (value: boolean) => void;
  ltcAnnualCost: number;
  setLtcAnnualCost: (value: number) => void;
  ltcProbability: number;
  setLtcProbability: (value: number) => void;
  ltcDuration: number;
  setLtcDuration: (value: number) => void;
  ltcOnsetAge: number;
  setLtcOnsetAge: (value: number) => void;
  ltcAgeRangeStart: number;
  setLtcAgeRangeStart: (value: number) => void;
  ltcAgeRangeEnd: number;
  setLtcAgeRangeEnd: (value: number) => void;

  // Roth Conversion
  enableRothConversions: boolean;
  setEnableRothConversions: (value: boolean) => void;
  targetConversionBracket: number;
  setTargetConversionBracket: (value: number) => void;

  // Actions
  onCalculate: () => void;
  onInputChange: () => void;
  isLoading: boolean;
  err: string | null;
  calcProgress: CalculationProgress | null;

  // Refs
  tabGroupRef: React.RefObject<TabGroupRef | null>;
}

export function ConfigureTab({
  marital, setMarital, age1, setAge1, age2, setAge2, retirementAge, setRetirementAge, isMar,
  taxableBalance, setTaxableBalance, pretaxBalance, setPretaxBalance, rothBalance, setRothBalance,
  cTax1, setCTax1, cPre1, setCPre1, cPost1, setCPost1, cMatch1, setCMatch1,
  cTax2, setCTax2, cPre2, setCPre2, cPost2, setCPost2, cMatch2, setCMatch2,
  retRate, setRetRate, inflationRate, setInflationRate, stateRate, setStateRate,
  incContrib, setIncContrib, incRate, setIncRate, wdRate, setWdRate,
  returnMode, setReturnMode, randomWalkSeries, setRandomWalkSeries,
  allocationStrategy, setAllocationStrategy, bondStartPct, setBondStartPct,
  bondEndPct, setBondEndPct, bondStartAge, setBondStartAge, bondEndAge, setBondEndAge,
  glidePathShape, setGlidePathShape, bondGlidePath,
  includeSS, setIncludeSS, ssIncome, setSSIncome, ssClaimAge, setSSClaimAge,
  ssIncome2, setSSIncome2, ssClaimAge2, setSSClaimAge2,
  includeMedicare, setIncludeMedicare, medicarePremium, setMedicarePremium, medicalInflation, setMedicalInflation,
  includeLTC, setIncludeLTC, ltcAnnualCost, setLtcAnnualCost, ltcProbability, setLtcProbability,
  ltcDuration, setLtcDuration, ltcOnsetAge, setLtcOnsetAge,
  ltcAgeRangeStart, setLtcAgeRangeStart, ltcAgeRangeEnd, setLtcAgeRangeEnd,
  enableRothConversions, setEnableRothConversions, targetConversionBracket, setTargetConversionBracket,
  onCalculate, onInputChange, isLoading, err, calcProgress, tabGroupRef
}: ConfigureTabProps) {
  return (
    <AnimatedSection animation="fade-in" delay={100}>
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Plan Your Retirement</CardTitle>
          <CardDescription>Enter your information to calculate your retirement projections</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <TabGroup
            ref={tabGroupRef}
            tabs={[
              {
                id: "personal",
                label: "Personal Info",
                defaultOpen: false,
                content: (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Marital Status</Label>
                      <select
                        value={marital}
                        onChange={(e) => { setMarital(e.target.value as FilingStatus); onInputChange(); }}
                        className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                      </select>
                    </div>
                    <Input label="Your Age" value={age1} setter={setAge1} min={18} max={120} onInputChange={onInputChange} defaultValue={35} validate={(val) => validateAge(val, 'Your age')} />
                    <Input label="Retirement Age" value={retirementAge} setter={setRetirementAge} min={30} max={90} onInputChange={onInputChange} defaultValue={65} validate={(val) => validateRetirementAge(val, age1)} />
                    {isMar && (
                      <Input label="Spouse Age" value={age2} setter={setAge2} min={18} max={120} onInputChange={onInputChange} defaultValue={33} validate={(val) => validateAge(val, 'Spouse age')} />
                    )}
                  </div>
                ),
              },
              {
                id: "balances",
                label: "Current Balances",
                defaultOpen: false,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                      <Input label="Taxable Brokerage" value={taxableBalance} setter={setTaxableBalance} step={1000} onInputChange={onInputChange} defaultValue={50000} validate={(val) => validateBalance(val, 'Taxable balance')} />
                      <Input label="Pre-Tax (401k/IRA)" value={pretaxBalance} setter={setPretaxBalance} step={1000} onInputChange={onInputChange} defaultValue={150000} validate={(val) => validateBalance(val, 'Pre-tax balance')} />
                      <Input label="Post-Tax (Roth)" value={rothBalance} setter={setRothBalance} step={1000} onInputChange={onInputChange} defaultValue={25000} validate={(val) => validateBalance(val, 'Roth balance')} />
                    </div>
                  </div>
                ),
              },
              {
                id: "contributions",
                label: "Annual Contributions",
                defaultOpen: false,
                content: (
                  <div className="grid grid-cols-1 gap-8">
                    <div className="space-y-4">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                        Your Contributions
                      </Badge>
                      <Input label="Taxable" value={cTax1} setter={setCTax1} step={1000} onInputChange={onInputChange} defaultValue={12000} validate={(val) => validateBalance(val, 'Taxable contribution')} />
                      <Input label="Pre-Tax" value={cPre1} setter={setCPre1} step={1000} onInputChange={onInputChange} defaultValue={23000} validate={validate401kContribution} tip="2026 IRS limit: $24,500" />
                      <Input label="Post-Tax" value={cPost1} setter={setCPost1} step={500} onInputChange={onInputChange} defaultValue={7000} validate={validateIRAContribution} tip="2026 IRS limit: $7,000" />
                      <Input label="Employer Match" value={cMatch1} setter={setCMatch1} step={500} onInputChange={onInputChange} defaultValue={0} validate={(val) => validateBalance(val, 'Employer match')} />
                    </div>
                    {isMar && (
                      <div className="space-y-4">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                          Spouse's Contributions
                        </Badge>
                        <Input label="Taxable" value={cTax2} setter={setCTax2} step={1000} onInputChange={onInputChange} defaultValue={8000} validate={(val) => validateBalance(val, 'Taxable contribution')} />
                        <Input label="Pre-Tax" value={cPre2} setter={setCPre2} step={1000} onInputChange={onInputChange} defaultValue={23000} validate={validate401kContribution} tip="2026 IRS limit: $24,500" />
                        <Input label="Post-Tax" value={cPost2} setter={setCPost2} step={500} onInputChange={onInputChange} defaultValue={7000} validate={validateIRAContribution} tip="2026 IRS limit: $7,000" />
                        <Input label="Employer Match" value={cMatch2} setter={setCMatch2} step={500} onInputChange={onInputChange} defaultValue={0} validate={(val) => validateBalance(val, 'Employer match')} />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                id: "assumptions",
                label: "Assumptions",
                defaultOpen: false,
                content: (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {returnMode === 'fixed' && (
                        <SliderInput
                          label="Return Rate"
                          value={retRate}
                          onChange={setRetRate}
                          min={0}
                          max={20}
                          step={0.1}
                          unit="%"
                          description="Historical median ~ 9.8%"
                          onInputChange={onInputChange}
                        />
                      )}
                      <SliderInput
                        label="Inflation"
                        value={inflationRate}
                        onChange={setInflationRate}
                        min={0}
                        max={10}
                        step={0.1}
                        unit="%"
                        description="US avg ~2.6%"
                        onInputChange={onInputChange}
                      />
                      <SliderInput
                        label="State Tax"
                        value={stateRate}
                        onChange={setStateRate}
                        min={0}
                        max={15}
                        step={0.1}
                        unit="%"
                        description="Income tax rate"
                        onInputChange={onInputChange}
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label>Return Model</Label>
                        <select
                          value={returnMode}
                          onChange={(e) => {
                            const newMode = e.target.value as ReturnMode;
                            setReturnMode(newMode);
                            if (newMode === "randomWalk") {
                              setRandomWalkSeries("trulyRandom");
                            }
                            onInputChange();
                          }}
                          className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="fixed">Fixed (single rate)</option>
                          <option value="randomWalk">Random Walk (S&P bootstrap)</option>
                        </select>
                      </div>
                    </div>

                    {/* Asset Allocation Strategy */}
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-foreground">Asset Allocation Strategy</h4>
                        <Tip text="Choose how your portfolio is allocated between stocks and bonds." />
                      </div>

                      <div className="space-y-2">
                        <Label>Allocation Type</Label>
                        <select
                          value={allocationStrategy}
                          onChange={(e) => {
                            setAllocationStrategy(e.target.value as 'aggressive' | 'ageBased' | 'custom');
                            onInputChange();
                          }}
                          className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                        >
                          <option value="aggressive">100% Stocks (Aggressive)</option>
                          <option value="ageBased">Age-Based (Bond % = Your Age)</option>
                          <option value="custom">Custom Glide Path</option>
                        </select>
                      </div>

                      {allocationStrategy === 'custom' && (
                        <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                          <h5 className="font-semibold text-sm">Custom Bond Glide Path</h5>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Starting Bond %</Label>
                              <UIInput
                                type="number"
                                value={bondStartPct}
                                onChange={(e) => {
                                  setBondStartPct(Number(e.target.value));
                                  onInputChange();
                                }}
                                min={0}
                                max={100}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Ending Bond %</Label>
                              <UIInput
                                type="number"
                                value={bondEndPct}
                                onChange={(e) => {
                                  setBondEndPct(Number(e.target.value));
                                  onInputChange();
                                }}
                                min={0}
                                max={100}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Start at Age</Label>
                              <UIInput
                                type="number"
                                value={bondStartAge}
                                onChange={(e) => {
                                  setBondStartAge(Number(e.target.value));
                                  onInputChange();
                                }}
                                min={age1}
                                max={95}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>End at Age</Label>
                              <UIInput
                                type="number"
                                value={bondEndAge}
                                onChange={(e) => {
                                  setBondEndAge(Number(e.target.value));
                                  onInputChange();
                                }}
                                min={age1}
                                max={95}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label>Transition Shape</Label>
                            <select
                              value={glidePathShape}
                              onChange={(e) => {
                                setGlidePathShape(e.target.value as 'linear' | 'accelerated' | 'decelerated');
                                onInputChange();
                              }}
                              className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                            >
                              <option value="linear">Linear (steady increase)</option>
                              <option value="accelerated">Accelerated (faster early)</option>
                              <option value="decelerated">Decelerated (faster late)</option>
                            </select>
                          </div>

                          <div className="text-xs text-muted-foreground mt-2">
                            <p>
                              Bond allocation will transition from {bondStartPct}% at age {bondStartAge} to {bondEndPct}% at age {bondEndAge}.
                              Current allocation at age {age1}: {Math.round(calculateBondAllocation(age1, bondGlidePath))}% bonds.
                            </p>
                          </div>
                        </div>
                      )}

                      {allocationStrategy === 'ageBased' && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm">
                          <p>
                            Conservative glide path: 10% bonds (age &lt;40), gradually increasing to 60% bonds (age 60+).
                          </p>
                        </div>
                      )}

                      {allocationStrategy === 'aggressive' && (
                        <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800 text-sm">
                          <p>
                            Your portfolio will remain 100% stocks for maximum growth potential.
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <SliderInput
                        label="Withdrawal Rate"
                        value={wdRate}
                        onChange={setWdRate}
                        min={1}
                        max={8}
                        step={0.1}
                        unit="%"
                        description="Annual spending rate"
                        onInputChange={onInputChange}
                      />
                      <div className="space-y-4">
                        <Input
                          label="Increase Rate (%)"
                          value={incRate}
                          setter={setIncRate}
                          step={0.1}
                          isRate
                          disabled={!incContrib}
                          onInputChange={onInputChange}
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="inc-contrib"
                            checked={incContrib}
                            onChange={(e) => { setIncContrib(e.target.checked); onInputChange(); }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                          />
                          <Label htmlFor="inc-contrib" className="cursor-pointer">
                            Increase contributions annually {incContrib && <span className="print-only">check mark</span>}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                id: "advanced-settings",
                label: "Advanced Settings",
                defaultOpen: false,
                content: (
                  <div className="space-y-6">
                    {/* Social Security Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="include-ss"
                          checked={includeSS}
                          onChange={(e) => { setIncludeSS(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-ss" className="text-base font-semibold cursor-pointer">
                          Include Social Security Benefits
                        </Label>
                      </div>

                      {includeSS && (
                        <div className="space-y-6 pl-7">
                          <div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 mb-2">Primary</Badge>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input
                                label="Avg Career Earnings ($/yr)"
                                value={ssIncome}
                                setter={setSSIncome}
                                step={1000}
                                tip="Your average indexed earnings for SS calculation"
                                onInputChange={onInputChange}
                              />
                              <Input
                                label="Claim Age"
                                value={ssClaimAge}
                                setter={setSSClaimAge}
                                step={1}
                                min={62}
                                max={70}
                                tip="Age when you start claiming SS (62-70)"
                                onInputChange={onInputChange}
                              />
                            </div>
                          </div>
                          {isMar && (
                            <div>
                              <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 mb-2">Spouse</Badge>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Input
                                  label="Avg Career Earnings ($/yr)"
                                  value={ssIncome2}
                                  setter={setSSIncome2}
                                  step={1000}
                                  tip="Spouse's average indexed earnings"
                                  onInputChange={onInputChange}
                                />
                                <Input
                                  label="Claim Age"
                                  value={ssClaimAge2}
                                  setter={setSSClaimAge2}
                                  step={1}
                                  min={62}
                                  max={70}
                                  tip="Age when spouse starts claiming SS (62-70)"
                                  onInputChange={onInputChange}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Medicare Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="include-medicare"
                          checked={includeMedicare}
                          onChange={(e) => { setIncludeMedicare(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-medicare" className="text-base font-semibold cursor-pointer">
                          Include Medicare Premiums (Age 65+)
                        </Label>
                      </div>

                      {includeMedicare && (
                        <div className="space-y-4 pl-7">
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-muted-foreground mb-2">
                              Medicare premiums start at age 65. IRMAA surcharges apply when income exceeds thresholds.
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Base Monthly Premium ($)"
                              value={medicarePremium}
                              setter={setMedicarePremium}
                              step={10}
                              tip="Typical combined cost (~$400/month)"
                              onInputChange={onInputChange}
                            />
                            <Input
                              label="Medical Inflation Rate (%)"
                              value={medicalInflation}
                              setter={setMedicalInflation}
                              step={0.1}
                              isRate
                              tip="Healthcare costs typically inflate at 5-6%"
                              onInputChange={onInputChange}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Long-Term Care Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="include-ltc"
                          checked={includeLTC}
                          onChange={(e) => { setIncludeLTC(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-ltc" className="text-base font-semibold cursor-pointer">
                          Include Long-Term Care Planning
                        </Label>
                      </div>

                      {includeLTC && (
                        <div className="space-y-4 pl-7">
                          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>~70% of Americans need long-term care at some point.</strong>
                            </p>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Annual LTC Cost ($)"
                              value={ltcAnnualCost}
                              setter={setLtcAnnualCost}
                              step={5000}
                              tip="Typical cost: $80,000/year"
                              onInputChange={onInputChange}
                            />
                            <Input
                              label="Probability of Need (%)"
                              value={ltcProbability}
                              setter={setLtcProbability}
                              step={5}
                              min={0}
                              max={100}
                              isRate
                              tip="National average: 70%"
                              onInputChange={onInputChange}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Expected Duration (years)"
                              value={ltcDuration}
                              setter={setLtcDuration}
                              step={0.5}
                              isRate
                              tip="Typical: 3-4 years"
                              onInputChange={onInputChange}
                            />
                            <Input
                              label="Typical Onset Age"
                              value={ltcOnsetAge}
                              setter={setLtcOnsetAge}
                              step={1}
                              min={65}
                              max={95}
                              tip="Median: 82"
                              onInputChange={onInputChange}
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                              label="Age Range Start"
                              value={ltcAgeRangeStart}
                              setter={setLtcAgeRangeStart}
                              step={1}
                              min={65}
                              max={90}
                              tip="Earliest age LTC might begin"
                              onInputChange={onInputChange}
                            />
                            <Input
                              label="Age Range End"
                              value={ltcAgeRangeEnd}
                              setter={setLtcAgeRangeEnd}
                              step={1}
                              min={75}
                              max={95}
                              tip="Latest age LTC might begin"
                              onInputChange={onInputChange}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <Separator />

                    {/* Roth Conversion Strategy Section */}
                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="enable-roth-conversions"
                          checked={enableRothConversions}
                          onChange={(e) => { setEnableRothConversions(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="enable-roth-conversions" className="text-base font-semibold cursor-pointer">
                          Enable Automatic Roth Conversions
                        </Label>
                      </div>

                      {enableRothConversions && (
                        <div className="space-y-4 pl-7">
                          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Automatic Roth conversions can reduce lifetime taxes.</strong> Before RMDs begin (age {RMD_START_AGE}), convert pre-tax to Roth up to your target tax bracket each year.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label>Target Tax Bracket</Label>
                            <select
                              value={targetConversionBracket}
                              onChange={(e) => {
                                setTargetConversionBracket(parseFloat(e.target.value));
                                onInputChange();
                              }}
                              className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                            >
                              <option value={0.10}>10% - Low income bracket</option>
                              <option value={0.12}>12% - Lower-middle bracket</option>
                              <option value={0.22}>22% - Middle bracket</option>
                              <option value={0.24}>24% - Upper-middle bracket (recommended)</option>
                              <option value={0.32}>32% - High bracket</option>
                              <option value={0.35}>35% - Very high bracket</option>
                              <option value={0.37}>37% - Top bracket</option>
                            </select>
                            <p className="text-xs text-muted-foreground">
                              Convert pre-tax to Roth each year to fill up to this tax bracket.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ),
              },
            ]}
          />

          <Separator />

          <div className="flex flex-col items-center pt-6 pb-2 no-print">
            <Button
              onClick={onCalculate}
              disabled={isLoading}
              size="lg"
              className="w-full md:w-auto text-lg px-16 py-7 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              {isLoading ? (
                <span className="flex items-center gap-3">
                  <Spinner />
                  <span>
                    {calcProgress
                      ? `${calcProgress.message} (${calcProgress.percent}%)`
                      : 'Calculating...'}
                  </span>
                </span>
              ) : (
                <span className="flex items-center gap-3">
                  <TrendingUpIcon className="w-6 h-6" />
                  Calculate Retirement Plan
                </span>
              )}
            </Button>
            {err && (
              <div className="mt-6 p-5 bg-red-50 border-2 border-red-300 rounded-xl shadow-md max-w-2xl">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-800 font-medium text-base">{err}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}
