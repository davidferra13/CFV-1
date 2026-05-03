// Clients module - public API

// Core CRUD actions ('use server')
export {
  inviteClient,
  createClient,
  getClients,
  getClientById,
  createClientFromLead,
  updateClient,
  deleteClient,
  restoreClient,
  getPendingInvitations,
  cancelInvitation,
  getClientsWithStats,
  getClientEvents,
  getClientWithStats,
  updateClientHousehold,
  getClientDormancyInfo,
  updateClientStatus,
  getClientFinancialDetail,
  setClientAutomatedEmails,
  addClientFromInquiry,
  createClientDirect,
  searchClientsQuick,
  searchClientsByName,
  getClientLastEventPrefill,
} from './actions'
export type {
  InviteClientInput,
  UpdateClientInput,
  CreateClientInput,
  ClientQuickResult,
} from './actions'

// Action vocabulary
export {
  getClientActionDefinition,
  getClientActionIconKey,
  getRelationshipRouteCopy,
  getRelationshipActionLayerCopy,
} from './action-vocabulary'
export type {
  ClientActionType,
  ClientActionUrgency,
  ClientActionIconKey,
  RelationshipActionLayerSource,
} from './action-vocabulary'

// Health score ('use server')
export { getClientHealthScores, getSingleClientHealthScore } from './health-score'
export type { ClientHealthTier, ClientHealthScore, ClientHealthSummary } from './health-score'

// Health score utilities
export { TIER_LABELS, TIER_COLORS } from './health-score-utils'

// Churn risk ('use server')
export { getAtRiskClients } from './churn-score'
export type { ChurnRisk } from './churn-score'

// Completeness
export {
  getClientProfileCompleteness,
  getClientProfileEngagementPoints,
  CLIENT_PROFILE_COMPLETENESS_FIELDS,
} from './completeness'
export type { ProfileCompletenessResult } from './completeness'

// Segments ('use server')
export { getSegments, createSegment, deleteSegment } from './segments'

// Tags ('use server')
export {
  getClientTags,
  getAllUsedTags,
  addClientTag,
  removeClientTag,
  getTagsForAllClients,
} from './tag-actions'

// Bulk actions ('use server')
export { bulkArchiveClients } from './bulk-actions'

// Client profile actions ('use server')
export {
  getMyProfile,
  updateMyProfile,
  getMyMealCollaborationData,
  updateMyMealFavorites,
  createMyMealRequest,
  withdrawMyMealRequest,
  respondToMyRecurringRecommendation,
  updateMyServedDishFeedback,
  getMyFunQA,
  updateMyFunQA,
  getClientFunQA,
  getClientCulinaryProfileGuidance,
} from './client-profile-actions'
export type {
  UpdateClientProfileInput,
  CreateMealRequestInput,
  UpdateMyMealFavoritesInput,
  ServedDishHistoryEntry,
  ClientMealRequestEntry,
  RecurringRecommendationEntry,
  ClientFavoritesSnapshot,
} from './client-profile-actions'

// Client profile chef workflow
export {
  mapClientProfileVectorToMenuClientTasteSummary,
  buildDietaryConflictsFromVector,
  buildProposalProfileGuidance,
} from './client-profile-chef-workflow'
export type {
  MenuClientTasteSummary,
  DietaryConflict,
  ProposalProfileGuidance,
  MenuConflictDish,
} from './client-profile-chef-workflow'

// Client profile service
export {
  CLIENT_PROFILE_ENGINE_VERSION,
  buildCulinaryProfileVector,
  loadClientProfileSourceBundle,
  rebuildClientProfileVectorForTenant,
  getClientProfileVectorForTenant,
  recommendCandidateMealsAgainstVector,
  recommendMealForClientForTenant,
} from './client-profile-service'
export type { ClientProfileSourceBundle } from './client-profile-service'

// Client profile service schema
export {
  ClientProfileSourceTypeSchema,
  ClientProfileSubjectKindSchema,
  ClientServiceDepthSchema,
  CulinaryProfileVectorSchema,
  RecommendationResultSchema,
  RecommendationRequestSchema,
} from './client-profile-service-schema'
export type {
  ClientProfileSourceType,
  ClientProfileSubjectKind,
  ClientServiceDepth,
  ClientEmotionalState,
  ProfileEvidenceRef,
  ProfilePreference,
} from './client-profile-service-schema'

// Communication ('use server')
export {
  getClientTimeline,
  getClientCommunicationStats,
  addCommunicationNote,
  getCommunicationNotes,
} from './communication-actions'
export type {
  TimelineItemType,
  TimelineItem,
  TimelineResult,
  TimelineOptions,
  CommunicationStats,
} from './communication-actions'

// Unified timeline ('use server')
export { getUnifiedClientTimeline } from './unified-timeline'
export type { UnifiedTimelineItem } from './unified-timeline'

// Unified timeline utilities
export { SOURCE_CONFIG } from './unified-timeline-utils'
export type { TimelineItemSource } from './unified-timeline-utils'

// Interaction ledger core
export {
  HIGH_SIGNAL_CLIENT_ACTIVITY_TYPES,
  projectInteractionLedgerToUnifiedTimeline,
  buildClientInteractionLedgerEntries,
} from './interaction-ledger-core'
export type {
  ClientInteractionSource,
  ClientInteractionActor,
  ClientInteractionCode,
  ClientInteractionLedgerEntry,
  UnifiedTimelineProjectionItem,
  ClientInteractionLedgerInput,
} from './interaction-ledger-core'

// Interaction ledger ('use server')
export { getClientInteractionLedger } from './interaction-ledger'

// Interaction signals ('use server')
export { getClientInteractionSignals, getClientInteractionSignalMap } from './interaction-signals'

// Interaction signal utilities
export {
  getClientInteractionSignalMeta,
  getClientInteractionSignalShortLabel,
  buildClientInteractionSignalSnapshot,
} from './interaction-signal-utils'
export type {
  ClientInteractionSignalType,
  ClientInteractionSignalReason,
  ClientInteractionSignal,
  ClientInteractionSignalSnapshot,
  ClientMilestoneRecord,
} from './interaction-signal-utils'

// Relationship signals
export { buildClientRelationshipSignalSnapshot } from './relationship-signals'
export type {
  ClientRelationshipSignal,
  ClientRelationshipSignalSnapshot,
} from './relationship-signals'

// Relationship snapshot ('use server')
export { getClientRelationshipSnapshot } from './relationship-snapshot'
export type { ClientRelationshipSnapshot } from './relationship-snapshot'

// Culinary signals
export {
  buildClientCulinarySignalSnapshot,
  summarizeClientCulinarySignals,
  buildNegativeSignalLookup,
} from './culinary-signals'
export type {
  ClientCulinarySignal,
  ClientCulinarySignalSnapshot,
  ClientCulinaryClientRecord,
  ClientCulinaryMenuSummary,
} from './culinary-signals'

// Culinary snapshot ('use server')
export {
  getClientCulinarySnapshot,
  getClientCulinarySnapshotForTenant,
  getClientCulinaryMenuSummaryForTenant,
} from './culinary-snapshot'

// Intelligence ('use server')
export { getRepeatClientIntelligence } from './intelligence'
export type { RepeatClientIntelligence } from './intelligence'

// Next best action ('use server')
export { getNextBestActions, getClientNextBestAction } from './next-best-action'

// Next best action core
export { selectNextBestAction } from './next-best-action-core'
export type {
  NextBestActionPrimarySignal,
  NextBestActionReason,
  NextBestAction,
} from './next-best-action-core'

// Preferences ('use server')
export {
  addPreference,
  getClientPreferences,
  getClientTasteProfile,
  recordPostEventFeedback,
  suggestAvoidItems,
  deletePreference,
} from './preference-actions'
export type {
  PreferenceRating,
  PreferenceItemType,
  ClientPreference,
  TasteProfile,
} from './preference-actions'

// Preference learning
export { learnClientPreferences, getClientPatterns } from './preference-learning-actions'
export type { ClientPattern } from './preference-learning-actions'

// Taste profile ('use server')
export { getTasteProfile, upsertTasteProfile } from './taste-profile-actions'
export type { ClientTasteProfile, TasteProfileInput } from './taste-profile-actions'

// Dietary alerts ('use server')
export {
  getDietaryAlerts,
  acknowledgeAlert,
  acknowledgeAllAlerts,
  logDietaryChange,
  logDietaryChangeInternal,
  getDietaryTrends,
  getClientDietaryTimeline,
  getAlertStats,
} from './dietary-alert-actions'
export type { DietaryAlert, DietaryTrend, AlertStats } from './dietary-alert-actions'

// Dietary dashboard ('use server')
export {
  getClientDietaryProfile,
  updateClientDietary,
  getHouseholdAllergenMatrix,
} from './dietary-dashboard-actions'
export type {
  GuestDietary,
  HouseholdSummary,
  RecentEventDietary,
  ClientDietaryProfile,
  AllergenMatrixEntry,
} from './dietary-dashboard-actions'

// Lifetime value ('use server')
export {
  getClientLifetimeValue,
  getTopClientsByRevenue,
  getClientRetentionMetrics,
} from './lifetime-value-actions'
export type {
  ClientLifetimeValue,
  TopClientByRevenue,
  ClientRetentionMetrics,
} from './lifetime-value-actions'

// Lifetime value constants
export { getClientTier, TIER_CONFIG } from './lifetime-value-constants'

// LTV trajectory ('use server')
export { getClientLTVTrajectory } from './ltv-trajectory'
export type { LTVDataPoint, ClientLTVTrajectory } from './ltv-trajectory'

// Profitability ('use server')
export { getClientProfitabilityHistory } from './profitability'
export type { ClientProfitabilityHistory } from './profitability'

// Spending ('use server')
export { getClientSpendingSummary } from './spending-actions'
export type { SpendingEvent, SpendingSummary } from './spending-actions'

// Referrals ('use server')
export {
  addReferral,
  updateReferralStatus,
  deleteReferral,
  getClientReferrals,
  getReferralDashboard,
  getReferralSources,
} from './referral-actions'
export type { ReferralStatus, Referral, ReferralDashboard } from './referral-actions'

// Referral health ('use server')
export { getReferralHealthData } from './referral-health-actions'

// Referral health core
export { computeReferralHealth } from './referral-health'
export type { ReferralHealthScore } from './referral-health'

// Referral tree ('use server')
export { getClientReferralTree } from './referral-tree'
export type { ReferralNode } from './referral-tree'

// Loyalty program
export {
  getClientLoyaltySummary,
  getLoyaltyRewardCatalog,
  awardClientLoyaltyBonus,
  redeemClientLoyaltyReward,
} from './loyalty-program'

// Milestones ('use server')
export {
  updateClientMilestones,
  getUpcomingMilestones,
  getMilestoneOutreachSuggestions,
  updateClientPersonalInfo,
} from './milestones'
export type { MilestoneType, Milestone, UpcomingMilestone, OutreachSuggestion } from './milestones'

// Birthday alerts ('use server')
export { getUpcomingMilestones as getUpcomingBirthdayMilestones } from './birthday-alerts'

// Reminders ('use server')
export {
  updateClientDates,
  getClientDateInfo,
  getUpcomingReminders,
  detectAnniversaries,
  getReminderSummary,
} from './reminder-actions'
export type {
  ImportantDate,
  ClientDateInfo,
  UpcomingReminder,
  ReminderSummary,
} from './reminder-actions'

// Touchpoints ('use server')
export {
  getTouchpointRules,
  createTouchpointRule,
  updateTouchpointRule,
  deleteTouchpointRule,
  getUpcomingTouchpoints,
} from './touchpoint-actions'
export type { TouchpointRuleType, TouchpointRule, UpcomingTouchpoint } from './touchpoint-actions'

// Gifting ('use server')
export {
  getGiftLog,
  addGiftEntry,
  deleteGiftEntry,
  getFollowUpRules,
  upsertFollowUpRule,
  deleteFollowUpRule,
  getGiftSuggestions,
  getGiftingStats,
} from './gifting-actions'
export type {
  GiftType,
  DeliveryMethod,
  TriggerType,
  RuleAction,
  GiftEntry,
  FollowUpRule,
  GiftSuggestion,
} from './gifting-actions'

// NDA ('use server')
export { updateNDA, getNDAStatus, getClientsRequiringNDA } from './nda-actions'
export type { NDAUpdateInput, NDAStatus } from './nda-actions'

// NDA management ('use server')
export {
  createNdaRecord,
  updateNdaRecord,
  deleteNdaRecord,
  getClientNdaRecords,
  getExpiringNdaRecords,
  getNdaDashboard,
  markNdaRecordSigned,
} from './nda-management-actions'
export type {
  NdaType,
  NdaStatus,
  NdaRow,
  NdaCreateInput,
  NdaUpdateInput,
  NdaDashboardSummary,
} from './nda-management-actions'

// Onboarding ('use server')
export { generateOnboardingLink, submitOnboarding } from './onboarding-actions'

// Onboarding tokens
export { generateOnboardingToken, verifyOnboardingToken } from './onboarding-tokens'

// Onboarding data
export { getOnboardingData } from './onboarding'

// Import ('use server')
export { importClientDirect, getImportedClients } from './import-actions'
export type { ImportClientInput } from './import-actions'

// Intake forms ('use server')
export {
  createIntakeForm,
  getIntakeForms,
  getIntakeForm,
  updateIntakeForm,
  deleteIntakeForm,
  createIntakeShare,
  getIntakeShares,
  getShareByToken,
  submitIntakeResponse,
  getIntakeResponses,
  applyResponseToClient,
  createDefaultForms,
} from './intake-actions'
export type { IntakeFormField } from './intake-actions'

// Client history
export { getClientHistory, addClientHistoryEntry } from './client-history'
export type { ClientHistoryEntry } from './client-history'

// Menu history ('use server')
export { getClientMenuHistory } from './menu-history'
export type {
  DishHistory,
  MenuHistoryEntry,
  ComponentFrequency,
  ClientMenuHistory,
} from './menu-history'

// Dormancy ('use server')
export { getDormantClients } from './dormancy'
export type { DormantClientEntry } from './dormancy'

// Cooling actions ('use server')
export { getCoolingClients, markIntentionallyInactive } from './cooling-actions'

// Cooling alert
export { findCoolingClients } from './cooling-alert'
export type { CoolingClient } from './cooling-alert'

// Cross-platform matching ('use server')
export { findPotentialClientMatches, mergeClients } from './cross-platform-matching'
export type { ClientMatch } from './cross-platform-matching'

// Deduplication ('use server')
export { findDuplicateClients } from './deduplication'
export type { DuplicatePair } from './deduplication'

// Passport ('use server')
export { getClientPassport, upsertClientPassport, deleteClientPassport } from './passport-actions'

// Payment plans ('use server')
export { getPaymentPlan, calculateInstallments } from './payment-plan-actions'
export type { Installment, PaymentPlanOption, EventPaymentPlan } from './payment-plan-actions'

// Photos ('use server')
export {
  uploadClientPhoto,
  getClientPhotos,
  deleteClientPhoto,
  updateClientPhotoCaption,
  updateClientPhotoCategory,
} from './photo-actions'

// Photo constants
export { PHOTO_CATEGORIES } from './photo-constants'
export type { PhotoCategory, ClientPhoto } from './photo-constants'

// Pulse ('use server')
export { getClientPulse } from './pulse-actions'
export type { PulseItem, ClientPulse } from './pulse-actions'

// Account deletion ('use server')
export {
  getClientDeletionStatus,
  requestClientAccountDeletion,
  cancelClientAccountDeletion,
  exportClientData,
} from './account-deletion-actions'
export type { ClientDeletionStatus } from './account-deletion-actions'

// Cannabis ('use server')
export { clientHasCannabisAccess, getClientCannabisEvents } from './cannabis-client-actions'

// Kitchen inventory ('use server')
export {
  getClientKitchenInventory,
  addKitchenItem,
  updateKitchenItem,
  deleteKitchenItem,
  getChefEquipment,
  addChefEquipment,
  updateChefEquipment,
  deleteChefEquipment,
  generatePackingList,
  applyKitchenTemplate,
} from './kitchen-inventory-actions'
export type {
  KitchenCategory,
  KitchenCondition,
  KitchenItem,
  ChefEquipmentItem,
  PackingListItem,
} from './kitchen-inventory-actions'

// Fun QA constants
export { FUN_QA_QUESTIONS } from './fun-qa-constants'
export type { FunQAKey, FunQAAnswers } from './fun-qa-constants'
