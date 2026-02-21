'use server'

// Tip Log Actions — dedicated tip entries per event.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface TipEntry {
  id: string
  eventId: string
  amountCents: number
  method: string
  receivedAt: string
  notes: string | null
}

export async function getEventTips(eventId: string): Promise<TipEntry[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data } = await supabase
    .from('event_tips' as any)
    .select('id, event_id, amount_cents, method, received_at, notes')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('received_at', { ascending: false })

  return ((data ?? []) as any[]).map((r: any): TipEntry => ({
    id: r.id,
    eventId: r.event_id,
    amountCents: r.amount_cents,
    method: r.method,
    receivedAt: r.received_at,
    notes: r.notes,
  }))
}

export async function getYtdTipSummary(): Promise<{ totalCents: number; byMethod: Record<string, number> }> {
  const user = await requireChef()
  const supabase = createServerClient()

  const year = new Date().getFullYear()

  const { data } = await supabase
    .from('event_tips' as any)
    .select('amount_cents, method')
    .eq('tenant_id', user.tenantId!)
    .gte('received_at', `${year}-01-01T00:00:00Z`)
    .lt('received_at', `${year + 1}-01-01T00:00:00Z`)

  let totalCents = 0
  const byMethod: Record<string, number> = {}
  for (const r of (data ?? []) as any[]) {
    totalCents += r.amount_cents
    byMethod[r.method] = (byMethod[r.method] ?? 0) + r.amount_cents
  }

  return { totalCents, byMethod }
}

export async function addTip(formData: FormData): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const eventId = formData.get('eventId') as string
  const amountDollars = parseFloat(formData.get('amountDollars') as string)
  const method = (formData.get('method') as string) || 'cash'
  const notes = (formData.get('notes') as string) || null

  if (!eventId || isNaN(amountDollars) || amountDollars <= 0) return

  await supabase.from('event_tips' as any).insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    amount_cents: Math.round(amountDollars * 100),
    method,
    notes,
  })

  revalidatePath(`/events/${eventId}`)
}

export async function deleteTip(id: string, eventId: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  await supabase
    .from('event_tips' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/events/${eventId}`)
}
