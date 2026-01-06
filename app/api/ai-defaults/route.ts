import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'
import type { AIDefaultsRequest, AIDefaultsResponse } from '@/types/ai-defaults'
import { AI_DEFAULTS_BOUNDS } from '@/types/ai-defaults'

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

/**
 * Validates that AI-generated values are within safe bounds
 */
function validateAndClamp(response: Partial<AIDefaultsResponse>): AIDefaultsResponse {
  const savingsRate = Math.max(
    AI_DEFAULTS_BOUNDS.savingsRate.min,
    Math.min(AI_DEFAULTS_BOUNDS.savingsRate.max, response.savingsRate || 0.15)
  )

  const retirementAge = Math.max(
    AI_DEFAULTS_BOUNDS.retirementAge.min,
    Math.min(AI_DEFAULTS_BOUNDS.retirementAge.max, Math.round(response.retirementAge || 65))
  )

  const spendingMultiplier = Math.max(
    AI_DEFAULTS_BOUNDS.spendingMultiplier.min,
    Math.min(AI_DEFAULTS_BOUNDS.spendingMultiplier.max, response.spendingMultiplier || 0.80)
  )

  return {
    savingsRate,
    retirementAge,
    spendingMultiplier,
    reasoning: Array.isArray(response.reasoning) ? response.reasoning : [
      'Conservative defaults based on your age and income',
      'Adjust these values based on your specific goals and circumstances'
    ],
    model: response.model || 'claude-haiku-4-5-20251001',
    timestamp: response.timestamp || Date.now(),
  }
}

/**
 * Generates fallback defaults when AI is unavailable
 */
function getFallbackDefaults(request: AIDefaultsRequest): AIDefaultsResponse {
  const totalIncome = request.income + (request.spouseIncome || 0)

  // Simple heuristic-based defaults
  let savingsRate = 0.12 // 12% default
  if (totalIncome < 50000) savingsRate = 0.10
  else if (totalIncome < 100000) savingsRate = 0.12
  else if (totalIncome < 150000) savingsRate = 0.15
  else savingsRate = 0.18

  // Retirement age based on current age
  let retirementAge = 65
  if (request.age < 30) retirementAge = 62
  else if (request.age < 40) retirementAge = 65
  else if (request.age >= 55) retirementAge = 67

  return {
    savingsRate,
    retirementAge,
    spendingMultiplier: 0.80,
    reasoning: [
      'Using standard defaults based on income level',
      'AI suggestions unavailable - these are conservative estimates',
      'You can customize all values in the next steps'
    ],
    model: 'fallback',
    timestamp: Date.now(),
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: AIDefaultsRequest = await request.json()

    // Validate request
    if (!body.age || body.age < 18 || body.age > 100) {
      return NextResponse.json(
        { error: 'Invalid age provided' },
        { status: 400 }
      )
    }

    if (!body.income || body.income < 0) {
      return NextResponse.json(
        { error: 'Invalid income provided' },
        { status: 400 }
      )
    }

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.log('[AI Defaults] No API key configured, using fallback defaults')
      return NextResponse.json(getFallbackDefaults(body))
    }

    const totalIncome = body.income + (body.spouseIncome || 0)

    // Build Claude prompt
    const prompt = `You are a retirement planning assistant helping generate sensible default assumptions for a new user.

USER PROFILE:
- Age: ${body.age}${body.spouseAge ? `, Spouse Age: ${body.spouseAge}` : ''}
- Marital Status: ${body.maritalStatus}
- Household Income: $${totalIncome.toLocaleString()}${body.spouseIncome ? ` ($${body.income.toLocaleString()} + $${body.spouseIncome.toLocaleString()} spouse)` : ''}
- State: ${body.state || 'Not specified'}

YOUR TASK:
Generate conservative, realistic default retirement planning assumptions. Return ONLY a JSON object with this exact structure:

{
  "savingsRate": <number between 0.08 and 0.25>,
  "retirementAge": <integer between 60 and 70>,
  "spendingMultiplier": <number between 0.60 and 0.90>,
  "reasoning": [
    "<brief explanation for savings rate>",
    "<brief explanation for retirement age>",
    "<brief explanation for spending>"
  ]
}

GUIDELINES:
1. Savings Rate (as decimal, e.g., 0.15 = 15%):
   - Consider income level: higher income → higher savings capacity
   - Typical range: 10-20% for most households
   - Do NOT exceed 25% (unrealistic for most)
   - Do NOT go below 8% (insufficient for retirement)

2. Retirement Age:
   - Consider current age: younger workers can plan for earlier retirement with proper saving
   - Standard range: 65-67 for most
   - Early retirement (60-64): Only suggest if high income + aggressive savings potential
   - Late retirement (68-70): Suggest if lower savings rate or starting late (age 45+)

3. Spending Multiplier (as decimal, e.g., 0.80 = 80%):
   - Represents target retirement spending as % of pre-retirement income
   - Typical: 70-85% of pre-retirement income
   - Consider: no commuting, paid-off mortgage, but healthcare costs increase
   - Default to 0.80 (80%) unless specific reasons to adjust

4. Reasoning:
   - Provide 2-3 brief, specific bullet points explaining your choices
   - Be concrete: "15% savings rate balances aggressive growth with realistic household budget"
   - Avoid generic advice or disclaimers
   - Keep each point under 20 words

CONSTRAINTS:
- NO personalized financial advice
- NO legal/tax advice
- Focus ONLY on providing reasonable starting defaults
- User can override all suggestions
- Be conservative (err on side of higher savings, later retirement)

Return ONLY the JSON object, no markdown formatting, no additional text.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent numeric outputs
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    // Extract and parse Claude's response
    const textContent = message.content[0].type === 'text' ? message.content[0].text : ''

    // Try to parse JSON from response
    let aiResponse: Partial<AIDefaultsResponse>
    try {
      // Remove markdown code blocks if present
      const cleanedText = textContent.replace(/```json\n?|```\n?/g, '').trim()
      aiResponse = JSON.parse(cleanedText)
    } catch (parseError) {
      console.error('[AI Defaults] Failed to parse Claude response:', textContent)
      console.log('[AI Defaults] Using fallback defaults due to parse error')
      return NextResponse.json(getFallbackDefaults(body))
    }

    // Validate and clamp values to safe bounds
    const validatedResponse = validateAndClamp({
      ...aiResponse,
      model: 'claude-haiku-4-5-20251001',
      timestamp: Date.now(),
    })

    console.log('[AI Defaults] Successfully generated:', validatedResponse)
    return NextResponse.json(validatedResponse)

  } catch (error: unknown) {
    console.error('[AI Defaults] Error:', error)

    // Parse the request body for fallback
    let requestBody: AIDefaultsRequest
    try {
      requestBody = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }

    // Return fallback defaults on error
    console.log('[AI Defaults] Using fallback defaults due to error')
    return NextResponse.json(getFallbackDefaults(requestBody))
  }
}
