'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt, fmtPercent } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Home,
  GraduationCap,
  Palmtree,
  Briefcase,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  ArrowUpDown,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Info,
  Zap,
} from 'lucide-react';

// Dynamic import for framer-motion
const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type GoalType = 'retirement' | 'house' | 'college' | 'sabbatical';

export type GoalStatus = 'on_track' | 'at_risk' | 'off_track' | 'achieved';

export interface Milestone {
  id: string;
  label: string;
  targetAmount: number;
  targetDate?: Date;
  isCompleted: boolean;
}

export interface Goal {
  id: string;
  type: GoalType;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: Date;
  priority: number; // 1 = highest priority
  milestones: Milestone[];
  monthlyContribution?: number;
  projectedGrowthRate?: number; // as decimal e.g., 0.07 for 7%
  isActive: boolean;
  createdAt: Date;
}

export interface GoalTradeOff {
  goalId: string;
  impactedGoalId: string;
  impactType: 'positive' | 'negative';
  impactDescription: string;
  impactAmount?: number;
  impactMonths?: number;
}

interface GoalDashboardProps {
  goals: Goal[];
  tradeOffs?: GoalTradeOff[];
  onGoalClick?: (goal: Goal) => void;
  onPriorityChange?: (goalId: string, newPriority: number) => void;
  onGoalUpdate?: (goal: Goal) => void;
  className?: string;
  showTradeOffs?: boolean;
}

// ============================================================================
// CONSTANTS & UTILITIES
// ============================================================================

const GOAL_CONFIG: Record<GoalType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
  retirement: {
    icon: Palmtree,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
  },
  house: {
    icon: Home,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
  },
  college: {
    icon: GraduationCap,
    color: 'text-purple-600 dark:text-purple-400',
    bgColor: 'bg-purple-100 dark:bg-purple-900/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
  },
  sabbatical: {
    icon: Briefcase,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
  },
};

const STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  on_track: {
    label: 'On Track',
    color: 'text-emerald-700 dark:text-emerald-400',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    icon: TrendingUp,
  },
  at_risk: {
    label: 'At Risk',
    color: 'text-amber-700 dark:text-amber-400',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    icon: AlertTriangle,
  },
  off_track: {
    label: 'Off Track',
    color: 'text-red-700 dark:text-red-400',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    icon: TrendingDown,
  },
  achieved: {
    label: 'Achieved',
    color: 'text-blue-700 dark:text-blue-400',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    icon: CheckCircle2,
  },
};

function calculateGoalStatus(goal: Goal): GoalStatus {
  const progressPercent = (goal.currentAmount / goal.targetAmount) * 100;

  // Goal achieved
  if (progressPercent >= 100) {
    return 'achieved';
  }

  // Calculate expected progress based on time
  const now = new Date();
  const created = goal.createdAt;
  const target = goal.targetDate;

  const totalDuration = target.getTime() - created.getTime();
  const elapsed = now.getTime() - created.getTime();
  const timeProgress = Math.min(100, (elapsed / totalDuration) * 100);

  // Compare actual progress to expected progress
  const progressDelta = progressPercent - timeProgress;

  if (progressDelta >= -5) {
    return 'on_track';
  } else if (progressDelta >= -20) {
    return 'at_risk';
  } else {
    return 'off_track';
  }
}

function calculateProjectedCompletion(goal: Goal): Date | null {
  if (!goal.monthlyContribution || goal.monthlyContribution <= 0) {
    return null;
  }

  const remaining = goal.targetAmount - goal.currentAmount;
  if (remaining <= 0) return new Date();

  const growthRate = goal.projectedGrowthRate || 0.07;
  const monthlyRate = growthRate / 12;

  // Using future value of annuity formula, solve for n (months)
  // FV = PMT * ((1 + r)^n - 1) / r + PV * (1 + r)^n
  // This is an approximation
  let months = 0;
  let currentValue = goal.currentAmount;
  const maxMonths = 600; // 50 years max

  while (currentValue < goal.targetAmount && months < maxMonths) {
    currentValue = currentValue * (1 + monthlyRate) + goal.monthlyContribution;
    months++;
  }

  const projectedDate = new Date();
  projectedDate.setMonth(projectedDate.getMonth() + months);
  return projectedDate;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function monthsUntil(date: Date): number {
  const now = new Date();
  const months = (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
  return Math.max(0, months);
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface ConfettiParticle {
  id: number;
  x: number;
  delay: number;
  duration: number;
  color: string;
}

function CelebrationAnimation({ isVisible, onComplete }: { isVisible: boolean; onComplete?: () => void }) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  useEffect(() => {
    if (isVisible) {
      const colors = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
      const newParticles: ConfettiParticle[] = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
        duration: 1 + Math.random() * 1,
        color: colors[Math.floor(Math.random() * colors.length)],
      }));
      setParticles(newParticles);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  if (!isVisible || particles.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((particle) => (
        <MotionDiv
          key={particle.id}
          initial={{ y: -20, x: `${particle.x}%`, opacity: 1, rotate: 0 }}
          animate={{
            y: '100%',
            opacity: 0,
            rotate: Math.random() > 0.5 ? 360 : -360
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            ease: 'easeOut'
          }}
          className="absolute w-3 h-3 rounded-sm"
          style={{ backgroundColor: particle.color }}
        />
      ))}
      <MotionDiv
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 1] }}
        transition={{ duration: 0.5, times: [0, 0.6, 1] }}
        className="absolute inset-0 flex items-center justify-center"
      >
        <div className="text-6xl">&#127881;</div>
      </MotionDiv>
    </div>
  );
}

interface MilestoneProgressProps {
  milestones: Milestone[];
  currentAmount: number;
  targetAmount: number;
}

function MilestoneProgress({ milestones, currentAmount, targetAmount }: MilestoneProgressProps) {
  const sortedMilestones = useMemo(() =>
    [...milestones].sort((a, b) => a.targetAmount - b.targetAmount),
    [milestones]
  );

  return (
    <div className="relative mt-4">
      {/* Progress track */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden">
        <MotionDiv
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-primary/80 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(100, (currentAmount / targetAmount) * 100)}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      {/* Milestone markers */}
      <div className="relative h-6 mt-1">
        {sortedMilestones.map((milestone) => {
          const position = (milestone.targetAmount / targetAmount) * 100;
          const isReached = currentAmount >= milestone.targetAmount;

          return (
            <TooltipProvider key={milestone.id} delayDuration={100}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute -translate-x-1/2 flex flex-col items-center cursor-pointer"
                    style={{ left: `${Math.min(98, position)}%` }}
                  >
                    <div
                      className={cn(
                        'w-3 h-3 rounded-full border-2 transition-all duration-300',
                        isReached
                          ? 'bg-primary border-primary scale-110'
                          : 'bg-background border-muted-foreground/40'
                      )}
                    />
                    <span className="text-[10px] text-muted-foreground mt-0.5 whitespace-nowrap">
                      {fmt(milestone.targetAmount)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <div className="text-center">
                    <p className="font-medium">{milestone.label}</p>
                    <p className="text-sm text-muted-foreground">{fmt(milestone.targetAmount)}</p>
                    {isReached && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                        Completed!
                      </p>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        })}
      </div>
    </div>
  );
}

interface GoalCardProps {
  goal: Goal;
  onClick?: () => void;
  showCelebration?: boolean;
  onCelebrationComplete?: () => void;
  isDragging?: boolean;
}

function GoalCard({ goal, onClick, showCelebration, onCelebrationComplete, isDragging }: GoalCardProps) {
  const config = GOAL_CONFIG[goal.type];
  const status = calculateGoalStatus(goal);
  const statusConfig = STATUS_CONFIG[status];
  const StatusIcon = statusConfig.icon;
  const GoalIcon = config.icon;

  const progressPercent = Math.min(100, (goal.currentAmount / goal.targetAmount) * 100);
  const projectedCompletion = calculateProjectedCompletion(goal);
  const monthsRemaining = monthsUntil(goal.targetDate);

  return (
    <MotionDiv
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isDragging ? 1.02 : 1,
        boxShadow: isDragging ? '0 10px 40px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.1)'
      }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
      className={cn(
        'relative overflow-hidden',
        isDragging && 'z-50'
      )}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          config.borderColor,
          status === 'achieved' && 'ring-2 ring-emerald-500/50'
        )}
        onClick={onClick}
      >
        {showCelebration && (
          <CelebrationAnimation isVisible={showCelebration} onComplete={onCelebrationComplete} />
        )}

        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', config.bgColor)}>
                <GoalIcon className={cn('w-5 h-5', config.color)} />
              </div>
              <div>
                <CardTitle className="text-lg">{goal.name}</CardTitle>
                {goal.description && (
                  <CardDescription className="mt-0.5">{goal.description}</CardDescription>
                )}
              </div>
            </div>
            <Badge className={cn('flex items-center gap-1', statusConfig.bgColor, statusConfig.color, 'border-0')}>
              <StatusIcon className="w-3 h-3" />
              {statusConfig.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {/* Amount progress */}
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-2xl font-bold">{fmt(goal.currentAmount)}</span>
            <span className="text-muted-foreground">of {fmt(goal.targetAmount)}</span>
          </div>

          {/* Progress bar with milestones */}
          <MilestoneProgress
            milestones={goal.milestones}
            currentAmount={goal.currentAmount}
            targetAmount={goal.targetAmount}
          />

          {/* Stats row */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{fmtPercent(progressPercent / 100, 0)} complete</span>
            </div>
            <div>
              {status === 'achieved' ? (
                <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                  Goal Achieved!
                </span>
              ) : (
                <span>
                  {monthsRemaining} months to target
                </span>
              )}
            </div>
          </div>

          {/* Projected completion */}
          {projectedCompletion && status !== 'achieved' && (
            <div className="mt-2 pt-2 border-t text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Projected completion:</span>
                <span className={cn(
                  'font-medium',
                  projectedCompletion <= goal.targetDate
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}>
                  {formatDate(projectedCompletion)}
                </span>
              </div>
            </div>
          )}
        </CardContent>

        {/* Priority indicator */}
        <div className="absolute top-2 right-2">
          <TooltipProvider delayDuration={100}>
            <Tooltip>
              <TooltipTrigger>
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                  goal.priority === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {goal.priority}
                </div>
              </TooltipTrigger>
              <TooltipContent>Priority {goal.priority}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </Card>
    </MotionDiv>
  );
}

interface TradeOffVisualizationProps {
  goals: Goal[];
  tradeOffs: GoalTradeOff[];
}

function TradeOffVisualization({ goals, tradeOffs }: TradeOffVisualizationProps) {
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null);

  const goalMap = useMemo(() =>
    new Map(goals.map(g => [g.id, g])),
    [goals]
  );

  const tradeOffsByGoal = useMemo(() => {
    const map = new Map<string, GoalTradeOff[]>();
    tradeOffs.forEach(to => {
      const existing = map.get(to.goalId) || [];
      existing.push(to);
      map.set(to.goalId, existing);
    });
    return map;
  }, [tradeOffs]);

  if (tradeOffs.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-500" />
          <CardTitle className="text-lg">Goal Trade-offs</CardTitle>
        </div>
        <CardDescription>
          See how prioritizing one goal affects your progress on others
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {goals.map(goal => {
          const goalTradeOffs = tradeOffsByGoal.get(goal.id) || [];
          if (goalTradeOffs.length === 0) return null;

          const isExpanded = expandedGoal === goal.id;
          const GoalIcon = GOAL_CONFIG[goal.type].icon;

          return (
            <div key={goal.id} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <GoalIcon className={cn('w-4 h-4', GOAL_CONFIG[goal.type].color)} />
                  <span className="font-medium">{goal.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {goalTradeOffs.length} trade-off{goalTradeOffs.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <MotionDiv
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t bg-muted/30"
                >
                  <div className="p-3 space-y-2">
                    {goalTradeOffs.map((tradeOff, idx) => {
                      const impactedGoal = goalMap.get(tradeOff.impactedGoalId);
                      if (!impactedGoal) return null;

                      const ImpactedIcon = GOAL_CONFIG[impactedGoal.type].icon;

                      return (
                        <div
                          key={idx}
                          className={cn(
                            'flex items-start gap-3 p-2 rounded-lg',
                            tradeOff.impactType === 'positive'
                              ? 'bg-emerald-50 dark:bg-emerald-950/20'
                              : 'bg-red-50 dark:bg-red-950/20'
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 p-1 rounded',
                            tradeOff.impactType === 'positive'
                              ? 'bg-emerald-100 dark:bg-emerald-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          )}>
                            {tradeOff.impactType === 'positive' ? (
                              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-sm font-medium">
                              <span className={tradeOff.impactType === 'positive' ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                                {tradeOff.impactType === 'positive' ? 'Helps' : 'Delays'}
                              </span>
                              <ImpactedIcon className={cn('w-4 h-4', GOAL_CONFIG[impactedGoal.type].color)} />
                              <span>{impactedGoal.name}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                              {tradeOff.impactDescription}
                            </p>
                            {(tradeOff.impactAmount || tradeOff.impactMonths) && (
                              <div className="flex gap-3 mt-1 text-xs">
                                {tradeOff.impactAmount && (
                                  <span className={tradeOff.impactType === 'positive' ? 'text-emerald-600' : 'text-red-600'}>
                                    {tradeOff.impactType === 'positive' ? '+' : '-'}{fmt(Math.abs(tradeOff.impactAmount))}
                                  </span>
                                )}
                                {tradeOff.impactMonths && (
                                  <span className={tradeOff.impactType === 'positive' ? 'text-emerald-600' : 'text-red-600'}>
                                    {tradeOff.impactType === 'positive' ? '-' : '+'}{Math.abs(tradeOff.impactMonths)} months
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </MotionDiv>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

interface GoalSummaryProps {
  goals: Goal[];
}

function GoalSummary({ goals }: GoalSummaryProps) {
  const stats = useMemo(() => {
    const activeGoals = goals.filter(g => g.isActive);
    const achieved = activeGoals.filter(g => calculateGoalStatus(g) === 'achieved').length;
    const onTrack = activeGoals.filter(g => calculateGoalStatus(g) === 'on_track').length;
    const atRisk = activeGoals.filter(g => calculateGoalStatus(g) === 'at_risk').length;
    const offTrack = activeGoals.filter(g => calculateGoalStatus(g) === 'off_track').length;

    const totalTarget = activeGoals.reduce((sum, g) => sum + g.targetAmount, 0);
    const totalCurrent = activeGoals.reduce((sum, g) => sum + g.currentAmount, 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

    return { achieved, onTrack, atRisk, offTrack, totalTarget, totalCurrent, overallProgress, total: activeGoals.length };
  }, [goals]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Goals Overview</CardTitle>
          <Badge variant="outline" className="font-mono">
            {stats.total} active
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Overall progress */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Total Progress</span>
              <span className="font-medium">{fmt(stats.totalCurrent)} / {fmt(stats.totalTarget)}</span>
            </div>
            <Progress value={stats.overallProgress} className="h-2" />
          </div>

          {/* Status breakdown */}
          <div className="grid grid-cols-2 gap-3">
            {stats.achieved > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm">{stats.achieved} achieved</span>
              </div>
            )}
            {stats.onTrack > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm">{stats.onTrack} on track</span>
              </div>
            )}
            {stats.atRisk > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm">{stats.atRisk} at risk</span>
              </div>
            )}
            {stats.offTrack > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                <TrendingDown className="w-4 h-4 text-red-600 dark:text-red-400" />
                <span className="text-sm">{stats.offTrack} off track</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function GoalDashboard({
  goals,
  tradeOffs = [],
  onGoalClick,
  onPriorityChange,
  onGoalUpdate,
  className,
  showTradeOffs = true,
}: GoalDashboardProps) {
  const [celebratingGoalId, setCelebratingGoalId] = useState<string | null>(null);
  const [previousGoalStates, setPreviousGoalStates] = useState<Map<string, boolean>>(new Map());

  // Sort goals by priority
  const sortedGoals = useMemo(() =>
    [...goals].filter(g => g.isActive).sort((a, b) => a.priority - b.priority),
    [goals]
  );

  // Check for newly achieved goals
  useEffect(() => {
    const currentStates = new Map<string, boolean>();

    goals.forEach(goal => {
      const isAchieved = calculateGoalStatus(goal) === 'achieved';
      currentStates.set(goal.id, isAchieved);

      // Check if this goal just became achieved
      const wasAchieved = previousGoalStates.get(goal.id);
      if (isAchieved && wasAchieved === false) {
        setCelebratingGoalId(goal.id);
      }
    });

    setPreviousGoalStates(currentStates);
  }, [goals]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCelebrationComplete = useCallback(() => {
    setCelebratingGoalId(null);
  }, []);

  if (goals.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Target className="w-12 h-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No Goals Yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1 text-center max-w-sm">
            Create your first financial goal to start tracking your progress toward a secure future.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Summary section */}
      <GoalSummary goals={goals} />

      {/* Goal cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedGoals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            onClick={() => onGoalClick?.(goal)}
            showCelebration={celebratingGoalId === goal.id}
            onCelebrationComplete={handleCelebrationComplete}
          />
        ))}
      </div>

      {/* Trade-off visualization */}
      {showTradeOffs && tradeOffs.length > 0 && (
        <TradeOffVisualization goals={goals} tradeOffs={tradeOffs} />
      )}

      {/* Prioritization tip */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="flex items-start gap-3 py-4">
          <Info className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Goal Prioritization</p>
            <p className="mt-1">
              Goals are ordered by priority. Higher priority goals (lower numbers) receive funding first.
              Consider your timeline and trade-offs when setting priorities.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// DEMO DATA FOR DEVELOPMENT
// ============================================================================

export const DEMO_GOALS: Goal[] = [
  {
    id: 'retirement-1',
    type: 'retirement',
    name: 'Retirement Fund',
    description: 'Primary retirement savings goal',
    targetAmount: 2000000,
    currentAmount: 450000,
    targetDate: new Date(2045, 11, 31),
    priority: 1,
    monthlyContribution: 2500,
    projectedGrowthRate: 0.07,
    isActive: true,
    createdAt: new Date(2020, 0, 1),
    milestones: [
      { id: 'm1', label: 'Emergency Fund', targetAmount: 100000, isCompleted: true },
      { id: 'm2', label: 'Quarter Way', targetAmount: 500000, isCompleted: false },
      { id: 'm3', label: 'Halfway', targetAmount: 1000000, isCompleted: false },
      { id: 'm4', label: 'Almost There', targetAmount: 1500000, isCompleted: false },
    ],
  },
  {
    id: 'house-1',
    type: 'house',
    name: 'Home Down Payment',
    description: '20% down on a $600K home',
    targetAmount: 120000,
    currentAmount: 85000,
    targetDate: new Date(2026, 5, 30),
    priority: 2,
    monthlyContribution: 2000,
    projectedGrowthRate: 0.04,
    isActive: true,
    createdAt: new Date(2023, 0, 1),
    milestones: [
      { id: 'm1', label: '25%', targetAmount: 30000, isCompleted: true },
      { id: 'm2', label: '50%', targetAmount: 60000, isCompleted: true },
      { id: 'm3', label: '75%', targetAmount: 90000, isCompleted: false },
    ],
  },
  {
    id: 'college-1',
    type: 'college',
    name: "Child's College Fund",
    description: '529 plan for higher education',
    targetAmount: 200000,
    currentAmount: 45000,
    targetDate: new Date(2038, 7, 31),
    priority: 3,
    monthlyContribution: 500,
    projectedGrowthRate: 0.06,
    isActive: true,
    createdAt: new Date(2021, 8, 1),
    milestones: [
      { id: 'm1', label: 'Year 1', targetAmount: 50000, isCompleted: false },
      { id: 'm2', label: 'Year 2', targetAmount: 100000, isCompleted: false },
      { id: 'm3', label: 'Year 3', targetAmount: 150000, isCompleted: false },
    ],
  },
  {
    id: 'sabbatical-1',
    type: 'sabbatical',
    name: '6-Month Sabbatical',
    description: 'Career break for travel and learning',
    targetAmount: 50000,
    currentAmount: 12000,
    targetDate: new Date(2028, 3, 1),
    priority: 4,
    monthlyContribution: 400,
    projectedGrowthRate: 0.03,
    isActive: true,
    createdAt: new Date(2024, 0, 1),
    milestones: [
      { id: 'm1', label: '1 Month', targetAmount: 8000, isCompleted: true },
      { id: 'm2', label: '3 Months', targetAmount: 25000, isCompleted: false },
      { id: 'm3', label: '6 Months', targetAmount: 50000, isCompleted: false },
    ],
  },
];

export const DEMO_TRADEOFFS: GoalTradeOff[] = [
  {
    goalId: 'house-1',
    impactedGoalId: 'retirement-1',
    impactType: 'negative',
    impactDescription: 'Increasing house savings by $500/mo reduces retirement contributions',
    impactAmount: -500,
    impactMonths: 0,
  },
  {
    goalId: 'house-1',
    impactedGoalId: 'sabbatical-1',
    impactType: 'negative',
    impactDescription: 'Prioritizing house delays sabbatical timeline',
    impactMonths: 8,
  },
  {
    goalId: 'retirement-1',
    impactedGoalId: 'college-1',
    impactType: 'positive',
    impactDescription: 'Tax-advantaged retirement savings may qualify for education credits',
    impactAmount: 2000,
  },
];

export default GoalDashboard;
