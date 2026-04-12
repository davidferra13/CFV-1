'use server'

// Client Portal Actions
// Token-based magic-link access for clients - no account required.
// Chefs generate a token on the client detail page and share it.
// The token URL gives the client a read-mostly view of their events, quotes, and payments.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import {
  generateClientPortalTokenValue,
  getClientPortalTokenExpiry,
  hashClientPortalToken,
  isClientPortalTokenExpired,
} from './token'

export type ClientPortalData = {
  clientId: string
  clientName: string
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
    guest_count: number | null
  }>
  pastEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
  }>
  activeQuotes: Array<{
    id: string
    event_id: string
    event_occasion: string | null
    amount_cents: number
    valid_until: string | null
    status: string
  }>
  pendingPayments: Array<{
    eventId: string
    occasion: string | null
    outstandingCents: number
    paymentUrl: string
  }>
}

export type ClientPortalTokenState = {
  token: string | null
  createdAt: string | null
  expiresAt: string | null
  lastUsedAt: string | null
  hasActiveLink: boolean
}

type ClientPortalLookupRow = {
  id: string
  full_name: string | null
  portal_access_token: string | null
  portal_access_token_hash: string | null
  portal_token_created_at: string | null
  portal_token_expires_at: string | null
  portal_token_last_used_at?: string | null
  portal_token_revoked_at: string | null
}

function resolvePortalTokenExpiry(
  row: Partial<ClientPortalLookupRow> | null | undefined
): string | null {
  if (!row) return null
  if (row.portal_token_expires_at) return row.portal_token_expires_at
  if (!row.portal_token_created_at) return null
  return getClientPortalTokenExpiry(new Date(row.portal_token_created_at)).toISOString()
}

function hasActivePortalLink(row: Partial<ClientPortalLookupRow> | null | undefined): boolean {
  if (!row) return false
  if (row.portal_token_revoked_at) return false
  if (!(row.portal_access_token_hash || row.portal_access_token)) return false
  return !isClientPortalTokenExpired(resolvePortalTokenExpiry(row))
}

// ─── Chef action: generate or rotate portal token ─────────────────────────────

export async function generateClientPortalToken(
  clientId: string
): Promise<{ token: string; expiresAt: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Verify ownership
  const { data: client } = await db
    .from('clients')
    .select('id')
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!client) throw new Error('Client not found')

  const token = generateClientPortalTokenValue()
  const expiresAt = getClientPortalTokenExpiry().toISOString()

  await db
    .from('clients')
    .update({
      portal_access_token: null,
      portal_access_token_hash: hashClientPortalToken(token),
      portal_token_created_at: new Date().toISOString(),
      portal_token_expires_at: expiresAt,
      portal_token_last_used_at: null,
      portal_token_revoked_at: null,
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
  return { token, expiresAt }
}

// ─── Chef action: revoke portal token ─────────────────────────────────────────

export async function revokeClientPortalToken(clientId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  await db
    .from('clients')
    .update({
      portal_access_token: null,
      portal_access_token_hash: null,
      portal_token_created_at: null,
      portal_token_expires_at: null,
      portal_token_last_used_at: null,
      portal_token_revoked_at: new Date().toISOString(),
    })
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)

  revalidatePath(`/clients/${clientId}`)
}

// ─── Public: look up client by portal token ────────────────────────────────────
// No auth required - token IS the credential.

export async function getClientPortalData(token: string): Promise<ClientPortalData | null> {
  // Use admin client for public read (no user session)
  const db: any = createServerClient({ admin: true })
  const normalizedToken = token.trim()
  if (!normalizedToken) return null
  const tokenHash = hashClientPortalToken(normalizedToken)

  // Prefer hashed token lookup; fall back to legacy raw token rows during migration.
  const selectColumns =
    'id, full_name, portal_access_token, portal_access_token_hash, portal_token_created_at, portal_token_expires_at, portal_token_revoked_at'

  const { data: hashedClient } = await db
    .from('clients')
    .select(selectColumns)
    .eq('portal_access_token_hash', tokenHash)
    .maybeSingle()

  let client = (hashedClient ?? null) as ClientPortalLookupRow | null
  let matchedLegacyToken = false

  if (!client) {
    const { data: legacyClient } = await db
      .from('clients')
      .select(selectColumns)
      .eq('portal_access_token', normalizedToken)
      .maybeSingle()

    client = (legacyClient ?? null) as ClientPortalLookupRow | null
    matchedLegacyToken = !!client
  }

  if (!client || !hasActivePortalLink(client)) return null

  const nowIso = new Date().toISOString()
  const expiresAt = resolvePortalTokenExpiry(client)
  if (!expiresAt) return null

  if (matchedLegacyToken) {
    await db
      .from('clients')
      .update({
        portal_access_token: null,
        portal_access_token_hash: tokenHash,
        portal_token_expires_at: expiresAt,
        portal_token_last_used_at: nowIso,
        portal_token_revoked_at: null,
      })
      .eq('id', client.id)
  } else {
    await db
      .from('clients')
      .update({
        portal_token_last_used_at: nowIso,
      })
      .eq('id', client.id)
  }

  const clientId = client.id
  const clientName = client.full_name || 'Valued Client'

  const now = new Date().toISOString()

  // Fetch events for this client
  const { data: events } = await db
    .from('events')
    .select('id, occasion, event_date, status, guest_count')
    .eq('client_id', clientId)
    .not('status', 'eq', 'cancelled')
    .order('event_date', { ascending: true })

  const upcoming = (events ?? []).filter(
    (e: any) => e.event_date >= now && !['completed'].includes(e.status)
  )
  const past = (events ?? [])
    .filter((e: any) => e.status === 'completed' || e.event_date < now)
    .slice(-5)

  // Fetch active (sent) quotes for this client's events
  const eventIds = (events ?? []).map((e: any) => e.id)
  let activeQuotes: ClientPortalData['activeQuotes'] = []

  if (eventIds.length > 0) {
    const { data: quotes } = await db
      .from('quotes')
      .select('id, event_id, total_quoted_cents, valid_until, status')
      .in('event_id', eventIds)
      .eq('status', 'sent')

    const eventMap = new Map((events ?? []).map((e: any) => [e.id, e]))
    activeQuotes = (quotes ?? [])
      .filter((q: any) => q.event_id != null)
      .map((q: any) => ({
        id: q.id,
        event_id: q.event_id!,
        event_occasion: (eventMap.get(q.event_id!) as any)?.occasion ?? null,
        amount_cents: q.total_quoted_cents ?? 0,
        valid_until: q.valid_until,
        status: q.status,
      }))
  }

  // Fetch outstanding payments from event_financial_summary
  const pendingPayments: ClientPortalData['pendingPayments'] = []
  if (eventIds.length > 0) {
    const { data: summaries } = await db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents, payment_status')
      .in('event_id', eventIds)
      .gt('outstanding_balance_cents', 0)

    const eventMap = new Map((events ?? []).map((e: any) => [e.id, e]))
    for (const s of (summaries ?? []).filter((s: any) => s.event_id != null)) {
      const ev = eventMap.get(s.event_id!)
      if (!ev) continue
      pendingPayments.push({
        eventId: s.event_id!,
        occasion: (ev as any).occasion,
        outstandingCents: s.outstanding_balance_cents ?? 0,
        paymentUrl: `/my-events/${s.event_id!}/pay`,
      })
    }
  }

  return {
    clientId,
    clientName,
    upcomingEvents: upcoming,
    pastEvents: past,
    pendingPayments,
    activeQuotes,
  }
}

// ─── Chef: get portal token for a client (for display on client detail) ───────

export async function getClientPortalToken(clientId: string): Promise<ClientPortalTokenState> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('clients')
    .select(
      'portal_access_token, portal_access_token_hash, portal_token_created_at, portal_token_expires_at, portal_token_last_used_at, portal_token_revoked_at'
    )
    .eq('id', clientId)
    .eq('tenant_id', user.tenantId!)
    .single()

  const row = (data ?? null) as Partial<ClientPortalLookupRow> | null
  const expiresAt = resolvePortalTokenExpiry(row)

  return {
    token: row?.portal_access_token ?? null,
    createdAt: row?.portal_token_created_at ?? null,
    expiresAt,
    lastUsedAt: row?.portal_token_last_used_at ?? null,
    hasActiveLink: hasActivePortalLink(row),
  }
}
