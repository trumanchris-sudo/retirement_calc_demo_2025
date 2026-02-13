'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';
import { TAX_BRACKETS } from '@/lib/constants';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface ComparisonBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: 'blue' | 'green' | 'red' | 'amber' | 'emerald';
  delay?: number;
}

function ComparisonBar({ label, value, maxValue, color, delay = 0 }: ComparisonBarProps) {
  const width = Math.min((value / maxValue) * 100, 100);
  const colorClasses = {
    blue: 'bg-blue-500',
    green: 'bg-emerald-500',
    emerald: 'bg-emerald-500',
    red: 'bg-red-500',
    amber: 'bg-amber-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-semibold">{fmt(value)}</span>
      </div>
      <div className="h-4 bg-muted rounded-full overflow-hidden">
        <MotionDiv
          className={cn('h-full rounded-full', colorClasses[color])}
          initial={{ width: 0 }}
          animate={{ width: `${width}%` }}
          transition={{ duration: 0.8, delay, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

/**
 * Visual explainer showing why Roth contributions often beat Traditional
 * Key insight: Pay 24% now, or 32% later when your account is 10x larger
 */
export function WhyRothIsBetter() {
  const [years, setYears] = useState(30);
  const [currentBracket, setCurrentBracket] = useState(0.24); // 24%
  const [futureBracket, setFutureBracket] = useState(0.32); // 32%

  const contribution = 10000; // Annual contribution for example
  const growthRate = 0.07; // 7% real return

  const calculations = useMemo(() => {
    // Calculate future value of a single contribution
    const futureValue = contribution * Math.pow(1 + growthRate, years);

    // Traditional: Contribute pre-tax, pay tax on withdrawals
    const traditionalContribution = contribution; // Pre-tax
    const traditionalFutureValue = traditionalContribution * Math.pow(1 + growthRate, years);
    const traditionalTaxOwed = traditionalFutureValue * futureBracket;
    const traditionalAfterTax = traditionalFutureValue - traditionalTaxOwed;

    // Roth: Pay tax now, withdraw tax-free
    const rothTaxPaidNow = contribution * currentBracket;
    const rothContribution = contribution - rothTaxPaidNow; // After-tax contribution
    // But wait - with Roth, you can contribute the FULL amount pre-tax equivalent
    // So if you contribute $10K to Roth, you're actually putting in more after-tax dollars
    const rothFutureValue = contribution * Math.pow(1 + growthRate, years); // Tax-free growth
    const rothTaxPaidTotal = rothTaxPaidNow;
    const rothAfterTax = rothFutureValue; // No tax on withdrawal

    // Inheritance comparison
    const inheritanceTraditional = traditionalAfterTax * 0.68; // Kids pay ~32% tax over 10 years
    const inheritanceRoth = rothFutureValue; // Kids get it all tax-free

    return {
      futureValue,
      traditionalFutureValue,
      traditionalTaxOwed,
      traditionalAfterTax,
      rothTaxPaidNow,
      rothFutureValue,
      rothAfterTax,
      rothAdvantage: rothAfterTax - traditionalAfterTax,
      inheritanceTraditional,
      inheritanceRoth,
      inheritanceAdvantage: inheritanceRoth - inheritanceTraditional,
    };
  }, [years, currentBracket, futureBracket, contribution, growthRate]);

  return (
    <div className="space-y-8">
      {/* Key Insight Banner */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30
                   border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center"
      >
        <p className="text-lg font-medium text-foreground">
          Pay{' '}
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            {(currentBracket * 100).toFixed(0)}% now
          </span>
          , or{' '}
          <span className="text-red-600 dark:text-red-400 font-bold">
            {(futureBracket * 100).toFixed(0)}% later
          </span>{' '}
          when your account is{' '}
          <span className="text-blue-600 dark:text-blue-400 font-bold">
            {Math.round(Math.pow(1.07, years))}x larger
          </span>
        </p>
      </MotionDiv>

      {/* Interactive Controls */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Investment Period: <span className="text-primary font-bold">{years} years</span>
            </label>
            <Slider
              value={[years]}
              onValueChange={([v]) => setYears(v)}
              min={10}
              max={40}
              step={5}
              thumbLabel="Adjust investment years"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Current Tax Rate:{' '}
              <span className="text-emerald-600 font-bold">{(currentBracket * 100).toFixed(0)}%</span>
            </label>
            <Slider
              value={[currentBracket * 100]}
              onValueChange={([v]) => setCurrentBracket(v / 100)}
              min={10}
              max={37}
              step={1}
              thumbLabel="Adjust current tax rate"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Future Tax Rate:{' '}
              <span className="text-amber-600 font-bold">{(futureBracket * 100).toFixed(0)}%</span>
            </label>
            <Slider
              value={[futureBracket * 100]}
              onValueChange={([v]) => setFutureBracket(v / 100)}
              min={10}
              max={40}
              step={1}
              thumbLabel="Adjust future tax rate"
            />
          </CardContent>
        </Card>
      </div>

      {/* Visual Comparison */}
      <div className="grid gap-8 md:grid-cols-2">
        {/* Traditional IRA */}
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <h3 className="font-semibold text-lg">Traditional IRA</h3>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Contribute {fmt(contribution)} pre-tax</p>
              <p>Tax deferred until withdrawal</p>
            </div>

            <div className="pt-4 space-y-4">
              <ComparisonBar
                label="Future Value"
                value={calculations.traditionalFutureValue}
                maxValue={calculations.rothFutureValue * 1.1}
                color="amber"
                delay={0}
              />
              <ComparisonBar
                label="Tax Owed at Withdrawal"
                value={calculations.traditionalTaxOwed}
                maxValue={calculations.traditionalTaxOwed}
                color="red"
                delay={0.2}
              />
              <div className="border-t pt-4">
                <ComparisonBar
                  label="What You Keep"
                  value={calculations.traditionalAfterTax}
                  maxValue={calculations.rothAfterTax}
                  color="amber"
                  delay={0.4}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Roth IRA */}
        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <h3 className="font-semibold text-lg">Roth IRA</h3>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <p>Pay {fmt(calculations.rothTaxPaidNow)} tax now</p>
              <p>Withdraw tax-free forever</p>
            </div>

            <div className="pt-4 space-y-4">
              <ComparisonBar
                label="Future Value"
                value={calculations.rothFutureValue}
                maxValue={calculations.rothFutureValue * 1.1}
                color="emerald"
                delay={0}
              />
              <ComparisonBar
                label="Tax Owed at Withdrawal"
                value={0}
                maxValue={calculations.traditionalTaxOwed}
                color="green"
                delay={0.2}
              />
              <div className="border-t pt-4">
                <ComparisonBar
                  label="What You Keep"
                  value={calculations.rothAfterTax}
                  maxValue={calculations.rothAfterTax}
                  color="green"
                  delay={0.4}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advantage Summary */}
      {calculations.rothAdvantage > 0 && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6 }}
          className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800
                     rounded-xl p-6 text-center"
        >
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            Roth Advantage: +{fmt(calculations.rothAdvantage)}
          </p>
          <p className="text-sm text-muted-foreground mt-1">More money in your pocket</p>
        </MotionDiv>
      )}

      {/* Inheritance Section */}
      <div className="pt-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <span className="text-2xl">&#x1F3E0;</span> The Inheritance Angle
        </h3>

        <Card className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
          <CardContent className="pt-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-sm font-medium">Traditional: Kids Inherit</span>
                </div>
                <p className="text-2xl font-bold">{fmt(calculations.inheritanceTraditional)}</p>
                <p className="text-xs text-muted-foreground">
                  After paying ~32% income tax over 10 years
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium">Roth: Kids Inherit</span>
                </div>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                  {fmt(calculations.inheritanceRoth)}
                </p>
                <p className="text-xs text-muted-foreground">100% tax-free over 10 years</p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-800 text-center">
              <p className="text-lg font-semibold text-blue-600 dark:text-blue-400">
                Your kids keep {fmt(calculations.inheritanceAdvantage)} more with Roth
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Key Takeaways */}
      <div className="grid gap-4 md:grid-cols-3 pt-4">
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">&#x23F0;</div>
          <p className="text-sm font-medium">Pay taxes when rates are low</p>
          <p className="text-xs text-muted-foreground">Early career = lower bracket</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">&#x1F4C8;</div>
          <p className="text-sm font-medium">Growth is tax-free forever</p>
          <p className="text-xs text-muted-foreground">Decades of compound growth</p>
        </div>
        <div className="bg-muted/50 rounded-lg p-4 text-center">
          <div className="text-2xl mb-2">&#x1F46A;</div>
          <p className="text-sm font-medium">Pass wealth tax-free</p>
          <p className="text-xs text-muted-foreground">Kids inherit 100%</p>
        </div>
      </div>
    </div>
  );
}
