"use client";

import React, { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import { createUserProfile, createOptimalProfile } from "@/components/visualizations/RadarChart";
import { RADAR_COLORS } from "@/lib/chartColors";
import type { WaterfallDataPoint } from "@/components/visualizations/WaterfallChart";
import type { TreemapNode } from "@/components/visualizations/Treemap";
import type { CalculationResult } from "@/types/calculator";
import { fmt } from "@/lib/utils";
import { Home, PiggyBank, Landmark, Wallet } from "lucide-react";
import {
  calculatePercentileRanking,
  calculateSavingsRateComparison,
} from "@/lib/benchmarks";

const Loading = () => <div className="h-64 animate-pulse bg-muted rounded" />;

const SankeyDiagram = dynamic(() => import("@/components/visualizations/SankeyDiagram"), { ssr: false, loading: Loading });
const RadarChart = dynamic(() => import("@/components/visualizations/RadarChart"), { ssr: false, loading: Loading });
const Treemap = dynamic(() => import("@/components/visualizations/Treemap"), { ssr: false, loading: Loading });
const WaterfallChart = dynamic(() => import("@/components/visualizations/WaterfallChart"), { ssr: false, loading: Loading });
const MilestoneTracker = dynamic(() => import("@/components/calculator/MilestoneTracker"), { ssr: false, loading: Loading });
const WealthTimeline = dynamic(() => import("@/components/calculator/WealthTimeline"), { ssr: false, loading: Loading });
const IncomeReplacementViz = dynamic(() => import("@/components/calculator/IncomeReplacementViz"), { ssr: false, loading: Loading });
const InflationHistory = dynamic(() => import("@/components/calculator/InflationHistory"), { ssr: false, loading: Loading });

interface ResultsVisualizationsSectionProps {
  calculationResult?: CalculationResult | null;
}

export default function ResultsVisualizationsSection({ calculationResult }: ResultsVisualizationsSectionProps) {
  const { config: planConfig, updateConfig } = usePlanConfig();
  const [showNetWorthEditor, setShowNetWorthEditor] = useState(false);
  const D = createDefaultPlanConfig();
  const age = planConfig.age1 ?? D.age1;
  const retAge = planConfig.retirementAge ?? D.retirementAge;
  const taxable = planConfig.taxableBalance ?? D.taxableBalance;
  const pretax = planConfig.pretaxBalance ?? D.pretaxBalance;
  const roth = planConfig.rothBalance ?? D.rothBalance;
  const homeValue = planConfig.homeValue ?? D.homeValue ?? 0;
  const mortgageBalance = planConfig.mortgageBalance ?? D.mortgageBalance ?? 0;
  const totalBalance = taxable + pretax + roth;
  const totalNetWorth = totalBalance + (planConfig.emergencyFund ?? D.emergencyFund) + homeValue - mortgageBalance;
  const annualContributions =
    (planConfig.cTax1 ?? D.cTax1) +
    (planConfig.cPre1 ?? D.cPre1) +
    (planConfig.cPost1 ?? D.cPost1) +
    (planConfig.cMatch1 ?? D.cMatch1) +
    (planConfig.cTax2 ?? D.cTax2) +
    (planConfig.cPre2 ?? D.cPre2) +
    (planConfig.cPost2 ?? D.cPost2) +
    (planConfig.cMatch2 ?? D.cMatch2);
  const grossIncome = (planConfig.primaryIncome ?? D.primaryIncome) +
    (planConfig.spouseIncome ?? D.spouseIncome ?? 0);

  const updateCurrencyField = (field: keyof typeof planConfig, rawValue: string) => {
    const nextValue = Number(rawValue.replace(/[^0-9.-]/g, ""));
    updateConfig({ [field]: Number.isFinite(nextValue) ? Math.max(0, nextValue) : 0 }, "user-entered");
  };

  const currencyInputValue = (value: number | undefined) => String(Math.round(value ?? 0));

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

  // === 1. Derive RadarChart scenario data from PlanConfig ===
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
        description: `Total household annual earnings: ${fmt(grossIncome)}`,
      },
      {
        label: "Federal Tax",
        value: -federalTax,
        category: "tax",
        description: `Estimated federal income tax (~22% effective rate): ${fmt(federalTax)}`,
      },
    ];

    if (stateTax > 0) {
      data.push({
        label: "State Tax",
        value: -stateTax,
        category: "tax",
        description: `State income tax (${(stateRate * 100).toFixed(1)}%): ${fmt(stateTax)}`,
      });
    }

    data.push({
      label: "FICA",
      value: -ficaTax,
      category: "tax",
      description: `Social Security and Medicare payroll taxes: ${fmt(ficaTax)}`,
    });

    if (housing > 0) {
      data.push({
        label: "Housing",
        value: -housing,
        category: "expense",
        description: `Mortgage/rent, utilities, insurance, property tax: ${fmt(housing)}`,
      });
    }

    if (healthcare > 0) {
      data.push({
        label: "Healthcare",
        value: -healthcare,
        category: "expense",
        description: `Health insurance and medical expenses: ${fmt(healthcare)}`,
      });
    }

    if (living > 0) {
      data.push({
        label: "Living Expenses",
        value: -living,
        category: "expense",
        description: `Groceries, household, discretionary spending: ${fmt(living)}`,
      });
    }

    if (annualContributions > 0) {
      data.push({
        label: "Retirement Savings",
        value: -annualContributions,
        category: "savings",
        description: `Total annual retirement contributions (401k, IRA, taxable): ${fmt(annualContributions)}`,
      });
    }

    data.push({
      label: "Remaining",
      value: Math.max(netSavings, 0),
      category: "total",
      description: `Cash remaining after taxes, expenses, and retirement savings: ${fmt(Math.max(netSavings, 0))}`,
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
    if (homeValue > 0) {
      assets.push({
        name: "Home",
        value: homeValue,
        category: "real_estate",
        icon: React.createElement(Home, { className: "w-3 h-3" }),
      });
    }

    return assets;
  }, [pretax, roth, taxable, homeValue, planConfig, D]);

  const netWorthLiabilities = useMemo(() => {
    const liabilities: Array<{
      name: string;
      balance: number;
      monthlyPayment?: number;
    }> = [];

    if (mortgageBalance > 0) {
      liabilities.push({
        name: "Mortgage",
        balance: mortgageBalance,
        monthlyPayment: planConfig.monthlyMortgageRent,
      });
    }

    return liabilities;
  }, [mortgageBalance, planConfig.monthlyMortgageRent]);

  const retirementBenchmark = useMemo(() => {
    const retirementAccounts = pretax + roth;
    return calculatePercentileRanking(age, retirementAccounts);
  }, [age, pretax, roth]);

  const savingsRateBenchmark = useMemo(
    () => calculateSavingsRateComparison(annualContributions, grossIncome),
    [annualContributions, grossIncome]
  );

  const ageMedianRetirementSavings = retirementBenchmark.userSavings - retirementBenchmark.vsMedian.difference;

  const editableFields: Array<{
    label: string;
    field: keyof typeof planConfig;
    value: number;
  }> = [
    { label: "Taxable Brokerage", field: "taxableBalance", value: taxable },
    { label: "Pre-Tax Accounts", field: "pretaxBalance", value: pretax },
    { label: "Roth Accounts", field: "rothBalance", value: roth },
    { label: "Emergency Fund", field: "emergencyFund", value: planConfig.emergencyFund ?? D.emergencyFund },
    { label: "Home Value", field: "homeValue", value: homeValue },
    { label: "Mortgage Balance", field: "mortgageBalance", value: mortgageBalance },
  ];

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
              <div className="rounded-lg border bg-card p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="text-base font-semibold">Net Worth Snapshot</h3>
                    <p className="text-sm text-muted-foreground">
                      Uses only values entered in this planner. Click edit to update the snapshot here; net worth updates immediately without rerunning the retirement calculation.
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-muted-foreground">Current net worth</p>
                    <p className="text-2xl font-bold">{fmt(totalNetWorth)}</p>
                    <button
                      type="button"
                      onClick={() => setShowNetWorthEditor((value) => !value)}
                      className="mt-2 text-xs font-medium text-primary hover:underline"
                    >
                      {showNetWorthEditor ? "Done editing" : "Edit snapshot"}
                    </button>
                  </div>
                </div>

                {showNetWorthEditor && (
                  <div className="mt-5 rounded-lg border bg-muted/30 p-4">
                    <div className="grid gap-3 md:grid-cols-3">
                      {editableFields.map((item) => (
                        <label key={String(item.field)} className="space-y-1 text-sm">
                          <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={currencyInputValue(item.value)}
                            onChange={(event) => updateCurrencyField(item.field, event.target.value)}
                            className="w-full rounded-md border bg-background px-3 py-2 font-mono text-sm"
                          />
                        </label>
                      ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                      These fields feed the planner state directly. Recalculate only if you want retirement projections, taxes, or Monte Carlo results to refresh from the new balances.
                    </p>
                  </div>
                )}

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assets</p>
                    <div className="space-y-2">
                      {netWorthAssets.map((asset) => (
                        <div key={asset.name} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                          <span className="flex items-center gap-2">{asset.icon}{asset.name}</span>
                          <span className="font-mono font-medium">{fmt(asset.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Liabilities</p>
                    {netWorthLiabilities.length > 0 ? (
                      <div className="space-y-2">
                        {netWorthLiabilities.map((liability) => (
                          <div key={liability.name} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
                            <span>{liability.name}</span>
                            <span className="font-mono font-medium">-{fmt(liability.balance)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">No debt entered.</p>
                    )}
                  </div>
                </div>

                <div className="mt-5 rounded-lg border bg-muted/20 p-4">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold">Population Context</p>
                      <p className="text-xs text-muted-foreground">
                        Federal Reserve SCF retirement-account benchmark, not a total-net-worth ranking.
                      </p>
                    </div>
                    <div className="text-sm font-medium">
                      {Math.round(retirementBenchmark.percentile)}th percentile
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">Retirement accounts</p>
                      <p className="font-mono font-semibold">{fmt(pretax + roth)}</p>
                    </div>
                    <div className="rounded-md bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">Age {age} median</p>
                      <p className="font-mono font-semibold">{fmt(ageMedianRetirementSavings)}</p>
                    </div>
                    <div className="rounded-md bg-background px-3 py-2">
                      <p className="text-xs text-muted-foreground">Savings rate</p>
                      <p className="font-mono font-semibold">
                        {savingsRateBenchmark ? `${savingsRateBenchmark.userRate}% vs ${savingsRateBenchmark.nationalAverage}% avg` : "Add income"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
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
              <div className="rounded-lg border bg-card p-5">
                <h3 className="text-base font-semibold">Connected Income Analysis</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Dividend tracking and detailed income ladders need actual holdings or account data, so they are disabled for now. No Square/Plaid-style connection is required for the retirement income replacement view below.
                </p>
              </div>
              {calculationResult ? (
                <IncomeReplacementViz
                  portfolioAtRetirement={calculationResult.finReal}
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
              ) : (
                <div className="rounded-lg border bg-card p-6 text-center text-muted-foreground">
                  <p className="text-sm">Run a calculation to see income replacement analysis.</p>
                </div>
              )}
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
