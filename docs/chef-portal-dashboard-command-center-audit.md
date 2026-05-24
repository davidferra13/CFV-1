# Chef Portal Dashboard: Command Center Audit

> **Date:** 2026-05-24
> **Scope:** `/dashboard` route, all `_sections/`, all `components/dashboard/`, all data sources
> **Standard:** Single-Pane-of-Glass Command Center

---

## 1. Executive Summary

**Verdict: The dashboard is a 70% command center with serious structural debt.**

The Chef Portal dashboard already functions as a command center in intent and data coverage. It surfaces real-time attention items, financial health, client intelligence, scheduling, and pricing data from ~50+ live Supabase queries. Every data source is real (zero mock data, zero hardcoded content). The progressive disclosure system correctly adapts to chef archetype, tenant maturity, and workspace density.

However, the dashboard has grown into a "god page" with significant problems:

1. **Duplicate data fetching:** 12+ server actions are called 2-3 times each on a single page load, hitting the database redundantly.
2. **Duplicate rendering:** CommandCenter and HeroZone show the same 3 metrics. CilSignalSummary renders twice. AlertCards and top-level widgets fetch identical data.
3. **Dead code:** 5 section files are not imported by any rendering path.
4. **Missing error isolation:** 8 of 18 Suspense sections lack WidgetErrorBoundary; a crash in HeroZone or AmbientLayer takes down the entire page.
5. **Silent failures:** 10 catch blocks swallow errors without logging.
6. **Performance waste:** BusinessHealthFullSection is collapsed by default but still executes ~20 database queries because collapse is CSS-only, not deferred rendering.
7. **Dead-end links:** `#remy` hash anchor, circular `/dashboard` fallbacks on alerts, inconsistent quick-create targets.

The bones are excellent. The data layer is clean and well-scoped. The fix is structural: deduplicate, add error boundaries, defer hidden content, and fix dead ends.

---

## 2. Current Dashboard Inventory

### Render Order (top to bottom in page.tsx)

| #   | Section                     | Component                                                                                                                                                               | Data Source                                                                                      | Actionable?                                                    |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 1   | Command Center              | `CommandCenterLayout`                                                                                                                                                   | `getCommandCenterData()` (events, inquiries, outstanding balance, attention items, week horizon) | Yes: 18+ links to inbox, events, clients, menus, finance       |
| 2   | OpenClaw Live Alerts        | `OpenClawLiveAlertsSection`                                                                                                                                             | PIE pricing pipeline                                                                             | Yes: links to pricing details                                  |
| 3   | Hero Zone                   | `DashboardHero` + quick action bar                                                                                                                                      | events, inquiries, outstanding balance, next event, archetype, support status                    | Yes: Daily Ops, Briefing, Create Menu, Storefront, primary CTA |
| 4   | Feature Suggestions         | `FeatureSuggestionSlot`                                                                                                                                                 | `getFeatureSuggestions()`                                                                        | Yes: contextual feature discovery links                        |
| 5   | Quick Notes + Chef Tips     | `QuickNotesSection` + `ChefTipsWidget`                                                                                                                                  | `getQuickNotes()`, `getTodaysTips()`                                                             | Yes: inline note creation, tip review                          |
| 6   | Tiered Rail                 | `TieredRail`                                                                                                                                                            | `assembleRailForPage()` + priority queue + lifecycle bridge                                      | Yes: prioritized action items with links                       |
| 7   | Chef Life Synthesis         | `ChefLifeSynthesisRail`                                                                                                                                                 | `getChefLifeDashboardSynthesis()` (7 domains)                                                    | Partially: narrative summary, some links                       |
| 8   | Daily Plan Banner           | `DailyPlanBanner`                                                                                                                                                       | `getDailyPlanStats()`                                                                            | Yes: link to daily ops                                         |
| 9   | This Week                   | Composite: schedule, saturation, pipeline, financial, client, pricing, completion                                                                                       | 15+ server actions                                                                               | Yes: per-card drill-downs                                      |
| 10  | Onboarding Zone             | `OnboardingBanner` + checklist + profile warning                                                                                                                        | `getOnboardingProgress()`, tenant presence, profile completeness                                 | Yes: setup steps with links                                    |
| 11  | Ambient Layer               | Today's schedule, alert grid (4-col), Remy alerts, staff, prep pressure, The Current, restaurant metrics, multi-location, network, dinner circles                       | 10+ server actions                                                                               | Mixed: alert grid is actionable, prep/network are passive      |
| 12  | Intelligence Digest         | `IntelligenceDigestClient`                                                                                                                                              | `getWeeklyDigest()`                                                                              | Partially: summary with some links                             |
| 13  | System Pulse (CIL)          | `CilSignalSummaryClient`                                                                                                                                                | `getSignalsForDisplay()`                                                                         | Yes: signal actions, domain breakdown                          |
| 14  | Activity Feed               | `FeedCard`                                                                                                                                                              | `getFeedItems()`                                                                                 | Partially: timeline entries with links                         |
| 15  | Weekly Reflection           | `WeeklyReflectionWidget`                                                                                                                                                | `getWeeklyRetroSummary()`                                                                        | Passive: summary only                                          |
| 16  | Profit at a Glance          | `ProfitAtAGlance`                                                                                                                                                       | `getProfitAtAGlance()`                                                                           | Passive: financial summary                                     |
| 17  | Revenue Goal                | `RevenueGoalWidget`                                                                                                                                                     | `getRevenueGoalSnapshot()`                                                                       | Yes: progress toward target                                    |
| 18  | Business Health (collapsed) | Composite: health score, portfolio, narrative, hero metrics, hours, recipes, command center, pricing, alerts, intelligence, CIL, automation, business cards, reputation | 20+ server actions                                                                               | Yes: deep drill-downs, but hidden by default                   |

### Component Counts

- **18 Suspense boundaries** in page.tsx
- **~50+ distinct database queries** per page load
- **~100 widget components** in `components/dashboard/`
- **~35 section files** in `_sections/`
- **12 WidgetErrorBoundary wrappers** (should be 18+)

---

## 3. Single-Pane-of-Glass Scorecard

| Category                           | Score (1-5) | Notes                                                                                                                                                                            |
| ---------------------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **At-a-glance status**             | 4           | Command Center + HeroZone deliver strong instant awareness. Duplicated metrics reduce clarity slightly.                                                                          |
| **Actionability**                  | 4           | Most cards link to real actions. A few passive-only widgets (heartbeat, reflection, profit summary). Quick action bar is strong.                                                 |
| **Navigation efficiency**          | 3           | Hub-and-spoke works, but 18 vertical sections force heavy scrolling. BusinessHealth at the bottom is a buried treasure trove.                                                    |
| **Data freshness**                 | 4           | All real Supabase queries on every load. SSE heartbeat for live updates. No stale/cached displays. No "last updated" timestamps though.                                          |
| **Workflow continuity**            | 3           | Priority queue and Tiered Rail show "what's next." No explicit "resume recent work" section. Daily Plan Banner helps but is conditional.                                         |
| **Progressive disclosure**         | 5           | Excellent. Archetype-aware, tenant-maturity-aware, workspace density support, brand-new-chef simplification. Best-in-class.                                                      |
| **Priority hierarchy**             | 3           | Command Center at top is correct, but HeroZone duplicates it immediately after. "This Week" and "Ambient Layer" blend urgency levels. No visual urgency tiers (red/amber/green). |
| **Role awareness**                 | 4           | Chef archetype drives content. Progressive disclosure adapts. System Nerve Center is admin-only. Support badge shown.                                                            |
| **Error/loading/empty states**     | 2           | 8 sections lack error boundaries. 10 silent catch blocks. 17 widgets vanish on empty data (no empty-state UI). 2 Suspense fallback={null}.                                       |
| **Overall command-center quality** | 3.5         | Strong data foundation, weak structural discipline. Needs deduplication, error isolation, and hierarchy tightening.                                                              |

**Weighted Average: 3.55 / 5**

---

## 4. Gaps

### 4.1 Duplicate Data Fetching (same DB queries executed multiple times per page load)

| Server Action                | Times Called | Files                                                                                |
| ---------------------------- | ------------ | ------------------------------------------------------------------------------------ |
| `getBusinessHealthSummary`   | 3x           | intelligence-cards.tsx, intelligence-section.tsx, widget-sections.tsx                |
| `getStuckEvents`             | 3x           | alerts-cards.tsx, alerts-section.tsx, business-section-loader.ts                     |
| `getUpcomingPaymentsDue`     | 3x           | alerts-cards.tsx, alerts-section.tsx, financial-pulse.tsx                            |
| `getExpiringQuotes`          | 3x           | alerts-cards.tsx, alerts-section.tsx, widget-sections.tsx                            |
| `getOnboardingProgress`      | 3x           | alerts-cards.tsx, alerts-section.tsx, onboarding-zone.tsx                            |
| `getRecipeDebt`              | 3x           | alerts-section.tsx, widget-sections.tsx, business-section-loader.ts                  |
| `getMonthOverMonthRevenue`   | 3x           | financial-pulse.tsx, business-section-loader.ts, business-cards-loader.ts            |
| `getActiveAlerts` (Remy)     | 2x           | alerts-section.tsx, ambient-layer.tsx                                                |
| `getCoolingClients`          | 2x           | alerts-cards.tsx, alerts-section.tsx                                                 |
| `getResponseTimeSummary`     | 2x           | alerts-cards.tsx, alerts-section.tsx                                                 |
| `getSignalsForDisplay` (CIL) | 2x           | cil-signal-summary.tsx (rendered at page level AND inside BusinessHealthFullSection) |

### 4.2 Duplicate Rendering

- **CommandCenter + HeroZone:** Both display events this week, open inquiries, and outstanding balance. User sees same 3 numbers twice in the first scroll.
- **CilSignalSummary:** Rendered at page.tsx line 161 AND inside BusinessHealthFullSection line 165. Identical component, identical data.
- **AlertCards (in BusinessHealth) vs AmbientLayer widgets:** Both fetch and display expiring quotes, overdue payments, messages.

### 4.3 Dead Code (files not imported by any rendering path)

| File                                 | Why Dead                                                                                      |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `_sections/intelligence-section.tsx` | Not imported by page.tsx or business-health-section.tsx. Legacy configurable layout artifact. |
| `_sections/alerts-section.tsx`       | Not imported. 635-line file with `widgetEnabled`/`widgetOrder` props from old layout.         |
| `_sections/pulse-summary.tsx`        | Not imported anywhere in dashboard rendering.                                                 |
| `_sections/pipeline-snapshot.tsx`    | Not imported anywhere in dashboard rendering.                                                 |
| `_sections/financial-pulse.tsx`      | Not imported anywhere in dashboard rendering.                                                 |

### 4.4 Dead-End Links

| Component                   | Link                           | Issue                                                                               |
| --------------------------- | ------------------------------ | ----------------------------------------------------------------------------------- |
| `shortcut-strip.tsx`        | `#remy`                        | Hash anchor, not a real route. Clicking does nothing.                               |
| `intelligence-cards.tsx`    | `alert.link \|\| '/dashboard'` | Fallback sends alert clicks back to dashboard (circular). 5 instances.              |
| `quick-create-strip.tsx`    | Todo -> `/tasks`               | Links to list page, not `/tasks/new`. Inconsistent with other quick-create buttons. |
| `decision-queue-widget.tsx` | Items without `href`           | Some decision items render as passive rows with no action path.                     |

### 4.5 Missing Error Isolation

These sections have NO WidgetErrorBoundary. A render error crashes the entire dashboard:

1. `OpenClawLiveAlertsSection` (line 94)
2. `HeroZone` (line 98)
3. `FeatureSuggestionSection` (line 107)
4. `DailyPlanBannerLoader` (line 137)
5. `ThisWeekSection` (line 141)
6. `OnboardingZone` (line 145)
7. `AmbientLayer` (line 149)
8. `BusinessHealthFullSection` (line 189)

### 4.6 Silent Error Swallowing (catch blocks with no logging)

| Location                                     | What Fails Silently                                               |
| -------------------------------------------- | ----------------------------------------------------------------- |
| `widget-sections.tsx` TieredRailSection (x2) | `assembleRailForPage()` and `injectRailLifecycleItems()` failures |
| `intelligence-digest-section.tsx`            | `getWeeklyDigest()` failure                                       |
| `automation-feed.tsx`                        | `getAutomationExecutions()` failure                               |
| `pulse-summary.tsx`                          | `getClientPulse()` failure                                        |
| `command-center-data.tsx` safeCount          | Individual DB count failures                                      |
| `page.tsx` DailyPlanBannerLoader             | `getDailyPlanStats()` failure                                     |
| `page.tsx` WeeklyReflectionLoader            | `getWeeklyRetroSummary()` failure                                 |
| `feature-suggestion-section.tsx`             | `getFeatureSuggestions()` failure                                 |
| `page.tsx` getPriorityQueue                  | Priority queue failure (affects TieredRail + ThisWeekSection)     |

### 4.7 Performance: Collapsed-but-Fetching

`BusinessHealthFullSection` uses `<DashboardSection defaultCollapsed>` which only applies CSS `max-h-0 overflow-hidden`. All ~20 child async server components still execute their database queries on every page load, even though the section starts hidden. This is pure waste for most users who never expand it.

### 4.8 Missing "At a Glance" Information

- **No "last updated" timestamp** on any widget.
- **No "resume recent work"** section showing drafts, recently edited events/menus/recipes.
- **No notification badge count** visible on the dashboard itself (must go to inbox).
- **Active clients card** empty state has no CTA (missed opportunity to link to client creation).

---

## 5. Recommended Dashboard Structure

The current structure is fundamentally sound. Rather than rebuilding, the recommended approach is to **tighten, deduplicate, and tier** what exists.

### Tier 1: Immediate Context (no scroll needed)

1. **Command Center** (keep as-is, it's the strongest section)
2. **Quick Action Bar** (extract from HeroZone, place directly under Command Center)
3. **Priority Alerts strip** (merge OpenClaw alerts + Remy alerts into one attention row)

### Tier 2: Today / This Week (first scroll)

4. **Today's Schedule** (promoted from Ambient Layer)
5. **Alert Grid** (4-col: messages, quotes, payments, shopping)
6. **This Week composite** (schedule cards, saturation, pipeline, financial pulse)
7. **Tiered Rail** (keep, well-designed)

### Tier 3: Intelligence & Analytics (second scroll)

8. **Chef Life Synthesis** (keep)
9. **Intelligence Digest** (keep)
10. **CIL System Pulse** (keep, but render ONLY here, not also in BusinessHealth)
11. **Profit at a Glance + Revenue Goal** (side by side)

### Tier 4: Deep Dive (collapsed by default, lazy-loaded)

12. **Business Health Section** (keep collapsed, but defer rendering until expanded)
13. **Activity Feed** (keep)
14. **Onboarding Zone** (keep, progressive disclosure already handles visibility)

### Remove from page.tsx

- **HeroZone greeting + metrics** (duplicates Command Center; keep only the quick action bar)
- **Duplicate CilSignalSummary** (remove from BusinessHealthFullSection)
- **Feature Suggestions** (move to onboarding zone or sidebar)

---

## 6. Implementation Plan

### Must Fix Now (safe, high-impact, no product decisions needed)

| #   | Fix                                                              | Impact                                                     | Risk                                           |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| 1   | Add WidgetErrorBoundary to 8 unprotected sections                | Prevents single widget crash from killing entire dashboard | None                                           |
| 2   | Fix `#remy` dead link in shortcut-strip.tsx                      | Removes dead-end user experience                           | None                                           |
| 3   | Fix `alert.link \|\| '/dashboard'` circular fallback             | Removes circular navigation                                | None                                           |
| 4   | Add `console.error` to 10 silent catch blocks                    | Makes failures debuggable                                  | None                                           |
| 5   | Remove duplicate CilSignalSummary from BusinessHealthFullSection | Eliminates redundant render + DB call                      | None                                           |
| 6   | Lazy-load BusinessHealthFullSection children when collapsed      | Saves ~20 DB queries for most page loads                   | Low (behavior change: content loads on expand) |

### Should Fix Next (moderate effort, clear value)

| #   | Fix                                                             | Impact                                            | Risk                                       |
| --- | --------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------ |
| 7   | Deduplicate CommandCenter + HeroZone metrics                    | Cleaner first impression, fewer DB calls          | Requires design decision on which to keep  |
| 8   | Consolidate duplicate data fetches (pass data down vs re-fetch) | 30-40% fewer DB queries per page load             | Moderate refactor, requires prop threading |
| 9   | Add empty-state UI to vanishing widgets                         | Users discover capabilities they don't know about | Requires UX copy                           |
| 10  | Add "Resume Recent Work" section                                | Workflow continuity improvement                   | New feature, needs data source             |
| 11  | Remove 5 dead code section files                                | Reduces confusion and maintenance surface         | Low (verify truly dead first)              |

### Nice to Have Later

| #   | Fix                                                              | Impact                       | Risk                            |
| --- | ---------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| 12  | Add "last updated" timestamps to widgets                         | Data freshness confidence    | Low effort but many touchpoints |
| 13  | Reorder sections to match recommended tier structure             | Better information hierarchy | Large diff, needs user testing  |
| 14  | Add notification badge to dashboard                              | Reduces need to check inbox  | Needs real-time count source    |
| 15  | Server-side data sharing (fetch once, pass to multiple sections) | Major perf win               | Architecture change             |

---

## 7. Engineering Notes

### Files to Change (Must Fix Now)

**Error boundaries (page.tsx):**

- `app/(chef)/dashboard/page.tsx` lines 94, 98, 107, 137, 141, 145, 149, 189: wrap in `<WidgetErrorBoundary>`

**Dead links:**

- `components/dashboard/shortcut-strip.tsx`: change `#remy` to `/remy` or a valid route
- `app/(chef)/dashboard/_sections/intelligence-cards.tsx`: replace `alert.link || '/dashboard'` with conditional render (hide link when no href)
- `components/dashboard/quick-create-strip.tsx`: change `/tasks` to `/tasks/new`

**Silent error logging:**

- `app/(chef)/dashboard/_sections/intelligence-digest-section.tsx`: add console.error to catch
- `app/(chef)/dashboard/_sections/automation-feed.tsx`: add console.error to catch
- `app/(chef)/dashboard/page.tsx` lines 84, 197, 203: add console.error to .catch()
- `app/(chef)/dashboard/_sections/feature-suggestion-section.tsx`: add console.error to .catch()
- `app/(chef)/dashboard/_sections/widget-sections.tsx` TieredRailSection: add console.error to catch blocks

**Duplicate CilSignalSummary:**

- `app/(chef)/dashboard/_sections/business-health-section.tsx`: remove CilSignalSummary (lines 163-167), it's already rendered at page level

**Lazy-load BusinessHealth:**

- `app/(chef)/dashboard/page.tsx`: wrap BusinessHealthFullSection in dynamic import with `ssr: false` or convert DashboardSection to conditionally render children only when expanded

### Supabase Tables Involved

All dashboard data queries are tenant-scoped via `user.tenantId!`. Key tables:

- `events`, `inquiries`, `clients`, `quotes`, `expenses`
- `event_financial_summary`, `client_financial_summary`
- `hub_messages`, `hub_guest_profiles`, `hub_group_members`
- `chef_preferences`, `chef_certifications`, `chef_incidents`
- `smart_grocery_lists`, `smart_grocery_items`
- `scheduled_messages`, `notifications`
- CIL: per-tenant SQLite (not Supabase)

### Data Quality

- **100% real data.** Zero mock, zero hardcoded content.
- **Two minor defaults:** suggested hours fallback (4/2/1/0.5 hours) and avg booking value fallback ($1,500) when no history exists.
- **All auth-gated** via `requireChef()` which throws if not authenticated.

### Type Safety

- All widget props are typed. No `any` leaks at the dashboard level.
- `PriorityQueue`, `HeroData`, `CommandCenterData` are well-defined interfaces.
- Widget actions return typed results with explicit empty-state shapes.

---

## 8. Acceptance Criteria

A chef can:

- [ ] Land on the dashboard and understand current status within 5 seconds (Command Center delivers this)
- [ ] See the most important actions without sidebar hunting (quick action bar + Tiered Rail)
- [x] Every major card has either a useful status, an action, or a drill-down (verified: only heartbeat and reflection are passive-by-design)
- [ ] Urgent or incomplete items appear prominently (Command Center + priority queue, but mixed with non-urgent in lower sections)
- [ ] Dashboard supports loading, empty, and error states on ALL sections (currently 8 sections lack error boundaries)
- [x] No duplicate navigation-only cards (verified: cards show data, not just links)
- [ ] Clear information hierarchy (currently: Command Center -> HeroZone duplicates -> mixed urgency sections)
- [x] Dashboard can be extended without turning into a messy grid (DashboardSection + WidgetErrorBoundary + progressive disclosure pattern is solid)
- [x] All data is real and tenant-scoped (verified: zero mock data)
- [ ] No dead-end links or circular navigation (3 dead ends found)
- [ ] No single widget crash can take down the entire page (8 unprotected sections)
- [ ] Collapsed sections don't waste DB queries (BusinessHealthFullSection still fetches when collapsed)

**Current pass rate: 5/12 (42%)**
**Target after Must Fix Now: 10/12 (83%)**
**Remaining 2 require design decisions (hierarchy reorder, empty states)**
