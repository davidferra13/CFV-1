'use server'

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export type RecipeEvent = {
  event_id: string
  event_name: string
  event_date: string | null
  menu_name: string | null
  guest_count: number | null
}

export async function getEventsUsingRecipe(recipeId: string): Promise<RecipeEvent[]> {
  const user = await requireChef()

  const rows = (await db.execute(sql`
    SELECT DISTINCT ON (e.id)
      e.id AS event_id,
      e.name AS event_name,
      e.event_date::text AS event_date,
      m.name AS menu_name,
      e.guest_count AS guest_count
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    JOIN menus m ON m.id = d.menu_id
    JOIN events e ON e.id = m.event_id
    WHERE c.recipe_id = ${recipeId}
      AND c.tenant_id = ${user.tenantId}
    ORDER BY e.id, e.event_date DESC
    LIMIT 10
  `)) as unknown as RecipeEvent[]

  return rows.map((r) => ({
    event_id: r.event_id,
    event_name: r.event_name,
    event_date: r.event_date,
    menu_name: r.menu_name,
    guest_count: r.guest_count ?? null,
  }))
}
