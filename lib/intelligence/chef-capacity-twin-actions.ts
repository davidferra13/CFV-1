'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  buildCapacityProfile,
  deriveCapacityDecision,
  type CapacityWorkloadInput,
} from '@/lib/intelligence/chef-capacity-twin'
import type {
  CapacityDecisionContract,
  CapacityDecisionSubjectType,
  PrivateCapacityConstraintContract,
} from '@/lib/intelligence/chef-capacity-twin-contract'

type CapacitySubjectRow = {
  id: string
  event_date?: string | null
  confirmed_date?: string | null
  guest_count?: number | null
  confirmed_guest_count?: number | null
  guest_count_estimated?: number | null
  service_style?: string | null
  confirmed_location?: string | null
  location_address?: string | null
  event_id?: string | null
  inquiry_id?: string | null
}

function weekdayName(date: string | null): string | null {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', { weekday: 'long' })
}

function weekRange(date: string): { start: string; end: string } {
  const parsed = new Date(`${date}T00:00:00`)
  const day = parsed.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  const start = new Date(parsed)
  start.setDate(parsed.getDate() + mondayOffset)
  const end = new Date(start)
  end.setDate(start.getDate() + 6)
  const format = (value: Date) =>
    [
      value.getFullYear(),
      String(value.getMonth() + 1).padStart(2, '0'),
      String(value.getDate()).padStart(2, '0'),
    ].join('-')
  return { start: format(start), end: format(end) }
}

async function loadProfileSources(db: any, tenantId: string, chefId: string) {
  const [settingsResult, chefResult, rulesResult] = await Promise.all([
    db.from('chef_capacity_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
    db
      .from('chefs')
      .select('id, max_hours_per_week, min_rest_days_per_week, off_days')
      .eq('id', chefId)
      .maybeSingle(),
    db.from('chef_scheduling_rules').select('*').eq('tenant_id', tenantId).maybeSingle(),
  ])

  return {
    settings: settingsResult.data ?? null,
    chef: chefResult.data ?? null,
    rules: rulesResult.data ?? null,
  }
}

function buildDateConstraints(params: {
  tenantId: string
  chefId: string
  date: string | null
  settings: any
  chef: any
}): PrivateCapacityConstraintContract[] {
  const day = weekdayName(params.date)
  if (!day) return []
  const blockedDays = new Set<string>([
    ...((params.settings?.blocked_days as string[] | null | undefined) ?? []),
    ...((params.chef?.off_days as string[] | null | undefined) ?? []),
  ])
  if (!blockedDays.has(day)) return []

  return [
    {
      tenantId: params.tenantId,
      chefId: params.chefId,
      kind: 'rest_day',
      source: 'capacity_settings',
      severity: 'warning',
      startsAt: params.date,
      endsAt: params.date,
      label: 'Protected rest or blocked day',
      privateNotes: null,
      visibility: 'private_only',
    },
  ]
}

async function loadExistingMinutes(db: any, tenantId: string, date: string | null) {
  if (!date) return { existingDayMinutes: 0, existingWeekMinutes: 0 }
  const week = weekRange(date)
  const { data: events } = await db
    .from('events')
    .select('event_date, guest_count, service_style, time_travel_minutes, time_shopping_minutes')
    .eq('tenant_id', tenantId)
    .gte('event_date', week.start)
    .lte('event_date', week.end)
    .not('status', 'in', '("cancelled","draft")')

  const rows = events ?? []
  let existingDayMinutes = 0
  let existingWeekMinutes = 0
  for (const event of rows) {
    const estimate = deriveExistingEventMinutes(event)
    existingWeekMinutes += estimate
    if (event.event_date === date) existingDayMinutes += estimate
  }
  return { existingDayMinutes, existingWeekMinutes }
}

function deriveExistingEventMinutes(event: {
  guest_count?: number | null
  service_style?: string | null
  time_travel_minutes?: number | null
  time_shopping_minutes?: number | null
}) {
  const guestCount = event.guest_count ?? 8
  const serviceMultiplier = event.service_style === 'tasting_menu' ? 1.35 : 1
  return Math.round(
    Math.max(120, guestCount * 11 * serviceMultiplier) +
      Math.max(90, guestCount * 7) +
      (event.time_travel_minutes ?? 30) +
      (event.time_shopping_minutes ?? 60) +
      Math.max(45, guestCount * 4)
  )
}

async function loadSubject(
  db: any,
  tenantId: string,
  subjectType: CapacityDecisionSubjectType,
  subjectId: string
): Promise<CapacitySubjectRow> {
  if (subjectType === 'event') {
    const { data } = await db
      .from('events')
      .select(
        'id, event_date, guest_count, service_style, location_address, time_travel_minutes, time_shopping_minutes'
      )
      .eq('id', subjectId)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) throw new Error('Event not found')
    return data
  }

  if (subjectType === 'inquiry') {
    const { data } = await db
      .from('inquiries')
      .select('id, confirmed_date, confirmed_guest_count, confirmed_location')
      .eq('id', subjectId)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) throw new Error('Inquiry not found')
    return data
  }

  if (subjectType === 'quote' || subjectType === 'proposal') {
    const { data } = await db
      .from('quotes')
      .select('id, event_id, inquiry_id, guest_count_estimated')
      .eq('id', subjectId)
      .eq('tenant_id', tenantId)
      .single()
    if (!data) throw new Error('Quote not found')

    let linkedEvent: Partial<CapacitySubjectRow> = {}
    if (data.event_id) {
      const { data: event } = await db
        .from('events')
        .select('id, event_date, guest_count, service_style, location_address')
        .eq('id', data.event_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!event) throw new Error('Linked quote event not found')
      linkedEvent = event
    }

    let linkedInquiry: Partial<CapacitySubjectRow> = {}
    if (data.inquiry_id) {
      const { data: inquiry } = await db
        .from('inquiries')
        .select('id, confirmed_date, confirmed_guest_count, confirmed_location')
        .eq('id', data.inquiry_id)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (!inquiry) throw new Error('Linked quote inquiry not found')
      linkedInquiry = inquiry
    }

    return {
      ...linkedInquiry,
      ...linkedEvent,
      ...data,
      event_date: linkedEvent.event_date ?? linkedInquiry.confirmed_date ?? null,
      guest_count:
        linkedEvent.guest_count ??
        linkedInquiry.confirmed_guest_count ??
        data.guest_count_estimated,
      location_address: linkedEvent.location_address ?? linkedInquiry.confirmed_location ?? null,
    }
  }

  return { id: subjectId }
}

function subjectToWorkloadInput(
  tenantId: string,
  subjectType: CapacityDecisionSubjectType,
  subject: CapacitySubjectRow,
  settings: any
): CapacityWorkloadInput {
  const targetDate = subject.event_date ?? subject.confirmed_date ?? null
  const guestCount =
    subject.guest_count ?? subject.confirmed_guest_count ?? subject.guest_count_estimated ?? null
  const location = subject.location_address ?? subject.confirmed_location ?? null

  return {
    tenantId,
    subjectType,
    subjectId: subject.id,
    targetDate,
    guestCount,
    serviceStyle: subject.service_style ?? null,
    menuKnown: subjectType === 'event',
    locationKnown: Boolean(location),
    staffPlanKnown: guestCount === null ? false : guestCount < 12,
    travelMinutes: (subject as any).time_travel_minutes ?? settings?.default_travel_minutes ?? null,
    shoppingMinutes:
      (subject as any).time_shopping_minutes ??
      (settings?.default_shopping_hours == null
        ? null
        : Math.round(Number(settings.default_shopping_hours) * 60)),
    complexity: guestCount !== null && guestCount >= 16 ? 'complex' : 'moderate',
  }
}

export async function getChefCapacityTwinProfile() {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId || tenantId
  const db: any = createServerClient()
  const sources = await loadProfileSources(db, tenantId, chefId)

  return buildCapacityProfile({
    tenantId,
    chefId,
    capacitySettings: sources.settings,
    legacyChef: sources.chef,
    privateConstraintCount: 0,
  })
}

export async function getChefCapacityTwinDecision(input: {
  subjectType: CapacityDecisionSubjectType
  subjectId: string
}): Promise<CapacityDecisionContract> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const chefId = user.entityId || tenantId
  const db: any = createServerClient()
  const sources = await loadProfileSources(db, tenantId, chefId)
  const subject = await loadSubject(db, tenantId, input.subjectType, input.subjectId)
  const workloadInput = subjectToWorkloadInput(
    tenantId,
    input.subjectType,
    subject,
    sources.settings
  )
  const targetDate = workloadInput.targetDate ?? null
  const existing = await loadExistingMinutes(db, tenantId, targetDate)
  const privateConstraints = buildDateConstraints({
    tenantId,
    chefId,
    date: targetDate,
    settings: sources.settings,
    chef: sources.chef,
  })

  return deriveCapacityDecision({
    tenantId,
    chefId,
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    targetDate,
    profile: buildCapacityProfile({
      tenantId,
      chefId,
      capacitySettings: sources.settings,
      legacyChef: sources.chef,
      privateConstraintCount: privateConstraints.length,
    }),
    workloadInput,
    privateConstraints,
    ...existing,
  })
}
