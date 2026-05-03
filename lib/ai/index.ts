// AI module - public API
// Note: This barrel covers the top ~20 consumer-facing files.
// Internal implementation files (remy-*, parse-*, individual generators) are imported directly.

// Providers and configuration
export { isOllamaEnabled, getOllamaConfig, getOllamaModel, getModelForEndpoint } from './providers'
export type { AIProvider, ModelTier, OllamaConfig } from './providers'

// Local AI provider
export {
  resolveEffectiveOllamaUrl,
  resolveOllamaApiUrl,
  pickOllamaModelVariant,
  OllamaLocalProvider,
} from './local-ai-provider'
export type { LocalAIProvider } from './local-ai-provider'

// LLM router
export {
  getEndpoints,
  routeTask,
  routeForRemy,
  forceHealthCheck,
  isAnyEndpointHealthy,
} from './llm-router'
export type { OllamaEndpoint, RouteTaskHints } from './llm-router'

// Runtime provider policy
export {
  getRuntimeProviderPolicy,
  isCloudRuntime,
  getAiUnavailableMessage,
} from './runtime-provider-policy'
export type {
  RuntimeMode,
  PrimaryProvider,
  RuntimeEndpointSummary,
  RuntimeProviderPolicy,
} from './runtime-provider-policy'

// Ollama health
export { checkOllamaHealth } from './ollama-health'
export type { OllamaHealthStatus } from './ollama-health'

// Ollama cache
export { getCachedResult, setCachedResult, getCacheStats } from './ollama-cache'

// Ollama errors
export { OllamaOfflineError, getOllamaErrorHelp } from './ollama-errors'
export type { OllamaErrorCode } from './ollama-errors'

// AI fallback wrapper
export { withAiFallback, formulaOnly } from './with-ai-fallback'
export type { FallbackResult } from './with-ai-fallback'

// Parse utilities
export { isAIConfigured } from './parse'
export type { Confidence, ParseResult } from './parse'

// Agent registry
export {
  registerAgentAction,
  registerAgentActions,
  getAgentAction,
  isAgentAction,
  listAgentActions,
  buildAgentTaskListForPrompt,
} from './agent-registry'
export type { AgentActionContext, AgentActionDefinition } from './agent-registry'

// Command types
export type {
  ApprovalTier,
  TaskStatus,
  PlannedTask,
  CommandPlan,
  TaskResult,
  CommandRun,
  AgentSafetyLevel,
  AgentActionField,
  AgentActionPreview,
} from './command-types'

// Command orchestrator ('use server')
export { runCommand, approveTask } from './command-orchestrator'

// AI metrics
export {
  incrementAiMetric,
  recordAiLatency,
  recordAiTier,
  resetAiMetrics,
  getAiMetrics,
} from './ai-metrics'

// Remy types
export type {
  RemyMessage,
  RemyResponse,
  RemyContext,
  PageEntityContext,
  NavigationSuggestion,
  RemyTaskResult,
  MessageIntent,
  RemyMemoryItem,
  SearchResult,
  ActionLogEntry,
} from './remy-types'

// Remy actions ('use server')
export { sendRemyMessage } from './remy-actions'

// Remy context ('use server')
export { invalidateRemyContextCache, loadRemyContext, resolveMessageEntities } from './remy-context'

// Remy guardrails
export {
  REMY_MAX_MESSAGE_LENGTH,
  REMY_MAX_MEMORY_LENGTH,
  REMY_RATE_LIMIT_MAX,
  REMY_RATE_LIMIT_WINDOW_MS,
  validateRemyInput,
  validateMemoryContent,
  checkRemyRateLimit,
} from './remy-guardrails'
export type { GuardrailResult } from './remy-guardrails'

// Remy personality
export {
  REMY_PERSONALITY,
  REMY_DRAFT_INSTRUCTIONS,
  REMY_PRIVACY_NOTE,
  REMY_SPEED_EXPLANATION,
  REMY_TOPIC_GUARDRAILS,
  REMY_FEW_SHOT_EXAMPLES,
  REMY_ANTI_INJECTION,
} from './remy-personality'

// Remy stream parser
export { parseRemyStream } from './remy-stream-parser'
export type { StreamCallbacks, StreamResult } from './remy-stream-parser'

// Remy memory types
export type { MemoryCategory, RemyMemorySource, RemyMemory } from './remy-memory-types'

// Import actions ('use server')
export {
  checkClientDuplicates,
  importClient,
  importClients,
  importRecipe,
  importBrainDump,
} from './import-actions'
export type { DuplicateCheckResult, BrainDumpImportResult } from './import-actions'

// Draft actions ('use server')
export {
  generateThankYouDraft,
  generateReferralRequestDraft,
  generateTestimonialRequestDraft,
  generateQuoteCoverLetterDraft,
  generateDeclineResponseDraft,
  generateCancellationResponseDraft,
  generatePaymentReminderDraft,
  generateReEngagementDraft,
  generateMilestoneRecognitionDraft,
  generateFoodSafetyIncidentDraft,
  generateConfirmationDraft,
  handleDraftTask,
} from './draft-actions'
export type { DraftResult } from './draft-actions'

// Privacy actions ('use server')
export {
  getAiPreferences,
  getAiDataSummary,
  saveAiPreferences,
  completeOnboarding,
  disableRemy,
  saveRemyArchetype,
  getRemyArchetype,
  deleteAllConversations,
  deleteAllMemories,
  deleteAllArtifacts,
  getLocalAiPreferences,
  saveLocalAiPreferences,
  markLocalAiVerified,
  deleteAllAiData,
} from './privacy-actions'
export type { AiPreferences, AiDataSummary, LocalAiPreferences } from './privacy-actions'

// Prep timeline types
export type { PrepStep, PrepTimeline } from './prep-timeline-types'

// Dietary check types
export type { DietaryFlag, DietaryCheckResult } from './dietary-check-types'

// Document management types
export type { ChefFolder, ChefDocument } from './document-management-types'
