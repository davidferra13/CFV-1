'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildEventReadinessBus,
  type EventReadinessBus,
  type EventReadinessSignalInput,
  type EventReadinessState,
} from '@/lib/events/event-readiness-bus'

type DbClient = ReturnType<typeof createServerClient> & { from: (table: string) => any }

type EventRow = {
  id: string
  tenant_id: string
  client_id: string | null
  occasion: string | null
  status: string | null
  event_date: string | null
  guest_count: number | null
  guest_count_confirmed: boolean | null
  menu_id: string | null
  location_address: string | null
  access_instructions: string | null
  kitchen_notes: string | null
  site_notes: string | null
  grocery_list_ready: boolean | null
  prep_list_ready: boolean | null
  equipment_list_ready: boolean | null
  packing_list_ready: boolean | null
  timeline_ready: boolean | null
  execution_sheet_ready: boolean | null
  updated_at: string | null
}

type ClientRow = {
  id: string
  full_name: string | null
  parking_instructions: string | null
  access_instructions: string | null
  kitchen_constraints: string | null
  equipment_available: string[] | null
  equipment_must_bring: string[] | null
  updated_at: string | null
}

type FinancialRow = {
  event_id: string | null
  outstanding_balance_cents: number | null
  quoted_price_cents: number | null
  total_paid_cents: number | null
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

type VendorRow = {
  id: string
  name: string | null
  status: string | null
  rating: number | null
  reliability_score: number | string | null
  updated_at: string | null
}

type StaffAssignmentRow = {
  id: string
  status: string | null
  scheduled_hours: number | string | null
  actual_hours: number | string | null
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

type WasteRow = {
  id: string
  item_name: string | null
  reason: string | null
  estimated_cost_cents: number | null
  logged_at: string | null
}

type MessageRow = {
  id: string
  status: string | null
  direction: string | null
  channel: string | null
  sent_at: string | null
  approved_at: string | null
  updated_at: string | null
}

const DAY_MS = 86_400_000

export async function getEventReadinessBus(eventId: string): Promise<EventReadinessBus | null> {
  const user = await requireChef()
  const tenantId = user.tenantId ?? user.entityId
  const chefId = user.entityId ?? tenantId
  if (!tenantId || !chefId) throw new Error('Missing tenant context')

  const db = createServerClient() as DbClient
  const event = await loadEvent(db, eventId, tenantId)
  if (!event) return null

  const [
    client,
    financial,
    certifications,
    vendors,
    staffAssignments,
    incidents,
    wasteLogs,
    messages,
  ] = await Promise.all([
    loadClient(db, tenantId, event.client_id),
    loadFinancialSummary(db, tenantId, eventId),
    loadCertifications(db, tenantId),
    loadVendors(db, chefId),
    loadStaffAssignments(db, chefId, eventId),
    loadIncidents(db, tenantId, eventId),
    loadWasteLogs(db, tenantId, eventId),
    loadMessages(db, tenantId, eventId),
  ])

  const signals = [
    deriveCapacitySignal(event),
    deriveComplianceSignal(certifications, event),
    deriveLoadoutSignal(event),
    deriveHouseholdSignal(event, client),
    deriveVendorSignal(vendors, event),
    deriveStaffSignal(event, staffAssignments),
    deriveCrisisSignal(incidents, event),
    deriveFinanceSignal(financial, event),
    deriveWasteSignal(wasteLogs, event),
    deriveCommunicationSignal(messages, event),
  ]

  return buildEventReadinessBus(signals, {
    eventId,
    eventHref: `/events/${eventId}`,
    dashboardHref: '/dashboard',
    railHref: '/dashboard#chef-life-synthesis',
  })
}

async function loadEvent(
  db: DbClient,
  eventId: string,
  tenantId: string
): Promise<EventRow | null> {
  const { data, error } = await db
    .from('events')
    .select(
      [
        'id',
        'tenant_id',
        'client_id',
        'occasion',
        'status',
        'event_date',
        'guest_count',
        'guest_count_confirmed',
        'menu_id',
        'location_address',
        'access_instructions',
        'kitchen_notes',
        'site_notes',
        'grocery_list_ready',
        'prep_list_ready',
        'equipment_list_ready',
        'packing_list_ready',
        'timeline_ready',
        'execution_sheet_ready',
        'updated_at',
      ].join(', ')
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) {
    console.error('[EventReadinessBus] event failed:', error)
    return null
  }
  return (data ?? null) as EventRow | null
}

async function loadClient(
  db: DbClient,
  tenantId: string,
  clientId: string | null
): Promise<ClientRow | null> {
  if (!clientId) return null
  const { data, error } = await db
    .from('clients')
    .select(
      'id, full_name, parking_instructions, access_instructions, kitchen_constraints, equipment_available, equipment_must_bring, updated_at'
    )
    .eq('tenant_id', tenantId)
    .eq('id', clientId)
    .maybeSingle()

  if (error) {
    console.error('[EventReadinessBus] client failed:', error)
    return null
  }
  return (data ?? null) as ClientRow | null
}

async function loadFinancialSummary(
  db: DbClient,
  tenantId: string,
  eventId: string
): Promise<FinancialRow | null> {
  const { data, error } = await db
    .from('event_financial_summary')
    .select('event_id, outstanding_balance_cents, quoted_price_cents, total_paid_cents')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .maybeSingle()

  if (error) {
    console.error('[EventReadinessBus] financial summary failed:', error)
    return null
  }
  return (data ?? null) as FinancialRow | null
}

async function loadCertifications(db: DbClient, tenantId: string): Promise<CertificationRow[]> {
  const { data, error } = await db
    .from('chef_certifications')
    .select('id, name, cert_name, cert_type, expires_at, expiry_date, status, updated_at')
    .eq('tenant_id', tenantId)
    .order('expires_at', { ascending: true, nullsFirst: false })
    .limit(25)

  if (error) {
    console.error('[EventReadinessBus] certifications failed:', error)
    return []
  }
  return (data ?? []) as CertificationRow[]
}

async function loadVendors(db: DbClient, chefId: string): Promise<VendorRow[]> {
  const { data, error } = await db
    .from('vendors')
    .select('id, name, status, rating, reliability_score, updated_at')
    .eq('chef_id', chefId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(25)

  if (error) {
    console.error('[EventReadinessBus] vendors failed:', error)
    return []
  }
  return (data ?? []) as VendorRow[]
}

async function loadStaffAssignments(
  db: DbClient,
  chefId: string,
  eventId: string
): Promise<StaffAssignmentRow[]> {
  const { data, error } = await db
    .from('event_staff_assignments')
    .select('id, status, scheduled_hours, actual_hours, updated_at')
    .eq('chef_id', chefId)
    .eq('event_id', eventId)

  if (error) {
    console.error('[EventReadinessBus] staff assignments failed:', error)
    return []
  }
  return (data ?? []) as StaffAssignmentRow[]
}

async function loadIncidents(
  db: DbClient,
  tenantId: string,
  eventId: string
): Promise<IncidentRow[]> {
  const { data, error } = await db
    .from('chef_incidents')
    .select('id, incident_type, description, incident_date, resolution_status, updated_at')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('incident_date', { ascending: false, nullsFirst: false })
    .limit(5)

  if (error) {
    console.error('[EventReadinessBus] incidents failed:', error)
    return []
  }
  return (data ?? []) as IncidentRow[]
}

async function loadWasteLogs(db: DbClient, tenantId: string, eventId: string): Promise<WasteRow[]> {
  const { data, error } = await db
    .from('event_waste_logs')
    .select('id, item_name, reason, estimated_cost_cents, logged_at')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('logged_at', { ascending: false, nullsFirst: false })
    .limit(10)

  if (error) {
    console.error('[EventReadinessBus] waste logs failed:', error)
    return []
  }
  return (data ?? []) as WasteRow[]
}

async function loadMessages(
  db: DbClient,
  tenantId: string,
  eventId: string
): Promise<MessageRow[]> {
  const { data, error } = await db
    .from('messages')
    .select('id, status, direction, channel, sent_at, approved_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('event_id', eventId)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (error) {
    console.error('[EventReadinessBus] messages failed:', error)
    return []
  }
  return (data ?? []) as MessageRow[]
}

function deriveCapacitySignal(event: EventRow): EventReadinessSignalInput {
  const guestCount = Number(event.guest_count ?? 0)
  const state: EventReadinessState =
    guestCount <= 0 ? 'unknown' : event.guest_count_confirmed === false ? 'warning' : 'clear'

  return signal({
    program: 'capacity',
    state,
    id: 'capacity:guest-count',
    title:
      state === 'clear'
        ? `${guestCount} guests are capacity-ready`
        : state === 'unknown'
          ? 'Guest count is unknown'
          : 'Guest count still needs confirmation',
    detail:
      state === 'clear'
        ? 'Capacity can use the confirmed guest count as the baseline.'
        : 'Capacity, portions, staff, and loadout depend on this number.',
    owner: 'Chef',
    event,
    action: { label: 'Open event overview', href: `/events/${event.id}` },
    proof: eventProof(event, 'Event guest count'),
  })
}

function deriveComplianceSignal(
  certifications: CertificationRow[],
  event: EventRow
): EventReadinessSignalInput {
  const expiring = certifications
    .map((cert) => ({
      cert,
      expiresAt: cert.expires_at ?? cert.expiry_date,
      days: daysUntil(cert.expires_at ?? cert.expiry_date),
    }))
    .filter((item) => item.days !== null)
    .sort((a, b) => (a.days ?? 999) - (b.days ?? 999))

  const top = expiring[0]
  if (!top) {
    return signal({
      program: 'compliance',
      state: 'unknown',
      id: 'compliance:no-proof',
      title: 'No compliance proof is connected',
      detail: 'The event readiness bus could not find a certification proof source.',
      owner: 'Chef',
      event,
      action: { label: 'Open compliance', href: '/settings/compliance' },
      proof: missingProof('/settings/compliance', 'Compliance proof'),
    })
  }

  const label = top.cert.name ?? top.cert.cert_name ?? top.cert.cert_type ?? 'Compliance proof'
  const state: EventReadinessState =
    (top.days ?? 0) < 0 ? 'blocked' : (top.days ?? 99) <= 14 ? 'warning' : 'clear'

  return signal({
    program: 'compliance',
    state,
    id: `compliance:${top.cert.id}`,
    title:
      state === 'blocked'
        ? `${label} is expired`
        : state === 'warning'
          ? `${label} expires soon`
          : 'Compliance proof is current',
    detail:
      state === 'clear'
        ? 'No connected certification proof expires inside the readiness window.'
        : 'Review proof before it creates venue, client, or service risk.',
    owner: 'Chef',
    event,
    action: { label: 'Open compliance', href: '/settings/compliance' },
    proof: {
      label,
      href: '/settings/compliance',
      updatedAt: top.cert.updated_at ?? top.expiresAt ?? null,
      confidence: 'verified',
    },
  })
}

function deriveLoadoutSignal(event: EventRow): EventReadinessSignalInput {
  const missing = [
    !event.menu_id ? 'menu' : null,
    !event.grocery_list_ready ? 'grocery list' : null,
    !event.prep_list_ready ? 'prep list' : null,
    !event.equipment_list_ready ? 'equipment list' : null,
    !event.packing_list_ready ? 'packing list' : null,
    !event.timeline_ready ? 'timeline' : null,
    !event.execution_sheet_ready ? 'execution sheet' : null,
  ].filter(Boolean) as string[]
  const close = daysUntil(event.event_date) !== null && (daysUntil(event.event_date) ?? 99) <= 1
  const state: EventReadinessState = missing.length === 0 ? 'clear' : close ? 'blocked' : 'warning'

  return signal({
    program: 'loadout',
    state,
    id: 'loadout:artifacts',
    title: missing.length === 0 ? 'Loadout artifacts are ready' : `Missing ${missing[0]}`,
    detail:
      missing.length === 0
        ? 'Menu, prep, gear, packing, timeline, and execution artifacts are connected.'
        : `${missing.slice(0, 4).join(', ')}${missing.length > 4 ? ', and more' : ''} need proof.`,
    owner: 'Chef',
    event,
    action: { label: 'Open prep', href: `/events/${event.id}?tab=prep` },
    proof: eventProof(event, 'Event loadout fields'),
  })
}

function deriveHouseholdSignal(
  event: EventRow,
  client: ClientRow | null
): EventReadinessSignalInput {
  if (!client) {
    return signal({
      program: 'household',
      state: 'unknown',
      id: 'household:no-client',
      title: 'No household memory is connected',
      detail: 'Access, kitchen, parking, and equipment assumptions are not traceable yet.',
      owner: 'Chef',
      event,
      action: { label: 'Open clients', href: '/clients' },
      proof: missingProof('/clients', 'Household memory'),
    })
  }

  const missing = [
    !client.parking_instructions ? 'parking' : null,
    !client.access_instructions && !event.access_instructions && !event.location_address
      ? 'access'
      : null,
    !client.kitchen_constraints && !event.kitchen_notes && !event.site_notes
      ? 'kitchen constraints'
      : null,
    !client.equipment_available?.length && !client.equipment_must_bring?.length
      ? 'equipment'
      : null,
  ].filter(Boolean) as string[]

  return signal({
    program: 'household',
    state: missing.length === 0 ? 'clear' : 'warning',
    id: `household:${client.id}`,
    title:
      missing.length === 0
        ? `${client.full_name ?? 'Household'} memory is ready`
        : `${client.full_name ?? 'Household'} has open unknowns`,
    detail:
      missing.length === 0
        ? 'Site and household assumptions have connected proof.'
        : `${missing.join(', ')} should be confirmed before service.`,
    owner: 'Chef',
    event,
    action: { label: 'Open household', href: `/clients/${client.id}` },
    proof: {
      label: client.full_name ?? 'Client household memory',
      href: `/clients/${client.id}`,
      updatedAt: client.updated_at,
      confidence: 'verified',
    },
  })
}

function deriveVendorSignal(vendors: VendorRow[], event: EventRow): EventReadinessSignalInput {
  if (vendors.length === 0) {
    return signal({
      program: 'vendor',
      state: 'unknown',
      id: 'vendor:no-ledger',
      title: 'No vendor trust source is connected',
      detail: 'Procurement readiness has no vendor reliability proof for this chef yet.',
      owner: 'Chef',
      event,
      action: { label: 'Open vendors', href: '/culinary/vendors' },
      proof: missingProof('/culinary/vendors', 'Vendor trust ledger'),
    })
  }

  const risky = vendors.find((vendor) => {
    const reliability =
      typeof vendor.reliability_score === 'string'
        ? Number(vendor.reliability_score)
        : vendor.reliability_score
    return (
      vendor.status === 'inactive' ||
      (typeof vendor.rating === 'number' && vendor.rating > 0 && vendor.rating <= 2) ||
      (typeof reliability === 'number' && Number.isFinite(reliability) && reliability < 70)
    )
  })

  return signal({
    program: 'vendor',
    state: risky ? 'warning' : 'clear',
    id: `vendor:${risky?.id ?? 'ledger'}`,
    title: risky ? `${risky.name ?? 'Vendor'} needs review` : 'Vendor trust ledger is calm',
    detail: risky
      ? 'A vendor reliability, rating, or active-status signal could affect procurement.'
      : 'No connected vendor reliability signal is currently raising event risk.',
    owner: 'Chef',
    event,
    action: { label: 'Open vendors', href: '/culinary/vendors' },
    proof: {
      label: risky?.name ?? 'Vendor trust ledger',
      href: '/culinary/vendors',
      updatedAt: risky?.updated_at ?? vendors[0]?.updated_at ?? null,
      confidence: 'verified',
    },
  })
}

function deriveStaffSignal(
  event: EventRow,
  staffAssignments: StaffAssignmentRow[]
): EventReadinessSignalInput {
  const guestCount = Number(event.guest_count ?? 0)
  const needsStaff = guestCount >= 14
  const pending = staffAssignments.filter((assignment) =>
    ['pending', 'invited'].includes(String(assignment.status))
  )
  const state: EventReadinessState = !needsStaff
    ? 'clear'
    : staffAssignments.length === 0
      ? 'warning'
      : pending.length > 0
        ? 'warning'
        : 'clear'

  return signal({
    program: 'staff',
    state,
    id: 'staff:assignments',
    title:
      state === 'clear'
        ? needsStaff
          ? 'Staffing is assigned'
          : 'Staffing load is small'
        : staffAssignments.length === 0
          ? 'Large event has no staff assigned'
          : 'Staff assignments need confirmation',
    detail:
      state === 'clear'
        ? 'Staff readiness has enough signal for the current guest count.'
        : 'Confirm help, hours, and role coverage before service.',
    owner: 'Chef',
    event,
    action: { label: 'Open staff', href: `/events/${event.id}/staff` },
    proof: {
      label:
        staffAssignments.length > 0
          ? `${staffAssignments.length} staff assignment${staffAssignments.length === 1 ? '' : 's'}`
          : 'Event staff assignments',
      href: `/events/${event.id}/staff`,
      updatedAt:
        latest(staffAssignments.map((assignment) => assignment.updated_at)) ?? event.updated_at,
      confidence: staffAssignments.length > 0 || !needsStaff ? 'verified' : 'missing',
    },
  })
}

function deriveCrisisSignal(incidents: IncidentRow[], event: EventRow): EventReadinessSignalInput {
  const openIncident = incidents.find((incident) =>
    ['open', 'in_progress'].includes(String(incident.resolution_status))
  )

  return signal({
    program: 'crisis',
    state: openIncident
      ? openIncident.resolution_status === 'open'
        ? 'blocked'
        : 'warning'
      : 'clear',
    id: `crisis:${openIncident?.id ?? 'none'}`,
    title: openIncident
      ? `${titleCase(openIncident.incident_type ?? 'incident')} recovery is open`
      : 'No open crisis recovery item',
    detail: openIncident?.description?.trim() || 'Incident log has no open item for this event.',
    owner: 'Chef',
    event,
    action: { label: 'Open incidents', href: '/settings/compliance/incidents' },
    proof: {
      label: openIncident ? 'Incident log' : 'Event incident query',
      href: '/settings/compliance/incidents',
      updatedAt: openIncident?.updated_at ?? event.updated_at,
      confidence: 'verified',
    },
  })
}

function deriveFinanceSignal(
  financial: FinancialRow | null,
  event: EventRow
): EventReadinessSignalInput {
  if (!financial) {
    return signal({
      program: 'finance',
      state: 'unknown',
      id: 'finance:no-summary',
      title: 'Financial summary is not connected',
      detail: 'Quote, payment, and balance proof are not available to the bus yet.',
      owner: 'Chef',
      event,
      action: { label: 'Open money', href: `/events/${event.id}?tab=money` },
      proof: missingProof(`/events/${event.id}?tab=money`, 'Event financial summary'),
    })
  }

  const outstanding = Number(financial.outstanding_balance_cents ?? 0)
  const quote = Number(financial.quoted_price_cents ?? 0)
  const state: EventReadinessState =
    outstanding > 0 && isTodayOrPast(event.event_date)
      ? 'blocked'
      : outstanding > 0
        ? 'warning'
        : 'clear'

  return signal({
    program: 'finance',
    state,
    id: 'finance:summary',
    title:
      state === 'clear'
        ? 'Event finance is clear'
        : `${formatCurrency(outstanding)} remains outstanding`,
    detail:
      state === 'clear'
        ? quote > 0
          ? 'Quote and payment summary are connected.'
          : 'No open balance is currently reported.'
        : 'Open receivables should be handled before treating the event as fully ready.',
    owner: 'Chef',
    event,
    action: { label: 'Open money', href: `/events/${event.id}?tab=money` },
    proof: {
      label: 'Event financial summary',
      href: `/events/${event.id}?tab=money`,
      updatedAt: event.updated_at,
      confidence: 'verified',
    },
  })
}

function deriveWasteSignal(wasteLogs: WasteRow[], event: EventRow): EventReadinessSignalInput {
  const completed = event.status === 'completed'
  const state: EventReadinessState = completed && wasteLogs.length === 0 ? 'unknown' : 'clear'

  return signal({
    program: 'waste',
    state,
    id: 'waste:event-log',
    title:
      state === 'clear'
        ? completed
          ? 'Waste ledger has event proof'
          : 'Waste review is staged for closeout'
        : 'Completed event has no waste proof',
    detail:
      state === 'clear'
        ? 'Waste readiness will stay composable through the event waste ledger.'
        : 'Capture waste, overproduction, and spoilage while event memory is fresh.',
    owner: 'Chef',
    event,
    action: { label: 'Open waste', href: `/events/${event.id}?tab=wrap` },
    proof: {
      label: wasteLogs.length > 0 ? 'Event waste ledger' : 'Event waste query',
      href: `/events/${event.id}?tab=wrap`,
      updatedAt: wasteLogs[0]?.logged_at ?? event.updated_at,
      confidence: wasteLogs.length > 0 || !completed ? 'verified' : 'missing',
    },
  })
}

function deriveCommunicationSignal(
  messages: MessageRow[],
  event: EventRow
): EventReadinessSignalInput {
  const outbound = messages.filter((message) => message.direction === 'outbound')
  const unsentDrafts = outbound.filter((message) =>
    ['draft', 'approved'].includes(String(message.status))
  )
  const close = daysUntil(event.event_date) !== null && (daysUntil(event.event_date) ?? 99) <= 3
  const state: EventReadinessState =
    unsentDrafts.length > 0 ? 'warning' : close && outbound.length === 0 ? 'warning' : 'clear'

  return signal({
    program: 'communication',
    state,
    id: 'communication:event-messages',
    title:
      state === 'clear'
        ? 'Communication thread is calm'
        : unsentDrafts.length > 0
          ? 'Draft communication is waiting'
          : 'Close event has no outbound communication proof',
    detail:
      state === 'clear'
        ? 'The event communication log has no immediate readiness warning.'
        : 'Confirm the client, household, vendor, or staff message needed for this event.',
    owner: 'Chef',
    event,
    action: { label: 'Open communication', href: '/communication' },
    proof: {
      label: messages.length > 0 ? 'Event communication log' : 'Event message query',
      href: '/communication',
      updatedAt:
        latest(messages.map((message) => message.updated_at ?? message.sent_at)) ??
        event.updated_at,
      confidence: messages.length > 0 || !close ? 'verified' : 'missing',
    },
  })
}

function signal(input: {
  id: string
  program: EventReadinessSignalInput['program']
  state: EventReadinessState
  title: string
  detail: string
  owner: string
  event: EventRow
  action: EventReadinessSignalInput['action']
  proof: EventReadinessSignalInput['sourceProof']
}): EventReadinessSignalInput {
  return {
    id: input.id,
    program: input.program,
    state: input.state,
    title: input.title,
    detail: input.detail,
    owner: input.owner,
    dueAt: input.event.event_date,
    action: input.action,
    sourceProof: input.proof,
  }
}

function eventProof(event: EventRow, label: string): EventReadinessSignalInput['sourceProof'] {
  return {
    label,
    href: `/events/${event.id}`,
    updatedAt: event.updated_at ?? event.event_date,
    confidence: 'verified',
  }
}

function missingProof(href: string, label: string): EventReadinessSignalInput['sourceProof'] {
  return {
    label: `${label} missing`,
    href,
    updatedAt: null,
    confidence: 'missing',
  }
}

function daysUntil(value: string | null): number | null {
  if (!value) return null
  const due = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(due.getTime())) return null
  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Math.floor((due.getTime() - today.getTime()) / DAY_MS)
}

function isTodayOrPast(value: string | null): boolean {
  const days = daysUntil(value)
  return days !== null && days <= 0
}

function latest(values: Array<string | null | undefined>): string | null {
  const sorted = values.filter((value): value is string => Boolean(value)).sort()
  return sorted[sorted.length - 1] ?? null
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
