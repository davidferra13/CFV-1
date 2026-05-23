'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildChefLifeDashboardSynthesis,
  type ChefLifeDashboardSynthesis,
  type ChefLifeSynthesisSignal,
  type ChefLifeSynthesisUrgency,
} from '@/lib/dashboard/chef-life-synthesis'

type DbClient = ReturnType<typeof createServerClient> & { from: (table: string) => any }

type EventRow = {
  id: string
  event_date: string
  occasion: string | null
  status: string | null
  guest_count: number | null
  guest_count_confirmed: boolean | null
  client_id: string | null
  menu_id: string | null
  location_address: string | null
  grocery_list_ready: boolean | null
  prep_list_ready: boolean | null
  equipment_list_ready: boolean | null
  packing_list_ready: boolean | null
  timeline_ready: boolean | null
  execution_sheet_ready: boolean | null
}

type ClientRow = {
  id: string
  full_name: string | null
  parking_instructions: string | null
  access_instructions: string | null
  kitchen_constraints: string | null
  equipment_available: string[] | null
  equipment_must_bring: string[] | null
}

type FinancialRow = {
  event_id: string | null
  outstanding_balance_cents: number | null
  total_paid_cents: number | null
  quoted_price_cents: number | null
}

type CertificationRow = {
  id: string
  name: string | null
  cert_name: string | null
  cert_type: string | null
  expires_at: string | null
  expiry_date: string | null
  status: string | null
  updated_at: string | null
}

type IncidentRow = {
  id: string
  incident_type: string | null
  description: string | null
  incident_date: string | null
  resolution_status: string | null
  updated_at: string | null
}

type VendorRow = {
  id: string
  name: string | null
  status: string | null
  rating: number | null
  reliability_score: number | string | null
  updated_at: string | null
}

type GoalRow = {
  id: string
  label: string | null
  goal_type: string | null
  status: string | null
  period_end: string | null
  updated_at: string | null
}

const DAY_MS = 86_400_000

export async function getChefLifeDashboardSynthesis(): Promise<ChefLifeDashboardSynthesis> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const chefId = user.entityId ?? tenantId
  const db = createServerClient() as DbClient
  const now = new Date()
  const today = isoDate(now)
  const weekEnd = isoDate(new Date(now.getTime() + 7 * DAY_MS))

  const events = await loadUpcomingEvents(db, tenantId, today, weekEnd)
  const eventIds = events.map((event) => event.id)
  const clientIds = Array.from(new Set(events.map((event) => event.client_id).filter(Boolean)))

  const [clients, financials, certifications, incidents, vendors, goals] = await Promise.all([
    loadClients(db, tenantId, clientIds as string[]),
    loadFinancialRows(db, tenantId, eventIds),
    loadCertifications(db, tenantId),
    loadOpenIncidents(db, tenantId),
    loadVendorRisks(db, chefId),
    loadActiveGoals(db, tenantId, today, weekEnd),
  ])

  const signals: ChefLifeSynthesisSignal[] = [
    deriveCapacitySignal(events, now),
    deriveComplianceSignal(certifications, now),
    deriveEventReadinessSignal(events, now),
    deriveFinancialSignal(financials, events, now),
    deriveCrisisSignal(incidents, now),
    deriveVendorSignal(vendors, now),
    deriveHouseholdSignal(events, clients, now),
    deriveStrategySignal(goals, now),
  ].filter((signal): signal is ChefLifeSynthesisSignal => Boolean(signal))

  return buildChefLifeDashboardSynthesis(signals, { now })
}

async function loadUpcomingEvents(
  db: DbClient,
  tenantId: string,
  today: string,
  weekEnd: string
): Promise<EventRow[]> {
  const { data, error } = await db
    .from('events')
    .select(
      [
        'id',
        'event_date',
        'occasion',
        'status',
        'guest_count',
        'guest_count_confirmed',
        'client_id',
        'menu_id',
        'location_address',
        'grocery_list_ready',
        'prep_list_ready',
        'equipment_list_ready',
        'packing_list_ready',
        'timeline_ready',
        'execution_sheet_ready',
      ].join(', ')
    )
    .eq('tenant_id', tenantId)
    .gte('event_date', today)
    .lte('event_date', weekEnd)
    .not('status', 'in', '("completed","cancelled")')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('[ChefLifeSynthesis] events failed:', error)
    return []
  }
  return (data ?? []) as EventRow[]
}

async function loadClients(
  db: DbClient,
  tenantId: string,
  clientIds: string[]
): Promise<ClientRow[]> {
  if (clientIds.length === 0) return []
  const { data, error } = await db
    .from('clients')
    .select(
      'id, full_name, parking_instructions, access_instructions, kitchen_constraints, equipment_available, equipment_must_bring'
    )
    .eq('tenant_id', tenantId)
    .in('id', clientIds)

  if (error) {
    console.error('[ChefLifeSynthesis] clients failed:', error)
    return []
  }
  return (data ?? []) as ClientRow[]
}

async function loadFinancialRows(
  db: DbClient,
  tenantId: string,
  eventIds: string[]
): Promise<FinancialRow[]> {
  if (eventIds.length === 0) return []
  const { data, error } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, total_paid_cents, quoted_price_cents')
    .eq('tenant_id', tenantId)
    .in('event_id', eventIds)

  if (error) {
    console.error('[ChefLifeSynthesis] financial summary failed:', error)
    return []
  }
  return (data ?? []) as FinancialRow[]
}

async function loadCertifications(db: DbClient, tenantId: string): Promise<CertificationRow[]> {
  const { data, error } = await db
    .from('chef_certifications')
    .select('id, name, cert_name, cert_type, expires_at, expiry_date, status, updated_at')
    .eq('tenant_id', tenantId)
    .order('expires_at', { ascending: true, nullsFirst: false })

  if (error) {
    console.error('[ChefLifeSynthesis] certifications failed:', error)
    return []
  }
  return (data ?? []) as CertificationRow[]
}

async function loadOpenIncidents(db: DbClient, tenantId: string): Promise<IncidentRow[]> {
  const { data, error } = await db
    .from('chef_incidents')
    .select('id, incident_type, description, incident_date, resolution_status, updated_at')
    .eq('tenant_id', tenantId)
    .in('resolution_status', ['open', 'in_progress'])
    .order('incident_date', { ascending: false, nullsFirst: false })
    .limit(5)

  if (error) {
    console.error('[ChefLifeSynthesis] incidents failed:', error)
    return []
  }
  return (data ?? []) as IncidentRow[]
}

async function loadVendorRisks(db: DbClient, chefId: string): Promise<VendorRow[]> {
  const { data, error } = await db
    .from('vendors')
    .select('id, name, status, rating, reliability_score, updated_at')
    .eq('chef_id', chefId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(25)

  if (error) {
    console.error('[ChefLifeSynthesis] vendors failed:', error)
    return []
  }
  return (data ?? []) as VendorRow[]
}

async function loadActiveGoals(
  db: DbClient,
  tenantId: string,
  today: string,
  weekEnd: string
): Promise<GoalRow[]> {
  const { data, error } = await db
    .from('chef_goals')
    .select('id, label, goal_type, status, period_end, updated_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'active')
    .lte('period_end', weekEnd)
    .order('period_end', { ascending: true })
    .limit(10)

  if (error) {
    console.error('[ChefLifeSynthesis] goals failed:', error)
    return []
  }
  return ((data ?? []) as GoalRow[]).filter((goal) => !goal.period_end || goal.period_end >= today)
}

function deriveCapacitySignal(events: EventRow[], now: Date): ChefLifeSynthesisSignal | null {
  if (events.length === 0) return null
  const today = isoDate(now)
  const byDate = new Map<string, EventRow[]>()
  for (const event of events) {
    const key = event.event_date
    byDate.set(key, [...(byDate.get(key) ?? []), event])
  }

  const stackedDay = Array.from(byDate.entries()).find(([, rows]) => rows.length >= 2)
  const largestEvent = [...events].sort((a, b) => (b.guest_count ?? 0) - (a.guest_count ?? 0))[0]
  const todayEvent = events.find((event) => event.event_date === today)

  if (!stackedDay && (!largestEvent || (largestEvent.guest_count ?? 0) < 16) && !todayEvent) {
    return null
  }

  const source = todayEvent ?? stackedDay?.[1][0] ?? largestEvent
  const urgency: ChefLifeSynthesisUrgency =
    source.event_date === today || stackedDay?.[0] === today ? 'high' : 'watch'
  const count = stackedDay?.[1].length ?? 1

  return {
    domain: 'capacity',
    title: stackedDay
      ? `${count} commitments share ${friendlyDate(stackedDay[0], now)}`
      : `${source.guest_count ?? 'Unknown'} guest event needs capacity check`,
    detail: stackedDay
      ? 'Prep, travel, service, and recovery load should be checked before the day fills further.'
      : 'Large or same-day service load may strain prep and recovery windows.',
    urgency,
    href: '/calendar/load',
    sourceLabel: source.occasion || 'Calendar load',
    sourceHref: `/events/${source.id}`,
    sourceUpdatedAt: source.event_date,
    dueAt: source.event_date,
    includeReason: 'Capacity is included only when load changes today or lands inside this week.',
    exclusionReason: 'No meaningful today/this-week capacity change.',
  }
}

function deriveComplianceSignal(
  certifications: CertificationRow[],
  now: Date
): ChefLifeSynthesisSignal | null {
  const expiring = certifications
    .map((cert) => ({
      cert,
      expiresAt: cert.expires_at ?? cert.expiry_date,
      days: daysUntil(cert.expires_at ?? cert.expiry_date, now),
    }))
    .filter((item) => item.days !== null && item.days <= 7)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

  if (expiring.length === 0) return null
  const top = expiring[0]
  const label = top.cert.name ?? top.cert.cert_name ?? top.cert.cert_type ?? 'Compliance proof'
  const expired = (top.days ?? 0) < 0

  return {
    domain: 'compliance',
    title: expired ? `${label} is expired` : `${label} expires ${friendlyDate(top.expiresAt, now)}`,
    detail:
      expiring.length === 1
        ? 'Proof needs review before it creates client, venue, or public-profile risk.'
        : `${expiring.length} compliance proofs need review this week.`,
    urgency: expired ? 'critical' : 'high',
    href: '/settings/compliance',
    sourceLabel: label,
    sourceHref: '/settings/compliance',
    sourceUpdatedAt: top.cert.updated_at ?? top.expiresAt,
    dueAt: top.expiresAt,
    includeReason:
      'Compliance enters the rail only when proof is expired or due inside seven days.',
    exclusionReason: 'No compliance proof expires this week.',
  }
}

function deriveEventReadinessSignal(events: EventRow[], now: Date): ChefLifeSynthesisSignal | null {
  const readinessRows = events
    .map((event) => {
      const missing = [
        !event.menu_id ? 'menu' : null,
        !event.guest_count_confirmed ? 'guest count' : null,
        !event.grocery_list_ready ? 'groceries' : null,
        !event.prep_list_ready ? 'prep' : null,
        !event.equipment_list_ready ? 'equipment' : null,
        !event.packing_list_ready ? 'packing' : null,
        !event.timeline_ready ? 'timeline' : null,
        !event.execution_sheet_ready ? 'execution sheet' : null,
      ].filter(Boolean) as string[]
      return { event, missing }
    })
    .filter((row) => row.missing.length > 0)
    .sort((a, b) => a.event.event_date.localeCompare(b.event.event_date))

  if (readinessRows.length === 0) return null
  const top = readinessRows[0]

  return {
    domain: 'event_readiness',
    title: `${top.event.occasion || 'Upcoming event'} is missing ${top.missing[0]}`,
    detail: `${top.missing.slice(0, 3).join(', ')}${top.missing.length > 3 ? ', and more' : ''} should be resolved before service.`,
    urgency: top.event.event_date === isoDate(now) ? 'critical' : 'high',
    href: `/events/${top.event.id}`,
    sourceLabel: top.event.occasion || 'Event readiness',
    sourceHref: `/events/${top.event.id}`,
    sourceUpdatedAt: top.event.event_date,
    dueAt: top.event.event_date,
    includeReason:
      'Event readiness is included only for missing prep artifacts on events due this week.',
    exclusionReason: 'No this-week event readiness gaps.',
  }
}

function deriveFinancialSignal(
  financials: FinancialRow[],
  events: EventRow[],
  now: Date
): ChefLifeSynthesisSignal | null {
  const rows = financials
    .filter((row) => (row.outstanding_balance_cents ?? 0) > 0)
    .sort((a, b) => (b.outstanding_balance_cents ?? 0) - (a.outstanding_balance_cents ?? 0))

  if (rows.length === 0) return null
  const total = rows.reduce((sum, row) => sum + (row.outstanding_balance_cents ?? 0), 0)
  const top = rows[0]
  const event = events.find((row) => row.id === top.event_id) ?? events[0]
  const sameDay = event?.event_date === isoDate(now)

  return {
    domain: 'financial_pressure',
    title: `${formatCurrency(total)} outstanding on this week's work`,
    detail:
      rows.length === 1
        ? 'Receivable pressure is tied to one upcoming event.'
        : `${rows.length} upcoming events still have money open.`,
    urgency: sameDay ? 'critical' : 'high',
    href: event ? `/events/${event.id}/financial` : '/finance',
    sourceLabel: event?.occasion || 'Financial pulse',
    sourceHref: event ? `/events/${event.id}/financial` : '/finance',
    sourceUpdatedAt: event?.event_date ?? isoDate(now),
    dueAt: event?.event_date ?? isoDate(now),
    includeReason:
      'Financial pressure appears only when open receivables touch today or this week.',
    exclusionReason: 'No this-week financial pressure.',
  }
}

function deriveCrisisSignal(incidents: IncidentRow[], now: Date): ChefLifeSynthesisSignal | null {
  if (incidents.length === 0) return null
  const top = incidents[0]
  const isOpen = top.resolution_status === 'open'

  return {
    domain: 'crisis_recovery',
    title: `${titleCase(top.incident_type ?? 'incident')} recovery is ${top.resolution_status ?? 'open'}`,
    detail: trimSentence(top.description) || 'Incident follow-up needs a visible recovery owner.',
    urgency: isOpen ? 'high' : 'watch',
    href: '/settings/compliance/incidents',
    sourceLabel: 'Incident log',
    sourceHref: '/settings/compliance/incidents',
    sourceUpdatedAt: top.updated_at ?? top.incident_date ?? isoDate(now),
    dueAt: top.incident_date ? isoDate(new Date(top.incident_date)) : isoDate(now),
    includeReason:
      'Crisis recovery appears while incidents are open or actively recovering this week.',
    exclusionReason: 'No open crisis recovery item.',
  }
}

function deriveVendorSignal(vendors: VendorRow[], now: Date): ChefLifeSynthesisSignal | null {
  const risky = vendors
    .map((vendor) => ({
      vendor,
      reliability:
        typeof vendor.reliability_score === 'string'
          ? Number(vendor.reliability_score)
          : vendor.reliability_score,
    }))
    .filter(
      ({ vendor, reliability }) =>
        vendor.status === 'inactive' ||
        (typeof vendor.rating === 'number' && vendor.rating > 0 && vendor.rating <= 2) ||
        (typeof reliability === 'number' && Number.isFinite(reliability) && reliability < 70)
    )

  if (risky.length === 0) return null
  const top = risky[0]

  return {
    domain: 'vendor_risk',
    title: `${top.vendor.name ?? 'Vendor'} needs sourcing review`,
    detail: 'Reliability, rating, or active status could affect upcoming procurement.',
    urgency: 'watch',
    href: '/culinary/vendors',
    sourceLabel: top.vendor.name ?? 'Vendor trust ledger',
    sourceHref: '/culinary/vendors',
    sourceUpdatedAt: top.vendor.updated_at ?? isoDate(now),
    dueAt: top.vendor.updated_at ? isoDate(new Date(top.vendor.updated_at)) : isoDate(now),
    includeReason: 'Vendor risk appears when a vendor trust signal changed today or this week.',
    exclusionReason: 'No vendor risk changed this week.',
  }
}

function deriveHouseholdSignal(
  events: EventRow[],
  clients: ClientRow[],
  now: Date
): ChefLifeSynthesisSignal | null {
  const clientsById = new Map(clients.map((client) => [client.id, client]))
  const rows = events
    .map((event) => {
      const client = event.client_id ? clientsById.get(event.client_id) : null
      const missing = [
        !client?.parking_instructions ? 'parking' : null,
        !client?.access_instructions && !event.location_address ? 'access' : null,
        !client?.kitchen_constraints ? 'kitchen constraints' : null,
        !client?.equipment_available?.length && !client?.equipment_must_bring?.length
          ? 'equipment'
          : null,
      ].filter(Boolean) as string[]
      return { event, client, missing }
    })
    .filter((row) => row.client && row.missing.length > 0)

  if (rows.length === 0) return null
  const top = rows[0]

  return {
    domain: 'household_unknowns',
    title: `${top.client?.full_name ?? 'Client'} household has open unknowns`,
    detail: `${top.missing.slice(0, 3).join(', ')} should be confirmed before service.`,
    urgency: top.event.event_date === isoDate(now) ? 'high' : 'watch',
    href: top.client ? `/clients/${top.client.id}` : '/clients',
    sourceLabel: top.client?.full_name ?? 'Household memory',
    sourceHref: top.client ? `/clients/${top.client.id}` : '/clients',
    sourceUpdatedAt: top.event.event_date,
    dueAt: top.event.event_date,
    includeReason:
      'Household unknowns appear only when an upcoming event depends on missing site memory.',
    exclusionReason: 'No this-week household unknowns tied to scheduled work.',
  }
}

function deriveStrategySignal(goals: GoalRow[], now: Date): ChefLifeSynthesisSignal | null {
  if (goals.length === 0) return null
  const top = goals[0]
  const dueDays = daysUntil(top.period_end, now)

  return {
    domain: 'strategy_misalignment',
    title: `${top.label ?? 'Life strategy goal'} needs review`,
    detail:
      dueDays !== null && dueDays <= 0
        ? 'A strategy period closes today without a fresh decision.'
        : 'A strategy period closes this week; check whether current work still matches the goal.',
    urgency: dueDays !== null && dueDays <= 0 ? 'high' : 'watch',
    href: '/analytics/goals',
    sourceLabel: top.label ?? top.goal_type ?? 'Strategy map',
    sourceHref: '/analytics/goals',
    sourceUpdatedAt: top.updated_at ?? top.period_end ?? isoDate(now),
    dueAt: top.period_end,
    includeReason: 'Strategy appears only when an active goal period closes today or this week.',
    exclusionReason: 'No strategy review due this week.',
  }
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function daysUntil(value: string | null, now: Date): number | null {
  if (!value) return null
  const due = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Math.floor((due.getTime() - today.getTime()) / DAY_MS)
}

function friendlyDate(value: string | null, now: Date): string {
  const days = daysUntil(value, now)
  if (days === null) return 'soon'
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(cents / 100)
}

function titleCase(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
}

function trimSentence(value: string | null): string {
  if (!value) return ''
  const trimmed = value.trim()
  if (trimmed.length <= 120) return trimmed
  return `${trimmed.slice(0, 117).trim()}...`
}
