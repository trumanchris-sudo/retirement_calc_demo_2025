"use client"

import React, { Suspense } from "react";
import dynamic from "next/dynamic";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
  ResponsiveContainer,
  Area,
  Rectangle,
} from "recharts";
import { fmt } from "@/lib/utils";
import {
  LIFE_EXP,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
} from "@/lib/constants";
import { BEAR_MARKET_SCENARIOS } from "@/lib/simulation/bearMarkets";
import { INFLATION_SHOCK_SCENARIOS } from "@/lib/simulation/inflationShocks";
import type { CalculationResult, ComparisonData } from "@/types/calculator";
import type { WalkSeries, BatchSummary, ReturnMode } from "@/types/planner";

// Lazy load heavy chart components
const AreaChart = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.AreaChart })),
  { ssr: false }
);
const Sankey = dynamic(
  () => import("recharts").then((mod) => ({ default: mod.Sankey })),
  { ssr: false }
);

// Chart loading fallback
const ChartLoadingFallback = ({ height = "h-64" }: { height?: string }) => (
  <div className={`${height} animate-pulse bg-gray-100 rounded`} />
);

export interface PrintReportProps {
  res: CalculationResult;
  batchSummary: BatchSummary | null;
  scenarioName: string;
  randomWalkSeries: WalkSeries;
  inflationRate: number;
  returnMode: ReturnMode;
  retRate: number;
  wdRate: number;
  retirementAge: number;
  marital: 'single' | 'married';
  historicalYear: number | null;
  inflationShockRate: number;
  inflationShockDuration: number;
  comparisonMode: boolean;
  comparisonData: ComparisonData | null;
  aiInsight: string | null;
  // Calculation input values for the report
  age1: number;
  taxableBalance: number;
  pretaxBalance: number;
  rothBalance: number;
  cTax1: number;
  cPre1: number;
  cPost1: number;
  total: number;
}

export function PrintReport({
  res,
  batchSummary,
  scenarioName,
  randomWalkSeries,
  inflationRate,
  returnMode,
  retRate,
  wdRate,
  retirementAge,
  marital,
  historicalYear,
  inflationShockRate,
  inflationShockDuration,
  comparisonMode,
  comparisonData,
  aiInsight,
  age1,
  taxableBalance,
  pretaxBalance,
  rothBalance,
  cTax1,
  cPre1,
  cPost1,
  total,
}: PrintReportProps) {
  return (
    <div className="hidden print:block print:bg-white print:text-black print:p-8 print:font-sans print:text-sm">

      {/* PAGE 1: COVER & KEY METRICS */}
      <section className="print-section print-page-break-after">
        <header className="mb-6 border-b-2 border-gray-900 pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-black">
            Tax-Aware Retirement Plan Report
          </h1>
          <p className="text-xs text-gray-700 mt-1">
            Generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })} -
            {scenarioName ? ` Scenario: ${scenarioName}` : ' Base Case Analysis'} -
            {randomWalkSeries === 'trulyRandom' ? ' Monte Carlo Simulation (1,000 runs)' : ' Single Path Projection'}
          </p>
        </header>

        {/* 4 Key Metric Cards */}
        <div className="grid grid-cols-1 print:grid-cols-2 gap-4 mb-6">
          {randomWalkSeries === 'trulyRandom' ? (
            <>
              {/* Monte Carlo Mode */}
              <div className="border-2 border-green-300 bg-green-50 p-4">
                <div className="text-xs uppercase text-green-800 font-semibold mb-1">Probability of Success</div>
                <div className="text-3xl font-bold text-green-900 mb-1">
                  {res.probRuin !== undefined ? `${((1 - res.probRuin) * 100).toFixed(1)}%` : '100%'}
                </div>
                <div className="text-sm text-green-700">Based on 1,000 market simulations</div>
              </div>

              <div className="border-2 border-red-300 bg-red-50 p-4">
                <div className="text-xs uppercase text-red-800 font-semibold mb-1">Worst-Case Wealth (P10)</div>
                <div className="text-3xl font-bold text-red-900 mb-1">
                  {batchSummary && batchSummary.p10BalancesReal ?
                    fmt(batchSummary.p10BalancesReal[batchSummary.p10BalancesReal.length - 1] * Math.pow(1 + inflationRate / 100, batchSummary.p10BalancesReal.length - 1))
                    : fmt(res.eol * 0.3)}
                </div>
                <div className="text-sm text-red-700">Bottom 10% outcome</div>
              </div>

              <div className="border-2 border-blue-300 bg-blue-50 p-4">
                <div className="text-xs uppercase text-blue-800 font-semibold mb-1">Median Wealth (P50)</div>
                <div className="text-3xl font-bold text-blue-900 mb-1">{fmt(res.eol)}</div>
                <div className="text-sm text-blue-700">Expected outcome</div>
              </div>

              <div className="border-2 border-purple-300 bg-purple-50 p-4">
                <div className="text-xs uppercase text-purple-800 font-semibold mb-1">Best-Case Wealth (P90)</div>
                <div className="text-3xl font-bold text-purple-900 mb-1">
                  {batchSummary && batchSummary.p90BalancesReal ?
                    fmt(batchSummary.p90BalancesReal[batchSummary.p90BalancesReal.length - 1] * Math.pow(1 + inflationRate / 100, batchSummary.p90BalancesReal.length - 1))
                    : fmt(res.eol * 1.8)}
                </div>
                <div className="text-sm text-purple-700">Top 10% outcome</div>
              </div>
            </>
          ) : (
            <>
              {/* Fixed/Deterministic Mode */}
              <div className="border-2 border-blue-300 bg-blue-50 p-4">
                <div className="text-xs uppercase text-blue-800 font-semibold mb-1">Projected Ending Wealth</div>
                <div className="text-3xl font-bold text-blue-900 mb-1">{fmt(res.eol)}</div>
                <div className="text-sm text-blue-700">At age {LIFE_EXP}</div>
              </div>

              <div className="border-2 border-green-300 bg-green-50 p-4">
                <div className="text-xs uppercase text-green-800 font-semibold mb-1">Annual Safe Income</div>
                <div className="text-3xl font-bold text-green-900 mb-1">{fmt(res.wdReal)}</div>
                <div className="text-sm text-green-700">Year 1 (inflation-adjusted)</div>
              </div>

              <div className="border-2 border-orange-300 bg-orange-50 p-4">
                <div className="text-xs uppercase text-orange-800 font-semibold mb-1">Est. Lifetime Tax Rate</div>
                <div className="text-3xl font-bold text-orange-900 mb-1">
                  {res.wd > 0 ? ((res.tax.tot / res.wd) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-sm text-orange-700">Based on projected withdrawals</div>
              </div>

              <div className="border-2 border-purple-300 bg-purple-50 p-4">
                <div className="text-xs uppercase text-purple-800 font-semibold mb-1">Net to Heirs</div>
                <div className="text-3xl font-bold text-purple-900 mb-1">{fmt(res.netEstate || res.eol)}</div>
                <div className="text-sm text-purple-700">After estate taxes</div>
              </div>
            </>
          )}
        </div>

        {/* Executive Summary */}
        <div className="mb-6 p-4 border-2 border-gray-300 bg-gray-50">
          <h2 className="text-lg font-bold text-black mb-3">Executive Summary</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Current Age:</span>
              <span className="font-semibold text-black">{age1}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Retirement Age:</span>
              <span className="font-semibold text-black">{retirementAge}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Years to Retirement:</span>
              <span className="font-semibold text-black">{res.yrsToRet}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Withdrawal Rate:</span>
              <span className="font-semibold text-black">{wdRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Current Savings:</span>
              <span className="font-semibold text-black">{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Return Model:</span>
              <span className="font-semibold text-black">
                {returnMode === 'fixed' ? `Fixed ${retRate}%` : 'Historical Bootstrap'}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 2: ACCOUNT BREAKDOWN */}
      <section className="print-section print-page-break-after">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Account Breakdown</h2>
          <p className="text-xs text-gray-700 mt-1">Current balances and annual contributions</p>
        </header>

        {/* Current Balances */}
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Current Balances</h3>
          <table className="w-full text-sm border border-gray-200">
            <tbody>
              <tr className="bg-gray-50">
                <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable (Brokerage)</th>
                <td className="px-3 py-2 text-right text-black">{fmt(taxableBalance)}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax (401k/IRA)</th>
                <td className="px-3 py-2 text-right text-black">{fmt(pretaxBalance)}</td>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-black">Roth (Tax-Free)</th>
                <td className="px-3 py-2 text-right text-black">{fmt(rothBalance)}</td>
              </tr>
              <tr className="border-t-2 border-gray-900">
                <th className="px-3 py-2 text-left font-bold text-black">Total Current Savings</th>
                <td className="px-3 py-2 text-right font-bold text-black">{fmt(total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Annual Contributions */}
        <div className="mb-6">
          <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Annual Contributions</h3>
          <table className="w-full text-sm border border-gray-200">
            <tbody>
              <tr className="bg-gray-50">
                <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable Contribution</th>
                <td className="px-3 py-2 text-right text-black">{fmt(cTax1)}</td>
              </tr>
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax Contribution</th>
                <td className="px-3 py-2 text-right text-black">{fmt(cPre1)}</td>
              </tr>
              <tr className="bg-gray-50">
                <th className="px-3 py-2 text-left font-semibold text-black">Roth Contribution</th>
                <td className="px-3 py-2 text-right text-black">{fmt(cPost1)}</td>
              </tr>
              <tr className="border-t-2 border-gray-900">
                <th className="px-3 py-2 text-left font-bold text-black">Total Annual Contributions</th>
                <td className="px-3 py-2 text-right font-bold text-black">{fmt(cTax1 + cPre1 + cPost1)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* PAGE 3: WEALTH ACCUMULATION CHART */}
      <section className="print-section print-page-break-after">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Wealth Accumulation Projection</h2>
          <p className="text-xs text-gray-700 mt-1">Portfolio value over time (inflation-adjusted real dollars)</p>
        </header>

        <Suspense fallback={<ChartLoadingFallback height="h-[300px]" />}>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={res.data}>
                <defs>
                  <linearGradient id="printRealGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="year" stroke="#374151" tick={{ fill: '#374151', fontSize: 10 }} />
                <YAxis tickFormatter={(v) => fmt(v as number)} stroke="#374151" tick={{ fill: '#374151', fontSize: 10 }} />
                <RTooltip formatter={(v) => fmt(v as number)} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="real"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#printRealGradient)"
                  name="Real Balance"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Suspense>

        {/* Retirement Timeline */}
        <div className="mt-6 mb-4">
          <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Retirement Timeline</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded">
              <div className="text-xs text-blue-800 font-semibold mb-1">Accumulation Phase</div>
              <div className="text-lg font-bold text-blue-900">{res.yrsToRet} years</div>
              <div className="text-xs text-blue-700">Age {age1} to {retirementAge}</div>
            </div>
            <div className="p-3 bg-green-50 border border-green-200 rounded">
              <div className="text-xs text-green-800 font-semibold mb-1">Retirement Phase</div>
              <div className="text-lg font-bold text-green-900">{LIFE_EXP - retirementAge} years</div>
              <div className="text-xs text-green-700">Age {retirementAge} to {LIFE_EXP}</div>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 4: TAX ANALYSIS */}
      <section className="print-section print-page-break-after">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Tax Analysis (Year 1 of Retirement)</h2>
          <p className="text-xs text-gray-700 mt-1">Estimated tax breakdown on first-year withdrawal of {fmt(res.wd)}</p>
        </header>

        <div className="grid grid-cols-2 gap-6">
          {/* Tax Summary */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Tax Summary</h3>
            <table className="w-full text-sm border border-gray-200">
              <tbody>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-black">Gross Withdrawal</th>
                  <td className="px-3 py-2 text-right text-black">{fmt(res.wd)}</td>
                </tr>
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-black">Federal Ordinary Tax</th>
                  <td className="px-3 py-2 text-right text-red-700">-{fmt(res.tax.fedOrd)}</td>
                </tr>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left font-semibold text-black">Federal Capital Gains</th>
                  <td className="px-3 py-2 text-right text-red-700">-{fmt(res.tax.fedCap)}</td>
                </tr>
                {res.tax.niit > 0 && (
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-black">NIIT (3.8%)</th>
                    <td className="px-3 py-2 text-right text-red-700">-{fmt(res.tax.niit)}</td>
                  </tr>
                )}
                <tr className={res.tax.niit > 0 ? 'bg-gray-50' : ''}>
                  <th className="px-3 py-2 text-left font-semibold text-black">State Tax</th>
                  <td className="px-3 py-2 text-right text-red-700">-{fmt(res.tax.state)}</td>
                </tr>
                <tr className="border-t-2 border-gray-900">
                  <th className="px-3 py-2 text-left font-bold text-black">Total Tax</th>
                  <td className="px-3 py-2 text-right font-bold text-red-700">-{fmt(res.tax.tot)}</td>
                </tr>
                <tr className="bg-green-50 border-t-2 border-gray-900">
                  <th className="px-3 py-2 text-left font-bold text-black">After-Tax Income</th>
                  <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(res.wdAfter)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Effective Tax Rate */}
          <div>
            <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">Tax Efficiency</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <div className="text-xs text-blue-800 font-semibold mb-1">Effective Tax Rate</div>
                <div className="text-2xl font-bold text-blue-900">
                  {res.wd > 0 ? ((res.tax.tot / res.wd) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-xs text-blue-700">Total tax / Gross withdrawal</div>
              </div>
              <div className="p-4 bg-green-50 border border-green-200 rounded">
                <div className="text-xs text-green-800 font-semibold mb-1">Tax-Free Roth Portion</div>
                <div className="text-2xl font-bold text-green-900">
                  {total > 0 ? ((rothBalance / total) * 100).toFixed(1) : '0'}%
                </div>
                <div className="text-xs text-green-700">Of total portfolio</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PAGE 5: STRESS TESTING (if scenarios are active) */}
      {(historicalYear || (inflationShockRate > 0 && inflationShockDuration > 0) || comparisonMode) && (
        <section className="print-section print-page-break-after">
          <header className="mb-4 border-b-2 border-gray-900 pb-3">
            <h2 className="text-xl font-bold text-black">Stress Testing & Scenario Analysis</h2>
            <p className="text-xs text-gray-700 mt-1">Testing your plan against adverse market and inflation conditions</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Bear Market Stress Test */}
            {historicalYear && (
              <div className="p-4 border-2 border-red-300 bg-red-50 rounded">
                <h3 className="text-base font-semibold mb-2 text-black">Bear Market Stress Test</h3>
                <p className="text-xs text-gray-700 mb-3">
                  Testing with actual historical returns starting from a major market crash.
                </p>
                {(() => {
                  const scenario = BEAR_MARKET_SCENARIOS.find(s => s.year === historicalYear);
                  return scenario ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-white border border-red-200 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-semibold text-sm text-black">{scenario.year} - {scenario.label}</div>
                            <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            scenario.risk === 'extreme'
                              ? 'bg-red-200 text-red-900'
                              : scenario.risk === 'high'
                              ? 'bg-orange-200 text-orange-900'
                              : 'bg-yellow-200 text-yellow-900'
                          }`}>
                            {scenario.firstYear}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <strong>Why this matters:</strong> Retiring into a bear market can permanently damage your portfolio even if markets recover later.
                        This scenario uses actual sequential S&P 500 returns from {historicalYear} forward.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">Active scenario: {historicalYear}</p>
                  );
                })()}
              </div>
            )}

            {/* Inflation Shock Stress Test */}
            {inflationShockRate > 0 && inflationShockDuration > 0 && (
              <div className="p-4 border-2 border-orange-300 bg-orange-50 rounded">
                <h3 className="text-base font-semibold mb-2 text-black">Inflation Shock Stress Test</h3>
                <p className="text-xs text-gray-700 mb-3">
                  Modeling sustained high inflation on your real purchasing power.
                </p>
                {(() => {
                  const scenario = INFLATION_SHOCK_SCENARIOS.find(s => s.rate === inflationShockRate && s.duration === inflationShockDuration);
                  return scenario ? (
                    <div className="space-y-2">
                      <div className="p-2 bg-white border border-orange-200 rounded">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <div className="font-semibold text-sm text-black">{scenario.label}</div>
                            <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${
                            scenario.risk === 'extreme'
                              ? 'bg-red-200 text-red-900'
                              : scenario.risk === 'high'
                              ? 'bg-orange-200 text-orange-900'
                              : 'bg-yellow-200 text-yellow-900'
                          }`}>
                            {scenario.rate}%
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        <strong>Impact:</strong> {inflationShockRate}% inflation for {inflationShockDuration} years starting at retirement, then returning to {inflationRate}% baseline.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600">
                      <strong>Custom scenario:</strong> {inflationShockRate}% inflation for {inflationShockDuration} years
                    </p>
                  );
                })()}
              </div>
            )}
          </div>
        </section>
      )}

      {/* PAGE 6: LIFETIME WEALTH FLOW */}
      <section className="print-section print-page-break-after">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Real Lifetime Wealth Flow Chart</h2>
          <p className="text-xs text-gray-700 mt-1">From end-of-life wealth to net inheritance (all values in today's dollars)</p>
        </header>

        {res.eolAccounts && res.eol > 0 ? (
          <>
            {/* Account Breakdown Table */}
            <div className="mb-4">
              <h3 className="text-base font-semibold mb-3 text-black border-b border-gray-300 pb-1">End-of-Life Account Breakdown</h3>
              <table className="w-full text-xs border border-gray-200">
                <tbody>
                  <tr className="bg-gray-50">
                    <th className="w-1/2 px-3 py-2 text-left font-semibold text-black">Taxable Accounts</th>
                    <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.taxable)}</td>
                  </tr>
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-black">Pre-Tax (401k/IRA)</th>
                    <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.pretax)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-black">Roth (Tax-Free)</th>
                    <td className="px-3 py-2 text-right text-black">{fmt(res.eolAccounts.roth)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-900">
                    <th className="px-3 py-2 text-left font-bold text-black">Total Estate</th>
                    <td className="px-3 py-2 text-right font-bold text-black">{fmt(res.eol)}</td>
                  </tr>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-black">Estate Tax</th>
                    <td className="px-3 py-2 text-right text-black">{fmt(res.estateTax || 0)}</td>
                  </tr>
                  <tr className="border-t-2 border-gray-900">
                    <th className="px-3 py-2 text-left font-bold text-black">Net to Heirs</th>
                    <td className="px-3 py-2 text-right font-bold text-black">{fmt(res.netEstate || res.eol)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Total RMDs */}
            {res.totalRMDs > 0 && (
              <div className="mb-4">
                <h3 className="text-base font-semibold mb-2 text-black">Total RMDs (Age 73+)</h3>
                <p className="text-sm text-gray-700">Cumulative Required Minimum Distributions: <span className="font-bold">{fmt(res.totalRMDs)}</span></p>
              </div>
            )}

            {/* Disclaimer */}
            <div className="p-3 bg-gray-50 border border-gray-300 rounded text-xs text-gray-700">
              <p className="leading-relaxed">
                <strong>Disclaimer:</strong> This Lifetime Wealth Flow illustration attributes estate tax proportionally across all account types based on their share of the total estate. In practice, executors often choose to satisfy estate tax using taxable assets first to preserve tax-advantaged accounts. The economic burden ultimately depends on your estate structure, beneficiary designations, and trust planning.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-gray-600">No end-of-life wealth data available.</p>
        )}
      </section>

      {/* PAGE 7: PLAN ANALYSIS (if generated) */}
      <section className="print-section print-page-break-after">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Plan Analysis</h2>
          <p className="text-xs text-gray-700 mt-1">AI-generated insights and recommendations</p>
        </header>

        {aiInsight && aiInsight.trim().length > 0 ? (
          <div className="prose prose-sm max-w-none">
            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {aiInsight}
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-300 rounded">
            <p className="text-sm text-gray-700">Plan analysis was not generated for this report.</p>
          </div>
        )}
      </section>

      {/* FINAL PAGE: DISCLAIMERS & LIMITATIONS */}
      <section className="print-section">
        <header className="mb-4 border-b-2 border-gray-900 pb-3">
          <h2 className="text-xl font-bold text-black">Limitations & Disclaimers</h2>
        </header>

        <div className="space-y-4 text-xs text-gray-800">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">Educational Purpose Only</h3>
            <p>
              This report is generated by a retirement planning calculator for educational and illustrative purposes only.
              It does NOT constitute personalized financial, investment, tax, or legal advice. You should consult with
              qualified financial, tax, and legal professionals before making any financial decisions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">Assumptions & Limitations</h3>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>All projections are based on the assumptions and inputs you provided, which may not reflect actual future conditions.</li>
              <li>
                {returnMode === 'fixed'
                  ? `Fixed return assumptions (${retRate}% nominal) do not account for market volatility or sequence-of-returns risk.`
                  : 'Historical return data (1928-2024) may not predict future market performance. Past performance does not guarantee future results.'}
              </li>
              <li>Tax laws, brackets, and exemptions are subject to change and may differ significantly in the future.</li>
              <li>Inflation assumptions ({inflationRate}% baseline) are estimates and actual inflation may vary substantially.</li>
              <li>The model assumes consistent contribution and withdrawal patterns, which may not reflect real-world behavior.</li>
              <li>Healthcare costs, long-term care, and other major expenses are not explicitly modeled unless incorporated into withdrawal rates.</li>
              <li>Estate tax exemptions reflect OBBBA legislation ({fmt(marital === 'married' ? ESTATE_TAX_EXEMPTION.married : ESTATE_TAX_EXEMPTION.single)} exemption for 2026, indexed for inflation starting 2027, {(ESTATE_TAX_RATE * 100).toFixed(0)}% rate). Future legislation could repeal or modify these provisions.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">Monte Carlo Limitations</h3>
            <p>
              {randomWalkSeries === 'trulyRandom'
                ? 'While Monte Carlo simulation (1,000 runs) provides probabilistic outcomes, it is only as good as its underlying assumptions. Real-world outcomes may differ due to factors not captured in the model.'
                : 'This report uses a deterministic (single-path) projection, which does not account for sequence-of-returns risk or stochastic variability. Actual outcomes may vary significantly.'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">No Guarantees</h3>
            <p>
              There are no guarantees that any retirement plan will succeed. Market conditions, personal circumstances,
              health events, tax law changes, and many other factors can dramatically impact outcomes. This calculator
              provides estimates only and should not be relied upon as a sole basis for retirement planning decisions.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2 text-black">Consult Professionals</h3>
            <p>For personalized advice, please consult:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>A Certified Financial Planner (CFP) or Registered Investment Advisor (RIA) for investment strategy</li>
              <li>A Certified Public Accountant (CPA) or tax attorney for tax planning</li>
              <li>An estate planning attorney for estate, trust, and legacy planning</li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-300">
            <p className="text-xs text-gray-600 italic">
              Report generated on {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
              {' '}by Tax-Aware Retirement Calculator.
              This is a snapshot based on current inputs and may become outdated as circumstances change.
            </p>
          </div>
        </div>
      </section>

    </div>
  );
}
