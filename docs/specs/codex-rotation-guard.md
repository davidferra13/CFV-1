# Codex Build Spec: Menu Rotation Guard

> **Scope:** 1 new server action file. Zero migrations, zero UI.
> **Risk:** MINIMAL. Read-only queries against existing tables. No writes.
> **Branch name:** `codex/rotation-guard`

---

## Why

ChefFlow tracks every dish served to every client via `served_dish_history` (per-client, per-dish, per-date) and `dish_appearances` (per-dish, per-event). But there is no query that answers: "What has this client NOT been served in the last N days?" or "What was served recently and should be avoided?"

For a 4-month residency serving 2-3 meals daily (360+ meals), this is critical. The chef needs rotation awareness to avoid repeating dishes.

## What to Build

### 1. Server Action File

**File:** `lib/menus/rotation-guard.ts` (NEW FILE)

```typescript
'use server'

import { db } from '@/lib/db'
import { requireChef } from '@/lib/auth/permissions'

export interface RecentDish {
  dish_name: string
  recipe_id: string | null
  last_served: string
  times_served_in_window: number
  client_reaction: string | null
}

export interface RotationSuggestion {
  recipe_id: string
  dish_name: string
  last_served_to_client: string | null
  days_since_served: number | null
  times_served_total: number
  client_reaction: string | null
}

/**
 * Returns dishes served to a specific client within the last N days.
 * Use this to see what to AVOID when planning meals.
 */
export async function getRecentlyServedDishes(
  clientId: string,
  windowDays: number = 14
): Promise<RecentDish[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `SELECT
       dish_name,
       recipe_id,
       MAX(served_date) as last_served,
       COUNT(*)::int as times_served_in_window,
       (SELECT client_reaction FROM served_dish_history s2
        WHERE s2.chef_id = $1 AND s2.client_id = $2 AND s2.dish_name = sdh.dish_name
        ORDER BY s2.served_date DESC LIMIT 1
       ) as client_reaction
     FROM served_dish_history sdh
     WHERE chef_id = $1
       AND client_id = $2
       AND served_date >= CURRENT_DATE - ($3 || ' days')::interval
     GROUP BY dish_name, recipe_id
     ORDER BY MAX(served_date) DESC`,
    [tenantId, clientId, windowDays]
  )

  return result.rows
}

/**
 * Returns the chef's full dish repertoire, annotated with how recently
 * each dish was served to a specific client. Dishes never served to
 * this client appear with null last_served (highest rotation priority).
 */
export async function getRotationSuggestions(
  clientId: string,
  windowDays: number = 14
): Promise<RotationSuggestion[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `SELECT
       di.id as recipe_id,
       di.name as dish_name,
       client_hist.last_served as last_served_to_client,
       CASE
         WHEN client_hist.last_served IS NOT NULL
         THEN (CURRENT_DATE - client_hist.last_served::date)
         ELSE NULL
       END as days_since_served,
       COALESCE(di.times_served, 0)::int as times_served_total,
       client_hist.client_reaction
     FROM dish_index di
     LEFT JOIN LATERAL (
       SELECT
         MAX(served_date) as last_served,
         (SELECT client_reaction FROM served_dish_history s2
          WHERE s2.chef_id = $1 AND s2.client_id = $2 AND s2.recipe_id = di.id
          ORDER BY s2.served_date DESC LIMIT 1
         ) as client_reaction
       FROM served_dish_history
       WHERE chef_id = $1 AND client_id = $2 AND recipe_id = di.id
     ) client_hist ON true
     WHERE di.tenant_id = $1
       AND di.rotation_status = 'active'
     ORDER BY
       client_hist.last_served ASC NULLS FIRST,
       di.times_served ASC`,
    [tenantId, clientId]
  )

  return result.rows
}

/**
 * Quick check: is this specific dish "safe" to serve (not served within windowDays)?
 */
export async function isDishSafeToServe(
  clientId: string,
  dishName: string,
  windowDays: number = 7
): Promise<{ safe: boolean; last_served: string | null; days_ago: number | null }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const result = await db.query(
    `SELECT served_date
     FROM served_dish_history
     WHERE chef_id = $1
       AND client_id = $2
       AND LOWER(dish_name) = LOWER($3)
       AND served_date >= CURRENT_DATE - ($4 || ' days')::interval
     ORDER BY served_date DESC
     LIMIT 1`,
    [tenantId, clientId, dishName, windowDays]
  )

  if (result.rows.length === 0) {
    return { safe: true, last_served: null, days_ago: null }
  }

  const lastServed = result.rows[0].served_date
  const daysAgo = Math.floor((Date.now() - new Date(lastServed).getTime()) / (1000 * 60 * 60 * 24))

  return { safe: false, last_served: lastServed, days_ago: daysAgo }
}
```

---

## Files to Read for Context (DO NOT MODIFY these)

- `lib/db/schema/schema.ts` -- look up these tables for exact column names:
  - `served_dish_history` (search for `servedDishHistory`, around line 13445) -- has `chef_id`, `client_id`, `recipe_id`, `dish_name`, `served_date`, `client_reaction`, `event_id`, `notes`
  - `dish_index` (search for `dishIndex`, around line 2189) -- has `tenant_id`, `name`, `rotation_status`, `times_served`, `first_served`, `last_served`, `is_signature`, `season_affinity`, `dietary_tags`, `allergen_flags`
- `lib/auth/permissions.ts` -- how requireChef() works, what tenantId is
- `lib/db/index.ts` -- how db.query works

## DO NOT

- Do NOT create any migration files
- Do NOT modify schema.ts
- Do NOT modify any existing files
- Do NOT add UI components or pages
- Do NOT write to any database tables (all queries are SELECT only)
- Do NOT add new dependencies
- Do NOT create test files

## IMPORTANT: Column Name Verification

Before writing the final code, READ schema.ts for `served_dish_history` and `dish_index` to confirm exact column names. The SQL uses snake_case database names, not camelCase Drizzle names. If `dish_index` uses `name` vs `dish_name`, or `tenant_id` vs `chef_id`, use whatever schema.ts says. The table names in SQL are the string passed to `pgTable()` (e.g., `"served_dish_history"`, `"dish_index"`).
