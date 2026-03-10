'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { computeConcentrationRisk } from '@/lib/finance/concentration-risk'
import type { ConcentrationRisk } from '@/lib/finance/concentration-risk'

export type { ConcentrationRisk }

export async function getConcentrationRisk(): Promise<ConcentrationRisk | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  // Look back 12 months
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

  // Get ledger payment entries joined to events and clients
  const { data: entries, error } = await supabase
    .from('ledger_entries')
    .select('amount_cents, event_id, events!inner(client_id, clients!inner(id, full_name))')
    .eq('tenant_id', tenantId)
    .eq('entry_type', 'payment')
    .gte('created_at', twelveMonthsAgo.toISOString())

  if (error) throw new Error(`Failed to fetch ledger entries: ${error.message}`)

  // Aggregate revenue per client
  const revenueMap = new Map<string, { name: string; totalCents: number }>()

  for (const entry of entries || []) {
    const event = (entry as any).events
    const client = event?.clients
    if (!client) continue

    const clientId: string = client.id
    const clientName: string = client.full_name ?? 'Unknown'
    const amountCents: number = entry.amount_cents ?? 0

    if (revenueMap.has(clientId)) {
      revenueMap.get(clientId)!.totalCents += amountCents
    } else {
      revenueMap.set(clientId, { name: clientName, totalCents: amountCents })
    }
  }

  const revenues = Array.from(revenueMap.entries()).map(([clientId, v]) => ({
    clientId,
    name: v.name,
    totalCents: v.totalCents,
  }))

  return computeConcentrationRisk(revenues)
}
