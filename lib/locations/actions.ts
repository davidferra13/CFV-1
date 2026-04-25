// Multi-Location Management Server Actions
// CRUD for business locations with operational extensions.
// Locations are the organizational unit for multi-site operators.

'use server'

import { z } from 'zod'
import { revalidatePath, revalidateTag } from 'next/cache'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

// ─── Types ───────────────────────────────────────────────────────

export type LocationType =
  | 'kitchen'
  | 'storefront'
  | 'truck'
  | 'commissary'
  | 'warehouse'
  | 'office'

export type BusinessLocation = {
  id: string
  tenantId: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  locationType: LocationType
  isPrimary: boolean
  isActive: boolean
  timezone: string | null
  phone: string | null
  email: string | null
  capacityCovers: number | null
  managerName: string | null
  managerStaffId: string | null
  operatingHours: Record<string, unknown>
  dailyCoverTarget: number | null
  dailyRevenueTargetCents: number | null
  foodCostTargetPct: number | null
  laborCostTargetPct: number | null
  brandGroup: string | null
  sortOrder: number
  notes: string | null
  lat: number | null
  lng: number | null
  createdAt: string
  updatedAt: string
}

// ─── Schemas ─────────────────────────────────────────────────────

const LocationTypeEnum = z.enum([
  'kitchen',
  'storefront',
  'truck',
  'commissary',
  'warehouse',
  'office',
])

const CreateLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  locationType: LocationTypeEnum,
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  isPrimary: z.boolean().optional(),
  timezone: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  capacityCovers: z.number().int().positive().optional(),
  managerName: z.string().optional(),
  managerStaffId: z.string().uuid().optional(),
  operatingHours: z.record(z.string(), z.unknown()).optional(),
  dailyCoverTarget: z.number().int().positive().optional(),
  dailyRevenueTargetCents: z.number().int().positive().optional(),
  foodCostTargetPct: z.number().min(0).max(100).optional(),
  laborCostTargetPct: z.number().min(0).max(100).optional(),
  brandGroup: z.string().optional(),
  notes: z.string().optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
})

const UpdateLocationSchema = CreateLocationSchema.partial().extend({
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
})

export type CreateLocationInput = z.infer<typeof CreateLocationSchema>
export type UpdateLocationInput = z.infer<typeof UpdateLocationSchema>

// ─── Helpers ─────────────────────────────────────────────────────

function mapLocation(row: any): BusinessLocation {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    locationType: row.location_type,
    isPrimary: row.is_primary,
    isActive: row.is_active,
    timezone: row.timezone,
    phone: row.phone,
    email: row.email,
    capacityCovers: row.capacity_covers,
    managerName: row.manager_name,
    managerStaffId: row.manager_staff_id,
    operatingHours: row.operating_hours ?? {},
    dailyCoverTarget: row.daily_cover_target,
    dailyRevenueTargetCents: row.daily_revenue_target_cents,
    foodCostTargetPct: row.food_cost_target_pct ? Number(row.food_cost_target_pct) : null,
    laborCostTargetPct: row.labor_cost_target_pct ? Number(row.labor_cost_target_pct) : null,
    brandGroup: row.brand_group,
    sortOrder: row.sort_order ?? 0,
    notes: row.notes,
    lat: row.lat ? Number(row.lat) : null,
    lng: row.lng ? Number(row.lng) : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

// ─── CRUD ────────────────────────────────────────────────────────

export async function listLocations(): Promise<BusinessLocation[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('business_locations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to list locations: ${error.message}`)
  return (data ?? []).map(mapLocation)
}

export async function getLocation(id: string): Promise<BusinessLocation | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('business_locations')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (error) return null
  return mapLocation(data)
}

export async function createLocation(
  input: CreateLocationInput
): Promise<{ success: boolean; data?: BusinessLocation; error?: string }> {
  const user = await requireChef()
  const parsed = CreateLocationSchema.parse(input)
  const db: any = createServerClient()

  // If setting as primary, unset existing primary
  if (parsed.isPrimary) {
    await db
      .from('business_locations')
      .update({ is_primary: false })
      .eq('tenant_id', user.tenantId!)
      .eq('is_primary', true)
  }

  const { data, error } = await db
    .from('business_locations')
    .insert({
      tenant_id: user.tenantId!,
      name: parsed.name,
      location_type: parsed.locationType,
      address: parsed.address ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      zip: parsed.zip ?? null,
      is_primary: parsed.isPrimary ?? false,
      timezone: parsed.timezone ?? null,
      phone: parsed.phone ?? null,
      email: parsed.email || null,
      capacity_covers: parsed.capacityCovers ?? null,
      manager_name: parsed.managerName ?? null,
      manager_staff_id: parsed.managerStaffId ?? null,
      operating_hours: parsed.operatingHours ?? {},
      daily_cover_target: parsed.dailyCoverTarget ?? null,
      daily_revenue_target_cents: parsed.dailyRevenueTargetCents ?? null,
      food_cost_target_pct: parsed.foodCostTargetPct ?? null,
      labor_cost_target_pct: parsed.laborCostTargetPct ?? null,
      brand_group: parsed.brandGroup ?? null,
      notes: parsed.notes ?? null,
      lat: parsed.lat ?? null,
      lng: parsed.lng ?? null,
    })
    .select()
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations')
  revalidateTag('locations')
  return { success: true, data: mapLocation(data) }
}

export async function updateLocation(
  id: string,
  input: UpdateLocationInput
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const parsed = UpdateLocationSchema.parse(input)
  const db: any = createServerClient()

  // If setting as primary, unset existing primary
  if (parsed.isPrimary) {
    await db
      .from('business_locations')
      .update({ is_primary: false })
      .eq('tenant_id', user.tenantId!)
      .eq('is_primary', true)
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (parsed.name !== undefined) updates.name = parsed.name
  if (parsed.locationType !== undefined) updates.location_type = parsed.locationType
  if (parsed.address !== undefined) updates.address = parsed.address
  if (parsed.city !== undefined) updates.city = parsed.city
  if (parsed.state !== undefined) updates.state = parsed.state
  if (parsed.zip !== undefined) updates.zip = parsed.zip
  if (parsed.isPrimary !== undefined) updates.is_primary = parsed.isPrimary
  if (parsed.isActive !== undefined) updates.is_active = parsed.isActive
  if (parsed.timezone !== undefined) updates.timezone = parsed.timezone
  if (parsed.phone !== undefined) updates.phone = parsed.phone
  if (parsed.email !== undefined) updates.email = parsed.email || null
  if (parsed.capacityCovers !== undefined) updates.capacity_covers = parsed.capacityCovers
  if (parsed.managerName !== undefined) updates.manager_name = parsed.managerName
  if (parsed.managerStaffId !== undefined) updates.manager_staff_id = parsed.managerStaffId
  if (parsed.operatingHours !== undefined) updates.operating_hours = parsed.operatingHours
  if (parsed.dailyCoverTarget !== undefined) updates.daily_cover_target = parsed.dailyCoverTarget
  if (parsed.dailyRevenueTargetCents !== undefined)
    updates.daily_revenue_target_cents = parsed.dailyRevenueTargetCents
  if (parsed.foodCostTargetPct !== undefined)
    updates.food_cost_target_pct = parsed.foodCostTargetPct
  if (parsed.laborCostTargetPct !== undefined)
    updates.labor_cost_target_pct = parsed.laborCostTargetPct
  if (parsed.brandGroup !== undefined) updates.brand_group = parsed.brandGroup
  if (parsed.notes !== undefined) updates.notes = parsed.notes
  if (parsed.sortOrder !== undefined) updates.sort_order = parsed.sortOrder
  if (parsed.lat !== undefined) updates.lat = parsed.lat
  if (parsed.lng !== undefined) updates.lng = parsed.lng

  const { error } = await db
    .from('business_locations')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations')
  revalidatePath(`/locations/${id}`)
  revalidateTag('locations')
  return { success: true }
}

export async function deleteLocation(id: string): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Soft-delete: set is_active = false
  const { error } = await db
    .from('business_locations')
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) return { success: false, error: error.message }

  revalidatePath('/locations')
  revalidateTag('locations')
  return { success: true }
}

// ─── Multi-Location Aggregation ──────────────────────────────────

export type LocationSnapshot = {
  location: BusinessLocation
  todayMetrics: {
    covers: number
    revenue: number
    foodCostPct: number
    laborCostPct: number
    orders: number
    avgTicket: number
  } | null
  activeAlerts: number
  staffOnDuty: number
  inventoryHealth: 'good' | 'warning' | 'critical'
}

export async function getMultiLocationSnapshot(): Promise<LocationSnapshot[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const today = new Date().toISOString().split('T')[0]

  // Get all active locations
  const { data: locations } = await db
    .from('business_locations')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!locations?.length) return []

  const snapshots: LocationSnapshot[] = []

  for (const loc of locations) {
    // Today's metrics
    const { data: metrics } = await db
      .from('location_daily_metrics')
      .select('*')
      .eq('location_id', loc.id)
      .eq('date', today)
      .single()

    // Active alerts count
    const { count: alertCount } = await db
      .from('location_alerts')
      .select('id', { count: 'exact', head: true })
      .eq('location_id', loc.id)
      .is('resolved_at', null)

    // Staff on duty (clocked in, not clocked out)
    const { count: staffCount } = await db
      .from('staff_clock_entries')
      .select('id', { count: 'exact', head: true })
      .eq('chef_id', user.tenantId!)
      .is('clock_out_at', null)

    // Inventory health (items below par)
    const { data: belowPar } = await db
      .from('inventory_counts')
      .select('id')
      .eq('chef_id', user.tenantId!)
      .eq('location_id', loc.id)
      .lt('current_qty', 'par_level')

    const belowParCount = belowPar?.length ?? 0
    const inventoryHealth: LocationSnapshot['inventoryHealth'] =
      belowParCount === 0 ? 'good' : belowParCount <= 3 ? 'warning' : 'critical'

    snapshots.push({
      location: mapLocation(loc),
      todayMetrics: metrics
        ? {
            covers: metrics.covers_served ?? 0,
            revenue: metrics.revenue_cents ?? 0,
            foodCostPct: metrics.food_cost_pct ? Number(metrics.food_cost_pct) : 0,
            laborCostPct: metrics.labor_cost_pct ? Number(metrics.labor_cost_pct) : 0,
            orders: metrics.orders_count ?? 0,
            avgTicket: metrics.avg_ticket_cents ?? 0,
          }
        : null,
      activeAlerts: alertCount ?? 0,
      staffOnDuty: staffCount ?? 0,
      inventoryHealth,
    })
  }

  return snapshots
}

// ─── Location Financial Summary ──────────────────────────────────

export type LocationFinancialSummary = {
  locationId: string
  locationName: string
  totalRevenueCents: number
  totalRefundedCents: number
  totalTipsCents: number
  netRevenueCents: number
  totalExpensesCents: number
  profitCents: number
  totalSalesCount: number
  totalSalesCents: number
  laborCost30dCents: number
  inventoryReceived30dCents: number
}

export async function getLocationFinancials(): Promise<LocationFinancialSummary[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('location_financial_summary')
    .select('*')
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(`Failed to get location financials: ${error.message}`)

  return (data ?? []).map((row: any) => ({
    locationId: row.location_id,
    locationName: row.location_name,
    totalRevenueCents: Number(row.total_revenue_cents),
    totalRefundedCents: Number(row.total_refunded_cents),
    totalTipsCents: Number(row.total_tips_cents),
    netRevenueCents: Number(row.net_revenue_cents),
    totalExpensesCents: Number(row.total_expenses_cents),
    profitCents: Number(row.profit_cents),
    totalSalesCount: Number(row.total_sales_count),
    totalSalesCents: Number(row.total_sales_cents),
    laborCost30dCents: Number(row.labor_cost_30d_cents),
    inventoryReceived30dCents: Number(row.inventory_received_30d_cents),
  }))
}
