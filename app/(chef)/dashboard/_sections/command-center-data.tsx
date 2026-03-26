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

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .split('T')[0]

  const today = new Date().toISOString().split('T')[0]

  // Fetch all counts in parallel for speed
  const [
    events,
    inquiries,
    clients,
    recipes,
    menus,
    quotes,
    expenses,
    invoices,
    staff,
    tasks,
    vendors,
    contracts,
    leads,
    goals,
    campaigns,
    unreadMessages,
    calls,
  ] = await Promise.all([
    // Events: active (not completed, not cancelled)
    safeCount(db, 'events', 'tenant_id', tid, (q: any) =>
      q.not('status', 'in', '(completed,cancelled)')
    ),
    // Inquiries: open (not converted, not rejected, not archived)
    safeCount(db, 'inquiries', 'tenant_id', tid, (q: any) =>
      q.not('status', 'in', '(converted,rejected,archived)')
    ),
    // Clients: total
    safeCount(db, 'clients', 'tenant_id', tid),
    // Recipes: total
    safeCount(db, 'recipes', 'tenant_id', tid),
    // Menus: total
    safeCount(db, 'menus', 'tenant_id', tid),
    // Quotes: pending (draft or sent)
    safeCount(db, 'quotes', 'tenant_id', tid, (q: any) => q.in('status', ['draft', 'sent'])),
    // Expenses: this month
    safeCount(db, 'expenses', 'tenant_id', tid, (q: any) => q.gte('expense_date', monthStart)),
    // Invoices: billable events
    safeCount(db, 'events', 'tenant_id', tid, (q: any) =>
      q.in('status', ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'])
    ),
    // Staff: active
    safeCount(db, 'staff_members', 'chef_id', tid, (q: any) => q.eq('status', 'active')),
    // Tasks: open (not completed)
    safeCount(db, 'chef_todos', 'chef_id', tid, (q: any) => q.eq('completed', false)),
    // Vendors: total (chef_id scoped)
    safeCount(db, 'vendors', 'chef_id', tid),
    // Contracts: signed (event_contracts table, chef_id scoped)
    safeCount(db, 'event_contracts', 'chef_id', tid, (q: any) => q.eq('status', 'signed')),
    // Leads: new inquiries
    safeCount(db, 'inquiries', 'tenant_id', tid, (q: any) => q.eq('status', 'new')),
    // Goals: active (tenant_id scoped)
    safeCount(db, 'chef_goals', 'tenant_id', tid, (q: any) => q.eq('status', 'active')),
    // Campaigns: marketing_campaigns, chef_id scoped
    safeCount(db, 'marketing_campaigns', 'chef_id', tid),
    // Unread conversations
    safeCount(db, 'conversations', 'tenant_id', tid, (q: any) => q.gt('unread_count', 0)),
    // Upcoming calls (scheduled, not completed)
    safeCount(db, 'scheduled_calls', 'tenant_id', tid, (q: any) =>
      q.eq('status', 'scheduled').gte('scheduled_at', today)
    ),
  ])

  return (
    <CommandCenter
      counts={{
        events,
        inquiries,
        clients,
        recipes,
        menus,
        quotes,
        expenses,
        invoices,
        staff,
        tasks,
        vendors,
        contracts,
        leads,
        inventoryAlerts: 0,
        goals,
        campaigns,
        unreadMessages,
        calls,
      }}
    />
  )
}
