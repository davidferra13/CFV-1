'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { CardType, CardSection, CardCompositionRule, CardAudit, CardRulesSummary } from './card-rules-types'

export async function getCardRules(cardType?: CardType): Promise<CardCompositionRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM card_composition_rules WHERE tenant_id = $1'
  if (cardType) {
    query += ' AND card_type = $2'
    params.push(cardType)
  }
  query += ' ORDER BY card_type, "order"'
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    cardType: r.card_type as CardType,
    section: r.section as CardSection,
    maxItems: r.max_items,
    required: r.required ?? false,
    order: r.order ?? 0,
    description: r.description,
    createdAt: new Date(r.created_at),
  }))
}

export async function upsertCardRule(
  cardType: CardType,
  section: CardSection,
  maxItems: number | null,
  required: boolean,
  order: number,
  description?: string,
): Promise<CardCompositionRule> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO card_composition_rules (tenant_id, card_type, section, max_items, required, "order", description)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, card_type, section)
     DO UPDATE SET max_items = $4, required = $5, "order" = $6, description = $7
     RETURNING *`,
    [user.tenantId, cardType, section, maxItems, required, order, description ?? null],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    cardType: r.card_type as CardType,
    section: r.section as CardSection,
    maxItems: r.max_items,
    required: r.required ?? false,
    order: r.order ?? 0,
    description: r.description,
    createdAt: new Date(r.created_at),
  }
}

export async function auditCard(
  route: string,
  cardType: CardType,
  violations: unknown[],
  score: number,
): Promise<CardAudit> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO card_audits (tenant_id, route, card_type, violations, score)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [user.tenantId, route, cardType, JSON.stringify(violations), score],
  )
  const r = rows[0]
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    cardType: r.card_type as CardType,
    violations: Array.isArray(r.violations) ? r.violations : JSON.parse(r.violations ?? '[]'),
    score: r.score ?? 0,
    auditedAt: new Date(r.audited_at),
  }
}

export async function getCardAudits(
  cardType?: CardType,
  route?: string,
  limit?: number,
): Promise<CardAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let idx = 2
  let query = 'SELECT * FROM card_audits WHERE tenant_id = $1'
  if (cardType) {
    query += ` AND card_type = $${idx++}`
    params.push(cardType)
  }
  if (route) {
    query += ` AND route = $${idx++}`
    params.push(route)
  }
  query += ' ORDER BY audited_at DESC'
  if (limit) {
    query += ` LIMIT $${idx++}`
    params.push(limit)
  }
  const rows = await db.query(query, params)
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    cardType: r.card_type as CardType,
    violations: Array.isArray(r.violations) ? r.violations : JSON.parse(r.violations ?? '[]'),
    score: r.score ?? 0,
    auditedAt: new Date(r.audited_at),
  }))
}

export async function getCardRulesSummary(): Promise<CardRulesSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const ruleRows = await db.query(
    'SELECT card_type, COUNT(*)::int as cnt FROM card_composition_rules WHERE tenant_id = $1 GROUP BY card_type',
    [user.tenantId],
  )
  const byCardType: Record<string, number> = {} as any
  let totalRules = 0
  for (const r of ruleRows) {
    byCardType[r.card_type] = r.cnt
    totalRules += r.cnt
  }
  const auditRows = await db.query(
    'SELECT COUNT(*)::int as total, COALESCE(AVG(score), 0)::int as avg_score FROM card_audits WHERE tenant_id = $1',
    [user.tenantId],
  )
  const worstRows = await db.query(
    'SELECT route, card_type, score FROM card_audits WHERE tenant_id = $1 ORDER BY score ASC LIMIT 5',
    [user.tenantId],
  )
  return {
    totalRules,
    byCardType: byCardType as CardRulesSummary['byCardType'],
    totalAudits: auditRows[0]?.total ?? 0,
    avgScore: auditRows[0]?.avg_score ?? 0,
    worstCards: worstRows.map((r: any) => ({ route: r.route, cardType: r.card_type, score: r.score })),
  }
}

export async function getCardsWithViolations(minViolations?: number): Promise<CardAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const threshold = minViolations ?? 1
  const rows = await db.query(
    `SELECT * FROM card_audits WHERE tenant_id = $1 AND jsonb_array_length(violations) >= $2 ORDER BY jsonb_array_length(violations) DESC`,
    [user.tenantId, threshold],
  )
  return rows.map((r: any) => ({
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    cardType: r.card_type as CardType,
    violations: Array.isArray(r.violations) ? r.violations : JSON.parse(r.violations ?? '[]'),
    score: r.score ?? 0,
    auditedAt: new Date(r.audited_at),
  }))
}
