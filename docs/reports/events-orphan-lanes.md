# Events Orphan Lanes

- Date: 2026-05-01
- Module owner: `events-ops`
- Slice: safe duplicate cleanup for event wrapper files
- Scope: `components/events/events-kanban.tsx`, `components/events/packing-checklist-button.tsx`, `components/events/packing-list.tsx`, `components/events/pricing-insights-panel.tsx`, `components/events/settlement-summary.tsx`, `components/events/take-a-chef-convert-banner.tsx`, `components/events/weather-forecast-card.tsx`, `components/events/photo-permission-indicator.tsx`
- Decision: delete proven duplicate wrappers only

## Current Slice: Event Lib Duplicate Prune

- Date: 2026-05-01
- Worker role: duplicate prune only
- Owned scope: `lib/events/collaborator-actions.ts`, `lib/events/fire-order.ts`, `lib/events/prep-timeline-constants.ts`, this report, and `tsconfig.ci.expanded.json` only if a deleted file had an explicit entry.
- Decision: deleted only high-confidence duplicate lib files with no live app, component, lib, script, or test imports and a clear canonical owner.

### Deleted Event Lib Files

| Deleted file | Export proof | Import path proof | Canonical owner |
| --- | --- | --- | --- |
| `lib/events/collaborator-actions.ts` | `rg -n -e "getEventCollaborators" -e "addCollaborator" -e "updateCollaborator" -e "removeCollaborator" -e "getCollaboratorSummary" -e "CollaboratorSummary" -e "AddCollaboratorInput" -e "UpdateCollaboratorInput" app components lib tests scripts docs tsconfig.ci.expanded.json` found this file plus active collaboration symbols in `lib/collaboration/actions.ts`, `lib/collaboration/settlement-actions.ts`, app/components using those canonical modules, and docs references. No live import used `lib/events/collaborator-actions.ts`. | `rg -n -e "@/lib/events/collaborator-actions" -e "lib/events/collaborator-actions" -e "./collaborator-actions" -e "../collaborator-actions" app components lib tests scripts docs tsconfig.ci.expanded.json` returned no live app/component/lib/script/test import references. | `lib/collaboration/actions.ts` owns event collaboration actions and is imported by `app/(chef)/events/[id]/page.tsx`, `components/events/event-collaborators-panel.tsx`, and `components/collaboration/event-collaborators-panel.tsx`. `lib/collaboration/settlement-actions.ts` owns settlement and station collaborator summaries. |
| `lib/events/prep-timeline-constants.ts` | `rg -n -e "PrepCategory" -e "CATEGORY_LABELS" app components lib tests scripts docs tsconfig.ci.expanded.json` found no live use of this constants file. It found the active `PrepCategory` and `CATEGORY_LABELS` inside `lib/events/prep-timeline.ts`, unrelated local constants elsewhere, and one stale comment in the read-only canonical context `lib/events/prep-timeline.ts`. | `rg -n -e "@/lib/events/prep-timeline-constants" -e "lib/events/prep-timeline-constants" -e "./prep-timeline-constants" -e "../prep-timeline-constants" app components lib tests scripts docs tsconfig.ci.expanded.json` returned no live app/component/lib/script/test import references. | Active prep timeline behavior is owned by `lib/prep-timeline/actions.ts`, `lib/prep-timeline/compute-timeline.ts`, and event detail imports from `@/lib/prep-timeline/*`. Legacy PDF generation and its local labels remain in `lib/events/prep-timeline.ts`. |

### Retained Candidates

| Retained file | Reason | Canonical or related owner |
| --- | --- | --- |
| `lib/events/fire-order.ts` | Retained as uncertain deferred event ops. Exact path proof showed no live app/component/lib/script import, but docs and tests still classify it as deferred fire order behavior: `docs/frontend-backend-parity-audit.md`, `docs/system-behavior-map.md`, `docs/session-digests/2026-04-11-deferred-unblock-analytics-kitchen.md`, `docs/specs/interaction-engine.md`, and `tests/system-integrity/q181-production-readiness.spec.ts`. The request explicitly says not to delete candidates with uncertain event ops behavior. | `lib/events/fire-order-constants.ts` owns exported course and station constants used by `lib/taxonomy/system-defaults.ts`. `lib/mise-en-place/engine.ts` owns an active exported `inferStation` implementation for mise en place behavior. |

### TSConfig Cleanup

- `rg -n -e "./lib/events/collaborator-actions.ts" -e "./lib/events/fire-order.ts" -e "./lib/events/prep-timeline-constants.ts" tsconfig.ci.expanded.json` found only `./lib/events/fire-order.ts`.
- No `tsconfig.ci.expanded.json` edit was needed because neither deleted file had an explicit entry.

### Residual Text References After Deletion

- `docs/multi-chef-coordination.md` and `docs/specs/system-integrity-question-set-cross-system-cohesion.md` still reference `lib/events/collaborator-actions.ts` historically. They were outside the owned scope and were not edited.
- `lib/events/prep-timeline.ts` still has a comment saying category labels are also exported from `prep-timeline-constants.ts`. That file was read-only canonical context for this task, so the stale comment was not edited.

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
| `components/events/aar-prompt-banner.tsx`          | `AARPromptBanner`                | No import path or JSX/function call references outside the file.                                                                               | `/aar`, `/events/[id]/aar`, dashboard AAR widgets, and `components/events/quick-debrief-prompt.tsx`.                   |
| `components/events/collaborator-panel.tsx`         | `CollaboratorPanel`              | No import path or JSX/function call references outside the file.                                                                               | `components/events/event-collaborators-panel.tsx`, `components/collaboration/event-collaborators-panel.tsx`, and event detail collaboration sections. |
| `components/events/dietary-rollup.tsx`             | `DietaryRollupCard`              | No import path or JSX/function call references outside the file.                                                                               | `components/events/dietary-complexity-badge.tsx`, `components/events/constraint-radar-panel.tsx`, hub dietary summaries, and dietary email rollup. |
| `components/events/waste-log-panel.tsx`            | `WasteLogPanel`                  | No import path or JSX/function call references outside the file.                                                                               | `components/events/close-out-wizard.tsx` waste step, `/inventory/waste`, and `/stations/waste`.                        |
| `components/events/photo-permission-indicator.tsx` | `PhotoPermissionIndicator`       | No exact import path, export name, JSX, or function call references outside the file. Only self, report, prune-register, and CI-expanded tsconfig references remained. | Client NDA/photo permission settings, event photo gallery/actions, guest photo consent, and portfolio gallery/actions.   |
| `components/events/events-bulk-table.tsx`          | `EventsBulkTable`                | No exact import path, export name, JSX, or function call references outside the file. Only self and CI-expanded tsconfig references remained.  | Active events table/list UI is owned by `app/(chef)/events/page.tsx`; bulk behavior remains out of this deletion slice.  |
| `components/events/events-view-filter-bar.tsx`     | `EventsViewFilterBar`            | No exact import path, export name, JSX, or function call references outside the file. Only self and CI-expanded tsconfig references remained.  | Active filtering and view switching are owned by `app/(chef)/events/page.tsx` and `app/(chef)/events/board/page.tsx`.    |

## Canonical Owner Proof

- `app/(chef)/events/board/page.tsx` imports `EventKanbanBoard` and renders `<EventKanbanBoard events={boardEvents} />`.
- `app/(chef)/events/[id]/pack/page.tsx` imports `fetchPackingListData`, `getEventWeather`, and `PackingListClient`, then renders `<PackingListClient ... weather={weather} />`.
- `app/(chef)/events/[id]/financial/page.tsx` imports `EventPricingIntelligencePanel` from `components/finance/event-pricing-intelligence-panel` and renders it.
- `app/(chef)/events/[id]/_components/event-detail-money-tab.tsx` imports and renders `EventPricingIntelligencePanel` and `SettlementPreviewPanel`.
- `app/(chef)/events/[id]/page.tsx` imports and renders `MarketplaceConvertBanner`, and imports `WeatherPanel`.
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` imports and renders `WeatherPanel`.
- `app/(chef)/aar/page.tsx` imports and renders `FileAARButton`; `app/(chef)/dashboard/_sections/business-section.tsx` fetches `getEventsNeedingAAR` from the dashboard actions, not `components/events/aar-prompt-banner.tsx`.
- `app/(chef)/events/[id]/page.tsx` imports `DietaryComplexityBadge` and renders the event dietary surface from live guest data.
- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` imports and renders `EventCollaboratorsPanel` from `components/collaboration/event-collaborators-panel`.
- `app/(chef)/events/[id]/_components/event-detail-ops-tab.tsx` imports and renders `EventCollaboratorsPanel` from `components/events/event-collaborators-panel`.
- `components/events/close-out-wizard.tsx` imports `addWasteEntry`, renders `WasteStep`, and writes post-event waste entries without using `WasteLogPanel`.
- `app/(chef)/events/[id]/page.tsx` imports `getEventPhotosForChef` and `EventPhotoGallery`, then renders the active event photo management surface.
- `components/events/photo-consent-summary.tsx` owns guest-level photo consent display.
- `app/(chef)/settings/portfolio/page.tsx` imports `getPortfolio` and renders `GridEditor`; `app/(chef)/portfolio/page.tsx` imports `getPortfolioPhotos` and renders `PortfolioGallery`.
- `lib/portfolio/permission-actions.ts` and `lib/portfolio/permission-check.ts` own event photo permission override and effective permission computation.

## Not Cleared In This Slice

The following events bucket files remain outside this deletion slice:

- Recover candidates: `alcohol-service-log.tsx`, `cancellation-dialog.tsx`, `capacity-warning-banner.tsx`, `circle-rebook-button.tsx`, `equipment-redundancy-checklist.tsx`, `event-inventory-panel.tsx`, `kitchen-profile-callout.tsx`, `photo-tagger.tsx`, `post-event-feedback.tsx`, `pre-service-safety-checklist.tsx`, `production-report-button.tsx`, `scope-drift-banner.tsx`, `tip-request-button.tsx`.
- Photo permission prune candidate proved orphaned and deleted in this slice.
- Event list wrapper prune candidates `events-bulk-table.tsx` and `events-view-filter-bar.tsx` proved orphaned and were deleted in this slice.

## Validation

- `rg -n 'aar-prompt-banner|collaborator-panel|dietary-rollup|waste-log-panel' app components lib tests scripts docs/reports docs/specs docs/multi-chef-coordination.md` found only report and historical docs references after deletion. No code import references remained.
- `rg -n -e '@/components/events/aar-prompt-banner' -e '@/components/events/collaborator-panel' -e '@/components/events/dietary-rollup' -e '@/components/events/waste-log-panel' -e '<AARPromptBanner' -e '<CollaboratorPanel' -e '<DietaryRollupCard' -e '<WasteLogPanel' app components lib tests scripts` returned no matches.
- `rg -n -e '@/components/events/photo-permission-indicator' -e 'components/events/photo-permission-indicator' -e './photo-permission-indicator' -e 'PhotoPermissionIndicator' app components lib tests scripts tsconfig.ci.expanded.json` returned no matches after deletion and tsconfig cleanup.
- `rg -n -e 'photo-permission-indicator' -e 'PhotoPermissionIndicator' .` returned only documentation audit references after deletion: this report and `docs/reports/prune-candidate-register.md`.
- `rg -n -e 'updatePhotoPermission' -e 'getPortfolioPermissionAudit' -e 'getPhotoPermissionStatus' -e 'EventPhotoGallery' -e 'PhotoConsentSummary' app components lib tests` identified active photo permission and event photo owners outside the deleted file.
- `rg -n -e 'events-bulk-table' -e 'EventsBulkTable' -e 'events-view-filter-bar' -e 'EventsViewFilterBar' app components lib tests scripts tsconfig.ci.expanded.json` returned no matches after deletion and tsconfig cleanup.
- `Select-String -Path docs/reports/events-orphan-lanes.md -Pattern ([char]0x2014) -SimpleMatch` returned no matches.
- `git diff --check -- components/events/photo-permission-indicator.tsx docs/reports/events-orphan-lanes.md tsconfig.ci.expanded.json` passed with only line-ending warnings for `docs/reports/events-orphan-lanes.md` and `tsconfig.ci.expanded.json`.
