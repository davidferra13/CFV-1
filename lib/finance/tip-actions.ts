'use server'

// Tip Actions - manual tip log + Uber-style tip request system.
// Manual tips: chef records tips received (event_tips table).
// Tip requests: chef sends a link to client post-service, client submits tip (tip_requests table).

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { appendLedgerEntryForChef } from '@/lib/ledger/append'
import { createLogger } from '@/lib/logger'

const log = createLogger('tips')

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
  const db: any = createServerClient()

  const { data } = await db
    .from('event_tips' as any)
    .select('id, event_id, amount_cents, method, received_at, notes')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('received_at', { ascending: false })

  return ((data ?? []) as any[]).map(
    (r: any): TipEntry => ({
      id: r.id,
      eventId: r.event_id,
      amountCents: r.amount_cents,
      method: r.method,
      receivedAt: r.received_at,
      notes: r.notes,
    })
  )
}

export async function getYtdTipSummary(): Promise<{
  totalCents: number
  byMethod: Record<string, number>
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  const year = new Date().getFullYear()

  const { data } = await db
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

export async function addTip(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const eventId = formData.get('eventId') as string
  const amountDollars = parseFloat(formData.get('amountDollars') as string)
  const method = (formData.get('method') as string) || 'cash'
  const notes = (formData.get('notes') as string) || null

  if (!eventId || isNaN(amountDollars) || amountDollars <= 0) {
    return { success: false, error: 'Invalid input: event ID and positive amount are required' }
  }

  const { error } = await db.from('event_tips' as any).insert({
    event_id: eventId,
    tenant_id: user.tenantId!,
    amount_cents: Math.round(amountDollars * 100),
    method,
    notes,
  })

  if (error) {
    log.error('Failed to add tip', { error })
    return { success: false, error: 'Failed to save tip' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

export async function deleteTip(
  id: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { error } = await db
    .from('event_tips' as any)
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    log.error('Failed to delete tip', { error })
    return { success: false, error: 'Failed to delete tip' }
  }

  revalidatePath(`/events/${eventId}`)
  return { success: true }
}

// ── Tip Request System (Uber-style post-service prompts) ─────────────────

export type TipRequestStatus = 'pending' | 'sent' | 'completed' | 'declined'
export type TipMethod = 'card' | 'cash' | 'venmo' | 'other'

export interface TipRequest {
  id: string
  eventId: string
  clientId: string
  requestToken: string
  suggestedAmountsCents: number[]
  suggestedPercentages: number[]
  tipAmountCents: number | null
  tipMethod: TipMethod | null
  status: TipRequestStatus
  sentAt: string | null
  completedAt: string | null
  notes: string | null
  createdAt: string
}

function mapTipRequest(r: any): TipRequest {
  return {
    id: r.id,
    eventId: r.event_id,
    clientId: r.client_id,
    requestToken: r.request_token,
    suggestedAmountsCents: r.suggested_amounts_cents ?? [1500, 2000, 2500, 0],
    suggestedPercentages: r.suggested_percentages ?? [15, 18, 20, 0],
    tipAmountCents: r.tip_amount_cents,
    tipMethod: r.tip_method,
    status: r.status,
    sentAt: r.sent_at,
    completedAt: r.completed_at,
    notes: r.notes,
    createdAt: r.created_at,
  }
}

/**
 * Create a tip request for a completed event.
 * Chef can optionally customize suggested amounts.
 */
export async function createTipRequest(
  eventId: string,
  options?: {
    suggestedAmountsCents?: number[]
    suggestedPercentages?: number[]
  }
): Promise<TipRequest> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch event to validate ownership and get client_id
  const { data: event, error: eventError } = await db
    .from('events')
    .select('id, client_id, status')
    .eq('id', eventId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (eventError || !event) {
    throw new Error('Event not found or does not belong to your account')
  }

  if (event.status !== 'completed') {
    throw new Error('Tip requests can only be created for completed events')
  }

  const insertData: Record<string, unknown> = {
    tenant_id: user.tenantId!,
    event_id: eventId,
    client_id: event.client_id,
    status: 'pending',
  }

  if (options?.suggestedAmountsCents) {
    insertData.suggested_amounts_cents = options.suggestedAmountsCents
  }
  if (options?.suggestedPercentages) {
    insertData.suggested_percentages = options.suggestedPercentages
  }

  const { data, error } = await db
    .from('tip_requests' as any)
    .insert(insertData)
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      throw new Error('A tip request already exists for this event')
    }
    log.error('Failed to create tip request', { error })
    throw new Error('Failed to create tip request')
  }

  // Log activity (non-blocking)
  try {
    const { logChefActivity } = await import('@/lib/activity/log-chef')
    await logChefActivity({
      tenantId: user.tenantId!,
      actorId: user.id,
      action: 'tip_request_created' as any,
      domain: 'financial',
      entityType: 'tip_request',
      entityId: data.id,
      summary: `Created tip request for event`,
      context: { event_id: eventId },
      clientId: event.client_id,
    })
  } catch (err) {
    log.warn('Activity log failed (non-blocking)', { error: err })
  }

  revalidatePath(`/events/${eventId}`)
  return mapTipRequest(data)
}

/**
 * Get tip requests for the authenticated chef, optionally filtered by date range.
 */
export async function getTipRequests(dateRange?: {
  from: string
  to: string
}): Promise<TipRequest[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  let query = db
    .from('tip_requests' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (dateRange) {
    query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to)
  }

  const { data, error } = await query

  if (error) {
    log.error('Failed to fetch tip requests', { error })
    throw new Error('Failed to fetch tip requests')
  }

  return ((data ?? []) as any[]).map(mapTipRequest)
}

/**
 * Get tip request by public token. No auth required (for client-facing page).
 * Uses service role to bypass RLS since this is a public page.
 */
export async function getTipRequestByToken(token: string): Promise<{
  request: TipRequest
  chefName: string
  eventDate: string | null
  eventOccasion: string | null
  eventTotalCents: number | null
} | null> {
  const db: any = createServerClient({ admin: true })

  const { data, error } = await db
    .from('tip_requests' as any)
    .select(
      `
      *,
      chef:chefs!tenant_id(business_name, full_name),
      event:events!event_id(event_date, occasion, quoted_total_cents)
    `
    )
    .eq('request_token', token)
    .single()

  if (error || !data) return null

  // Expire tip requests after 30 days (application-level check)
  const createdAt = data.created_at ? new Date(data.created_at) : null
  if (createdAt) {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000
    if (Date.now() - createdAt.getTime() > thirtyDaysMs) {
      return null
    }
  }

  const chef = data.chef as any
  const event = data.event as any

  return {
    request: mapTipRequest(data),
    chefName: chef?.business_name || chef?.full_name || 'Your Chef',
    eventDate: event?.event_date || null,
    eventOccasion: event?.occasion || null,
    eventTotalCents: event?.quoted_total_cents || null,
  }
}

/**
 * Record a tip from the client-facing page.
 * Updates the tip request status and appends a ledger entry.
 * No auth required (public page), but validates via token.
 */
export async function recordTip(
  requestId: string,
  amountCents: number,
  method: TipMethod,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return { success: false, error: 'Invalid tip amount' }
  }
  // Cap at $10,000 per tip to prevent fat-finger entry errors
  if (amountCents > 1_000_000) {
    return { success: false, error: 'Tip amount cannot exceed $10,000' }
  }

  const db: any = createServerClient({ admin: true })

  // Fetch the tip request
  const { data: request, error: fetchError } = await db
    .from('tip_requests' as any)
    .select('*, event:events!event_id(client_id, tenant_id)')
    .eq('id', requestId)
    .single()

  if (fetchError || !request) {
    return { success: false, error: 'Tip request not found' }
  }

  if (request.status === 'completed') {
    return { success: false, error: 'This tip has already been recorded' }
  }

  if (request.status === 'declined') {
    return { success: false, error: 'This tip request was declined' }
  }

  // Update the tip request (CAS guard: only if still pending/sent, prevents double-recording)
  const { data: updated, error: updateError } = await db
    .from('tip_requests' as any)
    .update({
      tip_amount_cents: amountCents,
      tip_method: method,
      status: 'completed',
      completed_at: new Date().toISOString(),
      notes: notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .in('status', ['pending', 'sent'])
    .select('id')
    .single()

  if (updateError || !updated) {
    log.error('Failed to update tip request (may already be completed)', { error: updateError })
    return { success: false, error: 'Failed to record tip. It may have already been submitted.' }
  }

  // Append to ledger as tip income (using internal/admin since this is a public action)
  try {
    const { appendLedgerEntryFromWebhook } = await import('@/lib/ledger/append-internal')
    const paymentMethod = method === 'venmo' ? 'venmo' : method === 'card' ? 'card' : 'cash'
    await appendLedgerEntryFromWebhook({
      tenant_id: request.tenant_id,
      client_id: request.client_id,
      entry_type: 'tip',
      amount_cents: amountCents,
      payment_method: paymentMethod as any,
      description: `Tip received via tip request`,
      event_id: request.event_id,
      transaction_reference: `tip_req_${requestId}`,
      created_by: null,
    })
  } catch (err) {
    log.error('Failed to append tip to ledger (tip still recorded)', { error: err })
  }

  // Also record in event_tips for the existing tip log system
  try {
    await db.from('event_tips' as any).insert({
      event_id: request.event_id,
      tenant_id: request.tenant_id,
      amount_cents: amountCents,
      method,
      notes: notes ? `Via tip request: ${notes}` : 'Via tip request',
    })
  } catch (err) {
    log.warn('Failed to mirror tip to event_tips (non-blocking)', { error: err })
  }

  return { success: true }
}

/**
 * Mark a tip request as sent (e.g., after emailing the link to the client).
 */
export async function markTipRequestSent(requestId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('tip_requests' as any)
    .update({
      status: 'sent',
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('tenant_id', user.tenantId!)
}

/**
 * Get the tip request for a specific event (chef-only).
 */
export async function getEventTipRequest(eventId: string): Promise<TipRequest | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('tip_requests' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return mapTipRequest(data)
}

/**
 * Get tip summary for a given year (chef-only).
 * Returns total tips, average per event, tip rate, and monthly breakdown.
 */
export async function getTipSummary(year: number): Promise<{
  totalCents: number
  tipCount: number
  avgPerEventCents: number
  tipRate: number
  byMonth: { month: number; totalCents: number; count: number }[]
}> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Get all completed tip requests for the year
  const { data: tipRequests } = await db
    .from('tip_requests' as any)
    .select('tip_amount_cents, completed_at')
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('completed_at', `${year}-01-01T00:00:00Z`)
    .lt('completed_at', `${year + 1}-01-01T00:00:00Z`)

  // Get total completed events for the year (for tip rate)
  const { count: totalEvents } = await db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', user.tenantId!)
    .eq('status', 'completed')
    .gte('event_date', `${year}-01-01`)
    .lt('event_date', `${year + 1}-01-01`)

  const tips = (tipRequests ?? []) as any[]
  const totalCents = tips.reduce((sum: number, t: any) => sum + (t.tip_amount_cents || 0), 0)
  const tipCount = tips.length
  const avgPerEventCents = tipCount > 0 ? Math.round(totalCents / tipCount) : 0
  const tipRate = totalEvents && totalEvents > 0 ? Math.round((tipCount / totalEvents) * 100) : 0

  // Monthly breakdown
  const monthMap = new Map<number, { totalCents: number; count: number }>()
  for (const tip of tips) {
    const month = new Date(tip.completed_at).getMonth() + 1
    const existing = monthMap.get(month) || { totalCents: 0, count: 0 }
    existing.totalCents += tip.tip_amount_cents || 0
    existing.count += 1
    monthMap.set(month, existing)
  }

  const byMonth = Array.from(monthMap.entries())
    .map(([month, data]) => ({ month, ...data }))
    .sort((a, b) => a.month - b.month)

  return { totalCents, tipCount, avgPerEventCents, tipRate, byMonth }
}
