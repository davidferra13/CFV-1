# Build: Whole-Life Goals Expansion

**Branch:** `feature/scheduling-improvements`
**Migration:** `supabase/migrations/20260321000004_life_goals_expansion.sql`

---

## What Changed

Expanded ChefFlow's goals feature from 8 financial/operational types into a 25-type whole-life goal system covering 9 categories. The business identity stays the center of gravity — personal categories are available but kept light (manual count entry only, no habit-tracker complexity).

---

## New Goal Categories & Types

| Category           | Slug                | New Types                                                   | Tracking      |
| ------------------ | ------------------- | ----------------------------------------------------------- | ------------- |
| Financial          | `financial`         | _(5 existing unchanged)_                                    | auto          |
| Business Growth    | `business_growth`   | `repeat_booking_rate`, `referrals_received`                 | auto / manual |
| Culinary Craft     | `culinary_craft`    | `dishes_created`, `cuisines_explored`, `workshops_attended` | manual count  |
| Reputation         | `reputation`        | `review_average`, `total_reviews`                           | auto          |
| Team & Leadership  | `team_leadership`   | `staff_training_hours`, `vendor_relationships`              | manual count  |
| Learning           | `learning`          | `books_read`, `courses_completed`                           | manual count  |
| Health & Wellbeing | `health_wellbeing`  | `weekly_workouts`, `rest_days_taken`                        | manual count  |
| Work-Life Balance  | `work_life_balance` | `family_dinners`, `vacation_days`                           | manual count  |
| Community          | `community`         | `charity_events`, `meals_donated`                           | manual count  |

**Financial** and **Business Growth** are always enabled and cannot be turned off. All other 7 categories are opt-in.

---

## Database Changes

### New enum values (17 added to `chef_goal_type`)

```sql
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'repeat_booking_rate';
ALTER TYPE chef_goal_type ADD VALUE IF NOT EXISTS 'referrals_received';
-- ... (15 more)
```

### New column: `chef_goals.tracking_method`

```sql
ALTER TABLE chef_goals
  ADD COLUMN tracking_method TEXT NOT NULL DEFAULT 'auto'
  CHECK (tracking_method IN ('auto', 'manual_count'));
```

Derived from `GOAL_TYPE_META` at goal creation time and stored on the row. The dashboard routes to different computation logic based on this value.

### New table: `goal_check_ins`

Append-only log for manual-count goals:

```sql
CREATE TABLE goal_check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  goal_id UUID NOT NULL REFERENCES chef_goals(id) ON DELETE CASCADE,
  logged_value INTEGER NOT NULL,
  notes TEXT,
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

RLS enforced — chefs can only read/write their own check-ins. `current_value` for a manual goal = SUM of `logged_value` within the goal's period.

### New columns on `chef_preferences`

```sql
ALTER TABLE chef_preferences
  ADD COLUMN enabled_goal_categories TEXT[] NOT NULL DEFAULT ARRAY['financial','business_growth'];
ALTER TABLE chef_preferences
  ADD COLUMN category_nudge_levels JSONB NOT NULL DEFAULT '{}';
```

`enabled_goal_categories` is the source of truth for which category sections appear on /goals. `category_nudge_levels` stores per-category override intensity (e.g. `{"health_wellbeing": "gentle"}`); falls back to the goal's own `nudge_level`.

---

## Auto-Tracking Signal Sources

| Goal Type             | Table                       | Query                                                                               |
| --------------------- | --------------------------- | ----------------------------------------------------------------------------------- |
| `repeat_booking_rate` | `events`                    | Clients with ≥2 completed events / total clients → basis points                     |
| `total_reviews`       | `external_reviews`          | `COUNT(*)` for tenant                                                               |
| `review_average`      | `external_reviews`          | `AVG(rating) × 100` → basis points (e.g. 450 = 4.50 ★)                              |
| `workshops_attended`  | `professional_achievements` | `COUNT` where `achieve_type IN ('course','certification')` and `chef_id = tenantId` |

Note: `professional_achievements` uses `chef_id` (not `tenant_id`) — both resolve to the same UUID for the chef entity.

---

## New Files

| File                                         | Purpose                                                                                                                                                          |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/goals/check-in-actions.ts`              | Server actions for manual check-in: `logGoalCheckIn`, `getGoalCheckIns`, `getManualGoalCurrentValue`                                                             |
| `components/goals/life-balance-wheel.tsx`    | Recharts RadarChart showing average progress per enabled category. Color: green ≥75%, amber 40-74%, red <40%. Clicking a spoke scrolls to that category section. |
| `components/goals/goal-check-in-modal.tsx`   | Modal for logging a manual check-in (number + optional note). Shows current total and target for context.                                                        |
| `components/goals/category-section.tsx`      | Collapsible section per category. Header shows icon, label, avg progress badge. Empty state links to wizard pre-filtered to that category.                       |
| `components/goals/category-opt-in-panel.tsx` | Grid of 9 category toggles. Financial + Business Growth are always-on. Saved via `updateCategorySettings()`.                                                     |
| `components/goals/goals-page-client.tsx`     | Client component holding interactive state for /goals page (check-in modal, section scroll refs, opt-in panel visibility).                                       |

---

## Modified Files

| File                                     | Change                                                                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `lib/goals/types.ts`                     | Extended `GoalType` to 25 types; added `GoalCategory`, `TrackingMethod`, `GOAL_CATEGORY_META`, `GOAL_TYPE_TO_CATEGORY`, `GoalCheckIn`; updated `GoalView` and `GoalsDashboard` |
| `lib/goals/signal-fetchers.ts`           | Added 4 new fetchers for auto-tracked types                                                                                                                                    |
| `lib/goals/actions.ts`                   | Routes to manual vs auto computation paths; added `getCategorySettings`, `updateCategorySettings`, `computeCategoryProgress`                                                   |
| `lib/goals/engine.ts`                    | Extended `formatGoalValue`, `formatGapLabel`, `formatGoalUnit` for all new types; added `isManualGoal`                                                                         |
| `lib/goals/notification-builder.ts`      | Added `buildGoalMilestoneMessage` (25/50/75/100%), `buildWeeklyDigestMessage` (Sunday digest)                                                                                  |
| `lib/notifications/types.ts`             | Added `goals` category; added `goal_nudge`, `goal_milestone`, `goal_weekly_digest` actions                                                                                     |
| `lib/notifications/tier-config.ts`       | Added tier entries for 3 new goal notification actions                                                                                                                         |
| `components/goals/goal-card.tsx`         | Added "Log" button for manual goals; "manual" badge; recent check-ins section                                                                                                  |
| `components/goals/goal-type-badge.tsx`   | Added all 17 new goal types to `BADGE_CONFIG`                                                                                                                                  |
| `components/goals/goal-wizard-steps.tsx` | Category filter pills; goals grouped by category; `?category=` query param support; all 25 types                                                                               |
| `app/(chef)/goals/page.tsx`              | Converted to server component; renders `GoalsPageClient`                                                                                                                       |

---

## /goals Page Layout

```
[ Category Opt-In Banner ]  ← dismissed once configured
[ Life Balance Wheel ]      ← RadarChart (shown when ≥3 categories + has goals)
[ Financial section ]       ← always shown
[ Business Growth section ] ← always shown
[ Culinary Craft section ]  ← if enabled
...
[ GoalCheckInModal ]        ← overlay, opened by "Log" button on any manual card
```

---

## Nudge System

- **Per-category intensity**: `category_nudge_levels` JSONB on `chef_preferences`. Keys = category slug, values = `'gentle' | 'standard' | 'aggressive'`.
- Lookup order: category override → goal's own `nudge_level` → default.
- Three new notification actions: `goal_nudge` (info tier), `goal_milestone` (alert tier, fires at 25/50/75/100%), `goal_weekly_digest` (info tier, Sunday summary).

---

## Apply Migration

```bash
# Back up first
supabase db dump --linked > backup-$(date +%Y%m%d-%H%M%S).sql

# Apply
supabase db push --linked
```

The migration is fully additive — no existing data is modified.
