export const EVENT_READINESS_PROGRAMS = [
  'capacity',
  'compliance',
  'loadout',
  'household',
  'vendor',
  'staff',
  'crisis',
  'finance',
  'waste',
  'communication',
] as const

export type EventReadinessProgram = (typeof EVENT_READINESS_PROGRAMS)[number]
export type EventReadinessState = 'blocked' | 'unknown' | 'warning' | 'clear'
export type EventReadinessProofConfidence = 'verified' | 'inferred' | 'missing'

export type EventReadinessLink = {
  label: string
  href: string
}

export type EventReadinessSourceProof = {
  label: string
  href: string
  updatedAt: string | null
  confidence: EventReadinessProofConfidence
}

export type EventReadinessSignalInput = {
  id: string
  program: EventReadinessProgram
  state: EventReadinessState
  title: string
  detail: string
  owner: string
  dueAt: string | null
  action: EventReadinessLink
  sourceProof: EventReadinessSourceProof
}

export type EventReadinessCard = EventReadinessSignalInput & {
  priority: number
  stateLabel: string
  programLabel: string
  additionalSignalCount: number
  integration: {
    event: EventReadinessLink
    dashboard: EventReadinessLink
    rail: EventReadinessLink
  }
}

export type EventReadinessBus = {
  eventId: string
  generatedAt: string
  overallState: EventReadinessState
  summary: string
  counts: Record<EventReadinessState, number>
  cards: EventReadinessCard[]
  topCards: EventReadinessCard[]
  integration: {
    event: EventReadinessLink
    dashboard: EventReadinessLink
    rail: EventReadinessLink
  }
}

export type BuildEventReadinessBusOptions = {
  eventId: string
  eventHref: string
  dashboardHref?: string
  railHref?: string
  expectedPrograms?: readonly EventReadinessProgram[]
  now?: Date
  maxTopCards?: number
}

const PROGRAM_LABELS: Record<EventReadinessProgram, string> = {
  capacity: 'Capacity',
  compliance: 'Compliance',
  loadout: 'Loadout',
  household: 'Household',
  vendor: 'Vendor',
  staff: 'Staff',
  crisis: 'Crisis',
  finance: 'Finance',
  waste: 'Waste',
  communication: 'Communication',
}

const STATE_LABELS: Record<EventReadinessState, string> = {
  blocked: 'Blocked',
  unknown: 'Unknown',
  warning: 'Warning',
  clear: 'Clear',
}

const STATE_RANK: Record<EventReadinessState, number> = {
  blocked: 0,
  unknown: 1,
  warning: 2,
  clear: 3,
}

export function buildEventReadinessBus(
  signals: EventReadinessSignalInput[],
  options: BuildEventReadinessBusOptions
): EventReadinessBus {
  const now = options.now ?? new Date()
  const expectedPrograms = options.expectedPrograms ?? EVENT_READINESS_PROGRAMS
  const integration = {
    event: { label: 'Event', href: options.eventHref },
    dashboard: { label: 'Dashboard', href: options.dashboardHref ?? '/dashboard' },
    rail: { label: 'Chef Life rail', href: options.railHref ?? '/dashboard#chef-life-synthesis' },
  }

  const cards = expectedPrograms.map((program) => {
    const programSignals = signals.filter((signal) => signal.program === program)
    const selected =
      sortSignals(programSignals, now)[0] ?? unknownSignal(program, options.eventHref)

    return {
      ...selected,
      priority: scoreSignal(selected, now),
      stateLabel: STATE_LABELS[selected.state],
      programLabel: PROGRAM_LABELS[selected.program],
      additionalSignalCount: Math.max(0, programSignals.length - 1),
      integration,
    } satisfies EventReadinessCard
  })

  const sortedCards = sortCards(cards, now)
  const counts = countStates(cards)
  const overallState = deriveOverallState(counts)

  return {
    eventId: options.eventId,
    generatedAt: now.toISOString(),
    overallState,
    summary: summarize(counts),
    counts,
    cards,
    topCards: sortedCards.slice(0, options.maxTopCards ?? 6),
    integration,
  }
}

function sortSignals(signals: EventReadinessSignalInput[], now: Date): EventReadinessSignalInput[] {
  return [...signals].sort((left, right) => {
    const state = STATE_RANK[left.state] - STATE_RANK[right.state]
    if (state !== 0) return state
    return dueRank(left.dueAt, now) - dueRank(right.dueAt, now)
  })
}

function sortCards(cards: EventReadinessCard[], now: Date): EventReadinessCard[] {
  return [...cards].sort((left, right) => {
    const state = STATE_RANK[left.state] - STATE_RANK[right.state]
    if (state !== 0) return state
    const due = dueRank(left.dueAt, now) - dueRank(right.dueAt, now)
    if (due !== 0) return due
    return (
      EVENT_READINESS_PROGRAMS.indexOf(left.program) -
      EVENT_READINESS_PROGRAMS.indexOf(right.program)
    )
  })
}

function scoreSignal(signal: EventReadinessSignalInput, now: Date): number {
  return STATE_RANK[signal.state] * 100 + dueRank(signal.dueAt, now)
}

function dueRank(value: string | null, now: Date): number {
  const days = daysUntil(value, now)
  if (days === null) return 90
  if (days <= 0) return 0
  if (days <= 1) return 10
  if (days <= 3) return 20
  if (days <= 7) return 30
  return 60
}

function daysUntil(value: string | null, now: Date): number | null {
  if (!value) return null
  const due = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(due.getTime())) return null
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  return Math.floor((due.getTime() - today.getTime()) / 86_400_000)
}

function unknownSignal(
  program: EventReadinessProgram,
  eventHref: string
): EventReadinessSignalInput {
  return {
    id: `${program}:unknown-source`,
    program,
    state: 'unknown',
    title: `${PROGRAM_LABELS[program]} source is not connected`,
    detail: 'No program feed has supplied a readiness signal for this event yet.',
    owner: 'ChefFlow readiness bus',
    dueAt: null,
    action: { label: 'Open event', href: eventHref },
    sourceProof: {
      label: `No source proof for ${PROGRAM_LABELS[program]}`,
      href: eventHref,
      updatedAt: null,
      confidence: 'missing',
    },
  }
}

function countStates(cards: EventReadinessCard[]): Record<EventReadinessState, number> {
  return cards.reduce(
    (counts, card) => {
      counts[card.state] += 1
      return counts
    },
    { blocked: 0, unknown: 0, warning: 0, clear: 0 } satisfies Record<EventReadinessState, number>
  )
}

function deriveOverallState(counts: Record<EventReadinessState, number>): EventReadinessState {
  if (counts.blocked > 0) return 'blocked'
  if (counts.unknown > 0) return 'unknown'
  if (counts.warning > 0) return 'warning'
  return 'clear'
}

function summarize(counts: Record<EventReadinessState, number>): string {
  if (counts.blocked > 0) {
    return `${counts.blocked} blocker${counts.blocked === 1 ? '' : 's'} need a decision before this event is treated as ready.`
  }
  if (counts.unknown > 0) {
    return `${counts.unknown} readiness source${counts.unknown === 1 ? '' : 's'} still need proof.`
  }
  if (counts.warning > 0) {
    return `${counts.warning} warning${counts.warning === 1 ? '' : 's'} should be reviewed.`
  }
  return 'All connected readiness programs are clear.'
}
