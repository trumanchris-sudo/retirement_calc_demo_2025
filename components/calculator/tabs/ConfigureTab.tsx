"use client"

import React, { useId, useMemo } from "react";
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
  validateTotalContributions,
} from "@/lib/fieldValidation";
import { calculateBondAllocation } from "@/lib/bondAllocation";
import { RMD_START_AGE } from "@/lib/constants";
import { usePlanConfig } from "@/lib/plan-config-context";
import { useBondGlidePathDerived, useIsMarried } from "@/hooks/useCalculatorDerivedState";
import { usePlanConfigSetters } from "@/hooks/usePlanConfigSetters";
import type { FilingStatus } from "@/lib/calculations/taxCalculations";
import { createDefaultPlanConfig } from "@/types/plan-config";
import type { ReturnMode } from "@/types/planner";
import type { CalculationProgress } from "@/types/calculator";

export interface ConfigureTabProps {
  // Actions
  onCalculate: () => void;
  onInputChange: () => void;
  markDirty: () => void;
  isLoading: boolean;
  err: string | null;
  calcProgress: CalculationProgress | null;

  // Refs
  tabGroupRef: React.RefObject<TabGroupRef | null>;
}

export function ConfigureTab({
  onCalculate, onInputChange, markDirty, isLoading, err, calcProgress, tabGroupRef
}: ConfigureTabProps) {
  const selectId = useId();
  const DEFAULTS = useMemo(() => createDefaultPlanConfig(), []);
  const { config: planConfig, updateConfig: updatePlanConfig } = usePlanConfig();

  const marital = planConfig.marital ?? DEFAULTS.marital;
  const age1 = planConfig.age1 ?? DEFAULTS.age1;
  const age2 = planConfig.age2 ?? DEFAULTS.age2;
  const retirementAge = planConfig.retirementAge ?? DEFAULTS.retirementAge;
  const isMar = useIsMarried(planConfig);

  const taxableBalance = planConfig.taxableBalance ?? DEFAULTS.taxableBalance;
  const pretaxBalance = planConfig.pretaxBalance ?? DEFAULTS.pretaxBalance;
  const rothBalance = planConfig.rothBalance ?? DEFAULTS.rothBalance;

  const cTax1 = planConfig.cTax1 ?? DEFAULTS.cTax1;
  const cPre1 = planConfig.cPre1 ?? DEFAULTS.cPre1;
  const cPost1 = planConfig.cPost1 ?? DEFAULTS.cPost1;
  const cMatch1 = Math.max(0, planConfig.cMatch1 ?? DEFAULTS.cMatch1);
  const cTax2 = planConfig.cTax2 ?? DEFAULTS.cTax2;
  const cPre2 = planConfig.cPre2 ?? DEFAULTS.cPre2;
  const cPost2 = planConfig.cPost2 ?? DEFAULTS.cPost2;
  const cMatch2 = Math.max(0, planConfig.cMatch2 ?? DEFAULTS.cMatch2);

  const retRate = planConfig.retRate ?? DEFAULTS.retRate;
  const inflationRate = planConfig.inflationRate ?? DEFAULTS.inflationRate;
  const stateRate = planConfig.stateRate ?? DEFAULTS.stateRate;
  const incContrib = planConfig.incContrib ?? DEFAULTS.incContrib;
  const incRate = planConfig.incRate ?? DEFAULTS.incRate;
  const wdRate = planConfig.wdRate ?? DEFAULTS.wdRate;

  const returnMode = planConfig.returnMode ?? DEFAULTS.returnMode;
  const allocationStrategy = planConfig.allocationStrategy ?? DEFAULTS.allocationStrategy;
  const bondStartPct = planConfig.bondStartPct ?? DEFAULTS.bondStartPct;
  const bondEndPct = planConfig.bondEndPct ?? DEFAULTS.bondEndPct;
  const bondStartAge = planConfig.bondStartAge ?? age1;
  const bondEndAge = planConfig.bondEndAge ?? DEFAULTS.bondEndAge;
  const glidePathShape = planConfig.glidePathShape ?? DEFAULTS.glidePathShape;
  const bondGlidePath = useBondGlidePathDerived(planConfig);

  const includeSS = planConfig.includeSS ?? DEFAULTS.includeSS;
  const ssIncome = planConfig.ssIncome ?? DEFAULTS.ssIncome;
  const ssClaimAge = planConfig.ssClaimAge ?? DEFAULTS.ssClaimAge;
  const ssIncome2 = planConfig.ssIncome2 ?? DEFAULTS.ssIncome2;
  const ssClaimAge2 = planConfig.ssClaimAge2 ?? DEFAULTS.ssClaimAge2;

  const includeMedicare = planConfig.includeMedicare ?? DEFAULTS.includeMedicare;
  const medicarePremium = planConfig.medicarePremium ?? DEFAULTS.medicarePremium;
  const medicalInflation = planConfig.medicalInflation ?? DEFAULTS.medicalInflation;

  const includeLTC = planConfig.includeLTC ?? DEFAULTS.includeLTC;
  const ltcAnnualCost = planConfig.ltcAnnualCost ?? DEFAULTS.ltcAnnualCost;
  const ltcProbability = planConfig.ltcProbability ?? DEFAULTS.ltcProbability;
  const ltcDuration = planConfig.ltcDuration ?? DEFAULTS.ltcDuration;
  const ltcOnsetAge = planConfig.ltcOnsetAge ?? DEFAULTS.ltcOnsetAge;
  const ltcAgeRangeStart = planConfig.ltcAgeRangeStart ?? DEFAULTS.ltcAgeRangeStart;
  const ltcAgeRangeEnd = planConfig.ltcAgeRangeEnd ?? DEFAULTS.ltcAgeRangeEnd;

  const enableRothConversions = planConfig.enableRothConversions ?? DEFAULTS.enableRothConversions;
  const targetConversionBracket = planConfig.targetConversionBracket ?? DEFAULTS.targetConversionBracket;

  const {
    setMarital, setAge1, setAge2, setRetirementAge,
    setTaxableBalance, setPretaxBalance, setRothBalance,
    setCTax1, setCPre1, setCPost1, setCMatch1,
    setCTax2, setCPre2, setCPost2, setCMatch2,
    setRetRate, setInflationRate, setStateRate, setIncContrib, setIncRate, setWdRate,
    setReturnMode, setRandomWalkSeries,
    setAllocationStrategy, setBondStartPct, setBondEndPct, setBondStartAge, setBondEndAge, setGlidePathShape,
    setIncludeSS, setSSIncome, setSSClaimAge, setSSIncome2, setSSClaimAge2,
    setIncludeMedicare, setMedicarePremium, setMedicalInflation,
    setIncludeLTC, setLtcAnnualCost, setLtcProbability, setLtcDuration,
    setLtcOnsetAge, setLtcAgeRangeStart, setLtcAgeRangeEnd,
    setEnableRothConversions, setTargetConversionBracket,
  } = usePlanConfigSetters(updatePlanConfig, markDirty, planConfig);

  // Cross-field validation: IRS Section 415(c) total annual additions
  const person1TotalValidation = useMemo(
    () => validateTotalContributions(cPre1, cMatch1, age1),
    [cPre1, cMatch1, age1]
  );
  const person2TotalValidation = useMemo(
    () => (isMar ? validateTotalContributions(cPre2, cMatch2, age2) : null),
    [cPre2, cMatch2, age2, isMar]
  );

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
                      <Label htmlFor={selectId + '-marital-status'}>Marital Status</Label>
                      <select
                        id={selectId + '-marital-status'}
                        value={marital}
                        onChange={(e) => { setMarital(e.target.value as FilingStatus); onInputChange(); }}
                        className="flex h-11 md:h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm ring-offset-white transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800"
                      >
                        <option value="single">Single</option>
                        <option value="married">Married</option>
                      </select>
                    </div>
                    <Input label="Your Age" value={age1} setter={setAge1} min={18} max={120} onInputChange={onInputChange} defaultValue={30} validate={(val) => validateAge(val, 'Your age')} />
                    <Input label="Retirement Age" value={retirementAge} setter={setRetirementAge} min={30} max={90} onInputChange={onInputChange} defaultValue={65} validate={(val) => validateRetirementAge(val, age1)} />
                    {isMar && (
                      <Input label="Spouse Age" value={age2} setter={setAge2} min={18} max={120} onInputChange={onInputChange} defaultValue={30} validate={(val) => validateAge(val, 'Spouse age')} />
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
                      <Input label="Taxable Brokerage ($/yr)" value={cTax1} setter={setCTax1} step={1000} onInputChange={onInputChange} defaultValue={10000} validate={(val) => validateBalance(val, 'Taxable contribution')} />
                      <Input label="Pre-Tax (401k/IRA) ($/yr)" value={cPre1} setter={setCPre1} step={1000} onInputChange={onInputChange} defaultValue={23000} validate={(val) => validate401kContribution(val, age1)} tip="2026 IRS limit: $24,500" />
                      <Input label="Post-Tax (Roth) ($/yr)" value={cPost1} setter={setCPost1} step={500} onInputChange={onInputChange} defaultValue={7000} validate={(val) => validateIRAContribution(val, age1)} tip="2026 IRS limit: $7,000" />
                      <Input label="Employer Match ($/yr)" value={cMatch1} setter={setCMatch1} step={500} onInputChange={onInputChange} defaultValue={0} validate={(val) => validateBalance(val, 'Employer match')} />
                      {person1TotalValidation && person1TotalValidation.error && (
                        <div
                          className={`p-3 rounded-lg border text-sm ${
                            person1TotalValidation.isValid
                              ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                          }`}
                          role="alert"
                        >
                          {person1TotalValidation.error}
                        </div>
                      )}
                    </div>
                    {isMar && (
                      <div className="space-y-4">
                        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 dark:bg-blue-900 dark:text-blue-100">
                          Spouse&apos;s Contributions
                        </Badge>
                        <Input label="Taxable Brokerage ($/yr)" value={cTax2} setter={setCTax2} step={1000} onInputChange={onInputChange} defaultValue={0} validate={(val) => validateBalance(val, 'Taxable contribution')} />
                        <Input label="Pre-Tax (401k/IRA) ($/yr)" value={cPre2} setter={setCPre2} step={1000} onInputChange={onInputChange} defaultValue={23000} validate={(val) => validate401kContribution(val, age2)} tip="2026 IRS limit: $24,500" />
                        <Input label="Post-Tax (Roth) ($/yr)" value={cPost2} setter={setCPost2} step={500} onInputChange={onInputChange} defaultValue={7000} validate={(val) => validateIRAContribution(val, age2)} tip="2026 IRS limit: $7,000" />
                        <Input label="Employer Match ($/yr)" value={cMatch2} setter={setCMatch2} step={500} onInputChange={onInputChange} defaultValue={0} validate={(val) => validateBalance(val, 'Employer match')} />
                        {person2TotalValidation && person2TotalValidation.error && (
                          <div
                            className={`p-3 rounded-lg border text-sm ${
                              person2TotalValidation.isValid
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                            }`}
                            role="alert"
                          >
                            {person2TotalValidation.error}
                          </div>
                        )}
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
                          label="Expected Return (Nominal)"
                          value={retRate}
                          onChange={setRetRate}
                          min={0}
                          max={20}
                          step={0.1}
                          unit="%"
                          description="Before inflation adjustment. Historical S&P 500 median ~9.8% nominal."
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
                        tip="Your state income tax rate. Enter 0% for states with no income tax (TX, FL, WA, etc.)"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor={selectId + '-return-model'} className="flex items-center gap-1.5">
                          Return Model
                          <Tip text="How investment returns are modeled. Fixed uses a constant rate; Historical simulates returns based on past S&P 500 data." />
                        </Label>
                        <select
                          id={selectId + '-return-model'}
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
                          <option value="randomWalk">Historical Market Simulation (S&P bootstrap)</option>
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
                        <Label htmlFor={selectId + '-allocation-type'} className="flex items-center gap-1.5">
                          Allocation Type
                          <Tip text="How your investments are divided between stocks, bonds, and other assets" />
                        </Label>
                        <select
                          id={selectId + '-allocation-type'}
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
                              <Label htmlFor="bond-start-pct">Starting Bond %</Label>
                              <UIInput
                                id="bond-start-pct"
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
                              <Label htmlFor="bond-end-pct">Ending Bond %</Label>
                              <UIInput
                                id="bond-end-pct"
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

                          {/* Warning: decreasing bond allocation */}
                          {bondStartPct > bondEndPct && (
                            <div
                              className="p-3 rounded-lg border text-sm bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                              role="status"
                            >
                              Starting bond % is greater than ending bond %. This creates a decreasing bond allocation over time, which is unconventional. Most glide paths increase bonds with age.
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="bond-start-age">Start at Age</Label>
                              <UIInput
                                id="bond-start-age"
                                type="number"
                                value={bondStartAge}
                                onChange={(e) => {
                                  const val = Math.max(age1, Number(e.target.value));
                                  setBondStartAge(val);
                                  onInputChange();
                                }}
                                min={age1}
                                max={95}
                                className="w-full"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="bond-end-age">End at Age</Label>
                              <UIInput
                                id="bond-end-age"
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

                          {/* Error: bondEndAge must be greater than bondStartAge */}
                          {bondEndAge <= bondStartAge && (
                            <div
                              className="p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                              role="alert"
                            >
                              End age must be greater than start age. Please increase the end age or decrease the start age.
                            </div>
                          )}

                          {/* Error: bondStartAge below current age */}
                          {bondStartAge < age1 && (
                            <div
                              className="p-3 rounded-lg border text-sm bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300"
                              role="alert"
                            >
                              Start age cannot be before your current age ({age1}).
                            </div>
                          )}

                          <div className="space-y-2">
                            <Label htmlFor="glide-path-shape">Transition Shape</Label>
                            <select
                              id="glide-path-shape"
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

                          {bondGlidePath && (
                            <div className="text-xs text-muted-foreground mt-2">
                              <p>
                                Bond allocation will transition from {bondStartPct}% at age {bondStartAge} to {bondEndPct}% at age {bondEndAge}.
                                Current allocation at age {age1}: {Math.round(calculateBondAllocation(age1, bondGlidePath))}% bonds.
                              </p>
                            </div>
                          )}
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
                        tip="Percentage of your portfolio withdrawn annually in retirement. The 4% rule is a common starting point."
                      />
                      <div className="space-y-4">
                        <Input
                          label="Contribution Growth Rate (%)"
                          value={incRate}
                          setter={setIncRate}
                          step={0.1}
                          isRate
                          disabled={!incContrib}
                          onInputChange={onInputChange}
                          tip="Annual rate at which your contributions increase (e.g., to keep pace with salary raises)"
                        />
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="inc-contrib"
                            aria-describedby="inc-contrib-desc"
                            checked={incContrib}
                            onChange={(e) => { setIncContrib(e.target.checked); onInputChange(); }}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                          />
                          <Label htmlFor="inc-contrib" className="cursor-pointer">
                            Increase contributions annually {incContrib && <span className="print-only">check mark</span>}
                          </Label>
                        </div>
                        <p id="inc-contrib-desc" className="text-xs text-muted-foreground">
                          Your contributions will increase at the specified rate each year
                        </p>
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
                          aria-describedby="include-ss-desc"
                          checked={includeSS}
                          onChange={(e) => { setIncludeSS(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-ss" className="text-base font-semibold cursor-pointer">
                          Include Social Security Benefits
                        </Label>
                      </div>
                      <p id="include-ss-desc" className="text-xs text-muted-foreground">
                        Estimate Social Security income based on your earnings history and claim age
                      </p>

                      {includeSS && (
                        <div className="space-y-6 pl-7">
                          <div>
                            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 mb-2">Primary</Badge>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Input
                                label="Average Annual Income (for Social Security)"
                                value={ssIncome}
                                setter={setSSIncome}
                                step={1000}
                                tip="Your average annual income used to estimate Social Security benefits"
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
                                  label="Average Annual Income (for Social Security)"
                                  value={ssIncome2}
                                  setter={setSSIncome2}
                                  step={1000}
                                  tip="Spouse's average annual income used to estimate Social Security benefits"
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
                          aria-describedby="include-medicare-desc"
                          checked={includeMedicare}
                          onChange={(e) => { setIncludeMedicare(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-medicare" className="text-base font-semibold cursor-pointer">
                          Include Medicare Premiums (Age 65+)
                        </Label>
                      </div>
                      <p id="include-medicare-desc" className="text-xs text-muted-foreground">
                        Account for Medicare Part B and D premiums including IRMAA surcharges
                      </p>

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
                          aria-describedby="include-ltc-desc"
                          checked={includeLTC}
                          onChange={(e) => { setIncludeLTC(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="include-ltc" className="text-base font-semibold cursor-pointer">
                          Include Long-Term Care Planning
                        </Label>
                      </div>
                      <p id="include-ltc-desc" className="text-xs text-muted-foreground">
                        Model potential long-term care costs based on probability and duration estimates
                      </p>

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

                          {ltcAgeRangeEnd <= ltcAgeRangeStart && (
                            <div
                              className="p-3 rounded-lg border text-sm bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300"
                              role="status"
                            >
                              Age range end ({ltcAgeRangeEnd}) must be greater than age range start ({ltcAgeRangeStart}). Please increase the end age or decrease the start age for a valid LTC planning window.
                            </div>
                          )}
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
                          aria-describedby="enable-roth-conversions-desc"
                          checked={enableRothConversions}
                          onChange={(e) => { setEnableRothConversions(e.target.checked); onInputChange(); }}
                          className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 no-print"
                        />
                        <Label htmlFor="enable-roth-conversions" className="text-base font-semibold cursor-pointer">
                          Enable Automatic Roth Conversions
                        </Label>
                      </div>
                      <p id="enable-roth-conversions-desc" className="text-xs text-muted-foreground">
                        Convert pre-tax funds to Roth before RMDs begin to reduce lifetime taxes
                      </p>

                      {enableRothConversions && (
                        <div className="space-y-4 pl-7">
                          <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                            <p className="text-sm text-muted-foreground mb-2">
                              <strong>Automatic Roth conversions can reduce lifetime taxes.</strong> Before RMDs begin (age {RMD_START_AGE}), convert pre-tax to Roth up to your target tax bracket each year.
                            </p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={selectId + '-target-tax-bracket'}>Target Tax Bracket</Label>
                            <select
                              id={selectId + '-target-tax-bracket'}
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
