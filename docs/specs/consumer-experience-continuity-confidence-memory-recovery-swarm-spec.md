# Consumer Experience Continuity, Confidence, Memory, And Recovery Swarm Spec

## Queue State

- Status at intake: not fired.
- In-flight queue items at intake: none.
- Required behavior: create queue/spec packet and stop before application implementation.
- Canonical app URL for future fired verification: `http://localhost:3100`.
- Dirty workspace note: current checkout has extensive unrelated dirty work. Fired implementation must inspect `git status --short`, assign non-overlapping ownership, and preserve unrelated changes.

## Mission

Upgrade ChefFlow's consumer experience from "find/book/manage a chef" into a persistent hosting, decision-confidence, dinner-memory, and recovery system.

## Root Problem

ChefFlow currently understands the chef's operating world better than the consumer's emotional journey. The consumer needs confidence, continuity, memory, and recovery from discovery through inquiry, booking, event prep, completion, and repeat booking.

## Core Operating Rule

Build in parallel. Merge serially. Verify before the next wave.

If this work has not been fired from the build queue, stop after creating the queue/spec packet. If fired, preserve the run ID, queue item IDs, domain notes, and finish-check requirements.

## Primary Product Outcomes

1. Consumer Plan + Continuity
2. Decision Confidence Engine
3. Dinner Memory / Guest + Household Intelligence
4. After-Inquiry Anxiety + Recovery System

## Affected Users

- Public/unauthenticated discovery visitor
- Client/host
- Guest
- Household member
- Assistant/delegate
- Chef
- Staff/vendor
- Admin/support

## Security Invariants

- Protect all client/consumer plan, household, guest, delegate, inquiry, quote, booking, payment, and recovery data server-side.
- Public pages may expose only intentionally public chef/profile/proof data.
- Server actions must call the correct auth guard before data access.
- DB reads/writes must be tenant/client/chef scoped.
- Never expose private household notes, guest dietary details, client identities, invoices, addresses, support notes, or payment data on public surfaces.
- UI hiding is not a security boundary.

## Required Repo Context For Fired Build

- `app/(public)/eat/page.tsx`
- `app/(public)/eat/_components/*`
- `app/(public)/chef/[slug]/page.tsx`
- `app/(public)/chef/[slug]/inquire/page.tsx`
- `app/(client)/my-inquiries/*`
- `app/(client)/my-events/[id]/*`
- `app/(client)/my-household/*`
- `app/(client)/my-preferences/*`
- `components/public/*`
- `components/client-portal/*`
- `lib/public-consumer/*`
- `lib/discovery/*`
- `lib/hub/*`
- `lib/quotes/*`
- `lib/events/*`
- `lib/household/*`
- `lib/auth/route-policy.ts`

## Wave 0 - Domain Plan And Ownership

Lead orchestrator responsibilities:

- Inspect existing routes/modules before coding.
- Produce a concise wave plan with exact file ownership boundaries.
- Assign agents to non-overlapping lanes.
- Avoid concurrent edits to the same files.
- Use one lead writer for shared route policy, shared nav, shared schemas, and shared tests.
- Preserve run ID, queue item IDs, product-domain notes, and finish-check requirements.

Ownership rule:

- One lead writer owns shared contracts, shared route policy, shared navigation, shared schema/test updates, and final integration.
- Lane agents own only their assigned domain files and route/component files.
- No two agents edit the same file in the same wave.

## Wave 1 - Foundation

### Lane A: Consumer Plan Domain

Owns:

- Consumer plan types/actions/read models
- Plan state machine
- Inquiry/booking linkage
- Repeat-plan snapshot model

Build:

- `ConsumerPlan`
- `PlanDecision`
- `InquiryContinuity`
- `RecoveryPath`
- `RepeatExperience`
- Plan statuses: `draft`, `exploring`, `inquiry_sent`, `chef_reviewing`, `quote_received`, `menu_pending`, `payment_pending`, `confirmed`, `changed`, `declined`, `expired`, `needs_recovery`, `completed`.
- Confirmed/tentative/missing/blocked decision states.

Acceptance:

- Consumer can start a plan from discovery or chef profile.
- Inquiry creation attaches to a plan.
- Plan state persists across sessions.
- Prior experience can be cloned with inherited vs changed fields visible.

### Lane B: Confidence Engine Domain

Owns:

- Fit reason computation
- Dietary confidence
- Pricing confidence
- Availability certainty
- Similar-event proof sanitization
- Compare/shortlist confidence read model

Build confidence states:

- Fit: `strong`, `partial`, `unknown`
- Dietary: `high`, `medium`, `needs_confirmation`, `unknown`
- Pricing: `clear_estimate`, `range_only`, `needs_quote`
- Availability: `available`, `likely_available`, `confirm_date`, `unavailable`
- Proof: anonymized similar-event summaries only

Acceptance:

- No fake certainty.
- Allergy copy never guarantees medical safety.
- Pricing estimates are labeled as estimates unless chef-confirmed.
- Similar-event proof contains no PII.

### Lane C: Dinner Memory Domain

Owns:

- Household memory
- Guest memory
- Dietary/preference confirmation
- Delegate permissions
- Repeat booking memory

Build:

- Household profile memory with visibility levels: `private`, `chef_visible`, `internal_only`.
- Guest profiles reusable across events.
- Delegate permissions: `view_only`, `planning`, `communication`, `approval`, `payment`.
- Stale dietary confirmation prompts.
- Chef-facing prep summary that separates allergies, restrictions, dislikes, preferences, logistics, and private notes.

Acceptance:

- Host owns household and guest memory.
- Delegate access is scoped and revocable.
- Guest dietary details can be updated without mutating historical records.
- Chef sees only explicitly shareable memory.

### Lane D: Inquiry + Recovery Domain

Owns:

- Inquiry hub status
- Editable request state
- Response expectations
- Backup options
- Quote/menu/payment/change/service recovery actions
- Support/audit records

Build statuses:

- `sent`, `seen`, `chef_reviewing`, `quote_requested`, `quote_received`, `menu_pending`, `payment_pending`, `confirmed`, `changes_requested`, `declined`, `expired`, `needs_recovery`.

Recovery actions:

- Nudge chef
- Extend wait
- Edit request
- Ask for quote revision
- Request alternate chef
- Try alternate date
- Simplify scope/package
- Retry payment
- Regenerate payment link
- Flag menu/dietary concern
- Escalate to support
- Report service issue

Acceptance:

- Consumer can always see current state, next action, owner, and expected time.
- Edits before lock are allowed.
- Edits after quote/menu/payment lock require chef review or explicit policy handling.
- Support escalation creates an auditable record.

## Wave 2 - User-Facing Surfaces

Parallel lanes only if file ownership does not overlap.

### Lane A: Public Discovery + Shortlist

Owns:

- `/eat`
- consumer result cards
- shortlist/compare UI

Build:

- Confidence chips on discovery cards.
- Compare view with fit, dietary, pricing, availability, proof, response speed, and recovery fallback.
- Persistent shortlist state feeding inquiry context.
- Empty/missing confidence states.

### Lane B: Public Chef Profile + Inquiry Entry

Owns:

- Public chef profile confidence section
- Inquiry CTA context preservation

Build:

- "Why this chef fits" panel.
- Pricing/availability/dietary/proof confidence cards.
- Add to shortlist and compare actions.
- Inquiry entry that carries plan and confidence context.

### Lane C: Client Plan Hub + Dinner Memory

Owns:

- Client plan dashboard/hub
- Household/guest/delegate surfaces

Build:

- Plan hub showing confirmed, tentative, missing, blocked decisions.
- Household and guest memory reuse prompts.
- Delegate invite/revoke UI.
- Repeat similar/evolve/start fresh entry points.

### Lane D: Inquiry Hub + Recovery

Owns:

- Client inquiry detail/status surfaces
- Recovery action UI

Build:

- Persistent inquiry hub.
- Editable request panel.
- Expected response and last activity.
- Quote/menu/payment/change/service recovery actions.
- Service issue reporting and support escalation.

## Wave 3 - Integration

Lead orchestrator merges serially.

Wire:

- Discovery -> `ConsumerPlan`
- Chef profile -> `ConsumerPlan`
- Shortlist/compare -> `ConsumerPlan`
- Inquiry form -> `ConsumerPlan` + `InquiryContinuity`
- Client inquiry hub -> quotes/messages/payments/events
- Household/guest memory -> inquiry/menu/event prep
- Repeat booking -> prior event snapshots
- Recovery actions -> support/audit records
- Chef inquiry review -> privacy-safe plan summary
- Admin/support -> recovery visibility where appropriate

Route/security:

- Add any new protected client routes to `lib/auth/route-policy.ts`.
- Ensure admin/support pages call runtime admin/staff guards.
- Ensure public routes expose only sanitized data.
- Test URL guessing and route param tampering.

## Wave 4 - Hardening

Check:

- Loading states
- Empty states
- Error states
- Mobile layouts
- Keyboard accessibility
- Screen reader labels
- Long text overflow
- No fake data
- No fake stats
- No duplicated systems
- No public PII leakage
- No stale availability presented as confirmed
- No allergy safety overpromising
- No payment credential exposure
- Delegate revocation enforced server-side

Regression tests:

- Plan state transitions
- Inquiry linkage
- Confidence engine missing/high/medium/low states
- Similar-event proof sanitization
- Household/guest visibility
- Delegate permissions/revocation
- Editable request lock states
- Recovery action audit records
- Unauthorized client access denied
- Public profile data exposure safe

## Wave 5 - Final Verification And Proof Pack

Use canonical app URL:

- `http://localhost:3100`

Before starting server:

- Inspect existing listener on port `3100`.
- Reuse it if it is serving this checkout.
- Restart only if stale/broken.
- Do not start random alternate ports unless explicitly approved.

Required proof:

- Hard refresh affected public and client routes.
- Browser console check.
- Network/runtime error check.
- Server log check.
- Focused tests/typecheck.
- Screenshot or explicit manual route proof for UI surfaces.
- `/wiring-audit` post-build integration gate where relevant.
- `build-queue.mjs finish-check` for fired queue item IDs.

Manual smoke scenarios:

1. Public visitor starts on `/eat`, filters an event, sees confidence chips, shortlists chefs, compares them, opens chef profile.
2. Public visitor starts inquiry from chef profile and plan context carries through.
3. Client opens plan hub and sees confirmed/tentative/missing/blocked decisions.
4. Client adds household/guest dietary details and chooses what is chef-visible.
5. Client invites delegate, grants planning permission, then revokes access.
6. Client submits inquiry and sees status, expected response, editable request, and backup options.
7. Chef views inquiry and sees privacy-safe structured plan context.
8. Quote/menu/payment/change recovery paths each expose clear next action.
9. Returning client repeats a prior dinner and can keep, edit, or discard inherited details.
10. Unauthorized user cannot access another consumer's plan, household, inquiry, payment, or recovery case.

## Codex-Ready Fired Swarm Prompt

Use this prompt only after the queue item has been fired and assigned a run ID.

```text
Use a wave-based parallel swarm build for the fired ChefFlow queue item: Consumer Experience Continuity, Confidence, Memory, And Recovery.

Start from the fired build-queue packet and preserve the run ID, queue item IDs, Product Domain / Module notes, Queue Reconciliation notes, dependency notes, and finish-check requirements. Do not create a disconnected prototype or new framework. Build into the real app.

Core operating rule: build in parallel, merge serially, verify before the next wave.

Before coding:
- Inspect `git status --short`.
- Inspect the required repo context listed in `docs/specs/consumer-experience-continuity-confidence-memory-recovery-swarm-spec.md`.
- Produce a concise wave plan with exact file ownership boundaries.
- Assign non-overlapping lanes for Consumer Plan, Confidence Engine, Dinner Memory, and Inquiry + Recovery.
- Use one lead writer for shared route policy, shared nav, shared schemas, and shared tests.
- Do not allow concurrent edits to the same files.

Wave 1 - Foundation:
- Lane A owns ConsumerPlan, PlanDecision, InquiryContinuity, RecoveryPath, RepeatExperience, plan state machine, inquiry/booking linkage, repeat-plan snapshots.
- Lane B owns confidence engine read models: fit, dietary, pricing, availability, sanitized proof, compare/shortlist confidence.
- Lane C owns household memory, guest memory, visibility levels, delegate permissions, stale dietary confirmation, chef-facing prep summary.
- Lane D owns inquiry hub statuses, editable request locks, response expectations, recovery actions, support/audit records.

Wave 2 - User-Facing Surfaces:
- Lane A owns `/eat`, consumer result cards, shortlist/compare UI.
- Lane B owns public chef profile confidence section and inquiry CTA context preservation.
- Lane C owns client plan hub plus household/guest/delegate surfaces.
- Lane D owns client inquiry detail/status surfaces and recovery action UI.

Wave 3 - Integration:
- Lead merges serially and wires discovery/profile/shortlist/inquiry/household/guest/repeat/recovery/chef-review/admin-support flows.
- Update `lib/auth/route-policy.ts` for new protected client routes.
- Verify admin/support runtime guards, public sanitization, tenant/client/chef scoping, URL guessing, and route param tampering.

Wave 4 - Hardening:
- Check loading, empty, error, mobile, keyboard, screen reader, long-text, no fake data/stats, no public PII, no stale confirmed availability, no allergy safety overpromising, no payment credential exposure, delegate revocation server-side.
- Add focused regression tests for plan transitions, inquiry linkage, confidence states, proof sanitization, household/guest visibility, delegate permissions/revocation, editable request locks, recovery audit records, unauthorized client denial, and public data exposure.

Wave 5 - Final Verification:
- Use canonical URL `http://localhost:3100`.
- Inspect existing listener on port 3100 before starting or restarting.
- Hard refresh affected public and client routes.
- Check browser console, network/runtime errors, and server logs.
- Run focused tests/typecheck.
- Capture screenshot or explicit manual route proof for UI surfaces.
- Run `/wiring-audit` where relevant.
- Run `node .agents/skills/build-queue/scripts/build-queue.mjs finish-check <QUEUE_ITEM_ID>` before moving done.

Manual smoke scenarios:
1. Public visitor starts on `/eat`, filters an event, sees confidence chips, shortlists chefs, compares them, opens chef profile.
2. Public visitor starts inquiry from chef profile and plan context carries through.
3. Client opens plan hub and sees confirmed/tentative/missing/blocked decisions.
4. Client adds household/guest dietary details and chooses what is chef-visible.
5. Client invites delegate, grants planning permission, then revokes access.
6. Client submits inquiry and sees status, expected response, editable request, and backup options.
7. Chef views inquiry and sees privacy-safe structured plan context.
8. Quote/menu/payment/change recovery paths each expose clear next action.
9. Returning client repeats a prior dinner and can keep, edit, or discard inherited details.
10. Unauthorized user cannot access another consumer's plan, household, inquiry, payment, or recovery case.

Final report must include implementation summary, changed files grouped by domain, user-role access summary, data ownership/security summary, verification commands/results, runtime URL verified, screenshots/manual proof notes, remaining risks/blockers, and queue item finish-check result.
```

## Final Report Contract For Fired Build

The fired build's final report must include:

- Implementation summary
- Changed files grouped by domain
- User-role access summary
- Data ownership/security summary
- Verification commands and results
- Runtime URL verified
- Screenshots/manual proof notes
- Remaining risks/blockers
- Queue item finish-check result
