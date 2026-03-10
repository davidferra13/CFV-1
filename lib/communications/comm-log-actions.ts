'use server'

// Unified Communication Log (U18)
// Single timeline per client showing every interaction: emails, SMS, phone
// calls, feedback, orders, events, and manual notes.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Types ──────────────────────────────────────────────────────────────

export type CommChannel =
  | 'email'
  | 'sms'
  | 'phone'
  | 'note'
  | 'system'
  | 'feedback'
  | 'order'
  | 'event'

export type CommDirection = 'inbound' | 'outbound' | 'internal'

export interface CommLogEntry {
  id: string
  tenantId: string
  clientId: string | null
  clientIdentifier: string | null
  channel: CommChannel
  direction: CommDirection
  subject: string | null
  content: string | null
  entityType: string | null
  entityId: string | null
  metadata: Record<string, unknown> | null
  loggedBy: string | null
  createdAt: string
}

export interface CommStats {
  totalInteractions: number
  lastContactDate: string | null
  preferredChannel: string | null
  channelBreakdown: Record<string, number>
}

// ── Helpers ────────────────────────────────────────────────────────────

function mapRow(r: any): CommLogEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    clientId: r.client_id,
    clientIdentifier: r.client_identifier,
    channel: r.channel,
    direction: r.direction,
    subject: r.subject,
    content: r.content,
    entityType: r.entity_type,
    entityId: r.entity_id,
    metadata: r.metadata,
    loggedBy: r.logged_by,
    createdAt: r.created_at,
  }
}

// ── Log a communication ────────────────────────────────────────────────

export async function logCommunication(data: {
  clientId?: string | null
  clientIdentifier?: string | null
  channel: CommChannel
  direction: CommDirection
  subject?: string | null
  content?: string | null
  entityType?: string | null
  entityId?: string | null
  metadata?: Record<string, unknown> | null
  loggedBy?: string | null
}): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('communication_log' as any).insert({
    tenant_id: user.tenantId!,
    client_id: data.clientId ?? null,
    client_identifier: data.clientIdentifier ?? null,
    channel: data.channel,
    direction: data.direction,
    subject: data.subject ?? null,
    content: data.content ?? null,
    entity_type: data.entityType ?? null,
    entity_id: data.entityId ?? null,
    metadata: data.metadata ?? null,
    logged_by: data.loggedBy ?? 'manual',
  })

  if (error) {
    console.error('[comm-log] Failed to log communication:', error.message)
    return { success: false, error: error.message }
  }

  revalidatePath('/communications')
  if (data.clientId) {
    revalidatePath(`/clients/${data.clientId}`)
    revalidatePath(`/clients/${data.clientId}/communications`)
  }

  return { success: true }
}

// ── Quick call note shortcut ───────────────────────────────────────────

export async function addCallNote(
  clientId: string,
  subject: string,
  notes: string,
  durationMinutes?: number
): Promise<{ success: boolean; error?: string }> {
  return logCommunication({
    clientId,
    channel: 'phone',
    direction: 'inbound',
    subject,
    content: notes,
    metadata: durationMinutes ? { durationMinutes } : null,
    loggedBy: 'manual',
  })
}

// ── Client timeline (merged from comm_log + related tables) ────────────

export async function getClientTimeline(
  clientId: string,
  limit = 50,
  offset = 0
): Promise<CommLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // 1. Direct communication_log entries
  const { data: logRows } = await supabase
    .from('communication_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  const entries: CommLogEntry[] = ((logRows ?? []) as any[]).map(mapRow)

  // 2. SMS messages for this client
  try {
    const { data: smsRows } = await supabase
      .from('sms_messages' as any)
      .select('id, to_phone, body, message_type, direction, created_at, entity_type, entity_id')
      .eq('chef_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const s of (smsRows ?? []) as any[]) {
      entries.push({
        id: `sms-${s.id}`,
        tenantId: user.tenantId!,
        clientId,
        clientIdentifier: s.to_phone,
        channel: 'sms',
        direction: s.direction ?? 'outbound',
        subject: s.message_type ?? 'SMS',
        content: s.body,
        entityType: s.entity_type ?? null,
        entityId: s.entity_id ?? null,
        metadata: null,
        loggedBy: 'auto',
        createdAt: s.created_at,
      })
    }
  } catch {
    // sms_messages table may not exist yet
  }

  // 3. Feedback responses for this client
  try {
    const { data: fbRows } = await supabase
      .from('feedback_responses' as any)
      .select('id, overall_rating, comments, created_at, event_id')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const f of (fbRows ?? []) as any[]) {
      entries.push({
        id: `fb-${f.id}`,
        tenantId: user.tenantId!,
        clientId,
        clientIdentifier: null,
        channel: 'feedback',
        direction: 'inbound',
        subject: `Feedback (${f.overall_rating}/5)`,
        content: f.comments,
        entityType: 'event',
        entityId: f.event_id ?? null,
        metadata: { rating: f.overall_rating },
        loggedBy: 'auto',
        createdAt: f.created_at,
      })
    }
  } catch {
    // feedback_responses table may not exist yet
  }

  // 4. Events for this client (milestones in the timeline)
  try {
    const { data: eventRows } = await supabase
      .from('events' as any)
      .select('id, title, status, event_date, created_at')
      .eq('tenant_id', user.tenantId!)
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(limit)

    for (const e of (eventRows ?? []) as any[]) {
      entries.push({
        id: `ev-${e.id}`,
        tenantId: user.tenantId!,
        clientId,
        clientIdentifier: null,
        channel: 'event',
        direction: 'internal',
        subject: e.title ?? 'Event',
        content: `Status: ${e.status}`,
        entityType: 'event',
        entityId: e.id,
        metadata: { status: e.status, eventDate: e.event_date },
        loggedBy: 'auto',
        createdAt: e.created_at,
      })
    }
  } catch {
    // events table should always exist
  }

  // Sort merged entries by date descending
  entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Apply pagination to merged result
  return entries.slice(0, limit)
}

// ── Timeline by identifier (for contacts not in clients table) ─────────

export async function getTimelineByIdentifier(
  emailOrPhone: string,
  limit = 50
): Promise<CommLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('communication_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .eq('client_identifier', emailOrPhone)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as any[]).map(mapRow)
}

// ── Search communications ──────────────────────────────────────────────

export async function searchCommunications(query: string, limit = 50): Promise<CommLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Use ilike for simple search (full-text search via index is used by Postgres)
  const { data } = await supabase
    .from('communication_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .or(`subject.ilike.%${query}%,content.ilike.%${query}%`)
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as any[]).map(mapRow)
}

// ── Recent communications across all clients ───────────────────────────

export async function getRecentCommunications(days = 30, limit = 100): Promise<CommLogEntry[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data } = await supabase
    .from('communication_log' as any)
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })
    .limit(limit)

  return ((data ?? []) as any[]).map(mapRow)
}

// ── Communication stats for a client ───────────────────────────────────

export async function getCommunicationStats(clientId?: string): Promise<CommStats> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  let q = supabase
    .from('communication_log' as any)
    .select('channel, created_at')
    .eq('tenant_id', user.tenantId!)

  if (clientId) {
    q = q.eq('client_id', clientId)
  }

  const { data } = await q.order('created_at', { ascending: false })
  const rows = (data ?? []) as any[]

  const channelBreakdown: Record<string, number> = {}
  for (const r of rows) {
    channelBreakdown[r.channel] = (channelBreakdown[r.channel] ?? 0) + 1
  }

  // Find preferred channel (most frequent)
  let preferredChannel: string | null = null
  let maxCount = 0
  for (const [ch, count] of Object.entries(channelBreakdown)) {
    if (count > maxCount) {
      maxCount = count
      preferredChannel = ch
    }
  }

  return {
    totalInteractions: rows.length,
    lastContactDate: rows.length > 0 ? rows[0].created_at : null,
    preferredChannel,
    channelBreakdown,
  }
}

// ── Last contact date for a client ─────────────────────────────────────

export async function getClientLastContact(clientId: string): Promise<string | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('communication_log' as any)
    .select('created_at')
    .eq('tenant_id', user.tenantId!)
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)

  const rows = (data ?? []) as any[]
  return rows.length > 0 ? rows[0].created_at : null
}
