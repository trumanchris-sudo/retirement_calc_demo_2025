"use client";

import React, { useState, useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { GenerationDataPoint } from "@/types/calculator";

interface DynastyTimelineProps {
  generationData: GenerationDataPoint[];
}

type Scenario = "direct" | "trust";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function DynastyTimeline({ generationData }: DynastyTimelineProps) {
  const [scenario, setScenario] = useState<Scenario>("trust");

  if (!generationData || generationData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dynasty Wealth Timeline</CardTitle>
          <CardDescription>
            Track how wealth flows across generations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">
              No generation data available. Run a legacy calculation with a finite duration to see how wealth transfers across generations.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate both scenarios
  const { directInheritanceData, dynastyTrustData } = useMemo(() => {
    // Direct Inheritance: Estate tax at every generation
    const directData = generationData.map((gen) => ({
      generation: `Gen ${gen.generation}`,
      generationNumber: gen.generation,
      netWealthAfterTax: gen.netToHeirs,
      estateTax: gen.estateTax,
      estateValue: gen.estateValue,
      year: gen.year,
      beneficiaries: gen.livingBeneficiaries,
    }));

    // Dynasty Trust: Tax only at Generation 1, then trust grows tax-free
    const trustData = generationData.map((gen, idx) => {
      if (idx === 0) {
        // Generation 1: Pay estate/GST tax when funding the trust
        return {
          generation: `Gen ${gen.generation}`,
          generationNumber: gen.generation,
          netWealthAfterTax: gen.netToHeirs,
          estateTax: gen.estateTax,
          estateValue: gen.estateValue,
          year: gen.year,
          beneficiaries: gen.livingBeneficiaries,
        };
      } else {
        // Generations 2+: No estate tax, assets stay in trust
        return {
          generation: `Gen ${gen.generation}`,
          generationNumber: gen.generation,
          netWealthAfterTax: gen.estateValue, // Full value stays in trust
          estateTax: 0, // No estate tax
          estateValue: gen.estateValue,
          year: gen.year,
          beneficiaries: gen.livingBeneficiaries,
        };
      }
    });

    return { directInheritanceData: directData, dynastyTrustData: trustData };
  }, [generationData]);

  // Select data based on scenario
  const chartData = scenario === "direct" ? directInheritanceData : dynastyTrustData;

  // Calculate totals for selected scenario
  const totalEstateTaxPaid = chartData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const totalEstate = chartData.reduce((sum, gen) => sum + gen.estateValue, 0);
  const avgTaxRate = totalEstate > 0 ? (totalEstateTaxPaid / totalEstate) * 100 : 0;
  const finalNetWealth = chartData[chartData.length - 1]?.netWealthAfterTax || 0;

  // Calculate tax savings (trust vs direct)
  const directTotalTax = directInheritanceData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const trustTotalTax = dynastyTrustData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const taxSavings = directTotalTax - trustTotalTax;
  const savingsPercent = directTotalTax > 0 ? (taxSavings / directTotalTax) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynasty Wealth Timeline</CardTitle>
        <CardDescription>
          Compare direct inheritance vs dynasty trust structures across {generationData.length} generations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario Toggle */}
        <div className="p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-950/50 dark:to-gray-950/50 border border-slate-200 dark:border-slate-800 rounded-lg">
          <Label className="text-sm font-semibold mb-3 block">Estate Planning Strategy:</Label>
          <RadioGroup
            value={scenario}
            onValueChange={(value) => setScenario(value as Scenario)}
            className="flex flex-col md:flex-row gap-4"
          >
            <div className="flex items-center space-x-2 flex-1">
              <RadioGroupItem value="trust" id="trust" />
              <Label htmlFor="trust" className="cursor-pointer flex-1">
                <div className="font-semibold">Dynasty Trust</div>
                <div className="text-xs text-muted-foreground">
                  Estate/GST tax at Gen 1, then assets stay in trust (tax-free growth)
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2 flex-1">
              <RadioGroupItem value="direct" id="direct" />
              <Label htmlFor="direct" className="cursor-pointer flex-1">
                <div className="font-semibold">Direct Inheritance</div>
                <div className="text-xs text-muted-foreground">
                  Estate tax charged at every generation handoff (no trust)
                </div>
              </Label>
            </div>
          </RadioGroup>
        </div>

        {/* Tax Savings Comparison (always visible) */}
        {taxSavings > 0 && (
          <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-2 border-green-300 dark:border-green-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  Dynasty Trust Tax Savings
                </div>
                <div className="text-xs text-green-800 dark:text-green-200">
                  Avoid {savingsPercent.toFixed(0)}% of estate taxes by using a trust structure
                </div>
              </div>
              <div className="text-3xl font-bold text-green-900 dark:text-green-100">
                {fmt(taxSavings)}
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Estate Tax Paid</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {fmt(totalEstateTaxPaid)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {scenario === "trust" ? "At Generation 1 only" : `Across all ${generationData.length} generations`}
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Average Estate Tax Rate</div>
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {avgTaxRate.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Federal estate tax burden
            </div>
          </div>

          <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Final Net Wealth</div>
            <div className="text-2xl font-bold text-green-900 dark:text-green-100">
              {fmt(finalNetWealth)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Generation {generationData.length}
            </div>
          </div>
        </div>

        {/* Area Chart */}
        <div className="w-full" style={{ height: 400 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="generation"
                className="text-xs"
                label={{
                  value: "Generation",
                  position: "insideBottom",
                  offset: -5,
                  style: { fill: "var(--foreground)" },
                }}
              />
              <YAxis
                tickFormatter={(v) => fmt(v)}
                className="text-xs"
                label={{
                  value: "Estate Value",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fill: "var(--foreground)" },
                }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-card border border-border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-semibold mb-2">{data.generation} (Year {data.year})</p>
                      <div className="space-y-1">
                        <p className="text-blue-600 dark:text-blue-400">
                          <span className="font-medium">Estate Value:</span> {fmt(data.estateValue)}
                        </p>
                        <p className="text-red-600 dark:text-red-400">
                          <span className="font-medium">Estate Tax:</span> {fmt(data.estateTax)}
                        </p>
                        <p className="text-green-600 dark:text-green-400">
                          <span className="font-medium">
                            {scenario === "trust" && data.generationNumber > 1 ? "Trust Balance:" : "Net to Heirs:"}
                          </span> {fmt(data.netWealthAfterTax)}
                        </p>
                        <p className="text-muted-foreground text-xs mt-2">
                          {data.beneficiaries} living beneficiaries
                        </p>
                      </div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ paddingTop: "20px" }}
                iconType="rect"
                formatter={(value) => (
                  <span className="text-sm" style={{ color: "var(--foreground)" }}>
                    {value}
                  </span>
                )}
              />
              <Area
                type="monotone"
                dataKey="netWealthAfterTax"
                stackId="1"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.6}
                name={scenario === "trust" ? "Trust Balance (Tax-Free)" : "Net Wealth After Estate Tax"}
              />
              <Area
                type="monotone"
                dataKey="estateTax"
                stackId="1"
                stroke="#ef4444"
                fill="#ef4444"
                fillOpacity={0.6}
                name="Estate Tax Paid"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <h4 className="font-semibold text-sm mb-2 text-amber-900 dark:text-amber-100">
            {scenario === "trust" ? "Dynasty Trust Structure" : "Direct Inheritance Structure"}
          </h4>
          {scenario === "trust" ? (
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              With a dynasty trust, estate/GST tax is paid only once (Generation 1) when you fund the trust.
              After that, assets remain in the trust indefinitely, growing tax-free. Beneficiaries receive
              annual distributions (${fmt(generationData[0]?.estateValue || 0).replace(/\$/, '')} shown here) but never own the assets outright,
              avoiding estate tax at each generation handoff. This structure can preserve wealth for 3+ generations.
            </p>
          ) : (
            <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
              With direct inheritance, each generation owns assets outright. Federal estate tax (40% on amounts
              above ${(13.61).toFixed(1)}M exemption) is charged every time wealth passes to the next generation.
              Over multiple generations, this compounds significantly, eroding family wealth. Strategic gifting
              ($18K/person/year) can help reduce this burden.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
