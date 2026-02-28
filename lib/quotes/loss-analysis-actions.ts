'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function recordLostReason(quoteId: string, reason: string, notes?: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('quotes')
    .update({
      lost_reason: reason,
      lost_notes: notes ?? null,
      lost_recorded_at: new Date().toISOString(),
    })
    .eq('id', quoteId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/quotes')
}

export async function getLossAnalysis(): Promise<Array<{ reason: string; count: number }>> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)

  const { data, error } = await supabase
    .from('quotes')
    .select('lost_reason')
    .eq('tenant_id', tenantId)
    .not('lost_reason', 'is', null)
    .gte('lost_recorded_at', since.toISOString())

  if (error) throw new Error(error.message)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    if (row.lost_reason) {
      counts[row.lost_reason] = (counts[row.lost_reason] ?? 0) + 1
    }
  }

  return Object.entries(counts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
}
