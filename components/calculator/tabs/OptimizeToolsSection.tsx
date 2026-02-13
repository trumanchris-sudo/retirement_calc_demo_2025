"use client";

import dynamic from "next/dynamic";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { FilingStatus } from "@/lib/calculations/taxCalculations";

const Loading = () => (
  <div className="h-64 animate-pulse bg-muted rounded" />
);

// --- Tax Optimization Tools ---
const StockCompensation = dynamic(
  () => import("@/components/calculator/StockCompensation"),
  { ssr: false, loading: Loading }
);
const RothConversionLadder = dynamic(
  () => import("@/components/calculator/RothConversionLadder"),
  { ssr: false, loading: Loading }
);
const RothConversionOptimizer = dynamic(
  () => import("@/components/calculator/RothConversionOptimizer").then(mod => ({ default: mod.RothConversionOptimizer })),
  { ssr: false, loading: Loading }
);
const TaxLossHarvesting = dynamic(
  () => import("@/components/calculator/TaxLossHarvesting"),
  { ssr: false, loading: Loading }
);
const ACAOptimizer = dynamic(
  () => import("@/components/calculator/ACAOptimizer"),
  { ssr: false, loading: Loading }
);
const StateTaxComparison = dynamic(
  () => import("@/components/calculator/StateTaxComparison"),
  { ssr: false, loading: Loading }
);
const BackdoorRothGuide = dynamic(
  () => import("@/components/calculator/BackdoorRothGuide"),
  { ssr: false, loading: Loading }
);
const BracketFiller = dynamic(
  () => import("@/components/calculator/BracketFiller"),
  { ssr: false, loading: Loading }
);
const BracketVisualizer = dynamic(
  () => import("@/components/tax/BracketVisualizer"),
  { ssr: false, loading: Loading }
);
const CostBasisOptimizer = dynamic(
  () => import("@/components/tax/CostBasisOptimizer"),
  { ssr: false, loading: Loading }
);
const W4Optimizer = dynamic(
  () => import("@/components/calculator/W4Optimizer"),
  { ssr: false, loading: Loading }
);
const YearEndTax = dynamic(
  () => import("@/components/calculator/YearEndTax"),
  { ssr: false, loading: Loading }
);

// --- Healthcare Planning ---
const HealthcarePlanner = dynamic(
  () => import("@/components/calculator/HealthcarePlanner"),
  { ssr: false, loading: Loading }
);
const HSAStrategy = dynamic(
  () => import("@/components/calculator/HSAStrategy"),
  { ssr: false, loading: Loading }
);
const MedicareGuide = dynamic(
  () => import("@/components/calculator/MedicareGuide"),
  { ssr: false, loading: Loading }
);

// --- Social Security ---
const SocialSecurityOptimizer = dynamic(
  () => import("@/components/calculator/SocialSecurityOptimizer").then(mod => ({ default: mod.SocialSecurityOptimizer })),
  { ssr: false, loading: Loading }
);
const SpousalScenarios = dynamic(
  () => import("@/components/calculator/SpousalScenarios"),
  { ssr: false, loading: Loading }
);

// --- Investment Strategy ---
const AssetLocationOptimizer = dynamic(
  () => import("@/components/calculator/AssetLocationOptimizer"),
  { ssr: false, loading: Loading }
);
const WithdrawalSimulator = dynamic(
  () => import("@/components/calculator/WithdrawalSimulator"),
  { ssr: false, loading: Loading }
);
const RMDPlanner = dynamic(
  () => import("@/components/calculator/RMDPlanner"),
  { ssr: false, loading: Loading }
);

interface OptimizeToolsSectionProps {
  age: number;
  spouseAge?: number;
  maritalStatus: FilingStatus;
  retirementAge: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  primaryIncome: number;
  ssIncome: number;
  filingStatus: FilingStatus;
  isMarried: boolean;
  portfolioValue: number;
}

export default function OptimizeToolsSection({
  age,
  spouseAge,
  maritalStatus,
  retirementAge,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  primaryIncome,
  ssIncome,
  filingStatus,
  isMarried,
  portfolioValue,
}: OptimizeToolsSectionProps) {
  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        {/* Tax Optimization Tools */}
        <AccordionItem value="tax-optimization">
          <AccordionTrigger className="text-lg font-semibold">
            Tax Optimization Tools
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <StockCompensation filingStatus={filingStatus} currentIncome={primaryIncome} />
              <RothConversionLadder />
              <RothConversionOptimizer rothResult={null} />
              <TaxLossHarvesting />
              <ACAOptimizer />
              <StateTaxComparison />
              <BackdoorRothGuide />
              <BracketFiller
                currentAge={age}
                retirementAge={retirementAge}
                maritalStatus={maritalStatus}
                currentIncome={primaryIncome}
                pretaxBalance={pretaxBalance}
                rothBalance={rothBalance}
                taxableBalance={taxableBalance}
              />
              <BracketVisualizer />
              <CostBasisOptimizer />
              <W4Optimizer />
              <YearEndTax />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Healthcare Planning */}
        <AccordionItem value="healthcare">
          <AccordionTrigger className="text-lg font-semibold">
            Healthcare Planning
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <HealthcarePlanner
                age={age}
                spouseAge={spouseAge}
                maritalStatus={maritalStatus}
                retirementAge={retirementAge}
                estimatedRetirementIncome={primaryIncome}
              />
              <HSAStrategy />
              <MedicareGuide currentAge={age} />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Social Security */}
        <AccordionItem value="social-security">
          <AccordionTrigger className="text-lg font-semibold">
            Social Security
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <SocialSecurityOptimizer
                currentAge={age}
                ssIncome={ssIncome}
                filingStatus={filingStatus}
                isMarried={isMarried}
                spouseAge={spouseAge}
              />
              <SpousalScenarios
                age1={age}
                age2={spouseAge ?? age}
                marital={maritalStatus}
                retirementAge={retirementAge}
                primaryIncome={primaryIncome}
                spouseIncome={0}
                taxableBalance={taxableBalance}
                pretaxBalance={pretaxBalance}
                rothBalance={rothBalance}
                ssIncome={ssIncome}
                ssClaimAge={67}
                ssIncome2={0}
                ssClaimAge2={67}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Investment Strategy */}
        <AccordionItem value="investment-strategy">
          <AccordionTrigger className="text-lg font-semibold">
            Investment Strategy
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <AssetLocationOptimizer
                taxableBalance={taxableBalance}
                traditionalBalance={pretaxBalance}
                rothBalance={rothBalance}
                income={primaryIncome}
                filingStatus={filingStatus}
                age={age}
              />
              <WithdrawalSimulator
                initialPortfolio={portfolioValue}
                retirementAge={retirementAge}
                currentAge={age}
              />
              <RMDPlanner
                currentAge={age}
                pretaxBalance={pretaxBalance}
                retirementAge={retirementAge}
              />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
