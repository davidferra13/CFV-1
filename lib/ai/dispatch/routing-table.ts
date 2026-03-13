// AI Dispatch Layer - Canonical Routing Table
// No 'use server' - pure configuration, importable anywhere.
//
// THIS FILE IS THE SINGLE SOURCE OF TRUTH for which model handles which task.
// All routing decisions flow through this table. No ad-hoc model selection
// elsewhere in the codebase. If a task needs a different model, change THIS file.
//
// HARD_FAIL means: throw a user-visible error. No fallback. No cloud for private data.
// 'developer' escalation means: the system cannot resolve this automatically.
//
// Provider priority (free first, paid last):
//   Groq > Cerebras > SambaNova > Workers AI > GitHub Models > Mistral > Gemini > OpenAI
//   (All free-tier cloud providers before any paid providers)

import type { TaskClass, RoutingChain } from './types'

/**
 * The canonical routing table.
 *
 * For each task class, defines the exact fallback chain:
 *   primary -> secondary -> fallback -> escalation
 *
 * Rules enforced by this table:
 * - PRIVATE_PARSE and MECHANICAL_PRIVATE never have cloud providers in the chain
 * - DETERMINISTIC has 'none' as primary (no LLM invoked)
 * - ESCALATION and ORCHESTRATION are reserved for top-tier models only
 * - Every chain terminates in either HARD_FAIL or 'developer'
 */
export const ROUTING_TABLE: Record<TaskClass, RoutingChain> = {
  // ── No LLM needed ──
  DETERMINISTIC: {
    primary: 'none',
    secondary: null,
    fallback: null,
    escalation: 'developer',
  },

  // ── Structured extraction (cloud-safe data) ──
  // Fastest free providers first
  MECHANICAL_SAFE: {
    primary: 'groq',
    secondary: 'cerebras',
    fallback: 'sambanova',
    escalation: 'developer',
  },

  // ── Structured extraction (private data - LOCAL ONLY) ──
  MECHANICAL_PRIVATE: {
    primary: 'ollama-fast',
    secondary: 'ollama-standard',
    fallback: 'HARD_FAIL',
    escalation: 'HARD_FAIL', // NEVER cloud. Hard fail.
  },

  // ── Code writing/modification (developer-agent domain) ──
  // Codestral is specialized for code, then GitHub Models, then Groq
  IMPLEMENTATION: {
    primary: 'codestral',
    secondary: 'github-models',
    fallback: 'groq',
    escalation: 'developer',
  },

  // ── Code review (developer-agent domain, high-tier) ──
  REVIEW: {
    primary: 'github-models',
    secondary: 'mistral',
    fallback: 'groq',
    escalation: 'developer',
  },

  // ── Research / exploration (developer-agent domain) ──
  RESEARCH: {
    primary: 'groq',
    secondary: 'cerebras',
    fallback: 'github-models',
    escalation: 'developer',
  },

  // ── Private data parsing (LOCAL ONLY - the hard privacy boundary) ──
  PRIVATE_PARSE: {
    primary: 'ollama-fast',
    secondary: 'ollama-standard',
    fallback: 'HARD_FAIL',
    escalation: 'HARD_FAIL', // NEVER cloud. Hard fail.
  },

  // ── Public content generation (culinary domain, no PII) ──
  // Gemini is strong at domain content, Mistral as secondary
  PUBLIC_GENERATE_FOOD: {
    primary: 'gemini',
    secondary: 'mistral',
    fallback: 'groq',
    escalation: 'developer',
  },

  // ── Public content generation (code/docs, no PII) ──
  // Codestral for code, GitHub Models as secondary
  PUBLIC_GENERATE_CODE: {
    primary: 'codestral',
    secondary: 'github-models',
    fallback: 'groq',
    escalation: 'developer',
  },

  // ── Ambiguous / contested tasks (top-tier only) ──
  ESCALATION: {
    primary: 'groq',
    secondary: 'cerebras',
    fallback: null,
    escalation: 'developer',
  },

  // ── Routing / coordination (top-tier only) ──
  ORCHESTRATION: {
    primary: 'groq',
    secondary: 'cerebras',
    fallback: null,
    escalation: 'developer',
  },
}

/**
 * Look up the routing chain for a task class.
 * Returns the chain or throws if the task class is unknown (should never happen
 * since TaskClass is a union type, but defense in depth).
 */
export function getRoutingChain(taskClass: TaskClass): RoutingChain {
  const chain = ROUTING_TABLE[taskClass]
  if (!chain) {
    throw new Error(`[dispatch] Unknown task class: ${taskClass}. This is a bug in the classifier.`)
  }
  return chain
}

/**
 * Returns true if a task class is private (can never route to cloud).
 * Used by the router as a safety check.
 */
export function isPrivateTaskClass(taskClass: TaskClass): boolean {
  return taskClass === 'PRIVATE_PARSE' || taskClass === 'MECHANICAL_PRIVATE'
}

/**
 * Returns all providers that appear in the routing table for a given task class.
 * Useful for pre-flight availability checks.
 */
export function getProvidersForTask(taskClass: TaskClass): string[] {
  const chain = getRoutingChain(taskClass)
  const providers: string[] = []
  if (chain.primary !== 'none' && chain.primary !== 'HARD_FAIL') providers.push(chain.primary)
  if (chain.secondary && chain.secondary !== 'HARD_FAIL') providers.push(chain.secondary)
  if (chain.fallback && chain.fallback !== 'HARD_FAIL') providers.push(chain.fallback)
  return providers
}
