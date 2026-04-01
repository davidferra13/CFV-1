import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { CommandCenter } from '@/components/dashboard/command-center'

async function safeCount(
  db: any,
  table: string,
  tenantCol: string,
  tenantId: string,
  extraFilters?: (q: any) => any
): Promise<number> {
  try {
    let query = db.from(table).select('*', { count: 'exact', head: true }).eq(tenantCol, tenantId)
    if (extraFilters) query = extraFilters(query)
    const { count } = await query
    return count ?? 0
  } catch {
    return 0
  }
}

export async function CommandCenterSection() {
  const user = await requireChef()
  const db: any = createServerClient()
  const tid = user.tenantId!

  // Fetch only the 6 core counts needed by the condensed Core Areas panel
  const [events, inquiries, clients, menus, quotes, unreadMessages] = await Promise.all([
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
  ])

  return (
    <CommandCenter
      counts={{
        events,
        inquiries,
        clients,
        menus,
        quotes,
        unreadMessages,
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
        circles: 0,
      }}
    />
  )
}
