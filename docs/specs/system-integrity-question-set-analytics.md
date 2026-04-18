# System Integrity Question Set: Analytics

> 40 questions across 10 domains. Covers the analytics hub, 8 sub-pages, data sources, error handling, and cross-system accuracy.
> Status: BUILT = works. GAP = needs fix. ACCEPT = known limitation, accepted by design.

---

## Domain 1: Auth & Access Control

| #   | Question                                                            | Answer                                                                                                                                                                                                                                                        | Status |
| --- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | Does the analytics hub page call `requireChef()`?                   | Yes. `page.tsx` line 103 calls `requireChef()` as first operation.                                                                                                                                                                                            | BUILT  |
| 2   | Do all analytics sub-pages call `requireChef()`?                    | Yes. Fixed this session: `daily-report/page.tsx` was missing `requireChef()`. Now all 8 sub-pages verified: benchmarks, client-ltv, daily-report, demand, funnel, pipeline, referral-sources, reports.                                                        | BUILT  |
| 3   | Do the underlying analytics action files gate with `requireChef()`? | Yes. All analytics action files (`client-analytics.ts`, `pipeline-analytics.ts`, `revenue-analytics.ts`, `operations-analytics.ts`, `marketing-analytics.ts`, `social-analytics.ts`, `culinary-analytics.ts`) call `requireChef()` in each exported function. | BUILT  |
| 4   | Are all analytics queries tenant-scoped?                            | Yes. Every query filters by `tenant_id` or `chef_id` derived from authenticated session. No cross-tenant data leakage possible.                                                                                                                               | BUILT  |

## Domain 2: Error Resilience

| #   | Question                                                          | Answer                                                                                                                                                                                                  | Status |
| --- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 5   | Does a single analytics fetch failure crash the entire hub page?  | No. Hub page uses `Promise.allSettled` (not `Promise.all`) for all 36 parallel fetches. Individual failures tracked in `loadErrors[]` array and passed to client.                                       | BUILT  |
| 6   | Does the `val()` helper distinguish "load failed" from "no data"? | Yes. `val()` checks `result.status === 'fulfilled'` and returns the value. Rejected promises return typed fallback and log the error. This prevents showing zeros for failed loads vs actual zero data. | BUILT  |
| 7   | Are load errors surfaced to the user honestly?                    | Yes. `loadErrors` array passed to `AnalyticsHub` client component. Failed sections display degraded state, not misleading zeros that look like real data.                                               | BUILT  |
| 8   | Does the analytics hub fall back to the parent error boundary?    | Yes. No analytics-specific `error.tsx` exists. Falls back to `app/(chef)/error.tsx` which now shows sanitized messages (fixed this session).                                                            | BUILT  |

## Domain 3: Financial Data Accuracy

| #   | Question                                                        | Answer                                                                                                                                                     | Status |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 9   | Does month-over-month revenue derive from ledger entries?       | Yes. `getMonthOverMonthRevenue()` in `lib/dashboard/actions.ts` reads from `ledger_entries` table. Same source as dashboard hero metrics.                  | BUILT  |
| 10  | Does revenue-per-unit use actual event financials?              | Yes. `getRevenuePerUnitStats()` reads from `event_financial_summary` view (ledger-derived). Calculates per-guest, per-hour, per-mile from real event data. | BUILT  |
| 11  | Does true labor cost include owner hours?                       | Yes. `getTrueLaborCostStats()` sums owner hours + staff cost + total labor, showing labor as percent of revenue and true net margin.                       | BUILT  |
| 12  | Does break-even analysis use real fixed cost data?              | Yes. `getBreakEvenStats()` reads from expenses + recurring costs to estimate fixed monthly expenses, then calculates break-even events per month.          | BUILT  |
| 13  | Does carry-forward savings use actual leftover ingredient data? | Yes. `getCarryForwardStats()` reads from ingredient lifecycle data to calculate savings from reused ingredients across events.                             | BUILT  |

## Domain 4: Pipeline Analytics Accuracy

| #   | Question                                                            | Answer                                                                                                                                                    | Status |
| --- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 14  | Does the inquiry funnel count real status transitions?              | Yes. `getInquiryFunnelStats()` counts inquiries by status (new, quoted, confirmed, completed, declined, expired) from the inquiries table.                | BUILT  |
| 15  | Does quote acceptance rate derive from actual quote status changes? | Yes. `getQuoteAcceptanceStats()` reads quote records by status (sent, accepted, rejected, expired) with averages and rates.                               | BUILT  |
| 16  | Does ghost rate track actual unresponsive inquiries?                | Yes. `getGhostRateStats()` identifies inquiries that went dormant (no activity within threshold) and calculates rate + avg days to ghost.                 | BUILT  |
| 17  | Does response time measure actual first-response timestamps?        | Yes. `getAvgInquiryResponseTime()` and `getResponseTimeSummary()` compute from conversation timestamps. Shows distribution across 1h/4h/24h/24h+ buckets. | BUILT  |

## Domain 5: Client Analytics Accuracy

| #   | Question                                                     | Answer                                                                                                                                                                  | Status |
| --- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 18  | Does client retention use actual repeat booking data?        | Yes. `getClientRetentionStats()` counts distinct clients with 2+ events as repeat clients. Retention rate = repeat / total active.                                      | BUILT  |
| 19  | Does churn detection use event recency, not arbitrary flags? | Yes. `getClientChurnStats()` identifies at-risk and dormant clients based on days since last event, not a stored "churned" column.                                      | BUILT  |
| 20  | Does revenue concentration use Herfindahl index?             | Yes. `getRevenueConcentration()` calculates HHI and top-5 client revenue share, showing concentration risk.                                                             | BUILT  |
| 21  | Does NPS use actual survey responses?                        | Yes. `getNpsStats()` reads from review/feedback records. Calculates promoters/passives/detractors, sub-ratings (food, service, value, presentation), and response rate. | BUILT  |

## Domain 6: Operations Analytics

| #   | Question                                                | Answer                                                                                                                                                                                   | Status |
| --- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 22  | Does compliance tracking use actual event data?         | Yes. `getComplianceStats()` calculates on-time start rate, receipt submission rate, kitchen compliance, menu deviation, temp log compliance, and dietary accommodation from real events. | BUILT  |
| 23  | Does waste tracking use ingredient lifecycle data?      | Yes. `getWasteStats()` reads food spend, leftover carry-forward, and net food cost to calculate waste percentage.                                                                        | BUILT  |
| 24  | Do time phase stats break down actual event workflows?  | Yes. `getTimePhaseStats()` analyzes time allocation across event phases (prep, travel, service, cleanup).                                                                                | BUILT  |
| 25  | Does the culinary ops section use real event/menu data? | Yes. `getCulinaryOperationsStats()` calculates avg courses per event, avg guests, most common occasion, and dietary restriction frequency from actual events.                            | BUILT  |

## Domain 7: Marketing & Social Analytics

| #   | Question                                                | Answer                                                                                                                              | Status |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 26  | Do email campaign stats read from actual send data?     | Yes. `getCampaignEmailStats()` reads from campaign records with total sent, open rate, click rate, bounce, spam, unsubscribe rates. | BUILT  |
| 27  | Does marketing spend track actual expense records?      | Yes. `getMarketingSpendByChannel()` reads from expenses categorized as marketing, grouped by channel.                               | BUILT  |
| 28  | Do social analytics use real connection data?           | Yes. `getSocialConnectionStatuses()` reads connected social accounts. `getSocialGrowthTrend()` tracks follower changes over time.   | BUILT  |
| 29  | Do Google review stats pull from actual review records? | Yes. `getGoogleReviewStats()` reads from stored review data, not fabricated metrics.                                                | BUILT  |

## Domain 8: Culinary Analytics

| #   | Question                                                 | Answer                                                                                                                                                       | Status |
| --- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 30  | Does recipe usage track actual event-recipe linkage?     | Yes. `getRecipeUsageStats()` counts recipes used in events via `event_menus` joins. Shows reuse rate, avg times cooked, never-cooked count, and top recipes. | BUILT  |
| 31  | Does dish performance track real menu/event data?        | Yes. `getDishPerformanceStats()` counts new dishes this month/year, menu modification rate, and avg dishes sent per menu.                                    | BUILT  |
| 32  | Does menu approval tracking use actual approval records? | Yes. `getMenuApprovalStats()` reads menu approval statuses (sent, approved, revision requested, pending) with approval rate and avg response time.           | BUILT  |

## Domain 9: Sub-Page Consistency

| #   | Question                                                              | Answer                                                                                                                      | Status |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------ |
| 33  | Does the funnel sub-page use the same data as the hub funnel tab?     | Yes. `funnel/page.tsx` imports from `lib/analytics/pipeline-analytics.ts`, same functions used by the hub page.             | BUILT  |
| 34  | Does the pipeline sub-page use the same data as the hub pipeline tab? | Yes. `pipeline/page.tsx` imports from `lib/analytics/pipeline-analytics.ts`.                                                | BUILT  |
| 35  | Does the client-ltv sub-page use canonical client data?               | Yes. `client-ltv/page.tsx` calls `requireChef()` and reads from client/event data with inline `.catch(() => [])` fallbacks. | BUILT  |
| 36  | Does the benchmarks sub-page compare against real archetype targets?  | Yes. `benchmarks/page.tsx` calls `requireChef()` and uses archetype-based targets from `lib/costing/knowledge.ts`.          | BUILT  |

## Domain 10: Data Freshness & Upgrade Path

| #   | Question                                                | Answer                                                                                                                                                       | Status |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| 37  | Is analytics data fetched fresh on each page load?      | Yes. No `unstable_cache` wrapping. All 36 fetches are fresh server-side queries. `Promise.allSettled` runs on every page render.                             | BUILT  |
| 38  | Does the date range default to 12 months?               | Yes. `periodDates(12)` generates start/end spanning 12 months back from today. Used for all time-ranged queries.                                             | BUILT  |
| 39  | Does the upgrade prompt show for the analytics feature? | Yes. `<UpgradePrompt featureSlug="intelligence-hub" show={true} />` rendered at top of hub. Shows contextual upgrade prompt from feature classification map. | BUILT  |
| 40  | Does the collaboration revenue card load independently? | Yes. `<CollaborationRevenueCard />` wrapped in `<Suspense fallback={null}>` at bottom of page. Loads independently, does not block hub render.               | BUILT  |

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

This surface is fully cohesive. All 9 pages auth-gated, hub uses `Promise.allSettled` for 36 parallel fetches with honest failure reporting, all financial data ledger-derived, all analytics use real event/client/recipe data (no fabrication), sub-pages share canonical data sources with hub.

**Key fix from this session:**

- Q2: `daily-report/page.tsx` was missing `requireChef()`. Added page-level auth gate.
