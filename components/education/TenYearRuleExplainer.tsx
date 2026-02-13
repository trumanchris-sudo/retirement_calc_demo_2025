'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface TimelineYearProps {
  year: number;
  traditional: { balance: number; withdrawal: number; taxPaid: number };
  roth: { balance: number; withdrawal: number };
  maxBalance: number;
  delay: number;
}

function TimelineYear({ year, traditional, roth, maxBalance, delay }: TimelineYearProps) {
  return (
    <MotionDiv
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="grid grid-cols-[60px_1fr_1fr] gap-4 items-center py-3 border-b border-muted last:border-0"
    >
      <div className="text-sm font-semibold text-muted-foreground">Year {year}</div>

      {/* Traditional */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-amber-600">Withdrawal</span>
          <span className="font-medium">{fmt(traditional.withdrawal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-red-500">Tax Paid</span>
          <span className="font-medium text-red-600">-{fmt(traditional.taxPaid)}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 transition-all duration-500"
            style={{ width: `${(traditional.balance / maxBalance) * 100}%` }}
          />
        </div>
        <div className="text-xs text-right text-muted-foreground">
          Remaining: {fmt(traditional.balance)}
        </div>
      </div>

      {/* Roth */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-emerald-600">Withdrawal</span>
          <span className="font-medium">{fmt(roth.withdrawal)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-emerald-500">Tax Paid</span>
          <span className="font-medium text-emerald-600">$0</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${(roth.balance / maxBalance) * 100}%` }}
          />
        </div>
        <div className="text-xs text-right text-muted-foreground">
          Remaining: {fmt(roth.balance)}
        </div>
      </div>
    </MotionDiv>
  );
}

/**
 * Explainer for the SECURE Act 10-Year Rule
 * Shows how inherited IRAs must be distributed within 10 years
 */
export function TenYearRuleExplainer() {
  const [inheritedAmount, setInheritedAmount] = useState(500000);
  const [beneficiaryTaxRate, setBeneficiaryTaxRate] = useState(0.32);
  const growthRate = 0.05; // Conservative growth during distribution

  const calculations = useMemo(() => {
    const years = 10;
    const traditionalTimeline: Array<{
      balance: number;
      withdrawal: number;
      taxPaid: number;
    }> = [];
    const rothTimeline: Array<{ balance: number; withdrawal: number }> = [];

    let tradBalance = inheritedAmount;
    let rothBalance = inheritedAmount;

    // Calculate equal annual withdrawals
    // For simplicity, we'll do straight-line over 10 years with some growth
    for (let i = 1; i <= years; i++) {
      // Traditional: Required withdrawal (simplified - equal amounts)
      const tradWithdrawal = inheritedAmount / years;
      const tradTax = tradWithdrawal * beneficiaryTaxRate;

      // Apply growth then withdrawal
      tradBalance = tradBalance * (1 + growthRate) - tradWithdrawal;
      if (tradBalance < 0) tradBalance = 0;

      traditionalTimeline.push({
        balance: tradBalance,
        withdrawal: tradWithdrawal,
        taxPaid: tradTax,
      });

      // Roth: Same withdrawal pattern, no tax
      const rothWithdrawal = inheritedAmount / years;
      rothBalance = rothBalance * (1 + growthRate) - rothWithdrawal;
      if (rothBalance < 0) rothBalance = 0;

      rothTimeline.push({
        balance: rothBalance,
        withdrawal: rothWithdrawal,
      });
    }

    const totalTraditionalTax = traditionalTimeline.reduce((sum, y) => sum + y.taxPaid, 0);
    const totalTraditionalReceived = inheritedAmount - totalTraditionalTax;
    const totalRothReceived = inheritedAmount; // 100% tax-free

    return {
      traditionalTimeline,
      rothTimeline,
      totalTraditionalTax,
      totalTraditionalReceived,
      totalRothReceived,
      taxSavings: totalRothReceived - totalTraditionalReceived,
    };
  }, [inheritedAmount, beneficiaryTaxRate]);

  const maxBalance = inheritedAmount;

  return (
    <div className="space-y-8">
      {/* Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">The 10-Year Rule</h2>
        <p className="text-muted-foreground">
          Since 2020, most non-spouse beneficiaries must empty inherited IRAs within 10 years
        </p>
      </MotionDiv>

      {/* Key Difference Banner */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">&#x1F4B0;</div>
            <h3 className="font-semibold text-amber-700 dark:text-amber-400">Traditional IRA</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your kids must withdraw AND pay income tax on every dollar within 10 years
            </p>
            <p className="text-2xl font-bold text-amber-600 mt-4">
              Tax Bill: {fmt(calculations.totalTraditionalTax)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">&#x2728;</div>
            <h3 className="font-semibold text-emerald-700 dark:text-emerald-400">Roth IRA</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Your kids withdraw over 10 years completely tax-free
            </p>
            <p className="text-2xl font-bold text-emerald-600 mt-4">Tax Bill: $0</p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-3">
                Inherited Amount: <span className="text-primary font-bold">{fmt(inheritedAmount)}</span>
              </label>
              <Slider
                value={[inheritedAmount]}
                onValueChange={([v]) => setInheritedAmount(v)}
                min={100000}
                max={2000000}
                step={50000}
                thumbLabel="Adjust inherited amount"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-3">
                Beneficiary Tax Rate:{' '}
                <span className="text-primary font-bold">{(beneficiaryTaxRate * 100).toFixed(0)}%</span>
              </label>
              <Slider
                value={[beneficiaryTaxRate * 100]}
                onValueChange={([v]) => setBeneficiaryTaxRate(v / 100)}
                min={22}
                max={37}
                step={1}
                thumbLabel="Adjust beneficiary tax rate"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Your kids are likely in their peak earning years when they inherit
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline Comparison */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-[60px_1fr_1fr] gap-4 mb-4 pb-2 border-b-2">
            <div />
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="font-semibold text-sm">Traditional IRA</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="font-semibold text-sm">Roth IRA</span>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {calculations.traditionalTimeline.map((trad, i) => (
              <TimelineYear
                key={i}
                year={i + 1}
                traditional={trad}
                roth={calculations.rothTimeline[i]}
                maxBalance={maxBalance}
                delay={i}
              />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30
                   border border-emerald-200 dark:border-emerald-800 rounded-xl p-6"
      >
        <div className="grid gap-6 md:grid-cols-3 text-center">
          <div>
            <p className="text-sm text-muted-foreground">Traditional: Kids Receive</p>
            <p className="text-2xl font-bold text-amber-600">{fmt(calculations.totalTraditionalReceived)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roth: Kids Receive</p>
            <p className="text-2xl font-bold text-emerald-600">{fmt(calculations.totalRothReceived)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
            <p className="text-sm text-muted-foreground">Roth Advantage</p>
            <p className="text-2xl font-bold text-blue-600">+{fmt(calculations.taxSavings)}</p>
          </div>
        </div>
      </MotionDiv>

      {/* Key Points */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">The Traditional Problem</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>&#x2022; Large withdrawals push kids into higher brackets</li>
            <li>&#x2022; May affect their eligibility for deductions</li>
            <li>&#x2022; Forced to take money at worst possible time</li>
            <li>&#x2022; Could push them into IRMAA Medicare surcharges</li>
          </ul>
        </div>

        <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
          <h4 className="font-semibold text-emerald-700 dark:text-emerald-400 mb-2">The Roth Solution</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>&#x2022; Withdrawals dont count as income</li>
            <li>&#x2022; No impact on tax brackets</li>
            <li>&#x2022; Flexibility in timing withdrawals</li>
            <li>&#x2022; You paid the tax so they dont have to</li>
          </ul>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-muted/50 rounded-xl p-6 text-center">
        <p className="text-lg font-medium">
          Consider converting Traditional IRA to Roth while youre in a lower tax bracket
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          Pay taxes now at your rate, not your kids higher rate later
        </p>
      </div>
    </div>
  );
}
