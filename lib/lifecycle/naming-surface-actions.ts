'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  LifecycleNameEntry,
  NamingDecision,
  NamingSummary,
  SurfaceContext,
} from './naming-surface-types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapNameEntry(r: any): LifecycleNameEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    internalName: r.internal_name,
    chefLabel: r.chef_label,
    clientLabel: r.client_label,
    surfaceContext: r.surface_context as SurfaceContext,
    icon: r.icon,
    color: r.color,
    sortOrder: r.sort_order ?? 0,
    active: r.active ?? true,
    createdAt: new Date(r.created_at),
  }
}

function mapDecision(r: any): NamingDecision {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    internalName: r.internal_name,
    decision: r.decision,
    rationale: r.rationale,
    decidedBy: r.decided_by,
    decidedAt: new Date(r.decided_at),
    createdAt: new Date(r.created_at),
  }
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export async function getLifecycleNames(
  surfaceContext?: SurfaceContext
): Promise<LifecycleNameEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM lifecycle_name_entries WHERE tenant_id = $1'
  if (surfaceContext) {
    query += ' AND surface_context = $2'
    params.push(surfaceContext)
  }
  query += ' ORDER BY sort_order, internal_name'
  const rows = await db.query(query, params)
  return rows.map(mapNameEntry)
}

export async function upsertLifecycleName(params: {
  internalName: string
  chefLabel: string
  clientLabel: string
  surfaceContext: SurfaceContext
  icon?: string | null
  color?: string | null
  sortOrder?: number
  active?: boolean
}): Promise<LifecycleNameEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO lifecycle_name_entries
       (tenant_id, internal_name, chef_label, client_label, surface_context, icon, color, sort_order, active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, internal_name, surface_context)
     DO UPDATE SET
       chef_label = $3,
       client_label = $4,
       icon = $6,
       color = $7,
       sort_order = $8,
       active = $9
     RETURNING *`,
    [
      user.tenantId,
      params.internalName,
      params.chefLabel,
      params.clientLabel,
      params.surfaceContext,
      params.icon ?? null,
      params.color ?? null,
      params.sortOrder ?? 0,
      params.active ?? true,
    ]
  )
  return mapNameEntry(rows[0])
}

export async function getNameDecisions(): Promise<NamingDecision[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM naming_decisions WHERE tenant_id = $1 ORDER BY decided_at DESC',
    [user.tenantId]
  )
  return rows.map(mapDecision)
}

export async function createNameDecision(params: {
  internalName: string
  decision: string
  rationale?: string | null
  decidedBy: string
}): Promise<NamingDecision> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO naming_decisions (tenant_id, internal_name, decision, rationale, decided_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      user.tenantId,
      params.internalName,
      params.decision,
      params.rationale ?? null,
      params.decidedBy,
    ]
  )
  return mapDecision(rows[0])
}

export async function deleteLifecycleName(id: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM lifecycle_name_entries WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId]
  )
  return rows.length > 0
}

export async function getNamingSummary(): Promise<NamingSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const entryRows = await db.query(
    'SELECT surface_context, COUNT(*)::int AS cnt FROM lifecycle_name_entries WHERE tenant_id = $1 GROUP BY surface_context',
    [user.tenantId]
  )
  const totalEntries = entryRows.reduce((s: number, r: any) => s + r.cnt, 0)
  const surfaceCoverage: Record<string, number> = {
    dashboard: 0,
    detail: 0,
    email: 0,
    portal: 0,
    mobile: 0,
  }
  for (const r of entryRows) {
    surfaceCoverage[r.surface_context] = r.cnt
  }

  const decisionRows = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM naming_decisions WHERE tenant_id = $1',
    [user.tenantId]
  )
  const totalDecisions = decisionRows[0]?.cnt ?? 0

  const decidedRows = await db.query(
    'SELECT DISTINCT internal_name FROM naming_decisions WHERE tenant_id = $1',
    [user.tenantId]
  )
  const decidedNames = new Set(decidedRows.map((r: any) => r.internal_name))

  const allNameRows = await db.query(
    'SELECT DISTINCT internal_name FROM lifecycle_name_entries WHERE tenant_id = $1',
    [user.tenantId]
  )
  const undecidedStages = allNameRows
    .map((r: any) => r.internal_name)
    .filter((n: string) => !decidedNames.has(n))

  return {
    totalEntries,
    totalDecisions,
    undecidedStages,
    surfaceCoverage: surfaceCoverage as NamingSummary['surfaceCoverage'],
  }
}
