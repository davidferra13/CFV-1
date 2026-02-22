// AI Task Queue — Type Definitions
// Pure types. No logic. No 'use server'.
// Shared across worker, actions, UI, and registry.

// ============================================
// PRIORITY LEVELS
// ============================================

/**
 * Priority ladder — higher = processed first.
 * Interactive Remy chat BYPASSES the queue entirely (direct Ollama).
 * These priorities govern everything else.
 */
export const AI_PRIORITY = {
  /** User-triggered tasks that need fast response (via Remy command) */
  ON_DEMAND: 800,
  /** Event-driven automation (non-blocking side effects) */
  REACTIVE: 600,
  /** Timer-based background intelligence */
  SCHEDULED: 400,
  /** Heavy batch processing (monthly reports, bulk analysis) */
  BATCH: 200,
} as const

export type AiPriorityLevel = (typeof AI_PRIORITY)[keyof typeof AI_PRIORITY]

// ============================================
// APPROVAL TIERS (from AI_POLICY.md)
// ============================================

/**
 * Every AI task declares its approval tier upfront.
 * This is enforced by the queue — not optional.
 *
 * auto  — Executes, result stored, chef sees it on next visit.
 *         Example: lead scoring, allergen check, daily briefing.
 *
 * draft — Executes, result held as a draft for chef review.
 *         Chef must approve before it becomes visible/actionable.
 *         Example: email drafts, event creation, social captions.
 *
 * hold  — Cannot execute without chef input first.
 *         Chef is presented options/questions, then execution proceeds.
 *         Example: ambiguous requests, multi-option decisions.
 */
export type ApprovalTier = 'auto' | 'draft' | 'hold'

// ============================================
// TASK STATUS
// ============================================

export type AiTaskStatus =
  | 'pending' // Queued, waiting for worker
  | 'processing' // Worker has claimed it, Ollama is running
  | 'completed' // Done — result stored (auto tier)
  | 'awaiting_approval' // Done — result held for chef review (draft tier)
  | 'approved' // Chef approved the draft
  | 'rejected' // Chef rejected the draft
  | 'failed' // Execution failed (will retry if attempts < max)
  | 'dead' // Permanently failed (max attempts exhausted, sent to DLQ)

// ============================================
// LLM ENDPOINT TARGETS
// ============================================

/**
 * Where to run this task's Ollama call.
 * 'auto' lets the router decide based on priority + endpoint health.
 */
export type LlmEndpoint = 'auto' | 'pc' | 'pi'

// ============================================
// TASK DEFINITION (for the registry)
// ============================================

/**
 * Registered task handler definition.
 * Every task_type string maps to one of these in the registry.
 */
export interface AiTaskDefinition {
  /** Unique task type identifier: 'scheduled.daily_briefing', 'draft.thank_you', etc. */
  taskType: string
  /** Human-readable name for UI display */
  name: string
  /** Which tier this task belongs to */
  approvalTier: ApprovalTier
  /** Default priority */
  defaultPriority: AiPriorityLevel
  /** Which model tier to use */
  modelTier: 'fast' | 'standard' | 'complex'
  /** Preferred endpoint (usually 'auto') */
  preferredEndpoint: LlmEndpoint
  /** Max retry attempts */
  maxAttempts: number
  /** For recurring tasks: PostgreSQL interval string, null for one-shot */
  recurrence: string | null
  /** The handler function — receives payload, returns result */
  handler: (payload: Record<string, unknown>, tenantId: string) => Promise<Record<string, unknown>>
}

// ============================================
// QUEUE ITEM (DB row shape)
// ============================================

export interface AiQueueItem {
  id: string
  tenant_id: string
  task_type: string
  priority: number
  approval_tier: ApprovalTier
  status: AiTaskStatus
  payload: Record<string, unknown>
  result: Record<string, unknown> | null
  target_endpoint: LlmEndpoint
  actual_endpoint: string | null
  model_tier: string
  scheduled_for: string
  recurrence: string | null
  attempts: number
  max_attempts: number
  last_error: string | null
  next_retry_at: string | null
  related_event_id: string | null
  related_client_id: string | null
  related_inquiry_id: string | null
  approved_at: string | null
  approved_by: string | null
  rejection_reason: string | null
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

// ============================================
// ENQUEUE INPUT
// ============================================

export interface EnqueueInput {
  tenantId: string
  taskType: string
  payload?: Record<string, unknown>
  /** Override default priority */
  priority?: number
  /** Override default approval tier */
  approvalTier?: ApprovalTier
  /** Schedule for future execution */
  scheduledFor?: Date
  /** Override default endpoint preference */
  targetEndpoint?: LlmEndpoint
  /** Link to related entities */
  relatedEventId?: string
  relatedClientId?: string
  relatedInquiryId?: string
}

// ============================================
// WORKER STATE
// ============================================

export interface WorkerState {
  /** Whether the worker polling loop is active */
  running: boolean
  /** Whether Remy interactive chat is active (worker yields) */
  interactiveLock: boolean
  /** ID of the task currently being processed (null if idle) */
  currentTaskId: string | null
  /** Timestamp of last successful poll */
  lastPollAt: Date | null
  /** Total tasks processed since worker start */
  tasksProcessed: number
  /** Total tasks failed since worker start */
  tasksFailed: number
}

// ============================================
// OLLAMA GUARD — SAFETY CONSTANTS
// ============================================

/**
 * Hard limits to prevent Ollama from being overwhelmed.
 * These are non-negotiable — the system degrades gracefully
 * rather than melting the machine.
 */
export const OLLAMA_GUARD = {
  /** Seconds before a single Ollama call is force-killed */
  CALL_TIMEOUT_MS: 90_000,
  /** Max tokens per background task response (interactive Remy has its own limit) */
  MAX_TOKENS_BACKGROUND: 1024,
  /** Seconds between worker polls (prevents busy-waiting) */
  POLL_INTERVAL_MS: 3_000,
  /** Minimum seconds between Ollama calls (cooldown to prevent thermal throttling) */
  COOLDOWN_MS: 1_000,
  /** Max consecutive failures before worker backs off */
  MAX_CONSECUTIVE_FAILURES: 5,
  /** Backoff duration after max consecutive failures (ms) */
  FAILURE_BACKOFF_MS: 60_000,
  /** Max queue depth per tenant before rejecting new tasks */
  MAX_QUEUE_DEPTH_PER_TENANT: 200,
  /** Max processing time before a task is considered hung and re-queued */
  HUNG_TASK_TIMEOUT_MS: 180_000,
} as const
