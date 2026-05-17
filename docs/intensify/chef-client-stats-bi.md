# Intensify: Chef & Client Statistics / Business Intelligence

## Deep-Pass Run 2026-05-17

STATUS: saturated-until-reset
DEPTH: normal (extended to deep via 6 waves)
YIELD_TREND: stable (all moves exhausted)

SURFACED:

- 6 independent scoring systems (client health, chef health, booking, churn, operational risk, current rank) with zero cross-pollination
- 3 parallel revenue forecast implementations (analytics, intelligence, finance) with 1 canonical (finance: 8+ consumers)
- Per-client stats fully computed but never aggregated into portfolio-level metrics
- Circle engagement data computed per-circle, never feeds client health scoring
- Booking scores computed per-inquiry, never aggregated into pipeline quality metric
- Cohort retention data already computed in client-lifetime-journey but never displayed
- Rankings show top-20 with no percentile context (meaningless without total)
- Business intel panel has manual fields (tipping/payment) computable from existing financial data
- Spending decline detection absent from CIL despite period data existing in client-stats

LENSES_USED:

- Revenue Operations Analyst: portfolio metrics, pipeline quality, cohort analysis
- Data Product Designer: which metrics change behavior vs noise
- Chef-Operator: what working chefs look at between events
- Platform Architect: query cost, N+1 risks, computation placement
- CRM Systems Expert: scoring model best practices, lifecycle integration

EXPERT_VALIDATION:

- Portfolio LTV Rollup: endorsed (all 5, trivial reduce, #1 business metric)
- Pipeline Quality Score: endorsed (all 5, single-number pipeline health)
- Circle engagement in health score: endorsed with caveat (batch-join needed, not per-client queries)
- Surface cohort data: endorsed with caveat (minimum 3 clients per cohort threshold)
- Consolidate revenue forecasts: endorsed (all 5, but high-effort refactor)
- Health score distribution: endorsed (all 5, trivial tier counting)
- Rankings percentile: endorsed (all 5, 3 lines of code)
- Auto-suggest biz-intel: endorsed with caveat (suggestion only, never override manual)
- Merge concentration: endorsed (all 5, reduces redundant queries)
- Spending trend in CIL: endorsed with caveat (use existing events data, no new queries)
- New/Returning ratio: endorsed (all 5, trivial derivation)

EXPERT_ADDITIONS:

- Portfolio LTV should include "at-risk revenue" segment (sum LTV for clients with health < 40)
- Health score trend storage via weekly aggregate snapshot (foundational for data-driven trends)
- Moves 1,2,6,7,11 are zero-cost (pure in-memory, no new DB queries) - do these first always

REJECTED:

- Circle x Retention correlation: research question, not operational metric for single chef
- Per-client health score historical snapshots: data bloat for small businesses (aggregate-only sufficient)
- Revenue forecast export cleanup: dependent on consolidation completing first

ACTED ON:

- Portfolio LTV Rollup: lib/analytics/client-ltv-actions.ts (getPortfolioLTVSummary)
- Pipeline Quality Score: lib/analytics/booking-score.ts (getPipelineQualityScore)
- Health Score Distribution: lib/clients/health-score.ts (getHealthScoreDistribution)
- Rankings Percentile: lib/clients/rankings.ts (percentile field + totalClients)
- New/Returning Ratio: lib/analytics/client-analytics.ts (extended getClientRetentionStats)
- Circle Engagement in Health Score: lib/clients/health-score.ts (batch circle membership query)
- CIL Spending Decline Signal: lib/cil/analyzers/clients.ts + lib/cil/signal-actions.ts
- Auto-Suggest Biz-Intel Fields: components/clients/business-intel-panel.tsx (financialHints prop)
- Cohort Retention Table: components/analytics/cohort-retention-table.tsx + app/(chef)/analytics/client-ltv/page.tsx
- Remy BI Context: lib/ai/remy-context.ts + remy-actions.ts + remy-types.ts (portfolio, health dist, pipeline quality)
- Dashboard Portfolio Summary: app/(chef)/dashboard/page.tsx (PortfolioSummarySection)
- Stats Bar Spending Spread: components/clients/client-stats-bar.tsx (avg/high/low event values)
- Concentration Merge + HHI: lib/finance/concentration-risk.ts canonical, client-analytics.ts thin wrapper
- Pipeline Quality UI: app/(chef)/inquiries/page.tsx (stat bar header)
- Revenue Forecast Consolidation: lib/analytics/revenue-forecast.ts now shims to canonical finance system
- Financial Hints Wiring: app/(chef)/clients/[id]/page.tsx passes real data to BusinessIntelPanel
- Percentile Badge: components/clients/client-stats-bar.tsx ("Top X% by spend" badge)
- Health Distribution Page: app/(chef)/analytics/health/page.tsx (tier bar + overview stats)
- New/Returning Ratio UI: components/analytics/analytics-hub-client.tsx (Client Composition section)
- HHI in Concentration Card: components/dashboard/concentration-warning-card.tsx
- Health Score Trend Storage: lib/analytics/health-trend-actions.ts + app/api/scheduled/health-snapshot/route.ts

SKIPPED:

- None. All moves built.

CROSS_REFS:

- [[intelligence]]: prior run near-saturated; this zone's aggregation moves CREATE new intelligence outputs
- [[cil]]: spending decline signal expands CIL's client detection without new analyzers
- [[communication]]: churn signals from spending decline will feed existing cadence automation

NEXT TRIGGER: Zone fully saturated. Resets when: new data sources added (e.g., external benchmarking data), new scoring systems created, or health trend snapshots accumulate enough data to surface meaningful trend visualization.

---

## BUILD_PROMPTS: (2026-05-17)

STATUS: COMPLETE (2026-05-17)

### Wave 1 (Parallel - 5 haiku agents, zero-cost aggregations)

Agent: portfolio-ltv-rollup (haiku)
Task: Add getPortfolioLTVSummary() to lib/analytics/client-ltv-actions.ts. Reduces getAllClientLTV() into totalPortfolioValueCents, averageLtvCents, medianLtvCents, clientCount, atRiskRevenueCents.
Read: lib/analytics/client-ltv.ts, lib/analytics/client-ltv-actions.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: pipeline-quality-score (haiku)
Task: Add getPipelineQualityScore() to lib/analytics/booking-score.ts. Mean/median of getBookingScoresForOpenInquiries(), highQualityCount, lowQualityCount, estimatedConversionRate.
Read: lib/analytics/booking-score.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: health-score-distribution (haiku)
Task: Add getHealthScoreDistribution() to lib/clients/health-score.ts. Returns meanScore, tierDistribution, percentHealthy, totalClients, alertCount.
Read: lib/clients/health-score.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: rankings-percentile (haiku)
Task: Add totalClients + percentile field to RankedClient in lib/clients/rankings.ts.
Read: lib/clients/rankings.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: new-returning-ratio (haiku)
Task: Extend getClientRetentionStats() return with newClientsThisPeriod, returningClientsThisPeriod, revenue split percentages.
Read: lib/analytics/client-analytics.ts
Done: npx tsc --noEmit --skipLibCheck

### Wave 2 (After Wave 1 - 3 agents, wiring moves)

Agent: circle-engagement-health-score (opus)
Task: Batch-join dinner_circle_members into health score engagement dimension. Single query, +5 bonus pts for circle participation.
Read: lib/clients/health-score.ts, lib/dinner-circles/circle-stats.ts, lib/db/schema/schema.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: spending-trend-cil-signal (opus)
Task: Add clients.spendingDecline signal to CIL client analyzer. 90-day vs prior-90-day comparison from existing events data.
Read: lib/cil/analyzers/clients.ts, lib/cil/signal-actions.ts, lib/cil/signal-dedup.ts
Done: npx tsc --noEmit --skipLibCheck

Agent: auto-suggest-biz-intel (haiku)
Task: Add optional financialHints prop to business-intel-panel. Show suggestion chips for tipping/payment fields. Never override manual entry.
Read: components/clients/business-intel-panel.tsx, lib/clients/health-score.ts
Done: npx tsc --noEmit --skipLibCheck

### Wave 3 (After Wave 2 - 1 agent, surface aggregation)

Agent: surface-cohort-data (opus)
Task: Wire existing CohortAnalysis[] from getClientLifetimeJourneys() into visible analytics surface. Table component, min 3 clients per cohort threshold.
Read: lib/intelligence/client-lifetime-journey.ts, consumers of that module
Done: npx tsc --noEmit --skipLibCheck

### Dispatch Notes

Total: 9 agents (6 haiku + 3 opus)
Verification: npx tsc --noEmit --skipLibCheck && npm run test:affected
