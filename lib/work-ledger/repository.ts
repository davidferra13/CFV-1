import { inferWorkSessions } from './inference'
import { summarizeApprovedWork } from './summary'
import type { WorkEvidenceInput } from './types'
import type { ManualClockInInput, WorkEvidencePayload } from './validators'

type DbClient = any

export interface EvidenceIngestResult {
  id: string
  sourceRecordId: string
  disposition: 'created' | 'existing' | 'conflict'
}

function evidenceInsert(tenantId: string, input: WorkEvidencePayload) {
  return {
    tenant_id: tenantId,
    source_type: input.source_type,
    source_account: input.source_account ?? null,
    source_record_id: input.source_record_id,
    source_hash: input.source_hash,
    source_created_at: input.source_created_at ?? null,
    interval_start: input.interval_start ?? null,
    interval_end: input.interval_end ?? null,
    actor_type: input.actor_type,
    actor_id: input.actor_id ?? null,
    event_id: input.event_id ?? null,
    client_id: input.client_id ?? null,
    project_key: input.project_key ?? null,
    activity_hint: input.activity_hint ?? null,
    signal_type: input.signal_type,
    signal_summary: input.signal_summary,
    minimal_metadata: input.minimal_metadata,
    privacy_class: input.privacy_class,
  }
}

export async function ingestEvidenceBatch(
  db: DbClient,
  tenantId: string,
  inputs: WorkEvidencePayload[]
): Promise<EvidenceIngestResult[]> {
  const results: EvidenceIngestResult[] = []
  for (const input of inputs) {
    const { data, error } = await db
      .from('work_evidence')
      .insert(evidenceInsert(tenantId, input))
      .select('id, source_hash')
      .single()
    if (!error) {
      results.push({ id: data.id, sourceRecordId: input.source_record_id, disposition: 'created' })
      continue
    }
    if (error.code !== '23505')
      throw new Error(`Evidence insert failed: ${error.code ?? 'unknown'}`)

    let query = db
      .from('work_evidence')
      .select('id, source_hash')
      .eq('tenant_id', tenantId)
      .eq('source_type', input.source_type)
      .eq('source_record_id', input.source_record_id)
    query =
      input.source_account == null
        ? query.is('source_account', null)
        : query.eq('source_account', input.source_account)
    const { data: existing, error: lookupError } = await query.single()
    if (lookupError || !existing) throw new Error('Duplicate evidence could not be resolved')
    results.push({
      id: existing.id,
      sourceRecordId: input.source_record_id,
      disposition: existing.source_hash === input.source_hash ? 'existing' : 'conflict',
    })
  }
  return results
}

function toInferenceInput(row: any): WorkEvidenceInput {
  return {
    id: row.id,
    sourceType: row.source_type,
    sourceRecordId: row.source_record_id,
    actorType: row.actor_type,
    signalType: row.signal_type,
    activityHint: row.activity_hint,
    sourceCreatedAt: row.source_created_at,
    intervalStart: row.interval_start,
    intervalEnd: row.interval_end,
    eventId: row.event_id,
    clientId: row.client_id,
    projectKey: row.project_key,
  }
}

export async function reconstructWorkSessions(
  db: DbClient,
  tenantId: string,
  startAt: string,
  endAt: string
) {
  const { data: evidence, error } = await db
    .from('work_evidence')
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`source_created_at.gte.${startAt},interval_start.gte.${startAt}`)
    .or(`source_created_at.lte.${endAt},interval_start.lte.${endAt}`)
    .order('source_created_at', { ascending: true })
    .limit(10000)
  if (error) throw new Error('Failed to load work evidence')

  const { data: tenantSessions } = await db
    .from('work_sessions')
    .select('id')
    .eq('tenant_id', tenantId)
    .limit(10000)
  const sessionIds = (tenantSessions ?? []).map((row: any) => row.id)
  const linkedIds = new Set<string>()
  if (sessionIds.length > 0) {
    const { data: links } = await db
      .from('work_session_evidence')
      .select('evidence_id')
      .in('session_id', sessionIds)
    for (const link of links ?? []) linkedIds.add(link.evidence_id)
  }

  const available = (evidence ?? []).filter((row: any) => !linkedIds.has(row.id))
  const inferred = inferWorkSessions(available.map(toInferenceInput))
  const created: any[] = []
  for (const session of inferred) {
    const { data: inserted, error: insertError } = await db
      .from('work_sessions')
      .insert({
        tenant_id: tenantId,
        actor_type: session.actorType,
        activity_type: session.activityType,
        event_id: session.eventId,
        client_id: session.clientId,
        project_key: session.projectKey,
        started_at: session.startedAt,
        ended_at: session.endedAt,
        duration_minutes: session.durationMinutes,
        duration_kind: session.durationKind,
        status: session.status,
        confidence_tier: session.confidenceTier,
        creation_mode: session.creationMode,
        boundary_gap: session.boundaryGap,
        summary: session.summary,
      })
      .select()
      .single()
    if (insertError) throw new Error('Failed to create work session proposal')
    const links = session.evidenceIds.map((evidenceId) => ({
      session_id: inserted.id,
      evidence_id: evidenceId,
      evidence_role: 'supporting',
    }))
    const { error: linkError } = await db.from('work_session_evidence').insert(links)
    if (linkError) throw new Error('Failed to link work session evidence')
    created.push(inserted)
  }
  return { created, skippedEvidenceCount: linkedIds.size }
}

export async function getWorkLedgerSnapshot(db: DbClient, tenantId: string) {
  const [{ data: sessions, error }, { data: devices }, { data: corrections }] = await Promise.all([
    db
      .from('work_sessions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('started_at', { ascending: false })
      .limit(250),
    db
      .from('work_capture_devices')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('last_evidence_at', { ascending: false }),
    db
      .from('work_session_corrections')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(100),
  ])
  if (error) throw new Error('Failed to load work ledger')
  const rows = sessions ?? []
  const sessionIds = rows.map((row: any) => row.id)
  const evidenceCounts = new Map<string, number>()
  if (sessionIds.length > 0) {
    const { data: links } = await db
      .from('work_session_evidence')
      .select('session_id')
      .in('session_id', sessionIds)
    for (const link of links ?? []) {
      evidenceCounts.set(link.session_id, (evidenceCounts.get(link.session_id) ?? 0) + 1)
    }
  }
  const sessionsWithEvidence = rows.map((row: any) => ({
    ...row,
    evidence_count: evidenceCounts.get(row.id) ?? 0,
  }))
  const approvedTotals = summarizeApprovedWork(
    rows.map((row: any) => ({
      actorType: row.actor_type,
      status: row.status,
      durationMinutes: row.duration_minutes,
    }))
  )
  return {
    sessions: sessionsWithEvidence,
    devices: devices ?? [],
    corrections: corrections ?? [],
    approvedTotals,
    openClock:
      rows.find(
        (row: any) =>
          row.creation_mode === 'manual_clock' && row.ended_at === null && row.status !== 'rejected'
      ) ?? null,
  }
}

export async function clockInWork(
  db: DbClient,
  tenantId: string,
  reviewerId: string,
  input: ManualClockInInput
) {
  const { data: existing } = await db
    .from('work_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('creation_mode', 'manual_clock')
    .is('ended_at', null)
    .neq('status', 'rejected')
    .maybeSingle()
  if (existing) return { session: existing, disposition: 'existing' as const }

  const { data, error } = await db
    .from('work_sessions')
    .insert({
      tenant_id: tenantId,
      actor_type: input.actor_type,
      activity_type: input.activity_type,
      event_id: input.event_id ?? null,
      client_id: input.client_id ?? null,
      project_key: input.project_key ?? null,
      started_at: new Date().toISOString(),
      duration_minutes: null,
      duration_kind: 'exact',
      status: 'approved',
      confidence_tier: 'observed',
      creation_mode: 'manual_clock',
      summary: input.summary,
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
    })
    .select()
    .single()
  if (error)
    throw new Error(error.code === '23505' ? 'A clock is already running' : 'Clock in failed')
  return { session: data, disposition: 'created' as const }
}

export async function clockOutWork(db: DbClient, tenantId: string, reviewerId: string) {
  const { data: open, error: findError } = await db
    .from('work_sessions')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('creation_mode', 'manual_clock')
    .is('ended_at', null)
    .neq('status', 'rejected')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (findError) throw new Error('Failed to read current clock')
  if (!open) return { session: null, disposition: 'already_stopped' as const }

  const endedAt = new Date()
  const minutes = Math.max(
    1,
    Math.round((endedAt.getTime() - Date.parse(open.started_at)) / 60_000)
  )
  const { data, error } = await db
    .from('work_sessions')
    .update({
      ended_at: endedAt.toISOString(),
      duration_minutes: minutes,
      reviewed_by: reviewerId,
      reviewed_at: endedAt.toISOString(),
      updated_at: endedAt.toISOString(),
    })
    .eq('id', open.id)
    .eq('tenant_id', tenantId)
    .is('ended_at', null)
    .select()
    .maybeSingle()
  if (error) throw new Error('Clock out failed')
  return { session: data, disposition: data ? ('stopped' as const) : ('already_stopped' as const) }
}
export async function reviewWorkSession(
  db: DbClient,
  tenantId: string,
  reviewerId: string,
  sessionId: string,
  decision: 'approved' | 'rejected',
  reason: string
) {
  const { data: current, error: readError } = await db
    .from('work_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .single()
  if (readError || !current) throw new Error('Work session not found')
  if (decision === 'approved' && current.duration_minutes === null) {
    throw new Error('Unknown-duration sessions must be corrected before approval')
  }
  const reviewedAt = new Date().toISOString()
  const { error: correctionError } = await db.from('work_session_corrections').insert({
    tenant_id: tenantId,
    session_id: sessionId,
    previous_values: { status: current.status },
    replacement_values: { status: decision },
    correction_reason: reason,
    reviewer_id: reviewerId,
  })
  if (correctionError) throw new Error('Failed to record review history')
  const { data, error } = await db
    .from('work_sessions')
    .update({
      status: decision,
      reviewed_by: reviewerId,
      reviewed_at: reviewedAt,
      updated_at: reviewedAt,
    })
    .eq('id', sessionId)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  if (error) throw new Error('Failed to review work session')
  return data
}
