"use client";

import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Home,
  PiggyBank,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePlanConfig } from "@/lib/plan-config-context";
import { RETIREMENT_LIMITS_2026 } from "@/lib/constants/tax2026";
import { createDefaultPlanConfig } from "@/types/plan-config";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);
}

function pct(value: number): string {
  return `${Number.isFinite(value) ? value.toFixed(1) : "0.0"}%`;
}

function n(value: number | undefined | null, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <Card className="border-border/60">
      <CardContent className="p-5">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value, helper }: { label: string; value: string; helper?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-3 last:border-0">
      <div>
        <p className="font-medium text-foreground">{label}</p>
        {helper ? <p className="text-sm text-muted-foreground">{helper}</p> : null}
      </div>
      <p className="whitespace-nowrap text-right font-semibold text-foreground">{value}</p>
    </div>
  );
}

export default function PlanningToolsExpanded() {
  const { config } = usePlanConfig();
  const D = createDefaultPlanConfig();
  const isMarried = config.marital === "married";

  const age = n(config.age1, D.age1);
  const spouseAge = n(config.age2, D.age2);
  const retirementAge = n(config.retirementAge, D.retirementAge);
  const yearsToRetirement = Math.max(0, retirementAge - age);
  const spouseYearsToRetirement = isMarried ? Math.max(0, retirementAge - spouseAge) : null;

  const taxable = n(config.taxableBalance, D.taxableBalance);
  const pretax = n(config.pretaxBalance, D.pretaxBalance);
  const roth = n(config.rothBalance, D.rothBalance);
  const emergencyFund = n(config.emergencyFund, D.emergencyFund);
  const homeValue = n(config.homeValue, D.homeValue ?? 0);
  const mortgageBalance = n(config.mortgageBalance, D.mortgageBalance ?? 0);
  const portfolio = taxable + pretax + roth;
  const homeEquity = Math.max(0, homeValue - mortgageBalance);
  const netWorthSnapshot = portfolio + emergencyFund + homeEquity;

  const primaryIncome = n(config.primaryIncome, D.primaryIncome);
  const spouseIncome = isMarried ? n(config.spouseIncome, D.spouseIncome ?? 0) : 0;
  const householdIncome = primaryIncome + spouseIncome;
  const annualContributions =
    n(config.cTax1, D.cTax1) +
    n(config.cPre1, D.cPre1) +
    n(config.cPost1, D.cPost1) +
    n(config.cMatch1, D.cMatch1) +
    (isMarried
      ? n(config.cTax2, D.cTax2) +
        n(config.cPre2, D.cPre2) +
        n(config.cPost2, D.cPost2) +
        n(config.cMatch2, D.cMatch2)
      : 0);
  const savingsRate = householdIncome > 0 ? (annualContributions / householdIncome) * 100 : 0;

  const monthlyHousing =
    n(config.monthlyMortgageRent, 0) +
    n(config.monthlyUtilities, 0) +
    n(config.monthlyInsurancePropertyTax, 0);
  const monthlyHealthcare = n(config.monthlyHealthcareP1, 0) + (isMarried ? n(config.monthlyHealthcareP2, 0) : 0);
  const monthlyLifestyle =
    n(config.monthlyHouseholdExpenses, 0) +
    n(config.monthlyDiscretionary, 0) +
    n(config.monthlyChildcare, 0) +
    n(config.monthlyOtherExpenses, 0);
  const monthlyBudget = monthlyHousing + monthlyHealthcare + monthlyLifestyle;
  const emergencyMonths = monthlyBudget > 0 ? emergencyFund / monthlyBudget : 0;

  const age50CatchUp = Math.max(0, 50 - age);
  const age60CatchUp = Math.max(0, 60 - age);
  const currentPretax1 = n(config.cPre1, D.cPre1);
  const currentPretax2 = isMarried ? n(config.cPre2, D.cPre2) : 0;
  const remaining401kRoom =
    Math.max(0, RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT - currentPretax1) +
    (isMarried ? Math.max(0, RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT - currentPretax2) : 0);

  const kept = [
    "Retirement countdown from current age and target age",
    "Household contribution and savings-rate snapshot",
    "Budget and emergency-fund coverage from entered monthly expenses",
    "Net worth snapshot including home equity when entered",
    "2026 catch-up contribution timing from IRS limits",
  ];

  const retired = [
    "Debt tools that need actual loan balances, terms, and repayment rules",
    "Connected-account imports that require sensitive account access and vendor fees",
    "Product quote tools that need real market pricing before they should influence a plan",
    "Side simulators that duplicated the core retirement engine instead of using it",
    "Generic calculators with embedded assumptions instead of planner-linked inputs",
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Planning Tools</h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          This tab now shows connected planning checks only. Standalone calculators that needed outside rates,
          loan terms, account connections, or product quotes have been removed from the planner surface.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Clock}
          label="Time to retirement"
          value={`${yearsToRetirement} years`}
          detail={spouseYearsToRetirement === null ? `Retire at ${retirementAge}` : `Spouse: ${spouseYearsToRetirement} years`}
        />
        <MetricCard
          icon={Wallet}
          label="Net worth snapshot"
          value={money(netWorthSnapshot)}
          detail={`${money(portfolio)} portfolio + ${money(homeEquity)} home equity`}
        />
        <MetricCard
          icon={TrendingUp}
          label="Annual contributions"
          value={money(annualContributions)}
          detail={`${pct(savingsRate)} of household income`}
        />
        <MetricCard
          icon={PiggyBank}
          label="Emergency coverage"
          value={monthlyBudget > 0 ? `${emergencyMonths.toFixed(1)} months` : "Needs budget"}
          detail={monthlyBudget > 0 ? `${money(monthlyBudget)} monthly spend entered` : "Enter monthly expenses to measure coverage"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-primary" />
              Timeline & Contribution Check
            </CardTitle>
            <CardDescription>Only values already entered in the planner are used here.</CardDescription>
          </CardHeader>
          <CardContent>
            <Row label="Primary retirement age" value={`${retirementAge}`} helper={`Current age ${age}`} />
            {isMarried ? (
              <Row label="Spouse timeline" value={`${spouseYearsToRetirement} years`} helper={`Current age ${spouseAge}`} />
            ) : null}
            <Row label="Household earned income" value={money(householdIncome)} />
            <Row label="Current annual savings" value={money(annualContributions)} helper={`${pct(savingsRate)} savings rate`} />
            <Row
              label="Remaining regular 401(k) room"
              value={money(remaining401kRoom)}
              helper={`Uses the 2026 ${money(RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT)} employee deferral limit per eligible worker`}
            />
            <Row
              label="Next catch-up window"
              value={age >= 50 ? "Available now" : `${age50CatchUp} years`}
              helper={`Age 50 catch-up: ${money(RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS)}; age 60-63 super catch-up: ${age >= 60 ? "available now" : `${age60CatchUp} years away`}`}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5 text-primary" />
              Budget & Balance Sheet
            </CardTitle>
            <CardDescription>Snapshot math updates with plan inputs and does not require a Monte Carlo rerun.</CardDescription>
          </CardHeader>
          <CardContent>
            <Row label="Portfolio balance" value={money(portfolio)} helper={`${money(taxable)} taxable, ${money(pretax)} pre-tax, ${money(roth)} Roth`} />
            <Row label="Emergency fund" value={money(emergencyFund)} />
            <Row label="Home equity" value={money(homeEquity)} helper={homeValue > 0 ? `${money(homeValue)} home value less ${money(mortgageBalance)} mortgage` : "No home value entered"} />
            <Row label="Monthly housing" value={money(monthlyHousing)} helper="Mortgage/rent, utilities, insurance, and property tax" />
            <Row label="Monthly healthcare" value={money(monthlyHealthcare)} />
            <Row label="Monthly lifestyle" value={money(monthlyLifestyle)} helper="Household, discretionary, childcare, and other expenses" />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Preserved
            </CardTitle>
            <CardDescription>Useful planning checks kept because they can be tied to the canonical plan.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {kept.map((item) => (
              <div key={item} className="flex items-start gap-2 text-sm text-foreground">
                <Badge variant="secondary" className="mt-0.5">SSOT</Badge>
                <span>{item}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Removed From Planner
            </CardTitle>
            <CardDescription>These can come back later only with real user inputs or real external data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {retired.map((item) => (
              <div key={item} className="text-sm text-muted-foreground">
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
