// AI Dispatch Layer - Public API
// No 'use server' - re-exports from dispatch modules.
//
// Import from '@/lib/ai/dispatch' to access the dispatch system.
// All LLM calls should eventually flow through dispatch() or its wrappers.

// Types
export type {
  TaskClass,
  PrivacyLevel,
  PrivateDataCategory,
  DispatchProvider,
  RoutingChain,
  DispatchDomain,
  DispatchRequest,
  DispatchResult,
  ProviderFailure,
  ClassificationInput,
} from './types'
export { providerToModelTier } from './types'

// Classifier
export { classifyTask, quickClassify } from './classifier'

// Privacy Gate
export { scanPrivacy, isPrivatePayload, forceLocalOnly } from './privacy-gate'
export type { PrivacyGateResult } from './privacy-gate'

// Routing Table
export {
  ROUTING_TABLE,
  getRoutingChain,
  isPrivateTaskClass,
  getProvidersForTask,
} from './routing-table'

// Router (main entry point)
export { dispatch, dispatchPrivate, dispatchCloudSafe } from './router'
export type { DispatchOptions } from './router'

// Cost Tracker
export {
  recordDispatchEvent,
  getProviderStats,
  getTaskClassStats,
  getDispatchSummary,
  resetDispatchTracking,
  getDispatchEventCount,
} from './cost-tracker'
