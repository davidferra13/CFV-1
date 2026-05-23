export type DinnerCircleActionRole =
  | 'chef'
  | 'owner'
  | 'host'
  | 'co_host'
  | 'assistant'
  | 'planner'
  | 'member'
  | 'guest'

export type DinnerCircleActionGroupId = 'share' | 'plan' | 'host' | 'reference'

export type DinnerCircleActionId =
  | 'post_update'
  | 'upload_photo'
  | 'share_link'
  | 'rsvp'
  | 'dietary_update'
  | 'accommodation_update'
  | 'bring_list'
  | 'set_theme'
  | 'vote_poll'
  | 'ask_question'
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
  | 'growth_actions'
  | 'visual_intake'
  | 'report_change'
  | 'invite_member'
  | 'broadcast'
  | 'view_guide'
  | 'print_share'
  | 'mute_notifications'
  | 'privacy_settings'

export type DinnerCircleActionCapability =
  | 'canPost'
  | 'canInvite'
  | 'canBroadcast'
  | 'canManageTheme'
  | 'canManagePrivacy'

export type DinnerCircleActionDefinition = {
  id: DinnerCircleActionId
  label: string
  description: string
  groupId: DinnerCircleActionGroupId
  allowedRoles: DinnerCircleActionRole[]
  capability?: DinnerCircleActionCapability
  keywords: string[]
  dockPriority?: number
}

export type DinnerCircleActionGroup = {
  id: DinnerCircleActionGroupId
  label: string
  description: string
}

export type DinnerCircleActionPermissions = Partial<Record<DinnerCircleActionCapability, boolean>>

export type DinnerCircleResolvedAction = DinnerCircleActionDefinition & {
  permitted: boolean
  disabledReason?: string
  isRecent: boolean
}

export type ResolveDinnerCircleActionsInput = {
  role: DinnerCircleActionRole
  permissions?: DinnerCircleActionPermissions
  recentActionIds?: DinnerCircleActionId[]
  includeUnavailable?: boolean
}

export const DINNER_CIRCLE_ACTION_GROUPS: DinnerCircleActionGroup[] = [
  {
    id: 'share',
    label: 'Share',
    description: 'Feed, photos, links, and questions.',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'RSVPs, food details, bring items, theme, and polls.',
  },
  {
    id: 'host',
    label: 'Host',
    description: 'Invites, broadcasts, and circle controls.',
  },
  {
    id: 'reference',
    label: 'Reference',
    description: 'Guide, print/share, notifications, and privacy.',
  },
]

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

const PARTICIPANTS: DinnerCircleActionRole[] = [
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

export const DINNER_CIRCLE_ACTIONS: DinnerCircleActionDefinition[] = [
  {
    id: 'post_update',
    label: 'Post update',
    description: 'Add a short update to the circle feed.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    capability: 'canPost',
    keywords: ['feed', 'message', 'chat', 'hype', 'update'],
    dockPriority: 1,
  },
  {
    id: 'upload_photo',
    label: 'Upload photo',
    description: 'Share a prep, table, or dinner photo.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    capability: 'canPost',
    keywords: ['image', 'picture', 'media', 'camera'],
    dockPriority: 4,
  },
  {
    id: 'share_link',
    label: 'Share link',
    description: 'Post a recipe, playlist, registry, or useful link.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    capability: 'canPost',
    keywords: ['url', 'recipe', 'playlist', 'article'],
  },
  {
    id: 'rsvp',
    label: 'RSVP',
    description: 'Confirm attendance for the next dinner.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['attending', 'going', 'maybe', 'decline'],
    dockPriority: 2,
  },
  {
    id: 'dietary_update',
    label: 'Dietary update',
    description: 'Update restrictions, allergies, and preferences.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['allergy', 'preference', 'restriction', 'food'],
  },
  {
    id: 'accommodation_update',
    label: 'Access needs',
    description: 'Share seating, mobility, sensory, language, or service accommodations.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['access', 'accessibility', 'mobility', 'seating', 'language', 'sensory'],
  },
  {
    id: 'bring_list',
    label: 'Bring-list',
    description: 'Claim or add something to bring.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['bring', 'claim', 'supplies', 'potluck', 'item'],
    dockPriority: 3,
  },
  {
    id: 'set_theme',
    label: 'Set theme',
    description: 'Shape the circle theme, mood, and atmosphere.',
    groupId: 'plan',
    allowedRoles: HOST_OPERATORS,
    capability: 'canManageTheme',
    keywords: ['decor', 'mood', 'music', 'palette', 'atmosphere'],
  },
  {
    id: 'vote_poll',
    label: 'Vote poll',
    description: 'Vote on menu, timing, or circle decisions.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['poll', 'vote', 'choice', 'menu'],
  },
  {
    id: 'ask_question',
    label: 'Ask question',
    description: 'Ask the host or group for clarification.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    capability: 'canPost',
    keywords: ['question', 'help', 'clarify', 'chat'],
  },
  {
    id: 'attendee_profiles',
    label: 'Attendee cards',
    description: 'Review RSVP, plus-one, public note, and service-safe attendee context.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['attendee', 'profile', 'guest', 'relationship', 'rsvp'],
  },
  {
    id: 'seating_plan',
    label: 'Seating plan',
    description: 'Open the table plan, seat assignments, and role-safe seating notes.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['seating', 'table', 'seat', 'placement', 'print'],
    dockPriority: 5,
  },
  {
    id: 'concierge_qa',
    label: 'Q&A',
    description: 'Ask or browse source-backed event questions.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    capability: 'canPost',
    keywords: ['question', 'faq', 'concierge', 'remy', 'knowledge'],
  },
  {
    id: 'celebration_board',
    label: 'Celebration',
    description: 'Coordinate surprises, gifts, toasts, cakes, and reveal timing.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['gift', 'surprise', 'birthday', 'toast', 'cake'],
  },
  {
    id: 'menu_reveal',
    label: 'Menu reveal',
    description: 'Preview the client-safe menu story, dish notes, and pairings.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['menu', 'dish', 'story', 'pairing', 'reveal'],
  },
  {
    id: 'itinerary',
    label: 'Itinerary',
    description: 'View the participant run-of-show and timing updates.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['schedule', 'timeline', 'run of show', 'arrival', 'timing'],
  },
  {
    id: 'weather_backup',
    label: 'Backup plan',
    description: 'Review weather-sensitive backup plan and decision deadline.',
    groupId: 'host',
    allowedRoles: HOST_OPERATORS,
    keywords: ['weather', 'backup', 'tent', 'outdoor', 'risk'],
  },
  {
    id: 'live_status',
    label: 'Live status',
    description: 'Check day-of status, timing changes, and freshness labels.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['live', 'day of', 'status', 'delay', 'freshness'],
  },
  {
    id: 'digest_controls',
    label: 'Digest',
    description: 'Tune quiet mode and since-you-left summaries.',
    groupId: 'reference',
    allowedRoles: PARTICIPANTS,
    keywords: ['digest', 'quiet', 'summary', 'mute', 'notifications'],
  },
  {
    id: 'event_packet',
    label: 'Event packet',
    description: 'Build role-safe print and share packets.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['packet', 'print', 'export', 'share', 'pdf'],
  },
  {
    id: 'collaborator_access',
    label: 'Collaborators',
    description: 'Manage planner, vendor, assistant, and house-manager access.',
    groupId: 'host',
    allowedRoles: HOST_OPERATORS,
    capability: 'canManagePrivacy',
    keywords: ['vendor', 'planner', 'assistant', 'access', 'revoke'],
  },
  {
    id: 'memory_album',
    label: 'Memory album',
    description: 'Open post-event photos, thank-you, feedback, and archive controls.',
    groupId: 'share',
    allowedRoles: PARTICIPANTS,
    keywords: ['memory', 'album', 'photo', 'feedback', 'thank you'],
  },
  {
    id: 'growth_actions',
    label: 'Growth actions',
    description: 'Track review, follow, rebook, referral, consent, and attribution paths.',
    groupId: 'host',
    allowedRoles: ['chef', 'owner', 'host', 'co_host'],
    capability: 'canManagePrivacy',
    keywords: ['google', 'review', 'lead', 'referral', 'rebook'],
  },
  {
    id: 'visual_intake',
    label: 'Photo slots',
    description: 'Review kitchen, access, parking, table, decor, and logistics photos.',
    groupId: 'host',
    allowedRoles: HOST_OPERATORS,
    keywords: ['photo', 'kitchen', 'parking', 'venue', 'slots'],
  },
  {
    id: 'report_change',
    label: 'Report change',
    description: 'Flag a schedule, guest, dietary, or logistics change.',
    groupId: 'plan',
    allowedRoles: PARTICIPANTS,
    keywords: ['change', 'issue', 'schedule', 'guest', 'logistics'],
  },
  {
    id: 'invite_member',
    label: 'Invite member',
    description: 'Invite another trusted person into the circle.',
    groupId: 'host',
    allowedRoles: ['chef', 'owner', 'host', 'co_host'],
    capability: 'canInvite',
    keywords: ['member', 'invite', 'guest', 'add'],
  },
  {
    id: 'broadcast',
    label: 'Broadcast',
    description: 'Send an announcement to selected members.',
    groupId: 'host',
    allowedRoles: HOST_OPERATORS,
    capability: 'canBroadcast',
    keywords: ['announce', 'message all', 'reach out', 'email'],
    dockPriority: 1,
  },
  {
    id: 'view_guide',
    label: 'View guide',
    description: 'Open the dinner guide and expectations.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['guide', 'expectations', 'instructions', 'info'],
  },
  {
    id: 'print_share',
    label: 'Print/share',
    description: 'Print or share the circle summary.',
    groupId: 'reference',
    allowedRoles: EVERYONE,
    keywords: ['print', 'share', 'copy', 'summary'],
  },
  {
    id: 'mute_notifications',
    label: 'Mute notifications',
    description: 'Adjust circle alerts without leaving the group.',
    groupId: 'reference',
    allowedRoles: PARTICIPANTS,
    keywords: ['mute', 'notifications', 'alerts', 'quiet'],
  },
  {
    id: 'privacy_settings',
    label: 'Privacy/settings',
    description: 'Review visibility, posting, and member permissions.',
    groupId: 'host',
    allowedRoles: ['chef', 'owner', 'host', 'co_host'],
    capability: 'canManagePrivacy',
    keywords: ['privacy', 'settings', 'permissions', 'visibility'],
  },
]

const CAPABILITY_LABELS: Record<DinnerCircleActionCapability, string> = {
  canPost: 'Posting is limited for your circle role.',
  canInvite: 'Only hosts can invite new members.',
  canBroadcast: 'Only hosts and delegated operators can broadcast.',
  canManageTheme: 'Theme controls are limited to hosts and operators.',
  canManagePrivacy: 'Privacy settings are host-only.',
}

export function normalizeDinnerCircleActionRole(
  role: string | null | undefined,
  fallback: DinnerCircleActionRole = 'guest'
): DinnerCircleActionRole {
  if (!role) return fallback
  if (role === 'owner') return 'owner'
  if (role === 'host') return 'host'
  if (role === 'co_host') return 'co_host'
  if (role === 'assistant') return 'assistant'
  if (role === 'planner') return 'planner'
  if (role === 'chef') return 'chef'
  if (role === 'member') return 'member'
  if (role === 'guest') return 'guest'
  return fallback
}

export function resolveDinnerCircleActions({
  role,
  permissions = {},
  recentActionIds = [],
  includeUnavailable = false,
}: ResolveDinnerCircleActionsInput): DinnerCircleResolvedAction[] {
  const recentSet = new Set(recentActionIds)

  return DINNER_CIRCLE_ACTIONS.map((action) => {
    const roleAllowed = action.allowedRoles.includes(role)
    const capabilityAllowed = action.capability ? permissions[action.capability] !== false : true
    const disabledReason =
      roleAllowed && !capabilityAllowed && action.capability
        ? CAPABILITY_LABELS[action.capability]
        : !roleAllowed
          ? 'This action is not available for your circle role.'
          : undefined

    return {
      ...action,
      permitted: roleAllowed && capabilityAllowed,
      disabledReason,
      isRecent: recentSet.has(action.id),
    }
  }).filter((action) => {
    if (action.permitted) return true
    return includeUnavailable && Boolean(action.disabledReason)
  })
}

export function searchDinnerCircleActions(
  actions: DinnerCircleResolvedAction[],
  query: string
): DinnerCircleResolvedAction[] {
  const trimmed = query.trim().toLowerCase()
  const permitted = actions.filter((action) => action.permitted)
  if (!trimmed) return permitted

  return permitted
    .filter((action) => {
      const haystack = [action.label, action.description, action.groupId, ...action.keywords]
        .join(' ')
        .toLowerCase()
      return haystack.includes(trimmed) || fuzzyIncludes(action.label, trimmed)
    })
    .sort((a, b) => scoreAction(b, trimmed) - scoreAction(a, trimmed))
}

export function groupDinnerCircleActions(actions: DinnerCircleResolvedAction[]) {
  return DINNER_CIRCLE_ACTION_GROUPS.map((group) => ({
    ...group,
    actions: actions.filter((action) => action.groupId === group.id),
  })).filter((group) => group.actions.length > 0)
}

function fuzzyIncludes(label: string, query: string): boolean {
  const lower = label.toLowerCase()
  let qi = 0
  for (let i = 0; i < lower.length && qi < query.length; i += 1) {
    if (lower[i] === query[qi]) qi += 1
  }
  return qi === query.length
}

function scoreAction(action: DinnerCircleResolvedAction, query: string): number {
  const label = action.label.toLowerCase()
  if (label === query) return 100
  if (label.startsWith(query)) return 80
  if (action.keywords.some((keyword) => keyword.toLowerCase().startsWith(query))) return 70
  if (label.includes(query)) return 60
  return 40
}
