"use client";

import React from "react";
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
import type { GenerationDataPoint } from "@/types/calculator";

interface DynastyTimelineProps {
  generationData: GenerationDataPoint[];
}

const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);

export function DynastyTimeline({ generationData }: DynastyTimelineProps) {
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

  // Transform data for the chart
  const chartData = generationData.map((gen) => ({
    generation: `Gen ${gen.generation}`,
    generationNumber: gen.generation,
    netWealthAfterTax: gen.netToHeirs,
    estateTax: gen.estateTax,
    estateValue: gen.estateValue,
    year: gen.year,
    beneficiaries: gen.livingBeneficiaries,
  }));

  // Calculate totals
  const totalEstateTaxPaid = generationData.reduce((sum, gen) => sum + gen.estateTax, 0);
  const avgTaxRate =
    generationData.length > 0
      ? (totalEstateTaxPaid / generationData.reduce((sum, gen) => sum + gen.estateValue, 0)) * 100
      : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dynasty Wealth Timeline</CardTitle>
        <CardDescription>
          Wealth transfer across {generationData.length} generations with estate tax impact
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="text-sm text-muted-foreground mb-1">Total Estate Tax Paid</div>
            <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
              {fmt(totalEstateTaxPaid)}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Across all {generationData.length} generations
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
              {fmt(chartData[chartData.length - 1]?.netWealthAfterTax || 0)}
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
                          <span className="font-medium">Net to Heirs:</span> {fmt(data.netWealthAfterTax)}
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
                name="Net Wealth After Estate Tax"
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
            Understanding Estate Tax Impact
          </h4>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            This chart shows how federal estate tax reduces wealth at each generation handoff. The red area represents
            tax paid (40% on amounts above ${(13.61).toFixed(1)}M exemption), while the green area shows net wealth
            passing to heirs. Strategic gifting ($18K/person/year) can significantly reduce this tax burden.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
