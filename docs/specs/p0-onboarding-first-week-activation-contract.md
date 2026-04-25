# Spec: P0 Onboarding First-Week Activation Contract

> **Status:** ready
> **Priority:** P0 (blocking)
> **Depends on:** `docs/changes/2026-04-22-onboarding-entry-truth.md`
> **Estimated complexity:** medium (7-8 files)

## Timeline

| Event         | Date             | Agent/Session | Commit |
| ------------- | ---------------- | ------------- | ------ |
| Created       | 2026-04-24 00:00 | codex session |        |
| Status: ready | 2026-04-24 00:00 | codex session |        |

---

## Developer Notes

### Raw Signal

"Improve ChefFlow by prioritizing validation, activation, trust, and usability over net-new feature sprawl. Audit the product from the perspective of a solo private chef using it for the first week. Optimize for faster time-to-value, fewer trust-breaking states, stronger inquiry -> quote -> booking -> event -> prep -> invoice -> follow-up completion, and reduced cognitive overload. Prefer simplification, hardening, and verification over expansion. Done means verified, honest, and resilient against drift."

Latest scope request:

"Using this current thread, identify the single highest-leverage action remaining within scope, keep it additive, cite evidence, recommend exactly what to build, and create a build spec plus a Codex handoff prompt."

### Developer Intent

- **Core goal:** Replace the current import-oriented onboarding contract with a canonical first-week activation contract that matches how a solo private chef proves ChefFlow in week one.
- **Key constraints:** No schema changes, no feature removals, no forced gating, no breaking route changes, and no speculative new system.
- **Motivation:** ChefFlow already has broad feature coverage, but week-one activation is still steering chefs toward clients/loyalty/recipes/staff instead of proving the real operator loop.
- **Success from the developer's perspective:** Dashboard, onboarding hub, and "Resolve Next" all point to the same first-week booking-loop tasks, and tests fail if the product drifts away from that truth.

---

## What This Does (Plain English)

After this ships, a newly onboarded chef no longer sees setup framed as "import your data." Instead, ChefFlow guides them through the first booking loop it needs to prove value in week one: finish profile and service setup, capture a lead, send a quote, create an event, prepare it, and issue an invoice. The dashboard checklist, `/onboarding` hub, and resolve-next action all use the same shared step contract, while secondary setup tasks such as loyalty, recipe library, and staff remain available but are no longer the primary activation story.

---

## Why It Matters

This is the highest-leverage remaining action in scope because activation truth is still misaligned with the product's own launch objective. The product says the core loop is `inquiry -> quote -> booking -> event -> prep -> invoice -> follow-up`, but current onboarding surfaces still optimize for data import and optional setup instead of the first paid workflow.

---

## Evidence

1. `lib/onboarding/progress-actions.ts:10-18` defines onboarding progress as `profile`, `clients`, `loyalty`, `recipes`, and `staff`; `lib/onboarding/progress-actions.ts:24-65` computes only those five phases.
2. `components/dashboard/onboarding-checklist-widget.tsx:14-50` renders the same five-step checklist on the dashboard, including loyalty and staff as primary setup work.
3. `components/onboarding/onboarding-hub.tsx:34-93` defines the hub phases around profile, clients, loyalty, recipes, and staff; `components/onboarding/onboarding-hub.tsx:139-145` tells the chef to "bring in your data" rather than complete the booking loop.
4. `lib/interface/action-layer.ts:391-460` resolves the dashboard next task from those same onboarding phases, sending chefs to `/onboarding/clients`, `/onboarding/recipes`, `/onboarding/loyalty`, and `/onboarding/staff`.
5. `tests/journey/02-onboarding-setup.spec.ts:15-20` accepts either `/onboarding` or `/dashboard` as valid, and `tests/journey/02-onboarding-setup.spec.ts:177-187` accepts both presence and absence of the onboarding checklist as valid, which means drift will not fail the test suite.
6. `docs/product-blueprint.md:197-210` still lists launch gaps around non-developer public booking validation and onboarding testing with a non-technical user, which makes first-week activation honesty a current launch issue, not a future cleanup.

---

## Recommendation

Build one canonical "first-week activation contract" and wire every onboarding entry surface to it.

This is one build, not multiple parallel builds, because the same contract must drive:

- onboarding progress computation
- dashboard setup widget
- post-wizard onboarding hub
- dashboard resolve-next logic
- deterministic onboarding journey tests

Splitting those across agents would create overlapping edits and inconsistent business rules.

---

## Scope

### In Scope

- Add a shared server-side activation contract for first-week progress
- Reframe dashboard/onboarding hub copy and CTAs around the first booking loop
- Keep legacy secondary tasks available as non-primary setup items
- Add deterministic unit and Playwright coverage for the new contract
- Update user-facing docs for the new activation framing

### Out of Scope

- Rewriting the onboarding wizard itself
- Adding new database tables or columns
- Removing loyalty, recipe, client import, or staff setup features
- Adding any new growth, CRM, or finance systems

---

## Files to Create

| File                                                                   | Purpose                                                                                                |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `lib/onboarding/first-week-activation.ts`                              | Shared source of truth for first-week activation steps, completion rules, step order, and CTA metadata |
| `tests/unit/onboarding-first-week-activation.test.ts`                  | Regression coverage for every activation state combination and first unresolved step                   |
| `docs/changes/2026-04-24-onboarding-first-week-activation-contract.md` | Change note describing the new activation contract and verification                                    |

---

## Files to Modify

| File                                                   | What to Change                                                                                                                                                            |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/onboarding/progress-actions.ts`                   | Stop exposing the old five-step import model as the primary onboarding truth; either delegate to the new helper or extend this file to return the new activation contract |
| `components/dashboard/onboarding-checklist-widget.tsx` | Replace the current `profile/clients/loyalty/recipes/staff` checklist with the canonical first-week steps and real CTAs                                                   |
| `components/onboarding/onboarding-hub.tsx`             | Change header, copy, progress, and cards to the first-week booking-loop contract; move current import/setup items into a secondary section rather than deleting them      |
| `lib/interface/action-layer.ts`                        | Make `resolveOnboardingTask()` use the new contract and first unresolved activation step                                                                                  |
| `tests/journey/02-onboarding-setup.spec.ts`            | Replace permissive assertions with deterministic route/UI expectations for seeded onboarding states                                                                       |
| `tests/helpers/e2e-seed.ts`                            | Add or reuse explicit seeded chefs for `new-chef`, `wizard-complete-not-activated`, and `activated-chef` journey assertions                                               |
| `docs/USER_MANUAL.md`                                  | Update the first-run guidance so it reflects the booking-loop activation story instead of a generic import/setup story                                                    |

---

## Database Changes

None.

Use existing tables only. This build is additive and contract-level.

---

## Data Model

Add a new shared read model for onboarding activation. Suggested shape:

```ts
export type FirstWeekActivationStepKey =
  | 'profile_ready'
  | 'lead_captured'
  | 'quote_sent'
  | 'event_created'
  | 'prep_started'
  | 'invoice_ready'

export type FirstWeekActivationStep = {
  key: FirstWeekActivationStepKey
  label: string
  description: string
  href: string
  done: boolean
  optional?: boolean
  evidenceLabel?: string | null
}

export type FirstWeekActivationProgress = {
  completedSteps: number
  totalSteps: number
  steps: FirstWeekActivationStep[]
  nextStep: FirstWeekActivationStep | null
  secondarySetup: {
    clientsImported: boolean
    recipesAdded: boolean
    loyaltyConfigured: boolean
    staffAdded: boolean
  }
}
```

### Detection Rules

Use existing product data and fail closed when uncertain.

1. `profile_ready`
   Chef identity and service setup are sufficient to operate.
   Minimum acceptable rule: chef profile basics are present and at least one service/pricing surface exists.
   Builder must inspect the existing profile/event-type/booking settings sources and use the smallest truthful rule already available in code.

2. `lead_captured`
   At least one real inbound lead exists.
   Accept existing `inquiries` count > 0.
   If the codebase already treats a manually created first client as a valid equivalent for week-one activation, allow `clients` count > 0 as a fallback, but document the rule.

3. `quote_sent`
   At least one quote record exists in a sent or later state.
   Do not count empty drafts if the table distinguishes draft from sent.

4. `event_created`
   At least one event exists.

5. `prep_started`
   At least one event has meaningful prep evidence.
   Use existing prep/menu truth already in the product, such as `event_prep_blocks` or an event menu assignment. Do not invent a new prep state.

6. `invoice_ready`
   At least one invoice exists, or an existing invoice/payment-plan surface records a real billing artifact.
   Prefer invoices over indirect heuristics.

### Secondary Setup

Keep the current import-oriented tasks as a secondary section in the hub:

- client import
- recipe library
- loyalty configuration
- staff roster

These remain useful, but they are not the primary activation contract.

---

## Implementation Requirements

### 1. Add the shared contract

Create `lib/onboarding/first-week-activation.ts` as the only owner of:

- step order
- per-step completion rules
- CTA destination
- evidence summary text
- next unresolved step

All consuming UI should render from this contract rather than maintain separate hardcoded step lists.

### 2. Rewire dashboard setup progress

`components/dashboard/onboarding-checklist-widget.tsx` must render the first-week activation contract and show:

- completed count
- progress bar
- first unresolved step CTA
- truthful copy

Required CTA order:

1. profile/service setup
2. first inquiry or lead
3. first quote
4. first event
5. prep setup
6. invoice

Do not present loyalty or staff as blocking before quote/event/invoice.

### 3. Rewire the onboarding hub

`components/onboarding/onboarding-hub.tsx` must become the post-wizard "run your first booking loop" hub.

Requirements:

- Header copy must stop saying "Your workspace is configured. Now bring in your data."
- Primary cards must use the activation contract.
- Existing import-oriented cards move into a secondary "More setup you can do next" section.
- Preserve existing routes and features.

### 4. Rewire dashboard resolve-next

`lib/interface/action-layer.ts` must resolve onboarding next actions from the shared contract, not from the old phase list.

The next action returned by the dashboard must be the same step the onboarding hub highlights as next.

### 5. Tighten verification

`tests/journey/02-onboarding-setup.spec.ts` must stop accepting contradictory states as valid.

Minimum deterministic coverage:

1. `new-chef` visits `/onboarding` and stays on the first-run setup flow.
2. `wizard-complete-not-activated` visits `/onboarding` and sees the first-week activation hub with the new headline/copy.
3. `activated-chef` visits `/dashboard` and does not see the primary activation checklist.
4. A dismissed dashboard banner alone must not satisfy activation.

Add unit tests for the shared helper:

- no progress
- lead without quote
- quote without event
- event without prep
- prep without invoice
- fully complete
- next-step selection always matches the first incomplete step

---

## Verification

The builder must run and report the exact commands used.

Required:

```bash
node --test --import tsx tests/unit/onboarding-first-week-activation.test.ts
```

```bash
npx playwright test --project=journey-chef tests/journey/02-onboarding-setup.spec.ts
```

Also run a focused typecheck for touched files. Use the repo's existing typecheck entrypoint or a focused temporary tsconfig, then delete any temporary config file after verification.

---

## Acceptance Criteria

This spec is done only when all of the following are true:

1. There is exactly one shared owner for first-week activation progress.
2. Dashboard widget, onboarding hub, and resolve-next logic all read from that owner.
3. The primary activation story is aligned to the booking loop, not import tasks.
4. Legacy import/setup tasks are preserved as secondary work, not deleted.
5. Deterministic tests fail if onboarding route state or checklist truth drifts.
6. No schema changes were introduced.
7. The implementation is additive and does not break existing onboarding routes.

---

## Build Notes

- Prefer editing existing components over introducing new UI wrappers.
- Keep copy concise and operational, not motivational.
- Fail closed on ambiguous completion rules. If a step cannot be proven complete from existing data, leave it incomplete.
- Do not weaken tests to accommodate unknown seeded states; make the states explicit instead.
- Do not remove current import/setup routes. Reposition them.
