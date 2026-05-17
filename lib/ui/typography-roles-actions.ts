'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type { TypographyRole, TypographyConfig, TextHierarchyRule, TypographySummary } from './typography-roles-types'

const ALL_ROLES: TypographyRole[] = ['page_title', 'section_heading', 'card_title', 'body', 'caption', 'label', 'metric', 'overline']

function mapConfig(r: any): TypographyConfig {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    role: r.role as TypographyRole,
    fontFamily: r.font_family,
    fontSize: r.font_size,
    fontWeight: r.font_weight,
    lineHeight: r.line_height,
    letterSpacing: r.letter_spacing ?? null,
    color: r.color ?? null,
    textTransform: r.text_transform ?? null,
    createdAt: new Date(r.created_at),
  }
}

function mapRule(r: any): TextHierarchyRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    parentRole: r.parent_role as TypographyRole,
    childRole: r.child_role as TypographyRole,
    maxNesting: r.max_nesting ?? 1,
    description: r.description ?? null,
    createdAt: new Date(r.created_at),
  }
}

export async function getTypographyConfigs(role?: TypographyRole): Promise<TypographyConfig[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let query = 'SELECT * FROM typography_configs WHERE tenant_id = $1'
  if (role) {
    query += ' AND role = $2'
    params.push(role)
  }
  query += ' ORDER BY role'
  const rows = await db.query(query, params)
  return rows.map(mapConfig)
}

export async function upsertTypographyConfig(
  role: TypographyRole,
  fontFamily: string,
  fontSize: string,
  fontWeight: string,
  lineHeight: string,
  letterSpacing?: string,
  color?: string,
  textTransform?: string,
): Promise<TypographyConfig> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO typography_configs (tenant_id, role, font_family, font_size, font_weight, line_height, letter_spacing, color, text_transform)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (tenant_id, role)
     DO UPDATE SET font_family = $3, font_size = $4, font_weight = $5, line_height = $6, letter_spacing = $7, color = $8, text_transform = $9
     RETURNING *`,
    [user.tenantId, role, fontFamily, fontSize, fontWeight, lineHeight, letterSpacing ?? null, color ?? null, textTransform ?? null],
  )
  return mapConfig(rows[0])
}

export async function getTextHierarchyRules(): Promise<TextHierarchyRule[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'SELECT * FROM text_hierarchy_rules WHERE tenant_id = $1 ORDER BY parent_role, child_role',
    [user.tenantId],
  )
  return rows.map(mapRule)
}

export async function upsertHierarchyRule(
  parentRole: TypographyRole,
  childRole: TypographyRole,
  maxNesting: number,
  description?: string,
): Promise<TextHierarchyRule> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    `INSERT INTO text_hierarchy_rules (tenant_id, parent_role, child_role, max_nesting, description)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (tenant_id, parent_role, child_role)
     DO UPDATE SET max_nesting = $4, description = $5
     RETURNING *`,
    [user.tenantId, parentRole, childRole, maxNesting, description ?? null],
  )
  return mapRule(rows[0])
}

export async function deleteHierarchyRule(ruleId: string): Promise<{ success: boolean }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const rows = await db.query(
    'DELETE FROM text_hierarchy_rules WHERE id = $1 AND tenant_id = $2 RETURNING id',
    [ruleId, user.tenantId],
  )
  if (!rows.length) {
    throw new Error('Hierarchy rule not found or access denied')
  }
  return { success: true }
}

export async function getTypographySummary(): Promise<TypographySummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const configs = await db.query(
    'SELECT role, COUNT(*)::int as cnt FROM typography_configs WHERE tenant_id = $1 GROUP BY role',
    [user.tenantId],
  )
  const ruleCount = await db.query(
    'SELECT COUNT(*)::int as cnt FROM text_hierarchy_rules WHERE tenant_id = $1',
    [user.tenantId],
  )
  const byRole = {} as Record<TypographyRole, number>
  let totalConfigs = 0
  for (const role of ALL_ROLES) {
    byRole[role] = 0
  }
  for (const row of configs) {
    byRole[row.role as TypographyRole] = Number(row.cnt)
    totalConfigs += Number(row.cnt)
  }
  const configuredRoles = Object.values(byRole).filter((v) => v > 0).length
  const coverage = ALL_ROLES.length > 0 ? Math.round((configuredRoles / ALL_ROLES.length) * 100) : 0
  return {
    totalConfigs,
    byRole,
    totalRules: Number(ruleCount[0]?.cnt ?? 0),
    coverage,
  }
}
