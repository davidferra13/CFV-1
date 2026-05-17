# ORCHESTRATION MISSION: Architecture Deepening (5 Candidates)

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `CONTEXT.md` (domain glossary, mandatory vocabulary)
- `lib/clients/actions.ts` (lines 708-938: the updateClient side-effect chain)
- `lib/clients/index.ts` (580-line barrel to decompose)
- `lib/interface/action-layer.ts` (2,396-line type reshaping layer to collapse)
- `lib/dietary/` (10 files: the consolidation target)
- `app/(chef)/dashboard/page.tsx` (2,466-line god page)
- `app/(chef)/events/[id]/page.tsx` (1,825-line god page)

## Session Decisions (Do Not Re-Debate)

- These are REFACTORS, not rewrites. Behavior must not change. Tests must still pass.
- Use CONTEXT.md vocabulary for domain terms, architecture language for structural terms (module, interface, seam, depth, locality, leverage).
- The "deletion test" is the quality bar: if removing a module would just move complexity to callers, the module is shallow. Kill it or deepen it.
- Barrel files are not inherently bad; they're bad when they export 200+ symbols with no coherent interface. A barrel with 10-15 curated exports is fine.
- The `interface/action-layer.ts` approach (centralized type reshaping) is the wrong seam. Types belong to their source domain.
- The Client Mutation Pipeline is the HIGHEST VALUE target (untested, silent failures, cross-domain leakage).
- God pages decompose into deep server components, not into more barrel imports.
- `isMissingSoftDeleteColumn` pattern appearing 15+ times is tech debt but OUT OF SCOPE for this swarm (separate cleanup).
- 67 redirect-only pages are also OUT OF SCOPE (separate URL alias cleanup).

## Wave 1 (Parallel - Launch Immediately)

### Agent 1: Client Barrel Interface Curation

- **Model:** haiku
- **Task:** Decompose `lib/clients/index.ts` from a 580-line phonebook into a coherent module interface. The barrel should export ONLY the 10-15 functions that constitute the stable "client domain API" (CRUD, search, stats). Everything else becomes a direct import from its sub-module. Update all consumers (grep for `from '@/lib/clients'` or `from '@/lib/clients/index'`) to import from the specific sub-module instead.
- **Read first:** `lib/clients/index.ts`, then `grep -r "from '@/lib/clients'" --include="*.ts" --include="*.tsx"` to find all consumers
- **Constraints:**
  - Do NOT change any function signatures or behavior
  - Do NOT rename files
  - The remaining barrel exports should be: `createClient`, `getClients`, `getClientById`, `updateClient`, `deleteClient`, `restoreClient`, `getClientsWithStats`, `getClientWithStats`, `searchClientsQuick`, `searchClientsByName` (the core CRUD interface)
  - All type exports stay in barrel (types are free, they don't add runtime coupling)
  - Run `npx tsc --noEmit --skipLibCheck` after changes
- **Done when:** `lib/clients/index.ts` is under 80 lines, all consumers compile, `npx tsc --noEmit --skipLibCheck` passes

### Agent 2: Action-Layer Domain Repatriation

- **Model:** opus
- **Task:** Collapse `lib/interface/action-layer.ts` (2,396 lines) by moving each type/function back to its source domain. The file currently reshapes types from 12+ domains into UI-facing shapes. Each domain should export its own view type instead.
- **Read first:** `lib/interface/action-layer.ts` (full file), then identify every domain it imports from. For each domain, check what types it reshapes.
- **Steps:**
  1. For each domain imported (availability, booking, clients, google, onboarding, events, queue, scheduling, workflow, wix), create a `{domain}/view-types.ts` file exporting the UI-facing type that action-layer currently defines
  2. Move the reshaping logic (any functions, not just types) into the source domain
  3. Update all consumers of action-layer to import from the source domain instead
  4. If `lib/interface/surface-completeness.ts` (2,542 lines) follows the same pattern, apply the same treatment
  5. Delete `lib/interface/action-layer.ts` when empty (or reduce to <50 lines if some truly cross-cutting types remain)
- **Constraints:**
  - Types that genuinely span multiple domains (e.g., `SurfaceActionTask` used by 5+ domains) can stay in a thin `lib/interface/shared-types.ts` (<100 lines max)
  - Do NOT change runtime behavior
  - Run `npx tsc --noEmit --skipLibCheck` after changes
- **Done when:** `lib/interface/action-layer.ts` is deleted or under 50 lines, no domain-specific types remain in the interface module, tsc passes

---

## Wave 2 (After Wave 1 Verified)

### Agent 3: Client Mutation Pipeline + Dietary Consolidation

- **Model:** opus
- **Task:** Extract the side-effect chain from `updateClient` (lines 810-938) into a deep `ClientMutationPipeline` module, AND consolidate scattered dietary logic into `lib/dietary/` as the single authority.
- **Read first:**
  - `lib/clients/actions.ts` lines 708-938 (the updateClient function)
  - `lib/dietary/` (all 10 files)
  - `lib/clients/dietary-alert-actions.ts`
  - `lib/events/dietary-conflict-actions.ts`
  - `lib/events/dietary-context-actions.ts`
  - `lib/dinner-circles/dietary-reminder-actions.ts`
  - `lib/analytics/dietary-trends.ts`
  - `lib/intelligence/dietary-trends.ts`
- **Architecture:**
  1. Create `lib/clients/mutation-pipeline.ts` with interface:
     ```typescript
     export async function executeClientMutation(params: {
       tenantId: string
       actorId: string
       clientId: string
       patch: UpdateClientInput
       previousState: ClientRecord
       db: SupabaseClient
     }): Promise<MutationResult>
     ```
  2. Inside the pipeline, each side-effect becomes a named step with explicit error handling:
     ```typescript
     type MutationStep = {
       name: string
       critical: boolean // true = failure rolls back, false = failure logs warning
       execute: () => Promise<void>
     }
     ```
  3. The pipeline reports which steps succeeded/failed (observable, testable)
  4. Move ALL dietary logic that answers "is this safe?" or "propagate dietary change" into `lib/dietary/`:
     - `lib/dietary/propagate.ts` - the single entry point for dietary mutations
     - `lib/dietary/safety-check.ts` - `checkMenuSafety(menu, guests)` interface
     - `lib/dietary/context.ts` - `getDietaryContext(eventId)` interface
  5. Remove dietary logic from `lib/clients/`, `lib/events/`, `lib/dinner-circles/`, `lib/analytics/`, `lib/intelligence/` (replace with calls to `lib/dietary/`)
  6. Write integration test: `tests/integration/client-mutation-pipeline.test.ts`
     - Test: allergy change propagates to events
     - Test: allergy sync failure doesn't crash updateClient
     - Test: menu recheck fires after allergy change
- **Constraints:**
  - `updateClient` in `lib/clients/actions.ts` should shrink to: validate, execute DB update, call `executeClientMutation()` for side effects
  - The pipeline is NOT a 'use server' file (it's called BY server actions, not directly by clients)
  - Do NOT change the external behavior of `updateClient` (same inputs, same outputs)
  - Dietary files that are analytics-only (`lib/analytics/dietary-trends.ts`) can stay where they are (read-only queries don't need consolidation)
  - Run `npx tsc --noEmit --skipLibCheck` after changes
  - Run `npm test -- --testPathPattern=client` to verify existing tests pass
- **Done when:**
  - `updateClient` is under 50 lines (delegates to pipeline)
  - `lib/clients/mutation-pipeline.ts` exists with typed steps
  - `lib/dietary/propagate.ts` is the single entry point for dietary mutations
  - `lib/dietary/safety-check.ts` exists with `checkMenuSafety` interface
  - Integration test exists and passes
  - tsc passes

---

## Wave 3 (After Wave 2 Verified)

### Agent 4: Dashboard God Page Decomposition

- **Model:** opus
- **Task:** Decompose `app/(chef)/dashboard/page.tsx` (2,466 lines, 32 lib domains, 120 imports) into deep server component sections. The page file becomes a layout compositor.
- **Read first:**
  - `app/(chef)/dashboard/page.tsx` (full file)
  - `app/(chef)/dashboard/_sections/` (all 39 section files)
  - Understand the existing section pattern and extend it
- **Architecture:**
  1. The page.tsx should become ~50 lines: auth check, tenant resolution, then render section components
  2. Each section is a server component that owns its own data fetching:
     - `_sections/finance-section.tsx` - fetches from `lib/finance/`, `lib/revenue-goals/`
     - `_sections/events-section.tsx` - fetches from `lib/events/`, `lib/scheduling/`
     - `_sections/clients-section.tsx` - fetches from `lib/clients/`, `lib/intelligence/`
     - `_sections/queue-section.tsx` - fetches from `lib/queue/`, `lib/workflow/`
     - `_sections/ai-section.tsx` - fetches from `lib/ai/`, `lib/knowledge/`
     - (group remaining imports into logical sections)
  3. Each section's interface: `<Section tenantId={tenantId} />` - nothing else
  4. Sections that are already in `_sections/` should be deepened (move their data fetching inside, remove props that pass fetched data from parent)
- **Constraints:**
  - Do NOT change visual output or behavior
  - Sections use `async` server components with their own data fetching
  - `Suspense` boundaries around each section for streaming
  - If a section needs data from another section, that's a signal they should be merged or share a parent fetch
  - Run `npx tsc --noEmit --skipLibCheck` after changes
  - Start dev server, navigate to `/dashboard`, screenshot, verify identical output
- **Done when:** `page.tsx` under 100 lines, each section self-contained, tsc passes, visual output unchanged

### Agent 5: Event Detail God Page Decomposition

- **Model:** opus
- **Task:** Decompose `app/(chef)/events/[id]/page.tsx` (1,825 lines, 47 lib domains, 163 imports) into deep server component sections. Same pattern as dashboard.
- **Read first:**
  - `app/(chef)/events/[id]/page.tsx` (full file)
  - Identify the major rendering blocks (financial summary, timeline, dietary, staff, menu, logistics, etc.)
- **Architecture:**
  1. Page.tsx becomes: auth check, event fetch (the core entity), then section compositor
  2. Sections:
     - `_sections/event-finance.tsx` - financial summary, ledger, payment status
     - `_sections/event-timeline.tsx` - prep timeline, day-of schedule
     - `_sections/event-dietary.tsx` - guest allergies, menu safety (uses new `lib/dietary/safety-check.ts` from Wave 2)
     - `_sections/event-staff.tsx` - staff assignments, roles
     - `_sections/event-menu.tsx` - menu details, dishes, components
     - `_sections/event-logistics.tsx` - travel, equipment, packing
     - `_sections/event-lifecycle.tsx` - FSM state, transitions, action cards
     - (group remaining by domain affinity)
  3. Each section receives only `eventId` and `tenantId` as props, fetches its own data
- **Constraints:**
  - Same rules as Agent 4
  - The event entity itself (core row from events table) is fetched ONCE in page.tsx and passed as prop to sections that need it (avoid N+1 for the same row)
  - Run `npx tsc --noEmit --skipLibCheck` after changes
  - Navigate to an event detail page, screenshot, verify identical output
- **Done when:** `page.tsx` under 120 lines, each section self-contained, tsc passes, visual output unchanged

---

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` as final gate
- After Wave 1: full tsc check + verify no import errors across codebase
- After Wave 2: `npm test -- --testPathPattern="client|dietary"` + new integration test passes
- After Wave 3: start dev server, visually verify dashboard and event detail pages render correctly
- After all waves: `npx next build --no-lint` must succeed
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, screenshot, behavioral test).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update build queue, push.
8. Each wave gets its own commit with descriptive message.
