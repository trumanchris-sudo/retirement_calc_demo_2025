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

    const { config, results, copilotMode, userQuestion, context, conversationHistory } = body || {};

    // Copilot mode allows questions without results (for general advice)
    if (!copilotMode && (!config || !results)) {
      return new Response(
        JSON.stringify({ error: 'Missing config or results data.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the appropriate prompt based on mode
    const prompt = copilotMode
      ? buildCopilotPrompt(userQuestion, context, conversationHistory, config, results)
      : buildReviewPrompt(config, results);

    // Stream the response for a better UX
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: copilotMode ? 1000 : 1500,
            temperature: copilotMode ? 0.5 : 0.3,
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
- Age: ${c.age1}, Retirement Age: ${c.retirementAge}
- Marital Status: ${c.marital}
- Income (P1): $${Number(c.primaryIncome).toLocaleString()}${c.marital === 'married' ? `, Income (P2): $${Number(c.spouseIncome || 0).toLocaleString()}` : ''}
- Starting Balances: Taxable $${Number(c.taxableBalance).toLocaleString()} | Pre-tax $${Number(c.pretaxBalance).toLocaleString()} | Roth $${Number(c.rothBalance).toLocaleString()}
- Emergency Fund: $${Number(c.emergencyFund || 0).toLocaleString()}
- Contributions (P1): Taxable $${Number(c.cTax1).toLocaleString()}/yr, Pre-tax $${Number(c.cPre1).toLocaleString()}/yr, Roth $${Number(c.cPost1).toLocaleString()}/yr, Match $${Number(c.cMatch1).toLocaleString()}/yr
${c.marital === 'married' ? `- Contributions (P2): Taxable $${Number(c.cTax2).toLocaleString()}/yr, Pre-tax $${Number(c.cPre2).toLocaleString()}/yr, Roth $${Number(c.cPost2).toLocaleString()}/yr, Match $${Number(c.cMatch2).toLocaleString()}/yr` : ''}
- Return Rate: ${c.retRate}% | Inflation: ${c.inflationRate}% | State Tax: ${c.stateRate}%
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

/**
 * Build a prompt for the Financial Copilot conversational interface
 */
function buildCopilotPrompt(
  userQuestion: string,
  context: string,
  conversationHistory: string,
  config: Record<string, unknown> | undefined,
  results: Record<string, unknown> | undefined
): string {
  // Format results if available
  let resultsContext = '';
  if (results) {
    const r = results;
    const eolAccounts = r.eolAccounts as { taxable: number; pretax: number; roth: number } | undefined;
    const ruinPct = r.probRuin !== undefined ? (Number(r.probRuin) * 100).toFixed(1) : 'N/A';

    resultsContext = `
CALCULATION RESULTS:
- Balance at Retirement (Nominal): $${Number(r.finNom || 0).toLocaleString()}
- Balance at Retirement (Real): $${Number(r.finReal || 0).toLocaleString()}
- Year 1 Gross Withdrawal: $${Number(r.wd || 0).toLocaleString()}
- Year 1 After-Tax Income: $${Number(r.wdAfter || 0).toLocaleString()}
- Portfolio Survival: ${r.survYrs || 0}/${r.yrsToSim || 30} years
- End-of-Life Wealth (Real): $${Number(r.eolReal || 0).toLocaleString()}
- Monte Carlo Failure Rate: ${ruinPct}%
- Total Lifetime Tax: $${Number((r.tax as { tot: number })?.tot || 0).toLocaleString()}
- Net Estate: $${Number(r.netEstate || 0).toLocaleString()}
${eolAccounts ? `- Final Account Breakdown: Taxable $${eolAccounts.taxable.toLocaleString()}, Pre-tax $${eolAccounts.pretax.toLocaleString()}, Roth $${eolAccounts.roth.toLocaleString()}` : ''}`;
  }

  return `You are an expert AI Financial Advisor embedded in a retirement planning calculator. You have full access to the user's financial data and calculation results.

PERSONALITY & TONE:
- Be warm, approachable, and encouraging like a trusted advisor
- Use conversational language, not formal financial jargon
- Be specific and reference actual numbers from their data
- Provide actionable advice, not just observations
- If they're doing well, celebrate it! If there are concerns, be direct but supportive
- Keep responses focused and under 300 words unless they ask for detail
- Use bullet points and formatting for clarity when appropriate

${context || 'No financial context available.'}
${resultsContext}

${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n` : ''}

USER'S QUESTION: ${userQuestion}

RESPONSE GUIDELINES:
1. Answer their specific question directly first
2. Reference specific numbers from their data to personalize the response
3. If relevant, suggest 1-2 actionable next steps they could take
4. If their question reveals a misunderstanding, gently correct it
5. If you suggest changes to their plan, explain the potential impact
6. Don't include generic disclaimers about seeking professional advice unless truly warranted
7. If results are not available, you can still give general guidance based on their configuration

Respond naturally as their personal financial advisor:`;
}
