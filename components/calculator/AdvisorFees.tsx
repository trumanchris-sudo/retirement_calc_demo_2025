'use client';

import React, { useState, useMemo, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { InfoTooltip } from '@/components/ui/InfoTooltip';
import {
  DollarSign,
  TrendingUp,
  Calculator,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Users,
  BookOpen,
  Shield,
  HelpCircle,
  Briefcase,
  ChevronRight,
  Clock,
  Percent,
  PiggyBank,
  Zap,
  Target,
  XCircle,
  Info,
} from 'lucide-react';
import { TYPOGRAPHY, METRIC_COLORS, STATUS } from '@/lib/designTokens';
import { fmt, fmtFull, cn } from '@/lib/utils';

// =============================================================================
// Types and Constants
// =============================================================================

type FeeModel = 'aum' | 'flat' | 'hourly' | 'commission';

interface AdvisorFeeInputs {
  portfolioSize: number;
  aumFeePercent: number;
  flatFeeAnnual: number;
  hourlyRate: number;
  hoursPerYear: number;
  expectedReturn: number;
  investmentYears: number;
}

interface FeeComparison {
  model: FeeModel;
  name: string;
  annualFee: number;
  tenYearFee: number;
  thirtyYearFee: number;
  opportunityCost: number;
  description: string;
}

// Fee model configurations
const FEE_MODELS: Record<
  FeeModel,
  {
    name: string;
    icon: React.ReactNode;
    color: string;
    badgeColor: string;
    description: string;
    typical: string;
    pros: string[];
    cons: string[];
  }
> = {
  aum: {
    name: 'Assets Under Management',
    icon: <Percent className="h-4 w-4" />,
    color: 'text-amber-600',
    badgeColor: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    description: 'Percentage of your portfolio charged annually',
    typical: '0.5% - 1.5%',
    pros: ['Advisor incentivized to grow portfolio', 'Fee scales with complexity'],
    cons: [
      'Expensive on large portfolios',
      'Same fee whether market is up or down',
      'Hidden drag on returns',
    ],
  },
  flat: {
    name: 'Flat Fee / Retainer',
    icon: <DollarSign className="h-4 w-4" />,
    color: 'text-blue-600',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
    description: 'Fixed annual fee regardless of portfolio size',
    typical: '$2,000 - $10,000/year',
    pros: [
      'Predictable cost',
      'No conflict of interest on asset allocation',
      'Better value for large portfolios',
    ],
    cons: ['May be expensive for small portfolios', 'Less common'],
  },
  hourly: {
    name: 'Hourly Fee',
    icon: <Clock className="h-4 w-4" />,
    color: 'text-green-600',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
    description: 'Pay only for time used',
    typical: '$200 - $500/hour',
    pros: ['Pay for what you use', 'Great for one-time advice', 'Most transparent'],
    cons: ['Can add up for ongoing needs', 'Unpredictable total cost'],
  },
  commission: {
    name: 'Commission-Based',
    icon: <AlertTriangle className="h-4 w-4" />,
    color: 'text-red-600',
    badgeColor: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
    description: 'Advisor earns commission on products sold',
    typical: '3% - 8% upfront + trailing',
    pros: ['No direct fee to you (seemingly)'],
    cons: [
      'Severe conflict of interest',
      'May recommend unsuitable products',
      'Hidden in product costs',
      'Often worse returns',
    ],
  },
};

// Advisor services checklist
const ADVISOR_SERVICES = [
  {
    category: 'Investment Management',
    items: [
      'Portfolio construction and asset allocation',
      'Rebalancing and tax-loss harvesting',
      'Investment selection and due diligence',
      'Risk assessment and management',
    ],
  },
  {
    category: 'Financial Planning',
    items: [
      'Retirement projections and planning',
      'Goal setting and tracking',
      'Cash flow analysis',
      'Insurance needs analysis',
    ],
  },
  {
    category: 'Tax Planning',
    items: [
      'Tax-efficient withdrawal strategies',
      'Roth conversion analysis',
      'Capital gains management',
      'Coordination with CPA',
    ],
  },
  {
    category: 'Estate Planning',
    items: [
      'Beneficiary review',
      'Estate document coordination',
      'Wealth transfer strategies',
      'Charitable giving optimization',
    ],
  },
  {
    category: 'Behavioral Coaching',
    items: [
      'Market volatility guidance',
      'Discipline and accountability',
      'Major decision support',
      'Family financial discussions',
    ],
  },
];

// Questions to ask an advisor
const ADVISOR_QUESTIONS = [
  {
    question: 'Are you a fiduciary 100% of the time?',
    why: 'Many advisors are only fiduciaries sometimes. Dual-registered advisors can switch between fiduciary and suitability standards.',
    redFlag: 'Any hesitation or conditional answers',
    greenFlag: 'Unequivocal "yes" with written confirmation',
  },
  {
    question: 'How are you compensated?',
    why: 'Understand all sources of income: fees from you, commissions, revenue sharing, referral fees.',
    redFlag: 'Vague answers or dismissiveness about costs',
    greenFlag: 'Clear, detailed breakdown of all compensation',
  },
  {
    question: "What's your investment philosophy?",
    why: 'Should align with evidence-based investing: low costs, diversification, long-term focus.',
    redFlag: 'Market timing, stock picking, complex strategies',
    greenFlag: 'Index-focused, tax-efficient, risk-appropriate',
  },
  {
    question: 'Can you show me a sample financial plan?',
    why: "See the depth and quality of what you're paying for.",
    redFlag: 'Refuses or only shows sales materials',
    greenFlag: 'Comprehensive, personalized planning documents',
  },
  {
    question: 'What are your credentials and experience?',
    why: 'CFP, CFA, CPA/PFS are meaningful. Series 7 alone is not.',
    redFlag: 'Only insurance licenses or sales certifications',
    greenFlag: 'CFP with fiduciary experience, fee-only practice',
  },
];

// =============================================================================
// Utility Functions
// =============================================================================

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(0)}K`;
  }
  return `$${value.toFixed(0)}`;
}

function calculateAUMFees(
  portfolioSize: number,
  feePercent: number,
  years: number,
  expectedReturn: number
): { totalFees: number; opportunityCost: number } {
  let totalFees = 0;
  let portfolioWithFees = portfolioSize;
  let portfolioWithoutFees = portfolioSize;
  const netReturn = expectedReturn / 100;
  const fee = feePercent / 100;

  for (let year = 0; year < years; year++) {
    // Fee charged on current portfolio value
    const yearlyFee = portfolioWithFees * fee;
    totalFees += yearlyFee;

    // Portfolio with fees grows at net return minus fee
    portfolioWithFees = portfolioWithFees * (1 + netReturn - fee);

    // Portfolio without fees grows at full return
    portfolioWithoutFees = portfolioWithoutFees * (1 + netReturn);
  }

  // Opportunity cost is the difference in ending values
  const opportunityCost = portfolioWithoutFees - portfolioWithFees - totalFees;

  return { totalFees, opportunityCost };
}

function calculateFlatFeeWithGrowth(
  annualFee: number,
  years: number,
  expectedReturn: number
): { totalFees: number; opportunityCost: number } {
  const netReturn = expectedReturn / 100;
  let totalFees = 0;
  let opportunityCost = 0;

  for (let year = 0; year < years; year++) {
    totalFees += annualFee;
    // Each year's fee, if invested, would have grown
    opportunityCost += annualFee * Math.pow(1 + netReturn, years - year) - annualFee;
  }

  return { totalFees, opportunityCost };
}

function findBreakevenPoint(
  aumFeePercent: number,
  flatFeeAnnual: number
): number {
  // At what portfolio size does flat fee equal AUM fee?
  // AUM fee = portfolio * (aumFeePercent / 100)
  // Flat fee = flatFeeAnnual
  // Breakeven: portfolio * (aumFeePercent / 100) = flatFeeAnnual
  // portfolio = flatFeeAnnual / (aumFeePercent / 100)
  return flatFeeAnnual / (aumFeePercent / 100);
}

// =============================================================================
// Sub-Components
// =============================================================================

interface FeeModelCardProps {
  model: FeeModel;
  isSelected: boolean;
  onSelect: () => void;
}

function FeeModelCard({ model, isSelected, onSelect }: FeeModelCardProps) {
  const config = FEE_MODELS[model];

  return (
    <button
      onClick={onSelect}
      className={cn(
        'relative p-4 rounded-lg border-2 transition-all duration-200 text-left w-full',
        'hover:shadow-md hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-muted hover:border-muted-foreground/30'
      )}
    >
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
        </div>
      )}
      <div className={cn('mb-2', config.color)}>{config.icon}</div>
      <div className="font-semibold text-sm">{config.name}</div>
      <div className="text-xs text-muted-foreground mt-1">{config.description}</div>
      <Badge className={cn('mt-2 text-xs', config.badgeColor)}>{config.typical}</Badge>
    </button>
  );
}

interface FeeCostDisplayProps {
  label: string;
  amount: number;
  subtitle?: string;
  highlight?: boolean;
  warning?: boolean;
}

function FeeCostDisplay({
  label,
  amount,
  subtitle,
  highlight,
  warning,
}: FeeCostDisplayProps) {
  return (
    <div
      className={cn(
        'p-4 rounded-lg border',
        highlight && 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        warning &&
          'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        !highlight && !warning && 'bg-muted/50'
      )}
    >
      <p className={TYPOGRAPHY.metricLabel}>{label}</p>
      <p
        className={cn(
          TYPOGRAPHY.metricMedium,
          warning && 'text-amber-700 dark:text-amber-300',
          highlight && 'text-blue-700 dark:text-blue-300'
        )}
      >
        {fmtFull(amount)}
      </p>
      {subtitle && <p className={TYPOGRAPHY.helperText}>{subtitle}</p>}
    </div>
  );
}

interface ComparisonBarProps {
  values: { label: string; amount: number; color: string }[];
  maxValue: number;
}

function ComparisonBar({ values, maxValue }: ComparisonBarProps) {
  return (
    <div className="space-y-3">
      {values.map((item, idx) => (
        <div key={idx} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{item.label}</span>
            <span className={TYPOGRAPHY.tableCellMono}>{formatCurrency(item.amount)}</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className={cn('h-full transition-all duration-500', item.color)}
              style={{ width: `${Math.min((item.amount / maxValue) * 100, 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export interface AdvisorFeesProps {
  initialPortfolioSize?: number;
}

export function AdvisorFees({ initialPortfolioSize = 500000 }: AdvisorFeesProps) {
  // State
  const [inputs, setInputs] = useState<AdvisorFeeInputs>({
    portfolioSize: initialPortfolioSize,
    aumFeePercent: 1.0,
    flatFeeAnnual: 5000,
    hourlyRate: 300,
    hoursPerYear: 10,
    expectedReturn: 7,
    investmentYears: 30,
  });

  const [selectedModel, setSelectedModel] = useState<FeeModel>('aum');

  // Update handler
  const updateInput = useCallback(
    <K extends keyof AdvisorFeeInputs>(key: K, value: AdvisorFeeInputs[K]) => {
      setInputs((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  // Calculations
  const aumCalculation = useMemo(() => {
    const annual = inputs.portfolioSize * (inputs.aumFeePercent / 100);
    const tenYear = calculateAUMFees(
      inputs.portfolioSize,
      inputs.aumFeePercent,
      10,
      inputs.expectedReturn
    );
    const thirtyYear = calculateAUMFees(
      inputs.portfolioSize,
      inputs.aumFeePercent,
      inputs.investmentYears,
      inputs.expectedReturn
    );
    return {
      annual,
      tenYearFees: tenYear.totalFees,
      tenYearOpportunityCost: tenYear.opportunityCost,
      thirtyYearFees: thirtyYear.totalFees,
      thirtyYearOpportunityCost: thirtyYear.opportunityCost,
      totalThirtyYear: thirtyYear.totalFees + thirtyYear.opportunityCost,
    };
  }, [inputs.portfolioSize, inputs.aumFeePercent, inputs.expectedReturn, inputs.investmentYears]);

  const flatCalculation = useMemo(() => {
    const tenYear = calculateFlatFeeWithGrowth(inputs.flatFeeAnnual, 10, inputs.expectedReturn);
    const thirtyYear = calculateFlatFeeWithGrowth(
      inputs.flatFeeAnnual,
      inputs.investmentYears,
      inputs.expectedReturn
    );
    return {
      annual: inputs.flatFeeAnnual,
      tenYearFees: tenYear.totalFees,
      tenYearOpportunityCost: tenYear.opportunityCost,
      thirtyYearFees: thirtyYear.totalFees,
      thirtyYearOpportunityCost: thirtyYear.opportunityCost,
      totalThirtyYear: thirtyYear.totalFees + thirtyYear.opportunityCost,
    };
  }, [inputs.flatFeeAnnual, inputs.expectedReturn, inputs.investmentYears]);

  const hourlyCalculation = useMemo(() => {
    const annual = inputs.hourlyRate * inputs.hoursPerYear;
    const tenYear = calculateFlatFeeWithGrowth(annual, 10, inputs.expectedReturn);
    const thirtyYear = calculateFlatFeeWithGrowth(annual, inputs.investmentYears, inputs.expectedReturn);
    return {
      annual,
      tenYearFees: tenYear.totalFees,
      tenYearOpportunityCost: tenYear.opportunityCost,
      thirtyYearFees: thirtyYear.totalFees,
      thirtyYearOpportunityCost: thirtyYear.opportunityCost,
      totalThirtyYear: thirtyYear.totalFees + thirtyYear.opportunityCost,
    };
  }, [inputs.hourlyRate, inputs.hoursPerYear, inputs.expectedReturn, inputs.investmentYears]);

  const breakevenPoint = useMemo(
    () => findBreakevenPoint(inputs.aumFeePercent, inputs.flatFeeAnnual),
    [inputs.aumFeePercent, inputs.flatFeeAnnual]
  );

  const flatFeeBetter = inputs.portfolioSize > breakevenPoint;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 text-white">
          <Scale className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-2xl font-bold">Financial Advisor Fee Calculator</h2>
          <p className="text-muted-foreground">Know what you are paying - make informed decisions</p>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="calculator" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
          <TabsTrigger value="calculator">
            <Calculator className="h-4 w-4 mr-2" />
            Calculator
          </TabsTrigger>
          <TabsTrigger value="models">
            <BookOpen className="h-4 w-4 mr-2" />
            Fee Models
          </TabsTrigger>
          <TabsTrigger value="value">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            What You Get
          </TabsTrigger>
          <TabsTrigger value="questions">
            <HelpCircle className="h-4 w-4 mr-2" />
            Questions to Ask
          </TabsTrigger>
        </TabsList>

        {/* Calculator Tab */}
        <TabsContent value="calculator" className="space-y-6">
          {/* AUM Fee Calculator */}
          <Card className="border-2 border-amber-200 dark:border-amber-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Percent className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                AUM Fee Calculator
                <InfoTooltip
                  content="AUM (Assets Under Management) fees charge a percentage of your portfolio annually. This is the most common fee structure but can be very expensive over time."
                  side="right"
                />
              </CardTitle>
              <CardDescription>
                See the true cost of percentage-based fees over time
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Portfolio Size</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inputs.portfolioSize}
                      onChange={(e) => updateInput('portfolioSize', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                  <Slider
                    value={[inputs.portfolioSize]}
                    onValueChange={([v]) => updateInput('portfolioSize', v)}
                    min={100000}
                    max={5000000}
                    step={50000}
                    thumbLabel="Portfolio size"
                  />
                </div>

                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>AUM Fee (%)</Label>
                  <Input
                    type="number"
                    value={inputs.aumFeePercent}
                    onChange={(e) => updateInput('aumFeePercent', Number(e.target.value) || 0)}
                    step={0.1}
                    min={0}
                    max={3}
                  />
                  <Slider
                    value={[inputs.aumFeePercent]}
                    onValueChange={([v]) => updateInput('aumFeePercent', v)}
                    min={0.25}
                    max={2}
                    step={0.05}
                    thumbLabel="AUM fee percentage"
                  />
                </div>

                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Expected Return (%)</Label>
                  <Input
                    type="number"
                    value={inputs.expectedReturn}
                    onChange={(e) => updateInput('expectedReturn', Number(e.target.value) || 0)}
                    step={0.5}
                    min={0}
                    max={15}
                  />
                </div>
              </div>

              {/* Results */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FeeCostDisplay
                  label="Annual Fee"
                  amount={aumCalculation.annual}
                  subtitle={`${inputs.aumFeePercent}% of ${formatCurrency(inputs.portfolioSize)}`}
                />
                <FeeCostDisplay
                  label="10-Year Fees"
                  amount={aumCalculation.tenYearFees}
                  subtitle="Direct fees paid"
                  warning
                />
                <FeeCostDisplay
                  label={`${inputs.investmentYears}-Year Fees`}
                  amount={aumCalculation.thirtyYearFees}
                  subtitle="Direct fees paid"
                  warning
                />
              </div>

              {/* The Big Number */}
              <div className="bg-gradient-to-r from-amber-50 to-red-50 dark:from-amber-950/30 dark:to-red-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                    <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Total Cost Over {inputs.investmentYears} Years
                    </h3>
                    <p className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-2">
                      {fmtFull(aumCalculation.totalThirtyYear)}
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Direct Fees: </span>
                        <span className="font-medium">{fmtFull(aumCalculation.thirtyYearFees)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lost Growth: </span>
                        <span className="font-medium">
                          {fmtFull(aumCalculation.thirtyYearOpportunityCost)}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-amber-800 dark:text-amber-200 mt-3">
                      On {formatCurrency(inputs.portfolioSize)} at {inputs.aumFeePercent}%, you pay{' '}
                      <strong>{fmtFull(aumCalculation.thirtyYearFees)}+</strong> over {inputs.investmentYears} years,
                      plus lose <strong>{fmtFull(aumCalculation.thirtyYearOpportunityCost)}</strong> in
                      potential growth.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Flat Fee Comparison */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                Flat Fee Comparison
                <InfoTooltip
                  content="Compare AUM fees to flat annual fees to see which is better for your situation."
                  side="right"
                />
              </CardTitle>
              <CardDescription>At what asset level does flat fee win?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={TYPOGRAPHY.inputLabel}>Flat Fee (Annual)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      value={inputs.flatFeeAnnual}
                      onChange={(e) => updateInput('flatFeeAnnual', Number(e.target.value) || 0)}
                      className="pl-9"
                    />
                  </div>
                  <Slider
                    value={[inputs.flatFeeAnnual]}
                    onValueChange={([v]) => updateInput('flatFeeAnnual', v)}
                    min={1000}
                    max={15000}
                    step={500}
                    thumbLabel="Flat fee"
                  />
                </div>

                <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                  <p className={TYPOGRAPHY.metricLabel}>Breakeven Point</p>
                  <p className={`${TYPOGRAPHY.metricMedium} text-blue-700 dark:text-blue-300`}>
                    {formatCurrency(breakevenPoint)}
                  </p>
                  <p className={TYPOGRAPHY.helperText}>
                    Above this, flat fee is cheaper than {inputs.aumFeePercent}% AUM
                  </p>
                </div>
              </div>

              {/* Comparison Chart */}
              <ComparisonBar
                values={[
                  {
                    label: `AUM Fee (${inputs.aumFeePercent}%)`,
                    amount: aumCalculation.annual,
                    color: 'bg-amber-500',
                  },
                  {
                    label: 'Flat Fee',
                    amount: flatCalculation.annual,
                    color: 'bg-blue-500',
                  },
                ]}
                maxValue={Math.max(aumCalculation.annual, flatCalculation.annual) * 1.2}
              />

              {/* Recommendation */}
              <div
                className={cn(
                  'p-4 rounded-lg border',
                  flatFeeBetter
                    ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800'
                    : 'bg-muted/50'
                )}
              >
                <div className="flex items-start gap-3">
                  {flatFeeBetter ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                  ) : (
                    <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">
                      {flatFeeBetter
                        ? `Flat fee saves you ${fmtFull(aumCalculation.annual - flatCalculation.annual)}/year`
                        : `AUM fee is ${fmtFull(flatCalculation.annual - aumCalculation.annual)}/year cheaper at your portfolio size`}
                    </p>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      {flatFeeBetter
                        ? `At ${formatCurrency(inputs.portfolioSize)}, you are above the ${formatCurrency(breakevenPoint)} breakeven point. Flat fee advisors provide better value for larger portfolios.`
                        : `At ${formatCurrency(inputs.portfolioSize)}, you are below the ${formatCurrency(breakevenPoint)} breakeven. As your portfolio grows, reassess.`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Long-term comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-3">AUM Fee Over Time</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span>10 Years</span>
                      <span className="font-medium">{fmtFull(aumCalculation.tenYearFees)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span>{inputs.investmentYears} Years</span>
                      <span className="font-medium">{fmtFull(aumCalculation.thirtyYearFees)}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">Flat Fee Over Time</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span>10 Years</span>
                      <span className="font-medium">{fmtFull(flatCalculation.tenYearFees)}</span>
                    </div>
                    <div className="flex justify-between p-2 rounded bg-muted/50">
                      <span>{inputs.investmentYears} Years</span>
                      <span className="font-medium">{fmtFull(flatCalculation.thirtyYearFees)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* DIY Alternative */}
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                DIY Alternative
              </CardTitle>
              <CardDescription>Save the advisory fee with self-directed investing</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">
                    What You Can Do Yourself
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>
                        <strong>Index funds:</strong> Simple 3-fund portfolio (US stocks, international
                        stocks, bonds)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>
                        <strong>Target-date funds:</strong> Automatic rebalancing and glide path
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>
                        <strong>Robo-advisors:</strong> 0.25% or less vs 1% traditional
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>
                        <strong>This calculator:</strong> Replace expensive planning advice
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">
                    When to Get Professional Help
                  </h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>Complex tax situations (business, RSUs, stock options)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>Estate planning needs</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>Major life transitions (inheritance, divorce, windfall)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>You want accountability and coaching</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <span className={TYPOGRAPHY.body}>You do not enjoy managing finances</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
                <p className={TYPOGRAPHY.body}>
                  <strong>Potential savings:</strong> By going DIY, you could save{' '}
                  <span className="font-bold text-emerald-700 dark:text-emerald-300">
                    {fmtFull(aumCalculation.totalThirtyYear)}
                  </span>{' '}
                  over {inputs.investmentYears} years compared to a {inputs.aumFeePercent}% AUM advisor.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fee Models Tab */}
        <TabsContent value="models" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Fee Models Explained</CardTitle>
              <CardDescription>
                Understanding how advisors charge helps you make better choices
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(Object.keys(FEE_MODELS) as FeeModel[]).map((model) => (
                  <FeeModelCard
                    key={model}
                    model={model}
                    isSelected={selectedModel === model}
                    onSelect={() => setSelectedModel(model)}
                  />
                ))}
              </div>

              {/* Selected Model Details */}
              <div className="p-6 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-3 mb-4">
                  <div className={cn('p-2 rounded-lg', FEE_MODELS[selectedModel].badgeColor)}>
                    {FEE_MODELS[selectedModel].icon}
                  </div>
                  <div>
                    <h3 className="font-semibold">{FEE_MODELS[selectedModel].name}</h3>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Typical: {FEE_MODELS[selectedModel].typical}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" /> Pros
                    </h4>
                    <ul className="space-y-1">
                      {FEE_MODELS[selectedModel].pros.map((pro, idx) => (
                        <li key={idx} className={cn('flex items-start gap-2', TYPOGRAPHY.body)}>
                          <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          {pro}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" /> Cons
                    </h4>
                    <ul className="space-y-1">
                      {FEE_MODELS[selectedModel].cons.map((con, idx) => (
                        <li key={idx} className={cn('flex items-start gap-2', TYPOGRAPHY.body)}>
                          <ChevronRight className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                          {con}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fiduciary vs Suitability */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                Fiduciary vs Suitability Standard
              </CardTitle>
              <CardDescription>This distinction matters more than you think</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fiduciary */}
                <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold text-green-800 dark:text-green-200">
                      Fiduciary Standard
                    </h4>
                  </div>
                  <p className={cn(TYPOGRAPHY.body, 'mb-3')}>
                    Must act in your <strong>best interest</strong>. Legally required to put your needs
                    first.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Registered Investment Advisors (RIA)
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      CFP professionals (when giving planning advice)
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Fee-only advisors (no commissions)
                    </li>
                  </ul>
                </div>

                {/* Suitability */}
                <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <h4 className="font-semibold text-amber-800 dark:text-amber-200">
                      Suitability Standard
                    </h4>
                  </div>
                  <p className={cn(TYPOGRAPHY.body, 'mb-3')}>
                    Only needs to be <strong>suitable</strong> for you. Can recommend products that
                    benefit the advisor more.
                  </p>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      Broker-dealers
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      Insurance agents
                    </li>
                    <li className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                      Bank advisors (often)
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800">
                <h4 className="font-semibold text-purple-800 dark:text-purple-200 mb-2">
                  Look for these credentials:
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Badge className={STATUS.success}>CFP (Certified Financial Planner)</Badge>
                  <Badge className={STATUS.success}>RIA (Registered Investment Advisor)</Badge>
                  <Badge className={STATUS.success}>Fee-Only (NAPFA member)</Badge>
                  <Badge className={STATUS.success}>CFA (Chartered Financial Analyst)</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* What You Get Tab */}
        <TabsContent value="value" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                What You Should Get From an Advisor
              </CardTitle>
              <CardDescription>
                Use this checklist to evaluate what services you are paying for
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ADVISOR_SERVICES.map((category, idx) => (
                  <div key={idx} className="space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" />
                      {category.category}
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {category.items.map((item, itemIdx) => (
                        <div
                          key={itemIdx}
                          className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="h-4 w-4 rounded border border-muted-foreground/30 flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-muted-foreground/50" />
                          </div>
                          <span className={TYPOGRAPHY.body}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800 dark:text-blue-200 mb-1">
                      Ask your advisor: What services are included?
                    </p>
                    <p className={TYPOGRAPHY.bodyMuted}>
                      Some advisors only manage investments. Others provide comprehensive planning. Make
                      sure you know what you are paying for, and if you are not getting full service,
                      you should not be paying full price.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Questions to Ask Tab */}
        <TabsContent value="questions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Questions to Ask a Financial Advisor
              </CardTitle>
              <CardDescription>
                Use these to vet potential advisors and protect yourself
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {ADVISOR_QUESTIONS.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border hover:shadow-sm transition-shadow"
                  >
                    <h4 className="font-semibold text-lg mb-2 flex items-start gap-2">
                      <span className="p-1 rounded-full bg-primary/10 text-primary text-sm w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {idx + 1}
                      </span>
                      &quot;{q.question}&quot;
                    </h4>
                    <p className={cn(TYPOGRAPHY.bodyMuted, 'mb-3')}>{q.why}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                        <div className="flex items-center gap-2 mb-1">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <span className="font-medium text-red-800 dark:text-red-200 text-sm">
                            Red Flag
                          </span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300">{q.redFlag}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800 dark:text-green-200 text-sm">
                            Green Flag
                          </span>
                        </div>
                        <p className="text-sm text-green-700 dark:text-green-300">{q.greenFlag}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Resources */}
          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/50">
                  <BookOpen className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                    Where to Find Fee-Only Fiduciary Advisors
                  </h3>
                  <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                    <li>
                      <strong>NAPFA.org</strong> - National Association of Personal Financial Advisors
                      (fee-only)
                    </li>
                    <li>
                      <strong>Garrett Planning Network</strong> - Hourly, as-needed advisors
                    </li>
                    <li>
                      <strong>XYPN</strong> - Fee-only advisors for Gen X and Gen Y
                    </li>
                    <li>
                      <strong>Letsmakeaplan.org</strong> - CFP Board directory
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Disclaimer */}
      <div className="p-4 rounded-lg bg-muted/30 border">
        <p className={`${TYPOGRAPHY.helperText} text-center`}>
          This calculator is for educational purposes. Fee structures vary by advisor. Always review
          Form ADV Part 2 for complete fee disclosures. Past performance of investments does not
          guarantee future results.
        </p>
      </div>
    </div>
  );
}

export default AdvisorFees;
