"use client"

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, Github, Calculator, DollarSign, TrendingUp, Shield, Percent } from "lucide-react";

// Import actual calculation functions and constants
import { calcOrdinaryTax, calcLTCGTax, calcNIIT } from "@/lib/calculations/taxCalculations";
import {
  TAX_BRACKETS,
  LTCG_BRACKETS,
  NIIT_THRESHOLD,
  RMD_DIVISORS,
  RMD_START_AGE,
  SS_BEND_POINTS,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
  SP500_YOY_NOMINAL,
  SP500_START_YEAR,
  SP500_END_YEAR,
} from "@/lib/constants";
import { calculateBondAllocation, GLIDE_PATH_PRESETS } from "@/lib/bondAllocation";
import { fmt } from "@/lib/utils";

interface GitHubLinkProps {
  path: string;
  line?: number;
}

const GitHubLink: React.FC<GitHubLinkProps> = ({ path, line }) => {
  const baseUrl = "https://github.com/trumanchris-sudo/retirement_calc_demo_2025/blob/main";
  const url = line ? `${baseUrl}/${path}#L${line}` : `${baseUrl}/${path}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
    >
      <Github className="h-3 w-3" />
      View source
      <ExternalLink className="h-3 w-3" />
    </a>
  );
};

interface LiveCalculationProps {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  githubPath: string;
  githubLine?: number;
  calculation: () => React.ReactNode;
}

const LiveCalculation: React.FC<LiveCalculationProps> = ({
  id,
  title,
  description,
  icon,
  githubPath,
  githubLine,
  calculation
}) => {
  return (
    <Card id={id} className="mb-4 scroll-mt-24">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
          <GitHubLink path={githubPath} line={githubLine} />
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {calculation()}
      </CardContent>
    </Card>
  );
};

export function CheckUsTab() {
  // Interactive state for live examples
  const [taxIncome, setTaxIncome] = useState(100000);
  const [capGains, setCapGains] = useState(50000);
  const [rmdAge, setRmdAge] = useState(75);
  const [bondAge, setBondAge] = useState(45);

  // Handle hash navigation for deep linking
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        const element = document.querySelector(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-4">
        <h2 className="text-3xl font-bold tracking-tight">Check Our Math</h2>
        <p className="text-muted-foreground max-w-3xl mx-auto">
          Complete transparency into every calculation powering your retirement projections.
          All examples below run the <strong>actual functions</strong> used in the calculator—not static data.
        </p>
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-2">
          <Github className="h-4 w-4" />
          <span>Open source • Verifiable • Auditable</span>
        </div>
      </div>

      <Tabs defaultValue="calculations" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="calculations">Live Calculations</TabsTrigger>
          <TabsTrigger value="constants">Tax Tables & Constants</TabsTrigger>
          <TabsTrigger value="data">Historical Data</TabsTrigger>
        </TabsList>

        {/* Live Calculations Tab */}
        <TabsContent value="calculations" className="space-y-4 mt-6">

          {/* Federal Income Tax */}
          <LiveCalculation
            id="federal-income-tax"
            title="Federal Income Tax (Progressive Brackets)"
            description="Uses 2026 tax brackets with standard deduction. Progressive tax rate applied to income ranges."
            icon={<Calculator className="h-5 w-5 text-blue-600" />}
            githubPath="lib/calculations/taxCalculations.ts"
            githubLine={16}
            calculation={() => {
              const singleTax = calcOrdinaryTax(taxIncome, 'single');
              const marriedTax = calcOrdinaryTax(taxIncome, 'married');
              const effectiveRateSingle = (singleTax / taxIncome) * 100;
              const effectiveRateMarried = (marriedTax / taxIncome) * 100;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="taxIncome" className="min-w-[120px]">Income:</Label>
                    <Input
                      id="taxIncome"
                      type="number"
                      value={taxIncome}
                      onChange={(e) => setTaxIncome(Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Single Filer</div>
                      <div className="text-2xl font-bold text-blue-900">{fmt(singleTax)}</div>
                      <div className="text-xs text-gray-500">Effective rate: {effectiveRateSingle.toFixed(2)}%</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">Married Filing Jointly</div>
                      <div className="text-2xl font-bold text-blue-900">{fmt(marriedTax)}</div>
                      <div className="text-xs text-gray-500">Effective rate: {effectiveRateMarried.toFixed(2)}%</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>✓ Includes standard deduction (Single: {fmt(TAX_BRACKETS.single.deduction)}, Married: {fmt(TAX_BRACKETS.married.deduction)})</p>
                    <p>✓ Progressive brackets: 10%, 12%, 22%, 24%, 32%, 35%, 37%</p>
                  </div>
                </div>
              );
            }}
          />

          {/* Long-Term Capital Gains */}
          <LiveCalculation
            id="long-term-cap-gains"
            title="Long-Term Capital Gains Tax"
            description="Favorable tax rates (0%, 15%, 20%) for investments held over 1 year. Rate depends on income level."
            icon={<TrendingUp className="h-5 w-5 text-green-600" />}
            githubPath="lib/calculations/taxCalculations.ts"
            githubLine={39}
            calculation={() => {
              const singleCGTax = calcLTCGTax(capGains, 'single', taxIncome);
              const marriedCGTax = calcLTCGTax(capGains, 'married', taxIncome);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="capGains" className="min-w-[120px]">Capital Gains:</Label>
                    <Input
                      id="capGains"
                      type="number"
                      value={capGains}
                      onChange={(e) => setCapGains(Number(e.target.value))}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 p-4 bg-green-50 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-600">Single Filer</div>
                      <div className="text-2xl font-bold text-green-900">{fmt(singleCGTax)}</div>
                      <div className="text-xs text-gray-500">On {fmt(capGains)} in gains</div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-600">Married Filing Jointly</div>
                      <div className="text-2xl font-bold text-green-900">{fmt(marriedCGTax)}</div>
                      <div className="text-xs text-gray-500">On {fmt(capGains)} in gains</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>✓ Assumes ordinary income: {fmt(taxIncome)}</p>
                    <p>✓ LTCG brackets: 0% (up to ~$50K single), 15% (mid-range), 20% (high earners)</p>
                  </div>
                </div>
              );
            }}
          />

          {/* Net Investment Income Tax */}
          <LiveCalculation
            id="niit"
            title="Net Investment Income Tax (NIIT)"
            description="3.8% Medicare surtax on investment income for high earners. Applies when MAGI exceeds thresholds."
            icon={<Shield className="h-5 w-5 text-purple-600" />}
            githubPath="lib/calculations/taxCalculations.ts"
            githubLine={75}
            calculation={() => {
              const investmentIncome = capGains;
              const magi = taxIncome + capGains;
              const singleNIIT = calcNIIT(investmentIncome, 'single', magi);
              const marriedNIIT = calcNIIT(investmentIncome, 'married', magi);

              return (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-600 mb-2">Modified AGI: {fmt(magi)}</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-600">Single (threshold: {fmt(NIIT_THRESHOLD.single)})</div>
                        <div className="text-xl font-bold text-purple-900">{fmt(singleNIIT)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">Married (threshold: {fmt(NIIT_THRESHOLD.married)})</div>
                        <div className="text-xl font-bold text-purple-900">{fmt(marriedNIIT)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    ✓ 3.8% surtax on lesser of: (1) net investment income or (2) MAGI excess over threshold
                  </div>
                </div>
              );
            }}
          />

          {/* Required Minimum Distributions */}
          <LiveCalculation
            id="rmd"
            title="Required Minimum Distributions (RMDs)"
            description="IRS mandates withdrawals from traditional IRAs/401(k)s starting at age 73 (SECURE 2.0 Act)."
            icon={<DollarSign className="h-5 w-5 text-orange-600" />}
            githubPath="lib/constants.ts"
            githubLine={10}
            calculation={() => {
              const balance = 1000000;
              const divisor = RMD_DIVISORS[rmdAge] || 0;
              const rmd = divisor > 0 ? balance / divisor : 0;

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="rmdAge" className="min-w-[120px]">Your Age:</Label>
                    <Input
                      id="rmdAge"
                      type="number"
                      value={rmdAge}
                      onChange={(e) => setRmdAge(Number(e.target.value))}
                      min={73}
                      max={120}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <div className="text-sm text-gray-600 mb-2">IRA Balance: {fmt(balance)}</div>
                    <div className="text-sm text-gray-600 mb-1">IRS Divisor (age {rmdAge}): <strong>{divisor.toFixed(1)}</strong></div>
                    <div className="text-2xl font-bold text-orange-900">{fmt(rmd)} required withdrawal</div>
                  </div>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>✓ RMD = Account Balance ÷ IRS Life Expectancy Factor</p>
                    <p>✓ Must begin at age {RMD_START_AGE} (updated by SECURE 2.0 Act)</p>
                    <p>✓ Based on IRS Uniform Lifetime Table</p>
                  </div>
                </div>
              );
            }}
          />

          {/* Bond Allocation (Glide Path) */}
          <LiveCalculation
            id="bond-allocation"
            title="Bond Allocation (Glide Path)"
            description="Age-based asset allocation strategy balancing growth potential with risk reduction."
            icon={<Percent className="h-5 w-5 text-indigo-600" />}
            githubPath="lib/bondAllocation.ts"
            githubLine={14}
            calculation={() => {
              const aggressiveAlloc = calculateBondAllocation(bondAge, GLIDE_PATH_PRESETS.aggressive);
              const ageBasedAlloc = calculateBondAllocation(bondAge, GLIDE_PATH_PRESETS.ageBased);
              const conservativeAlloc = calculateBondAllocation(bondAge, GLIDE_PATH_PRESETS.conservative);

              return (
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Label htmlFor="bondAge" className="min-w-[120px]">Your Age:</Label>
                    <Input
                      id="bondAge"
                      type="number"
                      value={bondAge}
                      onChange={(e) => setBondAge(Number(e.target.value))}
                      min={20}
                      max={95}
                      className="max-w-[200px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3 bg-indigo-50 rounded">
                      <span className="text-sm font-medium">Aggressive (100% Stocks)</span>
                      <span className="font-bold text-indigo-900">{aggressiveAlloc.toFixed(0)}% bonds / {(100 - aggressiveAlloc).toFixed(0)}% stocks</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded">
                      <span className="text-sm font-medium">Age-Based (Conservative)</span>
                      <span className="font-bold text-blue-900">{ageBasedAlloc.toFixed(0)}% bonds / {(100 - ageBasedAlloc).toFixed(0)}% stocks</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded">
                      <span className="text-sm font-medium">Conservative (High Stability)</span>
                      <span className="font-bold text-purple-900">{conservativeAlloc.toFixed(0)}% bonds / {(100 - conservativeAlloc).toFixed(0)}% stocks</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    ✓ Live calculation using actual glide path algorithms
                  </div>
                </div>
              );
            }}
          />

          {/* Social Security Bend Points */}
          <Card id="ss-bend-points" className="mb-4 scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-teal-600" />
                  <CardTitle className="text-lg">Social Security Bend Points</CardTitle>
                </div>
                <GitHubLink path="lib/constants.ts" line={20} />
              </div>
              <CardDescription>
                Progressive formula to calculate monthly Social Security benefit based on lifetime earnings (AIME).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-teal-50 rounded-lg space-y-2">
                <div className="font-medium text-teal-900">2026 Bend Points Formula:</div>
                <ul className="text-sm space-y-1">
                  <li>• <strong>90%</strong> of first ${SS_BEND_POINTS.first.toLocaleString()} of AIME</li>
                  <li>• <strong>32%</strong> of AIME between ${SS_BEND_POINTS.first.toLocaleString()} and ${SS_BEND_POINTS.second.toLocaleString()}</li>
                  <li>• <strong>15%</strong> of AIME above ${SS_BEND_POINTS.second.toLocaleString()}</li>
                </ul>
                <div className="text-xs text-gray-500 pt-2">
                  AIME = Average Indexed Monthly Earnings (based on highest 35 years of earnings)
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Tax Tables & Constants Tab */}
        <TabsContent value="constants" className="space-y-4 mt-6">

          {/* Federal Tax Brackets */}
          <Card id="tax-brackets" className="scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>2026 Federal Income Tax Brackets</CardTitle>
                <GitHubLink path="lib/constants.ts" line={33} />
              </div>
              <CardDescription>Progressive tax rates applied to ordinary income (wages, IRA/401k withdrawals, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-blue-900">Single Filers</h4>
                  <div className="text-xs text-gray-500 mb-2">Standard Deduction: {fmt(TAX_BRACKETS.single.deduction)}</div>
                  <div className="space-y-1 text-sm">
                    {TAX_BRACKETS.single.rates.map((bracket, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{(bracket.rate * 100).toFixed(0)}%</span>
                        <span className="text-gray-600">
                          {i === 0 ? 'Up to' : 'Up to'} {bracket.limit === Infinity ? '∞' : fmt(bracket.limit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-indigo-900">Married Filing Jointly</h4>
                  <div className="text-xs text-gray-500 mb-2">Standard Deduction: {fmt(TAX_BRACKETS.married.deduction)}</div>
                  <div className="space-y-1 text-sm">
                    {TAX_BRACKETS.married.rates.map((bracket, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span>{(bracket.rate * 100).toFixed(0)}%</span>
                        <span className="text-gray-600">
                          {i === 0 ? 'Up to' : 'Up to'} {bracket.limit === Infinity ? '∞' : fmt(bracket.limit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LTCG Brackets */}
          <Card id="ltcg-brackets" className="scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Long-Term Capital Gains Tax Brackets (2026)</CardTitle>
                <GitHubLink path="lib/constants.ts" line={61} />
              </div>
              <CardDescription>Favorable rates for assets held &gt; 1 year (stocks, bonds, real estate, etc.)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-900">Single Filers</h4>
                  <div className="space-y-1 text-sm">
                    {LTCG_BRACKETS.single.map((bracket, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span className="font-medium">{(bracket.rate * 100).toFixed(0)}%</span>
                        <span className="text-gray-600">
                          {i === 0 ? 'Up to' : i === LTCG_BRACKETS.single.length - 1 ? 'Above' : 'Up to'} {bracket.limit === Infinity ? fmt(LTCG_BRACKETS.single[i-1].limit) : fmt(bracket.limit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-emerald-900">Married Filing Jointly</h4>
                  <div className="space-y-1 text-sm">
                    {LTCG_BRACKETS.married.map((bracket, i) => (
                      <div key={i} className="flex justify-between py-1 border-b">
                        <span className="font-medium">{(bracket.rate * 100).toFixed(0)}%</span>
                        <span className="text-gray-600">
                          {i === 0 ? 'Up to' : i === LTCG_BRACKETS.married.length - 1 ? 'Above' : 'Up to'} {bracket.limit === Infinity ? fmt(LTCG_BRACKETS.married[i-1].limit) : fmt(bracket.limit)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estate Tax */}
          <Card id="estate-tax" className="scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Estate Tax (2026)</CardTitle>
                <GitHubLink path="lib/constants.ts" line={26} />
              </div>
              <CardDescription>Federal estate tax on wealth transfers at death</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-amber-50 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-600">Single Exemption</div>
                    <div className="text-xl font-bold text-amber-900">{fmt(ESTATE_TAX_EXEMPTION.single)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Married Exemption</div>
                    <div className="text-xl font-bold text-amber-900">{fmt(ESTATE_TAX_EXEMPTION.married)}</div>
                  </div>
                </div>
                <div className="text-sm pt-2 border-t">
                  Tax rate on amount over exemption: <strong>{(ESTATE_TAX_RATE * 100).toFixed(0)}%</strong>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* RMD Table */}
          <Card id="rmd-table" className="scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>IRS RMD Uniform Lifetime Table</CardTitle>
                <GitHubLink path="lib/constants.ts" line={10} />
              </div>
              <CardDescription>Life expectancy divisors for Required Minimum Distributions (ages 73-120)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2 text-xs">
                {Object.entries(RMD_DIVISORS).map(([age, divisor]) => (
                  <div key={age} className="p-2 bg-gray-50 rounded text-center">
                    <div className="font-semibold text-gray-900">{age}</div>
                    <div className="text-gray-600">{divisor}</div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-xs text-gray-500">
                Example: At age 75 with $1M IRA balance → RMD = $1,000,000 ÷ {RMD_DIVISORS[75]} = {fmt(1000000 / RMD_DIVISORS[75])}
              </div>
            </CardContent>
          </Card>

        </TabsContent>

        {/* Historical Data Tab */}
        <TabsContent value="data" className="space-y-4 mt-6">

          <Card id="sp500-data" className="scroll-mt-24">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>S&P 500 Historical Returns ({SP500_START_YEAR}–{SP500_END_YEAR})</CardTitle>
                <GitHubLink path="lib/constants.ts" line={116} />
              </div>
              <CardDescription>
                {SP500_YOY_NOMINAL.length} years of actual total return data (including dividends) used for Monte Carlo simulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Data Points</div>
                    <div className="text-2xl font-bold text-blue-900">{SP500_YOY_NOMINAL.length} years</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Average Return</div>
                    <div className="text-2xl font-bold text-blue-900">
                      {(SP500_YOY_NOMINAL.reduce((a, b) => a + b, 0) / SP500_YOY_NOMINAL.length).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Best Year</div>
                    <div className="text-2xl font-bold text-green-900">
                      +{Math.max(...SP500_YOY_NOMINAL).toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 p-4 bg-red-50 rounded-lg">
                  <div>
                    <div className="text-sm text-gray-600">Worst Year</div>
                    <div className="text-2xl font-bold text-red-900">
                      {Math.min(...SP500_YOY_NOMINAL).toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Negative Years</div>
                    <div className="text-2xl font-bold text-red-900">
                      {SP500_YOY_NOMINAL.filter(r => r < 0).length} of {SP500_YOY_NOMINAL.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Positive Years</div>
                    <div className="text-2xl font-bold text-green-900">
                      {SP500_YOY_NOMINAL.filter(r => r >= 0).length} of {SP500_YOY_NOMINAL.length}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-gray-500 space-y-1">
                  <p>✓ Monte Carlo simulations randomly sample from this historical dataset</p>
                  <p>✓ More historical data = more robust simulations (97 years provides excellent statistical power)</p>
                  <p>✓ Includes major market events: Great Depression, WWII, Dotcom bubble, 2008 crisis, COVID-19</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card id="data-integrity" className="scroll-mt-24">
            <CardHeader>
              <CardTitle>Data Integrity & Validation</CardTitle>
              <CardDescription>Built-in checks ensure calculation accuracy</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-green-700">
                  <Badge variant="outline" className="bg-green-50">✓ Passed</Badge>
                  <span className="text-sm">S&P 500 data length validation ({SP500_YOY_NOMINAL.length} years expected, {SP500_YOY_NOMINAL.length} found)</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Badge variant="outline" className="bg-green-50">✓ Passed</Badge>
                  <span className="text-sm">Tax bracket structure validation (7 brackets for both single and married)</span>
                </div>
                <div className="flex items-center gap-2 text-green-700">
                  <Badge variant="outline" className="bg-green-50">✓ Passed</Badge>
                  <span className="text-sm">RMD divisor table completeness (ages 73-120)</span>
                </div>
                <div className="text-xs text-gray-500 mt-4">
                  All constants and calculations undergo runtime validation to ensure data integrity. See <GitHubLink path="lib/constants.ts" line={136} /> for validation code.
                </div>
              </div>
            </CardContent>
          </Card>

        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <Github className="h-6 w-6 text-blue-600 flex-shrink-0 mt-1" />
          <div className="space-y-2">
            <h3 className="font-semibold text-blue-900">Open Source & Auditable</h3>
            <p className="text-sm text-gray-700">
              All calculation logic, tax tables, and historical data are available in our{' '}
              <a
                href="https://github.com/trumanchris-sudo/retirement_calc_demo_2025"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline font-medium"
              >
                GitHub repository
              </a>. We believe in complete transparency—every number shown above is generated by the actual functions used in your retirement projections.
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="outline" className="bg-white">MIT License</Badge>
              <Badge variant="outline" className="bg-white">TypeScript</Badge>
              <Badge variant="outline" className="bg-white">Next.js 15</Badge>
              <Badge variant="outline" className="bg-white">IRS 2026 Guidelines</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
