"use client"

import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  LIFE_EXP,
  RMD_START_AGE,
  NIIT_THRESHOLD,
  ESTATE_TAX_EXEMPTION,
  ESTATE_TAX_RATE,
  SS_BEND_POINTS,
} from "@/lib/constants";

export interface MathTabProps {
  marital: 'single' | 'married';
  ltcProbability: number;
  ltcDuration: number;
  ltcAnnualCost: number;
  irmaaThresholdSingle: number;
  irmaaThresholdMarried: number;
}

export function MathTab({
  marital,
  ltcProbability,
  ltcDuration,
  ltcAnnualCost,
  irmaaThresholdSingle,
  irmaaThresholdMarried,
}: MathTabProps) {
  return (
    <Card className="math-print-section print-section print-page-break-before">
      <CardHeader>
        <CardTitle>Math</CardTitle>
        <CardDescription>Understanding the calculations behind your retirement projections</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="space-y-6 text-sm leading-relaxed pt-4 max-w-full break-words">
          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Overview</h3>
            <p className="text-gray-700 mb-4">
              This calculator uses a comprehensive, tax-aware simulation to project your retirement finances.
              It models two distinct phases: the <strong>accumulation phase</strong> (from now until retirement)
              and the <strong>drawdown phase</strong> (from retirement until age {LIFE_EXP}). All calculations
              account for compound growth, inflation, taxes, and required minimum distributions.
            </p>

            <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-gray-700">
                <strong>Filing Status:</strong> This calculator is configurable for both single and married filing status.
                Tax calculations automatically adjust based on your selection, using appropriate brackets
                (single: $15K standard deduction, married: $30K), NIIT thresholds (single: $200K, married: $250K),
                and IRMAA thresholds (single: $109K, married: $218K). Select your filing status in the Configure tab
                to ensure accurate tax projections.
              </p>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Accumulation Phase (Pre-Retirement)</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Growth Calculation</h4>
                <p className="text-gray-700 mb-2">
                  Each year, your account balances grow according to the selected return model:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li><strong>Fixed Return:</strong> All accounts grow by a constant rate (e.g., 9.8%) each year: Balance<sub>year+1</sub> = Balance<sub>year</sub> x (1 + r)</li>
                  <li><strong>Random Walk:</strong> Returns are randomly sampled from 97 years of historical S&P 500 data (1928-2024), using a seeded pseudo-random number generator for reproducibility. Each year gets a different historical return, bootstrapped with replacement.</li>
                  <li><strong>Truly Random (Monte Carlo):</strong> Runs 1,000 independent simulations, each with different sequences of returns randomly sampled from 97 years of S&P 500 historical data (1928-2024, including Great Depression, stagflation, dot-com crash, 2008 crisis). Reports conservative average outcomes (P25-P50 percentile) and calculates probability of portfolio depletion based on actual simulation results - captures real sequence risk without idealized assumptions.</li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Mid-Year Contributions</h4>
                <p className="text-gray-700">
                  Annual contributions are assumed to occur mid-year on average. To account for partial-year growth,
                  contributions are multiplied by (1 + (g - 1) x 0.5), where g is the year's growth factor. This
                  gives contributions roughly half a year of growth, which is more realistic than assuming all
                  contributions happen at year-end or year-start.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Contribution Increases</h4>
                <p className="text-gray-700">
                  If enabled, annual contributions increase by the specified percentage each year to model salary
                  growth and increasing savings capacity: Contribution<sub>year+1</sub> = Contribution<sub>year</sub> x (1 + increase_rate).
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Account Types</h4>
                <p className="text-gray-700 mb-2">The calculator tracks three separate account types:</p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li><strong>Taxable (Brokerage):</strong> Subject to long-term capital gains tax on withdrawals. We track your cost basis (total contributions) and only the gains are taxed.</li>
                  <li><strong>Pre-Tax (401k/Traditional IRA):</strong> Contributions grow tax-deferred. All withdrawals are taxed as ordinary income. Subject to Required Minimum Distributions (RMDs) starting at age {RMD_START_AGE}.</li>
                  <li><strong>Post-Tax (Roth):</strong> Contributions grow tax-free. <strong>Qualified withdrawals</strong> (age 59.5 AND account open 5+ years) are completely tax-free (no taxes, no RMDs). This calculator assumes you've met the 5-year rule by retirement and all withdrawals are qualified.</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Inflation Adjustments</h3>
            <p className="text-gray-700 mb-2">
              To show purchasing power, we convert nominal (future) dollars to real (today's) dollars using:
            </p>
            <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2 text-gray-800">
              Real Value = Nominal Value / (1 + inflation_rate)<sup>years</sup>
            </p>
            <p className="text-gray-700">
              For example, if you have $1,000,000 in 30 years and inflation averages 2.6% annually, the real value
              is $1,000,000 / (1.026)<sup>30</sup> = approximately $462,000 in today's purchasing power.
            </p>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Drawdown Phase (Post-Retirement)</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Withdrawal Strategy</h4>
                <p className="text-gray-700 mb-2">
                  The first year's withdrawal is calculated as a percentage of your total retirement balance
                  (e.g., 3.5% for a conservative approach, 4% for the classic "4% rule"). In subsequent years,
                  the withdrawal amount increases with inflation to maintain constant purchasing power:
                </p>
                <p className="font-mono text-sm bg-gray-100 p-3 rounded text-gray-800">
                  Withdrawal<sub>year+1</sub> = Withdrawal<sub>year</sub> x (1 + inflation_rate)
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Proportional Withdrawal</h4>
                <p className="text-gray-700">
                  Withdrawals are taken proportionally from all three account types based on their current
                  balances. If one account runs out, the shortfall is automatically drawn from the remaining
                  accounts. This creates a natural tax diversification strategy.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Tax Calculation</h4>
                <p className="text-gray-700 mb-2">
                  Each year's withdrawal is subject to multiple layers of taxation:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Ordinary Income Tax:</strong> Pre-tax withdrawals are taxed using the federal
                    progressive tax brackets ({marital === "married" ? "married" : "single"} filing status)
                    after applying the standard deduction. Brackets range from 10% to 37%.
                  </li>
                  <li>
                    <strong>Long-Term Capital Gains Tax:</strong> Gains from taxable account withdrawals are
                    taxed at preferential LTCG rates (0%, 15%, or 20%) based on your total income. Only the
                    gains portion is taxed - your original contributions (basis) come out tax-free.
                  </li>
                  <li>
                    <strong>Net Investment Income Tax (NIIT):</strong> An additional 3.8% tax on investment
                    income (capital gains) if your modified AGI exceeds ${(NIIT_THRESHOLD[marital] / 1000).toFixed(0)}K.
                  </li>
                  <li>
                    <strong>State Income Tax:</strong> A flat percentage applied to all taxable income if you
                    specify a state tax rate (varies by state, 0% to ~13%).
                  </li>
                  <li>
                    <strong>Roth Withdrawals:</strong> Completely tax-free! This is the "tax-free income"
                    advantage of Roth accounts.
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Required Minimum Distributions (RMDs)</h4>
                <p className="text-gray-700 mb-2">
                  Starting at age {RMD_START_AGE}, the IRS requires you to withdraw a minimum amount from
                  pre-tax accounts each year. The RMD is calculated as:
                </p>
                <p className="font-mono text-sm bg-gray-100 p-3 rounded mb-2 text-gray-800">
                  RMD = Pre-Tax Balance / Divisor
                </p>
                <p className="text-gray-700 mb-2">
                  The divisor comes from the IRS Uniform Lifetime Table (e.g., 26.5 at age 73, decreasing each
                  year). If your RMD exceeds your spending needs, the excess is withdrawn, taxed, and
                  reinvested in your taxable account (with the after-tax amount becoming new basis).
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Social Security Benefits</h4>
                <p className="text-gray-700 mb-2">
                  If enabled, Social Security benefits are calculated using the 2026 bend point formula:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>90% of Average Indexed Monthly Earnings (AIME) up to ${SS_BEND_POINTS.first.toLocaleString()}/month</li>
                  <li>32% of AIME between ${SS_BEND_POINTS.first.toLocaleString()} and ${SS_BEND_POINTS.second.toLocaleString()}/month</li>
                  <li>15% of AIME above ${SS_BEND_POINTS.second.toLocaleString()}/month</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  This gives your Primary Insurance Amount (PIA). If you claim before Full Retirement Age (FRA),
                  benefits are reduced by 5/9 of 1% per month for the first 36 months, then 5/12 of 1% for each
                  additional month. If you delay past FRA, benefits increase by 2/3 of 1% per month (8% per year).
                  SS benefits reduce the amount you need to withdraw from your portfolio.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Continuous Growth</h4>
                <p className="text-gray-700">
                  Your remaining account balances continue to grow each year according to the same return model
                  used in the accumulation phase. Growth is applied <em>before</em> withdrawals each year, so
                  your money keeps working for you throughout retirement.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Healthcare Costs</h4>
                <p className="text-gray-700 mb-3">
                  <strong>Important:</strong> Healthcare costs are withdrawn <strong>in addition to</strong> your base retirement
                  spending. For example: $80K base withdrawal + $5K Medicare + $4K IRMAA + potential $80K/year LTC = significant
                  additional portfolio drain. These are not included within your withdrawal rate - they stack on top.
                </p>
                <p className="text-gray-700 mb-2">
                  The calculator models the following age-based healthcare expenses:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Medicare Premiums:</strong> Starting at age 65, monthly Medicare Part B and Part D
                    premiums (default $400/month) are added to annual expenses. These premiums inflate at the
                    medical inflation rate (typically 5.5%, higher than general inflation) to reflect rising
                    healthcare costs.
                  </li>
                  <li>
                    <strong>IRMAA Surcharges:</strong> Income-Related Monthly Adjustment Amounts apply when your
                    total income (Social Security + RMDs + other withdrawals) exceeds thresholds (default ${irmaaThresholdSingle.toLocaleString()}
                    {marital === "married" && `/${irmaaThresholdMarried.toLocaleString()}`}). An additional surcharge
                    (default $350/month) is added to Medicare premiums, also inflating at the medical rate.
                  </li>
                  <li>
                    <strong>Long-Term Care:</strong> Models the risk of needing expensive care (nursing home,
                    assisted living, home health). Based on probability (default {ltcProbability}%), duration
                    (default {ltcDuration} years), and annual cost (default ${(ltcAnnualCost / 1000).toFixed(0)}K/year).
                    In Monte Carlo mode, each simulation randomly determines if/when LTC is needed. Costs inflate
                    at the medical rate.
                  </li>
                </ul>
                <p className="text-gray-700 mt-2">
                  These healthcare costs are withdrawn from your portfolio just like regular expenses and can
                  significantly impact longevity, especially if multiple expensive healthcare events occur or
                  if IRMAA surcharges apply for many years.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Estate Planning</h3>

            <div className="space-y-4">
              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">End-of-Life Wealth</h4>
                <p className="text-gray-700">
                  If your accounts last until age {LIFE_EXP}, any remaining balance is your end-of-life (EOL)
                  wealth, which becomes your estate. This represents money you can pass to heirs or charity.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Estate Tax</h4>
                <p className="text-gray-700 mb-3">
                  Under the One Big Beautiful Bill Act (OBBBA, July 2025), the federal estate tax exemption is permanently set at
                  ${((marital === 'married' ? ESTATE_TAX_EXEMPTION.married : ESTATE_TAX_EXEMPTION.single) / 1_000_000).toFixed(0)}
                  million per {marital === 'married' ? 'couple' : 'individual'} for 2026 and is indexed annually for inflation starting
                  in 2027. Estates exceeding this threshold are subject to a 40% federal estate tax on the amount above the exemption.
                  Your heirs receive the net estate after this tax.
                </p>

                <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-950/30 border-l-4 border-blue-500 rounded">
                  <p className="text-gray-700">
                    <strong>NOTE:</strong> The previous sunset provision that would have reduced the exemption to ~$7M has been eliminated.
                    While the federal exemption has increased, state-level estate taxes may still apply at lower thresholds. This is a simplified
                    calculation that doesn't account for spousal transfers, portability elections, trusts, or state estate taxes. Early gifting
                    remains a powerful tool to freeze asset values and remove future appreciation from your taxable estate.
                  </p>
                </div>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Generational Wealth Model</h4>
                <p className="text-gray-700 mb-2">
                  If enabled, the generational model simulates how long your estate could support future
                  beneficiaries (children, grandchildren, etc.) with annual payouts in constant 2026 dollars:
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-700">
                  <li>The net estate (after estate tax) is deflated to 2026 purchasing power</li>
                  <li>
                    <strong>Real Returns:</strong> For generational projections, we convert nominal returns to real returns
                    by subtracting inflation using the Fisher equation: Real Return = (1 + Nominal) / (1 + Inflation) - 1.
                    For example: 9.8% nominal - 2.6% inflation = ~7.0% real return used in perpetual threshold calculations.
                    This ensures all values stay in constant 2026 dollars.
                  </li>
                  <li>Only beneficiaries at or above the minimum distribution age receive payouts in constant 2026 dollars</li>
                  <li>Beneficiaries age each year; those reaching max lifespan exit the model</li>
                  <li>
                    <strong>Fertility Window Model:</strong> Beneficiaries within the fertility window (default ages
                    25-35) gradually produce children over those years. The total fertility rate (default 2.1 children
                    per person) is distributed evenly across the fertile years. For example, with a 10-year window and
                    2.1 total fertility, each person produces 0.21 children per year while fertile. This creates realistic,
                    gradual population growth rather than sudden generational "waves."
                  </li>
                  <li>
                    <strong>Population Growth:</strong> At replacement level (2.1 children per person), the population
                    stays constant. Above 2.1, it grows exponentially; below 2.1, it declines. The calculator shows
                    the perpetual threshold: the maximum annual distribution rate equals real return minus population
                    growth rate (e.g., 7.2% real return - 2.7% population growth = 4.5% sustainable).
                  </li>
                  <li>Simulation continues until funds are exhausted or 10,000 years (effectively perpetual)</li>
                </ul>
                <p className="text-gray-700 mt-2">
                  In Monte Carlo mode, the model runs simulations at the P25, P50, and P75 estate values and reports
                  perpetual success probability (75%, 50%, or 25% success rate). This models a "dynasty trust" or "perpetual legacy" scenario and helps
                  you understand whether your wealth could support generations indefinitely. Quick presets
                  (Conservative/Moderate/Aggressive) provide starting points for different legacy goals.
                </p>
              </div>

              <div>
                <h4 className="text-lg font-semibold mb-2 text-blue-800">Computational Optimization</h4>
                <p className="text-gray-700 mb-2">
                  To provide instant results without sacrificing accuracy, the calculator uses smart shortcuts:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>
                    <strong>Perpetual Viability Check:</strong> Before simulating 10,000 years, we calculate the "perpetual
                    threshold" - the maximum sustainable distribution rate (Real Return - Population Growth Rate). If your
                    actual distribution rate is below 95% of this threshold, the portfolio is mathematically guaranteed to
                    last forever, so we skip the year-by-year simulation.
                  </li>
                  <li>
                    <strong>Decade Chunking:</strong> Instead of calculating 10,000 individual years, we simulate in 10-year
                    blocks. This 10x speedup still captures the trajectory accurately. When a portfolio approaches depletion
                    or uncertainty, we automatically zoom in to annual precision for the final decades.
                  </li>
                  <li>
                    <strong>Early Termination:</strong> If after 1,000 years a portfolio is still growing strongly (&gt;3%
                    annually), we extrapolate rather than continuing to year 10,000. The outcome is already clear.
                  </li>
                </ul>
                <p className="text-gray-700 mt-2">
                  These optimizations reduce calculation time by 90-99% (from 5-15 seconds to under 1 second) while
                  maintaining mathematical accuracy. The perpetual threshold formula is derived from compound growth theory,
                  and chunking is simply aggregation - your results are identical to year-by-year simulation, just delivered
                  faster.
                </p>
                <p className="text-gray-700 mt-2">
                  <strong>Why This Matters:</strong> Generational wealth projections involve millions of potential calculations
                  (3 scenarios x 10,000 years x complex demographic modeling). Without optimization, this would freeze your
                  browser. With these shortcuts, you get instant feedback while exploring different legacy scenarios.
                </p>
              </div>
            </div>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Limitations & Assumptions</h3>

            <ul className="list-disc pl-6 space-y-2 text-gray-700">
              <li>
                <strong>Tax Law Stability:</strong> Assumes current (2026) tax brackets, standard deductions,
                RMD rules, and estate tax exemptions remain constant. Tax laws frequently change. This calculator
                assumes the permanent $15M exemption enacted by the OBBBA (July 2025) remains in effect and is
                not repealed by future legislation.
              </li>
              <li>
                <strong>Sequence-of-Returns Risk:</strong> In Truly Random (Monte Carlo) mode with 1,000 simulations,
                sequence risk is fully captured - bad early returns can deplete portfolios even if average returns are
                good. Fixed and Random Walk modes don't model this risk as thoroughly. The percentile bands (10th, 50th, 90th for charts; 25th, 50th, 75th for success rates)
                show the range of outcomes from sequence variation.
              </li>
              <li>
                <strong>Simplified Withdrawal Strategy:</strong> Uses proportional withdrawals from all accounts.
                More sophisticated strategies (like draining taxable first, then pre-tax, then Roth) may be more
                tax-efficient but are not modeled here. The proportional approach provides automatic rebalancing.
              </li>
              <li>
                <strong>Healthcare Cost Estimates:</strong> Medicare premiums, IRMAA surcharges, and long-term care
                costs use national averages. Actual costs vary significantly by location, health status, and
                insurance coverage. The model assumes continuous Medicare coverage and doesn't account for gaps
                before age 65 or supplemental insurance (Medigap) costs.
              </li>
              <li>
                <strong>Fixed Withdrawal Rate:</strong> Uses inflation-adjusted constant dollar withdrawals plus
                healthcare costs. Real retirees often adjust spending based on portfolio performance, market
                conditions, and changing life circumstances (travel, healthcare events, gifts to family).
              </li>
              <li>
                <strong>Single Life Expectancy:</strong> Projects to age {LIFE_EXP} for the older spouse.
                Some households may need to plan for longer lifespans. The generational wealth model allows
                customization of maximum lifespan (up to age 100).
              </li>
              <li>
                <strong>No Pension Income:</strong> Doesn't model traditional pensions, annuities, or rental income.
                These could be approximated by adjusting your withdrawal needs downward or using the Social Security
                field for other guaranteed income sources.
              </li>
              <li>
                <strong>Generational Model Simplifications:</strong> The dynasty trust model assumes constant real
                returns, uniform fertility patterns, and no external income for beneficiaries. It doesn't model
                legal trust structures, trustee fees, or different payout strategies for different generations.
              </li>
            </ul>
          </section>

          <Separator />

          <section>
            <h3 className="text-xl font-semibold mb-3 text-blue-900">Data Sources</h3>
            <ul className="list-disc pl-6 space-y-1 text-gray-700">
              <li><strong>S&P 500 Returns:</strong> Historical total return data (1928-2024, 97 years) used for random walk and Monte Carlo simulations</li>
              <li><strong>Tax Brackets:</strong> 2026 federal ordinary income tax brackets (IRS)</li>
              <li><strong>LTCG Brackets:</strong> 2026 long-term capital gains tax rates (IRS)</li>
              <li><strong>RMD Table:</strong> IRS Uniform Lifetime Table (Publication 590-B)</li>
              <li><strong>Social Security:</strong> 2026 bend points and claiming adjustment factors (SSA)</li>
              <li><strong>Estate Tax:</strong> OBBBA permanent exemption ($15M individual / $30M married for 2026, indexed annually for inflation starting 2027) and 40% rate</li>
              <li><strong>Medicare & IRMAA:</strong> 2026 Part B/D premiums and income thresholds (CMS)</li>
              <li><strong>Long-Term Care:</strong> National average costs based on Genworth 2024 Cost of Care Survey</li>
              <li><strong>Medical Inflation:</strong> Historical healthcare cost growth trends (Kaiser Family Foundation, CMS)</li>
              <li><strong>Net Worth Data:</strong> Federal Reserve 2022 Survey of Consumer Finances (released Oct 2023)</li>
              <li><strong>Fertility Rates:</strong> U.S. replacement-level fertility (2.1) and demographic modeling standards (CDC, Census Bureau)</li>
            </ul>
          </section>

          <div className="mt-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Disclaimer:</strong> This calculator is for educational and planning purposes only. It does
              not constitute financial, tax, or legal advice. Consult with qualified professionals before making
              significant financial decisions. Past performance (historical returns) does not guarantee future results.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
