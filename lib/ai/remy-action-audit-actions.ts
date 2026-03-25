'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { toSafeJsonb } from '@/lib/ai/remy-action-audit-core'

export type RemyActionAuditStatus = 'started' | 'success' | 'error' | 'blocked'

export interface RemyActionAuditEntry {
  id: string
  taskType: string
  source: string
  status: RemyActionAuditStatus
  requestPayload: unknown
  resultPayload: unknown
  errorMessage: string | null
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  createdAt: string
}

export interface RemyActionAuditSummary {
  windowDays: number
  since: string
  total: number
  success: number
  blocked: number
  error: number
  started: number
  avgDurationMs: number | null
}

interface RawAuditRow {
  id: string
  task_type: string
  source: string
  status: RemyActionAuditStatus
  request_payload: unknown
  result_payload: unknown
  error_message: string | null
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  created_at: string
}

interface StartRemyActionAuditInput {
  tenantScopeId: string
  chefId: string
  authUserId: string
  taskType: string
  source?: string
  requestPayload?: unknown
}

interface FinishRemyActionAuditInput {
  auditId: string
  tenantScopeId: string
  status: Exclude<RemyActionAuditStatus, 'started'>
  resultPayload?: unknown
  errorMessage?: string | null
  durationMs?: number
}

function isRemyActionAuditMissingTableError(err: unknown): boolean {
  const rec = err as Record<string, unknown> | null
  const code = typeof rec?.code === 'string' ? rec.code : null
  const message = typeof rec?.message === 'string' ? rec.message : ''
  return code === '42P01' || message.includes('remy_action_audit_log')
}

export async function startRemyActionAudit(input: StartRemyActionAuditInput): Promise<string> {
  const db: any = createServerClient()
  const now = new Date().toISOString()

  const payload = {
    tenant_id: input.tenantScopeId,
    chef_id: input.chefId,
    auth_user_id: input.authUserId,
    task_type: input.taskType,
    source: input.source ?? 'remy.approve_task',
    status: 'started' as const,
    request_payload: toSafeJsonb(input.requestPayload),
    started_at: now,
  }

  const { data, error } = await db
    .from('remy_action_audit_log')
    .insert(payload)
    .select('id')
    .single()

  if (error || !data?.id) {
    throw new Error(`Failed to start Remy action audit log: ${error?.message ?? 'Unknown error'}`)
  }

  return data.id as string
}

export async function finishRemyActionAudit(input: FinishRemyActionAuditInput): Promise<void> {
  const db: any = createServerClient()

  const { error } = await db
    .from('remy_action_audit_log')
    .update({
      status: input.status,
      result_payload: toSafeJsonb(input.resultPayload),
      error_message: input.errorMessage ?? null,
      finished_at: new Date().toISOString(),
      duration_ms: typeof input.durationMs === 'number' ? Math.max(0, input.durationMs) : null,
    })
    .eq('id', input.auditId)
    .eq('tenant_id', input.tenantScopeId)

  if (error) {
    throw new Error(`Failed to finalize Remy action audit log: ${error.message}`)
  }
}

export async function listRemyActionAuditLog(input?: {
  limit?: number
  status?: RemyActionAuditStatus
  taskType?: string
}): Promise<RemyActionAuditEntry[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = Math.min(Math.max(Math.floor(input?.limit ?? 100), 1), 300)
  const status = input?.status
  const taskType = input?.taskType?.trim().toLowerCase()

  const db: any = createServerClient()
  let query = db
    .from('remy_action_audit_log')
    .select(
      'id, task_type, source, status, request_payload, result_payload, error_message, started_at, finished_at, duration_ms, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status) query = query.eq('status', status)
  if (taskType) query = query.eq('task_type', taskType)

  const { data, error } = await query

  if (error) {
    if (isRemyActionAuditMissingTableError(error)) {
      console.warn('[remy-action-audit] remy_action_audit_log table missing; returning empty list')
      return []
    }
    throw new Error(`Failed to load Remy action audit log: ${error.message}`)
  }

  return ((data ?? []) as RawAuditRow[]).map((row) => ({
    id: row.id,
    taskType: row.task_type,
    source: row.source,
    status: row.status,
    requestPayload: row.request_payload,
    resultPayload: row.result_payload,
    errorMessage: row.error_message,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    durationMs: row.duration_ms,
    createdAt: row.created_at,
  }))
}

export async function getRemyActionAuditSummary(windowDays = 14): Promise<RemyActionAuditSummary> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const safeWindowDays = Math.min(Math.max(Math.floor(windowDays), 1), 90)
  const since = new Date(Date.now() - safeWindowDays * 24 * 60 * 60 * 1000).toISOString()

  const db: any = createServerClient()
  const { data, error } = await db
    .from('remy_action_audit_log')
    .select('status, duration_ms')
    .eq('tenant_id', tenantId)
    .gte('created_at', since)

  if (error) {
    if (isRemyActionAuditMissingTableError(error)) {
      console.warn(
        '[remy-action-audit] remy_action_audit_log table missing; returning empty summary'
      )
      return {
        windowDays: safeWindowDays,
        since,
        total: 0,
        success: 0,
        blocked: 0,
        error: 0,
        started: 0,
        avgDurationMs: null,
      }
    }
    throw new Error(`Failed to load Remy action audit summary: ${error.message}`)
  }

  let success = 0
  let blocked = 0
  let failures = 0
  let started = 0
  let durationCount = 0
  let durationSum = 0

  for (const row of (data ?? []) as Array<{
    status: RemyActionAuditStatus
    duration_ms: number | null
  }>) {
    if (row.status === 'success') success += 1
    else if (row.status === 'blocked') blocked += 1
    else if (row.status === 'error') failures += 1
    else started += 1

    if (typeof row.duration_ms === 'number' && row.duration_ms >= 0) {
      durationSum += row.duration_ms
      durationCount += 1
    }
  }

  return {
    windowDays: safeWindowDays,
    since,
    total: (data ?? []).length,
    success,
    blocked,
    error: failures,
    started,
    avgDurationMs: durationCount > 0 ? Math.round(durationSum / durationCount) : null,
  }
}
