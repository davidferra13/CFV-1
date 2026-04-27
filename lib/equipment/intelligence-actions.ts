'use server'

/**
 * Equipment Intelligence CRUD - Server Actions
 * Extended actions for the equipment intelligence system.
 * Complements the existing actions.ts (which handles basic CRUD).
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { EquipmentStatus, EquipmentItem, EquipmentCategory } from './types'

// ============================================
// EQUIPMENT ITEMS (extended)
// ============================================

const VALID_STATUSES = [
  'active',
  'stored',
  'broken',
  'needs_replacement',
  'borrowed',
  'lent_out',
  'retired',
  'missing',
] as const

const CreateEquipmentExtendedSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z
    .enum([
      'cookware',
      'knives',
      'smallwares',
      'appliances',
      'serving',
      'transport',
      'linen',
      'other',
    ])
    .default('other'),
  category_id: z.number().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  canonical_name: z.string().nullable().optional(),
  material: z.string().nullable().optional(),
  size_label: z.string().nullable().optional(),
  size_value: z.number().nullable().optional(),
  size_unit: z.string().nullable().optional(),
  quantity_owned: z.number().int().min(1).default(1),
  status: z.enum(VALID_STATUSES).default('active'),
  purchase_price_cents: z.number().int().min(0).nullable().optional(),
  purchase_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(z.string()).nullable().optional(),
  photo_url: z.string().nullable().optional(),
  storage_location: z.string().nullable().optional(),
})

export type CreateEquipmentExtendedInput = z.infer<typeof CreateEquipmentExtendedSchema>

export async function createEquipmentItemExtended(input: CreateEquipmentExtendedInput) {
  const user = await requireChef()
  const v = CreateEquipmentExtendedSchema.parse(input)

  const rows = await db.execute(sql`
    INSERT INTO equipment_items (
      chef_id, name, category, category_id, brand, model, canonical_name,
      material, size_label, size_value, size_unit, quantity_owned, status,
      purchase_price_cents, purchase_date, notes, tags, photo_url,
      storage_location, item_source
    ) VALUES (
      ${user.tenantId!}, ${v.name}, ${v.category}, ${v.category_id ?? null},
      ${v.brand ?? null}, ${v.model ?? null}, ${v.canonical_name ?? null},
      ${v.material ?? null}, ${v.size_label ?? null}, ${v.size_value ?? null},
      ${v.size_unit ?? null}, ${v.quantity_owned}, ${v.status},
      ${v.purchase_price_cents ?? null}, ${v.purchase_date ?? null},
      ${v.notes ?? null}, ${v.tags ? sql`${v.tags}::text[]` : null},
      ${v.photo_url ?? null}, ${v.storage_location ?? null}, 'manual'
    )
    RETURNING *
  `)

  revalidatePath('/culinary/equipment')
  revalidatePath('/operations/equipment')
  return (rows as any)[0]
}

/**
 * Change equipment status with audit trail.
 */
export async function changeEquipmentStatus(
  equipmentId: string,
  newStatus: EquipmentStatus,
  trigger: 'manual' | 'event_usage' | 'staleness_check' | 'age_threshold' = 'manual',
  note?: string
) {
  const user = await requireChef()
  const chefId = user.tenantId!

  // Get current status
  const current = await db.execute(sql`
    SELECT status FROM equipment_items
    WHERE id = ${equipmentId} AND chef_id = ${chefId}
    LIMIT 1
  `)
  const oldStatus = (current as any)[0]?.status
  if (!oldStatus) throw new Error('Equipment not found')
  if (oldStatus === newStatus) return

  // Update status
  await db.execute(sql`
    UPDATE equipment_items
    SET status = ${newStatus},
        last_status_change_at = now(),
        borrowed_from = ${newStatus === 'borrowed' ? (note ?? null) : null},
        lent_to = ${newStatus === 'lent_out' ? (note ?? null) : null}
    WHERE id = ${equipmentId} AND chef_id = ${chefId}
  `)

  // Log status change
  await db.execute(sql`
    INSERT INTO equipment_status_log (equipment_id, chef_id, old_status, new_status, trigger, note)
    VALUES (${equipmentId}, ${chefId}, ${oldStatus}, ${newStatus}, ${trigger}, ${note ?? null})
  `)

  revalidatePath('/culinary/equipment')
  revalidatePath('/operations/equipment')
}

/**
 * Update equipment quantity (inline stepper).
 */
export async function updateEquipmentQuantity(equipmentId: string, quantity: number) {
  const user = await requireChef()
  if (quantity < 1) throw new Error('Quantity must be at least 1')

  await db.execute(sql`
    UPDATE equipment_items
    SET quantity_owned = ${quantity}
    WHERE id = ${equipmentId} AND chef_id = ${user.tenantId!}
  `)

  revalidatePath('/culinary/equipment')
}

/**
 * Confirm an inferred equipment item.
 */
export async function confirmInferredItem(equipmentId: string) {
  const user = await requireChef()

  await db.execute(sql`
    UPDATE equipment_items
    SET item_source = 'manual', confirmed_at = now(), confidence = 1.0
    WHERE id = ${equipmentId}
      AND chef_id = ${user.tenantId!}
      AND item_source = 'inferred'
  `)

  revalidatePath('/culinary/equipment')
}

/**
 * Dismiss an inferred equipment item (delete it).
 */
export async function dismissInferredItem(equipmentId: string) {
  const user = await requireChef()

  await db.execute(sql`
    DELETE FROM equipment_items
    WHERE id = ${equipmentId}
      AND chef_id = ${user.tenantId!}
      AND item_source = 'inferred'
      AND confirmed_at IS NULL
  `)

  revalidatePath('/culinary/equipment')
}

// ============================================
// CATEGORIES (read-only for UI)
// ============================================

/**
 * Get all equipment categories with hierarchy.
 */
export async function getEquipmentCategories(): Promise<EquipmentCategory[]> {
  const rows = await db.execute(sql`
    SELECT id, slug, name, parent_id, sort_order, icon
    FROM equipment_categories
    ORDER BY COALESCE(parent_id, id), sort_order
  `)
  return rows as any as EquipmentCategory[]
}

// ============================================
// EQUIPMENT LISTING (extended)
// ============================================

/**
 * List all equipment with full intelligence fields.
 */
export async function listEquipmentExtended(filters?: {
  status?: EquipmentStatus
  category?: string
  search?: string
}): Promise<EquipmentItem[]> {
  const user = await requireChef()
  const chefId = user.tenantId!

  let query = sql`
    SELECT ei.*, ec.slug as category_slug_resolved, ec.name as category_name_resolved
    FROM equipment_items ei
    LEFT JOIN equipment_categories ec ON ec.id = ei.category_id
    WHERE ei.chef_id = ${chefId}
  `

  if (filters?.status) {
    query = sql`${query} AND ei.status = ${filters.status}`
  } else {
    query = sql`${query} AND ei.status != 'retired'`
  }

  if (filters?.category) {
    query = sql`${query} AND ei.category::text = ${filters.category}`
  }

  if (filters?.search) {
    const searchTerm = `%${filters.search}%`
    query = sql`${query} AND (ei.name ILIKE ${searchTerm} OR ei.canonical_name ILIKE ${searchTerm} OR ei.brand ILIKE ${searchTerm})`
  }

  query = sql`${query} ORDER BY ei.category, ei.name`

  const rows = await db.execute(query)
  return rows as any as EquipmentItem[]
}

/**
 * Get single equipment item detail.
 */
export async function getEquipmentDetail(id: string): Promise<EquipmentItem | null> {
  const user = await requireChef()

  const rows = await db.execute(sql`
    SELECT ei.*, ec.slug as category_slug_resolved, ec.name as category_name_resolved
    FROM equipment_items ei
    LEFT JOIN equipment_categories ec ON ec.id = ei.category_id
    WHERE ei.id = ${id} AND ei.chef_id = ${user.tenantId!}
    LIMIT 1
  `)

  return (rows as any)[0] ?? null
}

/**
 * Get equipment status history.
 */
export async function getStatusHistory(equipmentId: string) {
  const user = await requireChef()

  const rows = await db.execute(sql`
    SELECT * FROM equipment_status_log
    WHERE equipment_id = ${equipmentId} AND chef_id = ${user.tenantId!}
    ORDER BY created_at DESC
    LIMIT 20
  `)

  return rows as any[]
}

/**
 * Get equipment usage timeline (events where this item was used).
 */
export async function getEquipmentUsageTimeline(equipmentId: string) {
  const user = await requireChef()

  // This uses the event_equipment_checklist if it exists
  try {
    const rows = await db.execute(sql`
      SELECT eec.event_id, e.title, e.event_date, eec.packed, eec.returned
      FROM event_equipment_checklist eec
      JOIN events e ON e.id = eec.event_id
      WHERE eec.name = (
        SELECT name FROM equipment_items WHERE id = ${equipmentId} AND chef_id = ${user.tenantId!}
      )
      AND e.tenant_id = ${user.tenantId!}
      ORDER BY e.event_date DESC
      LIMIT 10
    `)
    return rows as any[]
  } catch {
    return []
  }
}

// ============================================
// BULK OPERATIONS
// ============================================

/**
 * Bulk status change.
 */
export async function bulkChangeStatus(ids: string[], newStatus: EquipmentStatus) {
  const user = await requireChef()
  const chefId = user.tenantId!

  for (const id of ids) {
    await changeEquipmentStatus(id, newStatus, 'manual')
  }

  revalidatePath('/culinary/equipment')
}

/**
 * Bulk delete (only retired items).
 */
export async function bulkDeleteRetired(ids: string[]) {
  const user = await requireChef()

  for (const id of ids) {
    await db.execute(sql`
      DELETE FROM equipment_items
      WHERE id = ${id} AND chef_id = ${user.tenantId!} AND status = 'retired'
    `)
  }

  revalidatePath('/culinary/equipment')
}

/**
 * Get equipment inventory summary for dashboard.
 */
export async function getEquipmentSummary() {
  const user = await requireChef()

  const rows = await db.execute(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'active') as active_count,
      COUNT(*) FILTER (WHERE status = 'stored') as stored_count,
      COUNT(*) FILTER (WHERE status = 'broken' OR status = 'needs_replacement') as needs_attention,
      COUNT(*) FILTER (WHERE status = 'borrowed' OR status = 'lent_out') as loaned,
      COUNT(*) FILTER (WHERE item_source = 'inferred' AND confirmed_at IS NULL) as unconfirmed_inferences,
      COUNT(*) as total
    FROM equipment_items
    WHERE chef_id = ${user.tenantId!} AND status != 'retired'
  `)

  return (
    (rows as any)[0] ?? {
      active_count: 0,
      stored_count: 0,
      needs_attention: 0,
      loaned: 0,
      unconfirmed_inferences: 0,
      total: 0,
    }
  )
}
