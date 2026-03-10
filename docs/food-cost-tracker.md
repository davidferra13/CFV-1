# Food Cost Tracker (Feature U2)

## Overview

Live food cost percentage tracking. The single most important financial metric for food businesses: food cost % = (ingredient spend / revenue) \* 100. Industry target: 28-35%.

## How It Works

Food cost is computed deterministically (Formula > AI) from two data sources:

1. **Expenses** in food categories (`groceries`, `alcohol`, `specialty_items`) from the `expenses` table
2. **Revenue** from `ledger_entries` (excluding tips and refunds)

No AI involvement. Pure math.

## Files

| File                                                                     | Purpose                                               |
| ------------------------------------------------------------------------ | ----------------------------------------------------- |
| `lib/finance/food-cost-actions.ts`                                       | Server actions (6 functions)                          |
| `components/finance/food-cost-dashboard.tsx`                             | Full dashboard component                              |
| `components/finance/food-cost-widget.tsx`                                | Compact widget for main dashboard                     |
| `app/(chef)/finance/food-cost/page.tsx`                                  | Food cost page                                        |
| `supabase/migrations/20260331000020_food_cost_and_customer_feedback.sql` | Adds `food_cost_target_percent` to `chef_preferences` |

## Server Actions

| Action                             | Description                                           |
| ---------------------------------- | ----------------------------------------------------- |
| `getFoodCostToday()`               | Today's food cost %, spend, revenue, and target       |
| `getFoodCostForPeriod(start, end)` | Date range with daily breakdown                       |
| `getFoodCostByCategory()`          | Breakdown by food category (current month)            |
| `getFoodCostTrend(days?)`          | Daily food cost % for last N days                     |
| `setFoodCostTarget(percent)`       | Save custom target to chef_preferences                |
| `getFoodCostByEvent(eventId?)`     | Per-event food cost from event_financial_summary view |

## UI Features

- Big number display with color coding (green/yellow/red vs target)
- Editable target percentage
- Period selector (Today, This Week, This Month)
- 30-day trend bar chart
- Category breakdown with progress bars
- Per-event drill-down list

## Color Logic

- Green: food cost % is 3+ points below target
- Yellow: within 3% of target
- Red: above target
