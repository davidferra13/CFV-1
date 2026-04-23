export type ClientActionType =
  | 'booking_blocker'
  | 'reply_inquiry'
  | 'follow_up_quote'
  | 'quote_revision'
  | 're_engage'
  | 'schedule_event'
  | 'send_birthday'
  | 'ask_referral'
  | 'reach_out'

export type ClientActionUrgency = 'critical' | 'high' | 'normal' | 'low'

export type ClientActionIconKey =
  | 'alert_triangle'
  | 'message_circle'
  | 'calendar'
  | 'refresh'
  | 'gift'
  | 'sparkles'

export type RelationshipActionLayerSource =
  | 'booking_blocker'
  | 'follow_up_quote'
  | 'quote_revision'
  | 'reach_out'
  | 'send_birthday'
  | 'ask_referral'
  | 'schedule_first_event'

type RelationshipRouteCopy = {
  title: string
  summary: string
}

type RelationshipActionLayerCopy = {
  source: RelationshipActionLayerSource
  ctaLabel: string
  buildTitle: (action: {
    clientName: string
    label: string
  }) => string
}

type ClientActionDefinition = {
  iconKey: ClientActionIconKey
  defaultLabel: string
  relationshipRoute: RelationshipRouteCopy
  relationshipActionLayer: RelationshipActionLayerCopy | null
}

const DEFAULT_RELATIONSHIP_ROUTE_COPY: RelationshipRouteCopy = {
  title: 'Relationship Next',
  summary:
    'This route exists for client-portfolio follow-through: outreach, re-engagement, milestone messages, and first-event conversion.',
}

const CLIENT_ACTION_VOCABULARY: Record<ClientActionType, ClientActionDefinition> = {
  booking_blocker: {
    iconKey: 'alert_triangle',
    defaultLabel: 'Resolve booking blocker',
    relationshipRoute: {
      title: 'Resolve Booking Blocker',
      summary:
        'A live event handoff is waiting on chef follow-through. Use the linked booking workflow to clear the blocker before falling back to relationship-only outreach.',
    },
    relationshipActionLayer: {
      source: 'booking_blocker',
      ctaLabel: 'Resolve Booking Blocker',
      buildTitle: (action) => action.label,
    },
  },
  reply_inquiry: {
    iconKey: 'message_circle',
    defaultLabel: 'Reply to inquiry',
    relationshipRoute: {
      title: 'Reply to Inquiry',
      summary:
        'An inquiry tied to this client is waiting on your response. Move through the inquiry workflow first, then return here for relationship follow-through.',
    },
    relationshipActionLayer: null,
  },
  follow_up_quote: {
    iconKey: 'message_circle',
    defaultLabel: 'Follow up on quote',
    relationshipRoute: {
      title: 'Follow Up on Quote',
      summary:
        'A sent quote still needs momentum. Use this route to follow up with context from the canonical interaction ledger instead of guessing from scattered client activity.',
    },
    relationshipActionLayer: {
      source: 'follow_up_quote',
      ctaLabel: 'Follow Up on Quote',
      buildTitle: (action) => `Follow up on the quote for ${action.clientName}`,
    },
  },
  quote_revision: {
    iconKey: 'refresh',
    defaultLabel: 'Prepare revised quote',
    relationshipRoute: {
      title: 'Prepare Revised Quote',
      summary:
        'The latest quote was rejected or pushed off the original scope. Open the prepared revision draft first, then return to relationship follow-through once the pricing path is real.',
    },
    relationshipActionLayer: {
      source: 'quote_revision',
      ctaLabel: 'Open Revised Draft',
      buildTitle: (action) => `Prepare a revised quote for ${action.clientName}`,
    },
  },
  re_engage: {
    iconKey: 'refresh',
    defaultLabel: 'Re-engage dormant client',
    relationshipRoute: {
      title: 'Re-engage Dormant Client',
      summary:
        'This relationship has gone cold. Use the outreach tools here to re-open the conversation while the client history and signals stay in view.',
    },
    relationshipActionLayer: {
      source: 'reach_out',
      ctaLabel: 'Re-engage Client',
      buildTitle: (action) => `Re-engage ${action.clientName}`,
    },
  },
  schedule_event: {
    iconKey: 'calendar',
    defaultLabel: 'Schedule their first event',
    relationshipRoute: {
      title: 'Schedule First Event',
      summary:
        'This contact still has no booked events. Use this route to reach out or move straight into the first-event creation flow.',
    },
    relationshipActionLayer: {
      source: 'schedule_first_event',
      ctaLabel: 'Schedule First Event',
      buildTitle: (action) => `Schedule the first event for ${action.clientName}`,
    },
  },
  send_birthday: {
    iconKey: 'gift',
    defaultLabel: 'Send birthday or anniversary message',
    relationshipRoute: {
      title: 'Send Birthday or Anniversary Message',
      summary:
        'A client milestone is coming up. Use this route to send or schedule a personal note tied to that relationship moment.',
    },
    relationshipActionLayer: {
      source: 'send_birthday',
      ctaLabel: 'Send Birthday Message',
      buildTitle: (action) => `Send a birthday message to ${action.clientName}`,
    },
  },
  ask_referral: {
    iconKey: 'sparkles',
    defaultLabel: 'Ask for a referral',
    relationshipRoute: {
      title: 'Ask for Referral',
      summary:
        'This client is a strong relationship. Use the outreach tools here to make a direct referral ask while the relationship is warm.',
    },
    relationshipActionLayer: {
      source: 'ask_referral',
      ctaLabel: 'Ask for Referral',
      buildTitle: (action) => `Ask ${action.clientName} for a referral`,
    },
  },
  reach_out: {
    iconKey: 'message_circle',
    defaultLabel: 'Reach out before going cold',
    relationshipRoute: {
      title: 'Reach Out Before Going Cold',
      summary:
        'The relationship engine flagged this client for proactive outreach. Send or schedule a note from here while the re-engagement window is still useful.',
    },
    relationshipActionLayer: {
      source: 'reach_out',
      ctaLabel: 'Reach Out Before Going Cold',
      buildTitle: (action) => `Reach out to ${action.clientName}`,
    },
  },
}

export function getClientActionDefinition(actionType: ClientActionType): ClientActionDefinition {
  return CLIENT_ACTION_VOCABULARY[actionType]
}

export function getClientActionIconKey(actionType: ClientActionType): ClientActionIconKey {
  return getClientActionDefinition(actionType).iconKey
}

export function getRelationshipRouteCopy(
  actionType: ClientActionType | null | undefined
): RelationshipRouteCopy {
  if (!actionType) return DEFAULT_RELATIONSHIP_ROUTE_COPY
  return getClientActionDefinition(actionType).relationshipRoute
}

export function getRelationshipActionLayerCopy(action: {
  actionType: ClientActionType
  clientName: string
  label: string
}): {
  source: RelationshipActionLayerSource
  ctaLabel: string
  title: string
} | null {
  const copy = getClientActionDefinition(action.actionType).relationshipActionLayer
  if (!copy) return null

  return {
    source: copy.source,
    ctaLabel: copy.ctaLabel,
    title: copy.buildTitle(action),
  }
}
