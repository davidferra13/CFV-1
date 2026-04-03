# Spec: Demo Continuity and Portal Proof

> **Status:** ready
> **Priority:** P1 (post-survey or explicit redirect)
> **Depends on:** none
> **Estimated complexity:** medium (8-12 files, no migrations)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event                 | Date             | Agent/Session   | Commit |
| --------------------- | ---------------- | --------------- | ------ |
| Created               | 2026-04-03 03:20 | Planner (Codex) |        |
| Status: ready         | 2026-04-03 03:20 | Planner (Codex) |        |
| Claimed (in-progress) |                  |                 |        |
| Spike completed       |                  |                 |        |
| Pre-flight passed     |                  |                 |        |
| Build completed       |                  |                 |        |
| Type check passed     |                  |                 |        |
| Build check passed    |                  |                 |        |
| Playwright verified   |                  |                 |        |
| Status: verified      |                  |                 |        |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- The developer explicitly asked for thorough, accurate cross-persona research on how developers, entrepreneurs, and business owners currently handle the fragmented workflow ChefFlow is solving.
- They wanted the findings cross-checked from different angles, focused on real workflows, breakpoints, and what is missing.
- They then asked for the most intelligent decisions to be made on their behalf, in the correct order, after fully understanding the current system, constraints, and context.
- They explicitly wanted a dependency-aware sequence, continuous verification, and a clean state that gives the next builder full context instead of leaving scattered research behind.

### Developer Intent

- **Core goal:** turn the current cross-persona research into one builder-ready implementation lane that makes the demo environment feel like a believable operating system across public, client, and chef surfaces.
- **Key constraints:** do not outrank the active survey deploy-verification lane by accident; do not widen auth or portal scope casually; do not invent fake demo-only UI disconnected from the real data model.
- **What the current inspection proved:** the demo chef side is data-rich, but the authenticated demo client account is structurally separate from the richer seeded demo clients, so the end-to-end story is weaker than it appears from the chef side alone.
- **Success from the developer's perspective:** a builder can pick up one narrow packet and make the demo believable in the right order, without having to reverse-engineer why the current demo feels thinner on the client/public side.

---

## What This Does (Plain English)

This spec makes the demo environment tell one coherent story instead of two disconnected ones.

After this is built:

- the authenticated demo client account participates in the same hero client story the chef sees
- public proof on the demo chef profile is backed by seeded review data instead of depending on stray records
- the chef-facing client preview shows the same action-needed state the client story is supposed to prove
- the demo control panel points to a clean, ordered walkthrough of public profile, inquiry, chef preview, and client portal surfaces

This is a continuity and proof pass, not a new feature lane.

---

## Why It Matters

The current repo already has strong demo seeding, but it is weighted toward the operator side.

Current inspection showed a concrete structural problem:

- `scripts/setup-demo-accounts.ts` creates one authenticated demo client record
- `scripts/demo-data-load.ts` then seeds a separate list of business clients from `lib/demo/fixtures.ts`
- the first rich "hero" client in fixtures is `Sarah & Michael Chen`
- the authenticated demo client account is `Sarah Chen` with a different record

That means the builder can sign into a demo chef account and see a rich client/event story, then switch to the demo client account and land in a thinner or misaligned experience.

The cross-persona research says that is exactly the kind of break that destroys trust:

- buyers trust connected operating flows more than feature inventories
- the immediate leverage is a believable public-to-portal story
- payment state and follow-through belong inside the demo story, not just the ledger

---

## Research Inputs

Primary planning inputs for this spec:

- `docs/research/cross-persona-workflow-patterns-and-breakpoints-2026-04-02.md`
- `docs/research/foundations/2026-04-03-platform-intelligence-evidence-gaps-and-spec-corrections.md`
- `docs/research/foundations/2026-04-03-multi-persona-website-workflow-validation.md`
- `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`

High-value current-market signals behind those docs:

- Dubsado and HoneyBook both keep portal activation tied to a concrete client task instead of assuming portal-first behavior
- current small-business workflow evidence still shows founders stitching CRM, invoicing, PM, and automation tools together
- QuickBooks' 2025 late-payments report reinforces that payment timing and follow-through are operating-critical, not back-office garnish

Those signals support a demo that proves continuity and action state, not just route coverage.

---

## Files to Modify

| File                                                           | What to Change                                                                                                                                                                                                                       |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `scripts/setup-demo-accounts.ts`                               | Keep the existing auth credentials and role wiring, but canonicalize the demo client's profile fields so the authenticated demo client can act as the hero client instead of a disconnected placeholder.                             |
| `scripts/demo-data-load.ts`                                    | Read `.auth/demo-client.json`, hydrate the authenticated demo client record with the hero fixture data, seed proof artifacts after the base data load, and log a stable walkthrough order in the script output.                      |
| `scripts/demo-data-clear.ts`                                   | Clear any new review / proof artifacts added by this spec while still preserving the demo chef and demo client accounts.                                                                                                             |
| `lib/demo/fixtures.ts`                                         | Introduce explicit hero-story fixtures for the authenticated demo client and add seeded public-proof artifacts such as completed-event client reviews.                                                                               |
| `lib/demo/seed-helpers.ts`                                     | Add idempotent helpers for "hydrate existing demo client as hero client" and "seed client reviews" without creating duplicate client records.                                                                                        |
| `app/(demo)/demo/page.tsx`                                     | Replace the generic control-panel framing with a clearer ordered demo walkthrough that links to the public profile, public inquiry page, chef preview, and authenticated client experience.                                          |
| `lib/preview/client-portal-preview-actions.ts`                 | Extend preview data so the chef-side preview can surface pending payment and quote/action state from the real tenant data instead of only a flat events + quotes list.                                                               |
| `app/(chef)/settings/client-preview/page.tsx`                  | Make the hero client easy to select or the default focus so the preview tells the intended story immediately.                                                                                                                        |
| `app/(chef)/settings/client-preview/client-portal-preview.tsx` | Render the client-side proof chain more explicitly: pending proposal/payment action, upcoming event, recent completed history, loyalty or repeat-client signal, and avoid preview gaps that make the portal feel thinner than it is. |

---

## Files to Create

None required.

Builder note: if a tiny helper component becomes clearly useful while implementing the demo control panel or client preview, keep it local to that slice. Do not widen this into a general demo framework.

---

## Database Changes

None.

### New Tables

```sql
-- None
```

### New Columns on Existing Tables

```sql
-- None
```

### Migration Notes

- No migration is part of this spec.
- Reuse existing tables and views such as `clients`, `events`, `quotes`, `ledger_entries`, `event_financial_summary`, and `client_reviews`.
- Do not create a parallel "demo proof" data model.

---

## Data Model

This spec intentionally uses the existing model instead of special-casing the demo:

- `user_roles` and the existing auth records remain the source of truth for who the demo chef and demo client are.
- `clients` remains the business record seen by chef and client surfaces.
- `events`, `quotes`, and `event_financial_summary` already drive client-side action state such as proposal review and payment due.
- `client_reviews` already powers public review proof and should be seeded for completed demo events instead of mocked in the UI.

Important current mismatch:

- the authenticated demo client is currently a preserved account record
- the rich demo-client story lives in separate fixture clients

This spec fixes that by making the authenticated demo client the hero story anchor, not by adding another demo-only path.

---

## Server Actions

No new app-level server actions are required.

Existing actions that remain the source of truth:

| Action                                                                  | Auth            | Purpose                                                               |
| ----------------------------------------------------------------------- | --------------- | --------------------------------------------------------------------- |
| `getPreviewClients()` in `lib/preview/client-portal-preview-actions.ts` | `requireChef()` | Returns tenant clients for the chef-side preview selector.            |
| `getPreviewClientEvents()`                                              | `requireChef()` | Returns the selected client's events from real tenant data.           |
| `getPreviewClientQuotes()`                                              | `requireChef()` | Returns quote and deposit state for preview.                          |
| `getPreviewClientLoyaltyStatus()`                                       | `requireChef()` | Returns loyalty / repeat-client signal for preview.                   |
| `getClientPortalData()` in `lib/client-portal/actions.ts`               | public token    | Existing read-mostly portal lookup. Keep it read-mostly in this pass. |

Builder note: keep new logic inside demo scripts, fixture helpers, or preview data composition unless a clear bug forces a change elsewhere.

---

## Implementation Order

Build this in this order.

### 1. Fix the demo-client identity split

- make the authenticated demo client the hero client record used by the seeded story
- preserve existing auth credentials and demo-auth refresh tooling
- keep load idempotent and avoid duplicate "Sarah" demo clients

### 2. Seed proof that public and client surfaces can actually read

- add seeded `client_reviews` for completed demo events
- ensure the completed / upcoming / action-needed event mix belongs to the authenticated hero client
- keep all proof in the real tables the product already reads

### 3. Tighten the chef-side preview

- make the preview default to the hero client when reasonable
- render the next-action chain, not just raw lists
- ensure preview reflects payment due / proposal waiting / repeat history using real data

### 4. Tighten the demo control-panel walkthrough

- present the journey in an explicit order
- link to the relevant surfaces
- avoid pretending that a route is meaningful if the data behind it is still thin

### 5. Verify the full continuity chain

- public profile
- public inquiry context
- chef-side preview
- authenticated demo client experience

Only after those all read coherently should this spec move toward verified.

---

## UI / Component Spec

### Demo Control Panel

- Keep the existing account switching and data-management controls.
- Add a clear "Suggested demo path" section with ordered links or cards:
  1. public chef profile
  2. public inquiry page
  3. chef-side client preview
  4. authenticated demo client portal
- The wording should make clear which step requires switching accounts and which one is public.
- The page should feel like a walkthrough tool, not just an internal utility dump.

### Chef-Side Client Preview

- The preview should open on the hero client by default if that client exists in the selector list.
- The preview should emphasize one believable client story:
  - one action-needed proposal or payment state
  - one upcoming event
  - one completed-history proof point
  - one repeat-client or loyalty signal
- The preview should remain read-only.
- Do not add fake buttons that suggest the chef can act from preview mode.

### Public Proof

- The demo chef's public profile and inquiry page should show seeded review proof for the completed demo events.
- This proof must come from the normal public review feed, not hardcoded fallback text.

### Authenticated Demo Client Experience

- After switching to the demo client account, the normal client routes should show real seeded events and action state.
- This pass should rely on existing client routes reading better demo data, not on building a separate demo-only client UI.

---

## Edge Cases and Error Handling

| Scenario                                                                                   | Correct Behavior                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run demo:load` is run repeatedly                                                      | No duplicate hero client should be created, and completed-event reviews should not multiply.                                                              |
| `npm run demo:clear` runs after this spec                                                  | The demo accounts remain, but newly seeded reviews and hero-story data are removed or reset consistently.                                                 |
| The hero client cannot be default-selected in preview because ordering changed             | Fallback to a safe selector state, but keep the hero client easy to identify and select.                                                                  |
| A builder is tempted to hardcode public-review cards or preview content                    | Do not. The point of this spec is to prove continuity through the real data model.                                                                        |
| A builder wants to widen the token-based public client portal into a write-capable surface | Out of scope. Keep the public token portal read-mostly and do not change auth or trust boundaries in this pass.                                           |
| A builder wants to change the demo auth emails or refresh script contract                  | Do not do it unless absolutely required. Preserve `.auth/demo-client.json`, `scripts/refresh-demo-auth.mjs`, and current demo-account switching behavior. |

---

## Verification Steps

1. Run `npm run demo:setup`.
2. Run `npm run demo:load`.
3. Open `/demo`.
4. Verify the demo control panel now presents an ordered walkthrough, not only raw controls.
5. Open the public profile for the demo chef and verify public review proof is visible from seeded data.
6. Open the public inquiry page and verify the proof/context column still supports the same demo story.
7. Switch to the demo chef account and open `/settings/client-preview`.
8. Verify the hero client is the default or easiest obvious selection.
9. Verify the preview shows a believable chain: action needed, upcoming work, and completed history.
10. Switch to the demo client account.
11. Verify `/my-events` or the canonical client landing route now shows the same hero story instead of an empty or disconnected state.
12. Regression check: verify the chef dashboard still loads after demo data is seeded.
13. Regression check: verify public profile and public inquiry still render when demo mode is off and for non-demo chefs.
14. Run `npm run demo:clear`.
15. Verify the demo accounts still exist and the business-story data is cleared without duplicate leftovers.
16. Run `npm run demo:load` again.
17. Verify the hero client story is restored idempotently.

---

## Out of Scope

- Rebuilding the token-based public client portal into a full write-capable workflow.
- Reworking client auth or magic-link architecture.
- Broad public-site copy rewrites outside the demo-control walkthrough.
- Messaging/chat seeding, RSVP seeding, or guest-network seeding beyond what is strictly necessary for the hero-story proof.
- New billing, proposal, or review features.
- Any migration or schema cleanup.
- Expanding this into a full "demo environment platform" abstraction.

---

## Notes for Builder Agent

- The most important current insight is structural, not visual: the authenticated demo client and the rich seeded hero client are different records today.
- Fix that first. Do not start with demo panel polish.
- Keep this pass data-first and continuity-first. If the real data model tells a coherent story, the existing client and public surfaces will do much more of the work for you.
- Preserve the active-lane sequencing from the current builder-start handoff. This is a ready post-survey lane, not the current default next execution step unless the developer explicitly redirects you here.
- Do not let this grow into a general portal-redesign or public-website rewrite.
