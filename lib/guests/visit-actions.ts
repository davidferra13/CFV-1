'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================
// SCHEMAS
// ============================================

const LogVisitSchema = z.object({
  guest_id: z.string().uuid(),
  visit_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  party_size: z.number().int().min(1).optional(),
  spend_cents: z.number().int().min(0).optional(),
  server_id: z.string().optional(),
  notes: z.string().optional(),
})

export type LogVisitInput = z.infer<typeof LogVisitSchema>

// ============================================
// VISIT LOGGING
// ============================================

export async function logVisit(input: LogVisitInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const data = LogVisitSchema.parse(input)

  const { data: visit, error } = await supabase
    .from('guest_visits')
    .insert({
      guest_id: data.guest_id,
      visit_date: data.visit_date,
      party_size: data.party_size || null,
      spend_cents: data.spend_cents || null,
      server_id: data.server_id || null,
      notes: data.notes || null,
      chef_id: user.tenantId!,
    })
    .select()
    .single()

  if (error) {
    console.error('[visits] logVisit error:', error)
    throw new Error('Failed to log visit')
  }

  revalidatePath('/guests')
  revalidatePath(`/guests/${data.guest_id}`)
  return visit
}

export async function listVisits(guestId: string, limit = 50) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('guest_visits')
    .select('*')
    .eq('guest_id', guestId)
    .eq('chef_id', user.tenantId!)
    .order('visit_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[visits] listVisits error:', error)
    throw new Error('Failed to list visits')
  }

  return data ?? []
}

export async function getVisitStats(guestId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data: visits, error } = await supabase
    .from('guest_visits')
    .select('visit_date, spend_cents')
    .eq('guest_id', guestId)
    .eq('chef_id', user.tenantId!)
    .order('visit_date', { ascending: true })

  if (error) {
    console.error('[visits] getVisitStats error:', error)
    throw new Error('Failed to get visit stats')
  }

  const allVisits = visits ?? []
  const totalVisits = allVisits.length
  const totalSpendCents = allVisits.reduce((sum, v) => sum + (v.spend_cents || 0), 0)
  const avgSpendCents = totalVisits > 0 ? Math.round(totalSpendCents / totalVisits) : 0

  // Calculate visit frequency (avg days between visits)
  let avgDaysBetweenVisits: number | null = null
  if (allVisits.length >= 2) {
    const first = new Date(allVisits[0].visit_date).getTime()
    const last = new Date(allVisits[allVisits.length - 1].visit_date).getTime()
    const daysDiff = Math.round((last - first) / (1000 * 60 * 60 * 24))
    avgDaysBetweenVisits = Math.round(daysDiff / (totalVisits - 1))
  }

  return {
    totalVisits,
    totalSpendCents,
    avgSpendCents,
    avgDaysBetweenVisits,
    firstVisit: allVisits.length > 0 ? allVisits[0].visit_date : null,
    lastVisit: allVisits.length > 0 ? allVisits[allVisits.length - 1].visit_date : null,
  }
}
