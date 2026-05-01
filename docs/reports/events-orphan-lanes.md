# Events Orphan Lanes

- Date: 2026-05-01
- Module owner: `events-ops`
- Slice: safe duplicate cleanup for event wrapper files
- Scope: `components/events/events-kanban.tsx`, `components/events/packing-checklist-button.tsx`, `components/events/packing-list.tsx`, `components/events/pricing-insights-panel.tsx`, `components/events/settlement-summary.tsx`, `components/events/take-a-chef-convert-banner.tsx`, `components/events/weather-forecast-card.tsx`
- Decision: delete proven duplicate wrappers only

## Hard Stops

- No event recover candidates touched.
- No safety modules touched.
- No finance implementation files touched.
- No route files touched.
- No migrations or generated types touched.
- No database operations run.
- No build or dev server run.

## Current Evidence

Evidence classification: `current-dirty`.

The working tree had unrelated dirty files before this slice started. None were in this task ownership set. Owned component files were clean before deletion.

Reference checks:

- `git grep -n -E '@/components/events/(events-kanban|packing-checklist-button|packing-list|pricing-insights-panel|settlement-summary|take-a-chef-convert-banner|weather-forecast-card)([''"])' -- app components lib tests scripts docs` returned no matches.
- `git grep -n -F -e "<EventsKanban" -e "EventsKanban(" -e "<PackingChecklistButton" -e "PackingChecklistButton(" -e "<PricingInsightsPanel" -e "PricingInsightsPanel(" -e "<SettlementSummary" -e "SettlementSummary(" -e "<TakeAChefConvertBanner" -e "TakeAChefConvertBanner(" -e "<WeatherForecastCard" -e "WeatherForecastCard(" -- .` returned only the candidate files themselves, plus unrelated commerce `getSettlementSummary` function hits.
- `rg -n -F` across `app`, `components`, `lib`, and `docs/reports` found the candidate filenames only in `docs/reports/prune-candidate-register.md`, aside from generic packing and settlement domain names in active modules.

## Deleted Files

| Deleted file                                       | Export                           | Proof                                                                                                                                          | Canonical owner                                                                                                        |
| -------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `components/events/events-kanban.tsx`              | `EventsKanban`                   | No import path or JSX/function call references outside the file.                                                                               | `components/events/event-kanban-board.tsx`, imported and rendered by `app/(chef)/events/board/page.tsx`.               |
| `components/events/packing-checklist-button.tsx`   | default `PackingChecklistButton` | No import path or JSX/function call references outside the file.                                                                               | `/events/[id]/pack`, backed by `app/(chef)/events/[id]/pack/page.tsx` and `components/events/packing-list-client.tsx`. |
| `components/events/packing-list.tsx`               | default `PackingList`            | No exact import path references outside the file. Generic `PackingList` names belong to document generation and active pack code.              | `/events/[id]/pack`, backed by `fetchPackingListData`, `getPackingStatus`, and `PackingListClient`.                    |
| `components/events/pricing-insights-panel.tsx`     | `PricingInsightsPanel`           | No import path or JSX/function call references outside the file.                                                                               | `components/finance/event-pricing-intelligence-panel.tsx`, rendered by event financial and event money routes.         |
| `components/events/settlement-summary.tsx`         | `SettlementSummary`              | No import path or JSX/function call references outside the file. Generic `getSettlementSummary` hits are commerce actions, not this component. | `components/collaboration/settlement-preview-panel.tsx`, rendered by event money route.                                |
| `components/events/take-a-chef-convert-banner.tsx` | `TakeAChefConvertBanner`         | No import path or JSX/function call references outside the file.                                                                               | `components/events/marketplace-convert-banner.tsx`, rendered by event detail page with a platform label.               |
| `components/events/weather-forecast-card.tsx`      | `WeatherForecastCard`            | No import path or JSX/function call references outside the file.                                                                               | `components/events/weather-panel.tsx` and packing weather handling in `PackingListClient`.                             |

## Canonical Owner Proof

- `app/(chef)/events/board/page.tsx` imports `EventKanbanBoard` and renders `<EventKanbanBoard events={boardEvents} />`.
- `app/(chef)/events/[id]/pack/page.tsx` imports `fetchPackingListData`, `getEventWeather`, and `PackingListClient`, then renders `<PackingListClient ... weather={weather} />`.
- `app/(chef)/events/[id]/financial/page.tsx` imports `EventPricingIntelligencePanel` from `components/finance/event-pricing-intelligence-panel` and renders it.
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` imports and renders `EventPricingIntelligencePanel` and `SettlementPreviewPanel`.
- `app/(chef)/events/[id]/page.tsx` imports and renders `MarketplaceConvertBanner`, and imports `WeatherPanel`.
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` imports and renders `WeatherPanel`.

## Not Cleared In This Slice

The following events bucket files remain outside this deletion slice:

- Recover candidates: `alcohol-service-log.tsx`, `cancellation-dialog.tsx`, `capacity-warning-banner.tsx`, `circle-rebook-button.tsx`, `equipment-redundancy-checklist.tsx`, `event-inventory-panel.tsx`, `events-bulk-table.tsx`, `events-view-filter-bar.tsx`, `kitchen-profile-callout.tsx`, `photo-tagger.tsx`, `post-event-feedback.tsx`, `pre-service-safety-checklist.tsx`, `production-report-button.tsx`, `scope-drift-banner.tsx`, `tip-request-button.tsx`.
- Other duplicate candidates: `aar-prompt-banner.tsx`, `collaborator-panel.tsx`, `dietary-rollup.tsx`, `waste-log-panel.tsx`.
- Prune candidate still pending focused proof: `photo-permission-indicator.tsx`.

## Validation Plan

- Em dash scan on changed files.
- `git diff --check`.
- Focused TypeScript validation only if practical after deletion proof.
