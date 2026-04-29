export const CLIENT_KNOWLEDGE_FIELD_KEYS = [
  'full_name',
  'preferred_name',
  'email',
  'phone',
  'address',
  'access_instructions',
  'parking_instructions',
  'kitchen_constraints',
  'allergies',
  'dietary_restrictions',
  'dietary_protocols',
  'dislikes',
  'favorite_cuisines',
  'favorite_dishes',
  'spice_tolerance',
  'wine_beverage_preferences',
  'event_history',
  'payment_history',
  'loyalty_status',
  'dinner_circle',
  'private_chef_notes',
] as const

export type ClientKnowledgeFieldKey = (typeof CLIENT_KNOWLEDGE_FIELD_KEYS)[number]

export type ClientKnowledgeSource =
  | 'client_profile'
  | 'chef_profile'
  | 'event'
  | 'ledger'
  | 'loyalty'
  | 'hub'
  | 'chef_private'

export type ClientKnowledgeActor = 'client' | 'chef' | 'system'

export type ClientKnowledgeAudience = 'client' | 'chef' | 'remy_client' | 'remy_chef' | 'admin'

export type ClientKnowledgeSyncTarget =
  | 'client_profile'
  | 'chef_client_profile'
  | 'active_events'
  | 'menu_safety'
  | 'remy_context_cache'
  | 'client_dashboard'
  | 'notifications'
  | 'ledger'
  | 'loyalty'
  | 'dinner_circle'
  | 'audit_log'

export type ClientKnowledgeFreshness = 'static' | 'event_scoped' | 'review_30d' | 'review_90d'

export interface ClientKnowledgeFieldContract {
  key: ClientKnowledgeFieldKey
  label: string
  sourceOfTruth: ClientKnowledgeSource
  editableBy: ClientKnowledgeActor[]
  visibleTo: ClientKnowledgeAudience[]
  syncTargets: ClientKnowledgeSyncTarget[]
  freshness: ClientKnowledgeFreshness
  containsPii: boolean
  safetyCritical: boolean
  remySourceLabel: string | null
}

const CONTRACTS: ClientKnowledgeFieldContract[] = [
  {
    key: 'full_name',
    label: 'Client full name',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: [
      'client_profile',
      'chef_client_profile',
      'remy_context_cache',
      'client_dashboard',
    ],
    freshness: 'review_90d',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'preferred_name',
    label: 'Preferred name',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: [
      'client_profile',
      'chef_client_profile',
      'remy_context_cache',
      'client_dashboard',
    ],
    freshness: 'review_90d',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'email',
    label: 'Email',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'notifications', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'phone',
    label: 'Phone',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'notifications', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'address',
    label: 'Address',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'active_events', 'remy_context_cache'],
    freshness: 'event_scoped',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'access_instructions',
    label: 'Access instructions',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'active_events', 'remy_context_cache'],
    freshness: 'event_scoped',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'parking_instructions',
    label: 'Parking instructions',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'active_events', 'remy_context_cache'],
    freshness: 'event_scoped',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'profile',
  },
  {
    key: 'kitchen_constraints',
    label: 'Kitchen constraints',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'active_events', 'remy_context_cache'],
    freshness: 'event_scoped',
    containsPii: false,
    safetyCritical: true,
    remySourceLabel: 'profile',
  },
  {
    key: 'allergies',
    label: 'Allergies',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'remy_context_cache',
      'notifications',
      'audit_log',
    ],
    freshness: 'review_30d',
    containsPii: false,
    safetyCritical: true,
    remySourceLabel: 'dietary',
  },
  {
    key: 'dietary_restrictions',
    label: 'Dietary restrictions',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: [
      'client_profile',
      'chef_client_profile',
      'active_events',
      'menu_safety',
      'remy_context_cache',
      'notifications',
      'audit_log',
    ],
    freshness: 'review_30d',
    containsPii: false,
    safetyCritical: true,
    remySourceLabel: 'dietary',
  },
  {
    key: 'dietary_protocols',
    label: 'Dietary protocols',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'menu_safety', 'remy_context_cache'],
    freshness: 'review_30d',
    containsPii: false,
    safetyCritical: true,
    remySourceLabel: 'dietary',
  },
  {
    key: 'dislikes',
    label: 'Dislikes',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'preferences',
  },
  {
    key: 'favorite_cuisines',
    label: 'Favorite cuisines',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'preferences',
  },
  {
    key: 'favorite_dishes',
    label: 'Favorite dishes',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'preferences',
  },
  {
    key: 'spice_tolerance',
    label: 'Spice tolerance',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'preferences',
  },
  {
    key: 'wine_beverage_preferences',
    label: 'Wine and beverage preferences',
    sourceOfTruth: 'client_profile',
    editableBy: ['client', 'chef'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_profile', 'chef_client_profile', 'remy_context_cache'],
    freshness: 'review_90d',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'preferences',
  },
  {
    key: 'event_history',
    label: 'Event history',
    sourceOfTruth: 'event',
    editableBy: ['chef', 'system'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['client_dashboard', 'remy_context_cache'],
    freshness: 'static',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'event',
  },
  {
    key: 'payment_history',
    label: 'Payment history',
    sourceOfTruth: 'ledger',
    editableBy: ['system'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['ledger', 'client_dashboard', 'remy_context_cache'],
    freshness: 'static',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'ledger',
  },
  {
    key: 'loyalty_status',
    label: 'Loyalty status',
    sourceOfTruth: 'loyalty',
    editableBy: ['system'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['loyalty', 'client_dashboard', 'remy_context_cache'],
    freshness: 'static',
    containsPii: false,
    safetyCritical: false,
    remySourceLabel: 'loyalty',
  },
  {
    key: 'dinner_circle',
    label: 'Dinner Circle relationships',
    sourceOfTruth: 'hub',
    editableBy: ['client', 'chef', 'system'],
    visibleTo: ['client', 'chef', 'remy_client', 'remy_chef', 'admin'],
    syncTargets: ['dinner_circle', 'client_dashboard', 'remy_context_cache'],
    freshness: 'static',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: 'dinner_circle',
  },
  {
    key: 'private_chef_notes',
    label: 'Private chef notes',
    sourceOfTruth: 'chef_private',
    editableBy: ['chef'],
    visibleTo: ['chef', 'remy_chef', 'admin'],
    syncTargets: ['chef_client_profile', 'remy_context_cache'],
    freshness: 'static',
    containsPii: true,
    safetyCritical: false,
    remySourceLabel: null,
  },
]

export function getClientKnowledgeContracts(): ClientKnowledgeFieldContract[] {
  return CONTRACTS.map((contract) => ({
    ...contract,
    editableBy: [...contract.editableBy],
    visibleTo: [...contract.visibleTo],
    syncTargets: [...contract.syncTargets],
  }))
}

export function getClientKnowledgeContract(
  key: ClientKnowledgeFieldKey
): ClientKnowledgeFieldContract {
  const contract = CONTRACTS.find((candidate) => candidate.key === key)
  if (!contract) {
    throw new Error(`Unknown client knowledge field: ${key}`)
  }
  return {
    ...contract,
    editableBy: [...contract.editableBy],
    visibleTo: [...contract.visibleTo],
    syncTargets: [...contract.syncTargets],
  }
}

export function getClientKnowledgeFieldsForAudience(
  audience: ClientKnowledgeAudience
): ClientKnowledgeFieldContract[] {
  return getClientKnowledgeContracts().filter((contract) => contract.visibleTo.includes(audience))
}

export function getClientKnowledgeSyncTargets(
  key: ClientKnowledgeFieldKey
): ClientKnowledgeSyncTarget[] {
  return getClientKnowledgeContract(key).syncTargets
}

export function canAudienceSeeClientKnowledgeField(
  audience: ClientKnowledgeAudience,
  key: ClientKnowledgeFieldKey
): boolean {
  return getClientKnowledgeContract(key).visibleTo.includes(audience)
}

export function getRemyClientSourceLabels(): string[] {
  const labels = new Set<string>()
  for (const contract of CONTRACTS) {
    if (contract.visibleTo.includes('remy_client') && contract.remySourceLabel) {
      labels.add(contract.remySourceLabel)
    }
  }
  return Array.from(labels).sort()
}
