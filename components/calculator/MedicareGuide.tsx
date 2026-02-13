"use client";

import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  Heart,
  HelpCircle,
  Info,
  Shield,
  Building2,
  Pill,
  Stethoscope,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Briefcase,
} from "lucide-react";
import { IRMAA_BRACKETS_2026 } from "@/lib/calculations/shared/constants";

// =====================================================
// Types
// =====================================================

interface MedicareGuideProps {
  currentAge: number;
  birthMonth?: number; // 1-12
  birthYear?: number;
  isMarried?: boolean;
  estimatedMAGI?: number;
  hasEmployerCoverage?: boolean;
  employerSize?: "small" | "large"; // < 20 or >= 20 employees
  spouseAge?: number;
}

interface EnrollmentWindow {
  name: string;
  dates: string;
  description: string;
  applies: boolean;
  urgent: boolean;
}

// =====================================================
// Constants
// =====================================================

const PART_B_PREMIUM_2024 = 174.70;
const PART_A_DEDUCTIBLE_2024 = 1632;
const PART_B_DEDUCTIBLE_2024 = 240;

const MEDIGAP_PLANS = [
  { letter: "A", coverage: "Basic", popularity: "Low", note: "Minimum coverage" },
  { letter: "B", coverage: "Basic + Part A deductible", popularity: "Low", note: "Slightly better" },
  { letter: "C", coverage: "Comprehensive", popularity: "Medium", note: "Not available to new enrollees after 2020" },
  { letter: "D", coverage: "Moderate", popularity: "Low", note: "Covers most gaps" },
  { letter: "F", coverage: "Most comprehensive", popularity: "High (legacy)", note: "Not available to new enrollees after 2020" },
  { letter: "G", coverage: "Near-comprehensive", popularity: "Highest", note: "Best for new enrollees - covers everything except Part B deductible" },
  { letter: "K", coverage: "Cost-sharing", popularity: "Low", note: "50% coverage, lower premiums" },
  { letter: "L", coverage: "Cost-sharing", popularity: "Low", note: "75% coverage, lower premiums" },
  { letter: "M", coverage: "Moderate", popularity: "Low", note: "50% Part A deductible" },
  { letter: "N", coverage: "Good with copays", popularity: "High", note: "Lower premium, some copays for doctor visits" },
];

// =====================================================
// Helper Functions
// =====================================================

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatCurrencyWithCents(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getMonthsUntil65(currentAge: number, birthMonth?: number): number {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Calculate years until 65
  const yearsUntil65 = 65 - currentAge;

  if (birthMonth) {
    // More precise calculation
    const monthsFromNow = (yearsUntil65 * 12) - (currentMonth - birthMonth);
    return Math.max(0, monthsFromNow);
  }

  return Math.max(0, yearsUntil65 * 12);
}

function getEnrollmentWindows(
  currentAge: number,
  birthMonth?: number
): EnrollmentWindow[] {
  const monthsUntil65 = getMonthsUntil65(currentAge, birthMonth);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const windows: EnrollmentWindow[] = [
    {
      name: "Initial Enrollment Period (IEP)",
      dates: "3 months before to 3 months after your 65th birthday month",
      description: "Your primary enrollment window. Enroll during the 3 months BEFORE turning 65 for coverage starting on your birthday.",
      applies: monthsUntil65 <= 6 && monthsUntil65 >= 0,
      urgent: monthsUntil65 <= 3 && monthsUntil65 >= 0,
    },
    {
      name: "General Enrollment Period (GEP)",
      dates: "January 1 - March 31 each year",
      description: "For those who missed their IEP. Coverage starts July 1. Late enrollment penalties apply!",
      applies: currentMonth >= 1 && currentMonth <= 3,
      urgent: false,
    },
    {
      name: "Open Enrollment Period (OEP)",
      dates: "October 15 - December 7 each year",
      description: "Switch Medicare Advantage plans or change Part D prescription drug coverage. Changes take effect January 1.",
      applies: currentMonth >= 10 && currentMonth <= 12 && currentAge >= 65,
      urgent: currentMonth === 12 && currentAge >= 65,
    },
    {
      name: "Medicare Advantage Open Enrollment",
      dates: "January 1 - March 31 each year",
      description: "Switch from one Advantage plan to another, or drop Advantage for Original Medicare + Part D.",
      applies: currentMonth >= 1 && currentMonth <= 3 && currentAge >= 65,
      urgent: false,
    },
  ];

  return windows;
}

function getIRMAATier(magi: number, isMarried: boolean): {
  tier: number;
  surcharge: number;
  nextThreshold: number | null;
  savingsOpportunity: number;
} {
  const brackets = isMarried ? IRMAA_BRACKETS_2026.married : IRMAA_BRACKETS_2026.single;

  for (let i = 0; i < brackets.length; i++) {
    if (magi <= brackets[i].threshold) {
      const nextThreshold = i > 0 ? brackets[i - 1].threshold : null;
      const savingsOpportunity = i > 0
        ? (brackets[i].surcharge - brackets[i - 1].surcharge) * 12
        : 0;

      return {
        tier: i,
        surcharge: brackets[i].surcharge,
        nextThreshold,
        savingsOpportunity,
      };
    }
  }

  return {
    tier: brackets.length - 1,
    surcharge: brackets[brackets.length - 1].surcharge,
    nextThreshold: brackets[brackets.length - 2].threshold,
    savingsOpportunity: 0,
  };
}

// =====================================================
// Sub-Components
// =====================================================

const CountdownTimer: React.FC<{ currentAge: number; birthMonth?: number }> = ({
  currentAge,
  birthMonth,
}) => {
  const monthsUntil65 = getMonthsUntil65(currentAge, birthMonth);
  const years = Math.floor(monthsUntil65 / 12);
  const months = monthsUntil65 % 12;

  if (currentAge >= 65) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
        <h3 className="text-xl font-bold text-green-900 dark:text-green-100">
          You are Medicare eligible!
        </h3>
        <p className="text-green-700 dark:text-green-300 mt-2">
          Make sure you are enrolled in the right plans for your situation.
        </p>
      </div>
    );
  }

  const urgency = monthsUntil65 <= 3 ? "urgent" : monthsUntil65 <= 6 ? "soon" : "planning";

  return (
    <div className={`rounded-xl p-6 text-center border-2 ${
      urgency === "urgent"
        ? "bg-red-50 dark:bg-red-950/30 border-red-300 dark:border-red-700"
        : urgency === "soon"
        ? "bg-orange-50 dark:bg-orange-950/30 border-orange-300 dark:border-orange-700"
        : "bg-blue-50 dark:bg-blue-950/30 border-blue-300 dark:border-blue-700"
    }`}>
      <Clock className={`h-12 w-12 mx-auto mb-3 ${
        urgency === "urgent" ? "text-red-600" : urgency === "soon" ? "text-orange-600" : "text-blue-600"
      }`} />
      <h3 className={`text-xl font-bold ${
        urgency === "urgent"
          ? "text-red-900 dark:text-red-100"
          : urgency === "soon"
          ? "text-orange-900 dark:text-orange-100"
          : "text-blue-900 dark:text-blue-100"
      }`}>
        You turn 65 in
      </h3>
      <div className="flex justify-center gap-4 mt-4">
        {years > 0 && (
          <div className="text-center">
            <div className={`text-4xl font-bold ${
              urgency === "urgent" ? "text-red-700" : urgency === "soon" ? "text-orange-700" : "text-blue-700"
            }`}>
              {years}
            </div>
            <div className="text-sm text-muted-foreground">
              {years === 1 ? "year" : "years"}
            </div>
          </div>
        )}
        <div className="text-center">
          <div className={`text-4xl font-bold ${
            urgency === "urgent" ? "text-red-700" : urgency === "soon" ? "text-orange-700" : "text-blue-700"
          }`}>
            {months}
          </div>
          <div className="text-sm text-muted-foreground">
            {months === 1 ? "month" : "months"}
          </div>
        </div>
      </div>

      {urgency === "urgent" && (
        <div className="mt-4 bg-red-100 dark:bg-red-900/50 rounded-lg p-3">
          <AlertTriangle className="h-5 w-5 text-red-600 inline mr-2" />
          <span className="text-red-800 dark:text-red-200 font-semibold">
            Action required! Your Initial Enrollment Period is NOW.
          </span>
        </div>
      )}

      {urgency === "soon" && (
        <div className="mt-4 bg-orange-100 dark:bg-orange-900/50 rounded-lg p-3">
          <Calendar className="h-5 w-5 text-orange-600 inline mr-2" />
          <span className="text-orange-800 dark:text-orange-200 font-semibold">
            Start researching plans now. Your enrollment window opens soon!
          </span>
        </div>
      )}
    </div>
  );
};

const MedicarePartsExplainer: React.FC = () => {
  const [expanded, setExpanded] = useState<string | null>(null);

  const parts = [
    {
      part: "A",
      name: "Hospital Insurance",
      icon: Building2,
      color: "blue",
      cost: "Usually $0 (if you paid Medicare taxes 10+ years)",
      covers: [
        "Inpatient hospital stays",
        "Skilled nursing facility care",
        "Hospice care",
        "Some home health care",
      ],
      deductible: `${formatCurrency(PART_A_DEDUCTIBLE_2024)} per benefit period`,
      tip: "Most people get Part A premium-free. If not, it costs up to $505/month.",
    },
    {
      part: "B",
      name: "Medical Insurance",
      icon: Stethoscope,
      color: "green",
      cost: `${formatCurrencyWithCents(PART_B_PREMIUM_2024)}/month (standard), more with IRMAA`,
      covers: [
        "Doctor visits",
        "Outpatient care",
        "Preventive services",
        "Durable medical equipment",
        "Mental health services",
      ],
      deductible: `${formatCurrency(PART_B_DEDUCTIBLE_2024)}/year`,
      tip: "Premium increases based on income (IRMAA). High earners pay significantly more.",
    },
    {
      part: "C",
      name: "Medicare Advantage",
      icon: Shield,
      color: "purple",
      cost: "Often $0 premium (plus Part B premium)",
      covers: [
        "Everything in Parts A and B",
        "Usually includes Part D (drugs)",
        "Often includes dental, vision, hearing",
        "May include fitness benefits",
      ],
      deductible: "Varies by plan",
      tip: "Private insurance alternative. Great value but comes with network restrictions.",
    },
    {
      part: "D",
      name: "Prescription Drug Coverage",
      icon: Pill,
      color: "orange",
      cost: "$0 to ~$100/month depending on plan",
      covers: [
        "Prescription medications",
        "Vaccines at pharmacy",
      ],
      deductible: "Varies by plan (max $545 in 2024)",
      tip: "Essential if you take any medications. Penalties for late enrollment!",
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
      blue: {
        bg: "bg-blue-50 dark:bg-blue-950/30",
        border: "border-blue-200 dark:border-blue-800",
        text: "text-blue-900 dark:text-blue-100",
        icon: "text-blue-600",
      },
      green: {
        bg: "bg-green-50 dark:bg-green-950/30",
        border: "border-green-200 dark:border-green-800",
        text: "text-green-900 dark:text-green-100",
        icon: "text-green-600",
      },
      purple: {
        bg: "bg-purple-50 dark:bg-purple-950/30",
        border: "border-purple-200 dark:border-purple-800",
        text: "text-purple-900 dark:text-purple-100",
        icon: "text-purple-600",
      },
      orange: {
        bg: "bg-orange-50 dark:bg-orange-950/30",
        border: "border-orange-200 dark:border-orange-800",
        text: "text-orange-900 dark:text-orange-100",
        icon: "text-orange-600",
      },
    };
    return colors[color] || colors.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {parts.map((part) => {
        const colors = getColorClasses(part.color);
        const isExpanded = expanded === part.part;
        const Icon = part.icon;

        return (
          <div
            key={part.part}
            className={`rounded-lg border-2 ${colors.border} ${colors.bg} overflow-hidden transition-all`}
          >
            <button
              onClick={() => setExpanded(isExpanded ? null : part.part)}
              className="w-full p-4 text-left flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-white dark:bg-gray-900 shadow-sm`}>
                  <Icon className={`h-6 w-6 ${colors.icon}`} />
                </div>
                <div>
                  <div className={`font-bold text-lg ${colors.text}`}>
                    Part {part.part}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {part.name}
                  </div>
                </div>
              </div>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </button>

            {isExpanded && (
              <div className="px-4 pb-4 space-y-3 border-t border-current/10">
                <div className="pt-3">
                  <div className="text-sm font-semibold text-muted-foreground">Cost</div>
                  <div className={`font-medium ${colors.text}`}>{part.cost}</div>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground">Covers</div>
                  <ul className="mt-1 space-y-1">
                    {part.covers.map((item, i) => (
                      <li key={i} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <div className="text-sm font-semibold text-muted-foreground">Deductible</div>
                  <div className="text-sm">{part.deductible}</div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Info className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      {part.tip}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const MedicareVsAdvantage: React.FC<{
  hasEmployerCoverage?: boolean;
  estimatedMAGI?: number;
}> = ({ hasEmployerCoverage, estimatedMAGI }) => {
  const [preference, setPreference] = useState<"original" | "advantage" | null>(null);

  const questions = [
    {
      question: "Do you travel frequently or live in multiple states?",
      original: "Yes - need nationwide coverage",
      advantage: "No - mostly stay local",
    },
    {
      question: "Do you have a preferred doctor you must keep?",
      original: "Yes - can not switch doctors",
      advantage: "Flexible - willing to use network",
    },
    {
      question: "How do you feel about managing healthcare costs?",
      original: "Prefer predictable premiums (Medigap)",
      advantage: "Okay with copays/coinsurance",
    },
    {
      question: "Do you need dental, vision, or hearing coverage?",
      original: "No - or will buy separately",
      advantage: "Yes - want it bundled",
    },
    {
      question: "What is your budget priority?",
      original: "Lower out-of-pocket costs when sick",
      advantage: "Lower monthly premiums",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Medicare */}
        <div className={`rounded-xl border-2 p-5 transition-all ${
          preference === "original"
            ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30"
            : "border-gray-200 dark:border-gray-700"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h4 className="font-bold text-lg">Original Medicare</h4>
              <p className="text-sm text-muted-foreground">Parts A + B + Medigap + Part D</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-green-700 dark:text-green-400">Pros</div>
              <ul className="mt-1 space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  See any doctor that accepts Medicare (nationwide)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  No network restrictions or referrals needed
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Medigap covers most out-of-pocket costs
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Predictable costs (premium-based)
                </li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">Cons</div>
              <ul className="mt-1 space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  Higher monthly premiums (Part B + Medigap + Part D)
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  No dental, vision, or hearing coverage included
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  Need to manage multiple plans
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm font-semibold">Typical Monthly Cost</div>
              <div className="text-lg font-bold text-blue-700 dark:text-blue-300">
                $300 - $500/month
              </div>
              <div className="text-xs text-muted-foreground">
                Part B ($175) + Medigap G ($100-250) + Part D ($25-75)
              </div>
            </div>
          </div>

          <Button
            variant={preference === "original" ? "default" : "outline"}
            className="w-full mt-4"
            onClick={() => setPreference("original")}
          >
            {preference === "original" ? "Selected" : "This fits me better"}
          </Button>
        </div>

        {/* Medicare Advantage */}
        <div className={`rounded-xl border-2 p-5 transition-all ${
          preference === "advantage"
            ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30"
            : "border-gray-200 dark:border-gray-700"
        }`}>
          <div className="flex items-center gap-3 mb-4">
            <Heart className="h-8 w-8 text-purple-600" />
            <div>
              <h4 className="font-bold text-lg">Medicare Advantage</h4>
              <p className="text-sm text-muted-foreground">Part C (all-in-one)</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-semibold text-green-700 dark:text-green-400">Pros</div>
              <ul className="mt-1 space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Often $0 premium (beyond Part B)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Usually includes prescription drugs (Part D)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  Often includes dental, vision, hearing, fitness
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                  One card, one plan, simpler management
                </li>
              </ul>
            </div>

            <div>
              <div className="text-sm font-semibold text-red-700 dark:text-red-400">Cons</div>
              <ul className="mt-1 space-y-1 text-sm">
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  Must use network doctors and hospitals
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  May need referrals to see specialists
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  Copays and coinsurance when you use care
                </li>
                <li className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  May not work well for travelers
                </li>
              </ul>
            </div>

            <div className="pt-2 border-t">
              <div className="text-sm font-semibold">Typical Monthly Cost</div>
              <div className="text-lg font-bold text-purple-700 dark:text-purple-300">
                $175 - $250/month
              </div>
              <div className="text-xs text-muted-foreground">
                Part B ($175) + Advantage premium ($0-75)
              </div>
            </div>
          </div>

          <Button
            variant={preference === "advantage" ? "default" : "outline"}
            className="w-full mt-4"
            onClick={() => setPreference("advantage")}
          >
            {preference === "advantage" ? "Selected" : "This fits me better"}
          </Button>
        </div>
      </div>

      {/* Decision Helper Questions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            Which is right for you?
          </CardTitle>
          <CardDescription>
            Consider these questions to help decide
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {questions.map((q, i) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3">
                <div className="font-medium text-sm mb-2">{q.question}</div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <ArrowRight className="h-3 w-3" />
                    {q.original}
                  </div>
                  <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                    <ArrowRight className="h-3 w-3" />
                    {q.advantage}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendation */}
      {preference && (
        <div className={`rounded-xl p-4 border-2 ${
          preference === "original"
            ? "bg-blue-50 dark:bg-blue-950/30 border-blue-300"
            : "bg-purple-50 dark:bg-purple-950/30 border-purple-300"
        }`}>
          <div className="flex items-start gap-3">
            <CheckCircle2 className={`h-6 w-6 flex-shrink-0 ${
              preference === "original" ? "text-blue-600" : "text-purple-600"
            }`} />
            <div>
              <h4 className={`font-bold ${
                preference === "original"
                  ? "text-blue-900 dark:text-blue-100"
                  : "text-purple-900 dark:text-purple-100"
              }`}>
                {preference === "original"
                  ? "Original Medicare might be better for you"
                  : "Medicare Advantage might be better for you"
                }
              </h4>
              <p className="text-sm mt-1 text-muted-foreground">
                {preference === "original"
                  ? "Consider getting Plan G Medigap within 6 months of Part B enrollment for guaranteed issue rights."
                  : "Compare plans at medicare.gov to find one with good coverage for your medications and preferred doctors."
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MedigapGuide: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Key Timing Warning */}
      <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-red-900 dark:text-red-100 text-lg">
              Critical Timing: 6-Month Window
            </h4>
            <p className="text-red-800 dark:text-red-200 mt-1">
              You have <strong>exactly 6 months</strong> from the date you enroll in Part B to buy any
              Medigap policy with <strong>guaranteed issue rights</strong>. After this window, insurers can:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-red-800 dark:text-red-200">
              <li>* Deny coverage based on health conditions</li>
              <li>* Charge much higher premiums</li>
              <li>* Refuse to cover pre-existing conditions</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Plan Recommendation */}
      <Card className="border-2 border-green-200 dark:border-green-800">
        <CardHeader className="bg-green-50 dark:bg-green-950/30">
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Plan G: The Best Choice for Most New Enrollees
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <p className="text-muted-foreground">
            Plan G covers almost everything. The only thing you pay is the annual Part B deductible
            ({formatCurrency(PART_B_DEDUCTIBLE_2024)} in 2024). After that, Plan G covers:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {[
              "Part A coinsurance and hospital costs",
              "Part B coinsurance or copayment",
              "Blood (first 3 pints)",
              "Part A hospice care coinsurance",
              "Skilled nursing facility coinsurance",
              "Part A deductible",
              "Part B excess charges",
              "Foreign travel emergency (80%)",
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Why not Plan F?</strong> Plan F covers even the Part B deductible, but
                it is not available to people who became eligible for Medicare after January 1, 2020.
                Plan G is functionally equivalent and often cheaper.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* All Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Medigap Plans at a Glance</CardTitle>
          <CardDescription>
            Plans are standardized by letter. Same letter = same coverage regardless of insurer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">Plan</th>
                  <th className="text-left py-2 px-3">Coverage Level</th>
                  <th className="text-left py-2 px-3">Popularity</th>
                  <th className="text-left py-2 px-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {MEDIGAP_PLANS.map((plan) => (
                  <tr key={plan.letter} className="border-b hover:bg-muted/50">
                    <td className="py-2 px-3">
                      <Badge variant={plan.letter === "G" || plan.letter === "N" ? "default" : "outline"}>
                        Plan {plan.letter}
                      </Badge>
                    </td>
                    <td className="py-2 px-3">{plan.coverage}</td>
                    <td className="py-2 px-3">
                      <span className={
                        plan.popularity === "Highest" || plan.popularity === "High"
                          ? "text-green-600 font-medium"
                          : "text-muted-foreground"
                      }>
                        {plan.popularity}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-muted-foreground">{plan.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const IRMAASurcharges: React.FC<{
  isMarried: boolean;
  estimatedMAGI?: number;
}> = ({ isMarried, estimatedMAGI }) => {
  const brackets = isMarried ? IRMAA_BRACKETS_2026.married : IRMAA_BRACKETS_2026.single;
  const currentTier = estimatedMAGI
    ? getIRMAATier(estimatedMAGI, isMarried)
    : null;

  return (
    <div className="space-y-6">
      {/* IRMAA Explanation */}
      <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <DollarSign className="h-6 w-6 text-orange-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-orange-900 dark:text-orange-100 text-lg">
              What is IRMAA?
            </h4>
            <p className="text-orange-800 dark:text-orange-200 mt-1">
              <strong>Income-Related Monthly Adjustment Amount</strong> - If your income exceeds
              certain thresholds, you pay extra for Medicare Part B and Part D. These surcharges
              are based on your MAGI from <strong>two years ago</strong> (your tax return from 2 years prior).
            </p>
          </div>
        </div>
      </div>

      {/* Brackets Table */}
      <Card>
        <CardHeader>
          <CardTitle>2026 IRMAA Brackets ({isMarried ? "Married Filing Jointly" : "Single"})</CardTitle>
          <CardDescription>
            Monthly surcharges added to your Part B premium based on MAGI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3">MAGI Threshold</th>
                  <th className="text-right py-2 px-3">Monthly Surcharge</th>
                  <th className="text-right py-2 px-3">Total Part B Premium</th>
                  <th className="text-right py-2 px-3">Annual Extra Cost</th>
                </tr>
              </thead>
              <tbody>
                {brackets.map((bracket, i) => {
                  const isCurrentTier = currentTier && currentTier.tier === i;
                  const totalPremium = PART_B_PREMIUM_2024 + bracket.surcharge;
                  const annualExtra = bracket.surcharge * 12;

                  return (
                    <tr
                      key={i}
                      className={`border-b ${
                        isCurrentTier
                          ? "bg-yellow-100 dark:bg-yellow-900/30 font-semibold"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <td className="py-2 px-3">
                        {bracket.threshold === Infinity
                          ? `Above ${formatCurrency(brackets[i - 1]?.threshold || 0)}`
                          : i === 0
                            ? `Up to ${formatCurrency(bracket.threshold)}`
                            : `${formatCurrency(brackets[i - 1].threshold + 1)} - ${formatCurrency(bracket.threshold)}`
                        }
                        {isCurrentTier && (
                          <Badge variant="default" className="ml-2 text-xs">You</Badge>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {bracket.surcharge === 0
                          ? <span className="text-green-600">$0</span>
                          : <span className="text-red-600">+{formatCurrencyWithCents(bracket.surcharge)}</span>
                        }
                      </td>
                      <td className="py-2 px-3 text-right">
                        {formatCurrencyWithCents(totalPremium)}
                      </td>
                      <td className="py-2 px-3 text-right">
                        {annualExtra === 0
                          ? <span className="text-green-600">$0</span>
                          : <span className="text-red-600">+{formatCurrency(annualExtra)}</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Personalized Advice */}
      {currentTier && currentTier.tier > 0 && (
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-600" />
              Your IRMAA Situation
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-700 dark:text-red-300">Current Monthly Surcharge</div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  +{formatCurrencyWithCents(currentTier.surcharge)}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-4 text-center border border-red-200 dark:border-red-800">
                <div className="text-sm text-red-700 dark:text-red-300">Annual Extra Cost</div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  +{formatCurrency(currentTier.surcharge * 12)}
                </div>
              </div>
              {currentTier.nextThreshold && (
                <div className="bg-green-50 dark:bg-green-950/30 rounded-lg p-4 text-center border border-green-200 dark:border-green-800">
                  <div className="text-sm text-green-700 dark:text-green-300">Lower Tier at MAGI Below</div>
                  <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {formatCurrency(currentTier.nextThreshold)}
                  </div>
                </div>
              )}
            </div>

            {currentTier.savingsOpportunity > 0 && (
              <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
                <h5 className="font-semibold text-green-900 dark:text-green-100">
                  Potential Annual Savings: {formatCurrency(currentTier.savingsOpportunity)}
                </h5>
                <p className="text-sm text-green-800 dark:text-green-200 mt-1">
                  If you can reduce your MAGI below {formatCurrency(currentTier.nextThreshold || 0)},
                  you would save {formatCurrency(currentTier.savingsOpportunity)} per year in IRMAA surcharges.
                </p>
                <p className="text-sm text-green-700 dark:text-green-300 mt-2">
                  <strong>Strategies:</strong> Roth conversions in lower-income years, timing capital gains,
                  maximizing pre-tax contributions while working, QCDs from IRAs after 70.5.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const WorkingPast65: React.FC<{
  hasEmployerCoverage?: boolean;
  employerSize?: "small" | "large";
}> = ({ hasEmployerCoverage, employerSize }) => {
  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Briefcase className="h-6 w-6 text-blue-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-blue-900 dark:text-blue-100 text-lg">
              Working Past 65? You Have Options
            </h4>
            <p className="text-blue-800 dark:text-blue-200 mt-1">
              If you have employer health coverage, you may be able to delay Medicare Part B
              without penalty. But the rules depend on your employer size.
            </p>
          </div>
        </div>
      </div>

      {/* Employer Size Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Large Employer */}
        <Card className={`border-2 ${
          employerSize === "large"
            ? "border-green-500 bg-green-50/50 dark:bg-green-950/20"
            : ""
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-green-600" />
              Large Employer (20+ employees)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>You can delay Part B</strong> without penalty while covered by your
                employer plan.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>Special Enrollment Period (SEP):</strong> When you stop working or
                lose coverage, you have 8 months to enroll in Part B penalty-free.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Employer coverage is <strong>primary</strong>, Medicare is secondary.
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mt-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>Still enroll in Part A</strong> - it is free and helps with hospital costs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Small Employer */}
        <Card className={`border-2 ${
          employerSize === "small"
            ? "border-red-500 bg-red-50/50 dark:bg-red-950/20"
            : ""
        }`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-red-600" />
              Small Employer (fewer than 20 employees)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                <strong>You MUST enroll in Part B</strong> during your Initial Enrollment Period,
                even with employer coverage.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Medicare becomes <strong>primary</strong>, employer coverage is secondary.
              </p>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Delaying Part B results in <strong>permanent late enrollment penalties</strong>.
              </p>
            </div>

            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Important:</strong> Your employer coverage may not pay claims properly
                if Medicare should have been primary.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SEP Details */}
      <Card>
        <CardHeader>
          <CardTitle>Special Enrollment Period (SEP) Timeline</CardTitle>
          <CardDescription>
            For those with large employer coverage who delayed Part B
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200 dark:bg-blue-800" />

            <div className="space-y-6">
              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-blue-500 rounded-full border-4 border-white dark:border-gray-900" />
                <div className="font-semibold">Employment ends or coverage stops</div>
                <div className="text-sm text-muted-foreground">Your 8-month SEP window begins</div>
              </div>

              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-green-500 rounded-full border-4 border-white dark:border-gray-900" />
                <div className="font-semibold">Months 1-8: Enroll in Part B</div>
                <div className="text-sm text-muted-foreground">No late enrollment penalty. Coverage starts the first of the month after you sign up.</div>
              </div>

              <div className="relative pl-10">
                <div className="absolute left-2 w-4 h-4 bg-red-500 rounded-full border-4 border-white dark:border-gray-900" />
                <div className="font-semibold">After Month 8: Penalty applies</div>
                <div className="text-sm text-muted-foreground">Must wait for General Enrollment (Jan-Mar) with permanent 10% penalty per year delayed.</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Late Enrollment Penalty Warning */}
      <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
          <div>
            <h4 className="font-bold text-red-900 dark:text-red-100 text-lg">
              Late Enrollment Penalties are PERMANENT
            </h4>
            <p className="text-red-800 dark:text-red-200 mt-1">
              If you delay Part B enrollment without qualifying employer coverage, you pay a
              <strong> 10% penalty for every 12 months</strong> you could have had Part B but did not.
              This penalty is added to your Part B premium <strong>for life</strong>.
            </p>
            <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg">
              <div className="text-sm font-semibold">Example: 3 years delayed</div>
              <div className="text-sm text-muted-foreground mt-1">
                Base premium: {formatCurrencyWithCents(PART_B_PREMIUM_2024)}/month<br />
                + 30% penalty: +{formatCurrencyWithCents(PART_B_PREMIUM_2024 * 0.3)}/month<br />
                <strong>= {formatCurrencyWithCents(PART_B_PREMIUM_2024 * 1.3)}/month for life</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EnrollmentChecklist: React.FC<{
  currentAge: number;
  birthMonth?: number;
}> = ({ currentAge, birthMonth }) => {
  const monthsUntil65 = getMonthsUntil65(currentAge, birthMonth);

  const checklist = [
    {
      months: 12,
      title: "12 months before turning 65",
      tasks: [
        "Start researching Medicare options (Original vs. Advantage)",
        "Understand the 4 parts of Medicare (A, B, C, D)",
        "Check if your doctors accept Medicare",
        "Review your prescription drug needs for Part D planning",
      ],
      status: monthsUntil65 <= 12 ? "active" : "upcoming",
    },
    {
      months: 6,
      title: "6 months before turning 65",
      tasks: [
        "Compare Medigap plans if choosing Original Medicare",
        "Research Medicare Advantage plans in your area",
        "Get quotes from multiple insurance companies",
        "Check if employer coverage qualifies for Part B delay",
      ],
      status: monthsUntil65 <= 6 ? "active" : "upcoming",
    },
    {
      months: 3,
      title: "3 months before turning 65 (IEP begins!)",
      tasks: [
        "ENROLL in Medicare Part A and Part B at ssa.gov",
        "Apply for Medigap plan (if choosing Original Medicare)",
        "Enroll in Part D prescription drug plan",
        "OR enroll in Medicare Advantage plan",
        "Notify employer of Medicare enrollment",
      ],
      status: monthsUntil65 <= 3 && monthsUntil65 >= 0 ? "urgent" : monthsUntil65 <= 3 ? "active" : "upcoming",
    },
    {
      months: 0,
      title: "Month you turn 65",
      tasks: [
        "Confirm Medicare coverage is active",
        "Receive Medicare card in mail",
        "Medigap 6-month open enrollment begins",
        "Update pharmacy with new insurance info",
      ],
      status: monthsUntil65 <= 0 && monthsUntil65 >= -1 ? "active" : monthsUntil65 < -1 ? "completed" : "upcoming",
    },
    {
      months: -3,
      title: "3 months after turning 65",
      tasks: [
        "IEP ends - make sure all enrollment is complete",
        "Schedule preventive care appointments",
        "Use Welcome to Medicare preventive visit (free)",
      ],
      status: monthsUntil65 <= -3 ? "completed" : "upcoming",
    },
    {
      months: -6,
      title: "6 months after Part B starts",
      tasks: [
        "DEADLINE: Medigap guaranteed issue ends",
        "Finalize Medigap coverage if desired",
      ],
      status: monthsUntil65 <= -6 ? "completed" : "upcoming",
    },
  ];

  return (
    <div className="space-y-4">
      {checklist.map((phase, i) => (
        <div
          key={i}
          className={`rounded-xl border-2 p-4 ${
            phase.status === "urgent"
              ? "border-red-300 bg-red-50 dark:bg-red-950/30"
              : phase.status === "active"
              ? "border-blue-300 bg-blue-50 dark:bg-blue-950/30"
              : phase.status === "completed"
              ? "border-green-300 bg-green-50 dark:bg-green-950/30"
              : "border-gray-200 dark:border-gray-700 bg-muted/30"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            {phase.status === "urgent" && (
              <AlertTriangle className="h-5 w-5 text-red-600" />
            )}
            {phase.status === "active" && (
              <Clock className="h-5 w-5 text-blue-600" />
            )}
            {phase.status === "completed" && (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            )}
            {phase.status === "upcoming" && (
              <Calendar className="h-5 w-5 text-gray-400" />
            )}
            <h4 className={`font-bold ${
              phase.status === "urgent"
                ? "text-red-900 dark:text-red-100"
                : phase.status === "active"
                ? "text-blue-900 dark:text-blue-100"
                : phase.status === "completed"
                ? "text-green-900 dark:text-green-100"
                : "text-muted-foreground"
            }`}>
              {phase.title}
            </h4>
            {phase.status === "urgent" && (
              <Badge variant="destructive">ACTION REQUIRED</Badge>
            )}
          </div>

          <ul className="space-y-2 ml-8">
            {phase.tasks.map((task, j) => (
              <li key={j} className="flex items-start gap-2 text-sm">
                <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 ${
                  phase.status === "completed"
                    ? "bg-green-500 border-green-500"
                    : "border-current opacity-40"
                }`}>
                  {phase.status === "completed" && (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  )}
                </div>
                <span className={phase.status === "completed" ? "line-through opacity-70" : ""}>
                  {task}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// Main Component
// =====================================================

export const MedicareGuide: React.FC<MedicareGuideProps> = ({
  currentAge,
  birthMonth,
  birthYear,
  isMarried = false,
  estimatedMAGI,
  hasEmployerCoverage = false,
  employerSize,
  spouseAge,
}) => {
  const [activeTab, setActiveTab] = useState("overview");

  const enrollmentWindows = useMemo(
    () => getEnrollmentWindows(currentAge, birthMonth),
    [currentAge, birthMonth]
  );

  const activeWindows = enrollmentWindows.filter(w => w.applies);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold flex items-center justify-center gap-3">
          <Heart className="h-8 w-8 text-red-500" />
          Medicare Enrollment Guide
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Medicare does not have to be confusing. This guide breaks down everything you need to know
          about enrollment windows, plan options, and how to avoid costly mistakes.
        </p>
      </div>

      {/* Countdown Timer */}
      <CountdownTimer currentAge={currentAge} birthMonth={birthMonth} />

      {/* Active Enrollment Windows Alert */}
      {activeWindows.length > 0 && (
        <div className="space-y-3">
          {activeWindows.map((window, i) => (
            <div
              key={i}
              className={`rounded-xl p-4 border-2 ${
                window.urgent
                  ? "border-red-300 bg-red-50 dark:bg-red-950/30"
                  : "border-blue-300 bg-blue-50 dark:bg-blue-950/30"
              }`}
            >
              <div className="flex items-start gap-3">
                {window.urgent ? (
                  <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0" />
                ) : (
                  <Calendar className="h-6 w-6 text-blue-600 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-bold ${
                    window.urgent
                      ? "text-red-900 dark:text-red-100"
                      : "text-blue-900 dark:text-blue-100"
                  }`}>
                    {window.name} is OPEN
                  </h4>
                  <p className="text-sm mt-1">
                    <strong>{window.dates}</strong>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {window.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview">Parts A-D</TabsTrigger>
          <TabsTrigger value="comparison">Original vs MA</TabsTrigger>
          <TabsTrigger value="medigap">Medigap</TabsTrigger>
          <TabsTrigger value="irmaa">IRMAA</TabsTrigger>
          <TabsTrigger value="working">Working 65+</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                The 4 Parts of Medicare
              </CardTitle>
              <CardDescription>
                Click each part to learn what it covers and costs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MedicarePartsExplainer />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5 text-purple-600" />
                Original Medicare vs. Medicare Advantage
              </CardTitle>
              <CardDescription>
                The biggest decision you will make. Both paths have trade-offs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MedicareVsAdvantage
                hasEmployerCoverage={hasEmployerCoverage}
                estimatedMAGI={estimatedMAGI}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medigap" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Medigap (Medicare Supplement) Plans
              </CardTitle>
              <CardDescription>
                If you choose Original Medicare, Medigap fills the gaps
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MedigapGuide />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="irmaa" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-orange-600" />
                IRMAA Surcharges
              </CardTitle>
              <CardDescription>
                High earners pay more. Know your brackets and plan accordingly.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <IRMAASurcharges
                isMarried={isMarried}
                estimatedMAGI={estimatedMAGI}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="working" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-blue-600" />
                Working Past 65
              </CardTitle>
              <CardDescription>
                Special rules if you have employer coverage at 65
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WorkingPast65
                hasEmployerCoverage={hasEmployerCoverage}
                employerSize={employerSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Your Medicare Enrollment Checklist
              </CardTitle>
              <CardDescription>
                What to do and when, based on your timeline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EnrollmentChecklist
                currentAge={currentAge}
                birthMonth={birthMonth}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        <p>
          This guide is for educational purposes only and does not constitute official Medicare guidance.
          For definitive information, visit <strong>medicare.gov</strong> or call 1-800-MEDICARE.
          Medicare rules and costs change annually. Consult a licensed insurance agent for personalized advice.
        </p>
      </div>
    </div>
  );
};

MedicareGuide.displayName = "MedicareGuide";

export default MedicareGuide;
