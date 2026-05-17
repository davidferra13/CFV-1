// CIL Auto-Dispatch: Signal Draft Generation Orchestrator
// Routes proactive signals to appropriate draft generators.
// Non-blocking: failures never break the signal pipeline.

import type { ProactiveSignal } from '@/lib/cil/types'
import type { DraftResult } from '@/lib/cil/draft-generators'
import { generatePipelineDraft } from '@/lib/cil/draft-generators/pipeline-draft'
import { generateCalendarDraft } from '@/lib/cil/draft-generators/calendar-draft'
import { generateFinanceDraft } from '@/lib/cil/draft-generators/finance-draft'
import { generateReputationDraft } from '@/lib/cil/draft-generators/reputation-draft'
import { createServerClient } from '@/lib/db/server'
import { createNotification } from '@/lib/notifications/actions'
import { recordSideEffectFailure } from '@/lib/monitoring/non-blocking'

// Signal sources that support auto-draft generation
const DRAFT_ELIGIBLE_SOURCES: Record<
  string,
  (s: ProactiveSignal, t: string) => Promise<DraftResult | null>
> = {
  'pipeline.staleLeads': generatePipelineDraft,
  'pipeline.expiringProposals': generatePipelineDraft,
  'calendar.deadSpots': generateCalendarDraft,
  'finance.overdueInvoices': generateFinanceDraft,
  'reputation.testimonialOpportunity': generateReputationDraft,
  'reputation.unreviewedEvents': generateReputationDraft,
}

/**
 * Main entry point: generate a draft action for a proactive signal.
 * Returns null if the signal type does not support drafts, or if
 * dedup/guards prevent generation.
 *
 * Non-blocking: catches all errors internally. Never throws.
 */
export async function generateSignalDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<DraftResult | null> {
  try {
    const generator = DRAFT_ELIGIBLE_SOURCES[signal.source]
    if (!generator) return null

    return await generator(signal, tenantId)
  } catch (err) {
    recordSideEffectFailure({
      source: 'cil',
      operation: 'auto-dispatch-generate',
      errorMessage: err instanceof Error ? err.message : String(err),
      severity: 'low',
    })
    return null
  }
}

/**
 * Save a generated draft to scheduled_messages and notify the chef.
 * Called after generateSignalDraft returns a non-null result.
 *
 * Non-blocking: catches all errors internally. Never throws.
 */
export async function persistDraftAndNotify(
  draft: DraftResult,
  tenantId: string,
  signal: ProactiveSignal
): Promise<void> {
  try {
    const db = createServerClient()

    // Save to scheduled_messages as a draft for chef review
    await db.from('scheduled_messages').insert({
      tenant_id: tenantId,
      client_id: draft.recipientId || null,
      channel: draft.type === 'email' ? 'email' : 'notification',
      status: 'draft',
      subject: draft.subject || null,
      body: draft.body,
      recipient_email: draft.recipientId ? undefined : undefined,
      metadata: {
        ...draft.metadata,
        ai_generated: draft.metadata.aiGenerated,
        origin: 'cil_auto_dispatch',
      },
    })

    // Notify chef that a draft is ready for review
    await createNotification({
      tenantId,
      recipientId: tenantId,
      category: 'ops',
      action: 'system_alert' as any,
      title: `Draft ready: ${signal.title}`,
      body: `An actionable draft was generated from a ${draft.metadata.draftType.replace(/_/g, ' ')} signal. Review it in your message center.`,
      actionUrl: '/messages?filter=drafts',
      metadata: {
        origin: 'cil_auto_dispatch',
        draftType: draft.metadata.draftType,
        signalSource: signal.source,
      },
    })
  } catch (err) {
    recordSideEffectFailure({
      source: 'cil',
      operation: 'auto-dispatch-persist',
      errorMessage: err instanceof Error ? err.message : String(err),
      severity: 'low',
    })
  }
}

/**
 * Combined convenience: generate + persist in one call.
 * Intended to be called from signal-actions.ts after the primary dispatch.
 *
 * Non-blocking: catches all errors. Returns boolean for diagnostics only.
 */
export async function autoDispatchDraft(
  signal: ProactiveSignal,
  tenantId: string
): Promise<boolean> {
  try {
    const draft = await generateSignalDraft(signal, tenantId)
    if (!draft) return false

    await persistDraftAndNotify(draft, tenantId, signal)
    return true
  } catch {
    return false
  }
}
