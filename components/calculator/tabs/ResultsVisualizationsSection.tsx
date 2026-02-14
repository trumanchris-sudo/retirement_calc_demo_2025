"use client";

import { useMemo } from "react";
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
  const age = planConfig.age1 ?? D.age1;
  const retAge = planConfig.retirementAge ?? D.retirementAge;
  const taxable = planConfig.taxableBalance ?? D.taxableBalance;
  const pretax = planConfig.pretaxBalance ?? D.pretaxBalance;
  const roth = planConfig.rothBalance ?? D.rothBalance;
  const totalBalance = taxable + pretax + roth;
  const annualContributions =
    (planConfig.cTax1 ?? D.cTax1) +
    (planConfig.cPre1 ?? D.cPre1) +
    (planConfig.cPost1 ?? D.cPost1) +
    (planConfig.cMatch1 ?? D.cMatch1) +
    (planConfig.cTax2 ?? D.cTax2) +
    (planConfig.cPre2 ?? D.cPre2) +
    (planConfig.cPost2 ?? D.cPost2) +
    (planConfig.cMatch2 ?? D.cMatch2);
  const targetRetirementIncome = (planConfig.primaryIncome ?? D.primaryIncome) * 0.8;

  // === Derive Sankey data from PlanConfig ===
  const sankeyData = useMemo(() => {
    const p1Income = planConfig.primaryIncome ?? D.primaryIncome ?? 0;
    const p2Income = planConfig.spouseIncome ?? D.spouseIncome ?? 0;
    const isMarried = (planConfig.marital ?? D.marital) === "married";
    const bonus = planConfig.eoyBonusAmount ?? 0;

    // Contributions
    const cPre1 = planConfig.cPre1 ?? D.cPre1 ?? 0;
    const cPost1 = planConfig.cPost1 ?? D.cPost1 ?? 0;
    const cTax1 = planConfig.cTax1 ?? D.cTax1 ?? 0;
    const cMatch1 = planConfig.cMatch1 ?? D.cMatch1 ?? 0;
    const cPre2 = planConfig.cPre2 ?? D.cPre2 ?? 0;
    const cPost2 = planConfig.cPost2 ?? D.cPost2 ?? 0;
    const cTax2 = planConfig.cTax2 ?? D.cTax2 ?? 0;
    const cMatch2 = planConfig.cMatch2 ?? D.cMatch2 ?? 0;

    // Build income sources
    type IncomeItem = { id: string; label: string; amount: number; color: string };
    const incomeSources: IncomeItem[] = [];
    const baseIncome = p1Income - bonus; // Remove bonus from primary to avoid double count
    if (baseIncome > 0) {
      incomeSources.push({ id: "salary", label: "Primary Income", amount: baseIncome, color: "#10b981" });
    }
    if (isMarried && p2Income > 0) {
      incomeSources.push({ id: "spouse-salary", label: "Spouse Income", amount: p2Income, color: "#34d399" });
    }
    if (bonus > 0) {
      incomeSources.push({ id: "bonus", label: "Bonus", amount: bonus, color: "#6ee7b7" });
    }
    const totalPreTaxContribs = cPre1 + cPre2 + cMatch1 + cMatch2;
    const totalRothContribs = cPost1 + cPost2;
    const totalTaxableContribs = cTax1 + cTax2;

    // Build account nodes
    const accounts = [];
    if (totalPreTaxContribs > 0) {
      // Rough tax leakage: assume ~22% effective federal rate on pre-tax withdrawals
      const taxLeakage = Math.round(totalPreTaxContribs * 0.22);
      accounts.push({ id: "401k", label: "Pre-Tax (401k/IRA)", type: "401k" as const, inflow: totalPreTaxContribs, outflow: totalPreTaxContribs - taxLeakage, taxLeakage, color: "#3b82f6" });
    }
    if (totalRothContribs > 0) {
      accounts.push({ id: "roth", label: "Roth", type: "roth" as const, inflow: totalRothContribs, outflow: totalRothContribs, taxLeakage: 0, color: "#8b5cf6" });
    }
    if (totalTaxableContribs > 0) {
      // Capital gains tax leakage ~15%
      const taxLeakage = Math.round(totalTaxableContribs * 0.15 * (planConfig.dividendYield ?? D.dividendYield ?? 2) / 100);
      accounts.push({ id: "taxable", label: "Taxable Brokerage", type: "taxable" as const, inflow: totalTaxableContribs, outflow: totalTaxableContribs - taxLeakage, taxLeakage, color: "#06b6d4" });
    }

    // Build spending categories from monthly expenses
    const housing = ((planConfig.monthlyMortgageRent ?? 0) + (planConfig.monthlyUtilities ?? 0) + (planConfig.monthlyInsurancePropertyTax ?? 0)) * 12;
    const healthcare = ((planConfig.monthlyHealthcareP1 ?? 0) + (planConfig.monthlyHealthcareP2 ?? 0)) * 12;
    const lifestyle = ((planConfig.monthlyOtherExpenses ?? 0) + (planConfig.monthlyHouseholdExpenses ?? 0) + (planConfig.monthlyDiscretionary ?? 0)) * 12;

    const spendingCategories = [];
    if (housing > 0) spendingCategories.push({ id: "housing", label: "Housing", amount: housing, color: "#f59e0b" });
    if (healthcare > 0) spendingCategories.push({ id: "healthcare", label: "Healthcare", amount: healthcare, color: "#ef4444" });
    if (lifestyle > 0) spendingCategories.push({ id: "lifestyle", label: "Lifestyle", amount: lifestyle, color: "#ec4899" });

    // Build flows (simplified: income -> accounts -> spending)
    const flows = [];
    const totalIncome = incomeSources.reduce((s, i) => s + i.amount, 0);
    const totalContribs = totalPreTaxContribs + totalRothContribs + totalTaxableContribs;

    // Distribute income to accounts proportionally
    for (const src of incomeSources) {
      const ratio = totalIncome > 0 ? src.amount / totalIncome : 0;
      if (totalPreTaxContribs > 0) flows.push({ source: src.id, target: "401k", value: Math.round(totalPreTaxContribs * ratio) });
      if (totalRothContribs > 0) flows.push({ source: src.id, target: "roth", value: Math.round(totalRothContribs * ratio) });
      if (totalTaxableContribs > 0) flows.push({ source: src.id, target: "taxable", value: Math.round(totalTaxableContribs * ratio) });
    }

    // Distribute account outflows to spending proportionally
    const totalSpending = spendingCategories.reduce((s, c) => s + c.amount, 0);
    for (const acct of accounts) {
      for (const cat of spendingCategories) {
        const ratio = totalSpending > 0 ? cat.amount / totalSpending : 0;
        const flow = Math.round(acct.outflow * ratio);
        if (flow > 0) flows.push({ source: acct.id, target: cat.id, value: flow });
      }
      if (acct.taxLeakage > 0) {
        flows.push({ source: acct.id, target: "tax-leak", value: acct.taxLeakage, isTaxLeakage: true });
      }
    }

    return { incomeSources, accounts, spendingCategories, flows };
  }, [planConfig, D]);

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="advanced-visualizations">
          <AccordionTrigger className="text-lg font-semibold">Advanced Visualizations</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <SankeyDiagram
                incomeSources={sankeyData.incomeSources}
                accounts={sankeyData.accounts}
                spendingCategories={sankeyData.spendingCategories}
                flows={sankeyData.flows}
              />
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
                withdrawalRate={planConfig.wdRate ?? D.wdRate}
                inflationRate={planConfig.inflationRate ?? D.inflationRate}
                currentAge={age}
                retirementAge={retAge}
                maritalStatus={planConfig.marital ?? D.marital}
                currentAnnualIncome={planConfig.primaryIncome ?? D.primaryIncome}
                includeSocialSecurity={planConfig.includeSS ?? D.includeSS}
                ssAverageEarnings={planConfig.ssIncome ?? D.ssIncome}
                ssClaimAge={planConfig.ssClaimAge ?? D.ssClaimAge}
                pretaxBalance={pretax}
                stateRate={planConfig.stateRate ?? D.stateRate}
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
