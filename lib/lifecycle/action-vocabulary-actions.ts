'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ActionDefinition,
  ActionDomain,
  ActionGroup,
  ActionUsage,
} from './action-vocabulary-types'

// ---------------------------------------------------------------------------
// Canonical Action Registry (~40 actions across 8 domains)
// ---------------------------------------------------------------------------

const CANONICAL_ACTIONS: ActionDefinition[] = [
  // ── Inquiry domain ──────────────────────────────────────────────────────
  {
    id: 'inq-create',
    canonicalName: 'inquiry.create',
    verb: 'create',
    domain: 'inquiry',
    label: 'Create Inquiry',
    description: 'Log a new client inquiry',
    targetEntity: 'inquiry',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: true,
    order: 1,
  },
  {
    id: 'inq-update',
    canonicalName: 'inquiry.update',
    verb: 'update',
    domain: 'inquiry',
    label: 'Update Inquiry',
    description: 'Edit inquiry details or notes',
    targetEntity: 'inquiry',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 2,
  },
  {
    id: 'inq-approve',
    canonicalName: 'inquiry.approve',
    verb: 'approve',
    domain: 'inquiry',
    label: 'Approve Inquiry',
    description: 'Accept inquiry and move to quoting',
    targetEntity: 'inquiry',
    requiresConfirmation: true,
    reversible: true,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'inq-reject',
    canonicalName: 'inquiry.reject',
    verb: 'reject',
    domain: 'inquiry',
    label: 'Decline Inquiry',
    description: 'Decline an inquiry with reason',
    targetEntity: 'inquiry',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 4,
  },
  {
    id: 'inq-archive',
    canonicalName: 'inquiry.archive',
    verb: 'archive',
    domain: 'inquiry',
    label: 'Archive Inquiry',
    description: 'Archive a closed or stale inquiry',
    targetEntity: 'inquiry',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 5,
  },

  // ── Quote domain ────────────────────────────────────────────────────────
  {
    id: 'quo-create',
    canonicalName: 'quote.create',
    verb: 'create',
    domain: 'quote',
    label: 'Create Quote',
    description: 'Draft a new quote for a client',
    targetEntity: 'quote',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: false,
    order: 1,
  },
  {
    id: 'quo-update',
    canonicalName: 'quote.update',
    verb: 'update',
    domain: 'quote',
    label: 'Update Quote',
    description: 'Revise quote line items or pricing',
    targetEntity: 'quote',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 2,
  },
  {
    id: 'quo-send',
    canonicalName: 'quote.send',
    verb: 'send',
    domain: 'quote',
    label: 'Send Quote',
    description: 'Send quote to client for review',
    targetEntity: 'quote',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'quo-approve',
    canonicalName: 'quote.approve',
    verb: 'approve',
    domain: 'quote',
    label: 'Approve Quote',
    description: 'Mark quote as accepted by client',
    targetEntity: 'quote',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 4,
  },
  {
    id: 'quo-reject',
    canonicalName: 'quote.reject',
    verb: 'reject',
    domain: 'quote',
    label: 'Reject Quote',
    description: 'Mark quote as declined by client',
    targetEntity: 'quote',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 5,
  },
  {
    id: 'quo-cancel',
    canonicalName: 'quote.cancel',
    verb: 'cancel',
    domain: 'quote',
    label: 'Cancel Quote',
    description: 'Void an unsent or expired quote',
    targetEntity: 'quote',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: false,
    order: 6,
  },

  // ── Contract domain ─────────────────────────────────────────────────────
  {
    id: 'con-create',
    canonicalName: 'contract.create',
    verb: 'create',
    domain: 'contract',
    label: 'Create Contract',
    description: 'Generate a contract from an approved quote',
    targetEntity: 'contract',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: false,
    order: 1,
  },
  {
    id: 'con-send',
    canonicalName: 'contract.send',
    verb: 'send',
    domain: 'contract',
    label: 'Send Contract',
    description: 'Send contract to client for signature',
    targetEntity: 'contract',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 2,
  },
  {
    id: 'con-approve',
    canonicalName: 'contract.approve',
    verb: 'approve',
    domain: 'contract',
    label: 'Countersign Contract',
    description: 'Chef countersigns after client signs',
    targetEntity: 'contract',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'con-cancel',
    canonicalName: 'contract.cancel',
    verb: 'cancel',
    domain: 'contract',
    label: 'Cancel Contract',
    description: 'Void contract before execution',
    targetEntity: 'contract',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 4,
  },
  {
    id: 'con-archive',
    canonicalName: 'contract.archive',
    verb: 'archive',
    domain: 'contract',
    label: 'Archive Contract',
    description: 'Archive a completed or cancelled contract',
    targetEntity: 'contract',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 5,
  },

  // ── Event domain ────────────────────────────────────────────────────────
  {
    id: 'evt-create',
    canonicalName: 'event.create',
    verb: 'create',
    domain: 'event',
    label: 'Create Event',
    description: 'Create a new event from a confirmed booking',
    targetEntity: 'event',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: true,
    order: 1,
  },
  {
    id: 'evt-update',
    canonicalName: 'event.update',
    verb: 'update',
    domain: 'event',
    label: 'Update Event',
    description: 'Edit event date, time, location, or details',
    targetEntity: 'event',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: true,
    order: 2,
  },
  {
    id: 'evt-schedule',
    canonicalName: 'event.schedule',
    verb: 'schedule',
    domain: 'event',
    label: 'Schedule Event',
    description: 'Confirm event date and time on calendar',
    targetEntity: 'event',
    requiresConfirmation: true,
    reversible: true,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'evt-assign',
    canonicalName: 'event.assign',
    verb: 'assign',
    domain: 'event',
    label: 'Assign Staff',
    description: 'Assign staff members to the event',
    targetEntity: 'event',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 4,
  },
  {
    id: 'evt-complete',
    canonicalName: 'event.complete',
    verb: 'complete',
    domain: 'event',
    label: 'Complete Event',
    description: 'Mark event as completed after service',
    targetEntity: 'event',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 5,
  },
  {
    id: 'evt-cancel',
    canonicalName: 'event.cancel',
    verb: 'cancel',
    domain: 'event',
    label: 'Cancel Event',
    description: 'Cancel a scheduled event',
    targetEntity: 'event',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 6,
  },

  // ── Payment domain ──────────────────────────────────────────────────────
  {
    id: 'pay-create',
    canonicalName: 'payment.create',
    verb: 'create',
    domain: 'payment',
    label: 'Record Payment',
    description: 'Record a payment received from client',
    targetEntity: 'payment',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: true,
    order: 1,
  },
  {
    id: 'pay-send',
    canonicalName: 'payment.send_invoice',
    verb: 'send',
    domain: 'payment',
    label: 'Send Invoice',
    description: 'Send payment invoice to client',
    targetEntity: 'invoice',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 2,
  },
  {
    id: 'pay-notify',
    canonicalName: 'payment.send_reminder',
    verb: 'notify',
    domain: 'payment',
    label: 'Send Reminder',
    description: 'Send payment reminder to client',
    targetEntity: 'invoice',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'pay-complete',
    canonicalName: 'payment.mark_paid',
    verb: 'complete',
    domain: 'payment',
    label: 'Mark Paid',
    description: 'Mark an invoice as fully paid',
    targetEntity: 'invoice',
    requiresConfirmation: true,
    reversible: true,
    clientVisible: true,
    order: 4,
  },
  {
    id: 'pay-cancel',
    canonicalName: 'payment.void',
    verb: 'cancel',
    domain: 'payment',
    label: 'Void Payment',
    description: 'Void a recorded payment',
    targetEntity: 'payment',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 5,
  },

  // ── Communication domain ────────────────────────────────────────────────
  {
    id: 'com-send',
    canonicalName: 'communication.send_email',
    verb: 'send',
    domain: 'communication',
    label: 'Send Email',
    description: 'Send an email to client',
    targetEntity: 'email',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: true,
    order: 1,
  },
  {
    id: 'com-notify',
    canonicalName: 'communication.send_sms',
    verb: 'notify',
    domain: 'communication',
    label: 'Send SMS',
    description: 'Send a text message to client',
    targetEntity: 'sms',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: true,
    order: 2,
  },
  {
    id: 'com-create',
    canonicalName: 'communication.log_call',
    verb: 'create',
    domain: 'communication',
    label: 'Log Call',
    description: 'Record a phone call with client',
    targetEntity: 'call_log',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 3,
  },
  {
    id: 'com-schedule',
    canonicalName: 'communication.schedule_followup',
    verb: 'schedule',
    domain: 'communication',
    label: 'Schedule Follow-up',
    description: 'Schedule a follow-up communication',
    targetEntity: 'followup',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 4,
  },

  // ── Menu domain ─────────────────────────────────────────────────────────
  {
    id: 'mnu-create',
    canonicalName: 'menu.create',
    verb: 'create',
    domain: 'menu',
    label: 'Create Menu',
    description: 'Create a new menu for an event',
    targetEntity: 'menu',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: false,
    order: 1,
  },
  {
    id: 'mnu-update',
    canonicalName: 'menu.update',
    verb: 'update',
    domain: 'menu',
    label: 'Update Menu',
    description: 'Edit menu courses, dishes, or notes',
    targetEntity: 'menu',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 2,
  },
  {
    id: 'mnu-send',
    canonicalName: 'menu.send',
    verb: 'send',
    domain: 'menu',
    label: 'Send Menu',
    description: 'Share menu with client for approval',
    targetEntity: 'menu',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'mnu-approve',
    canonicalName: 'menu.approve',
    verb: 'approve',
    domain: 'menu',
    label: 'Approve Menu',
    description: 'Mark menu as approved by client',
    targetEntity: 'menu',
    requiresConfirmation: true,
    reversible: true,
    clientVisible: true,
    order: 4,
  },
  {
    id: 'mnu-assign',
    canonicalName: 'menu.assign_to_event',
    verb: 'assign',
    domain: 'menu',
    label: 'Assign to Event',
    description: 'Attach menu to a specific event',
    targetEntity: 'menu',
    requiresConfirmation: false,
    reversible: true,
    clientVisible: false,
    order: 5,
  },

  // ── Closeout domain ─────────────────────────────────────────────────────
  {
    id: 'clo-create',
    canonicalName: 'closeout.create',
    verb: 'create',
    domain: 'closeout',
    label: 'Create Closeout',
    description: 'Start post-event closeout process',
    targetEntity: 'closeout',
    requiresConfirmation: false,
    reversible: false,
    clientVisible: false,
    order: 1,
  },
  {
    id: 'clo-send',
    canonicalName: 'closeout.send_summary',
    verb: 'send',
    domain: 'closeout',
    label: 'Send Summary',
    description: 'Send post-event summary to client',
    targetEntity: 'closeout',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 2,
  },
  {
    id: 'clo-notify',
    canonicalName: 'closeout.request_feedback',
    verb: 'notify',
    domain: 'closeout',
    label: 'Request Feedback',
    description: 'Ask client for post-event feedback',
    targetEntity: 'feedback_request',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: true,
    order: 3,
  },
  {
    id: 'clo-complete',
    canonicalName: 'closeout.finalize',
    verb: 'complete',
    domain: 'closeout',
    label: 'Finalize Closeout',
    description: 'Mark closeout as complete',
    targetEntity: 'closeout',
    requiresConfirmation: true,
    reversible: false,
    clientVisible: false,
    order: 4,
  },
  {
    id: 'clo-archive',
    canonicalName: 'closeout.archive',
    verb: 'archive',
    domain: 'closeout',
    label: 'Archive Event',
    description: 'Archive the event and all related records',
    targetEntity: 'event',
    requiresConfirmation: true,
    reversible: true,
    clientVisible: false,
    order: 5,
  },
]

const DOMAIN_LABELS: Record<ActionDomain, string> = {
  inquiry: 'Inquiries',
  quote: 'Quotes & Pricing',
  contract: 'Contracts',
  event: 'Events',
  payment: 'Payments & Invoicing',
  communication: 'Communication',
  menu: 'Menus',
  closeout: 'Closeout & Follow-up',
}

// ---------------------------------------------------------------------------
// State-aware availability rules
// ---------------------------------------------------------------------------

const STATE_RULES: Record<string, Record<string, string[]>> = {
  inquiry: {
    new: ['inquiry.create', 'inquiry.update'],
    open: ['inquiry.update', 'inquiry.approve', 'inquiry.reject', 'inquiry.archive'],
    approved: ['inquiry.archive'],
    rejected: ['inquiry.archive'],
    archived: [],
  },
  quote: {
    draft: ['quote.update', 'quote.send', 'quote.cancel'],
    sent: ['quote.approve', 'quote.reject', 'quote.cancel'],
    approved: [],
    rejected: [],
    cancelled: [],
  },
  contract: {
    draft: ['contract.send', 'contract.cancel'],
    sent: ['contract.approve', 'contract.cancel'],
    signed: ['contract.archive'],
    cancelled: ['contract.archive'],
    archived: [],
  },
  event: {
    draft: ['event.update', 'event.schedule', 'event.assign', 'event.cancel'],
    scheduled: ['event.update', 'event.assign', 'event.complete', 'event.cancel'],
    completed: [],
    cancelled: [],
  },
  invoice: {
    draft: ['payment.send_invoice', 'payment.void'],
    sent: ['payment.send_reminder', 'payment.mark_paid', 'payment.void'],
    paid: [],
    voided: [],
  },
  menu: {
    draft: ['menu.update', 'menu.send', 'menu.assign_to_event'],
    sent: ['menu.approve', 'menu.update'],
    approved: ['menu.assign_to_event'],
  },
  closeout: {
    open: ['closeout.send_summary', 'closeout.request_feedback', 'closeout.finalize'],
    finalized: ['closeout.archive'],
    archived: [],
  },
}

// ---------------------------------------------------------------------------
// Server Actions
// ---------------------------------------------------------------------------

export async function getActionVocabulary(): Promise<ActionGroup[]> {
  await requireChef()

  const domains = [...new Set(CANONICAL_ACTIONS.map((a) => a.domain))] as ActionDomain[]
  return domains.map((domain) => ({
    domain,
    label: DOMAIN_LABELS[domain],
    actions: CANONICAL_ACTIONS.filter((a) => a.domain === domain).sort((a, b) => a.order - b.order),
  }))
}

export async function getActionsForDomain(domain: ActionDomain): Promise<ActionDefinition[]> {
  await requireChef()
  return CANONICAL_ACTIONS.filter((a) => a.domain === domain).sort((a, b) => a.order - b.order)
}

export async function getActionsForEntity(entityType: string): Promise<ActionDefinition[]> {
  await requireChef()
  return CANONICAL_ACTIONS.filter((a) => a.targetEntity === entityType).sort(
    (a, b) => a.order - b.order
  )
}

export async function logActionUsage(
  actionName: string,
  entityType: string,
  entityId: string
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    await db.from('action_usage_log').insert({
      tenant_id: user.tenantId,
      action_name: actionName,
      entity_type: entityType,
      entity_id: entityId,
    })

    return { success: true }
  } catch (err) {
    console.error('[action-vocabulary] Failed to log action usage:', err)
    return { success: false }
  }
}

export async function getActionUsageStats(): Promise<ActionUsage[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  try {
    const { data, error } = await db
      .from('action_usage_log')
      .select('action_name, performed_at')
      .eq('tenant_id', user.tenantId)
      .order('performed_at', { ascending: false })

    if (error) throw error

    // Aggregate in JS since compat client has no groupBy
    const grouped = new Map<string, { count: number; lastUsed: string | null }>()
    for (const row of data ?? []) {
      const existing = grouped.get(row.action_name)
      if (existing) {
        existing.count++
      } else {
        grouped.set(row.action_name, { count: 1, lastUsed: row.performed_at ?? null })
      }
    }

    return Array.from(grouped.entries())
      .map(([actionName, stats]) => ({
        actionName,
        count: stats.count,
        lastUsed: stats.lastUsed,
      }))
      .sort((a, b) => b.count - a.count)
  } catch (err) {
    console.error('[action-vocabulary] Failed to get usage stats:', err)
    return []
  }
}

export async function getAvailableActions(
  entityType: string,
  entityId: string,
  currentState?: string
): Promise<ActionDefinition[]> {
  await requireChef()

  // Without state info, return all actions for the entity type
  if (!currentState) {
    return CANONICAL_ACTIONS.filter((a) => a.targetEntity === entityType).sort(
      (a, b) => a.order - b.order
    )
  }

  // Use state rules to filter valid actions
  const rules = STATE_RULES[entityType]
  if (!rules) {
    return CANONICAL_ACTIONS.filter((a) => a.targetEntity === entityType).sort(
      (a, b) => a.order - b.order
    )
  }

  const allowedNames = rules[currentState]
  if (!allowedNames) {
    return []
  }

  return CANONICAL_ACTIONS.filter((a) => allowedNames.includes(a.canonicalName)).sort(
    (a, b) => a.order - b.order
  )
}
