# ORCHESTRATION MISSION: Verification Swarm for PARTIAL Features + Critical Test Gaps

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `docs/test-coverage-blueprint.md` (new: master test checklist, understand the system)
- `docs/UNIFIED-BUILD-QUEUE.md` (items 12-19 in CLIENT COMMUNICATION section are PARTIAL/needs-verification)
- `tests/journey/05-first-inquiry.spec.ts` (pattern to follow for journey tests)
- `tests/coverage/02-chef-routes.spec.ts` (pattern for coverage tests)
- `tests/helpers/fixtures.ts` (auth fixtures, seed IDs)

## Session Decisions (Do Not Re-Debate)

- Test Coverage Blueprint is the canonical tracking system. Update it after each verification.
- PARTIAL items (12-19 in Client Communication) are BUILT but need Playwright proof.
- Server actions can hang under load. Tests must have explicit timeouts (30s max per action).
- Every test must authenticate via the e2e auth helper, not the browser sign-in form.
- The DB runs on port 54322 (Docker container `chefflow_postgres`). Verify it's up before running.
- Dev server on port 3100. Pre-warm routes before Playwright hits them (cold compilation = 60s+).
- Test files follow numeric prefix convention: `tests/journey/XX-name.spec.ts`

## Pre-Flight (Orchestrator Runs Before Dispatching)

```bash
# Verify DB is up
docker ps | grep chefflow_postgres

# Verify dev server
curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/auth/signin

# If server is down:
# Start-Process -FilePath "npm" -ArgumentList "run","dev" -WorkingDirectory "c:\Users\david\Documents\CFv1" -WindowStyle Hidden
# Wait 15s, verify again
```

## Wave 1 (Parallel - Verify PARTIAL Features)

These 8 features are BUILT. Each agent writes a Playwright verification spec AND runs it.

### Agent 1: Inquiry-to-Booking Orchestration Verification

- **Model:** opus
- **Task:** Write `tests/journey/20-inquiry-to-booking-orchestration.spec.ts`. Test the full 5-day inquiry flow: create inquiry, verify trigger engine fires, check response enforcement timer appears, verify quote auto-generation from menu, confirm journey orchestrator advances stages.
- **Read first:** `docs/specs/inquiry-to-booking-orchestration.md`, `lib/lifecycle/journey-orchestrator.ts`, `app/(chef)/inquiries/new/page.tsx`, `app/(chef)/inquiries/[id]/page.tsx`
- **Build:**
  1. Auth as agent chef
  2. Create inquiry via the form (channel: Email, client: "Test Orchestration Client", date: 30 days out, 6 guests)
  3. Verify inquiry appears in list with correct stage
  4. Verify response timer/enforcement UI shows
  5. Advance through stages programmatically if UI supports it
  6. Verify journey orchestrator log shows stage transitions
- **Done when:** Test passes green, or documents exactly what's broken with screenshots

### Agent 2: Pre-Event Confidence Cadence Verification

- **Model:** opus
- **Task:** Write `tests/journey/21-pre-event-confidence-cadence.spec.ts`. Verify the cadence scheduler, countdown component, and rule engine work for an event with a date 7 days out.
- **Read first:** `docs/specs/pre-event-confidence-cadence.md`, `lib/lifecycle/cadence-trigger-handler.ts`, `app/(chef)/events/[id]/page.tsx`
- **Build:**
  1. Auth as agent chef
  2. Find or create an event with date 7 days from now
  3. Navigate to event detail page
  4. Verify confidence cadence UI elements are present (countdown, next touchpoint indicator)
  5. Verify cadence rule engine evaluates correctly (check for scheduled email indicators)
- **Done when:** Test passes or documents what's broken

### Agent 3: Social Proof Loop Verification

- **Model:** haiku
- **Task:** Write `tests/journey/22-social-proof-loop.spec.ts`. Verify review request flow, token submission page, and moderation dashboard exist and load.
- **Read first:** `docs/specs/social-proof-loop.md`, `app/(chef)/reputation/page.tsx` or equivalent route for moderation
- **Build:**
  1. Auth as agent chef
  2. Navigate to completed events, verify review request action exists
  3. Navigate to moderation dashboard (if route exists)
  4. Verify token-based review submission page loads (public route)
- **Done when:** Test passes or documents missing routes

### Agent 4: One-Click Rebook + Returning Client Recognition

- **Model:** opus
- **Task:** Write `tests/journey/23-rebook-and-returning-client.spec.ts`. Verify rebook button on completed events, prefill logic, repeat client badge, seasonal rebook engine.
- **Read first:** `docs/specs/one-click-rebook.md`, `lib/events/rebook-actions.ts`, `lib/events/client-rebook-actions.ts`, `lib/lifecycle/seasonal-rebook.ts`
- **Build:**
  1. Auth as agent chef
  2. Navigate to a completed event
  3. Verify "Rebook" action button exists
  4. Click it, verify prefill (same client, similar details)
  5. Check for repeat client badge on client detail page
- **Done when:** Test passes or documents what's broken

## Wave 2 (Parallel - After Wave 1 settles)

### Agent 5: Client Communications Brand Voice Verification

- **Model:** haiku
- **Task:** Write `tests/unit/brand-voice.test.ts`. Unit test `lib/email/brand-voice.ts` (3 presets, greeting/signoff generation, forbidden-phrase detection).
- **Read first:** `lib/email/brand-voice.ts`, `lib/email/templates/personal-thank-you.tsx`
- **Build:**
  1. Import brand-voice module
  2. Test each preset generates correct greeting/signoff
  3. Test forbidden phrase detection catches bad patterns
  4. Test template renders without crash
- **Done when:** Unit test passes green

### Agent 6: Client Portal Guest Dietary Surfacing

- **Model:** haiku
- **Task:** Write `tests/journey/24-guest-dietary-surfacing.spec.ts`. Verify guest invite card, dietary summary panel, and aggregation work from client portal.
- **Read first:** `lib/dinner-circles/guest-dietary-summary.ts`, client portal routes under `app/(client)/my-events/[id]/guests/`
- **Build:**
  1. Auth as client (use client signup or existing test client)
  2. Navigate to an event with guests
  3. Verify dietary summary panel renders
  4. Verify aggregation shows combined restrictions
- **Done when:** Test passes or documents access issues

### Agent 7: Post-Event Photo Gallery + Referrer Circle Visibility

- **Model:** haiku
- **Task:** Write `tests/journey/25-post-event-photos-and-referrals.spec.ts`. Verify photo upload prompt on completed events, referrer notification actions, milestone emails exist.
- **Read first:** `lib/referrals/referrer-notifications.ts`, `lib/email/templates/referrer-milestone.tsx`
- **Build:**
  1. Auth as agent chef
  2. Navigate to completed event, verify photo section/upload prompt
  3. Navigate to referrals page, verify milestone/notification UI
  4. Check referrer notification actions are callable
- **Done when:** Tests pass or document what's missing

### Agent 8: Wire cadence-trigger-handler + Consolidate Payment Reminders

- **Model:** haiku
- **Task:** Two small intensify items. (a) Wire `lib/lifecycle/cadence-trigger-handler.ts` into `lib/finance/deposit-actions.ts` (3-5 lines). (b) Document which payment reminder path is canonical in a code comment.
- **Read first:** `lib/lifecycle/cadence-trigger-handler.ts`, `lib/finance/deposit-actions.ts`, `lib/invoices/reminder-actions.ts`, `lib/email/notifications.ts`
- **Build:**
  1. Add import of cadence-trigger-handler to deposit-actions
  2. After successful deposit, call trigger handler to initiate confidence cadence
  3. In reminder-actions.ts, add one-line comment noting canonical path is via notifications.ts
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes, import is wired

## Wave 3 (After Wave 1+2, Orchestrator Only)

### Update Test Coverage Blueprint

- Read all test results from Wave 1+2
- Update `docs/test-coverage-blueprint.md`:
  - Mark verified items as COVERED
  - Mark broken items with specific failure reason
  - Update "Last scan" date
  - Add Test Run History entry
- Update `docs/UNIFIED-BUILD-QUEUE.md`:
  - Items that pass verification: change PARTIAL -> DONE
  - Items that fail: add failure note, keep PARTIAL

## Verification Protocol

- Each agent authenticates via `POST http://localhost:3100/api/e2e/auth` (credentials in `.auth/agent.json`)
- Each agent runs `npx tsc --noEmit --skipLibCheck` before claiming done
- Orchestrator verifies each wave output before proceeding
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide
- If server hangs: kill PID on port 3100, restart with `Start-Process`, wait 15s, retry ONCE

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, test green or documented failure).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work, update blueprint, push.
8. Pre-warm routes before telling agents to navigate (`Invoke-WebRequest` to each route).
