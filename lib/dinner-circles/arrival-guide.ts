import type {
  DinnerCircleArrivalGuide,
  DinnerCircleArrivalGuideReadiness,
  DinnerCircleArrivalGuideSection,
  DinnerCircleArrivalGuideSectionKey,
  DinnerCircleArrivalGuideVisibility,
} from './types'

export type DinnerCircleArrivalGuideViewer =
  | { role: 'chef' }
  | { role: 'host'; profileId: string }
  | { role: 'attendee'; profileId: string }

export const DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS: Array<{
  key: DinnerCircleArrivalGuideSectionKey
  label: string
  prompt: string
  defaultVisibility: DinnerCircleArrivalGuideVisibility
  chefRelevant: boolean
  sensitive: boolean
}> = [
  {
    key: 'address',
    label: 'Address',
    prompt: 'Street address, unit, neighborhood, and any host-safe location context.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: true,
  },
  {
    key: 'parking',
    label: 'Parking',
    prompt: 'Street, garage, permit, driveway, validation, or tow-zone notes.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: false,
  },
  {
    key: 'building_gate_access',
    label: 'Building and gate access',
    prompt: 'Gate, keypad, doorman, callbox, concierge, or access-code instructions.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: true,
  },
  {
    key: 'entry_instructions',
    label: 'Entry instructions',
    prompt: 'Which door to use, where to wait, who opens, and what to say on arrival.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: false,
  },
  {
    key: 'elevator_loading_notes',
    label: 'Elevator and loading notes',
    prompt: 'Service elevator, load-in path, loading dock, carts, stairs, or timing restrictions.',
    defaultVisibility: 'host_and_chef',
    chefRelevant: true,
    sensitive: false,
  },
  {
    key: 'arrival_contact',
    label: 'Arrival contact',
    prompt: 'Name, phone, backup contact, or preferred arrival channel.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: true,
  },
  {
    key: 'arrival_window',
    label: 'Arrival window',
    prompt: 'Earliest arrival, ideal arrival, doors-open time, and chef load-in window.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: false,
  },
  {
    key: 'late_arrival_handling',
    label: 'Late-arrival handling',
    prompt: 'Cutoff, text-before-entering rule, course pacing, and what late guests should do.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: false,
    sensitive: false,
  },
  {
    key: 'accessibility_entrance',
    label: 'Accessibility entrance',
    prompt: 'Step-free route, ramp, elevator, restroom path, and who can help.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: true,
    sensitive: false,
  },
  {
    key: 'rideshare_dropoff',
    label: 'Rideshare and dropoff',
    prompt: 'Pinned pickup/dropoff point, lobby side, loading zone, or traffic notes.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: false,
    sensitive: false,
  },
  {
    key: 'coat_bag_placement',
    label: 'Coat and bag placement',
    prompt: 'Where guests should put coats, bags, gifts, wine, or shoes.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: false,
    sensitive: false,
  },
  {
    key: 'house_rules',
    label: 'House rules',
    prompt: 'Pets, shoes, smoking, photos, quiet hours, rooms off-limits, or safety expectations.',
    defaultVisibility: 'attendee_visible',
    chefRelevant: false,
    sensitive: false,
  },
]

const SECTION_KEYS = new Set(DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.map((section) => section.key))

const VISIBILITIES = new Set<DinnerCircleArrivalGuideVisibility>([
  'attendee_visible',
  'host_and_chef',
  'chef_only',
  'host_only',
])

function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isIsoString(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime())
}

function isExpired(value: string | null | undefined, now = new Date()): boolean {
  return Boolean(value && new Date(value).getTime() <= now.getTime())
}

function sectionDefinition(key: DinnerCircleArrivalGuideSectionKey) {
  return DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.find((section) => section.key === key)
}

function normalizeVisibility(
  value: unknown,
  fallback: DinnerCircleArrivalGuideVisibility
): DinnerCircleArrivalGuideVisibility {
  return VISIBILITIES.has(value as DinnerCircleArrivalGuideVisibility)
    ? (value as DinnerCircleArrivalGuideVisibility)
    : fallback
}

function normalizeSection(
  key: DinnerCircleArrivalGuideSectionKey,
  value: unknown
): DinnerCircleArrivalGuideSection | null {
  const definition = sectionDefinition(key)
  if (!definition) return null

  const input =
    value && typeof value === 'object' ? (value as Partial<DinnerCircleArrivalGuideSection>) : {}
  const body = optionalString(input.body)
  if (!body) return null
  const now = new Date().toISOString()

  return {
    key,
    label: optionalString(input.label) ?? definition.label,
    body: body.slice(0, 2400),
    visibility: normalizeVisibility(input.visibility, definition.defaultVisibility),
    chefRelevant: input.chefRelevant ?? definition.chefRelevant,
    sensitive: input.sensitive ?? definition.sensitive,
    expiresAt: isIsoString(input.expiresAt) ? input.expiresAt : null,
    updatedAt: isIsoString(input.updatedAt) ? input.updatedAt : now,
    updatedByName: optionalString(input.updatedByName),
  }
}

export function getDinnerCircleArrivalGuideSectionLabel(key: DinnerCircleArrivalGuideSectionKey) {
  return sectionDefinition(key)?.label ?? 'Arrival guide'
}

export function normalizeDinnerCircleArrivalGuide(value: unknown): DinnerCircleArrivalGuide {
  const input =
    value && typeof value === 'object' ? (value as Partial<DinnerCircleArrivalGuide>) : {}
  const sourceSections =
    input.sections && typeof input.sections === 'object'
      ? (input.sections as Record<string, unknown>)
      : {}
  const sections: DinnerCircleArrivalGuide['sections'] = {}

  for (const key of SECTION_KEYS) {
    const section = normalizeSection(key, sourceSections[key])
    if (section) sections[key] = section
  }

  return {
    status: input.status === 'published' ? 'published' : 'draft',
    publishedAt: isIsoString(input.publishedAt) ? input.publishedAt : null,
    updatedAt: isIsoString(input.updatedAt) ? input.updatedAt : null,
    notifyAttendeesAt: isIsoString(input.notifyAttendeesAt) ? input.notifyAttendeesAt : null,
    sections,
  }
}

export function canViewerSeeDinnerCircleArrivalSection(
  section: DinnerCircleArrivalGuideSection,
  viewer: DinnerCircleArrivalGuideViewer,
  options: { printSafe?: boolean; now?: Date } = {}
): boolean {
  if (section.sensitive && isExpired(section.expiresAt, options.now)) return false
  if (options.printSafe) return section.visibility === 'attendee_visible' && !section.sensitive
  if (viewer.role === 'chef') {
    return (
      section.visibility === 'chef_only' ||
      section.visibility === 'host_and_chef' ||
      section.visibility === 'attendee_visible'
    )
  }
  if (viewer.role === 'host') {
    return (
      section.visibility === 'host_only' ||
      section.visibility === 'host_and_chef' ||
      section.visibility === 'attendee_visible'
    )
  }
  return section.visibility === 'attendee_visible'
}

export function filterDinnerCircleArrivalGuideForViewer(
  guide: DinnerCircleArrivalGuide,
  viewer: DinnerCircleArrivalGuideViewer,
  options: { printSafe?: boolean; now?: Date } = {}
): DinnerCircleArrivalGuide {
  const normalized = normalizeDinnerCircleArrivalGuide(guide)
  const sections: DinnerCircleArrivalGuide['sections'] = {}

  for (const section of Object.values(normalized.sections)) {
    if (!section) continue
    if (canViewerSeeDinnerCircleArrivalSection(section, viewer, options)) {
      sections[section.key] = section
    }
  }

  return { ...normalized, sections }
}

export function buildDinnerCircleArrivalGuideReadiness(
  guide: DinnerCircleArrivalGuide | null | undefined
): DinnerCircleArrivalGuideReadiness {
  const normalized = normalizeDinnerCircleArrivalGuide(guide)
  const sections = Object.values(normalized.sections).filter(
    (section): section is DinnerCircleArrivalGuideSection => Boolean(section)
  )
  const attendeeSectionCount = sections.filter(
    (section) => section.visibility === 'attendee_visible' && !isExpired(section.expiresAt)
  ).length
  const chefSections = sections.filter(
    (section) =>
      section.chefRelevant &&
      !isExpired(section.expiresAt) &&
      (section.visibility === 'chef_only' ||
        section.visibility === 'host_and_chef' ||
        section.visibility === 'attendee_visible')
  )
  const missingSectionKeys = DINNER_CIRCLE_ARRIVAL_GUIDE_SECTIONS.filter(
    (definition) => !normalized.sections[definition.key]
  ).map((definition) => definition.key)

  return {
    published: normalized.status === 'published',
    attendeeSectionCount,
    chefRelevantCount: chefSections.length,
    sensitiveHiddenCount: sections.filter((section) => section.sensitive).length,
    missingSectionKeys,
    chefAccessSummary: chefSections.length
      ? chefSections.map((section) => `${section.label}: ${section.body}`).join('\n')
      : null,
  }
}
