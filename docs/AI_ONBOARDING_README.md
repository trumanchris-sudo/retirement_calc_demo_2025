# AI-Powered Onboarding System

## Overview

The retirement calculator now features an AI-powered conversational onboarding system that replaces the traditional 4-step wizard. Using Claude Opus 4.5, users have a natural conversation to set up their retirement plan.

## Features

### 🤖 Intelligent Conversation
- Natural language interaction powered by Claude Opus 4.5
- Context-aware follow-up questions
- Automatic data extraction from conversation
- Smart assumptions based on financial planning best practices

### 📊 Transparent Assumptions
- All assumptions displayed with one-sentence reasoning
- Confidence levels (high/medium/low) for each assumption
- User-provided data clearly marked vs. inferred data
- Natural language refinement loop

### 💾 Auto-Save & Resume
- Conversation state saved to localStorage
- Resume onboarding from where you left off
- Clear localStorage on completion or skip

### 🎨 Modern Console UI
- Dark gradient background with soft glows
- Chat-style message bubbles
- Real-time streaming responses with typing animation
- Progress sidebar showing extracted data
- Terminal-style input field

## Setup

### 1. Environment Variables

Add your Anthropic API key to `.env.local`:

```bash
ANTHROPIC_API_KEY=sk-ant-api03-your-actual-key-here
```

Get your API key from: https://console.anthropic.com/

### 2. Install Dependencies

The AI onboarding system requires the Anthropic SDK:

```bash
npm install @anthropic-ai/sdk
```

This should already be installed if you've run `npm install`.

### 3. Verify Setup

Start the development server:

```bash
npm run dev
```

Open the app and trigger the onboarding wizard. You should see the AI console interface.

## Usage

### User Flow

1. **Greeting Phase**: AI introduces itself and asks basic questions
2. **Data Collection**: Guided questions to gather:
   - Personal info (age, marital status, state)
   - Family (number of children, ages)
   - Employment (W-2, self-employed, income)
   - Portfolio (emergency fund, retirement accounts)
   - Savings (annual contributions)
   - Goals (retirement age, desired spending)
3. **Assumptions Review**: AI presents all assumptions for review
4. **Refinement**: User can correct any assumptions via natural language
5. **Complete**: Data populates the calculator automatically

### Skip Option

Users can click "Skip to Manual Entry" at any time to:
- Exit the AI onboarding
- Manually fill in calculator fields
- Clear localStorage conversation state

## Data Collected

### Required Fields
- Age
- Marital status
- Annual income
- Target retirement age

### Optional Fields
- Spouse age (if married)
- State of residence
- Number of children & ages
- Additional children expected
- Employment type (W-2, self-employed, both, retired, other)
- Current portfolio balances:
  - Emergency fund (yields inflation rate only)
  - Taxable brokerage
  - Traditional 401k/IRA
  - Roth 401k/IRA
- Annual savings contributions by account type
- Desired retirement spending

## Assumptions Generated

When data is missing, the AI generates assumptions based on:

1. **Employer Match**: Assumes 50% match up to 6% of salary (industry standard)
2. **Savings Rates**: 10-20% based on income level
3. **State Tax**: Lookup table by state code
4. **Emergency Fund**: 3 months of expenses if not specified
5. **Retirement Age**: Based on current age and income profile
6. **Return Assumptions**:
   - 9.8% nominal return (historical S&P 500)
   - 2.6% inflation (long-term average)
   - 2.0% dividend yield
7. **Social Security**: Enabled by default, claims at age 67

## Cost & Performance

### API Costs (estimated)
- **Per session**: ~$1.58
  - Input tokens: 30,000 @ $15/1M = $0.45
  - Output tokens: 15,000 @ $75/1M = $1.13
- **Target after optimization**: $0.50-0.75

### Optimization Strategies
1. Use Claude Sonnet for refinement phase (60% cost reduction)
2. Implement conversation summarization (40% token reduction)
3. Cache common response patterns (20% reduction)
4. Limit max_tokens dynamically by phase

### Performance
- Streaming response start: <2 seconds
- Average completion time: 3-5 minutes
- Auto-save prevents data loss

## Technical Architecture

### Components

```
components/onboarding/
├── AIConsole.tsx              # Main console container
├── MessageBubble.tsx          # Chat message display
├── StreamingMessage.tsx       # Animated streaming text
├── AssumptionsReview.tsx      # Assumptions display & refinement
├── ConsoleInput.tsx           # Terminal-style input field
├── DataSummaryPanel.tsx       # Real-time progress sidebar
└── OnboardingWizard.tsx       # Dialog wrapper (updated)
```

### API Route

```
app/api/ai-onboarding/route.ts
```

- Accepts: Conversation history, extracted data, current phase
- Returns: Server-Sent Events stream
- Events: message_delta, data_update, assumption_added, phase_transition, complete

### Data Flow

1. User message → `streamAIOnboarding()` → API endpoint
2. Claude processes with tool calling
3. Stream events back to client:
   - `message_delta`: Text chunks for display
   - `data_update`: Extracted field values
   - `assumption_added`: Generated assumptions
   - `phase_transition`: Move to next phase
   - `complete`: Finalize and close
4. `mapAIDataToCalculator()` converts to calculator state
5. Populate main calculator fields

### Tool Calling

The API uses three Claude tools:

1. **update_extracted_data**: Update user data fields
2. **add_assumption**: Record inferred values with reasoning
3. **transition_phase**: Move conversation forward

## Customization

### System Prompts

Edit `/app/api/ai-onboarding/route.ts` function `buildSystemPrompt()` to customize:
- Conversation style and tone
- Phase-specific instructions
- Assumption generation rules
- Required vs. optional fields

### Styling

UI components use Tailwind classes. Key theme elements:
- Background: `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950`
- Message bubbles: `bg-slate-800/80 backdrop-blur`
- AI avatar: Blue-purple gradient
- User avatar: Green-emerald gradient
- Input field: Monospace font, slate theme

### Assumptions Logic

Edit `/lib/aiOnboardingMapper.ts` to adjust:
- Default values for missing fields
- Calculation formulas (e.g., employer match)
- State tax rates
- Savings rate recommendations
- Retirement age suggestions

## Special Notes

### Emergency Fund
- **Separate from taxable brokerage**
- **Yields inflation rate only** (no market exposure)
- Preserves real dollar value for liquidity needs

### Children Data
- Used primarily for **legacy/generational wealth** calculations
- Note to users: **"College savings planning not included in this calculator"**

### Employment Type
- Confirms W-2 employee vs. self-employed (1099)
- Used to auto-populate income calculators (future feature)
- Affects tax planning recommendations

## Troubleshooting

### API Errors

**Error: "ANTHROPIC_API_KEY not set"**
- Add key to `.env.local`
- Restart dev server

**Error: "Rate limit exceeded"**
- Anthropic API has usage limits
- Upgrade API tier or implement rate limiting

**Error: "Streaming failed"**
- Check network connection
- Verify API key is valid
- Check browser console for CORS issues

### UI Issues

**Console not loading**
- Check browser console for errors
- Verify all component dependencies installed
- Check Dialog component from shadcn/ui

**Messages not streaming**
- Check network tab for SSE connection
- Verify API route is responding
- Check for browser extensions blocking SSE

**LocalStorage not persisting**
- Check browser privacy settings
- Verify localStorage is enabled
- Check for incognito/private mode

## Future Enhancements

### Phase 4.2: Income Calculator Auto-Population
- Detect employment type during conversation
- Pre-fill 2026 Income Calculator (W-2)
- Pre-fill 2026 Self-Employed Calculator (1099)
- Sync income data across all calculators

### Conversation Optimization
- Implement conversation summarization
- Cache frequently used responses
- Switch to Sonnet for refinement phase
- Add conversation export/resume feature

### Analytics
- Track completion rates
- Monitor average conversation length
- Measure assumption accuracy
- Identify common user questions

### UX Improvements
- Add example questions/prompts
- Voice input support
- Multi-language support
- Mobile-optimized layout

## Documentation Links

- [Work Plan](./AI_ONBOARDING_WORKPLAN.md) - Full 7-phase implementation plan
- [Anthropic Documentation](https://docs.anthropic.com) - Claude API reference
- [Tool Use Guide](https://docs.anthropic.com/claude/docs/tool-use) - Function calling
