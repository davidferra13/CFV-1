# Rail God Mode: Brand New Build

**Date:** 2026-05-14
**Status:** Design
**Priority:** P0

---

## Vision

The rail is the central nervous system of ChefFlow. It is a hybrid of shortcut, status bar, command center, and feed. When a chef opens ChefFlow, the rail tells them everything happening across their entire business, organized by urgency, with one-tap access to resolve anything.

**Design principle: GOD MODE.** Total situational awareness + instant action from a single surface.

A chef in God Mode:

- Knows every open thread across their entire business without clicking anywhere
- Sees what's on fire, what's simmering, what's cold, all at once
- Acts on anything in one tap from the rail itself
- Never discovers a problem by stumbling into it; the rail already told them
- Never forgets something because it was buried in a menu they didn't click

The rail eliminates navigation. If a chef has to click through menus to find what needs doing, the rail failed.

---

## God Mode Rules

These govern every design decision in the rail system:

1. **Nothing hides.** If it exists in ChefFlow and it's relevant to the chef right now, it shows up in the rail. Not behind a tab. Not in a submenu. In the rail.

2. **Density over beauty.** A chef scanning 40 items in 3 seconds beats a pretty card that shows 4 items. Bloomberg, not Instagram. Information density is the feature.

3. **Inline action where possible.** Some items don't need navigation at all. "Confirm staff availability" has a checkmark right in the rail. "Approve menu" has an approve button inline. Fewer page transitions = more God Mode.

4. **Pulse, don't nag.** P0 items pulse subtly (a gentle red glow, not a popup). The rail communicates urgency through visual weight, not interruption. No notifications, no modals, no badges with numbers. The rail IS the notification system.

5. **The rail knows what you don't.** Weather for outdoor event in 3 days? Rail shows it. Ingredient price spiked 40% since you quoted that menu? Rail shows it. Client hasn't responded in 5 days and the event is in 8? Rail shows it. The chef doesn't ask for this information.

6. **Context collapses distance.** Every item carries enough context that the chef understands it without tapping in. Not just "Inquiry from Sarah." It's "Sarah, 12 guests, June 14, Cape Cod, no menu sent, 3 days waiting." The chef might not even need to tap.

7. **Auto-triage.** The rail does the mental work of "what should I deal with first?" The priority matrix already decided. P0 is screaming, P4 is whispering. Chef trusts the order.

---

## Two Modes

The rail has exactly two modes of existence:

### Mode 1: Full Rail (Dashboard IS the Rail)

When a chef opens ChefFlow, they see THE RAIL as the entire primary surface. Not a dashboard with a rail section. The rail, with supporting widgets alongside.

### Mode 2: Compact Strip (Every Other Page)

A persistent horizontal bar on every page between nav and content. Always visible. Never dismissed. The chef's peripheral vision for their business.

---

## Priority Tiers

All rail items are assigned to one of five tiers by resolvers:

| Tier   | Name          | Visual Treatment                                                             | Examples                                                                                                           |
| ------ | ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **P0** | Act Now       | Red left border, pulsing dot, always expanded, pinned to top                 | Unanswered inquiry 2+ days, overdue invoice, equipment failure, allergic reaction protocol                         |
| **P1** | Today         | Amber left border, solid, always expanded                                    | Event today, menu due, quote expiring, unread client message, staff confirmation missing                           |
| **P2** | This Week     | Blue left border, expanded by default, collapsible                           | Upcoming events, pending deposits, menu drafts, vendor orders to place                                             |
| **P3** | On Your Radar | Gray, collapsed by default, expandable                                       | Weather for upcoming event, price changes, new inquiry (not urgent yet), seasonal opportunity, follow-up reminders |
| **P4** | Ambient       | Dimmed, collapsed, hidden by default. Also renders in bottom ambient ticker. | Industry awareness, buddy activity, growth nudges, system updates, documentation prompts                           |

**Tier rules:**

- Empty tiers don't render. No "ACT NOW - 0 items" ever.
- P0 and P1 always expanded, cannot be collapsed.
- Each tier header shows item count: "TODAY - 6 items"
- Items escalate upward toward urgency (P2 yesterday becomes P1 today) and resolve out when the underlying action is completed.

---

## Full Rail Layout (Dashboard View)

Rail-dominant layout. Rail takes ~65-70% of viewport width. Supporting widgets take ~30-35%.

```
+---------------------------------------------------------------------+
|  [Compact Strip - same as every page]                                |
+--------------------------------------+------------------------------+
|                                      |                              |
|  FULL RAIL (primary, 65-70%)         |  WIDGETS (supporting, 30-35%)|
|                                      |                              |
|  P0: ACT NOW                2 items  |  Month Snapshot              |
|  +--------------------------------+  |  Revenue: $8,400             |
|  | ! Sarah inquiry 12g Jun14 3d  ->|  |  Events: 6 done, 3 upcoming |
|  | ! Invoice #412 $1,850 overdue ->|  |  Clients: 2 new, 14 total   |
|  +--------------------------------+  |                              |
|                                      |  Next 7 Days                 |
|  P1: TODAY                   6 items  |  Sat - Henderson (8 guests)  |
|  +--------------------------------+  |  Wed - Patel (12 guests)     |
|  | Menu due Henderson Sat 8g    ->|  |  Fri - Thompson (6 guests)   |
|  | 2 unread Maria re: allergy   ->|  |                              |
|  | Jake hasn't confirmed Sat    ->|  |  Money Flow                  |
|  |   [Nudge] [Replace]           |  |  Pending deposits: $1,800    |
|  | Seafood order by 2pm        ->|  |  Overdue: $1,850             |
|  | Thompson deposit pending    ->|  |  Collected this week: $3,200 |
|  | Weather Sat outdoor 72F      |  |                              |
|  +--------------------------------+  |  Prep Horizon                |
|                                      |  Tomorrow: 4 components      |
|  P2: THIS WEEK          v 12 items   |  Thursday: full prep day     |
|  ...                                 |  Saturday: 21 components     |
|                                      |                              |
|  P3: ON YOUR RADAR       v 18 items  |  Remy Summary                |
|  ...                                 |  "Busiest week in 2 months." |
|                                      |                              |
|  P4: AMBIENT              > collapsed |  [+ chef picks widgets]      |
|                                      |                              |
+--------------------------------------+------------------------------+
|  [Bottom zone: ambient ticker - horizontal scroll]                   |
|  Strawberry season | Trending: herb crusted | New chef nearby | ...  |
+---------------------------------------------------------------------+
```

### Item Anatomy (One Line)

Each rail item is ONE LINE. Dense. Scannable.

```
[icon] [label + context] [inline actions?] [-> navigate]
```

- **Icon:** Visual type indicator (lightning for urgent, chat for message, dollar for money, etc.)
- **Label + context:** God Mode density. Not "Inquiry from Sarah" but "Sarah B. 12 guests Jun 14 Cape Cod 3d waiting"
- **Inline actions:** Optional buttons right in the line. [Nudge] [Approve] [Confirm] [Dismiss]. Chef resolves without leaving the rail.
- **Navigate arrow:** One tap goes directly to the thing. Arrow is the contract.

Items without an arrow are awareness-only (weather, price changes).

### Item Behaviors

- **Resolution:** Chef responds to Sarah's inquiry. Item fades out on next SSE push. Rail self-heals. Count drops. Visual weight lightens. Chef FEELS progress.
- **Escalation:** Quote was P2 Monday. Resolver set `escalatesAt: Thursday`. Thursday morning it's P1. Friday if still ignored, P0. Items flow upward toward urgency.
- **Time-aware sorting:** Within P1 "TODAY", items sort by time sensitivity. "Order seafood by 2pm" shows above "send menu draft" at 10am. After 2pm if not ordered, escalates to P0.
- **Manual dismiss:** Chef can snooze (1h, 24h) or permanently dismiss any item. Existing `rail_dismissals` table handles this.

### Widget System

Widgets sit in the right sidebar. They provide aggregated context the rail references but doesn't duplicate.

**Widget rules:**

- Widgets are reference, rail is action. Widgets show totals/calendars/trends. Rail shows individual actionable items.
- Widgets are configurable. Chef picks which show. Stored in `rail_user_preferences` JSONB.
- Widgets cross-reference the rail. "Overdue: $1,850" in Money Flow is the same invoice pulsing red in P0. Tapping the widget number jumps to the record.

**Default widgets:**

| Widget         | Data Source              | Purpose                            |
| -------------- | ------------------------ | ---------------------------------- |
| Month Snapshot | Ledger + events          | Revenue, event count, client count |
| Next 7 Days    | Events table             | Calendar view of upcoming events   |
| Money Flow     | Ledger + invoices        | Pending, overdue, collected totals |
| Prep Horizon   | Events + menus + recipes | Reverse timeline of prep work      |
| Remy Summary   | CIL signals              | AI-generated daily brief           |

### Mobile Layout

On mobile, widgets collapse below the rail. Rail stays primary.

```
+---------------------+
| [Compact Strip]     |
+---------------------+
| P0: ACT NOW         |
| item                |
| item                |
| P1: TODAY            |
| item                |
| item                |
| ...                 |
+---------------------+
| [widget] [widget] -> |  swipable widget cards
+---------------------+
| ambient ticker       |
+---------------------+
```

---

## Compact Strip

### Anatomy

```
+---------------------------------------------------------------------+
| [red dot] Sarah inquiry 3d | [amber] Menu due Sat | [amber] 2 unread | ... |
+---------------------------------------------------------------------+
```

- Max 5 items visible at once
- Pulls from P0 first, then P1 if slots remain
- Each item: colored dot + short label + context snippet
- One tap: goes directly to the thing
- Auto-rotates every 8 seconds if more than 5 qualifying items
- Subtle left-to-right ticker animation on rotation (CNN crawl feel)

### Behavioral Rules

- **P0 exists:** Strip has a subtle red background pulse. Peripheral vision catches it. Like an elevated heartbeat monitor.
- **P1 only:** Amber left border. Steady. "Things to do today, no emergency."
- **Nothing urgent:** Gray, minimal. Shows P2 items as gentle awareness. Strip never disappears; empty strip would feel like the system is broken.
- **Item resolved:** Item fades out of strip. Next item slides in. Strip self-heals.
- **Real-time:** Strip subscribes to SSE (`lib/realtime/sse-server.ts`). New inquiry while editing a menu? Strip updates live. No page refresh.

### What It Doesn't Do

- No expand/collapse. Always one line tall. Full rail is on the dashboard.
- No dropdown menus. Tap = navigate.
- No badge counts. The items themselves ARE the count. "2 unread msgs" not "Messages (2)".
- No close button. Permanent infrastructure, not a notification banner.

### Mobile

Shows 1-2 items with swipe. Same auto-rotate. Thin bar below mobile nav.

### Integration Point

Rendered in root layout. One component, one server action (`getRailStrip(role, limit: 5, tiers: ['p0', 'p1'])`), one SSE subscription.

---

## Unified System Architecture

### One Rail System

The old homepage discovery rail and the universal rail merge into one system. Same types, same scoring, same resolvers, same state tables. The public homepage gets items from the same system filtered to `role: 'public'`.

### Pipeline

```
Registry (item definitions, 1400+ items)
    |
    v
Resolver (hydrates with live data, assigns priority tier)
    |
    v
Filter (dismissed? snoozed? disabled by user?)
    |
    v
Score (existing weighted formula for within-tier ordering)
    |
    v
Sort (P0 first, then P1, etc. Score breaks ties within tier)
    |
    v
Render (RailFull on dashboard, RailStrip everywhere else)
```

### Changes vs. Current System

| Layer                     | Current                                                                  | New                                                                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Registries**            | 780 items across 7 roles                                                 | Keep all. Expand to ~1,400+. Items added incrementally as resolvers mature.                                                                                                                                                                      |
| **Resolvers**             | Only chef + client have resolvers                                        | Every role gets resolvers. 14 chef domains. Existing items without resolver data continue rendering as static labels at P3/P4 (no regression). As resolvers ship per domain, they upgrade those items with live data and proper tier assignment. |
| **Scoring**               | Weighted formula is primary sort                                         | Tier assignment is primary sort. Scoring becomes secondary (within-tier ordering only). Resolvers can force P0/P1 regardless of score.                                                                                                           |
| **State tables**          | 5 tables                                                                 | Keep all 5. No schema changes.                                                                                                                                                                                                                   |
| **Components**            | `UniversalRail`, `UniversalRailCompact`, `DiscoveryRow`, `DiscoveryCard` | `RailFull` (dashboard), `RailStrip` (persistent compact). Discovery components stay for public homepage.                                                                                                                                         |
| **Dashboard integration** | Rail is a section within each dashboard                                  | Dashboard IS the rail with widget sidebar.                                                                                                                                                                                                       |

---

## Resolver Architecture

### Contract

```typescript
type RailResolver = (context: {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
}) => Promise<ResolvedItem[]>

type ResolvedItem = {
  definitionId: string // maps to registry item
  tier: 'p0' | 'p1' | 'p2' | 'p3' | 'p4'
  label: string // hydrated: "Sarah B. 12 guests Jun 14 3d waiting"
  context: string // extra detail for density
  destination: string // URL: /chef/inquiries/abc123
  inlineActions?: InlineAction[] // [Nudge] [Replace] [Approve]
  data?: Record<string, any> // raw data for widget cross-reference
  expiresAt?: Date // auto-resolve out
  escalatesAt?: Date // auto-escalate to higher tier
}

type InlineAction = {
  label: string // "Nudge" | "Approve" | "Confirm"
  action: string // server action identifier
  params: Record<string, any> // action parameters
  variant: 'default' | 'destructive' | 'success'
}
```

### Chef Domain Resolvers (14)

| Domain    | File                    | Queries                          | Example P0 Output                                  |
| --------- | ----------------------- | -------------------------------- | -------------------------------------------------- |
| Inquiries | `inquiry-resolver.ts`   | inquiries, messages              | "Sarah B. 12 guests Jun 14 3d no response"         |
| Quotes    | `quote-resolver.ts`     | quotes, quote_state_transitions  | "Patel quote $2,400 expires Friday not viewed"     |
| Events    | `event-resolver.ts`     | events, event_transitions        | "Henderson dinner Sat 8 guests menu not sent"      |
| Payments  | `payment-resolver.ts`   | ledger_entries, invoices         | "Invoice #412 $1,850 4 days overdue"               |
| Messages  | `message-resolver.ts`   | chat_messages                    | "2 unread Maria re: allergy update"                |
| Staff     | `staff-resolver.ts`     | staff assignments, confirmations | "Jake hasn't confirmed for Saturday"               |
| Menus     | `menu-resolver.ts`      | menus, menu_items                | "Henderson menu draft 8 dishes not sent"           |
| Recipes   | `recipe-resolver.ts`    | recipes, event history           | "Cooked 8x never documented: herb-crusted salmon"  |
| Prep      | `prep-resolver.ts`      | events + menus + recipes         | "Saturday: 21 components day-before prep tomorrow" |
| Vendors   | `vendor-resolver.ts`    | vendor orders, delivery windows  | "Seafood order for Sat must place by 2pm today"    |
| Clients   | `client-resolver.ts`    | clients, event history           | "2 events completed last week 0 follow-ups sent"   |
| Equipment | `equipment-resolver.ts` | event checklists                 | "Saturday packing: 14 items 3 need charging"       |
| Weather   | `weather-resolver.ts`   | external API + events            | "Sat outdoor event 72F partly cloudy no rain"      |
| Financial | `financial-resolver.ts` | ledger aggregate                 | "May: $8,400 revenue on pace for $12k"             |

### Tier Assignment Patterns

Resolvers decide urgency with domain-specific rules:

**Inquiries:**

- No response > 48h: P0
- No response > 24h: P1
- New today: P1
- Has response, waiting on client: P2
- Closed/resolved: don't emit

**Events:**

- Today, not fully ready: P0
- Tomorrow, missing pieces: P1
- This week: P2
- Next week+: P3

**Payments:**

- Overdue: P0
- Due today: P1
- Deposit sent, waiting: P2
- Collected: don't emit

**Staff:**

- Event today, not confirmed: P0
- Event this week, not confirmed: P1
- Confirmed: don't emit

**Messages:**

- Unread from client with event this week: P0
- Unread from client: P1
- All read: don't emit

### Escalation and Resolution

- **Escalation:** Resolvers emit `escalatesAt: Date`. Assembly pipeline checks: if `now > escalatesAt`, bump the tier. Quote was P2 Monday, set to escalate Thursday. Thursday morning it's P1. Friday if ignored, P0.
- **Resolution:** When underlying data changes (inquiry answered, invoice paid), resolver stops emitting the item. It vanishes. No manual dismiss needed. Rail self-heals.
- **Manual dismiss:** Chef can snooze or permanently dismiss. Existing `rail_dismissals` table handles this. Resolver checks dismissals before emitting.

### Performance: Three Hydration Tiers

| Hydration | Frequency          | Domains                                        | Method                                                                   |
| --------- | ------------------ | ---------------------------------------------- | ------------------------------------------------------------------------ |
| **Hot**   | Every request      | Inquiries, Messages, Payments                  | Direct DB query. Must be real-time for God Mode.                         |
| **Warm**  | Every 5-15 minutes | Events, Quotes, Staff, Menus, Vendors, Clients | CIL scanner computes, caches in per-tenant SQLite. Assembly reads cache. |
| **Cool**  | Hourly or daily    | Recipes, Prep, Equipment, Weather, Financial   | Background computation. Cached. Fine to be slightly stale.               |

Compact strip on every page only needs Hot resolvers (P0/P1 items). Full rail on dashboard pulls all three tiers.

---

## Registry Expansion

### New Categories (from the 700-item chef reality list)

| Category                  | Coverage | Resolver Source                                                                                       |
| ------------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| Day-Off Awareness         | #298-333 | Events, messages, invoices. Detects contradictions between "day off" and pending items.               |
| Lead Qualification        | #334-368 | Inquiry records. Scans for missing fields (oven? parking? end time?) and surfaces as action items.    |
| Client Psychology         | #369-391 | Messages, inquiry threads. Detects patterns (multiple threads, conflicting inputs, silence).          |
| Restaurant Ops            | #392-431 | Future POS integration. Until then, manual entry checklists at P4.                                    |
| Kitchen Execution         | #432-462 | Events + menus + recipes. Calculates reverse prep timeline from event date.                           |
| Equipment and Packing     | #463-499 | Event checklists. Generates packing list from menu + venue details.                                   |
| Transportation            | #500-523 | Event location + weather + distance calculation. Assembles logistics snapshot.                        |
| Family Load               | #524-548 | Activity tracking. Counts consecutive active days, surfaces rest nudges.                              |
| Body Cost                 | #549-571 | Session time tracking. Light touch awareness at P4.                                                   |
| Money Pressure            | #572-590 | Ledger, invoices, quotes. Aggregates financial snapshot.                                              |
| Strategy                  | #591-610 | Event history, client patterns. Quarterly nudges detecting business trends.                           |
| Reputation                | #611-628 | Event completion + message history. Tracks post-event follow-up gaps.                                 |
| Content and Brand         | #629-649 | Event calendar + content tracking. P3/P4 nudges for photo/social opportunities.                       |
| Systems and Documentation | #650-670 | Recipe coverage + event history. Finds documentation gaps.                                            |
| Crisis Protocols          | #671-697 | Staff confirmations, weather alerts, equipment status. Only surfaces when crisis conditions detected. |

### Growth Estimate

| Role      | Current  | After Expansion |
| --------- | -------- | --------------- |
| Chef      | 226      | ~600+           |
| Client    | ~120     | ~200            |
| Admin     | 152      | ~200            |
| Staff     | ~80      | ~120            |
| Partner   | ~60      | ~100            |
| Guest     | ~50      | ~80             |
| Public    | 53       | ~80             |
| **Total** | **~780** | **~1,400+**     |

Items are added incrementally as domain resolvers mature. Not batched into a single sprint.

---

## God Mode Across Roles

Every role gets God Mode for their world:

| Role        | God Mode Feels Like                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **Chef**    | Command center. Every thread, every deadline, every dollar, every guest, every staff member. Full business X-ray.                |
| **Client**  | Concierge desk. "Your event is in 5 days. Menu approved. Deposit paid. Chef confirmed. Here's what to expect." Zero anxiety.     |
| **Staff**   | Shift briefing. "You're working Saturday. Here's the menu. Here's the timeline. Here's your station. Chef needs you to confirm." |
| **Partner** | Venue control room. "3 events this month at your venue. Next one Saturday. Chef arriving 2pm. Kitchen reserved."                 |
| **Admin**   | Mission control. System health, user activity, error rates, revenue, everything.                                                 |
| **Guest**   | Anticipation engine. "Your dinner is Saturday. Here's the menu. Here's the chef. Here's parking."                                |
| **Public**  | Discovery engine. Cuisine browsing, chef profiles, seasonal suggestions. Same system, consumer presentation.                     |

---

## Public Homepage Rail

### Same System, Different Presentation

Public homepage feeds from the unified rail system (`role: 'public'`). Same pipeline. Different visual treatment.

Public visitors see the existing lane-based horizontal scroll: cuisine pills, occasion browsing, seasonal suggestions, chef profiles. Consumer browsing, not Bloomberg density.

### What Changes

| Aspect      | Current                                            | New                                                         |
| ----------- | -------------------------------------------------- | ----------------------------------------------------------- |
| Data source | Old `homepage-discovery-rail.ts` pipeline          | Unified rail system, `role: 'public'`                       |
| Components  | `DiscoveryRow`, `DiscoveryCard`                    | Keep these. Right treatment for consumer browsing.          |
| Scoring     | Old editorial scoring                              | Unified scoring with public role weights                    |
| Adapter     | `universal-rail-public-adapter.ts` bridges formats | No adapter needed. Items define presentation type directly. |

### Conversion Bridge

Anonymous browsing history feeds into personalized rail on signup. Visitor browsing Italian + date night? Client rail knows: "You were looking at Italian date night. Here are 3 chefs available near you."

### What Gets Deleted (Feature-Flagged First)

Old parallel pipeline runs behind feature flag until unified system proves itself:

- `homepage-discovery-rail.ts` scoring logic
- `discovery-rail-scoring.ts`
- `control-rail-contracts.ts` assembly
- `universal-rail-public-adapter.ts`

Components stay: `DiscoveryRow`, `DiscoveryCard`, `discovery-card-feedback.tsx`.

---

## Migration Path

### What We Keep

| Keep                  | Why                                                       |
| --------------------- | --------------------------------------------------------- |
| All 5 DB tables       | Schema is sound. No changes.                              |
| All 7 role registries | Expanding, not replacing.                                 |
| Universal rail types  | Add `tier` field. Additive.                               |
| Scoring engine        | Becomes within-tier ordering. Add tier override.          |
| State management      | Dismiss, save, snooze logic works.                        |
| Server actions        | Add `getRailStrip()`. Existing actions stay.              |
| Discovery components  | Public homepage keeps these.                              |
| SSE infrastructure    | Compact strip subscribes for live updates.                |
| CIL scanner           | Warm/cool resolvers use existing per-tenant SQLite cache. |
| Privacy system        | Field-level stripping stays.                              |
| Connections system    | Cross-role transitions, escalation logic.                 |
| Feature flags         | Add new flags for strip, God Mode, inline actions.        |

### What We Build

| Build                    | Scope                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- |
| 14 chef domain resolvers | New files in `lib/discovery/resolvers/`. Each ~100-200 lines.                 |
| Resolver dispatcher      | Replaces `resolvers/index.ts`. Parallel domain calls. Hydration tiers.        |
| `RailFull` component     | Tier-grouped dense list. Inline actions. Collapsible sections.                |
| `RailStrip` component    | Persistent compact bar. Auto-rotate. SSE. Root layout.                        |
| Dashboard layout         | Rail-dominant left, configurable widget sidebar right, ambient ticker bottom. |
| Expanded registry items  | ~600+ new entries, added incrementally per domain.                            |
| Other role resolvers     | Staff, partner, admin, guest, client.                                         |
| Widget system            | Configurable sidebar. 5 defaults. Cross-referencing.                          |
| Inline action system     | Server action dispatch from rail items. Optimistic updates.                   |

### What We Delete (Feature-Flagged)

| Delete                                                                         | Replaced By                              |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| `homepage-discovery-rail.ts` scoring                                           | Unified scoring with public role weights |
| `discovery-rail-scoring.ts`                                                    | Merged into unified scoring              |
| `control-rail-contracts.ts` assembly                                           | Unified assembly pipeline                |
| `universal-rail-public-adapter.ts`                                             | Native rendering from unified types      |
| Old dashboard rail sections (`chef-operator-rail.tsx`, per-dashboard sections) | `RailFull` per-role                      |

---

## Build Phases

| Phase                    | What                                                                                                                                                                             | Depends On |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| **Phase 1: Foundation**  | Tier system in types. Resolver contract. 5 hot chef resolvers (inquiries, messages, payments, events, quotes). Inline action contract. Resolver dispatcher with hydration tiers. | Nothing    |
| **Phase 2: Full Rail**   | `RailFull` component with tier groups, inline actions, collapsible sections. Dashboard layout (rail 65% + widget sidebar 35%).                                                   | Phase 1    |
| **Phase 3: Strip**       | `RailStrip` component. Root layout integration. SSE subscription for live updates. Auto-rotate. Mobile adaptation.                                                               | Phase 1    |
| **Phase 4: Depth**       | Remaining 9 chef domain resolvers (staff, menus, recipes, prep, vendors, clients, equipment, weather, financial). Registry items added per domain as resolvers ship.             | Phase 1    |
| **Phase 5: Widgets**     | Widget system. 5 default widgets. Configurable sidebar. Widget-to-rail cross-referencing.                                                                                        | Phase 2    |
| **Phase 6: All Roles**   | Resolvers for client, staff, partner, admin, guest. Each role's dashboard becomes rail-dominant.                                                                                 | Phase 1    |
| **Phase 7: Unification** | Public homepage migration to unified system (feature-flagged). Delete old parallel pipeline once proven. Conversion bridge (anonymous to signed-in).                             | Phase 1    |

Phases 3, 4, 5, 6, 7 can run in parallel once Phase 1 and 2 are done.

---

## Non-Goals (This Spec)

- Public homepage massive expansion (separate brainstorm, architecture supports it)
- Restaurant POS integration (future, manual checklists for now)
- External calendar sync (future)
- Push notifications / mobile native (strip + SSE covers web)
- AI-generated rail items from Remy (CIL integration exists, Remy summary is a widget, but Remy-authored rail items are a separate feature)

---

## Success Criteria

1. Chef opens ChefFlow and sees every actionable item across their business in one view, organized by urgency
2. Chef resolves 80%+ of daily tasks without navigating away from the rail (via inline actions or one-tap navigation)
3. Compact strip surfaces urgent items on every page without interrupting current work
4. Items self-heal: completed work disappears, approaching deadlines escalate
5. System handles 1,400+ registry items without performance degradation (hydration tiers ensure this)
6. Every role has a God Mode view appropriate to their world
7. Public homepage runs on the same unified system with consumer-appropriate presentation
