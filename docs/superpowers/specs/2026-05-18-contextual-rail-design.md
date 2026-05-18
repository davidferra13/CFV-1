# Contextual Rail: Full Design Spec

> The feature that makes ChefFlow feel like it THINKS.

**Status:** Design spec complete, ready for implementation planning
**Date:** 2026-05-18
**Architecture:** Phased A→C (Layout Route Parser → Parallel Route Slots)

---

## 1. What This Is

Three Rail surfaces, one intelligence system:

| Surface            | Where               | What                                                                           | Exists? |
| ------------------ | ------------------- | ------------------------------------------------------------------------------ | ------- |
| **RailStrip**      | Top bar, every page | 5-item ticker, SSE refresh, hot resolvers only                                 | YES     |
| **TieredRail**     | Dashboard only      | Full 4-tier rail (Critical/Action/Awareness/Opportunity), all 42 resolvers     | YES     |
| **ContextualRail** | Top of every page   | Collapsible intelligence banner, 8 categories, per-page profile, entity-scoped | NEW     |

The ContextualRail is the nervous system's bloodline. Dashboard shows everything (main artery). Each page shows exactly the intelligence relevant to what you're doing right now.

---

## 2. Architecture

### Phase 1: Layout-Level Route Parser

`<ContextualRail />` mounts in `app/(chef)/layout.tsx`, between RailStrip and `{children}`.

```
RailStrip          (existing, hot resolvers, 5 items)
ContextualRail     (NEW, per-page profile, 8 categories)
{children}         (page content)
```

Data flow:

1. `headers()` gives full pathname
2. `matchRailProfile(pathname)` finds the matching profile from the Rail Profile Registry
3. Profile defines: active categories, resolver filter, entity extraction, collapsed summary type
4. `assembleContextualRail(profile, entityContext, userId, tenantId)` runs scoped resolvers
5. Server component renders the banner with active categories only
6. Client component handles collapse/expand, hover popovers, inline actions, SSE refresh

Entity context extracted from URL:

- `/events/abc123` → `{ type: 'event', id: 'abc123' }`
- `/clients/def456` → `{ type: 'client', id: 'def456' }`
- `/menus/ghi789` → `{ type: 'menu', id: 'ghi789' }`
- `/calendar` → `{ type: 'page', id: 'calendar' }` (no entity, route-level only)

### Phase 2: Parallel Route Slots (5 High-Value Pages)

Add `app/(chef)/@rail/` parallel route:

- `app/(chef)/@rail/events/[id]/page.tsx` - event-specific rail with full entity context
- `app/(chef)/@rail/clients/[id]/page.tsx` - client-specific rail
- `app/(chef)/@rail/menus/[id]/page.tsx` - menu-specific rail
- `app/(chef)/@rail/calendar/page.tsx` - calendar-specific rail
- `app/(chef)/@rail/inquiries/page.tsx` - inquiry pipeline rail
- `app/(chef)/@rail/default.tsx` - fallback: Phase 1 route-parsed rail

Layout renders `{rail}` slot. Full SSR, no hydration bridge needed. Each slot has direct access to route params.

### Shell Budget Integration

Add to `ChefShellBudget`:

```ts
showContextualRail: boolean // false for immersive editors (menu editor, welcome page)
railDensity: 'full' | 'compact' | 'hidden' // respects workspace density preference
```

---

## 3. Rail Profile Schema

```ts
interface RailProfile {
  // --- Identity ---
  id: string // 'event-detail', 'client-detail', etc.
  pattern: RegExp // URL match pattern
  entityExtract?: (match: RegExpMatchArray) => EntityContext | null

  // --- Intelligence Categories ---
  categories: RailCategory[] // Which of 8 categories activate
  primaryCategory: RailCategory // Which category leads (leftmost/largest)

  // --- Data Scoping ---
  resolverFilter: string[] // Which resolvers to run (by resolver ID)
  entityScoped: boolean // Do resolvers receive entity context?

  // --- Collapsed State ---
  collapsedSummary: CollapsedSummaryType // What to show in one-line collapsed view
  collapsedMetrics: CollapsedMetric[] // Key numbers to surface when collapsed

  // --- Layout ---
  layout: 'columns' | 'stack' // Multi-column or single-column stack
  columnCount?: 2 | 3 | 4 // For column layout
  maxItems: number // Total item cap across all categories

  // --- Behavior ---
  refreshInterval?: number // Override SSE (e.g., calendar = 60s)
  defaultExpanded: boolean // Start expanded or collapsed?
  stickyOnScroll: boolean // Pin to top when scrolling?
}

type RailCategory =
  | 'readiness' // How complete/ready is this thing?
  | 'money' // Financial picture
  | 'people' // Who's involved, preferences, expectations
  | 'time' // Deadlines, countdowns, milestones
  | 'risk' // What could go wrong
  | 'intelligence' // Engine signals (PIE, CIL, weather, patterns)
  | 'communication' // Messages, follow-ups, outreach
  | 'actions' // What to do right now

interface EntityContext {
  type: 'event' | 'client' | 'menu' | 'recipe' | 'inquiry' | 'page'
  id: string
  parentIds?: Record<string, string> // e.g., menu knows its clientId via DB lookup
}

type CollapsedSummaryType =
  | 'readiness-bar' // Progress bar + percentage + critical count
  | 'metric-row' // Row of key metrics (dollar amounts, counts, dates)
  | 'countdown' // Primary countdown + secondary facts
  | 'status-ticker' // Scrolling status facts (like RailStrip but contextual)

interface CollapsedMetric {
  label: string // 'Margin', 'Due', 'Guests', 'Days Out'
  resolverKey: string // Which resolver provides this value
  format: 'currency' | 'percent' | 'number' | 'date' | 'countdown'
  severity?: 'normal' | 'warn' | 'critical' // Color coding
}
```

### Category to Resolver Mapping

Each intelligence category maps to a subset of the 42 existing resolvers:

| Category          | Resolvers                                                                              | What They Surface                                                              |
| ----------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Readiness**     | completion, event, menu-approval, packing, prep, shopping-list                         | Completion scores, missing items, prep status, packing status                  |
| **Money**         | payment, revenue-goal, recurring-invoice, vendor-invoice, receipt, revenue-opportunity | Balances, margins, costs, PIE alerts, revenue tracking                         |
| **People**        | dormant-client, client-birthday, followup, staff, network, review-request              | Client health, preferences, staff assignments, birthdays                       |
| **Time**          | event (countdown), contract, cadence-due, scheduled-message, hours                     | Deadlines, countdowns, milestones, booking windows                             |
| **Risk**          | weather, equipment-conflict, quality-drift, insurance, certification                   | Weather threats, equipment conflicts, quality decay, compliance                |
| **Intelligence**  | cil-signal, intelligence, dish-fatigue, weather-cooking, lifecycle-stage               | CIL patterns, dish fatigue, seasonal signals, lifecycle stage                  |
| **Communication** | message, inquiry, communication-feed, proposal-activity, waiting                       | Unread messages, inquiry response time, cadence due, proposals                 |
| **Actions**       | (derived from all above)                                                               | Actionable items extracted from other categories, presented as checkable tasks |

**Actions is special:** It doesn't have its own resolvers. It collects the highest-urgency actionable items from all other active categories and presents them as a check-off list. "Send menu for approval" comes from Readiness. "Respond to Sarah" comes from Communication. Actions is the distillation.

---

## 4. The 10 Core Rail Profiles

### Profile 1: Event Detail (`/events/[id]`)

**Categories:** Readiness, Money, People, Time, Risk, Intelligence, Actions (7 of 8)
**Layout:** 4 columns
**Collapsed:** Readiness bar + days until event + margin % + critical count

#### Column 1: READINESS + TIME (left, primary)

| Item                       | Source                                  | Presentation                                   |
| -------------------------- | --------------------------------------- | ---------------------------------------------- |
| Event readiness score      | completion-resolver (entity-scoped)     | Progress bar with %                            |
| Missing: menu not attached | completion-resolver                     | Checklist item, inline action: "Attach menu"   |
| Missing: contract unsigned | completion-resolver + contract-resolver | Checklist item, inline action: "Send contract" |
| Missing: guest count TBD   | completion-resolver                     | Checklist item, inline action: "Set count"     |
| Days until event           | event-resolver                          | Countdown badge                                |
| Prep: shop by [date]       | prep-resolver                           | Timeline milestone                             |
| Prep: pack by [date]       | packing-resolver                        | Timeline milestone                             |
| Menu approval deadline     | menu-approval-resolver                  | Deadline with status                           |

#### Column 2: MONEY

| Item                              | Source                           | Presentation           |
| --------------------------------- | -------------------------------- | ---------------------- |
| Quoted: $X                        | payment-resolver (entity-scoped) | Metric                 |
| Food cost: $Y (Z% margin)         | PIE integration + menu cost calc | Metric with severity   |
| Outstanding: $W                   | payment-resolver                 | Metric, red if overdue |
| Per-guest: $V                     | derived (total / guest count)    | Metric                 |
| Price alerts: [ingredient] up 15% | PIE/intelligence-resolver        | Alert pill             |

#### Column 3: PEOPLE + COMMUNICATION

| Item                         | Source                           | Presentation               |
| ---------------------------- | -------------------------------- | -------------------------- |
| Client: [name]               | event entity                     | Link to client profile     |
| Allergies: [list]            | client preferences               | Badge row                  |
| Dietary: [restrictions]      | client preferences               | Badge row                  |
| Last contact: [date/ago]     | communication-feed-resolver      | Metric with dormancy color |
| Unanswered: [count] messages | message-resolver (entity-scoped) | Alert if > 0               |
| Staff: [names] assigned      | staff-resolver                   | Avatar row                 |

#### Column 4: RISK + INTELLIGENCE

| Item                                  | Source                           | Presentation      |
| ------------------------------------- | -------------------------------- | ----------------- |
| Weather: [forecast] at event location | weather-resolver (entity-scoped) | Weather card      |
| Double-booking conflict               | equipment-conflict-resolver      | Alert if detected |
| CIL: [signal description]             | cil-signal-resolver              | Insight card      |
| Lifecycle stage: [stage]              | lifecycle-stage-resolver         | Badge             |
| Similar past event: [link]            | intelligence-resolver            | Reference link    |

#### Collapsed State

```
[===========-----] 72% ready  |  3 critical  |  12 days out  |  $2,400 quoted, 38% margin  |  2 messages waiting
```

#### Inline Actions Available

- "Attach menu" - opens menu picker modal
- "Send contract" - triggers contract generation flow
- "Set guest count" - inline number input
- "Send payment reminder" - one-click email
- "Message [client]" - quick compose popover
- "Mark prep complete" - checkbox toggle

---

### Profile 2: Client Detail (`/clients/[id]`)

**Categories:** People, Money, Communication, Risk, Intelligence (5 of 8)
**Layout:** 3 columns
**Collapsed:** Metric row: lifetime value + last contact + outstanding balance + event count

#### Column 1: PEOPLE (primary)

| Item                        | Source                   | Presentation            |
| --------------------------- | ------------------------ | ----------------------- |
| Dietary restrictions        | client entity            | Badge row               |
| Allergies                   | client entity            | Alert badge row         |
| Favorite dishes             | client preferences       | Pill list               |
| Household size              | client entity            | Metric                  |
| Circle membership           | dinner circles           | Link pills              |
| Event count (past/upcoming) | events query             | Metric pair             |
| Birthday: [date]            | client-birthday-resolver | Countdown if within 30d |

#### Column 2: MONEY + COMMUNICATION

| Item                | Source                                   | Presentation           |
| ------------------- | ---------------------------------------- | ---------------------- |
| Lifetime value      | payment-resolver (client-scoped)         | Metric                 |
| Outstanding balance | payment-resolver                         | Metric, red if overdue |
| Avg event spend     | derived                                  | Metric                 |
| Payment reliability | derived (on-time %)                      | Percent badge          |
| Last contact        | communication-feed-resolver              | Relative time          |
| Unanswered messages | message-resolver (client-scoped)         | Alert count            |
| Follow-up due       | followup-resolver + cadence-due-resolver | Date with action       |
| Scheduled sends     | scheduled-message-resolver               | Count with preview     |

#### Column 3: RISK + INTELLIGENCE

| Item                     | Source                              | Presentation         |
| ------------------------ | ----------------------------------- | -------------------- |
| Dormancy alert           | dormant-client-resolver             | Warning if triggered |
| Engagement trend         | intelligence-resolver               | Sparkline or arrow   |
| Rebooking opportunity    | revenue-opportunity-resolver        | Suggestion card      |
| CIL relationship signals | cil-signal-resolver (client-scoped) | Insight card         |
| Anniversary upcoming     | client-birthday-resolver (extended) | Countdown            |

#### Collapsed State

```
$18,400 lifetime  |  Last contact 3d ago  |  $650 outstanding  |  12 events  |  Follow-up due Thu
```

#### Inline Actions

- "Send follow-up" - quick compose
- "Log interaction" - note popover
- "Request review" - one-click trigger
- "Schedule cadence" - date picker

---

### Profile 3: Menu Detail (`/menus/[id]`)

**Categories:** Readiness, Money, People, Intelligence, Actions (5 of 8)
**Layout:** 4 columns (validated mockup)
**Collapsed:** Readiness bar + total food cost + margin % + dish count

#### Column 1: READINESS (primary)

| Item                          | Source                            | Presentation                     |
| ----------------------------- | --------------------------------- | -------------------------------- |
| Menu completion score         | completion-resolver (menu-scoped) | Progress bar                     |
| Dishes: X of Y costed         | derived from menu                 | Progress metric                  |
| Recipes: X of Y documented    | derived from dishes               | Progress metric                  |
| Dietary compliance            | menu dietary check                | Pass/fail badges per restriction |
| Missing: [dish] needs recipe  | completion-resolver               | Checklist, action: "Add recipe"  |
| Missing: [dish] needs costing | completion-resolver               | Checklist, action: "Cost dish"   |

#### Column 2: MONEY (PIE-powered)

| Item                       | Source                      | Presentation               |
| -------------------------- | --------------------------- | -------------------------- |
| Total food cost            | menu cost calculation + PIE | Metric                     |
| Per-guest food cost        | derived                     | Metric                     |
| Margin vs. quoted price    | payment + menu cost         | Percent with severity      |
| Price alerts               | PIE intelligence-resolver   | Alert pills per ingredient |
| Seasonal pricing note      | PIE seasonal data           | Info pill                  |
| Waste risk: over-portioned | yield factor analysis       | Warning if detected        |

#### Column 3: PEOPLE (client context)

| Item                       | Source                       | Presentation    |
| -------------------------- | ---------------------------- | --------------- |
| For: [client name]         | menu->event->client lookup   | Link            |
| Allergies: [list]          | client preferences           | Alert badges    |
| Dietary: [restrictions]    | client preferences           | Badges          |
| Favorites mentioned        | client preferences cross-ref | Highlight pills |
| Guest count                | event entity                 | Metric          |
| Past menus for this client | history query                | Expandable list |

#### Column 4: INTELLIGENCE + ACTIONS

| Item                                             | Source                 | Presentation |
| ------------------------------------------------ | ---------------------- | ------------ |
| Dish fatigue: [dish] served 3x in 60d            | dish-fatigue-resolver  | Warning card |
| Seasonal alignment: 4/5 dishes in season         | PIE seasonal           | Score badge  |
| Quality drift: [dish] hasn't been updated in 8mo | quality-drift-resolver | Info card    |
| Similar menus: [link]                            | intelligence-resolver  | Reference    |
| **Actions:**                                     |                        |              |
| Send for approval                                | menu-approval-resolver | Button       |
| Generate shopping list                           | shopping-list-resolver | Button       |
| Export PDF                                       | local action           | Button       |
| Recalculate costs                                | local action           | Button       |

#### Collapsed State

```
[=============---] 82% ready  |  $340 food cost  |  42% margin  |  6 dishes, 1 uncosted  |  2 price alerts
```

---

### Profile 4: Calendar (`/calendar`)

**Categories:** Time, Risk, Intelligence (3 of 8)
**Layout:** 3 columns
**Collapsed:** Countdown to next event + this week's event count + capacity warning

#### Column 1: TIME (primary)

| Item                      | Source                       | Presentation          |
| ------------------------- | ---------------------------- | --------------------- |
| Today's events            | event-resolver (date-scoped) | Event cards with time |
| Tomorrow's events         | event-resolver               | Event cards           |
| This week remaining       | event-resolver               | Compact list          |
| Prep milestones this week | prep-resolver                | Timeline items        |
| Contract deadlines        | contract-resolver            | Deadline badges       |
| Inquiry response windows  | inquiry-resolver             | Countdown pills       |

#### Column 2: RISK

| Item                                  | Source                       | Presentation  |
| ------------------------------------- | ---------------------------- | ------------- |
| Double-booking: [date]                | equipment-conflict-resolver  | Alert card    |
| No prep time: [event] follows [event] | derived from event proximity | Warning       |
| Events missing critical items         | completion-resolver (batch)  | Checklist     |
| Overdue payments for upcoming         | payment-resolver             | Alert pills   |
| Weather warnings for upcoming events  | weather-resolver (batch)     | Weather cards |

#### Column 3: INTELLIGENCE

| Item                                    | Source                       | Presentation     |
| --------------------------------------- | ---------------------------- | ---------------- |
| Booking pipeline: [X] inquiries pending | inquiry-resolver (aggregate) | Metric           |
| Capacity: [X]% booked this month        | derived                      | Gauge            |
| Seasonal trend: [insight]               | cil-signal-resolver          | Insight card     |
| Revenue forecast: $X this month         | revenue-goal-resolver        | Metric           |
| Open dates suggestion                   | intelligence-resolver        | Opportunity card |

#### Collapsed State

```
Next event: Wed (3d)  |  4 events this week  |  1 double-booking warning  |  78% booked this month
```

---

### Profiles 5-10: Remaining Pages

| Profile              | URL                       | Categories                                  | Layout          | Collapsed Summary                              |
| -------------------- | ------------------------- | ------------------------------------------- | --------------- | ---------------------------------------------- |
| **Inquiries**        | `/inquiries`              | Communication, Time, People, Money, Actions | 3 col           | X new, oldest Xh, $Y pipeline value            |
| **Finance**          | `/finance*`               | Money, Risk, Time                           | 3 col           | Outstanding $X, overdue $Y, revenue goal Z%    |
| **Recipe Detail**    | `/recipes/[id]`           | Readiness, Intelligence, Actions            | 2 col           | Completion %, yield calculated?, quality score |
| **Prep/Shopping**    | `/prep*`, `/shopping*`    | Readiness, Time, Actions                    | 2 col           | X items, Y% sourced, Z days until event        |
| **Analytics**        | `/analytics*`             | Money, Intelligence                         | 2 col           | Revenue $X, margin Y%, top insight             |
| **Settings/Profile** | `/settings*`, `/profile*` | Readiness                                   | 1 col (compact) | Profile X% complete, Y items to configure      |

---

## 5. Component Architecture

### Server Components

```
ContextualRailServer
  - Reads pathname from headers()
  - Matches rail profile
  - Extracts entity context from URL
  - Calls assembleContextualRail()
  - Renders ContextualRailClient with data

assembleContextualRail(profile, entity, userId, tenantId)
  - Filters resolvers to profile.resolverFilter
  - Runs resolvers with entity context (if entityScoped)
  - Scores via computeUniversalRailScore (with currentPage NOW WIRED)
  - Groups results by category
  - Applies per-category item caps
  - Returns ContextualRailData
```

### Client Components

```
ContextualRailClient
  - Manages expand/collapse state (persisted in localStorage)
  - SSE subscription for live refresh
  - Renders CollapsedBar or ExpandedPanel based on state

CollapsedBar
  - Single line, full width
  - Readiness bar (if applicable) + metric chips + critical count badge
  - Click anywhere to expand
  - Subtle pulse animation when critical items exist

ExpandedPanel
  - Column layout per profile (2/3/4 columns)
  - Each column = one or more categories
  - CategorySection renders items for that category
  - RailIntelCard = individual item with hover popover + inline actions
  - Collapse button (chevron) at right edge

RailIntelCard
  - Icon + label + value
  - Hover: popover with details, related items, history
  - Click: inline action OR navigate (per item config)
  - Severity coloring: normal (stone), warn (amber), critical (red)
  - Dismissable items have X button (with undo toast)
```

### Animation and Polish (S-Tier)

- **Expand/collapse:** height transition with content fade, 200ms ease-out
- **Critical pulse:** subtle red glow on collapsed bar when p0 items exist, 2s breathing animation
- **Hover popovers:** appear after 300ms delay, fade in 150ms, anchored to card
- **Inline action feedback:** optimistic UI with success checkmark or error shake
- **Category transitions:** items slide in by category when expanding, staggered 50ms
- **Empty state:** "All clear" message with subtle green checkmark when no items in a category
- **Loading skeleton:** per-category shimmer blocks matching the column layout
- **Keyboard:** `r` toggles rail expand/collapse (added to keyboard shortcuts)

---

## 6. Data Flow: Wiring the Dead Code

Phase 1 unlocks massive existing infrastructure that's currently dead:

### Fix 1: Unwire currentPage null (ONE LINE)

`rail-tier-assigner.ts` line 144 currently hardcodes `currentPage: null`. Change to pass actual pathname. This alone activates 226 registry items' pageAffinity scoring.

### Fix 2: Entity-Scoped Resolver Context

Extend `GodModeResolverContext`:

```ts
interface GodModeResolverContext {
  userId: string
  tenantId: string
  role: UniversalRailRole
  now: Date
  // NEW:
  currentPage?: string
  entityContext?: EntityContext
}
```

Resolvers that support entity scoping check `ctx.entityContext` and filter their queries. Backward compatible: existing resolvers ignore it.

### Fix 3: Slot Policy Activation

`applySlotPolicy()` in universal-rail-scoring.ts exists but is never called. Wire it into the assembly pipeline to prevent category flooding (e.g., 15 Money items drowning out 2 Risk items).

### Fix 4: Impression Tracking (Phase 2)

IntersectionObserver on RailIntelCard records impressions. Feeds into fatigue scoring (currently receives zeros). Prevents the same item from showing 100 times.

---

## 7. Resolver Enhancement for Entity Scoping

Existing resolvers need minimal changes. Pattern:

```ts
// BEFORE (event-resolver.ts)
export async function resolveEvents(ctx: GodModeResolverContext) {
  // Fetches ALL upcoming events for tenant
  const events = await getEvents(ctx.tenantId)
  ...
}

// AFTER
export async function resolveEvents(ctx: GodModeResolverContext) {
  if (ctx.entityContext?.type === 'event') {
    // On event detail page: deep analysis of THIS event only
    return resolveEntityEvent(ctx, ctx.entityContext.id)
  }
  // Elsewhere: same as before, all upcoming events
  const events = await getEvents(ctx.tenantId)
  ...
}
```

Entity-scoped resolvers produce RICHER data for the specific entity (deep completion analysis, full cost breakdown, all preferences) vs. the aggregate view (list of events with basic status).

---

## 8. Rail Profile Registry

Static registry, lives in `lib/discovery/rail-profiles.ts`:

```ts
export const RAIL_PROFILES: RailProfile[] = [
  {
    id: 'event-detail',
    pattern: /^\/events\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'event', id: m[1] }),
    categories: ['readiness', 'money', 'people', 'time', 'risk', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: [
      'completion',
      'event',
      'payment',
      'prep',
      'packing',
      'shopping-list',
      'menu-approval',
      'contract',
      'message',
      'communication-feed',
      'staff',
      'weather',
      'equipment-conflict',
      'cil-signal',
      'intelligence',
      'lifecycle-stage',
      'dish-fatigue',
    ],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Ready', resolverKey: 'completion', format: 'percent' },
      { label: 'Critical', resolverKey: '_critical_count', format: 'number', severity: 'critical' },
      { label: 'Days', resolverKey: 'event', format: 'countdown' },
      { label: 'Margin', resolverKey: 'payment', format: 'percent' },
      { label: 'Messages', resolverKey: 'message', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 4,
    maxItems: 24,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'client-detail',
    pattern: /^\/clients\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'client', id: m[1] }),
    categories: ['people', 'money', 'communication', 'risk', 'intelligence'],
    primaryCategory: 'people',
    resolverFilter: [
      'payment',
      'dormant-client',
      'client-birthday',
      'followup',
      'message',
      'communication-feed',
      'cadence-due',
      'scheduled-message',
      'revenue-opportunity',
      'cil-signal',
      'intelligence',
      'review-request',
    ],
    entityScoped: true,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Lifetime', resolverKey: 'payment', format: 'currency' },
      { label: 'Last Contact', resolverKey: 'communication-feed', format: 'date' },
      { label: 'Outstanding', resolverKey: 'payment', format: 'currency' },
      { label: 'Events', resolverKey: 'event', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 18,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'menu-detail',
    pattern: /^\/menus\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'menu', id: m[1] }),
    categories: ['readiness', 'money', 'people', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: [
      'completion',
      'payment',
      'menu-approval',
      'dish-fatigue',
      'quality-drift',
      'intelligence',
      'cil-signal',
      'shopping-list',
    ],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Ready', resolverKey: 'completion', format: 'percent' },
      { label: 'Food Cost', resolverKey: 'payment', format: 'currency' },
      { label: 'Margin', resolverKey: 'payment', format: 'percent' },
      { label: 'Dishes', resolverKey: 'completion', format: 'number' },
      { label: 'Alerts', resolverKey: 'intelligence', format: 'number' },
    ],
    layout: 'columns',
    columnCount: 4,
    maxItems: 20,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'calendar',
    pattern: /^\/calendar$/,
    categories: ['time', 'risk', 'intelligence'],
    primaryCategory: 'time',
    resolverFilter: [
      'event',
      'contract',
      'prep',
      'packing',
      'inquiry',
      'equipment-conflict',
      'weather',
      'completion',
      'payment',
      'revenue-goal',
      'cil-signal',
      'intelligence',
    ],
    entityScoped: false,
    collapsedSummary: 'countdown',
    collapsedMetrics: [
      { label: 'Next', resolverKey: 'event', format: 'countdown' },
      { label: 'This Week', resolverKey: 'event', format: 'number' },
      { label: 'Warnings', resolverKey: '_critical_count', format: 'number', severity: 'warn' },
      { label: 'Booked', resolverKey: 'revenue-goal', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'inquiries',
    pattern: /^\/inquiries/,
    categories: ['communication', 'time', 'people', 'money', 'actions'],
    primaryCategory: 'communication',
    resolverFilter: [
      'inquiry',
      'message',
      'communication-feed',
      'payment',
      'followup',
      'cadence-due',
      'intelligence',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'New', resolverKey: 'inquiry', format: 'number' },
      { label: 'Oldest', resolverKey: 'inquiry', format: 'countdown' },
      { label: 'Pipeline', resolverKey: 'payment', format: 'currency' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'recipe-detail',
    pattern: /^\/recipes\/([^/]+)$/,
    entityExtract: (m) => ({ type: 'recipe', id: m[1] }),
    categories: ['readiness', 'intelligence', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: ['completion', 'dish-fatigue', 'quality-drift', 'intelligence'],
    entityScoped: true,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Complete', resolverKey: 'completion', format: 'percent' },
      { label: 'Quality', resolverKey: 'quality-drift', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 10,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'finance',
    pattern: /^\/finance/,
    categories: ['money', 'risk', 'time'],
    primaryCategory: 'money',
    resolverFilter: [
      'payment',
      'revenue-goal',
      'recurring-invoice',
      'vendor-invoice',
      'receipt',
      'revenue-opportunity',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Outstanding', resolverKey: 'payment', format: 'currency' },
      { label: 'Overdue', resolverKey: 'payment', format: 'currency', severity: 'critical' },
      { label: 'Goal', resolverKey: 'revenue-goal', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 3,
    maxItems: 15,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'prep-shopping',
    pattern: /^\/(prep|shopping)/,
    categories: ['readiness', 'time', 'actions'],
    primaryCategory: 'readiness',
    resolverFilter: ['prep', 'shopping-list', 'packing', 'event', 'completion'],
    entityScoped: false,
    collapsedSummary: 'readiness-bar',
    collapsedMetrics: [
      { label: 'Items', resolverKey: 'shopping-list', format: 'number' },
      { label: 'Sourced', resolverKey: 'shopping-list', format: 'percent' },
      { label: 'Next Event', resolverKey: 'event', format: 'countdown' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 12,
    defaultExpanded: true,
    stickyOnScroll: false,
  },
  {
    id: 'analytics',
    pattern: /^\/analytics/,
    categories: ['money', 'intelligence'],
    primaryCategory: 'intelligence',
    resolverFilter: [
      'revenue-goal',
      'payment',
      'cil-signal',
      'intelligence',
      'revenue-opportunity',
    ],
    entityScoped: false,
    collapsedSummary: 'metric-row',
    collapsedMetrics: [
      { label: 'Revenue', resolverKey: 'revenue-goal', format: 'currency' },
      { label: 'Margin', resolverKey: 'payment', format: 'percent' },
    ],
    layout: 'columns',
    columnCount: 2,
    maxItems: 10,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
  {
    id: 'fallback',
    pattern: /.*/,
    categories: ['actions', 'risk'],
    primaryCategory: 'actions',
    resolverFilter: [], // Empty = run hot resolvers only (like RailStrip)
    entityScoped: false,
    collapsedSummary: 'status-ticker',
    collapsedMetrics: [
      { label: 'Critical', resolverKey: '_critical_count', format: 'number', severity: 'critical' },
    ],
    layout: 'stack',
    maxItems: 5,
    defaultExpanded: false,
    stickyOnScroll: false,
  },
]
```

Profile matching: first match wins. Fallback is last (catches everything).

---

## 9. Visual Design Language (S-Tier)

### Color System

Categories have dedicated color identities:

| Category      | Color  | Collapsed Chip                       | Expanded Header           |
| ------------- | ------ | ------------------------------------ | ------------------------- |
| Readiness     | Blue   | `bg-blue-500/10 text-blue-400`       | Blue progress bar         |
| Money         | Green  | `bg-emerald-500/10 text-emerald-400` | Green metrics             |
| People        | Violet | `bg-violet-500/10 text-violet-400`   | Violet avatars/badges     |
| Time          | Amber  | `bg-amber-500/10 text-amber-400`     | Amber countdowns          |
| Risk          | Red    | `bg-red-500/10 text-red-400`         | Red alerts                |
| Intelligence  | Cyan   | `bg-cyan-500/10 text-cyan-400`       | Cyan insight cards        |
| Communication | Indigo | `bg-indigo-500/10 text-indigo-400`   | Indigo message indicators |
| Actions       | Stone  | `bg-stone-500/10 text-stone-300`     | Neutral checkboxes        |

### Collapsed Bar Anatomy

```
+--[===========------]--72%--+--3 critical--+--12d out--+--$2.4k / 38%--+--2 msgs--+--[v]--+
|  readiness bar (blue)      | red badge    | amber     | green metrics  | indigo   | toggle|
+----------------------------+--------------+-----------+----------------+----------+-------+
```

- Full width, 36px height, `bg-stone-950/90 backdrop-blur-sm border-b border-stone-800/50`
- Readiness bar only shows on profiles where primaryCategory is 'readiness'
- Metrics are color-coded pills per their category
- Critical badge pulses subtly if count > 0
- Toggle chevron rotates on expand/collapse
- Entire bar is clickable (expand/collapse)

### Expanded Panel Anatomy

```
+------------------------------------------------------------------------+
| [^] Contextual Rail                                     [collapse]     |
+-------------------+------------------+------------------+--------------+
| READINESS + TIME  | MONEY            | PEOPLE + COMMS   | RISK + INTEL |
| (blue/amber)      | (green)          | (violet/indigo)  | (red/cyan)   |
|                   |                  |                  |              |
| [===] 72% ready   | Quoted: $2,400   | Sarah Chen       | Weather: 68F |
| [ ] Attach menu   | Food: $840       | Allergies: nuts  | No conflicts |
| [x] Guest count   | Margin: 38%      | Last: 2d ago     | CIL: strong  |
| [ ] Send contract | Outstanding: $0  | 0 unanswered     | Stage: prep  |
|                   |                  |                  |              |
| 12d until event   | Per-guest: $56   | Staff: 1 of 2    | Similar: ... |
| Shop by: May 22   | 2 price alerts   | Follow-up: none  |              |
| Pack by: May 28   |                  |                  |              |
+-------------------+------------------+------------------+--------------+
|                    ACTIONS: Send menu for approval | Message Sarah     |
+------------------------------------------------------------------------+
```

- Max height: 280px expanded (scrollable if overflow)
- Column widths: equal distribution, responsive (stack on mobile)
- Category headers: 10px uppercase, category color, with icon
- Items: 13px, stone-300 text, hover brightens
- Actions row: bottom of panel, full width, prominent buttons
- Background: `bg-stone-950/95 backdrop-blur-md`
- Border: `border border-stone-800/60 rounded-lg` (slight rounding, premium feel)
- Shadow: `shadow-lg shadow-black/20` (depth)

### Mobile Adaptation

- Columns stack vertically
- Collapsed bar becomes single-line scrollable (like RailStrip)
- Expanded panel: full-width accordion per category
- Swipe down to collapse
- Touch targets: minimum 44px

---

## 10. Implementation Sequence

### Wave 1: Foundation (enables everything)

1. Create `lib/discovery/rail-profiles.ts` with profile registry and types
2. Create `lib/discovery/contextual-rail-assembly.ts` (assembler that accepts profiles)
3. Fix `currentPage: null` in rail-tier-assigner.ts (one-liner, unlocks 226 items)
4. Extend `GodModeResolverContext` with `currentPage` + `entityContext`
5. Create `matchRailProfile()` URL matcher with entity extraction
6. Wire `applySlotPolicy()` into assembly pipeline

### Wave 2: Component Shell

7. Create `components/rail/contextual-rail-server.tsx` (server component)
8. Create `components/rail/contextual-rail-client.tsx` (client component)
9. Create `components/rail/collapsed-bar.tsx`
10. Create `components/rail/expanded-panel.tsx`
11. Create `components/rail/category-section.tsx`
12. Create `components/rail/rail-intel-card.tsx`
13. Mount in `app/(chef)/layout.tsx`

### Wave 3: Entity Scoping (5 key resolvers)

14. Add entity scoping to `event-resolver.ts`
15. Add entity scoping to `payment-resolver.ts`
16. Add entity scoping to `completion-resolver.ts`
17. Add entity scoping to `message-resolver.ts`
18. Add entity scoping to `communication-feed-resolver.ts`

### Wave 4: Polish + Remaining Resolvers

19. Hover popovers on RailIntelCard
20. Inline actions (check-off, quick compose, one-click triggers)
21. Keyboard shortcut (`r` to toggle)
22. SSE refresh integration
23. localStorage persistence for expand/collapse state per profile
24. Entity scoping for remaining resolvers (as needed per profile)

### Wave 5: Phase 2 (Parallel Routes)

25. Create `app/(chef)/@rail/` parallel route structure
26. Event detail parallel route with full entity context
27. Client detail parallel route
28. Menu detail parallel route
29. Calendar parallel route
30. Inquiries parallel route
31. Update layout.tsx to render `{rail}` slot

---

## 11. The `/rail-audit` Skill

Generates and refines Rail Profiles page by page. Workflow:

1. Takes a URL pattern as input (or iterates all routes)
2. Reads the page component to understand what the page does
3. Identifies which entities are loaded
4. Maps to intelligence categories
5. Selects resolvers
6. Designs the collapsed summary
7. Writes/updates the profile in the registry
8. Generates a mockup if requested

Questions it answers per page:

- What is the user doing on this page?
- What was the user most likely doing BEFORE this page?
- What will the user most likely do AFTER this page?
- Which engines/resolvers feed this page?
- What can the user act on directly from the Rail here?
- What should NOT appear in the Rail on this page?

---

## 12. Success Criteria

The Contextual Rail is S-Tier when:

- [ ] Every page knows what you're doing and surfaces relevant intelligence
- [ ] Collapsed state tells you everything critical in one glance
- [ ] Expanding feels like opening a command center, not a settings panel
- [ ] Inline actions mean you never leave the page to handle what the Rail surfaces
- [ ] Hover popovers give you depth without navigation
- [ ] The Rail feels like it THINKS, not like it lists
- [ ] Zero false alarms (slot policy + fatigue scoring prevent noise)
- [ ] Entity-scoped pages (event, client, menu) feel like a dossier on that specific thing
- [ ] Dashboard rail (TieredRail) and contextual rail feel like one system, not two
- [ ] Mobile experience is clean, not cramped
- [ ] Performance: contextual rail adds < 100ms to page load (resolver scoping keeps it fast)
- [ ] Chef says "how did I ever work without this"
