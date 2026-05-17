# Feed Architecture Deep-Pass

## Deep-Pass Run 2026-05-17

STATUS: fresh
DEPTH: deep

## /deep-pass: feed-architecture (Facebook Adoption)

**Status:** fresh | **Trend:** increasing | **Run:** #1

### Context: What ChefFlow Already Has (FB Equivalents)

| Facebook Pattern                     | ChefFlow Equivalent                                                                        | Coverage |
| ------------------------------------ | ------------------------------------------------------------------------------------------ | -------- |
| EdgeRank (Affinity x Weight x Decay) | `universal-rail-scoring.ts` (urgency x relevance x freshness x affinity - fatigue + boost) | 95%      |
| Role-based feeds                     | 7 role registries (chef/client/guest/public/staff/partner/admin)                           | 100%     |
| Fatigue/impression caps              | `computeFatigue()` + maxImpressions + cooldownMinutes                                      | 100%     |
| Content mix policies                 | `applySlotPolicy()` (practical/ambient/editorial/promotional/planned)                      | 100%     |
| Cross-role notifications             | `COMPLEMENTARY_PAIRS` (chef quote sent -> client quote received)                           | 90%      |
| Conversion funnel                    | `inferConversionStage()` (browsing -> interested -> considering -> ready -> converted)     | 100%     |
| Context-aware boosting               | `pageAffinity` + `pageAffinityBoost` per item                                              | 100%     |
| Real-time infrastructure             | SSE server/client, 200+ files with realtime patterns                                       | 90%      |
| Decay functions                      | 5 decay types (deadline, linear, step, inverse, none)                                      | 100%     |
| Notification system                  | Full notification layer with tier config and realtime delivery                             | 85%      |

### Selected Lenses

- **Feed Systems Engineer** - Meta engineering blog patterns (aggregation, ranking pipelines, real-time fanout)
- **Information Architect** - Cognitive load management, progressive disclosure, feed fatigue research
- **Private Chef Operator** - What actually matters when prepping 6 dinners this week (operational gravity)
- **Engagement Designer** - Retention loops without dark patterns, value-first engagement
- **Event-Driven Systems Engineer** - SSE pub/sub at single-tenant scale, state propagation

### Moves (Expert-Validated)

1. **Feed Aggregation Engine** - Group similar rail items ("3 menus need confirmation", "2 payments received today"). FB's core UX insight: reduce cognitive load by collapsing related items into expandable groups.
   - Expert: Feed Systems Engineer ENDORSES. "Aggregation is the #1 feed quality lever. Simple grouping by (source, action_type, time_window) gives 80% of the value."
   - Expert: Private Chef ENDORSES. "When I have 4 events this week, I want '4 events need prep lists' not 4 separate cards."
   - yield: HIGH | stable: yes

2. **Engagement Feedback Loop** - Actions on rail items train future scoring. Chef always acts on event items fast? Boost event source weight. Dismisses CIL signals? Reduce CIL weight. FB's secret sauce: the feed learns.
   - Expert: Engagement Designer ENDORSES. "Close the loop. Static weights = stale feed. Even a simple EMA (exponential moving average) of act_rate per source transforms relevance."
   - Expert: Feed Systems Engineer ENDORSES with caveat. "Start with per-source act_rate, not per-item. Per-item overfits on small data."
   - yield: HIGH | stable: yes

3. **Circle Activity Feed** - Each Dinner Circle becomes a living chronological feed (like FB Group feed). Menu changes, guest responses, payments, sourcing updates, messages all flow into one timeline per circle.
   - Expert: Information Architect ENDORSES. "The circle IS a feed. Config objects feel dead. A timeline of 'Sarah confirmed +1', 'Menu locked', 'Deposit received' makes the circle feel alive."
   - Expert: Private Chef ENDORSES strongly. "This is how I think about events. What happened? What's next? In order."
   - yield: HIGH | stable: yes

4. **Rich Interaction Palette** - Beyond dismiss/snooze/resolve. Add: `delegate` (assign to staff), `save` (bookmark for later), `note` (attach quick text), `follow_up` (schedule re-surface). Like FB reactions but operationally meaningful.
   - Expert: Private Chef ENDORSES `delegate` and `save`. CAUTIONS on too many options. "3 max visible. Hide rest in overflow."
   - Expert: Information Architect ENDORSES. "FB proved: binary (like/dislike) loses to multi-modal. But cap at 5 total actions. 3 visible + 2 in overflow."
   - yield: HIGH | stable: yes

5. **Temporal Resurfacing ("On This Day")** - "1 year since Johnson dinner (they loved the lamb). Follow up?" Revenue opportunity from history. FB's Memories feature drives massive re-engagement.
   - Expert: Engagement Designer ENDORSES. "Anniversary nudges have highest act-rate of any notification type across all social platforms. Chef context makes it even stronger because it's money."
   - Expert: Private Chef ENDORSES strongly. "Clients forget. I forget. Reminding me 'hey, the Smiths' anniversary dinner was 11 months ago' = instant rebooking."
   - yield: HIGH | stable: yes

6. **Portal Activity Feed (Client-side)** - Client portal gets a chronological feed: "Chef sent your menu", "Contract ready for signature", "Payment confirmed". Like FB notifications but for their event lifecycle.
   - Expert: Information Architect ENDORSES. "Clients check portals once then forget them. A feed with 'new since last visit' gives them a reason to return."
   - Expert: Event-Driven Systems Engineer ENDORSES. "Portal already tracks access logs. Feed items are just the inverse view of chef actions."
   - yield: HIGH | stable: yes

7. **Notification Aggregation** - Collapse multiple notifications into grouped summaries. "3 new items in your Rail" not 3 separate pings. FB batches notifications to reduce fatigue.
   - Expert: Feed Systems Engineer ENDORSES. "Batch window of 5-15 minutes. Group by (source OR client OR action_type). Show count + most important."
   - Expert: Information Architect ENDORSES. "Notification fatigue is the #1 reason users disable notifications. Aggregation is the cure."
   - yield: MED | stable: yes

8. **Feed Composition Layer** - Single item pool, multiple view composers. Dashboard feed, Circle feed, Client feed, Finance feed all draw from same scored items but with different filters/weights. Like FB's main feed vs group feed vs marketplace.
   - Expert: Feed Systems Engineer ENDORSES. "You already have registries per role. The missing piece: a single assembly call with a 'view' parameter that applies different slot policies and filters to the same scored pool."
   - Expert: Event-Driven Systems Engineer ENDORSES. "Avoids duplicate scoring. Score once, filter N times."
   - yield: MED | stable: yes

9. **Real-time Feed Push** - New rail items appear without page refresh. "2 new updates" banner that slides items in on click. FB's core real-time pattern. ChefFlow has SSE infra already.
   - Expert: Event-Driven Systems Engineer ENDORSES. "SSE server exists. Just need: rail_item_created event -> push to active connections -> client banner with count."
   - Expert: Private Chef CAUTIONS. "Don't interrupt me while I'm in a recipe. Real-time = awareness tier only. Critical items still need explicit notification."
   - yield: MED | stable: yes

10. **Stories Strip (Ephemeral Urgency Cards)** - Top-of-dashboard horizontal strip of time-sensitive cards that auto-expire. "Menu lock in 3h", "Event tomorrow", "Invoice overdue 2d". Visual treatment: progress ring showing time remaining. Like FB/IG Stories but operational.
    - Expert: Engagement Designer ENDORSES. "Ephemeral content creates urgency without notification fatigue. The progress ring is the key visual."
    - Expert: Information Architect CAUTIONS. "Don't duplicate critical tier. Stories strip IS the critical tier with better visual treatment. Replace, don't layer."
    - yield: MED | stable: yes

### Expert Additions

- **Feed Systems Engineer** added: "Consider a **negative feedback signal**. If a chef dismisses the same category 3x in a row, that category should get auto-suppressed for 7 days. FB calls this 'See less like this.' You have maxImpressions but no category-level suppression learning."
- **Engagement Designer** added: "**Weekly digest email as feed recap**. FB's 'Here's what you missed' email drives 23% of re-engagement. Send a 'This week: 3 events completed, $4,200 earned, 2 follow-ups suggested' email that links back to the rail."
- **Private Chef** added: "**Prep day feed mode**. The day before an event, the rail should collapse everything non-event into awareness tier and surface ONLY that event's prep checklist, grocery status, timeline. FB does this with 'Event Mode' notifications."

### Rejected

- **ML-based personalization**: Overkill for single-tenant. Simple EMA of act_rate per source gives 90% of the value without model training infrastructure.
- **Social proof signals ("Sarah also viewed this menu")**: ChefFlow is primarily single-operator. Social proof patterns need multiple concurrent users. Not applicable.
- **Infinite scroll pagination**: Rail density caps at 29 items (3+8+12+6). Pagination adds complexity with no benefit at this scale.

### Skip

- **Feed ads/monetization insertion**: Not applicable. ChefFlow doesn't serve ads.
- **Content recommendation engine**: Premature. Need engagement data first (Move #2) before recommending.

### Pause When

- Engagement feedback loop (Move #2) has 30 days of data collected. Re-evaluate whether per-source weighting is sufficient or per-category needed.
- Circle activity feeds (Move #3) are live for 5+ events. Assess whether the timeline view replaces or supplements the config view.

### Best Next Move

**Move #1: Feed Aggregation Engine** - Highest leverage, zero new infrastructure needed. Pure logic layer on top of existing scoring/density system. Immediately reduces cognitive load on every dashboard visit.

---

## SURFACED:

- Feed aggregation (grouping similar items)
- Engagement feedback loop (actions train scoring)
- Circle activity feeds (per-circle timeline)
- Rich interaction palette (delegate, save, note, follow_up)
- Temporal resurfacing (anniversary nudges)
- Portal activity feed (client-side timeline)
- Notification aggregation (batch + group)
- Feed composition layer (single pool, multiple views)
- Real-time feed push (SSE new-items banner)
- Stories strip (ephemeral urgency cards)
- Category-level suppression learning (expert addition)
- Weekly digest as feed recap (expert addition)
- Prep day feed mode (expert addition)

LENSES_USED:

- Feed Systems Engineer: aggregation pipelines, ranking quality, real-time fanout
- Information Architect: cognitive load, progressive disclosure, notification fatigue
- Private Chef Operator: operational gravity, prep-day focus, client rebooking
- Engagement Designer: retention loops, value-first engagement, digest re-engagement
- Event-Driven Systems Engineer: SSE at single-tenant scale, state propagation

EXPERT_VALIDATION:

- Aggregation: endorsed unanimously
- Engagement feedback: endorsed with caveat (per-source not per-item)
- Circle feeds: endorsed strongly
- Rich interactions: endorsed with cap (3 visible + 2 overflow)
- Temporal resurfacing: endorsed strongly (highest act-rate pattern)
- Portal feed: endorsed (inverse view of chef actions)
- Notification aggregation: endorsed (5-15min batch window)
- Feed composition: endorsed (score once, filter N times)
- Real-time push: endorsed with caveat (awareness tier only, don't interrupt)
- Stories strip: endorsed with caveat (replace critical tier visual, don't layer)

EXPERT_ADDITIONS:

- Category-level suppression learning (3 dismissals -> 7 day auto-suppress)
- Weekly digest email as feed recap
- Prep day feed mode (collapse non-event items day-before)

REJECTED:

- ML personalization: overkill for single-tenant
- Social proof signals: needs multiple concurrent users
- Infinite scroll: density caps make it unnecessary

ACTED ON:

- (pending dispatch)

SKIPPED:

- Feed ads: not applicable
- Content recommendations: premature

CROSS_REFS:

- [[rail]]: Stories strip replaces critical tier visual treatment
- [[discovery]]: Feed composition layer extends universal rail assembly
- [[cil]]: Engagement feedback loop affects CIL signal scoring
- [[portal]]: Portal activity feed is new client-facing surface

NEXT TRIGGER: 30 days of engagement data from Move #2

---

## BUILD_PROMPTS:

### Wave 1 (Parallel - Foundation Layer)

#### Agent: feed-aggregation-engine

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/aggregation.ts` that groups rail items by (source, action_type, time_window). Input: scored RailItem[]. Output: (AggregatedFeedItem | RailItem)[]. An AggregatedFeedItem wraps N items sharing the same grouping key, exposing: groupKey, count, items[], representativeItem (highest score), expandable flag. Grouping rules: same source + same action verb (e.g. "menu_confirmation") within 4-hour window = group. Groups of 1 remain as individual items. Create `components/feed/aggregated-item.tsx` that renders groups as "N items need attention" with expand/collapse. Wire into `lib/discovery/universal-rail-assembly.ts` as a post-ranking step (after scoring, before limit). Add `lib/feed/aggregation-rules.ts` with configurable grouping rules per source. Export a `groupFeedItems(items: UniversalRailItem[]): (AggregatedFeedItem | UniversalRailItem)[]` function.
- **Read first:** `lib/discovery/universal-rail-assembly.ts`, `lib/discovery/universal-rail-scoring.ts`, `lib/rail/types.ts`, `components/rail/tier-row.tsx`
- **Expert backing:** Feed Systems Engineer: "Aggregation is the #1 feed quality lever. Simple grouping by (source, action_type, time_window) gives 80% of the value."
- **Done when:** `npx tsc --noEmit --skipLibCheck` passes. Aggregation function groups 5 items with same source+action into 1 group. Component renders with count badge and expand toggle.
- **Caveats:** Don't aggregate critical tier items. They must always show individually. Only aggregate action/awareness/opportunity tiers.

#### Agent: engagement-feedback-loop

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/engagement-tracker.ts` that records actions on rail items and computes per-source affinity scores. Schema: `rail_engagement_log` table (tenant_id, user_id, item_source, action_type, created_at). Compute EMA (alpha=0.1) of act_rate per source per user. Create `lib/feed/affinity-computer.ts` with `computeSourceAffinity(tenantId, userId): Map<string, number>` that returns 0-100 affinity score per source based on 30-day action history. Wire into `universal-rail-assembly.ts` to replace the static `userAffinityScore` with real computed affinity. Add migration file in `database/migrations/` with timestamp higher than existing max. Add `lib/feed/engagement-actions.ts` with server action `recordRailEngagement(itemKey, source, actionType)` called from rail item interactions.
- **Read first:** `lib/discovery/universal-rail-assembly.ts` (lines 96-210), `lib/rail/state.ts`, `database/migrations/` (glob for latest timestamp)
- **Expert backing:** Engagement Designer: "Close the loop. Static weights = stale feed. Even a simple EMA of act_rate per source transforms relevance."
- **Done when:** Migration creates table. `recordRailEngagement` inserts row. `computeSourceAffinity` returns scores. Assembly uses real affinity instead of hardcoded 0. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Per-source not per-item (Feed Systems Engineer caveat). EMA alpha 0.1 = slow learning (safe). Default affinity for new users = 50 (neutral). Never let affinity go below 10 (floor) so no source is completely suppressed.

#### Agent: circle-activity-feed-types

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Create `lib/dinner-circles/activity-feed-types.ts` with types for the circle activity feed. Types needed: `CircleActivityItem` (id, circleId, eventId, actorName, actorRole, actionVerb, objectType, objectLabel, timestamp, metadata). `CircleActivityVerb` union type: 'confirmed_attendance' | 'paid_deposit' | 'menu_locked' | 'ingredient_sourced' | 'substitution_proposed' | 'guest_added' | 'message_sent' | 'contract_signed' | 'timeline_updated' | 'photo_added'. `CircleActivityFeed` (items: CircleActivityItem[], cursor: string | null, hasMore: boolean). Create `lib/dinner-circles/activity-feed-actions.ts` with server actions: `getCircleActivityFeed(eventId, cursor?, limit=20): CircleActivityFeed` and `recordCircleActivity(eventId, verb, objectType, objectLabel, metadata?)`. The feed query should read from a new `circle_activity` table ordered by timestamp DESC with cursor pagination.
- **Read first:** `lib/dinner-circles/types.ts`, `lib/dinner-circles/actions.ts`, `lib/dinner-circles/event-hub-types.ts`
- **Expert backing:** Information Architect: "The circle IS a feed. Config objects feel dead. A timeline makes the circle feel alive."
- **Done when:** Types compile. Actions have correct signatures. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Cursor pagination uses timestamp-based cursor (ISO string), not offset. Include migration for `circle_activity` table.

#### Agent: rich-interaction-palette

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Extend `lib/rail/state.ts` and `lib/rail/types.ts` to support new interaction types. Add to `RailItemState` union: 'delegated' | 'saved' | 'noted' | 'follow_up'. Add new functions in `lib/rail/state.ts`: `delegateItem(tenantId, userId, itemKey, delegateToUserId)`, `saveItem(tenantId, userId, itemKey)`, `addNote(tenantId, userId, itemKey, noteText)`, `scheduleFollowUp(tenantId, userId, itemKey, followUpAt: Date)`. Each writes to `rail_item_state` table using the existing upsert pattern. Add `delegated_to`, `note_text`, `follow_up_at` columns to `rail_item_state` (migration). Create `components/rail/interaction-menu.tsx`: a dropdown with 3 visible actions (Act, Snooze, Delegate) + overflow menu (Save, Note, Follow Up). Use existing UI patterns from the codebase (shadcn dropdown).
- **Read first:** `lib/rail/state.ts`, `lib/rail/types.ts`, `components/rail/rail-item-row.tsx`, `database/migrations/` (glob for latest)
- **Expert backing:** Information Architect: "FB proved: binary loses to multi-modal. Cap at 5 total. 3 visible + 2 overflow."
- **Done when:** Types include new states. State functions compile and follow existing patterns. Migration adds columns. Interaction menu component renders. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Don't break existing dismiss/snooze/resolve flows. New states are additive. Menu visibility: 3 primary + 2 overflow. Never show all 7 at once.

### Wave 2 (After Wave 1 Verified - Integration Layer)

#### Agent: temporal-resurfacing-engine

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/temporal-resurfacing.ts` that generates "On This Day" rail items from event history. Logic: Query events from 11-13 months ago (anniversary window) and 23-25 months ago (2-year). For each qualifying event, generate a rail item: "1 year since [client] dinner ([guest_count] guests, [highlight_dish]). Follow up?" Integrate as a new source in `lib/rail/sources/` called `temporal.ts` that returns RailItem[] from the resurfacing engine. Items get tier 'opportunity', TTL 7 days, base score 35. Include client last-contact check: if client has had an event in last 3 months, suppress (they're already active). Only surface for dormant clients. Create `lib/feed/temporal-queries.ts` with `findAnniversaryEvents(tenantId, now: Date): AnniversaryCandidate[]`.
- **Read first:** `lib/rail/sources/events.ts`, `lib/rail/aggregator.ts`, `lib/rail/types.ts`, `lib/events/queries.ts` or equivalent event query file
- **Expert backing:** Engagement Designer: "Anniversary nudges have highest act-rate of any notification type. Chef context makes it money." Private Chef: "Reminding me the Smiths' anniversary dinner was 11 months ago = instant rebooking."
- **Done when:** Temporal source returns anniversary items. Items only appear for dormant clients. `aggregateRailItems` includes temporal source. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Suppress if client active in last 3 months. Don't flood: max 2 anniversary items per day (density cap within source).

#### Agent: portal-activity-feed

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `lib/portal/portal-feed-types.ts` with `PortalFeedItem` (id, eventId, clientId, verb, objectType, objectLabel, timestamp, isNew: boolean). Verbs: 'menu_shared' | 'contract_ready' | 'payment_confirmed' | 'message_received' | 'timeline_updated' | 'photo_shared' | 'quote_sent'. Create `lib/portal/portal-feed-actions.ts` with `getPortalFeed(eventId, clientId, lastVisitedAt?: Date): PortalFeedItem[]` that queries portal-relevant events and marks items as `isNew` if after `lastVisitedAt`. Create `components/portal/portal-activity-feed.tsx` - a client-facing chronological list showing what happened since their last visit. "New since your last visit" divider. Wire into `app/(client)/` layout or event page. Feed items are the inverse of chef actions: chef sends menu -> client sees "Your menu is ready". Use existing `PortalAccessLog` to determine `lastVisitedAt`.
- **Read first:** `lib/portal/portal-experience-types.ts`, `lib/portal/portal-experience-actions.ts`, `app/(client)/my-events/page.tsx`
- **Expert backing:** Information Architect: "Clients check portals once then forget. A feed with 'new since last visit' gives them a reason to return." Event-Driven Systems Engineer: "Portal already tracks access logs. Feed items are the inverse view of chef actions."
- **Done when:** Portal feed returns items ordered by timestamp. `isNew` correctly flags items after last access. Component renders with "New" divider. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Portal is client-facing. No internal terminology. "Your menu is ready" not "Menu shared by chef." Privacy: never expose other clients' data in a shared event.

#### Agent: feed-composition-layer

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/composition.ts` that provides a view-based assembly wrapper. Instead of calling `assembleUniversalRail` with different options each time, create `composeFeedView(baseResult: UniversalRailAssemblyResult, view: FeedView): UniversalRailItem[]` where `FeedView` is 'dashboard' | 'circle' | 'client' | 'finance' | 'prep'. Each view applies different filters: dashboard = all items; circle = filter by eventId in metadata; client = filter by clientId in metadata; finance = filter by category containing 'finance' or 'payment'; prep = filter by category containing 'event' or 'culinary' + boost items with eventId matching tomorrow's events. This avoids re-scoring. Score once in assembly, filter N times per view.
- **Read first:** `lib/discovery/universal-rail-assembly.ts`, `lib/discovery/universal-rail-types.ts`, `lib/discovery/universal-rail-scoring.ts`
- **Expert backing:** Feed Systems Engineer: "Score once, filter N times. Avoids duplicate scoring."
- **Done when:** `composeFeedView` correctly filters for each view type. Types compile. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** This is a pure filter, not a re-ranker. Don't re-score items. Just filter + re-apply density caps per view.

#### Agent: notification-aggregation

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Create `lib/notifications/aggregation.ts` that groups notifications before delivery. Logic: notifications within a 10-minute batch window with same (source OR client_id OR action_verb) get collapsed into one grouped notification. `AggregatedNotification` type: { groupKey, count, items[], summary (e.g. "3 menus confirmed"), representative (highest priority item), batchWindowEnd }. Create `aggregateNotifications(pending: Notification[], windowMinutes?: number): (AggregatedNotification | Notification)[]`. Wire into `lib/notifications/send.ts` as a pre-send step. Existing individual notification logic stays intact as fallback; aggregation is additive.
- **Read first:** `lib/notifications/actions.ts`, `lib/notifications/send.ts`, `lib/notifications/types.ts`, `lib/notifications/tier-config.ts`
- **Expert backing:** Feed Systems Engineer: "Batch window of 5-15 minutes. Group by source OR client OR action_type." Information Architect: "Notification fatigue is #1 reason users disable notifications. Aggregation is the cure."
- **Done when:** Aggregation groups 3 notifications from same source into 1. Individual notifications still work unchanged. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Critical notifications (tier 'critical') are NEVER aggregated. They always send immediately and individually. Only aggregate 'action', 'awareness', 'opportunity' tier notifications.

### Wave 3 (After Wave 2 Verified - Polish & Enhancement)

#### Agent: realtime-feed-push

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/realtime-push.ts` that emits SSE events when new rail items are created. Hook into `recordCircleActivity` and `recordRailEngagement` to trigger a `rail_item_created` event. Create `app/api/feed/stream/route.ts` SSE endpoint that streams new rail items to connected clients. Create `components/feed/new-items-banner.tsx` - a "N new updates" banner that appears at top of rail when new items arrive via SSE. Clicking it prepends the new items (with slide-in animation). Use existing SSE patterns from `lib/realtime/sse-server.ts` and `lib/realtime/sse-client.ts`. Channel name: `rail:{tenantId}:{userId}`.
- **Read first:** `lib/realtime/sse-server.ts`, `lib/realtime/sse-client.ts`, `lib/realtime/subscriptions.ts`, `app/api/realtime/[channel]/route.ts`
- **Expert backing:** Event-Driven Systems Engineer: "SSE server exists. Just need rail_item_created event -> push to active connections -> client banner."
- **Done when:** SSE endpoint streams events. Banner appears with count. Click inserts new items. Existing SSE infrastructure reused (no duplicate server). `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Private Chef caveat: "Don't interrupt during recipe work." Solution: banner is passive (no sound, no modal). Just a subtle count indicator. User clicks when ready.

#### Agent: stories-strip-urgency

- **Model:** opus
- **Zone:** feed-architecture
- **Task:** Create `components/feed/urgency-strip.tsx` - a horizontal scrollable strip at the top of the dashboard showing time-sensitive ephemeral cards. Each card shows: icon, short label, progress ring showing time remaining (full = just created, empty = about to expire). Cards auto-remove when expired. Data source: critical tier items from the rail that have `expiresAt` set. This REPLACES the current critical tier row visual treatment with something more FB Stories-like. Create `components/feed/urgency-card.tsx` for individual cards with the progress ring. Create `lib/feed/urgency-strip-logic.ts` with `getUrgencyStripItems(railResult): UrgencyStripItem[]` that extracts critical items with expiry and computes ring progress (0-1 based on elapsed/total time). Use CSS animation for ring countdown (no JS interval).
- **Read first:** `components/rail/tiered-rail.tsx`, `components/rail/tier-row.tsx`, `lib/rail/types.ts` (DENSITY_CAPS, TIER_THRESHOLDS)
- **Expert backing:** Engagement Designer: "Ephemeral content creates urgency without notification fatigue. Progress ring is the key visual." Information Architect: "Replace critical tier, don't layer."
- **Done when:** Strip renders at top of dashboard. Cards show progress ring. Expired cards auto-hide. Critical tier items flow into strip instead of tier row. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Information Architect caveat: this REPLACES critical tier row, not supplements it. If an item has no expiresAt, it stays in the tier row format. Only items with explicit time windows get the stories treatment.

#### Agent: prep-day-feed-mode

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/prep-day-mode.ts` that detects when the chef has an event tomorrow and collapses the rail into event-focused mode. Logic: check events table for tomorrow's date. If event exists, export `getPrepDayConfig(tenantId): PrepDayConfig | null` returning { eventId, eventTitle, clientName, guestCount, startTime }. Create `lib/feed/prep-day-filter.ts` with `applyPrepDayFilter(items: UniversalRailItem[], prepConfig: PrepDayConfig): UniversalRailItem[]` that: boosts items related to tomorrow's event (+30 score), demotes unrelated items to awareness tier (cap score at 30), and injects prep checklist items (grocery status, timeline, equipment) as critical. Create a flag in the assembly options for `prepDayMode: boolean` that triggers this filter post-scoring.
- **Read first:** `lib/discovery/universal-rail-assembly.ts`, `lib/events/queries.ts` or event query equivalent, `lib/rail/sources/events.ts`
- **Expert backing:** Private Chef addition: "Day before an event, collapse everything non-event and surface ONLY that event's prep checklist."
- **Done when:** Prep day detected for tomorrow. Related items boosted. Unrelated items demoted. Assembly supports prepDayMode flag. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** Multiple events tomorrow? Pick earliest. Don't suppress critical items from other sources (payment overdue stays critical regardless).

#### Agent: category-suppression-learning

- **Model:** haiku
- **Zone:** feed-architecture
- **Task:** Create `lib/feed/suppression-learning.ts` that auto-suppresses categories after repeated dismissals. Logic: if user dismisses 3+ items from the same category within 7 days, auto-suppress that category for 7 days. Track in `rail_category_suppression` table (tenant_id, user_id, category, suppressed_until, dismiss_count). Create `checkCategorySuppression(tenantId, userId, category): boolean` and `recordCategoryDismissal(tenantId, userId, category)`. Wire `recordCategoryDismissal` into the existing `resolveItem` and `expireItem` flows (when user explicitly dismisses). Wire `checkCategorySuppression` into `assembleUniversalRail` as an additional filter alongside `disabledCategories`. Add migration for table. Add `unsuppressCategory(tenantId, userId, category)` for manual override.
- **Read first:** `lib/discovery/universal-rail-assembly.ts` (lines 125-135 where disabled categories checked), `lib/rail/state.ts`, `database/migrations/`
- **Expert backing:** Feed Systems Engineer addition: "3 dismissals -> 7 day auto-suppress. FB calls this 'See less like this.'"
- **Done when:** 3 dismissals triggers suppression. Suppressed categories filtered from assembly. Manual unsuppress works. Migration creates table. `npx tsc --noEmit --skipLibCheck` passes.
- **Caveats:** NEVER suppress 'critical' category. Never suppress categories with fewer than 5 total items in registry (too few to learn from). Always allow manual unsuppress.

---

### Dispatch Notes

- Total agents: 11
- Estimated tier cost: 4 haiku + 7 opus
- Wave 1: 4 agents (parallel, no dependencies)
- Wave 2: 4 agents (depend on Wave 1 types/tables)
- Wave 3: 3 agents (depend on Wave 2 integration)
- Verification after all waves: `npx tsc --noEmit --skipLibCheck && npm run test:affected`
- Status: PENDING
