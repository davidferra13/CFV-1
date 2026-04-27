'use server'

/**
 * Equipment Intelligence - Server Actions
 * Fetches data from DB, passes to pure engine functions, persists results.
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { buildEquipmentLoadout } from '@/lib/equipment-loadout/engine'
import { detectGaps } from './gap-detection'
import type { EquipmentLoadout, EquipmentGap } from './types'
import type { LoadoutInput, LoadoutRecipe, LoadoutComponent } from '@/lib/equipment-loadout/types'
import { revalidatePath } from 'next/cache'

/**
 * Generate equipment loadout for an event.
 * Fetches event data, recipes, inventory, then calls the pure engine.
 */
export async function generateEventLoadout(eventId: string): Promise<EquipmentLoadout> {
  const user = await requireChef()
  const chefId = user.tenantId!

  // Fetch event basics
  const eventRows = await db.execute(sql`
    SELECT id, guest_count, service_style, venue_type, event_date
    FROM events
    WHERE id = ${eventId} AND tenant_id = ${chefId}
    LIMIT 1
  `)
  const event = (eventRows as any)[0]
  if (!event) throw new Error('Event not found')

  // Fetch recipes via menu -> dishes -> recipes
  const recipeRows = await db.execute(sql`
    SELECT DISTINCT r.id, r.name, r.method, r.equipment
    FROM recipes r
    JOIN menu_dishes md ON md.recipe_id = r.id
    JOIN menus m ON m.id = md.menu_id
    WHERE m.event_id = ${eventId} AND r.tenant_id = ${chefId}
  `)

  const recipes: LoadoutRecipe[] = (recipeRows as any[]).map((r: any) => ({
    id: r.id,
    name: r.name,
    method: r.method,
    equipment: r.equipment ?? [],
    components: [], // Components would come from dish index if available
  }))

  // Fetch recipe components if dish_index_entries exist
  for (const recipe of recipes) {
    try {
      const compRows = await db.execute(sql`
        SELECT name, category
        FROM dish_index_entries
        WHERE recipe_id = ${recipe.id}
      `)
      recipe.components = (compRows as any[]).map((c: any) => ({
        name: c.name,
        category: c.category,
        technique_notes: null,
      }))
    } catch {
      // dish_index_entries may not exist, that's fine
    }
  }

  // Fetch inventory
  const inventoryRows = await db.execute(sql`
    SELECT id, name, canonical_name, category::text as category_slug,
           quantity_owned, status, size_label, tags
    FROM equipment_items
    WHERE chef_id = ${chefId}
      AND status NOT IN ('retired')
  `)

  const inventory = (inventoryRows as any[]).map((inv: any) => ({
    id: inv.id,
    name: inv.name,
    canonical_name: inv.canonical_name,
    category_slug: inv.category_slug,
    quantity_owned: inv.quantity_owned ?? 1,
    status: inv.status,
    size_label: inv.size_label,
    tags: inv.tags,
  }))

  const input: LoadoutInput = {
    event_id: eventId,
    guest_count: event.guest_count ?? 4,
    service_style: event.service_style,
    venue_type: event.venue_type,
    recipes,
    inventory,
  }

  return buildEquipmentLoadout(input)
}

/**
 * Detect and persist equipment gaps for an event.
 */
export async function detectAndSaveGaps(eventId: string): Promise<EquipmentGap[]> {
  const user = await requireChef()
  const chefId = user.tenantId!

  const loadout = await generateEventLoadout(eventId)

  // Fetch inventory for gap detection
  const inventoryRows = await db.execute(sql`
    SELECT id, name, canonical_name, quantity_owned, status, size_label
    FROM equipment_items
    WHERE chef_id = ${chefId} AND status NOT IN ('retired')
  `)

  // Check same-day events for double-booking
  const eventRows = await db.execute(sql`
    SELECT e2.id as event_id
    FROM events e1
    JOIN events e2 ON e2.event_date = e1.event_date
      AND e2.tenant_id = e1.tenant_id
      AND e2.id != e1.id
    WHERE e1.id = ${eventId} AND e1.tenant_id = ${chefId}
  `)

  const gaps = detectGaps({
    event_id: eventId,
    chef_id: chefId,
    loadout_items: loadout.items,
    inventory: (inventoryRows as any[]).map((r: any) => ({
      id: r.id,
      name: r.name,
      canonical_name: r.canonical_name,
      quantity_owned: r.quantity_owned ?? 1,
      status: r.status,
      size_label: r.size_label,
    })),
    same_day_allocations: [], // Would need loadout data from same-day events
  })

  // Persist gaps (upsert: clear old, insert new)
  if (gaps.length > 0) {
    await db.execute(sql`
      DELETE FROM event_equipment_gaps
      WHERE event_id = ${eventId} AND chef_id = ${chefId}
    `)

    for (const gap of gaps) {
      await db.execute(sql`
        INSERT INTO event_equipment_gaps (
          event_id, chef_id, equipment_name, equipment_category,
          gap_type, severity, quantity_needed, quantity_available,
          used_for, status
        ) VALUES (
          ${gap.event_id}, ${gap.chef_id}, ${gap.equipment_name},
          ${gap.equipment_category}, ${gap.gap_type}, ${gap.severity},
          ${gap.quantity_needed}, ${gap.quantity_available},
          ${gap.used_for}, ${gap.status}
        )
      `)
    }
  }

  revalidatePath(`/events/${eventId}`)
  return gaps
}

/**
 * Resolve an equipment gap.
 */
export async function resolveGap(gapId: string, resolution: string, note?: string): Promise<void> {
  const user = await requireChef()

  await db.execute(sql`
    UPDATE event_equipment_gaps
    SET status = ${resolution},
        resolution_note = ${note ?? null},
        resolved_at = now()
    WHERE id = ${gapId} AND chef_id = ${user.tenantId!}
  `)
}

/**
 * Get open gaps for an event.
 */
export async function getEventGaps(eventId: string): Promise<EquipmentGap[]> {
  const user = await requireChef()

  const rows = await db.execute(sql`
    SELECT * FROM event_equipment_gaps
    WHERE event_id = ${eventId}
      AND chef_id = ${user.tenantId!}
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'important' THEN 1
        WHEN 'nice_to_have' THEN 2
      END,
      detected_at
  `)

  return rows as any as EquipmentGap[]
}

/**
 * Get all open gaps across all events for a chef.
 */
export async function getAllOpenGaps(): Promise<(EquipmentGap & { event_name?: string })[]> {
  const user = await requireChef()

  const rows = await db.execute(sql`
    SELECT g.*, e.title as event_name
    FROM event_equipment_gaps g
    JOIN events e ON e.id = g.event_id
    WHERE g.chef_id = ${user.tenantId!}
      AND g.status IN ('open', 'pending_procurement', 'pending_repair')
    ORDER BY e.event_date, g.severity
  `)

  return rows as any[]
}
