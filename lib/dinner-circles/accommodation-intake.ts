import type {
  DinnerCircleAccommodationCategory,
  DinnerCircleAccommodationIntake,
  DinnerCircleAccommodationNote,
  DinnerCircleAccommodationReadiness,
  DinnerCircleAccommodationReadinessItem,
  DinnerCircleAccommodationVisibility,
} from './types'

export const DINNER_CIRCLE_ACCOMMODATION_CATEGORIES: Array<{
  id: DinnerCircleAccommodationCategory
  label: string
  prompt: string
}> = [
  {
    id: 'mobility',
    label: 'Mobility',
    prompt: 'Walking distance, stairs, standing time, transfers, or mobility device needs.',
  },
  {
    id: 'seating_access',
    label: 'Seating and access',
    prompt:
      'Seat placement, table height, aisle access, restroom path, parking, or entrance notes.',
  },
  {
    id: 'sensory',
    label: 'Sensory',
    prompt: 'Noise, lighting, scent, crowding, texture, or pacing sensitivities.',
  },
  {
    id: 'language',
    label: 'Language',
    prompt:
      'Preferred language, interpreter needs, captions, written menu, or communication style.',
  },
  {
    id: 'service_preference',
    label: 'Service preference',
    prompt: 'How you prefer staff to check in, serve, explain dishes, or avoid attention.',
  },
  {
    id: 'health_food',
    label: 'Voluntary health-related food constraint',
    prompt: 'Pregnancy, medication, medical diet, or other health context you choose to share.',
  },
]

export const DINNER_CIRCLE_ACCOMMODATION_VISIBILITIES: Array<{
  id: DinnerCircleAccommodationVisibility
  label: string
  description: string
}> = [
  {
    id: 'chef_only',
    label: 'Chef only',
    description: 'Only the chef and you can see the note.',
  },
  {
    id: 'host_only',
    label: 'Host only',
    description: 'Only hosts and you can see the note.',
  },
  {
    id: 'host_and_chef',
    label: 'Host and chef',
    description: 'Hosts and the chef can see the note.',
  },
  {
    id: 'attendee_visible',
    label: 'Attendee visible',
    description: 'Circle attendees can see the note.',
  },
]

const CATEGORY_IDS = new Set<DinnerCircleAccommodationCategory>(
  DINNER_CIRCLE_ACCOMMODATION_CATEGORIES.map((category) => category.id)
)

const VISIBILITY_IDS = new Set<DinnerCircleAccommodationVisibility>(
  DINNER_CIRCLE_ACCOMMODATION_VISIBILITIES.map((visibility) => visibility.id)
)

type AccommodationViewer =
  | { role: 'chef' }
  | { role: 'host'; profileId: string }
  | { role: 'member'; profileId: string }

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeCategory(value: unknown): DinnerCircleAccommodationCategory {
  return CATEGORY_IDS.has(value as DinnerCircleAccommodationCategory)
    ? (value as DinnerCircleAccommodationCategory)
    : 'service_preference'
}

function normalizeVisibility(value: unknown): DinnerCircleAccommodationVisibility {
  return VISIBILITY_IDS.has(value as DinnerCircleAccommodationVisibility)
    ? (value as DinnerCircleAccommodationVisibility)
    : 'chef_only'
}

function isIsoString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

export function getDinnerCircleAccommodationCategoryLabel(
  category: DinnerCircleAccommodationCategory
) {
  return (
    DINNER_CIRCLE_ACCOMMODATION_CATEGORIES.find((entry) => entry.id === category)?.label ??
    'Accommodation'
  )
}

export function normalizeDinnerCircleAccommodationIntake(
  value: unknown
): DinnerCircleAccommodationIntake {
  const input =
    value && typeof value === 'object' ? (value as Partial<DinnerCircleAccommodationIntake>) : {}
  const notes = Array.isArray(input.notes) ? input.notes : []

  return {
    requestedAt: isIsoString(input.requestedAt) ? input.requestedAt : null,
    requestedByProfileId: optionalString(input.requestedByProfileId),
    requestedByName: optionalString(input.requestedByName),
    notes: notes
      .map((note): DinnerCircleAccommodationNote | null => {
        const raw = note && typeof note === 'object' ? (note as Record<string, unknown>) : null
        if (!raw) return null

        const id = optionalString(raw.id)
        const noteText = optionalString(raw.note)
        const submittedByProfileId = optionalString(raw.submittedByProfileId)
        if (!id || !noteText || !submittedByProfileId) return null

        const now = new Date().toISOString()
        return {
          id,
          category: normalizeCategory(raw.category),
          note: noteText.slice(0, 1200),
          visibility: normalizeVisibility(raw.visibility),
          chefRelevant: raw.chefRelevant !== false,
          submittedByProfileId,
          submittedByName: optionalString(raw.submittedByName),
          createdAt: isIsoString(raw.createdAt) ? raw.createdAt : now,
          updatedAt: isIsoString(raw.updatedAt) ? raw.updatedAt : now,
        }
      })
      .filter((note): note is DinnerCircleAccommodationNote => Boolean(note))
      .slice(0, 200),
  }
}

export function canViewerSeeDinnerCircleAccommodationNote(
  note: DinnerCircleAccommodationNote,
  viewer: AccommodationViewer
): boolean {
  if (viewer.role !== 'chef' && note.submittedByProfileId === viewer.profileId) return true
  if (note.visibility === 'attendee_visible') return true
  if (viewer.role === 'chef') {
    return note.visibility === 'chef_only' || note.visibility === 'host_and_chef'
  }
  if (viewer.role === 'host') {
    return note.visibility === 'host_only' || note.visibility === 'host_and_chef'
  }
  return false
}

export function filterDinnerCircleAccommodationIntakeForViewer(
  intake: DinnerCircleAccommodationIntake,
  viewer: AccommodationViewer
): DinnerCircleAccommodationIntake {
  return {
    ...intake,
    notes: intake.notes.filter((note) => canViewerSeeDinnerCircleAccommodationNote(note, viewer)),
  }
}

export function buildDinnerCircleAccommodationReadiness(
  intake: DinnerCircleAccommodationIntake | null | undefined
): DinnerCircleAccommodationReadiness {
  const normalized = normalizeDinnerCircleAccommodationIntake(intake)
  const items: DinnerCircleAccommodationReadinessItem[] = []
  const categoryCounts: DinnerCircleAccommodationReadiness['categoryCounts'] = {}
  let privateHostOnlyCount = 0

  for (const note of normalized.notes) {
    if (!note.chefRelevant) continue

    categoryCounts[note.category] = (categoryCounts[note.category] ?? 0) + 1
    if (note.visibility === 'host_only') {
      privateHostOnlyCount += 1
      continue
    }
    if (
      note.visibility !== 'chef_only' &&
      note.visibility !== 'host_and_chef' &&
      note.visibility !== 'attendee_visible'
    ) {
      continue
    }

    items.push({
      id: note.id,
      category: note.category,
      label: getDinnerCircleAccommodationCategoryLabel(note.category),
      note: note.note,
      submittedByName: note.submittedByName?.trim() || 'Participant',
      visibility: note.visibility,
    })
  }

  const summaryParts = items.map((item) => `${item.label}: ${item.note}`)
  if (privateHostOnlyCount > 0) {
    summaryParts.push(
      `${privateHostOnlyCount} host-only accommodation ${
        privateHostOnlyCount === 1 ? 'note needs' : 'notes need'
      } host coordination.`
    )
  }

  return {
    totalNotes: normalized.notes.length,
    actionableCount: items.length,
    privateHostOnlyCount,
    categoryCounts,
    items,
    summary: summaryParts.length ? summaryParts.join('\n') : null,
  }
}
