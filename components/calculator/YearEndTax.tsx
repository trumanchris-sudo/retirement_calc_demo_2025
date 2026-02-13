'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Calendar,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Gift,
  Heart,
  Briefcase,
  Clock,
  Printer,
  Mail,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  RETIREMENT_LIMITS_2026,
  HSA_LIMITS_2026,
  FSA_LIMITS_2026,
} from '@/lib/constants/tax2026';
import { LTCG_BRACKETS, TAX_BRACKETS } from '@/lib/constants';

// =============================================================================
// TYPES
// =============================================================================

type FilingStatus = 'single' | 'married';

interface UserSituation {
  filingStatus: FilingStatus;
  age: number;
  spouseAge?: number;
  income: number;
  pretaxBalance: number;
  rothBalance: number;
  taxableBalance: number;
  has401k: boolean;
  hasHSA: boolean;
  hasFSA: boolean;
  isFirstRMDYear: boolean;
  hasUnrealizedLosses: boolean;
  hasUnrealizedGains: boolean;
  estimatedLosses: number;
  estimatedGains: number;
  hasCharitableIntent: boolean;
  isBusinessOwner: boolean;
  expectsBonus: boolean;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  deadline: string;
  deadlineDate: Date;
  icon: React.ComponentType<any>;
  category: 'retirement' | 'investments' | 'giving' | 'healthcare' | 'income' | 'business';
  dollarImpact: (situation: UserSituation) => number;
  isApplicable: (situation: UserSituation) => boolean;
  priority: 'high' | 'medium' | 'low';
  details: string[];
}

// =============================================================================
// TAX PLANNING CHECKLIST ITEMS
// =============================================================================

const CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: 'max-401k',
    title: 'Max Out 401(k) Contributions',
    description: 'Employee contributions must be made by December 31.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: DollarSign,
    category: 'retirement',
    dollarImpact: (situation) => {
      const limit = situation.age >= 60 && situation.age <= 63
        ? RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63
        : situation.age >= 50
          ? RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT + RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS
          : RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT;
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.24;
      return Math.round(limit * marginalRate);
    },
    isApplicable: (situation) => situation.has401k,
    priority: 'high',
    details: [
      `2026 employee limit: $${RETIREMENT_LIMITS_2026.TRADITIONAL_401K_LIMIT.toLocaleString()}`,
      `Age 50+ catch-up: +$${RETIREMENT_LIMITS_2026.CATCHUP_50_PLUS.toLocaleString()}`,
      `Age 60-63 "super catch-up": +$${RETIREMENT_LIMITS_2026.CATCHUP_60_TO_63.toLocaleString()}`,
      'Reduces taxable income dollar-for-dollar',
      'Check final paycheck for room to increase',
    ],
  },
  {
    id: 'ira-contribution',
    title: 'Plan IRA Contributions',
    description: 'IRA deadline is April 15, but planning now ensures you have funds available.',
    deadline: 'April 15 (next year)',
    deadlineDate: new Date(new Date().getFullYear() + 1, 3, 15),
    icon: Calendar,
    category: 'retirement',
    dollarImpact: (situation) => {
      const limit = situation.age >= 50
        ? RETIREMENT_LIMITS_2026.IRA_LIMIT + RETIREMENT_LIMITS_2026.IRA_CATCHUP_50_PLUS
        : RETIREMENT_LIMITS_2026.IRA_LIMIT;
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.22;
      return Math.round(limit * marginalRate);
    },
    isApplicable: () => true,
    priority: 'medium',
    details: [
      `2026 IRA limit: $${RETIREMENT_LIMITS_2026.IRA_LIMIT.toLocaleString()}`,
      `Age 50+ catch-up: +$${RETIREMENT_LIMITS_2026.IRA_CATCHUP_50_PLUS.toLocaleString()}`,
      'Traditional IRA may be deductible depending on income and workplace plan',
      'Roth IRA contributions are not deductible but grow tax-free',
      'Consider backdoor Roth if income exceeds limits',
    ],
  },
  {
    id: 'tax-loss-harvest',
    title: 'Harvest Tax Losses',
    description: 'Sell investments with losses to offset gains and reduce taxable income.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: TrendingDown,
    category: 'investments',
    dollarImpact: (situation) => {
      if (!situation.hasUnrealizedLosses) return 0;
      // Can offset gains + up to $3,000 ordinary income
      const gainsOffset = Math.min(situation.estimatedLosses, situation.estimatedGains);
      const ordinaryOffset = Math.min(3000, Math.max(0, situation.estimatedLosses - gainsOffset));
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.22;
      const ltcgBrackets = LTCG_BRACKETS[situation.filingStatus];
      const ltcgRate = ltcgBrackets.find(b => situation.income <= b.limit)?.rate || 0.15;
      return Math.round(gainsOffset * ltcgRate + ordinaryOffset * marginalRate);
    },
    isApplicable: (situation) => situation.hasUnrealizedLosses || situation.taxableBalance > 50000,
    priority: 'high',
    details: [
      'Losses offset capital gains first',
      'Up to $3,000 excess losses offset ordinary income',
      'Unused losses carry forward indefinitely',
      'Watch 30-day wash sale rule when repurchasing',
      'Consider tax-loss harvesting partners (similar but not identical funds)',
    ],
  },
  {
    id: 'harvest-gains',
    title: 'Harvest Capital Gains (0% Bracket)',
    description: 'If in the 0% LTCG bracket, sell winners to reset cost basis tax-free.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: TrendingUp,
    category: 'investments',
    dollarImpact: (situation) => {
      const ltcgBrackets = LTCG_BRACKETS[situation.filingStatus];
      const zeroRate = ltcgBrackets[0].limit;
      const taxableIncome = situation.income - TAX_BRACKETS[situation.filingStatus].deduction;
      if (taxableIncome >= zeroRate) return 0;
      const roomInZeroBracket = zeroRate - taxableIncome;
      const gainsToHarvest = Math.min(roomInZeroBracket, situation.estimatedGains);
      // Future tax savings: avoiding 15% tax later
      return Math.round(gainsToHarvest * 0.15);
    },
    isApplicable: (situation) => {
      const ltcgBrackets = LTCG_BRACKETS[situation.filingStatus];
      const zeroRate = ltcgBrackets[0].limit;
      const taxableIncome = situation.income - TAX_BRACKETS[situation.filingStatus].deduction;
      return taxableIncome < zeroRate && situation.hasUnrealizedGains;
    },
    priority: 'high',
    details: [
      `2026 0% LTCG threshold (single): $${LTCG_BRACKETS.single[0].limit.toLocaleString()}`,
      `2026 0% LTCG threshold (married): $${LTCG_BRACKETS.married[0].limit.toLocaleString()}`,
      'Resets cost basis for future appreciation',
      'No wash sale rule for gains',
      'Can immediately repurchase the same investment',
    ],
  },
  {
    id: 'roth-conversion',
    title: 'Execute Roth Conversions',
    description: 'Convert pre-tax IRA/401(k) to Roth. Last chance this tax year.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: TrendingUp,
    category: 'retirement',
    dollarImpact: (situation) => {
      if (situation.pretaxBalance < 10000) return 0;
      // Estimate benefit: filling up to 24% bracket saves future taxes at potentially higher rates
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const currentBracket = brackets.rates.findIndex(b => situation.income <= b.limit);
      const nextBracket = brackets.rates[currentBracket];
      const headroom = nextBracket ? nextBracket.limit - situation.income : 50000;
      const conversionAmount = Math.min(headroom, situation.pretaxBalance);
      // Assume 32% future rate vs current rate
      const currentRate = nextBracket?.rate || 0.22;
      const futureRate = 0.32;
      return Math.round(conversionAmount * (futureRate - currentRate));
    },
    isApplicable: (situation) => situation.pretaxBalance > 10000,
    priority: 'high',
    details: [
      'Fill up lower tax brackets before year-end',
      'Converted amount taxed as ordinary income',
      'Consider bracket headroom before converting',
      'Useful for low-income years or early retirement',
      'Reduces future RMDs',
    ],
  },
  {
    id: 'charitable-giving',
    title: 'Complete Charitable Giving',
    description: 'Bunch donations, fund DAF, or donate appreciated stock.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: Heart,
    category: 'giving',
    dollarImpact: (situation) => {
      if (!situation.hasCharitableIntent) return 0;
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.24;
      // Assume $10K donation for estimation
      const donationAmount = 10000;
      // Extra benefit if donating appreciated stock: avoid LTCG
      const stockBenefit = situation.hasUnrealizedGains ? donationAmount * 0.15 : 0;
      return Math.round(donationAmount * marginalRate + stockBenefit);
    },
    isApplicable: (situation) => situation.hasCharitableIntent,
    priority: 'medium',
    details: [
      'Bunching: combine multiple years of giving into one year',
      'Donor Advised Fund (DAF): get deduction now, distribute later',
      'Donate appreciated stock: avoid capital gains + get full deduction',
      'QCD: Age 70.5+ can donate directly from IRA (counts toward RMD)',
      'Standard deduction threshold: itemizing may be needed',
    ],
  },
  {
    id: 'rmd-deadline',
    title: 'Take Required Minimum Distribution (RMD)',
    description: 'RMD deadline is December 31 (April 1 for first year).',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: AlertTriangle,
    category: 'retirement',
    dollarImpact: (situation) => {
      if (situation.age < 73) return 0;
      // 50% penalty for missing RMD
      const rmdDivisor = 26.5 - (situation.age - 73) * 0.9; // Simplified
      const estimatedRMD = situation.pretaxBalance / Math.max(rmdDivisor, 10);
      return Math.round(estimatedRMD * 0.5); // Penalty avoided
    },
    isApplicable: (situation) => situation.age >= 73,
    priority: 'high',
    details: [
      'RMD age is 73 (SECURE Act 2.0)',
      'First RMD can be delayed to April 1 of next year',
      'Warning: delaying first RMD means 2 RMDs in year 2',
      'Missing RMD penalty: 25% (reduced from 50%)',
      'Consider Qualified Charitable Distribution (QCD) to satisfy RMD',
    ],
  },
  {
    id: 'fsa-spending',
    title: 'Use FSA Balance',
    description: 'Health FSA funds typically expire December 31 or March 15.',
    deadline: 'December 31 (or grace period)',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: Heart,
    category: 'healthcare',
    dollarImpact: (situation) => {
      if (!situation.hasFSA) return 0;
      // Assume average unused balance
      return FSA_LIMITS_2026.HEALTH_FSA_CARRYOVER;
    },
    isApplicable: (situation) => situation.hasFSA,
    priority: 'high',
    details: [
      `2026 Health FSA limit: $${FSA_LIMITS_2026.HEALTH_FSA.toLocaleString()}`,
      `Carryover limit: $${FSA_LIMITS_2026.HEALTH_FSA_CARRYOVER.toLocaleString()}`,
      'Use it or lose it (with some carryover)',
      'Stock up on eligible OTC items',
      'Schedule medical appointments before deadline',
    ],
  },
  {
    id: 'hsa-contribution',
    title: 'Max HSA Contributions',
    description: 'HSA contributions can be made until April 15 for prior year.',
    deadline: 'April 15 (next year)',
    deadlineDate: new Date(new Date().getFullYear() + 1, 3, 15),
    icon: Heart,
    category: 'healthcare',
    dollarImpact: (situation) => {
      if (!situation.hasHSA) return 0;
      const limit = situation.filingStatus === 'married'
        ? HSA_LIMITS_2026.FAMILY + (situation.age >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0)
        : HSA_LIMITS_2026.SELF_ONLY + (situation.age >= 55 ? HSA_LIMITS_2026.CATCHUP_55_PLUS : 0);
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.22;
      // Triple tax benefit: income tax + 7.65% FICA (if payroll deduction)
      return Math.round(limit * (marginalRate + 0.0765));
    },
    isApplicable: (situation) => situation.hasHSA,
    priority: 'high',
    details: [
      `2026 self-only limit: $${HSA_LIMITS_2026.SELF_ONLY.toLocaleString()}`,
      `2026 family limit: $${HSA_LIMITS_2026.FAMILY.toLocaleString()}`,
      `Age 55+ catch-up: +$${HSA_LIMITS_2026.CATCHUP_55_PLUS.toLocaleString()}`,
      'Triple tax benefit: deductible, grows tax-free, tax-free withdrawals',
      'Invest HSA for long-term growth',
    ],
  },
  {
    id: 'gift-tax-exclusion',
    title: 'Make Annual Gifts',
    description: 'Gift tax exclusion resets January 1. Use it or lose it.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: Gift,
    category: 'giving',
    dollarImpact: (situation) => {
      // Estate tax benefit if estate is large
      const estateTaxRate = 0.40;
      const giftAmount = 18000; // Per recipient
      return Math.round(giftAmount * estateTaxRate);
    },
    isApplicable: (situation) => situation.taxableBalance > 500000 || situation.pretaxBalance > 1000000,
    priority: 'medium',
    details: [
      '2024 annual exclusion: $18,000 per recipient',
      '2025 annual exclusion: $19,000 per recipient (projected)',
      'Married couples can gift $36,000 per recipient (gift splitting)',
      'Removes assets and future appreciation from estate',
      'No gift tax return required if under exclusion',
    ],
  },
  {
    id: 'estimated-taxes',
    title: 'Pay Q4 Estimated Taxes',
    description: 'Fourth quarter estimated tax payment due January 15.',
    deadline: 'January 15',
    deadlineDate: new Date(new Date().getFullYear() + 1, 0, 15),
    icon: Calendar,
    category: 'income',
    dollarImpact: (situation) => {
      // Underpayment penalty avoidance
      const estimatedTax = situation.income * 0.25 * 0.25; // Rough Q4 estimate
      const penaltyRate = 0.08; // IRS underpayment rate
      return Math.round(estimatedTax * penaltyRate);
    },
    isApplicable: (situation) => situation.isBusinessOwner || situation.income > 200000,
    priority: 'medium',
    details: [
      'Due January 15 for Q4',
      'Use Form 1040-ES for calculations',
      'Safe harbor: 100% of prior year tax (110% if AGI > $150k)',
      'Consider increasing W-2 withholding instead',
      'Late payment penalty: ~8% annually',
    ],
  },
  {
    id: 'bonus-timing',
    title: 'Consider Bonus Timing',
    description: 'If possible, defer bonus to January to shift income.',
    deadline: 'Before bonus payout',
    deadlineDate: new Date(new Date().getFullYear(), 11, 15),
    icon: Clock,
    category: 'income',
    dollarImpact: (situation) => {
      if (!situation.expectsBonus) return 0;
      // Deferral benefit depends on current vs next year tax situation
      // Assume $20k bonus, 5% rate difference potential
      return Math.round(20000 * 0.05);
    },
    isApplicable: (situation) => situation.expectsBonus,
    priority: 'low',
    details: [
      'Constructive receipt doctrine applies',
      'Must be arranged before bonus is payable',
      'Consider if next year tax situation will be better',
      'May not be possible with most employers',
      'Consult HR about deferral options',
    ],
  },
  {
    id: 'business-expenses',
    title: 'Accelerate Business Deductions',
    description: 'Prepay expenses and purchase equipment before year-end.',
    deadline: 'December 31',
    deadlineDate: new Date(new Date().getFullYear(), 11, 31),
    icon: Briefcase,
    category: 'business',
    dollarImpact: (situation) => {
      if (!situation.isBusinessOwner) return 0;
      // Section 179 and acceleration benefits
      const brackets = TAX_BRACKETS[situation.filingStatus];
      const marginalRate = brackets.rates.find(b => situation.income <= b.limit)?.rate || 0.24;
      const estimatedAcceleration = 10000;
      return Math.round(estimatedAcceleration * marginalRate);
    },
    isApplicable: (situation) => situation.isBusinessOwner,
    priority: 'medium',
    details: [
      'Section 179 expensing for equipment',
      'Bonus depreciation (100% for 2022, phasing down)',
      'Prepay January rent, insurance, subscriptions',
      'Stock up on supplies',
      'Consider timing of large purchases',
    ],
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

interface YearEndTaxProps {
  /** User financial situation for personalization */
  situation?: Partial<UserSituation>;
  /** Callback when items are checked */
  onProgress?: (completedItems: string[]) => void;
}

export default function YearEndTax({ situation: providedSituation, onProgress }: YearEndTaxProps) {
  // Default situation for demonstration
  const defaultSituation: UserSituation = {
    filingStatus: 'married',
    age: 55,
    spouseAge: 53,
    income: 150000,
    pretaxBalance: 500000,
    rothBalance: 100000,
    taxableBalance: 200000,
    has401k: true,
    hasHSA: true,
    hasFSA: true,
    isFirstRMDYear: false,
    hasUnrealizedLosses: true,
    hasUnrealizedGains: true,
    estimatedLosses: 15000,
    estimatedGains: 25000,
    hasCharitableIntent: true,
    isBusinessOwner: false,
    expectsBonus: true,
  };

  const situation: UserSituation = { ...defaultSituation, ...providedSituation };

  // State
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showOnlyApplicable, setShowOnlyApplicable] = useState(true);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    return CHECKLIST_ITEMS.filter(item => {
      if (showOnlyApplicable && !item.isApplicable(situation)) return false;
      if (filterCategory !== 'all' && item.category !== filterCategory) return false;
      return true;
    }).sort((a, b) => {
      // Sort by priority, then by deadline
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return a.deadlineDate.getTime() - b.deadlineDate.getTime();
    });
  }, [situation, filterCategory, showOnlyApplicable]);

  // Calculate total potential savings
  const totalPotentialSavings = useMemo(() => {
    return filteredItems
      .filter(item => !completedItems.has(item.id))
      .reduce((sum, item) => sum + item.dollarImpact(situation), 0);
  }, [filteredItems, completedItems, situation]);

  const completedSavings = useMemo(() => {
    return filteredItems
      .filter(item => completedItems.has(item.id))
      .reduce((sum, item) => sum + item.dollarImpact(situation), 0);
  }, [filteredItems, completedItems, situation]);

  // Toggle item completion
  const toggleItem = useCallback((id: string) => {
    setCompletedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      if (onProgress) {
        onProgress(Array.from(newSet));
      }
      return newSet;
    });
  }, [onProgress]);

  // Toggle item expansion
  const toggleExpand = useCallback((id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // Print handler
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Email reminder handler
  const handleEmailReminder = useCallback(() => {
    const subject = encodeURIComponent('Year-End Tax Planning Checklist');
    const body = encodeURIComponent(
      `Here's your year-end tax planning checklist:\n\n` +
      filteredItems.map(item =>
        `${completedItems.has(item.id) ? '[x]' : '[ ]'} ${item.title} - ${item.deadline}\n    ${item.description}`
      ).join('\n\n') +
      `\n\nTotal potential savings: $${totalPotentialSavings.toLocaleString()}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [filteredItems, completedItems, totalPotentialSavings]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Days until end of year
  const daysUntilYearEnd = useMemo(() => {
    const now = new Date();
    const yearEnd = new Date(now.getFullYear(), 11, 31);
    const diff = yearEnd.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, []);

  // Category counts
  const categoryItems = useMemo(() => {
    const counts: Record<string, number> = { all: filteredItems.length };
    filteredItems.forEach(item => {
      counts[item.category] = (counts[item.category] || 0) + 1;
    });
    return counts;
  }, [filteredItems]);

  // Priority badge color
  const getPriorityColor = (priority: ChecklistItem['priority']) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  // Category icon and color
  const getCategoryStyle = (category: ChecklistItem['category']) => {
    switch (category) {
      case 'retirement':
        return { color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' };
      case 'investments':
        return { color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' };
      case 'giving':
        return { color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-900/20' };
      case 'healthcare':
        return { color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-900/20' };
      case 'income':
        return { color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' };
      case 'business':
        return { color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/20' };
    }
  };

  return (
    <div className="space-y-6 print:space-y-4">
      {/* Header */}
      <Card className="border-2 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Calendar className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-2xl">Year-End Tax Planning Checklist</CardTitle>
                <CardDescription className="text-base">
                  {daysUntilYearEnd > 0
                    ? `${daysUntilYearEnd} days until December 31`
                    : 'December 31 has passed'}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleEmailReminder}>
                <Mail className="h-4 w-4 mr-2" />
                Email Reminder
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Progress Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
              <p className="text-sm text-muted-foreground">Progress</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {completedItems.size}/{filteredItems.length}
              </p>
              <p className="text-xs text-muted-foreground">items completed</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {formatCurrency(totalPotentialSavings)}
              </p>
              <p className="text-xs text-muted-foreground">remaining to capture</p>
            </div>
            <div className="text-center p-4 bg-white dark:bg-gray-900 rounded-lg border">
              <p className="text-sm text-muted-foreground">Captured Savings</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {formatCurrency(completedSavings)}
              </p>
              <p className="text-xs text-muted-foreground">tax benefit secured</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${filteredItems.length > 0 ? (completedItems.size / filteredItems.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center print:hidden">
        <span className="text-sm font-medium">Filter:</span>
        {['all', 'retirement', 'investments', 'giving', 'healthcare', 'income', 'business'].map(category => (
          <Button
            key={category}
            variant={filterCategory === category ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterCategory(category)}
            className="capitalize"
          >
            {category} {categoryItems[category] ? `(${categoryItems[category]})` : ''}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showOnlyApplicable}
              onChange={(e) => setShowOnlyApplicable(e.target.checked)}
              className="rounded border-gray-300"
            />
            Show only applicable items
          </label>
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-3">
        {filteredItems.map(item => {
          const Icon = item.icon;
          const isCompleted = completedItems.has(item.id);
          const isExpanded = expandedItems.has(item.id);
          const dollarImpact = item.dollarImpact(situation);
          const categoryStyle = getCategoryStyle(item.category);

          return (
            <Collapsible key={item.id} open={isExpanded} onOpenChange={() => toggleExpand(item.id)}>
              <Card
                className={`transition-all duration-200 ${
                  isCompleted
                    ? 'bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'hover:shadow-md'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleItem(item.id)}
                      className="mt-0.5 flex-shrink-0"
                      aria-label={isCompleted ? 'Mark as incomplete' : 'Mark as complete'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                      )}
                    </button>

                    {/* Icon */}
                    <div className={`p-2 rounded-lg flex-shrink-0 ${categoryStyle.bg}`}>
                      <Icon className={`h-5 w-5 ${categoryStyle.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <h3 className={`font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                            {item.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {item.description}
                          </p>
                        </div>

                        {/* Dollar Impact */}
                        {dollarImpact > 0 && (
                          <div className="text-right flex-shrink-0">
                            <p className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatCurrency(dollarImpact)}
                            </p>
                            <p className="text-xs text-muted-foreground">potential savings</p>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {item.deadline}
                        </Badge>
                        <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                          {item.priority} priority
                        </Badge>
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.category}
                        </Badge>

                        {/* Expand/Collapse */}
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-auto h-7 px-2 print:hidden">
                            <Info className="h-4 w-4 mr-1" />
                            Details
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 ml-1" />
                            ) : (
                              <ChevronDown className="h-4 w-4 ml-1" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  <CollapsibleContent>
                    <div className="mt-4 ml-11 p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2 text-sm">Key Points:</h4>
                      <ul className="space-y-1.5">
                        {item.details.map((detail, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                            <span className="text-primary mt-1">-</span>
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CollapsibleContent>
                </div>
              </Card>
            </Collapsible>
          );
        })}

        {filteredItems.length === 0 && (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">
              No items match your current filters. Try adjusting the category or showing all items.
            </p>
          </Card>
        )}
      </div>

      {/* Footer Disclaimer */}
      <div className="p-4 bg-muted/50 rounded-lg border text-center">
        <p className="text-xs text-muted-foreground">
          This checklist provides general guidance. Dollar impacts are estimates based on your provided situation.
          Consult a tax professional for advice specific to your circumstances. Tax laws change frequently.
        </p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .space-y-6, .space-y-6 * {
            visibility: visible;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:space-y-4 > * + * {
            margin-top: 1rem;
          }
        }
      `}</style>
    </div>
  );
}
