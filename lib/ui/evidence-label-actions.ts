'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  EvidenceLevel,
  EvidenceLabelConfig,
  EvidenceLabelPlacement,
  EvidenceLabelPosition,
  EvidenceLabelSummary,
} from './evidence-label-types'

export async function getEvidenceLabelConfigs(): Promise<EvidenceLabelConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM evidence_label_configs WHERE tenant_id = $1 ORDER BY priority ASC',
    [user.tenantId],
  )
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    evidenceLevel: r.evidence_level as EvidenceLevel,
    displayLabel: r.display_label,
    bgColor: r.bg_color,
    textColor: r.text_color,
    borderColor: r.border_color,
    icon: r.icon,
    tooltipTemplate: r.tooltip_template,
    priority: r.priority ?? 0,
    createdAt: new Date(r.created_at),
  }))
}

export async function upsertEvidenceLabelConfig(params: {
  evidenceLevel: EvidenceLevel
  displayLabel: string
  bgColor: string
  textColor: string
  borderColor?: string | null
  icon?: string | null
  tooltipTemplate?: string | null
  priority?: number
}): Promise<EvidenceLabelConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO evidence_label_configs
       (tenant_id, evidence_level, display_label, bg_color, text_color, border_color, icon, tooltip_template, priority)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, evidence_level)
     DO UPDATE SET
       display_label = $3,
       bg_color = $4,
       text_color = $5,
       border_color = $6,
       icon = $7,
       tooltip_template = $8,
       priority = $9
     RETURNING *`,
    [
      user.tenantId,
      params.evidenceLevel,
      params.displayLabel,
      params.bgColor,
      params.textColor,
      params.borderColor ?? null,
      params.icon ?? null,
      params.tooltipTemplate ?? null,
      params.priority ?? 0,
    ],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    evidenceLevel: r.evidence_level as EvidenceLevel,
    displayLabel: r.display_label,
    bgColor: r.bg_color,
    textColor: r.text_color,
    borderColor: r.border_color,
    icon: r.icon,
    tooltipTemplate: r.tooltip_template,
    priority: r.priority ?? 0,
    createdAt: new Date(r.created_at),
  }
}

export async function getEvidenceLabelPlacements(route?: string): Promise<EvidenceLabelPlacement[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM evidence_label_placements WHERE tenant_id = $1'
  if (route) {
    query += ' AND route = $2'
    params.push(route)
  }
  query += ' ORDER BY route, field_name'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    fieldName: r.field_name,
    evidenceLevel: r.evidence_level as EvidenceLevel,
    position: r.position as EvidenceLabelPosition,
    visible: r.visible ?? true,
    createdAt: new Date(r.created_at),
  }))
}

export async function upsertEvidenceLabelPlacement(params: {
  route: string
  fieldName: string
  evidenceLevel: EvidenceLevel
  position: EvidenceLabelPosition
  visible?: boolean
}): Promise<EvidenceLabelPlacement> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO evidence_label_placements
       (tenant_id, route, field_name, evidence_level, position, visible)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, route, field_name)
     DO UPDATE SET
       evidence_level = $4,
       position = $5,
       visible = $6
     RETURNING *`,
    [
      user.tenantId,
      params.route,
      params.fieldName,
      params.evidenceLevel,
      params.position,
      params.visible ?? true,
    ],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    fieldName: r.field_name,
    evidenceLevel: r.evidence_level as EvidenceLevel,
    position: r.position as EvidenceLabelPosition,
    visible: r.visible ?? true,
    createdAt: new Date(r.created_at),
  }
}

export async function deleteEvidenceLabelPlacement(id: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query(
    'DELETE FROM evidence_label_placements WHERE id = $1 AND tenant_id = $2',
    [id, user.tenantId],
  )
}

export async function getEvidenceLabelSummary(): Promise<EvidenceLabelSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const configRows = await db.query(
    'SELECT COUNT(*)::int as total FROM evidence_label_configs WHERE tenant_id = $1',
    [user.tenantId],
  )
  const placementRows = await db.query(
    'SELECT COUNT(*)::int as total FROM evidence_label_placements WHERE tenant_id = $1',
    [user.tenantId],
  )
  const levelRows = await db.query(
    'SELECT evidence_level, COUNT(*)::int as cnt FROM evidence_label_placements WHERE tenant_id = $1 GROUP BY evidence_level',
    [user.tenantId],
  )
  const coverageByLevel: Record<string, number> = {
    verified: 0,
    calculated: 0,
    estimated: 0,
    'user-provided': 0,
    'system-default': 0,
  }
  for (const r of levelRows) {
    coverageByLevel[r.evidence_level] = r.cnt
  }
  return {
    totalConfigs: configRows[0]?.total ?? 0,
    totalPlacements: placementRows[0]?.total ?? 0,
    coverageByLevel: coverageByLevel as EvidenceLabelSummary['coverageByLevel'],
  }
}
