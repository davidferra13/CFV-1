# Budget Tracking — Per-Event Food Cost Budget

## What Changed

Added the ability for chefs to set a **custom food cost budget per event** and track their actual spending against it in real time.

---

## Why

Previously, the system derived a "budget guardrail" automatically from the formula:

```
max grocery spend = quoted_price × (1 - target_margin%)
```

This is useful as a default, but it doesn't allow a chef to say "for *this* dinner, I want to spend no more than $380 on groceries" — especially when the event economics differ from the global margin setting (e.g., a charitable event, a recurring client with unusual ingredients, a catering job where the food cost ratio is higher by design).

The budget guardrail also showed as two separate static cards depending on whether expenses existed. This has been replaced with a single interactive component.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/20260312000013_event_food_cost_budget.sql` | Adds `food_cost_budget_cents INTEGER DEFAULT NULL` to `events` |
| `lib/events/actions.ts` | Added `setEventFoodCostBudget(eventId, budgetCents)` server action |
| `lib/expenses/actions.ts` | Updated `getBudgetGuardrail()` to use manual budget when set; added `budgetSource` to return |
| `components/events/budget-tracker.tsx` | New interactive budget card component |
| `app/(chef)/events/[id]/page.tsx` | Replaced two static guardrail cards with `<BudgetTracker>` |

---

## How It Works

### Database Layer
- `events.food_cost_budget_cents` — nullable integer (cents). `NULL` = use formula; a value = chef has explicitly set their budget.

### Server Action
- `setEventFoodCostBudget(eventId, budgetCents)`:
  - Accepts a cents integer or `null` (to reset to formula mode)
  - Validates: non-negative integer
  - Tenant-scoped: only the owning chef can update
  - Revalidates the event detail page after save

### Guardrail Logic (`getBudgetGuardrail`)
- Fetches `food_cost_budget_cents` alongside `quoted_price_cents`
- If `food_cost_budget_cents` is set → uses it directly as `maxGrocerySpendCents`
- If `null` → falls back to `quoted_price × (1 - target_margin%)`
- Returns `budgetSource: 'manual' | 'formula'` so the UI can label which mode is active

### UI Component (`BudgetTracker`)
- Displays: budget amount, progress bar (green/yellow/red), spent, remaining, % used
- **"Set Budget"** button opens an inline input to enter a dollar amount
- Chef enters a dollar amount; component converts to cents and calls `setEventFoodCostBudget`
- **"Use formula"** link resets the manual budget to `null` (back to auto-derived mode)
- Progress bar turns **yellow at 80%** and **red above 100%**
- Shows historical average grocery spend for context

---

## Behavior

| Scenario | Result |
|----------|--------|
| No quoted price | Component renders nothing |
| Quoted price set, no manual budget | Shows formula-derived budget with `(60% margin formula)` label |
| Chef clicks "Set Budget" and enters $380 | Budget updates to $380, label changes to `(custom)` |
| Chef clicks "Use formula" | Budget resets to formula-derived amount |
| Spending < 80% of budget | Green progress bar, "ON TRACK" |
| Spending 80–100% of budget | Yellow progress bar, "NEAR LIMIT" |
| Spending > 100% of budget | Red progress bar, "OVER BUDGET", shows overage amount |

---

## Connection to the System

- The budget guardrail is purely informational — it does **not** block expense logging or event transitions. It's a tool to help the chef stay aware, not a hard gate.
- `food_cost_budget_cents` on events is independent of the immutable ledger system. It's a planning field, not a financial record.
- The existing `target_margin_percent` in `chef_preferences` is still used as the formula fallback. Setting a per-event manual budget is an override, not a replacement of the global preference.
- This is the "prescriptive" layer on top of the "post-hoc" expense tracking that already existed.
