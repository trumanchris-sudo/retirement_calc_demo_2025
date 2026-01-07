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

    const { conversationText } = await request.json();

    console.log('[Process Onboarding] Processing conversation');

    const systemPrompt = `You are a financial planning data extraction assistant. Your job is to:

1. Extract ONLY clearly stated retirement planning data from user responses
2. DO NOT guess or assume values for critical fields when unclear
3. Return structured data with reasoning and list what's still needed

CRITICAL RULE - DO NOT GUESS THESE FIELDS:
- state: US state (only if user mentions it)
- spouseAge: Spouse age (only if married AND user provides it)
- annualIncome2: Spouse income (only if married AND user provides it)
- numChildren: Number of children (only if user mentions it)
- retirementAge: Target retirement age (only if user specifies it)
- savingsRateTraditional1/Roth1/Taxable1: Savings rates (only if user mentions)
- currentTaxable/Traditional/Roth: Portfolio balances (only if user provides)

PARSING RULES:
- "I make $X" = annualIncome1: X, annualIncome2: null (NOT 0)
- "We make $X" = combined income, ask for breakdown
- If married but no spouse income mentioned = annualIncome2: null, add to missingFields
- If no state mentioned = state: null, add to missingFields
- If no children mentioned = numChildren: null, add to missingFields

SAFE ASSUMPTIONS (only if not specified):
- employmentType1: "w2" if income mentioned (medium confidence)
- emergencyFund: 6 months expenses if not mentioned (low confidence)
- maritalStatus: "single" if spouse never mentioned (medium confidence)

Return your response as a JSON object with this structure:
{
  "extractedData": {
    "age": number | null,
    "maritalStatus": "single" | "married" | null,
    "annualIncome1": number | null,
    "annualIncome2": number | null,
    "state": string | null,
    "spouseAge": number | null,
    "numChildren": number | null,
    "retirementAge": number | null,
    ...
  },
  "assumptions": [
    {
      "field": "fieldName",
      "displayName": "Human Readable Name",
      "value": any,
      "reasoning": "One sentence explaining why this was assumed",
      "confidence": "high" | "medium" | "low",
      "userProvided": false
    }
  ],
  "missingFields": [
    {
      "field": "fieldName",
      "displayName": "Human Readable Name",
      "description": "Why we need this information"
    }
  ],
  "summary": "Brief summary of what was collected, what was assumed, and what's still needed"
}

EXAMPLE:
User: "I'm 35 and married, I make $150k"
Response: {
  "extractedData": {
    "age": 35,
    "maritalStatus": "married",
    "annualIncome1": 150000,
    "annualIncome2": null,
    "spouseAge": null,
    "employmentType1": "w2"
  },
  "assumptions": [
    {"field": "employmentType1", "displayName": "Employment Type", "value": "w2", "reasoning": "W-2 employee is most common for stated income level", "confidence": "medium"}
  ],
  "missingFields": [
    {"field": "spouseAge", "displayName": "Spouse Age", "description": "Needed for joint retirement planning"},
    {"field": "annualIncome2", "displayName": "Spouse Income", "description": "Needed to calculate household finances"},
    {"field": "state", "displayName": "State", "description": "Needed for state tax calculations"},
    {"field": "retirementAge", "displayName": "Target Retirement Age", "description": "When do you want to retire?"}
  ],
  "summary": "Collected your age (35) and income ($150k). Since you're married, we still need your spouse's age and income, your state for tax purposes, and your target retirement age."
}`;

    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 4000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Please extract retirement planning data from this conversation:\n\n${conversationText}\n\nReturn only valid JSON, no other text.`,
        },
      ],
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
