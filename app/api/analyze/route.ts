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
      stateRate,
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
      totalContributions,
      returnModel
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

    // Determine longevity risk
    const longevityRisk = duration < maxDuration ?
      `⚠️ CRITICAL: Funds exhausted after ${duration} years (age ${retirementAge + duration}), but projected to live to ${retirementAge + maxDuration}` :
      `✓ Funds last full retirement (${maxDuration} years to age 95)`;

    // Calculate replacement rate
    const replacementRate = ((afterTaxIncome / (currentBalance * 0.05)) * 100).toFixed(0); // rough estimate

    // Create the comprehensive prompt for Claude
    const prompt = `Analyze this retirement plan and provide insights. Keep your response limited to 5 sentences max.  Don't use any "*" or "#" in your responses.  Format your response professionally.

Retirement Profile:
- Current Age: ${age}
- Retirement Age: ${retirementAge}
- Current Balance: $${currentBalance.toLocaleString()}
- Starting Accounts: Taxable $${startingTaxable.toLocaleString()} | Pre-tax $${startingPretax.toLocaleString()} | Roth $${startingRoth.toLocaleString()}
- Marital Status: ${maritalStatus}

Withdrawal Strategy:
- Annual Withdrawal: $${annualWithdrawal.toLocaleString()} (${withdrawalRate}% initial rate)
- After-Tax Income: $${afterTaxIncome.toLocaleString()}
- Return Model: ${returnModel}
- Assumed Return: ${returnRate}%
- Inflation Rate: ${inflationRate}%

Results:
${longevityRisk}
- Future Balance (Nominal): $${futureBalance.toLocaleString()}
- Real Balance (Today's Dollars): $${realBalance.toLocaleString()}
- Total Lifetime Tax: $${totalTax.toLocaleString()}
${accountBreakdown}
${rmdAnalysis}
${estateAnalysis}
${ssAnalysis}`;

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      temperature: 0.7,
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
  } catch (error: any) {
    console.error('Claude API Error:', error);

    // Handle specific error cases
    if (error?.status === 401) {
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
        error: error?.message || 'Failed to generate AI analysis',
        insight: 'Unable to generate AI insights at this time. Your retirement calculations are still accurate and valid.'
      },
      { status: 200 }
    );
  }
}
