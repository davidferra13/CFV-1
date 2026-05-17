'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  ThumbZone,
  MobileErgonomicsRule,
  MobileErgonomicsAudit,
  MobileErgonomicsSummary,
} from './lifecycle-mobile-ergonomics-types'

function mapRule(r: any): MobileErgonomicsRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    component: r.component ?? null,
    minTouchTarget: r.min_touch_target ?? 44,
    thumbZone: (r.thumb_zone ?? 'easy') as ThumbZone,
    swipeEnabled: r.swipe_enabled ?? false,
    swipeAction: r.swipe_action ?? null,
    mobileOverride: r.mobile_override
      ? typeof r.mobile_override === 'string'
        ? JSON.parse(r.mobile_override)
        : r.mobile_override
      : null,
    createdAt: new Date(r.created_at),
  }
}

function mapAudit(r: any): MobileErgonomicsAudit {
  const dist = r.thumb_zone_distribution
    ? typeof r.thumb_zone_distribution === 'string'
      ? JSON.parse(r.thumb_zone_distribution)
      : r.thumb_zone_distribution
    : { easy: 0, stretch: 0, hard: 0 }
  return {
    id: r.id,
    tenantId: r.tenant_id,
    route: r.route,
    totalComponents: r.total_components ?? 0,
    passingComponents: r.passing_components ?? 0,
    failingTargets: r.failing_targets ?? 0,
    thumbZoneDistribution: dist,
    score: r.score ?? 0,
    auditedAt: new Date(r.audited_at),
  }
}

export async function getMobileErgonomicsRules(route?: string): Promise<MobileErgonomicsRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM mobile_ergonomics_rules WHERE tenant_id = $1'
  if (route) {
    query += ' AND route = $2'
    params.push(route)
  }
  query += ' ORDER BY route, component'
  const rows = await db.query(query, params)
  return rows.map(mapRule)
}

export async function upsertMobileErgonomicsRule(params: {
  route: string
  component?: string | null
  minTouchTarget: number
  thumbZone: ThumbZone
  swipeEnabled: boolean
  swipeAction?: string | null
  mobileOverride?: Record<string, unknown> | null
}): Promise<MobileErgonomicsRule> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO mobile_ergonomics_rules
       (tenant_id, route, component, min_touch_target, thumb_zone, swipe_enabled, swipe_action, mobile_override)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (tenant_id, route, component)
     DO UPDATE SET
       min_touch_target = $4,
       thumb_zone = $5,
       swipe_enabled = $6,
       swipe_action = $7,
       mobile_override = $8
     RETURNING *`,
    [
      user.tenantId,
      params.route,
      params.component ?? null,
      params.minTouchTarget,
      params.thumbZone,
      params.swipeEnabled,
      params.swipeAction ?? null,
      params.mobileOverride ? JSON.stringify(params.mobileOverride) : null,
    ]
  )
  return mapRule(rows[0])
}

export async function getMobileErgonomicsAudits(
  route?: string,
  limit?: number
): Promise<MobileErgonomicsAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let idx = 2
  let query = 'SELECT * FROM mobile_ergonomics_audits WHERE tenant_id = $1'
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
  return rows.map(mapAudit)
}

export async function createMobileErgonomicsAudit(params: {
  route: string
  totalComponents: number
  passingComponents: number
  failingTargets: number
  thumbZoneDistribution: Record<ThumbZone, number>
  score: number
}): Promise<MobileErgonomicsAudit> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO mobile_ergonomics_audits
       (tenant_id, route, total_components, passing_components, failing_targets, thumb_zone_distribution, score)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      user.tenantId,
      params.route,
      params.totalComponents,
      params.passingComponents,
      params.failingTargets,
      JSON.stringify(params.thumbZoneDistribution),
      params.score,
    ]
  )
  return mapAudit(rows[0])
}

export async function deleteMobileErgonomicsRule(id: string): Promise<boolean> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM mobile_ergonomics_rules WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [id, user.tenantId]
  )
  return rows.length > 0
}

export async function getMobileErgonomicsSummary(): Promise<MobileErgonomicsSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const ruleRows = await db.query(
    'SELECT COUNT(*)::int as total FROM mobile_ergonomics_rules WHERE tenant_id = $1',
    [user.tenantId]
  )

  const auditRows = await db.query(
    'SELECT COUNT(*)::int as total, COALESCE(AVG(score), 0)::int as avg_score FROM mobile_ergonomics_audits WHERE tenant_id = $1',
    [user.tenantId]
  )

  const worstRows = await db.query(
    'SELECT route, score FROM mobile_ergonomics_audits WHERE tenant_id = $1 ORDER BY score ASC LIMIT 5',
    [user.tenantId]
  )

  return {
    totalRules: ruleRows[0]?.total ?? 0,
    totalAudits: auditRows[0]?.total ?? 0,
    avgScore: auditRows[0]?.avg_score ?? 0,
    worstRoutes: worstRows.map((r: any) => ({ route: r.route, score: r.score })),
  }
}
