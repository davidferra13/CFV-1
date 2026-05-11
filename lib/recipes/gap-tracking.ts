// Recipe Gap Tracking
// Queries for identifying menu components without linked recipes,
// grouped by event and menu. Used by dashboard nudges, menu detail,
// and post-event recipe prompts.

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { pgClient } from '@/lib/db/index'

// ============================================
// TYPES
// ============================================

export type RecipeGapSummary = {
  totalGaps: number
  upcomingEventGaps: {
    eventId: string
    eventTitle: string
    eventDate: string
    gapCount: number
  }[]
  unlinkedMenuCount: number
}

export type MenuRecipeGapItem = {
  dishId: string
  dishName: string
  componentId: string
  componentName: string
  hasRecipe: boolean
  recipeName?: string
  recipeId?: string
  recipeStatus?: string
}

export type UnrecordedDish = {
  dishId: string
  dishName: string
  componentId: string
  componentName: string
  menuName: string
  recipeId: string | null
  recipeStatus: string | null
}

// ============================================
// 1. GET RECIPE GAP SUMMARY (tenant-wide)
// ============================================

/**
 * Returns aggregate recipe gap counts for the current tenant.
 * Counts components where recipe_id IS NULL in non-archived menus.
 * Groups gaps by upcoming event, sorted by event_date ASC.
 * Also counts menus with gaps that are not linked to any event.
 */
export async function getRecipeGapSummary(): Promise<RecipeGapSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Total gap count across all non-archived menus
  type TotalRow = { total_gaps: string }
  const [totalRow] = await pgClient<TotalRow[]>`
    SELECT COUNT(*)::text AS total_gaps
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    JOIN menus m ON m.id = d.menu_id
    WHERE m.tenant_id = ${tenantId}
      AND m.status != 'archived'
      AND (m.deleted_at IS NULL)
      AND c.recipe_id IS NULL
  `

  // Gaps grouped by event (upcoming or active events only)
  type EventGapRow = {
    event_id: string
    event_title: string
    event_date: string
    gap_count: string
  }
  const eventGapRows = await pgClient<EventGapRow[]>`
    SELECT
      e.id          AS event_id,
      COALESCE(e.occasion, 'Event on ' || e.event_date::text) AS event_title,
      e.event_date::text  AS event_date,
      COUNT(*)::text      AS gap_count
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    JOIN menus m ON m.id = d.menu_id
    JOIN events e ON e.id = m.event_id
    WHERE m.tenant_id = ${tenantId}
      AND m.status != 'archived'
      AND (m.deleted_at IS NULL)
      AND c.recipe_id IS NULL
      AND e.status NOT IN ('completed', 'cancelled')
    GROUP BY e.id, e.occasion, e.event_date
    ORDER BY e.event_date ASC
  `

  // Count of menus with gaps that have no event attached
  type UnlinkedRow = { unlinked_count: string }
  const [unlinkedRow] = await pgClient<UnlinkedRow[]>`
    SELECT COUNT(DISTINCT m.id)::text AS unlinked_count
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    JOIN menus m ON m.id = d.menu_id
    WHERE m.tenant_id = ${tenantId}
      AND m.status != 'archived'
      AND (m.deleted_at IS NULL)
      AND c.recipe_id IS NULL
      AND m.event_id IS NULL
  `

  return {
    totalGaps: parseInt(totalRow?.total_gaps ?? '0', 10),
    upcomingEventGaps: eventGapRows.map((r) => ({
      eventId: r.event_id,
      eventTitle: r.event_title,
      eventDate: r.event_date,
      gapCount: parseInt(r.gap_count, 10),
    })),
    unlinkedMenuCount: parseInt(unlinkedRow?.unlinked_count ?? '0', 10),
  }
}

// ============================================
// 2. GET MENU RECIPE GAPS (per-menu detail)
// ============================================

/**
 * Returns per-component recipe linkage details for a specific menu.
 * Each component shows whether it has a recipe, and if so, the recipe
 * name and status. Sorted by course number, then component name.
 */
export async function getMenuRecipeGaps(menuId: string): Promise<MenuRecipeGapItem[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Verify menu belongs to this tenant
  const [menuCheck] = await pgClient`
    SELECT 1 FROM menus
    WHERE id = ${menuId}
      AND tenant_id = ${tenantId}
      AND (deleted_at IS NULL)
    LIMIT 1
  `
  if (!menuCheck) {
    throw new Error('Menu not found')
  }

  type GapRow = {
    dish_id: string
    dish_name: string
    component_id: string
    component_name: string
    recipe_id: string | null
    recipe_name: string | null
    recipe_status: string | null
  }

  const rows = await pgClient<GapRow[]>`
    SELECT
      d.id       AS dish_id,
      d.course_name AS dish_name,
      c.id       AS component_id,
      c.name     AS component_name,
      c.recipe_id,
      r.name     AS recipe_name,
      r.status   AS recipe_status
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    LEFT JOIN recipes r ON r.id = c.recipe_id
    WHERE d.menu_id = ${menuId}
      AND d.tenant_id = ${tenantId}
    ORDER BY d.course_number, d.sort_order, c.sort_order, c.name
  `

  return rows.map((row) => ({
    dishId: row.dish_id,
    dishName: row.dish_name,
    componentId: row.component_id,
    componentName: row.component_name,
    hasRecipe: row.recipe_id !== null,
    ...(row.recipe_id
      ? {
          recipeId: row.recipe_id,
          recipeName: row.recipe_name ?? undefined,
          recipeStatus: row.recipe_status ?? undefined,
        }
      : {}),
  }))
}

// ============================================
// 3. GET POST-EVENT UNRECORDED DISHES
// ============================================

/**
 * For post-event recipe prompts. Returns dishes served at a completed
 * event that have no linked recipe or only stub recipes.
 * These are candidates for the chef to document after the service.
 */
export async function getPostEventUnrecordedDishes(eventId: string): Promise<UnrecordedDish[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  // Verify event belongs to this tenant and is completed
  const [eventCheck] = await pgClient`
    SELECT 1 FROM events
    WHERE id = ${eventId}
      AND tenant_id = ${tenantId}
      AND status = 'completed'
    LIMIT 1
  `
  if (!eventCheck) {
    throw new Error('Completed event not found')
  }

  type UnrecordedRow = {
    dish_id: string
    dish_name: string
    component_id: string
    component_name: string
    menu_name: string
    recipe_id: string | null
    recipe_status: string | null
  }

  // Components with no recipe, or with a stub recipe (name only, not fleshed out)
  const rows = await pgClient<UnrecordedRow[]>`
    SELECT
      d.id           AS dish_id,
      d.course_name  AS dish_name,
      c.id           AS component_id,
      c.name         AS component_name,
      m.name         AS menu_name,
      c.recipe_id,
      r.status       AS recipe_status
    FROM components c
    JOIN dishes d ON d.id = c.dish_id
    JOIN menus m ON m.id = d.menu_id
    LEFT JOIN recipes r ON r.id = c.recipe_id
    WHERE m.event_id = ${eventId}
      AND m.tenant_id = ${tenantId}
      AND (m.deleted_at IS NULL)
      AND (c.recipe_id IS NULL OR r.status = 'stub')
    ORDER BY d.course_number, d.sort_order, c.sort_order, c.name
  `

  return rows.map((row) => ({
    dishId: row.dish_id,
    dishName: row.dish_name,
    componentId: row.component_id,
    componentName: row.component_name,
    menuName: row.menu_name,
    recipeId: row.recipe_id,
    recipeStatus: row.recipe_status,
  }))
}
