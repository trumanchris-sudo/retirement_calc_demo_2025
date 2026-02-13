# CLAUDE.md — Constitutional Directives for Claude Code Agents

These rules apply to **all** Claude Code sessions working in this repository.

## Build & Quality Gates

- **Build must pass**: Run `npm run build` before committing. Zero errors required.
- **Lint must pass**: Run `npm run lint` — zero warnings, zero errors.
- **TypeScript strict mode**: No `any` types without an explicit `// Reason: ...` comment. Never use `@ts-ignore` or `@ts-expect-error` unless fixing a third-party type bug (document why).
- **No unused variables**: All variables and imports must be used. Run `npx tsc --noEmit` to verify.

## Code Patterns

- **Component library**: Use shadcn/ui components (`components/ui/`) and Tailwind CSS utilities. No inline styles.
- **Theming**: Use CSS variables via Tailwind (`text-foreground`, `bg-background`, `bg-muted`, etc.). Do not hardcode hex colors.
- **React patterns**: Prefer `'use client'` directive only when needed (hooks, event handlers, browser APIs). Keep server components where possible.
- **State management**: Use `PlanConfig` context (`usePlanConfig()`) as the single source of truth for calculator inputs. Do not create parallel state.

## Accessibility

- All interactive elements need `aria-label` attributes when the visible text is insufficient.
- All `<input>` elements need associated `<label>` elements (visible or `sr-only`).
- All images need `alt` text. Decorative icons use `aria-hidden="true"`.
- Minimum 44px touch targets on mobile (`min-h-[44px]`).
- Maintain semantic HTML: use `<button>` for actions, `<a>` for navigation, `<main>`/`<header>`/`<footer>` for landmarks.

## Security

- **No hardcoded secrets**: Use environment variables for API keys. Never commit `.env` files.
- `.env.local` is in `.gitignore` — keep it that way.

## Testing

- New features need tests. Test files use `.test.ts`, `.test.tsx`, `.spec.ts`, or `.spec.tsx` extensions.
- Place tests adjacent to the code they test or under `tests/`.
- Run `npm run test:coverage` to verify.

## Project Conventions

- **Package manager**: This project uses `npm` (not pnpm, not yarn). Use `npm ci` for installs, `npm run <script>` for scripts.
- **Node version**: 20 LTS minimum (Next.js 15 requirement).
- **File naming**: React components use PascalCase (`LandingPage.tsx`). Utilities use camelCase (`processOnboardingClientSide.ts`).
