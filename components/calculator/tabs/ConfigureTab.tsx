"use client";

import React, { useId, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { TabGroup, type TabGroupRef } from "@/components/ui/TabGroup";
import { Spinner, TrendingUpIcon } from "@/components/calculator/InputHelpers";
import {
  AdvancedSettingsSection,
  AssumptionsSection,
  BalancesSection,
  ContributionsSection,
  PersonalInfoSection,
} from "@/components/calculator/tabs/configure/ConfigureTabSections";
import { validateTotalContributions } from "@/lib/fieldValidation";
import { usePlanConfig } from "@/lib/plan-config-context";
import { useBondGlidePathDerived, useIsMarried } from "@/hooks/useCalculatorDerivedState";
import { usePlanConfigSetters } from "@/hooks/usePlanConfigSetters";
import { createDefaultPlanConfig } from "@/types/plan-config";
import type { CalculationProgress } from "@/types/calculator";

export interface ConfigureTabProps {
  onCalculate: () => void;
  onInputChange: () => void;
  markDirty: () => void;
  isLoading: boolean;
  err: string | null;
  calcProgress: CalculationProgress | null;
  tabGroupRef: React.RefObject<TabGroupRef | null>;
}

export function ConfigureTab({
  onCalculate,
  onInputChange,
  markDirty,
  isLoading,
  err,
  calcProgress,
  tabGroupRef,
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
    setMarital,
    setAge1,
    setAge2,
    setRetirementAge,
    setTaxableBalance,
    setPretaxBalance,
    setRothBalance,
    setCTax1,
    setCPre1,
    setCPost1,
    setCMatch1,
    setCTax2,
    setCPre2,
    setCPost2,
    setCMatch2,
    setRetRate,
    setInflationRate,
    setStateRate,
    setIncContrib,
    setIncRate,
    setWdRate,
    setReturnMode,
    setRandomWalkSeries,
    setAllocationStrategy,
    setBondStartPct,
    setBondEndPct,
    setBondStartAge,
    setBondEndAge,
    setGlidePathShape,
    setIncludeSS,
    setSSIncome,
    setSSClaimAge,
    setSSIncome2,
    setSSClaimAge2,
    setIncludeMedicare,
    setMedicarePremium,
    setMedicalInflation,
    setIncludeLTC,
    setLtcAnnualCost,
    setLtcProbability,
    setLtcDuration,
    setLtcOnsetAge,
    setLtcAgeRangeStart,
    setLtcAgeRangeEnd,
    setEnableRothConversions,
    setTargetConversionBracket,
  } = usePlanConfigSetters(updatePlanConfig, markDirty, planConfig);

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
                  <PersonalInfoSection
                    selectId={selectId}
                    marital={marital}
                    setMarital={setMarital}
                    age1={age1}
                    setAge1={setAge1}
                    age2={age2}
                    setAge2={setAge2}
                    retirementAge={retirementAge}
                    setRetirementAge={setRetirementAge}
                    isMar={isMar}
                    onInputChange={onInputChange}
                  />
                ),
              },
              {
                id: "balances",
                label: "Current Balances",
                defaultOpen: false,
                content: (
                  <BalancesSection
                    taxableBalance={taxableBalance}
                    setTaxableBalance={setTaxableBalance}
                    pretaxBalance={pretaxBalance}
                    setPretaxBalance={setPretaxBalance}
                    rothBalance={rothBalance}
                    setRothBalance={setRothBalance}
                    onInputChange={onInputChange}
                  />
                ),
              },
              {
                id: "contributions",
                label: "Annual Contributions",
                defaultOpen: false,
                content: (
                  <ContributionsSection
                    isMar={isMar}
                    age1={age1}
                    age2={age2}
                    cTax1={cTax1}
                    setCTax1={setCTax1}
                    cPre1={cPre1}
                    setCPre1={setCPre1}
                    cPost1={cPost1}
                    setCPost1={setCPost1}
                    cMatch1={cMatch1}
                    setCMatch1={setCMatch1}
                    cTax2={cTax2}
                    setCTax2={setCTax2}
                    cPre2={cPre2}
                    setCPre2={setCPre2}
                    cPost2={cPost2}
                    setCPost2={setCPost2}
                    cMatch2={cMatch2}
                    setCMatch2={setCMatch2}
                    person1TotalValidation={person1TotalValidation}
                    person2TotalValidation={person2TotalValidation}
                    onInputChange={onInputChange}
                  />
                ),
              },
              {
                id: "assumptions",
                label: "Assumptions",
                defaultOpen: false,
                content: (
                  <AssumptionsSection
                    selectId={selectId}
                    returnMode={returnMode}
                    setReturnMode={setReturnMode}
                    setRandomWalkSeries={setRandomWalkSeries}
                    retRate={retRate}
                    setRetRate={setRetRate}
                    inflationRate={inflationRate}
                    setInflationRate={setInflationRate}
                    stateRate={stateRate}
                    setStateRate={setStateRate}
                    allocationStrategy={allocationStrategy}
                    setAllocationStrategy={setAllocationStrategy}
                    bondStartPct={bondStartPct}
                    setBondStartPct={setBondStartPct}
                    bondEndPct={bondEndPct}
                    setBondEndPct={setBondEndPct}
                    bondStartAge={bondStartAge}
                    setBondStartAge={setBondStartAge}
                    bondEndAge={bondEndAge}
                    setBondEndAge={setBondEndAge}
                    glidePathShape={glidePathShape}
                    setGlidePathShape={setGlidePathShape}
                    bondGlidePath={bondGlidePath}
                    age1={age1}
                    wdRate={wdRate}
                    setWdRate={setWdRate}
                    incRate={incRate}
                    setIncRate={setIncRate}
                    incContrib={incContrib}
                    setIncContrib={setIncContrib}
                    onInputChange={onInputChange}
                  />
                ),
              },
              {
                id: "advanced-settings",
                label: "Advanced Settings",
                defaultOpen: false,
                content: (
                  <AdvancedSettingsSection
                    selectId={selectId}
                    isMar={isMar}
                    includeSS={includeSS}
                    setIncludeSS={setIncludeSS}
                    ssIncome={ssIncome}
                    setSSIncome={setSSIncome}
                    ssClaimAge={ssClaimAge}
                    setSSClaimAge={setSSClaimAge}
                    ssIncome2={ssIncome2}
                    setSSIncome2={setSSIncome2}
                    ssClaimAge2={ssClaimAge2}
                    setSSClaimAge2={setSSClaimAge2}
                    includeMedicare={includeMedicare}
                    setIncludeMedicare={setIncludeMedicare}
                    medicarePremium={medicarePremium}
                    setMedicarePremium={setMedicarePremium}
                    medicalInflation={medicalInflation}
                    setMedicalInflation={setMedicalInflation}
                    includeLTC={includeLTC}
                    setIncludeLTC={setIncludeLTC}
                    ltcAnnualCost={ltcAnnualCost}
                    setLtcAnnualCost={setLtcAnnualCost}
                    ltcProbability={ltcProbability}
                    setLtcProbability={setLtcProbability}
                    ltcDuration={ltcDuration}
                    setLtcDuration={setLtcDuration}
                    ltcOnsetAge={ltcOnsetAge}
                    setLtcOnsetAge={setLtcOnsetAge}
                    ltcAgeRangeStart={ltcAgeRangeStart}
                    setLtcAgeRangeStart={setLtcAgeRangeStart}
                    ltcAgeRangeEnd={ltcAgeRangeEnd}
                    setLtcAgeRangeEnd={setLtcAgeRangeEnd}
                    enableRothConversions={enableRothConversions}
                    setEnableRothConversions={setEnableRothConversions}
                    targetConversionBracket={targetConversionBracket}
                    setTargetConversionBracket={setTargetConversionBracket}
                    onInputChange={onInputChange}
                  />
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
                      : "Calculating..."}
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
