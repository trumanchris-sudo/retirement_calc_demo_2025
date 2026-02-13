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
                age={planConfig.age1 ?? D.age1 ?? 35}
                retirementAge={planConfig.retirementAge ?? D.retirementAge ?? 65}
                marital={planConfig.marital ?? "single"}
                taxableBalance={planConfig.taxableBalance ?? 0}
                pretaxBalance={planConfig.pretaxBalance ?? 0}
                rothBalance={planConfig.rothBalance ?? 0}
                cTax1={planConfig.cTax1 ?? 0}
                cPre1={planConfig.cPre1 ?? 0}
                cPost1={planConfig.cPost1 ?? 0}
                cMatch1={planConfig.cMatch1 ?? 0}
                retRate={planConfig.retRate ?? 7}
                inflationRate={planConfig.inflationRate ?? 2.5}
                wdRate={planConfig.wdRate ?? 4}
                stateRate={planConfig.stateRate ?? 5}
                includeSS={planConfig.includeSS ?? true}
                ssIncome={planConfig.ssIncome ?? 0}
                ssClaimAge={planConfig.ssClaimAge ?? 67}
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
                  (planConfig.taxableBalance ?? 0) +
                  (planConfig.pretaxBalance ?? 0) +
                  (planConfig.rothBalance ?? 0)
                }
                yearsToRetirement={
                  (planConfig.retirementAge ?? D.retirementAge ?? 65) -
                  (planConfig.age1 ?? D.age1 ?? 35)
                }
              />
              <MonteCarloVisualizer />
              <SequenceRisk
                batchSummary={null}
                retirementAge={planConfig.retirementAge ?? D.retirementAge ?? 65}
                age1={planConfig.age1 ?? D.age1 ?? 35}
              />
              <BondTent />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
