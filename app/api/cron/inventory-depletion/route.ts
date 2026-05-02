import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/db/admin'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { runMonitoredCronJob } from '@/lib/cron/monitor'
import { sendNotification } from '@/lib/notifications/send'

// Inventory Depletion Alert Cron
// Module: operations
// Checks all tenants' stock levels against par and fires notifications for critical items.
// Schedule: daily or after bulk inventory transactions.

export async function GET(request: Request) {
  const authError = verifyCronAuth(request.headers.get('authorization'))
  if (authError) return authError

  try {
    const result = await runMonitoredCronJob('inventory-depletion', async () => {
      const db = createAdminClient()

      // Get all active reorder settings across tenants
      const settings = await db
        .from('reorder_settings')
        .select('chef_id, ingredient_name, par_level, unit, preferred_vendor_id, is_active')
        .eq('is_active', true)

      if (!settings.data?.length) return { tenants: 0, alerts: 0, fired: 0 }

      // Group by tenant
      const byTenant: Record<string, any[]> = {}
      for (const s of settings.data) {
        const tid = (s as any).chef_id
        if (!tid) continue
        if (!byTenant[tid]) byTenant[tid] = []
        byTenant[tid].push(s)
      }

      let totalAlerts = 0
      let totalFired = 0

      for (const [tenantId, tenantSettings] of Object.entries(byTenant)) {
        // Get current stock for this tenant
        const counts = await db
          .from('inventory_counts')
          .select('ingredient_name, current_qty, unit')
          .eq('chef_id', tenantId)

        const stockMap: Record<string, number> = {}
        for (const c of counts.data || []) {
          stockMap[((c as any).ingredient_name || '').toLowerCase()] =
            Number((c as any).current_qty) || 0
        }

        for (const setting of tenantSettings) {
          const s = setting as any
          const parLevel = Number(s.par_level) || 0
          if (parLevel <= 0) continue

          const currentQty = stockMap[(s.ingredient_name || '').toLowerCase()] ?? 0
          if (currentQty >= parLevel) continue

          const pctRemaining = currentQty / parLevel
          totalAlerts++

          // Only notify for critical (<25% remaining)
          if (pctRemaining < 0.25) {
            try {
              await sendNotification({
                tenantId,
                recipientId: tenantId,
                type: 'low_stock' as any,
                title: `Low stock: ${s.ingredient_name}`,
                message: `${currentQty} ${s.unit || ''} remaining (par: ${parLevel}). Reorder needed.`,
                link: '/inventory',
              })
              totalFired++
            } catch (err) {
              console.error('[non-blocking] Depletion notification failed', err)
            }
          }
        }
      }

      return {
        tenants: Object.keys(byTenant).length,
        alerts: totalAlerts,
        fired: totalFired,
      }
    })

    return NextResponse.json(result)
  } catch (err) {
    console.error('Inventory depletion cron failed:', err)
    return NextResponse.json({ error: 'Inventory depletion check failed' }, { status: 500 })
  }
}
