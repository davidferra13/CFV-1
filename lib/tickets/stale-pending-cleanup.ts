import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import type Stripe from 'stripe'

const DEFAULT_STALE_PENDING_TICKET_HOURS = 48
const DEFAULT_STALE_PENDING_TICKET_LIMIT = 100
const CLEANUP_CANCEL_REASON = 'Stale pending checkout cleanup'

type DbClient = any

type StripeLike = {
  checkout: {
    sessions: {
      retrieve: (id: string) => Promise<Pick<Stripe.Checkout.Session, 'id' | 'status'>>
    }
  }
}

export type StalePendingTicketRow = {
  id: string
  event_id: string
  tenant_id: string
  ticket_type_id: string | null
  quantity: number | null
  payment_status: string | null
  capacity_released_at: string | null
  stripe_checkout_session_id: string | null
  created_at: string | null
}

export type StalePendingTicketCleanupResult = {
  checked: number
  cancelled: number
  skippedComplete: number
  unverifiable: number
  alreadyReleased: number
  cancelCasMisses: number
  errors: number
  cutoffIso: string
  staleHours: number
  ticketIds: string[]
  unverifiableTicketIds: string[]
  errorTicketIds: string[]
}

export type CleanupStalePendingTicketsOptions = {
  db?: DbClient
  stripe?: StripeLike | null
  now?: Date
  staleHours?: number
  limit?: number
  revalidate?: (path: string) => void
}

function getConfiguredStaleHours() {
  const value = Number(process.env.STALE_PENDING_TICKET_HOURS)
  return Number.isFinite(value) && value > 0 ? value : DEFAULT_STALE_PENDING_TICKET_HOURS
}

function getConfiguredLimit() {
  const value = Number(process.env.STALE_PENDING_TICKET_LIMIT)
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_STALE_PENDING_TICKET_LIMIT
}

function getStripeFromEnv(): StripeLike | null {
  if (!process.env.STRIPE_SECRET_KEY) return null

  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

async function fetchStalePendingTickets(input: {
  db: DbClient
  cutoffIso: string
  limit: number
}): Promise<StalePendingTicketRow[]> {
  const { data, error } = await input.db
    .from('event_tickets')
    .select(
      'id, event_id, tenant_id, ticket_type_id, quantity, payment_status, capacity_released_at, stripe_checkout_session_id, created_at'
    )
    .eq('payment_status', 'pending')
    .lt('created_at', input.cutoffIso)
    .order('created_at', { ascending: true })
    .limit(input.limit)

  if (error) throw new Error(`Failed to fetch stale pending tickets: ${error.message}`)
  return data ?? []
}

async function releaseTicketTypeCapacity(db: DbClient, ticket: StalePendingTicketRow) {
  if (!ticket.ticket_type_id || ticket.capacity_released_at) return false

  const { data: ticketType, error } = await db
    .from('event_ticket_types')
    .select('sold_count')
    .eq('id', ticket.ticket_type_id)
    .eq('tenant_id', ticket.tenant_id)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch ticket type capacity: ${error.message}`)
  if (!ticketType) return false

  const soldCount = Number(ticketType.sold_count ?? 0)
  await db
    .from('event_ticket_types')
    .update({ sold_count: Math.max(0, soldCount - Number(ticket.quantity ?? 0)) })
    .eq('id', ticket.ticket_type_id)
    .eq('tenant_id', ticket.tenant_id)
    .eq('sold_count', ticketType.sold_count)

  return true
}

async function releaseAddonCapacity(db: DbClient, ticket: StalePendingTicketRow) {
  if (ticket.capacity_released_at) return 0

  const { data: purchases, error } = await db
    .from('event_ticket_addon_purchases')
    .select('addon_id, quantity')
    .eq('ticket_id', ticket.id)

  if (error) throw new Error(`Failed to fetch ticket add-on purchases: ${error.message}`)

  let released = 0
  for (const purchase of purchases ?? []) {
    const quantity = Number(purchase.quantity ?? 0)
    if (!purchase.addon_id || quantity <= 0) continue

    const { data: addon, error: addonError } = await db
      .from('event_ticket_addons')
      .select('sold_count')
      .eq('id', purchase.addon_id)
      .eq('tenant_id', ticket.tenant_id)
      .maybeSingle()

    if (addonError) throw new Error(`Failed to fetch add-on capacity: ${addonError.message}`)
    if (!addon) continue

    const soldCount = Number(addon.sold_count ?? 0)
    await db
      .from('event_ticket_addons')
      .update({ sold_count: Math.max(0, soldCount - quantity) })
      .eq('id', purchase.addon_id)
      .eq('tenant_id', ticket.tenant_id)
      .eq('sold_count', addon.sold_count)

    released++
  }

  return released
}

async function cancelTicketAfterVerification(input: {
  db: DbClient
  ticket: StalePendingTicketRow
  nowIso: string
}) {
  const { data, error } = await input.db
    .from('event_tickets')
    .update({
      payment_status: 'cancelled',
      last_payment_error: CLEANUP_CANCEL_REASON,
      retry_available_at: input.nowIso,
      cancelled_at: input.nowIso,
    })
    .eq('id', input.ticket.id)
    .eq('tenant_id', input.ticket.tenant_id)
    .eq('payment_status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`Failed to mark ticket cancelled: ${error.message}`)
  return Boolean(data?.id)
}

async function markCapacityReleased(input: {
  db: DbClient
  ticket: StalePendingTicketRow
  nowIso: string
}) {
  const { data, error } = await input.db
    .from('event_tickets')
    .update({ capacity_released_at: input.ticket.capacity_released_at ?? input.nowIso })
    .eq('id', input.ticket.id)
    .eq('tenant_id', input.ticket.tenant_id)
    .eq('payment_status', 'pending')
    .select('id')
    .maybeSingle()

  if (error) throw new Error(`Failed to mark ticket capacity released: ${error.message}`)
  return Boolean(data?.id)
}

export async function cleanupStalePendingTickets(
  options: CleanupStalePendingTicketsOptions = {}
): Promise<StalePendingTicketCleanupResult> {
  const db = options.db ?? createServerClient({ admin: true })
  const stripe = options.stripe === undefined ? getStripeFromEnv() : options.stripe
  const now = options.now ?? new Date()
  const staleHours = options.staleHours ?? getConfiguredStaleHours()
  const limit = options.limit ?? getConfiguredLimit()
  const revalidate = options.revalidate ?? revalidatePath
  const cutoffIso = new Date(now.getTime() - staleHours * 60 * 60 * 1000).toISOString()
  const nowIso = now.toISOString()
  const tickets = await fetchStalePendingTickets({ db, cutoffIso, limit })

  const result: StalePendingTicketCleanupResult = {
    checked: tickets.length,
    cancelled: 0,
    skippedComplete: 0,
    unverifiable: 0,
    alreadyReleased: 0,
    cancelCasMisses: 0,
    errors: 0,
    cutoffIso,
    staleHours,
    ticketIds: [],
    unverifiableTicketIds: [],
    errorTicketIds: [],
  }

  const revalidateEvents = new Set<string>()

  for (const ticket of tickets) {
    try {
      if (!ticket.stripe_checkout_session_id || !stripe) {
        result.unverifiable++
        result.unverifiableTicketIds.push(ticket.id)
        continue
      }

      const session = await stripe.checkout.sessions.retrieve(ticket.stripe_checkout_session_id)
      if (session.status === 'complete') {
        result.skippedComplete++
        continue
      }

      if (ticket.capacity_released_at) {
        result.alreadyReleased++
      } else {
        await releaseTicketTypeCapacity(db, ticket)
        await releaseAddonCapacity(db, ticket)
        const markedReleased = await markCapacityReleased({ db, ticket, nowIso })
        if (!markedReleased) {
          result.cancelCasMisses++
          continue
        }
      }

      const cancelled = await cancelTicketAfterVerification({ db, ticket, nowIso })
      if (!cancelled) {
        result.cancelCasMisses++
        continue
      }

      result.cancelled++
      result.ticketIds.push(ticket.id)
      revalidateEvents.add(ticket.event_id)
    } catch (err) {
      result.errors++
      result.errorTicketIds.push(ticket.id)
      console.error('[stale-ticket-cleanup] Failed ticket cleanup:', {
        ticketId: ticket.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  for (const eventId of revalidateEvents) {
    revalidate(`/events/${eventId}`)
  }

  return result
}
