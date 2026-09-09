import { createHash } from 'node:crypto'
import type { InferredWorkSession } from './types'

const ADMIN_ACTIVITY: Record<string, string> = {
  email: 'client_communication',
  calls: 'client_communication',
  planning: 'event_planning',
  bookkeeping: 'bookkeeping_finance',
  marketing: 'marketing_content',
  sourcing: 'shopping_sourcing',
  travel_admin: 'travel',
  other: 'other_business',
}

function sourceHash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

interface Projection {
  sourceType: string
  sourceRecordId: string
  sourceHash: string
  sourceCreatedAt: string | null
  signalSummary: string
  minimalMetadata: Record<string, unknown>
  session: InferredWorkSession
}

export function projectAdminTimeLog(log: {
  id: string
  category: string
  logDate: string
  minutes: number
  notes: string | null
  eventId: string | null
  createdAt: string
}): Projection {
  const activityType = ADMIN_ACTIVITY[log.category] ?? 'other_business'
  return {
    sourceType: 'admin_time_log',
    sourceRecordId: log.id,
    sourceHash: sourceHash(log),
    sourceCreatedAt: log.createdAt,
    signalSummary: `Manual ${log.category} time log for ${log.logDate}`,
    minimalMetadata: { category: log.category, log_date: log.logDate, manual_duration: true },
    session: {
      actorType: 'david_active',
      activityType,
      startedAt: null,
      endedAt: null,
      durationMinutes: log.minutes,
      durationKind: 'exact',
      status: 'approved',
      confidenceTier: 'observed',
      creationMode: 'compatibility_projection',
      summary: log.notes || `Manual ${log.category} time`,
      evidenceIds: [],
      sourceTypes: ['admin_time_log'],
      eventId: log.eventId,
      clientId: null,
      projectKey: null,
      boundaryGap: 'Exact manual duration; clock boundaries were not recorded.',
    },
  }
}

export function projectStaffClockEntry(entry: {
  id: string
  staffMemberId: string
  clockInAt: string
  clockOutAt: string | null
  totalMinutes: number | null
  approved: boolean | null
  eventId: string | null
}): Projection {
  const calculated = entry.clockOutAt
    ? Math.max(0, Math.round((Date.parse(entry.clockOutAt) - Date.parse(entry.clockInAt)) / 60_000))
    : null
  const durationMinutes = entry.totalMinutes ?? calculated
  return {
    sourceType: 'staff_clock_entry',
    sourceRecordId: entry.id,
    sourceHash: sourceHash(entry),
    sourceCreatedAt: entry.clockInAt,
    signalSummary: 'Existing staff clock entry',
    minimalMetadata: { staff_member_id: entry.staffMemberId },
    session: {
      actorType: 'staff',
      activityType: 'service',
      startedAt: entry.clockInAt,
      endedAt: entry.clockOutAt,
      durationMinutes,
      durationKind: entry.clockOutAt ? 'exact' : 'unknown',
      status: entry.approved && durationMinutes !== null ? 'approved' : 'review_required',
      confidenceTier: entry.clockOutAt ? 'observed' : 'unknown',
      creationMode: 'compatibility_projection',
      summary: 'Staff clock entry',
      evidenceIds: [],
      sourceTypes: ['staff_clock_entry'],
      eventId: entry.eventId,
      clientId: null,
      projectKey: null,
      boundaryGap: entry.clockOutAt ? null : 'Staff member is still clocked in.',
    },
  }
}
export function projectEventPhase(input: {
  eventId: string
  phase: 'shopping_sourcing' | 'prep' | 'travel' | 'service' | 'cleanup_reset'
  startedAt: string | null
  endedAt: string | null
}): Projection | null {
  if (!input.startedAt && !input.endedAt) return null
  const durationMinutes =
    input.startedAt && input.endedAt
      ? Math.max(0, Math.round((Date.parse(input.endedAt) - Date.parse(input.startedAt)) / 60_000))
      : null
  return {
    sourceType: 'event_phase',
    sourceRecordId: `${input.eventId}:${input.phase}`,
    sourceHash: sourceHash(input),
    sourceCreatedAt: input.startedAt ?? input.endedAt,
    signalSummary: `Existing event ${input.phase} timestamps`,
    minimalMetadata: { phase: input.phase },
    session: {
      actorType: 'david_active',
      activityType: input.phase,
      startedAt: input.startedAt,
      endedAt: input.endedAt,
      durationMinutes,
      durationKind: durationMinutes === null ? 'unknown' : 'observed_window',
      status: durationMinutes === null ? 'review_required' : 'proposed',
      confidenceTier: durationMinutes === null ? 'unknown' : 'observed',
      creationMode: 'compatibility_projection',
      summary: `Event ${input.phase}`,
      evidenceIds: [],
      sourceTypes: ['event_phase'],
      eventId: input.eventId,
      clientId: null,
      projectKey: null,
      boundaryGap: durationMinutes === null ? 'Only one phase boundary is recorded.' : null,
    },
  }
}
