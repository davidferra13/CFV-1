export type DietarySeverity = 'preference' | 'intolerance' | 'anaphylaxis'
export type DietaryItemType = 'dietary' | 'allergy'
export type DietarySubject = 'guest' | 'plus_one'

export type StructuredDietaryItem = {
  subject: DietarySubject
  item_type: DietaryItemType
  label: string
  severity: DietarySeverity
  notes?: string | null
}

type BuildDietaryInput = {
  dietaryRestrictions?: string[] | null
  allergies?: string[] | null
  plusOneDietary?: string[] | null
  plusOneAllergies?: string[] | null
  explicitItems?: StructuredDietaryItem[] | null
}

function normalizeLabel(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

function inferSeverity(label: string, fallback: DietarySeverity): DietarySeverity {
  const normalized = label.toLowerCase()
  if (/(anaphyl|epi-?pen|severe allergy|fatal)/i.test(normalized)) return 'anaphylaxis'
  if (/(intoleran|sensitive|cannot tolerate)/i.test(normalized)) return 'intolerance'
  return fallback
}

function stripSeveritySuffix(label: string): string {
  return label
    .replace(/\((anaphylaxis|severe|intolerance|preference)\)/gi, '')
    .replace(/\b(anaphylaxis|severe allergy|intolerance|preference)\b/gi, '')
    .trim()
}

function mapLabels(
  labels: string[] | null | undefined,
  subject: DietarySubject,
  itemType: DietaryItemType,
  defaultSeverity: DietarySeverity
): StructuredDietaryItem[] {
  if (!labels || labels.length === 0) return []
  return labels
    .map((raw) => normalizeLabel(raw))
    .filter(Boolean)
    .map((normalized) => {
      const severity = inferSeverity(normalized, defaultSeverity)
      const label = stripSeveritySuffix(normalized)
      return {
        subject,
        item_type: itemType,
        label,
        severity,
      }
    })
}

export function buildStructuredDietaryItems(input: BuildDietaryInput): StructuredDietaryItem[] {
  const generated = [
    ...mapLabels(input.dietaryRestrictions, 'guest', 'dietary', 'preference'),
    ...mapLabels(input.allergies, 'guest', 'allergy', 'intolerance'),
    ...mapLabels(input.plusOneDietary, 'plus_one', 'dietary', 'preference'),
    ...mapLabels(input.plusOneAllergies, 'plus_one', 'allergy', 'intolerance'),
  ]

  const explicit = (input.explicitItems || [])
    .map((item) => ({
      subject: item.subject,
      item_type: item.item_type,
      label: normalizeLabel(item.label),
      severity: item.severity,
      notes: item.notes || null,
    }))
    .filter((item) => item.label.length > 0)

  const allItems = [...generated, ...explicit]

  // Deduplicate by subject/type/label, preserving highest severity.
  const severityRank: Record<DietarySeverity, number> = {
    preference: 1,
    intolerance: 2,
    anaphylaxis: 3,
  }

  const map = new Map<string, StructuredDietaryItem>()
  for (const item of allItems) {
    const key = `${item.subject}:${item.item_type}:${item.label.toLowerCase()}`
    const existing = map.get(key)
    if (!existing || severityRank[item.severity] > severityRank[existing.severity]) {
      map.set(key, item)
    }
  }

  return Array.from(map.values())
}

export function isCriticalRsvpChange(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined,
  structuredItems: StructuredDietaryItem[]
): { critical: boolean; reason: string | null } {
  if (!after) return { critical: false, reason: null }

  const nextStatus = (after.rsvp_status as string | undefined) || null
  const prevStatus = (before?.rsvp_status as string | undefined) || null

  if (prevStatus && nextStatus && prevStatus !== nextStatus) {
    return { critical: true, reason: `RSVP status changed (${prevStatus} -> ${nextStatus})` }
  }

  if (structuredItems.some((item) => item.severity === 'anaphylaxis')) {
    return { critical: true, reason: 'Anaphylaxis-level dietary/allergy detail present' }
  }

  const beforeAllergies = JSON.stringify(before?.allergies ?? [])
  const afterAllergies = JSON.stringify(after.allergies ?? [])
  if (beforeAllergies !== afterAllergies) {
    return { critical: true, reason: 'Allergy list changed' }
  }

  return { critical: false, reason: null }
}

export function evaluateCapacityDecision(input: {
  currentAttending: number
  capacityLimit: number | null
  enforceCapacity: boolean
  waitlistEnabled: boolean
  requestedAttending: boolean
}): {
  allowAttending: boolean
  shouldWaitlist: boolean
  rejectReason: string | null
} {
  if (!input.requestedAttending) {
    return { allowAttending: true, shouldWaitlist: false, rejectReason: null }
  }

  if (!input.enforceCapacity || !input.capacityLimit || input.capacityLimit <= 0) {
    return { allowAttending: true, shouldWaitlist: false, rejectReason: null }
  }

  if (input.currentAttending < input.capacityLimit) {
    return { allowAttending: true, shouldWaitlist: false, rejectReason: null }
  }

  if (input.waitlistEnabled) {
    return { allowAttending: false, shouldWaitlist: true, rejectReason: null }
  }

  return {
    allowAttending: false,
    shouldWaitlist: false,
    rejectReason: 'This event is currently at capacity.',
  }
}

export function resolveRsvpWriteState(input: {
  requestedStatus: 'attending' | 'declined' | 'maybe'
  shouldWaitlist: boolean
  previousQueueStatus?: 'none' | 'waitlisted' | 'promoted' | null
}) {
  if (input.shouldWaitlist) {
    return {
      rsvp_status: 'pending' as const,
      attendance_queue_status: 'waitlisted' as const,
      waitlisted: true,
      promoted: false,
    }
  }

  if (input.requestedStatus === 'attending') {
    const promoted = (input.previousQueueStatus || 'none') === 'waitlisted'
    return {
      rsvp_status: 'attending' as const,
      attendance_queue_status: promoted ? ('promoted' as const) : ('none' as const),
      waitlisted: false,
      promoted,
    }
  }

  return {
    rsvp_status: input.requestedStatus,
    attendance_queue_status: 'none' as const,
    waitlisted: false,
    promoted: false,
  }
}

export function getReminderOffsetKeys(schedule?: string[] | null): string[] {
  const fallback = ['7d', '3d', '24h']
  const values = Array.isArray(schedule) && schedule.length > 0 ? schedule : fallback
  const allowed = new Set(['7d', '3d', '24h', 'deadline'])
  return values.filter((value) => allowed.has(value))
}
