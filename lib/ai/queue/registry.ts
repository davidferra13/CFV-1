// AI Task Queue - Task Registry
// Maps task_type strings to their definitions and handlers.
// No 'use server' - pure logic, importable anywhere.
//
// Every AI task in the system MUST be registered here.
// Unregistered tasks are rejected at enqueue time.

import type { AiTaskDefinition } from './types'
import { AI_PRIORITY } from './types'
import { handleDraftTask } from '@/lib/ai/draft-actions'
import {
  handleDailyBriefing,
  handleLeadScoring,
  handleWeeklyInsights,
  handleRevenueGoal,
  handleChurnPrediction,
  handleFoodCostAlert,
  handlePipelineBottleneck,
  handleCertExpiry,
  handleFoodRecallMonitor,
  handleQuoteAnalysis,
  handleAnomalyDetection,
  handleMenuEngineering,
  handleStaleInquiryScanner,
  handlePaymentOverdueScanner,
  handleSocialPostDraft,
  handleClientSentiment,
} from '@/lib/ai/scheduled/jobs'
import { handleCILDecay } from '@/lib/cil/decay-handler'
import { handleCILScan } from '@/lib/cil/scanner-handler'
import {
  handleInquiryCreated,
  handleInquiryStale,
  handleEventConfirmed,
  handleEventCompleted,
  handleEventCancelled,
  handleMenuApproved,
  handlePaymentReceived,
  handlePaymentOverdue,
  handleClientDormant,
  handleClientBirthday,
  handleClientComplaint,
  handleTempOutOfRange,
  handleFoodRecall,
  handleGuestListUpdated,
  handleStaffNoShow,
} from '@/lib/ai/reactive/handlers'
import { handleInstantNoteQueueTask } from '@/lib/quick-notes/intelligence-processor'

// ============================================
// REGISTRY STORAGE
// ============================================

const registry = new Map<string, AiTaskDefinition>()

// ============================================
// REGISTRATION API
// ============================================

/**
 * Register an AI task definition. Call this at module load time.
 * Duplicate registrations overwrite silently (allows hot-reload).
 */
export function registerTask(definition: AiTaskDefinition): void {
  registry.set(definition.taskType, definition)
}

/**
 * Register multiple tasks at once (convenience).
 */
export function registerTasks(definitions: AiTaskDefinition[]): void {
  for (const def of definitions) {
    registry.set(def.taskType, def)
  }
}

/**
 * Get a task definition by type. Returns undefined if not registered.
 */
export function getTaskDefinition(taskType: string): AiTaskDefinition | undefined {
  return registry.get(taskType)
}

/**
 * List all registered task types (for debugging/admin UI).
 */
export function listRegisteredTasks(): AiTaskDefinition[] {
  return Array.from(registry.values())
}

/**
 * Check if a task type is registered.
 */
export function isRegisteredTask(taskType: string): boolean {
  return registry.has(taskType)
}

// ============================================
// BUILT-IN TASK DEFINITIONS
// ============================================
// These are placeholder handlers that will be replaced as each
// feature is implemented. They exist so the queue can accept
// tasks immediately - the actual handler is swapped in later.

const notImplementedHandler = async (
  _payload: Record<string, unknown>,
  _tenantId: string
): Promise<Record<string, unknown>> => {
  return {
    status: 'not_implemented',
    message: 'This task type is registered but not yet implemented.',
  }
}

// ── System tasks ──────────────────────────────────────────────

registerTask({
  taskType: 'system.health_check',
  name: 'System Health Check',
  approvalTier: 'auto',
  defaultPriority: AI_PRIORITY.SCHEDULED,
  modelTier: 'fast',
  preferredEndpoint: 'auto',
  maxAttempts: 1,
  recurrence: null,
  handler: async () => {
    // Simple ping - just confirms the queue + Ollama are working
    return { status: 'healthy', timestamp: new Date().toISOString() }
  },
})

registerTask({
  taskType: 'note.interpretation',
  name: 'Instant Note Interpretation',
  approvalTier: 'auto',
  defaultPriority: AI_PRIORITY.ON_DEMAND,
  modelTier: 'complex',
  preferredEndpoint: 'pc',
  maxAttempts: 2,
  recurrence: null,
  handler: handleInstantNoteQueueTask,
})

// ── Placeholder categories for future tasks ───────────────────
// These will be populated as each phase is implemented.
// Having them registered now means they can be enqueued even
// before the handler is written (they'll return 'not_implemented').

const placeholderTasks: Array<Omit<AiTaskDefinition, 'handler'>> = [
  // PHASE 2 - Interactive features (via Remy commands, not queue)
  // These don't need queue registration - they go through the command orchestrator.
  // PHASE B - Communication Drafts (placeholders - real handlers registered below)
  // PHASE C - Reactive triggers (real handlers registered below)
  // PHASE D - Scheduled intelligence (real handlers registered below)
]

// Register all placeholder tasks
for (const task of placeholderTasks) {
  registerTask({ ...task, handler: notImplementedHandler })
}

// ── Communication Drafts (real handlers) ─────────────────────────────────────
// These overwrite the placeholders above with actual Ollama-powered implementations.

const DRAFT_TYPES = [
  { taskType: 'draft.thank_you', name: 'Thank-You Note Draft' },
  { taskType: 'draft.referral_request', name: 'Referral Request Draft' },
  { taskType: 'draft.testimonial_request', name: 'Testimonial Request Draft' },
  { taskType: 'draft.quote_cover_letter', name: 'Quote Cover Letter Draft' },
  { taskType: 'draft.decline_response', name: 'Decline Response Draft' },
  { taskType: 'draft.cancellation_response', name: 'Cancellation Response Draft' },
  { taskType: 'draft.payment_reminder', name: 'Payment Reminder Draft' },
  { taskType: 'draft.re_engagement', name: 'Client Re-Engagement Draft' },
  { taskType: 'draft.milestone_recognition', name: 'Milestone Recognition Draft' },
  { taskType: 'draft.food_safety_incident', name: 'Food Safety Incident Draft' },
] as const

for (const dt of DRAFT_TYPES) {
  registerTask({
    taskType: dt.taskType,
    name: dt.name,
    approvalTier: 'draft',
    defaultPriority: AI_PRIORITY.ON_DEMAND,
    modelTier: 'standard',
    preferredEndpoint: 'auto',
    maxAttempts: 2,
    recurrence: null,
    handler: async (payload, _tenantId) => {
      const result = await handleDraftTask(dt.taskType, payload)
      return result as unknown as Record<string, unknown>
    },
  })
}

// ── Reactive Triggers (real handlers) ─────────────────────────────────────────

const REACTIVE_HANDLER_MAP: Record<
  string,
  {
    name: string
    tier: 'auto' | 'draft'
    priority: number
    model: 'fast' | 'standard'
    maxAttempts: number
    handler: (p: Record<string, unknown>, t: string) => Promise<Record<string, unknown>>
  }
> = {
  'reactive.inquiry_created': {
    name: 'New Inquiry Auto-Score',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'fast',
    maxAttempts: 2,
    handler: handleInquiryCreated,
  },
  'reactive.inquiry_stale': {
    name: 'Stale Inquiry Follow-Up',
    tier: 'draft',
    priority: AI_PRIORITY.SCHEDULED,
    model: 'standard',
    maxAttempts: 2,
    handler: handleInquiryStale,
  },
  'reactive.event_confirmed': {
    name: 'Event Confirmed Auto-Gen',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleEventConfirmed,
  },
  'reactive.event_completed': {
    name: 'Post-Event Drafts',
    tier: 'draft',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleEventCompleted,
  },
  'reactive.event_cancelled': {
    name: 'Cancellation Response',
    tier: 'draft',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleEventCancelled,
  },
  'reactive.menu_approved': {
    name: 'Menu Allergen Check',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleMenuApproved,
  },
  'reactive.payment_received': {
    name: 'Payment Confirmation',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'fast',
    maxAttempts: 2,
    handler: handlePaymentReceived,
  },
  'reactive.client_dormant': {
    name: 'Re-Engage Dormant Client',
    tier: 'draft',
    priority: AI_PRIORITY.SCHEDULED,
    model: 'standard',
    maxAttempts: 2,
    handler: handleClientDormant,
  },
  'reactive.client_birthday': {
    name: 'Client Birthday Draft',
    tier: 'draft',
    priority: AI_PRIORITY.SCHEDULED,
    model: 'standard',
    maxAttempts: 2,
    handler: handleClientBirthday,
  },
  'reactive.client_complaint': {
    name: 'Client Complaint Alert',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'fast',
    maxAttempts: 2,
    handler: handleClientComplaint,
  },
  'reactive.temp_out_of_range': {
    name: 'Temperature Alert',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'fast',
    maxAttempts: 1,
    handler: handleTempOutOfRange,
  },
  'reactive.food_recall': {
    name: 'Food Recall Alert',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleFoodRecall,
  },
  'reactive.guest_list_updated': {
    name: 'Guest List Allergen Re-Check',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'standard',
    maxAttempts: 2,
    handler: handleGuestListUpdated,
  },
  'reactive.staff_no_show': {
    name: 'Staff No-Show Alert',
    tier: 'auto',
    priority: AI_PRIORITY.REACTIVE,
    model: 'fast',
    maxAttempts: 1,
    handler: handleStaffNoShow,
  },
  'reactive.payment_overdue': {
    name: 'Payment Reminder Draft',
    tier: 'draft',
    priority: AI_PRIORITY.SCHEDULED,
    model: 'standard',
    maxAttempts: 2,
    handler: handlePaymentOverdue,
  },
}

for (const [taskType, def] of Object.entries(REACTIVE_HANDLER_MAP)) {
  registerTask({
    taskType,
    name: def.name,
    approvalTier: def.tier,
    defaultPriority: def.priority as import('./types').AiPriorityLevel,
    modelTier: def.model,
    preferredEndpoint: 'auto',
    maxAttempts: def.maxAttempts,
    recurrence: null,
    handler: def.handler,
  })
}

// ── Scheduled Intelligence (real handlers) ────────────────────────────────────

const SCHEDULED_HANDLER_MAP: Record<
  string,
  {
    name: string
    model: 'fast' | 'standard' | 'complex'
    endpoint: 'auto' | 'pc'
    recurrence: string
    handler: (p: Record<string, unknown>, t: string) => Promise<Record<string, unknown>>
  }
> = {
  'scheduled.daily_briefing': {
    name: 'Daily Briefing Pre-Gen',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 day',
    handler: handleDailyBriefing,
  },
  'scheduled.lead_scoring': {
    name: 'Auto Lead Scoring',
    model: 'fast',
    endpoint: 'pc',
    recurrence: '2 hours',
    handler: handleLeadScoring,
  },
  'scheduled.weekly_insights': {
    name: 'Weekly Business Insights',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleWeeklyInsights,
  },
  'scheduled.revenue_goal': {
    name: 'Revenue Goal Progress',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleRevenueGoal,
  },
  'scheduled.churn_prediction': {
    name: 'Client Churn Prediction',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleChurnPrediction,
  },
  'scheduled.food_cost_alert': {
    name: 'Food Cost % Alert',
    model: 'fast',
    endpoint: 'auto',
    recurrence: '1 week',
    handler: handleFoodCostAlert,
  },
  'scheduled.pipeline_bottleneck': {
    name: 'Pipeline Bottleneck Report',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handlePipelineBottleneck,
  },
  'scheduled.cert_expiry': {
    name: 'Certification Expiry Check',
    model: 'fast',
    endpoint: 'auto',
    recurrence: '1 day',
    handler: handleCertExpiry,
  },
  'scheduled.food_recall': {
    name: 'FDA Recall Monitoring',
    model: 'standard',
    endpoint: 'auto',
    recurrence: '1 day',
    handler: handleFoodRecallMonitor,
  },
  'scheduled.quote_analysis': {
    name: 'Quote Win/Loss Analysis',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleQuoteAnalysis,
  },
  'scheduled.anomaly_detection': {
    name: 'Platform Anomaly Detection',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 day',
    handler: handleAnomalyDetection,
  },
  'scheduled.menu_engineering': {
    name: 'Menu Engineering Report',
    model: 'complex',
    endpoint: 'pc',
    recurrence: '1 month',
    handler: handleMenuEngineering,
  },
  'scheduled.stale_inquiry_scanner': {
    name: 'Stale Inquiry Scanner',
    model: 'fast',
    endpoint: 'auto',
    recurrence: '6 hours',
    handler: handleStaleInquiryScanner,
  },
  'scheduled.payment_overdue_scanner': {
    name: 'Payment Overdue Scanner',
    model: 'fast',
    endpoint: 'auto',
    recurrence: '1 day',
    handler: handlePaymentOverdueScanner,
  },
  'scheduled.social_post_draft': {
    name: 'Social Post Draft',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleSocialPostDraft,
  },
  'scheduled.client_sentiment': {
    name: 'Client Sentiment Monitor',
    model: 'standard',
    endpoint: 'pc',
    recurrence: '1 week',
    handler: handleClientSentiment,
  },
  'scheduled.cil_decay': {
    name: 'CIL Graph Decay Sweep',
    model: 'fast',
    endpoint: 'pc',
    recurrence: '1 day',
    handler: handleCILDecay,
  },
  'scheduled.cil_scan': {
    name: 'CIL Pattern Scanner',
    model: 'fast',
    endpoint: 'pc',
    recurrence: '1 hour',
    handler: handleCILScan,
  },
  'scheduled.reminder_fire': {
    name: 'Personal Reminder Check',
    model: 'fast',
    endpoint: 'auto',
    recurrence: '5 minutes',
    handler: async () => {
      const { fireReminders } = await import('@/lib/todos/actions')
      const result = await fireReminders()
      return { status: 'ok', ...result }
    },
  },
}

for (const [taskType, def] of Object.entries(SCHEDULED_HANDLER_MAP)) {
  registerTask({
    taskType,
    name: def.name,
    approvalTier: 'auto',
    defaultPriority:
      taskType.includes('weekly') ||
      taskType.includes('churn') ||
      taskType.includes('revenue') ||
      taskType.includes('pipeline') ||
      taskType.includes('quote') ||
      taskType.includes('anomaly') ||
      taskType.includes('menu_engineering')
        ? (AI_PRIORITY.BATCH as import('./types').AiPriorityLevel)
        : (AI_PRIORITY.SCHEDULED as import('./types').AiPriorityLevel),
    modelTier: def.model,
    preferredEndpoint: def.endpoint,
    maxAttempts: 2,
    recurrence: def.recurrence,
    handler: def.handler,
  })
}
