import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Claude API key not configured. Add ANTHROPIC_API_KEY to .env.local to enable AI reviews.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { config, results } = body || {};

    if (!config || !results) {
      return new Response(
        JSON.stringify({ error: 'Missing config or results data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const prompt = buildReviewPrompt(config, results);

    // Stream the response for a better UX
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-opus-4-6-20250219',
            max_tokens: 1500,
            temperature: 0.3,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
          });

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ type: 'text', text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: unknown) {
    console.error('[AI Review] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate review';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function buildReviewPrompt(
  config: Record<string, unknown>,
  results: Record<string, unknown>
): string {
  const c = config;
  const r = results;

  // Format account balances
  const eolAccounts = r.eolAccounts as { taxable: number; pretax: number; roth: number } | undefined;
  const eolBreakdown = eolAccounts
    ? `Taxable $${eolAccounts.taxable.toLocaleString()}, Pre-tax $${eolAccounts.pretax.toLocaleString()}, Roth $${eolAccounts.roth.toLocaleString()}`
    : 'N/A';

  return `You are a senior retirement planning analyst reviewing the output of a tax-aware retirement calculator for a beta tester. Your job is to identify specific fixes, optimizations, and potential issues in their plan configuration and results.

INSTRUCTIONS:
- Analyze the inputs and outputs below for correctness, tax efficiency, and optimization opportunities
- Structure your review into clear sections
- Be specific and actionable — reference actual numbers from the data
- Do not use generic financial advice or disclaimers
- If something looks misconfigured or suboptimal, say so directly with the fix
- Keep total response under 800 words

PLAN CONFIGURATION:
- Age: ${c.age1}, Retirement Age: ${c.retAge}
- Marital Status: ${c.marital}
- Income (P1): $${Number(c.annualIncome1).toLocaleString()}${c.marital === 'married' ? `, Income (P2): $${Number(c.annualIncome2 || 0).toLocaleString()}` : ''}
- Starting Balances: Taxable $${Number(c.sTax).toLocaleString()} | Pre-tax $${Number(c.sPre).toLocaleString()} | Roth $${Number(c.sPost).toLocaleString()}
- Emergency Fund: $${Number(c.emergencyFund || 0).toLocaleString()}
- Contributions (P1): Taxable $${Number(c.cTax1).toLocaleString()}/yr, Pre-tax $${Number(c.cPre1).toLocaleString()}/yr, Roth $${Number(c.cPost1).toLocaleString()}/yr, Match $${Number(c.cMatch1).toLocaleString()}/yr
${c.marital === 'married' ? `- Contributions (P2): Taxable $${Number(c.cTax2).toLocaleString()}/yr, Pre-tax $${Number(c.cPre2).toLocaleString()}/yr, Roth $${Number(c.cPost2).toLocaleString()}/yr, Match $${Number(c.cMatch2).toLocaleString()}/yr` : ''}
- Return Rate: ${c.retRate}% | Inflation: ${c.infRate}% | State Tax: ${c.stateRate}%
- Return Model: ${c.retMode === 'fixed' ? `Fixed ${c.retRate}%` : 'Historical S&P 500 bootstrap'}
- Withdrawal Rate: ${c.wdRate}%
- Contribution Growth: ${c.incContrib ? `${c.incRate}%/yr` : 'Disabled'}
- Social Security: ${c.includeSS ? `Enabled (Avg earnings $${Number(c.ssIncome).toLocaleString()}, Claim age ${c.ssClaimAge})` : 'Disabled'}
- Dividend Yield: ${c.dividendYield}%

CALCULATION RESULTS:
- Years to Retirement: ${r.yrsToRet}
- Balance at Retirement (Nominal): $${Number(r.finNom).toLocaleString()}
- Balance at Retirement (Real): $${Number(r.finReal).toLocaleString()}
- Year 1 Gross Withdrawal: $${Number(r.wd).toLocaleString()} (${c.wdRate}% rate)
- Year 1 After-Tax Income: $${Number(r.wdAfter).toLocaleString()}
- Portfolio Survival: ${r.survYrs}/${r.yrsToSim} years${Number(r.survYrs) >= Number(r.yrsToSim) ? ' (FULL)' : ' (DEPLETED)'}
- End-of-Life Wealth (Nominal): $${Number(r.eol).toLocaleString()}
- End-of-Life Wealth (Real): $${Number(r.eolReal).toLocaleString()}
- Final Accounts: ${eolBreakdown}
- Total Lifetime Tax: $${Number((r.tax as { tot: number })?.tot || 0).toLocaleString()}
- Total RMDs: $${Number(r.totalRMDs || 0).toLocaleString()}
- Estate Tax: $${Number(r.estateTax || 0).toLocaleString()}
- Net Estate: $${Number(r.netEstate || 0).toLocaleString()}
${r.probRuin !== undefined ? `- Monte Carlo Failure Rate: ${(Number(r.probRuin) * 100).toFixed(1)}%` : ''}

Please provide your review in these sections:
1. CONFIGURATION CHECK — Any inputs that look wrong, missing, or unusual
2. TAX OPTIMIZATION — Roth vs pre-tax allocation, tax bracket management, RMD impact
3. WITHDRAWAL STRATEGY — Is the withdrawal rate appropriate given the portfolio and timeline?
4. RISK ASSESSMENT — Portfolio survival, Monte Carlo failure rate, sequence-of-returns risk
5. QUICK WINS — 2-3 highest-impact changes they could make right now`;
}
