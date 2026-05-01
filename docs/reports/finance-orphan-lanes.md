# Finance Orphan Lane Prune Proof

- Date: 2026-05-01
- Scope: prune finance components already classified safe-delete.
- Decision: delete eight orphan components with no live imports.

## Deleted Components

| Component | Export | Evidence summary |
| --- | --- | --- |
| `components/dashboard/expense-widget.tsx` | `ExpenseWidget` | No live import path or JSX usage in `app`, `components`, or `lib`. The only live dashboard expense surface found was `QuickExpenseWidget` in `app/(chef)/dashboard/_sections/business-section.tsx`. |
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

## Duplicate Expense Action Lane Proof

`lib/finance/expense-actions.ts` was deleted after proving that its only app, component, or lib caller was the unused `components/dashboard/expense-widget.tsx`.

```text
rg -n 'components/dashboard/expense-widget|@/components/dashboard/expense-widget|ExpenseWidget|<ExpenseWidget\b' app components lib --glob '*.ts' --glob '*.tsx'
components\dashboard\expense-widget.tsx:27:export function ExpenseWidget() {
components\dashboard\expense-widget.tsx:61:          console.error('[ExpenseWidget] Load failed:', err)
components\dashboard\quick-expense-widget.tsx:22:interface QuickExpenseWidgetProps {
components\dashboard\quick-expense-widget.tsx:33:export function QuickExpenseWidget({
components\dashboard\quick-expense-widget.tsx:36:}: QuickExpenseWidgetProps) {
app\(chef)\dashboard\_sections\business-section.tsx:11:import { QuickExpenseWidget } from '@/components/dashboard/quick-expense-widget'
app\(chef)\dashboard\_sections\business-section.tsx:216:            <QuickExpenseWidget

rg -n 'lib/finance/expense-actions|@/lib/finance/expense-actions' app components lib --glob '*.ts' --glob '*.tsx'
components\dashboard\expense-widget.tsx:5:import { getExpenseSummary, getMonthlyExpenseTrend } from '@/lib/finance/expense-actions'
components\dashboard\expense-widget.tsx:6:import type { ExpenseSummary } from '@/lib/finance/expense-actions'
```

The canonical expense action lane remains `lib/expenses/actions.ts`. Live app and component callers import from that lane, including:

```text
app\(chef)\finance\expenses\page.tsx imports getExpenses from '@/lib/expenses/actions'
app\(chef)\expenses\page.tsx imports getExpenses from '@/lib/expenses/actions'
app\(chef)\events\[id]\page.tsx imports getEventExpenses from '@/lib/expenses/actions'
components\expenses\expense-form.tsx imports createExpense from '@/lib/expenses/actions'
components\expenses\quick-expense-modal.tsx imports createExpense from '@/lib/expenses/actions'
components\expenses\expense-actions.tsx imports deleteExpense from '@/lib/expenses/actions'
```

Unique behavior in the deleted duplicate was read-only summary helpers plus alternate CRUD shapes. No live app, component, or lib caller required those helpers after the unused widget was removed. Tax-linked expense writes remain owned by `lib/expenses/actions.ts`; no tax, ledger, migration, or generated type file was touched.

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
rg -n 'components/dashboard/expense-widget|@/components/dashboard/expense-widget|ExpenseWidget|<ExpenseWidget\b' app components lib --glob '*.ts' --glob '*.tsx'
rg -n 'lib/finance/expense-actions|@/lib/finance/expense-actions' app components lib --glob '*.ts' --glob '*.tsx'
```

After deletion:

```powershell
rg -n "expense-widget|ExpenseWidget|lib/finance/expense-actions|@/lib/finance/expense-actions|getExpenseSummary|getMonthlyExpenseTrend|getDeductibleTotal" app components lib --glob "*.{ts,tsx}"
rg -n "expense-widget\.tsx|expense-widget|expense-actions\.ts|lib/finance/expense-actions" tsconfig.ci.expanded.json docs/reports/finance-orphan-lanes.md tests app components lib --glob "*.{ts,tsx,md,json}"
rg -n "expense-list|ExpenseList|expense-summary-chart|ExpenseSummaryChart|food-cost-widget|FoodCostWidget|forecast-chart|ForecastChart|mileage-summary-widget|MileageSummaryWidget|YoYComparisonPanel" app components lib --glob "*.{ts,tsx}"
rg -n 'components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)([''""/]|$)' app components lib --glob '*.{ts,tsx}'
rg -n '@/components/finance/(expense-list|expense-summary-chart|food-cost-widget|forecast-chart|mileage-summary-widget|yoy-comparison)([''""/]|$)' app components lib --glob '*.{ts,tsx}'
rg -n "expense-list|ExpenseList|expense-summary-chart|ExpenseSummaryChart|food-cost-widget|FoodCostWidget|forecast-chart|ForecastChart|mileage-summary-widget|MileageSummaryWidget|YoYComparisonPanel" docs/reports/finance-orphan-lanes.md
rg -n ([char]0x2014) docs/reports/finance-orphan-lanes.md
```

## Integration Notes

- The orchestrator integration pass removed the six deleted finance component entries from `tsconfig.ci.expanded.json` before commit.
- The second integration pass removed the `food-cost-panel.tsx` and `mileage-tracker.tsx` entries from `tsconfig.ci.expanded.json`.
- This pass removed `components/dashboard/expense-widget.tsx` and `lib/finance/expense-actions.ts` entries from `tsconfig.ci.expanded.json`.

## Residual Risk

- Historical docs and system reports can still mention deleted filenames as audit history. Those references are not live imports.
- Stale system-integrity tests still reference `lib/finance/expense-actions.ts` as an audited path. Those tests should be retargeted to `lib/expenses/actions.ts` by the owner of the system-integrity suite, not patched in this scoped prune.
- No canonical expense server action, tax code, ledger code, `types/database.ts`, or migration file was touched.
