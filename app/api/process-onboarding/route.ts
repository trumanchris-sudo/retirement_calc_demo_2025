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

1. Extract retirement planning data from the user's responses
2. Generate smart assumptions for missing required fields
3. Return structured data with reasoning

REQUIRED FIELDS:
- age: User's current age
- maritalStatus: "single" or "married"
- annualIncome1: User's annual income
- retirementAge: Target retirement age

OPTIONAL FIELDS (make assumptions if not provided):
- spouseAge: Spouse age (if married)
- state: US state (two-letter code)
- numChildren: Number of children
- employmentType1: "w2", "self-employed", "both", "retired", or "other"
- emergencyFund: Current emergency fund balance
- currentTaxable: Taxable brokerage balance
- currentTraditional: Traditional 401k/IRA balance
- currentRoth: Roth 401k/IRA balance
- savingsRateTaxable1: Annual taxable account contributions
- savingsRateTraditional1: Annual traditional 401k/IRA contributions
- savingsRateRoth1: Annual Roth contributions
- desiredRetirementSpending: Desired annual retirement spending

ASSUMPTION GUIDELINES:
- For employment type: default to "w2" if income mentioned but not specified
- For retirement age: default to 65 if not specified
- For current savings: default to $0 if not mentioned
- For emergency fund: recommend 6 months expenses if not specified
- For savings rates: use industry standards (15% total if not specified)
- For retirement spending: use 80% of current income if not specified
- Always provide one-sentence reasoning
- Mark confidence: "high" (stated), "medium" (implied), "low" (guessed)

Return your response as a JSON object with this structure:
{
  "extractedData": {
    "age": number,
    "maritalStatus": "single" | "married",
    ...
  },
  "assumptions": [
    {
      "field": "fieldName",
      "displayName": "Human Readable Name",
      "value": any,
      "reasoning": "One sentence explaining why",
      "confidence": "high" | "medium" | "low",
      "userProvided": false
    }
  ],
  "summary": "Brief summary of what was collected and assumed"
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
