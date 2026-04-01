'use server'

import { getCriticalPath, type CriticalPathResult } from './critical-path'
import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import { detectSoftCloseIntent } from '@/lib/inquiries/soft-close'

// ---------------------------------------------------------------------------
// Next Action Suggester
// Deterministic engine that reads inquiry state and returns the smartest
// next move. No AI, no guessing. Pure logic from critical path + fields.
// ---------------------------------------------------------------------------

export interface NextAction {
  /** Short imperative label, e.g. "Ask for dietary restrictions" */
  action: string
  /** Why this is the next move */
  reason: string
  /** Priority: 'respond' (reply needed), 'ask' (missing info), 'advance' (move to next stage), 'wait' (ball in client's court) */
  type: 'respond' | 'ask' | 'advance' | 'wait'
  /** Deep link to relevant action, if any */
  actionUrl?: string
}

export interface NextActionResult {
  /** Primary recommended action */
  primary: NextAction
  /** Additional actions the chef could take */
  secondary: NextAction[]
  /** What the system already has (quick summary) */
  readySummary: string
  /** SLA status */
  slaStatus: 'overdue' | 'due_soon' | 'on_track' | 'no_sla'
  /** Minutes until SLA deadline (negative = overdue) */
  slaMinutesRemaining: number | null
  /**
   * When non-null, this inquiry is in a soft-close workflow.
   * Consumers must check this flag instead of matching action label strings.
   */
  softCloseWorkflow?: { futureInterest: boolean }
}

export async function getNextActions(inquiryId: string): Promise<NextActionResult> {
  const user = await requireChef()
  const db = createServerClient()

  // Fetch inquiry
  const { data: inquiry } = await db
    .from('inquiries')
    .select('*')
    .eq('id', inquiryId)
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!inquiry) {
    return {
      primary: { action: 'Inquiry not found', reason: 'Could not load inquiry data', type: 'wait' },
      secondary: [],
      readySummary: 'No data available',
      slaStatus: 'no_sla',
      slaMinutesRemaining: null,
    }
  }

  // Get critical path
  let criticalPath: CriticalPathResult | null = null
  try {
    criticalPath = await getCriticalPath({ inquiryId })
  } catch {
    // Non-fatal
  }

  const status = inquiry.status as string
  const hasResponded = !!inquiry.first_response_at
  const followUpDue = inquiry.follow_up_due_at ? new Date(inquiry.follow_up_due_at as string) : null
  const dishes = inquiry.discussed_dishes as string[] | null
  const hasDishes = Array.isArray(dishes) && dishes.length > 0
  let softCloseIntent = null as ReturnType<typeof detectSoftCloseIntent>

  if (status === 'awaiting_chef') {
    const { data: latestInboundMessages } = await db
      .from('messages')
      .select('body')
      .eq('tenant_id', user.tenantId!)
      .eq('inquiry_id', inquiryId)
      .eq('direction', 'inbound')
      .order('sent_at', { ascending: false })
      .limit(1)

    const latestInboundBody =
      Array.isArray(latestInboundMessages) && latestInboundMessages[0]
        ? (latestInboundMessages[0].body as string | null)
        : null
    softCloseIntent = detectSoftCloseIntent(latestInboundBody)
  }

  // SLA computation
  let slaStatus: NextActionResult['slaStatus'] = 'no_sla'
  let slaMinutesRemaining: number | null = null
  if (followUpDue) {
    const now = Date.now()
    const diff = followUpDue.getTime() - now
    slaMinutesRemaining = Math.round(diff / 60000)
    if (diff < 0) slaStatus = 'overdue'
    else if (diff < 60 * 60000) slaStatus = 'due_soon'
    else slaStatus = 'on_track'
  }

  const actions: NextAction[] = []
  const confirmedCount = criticalPath?.completedCount ?? 0
  const totalItems = criticalPath?.items.length ?? 10

  // Build ready summary
  const confirmedLabels =
    criticalPath?.items.filter((i) => i.status === 'confirmed').map((i) => i.label) ?? []
  const readySummary =
    confirmedLabels.length > 0 ? `Have: ${confirmedLabels.join(', ')}` : 'No confirmed details yet'

  if (status === 'awaiting_chef' && softCloseIntent) {
    const closeReason = softCloseIntent.futureInterest
      ? 'Client said this is off for now but left the door open for a future booking.'
      : 'Client said they are not moving forward right now.'

    return {
      primary: {
        action: softCloseIntent.futureInterest
          ? 'Decline as plans changed / maybe future'
          : 'Close inquiry as not moving forward',
        reason: `${closeReason} No reply is required unless you want to send a brief courtesy closeout.`,
        type: 'advance',
        actionUrl: `/inquiries/${inquiryId}`,
      },
      secondary: [
        {
          action: 'Send brief courtesy closeout',
          reason:
            'Optional. A short gracious reply is fine, but the system should not treat this as a response debt.',
          type: 'respond',
          actionUrl: `/inquiries/${inquiryId}`,
        },
      ],
      readySummary: softCloseIntent.futureInterest
        ? `${readySummary}. Client paused for now and expressed future interest.`
        : `${readySummary}. Client is not moving forward right now.`,
      slaStatus: 'no_sla',
      slaMinutesRemaining: null,
      softCloseWorkflow: { futureInterest: softCloseIntent.futureInterest },
    }
  }

  // ---------------------------------------------------------------------------
  // Decision tree (priority order)
  // ---------------------------------------------------------------------------

  // 1. Haven't responded yet? That's always #1
  if (!hasResponded && (status === 'new' || status === 'awaiting_chef')) {
    actions.push({
      action: 'Send first response',
      reason:
        slaStatus === 'overdue'
          ? 'SLA is overdue. Client is waiting for your first reply.'
          : `New inquiry needs a response. You have ${confirmedCount}/${totalItems} details confirmed.`,
      type: 'respond',
      actionUrl: `/inquiries/${inquiryId}`,
    })
  }

  // 2. Client replied and is waiting on chef
  if (hasResponded && status === 'awaiting_chef') {
    actions.push({
      action: 'Reply to client',
      reason: 'Client sent a new message. Review and respond.',
      type: 'respond',
      actionUrl: `/inquiries/${inquiryId}`,
    })
  }

  // 3. Missing critical path items - suggest asking for each
  if (criticalPath) {
    const missingItems = criticalPath.items.filter((i) => i.status === 'missing')
    const partialItems = criticalPath.items.filter((i) => i.status === 'partial')

    // Group missing items by blocking stage for smarter suggestions
    const quoteBlockers = missingItems.filter((i) => i.blocking_stage === 'quote')
    const shoppingBlockers = missingItems.filter((i) => i.blocking_stage === 'shopping')
    const menuBlockers = missingItems.filter((i) => i.blocking_stage === 'menu_lock')

    if (quoteBlockers.length > 0) {
      const missing = quoteBlockers.map((i) => i.label.toLowerCase()).join(', ')
      actions.push({
        action: `Ask for ${missing}`,
        reason: `Missing ${quoteBlockers.length} item${quoteBlockers.length > 1 ? 's' : ''} needed to create a quote.`,
        type: 'ask',
      })
    }

    if (shoppingBlockers.length > 0 && quoteBlockers.length === 0) {
      const missing = shoppingBlockers.map((i) => i.label.toLowerCase()).join(', ')
      actions.push({
        action: `Ask for ${missing}`,
        reason: `Quote-ready, but need ${missing} before you can shop.`,
        type: 'ask',
      })
    }

    if (menuBlockers.length > 0 && quoteBlockers.length === 0 && shoppingBlockers.length === 0) {
      const missing = menuBlockers.map((i) => i.label.toLowerCase()).join(', ')
      actions.push({
        action: `Confirm ${missing}`,
        reason: `Almost there. Need ${missing} to finalize the menu.`,
        type: 'ask',
      })
    }

    // Partial address
    for (const p of partialItems) {
      if (p.key === 'address') {
        actions.push({
          action: 'Ask for exact address',
          reason: `Have a general location (${p.value}) but need the full address for shopping and travel.`,
          type: 'ask',
        })
      }
    }
  }

  // 4. Ready to create a quote?
  if (criticalPath) {
    const quoteBlockers = criticalPath.items.filter(
      (i) => i.blocking_stage === 'quote' && i.status === 'missing'
    )
    if (quoteBlockers.length === 0 && status !== 'quoted' && status !== 'confirmed') {
      actions.push({
        action: 'Create a quote',
        reason: 'You have all the details needed to send a price quote.',
        type: 'advance',
        actionUrl: `/inquiries/${inquiryId}`,
      })
    }
  }

  // 5. Has dishes but no menu yet?
  if (hasDishes && status !== 'confirmed') {
    actions.push({
      action: 'Estimate menu cost',
      reason: `Client mentioned ${dishes!.length} dish${dishes!.length > 1 ? 'es' : ''}. Run a quick cost estimate.`,
      type: 'advance',
      actionUrl: '/menus/estimate',
    })
  }

  // 6. Waiting on client
  if (status === 'awaiting_client') {
    actions.push({
      action: 'Waiting on client reply',
      reason: "Ball is in the client's court. Follow up if no response soon.",
      type: 'wait',
    })
  }

  // ---------------------------------------------------------------------------
  // Build result
  // ---------------------------------------------------------------------------

  const primary = actions[0] ?? {
    action: 'Review inquiry',
    reason: 'Check the current state and decide next steps.',
    type: 'respond' as const,
    actionUrl: `/inquiries/${inquiryId}`,
  }

  return {
    primary,
    secondary: actions.slice(1),
    readySummary,
    slaStatus,
    slaMinutesRemaining,
  }
}

// ---------------------------------------------------------------------------
// Overdue inquiry check (for dashboard/notifications)
// Returns all inquiries where follow_up_due_at has passed without a response.
// ---------------------------------------------------------------------------

export async function getOverdueInquiries(): Promise<
  Array<{
    id: string
    contactName: string
    leadTier: string
    minutesOverdue: number
    followUpDueAt: string
  }>
> {
  const user = await requireChef()
  const db = createServerClient()

  const now = new Date().toISOString()

  const { data: overdue } = await db
    .from('inquiries')
    .select('id, contact_name, chef_likelihood, follow_up_due_at')
    .eq('tenant_id', user.tenantId!)
    .in('status', ['new', 'awaiting_chef'])
    .lt('follow_up_due_at', now)
    .order('follow_up_due_at', { ascending: true })
    .limit(20)

  if (!overdue || overdue.length === 0) return []

  return overdue.map((inq: any) => ({
    id: inq.id,
    contactName: inq.contact_name || 'Unknown',
    leadTier: (inq.chef_likelihood as string) || 'cold',
    minutesOverdue: Math.round(
      (Date.now() - new Date(inq.follow_up_due_at as string).getTime()) / 60000
    ),
    followUpDueAt: inq.follow_up_due_at as string,
  }))
}
