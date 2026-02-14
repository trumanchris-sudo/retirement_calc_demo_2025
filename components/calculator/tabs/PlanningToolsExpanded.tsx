"use client";

import dynamic from "next/dynamic";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

const Loading = () => (
  <div className="h-64 animate-pulse bg-muted rounded" />
);

// ---------------------------------------------------------------------------
// FIRE & Early Retirement
// ---------------------------------------------------------------------------
const FIRECalculator = dynamic(
  () => import("@/components/calculator/FIRECalculator"),
  { ssr: false, loading: Loading },
);
const SavingsRateImpact = dynamic(
  () => import("@/components/calculator/SavingsRateImpact"),
  { ssr: false, loading: Loading },
);
const FIDay = dynamic(() => import("@/components/calculator/FIDay"), {
  ssr: false,
  loading: Loading,
});
const SideHustleTax = dynamic(
  () => import("@/components/calculator/SideHustleTax"),
  { ssr: false, loading: Loading },
);
const RetirementCountdown = dynamic(
  () => import("@/components/countdown/RetirementCountdown"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Debt & Real Estate
// ---------------------------------------------------------------------------
const DebtVsInvest = dynamic(
  () => import("@/components/calculator/DebtVsInvest"),
  { ssr: false, loading: Loading },
);
const MortgageRefi = dynamic(
  () => import("@/components/calculator/MortgageRefi"),
  { ssr: false, loading: Loading },
);
const FirstTimeHomeBuyer = dynamic(
  () => import("@/components/calculator/FirstTimeHomeBuyer"),
  { ssr: false, loading: Loading },
);
const HomeEquityRetirement = dynamic(
  () => import("@/components/calculator/HomeEquityRetirement"),
  { ssr: false, loading: Loading },
);
const RentalPropertyAnalyzer = dynamic(
  () => import("@/components/calculator/RentalPropertyAnalyzer"),
  { ssr: false, loading: Loading },
);
const AutoExpenseAnalyzer = dynamic(
  () => import("@/components/calculator/AutoExpenseAnalyzer"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Investment Comparison
// ---------------------------------------------------------------------------
const LumpSumVsDCA = dynamic(
  () => import("@/components/calculator/LumpSumVsDCA"),
  { ssr: false, loading: Loading },
);
const IBondStrategy = dynamic(
  () => import("@/components/calculator/IBondStrategy"),
  { ssr: false, loading: Loading },
);
const CashComparison = dynamic(
  () => import("@/components/calculator/CashComparison"),
  { ssr: false, loading: Loading },
);
const BrokerageComparison = dynamic(
  () => import("@/components/calculator/BrokerageComparison"),
  { ssr: false, loading: Loading },
);
const IndexVsActive = dynamic(
  () => import("@/components/calculator/IndexVsActive"),
  { ssr: false, loading: Loading },
);
const TargetDateAnalyzer = dynamic(
  () => import("@/components/calculator/TargetDateAnalyzer"),
  { ssr: false, loading: Loading },
);
const RebalancingGuide = dynamic(
  () => import("@/components/calculator/RebalancingGuide"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Employment & Income
// ---------------------------------------------------------------------------
const EmployerBenefits = dynamic(
  () => import("@/components/calculator/EmployerBenefits"),
  { ssr: false, loading: Loading },
);
const CatchUpContributions = dynamic(
  () => import("@/components/calculator/CatchUpContributions"),
  { ssr: false, loading: Loading },
);
const ContributionOrder = dynamic(
  () => import("@/components/calculator/ContributionOrder"),
  { ssr: false, loading: Loading },
);
const PensionCalculator = dynamic(
  () => import("@/components/calculator/PensionCalculator"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Spending & Budget
// ---------------------------------------------------------------------------
const SpendingAnalysis = dynamic(
  () => import("@/components/calculator/SpendingAnalysis"),
  { ssr: false, loading: Loading },
);
const SpendingBreakdown = dynamic(
  () => import("@/components/budget/SpendingBreakdown"),
  { ssr: false, loading: Loading },
);
const EmergencyFundCalculator = dynamic(
  () => import("@/components/calculator/EmergencyFundCalculator"),
  { ssr: false, loading: Loading },
);
const InflationCalculator = dynamic(
  () => import("@/components/calculator/InflationCalculator"),
  { ssr: false, loading: Loading },
);
const InflationImpact = dynamic(
  () => import("@/components/calculator/InflationImpact"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Insurance & Fees
// ---------------------------------------------------------------------------
const AdvisorFees = dynamic(
  () => import("@/components/calculator/AdvisorFees"),
  { ssr: false, loading: Loading },
);
const FeeAnalyzer = dynamic(
  () => import("@/components/calculator/FeeAnalyzer"),
  { ssr: false, loading: Loading },
);
const DisabilityInsurance = dynamic(
  () => import("@/components/calculator/DisabilityInsurance"),
  { ssr: false, loading: Loading },
);
const LifeInsuranceCalculator = dynamic(
  () => import("@/components/calculator/LifeInsuranceCalculator"),
  { ssr: false, loading: Loading },
);
const Plan401kRating = dynamic(
  () => import("@/components/calculator/Plan401kRating"),
  { ssr: false, loading: Loading },
);
const BenchmarkPanel = dynamic(
  () => import("@/components/calculator/BenchmarkPanel"),
  { ssr: false, loading: Loading },
);

// ---------------------------------------------------------------------------
// Calendar & Planning
// ---------------------------------------------------------------------------
const CalendarIntegration = dynamic(
  () => import("@/components/calendar/CalendarIntegration"),
  { ssr: false, loading: Loading },
);
const TaxCalendar = dynamic(
  () => import("@/components/calendar/TaxCalendar"),
  { ssr: false, loading: Loading },
);
const AnnualCheckup = dynamic(
  () => import("@/components/calculator/AnnualCheckup"),
  { ssr: false, loading: Loading },
);

// ===========================================================================
// Component
// ===========================================================================

export default function PlanningToolsExpanded() {
  const { config: planConfig } = usePlanConfig();
  const D = createDefaultPlanConfig();
  const age = planConfig.age1 ?? D.age1;
  const retAge = planConfig.retirementAge ?? D.retirementAge;
  const totalSavings =
    (planConfig.pretaxBalance ?? D.pretaxBalance) +
    (planConfig.rothBalance ?? D.rothBalance) +
    (planConfig.taxableBalance ?? D.taxableBalance);
  const annualContributions =
    (planConfig.cPre1 ?? D.cPre1) +
    (planConfig.cPost1 ?? D.cPost1) +
    (planConfig.cTax1 ?? D.cTax1) +
    (planConfig.cMatch1 ?? D.cMatch1);
  const retirementSpending =
    (planConfig.primaryIncome ?? D.primaryIncome) *
    (planConfig.wdRate ?? D.wdRate) / 100;

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {/* ---------------------------------------------------------------- */}
        {/* FIRE & Early Retirement                                          */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="fire">
          <AccordionTrigger>FIRE &amp; Early Retirement</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <FIRECalculator />
              <SavingsRateImpact />
              <FIDay />
              <SideHustleTax />
              <RetirementCountdown currentAge={age} retirementAge={retAge} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Debt & Real Estate                                               */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="debt-real-estate">
          <AccordionTrigger>Debt &amp; Real Estate</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <DebtVsInvest />
              <MortgageRefi />
              <FirstTimeHomeBuyer />
              <HomeEquityRetirement />
              <RentalPropertyAnalyzer />
              <AutoExpenseAnalyzer />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Investment Comparison                                            */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="investment-comparison">
          <AccordionTrigger>Investment Comparison</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <LumpSumVsDCA />
              <IBondStrategy />
              <CashComparison />
              <BrokerageComparison />
              <IndexVsActive />
              <TargetDateAnalyzer />
              <RebalancingGuide />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Employment & Income                                              */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="employment-income">
          <AccordionTrigger>Employment &amp; Income</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <EmployerBenefits />
              <CatchUpContributions age={age} />
              <ContributionOrder />
              <PensionCalculator />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Spending & Budget                                                */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="spending-budget">
          <AccordionTrigger>Spending &amp; Budget</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <SpendingAnalysis />
              <SpendingBreakdown retirementSpending={retirementSpending} />
              <EmergencyFundCalculator />
              <InflationCalculator />
              <InflationImpact />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Insurance & Fees                                                 */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="insurance-fees">
          <AccordionTrigger>Insurance &amp; Fees</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <AdvisorFees />
              <FeeAnalyzer />
              <DisabilityInsurance />
              <LifeInsuranceCalculator />
              <Plan401kRating />
              <BenchmarkPanel age={age} totalSavings={totalSavings} annualContributions={annualContributions} retirementAge={retAge} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* ---------------------------------------------------------------- */}
        {/* Calendar & Planning                                              */}
        {/* ---------------------------------------------------------------- */}
        <AccordionItem value="calendar-planning">
          <AccordionTrigger>Calendar &amp; Planning</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6">
              <CalendarIntegration />
              <TaxCalendar />
              <AnnualCheckup />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
