# UI Components Batch: 17 Component Files

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`

---

## Summary

Created (or enhanced) 17 UI component files across 5 domain areas: portfolio, marketing, operations, documents, and analytics. All components follow established ChefFlow UI patterns.

---

## Files Written

### Portfolio (2 files)

| File                                        | Component         | Purpose                                                                                                                                  |
| ------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `components/portfolio/grid-editor.tsx`      | `GridEditor`      | Drag-and-drop photo grid for portfolio management. 3-column grid, featured star toggle, caption overlay, add/remove/reorder.             |
| `components/portfolio/highlight-editor.tsx` | `HighlightEditor` | Story/highlight section manager grouped by category (events, behind_scenes, testimonials, press). CRUD operations with display ordering. |

### Marketing (4 files)

| File                                                  | Component                  | Purpose                                                                                                                     |
| ----------------------------------------------------- | -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `components/marketing/ab-test-config.tsx`             | `AbTestConfig`             | A/B test creation for email subject lines. Variant A/B inputs, test percentage slider, resolve winner.                      |
| `components/marketing/email-builder.tsx`              | `EmailBuilder`             | Simple email template CRUD. Name, subject, HTML body textarea, category select, inline HTML preview panel.                  |
| `components/marketing/behavioral-segment-builder.tsx` | `BehavioralSegmentBuilder` | Advanced segment filter builder. Filter rows for min/max events, min spend, date ranges, tags. Preview count before saving. |
| `components/marketing/campaign-performance.tsx`       | `CampaignPerformance`      | Email campaign analytics dashboard. Summary KPI cards, Recharts bar chart (opens/clicks/revenue), per-campaign stats table. |

### Operations (4 files)

| File                                           | Component          | Purpose                                                                                                                                                                                 |
| ---------------------------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/operations/kds-view.tsx`           | `KDSView`          | Kitchen Display System. Full-width course cards with color-coded status (pending/fired/plated/served/86'd). Tablet-friendly large text. Integrates CourseFireButton and EightySixModal. |
| `components/operations/course-fire-button.tsx` | `CourseFireButton` | Individual course status progression button. pending->Fire, fired->Mark Plated, plated->Mark Served. Large touch-friendly button with status-specific colors.                           |
| `components/operations/eighty-six-modal.tsx`   | `EightySixModal`   | Confirmation dialog to 86 a course. Includes optional substitute suggestion textarea.                                                                                                   |
| `components/operations/split-billing-form.tsx` | `SplitBillingForm` | Multi-payer allocation. Add/remove payers, percentage inputs that must total 100%, live calculated amounts, even-split shortcut.                                                        |

### Documents (2 files)

| File                                       | Component        | Purpose                                                                                                                                            |
| ------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/documents/version-history.tsx` | `VersionHistory` | Version list with timeline indicator. Shows version number, timestamp, saved-by, revert button per version.                                        |
| `components/documents/comment-thread.tsx`  | `CommentThread`  | Enhanced threaded comments. Resolve/unresolve toggles, show/hide resolved, relative timestamps, Ctrl+Enter submit. (Replaced prior basic version.) |

### Analytics (5 files)

| File                                           | Component            | Purpose                                                                                                                                                                        |
| ---------------------------------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `components/analytics/benchmark-dashboard.tsx` | `BenchmarkDashboard` | 5 KPI cards with sparkline indicators + Recharts multi-line historical trend chart. Props: `current` snapshot + `history` array. (Enhanced from prior snapshot-table version.) |
| `components/analytics/pipeline-forecast.tsx`   | `PipelineForecast`   | Weighted pipeline bar chart (horizontal). Summary card with weighted vs raw totals. Stage breakdown with progress bars. (Enhanced from prior text-only version.)               |
| `components/analytics/client-ltv-chart.tsx`    | `ClientLTVChart`     | Bar chart showing top 15 clients by LTV. Summary cards for avg LTV, top client, total lifetime value. (Enhanced from prior ranked-list version.)                               |
| `components/analytics/demand-heatmap.tsx`      | `DemandHeatmap`      | 12-month grid with predicted vs actual rows per year. Brand color intensity scale. Summary cards for totals and confidence. (Enhanced from prior simple grid version.)         |
| `components/analytics/conversion-funnel.tsx`   | `ConversionFunnel`   | Horizontal bar funnel with narrowing widths. Conversion rate badges between stages. Stage details table with drop-off calculations. (Enhanced from prior basic version.)       |

---

## UI Patterns Followed

All 17 components adhere to established ChefFlow patterns:

- `'use client'` directive at top of every file
- Card/CardHeader/CardTitle/CardContent from `@/components/ui/card`
- Button variants: `primary`, `secondary`, `danger`, `ghost` only
- Badge variants: `default`, `success`, `warning`, `error`, `info` only
- `useTransition` for async server action calls
- `toast` from `sonner` for success/error feedback
- Stone color palette throughout
- Brand-600 (#d47530) for primary accent
- Recharts with `ComposedChart`, `CartesianGrid` stroke `#e7e5e4`, axis tick fill `#78716c`
- Money formatted as `$${(cents / 100).toFixed(2)}`
- No `react-markdown` usage

---

## Server Action Dependencies

These components import from action modules that must exist (or be stubbed) for the components to compile:

| Import Path                                 | Actions Used                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------- |
| `@/lib/portfolio/actions`                   | `addPortfolioItem`, `removePortfolioItem`, `reorderPortfolio`             |
| `@/lib/portfolio/highlight-actions`         | `addHighlight`, `updateHighlight`, `removeHighlight`, `reorderHighlights` |
| `@/lib/marketing/ab-test-actions`           | `createAbTest`, `resolveAbTest`                                           |
| `@/lib/marketing/email-template-actions`    | `createEmailTemplate`, `updateEmailTemplate`, `deleteEmailTemplate`       |
| `@/lib/marketing/segmentation-actions`      | `createBehavioralSegment`, `previewSegmentCount`, `deleteSegment`         |
| `@/lib/operations/kds-actions`              | `fireCourse`, `markCoursePlated`, `markCourseServed`, `mark86`            |
| `@/lib/operations/split-billing-actions`    | `setSplitBilling`                                                         |
| `@/lib/operations/document-version-actions` | `revertToVersion`                                                         |
| `@/lib/operations/document-comment-actions` | `addComment`, `resolveComment`, `unresolveComment`                        |

---

## Notes

- **Existing files enhanced:** 7 files (comment-thread, benchmark-dashboard, pipeline-forecast, client-ltv-chart, demand-heatmap, conversion-funnel, and pipeline-forecast) already existed with basic implementations. They were rewritten with richer UI: charts, summary cards, better empty states, and consistent patterns.
- **New files created:** 10 files (grid-editor, highlight-editor, ab-test-config, email-builder, behavioral-segment-builder, campaign-performance, kds-view, course-fire-button, eighty-six-modal, split-billing-form, version-history).
- **Inline styles:** Used only where Tailwind cannot express dynamic runtime values (e.g., `width` percentages from data, `gridTemplateColumns` with `auto repeat(12, 1fr)`). This is standard practice.
- **Linter auto-fixes:** The linter automatically adjusted Recharts `Tooltip` formatter signatures to handle `number | undefined` (adding `?? 0` fallbacks) and renamed `markPlated`/`markServed` to `markCoursePlated`/`markCourseServed` in kds-actions imports. These changes were preserved.
