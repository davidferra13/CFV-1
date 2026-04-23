'use server'

// Client Portal Actions
// Token-based magic-link access for clients with no account required.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { dateToDateString } from '@/lib/utils/format'
import { createPaymentCheckoutUrl } from '@/lib/stripe/checkout'
import {
  generateClientPortalTokenValue,
  getClientPortalTokenExpiry,
  hashClientPortalToken,
  isClientPortalTokenExpired,
} from './token'

export type ClientPortalData = {
  clientId: string
  clientName: string
  chefName: string | null
  chefBusinessName: string | null
  chefSlug: string | null
  chefBookingSlug: string | null
  chefBookingEnabled: boolean
  upcomingEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
    guest_count: number | null
    outstandingCents: number
  }>
  pastEvents: Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
  }>
  pendingProposals: Array<{
    id: string
    eventId: string | null
    title: string
    eventOccasion: string | null
    amountCents: number
    expiresAt: string | null
    status: string
    publicUrl: string
  }>
  pendingPayments: Array<{
    eventId: string
    occasion: string | null
    outstandingCents: number
    paymentUrl: string
  }>
  paymentHistory: Array<{
    id: string
    date: string
    amountCents: number
    type: string
    eventOccasion: string | null
  }>
}

export type ClientPortalPaymentLinkResult =
  | { status: 'ok'; checkoutUrl: string }
  | { status: 'not_found' }
  | { status: 'unavailable' }

export type ClientPortalTokenState = {
  token: string | null
  createdAt: string | null
  expiresAt: string | null
  lastUsedAt: string | null
  hasActiveLink: boolean
}

type ClientPortalLookupRow = {
  id: string
  tenant_id: string | null
  full_name: string | null
  portal_access_token: string | null
  portal_access_token_hash: string | null
  portal_token_created_at: string | null
  portal_token_expires_at: string | null
  portal_token_last_used_at?: string | null
  portal_token_revoked_at: string | null
}

type ResolvedClientPortalAccess = {
  normalizedToken: string
  clientId: string
  clientName: string
  tenantId: string
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

async function resolveClientPortalAccess(
  db: any,
  token: string
): Promise<ResolvedClientPortalAccess | null> {
  const normalizedToken = token.trim()
  if (!normalizedToken) return null

  const tokenHash = hashClientPortalToken(normalizedToken)
  const selectColumns = [
    'id',
    'tenant_id',
    'full_name',
    'portal_access_token',
    'portal_access_token_hash',
    'portal_token_created_at',
    'portal_token_expires_at',
    'portal_token_revoked_at',
  ].join(', ')

  const { data: hashedClient } = await db
    .from('clients')
    .select(selectColumns)
    .eq('portal_access_token_hash', tokenHash)
    .is('deleted_at', null)
    .maybeSingle()

  let client = (hashedClient ?? null) as ClientPortalLookupRow | null
  let matchedLegacyToken = false

  if (!client) {
    const { data: legacyClient } = await db
      .from('clients')
      .select(selectColumns)
      .eq('portal_access_token', normalizedToken)
      .is('deleted_at', null)
      .maybeSingle()

    client = (legacyClient ?? null) as ClientPortalLookupRow | null
    matchedLegacyToken = !!client
  }

  if (!client || !hasActivePortalLink(client) || !client.tenant_id) {
    return null
  }

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

  return {
    normalizedToken,
    clientId: client.id,
    clientName: client.full_name || 'Valued Client',
    tenantId: client.tenant_id,
  }
}

export async function generateClientPortalToken(
  clientId: string
): Promise<{ token: string; expiresAt: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

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

export async function getClientPortalData(token: string): Promise<ClientPortalData | null> {
  const db: any = createServerClient({ admin: true })
  const access = await resolveClientPortalAccess(db, token)
  if (!access) return null

  const { clientId, clientName, tenantId, normalizedToken } = access
  const today = dateToDateString(new Date())

  const [{ data: chef }, { data: rawEvents }, { data: rawProposals }] = await Promise.all([
    db
      .from('chefs')
      .select('display_name, business_name, slug, booking_slug, booking_enabled')
      .eq('id', tenantId)
      .maybeSingle(),
    db
      .from('events')
      .select('id, occasion, event_date, status, guest_count')
      .eq('client_id', clientId)
      .eq('tenant_id', tenantId)
      .not('status', 'eq', 'cancelled')
      .order('event_date', { ascending: true }),
    db
      .from('client_proposals')
      .select('id, event_id, title, total_price_cents, expires_at, status, share_token, created_at')
      .eq('client_id', clientId)
      .in('status', ['sent', 'viewed'])
      .order('created_at', { ascending: false }),
  ])

  const events = (rawEvents ?? []) as Array<{
    id: string
    occasion: string | null
    event_date: string
    status: string
    guest_count: number | null
  }>
  const eventIds = events.map((event) => event.id)
  const eventMap = new Map(events.map((event) => [event.id, event]))

  const outstandingByEvent = new Map<string, number>()
  if (eventIds.length > 0) {
    const { data: summaries } = await db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents')
      .in('event_id', eventIds)

    for (const summary of (summaries ?? []).filter((row: any) => row.event_id != null)) {
      outstandingByEvent.set(
        String(summary.event_id),
        Number(summary.outstanding_balance_cents ?? 0)
      )
    }
  }

  const upcomingEvents = events
    .filter(
      (event) =>
        dateToDateString(event.event_date as Date | string) >= today && event.status !== 'completed'
    )
    .map((event) => ({
      ...event,
      outstandingCents: outstandingByEvent.get(event.id) ?? 0,
    }))

  const pastEvents = events
    .filter(
      (event) =>
        event.status === 'completed' || dateToDateString(event.event_date as Date | string) < today
    )
    .slice(-5)
    .reverse()

  const pendingPayments: ClientPortalData['pendingPayments'] = upcomingEvents
    .filter(
      (event) =>
        (outstandingByEvent.get(event.id) ?? 0) > 0 &&
        ['accepted', 'paid', 'confirmed', 'in_progress', 'completed'].includes(event.status)
    )
    .map((event) => ({
      eventId: event.id,
      occasion: event.occasion,
      outstandingCents: outstandingByEvent.get(event.id) ?? 0,
      paymentUrl: `/client/${normalizedToken}/pay/${event.id}`,
    }))

  const seenProposalKeys = new Set<string>()
  const pendingProposals: ClientPortalData['pendingProposals'] = []
  for (const proposal of (rawProposals ?? []) as Array<{
    id: string
    event_id: string | null
    title: string | null
    total_price_cents: number | null
    expires_at: string | null
    status: string
    share_token: string | null
  }>) {
    if (!proposal.share_token) continue

    const dedupeKey = proposal.event_id || proposal.id
    if (seenProposalKeys.has(dedupeKey)) continue
    seenProposalKeys.add(dedupeKey)

    pendingProposals.push({
      id: proposal.id,
      eventId: proposal.event_id,
      title: proposal.title?.trim() || 'Proposal ready for review',
      eventOccasion: proposal.event_id ? eventMap.get(proposal.event_id)?.occasion ?? null : null,
      amountCents: proposal.total_price_cents ?? 0,
      expiresAt: proposal.expires_at,
      status: proposal.status,
      publicUrl: `/proposal/${proposal.share_token}`,
    })
  }

  let paymentHistory: ClientPortalData['paymentHistory'] = []
  if (eventIds.length > 0) {
    const { data: payments } = await db
      .from('ledger_entries')
      .select('id, amount_cents, entry_type, created_at, event_id')
      .in('event_id', eventIds)
      .eq('is_refund', false)
      .not('entry_type', 'eq', 'tip')
      .order('created_at', { ascending: false })
      .limit(20)

    paymentHistory = (payments ?? []).map((payment: any) => ({
      id: payment.id,
      date: payment.created_at,
      amountCents: payment.amount_cents ?? 0,
      type: payment.entry_type ?? 'payment',
      eventOccasion: eventMap.get(payment.event_id)?.occasion ?? null,
    }))
  }

  return {
    clientId,
    clientName,
    chefName: chef?.display_name ?? null,
    chefBusinessName: chef?.business_name ?? null,
    chefSlug: chef?.slug ?? null,
    chefBookingSlug: chef?.booking_slug ?? null,
    chefBookingEnabled: chef?.booking_enabled === true,
    upcomingEvents,
    pastEvents,
    pendingProposals,
    pendingPayments,
    paymentHistory,
  }
}

export async function getClientPortalPaymentCheckoutUrl(
  token: string,
  eventId: string
): Promise<ClientPortalPaymentLinkResult> {
  const db: any = createServerClient({ admin: true })
  const access = await resolveClientPortalAccess(db, token)
  if (!access) {
    return { status: 'not_found' }
  }

  const { clientId, tenantId, normalizedToken } = access
  const { data: event } = await db
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('client_id', clientId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!event) {
    return { status: 'not_found' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.cheflowhq.com'
  const successUrl = `${appUrl}/client/${normalizedToken}?payment=success&event=${encodeURIComponent(eventId)}`
  const cancelUrl = `${appUrl}/client/${normalizedToken}?payment=cancelled&event=${encodeURIComponent(eventId)}`

  const checkoutUrl = await createPaymentCheckoutUrl(eventId, tenantId, {
    successUrl,
    cancelUrl,
  })

  if (!checkoutUrl) {
    return { status: 'unavailable' }
  }

  return { status: 'ok', checkoutUrl }
}

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
