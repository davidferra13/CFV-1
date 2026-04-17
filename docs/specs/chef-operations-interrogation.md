# Chef Operations Interrogation Protocol

> 40 questions that expose every failure point in the chef's daily operational cockpit.
> Domain: Dashboard, Events, Clients, Culinary, Finance, Navigation, Scheduled Jobs.
> Generated: 2026-04-15

---

## Scoring

- **PASS** - behavior matches spec, verified in code
- **FAIL** - broken, misleading, or missing
- **PARTIAL** - works but has gaps

---

## Dashboard (CO1-CO8)

### CO1: Hero Metrics Failure Honesty [P0]

**Question:** If `event_financial_summary` view query fails, does the dashboard show an error state or silently display $0 revenue and 0 events?

**Current state:** `getHeroMetrics()` uses direct `.then()` chains that return `0` on error (lines 60-61, 88-91). Revenue error = `$0`. Outstanding error = `$0`. No error state in UI. `HeroMetricsClient` checks `isNewAccount` by testing all values === `0` or `$0`, meaning a total DB failure renders as "Welcome to ChefFlow" (new account state).

**Pass criteria:** DB failure must show error indicator, not fake zeros or false "new account" welcome.

**Priority:** P0 - Zero Hallucination Law 2 violation. Chef sees "$0 revenue" when DB is down.

**What to build:** Wrap `getHeroMetrics` in `safe()` pattern like rest of dashboard. Return `null` on failure. Render error state in `HeroMetricsClient` when metrics are null.

---

### CO2: Dashboard Data Fetch Cascade [P1]

**Question:** If 3 of 15 dashboard widgets fail to load, does the chef see which 3 failed, or does the whole page break?

**Current state:** Dashboard uses `safe()` wrapper + `Suspense` + `WidgetErrorBoundary`. Individual widget failures are isolated. Good pattern.

**Pass criteria:** Each widget fails independently with its own error boundary.

**Priority:** P1 - Verify all 15+ sections use the pattern consistently.

---

### CO3: "Events This Week" Accuracy [P1]

**Question:** Does "Events this week" count only non-cancelled events within the next 7 calendar days, accounting for timezone?

**Current state:** Query filters `gte(today)` and `lte(weekEnd)` with `not('status', 'eq', 'cancelled')`. Date strings computed in server timezone, not chef's configured timezone.

**Pass criteria:** Week boundary respects chef's timezone. Chef in LA at 11pm Monday doesn't see Tuesday's events counted as "today."

**Priority:** P1 - Edge case, but wrong count erodes trust.

---

### CO4: Revenue Metric Scope [P2]

**Question:** Is "Revenue (all time)" actually all-time, or is it silently scoped to current month/year?

**Current state:** Query selects ALL `event_financial_summary` rows for tenant with no date filter (line 56-63). Sums `total_paid_cents`. Label says "all time." Math matches.

**Pass criteria:** Label matches query scope. Currently correct.

**Priority:** P2 - Verified correct, but monitor if query changes.

---

### CO5: Surge Detection Threshold [P2]

**Question:** Is the surge threshold (5 inquiries/week) appropriate for all chef sizes, or does a solo chef get false surges?

**Current state:** Hardcoded `isSurge = newThisWeek >= 5`. No per-chef calibration.

**Pass criteria:** Threshold is reasonable for the typical ChefFlow user (solo/small operation). 5/week is high enough to not false-alarm.

**Priority:** P2 - Acceptable for now. Could calibrate later.

---

### CO6: New Account Empty State Links [P1]

**Question:** Do all 3 links in the new-account hero state (/clients/new, /events/new, /settings/embed) actually work?

**Current state:** Links hardcoded in `HeroMetricsClient`. Need to verify routes exist and function.

**Pass criteria:** All 3 links resolve to real pages, not 404.

**Priority:** P1 - First impression for new chef. Broken link = immediate churn.

---

### CO7: Dashboard Admin Sections Leak [P1]

**Question:** Are admin-only dashboard sections (OpenClaw alerts, Pipeline status, Coverage health) invisible to non-admin chefs?

**Current state:** Dashboard uses `isAdmin` checks for gating. Need to verify every admin section is properly gated.

**Pass criteria:** Non-admin chef sees zero admin content. No flash, no empty containers, no leaked section headings.

**Priority:** P1 - Security and UX issue.

---

### CO8: Onboarding Banner Dismissibility [P2]

**Question:** Once a chef dismisses the onboarding banner, does it stay dismissed across sessions?

**Current state:** `OnboardingBanner` component exists. Need to check persistence mechanism (cookie, DB flag, localStorage).

**Pass criteria:** Dismiss persists. Banner never returns after dismissal.

**Priority:** P2 - Annoyance, not critical.

---

## Events (CO9-CO18)

### CO9: Event Transition Error Feedback [P0]

**Question:** When an event transition fails (propose, confirm, complete), does the chef see why it failed, or just "An error occurred"?

**Current state:** `EventTransitions.handleTransition()` catches errors and shows `err.message`. But line 131-132: if `result.success` is falsy, it throws generic `new Error('Transition failed')` - discarding the actual error from the server action.

**Pass criteria:** Server action error message (e.g. "Cannot propose: no menu attached") must surface to the chef, not be replaced with "Transition failed."

**Priority:** P0 - Chef can't diagnose why their event won't advance. Makes the FSM feel broken.

**What to build:** Pass `result.error` message through instead of generic throw.

---

### CO10: Event List Photo Thumbnails [P2]

**Question:** If an event has no menu or no dish photos, does the event list show a broken image or a graceful fallback?

**Current state:** Events page fetches first dish photo per menu for thumbnails. Need to verify null/missing photo handling.

**Pass criteria:** Missing photo shows placeholder icon, not broken `<img>` tag.

**Priority:** P2 - Visual polish.

---

### CO11: Event Date Sorting [P1]

**Question:** Events sorted "by date descending" - does this mean newest event first? For a chef planning ahead, shouldn't upcoming events be first (ascending)?

**Current state:** `sorted by date descending` - most recent event date first. Past completed events show before upcoming ones.

**Pass criteria:** Default sort shows what the chef needs to act on (upcoming first), not historical archive.

**Priority:** P1 - Workflow friction. Chef opens events and sees last month's completed events before next week's active ones.

---

### CO12: Demo Event Badge Visibility [P2]

**Question:** Do demo/sample events have a visible badge so chefs don't confuse them with real events?

**Current state:** Uses `isDemoEvent()` to show "Sample" badge. Good.

**Pass criteria:** Badge is visible and distinct. Demo events can't be accidentally invoiced or transitioned.

**Priority:** P2 - Verified pattern exists.

---

### CO13: Event Detail Page Load Time [P1]

**Question:** The event detail page imports 80+ components and runs 30+ parallel data fetches. Does it load in under 3 seconds?

**Current state:** Massive import list (lines 1-137). All data fetched server-side with Suspense boundaries. Page weight could be an issue.

**Pass criteria:** Page renders initial content within 2 seconds. Heavy sections stream in via Suspense.

**Priority:** P1 - Slow page = chef abandonment.

---

### CO14: Event Financial Summary on Null [P0]

**Question:** If `event_financial_summary` view returns null for an event (no ledger entries yet), does the event detail show $0 or "No financial data yet"?

**Current state:** `getEventFinancialSummary()` uses `?? 0` fallbacks (lines 199-203). A draft event with no payments shows `$0 paid, $0 outstanding` - which is technically correct (not a hallucination), but could be clearer.

**Pass criteria:** Draft events with no financial activity show "No payments yet" rather than `$0.00` across all fields. This is acceptable as "no data exists" (empty state), not "fetch failed."

**Priority:** P0 - Borderline. The `$0` is technically correct for a new event, but showing "No payments yet" is more honest. Reclassifying to P1.

**Revised Priority:** P1

---

### CO15: Readiness Gates Block Correctly [P1]

**Question:** Do hard-block readiness gates actually prevent the transition button from being clicked, or just warn?

**Current state:** `EventTransitions` receives `readiness` prop. `isHardBlocked` flag exists. Need to verify button `disabled` state matches.

**Pass criteria:** Hard-blocked transition button is disabled. Chef cannot click through a hard block.

**Priority:** P1 - If they can click through a "required" gate, the gate is decorative.

---

### CO16: Cancelled Event Actions [P1]

**Question:** Can a chef still accidentally perform actions (record payment, send invoice) on a cancelled event?

**Current state:** `EventTransitions` returns "no further actions" for completed/cancelled. But other components on the event detail page (RecordPaymentPanel, InvoiceButton) may not check status.

**Pass criteria:** All mutation-capable components on event detail check `event.status` and disable for cancelled/completed.

**Priority:** P1 - Financial mutation on cancelled event corrupts the ledger.

---

### CO17: Event Form Draft Persistence [P2]

**Question:** If a chef fills out half the event form and navigates away, is their draft preserved?

**Current state:** Event form uses `useDurableDraft` hook and `DraftRestorePrompt`. Pattern looks robust.

**Pass criteria:** Partial form data survives navigation and browser close. Restore prompt appears on return.

**Priority:** P2 - Good pattern already in place.

---

### CO18: Event Clone Correctness [P2]

**Question:** When cloning an event, does the clone correctly reset status to draft, clear payment data, and generate a new ID?

**Current state:** `EventCloneButton` component exists. Need to verify clone logic doesn't carry over financial or status state.

**Pass criteria:** Cloned event starts as draft with $0 financials, new ID, no ledger entries.

**Priority:** P2 - Carried-over payment status would be a hallucination.

---

## Clients (CO19-CO26)

### CO19: Client Detail Page Crash Risk [P0]

**Question:** The client detail page imports 40+ components and runs 20+ data fetches. If one fetch throws (not caught), does the whole page crash?

**Current state:** Client page (lines 130-160) uses `Promise.all` with `.catch()` fallbacks on most fetches. But some fetches like `getClientWithStats` are called without `.catch()` and would crash the page on failure.

**Pass criteria:** Every data fetch has error handling. Page never shows blank white screen on partial data failure.

**Priority:** P0 - Blank page on client detail = chef thinks client was deleted.

**What to build:** Audit all fetches on client detail. Ensure critical path (client basic info) has error handling, and optional sections use Suspense/ErrorBoundary.

---

### CO20: Client Financial Panel Accuracy [P1]

**Question:** Does the client financial panel show real data from the ledger, or a separate computed cache that could drift?

**Current state:** `ClientFinancialPanel` imported, fed by `getClientFinancialDetail()`. Need to verify it reads from `event_financial_summary` view (source of truth).

**Pass criteria:** Client financials derived from same ledger views as event financials. No separate cache.

**Priority:** P1 - Dual-source financial data = eventual inconsistency.

---

### CO21: Client Health Score Honesty [P1]

**Question:** Is the client health score computed from real engagement data, or is it a placeholder formula showing fake confidence?

**Current state:** `getSingleClientHealthScore` imported. Need to verify it uses real data (event frequency, recency, spend) not dummy values.

**Pass criteria:** Health score inputs are all from real queries. Score of 0 means "no data," not "bad client."

**Priority:** P1 - Fake health scores cause wrong prioritization.

---

### CO22: Client CSV Export [P2]

**Question:** Does "Export CSV" on the clients page actually produce a downloadable CSV with correct data?

**Current state:** "Export CSV" link exists on clients page. Need to verify endpoint works.

**Pass criteria:** CSV downloads with correct headers, all client records, proper encoding.

**Priority:** P2 - Data portability feature.

---

### CO23: Client Deletion Safety [P1]

**Question:** Can a chef delete a client who has active events or outstanding payments?

**Current state:** Need to check if deletion has guards against active relationships.

**Pass criteria:** Client with active events cannot be hard-deleted. Soft delete (archive) is acceptable.

**Priority:** P1 - Deleting a client with upcoming events orphans those events.

---

### CO24: Client Invite Flow [P2]

**Question:** Does the client invitation form actually send an email and create a client portal account?

**Current state:** Clients page shows "Client Invitation form with pending invitations table." Need to verify end-to-end flow.

**Pass criteria:** Invitation sends real email, creates pending record, invitation can be accepted.

**Priority:** P2 - Feature correctness.

---

### CO25: Client Tags and Segments [P2]

**Question:** Do client tags persist correctly and are they queryable for segments/filtering?

**Current state:** `ClientTags` component, `getClientTags`/`getAllUsedTags` actions imported on detail page.

**Pass criteria:** Tags save, persist, and can be used to filter the client list.

**Priority:** P2 - Organization feature.

---

### CO26: Dormant Client Detection [P1]

**Question:** Does `getClientDormancyInfo` correctly identify dormant clients, and does the re-engagement cron (`/api/scheduled/client-reengagement`) actually send emails?

**Current state:** Cron route exists, uses `runMonitoredCronJob`, queries 60-90 day window. Sends via `sendEmail`. Has proper dedup (window-based). Looks solid.

**Pass criteria:** Dormancy detection matches cron window. Emails actually send. Cron is registered and running.

**Priority:** P1 - If cron isn't registered, dormant clients never get contacted.

---

## Finance (CO27-CO33)

### CO27: Finance Page Error State [P0 - VERIFIED PASS]

**Question:** If `getTenantFinancialSummary()` fails, does the finance page show an error or fake zeros?

**Current state:** Finance page wraps summary in `.catch(() => null)`, checks `if (!summary)`, renders explicit error: "Could not load financial data." Lines 170-198. **This is correct.**

**Pass criteria:** Error state shown on failure. No fake zeros.

**Priority:** Already passing. Gold standard pattern.

---

### CO28: Monthly P&L Snapshot Error Handling [P0]

**Question:** If `getProfitAndLossReport()` throws, does the P&L snapshot crash the finance page?

**Current state:** `MonthlyPLSnapshot` is a standalone async component. Not wrapped in Suspense/ErrorBoundary in the finance page layout. If it throws, the entire page fails.

**Pass criteria:** P&L snapshot failure is isolated. Rest of finance page still renders.

**Priority:** P0 - One widget crash shouldn't take down the whole finance hub.

**What to build:** Wrap `MonthlyPLSnapshot` in Suspense + WidgetErrorBoundary.

---

### CO29: Ledger Immutability Enforcement [P1]

**Question:** Can any server action modify or delete existing ledger entries?

**Current state:** Immutability triggers on `ledger_entries` table. Need to verify no bypass exists.

**Pass criteria:** Database trigger prevents UPDATE/DELETE on ledger_entries. No server action attempts it.

**Priority:** P1 - Core financial integrity.

---

### CO30: Financial Hub Tile Routes [P1]

**Question:** Do all 16 finance hub tile links resolve to real pages?

**Current state:** SECTIONS array has 16 entries with hrefs. Some may point to unbuilt pages.

**Pass criteria:** Every href resolves to a real page, not a 404 or blank screen.

**Priority:** P1 - Dead links in finance = chef thinks feature is broken.

---

### CO31: Carry-Forward Savings Display [P2]

**Question:** Does the "carry-forward savings" metric show real calculated savings or a placeholder?

**Current state:** `getYtdCarryForwardSavings().catch(() => 0)` - returns 0 on error. If the function always returns 0 (unimplemented), it silently shows "$0 saved" which is a lie.

**Pass criteria:** If carry-forward isn't implemented yet, the metric should be hidden, not shown as $0.

**Priority:** P2 - Potential zero-hallucination violation if function is a stub.

---

### CO32: Bank Feed Surface Availability [P2]

**Question:** Are conditionally-hidden tiles (Bank Feed, Cash Flow) actually hidden when unavailable, or do they show as dead links?

**Current state:** `getFinanceSurfaceAvailability()` controls visibility via `showAsPrimary` flag. Tile is filtered from `VISIBLE_SECTIONS`.

**Pass criteria:** Hidden tiles don't render at all. No empty grid gaps.

**Priority:** P2 - Good pattern.

---

### CO33: Expense Recording Feedback [P1]

**Question:** When a chef records an expense, do they get confirmation, and does the ledger actually update?

**Current state:** Need to verify expense creation flow has success feedback and ledger entry.

**Pass criteria:** Expense saves, ledger entry created, success toast shown, finance page reflects new expense.

**Priority:** P1 - Silent expense failure means chef thinks cost was recorded when it wasn't.

---

## Navigation & Layout (CO34-CO37)

### CO34: Module-Gated Nav Items [P1]

**Question:** If a chef disables a module (e.g., Commerce), do all related nav items disappear, or do some leak through?

**Current state:** `ChefSidebar` filters groups by `enabledModules`. But standalone top-level items may not respect module filtering.

**Pass criteria:** Disabled module = zero nav presence. No orphaned links.

**Priority:** P1 - Disabled module showing nav items confuses chef.

---

### CO35: Mobile Navigation Completeness [P1]

**Question:** Can a chef on mobile access all critical features (events, clients, finance), or are some desktop-only?

**Current state:** `ChefMobileNav` uses `mobileTabItems` (5 items: Home, Daily Ops, Inbox, Events, Clients). Finance not in mobile tabs.

**Pass criteria:** All core features reachable from mobile. Finance accessible via hamburger/more menu if not in tabs.

**Priority:** P1 - Mobile chef at an event can't check payments.

---

### CO36: Command Palette Completeness [P1]

**Question:** Does Cmd+K find all pages, or only a hardcoded subset?

**Current state:** `CommandPalette` component rendered in layout. Need to verify data source (static list vs dynamic from nav config).

**Pass criteria:** Command palette searches all nav items from `nav-config.tsx`, not a separate static list that drifts.

**Priority:** P1 - Stale command palette = chef can't find features they know exist.

---

### CO37: Layout Provider Stack Stability [P2]

**Question:** With 10+ nested providers in the layout, does a crash in one provider (e.g., OfflineProvider) take down the entire app?

**Current state:** Provider stack: AppContext > Permission > Offline > Sidebar > NavigationPending > Notification. No error boundaries between providers.

**Pass criteria:** Non-critical providers (Offline, Notification) should degrade gracefully without crashing the layout.

**Priority:** P2 - Unlikely but catastrophic if it happens.

---

## Scheduled Jobs (CO38-CO40)

### CO38: Cron Auth Bypass [P0]

**Question:** Can someone hit `/api/scheduled/client-reengagement` without the cron auth token and trigger mass emails?

**Current state:** Route uses `verifyCronAuth(request.headers.get('authorization'))`. Returns error response if auth fails. Good.

**Pass criteria:** Unauthenticated request returns 401/403 immediately. No email sent.

**Priority:** P0 - Unauthorized cron execution = spam/abuse.

**Verification:** Read `verifyCronAuth` to confirm it's not a no-op.

---

### CO39: Scheduled Job Monitoring [P1]

**Question:** If a scheduled job fails silently for a week, does anyone notice?

**Current state:** Jobs use `runMonitoredCronJob()` wrapper and `recordSideEffectFailure()`. Need to verify monitoring actually surfaces failures.

**Pass criteria:** Failed cron jobs are logged, and admin can see failure history.

**Priority:** P1 - Silent cron failure = features silently stop working.

---

### CO40: Scheduled Job Dedup Safety [P1]

**Question:** If the same cron job runs twice in quick succession (e.g., duplicate trigger), does it send duplicate emails?

**Current state:** Client reengagement uses window-based dedup (60-90 day window). Once a client exits the window, they can't re-enter until their next dormancy cycle. Good design.

**Pass criteria:** Duplicate execution within same window doesn't send duplicate emails.

**Priority:** P1 - Double emails destroy trust.

---

## Summary

| Priority | Count | IDs                                                                              |
| -------- | ----- | -------------------------------------------------------------------------------- |
| P0       | 5     | CO1, CO9, CO19, CO28, CO38                                                       |
| P1       | 17    | CO2, CO3, CO6, CO7, CO11, CO13-CO16, CO20-CO21, CO23, CO26, CO29-CO30, CO33-CO36 |
| P2       | 10    | CO4-CO5, CO8, CO10, CO12, CO17-CO18, CO22, CO24-CO25, CO31-CO32, CO37            |
| PASS     | 2     | CO27, CO4                                                                        |

**P0 fixes to build now:**

1. **CO1** - Hero metrics error state (stop showing fake $0 on DB failure)
2. **CO9** - Event transition error message passthrough (stop swallowing server errors)
3. **CO19** - Client detail page crash protection (wrap critical fetches)
4. **CO28** - Finance P&L snapshot isolation (Suspense + ErrorBoundary)
5. **CO38** - Verify cron auth is real (read verifyCronAuth implementation)
