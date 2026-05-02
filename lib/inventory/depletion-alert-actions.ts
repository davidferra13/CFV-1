'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { sendNotification } from '@/lib/notifications/send'

// Inventory Depletion Alerts
// Module: operations
// Checks stock levels against par/reorder points and fires notifications.
// Deterministic: formula > AI.

export type DepletionAlert = {
  ingredientName: string
  currentQty: number
  parLevel: number
  deficit: number
  unit: string
  preferredVendor: string | null
  severity: 'critical' | 'warning'
}

/**
 * Check all inventory items against par levels and return alerts.
 * Merges data from reorder_settings and inventory_current_stock view.
 */
export async function checkDepletionAlerts(): Promise<DepletionAlert[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const db: any = createServerClient()

  // Get reorder settings with par levels
  const settings = await db
    .from('reorder_settings')
    .select('ingredient_name, par_level, reorder_qty, preferred_vendor_id, unit, is_active')
    .eq('chef_id', tenantId)
    .eq('is_active', true)

  if (!settings.length) return []

  // Get current stock levels from inventory counts
  const counts = await db
    .from('inventory_counts')
    .select('ingredient_name, current_qty, par_level, unit')
    .eq('chef_id', tenantId)

  // Build stock lookup
  const stockMap: Record<string, { qty: number; unit: string }> = {}
  for (const c of counts) {
    stockMap[(c as any).ingredient_name?.toLowerCase()] = {
      qty: Number((c as any).current_qty) || 0,
      unit: (c as any).unit || '',
    }
  }

  // Get vendor names for display
  const vendorIds = settings.map((s: any) => s.preferred_vendor_id).filter(Boolean)
  let vendorMap: Record<string, string> = {}
  if (vendorIds.length > 0) {
    const vendors = await db.from('vendors').select('id, name').eq('chef_id', tenantId)
    for (const v of vendors) {
      vendorMap[(v as any).id] = (v as any).name
    }
  }

  const alerts: DepletionAlert[] = []

  for (const setting of settings) {
    const s = setting as any
    const parLevel = Number(s.par_level) || 0
    if (parLevel <= 0) continue

    const stock = stockMap[s.ingredient_name?.toLowerCase()]
    const currentQty = stock?.qty ?? 0

    if (currentQty < parLevel) {
      const deficit = parLevel - currentQty
      const pctRemaining = parLevel > 0 ? currentQty / parLevel : 0

      alerts.push({
        ingredientName: s.ingredient_name,
        currentQty,
        parLevel,
        deficit,
        unit: s.unit || stock?.unit || '',
        preferredVendor: s.preferred_vendor_id ? vendorMap[s.preferred_vendor_id] || null : null,
        severity: pctRemaining < 0.25 ? 'critical' : 'warning',
      })
    }
  }

  // Sort: critical first, then by deficit magnitude
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1
    return b.deficit - a.deficit
  })

  return alerts
}

/**
 * Run depletion check and fire notifications for critical items.
 * Call this after inventory transactions or on a schedule.
 */
export async function fireDepletionNotifications(): Promise<{ fired: number; total: number }> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const alerts = await checkDepletionAlerts()
  const criticalAlerts = alerts.filter((a) => a.severity === 'critical')

  let fired = 0
  for (const alert of criticalAlerts) {
    try {
      await sendNotification({
        tenantId,
        recipientId: tenantId,
        type: 'low_stock' as any,
        title: `Low stock: ${alert.ingredientName}`,
        message: `${alert.currentQty} ${alert.unit} remaining (par: ${alert.parLevel}). ${alert.preferredVendor ? `Order from ${alert.preferredVendor}.` : 'Reorder needed.'}`,
      })
      fired++
    } catch (err) {
      console.error('[non-blocking] Depletion notification failed', err)
    }
  }

  return { fired, total: alerts.length }
}
