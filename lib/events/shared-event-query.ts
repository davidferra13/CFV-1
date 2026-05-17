'use server'

// Shared Event Query Helpers
// Centralized query functions for common event lookups.
// Consumers import these instead of writing raw .from('events') calls.
// All functions take a compat DB client as first arg, always scope by tenant_id,
// and return { data, error } matching the existing query builder pattern.

import type { CompatClient } from '@/lib/db/compat'

// ─── Core Fields ────────────────────────────────────────────────────────────

/** The standard set of event columns most consumers need. */
const EVENT_BASE_FIELDS = [
  'id',
  'status',
  'event_date',
  'client_id',
  'guest_count',
  'occasion',
  'title',
  'venue_name',
  'serve_time',
  'arrival_time',
  'service_style',
  'event_type',
  'tenant_id',
  'staff_count',
  'service_hours',
  'travel_time_minutes',
  'menu_locked',
].join(', ')

/** Extended fields when client info is joined. */
const EVENT_WITH_CLIENT_FIELDS =
  EVENT_BASE_FIELDS +
  ', client:clients!events_client_id_fkey(id, full_name, first_name, last_name, email, phone)'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EventBase {
  id: string
  status: string
  event_date: string | null
  client_id: string | null
  guest_count: number | null
  occasion: string | null
  title: string | null
  venue_name: string | null
  serve_time: string | null
  arrival_time: string | null
  service_style: string | null
  event_type: string | null
  tenant_id: string
  staff_count: number | null
  service_hours: number | null
  travel_time_minutes: number | null
  menu_locked: boolean | null
}

export interface EventClient {
  id: string
  full_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  phone: string | null
}

export interface EventWithClient extends EventBase {
  client: EventClient | EventClient[] | null
}

interface QueryResult<T> {
  data: T | null
  error: { message: string; code?: string; details?: string; hint?: string } | null
}

interface QueryListResult<T> {
  data: T[] | null
  error: { message: string; code?: string; details?: string; hint?: string } | null
}

// ─── Query Functions ────────────────────────────────────────────────────────

/**
 * Load core event fields by ID, scoped to tenant.
 */
export async function getEventBase(
  db: CompatClient,
  eventId: string,
  tenantId: string
): Promise<QueryResult<EventBase>> {
  return db
    .from('events')
    .select(EVENT_BASE_FIELDS)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
}

/**
 * Load event with joined client info (name, email, phone).
 */
export async function getEventWithClient(
  db: CompatClient,
  eventId: string,
  tenantId: string
): Promise<QueryResult<EventWithClient>> {
  return db
    .from('events')
    .select(EVENT_WITH_CLIENT_FIELDS)
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .single()
}

/**
 * Upcoming events for a tenant (non-cancelled, future dates).
 * Ordered by event_date ascending.
 */
export async function getUpcomingEvents(
  db: CompatClient,
  tenantId: string,
  opts?: { limit?: number; daysAhead?: number }
): Promise<QueryListResult<EventBase>> {
  const limit = opts?.limit ?? 25
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  let query = db
    .from('events')
    .select(EVENT_BASE_FIELDS)
    .eq('tenant_id', tenantId)
    .neq('status', 'cancelled')
    .gte('event_date', todayStr)
    .is('deleted_at', null)
    .order('event_date', { ascending: true })
    .limit(limit)

  if (opts?.daysAhead) {
    const future = new Date(now.getTime() + opts.daysAhead * 86_400_000)
    const futureStr = future.toISOString().slice(0, 10)
    query = query.lte('event_date', futureStr)
  }

  return query
}

/**
 * Completed events for a tenant, ordered by event_date descending.
 * Optionally filtered to a specific client.
 */
export async function getCompletedEvents(
  db: CompatClient,
  tenantId: string,
  opts?: { limit?: number; clientId?: string }
): Promise<QueryListResult<EventBase>> {
  const limit = opts?.limit ?? 25

  let query = db
    .from('events')
    .select(EVENT_BASE_FIELDS)
    .eq('tenant_id', tenantId)
    .eq('status', 'completed')
    .is('deleted_at', null)
    .order('event_date', { ascending: false })
    .limit(limit)

  if (opts?.clientId) {
    query = query.eq('client_id', opts.clientId)
  }

  return query
}

/**
 * Events filtered by one or more statuses, scoped to tenant.
 * Excludes soft-deleted events. Ordered by event_date ascending.
 */
export async function getEventsByStatus(
  db: CompatClient,
  tenantId: string,
  statuses: string[]
): Promise<QueryListResult<EventBase>> {
  return db
    .from('events')
    .select(EVENT_BASE_FIELDS)
    .eq('tenant_id', tenantId)
    .in('status', statuses)
    .is('deleted_at', null)
    .order('event_date', { ascending: true })
}
