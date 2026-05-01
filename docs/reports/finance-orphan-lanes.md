# Finance Orphan Lane Prune Proof

- Date: 2026-05-01
- Scope: prune finance components already classified safe-delete.
- Decision: delete eight orphan components with no live imports.

## Deleted Components

| Component | Export | Evidence summary |
| --- | --- | --- |
| `components/finance/expense-list.tsx` | `ExpenseList` | No import path hits in `app`, `components`, or `lib`; export-name hits were self references only. |
| `components/finance/expense-summary-chart.tsx` | `ExpenseSummaryChart` | No import path hits in `app`, `components`, or `lib`; export-name hits were self references only. |
| `components/finance/food-cost-widget.tsx` | `FoodCostWidget` | No import path hits in `app`, `components`, or `lib`; export-name hits were self references only. |
| `components/finance/forecast-chart.tsx` | `ForecastChart` | No import path hits in `app`, `components`, or `lib`; export-name hits were self references only. |
| `components/finance/mileage-summary-widget.tsx` | `MileageSummaryWidget` | No import path hits in `app`, `components`, or `lib`; export-name hits were self references only. |
| `components/finance/yoy-comparison.tsx` | `YoYComparisonPanel` | The broad path search matched `yoy-comparison-dashboard`, not this component. Export-name hits were self references only. |
| `components/finance/food-cost-panel.tsx` | `FoodCostPanel` | No live import path or JSX usage. Active event food-cost UI is owned by `EventDetailMoneyTab` and `EventFoodCostInsight`; server food-cost actions remain live. |
| `components/finance/mileage-tracker.tsx` | `MileageTracker` | No live import path or JSX usage. Active event mileage UI is `MileageLogPanel`; Tax Center mileage is owned by `lib/tax/actions.ts`. |

## Canonical Owner Evidence

The active event food-cost and mileage owners are outside the deleted components:

```text
app\(chef)\events\[id]\_components\event-detail-money-tab.tsx imports EventFoodCostInsight and MileageLogPanel
app\(chef)\events\[id]\page.tsx imports getMileageLogs from lib/finance/mileage-actions
app\(chef)\finance\tax\page.tsx imports getYearlyMileageSummary from lib/tax/actions
```

The active year-over-year reporting route imports `yoy-comparison-dashboard`, which is outside this prune scope:

```text
app\(chef)\finance\reporting\yoy-comparison\page.tsx:4:import YoyComparisonDashboard from '@/components/finance/yoy-comparison-dashboard'
```

## Proof Commands

Before deletion:

```powershell
rg -n "expense-list|ExpenseList" .
rg -n "expense-summary-chart|ExpenseSummaryChart" .
rg -n "food-cost-widget|FoodCostWidget" .
rg -n "forecast-chart|ForecastChart" .
rg -n "mileage-summary-widget|MileageSummaryWidget" .
rg -n "yoy-comparison|YoYComparisonPanel" .
rg -n '@/components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)' app components lib --glob '*.{ts,tsx}'
rg -n 'components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)' app components lib --glob '*.{ts,tsx}'
rg -n '\b(ExpenseList|ExpenseSummaryChart|FoodCostWidget|ForecastChart|MileageSummaryWidget|YoYComparisonPanel)\b' app components lib --glob '*.{ts,tsx}'
rg -n "food-cost-panel|FoodCostPanel|mileage-tracker|MileageTracker" app components lib --glob "*.{ts,tsx}"
```

After deletion:

```powershell
rg -n "expense-list|ExpenseList|expense-summary-chart|ExpenseSummaryChart|food-cost-widget|FoodCostWidget|forecast-chart|ForecastChart|mileage-summary-widget|MileageSummaryWidget|YoYComparisonPanel" app components lib --glob "*.{ts,tsx}"
rg -n 'components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)([''""/]|$)' app components lib --glob '*.{ts,tsx}'
rg -n '@/components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)([''""/]|$)' app components lib --glob '*.{ts,tsx}'
rg -n "expense-list|ExpenseList|expense-summary-chart|ExpenseSummaryChart|food-cost-widget|FoodCostWidget|forecast-chart|ForecastChart|mileage-summary-widget|MileageSummaryWidget|YoYComparisonPanel" docs/reports/finance-orphan-lanes.md
rg -n ([char]0x2014) docs/reports/finance-orphan-lanes.md
```

## Integration Notes

- The orchestrator integration pass removed the six deleted finance component entries from `tsconfig.ci.expanded.json` before commit.
- The second integration pass removed the `food-cost-panel.tsx` and `mileage-tracker.tsx` entries from `tsconfig.ci.expanded.json`.

## Residual Risk

- Historical docs and system reports can still mention deleted filenames as audit history. Those references are not live imports.
- No server actions, finance action modules, tax code, ledger code, `types/database.ts`, or migrations were touched.
