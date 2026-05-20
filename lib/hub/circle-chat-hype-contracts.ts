import type { HubDigestMode, HubMemberRole, HubMessageType } from './types'

export type CircleChatActionId =
  | 'post_message'
  | 'reply'
  | 'react'
  | 'hype_milestone'
  | 'pin_update'
  | 'mute_or_digest'
  | 'report_message'
  | 'hide_own_message'
  | 'remove_message'

export type CircleChatTone = 'social' | 'hype' | 'operational' | 'moderation'

export type CircleChatActionSurface = {
  role: HubMemberRole
  actions: CircleChatActionId[]
  notificationMode: 'live' | 'muted' | HubDigestMode
  operationalNoticeTreatment: 'pinned_distinct_from_chatter'
  memoryFeedPolicy: 'pinned_and_milestone_throttled'
  privacyBoundaries: string[]
}

export type CircleChatEntryInput = {
  id: string
  messageType: HubMessageType
  source?: 'circle' | 'email' | 'remy' | 'system'
  body?: string | null
  isPinned?: boolean
  systemEventType?: string | null
  reactionCounts?: Record<string, number>
  createdAt: string
}

export type CircleChatEntryClassification = {
  id: string
  tone: CircleChatTone
  visuallyDistinct: boolean
  memoryFeedEligible: boolean
  notificationPriority: 'silent' | 'digest' | 'live'
  reason: string
}

export type CircleHypePrompt = {
  id: string
  label: string
  suggestedBody: string
  minDaysUntil: number
  maxDaysUntil: number
}

const ROLE_ACTIONS: Record<HubMemberRole, CircleChatActionId[]> = {
  owner: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'pin_update',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
    'remove_message',
  ],
  admin: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'pin_update',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
    'remove_message',
  ],
  chef: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'pin_update',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
    'remove_message',
  ],
  host: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'pin_update',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
  ],
  member: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
  ],
  delegate: [
    'post_message',
    'reply',
    'react',
    'hype_milestone',
    'mute_or_digest',
    'report_message',
    'hide_own_message',
  ],
  viewer: ['react', 'mute_or_digest', 'report_message'],
}

export function buildCircleChatActionSurface(input: {
  role: HubMemberRole
  canPost: boolean
  canPin: boolean
  notificationsMuted?: boolean
  digestMode?: HubDigestMode
}): CircleChatActionSurface {
  const roleActions = ROLE_ACTIONS[input.role] ?? ROLE_ACTIONS.viewer
  const actions = roleActions.filter((action) => {
    if (['post_message', 'reply', 'hype_milestone'].includes(action)) return input.canPost
    if (action === 'pin_update') return input.canPin || ['owner', 'admin', 'chef'].includes(input.role)
    return true
  })

  return {
    role: input.role,
    actions,
    notificationMode: input.notificationsMuted ? 'muted' : (input.digestMode ?? 'live'),
    operationalNoticeTreatment: 'pinned_distinct_from_chatter',
    memoryFeedPolicy: 'pinned_and_milestone_throttled',
    privacyBoundaries: [
      'payment, cancellation, and chef-only risk notices are not normal chatter',
      'private surprises must stay out of guest-visible threads unless host-shared',
      'reports and removals create moderation evidence without public pile-ons',
      'muting chat never hides critical operational notices',
    ],
  }
}

export function classifyCircleChatEntry(
  entry: CircleChatEntryInput
): CircleChatEntryClassification {
  if (entry.messageType === 'notification' || entry.messageType === 'system' || entry.isPinned) {
    return {
      id: entry.id,
      tone: 'operational',
      visuallyDistinct: true,
      memoryFeedEligible: true,
      notificationPriority: entry.isPinned ? 'live' : 'digest',
      reason: 'Pinned, system, and notification entries stay distinct from social chatter.',
    }
  }

  const body = entry.body ?? ''
  const hasHypeLanguage =
    /birthday|anniversary|celebrat|countdown|cheers|excited|can't wait|cant wait|hype/i.test(body)
  const reactionTotal = Object.values(entry.reactionCounts ?? {}).reduce((sum, count) => sum + count, 0)

  if (hasHypeLanguage || reactionTotal >= 3) {
    return {
      id: entry.id,
      tone: 'hype',
      visuallyDistinct: false,
      memoryFeedEligible: true,
      notificationPriority: 'digest',
      reason: 'Milestone energy can become event memory when it is explicit or widely reacted to.',
    }
  }

  return {
    id: entry.id,
    tone: 'social',
    visuallyDistinct: false,
    memoryFeedEligible: false,
    notificationPriority: 'silent',
    reason: 'Regular chatter remains in chat and does not flood event memory.',
  }
}

export function getCircleHypePrompts(input: {
  occasion?: string | null
  daysUntil: number
}): CircleHypePrompt[] {
  const occasion = input.occasion?.trim() || 'dinner'
  return [
    {
      id: 'countdown',
      label: 'Countdown hype',
      suggestedBody: `Only ${input.daysUntil} days until ${occasion}. Who is ready?`,
      minDaysUntil: 2,
      maxDaysUntil: 30,
    },
    {
      id: 'menu_reveal',
      label: 'Menu reveal energy',
      suggestedBody: `The menu is coming together for ${occasion}. Drop what you are most excited to try.`,
      minDaysUntil: 1,
      maxDaysUntil: 90,
    },
    {
      id: 'celebration',
      label: 'Celebrate the guest of honor',
      suggestedBody: `Send a note for the ${occasion} celebration thread.`,
      minDaysUntil: 0,
      maxDaysUntil: 120,
    },
  ].filter((prompt) => input.daysUntil >= prompt.minDaysUntil && input.daysUntil <= prompt.maxDaysUntil)
}

export function selectCircleMemoryFeedChatEntries(
  entries: CircleChatEntryInput[],
  maxSocialEntries = 3
): CircleChatEntryClassification[] {
  const classified = entries.map(classifyCircleChatEntry)
  const operational = classified.filter((entry) => entry.tone === 'operational')
  const hype = classified.filter((entry) => entry.tone === 'hype').slice(0, maxSocialEntries)
  return [...operational, ...hype]
}
