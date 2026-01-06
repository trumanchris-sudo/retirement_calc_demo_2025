# AI-Powered Onboarding Console - Work Plan

## Project Overview
Transform the retirement calculator onboarding from a 4-step wizard into a modern command console interface powered by Claude AI. The console will guide users through conversational prompts, extract essential data, make intelligent assumptions, and populate all calculator fields including the 2026 income calculators.

---

## Phase 1: Data Model & State Architecture

### 1.1 Extend Core Calculator Data Model
**Location:** `app/page.tsx` + new types

**Add Missing Fields:**
```typescript
// Children & Family Planning
numChildren: number
childrenAges: number[]  // Array of ages
additionalChildrenExpected: number

// Current Portfolio Balances (STARTING VALUES)
emergencyFund: number  // Separate from taxable, yields inflation rate
currentTaxable: number
currentTraditional: number  // Combined 401k + Traditional IRA
currentRoth: number         // Combined Roth 401k + Roth IRA

// Employment Classification
employmentType1: 'w2' | 'self-employed' | 'both' | 'retired' | 'other'
employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other'

// Income (current annual)
annualIncome1: number
annualIncome2?: number
```

**Tasks:**
- [ ] Update `types/calculator.ts` with new fields
- [ ] Add emergency fund to balance calculations (yield = inflation rate only)
- [ ] Update `lib/calculations/retirementEngine.ts` to handle emergency fund separately
- [ ] Add children data to generational wealth calculations integration
- [ ] Create migration helper for localStorage backwards compatibility

**Acceptance Criteria:**
- Emergency fund grows at `infRate` only, never exposed to market volatility
- Children ages properly feed into dynasty timeline calculations
- Employment type stored for income calculator auto-population

---

### 1.2 Create AI Conversation Data Model
**Location:** `types/ai-onboarding.ts` (new file)

```typescript
interface ConversationMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: number
}

interface ExtractedData {
  // Personal
  age?: number
  spouseAge?: number
  maritalStatus?: 'single' | 'married'
  state?: string
  numChildren?: number
  childrenAges?: number[]
  additionalChildrenExpected?: number

  // Employment & Income
  employmentType1?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other'
  employmentType2?: 'w2' | 'self-employed' | 'both' | 'retired' | 'other'
  annualIncome1?: number
  annualIncome2?: number

  // Current Balances
  emergencyFund?: number
  currentTaxable?: number
  currentTraditional?: number
  currentRoth?: number

  // Savings Rates (annual contributions)
  savingsRateTaxable1?: number
  savingsRateTraditional1?: number
  savingsRateRoth1?: number
  savingsRateTaxable2?: number
  savingsRateTraditional2?: number
  savingsRateRoth2?: number

  // Goals
  retirementAge?: number
  desiredRetirementSpending?: number
}

interface AssumptionWithReasoning {
  field: keyof ExtractedData | string  // Allow calculator fields too
  value: any
  reasoning: string  // One sentence explanation
  confidence: 'high' | 'medium' | 'low'
  userProvided: boolean  // True if explicitly stated, false if inferred
}

interface AIOnboardingState {
  conversationHistory: ConversationMessage[]
  extractedData: ExtractedData
  assumptions: AssumptionWithReasoning[]
  currentPhase: 'greeting' | 'data-collection' | 'assumptions-review' | 'refinement' | 'complete'
  lastUpdated: number
}
```

**Tasks:**
- [ ] Create type definitions
- [ ] Add validation schemas using Zod
- [ ] Create localStorage persistence layer

---

## Phase 2: Modern Console UI Component

### 2.1 Build AI Console Component
**Location:** `components/onboarding/AIConsole.tsx` (new)

**Visual Design:**
- Modern dark gradient background (not pure black)
- Soft glow effects around input and messages
- Smooth typing animations for AI responses
- Message bubbles with subtle shadows
- Monospace font for input, sans-serif for AI responses
- Syntax highlighting for numbers/entities in AI messages
- Auto-scroll to latest message
- Loading states with animated dots/pulse

**Component Structure:**
```typescript
interface AIConsoleProps {
  onComplete: (data: ExtractedData, assumptions: AssumptionWithReasoning[]) => void
  onSkip: () => void  // Exit to manual entry
}

export function AIConsole({ onComplete, onSkip }: AIConsoleProps) {
  const [messages, setMessages] = useState<ConversationMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [extractedData, setExtractedData] = useState<ExtractedData>({})
  const [assumptions, setAssumptions] = useState<AssumptionWithReasoning[]>([])
  const [phase, setPhase] = useState<AIOnboardingState['currentPhase']>('greeting')

  // Streaming message handler
  // Input submission
  // Auto-save to localStorage
  // Phase transitions
}
```

**Sub-components:**
- `MessageBubble.tsx` - Individual message display
- `StreamingMessage.tsx` - Animated typing effect
- `AssumptionCard.tsx` - Display assumption with reasoning
- `ConsoleInput.tsx` - Command-style input field
- `DataSummaryPanel.tsx` - Side panel showing extracted data in real-time

**Tasks:**
- [ ] Create base AIConsole component with streaming support
- [ ] Build message display with animations
- [ ] Implement auto-scroll behavior
- [ ] Add "Skip to manual entry" escape hatch button
- [ ] Create assumption review UI (cards with edit capability)
- [ ] Add real-time data extraction preview panel
- [ ] Implement mobile-responsive layout
- [ ] Add keyboard shortcuts (Enter to send, Esc to clear)

**Styling:**
- Use Tailwind with custom gradients
- Add subtle animations (Framer Motion)
- Ensure WCAG accessibility standards
- Dark mode optimized (it's a console!)

---

### 2.2 Replace Onboarding Wizard Entry Point
**Location:** Update `components/onboarding/OnboardingWizard.tsx`

**Changes:**
- Remove 4-step wizard components
- Render `<AIConsole>` instead
- Keep modal/overlay wrapper
- Update completion handler to map AI data to calculator state

**Tasks:**
- [ ] Update OnboardingWizard to use AIConsole
- [ ] Remove old step components (archive for reference)
- [ ] Update useOnboarding hook to handle new data structure
- [ ] Add conversion utility from `ExtractedData` to calculator state

---

## Phase 3: Claude API Streaming Endpoint

### 3.1 Create Streaming Conversation API
**Location:** `app/api/ai-onboarding/route.ts` (new)

**Endpoint Design:**
```typescript
POST /api/ai-onboarding

Request Body:
{
  messages: ConversationMessage[]
  extractedData?: ExtractedData  // Current extracted state
  phase: 'greeting' | 'data-collection' | 'assumptions-review' | 'refinement'
}

Response:
- Streaming (text/event-stream)
- Events:
  - message_delta: { delta: string }  // Streamed text chunks
  - data_update: { field: string, value: any }  // Extracted data
  - assumption_added: AssumptionWithReasoning
  - phase_transition: { newPhase: string }
  - complete: { finalData: ExtractedData, assumptions: AssumptionWithReasoning[] }
```

**Claude Integration Strategy:**

**System Prompt Template:**
```
You are an expert financial planning assistant helping users set up their retirement calculator. Your goal is to gather essential information through friendly, guided questions and make intelligent assumptions where appropriate.

REQUIRED DATA TO COLLECT:
1. Personal: Age, marital status, spouse age (if married), state of residence
2. Family: Number of children, their ages, plans for additional children
3. Income: Annual income for user (and spouse), employment type (W-2, self-employed, both, other)
4. Current Portfolio: Emergency fund, taxable brokerage, traditional retirement accounts (401k/IRA), Roth accounts
5. Savings: Annual contribution rates to each account type
6. Goals: Target retirement age, desired retirement spending

CONVERSATION FLOW:
- Phase 1 (Greeting): Introduce yourself, explain the process, start with basic questions
- Phase 2 (Data Collection): Ask guided questions to fill required fields
  - Group related questions (e.g., "Tell me about your household - age, marital status")
  - For missing data, ask follow-ups
  - For unusual answers, ask clarifying questions
- Phase 3 (Assumptions): Present all inferred/assumed values with reasoning
- Phase 4 (Refinement): Allow user to correct any assumptions via natural language

RULES:
- Ask 1-3 related questions at a time (don't overwhelm)
- Use natural, conversational language
- When making assumptions, base them on financial planning best practices
- For ambiguous responses, ask for clarification
- Extract numeric values and store them precisely
- Always provide one-sentence reasoning for assumptions
- Mark confidence level: high (directly stated), medium (strongly implied), low (guessed)

CURRENT PHASE: {{phase}}
EXTRACTED DATA SO FAR: {{extractedData}}

Continue the conversation naturally based on what's missing.
```

**Tool Calling for Data Extraction:**
Use Claude's tool use feature to extract structured data:

```typescript
{
  name: "update_extracted_data",
  description: "Update extracted fields from user's response",
  input_schema: {
    type: "object",
    properties: {
      updates: {
        type: "object",
        properties: {
          age: { type: "number" },
          maritalStatus: { type: "string", enum: ["single", "married"] },
          // ... all fields from ExtractedData
        }
      }
    }
  }
}

{
  name: "add_assumption",
  description: "Record an assumption made based on user input",
  input_schema: {
    type: "object",
    properties: {
      field: { type: "string" },
      value: {},
      reasoning: { type: "string" },
      confidence: { type: "string", enum: ["high", "medium", "low"] }
    },
    required: ["field", "value", "reasoning", "confidence"]
  }
}

{
  name: "transition_phase",
  description: "Move to the next conversation phase",
  input_schema: {
    type: "object",
    properties: {
      newPhase: { type: "string", enum: ["data-collection", "assumptions-review", "refinement", "complete"] }
    }
  }
}
```

**Tasks:**
- [ ] Create streaming API route with Claude SDK
- [ ] Implement system prompt with dynamic phase injection
- [ ] Add tool calling for data extraction and phase management
- [ ] Handle streaming response with Server-Sent Events
- [ ] Implement conversation context management (full history)
- [ ] Add error handling and fallback responses
- [ ] Implement rate limiting and token usage tracking
- [ ] Add request validation with Zod
- [ ] Create unit tests for data extraction logic

**Model Selection:**
- Use **Claude Opus 4.5** for highest quality conversation and reasoning
- Optimize prompts for structured output reliability
- Set max_tokens dynamically based on phase (higher for assumptions review)

---

### 3.2 Client-Side Streaming Handler
**Location:** `lib/ai-onboarding.ts` (new)

```typescript
export async function streamAIOnboarding({
  messages,
  extractedData,
  phase,
  onMessageDelta,
  onDataUpdate,
  onAssumptionAdded,
  onPhaseTransition,
  onComplete,
  onError
}: StreamHandlerParams): Promise<void>
```

**Tasks:**
- [ ] Create fetch wrapper for SSE streaming
- [ ] Parse event stream and dispatch callbacks
- [ ] Handle reconnection on network errors
- [ ] Add abort controller for cancellation
- [ ] Implement retry logic with exponential backoff

---

## Phase 4: Data Population & Calculator Integration

### 4.1 AI Data to Calculator State Mapper
**Location:** `lib/aiOnboardingMapper.ts` (new)

**Purpose:** Convert `ExtractedData + AssumptionWithReasoning[]` to full calculator state

**Mapping Logic:**
```typescript
export function mapAIDataToCalculator(
  extracted: ExtractedData,
  assumptions: AssumptionWithReasoning[]
): CalculatorState {
  // 1. Direct mappings (age, marital status, etc.)
  // 2. Assumption mappings (applied defaults)
  // 3. Derived calculations (e.g., employer match from income)
  // 4. IRS limit enforcement (cap 401k contributions at $24,500)
  // 5. State tax lookup from state field
}
```

**Additional Assumptions to Generate:**
- Employer match: Assume 50% match up to 6% of salary (if not specified)
- Asset allocation: Age-based bond glide path (default strategy)
- Return assumptions: 9.8% nominal, 2.6% inflation (current defaults)
- Social Security: Calculate based on income and age
- Medicare: Enable if retirement age > 65
- RMDs: Auto-calculate based on account balances and age

**Tasks:**
- [ ] Create comprehensive mapping function
- [ ] Add validation to ensure all required calculator fields populated
- [ ] Generate missing assumptions with reasoning
- [ ] Apply IRS contribution limits
- [ ] Add state tax rate lookup table
- [ ] Create snapshot/diff view to show what was auto-filled
- [ ] Add unit tests for all mapping scenarios

---

### 4.2 Auto-Populate Income Calculators
**Location:** Update `app/income-2026/page.tsx` and `app/self-employed-2026/page.tsx`

**Strategy:**
- Read from localStorage/session storage where AI onboarding data is cached
- Detect employment type and pre-fill appropriate calculator
- Show banner: "Auto-filled from your onboarding. Edit as needed."

**Tasks:**
- [ ] Create shared localStorage key for income data
- [ ] Add auto-fill logic on page load
- [ ] Build "From AI Onboarding" indicator badge
- [ ] Add "Clear and start fresh" button
- [ ] Ensure changes in income calculator don't break main calculator sync

---

## Phase 5: Assumptions Review & Refinement

### 5.1 Assumptions Display Component
**Location:** `components/onboarding/AssumptionsReview.tsx` (new)

**UI Design:**
- Grid of cards, each showing:
  - Field name (human-readable)
  - Assumed value
  - Reasoning (one sentence)
  - Confidence indicator (color-coded)
  - "User Provided" badge if explicitly stated
- Allow inline text refinement: "Actually, I want to retire at 55"
- Send refinement back to Claude API for re-processing

**Tasks:**
- [ ] Build card grid layout
- [ ] Add confidence color coding (green=high, yellow=medium, red=low)
- [ ] Implement inline refinement via text input
- [ ] Connect refinement to streaming API
- [ ] Add "Accept all" and "Refine" buttons
- [ ] Show loading state during refinement processing

---

### 5.2 Refinement Loop
**Location:** Update `app/api/ai-onboarding/route.ts`

**When phase = 'refinement':**
- User provides text like "Emergency fund should be $50k, not $20k"
- Claude extracts the correction
- Updates `ExtractedData`
- Regenerates affected assumptions
- Returns updated state

**Tasks:**
- [ ] Add refinement parsing logic
- [ ] Update affected assumptions when data changes
- [ ] Validate refined values against constraints
- [ ] Return diff of changes to frontend

---

## Phase 6: Polish & Testing

### 6.1 Error Handling & Edge Cases
**Scenarios to Handle:**
- API timeout/failure → Show friendly error, allow retry
- Malformed user input → Ask clarifying question
- Conflicting data (e.g., age 25, $5M portfolio) → Flag for confirmation
- Extremely high/low values → Sanity check warnings
- Network interruption during streaming → Reconnect seamlessly

**Tasks:**
- [ ] Add comprehensive error boundaries
- [ ] Implement graceful degradation (fallback to manual)
- [ ] Add validation warnings for unusual values
- [ ] Create retry mechanisms with backoff
- [ ] Add offline detection and messaging

---

### 6.2 Testing Strategy

**Unit Tests:**
- [ ] Data extraction from conversation (Vitest)
- [ ] AI data → calculator state mapping
- [ ] Assumption generation logic
- [ ] Validation schemas

**Integration Tests:**
- [ ] Full conversation flow (mock Claude API)
- [ ] Data persistence across page refresh
- [ ] Calculator population from AI data
- [ ] Income calculator auto-fill

**E2E Tests (Playwright):**
- [ ] Complete onboarding flow end-to-end
- [ ] Skip to manual entry
- [ ] Refinement loop
- [ ] Mobile responsiveness
- [ ] Accessibility (keyboard navigation, screen readers)

**Manual QA:**
- [ ] Test with various user personas (single, married, high income, low income, etc.)
- [ ] Verify assumption quality and reasoning
- [ ] Check visual polish and animations
- [ ] Test on multiple devices/browsers

---

### 6.3 Performance Optimization
- [ ] Implement conversation history truncation (keep last N messages for context)
- [ ] Add caching for common assumption patterns
- [ ] Optimize streaming bundle size
- [ ] Lazy load console component
- [ ] Add loading skeletons
- [ ] Monitor Claude API token usage and costs

---

### 6.4 Documentation
- [ ] User guide: How to use AI onboarding
- [ ] Developer docs: How the system works
- [ ] API documentation for ai-onboarding endpoint
- [ ] Troubleshooting guide
- [ ] Update README with new flow

---

## Phase 7: Deployment & Monitoring

### 7.1 Environment Variables
```bash
ANTHROPIC_API_KEY=sk-ant-...
AI_ONBOARDING_MODEL=claude-opus-4-5-20251101
AI_ONBOARDING_MAX_TOKENS=4000
AI_ONBOARDING_TEMPERATURE=0.7
```

**Tasks:**
- [ ] Add environment variables to .env.example
- [ ] Set up production API keys
- [ ] Configure rate limiting
- [ ] Set up monitoring/alerting for API errors

---

### 7.2 Analytics & Monitoring
**Track:**
- Conversation completion rate
- Average number of messages to completion
- Common refinement requests
- Field extraction accuracy (manual audit)
- API costs per session
- Error rates and types

**Tasks:**
- [ ] Add analytics events to console
- [ ] Create dashboard for monitoring
- [ ] Set up cost alerts
- [ ] Implement A/B testing framework (for prompt iterations)

---

## Implementation Order

### Sprint 1: Foundation (Week 1)
1. Phase 1.1: Extend data model
2. Phase 3.1: Build streaming API (basic version)
3. Phase 2.1: Create console UI (basic layout)

### Sprint 2: Core Features (Week 2)
4. Phase 3.1 (complete): Full Claude integration with tools
5. Phase 2.1 (complete): Polish console UI with animations
6. Phase 4.1: Data mapping to calculator

### Sprint 3: Integration (Week 3)
7. Phase 2.2: Replace wizard entry point
8. Phase 4.2: Auto-populate income calculators
9. Phase 5: Assumptions review and refinement

### Sprint 4: Polish (Week 4)
10. Phase 6.1: Error handling
11. Phase 6.2: Testing
12. Phase 6.3: Performance optimization

### Sprint 5: Launch (Week 5)
13. Phase 6.4: Documentation
14. Phase 7: Deployment and monitoring
15. User acceptance testing
16. Production rollout

---

## Success Metrics

**User Experience:**
- 80%+ of users complete AI onboarding (vs. current wizard)
- < 5 minutes average completion time
- 90%+ accuracy of extracted data (user audit)
- < 10% of users skip to manual entry

**Technical:**
- < 2 second response time for streaming start
- 99.9% API uptime
- < $0.50 average cost per onboarding session
- Zero data loss (localStorage persistence)

**Business:**
- Increased conversion from visitor → calculated plan
- Higher engagement with advanced features
- Reduced support requests about "how to fill this in"

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Claude API outage | High | Fallback to manual wizard, cached responses |
| Poor data extraction | High | Extensive testing, tool use validation, user review step |
| High API costs | Medium | Token limits, conversation truncation, caching |
| User confusion | Medium | Clear instructions, examples, skip option |
| Mobile performance | Medium | Lazy loading, optimized bundle, responsive design |
| Privacy concerns | High | No data sent to Claude stored server-side, clear privacy notice |

---

## Open Questions
1. Should we store conversation history server-side for debugging?
2. Do we want to offer conversation export/resume later?
3. Should assumptions be editable directly in console or only via text refinement?
4. What's the fallback if user provides incomplete data (e.g., skips children)?

---

## Cost Estimate (Claude API Usage)

**Assumptions:**
- Average conversation: 15 messages
- Average tokens per request: 2,000 input + 1,000 output
- Model: Claude Opus 4.5 ($15/$75 per 1M tokens)

**Per Session:**
- Input: 15 × 2,000 = 30,000 tokens = $0.45
- Output: 15 × 1,000 = 15,000 tokens = $1.13
- **Total: ~$1.58/session**

**Monthly (1,000 users):**
- $1,580/month

**Optimization opportunities:**
- Use Sonnet for refinement phase: ~60% cost reduction
- Implement conversation summarization: ~40% token reduction
- Cache common patterns: ~20% reduction

**Target after optimization: $0.50-$0.75/session**
