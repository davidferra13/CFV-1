# Private Chef Service Readiness TODO

Owner: `Private Chef Core`
Start date: `2026-03-11`
Target: Standard one-off private-chef service readiness for a 3-5 course dinner flow

## Goal

Make ChefFlow trustworthy for a normal private-chef booking without hidden manual rescue work:

1. Public inquiry
2. Inquiry triage and conversion
3. Quote and deposit
4. Chef confirmation
5. Menu approval
6. Shopping, prep, packing, timeline, travel
7. Start service, complete service, close-out

This plan is intentionally narrow. It does not cover POS parity, multi-day booking, bakery, or food truck work.

## In scope

- One-off dinners
- 1-14 guests
- 3-5 courses
- Chef-led quote flow
- Deposit-required bookings
- Client menu approval
- Event operations and close-out

## Out of scope

- Multi-day packages
- Recurring services
- POS and commerce register workflows
- Dinner Circle group booking loops
- Staff-heavy catering-specific expansion beyond basic event staffing

## Phase 0 - Contracts and Workflow Truth

- [ ] `PCSR-001` Wire the missing readiness gates into real transition enforcement
  - Owner: `Events/Workflow`
  - Scope:
    - Decide the required gate set for each transition:
      - `paid -> confirmed`
      - `confirmed -> in_progress`
      - `in_progress -> completed`
    - Stop defining gates that are not enforced.
    - Ensure `menu_client_approved`, `equipment_confirmed`, and `dop_complete` are either enforced or explicitly removed from the contract.
  - Target files:
    - `lib/events/readiness.ts`
    - `lib/events/transitions.ts`
    - `components/events/readiness-gate-panel.tsx`
    - `components/events/event-transitions.tsx`
  - Acceptance criteria:
    - Transition gate definitions match the intended business contract with no dead gate types.
    - A chef cannot move an event forward when a required gate is still pending unless override rules explicitly allow it.
    - Unit or integration coverage proves the missing-gate cases fail correctly.

- [ ] `PCSR-002` Make the service spec explicit across quote, event, and client views
  - Owner: `Quotes/Pricing`
  - Scope:
    - Decide where the canonical dinner spec lives:
      - service type
      - course count
      - guest count
    - Ensure a "4-course dinner for 6" is visible after quote creation and after menu attachment.
    - Remove ambiguity where the calculator knows the course count but downstream records do not surface it clearly.
  - Target files:
    - `components/quotes/quote-form.tsx`
    - `lib/quotes/actions.ts`
    - `app/(chef)/quotes/[id]/page.tsx`
    - `app/(chef)/events/[id]/page.tsx`
    - `app/(client)/my-events/[id]/page.tsx`
    - `supabase/migrations/*` if schema changes are required
  - Acceptance criteria:
    - The quote detail page shows the exact booked shape, not only total price and headcount.
    - The event detail page shows the same shape after conversion.
    - The client-facing event view reflects the same shape with no conflicting labels.

## Phase 1 - Golden Path Test Coverage

- [ ] `PCSR-003` Add one true browser-level private-chef golden path
  - Owner: `E2E/QA`
  - Scope:
    - Create a single Playwright spec for:
      - submit inquiry
      - convert/send quote
      - record or simulate deposit
      - chef confirm
      - send menu approval
      - client approve menu
      - generate docs
      - complete shopping
      - complete prep
      - complete packing
      - start service
      - complete service
      - close out
    - Prefer one seeded 4-course, 6-guest scenario first.
  - Target files:
    - `tests/journey/10-event-lifecycle.spec.ts`
    - `tests/e2e/*`
    - `tests/helpers/fixtures.ts`
    - `tests/helpers/e2e-seed.ts`
  - Acceptance criteria:
    - The spec performs real mutations, not only route loads.
    - The run passes locally and against the chosen hosted target.
    - The test fails if any required transition gate is bypassed incorrectly.

- [ ] `PCSR-004` Fix Playwright readiness/bootstrap reliability
  - Owner: `Infra/Test Harness`
  - Scope:
    - Make browser tests reliably detect that the app is ready.
    - Resolve the current boot/readiness timeout behavior in global setup.
    - Ensure auth bootstrap works on both local and hosted targets.
  - Target files:
    - `tests/helpers/global-setup.ts`
    - `playwright.config.ts`
    - `app/api/health/route.ts` or equivalent readiness endpoint
    - `app/api/e2e/auth/route.ts` if needed
  - Acceptance criteria:
    - Global setup completes without manual retries.
    - Browser suites can start against `localhost` and the configured hosted target.
    - Readiness probing uses a deterministic endpoint that returns quickly.

## Phase 2 - Data Integrity and Developer Verification

- [ ] `PCSR-005` Make the quote/inquiry/event integrity tests part of the standard readiness check
  - Owner: `Data/Backend`
  - Scope:
    - Ensure DB-backed tests for quote acceptance, inquiry sync, and event pricing integrity run in a normal developer workflow.
    - Remove the current "exists but skipped in this environment" state from service-readiness validation.
  - Target files:
    - `tests/integration/inquiry-quote-status-sync.integration.test.ts`
    - `tests/integration/quote-event-pricing-integrity.integration.test.ts`
    - `tests/helpers/test-db.ts`
    - `package.json`
    - `scripts/seed-e2e-remote.ts` or local Supabase bootstrap helpers
  - Acceptance criteria:
    - Local instructions exist for running the integration set against local Supabase.
    - CI or a standard local verification command includes these tests.
    - Quote acceptance preserves event pricing and inquiry state every time.

- [ ] `PCSR-006` Restore a reliable typecheck gate for private-chef readiness work
  - Owner: `App Platform`
  - Scope:
    - Investigate the current slow or stalled `typecheck` run.
    - Split or optimize the gate if necessary, but keep a trustworthy compile-time check.
  - Target files:
    - `tsconfig.json`
    - `tsconfig.ci.json`
    - `package.json`
    - Any high-cost type hotspots discovered during profiling
  - Acceptance criteria:
    - Typecheck completes consistently in a reasonable time on a normal dev machine.
    - The readiness checklist includes a compile-clean state, not only test-pass state.

## Phase 3 - Ops State and Service-Day Truth

- [ ] `PCSR-007` Audit every ops mutation that should update canonical event truth
  - Owner: `Events/Workflow`
  - Scope:
    - Confirm shopping, prep, packing, timeline, document generation, and close-out all update the event state that drives dashboard truth.
    - Shopping already syncs; the rest must be audited to the same standard.
  - Target files:
    - `lib/shopping/actions.ts`
    - `lib/scheduling/prep-checklist-actions.ts`
    - `lib/packing/actions.ts`
    - `lib/events/readiness.ts`
    - `app/api/documents/[eventId]/route.ts`
    - `lib/events/*`
  - Acceptance criteria:
    - Completing a task changes the next surfaced action immediately.
    - No stale event state remains after shopping, prep, packing, or doc generation.
    - Event detail, dashboard, queue, and briefing stay in sync.

- [ ] `PCSR-008` Add a single "service ready" event checklist surface
  - Owner: `Chef UX`
  - Scope:
    - Present a chef-facing final readiness checklist for a booked event.
    - The checklist should expose all blocking items in one place:
      - payment/deposit
      - menu approval
      - docs
      - shopping
      - prep
      - packing
      - timeline
      - travel
      - safety/allergy review
  - Target files:
    - `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx`
    - `components/events/readiness-gate-panel.tsx`
    - `components/dashboard/work-surface.tsx`
    - `lib/workflow/actions.ts`
    - `lib/workflow/stage-definitions.ts`
  - Acceptance criteria:
    - A chef can answer "am I ready to leave for this event?" from one screen.
    - The blocking item list matches the transition engine.
    - Clicking each blocker opens the exact screen needed to resolve it.

## Phase 4 - Pilot Launch Criteria

- [ ] `PCSR-009` Create the service-readiness verification command and checklist
  - Owner: `QA/Ops`
  - Scope:
    - Define one command or sequence to verify private-chef readiness before pilot use.
    - Document expected green signals and stop-ship conditions.
  - Target files:
    - `package.json`
    - `docs/*` or `plans/*` for runbook/checklist
    - `tests/journey/*`
    - `tests/integration/*`
  - Acceptance criteria:
    - A developer can run one documented flow and know if the private-chef service path is safe to pilot.
    - The checklist includes browser, integration, and compile-time validation.
    - Failure conditions are explicit, not interpretive.

## Recommended Execution Order

1. `PCSR-001`
2. `PCSR-003`
3. `PCSR-004`
4. `PCSR-005`
5. `PCSR-007`
6. `PCSR-008`
7. `PCSR-002`
8. `PCSR-006`
9. `PCSR-009`

## Go/No-Go Thresholds

- [ ] One seeded 4-course / 6-guest dinner can complete the full lifecycle in browser automation without manual DB edits.
- [ ] Required transition gates are enforced exactly as documented.
- [ ] Quote acceptance, inquiry sync, and event pricing integrity tests pass against a real database.
- [ ] Typecheck completes successfully.
- [ ] The chef has one unambiguous service-readiness screen for an active event.
- [ ] No known blocker requires manual rescue outside the product for the standard one-off dinner path.
