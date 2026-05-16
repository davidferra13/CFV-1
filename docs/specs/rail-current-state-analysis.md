# Rail Current State Analysis

> Generated: 2026-05-16
> Purpose: Inform the 4-tier rail refactor (Critical/Action/Awareness/Opportunity)

---

## 1. Current Architecture

Three independent rail systems coexist on the dashboard, each with its own data pipeline:

**God Mode Rail** (primary, most mature)

- Components: `RailFull` -> `RailTierGroup` -> `RailItemRow` (vertical list, collapsible tiers)
- Strip variant: `RailStripWrapper` (server) -> `RailStrip` (client, SSE-refreshed horizontal bar, top of every page)
- 5-tier priority system: p0 (Act Now), p1 (Today), p2 (This Week), p3 (On Your Radar), p4 (Ambient)
- Resolver-based architecture: domain resolvers run in parallel via `god-mode-dispatcher.ts`
- Assembly pipeline in `god-mode-assembly.ts`: filter dismissed -> apply escalation -> filter expired -> dedupe -> group by tier -> sort by operating-loop score

**Operator Rail** (`ChefOperatorRail`)

- Consumes a `PriorityQueue` (from `lib/queue/types`) and converts items to `ChefRailCandidate` objects
- 5 categories: opening, follow_up, event_risk, menu_opportunity, partner_lead
- Scored by weighted formula in `chef-rail-priority.ts`, displayed as a card grid (2-3 columns)
- Limited to top 6 items after scoring

**Universal Rail** (`UniversalRailSection`)

- Uses `assembleRailForPage()` from `universal-rail-assembly.ts` with role-based item definitions
- Renders via `UniversalRailCompact` component, max 8 visible items
- Has the richest type system (10 presentation types, 6 click actions, 5 privacy levels, decay functions)
- Registry-driven: loads item definitions from `registries/` per role

All three render as separate `<section>` elements on the dashboard. There is no cross-rail deduplication.

---

## 2. Data Sources

### God Mode Resolvers (8 total, split hot/warm)

| Resolver       | Source                                    | Tables/Actions Hit                               |
| -------------- | ----------------------------------------- | ------------------------------------------------ |
| inquiry (hot)  | `lib/inquiries/actions.getInquiries()`    | `inquiries`, `clients`                           |
| message (hot)  | `lib/chat/actions.getConversationInbox()` | `conversations`, `conversation_participants`     |
| payment (hot)  | Direct SQL via `pgClient`                 | `event_financial_summary`, `events`, `clients`   |
| handoff (warm) | `lib/network/collab-actions`              | `collab_handoffs`, `collab_inbox`                |
| waiting (warm) | `lib/waiting-radar/collect`               | Multiple (aggregates cross-domain waiting items) |
| resume (warm)  | `lib/resume-trails/derive`                | `activity_log` / chef activity tables            |
| event (warm)   | `lib/events/actions.getEvents()`          | `events`, `clients`                              |
| quote (warm)   | `lib/quotes/actions.getQuotes()`          | `quotes`, `clients`                              |

### Operator Rail

- Reads from `PriorityQueue` (pre-assembled queue object passed as a promise)
- Maps queue items to `ChefRailCandidate` by domain: event, financial, inquiry, quote, client, culinary, network, prospect

### Universal Rail

- Registry-driven: `loadRoleRegistry(role)` loads `UniversalRailItemDefinition` arrays
- Each definition declares `dataSources[]` strings (not direct DB queries)
- Assembly loads user state (impressions, dismissals) from `universal-rail-state.ts`

---

## 3. Scoring Logic

### God Mode (operating-loop score, `god-mode-assembly.ts` lines 117-139)

```
score = base_score
  + LOOP_STATE_WEIGHT[loopState]     (blocked: +20, waiting: +16, active: +12, stale: -10)
  + EVIDENCE_WEIGHT[evidenceLabel]   (confirmed: +12, computed: +8, stale: -8)
  + SOURCE_WEIGHT[sourceKind]        (inquiry: +12, message/payment: +10, event: +8)
  + confidence * 10
  + nextAction bonus (+4)
  + proofHref bonus (+2)
  + followUp urgency (overdue: +24, <24h: +16, <72h: +8)
  + recent resume context (+6)
```

Items sort within tier by this score (descending). Cross-tier escalation bumps tier up one level when `escalatesAt` passes.

### Operator Rail (`chef-rail-priority.ts` lines 56-64)

```
raw = urgency * 0.22 + moneyImpact * 0.16 + eventRisk * 0.20
    + relationshipValue * 0.12 + confidence * 0.10
    + freshness * 0.08 + actionability * 0.12
    + expiresSoonBoost - agePenalty
score = clamp(0-100, raw * categoryWeight)
```

Category weights: event_risk 1.15, follow_up 1.0, opening 0.95, menu_opportunity 0.75, partner_lead 0.6.

### Universal Rail

- Uses `computeUniversalRailScore()` from `universal-rail-scoring.ts`
- 6-axis weighted profile per role: urgency, relevance, freshness, userAffinity, fatigue, boost
- Supports decay functions: deadline, linear, step, inverse, none
- Has fatigue/impression tracking (cooldownMinutes, maxImpressions)

---

## 4. Component Props and Types

### Core God Mode Types (`lib/discovery/god-mode-types.ts`)

- `RailTier`: `'p0' | 'p1' | 'p2' | 'p3' | 'p4'`
- `GodModeResolvedItem`: definitionId, tier, label, context, destination, icon, inlineActions, data, expiresAt, escalatesAt, score, loopState, sourceKind, evidenceLabel, confidence, proofHref, nextAction, waitingOn, resumeContext
- `GodModeResolverContext`: userId, tenantId, role, now
- `GodModeRailResult`: `{ tiers: Record<RailTier, GodModeResolvedItem[]>, totalItems, assembledAt }`
- `GodModeStripResult`: `{ items, hasP0, totalUrgent }`
- `InlineAction`: `{ label, action, params, variant }`
- `ResolverEntry`: `{ name, resolve(ctx) -> Promise<GodModeResolvedItem[]> }`

### Operator Rail Types (`lib/discovery/chef-rail-contracts.ts`)

- `ChefRailCategory`: opening, follow_up, event_risk, menu_opportunity, partner_lead
- `ChefRailCandidate`: id, tenantId, category, title, reasonCode, reason, href, action, urgency, moneyImpact, eventRisk, relationshipValue, confidence, freshness, actionability, createdAt, expiresAt
- `RankedChefRailItem`: extends ChefRailCandidate with `score`
- `ChefRailAction`: 7 action types (open_inquiry, send_follow_up, promote_opening, etc.)

### Universal Rail Types (`lib/discovery/universal-rail-types.ts`)

- `UniversalRailRole`: public, guest, client, chef, staff, partner, admin
- `UniversalRailPresentation`: pill, card, badge, story, visual_card, alert, progress, banner, metric, countdown
- `UniversalRailItem`: 20+ fields including score breakdown, privacy, decay, interaction state
- `UniversalRailItemDefinition`: template-driven definition (label/href templates, scoring notes)

---

## 5. Item Types Supported

### God Mode (via resolvers, currently active)

1. `chef.inquiry_new` / `chef.inquiry_awaiting_chef` / `chef.inquiry_awaiting_client` / `chef.inquiry_quoted`
2. `chef.message_new` (unread conversations)
3. `chef.payment_overdue` / `chef.deposit_due` (outstanding balances)
4. `chef.event_today` / `chef.event_tomorrow` / `chef.event_this_week`
5. `chef.quote_draft` / `chef.quote_sent`
6. `chef.resume_*` (resume trails per source kind: event, menu, inquiry, quote, etc.)
7. Waiting radar items (cross-domain: client, vendor, system, time, decision, payment)
8. Handoff items (incoming/outgoing collab handoffs)

### Operator Rail (via PriorityQueue mapping)

- Maps any queue domain to 5 categories: event_risk, follow_up, menu_opportunity, partner_lead, opening

### Universal Rail

- Registry-driven; whatever definitions are loaded for the role. Supports all 10 presentation types.

---

## 6. Reusable Components

**Keep as-is (solid foundations for refactor):**

- `RailItemRow` (line-item renderer with icon, label, evidence pill, inline actions, memory line, link wrapping)
- `RailStrip` (compact horizontal bar with SSE refresh, rotating items, P0 visual treatment)
- `RailStripWrapper` (server component fetch wrapper)
- `god-mode-dispatcher.ts` (parallel resolver dispatch with per-domain failure isolation)
- `god-mode-assembly.ts` (dedup, escalation, scoring, strip extraction)
- All 8 chef resolvers (inquiry, message, payment, event, quote, resume, waiting, handoff)
- `EvidencePill` component (used inside RailItemRow)
- `formatRailMemoryLine` from `lib/operating-loop/rail-memory`
- `universal-rail-state.ts` (dismiss, snooze, save, pin, impression tracking, audit events)
- `universal-rail-actions.ts` server actions (track, dismiss, save, etc.)

**Needs rework:**

- `RailFull` / `RailTierGroup`: vertical list layout, needs horizontal scroll per tier
- `ChefOperatorRail`: card grid layout, scoring formula overlaps God Mode, separate data path
- `UniversalRailSection` / `UniversalRailCompact`: separate assembly path, no tier integration
- `chef-rail-priority.ts`: redundant scoring system (can merge into operating-loop score)
- `chef-rail-contracts.ts`: 5 categories do not map cleanly to the 4 new tiers

---

## 7. Gaps vs Spec

Comparison of current item types against the edge case catalog in `dashboard-rail-architecture.md`:

### Pipeline/Revenue

| Spec Item                            | Status                                           |
| ------------------------------------ | ------------------------------------------------ |
| New inquiry from any source          | COVERED (inquiry-resolver)                       |
| Quote awaiting your response (draft) | COVERED (quote-resolver, draft status)           |
| Quote sent, client hasn't responded  | COVERED (quote-resolver, sent status with aging) |
| Contract unsigned                    | MISSING                                          |
| Menu awaiting client approval        | MISSING                                          |
| Payment overdue (client owes)        | COVERED (payment-resolver)                       |
| Payment due (you owe vendor)         | MISSING                                          |
| Recurring invoice due to generate    | MISSING                                          |
| Revenue goal milestone approaching   | MISSING                                          |

### Communication

| Spec Item                                          | Status                                              |
| -------------------------------------------------- | --------------------------------------------------- |
| Unread messages                                    | COVERED (message-resolver)                          |
| Client portal activity (viewed menu, opened quote) | MISSING                                             |
| Follow-up not sent (post-event)                    | PARTIAL (resume-resolver may surface, not explicit) |
| Dormant client (no contact in X weeks)             | MISSING                                             |
| Client birthday/milestone approaching              | MISSING                                             |
| Review request pending                             | MISSING                                             |

### Operations/Events

| Spec Item                                        | Status                      |
| ------------------------------------------------ | --------------------------- |
| Event approaching (day-of, day-before, week-out) | COVERED (event-resolver)    |
| Drive time alert ("leave in 45min")              | MISSING (deferred per spec) |
| Staff not confirmed for upcoming event           | MISSING                     |
| Staff conflict detected                          | MISSING                     |
| Prep not started for imminent event              | MISSING                     |
| Shopping list not finalized                      | MISSING                     |
| Gear/car not packed (day-before)                 | MISSING                     |
| Receipt not captured (post-event)                | MISSING                     |
| Hours not logged (post-event)                    | MISSING                     |

### Culinary/Supply (spec category: not in edge catalog but implied)

| Spec Item                         | Status                      |
| --------------------------------- | --------------------------- |
| Ingredient expiring soon          | MISSING                     |
| Price spike on key ingredient     | MISSING                     |
| Price drop opportunity            | MISSING                     |
| Vendor order deadline approaching | MISSING (deferred per spec) |
| Low stock alert                   | MISSING                     |

### Intelligence/System

| Spec Item                          | Status  |
| ---------------------------------- | ------- |
| Remy alert (AI noticed something)  | MISSING |
| CIL signal (pattern detected)      | MISSING |
| Automation ran (autopilot summary) | MISSING |
| Certification expiring             | MISSING |
| Insurance renewal approaching      | MISSING |

### Configuration/Onboarding

| Spec Item                   | Status  |
| --------------------------- | ------- |
| Incomplete settings         | MISSING |
| Half-done onboarding steps  | MISSING |
| Profile missing bio/tagline | MISSING |
| Feature not yet configured  | MISSING |

### Network/Social

| Spec Item                       | Status  |
| ------------------------------- | ------- |
| Friend/network dinner happening | MISSING |
| Referral opportunity            | MISSING |
| Chef network activity           | MISSING |

### Summary

- **Covered:** 8 of ~35 spec items (inquiries, messages, payments, events, quotes, resume trails, waiting radar, handoffs)
- **Missing:** ~27 items across 6 categories, heaviest gaps in Operations/Events (8 missing), Intelligence/System (5 missing), and Configuration/Onboarding (4 missing)
- **Structural gap:** Three separate scoring/assembly systems need unification before new item types are added
