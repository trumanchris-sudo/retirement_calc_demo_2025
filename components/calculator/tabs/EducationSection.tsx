"use client";

import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const Loading = () => <div className="h-64 animate-pulse bg-muted rounded" />;

const TaxStrategyExplainer = dynamic(() => import("@/components/education/TaxStrategyExplainer").then(mod => ({ default: mod.TaxStrategyExplainer })), { ssr: false, loading: Loading });
const TaxBracketsSimplified = dynamic(() => import("@/components/education/TaxBracketsSimplified").then(mod => ({ default: mod.TaxBracketsSimplified })), { ssr: false, loading: Loading });
const TenYearRuleExplainer = dynamic(() => import("@/components/education/TenYearRuleExplainer").then(mod => ({ default: mod.TenYearRuleExplainer })), { ssr: false, loading: Loading });
const CompoundGrowthVisualizer = dynamic(() => import("@/components/education/CompoundGrowthVisualizer").then(mod => ({ default: mod.CompoundGrowthVisualizer })), { ssr: false, loading: Loading });
const WhyRothIsBetter = dynamic(() => import("@/components/education/WhyRothIsBetter").then(mod => ({ default: mod.WhyRothIsBetter })), { ssr: false, loading: Loading });
const RichPeoplePlaybook = dynamic(() => import("@/components/education/RichPeoplePlaybook").then(mod => ({ default: mod.RichPeoplePlaybook })), { ssr: false, loading: Loading });
const EducationProgress = dynamic(() => import("@/components/education/EducationProgress").then(mod => ({ default: mod.EducationProgress })), { ssr: false, loading: Loading });
const EducationInfoIcon = dynamic(() => import("@/components/education/EducationInfoIcon").then(mod => ({ default: mod.EducationInfoIcon })), { ssr: false, loading: Loading });

export default function EducationSection() {
  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="tax-education">
          <AccordionTrigger className="text-lg font-semibold">Tax Education</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <TaxStrategyExplainer />
              <TaxBracketsSimplified />
              <TenYearRuleExplainer />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="investment-education">
          <AccordionTrigger className="text-lg font-semibold">Investment Education</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <CompoundGrowthVisualizer />
              <WhyRothIsBetter />
              <RichPeoplePlaybook />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="learning-progress">
          <AccordionTrigger className="text-lg font-semibold">Learning Progress</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <EducationProgress />
              <EducationInfoIcon topic="compound-growth" />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
