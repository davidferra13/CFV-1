# Agent Handoff: Completion Contract Build

Read and execute `docs/palace-audit-build-spec.md`, section "AGENT 5: Completion Contract Build."

## Context

The Completion Contract is a P0 spec ready since 2026-04-17 (`docs/specs/completion-contract.md`). It wraps 20+ scattered completeness systems into a unified `CompletionResult` interface with recursive dependency resolution. Zero new DB tables; completion is derived, never stored.

ChefFlow currently has `getClientProfileCompleteness`, `getMenuHealthData`, `evaluateReadinessForTransition`, `getCriticalPath`, and many others, all with inconsistent interfaces. A chef cannot answer "is this event ready?" from one view. This spec unifies them.

## Your job

1. **Read the spec thoroughly:** `docs/specs/completion-contract.md`
2. **Read existing evaluators** it wraps. Find them with:
   - `grep -rn "getClientProfileCompleteness\|getMenuHealthData\|evaluateReadinessForTransition\|getCriticalPath" lib/`
3. **Build `lib/completion/`:**
   - `types.ts` - `CompletionResult` interface: `{ complete: boolean, score: number, total: number, items: CompletionItem[], children?: Record<string, CompletionResult> }`
   - `evaluators/event.ts` - Event completeness (wraps readiness gate + critical path)
   - `evaluators/menu.ts` - Menu completeness (wraps menu health data)
   - `evaluators/recipe.ts` - Recipe completeness (NEW: ingredients, instructions, yield, peak windows)
   - `evaluators/client.ts` - Client completeness (wraps profile completeness)
   - `engine.ts` - Recursive resolver: `getCompletion(entityType, entityId)` resolves deps
   - `actions.ts` - `'use server'` exports with auth gates + tenant scoping
4. **Build `components/completion/`:**
   - `completion-summary.tsx` - Visual completion ring/bar showing score + drill-down items
5. **Wire into existing pages:**
   - `app/(chef)/events/[id]/page.tsx` - Show event completion with recursive children
   - `app/(chef)/dashboard/page.tsx` - Completion widget for upcoming events
6. **Follow all CLAUDE.md rules:**
   - Auth gate on every server action
   - Tenant scoping on every DB query
   - Input validation
   - Cache busting where needed
   - No em dashes
   - No `@ts-nocheck`
7. **Test in real app** - Navigate to event detail, verify completion shows, verify recursive resolution

## Key Design Rules (from spec)

- Completion is DERIVED, never stored (no new tables)
- Each evaluator wraps an existing system; don't reinvent
- Recipe evaluator is the only genuinely new logic
- Fail open: if an evaluator errors, skip it (don't block the page)
- Score format: `completed/total` items, percentage

## Verification

- `npx tsc --noEmit --skipLibCheck` passes
- `npx next build --no-lint` passes
- Event detail page shows completion status
- Recursive resolution works: event shows gaps in menu/recipe/ingredient chain
