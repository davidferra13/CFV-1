# System Integrity Question Set: Chef Dashboard

> 40 questions across 10 domains. Covers every widget, data source, error path, and cross-system connection on the chef dashboard.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                                                  | Answer                                                                                                                                                                                                                                                                               | Status |
| --- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 1   | Does the dashboard page call `requireChef()` at the top level?                            | Yes. `page.tsx` line 322 calls `requireChef()` as first operation. Returns user with tenantId.                                                                                                                                                                                       | BUILT  |
| 2   | Do all `_sections/` server components call `requireChef()` or delegate to auth-gated fns? | Yes. All 12 section files verified: hero-metrics, schedule-cards, alerts-cards, business-cards, intelligence-cards, command-center-data, smart-suggestions, network-activity, dinner-circles, restaurant-metrics all call `requireChef()` directly or delegate to functions that do. | BUILT  |
| 3   | Are admin-only widgets gated behind `isAdmin()`?                                          | Yes. CoverageHealthSection, OpenClawLiveAlertsSection, PipelineStatusSection all check `await safe('isAdmin', isAdmin, false)` and return null for non-admins.                                                                                                                       | BUILT  |
| 4   | Is the restaurant metrics section gated to appropriate archetypes only?                   | Yes. Page line 409: `archetype && ['restaurant', 'food-truck', 'bakery'].includes(archetype)`. Other archetypes never see it.                                                                                                                                                        | BUILT  |

## Domain 2: Error Isolation & Resilience

| #   | Question                                                                  | Answer                                                                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Does a single widget failure crash the entire dashboard?                  | No. Every async section wrapped in `<WidgetErrorBoundary compact>` + `<Suspense>`. Widget failures render inline error with retry button. Rest of page unaffected.                                              | BUILT  |
| 6   | Does the `safe()` wrapper prevent data-fetch exceptions from propagating? | Yes. `safe()` defined at page level (line 53) and in each section file. try/catch with console.error, returns typed fallback. Used on all async data fetches.                                                   | BUILT  |
| 7   | Does the page-level `error.tsx` hide raw error messages from the user?    | Yes. Fixed this session. Shows static "Something went wrong loading the dashboard." with opaque `error.digest` reference only. No raw error.message or stack traces.                                            | BUILT  |
| 8   | Does `WidgetErrorBoundary` expose internal error details?                 | No. Shows generic "[name] failed to load" with retry button. Error logged to console only (`console.error`). No error.message shown to user in compact or full mode.                                            | BUILT  |
| 9   | Do data source failures show as zero or show as error states?             | Error states. BusinessCards shows amber warning "Some dashboard data could not be loaded." CommandCenter shows "Some counts could not be loaded." `safe()` returns typed empty fallbacks, not misleading zeros. | BUILT  |

## Domain 3: Financial Data Accuracy

| #   | Question                                                             | Answer                                                                                                                                                                                                            | Status |
| --- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 10  | Does revenue derive from `ledger_entries` (not stored balances)?     | Yes. HeroMetrics line 55-66: queries `ledger_entries` table directly with `.eq('tenant_id', tenantId)`, `.eq('is_refund', false)`, `.not('entry_type', 'eq', 'tip')`. Same source as `getTenantFinancialSummary`. | BUILT  |
| 11  | Does the food cost % metric derive from actual event data?           | Yes. BusinessCards uses `foodCostTrend` from `loadBusinessCardsData()` which reads from event costing data. Shows per-month sparkline and overall average.                                                        | BUILT  |
| 12  | Does the outstanding balance metric use the financial summary view?  | Yes. HeroMetrics line 93+: queries `event_financial_summary` view for outstanding balances. Same ledger-derived source as event detail pages.                                                                     | BUILT  |
| 13  | Does the revenue goal widget compare against ledger-derived actuals? | Yes. BusinessCards `revenueGoal.monthly.realizedCents` from goal system which reads ledger entries. Not a stored column.                                                                                          | BUILT  |

## Domain 4: Data Freshness & Cache

| #   | Question                                                     | Answer                                                                                                                                                                                      | Status |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 14  | Does the dashboard use `unstable_cache` for any widget data? | No. All widget data fetched fresh on each page load. Only `getCachedChefArchetype` uses `unstable_cache` (60s TTL with tag), but that is layout-level metadata, not widget data.            | BUILT  |
| 15  | Do mutations across the app bust the dashboard route cache?  | Yes. 41+ files call `revalidatePath('/dashboard')` after mutations: events, inquiries, quotes, payments, expenses, onboarding, scheduling, collaboration, loyalty, ledger, todos, and more. | BUILT  |
| 16  | Does the AAR prompt banner show fresh data?                  | Yes. `AARPromptBanner` is a client component that calls `getEventsNeedingAAR()` server action on mount via `useEffect`. Fetches on each render, not cached.                                 | BUILT  |
| 17  | Does the priority queue reflect real-time urgency levels?    | Yes. `getPriorityQueue()` fetched fresh per page load via `safe()`. Queue items sorted by urgency (critical/high/normal/low). No stale cache layer.                                         | BUILT  |

## Domain 5: Cross-System Widget Connections

| #   | Question                                                                | Answer                                                                                                                                                                                          | Status |
| --- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 18  | Do schedule cards pull from the same source as the calendar page?       | Yes. ScheduleCards imports `getWeekSchedule`, `getTodaysScheduleEnriched`, `getAllPrepPrompts` from `lib/scheduling/actions.ts`, same functions used by calendar.                               | BUILT  |
| 19  | Do alert cards pull from the same sources as their detail pages?        | Yes. AlertCards uses `getResponseTimeSummary`, `getStaleInquiries`, `getStuckEvents`, `getCoolingClients`, `getUpcomingPaymentsDue`, `getExpiringQuotes` from their canonical action files.     | BUILT  |
| 20  | Does the network activity widget use the same data as the network page? | Yes. NetworkActivitySection queries `chef_collab_handoff_recipients`, `chef_connections`, `chef_collab_space_members` directly, same tables as network page. Links point to `/network?tab=...`. | BUILT  |
| 21  | Does the dinner circles widget use the same data as the circles page?   | Yes. DinnerCirclesSection calls `getChefCircles({ limit: 4 })` from `lib/hub/chef-circle-actions.ts`. Same function used by circles page. Links to `/hub/g/{token}` or `/circles`.              | BUILT  |
| 22  | Does the completion summary widget reflect actual event readiness?      | Yes. `CompletionSummaryWidgetServer` imported from `components/completion/completion-summary-server.tsx`. Uses the completion contract system for recursive dependency resolution.              | BUILT  |

## Domain 6: Loading States & Progressive Rendering

| #   | Question                                                             | Answer                                                                                                                                                                                                                                                                                                                                     | Status |
| --- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 23  | Does the dashboard have a full-page loading skeleton?                | Yes. `loading.tsx` renders stat cards row (4 cards), two-column layout with priority queue skeleton + sidebar widgets. Uses `ContextLoader` for status message and `Bone` component for loading animation.                                                                                                                                 | BUILT  |
| 24  | Does each section have individual loading skeletons for Suspense?    | Yes. Dedicated skeletons: `ScheduleCardsSkeleton`, `AlertCardsSkeleton`, `BusinessCardsSkeleton`, `IntelligenceCardsSkeleton`, `CommandCenterSkeleton`, `SmartSuggestionsSkeleton`, `PriorityQueueSkeleton`, `TouchpointsSkeleton`, `RestaurantMetricsSkeleton`. Some sections use `fallback={null}` (intentional, low-priority sections). | BUILT  |
| 25  | Does the page stream sections progressively via Suspense?            | Yes. All async sections wrapped in `<Suspense fallback={...}>`. Critical data (user, archetype, onboarding, alerts) loaded eagerly via `Promise.all`. Secondary sections streamed.                                                                                                                                                         | BUILT  |
| 26  | Does the greeting section render immediately without async blocking? | Yes. Time-of-day greeting computed synchronously from `new Date()`. First name parsed from email. No async dependency for initial header render.                                                                                                                                                                                           | BUILT  |

## Domain 7: Widget Visibility Logic

| #   | Question                                                           | Answer                                                                                                                                                                                            | Status |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 27  | Does the onboarding checklist auto-hide when complete?             | Yes. `OnboardingChecklistWidget` only rendered when `onboardingProgress` is truthy. Widget itself checks `completedPhases === totalPhases` to show completed state. Hides when all 5 phases done. | BUILT  |
| 28  | Does the Remy alerts section hide when no alerts exist?            | Yes. Page line 398: `remyAlerts.length > 0 &&` guard. Returns nothing when no active alerts.                                                                                                      | BUILT  |
| 29  | Does the priority queue show "all caught up" when empty?           | Yes. PriorityQueueSection renders emerald "All caught up" banner when `queue.nextAction` is null. Queue list hidden when `queue.summary.allCaughtUp` is true.                                     | BUILT  |
| 30  | Does the touchpoints section hide when no touchpoints exist?       | Yes. TouchpointsSection line 250: `if (touchpoints.length === 0) return null`. No empty state rendered.                                                                                           | BUILT  |
| 31  | Does the respond-next card show quick actions when queue is empty? | Yes. RespondNextCard shows "Paste from Email" and "Capture Platform Inquiry" links when queue is empty. Active state shows client name, urgency coloring, and readiness level.                    | BUILT  |

## Domain 8: Smart Suggestions & Data Gaps

| #   | Question                                                           | Answer                                                                                                                                                             | Status |
| --- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 32  | Do smart suggestions use tenant-scoped queries?                    | Yes. All 4 gap queries in smart-suggestions.tsx filter by `tenant_id = ${tenantId}`. Uses `pgClient` (raw SQL) but still properly scoped.                          | BUILT  |
| 33  | Do recipe pricing gaps check real price freshness (30-day window)? | Yes. `getRecipeGaps()` joins `ingredient_price_history` with `created_at > NOW() - INTERVAL '30 days'`. Stale prices treated as gaps.                              | BUILT  |
| 34  | Do client gaps surface actionable missing fields?                  | Yes. `getClientGaps()` checks for missing dietary_restrictions, allergies, and phone. Returns specific `missing[]` array per client.                               | BUILT  |
| 35  | Do suggestions vanish when everything is complete?                 | Yes. Each suggestion card conditionally rendered. If all gaps resolved, no cards rendered. Smart suggestions section still shows MetricsStrip header but no cards. | BUILT  |

## Domain 9: Tenant Scoping

| #   | Question                                                        | Answer                                                                                                                                                                                                | Status |
| --- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 36  | Do all direct DB queries on the dashboard filter by tenant?     | Yes. HeroMetrics: `.eq('tenant_id', tenantId)` on all 7 parallel queries. CommandCenter: `safeCount` passes `tenantCol`+`tenantId`. SmartSuggestions: `WHERE tenant_id = ${tenantId}` on all raw SQL. | BUILT  |
| 37  | Does the network activity query scope to the correct chef?      | Yes. Queries filter by `.eq('recipient_chef_id', chefId)` or `.eq('chef_id', chefId)` using `user.entityId` from session. Uses admin client for RLS bypass but explicit filters are correct.          | BUILT  |
| 38  | Does the AAR prompt banner receive tenant context from session? | Yes. `AARPromptBanner` receives `tenantId` prop from page-level `user.tenantId!`. Server action `getEventsNeedingAAR` validates tenant ownership.                                                     | BUILT  |

## Domain 10: Secondary Insights & Below-the-Fold

| #   | Question                                                                 | Answer                                                                                                                                                             | Status |
| --- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 39  | Is the secondary insights section collapsible and does it persist state? | Yes. `DashboardSecondaryInsights` uses `localStorage` key `cf:dashboard-secondary-collapsed`. State persists across page loads. Client component, pure UI wrapper. | BUILT  |
| 40  | Does the quick notes widget load initial data server-side?               | Yes. `QuickNotesLoader` calls `safe('quickNotes', () => getQuickNotes({ limit: 20 }), [])` server-side and passes as `initialNotes` to the client component.       | BUILT  |

---

## GAP Summary

### CRITICAL / HIGH

None.

### MEDIUM

None.

### LOW

None.

### ACCEPTED

None.

**Sweep score: 40/40 BUILT, 0 ACCEPT, 0 GAP (COMPLETE)**

This surface is fully cohesive. All sections auth-gated, all widgets isolated via WidgetErrorBoundary + Suspense, all financial data ledger-derived, all data fetched fresh (no stale cache), 41+ mutation paths bust dashboard cache, error boundary sanitized (no raw error.message), progressive loading with dedicated skeletons, admin widgets properly gated.

**Key fix from this session:**

- Q7: Dashboard `error.tsx` was leaking `error.message`. Fixed to show static message + opaque digest only.
