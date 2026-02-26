# Phase 19: Seasonal Palettes

## What Changed

Added the **Seasonal Palette** feature — a strategic definition engine that lets chefs define the culinary and operational reality for each season. Instead of a bare calendar, the system now carries forward a chef's creative thesis, ingredient windows, and operational constraints into the Recipe Library and Schedule views.

## Why

Cooking is deeply seasonal, but "Spring" or "Winter" alone is too vague. A chef needs to know:

- **What's the creative direction?** (Sensory Anchor)
- **What fleeting ingredients are available right now, and when do they vanish?** (Micro-Windows)
- **What operational constraints apply?** (Context Profiles — heatwaves, holiday rushes, team burnout)

This feature closes the gap between calendar logistics and culinary strategy. It ensures that menus written today match the reality of ingredients and team energy three months from now.

## Architecture Decisions

### Single Table with JSONB

Chose one `seasonal_palettes` table with JSONB arrays for micro-windows, context profiles, and proven wins. Rationale:

- These sub-entities are always loaded and saved alongside the parent palette
- They are never independently queried or joined to other tables
- Matches existing patterns (`regular_guests`, `personal_milestones`, `pricing_snapshot`)
- Simpler schema, fewer joins, easier CRUD

### Default Seeding

The 4 standard seasons (Winter, Spring, Summer, Autumn) are auto-seeded on first access (same pattern as `chef_preferences`). Chefs can also create custom seasons (e.g., "Early Spring", "Holiday Rush") beyond the default 4.

### Active Season Resolution

Two-tier resolution:

1. Explicit `is_active` flag (chef manually sets which season they're in)
2. Date-range auto-detection fallback (matches current date to `start_month_day`/`end_month_day`)

Cross-year boundaries handled: Winter (12-01 to 02-28) works via `current >= start OR current <= end` logic in `isDateInRange()`.

## The Three Functional Layers

### 1. Sensory Anchor

Free-text creative thesis. Appears as:

- **Recipe Library:** Banner at the top of the page
- **Schedule:** In the seasonal sidebar

### 2. Micro-Windows

Specific MM-DD date ranges for fleeting ingredients with urgency flags.

- **Normal urgency:** Shown as neutral badges
- **High urgency:** Red badges, always prominent
- **Ending soon (within 7 days):** Amber "ending soon" indicator

### 3. Context Profiles

Named operational scenarios with kitchen reality and menu guardrails.

- Example: "Heatwave" → "No ovens during service. Raw preparations."
- Displayed in the Schedule sidebar as operational reminders

## Additional Fields

- **Pantry & Preserve:** What was saved from last season
- **Chef Energy Reality:** Team stamina and capacity notes
- **Proven Wins:** Go-to emergency dishes, optionally linked to Recipe Bible entries

## Files Created

| File                                                       | Purpose                                           |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `supabase/migrations/20260217000002_seasonal_palettes.sql` | Table, indexes, RLS, trigger                      |
| `lib/seasonal/types.ts`                                    | TypeScript interfaces + default seasons           |
| `lib/seasonal/helpers.ts`                                  | Pure date/season helper functions                 |
| `lib/seasonal/actions.ts`                                  | Server actions (CRUD, seeding, active resolution) |
| `components/settings/seasonal-palette-list.tsx`            | Season cards with active toggle                   |
| `components/settings/seasonal-palette-form.tsx`            | Full 7-section edit form                          |
| `app/(chef)/settings/repertoire/page.tsx`                  | Repertoire list page                              |
| `app/(chef)/settings/repertoire/[id]/page.tsx`             | Palette edit page                                 |
| `components/seasonal/seasonal-banner.tsx`                  | Recipe Library banner                             |
| `components/seasonal/seasonal-sidebar.tsx`                 | Schedule sidebar                                  |

## Files Modified

| File                           | Change                                   |
| ------------------------------ | ---------------------------------------- |
| `app/(chef)/settings/page.tsx` | Added Repertoire link section            |
| `app/(chef)/recipes/page.tsx`  | Added seasonal banner integration        |
| `app/(chef)/schedule/page.tsx` | Added seasonal sidebar (2-column layout) |

## Data Flow

1. **Configure:** Settings > Repertoire — define each season's palette
2. **Set Active:** Toggle which season is current (or auto-detect by date)
3. **Recipe Library:** Banner shows sensory anchor + active/ending micro-windows
4. **Schedule:** Sidebar shows full seasonal context (anchor, windows, profiles, pantry, energy, wins)

## Integration Points

- Recipe Library banner fetches active palette via `getActivePalette()` and computes micro-window state via `getActiveMicroWindows()` / `getEndingMicroWindows()`
- Schedule sidebar receives palette as prop, computes micro-window state internally
- `getActivePalette()` auto-seeds 4 default seasons on first call if none exist, then resolves the current season from date ranges — so the sidebar appears on the Schedule from the chef's very first visit

## Season Auto-Detection

The system knows exactly when seasons change. Resolution order:

1. **Explicit `is_active` flag** — if the chef has manually set an active season, that wins
2. **Date-range auto-detection** — matches today's date (MM-DD) against each palette's `start_month_day` / `end_month_day` range

Cross-year boundaries work correctly: Winter (12-01 to 02-28) uses the rule `current >= start OR current <= end`, so February 17 correctly resolves to Winter.

Default season ranges:

- Winter: Dec 1 – Feb 28
- Spring: Mar 1 – May 31
- Summer: Jun 1 – Aug 31
- Autumn: Sep 1 – Nov 30

When the date crosses a boundary (e.g., March 1), the system automatically detects Spring. No manual intervention required — though the chef can always override by setting an explicit active season.

## Sidebar Behavior

The seasonal sidebar always shows on the Schedule when a matching season exists:

- **Configured palette:** Shows sensory anchor, micro-windows with urgency flags, context profiles, pantry/energy notes, proven wins
- **Unconfigured palette:** Shows season name, date range, and a prompt linking to the edit page to define the creative thesis
- **No matching season:** Sidebar hidden (e.g., custom seasons with gaps in date coverage)

## Verification

1. Apply migration: `npx supabase db push --linked`
2. Navigate to Schedule — verify sidebar appears automatically with current season (auto-detected from date)
3. Navigate to Settings > Repertoire — verify 4 default seasons exist
4. Edit a palette with all sections populated, confirm save
5. Set a different season as active, navigate to Schedule — verify it overrides auto-detection
6. Navigate to Recipe Bible — verify banner appears with sensory anchor
7. `npm run build` passes cleanly
