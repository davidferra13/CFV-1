import type {
  DinnerCircleActionCapability,
  DinnerCircleActionPermissions,
  DinnerCircleActionRole,
} from './action-surface'

export type DinnerCircleWorkspaceModuleId =
  | 'arrival_guide'
  | 'attendee_profiles'
  | 'seating_plan'
  | 'concierge_qa'
  | 'celebration_board'
  | 'menu_reveal'
  | 'itinerary'
  | 'weather_backup'
  | 'live_status'
  | 'digest_controls'
  | 'event_packet'
  | 'collaborator_access'
  | 'memory_album'
  | 'growth_engine'
  | 'visual_intake'

export type DinnerCircleWorkspaceModule = {
  id: DinnerCircleWorkspaceModuleId
  queueId: string
  title: string
  summary: string
  source: string
  primaryAction: string
  allowedRoles: DinnerCircleActionRole[]
  capability?: DinnerCircleActionCapability
  privacyGuardrail: string
  proofFocus: string[]
  permitted: boolean
  disabledReason?: string
}

export type ResolveDinnerCircleWorkspaceModulesInput = {
  role: DinnerCircleActionRole
  permissions?: DinnerCircleActionPermissions
  includeUnavailable?: boolean
}

export type DinnerCircleEventPacketManifest = {
  generatedAt: string
  role: DinnerCircleActionRole
  sections: Array<{
    id: DinnerCircleWorkspaceModuleId
    title: string
    source: string
  }>
  redactions: string[]
}

const EVERYONE: DinnerCircleActionRole[] = [
  'chef',
  'owner',
  'host',
  'co_host',
  'assistant',
  'planner',
  'member',
  'guest',
]

const HOST_OPERATORS: DinnerCircleActionRole[] = [
  'chef',
  'owner',
  'host',
  'co_host',
  'assistant',
  'planner',
]

const HOSTS: DinnerCircleActionRole[] = ['chef', 'owner', 'host', 'co_host']

const MODULES: Array<Omit<DinnerCircleWorkspaceModule, 'permitted' | 'disabledReason'>> = [
  {
    id: 'arrival_guide',
    queueId: 'BQ-20260519T171015Z-add-arrival-parking-and-access-guide-for-attendees',
    title: 'Arrival and access guide',
    summary: 'Address, parking, gate access, arrival window, late handling, and house rules.',
    source: 'Dinner Circles / Logistics / Guest Experience',
    primaryAction: 'Open arrival guide',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Sensitive address, contact, and access-code fields are role-gated, expiry-aware, and omitted from print-safe share views.',
    proofFocus: ['host publishing', 'chef access view', 'print-safe sensitive redaction'],
  },
  {
    id: 'attendee_profiles',
    queueId: 'BQ-20260519T171015Z-add-attendee-profile-cards-and-relationship-context-for-dinn',
    title: 'Attendee profiles',
    summary: 'Preferred names, RSVP state, plus-ones, public notes, and service-safe context.',
    source: 'Dinner Circles / Guest Profiles / Client Intelligence / Privacy',
    primaryAction: 'Review cards',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Sensitive relationship notes stay hidden by default; chef sees only service-relevant summaries.',
    proofFocus: ['role projection', 'duplicate profile flagging', 'mobile card layout'],
  },
  {
    id: 'seating_plan',
    queueId: 'BQ-20260519T171015Z-add-dinner-circle-seating-chart-and-table-plan',
    title: 'Seating and table plan',
    summary: 'Seat assignments, accessibility placement, VIPs, and client-safe print view.',
    source: 'Dinner Circles / Event Experience / Guest Coordination',
    primaryAction: 'Open table plan',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Private conflict and keep-apart notes never appear in regular guest views or packets.',
    proofFocus: ['guest-safe projection', 'chef service notes', 'print packet redaction'],
  },
  {
    id: 'concierge_qa',
    queueId: 'BQ-20260519T171015Z-add-dinner-circle-q-a-and-concierge-knowledge-base',
    title: 'Q&A and concierge knowledge',
    summary: 'Source-backed answers from the menu, arrival guide, itinerary, and pinned notes.',
    source: 'Dinner Circles / Client Portal / Remy / Communications',
    primaryAction: 'Ask a question',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Uncertain or sensitive questions route to host or chef review instead of guessed answers.',
    proofFocus: ['source labels', 'duplicate suggestions', 'sensitive-question review routing'],
  },
  {
    id: 'celebration_board',
    queueId: 'BQ-20260519T171015Z-add-gift-surprise-and-celebration-coordination-board',
    title: 'Celebration board',
    summary: 'Surprises, toasts, gifts, cakes, flowers, and reveal timing.',
    source: 'Dinner Circles / Event Experience / Privacy / Client Portal',
    primaryAction: 'Coordinate moment',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Chef projection is limited to execution-relevant timing and dessert/decor notes.',
    proofFocus: ['excluded target preview', 'host approval', 'notification redaction'],
  },
  {
    id: 'menu_reveal',
    queueId: 'BQ-20260519T171015Z-add-menu-reveal-and-dish-story-experience-for-dinner-circle-',
    title: 'Menu reveal',
    summary: 'Full or staged dish reveal with dietary markers, pairings, and chef-safe stories.',
    source: 'Dinner Circles / Menu Intelligence / Client Portal / Experience',
    primaryAction: 'Preview menu',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Internal recipes, cost, margin, and procurement details are never part of member copy.',
    proofFocus: ['full/staged/hidden modes', 'dietary marker safety', 'print preview sync'],
  },
  {
    id: 'itinerary',
    queueId: 'BQ-20260519T171015Z-add-participant-facing-dinner-itinerary-and-run-of-show',
    title: 'Participant itinerary',
    summary: 'Arrival, cocktails, courses, toasts, dessert, wrap, and client-safe timing changes.',
    source: 'Dinner Circles / Event Timeline / Client Portal',
    primaryAction: 'View timeline',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Chef-only prep, fire order, and operational stress remain outside participant timing.',
    proofFocus: ['confirmed/tentative labels', 'change notifications', 'mobile timeline stability'],
  },
  {
    id: 'weather_backup',
    queueId: 'BQ-20260519T171015Z-add-weather-and-backup-plan-coordination-for-relevant-dinner',
    title: 'Weather and backup plan',
    summary: 'Optional forecast snapshot, backup location, attire note, and decision deadline.',
    source: 'Dinner Circles / Event Logistics / Risk Readiness',
    primaryAction: 'Check backup plan',
    allowedRoles: HOST_OPERATORS,
    privacyGuardrail:
      'Weather appears only for exposed events and includes source, timestamp, and stale state.',
    proofFocus: ['relevance gating', 'source timestamp', 'chef setup implications'],
  },
  {
    id: 'live_status',
    queueId: 'BQ-20260519T171016Z-add-day-of-attendee-live-status-and-calm-updates',
    title: 'Day-of live status',
    summary:
      'Calm updates for confirmed, en route, setup, arrival open, delay, and closeout states.',
    source: 'Dinner Circles / Service Day / Notifications / Client Portal',
    primaryAction: 'Update status',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Stale statuses are labeled and chef-only production stress is not published.',
    proofFocus: ['freshness labels', 'delay copy', 'role-safe notifications'],
  },
  {
    id: 'digest_controls',
    queueId: 'BQ-20260519T171016Z-add-dinner-circle-digest-and-quiet-summary-controls',
    title: 'Digest and quiet controls',
    summary: 'Since-you-left summaries, operational changes, muted chatter, and pending tasks.',
    source: 'Dinner Circles / Notifications / Feed / Mobile UX',
    primaryAction: 'Tune digest',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Permission filtering happens before summary generation; muted social chatter cannot hide required tasks.',
    proofFocus: ['quiet mode', 'task surfacing', 'suppressed no-change digest'],
  },
  {
    id: 'event_packet',
    queueId: 'BQ-20260519T171016Z-add-dinner-circle-share-export-and-printable-event-packet',
    title: 'Share and print packet',
    summary: 'Role-specific host, guest, chef, and collaborator packets with source timestamps.',
    source: 'Dinner Circles / Export / Print / Client Portal',
    primaryAction: 'Build packet',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Exports omit private notes, hidden surprises, payment details, guest data, and chef-only data by role.',
    proofFocus: ['role packet manifest', 'stale warning', 'print-safe redactions'],
  },
  {
    id: 'collaborator_access',
    queueId: 'BQ-20260519T171016Z-add-outside-collaborator-access-for-planners-vendors-and-hou',
    title: 'Outside collaborators',
    summary: 'Planner, vendor, assistant, and house manager roles with expiry, revoke, and audit.',
    source: 'Dinner Circles / Collaboration / Partner Access / Permissions',
    primaryAction: 'Manage access',
    allowedRoles: HOST_OPERATORS,
    capability: 'canManagePrivacy',
    privacyGuardrail:
      'Scoped collaborators cannot enumerate guests, payments, tenant data, or unrelated circle modules.',
    proofFocus: ['invite/revoke/expiry', 'module scopes', 'activity audit'],
  },
  {
    id: 'memory_album',
    queueId: 'BQ-20260519T171016Z-add-post-event-memory-album-thank-you-and-feedback-loop',
    title: 'Memory and feedback loop',
    summary:
      'Post-event album, thank-you, private feedback, testimonials, rebook, and archive controls.',
    source: 'Dinner Circles / Post Event / Client Retention / Media',
    primaryAction: 'Open memories',
    allowedRoles: EVERYONE,
    privacyGuardrail:
      'Private feedback, public testimonials, media consent, and archive retention remain separate.',
    proofFocus: ['post-event mode', 'photo consent', 'private/public feedback split'],
  },
  {
    id: 'growth_engine',
    queueId: 'BQ-20260519T171511Z-dinner-circle-growth-engine-google-reviews-guest-leads-follo',
    title: 'Growth actions',
    summary:
      'Google review link, follow, rebook, referral, consent, source attribution, and tracking.',
    source: 'Dinner Circles / Growth / Reputation / Lead Intelligence',
    primaryAction: 'Review funnel',
    allowedRoles: HOSTS,
    privacyGuardrail:
      'Review CTAs ask only for genuine experience reviews and never offer incentives or positive-only filtering.',
    proofFocus: ['no partial tracking', 'consent choices', 'host/event attribution'],
  },
  {
    id: 'visual_intake',
    queueId: 'BQ-20260519T172328Z-add-host-visual-intake-and-photo-slots-for-dinner-circle-pla',
    title: 'Host visual intake',
    summary: 'Kitchen, parking, venue, access, table, decor, cake, and logistics photo slots.',
    source: 'Dinner Circles / Client Portal / Media / Event Logistics',
    primaryAction: 'Review photo slots',
    allowedRoles: HOST_OPERATORS,
    privacyGuardrail:
      'Sensitive home and access images are private by default and excluded from public links, previews, and guest packets.',
    proofFocus: ['slot categories', 'chef-reviewed state', 'sensitive media redaction'],
  },
]

const CAPABILITY_DISABLED: Record<DinnerCircleActionCapability, string> = {
  canPost: 'Posting is limited for your circle role.',
  canInvite: 'Only hosts can invite new members.',
  canBroadcast: 'Only hosts and delegated operators can broadcast.',
  canManageTheme: 'Theme controls are limited to hosts and operators.',
  canManagePrivacy: 'Only hosts and operators can manage outside collaborators.',
}

export function resolveDinnerCircleWorkspaceModules({
  role,
  permissions = {},
  includeUnavailable = false,
}: ResolveDinnerCircleWorkspaceModulesInput): DinnerCircleWorkspaceModule[] {
  return MODULES.map((module) => {
    const roleAllowed = module.allowedRoles.includes(role)
    const capabilityAllowed = module.capability ? permissions[module.capability] !== false : true
    const disabledReason =
      roleAllowed && !capabilityAllowed && module.capability
        ? CAPABILITY_DISABLED[module.capability]
        : !roleAllowed && module.id === 'collaborator_access'
          ? CAPABILITY_DISABLED.canManagePrivacy
          : !roleAllowed
            ? 'This module is not available for your circle role.'
            : undefined

    return {
      ...module,
      permitted: roleAllowed && capabilityAllowed,
      disabledReason,
    }
  }).filter((module) => module.permitted || includeUnavailable)
}

export function buildDinnerCircleEventPacketManifest(input: {
  role: DinnerCircleActionRole
  permissions?: DinnerCircleActionPermissions
  generatedAt?: string
}): DinnerCircleEventPacketManifest {
  const modules = resolveDinnerCircleWorkspaceModules({
    role: input.role,
    permissions: input.permissions,
  })

  return {
    role: input.role,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sections: modules
      .filter((module) => module.id !== 'growth_engine')
      .map((module) => ({
        id: module.id,
        title: module.title,
        source: module.source,
      })),
    redactions: [
      'private guest notes',
      'hidden surprise content',
      'payment and ledger details',
      'chef-only production details',
      'unapproved public-proof media',
      'expired access codes',
    ],
  }
}
