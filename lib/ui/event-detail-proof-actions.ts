'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { ProofSnapshot, ProofStage, ProofComparison, ProofSummary } from './event-detail-proof-types'

export async function getProofSnapshots(eventId: string): Promise<ProofSnapshot[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM proof_snapshots WHERE tenant_id = $1 AND event_id = $2 ORDER BY captured_at DESC',
    [user.tenantId, eventId],
  )
  return rows.map((r: any) => mapSnapshot(r))
}

export async function createProofSnapshot(params: {
  eventId: string
  route: string
  stage: ProofStage
  screenshotUrl?: string | null
  metadata?: Record<string, unknown> | null
}): Promise<ProofSnapshot> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO proof_snapshots (tenant_id, event_id, route, stage, screenshot_url, metadata)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [
      user.tenantId,
      params.eventId,
      params.route,
      params.stage,
      params.screenshotUrl ?? null,
      params.metadata ? JSON.stringify(params.metadata) : null,
    ],
  )
  return mapSnapshot(rows[0])
}

export async function deleteProofSnapshot(snapshotId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM proof_snapshots WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [snapshotId, user.tenantId],
  )
  if (!rows.length) {
    throw new Error('Snapshot not found or not owned by tenant')
  }
  return { success: true }
}

export async function getProofComparisons(eventId: string): Promise<ProofComparison[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM proof_comparisons WHERE tenant_id = $1 AND event_id = $2 ORDER BY created_at DESC',
    [user.tenantId, eventId],
  )
  return rows.map((r: any) => mapComparison(r))
}

export async function createProofComparison(params: {
  eventId: string
  beforeSnapshotId: string
  afterSnapshotId: string
  diffScore: number
  changedFields: string[]
  notes?: string | null
}): Promise<ProofComparison> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO proof_comparisons (tenant_id, event_id, before_snapshot_id, after_snapshot_id, diff_score, changed_fields, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user.tenantId,
      params.eventId,
      params.beforeSnapshotId,
      params.afterSnapshotId,
      params.diffScore,
      JSON.stringify(params.changedFields),
      params.notes ?? null,
    ],
  )
  return mapComparison(rows[0])
}

export async function getProofSummary(eventId: string): Promise<ProofSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const snapRows = await db.query(
    'SELECT COUNT(*)::int AS total, MAX(captured_at) AS last_captured FROM proof_snapshots WHERE tenant_id = $1 AND event_id = $2',
    [user.tenantId, eventId],
  )
  const compRows = await db.query(
    'SELECT COUNT(*)::int AS total, COALESCE(AVG(diff_score), 0) AS avg_diff FROM proof_comparisons WHERE tenant_id = $1 AND event_id = $2',
    [user.tenantId, eventId],
  )
  return {
    eventId,
    totalSnapshots: snapRows[0]?.total ?? 0,
    totalComparisons: compRows[0]?.total ?? 0,
    avgDiffScore: Number(compRows[0]?.avg_diff ?? 0),
    lastCaptured: snapRows[0]?.last_captured ? new Date(snapRows[0].last_captured) : null,
  }
}

// ---- internal mappers ----

function mapSnapshot(r: any): ProofSnapshot {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    eventId: r.event_id,
    route: r.route,
    stage: r.stage as ProofStage,
    screenshotUrl: r.screenshot_url,
    metadata: r.metadata ? (typeof r.metadata === 'string' ? JSON.parse(r.metadata) : r.metadata) : null,
    capturedAt: new Date(r.captured_at),
  }
}

function mapComparison(r: any): ProofComparison {
  const changed = r.changed_fields
  return {
    id: r.id,
    tenantId: r.tenant_id,
    eventId: r.event_id,
    beforeSnapshotId: r.before_snapshot_id,
    afterSnapshotId: r.after_snapshot_id,
    diffScore: Number(r.diff_score),
    changedFields: Array.isArray(changed) ? changed : JSON.parse(changed ?? '[]'),
    notes: r.notes,
    createdAt: new Date(r.created_at),
  }
}
