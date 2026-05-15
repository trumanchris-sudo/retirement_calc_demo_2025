# SSOT Refactor Workplan

This note captures the current architecture diagnosis and the exact next workplan. It is intended as handoff context for future Codex/Claude sessions so the repo does not have to be re-analyzed from scratch.

## Current Diagnosis

The calculation layer is not the main problem. The shared math modules under `lib/calculations/shared/` are the strongest part of the codebase, and both the main retirement engine and the Monte Carlo worker use shared primitives.

The React/app layer is the problem. `PlanConfig` is intended to be the single source of truth, but `app/page.tsx` still acts as a giant orchestration and prop-drilling layer:

- `app/page.tsx` reads many `PlanConfig` fields into local constants.
- It creates many setter callbacks through `usePlanConfigSetters`.
- It passes a very large prop surface into `ConfigureTab`, `LegacyTab`, `ScenariosTab`, results panels, export/report flows, and tool sections.
- `ConfigureTab` receives plan state through props instead of reading/writing plan slices directly.
- Many add-on calculators are mounted near the planner but maintain local state islands, so they often do not participate in the user’s main plan data.

Important nuance: SSOT does not imply recalculating on every input change. The desired model is:

```text
User edits inputs -> PlanConfig updates -> current result is marked dirty
User clicks Calculate -> build immutable SimulationInputs snapshot -> run engine/worker
```

Avoid this model:

```text
Every PlanConfig update -> automatically rerun all retirement calculations
```

The existing app is already closer to the first model: expensive calculations run through explicit `calc()` calls, wizard completion, and a few deliberate scenario/stress paths. The refactor should preserve that.

## Verification Already Performed

- Local repo: `/Users/truman.chris/Documents/GitHub/retirement_calc_demo_2025`
- Remote: `https://github.com/trumanchris-sudo/retirement_calc_demo_2025.git`
- `main` matched `origin/main` at time of analysis.
- Pre-existing untracked file: `components/calculator/StudentLoanOptimizer.tsx.bak`
- Unit tests passed: 8 files, 212 tests.
- Production build failed after compiling because of lint errors:
  - `app/income-2026/page.tsx`: unused `effectiveTaxRate`
  - `components/integrations/PlaidConnect.tsx`: unused `email`
  - `lib/calculations/__tests__/socialSecurity.test.ts`: unused `atFRA`
- Local dependency mismatch observed:
  - `package.json` / `package-lock.json` expect Next `16.1.6`
  - installed `node_modules/next` was `15.1.9`

## Refactor Goals

1. Keep `PlanConfig` as canonical editable plan state.
2. Introduce a clean snapshot boundary between editable state and calculation execution.
3. Reduce `app/page.tsx` from orchestration hub to mostly layout/rendering.
4. Eliminate giant prop drilling into form tabs.
5. Classify add-on calculators by integration level instead of treating all tools as equal.
6. Preserve explicit calculate behavior and avoid automatic full Monte Carlo reruns on ordinary input edits.

## Exact Workplan

### Phase 0: Stabilize Environment

1. Run `npm install` to reconcile `node_modules` with `package-lock.json`.
2. Re-run `npm ls next --depth=0` and confirm Next is `16.1.6`.
3. Fix the three lint errors listed above.
4. Re-run:

```bash
npm run test -- --run
npm run build
```

Do not touch `components/calculator/StudentLoanOptimizer.tsx.bak` unless explicitly asked.

### Phase 1: Create the Plan Snapshot Adapter

Create a pure adapter module, likely:

```text
lib/plan-config-to-simulation-inputs.ts
```

or:

```text
lib/calculations/buildSimulationInputs.ts
```

It should export something like:

```ts
export function buildSimulationInputs(
  planConfig: PlanConfig,
  options?: {
    defaults?: PlanConfig;
    bondGlidePath?: BondGlidePath | null;
    historicalYearOverride?: number | null;
    inflationShockRateOverride?: number | null;
    inflationShockDurationOverride?: number;
  }
): SimulationInputs
```

Rules:

- All fallback defaults must come from `createDefaultPlanConfig()`.
- Preserve valid zero values with `??`, not `||`.
- Include every field currently assembled inside `useCalculation`.
- Keep this function pure: no React, no localStorage, no worker access, no mutation.
- Add unit tests proving defaults, married/single spouse fields, stress override behavior, healthcare/LTC fields, Roth conversion fields, child fields, and bond glide path behavior.

This is the highest-leverage step because it creates a single boundary:

```text
PlanConfig -> SimulationInputs
```

### Phase 2: Use the Adapter in Calculation Paths

Refactor `hooks/useCalculation.ts` so `calc()` calls `buildSimulationInputs(planConfig, { bondGlidePath })` instead of manually destructuring/reassembling all input fields.

Then update the related calculation paths:

- `calculateSensitivity`
- `useComparison`
- any direct `runSingleSimulation` calls that are supposed to represent the current main plan

Keep explicit calculate behavior. Do not add automatic recalculation for every PlanConfig edit.

### Phase 3: Add Calculated Snapshot Tracking

Introduce a stable hash or version for the calculated plan snapshot.

Recommended model:

- `PlanConfig` remains editable state.
- On successful `calc()`, store:
  - `lastCalculatedConfigHash`
  - `lastCalculatedAt`
  - maybe `lastCalculatedInputs`
- On input changes, compare current config hash to `lastCalculatedConfigHash`.
- If different, show “inputs changed, recalculate” and mark results dirty.

This should replace scattered dirty/modified logic where possible, but do it incrementally.

### Phase 4: Extract Page Controller

Create a hook such as:

```text
hooks/useRetirementAppController.ts
```

It should own the orchestration currently stuffed into `app/page.tsx`:

- tab state
- wizard completion behavior
- refs
- result state hooks
- worker hook
- AI insight hook
- calculation hook
- save/load scenario handlers
- export/report input assembly, ideally from the snapshot adapter

Target outcome:

- `app/page.tsx` becomes a render composition layer.
- Business orchestration moves to the controller hook.
- No behavior changes in this phase unless needed to preserve correctness.

### Phase 5: De-Prop-Drill ConfigureTab

Move `ConfigureTab` from prop-driven plan state to direct plan slice consumption.

Recommended order:

1. Personal info section.
2. Balances section.
3. Contributions section.
4. Return/withdrawal assumptions.
5. Social Security.
6. Healthcare/LTC.
7. Roth conversion.
8. Bond glide path.

Use existing `usePlanConfigSetters` or improved field setters at first. Do not attempt a perfect store implementation in the same phase.

After each section migration:

- Remove now-unused props from `ConfigureTabProps`.
- Remove matching constants/setters from `app/page.tsx` if no longer needed elsewhere.
- Run focused TypeScript/build checks.

### Phase 6: Classify Add-On Calculators

Create an integration inventory for every tool in `components/calculator/` and section wrappers under `components/calculator/tabs/`.

Classify each tool as one of:

1. **Integrated Plan Module**
   - Reads from `PlanConfig`.
   - Writes durable changes back to `PlanConfig` when the user applies a recommendation.
   - Examples to aim for: `CollegePlanner`, `SpendingAnalysis`, `ScenarioComparison`.

2. **Context-Aware What-If Tool**
   - Prefills from `PlanConfig`.
   - Uses local state for sandbox assumptions.
   - Does not mutate main plan unless user clicks an explicit “Apply to plan” action.
   - This is probably the right model for many add-ons.

3. **Standalone Educational Tool**
   - Keeps local state.
   - Clearly labeled as standalone.
   - Should not imply it affects the main retirement projection.

Do not force every add-on into full SSOT. That would make the product worse. The key is truthful boundaries and explicit “Apply” moments.

### Phase 7: Improve Context Performance

The existing `usePlanConfigSelectors.ts` hooks are not true context selectors. Because they call `usePlanConfig()`, they still re-render whenever the provider value changes; `useMemo` only reduces recomputation after render.

Later options:

- Split PlanConfig provider into smaller domain providers.
- Use `useSyncExternalStore` with selector support.
- Introduce a small store library only if the team accepts the dependency.

Do this after the snapshot/controller work, not before.

## Agent Deployment Strategy

This refactor can be accelerated with multiple agents, but only if each agent has a narrow ownership boundary. Avoid sending multiple agents into `app/page.tsx`, `hooks/useCalculation.ts`, or `components/calculator/tabs/ConfigureTab.tsx` at the same time unless one agent is explicitly coordinating the merge.

### Operating Principles

- Use one coordinator agent as the integration owner.
- Use explorer agents first to produce inventories and risk maps without editing files.
- Use worker agents only on disjoint file sets.
- Keep every worker prompt bounded by explicit files/modules it may edit.
- Tell every worker that other agents may be active and that it must not revert unrelated changes.
- Prefer small commits/patches that compile independently.
- Run tests after each integrated patch, not only at the end.

### Recommended Agent Waves

#### Wave 1: Reconnaissance

Run these agents in parallel before implementation.

**Agent A: Calculation Snapshot Scout**

Charter:

- Inspect `hooks/useCalculation.ts`, `hooks/useComparison.ts`, `components/calculator/RothComparison.tsx`, `components/calculator/ScenarioComparison.tsx`, and `components/calculator/WhatIfScenarios.tsx`.
- List every place current plan fields are converted into `SimulationInputs`.
- Identify which paths should use the new adapter and which are true standalone what-if tools.

Output:

- File/function map.
- Adapter requirements.
- Any behavior traps, especially around seed handling, stress tests, and generational wealth.

No edits.

**Agent B: ConfigureTab Prop Surface Scout**

Charter:

- Inspect `app/page.tsx` and `components/calculator/tabs/ConfigureTab.tsx`.
- Group all props by UI section: personal, balances, contributions, assumptions, Social Security, healthcare/LTC, Roth, bonds.
- Identify which props are still needed by `app/page.tsx` outside `ConfigureTab`.

Output:

- Section-by-section removal plan.
- Safe migration order.
- Any props that cannot yet be removed because other page features still depend on them.

No edits.

**Agent C: Add-On Tool Inventory Scout**

Charter:

- Inventory every tool in `components/calculator/` and section wrappers in `components/calculator/tabs/`.
- Classify each as Integrated Plan Module, Context-Aware What-If Tool, or Standalone Educational Tool.
- Identify tools that already read `PlanConfig` and tools with pure local state.

Output:

- CSV/Markdown table with tool, current data source, desired category, proposed next action.
- Top 10 tools to integrate first by product value.

No edits.

**Agent D: Build Hygiene Scout**

Charter:

- Reconcile the environment/build blockers.
- Confirm Next version mismatch cause.
- Identify exact lint fixes needed for a successful `npm run build`.

Output:

- Minimal build-fix patch recommendation.
- Whether `npm install` alone resolves the Next version mismatch.

No edits unless explicitly assigned the build hygiene patch.

### Wave 2: Foundational Implementation

These should happen mostly sequentially because they establish shared contracts.

**Worker 1: Snapshot Adapter Owner**

Write scope:

- New adapter module, preferably `lib/calculations/buildSimulationInputs.ts` or `lib/plan-config-to-simulation-inputs.ts`.
- New tests for that adapter.
- Export barrel updates only if needed.

Do not edit:

- `app/page.tsx`
- `ConfigureTab.tsx`
- add-on calculators

Deliverable:

- Pure `buildSimulationInputs(planConfig, options)` function.
- Tests for defaults, zero preservation, married/single behavior, stress overrides, healthcare/LTC, Roth conversion, children, and bond glide path.

**Worker 2: Build Hygiene Owner**

Write scope:

- Only the files required to fix the known build blockers:
  - `app/income-2026/page.tsx`
  - `components/integrations/PlaidConnect.tsx`
  - `lib/calculations/__tests__/socialSecurity.test.ts`
  - package install artifacts if `npm install` updates lockfile consistently

Do not edit:

- calculation architecture
- page/controller refactor files
- `StudentLoanOptimizer.tsx` or `.bak`

Deliverable:

- `npm run test -- --run` passes.
- `npm run build` passes or has a documented external blocker.

### Wave 3: Calculation Path Migration

Run after the adapter is merged.

**Worker 3: useCalculation Migration Owner**

Write scope:

- `hooks/useCalculation.ts`
- adapter tests if small adjustments are needed

Task:

- Replace manual `SimulationInputs` assembly in `calc()` with the adapter.
- Keep local derived values that are not part of `SimulationInputs` only where needed.
- Preserve explicit calculate behavior and seed behavior.

Verification:

- Unit tests.
- Focused manual check that Calculate still runs and results still render.

**Worker 4: Comparison/Sensitivity Migration Owner**

Write scope:

- `hooks/useComparison.ts`
- sensitivity path inside `hooks/useCalculation.ts` only if coordinated with Worker 3, otherwise wait.
- Direct simulation components only if the scout marked them as main-plan calculations.

Task:

- Use the adapter for current-plan simulation snapshots.
- Leave standalone what-if calculators local unless they represent the main plan.

### Wave 4: Page Controller Extraction

This should be one worker plus coordinator review, not many workers.

**Worker 5: Retirement Controller Owner**

Write scope:

- New `hooks/useRetirementAppController.ts`
- `app/page.tsx`
- small type exports if needed

Task:

- Move orchestration out of `app/page.tsx` without changing UI behavior.
- Start with tab state, refs, result hooks, worker hooks, AI hook, calculation hook, scenario handlers, and export/report helpers.
- Keep render JSX mostly in `app/page.tsx`.

Risk:

- High merge-conflict risk.
- Do this after adapter work is stable.

### Wave 5: ConfigureTab De-Prop-Drilling

This can be parallelized only by section once the coordinator has created a clear section boundary.

**Worker 6A: Personal/Balances Section**

Write scope:

- `components/calculator/tabs/ConfigureTab.tsx`
- maybe a new `components/calculator/configure/PersonalSection.tsx`
- maybe a new `components/calculator/configure/BalancesSection.tsx`

Task:

- Move personal info and balances to direct `PlanConfig` access.
- Remove corresponding props only after compile confirms no other usage.

**Worker 6B: Contributions/Assumptions Section**

Write scope:

- New configure section components only, or wait for 6A structure.

Task:

- Move annual contributions, return assumptions, withdrawal assumptions.

**Worker 6C: Benefits/Healthcare Section**

Write scope:

- New configure section components only, or wait for 6A structure.

Task:

- Move Social Security, Medicare, LTC, Roth conversion.

**Worker 6D: Bonds Section**

Write scope:

- Bond/glide path configure section.
- Possibly shared bond derived hook if needed.

Task:

- Move bond allocation controls and preserve age/bondStartAge sync behavior from `usePlanConfigSetters`.

Integration rule:

- Only one worker should remove props from `ConfigureTabProps` at a time. Section workers may create direct-reading subcomponents in parallel, but the coordinator should do final prop deletion.

### Wave 6: Add-On Tool Integration

Run this after the tool inventory is reviewed.

Assign one worker per category or product area:

- student loans and debt trade-offs
- FIRE/early retirement tools
- tax optimization tools
- healthcare and Social Security tools
- spending/budget tools
- estate/family tools
- visualizations/gamification

Each worker should:

- Convert only chosen high-value tools.
- Add explicit “Apply to Plan” actions for durable mutations.
- Keep sandbox/local state for exploratory what-if assumptions.
- Label true standalone tools honestly.

Avoid broad rewrites. Most add-ons should become context-aware, not fully plan-owned.

### StudentLoanOptimizer Placement

`components/calculator/StudentLoanOptimizer.tsx` should be treated as a **Context-Aware What-If Tool**, not as part of the core retirement simulation engine.

Current state:

- It is mounted in `app/page.tsx` inside the Planning Tools tab as `<StudentLoanOptimizer />`.
- It has no props and does not read `PlanConfig`.
- It keeps local state for loans, annual income, family size, extra payment, PSLF, refinance assumptions, employer repayment benefit, employer match, and retirement contribution percentage.
- The untracked `components/calculator/StudentLoanOptimizer.tsx.bak` appears to be an older version before accessibility label/id improvements. Do not restore it over the tracked file without explicit review.

Desired role:

- Prefill from `PlanConfig` where possible:
  - `annualIncome` from `primaryIncome + spouseIncome` or primary income only, depending on filing/family assumptions.
  - `familySize` from marital status plus children count.
  - retirement contribution percentage from `cPre1 / primaryIncome` when available.
  - employer match presence/amount from `cMatch1` and income-derived percentages.
- Keep loan details local at first because `PlanConfig` does not currently model debts/student loans.
- Add a clear “Apply to Plan” action only for changes that should affect the main plan, for example:
  - increase pre-tax contribution enough to capture match;
  - adjust taxable/pre-tax contribution assumptions after comparing extra loan payoff vs investing;
  - optionally write a future `studentLoanMonthlyPayment`/debt field if the PlanConfig schema is intentionally expanded.
- Do not make every slider in this tool durable plan state.
- Do not wire student loans into Monte Carlo until the product decision is made to model debt cash flows directly in `SimulationInputs`.

Recommended first integration step:

```text
Add optional initial props or direct PlanConfig prefill to StudentLoanOptimizer, while keeping loan scenarios local.
```

Recommended eventual schema discussion:

```ts
studentLoans?: Array<{
  name: string;
  balance: number;
  interestRate: number;
  minimumPayment: number;
  loanType: 'federal' | 'private';
}>;
monthlyDebtPayments?: number;
```

Only add schema fields if the main planner will actually use them for cash-flow modeling or expense planning. Otherwise the tool should remain context-aware and local.

### Wave 7: Performance Store Upgrade

Only begin after the UI is simpler.

**Worker 7: PlanConfig Store Owner**

Write scope:

- `lib/plan-config-context.tsx`
- `hooks/usePlanConfigSelectors.ts`
- related tests

Task:

- Replace fake memoized selectors with true selector behavior via smaller contexts or `useSyncExternalStore`.
- Preserve public hook API where practical.

Risk:

- High blast radius.
- Do not combine with ConfigureTab migration.

## Coordination Checklist

Before starting a worker:

- State exact write scope.
- State exact files it must not touch.
- State verification commands.
- Remind it not to revert unrelated changes.

Before merging a worker patch:

- Check `git diff --stat`.
- Inspect touched files for scope creep.
- Run at least `npm run test -- --run`.
- Run `npm run build` after build hygiene is complete.
- Confirm `StudentLoanOptimizer.tsx.bak` remains untouched unless explicitly requested.

Suggested integration order:

1. Build hygiene.
2. Snapshot adapter.
3. `useCalculation` adapter migration.
4. Comparison/sensitivity migration.
5. Controller extraction.
6. ConfigureTab sections.
7. Add-on tools.
8. Context performance store.

## Non-Goals

- Do not rewrite the calculation engine.
- Do not remove the web worker.
- Do not auto-run full Monte Carlo on every input edit.
- Do not make every add-on calculator durable SSOT state by default.
- Do not delete or overwrite `StudentLoanOptimizer.tsx.bak` without explicit permission.

## Best Next Commit

A good first commit would be:

```text
Add PlanConfig-to-SimulationInputs adapter and tests
```

Expected files:

- New adapter module.
- New unit tests for adapter behavior.
- `useCalculation.ts` updated to use the adapter for `calc()`.
- Possibly `useComparison.ts` updated if the adapter shape is clean enough.

Keep that commit small. It creates the architectural boundary without trying to untangle the full UI at once.

## Execution Log

### 2026-05-15: Initial Codex Refactor Slice

Completed:

- Ran `npm install` to reconcile local `node_modules` with the lockfile. Installed Next now matches `16.1.6`.
- Fixed the known build/lint hygiene issues:
  - removed unused `effectiveTaxRate` in `app/income-2026/page.tsx`;
  - marked waitlist email as intentionally unused in `components/integrations/PlaidConnect.tsx`;
  - removed unused `atFRA` in `lib/calculations/__tests__/socialSecurity.test.ts`.
- Added `lib/calculations/buildSimulationInputs.ts`.
- Added `lib/calculations/__tests__/buildSimulationInputs.test.ts`.
- Migrated `hooks/useCalculation.ts`:
  - main `calc()` path now builds worker inputs through `buildSimulationInputs(planConfig, { bondGlidePath })`;
  - `calculateSensitivity()` now uses the same adapter for its baseline/current-plan snapshot.
- Migrated `hooks/useComparison.ts`:
  - comparison baseline/bear/inflation scenarios now use `buildSimulationInputs()` and current `PlanConfig`;
  - removed the large manually-passed simulation input prop bundle from the `useComparison()` call in `app/page.tsx`.

Verification:

```bash
npm run test -- --run
npm run build
npx tsc --noEmit
```

Results:

- Unit tests passed: 9 files, 220 tests.
- Production build passed under Next `16.1.6`.
- TypeScript validation passed.

Known warnings/blockers remaining:

- `npx eslint ...` does not currently run because the project has ESLint 9 installed but no `eslint.config.*` flat config.
- Next emits a workspace-root warning because another lockfile exists at `/Users/truman.chris/package-lock.json`; the app still builds.
- `baseline-browser-mapping` warns its data is older than two months; this does not block build.
- `components/calculator/StudentLoanOptimizer.tsx.bak` remains untracked and untouched.

Recommended next commit message:

```text
Add PlanConfig simulation snapshot adapter
```

Recommended next implementation step:

```text
Add calculated snapshot hash tracking so input edits mark results dirty without implying auto-recalculation.
```

### 2026-05-15: Agent-Assisted Refactor Slice

Agents deployed:

- Calculation Snapshot Scout inspected the result/dirty-state flow and confirmed the normalized `SimulationInputs` hash boundary.
- ConfigureTab Prop Surface Scout grouped the form props by section and recommended internalizing all PlanConfig-backed form state before extracting sections.
- Add-On Tool Inventory Scout classified high-value tools and confirmed `StudentLoanOptimizer` should be a context-aware what-if tool, not a core engine module.

Completed:

- Added stable snapshot hashing to `lib/calculations/buildSimulationInputs.ts`:
  - `hashSimulationInputs(inputs)`;
  - `hashPlanSimulationInputs(planConfig, options)`.
- Extended `hooks/useCalculatorResults.ts` with `calculatedSnapshotHash` and session persistence for the result/hash pair.
- Updated `hooks/useCalculation.ts` so a successful calculation stores the exact normalized input hash used by the worker/engine.
- Updated `app/page.tsx` so stale-result UI compares current PlanConfig-derived `SimulationInputs` against the last calculated snapshot instead of relying only on scattered manual dirty flags.
- Refactored `components/calculator/tabs/ConfigureTab.tsx` to read PlanConfig and create setters internally. `app/page.tsx` now passes only shell/action props to the tab.
- Updated `components/calculator/StudentLoanOptimizer.tsx` to prefill from PlanConfig for household income, family size, employer match, and current retirement contribution, while keeping loan scenarios local and advisory.
- Left `components/calculator/StudentLoanOptimizer.tsx.bak` untouched.

Verification:

```bash
npm run test -- --run
npx tsc --noEmit
npm run build
```

Results:

- Unit tests passed: 9 files, 223 tests.
- TypeScript validation passed.
- Production build passed under Next `16.1.6`.
- Browser smoke test passed against `http://127.0.0.1:3000` using local Chrome:
  - Plan Setup form opened;
  - ConfigureTab fields accepted edits after internalization;
  - Calculate button remained visible;
  - All-in-One rendered `StudentLoanOptimizer`;
  - StudentLoanOptimizer showed the PlanConfig-backed “Using plan profile” state;
  - no browser console warnings/errors apart from the known favicon-style 404 in an earlier page-load check.

Known warnings/blockers remaining:

- `npx eslint ...` still does not run because the project has ESLint 9 installed but no `eslint.config.*` flat config.
- Next still emits a workspace-root warning because another lockfile exists at `/Users/truman.chris/package-lock.json`.
- `baseline-browser-mapping` still warns its data is older than two months.
- Full `useRetirementAppController` extraction remains intentionally deferred; it has high merge/blast radius and is safer after the snapshot and ConfigureTab boundary are stable.

Recommended next commit message:

```text
Add calculated snapshot tracking and context-aware tools
```
