// Storage Location Server Actions
// Chef-only: Manage storage locations, set defaults, and transfer inventory between locations.
// Transfers create two linked inventory_transactions (transfer_out + transfer_in).

'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────

export type StorageLocationType =
  | 'home_fridge'
  | 'home_freezer'
  | 'home_pantry'
  | 'home_dry_storage'
  | 'walk_in_cooler'
  | 'walk_in_freezer'
  | 'commercial_kitchen'
  | 'vehicle'
  | 'event_site'
  | 'other'

export type TemperatureZone = 'ambient' | 'refrigerated' | 'frozen'

export type StorageLocation = {
  id: string
  chefId: string
  name: string
  locationType: StorageLocationType
  address: string | null
  temperatureZone: TemperatureZone | null
  notes: string | null
  isDefault: boolean
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const LocationTypeEnum = z.enum([
  'home_fridge',
  'home_freezer',
  'home_pantry',
  'home_dry_storage',
  'walk_in_cooler',
  'walk_in_freezer',
  'commercial_kitchen',
  'vehicle',
  'event_site',
  'other',
])

const TemperatureZoneEnum = z.enum(['ambient', 'refrigerated', 'frozen'])

const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  locationType: LocationTypeEnum,
  address: z.string().optional(),
  temperatureZone: TemperatureZoneEnum.optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().optional(),
})

const UpdateLocationSchema = z.object({
  name: z.string().min(1).optional(),
  locationType: LocationTypeEnum.optional(),
  address: z.string().optional().nullable(),
  temperatureZone: TemperatureZoneEnum.optional().nullable(),
  notes: z.string().optional().nullable(),
  isDefault: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

const TransferInventorySchema = z.object({
  ingredientId: z.string().uuid().optional(),
  ingredientName: z.string().min(1, 'Ingredient name is required'),
  fromLocationId: z.string().uuid('Source location is required'),
  toLocationId: z.string().uuid('Destination location is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  notes: z.string().optional(),
})

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>
export type TransferInventoryInput = z.infer<typeof TransferInventorySchema>

// ─── Actions ─────────────────────────────────────────────────────

/**
 * Create a new storage location.
 * If isDefault is true, unsets the current default first (unique index enforces one default per chef).
 */
export async function createStorageLocation(input: CreateLocationInput): Promise<StorageLocation> {
  const user = await requireChef()
  const parsed = CreateLocationSchema.parse(input)
  const supabase = createServerClient()

  // If this should be the default, unset any existing default first
  if (parsed.isDefault) {
    await supabase
      .from('storage_locations' as any)
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  const { data, error } = await supabase
    .from('storage_locations' as any)
    .insert({
      chef_id: user.tenantId!,
      name: parsed.name,
      location_type: parsed.locationType,
      address: parsed.address ?? null,
      temperature_zone: parsed.temperatureZone ?? null,
      notes: parsed.notes ?? null,
      is_default: parsed.isDefault ?? false,
    })
    .select()
    .single()

  if (error) throw new Error(`Failed to create storage location: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/locations')

  return mapLocation(data)
}

/**
 * Update an existing storage location.
 * If setting as default, unsets others first.
 */
export async function updateStorageLocation(
  id: string,
  input: UpdateLocationInput
): Promise<StorageLocation> {
  const user = await requireChef()
  const parsed = UpdateLocationSchema.parse(input)
  const supabase = createServerClient()

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('storage_locations' as any)
    .select('id')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) throw new Error('Storage location not found')

  // If setting as default, unset current default
  if (parsed.isDefault === true) {
    await supabase
      .from('storage_locations' as any)
      .update({ is_default: false })
      .eq('chef_id', user.tenantId!)
      .eq('is_default', true)
  }

  // Build the update payload — only include fields that were provided
  const updatePayload: Record<string, any> = {}
  if (parsed.name !== undefined) updatePayload.name = parsed.name
  if (parsed.locationType !== undefined) updatePayload.location_type = parsed.locationType
  if (parsed.address !== undefined) updatePayload.address = parsed.address
  if (parsed.temperatureZone !== undefined) updatePayload.temperature_zone = parsed.temperatureZone
  if (parsed.notes !== undefined) updatePayload.notes = parsed.notes
  if (parsed.isDefault !== undefined) updatePayload.is_default = parsed.isDefault
  if (parsed.sortOrder !== undefined) updatePayload.sort_order = parsed.sortOrder

  const { data, error } = await supabase
    .from('storage_locations' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(`Failed to update storage location: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/locations')

  return mapLocation(data)
}

/**
 * Soft-delete a storage location by setting is_active = false.
 * Does not remove data — transactions referencing this location keep their location_id.
 */
export async function deleteStorageLocation(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('storage_locations' as any)
    .update({ is_active: false, is_default: false })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to delete storage location: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/locations')
}

/**
 * Get all active storage locations for the current chef, ordered by sort_order.
 */
export async function getStorageLocations(): Promise<StorageLocation[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('storage_locations' as any)
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (error) throw new Error(`Failed to fetch storage locations: ${error.message}`)

  return (data || []).map(mapLocation)
}

/**
 * Set a specific location as the default (unsets all others).
 */
export async function setDefaultLocation(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('storage_locations' as any)
    .select('id')
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .single()

  if (fetchError || !existing) throw new Error('Storage location not found')

  // Unset all defaults
  await supabase
    .from('storage_locations' as any)
    .update({ is_default: false })
    .eq('chef_id', user.tenantId!)
    .eq('is_default', true)

  // Set the new default
  const { error } = await supabase
    .from('storage_locations' as any)
    .update({ is_default: true })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error(`Failed to set default location: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/locations')
}

/**
 * Transfer inventory between two storage locations.
 * Creates two linked inventory_transactions:
 *   1. transfer_out (negative quantity) at the source location
 *   2. transfer_in  (positive quantity) at the destination location
 * Both share a transfer_pair_id for traceability.
 */
export async function transferInventory(
  input: TransferInventoryInput
): Promise<{ transferPairId: string }> {
  const user = await requireChef()
  const parsed = TransferInventorySchema.parse(input)
  const supabase = createServerClient()

  if (parsed.fromLocationId === parsed.toLocationId) {
    throw new Error('Source and destination locations must be different')
  }

  // Generate a shared transfer_pair_id to link the two transactions
  const transferPairId = crypto.randomUUID()

  // Insert both transactions together
  const { error } = await supabase.from('inventory_transactions' as any).insert([
    {
      chef_id: user.tenantId!,
      ingredient_id: parsed.ingredientId ?? null,
      ingredient_name: parsed.ingredientName,
      transaction_type: 'transfer_out',
      quantity: -Math.abs(parsed.quantity), // Negative = removing from source
      unit: parsed.unit,
      location_id: parsed.fromLocationId,
      transfer_pair_id: transferPairId,
      notes: parsed.notes ?? null,
      created_by: user.id,
    },
    {
      chef_id: user.tenantId!,
      ingredient_id: parsed.ingredientId ?? null,
      ingredient_name: parsed.ingredientName,
      transaction_type: 'transfer_in',
      quantity: Math.abs(parsed.quantity), // Positive = adding to destination
      unit: parsed.unit,
      location_id: parsed.toLocationId,
      transfer_pair_id: transferPairId,
      notes: parsed.notes ?? null,
      created_by: user.id,
    },
  ])

  if (error) throw new Error(`Failed to transfer inventory: ${error.message}`)

  revalidatePath('/inventory')
  revalidatePath('/inventory/locations')

  return { transferPairId }
}

// ─── Helpers ─────────────────────────────────────────────────────

function mapLocation(row: any): StorageLocation {
  return {
    id: row.id,
    chefId: row.chef_id,
    name: row.name,
    locationType: row.location_type,
    address: row.address,
    temperatureZone: row.temperature_zone,
    notes: row.notes,
    isDefault: row.is_default,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
