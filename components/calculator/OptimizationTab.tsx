"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, TrendingUp, Calendar, DollarSign, Loader2 } from "lucide-react";

interface OptimizationResult {
  surplusAnnual: number;
  surplusMonthly: number;
  maxSplurge: number;
  earliestRetirementAge: number;
  yearsEarlier: number;
}

interface OptimizationTabProps {
  inputs: any;
  currentAge: number;
  plannedRetirementAge: number;
}

const SPLURGE_ITEMS = [
  { name: "Luxury Family Vacation", cost: 25000 },
  { name: "Patek Philippe Complication", cost: 85000 },
  { name: "Porsche 911", cost: 140000 },
  { name: "Vacation Home Down Payment", cost: 300000 },
];

export default function OptimizationTab({ inputs, currentAge, plannedRetirementAge }: OptimizationTabProps) {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a dedicated worker for optimization
    const worker = new Worker('/monte-carlo-worker.js');

    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'optimize-complete') {
        setResult(e.data.result);
        setLoading(false);
      } else if (e.data.type === 'error') {
        setError(e.data.error);
        setLoading(false);
      }
    };

    worker.addEventListener('message', handleMessage);

    // Start optimization
    worker.postMessage({
      type: 'optimize',
      params: inputs,
      baseSeed: 42,
    });

    return () => {
      worker.removeEventListener('message', handleMessage);
      worker.terminate();
    };
  }, [inputs]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <h3 className="text-xl font-semibold">Optimizing Your Plan...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          Crunching 10,000+ scenarios to find your freedom date, splurge capacity, and savings surplus.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <XCircle className="h-12 w-12 text-red-600" />
        <h3 className="text-xl font-semibold">Optimization Failed</h3>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (!result) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const requiredSavingsPercent = result.surplusAnnual > 0
    ? ((inputs.cTax1 + inputs.cPre1 + inputs.cPost1 + inputs.cTax2 + inputs.cPre2 + inputs.cPost2 + inputs.cMatch1 + inputs.cMatch2 - result.surplusAnnual) /
       (inputs.cTax1 + inputs.cPre1 + inputs.cPost1 + inputs.cTax2 + inputs.cPre2 + inputs.cPost2 + inputs.cMatch1 + inputs.cMatch2)) * 100
    : 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">Financial Freedom Analysis</h2>
        <p className="text-muted-foreground">
          Discover how much flexibility you have in your retirement plan
        </p>
      </div>

      {/* Card A: Oversaving Assessment - HIDDEN (undermines generational wealth goal) */}
      {/* <Card className="border-2 border-green-200 bg-green-50/50 dark:bg-green-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-green-600" />
            <CardTitle className="text-2xl">The "Live a Little" Assessment</CardTitle>
          </div>
          <CardDescription>Your monthly savings surplus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.surplusMonthly > 0 ? (
            <>
              <div className="text-center py-4">
                <p className="text-lg mb-2">You are oversaving by</p>
                <p className="text-5xl font-bold text-green-600">
                  {formatCurrency(result.surplusMonthly)}<span className="text-2xl">/month</span>
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  ({formatCurrency(result.surplusAnnual)} annually)
                </p>
              </div>

              <p className="text-center text-muted-foreground">
                You can spend this amount guilt-free on lifestyle today and still hit your retirement targets with <strong>95% confidence</strong>.
              </p>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Required Savings</span>
                  <span>Current Savings</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-green-600 h-4 rounded-full transition-all duration-1000"
                    style={{ width: `${requiredSavingsPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{requiredSavingsPercent.toFixed(0)}% needed</span>
                  <span>100% currently saving</span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-lg text-yellow-600">
                Your current savings are optimized for your goals. Consider maintaining your current contribution level.
              </p>
            </div>
          )}
        </CardContent>
      </Card> */}

      {/* Card B: Splurge Capacity */}
      <Card className="border-2 border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-purple-600" />
            <CardTitle className="text-2xl">The "Splurge Menu"</CardTitle>
          </div>
          <CardDescription>Your one-time spending capacity (Years 1-5)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-4">
            <p className="text-lg mb-2">Your Safe Splurge Capacity</p>
            <p className="text-5xl font-bold text-purple-600">
              {formatCurrency(result.maxSplurge)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              One-time expense you can afford today
            </p>
          </div>

          <div className="space-y-3">
            {SPLURGE_ITEMS.map((item) => {
              const affordable = result.maxSplurge >= item.cost;
              return (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 ${
                    affordable
                      ? 'border-green-300 bg-green-50/50 dark:bg-green-950/20'
                      : 'border-red-300 bg-red-50/50 dark:bg-red-950/20'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {affordable ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{formatCurrency(item.cost)}</p>
                    </div>
                  </div>
                  <Badge variant={affordable ? "default" : "destructive"}>
                    {affordable ? "Affordable" : "Stretch"}
                  </Badge>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            * Based on maintaining 95% success rate with current plan
          </p>
        </CardContent>
      </Card>

      {/* Card C: Freedom Date */}
      <Card className="border-2 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <CardTitle className="text-2xl">The "Freedom Date"</CardTitle>
          </div>
          <CardDescription>When you reach work-optional status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.yearsEarlier > 0 ? (
            <>
              <div className="text-center py-4">
                <p className="text-lg mb-2">You can stop working at age</p>
                <p className="text-5xl font-bold text-blue-600">
                  {result.earliestRetirementAge}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  That's <strong>{result.yearsEarlier} year{result.yearsEarlier > 1 ? 's' : ''}</strong> earlier than your planned retirement!
                </p>
              </div>

              {/* Timeline visualization */}
              <div className="space-y-4 mt-6">
                <div className="relative pt-8 pb-4">
                  {/* Timeline line */}
                  <div className="absolute top-12 left-0 right-0 h-2 bg-gray-200 rounded-full">
                    <div
                      className="h-2 bg-blue-600 rounded-full transition-all duration-1000"
                      style={{
                        width: `${((result.earliestRetirementAge - currentAge) / (plannedRetirementAge - currentAge)) * 100}%`
                      }}
                    />
                  </div>

                  {/* Timeline markers */}
                  <div className="relative flex justify-between">
                    {/* Current Age */}
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-gray-400 rounded-full mb-2 relative z-10" />
                      <p className="text-sm font-semibold">Today</p>
                      <p className="text-xs text-muted-foreground">Age {currentAge}</p>
                    </div>

                    {/* Freedom Age */}
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-blue-600 rounded-full mb-2 relative z-10" />
                      <p className="text-sm font-semibold text-blue-600">Freedom</p>
                      <p className="text-xs text-blue-600">Age {result.earliestRetirementAge}</p>
                    </div>

                    {/* Planned Retirement */}
                    <div className="flex flex-col items-center">
                      <div className="w-4 h-4 bg-gray-300 rounded-full mb-2 relative z-10" />
                      <p className="text-sm font-semibold">Planned</p>
                      <p className="text-xs text-muted-foreground">Age {plannedRetirementAge}</p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-center text-muted-foreground text-sm">
                Based on your current trajectory, you reach "Work Optional" status earlier than expected while maintaining a <strong>95% success rate</strong>.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <p className="text-lg">Your planned retirement age of <strong>{plannedRetirementAge}</strong> is optimal.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Retiring earlier would reduce your success rate below 95%.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary note */}
      <div className="text-center text-xs text-muted-foreground p-4 bg-muted/50 rounded-lg">
        All optimizations maintain a 95% success rate based on 1,000 Monte Carlo simulations per scenario.
        Results may vary with market conditions and assumptions.
      </div>
    </div>
  );
}
