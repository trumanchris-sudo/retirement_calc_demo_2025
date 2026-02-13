'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { fmt } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TAX_BRACKETS, ESTATE_TAX_EXEMPTION } from '@/lib/constants';

const MotionDiv = dynamic(() => import('framer-motion').then((m) => m.motion.div), { ssr: false });

interface StrategyCardProps {
  number: number;
  title: string;
  subtitle: string;
  wealthyUse: string;
  yourUse: string;
  example?: React.ReactNode;
  color: 'blue' | 'emerald' | 'purple' | 'amber';
  delay: number;
}

function StrategyCard({
  number,
  title,
  subtitle,
  wealthyUse,
  yourUse,
  example,
  color,
  delay,
}: StrategyCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      badge: 'bg-blue-500',
      text: 'text-blue-700 dark:text-blue-400',
    },
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      badge: 'bg-emerald-500',
      text: 'text-emerald-700 dark:text-emerald-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-950/30',
      border: 'border-purple-200 dark:border-purple-800',
      badge: 'bg-purple-500',
      text: 'text-purple-700 dark:text-purple-400',
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      badge: 'bg-amber-500',
      text: 'text-amber-700 dark:text-amber-400',
    },
  };

  const classes = colorClasses[color];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.15 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md',
          classes.border,
          isExpanded && classes.bg
        )}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0',
                classes.badge
              )}
            >
              {number}
            </div>

            <div className="flex-1 min-w-0">
              <h3 className={cn('font-semibold text-lg', classes.text)}>{title}</h3>
              <p className="text-sm text-muted-foreground">{subtitle}</p>

              {isExpanded && (
                <MotionDiv
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-4 space-y-4"
                >
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-muted/50 rounded-lg p-4">
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-2">
                        How the Wealthy Use It
                      </p>
                      <p className="text-sm">{wealthyUse}</p>
                    </div>

                    <div className={cn('rounded-lg p-4', classes.bg)}>
                      <p className={cn('text-xs font-medium uppercase mb-2', classes.text)}>
                        How You Can Use It
                      </p>
                      <p className="text-sm">{yourUse}</p>
                    </div>
                  </div>

                  {example && <div className="pt-2">{example}</div>}
                </MotionDiv>
              )}
            </div>

            <div className="text-muted-foreground">
              <svg
                className={cn(
                  'w-5 h-5 transition-transform',
                  isExpanded && 'rotate-180'
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>
          </div>
        </CardContent>
      </Card>
    </MotionDiv>
  );
}

/**
 * Educational component showing wealth-building strategies used by the wealthy
 * Demystifies these concepts and shows how anyone can apply them
 */
export function RichPeoplePlaybook() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <MotionDiv
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold mb-2">The Wealthy Playbook</h2>
        <p className="text-muted-foreground">
          These arent secrets - theyre strategies anyone can learn and use
        </p>
      </MotionDiv>

      {/* Empowering Banner */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-950/30 dark:to-blue-950/30
                      border border-emerald-200 dark:border-emerald-800 rounded-xl p-6 text-center">
        <p className="text-lg font-medium">
          The difference between wealthy families and everyone else? <br />
          <span className="text-emerald-600 dark:text-emerald-400 font-bold">
            They know the rules and use them
          </span>
        </p>
        <p className="text-sm text-muted-foreground mt-2">Tap each strategy to learn more</p>
      </div>

      {/* Strategies */}
      <div className="space-y-4">
        <StrategyCard
          number={1}
          title="Roth Conversions in Low-Income Years"
          subtitle="Pay taxes when rates are lowest"
          wealthyUse="Wealthy families plan gap years between jobs, sabbaticals, or early retirement specifically to do large Roth conversions at lower tax brackets."
          yourUse="Any year your income drops (job change, parental leave, sabbatical) is a conversion opportunity. Convert up to the top of the 22% or 24% bracket."
          color="emerald"
          delay={0}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Example:</p>
              <p className="text-muted-foreground">
                Between jobs for 6 months with $40K income? Convert $60K from Traditional to Roth,
                staying in the 22% bracket. You just moved $60K to tax-free growth forever.
              </p>
            </div>
          }
        />

        <StrategyCard
          number={2}
          title="Backdoor Roth IRA"
          subtitle="Income limits dont matter"
          wealthyUse="High earners contribute $7,000 to a non-deductible Traditional IRA, then immediately convert to Roth. Legal, IRS-approved, and widely used."
          yourUse="If you earn over the Roth IRA limit ($161K single / $240K married in 2024), use this same strategy. Takes 10 minutes to set up."
          color="blue"
          delay={1}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">The Steps:</p>
              <ol className="list-decimal list-inside text-muted-foreground space-y-1">
                <li>Contribute $7,000 to Traditional IRA (non-deductible)</li>
                <li>Wait a few days</li>
                <li>Convert to Roth IRA</li>
                <li>Pay minimal tax on any growth during those few days</li>
              </ol>
            </div>
          }
        />

        <StrategyCard
          number={3}
          title="Mega Backdoor Roth"
          subtitle="Supercharge your Roth contributions"
          wealthyUse="If your 401(k) allows after-tax contributions, you can contribute up to $69,000 total (2024) and convert the after-tax portion to Roth."
          yourUse="Check if your employer plan allows after-tax contributions with in-plan Roth conversions. Not all do, but its worth asking HR."
          color="purple"
          delay={2}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">The Math:</p>
              <div className="text-muted-foreground">
                <p>2024 401(k) limit: $23,000 (employee)</p>
                <p>With employer match: ~$30,000</p>
                <p>Total limit: $69,000</p>
                <p className="mt-2 text-purple-600 dark:text-purple-400">
                  The gap (~$39,000) can be after-tax contributions converted to Roth
                </p>
              </div>
            </div>
          }
        />

        <StrategyCard
          number={4}
          title="Tax-Loss Harvesting"
          subtitle="Turn losses into tax savings"
          wealthyUse="Wealthy investors systematically sell losing positions to offset gains, then immediately buy similar (not identical) investments to maintain exposure."
          yourUse="When the market drops, sell investments at a loss, use the loss to offset gains or up to $3,000 of regular income, and reinvest in a similar fund."
          color="amber"
          delay={3}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Example:</p>
              <p className="text-muted-foreground">
                Your S&P 500 fund is down $10,000. Sell it, buy a Total Market fund (similar but
                not identical). Youve harvested a $10K loss while staying invested.
              </p>
            </div>
          }
        />

        <StrategyCard
          number={5}
          title="Asset Location Strategy"
          subtitle="Right assets in right accounts"
          wealthyUse="Place tax-inefficient investments (bonds, REITs) in tax-advantaged accounts, and tax-efficient investments (index funds) in taxable accounts."
          yourUse="Put your bond funds in your 401(k)/IRA. Keep your stock index funds in taxable accounts where you get favorable capital gains rates."
          color="blue"
          delay={4}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Optimal Placement:</p>
              <div className="grid grid-cols-2 gap-4 text-muted-foreground">
                <div>
                  <p className="font-medium text-foreground">Tax-Advantaged (401k/IRA)</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Bonds</li>
                    <li>REITs</li>
                    <li>High-dividend stocks</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Taxable Brokerage</p>
                  <ul className="list-disc list-inside text-sm">
                    <li>Index funds</li>
                    <li>Growth stocks</li>
                    <li>Municipal bonds</li>
                  </ul>
                </div>
              </div>
            </div>
          }
        />

        <StrategyCard
          number={6}
          title="Dynasty/Generation-Skipping"
          subtitle="Multi-generational wealth transfer"
          wealthyUse="Use the estate tax exemption ({fmt(ESTATE_TAX_EXEMPTION.married)} for couples) to pass wealth to grandchildren, skipping a generation of estate tax."
          yourUse="You dont need a dynasty trust. Simply designate grandchildren as beneficiaries on your Roth IRA - they get 10 years of tax-free growth."
          color="emerald"
          delay={5}
          example={
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 text-sm">
              <p className="font-medium mb-2">Simplified Version:</p>
              <p className="text-muted-foreground">
                Name your grandchildren as Roth IRA beneficiaries. When they inherit, they have 10
                years to withdraw - tax-free. The longer the money grows tax-free, the more
                powerful it becomes.
              </p>
            </div>
          }
        />
      </div>

      {/* Key Insight */}
      <MotionDiv
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1 }}
        className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30
                   border border-purple-200 dark:border-purple-800 rounded-xl p-6"
      >
        <h3 className="text-xl font-bold text-center mb-4">The Real Secret</h3>

        <div className="grid gap-4 md:grid-cols-3 text-center">
          <div className="space-y-2">
            <div className="text-3xl">&#x1F4DA;</div>
            <p className="font-medium">Know the Rules</p>
            <p className="text-sm text-muted-foreground">
              Tax code rewards certain behaviors
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-3xl">&#x23F0;</div>
            <p className="font-medium">Start Early</p>
            <p className="text-sm text-muted-foreground">
              Time amplifies every strategy
            </p>
          </div>

          <div className="space-y-2">
            <div className="text-3xl">&#x1F504;</div>
            <p className="font-medium">Be Consistent</p>
            <p className="text-sm text-muted-foreground">
              Small actions compound over decades
            </p>
          </div>
        </div>

        <p className="text-center mt-6 text-lg font-medium text-purple-700 dark:text-purple-400">
          You dont need to be wealthy to start. You need to start to become wealthy.
        </p>
      </MotionDiv>

      {/* Action Items */}
      <Card>
        <CardContent className="pt-6">
          <h3 className="text-lg font-semibold mb-4">Your Next Steps</h3>

          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">1</span>
              </div>
              <div>
                <p className="font-medium">Max out your 401(k) match</p>
                <p className="text-sm text-muted-foreground">Free money first</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">2</span>
              </div>
              <div>
                <p className="font-medium">Open a Roth IRA (or Backdoor Roth)</p>
                <p className="text-sm text-muted-foreground">Tax-free growth is too powerful to skip</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">3</span>
              </div>
              <div>
                <p className="font-medium">Check for low-income year opportunities</p>
                <p className="text-sm text-muted-foreground">Job change? Early retirement? Time to convert</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center flex-shrink-0">
                <span className="text-emerald-600 dark:text-emerald-400 text-sm">4</span>
              </div>
              <div>
                <p className="font-medium">Review beneficiary designations</p>
                <p className="text-sm text-muted-foreground">Make sure your wealth goes where you want it</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
