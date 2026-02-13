'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Info,
  Heart,
  TrendingUp,
  Building,
  Shield,
  Clock,
  Calculator,
  ChevronRight,
  Lightbulb,
  Ban,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { calcOrdinaryTax, type FilingStatus } from '@/lib/calculations/taxCalculations';
import { TAX_BRACKETS } from '@/lib/constants';

const MotionDiv = dynamic(
  () => import('framer-motion').then((m) => m.motion.div),
  { ssr: false }
);

// ===============================
// Types
// ===============================

interface InheritedAsset {
  type: 'cash' | 'taxable_investments' | 'traditional_ira' | 'roth_ira' | 'real_estate' | 'life_insurance';
  amount: number;
  costBasis?: number; // For investments/real estate
  valueAtDeath?: number; // For step-up basis calculation
}

interface InheritanceCalculatorInputs {
  inheritedTraditionalIRA: number;
  inheritedRothIRA: number;
  inheritedTaxableInvestments: number;
  originalBasis: number;
  valueAtDeath: number;
  beneficiaryTaxRate: number;
  filingStatus: FilingStatus;
  currentAge: number;
}

interface WithdrawalYear {
  year: number;
  traditionalWithdrawal: number;
  traditionalTax: number;
  rothWithdrawal: number;
  rothTax: number;
  traditionalBalance: number;
  rothBalance: number;
}

// ===============================
// Constants
// ===============================

const ASSET_TYPES = [
  {
    type: 'cash' as const,
    label: 'Cash',
    icon: DollarSign,
    taxTreatment: 'No income tax',
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-200 dark:border-green-800',
    description: 'Inherited cash is not subject to income tax. The decedent may have paid estate tax if the estate was large enough.',
  },
  {
    type: 'taxable_investments' as const,
    label: 'Taxable Investments (Stocks, Mutual Funds)',
    icon: TrendingUp,
    taxTreatment: 'Step-up in basis (HUGE benefit)',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-200 dark:border-blue-800',
    description: 'You receive a "step-up" in cost basis to the value at date of death. This eliminates capital gains on appreciation during the decedent\'s lifetime.',
  },
  {
    type: 'traditional_ira' as const,
    label: 'Traditional IRA / 401(k)',
    icon: AlertTriangle,
    taxTreatment: '10-year withdrawal rule (TAXABLE)',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-200 dark:border-amber-800',
    description: 'Non-spouse beneficiaries must empty the account within 10 years. All withdrawals are taxed as ordinary income.',
  },
  {
    type: 'roth_ira' as const,
    label: 'Roth IRA',
    icon: Sparkles,
    taxTreatment: '10-year rule but TAX-FREE',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    description: 'Same 10-year rule applies, but withdrawals are completely tax-free. Let it grow until year 10, then withdraw.',
  },
  {
    type: 'real_estate' as const,
    label: 'Real Estate',
    icon: Building,
    taxTreatment: 'Step-up in basis',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    borderColor: 'border-purple-200 dark:border-purple-800',
    description: 'Property receives a step-up in basis to fair market value at death. Selling immediately results in zero capital gains.',
  },
  {
    type: 'life_insurance' as const,
    label: 'Life Insurance',
    icon: Shield,
    taxTreatment: 'Tax-free',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    borderColor: 'border-cyan-200 dark:border-cyan-800',
    description: 'Life insurance proceeds paid to beneficiaries are income tax-free. May be subject to estate tax if the estate is large.',
  },
];

const WHAT_TO_DO_FIRST = [
  {
    step: 1,
    title: 'Breathe, grieve',
    description: 'You just lost someone. Financial decisions can wait. Take the time you need.',
    icon: Heart,
  },
  {
    step: 2,
    title: "Don't make quick decisions",
    description: 'Avoid major financial moves for at least 6 months. People make expensive mistakes when emotional.',
    icon: Clock,
  },
  {
    step: 3,
    title: 'Get account titling right',
    description: 'Inherited IRA must be titled correctly: "[Deceased Name] IRA FBO [Your Name] as beneficiary"',
    icon: CheckCircle2,
  },
  {
    step: 4,
    title: 'Understand what you inherited',
    description: 'Different assets have vastly different tax treatments. This guide will help.',
    icon: Info,
  },
];

const COMMON_MISTAKES = [
  {
    mistake: 'Cashing out inherited IRA immediately',
    consequence: 'Massive tax bill - could push you into 37% bracket',
    fix: 'Spread withdrawals over 10 years to stay in lower brackets',
  },
  {
    mistake: 'Missing RMD requirements',
    consequence: '25% penalty on the amount that should have been withdrawn',
    fix: 'Start annual RMDs if the original owner was already taking them',
  },
  {
    mistake: 'Rolling inherited IRA into your own IRA (non-spouse)',
    consequence: 'Entire amount becomes immediately taxable',
    fix: 'Keep it as an inherited IRA with proper beneficiary titling',
  },
  {
    mistake: 'Selling stepped-up assets and reinvesting',
    consequence: 'Creating unnecessary taxable events',
    fix: 'Keep or sell immediately - avoid short-term holding that loses step-up benefit',
  },
  {
    mistake: 'Withdrawing from inherited Roth early',
    consequence: 'Missing years of tax-free growth',
    fix: 'Let inherited Roth grow until year 10, then withdraw everything tax-free',
  },
];

// ===============================
// Helper Functions
// ===============================

function calculateStepUpSavings(
  originalBasis: number,
  valueAtDeath: number,
  taxRate: number = 0.15
): number {
  const gain = Math.max(0, valueAtDeath - originalBasis);
  return gain * taxRate;
}

function generateWithdrawalSchedule(
  traditionalBalance: number,
  rothBalance: number,
  taxRate: number,
  growthRate: number = 0.05
): WithdrawalYear[] {
  const years: WithdrawalYear[] = [];
  let tradBal = traditionalBalance;
  let rothBal = rothBalance;

  // Strategy: Traditional spread evenly, Roth grows until year 10
  const annualTradWithdrawal = traditionalBalance > 0 ? traditionalBalance / 10 : 0;

  for (let year = 1; year <= 10; year++) {
    // Traditional: withdraw evenly
    const tradWithdrawal = Math.min(annualTradWithdrawal, tradBal);
    const tradTax = tradWithdrawal * taxRate;
    tradBal = (tradBal - tradWithdrawal) * (1 + growthRate);
    if (tradBal < 0) tradBal = 0;

    // Roth: let it grow, withdraw all in year 10
    const rothWithdrawal = year === 10 ? rothBal : 0;
    rothBal = year < 10 ? rothBal * (1 + growthRate) : 0;

    years.push({
      year,
      traditionalWithdrawal: tradWithdrawal,
      traditionalTax: tradTax,
      rothWithdrawal,
      rothTax: 0, // Always 0 for Roth
      traditionalBalance: tradBal,
      rothBalance: rothBal,
    });
  }

  return years;
}

// ===============================
// Sub-Components
// ===============================

interface AssetTypeCardProps {
  asset: typeof ASSET_TYPES[number];
  delay: number;
}

const AssetTypeCard = React.memo(function AssetTypeCard({
  asset,
  delay,
}: AssetTypeCardProps) {
  const Icon = asset.icon;

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn(
        'rounded-lg border p-4',
        asset.bgColor,
        asset.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-full bg-white dark:bg-gray-800', asset.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-sm">{asset.label}</h4>
            <Badge
              variant="outline"
              className={cn(
                'text-xs',
                asset.type === 'traditional_ira'
                  ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                  : asset.type === 'roth_ira' || asset.type === 'life_insurance' || asset.type === 'cash'
                  ? 'border-green-500 text-green-700 dark:text-green-400'
                  : 'border-blue-500 text-blue-700 dark:text-blue-400'
              )}
            >
              {asset.taxTreatment}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">{asset.description}</p>
        </div>
      </div>
    </MotionDiv>
  );
});

interface StepUpExplainerProps {
  originalBasis: number;
  valueAtDeath: number;
  onBasisChange: (value: number) => void;
  onValueChange: (value: number) => void;
}

const StepUpExplainer = React.memo(function StepUpExplainer({
  originalBasis,
  valueAtDeath,
  onBasisChange,
  onValueChange,
}: StepUpExplainerProps) {
  const gain = Math.max(0, valueAtDeath - originalBasis);
  const taxSavings = gain * 0.15; // Assume 15% LTCG rate
  const taxSavingsHighBracket = gain * 0.238; // 20% + 3.8% NIIT

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Lightbulb className="h-5 w-5 text-blue-600" />
          Step-Up in Basis: The MASSIVE Tax Benefit
        </CardTitle>
        <CardDescription>
          This is one of the most valuable tax benefits in the entire tax code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Interactive Example */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Original Purchase Price (Parent's Basis)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={originalBasis.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(val)) onBasisChange(val);
                }}
                className="pl-8"
              />
            </div>
            <Slider
              value={[originalBasis]}
              onValueChange={([v]) => onBasisChange(v)}
              min={1000}
              max={500000}
              step={1000}
              thumbLabel="Original basis"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Value at Death (Your New Basis)
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={valueAtDeath.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(val)) onValueChange(val);
                }}
                className="pl-8"
              />
            </div>
            <Slider
              value={[valueAtDeath]}
              onValueChange={([v]) => onValueChange(v)}
              min={1000}
              max={1000000}
              step={1000}
              thumbLabel="Value at death"
            />
          </div>
        </div>

        {/* Visual Comparison */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="p-4 rounded-lg border bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-2 mb-2">
              <Ban className="h-4 w-4 text-red-600" />
              <span className="font-semibold text-red-700 dark:text-red-400">WITHOUT Step-Up</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              If parent had sold before death:
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Gain:</span>
                <span className="font-medium">{fmt(gain)}</span>
              </div>
              <div className="flex justify-between">
                <span>Capital Gains Tax (15%):</span>
                <span className="font-medium text-red-600">{fmt(taxSavings)}</span>
              </div>
              <div className="flex justify-between">
                <span>High bracket (23.8%):</span>
                <span className="font-medium text-red-600">{fmt(taxSavingsHighBracket)}</span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-lg border bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-700 dark:text-green-400">WITH Step-Up (You Inherit)</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              If you sell at current value:
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Your Basis:</span>
                <span className="font-medium">{fmt(valueAtDeath)}</span>
              </div>
              <div className="flex justify-between">
                <span>Gain if sold at {fmt(valueAtDeath)}:</span>
                <span className="font-bold text-green-600">$0</span>
              </div>
              <div className="flex justify-between">
                <span>Capital Gains Tax:</span>
                <span className="font-bold text-green-600">$0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Tax Savings from Step-Up</p>
            <p className="text-3xl font-bold text-green-600">{fmt(taxSavings)} - {fmt(taxSavingsHighBracket)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              This is tax that simply disappears forever
            </p>
          </div>
        </div>

        {/* Key Point */}
        <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <Lightbulb className="h-4 w-4 text-blue-600" />
          <AlertTitle>The Key Insight</AlertTitle>
          <AlertDescription className="text-sm">
            All appreciation during the decedent's lifetime is <strong>never taxed</strong>.
            This is why wealthy families often hold appreciated assets until death rather than
            selling. The step-up in basis effectively erases the tax liability.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
});

interface InheritedIRACalculatorProps {
  inputs: InheritanceCalculatorInputs;
  onInputChange: (field: keyof InheritanceCalculatorInputs, value: number | FilingStatus) => void;
}

const InheritedIRACalculator = React.memo(function InheritedIRACalculator({
  inputs,
  onInputChange,
}: InheritedIRACalculatorProps) {
  const schedule = useMemo(
    () =>
      generateWithdrawalSchedule(
        inputs.inheritedTraditionalIRA,
        inputs.inheritedRothIRA,
        inputs.beneficiaryTaxRate
      ),
    [inputs.inheritedTraditionalIRA, inputs.inheritedRothIRA, inputs.beneficiaryTaxRate]
  );

  const totalTraditionalTax = schedule.reduce((sum, y) => sum + y.traditionalTax, 0);
  const totalTraditionalWithdrawn = schedule.reduce((sum, y) => sum + y.traditionalWithdrawal, 0);
  const totalRothWithdrawn = schedule.reduce((sum, y) => sum + y.rothWithdrawal, 0);

  // Calculate optimal vs worst-case for traditional
  const worstCaseTax = inputs.inheritedTraditionalIRA * 0.37; // If cashed out all at once in top bracket
  const taxSavingsFromSpreading = worstCaseTax - totalTraditionalTax;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Calculator className="h-5 w-5 text-amber-600" />
          Inherited IRA Withdrawal Calculator
        </CardTitle>
        <CardDescription>
          Plan your withdrawals to minimize taxes over the 10-year window
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Inputs */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <Label className="text-sm font-medium">Inherited Traditional IRA</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={inputs.inheritedTraditionalIRA.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(val)) onInputChange('inheritedTraditionalIRA', val);
                }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Inherited Roth IRA</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                value={inputs.inheritedRothIRA.toLocaleString()}
                onChange={(e) => {
                  const val = parseFloat(e.target.value.replace(/[^0-9.-]/g, ''));
                  if (!isNaN(val)) onInputChange('inheritedRothIRA', val);
                }}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Your Tax Rate: {(inputs.beneficiaryTaxRate * 100).toFixed(0)}%
            </Label>
            <Slider
              value={[inputs.beneficiaryTaxRate * 100]}
              onValueChange={([v]) => onInputChange('beneficiaryTaxRate', v / 100)}
              min={10}
              max={37}
              step={1}
              thumbLabel="Your tax rate"
            />
            <p className="text-xs text-muted-foreground">
              Your marginal tax rate (likely in peak earning years)
            </p>
          </div>

          <div className="space-y-3">
            <Label className="text-sm font-medium">Filing Status</Label>
            <Select
              value={inputs.filingStatus}
              onValueChange={(v) => onInputChange('filingStatus', v as FilingStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single</SelectItem>
                <SelectItem value="married">Married Filing Jointly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Withdrawal Schedule */}
        {(inputs.inheritedTraditionalIRA > 0 || inputs.inheritedRothIRA > 0) && (
          <>
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-5 gap-2 p-3 bg-muted/50 text-xs font-medium">
                <div>Year</div>
                <div className="text-right">Trad. Withdrawal</div>
                <div className="text-right">Tax</div>
                <div className="text-right">Roth Withdrawal</div>
                <div className="text-right">Roth Tax</div>
              </div>
              <div className="divide-y max-h-[300px] overflow-y-auto">
                {schedule.map((year) => (
                  <div
                    key={year.year}
                    className={cn(
                      'grid grid-cols-5 gap-2 p-3 text-sm',
                      year.year === 10 && 'bg-emerald-50 dark:bg-emerald-950/30'
                    )}
                  >
                    <div className="font-medium">Year {year.year}</div>
                    <div className="text-right">{fmt(year.traditionalWithdrawal)}</div>
                    <div className="text-right text-red-600">-{fmt(year.traditionalTax)}</div>
                    <div className="text-right">
                      {year.rothWithdrawal > 0 ? fmt(year.rothWithdrawal) : '-'}
                    </div>
                    <div className="text-right text-green-600">$0</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
                <p className="text-sm text-muted-foreground">Traditional IRA Taxes</p>
                <p className="text-2xl font-bold text-amber-600">{fmt(totalTraditionalTax)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Over 10 years at {(inputs.beneficiaryTaxRate * 100).toFixed(0)}%
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
                <p className="text-sm text-muted-foreground">Roth IRA Taxes</p>
                <p className="text-2xl font-bold text-emerald-600">$0</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tax-free growth + withdrawal
                </p>
              </div>

              <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
                <p className="text-sm text-muted-foreground">Savings vs Cash-Out</p>
                <p className="text-2xl font-bold text-blue-600">{fmt(taxSavingsFromSpreading)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  By spreading vs. 37% bracket
                </p>
              </div>
            </div>
          </>
        )}

        {/* Strategy Alert */}
        <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
          <Sparkles className="h-4 w-4 text-emerald-600" />
          <AlertTitle>Inherited Roth Strategy</AlertTitle>
          <AlertDescription className="text-sm">
            <strong>Let the Roth grow until year 10, then withdraw everything tax-free.</strong> This
            maximizes the value of tax-free compounding. There's no benefit to withdrawing early since
            there's no tax anyway - let it grow!
          </AlertDescription>
        </Alert>

        {/* RMD Warning */}
        <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/30">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle>New IRS Guidance on RMDs</AlertTitle>
          <AlertDescription className="text-sm">
            Starting in 2024, if the original owner was already taking RMDs before death, beneficiaries
            must also take annual distributions (not just empty by year 10). The penalty for missing an
            RMD is 25% of the amount that should have been withdrawn. Check with a tax professional.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
});

// ===============================
// Main Component
// ===============================

export interface InheritanceGuideProps {
  className?: string;
  initialExpanded?: string[];
}

export function InheritanceGuide({
  className,
  initialExpanded = ['asset-types', 'what-to-do'],
}: InheritanceGuideProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(initialExpanded);

  // Step-up calculator state
  const [originalBasis, setOriginalBasis] = useState(10000);
  const [valueAtDeath, setValueAtDeath] = useState(100000);

  // Inherited IRA calculator state
  const [calculatorInputs, setCalculatorInputs] = useState<InheritanceCalculatorInputs>({
    inheritedTraditionalIRA: 500000,
    inheritedRothIRA: 200000,
    inheritedTaxableInvestments: 0,
    originalBasis: 10000,
    valueAtDeath: 100000,
    beneficiaryTaxRate: 0.32,
    filingStatus: 'married',
    currentAge: 45,
  });

  const handleInputChange = useCallback(
    (field: keyof InheritanceCalculatorInputs, value: number | FilingStatus) => {
      setCalculatorInputs((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Heart className="h-6 w-6 text-blue-600" />
            Inheritance Receiving Guide
          </CardTitle>
          <CardDescription className="text-base">
            When you receive an inheritance, the decisions you make in the first year can save
            or cost you tens of thousands of dollars. This is where people make expensive mistakes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/30">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle>Take Your Time</AlertTitle>
            <AlertDescription>
              You are likely grieving. There is no rush to make financial decisions. Most actions
              can wait 6-12 months. The biggest mistake people make is acting too quickly.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Accordion Sections */}
      <Accordion
        type="multiple"
        value={expandedSections}
        onValueChange={setExpandedSections}
        className="space-y-3"
      >
        {/* What to Do First */}
        <AccordionItem value="what-to-do" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-rose-600" />
              <span className="font-semibold">What to Do First</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {WHAT_TO_DO_FIRST.map((item, index) => {
                const Icon = item.icon;
                return (
                  <MotionDiv
                    key={item.step}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-4 rounded-lg border bg-card"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {item.title}
                      </h4>
                      <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Types of Inherited Assets */}
        <AccordionItem value="asset-types" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <span className="font-semibold">Types of Inherited Assets & Tax Treatment</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              Different types of inherited assets have vastly different tax treatments.
              Understanding these differences is critical for making good decisions.
            </p>
            <div className="grid gap-3">
              {ASSET_TYPES.map((asset, index) => (
                <AssetTypeCard key={asset.type} asset={asset} delay={index} />
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Step-Up in Basis */}
        <AccordionItem value="step-up" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Step-Up in Basis Explained</span>
              <Badge className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                HUGE Benefit
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <StepUpExplainer
              originalBasis={originalBasis}
              valueAtDeath={valueAtDeath}
              onBasisChange={setOriginalBasis}
              onValueChange={setValueAtDeath}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Inherited IRA Rules */}
        <AccordionItem value="inherited-ira" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="font-semibold">Inherited IRA Rules (Post-SECURE Act)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Spouse Rules */}
              <Card className="border-green-200 dark:border-green-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Spouse Beneficiary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Can roll into your own IRA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>Treated as if it was always yours</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>No 10-year rule applies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                      <span>RMDs based on your age</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Non-Spouse Rules */}
              <Card className="border-amber-200 dark:border-amber-800">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    Non-Spouse Beneficiary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <span><strong>10-year rule:</strong> Must empty by end of 10th year</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>Cannot roll into your own IRA</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>RMDs may be required annually (new IRS guidance)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                      <span>Plan withdrawals to minimize tax brackets</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Exceptions to 10-Year Rule */}
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertTitle>Exceptions to the 10-Year Rule</AlertTitle>
              <AlertDescription className="text-sm">
                These "Eligible Designated Beneficiaries" can still stretch over their lifetime:
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li>Surviving spouse</li>
                  <li>Disabled or chronically ill individuals</li>
                  <li>Individuals not more than 10 years younger than the deceased</li>
                  <li>Minor children of the deceased (until they reach majority)</li>
                </ul>
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* Inherited Roth Strategy */}
        <AccordionItem value="inherited-roth" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold">Inherited Roth IRA Strategy</span>
              <Badge className="ml-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                TAX-FREE
              </Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-4 pt-4">
            <div className="p-4 rounded-lg bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200 dark:border-emerald-800">
              <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
                The Optimal Strategy
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <p className="font-medium">Same 10-year rule applies</p>
                    <p className="text-muted-foreground">You must empty the inherited Roth by the end of the 10th year</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <p className="font-medium">But withdrawals are TAX-FREE</p>
                    <p className="text-muted-foreground">Unlike traditional IRAs, you pay no tax on any withdrawals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <p className="font-medium">Let it grow until year 10, then withdraw all</p>
                    <p className="text-muted-foreground">Maximize tax-free compounding - there's no benefit to withdrawing early</p>
                  </div>
                </div>
              </div>
            </div>

            <Alert className="border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30">
              <Lightbulb className="h-4 w-4 text-emerald-600" />
              <AlertTitle>This is Why We Preserve Roth!</AlertTitle>
              <AlertDescription className="text-sm">
                When you inherit a Roth, you get years of tax-free growth plus tax-free withdrawals.
                This is why Roth accounts are so valuable for inheritance - the tax was already paid
                by the original owner, and your beneficiaries get everything tax-free.
              </AlertDescription>
            </Alert>
          </AccordionContent>
        </AccordionItem>

        {/* Calculator */}
        <AccordionItem value="calculator" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-blue-600" />
              <span className="font-semibold">Inheritance Calculator</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <InheritedIRACalculator
              inputs={calculatorInputs}
              onInputChange={handleInputChange}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Common Mistakes */}
        <AccordionItem value="mistakes" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-red-600" />
              <span className="font-semibold">Common Expensive Mistakes</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              These are the mistakes that cost people the most money. Avoid them.
            </p>
            {COMMON_MISTAKES.map((item, index) => (
              <MotionDiv
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="rounded-lg border overflow-hidden"
              >
                <div className="p-4 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
                  <div className="flex items-start gap-2">
                    <Ban className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-700 dark:text-red-400 text-sm">
                        {item.mistake}
                      </p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        Consequence: {item.consequence}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-950/30">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                    <p className="text-sm text-green-700 dark:text-green-400">
                      <strong>Instead:</strong> {item.fix}
                    </p>
                  </div>
                </div>
              </MotionDiv>
            ))}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Disclaimer */}
      <div className="pt-4 border-t">
        <p className="text-xs text-muted-foreground italic">
          This guide provides general educational information about inheritance planning and is not
          legal, tax, or financial advice. Tax laws are complex and change frequently. The SECURE Act
          and subsequent IRS guidance have specific requirements that vary based on individual
          circumstances. Always consult with qualified tax and legal professionals before making
          decisions about inherited assets.
        </p>
      </div>
    </div>
  );
}

InheritanceGuide.displayName = 'InheritanceGuide';

export default InheritanceGuide;
