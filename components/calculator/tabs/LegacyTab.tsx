"use client"

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input as UIInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { AnimatedSection } from "@/components/ui/AnimatedSection";
import { Input, Spinner, Tip } from "@/components/calculator/InputHelpers";
import { RecalculateButton } from "@/components/calculator/RecalculateButton";
import { LegacyResultCard } from "@/components/LegacyResultCard";
import AddToWalletButton from "@/components/AddToWalletButton";
import DownloadCardButton from "@/components/DownloadCardButton";
import type { LegacyResult } from "@/lib/walletPass";
import type { CalculationResult } from "@/types/calculator";
import type { PlanConfig } from "@/types/plan-config";

// Lazy load DynastyTimeline
const DynastyTimeline = dynamic(
  () => import("@/components/calculator/DynastyTimeline").then((mod) => ({ default: mod.DynastyTimeline })),
  {
    ssr: false,
    loading: () => <div className="h-64 animate-pulse bg-gray-100 rounded" />,
  }
);

export interface LegacyTabProps {
  // Generational Wealth Settings
  showGen: boolean;
  setShowGen: (value: boolean) => void;
  hypPerBen: number;
  setHypPerBen: (value: number) => void;
  numberOfBeneficiaries: number;
  setNumberOfBeneficiaries: (value: number) => void;
  childrenCurrentAges: string;
  setChildrenCurrentAges: (value: string) => void;
  additionalChildrenExpected: number;
  setAdditionalChildrenExpected: (value: number) => void;
  totalFertilityRate: number;
  setTotalFertilityRate: (value: number) => void;
  generationLength: number;
  handleGenerationLengthChange: (value: number) => void;
  fertilityWindowStart: number;
  setFertilityWindowStart: (value: number) => void;
  fertilityWindowEnd: number;
  setFertilityWindowEnd: (value: number) => void;
  hypDeathAge: number;
  setHypDeathAge: (value: number) => void;
  hypMinDistAge: number;
  setHypMinDistAge: (value: number) => void;

  // Preset function
  applyGenerationalPreset: (preset: 'conservative' | 'moderate' | 'aggressive') => void;

  // Calculation
  onCalculate: (options?: { forceShowGen?: boolean }) => void;
  isRunning: boolean;
  isLoadingAi: boolean;

  // Results
  res: CalculationResult | null;
  legacyResult: LegacyResult | null;
  legacyCardRef: React.RefObject<HTMLDivElement>;
  genRef: React.RefObject<HTMLDivElement>;

  // For syncing children ages to context
  updatePlanConfig: (updates: Partial<PlanConfig>, source: 'default' | 'user-entered' | 'calculated') => void;
  onInputChange: () => void;
}

export function LegacyTab({
  showGen, setShowGen,
  hypPerBen, setHypPerBen,
  numberOfBeneficiaries, setNumberOfBeneficiaries,
  childrenCurrentAges, setChildrenCurrentAges,
  additionalChildrenExpected, setAdditionalChildrenExpected,
  totalFertilityRate, setTotalFertilityRate,
  generationLength, handleGenerationLengthChange,
  fertilityWindowStart, setFertilityWindowStart,
  fertilityWindowEnd, setFertilityWindowEnd,
  hypDeathAge, setHypDeathAge,
  hypMinDistAge, setHypMinDistAge,
  applyGenerationalPreset,
  onCalculate, isRunning, isLoadingAi,
  res, legacyResult, legacyCardRef, genRef,
  updatePlanConfig, onInputChange
}: LegacyTabProps) {
  return (
    <AnimatedSection animation="fade-in" delay={100}>
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Generational Wealth Modeling</CardTitle>
          <CardDescription>Model multi-generational wealth transfer and dynasty trusts</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Buttons */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm font-semibold mb-3 text-foreground">Quick Presets:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button
                onClick={() => applyGenerationalPreset('conservative')}
                variant="outline"
                className="w-full text-left justify-start hover:bg-blue-100 dark:hover:bg-blue-900"
              >
                <div>
                  <div className="font-semibold">Conservative</div>
                  <div className="text-xs text-muted-foreground">$75k/person, 1.5 children</div>
                </div>
              </Button>
              <Button
                onClick={() => applyGenerationalPreset('moderate')}
                variant="outline"
                className="w-full text-left justify-start hover:bg-indigo-100 dark:hover:bg-indigo-900"
              >
                <div>
                  <div className="font-semibold">Moderate</div>
                  <div className="text-xs text-muted-foreground">$100k/person, 2.1 children</div>
                </div>
              </Button>
              <Button
                onClick={() => applyGenerationalPreset('aggressive')}
                variant="outline"
                className="w-full text-left justify-start hover:bg-purple-100 dark:hover:bg-purple-900"
              >
                <div>
                  <div className="font-semibold">Aggressive</div>
                  <div className="text-xs text-muted-foreground">$150k/person, 2.5 children</div>
                </div>
              </Button>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Core Configuration */}
          <div className="space-y-4 mb-6">
            <h5 className="font-semibold text-foreground">Core Settings</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Annual Per Beneficiary (real $)"
                value={hypPerBen}
                setter={setHypPerBen}
                step={10000}
                tip="How much each person receives per year, adjusted for inflation"
                onInputChange={onInputChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5 text-foreground">
                  Children's Current Ages
                  <Tip text="Enter current ages of your children, separated by commas (e.g., 5, 3)" />
                </Label>
                <UIInput
                  type="text"
                  value={childrenCurrentAges}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setChildrenCurrentAges(newValue);
                    // Sync to context: parse ages and update numChildren/childrenAges
                    const parsedAges = newValue
                      .split(',')
                      .map(s => parseInt(s.trim(), 10))
                      .filter(n => !isNaN(n) && n >= 0);
                    updatePlanConfig({
                      numChildren: parsedAges.length,
                      childrenAges: parsedAges,
                    }, 'user-entered');
                    onInputChange();
                  }}
                  placeholder="5, 3"
                  className="w-full"
                />
              </div>
              <Input
                label="Additional Children Expected"
                value={additionalChildrenExpected}
                setter={setAdditionalChildrenExpected}
                min={0}
                max={10}
                step={1}
                tip="Number of children you plan to have in the future"
                onInputChange={onInputChange}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Children Per Person (Lifetime)"
                value={totalFertilityRate}
                setter={setTotalFertilityRate}
                min={0}
                max={5}
                step={0.1}
                isRate
                tip="Average children per person. 2.1 = replacement rate"
                onInputChange={onInputChange}
              />
              <Input
                label="Generation Length (years)"
                value={generationLength}
                setter={handleGenerationLengthChange}
                min={20}
                max={40}
                onInputChange={onInputChange}
                step={1}
                tip="Average age when people have children. Typical: 28-32"
              />
            </div>
          </div>

          <Separator className="my-6" />

          {/* Advanced Demographics */}
          <Accordion type="single" collapsible className="mb-4">
            <AccordionItem value="advanced">
              <AccordionTrigger className="text-sm font-semibold">
                Advanced Demographics
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Fertility Window Start"
                      value={fertilityWindowStart}
                      setter={setFertilityWindowStart}
                      min={18}
                      max={35}
                      step={1}
                      tip="Earliest age when people have children (typical: 25)"
                    />
                    <Input
                      label="Fertility Window End"
                      value={fertilityWindowEnd}
                      setter={setFertilityWindowEnd}
                      min={25}
                      max={45}
                      step={1}
                      tip="Latest age when people have children (typical: 35)"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Maximum Lifespan"
                      value={hypDeathAge}
                      setter={setHypDeathAge}
                      min={70}
                      max={100}
                      step={1}
                      tip="Maximum age for all beneficiaries"
                    />
                    <Input
                      label="Minimum Distribution Age"
                      value={hypMinDistAge}
                      setter={setHypMinDistAge}
                      min={0}
                      max={30}
                      step={1}
                      tip="Minimum age before beneficiaries can receive distributions"
                    />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Calculate Button */}
          <div className="mt-8 flex justify-center">
            <Button
              onClick={() => {
                // Enable generational modeling when calculating from Legacy tab
                setShowGen(true);
                // Pass forceShowGen to ensure legacy calculation runs immediately
                onCalculate({ forceShowGen: true });
              }}
              disabled={isRunning}
              size="lg"
              className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all"
            >
              {isRunning ? (
                <>
                  <Spinner className="mr-2" />
                  Calculating...
                </>
              ) : (
                'Calculate Legacy Plan'
              )}
            </Button>
          </div>

          {/* Status message when calculation ran but no legacy results */}
          {res && !res.genPayout && showGen && (
            <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg text-center">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Legacy calculation did not produce results.
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                This usually means the projected end-of-life estate is too small to fund generational distributions.
                Try increasing your savings rate or reducing the per-beneficiary payout amount, then recalculate.
              </p>
            </div>
          )}

          {res?.genPayout && (
            <>
              <Separator className="my-6" />
              <div ref={genRef} className="mt-6">
                {/* Single LegacyResultCard with calculated success rate */}
                <p className="text-sm text-muted-foreground mb-4 text-center">
                  This success rate shows what percentage of simulations leave enough estate
                  to sustain distributions indefinitely.
                </p>
                <div className="flex justify-center mb-6">
                  <div ref={legacyCardRef}>
                    <LegacyResultCard
                      payout={res.genPayout.perBenReal}
                      duration={res.genPayout.years}
                      isPerpetual={res.genPayout.p50?.isPerpetual === true}
                      successRate={(res.genPayout.probPerpetual || 0) * 100}
                    />
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-6 flex flex-col md:flex-row justify-center gap-3">
                  <RecalculateButton onClick={() => onCalculate()} isCalculating={isLoadingAi} />
                  <DownloadCardButton
                    enabled={!!legacyResult}
                    cardRef={legacyCardRef}
                    filename="legacy-card.png"
                  />
                  <AddToWalletButton result={legacyResult} />
                </div>

                {/* Dynasty Timeline Visualization */}
                {res.genPayout.p50?.generationData && res.genPayout.p50.generationData.length > 0 && (
                  <div className="mt-8">
                    <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 rounded" />}>
                      <DynastyTimeline generationData={res.genPayout.p50.generationData} />
                    </Suspense>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AnimatedSection>
  );
}
