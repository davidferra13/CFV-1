// AI Dispatch Layer - Shared Types
// No 'use server' - pure type definitions, importable anywhere.
//
// These types define the task classification, routing, and governance
// system for the multi-model AI stack. Every LLM call in the codebase
// should eventually flow through this dispatch layer.

import type { ModelTier } from '../providers'

// ============================================
// TASK CLASSES
// ============================================

/**
 * Every task entering the AI system is classified into exactly one class.
 * Classification is deterministic (no LLM). The dispatcher checks in order:
 *
 * 1. Does the task involve private data?        -> PRIVATE_PARSE (local only)
 * 2. Can deterministic code solve it?            -> DETERMINISTIC (no LLM)
 * 3. Is it structured extraction from known fmt? -> MECHANICAL
 * 4. Is it code writing/modification?            -> IMPLEMENTATION
 * 5. Is it code evaluation?                      -> REVIEW
 * 6. Is it information gathering?                -> RESEARCH
 * 7. Is it content generation, no private data?  -> PUBLIC_GENERATE
 * 8. Is it ambiguous or contested?               -> ESCALATION
 * 9. Is it about routing/coordination?           -> ORCHESTRATION
 */
export type TaskClass =
  | 'DETERMINISTIC' // Math, regex, SQL, conditional logic. No LLM needed.
  | 'MECHANICAL_SAFE' // Structured extraction from known formats (cloud-safe data)
  | 'MECHANICAL_PRIVATE' // Structured extraction from known formats (private data)
  | 'IMPLEMENTATION' // Writing or modifying code
  | 'REVIEW' // Evaluating code quality, security, architecture
  | 'RESEARCH' // Codebase exploration, documentation lookup
  | 'PRIVATE_PARSE' // Extracting/processing PII, financials, allergies, client data
  | 'PUBLIC_GENERATE_FOOD' // Culinary content generation (no private data)
  | 'PUBLIC_GENERATE_CODE' // Code/docs generation (no private data)
  | 'ESCALATION' // Ambiguous task, model disagreement, policy violation
  | 'ORCHESTRATION' // Task routing, agent coordination, priority decisions

// ============================================
// PRIVACY LEVELS
// ============================================

/**
 * Privacy classification for task payloads.
 * Determined by privacy-gate.ts before routing.
 */
export type PrivacyLevel =
  | 'LOCAL_ONLY' // Contains PII, financials, allergies, client data. Never leaves the machine.
  | 'CLOUD_SAFE' // Generic content, no private data. Any configured provider is acceptable.

/**
 * Categories of private data that force LOCAL_ONLY routing.
 * Used by privacy-gate.ts to scan payloads.
 */
export type PrivateDataCategory =
  | 'client_pii' // Names, emails, phone numbers, addresses
  | 'dietary_allergy' // Dietary restrictions, allergen lists, medical notes
  | 'financial' // Quotes, invoices, revenue, expenses, payment history
  | 'conversational' // Chat messages, inquiry content, client messages
  | 'business_data' // Pricing strategies, client lists, lead scores with names
  | 'contracts_legal' // Generated contracts, terms, client-specific agreements
  | 'staff_data' // Employee names, schedules, pay rates

// ============================================
// PROVIDERS
// ============================================

/**
 * All available AI providers in the system.
 * 'none' = deterministic code path (no LLM invoked).
 * 'HARD_FAIL' = task cannot be completed; throw a user-visible error.
 */
export type DispatchProvider =
  | 'none' // Deterministic - no LLM
  | 'ollama-fast' // Ollama local, fast tier (qwen3:4b)
  | 'ollama-standard' // Ollama local, standard tier (qwen3-coder:30b)
  | 'ollama-large' // Ollama local, complex tier (qwen3:30b)
  | 'groq' // Groq cloud (free, fast, non-private)
  | 'gemini' // Google Gemini (paid, non-private, culinary domain)
  | 'github-models' // GitHub Models (free, non-private, code-focused)
  | 'workers-ai' // Cloudflare Workers AI (edge, non-private)
  | 'cerebras' // Cerebras cloud (free, ~2000 tok/s, non-private)
  | 'mistral' // Mistral AI cloud (free tier, non-private)
  | 'codestral' // Codestral (Mistral code-specialized, non-private)
  | 'sambanova' // SambaNova cloud (free, fast Llama/DeepSeek, non-private)
  | 'openai' // OpenAI cloud (paid, non-private)
  | 'HARD_FAIL' // No fallback available - fail with user-visible error

/**
 * Maps DispatchProvider to the ModelTier used by providers.ts.
 */
export function providerToModelTier(provider: DispatchProvider): ModelTier | null {
  switch (provider) {
    case 'ollama-fast':
      return 'fast'
    case 'ollama-standard':
      return 'standard'
    case 'ollama-large':
      return 'complex'
    case 'groq':
      return 'fast'
    case 'gemini':
      return 'standard'
    case 'github-models':
      return 'standard'
    case 'workers-ai':
      return 'fast'
    case 'cerebras':
      return 'fast'
    case 'mistral':
      return 'standard'
    case 'codestral':
      return 'standard'
    case 'sambanova':
      return 'fast'
    case 'openai':
      return 'fast'
    case 'none':
      return null
    case 'HARD_FAIL':
      return null
  }
}

// ============================================
// ROUTING
// ============================================

/**
 * A routing chain defines the fallback order for a task class.
 * The dispatcher tries providers in order: primary -> secondary -> fallback -> escalation.
 *
 * HARD_FAIL means: throw a user-visible error. No degradation. No cloud for private data.
 */
export interface RoutingChain {
  primary: DispatchProvider
  secondary: DispatchProvider | null
  fallback: DispatchProvider | null
  escalation: DispatchProvider | 'developer'
}

// ============================================
// DISPATCH REQUEST / RESULT
// ============================================

/**
 * Domain separation: developer-agent vs application-runtime.
 * Different trust models, latency requirements, and failure modes.
 */
export type DispatchDomain = 'developer-agent' | 'runtime'

/**
 * A task submitted to the dispatch layer.
 */
export interface DispatchRequest {
  /** What kind of task this is (set by classifier or caller) */
  taskClass: TaskClass
  /** Which domain this task belongs to */
  domain: DispatchDomain
  /** Privacy level (set by privacy-gate or caller) */
  privacyLevel: PrivacyLevel
  /** The system prompt for the LLM */
  systemPrompt: string
  /** The user content / payload */
  userContent: string
  /** Optional: override the model tier for the selected provider */
  modelTier?: ModelTier
  /** Optional: caller can hint at the content type for better routing */
  contentHint?: string
}

/**
 * Result from the dispatch layer.
 */
export interface DispatchResult<T = unknown> {
  /** The parsed result */
  result: T
  /** Which provider actually handled the task */
  provider: DispatchProvider
  /** Which position in the chain handled it (0 = primary, 1 = secondary, etc.) */
  chainPosition: number
  /** Latency in milliseconds */
  latencyMs: number
  /** Whether any fallback was used */
  usedFallback: boolean
  /** If fallbacks were used, which providers failed and why */
  failureLog: ProviderFailure[]
}

/**
 * Logged when a provider fails and the chain moves to the next one.
 */
export interface ProviderFailure {
  provider: DispatchProvider
  error: string
  code: string
  latencyMs: number
}

// ============================================
// CLASSIFICATION INPUT
// ============================================

/**
 * Input to the task classifier.
 * The classifier uses these signals to deterministically assign a TaskClass.
 */
export interface ClassificationInput {
  /** Caller-declared domain */
  domain: DispatchDomain
  /** Short description of what the task does (e.g., "parse client dietary restrictions") */
  taskDescription: string
  /** Does the payload contain private data? (from privacy-gate) */
  privacyLevel: PrivacyLevel
  /** Optional: detected private data categories */
  privateDataCategories?: PrivateDataCategory[]
  /** Optional: can this task be solved deterministically? Caller asserts. */
  isDeterministic?: boolean
  /** Optional: content type hint */
  contentType?:
    | 'structured_extraction'
    | 'code'
    | 'review'
    | 'research'
    | 'generation'
    | 'conversation'
}
