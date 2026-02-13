/**
 * AI Onboarding Streaming API
 *
 * Handles conversational onboarding using Claude AI with streaming responses
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  AIOnboardingRequest,
  ExtractedData,
  AssumptionWithReasoning,
  ConversationPhase,
  StreamEvent,
  ConfidenceLevel,
} from '@/types/ai-onboarding';
import { NextRequest } from 'next/server';

// ==================== Tool Input Types ====================

/**
 * Type for update_extracted_data tool input
 * Matches the schema defined in the tools array
 */
interface UpdateExtractedDataInput extends Partial<ExtractedData> {
  // All fields are optional and match ExtractedData keys
}

/**
 * Type for add_assumption tool input
 */
interface AddAssumptionInput {
  field: string;
  displayName: string;
  /** The assumed value - type varies by field (number for amounts, string for selections, etc.) */
  value: string | number | boolean | null;
  reasoning: string;
  confidence: ConfidenceLevel;
}

/**
 * Type for transition_phase tool input
 */
interface TransitionPhaseInput {
  newPhase: 'data-collection' | 'assumptions-review' | 'refinement' | 'complete';
}

/**
 * Union type for all possible tool inputs
 */
type ToolInput = UpdateExtractedDataInput | AddAssumptionInput | TransitionPhaseInput;

// ==================== Type Guards ====================

/**
 * Set of valid keys for ExtractedData (used for runtime validation)
 */
const EXTRACTED_DATA_KEYS_SET: Set<string> = new Set([
  'age', 'spouseAge', 'maritalStatus', 'state',
  'numChildren', 'childrenAges', 'additionalChildrenExpected',
  'employmentType1', 'employmentType2', 'primaryIncome', 'spouseIncome', 'bonusInfo',
  'emergencyFund', 'currentTaxable', 'currentTraditional', 'currentRoth',
  'savingsRateTaxable1', 'savingsRateTraditional1', 'savingsRateRoth1',
  'savingsRateTaxable2', 'savingsRateTraditional2', 'savingsRateRoth2',
  'contributionTraditional', 'contributionRoth', 'contributionTaxable', 'contributionMatch',
  'monthlyMortgageRent', 'monthlyUtilities', 'monthlyInsurancePropertyTax',
  'monthlyHealthcareP1', 'monthlyHealthcareP2', 'monthlyOtherExpenses',
  'retirementAge', 'desiredRetirementSpending',
]);

/**
 * Check if a key is a valid ExtractedData key (runtime validation)
 * Returns the key typed as keyof ExtractedData if valid, undefined otherwise
 */
function validateExtractedDataKey(key: string): keyof ExtractedData | undefined {
  return EXTRACTED_DATA_KEYS_SET.has(key) ? (key as keyof ExtractedData) : undefined;
}

/**
 * Type guard to check if input is an AddAssumptionInput
 */
function isAddAssumptionInput(input: unknown): input is AddAssumptionInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    'field' in input &&
    'displayName' in input &&
    'value' in input &&
    'reasoning' in input &&
    'confidence' in input
  );
}

/**
 * Type guard to check if input is a TransitionPhaseInput
 */
function isTransitionPhaseInput(input: unknown): input is TransitionPhaseInput {
  return (
    typeof input === 'object' &&
    input !== null &&
    'newPhase' in input &&
    typeof (input as TransitionPhaseInput).newPhase === 'string'
  );
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = 'claude-opus-4-5-20251101'; // Use Opus 4.5 for highest quality

export async function POST(request: NextRequest) {
  try {
    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('ANTHROPIC_API_KEY is not set in environment variables');
      return new Response(
        JSON.stringify({
          error: 'API key not configured. Please set ANTHROPIC_API_KEY in your environment variables.'
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const body: AIOnboardingRequest = await request.json();
    const { messages, extractedData = {}, assumptions = [], phase } = body;

    console.log('[AI Onboarding] Request received:', { phase, messageCount: messages.length });

    // Create a readable stream for Server-Sent Events
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Helper to send SSE events
          const sendEvent = (event: StreamEvent) => {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));
          };

          // Build system prompt based on phase
          const systemPrompt = buildSystemPrompt(phase, extractedData);

          // Convert conversation history to Claude format
          const claudeMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
            messages.map(msg => ({
              role: msg.role,
              content: msg.content,
            }));

          // Add initial user message if this is greeting phase with no messages
          if (phase === 'greeting' && claudeMessages.length === 0) {
            claudeMessages.push({
              role: 'user',
              content: 'Hello, I would like to set up my retirement plan.',
            });
          }

          // Define tools for data extraction
          const tools: Anthropic.Tool[] = [
            {
              name: 'update_extracted_data',
              description:
                'Update one or more fields of extracted data from the user conversation. Call this whenever the user provides information about themselves.',
              input_schema: {
                type: 'object',
                properties: {
                  age: { type: 'number', description: 'User age in years' },
                  spouseAge: { type: 'number', description: 'Spouse age in years (if married)' },
                  maritalStatus: {
                    type: 'string',
                    enum: ['single', 'married'],
                    description: 'Marital status',
                  },
                  state: { type: 'string', description: 'State of residence (two-letter code)' },
                  numChildren: { type: 'number', description: 'Number of children' },
                  childrenAges: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'Ages of children',
                  },
                  additionalChildrenExpected: {
                    type: 'number',
                    description: 'Number of additional children expected',
                  },
                  employmentType1: {
                    type: 'string',
                    enum: ['w2', 'self-employed', 'both', 'retired', 'other'],
                    description: 'User employment type',
                  },
                  employmentType2: {
                    type: 'string',
                    enum: ['w2', 'self-employed', 'both', 'retired', 'other'],
                    description: 'Spouse employment type',
                  },
                  primaryIncome: { type: 'number', description: 'User annual income in dollars' },
                  spouseIncome: {
                    type: 'number',
                    description: 'Spouse annual income in dollars',
                  },
                  emergencyFund: {
                    type: 'number',
                    description: 'Current emergency fund balance in dollars',
                  },
                  currentTaxable: {
                    type: 'number',
                    description: 'Current taxable brokerage account balance in dollars',
                  },
                  currentTraditional: {
                    type: 'number',
                    description: 'Current traditional 401k/IRA balance in dollars',
                  },
                  currentRoth: {
                    type: 'number',
                    description: 'Current Roth 401k/IRA balance in dollars',
                  },
                  savingsRateTaxable1: {
                    type: 'number',
                    description: 'User annual taxable account contributions in dollars',
                  },
                  savingsRateTraditional1: {
                    type: 'number',
                    description: 'User annual traditional 401k/IRA contributions in dollars',
                  },
                  savingsRateRoth1: {
                    type: 'number',
                    description: 'User annual Roth contributions in dollars',
                  },
                  savingsRateTaxable2: {
                    type: 'number',
                    description: 'Spouse annual taxable account contributions in dollars',
                  },
                  savingsRateTraditional2: {
                    type: 'number',
                    description: 'Spouse annual traditional 401k/IRA contributions in dollars',
                  },
                  savingsRateRoth2: {
                    type: 'number',
                    description: 'Spouse annual Roth contributions in dollars',
                  },
                  retirementAge: { type: 'number', description: 'Target retirement age in years' },
                  desiredRetirementSpending: {
                    type: 'number',
                    description: 'Desired annual retirement spending in dollars',
                  },
                },
              },
            },
            {
              name: 'add_assumption',
              description:
                'Record an assumption made based on user input or standard financial planning practices. Call this when you infer or assume something that was not explicitly stated.',
              input_schema: {
                type: 'object',
                properties: {
                  field: {
                    type: 'string',
                    description: 'The field name this assumption relates to',
                  },
                  displayName: {
                    type: 'string',
                    description: 'Human-readable name for this field',
                  },
                  value: {
                    description: 'The assumed value',
                  },
                  reasoning: {
                    type: 'string',
                    description:
                      'One sentence explaining why this assumption was made',
                  },
                  confidence: {
                    type: 'string',
                    enum: ['high', 'medium', 'low'],
                    description:
                      'Confidence level: high (directly stated/implied), medium (inferred from context), low (best guess)',
                  },
                },
                required: ['field', 'displayName', 'value', 'reasoning', 'confidence'],
              },
            },
            {
              name: 'transition_phase',
              description:
                'Transition to the next phase of the onboarding conversation. Call this when you have enough information to move forward.',
              input_schema: {
                type: 'object',
                properties: {
                  newPhase: {
                    type: 'string',
                    enum: ['data-collection', 'assumptions-review', 'refinement', 'complete'],
                    description: 'The next phase to transition to',
                  },
                },
                required: ['newPhase'],
              },
            },
          ];

          // Call Claude API with streaming
          const response = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4000,
            temperature: 0.7,
            system: systemPrompt,
            messages: claudeMessages,
            tools,
            stream: true,
          });

          let currentText = '';
          let currentPhase = phase;
          const updatedData = { ...extractedData };
          const updatedAssumptions = [...assumptions];

          // Process the stream
          for await (const event of response) {
            if (event.type === 'content_block_start') {
              if (event.content_block.type === 'text') {
                // Start of text block
                currentText = '';
              }
            }

            if (event.type === 'content_block_delta') {
              if (event.delta.type === 'text_delta') {
                // Stream text delta
                const delta = event.delta.text;
                currentText += delta;

                sendEvent({
                  type: 'message_delta',
                  delta,
                });
              }
            }

            if (event.type === 'content_block_stop') {
              // End of content block
            }

            if (event.type === 'message_delta' && event.delta.stop_reason === 'tool_use') {
              // Tool use completed - process tools
            }

            if (event.type === 'message_stop') {
              // Message complete
              break;
            }
          }

          // Process any tool calls from the final message
          const finalMessage = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 4000,
            temperature: 0.7,
            system: systemPrompt,
            messages: claudeMessages,
            tools,
          });

          // Handle tool calls
          if (finalMessage.content) {
            for (const block of finalMessage.content) {
              if (block.type === 'tool_use') {
                const toolName = block.name;
                // Type assertion required due to Anthropic SDK ContentBlock typing limitations
                // The SDK types block.input as Record<string, unknown>, but we know the shape
                // based on our tool definitions
                const toolInput = block.input as ToolInput;

                if (toolName === 'update_extracted_data') {
                  // Update extracted data - input matches UpdateExtractedDataInput (Partial<ExtractedData>)
                  const updateInput = toolInput as UpdateExtractedDataInput;
                  for (const [key, value] of Object.entries(updateInput)) {
                    const validKey = validateExtractedDataKey(key);
                    if (value !== undefined && value !== null && validKey !== undefined) {
                      // Use type-safe assignment with validated key
                      (updatedData as Record<keyof ExtractedData, ExtractedData[keyof ExtractedData]>)[validKey] = value as ExtractedData[keyof ExtractedData];

                      sendEvent({
                        type: 'data_update',
                        field: validKey,
                        value: value as ExtractedData[keyof ExtractedData],
                      });
                    }
                  }
                }

                if (toolName === 'add_assumption' && isAddAssumptionInput(toolInput)) {
                  const assumption: AssumptionWithReasoning = {
                    field: toolInput.field,
                    displayName: toolInput.displayName,
                    value: toolInput.value,
                    reasoning: toolInput.reasoning,
                    confidence: toolInput.confidence,
                    userProvided: false,
                  };

                  updatedAssumptions.push(assumption);

                  sendEvent({
                    type: 'assumption_added',
                    assumption,
                  });
                }

                if (toolName === 'transition_phase' && isTransitionPhaseInput(toolInput)) {
                  currentPhase = toolInput.newPhase;

                  sendEvent({
                    type: 'phase_transition',
                    newPhase: toolInput.newPhase,
                  });

                  if (toolInput.newPhase === 'complete') {
                    sendEvent({
                      type: 'complete',
                      finalData: updatedData,
                      assumptions: updatedAssumptions,
                    });
                  }
                }
              }
            }
          }

          // Send completion
          sendEvent({
            type: 'complete',
            finalData: updatedData,
            assumptions: updatedAssumptions,
          });

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Stream error:', error);
          const errorEvent: StreamEvent = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Unknown error occurred',
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(errorEvent)}\n\n`));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Build system prompt based on conversation phase
 */
function buildSystemPrompt(phase: ConversationPhase, extractedData: ExtractedData): string {
  const basePrompt = `You are an expert financial planning assistant helping users set up their retirement calculator. Your goal is to gather essential information through friendly, guided questions and make intelligent assumptions where appropriate.

REQUIRED DATA TO COLLECT:
1. Personal: Age, marital status, spouse age (if married), state of residence
2. Family: Number of children, their ages, plans for additional children
3. Income: Annual income for user (and spouse), employment type (W-2, self-employed, both, other)
4. Current Portfolio: Emergency fund, taxable brokerage, traditional retirement accounts (401k/IRA), Roth accounts
5. Savings: Annual contribution rates to each account type
6. Goals: Target retirement age, desired retirement spending

CONVERSATION STYLE:
- Be warm, professional, and encouraging
- Ask 1-3 related questions at a time (don't overwhelm)
- Use natural, conversational language
- When making assumptions, base them on financial planning best practices
- For unusual responses, ask clarifying questions
- Extract numeric values precisely

IMPORTANT NOTES:
- Emergency fund is separate from taxable brokerage (explain it preserves real value at inflation rate)
- Children data is primarily for legacy/generational wealth calculations
- Note: "College savings planning is not included in this calculator, but we track your children for legacy planning purposes"
- For employment type, confirm if they are W-2 employee, self-employed (1099), both, retired, or other

MAKING ASSUMPTIONS:
- Always provide one-sentence reasoning for assumptions
- Mark confidence level: high (directly stated), medium (strongly implied), low (guessed)
- Be conservative with assumptions - when in doubt, ask`;

  const phaseInstructions = {
    greeting: `
CURRENT PHASE: Greeting & Introduction
- Introduce yourself warmly
- Explain the process briefly (conversational setup, review assumptions, refine)
- Start with basic questions: age, marital status
- Be encouraging and set a positive tone
- IMPORTANT: After your greeting message, use transition_phase to move to 'data-collection' phase`,

    'data-collection': `
CURRENT PHASE: Data Collection
- Continue gathering missing required fields
- Use tool calls to update extracted data as you learn information
- Group related questions together
- If you have enough core data, prepare to transition to assumptions-review phase

CURRENT DATA: ${JSON.stringify(extractedData, null, 2)}`,

    'assumptions-review': `
CURRENT PHASE: Assumptions Review
- Present all assumptions you've made with reasoning
- Use the add_assumption tool for each one
- Ask the user to review and confirm
- Be transparent about what was inferred vs explicitly stated
- Transition to refinement phase when ready

CURRENT DATA: ${JSON.stringify(extractedData, null, 2)}`,

    refinement: `
CURRENT PHASE: Refinement
- Listen for corrections or adjustments to assumptions
- Update extracted data based on their feedback
- Ask clarifying questions if needed
- Once all refinements are made, transition to complete phase

CURRENT DATA: ${JSON.stringify(extractedData, null, 2)}`,

    complete: `
CURRENT PHASE: Complete
- Congratulate the user on completing onboarding
- Summarize what will happen next (data will populate the calculator)
- Be enthusiastic and encouraging
- Use transition_phase tool to mark completion`,
  };

  return basePrompt + '\n\n' + phaseInstructions[phase];
}
