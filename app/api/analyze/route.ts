import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      age,
      retirementAge,
      currentBalance,
      futureBalance,
      realBalance,
      annualWithdrawal,
      afterTaxIncome,
      duration,
      maxDuration,
      endOfLifeWealth,
      totalTax,
      maritalStatus,
      withdrawalRate,
      returnRate,
      inflationRate,
      totalRMDs,
      estateTax,
      netEstate,
      eolAccounts,
      includeSS,
      ssIncome,
      ssClaimAge,
      startingTaxable,
      startingPretax,
      startingRoth,
      returnModel,
      userQuestion
    } = body;

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: 'Claude API key not configured. Please add ANTHROPIC_API_KEY to your environment variables.',
          insight: 'AI analysis unavailable. To enable Claude AI insights:\n\n1. Get an API key from console.anthropic.com\n2. Add ANTHROPIC_API_KEY=your-key to .env.local\n3. Restart the development server\n\nYour retirement calculations are still accurate!'
        },
        { status: 200 }
      );
    }

    // Build account breakdown text
    let accountBreakdown = '';
    if (eolAccounts) {
      accountBreakdown = `
End-of-Life Account Balances:
- Taxable Brokerage: $${eolAccounts.taxable.toLocaleString()}
- Pre-tax (Traditional IRA/401k): $${eolAccounts.pretax.toLocaleString()}
- Roth IRA: $${eolAccounts.roth.toLocaleString()}`;
    }

    // Build RMD analysis
    const rmdAnalysis = totalRMDs > 0 ? `
Required Minimum Distributions (Age 73+):
- Total RMDs Over Retirement: $${totalRMDs.toLocaleString()}
- These mandatory withdrawals from pre-tax accounts may push you into higher tax brackets` : '';

    // Build estate tax analysis
    const estateAnalysis = estateTax > 0 ? `
Estate Tax Impact:
- Gross Estate: $${endOfLifeWealth.toLocaleString()}
- Estate Tax (40% over $13.99M): $${estateTax.toLocaleString()}
- Net Estate to Heirs: $${netEstate.toLocaleString()}
- Effective Tax Rate on Estate: ${((estateTax / endOfLifeWealth) * 100).toFixed(1)}%` : '';

    // Build Social Security analysis
    const ssAnalysis = includeSS ? `
Social Security Benefits:
- Average Career Earnings: $${ssIncome.toLocaleString()}/year
- Claiming Age: ${ssClaimAge}
- Benefits reduce portfolio withdrawal needs starting at age ${ssClaimAge}` : '';

    // Build return model description
    const returnModelDesc = returnModel === 'fixed'
      ? `- Return Model: Fixed\n- Assumed Return: ${returnRate}%`
      : `- Return Model: Historical S&P 500 total-return bootstrap (1928–2024)`;

    // Only process Q&A requests - auto-generated insights are now handled client-side
    if (!userQuestion || !userQuestion.trim()) {
      return NextResponse.json(
        {
          error: 'No question provided',
          insight: 'This API endpoint is now only for Q&A. Auto-generated insights are handled locally.'
        },
        { status: 400 }
      );
    }

    // Comprehensive prompt with validation framework
    const prompt = `You are generating the Retirement Plan Analysis section for a tax-aware retirement calculator.
Before writing any analysis, you must perform the required steps below in strict order using ONLY
the data provided. Do not use assumptions, heuristics, or financial safety scripts.

REQUIRED ANALYSIS STEPS (FOLLOW EXACTLY):

1. Extract Inputs - Parse all user inputs:
   - Age: ${age}, Retirement Age: ${retirementAge}
   - Current balances: Taxable $${startingTaxable.toLocaleString()}, Pre-tax $${startingPretax.toLocaleString()}, Roth $${startingRoth.toLocaleString()}
   - Withdrawal rate: ${withdrawalRate}%
   - Inflation rate: ${inflationRate}%
   - Return model: ${returnModel === 'fixed' ? `Fixed at ${returnRate}%` : 'Historical S&P 500 bootstrap (1928–2024)'}

2. Reconstruct Core Calculations - Validate the math:
   - Future Balance (Nominal): $${futureBalance.toLocaleString()}
   - Real Balance (Today's Dollars): $${realBalance.toLocaleString()}
   - Year 1 Withdrawal: $${annualWithdrawal.toLocaleString()} (${withdrawalRate}% of balance)
   - After-Tax Income: $${afterTaxIncome.toLocaleString()}
   - Total Lifetime Tax: $${totalTax.toLocaleString()}${totalRMDs > 0 ? `
   - Total RMDs: $${totalRMDs.toLocaleString()}` : ''}${estateTax > 0 ? `
   - Estate Tax: $${estateTax.toLocaleString()}
   - Net Estate: $${netEstate.toLocaleString()}` : ''}

3. Evaluate Model Outputs:
   - Recognize that long-horizon compounding creates right-skewed distributions
   - Large end-of-life wealth projections are NORMAL under high-return historical bootstraps
   - Use provided percentiles and failure probability to drive insight
   - Do NOT label outputs as "unrealistic" unless numbers contradict inputs

4. Identify True Errors ONLY if They Exist:
   Valid reasons to flag issues:
   - FV does not match return assumptions
   - Real vs nominal conversion incorrect
   - Tax ordering not applied correctly

   Invalid reasons (do NOT use):
   - Numbers appear large or unusual
   - Generic advisor caution
   - Heuristics from typical calculators

5. Generate Plan Analysis:
   Your analysis must:
   - Be factual and grounded in validated math
   - Use actual extracted values
   - Identify key drivers (return rate, inflation, contributions, withdrawal rate)
   - Provide actionable insights based only on verified model behavior
   - Avoid ALL financial-advisor boilerplate (e.g., "Consult your advisor")

6. Tone Requirements:
   - Analytical, numerical, precise
   - No paternalistic language
   - No safety disclaimers
   - No statements based purely on intuition
   - Respect the model's intentional design and the user's assumptions

USER QUESTION: ${userQuestion}

RETIREMENT PROFILE:
- Current Age: ${age}
- Retirement Age: ${retirementAge}
- Marital Status: ${maritalStatus}
- Current Balance: $${currentBalance.toLocaleString()}
- Starting Accounts: Taxable $${startingTaxable.toLocaleString()} | Pre-tax $${startingPretax.toLocaleString()} | Roth $${startingRoth.toLocaleString()}

WITHDRAWAL STRATEGY:
- Annual Withdrawal: $${annualWithdrawal.toLocaleString()} (${withdrawalRate}% initial rate)
- After-Tax Income: $${afterTaxIncome.toLocaleString()}
${returnModelDesc}
- Inflation Rate: ${inflationRate}%

PROJECTED RESULTS:
- ${duration >= maxDuration ? `✓ Funds last full retirement (${maxDuration} years to age ${retirementAge + maxDuration})` : `⚠️ CRITICAL: Funds exhausted after ${duration} years (age ${retirementAge + duration}), but projected to live to ${retirementAge + maxDuration}`}
- Future Balance (Nominal): $${futureBalance.toLocaleString()}
- Real Balance (Today's Dollars): $${realBalance.toLocaleString()}
- Total Lifetime Tax: $${totalTax.toLocaleString()}${totalRMDs > 0 ? `
- Total RMDs Over Retirement: $${totalRMDs.toLocaleString()}` : ''}${estateTax > 0 ? `
- Estate Tax: $${estateTax.toLocaleString()}
- Net Estate to Heirs: $${netEstate.toLocaleString()}` : ''}${eolAccounts ? `
- Final Accounts: Taxable $${eolAccounts.taxable.toLocaleString()}, Pre-tax $${eolAccounts.pretax.toLocaleString()}, Roth $${eolAccounts.roth.toLocaleString()}` : ''}${includeSS ? `
- Social Security: Avg earnings $${ssIncome.toLocaleString()}/year, Claiming age ${ssClaimAge}` : ''}

Provide a concise, specific answer focused on their question. Keep your response under 250 words. Don't use markdown formatting (* or #). Be direct and actionable. Follow all analysis steps above before responding.`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.5,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract the text from Claude's response
    const insight = message.content[0].type === 'text'
      ? message.content[0].text
      : 'Unable to generate analysis.';

    return NextResponse.json({ insight });
  } catch (error: unknown) {
    console.error('Claude API Error:', error);

    // Handle specific error cases
    const errorObj = error as { status?: number; message?: string };
    if (errorObj?.status === 401) {
      return NextResponse.json(
        {
          error: 'Invalid API key',
          insight: 'Your Claude API key appears to be invalid. Please check your ANTHROPIC_API_KEY in .env.local'
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: errorObj?.message || 'Failed to generate AI analysis',
        insight: 'Unable to generate AI insights at this time. Your retirement calculations are still accurate and valid.'
      },
      { status: 200 }
    );
  }
}
