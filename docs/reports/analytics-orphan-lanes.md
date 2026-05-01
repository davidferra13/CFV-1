# Analytics Orphan Lanes

- Date: 2026-05-01
- Scope: high-confidence duplicate analytics library slice only
- Owned files: `lib/analytics/client-ltv.ts`, `lib/analytics/dietary-trends.ts`, `lib/analytics/menu-engineering.ts`, `lib/analytics/price-anomaly.ts`, `lib/analytics/revenue-forecast.ts`, `tsconfig.ci.expanded.json`

## Decision Summary

Deleted five orphan analytics modules after import-path and exported-symbol proof showed no live app, component, lib, script, or test caller. Removed only their explicit `tsconfig.ci.expanded.json` entries.

## Deleted Candidates

| Candidate | Exported symbols checked | Live caller proof | Canonical owner |
| --- | --- | --- | --- |
| `lib/analytics/client-ltv.ts` | `calculateClientLTV`, `predictChurnRisk`, `getAllChurnPredictions`, `getAllClientLTV`, `ClientLTV`, `ChurnPrediction`, `ChurnRiskLevel` | `rg` found only the candidate file, `tsconfig.ci.expanded.json`, stale docs, generated reports, and unrelated same-name symbols in `lib/ai/*` and `lib/clients/*`. Live route `app/(chef)/analytics/client-ltv/page.tsx` imports `getTopClientsByLTV` from `lib/analytics/client-ltv-actions.ts`. | `lib/analytics/client-ltv-actions.ts` for client LTV route data. `lib/analytics/insights-actions.ts` owns LTV distribution. `lib/clients/ltv-trajectory.ts` owns client detail trajectory. |
| `lib/analytics/dietary-trends.ts` | `getDietaryTrendsReport`, `DietaryFrequency`, `AllergyFrequency`, `DietaryTrendPoint`, `DietaryTrendsReport` | `rg` found only the candidate file and `tsconfig.ci.expanded.json`; no app, component, lib, script, or test imports. Same-name chart types are local component types and `lib/analytics/insights-actions.ts` exports the live dietary frequency action. | `lib/analytics/insights-actions.ts` for analytics dietary frequency. `lib/intelligence/dietary-trends.ts` owns deeper dietary intelligence. |
| `lib/analytics/menu-engineering.ts` | `computeMenuEngineering`, `MenuEngineeringItem`, `MenuEngineeringResult`, `Quadrant` | `rg` found only the candidate file, `tsconfig.ci.expanded.json`, stale docs, and unrelated live canonical symbols from `lib/menus/menu-engineering-actions.ts`. No live import path to `lib/analytics/menu-engineering`. | `lib/menus/menu-engineering-actions.ts`, used by `components/menus/menu-engineering-dashboard.tsx` and culinary menu context surfaces. |
| `lib/analytics/price-anomaly.ts` | `detectPriceAnomalies`, `PriceAnomaly`, `PriceAnomalyReport` | `rg` found only the candidate file, `tsconfig.ci.expanded.json`, stale docs, and canonical `lib/intelligence/price-anomaly.ts`. No live import path to `lib/analytics/price-anomaly`. Pricing behavior is retained in the intelligence owner. | `lib/intelligence/price-anomaly.ts`, re-exported from `lib/intelligence/index.ts`. |
| `lib/analytics/revenue-forecast.ts` | `getRevenueForecast`, `RevenueForecast`, `MonthlyRevenue` | `rg` found only the candidate file, `tsconfig.ci.expanded.json`, stale docs, and canonical finance symbols. Live page `app/(chef)/finance/forecast/page.tsx` imports `getRevenueForecast` from `lib/finance/revenue-forecast-actions.ts`. Scheduled route imports `getRevenueForecastForTenant` from `lib/finance/revenue-forecast-run.ts`. | `lib/finance/revenue-forecast-actions.ts` and `lib/finance/revenue-forecast-run.ts`. |

## Retained Candidates

None in this scoped pass. Financial and pricing behavior was not deleted without a canonical owner: price anomaly behavior remains in `lib/intelligence/price-anomaly.ts`; revenue forecast behavior remains in `lib/finance/revenue-forecast-actions.ts` and `lib/finance/revenue-forecast-run.ts`.

## Exact Proof Commands

```powershell
rg -n "(@/lib/analytics/client-ltv|lib/analytics/client-ltv|\\.\\.?/.*/client-ltv|calculateClientLTV|getAllClientLTV|predictChurnRisk|getAllChurnPredictions|ClientLTV|ChurnPrediction|ChurnRiskLevel)" .
rg -n "(@/lib/analytics/dietary-trends|lib/analytics/dietary-trends|\\.\\.?/.*/dietary-trends|getDietaryTrendsReport|DietaryFrequency|AllergyFrequency|DietaryTrendPoint|DietaryTrendsReport)" .
rg -n "(@/lib/analytics/menu-engineering|lib/analytics/menu-engineering|\\.\\.?/.*/menu-engineering|computeMenuEngineering|MenuEngineeringItem|MenuEngineeringResult|Quadrant)" .
rg -n "(@/lib/analytics/price-anomaly|lib/analytics/price-anomaly|\\.\\.?/.*/price-anomaly|detectPriceAnomalies|PriceAnomalyReport|PriceAnomaly)" .
rg -n "(@/lib/analytics/revenue-forecast|lib/analytics/revenue-forecast|\\.\\.?/.*/revenue-forecast|getRevenueForecast|RevenueForecast|MonthlyRevenue)" .
Select-String -Path tsconfig.ci.expanded.json -Pattern "lib/analytics/(client-ltv|dietary-trends|menu-engineering|price-anomaly|revenue-forecast)"
```

## Notes

- Stale docs still mention some deleted paths as historical context. This task did not own those docs.
- Generated `system/agent-reports/*` references were left untouched.
- No migrations, generated database types, servers, builds, deploys, or destructive operations were touched.
