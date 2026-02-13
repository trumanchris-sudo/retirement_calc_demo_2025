import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({
          error: 'Claude API key not configured. Add ANTHROPIC_API_KEY to .env.local to enable AI reviews.',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { config, results, copilotMode, userQuestion, context, conversationHistory, pageState } = body || {};

    // Copilot mode allows questions without results (for general advice)
    if (!copilotMode && !pageState) {
      return new Response(
        JSON.stringify({ error: 'Missing page state data for QA review.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build the appropriate prompt based on mode
    const prompt = copilotMode
      ? buildCopilotPrompt(userQuestion, context, conversationHistory, config, results)
      : buildQAReviewPrompt(pageState);

    // Stream the response for a better UX
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: copilotMode ? 1000 : 1500,
            temperature: copilotMode ? 0.5 : 0.3,
            stream: true,
            messages: [{ role: 'user', content: prompt }],
          });

          for await (const event of response) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              const data = JSON.stringify({ type: 'text', text: event.delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          controller.close();
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: 'error', error: msg })}\n\n`)
          );
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
  } catch (error: unknown) {
    console.error('[AI Review] Error:', error);
    const msg = error instanceof Error ? error.message : 'Failed to generate review';
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

interface PageStateData {
  url: string;
  viewportWidth: number;
  viewportHeight: number;
  activeTab: string;
  visibleSections: string[];
  emptyContainers: string[];
  consoleErrors: string[];
  consoleWarnings: string[];
  missingImages: string[];
  brokenLinks: string[];
  accessibilityIssues: string[];
  overflowingElements: string[];
  hiddenButShouldShow: string[];
  interactiveElements: { tag: string; text: string; disabled: boolean; ariaLabel: string | null }[];
  colorContrastIssues: string[];
  computedStyles: string[];
  dataDisplayIssues: string[];
  darkMode: boolean;
  onboardingVisible: boolean;
  chartsRendered: string[];
  chartsMissing: string[];
  formValidationErrors: string[];
  componentTree: string;
  timestamp: string;
}

function buildQAReviewPrompt(pageState: PageStateData): string {
  return `You are a senior QA engineer and beta testing assistant for a web-based retirement calculator application. Your job is to analyze the current page state snapshot and identify real, actionable UI/UX issues.

INSTRUCTIONS:
- Analyze the page state data below for bugs, rendering problems, accessibility issues, and UX problems
- Be specific: reference exact elements, containers, and areas of the page
- Output a numbered list of issues found, ordered by severity (critical first)
- For each issue, include: what's wrong, where it is, and suggested fix
- If the page looks good, say so — but still note any minor improvements
- Focus ONLY on page quality issues. Do NOT analyze or comment on the user's financial data or retirement plan
- Keep total response under 600 words
- Format as a developer-friendly QA report

PAGE STATE SNAPSHOT:
- URL: ${pageState.url}
- Viewport: ${pageState.viewportWidth}x${pageState.viewportHeight}
- Dark Mode: ${pageState.darkMode ? 'ON' : 'OFF'}
- Active Tab: ${pageState.activeTab}
- Onboarding Visible: ${pageState.onboardingVisible}
- Timestamp: ${pageState.timestamp}

VISIBLE SECTIONS:
${pageState.visibleSections.length > 0 ? pageState.visibleSections.map(s => `  - ${s}`).join('\n') : '  (none detected)'}

CHARTS RENDERED:
${pageState.chartsRendered.length > 0 ? pageState.chartsRendered.map(c => `  - ${c}`).join('\n') : '  (none)'}

CHARTS EXPECTED BUT MISSING:
${pageState.chartsMissing.length > 0 ? pageState.chartsMissing.map(c => `  - ${c}`).join('\n') : '  (none)'}

EMPTY CONTAINERS (may indicate missing content):
${pageState.emptyContainers.length > 0 ? pageState.emptyContainers.map(e => `  - ${e}`).join('\n') : '  (none)'}

CONSOLE ERRORS:
${pageState.consoleErrors.length > 0 ? pageState.consoleErrors.map(e => `  - ${e}`).join('\n') : '  (none)'}

CONSOLE WARNINGS:
${pageState.consoleWarnings.length > 0 ? pageState.consoleWarnings.map(w => `  - ${w}`).join('\n') : '  (none)'}

MISSING IMAGES:
${pageState.missingImages.length > 0 ? pageState.missingImages.map(i => `  - ${i}`).join('\n') : '  (none)'}

BROKEN LINKS:
${pageState.brokenLinks.length > 0 ? pageState.brokenLinks.map(l => `  - ${l}`).join('\n') : '  (none)'}

ACCESSIBILITY ISSUES:
${pageState.accessibilityIssues.length > 0 ? pageState.accessibilityIssues.map(a => `  - ${a}`).join('\n') : '  (none detected)'}

OVERFLOWING/CLIPPED ELEMENTS:
${pageState.overflowingElements.length > 0 ? pageState.overflowingElements.map(o => `  - ${o}`).join('\n') : '  (none)'}

COLOR CONTRAST ISSUES:
${pageState.colorContrastIssues.length > 0 ? pageState.colorContrastIssues.map(c => `  - ${c}`).join('\n') : '  (none detected)'}

DATA DISPLAY INCONSISTENCIES:
${pageState.dataDisplayIssues.length > 0 ? pageState.dataDisplayIssues.map(d => `  - ${d}`).join('\n') : '  (none)'}

FORM VALIDATION ERRORS:
${pageState.formValidationErrors.length > 0 ? pageState.formValidationErrors.map(f => `  - ${f}`).join('\n') : '  (none)'}

INTERACTIVE ELEMENTS (sample):
${pageState.interactiveElements.length > 0 ? pageState.interactiveElements.slice(0, 20).map(el => `  - <${el.tag}> "${el.text}" disabled=${el.disabled} aria-label=${el.ariaLabel || 'MISSING'}`).join('\n') : '  (none found)'}

COMPONENT TREE SUMMARY:
${pageState.componentTree || '(not captured)'}

Provide your QA report in these sections:
1. CRITICAL ISSUES -- Bugs that block functionality or break the UI
2. RENDERING PROBLEMS -- Visual/layout issues, missing content, broken charts
3. ACCESSIBILITY -- Missing labels, contrast problems, keyboard navigation issues
4. WARNINGS -- Minor issues, potential improvements, edge cases
5. SUMMARY -- "Found N issues: [brief list]" one-liner at the end`;
}

/**
 * Build a prompt for the Financial Copilot conversational interface
 */
function buildCopilotPrompt(
  userQuestion: string,
  context: string,
  conversationHistory: string,
  config: Record<string, unknown> | undefined,
  results: Record<string, unknown> | undefined
): string {
  // Format results if available
  let resultsContext = '';
  if (results) {
    const r = results;
    const eolAccounts = r.eolAccounts as { taxable: number; pretax: number; roth: number } | undefined;
    const ruinPct = r.probRuin !== undefined ? (Number(r.probRuin) * 100).toFixed(1) : 'N/A';

    resultsContext = `
CALCULATION RESULTS:
- Balance at Retirement (Nominal): $${Number(r.finNom || 0).toLocaleString()}
- Balance at Retirement (Real): $${Number(r.finReal || 0).toLocaleString()}
- Year 1 Gross Withdrawal: $${Number(r.wd || 0).toLocaleString()}
- Year 1 After-Tax Income: $${Number(r.wdAfter || 0).toLocaleString()}
- Portfolio Survival: ${r.survYrs || 0}/${r.yrsToSim || 30} years
- End-of-Life Wealth (Real): $${Number(r.eolReal || 0).toLocaleString()}
- Monte Carlo Failure Rate: ${ruinPct}%
- Total Lifetime Tax: $${Number((r.tax as { tot: number })?.tot || 0).toLocaleString()}
- Net Estate: $${Number(r.netEstate || 0).toLocaleString()}
${eolAccounts ? `- Final Account Breakdown: Taxable $${eolAccounts.taxable.toLocaleString()}, Pre-tax $${eolAccounts.pretax.toLocaleString()}, Roth $${eolAccounts.roth.toLocaleString()}` : ''}`;
  }

  return `You are an expert AI Financial Advisor embedded in a retirement planning calculator. You have full access to the user's financial data and calculation results.

PERSONALITY & TONE:
- Be warm, approachable, and encouraging like a trusted advisor
- Use conversational language, not formal financial jargon
- Be specific and reference actual numbers from their data
- Provide actionable advice, not just observations
- If they're doing well, celebrate it! If there are concerns, be direct but supportive
- Keep responses focused and under 300 words unless they ask for detail
- Use bullet points and formatting for clarity when appropriate

${context || 'No financial context available.'}
${resultsContext}

${conversationHistory ? `RECENT CONVERSATION:\n${conversationHistory}\n` : ''}

USER'S QUESTION: ${userQuestion}

RESPONSE GUIDELINES:
1. Answer their specific question directly first
2. Reference specific numbers from their data to personalize the response
3. If relevant, suggest 1-2 actionable next steps they could take
4. If their question reveals a misunderstanding, gently correct it
5. If you suggest changes to their plan, explain the potential impact
6. Don't include generic disclaimers about seeking professional advice unless truly warranted
7. If results are not available, you can still give general guidance based on their configuration

Respond naturally as their personal financial advisor:`;
}
