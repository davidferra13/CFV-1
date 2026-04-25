'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db'

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

type SafeToServeResult = {
  safe: boolean
  last_served: string | null
  days_ago: number | null
}

function normalizeWindowDays(windowDays: number): number {
  if (!Number.isFinite(windowDays)) return 14
  return Math.max(1, Math.floor(windowDays))
}

/**
 * Returns dishes served to a specific client within the last N days.
 * Use this to see what to avoid when planning meals.
 */
export async function getRecentlyServedDishes(
  clientId: string,
  windowDays: number = 14
): Promise<RecentDish[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const days = normalizeWindowDays(windowDays)

  return pgClient<RecentDish[]>`
    SELECT
      sdh.dish_name,
      sdh.recipe_id::text AS recipe_id,
      MAX(sdh.served_date) AS last_served,
      COUNT(*)::int AS times_served_in_window,
      (
        SELECT s2.client_reaction
        FROM served_dish_history s2
        WHERE s2.chef_id = ${tenantId}
          AND s2.client_id = ${clientId}
          AND s2.dish_name = sdh.dish_name
          AND s2.recipe_id IS NOT DISTINCT FROM sdh.recipe_id
        ORDER BY s2.served_date DESC
        LIMIT 1
      ) AS client_reaction
    FROM served_dish_history sdh
    WHERE sdh.chef_id = ${tenantId}
      AND sdh.client_id = ${clientId}
      AND sdh.served_date >= CURRENT_DATE - (${days} * INTERVAL '1 day')
    GROUP BY sdh.dish_name, sdh.recipe_id
    ORDER BY MAX(sdh.served_date) DESC, sdh.dish_name ASC
  `
}

/**
 * Returns the chef's active dish repertoire, annotated with how recently each
 * dish was served to a specific client. Dishes outside the rotation window sort
 * ahead of dishes served recently; never-served dishes appear first.
 */
export async function getRotationSuggestions(
  clientId: string,
  windowDays: number = 14
): Promise<RotationSuggestion[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const days = normalizeWindowDays(windowDays)

  return pgClient<RotationSuggestion[]>`
    SELECT
      di.id::text AS recipe_id,
      di.name AS dish_name,
      client_hist.last_served AS last_served_to_client,
      CASE
        WHEN client_hist.last_served IS NOT NULL
        THEN (CURRENT_DATE - client_hist.last_served::date)::int
        ELSE NULL
      END AS days_since_served,
      COALESCE(di.times_served, 0)::int AS times_served_total,
      client_hist.client_reaction
    FROM dish_index di
    LEFT JOIN LATERAL (
      SELECT
        MAX(sdh.served_date) AS last_served,
        (
          SELECT s2.client_reaction
          FROM served_dish_history s2
          WHERE s2.chef_id = ${tenantId}
            AND s2.client_id = ${clientId}
            AND (
              (di.linked_recipe_id IS NOT NULL AND s2.recipe_id = di.linked_recipe_id)
              OR LOWER(s2.dish_name) = LOWER(di.name)
            )
          ORDER BY s2.served_date DESC
          LIMIT 1
        ) AS client_reaction
      FROM served_dish_history sdh
      WHERE sdh.chef_id = ${tenantId}
        AND sdh.client_id = ${clientId}
        AND (
          (di.linked_recipe_id IS NOT NULL AND sdh.recipe_id = di.linked_recipe_id)
          OR LOWER(sdh.dish_name) = LOWER(di.name)
        )
    ) client_hist ON true
    WHERE di.tenant_id = ${tenantId}
      AND di.rotation_status = 'active'
      AND di.archived = false
    ORDER BY
      CASE
        WHEN client_hist.last_served IS NULL THEN 0
        WHEN client_hist.last_served < CURRENT_DATE - (${days} * INTERVAL '1 day') THEN 1
        ELSE 2
      END ASC,
      client_hist.last_served ASC NULLS FIRST,
      di.times_served ASC,
      di.name ASC
  `
}

/**
 * Quick check: is this specific dish safe to serve within the rotation window?
 */
export async function isDishSafeToServe(
  clientId: string,
  dishName: string,
  windowDays: number = 7
): Promise<SafeToServeResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const days = normalizeWindowDays(windowDays)

  const rows = await pgClient<{ last_served: string; days_ago: number }[]>`
    SELECT
      served_date AS last_served,
      (CURRENT_DATE - served_date::date)::int AS days_ago
    FROM served_dish_history
    WHERE chef_id = ${tenantId}
      AND client_id = ${clientId}
      AND LOWER(dish_name) = LOWER(${dishName})
    ORDER BY served_date DESC
    LIMIT 1
  `

  if (rows.length === 0) {
    return { safe: true, last_served: null, days_ago: null }
  }

  const latest = rows[0]

  return {
    safe: latest.days_ago >= days,
    last_served: latest.last_served,
    days_ago: latest.days_ago,
  }
}
