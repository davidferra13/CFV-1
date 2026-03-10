'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ── Types ─────────────────────────────────────────────────────────

export interface InventoryLot {
  id: string
  tenantId: string
  ingredientName: string
  quantity: number
  unit: string
  receivedDate: string
  expiryDate: string | null
  shelfLifeDays: number | null
  storageLocation: string | null
  supplier: string | null
  lotNumber: string | null
  costPerUnitCents: number | null
  status: 'available' | 'partially_used' | 'consumed' | 'expired' | 'discarded'
  locationId: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
  // Computed
  daysUntilExpiry: number | null
  effectiveExpiryDate: string | null
}

export interface LotInput {
  ingredientName: string
  quantity: number
  unit: string
  receivedDate: string
  expiryDate?: string | null
  shelfLifeDays?: number | null
  storageLocation?: string | null
  supplier?: string | null
  lotNumber?: string | null
  costPerUnitCents?: number | null
  locationId?: string | null
  notes?: string | null
}

export interface ShelfLifeReport {
  totalActiveLots: number
  expiringSoon: number // within 3 days
  expired: number
  avgDaysUntilExpiry: number | null
  totalValueCents: number
}

// ── Helpers ───────────────────────────────────────────────────────

function computeEffectiveExpiry(
  receivedDate: string,
  expiryDate: string | null,
  shelfLifeDays: number | null
): string | null {
  if (expiryDate) return expiryDate
  if (shelfLifeDays && receivedDate) {
    const d = new Date(receivedDate)
    d.setDate(d.getDate() + shelfLifeDays)
    return d.toISOString().split('T')[0]
  }
  return null
}

function computeDaysUntilExpiry(effectiveExpiry: string | null): number | null {
  if (!effectiveExpiry) return null
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const exp = new Date(effectiveExpiry)
  exp.setHours(0, 0, 0, 0)
  return Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function mapRow(row: any): InventoryLot {
  const effectiveExpiry = computeEffectiveExpiry(
    row.received_date,
    row.expiry_date,
    row.shelf_life_days
  )
  return {
    id: row.id,
    tenantId: row.tenant_id,
    ingredientName: row.ingredient_name,
    quantity: Number(row.quantity),
    unit: row.unit,
    receivedDate: row.received_date,
    expiryDate: row.expiry_date,
    shelfLifeDays: row.shelf_life_days,
    storageLocation: row.storage_location,
    supplier: row.supplier,
    lotNumber: row.lot_number,
    costPerUnitCents: row.cost_per_unit_cents,
    status: row.status,
    locationId: row.location_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    daysUntilExpiry: computeDaysUntilExpiry(effectiveExpiry),
    effectiveExpiryDate: effectiveExpiry,
  }
}

// ── Actions ───────────────────────────────────────────────────────

export async function receiveLot(
  data: LotInput
): Promise<{ success: boolean; lot?: InventoryLot; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // If no expiry or shelf life provided, check defaults
    let shelfLifeDays = data.shelfLifeDays ?? null
    if (!data.expiryDate && !shelfLifeDays) {
      const { data: defaultRow } = await supabase
        .from('ingredient_shelf_life_defaults')
        .select('shelf_life_days')
        .eq('tenant_id', tenantId)
        .eq('ingredient_name', data.ingredientName)
        .single()
      if (defaultRow) shelfLifeDays = defaultRow.shelf_life_days
    }

    const { data: row, error } = await supabase
      .from('inventory_lots')
      .insert({
        tenant_id: tenantId,
        ingredient_name: data.ingredientName,
        quantity: data.quantity,
        unit: data.unit,
        received_date: data.receivedDate,
        expiry_date: data.expiryDate || null,
        shelf_life_days: shelfLifeDays,
        storage_location: data.storageLocation || null,
        supplier: data.supplier || null,
        lot_number: data.lotNumber || null,
        cost_per_unit_cents: data.costPerUnitCents ?? null,
        location_id: data.locationId || null,
        notes: data.notes || null,
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, lot: mapRow(row) }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to receive lot' }
  }
}

export async function updateLot(
  id: string,
  data: Partial<LotInput>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const updates: Record<string, any> = {}
    if (data.ingredientName !== undefined) updates.ingredient_name = data.ingredientName
    if (data.quantity !== undefined) updates.quantity = data.quantity
    if (data.unit !== undefined) updates.unit = data.unit
    if (data.receivedDate !== undefined) updates.received_date = data.receivedDate
    if (data.expiryDate !== undefined) updates.expiry_date = data.expiryDate
    if (data.shelfLifeDays !== undefined) updates.shelf_life_days = data.shelfLifeDays
    if (data.storageLocation !== undefined) updates.storage_location = data.storageLocation
    if (data.supplier !== undefined) updates.supplier = data.supplier
    if (data.lotNumber !== undefined) updates.lot_number = data.lotNumber
    if (data.costPerUnitCents !== undefined) updates.cost_per_unit_cents = data.costPerUnitCents
    if (data.locationId !== undefined) updates.location_id = data.locationId
    if (data.notes !== undefined) updates.notes = data.notes

    const { error } = await supabase
      .from('inventory_lots')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update lot' }
  }
}

export async function consumeLot(
  id: string,
  quantityUsed: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    // Fetch current lot
    const { data: lot, error: fetchError } = await supabase
      .from('inventory_lots')
      .select('quantity, status')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !lot) return { success: false, error: 'Lot not found' }
    if (lot.status === 'consumed' || lot.status === 'discarded') {
      return { success: false, error: 'Lot is already consumed or discarded' }
    }

    const currentQty = Number(lot.quantity)
    if (quantityUsed > currentQty) {
      return {
        success: false,
        error: `Cannot consume ${quantityUsed} from lot with ${currentQty} remaining`,
      }
    }

    const remaining = currentQty - quantityUsed
    const newStatus = remaining <= 0 ? 'consumed' : 'partially_used'

    const { error } = await supabase
      .from('inventory_lots')
      .update({ quantity: remaining, status: newStatus })
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to consume lot' }
  }
}

export async function discardLot(
  id: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const updates: Record<string, any> = { status: 'discarded' }
    if (reason) updates.notes = reason

    const { error } = await supabase
      .from('inventory_lots')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to discard lot' }
  }
}

export async function getActiveLots(ingredientName?: string): Promise<InventoryLot[]> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    let query = supabase
      .from('inventory_lots')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['available', 'partially_used'])

    if (ingredientName) {
      query = query.eq('ingredient_name', ingredientName)
    }

    // FIFO: sort by expiry date (nulls last), then received date
    query = query
      .order('expiry_date', { ascending: true, nullsFirst: false })
      .order('received_date', { ascending: true })

    const { data, error } = await query
    if (error) return []
    return (data || []).map(mapRow)
  } catch {
    return []
  }
}

export async function getExpiringItems(days: number = 3): Promise<InventoryLot[]> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + days)
    const cutoffStr = cutoff.toISOString().split('T')[0]
    const todayStr = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['available', 'partially_used'])
      .not('expiry_date', 'is', null)
      .gte('expiry_date', todayStr)
      .lte('expiry_date', cutoffStr)
      .order('expiry_date', { ascending: true })

    if (error) return []
    return (data || []).map(mapRow)
  } catch {
    return []
  }
}

export async function getExpiredItems(): Promise<InventoryLot[]> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const todayStr = new Date().toISOString().split('T')[0]

    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['available', 'partially_used'])
      .not('expiry_date', 'is', null)
      .lt('expiry_date', todayStr)
      .order('expiry_date', { ascending: true })

    if (error) return []
    return (data || []).map(mapRow)
  } catch {
    return []
  }
}

export async function getFIFORecommendation(ingredientName: string): Promise<string | null> {
  try {
    const lots = await getActiveLots(ingredientName)
    if (lots.length === 0) return null

    const oldest = lots[0] // Already sorted FIFO
    if (oldest.daysUntilExpiry !== null && oldest.daysUntilExpiry <= 0) {
      return `EXPIRED: ${oldest.ingredientName} lot from ${oldest.receivedDate} expired ${Math.abs(oldest.daysUntilExpiry)} day(s) ago. Discard immediately.`
    }
    if (oldest.daysUntilExpiry !== null) {
      return `Use ${oldest.ingredientName} lot from ${oldest.receivedDate} first (expires in ${oldest.daysUntilExpiry} day${oldest.daysUntilExpiry === 1 ? '' : 's'}).`
    }
    return `Use ${oldest.ingredientName} lot from ${oldest.receivedDate} first (oldest available, ${oldest.quantity} ${oldest.unit} remaining).`
  } catch {
    return null
  }
}

export async function getShelfLifeReport(): Promise<ShelfLifeReport> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from('inventory_lots')
      .select('*')
      .eq('tenant_id', tenantId)
      .in('status', ['available', 'partially_used'])

    if (error || !data) {
      return {
        totalActiveLots: 0,
        expiringSoon: 0,
        expired: 0,
        avgDaysUntilExpiry: null,
        totalValueCents: 0,
      }
    }

    const lots = data.map(mapRow)
    const todayStr = new Date().toISOString().split('T')[0]
    const threeDaysOut = new Date()
    threeDaysOut.setDate(threeDaysOut.getDate() + 3)
    const threeDaysStr = threeDaysOut.toISOString().split('T')[0]

    let expiringSoon = 0
    let expired = 0
    let totalDays = 0
    let lotsWithExpiry = 0
    let totalValueCents = 0

    for (const lot of lots) {
      if (lot.effectiveExpiryDate) {
        if (lot.effectiveExpiryDate < todayStr) {
          expired++
        } else if (lot.effectiveExpiryDate <= threeDaysStr) {
          expiringSoon++
        }
        if (lot.daysUntilExpiry !== null) {
          totalDays += lot.daysUntilExpiry
          lotsWithExpiry++
        }
      }
      if (lot.costPerUnitCents) {
        totalValueCents += lot.costPerUnitCents * lot.quantity
      }
    }

    return {
      totalActiveLots: lots.length,
      expiringSoon,
      expired,
      avgDaysUntilExpiry: lotsWithExpiry > 0 ? Math.round(totalDays / lotsWithExpiry) : null,
      totalValueCents: Math.round(totalValueCents),
    }
  } catch {
    return {
      totalActiveLots: 0,
      expiringSoon: 0,
      expired: 0,
      avgDaysUntilExpiry: null,
      totalValueCents: 0,
    }
  }
}

export async function getWasteFromExpiry(
  days: number = 30
): Promise<{ totalLots: number; totalValueCents: number }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const since = new Date()
    since.setDate(since.getDate() - days)
    const sinceStr = since.toISOString()

    const { data, error } = await supabase
      .from('inventory_lots')
      .select('quantity, cost_per_unit_cents')
      .eq('tenant_id', tenantId)
      .eq('status', 'discarded')
      .gte('updated_at', sinceStr)

    if (error || !data) return { totalLots: 0, totalValueCents: 0 }

    let totalValueCents = 0
    for (const row of data) {
      if (row.cost_per_unit_cents) {
        totalValueCents += row.cost_per_unit_cents * Number(row.quantity)
      }
    }

    return { totalLots: data.length, totalValueCents: Math.round(totalValueCents) }
  } catch {
    return { totalLots: 0, totalValueCents: 0 }
  }
}

export async function setDefaultShelfLife(
  ingredientName: string,
  days: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const tenantId = user.tenantId!
    const supabase = createServerClient()

    const { error } = await supabase
      .from('ingredient_shelf_life_defaults')
      .upsert(
        { tenant_id: tenantId, ingredient_name: ingredientName, shelf_life_days: days },
        { onConflict: 'tenant_id,ingredient_name' }
      )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to set default shelf life' }
  }
}
