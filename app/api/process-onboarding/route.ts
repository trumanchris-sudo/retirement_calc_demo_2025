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

    const systemPrompt = `You are a friendly retirement planning assistant conducting a sequential conversation. Your job is to:

1. Extract data from the user's latest response
2. Acknowledge what they provided
3. Ask the NEXT chunked question to collect missing information
4. Be conversational and friendly (not robotic)

CONVERSATION FLOW:
- Ask ONE question at a time
- Group related fields together (e.g., "What are your current account balances across traditional IRA/401k, Roth IRA/401k, taxable brokerage and savings/emergency?")
- Acknowledge what the user provided before asking the next question
- Be flexible with user's response format

QUESTION SEQUENCE (logical order):
1. Age and marital status
2. Annual income (theirs, and spouse if married)
3. Current account balances (grouped: traditional, Roth, taxable, savings)
4. Contribution rates or amounts (grouped: traditional, Roth, taxable, employer match)
5. Target retirement age
6. State (for tax calculations)
7. Spouse age (if married)
8. Any other missing critical fields

CRITICAL RULES - DO NOT GUESS:
- State: Only if user mentions it
- Spouse income/age: Only if married AND user provides
- Account balances: Only if user specifies
- Contribution rates: Only if user mentions
- Retirement age: Only if user specifies

SAFE ASSUMPTIONS (if not specified):
- employmentType1: "w2" if income mentioned (medium confidence)
- maritalStatus: "single" if no spouse mentioned (medium confidence)

Return JSON with this structure:
{
  "extractedData": {
    "age": number | null,
    "maritalStatus": "single" | "married" | null,
    "annualIncome1": number | null,
    "currentTraditional": number | null,
    "currentRoth": number | null,
    "currentTaxable": number | null,
    "currentCash": number | null,
    ...
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
  "missingFields": [
    {
      "field": "fieldName",
      "displayName": "Human Readable Name",
      "description": "Why needed"
    }
  ],
  "nextQuestion": "The next chunked question to ask (null if complete)",
  "summary": "What was just collected"
}

EXAMPLE:
User: "I'm 35 and single, I make $100k"
Response: {
  "extractedData": {
    "age": 35,
    "maritalStatus": "single",
    "annualIncome1": 100000,
    "employmentType1": "w2"
  },
  "assumptions": [
    {"field": "employmentType1", "displayName": "Employment Type", "value": "w2", "reasoning": "Most common for stated income", "confidence": "medium"}
  ],
  "missingFields": [
    {"field": "currentTraditional", "displayName": "Traditional 401k/IRA", "description": "Current balance"},
    {"field": "currentRoth", "displayName": "Roth 401k/IRA", "description": "Current balance"},
    {"field": "currentTaxable", "displayName": "Taxable Brokerage", "description": "Current balance"},
    {"field": "currentCash", "displayName": "Savings/Emergency", "description": "Current balance"}
  ],
  "nextQuestion": "Great! Got it - you're 35, single, making $100k. What are your current account balances across traditional IRA/401k, Roth IRA/401k, taxable brokerage and savings/emergency? (Just give me the numbers, I'll understand!)",
  "summary": "Collected age, marital status, and income"
}`;

    // Build the prompt with current extracted data context
    const contextPrompt = extractedData && Object.keys(extractedData).length > 0
      ? `Current extracted data so far:\n${JSON.stringify(extractedData, null, 2)}\n\nConversation history is provided. Extract new data from the latest user message and ask the next question.`
      : 'This is the beginning of the conversation. Extract data from the user\'s message and ask the next question.';

    // Convert conversation history to Anthropic format
    const messages = conversationHistory.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    // Add the extraction instruction
    messages.push({
      role: 'user',
      content: `${contextPrompt}\n\nReturn only valid JSON with extractedData, assumptions, missingFields, nextQuestion, and summary. No other text.`
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
