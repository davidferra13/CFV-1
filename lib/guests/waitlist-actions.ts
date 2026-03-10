'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ============================================
// WAITLIST MANAGEMENT
// ============================================

export async function addToWaitlist(input: {
  guestName: string
  guestPhone?: string
  partySize: number
  notes?: string
}) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!input.guestName.trim()) throw new Error('Guest name is required')
  if (input.partySize < 1) throw new Error('Party size must be at least 1')

  // Get current max position
  const { data: maxRow } = await supabase
    .from('waitlist_entries')
    .select('position')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'waiting')
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextPosition = (maxRow?.position ?? 0) + 1

  // Estimate wait time based on queue length and party size
  const estimatedWait = await estimateWaitTime(input.partySize)

  const { data: entry, error } = await supabase
    .from('waitlist_entries')
    .insert({
      chef_id: user.tenantId!,
      guest_name: input.guestName.trim(),
      guest_phone: input.guestPhone?.trim() || null,
      party_size: input.partySize,
      estimated_wait_minutes: estimatedWait,
      status: 'waiting',
      notes: input.notes?.trim() || null,
      position: nextPosition,
    })
    .select()
    .single()

  if (error) {
    console.error('[waitlist] addToWaitlist error:', error)
    throw new Error('Failed to add to waitlist')
  }

  revalidatePath('/guests/reservations')
  return entry
}

export async function getWaitlist() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('waitlist_entries')
    .select('*')
    .eq('chef_id', user.tenantId!)
    .in('status', ['waiting', 'notified'])
    .order('position', { ascending: true })

  if (error) {
    console.error('[waitlist] getWaitlist error:', error)
    throw new Error('Failed to load waitlist')
  }

  return data ?? []
}

export async function notifyGuest(entryId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('waitlist_entries')
    .update({ status: 'notified' })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .eq('status', 'waiting')

  if (error) {
    console.error('[waitlist] notifyGuest error:', error)
    throw new Error('Failed to notify guest')
  }

  revalidatePath('/guests/reservations')
}

export async function seatFromWaitlist(entryId: string, tableId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('waitlist_entries')
    .update({
      status: 'seated',
      seated_at: new Date().toISOString(),
      table_id: tableId,
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .in('status', ['waiting', 'notified'])

  if (error) {
    console.error('[waitlist] seatFromWaitlist error:', error)
    throw new Error('Failed to seat guest')
  }

  // Update table status to seated
  try {
    await supabase
      .from('commerce_dining_tables')
      .update({ status: 'seated' })
      .eq('id', tableId)
      .eq('tenant_id', user.tenantId!)
  } catch (err) {
    console.error('[non-blocking] Table status update failed', err)
  }

  revalidatePath('/guests/reservations')
  revalidatePath('/commerce/table-service')
}

export async function removeFromWaitlist(entryId: string, reason: 'cancelled' | 'no_show') {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('waitlist_entries')
    .update({
      status: reason,
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', entryId)
    .eq('chef_id', user.tenantId!)
    .in('status', ['waiting', 'notified'])

  if (error) {
    console.error('[waitlist] removeFromWaitlist error:', error)
    throw new Error('Failed to remove from waitlist')
  }

  revalidatePath('/guests/reservations')
}

export async function estimateWaitTime(partySize: number): Promise<number> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current queue size (waiting + notified)
  const { count: queueSize } = await supabase
    .from('waitlist_entries')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .in('status', ['waiting', 'notified'])

  // Get average turnover from recent seated entries (last 50)
  const { data: recentSeated } = await supabase
    .from('waitlist_entries')
    .select('created_at, seated_at')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'seated')
    .not('seated_at', 'is', null)
    .order('seated_at', { ascending: false })
    .limit(50)

  let avgTurnoverMinutes = 45 // default: 45 minutes per table turn

  if (recentSeated && recentSeated.length >= 3) {
    const turnoverTimes = recentSeated
      .map((entry: any) => {
        const created = new Date(entry.created_at).getTime()
        const seated = new Date(entry.seated_at).getTime()
        return (seated - created) / (1000 * 60) // minutes
      })
      .filter((m: number) => m > 0 && m < 300) // filter outliers

    if (turnoverTimes.length > 0) {
      avgTurnoverMinutes = Math.round(
        turnoverTimes.reduce((a: number, b: number) => a + b, 0) / turnoverTimes.length
      )
    }
  }

  // Larger parties wait longer (fewer tables can accommodate them)
  const sizeMultiplier = partySize > 6 ? 1.5 : partySize > 4 ? 1.25 : 1.0

  // Each person ahead adds roughly (avgTurnover / activeTables) minutes
  // Simplified: each queue position adds ~10-15 minutes
  const perPositionWait = Math.max(10, Math.round(avgTurnoverMinutes / 4))
  const estimatedMinutes = Math.round((queueSize ?? 0) * perPositionWait * sizeMultiplier)

  return Math.max(5, Math.min(estimatedMinutes, 180)) // 5 min minimum, 3 hour cap
}

export async function getWaitlistStats() {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const today = new Date().toISOString().split('T')[0]

  // Current queue size
  const { count: queueSize } = await supabase
    .from('waitlist_entries')
    .select('id', { count: 'exact', head: true })
    .eq('chef_id', user.tenantId!)
    .in('status', ['waiting', 'notified'])

  // Today's seated entries for average wait calc
  const { data: todaySeated } = await supabase
    .from('waitlist_entries')
    .select('created_at, seated_at')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'seated')
    .gte('created_at', `${today}T00:00:00`)
    .not('seated_at', 'is', null)

  let avgWaitMinutes = 0
  let longestWaitMinutes = 0

  if (todaySeated && todaySeated.length > 0) {
    const waits = todaySeated
      .map((entry: any) => {
        const created = new Date(entry.created_at).getTime()
        const seated = new Date(entry.seated_at).getTime()
        return Math.round((seated - created) / (1000 * 60))
      })
      .filter((m: number) => m > 0)

    if (waits.length > 0) {
      avgWaitMinutes = Math.round(waits.reduce((a: number, b: number) => a + b, 0) / waits.length)
      longestWaitMinutes = Math.max(...waits)
    }
  }

  // Currently waiting entries for longest current wait
  const { data: currentlyWaiting } = await supabase
    .from('waitlist_entries')
    .select('created_at')
    .eq('chef_id', user.tenantId!)
    .eq('status', 'waiting')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let longestCurrentWait = 0
  if (currentlyWaiting) {
    longestCurrentWait = Math.round(
      (Date.now() - new Date(currentlyWaiting.created_at).getTime()) / (1000 * 60)
    )
  }

  return {
    queueSize: queueSize ?? 0,
    avgWaitMinutes,
    longestWaitMinutes: Math.max(longestWaitMinutes, longestCurrentWait),
    todaySeated: todaySeated?.length ?? 0,
  }
}
