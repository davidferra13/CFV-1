// Clients module - curated public API
//
// This barrel re-exports core CRUD operations and all types.
// For domain-specific functions (dietary, gifting, NDA, profiles, etc.),
// import directly from the sub-module file.

// ── Core CRUD ──────────────────────────────────────────────────────────

export {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  restoreClient,
  getClientsWithStats,
  getClientWithStats,
  searchClientsQuick,
  searchClientsByName,
} from './actions'

export type {
  InviteClientInput,
  UpdateClientInput,
  CreateClientInput,
  ClientQuickResult,
} from './actions'

// ── Action vocabulary types ────────────────────────────────────────────

export type {
  ClientActionType,
  ClientActionUrgency,
  ClientActionIconKey,
  RelationshipActionLayerSource,
} from './action-vocabulary'

// ── Health score types ─────────────────────────────────────────────────

export type { ClientHealthTier, ClientHealthScore, ClientHealthSummary } from './health-score'

// ── Churn types ────────────────────────────────────────────────────────

export type { ChurnRisk } from './churn-score'

// ── Completeness types ─────────────────────────────────────────────────

export type { ProfileCompletenessResult } from './completeness'

// ── Communication types ────────────────────────────────────────────────

export type {
  TimelineItemType,
  TimelineItem,
  TimelineResult,
  TimelineOptions,
  CommunicationStats,
} from './communication-actions'

// ── Preference types ───────────────────────────────────────────────────

export type {
  PreferenceRating,
  PreferenceItemType,
  ClientPreference,
  TasteProfile,
} from './preference-actions'

// ── Next best action types ─────────────────────────────────────────────

export type {
  NextBestActionPrimarySignal,
  NextBestActionReason,
  NextBestAction,
} from './next-best-action-core'
