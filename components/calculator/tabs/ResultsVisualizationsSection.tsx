"use client";

import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";

const Loading = () => <div className="h-64 animate-pulse bg-muted rounded" />;

const SankeyDiagram = dynamic(() => import("@/components/visualizations/SankeyDiagram"), { ssr: false, loading: Loading });
const HeatmapCalendar = dynamic(() => import("@/components/visualizations/HeatmapCalendar"), { ssr: false, loading: Loading });
const RadarChart = dynamic(() => import("@/components/visualizations/RadarChart"), { ssr: false, loading: Loading });
const Treemap = dynamic(() => import("@/components/visualizations/Treemap"), { ssr: false, loading: Loading });
const WaterfallChart = dynamic(() => import("@/components/visualizations/WaterfallChart"), { ssr: false, loading: Loading });
const NetWorthDashboard = dynamic(() => import("@/components/dashboard/NetWorthDashboard"), { ssr: false, loading: Loading });
const NetWorthProjector = dynamic(() => import("@/components/calculator/NetWorthProjector"), { ssr: false, loading: Loading });
const NetWorthTracker = dynamic(() => import("@/components/calculator/NetWorthTracker"), { ssr: false, loading: Loading });
const IncomeLadder = dynamic(() => import("@/components/income/IncomeLadder"), { ssr: false, loading: Loading });
const DividendTracker = dynamic(() => import("@/components/income/DividendTracker"), { ssr: false, loading: Loading });
const MilestoneTracker = dynamic(() => import("@/components/calculator/MilestoneTracker"), { ssr: false, loading: Loading });
const WealthTimeline = dynamic(() => import("@/components/calculator/WealthTimeline"), { ssr: false, loading: Loading });
const IncomeReplacementViz = dynamic(() => import("@/components/calculator/IncomeReplacementViz"), { ssr: false, loading: Loading });
const InflationHistory = dynamic(() => import("@/components/calculator/InflationHistory"), { ssr: false, loading: Loading });

export default function ResultsVisualizationsSection() {
  const { config: planConfig } = usePlanConfig();
  const D = createDefaultPlanConfig();
  const age = planConfig.age1 ?? D.age1 ?? 35;
  const retAge = planConfig.retirementAge ?? D.retirementAge ?? 65;
  const taxable = planConfig.taxableBalance ?? 0;
  const pretax = planConfig.pretaxBalance ?? 0;
  const roth = planConfig.rothBalance ?? 0;
  const totalBalance = taxable + pretax + roth;
  const annualContributions =
    (planConfig.cTax1 ?? 0) +
    (planConfig.cPre1 ?? 0) +
    (planConfig.cPost1 ?? 0) +
    (planConfig.cMatch1 ?? 0) +
    (planConfig.cTax2 ?? 0) +
    (planConfig.cPre2 ?? 0) +
    (planConfig.cPost2 ?? 0) +
    (planConfig.cMatch2 ?? 0);
  const targetRetirementIncome = (planConfig.primaryIncome ?? 0) * 0.8;

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="advanced-visualizations">
          <AccordionTrigger className="text-lg font-semibold">Advanced Visualizations</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <SankeyDiagram />
              <HeatmapCalendar contributions={[]} />
              <RadarChart scenarios={[]} />
              <Treemap data={{ id: "root", name: "Portfolio", value: 0, children: [] }} />
              <WaterfallChart data={[]} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="net-worth">
          <AccordionTrigger className="text-lg font-semibold">Net Worth &amp; Wealth</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <NetWorthDashboard
                assets={[]}
                liabilities={[]}
                history={[]}
                currentAge={age}
              />
              <NetWorthProjector
                totalAssets={totalBalance}
                totalLiabilities={0}
                taxableBalance={taxable}
                pretaxBalance={pretax}
                rothBalance={roth}
                annualContributions={annualContributions}
                currentAge={age}
              />
              <NetWorthTracker />
              <WealthTimeline
                result={{
                  finNom: totalBalance * 2,
                  finReal: totalBalance * 1.5,
                  wdNom: targetRetirementIncome,
                  wdReal: targetRetirementIncome * 0.8,
                  eolReal: totalBalance,
                  data: [],
                } as never}
                currentAge={age}
                retirementAge={retAge}
                currentWealth={totalBalance}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="income-analysis">
          <AccordionTrigger className="text-lg font-semibold">Income Analysis</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <IncomeLadder
                currentAge={age}
                retirementAge={retAge}
                targetRetirementIncome={targetRetirementIncome}
              />
              <DividendTracker />
              <IncomeReplacementViz
                portfolioAtRetirement={totalBalance}
                withdrawalRate={planConfig.wdRate ?? 3.5}
                inflationRate={planConfig.inflationRate ?? 2.5}
                currentAge={age}
                retirementAge={retAge}
                maritalStatus={planConfig.marital ?? "single"}
                currentAnnualIncome={planConfig.primaryIncome ?? 100000}
                includeSocialSecurity={planConfig.includeSS ?? true}
                ssAverageEarnings={planConfig.ssIncome ?? 0}
                ssClaimAge={planConfig.ssClaimAge ?? 67}
                pretaxBalance={pretax}
                stateRate={planConfig.stateRate ?? 5}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="milestones-trends">
          <AccordionTrigger className="text-lg font-semibold">Milestones &amp; Trends</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <MilestoneTracker
                result={null}
                currentAge={age}
                currentNetWorth={totalBalance}
              />
              <InflationHistory />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
