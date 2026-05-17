'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import type {
  MicrocopyCategory,
  MicrocopyEntry,
  MicrocopyGlossary,
  MicrocopySummary,
} from './microcopy-types'

const ALL_CATEGORIES: MicrocopyCategory[] = [
  'button',
  'label',
  'placeholder',
  'tooltip',
  'error',
  'success',
  'empty_state',
  'confirmation',
]

function mapEntry(r: any): MicrocopyEntry {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    key: r.key,
    category: r.category as MicrocopyCategory,
    text: r.text,
    context: r.context ?? null,
    route: r.route ?? null,
    tone: (r.tone ?? 'professional') as MicrocopyEntry['tone'],
    maxLength: r.max_length ?? null,
    createdAt: new Date(r.created_at),
    updatedAt: new Date(r.updated_at),
  }
}

function mapGlossary(r: any): MicrocopyGlossary {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    term: r.term,
    definition: r.definition,
    preferredUsage: r.preferred_usage ?? null,
    avoidUsage: r.avoid_usage ?? null,
    createdAt: new Date(r.created_at),
  }
}

export async function getMicrocopyEntries(
  category?: MicrocopyCategory,
  route?: string
): Promise<MicrocopyEntry[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let sql = 'SELECT * FROM microcopy_entries WHERE tenant_id = $1'
  if (category) {
    params.push(category)
    sql += ` AND category = $${params.length}`
  }
  if (route) {
    params.push(route)
    sql += ` AND route = $${params.length}`
  }
  sql += ' ORDER BY key ASC'
  const rows = await db.query(sql, params)
  return (rows.rows ?? rows).map(mapEntry)
}

export async function upsertMicrocopy(
  key: string,
  category: MicrocopyCategory,
  text: string,
  context?: string,
  route?: string,
  tone?: MicrocopyEntry['tone'],
  maxLength?: number
): Promise<MicrocopyEntry> {
  const user = await requireChef()
  const db: any = createServerClient()
  const sql = `INSERT INTO microcopy_entries (tenant_id, key, category, text, context, route, tone, max_length)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (tenant_id, key) DO UPDATE SET
      category = EXCLUDED.category,
      text = EXCLUDED.text,
      context = EXCLUDED.context,
      route = EXCLUDED.route,
      tone = EXCLUDED.tone,
      max_length = EXCLUDED.max_length,
      updated_at = NOW()
    RETURNING *`
  const params = [
    user.tenantId,
    key,
    category,
    text,
    context ?? null,
    route ?? null,
    tone ?? 'professional',
    maxLength ?? null,
  ]
  const rows = await db.query(sql, params)
  return mapEntry((rows.rows ?? rows)[0])
}

export async function deleteMicrocopy(entryId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query('DELETE FROM microcopy_entries WHERE id = $1 AND tenant_id = $2', [
    entryId,
    user.tenantId,
  ])
}

export async function getGlossaryEntries(search?: string): Promise<MicrocopyGlossary[]> {
  const user = await requireChef()
  const db: any = createServerClient()
  const params: any[] = [user.tenantId]
  let sql = 'SELECT * FROM microcopy_glossary WHERE tenant_id = $1'
  if (search) {
    params.push(`%${search}%`)
    sql += ` AND (term ILIKE $${params.length} OR definition ILIKE $${params.length})`
  }
  sql += ' ORDER BY term ASC'
  const rows = await db.query(sql, params)
  return (rows.rows ?? rows).map(mapGlossary)
}

export async function upsertGlossaryEntry(
  term: string,
  definition: string,
  preferredUsage?: string,
  avoidUsage?: string
): Promise<MicrocopyGlossary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const sql = `INSERT INTO microcopy_glossary (tenant_id, term, definition, preferred_usage, avoid_usage)
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (tenant_id, term) DO UPDATE SET
      definition = EXCLUDED.definition,
      preferred_usage = EXCLUDED.preferred_usage,
      avoid_usage = EXCLUDED.avoid_usage
    RETURNING *`
  const params = [user.tenantId, term, definition, preferredUsage ?? null, avoidUsage ?? null]
  const rows = await db.query(sql, params)
  return mapGlossary((rows.rows ?? rows)[0])
}

export async function deleteGlossaryEntry(entryId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  await db.query('DELETE FROM microcopy_glossary WHERE id = $1 AND tenant_id = $2', [
    entryId,
    user.tenantId,
  ])
}

export async function getMicrocopySummary(): Promise<MicrocopySummary> {
  const user = await requireChef()
  const db: any = createServerClient()

  const catRows = await db.query(
    'SELECT category, COUNT(*)::int AS cnt FROM microcopy_entries WHERE tenant_id = $1 GROUP BY category',
    [user.tenantId]
  )
  const byCategory = {} as Record<MicrocopyCategory, number>
  for (const c of ALL_CATEGORIES) byCategory[c] = 0
  for (const r of catRows.rows ?? catRows) byCategory[r.category as MicrocopyCategory] = r.cnt

  const totalEntries = Object.values(byCategory).reduce((a, b) => a + b, 0)

  const glossaryRes = await db.query(
    'SELECT COUNT(*)::int AS cnt FROM microcopy_glossary WHERE tenant_id = $1',
    [user.tenantId]
  )
  const totalGlossary = (glossaryRes.rows ?? glossaryRes)[0]?.cnt ?? 0

  const routeRows = await db.query(
    "SELECT COALESCE(route, '(none)') AS route, COUNT(*)::int AS cnt FROM microcopy_entries WHERE tenant_id = $1 GROUP BY route",
    [user.tenantId]
  )
  const coverageByRoute: Record<string, number> = {}
  for (const r of routeRows.rows ?? routeRows) coverageByRoute[r.route] = r.cnt

  return { totalEntries, byCategory, totalGlossary, coverageByRoute }
}
