// Events module - public API

// Core CRUD actions ('use server')
export {
  findDuplicateEventCandidates,
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  restoreEvent,
  getEventClosureStatus,
  markResetComplete,
  markFollowUpSent,
  getEventsNeedingClosure,
  startEventActivity,
  stopEventActivity,
  updateEventTimeAndCard,
  logCharityHours,
  setEventFoodCostBudget,
} from './actions'
export type {
  CreateEventInput,
  UpdateEventInput,
  LogCharityHoursInput,
  DuplicateEventCandidate,
  EventClosureStatus,
} from './actions'

// FSM (state machine)
export {
  ALL_EVENT_STATUSES,
  TERMINAL_STATES,
  TRANSITION_RULES,
  TRANSITION_PERMISSIONS,
  isValidTransition,
  getAllowedTransitions,
  isActorPermitted,
  validateTransition,
  isTerminalState,
} from './fsm'
export type { EventStatus, TransitionActor } from './fsm'

// Transitions ('use server')
export {
  transitionEvent,
  proposeEvent,
  acceptProposal,
  confirmEvent,
  startEvent,
  completeEvent,
  cancelEvent,
  acceptOnBehalf,
  markEventPaid,
} from './transitions'

// Readiness ('use server')
export {
  computeEventReadiness,
  evaluateReadinessForTransition,
  evaluateReadinessForDocumentGeneration,
  overrideGate,
  overrideReadinessForTransition,
  getEventReadiness,
  getClientAllergyRecords,
  confirmAllergyRecord,
  dismissAllergyRecord,
  addAllergyRecord,
  checkMenuAllergyConflicts,
} from './readiness'
export type {
  ReadinessGate,
  GateStatus,
  ReadinessTargetStatus,
  GateResult,
  ReadinessResult,
} from './readiness'

// Event readiness assistant
export {
  summarizeEventReadinessAssistant,
  filterDismissedEventReadinessSuggestions,
  evaluateEventReadinessAssistant,
} from './event-readiness-assistant'
export type {
  EventReadinessMode,
  EventReadinessStatus,
  EventReadinessCheckStatus,
  EventReadinessSeverity,
  EventReadinessSuggestionType,
  EventReadinessCheck,
  EventReadinessSuggestion,
  EventReadinessAssistantResult,
  EventReadinessAssistantInput,
} from './event-readiness-assistant'

// Event readiness assistant actions ('use server')
export {
  getEventReadinessAssistant,
  updateEventReadinessAssistantSettings,
  dismissEventReadinessSuggestion,
  resetEventReadinessDismissals,
} from './event-readiness-assistant-actions'

// Operating spine
export {
  getEventMissingDetails,
  buildChefEventOperatingSpine,
  buildClientEventProgress,
} from './operating-spine'
export type {
  EventSpineSeverity,
  EventSpineLane,
  EventSpineAction,
  EventOperatingSpine,
} from './operating-spine'

// Journey steps
export { buildJourneySteps, getCurrentJourneyAction } from './journey-steps'
export type { JourneyStep, JourneyAction, JourneyStepInput } from './journey-steps'

// Default behaviors
export { buildEventDefaultLayer } from './default-behaviors'
export type {
  EventDefaultSeverity,
  EventDefaultNudge,
  EventRolePrompt,
  EventShareSnippets,
  EventExpectationDetail,
  EventDefaultLayerResult,
  EventDefaultLayerInput,
} from './default-behaviors'

// Default event flow
export {
  estimateSafeCapacity,
  buildPricingGuidance,
  evaluatePrePublishReadiness,
  buildEventDefaultFlowSnapshot,
} from './default-event-flow'
export type {
  DefaultFlowStatus,
  DefaultFlowRisk,
  DefaultFlowIssue,
  SimilarEventPricingSignal,
  EventDefaultFlowInput,
  EventDefaultFlowSnapshot,
} from './default-event-flow'

// Default event flow data ('use server')
export { getEventDefaultFlowSnapshotForTenant } from './default-event-flow-data'

// Cancellation ('use server')
export {
  getCancellationPolicy,
  updateCancellationPolicy,
  calculateCancellationFee,
  getEventCancellationPreview,
  getCancellationHistory,
} from './cancellation-actions'
export type {
  CancellationTier,
  CancellationPolicy,
  CancellationPreview,
  CancellationHistoryEntry,
} from './cancellation-actions'

// Clone ('use server')
export { cloneEvent } from './clone-actions'
export type { CloneEventResult } from './clone-actions'

// Bulk actions ('use server')
export { bulkArchiveEvents, bulkDeleteDraftEvents } from './bulk-actions'

// Client-facing event actions ('use server')
export {
  getClientEvents,
  getClientEventById,
  acceptEventProposal,
  cancelEventAsClient,
  requestCancellationViaChat,
  requestGuestCountUpdate,
} from './client-actions'

// Collaborators ('use server')
export {
  getEventCollaborators,
  addCollaborator,
  updateCollaborator,
  removeCollaborator,
  getCollaboratorSummary,
} from './collaborator-actions'
export type {
  Collaborator,
  AddCollaboratorInput,
  UpdateCollaboratorInput,
  CollaboratorSummary,
} from './collaborator-actions'

// Contacts ('use server')
export {
  getEventContacts,
  addEventContact,
  updateEventContact,
  removeEventContact,
} from './contacts'
export type { EventContact } from './contacts'

// Financial summary ('use server')
export {
  getEventFinancialSummaryFull,
  markFinancialClosed,
  recordTip,
  getEventCloseOutData,
  updateMileage,
} from './financial-summary-actions'
export type { EventFinancialSummaryData, CloseOutData } from './financial-summary-actions'

// Invoice ('use server')
export {
  generateInvoiceNumber,
  assignInvoiceNumber,
  getInvoiceData,
  getInvoiceDataByTenant,
  getInvoiceDataForClient,
} from './invoice-actions'
export type { InvoicePaymentEntry, InvoiceData } from './invoice-actions'

// Offline payments ('use server')
export {
  getEventLedgerEntries,
  recordOfflinePayment,
  voidOfflinePayment,
} from './offline-payment-actions'
export type { RecordOfflinePaymentInput, VoidOfflinePaymentInput } from './offline-payment-actions'

// Menu approval ('use server')
export {
  validateMenuForSend,
  sendMenuForApproval,
  getMenuApprovalStatus,
  approveMenu,
  requestMenuRevision,
  getClientMenuApprovalRequest,
} from './menu-approval-actions'
export type { RequestRevisionInput, MenuSendValidation } from './menu-approval-actions'

// Photos ('use server')
export {
  uploadEventPhoto,
  getEventPhotosForChef,
  getEventPhotosForClient,
  deleteEventPhoto,
  updatePhotoCaption,
  getPortfolioPhotos,
  getPhotoSignedUrl,
  reorderEventPhotos,
  updatePhotoDetails,
  togglePortfolio,
  getPublicPortfolio,
} from './photo-actions'
export type { PhotoType, EventPhoto, PortfolioPhoto, PublicPortfolioPhoto } from './photo-actions'

// Photo tagging ('use server')
export { suggestPhotoTags, confirmPhotoTag } from './photo-tagging-actions'
export type { PhotoTagSuggestion, ConfirmedPhotoTag } from './photo-tagging-actions'

// Labels ('use server')
export { getEventLabels, upsertEventLabel, resetEventLabel } from './label-actions'
export type { EventLabelType, ChefEventTypeLabel } from './label-actions'

// Label utilities
export { DEFAULT_OCCASION_TYPES, DEFAULT_STATUS_LABELS, buildLabelMap } from './label-utils'

// Conflict detection
export { detectEventConflicts } from './conflict-detection'
export type { EventConflict } from './conflict-detection'

// Constraint radar ('use server')
export { getEventConstraintRadar } from './constraint-radar-actions'
export type { ConstraintRadarData } from './constraint-radar-actions'

// Constraint collisions
export { detectConstraintCollisions } from './constraint-collisions'
export type { CollisionAlert } from './constraint-collisions'

// Scope drift
export { detectScopeDrift } from './scope-drift'
export type { ScopeDriftChange, ScopeDriftResult } from './scope-drift'

// Scope drift actions ('use server')
export { acknowledgeScopeDrift, getConvertingQuote } from './scope-drift-actions'

// Carry forward ('use server')
export { getAvailableCarryForwardItems } from './carry-forward'
export type { CarryForwardItem } from './carry-forward'

// Countdown ('use server')
export { getEventCountdown, toggleCountdown, getUpcomingCountdowns } from './countdown-actions'
export type { EventCountdown } from './countdown-actions'

// Prep timeline ('use server')
export { generatePrepTimeline, generatePrepTimelinePdf } from './prep-timeline'
export type { PrepTask, PrepTimeline } from './prep-timeline'

// Prep timeline constants
export { CATEGORY_LABELS } from './prep-timeline-constants'
export type { PrepCategory } from './prep-timeline-constants'

// Production report ('use server')
export { generateProductionReport, generateProductionReportPdf } from './production-report-actions'
export type {
  ScaledIngredient,
  ReportComponent,
  ReportDish,
  ReportCourse,
  ProductionReport,
} from './production-report-actions'

// Production report PDF
export { buildProductionReportPdf } from './production-report-pdf'

// Fire order
export type { CourseType, FireOrderCourse, FireOrderResult, StationType } from './fire-order'

// Fire order constants
export { COURSE_COLORS, COURSE_ORDER, STATION_LABELS } from './fire-order-constants'

// Time tracking
export {
  EVENT_TIME_ACTIVITY_TYPES,
  EVENT_TIME_ACTIVITY_CONFIG,
  getEventActivityLabel,
  safeDurationMinutes,
  formatMinutesAsDuration,
} from './time-tracking'
export type { EventTimeActivityType } from './time-tracking'

// Time truth
export { normalizeEventTimeTruthValue, normalizeEventTimezoneTruthValue } from './time-truth'

// Time reminders
export { runTimeTrackingReminderSweep } from './time-reminders'

// Location truth
export {
  normalizeLocationTruthValue,
  hasMeaningfulLocationTruth,
  formatMeaningfulLocationTruth,
} from './location-truth'

// Dietary conflicts
export {
  generateAndPersistDietaryAlerts,
  acknowledgeDietaryConflict,
  getDietaryConflicts,
} from './dietary-conflict-actions'
export type { DietaryConflictSeverity, DietaryConflict } from './dietary-conflict-actions'

// Debrief ('use server')
export {
  getEventDebriefBlanks,
  saveClientInsights,
  saveRecipeDebrief,
  saveDebriefReflection,
  completeDebrief,
  generateDebriefDraft,
} from './debrief-actions'
export type { DebriefRecipeBlank, DebriefClientBlanks, DebriefBlanks } from './debrief-actions'

// Post-event learning ('use server')
export {
  ensureEventOutcomeSeedByTenant,
  getEventDishFeedbackChoicesByTenant,
  refreshEventOutcomeLearningByTenant,
  getEventOutcomeCapture,
  getEventOutcomeSummary,
  saveChefOutcomeCapture,
} from './post-event-learning-actions'
export type {
  ChefOutcomeDishInput,
  SaveChefOutcomeCaptureInput,
  EventOutcomeCaptureDish,
  EventDishFeedbackChoice,
  EventOutcomeCaptureData,
  EventOutcomeSummary,
} from './post-event-learning-actions'

// Post-event learning logic
export {
  LEARNING_PREP_ACCURACY_VALUES,
  LEARNING_TIME_ACCURACY_VALUES,
  LEARNING_DISH_OUTCOME_STATUS_VALUES,
  LEARNING_DISH_SENTIMENT_VALUES,
  LEARNING_ISSUE_FLAGS,
  normalizeLearningDishName,
  computeEventSuccessScore,
  computeEventOutcomeMetrics,
  computeDishPerformanceMemory,
  buildChefLearningInsights,
  resolveDishSentiment,
} from './post-event-learning-logic'
export type {
  LearningPrepAccuracy,
  LearningTimeAccuracy,
  LearningDishOutcomeStatus,
  LearningDishSentiment,
  LearningIssueFlag,
  EventOutcomeMetricDishInput,
  EventOutcomeMetricInput,
  EventOutcomeMetrics,
  DishMemoryRecord,
  DishPerformanceMemory,
  MenuStructurePattern,
} from './post-event-learning-logic'

// Post-event trust loop ('use server')
export {
  ensurePostEventSurveyForEvent,
  sendPostEventSurveyForEvent,
  sendChefManagedPostEventSurvey,
  getPostEventSurveyPageData,
  submitPostEventSurveyResponse,
  getChefTrustLoopSurveys,
  getEventPostEventSurvey,
  getEventTrustLoopState,
  getRecentPostEventSurveys,
  markSurveyReviewRequestSent,
} from './post-event-trust-loop-actions'
export type {
  PostEventSurveyPageData,
  CanonicalChefSurveyRow,
  EventTrustLoopState,
  SubmitPostEventSurveyInput,
} from './post-event-trust-loop-actions'

// Post-event trust loop helpers
export {
  isPositiveSurveyRating,
  normalizePublicReviewText,
  shouldPromoteSurveyToPublicReview,
  getReviewRequestGate,
  booleanToLegacyWouldBookAgain,
} from './post-event-trust-loop-helpers'
export type {
  ReviewRequestGateInput,
  ReviewRequestGateResult,
} from './post-event-trust-loop-helpers'

// AAR prompts ('use server')
export { getEventsNeedingAAR } from './aar-prompt-actions'
export type { EventNeedingAAR } from './aar-prompt-actions'

// Alcohol log ('use server')
export {
  getOrCreateAlcoholLog,
  addAlcoholLogEntry,
  setLastCall,
  updateLogNotes,
} from './alcohol-log-actions'

// Ambiance ('use server')
export { getEventAmbiance, updateEventAmbiance } from './ambiance-actions'
export type { AmbianceInput } from './ambiance-actions'

// Cross-contamination ('use server')
export {
  getOrCreateCrossContaminationChecklist,
  toggleCrossContaminationItem,
} from './cross-contamination-actions'

// Equipment checklist ('use server')
export { saveEquipmentChecklist, getEquipmentChecklist } from './equipment-checklist-actions'
export type { EquipmentItem } from './equipment-checklist-actions'

// Geocoding ('use server')
export { geocodeEventAddress } from './geocoding-actions'

// Historical import
export {
  importHistoricalEvent,
  importHistoricalEvents,
  getClientsForHistoricalImport,
} from './historical-import-actions'
export type { HistoricalEventInput, HistoricalEventResult } from './historical-import-actions'

// Ops hub ('use server')
export { getEventOpsHub } from './ops-hub-actions'
export type { OpsHubData } from './ops-hub-actions'

// Parse event from text
export { parseEventFromText } from './parse-event-from-text'
export type { ParsedEventDraft } from './parse-event-from-text'

// Pre-event checklist ('use server')
export {
  confirmPreEventChecklist,
  updateClientJourneyNote,
  getPreEventChecklistData,
} from './pre-event-checklist-actions'

// Pre-service checklist ('use server')
export { generatePreServiceChecklist } from './generate-pre-service-checklist'
export type { ChecklistItem, PreServiceChecklist } from './generate-pre-service-checklist'

// Safety checklist ('use server')
export {
  getOrCreateSafetyChecklist,
  toggleSafetyItem,
  completeSafetyChecklist,
} from './safety-checklist-actions'

// Served dish variance ('use server')
export { getServedDishVariance } from './served-dish-variance'
export type { DishItem, DishSubstitution, ServedDishVarianceResult } from './served-dish-variance'

// Stubs ('use server')
export {
  createEventStub,
  getEventStub,
  getProfileEventStubs,
  updateEventStub,
  seekChef,
  adoptEventStub,
} from './stub-actions'

// Travel ingredients ('use server')
export { getTravelLegIngredients } from './travel-ingredients-actions'
export type {
  TravelIngredientItem,
  TravelLegWithSourcedIngredients,
  TravelIngredientsResult,
} from './travel-ingredients-actions'

// Waste tracking ('use server')
export {
  addWasteEntry,
  getEventWaste,
  updateWasteEntry,
  deleteWasteEntry,
  getWasteSummary,
  getWasteInsights,
} from './waste-tracking-actions'
export type {
  WasteCategory,
  WasteReason,
  WasteEntry,
  WasteEntryInput,
  WasteSummary,
  WasteInsight,
} from './waste-tracking-actions'
