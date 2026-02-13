"use client";

import dynamic from "next/dynamic";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { usePlanConfig } from "@/lib/plan-config-context";
import { createDefaultPlanConfig } from "@/types/plan-config";

const Loading = () => <div className="h-64 animate-pulse bg-muted rounded" />;

const EstatePlanningBasics = dynamic(() => import("@/components/calculator/EstatePlanningBasics"), { ssr: false, loading: Loading });
const BeneficiaryReview = dynamic(() => import("@/components/calculator/BeneficiaryReview").then(mod => ({ default: mod.BeneficiaryReview })), { ssr: false, loading: Loading });
const InheritanceGuide = dynamic(() => import("@/components/calculator/InheritanceGuide"), { ssr: false, loading: Loading });
const CharitableGiving = dynamic(() => import("@/components/calculator/CharitableGiving"), { ssr: false, loading: Loading });
const PartnerMode = dynamic(() => import("@/components/couples/PartnerMode"), { ssr: false, loading: Loading });
const CouplesFinances = dynamic(() => import("@/components/calculator/CouplesFinances"), { ssr: false, loading: Loading });
const FamilyMeeting = dynamic(() => import("@/components/calculator/FamilyMeeting"), { ssr: false, loading: Loading });
const SpouseWorkDecision = dynamic(() => import("@/components/calculator/SpouseWorkDecision"), { ssr: false, loading: Loading });
const CollegePlanner = dynamic(() => import("@/components/calculator/CollegePlanner"), { ssr: false, loading: Loading });

export default function LegacyToolsSection() {
  const { config: planConfig } = usePlanConfig();
  const D = createDefaultPlanConfig();

  return (
    <div className="space-y-6">
      <Accordion type="multiple" className="space-y-4">
        <AccordionItem value="estate-planning">
          <AccordionTrigger className="text-lg font-semibold">Estate Planning</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <EstatePlanningBasics />
              <BeneficiaryReview />
              <InheritanceGuide />
              <CharitableGiving
                age={planConfig.age1 ?? D.age1 ?? 35}
                filingStatus={planConfig.marital ?? "single"}
                iraBalance={planConfig.pretaxBalance ?? 0}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="family-couples">
          <AccordionTrigger className="text-lg font-semibold">Family &amp; Couples</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-6 pt-4">
              <PartnerMode />
              <CouplesFinances />
              <FamilyMeeting />
              <SpouseWorkDecision />
              <CollegePlanner />
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
