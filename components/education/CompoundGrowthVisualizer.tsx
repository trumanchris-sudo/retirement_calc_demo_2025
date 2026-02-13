'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent } from '@/components/ui/card';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface GrowthPoint {
  age: number;
  value: number;
  contributions: number;
  growth: number;
}

/**
 * Interactive compound growth visualizer showing the "hockey stick" curve
 * Demonstrates why starting early is the most powerful wealth-building factor
 */
export function CompoundGrowthVisualizer() {
  const [startAge, setStartAge] = useState(25);
  const [monthlyContribution, setMonthlyContribution] = useState(500);
  const [annualReturn, setAnnualReturn] = useState(7);

  const retirementAge = 65;

  const calculations = useMemo(() => {
    const yearsInvesting = retirementAge - startAge;
    const monthlyReturn = annualReturn / 100 / 12;

    // Calculate growth trajectory
    const points: GrowthPoint[] = [];
    let balance = 0;
    let totalContributions = 0;

    for (let age = startAge; age <= retirementAge; age++) {
      points.push({
        age,
        value: balance,
        contributions: totalContributions,
        growth: balance - totalContributions,
      });

      // Apply 12 months of growth
      for (let m = 0; m < 12; m++) {
        balance = balance * (1 + monthlyReturn) + monthlyContribution;
        totalContributions += monthlyContribution;
      }
    }

    // Add final point
    points.push({
      age: retirementAge,
      value: balance,
      contributions: totalContributions,
      growth: balance - totalContributions,
    });

    // Calculate comparison scenarios
    const scenarios = [
      { startAge: 25, label: 'Age 25' },
      { startAge: 30, label: 'Age 30' },
      { startAge: 35, label: 'Age 35' },
      { startAge: 40, label: 'Age 40' },
    ].map((scenario) => {
      const years = retirementAge - scenario.startAge;
      let bal = 0;
      let contrib = 0;

      for (let y = 0; y < years; y++) {
        for (let m = 0; m < 12; m++) {
          bal = bal * (1 + monthlyReturn) + monthlyContribution;
          contrib += monthlyContribution;
        }
      }

      return {
        ...scenario,
        finalValue: bal,
        contributions: contrib,
        growth: bal - contrib,
      };
    });

    return {
      points,
      finalValue: balance,
      totalContributions,
      totalGrowth: balance - totalContributions,
      yearsInvesting,
      scenarios,
    };
  }, [startAge, monthlyContribution, annualReturn, retirementAge]);

  const maxValue = calculations.finalValue;
  const chartHeight = 300;

  // Calculate comparison with delayed start
  const delayComparison = useMemo(() => {
    if (startAge >= 35) return null;

    const delayedStart = startAge + 10;
    const monthlyReturn = annualReturn / 100 / 12;

    let delayedBalance = 0;
    const years = retirementAge - delayedStart;

    for (let y = 0; y < years; y++) {
      for (let m = 0; m < 12; m++) {
        delayedBalance = delayedBalance * (1 + monthlyReturn) + monthlyContribution;
      }
    }

    return {
      delayedStart,
      delayedFinal: delayedBalance,
      difference: calculations.finalValue - delayedBalance,
      yearsDelayed: 10,
    };
  }, [startAge, monthlyContribution, annualReturn, calculations.finalValue, retirementAge]);

  return (
    <div className="space-y-8">
      {/* Key Insight */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30
                   border border-blue-200 dark:border-blue-800 rounded-xl p-6 text-center"
      >
        <p className="text-2xl font-bold text-foreground">
          {calculations.yearsInvesting} years of investing turns{' '}
          <span className="text-blue-600">{fmt(calculations.totalContributions)}</span> into{' '}
          <span className="text-emerald-600">{fmt(calculations.finalValue)}</span>
        </p>
        <p className="text-muted-foreground mt-2">
          Thats {fmt(calculations.totalGrowth)} in free growth from compound interest
        </p>
      </MotionDiv>

      {/* Interactive Controls */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Start Investing At: <span className="text-primary font-bold">{startAge}</span>
            </label>
            <Slider
              value={[startAge]}
              onValueChange={([v]) => setStartAge(v)}
              min={18}
              max={55}
              step={1}
              thumbLabel="Adjust start age"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Monthly Contribution:{' '}
              <span className="text-primary font-bold">${monthlyContribution}</span>
            </label>
            <Slider
              value={[monthlyContribution]}
              onValueChange={([v]) => setMonthlyContribution(v)}
              min={100}
              max={2000}
              step={50}
              thumbLabel="Adjust monthly contribution"
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <label className="block text-sm font-medium mb-3">
              Annual Return: <span className="text-primary font-bold">{annualReturn}%</span>
            </label>
            <Slider
              value={[annualReturn]}
              onValueChange={([v]) => setAnnualReturn(v)}
              min={4}
              max={12}
              step={0.5}
              thumbLabel="Adjust annual return"
            />
          </CardContent>
        </Card>
      </div>

      {/* Hockey Stick Chart */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">The Hockey Stick Curve</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Notice how growth accelerates exponentially in later years - this is why starting early
            matters so much
          </p>

          <div className="relative" style={{ height: chartHeight + 60 }}>
            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 bottom-12 w-16 flex flex-col justify-between text-xs text-muted-foreground">
              <span>{fmt(maxValue)}</span>
              <span>{fmt(maxValue * 0.75)}</span>
              <span>{fmt(maxValue * 0.5)}</span>
              <span>{fmt(maxValue * 0.25)}</span>
              <span>$0</span>
            </div>

            {/* Chart area */}
            <div className="absolute left-20 right-4 top-0 bottom-12">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="border-t border-muted" />
                ))}
              </div>

              {/* Growth curve using SVG */}
              <svg className="absolute inset-0 w-full h-full overflow-visible">
                {/* Contributions area */}
                <MotionDiv
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <path
                    d={`
                      M 0 ${chartHeight}
                      ${calculations.points
                        .map((p, i) => {
                          const x = (i / (calculations.points.length - 1)) * 100;
                          const y = chartHeight - (p.contributions / maxValue) * chartHeight;
                          return `L ${x}% ${y}`;
                        })
                        .join(' ')}
                      L 100% ${chartHeight}
                      Z
                    `}
                    fill="rgba(59, 130, 246, 0.3)"
                    className="transition-all duration-500"
                  />
                </MotionDiv>

                {/* Total value line */}
                <MotionDiv
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.5, ease: 'easeOut' }}
                >
                  <path
                    d={`
                      M 0 ${chartHeight}
                      ${calculations.points
                        .map((p, i) => {
                          const x = (i / (calculations.points.length - 1)) * 100;
                          const y = chartHeight - (p.value / maxValue) * chartHeight;
                          return `L ${x}% ${y}`;
                        })
                        .join(' ')}
                    `}
                    fill="none"
                    stroke="rgb(16, 185, 129)"
                    strokeWidth="3"
                    className="transition-all duration-500"
                  />
                </MotionDiv>
              </svg>

              {/* Legend */}
              <div className="absolute top-2 right-2 flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-500 rounded" />
                  <span>Total Value</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-400/50 rounded" />
                  <span>Your Contributions</span>
                </div>
              </div>
            </div>

            {/* X-axis labels */}
            <div className="absolute left-20 right-4 bottom-0 h-8 flex justify-between text-xs text-muted-foreground">
              <span>Age {startAge}</span>
              <span>Age {Math.round((startAge + retirementAge) / 2)}</span>
              <span>Age {retirementAge}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delay Cost Comparison */}
      {delayComparison && (
        <MotionDiv
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-6"
        >
          <h3 className="font-semibold text-red-700 dark:text-red-400 mb-4">
            The Cost of Waiting 10 Years
          </h3>

          <div className="grid gap-6 md:grid-cols-3 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Start at {startAge}</p>
              <p className="text-2xl font-bold text-emerald-600">{fmt(calculations.finalValue)}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">
                Wait until {delayComparison.delayedStart}
              </p>
              <p className="text-2xl font-bold text-amber-600">
                {fmt(delayComparison.delayedFinal)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
              <p className="text-sm text-muted-foreground">Lost by waiting</p>
              <p className="text-2xl font-bold text-red-600">
                -{fmt(delayComparison.difference)}
              </p>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Age Comparison Table */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Same Contribution, Different Start Ages</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2">Start Age</th>
                  <th className="text-right py-3 px-2">You Contribute</th>
                  <th className="text-right py-3 px-2">Growth</th>
                  <th className="text-right py-3 px-2">At 65</th>
                </tr>
              </thead>
              <tbody>
                {calculations.scenarios.map((s, i) => (
                  <MotionDiv
                    key={s.startAge}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="contents"
                  >
                    <tr
                      className={cn(
                        'border-b',
                        s.startAge === startAge && 'bg-primary/10'
                      )}
                    >
                      <td className="py-3 px-2 font-medium">{s.label}</td>
                      <td className="text-right py-3 px-2">{fmt(s.contributions)}</td>
                      <td className="text-right py-3 px-2 text-emerald-600">
                        +{fmt(s.growth)}
                      </td>
                      <td className="text-right py-3 px-2 font-bold">{fmt(s.finalValue)}</td>
                    </tr>
                  </MotionDiv>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Key Insights */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">&#x23F1;</div>
            <h4 className="font-semibold text-emerald-700 dark:text-emerald-400">Time is Free</h4>
            <p className="text-sm text-muted-foreground mt-2">
              Compound growth does the heavy lifting - you just have to show up early
            </p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">&#x1F4B0;</div>
            <h4 className="font-semibold text-blue-700 dark:text-blue-400">Growth Beats Savings</h4>
            <p className="text-sm text-muted-foreground mt-2">
              {((calculations.totalGrowth / calculations.finalValue) * 100).toFixed(0)}% of your
              final wealth is from growth, not contributions
            </p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800">
          <CardContent className="pt-6 text-center">
            <div className="text-3xl mb-2">&#x1F3C3;</div>
            <h4 className="font-semibold text-purple-700 dark:text-purple-400">Start Now</h4>
            <p className="text-sm text-muted-foreground mt-2">
              Even small amounts today beat larger amounts later - consistency wins
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
