'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { EvidenceItem, EvidenceDisplayRule, EvidenceGrammarSummary, EvidenceType, EvidenceLevel } from './evidence-grammar-types'

const db: any = createServerClient()

export async function getEvidenceItems(entityType: string, entityId: string): Promise<EvidenceItem[]> {
  const chef = await requireChef()
  const rows = await db.query(
    `SELECT id, tenant_id, entity_type, entity_id, type, level, label, value, media_url, verified_at, expires_at, created_at
     FROM evidence_items
     WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3
     ORDER BY created_at DESC`,
    [chef.tenantId, entityType, entityId]
  )
  return rows.map(mapEvidenceRow)
}

export async function upsertEvidenceItem(
  entityType: string,
  entityId: string,
  type: EvidenceType,
  level: EvidenceLevel,
  label: string,
  value?: string,
  mediaUrl?: string,
  expiresAt?: string
): Promise<EvidenceItem> {
  const chef = await requireChef()
  const rows = await db.query(
    `INSERT INTO evidence_items (tenant_id, entity_type, entity_id, type, level, label, value, media_url, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type, level = EXCLUDED.level, label = EXCLUDED.label,
       value = EXCLUDED.value, media_url = EXCLUDED.media_url, expires_at = EXCLUDED.expires_at
     RETURNING id, tenant_id, entity_type, entity_id, type, level, label, value, media_url, verified_at, expires_at, created_at`,
    [chef.tenantId, entityType, entityId, type, level, label, value ?? null, mediaUrl ?? null, expiresAt ?? null]
  )
  return mapEvidenceRow(rows[0])
}

export async function getEvidenceDisplayRules(entityType?: string): Promise<EvidenceDisplayRule[]> {
  const chef = await requireChef()
  if (entityType) {
    const rows = await db.query(
      `SELECT id, tenant_id, entity_type, evidence_type, position, show_level, show_date, required, created_at
       FROM evidence_display_rules
       WHERE tenant_id = $1 AND entity_type = $2
       ORDER BY position ASC`,
      [chef.tenantId, entityType]
    )
    return rows.map(mapRuleRow)
  }
  const rows = await db.query(
    `SELECT id, tenant_id, entity_type, evidence_type, position, show_level, show_date, required, created_at
     FROM evidence_display_rules
     WHERE tenant_id = $1
     ORDER BY entity_type, position ASC`,
    [chef.tenantId]
  )
  return rows.map(mapRuleRow)
}

export async function upsertDisplayRule(
  entityType: string,
  evidenceType: string,
  position: number,
  showLevel: boolean,
  showDate: boolean,
  required: boolean
): Promise<EvidenceDisplayRule> {
  const chef = await requireChef()
  const rows = await db.query(
    `INSERT INTO evidence_display_rules (tenant_id, entity_type, evidence_type, position, show_level, show_date, required)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       position = EXCLUDED.position, show_level = EXCLUDED.show_level,
       show_date = EXCLUDED.show_date, required = EXCLUDED.required
     RETURNING id, tenant_id, entity_type, evidence_type, position, show_level, show_date, required, created_at`,
    [chef.tenantId, entityType, evidenceType, position, showLevel, showDate, required]
  )
  return mapRuleRow(rows[0])
}

export async function getExpiringEvidence(daysAhead = 30): Promise<EvidenceItem[]> {
  const chef = await requireChef()
  const rows = await db.query(
    `SELECT id, tenant_id, entity_type, entity_id, type, level, label, value, media_url, verified_at, expires_at, created_at
     FROM evidence_items
     WHERE tenant_id = $1
       AND expires_at IS NOT NULL
       AND expires_at <= NOW() + INTERVAL '1 day' * $2
       AND expires_at > NOW()
     ORDER BY expires_at ASC`,
    [chef.tenantId, daysAhead]
  )
  return rows.map(mapEvidenceRow)
}

export async function getEvidenceGrammarSummary(): Promise<EvidenceGrammarSummary> {
  const chef = await requireChef()
  const rows: any[] = await db.query(
    `SELECT type, level, expires_at FROM evidence_items WHERE tenant_id = $1`,
    [chef.tenantId]
  )
  const byType: Record<string, number> = { photo: 0, document: 0, review: 0, certification: 0, metric: 0, testimonial: 0 }
  const byLevel: Record<string, number> = { verified: 0, self_reported: 0, pending: 0, expired: 0 }
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  let expiringCount = 0

  for (const r of rows) {
    if (r.type in byType) byType[r.type]++
    if (r.level in byLevel) byLevel[r.level]++
    if (r.expires_at && new Date(r.expires_at) <= thirtyDays && new Date(r.expires_at) > now) {
      expiringCount++
    }
  }

  const total = rows.length
  const verifiedPercent = total > 0 ? Math.round((byLevel.verified / total) * 100) : 0

  return {
    totalItems: total,
    byType: byType as Record<EvidenceType, number>,
    byLevel: byLevel as Record<EvidenceLevel, number>,
    verifiedPercent,
    expiringCount,
  }
}

function mapEvidenceRow(r: any): EvidenceItem {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    entityType: r.entity_type,
    entityId: r.entity_id,
    type: r.type,
    level: r.level,
    label: r.label,
    value: r.value ?? null,
    mediaUrl: r.media_url ?? null,
    verifiedAt: r.verified_at ?? null,
    expiresAt: r.expires_at ?? null,
    createdAt: r.created_at,
  }
}

function mapRuleRow(r: any): EvidenceDisplayRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    entityType: r.entity_type,
    evidenceType: r.evidence_type,
    position: r.position,
    showLevel: r.show_level,
    showDate: r.show_date,
    required: r.required,
    createdAt: r.created_at,
  }
}
