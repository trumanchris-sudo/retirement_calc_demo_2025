'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { usePlanConfig } from '@/lib/plan-config-context';
import { createDefaultPlanConfig } from '@/types/plan-config';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  CheckCircle2,
  AlertCircle,
  Printer,
  Mail,
  Save,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Download,
  Upload,
  Trash2,
  History,
  PiggyBank,
  Shield,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import { fmt, fmtFull } from '@/lib/utils';

// ==================== Types ====================

interface AccountBalances {
  taxable: number;
  pretax: number;
  roth: number;
  other?: number;
}

interface AnnualContributions {
  taxable: number;
  pretax401k: number;
  rothIRA: number;
  employerMatch: number;
  hsa?: number;
}

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  category: 'contributions' | 'accounts' | 'planning' | 'protection';
}

interface KeyQuestion {
  id: string;
  question: string;
  answer: string;
  type: 'text' | 'yesno' | 'select';
  options?: string[];
}

interface YearlySnapshot {
  year: number;
  date: string;
  balances: AccountBalances;
  contributions: AnnualContributions;
  netWorth: number;
  investmentReturns: number;
  checklist: ChecklistItem[];
  keyQuestions: KeyQuestion[];
  notes: string;
  projectedRetirementAge: number;
  onTrack: boolean;
}

interface AnnualCheckupData {
  snapshots: YearlySnapshot[];
  lastUpdated: number;
}

// ==================== Constants ====================

const STORAGE_KEY = 'annual_checkup_data';

const DEFAULT_CHECKLIST: Omit<ChecklistItem, 'completed'>[] = [
  {
    id: 'increase-401k',
    label: 'Increase 401(k) contribution',
    description: 'Match inflation or your raise percentage',
    category: 'contributions',
  },
  {
    id: 'max-roth-ira',
    label: 'Max Roth IRA (if eligible)',
    description: '$7,500 limit for 2026 ($8,500 if 50+)',
    category: 'contributions',
  },
  {
    id: 'backdoor-roth',
    label: 'Consider backdoor Roth if not eligible',
    description: 'For high earners above income limits',
    category: 'contributions',
  },
  {
    id: 'max-hsa',
    label: 'Max HSA contributions',
    description: 'Triple tax advantage for healthcare',
    category: 'contributions',
  },
  {
    id: 'review-beneficiaries',
    label: 'Review beneficiaries',
    description: 'All retirement accounts and life insurance',
    category: 'accounts',
  },
  {
    id: 'check-allocation',
    label: 'Check asset allocation',
    description: 'Rebalance if needed to match risk tolerance',
    category: 'accounts',
  },
  {
    id: 'review-fees',
    label: 'Review investment fees',
    description: 'Ensure you are in low-cost funds',
    category: 'accounts',
  },
  {
    id: 'review-insurance',
    label: 'Review insurance coverage',
    description: 'Life, disability, umbrella policies',
    category: 'protection',
  },
  {
    id: 'update-estate',
    label: 'Update estate documents',
    description: 'Will, trust, healthcare directive, POA',
    category: 'planning',
  },
  {
    id: 'emergency-fund',
    label: 'Verify emergency fund',
    description: '3-6 months of expenses in savings',
    category: 'protection',
  },
  {
    id: 'credit-report',
    label: 'Review credit report',
    description: 'Check for errors and fraud',
    category: 'protection',
  },
];

const DEFAULT_KEY_QUESTIONS: Omit<KeyQuestion, 'answer'>[] = [
  {
    id: 'savings-target',
    question: 'Did you hit your savings targets this year?',
    type: 'yesno',
  },
  {
    id: 'on-track',
    question: 'Are you still on track for your retirement goals?',
    type: 'yesno',
  },
  {
    id: 'job-change',
    question: 'Did you change jobs or get a raise?',
    type: 'yesno',
  },
  {
    id: 'family-change',
    question: 'Any major family changes? (marriage, kids, etc.)',
    type: 'yesno',
  },
  {
    id: 'health-change',
    question: 'Any health changes affecting your plan?',
    type: 'yesno',
  },
  {
    id: 'next-year-goal',
    question: 'What is your main financial goal for next year?',
    type: 'text',
  },
];

// ==================== Utility Functions ====================

function loadCheckupData(): AnnualCheckupData {
  if (typeof window === 'undefined') {
    return { snapshots: [], lastUpdated: Date.now() };
  }
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as AnnualCheckupData;
    }
  } catch (error) {
    console.error('[AnnualCheckup] Failed to load data:', error);
  }
  return { snapshots: [], lastUpdated: Date.now() };
}

function saveCheckupData(data: AnnualCheckupData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('[AnnualCheckup] Failed to save data:', error);
  }
}

function calculateNetWorth(balances: AccountBalances): number {
  return balances.taxable + balances.pretax + balances.roth + (balances.other || 0);
}

function calculateTotalContributions(contributions: AnnualContributions): number {
  return (
    contributions.taxable +
    contributions.pretax401k +
    contributions.rothIRA +
    contributions.employerMatch +
    (contributions.hsa || 0)
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

// ==================== Sub-Components ====================

interface YearInReviewProps {
  currentSnapshot: YearlySnapshot | null;
  previousSnapshot: YearlySnapshot | null;
}

function YearInReview({ currentSnapshot, previousSnapshot }: YearInReviewProps) {
  if (!currentSnapshot) return null;

  const netWorthChange = previousSnapshot
    ? currentSnapshot.netWorth - previousSnapshot.netWorth
    : currentSnapshot.netWorth;
  const netWorthChangePercent = previousSnapshot && previousSnapshot.netWorth > 0
    ? ((currentSnapshot.netWorth - previousSnapshot.netWorth) / previousSnapshot.netWorth) * 100
    : 0;
  const totalContributions = calculateTotalContributions(currentSnapshot.contributions);
  const isPositive = netWorthChange >= 0;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Sparkles className="w-5 h-5 text-yellow-500" />
          {currentSnapshot.year} Year in Review
        </CardTitle>
        <CardDescription>
          Celebrating your financial progress
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Net Worth Change */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className={`p-4 ${isPositive ? 'bg-green-50 dark:bg-green-950/30' : 'bg-red-50 dark:bg-red-950/30'}`}>
            <div className="flex items-center gap-2 mb-2">
              {isPositive ? (
                <TrendingUp className="w-5 h-5 text-green-600" />
              ) : (
                <TrendingDown className="w-5 h-5 text-red-600" />
              )}
              <span className="text-sm font-medium text-muted-foreground">Net Worth Change</span>
            </div>
            <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? '+' : ''}{fmt(netWorthChange)}
            </div>
            {previousSnapshot && (
              <div className="text-sm text-muted-foreground">
                {isPositive ? '+' : ''}{netWorthChangePercent.toFixed(1)}% from last year
              </div>
            )}
          </Card>

          <Card className="p-4 bg-blue-50 dark:bg-blue-950/30">
            <div className="flex items-center gap-2 mb-2">
              <PiggyBank className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-muted-foreground">Total Contributions</span>
            </div>
            <div className="text-2xl font-bold text-blue-600">
              {fmt(totalContributions)}
            </div>
            <div className="text-sm text-muted-foreground">
              Invested this year
            </div>
          </Card>

          <Card className="p-4 bg-purple-50 dark:bg-purple-950/30">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-5 h-5 text-purple-600" />
              <span className="text-sm font-medium text-muted-foreground">Investment Returns</span>
            </div>
            <div className="text-2xl font-bold text-purple-600">
              {fmt(currentSnapshot.investmentReturns)}
            </div>
            <div className="text-sm text-muted-foreground">
              Market gains/losses
            </div>
          </Card>
        </div>

        {/* Current Net Worth */}
        <div className="text-center py-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">Current Net Worth</div>
          <div className="text-4xl font-bold text-primary">{fmt(currentSnapshot.netWorth)}</div>
          {currentSnapshot.onTrack && (
            <div className="flex items-center justify-center gap-1 mt-2 text-green-600">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-medium">On track for retirement at {currentSnapshot.projectedRetirementAge}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface AccountBalancesUpdateProps {
  balances: AccountBalances;
  previousBalances: AccountBalances | null;
  onChange: (balances: AccountBalances) => void;
}

function AccountBalancesUpdate({ balances, previousBalances, onChange }: AccountBalancesUpdateProps) {
  const handleChange = (field: keyof AccountBalances, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
    onChange({ ...balances, [field]: numValue });
  };

  const getChangeIndicator = (current: number, previous: number | undefined) => {
    if (previous === undefined) return null;
    const change = current - previous;
    if (change === 0) return null;
    return (
      <span className={`text-xs ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
        {change > 0 ? '+' : ''}{fmt(change)}
      </span>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Account Balances Update
        </CardTitle>
        <CardDescription>
          Update your current account balances. Previous year values are pre-filled.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="balance-taxable">Taxable Brokerage</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="balance-taxable"
                type="text"
                value={balances.taxable.toLocaleString()}
                onChange={(e) => handleChange('taxable', e.target.value)}
                className="pl-7"
              />
            </div>
            {previousBalances && getChangeIndicator(balances.taxable, previousBalances.taxable)}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance-pretax">Pre-tax (401k, 403b, Traditional IRA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="balance-pretax"
                type="text"
                value={balances.pretax.toLocaleString()}
                onChange={(e) => handleChange('pretax', e.target.value)}
                className="pl-7"
              />
            </div>
            {previousBalances && getChangeIndicator(balances.pretax, previousBalances.pretax)}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance-roth">Roth (401k + IRA)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="balance-roth"
                type="text"
                value={balances.roth.toLocaleString()}
                onChange={(e) => handleChange('roth', e.target.value)}
                className="pl-7"
              />
            </div>
            {previousBalances && getChangeIndicator(balances.roth, previousBalances.roth)}
          </div>

          <div className="space-y-2">
            <Label htmlFor="balance-other">Other (HSA, Pension, etc.)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="balance-other"
                type="text"
                value={(balances.other || 0).toLocaleString()}
                onChange={(e) => handleChange('other', e.target.value)}
                className="pl-7"
              />
            </div>
            {previousBalances && getChangeIndicator(balances.other || 0, previousBalances.other)}
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <span className="font-semibold">Total Net Worth</span>
          <span className="text-2xl font-bold">{fmt(calculateNetWorth(balances))}</span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ContributionsUpdateProps {
  contributions: AnnualContributions;
  onChange: (contributions: AnnualContributions) => void;
}

function ContributionsUpdate({ contributions, onChange }: ContributionsUpdateProps) {
  const handleChange = (field: keyof AnnualContributions, value: string) => {
    const numValue = parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
    onChange({ ...contributions, [field]: numValue });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="w-5 h-5" />
          Annual Contributions
        </CardTitle>
        <CardDescription>
          Record your contributions for this year
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contrib-pretax">401(k) / 403(b) Pre-tax</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="contrib-pretax"
                type="text"
                value={contributions.pretax401k.toLocaleString()}
                onChange={(e) => handleChange('pretax401k', e.target.value)}
                className="pl-7"
              />
            </div>
            <div className="text-xs text-muted-foreground">2026 limit: $24,500</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-roth">Roth IRA</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="contrib-roth"
                type="text"
                value={contributions.rothIRA.toLocaleString()}
                onChange={(e) => handleChange('rothIRA', e.target.value)}
                className="pl-7"
              />
            </div>
            <div className="text-xs text-muted-foreground">2026 limit: $7,500</div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-match">Employer Match</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="contrib-match"
                type="text"
                value={contributions.employerMatch.toLocaleString()}
                onChange={(e) => handleChange('employerMatch', e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-taxable">Taxable Investments</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="contrib-taxable"
                type="text"
                value={contributions.taxable.toLocaleString()}
                onChange={(e) => handleChange('taxable', e.target.value)}
                className="pl-7"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contrib-hsa">HSA Contributions</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="contrib-hsa"
                type="text"
                value={(contributions.hsa || 0).toLocaleString()}
                onChange={(e) => handleChange('hsa', e.target.value)}
                className="pl-7"
              />
            </div>
            <div className="text-xs text-muted-foreground">2026 limit: $4,300 individual / $8,550 family</div>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between items-center p-4 bg-muted rounded-lg">
          <span className="font-semibold">Total Contributions</span>
          <span className="text-2xl font-bold text-green-600">
            {fmt(calculateTotalContributions(contributions))}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

interface ChecklistSectionProps {
  checklist: ChecklistItem[];
  onChange: (checklist: ChecklistItem[]) => void;
}

function ChecklistSection({ checklist, onChange }: ChecklistSectionProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    onChange(
      checklist.map((item) =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    );
  };

  const completedCount = checklist.filter((item) => item.completed).length;
  const progressPercent = (completedCount / checklist.length) * 100;

  const categories = [
    { key: 'contributions', label: 'Contributions', icon: PiggyBank },
    { key: 'accounts', label: 'Account Maintenance', icon: DollarSign },
    { key: 'protection', label: 'Protection', icon: Shield },
    { key: 'planning', label: 'Planning', icon: FileText },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          New Year Financial Checklist
        </CardTitle>
        <CardDescription>
          Complete these tasks to start the year strong
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{completedCount} of {checklist.length} completed</span>
            <span className="font-medium">{progressPercent.toFixed(0)}%</span>
          </div>
          <Progress value={progressPercent} className="h-2" />
        </div>

        <Separator />

        {/* Checklist by Category */}
        <div className="space-y-3">
          {categories.map(({ key, label, icon: Icon }) => {
            const categoryItems = checklist.filter((item) => item.category === key);
            const categoryCompleted = categoryItems.filter((item) => item.completed).length;
            const isExpanded = expandedCategory === key;

            return (
              <div key={key} className="border rounded-lg">
                <button
                  onClick={() => setExpandedCategory(isExpanded ? null : key)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{label}</span>
                    <span className="text-sm text-muted-foreground">
                      ({categoryCompleted}/{categoryItems.length})
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {categoryItems.map((item) => (
                      <label
                        key={item.id}
                        className="flex items-start gap-3 p-2 rounded hover:bg-muted/30 cursor-pointer"
                      >
                        <Checkbox
                          checked={item.completed}
                          onCheckedChange={() => handleToggle(item.id)}
                          className="mt-0.5"
                        />
                        <div className="flex-1">
                          <div className={`font-medium ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.label}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface KeyQuestionsProps {
  questions: KeyQuestion[];
  onChange: (questions: KeyQuestion[]) => void;
}

function KeyQuestionsSection({ questions, onChange }: KeyQuestionsProps) {
  const handleAnswerChange = (id: string, answer: string) => {
    onChange(
      questions.map((q) => (q.id === id ? { ...q, answer } : q))
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Key Questions to Answer
        </CardTitle>
        <CardDescription>
          Reflect on the past year and plan ahead
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {questions.map((q) => (
          <div key={q.id} className="space-y-2">
            <Label className="font-medium">{q.question}</Label>
            {q.type === 'yesno' ? (
              <div className="flex gap-2">
                <Button
                  variant={q.answer === 'yes' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAnswerChange(q.id, 'yes')}
                >
                  Yes
                </Button>
                <Button
                  variant={q.answer === 'no' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleAnswerChange(q.id, 'no')}
                >
                  No
                </Button>
              </div>
            ) : (
              <Textarea
                value={q.answer}
                onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                placeholder="Your answer..."
                rows={2}
              />
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

interface NextYearProjectionsProps {
  currentSnapshot: YearlySnapshot | null;
  returnRate: number;
  inflationRate: number;
}

function NextYearProjections({ currentSnapshot, returnRate, inflationRate }: NextYearProjectionsProps) {
  if (!currentSnapshot) return null;

  const currentNetWorth = currentSnapshot.netWorth;
  const expectedContributions = calculateTotalContributions(currentSnapshot.contributions);
  const projectedReturns = currentNetWorth * (returnRate / 100);
  const projectedNetWorth = currentNetWorth + projectedReturns + expectedContributions;

  // Calculate milestones
  const milestones = [
    { amount: 100_000, label: '$100K' },
    { amount: 250_000, label: '$250K' },
    { amount: 500_000, label: '$500K' },
    { amount: 1_000_000, label: '$1M' },
    { amount: 2_000_000, label: '$2M' },
    { amount: 5_000_000, label: '$5M' },
  ];

  const nextMilestone = milestones.find((m) => m.amount > currentNetWorth);
  const yearsToMilestone = nextMilestone
    ? Math.ceil(
        Math.log(nextMilestone.amount / currentNetWorth) /
        Math.log(1 + (returnRate - inflationRate) / 100)
      )
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Next Year Projections
        </CardTitle>
        <CardDescription>
          What to expect based on your current trajectory
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Projected Net Worth (End of {getCurrentYear() + 1})</div>
            <div className="text-2xl font-bold">{fmt(projectedNetWorth)}</div>
            <div className="text-sm text-green-600">
              +{fmt(projectedNetWorth - currentNetWorth)} projected growth
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Expected Investment Returns</div>
            <div className="text-2xl font-bold">{fmt(projectedReturns)}</div>
            <div className="text-sm text-muted-foreground">
              At {returnRate}% annual return
            </div>
          </div>
        </div>

        {nextMilestone && (
          <div className="p-4 border-2 border-dashed border-primary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold">Next Milestone: {nextMilestone.label}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {yearsToMilestone === 1
                ? 'You could reach this milestone next year!'
                : `Approximately ${yearsToMilestone} years away at current pace`}
            </div>
            <Progress
              value={(currentNetWorth / nextMilestone.amount) * 100}
              className="h-2 mt-2"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {((currentNetWorth / nextMilestone.amount) * 100).toFixed(1)}% complete
            </div>
          </div>
        )}

        {/* Suggested Goals */}
        <div className="space-y-2">
          <h4 className="font-semibold flex items-center gap-2">
            <ArrowRight className="w-4 h-4" />
            Suggested Goals for {getCurrentYear() + 1}
          </h4>
          <ul className="space-y-1 text-sm">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Increase contributions by 3% to match inflation</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Max out tax-advantaged accounts before taxable</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
              <span>Complete annual checkup by January 31st next year</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

interface PrintableSummaryProps {
  snapshot: YearlySnapshot;
  previousSnapshot: YearlySnapshot | null;
  onClose: () => void;
}

function PrintableSummary({ snapshot, previousSnapshot, onClose }: PrintableSummaryProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Financial Checkup Summary - ${snapshot.year}`);
    const body = encodeURIComponent(generateEmailBody(snapshot, previousSnapshot));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const netWorthChange = previousSnapshot
    ? snapshot.netWorth - previousSnapshot.netWorth
    : snapshot.netWorth;
  const completedTasks = snapshot.checklist.filter((item) => item.completed).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {snapshot.year} Financial Checkup Summary
          </DialogTitle>
          <DialogDescription>
            Review, print, or share your annual financial summary
          </DialogDescription>
        </DialogHeader>

        <div ref={printRef} className="space-y-6 p-4 print:p-0">
          {/* Header */}
          <div className="text-center border-b pb-4">
            <h1 className="text-2xl font-bold">Annual Financial Checkup</h1>
            <p className="text-muted-foreground">{formatDate(snapshot.date)}</p>
          </div>

          {/* Net Worth Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Current Net Worth</div>
              <div className="text-2xl font-bold">{fmt(snapshot.netWorth)}</div>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground">Year-over-Year Change</div>
              <div className={`text-2xl font-bold ${netWorthChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {netWorthChange >= 0 ? '+' : ''}{fmt(netWorthChange)}
              </div>
            </div>
          </div>

          {/* Account Balances */}
          <div>
            <h3 className="font-semibold mb-2">Account Balances</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Taxable</span>
                <span className="font-medium">{fmt(snapshot.balances.taxable)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Pre-tax</span>
                <span className="font-medium">{fmt(snapshot.balances.pretax)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Roth</span>
                <span className="font-medium">{fmt(snapshot.balances.roth)}</span>
              </div>
              <div className="flex justify-between p-2 bg-muted rounded">
                <span>Other</span>
                <span className="font-medium">{fmt(snapshot.balances.other || 0)}</span>
              </div>
            </div>
          </div>

          {/* Contributions */}
          <div>
            <h3 className="font-semibold mb-2">Annual Contributions</h3>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span>401(k)</span>
                <span>{fmt(snapshot.contributions.pretax401k)}</span>
              </div>
              <div className="flex justify-between">
                <span>Roth IRA</span>
                <span>{fmt(snapshot.contributions.rothIRA)}</span>
              </div>
              <div className="flex justify-between">
                <span>Employer Match</span>
                <span>{fmt(snapshot.contributions.employerMatch)}</span>
              </div>
              <div className="flex justify-between font-medium pt-1 border-t">
                <span>Total</span>
                <span>{fmt(calculateTotalContributions(snapshot.contributions))}</span>
              </div>
            </div>
          </div>

          {/* Checklist Progress */}
          <div>
            <h3 className="font-semibold mb-2">Checklist Progress</h3>
            <div className="flex items-center gap-2">
              <Progress value={(completedTasks / snapshot.checklist.length) * 100} className="h-2 flex-1" />
              <span className="text-sm">{completedTasks}/{snapshot.checklist.length}</span>
            </div>
          </div>

          {/* Notes */}
          {snapshot.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{snapshot.notes}</p>
            </div>
          )}
        </div>

        <DialogFooter className="print:hidden">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={handleEmail}>
            <Mail className="w-4 h-4 mr-2" />
            Email
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function generateEmailBody(snapshot: YearlySnapshot, previousSnapshot: YearlySnapshot | null): string {
  const netWorthChange = previousSnapshot
    ? snapshot.netWorth - previousSnapshot.netWorth
    : snapshot.netWorth;

  return `
Annual Financial Checkup Summary - ${snapshot.year}
Date: ${formatDate(snapshot.date)}

NET WORTH: ${fmtFull(snapshot.netWorth)}
Year-over-Year Change: ${netWorthChange >= 0 ? '+' : ''}${fmtFull(netWorthChange)}

ACCOUNT BALANCES:
- Taxable: ${fmtFull(snapshot.balances.taxable)}
- Pre-tax: ${fmtFull(snapshot.balances.pretax)}
- Roth: ${fmtFull(snapshot.balances.roth)}
- Other: ${fmtFull(snapshot.balances.other || 0)}

ANNUAL CONTRIBUTIONS:
- 401(k): ${fmtFull(snapshot.contributions.pretax401k)}
- Roth IRA: ${fmtFull(snapshot.contributions.rothIRA)}
- Employer Match: ${fmtFull(snapshot.contributions.employerMatch)}
- Total: ${fmtFull(calculateTotalContributions(snapshot.contributions))}

CHECKLIST: ${snapshot.checklist.filter((i) => i.completed).length}/${snapshot.checklist.length} completed

${snapshot.notes ? `NOTES:\n${snapshot.notes}` : ''}

Generated by Retirement Calculator
  `.trim();
}

interface HistoricalViewProps {
  snapshots: YearlySnapshot[];
  onLoadYear: (year: number) => void;
  onDeleteYear: (year: number) => void;
}

function HistoricalView({ snapshots, onLoadYear, onDeleteYear }: HistoricalViewProps) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No historical data yet.</p>
          <p className="text-sm">Complete your first annual checkup to start tracking!</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Historical Data
        </CardTitle>
        <CardDescription>
          Track your progress over the years
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {snapshots.map((snapshot, index) => {
            const prevSnapshot = snapshots[index + 1];
            const netWorthChange = prevSnapshot
              ? snapshot.netWorth - prevSnapshot.netWorth
              : 0;

            return (
              <div
                key={snapshot.year}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{snapshot.year}</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(snapshot.date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span>Net Worth: {fmt(snapshot.netWorth)}</span>
                    {prevSnapshot && (
                      <span className={netWorthChange >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {netWorthChange >= 0 ? '+' : ''}{fmt(netWorthChange)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onLoadYear(snapshot.year)}
                    title="Load this year"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onDeleteYear(snapshot.year)}
                    title="Delete this year"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ==================== Main Component ====================

export function AnnualCheckup() {
  const { config } = usePlanConfig();
  const D = createDefaultPlanConfig();
  const [checkupData, setCheckupData] = useState<AnnualCheckupData>({ snapshots: [], lastUpdated: Date.now() });
  const [isLoaded, setIsLoaded] = useState(false);

  // Current year editing state
  const currentYear = getCurrentYear();
  const [balances, setBalances] = useState<AccountBalances>({
    taxable: 0,
    pretax: 0,
    roth: 0,
    other: 0,
  });
  const [contributions, setContributions] = useState<AnnualContributions>({
    taxable: 0,
    pretax401k: 0,
    rothIRA: 0,
    employerMatch: 0,
    hsa: 0,
  });
  const [checklist, setChecklist] = useState<ChecklistItem[]>(
    DEFAULT_CHECKLIST.map((item) => ({ ...item, completed: false }))
  );
  const [keyQuestions, setKeyQuestions] = useState<KeyQuestion[]>(
    DEFAULT_KEY_QUESTIONS.map((q) => ({ ...q, answer: '' }))
  );
  const [notes, setNotes] = useState('');
  const [investmentReturns, setInvestmentReturns] = useState(0);

  // UI state
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>('review');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load data on mount
  useEffect(() => {
    const data = loadCheckupData();
    setCheckupData(data);

    // Load current year data if exists, otherwise pre-fill from plan config
    const currentYearSnapshot = data.snapshots.find((s) => s.year === currentYear);
    const previousSnapshot = data.snapshots.find((s) => s.year === currentYear - 1);

    if (currentYearSnapshot) {
      setBalances(currentYearSnapshot.balances);
      setContributions(currentYearSnapshot.contributions);
      setChecklist(currentYearSnapshot.checklist);
      setKeyQuestions(currentYearSnapshot.keyQuestions);
      setNotes(currentYearSnapshot.notes);
      setInvestmentReturns(currentYearSnapshot.investmentReturns);
    } else if (previousSnapshot) {
      // Pre-fill with last year's ending balances
      setBalances(previousSnapshot.balances);
      setContributions(previousSnapshot.contributions);
    } else {
      // Pre-fill from plan config
      setBalances({
        taxable: config.taxableBalance ?? D.taxableBalance,
        pretax: config.pretaxBalance ?? D.pretaxBalance,
        roth: config.rothBalance ?? D.rothBalance,
        other: 0,
      });
      setContributions({
        taxable: config.cTax1 ?? D.cTax1,
        pretax401k: config.cPre1 ?? D.cPre1,
        rothIRA: config.cPost1 ?? D.cPost1,
        employerMatch: config.cMatch1 ?? D.cMatch1,
        hsa: 0,
      });
    }

    setIsLoaded(true);
  }, [config, currentYear]);

  // Track unsaved changes
  useEffect(() => {
    if (isLoaded) {
      setHasUnsavedChanges(true);
    }
  }, [balances, contributions, checklist, keyQuestions, notes, investmentReturns, isLoaded]);

  // Get snapshots for display
  const currentSnapshot = useMemo<YearlySnapshot | null>(() => {
    if (!isLoaded) return null;
    return {
      year: currentYear,
      date: new Date().toISOString(),
      balances,
      contributions,
      netWorth: calculateNetWorth(balances),
      investmentReturns,
      checklist,
      keyQuestions,
      notes,
      projectedRetirementAge: config.retirementAge ?? D.retirementAge,
      onTrack: true, // Could be calculated based on projections
    };
  }, [balances, contributions, checklist, keyQuestions, notes, investmentReturns, currentYear, config, isLoaded]);

  const previousSnapshot = useMemo(() => {
    return checkupData.snapshots.find((s) => s.year === currentYear - 1) || null;
  }, [checkupData.snapshots, currentYear]);

  // Save current year data
  const handleSave = useCallback(() => {
    if (!currentSnapshot) return;

    const updatedSnapshots = [
      currentSnapshot,
      ...checkupData.snapshots.filter((s) => s.year !== currentYear),
    ].sort((a, b) => b.year - a.year);

    const updatedData: AnnualCheckupData = {
      snapshots: updatedSnapshots,
      lastUpdated: Date.now(),
    };

    saveCheckupData(updatedData);
    setCheckupData(updatedData);
    setHasUnsavedChanges(false);
    toast.success('Annual checkup saved successfully!');
  }, [currentSnapshot, checkupData.snapshots, currentYear]);

  // Load a specific year
  const handleLoadYear = useCallback((year: number) => {
    const snapshot = checkupData.snapshots.find((s) => s.year === year);
    if (snapshot) {
      setBalances(snapshot.balances);
      setContributions(snapshot.contributions);
      setChecklist(snapshot.checklist);
      setKeyQuestions(snapshot.keyQuestions);
      setNotes(snapshot.notes);
      setInvestmentReturns(snapshot.investmentReturns);
    }
  }, [checkupData.snapshots]);

  // Delete a specific year
  const handleDeleteYear = useCallback((year: number) => {
    if (confirm(`Delete ${year} checkup data? This cannot be undone.`)) {
      const updatedSnapshots = checkupData.snapshots.filter((s) => s.year !== year);
      const updatedData: AnnualCheckupData = {
        snapshots: updatedSnapshots,
        lastUpdated: Date.now(),
      };
      saveCheckupData(updatedData);
      setCheckupData(updatedData);
    }
  }, [checkupData.snapshots]);

  // Export all data
  const handleExport = useCallback(() => {
    const json = JSON.stringify(checkupData, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `annual-checkup-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [checkupData]);

  // Import data
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string) as AnnualCheckupData;
        if (imported.snapshots && Array.isArray(imported.snapshots)) {
          setCheckupData(imported);
          saveCheckupData(imported);
          toast.success('Data imported successfully!');
        } else {
          toast.error('Invalid file format');
        }
      } catch {
        toast.error('Failed to import data');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  if (!isLoaded) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <RefreshCw className="w-8 h-8 mx-auto animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  const isJanuary = new Date().getMonth() === 0;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className={isJanuary ? 'border-2 border-primary' : ''}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Calendar className="w-6 h-6" />
            Annual Financial Checkup
            {isJanuary && (
              <span className="ml-2 px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
                It&apos;s January - Perfect timing!
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-base">
            Every January, take time to review your finances, celebrate progress, and set goals for the new year.
            This checkup helps you stay on track for retirement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSave} disabled={!hasUnsavedChanges}>
              <Save className="w-4 h-4 mr-2" />
              Save {currentYear} Checkup
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowPrintDialog(true)}
              disabled={!currentSnapshot}
            >
              <Printer className="w-4 h-4 mr-2" />
              Print Summary
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export All Data
            </Button>
            <label>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
              <Button variant="outline" asChild>
                <span>
                  <Upload className="w-4 h-4 mr-2" />
                  Import Data
                </span>
              </Button>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {/* Year in Review */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('review')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-lg">1. Year in Review</span>
            </div>
            {expandedSection === 'review' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'review' && (
            <div className="p-4 pt-0">
              <YearInReview
                currentSnapshot={currentSnapshot}
                previousSnapshot={previousSnapshot}
              />
            </div>
          )}
        </div>

        {/* Account Balances */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('balances')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <span className="font-semibold text-lg">2. Account Balances Update</span>
            </div>
            {expandedSection === 'balances' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'balances' && (
            <div className="p-4 pt-0 space-y-4">
              <AccountBalancesUpdate
                balances={balances}
                previousBalances={previousSnapshot?.balances || null}
                onChange={setBalances}
              />
              <ContributionsUpdate
                contributions={contributions}
                onChange={setContributions}
              />
              <div className="space-y-2">
                <Label htmlFor="investment-returns">Investment Returns This Year</Label>
                <div className="relative max-w-xs">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="investment-returns"
                    type="text"
                    value={investmentReturns.toLocaleString()}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value.replace(/[^0-9.-]/g, '')) || 0;
                      setInvestmentReturns(value);
                    }}
                    className="pl-7"
                    placeholder="Market gains/losses"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Net worth change minus contributions equals investment returns
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Checklist */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('checklist')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-lg">3. New Year Checklist</span>
              <span className="text-sm text-muted-foreground">
                ({checklist.filter((i) => i.completed).length}/{checklist.length})
              </span>
            </div>
            {expandedSection === 'checklist' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'checklist' && (
            <div className="p-4 pt-0">
              <ChecklistSection checklist={checklist} onChange={setChecklist} />
            </div>
          )}
        </div>

        {/* Key Questions */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('questions')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="font-semibold text-lg">4. Key Questions</span>
            </div>
            {expandedSection === 'questions' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'questions' && (
            <div className="p-4 pt-0">
              <KeyQuestionsSection questions={keyQuestions} onChange={setKeyQuestions} />
            </div>
          )}
        </div>

        {/* Next Year Projections */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('projections')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <span className="font-semibold text-lg">5. Next Year Projections</span>
            </div>
            {expandedSection === 'projections' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'projections' && (
            <div className="p-4 pt-0">
              <NextYearProjections
                currentSnapshot={currentSnapshot}
                returnRate={config.retRate ?? D.retRate}
                inflationRate={config.inflationRate ?? D.inflationRate}
              />
            </div>
          )}
        </div>

        {/* Notes */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('notes')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="font-semibold text-lg">6. Notes & Summary</span>
            </div>
            {expandedSection === 'notes' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'notes' && (
            <div className="p-4 pt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Personal Notes</CardTitle>
                  <CardDescription>
                    Record any thoughts, goals, or reminders for the year
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="What are your financial goals for this year? Any major life changes to plan for?"
                    rows={5}
                  />
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Historical Data */}
        <div className="border rounded-lg">
          <button
            onClick={() => toggleSection('history')}
            className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-lg">Historical Data</span>
              <span className="text-sm text-muted-foreground">
                ({checkupData.snapshots.length} years)
              </span>
            </div>
            {expandedSection === 'history' ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSection === 'history' && (
            <div className="p-4 pt-0">
              <HistoricalView
                snapshots={checkupData.snapshots}
                onLoadYear={handleLoadYear}
                onDeleteYear={handleDeleteYear}
              />
            </div>
          )}
        </div>
      </div>

      {/* Print Dialog */}
      {showPrintDialog && currentSnapshot && (
        <PrintableSummary
          snapshot={currentSnapshot}
          previousSnapshot={previousSnapshot}
          onClose={() => setShowPrintDialog(false)}
        />
      )}

      {/* Bottom Save Reminder */}
      {hasUnsavedChanges && (
        <Card className="fixed bottom-4 right-4 w-auto shadow-lg border-2 border-yellow-500">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <span className="text-sm">You have unsaved changes</span>
            <Button size="sm" onClick={handleSave}>
              Save Now
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AnnualCheckup;
