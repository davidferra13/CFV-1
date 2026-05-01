# Analytics and Grocery Orphan Lane Classification

- Date: 2026-05-01
- Branch: `feature/v1-builder-runtime-scaffold`
- Scope: `components/analytics/**`, `components/grocery/**`
- Module-freeze posture: no product feature work, only reachability proof and safe pruning.

## Classification Summary

No file in this owned scope qualified as a safe prune-candidate.

Directly reachable modules have exact imports from app or component surfaces. Path-only modules in `tsconfig.ci.expanded.json` were not deleted because the task explicitly named them as current reachability examples, or because they are internal dependencies of those examples.

## Directly Reachable

These files have exact app or component imports and are not prune-candidates:

- `components/analytics/analytics-hub-client.tsx` from `app/(chef)/analytics/page.tsx`
- `components/analytics/analytics-identify.tsx` from admin, chef, and client layouts
- `components/analytics/benchmark-dashboard.tsx` from `app/(chef)/analytics/benchmarks/page.tsx`
- `components/analytics/booking-score-badge.tsx` from inquiry pages
- `components/analytics/client-ltv-chart.tsx` from `app/(chef)/analytics/client-ltv/page.tsx`
- `components/analytics/conversion-funnel.tsx` from `app/(chef)/analytics/funnel/page.tsx`
- `components/analytics/demand-heatmap.tsx` from `app/(chef)/analytics/demand/page.tsx`
- `components/analytics/holiday-yoy-table.tsx` from `app/(chef)/analytics/demand/page.tsx`
- `components/analytics/insights-client.tsx` from `app/(chef)/insights/page.tsx`
- `components/analytics/menu-recommendation-hints.tsx` from `app/(chef)/menus/[id]/page.tsx`
- `components/analytics/performance-telemetry.tsx` from `components/runtime/deferred-root-runtime.tsx`
- `components/analytics/pipeline-forecast.tsx` from `app/(chef)/analytics/pipeline/page.tsx`
- `components/analytics/posthog-provider.tsx` from `components/runtime/deferred-root-runtime.tsx`
- `components/analytics/pricing-suggestion-panel.tsx` from `components/quotes/quote-form.tsx`
- `components/analytics/public-page-view.tsx` from public pages and role selection
- `components/analytics/quote-acceptance-insights.tsx` from quotes and dashboard mobile content
- `components/analytics/referral-analytics-dashboard.tsx` from `app/(chef)/analytics/referral-sources/page.tsx`
- `components/analytics/report-builder.tsx` from `app/(chef)/analytics/reports/page.tsx`
- `components/analytics/section-view-tracker.tsx` from public pages and seasonal market pulse
- `components/analytics/stage-conversion-funnel.tsx` from `app/(chef)/finance/reporting/page.tsx`
- `components/analytics/tracked-link.tsx` from public pages and public components
- `components/analytics/tracked-video.tsx` from `app/(public)/for-operators/page.tsx`
- `components/grocery/batch-opportunities-card.tsx` from `app/(chef)/culinary/page.tsx`
- `components/grocery/grocery-list-view.tsx` from `app/(chef)/events/[id]/procurement/page.tsx`

## Internal Dependencies

These files are used inside owned modules and should stay with their parent until the parent is intentionally recovered or pruned:

- `components/analytics/booking-conversion-funnel.tsx` is imported by `components/analytics/conversion-dashboard.tsx`
- `components/analytics/insights-charts.tsx` is imported by `components/analytics/insights-client.tsx`
- `components/analytics/source-charts.tsx` is imported by `components/analytics/analytics-client.tsx`
- `components/grocery/smart-list-view.tsx` is imported by `components/grocery/smart-list-manager.tsx`

## Keep Or Recover

These files were path-only in the scoped scan, but the task explicitly listed them as known current reachability examples. They are not safe prune-candidates without a separate owner proof and canonical route decision:

- `components/analytics/analytics-client.tsx`
- `components/analytics/channel-comparison.tsx`
- `components/analytics/channel-dashboard.tsx`
- `components/analytics/conversion-dashboard.tsx`
- `components/analytics/loss-analysis-chart.tsx`
- `components/analytics/referral-dashboard.tsx`
- `components/analytics/source-breakdown-widget.tsx`
- `components/analytics/yoy-cards.tsx`
- `components/grocery/grocery-list-button.tsx`
- `components/grocery/grocery-split-manager.tsx`
- `components/grocery/grocery-trip-form.tsx`
- `components/grocery/grocery-trip-history.tsx`
- `components/grocery/item-store-assignment.tsx`
- `components/grocery/smart-list-manager.tsx`
- `components/grocery/store-manager.tsx`
- `components/grocery/store-split-view.tsx`

## Duplicate Or Uncertain

- Duplicate: none proven in this pass.
- Uncertain: none outside the explicit keep/recover lane above.
- Prune-candidate: none.

## Proof Commands

- `rg --files components/analytics components/grocery`
- `rg -n 'from [''"].*@/components/(analytics|grocery)|import\([''"].*@/components/(analytics|grocery)' app components lib tests scripts --glob '!components/analytics/**' --glob '!components/grocery/**'`
- per-file exact path scan against `app`, `components`, `lib`, `tests`, `scripts`, and `tsconfig.ci.expanded.json`
