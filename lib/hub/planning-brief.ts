import type { CandidateSnapshot, PlanningBrief } from './types'

type UnknownRecord = Record<string, unknown>

function firstString(value: unknown): string | undefined {
  if (Array.isArray(value)) return firstString(value[0])
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function positiveInteger(value: unknown): number | undefined {
  const source = Array.isArray(value) ? value[0] : value
  const parsed =
    typeof source === 'number' ? source : typeof source === 'string' ? Number(source) : NaN
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return Math.floor(parsed)
}

export function normalizePlanningBrief(input: unknown): PlanningBrief {
  const raw = input && typeof input === 'object' ? (input as UnknownRecord) : {}
  const partySize = positiveInteger(raw.partySize ?? raw.party_size ?? raw.guest_count)
  const useCase = firstString(raw.useCase ?? raw.use_case)

  return {
    ...(firstString(raw.occasion) ? { occasion: firstString(raw.occasion) } : {}),
    ...(useCase && ['personal', 'friends', 'family', 'team', 'work', 'corporate'].includes(useCase)
      ? { useCase: useCase as PlanningBrief['useCase'] }
      : {}),
    ...(firstString(raw.dateWindow ?? raw.date_window)
      ? { dateWindow: firstString(raw.dateWindow ?? raw.date_window) }
      : {}),
    ...(partySize ? { partySize } : {}),
    ...(firstString(raw.eventStyle ?? raw.event_style)
      ? { eventStyle: firstString(raw.eventStyle ?? raw.event_style) }
      : {}),
    ...(firstString(raw.budget) ? { budget: firstString(raw.budget) } : {}),
    ...(firstString(raw.dietarySummary ?? raw.dietary ?? raw.dietary_summary)
      ? { dietarySummary: firstString(raw.dietarySummary ?? raw.dietary ?? raw.dietary_summary) }
      : {}),
    ...(firstString(raw.accessibilityNotes ?? raw.accessibility ?? raw.accessibility_notes)
      ? {
          accessibilityNotes: firstString(
            raw.accessibilityNotes ?? raw.accessibility ?? raw.accessibility_notes
          ),
        }
      : {}),
    ...(firstString(raw.locationSummary ?? raw.location ?? raw.location_summary)
      ? {
          locationSummary: firstString(raw.locationSummary ?? raw.location ?? raw.location_summary),
        }
      : {}),
  }
}

export function planningBriefFromSearchParams(
  searchParams: Record<string, string | string[] | undefined>
): PlanningBrief {
  const intent = firstString(searchParams.intent)
  const useCase = intent === 'team_dinner' ? 'team' : intent === 'work_lunch' ? 'work' : undefined

  return normalizePlanningBrief({
    occasion: intent ? intent.replace(/_/g, ' ') : undefined,
    useCase,
    dateWindow: searchParams.dateWindow,
    partySize: searchParams.partySize,
    eventStyle: searchParams.eventStyle,
    budget: searchParams.budget,
    dietary: searchParams.dietary,
    location: searchParams.location,
  })
}

export function normalizeCandidateSnapshot(input: unknown): CandidateSnapshot {
  const raw = input && typeof input === 'object' ? (input as UnknownRecord) : {}
  const title = firstString(raw.title) ?? 'Shortlisted option'
  const dietaryTags = Array.isArray(raw.dietaryTags)
    ? raw.dietaryTags.filter((value): value is string => typeof value === 'string')
    : []
  const serviceModes = Array.isArray(raw.serviceModes)
    ? raw.serviceModes.filter((value): value is string => typeof value === 'string')
    : []

  return {
    title,
    ...(firstString(raw.subtitle) ? { subtitle: firstString(raw.subtitle) } : {}),
    ...(firstString(raw.imageUrl) ? { imageUrl: firstString(raw.imageUrl) } : {}),
    ...(firstString(raw.eyebrow) ? { eyebrow: firstString(raw.eyebrow) } : {}),
    ...(firstString(raw.locationLabel) ? { locationLabel: firstString(raw.locationLabel) } : {}),
    ...(firstString(raw.priceLabel) ? { priceLabel: firstString(raw.priceLabel) } : {}),
    ...(dietaryTags.length > 0 ? { dietaryTags } : {}),
    ...(serviceModes.length > 0 ? { serviceModes } : {}),
    ...(firstString(raw.ctaLabel) ? { ctaLabel: firstString(raw.ctaLabel) } : {}),
    ...(firstString(raw.href ?? raw.ctaHref) ? { href: firstString(raw.href ?? raw.ctaHref) } : {}),
    ...(firstString(raw.sourceUpdatedAt)
      ? { sourceUpdatedAt: firstString(raw.sourceUpdatedAt) }
      : {}),
  }
}

export function hasPlanningBriefContent(brief: PlanningBrief | null | undefined): boolean {
  if (!brief) return false
  return Object.values(brief).some((value) => {
    if (typeof value === 'number') return value > 0
    return typeof value === 'string' && value.trim().length > 0
  })
}
