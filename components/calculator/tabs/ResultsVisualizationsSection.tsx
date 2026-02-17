"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import { createUserProfile, createOptimalProfile } from "@/components/visualizations/RadarChart";
import { RADAR_COLORS } from "@/lib/chartColors";
import type { DailyContribution } from "@/components/visualizations/HeatmapCalendar";
import type { WaterfallDataPoint } from "@/components/visualizations/WaterfallChart";
import type { TreemapNode } from "@/components/visualizations/Treemap";
import type { CalculationResult } from "@/types/calculator";
import { PiggyBank, Landmark, Wallet } from "lucide-react";

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

interface ResultsVisualizationsSectionProps {
  calculationResult?: CalculationResult | null;
}

export default function ResultsVisualizationsSection({ calculationResult }: ResultsVisualizationsSectionProps) {
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
  const grossIncome = (planConfig.primaryIncome ?? D.primaryIncome) +
    (planConfig.spouseIncome ?? D.spouseIncome ?? 0);

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

  // === 1. Derive HeatmapCalendar contribution data from PlanConfig ===
  const heatmapContributions = useMemo((): DailyContribution[] => {
    if (annualContributions <= 0) return [];

    const currentYear = new Date().getFullYear();
    const contributions: DailyContribution[] = [];

    // Distribute annual contributions across ~260 working days (weekdays)
    const cPre1 = planConfig.cPre1 ?? D.cPre1 ?? 0;
    const cPost1 = planConfig.cPost1 ?? D.cPost1 ?? 0;
    const cTax1 = planConfig.cTax1 ?? D.cTax1 ?? 0;
    const cMatch1 = planConfig.cMatch1 ?? D.cMatch1 ?? 0;

    // Per-paycheck amounts (biweekly = 26 pay periods)
    const payPeriods = 26;
    const preTaxPerPeriod = (cPre1 + cMatch1) / payPeriods;
    const rothPerPeriod = cPost1 / payPeriods;
    const taxablePerPeriod = cTax1 / payPeriods;

    // Generate biweekly contributions on Fridays throughout the year
    const startDate = new Date(currentYear, 0, 1);
    // Find first Friday
    while (startDate.getDay() !== 5) {
      startDate.setDate(startDate.getDate() + 1);
    }

    for (let period = 0; period < payPeriods; period++) {
      const payDate = new Date(startDate);
      payDate.setDate(payDate.getDate() + period * 14);
      if (payDate.getFullYear() !== currentYear) break;

      const dateStr = payDate.toISOString().split("T")[0];

      if (preTaxPerPeriod > 0) {
        contributions.push({
          date: dateStr,
          amount: Math.round(preTaxPerPeriod),
          type: "401k",
          note: "Pre-tax 401(k) + employer match",
        });
      }
      if (rothPerPeriod > 0) {
        contributions.push({
          date: dateStr,
          amount: Math.round(rothPerPeriod),
          type: "ira",
          note: "Roth contribution",
        });
      }
      if (taxablePerPeriod > 0) {
        // Taxable contributions happen on same payday
        const taxDate = new Date(payDate);
        taxDate.setDate(taxDate.getDate() + 1); // Next day to avoid duplicate keys
        const taxDateStr = taxDate.toISOString().split("T")[0];
        contributions.push({
          date: taxDateStr,
          amount: Math.round(taxablePerPeriod),
          type: "savings",
          note: "Taxable brokerage contribution",
        });
      }
    }

    return contributions;
  }, [annualContributions, planConfig, D]);

  // === 2. Derive RadarChart scenario data from PlanConfig ===
  const radarScenarios = useMemo(() => {
    const totalIncome = (planConfig.primaryIncome ?? D.primaryIncome) +
      (planConfig.spouseIncome ?? D.spouseIncome ?? 0);
    const savingsRate = totalIncome > 0
      ? (annualContributions / totalIncome) * 100
      : 0;

    // Tax-advantaged percentage: pretax + roth contributions vs total
    const taxAdvantaged = annualContributions > 0
      ? (((planConfig.cPre1 ?? D.cPre1) + (planConfig.cPost1 ?? D.cPost1) +
          (planConfig.cMatch1 ?? D.cMatch1) + (planConfig.cPre2 ?? D.cPre2) +
          (planConfig.cPost2 ?? D.cPost2) + (planConfig.cMatch2 ?? D.cMatch2)) /
          annualContributions) * 100
      : 0;

    // Stock allocation based on bond allocation config
    const bondPct = planConfig.bondStartPct ?? D.bondStartPct;
    const stockAllocation = 100 - bondPct;

    // Diversification: count distinct account types with balances
    let assetClassCount = 0;
    if (taxable > 0) assetClassCount++;
    if (pretax > 0) assetClassCount++;
    if (roth > 0) assetClassCount++;
    if ((planConfig.emergencyFund ?? D.emergencyFund) > 0) assetClassCount++;
    // Assume at least stocks and bonds within accounts
    assetClassCount = Math.max(assetClassCount, 2);

    // Emergency fund months
    const monthlyExpenses = ((planConfig.monthlyMortgageRent ?? 0) +
      (planConfig.monthlyUtilities ?? 0) +
      (planConfig.monthlyInsurancePropertyTax ?? 0) +
      (planConfig.monthlyHealthcareP1 ?? 0) +
      (planConfig.monthlyHealthcareP2 ?? 0) +
      (planConfig.monthlyOtherExpenses ?? 0) +
      (planConfig.monthlyHouseholdExpenses ?? 0) +
      (planConfig.monthlyDiscretionary ?? 0)) || (totalIncome / 12 * 0.5);
    const emergencyMonths = monthlyExpenses > 0
      ? (planConfig.emergencyFund ?? D.emergencyFund) / monthlyExpenses
      : 3;

    const userProfile = createUserProfile({
      savingsRatePercent: savingsRate,
      taxAdvantagedPercent: Math.min(taxAdvantaged, 100),
      stockAllocationPercent: stockAllocation,
      assetClassCount,
      emergencyFundMonths: emergencyMonths,
      age,
    }, "Your Profile", RADAR_COLORS.userProfile);

    // Aggressive scenario: higher savings, more stocks, fewer emergency months
    const aggressiveProfile = createUserProfile({
      savingsRatePercent: Math.min(savingsRate * 1.5, 40),
      taxAdvantagedPercent: 80,
      stockAllocationPercent: Math.min(stockAllocation + 15, 95),
      assetClassCount: Math.max(assetClassCount, 4),
      emergencyFundMonths: 3,
      age,
    }, "Aggressive", RADAR_COLORS.aggressive);

    const optimalProfile = createOptimalProfile(RADAR_COLORS.optimal);

    return [userProfile, optimalProfile, aggressiveProfile];
  }, [annualContributions, planConfig, D, age, taxable, pretax, roth]);

  // === 3. Derive WaterfallChart data from PlanConfig ===
  const waterfallData = useMemo((): WaterfallDataPoint[] => {
    const grossIncome = (planConfig.primaryIncome ?? D.primaryIncome) +
      (planConfig.spouseIncome ?? D.spouseIncome ?? 0);

    if (grossIncome <= 0) return [];

    // Estimate taxes
    const federalRate = 0.22; // Effective federal rate estimate
    const stateRate = (planConfig.stateRate ?? D.stateRate) / 100;
    const ficaRate = 0.0765; // Social Security + Medicare

    const federalTax = Math.round(grossIncome * federalRate);
    const stateTax = Math.round(grossIncome * stateRate);
    const ficaTax = Math.round(Math.min(grossIncome, 168600) * ficaRate);

    // Monthly expenses annualized
    const housing = ((planConfig.monthlyMortgageRent ?? 0) +
      (planConfig.monthlyUtilities ?? 0) +
      (planConfig.monthlyInsurancePropertyTax ?? 0)) * 12;
    const healthcare = ((planConfig.monthlyHealthcareP1 ?? 0) +
      (planConfig.monthlyHealthcareP2 ?? 0)) * 12;
    const living = ((planConfig.monthlyOtherExpenses ?? 0) +
      (planConfig.monthlyHouseholdExpenses ?? 0) +
      (planConfig.monthlyDiscretionary ?? 0)) * 12;

    const totalTaxes = federalTax + stateTax + ficaTax;
    const totalExpenses = housing + healthcare + living;
    const netSavings = grossIncome - totalTaxes - totalExpenses - annualContributions;

    const data: WaterfallDataPoint[] = [
      {
        label: "Gross Income",
        value: grossIncome,
        category: "income",
        description: "Total household annual earnings",
      },
      {
        label: "Federal Tax",
        value: -federalTax,
        category: "tax",
        description: "Estimated federal income tax (~22% effective rate)",
      },
    ];

    if (stateTax > 0) {
      data.push({
        label: "State Tax",
        value: -stateTax,
        category: "tax",
        description: `State income tax (${(stateRate * 100).toFixed(1)}%)`,
      });
    }

    data.push({
      label: "FICA",
      value: -ficaTax,
      category: "tax",
      description: "Social Security and Medicare payroll taxes",
    });

    if (housing > 0) {
      data.push({
        label: "Housing",
        value: -housing,
        category: "expense",
        description: "Mortgage/rent, utilities, insurance, property tax",
      });
    }

    if (healthcare > 0) {
      data.push({
        label: "Healthcare",
        value: -healthcare,
        category: "expense",
        description: "Health insurance and medical expenses",
      });
    }

    if (living > 0) {
      data.push({
        label: "Living Expenses",
        value: -living,
        category: "expense",
        description: "Groceries, household, discretionary spending",
      });
    }

    if (annualContributions > 0) {
      data.push({
        label: "Retirement Savings",
        value: -annualContributions,
        category: "savings",
        description: "Total annual retirement contributions (401k, IRA, taxable)",
      });
    }

    data.push({
      label: "Remaining",
      value: Math.max(netSavings, 0),
      category: "total",
      description: "Cash remaining after taxes, expenses, and retirement savings",
    });

    return data;
  }, [planConfig, D, annualContributions]);

  // === 4. Derive Treemap portfolio allocation from PlanConfig ===
  const treemapData = useMemo((): TreemapNode => {
    if (totalBalance <= 0) {
      return { id: "root", name: "Portfolio", value: 0, children: [] };
    }

    // Age-based stock/bond split using rule of 110
    const stockPct = Math.max(20, Math.min(90, 110 - age)) / 100;

    const buildChildren = (
      parentId: string,
      parentValue: number,
      accountType: "401k" | "roth" | "taxable"
    ): TreemapNode[] => {
      if (parentValue <= 0) return [];
      const stocks = Math.round(parentValue * stockPct);
      const bonds = parentValue - stocks;
      const children: TreemapNode[] = [];
      if (stocks > 0) {
        children.push({
          id: `${parentId}-stocks`,
          name: "Stocks",
          value: stocks,
          accountType,
          assetClass: "stocks",
          riskLevel: "high",
        });
      }
      if (bonds > 0) {
        children.push({
          id: `${parentId}-bonds`,
          name: "Bonds",
          value: bonds,
          accountType,
          assetClass: "bonds",
          riskLevel: "low",
        });
      }
      return children;
    };

    const children: TreemapNode[] = [];

    if (pretax > 0) {
      children.push({
        id: "pretax",
        name: "Pre-Tax (401k/IRA)",
        value: pretax,
        accountType: "401k",
        children: buildChildren("pretax", pretax, "401k"),
      });
    }

    if (roth > 0) {
      children.push({
        id: "roth",
        name: "Roth",
        value: roth,
        accountType: "roth",
        children: buildChildren("roth", roth, "roth"),
      });
    }

    if (taxable > 0) {
      children.push({
        id: "taxable",
        name: "Taxable Brokerage",
        value: taxable,
        accountType: "taxable",
        children: buildChildren("taxable", taxable, "taxable"),
      });
    }

    return {
      id: "root",
      name: "Portfolio",
      value: totalBalance,
      children,
    };
  }, [totalBalance, age, pretax, roth, taxable]);

  // === 5. Derive NetWorthDashboard data from PlanConfig ===
  const netWorthAssets = useMemo(() => {
    const assets: Array<{
      name: string;
      value: number;
      category: "retirement" | "real_estate" | "other";
      icon: React.ReactNode;
    }> = [];

    if (pretax > 0) {
      assets.push({
        name: "Pre-Tax (401k/IRA)",
        value: pretax,
        category: "retirement",
        icon: React.createElement(Landmark, { className: "w-3 h-3" }),
      });
    }
    if (roth > 0) {
      assets.push({
        name: "Roth Accounts",
        value: roth,
        category: "retirement",
        icon: React.createElement(PiggyBank, { className: "w-3 h-3" }),
      });
    }
    if (taxable > 0) {
      assets.push({
        name: "Taxable Brokerage",
        value: taxable,
        category: "other",
        icon: React.createElement(Wallet, { className: "w-3 h-3" }),
      });
    }
    const emergencyFund = planConfig.emergencyFund ?? D.emergencyFund;
    if (emergencyFund > 0) {
      assets.push({
        name: "Emergency Fund",
        value: emergencyFund,
        category: "other",
        icon: React.createElement(PiggyBank, { className: "w-3 h-3" }),
      });
    }

    return assets;
  }, [pretax, roth, taxable, planConfig, D]);

  const netWorthLiabilities = useMemo(() => {
    const liabilities: Array<{
      name: string;
      balance: number;
      monthlyPayment?: number;
    }> = [];

    const mortgage = planConfig.monthlyMortgageRent ?? 0;
    if (mortgage > 0) {
      // Estimate remaining mortgage balance from monthly payment (~25 year term, ~4% rate)
      liabilities.push({
        name: "Mortgage/Rent (est.)",
        balance: Math.round(mortgage * 200),
        monthlyPayment: mortgage,
      });
    }

    return liabilities;
  }, [planConfig]);

  const netWorthHistory = useMemo(() => {
    const retRate = (planConfig.retRate ?? D.retRate) / 100;
    const monthlyRate = retRate / 12;
    const monthlyContrib = annualContributions / 12;
    const totalAssetsNow = totalBalance + (planConfig.emergencyFund ?? D.emergencyFund);

    // Project 12 months of history (backwards from now)
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const liabilityBalance = netWorthLiabilities.reduce((s, l) => s + l.balance, 0);

    return Array.from({ length: 12 }, (_, i) => {
      // Months ago from current
      const monthsAgo = 11 - i;
      const factor = Math.pow(1 + monthlyRate, -monthsAgo);
      const contribAdjust = monthlyContrib * monthsAgo;
      const assets = Math.round(Math.max(0, totalAssetsNow * factor - contribAdjust + monthlyContrib * i));
      const monthIdx = (currentMonth - monthsAgo + 12) % 12;
      const yearOffset = currentMonth - monthsAgo < 0 ? -1 : 0;
      return {
        date: `${months[monthIdx]} ${currentYear + yearOffset}`,
        totalAssets: assets,
        totalLiabilities: Math.round(liabilityBalance * (1 + 0.001 * monthsAgo)),
        netWorth: assets - Math.round(liabilityBalance * (1 + 0.001 * monthsAgo)),
      };
    });
  }, [totalBalance, annualContributions, planConfig, D, netWorthLiabilities]);

  // When all balances, contributions, and income are zero, show an empty state
  // instead of rendering charts with meaningless or NaN-producing data.
  if (totalBalance === 0 && annualContributions === 0 && grossIncome === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        <p className="text-sm font-medium">No financial data to visualize</p>
        <p className="text-xs mt-2">
          Enter your account balances, contributions, or income in the configuration tab to see advanced visualizations.
        </p>
      </div>
    );
  }

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
              <HeatmapCalendar contributions={heatmapContributions} />
              <RadarChart scenarios={radarScenarios} />
              <Treemap data={treemapData} />
              <WaterfallChart data={waterfallData} />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="net-worth">
          <AccordionTrigger className="text-lg font-semibold">Net Worth & Wealth</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <NetWorthDashboard
                assets={netWorthAssets}
                liabilities={netWorthLiabilities}
                history={netWorthHistory}
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
              {calculationResult ? (
                <WealthTimeline
                  result={calculationResult}
                  currentAge={age}
                  retirementAge={retAge}
                  currentWealth={totalBalance}
                />
              ) : (
                <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                  <p className="text-sm">Run a calculation to see your wealth milestone timeline.</p>
                </div>
              )}
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
          <AccordionTrigger className="text-lg font-semibold">Milestones & Trends</AccordionTrigger>
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
