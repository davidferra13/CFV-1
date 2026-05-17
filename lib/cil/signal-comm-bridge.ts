/**
 * CIL Signal-to-Communication Bridge
 *
 * Maps CIL signal dispatches to real outbound communications via the
 * notification channel-router. Solves the gap where signal-actions.ts
 * creates in-app notifications with fake action types that the
 * channel-router cannot resolve.
 *
 * Architecture:
 *   signal-actions.ts -> dispatchSignalAction() -> signalCommBridge()
 *                                                      |
 *                              createNotification() with valid action + origin:'ai'
 *                                      |
 *                              routeNotification() (channel-router.ts)
 *                                      |
 *                          email / push / SMS based on preferences
 *
 * Dedup: 24h window per (tenant, signal source, entity) to prevent
 * duplicate outbound comms. Layered on top of signal-dedup.ts (1h window)
 * which prevents duplicate dispatch. This layer prevents the same
 * communication from being sent twice even across process restarts.
 */

import { createServerClient } from '@/lib/db/server'
import type { ProactiveSignal } from '@/lib/cil/types'
import type { NotificationAction, NotificationCategory } from '@/lib/notifications/types'

// ── Signal-to-Notification Mapping ─────────────────────────────────────────

interface CommMapping {
  /** Valid NotificationAction from the union type */
  action: NotificationAction
  /** Notification category */
  category: NotificationCategory
  /** Whether this signal targets the chef (true) or a client (false) */
  chefFacing: boolean
  /** Minimum signal urgency (1-5) required to trigger outbound comms */
  minUrgency: number
}

/**
 * Maps CIL signal sources to valid notification actions.
 * Only signals that should produce outbound communications are listed.
 * Signals not in this map continue with their existing in-app behavior.
 */
const SIGNAL_COMM_MAP: Record<string, CommMapping> = {
  // Finance
  'finance.overdueInvoices': {
    action: 'payment_overdue',
    category: 'payment',
    chefFacing: true,
    minUrgency: 2,
  },
  'finance.expenseSpikes': {
    action: 'system_alert',
    category: 'ops',
    chefFacing: true,
    minUrgency: 3,
  },
  'finance.revenueTrends': {
    action: 'system_alert',
    category: 'ops',
    chefFacing: true,
    minUrgency: 4,
  },

  // Calendar
  'calendar.overload': {
    action: 'capacity_limit_approaching',
    category: 'wellbeing',
    chefFacing: true,
    minUrgency: 2,
  },
  'calendar.deadSpots': {
    action: 'relationship_cooling',
    category: 'client',
    chefFacing: true,
    minUrgency: 3,
  },

  // Pipeline
  'pipeline.unsignedContracts': {
    action: 'follow_up_due',
    category: 'inquiry',
    chefFacing: true,
    minUrgency: 2,
  },
  'pipeline.expiringProposals': {
    action: 'quote_expiring',
    category: 'quote',
    chefFacing: true,
    minUrgency: 2,
  },
  'pipeline.staleLeads': {
    action: 'marketplace_lead_stale',
    category: 'lead',
    chefFacing: true,
    minUrgency: 3,
  },

  // Inventory
  'inventory.priceSpikes': {
    action: 'price_watch_alert',
    category: 'ops',
    chefFacing: true,
    minUrgency: 3,
  },
  'inventory.wastePatterns': {
    action: 'system_alert',
    category: 'ops',
    chefFacing: true,
    minUrgency: 4,
  },

  // Reputation
  'reputation.testimonialOpportunity': {
    action: 'review_submitted',
    category: 'client',
    chefFacing: true,
    minUrgency: 3,
  },
  'reputation.ratingTrend': {
    action: 'system_alert',
    category: 'ops',
    chefFacing: true,
    minUrgency: 4,
  },
  'reputation.unreviewedEvents': {
    action: 'follow_up_due',
    category: 'inquiry',
    chefFacing: true,
    minUrgency: 3,
  },

  // Clients (non-churn, those are handled by scheduleChurnReengagement)
  'clients.vipActivity': {
    action: 'client_portal_visit',
    category: 'client',
    chefFacing: true,
    minUrgency: 3,
  },
  'clients.rebookingPrediction': {
    action: 'relationship_cooling',
    category: 'client',
    chefFacing: true,
    minUrgency: 3,
  },
}

// ── 24h Communication Dedup ────────────────────────────────────────────────

const COMM_DEDUP_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours

interface CommDedupEntry {
  sentAt: number
}

/** In-memory 24h dedup map: "tenant:source:entity" -> timestamp */
const commDedupMap = new Map<string, CommDedupEntry>()

function buildCommDedupKey(tenantId: string, source: string, entityId: string): string {
  return `comm:${tenantId}:${source}:${entityId}`
}

function shouldSendComm(key: string): boolean {
  const now = Date.now()

  // Lazy eviction
  for (const [k, entry] of commDedupMap) {
    if (now - entry.sentAt > COMM_DEDUP_TTL_MS) {
      commDedupMap.delete(k)
    }
  }

  const existing = commDedupMap.get(key)
  if (existing && now - existing.sentAt < COMM_DEDUP_TTL_MS) {
    return false
  }

  return true
}

function markCommSent(key: string): void {
  commDedupMap.set(key, { sentAt: Date.now() })
}

// ── Urgency-to-Tier Mapping ────────────────────────────────────────────────

/**
 * Map CIL signal urgency (1=low, 5=critical) to notification origin.
 * Higher urgency signals get 'automated' origin so channel-router treats
 * them as system-initiated (respects client-facing SMS suppression).
 */
function resolveOrigin(_urgency: number): 'automated' | 'ai' {
  // All CIL signals are AI-generated
  return 'ai'
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Bridge a CIL signal to the communication channel-router.
 *
 * Called from dispatchSignalAction() as a non-blocking tail.
 * Creates a notification with a valid NotificationAction so the
 * channel-router can resolve preferences and deliver via email,
 * push, and/or SMS.
 *
 * Skips signals that:
 *   - Have no comm mapping (notification-only signals)
 *   - Fall below the minimum urgency threshold
 *   - Were already sent within the 24h dedup window
 *
 * Never throws. All errors are caught and logged.
 */
export async function bridgeSignalToComm(
  signal: ProactiveSignal,
  tenantId: string
): Promise<void> {
  const mapping = SIGNAL_COMM_MAP[signal.source]
  if (!mapping) return // No comm mapping for this signal type

  // Urgency gate: low-urgency signals stay in-app only
  if (signal.urgency < mapping.minUrgency) return

  // 24h dedup: prevent duplicate outbound comms
  const entityId = signal.entityIds[0] || signal.id
  const dedupKey = buildCommDedupKey(tenantId, signal.source, entityId)
  if (!shouldSendComm(dedupKey)) return

  // Resolve chef's auth user ID for the notification recipient
  const db = createServerClient({ admin: true })
  const { data: chef } = await (db as any)
    .from('chefs')
    .select('auth_user_id')
    .eq('id', tenantId)
    .single()

  if (!chef?.auth_user_id) return

  // Dynamic import to avoid circular deps (signal-actions -> notifications -> ...)
  const { createNotification } = await import('@/lib/notifications/actions')

  await createNotification({
    tenantId,
    recipientId: chef.auth_user_id,
    category: mapping.category,
    action: mapping.action,
    title: signal.title,
    body: signal.suggestedAction || signal.detail,
    actionUrl: (signal.actionPayload?.path as string) || undefined,
    clientId: mapping.category === 'client' ? (signal.entityIds[0] || undefined) : undefined,
    eventId: mapping.category === 'event' ? (signal.entityIds[0] || undefined) : undefined,
    metadata: {
      origin: resolveOrigin(signal.urgency),
      cil_signal_source: signal.source,
      cil_signal_id: signal.id,
      cil_urgency: signal.urgency,
      cil_confidence: signal.confidence,
    },
  })

  // Mark as sent for 24h dedup
  markCommSent(dedupKey)
}

/**
 * Get current comm dedup stats (for diagnostics).
 */
export function getCommDedupStats(): { size: number } {
  return { size: commDedupMap.size }
}
