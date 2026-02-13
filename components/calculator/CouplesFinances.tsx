'use client';

/**
 * Couples Financial Compatibility Check
 *
 * Money is the #1 cause of divorce. This component helps couples:
 * 1. Understand their money personalities
 * 2. Discuss important financial questions
 * 3. Decide on account structures
 * 4. Align on budgets and goals
 * 5. Disclose debts transparently
 * 6. Establish monthly money meetings
 * 7. Know when to seek professional help
 *
 * "Prevent money fights before they start."
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Heart,
  Users,
  MessageCircle,
  Wallet,
  Target,
  AlertTriangle,
  Calendar,
  HelpCircle,
  ChevronRight,
  CheckCircle2,
  X,
  Scale,
  PiggyBank,
  TrendingUp,
  Shield,
  Home,
  GraduationCap,
  Plane,
  Car,
  UtensilsCrossed,
  Sparkles,
  FileText,
  Clock,
  Award,
  Info,
  ArrowRight,
  CreditCard,
  Building2,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { TYPOGRAPHY, METRIC_COLORS } from '@/lib/designTokens';
import { fmt } from '@/lib/utils';

// ==================== Types ====================

type MoneyPersonalityTrait = 'saver' | 'spender' | 'risk-tolerant' | 'risk-averse' | 'planner' | 'spontaneous';

interface QuizAnswer {
  questionId: string;
  answer: 'A' | 'B';
}

interface SpendingPriority {
  id: string;
  label: string;
  icon: React.ElementType;
  rank: number;
}

interface FinancialGoal {
  id: string;
  text: string;
  priority: 'high' | 'medium' | 'low';
}

interface DebtItem {
  id: string;
  description: string;
  amount: number;
  type: 'student-loan' | 'credit-card' | 'car' | 'medical' | 'personal' | 'other';
}

type AccountStructure = 'all-joint' | 'all-separate' | 'yours-mine-ours';

interface MeetingAgendaItem {
  id: string;
  text: string;
  completed: boolean;
}

// ==================== Constants ====================

const QUIZ_QUESTIONS = [
  {
    id: 'q1',
    question: 'When you receive unexpected money (bonus, gift, tax refund), you:',
    optionA: 'Save most of it for future needs or goals',
    optionB: 'Treat yourself - you deserve it!',
    traitA: 'saver' as MoneyPersonalityTrait,
    traitB: 'spender' as MoneyPersonalityTrait,
  },
  {
    id: 'q2',
    question: 'When it comes to investments, you prefer:',
    optionA: 'Higher potential returns, even with more volatility',
    optionB: 'Stable, predictable returns with lower risk',
    traitA: 'risk-tolerant' as MoneyPersonalityTrait,
    traitB: 'risk-averse' as MoneyPersonalityTrait,
  },
  {
    id: 'q3',
    question: 'For big purchases, you typically:',
    optionA: 'Research extensively and plan months ahead',
    optionB: 'Buy when the opportunity feels right',
    traitA: 'planner' as MoneyPersonalityTrait,
    traitB: 'spontaneous' as MoneyPersonalityTrait,
  },
  {
    id: 'q4',
    question: 'Your ideal vacation budget approach is:',
    optionA: 'Set a strict budget and stick to it',
    optionB: "Life is short - enjoy experiences without limits",
    traitA: 'saver' as MoneyPersonalityTrait,
    traitB: 'spender' as MoneyPersonalityTrait,
  },
  {
    id: 'q5',
    question: 'If you had $10,000 to invest, you would:',
    optionA: 'Put some in individual stocks or crypto for growth potential',
    optionB: 'Keep it in savings or bonds for security',
    traitA: 'risk-tolerant' as MoneyPersonalityTrait,
    traitB: 'risk-averse' as MoneyPersonalityTrait,
  },
  {
    id: 'q6',
    question: 'When bills are due, you:',
    optionA: 'Have automated payments set up weeks in advance',
    optionB: 'Pay them when you remember, usually close to due date',
    traitA: 'planner' as MoneyPersonalityTrait,
    traitB: 'spontaneous' as MoneyPersonalityTrait,
  },
];

const DISCUSSION_QUESTIONS = [
  {
    id: 'meaning',
    question: 'What does money mean to you?',
    subtext: 'Security? Freedom? Status? Power? Options? Peace of mind?',
    icon: Heart,
    tips: [
      'There is no wrong answer - this reveals core values',
      'Listen without judgment to your partner',
      'This often connects to childhood experiences',
    ],
  },
  {
    id: 'fear',
    question: 'What is your biggest financial fear?',
    subtext: 'Running out of money? Losing a job? Being dependent on others?',
    icon: AlertTriangle,
    tips: [
      'Vulnerability here builds trust',
      'Understanding fears helps you support each other',
      'Many fears come from past experiences',
    ],
  },
  {
    id: 'goal',
    question: 'What is your biggest financial goal?',
    subtext: 'Early retirement? Dream home? Starting a business? Travel the world?',
    icon: Target,
    tips: [
      'Goals should excite both of you',
      'It is okay to have some individual goals',
      'Focus on the "why" behind the goal',
    ],
  },
  {
    id: 'childhood',
    question: 'How were finances handled in your childhood?',
    subtext: 'Did parents discuss money? Was there financial stress? Who managed the budget?',
    icon: Users,
    tips: [
      'This often explains current money behaviors',
      'No judgment - we all carry our upbringing',
      'Identifying patterns helps break negative cycles',
    ],
  },
  {
    id: 'decisions',
    question: 'How should we make big financial decisions?',
    subtext: 'What spending threshold requires discussion? Who handles day-to-day?',
    icon: Scale,
    tips: [
      'Agree on a dollar amount that requires joint discussion',
      'Common thresholds: $100, $250, $500',
      'Both partners should feel heard',
    ],
  },
];

const SPENDING_CATEGORIES: SpendingPriority[] = [
  { id: 'housing', label: 'Housing & Home', icon: Home, rank: 0 },
  { id: 'kids', label: 'Kids & Education', icon: GraduationCap, rank: 0 },
  { id: 'retirement', label: 'Retirement Savings', icon: PiggyBank, rank: 0 },
  { id: 'travel', label: 'Travel & Vacation', icon: Plane, rank: 0 },
  { id: 'dining', label: 'Dining Out', icon: UtensilsCrossed, rank: 0 },
  { id: 'car', label: 'Cars & Transportation', icon: Car, rank: 0 },
  { id: 'entertainment', label: 'Entertainment & Hobbies', icon: Sparkles, rank: 0 },
  { id: 'giving', label: 'Charitable Giving', icon: Heart, rank: 0 },
];

const ACCOUNT_OPTIONS: {
  value: AccountStructure;
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
}[] = [
  {
    value: 'all-joint',
    label: 'All Joint',
    description: 'One shared pot for everything',
    pros: [
      'Full transparency and simplicity',
      'United team mentality',
      'Easier budgeting and tracking',
      'No "yours vs mine" arguments',
    ],
    cons: [
      'Less financial independence',
      'Gift-giving surprises are harder',
      'Past spending habits fully visible',
      'Can feel controlling to some',
    ],
    bestFor: 'Couples who value complete transparency and have similar spending habits',
  },
  {
    value: 'all-separate',
    label: 'All Separate',
    description: 'Completely independent finances',
    pros: [
      'Maximum independence',
      'Clear ownership of assets',
      'Simpler if relationship ends',
      'Respects different money styles',
    ],
    cons: [
      'Can feel like roommates',
      'Harder to build wealth together',
      'Shared expenses get complicated',
      'Less teamwork feeling',
    ],
    bestFor: 'Couples with very different incomes, spending habits, or who are remarrying',
  },
  {
    value: 'yours-mine-ours',
    label: 'Yours, Mine & Ours',
    description: 'Joint account for shared expenses, personal accounts for discretionary',
    pros: [
      'Balance of togetherness and independence',
      '"Fun money" without guilt or permission',
      'Shared goals with personal freedom',
      'Most flexible approach',
    ],
    cons: [
      'More accounts to manage',
      'Need to agree on contribution splits',
      'Can create "sides" if not careful',
      'Requires more coordination',
    ],
    bestFor: 'Most couples - provides structure with flexibility',
  },
];

const DEFAULT_MEETING_AGENDA: MeetingAgendaItem[] = [
  { id: '1', text: 'Review last month spending vs budget', completed: false },
  { id: '2', text: 'Check progress on savings goals', completed: false },
  { id: '3', text: 'Discuss any upcoming big expenses', completed: false },
  { id: '4', text: 'Review and pay bills together', completed: false },
  { id: '5', text: 'Address any money concerns or frustrations', completed: false },
  { id: '6', text: 'Celebrate a financial win this month', completed: false },
  { id: '7', text: 'Set one money goal for next month', completed: false },
];

const DEBT_TYPES = [
  { value: 'student-loan', label: 'Student Loans', icon: GraduationCap },
  { value: 'credit-card', label: 'Credit Card', icon: CreditCard },
  { value: 'car', label: 'Car Loan', icon: Car },
  { value: 'medical', label: 'Medical Debt', icon: Heart },
  { value: 'personal', label: 'Personal Loan', icon: Wallet },
  { value: 'other', label: 'Other', icon: FileText },
];

// ==================== Helper Functions ====================

function getPersonalityProfile(answers: QuizAnswer[]): {
  traits: MoneyPersonalityTrait[];
  summary: string;
} {
  const traitCounts: Record<MoneyPersonalityTrait, number> = {
    saver: 0,
    spender: 0,
    'risk-tolerant': 0,
    'risk-averse': 0,
    planner: 0,
    spontaneous: 0,
  };

  answers.forEach((answer) => {
    const question = QUIZ_QUESTIONS.find((q) => q.id === answer.questionId);
    if (question) {
      const trait = answer.answer === 'A' ? question.traitA : question.traitB;
      traitCounts[trait]++;
    }
  });

  const traits: MoneyPersonalityTrait[] = [];

  // Determine primary traits
  if (traitCounts.saver > traitCounts.spender) {
    traits.push('saver');
  } else if (traitCounts.spender > traitCounts.saver) {
    traits.push('spender');
  }

  if (traitCounts['risk-tolerant'] > traitCounts['risk-averse']) {
    traits.push('risk-tolerant');
  } else if (traitCounts['risk-averse'] > traitCounts['risk-tolerant']) {
    traits.push('risk-averse');
  }

  if (traitCounts.planner > traitCounts.spontaneous) {
    traits.push('planner');
  } else if (traitCounts.spontaneous > traitCounts.planner) {
    traits.push('spontaneous');
  }

  const summary = traits.length > 0 ? traits.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(' - ') : 'Balanced';

  return { traits, summary };
}

function calculateCompatibility(
  person1Traits: MoneyPersonalityTrait[],
  person2Traits: MoneyPersonalityTrait[]
): { score: number; insights: string[] } {
  const insights: string[] = [];
  let compatibilityPoints = 50; // Start at neutral

  // Check for complementary or conflicting traits
  const p1Saver = person1Traits.includes('saver');
  const p2Saver = person2Traits.includes('saver');
  const p1Spender = person1Traits.includes('spender');
  const p2Spender = person2Traits.includes('spender');

  if (p1Saver && p2Saver) {
    compatibilityPoints += 20;
    insights.push('You are both savers - great for building wealth together!');
  } else if (p1Spender && p2Spender) {
    compatibilityPoints += 10;
    insights.push('You both enjoy spending - make sure to set savings goals together.');
  } else if ((p1Saver && p2Spender) || (p1Spender && p2Saver)) {
    compatibilityPoints += 5;
    insights.push('One saver, one spender - you can balance each other, but discuss boundaries.');
  }

  const p1Risk = person1Traits.includes('risk-tolerant');
  const p2Risk = person2Traits.includes('risk-tolerant');
  const p1Safe = person1Traits.includes('risk-averse');
  const p2Safe = person2Traits.includes('risk-averse');

  if (p1Risk && p2Risk) {
    compatibilityPoints += 15;
    insights.push('Both risk-tolerant - exciting investment journey ahead, but set some guardrails.');
  } else if (p1Safe && p2Safe) {
    compatibilityPoints += 20;
    insights.push('Both risk-averse - you will sleep well at night with conservative choices.');
  } else if ((p1Risk && p2Safe) || (p1Safe && p2Risk)) {
    compatibilityPoints += 10;
    insights.push('Different risk tolerances - consider a blended investment approach.');
  }

  const p1Planner = person1Traits.includes('planner');
  const p2Planner = person2Traits.includes('planner');
  const p1Spontaneous = person1Traits.includes('spontaneous');
  const p2Spontaneous = person2Traits.includes('spontaneous');

  if (p1Planner && p2Planner) {
    compatibilityPoints += 20;
    insights.push('Both planners - you will excel at budgeting and long-term goals!');
  } else if (p1Spontaneous && p2Spontaneous) {
    compatibilityPoints += 10;
    insights.push('Both spontaneous - keep some structure for essentials, enjoy flexibility elsewhere.');
  } else if ((p1Planner && p2Spontaneous) || (p1Spontaneous && p2Planner)) {
    compatibilityPoints += 15;
    insights.push('Planner meets spontaneous - the planner can provide structure while spontaneity adds fun.');
  }

  return { score: Math.min(100, Math.max(0, compatibilityPoints)), insights };
}

function findBudgetAlignment(
  person1Priorities: SpendingPriority[],
  person2Priorities: SpendingPriority[]
): { agreements: string[]; conflicts: string[] } {
  const agreements: string[] = [];
  const conflicts: string[] = [];

  // Get top 3 priorities for each person
  const p1Top3 = person1Priorities.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank).slice(0, 3);
  const p2Top3 = person2Priorities.filter(p => p.rank > 0).sort((a, b) => a.rank - b.rank).slice(0, 3);

  const p1TopIds = new Set(p1Top3.map(p => p.id));
  const p2TopIds = new Set(p2Top3.map(p => p.id));

  // Find agreements (in both top 3)
  p1Top3.forEach(priority => {
    if (p2TopIds.has(priority.id)) {
      agreements.push(priority.label);
    }
  });

  // Find conflicts (in one top 3 but not the other)
  p1Top3.forEach(priority => {
    if (!p2TopIds.has(priority.id)) {
      const p2Rank = person2Priorities.find(p => p.id === priority.id)?.rank || 0;
      if (p2Rank === 0 || p2Rank > 5) {
        conflicts.push(priority.label);
      }
    }
  });

  p2Top3.forEach(priority => {
    if (!p1TopIds.has(priority.id) && !conflicts.includes(priority.label)) {
      const p1Rank = person1Priorities.find(p => p.id === priority.id)?.rank || 0;
      if (p1Rank === 0 || p1Rank > 5) {
        conflicts.push(priority.label);
      }
    }
  });

  return { agreements, conflicts };
}

// ==================== Sub-Components ====================

interface PersonalityQuizProps {
  person: 'You' | 'Partner';
  answers: QuizAnswer[];
  onAnswer: (questionId: string, answer: 'A' | 'B') => void;
  profile: { traits: MoneyPersonalityTrait[]; summary: string } | null;
}

function PersonalityQuiz({ person, answers, onAnswer, profile }: PersonalityQuizProps) {
  const answeredCount = answers.length;
  const totalQuestions = QUIZ_QUESTIONS.length;
  const progress = (answeredCount / totalQuestions) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
          <Users className="h-5 w-5" />
          {person}&#39;s Quiz
        </h4>
        <Badge variant="outline">{answeredCount}/{totalQuestions} answered</Badge>
      </div>
      <Progress value={progress} className="h-2" />

      {profile && progress === 100 ? (
        <div className="p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border border-blue-200 dark:border-blue-800">
          <p className={TYPOGRAPHY.metricLabel}>Money Personality</p>
          <p className={cn(TYPOGRAPHY.metricMedium, 'text-blue-700 dark:text-blue-300')}>
            {profile.summary}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {QUIZ_QUESTIONS.map((q, index) => {
            const answered = answers.find((a) => a.questionId === q.id);
            return (
              <div
                key={q.id}
                className={cn(
                  'p-4 rounded-lg border transition-all',
                  answered
                    ? 'bg-muted/30 border-green-200 dark:border-green-800'
                    : 'bg-background border-border hover:border-blue-300 dark:hover:border-blue-700'
                )}
              >
                <p className={cn(TYPOGRAPHY.body, 'font-medium mb-3')}>
                  {index + 1}. {q.question}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Button
                    variant={answered?.answer === 'A' ? 'default' : 'outline'}
                    className="h-auto py-3 px-4 text-left justify-start whitespace-normal"
                    onClick={() => onAnswer(q.id, 'A')}
                  >
                    <span className="font-semibold mr-2">A.</span> {q.optionA}
                  </Button>
                  <Button
                    variant={answered?.answer === 'B' ? 'default' : 'outline'}
                    className="h-auto py-3 px-4 text-left justify-start whitespace-normal"
                    onClick={() => onAnswer(q.id, 'B')}
                  >
                    <span className="font-semibold mr-2">B.</span> {q.optionB}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface PriorityRankerProps {
  person: 'You' | 'Partner';
  priorities: SpendingPriority[];
  onUpdateRank: (id: string, rank: number) => void;
}

function PriorityRanker({ person, priorities, onUpdateRank }: PriorityRankerProps) {
  const rankedCount = priorities.filter((p) => p.rank > 0).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
          <Scale className="h-5 w-5" />
          {person}&#39;s Priorities
        </h4>
        <Badge variant="outline">{rankedCount} ranked</Badge>
      </div>
      <p className={TYPOGRAPHY.bodyMuted}>
        Rank your top spending priorities (1 = most important). Leave blank for non-priorities.
      </p>
      <div className="grid gap-3">
        {priorities.map((priority) => {
          const Icon = priority.icon;
          return (
            <div
              key={priority.id}
              className={cn(
                'flex items-center gap-4 p-3 rounded-lg border transition-all',
                priority.rank > 0
                  ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                  : 'bg-background border-border'
              )}
            >
              <div className="p-2 rounded-lg bg-muted">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <span className={cn(TYPOGRAPHY.body, 'flex-1')}>{priority.label}</span>
              <Select
                value={priority.rank > 0 ? String(priority.rank) : ''}
                onValueChange={(v) => onUpdateRank(priority.id, v ? Number(v) : 0)}
              >
                <SelectTrigger className="w-20">
                  <SelectValue placeholder="-" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">-</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      #{n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== Main Component ====================

export interface CouplesFinancesProps {
  className?: string;
}

export function CouplesFinances({ className }: CouplesFinancesProps) {
  // Tab state
  const [activeTab, setActiveTab] = useState('quiz');

  // Quiz state
  const [yourAnswers, setYourAnswers] = useState<QuizAnswer[]>([]);
  const [partnerAnswers, setPartnerAnswers] = useState<QuizAnswer[]>([]);

  // Discussion tracking
  const [discussedQuestions, setDiscussedQuestions] = useState<Set<string>>(new Set());

  // Account structure
  const [selectedAccountStructure, setSelectedAccountStructure] = useState<AccountStructure | null>(null);

  // Budget priorities
  const [yourPriorities, setYourPriorities] = useState<SpendingPriority[]>(
    SPENDING_CATEGORIES.map((c) => ({ ...c }))
  );
  const [partnerPriorities, setPartnerPriorities] = useState<SpendingPriority[]>(
    SPENDING_CATEGORIES.map((c) => ({ ...c }))
  );

  // Goals
  const [yourGoals, setYourGoals] = useState<FinancialGoal[]>([]);
  const [partnerGoals, setPartnerGoals] = useState<FinancialGoal[]>([]);
  const [newGoalText, setNewGoalText] = useState({ you: '', partner: '' });

  // Debt disclosure
  const [yourDebts, setYourDebts] = useState<DebtItem[]>([]);
  const [partnerDebts, setPartnerDebts] = useState<DebtItem[]>([]);
  const [showDebtForm, setShowDebtForm] = useState<'you' | 'partner' | null>(null);
  const [newDebt, setNewDebt] = useState<Partial<DebtItem>>({});

  // Meeting agenda
  const [meetingAgenda, setMeetingAgenda] = useState<MeetingAgendaItem[]>(DEFAULT_MEETING_AGENDA);
  const [newAgendaItem, setNewAgendaItem] = useState('');

  // Callbacks
  const handleYourAnswer = useCallback((questionId: string, answer: 'A' | 'B') => {
    setYourAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [...filtered, { questionId, answer }];
    });
  }, []);

  const handlePartnerAnswer = useCallback((questionId: string, answer: 'A' | 'B') => {
    setPartnerAnswers((prev) => {
      const filtered = prev.filter((a) => a.questionId !== questionId);
      return [...filtered, { questionId, answer }];
    });
  }, []);

  const toggleDiscussed = useCallback((questionId: string) => {
    setDiscussedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const updateYourPriority = useCallback((id: string, rank: number) => {
    setYourPriorities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rank } : p))
    );
  }, []);

  const updatePartnerPriority = useCallback((id: string, rank: number) => {
    setPartnerPriorities((prev) =>
      prev.map((p) => (p.id === id ? { ...p, rank } : p))
    );
  }, []);

  const addGoal = useCallback((person: 'you' | 'partner') => {
    const text = person === 'you' ? newGoalText.you : newGoalText.partner;
    if (!text.trim()) return;

    const newGoal: FinancialGoal = {
      id: `goal-${Date.now()}`,
      text: text.trim(),
      priority: 'medium',
    };

    if (person === 'you') {
      setYourGoals((prev) => [...prev, newGoal]);
      setNewGoalText((prev) => ({ ...prev, you: '' }));
    } else {
      setPartnerGoals((prev) => [...prev, newGoal]);
      setNewGoalText((prev) => ({ ...prev, partner: '' }));
    }
  }, [newGoalText]);

  const removeGoal = useCallback((person: 'you' | 'partner', goalId: string) => {
    if (person === 'you') {
      setYourGoals((prev) => prev.filter((g) => g.id !== goalId));
    } else {
      setPartnerGoals((prev) => prev.filter((g) => g.id !== goalId));
    }
  }, []);

  const addDebt = useCallback(() => {
    if (!showDebtForm || !newDebt.description || !newDebt.amount || !newDebt.type) return;

    const debt: DebtItem = {
      id: `debt-${Date.now()}`,
      description: newDebt.description,
      amount: newDebt.amount,
      type: newDebt.type as DebtItem['type'],
    };

    if (showDebtForm === 'you') {
      setYourDebts((prev) => [...prev, debt]);
    } else {
      setPartnerDebts((prev) => [...prev, debt]);
    }

    setNewDebt({});
    setShowDebtForm(null);
  }, [showDebtForm, newDebt]);

  const removeDebt = useCallback((person: 'you' | 'partner', debtId: string) => {
    if (person === 'you') {
      setYourDebts((prev) => prev.filter((d) => d.id !== debtId));
    } else {
      setPartnerDebts((prev) => prev.filter((d) => d.id !== debtId));
    }
  }, []);

  const toggleAgendaItem = useCallback((itemId: string) => {
    setMeetingAgenda((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  }, []);

  const addAgendaItem = useCallback(() => {
    if (!newAgendaItem.trim()) return;
    setMeetingAgenda((prev) => [
      ...prev,
      { id: `agenda-${Date.now()}`, text: newAgendaItem.trim(), completed: false },
    ]);
    setNewAgendaItem('');
  }, [newAgendaItem]);

  const resetAgenda = useCallback(() => {
    setMeetingAgenda(DEFAULT_MEETING_AGENDA.map((item) => ({ ...item, completed: false })));
  }, []);

  // Computed values
  const yourProfile = useMemo(
    () => (yourAnswers.length === QUIZ_QUESTIONS.length ? getPersonalityProfile(yourAnswers) : null),
    [yourAnswers]
  );

  const partnerProfile = useMemo(
    () => (partnerAnswers.length === QUIZ_QUESTIONS.length ? getPersonalityProfile(partnerAnswers) : null),
    [partnerAnswers]
  );

  const compatibility = useMemo(
    () =>
      yourProfile && partnerProfile
        ? calculateCompatibility(yourProfile.traits, partnerProfile.traits)
        : null,
    [yourProfile, partnerProfile]
  );

  const budgetAlignment = useMemo(
    () => findBudgetAlignment(yourPriorities, partnerPriorities),
    [yourPriorities, partnerPriorities]
  );

  const yourTotalDebt = useMemo(() => yourDebts.reduce((sum, d) => sum + d.amount, 0), [yourDebts]);
  const partnerTotalDebt = useMemo(() => partnerDebts.reduce((sum, d) => sum + d.amount, 0), [partnerDebts]);

  const commonGoals = useMemo(() => {
    const yourGoalTexts = new Set(yourGoals.map((g) => g.text.toLowerCase()));
    return partnerGoals.filter((g) => yourGoalTexts.has(g.text.toLowerCase()));
  }, [yourGoals, partnerGoals]);

  return (
    <Card className={cn('border-2 border-pink-200 dark:border-pink-800', className)}>
      <CardHeader className="bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-950/30 dark:to-purple-950/30 rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/50">
            <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <CardTitle className="text-xl">Couples Financial Compatibility Check</CardTitle>
            <CardDescription className="text-pink-700 dark:text-pink-300">
              Money is the #1 cause of divorce. Prevent money fights before they start.
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-4 md:grid-cols-8 gap-1 h-auto p-1">
            <TabsTrigger value="quiz" className="flex flex-col items-center gap-1 py-2">
              <Users className="h-4 w-4" />
              <span className="text-xs">Quiz</span>
            </TabsTrigger>
            <TabsTrigger value="discuss" className="flex flex-col items-center gap-1 py-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">Discuss</span>
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex flex-col items-center gap-1 py-2">
              <Wallet className="h-4 w-4" />
              <span className="text-xs">Accounts</span>
            </TabsTrigger>
            <TabsTrigger value="budget" className="flex flex-col items-center gap-1 py-2">
              <Scale className="h-4 w-4" />
              <span className="text-xs">Budget</span>
            </TabsTrigger>
            <TabsTrigger value="goals" className="flex flex-col items-center gap-1 py-2">
              <Target className="h-4 w-4" />
              <span className="text-xs">Goals</span>
            </TabsTrigger>
            <TabsTrigger value="debt" className="flex flex-col items-center gap-1 py-2">
              <CreditCard className="h-4 w-4" />
              <span className="text-xs">Debt</span>
            </TabsTrigger>
            <TabsTrigger value="meeting" className="flex flex-col items-center gap-1 py-2">
              <Calendar className="h-4 w-4" />
              <span className="text-xs">Meeting</span>
            </TabsTrigger>
            <TabsTrigger value="help" className="flex flex-col items-center gap-1 py-2">
              <HelpCircle className="h-4 w-4" />
              <span className="text-xs">Help</span>
            </TabsTrigger>
          </TabsList>

          {/* Quiz Tab */}
          <TabsContent value="quiz" className="space-y-6">
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>Money Personality Quiz</AlertTitle>
              <AlertDescription>
                Discover your money personalities to understand how you each approach finances.
                Answer honestly - there are no right or wrong answers!
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PersonalityQuiz
                person="You"
                answers={yourAnswers}
                onAnswer={handleYourAnswer}
                profile={yourProfile}
              />
              <PersonalityQuiz
                person="Partner"
                answers={partnerAnswers}
                onAnswer={handlePartnerAnswer}
                profile={partnerProfile}
              />
            </div>

            {compatibility && (
              <Card className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/30 dark:to-blue-950/30 border-2 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-green-600 dark:text-green-400" />
                    Your Compatibility Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Progress value={compatibility.score} className="h-4" />
                    </div>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {compatibility.score}%
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                    <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <p className={TYPOGRAPHY.metricLabel}>Your Style</p>
                      <p className={cn(TYPOGRAPHY.metricSmall, 'text-blue-700 dark:text-blue-300')}>
                        {yourProfile?.summary}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <p className={TYPOGRAPHY.metricLabel}>Partner&#39;s Style</p>
                      <p className={cn(TYPOGRAPHY.metricSmall, 'text-purple-700 dark:text-purple-300')}>
                        {partnerProfile?.summary}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 pt-4">
                    <p className={TYPOGRAPHY.sectionHeader}>Insights</p>
                    {compatibility.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 mt-1 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <span className={TYPOGRAPHY.body}>{insight}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discuss" className="space-y-6">
            <Alert className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <MessageCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle>Discussion Starter Questions</AlertTitle>
              <AlertDescription>
                Have an open, judgment-free conversation. Check off each question after you have discussed it.
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <p className={TYPOGRAPHY.bodyMuted}>
                {discussedQuestions.size} of {DISCUSSION_QUESTIONS.length} discussed
              </p>
              <Progress value={(discussedQuestions.size / DISCUSSION_QUESTIONS.length) * 100} className="w-32 h-2" />
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {DISCUSSION_QUESTIONS.map((question) => {
                const Icon = question.icon;
                const isDiscussed = discussedQuestions.has(question.id);

                return (
                  <AccordionItem
                    key={question.id}
                    value={question.id}
                    className={cn(
                      'border-2 rounded-lg overflow-hidden transition-all',
                      isDiscussed
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                        : 'bg-background border-border'
                    )}
                  >
                    <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-black/5 dark:hover:bg-white/5">
                      <div className="flex items-center gap-3 w-full">
                        <div className={cn(
                          'p-2 rounded-lg',
                          isDiscussed ? 'bg-green-100 dark:bg-green-900/50' : 'bg-muted'
                        )}>
                          {isDiscussed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className={cn(TYPOGRAPHY.body, 'font-medium', isDiscussed && 'text-green-700 dark:text-green-300')}>
                            {question.question}
                          </p>
                          <p className={TYPOGRAPHY.helperText}>{question.subtext}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-2">
                        <Separator />
                        <div className="space-y-2">
                          <p className={cn(TYPOGRAPHY.subSectionHeader, 'flex items-center gap-2')}>
                            <Lightbulb className="h-4 w-4" />
                            Tips for this Discussion
                          </p>
                          <ul className="space-y-1">
                            {question.tips.map((tip, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <ArrowRight className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                                <span className={TYPOGRAPHY.bodyMuted}>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <Button
                          variant={isDiscussed ? 'outline' : 'default'}
                          className="w-full"
                          onClick={() => toggleDiscussed(question.id)}
                        >
                          {isDiscussed ? (
                            <>
                              <X className="h-4 w-4 mr-2" />
                              Mark as Not Discussed
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              We Discussed This
                            </>
                          )}
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </TabsContent>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-6">
            <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <Wallet className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertTitle>Joint vs Separate Accounts</AlertTitle>
              <AlertDescription>
                There is no one-size-fits-all answer. Choose what works for your relationship.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4">
              {ACCOUNT_OPTIONS.map((option) => (
                <Card
                  key={option.value}
                  className={cn(
                    'cursor-pointer transition-all hover:shadow-md',
                    selectedAccountStructure === option.value
                      ? 'ring-2 ring-purple-500 border-purple-500'
                      : 'hover:border-purple-300 dark:hover:border-purple-700'
                  )}
                  onClick={() => setSelectedAccountStructure(option.value)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'p-2 rounded-lg',
                          selectedAccountStructure === option.value
                            ? 'bg-purple-100 dark:bg-purple-900/50'
                            : 'bg-muted'
                        )}>
                          <Wallet className={cn(
                            'h-5 w-5',
                            selectedAccountStructure === option.value
                              ? 'text-purple-600 dark:text-purple-400'
                              : 'text-muted-foreground'
                          )} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{option.label}</CardTitle>
                          <CardDescription>{option.description}</CardDescription>
                        </div>
                      </div>
                      {selectedAccountStructure === option.value && (
                        <CheckCircle2 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-green-700 dark:text-green-300 mb-2')}>
                          Pros
                        </p>
                        <ul className="space-y-1">
                          {option.pros.map((pro, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-600 dark:text-green-400 flex-shrink-0" />
                              <span className={TYPOGRAPHY.bodyMuted}>{pro}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-red-700 dark:text-red-300 mb-2')}>
                          Cons
                        </p>
                        <ul className="space-y-1">
                          {option.cons.map((con, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <X className="h-4 w-4 mt-0.5 text-red-600 dark:text-red-400 flex-shrink-0" />
                              <span className={TYPOGRAPHY.bodyMuted}>{con}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                      <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-blue-700 dark:text-blue-300 mb-1')}>
                        Best For
                      </p>
                      <p className={TYPOGRAPHY.bodyMuted}>{option.bestFor}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-6">
            <Alert className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
              <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <AlertTitle>Budget Alignment Tool</AlertTitle>
              <AlertDescription>
                Both rank your spending priorities. See where you agree and where you might need to compromise.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PriorityRanker
                person="You"
                priorities={yourPriorities}
                onUpdateRank={updateYourPriority}
              />
              <PriorityRanker
                person="Partner"
                priorities={partnerPriorities}
                onUpdateRank={updatePartnerPriority}
              />
            </div>

            {(budgetAlignment.agreements.length > 0 || budgetAlignment.conflicts.length > 0) && (
              <Card className="bg-gradient-to-r from-emerald-50 to-amber-50 dark:from-emerald-950/30 dark:to-amber-950/30 border-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Scale className="h-5 w-5" />
                    Budget Alignment Results
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {budgetAlignment.agreements.length > 0 && (
                    <div className="p-4 rounded-lg bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800">
                      <p className={cn(TYPOGRAPHY.sectionHeader, 'text-green-800 dark:text-green-200 mb-2')}>
                        You Both Agree On:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {budgetAlignment.agreements.map((item) => (
                          <Badge key={item} variant="outline" className="bg-green-50 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {budgetAlignment.conflicts.length > 0 && (
                    <div className="p-4 rounded-lg bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
                      <p className={cn(TYPOGRAPHY.sectionHeader, 'text-amber-800 dark:text-amber-200 mb-2')}>
                        Discussion Needed:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {budgetAlignment.conflicts.map((item) => (
                          <Badge key={item} variant="outline" className="bg-amber-50 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700">
                            <MessageCircle className="h-3 w-3 mr-1" />
                            {item}
                          </Badge>
                        ))}
                      </div>
                      <p className={cn(TYPOGRAPHY.helperText, 'mt-2')}>
                        These areas have different priority levels - discuss and find a middle ground.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Goals Tab */}
          <TabsContent value="goals" className="space-y-6">
            <Alert className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertTitle>Financial Goals Alignment</AlertTitle>
              <AlertDescription>
                Each person adds their top financial goals. Find common ground and create shared goals.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Goals */}
              <div className="space-y-4">
                <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
                  <Target className="h-5 w-5" />
                  Your Goals
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a financial goal..."
                    value={newGoalText.you}
                    onChange={(e) => setNewGoalText((prev) => ({ ...prev, you: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal('you')}
                  />
                  <Button onClick={() => addGoal('you')}>Add</Button>
                </div>
                <div className="space-y-2">
                  {yourGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                    >
                      <Target className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className={cn(TYPOGRAPHY.body, 'flex-1')}>{goal.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGoal('you', goal.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {yourGoals.length === 0 && (
                    <p className={cn(TYPOGRAPHY.bodyMuted, 'text-center py-4')}>
                      Add your top financial goals
                    </p>
                  )}
                </div>
              </div>

              {/* Partner Goals */}
              <div className="space-y-4">
                <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
                  <Target className="h-5 w-5" />
                  Partner&#39;s Goals
                </h4>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add a financial goal..."
                    value={newGoalText.partner}
                    onChange={(e) => setNewGoalText((prev) => ({ ...prev, partner: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal('partner')}
                  />
                  <Button onClick={() => addGoal('partner')}>Add</Button>
                </div>
                <div className="space-y-2">
                  {partnerGoals.map((goal) => (
                    <div
                      key={goal.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800"
                    >
                      <Target className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className={cn(TYPOGRAPHY.body, 'flex-1')}>{goal.text}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeGoal('partner', goal.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  {partnerGoals.length === 0 && (
                    <p className={cn(TYPOGRAPHY.bodyMuted, 'text-center py-4')}>
                      Add partner&#39;s top financial goals
                    </p>
                  )}
                </div>
              </div>
            </div>

            {commonGoals.length > 0 && (
              <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-200 dark:border-green-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <Award className="h-5 w-5" />
                    Shared Goals Found!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {commonGoals.map((goal) => (
                      <Badge
                        key={goal.id}
                        className="bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700 px-4 py-2"
                      >
                        <Heart className="h-4 w-4 mr-2" />
                        {goal.text}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Debt Tab */}
          <TabsContent value="debt" className="space-y-6">
            <Alert className="bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <CreditCard className="h-4 w-4 text-red-600 dark:text-red-400" />
              <AlertTitle>Debt Disclosure</AlertTitle>
              <AlertDescription>
                &ldquo;Your debt becomes our problem.&rdquo; Pre-marriage debt transparency builds trust and helps plan together.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Your Debts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
                    <CreditCard className="h-5 w-5" />
                    Your Debt
                  </h4>
                  <Badge variant="outline" className={yourTotalDebt > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' : ''}>
                    Total: {fmt(yourTotalDebt)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDebtForm(showDebtForm === 'you' ? null : 'you')}
                >
                  {showDebtForm === 'you' ? 'Cancel' : 'Add Debt'}
                </Button>
                {showDebtForm === 'you' && (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g., Federal Student Loans"
                        value={newDebt.description || ''}
                        onChange={(e) => setNewDebt((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          placeholder="25000"
                          value={newDebt.amount || ''}
                          onChange={(e) => setNewDebt((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newDebt.type || ''}
                          onValueChange={(v) => setNewDebt((prev) => ({ ...prev, type: v as DebtItem['type'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEBT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={addDebt} className="w-full">Add Debt</Button>
                  </div>
                )}
                <div className="space-y-2">
                  {yourDebts.map((debt) => {
                    const typeInfo = DEBT_TYPES.find((t) => t.value === debt.type);
                    const Icon = typeInfo?.icon || FileText;
                    return (
                      <div
                        key={debt.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"
                      >
                        <Icon className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className={TYPOGRAPHY.body}>{debt.description}</p>
                          <p className={TYPOGRAPHY.helperText}>{typeInfo?.label}</p>
                        </div>
                        <span className={cn(TYPOGRAPHY.metricSmall, 'text-red-700 dark:text-red-300')}>
                          {fmt(debt.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDebt('you', debt.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Partner Debts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className={cn(TYPOGRAPHY.sectionHeader, 'flex items-center gap-2')}>
                    <CreditCard className="h-5 w-5" />
                    Partner&#39;s Debt
                  </h4>
                  <Badge variant="outline" className={partnerTotalDebt > 0 ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300' : ''}>
                    Total: {fmt(partnerTotalDebt)}
                  </Badge>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowDebtForm(showDebtForm === 'partner' ? null : 'partner')}
                >
                  {showDebtForm === 'partner' ? 'Cancel' : 'Add Debt'}
                </Button>
                {showDebtForm === 'partner' && (
                  <div className="p-4 rounded-lg border bg-muted/30 space-y-3">
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Input
                        placeholder="e.g., Credit Card Balance"
                        value={newDebt.description || ''}
                        onChange={(e) => setNewDebt((prev) => ({ ...prev, description: e.target.value }))}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <Input
                          type="number"
                          placeholder="5000"
                          value={newDebt.amount || ''}
                          onChange={(e) => setNewDebt((prev) => ({ ...prev, amount: Number(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                          value={newDebt.type || ''}
                          onValueChange={(v) => setNewDebt((prev) => ({ ...prev, type: v as DebtItem['type'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {DEBT_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button onClick={addDebt} className="w-full">Add Debt</Button>
                  </div>
                )}
                <div className="space-y-2">
                  {partnerDebts.map((debt) => {
                    const typeInfo = DEBT_TYPES.find((t) => t.value === debt.type);
                    const Icon = typeInfo?.icon || FileText;
                    return (
                      <div
                        key={debt.id}
                        className="flex items-center gap-3 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800"
                      >
                        <Icon className="h-4 w-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className={TYPOGRAPHY.body}>{debt.description}</p>
                          <p className={TYPOGRAPHY.helperText}>{typeInfo?.label}</p>
                        </div>
                        <span className={cn(TYPOGRAPHY.metricSmall, 'text-orange-700 dark:text-orange-300')}>
                          {fmt(debt.amount)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDebt('partner', debt.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {(yourTotalDebt > 0 || partnerTotalDebt > 0) && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-2">
                <CardHeader>
                  <CardTitle>Combined Debt Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-4 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <p className={TYPOGRAPHY.metricLabel}>Your Debt</p>
                      <p className={cn(TYPOGRAPHY.metricMedium, 'text-blue-700 dark:text-blue-300')}>
                        {fmt(yourTotalDebt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                      <p className={TYPOGRAPHY.metricLabel}>Partner Debt</p>
                      <p className={cn(TYPOGRAPHY.metricMedium, 'text-purple-700 dark:text-purple-300')}>
                        {fmt(partnerTotalDebt)}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-pink-100 dark:bg-pink-900/30">
                      <p className={TYPOGRAPHY.metricLabel}>Combined</p>
                      <p className={cn(TYPOGRAPHY.metricMedium, 'text-pink-700 dark:text-pink-300')}>
                        {fmt(yourTotalDebt + partnerTotalDebt)}
                      </p>
                    </div>
                  </div>
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      Discuss how you will handle existing debt together. Options include:
                      keeping debt separate, paying together, or a hybrid approach.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Meeting Tab */}
          <TabsContent value="meeting" className="space-y-6">
            <Alert className="bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertTitle>Monthly Money Meeting Template</AlertTitle>
              <AlertDescription>
                Schedule a regular &ldquo;money date&rdquo; to review finances together. Make it positive - grab coffee or wine!
              </AlertDescription>
            </Alert>

            <div className="flex items-center justify-between">
              <div>
                <p className={TYPOGRAPHY.bodyMuted}>
                  {meetingAgenda.filter((i) => i.completed).length} of {meetingAgenda.length} items completed
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={resetAgenda}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset Agenda
              </Button>
            </div>

            <Progress
              value={(meetingAgenda.filter((i) => i.completed).length / meetingAgenda.length) * 100}
              className="h-3"
            />

            <div className="space-y-3">
              {meetingAgenda.map((item, index) => (
                <div
                  key={item.id}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all hover:shadow-sm',
                    item.completed
                      ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                      : 'bg-background border-border hover:border-green-300 dark:hover:border-green-700'
                  )}
                  onClick={() => toggleAgendaItem(item.id)}
                >
                  <div className={cn(
                    'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold',
                    item.completed
                      ? 'bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {item.completed ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                  </div>
                  <span className={cn(
                    TYPOGRAPHY.body,
                    'flex-1',
                    item.completed && 'line-through text-muted-foreground'
                  )}>
                    {item.text}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Input
                placeholder="Add custom agenda item..."
                value={newAgendaItem}
                onChange={(e) => setNewAgendaItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addAgendaItem()}
              />
              <Button onClick={addAgendaItem}>Add</Button>
            </div>

            <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className={cn(TYPOGRAPHY.sectionHeader, 'text-amber-800 dark:text-amber-200')}>
                      Money Meeting Tips
                    </p>
                    <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1')}>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Schedule it monthly on the same day (e.g., first Sunday)
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Keep it to 30-45 minutes max
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Start and end with something positive
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        Use &ldquo;we&rdquo; language, not &ldquo;you&rdquo; language
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                        If tensions rise, take a break and revisit later
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Help Tab */}
          <TabsContent value="help" className="space-y-6">
            <Alert className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
              <HelpCircle className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <AlertTitle>When to Get Professional Help</AlertTitle>
              <AlertDescription>
                &ldquo;It&#39;s not about the money, it&#39;s about the meaning.&rdquo; Sometimes professional guidance makes all the difference.
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50">
                      <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <CardTitle>Financial Therapist</CardTitle>
                      <CardDescription>Money + Emotions</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className={TYPOGRAPHY.bodyMuted}>
                    Combines financial planning with therapeutic techniques to address the emotional
                    side of money decisions.
                  </p>
                  <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-blue-700 dark:text-blue-300')}>
                    Consider when:
                  </p>
                  <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1')}>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Money arguments keep repeating
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      One or both have money trauma
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Financial infidelity has occurred
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Compulsive spending or extreme frugality
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-100 dark:bg-pink-900/50">
                      <Heart className="h-6 w-6 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div>
                      <CardTitle>Couples Counselor</CardTitle>
                      <CardDescription>With Money Specialty</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className={TYPOGRAPHY.bodyMuted}>
                    Focuses on relationship dynamics with expertise in financial conflict resolution.
                  </p>
                  <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-pink-700 dark:text-pink-300')}>
                    Consider when:
                  </p>
                  <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1')}>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Money discussions always lead to fights
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Power imbalance around finances
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      One partner controls or hides money
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Major life transitions (marriage, kids, inheritance)
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/50">
                      <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <CardTitle>Fee-Only Financial Planner</CardTitle>
                      <CardDescription>Fiduciary Advisor</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className={TYPOGRAPHY.bodyMuted}>
                    Provides objective financial advice without sales commissions. Works in your best interest.
                  </p>
                  <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-green-700 dark:text-green-300')}>
                    Consider when:
                  </p>
                  <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1')}>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Merging complex financial situations
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Need help creating a joint financial plan
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Significant assets or income disparity
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Want neutral third-party guidance
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-2 hover:shadow-lg transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/50">
                      <Shield className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <CardTitle>Estate Planning Attorney</CardTitle>
                      <CardDescription>Legal Protection</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className={TYPOGRAPHY.bodyMuted}>
                    Helps with prenups, wills, trusts, and other legal financial protections.
                  </p>
                  <p className={cn(TYPOGRAPHY.subSectionHeader, 'text-amber-700 dark:text-amber-300')}>
                    Consider when:
                  </p>
                  <ul className={cn(TYPOGRAPHY.bodyMuted, 'space-y-1')}>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Considering a prenuptial agreement
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Blending families with existing assets
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Business ownership involved
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      Inheritance or trust considerations
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-2 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-purple-100 dark:bg-purple-900/50">
                    <Heart className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <p className={cn(TYPOGRAPHY.metricMedium, 'text-purple-800 dark:text-purple-200')}>
                      Remember: It&#39;s About the Relationship
                    </p>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Money disagreements are rarely just about dollars and cents. They are about values,
                      security, freedom, and trust. Approaching finances as a team - with compassion and
                      curiosity rather than judgment - strengthens both your finances AND your relationship.
                    </p>
                    <p className={cn(TYPOGRAPHY.body, 'font-medium text-purple-700 dark:text-purple-300 pt-2')}>
                      You are on the same team. Act like it.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <Separator className="my-6" />
        <p className={cn(TYPOGRAPHY.helperText, 'text-center')}>
          This tool is for educational purposes. Consider professional guidance for complex situations.
        </p>
      </CardContent>
    </Card>
  );
}

export default CouplesFinances;
