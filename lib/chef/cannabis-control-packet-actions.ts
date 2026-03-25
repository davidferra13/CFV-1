'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import {
  assignGuestsToSeats,
  evaluateReconciliation,
  generateSeatBlueprint,
  normalizeCourseCount,
  summarizeParticipationStatuses,
  type ControlPacketGuestInput,
  type ControlPacketLayoutType,
  type ControlPacketReconciliationGuestRow,
} from '@/lib/cannabis/control-packet-engine'

const CONTROL_PACKET_BUCKET = 'cannabis-control-packets'
const SIGNED_URL_EXPIRY_SECONDS = 3600
const MAX_EVIDENCE_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']

const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/webp': 'webp',
}

const GenerateSnapshotSchema = z.object({
  eventId: z.string().uuid(),
  layoutType: z.enum(['linear', 'grid_2x5', 'grid_3x4', 'custom']).default('linear'),
  customSeatIds: z.array(z.string().min(1).max(24)).max(300).optional(),
})

const ReconciliationGuestRowSchema: z.ZodType<ControlPacketReconciliationGuestRow> = z.object({
  guestId: z.string().uuid().nullable().optional(),
  guestName: z.string().min(1).max(200),
  totalMgPlanned: z.number().min(0).nullable().optional(),
  totalMgServed: z.number().min(0).nullable().optional(),
  breakdownPerCourseMg: z.array(z.number().min(0)).optional(),
  perCourse: z
    .array(
      z.object({
        courseNumber: z.number().int().min(1),
        mgServed: z.number().min(0).nullable().optional(),
        doseApplied: z.boolean().optional(),
        skipped: z.boolean().optional(),
        optedOutDuringService: z.boolean().optional(),
      })
    )
    .optional(),
  notes: z.string().max(2000).nullable().optional(),
})

const SaveReconciliationSchema = z.object({
  eventId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  extractLabelStrength: z.string().max(200).nullable().optional(),
  serviceOperator: z.string().max(200).nullable().optional(),
  totalSyringesPortioned: z.number().int().min(0).nullable().optional(),
  totalDosesAdministered: z.number().int().min(0).nullable().optional(),
  extractReturnedToHost: z.boolean().nullable().optional(),
  irregularitiesNotes: z.string().max(5000).nullable().optional(),
  chefSignature: z.string().max(200).nullable().optional(),
  hostAcknowledgment: z.string().max(200).nullable().optional(),
  guestRows: z.array(ReconciliationGuestRowSchema).max(400),
})

const FinalizePacketSchema = z.object({
  eventId: z.string().uuid(),
  snapshotId: z.string().uuid(),
  archivalPdfPath: z.string().max(500).optional(),
})

const UpsertCourseConfigSchema = z.object({
  eventId: z.string().uuid(),
  courseConfig: z
    .array(
      z.object({
        courseIndex: z.number().int().min(1),
        infusionEnabled: z.boolean(),
        plannedMgPerGuest: z.number().min(0).nullable().optional(),
        notes: z.string().max(5000).nullable().optional(),
      })
    )
    .max(80),
})

type CoursePlanRow = {
  courseIndex: number
  courseName: string
  sourceCourseNumber: number | null
}

type CourseConfigRow = {
  courseIndex: number
  infusionEnabled: boolean
  plannedMgPerGuest: number | null
  notes: string | null
  isActive: boolean
}

type SnapshotPlan = {
  menu: { id: string; title: string } | null
  courses: CoursePlanRow[]
  courseConfig: CourseConfigRow[]
}

function deriveParticipationStatus(value: unknown): ControlPacketGuestInput['participationStatus'] {
  if (value === 'participate') return 'participate'
  if (value === 'not_consume') return 'not_consume'
  if (value === 'undecided') return 'undecided'
  return 'no_response'
}

function toIsoOrNull(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = Date.parse(value)
  if (Number.isNaN(parsed)) return null
  return new Date(parsed).toISOString()
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length ? trimmed : null
}

function normalizeCourseLabel(value: unknown, fallbackIndex: number): string {
  const label = String(value ?? '').trim()
  return label.length ? label : `Course ${fallbackIndex}`
}

function buildCoursePlanFromDishes(dishes: any[], courseCount: number): CoursePlanRow[] {
  const safeCourseCount = normalizeCourseCount(courseCount)
  const byCourseNumber = new Map<number, string>()

  for (const dish of dishes ?? []) {
    const courseNumber = Number(dish?.course_number ?? NaN)
    if (!Number.isFinite(courseNumber) || courseNumber < 1) continue
    if (byCourseNumber.has(courseNumber)) continue

    const label = normalizeCourseLabel(dish?.course_name, courseNumber)
    byCourseNumber.set(courseNumber, label)
  }

  const ordered = [...byCourseNumber.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([sourceCourseNumber, courseName]) => ({ sourceCourseNumber, courseName }))

  return Array.from({ length: safeCourseCount }, (_, index) => {
    const courseIndex = index + 1
    const source = ordered[index]
    return {
      courseIndex,
      courseName: source?.courseName ?? `Course ${courseIndex}`,
      sourceCourseNumber: source?.sourceCourseNumber ?? null,
    }
  })
}

async function ensureEventCannabisCourseConfigRows(
  db: any,
  eventId: string,
  tenantId: string,
  courseCount: number
): Promise<CourseConfigRow[]> {
  const safeCourseCount = normalizeCourseCount(courseCount)

  const { data: existingRows, error: existingError } = await (db
    .from('event_cannabis_course_config' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('course_index', { ascending: true }) as any)

  if (existingError) {
    throw new Error('Failed to load cannabis course overlay settings')
  }

  const existing = (existingRows ?? []) as any[]
  const existingByIndex = new Map<number, any>(
    existing
      .map((row) => [Number(row.course_index), row] as const)
      .filter(([index]) => Number.isFinite(index) && index >= 1)
  )

  const indexes = Array.from({ length: safeCourseCount }, (_, index) => index + 1)
  const rowsToInsert = indexes.filter((index) => !existingByIndex.has(index))
  const rowsToReactivate = indexes.filter((index) => {
    const row = existingByIndex.get(index)
    return row && row.is_active === false
  })
  const rowsToArchive = existing
    .filter((row) => Number(row.course_index) > safeCourseCount && row.is_active === true)
    .map((row) => Number(row.course_index))

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await (db.from('event_cannabis_course_config' as any).insert(
      rowsToInsert.map((courseIndex) => ({
        event_id: eventId,
        tenant_id: tenantId,
        course_index: courseIndex,
        infusion_enabled: false,
        planned_mg_per_guest: null,
        notes: null,
        is_active: true,
        archived_at: null,
      }))
    ) as any)

    if (insertError) {
      throw new Error('Failed to create cannabis course overlay rows')
    }
  }

  if (rowsToReactivate.length > 0) {
    const { error: reactivateError } = await (db
      .from('event_cannabis_course_config' as any)
      .update({
        is_active: true,
        archived_at: null,
      })
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .in('course_index', rowsToReactivate) as any)

    if (reactivateError) {
      throw new Error('Failed to reactivate cannabis course overlay rows')
    }
  }

  if (rowsToArchive.length > 0) {
    const { error: archiveError } = await (db
      .from('event_cannabis_course_config' as any)
      .update({
        is_active: false,
        archived_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .in('course_index', rowsToArchive) as any)

    if (archiveError) {
      throw new Error('Failed to archive extra cannabis course overlay rows')
    }
  }

  const { data: activeRows, error: activeRowsError } = await (db
    .from('event_cannabis_course_config' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('course_index', { ascending: true }) as any)

  if (activeRowsError) {
    throw new Error('Failed to refresh cannabis course overlay rows')
  }

  return ((activeRows ?? []) as any[]).map((row) => ({
    courseIndex: Number(row.course_index),
    infusionEnabled: !!row.infusion_enabled,
    plannedMgPerGuest:
      row.planned_mg_per_guest === null || row.planned_mg_per_guest === undefined
        ? null
        : Number(row.planned_mg_per_guest),
    notes: normalizeNullableText(row.notes),
    isActive: !!row.is_active,
  }))
}

function hydrateCourseConfigForCourseCount(
  rows: CourseConfigRow[],
  courseCount: number
): CourseConfigRow[] {
  const safeCourseCount = normalizeCourseCount(courseCount)
  const byIndex = new Map<number, CourseConfigRow>(rows.map((row) => [row.courseIndex, row]))

  return Array.from({ length: safeCourseCount }, (_, index) => {
    const courseIndex = index + 1
    const existing = byIndex.get(courseIndex)

    if (existing) return existing

    return {
      courseIndex,
      infusionEnabled: false,
      plannedMgPerGuest: null,
      notes: null,
      isActive: true,
    }
  })
}

function sanitizeSnapshotPlan(snapshot: any): SnapshotPlan | null {
  const payload = snapshot?.snapshot_json
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null

  const menuPayload = (payload as any).menu
  const rawCourses = Array.isArray((payload as any).courses) ? (payload as any).courses : []
  const rawCourseConfig = Array.isArray((payload as any).course_config)
    ? (payload as any).course_config
    : []

  const courses = rawCourses
    .map((row: any) => ({
      courseIndex: Number(row?.course_index ?? row?.courseIndex ?? NaN),
      courseName: normalizeCourseLabel(row?.course_name ?? row?.courseName, 1),
      sourceCourseNumber:
        row?.source_course_number === null || row?.sourceCourseNumber === null
          ? null
          : Number(row?.source_course_number ?? row?.sourceCourseNumber ?? NaN),
    }))
    .filter((row: CoursePlanRow) => Number.isFinite(row.courseIndex) && row.courseIndex >= 1)
    .sort((a: CoursePlanRow, b: CoursePlanRow) => a.courseIndex - b.courseIndex)

  const courseConfig = rawCourseConfig
    .map((row: any) => ({
      courseIndex: Number(row?.course_index ?? row?.courseIndex ?? NaN),
      infusionEnabled: !!(row?.infusion_enabled ?? row?.infusionEnabled),
      plannedMgPerGuest:
        row?.planned_mg_per_guest === null ||
        row?.planned_mg_per_guest === undefined ||
        row?.plannedMgPerGuest === null ||
        row?.plannedMgPerGuest === undefined
          ? null
          : Number(row?.planned_mg_per_guest ?? row?.plannedMgPerGuest),
      notes: normalizeNullableText(row?.notes ?? null),
      isActive: row?.is_active === undefined ? true : !!row?.is_active,
    }))
    .filter((row: CourseConfigRow) => Number.isFinite(row.courseIndex) && row.courseIndex >= 1)
    .sort((a: CourseConfigRow, b: CourseConfigRow) => a.courseIndex - b.courseIndex)

  const menu =
    menuPayload && typeof menuPayload === 'object'
      ? {
          id: String((menuPayload as any).menu_id ?? (menuPayload as any).id ?? '').trim(),
          title: String((menuPayload as any).title ?? (menuPayload as any).menu_title ?? '').trim(),
        }
      : null

  return {
    menu: menu && (menu.id.length > 0 || menu.title.length > 0) ? menu : null,
    courses,
    courseConfig,
  }
}

async function loadCannabisEventContext(eventId: string, tenantId: string) {
  const db: any = createServerClient()

  const { data: event, error: eventError } = await (db
    .from('events' as any)
    .select(
      `
      id,
      tenant_id,
      client_id,
      event_date,
      serve_time,
      arrival_time,
      occasion,
      guest_count,
      status,
      cannabis_preference,
      course_count,
      menu_id,
      clients!inner(full_name)
    `
    )
    .eq('id', eventId)
    .eq('tenant_id', tenantId)
    .eq('cannabis_preference', true)
    .single() as any)

  if (eventError || !event) {
    throw new Error('Cannabis event not found or access denied')
  }

  const { data: guestRows, error: guestsError } = await db
    .from('event_guests')
    .select('id, full_name, guest_token, rsvp_status, created_at, updated_at')
    .eq('event_id', eventId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (guestsError) {
    throw new Error('Failed to load event guests')
  }

  const guests = (guestRows ?? []) as Array<{
    id: string
    full_name: string
    guest_token: string
    rsvp_status: string
    created_at: string
    updated_at: string
  }>

  const guestTokens = guests.map((guest) => guest.guest_token)
  let profiles: any[] = []

  if (guestTokens.length > 0) {
    const { data: profileRows, error: profileError } = await (db
      .from('guest_event_profile' as any)
      .select('*')
      .eq('event_id', eventId)
      .in('guest_token', guestTokens) as any)

    if (profileError) {
      throw new Error('Failed to load guest cannabis profiles')
    }

    profiles = profileRows ?? []
  }

  const profileByToken = new Map<string, any>(
    profiles
      .filter((profile) => typeof profile?.guest_token === 'string')
      .map((profile) => [profile.guest_token as string, profile])
  )

  const guestSnapshotInput: ControlPacketGuestInput[] = guests.map((guest) => {
    const profile = profileByToken.get(guest.guest_token) ?? null
    const participationStatus = deriveParticipationStatus(profile?.cannabis_participation)
    return {
      guestId: guest.id,
      fullName: guest.full_name,
      participationStatus,
      rsvpStatus: guest.rsvp_status ?? 'pending',
      preferredDoseNote: profile?.preferred_dose_note ?? null,
      createdAt: guest.created_at,
    }
  })

  const participationByGuestName = new Map<string, ControlPacketGuestInput['participationStatus']>(
    guestSnapshotInput.map((guest) => [
      guest.fullName.trim().toLowerCase(),
      guest.participationStatus,
    ])
  )

  const sourceGuestUpdatedAtValues = [
    ...guests.map((guest) => toIsoOrNull(guest.updated_at)),
    ...profiles.map((profile) => toIsoOrNull(profile?.updated_at)),
  ].filter(Boolean) as string[]

  const sourceGuestUpdatedAt =
    sourceGuestUpdatedAtValues.length > 0
      ? sourceGuestUpdatedAtValues.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
      : null

  const directMenuId =
    typeof (event as any).menu_id === 'string' && (event as any).menu_id.trim().length > 0
      ? String((event as any).menu_id)
      : null

  let menu: { id: string; title: string } | null = null

  if (directMenuId) {
    const { data: menuRow } = await (db
      .from('menus' as any)
      .select('id, name')
      .eq('id', directMenuId)
      .eq('tenant_id', tenantId)
      .maybeSingle() as any)

    if (menuRow) {
      menu = {
        id: String(menuRow.id),
        title: String(menuRow.name ?? '').trim() || 'Untitled Menu',
      }
    }
  }

  if (!menu) {
    const { data: fallbackMenuRow } = await (db
      .from('menus' as any)
      .select('id, name')
      .eq('event_id', eventId)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle() as any)

    if (fallbackMenuRow) {
      menu = {
        id: String(fallbackMenuRow.id),
        title: String(fallbackMenuRow.name ?? '').trim() || 'Untitled Menu',
      }
    }
  }

  let menuDishes: any[] = []
  if (menu) {
    const { data: dishRows, error: dishError } = await (db
      .from('dishes' as any)
      .select('course_number, course_name, sort_order')
      .eq('menu_id', menu.id)
      .eq('tenant_id', tenantId)
      .order('course_number', { ascending: true })
      .order('sort_order', { ascending: true }) as any)

    if (dishError) {
      throw new Error('Failed to load menu course structure')
    }

    menuDishes = dishRows ?? []
  }

  const courseCount = normalizeCourseCount((event as any).course_count)
  const menuCourses = buildCoursePlanFromDishes(menuDishes, courseCount)
  const liveCourseConfig = await ensureEventCannabisCourseConfigRows(
    db,
    eventId,
    tenantId,
    courseCount
  )
  const courseConfig = hydrateCourseConfigForCourseCount(liveCourseConfig, courseCount)

  return {
    event,
    menu,
    menuCourses,
    courseConfig,
    guestSnapshotInput,
    participationByGuestName,
    sourceGuestUpdatedAt,
  }
}

function snapshotGuestNames(snapshotGuestPayload: any[]): string[] {
  return (snapshotGuestPayload ?? [])
    .map((guest) => String(guest?.full_name ?? guest?.fullName ?? '').trim())
    .filter(Boolean)
}

function buildDefaultPlannedBreakdown(courseConfig: CourseConfigRow[]): number[] {
  return courseConfig.map((course) => {
    if (!course.infusionEnabled) return 0
    return Number(course.plannedMgPerGuest ?? 0)
  })
}

function buildSnapshotJsonPayload(args: {
  nextVersion: number
  eventId: string
  tenantId: string
  courseCount: number
  menu: { id: string; title: string } | null
  courses: CoursePlanRow[]
  courseConfig: CourseConfigRow[]
  guestSnapshot: any[]
  seatingSnapshot: any[]
  participationSnapshot: any
  layoutType: ControlPacketLayoutType
  customSeatCount: number
}) {
  return {
    snapshot_version: args.nextVersion,
    event: {
      event_id: args.eventId,
      tenant_id: args.tenantId,
      course_count: args.courseCount,
    },
    menu: args.menu
      ? {
          menu_id: args.menu.id,
          title: args.menu.title,
        }
      : null,
    courses: args.courses.map((course) => ({
      course_index: course.courseIndex,
      course_name: course.courseName,
      source_course_number: course.sourceCourseNumber,
    })),
    course_config: args.courseConfig.map((course) => ({
      course_index: course.courseIndex,
      infusion_enabled: course.infusionEnabled,
      planned_mg_per_guest: course.plannedMgPerGuest,
      notes: course.notes,
      is_active: course.isActive,
    })),
    course_count: args.courseCount,
    guest_snapshot: args.guestSnapshot,
    seating_snapshot: args.seatingSnapshot,
    participation_snapshot: args.participationSnapshot,
    layout: {
      layout_type: args.layoutType,
      layout_meta: {
        generated_from: args.layoutType,
        custom_seat_count: args.customSeatCount,
      },
    },
  }
}

export async function getCannabisControlPacketData(eventId: string, snapshotId?: string | null) {
  const user = await requireChef()
  const db: any = createServerClient()
  const context = await loadCannabisEventContext(eventId, user.tenantId!)

  const { data: snapshots, error: snapshotsError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .select('*')
    .eq('event_id', eventId)
    .eq('tenant_id', user.tenantId!)
    .order('version_number', { ascending: false }) as any)

  if (snapshotsError) {
    throw new Error('Failed to load control packet snapshots')
  }

  const snapshotRows = (snapshots ?? []) as any[]

  const activeSnapshot =
    (snapshotId ? snapshotRows.find((snapshot) => snapshot.id === snapshotId) : null) ??
    snapshotRows[0] ??
    null

  let reconciliation: any = null
  let evidence: any[] = []

  if (activeSnapshot) {
    const [{ data: reconciliationRow }, { data: evidenceRows }] = await Promise.all([
      db
        .from('cannabis_control_packet_reconciliations' as any)
        .select('*')
        .eq('snapshot_id', activeSnapshot.id)
        .eq('tenant_id', user.tenantId!)
        .maybeSingle() as any,
      db
        .from('cannabis_control_packet_evidence' as any)
        .select('*')
        .eq('snapshot_id', activeSnapshot.id)
        .eq('tenant_id', user.tenantId!)
        .order('created_at', { ascending: false }) as any,
    ])

    reconciliation = reconciliationRow ?? null
    evidence = evidenceRows ?? []

    if (evidence.length > 0) {
      const paths = evidence.map((item) => item.storage_path as string).filter(Boolean)
      const { data: signedData } = await db.storage
        .from(CONTROL_PACKET_BUCKET)
        .createSignedUrls(paths, SIGNED_URL_EXPIRY_SECONDS)

      const signedUrlByPath = new Map<string, string>()
      for (const entry of signedData ?? []) {
        if (entry.path && entry.signedUrl) signedUrlByPath.set(entry.path, entry.signedUrl)
      }

      evidence = evidence.map((item) => ({
        ...item,
        signedUrl: signedUrlByPath.get(item.storage_path) ?? null,
      }))
    }
  }

  const alertRsvpUpdatedAfterSnapshot =
    !!activeSnapshot &&
    !!context.sourceGuestUpdatedAt &&
    Date.parse(context.sourceGuestUpdatedAt) > Date.parse(activeSnapshot.generated_at)

  const participationSummary = summarizeParticipationStatuses(context.guestSnapshotInput)
  const snapshotPlan = sanitizeSnapshotPlan(activeSnapshot)
  const livePlan: SnapshotPlan = {
    menu: context.menu,
    courses: context.menuCourses,
    courseConfig: context.courseConfig,
  }
  const effectiveSnapshotPlan = snapshotPlan ?? livePlan

  return {
    event: {
      id: context.event.id,
      date: context.event.event_date,
      serveTime: context.event.serve_time,
      hostName: (context.event as any).clients?.full_name ?? 'Host',
      occasion: context.event.occasion ?? null,
      guestCount: context.event.guest_count ?? context.guestSnapshotInput.length,
      courseCount: normalizeCourseCount((context.event as any).course_count),
      menuId:
        typeof (context.event as any).menu_id === 'string' &&
        String((context.event as any).menu_id).trim().length > 0
          ? String((context.event as any).menu_id)
          : null,
      status: context.event.status,
    },
    guestRows: context.guestSnapshotInput,
    participationSummary,
    menuPlan: {
      hasMenu: !!context.menu,
      attachMenuHref: `/events/${eventId}`,
      live: livePlan,
      snapshot: effectiveSnapshotPlan,
      snapshotIsFrozen: !!snapshotPlan,
    },
    snapshots: snapshotRows,
    activeSnapshot,
    reconciliation,
    evidence,
    alertRsvpUpdatedAfterSnapshot,
    sourceGuestUpdatedAt: context.sourceGuestUpdatedAt,
  }
}

export async function upsertEventCannabisCourseConfig(
  input: z.infer<typeof UpsertCourseConfigSchema>
) {
  const validated = UpsertCourseConfigSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: event, error: eventError } = await (db
    .from('events' as any)
    .select('id, tenant_id, cannabis_preference, course_count, menu_id')
    .eq('id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (eventError || !event) {
    throw new Error('Event not found')
  }

  if (!event.cannabis_preference) {
    throw new Error('Cannabis overlay is only available for cannabis-enabled events')
  }

  let hasAttachedMenu = typeof event.menu_id === 'string' && String(event.menu_id).trim().length > 0

  if (!hasAttachedMenu) {
    const { data: fallbackMenu } = await (db
      .from('menus' as any)
      .select('id')
      .eq('event_id', validated.eventId)
      .eq('tenant_id', user.tenantId!)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle() as any)
    hasAttachedMenu = !!fallbackMenu
  }

  if (!hasAttachedMenu) {
    throw new Error('Attach a menu to this event before editing infusion planning')
  }

  const courseCount = normalizeCourseCount(event.course_count)
  const ensuredRows = await ensureEventCannabisCourseConfigRows(
    db,
    validated.eventId,
    user.tenantId!,
    courseCount
  )
  const ensuredByIndex = new Map<number, CourseConfigRow>(
    ensuredRows.map((row) => [row.courseIndex, row])
  )
  const incomingByIndex = new Map<number, (typeof validated.courseConfig)[number]>(
    validated.courseConfig.map((row) => [row.courseIndex, row])
  )

  const rowsToPersist = Array.from({ length: courseCount }, (_, index) => {
    const courseIndex = index + 1
    const incoming = incomingByIndex.get(courseIndex)
    const existing = ensuredByIndex.get(courseIndex)

    return {
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      course_index: courseIndex,
      infusion_enabled: incoming ? incoming.infusionEnabled : !!existing?.infusionEnabled,
      planned_mg_per_guest:
        incoming && incoming.plannedMgPerGuest !== undefined
          ? incoming.plannedMgPerGuest
          : (existing?.plannedMgPerGuest ?? null),
      notes: incoming ? normalizeNullableText(incoming.notes ?? null) : (existing?.notes ?? null),
      is_active: true,
      archived_at: null,
    }
  })

  const { error: upsertError } = await (db
    .from('event_cannabis_course_config' as any)
    .upsert(rowsToPersist as any, { onConflict: 'event_id,course_index' }) as any)

  if (upsertError) {
    throw new Error('Failed to save infusion plan')
  }

  revalidatePath(`/cannabis/events/${validated.eventId}/control-packet`)

  return {
    success: true,
  }
}

export async function generateCannabisControlPacketSnapshot(
  input: z.infer<typeof GenerateSnapshotSchema>
) {
  const validated = GenerateSnapshotSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()
  const context = await loadCannabisEventContext(validated.eventId, user.tenantId!)

  if (!context.menu) {
    throw new Error('Attach a menu to this event before generating a control packet snapshot')
  }

  const { data: latestVersionRow } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .select('version_number')
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle() as any)

  const nextVersion = Number(latestVersionRow?.version_number ?? 0) + 1
  const courseCount = normalizeCourseCount((context.event as any).course_count)
  const frozenMenuPlan: SnapshotPlan = {
    menu: context.menu,
    courses: context.menuCourses,
    courseConfig: hydrateCourseConfigForCourseCount(context.courseConfig, courseCount),
  }
  const seatCountTarget = Math.max(
    Number(context.event.guest_count ?? 0),
    context.guestSnapshotInput.length,
    1
  )

  const seatBlueprint = generateSeatBlueprint(
    validated.layoutType as ControlPacketLayoutType,
    seatCountTarget,
    validated.customSeatIds ?? []
  )
  const seatingSnapshot = assignGuestsToSeats(
    context.guestSnapshotInput,
    seatBlueprint,
    courseCount
  )

  const guestSnapshot = context.guestSnapshotInput.map((guest) => ({
    guest_id: guest.guestId,
    full_name: guest.fullName,
    participation_status: guest.participationStatus,
    rsvp_status: guest.rsvpStatus,
    preferred_dose_note: guest.preferredDoseNote ?? null,
    created_at: guest.createdAt ?? null,
  }))

  const participationSnapshot = summarizeParticipationStatuses(context.guestSnapshotInput)
  const snapshotJson = buildSnapshotJsonPayload({
    nextVersion,
    eventId: validated.eventId,
    tenantId: user.tenantId!,
    courseCount,
    menu: frozenMenuPlan.menu,
    courses: frozenMenuPlan.courses,
    courseConfig: frozenMenuPlan.courseConfig,
    guestSnapshot,
    seatingSnapshot,
    participationSnapshot,
    layoutType: validated.layoutType,
    customSeatCount: validated.customSeatIds?.length ?? 0,
  })

  const { data: inserted, error: insertError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .insert({
      event_id: validated.eventId,
      tenant_id: user.tenantId!,
      version_number: nextVersion,
      generated_by: user.id,
      guest_snapshot: guestSnapshot,
      seating_snapshot: seatingSnapshot,
      participation_snapshot: participationSnapshot,
      course_count: courseCount,
      layout_type: validated.layoutType,
      layout_meta: {
        generated_from: validated.layoutType,
        custom_seat_count: validated.customSeatIds?.length ?? 0,
      },
      snapshot_json: snapshotJson,
      source_guest_updated_at: context.sourceGuestUpdatedAt,
    })
    .select('*')
    .single() as any)

  if (insertError || !inserted) {
    throw new Error('Failed to generate control packet snapshot')
  }

  revalidatePath('/cannabis/events')
  revalidatePath(`/cannabis/events/${validated.eventId}/control-packet`)

  return {
    success: true,
    snapshotId: inserted.id as string,
    versionNumber: inserted.version_number as number,
  }
}

export async function uploadControlPacketEvidence(snapshotId: string, formData: FormData) {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: snapshot, error: snapshotError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .select('id, event_id, tenant_id, finalization_locked')
    .eq('id', snapshotId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (snapshotError || !snapshot) {
    throw new Error('Snapshot not found')
  }

  if (snapshot.finalization_locked) {
    throw new Error('Cannot upload evidence after finalization')
  }

  const file = formData.get('evidence') as File | null
  if (!file || file.size === 0) throw new Error('No file provided')
  if (!ALLOWED_MIME_TYPES.includes(file.type)) throw new Error('Unsupported file type')
  if (file.size > MAX_EVIDENCE_FILE_SIZE) throw new Error('File too large. Maximum is 10MB')

  const extension = MIME_TO_EXTENSION[file.type]
  if (!extension) throw new Error('Unsupported file type')

  const evidenceId = crypto.randomUUID()
  const storagePath = `${user.tenantId}/${snapshot.event_id}/${snapshot.id}/${evidenceId}.${extension}`

  const { error: uploadError } = await db.storage
    .from(CONTROL_PACKET_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Evidence upload failed: ${uploadError.message}`)
  }

  const { data: inserted, error: insertError } = await (db
    .from('cannabis_control_packet_evidence' as any)
    .insert({
      id: evidenceId,
      snapshot_id: snapshot.id,
      event_id: snapshot.event_id,
      tenant_id: user.tenantId!,
      storage_path: storagePath,
      content_type: file.type,
      size_bytes: file.size,
      uploaded_by: user.id,
    })
    .select('*')
    .single() as any)

  if (insertError || !inserted) {
    await db.storage.from(CONTROL_PACKET_BUCKET).remove([storagePath])
    throw new Error('Failed to save evidence record')
  }

  revalidatePath(`/cannabis/events/${snapshot.event_id}/control-packet`)
  return { success: true, evidenceId: inserted.id as string }
}

export async function upsertControlPacketReconciliation(
  input: z.infer<typeof SaveReconciliationSchema>
) {
  const validated = SaveReconciliationSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: snapshot, error: snapshotError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .select('*')
    .eq('id', validated.snapshotId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (snapshotError || !snapshot) {
    throw new Error('Snapshot not found for this event')
  }

  if (snapshot.finalization_locked) {
    throw new Error('Snapshot is finalized and cannot be edited')
  }

  const safeCourseCount = normalizeCourseCount(Number(snapshot.course_count ?? 1))
  const frozenSnapshotPlan = sanitizeSnapshotPlan(snapshot)
  const fallbackCourseConfig = hydrateCourseConfigForCourseCount(
    frozenSnapshotPlan?.courseConfig ?? [],
    safeCourseCount
  )
  const fallbackBreakdownByCourse = buildDefaultPlannedBreakdown(fallbackCourseConfig)
  const fallbackPlannedTotal = fallbackBreakdownByCourse.reduce((sum, mg) => sum + mg, 0)

  const snapshotParticipationByGuest = new Map<string, string>(
    ((snapshot.guest_snapshot ?? []) as any[])
      .map((guest): [string, string] => [
        String(guest?.full_name ?? guest?.fullName ?? '')
          .trim()
          .toLowerCase(),
        String(guest?.participation_status ?? guest?.participationStatus ?? ''),
      ])
      .filter(([name]) => !!name)
  )

  const sanitizedGuestRows = validated.guestRows.map((row) => {
    const guestName = row.guestName.trim()
    const guestKey = guestName.toLowerCase()
    const participationStatus = snapshotParticipationByGuest.get(guestKey)
    const defaultPlanned =
      participationStatus && participationStatus !== 'participate' ? 0 : fallbackPlannedTotal

    const plannedTotal = row.totalMgPlanned ?? defaultPlanned
    const breakdownPerCourseMg = Array.from({ length: safeCourseCount }, (_, index) => {
      const provided = row.breakdownPerCourseMg?.[index]
      if (provided !== undefined && provided !== null && Number.isFinite(Number(provided))) {
        return Number(provided)
      }
      return Number(fallbackBreakdownByCourse[index] ?? 0)
    })

    return {
      guestId: row.guestId ?? null,
      guestName,
      totalMgPlanned: plannedTotal,
      totalMgServed: row.totalMgServed ?? null,
      breakdownPerCourseMg,
      perCourse:
        row.perCourse?.map((courseRow) => ({
          courseNumber: courseRow.courseNumber,
          mgServed: courseRow.mgServed ?? null,
          doseApplied: !!courseRow.doseApplied,
          skipped: !!courseRow.skipped,
          optedOutDuringService: !!courseRow.optedOutDuringService,
        })) ?? [],
      notes: normalizeNullableText(row.notes ?? null),
    }
  })

  const mismatchSummary = evaluateReconciliation(
    snapshotGuestNames((snapshot.guest_snapshot ?? []) as any[]),
    sanitizedGuestRows,
    safeCourseCount
  )

  const { error: upsertError } = await (db
    .from('cannabis_control_packet_reconciliations' as any)
    .upsert(
      {
        snapshot_id: snapshot.id,
        event_id: snapshot.event_id,
        tenant_id: user.tenantId!,
        snapshot_version: snapshot.version_number,
        extract_label_strength: normalizeNullableText(validated.extractLabelStrength ?? null),
        service_operator: normalizeNullableText(validated.serviceOperator ?? null),
        total_syringes_portioned: validated.totalSyringesPortioned ?? null,
        total_doses_administered: validated.totalDosesAdministered ?? null,
        extract_returned_to_host: validated.extractReturnedToHost ?? null,
        irregularities_notes: normalizeNullableText(validated.irregularitiesNotes ?? null),
        chef_signature: normalizeNullableText(validated.chefSignature ?? null),
        host_acknowledgment: normalizeNullableText(validated.hostAcknowledgment ?? null),
        guest_reconciliation: sanitizedGuestRows,
        mismatch_summary: mismatchSummary,
        reconciled_at: new Date().toISOString(),
        reconciled_by: user.id,
      },
      { onConflict: 'snapshot_id' }
    ) as any)

  if (upsertError) {
    throw new Error('Failed to save reconciliation')
  }

  revalidatePath(`/cannabis/events/${validated.eventId}/control-packet`)
  return {
    success: true,
    mismatchSummary,
  }
}

export async function finalizeControlPacket(input: z.infer<typeof FinalizePacketSchema>) {
  const validated = FinalizePacketSchema.parse(input)
  const user = await requireChef()
  const db: any = createServerClient()

  const { data: snapshot, error: snapshotError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .select('*')
    .eq('id', validated.snapshotId)
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (snapshotError || !snapshot) {
    throw new Error('Snapshot not found')
  }

  if (snapshot.finalization_locked) {
    throw new Error('Packet is already finalized')
  }

  const [{ data: reconciliation }, { count: evidenceCount }] = await Promise.all([
    db
      .from('cannabis_control_packet_reconciliations' as any)
      .select('*')
      .eq('snapshot_id', snapshot.id)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle() as any,
    db
      .from('cannabis_control_packet_evidence' as any)
      .select('id', { count: 'exact', head: true })
      .eq('snapshot_id', snapshot.id)
      .eq('tenant_id', user.tenantId!) as any,
  ])

  if (!reconciliation) {
    throw new Error('Reconciliation is required before finalization')
  }

  if ((evidenceCount ?? 0) < 1) {
    throw new Error('At least one photo evidence upload is required')
  }

  if (!reconciliation.service_operator || !reconciliation.extract_label_strength) {
    throw new Error('Service operator and extract label strength are required to finalize')
  }

  const finalizedAt = new Date().toISOString()

  const { error: snapshotUpdateError } = await (db
    .from('cannabis_control_packet_snapshots' as any)
    .update({
      finalization_locked: true,
      finalized_at: finalizedAt,
      finalized_by: user.id,
      archival_pdf_path: normalizeNullableText(validated.archivalPdfPath ?? null),
    })
    .eq('id', snapshot.id)
    .eq('tenant_id', user.tenantId!) as any)

  if (snapshotUpdateError) {
    throw new Error('Failed to finalize packet snapshot')
  }

  const { error: reconciliationUpdateError } = await (db
    .from('cannabis_control_packet_reconciliations' as any)
    .update({
      finalized_at: finalizedAt,
      finalized_by: user.id,
    })
    .eq('snapshot_id', snapshot.id)
    .eq('tenant_id', user.tenantId!) as any)

  if (reconciliationUpdateError) {
    throw new Error('Snapshot finalized, but reconciliation finalization update failed')
  }

  revalidatePath(`/cannabis/events/${validated.eventId}/control-packet`)

  return {
    success: true,
    finalizedAt,
  }
}
