import { pgClient } from '@/lib/db'
import type { DerivedOutputProvenance } from '@/lib/analytics/source-provenance'
import type {
  PlanningDataQualitySummary,
  PlanningRunSource,
  PlanningRunStatus,
} from '@/lib/planning/contracts'

export type PlanningRunRecord = {
  id: string
  tenantId: string
  runType: string
  runSource: PlanningRunSource
  status: PlanningRunStatus
  scopeKey: string
  asOfDate: string
  horizonMonths: number
  generatorVersion: string
  requestPayload: Record<string, unknown>
  summaryPayload: Record<string, unknown>
  errorPayload: Record<string, unknown>
  startedAt: string
  completedAt: string | null
}

export type PlanningArtifactRecord = {
  id: string
  tenantId: string
  runId: string
  artifactKey: string
  artifactVersion: string
  payload: Record<string, unknown>
  provenance: DerivedOutputProvenance
  dataQuality: PlanningDataQualitySummary
  createdAt: string
}

export type PlanningArtifactEnvelope = {
  run: PlanningRunRecord
  artifact: PlanningArtifactRecord
}

type RawPlanningArtifactRow = {
  run_id: string
  tenant_id: string
  run_type: string
  run_source: PlanningRunSource
  run_status: PlanningRunStatus
  scope_key: string
  as_of_date: string
  horizon_months: number
  generator_version: string
  request_payload: Record<string, unknown> | null
  summary_payload: Record<string, unknown> | null
  error_payload: Record<string, unknown> | null
  started_at: string
  completed_at: string | null
  artifact_id: string
  artifact_key: string
  artifact_version: string
  payload: Record<string, unknown> | null
  provenance: DerivedOutputProvenance | null
  data_quality: PlanningDataQualitySummary | null
  created_at: string
}

function mapPlanningRunRecord(row: {
  id: string
  tenant_id: string
  run_type: string
  run_source: PlanningRunSource
  status: PlanningRunStatus
  scope_key: string
  as_of_date: string
  horizon_months: number
  generator_version: string
  request_payload: Record<string, unknown> | null
  summary_payload: Record<string, unknown> | null
  error_payload: Record<string, unknown> | null
  started_at: string
  completed_at: string | null
}): PlanningRunRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    runType: row.run_type,
    runSource: row.run_source,
    status: row.status,
    scopeKey: row.scope_key,
    asOfDate: row.as_of_date,
    horizonMonths: Number(row.horizon_months ?? 0),
    generatorVersion: row.generator_version,
    requestPayload: row.request_payload ?? {},
    summaryPayload: row.summary_payload ?? {},
    errorPayload: row.error_payload ?? {},
    startedAt: row.started_at,
    completedAt: row.completed_at,
  }
}

function mapPlanningArtifactEnvelope(row: RawPlanningArtifactRow): PlanningArtifactEnvelope {
  return {
    run: {
      id: row.run_id,
      tenantId: row.tenant_id,
      runType: row.run_type,
      runSource: row.run_source,
      status: row.run_status,
      scopeKey: row.scope_key,
      asOfDate: row.as_of_date,
      horizonMonths: Number(row.horizon_months ?? 0),
      generatorVersion: row.generator_version,
      requestPayload: row.request_payload ?? {},
      summaryPayload: row.summary_payload ?? {},
      errorPayload: row.error_payload ?? {},
      startedAt: row.started_at,
      completedAt: row.completed_at,
    },
    artifact: {
      id: row.artifact_id,
      tenantId: row.tenant_id,
      runId: row.run_id,
      artifactKey: row.artifact_key,
      artifactVersion: row.artifact_version,
      payload: row.payload ?? {},
      provenance: (row.provenance ?? {}) as DerivedOutputProvenance,
      dataQuality: (row.data_quality ?? {
        overallStatus: 'warn',
        warningCount: 0,
        failureCount: 0,
        checks: [],
      }) as PlanningDataQualitySummary,
      createdAt: row.created_at,
    },
  }
}

export async function createPlanningRun(input: {
  tenantId: string
  runType: string
  runSource: PlanningRunSource
  scopeKey: string
  asOfDate: string
  horizonMonths: number
  generatorVersion: string
  requestPayload: Record<string, unknown>
}): Promise<PlanningRunRecord> {
  const rows = await pgClient<
    {
      id: string
      tenant_id: string
      run_type: string
      run_source: PlanningRunSource
      status: PlanningRunStatus
      scope_key: string
      as_of_date: string
      horizon_months: number
      generator_version: string
      request_payload: Record<string, unknown> | null
      summary_payload: Record<string, unknown> | null
      error_payload: Record<string, unknown> | null
      started_at: string
      completed_at: string | null
    }[]
  >`
    INSERT INTO planning_runs (
      tenant_id,
      run_type,
      run_source,
      status,
      scope_key,
      as_of_date,
      horizon_months,
      generator_version,
      request_payload
    )
    VALUES (
      ${input.tenantId},
      ${input.runType},
      ${input.runSource},
      'running',
      ${input.scopeKey},
      ${input.asOfDate},
      ${input.horizonMonths},
      ${input.generatorVersion},
      ${JSON.stringify(input.requestPayload)}::jsonb
    )
    RETURNING
      id,
      tenant_id,
      run_type,
      run_source,
      status,
      scope_key,
      as_of_date,
      horizon_months,
      generator_version,
      request_payload,
      summary_payload,
      error_payload,
      started_at,
      completed_at
  `

  const row = rows[0]
  if (!row) throw new Error('Failed to create planning run')
  return mapPlanningRunRecord(row)
}

export async function completePlanningRun(input: {
  runId: string
  summaryPayload: Record<string, unknown>
  artifact: {
    tenantId: string
    artifactKey: string
    artifactVersion: string
    payload: Record<string, unknown>
    provenance: DerivedOutputProvenance
    dataQuality: PlanningDataQualitySummary
  }
}): Promise<PlanningArtifactEnvelope> {
  const rows = await pgClient.begin(async (sql) => {
    const tx = sql as unknown as typeof pgClient

    await tx`
      UPDATE planning_runs
      SET
        status = 'completed',
        summary_payload = ${JSON.stringify(input.summaryPayload)}::jsonb,
        completed_at = now(),
        error_payload = '{}'::jsonb
      WHERE id = ${input.runId}
    `

    return tx<RawPlanningArtifactRow[]>`
      WITH inserted_artifact AS (
        INSERT INTO planning_run_artifacts (
          tenant_id,
          run_id,
          artifact_key,
          artifact_version,
          payload,
          provenance,
          data_quality
        )
        VALUES (
          ${input.artifact.tenantId},
          ${input.runId},
          ${input.artifact.artifactKey},
          ${input.artifact.artifactVersion},
          ${JSON.stringify(input.artifact.payload)}::jsonb,
          ${JSON.stringify(input.artifact.provenance)}::jsonb,
          ${JSON.stringify(input.artifact.dataQuality)}::jsonb
        )
        RETURNING
          id,
          run_id,
          tenant_id,
          artifact_key,
          artifact_version,
          payload,
          provenance,
          data_quality,
          created_at
      )
      SELECT
        r.id AS run_id,
        r.tenant_id,
        r.run_type,
        r.run_source,
        r.status AS run_status,
        r.scope_key,
        r.as_of_date,
        r.horizon_months,
        r.generator_version,
        r.request_payload,
        r.summary_payload,
        r.error_payload,
        r.started_at,
        r.completed_at,
        a.id AS artifact_id,
        a.artifact_key,
        a.artifact_version,
        a.payload,
        a.provenance,
        a.data_quality,
        a.created_at
      FROM planning_runs r
      INNER JOIN inserted_artifact a ON a.run_id = r.id
      WHERE r.id = ${input.runId}
    `
  })

  const row = rows[0]
  if (!row) throw new Error('Failed to complete planning run')
  return mapPlanningArtifactEnvelope(row)
}

export async function failPlanningRun(input: {
  runId: string
  errorPayload: Record<string, unknown>
}): Promise<void> {
  await pgClient`
    UPDATE planning_runs
    SET
      status = 'failed',
      completed_at = now(),
      error_payload = ${JSON.stringify(input.errorPayload)}::jsonb
    WHERE id = ${input.runId}
  `
}

export async function getLatestCompletedPlanningArtifact(input: {
  tenantId: string
  runType: string
  scopeKey: string
  artifactKey: string
  horizonMonths?: number | null
  maxAgeMinutes?: number | null
}): Promise<PlanningArtifactEnvelope | null> {
  const cutoff =
    typeof input.maxAgeMinutes === 'number' && input.maxAgeMinutes > 0
      ? new Date(Date.now() - input.maxAgeMinutes * 60_000).toISOString()
      : null

  const rows = await pgClient<RawPlanningArtifactRow[]>`
    SELECT
      r.id AS run_id,
      r.tenant_id,
      r.run_type,
      r.run_source,
      r.status AS run_status,
      r.scope_key,
      r.as_of_date,
      r.horizon_months,
      r.generator_version,
      r.request_payload,
      r.summary_payload,
      r.error_payload,
      r.started_at,
      r.completed_at,
      a.id AS artifact_id,
      a.artifact_key,
      a.artifact_version,
      a.payload,
      a.provenance,
      a.data_quality,
      a.created_at
    FROM planning_runs r
    INNER JOIN planning_run_artifacts a ON a.run_id = r.id
    WHERE r.tenant_id = ${input.tenantId}
      AND r.run_type = ${input.runType}
      AND r.scope_key = ${input.scopeKey}
      AND r.status = 'completed'
      AND a.artifact_key = ${input.artifactKey}
      AND (${input.horizonMonths ?? null}::int IS NULL OR r.horizon_months = ${input.horizonMonths ?? null})
      AND (${cutoff}::timestamptz IS NULL OR r.completed_at >= ${cutoff})
    ORDER BY r.completed_at DESC NULLS LAST, r.started_at DESC
    LIMIT 1
  `

  return rows[0] ? mapPlanningArtifactEnvelope(rows[0]) : null
}

export async function listCompletedPlanningArtifacts(input: {
  tenantId: string
  runType: string
  artifactKey: string
  scopeKey?: string | null
  limit?: number
}): Promise<PlanningArtifactEnvelope[]> {
  const safeLimit = Math.max(1, Math.min(200, Math.floor(input.limit ?? 24)))

  const rows = await pgClient<RawPlanningArtifactRow[]>`
    SELECT
      r.id AS run_id,
      r.tenant_id,
      r.run_type,
      r.run_source,
      r.status AS run_status,
      r.scope_key,
      r.as_of_date,
      r.horizon_months,
      r.generator_version,
      r.request_payload,
      r.summary_payload,
      r.error_payload,
      r.started_at,
      r.completed_at,
      a.id AS artifact_id,
      a.artifact_key,
      a.artifact_version,
      a.payload,
      a.provenance,
      a.data_quality,
      a.created_at
    FROM planning_runs r
    INNER JOIN planning_run_artifacts a ON a.run_id = r.id
    WHERE r.tenant_id = ${input.tenantId}
      AND r.run_type = ${input.runType}
      AND r.status = 'completed'
      AND a.artifact_key = ${input.artifactKey}
      AND (${input.scopeKey ?? null}::text IS NULL OR r.scope_key = ${input.scopeKey ?? null})
    ORDER BY r.completed_at DESC NULLS LAST, r.started_at DESC
    LIMIT ${safeLimit}
  `

  return rows.map(mapPlanningArtifactEnvelope)
}
