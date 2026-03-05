import {
  addDays,
  addMonths,
  endOfWeek,
  format,
  isAfter,
  isBefore,
  parseISO,
  startOfWeek,
} from 'date-fns'

export interface RecurringServiceScheduleLike {
  frequency: 'weekly' | 'biweekly' | 'monthly'
  day_of_week?: unknown
  start_date: string
  end_date?: string | null
}

export interface ServedDishLike {
  dish_name: string
  client_reaction?: 'loved' | 'liked' | 'neutral' | 'disliked' | null
  served_date: string
}

export interface MenuSuggestionBundle {
  recommended: string[]
  avoid: string[]
  recentlyServed: string[]
  likedBacklog: string[]
}

function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function normalizeDayOfWeek(value: unknown): number[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => (typeof item === 'number' ? item : Number(item)))
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= 6)
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatServiceDays(dayOfWeek: unknown, fallbackStartDate?: string): string {
  const normalized = normalizeDayOfWeek(dayOfWeek)
  if (normalized.length > 0) {
    return normalized
      .sort((a, b) => a - b)
      .map((day) => WEEKDAY_LABELS[day] ?? String(day))
      .join(', ')
  }
  if (!fallbackStartDate) return 'Flexible'
  const day = parseISO(fallbackStartDate).getDay()
  return WEEKDAY_LABELS[day] ?? 'Flexible'
}

export function getUpcomingServiceDates(
  schedule: RecurringServiceScheduleLike,
  options?: {
    horizonWeeks?: number
    fromDate?: Date
    maxResults?: number
  }
): string[] {
  const horizonWeeks = Math.max(1, options?.horizonWeeks ?? 6)
  const fromDate = options?.fromDate ?? new Date()
  const maxResults = Math.max(1, options?.maxResults ?? 24)

  const startDate = parseISO(schedule.start_date)
  const effectiveStart = isAfter(startDate, fromDate) ? startDate : fromDate
  const horizonEnd = addDays(fromDate, horizonWeeks * 7)
  const endDate = schedule.end_date ? parseISO(schedule.end_date) : null
  const serviceDays = normalizeDayOfWeek(schedule.day_of_week)
  const fallbackServiceDay = startDate.getDay()

  const dates: string[] = []

  if (schedule.frequency === 'monthly') {
    const dayOfMonth = startDate.getDate()
    let cursor = new Date(effectiveStart)

    for (let i = 0; i < 18 && dates.length < maxResults; i += 1) {
      const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), dayOfMonth)
      if (isBefore(candidate, effectiveStart)) {
        cursor = addMonths(cursor, 1)
        continue
      }
      if (isAfter(candidate, horizonEnd)) break
      if (endDate && isAfter(candidate, endDate)) break
      if (!isBefore(candidate, startDate)) {
        dates.push(toIsoDate(candidate))
      }
      cursor = addMonths(cursor, 1)
    }

    return dates
  }

  for (
    let cursor = new Date(effectiveStart);
    !isAfter(cursor, horizonEnd) && dates.length < maxResults;
    cursor = addDays(cursor, 1)
  ) {
    if (endDate && isAfter(cursor, endDate)) break
    if (isBefore(cursor, startDate)) continue

    const day = cursor.getDay()
    const isAllowedDay =
      serviceDays.length > 0 ? serviceDays.includes(day) : day === fallbackServiceDay
    if (!isAllowedDay) continue

    if (schedule.frequency === 'biweekly') {
      const diffDays = Math.floor(
        (new Date(toIsoDate(cursor)).getTime() - new Date(toIsoDate(startDate)).getTime()) /
          86400000
      )
      const biweeklyBucket = Math.floor(Math.max(0, diffDays) / 7)
      if (biweeklyBucket % 2 !== 0) continue
    }

    dates.push(toIsoDate(cursor))
  }

  return dates
}

function normalizeDishName(name: string): string {
  return name.trim().toLowerCase()
}

export function buildMenuSuggestionBundle(
  history: ServedDishLike[],
  favoriteDishes: string[] = [],
  options?: { recommendationCount?: number; recentWindowEntries?: number }
): MenuSuggestionBundle {
  const recommendationCount = Math.max(1, options?.recommendationCount ?? 4)
  const recentWindowEntries = Math.max(1, options?.recentWindowEntries ?? 20)

  const normalizedFavorites = favoriteDishes
    .map((name) => name.trim())
    .filter((name) => name.length > 0)

  const recent = history.slice(0, recentWindowEntries)
  const recentSet = new Set(recent.map((row) => normalizeDishName(row.dish_name)))

  const avoid = Array.from(
    new Set(
      history
        .filter((row) => row.client_reaction === 'disliked')
        .map((row) => row.dish_name.trim())
        .filter(Boolean)
    )
  )
  const avoidSet = new Set(avoid.map((name) => normalizeDishName(name)))

  const lovedBacklog = history
    .filter((row) => row.client_reaction === 'loved')
    .map((row) => row.dish_name.trim())
    .filter((name) => name.length > 0 && !recentSet.has(normalizeDishName(name)))

  const likedBacklog = history
    .filter((row) => row.client_reaction === 'liked')
    .map((row) => row.dish_name.trim())
    .filter((name) => name.length > 0 && !recentSet.has(normalizeDishName(name)))

  const mergedCandidates = [
    ...lovedBacklog,
    ...likedBacklog,
    ...normalizedFavorites,
    ...history.map((row) => row.dish_name.trim()),
  ]

  const seen = new Set<string>()
  const recommended: string[] = []

  for (const candidate of mergedCandidates) {
    const normalized = normalizeDishName(candidate)
    if (!normalized || seen.has(normalized) || avoidSet.has(normalized)) continue
    if (recentSet.has(normalized)) continue
    seen.add(normalized)
    recommended.push(candidate)
    if (recommended.length >= recommendationCount) break
  }

  return {
    recommended,
    avoid: avoid.slice(0, 10),
    recentlyServed: Array.from(new Set(recent.map((row) => row.dish_name.trim()))).slice(0, 10),
    likedBacklog: Array.from(new Set([...lovedBacklog, ...likedBacklog])).slice(0, 8),
  }
}

export interface RecommendationDraftInput {
  clientName: string
  serviceLabel: string
  serviceDates: string[]
  recommendedDishes: string[]
  avoidDishes: string[]
  notes?: string | null
}

export function buildRecommendationDraftText(input: RecommendationDraftInput): string {
  const dateRangeStart = input.serviceDates[0] ? parseISO(input.serviceDates[0]) : null
  const dateRangeEnd = input.serviceDates[input.serviceDates.length - 1]
    ? parseISO(input.serviceDates[input.serviceDates.length - 1])
    : null

  const weekLabel =
    dateRangeStart && dateRangeEnd
      ? `${format(startOfWeek(dateRangeStart, { weekStartsOn: 1 }), 'MMM d')} - ${format(endOfWeek(dateRangeEnd, { weekStartsOn: 1 }), 'MMM d, yyyy')}`
      : 'next week'

  const serviceLines =
    input.serviceDates.length > 0
      ? input.serviceDates.map((date) => `- ${format(parseISO(date), 'EEEE, MMM d')}`).join('\n')
      : '- Flexible schedule'

  const menuLines =
    input.recommendedDishes.length > 0
      ? input.recommendedDishes.map((dish) => `- ${dish}`).join('\n')
      : '- Seasonal menu rotation based on your preferences'

  const avoidLine =
    input.avoidDishes.length > 0
      ? `\nDishes I am avoiding based on prior feedback: ${input.avoidDishes.join(', ')}.`
      : ''

  const notesLine = input.notes?.trim() ? `\nChef notes: ${input.notes.trim()}` : ''

  return [
    `Hi ${input.clientName},`,
    '',
    `Here is my ${input.serviceLabel.toLowerCase()} recommendation for ${weekLabel}.`,
    '',
    'Planned service dates:',
    serviceLines,
    '',
    'Proposed menu direction:',
    menuLines,
    avoidLine,
    notesLine,
    '',
    'If you want any swaps, let me know and I will update the lineup before service day.',
  ]
    .filter(Boolean)
    .join('\n')
}
