import {
  normalizePublicShareVisibilitySettings,
  type PublicShareVisibilitySettings,
} from '@/lib/sharing/public-contract'

export type CoordinationRole = 'chef' | 'client' | 'collaborator' | 'guest' | 'viewer'

export type CoordinationSignalKind = 'timing' | 'headcount' | 'location' | 'dietary' | 'action'
export type CoordinationRetentionPolicy = 'persist' | 'auto-expire' | 'never-store'
export type CoordinationUrgency = 'critical' | 'high' | 'normal'

export type CoordinationThreadMessage = {
  id: string
  body: string | null
  subject?: string | null
  direction?: string | null
  channel?: string | null
  sent_at?: string | null
  created_at?: string | null
}

export type CoordinationSignal = {
  id: string
  kind: CoordinationSignalKind
  label: string
  value: string
  snippet: string
  sourceMessageId: string
  sourceSentAt: string | null
  allowedRoles: CoordinationRole[]
  retentionPolicy: CoordinationRetentionPolicy
  urgency: CoordinationUrgency
}

export type CoordinationRoleView = {
  role: CoordinationRole
  label: string
  visibleSignals: CoordinationSignal[]
  hiddenSignalCount: number
}

export type ThreadCoordinationBrief = {
  sourceMessageCount: number
  signals: CoordinationSignal[]
  roleViews: CoordinationRoleView[]
  retentionSummary: Record<CoordinationRetentionPolicy, number>
  retention: {
    source: 'communication_thread'
    derivedPersistence: 'runtime_only'
    shareExpiresAt: string | null
    expiresByDesign: boolean
  }
}

export type BuildThreadCoordinationBriefInput = {
  messages: CoordinationThreadMessage[]
  visibility?: Record<string, boolean> | PublicShareVisibilitySettings | null
  shareExpiresAt?: string | null
}

export type BuildRoleInstructionTextInput = {
  view: CoordinationRoleView
  shareExpiresAt?: string | null
  includeSourceSnippets?: boolean
  maxSignals?: number
}

const ROLE_LABELS: Record<CoordinationRole, string> = {
  chef: 'Chef',
  client: 'Client',
  collaborator: 'Collaborator',
  guest: 'Guest',
  viewer: 'Viewer',
}

const SIGNAL_LIMIT = 12

const MATCHERS: Array<{
  kind: CoordinationSignalKind
  label: string
  pattern: RegExp
}> = [
  {
    kind: 'timing',
    label: 'Timing',
    pattern:
      /\b(today|tomorrow|tonight|morning|afternoon|evening|noon|midnight|\d{1,2}(?::\d{2})?\s?(?:am|pm)|(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2})\b/i,
  },
  {
    kind: 'headcount',
    label: 'Headcount',
    pattern: /\b\d{1,3}\s?(?:guests?|people|adults?|kids?|children|plus[- ]?ones?)\b/i,
  },
  {
    kind: 'location',
    label: 'Location',
    pattern: /\b(?:address|location|venue|parking|entrance|gate|floor|suite|apt|apartment)\b/i,
  },
  {
    kind: 'dietary',
    label: 'Dietary',
    pattern:
      /\b(?:allerg(?:y|ies|ic)|dietary|vegan|vegetarian|gluten|dairy|nut|peanut|shellfish|kosher|halal)\b/i,
  },
  {
    kind: 'action',
    label: 'Action',
    pattern:
      /\b(?:please|can you|could you|need to|needs to|confirm|send|bring|call|text|remind|follow up|follow-up|arrive|deliver|pick up)\b/i,
  },
]

export function buildThreadCoordinationBrief(
  input: BuildThreadCoordinationBriefInput
): ThreadCoordinationBrief {
  const visibility = normalizePublicShareVisibilitySettings(input.visibility)
  const sourceMessages = input.messages.filter((message) => message.body?.trim())
  const signals = sourceMessages
    .flatMap((message) => extractSignalsFromMessage(message, visibility))
    .sort(compareSignals)
    .slice(0, SIGNAL_LIMIT)

  const roles: CoordinationRole[] = ['chef', 'client', 'collaborator', 'guest', 'viewer']
  const roleViews = roles.map((role) => {
    const visibleSignals = signals.filter((signal) => signal.allowedRoles.includes(role))
    return {
      role,
      label: ROLE_LABELS[role],
      visibleSignals,
      hiddenSignalCount: signals.length - visibleSignals.length,
    }
  })

  return {
    sourceMessageCount: sourceMessages.length,
    signals,
    roleViews,
    retentionSummary: summarizeRetention(signals),
    retention: {
      source: 'communication_thread',
      derivedPersistence: 'runtime_only',
      shareExpiresAt: input.shareExpiresAt ?? null,
      expiresByDesign: Boolean(input.shareExpiresAt),
    },
  }
}

export function buildRoleInstructionText(input: BuildRoleInstructionTextInput): string {
  const maxSignals = input.maxSignals ?? 5
  const visibleSignals = input.view.visibleSignals.slice(0, maxSignals)
  const lines = [`${input.view.label} coordination brief`]

  if (visibleSignals.length === 0) {
    lines.push('No visible coordination instructions are currently derived from the thread.')
  } else {
    for (const signal of visibleSignals) {
      lines.push(
        `${signal.label} (${signal.urgency}, ${signal.retentionPolicy}): ${signal.value}`
      )
      if (input.includeSourceSnippets && signal.snippet) {
        lines.push(`Context: ${signal.snippet}`)
      }
    }
  }

  if (input.shareExpiresAt) {
    lines.push(`Access expires: ${input.shareExpiresAt}`)
  }
  lines.push('Source: current ChefFlow communication thread.')

  return lines.join('\n')
}

function extractSignalsFromMessage(
  message: CoordinationThreadMessage,
  visibility: PublicShareVisibilitySettings
): CoordinationSignal[] {
  const body = message.body?.trim()
  if (!body) return []

  const seenKinds = new Set<CoordinationSignalKind>()
  const signals: CoordinationSignal[] = []

  for (const matcher of MATCHERS) {
    if (seenKinds.has(matcher.kind)) continue
    const match = matcher.pattern.exec(body)
    if (!match) continue
    seenKinds.add(matcher.kind)

    signals.push({
      id: `${message.id}:${matcher.kind}`,
      kind: matcher.kind,
      label: matcher.label,
      value: normalizeSignalValue(match[0]),
      snippet: extractSnippet(body, match.index, match[0].length),
      sourceMessageId: message.id,
      sourceSentAt: message.sent_at ?? message.created_at ?? null,
      allowedRoles: getAllowedRolesForSignal(matcher.kind, visibility, body),
      retentionPolicy: getRetentionPolicyForSignal(matcher.kind, body),
      urgency: getUrgencyForSignal(matcher.kind, body),
    })
  }

  return signals
}

function getAllowedRolesForSignal(
  kind: CoordinationSignalKind,
  visibility: PublicShareVisibilitySettings,
  body: string
): CoordinationRole[] {
  const internal: CoordinationRole[] = ['chef', 'client', 'collaborator']
  if (getRetentionPolicyForSignal(kind, body) === 'never-store') {
    return ['chef', 'client']
  }

  if (kind === 'timing') {
    return visibility.show_date_time ? [...internal, 'guest', 'viewer'] : internal
  }
  if (kind === 'headcount') {
    return visibility.show_guest_count ? [...internal, 'guest'] : internal
  }
  if (kind === 'location') {
    return visibility.show_location ? [...internal, 'guest', 'viewer'] : internal
  }
  if (kind === 'dietary') {
    return visibility.show_dietary_info ? [...internal, 'guest'] : internal
  }

  return internal
}

function getRetentionPolicyForSignal(
  kind: CoordinationSignalKind,
  body: string
): CoordinationRetentionPolicy {
  if (/\b(private|confidential|do not share|don't share|off[- ]?record|secret|surprise)\b/i.test(body)) {
    return 'never-store'
  }
  if (kind === 'dietary') return 'persist'
  return 'auto-expire'
}

function getUrgencyForSignal(kind: CoordinationSignalKind, body: string): CoordinationUrgency {
  if (kind === 'dietary') return 'critical'
  if (kind === 'action') return 'high'
  if (kind === 'timing' && /\b(today|tonight|tomorrow|\d{1,2}(?::\d{2})?\s?(?:am|pm))\b/i.test(body)) {
    return 'high'
  }
  return 'normal'
}

function extractSnippet(body: string, index: number, length: number): string {
  const start = Math.max(0, index - 56)
  const end = Math.min(body.length, index + length + 96)
  const prefix = start > 0 ? '...' : ''
  const suffix = end < body.length ? '...' : ''
  return `${prefix}${body.slice(start, end).trim()}${suffix}`.replace(/\s+/g, ' ')
}

function normalizeSignalValue(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function compareSignals(a: CoordinationSignal, b: CoordinationSignal): number {
  const urgencyDelta = urgencyRank(b.urgency) - urgencyRank(a.urgency)
  if (urgencyDelta !== 0) return urgencyDelta
  const aTime = a.sourceSentAt ? Date.parse(a.sourceSentAt) : 0
  const bTime = b.sourceSentAt ? Date.parse(b.sourceSentAt) : 0
  return bTime - aTime
}

function summarizeRetention(
  signals: CoordinationSignal[]
): Record<CoordinationRetentionPolicy, number> {
  return signals.reduce(
    (summary, signal) => ({
      ...summary,
      [signal.retentionPolicy]: summary[signal.retentionPolicy] + 1,
    }),
    { persist: 0, 'auto-expire': 0, 'never-store': 0 } as Record<
      CoordinationRetentionPolicy,
      number
    >
  )
}

function urgencyRank(urgency: CoordinationUrgency): number {
  if (urgency === 'critical') return 3
  if (urgency === 'high') return 2
  return 1
}
