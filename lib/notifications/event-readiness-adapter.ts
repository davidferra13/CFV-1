import type { ChefSignal } from './noise-simulator'
import {
  evaluatePreServiceReadiness,
  type PreServiceReadinessInput,
  type PreServiceReadinessResult,
} from './pre-service-readiness'

export type SignalEventRow = {
  id: string
  occasion?: string | null
  event_date?: string | null
  serve_time?: string | null
  location_address?: string | null
  location_notes?: string | null
  access_instructions?: string | null
  parking_instructions?: string | null
  site_notes?: string | null
  guest_count?: number | null
  guest_count_confirmed?: boolean | null
  allergies?: string[] | null
  dietary_restrictions?: string[] | null
  non_negotiables_checked?: boolean | null
  payment_status?: string | null
  grocery_list_ready?: boolean | null
  shopping_completed_at?: string | null
  equipment_list_ready?: boolean | null
  packing_list_ready?: boolean | null
  car_packed?: boolean | null
  menu_approval_status?: string | null
  menu_approved_at?: string | null
}

export type EventReadinessAdapterContext = {
  staffAssignedCount?: number
  staffConfirmedCount?: number
  now?: string
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

function hasAny(items: string[] | null | undefined): boolean {
  return Array.isArray(items) && items.some((item) => hasText(item))
}

function eventStartIso(row: SignalEventRow): string {
  if (!row.event_date) return new Date().toISOString()
  if (!row.serve_time) return `${row.event_date}T00:00:00`
  return `${row.event_date}T${row.serve_time}`
}

function hoursUntil(startsAt: string, now: string): number | null {
  const startTime = new Date(startsAt).getTime()
  const nowTime = new Date(now).getTime()
  if (!Number.isFinite(startTime) || !Number.isFinite(nowTime)) return null
  return Math.max(0, (startTime - nowTime) / 3600000)
}

export function eventRowToPreServiceReadinessInput(
  row: SignalEventRow,
  context: EventReadinessAdapterContext = {}
): PreServiceReadinessInput {
  const hasKnownDietaryRisk = hasAny(row.allergies) || hasAny(row.dietary_restrictions)
  const staffAssignedCount = context.staffAssignedCount ?? 0
  const staffConfirmedCount = context.staffConfirmedCount ?? staffAssignedCount

  return {
    eventId: row.id,
    eventTitle: row.occasion ?? 'Event',
    startsAt: eventStartIso(row),
    addressConfirmed: hasText(row.location_address),
    accessNotesConfirmed: hasText(row.access_instructions) || hasText(row.site_notes),
    parkingConfirmed: hasText(row.parking_instructions) || hasText(row.location_notes),
    finalGuestCountConfirmed: Boolean(row.guest_count && row.guest_count > 0)
      ? Boolean(row.guest_count_confirmed)
      : false,
    allergyReviewComplete: hasKnownDietaryRisk ? Boolean(row.non_negotiables_checked) : true,
    menuApproved: row.menu_approval_status === 'approved' || hasText(row.menu_approved_at),
    paymentClear: ['deposit_paid', 'partial', 'paid'].includes(row.payment_status ?? ''),
    staffConfirmed: staffAssignedCount === 0 || staffConfirmedCount >= staffAssignedCount,
    shoppingComplete: Boolean(row.grocery_list_ready || row.shopping_completed_at),
    equipmentPacked: Boolean(row.equipment_list_ready || row.packing_list_ready || row.car_packed),
  }
}

export function createPreServiceReadinessFromEvent(
  row: SignalEventRow,
  context: EventReadinessAdapterContext = {}
): PreServiceReadinessResult {
  return evaluatePreServiceReadiness(eventRowToPreServiceReadinessInput(row, context))
}

export function preServiceReadinessToSignal(
  input: PreServiceReadinessInput,
  result: PreServiceReadinessResult,
  occurredAt = new Date().toISOString()
): ChefSignal | null {
  if (result.ready) return null

  return {
    id: `pre-service:${input.eventId}`,
    action: 'event_reminder_1d',
    title: result.summary,
    body: result.blockers.map((blocker) => blocker.label).join(' '),
    occurredAt,
    eventId: input.eventId,
    context: {
      duplicateKey: `pre-service:${input.eventId}`,
      hoursUntilEvent: hoursUntil(input.startsAt, occurredAt),
      activeEventLinked: true,
    },
  }
}

export function eventRowToPreServiceSignal(
  row: SignalEventRow,
  context: EventReadinessAdapterContext = {}
): ChefSignal | null {
  const input = eventRowToPreServiceReadinessInput(row, context)
  const occurredAt = context.now ?? new Date().toISOString()
  const result = evaluatePreServiceReadiness(input)
  return preServiceReadinessToSignal(input, result, occurredAt)
}
