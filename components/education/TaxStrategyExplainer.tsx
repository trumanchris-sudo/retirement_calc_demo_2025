'use client';

import React, { useState, useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmtFull } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TAX_BRACKETS, RMD_DIVISORS, RMD_START_AGE } from '@/lib/constants';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

// =============================================================================
// TYPES
// =============================================================================

type FilingStatus = 'single' | 'married';

interface TaxBracket {
  limit: number;
  rate: number;
}

interface BracketCalculation {
  rate: number;
  rangeStart: number;
  rangeEnd: number;
  amountInBracket: number;
  taxPaid: number;
  isActive: boolean;
  isFilling: boolean;
}

// State tax data by state
const STATE_TAX_DATA: Record<string, { name: string; rate: number; type: 'none' | 'flat' | 'progressive' }> = {
  CA: { name: 'California', rate: 13.3, type: 'progressive' },
  NY: { name: 'New York', rate: 10.9, type: 'progressive' },
  NJ: { name: 'New Jersey', rate: 10.75, type: 'progressive' },
  TX: { name: 'Texas', rate: 0, type: 'none' },
  FL: { name: 'Florida', rate: 0, type: 'none' },
  WA: { name: 'Washington', rate: 0, type: 'none' },
  NV: { name: 'Nevada', rate: 0, type: 'none' },
  TN: { name: 'Tennessee', rate: 0, type: 'none' },
  WY: { name: 'Wyoming', rate: 0, type: 'none' },
  SD: { name: 'South Dakota', rate: 0, type: 'none' },
  AK: { name: 'Alaska', rate: 0, type: 'none' },
  NH: { name: 'New Hampshire', rate: 0, type: 'none' },
  AZ: { name: 'Arizona', rate: 2.5, type: 'flat' },
  CO: { name: 'Colorado', rate: 4.4, type: 'flat' },
  IL: { name: 'Illinois', rate: 4.95, type: 'flat' },
  PA: { name: 'Pennsylvania', rate: 3.07, type: 'flat' },
};

// =============================================================================
// ANIMATED TAX BRACKET EXPLANATION
// =============================================================================

interface AnimatedBracketBarProps {
  bracket: BracketCalculation;
  index: number;
  isAnimating: boolean;
}

function AnimatedBracketBar({ bracket, index, isAnimating }: AnimatedBracketBarProps) {
  const bracketColors: Record<number, { bg: string; text: string }> = {
    10: { bg: 'bg-emerald-400', text: 'text-emerald-700' },
    12: { bg: 'bg-emerald-500', text: 'text-emerald-800' },
    22: { bg: 'bg-yellow-400', text: 'text-yellow-700' },
    24: { bg: 'bg-amber-400', text: 'text-amber-700' },
    32: { bg: 'bg-orange-400', text: 'text-orange-700' },
    35: { bg: 'bg-red-400', text: 'text-red-700' },
    37: { bg: 'bg-red-600', text: 'text-red-800' },
  };

  const colors = bracketColors[bracket.rate] || { bg: 'bg-gray-400', text: 'text-gray-700' };
  const fillPercent = bracket.isActive
    ? Math.min(100, (bracket.amountInBracket / (bracket.rangeEnd - bracket.rangeStart)) * 100)
    : 0;

  return (
    <MotionDiv
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      className={cn(
        'relative rounded-lg border-2 overflow-hidden transition-all duration-300',
        bracket.isActive
          ? 'border-primary shadow-lg'
          : 'border-muted opacity-50',
        bracket.isFilling && 'ring-2 ring-blue-400 ring-offset-2'
      )}
    >
      {/* Background fill animation */}
      <div className="absolute inset-0 bg-muted/30" />
      <MotionDiv
        className={cn('absolute inset-y-0 left-0', colors.bg, 'opacity-30')}
        initial={{ width: 0 }}
        animate={{ width: isAnimating ? `${fillPercent}%` : `${fillPercent}%` }}
        transition={{ duration: 0.8, delay: index * 0.15, ease: 'easeOut' }}
      />

      <div className="relative p-4 flex items-center gap-4">
        {/* Rate badge */}
        <div className={cn(
          'flex-shrink-0 w-14 h-14 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-md',
          colors.bg
        )}>
          {bracket.rate}%
        </div>

        {/* Bracket info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground font-medium">
            {fmtFull(bracket.rangeStart)} - {bracket.rangeEnd === Infinity ? 'and up' : fmtFull(bracket.rangeEnd)}
          </div>
          {bracket.isActive && bracket.amountInBracket > 0 && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2 space-y-1"
            >
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Income in bracket:</span>
                <span className="font-semibold">{fmtFull(bracket.amountInBracket)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax on this portion:</span>
                <span className={cn('font-semibold', colors.text)}>{fmtFull(bracket.taxPaid)}</span>
              </div>
            </MotionDiv>
          )}
        </div>

        {/* Visual fill indicator */}
        {bracket.isActive && (
          <div className="w-20 text-center">
            <div className="text-xs text-muted-foreground mb-1">Filled</div>
            <div className="text-lg font-bold">{Math.round(fillPercent)}%</div>
          </div>
        )}
      </div>
    </MotionDiv>
  );
}

function TaxBracketAnimation() {
  const [income, setIncome] = useState(120000);
  const [filingStatus, setFilingStatus] = useState<FilingStatus>('married');
  const [isAnimating, setIsAnimating] = useState(true);

  const brackets = TAX_BRACKETS[filingStatus];

  const calculations = useMemo(() => {
    const taxableIncome = Math.max(0, income - brackets.deduction);
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    let prevLimit = 0;
    let foundFillingBracket = false;

    const bracketDetails: BracketCalculation[] = brackets.rates.map((bracket: TaxBracket) => {
      const rangeStart = prevLimit;
      const rangeEnd = bracket.limit;
      const bracketWidth = rangeEnd - rangeStart;
      const amountInBracket = Math.max(0, Math.min(remainingIncome, bracketWidth));
      const taxPaid = amountInBracket * bracket.rate;
      const isActive = amountInBracket > 0;

      // Mark the bracket that's currently being filled
      const isFilling = isActive && remainingIncome <= bracketWidth && !foundFillingBracket;
      if (isFilling) foundFillingBracket = true;

      remainingIncome -= amountInBracket;
      totalTax += taxPaid;
      prevLimit = bracket.limit;

      return {
        rate: bracket.rate * 100,
        rangeStart,
        rangeEnd,
        amountInBracket,
        taxPaid,
        isActive,
        isFilling,
      };
    });

    const effectiveRate = income > 0 ? (totalTax / income) * 100 : 0;
    const currentBracket = [...bracketDetails].reverse().find((b) => b.isActive);

    return {
      taxableIncome,
      bracketDetails,
      totalTax,
      effectiveRate,
      marginalRate: currentBracket?.rate || 10,
    };
  }, [income, brackets]);

  const handleIncomeChange = useCallback((values: number[]) => {
    setIncome(values[0]);
    setIsAnimating(true);
    // Reset animation state after a short delay
    setTimeout(() => setIsAnimating(false), 1000);
  }, []);

  return (
    <div className="space-y-6">
      {/* Key insight */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30
                   border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center"
      >
        <p className="text-lg">
          Your income <span className="font-bold text-blue-600">&quot;fills up&quot;</span> each bracket like water in buckets
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Only the income that overflows into the next bucket is taxed at the higher rate
        </p>
      </MotionDiv>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-3">
                Gross Income: <span className="text-primary font-bold">{fmtFull(income)}</span>
              </label>
              <Slider
                value={[income]}
                onValueChange={handleIncomeChange}
                min={30000}
                max={600000}
                step={5000}
                thumbLabel="Adjust income"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Filing Status</label>
              <div className="flex gap-2">
                {(['single', 'married'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilingStatus(status)}
                    className={cn(
                      'flex-1 py-2 px-4 rounded-lg transition-all capitalize',
                      filingStatus === status
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted hover:bg-muted/80'
                    )}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t flex flex-wrap gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Standard Deduction:</span>{' '}
              <span className="font-medium">{fmtFull(brackets.deduction)}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Taxable Income:</span>{' '}
              <span className="font-medium">{fmtFull(calculations.taxableIncome)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Animated brackets */}
      <div className="space-y-3">
        {calculations.bracketDetails.map((bracket, i) => (
          <AnimatedBracketBar
            key={i}
            bracket={bracket}
            index={i}
            isAnimating={isAnimating}
          />
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Tax</p>
            <p className="text-2xl font-bold text-red-600">{fmtFull(calculations.totalTax)}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Marginal Rate</p>
            <p className="text-2xl font-bold text-amber-600">{calculations.marginalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Tax on your next dollar</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Effective Rate</p>
            <p className="text-2xl font-bold text-emerald-600">{calculations.effectiveRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-1">Actual % of income paid</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// ROTH VS TRADITIONAL VISUAL COMPARISON
// =============================================================================

function RothVsTraditionalComparison() {
  const [contribution, setContribution] = useState(7000);
  const [years, setYears] = useState(25);
  const [currentRate, setCurrentRate] = useState(24);
  const [futureRate, setFutureRate] = useState(32);
  const growthRate = 0.07;

  const calculations = useMemo(() => {
    const futureValue = contribution * Math.pow(1 + growthRate, years);

    // Traditional: Contribute pre-tax, pay tax on withdrawal
    const traditionalFV = contribution * Math.pow(1 + growthRate, years);
    const traditionalTax = traditionalFV * (futureRate / 100);
    const traditionalNet = traditionalFV - traditionalTax;

    // Roth: Pay tax now, grow tax-free
    const rothTaxNow = contribution * (currentRate / 100);
    const rothContribution = contribution; // Same contribution amount
    const rothFV = rothContribution * Math.pow(1 + growthRate, years);
    const rothNet = rothFV; // No tax on withdrawal

    const winner = rothNet > traditionalNet ? 'roth' : 'traditional';
    const advantage = Math.abs(rothNet - traditionalNet);

    return {
      futureValue,
      traditionalFV,
      traditionalTax,
      traditionalNet,
      rothTaxNow,
      rothFV,
      rothNet,
      winner,
      advantage,
      growthMultiple: Math.pow(1 + growthRate, years),
    };
  }, [contribution, years, currentRate, futureRate, growthRate]);

  return (
    <div className="space-y-6">
      {/* Visual comparison header */}
      <div className="grid md:grid-cols-2 gap-4">
        <MotionDiv
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="relative"
        >
          <Card className={cn(
            'border-2 transition-all',
            calculations.winner === 'traditional'
              ? 'border-amber-400 shadow-lg shadow-amber-100'
              : 'border-amber-200'
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-500" />
                <CardTitle className="text-lg">Traditional</CardTitle>
                {calculations.winner === 'traditional' && (
                  <Badge variant="outline" className="bg-amber-100 text-amber-700 ml-auto">Winner</Badge>
                )}
              </div>
              <CardDescription>Pay tax later at {futureRate}%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Contribution (pre-tax)</span>
                  <span className="font-medium">{fmtFull(contribution)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax savings now</span>
                  <span className="font-medium text-emerald-600">+{fmtFull(contribution * (currentRate / 100))}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <MotionDiv
                    className="h-full bg-amber-500"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Future Value ({years} yrs)</span>
                  <span className="font-bold">{fmtFull(calculations.traditionalFV)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax at withdrawal</span>
                  <span className="font-medium text-red-600">-{fmtFull(calculations.traditionalTax)}</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden mt-2">
                  <MotionDiv
                    className="h-full bg-gradient-to-r from-amber-400 to-red-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${(calculations.traditionalNet / calculations.traditionalFV) * 100}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="text-center pt-2">
                  <div className="text-xs text-muted-foreground">You keep</div>
                  <div className="text-2xl font-bold text-amber-600">{fmtFull(calculations.traditionalNet)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>

        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={cn(
            'border-2 transition-all',
            calculations.winner === 'roth'
              ? 'border-emerald-400 shadow-lg shadow-emerald-100'
              : 'border-emerald-200'
          )}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500" />
                <CardTitle className="text-lg">Roth</CardTitle>
                {calculations.winner === 'roth' && (
                  <Badge variant="outline" className="bg-emerald-100 text-emerald-700 ml-auto">Winner</Badge>
                )}
              </div>
              <CardDescription>Pay tax now at {currentRate}%</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Contribution (after-tax)</span>
                  <span className="font-medium">{fmtFull(contribution)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax paid now</span>
                  <span className="font-medium text-red-600">-{fmtFull(calculations.rothTaxNow)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <MotionDiv
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8 }}
                  />
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Future Value ({years} yrs)</span>
                  <span className="font-bold">{fmtFull(calculations.rothFV)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Tax at withdrawal</span>
                  <span className="font-medium text-emerald-600">$0</span>
                </div>
                <div className="h-3 bg-emerald-500 rounded-full overflow-hidden mt-2">
                  <MotionDiv
                    className="h-full bg-emerald-500"
                    initial={{ width: 0 }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
                <div className="text-center pt-2">
                  <div className="text-xs text-muted-foreground">You keep</div>
                  <div className="text-2xl font-bold text-emerald-600">{fmtFull(calculations.rothNet)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MotionDiv>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Contribution: <span className="text-primary font-bold">{fmtFull(contribution)}</span>
              </label>
              <Slider
                value={[contribution]}
                onValueChange={([v]) => setContribution(v)}
                min={1000}
                max={23000}
                step={500}
                thumbLabel="Adjust contribution"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Years: <span className="text-primary font-bold">{years}</span>
              </label>
              <Slider
                value={[years]}
                onValueChange={([v]) => setYears(v)}
                min={5}
                max={40}
                step={1}
                thumbLabel="Adjust years"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Current Rate: <span className="text-emerald-600 font-bold">{currentRate}%</span>
              </label>
              <Slider
                value={[currentRate]}
                onValueChange={([v]) => setCurrentRate(v)}
                min={10}
                max={37}
                step={1}
                thumbLabel="Adjust current rate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Future Rate: <span className="text-amber-600 font-bold">{futureRate}%</span>
              </label>
              <Slider
                value={[futureRate]}
                onValueChange={([v]) => setFutureRate(v)}
                min={10}
                max={40}
                step={1}
                thumbLabel="Adjust future rate"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key insight */}
      <div className={cn(
        'rounded-xl p-6 text-center',
        calculations.winner === 'roth'
          ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800'
          : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800'
      )}>
        <p className="text-lg">
          With your settings, <span className="font-bold">{calculations.winner === 'roth' ? 'Roth' : 'Traditional'}</span> wins by{' '}
          <span className="font-bold text-blue-600">{fmtFull(calculations.advantage)}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Your money grows <span className="font-semibold">{calculations.growthMultiple.toFixed(1)}x</span> over {years} years
          {calculations.winner === 'roth' && ' - paying lower taxes now beats higher taxes on that growth'}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// TAX-LOSS HARVESTING STEP-BY-STEP
// =============================================================================

interface HarvestingStep {
  step: number;
  title: string;
  description: string;
  before: { asset: string; value: number; basis: number };
  after: { asset: string; value: number; basis: number };
  taxImpact: number;
}

function TaxLossHarvestingGuide() {
  const [lossAmount, setLossAmount] = useState(15000);
  const [gainAmount, setGainAmount] = useState(20000);
  const [taxRate] = useState(15); // LTCG rate
  const [activeStep, setActiveStep] = useState(0);

  const steps: HarvestingStep[] = useMemo(() => [
    {
      step: 1,
      title: 'Identify a Loss Position',
      description: 'Find an investment that has declined in value below your purchase price (cost basis)',
      before: { asset: 'Stock A', value: 85000, basis: 100000 },
      after: { asset: 'Stock A', value: 85000, basis: 100000 },
      taxImpact: 0,
    },
    {
      step: 2,
      title: 'Sell the Losing Investment',
      description: 'Sell the asset to "realize" the loss - this makes it count for tax purposes',
      before: { asset: 'Stock A', value: 85000, basis: 100000 },
      after: { asset: 'Cash', value: 85000, basis: 85000 },
      taxImpact: -lossAmount,
    },
    {
      step: 3,
      title: 'Offset Capital Gains',
      description: `Use the ${fmtFull(lossAmount)} loss to offset ${fmtFull(Math.min(lossAmount, gainAmount))} in capital gains`,
      before: { asset: 'Gains', value: gainAmount, basis: 0 },
      after: { asset: 'Taxable Gains', value: Math.max(0, gainAmount - lossAmount), basis: 0 },
      taxImpact: -Math.min(lossAmount, gainAmount) * (taxRate / 100),
    },
    {
      step: 4,
      title: 'Reinvest in Similar Asset',
      description: 'Buy a similar (but not "substantially identical") investment to maintain your market exposure',
      before: { asset: 'Cash', value: 85000, basis: 85000 },
      after: { asset: 'Stock B (similar)', value: 85000, basis: 85000 },
      taxImpact: 0,
    },
  ], [lossAmount, gainAmount, taxRate]);

  const totalTaxSavings = Math.min(lossAmount, gainAmount) * (taxRate / 100);
  const excessLoss = Math.max(0, lossAmount - gainAmount);
  const ordinaryIncomeOffset = Math.min(excessLoss, 3000);

  return (
    <div className="space-y-6">
      {/* Introduction */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30
                   border border-purple-200 dark:border-purple-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-2">What is Tax-Loss Harvesting?</h3>
        <p className="text-muted-foreground">
          Selling investments at a loss to offset capital gains taxes - then immediately reinvesting
          in a similar asset to maintain your investment strategy. You keep your market exposure
          while reducing your tax bill.
        </p>
      </MotionDiv>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Loss to Harvest: <span className="text-red-600 font-bold">{fmtFull(lossAmount)}</span>
              </label>
              <Slider
                value={[lossAmount]}
                onValueChange={([v]) => setLossAmount(v)}
                min={1000}
                max={50000}
                step={1000}
                thumbLabel="Adjust loss amount"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Capital Gains to Offset: <span className="text-emerald-600 font-bold">{fmtFull(gainAmount)}</span>
              </label>
              <Slider
                value={[gainAmount]}
                onValueChange={([v]) => setGainAmount(v)}
                min={0}
                max={50000}
                step={1000}
                thumbLabel="Adjust gain amount"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step-by-step visualization */}
      <div className="space-y-4">
        {steps.map((step, index) => (
          <MotionDiv
            key={step.step}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className={cn(
                'cursor-pointer transition-all',
                activeStep === index
                  ? 'ring-2 ring-primary shadow-lg'
                  : 'hover:shadow-md'
              )}
              onClick={() => setActiveStep(index)}
            >
              <CardContent className="pt-4">
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <div className={cn(
                    'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg',
                    activeStep >= index
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  )}>
                    {step.step}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold">{step.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>

                    {activeStep === index && (
                      <MotionDiv
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-4 grid md:grid-cols-2 gap-4"
                      >
                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-xs text-muted-foreground mb-2">Before</div>
                          <div className="font-medium">{step.before.asset}</div>
                          <div className="text-sm">Value: {fmtFull(step.before.value)}</div>
                          <div className="text-sm text-muted-foreground">Basis: {fmtFull(step.before.basis)}</div>
                        </div>
                        <div className="bg-primary/10 rounded-lg p-4">
                          <div className="text-xs text-muted-foreground mb-2">After</div>
                          <div className="font-medium">{step.after.asset}</div>
                          <div className="text-sm">Value: {fmtFull(step.after.value)}</div>
                          <div className="text-sm text-muted-foreground">Basis: {fmtFull(step.after.basis)}</div>
                        </div>
                      </MotionDiv>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </MotionDiv>
        ))}
      </div>

      {/* Results summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Tax Savings</p>
            <p className="text-2xl font-bold text-emerald-600">{fmtFull(totalTaxSavings)}</p>
            <p className="text-xs text-muted-foreground mt-1">At {taxRate}% LTCG rate</p>
          </CardContent>
        </Card>

        {excessLoss > 0 && (
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Excess Loss</p>
              <p className="text-2xl font-bold">{fmtFull(excessLoss)}</p>
              <p className="text-xs text-muted-foreground mt-1">Carries forward to future years</p>
            </CardContent>
          </Card>
        )}

        {excessLoss > 0 && (
          <Card className="border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-muted-foreground">Ordinary Income Offset</p>
              <p className="text-2xl font-bold text-blue-600">{fmtFull(ordinaryIncomeOffset)}</p>
              <p className="text-xs text-muted-foreground mt-1">Up to $3,000/year against income</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wash sale warning */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-6">
        <h4 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2 mb-3">
          <span className="text-xl">&#x26A0;</span> Watch Out: Wash Sale Rule
        </h4>
        <p className="text-sm text-muted-foreground">
          You cannot buy a &quot;substantially identical&quot; security within 30 days before or after
          the sale. This means you cannot buy back the exact same stock or fund - but you CAN buy
          a similar ETF tracking a different index (e.g., sell S&P 500 ETF, buy Total Market ETF).
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// ROTH CONVERSION LADDER ILLUSTRATION
// =============================================================================

interface LadderYear {
  year: number;
  conversion: number;
  accessible: boolean;
  taxPaid: number;
  runningTotal: number;
}

function RothConversionLadder() {
  const [annualConversion, setAnnualConversion] = useState(50000);
  const [taxRate, setTaxRate] = useState(12);
  const [startAge, setStartAge] = useState(55);
  const currentYear = new Date().getFullYear();

  const ladder = useMemo(() => {
    const years: LadderYear[] = [];
    let runningTotal = 0;

    // Build 10-year ladder
    for (let i = 0; i < 10; i++) {
      const conversion = annualConversion;
      const taxPaid = conversion * (taxRate / 100);
      runningTotal += conversion;

      years.push({
        year: currentYear + i,
        conversion,
        accessible: i >= 5, // 5-year rule
        taxPaid,
        runningTotal,
      });
    }

    return years;
  }, [annualConversion, taxRate, currentYear]);

  const totalConverted = ladder.reduce((sum, y) => sum + y.conversion, 0);
  const totalTaxPaid = ladder.reduce((sum, y) => sum + y.taxPaid, 0);
  const accessibleAmount = ladder.filter(y => y.accessible).reduce((sum, y) => sum + y.conversion, 0);

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30
                   border border-indigo-200 dark:border-indigo-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-2">The Roth Conversion Ladder Strategy</h3>
        <p className="text-muted-foreground">
          Convert Traditional IRA to Roth each year during low-income years (like early retirement).
          After 5 years, those converted funds become accessible penalty-free - creating a
          &quot;ladder&quot; of tax-free income.
        </p>
      </MotionDiv>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium mb-2">
                Annual Conversion: <span className="text-primary font-bold">{fmtFull(annualConversion)}</span>
              </label>
              <Slider
                value={[annualConversion]}
                onValueChange={([v]) => setAnnualConversion(v)}
                min={10000}
                max={150000}
                step={5000}
                thumbLabel="Adjust annual conversion"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Tax Rate at Conversion: <span className="text-amber-600 font-bold">{taxRate}%</span>
              </label>
              <Slider
                value={[taxRate]}
                onValueChange={([v]) => setTaxRate(v)}
                min={10}
                max={32}
                step={1}
                thumbLabel="Adjust tax rate"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Starting Age: <span className="text-blue-600 font-bold">{startAge}</span>
              </label>
              <Slider
                value={[startAge]}
                onValueChange={([v]) => setStartAge(v)}
                min={50}
                max={65}
                step={1}
                thumbLabel="Adjust starting age"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Visual ladder */}
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-1 bg-gradient-to-b from-indigo-200 via-purple-300 to-emerald-400 rounded-full" />

        <div className="space-y-3">
          {ladder.map((year, index) => (
            <MotionDiv
              key={year.year}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="relative pl-20"
            >
              {/* Timeline node */}
              <div className={cn(
                'absolute left-5 w-7 h-7 rounded-full border-4 bg-background',
                year.accessible
                  ? 'border-emerald-500'
                  : 'border-indigo-400'
              )}>
                {year.accessible && (
                  <span className="absolute inset-0 flex items-center justify-center text-emerald-500 text-sm">
                    &#x2713;
                  </span>
                )}
              </div>

              <Card className={cn(
                'transition-all',
                year.accessible
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : ''
              )}>
                <CardContent className="py-3 px-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="min-w-[100px]">
                      <div className="text-sm text-muted-foreground">Year {index + 1}</div>
                      <div className="font-semibold">{year.year}</div>
                      <div className="text-xs text-muted-foreground">Age {startAge + index}</div>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                      <div className="text-sm text-muted-foreground">Convert</div>
                      <div className="font-semibold text-indigo-600">{fmtFull(year.conversion)}</div>
                    </div>

                    <div className="min-w-[100px]">
                      <div className="text-sm text-muted-foreground">Tax Paid</div>
                      <div className="font-medium text-amber-600">{fmtFull(year.taxPaid)}</div>
                    </div>

                    <div className="min-w-[120px]">
                      <Badge
                        variant={year.accessible ? 'default' : 'outline'}
                        className={cn(
                          year.accessible
                            ? 'bg-emerald-500'
                            : 'text-muted-foreground'
                        )}
                      >
                        {year.accessible ? 'Accessible' : `Wait ${5 - index} more years`}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </MotionDiv>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Converted</p>
            <p className="text-2xl font-bold text-indigo-600">{fmtFull(totalConverted)}</p>
            <p className="text-xs text-muted-foreground mt-1">Over 10 years</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Tax Paid</p>
            <p className="text-2xl font-bold text-amber-600">{fmtFull(totalTaxPaid)}</p>
            <p className="text-xs text-muted-foreground mt-1">At {taxRate}% rate</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Now Accessible</p>
            <p className="text-2xl font-bold text-emerald-600">{fmtFull(accessibleAmount)}</p>
            <p className="text-xs text-muted-foreground mt-1">Tax-free, penalty-free</p>
          </CardContent>
        </Card>
      </div>

      {/* Key insight */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
        <h4 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">Why This Works for Early Retirees</h4>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li>&#x2022; <strong>Gap years (ages 55-65):</strong> No income from work means you&apos;re in the lowest tax brackets</li>
          <li>&#x2022; <strong>Fill the lower brackets:</strong> Convert enough to stay in 10-12% bracket</li>
          <li>&#x2022; <strong>Bridge to 59.5:</strong> After 5 years, access conversions without 10% early withdrawal penalty</li>
          <li>&#x2022; <strong>Avoid future RMDs:</strong> Roth accounts have no Required Minimum Distributions</li>
        </ul>
      </div>
    </div>
  );
}

// =============================================================================
// RMD PLANNING VISUALIZATION
// =============================================================================

function RMDPlanningVisualization() {
  const [traditionalBalance, setTraditionalBalance] = useState(1000000);
  const [currentAge, setCurrentAge] = useState(65);
  const growthRate = 0.05;

  const rmdProjection = useMemo(() => {
    const years: Array<{
      age: number;
      balance: number;
      divisor: number;
      rmd: number;
      taxAt24: number;
      remainingAfterRMD: number;
    }> = [];

    let balance = traditionalBalance;
    const startAge = Math.max(currentAge, RMD_START_AGE);

    // Project RMDs from start age to 95
    for (let age = startAge; age <= 95; age++) {
      const divisor = RMD_DIVISORS[age] || RMD_DIVISORS[95];
      const rmd = balance / divisor;
      const taxAt24 = rmd * 0.24;

      years.push({
        age,
        balance,
        divisor,
        rmd,
        taxAt24,
        remainingAfterRMD: balance - rmd,
      });

      // Calculate next year's balance (growth minus RMD)
      balance = (balance - rmd) * (1 + growthRate);
    }

    return years;
  }, [traditionalBalance, currentAge, growthRate]);

  const peakRMD = Math.max(...rmdProjection.map(y => y.rmd));
  const totalRMDs = rmdProjection.reduce((sum, y) => sum + y.rmd, 0);
  const totalTaxes = rmdProjection.reduce((sum, y) => sum + y.taxAt24, 0);

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30
                   border border-orange-200 dark:border-orange-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-2">Required Minimum Distributions (RMDs)</h3>
        <p className="text-muted-foreground">
          Starting at age 73, you MUST withdraw a minimum amount from Traditional IRAs and 401(k)s
          each year - whether you need the money or not. These withdrawals are taxed as ordinary income,
          potentially pushing you into higher tax brackets.
        </p>
      </MotionDiv>

      {/* Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-2">
                Traditional IRA Balance: <span className="text-primary font-bold">{fmtFull(traditionalBalance)}</span>
              </label>
              <Slider
                value={[traditionalBalance]}
                onValueChange={([v]) => setTraditionalBalance(v)}
                min={100000}
                max={5000000}
                step={50000}
                thumbLabel="Adjust IRA balance"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Your Current Age: <span className="text-blue-600 font-bold">{currentAge}</span>
              </label>
              <Slider
                value={[currentAge]}
                onValueChange={([v]) => setCurrentAge(v)}
                min={50}
                max={80}
                step={1}
                thumbLabel="Adjust current age"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* RMD Timeline chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your RMD Schedule</CardTitle>
          <CardDescription>
            Required withdrawals from age {RMD_START_AGE} onwards
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="min-w-[600px] h-64 flex items-end gap-1">
              {rmdProjection.slice(0, 23).map((year, index) => (
                <MotionDiv
                  key={year.age}
                  initial={{ height: 0 }}
                  animate={{ height: `${(year.rmd / peakRMD) * 100}%` }}
                  transition={{ delay: index * 0.03, duration: 0.5 }}
                  className="flex-1 bg-gradient-to-t from-orange-500 to-red-400 rounded-t-sm relative group cursor-pointer"
                >
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background border shadow-lg rounded-lg p-2
                                  opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs z-10">
                    <div className="font-semibold">Age {year.age}</div>
                    <div>RMD: {fmtFull(year.rmd)}</div>
                    <div className="text-red-600">Tax: {fmtFull(year.taxAt24)}</div>
                  </div>
                </MotionDiv>
              ))}
            </div>
            <div className="flex gap-1 mt-2 min-w-[600px]">
              {rmdProjection.slice(0, 23).map((year, index) => (
                <div key={year.age} className="flex-1 text-center text-xs text-muted-foreground">
                  {index % 3 === 0 ? year.age : ''}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">First RMD (Age 73)</p>
            <p className="text-2xl font-bold text-orange-600">
              {fmtFull(rmdProjection.find(y => y.age === 73)?.rmd || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Peak RMD</p>
            <p className="text-2xl font-bold text-red-600">{fmtFull(peakRMD)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Age {rmdProjection.find(y => y.rmd === peakRMD)?.age}
            </p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total RMDs</p>
            <p className="text-2xl font-bold">{fmtFull(totalRMDs)}</p>
            <p className="text-xs text-muted-foreground mt-1">Through age 95</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Est. Taxes at 24%</p>
            <p className="text-2xl font-bold text-red-600">{fmtFull(totalTaxes)}</p>
            <p className="text-xs text-muted-foreground mt-1">On RMDs alone</p>
          </CardContent>
        </Card>
      </div>

      {/* RMD strategies */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-3">
              Strategies to Reduce RMDs
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-emerald-500">&#x2713;</span>
                <span><strong>Roth conversions:</strong> Convert Traditional to Roth before 73 to reduce RMD base</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">&#x2713;</span>
                <span><strong>QCDs:</strong> Donate RMDs directly to charity (up to $105k/year, tax-free)</span>
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-500">&#x2713;</span>
                <span><strong>Strategic withdrawals:</strong> Take more in low-income years to reduce future RMDs</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-amber-700 dark:text-amber-400 mb-3">
              RMD Timing Considerations
            </h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex gap-2">
                <span className="text-amber-500">&#x26A0;</span>
                <span><strong>First RMD deadline:</strong> April 1 of year after you turn 73</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">&#x26A0;</span>
                <span><strong>Subsequent RMDs:</strong> December 31 each year</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">&#x26A0;</span>
                <span><strong>Penalty:</strong> 25% excise tax on amounts not withdrawn on time</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// STATE TAX ARBITRAGE EXPLANATION
// =============================================================================

function StateTaxArbitrage() {
  const [workingState, setWorkingState] = useState('CA');
  const [retirementState, setRetirementState] = useState('FL');
  const [retirementIncome, setRetirementIncome] = useState(100000);

  const calculations = useMemo(() => {
    const workingStateData = STATE_TAX_DATA[workingState];
    const retirementStateData = STATE_TAX_DATA[retirementState];

    const workingStateTax = retirementIncome * (workingStateData.rate / 100);
    const retirementStateTax = retirementIncome * (retirementStateData.rate / 100);
    const annualSavings = workingStateTax - retirementStateTax;
    const twentyYearSavings = annualSavings * 20;

    return {
      workingStateTax,
      retirementStateTax,
      annualSavings,
      twentyYearSavings,
      workingStateData,
      retirementStateData,
    };
  }, [workingState, retirementState, retirementIncome]);

  const noTaxStates = Object.entries(STATE_TAX_DATA)
    .filter(([, data]) => data.rate === 0)
    .map(([code]) => code);

  const highTaxStates = Object.entries(STATE_TAX_DATA)
    .filter(([, data]) => data.rate >= 5)
    .sort((a, b) => b[1].rate - a[1].rate)
    .map(([code]) => code);

  return (
    <div className="space-y-6">
      {/* Explanation */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30
                   border border-teal-200 dark:border-teal-800 rounded-xl p-6"
      >
        <h3 className="text-lg font-semibold mb-2">State Tax Arbitrage Strategy</h3>
        <p className="text-muted-foreground">
          Work in a high-tax state while earning peak income (and building savings), then retire
          to a no-tax state to withdraw those savings tax-free. The difference can be worth
          hundreds of thousands over a retirement.
        </p>
      </MotionDiv>

      {/* State comparison map */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">&#x1F4BC;</span>
              Working State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={workingState}
              onChange={(e) => setWorkingState(e.target.value)}
              className="w-full p-3 rounded-lg border bg-background"
            >
              <optgroup label="High Tax States">
                {highTaxStates.map((code) => (
                  <option key={code} value={code}>
                    {STATE_TAX_DATA[code].name} ({STATE_TAX_DATA[code].rate}%)
                  </option>
                ))}
              </optgroup>
              <optgroup label="No Income Tax">
                {noTaxStates.map((code) => (
                  <option key={code} value={code}>
                    {STATE_TAX_DATA[code].name} (0%)
                  </option>
                ))}
              </optgroup>
            </select>
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-sm text-muted-foreground">Annual state tax on retirement income</div>
              <div className="text-2xl font-bold text-red-600">
                {fmtFull(calculations.workingStateTax)}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <span className="text-2xl">&#x1F334;</span>
              Retirement State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={retirementState}
              onChange={(e) => setRetirementState(e.target.value)}
              className="w-full p-3 rounded-lg border bg-background"
            >
              <optgroup label="No Income Tax">
                {noTaxStates.map((code) => (
                  <option key={code} value={code}>
                    {STATE_TAX_DATA[code].name} (0%)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Low Tax States">
                {Object.entries(STATE_TAX_DATA)
                  .filter(([, data]) => data.rate > 0 && data.rate < 5)
                  .map(([code]) => (
                    <option key={code} value={code}>
                      {STATE_TAX_DATA[code].name} ({STATE_TAX_DATA[code].rate}%)
                    </option>
                  ))}
              </optgroup>
            </select>
            <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
              <div className="text-sm text-muted-foreground">Annual state tax on retirement income</div>
              <div className="text-2xl font-bold text-emerald-600">
                {fmtFull(calculations.retirementStateTax)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Income slider */}
      <Card>
        <CardContent className="pt-6">
          <label className="block text-sm font-medium mb-2">
            Annual Retirement Income: <span className="text-primary font-bold">{fmtFull(retirementIncome)}</span>
          </label>
          <Slider
            value={[retirementIncome]}
            onValueChange={([v]) => setRetirementIncome(v)}
            min={50000}
            max={300000}
            step={10000}
            thumbLabel="Adjust retirement income"
          />
        </CardContent>
      </Card>

      {/* Savings visualization */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30
                   border border-emerald-200 dark:border-emerald-800 rounded-xl p-6"
      >
        <div className="grid md:grid-cols-2 gap-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Annual Tax Savings</p>
            <p className="text-3xl font-bold text-emerald-600">{fmtFull(calculations.annualSavings)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {calculations.workingStateData.name} vs {calculations.retirementStateData.name}
            </p>
          </div>
          <div className="border-l pl-6">
            <p className="text-sm text-muted-foreground">20-Year Savings</p>
            <p className="text-3xl font-bold text-teal-600">{fmtFull(calculations.twentyYearSavings)}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Assuming same income level
            </p>
          </div>
        </div>
      </MotionDiv>

      {/* State tax considerations */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">No State Income Tax States</h4>
            <div className="flex flex-wrap gap-2">
              {noTaxStates.map((code) => (
                <Badge key={code} variant="outline" className="bg-emerald-50 text-emerald-700">
                  {STATE_TAX_DATA[code].name}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Note: Some states tax dividends/interest (NH, TN historically). Check current laws.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h4 className="font-semibold mb-3">Other Considerations</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>&#x2022; <strong>Property taxes:</strong> Some no-tax states have high property taxes</li>
              <li>&#x2022; <strong>Sales tax:</strong> TX, WA, TN have high sales taxes instead</li>
              <li>&#x2022; <strong>Cost of living:</strong> Factor in housing and healthcare costs</li>
              <li>&#x2022; <strong>183-day rule:</strong> Many states require you to be physically present 183+ days</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT WITH TABS
// =============================================================================

type TaxStrategy =
  | 'brackets'
  | 'roth-vs-traditional'
  | 'tax-loss-harvesting'
  | 'roth-ladder'
  | 'rmd-planning'
  | 'state-arbitrage';

const TAX_STRATEGIES: Record<TaxStrategy, { title: string; description: string; icon: string }> = {
  'brackets': {
    title: 'Tax Brackets Animated',
    description: 'See how income fills up each bracket',
    icon: '&#x1F4CA;',
  },
  'roth-vs-traditional': {
    title: 'Roth vs Traditional',
    description: 'Visual comparison of account types',
    icon: '&#x2696;',
  },
  'tax-loss-harvesting': {
    title: 'Tax-Loss Harvesting',
    description: 'Step-by-step guide to offset gains',
    icon: '&#x1F4C9;',
  },
  'roth-ladder': {
    title: 'Roth Conversion Ladder',
    description: 'Early retirement tax strategy',
    icon: '&#x1FA9C;',
  },
  'rmd-planning': {
    title: 'RMD Planning',
    description: 'Visualize required distributions',
    icon: '&#x1F4C5;',
  },
  'state-arbitrage': {
    title: 'State Tax Arbitrage',
    description: 'Geographic tax optimization',
    icon: '&#x1F5FA;',
  },
};

export function TaxStrategyExplainer() {
  const [activeStrategy, setActiveStrategy] = useState<TaxStrategy>('brackets');

  const renderContent = () => {
    switch (activeStrategy) {
      case 'brackets':
        return <TaxBracketAnimation />;
      case 'roth-vs-traditional':
        return <RothVsTraditionalComparison />;
      case 'tax-loss-harvesting':
        return <TaxLossHarvestingGuide />;
      case 'roth-ladder':
        return <RothConversionLadder />;
      case 'rmd-planning':
        return <RMDPlanningVisualization />;
      case 'state-arbitrage':
        return <StateTaxArbitrage />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Tax Strategy Education</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Master these key tax strategies to potentially save tens of thousands of dollars
          over your retirement. Click any topic to explore.
        </p>
      </div>

      {/* Strategy selector */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {(Object.keys(TAX_STRATEGIES) as TaxStrategy[]).map((key) => {
          const strategy = TAX_STRATEGIES[key];
          const isActive = activeStrategy === key;

          return (
            <button
              key={key}
              onClick={() => setActiveStrategy(key)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all text-center',
                isActive
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'border-muted hover:border-primary/50 hover:bg-muted/50'
              )}
            >
              <div
                className="text-2xl mb-2"
                dangerouslySetInnerHTML={{ __html: strategy.icon }}
              />
              <div className="text-sm font-semibold">{strategy.title}</div>
              <div className="text-xs text-muted-foreground mt-1 hidden md:block">
                {strategy.description}
              </div>
            </button>
          );
        })}
      </div>

      {/* Content area */}
      <Card className="overflow-hidden">
        <CardHeader className="bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className="text-3xl"
              dangerouslySetInnerHTML={{ __html: TAX_STRATEGIES[activeStrategy].icon }}
            />
            <div>
              <CardTitle>{TAX_STRATEGIES[activeStrategy].title}</CardTitle>
              <CardDescription>{TAX_STRATEGIES[activeStrategy].description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {renderContent()}
        </CardContent>
      </Card>

      {/* Educational footer */}
      <div className="bg-muted/30 rounded-xl p-6 text-center">
        <p className="text-sm text-muted-foreground">
          <strong>Disclaimer:</strong> This information is for educational purposes only and should not
          be considered tax advice. Tax laws are complex and change frequently. Consult a qualified
          tax professional for advice specific to your situation.
        </p>
      </div>
    </div>
  );
}
