import { getCannabisControlPacketData } from '@/lib/chef/cannabis-control-packet-actions'

export type DosingPacketGuest = {
  guestName: string
  seatId: string
  participationStatus: 'participate' | 'not_consume' | 'undecided' | 'no_response'
  preferredDoseNote: string | null
  familiarityLevel: string | null
  totalPlannedMg: number
  courses: Array<{
    courseIndex: number
    courseName: string
    plannedMg: number
    infusionEnabled: boolean
    batchCode: string | null
    doseVolumeMl: number | null
  }>
}

export type DosingPacketData = {
  event: {
    id: string
    date: string
    serveTime: string | null
    hostName: string
    occasion: string | null
    guestCount: number
    courseCount: number
  }
  guests: DosingPacketGuest[]
  courses: Array<{
    courseIndex: number
    courseName: string
    infusionEnabled: boolean
    plannedMgPerGuest: number | null
    batchCode: string | null
    batchProductName: string | null
    potencyMgPerMl: number | null
    doseVolumeMlPerGuest: number | null
    notes: string | null
  }>
  reconciliation: {
    extractLabelStrength: string | null
    serviceOperator: string | null
  } | null
  totals: {
    totalPlannedMgAllGuests: number
    totalParticipating: number
    totalGuests: number
    totalInfusedCourses: number
    totalCourses: number
  }
  snapshotVersion: number | null
  generatedAt: string
}

function normalizeParticipationStatus(
  value: unknown
): 'participate' | 'not_consume' | 'undecided' | 'no_response' {
  if (value === 'participate') return 'participate'
  if (value === 'not_consume') return 'not_consume'
  if (value === 'undecided') return 'undecided'
  return 'no_response'
}

export async function getDosingPacketData(
  eventId: string,
  snapshotId?: string | null
): Promise<DosingPacketData> {
  const raw = await getCannabisControlPacketData(eventId, snapshotId)

  // Build batch lookup from verified batches: id -> batch row
  const batchById = new Map<string, any>(
    (raw.verifiedBatches ?? []).map((b: any) => [String(b.id), b])
  )

  // Use the effective snapshot plan (frozen snapshot if available, otherwise live)
  const snapshotPlan = raw.menuPlan.snapshot
  const courseConfig = snapshotPlan.courseConfig ?? []
  const coursePlan = snapshotPlan.courses ?? []

  // Build course-level data with batch info resolved
  const courses = coursePlan.map((course: any) => {
    const config = courseConfig.find((c: any) => c.courseIndex === course.courseIndex)
    const batch = config?.regulatedBatchRecordId
      ? batchById.get(config.regulatedBatchRecordId)
      : null

    return {
      courseIndex: course.courseIndex as number,
      courseName: (course.courseName as string) || `Course ${course.courseIndex}`,
      infusionEnabled: !!config?.infusionEnabled,
      plannedMgPerGuest: config?.plannedMgPerGuest ?? null,
      batchCode: batch ? String(batch.batch_code ?? '') || null : null,
      batchProductName: batch ? String(batch.product_name ?? '') || null : null,
      potencyMgPerMl: batch?.estimated_mg_per_ml != null ? Number(batch.estimated_mg_per_ml) : null,
      doseVolumeMlPerGuest: config?.doseVolumeMlPerGuest ?? null,
      notes: config?.notes ?? null,
    }
  })

  // Build a map of guest names to their snapshot profiles for preferred_dose_note
  // and familiarity_level from the active snapshot's guest_snapshot
  const guestSnapshotProfiles = new Map<string, any>()
  const snapshotGuestArray: any[] =
    raw.activeSnapshot?.guest_snapshot ?? raw.activeSnapshot?.snapshot_json?.guest_snapshot ?? []
  for (const g of snapshotGuestArray) {
    const name = String(g?.full_name ?? g?.fullName ?? '')
      .trim()
      .toLowerCase()
    if (name) guestSnapshotProfiles.set(name, g)
  }

  // Build participation lookup from guestRows (live source data)
  const participationByName = new Map<string, string>()
  const preferredDoseByName = new Map<string, string | null>()
  for (const gr of raw.guestRows ?? []) {
    const key = String(gr.fullName ?? '')
      .trim()
      .toLowerCase()
    if (key) {
      participationByName.set(key, gr.participationStatus)
      preferredDoseByName.set(key, gr.preferredDoseNote ?? null)
    }
  }

  // Build guests from seating_snapshot (which assigns seats)
  const seatingSnapshot: any[] =
    raw.activeSnapshot?.seating_snapshot ??
    raw.activeSnapshot?.snapshot_json?.seating_snapshot ??
    []

  const guests: DosingPacketGuest[] = seatingSnapshot.map((seat: any) => {
    const guestName = String(
      seat?.guest_name ?? seat?.guestName ?? seat?.full_name ?? seat?.fullName ?? 'Guest'
    ).trim()
    const nameKey = guestName.toLowerCase()
    const seatId = String(seat?.seat_id ?? seat?.seatId ?? '')

    // Resolve participation status: seating snapshot > guestRows > default
    const seatParticipation = seat?.participation_status ?? seat?.participationStatus ?? null
    const participationStatus = normalizeParticipationStatus(
      seatParticipation ?? participationByName.get(nameKey)
    )

    // Resolve preferred dose note from snapshot profiles or guestRows
    const snapshotProfile = guestSnapshotProfiles.get(nameKey)
    const preferredDoseNote: string | null =
      snapshotProfile?.preferred_dose_note ??
      snapshotProfile?.preferredDoseNote ??
      preferredDoseByName.get(nameKey) ??
      null

    // Familiarity level from snapshot profile if available
    const familiarityLevel: string | null =
      snapshotProfile?.familiarity_level ?? snapshotProfile?.familiarityLevel ?? null

    // Per-course planned doses for this guest
    const isParticipating = participationStatus === 'participate'
    const guestCourses = courses.map((course: any) => {
      const plannedMg =
        isParticipating && course.infusionEnabled ? Number(course.plannedMgPerGuest ?? 0) : 0

      // Resolve batch code for this course
      const config = courseConfig.find((c: any) => c.courseIndex === course.courseIndex)
      const batch = config?.regulatedBatchRecordId
        ? batchById.get(config.regulatedBatchRecordId)
        : null

      return {
        courseIndex: course.courseIndex as number,
        courseName: course.courseName as string,
        plannedMg,
        infusionEnabled: course.infusionEnabled as boolean,
        batchCode: batch ? String(batch.batch_code ?? '') || null : null,
        doseVolumeMl:
          isParticipating && course.infusionEnabled ? (course.doseVolumeMlPerGuest ?? null) : null,
      }
    })

    const totalPlannedMg = guestCourses.reduce(
      (sum: number, c: { plannedMg: number }) => sum + c.plannedMg,
      0
    )

    return {
      guestName,
      seatId,
      participationStatus,
      preferredDoseNote,
      familiarityLevel,
      totalPlannedMg,
      courses: guestCourses,
    }
  })

  // Calculate totals
  const totalParticipating = guests.filter((g) => g.participationStatus === 'participate').length
  const totalPlannedMgAllGuests = guests.reduce((sum, g) => sum + g.totalPlannedMg, 0)
  const totalInfusedCourses = courses.filter(
    (c: { infusionEnabled: boolean }) => c.infusionEnabled
  ).length

  // Build reconciliation summary (extract label strength + service operator)
  const reconciliation = raw.reconciliation
    ? {
        extractLabelStrength: raw.reconciliation.extract_label_strength ?? null,
        serviceOperator: raw.reconciliation.service_operator ?? null,
      }
    : null

  const snapshotVersion: number | null = raw.activeSnapshot?.version_number
    ? Number(raw.activeSnapshot.version_number)
    : null

  const generatedAt = raw.activeSnapshot?.generated_at
    ? String(raw.activeSnapshot.generated_at)
    : new Date().toISOString()

  return {
    event: {
      id: raw.event.id,
      date: raw.event.date,
      serveTime: raw.event.serveTime ?? null,
      hostName: raw.event.hostName,
      occasion: raw.event.occasion ?? null,
      guestCount: raw.event.guestCount,
      courseCount: raw.event.courseCount,
    },
    guests,
    courses,
    reconciliation,
    totals: {
      totalPlannedMgAllGuests,
      totalParticipating,
      totalGuests: guests.length,
      totalInfusedCourses,
      totalCourses: courses.length,
    },
    snapshotVersion,
    generatedAt,
  }
}
