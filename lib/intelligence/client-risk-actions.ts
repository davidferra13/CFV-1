'use server'

// Client Risk Radar - Server Actions
// Fetches data from PostgreSQL, feeds into the pure computation engine,
// and returns risk reports. Also handles dismiss/acknowledge.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  computeClientRiskRadar,
  type ClientData,
  type EventData,
  type TimelineEntry,
  type InquiryData,
  type QuoteData,
  type ClientRiskRadarResult,
  type ClientRiskReport,
} from './client-risk'

// ── Dismissed storage (client vibe_notes marker) ────────────────────────────

const RISK_DISMISSED_MARKER = '[RISK_DISMISSED]'

// ── Main radar action ───────────────────────────────────────────────────────

export async function getClientRiskRadar(): Promise<ClientRiskRadarResult> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  // Parallel fetch all data sources
  const [clientsRes, eventsRes, messagesRes, notesRes, inquiriesRes, quotesRes] =
    await Promise.all([
      db
        .from('clients')
        .select('id, full_name, created_at, vibe_notes')
        .eq('tenant_id', tenantId),
      db
        .from('events')
        .select('id, client_id, event_date, status, quoted_price_cents, guest_count')
        .eq('tenant_id', tenantId)
        .in('status', ['completed', 'confirmed', 'in_progress', 'paid', 'accepted'])
        .order('event_date', { ascending: true }),
      db
        .from('messages')
        .select('client_id, sent_at, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      db
        .from('client_notes')
        .select('client_id, created_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      db
        .from('inquiries')
        .select('id, client_id, status, updated_at')
        .eq('tenant_id', tenantId),
      db
        .from('quotes')
        .select('id, inquiry_id, status')
        .eq('tenant_id', tenantId),
    ])

  const rawClients = clientsRes.data || []
  const rawEvents = eventsRes.data || []
  const rawMessages = messagesRes.data || []
  const rawNotes = notesRes.data || []
  const rawInquiries = inquiriesRes.data || []
  const rawQuotes = quotesRes.data || []

  // Map to engine types
  const clients: ClientData[] = rawClients.map((c: any) => ({
    id: c.id,
    fullName: c.full_name ?? 'Unknown',
    createdAt: c.created_at,
    vibeNotes: c.vibe_notes,
  }))

  const events: EventData[] = rawEvents.map((e: any) => ({
    id: e.id,
    clientId: e.client_id,
    eventDate: e.event_date,
    status: e.status,
    quotedPriceCents: e.quoted_price_cents,
    guestCount: e.guest_count,
  }))

  // Build timeline from messages, notes, events, and inquiries
  const timeline: TimelineEntry[] = []
  for (const msg of rawMessages) {
    if (msg.client_id) {
      timeline.push({
        clientId: msg.client_id,
        date: msg.sent_at ?? msg.created_at,
        type: 'message',
      })
    }
  }
  for (const note of rawNotes) {
    if (note.client_id) {
      timeline.push({
        clientId: note.client_id,
        date: note.created_at,
        type: 'note',
      })
    }
  }
  for (const ev of rawEvents) {
    if (ev.client_id) {
      timeline.push({
        clientId: ev.client_id,
        date: ev.event_date,
        type: 'event',
      })
    }
  }

  const inquiries: InquiryData[] = rawInquiries.map((inq: any) => ({
    id: inq.id,
    clientId: inq.client_id,
    status: inq.status,
    updatedAt: inq.updated_at,
  }))

  const quotes: QuoteData[] = rawQuotes.map((q: any) => ({
    id: q.id,
    inquiryId: q.inquiry_id,
    status: q.status,
  }))

  // Dismissed clients
  const dismissedIds = new Set<string>(
    rawClients
      .filter((c: any) => c.vibe_notes?.includes(RISK_DISMISSED_MARKER))
      .map((c: any) => c.id)
  )

  return computeClientRiskRadar(clients, events, timeline, inquiries, quotes, dismissedIds)
}

// ── Single client detail ────────────────────────────────────────────────────

export async function getClientRiskDetail(
  clientId: string
): Promise<ClientRiskReport | null> {
  if (!clientId) return null
  const result = await getClientRiskRadar()
  return result.reports.find((r) => r.clientId === clientId) ?? null
}

// ── Dismiss risk ────────────────────────────────────────────────────────────

export async function dismissClientRisk(clientId: string): Promise<{ success: boolean }> {
  if (!clientId) return { success: false }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('clients')
    .select('vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return { success: false }

  const currentNotes = existing.vibe_notes ?? ''
  if (currentNotes.includes(RISK_DISMISSED_MARKER)) {
    return { success: true } // already dismissed
  }

  const { error } = await db
    .from('clients')
    .update({ vibe_notes: `${currentNotes}\n${RISK_DISMISSED_MARKER}`.trim() })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[dismissClientRisk] Failed:', error)
    return { success: false }
  }

  revalidatePath('/analytics/intelligence/client-risk')
  return { success: true }
}

// ── Undismiss risk ──────────────────────────────────────────────────────────

export async function undismissClientRisk(clientId: string): Promise<{ success: boolean }> {
  if (!clientId) return { success: false }

  const user = await requireChef()
  const tenantId = user.tenantId!
  const db: any = createServerClient()

  const { data: existing } = await db
    .from('clients')
    .select('vibe_notes')
    .eq('id', clientId)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return { success: false }

  const currentNotes = (existing.vibe_notes ?? '').replace(RISK_DISMISSED_MARKER, '').trim()

  const { error } = await db
    .from('clients')
    .update({ vibe_notes: currentNotes })
    .eq('id', clientId)
    .eq('tenant_id', tenantId)

  if (error) {
    console.error('[undismissClientRisk] Failed:', error)
    return { success: false }
  }

  revalidatePath('/analytics/intelligence/client-risk')
  return { success: true }
}
