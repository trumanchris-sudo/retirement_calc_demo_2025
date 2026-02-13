"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Clock,
  CalendarDays,
  DollarSign,
  Trophy,
  Share2,
  Sparkles,
  PartyPopper,
  Target,
  TrendingUp,
  Heart,
  Rocket,
  Sun,
  Moon,
  Timer,
  Gift,
  RefreshCw
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface RetirementCountdownProps {
  /** Current age of the user */
  currentAge: number;
  /** Target retirement age */
  retirementAge: number;
  /** Date of birth (optional, for more precise countdown) */
  dateOfBirth?: Date;
  /** User's pay frequency for paycheck countdown */
  payFrequency?: "weekly" | "biweekly" | "semimonthly" | "monthly";
  /** Career start age for progress calculation */
  careerStartAge?: number;
  /** Optional custom milestones */
  customMilestones?: Milestone[];
  /** Callback when share is clicked */
  onShare?: (shareData: ShareData) => void;
  /** Optional className for styling */
  className?: string;
}

interface TimeRemaining {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalDays: number;
  totalHours: number;
}

interface Milestone {
  id: string;
  label: string;
  description: string;
  yearsRemaining: number;
  icon: React.ReactNode;
  celebrationMessage: string;
  unlocked: boolean;
}

interface ShareData {
  text: string;
  yearsRemaining: number;
  progressPercent: number;
}

interface MotivationalMessage {
  message: string;
  icon: React.ReactNode;
  color: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const MOTIVATIONAL_MESSAGES: MotivationalMessage[] = [
  { message: "Every day brings you closer to financial freedom!", icon: <Rocket className="w-5 h-5" />, color: "text-blue-500" },
  { message: "Your future self will thank you for your dedication.", icon: <Heart className="w-5 h-5" />, color: "text-pink-500" },
  { message: "Stay the course - consistency is the key to success.", icon: <Target className="w-5 h-5" />, color: "text-green-500" },
  { message: "You're building a life of choices, not obligations.", icon: <Sun className="w-5 h-5" />, color: "text-yellow-500" },
  { message: "Financial independence is within your reach!", icon: <TrendingUp className="w-5 h-5" />, color: "text-emerald-500" },
  { message: "Dream big - your retirement goals are worth it.", icon: <Sparkles className="w-5 h-5" />, color: "text-purple-500" },
  { message: "Each paycheck invested is a step toward freedom.", icon: <DollarSign className="w-5 h-5" />, color: "text-green-500" },
  { message: "The journey of a thousand miles begins with a single step.", icon: <Trophy className="w-5 h-5" />, color: "text-amber-500" },
];

const PAY_PERIODS_PER_YEAR: Record<string, number> = {
  weekly: 52,
  biweekly: 26,
  semimonthly: 24,
  monthly: 12,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateTimeRemaining(targetDate: Date): TimeRemaining {
  const now = new Date();
  const diff = targetDate.getTime() - now.getTime();

  if (diff <= 0) {
    return {
      years: 0,
      months: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      totalDays: 0,
      totalHours: 0,
    };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const totalDays = Math.floor(totalHours / 24);

  // Calculate years, months, days more precisely
  const targetYear = targetDate.getFullYear();
  const targetMonth = targetDate.getMonth();
  const targetDay = targetDate.getDate();

  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();

  let years = targetYear - currentYear;
  let months = targetMonth - currentMonth;
  let days = targetDay - currentDay;

  if (days < 0) {
    months--;
    const lastMonth = new Date(targetYear, targetMonth, 0);
    days += lastMonth.getDate();
  }

  if (months < 0) {
    years--;
    months += 12;
  }

  const hours = Math.floor((totalHours % 24));
  const minutes = Math.floor((totalMinutes % 60));
  const seconds = Math.floor((totalSeconds % 60));

  return {
    years,
    months,
    days,
    hours,
    minutes,
    seconds,
    totalDays,
    totalHours,
  };
}

function getRetirementDate(currentAge: number, retirementAge: number, dateOfBirth?: Date): Date {
  if (dateOfBirth) {
    const retirementDate = new Date(dateOfBirth);
    retirementDate.setFullYear(retirementDate.getFullYear() + retirementAge);
    return retirementDate;
  }

  // Estimate based on current age
  const now = new Date();
  const yearsRemaining = retirementAge - currentAge;
  const retirementDate = new Date(now);
  retirementDate.setFullYear(retirementDate.getFullYear() + yearsRemaining);
  return retirementDate;
}

function calculatePaychecksRemaining(
  yearsRemaining: number,
  payFrequency: string
): number {
  const periodsPerYear = PAY_PERIODS_PER_YEAR[payFrequency] || 26;
  return Math.ceil(yearsRemaining * periodsPerYear);
}

function getProgressPercentage(
  currentAge: number,
  retirementAge: number,
  careerStartAge: number
): number {
  const totalCareerYears = retirementAge - careerStartAge;
  const yearsWorked = currentAge - careerStartAge;
  const progress = (yearsWorked / totalCareerYears) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

function generateMilestones(yearsRemaining: number): Milestone[] {
  const milestones: Milestone[] = [
    {
      id: "final-stretch",
      label: "Final Stretch",
      description: "Less than 1 year to go!",
      yearsRemaining: 1,
      icon: <Trophy className="w-5 h-5" />,
      celebrationMessage: "You're in the home stretch! Almost there!",
      unlocked: yearsRemaining <= 1,
    },
    {
      id: "countdown-begins",
      label: "Countdown Begins",
      description: "Less than 2 years remaining",
      yearsRemaining: 2,
      icon: <Timer className="w-5 h-5" />,
      celebrationMessage: "The countdown is getting real! 2 years or less!",
      unlocked: yearsRemaining <= 2,
    },
    {
      id: "five-year-mark",
      label: "5 Year Mark",
      description: "Half a decade to freedom",
      yearsRemaining: 5,
      icon: <Target className="w-5 h-5" />,
      celebrationMessage: "5 years out - time to fine-tune your plans!",
      unlocked: yearsRemaining <= 5,
    },
    {
      id: "decade-milestone",
      label: "Decade Milestone",
      description: "10 years until retirement",
      yearsRemaining: 10,
      icon: <CalendarDays className="w-5 h-5" />,
      celebrationMessage: "A decade to go - you're making great progress!",
      unlocked: yearsRemaining <= 10,
    },
    {
      id: "quarter-century",
      label: "Quarter Century",
      description: "25 years remaining",
      yearsRemaining: 25,
      icon: <Sparkles className="w-5 h-5" />,
      celebrationMessage: "25 years - your journey has begun!",
      unlocked: yearsRemaining <= 25,
    },
  ];

  return milestones.sort((a, b) => a.yearsRemaining - b.yearsRemaining);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface CountdownUnitProps {
  value: number;
  label: string;
  isHighlighted?: boolean;
  animationDelay?: number;
}

const CountdownUnit: React.FC<CountdownUnitProps> = ({
  value,
  label,
  isHighlighted = false,
  animationDelay = 0,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prevValue = React.useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 300);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div
      className={cn(
        "flex flex-col items-center p-2 sm:p-4 rounded-xl transition-all duration-500",
        isHighlighted
          ? "bg-gradient-to-br from-primary/20 via-primary/10 to-transparent border border-primary/30"
          : "bg-gradient-to-br from-muted/50 to-transparent border border-border/50"
      )}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div
        className={cn(
          "relative text-3xl sm:text-4xl md:text-5xl font-bold font-mono tabular-nums",
          "transition-all duration-300",
          isAnimating && "scale-110",
          isHighlighted ? "text-primary" : "text-foreground"
        )}
      >
        <span className={cn(
          "inline-block",
          isAnimating && "animate-pulse"
        )}>
          {value.toString().padStart(2, "0")}
        </span>
        {isHighlighted && (
          <div className="absolute -inset-2 bg-primary/10 blur-xl rounded-full -z-10" />
        )}
      </div>
      <span className="text-xs sm:text-sm text-muted-foreground mt-1 uppercase tracking-wider">
        {label}
      </span>
    </div>
  );
};

interface MilestoneCardProps {
  milestone: Milestone;
  isActive: boolean;
  showCelebration: boolean;
}

const MilestoneCard: React.FC<MilestoneCardProps> = ({
  milestone,
  isActive,
  showCelebration,
}) => {
  return (
    <div
      className={cn(
        "relative flex items-center gap-3 p-3 rounded-lg transition-all duration-500",
        milestone.unlocked
          ? "bg-gradient-to-r from-green-500/10 to-emerald-500/5 border border-green-500/30"
          : "bg-muted/30 border border-border/50 opacity-60",
        isActive && "ring-2 ring-primary ring-offset-2 ring-offset-background"
      )}
    >
      <div
        className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300",
          milestone.unlocked
            ? "bg-green-500/20 text-green-500"
            : "bg-muted text-muted-foreground"
        )}
      >
        {milestone.icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-semibold text-sm",
            milestone.unlocked ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
          )}>
            {milestone.label}
          </span>
          {milestone.unlocked && (
            <Badge variant="secondary" className="bg-green-500/20 text-green-600 dark:text-green-400 text-xs">
              Unlocked
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {milestone.description}
        </p>
      </div>
      {showCelebration && milestone.unlocked && (
        <div className="absolute -top-1 -right-1">
          <PartyPopper className="w-5 h-5 text-yellow-500 animate-bounce" />
        </div>
      )}
    </div>
  );
};

interface ViewToggleProps {
  view: "countdown" | "paychecks";
  onViewChange: (view: "countdown" | "paychecks") => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
      <button
        onClick={() => onViewChange("countdown")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          view === "countdown"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Clock className="w-4 h-4" />
        <span className="hidden sm:inline">Time</span>
      </button>
      <button
        onClick={() => onViewChange("paychecks")}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
          view === "paychecks"
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <DollarSign className="w-4 h-4" />
        <span className="hidden sm:inline">Paychecks</span>
      </button>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const RetirementCountdown: React.FC<RetirementCountdownProps> = ({
  currentAge,
  retirementAge,
  dateOfBirth,
  payFrequency = "biweekly",
  careerStartAge = 22,
  customMilestones,
  onShare,
  className,
}) => {
  const [view, setView] = useState<"countdown" | "paychecks">("countdown");
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [motivationalIndex, setMotivationalIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // Calculate retirement date
  const retirementDate = useMemo(
    () => getRetirementDate(currentAge, retirementAge, dateOfBirth),
    [currentAge, retirementAge, dateOfBirth]
  );

  // Calculate years remaining for milestones
  const yearsRemaining = retirementAge - currentAge;

  // Generate milestones
  const milestones = useMemo(
    () => customMilestones || generateMilestones(yearsRemaining),
    [customMilestones, yearsRemaining]
  );

  // Calculate progress percentage
  const progressPercent = useMemo(
    () => getProgressPercentage(currentAge, retirementAge, careerStartAge),
    [currentAge, retirementAge, careerStartAge]
  );

  // Calculate paychecks remaining
  const paychecksRemaining = useMemo(
    () => calculatePaychecksRemaining(yearsRemaining, payFrequency),
    [yearsRemaining, payFrequency]
  );

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Real-time countdown update
  useEffect(() => {
    if (!isClient) return;

    const updateCountdown = () => {
      setTimeRemaining(calculateTimeRemaining(retirementDate));
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [retirementDate, isClient]);

  // Rotate motivational messages
  useEffect(() => {
    if (!isClient) return;

    const interval = setInterval(() => {
      setMotivationalIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
    }, 10000); // Change every 10 seconds

    return () => clearInterval(interval);
  }, [isClient]);

  // Celebration effect for unlocked milestones
  useEffect(() => {
    const unlockedCount = milestones.filter((m) => m.unlocked).length;
    if (unlockedCount > 0) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [milestones]);

  // Share functionality
  const handleShare = useCallback(async () => {
    const shareText = `I'm ${yearsRemaining.toFixed(1)} years away from retirement! ${Math.round(progressPercent)}% of my career journey complete. #RetirementGoals #FinancialFreedom`;

    const shareData: ShareData = {
      text: shareText,
      yearsRemaining,
      progressPercent,
    };

    if (onShare) {
      onShare(shareData);
    } else if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "My Retirement Countdown",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed - copy to clipboard instead
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(shareText);
        }
      }
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareText);
    }
  }, [yearsRemaining, progressPercent, onShare]);

  // Refresh motivational message
  const refreshMessage = useCallback(() => {
    setMotivationalIndex((prev) => (prev + 1) % MOTIVATIONAL_MESSAGES.length);
  }, []);

  const currentMessage = MOTIVATIONAL_MESSAGES[motivationalIndex];

  // Check if already retired
  const isRetired = yearsRemaining <= 0;

  if (!isClient) {
    // Server-side render placeholder
    return (
      <Card className={cn("overflow-hidden", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Retirement Countdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-24 bg-muted rounded-lg" />
            <div className="h-4 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRetired) {
    return (
      <Card className={cn("overflow-hidden", className)}>
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent" />
        <CardHeader className="relative">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <PartyPopper className="w-16 h-16 text-yellow-500 animate-bounce" />
              <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-purple-500 animate-pulse" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl sm:text-3xl bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
            Congratulations!
          </CardTitle>
          <CardDescription className="text-center text-lg">
            You have reached retirement age!
          </CardDescription>
        </CardHeader>
        <CardContent className="relative text-center space-y-4">
          <p className="text-muted-foreground">
            Welcome to the next chapter of your life. You've earned this!
          </p>
          <div className="flex justify-center">
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white text-lg px-4 py-2">
              <Trophy className="w-5 h-5 mr-2" />
              Retired
            </Badge>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("overflow-hidden relative", className)}>
      {/* Background gradient effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <CardHeader className="relative pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Retirement Countdown
            </CardTitle>
            <CardDescription>
              {retirementDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <ViewToggle view={view} onViewChange={setView} />
            <Button
              variant="outline"
              size="icon"
              onClick={handleShare}
              className="shrink-0"
              title="Share your countdown"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-6">
        {/* Main Countdown Display */}
        {view === "countdown" ? (
          <div className="space-y-4">
            {/* Large countdown units */}
            <div className="grid grid-cols-4 gap-2 sm:gap-4">
              <CountdownUnit
                value={timeRemaining?.years ?? 0}
                label="Years"
                isHighlighted={true}
                animationDelay={0}
              />
              <CountdownUnit
                value={timeRemaining?.months ?? 0}
                label="Months"
                animationDelay={100}
              />
              <CountdownUnit
                value={timeRemaining?.days ?? 0}
                label="Days"
                animationDelay={200}
              />
              <CountdownUnit
                value={timeRemaining?.hours ?? 0}
                label="Hours"
                animationDelay={300}
              />
            </div>

            {/* Live seconds ticker */}
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg tabular-nums">
                  {timeRemaining?.minutes.toString().padStart(2, "0") ?? "00"}
                </span>
                <span className="text-xs uppercase">min</span>
              </div>
              <span className="text-xl animate-pulse">:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg tabular-nums text-primary animate-pulse">
                  {timeRemaining?.seconds.toString().padStart(2, "0") ?? "00"}
                </span>
                <span className="text-xs uppercase">sec</span>
              </div>
            </div>

            {/* Total days counter */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-muted/50 rounded-full">
                <CalendarDays className="w-4 h-4 text-muted-foreground" />
                <span className="font-mono text-sm">
                  {(timeRemaining?.totalDays ?? 0).toLocaleString()} total days
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Paychecks View */
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="relative inline-block">
                <DollarSign className="absolute -left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-green-500" />
                <span className="text-5xl sm:text-6xl md:text-7xl font-bold font-mono tabular-nums bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent">
                  {paychecksRemaining.toLocaleString()}
                </span>
              </div>
              <p className="text-lg text-muted-foreground">
                paychecks until retirement
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="text-sm">
                {payFrequency === "weekly" && "Weekly pay"}
                {payFrequency === "biweekly" && "Bi-weekly pay"}
                {payFrequency === "semimonthly" && "Semi-monthly pay"}
                {payFrequency === "monthly" && "Monthly pay"}
              </Badge>
              <Badge variant="secondary" className="text-sm">
                ~{Math.round(paychecksRemaining / 12)} more years of work
              </Badge>
            </div>

            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <Gift className="inline w-4 h-4 mr-1 text-primary" />
                Each paycheck is an opportunity to invest in your future
              </p>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Career Progress</span>
            <span className="font-semibold text-primary">
              {progressPercent.toFixed(1)}% complete
            </span>
          </div>
          <div className="relative">
            <Progress value={progressPercent} className="h-3" />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg border-2 border-background transition-all duration-500"
              style={{ left: `calc(${progressPercent}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Age {careerStartAge}</span>
            <span>Age {currentAge} (Now)</span>
            <span>Age {retirementAge}</span>
          </div>
        </div>

        {/* Milestones */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            Milestones
          </h4>
          <div className="grid gap-2">
            {milestones.slice(0, 3).map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                isActive={
                  milestone.unlocked &&
                  !milestones.find(
                    (m) => m.unlocked && m.yearsRemaining < milestone.yearsRemaining
                  )
                }
                showCelebration={showCelebration}
              />
            ))}
          </div>
        </div>

        {/* Motivational Message */}
        <div className="relative p-4 bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50 rounded-lg border border-border/50 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent animate-smart-shimmer-slow" />
          <div className="relative flex items-center gap-3">
            <div className={cn("shrink-0", currentMessage.color)}>
              {currentMessage.icon}
            </div>
            <p className="text-sm font-medium flex-1">{currentMessage.message}</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={refreshMessage}
              className="shrink-0 h-8 w-8"
              title="Next message"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Time of Day Message */}
        <div className="text-center text-xs text-muted-foreground">
          {new Date().getHours() < 12 ? (
            <span className="flex items-center justify-center gap-1">
              <Sun className="w-3 h-3 text-yellow-500" />
              Good morning! Another day closer to your dreams.
            </span>
          ) : new Date().getHours() < 18 ? (
            <span className="flex items-center justify-center gap-1">
              <Sun className="w-3 h-3 text-orange-500" />
              Keep up the great work this afternoon!
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1">
              <Moon className="w-3 h-3 text-indigo-500" />
              Rest well - tomorrow brings you closer to retirement.
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RetirementCountdown;
