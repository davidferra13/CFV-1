# Dashboard Orphan Lanes

- Date: 2026-05-01
- Scope: dashboard chrome prune proof
- Owned deletion files:
  - `components/dashboard/dashboard-category-header.tsx`
  - `components/dashboard/mobile-dashboard-expander.tsx`
  - `components/dashboard/quick-create-strip.tsx`
  - `components/dashboard/shortcut-strip.tsx`

## Decision

The four dashboard chrome files were deleted. No inbound production, test, script, or devtool imports were found.

## Import Proof

Static graph proof:

```text
node scripts/audit-reachability.mjs --json --limit=500 | Select-String -Pattern 'dashboard-category-header|mobile-dashboard-expander|quick-create-strip|shortcut-strip'
```

Result:

```text
"components/dashboard/dashboard-category-header.tsx"
"components/dashboard/mobile-dashboard-expander.tsx"
"components/dashboard/quick-create-strip.tsx"
"components/dashboard/shortcut-strip.tsx"
```

Interpretation: the reachability audit reported these files in the `components.examples.usedNowhere` set, not in `usedOnlyOutsideProd`.

Targeted import string proof:

```text
rg -n 'from [''"].*(dashboard-category-header|mobile-dashboard-expander|quick-create-strip|shortcut-strip)|import\([''"].*(dashboard-category-header|mobile-dashboard-expander|quick-create-strip|shortcut-strip)' app components lib hooks tests scripts devtools --glob '!components/dashboard/dashboard-category-header.tsx' --glob '!components/dashboard/mobile-dashboard-expander.tsx' --glob '!components/dashboard/quick-create-strip.tsx' --glob '!components/dashboard/shortcut-strip.tsx'
```

Result: no matches.

Targeted exported symbol proof:

```text
rg -n 'DashboardCategoryHeader|MobileDashboardExpander|QuickCreateStrip|ShortcutStrip' app components lib hooks tests scripts devtools --glob '!components/dashboard/dashboard-category-header.tsx' --glob '!components/dashboard/mobile-dashboard-expander.tsx' --glob '!components/dashboard/quick-create-strip.tsx' --glob '!components/dashboard/shortcut-strip.tsx'
```

Result: no matches.

## Non Import References

These references were found outside production, test, and script import paths:

- `docs/app-complete-audit.md` mentions the former shortcut strip.
- `docs/frontend-redesign-v2.md` mentions `shortcut-strip.tsx`.
- `docs/session-digests/2026-04-12-task-todo-contract-truth.md` mentions `quick-create-strip.tsx`.
- `docs/reports/prune-candidate-register.md` listed this prune-proof task.
- `docs/specs/menu-hero-access.md` contained a speculative check for `quick-create-strip.tsx`.
- `system/agent-reports/context-continuity/20260430T000146Z-build-continuity-scanner-dashboard-for-duplicate-homepage-prevention.json` mentioned `mobile-dashboard-expander.tsx`.
- `tsconfig.ci.expanded.json` listed the four files in an explicit `files` array, but package scripts call `tsconfig.ci.json`, which uses glob includes and does not require manual removal for deleted component files.

These are historical, generated, or audit references. None are inbound runtime, test, or script imports.

## Dashboard Widget Prune Slice

- Date: 2026-05-01
- Decision: delete dashboard widgets classified as safe duplicate surfaces after current reachability and targeted `rg` proof.

| Deleted file | Export | Canonical owner |
| --- | --- | --- |
| `components/dashboard/feedback-widget.tsx` | `FeedbackWidget` | `/feedback` and `/feedback/dashboard` |
| `components/dashboard/forecast-widget.tsx` | `ForecastWidget` | `PipelineForecastWidget` and dashboard business section |
| `components/dashboard/grocery-price-widget.tsx` | `GroceryPriceWidget` | dashboard price intelligence and `/culinary/price-catalog` |
| `components/dashboard/health-score-widget.tsx` | `HealthScoreWidget` | dashboard intelligence cards and business health summary |
| `components/dashboard/intelligence-summary-card.tsx` | `IntelligenceSummaryCard` | dashboard intelligence cards and `/intelligence` |
| `components/dashboard/meal-prep-widget.tsx` | `MealPrepWidget` | commerce storefront and commerce order surfaces |
| `components/dashboard/menu-history-widget.tsx` | `MenuHistoryWidget` | `/clients/history/past-menus` and menu surfaces |
| `components/dashboard/onboarding-reminder-banner.tsx` | `OnboardingReminderBanner` | onboarding checklist widget and `/onboarding` |
| `components/dashboard/recurring-prep-widget.tsx` | `RecurringPrepWidget` | `/clients/recurring` and recurring client pages |
| `components/dashboard/referral-widget.tsx` | `ReferralWidget` | network intelligence and `/analytics/referral-sources` |
| `components/dashboard/retention-widget.tsx` | `RetentionWidget` | `/analytics/client-ltv` and business cards |
| `components/dashboard/sourcing-widget.tsx` | `SourcingWidget` | `/inventory/procurement` and price catalog sourcing |

Validation after deletion:

```text
rg -n "feedback-widget|forecast-widget|grocery-price-widget|health-score-widget|intelligence-summary-card|meal-prep-widget|menu-history-widget|onboarding-reminder-banner|recurring-prep-widget|referral-widget|retention-widget|sourcing-widget|FeedbackWidget|ForecastWidget|GroceryPriceWidget|HealthScoreWidget|IntelligenceSummaryCard|MealPrepWidget|MenuHistoryWidget|OnboardingReminderBanner|RecurringPrepWidget|ReferralWidget|RetentionWidget|SourcingWidget" app components lib hooks scripts tsconfig.ci.expanded.json --glob '!docs/**'
```

Result: no deleted-file or deleted-export live references remained. The only pre-delete non-self matches were `PipelineForecastWidget`, the live canonical forecast widget, and a comment in `completion-card.tsx` referencing the old health widget pattern.

## Remaining Dashboard Orphan Lanes

The same reachability pass reported these remaining `components/dashboard/*` files as used nowhere before this prune:

### Action And Operations

- `components/dashboard/aar-reminder-widget.tsx`
- `components/dashboard/respond-next-card.tsx`
- `components/dashboard/upcoming-reminders-widget.tsx`
- `components/dashboard/va-tasks-widget.tsx`

### Client Relationship

- `components/dashboard/client-lookup-widget.tsx`
- `components/dashboard/touchpoint-reminders-widget.tsx`

### Compliance And Safety

- `components/dashboard/certification-alerts-widget.tsx`
- `components/dashboard/insurance-alerts-widget.tsx`
- `components/dashboard/nda-alerts-widget.tsx`

### Money And Forecasting

- `components/dashboard/expense-widget.tsx`
- `components/dashboard/overdue-payments-widget.tsx`

### Inventory And Sourcing

- `components/dashboard/pantry-alerts-widget.tsx`
- `components/dashboard/waste-summary-widget.tsx`

### Intelligence, Preferences, And Health

- `components/dashboard/dashboard-quick-settings.tsx`
- `components/dashboard/dashboard-reset-banner.tsx`

## Blockers

No inbound import blockers were found for the four deleted chrome files.
