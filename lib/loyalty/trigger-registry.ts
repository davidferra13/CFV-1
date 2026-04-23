// Loyalty Trigger Registry (client-safe)
// Pure constants and types. No server imports.
// Used by both the settings form (client component) and triggers.ts (server module).

export type TriggerFrequency = 'per_event' | 'per_action' | 'one_time'

export type TriggerCategory = 'engagement' | 'event_lifecycle' | 'financial' | 'social'

export type TriggerDefinition = {
  key: string
  label: string
  description: string
  defaultPoints: number
  frequency: TriggerFrequency
  category: TriggerCategory
  idempotencyTable?: 'clients' | 'events'
  idempotencyColumn?: string
}

export type TriggerConfigOverride = {
  enabled: boolean
  points: number
}

// ── Registry ─────────────────────────────────────────────────────────────

export const TRIGGER_REGISTRY: TriggerDefinition[] = [
  // Engagement
  {
    key: 'profile_completed',
    label: 'Profile completed',
    description: 'Client fills in name, email, and phone',
    defaultPoints: 15,
    frequency: 'one_time',
    category: 'engagement',
    idempotencyTable: 'clients',
    idempotencyColumn: 'loyalty_profile_complete_awarded',
  },
  {
    key: 'fun_qa_completed',
    label: 'Fun Q&A answered',
    description: 'Client answers the fun questionnaire',
    defaultPoints: 10,
    frequency: 'one_time',
    category: 'engagement',
    idempotencyTable: 'clients',
    idempotencyColumn: 'loyalty_fun_qa_awarded',
  },
  {
    key: 'chat_engagement',
    label: 'First message in event chat',
    description: 'Client sends their first message in a conversation',
    defaultPoints: 5,
    frequency: 'per_event',
    category: 'engagement',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_chat_engagement_awarded',
  },
  {
    key: 'meal_feedback_given',
    label: 'Meal feedback given',
    description: 'Client submits a dish reaction',
    defaultPoints: 5,
    frequency: 'per_action',
    category: 'engagement',
  },

  // Event Lifecycle
  {
    key: 'review_submitted',
    label: 'Review submitted',
    description: 'Client leaves a review after an event',
    defaultPoints: 20,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_review_awarded',
  },
  {
    key: 'quote_accepted',
    label: 'Quote accepted',
    description: 'Client accepts a quote',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_quote_accepted_awarded',
  },
  {
    key: 'menu_approved',
    label: 'Menu approved',
    description: 'Client approves their event menu',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'event_lifecycle',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_menu_approved_awarded',
  },

  // Financial
  {
    key: 'payment_on_time',
    label: 'On-time payment',
    description: 'Payment recorded for a sale',
    defaultPoints: 15,
    frequency: 'per_event',
    category: 'financial',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_ontime_payment_awarded',
  },
  {
    key: 'tip_added',
    label: 'Gratuity added',
    description: 'Client includes a gratuity with payment',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'financial',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_tip_awarded',
  },

  // Social
  {
    key: 'google_review_clicked',
    label: 'Google review clicked',
    description: 'Client clicks the Google Review link',
    defaultPoints: 25,
    frequency: 'per_event',
    category: 'social',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_google_review_awarded',
  },
  {
    key: 'public_review_consent',
    label: 'Public review consent',
    description: 'Client consents to display their review publicly',
    defaultPoints: 10,
    frequency: 'per_event',
    category: 'social',
    idempotencyTable: 'events',
    idempotencyColumn: 'loyalty_public_consent_awarded',
  },
  {
    key: 'rsvp_collected',
    label: 'Guest RSVP collected',
    description: "A guest submits an RSVP for the client's event",
    defaultPoints: 5,
    frequency: 'per_action',
    category: 'social',
  },
  {
    key: 'hub_group_created',
    label: 'Hub group created',
    description: 'Client creates a new group',
    defaultPoints: 10,
    frequency: 'per_action',
    category: 'social',
  },
  {
    key: 'friend_invited',
    label: 'Friend connection accepted',
    description: 'A friend request is accepted',
    defaultPoints: 15,
    frequency: 'per_action',
    category: 'social',
  },
]

export const REGISTRY_MAP = new Map(TRIGGER_REGISTRY.map((t) => [t.key, t]))

// ── Category Labels ──────────────────────────────────────────────────────

export const TRIGGER_CATEGORY_LABELS: Record<TriggerCategory, string> = {
  engagement: 'Engagement',
  event_lifecycle: 'Event Lifecycle',
  financial: 'Financial',
  social: 'Social',
}
