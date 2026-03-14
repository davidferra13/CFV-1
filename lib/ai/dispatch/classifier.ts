// AI Dispatch Layer - Task Classifier
// No 'use server' - pure utility, importable anywhere server-side.
//
// Deterministic task classification. No LLM is used here.
// Maps every incoming task to exactly one TaskClass based on
// explicit signals from the caller and privacy gate.

import type { ClassificationInput, TaskClass } from './types'

/**
 * Classifies a task into exactly one TaskClass.
 *
 * The classification is fully deterministic (no LLM, no ambiguity).
 * It follows a strict priority order:
 *
 * 1. Caller asserts deterministic          -> DETERMINISTIC
 * 2. Privacy gate says LOCAL_ONLY          -> PRIVATE_PARSE or MECHANICAL_PRIVATE
 * 3. Content type + domain                 -> specific class
 * 4. Fallback: ESCALATION (ambiguous)
 *
 * The classifier never guesses. If it cannot determine the class
 * from the provided signals, it returns ESCALATION so a higher-tier
 * model can disambiguate.
 */
export function classifyTask(input: ClassificationInput): TaskClass {
  // ── Step 1: Deterministic tasks bypass everything ──
  if (input.isDeterministic) {
    return 'DETERMINISTIC'
  }

  // ── Step 2: Privacy forces local routing ──
  if (input.privacyLevel === 'LOCAL_ONLY') {
    // Structured extraction of private data vs general private parsing
    if (input.contentType === 'structured_extraction') {
      return 'MECHANICAL_PRIVATE'
    }
    return 'PRIVATE_PARSE'
  }

  // ── Step 3: Cloud-safe tasks, classified by content type ──
  if (input.contentType) {
    return classifyByContentType(input.contentType, input.domain)
  }

  // ── Step 4: Infer from task description keywords ──
  const inferred = inferFromDescription(input.taskDescription, input.domain)
  if (inferred) {
    return inferred
  }

  // ── Step 5: Cannot classify - escalate ──
  return 'ESCALATION'
}

/**
 * Maps content type + domain to a task class.
 * Only called for CLOUD_SAFE tasks (private tasks are handled above).
 */
function classifyByContentType(
  contentType: NonNullable<ClassificationInput['contentType']>,
  domain: ClassificationInput['domain']
): TaskClass {
  switch (contentType) {
    case 'structured_extraction':
      return 'MECHANICAL_SAFE'
    case 'code':
      return 'IMPLEMENTATION'
    case 'review':
      return 'REVIEW'
    case 'research':
      return 'RESEARCH'
    case 'generation':
      return domain === 'runtime' ? 'PUBLIC_GENERATE_FOOD' : 'PUBLIC_GENERATE_CODE'
    case 'conversation':
      // Cloud-safe conversation (no PII) - treat as generation
      return domain === 'runtime' ? 'PUBLIC_GENERATE_FOOD' : 'PUBLIC_GENERATE_CODE'
  }
}

// ── Keyword-based inference from task description ──

const KEYWORD_MAP: Array<{ pattern: RegExp; taskClass: TaskClass }> = [
  // Deterministic signals
  {
    pattern: /\b(calculate|compute|formula|math|sum|average|percentage|count)\b/i,
    taskClass: 'DETERMINISTIC',
  },
  {
    pattern: /\b(regex|pattern match|lookup table|conditional|if.then)\b/i,
    taskClass: 'DETERMINISTIC',
  },

  // Mechanical / extraction
  {
    pattern: /\b(extract|parse|classify|categorize|tag|label|detect|identify)\b/i,
    taskClass: 'MECHANICAL_SAFE',
  },
  {
    pattern: /\b(structured|json|csv|format|transform|normalize)\b/i,
    taskClass: 'MECHANICAL_SAFE',
  },

  // Implementation
  {
    pattern: /\b(implement|build|create|write|add|refactor|modify|update|fix|patch)\b/i,
    taskClass: 'IMPLEMENTATION',
  },
  {
    pattern: /\b(component|function|endpoint|migration|route|handler|middleware)\b/i,
    taskClass: 'IMPLEMENTATION',
  },

  // Review
  {
    pattern: /\b(review|audit|evaluate|assess|check quality|security review|code review)\b/i,
    taskClass: 'REVIEW',
  },

  // Research
  {
    pattern: /\b(search|find|explore|investigate|look up|documentation|how does)\b/i,
    taskClass: 'RESEARCH',
  },

  // Generation (culinary domain)
  {
    pattern: /\b(technique|culinary|kitchen spec|menu template|cooking method|cuisine)\b/i,
    taskClass: 'PUBLIC_GENERATE_FOOD',
  },
  {
    pattern: /\b(campaign theme|occasion|generic template|marketing copy)\b/i,
    taskClass: 'PUBLIC_GENERATE_FOOD',
  },

  // Generation (code/docs)
  {
    pattern: /\b(documentation|readme|changelog|pr description|commit message|boilerplate)\b/i,
    taskClass: 'PUBLIC_GENERATE_CODE',
  },

  // Orchestration
  {
    pattern: /\b(orchestrat|coordinat|dispatch|route task|prioritize|schedule agent)\b/i,
    taskClass: 'ORCHESTRATION',
  },
]

/**
 * Infers task class from description keywords.
 * Returns null if no strong signal found (caller should escalate).
 */
function inferFromDescription(
  description: string,
  _domain: ClassificationInput['domain']
): TaskClass | null {
  for (const { pattern, taskClass } of KEYWORD_MAP) {
    if (pattern.test(description)) {
      return taskClass
    }
  }
  return null
}

/**
 * Convenience: classify with minimal input for common cases.
 * Used by existing call sites during migration to the dispatch layer.
 */
export function quickClassify(
  taskDescription: string,
  isPrivate: boolean,
  domain: ClassificationInput['domain'] = 'runtime'
): TaskClass {
  return classifyTask({
    domain,
    taskDescription,
    privacyLevel: isPrivate ? 'LOCAL_ONLY' : 'CLOUD_SAFE',
  })
}
