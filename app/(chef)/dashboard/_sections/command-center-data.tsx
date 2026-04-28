import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { CommandCenter } from '@/components/dashboard/command-center'
import { InventoryBlindSpotsPanel, type InventoryBlindSpot } from './inventory-blind-spots-panel'

async function safeCount(
  db: any,
  table: string,
  tenantCol: string,
  tenantId: string,
  extraFilters?: (q: any) => any
): Promise<number | null> {
  try {
    let query = db.from(table).select('*', { count: 'exact', head: true }).eq(tenantCol, tenantId)
    if (extraFilters) query = extraFilters(query)
    const { count, error } = await query
    if (error) return null
    return count ?? 0
  } catch {
    return null
  }
}

export async function CommandCenterSection() {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!
  const inventoryBlindSpotsPromise = loadInventoryBlindSpots(db, tid)

  // Fetch only the 6 core counts needed by the condensed Core Areas panel
  const [events, inquiries, clients, menus, quotes, unreadMessages, circles] = await Promise.all([
    safeCount(db, 'events', 'tenant_id', tid, (q: any) =>
      q.not('status', 'in', '(completed,cancelled)')
    ),
    safeCount(db, 'inquiries', 'tenant_id', tid, (q: any) =>
      q.not('status', 'in', '(converted,rejected,archived)')
    ),
    safeCount(db, 'clients', 'tenant_id', tid),
    safeCount(db, 'menus', 'tenant_id', tid),
    safeCount(db, 'quotes', 'tenant_id', tid, (q: any) => q.in('status', ['draft', 'sent'])),
    safeCount(db, 'conversations', 'tenant_id', tid, (q: any) => q.gt('unread_count', 0)),
    safeCount(db, 'hub_groups', 'tenant_id', tid, (q: any) => q.eq('is_active', true)),
  ])

  const anyFailed = [events, inquiries, clients, menus, quotes, unreadMessages, circles].some(
    (v) => v === null
  )

  return (
    <div>
      {anyFailed && (
        <p className="text-xs text-amber-500 mb-2">
          Some counts could not be loaded. Counts may be incomplete.
        </p>
      )}
      <CommandCenter
        counts={{
          events: events ?? 0,
          inquiries: inquiries ?? 0,
          clients: clients ?? 0,
          menus: menus ?? 0,
          quotes: quotes ?? 0,
          unreadMessages: unreadMessages ?? 0,
          // Unused by the condensed panel but kept for interface compatibility
          recipes: 0,
          expenses: 0,
          invoices: 0,
          staff: 0,
          tasks: 0,
          vendors: 0,
          contracts: 0,
          leads: 0,
          inventoryAlerts: 0,
          goals: 0,
          campaigns: 0,
          calls: 0,
          circles: circles ?? 0,
        }}
      />
      <InventoryBlindSpotsPanel spots={await inventoryBlindSpotsPromise} />
    </div>
  )
}

async function loadInventoryBlindSpots(db: any, tenantId: string): Promise<InventoryBlindSpot[]> {
  const [missingParLevels, missingVendorLinks, batchesMissingExpiry, batchesMissingLotNumbers] =
    await Promise.all([
      safeCount(db, 'inventory_counts', 'chef_id', tenantId, (q: any) => q.is('par_level', null)),
      safeCount(db, 'inventory_counts', 'chef_id', tenantId, (q: any) => q.is('vendor_id', null)),
      safeCount(db, 'inventory_batches', 'chef_id', tenantId, (q: any) =>
        q.eq('is_depleted', false).is('expiry_date', null)
      ),
      safeCount(db, 'inventory_batches', 'chef_id', tenantId, (q: any) =>
        q.eq('is_depleted', false).is('lot_number', null)
      ),
    ])

  return [
    {
      id: 'parLevels',
      label: 'Missing Par Levels',
      count: missingParLevels,
      href: '/inventory/reorder',
      description: 'Tracked items without reorder thresholds.',
    },
    {
      id: 'vendorLinks',
      label: 'Missing Vendors',
      count: missingVendorLinks,
      href: '/inventory/procurement',
      description: 'Tracked items without a preferred source.',
    },
    {
      id: 'expiryDates',
      label: 'Missing Expiry Dates',
      count: batchesMissingExpiry,
      href: '/inventory/expiry',
      description: 'Active batches without freshness dates.',
    },
    {
      id: 'lotNumbers',
      label: 'Missing Lot Numbers',
      count: batchesMissingLotNumbers,
      href: '/inventory/purchase-orders',
      description: 'Active batches without traceability IDs.',
    },
  ]
}
