/**
 * Single-call AI processing endpoint
 * Takes user's natural language responses and returns structured data + assumptions
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { ExtractedData, AssumptionWithReasoning } from '@/types/ai-onboarding';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-5-20251101';

export async function POST(request: NextRequest) {
  try {
    // Check API key
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.' },
        { status: 500 }
      );
    }

    const { conversationHistory, extractedData } = await request.json();

    console.log('[Process Onboarding] Processing conversation', {
      messageCount: conversationHistory?.length || 0,
      fieldsCollected: Object.keys(extractedData || {}).length
    });

    const systemPrompt = `You are a retirement planning assistant. The client has collected basic information from the user. Your job is to:

1. Validate and refine the data collected
2. Make reasonable assumptions for ALL missing fields
3. Generate a complete retirement plan configuration

USER PROVIDED DATA (from client-side collection):
${JSON.stringify(extractedData, null, 2)}

REQUIRED ASSUMPTIONS - Fill in ALL missing fields with reasonable defaults:

CRITICAL FIELDS (use conversation context if mentioned, otherwise assume):
- age: User's age (REQUIRED from conversation)
- maritalStatus: "single" or "married" (REQUIRED from conversation)
- annualIncome1: Annual income person 1 (REQUIRED from conversation)
- annualIncome2: Annual income person 2 (if married, REQUIRED from conversation)
- employmentType1: Assume "w2" unless self-employment mentioned
- employmentType2: Assume "w2" unless self-employment mentioned

ACCOUNT BALANCES (use user values if provided, otherwise assume $0):
- currentTraditional: Traditional IRA/401k balance
- currentRoth: Roth IRA/401k balance
- currentTaxable: Taxable brokerage balance
- currentCash: Savings/emergency fund balance

RETIREMENT ASSUMPTIONS (make reasonable assumptions):
- retirementAge: Assume 65 if not specified
- spouseAge: If married, calculate from context or assume 2 years younger than user
- state: Assume "CA" (California) if not specified - affects tax calculations

CONTRIBUTION RATES (assume standard rates based on income):
- contributionRate1Traditional: Assume 6% if income < $150k, 10% if >= $150k
- contributionRate1Roth: Assume 4% if income < $150k, 5% if >= $150k
- contributionRateTaxable: Assume 5% of income
- employerMatch1Percent: Assume 50% match up to 6% (3% effective)
- contributionRate2Traditional: Same logic as person 1 (if married)
- contributionRate2Roth: Same logic as person 1 (if married)
- employerMatch2Percent: Same as person 1 (if married)

HOUSING EXPENSES (assume reasonable monthly costs):
- monthlyMortgageRent: Assume $3000/month if married, $2000/month if single
- monthlyUtilities: Assume $300/month
- monthlyInsurancePropertyTax: Assume $500/month if married, $350/month if single

HEALTHCARE (assume standard costs):
- monthlyHealthcareP1: Assume $600/month pre-retirement, will adjust for post-retirement
- monthlyHealthcareP2: Assume $600/month if married

OTHER EXPENSES (assume reasonable defaults):
- monthlyOtherExpenses: Assume $2000/month if married, $1500/month if single

DO NOT ask for more information. Make ALL necessary assumptions with medium confidence and clear reasoning.

Return JSON with this structure:
{
  "extractedData": {
    "age": number,
    "maritalStatus": "single" | "married",
    "annualIncome1": number,
    "annualIncome2": number (if married),
    "employmentType1": "w2" | "self-employed" | "k1" | "other",
    "employmentType2": "w2" | "self-employed" | "k1" | "other" (if married),
    "currentTraditional": number,
    "currentRoth": number,
    "currentTaxable": number,
    "currentCash": number,
    "retirementAge": number,
    "spouseAge": number (if married),
    "state": string,
    "contributionRate1Traditional": number (as decimal, e.g. 0.06 for 6%),
    "contributionRate1Roth": number,
    "contributionRateTaxable": number,
    "employerMatch1Percent": number,
    "contributionRate2Traditional": number (if married),
    "contributionRate2Roth": number (if married),
    "employerMatch2Percent": number (if married),
    "monthlyMortgageRent": number,
    "monthlyUtilities": number,
    "monthlyInsurancePropertyTax": number,
    "monthlyHealthcareP1": number,
    "monthlyHealthcareP2": number (if married),
    "monthlyOtherExpenses": number
  },
  "assumptions": [
    {
      "field": "fieldName",
      "displayName": "Human Readable Name",
      "value": any,
      "reasoning": "Why this was assumed",
      "confidence": "high" | "medium" | "low",
      "userProvided": false
    }
  ],
  "missingFields": [],
  "summary": "Friendly summary of what was collected and assumed"
}

EXAMPLE:
User conversation indicates: 35, single, $100k income, $50k in 401k, $20k Roth, $10k taxable, $15k cash
Response: {
  "extractedData": {
    "age": 35,
    "maritalStatus": "single",
    "annualIncome1": 100000,
    "employmentType1": "w2",
    "currentTraditional": 50000,
    "currentRoth": 20000,
    "currentTaxable": 10000,
    "currentCash": 15000,
    "retirementAge": 65,
    "state": "CA",
    "contributionRate1Traditional": 0.06,
    "contributionRate1Roth": 0.04,
    "contributionRateTaxable": 0.05,
    "employerMatch1Percent": 0.03,
    "monthlyMortgageRent": 2000,
    "monthlyUtilities": 300,
    "monthlyInsurancePropertyTax": 350,
    "monthlyHealthcareP1": 600,
    "monthlyOtherExpenses": 1500
  },
  "assumptions": [
    {"field": "employmentType1", "displayName": "Employment Type", "value": "w2", "reasoning": "Standard W-2 employment assumed for salary", "confidence": "high", "userProvided": false},
    {"field": "retirementAge", "displayName": "Retirement Age", "value": 65, "reasoning": "Standard retirement age", "confidence": "medium", "userProvided": false},
    {"field": "state", "displayName": "State", "value": "CA", "reasoning": "California assumed for tax calculations", "confidence": "low", "userProvided": false},
    {"field": "contributionRate1Traditional", "displayName": "Traditional 401k Contribution Rate", "value": 0.06, "reasoning": "Standard 6% contribution for income level", "confidence": "medium", "userProvided": false},
    {"field": "monthlyMortgageRent", "displayName": "Monthly Housing Cost", "value": 2000, "reasoning": "Average rent for single person in California", "confidence": "medium", "userProvided": false}
  ],
  "missingFields": [],
  "summary": "Great! I've set up your retirement plan with the information you provided. I've made some reasonable assumptions about retirement age (65), contribution rates (6% traditional, 4% Roth), and monthly expenses. You can review and adjust these on the next screen."
}`;

    // Convert conversation history to Anthropic format
    const messages = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Add the extraction instruction
    messages.push({
      role: 'user',
      content: `Based on the conversation above, extract all provided data, make reasonable assumptions for ALL missing fields (retirement age, contribution rates, housing costs, healthcare, etc.), and return ONLY valid JSON with extractedData, assumptions, missingFields (empty array), and summary. No other text.`
    });

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: messages as any,
    });

    // Extract JSON from response
    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type');
    }

    // Parse JSON from Claude's response
    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }

    const result = JSON.parse(jsonMatch[0]);

    console.log('[Process Onboarding] Extraction complete:', {
      fieldsExtracted: Object.keys(result.extractedData).length,
      assumptionsMade: result.assumptions.length,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Process Onboarding] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
