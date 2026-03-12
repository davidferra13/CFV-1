'use server'

import { addDays, format, isBefore } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import {
  EQUIPMENT_ASSET_STATES,
  EQUIPMENT_CATEGORIES,
  EQUIPMENT_SOURCE_KINDS,
} from '@/lib/equipment/constants'
import { isMissingEquipmentSourcingColumn } from '@/lib/equipment/schema-compat'
import { createServerClient } from '@/lib/supabase/server'

const CreateEquipmentSchema = z.object({
  name: z.string().min(1, 'Name required'),
  category: z.enum(EQUIPMENT_CATEGORIES).default('other'),
  purchase_date: z.string().nullable().optional(),
  purchase_price_cents: z.number().int().min(0).nullable().optional(),
  current_value_cents: z.number().int().min(0).nullable().optional(),
  serial_number: z.string().nullable().optional(),
  notes: z.string().optional(),
  maintenance_interval_days: z.number().int().positive().nullable().optional(),
  canonical_name: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  asset_state: z.enum(EQUIPMENT_ASSET_STATES).default('owned'),
  quantity_owned: z.number().int().positive().default(1),
  storage_location: z.string().nullable().optional(),
  source_name: z.string().nullable().optional(),
  source_kind: z.enum(EQUIPMENT_SOURCE_KINDS).nullable().optional(),
  source_url: z.string().url('Enter a valid URL').nullable().optional(),
  source_sku: z.string().nullable().optional(),
  source_price_cents: z.number().int().min(0).nullable().optional(),
  source_last_verified_at: z.string().datetime().nullable().optional(),
})

const UpdateEquipmentSchema = CreateEquipmentSchema.partial()

const RentalSchema = z.object({
  equipment_name: z.string().min(1, 'Item name required'),
  vendor_name: z.string().nullable().optional(),
  rental_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  return_date: z.string().nullable().optional(),
  cost_cents: z.number().int().min(0),
  event_id: z.string().uuid().nullable().optional(),
  notes: z.string().optional(),
})

export type CreateEquipmentInput = z.infer<typeof CreateEquipmentSchema>
export type RentalInput = z.infer<typeof RentalSchema>

type EquipmentAsset = {
  id: string
  name: string
  category: string
  purchase_date: string | null
  purchase_price_cents: number | null
  current_value_cents: number | null
  serial_number: string | null
  notes: string | null
  maintenance_interval_days: number | null
  last_maintained_at: string | null
  status: string
  canonical_name?: string | null
  brand?: string | null
  model?: string | null
  asset_state?: string | null
  quantity_owned?: number | null
  storage_location?: string | null
  source_name?: string | null
  source_kind?: string | null
  source_url?: string | null
  source_sku?: string | null
  source_price_cents?: number | null
  source_last_verified_at?: string | null
}

type EquipmentAssetSummary = {
  totalActive: number
  ownedCount: number
  wishlistCount: number
  referenceCount: number
  sourcedCount: number
  maintenanceDueCount: number
}

const LEGACY_FIELDS = [
  'name',
  'category',
  'purchase_date',
  'purchase_price_cents',
  'current_value_cents',
  'serial_number',
  'notes',
  'maintenance_interval_days',
] as const

const MIGRATION_REQUIRED_MESSAGE =
  'Apply the latest equipment asset migration before saving asset states or source links.'

function compactObject<T extends Record<string, unknown>>(input: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(input).filter(([, value]) => value !== undefined)
  ) as Partial<T>
}

function buildEquipmentPayload(input: Partial<CreateEquipmentInput>) {
  const hasSourceData =
    input.source_name != null ||
    input.source_kind != null ||
    input.source_url != null ||
    input.source_sku != null ||
    input.source_price_cents != null

  return compactObject({
    ...input,
    source_last_verified_at: hasSourceData
      ? (input.source_last_verified_at ?? new Date().toISOString())
      : input.source_last_verified_at,
  })
}

function buildLegacyEquipmentPayload(input: Partial<CreateEquipmentInput>) {
  const entries = LEGACY_FIELDS.flatMap((field) => {
    const value = input[field]
    return value === undefined ? [] : [[field, value] as const]
  })

  return Object.fromEntries(entries)
}

function requiresEquipmentAssetMigration(input: Partial<CreateEquipmentInput>) {
  return Boolean(
    (input.asset_state != null && input.asset_state !== 'owned') ||
    input.canonical_name != null ||
    input.brand != null ||
    input.model != null ||
    (input.quantity_owned != null && input.quantity_owned !== 1) ||
    input.storage_location != null ||
    input.source_name != null ||
    input.source_kind != null ||
    input.source_url != null ||
    input.source_sku != null ||
    input.source_price_cents != null ||
    input.source_last_verified_at != null
  )
}

function isOwnedAsset(item: EquipmentAsset) {
  return (item.asset_state ?? 'owned') === 'owned'
}

function isMaintenanceOverdue(item: EquipmentAsset) {
  if (!isOwnedAsset(item) || !item.maintenance_interval_days) return false
  if (!item.last_maintained_at) return true
  const nextDue = addDays(new Date(item.last_maintained_at), item.maintenance_interval_days)
  return isBefore(nextDue, new Date())
}

function getAssetState(item: EquipmentAsset) {
  return item.asset_state ?? 'owned'
}

function revalidateEquipmentPaths() {
  revalidatePath('/operations')
  revalidatePath('/operations/equipment')
  revalidatePath('/finance/tax/depreciation')
}

export async function createEquipmentItem(input: CreateEquipmentInput) {
  const user = await requireChef()
  const validated = CreateEquipmentSchema.parse(input)
  const supabase: any = createServerClient()
  const payload = { chef_id: user.tenantId!, ...buildEquipmentPayload(validated) }

  const { data, error } = await supabase.from('equipment_items').insert(payload).select().single()

  if (error) {
    if (isMissingEquipmentSourcingColumn(error)) {
      if (requiresEquipmentAssetMigration(validated)) {
        throw new Error(MIGRATION_REQUIRED_MESSAGE)
      }

      const fallback = await supabase
        .from('equipment_items')
        .insert({ chef_id: user.tenantId!, ...buildLegacyEquipmentPayload(validated) })
        .select()
        .single()

      if (fallback.error) throw new Error('Failed to add equipment item')
      revalidateEquipmentPaths()
      return fallback.data
    }

    throw new Error('Failed to add equipment item')
  }

  revalidateEquipmentPaths()
  return data
}

export async function updateEquipmentItem(id: string, input: Partial<CreateEquipmentInput>) {
  const user = await requireChef()
  const validated = UpdateEquipmentSchema.parse(input)
  const supabase: any = createServerClient()
  const payload = buildEquipmentPayload(validated)

  const { data, error } = await supabase
    .from('equipment_items')
    .update(payload)
    .eq('id', id)
    .eq('chef_id', user.tenantId!)
    .select()
    .single()

  if (error) {
    if (isMissingEquipmentSourcingColumn(error)) {
      if (requiresEquipmentAssetMigration(validated)) {
        throw new Error(MIGRATION_REQUIRED_MESSAGE)
      }

      const fallback = await supabase
        .from('equipment_items')
        .update(buildLegacyEquipmentPayload(validated))
        .eq('id', id)
        .eq('chef_id', user.tenantId!)
        .select()
        .single()

      if (fallback.error) throw new Error('Failed to update equipment item')
      revalidateEquipmentPaths()
      return fallback.data
    }

    throw new Error('Failed to update equipment item')
  }

  revalidateEquipmentPaths()
  return data
}

export async function retireEquipmentItem(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { error } = await supabase
    .from('equipment_items')
    .update({ status: 'retired' })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to retire equipment item')
  revalidateEquipmentPaths()
}

export async function logMaintenance(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const today = format(new Date(), 'yyyy-MM-dd')

  const { error } = await supabase
    .from('equipment_items')
    .update({ last_maintained_at: today })
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to log maintenance')
  revalidateEquipmentPaths()
}

export async function listEquipment(category?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('equipment_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .order('category')
    .order('name')

  if (category) query = query.eq('category', category)

  const { data, error } = await query
  if (error) throw new Error('Failed to load equipment')

  return (data ?? []).filter((item: EquipmentAsset) => isOwnedAsset(item))
}

export async function listEquipmentAssets(assetState?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('equipment_items')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'owned')
    .order('category')
    .order('name')

  if (error) throw new Error('Failed to load equipment assets')

  const assets = (data ?? []).map((item: EquipmentAsset) => ({
    ...item,
    asset_state: getAssetState(item),
    quantity_owned: item.quantity_owned ?? 1,
  }))

  return assetState ? assets.filter((item) => item.asset_state === assetState) : assets
}

export async function getEquipmentDueForMaintenance() {
  const assets = await listEquipmentAssets('owned')
  return assets.filter((item) => isMaintenanceOverdue(item))
}

export async function getEquipmentAssetSummary(): Promise<EquipmentAssetSummary> {
  const assets = await listEquipmentAssets()

  return {
    totalActive: assets.length,
    ownedCount: assets.filter((item) => item.asset_state === 'owned').length,
    wishlistCount: assets.filter((item) => item.asset_state === 'wishlist').length,
    referenceCount: assets.filter((item) => item.asset_state === 'reference').length,
    sourcedCount: assets.filter((item) => Boolean(item.source_url)).length,
    maintenanceDueCount: assets.filter((item) => isMaintenanceOverdue(item)).length,
  }
}

export async function logRental(input: RentalInput) {
  const user = await requireChef()
  const validated = RentalSchema.parse(input)
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('equipment_rentals')
    .insert({ chef_id: user.tenantId!, ...validated })
    .select()
    .single()

  if (error) throw new Error('Failed to log rental')
  revalidateEquipmentPaths()
  if (validated.event_id) revalidatePath(`/events/${validated.event_id}`)
  return data
}

export async function deleteRental(id: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const { error } = await supabase
    .from('equipment_rentals')
    .delete()
    .eq('id', id)
    .eq('chef_id', user.tenantId!)

  if (error) throw new Error('Failed to delete rental')
  revalidateEquipmentPaths()
}

export async function getRentalCostForEvent(eventId: string): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('equipment_rentals')
    .select('cost_cents')
    .eq('chef_id', user.tenantId!)
    .eq('event_id', eventId)

  return (data ?? []).reduce((sum: number, rental: { cost_cents?: number | null }) => {
    return sum + (rental.cost_cents ?? 0)
  }, 0)
}

export async function listRentals(eventId?: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let query = supabase
    .from('equipment_rentals')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .order('rental_date', { ascending: false })

  if (eventId) query = query.eq('event_id', eventId)

  const { data, error } = await query
  if (error) throw new Error('Failed to load rentals')
  return data ?? []
}
