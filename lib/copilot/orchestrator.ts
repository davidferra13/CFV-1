import { createServerClient } from '@/lib/db/server'
import { OPS_AUTONOMY_LEVEL } from '@/lib/features'
import type { CopilotPlan, CopilotRecommendation, CopilotRunResult, CopilotSeverity } from './types'

function clampConfidence(value: number): number {
  if (value < 0) return 0
  if (value > 1) return 1
  return value
}

function rec(input: {
  recommendationType: string
  title: string
  body: string
  severity: CopilotSeverity
  confidence: number
  payload?: Record<string, unknown>
}): CopilotRecommendation {
  return {
    recommendationType: input.recommendationType,
    title: input.title,
    body: input.body,
    severity: input.severity,
    confidence: clampConfidence(input.confidence),
    payload: input.payload || {},
  }
}

function summarize(plan: Omit<CopilotPlan, 'summary'>): CopilotPlan['summary'] {
  const all = [
    ...plan.alerts,
    ...plan.recommendedActions,
    ...plan.safeAutoActions,
    ...plan.blockedActions,
  ]

  return {
    criticalCount: all.filter((x) => x.severity === 'critical').length,
    highCount: all.filter((x) => x.severity === 'high').length,
    normalCount: all.filter((x) => x.severity === 'normal').length,
    lowCount: all.filter((x) => x.severity === 'low').length,
    generatedAt: new Date().toISOString(),
  }
}

async function fetchOpsSignals(tenantId: string) {
  const db: any = createServerClient({ admin: true })
  const now = new Date()
  const inThreeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const inSevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { data: commRows },
    { data: overdueFollowups },
    { data: expiringQuotes },
    { data: paymentRiskEvents },
  ] = await Promise.all([
    db
      .from('communication_inbox_items' as any)
      .select('tab')
      .eq('tenant_id', tenantId),
    db
      .from('inquiries')
      .select('id, follow_up_due_at, status')
      .eq('tenant_id', tenantId)
      .eq('status', 'awaiting_client')
      .not('follow_up_due_at', 'is', null)
      .lte('follow_up_due_at', now.toISOString())
      .limit(50),
    db
      .from('quotes')
      .select('id, valid_until, total_quoted_cents')
      .eq('tenant_id', tenantId)
      .eq('status', 'sent')
      .not('valid_until', 'is', null)
      .lte('valid_until', inThreeDays)
      .limit(50),
    db
      .from('event_financial_summary')
      .select('event_id, outstanding_balance_cents')
      .eq('tenant_id', tenantId)
      .gt('outstanding_balance_cents', 0),
  ])

  let unlinked = 0
  let needsAttention = 0
  let snoozed = 0
  for (const row of commRows || []) {
    const tab = String(row.tab || '')
    if (tab === 'unlinked') unlinked++
    if (tab === 'needs_attention') needsAttention++
    if (tab === 'snoozed') snoozed++
  }

  // Payment risk: outstanding + event inside 7 days.
  const paymentRisk = [] as Array<{ eventId: string; outstanding: number }>
  if ((paymentRiskEvents || []).length > 0) {
    const eventIds = paymentRiskEvents.map((x: any) => x.event_id).filter(Boolean)

    if (eventIds.length > 0) {
      const { data: nearEvents } = await db
        .from('events')
        .select('id, event_date, status')
        .eq('tenant_id', tenantId)
        .in('id', eventIds)
        .gte('event_date', now.toISOString())
        .lte('event_date', inSevenDays)
        .not('status', 'in', '("cancelled","completed")')

      const nearEventIdSet = new Set((nearEvents || []).map((x: any) => x.id))
      for (const fin of paymentRiskEvents || []) {
        if (nearEventIdSet.has(fin.event_id)) {
          paymentRisk.push({
            eventId: fin.event_id,
            outstanding: fin.outstanding_balance_cents ?? 0,
          })
        }
      }
    }
  }

  return {
    communication: { unlinked, needsAttention, snoozed },
    overdueFollowups: overdueFollowups || [],
    expiringQuotes: expiringQuotes || [],
    paymentRisk,
    criticalQueueCount: 0,
  }
}

function buildPlan(
  tenantId: string,
  signals: Awaited<ReturnType<typeof fetchOpsSignals>>
): CopilotPlan {
  const alerts: CopilotRecommendation[] = []
  const recommendedActions: CopilotRecommendation[] = []
  const safeAutoActions: CopilotRecommendation[] = []
  const blockedActions: CopilotRecommendation[] = []

  if (signals.communication.needsAttention > 0) {
    alerts.push(
      rec({
        recommendationType: 'communication_attention',
        title: 'Threads need attention',
        body: `${signals.communication.needsAttention} communication threads need attention.`,
        severity: signals.communication.needsAttention > 10 ? 'high' : 'normal',
        confidence: 0.98,
        payload: { count: signals.communication.needsAttention },
      })
    )
  }

  if (signals.communication.unlinked > 0) {
    recommendedActions.push(
      rec({
        recommendationType: 'link_unassigned_communication',
        title: 'Link unassigned messages',
        body: `${signals.communication.unlinked} unlinked communication events can be mapped to inquiries/events.`,
        severity: signals.communication.unlinked > 10 ? 'high' : 'normal',
        confidence: 0.91,
        payload: { count: signals.communication.unlinked },
      })
    )
  }

  if (signals.overdueFollowups.length > 0) {
    recommendedActions.push(
      rec({
        recommendationType: 'follow_up_overdue',
        title: 'Follow-ups overdue',
        body: `${signals.overdueFollowups.length} inquiries have overdue follow-ups.`,
        severity: signals.overdueFollowups.length > 5 ? 'critical' : 'high',
        confidence: 0.99,
        payload: { count: signals.overdueFollowups.length },
      })
    )
  }

  if (signals.expiringQuotes.length > 0) {
    recommendedActions.push(
      rec({
        recommendationType: 'quote_expiring',
        title: 'Quotes expiring soon',
        body: `${signals.expiringQuotes.length} sent quotes expire within 3 days.`,
        severity: signals.expiringQuotes.length > 3 ? 'high' : 'normal',
        confidence: 0.97,
        payload: { count: signals.expiringQuotes.length },
      })
    )
  }

  if (signals.paymentRisk.length > 0) {
    alerts.push(
      rec({
        recommendationType: 'payment_risk',
        title: 'Upcoming events with unpaid balances',
        body: `${signals.paymentRisk.length} upcoming events are still carrying outstanding balances.`,
        severity: signals.paymentRisk.length > 2 ? 'critical' : 'high',
        confidence: 0.95,
        payload: { events: signals.paymentRisk },
      })
    )
  }

  if (signals.criticalQueueCount > 0) {
    alerts.push(
      rec({
        recommendationType: 'critical_queue',
        title: 'Critical queue backlog',
        body: `${signals.criticalQueueCount} critical queue items are pending.`,
        severity: 'high',
        confidence: 0.9,
        payload: { count: signals.criticalQueueCount },
      })
    )
  }

  // Level 2 only: deterministic, non-destructive actions.
  if (OPS_AUTONOMY_LEVEL === 2 && signals.overdueFollowups.length > 0) {
    safeAutoActions.push(
      rec({
        recommendationType: 'auto_notify_followup_overdue',
        title: 'Auto-notify overdue follow-ups',
        body: 'Allowlisted: create internal notifications for overdue follow-up items.',
        severity: 'normal',
        confidence: 0.93,
        payload: { count: signals.overdueFollowups.length, action_key: 'notify_followup_overdue' },
      })
    )
  } else if (signals.overdueFollowups.length > 0) {
    blockedActions.push(
      rec({
        recommendationType: 'blocked_auto_action',
        title: 'Auto-action blocked by autonomy level',
        body: 'Overdue follow-up auto-notification is available at autonomy level 2.',
        severity: 'low',
        confidence: 1,
        payload: { required_level: 2, current_level: OPS_AUTONOMY_LEVEL },
      })
    )
  }

  const base = {
    tenantId,
    alerts,
    recommendedActions,
    safeAutoActions,
    blockedActions,
  }
  return { ...base, summary: summarize(base) }
}

async function persistRun(input: {
  tenantId: string
  status: 'success' | 'partial' | 'failed'
  plan: CopilotPlan
  errors: string[]
  startedAt: number
}): Promise<string> {
  const db: any = createServerClient({ admin: true })
  const durationMs = Date.now() - input.startedAt

  const { data: run, error: runError } = await db
    .from('copilot_runs' as any)
    .insert({
      tenant_id: input.tenantId,
      run_source: 'scheduled',
      status: input.status,
      autonomy_level: OPS_AUTONOMY_LEVEL,
      plan_payload: input.plan,
      summary: input.plan.summary,
      completed_at: new Date().toISOString(),
      duration_ms: durationMs,
    })
    .select('id')
    .single()

  if (runError || !run?.id) {
    throw new Error(`Failed to persist copilot run: ${runError?.message || 'unknown'}`)
  }

  const recRows = [
    ...input.plan.alerts,
    ...input.plan.recommendedActions,
    ...input.plan.safeAutoActions,
    ...input.plan.blockedActions,
  ].map((r) => ({
    tenant_id: input.tenantId,
    run_id: run.id,
    recommendation_type: r.recommendationType,
    title: r.title,
    body: r.body,
    severity: r.severity,
    confidence: r.confidence,
    payload: r.payload,
  }))

  if (recRows.length > 0) {
    await db.from('copilot_recommendations' as any).insert(recRows)
  }

  if (input.errors.length > 0) {
    await db.from('copilot_run_errors' as any).insert(
      input.errors.map((message) => ({
        tenant_id: input.tenantId,
        run_id: run.id,
        error_scope: 'run',
        error_message: message,
      }))
    )
  }

  return run.id
}

export async function runCopilotForTenant(tenantId: string): Promise<CopilotRunResult> {
  const startedAt = Date.now()
  const errors: string[] = []
  let status: CopilotRunResult['status'] = 'success'

  try {
    const signals = await fetchOpsSignals(tenantId)
    const plan = buildPlan(tenantId, signals)
    const runId = await persistRun({
      tenantId,
      status,
      plan,
      errors,
      startedAt,
    })

    return {
      runId,
      plan,
      status,
      errors,
      durationMs: Date.now() - startedAt,
    }
  } catch (err) {
    status = 'failed'
    errors.push((err as Error).message)
    const plan = buildPlan(tenantId, {
      communication: { unlinked: 0, needsAttention: 0, snoozed: 0 },
      overdueFollowups: [],
      expiringQuotes: [],
      paymentRisk: [],
      criticalQueueCount: 0,
    })

    const runId = await persistRun({
      tenantId,
      status,
      plan,
      errors,
      startedAt,
    })

    return {
      runId,
      plan,
      status,
      errors,
      durationMs: Date.now() - startedAt,
    }
  }
}
