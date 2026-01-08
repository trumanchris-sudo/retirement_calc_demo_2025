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

    console.log('[Process Onboarding] 🔍 RECEIVED EXTRACTED DATA:', {
      retirementAge: extractedData?.retirementAge,
      age: extractedData?.age,
      maritalStatus: extractedData?.maritalStatus,
      allKeys: Object.keys(extractedData || {}),
      fullData: extractedData
    });

    const systemPrompt = `You are a retirement planning assistant. The client has collected 6 key questions from the user:

1. Age, marital status, and spouse age (if married)
2. State of residence
3. Employment type (W-2, self-employed, K-1, or other) for both spouses
4. Annual income(s) and bonus information
5. Account balances (traditional, Roth, taxable, cash)
6. Target retirement age

Your job is to:
1. **PRESERVE all user-provided values from extractedData - DO NOT override them**
2. Extract bonus details if provided (bonusInfo field)
3. Make reasonable assumptions ONLY for fields that are missing or undefined
4. Generate a complete retirement plan configuration

USER PROVIDED DATA (from client-side collection):
${JSON.stringify(extractedData, null, 2)}

⚠️ ⚠️ ⚠️ CRITICAL INSTRUCTION - READ THIS CAREFULLY ⚠️ ⚠️ ⚠️
- If a field exists in extractedData with a valid value, YOU MUST USE THAT EXACT VALUE
- DO NOT "improve" or "suggest better" values for fields the user already provided
- DO NOT override user values based on income, lifestyle, or any other factor
- ESPECIALLY FOR RETIREMENT AGE: If retirementAge is provided above, USE THAT EXACT NUMBER
- Example: If retirementAge is 65, keep it 65. Do NOT suggest 55, 60, or any other number.
- Example: If retirementAge is 70, keep it 70. Do NOT suggest 65.
- Only make assumptions for fields that are MISSING (null/undefined/not present in extractedData above)

DATA VALIDATION AND EXTRACTION:

CRITICAL FIELDS (should be provided by user - USE THESE VALUES):
- age: User's age (REQUIRED from Q1)
- spouseAge: Spouse's age if married (from Q1)
- maritalStatus: "single" or "married" (from Q1)
- state: State abbreviation (from Q2) - affects tax calculations
- employmentType1: "w2", "self-employed", "k1", or "other" (from Q3)
- employmentType2: Same options (from Q3, if married)
- annualIncome1: Annual income person 1 (from Q4)
- annualIncome2: Annual income person 2 if married (from Q4)
- retirementAge: Target retirement age (from Q6) - **NEVER override this**
- currentTraditional: Traditional IRA/401k balance (from Q5)
- currentRoth: Roth IRA/401k balance (from Q5)
- currentTaxable: Taxable brokerage balance (from Q5)
- emergencyFund: Savings/emergency fund balance (from Q5)

BONUS INFORMATION (if bonusInfo field provided):
- Parse bonusInfo to extract:
  - Annual bonus amounts for person 1 and/or person 2
  - Bonus payment month(s)
  - Whether bonus is variable or fixed
- If mentioned but no specific amounts, assume 10% of base salary

ASSUMPTIONS TO MAKE ONLY FOR MISSING FIELDS:

CONTRIBUTION RATES (assume standard rates based on income):
- contributionRate1Traditional: Assume 6% if income < $150k, 10% if >= $150k
- contributionRate1Roth: Assume 4% if income < $150k, 5% if >= $150k
- contributionRateTaxable: Assume 5% of income
- employerMatch1Percent: Assume 50% match up to 6% (3% effective)
- contributionRate2Traditional: Same logic as person 1 (if married)
- contributionRate2Roth: Same logic as person 1 (if married)
- employerMatch2Percent: Same as person 1 (if married)

HOUSING EXPENSES (SCALE WITH INCOME - use these guidelines):
- monthlyMortgageRent: Scale based on combined annual income:
  * <$100k: $1,800/month if married, $1,200/month if single
  * $100k-$200k: $3,000/month if married, $2,000/month if single
  * $200k-$400k: $4,500/month if married, $3,000/month if single
  * $400k-$700k: $7,000/month if married, $5,000/month if single
  * $700k+: $9,000/month if married, $6,500/month if single
  * Use approximately 12-16% of gross monthly income as conservative guideline
- monthlyUtilities: Scale with housing:
  * <$100k income: $250/month
  * $100k-$400k: $350/month
  * $400k+: $500/month
- monthlyInsurancePropertyTax: Scale with housing:
  * <$100k income: $400/month if married, $300/month if single
  * $100k-$400k: $700/month if married, $500/month if single
  * $400k+: $1,200/month if married, $800/month if single

HEALTHCARE (assume standard costs):
- monthlyHealthcareP1: Assume $600/month pre-retirement, will adjust for post-retirement
- monthlyHealthcareP2: Assume $600/month if married

OTHER EXPENSES (SCALE WITH INCOME AND LIFESTYLE):
- monthlyOtherExpenses: Scale based on combined annual income (groceries, dining, shopping, travel, etc.):
  * <$100k: $2,000/month if married, $1,500/month if single
  * $100k-$200k: $3,000/month if married, $2,200/month if single
  * $200k-$400k: $5,000/month if married, $3,500/month if single
  * $400k-$700k: $8,000/month if married, $5,500/month if single
  * $700k+: $12,000/month if married, $8,000/month if single
  * Conservative estimate: 12-18% of gross income for discretionary spending

DO NOT ask for more information. Make ALL necessary assumptions for MISSING fields only with medium confidence and clear reasoning.

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
    "emergencyFund": number, // Note: field name must match client (was currentCash)
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
      "userProvided": boolean (true if from conversation, false if assumed)
    }
  ],
  "missingFields": [],
  "summary": "Friendly summary of what was collected and assumed"
}

EXAMPLE 1 (Moderate Income):
User: 35, single, $100k income, $50k in 401k, $20k Roth, $10k taxable, $15k cash, retire at 65
Response: {
  "extractedData": {
    "age": 35,
    "maritalStatus": "single",
    "annualIncome1": 100000,
    "employmentType1": "w2",
    "currentTraditional": 50000,
    "currentRoth": 20000,
    "currentTaxable": 10000,
    "emergencyFund": 15000,
    "retirementAge": 65,
    "state": "CA",
    "contributionRate1Traditional": 0.06,
    "contributionRate1Roth": 0.04,
    "contributionRateTaxable": 0.05,
    "employerMatch1Percent": 0.03,
    "monthlyMortgageRent": 2000,
    "monthlyUtilities": 350,
    "monthlyInsurancePropertyTax": 500,
    "monthlyHealthcareP1": 600,
    "monthlyOtherExpenses": 2500
  },
  "assumptions": [
    {"field": "employmentType1", "displayName": "Employment Type", "value": "w2", "reasoning": "Standard W-2 employment assumed for salary", "confidence": "high", "userProvided": false},
    {"field": "retirementAge", "displayName": "Retirement Age", "value": 65, "reasoning": "User stated target retirement age", "confidence": "high", "userProvided": true},
    {"field": "monthlyMortgageRent", "displayName": "Monthly Housing Cost", "value": 2000, "reasoning": "Scaled to $100k income (24% of gross)", "confidence": "medium", "userProvided": false},
    {"field": "monthlyOtherExpenses", "displayName": "Other Monthly Expenses", "value": 2500, "reasoning": "Lifestyle expenses scaled to $100k income bracket", "confidence": "medium", "userProvided": false}
  ],
  "missingFields": [],
  "summary": "Great! I've set up your retirement plan. I've made some reasonable assumptions about contribution rates (6% traditional, 4% Roth) and monthly expenses scaled to your income level."
}

EXAMPLE 2 (High Income):
User: 40, married, $500k income (person 1), $400k income (person 2), retire at 65
Response: {
  "extractedData": {
    "age": 40,
    "maritalStatus": "married",
    "annualIncome1": 500000,
    "annualIncome2": 400000,
    "employmentType1": "w2",
    "employmentType2": "w2",
    "retirementAge": 65,
    "contributionRate1Traditional": 0.10,
    "contributionRate1Roth": 0.05,
    "monthlyMortgageRent": 9000,
    "monthlyUtilities": 500,
    "monthlyInsurancePropertyTax": 1200,
    "monthlyHealthcareP1": 600,
    "monthlyHealthcareP2": 600,
    "monthlyOtherExpenses": 12000
  },
  "assumptions": [
    {"field": "monthlyMortgageRent", "displayName": "Monthly Housing Cost", "value": 9000, "reasoning": "Scaled to $900k combined income (12% of gross monthly)", "confidence": "medium", "userProvided": false},
    {"field": "monthlyOtherExpenses", "displayName": "Other Monthly Expenses", "value": 12000, "reasoning": "Lifestyle expenses scaled to high-earner income bracket (15% of gross)", "confidence": "medium", "userProvided": false}
  ],
  "missingFields": [],
  "summary": "I've set up your retirement plan with conservative expense assumptions scaled to your income level. You can adjust these estimates in the next screen."
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

    console.log('[Process Onboarding] 🔍 RETURNING TO CLIENT:', {
      retirementAge: result.extractedData?.retirementAge,
      age: result.extractedData?.age,
      maritalStatus: result.extractedData?.maritalStatus
    });

    // Verify retirement age wasn't changed
    if (extractedData?.retirementAge && result.extractedData?.retirementAge !== extractedData.retirementAge) {
      console.error('[Process Onboarding] ❌❌❌ ERROR: AI CHANGED RETIREMENT AGE!', {
        userProvided: extractedData.retirementAge,
        aiReturned: result.extractedData.retirementAge
      });
      // Override it back to user value
      result.extractedData.retirementAge = extractedData.retirementAge;
      console.log('[Process Onboarding] ✅ CORRECTED: Forcing retirement age back to', extractedData.retirementAge);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('[Process Onboarding] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
