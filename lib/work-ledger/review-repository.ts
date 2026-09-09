import { mergeSessionWindows, splitSessionWindow } from './review'

type DbClient = any

async function getSession(db: DbClient, tenantId: string, sessionId: string) {
  const { data, error } = await db
    .from('work_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single()
  if (error || !data) throw new Error('Work session not found')
  if (data.status === 'superseded') throw new Error('Work session was already superseded')
  return data
}

async function evidenceIds(db: DbClient, sessionIds: string[]) {
  const { data, error } = await db
    .from('work_session_evidence')
    .select('evidence_id')
    .in('session_id', sessionIds)
  if (error) throw new Error('Failed to load session evidence')
  return [...new Set((data ?? []).map((row: any) => row.evidence_id))] as string[]
}

async function linkEvidence(db: DbClient, sessionId: string, ids: string[]) {
  if (ids.length === 0) return
  const { error } = await db
    .from('work_session_evidence')
    .insert(ids.map((evidenceId) => ({ session_id: sessionId, evidence_id: evidenceId })))
  if (error) throw new Error('Failed to preserve evidence links')
}

function replacementRow(tenantId: string, current: any, changes: Record<string, unknown>) {
  return {
    tenant_id: tenantId,
    actor_type: current.actor_type,
    actor_id: current.actor_id,
    activity_type: current.activity_type,
    event_id: current.event_id,
    client_id: current.client_id,
    project_key: current.project_key,
    started_at: current.started_at,
    ended_at: current.ended_at,
    duration_minutes: current.duration_minutes,
    duration_kind: current.duration_kind,
    status: current.duration_minutes === null ? 'review_required' : 'proposed',
    confidence_tier: current.confidence_tier,
    creation_mode: current.creation_mode,
    boundary_gap: current.boundary_gap,
    summary: current.summary,
    ...changes,
  }
}

async function supersede(
  db: DbClient,
  tenantId: string,
  current: any,
  replacementIds: string[],
  reviewerId: string,
  reason: string,
  replacementValues: Record<string, unknown>
) {
  const { error: historyError } = await db
    .from('work_session_corrections')
    .insert({
      tenant_id: tenantId,
      session_id: current.id,
      previous_values: current,
      replacement_values: { ...replacementValues, replacement_session_ids: replacementIds },
      correction_reason: reason,
      reviewer_id: reviewerId,
    })
  if (historyError) throw new Error('Failed to record correction history')
  const { error } = await db
    .from('work_sessions')
    .update({
      status: 'superseded',
      superseded_by: replacementIds[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', current.id)
    .eq('tenant_id', tenantId)
    .neq('status', 'superseded')
  if (error) throw new Error('Failed to supersede prior work session')
}

export async function correctWorkSession(
  db: DbClient,
  tenantId: string,
  reviewerId: string,
  input: {
    session_id: string
    activity_type: string
    started_at: string | null
    ended_at: string | null
    duration_minutes: number | null
    reason: string
  }
) {
  const current = await getSession(db, tenantId, input.session_id)
  const boundaryMinutes =
    input.started_at && input.ended_at
      ? Math.round((Date.parse(input.ended_at) - Date.parse(input.started_at)) / 60_000)
      : null
  const manualDuration =
    input.duration_minutes !== null && boundaryMinutes !== input.duration_minutes
  const changes = {
    activity_type: input.activity_type,
    started_at: input.started_at,
    ended_at: input.ended_at,
    duration_minutes: input.duration_minutes,
    duration_kind: input.duration_minutes !== null ? 'exact' : 'unknown',
    status: input.duration_minutes === null ? 'review_required' : 'proposed',
    confidence_tier: 'observed',
    creation_mode: manualDuration ? 'manual_log' : current.creation_mode,
    boundary_gap: manualDuration
      ? 'David supplied an exact duration that differs from the observed boundary window.'
      : input.started_at && input.ended_at
        ? null
        : 'Corrected duration without both clock boundaries.',
  }
  const { data: replacement, error } = await db
    .from('work_sessions')
    .insert(replacementRow(tenantId, current, changes))
    .select()
    .single()
  if (error) throw new Error('Failed to create corrected session')
  const links = await evidenceIds(db, [current.id])
  await linkEvidence(db, replacement.id, links)
  await supersede(db, tenantId, current, [replacement.id], reviewerId, input.reason, changes)
  return replacement
}

export async function splitWorkSession(
  db: DbClient,
  tenantId: string,
  reviewerId: string,
  sessionId: string,
  splitAt: string,
  reason: string
) {
  const current = await getSession(db, tenantId, sessionId)
  const parts = splitSessionWindow(current, splitAt)
  const replacements: any[] = []
  for (const part of parts) {
    const { data, error } = await db
      .from('work_sessions')
      .insert(replacementRow(tenantId, current, { ...part, status: 'proposed' }))
      .select()
      .single()
    if (error) throw new Error('Failed to create split session')
    replacements.push(data)
  }
  const links = await evidenceIds(db, [current.id])
  for (const replacement of replacements) await linkEvidence(db, replacement.id, links)
  await supersede(
    db,
    tenantId,
    current,
    replacements.map((row) => row.id),
    reviewerId,
    reason,
    { split_at: splitAt }
  )
  return replacements
}

export async function mergeWorkSessions(
  db: DbClient,
  tenantId: string,
  reviewerId: string,
  sessionIds: [string, string],
  reason: string
) {
  const { data, error } = await db
    .from('work_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .in('id', sessionIds)
  if (error || data?.length !== 2) throw new Error('Both work sessions are required')
  if (data.some((row: any) => row.status === 'superseded')) {
    throw new Error('A selected work session was already superseded')
  }
  const merged = mergeSessionWindows([data[0], data[1]])
  const { data: replacement, error: createError } = await db
    .from('work_sessions')
    .insert(replacementRow(tenantId, data[0], { ...merged, status: 'proposed' }))
    .select()
    .single()
  if (createError) throw new Error('Failed to create merged session')
  const links = await evidenceIds(db, sessionIds)
  await linkEvidence(db, replacement.id, links)
  for (const current of data) {
    await supersede(db, tenantId, current, [replacement.id], reviewerId, reason, {
      merged_session_ids: sessionIds,
    })
  }
  return replacement
}
