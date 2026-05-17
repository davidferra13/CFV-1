'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  DetailCategory,
  PremiumDetailItem,
  PremiumDetailAudit,
  PremiumDetailSummary,
} from './premium-detail-types'

// ---------------------------------------------------------------------------
// 1. getPremiumDetails
// ---------------------------------------------------------------------------
export async function getPremiumDetails(
  route?: string,
  category?: DetailCategory,
  implemented?: boolean
): Promise<PremiumDetailItem[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const conditions: string[] = ['tenant_id = $1']
  const params: any[] = [user.tenantId]
  let idx = 2

  if (route !== undefined) {
    conditions.push(`route = $${idx}`)
    params.push(route)
    idx++
  }
  if (category !== undefined) {
    conditions.push(`category = $${idx}`)
    params.push(category)
    idx++
  }
  if (implemented !== undefined) {
    conditions.push(`implemented = $${idx}`)
    params.push(implemented)
    idx++
  }

  const rows = await db.query(
    `SELECT id, tenant_id, route, component, category, description, implemented, priority, created_at, implemented_at
     FROM premium_detail_items
     WHERE ${conditions.join(' AND ')}
     ORDER BY created_at DESC`,
    params
  )

  return rows.map(mapItem)
}

// ---------------------------------------------------------------------------
// 2. upsertPremiumDetail
// ---------------------------------------------------------------------------
export async function upsertPremiumDetail(
  route: string,
  component: string | null,
  category: DetailCategory,
  description: string,
  priority: 'high' | 'medium' | 'low',
  implemented?: boolean
): Promise<PremiumDetailItem> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.query(
    `INSERT INTO premium_detail_items (tenant_id, route, component, category, description, priority, implemented)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       route = EXCLUDED.route,
       component = EXCLUDED.component,
       category = EXCLUDED.category,
       description = EXCLUDED.description,
       priority = EXCLUDED.priority,
       implemented = EXCLUDED.implemented
     RETURNING id, tenant_id, route, component, category, description, implemented, priority, created_at, implemented_at`,
    [user.tenantId, route, component, category, description, priority, implemented ?? false]
  )

  return mapItem(rows[0])
}

// ---------------------------------------------------------------------------
// 3. markDetailImplemented
// ---------------------------------------------------------------------------
export async function markDetailImplemented(itemId: string): Promise<PremiumDetailItem> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.query(
    `UPDATE premium_detail_items
     SET implemented = true, implemented_at = NOW()
     WHERE id = $1 AND tenant_id = $2
     RETURNING id, tenant_id, route, component, category, description, implemented, priority, created_at, implemented_at`,
    [itemId, user.tenantId]
  )

  if (!rows.length) throw new Error('Detail item not found')
  return mapItem(rows[0])
}

// ---------------------------------------------------------------------------
// 4. auditPremiumDetails
// ---------------------------------------------------------------------------
export async function auditPremiumDetails(
  route: string,
  totalDetails: number,
  implemented: number,
  missing: number,
  score: number
): Promise<PremiumDetailAudit> {
  const user = await requireChef()
  const db: any = createServerClient()

  const rows = await db.query(
    `INSERT INTO premium_detail_audits (tenant_id, route, total_details, implemented, missing, score)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, tenant_id, route, total_details, implemented, missing, score, audited_at`,
    [user.tenantId, route, totalDetails, implemented, missing, score]
  )

  return mapAudit(rows[0])
}

// ---------------------------------------------------------------------------
// 5. getPremiumDetailAudits
// ---------------------------------------------------------------------------
export async function getPremiumDetailAudits(
  route?: string,
  limit?: number
): Promise<PremiumDetailAudit[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const conditions: string[] = ['tenant_id = $1']
  const params: any[] = [user.tenantId]
  let idx = 2

  if (route !== undefined) {
    conditions.push(`route = $${idx}`)
    params.push(route)
    idx++
  }

  const cap = limit ?? 50

  const rows = await db.query(
    `SELECT id, tenant_id, route, total_details, implemented, missing, score, audited_at
     FROM premium_detail_audits
     WHERE ${conditions.join(' AND ')}
     ORDER BY audited_at DESC
     LIMIT ${cap}`,
    params
  )

  return rows.map(mapAudit)
}

// ---------------------------------------------------------------------------
// 6. getPremiumDetailSummary
// ---------------------------------------------------------------------------
export async function getPremiumDetailSummary(): Promise<PremiumDetailSummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const items: any[] = await db.query(
    `SELECT category, implemented FROM premium_detail_items WHERE tenant_id = $1`,
    [user.tenantId]
  )

  const audits: any[] = await db.query(
    `SELECT score FROM premium_detail_audits WHERE tenant_id = $1`,
    [user.tenantId]
  )

  const categories: DetailCategory[] = [
    'micro_interaction',
    'loading_polish',
    'transition',
    'hover_state',
    'focus_ring',
    'shadow',
    'border_radius',
    'spacing_rhythm',
  ]

  const byCategory = {} as Record<DetailCategory, { total: number; implemented: number }>
  for (const cat of categories) {
    byCategory[cat] = { total: 0, implemented: 0 }
  }

  let totalImplemented = 0
  for (const row of items) {
    const cat = row.category as DetailCategory
    if (byCategory[cat]) {
      byCategory[cat].total++
      if (row.implemented) {
        byCategory[cat].implemented++
        totalImplemented++
      }
    }
  }

  const avgScore = audits.length
    ? Math.round(audits.reduce((s: number, a: any) => s + (a.score ?? 0), 0) / audits.length)
    : 0

  return {
    totalItems: items.length,
    implemented: totalImplemented,
    missing: items.length - totalImplemented,
    byCategory,
    avgScore,
  }
}

// ---------------------------------------------------------------------------
// Row mappers
// ---------------------------------------------------------------------------
function mapItem(row: any): PremiumDetailItem {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    component: row.component ?? null,
    category: row.category as DetailCategory,
    description: row.description,
    implemented: row.implemented ?? false,
    priority: row.priority as 'high' | 'medium' | 'low',
    createdAt: new Date(row.created_at),
    implementedAt: row.implemented_at ? new Date(row.implemented_at) : null,
  }
}

function mapAudit(row: any): PremiumDetailAudit {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    route: row.route,
    totalDetails: row.total_details ?? 0,
    implemented: row.implemented ?? 0,
    missing: row.missing ?? 0,
    score: row.score ?? 0,
    auditedAt: new Date(row.audited_at),
  }
}
