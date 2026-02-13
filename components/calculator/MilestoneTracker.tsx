"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { fmt } from "@/lib/utils";
import {
  Trophy,
  Target,
  Shield,
  Users,
  CheckCircle2,
  Circle,
  Sparkles,
  Share2,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Clock,
  DollarSign,
  Heart,
  Home,
  GraduationCap,
  Gem,
  Star,
  Rocket,
  Crown,
  Zap,
  ArrowRight,
} from "lucide-react";
import type { CalculationResult, ChartDataPoint } from "@/types/calculator";

// ==================== Types ====================

export type MilestoneCategory = "netWorth" | "timeBased" | "security" | "generational";

export type MilestoneStatus = "completed" | "inProgress" | "upcoming" | "locked";

export interface Milestone {
  id: string;
  category: MilestoneCategory;
  title: string;
  description: string;
  targetValue: number;
  currentValue?: number;
  targetAge?: number;
  projectedAge?: number;
  status: MilestoneStatus;
  icon: React.ReactNode;
  badgeIcon?: string;
  badgeName?: string;
  color: string;
  celebrationMessage?: string;
  shareMessage?: string;
}

export interface WhatIfScenario {
  description: string;
  monthlySavingsIncrease: number;
  yearsEarlier: number;
  targetMilestone: string;
}

interface MilestoneTrackerProps {
  result: CalculationResult | null;
  currentAge: number;
  retirementAge?: number;
  currentNetWorth: number;
  annualExpenses?: number;
  emergencyFund?: number;
  monthlyMortgage?: number;
  hasChildren?: boolean;
  numChildren?: number;
  className?: string;
}

// ==================== Constants ====================

const CATEGORY_CONFIG: Record<MilestoneCategory, { label: string; icon: React.ReactNode; color: string }> = {
  netWorth: { label: "Net Worth", icon: <DollarSign className="w-4 h-4" />, color: "emerald" },
  timeBased: { label: "Financial Independence", icon: <Target className="w-4 h-4" />, color: "blue" },
  security: { label: "Security", icon: <Shield className="w-4 h-4" />, color: "amber" },
  generational: { label: "Generational", icon: <Users className="w-4 h-4" />, color: "purple" },
};

// Net worth milestone thresholds
const NET_WORTH_MILESTONES = [
  { value: 100000, title: "Six-Figure Saver", badgeIcon: "star", description: "The hardest milestone - you've built real momentum!" },
  { value: 500000, title: "Half-Millionaire", badgeIcon: "rocket", description: "Halfway to the big one. Compound interest is accelerating." },
  { value: 1000000, title: "Millionaire", badgeIcon: "gem", description: "You've joined the two-comma club!" },
  { value: 2000000, title: "Double Millionaire", badgeIcon: "crown", description: "Wealth that grows itself." },
  { value: 5000000, title: "Multi-Millionaire", badgeIcon: "zap", description: "True financial freedom achieved." },
  { value: 10000000, title: "Decamillionaire", badgeIcon: "sparkles", description: "Top 1% wealth bracket." },
];

// FI multipliers (annual expenses)
const FI_MULTIPLIERS = {
  coastFI: 12.5, // ~8% withdrawal rate equivalent (can stop saving, growth handles it)
  leanFI: 20,    // 5% withdrawal rate (covers basics)
  fi: 25,        // 4% withdrawal rate (traditional FIRE)
  fatFI: 33,     // 3% withdrawal rate (more than enough)
};

// ==================== Helper Functions ====================

function getStatusBgColor(status: MilestoneStatus): string {
  switch (status) {
    case "completed": return "bg-emerald-500/10 border-emerald-500/30";
    case "inProgress": return "bg-blue-500/10 border-blue-500/30";
    case "upcoming": return "bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
    case "locked": return "bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800";
  }
}

function getBadgeIcon(iconName?: string): React.ReactNode {
  switch (iconName) {
    case "star": return <Star className="w-4 h-4" />;
    case "rocket": return <Rocket className="w-4 h-4" />;
    case "gem": return <Gem className="w-4 h-4" />;
    case "crown": return <Crown className="w-4 h-4" />;
    case "zap": return <Zap className="w-4 h-4" />;
    case "sparkles": return <Sparkles className="w-4 h-4" />;
    default: return <Trophy className="w-4 h-4" />;
  }
}

function findProjectedAge(data: ChartDataPoint[], targetValue: number): number | undefined {
  // Find the first year where balance exceeds target
  for (const point of data) {
    if (point.real >= targetValue) {
      return point.a1;
    }
  }
  return undefined;
}

function calculateYearsToMilestone(
  currentValue: number,
  targetValue: number,
  annualContribution: number,
  returnRate: number = 0.08
): number {
  if (currentValue >= targetValue) return 0;
  if (annualContribution <= 0) return Infinity;

  // Future value formula solved for n (years)
  // FV = PV(1+r)^n + PMT*((1+r)^n - 1)/r
  // Numerical approximation
  let years = 0;
  let balance = currentValue;
  while (balance < targetValue && years < 100) {
    balance = balance * (1 + returnRate) + annualContribution;
    years++;
  }
  return years;
}

// ==================== Confetti Animation Component ====================

const ConfettiAnimation: React.FC<{ isActive: boolean; onComplete: () => void }> = ({ isActive, onComplete }) => {
  useEffect(() => {
    if (isActive) {
      const timer = setTimeout(onComplete, 3000);
      return () => clearTimeout(timer);
    }
  }, [isActive, onComplete]);

  if (!isActive) return null;

  // Generate confetti pieces
  const pieces = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2 + Math.random() * 2,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'][Math.floor(Math.random() * 5)],
    rotation: Math.random() * 360,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute w-3 h-3 animate-confetti"
          style={{
            left: `${piece.left}%`,
            top: '-10px',
            backgroundColor: piece.color,
            animationDelay: `${piece.delay}s`,
            animationDuration: `${piece.duration}s`,
            transform: `rotate(${piece.rotation}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  );
};

// ==================== Milestone Card Component ====================

interface MilestoneCardProps {
  milestone: Milestone;
  onShare?: () => void;
  isCompact?: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  onShare,
  isCompact = false,
}) => {
  const progress = milestone.currentValue && milestone.targetValue
    ? Math.min((milestone.currentValue / milestone.targetValue) * 100, 100)
    : 0;

  const isComplete = milestone.status === "completed";
  const isInProgress = milestone.status === "inProgress";

  return (
    <div
      className={cn(
        "relative border rounded-xl p-4 transition-all duration-300",
        getStatusBgColor(milestone.status),
        isComplete && "ring-2 ring-emerald-500/50",
        isInProgress && "ring-2 ring-blue-500/50",
        !isCompact && "hover:shadow-lg hover:-translate-y-0.5"
      )}
    >
      {/* Completion glow effect */}
      {isComplete && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 via-emerald-500/10 to-emerald-500/5 animate-pulse" />
      )}

      <div className="relative flex items-start gap-3">
        {/* Status icon */}
        <div
          className={cn(
            "flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center",
            isComplete && "bg-emerald-500 text-white",
            isInProgress && "bg-blue-500/20 text-blue-500",
            !isComplete && !isInProgress && "bg-slate-200 dark:bg-slate-700 text-slate-400"
          )}
        >
          {isComplete ? (
            <CheckCircle2 className="w-5 h-5" />
          ) : (
            milestone.icon
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className={cn(
              "font-semibold text-sm",
              isComplete && "text-emerald-700 dark:text-emerald-400",
              isInProgress && "text-blue-700 dark:text-blue-400",
              !isComplete && !isInProgress && "text-slate-600 dark:text-slate-400"
            )}>
              {milestone.title}
            </h4>
            {milestone.badgeName && isComplete && (
              <Badge variant="secondary" className="text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300">
                {getBadgeIcon(milestone.badgeIcon)}
              </Badge>
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
            {milestone.description}
          </p>

          {/* Progress bar for in-progress milestones */}
          {isInProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{fmt(milestone.currentValue || 0)}</span>
                <span>{fmt(milestone.targetValue)}</span>
              </div>
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                {progress.toFixed(1)}% complete
              </p>
            </div>
          )}

          {/* Target/projected info */}
          {!isCompact && (
            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {fmt(milestone.targetValue)}
              </span>
              {milestone.projectedAge && !isComplete && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Age {milestone.projectedAge}
                </span>
              )}
              {milestone.targetAge && isComplete && (
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  Achieved at {milestone.targetAge}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {isComplete && !isCompact && (
          <div className="flex gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Share achievement</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Achievement Badge Component ====================

interface AchievementBadgeProps {
  milestone: Milestone;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  milestone,
  size = "md",
  onClick,
}) => {
  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-16 h-16",
    lg: "w-20 h-20",
  };

  const iconSizeClasses = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-9 h-9",
  };

  const isUnlocked = milestone.status === "completed";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "relative rounded-full flex items-center justify-center transition-all duration-300",
              sizeClasses[size],
              isUnlocked
                ? "bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 text-white shadow-lg hover:scale-110"
                : "bg-slate-200 dark:bg-slate-700 text-slate-400 cursor-default"
            )}
          >
            {/* Shine effect for unlocked badges */}
            {isUnlocked && (
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/30 to-transparent" />
            )}
            <span className={iconSizeClasses[size]}>
              {getBadgeIcon(milestone.badgeIcon)}
            </span>
            {/* Lock overlay for locked badges */}
            {!isUnlocked && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center bg-slate-900/20">
                <Circle className="w-3 h-3 text-slate-500" />
              </div>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">{milestone.badgeName || milestone.title}</p>
            <p className="text-xs text-muted-foreground">
              {isUnlocked ? "Unlocked!" : `Unlock at ${fmt(milestone.targetValue)}`}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

// ==================== What-If Projector Component ====================

interface WhatIfProjectorProps {
  nextMilestone: Milestone | null;
  currentNetWorth: number;
  currentMonthlySavings: number;
}

const WhatIfProjector: React.FC<WhatIfProjectorProps> = ({
  nextMilestone,
  currentNetWorth,
  currentMonthlySavings,
}) => {
  const scenarios = useMemo(() => {
    if (!nextMilestone) return [];

    const baseYears = calculateYearsToMilestone(
      currentNetWorth,
      nextMilestone.targetValue,
      currentMonthlySavings * 12
    );

    return [250, 500, 1000].map((increase) => {
      const newYears = calculateYearsToMilestone(
        currentNetWorth,
        nextMilestone.targetValue,
        (currentMonthlySavings + increase) * 12
      );
      return {
        increase,
        yearsEarlier: Math.max(0, baseYears - newYears),
        newYears,
      };
    }).filter(s => s.yearsEarlier > 0);
  }, [nextMilestone, currentNetWorth, currentMonthlySavings]);

  if (!nextMilestone || scenarios.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 border-blue-200 dark:border-blue-800">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          Accelerate Your Progress
        </CardTitle>
        <CardDescription>
          What if you increased your monthly savings?
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.increase}
            className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-blue-900"
          >
            <div>
              <p className="text-sm font-medium">
                +${scenario.increase}/month
              </p>
              <p className="text-xs text-muted-foreground">
                {fmt(scenario.increase * 12)}/year extra
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                {scenario.yearsEarlier} year{scenario.yearsEarlier !== 1 ? "s" : ""} earlier
              </p>
              <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                <ArrowRight className="w-3 h-3" />
                {nextMilestone.title}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

// ==================== Celebration Modal Component ====================

interface CelebrationModalProps {
  milestone: Milestone | null;
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
}

const CelebrationModal: React.FC<CelebrationModalProps> = ({
  milestone,
  isOpen,
  onClose,
  onShare,
}) => {
  if (!milestone) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center text-white animate-bounce">
            {getBadgeIcon(milestone.badgeIcon)}
          </div>
          <DialogTitle className="text-2xl">
            {milestone.celebrationMessage || `You've reached ${milestone.title}!`}
          </DialogTitle>
          <DialogDescription className="text-base mt-2">
            {milestone.description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
              {fmt(milestone.targetValue)}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Net worth milestone achieved
            </p>
          </div>
          <Badge className="bg-emerald-500 text-white text-sm px-4 py-1">
            Achievement Unlocked!
          </Badge>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Continue
          </Button>
          <Button onClick={onShare} className="flex-1 gap-2">
            <Share2 className="w-4 h-4" />
            Share Achievement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ==================== Main MilestoneTracker Component ====================

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = React.memo(({
  result,
  currentAge,
  currentNetWorth,
  annualExpenses = 60000,
  emergencyFund = 0,
  monthlyMortgage = 2000,
  hasChildren = false,
  numChildren = 0,
  className,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<MilestoneCategory | null>("netWorth");
  const [celebratingMilestone, setCelebratingMilestone] = useState<Milestone | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [previousMilestones, setPreviousMilestones] = useState<Set<string>>(new Set());

  // Calculate annual savings from result data
  const annualSavings = useMemo(() => {
    if (!result?.data || result.data.length < 2) return 50000;
    const firstYear = result.data[0];
    const secondYear = result.data[1];
    // Rough estimate: balance growth minus investment returns
    const growthRate = 0.08;
    const estimatedContribution = (secondYear.real - firstYear.real * (1 + growthRate));
    return Math.max(estimatedContribution, 20000);
  }, [result]);

  // Generate all milestones
  const milestones = useMemo((): Milestone[] => {
    const allMilestones: Milestone[] = [];
    const chartData = result?.data || [];

    // Net Worth Milestones
    NET_WORTH_MILESTONES.forEach((m, index) => {
      const isCompleted = currentNetWorth >= m.value;
      const isInProgress = !isCompleted && (index === 0 || currentNetWorth >= NET_WORTH_MILESTONES[index - 1].value);
      const projectedAge = !isCompleted ? findProjectedAge(chartData, m.value) : undefined;

      allMilestones.push({
        id: `nw-${m.value}`,
        category: "netWorth",
        title: m.title,
        description: m.description,
        targetValue: m.value,
        currentValue: isInProgress ? currentNetWorth : undefined,
        projectedAge,
        status: isCompleted ? "completed" : isInProgress ? "inProgress" : "upcoming",
        icon: <DollarSign className="w-5 h-5" />,
        badgeIcon: m.badgeIcon,
        badgeName: m.title,
        color: "emerald",
        celebrationMessage: `Congratulations! You're now a ${m.title}!`,
        shareMessage: `I just hit ${fmt(m.value)} in net worth! #FinancialMilestone`,
      });
    });

    // Time-Based / FI Milestones
    const fiTargets = [
      { key: "coastFI", mult: FI_MULTIPLIERS.coastFI, title: "Coast FI", description: "You can stop saving and still retire on time. Your investments will grow to cover retirement." },
      { key: "leanFI", mult: FI_MULTIPLIERS.leanFI, title: "Lean FI", description: "You could cover basic expenses now. Financial security achieved!" },
      { key: "fi", mult: FI_MULTIPLIERS.fi, title: "Financial Independence", description: "The 4% rule says you're free! You could retire today." },
      { key: "fatFI", mult: FI_MULTIPLIERS.fatFI, title: "Fat FI", description: "More than enough. Retire in style with margin for luxury." },
    ];

    fiTargets.forEach((fi) => {
      const targetValue = annualExpenses * fi.mult;
      const isCompleted = currentNetWorth >= targetValue;
      const isInProgress = !isCompleted && currentNetWorth >= targetValue * 0.5;
      const projectedAge = !isCompleted ? findProjectedAge(chartData, targetValue) : undefined;

      allMilestones.push({
        id: `fi-${fi.key}`,
        category: "timeBased",
        title: fi.title,
        description: fi.description,
        targetValue,
        currentValue: isInProgress ? currentNetWorth : undefined,
        projectedAge,
        status: isCompleted ? "completed" : isInProgress ? "inProgress" : "upcoming",
        icon: <Target className="w-5 h-5" />,
        badgeIcon: fi.key === "fi" ? "gem" : fi.key === "fatFI" ? "crown" : "star",
        badgeName: fi.title,
        color: "blue",
        celebrationMessage: `You've reached ${fi.title}!`,
        shareMessage: `I've achieved ${fi.title}! #FIRE #FinancialFreedom`,
      });
    });

    // Security Milestones
    const sixMonthsExpenses = annualExpenses * 0.5;
    const oneYearExpenses = annualExpenses;
    const healthcareTo65 = (65 - currentAge) * 15000; // ~$15k/year pre-Medicare
    const mortgagePayoff = monthlyMortgage * 12 * 15; // Rough estimate: 15 years of payments

    const securityTargets = [
      { id: "emergency-6m", value: sixMonthsExpenses, title: "6 Month Emergency Fund", description: "Financial cushion for unexpected events. Peace of mind secured.", icon: <Shield className="w-5 h-5" />, checkAgainst: emergencyFund },
      { id: "emergency-1y", value: oneYearExpenses, title: "1 Year Expenses Accessible", description: "A full year of expenses in accessible funds. Ultimate security buffer.", icon: <Shield className="w-5 h-5" />, checkAgainst: emergencyFund + currentNetWorth * 0.2 },
      { id: "healthcare", value: healthcareTo65, title: "Healthcare Covered to Medicare", description: "Pre-Medicare healthcare costs fully funded. Health security achieved.", icon: <Heart className="w-5 h-5" />, checkAgainst: currentNetWorth },
      { id: "mortgage", value: mortgagePayoff, title: "Mortgage Payoff Possible", description: "You could pay off your home today if you wanted. True ownership.", icon: <Home className="w-5 h-5" />, checkAgainst: currentNetWorth },
    ];

    securityTargets.forEach((sec) => {
      const isCompleted = sec.checkAgainst >= sec.value;
      const isInProgress = !isCompleted && sec.checkAgainst >= sec.value * 0.5;

      allMilestones.push({
        id: sec.id,
        category: "security",
        title: sec.title,
        description: sec.description,
        targetValue: sec.value,
        currentValue: isInProgress ? sec.checkAgainst : undefined,
        status: isCompleted ? "completed" : isInProgress ? "inProgress" : "upcoming",
        icon: sec.icon,
        badgeIcon: "shield",
        color: "amber",
      });
    });

    // Generational Milestones
    if (hasChildren || numChildren > 0) {
      const collegePerChild = 250000; // ~$250k per child for college
      const downPaymentPerChild = 100000; // ~$100k down payment help
      const totalCollegeFund = collegePerChild * (numChildren || 1);
      const totalDownPayments = downPaymentPerChild * (numChildren || 1);
      const legacyWealth = 2000000; // $2M+ for generational wealth

      const genTargets = [
        { id: "college", value: totalCollegeFund, title: "Kids' College Fully Funded", description: `${fmt(collegePerChild)} per child set aside for higher education.`, icon: <GraduationCap className="w-5 h-5" /> },
        { id: "downpayment", value: totalDownPayments, title: "Help with Down Payments", description: "Enough to help your children buy their first homes.", icon: <Home className="w-5 h-5" /> },
        { id: "legacy", value: legacyWealth, title: "Legacy Wealth Established", description: "Generational wealth that can change your family's future forever.", icon: <Users className="w-5 h-5" /> },
      ];

      genTargets.forEach((gen) => {
        const isCompleted = currentNetWorth >= gen.value;
        const isInProgress = !isCompleted && currentNetWorth >= gen.value * 0.3;
        const projectedAge = !isCompleted ? findProjectedAge(chartData, gen.value) : undefined;

        allMilestones.push({
          id: gen.id,
          category: "generational",
          title: gen.title,
          description: gen.description,
          targetValue: gen.value,
          currentValue: isInProgress ? currentNetWorth : undefined,
          projectedAge,
          status: isCompleted ? "completed" : isInProgress ? "inProgress" : "upcoming",
          icon: gen.icon,
          badgeIcon: "users",
          color: "purple",
        });
      });
    }

    return allMilestones;
  }, [result, currentNetWorth, annualExpenses, emergencyFund, monthlyMortgage, hasChildren, numChildren, currentAge]);

  // Check for newly completed milestones
  useEffect(() => {
    const completedIds = new Set(
      milestones
        .filter(m => m.status === "completed")
        .map(m => m.id)
    );

    // Find newly completed milestones
    completedIds.forEach(id => {
      if (!previousMilestones.has(id)) {
        const milestone = milestones.find(m => m.id === id);
        if (milestone && milestone.category === "netWorth") {
          setCelebratingMilestone(milestone);
          setShowConfetti(true);
        }
      }
    });

    setPreviousMilestones(completedIds);
  }, [milestones, previousMilestones]);

  // Group milestones by category
  const groupedMilestones = useMemo(() => {
    const groups: Record<MilestoneCategory, Milestone[]> = {
      netWorth: [],
      timeBased: [],
      security: [],
      generational: [],
    };

    milestones.forEach(m => {
      groups[m.category].push(m);
    });

    return groups;
  }, [milestones]);

  // Get current and next milestones for what-if
  const currentMilestone = milestones.find(m => m.status === "inProgress" && m.category === "netWorth");
  const nextMilestone = milestones.find(m => m.status === "upcoming" && m.category === "netWorth");

  // Get all unlocked badges
  const unlockedBadges = milestones.filter(m => m.status === "completed" && m.badgeName);

  // Share handler
  const handleShare = useCallback(async (milestone: Milestone) => {
    const text = milestone.shareMessage || `I just reached ${milestone.title}!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: milestone.title,
          text,
        });
      } catch {
        // User cancelled or error - no action needed
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(text);
      // Could show a toast here
    }
  }, []);

  // Category stats
  const getCategoryStats = (category: MilestoneCategory) => {
    const categoryMilestones = groupedMilestones[category];
    const completed = categoryMilestones.filter(m => m.status === "completed").length;
    const total = categoryMilestones.length;
    return { completed, total, percentage: total > 0 ? (completed / total) * 100 : 0 };
  };

  return (
    <>
      <ConfettiAnimation
        isActive={showConfetti}
        onComplete={() => setShowConfetti(false)}
      />

      <CelebrationModal
        milestone={celebratingMilestone}
        isOpen={celebratingMilestone !== null}
        onClose={() => setCelebratingMilestone(null)}
        onShare={() => {
          if (celebratingMilestone) handleShare(celebratingMilestone);
          setCelebratingMilestone(null);
        }}
      />

      <Card className={cn("overflow-hidden", className)}>
        <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Milestone Tracker
              </CardTitle>
              <CardDescription>
                Your financial journey, visualized as achievements
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{fmt(currentNetWorth)}</p>
              <p className="text-xs text-muted-foreground">Current Net Worth</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Achievement Badges Section */}
          {unlockedBadges.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Your Achievements ({unlockedBadges.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {unlockedBadges.map((badge) => (
                  <AchievementBadge
                    key={badge.id}
                    milestone={badge}
                    size="md"
                    onClick={() => handleShare(badge)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Category Sections */}
          <div className="space-y-4">
            {(Object.keys(CATEGORY_CONFIG) as MilestoneCategory[]).map((category) => {
              const config = CATEGORY_CONFIG[category];
              const categoryMilestones = groupedMilestones[category];
              const stats = getCategoryStats(category);
              const isExpanded = expandedCategory === category;

              if (categoryMilestones.length === 0) return null;

              return (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setExpandedCategory(isExpanded ? null : category)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center",
                        `bg-${config.color}-100 dark:bg-${config.color}-900 text-${config.color}-600 dark:text-${config.color}-400`
                      )}>
                        {config.icon}
                      </div>
                      <div className="text-left">
                        <h3 className="font-semibold text-sm">{config.label}</h3>
                        <p className="text-xs text-muted-foreground">
                          {stats.completed} of {stats.total} completed
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Progress value={stats.percentage} className="h-2" />
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="p-4 space-y-3 bg-white dark:bg-slate-950">
                      {categoryMilestones.map((milestone) => (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={milestone}
                          onShare={() => handleShare(milestone)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* What-If Projector */}
          <WhatIfProjector
            nextMilestone={nextMilestone || currentMilestone || null}
            currentNetWorth={currentNetWorth}
            currentMonthlySavings={annualSavings / 12}
          />

          {/* Next milestone preview */}
          {nextMilestone && (
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  {nextMilestone.icon}
                </div>
                <div>
                  <p className="text-sm font-medium">Next Goal: {nextMilestone.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmt(nextMilestone.targetValue - currentNetWorth)} to go
                    {nextMilestone.projectedAge && ` - projected at age ${nextMilestone.projectedAge}`}
                  </p>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
});

MilestoneTracker.displayName = "MilestoneTracker";

export default MilestoneTracker;
