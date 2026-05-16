# Contextual Wiring: Mise en Place

> **Status:** spec-ready
> **Created:** 2026-05-14
> **Problem:** 500+ chef portal pages with 80% infrastructure built but only 20-30% wired at the UI layer. Features live on islands. 42+ built components never imported. No "next step" flows. No cross-domain sidebars. Price changes don't cascade.

## Philosophy

**Mise en place:** everything where you need it, ready to go. The chef should never leave what they're working on to connect it to the next thing. If the umbrella should be in the backpack, put it in the backpack.

## Three Tiers

### Tier 1: Zero-Effort Wins (Import Existing Components)

Components fully built in `components/` but never imported into any `app/` page.

#### Menus Domain (7 orphans)

| Component            | File                                           | Mount On                                 |
| -------------------- | ---------------------------------------------- | ---------------------------------------- |
| SaveAsTemplateButton | `components/menus/save-as-template-button.tsx` | Menu detail action bar, quick-view modal |
| CloneMenuButton      | `components/menus/clone-menu-button.tsx`       | Menu detail action bar                   |
| TemplateLibrary      | `components/menus/template-library.tsx`        | Menu list page tab or create flow        |
| MenuHealthScore      | `components/menus/menu-health-score.tsx`       | `/menus/[id]` detail page                |
| RecipeGapIndicator   | `components/menus/recipe-gap-indicator.tsx`    | Menu detail per-dish or summary banner   |
| MenuHistoryTimeline  | `components/menus/menu-history-timeline.tsx`   | Menu detail page                         |
| MenuPdfButton        | `components/menus/menu-pdf-button.tsx`         | Menu detail action bar                   |

#### Recipes Domain (5 orphans)

| Component           | File                                            | Mount On                                       |
| ------------------- | ----------------------------------------------- | ---------------------------------------------- |
| ScaleForEventButton | `components/recipes/scale-for-event-button.tsx` | Recipe detail (when linked to upcoming events) |
| RecipeLineage       | `components/recipes/recipe-lineage.tsx`         | Recipe detail header (both variants)           |
| RecipeSlideshow     | `components/recipes/recipe-slideshow.tsx`       | Recipe detail, step photos page                |
| StepPhotoGallery    | `components/recipes/step-photo-gallery.tsx`     | Recipe detail (after Method section)           |
| RecipeStatusBadge   | `components/recipes/recipe-status-badge.tsx`    | Recipe list cards, recipe detail header        |

#### Dashboard Domain (top 10 highest-impact of 30+ orphans)

| Component                                      | File                    | Why High Impact            |
| ---------------------------------------------- | ----------------------- | -------------------------- |
| live-inbox-widget / unread-hub-messages-widget | `components/dashboard/` | Unread messages are urgent |
| expiring-quotes-widget                         | `components/dashboard/` | Revenue at risk            |
| overdue-payments-widget                        | `components/dashboard/` | Cash flow                  |
| dormant-clients-widget                         | `components/dashboard/` | Relationship decay         |
| client-birthdays-widget                        | `components/dashboard/` | Relationship nurturing     |
| shopping-window-widget                         | `components/dashboard/` | Prep timing                |
| quick-availability-widget                      | `components/dashboard/` | Booking management         |
| quick-expense-widget                           | `components/dashboard/` | Daily expense capture      |
| hours-log-widget                               | `components/dashboard/` | Profitability tracking     |
| recipe-capture-widget                          | `components/dashboard/` | Recipe documentation       |

#### CIL Signal Fix (1 line change)

File: `app/(chef)/dashboard/_sections/cil-signal-summary.tsx:8`
Change `DOMAINS` from `['finance', 'pipeline', 'calendar']` to `['finance', 'pipeline', 'calendar', 'clients', 'inventory', 'reputation']`

---

### Tier 2: Missing Links, Sidebars, and Next Steps

#### Missing Trivial Links (one `<Link>` tag each)

| From                                       | To                                                           | File to Edit                            |
| ------------------------------------------ | ------------------------------------------------------------ | --------------------------------------- |
| Event detail: client name                  | `/clients/[id]`                                              | `event-detail-overview-tab.tsx:305`     |
| Event list: client name                    | `/clients/[id]`                                              | `events/page.tsx:372`                   |
| Event detail: inquiry backlink             | `/inquiries/[id]`                                            | `events/[id]/page.tsx` header           |
| Client detail: relationship page           | `/clients/[id]/relationship`                                 | `clients/[id]/page.tsx:341`             |
| Client detail: summary/print page          | `/clients/[id]/summary`                                      | `clients/[id]/page.tsx:341`             |
| Client detail: preferences page            | `/clients/[id]/preferences`                                  | `clients/[id]/page.tsx:739`             |
| Client detail: ops snapshot metrics        | Filtered views (quotes, inquiries)                           | `clients/[id]/page.tsx:393-580`         |
| Recipe list: sub-pages                     | `/culinary/recipes/drafts,tags,dietary-flags,seasonal-notes` | `culinary/recipes/page.tsx`             |
| Recipe detail: costing page                | `/culinary/costing/recipe`                                   | `recipes/[id]/recipe-detail-client.tsx` |
| Recipe detail: cross-link to other variant | `/culinary/recipes/[id]` <-> `/recipes/[id]`                 | Both detail pages                       |
| Prep timeline: recipe links                | `/culinary/recipes/[id]`                                     | `culinary/prep/timeline/page.tsx`       |
| Prep overview: shopping with context       | Add date/event query params                                  | `culinary/prep/page.tsx:127`            |
| Costing hub: shopping list link            | `/culinary/prep/shopping`                                    | `culinary/costing/page.tsx`             |
| Calendar peek in inbox: event links        | `/events/[id]`                                               | `inbox-calendar-peek.tsx`               |
| Menu context dock: event picker            | Event picker (like client/circle pickers)                    | `menu-context-dock.tsx:317`             |
| Event detail: recipe links in prep tab     | `/culinary/recipes/[id]`                                     | `event-detail-prep-tab.tsx:163`         |
| Event detail: quote backlink               | `/quotes/[id]`                                               | `events/[id]/page.tsx`                  |
| Event list: empty expense CTA              | Move button outside length gate                              | `event-detail-money-tab.tsx:315`        |

#### ClientContextSidebar Expansion

Currently: only `app/(chef)/inbox/triage/[threadId]/page.tsx`
Component: `components/communication/client-context-sidebar.tsx`
Data: `lib/communication/client-context.ts` (`getClientContextForThread` works with any clientId)

Mount on:

1. `/events/[id]` - event detail (replace static client info card)
2. `/clients/[id]/relationship` - relationship intelligence page
3. `/clients/[id]/recurring` - recurring planning page
4. `/clients/[id]/preferences` - preferences editor
5. `/quotes/[id]` - quote detail page

#### MenuContextSidebar Expansion

Currently: only `/culinary/menus/[id]`
Component: `components/culinary/menu-context-sidebar.tsx`

Mount on:

1. `/menus/[id]` - primary menu detail page (reconcile with existing context dock)

#### Missing "Next Step" Flows

Create a `ChefNextStepBar` component (or extend `PostActionFooter` pattern) for chef-side pages:

| After Action           | Suggested Next Steps                                         |
| ---------------------- | ------------------------------------------------------------ |
| Create menu            | Attach to Event, Save as Template, Generate Shopping List    |
| Create event           | Attach Menu, Send Proposal, Set Up Schedule                  |
| Create recipe          | Add to Menu, Cost Recipe, Add Dietary Flags, Add Step Photos |
| Create client          | Create Event, Send Intake Form, Set Up Recurring             |
| Lock menu              | Generate FOH Document, Send for Client Approval              |
| Complete close-out     | Request Review, Rebook Client                                |
| File AAR               | Send Follow-Up, Close Financial                              |
| Complete debrief       | File AAR, Send Review Request                                |
| Generate shopping list | Start Prep, Print by Store, Share with Assistant             |
| Duplicate menu         | Edit Name, Attach to New Event                               |
| Attach menu to event   | View Prep Timeline, Generate Shopping List                   |
| Recipe sprint capture  | Review Saved Recipe, Add to Menu                             |

#### Missing Client Table Enhancements

- Add `DietarySummaryBadge` to client table rows (data already in client object)
- Make client ops snapshot metrics (proposals, payments, quotes) clickable with filtered links

---

### Tier 3: Automation and Propagation Chains

#### Price Propagation (Currently Broken Chain)

```
Price Change (PIE/Receipt/Pi Bridge)
  |
  v
propagatePriceChange() in lib/pricing/cost-refresh-actions.ts
  |
  +-- Recipe costs: WORKS (recalculates recipe_ingredient.computed_cost_cents)
  +-- Event flag: PARTIAL (sets cost_needs_refresh=true, no push recalc)
  +-- Menu costs: MISSING (never recalculated)
  +-- Quote costs: MISSING (never recalculated, no proactive alert)
  +-- Grocery lists: MISSING (saved lists show stale prices)
  +-- Revalidation: PARTIAL (only /culinary/costing and /culinary/recipes, NOT /events, /quotes, /menus)
```

**Fix:** Extend `propagatePriceChange` to:

1. Recalculate menu cost summaries for affected menus
2. Flag affected quotes with `cost_drift_detected=true`
3. Revalidate `/events`, `/quotes`, `/culinary/menus`, `/culinary/ingredients`
4. Emit CIL signal for significant price movements

#### Recipe Edit Cascade

```
Recipe Edit (ingredients/method/yield change)
  |
  v
updateRecipe() in lib/recipes/actions.ts
  |
  +-- Events using recipe: NOT NOTIFIED
  +-- Menu costs: NOT REFRESHED
  +-- Shopping lists: NOT INVALIDATED
```

**Fix:** After `updateRecipe`, query events using this recipe via `getEventsUsingRecipe`, flag them with `cost_needs_refresh=true`, emit CIL signal.

#### Menu Lifecycle Automations

| Trigger                              | Automation                                |
| ------------------------------------ | ----------------------------------------- |
| Menu approved/locked                 | Auto-generate shopping list draft         |
| Menu attached to event               | Auto-check allergen conflicts with client |
| All components recipe-linked         | Surface "Ready to share" nudge            |
| Guest count mismatch (menu vs event) | Surface warning on detail page            |
| Food cost % > 35%                    | Visual flag on list page cards            |

#### Ingredient Lifecycle Automations

| Trigger                    | Automation                                               |
| -------------------------- | -------------------------------------------------------- |
| Ingredient added to recipe | Auto-check stock, auto-resolve PIE price                 |
| Ingredient price updated   | Cascade to recipe costs (already works), extend to menus |
| Seasonal change            | Flag out-of-season ingredients in active menus           |
| New ingredient created     | Auto-check PIE coverage, queue background price lookup   |

#### Communication Automations

| Trigger                    | Automation                          |
| -------------------------- | ----------------------------------- |
| Client goes dormant        | Auto-create follow-up touchpoint    |
| Thread resolved as inquiry | Emit CIL signal                     |
| Triage suggestion applied  | Persist as classification rule      |
| Staged client confirmed    | Retroactively link existing threads |

#### Event Lifecycle Automations

| Trigger                  | Automation                                      |
| ------------------------ | ----------------------------------------------- |
| Event completed          | Auto-redirect to close-out wizard               |
| Draft event > 7 days old | Dashboard nudge                                 |
| Menu attached            | Auto-navigate to prep tab or show success nudge |
| Event state transition   | Contextual "next step" guidance per transition  |

---

## Implementation Strategy

### Wave 2: Tier 1 (Zero-Effort Wins)

8 parallel agents, one per domain. Each imports existing orphan components into pages. No new components needed. Estimated: 42+ component imports.

### Wave 3: Tier 2 (Links, Sidebars, Next Steps)

4-6 parallel agents:

- Agent 1: All trivial links (18 items)
- Agent 2: ClientContextSidebar expansion (5 pages)
- Agent 3: MenuContextSidebar + event picker on context dock
- Agent 4: ChefNextStepBar component + mount on key pages
- Agent 5: Recipe detail page unification (merge features from both variants)
- Agent 6: Client table enhancements

### Wave 4: Tier 3 (Automations)

Serial builds (these touch shared infrastructure):

- Phase A: Price propagation chain fix
- Phase B: Recipe edit cascade
- Phase C: Menu lifecycle automations
- Phase D: Communication automations
- Phase E: Event lifecycle automations

---

## Success Criteria

1. Zero orphan components in `components/` that are built but never imported
2. Every entity detail page links to related entities (no plain-text names)
3. Every create/complete action has a "next step" suggestion
4. ClientContextSidebar appears on all client-context pages (5+)
5. Price changes cascade through recipes -> menus -> events -> quotes
6. CIL surfaces all 6 signal domains on dashboard
7. Chef can complete a full workflow (inquiry -> event -> menu -> prep -> close-out) without manually navigating between domains

## Non-Goals

- No new domain features (this is wiring, not building)
- No navigation restructuring (that's the Action Bar spec)
- No performance optimization (separate concern)
- No new database tables or migrations
- No new server actions (reuse existing)
