'use server'

// Dormancy Re-Engagement — Surface clients who need reconnecting.
// Uses the client_financial_summary view's is_dormant flag and days_since_last_event.
// Threshold: 90+ days since last event counts as re-engagement worthy.
// Used on the chef dashboard to prompt outreach.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

export type DormantClientEntry = {
  clientId: string
  clientName: string
  daysSinceLastEvent: number
  lastEventDate: string | null
  lifetimeValueCents: number
}

export async function getDormantClients(limit = 5): Promise<DormantClientEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  // Join clients + client_financial_summary in one query using the view
  const { data: summaries } = await supabase
    .from('client_financial_summary')
    .select('client_id, days_since_last_event, last_event_date, lifetime_value_cents')
    .eq('tenant_id', user.tenantId!)
    .eq('is_dormant', true)
    .gte('days_since_last_event', 90)
    .order('days_since_last_event', { ascending: false })
    .limit(limit)

  if (!summaries || summaries.length === 0) return []

  const clientIds = summaries.map((s: any) => s.client_id)

  // Fetch client names
  const { data: clients } = await supabase
    .from('clients')
    .select('id, full_name')
    .in('id', clientIds)
    .eq('tenant_id', user.tenantId!)

  if (!clients) return []

  const nameMap = new Map<string, string>(clients.map((c) => [c.id, c.full_name]))

  return summaries
    .map((s: any) => ({
      clientId: s.client_id,
      clientName: nameMap.get(s.client_id) ?? 'Unknown Client',
      daysSinceLastEvent: s.days_since_last_event ?? 0,
      lastEventDate: s.last_event_date ?? null,
      lifetimeValueCents: s.lifetime_value_cents ?? 0,
    }))
    .filter((e: DormantClientEntry) => e.clientName !== 'Unknown Client')
}
