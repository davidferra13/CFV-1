'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  WaitingStateEntry,
  WaitingReason,
  TimeoutAction,
  NudgeTemplate,
  NudgeChannel,
  WaitingStateSummary,
} from './waiting-state-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapEntry(r: any): WaitingStateEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    eventId: r.event_id,
    lifecycleStage: r.lifecycle_stage,
    reason: r.reason as WaitingReason,
    waitingOn: r.waiting_on,
    description: r.description,
    startedAt: new Date(r.started_at),
    resolvedAt: r.resolved_at ? new Date(r.resolved_at) : null,
    escalationLevel: r.escalation_level ?? 0,
    lastNudgeAt: r.last_nudge_at ? new Date(r.last_nudge_at) : null,
    timeoutAt: r.timeout_at ? new Date(r.timeout_at) : null,
    timeoutAction: r.timeout_action as TimeoutAction | null,
    createdAt: new Date(r.created_at),
  }
}

function mapTemplate(r: any): NudgeTemplate {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    reason: r.reason as WaitingReason,
    channel: r.channel as NudgeChannel,
    templateText: r.template_text,
    delayDays: r.delay_days ?? 0,
    createdAt: new Date(r.created_at),
  }
}

// ---------------------------------------------------------------------------
// 1. getWaitingStates
// ---------------------------------------------------------------------------

export async function getWaitingStates(eventId?: string): Promise<WaitingStateEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM waiting_state_entries WHERE tenant_id = $1'
  if (eventId) {
    query += ' AND event_id = $2'
    params.push(eventId)
  }
  query += ' ORDER BY started_at DESC'
  const rows = await db.query(query, params)
  return rows.map(mapEntry)
}

// ---------------------------------------------------------------------------
// 2. createWaitingState
// ---------------------------------------------------------------------------

export async function createWaitingState(params: {
  eventId?: string
  lifecycleStage: string
  reason: WaitingReason
  waitingOn: string
  description?: string
  timeoutAt?: Date
  timeoutAction?: TimeoutAction
}): Promise<WaitingStateEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO waiting_state_entries
       (tenant_id, event_id, lifecycle_stage, reason, waiting_on, description, timeout_at, timeout_action)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      user.tenantId,
      params.eventId ?? null,
      params.lifecycleStage,
      params.reason,
      params.waitingOn,
      params.description ?? null,
      params.timeoutAt?.toISOString() ?? null,
      params.timeoutAction ?? null,
    ]
  )
  return mapEntry(rows[0])
}

// ---------------------------------------------------------------------------
// 3. resolveWaitingState
// ---------------------------------------------------------------------------

export async function resolveWaitingState(id: string): Promise<WaitingStateEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `UPDATE waiting_state_entries
     SET resolved_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING *`,
    [id, user.tenantId]
  )
  if (!rows.length) throw new Error('Waiting state entry not found')
  return mapEntry(rows[0])
}

// ---------------------------------------------------------------------------
// 4. getNudgeTemplates
// ---------------------------------------------------------------------------

export async function getNudgeTemplates(reason?: WaitingReason): Promise<NudgeTemplate[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM nudge_templates WHERE tenant_id = $1'
  if (reason) {
    query += ' AND reason = $2'
    params.push(reason)
  }
  query += ' ORDER BY reason, delay_days'
  const rows = await db.query(query, params)
  return rows.map(mapTemplate)
}

// ---------------------------------------------------------------------------
// 5. upsertNudgeTemplate
// ---------------------------------------------------------------------------

export async function upsertNudgeTemplate(params: {
  reason: WaitingReason
  channel: NudgeChannel
  templateText: string
  delayDays: number
}): Promise<NudgeTemplate> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO nudge_templates (tenant_id, reason, channel, template_text, delay_days)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, reason, channel)
     DO UPDATE SET template_text = $4, delay_days = $5
     RETURNING *`,
    [user.tenantId, params.reason, params.channel, params.templateText, params.delayDays]
  )
  return mapTemplate(rows[0])
}

// ---------------------------------------------------------------------------
// 6. getOverdueWaitingStates
// ---------------------------------------------------------------------------

export async function getOverdueWaitingStates(): Promise<WaitingStateEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `SELECT * FROM waiting_state_entries
     WHERE tenant_id = $1
       AND resolved_at IS NULL
       AND timeout_at IS NOT NULL
       AND timeout_at < NOW()
     ORDER BY timeout_at ASC`,
    [user.tenantId]
  )
  return rows.map(mapEntry)
}

// ---------------------------------------------------------------------------
// 7. getWaitingStateSummary
// ---------------------------------------------------------------------------

export async function getWaitingStateSummary(): Promise<WaitingStateSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const totalRows = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS total_waiting,
       COUNT(*) FILTER (WHERE resolved_at IS NOT NULL)::int AS resolved_count,
       COALESCE(AVG(
         EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - started_at)) / 86400
       ), 0)::numeric(10,1) AS avg_wait_days,
       COUNT(*) FILTER (WHERE resolved_at IS NULL AND timeout_at IS NOT NULL AND timeout_at < NOW())::int AS overdue_count
     FROM waiting_state_entries
     WHERE tenant_id = $1`,
    [user.tenantId]
  )

  const reasonRows = await db.query(
    `SELECT reason, COUNT(*)::int AS cnt
     FROM waiting_state_entries
     WHERE tenant_id = $1 AND resolved_at IS NULL
     GROUP BY reason`,
    [user.tenantId]
  )

  const byReason: Record<string, number> = {}
  for (const r of reasonRows) {
    byReason[r.reason] = r.cnt
  }

  const row = totalRows[0] ?? {}
  return {
    totalWaiting: row.total_waiting ?? 0,
    resolvedCount: row.resolved_count ?? 0,
    avgWaitDays: parseFloat(row.avg_wait_days ?? '0'),
    overdueCount: row.overdue_count ?? 0,
    byReason: byReason as WaitingStateSummary['byReason'],
  }
}
