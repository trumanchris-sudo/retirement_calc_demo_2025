"use client";

import React, { useState, useMemo, useCallback } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Users, Heart, GraduationCap, Home, Shield, Sparkles, UserPlus, X } from "lucide-react";
import type { GenerationDataPoint } from "@/types/calculator";
import type { FamilyConfig } from "@/types/plan-config";
import { usePlanConfig } from "@/lib/plan-config-context";

interface DynastyTimelineProps {
  generationData: GenerationDataPoint[];
}

type Scenario = "direct" | "trust";

// Avatar age stages
type AgeStage = "child" | "young" | "adult" | "senior";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

const fmtCompact = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);

// SVG Avatar Components that age through timeline
function PersonAvatar({
  stage,
  className = "",
  size = 48,
  gender = "neutral"
}: {
  stage: AgeStage;
  className?: string;
  size?: number;
  gender?: "male" | "female" | "neutral";
}) {
  const getColors = () => {
    switch (stage) {
      case "child":
        return { skin: "#FFD5B8", hair: "#8B4513", clothes: "#60A5FA" };
      case "young":
        return { skin: "#F5D0C5", hair: "#654321", clothes: "#34D399" };
      case "adult":
        return { skin: "#E8C4A0", hair: "#3D2314", clothes: "#8B5CF6" };
      case "senior":
        return { skin: "#DDB896", hair: "#C0C0C0", clothes: "#F59E0B" };
    }
  };

  const colors = getColors();

  // Different head shapes for age stages
  const getHeadRadius = () => {
    switch (stage) {
      case "child": return size * 0.38;
      case "young": return size * 0.32;
      case "adult": return size * 0.30;
      case "senior": return size * 0.28;
    }
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-label={`${stage} person`}
    >
      {/* Body/Clothes */}
      <ellipse
        cx={size / 2}
        cy={size * 0.85}
        rx={size * 0.35}
        ry={size * 0.18}
        fill={colors.clothes}
      />

      {/* Head */}
      <circle
        cx={size / 2}
        cy={size * 0.38}
        r={getHeadRadius()}
        fill={colors.skin}
      />

      {/* Hair */}
      <ellipse
        cx={size / 2}
        cy={size * 0.28}
        rx={getHeadRadius() * 1.1}
        ry={getHeadRadius() * 0.6}
        fill={colors.hair}
      />

      {/* Eyes */}
      <circle cx={size * 0.4} cy={size * 0.38} r={size * 0.03} fill="#333" />
      <circle cx={size * 0.6} cy={size * 0.38} r={size * 0.03} fill="#333" />

      {/* Smile */}
      <path
        d={`M ${size * 0.42} ${size * 0.48} Q ${size * 0.5} ${size * 0.54} ${size * 0.58} ${size * 0.48}`}
        fill="none"
        stroke="#333"
        strokeWidth={size * 0.02}
        strokeLinecap="round"
      />

      {/* Wrinkles for senior */}
      {stage === "senior" && (
        <>
          <path
            d={`M ${size * 0.32} ${size * 0.34} L ${size * 0.36} ${size * 0.36}`}
            stroke="#BBA080"
            strokeWidth={size * 0.015}
          />
          <path
            d={`M ${size * 0.64} ${size * 0.34} L ${size * 0.68} ${size * 0.36}`}
            stroke="#BBA080"
            strokeWidth={size * 0.015}
          />
        </>
      )}

      {/* Glasses for adult/senior */}
      {(stage === "adult" || stage === "senior") && (
        <>
          <circle
            cx={size * 0.4}
            cy={size * 0.38}
            r={size * 0.08}
            fill="none"
            stroke="#666"
            strokeWidth={size * 0.015}
          />
          <circle
            cx={size * 0.6}
            cy={size * 0.38}
            r={size * 0.08}
            fill="none"
            stroke="#666"
            strokeWidth={size * 0.015}
          />
          <path
            d={`M ${size * 0.48} ${size * 0.38} L ${size * 0.52} ${size * 0.38}`}
            stroke="#666"
            strokeWidth={size * 0.015}
          />
        </>
      )}
    </svg>
  );
}

// Family avatar group showing multiple people
function FamilyAvatarGroup({
  count,
  stage,
  maxShow = 4
}: {
  count: number;
  stage: AgeStage;
  maxShow?: number;
}) {
  const showCount = Math.min(count, maxShow);
  const overflow = count - maxShow;

  return (
    <div className="flex items-center -space-x-2">
      {Array.from({ length: showCount }).map((_, i) => (
        <div
          key={i}
          className="relative rounded-full bg-white dark:bg-slate-800 p-0.5 shadow-sm"
        >
          <PersonAvatar stage={stage} size={36} />
        </div>
      ))}
      {overflow > 0 && (
        <div className="relative rounded-full bg-slate-200 dark:bg-slate-700 w-9 h-9 flex items-center justify-center text-xs font-medium text-slate-700 dark:text-slate-300 shadow-sm">
          +{overflow}
        </div>
      )}
    </div>
  );
}

// Emotional milestone markers
interface Milestone {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  bgColor: string;
  borderColor: string;
}

function getMilestones(
  generationData: GenerationDataPoint[],
  familyConfig: FamilyConfig,
  scenario: Scenario
): Milestone[] {
  const milestones: Milestone[] = [];
  const gen1 = generationData[0];
  const finalGen = generationData[generationData.length - 1];

  if (!gen1) return milestones;

  const userName = familyConfig.userName || "You";
  const childrenName = familyConfig.childrenNames.length > 0
    ? familyConfig.childrenNames.join(" & ")
    : "Your Children";

  // Financial Independence milestone
  if (gen1.estateValue > 1000000) {
    milestones.push({
      icon: <Shield className="w-5 h-5" />,
      title: familyConfig.customMilestones?.financialIndependence || "Financial Independence Achieved",
      description: `${userName} built a ${fmtCompact(gen1.estateValue)} estate - enough to never worry about money again`,
      color: "text-emerald-700 dark:text-emerald-300",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200 dark:border-emerald-800",
    });
  }

  // College Fund milestone (if enough for education)
  const collegeCostEstimate = 250000; // Average 4-year college cost
  if (gen1.netToHeirs > collegeCostEstimate * 2) {
    milestones.push({
      icon: <GraduationCap className="w-5 h-5" />,
      title: familyConfig.customMilestones?.collegeFund || "College Funds Secured",
      description: `${childrenName} will never have student loans - education is fully funded`,
      color: "text-blue-700 dark:text-blue-300",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200 dark:border-blue-800",
    });
  }

  // House paid off / down payment secured
  if (gen1.netToHeirs > 500000) {
    milestones.push({
      icon: <Home className="w-5 h-5" />,
      title: familyConfig.customMilestones?.housePaidOff || "Housing Security Guaranteed",
      description: `${childrenName} can buy homes without mortgage stress`,
      color: "text-amber-700 dark:text-amber-300",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200 dark:border-amber-800",
    });
  }

  // Generational wealth milestone (multi-generation)
  if (generationData.length >= 2 && finalGen.estateValue > 500000) {
    const grandchildrenName = familyConfig.grandchildrenNames.length > 0
      ? familyConfig.grandchildrenNames.join(" & ")
      : "Your Grandchildren";

    milestones.push({
      icon: <Sparkles className="w-5 h-5" />,
      title: familyConfig.customMilestones?.generationalWealth || "Generational Wealth Established",
      description: scenario === "trust"
        ? `Through the dynasty trust, ${grandchildrenName} inherit ${fmtCompact(finalGen.estateValue)} tax-free`
        : `${grandchildrenName} receive ${fmtCompact(finalGen.netToHeirs)} after estate taxes`,
      color: "text-purple-700 dark:text-purple-300",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-200 dark:border-purple-800",
    });
  }

  return milestones;
}

// Generation Story Card
function GenerationStoryCard({
  generationNumber,
  year,
  estateValue,
  netToHeirs,
  beneficiaries,
  familyConfig,
  scenario,
  isLast,
}: {
  generationNumber: number;
  year: number;
  estateValue: number;
  netToHeirs: number;
  beneficiaries: number;
  familyConfig: FamilyConfig;
  scenario: Scenario;
  isLast: boolean;
}) {
  // Determine family members for this generation
  const getGenerationName = () => {
    if (generationNumber === 1) {
      return familyConfig.userName || "You";
    } else if (generationNumber === 2) {
      return familyConfig.childrenNames.length > 0
        ? familyConfig.childrenNames[0]
        : "Your Children";
    } else {
      return familyConfig.grandchildrenNames.length > 0
        ? familyConfig.grandchildrenNames[0]
        : "Your Grandchildren";
    }
  };

  const getAgeStage = (): AgeStage => {
    if (generationNumber === 1) return "senior";
    if (generationNumber === 2) return "adult";
    if (generationNumber === 3) return "young";
    return "child";
  };

  const getStoryMessage = () => {
    const name = getGenerationName();
    const perPerson = beneficiaries > 0 ? netToHeirs / beneficiaries : netToHeirs;

    if (generationNumber === 1) {
      return `${name} passes on ${fmtCompact(netToHeirs)} to the next generation, ensuring financial security for years to come.`;
    } else if (generationNumber === 2) {
      if (scenario === "trust") {
        return `${name} and ${beneficiaries - 1} others receive distributions from the trust totaling ${fmtCompact(netToHeirs)}. The trust continues growing tax-free.`;
      }
      return `${name} inherits ${fmtCompact(perPerson)} - enough to retire early, travel the world, or start that dream business.`;
    } else {
      if (scenario === "trust") {
        return `The trust now supports ${beneficiaries} family members with ${fmtCompact(estateValue)} in assets, growing tax-free for future generations.`;
      }
      return `${beneficiaries} grandchildren each receive ${fmtCompact(perPerson)} - a head start that changes everything.`;
    }
  };

  return (
    <div className={`relative flex items-start gap-4 ${!isLast ? 'pb-8' : ''}`}>
      {/* Timeline connector */}
      {!isLast && (
        <div className="absolute left-[23px] top-12 w-0.5 h-full bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700" />
      )}

      {/* Avatar */}
      <div className="relative z-10 flex-shrink-0 rounded-full bg-white dark:bg-slate-800 p-1 shadow-md ring-2 ring-white dark:ring-slate-800">
        <PersonAvatar stage={getAgeStage()} size={40} />
      </div>

      {/* Story content */}
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-semibold text-slate-900 dark:text-slate-100">
            Generation {generationNumber}: {getGenerationName()}
          </h4>
          <span className="text-xs text-muted-foreground">Year {year}</span>
        </div>

        <p className="text-sm text-slate-700 dark:text-slate-300 mb-3">
          {getStoryMessage()}
        </p>

        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <FamilyAvatarGroup count={beneficiaries} stage={getAgeStage()} maxShow={3} />
            <span className="text-muted-foreground">{beneficiaries} beneficiaries</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              {fmtCompact(netToHeirs)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Family Names Configuration Panel
function FamilyNamesConfig({
  familyConfig,
  onUpdate
}: {
  familyConfig: FamilyConfig;
  onUpdate: (config: Partial<FamilyConfig>) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const addChild = useCallback(() => {
    const newNames = [...familyConfig.childrenNames, `Child ${familyConfig.childrenNames.length + 1}`];
    onUpdate({ childrenNames: newNames });
  }, [familyConfig.childrenNames, onUpdate]);

  const removeChild = useCallback((index: number) => {
    const newNames = familyConfig.childrenNames.filter((_, i) => i !== index);
    onUpdate({ childrenNames: newNames });
  }, [familyConfig.childrenNames, onUpdate]);

  const updateChildName = useCallback((index: number, name: string) => {
    const newNames = [...familyConfig.childrenNames];
    newNames[index] = name;
    onUpdate({ childrenNames: newNames });
  }, [familyConfig.childrenNames, onUpdate]);

  const addGrandchild = useCallback(() => {
    const newNames = [...familyConfig.grandchildrenNames, `Grandchild ${familyConfig.grandchildrenNames.length + 1}`];
    onUpdate({ grandchildrenNames: newNames });
  }, [familyConfig.grandchildrenNames, onUpdate]);

  const removeGrandchild = useCallback((index: number) => {
    const newNames = familyConfig.grandchildrenNames.filter((_, i) => i !== index);
    onUpdate({ grandchildrenNames: newNames });
  }, [familyConfig.grandchildrenNames, onUpdate]);

  const updateGrandchildName = useCallback((index: number, name: string) => {
    const newNames = [...familyConfig.grandchildrenNames];
    newNames[index] = name;
    onUpdate({ grandchildrenNames: newNames });
  }, [familyConfig.grandchildrenNames, onUpdate]);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30 border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-950/50"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <span className="font-medium text-rose-900 dark:text-rose-100">
              Personalize Your Family Story
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="pt-4">
        <div className="space-y-4 p-4 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
          {/* Your Name */}
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-sm font-medium">
              Your Name
            </Label>
            <Input
              id="userName"
              value={familyConfig.userName}
              onChange={(e) => onUpdate({ userName: e.target.value })}
              placeholder="You"
              className="max-w-xs"
            />
          </div>

          {/* Spouse Name */}
          <div className="space-y-2">
            <Label htmlFor="spouseName" className="text-sm font-medium">
              Spouse Name (optional)
            </Label>
            <Input
              id="spouseName"
              value={familyConfig.spouseName || ""}
              onChange={(e) => onUpdate({ spouseName: e.target.value || undefined })}
              placeholder="Spouse"
              className="max-w-xs"
            />
          </div>

          {/* Children Names */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Children</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addChild}
                className="h-7 text-xs"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add Child
              </Button>
            </div>
            {familyConfig.childrenNames.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No children added. Click &quot;Add Child&quot; to personalize the story.
              </p>
            ) : (
              <div className="space-y-2">
                {familyConfig.childrenNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => updateChildName(index, e.target.value)}
                      placeholder={`Child ${index + 1}`}
                      className="max-w-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChild(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Grandchildren Names */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Grandchildren</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={addGrandchild}
                className="h-7 text-xs"
              >
                <UserPlus className="w-3 h-3 mr-1" />
                Add Grandchild
              </Button>
            </div>
            {familyConfig.grandchildrenNames.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                No grandchildren added. Click &quot;Add Grandchild&quot; to personalize the story.
              </p>
            ) : (
              <div className="space-y-2">
                {familyConfig.grandchildrenNames.map((name, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      value={name}
                      onChange={(e) => updateGrandchildName(index, e.target.value)}
                      placeholder={`Grandchild ${index + 1}`}
                      className="max-w-xs"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGrandchild(index)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function DynastyTimeline({ generationData }: DynastyTimelineProps) {
  const { config, updateConfig } = usePlanConfig();
  const familyConfig = config.familyConfig;

  const [scenario, setScenario] = useState<Scenario>("trust");
  const [showStories, setShowStories] = useState(true);

  const handleFamilyConfigUpdate = useCallback((updates: Partial<FamilyConfig>) => {
    updateConfig({
      familyConfig: {
        ...familyConfig,
        ...updates,
      },
    });
  }, [familyConfig, updateConfig]);

  if (!generationData || generationData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500" />
            Your Family Legacy Timeline
          </CardTitle>
          <CardDescription>
            See how your wealth creates opportunities for generations to come
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <div className="flex justify-center mb-4">
              <div className="flex -space-x-3">
                <PersonAvatar stage="senior" size={48} />
                <PersonAvatar stage="adult" size={48} />
                <PersonAvatar stage="young" size={48} />
                <PersonAvatar stage="child" size={48} />
              </div>
            </div>
            <p className="text-sm">
              No generation data available. Run a legacy calculation with a finite duration to see how wealth transfers across generations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate both scenarios
  const { directInheritanceData, dynastyTrustData } = useMemo(() => {
    // Direct Inheritance: Estate tax at every generation
    const directData = generationData.map((gen) => ({
      generation: `Gen ${gen.generation}`,
      generationNumber: gen.generation,
      netWealthAfterTax: gen.netToHeirs,
      estateTax: gen.estateTax,
      estateValue: gen.estateValue,
      year: gen.year,
      beneficiaries: gen.livingBeneficiaries,
    }));

    // Dynasty Trust: Tax only at Generation 1, then trust grows tax-free
    const trustData = generationData.map((gen, idx) => {
      if (idx === 0) {
        // Generation 1: Pay estate/GST tax when funding the trust
        return {
          generation: `Gen ${gen.generation}`,
          generationNumber: gen.generation,
          netWealthAfterTax: gen.netToHeirs,
          estateTax: gen.estateTax,
          estateValue: gen.estateValue,
          year: gen.year,
          beneficiaries: gen.livingBeneficiaries,
        };
      } else {
        // Generations 2+: No estate tax, assets stay in trust
        return {
          generation: `Gen ${gen.generation}`,
          generationNumber: gen.generation,
          netWealthAfterTax: gen.estateValue, // Full value stays in trust
          estateTax: 0, // No estate tax
          estateValue: gen.estateValue,
          year: gen.year,
          beneficiaries: gen.livingBeneficiaries,
        };
      }
    });

    return { directInheritanceData: directData, dynastyTrustData: trustData };
  }, [generationData]);

  // Select data based on scenario
  const chartData = scenario === "direct" ? directInheritanceData : dynastyTrustData;

  // Calculate totals for selected scenario
  const totalEstateTaxPaid = chartData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const totalEstate = chartData.reduce((sum, gen) => sum + gen.estateValue, 0);
  const avgTaxRate = totalEstate > 0 ? (totalEstateTaxPaid / totalEstate) * 100 : 0;
  const finalNetWealth = chartData[chartData.length - 1]?.netWealthAfterTax || 0;

  // Calculate tax savings (trust vs direct)
  const directTotalTax = directInheritanceData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const trustTotalTax = dynastyTrustData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const taxSavings = directTotalTax - trustTotalTax;
  const savingsPercent = directTotalTax > 0 ? (taxSavings / directTotalTax) * 100 : 0;

  // Get emotional milestones
  const milestones = getMilestones(generationData, familyConfig, scenario);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-500" />
          {familyConfig.userName === "You" ? "Your" : `The ${familyConfig.userName}`} Family Legacy Timeline
        </CardTitle>
        <CardDescription>
          See how your wealth creates opportunities for {generationData.length} generations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Family Names Configuration */}
        <FamilyNamesConfig
          familyConfig={familyConfig}
          onUpdate={handleFamilyConfigUpdate}
        />

        {/* Emotional Milestones */}
        {milestones.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={`p-4 rounded-lg border ${milestone.bgColor} ${milestone.borderColor}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 ${milestone.color}`}>
                    {milestone.icon}
                  </div>
                  <div>
                    <h4 className={`font-semibold text-sm ${milestone.color}`}>
                      {milestone.title}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {milestone.description}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Scenario Toggle */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <Label className="text-sm font-semibold mb-3 block">Estate Planning Strategy:</Label>
          <RadioGroup
            value={scenario}
            onValueChange={(value) => setScenario(value as Scenario)}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex items-center space-x-2 flex-1">
              <RadioGroupItem value="trust" id="trust" />
              <Label htmlFor="trust" className="cursor-pointer flex-1">
                <div className="font-semibold">Dynasty Trust</div>
                <div className="text-xs text-muted-foreground">
                  Estate/GST tax at Gen 1, then assets stay in trust (tax-free growth)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <RadioGroupItem value="direct" id="direct" />
              <Label htmlFor="direct" className="cursor-pointer flex-1">
                <div className="font-semibold">Direct Inheritance</div>
                <div className="text-xs text-muted-foreground">
                  Estate tax charged at every generation handoff (no trust)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Tax Savings Comparison (always visible) */}
        {taxSavings > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  Dynasty Trust Tax Savings
                </div>
                <div className="text-xs text-green-800 dark:text-green-200">
                  Avoid {savingsPercent.toFixed(0)}% of estate taxes by using a trust structure
                </div>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {fmt(taxSavings)}
              </div>
            </div>
          </div>
        )}

        {/* Family Story Toggle */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Users className="w-4 h-4" />
            Family Story View
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowStories(!showStories)}
            className="text-xs"
          >
            {showStories ? "Hide Stories" : "Show Stories"}
            {showStories ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
          </Button>
        </div>

        {/* Generation Stories */}
        {showStories && (
          <div className="space-y-0">
            {chartData.map((gen, index) => (
              <GenerationStoryCard
                key={gen.generationNumber}
                generationNumber={gen.generationNumber}
                year={gen.year}
                estateValue={gen.estateValue}
                netToHeirs={gen.netWealthAfterTax}
                beneficiaries={gen.beneficiaries}
                familyConfig={familyConfig}
                scenario={scenario}
                isLast={index === chartData.length - 1}
              />
            ))}
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Estate Tax Paid</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {fmt(totalEstateTaxPaid)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {scenario === "trust" ? "At Generation 1 only" : `Across all ${generationData.length} generations`}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Average Estate Tax Rate</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {avgTaxRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Federal estate tax burden
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Final Net Wealth</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {fmt(finalNetWealth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Generation {generationData.length}
            </div>
          </div>
        </div>

        {/* Area Chart - Mobile responsive with horizontal scroll for complex data */}
        <div className="w-full overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          <div className="min-w-[480px] sm:min-w-0 h-[300px] sm:h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="generation"
                className="text-xs"
                label={{
                  value: "Generation",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "var(--foreground)" },
                }}
              />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                className="text-xs"
                label={{
                  value: "Estate Value",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "var(--foreground)" },
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  const genName = data.generationNumber === 1
                    ? familyConfig.userName
                    : data.generationNumber === 2
                      ? (familyConfig.childrenNames[0] || "Your Children")
                      : (familyConfig.grandchildrenNames[0] || "Your Grandchildren");
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold mb-2">
                        {data.generation}: {genName} (Year {data.year})
                      </p>
                      <div className="space-y-1">
                        <p className="text-blue-600 dark:text-blue-400">
                          <span className="font-medium">Estate Value:</span> {fmt(data.estateValue)}
                        </p>
                        <p className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Estate Tax:</span> {fmt(data.estateTax)}
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          <span className="font-medium">
                            {scenario === "trust" && data.generationNumber > 1 ? "Trust Balance:" : "Net to Heirs:"}
                          </span> {fmt(data.netWealthAfterTax)}
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {data.beneficiaries} living beneficiaries
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="rect"
                formatter={(value) => (
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="netWealthAfterTax"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name={scenario === "trust" ? "Trust Balance (Tax-Free)" : "Net Wealth After Estate Tax"}
              />
              <Area
                type="monotone"
                dataKey="estateTax"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Estate Tax Paid"
              />
            </AreaChart>
          </ResponsiveContainer>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
            {scenario === "trust" ? "Dynasty Trust Structure" : "Direct Inheritance Structure"}
          </h4>
          {scenario === "trust" ? (
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              With a dynasty trust, estate/GST tax is paid only once (Generation 1) when {familyConfig.userName} funds the trust.
              After that, assets remain in the trust indefinitely, growing tax-free. {familyConfig.childrenNames[0] || "Your children"} and future generations receive
              annual distributions but never own the assets outright,
              avoiding estate tax at each generation handoff. This structure can preserve wealth for 3+ generations.
            </p>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              With direct inheritance, each generation owns assets outright. Federal estate tax (40% on amounts
              above ${(13.61).toFixed(1)}M exemption) is charged every time wealth passes to the next generation.
              Over multiple generations, this compounds significantly, eroding family wealth. Strategic gifting
              ($18K/person/year) can help reduce this burden.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
