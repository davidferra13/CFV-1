# Inquiries And Scheduling Freeze Lanes

- Date: 2026-05-01
- Scope: `components/inquiries/**`, `components/scheduling/**`
- Module owners: `client-intake` for inquiry surfaces, `chef-workspace` for scheduling surfaces, with `events-ops`, `sourcing-inventory`, and marketplace dependencies where noted.
- Freeze decision: classify first, prune only when a component has no live references, has a proven canonical owner, and does not preserve distinct lead capture, calendar, capacity, recurring scheduling, waitlist, marketplace, money, or platform integration behavior.

## Reachability Proof

Current exact path and symbol scans found no live imports for the listed orphan bucket components outside their own definitions. The only exact path references were `tsconfig.ci.expanded.json`, report or spec references, and one loading registry note for `components/scheduling/capacity-calendar.tsx`.

Commands used:

```text
rg -n --fixed-strings <component-file-stem> app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture docs/interface-philosophy-gap-analysis.md
rg -n --fixed-strings <export-symbol> app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture docs/interface-philosophy-gap-analysis.md
rg -n "<domain-specific canonical signals>" app components lib --glob "!<owned file>"
```

## Classification

| File                                                    | Export                                    | Classification | Canonical owner evidence                                                                                                                                                                                  | Decision                                                                                                              |
| ------------------------------------------------------- | ----------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `components/inquiries/inquiries-bulk-table.tsx`         | `InquiriesBulkTable`, `SerializedInquiry` | keep/recover   | `/inquiries` owns active list rendering inline, but this component uniquely wraps `BulkSelectTable` and calls `bulkDeclineInquiries` and `bulkArchiveInquiries`.                                          | Keep. Bulk mutation behavior is distinct and not a pure duplicate.                                                    |
| `components/inquiries/inquiries-filter-tabs.tsx`        | `InquiriesFilterTabs`                     | uncertain      | `/inquiries` owns active status tabs inline. Specs still reference this file for platform filter behavior.                                                                                                | Keep. Needs product owner decision before pruning.                                                                    |
| `components/inquiries/inquiry-handoff-button.tsx`       | `InquiryHandoffButton`                    | keep/recover   | Inquiry detail already shows handoff status through `getHandoffForInquiry`, and `/network` owns collaboration handoff creation. This component is an unmounted entry point into that owner.               | Keep. Candidate for recover into detail page or network flow, not a safe duplicate.                                   |
| `components/inquiries/platform-analytics-card.tsx`      | `PlatformAnalyticsCard`                   | keep/recover   | Marketplace scorecard and command center own newer marketplace analytics, while this reads `lib/inquiries/platform-analytics`, CPL, and SLA stats.                                                        | Keep. Distinct analytics composition and money-adjacent CPL behavior.                                                 |
| `components/inquiries/platform-link-banner.tsx`         | `PlatformLinkBanner`                      | duplicate      | `components/marketplace/marketplace-action-panel.tsx` exports `MarketplaceFallbackBanner` with the same source-platform external-link responsibility and is mounted by inquiry detail.                    | Retain for now. It is platform integration UI, so pruning requires explicit owner acceptance or a wrapper-only proof. |
| `components/inquiries/platform-raw-feed-tab.tsx`        | `PlatformRawFeedTab`                      | keep/recover   | `MarketplaceSnapshotCard` owns marketplace snapshots. This component owns raw platform email feed display from `lib/inquiries/platform-raw-feed`.                                                         | Keep. Distinct raw-feed inspection behavior.                                                                          |
| `components/inquiries/platform-spend-form.tsx`          | `PlatformSpendForm`                       | keep/recover   | Marketplace ROI actions exist, but this is the only visible form over `recordPlatformSpend` in inquiry scope.                                                                                             | Keep. Money-adjacent spend entry is not safe to delete.                                                               |
| `components/inquiries/sla-badge.tsx`                    | `SLABadge`                                | uncertain      | `lib/analytics/platform-sla.ts` owns SLA computation, but no current mounted badge owner was found.                                                                                                       | Keep. Small display module, no proven canonical replacement.                                                          |
| `components/inquiries/take-a-chef-capture-form.tsx`     | `TakeAChefCaptureForm`                    | keep/recover   | `components/marketplace/take-a-chef-capture-tool.tsx` owns page-capture flow. This form owns manual booking capture through `captureTakeAChefBooking`.                                                    | Keep. Lead capture and money behavior are distinct.                                                                   |
| `components/scheduling/capacity-calendar.tsx`           | `CapacityCalendar`                        | keep/recover   | `/calendar` owns current unified calendar and capacity bar. This component uniquely calls `getMonthCapacity` and `getDateAvailability`; loading registry still lists it.                                  | Keep. Capacity behavior is distinct and restricted from blind pruning.                                                |
| `components/scheduling/current-location-badge.tsx`      | `CurrentLocationBadge`                    | keep/recover   | Prior orphan lane explicitly retained seasonal/location surfaces after deleting `location-badge.tsx`.                                                                                                     | Keep. This is the retained location surface.                                                                          |
| `components/scheduling/grocery-route.tsx`               | `GroceryRoute`                            | uncertain      | `components/grocery/store-split-view.tsx` and `lib/grocery/store-shopping-actions.ts` own active store split UI. This component reads scheduling route shape from `lib/scheduling/grocery-route-actions`. | Keep. Grocery behavior is restricted and the route shape is not identical.                                            |
| `components/scheduling/recurring-schedule-form.tsx`     | `RecurringScheduleForm`                   | uncertain      | `/clients/recurring` and `/clients/[id]/recurring` own active recurring service workspaces through `lib/recurring/actions`, while this uses `lib/scheduling/recurring-actions` and `recurring_schedules`. | Keep. Two recurring domains exist and need owner review before consolidation.                                         |
| `components/scheduling/recurring-schedules-list.tsx`    | `RecurringSchedulesList`                  | uncertain      | Same as form. It includes optimistic updates with rollback and draft event generation through `generateUpcomingEvents`.                                                                                   | Keep. Distinct scheduling table behavior.                                                                             |
| `components/scheduling/seasonal-calendar.tsx`           | default `SeasonalCalendar`                | uncertain      | Culinary seasonal availability and settings seasonal palettes exist, but this owns `seasonalAvailabilityPeriods` via `getYearOverview`.                                                                   | Keep. No proven canonical owner for this exact availability-period calendar.                                          |
| `components/scheduling/seasonal-period-form.tsx`        | default `SeasonalPeriodForm`              | uncertain      | Same seasonal availability-period domain as `seasonal-calendar.tsx`.                                                                                                                                      | Keep. Mutates seasonal periods, not safe to prune without canonical replacement.                                      |
| `components/scheduling/waitlist-manager.tsx`            | `WaitlistManager`                         | duplicate      | `/waitlist` is the active canonical route with `WaitlistAddForm`, `MarkContactedButton`, and `ExpireButton`; calendar command panel also owns date-level waitlist conversion.                             | Retain for now. Waitlist behavior is restricted and this is not only a wrapper.                                       |
| `components/scheduling/waitlist-notification-panel.tsx` | `WaitlistNotificationPanel`               | keep/recover   | Calendar command panel owns waitlist matches in active calendar UI, but this component owns date-specific notification state over `notifyWaitlistOpening`.                                                | Keep. Distinct notify workflow, not a pure duplicate.                                                                 |

## Prune Result

No TS/TSX files were deleted in this slice.

Reasons:

- No listed component had both a safe duplicate owner and no distinct restricted behavior.
- Several components are likely recover candidates, especially `InquiryHandoffButton`, `PlatformRawFeedTab`, `CapacityCalendar`, `RecurringSchedulesList`, and `WaitlistNotificationPanel`.
- `PlatformLinkBanner` and `WaitlistManager` are duplicate-classified, but both touch restricted platform or waitlist behavior and are not wrapper-only modules.

## Validation Plan

Run after this report lands:

```text
rg -n --fixed-strings "components/inquiries/platform-link-banner.tsx" app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture
rg -n --fixed-strings "PlatformLinkBanner" app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture
rg -n --fixed-strings "components/scheduling/waitlist-manager.tsx" app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture
rg -n --fixed-strings "WaitlistManager" app components lib hooks scripts tsconfig.ci.expanded.json docs/reports docs/specs docs/architecture
```
