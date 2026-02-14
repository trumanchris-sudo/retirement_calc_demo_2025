"use client";

import dynamic from "next/dynamic";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";

const Loading = () => (
  <div className="h-64 animate-pulse bg-muted rounded" />
);

const ScenarioBuilder = dynamic(
  () => import("@/components/scenarios/ScenarioBuilder"),
  { ssr: false, loading: Loading }
);
const WhatIfScenarios = dynamic(
  () => import("@/components/calculator/WhatIfScenarios"),
  { ssr: false, loading: Loading }
);
const LifeEventSimulator = dynamic(
  () => import("@/components/life/LifeEventSimulator"),
  { ssr: false, loading: Loading }
);
const CrashSimulator = dynamic(
  () => import("@/components/calculator/CrashSimulator"),
  { ssr: false, loading: Loading }
);
const MonteCarloVisualizer = dynamic(
  () => import("@/components/calculator/MonteCarloVisualizerWrapper").then(mod => ({ default: mod.MonteCarloVisualizer })),
  { ssr: false, loading: Loading }
);
const SequenceRisk = dynamic(
  () => import("@/components/calculator/SequenceRisk").then(mod => ({ default: mod.SequenceRisk })),
  { ssr: false, loading: Loading }
);
const BondTent = dynamic(
  () => import("@/components/calculator/BondTent"),
  { ssr: false, loading: Loading }
);

export default function StressToolsSection() {
  const { config: planConfig } = usePlanConfig();
  const D = createDefaultPlanConfig();

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="scenario-analysis">
          <AccordionTrigger className="text-lg font-semibold">
            Scenario Analysis
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <ScenarioBuilder />
              <WhatIfScenarios
                age={planConfig.age1 ?? D.age1}
                retirementAge={planConfig.retirementAge ?? D.retirementAge}
                marital={planConfig.marital ?? D.marital}
                taxableBalance={planConfig.taxableBalance ?? D.taxableBalance}
                pretaxBalance={planConfig.pretaxBalance ?? D.pretaxBalance}
                rothBalance={planConfig.rothBalance ?? D.rothBalance}
                cTax1={planConfig.cTax1 ?? D.cTax1}
                cPre1={planConfig.cPre1 ?? D.cPre1}
                cPost1={planConfig.cPost1 ?? D.cPost1}
                cMatch1={planConfig.cMatch1 ?? D.cMatch1}
                retRate={planConfig.retRate ?? D.retRate}
                inflationRate={planConfig.inflationRate ?? D.inflationRate}
                wdRate={planConfig.wdRate ?? D.wdRate}
                stateRate={planConfig.stateRate ?? D.stateRate}
                includeSS={planConfig.includeSS ?? D.includeSS}
                ssIncome={planConfig.ssIncome ?? D.ssIncome}
                ssClaimAge={planConfig.ssClaimAge ?? D.ssClaimAge}
              />
              <LifeEventSimulator />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="market-simulations">
          <AccordionTrigger className="text-lg font-semibold">
            Market Simulations
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <CrashSimulator
                portfolioValue={
                  (planConfig.taxableBalance ?? D.taxableBalance) +
                  (planConfig.pretaxBalance ?? D.pretaxBalance) +
                  (planConfig.rothBalance ?? D.rothBalance)
                }
                yearsToRetirement={
                  (planConfig.retirementAge ?? D.retirementAge) -
                  (planConfig.age1 ?? D.age1)
                }
              />
              <MonteCarloVisualizer />
              <SequenceRisk
                batchSummary={null}
                retirementAge={planConfig.retirementAge ?? D.retirementAge}
                age1={planConfig.age1 ?? D.age1}
              />
              <BondTent />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
