# Chef Activation Signal Inventory and Execution Order

Date: 2026-04-03
Status: complete
Purpose: give the next planner or builder one canonical activation-focused reference that separates:

- what the current `Getting Started` cleanup should do now
- which internal signals already exist but are still underused
- what those signals can answer before any broader activation rewrite
- what order the next activation decisions should happen in

Primary target:

- `docs/specs/p1-chef-getting-started-surface-consolidation.md`

Key companion docs:

- `docs/app-complete-audit.md`
- `docs/build-state.md`
- `docs/research/current-builder-start-handoff-2026-04-02.md`
- `docs/specs/onboarding-overhaul.md`

---

## Short Answer

No, the activation/onboarding lane is not exhausted.

The current `Getting Started` cleanup spec is the right first build because it removes the worst chef-facing surface without rewriting the underlying system. But there is still meaningful unused signal already inside ChefFlow:

1. breadcrumb and interaction telemetry can show where chefs stall or bounce during setup
2. session recovery paths can show where setup work gets interrupted
3. in-app feedback already captures page-level frustration context
4. beta survey infrastructure already captures role and acquisition metadata with exportable results
5. chef preference data already records what people keep, hide, and prioritize in their shell
6. the analytics and intelligence hubs already summarize a large amount of operational data that has not yet been turned back into activation decisions

The correct order is:

1. ship the scoped `Getting Started` surface cleanup
2. synthesize the existing evidence into one activation reporting layer or audit pass
3. only then decide whether ChefFlow needs a larger activation-model rewrite

Do not collapse those into one implementation pass.

---

## Why This Exists

The current `Getting Started` spec correctly solves the immediate UX problem, but it intentionally stops short of a broader activation rewrite.

That was the right planning choice. The product currently has multiple setup concepts, multiple reminder surfaces, and multiple data sources. A builder who tries to "fix onboarding" in one swing will almost certainly mix jobs, trust bad legacy data, and break adjacent behavior.

This memo exists to keep the next decision sequence disciplined.

---

## What Is Already True

### 1. ChefFlow currently has multiple activation jobs, not one

There are four separate systems or surfaces in play today:

- the legacy floating chef tour shell and checklist, backed by `product_tour_progress`
- the first-run wizard and banner summary, backed by `onboarding_progress` plus `chefs.onboarding_completed_at`
- the real setup-progress surfaces, backed by `getOnboardingProgress()` and actual business tables
- the business-import accelerator, which is related but not the same job

Primary evidence:

- `docs/specs/p1-chef-getting-started-surface-consolidation.md`
- `database/migrations/20260330000066_product_tour_progress.sql:12-49`
- `database/migrations/20260401000048_onboarding_progress.sql:1-13`
- `lib/onboarding/progress-actions.ts:20-60`
- `components/dashboard/onboarding-accelerator.tsx:37-81`

### 2. The current `Getting Started` surface is not trustworthy activation data

The legacy checklist completes steps on click and also auto-completes route-visited steps. That means it tracks navigation and superficial interaction more than real setup completion.

Primary evidence:

- `components/onboarding/tour-checklist.tsx:28-31`
- `components/onboarding/tour-provider.tsx:105,134-149,166`
- `lib/onboarding/tour-config.ts:49-101`

### 3. The current cleanup spec is intentionally narrow

The existing spec removes the global chef tour shell, keeps the real setup job alive through dashboard and `/onboarding`, preserves peripheral UI behavior, and leaves the broader activation model untouched.

Primary evidence:

- `docs/specs/p1-chef-getting-started-surface-consolidation.md`

This remains the correct first implementation step.

---

## Underused Internal Signals That Should Now Matter

### 1. Breadcrumb and interaction telemetry

ChefFlow already tracks chef navigation and lightweight interactions from the chef layout:

- per-tab session IDs in `sessionStorage`
- batched writes to `/api/activity/breadcrumbs`
- unload delivery via `sendBeacon`
- non-navigation interaction events for `click`, `form_open`, `tab_switch`, and `search`

Primary evidence:

- `components/activity/breadcrumb-tracker.tsx:1,17-20,25,43,61-64,94,112-126`

What this can answer:

- which setup pages are actually visited after first dashboard load
- what routes usually precede abandonment or dismissal behavior
- whether chefs move from dashboard setup prompts into real work or bounce back out
- where the product is asking for a step change too early

Why it is underused:

- the current `Getting Started` planning uses it conceptually, but there is no canonical activation report or builder-facing synthesis tying breadcrumb paths back to setup state

### 2. Session recovery path state

ChefFlow also stores the last active path for session recovery.

Primary evidence:

- `components/session/route-tracker.tsx:5,9,12-21`

What this can answer:

- where interrupted setup work tends to stop
- whether chefs abandon setup on the same pages they later resume from
- whether setup guidance is sending people into routes that do not naturally support recovery

Why it is underused:

- this state appears to support continuity, but it is not yet framed as an activation-friction signal

### 3. In-app user feedback with page context

Chefs can already submit feedback that records:

- sentiment
- free-text message
- `page_context`

Primary evidence:

- `lib/feedback/user-feedback-actions.ts:4,8-22`

What this can answer:

- which setup or migration pages generate the most frustration
- whether negative sentiment clusters around the old tour shell, the wizard, or downstream setup routes
- whether feedback severity changes after the `Getting Started` cleanup ships

Why it is underused:

- it is captured as product feedback, but not yet tied back to activation analysis

### 4. Beta survey response metadata and exportability

The survey system already supports:

- response aggregation via `getBetaSurveyResults()`
- exportable response data
- respondent-role derivation
- attribution metadata such as `source`, `channel`, `campaign`, `wave`, and `launch`

Primary evidence:

- `lib/beta-survey/actions.ts:6,265,300-301,332-372,416-456,521-528,734,759-799`

What this can answer:

- whether chefs coming from different acquisition paths struggle with different setup moments
- whether external testers describe the same friction that internal product intuition is already flagging
- whether role or launch-wave differences change activation needs

Why it is underused:

- the infrastructure is rich, but the activation lane is not yet using survey metadata as a decision input

### 5. Chef preference data

ChefFlow already stores shell-preference data such as:

- `dashboard_widgets`
- `primary_nav_hrefs`
- `my_dashboard_widgets`

The product also exposes settings pages for dashboard widget selection and navigation customization.

Primary evidence:

- `lib/db/schema/schema.ts:19804,24131,24135,24155,24194,24196,24199`
- `app/(chef)/settings/dashboard/page.tsx:19,31`
- `app/(chef)/settings/navigation/page.tsx:26,44`

What this can answer:

- whether chefs hide or keep setup-related widgets
- whether the setup surfaces are treated as noise or as valuable anchors
- which core areas chefs promote into their primary navigation after initial setup

Why it is underused:

- hide/show and preference behavior is often a clearer truth signal than survey language, but it is not currently part of activation planning

### 6. The analytics and intelligence hubs

The app audit already documents:

- a 9-tab `/analytics` hub with 38+ data streams
- a `/intelligence` hub with 25 deterministic engines

Primary evidence:

- `docs/app-complete-audit.md:932-952`

What this can answer:

- which early business actions correlate with deeper usage
- whether activation decisions should optimize for setup completion, first inquiry, first quote, first event, or some other early-value marker
- how much of the existing signal can be reused before adding new instrumentation

Why it is underused:

- the product already has broad analytical capability, but activation planning has not yet been framed as a consumer of that capability

---

## What A Builder Would Most Likely Get Wrong Without This Memo

### 1. Treat the current task as an onboarding rewrite instead of a surface cleanup

That would pull legacy tour data, wizard progress, and setup-progress semantics into one PR. The result would be broader, riskier, and less verifiable than the current spec.

### 2. Trust `product_tour_progress` as activation truth

That table is useful as legacy UI state, not as a clean measurement layer for real setup completion.

### 3. Ignore the evidence already sitting outside the onboarding codepath

Breadcrumbs, page-context feedback, survey metadata, preference state, and analytics summaries all exist already. A builder who redesigns activation without reading them is choosing intuition over available evidence.

### 4. Try to delete legacy tour infrastructure immediately

Client and staff tours still use shared tour infrastructure, and the chef layout currently carries peripheral visibility side effects that other UI depends on. The current cleanup spec already fences that risk correctly.

---

## Recommended Execution Order

### Phase 1. Ship the scoped chef `Getting Started` cleanup

Use the existing spec exactly as the first implementation step:

- `docs/specs/p1-chef-getting-started-surface-consolidation.md`

Why first:

- it fixes the most visible problem now
- it removes misleading legacy measurement from the user experience
- it preserves the real setup job without broad architecture risk

### Phase 2. Build an activation evidence pass before any broader redesign

This should be a narrow planning or reporting task, not an immediate UX rewrite.

Minimum goals:

- join real setup progress from `getOnboardingProgress()` with wizard state and dismissal state
- inspect breadcrumb sequences around setup routes and dashboard prompts
- sample page-context feedback for setup-related pages
- segment available survey responses by source or role where relevant
- inspect preference behavior around setup and import surfaces

Deliverable options:

- a builder-safe research memo
- a planner spec for an activation-reporting layer
- an admin/internal view if the evidence needs repeatable access

### Phase 3. Decide whether the activation model itself needs restructuring

Only after Phase 2 should the product decide whether to:

- unify setup definitions
- rewrite `/onboarding`
- merge wizard and hub logic
- replace current prompts with a more evidence-based activation model

That is a separate product decision, not a hidden part of the current cleanup.

---

## What Is Still Assumed But Not Verified

These are the real remaining unknowns after this pass:

- how complete and historically useful the breadcrumb data currently is in production
- whether page-context feedback volume is high enough to support setup-specific analysis
- whether survey responses already include enough chef/operator activation commentary to segment meaningfully
- which early-value actions actually correlate with long-term retained usage
- whether chefs who hide setup-related widgets are doing so because they are complete, annoyed, or simply prefer another route

Those are evidence questions, not reasons to delay the current cleanup spec.

---

## Builder Read Order

If the assigned task is the immediate chef `Getting Started` cleanup:

1. `docs/build-state.md`
2. `docs/research/current-builder-start-handoff-2026-04-02.md`
3. `docs/specs/p1-chef-getting-started-surface-consolidation.md`

If the assigned task expands into activation strategy after that cleanup:

1. `docs/specs/p1-chef-getting-started-surface-consolidation.md`
2. this memo
3. `docs/app-complete-audit.md`
4. `docs/specs/onboarding-overhaul.md`

---

## Final Guidance

The most intelligent next move is not "fix onboarding everywhere."

It is:

1. remove the bad chef-facing surface
2. preserve the useful setup job
3. use the signal already in the product before inventing a bigger rewrite

That is the cleanest sequence for builder work, regression control, and future product clarity.
