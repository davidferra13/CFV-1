'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────

export type LocationType =
  | 'kitchen'
  | 'storefront'
  | 'truck'
  | 'commissary'
  | 'warehouse'
  | 'office'

export interface BusinessLocation {
  id: string
  tenantId: string
  name: string
  address: string | null
  locationType: LocationType
  isPrimary: boolean
  isActive: boolean
  timezone: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface LocationInput {
  name: string
  address?: string | null
  locationType: LocationType
  isPrimary?: boolean
  isActive?: boolean
  timezone?: string | null
  notes?: string | null
}

export interface LocationStats {
  locationId: string
  locationName: string
  staffCount: number
  inventoryValueCents: number
  recentSalesCount: number
}

// ── Helpers ───────────────────────────────────────────────────────

function mapRow(row: any): BusinessLocation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    address: row.address,
    locationType: row.location_type,
    isPrimary: row.is_primary,
    isActive: row.is_active,
    timezone: row.timezone,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ── CRUD ──────────────────────────────────────────────────────────

export async function createLocation(
  data: LocationInput
): Promise<{ success: boolean; location?: BusinessLocation; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // If marking as primary, clear other primaries first
    if (data.isPrimary) {
      await supabase
        .from('business_locations')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true)
    }

    const { data: row, error } = await supabase
      .from('business_locations')
      .insert({
        tenant_id: tenantId,
        name: data.name,
        address: data.address || null,
        location_type: data.locationType,
        is_primary: data.isPrimary ?? false,
        is_active: data.isActive ?? true,
        timezone: data.timezone || null,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, location: mapRow(row) }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create location' }
  }
}

export async function updateLocation(
  id: string,
  data: Partial<LocationInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // If setting as primary, clear others first
    if (data.isPrimary) {
      await supabase
        .from('business_locations')
        .update({ is_primary: false })
        .eq('tenant_id', tenantId)
        .eq('is_primary', true)
    }

    const updates: Record<string, any> = {}
    if (data.name !== undefined) updates.name = data.name
    if (data.address !== undefined) updates.address = data.address
    if (data.locationType !== undefined) updates.location_type = data.locationType
    if (data.isPrimary !== undefined) updates.is_primary = data.isPrimary
    if (data.isActive !== undefined) updates.is_active = data.isActive
    if (data.timezone !== undefined) updates.timezone = data.timezone
    if (data.notes !== undefined) updates.notes = data.notes

    const { error } = await supabase
      .from('business_locations')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update location' }
  }
}

export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // Soft delete: deactivate rather than remove (data references may exist)
    const { error } = await supabase
      .from('business_locations')
      .update({ is_active: false })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to deactivate location' }
  }
}

// ── Queries ───────────────────────────────────────────────────────

export async function getLocations(): Promise<BusinessLocation[]> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('business_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('is_primary', { ascending: false })
      .order('name', { ascending: true })

    if (error) return []
    return (data || []).map(mapRow)
  } catch {
    return []
  }
}

export async function getPrimaryLocation(): Promise<BusinessLocation | null> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('business_locations')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('is_primary', true)
      .single()

    if (error || !data) return null
    return mapRow(data)
  } catch {
    return null
  }
}

export async function getActiveLocation(): Promise<BusinessLocation | null> {
  // For now, return the primary location. In the future this could be stored
  // in a user preference or cookie for per-session location switching.
  return getPrimaryLocation()
}

export async function setActiveLocation(
  _locationId: string
): Promise<{ success: boolean; error?: string }> {
  // Placeholder: in a future iteration, this would persist the user's
  // currently selected working location to a preferences table or cookie.
  // For now, location context is determined by the primary location.
  return { success: true }
}

export async function getLocationStats(locationId: string): Promise<LocationStats | null> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // Get location name
    const { data: loc } = await supabase
      .from('business_locations')
      .select('name')
      .eq('id', locationId)
      .eq('tenant_id', tenantId)
      .single()

    if (!loc) return null

    // Count staff at this location
    const { count: staffCount } = await supabase
      .from('staff_members')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', tenantId)
      .eq('location_id', locationId)

    // Sum inventory value at this location
    const { data: invData } = await supabase
      .from('inventory_lots')
      .select('quantity, cost_per_unit_cents')
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .in('status', ['available', 'partially_used'])

    let inventoryValueCents = 0
    if (invData) {
      for (const row of invData) {
        if (row.cost_per_unit_cents) {
          inventoryValueCents += row.cost_per_unit_cents * Number(row.quantity)
        }
      }
    }

    // Count recent sales (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const { count: salesCount } = await supabase
      .from('sales')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('location_id', locationId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    return {
      locationId,
      locationName: loc.name,
      staffCount: staffCount || 0,
      inventoryValueCents: Math.round(inventoryValueCents),
      recentSalesCount: salesCount || 0,
    }
  } catch {
    return null
  }
}

export async function getLocationComparison(): Promise<LocationStats[]> {
  try {
    const locations = await getLocations()
    const activeLocations = locations.filter((l) => l.isActive)

    const stats: LocationStats[] = []
    for (const loc of activeLocations) {
      const s = await getLocationStats(loc.id)
      if (s) stats.push(s)
    }

    return stats
  } catch {
    return []
  }
}
