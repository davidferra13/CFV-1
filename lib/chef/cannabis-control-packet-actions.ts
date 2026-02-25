'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
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

async function loadCannabisEventContext(eventId: string, tenantId: string) {
  const supabase = createServerClient()

  const { data: event, error: eventError } = await (supabase
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

  const { data: guestRows, error: guestsError } = await supabase
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
    const { data: profileRows, error: profileError } = await (supabase
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

  const sourceGuestUpdatedAtValues = [
    ...guests.map((guest) => toIsoOrNull(guest.updated_at)),
    ...profiles.map((profile) => toIsoOrNull(profile?.updated_at)),
  ].filter(Boolean) as string[]

  const sourceGuestUpdatedAt =
    sourceGuestUpdatedAtValues.length > 0
      ? sourceGuestUpdatedAtValues.sort((a, b) => Date.parse(b) - Date.parse(a))[0]
      : null

  return {
    event,
    guestSnapshotInput,
    sourceGuestUpdatedAt,
  }
}

function snapshotGuestNames(snapshotGuestPayload: any[]): string[] {
  return (snapshotGuestPayload ?? [])
    .map((guest) => String(guest?.full_name ?? guest?.fullName ?? '').trim())
    .filter(Boolean)
}

export async function getCannabisControlPacketData(eventId: string, snapshotId?: string | null) {
  const user = await requireChef()
  const supabase = createServerClient()
  const context = await loadCannabisEventContext(eventId, user.tenantId!)

  const { data: snapshots, error: snapshotsError } = await (supabase
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
      supabase
        .from('cannabis_control_packet_reconciliations' as any)
        .select('*')
        .eq('snapshot_id', activeSnapshot.id)
        .eq('tenant_id', user.tenantId!)
        .maybeSingle() as any,
      supabase
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
      const { data: signedData } = await supabase.storage
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

  return {
    event: {
      id: context.event.id,
      date: context.event.event_date,
      serveTime: context.event.serve_time,
      hostName: (context.event as any).clients?.full_name ?? 'Host',
      occasion: context.event.occasion ?? null,
      guestCount: context.event.guest_count ?? context.guestSnapshotInput.length,
      courseCount: normalizeCourseCount((context.event as any).course_count),
      status: context.event.status,
    },
    guestRows: context.guestSnapshotInput,
    participationSummary,
    snapshots: snapshotRows,
    activeSnapshot,
    reconciliation,
    evidence,
    alertRsvpUpdatedAfterSnapshot,
    sourceGuestUpdatedAt: context.sourceGuestUpdatedAt,
  }
}

export async function generateCannabisControlPacketSnapshot(
  input: z.infer<typeof GenerateSnapshotSchema>
) {
  const validated = GenerateSnapshotSchema.parse(input)
  const user = await requireChef()
  const supabase = createServerClient()
  const context = await loadCannabisEventContext(validated.eventId, user.tenantId!)

  const { data: latestVersionRow } = await (supabase
    .from('cannabis_control_packet_snapshots' as any)
    .select('version_number')
    .eq('event_id', validated.eventId)
    .eq('tenant_id', user.tenantId!)
    .order('version_number', { ascending: false })
    .limit(1)
    .maybeSingle() as any)

  const nextVersion = Number(latestVersionRow?.version_number ?? 0) + 1
  const courseCount = normalizeCourseCount((context.event as any).course_count)
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

  const { data: inserted, error: insertError } = await (supabase
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
  const supabase = createServerClient()

  const { data: snapshot, error: snapshotError } = await (supabase
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

  const { error: uploadError } = await supabase.storage
    .from(CONTROL_PACKET_BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    throw new Error(`Evidence upload failed: ${uploadError.message}`)
  }

  const { data: inserted, error: insertError } = await (supabase
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
    await supabase.storage.from(CONTROL_PACKET_BUCKET).remove([storagePath])
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
  const supabase = createServerClient()

  const { data: snapshot, error: snapshotError } = await (supabase
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

  const sanitizedGuestRows = validated.guestRows.map((row) => ({
    guestId: row.guestId ?? null,
    guestName: row.guestName.trim(),
    totalMgPlanned: row.totalMgPlanned ?? null,
    totalMgServed: row.totalMgServed ?? null,
    breakdownPerCourseMg: row.breakdownPerCourseMg ?? [],
    perCourse:
      row.perCourse?.map((courseRow) => ({
        courseNumber: courseRow.courseNumber,
        mgServed: courseRow.mgServed ?? null,
        doseApplied: !!courseRow.doseApplied,
        skipped: !!courseRow.skipped,
        optedOutDuringService: !!courseRow.optedOutDuringService,
      })) ?? [],
    notes: normalizeNullableText(row.notes ?? null),
  }))

  const mismatchSummary = evaluateReconciliation(
    snapshotGuestNames((snapshot.guest_snapshot ?? []) as any[]),
    sanitizedGuestRows,
    Number(snapshot.course_count ?? 1)
  )

  const { error: upsertError } = await (supabase
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
  const supabase = createServerClient()

  const { data: snapshot, error: snapshotError } = await (supabase
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
    supabase
      .from('cannabis_control_packet_reconciliations' as any)
      .select('*')
      .eq('snapshot_id', snapshot.id)
      .eq('tenant_id', user.tenantId!)
      .maybeSingle() as any,
    supabase
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

  const { error: snapshotUpdateError } = await (supabase
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

  const { error: reconciliationUpdateError } = await (supabase
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
