"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import type { FinancialData } from "@/components/score/FinancialHealthScore";
import type { UserFinancialProfile } from "@/components/behavioral/Nudges";
import type { HelpContent } from "@/components/help/ContextualHelp";

const Loading = () => <div className="h-64 animate-pulse bg-muted rounded" />;

const FinancialHealthScore = dynamic(() => import("@/components/score/FinancialHealthScore"), { ssr: false, loading: Loading });
const Achievements = dynamic(() => import("@/components/gamification/Achievements"), { ssr: false, loading: Loading });
const GoalDashboard = dynamic(() => import("@/components/goals/GoalDashboard"), { ssr: false, loading: Loading });
const Nudges = dynamic(() => import("@/components/behavioral/Nudges"), { ssr: false, loading: Loading });
const ContextualHelp = dynamic(() => import("@/components/help/ContextualHelp"), { ssr: false, loading: Loading });

const defaultHelpContent: HelpContent = {
  fieldId: "gamification-overview",
  label: "Financial Health & Goals",
  explanation: "Track your financial health score, goals, and get personalized nudges to improve your plan.",
};

export default function GamificationSection() {
  const { config } = usePlanConfig();
  const D = createDefaultPlanConfig();

  const financialData: FinancialData = useMemo(() => ({
    emergencyFund: config.emergencyFund ?? D.emergencyFund,
    monthlyExpenses: (config.monthlyHouseholdExpenses ?? 0) + (config.monthlyDiscretionary ?? 0) + (config.monthlyChildcare ?? 0),
    totalDebt: 0,
    monthlyDebtPayment: 0,
    monthlyIncome: (config.primaryIncome ?? D.primaryIncome) / 12,
    highInterestDebt: 0,
    savingsRate:
      config.primaryIncome > 0
        ? (((config.cTax1 ?? D.cTax1) + (config.cPre1 ?? D.cPre1) + (config.cPost1 ?? D.cPost1)) / config.primaryIncome) * 100
        : 0,
    retirementBalance: (config.pretaxBalance ?? D.pretaxBalance) + (config.rothBalance ?? D.rothBalance) + (config.taxableBalance ?? D.taxableBalance),
    targetRetirementBalance: 0,
    monthlyRetirementContribution: ((config.cPre1 ?? D.cPre1) + (config.cPost1 ?? D.cPost1) + (config.cMatch1 ?? D.cMatch1)) / 12,
    hasHealthInsurance: true,
    hasLifeInsurance: (config.annualLifeInsuranceP1 ?? 0) > 0,
    hasDisabilityInsurance: false,
    hasUmbrellaInsurance: false,
    dependents: config.numChildren ?? D.numChildren,
    age: config.age1 ?? D.age1,
  }), [config, D]);

  const nudgeProfile: UserFinancialProfile = useMemo(() => ({
    currentSavingsRate:
      config.primaryIncome > 0
        ? (((config.cTax1 ?? D.cTax1) + (config.cPre1 ?? D.cPre1) + (config.cPost1 ?? D.cPost1)) / config.primaryIncome) * 100
        : 0,
    monthlyContribution: ((config.cPre1 ?? D.cPre1) + (config.cPost1 ?? D.cPost1) + (config.cTax1 ?? D.cTax1)) / 12,
    annualIncome: config.primaryIncome ?? D.primaryIncome,
    employerMatchPercent: 50,
    employerMatchLimit: config.primaryIncome > 0 ? ((config.cMatch1 ?? D.cMatch1) / config.primaryIncome) * 100 * 2 : 0,
    currentContributionPercent: config.primaryIncome > 0 ? ((config.cPre1 ?? D.cPre1) / config.primaryIncome) * 100 : 0,
    totalBalance: (config.pretaxBalance ?? D.pretaxBalance) + (config.rothBalance ?? D.rothBalance) + (config.taxableBalance ?? D.taxableBalance),
    taxableBalance: config.taxableBalance ?? D.taxableBalance,
    pretaxBalance: config.pretaxBalance ?? D.pretaxBalance,
    rothBalance: config.rothBalance ?? D.rothBalance,
    age: config.age1 ?? D.age1,
    retirementAge: config.retirementAge ?? D.retirementAge,
    retirementGoal: 0,
    marginalTaxRate: 22,
    stateTaxRate: config.stateRate ?? D.stateRate,
  }), [config, D]);

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="financial-health">
          <AccordionTrigger className="text-lg font-semibold">Financial Health &amp; Goals</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <FinancialHealthScore data={financialData} />
              <Achievements />
              <GoalDashboard goals={[]} />
              <Nudges profile={nudgeProfile} />
              <ContextualHelp content={defaultHelpContent} />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
