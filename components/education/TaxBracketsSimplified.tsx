'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt, fmtFull } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { TAX_BRACKETS } from '@/lib/constants';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface BracketBarProps {
  rate: number;
  rangeStart: number;
  rangeEnd: number;
  amountInBracket: number;
  taxPaid: number;
  isActive: boolean;
  delay: number;
}

function BracketBar({
  rate,
  rangeStart,
  rangeEnd,
  amountInBracket,
  taxPaid,
  isActive,
  delay,
}: BracketBarProps) {
  const bracketColors: Record<number, string> = {
    10: 'bg-emerald-400',
    12: 'bg-emerald-500',
    22: 'bg-yellow-400',
    24: 'bg-amber-400',
    32: 'bg-orange-400',
    35: 'bg-red-400',
    37: 'bg-red-600',
  };

  const bgColor = bracketColors[rate] || 'bg-gray-400';

  return (
    <MotionDiv
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.1 }}
      className={cn(
        'rounded-lg p-4 transition-all',
        isActive
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
          : 'opacity-60'
      )}
      style={{ backgroundColor: isActive ? undefined : 'transparent' }}
    >
      <div className="flex items-center gap-4">
        {/* Rate Badge */}
        <div
          className={cn(
            'flex-shrink-0 w-16 h-16 rounded-lg flex items-center justify-center text-white font-bold text-lg',
            bgColor
          )}
        >
          {rate}%
        </div>

        {/* Bracket Info */}
        <div className="flex-1 min-w-0">
          <div className="text-sm text-muted-foreground">
            {fmtFull(rangeStart)} - {rangeEnd === Infinity ? '+' : fmtFull(rangeEnd)}
          </div>
          {isActive && amountInBracket > 0 && (
            <MotionDiv
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-2"
            >
              <div className="text-sm">
                <span className="text-muted-foreground">Income in bracket: </span>
                <span className="font-semibold">{fmtFull(amountInBracket)}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Tax on this portion: </span>
                <span className="font-semibold text-red-600">{fmtFull(taxPaid)}</span>
              </div>
            </MotionDiv>
          )}
        </div>

        {/* Visual Bar */}
        {isActive && amountInBracket > 0 && (
          <div className="w-24 h-8 bg-muted rounded overflow-hidden">
            <MotionDiv
              className={cn('h-full', bgColor)}
              initial={{ width: 0 }}
              animate={{ width: '100%' }}
              transition={{ duration: 0.5 }}
            />
          </div>
        )}
      </div>
    </MotionDiv>
  );
}

/**
 * Interactive explainer for marginal vs effective tax rates
 * Shows how income fills up brackets like water in containers
 */
export function TaxBracketsSimplified() {
  const [income, setIncome] = useState(150000);
  const [filingStatus, setFilingStatus] = useState<'single' | 'married'>('married');

  const brackets = TAX_BRACKETS[filingStatus];

  const calculations = useMemo(() => {
    const taxableIncome = Math.max(0, income - brackets.deduction);
    let remainingIncome = taxableIncome;
    let totalTax = 0;
    let prevLimit = 0;

    const bracketDetails = brackets.rates.map((bracket) => {
      const rangeStart = prevLimit;
      const rangeEnd = bracket.limit;
      const bracketWidth = rangeEnd - rangeStart;
      const amountInBracket = Math.max(0, Math.min(remainingIncome, bracketWidth));
      const taxPaid = amountInBracket * bracket.rate;

      remainingIncome -= amountInBracket;
      totalTax += taxPaid;
      prevLimit = bracket.limit;

      return {
        rate: bracket.rate * 100,
        rangeStart,
        rangeEnd,
        amountInBracket,
        taxPaid,
        isActive: amountInBracket > 0,
      };
    });

    const effectiveRate = taxableIncome > 0 ? (totalTax / income) * 100 : 0;
    const marginalRate = bracketDetails.find((b) => !b.isActive)?.rate ||
      bracketDetails[bracketDetails.length - 1]?.rate ||
      0;

    // Find current bracket (last active one)
    const currentBracket = [...bracketDetails].reverse().find((b) => b.isActive);

    return {
      taxableIncome,
      bracketDetails,
      totalTax,
      effectiveRate,
      marginalRate: currentBracket?.rate || 10,
    };
  }, [income, brackets]);

  return (
    <div className="space-y-8">
      {/* Key Insight Banner */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-amber-50 to-emerald-50 dark:from-amber-950/30 dark:to-emerald-950/30
                   border border-amber-200 dark:border-amber-800 rounded-xl p-6 text-center"
      >
        <p className="text-lg font-medium">
          Youre in the{' '}
          <span className="text-amber-600 dark:text-amber-400 font-bold">
            {calculations.marginalRate}% bracket
          </span>
          , but you only pay{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {calculations.effectiveRate.toFixed(1)}% effective
          </span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Not all your income is taxed at {calculations.marginalRate}%
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
                onValueChange={([v]) => setIncome(v)}
                min={30000}
                max={800000}
                step={5000}
                thumbLabel="Adjust income"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">Filing Status</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilingStatus('single')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg transition-all',
                    filingStatus === 'single'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  Single
                </button>
                <button
                  onClick={() => setFilingStatus('married')}
                  className={cn(
                    'flex-1 py-2 px-4 rounded-lg transition-all',
                    filingStatus === 'married'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  )}
                >
                  Married
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t text-sm text-muted-foreground">
            Standard Deduction: {fmtFull(brackets.deduction)} | Taxable Income:{' '}
            {fmtFull(calculations.taxableIncome)}
          </div>
        </CardContent>
      </Card>

      {/* Visual Water Filling Metaphor */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">How Your Income Fills the Brackets</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Think of tax brackets like buckets - your income fills them up from the bottom. You only
            pay the higher rate on income that spills into that bucket.
          </p>

          <div className="space-y-3">
            {calculations.bracketDetails.map((bracket, i) => (
              <BracketBar
                key={i}
                rate={bracket.rate}
                rangeStart={bracket.rangeStart}
                rangeEnd={bracket.rangeEnd}
                amountInBracket={bracket.amountInBracket}
                taxPaid={bracket.taxPaid}
                isActive={bracket.isActive}
                delay={i}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Total Tax</p>
            <p className="text-3xl font-bold text-red-600">{fmtFull(calculations.totalTax)}</p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Marginal Rate</p>
            <p className="text-3xl font-bold text-amber-600">{calculations.marginalRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">Rate on next dollar earned</p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <p className="text-sm text-muted-foreground">Effective Rate</p>
            <p className="text-3xl font-bold text-emerald-600">
              {calculations.effectiveRate.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">Actual % of income paid</p>
          </CardContent>
        </Card>
      </div>

      {/* Why This Matters */}
      <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Why This Matters for Retirement</h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400">1</span>
                </div>
                <div>
                  <p className="font-medium">Roth Conversions in Low Brackets</p>
                  <p className="text-sm text-muted-foreground">
                    Convert just enough to fill the 12% or 22% bracket each year
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-emerald-600 dark:text-emerald-400">2</span>
                </div>
                <div>
                  <p className="font-medium">The Early Retirement Window</p>
                  <p className="text-sm text-muted-foreground">
                    Years 60-72 before RMDs and Social Security can be low-bracket years
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400">3</span>
                </div>
                <div>
                  <p className="font-medium">Bracket Management</p>
                  <p className="text-sm text-muted-foreground">
                    Strategic withdrawals to avoid jumping brackets
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 dark:text-blue-400">4</span>
                </div>
                <div>
                  <p className="font-medium">Tax-Loss Harvesting</p>
                  <p className="text-sm text-muted-foreground">
                    Realize losses to offset gains and reduce taxable income
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Common Misconception */}
      <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6">
        <h4 className="font-semibold text-red-700 dark:text-red-400 flex items-center gap-2 mb-3">
          <span className="text-xl">&#x26A0;</span> Common Misconception
        </h4>
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Wrong:</span> A raise that pushes me into
          the 32% bracket means all my income is taxed at 32%
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          <span className="font-medium text-emerald-600">Right:</span> Only the income ABOVE the
          bracket threshold is taxed at the higher rate. Your first dollars are still taxed at 10%,
          12%, etc.
        </p>
      </div>
    </div>
  );
}
