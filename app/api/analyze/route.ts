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
      endOfLifeWealth,
      totalTax,
      maritalStatus,
      withdrawalRate,
      returnRate,
      inflationRate
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

    // Create the prompt for Claude
    const prompt = `You are a professional financial advisor analyzing a retirement plan. Provide concise, actionable insights in 3-4 sentences.

Retirement Plan Summary:
- Current Age: ${age}
- Retirement Age: ${retirementAge}
- Marital Status: ${maritalStatus}
- Current Balance: $${currentBalance.toLocaleString()}
- Projected Balance at Retirement: $${futureBalance.toLocaleString()} (nominal), $${realBalance.toLocaleString()} (today's dollars)
- Annual Withdrawal (Year 1): $${annualWithdrawal.toLocaleString()} (gross), $${afterTaxIncome.toLocaleString()} (after-tax)
- Withdrawal Rate: ${withdrawalRate}%
- Expected Duration: ${duration} years
- End-of-Life Wealth: $${endOfLifeWealth.toLocaleString()}
- Year 1 Total Tax: $${totalTax.toLocaleString()}
- Return Rate Assumption: ${returnRate}%
- Inflation Assumption: ${inflationRate}%

Provide:
1. Overall assessment (Is this plan strong, adequate, or needs improvement?)
2. Key strength or concern
3. One specific actionable recommendation

Keep it concise, encouraging, and practical.`;

    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 300,
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
