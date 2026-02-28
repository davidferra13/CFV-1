'use server'

/**
 * Lightweight milestone stats for the MilestoneOverlay.
 * 3 parallel queries — fast count-only, no data returned.
 */

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'

export interface ChefMilestoneStats {
  clientCount: number
  completedEventCount: number
  lifetimeRevenueCents: number
  /** ISO date string — used to detect business birthday anniversaries */
  chefCreatedAt: string
}

export async function getChefMilestoneStats(): Promise<ChefMilestoneStats | null> {
  try {
    const user = await requireChef()
    if (!user.tenantId) return null

    const supabase: any = createServerClient()

    const [clientRes, eventRes, chefRes] = await Promise.all([
      // head: true = COUNT only, no rows returned
      supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId),

      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', user.tenantId)
        .eq('status', 'completed'),

      supabase.from('chefs').select('created_at').eq('id', user.tenantId).single(),
    ])

    // Revenue: sum all non-refund ledger entries (matches compute.ts logic)
    const { data: ledgerRows } = await supabase
      .from('ledger_entries')
      .select('amount_cents, entry_type, is_refund')
      .eq('tenant_id', user.tenantId)
      .eq('is_refund', false)
      .neq('entry_type', 'refund')
      .neq('entry_type', 'tip')

    const lifetimeRevenueCents =
      ledgerRows?.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0) ?? 0

    return {
      clientCount: clientRes.count ?? 0,
      completedEventCount: eventRes.count ?? 0,
      lifetimeRevenueCents,
      chefCreatedAt: chefRes.data?.created_at ?? new Date().toISOString(),
    }
  } catch {
    // Auth failure, network error, etc. — overlay silently does nothing
    return null
  }
}
