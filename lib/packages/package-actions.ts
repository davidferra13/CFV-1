'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  calculateDynamicPrice,
  getSeasonalMultiplier,
  type AddOn,
  type SeasonalPricing,
  type PriceBreakdown,
} from './pricing-calculator'

// ── Types ──────────────────────────────────────────────────────────────────

export type ExperiencePackageRow = {
  id: string
  tenant_id: string
  name: string
  description: string | null
  package_type: string
  base_price_cents: number
  includes: string[]
  add_ons: AddOn[]
  min_guests: number
  max_guests: number | null
  duration_hours: number | null
  cuisine_types: string[] | null
  menu_id: string | null
  is_active: boolean
  seasonal_pricing: SeasonalPricing | null
  sort_order: number
  created_at: string
  updated_at: string
}

export type CreatePackageInput = {
  name: string
  description?: string
  package_type: string
  base_price_cents: number
  includes?: string[]
  add_ons?: AddOn[]
  min_guests?: number
  max_guests?: number
  duration_hours?: number
  cuisine_types?: string[]
  menu_id?: string
  seasonal_pricing?: SeasonalPricing
}

export type UpdatePackageInput = Partial<CreatePackageInput> & {
  is_active?: boolean
  sort_order?: number
}

export type PackageListOptions = {
  activeOnly?: boolean
  packageType?: string
}

export type CalculatePriceInput = {
  guestCount: number
  date: string
  selectedAddOnNames?: string[]
}

// ── Chef Actions ───────────────────────────────────────────────────────────

export async function createPackage(data: CreatePackageInput): Promise<ExperiencePackageRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: row, error } = await supabase
    .from('experience_packages' as any)
    .insert({
      tenant_id: tenantId,
      name: data.name,
      description: data.description ?? null,
      package_type: data.package_type,
      base_price_cents: data.base_price_cents,
      includes: data.includes ?? [],
      add_ons: data.add_ons ?? [],
      min_guests: data.min_guests ?? 1,
      max_guests: data.max_guests ?? null,
      duration_hours: data.duration_hours ?? null,
      cuisine_types: data.cuisine_types ?? null,
      menu_id: data.menu_id ?? null,
      seasonal_pricing: data.seasonal_pricing ?? null,
    })
    .select('*')
    .single()

  if (error) {
    console.error('[createPackage] Error:', error)
    throw new Error('Failed to create package')
  }

  revalidatePath('/packages')
  return row as ExperiencePackageRow
}

export async function updatePackage(
  id: string,
  data: UpdatePackageInput
): Promise<ExperiencePackageRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (data.name !== undefined) updatePayload.name = data.name
  if (data.description !== undefined) updatePayload.description = data.description
  if (data.package_type !== undefined) updatePayload.package_type = data.package_type
  if (data.base_price_cents !== undefined) updatePayload.base_price_cents = data.base_price_cents
  if (data.includes !== undefined) updatePayload.includes = data.includes
  if (data.add_ons !== undefined) updatePayload.add_ons = data.add_ons
  if (data.min_guests !== undefined) updatePayload.min_guests = data.min_guests
  if (data.max_guests !== undefined) updatePayload.max_guests = data.max_guests
  if (data.duration_hours !== undefined) updatePayload.duration_hours = data.duration_hours
  if (data.cuisine_types !== undefined) updatePayload.cuisine_types = data.cuisine_types
  if (data.menu_id !== undefined) updatePayload.menu_id = data.menu_id
  if (data.seasonal_pricing !== undefined) updatePayload.seasonal_pricing = data.seasonal_pricing
  if (data.is_active !== undefined) updatePayload.is_active = data.is_active
  if (data.sort_order !== undefined) updatePayload.sort_order = data.sort_order

  const { data: row, error } = await supabase
    .from('experience_packages' as any)
    .update(updatePayload)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('[updatePackage] Error:', error)
    throw new Error('Failed to update package')
  }

  revalidatePath('/packages')
  return row as ExperiencePackageRow
}

/**
 * Soft delete: sets is_active = false instead of removing the row.
 */
export async function deletePackage(id: string): Promise<void> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase
    .from('experience_packages' as any)
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[deletePackage] Error:', error)
    throw new Error('Failed to delete package')
  }

  revalidatePath('/packages')
}

export async function getPackages(options?: PackageListOptions): Promise<ExperiencePackageRow[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  let query = supabase
    .from('experience_packages' as any)
    .select('*')
    .eq('tenant_id', tenantId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (options?.activeOnly) {
    query = query.eq('is_active', true)
  }
  if (options?.packageType) {
    query = query.eq('package_type', options.packageType)
  }

  const { data, error } = await query

  if (error) {
    console.error('[getPackages] Error:', error)
    throw new Error('Failed to load packages')
  }

  return (data ?? []) as ExperiencePackageRow[]
}

export async function getPackageDetail(id: string): Promise<ExperiencePackageRow> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: row, error } = await supabase
    .from('experience_packages' as any)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) {
    console.error('[getPackageDetail] Error:', error)
    throw new Error('Failed to load package')
  }

  return row as ExperiencePackageRow
}

/**
 * Calculate the dynamic price for a package given guest count, date, and selected add-ons.
 * Uses deterministic math (Formula > AI).
 */
export async function calculatePackagePrice(
  id: string,
  options: CalculatePriceInput
): Promise<PriceBreakdown> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data: pkg, error } = await supabase
    .from('experience_packages' as any)
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .single()

  if (error || !pkg) {
    console.error('[calculatePackagePrice] Error:', error)
    throw new Error('Package not found')
  }

  const allAddOns: AddOn[] = (pkg as any).add_ons ?? []
  const selectedAddOns = options.selectedAddOnNames
    ? allAddOns.filter((a) => options.selectedAddOnNames!.includes(a.name))
    : []

  return calculateDynamicPrice(
    (pkg as any).base_price_cents,
    options.guestCount,
    new Date(options.date),
    selectedAddOns,
    (pkg as any).seasonal_pricing
  )
}

// ── Public Actions (no auth) ───────────────────────────────────────────────

/**
 * Public listing of active packages for a chef. No auth required.
 * Used for client-facing package browsing.
 */
export async function getPublicPackages(chefId: string): Promise<ExperiencePackageRow[]> {
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('experience_packages' as any)
    .select('*')
    .eq('tenant_id', chefId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('[getPublicPackages] Error:', error)
    throw new Error('Failed to load packages')
  }

  return (data ?? []) as ExperiencePackageRow[]
}
