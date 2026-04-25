export type EventDefaultSeverity = 'info' | 'low' | 'medium' | 'high'

export type EventDefaultNudge = {
  id: string
  label: string
  message: string
  severity: EventDefaultSeverity
  actionLabel?: string
}

export type EventRolePrompt = {
  id: string
  role: 'chef' | 'host' | 'supplier' | 'collaborator' | 'system'
  label: string
  message: string
}

export type EventShareSnippets = {
  shortPreview: string
  text: string
  social: string
}

export type EventExpectationDetail = {
  id: string
  label: string
  message: string
}

export type EventDefaultLayerResult = {
  statusMessage: string
  statusTone: 'neutral' | 'active' | 'urgent' | 'closed'
  rolePrompts: EventRolePrompt[]
  nudges: EventDefaultNudge[]
  expectations: EventExpectationDetail[]
  shareSnippets: EventShareSnippets
  contributorBalance: {
    visibleNames: string[]
    underrepresentedCount: number
    message: string | null
  }
  postEventSnapshot: {
    plannedCapacity: number | null
    actualAttendance: number | null
    projectedRevenueCents: number | null
    actualRevenueCents: number | null
    message: string | null
  }
  autoCleanup: {
    shouldArchive: boolean
    message: string | null
  }
}

export type EventDefaultLayerInput = {
  eventId: string
  eventName: string
  status?: string | null
  eventDate?: string | Date | null
  launchedAt?: string | Date | null
  guestCount?: number | null
  ticketsSold?: number | null
  totalCapacity?: number | null
  projectedRevenueCents?: number | null
  actualRevenueCents?: number | null
  actualAttendance?: number | null
  publicPhotosCount?: number | null
  publicStory?: string | null
  shareUrl?: string | null
  locationText?: string | null
  chefName?: string | null
  collaborators?: Array<{ role?: string | null; businessName?: string | null }>
  supplierIngredientLines?: string[] | null
  sourceLinksCount?: number | null
  layoutZoneKinds?: string[] | null
  accessibilityNotes?: string | null
  seatingStyle?: string | null
  incidentCount?: number | null
  now?: Date
}

function asPositiveNumber(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function daysBetween(left: Date, right: Date): number {
  const dayMs = 24 * 60 * 60 * 1000
  const leftDay = new Date(left)
  const rightDay = new Date(right)
  leftDay.setHours(0, 0, 0, 0)
  rightDay.setHours(0, 0, 0, 0)
  return Math.round((leftDay.getTime() - rightDay.getTime()) / dayMs)
}

function hoursSince(value: Date | null, now: Date): number | null {
  if (!value) return null
  return (now.getTime() - value.getTime()) / (60 * 60 * 1000)
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value?.trim())
}

function compactUrl(url: string | null | undefined): string {
  if (!url) return ''
  try {
    const parsed = new URL(url)
    return `${parsed.host}${parsed.pathname}`
  } catch {
    return url
  }
}

function buildStatusMessage(input: {
  status?: string | null
  ticketsSold: number
  totalCapacity: number
  launchedHours: number | null
}) {
  const remaining =
    input.totalCapacity > 0 ? Math.max(0, input.totalCapacity - input.ticketsSold) : null
  const fillRate = input.totalCapacity > 0 ? input.ticketsSold / input.totalCapacity : 0

  if (input.status === 'completed') return { label: 'Event complete', tone: 'closed' as const }
  if (input.status === 'cancelled') return { label: 'Event unavailable', tone: 'closed' as const }
  if (remaining === 0 && input.totalCapacity > 0) {
    return { label: 'Fully booked', tone: 'closed' as const }
  }
  if (remaining !== null && remaining <= 3 && input.ticketsSold > 0) {
    return { label: 'Last spots', tone: 'urgent' as const }
  }
  if (fillRate >= 0.3) return { label: 'Filling up', tone: 'active' as const }
  if (input.launchedHours !== null && input.launchedHours <= 48) {
    return { label: 'Just launched', tone: 'active' as const }
  }
  return { label: 'Now booking', tone: 'neutral' as const }
}

function seasonalIngredientRisk(lines: string[], eventDate: Date | null): string | null {
  if (!eventDate || lines.length === 0) return null
  const month = eventDate.getMonth() + 1
  const text = lines.join(' ').toLowerCase()
  const warmWeatherItems = ['tomato', 'berry', 'berries', 'stone fruit', 'peach', 'melon']
  const springItems = ['asparagus', 'pea shoots', 'ramps', 'fava']
  const holidayItems = ['turkey', 'prime rib', 'oyster', 'cranberry']

  if ((month <= 2 || month >= 11) && warmWeatherItems.some((item) => text.includes(item))) {
    return 'Seasonal produce may be less stable for this date.'
  }
  if ((month < 3 || month > 6) && springItems.some((item) => text.includes(item))) {
    return 'Spring ingredients may need a backup source.'
  }
  if ([11, 12].includes(month) && holidayItems.some((item) => text.includes(item))) {
    return 'Holiday demand can tighten supplier availability.'
  }
  return null
}

function environmentFrom(input: EventDefaultLayerInput): EventExpectationDetail[] {
  const details: EventExpectationDetail[] = []
  const location = input.locationText?.toLowerCase() ?? ''
  const story = input.publicStory?.toLowerCase() ?? ''
  const zones = new Set(input.layoutZoneKinds ?? [])

  if (
    location.includes('farm') ||
    location.includes('garden') ||
    location.includes('outdoor') ||
    story.includes('farm') ||
    story.includes('outdoor')
  ) {
    details.push({
      id: 'environment',
      label: 'Environment',
      message:
        location.includes('farm') || story.includes('farm') ? 'Farm setting' : 'Outdoor setting',
    })
  }

  if (zones.has('path') || location.includes('field') || location.includes('trail')) {
    details.push({
      id: 'mobility',
      label: 'Mobility',
      message: 'Expect some walking or uneven ground.',
    })
  }

  if (hasText(input.accessibilityNotes)) {
    details.push({
      id: 'accessibility',
      label: 'Accessibility',
      message: input.accessibilityNotes!.trim(),
    })
  }

  if (hasText(input.seatingStyle)) {
    details.push({
      id: 'seating',
      label: 'Seating',
      message: input.seatingStyle!.trim(),
    })
  }

  return details
}

export function buildEventDefaultLayer(input: EventDefaultLayerInput): EventDefaultLayerResult {
  const now = input.now ?? new Date()
  const eventDate = parseDate(input.eventDate)
  const launchedAt = parseDate(input.launchedAt)
  const daysUntil = eventDate ? daysBetween(eventDate, now) : null
  const launchedHours = hoursSince(launchedAt, now)
  const ticketsSold = asPositiveNumber(input.ticketsSold)
  const totalCapacity = asPositiveNumber(input.totalCapacity)
  const guestCount = asPositiveNumber(input.guestCount)
  const publicPhotosCount = asPositiveNumber(input.publicPhotosCount)
  const supplierLines = input.supplierIngredientLines ?? []
  const status = buildStatusMessage({
    status: input.status,
    ticketsSold,
    totalCapacity,
    launchedHours,
  })
  const rolePrompts: EventRolePrompt[] = []
  const nudges: EventDefaultNudge[] = []

  if (supplierLines.length > 0) {
    rolePrompts.push({
      id: 'supplier_availability_window',
      role: 'supplier',
      label: 'Confirm availability window',
      message: 'Supplier ingredients are listed, so availability timing should be confirmed.',
    })
  }

  if (daysUntil !== null && daysUntil <= 7 && input.status !== 'completed') {
    rolePrompts.push({
      id: 'host_service_timing',
      role: 'host',
      label: 'Confirm service timing',
      message:
        'The event is close enough that arrival, seating, and service timing should be locked.',
    })
  }

  if (!hasText(input.seatingStyle) && totalCapacity > 0) {
    rolePrompts.push({
      id: 'confirm_seating_style',
      role: 'host',
      label: 'Fixed or flexible seating?',
      message: 'Confirm seating style before guests arrive.',
    })
  }

  if ((input.layoutZoneKinds ?? []).includes('kitchen')) {
    rolePrompts.push({
      id: 'confirm_cooking_location',
      role: 'chef',
      label: 'Cooking on-site?',
      message: 'Confirm whether final cooking happens on-site or before arrival.',
    })
  }

  if (input.status === 'completed') {
    rolePrompts.push({
      id: 'post_event_incident_note',
      role: 'host',
      label: 'Note fixes for next time',
      message: 'Capture what went wrong or what should change before the event is archived.',
    })
  }

  if (guestCount > 0 && supplierLines.length > 0 && supplierLines.length * 8 < guestCount) {
    nudges.push({
      id: 'supply_quantity_risk',
      label: 'Supply quantity may be thin',
      message: 'Ingredient lines look light relative to the guest count.',
      severity: 'medium',
      actionLabel: 'Confirm backup or portions',
    })
  }

  const seasonalRisk = seasonalIngredientRisk(supplierLines, eventDate)
  if (seasonalRisk) {
    nudges.push({
      id: 'seasonal_supply_risk',
      label: 'Seasonal supply risk',
      message: seasonalRisk,
      severity: 'medium',
      actionLabel: 'Add a backup source',
    })
  }

  const fillRate = totalCapacity > 0 ? ticketsSold / totalCapacity : 0
  if (
    launchedHours !== null &&
    launchedHours >= 24 &&
    ticketsSold === 0 &&
    input.status !== 'completed'
  ) {
    nudges.push({
      id: 'momentum_no_first_sale',
      label: 'No first sale yet',
      message: 'Early activity is soft. Add photos, share again, or review pricing.',
      severity: 'medium',
      actionLabel: 'Refresh promotion',
    })
  } else if (
    launchedHours !== null &&
    launchedHours >= 48 &&
    totalCapacity > 0 &&
    fillRate < 0.12 &&
    input.status !== 'completed'
  ) {
    nudges.push({
      id: 'momentum_underperforming',
      label: 'Tickets are moving slowly',
      message: 'Sales are behind the early pace for the available capacity.',
      severity: 'low',
      actionLabel: 'Share or adjust',
    })
  }

  if (publicPhotosCount === 0) {
    nudges.push({
      id: 'quality_missing_photos',
      label: 'Photos would help',
      message: 'The public page has no event photos yet.',
      severity: 'low',
      actionLabel: 'Add photos',
    })
  }

  if (!input.publicStory || input.publicStory.trim().length < 80) {
    nudges.push({
      id: 'quality_thin_description',
      label: 'Description is thin',
      message: 'The public story may not set enough context for guests.',
      severity: 'low',
      actionLabel: 'Add a little detail',
    })
  }

  if (!hasText(input.accessibilityNotes)) {
    nudges.push({
      id: 'accessibility_basics_missing',
      label: 'Accessibility not confirmed',
      message: 'Confirm basic access details before guests rely on the page.',
      severity: 'low',
      actionLabel: 'Confirm access',
    })
  }

  if (
    daysUntil !== null &&
    daysUntil <= 3 &&
    !['completed', 'cancelled'].includes(input.status ?? '')
  ) {
    nudges.push({
      id: 'time_finalize_details',
      label: 'Finalize event details',
      message: 'The event is close. Review timing, seating, access, and supplier backups.',
      severity: 'high',
      actionLabel: 'Final review',
    })
  }

  const collaboratorNames = (input.collaborators ?? [])
    .map((collaborator) => collaborator.businessName?.trim())
    .filter((name): name is string => Boolean(name))
  const contributorNames = [input.chefName?.trim(), ...collaboratorNames].filter(
    (name): name is string => Boolean(name)
  )
  const visibleNames = contributorNames.slice(0, 4)
  const underrepresentedCount = Math.max(0, contributorNames.length - visibleNames.length)
  const shareUrl = input.shareUrl ?? ''
  const shortPreview = compactUrl(shareUrl)
  const shareLead = `Join ${input.eventName}`
  const shareSuffix = shareUrl ? ` ${shareUrl}` : ''
  const actualRevenueCents =
    typeof input.actualRevenueCents === 'number' ? input.actualRevenueCents : null
  const projectedRevenueCents =
    typeof input.projectedRevenueCents === 'number' ? input.projectedRevenueCents : null
  const actualAttendance =
    typeof input.actualAttendance === 'number' ? input.actualAttendance : null
  const plannedCapacity = totalCapacity || guestCount || null
  const isCompleted = input.status === 'completed'

  return {
    statusMessage: status.label,
    statusTone: status.tone,
    rolePrompts,
    nudges,
    expectations: environmentFrom(input),
    shareSnippets: {
      shortPreview,
      text: `${shareLead}${shareSuffix}`.trim(),
      social:
        `${shareLead}${input.locationText ? ` at ${input.locationText}` : ''}${shareSuffix}`.trim(),
    },
    contributorBalance: {
      visibleNames,
      underrepresentedCount,
      message:
        underrepresentedCount > 0
          ? `${underrepresentedCount} contributor${underrepresentedCount === 1 ? '' : 's'} should be credited in supporting sections.`
          : null,
    },
    postEventSnapshot: {
      plannedCapacity,
      actualAttendance,
      projectedRevenueCents,
      actualRevenueCents,
      message:
        isCompleted &&
        (plannedCapacity || actualAttendance || projectedRevenueCents || actualRevenueCents)
          ? 'Post-event snapshot is ready.'
          : null,
    },
    autoCleanup: {
      shouldArchive: isCompleted && (input.incidentCount ?? 0) === 0,
      message: isCompleted
        ? 'Event can leave active workflow while preserving participants, media, and results.'
        : null,
    },
  }
}
