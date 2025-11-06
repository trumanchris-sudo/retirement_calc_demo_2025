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
    const prompt = `You are a Certified Financial Planner (CFP) providing a comprehensive retirement plan analysis. Analyze this plan in depth and provide strategic, actionable insights.

## CLIENT PROFILE
- Current Age: ${age}
- Retirement Age: ${retirementAge} (${retirementAge - age} years until retirement)
- Marital Status: ${maritalStatus}

## CURRENT FINANCIAL POSITION
- Total Current Balance: $${currentBalance.toLocaleString()}
  - Taxable: $${startingTaxable.toLocaleString()}
  - Pre-tax (Traditional): $${startingPretax.toLocaleString()}
  - Roth: $${startingRoth.toLocaleString()}

## ACCUMULATION PHASE PROJECTION
- Total Contributions (from now to retirement): $${totalContributions.toLocaleString()}
- Return Model: ${returnModel === 'randomWalk' ? 'Monte Carlo (S&P 500 bootstrap)' : 'Fixed rate'}
- Assumed Return: ${returnRate}% ${returnModel === 'randomWalk' ? '(historical average)' : 'annually'}
- Inflation Assumption: ${inflationRate}%
- Projected Balance at Age ${retirementAge}: $${futureBalance.toLocaleString()} (nominal), $${realBalance.toLocaleString()} (today's dollars)

## RETIREMENT PHASE (AGE ${retirementAge}-95)
- Withdrawal Strategy: ${withdrawalRate}% rule (inflation-adjusted)
- Year 1 Gross Withdrawal: $${annualWithdrawal.toLocaleString()}
- Year 1 After-Tax Income: $${afterTaxIncome.toLocaleString()} (today's dollars)
- First Year Tax Burden: $${totalTax.toLocaleString()} (${((totalTax / annualWithdrawal) * 100).toFixed(1)}% effective rate)
${ssAnalysis}
${rmdAnalysis}

## LONGEVITY ANALYSIS
${longevityRisk}
- End-of-Life Wealth (Age 95): $${endOfLifeWealth.toLocaleString()}
${accountBreakdown}

## ESTATE PLANNING
${estateAnalysis || '- Estate value below $13.99M exemption threshold (no federal estate tax)'}

## TAX EFFICIENCY
- Federal Income Tax + LTCG + NIIT + State (${stateRate}%)
- Tax-advantaged account mix influences tax burden in retirement
- Year 1 effective tax rate: ${((totalTax / annualWithdrawal) * 100).toFixed(1)}%

---

As their CFP, provide a comprehensive analysis covering:

1. **Overall Plan Viability** (2-3 sentences): Assess whether this plan is strong, adequate, or needs significant revision. Consider withdrawal sustainability, longevity risk, and tax efficiency.

2. **Key Strengths** (2-3 points): What is this person doing right? Be specific about their smart decisions.

3. **Critical Risks or Concerns** (2-3 points): What are the biggest threats to this plan's success? Be direct and honest.

4. **Tax Optimization Opportunities** (2-3 specific recommendations): Based on their account allocation and RMD situation, what tax-saving strategies should they consider? (e.g., Roth conversions, tax-bracket management, etc.)

5. **Action Items** (3-5 prioritized recommendations): What should they do immediately, within 1 year, and before retirement? Be tactical and specific.

Write in a professional but encouraging tone. Be direct about risks but solution-oriented. Format with clear headers and bullet points for readability.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
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
