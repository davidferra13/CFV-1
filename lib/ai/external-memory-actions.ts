'use server'

/**
 * Chef Operating Loop External Memory - Server Actions
 *
 * Persistent storage for chef decisions, preferences, patterns, and observations.
 * All actions are auth-gated (requireChef) and tenant-scoped.
 */

import { requireChef } from '@/lib/auth/get-user'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import type {
  MemoryType,
  OperatingMemory,
  OperatingMemoryInsert,
  MemoryStats,
} from '@/lib/ai/external-memory-types'

// ---------------------------------------------------------------------------
// storeOperatingMemory
// Saves a chef decision, preference, pattern, or observation.
// ---------------------------------------------------------------------------
export async function storeOperatingMemory(
  input: Omit<OperatingMemoryInsert, 'tenant_id'>
): Promise<{ id: string }> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const validTypes: MemoryType[] = ['decision', 'preference', 'pattern', 'observation']
  if (!validTypes.includes(input.memory_type)) {
    throw new Error(`Invalid memory_type: ${input.memory_type}`)
  }
  if (!input.content || input.content.trim().length === 0) {
    throw new Error('Memory content is required')
  }

  const relevance = input.relevance_score ?? 0.5
  if (relevance < 0 || relevance > 1) {
    throw new Error('relevance_score must be between 0 and 1')
  }

  const [row] = await db.execute(sql`
    INSERT INTO chef_operating_memories (tenant_id, memory_type, context, content, relevance_score, expires_at)
    VALUES (
      ${tenantId}::uuid,
      ${input.memory_type},
      ${input.context ?? null},
      ${input.content.trim()},
      ${relevance},
      ${input.expires_at?.toISOString() ?? null}::timestamptz
    )
    RETURNING id
  `)

  return { id: row.id as string }
}

// ---------------------------------------------------------------------------
// recallRelevantMemory
// Retrieves contextually relevant memories via full-text search.
// ---------------------------------------------------------------------------
export async function recallRelevantMemory(
  query: string,
  opts?: { memory_type?: MemoryType; limit?: number }
): Promise<OperatingMemory[]> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const limit = Math.min(opts?.limit ?? 20, 100)

  if (!query || query.trim().length === 0) {
    return []
  }

  // Build tsquery from input words (prefix matching with :*)
  const tsQuery = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0)
    .map((w) => w.replace(/[^a-zA-Z0-9]/g, ''))
    .filter((w) => w.length > 0)
    .map((w) => `${w}:*`)
    .join(' & ')

  if (!tsQuery) return []

  const typeFilter = opts?.memory_type ? sql`AND memory_type = ${opts.memory_type}` : sql``

  const rows = await db.execute(sql`
    SELECT id, tenant_id, memory_type, context, content, relevance_score, created_at, expires_at
    FROM chef_operating_memories
    WHERE tenant_id = ${tenantId}::uuid
      AND (expires_at IS NULL OR expires_at > now())
      ${typeFilter}
      AND to_tsvector('english', coalesce(context, '') || ' ' || content)
          @@ to_tsquery('english', ${tsQuery})
    ORDER BY
      ts_rank(to_tsvector('english', coalesce(context, '') || ' ' || content),
              to_tsquery('english', ${tsQuery})) * relevance_score DESC,
      created_at DESC
    LIMIT ${limit}
  `)

  return rows as unknown as OperatingMemory[]
}

// ---------------------------------------------------------------------------
// pruneStaleMemory
// Removes memories older than 90 days (or custom threshold).
// ---------------------------------------------------------------------------
export async function pruneStaleMemory(opts?: { days?: number }): Promise<{ deleted: number }> {
  const user = await requireChef()
  const tenantId = user.tenantId!
  const days = opts?.days ?? 90

  if (days < 1) {
    throw new Error('Prune threshold must be at least 1 day')
  }

  const result = await db.execute(sql`
    DELETE FROM chef_operating_memories
    WHERE tenant_id = ${tenantId}::uuid
      AND (
        (expires_at IS NOT NULL AND expires_at <= now())
        OR created_at < now() - interval '1 day' * ${days}
      )
  `)

  return { deleted: (result as any).rowCount ?? 0 }
}

// ---------------------------------------------------------------------------
// getMemoryStats
// Returns count by type, oldest, and newest memory for the tenant.
// ---------------------------------------------------------------------------
export async function getMemoryStats(): Promise<MemoryStats> {
  const user = await requireChef()
  const tenantId = user.tenantId!

  const countRows = await db.execute<{ memory_type: MemoryType; cnt: string }>(sql`
    SELECT memory_type, count(*)::text AS cnt
    FROM chef_operating_memories
    WHERE tenant_id = ${tenantId}::uuid
    GROUP BY memory_type
  `)

  const [rangeRow] = await db.execute<{ oldest: Date | null; newest: Date | null }>(sql`
    SELECT min(created_at) AS oldest, max(created_at) AS newest
    FROM chef_operating_memories
    WHERE tenant_id = ${tenantId}::uuid
  `)

  const byType: Record<MemoryType, number> = {
    decision: 0,
    preference: 0,
    pattern: 0,
    observation: 0,
  }

  let total = 0
  for (const row of countRows as any[]) {
    const t = row.memory_type as MemoryType
    const c = parseInt(row.cnt, 10)
    byType[t] = c
    total += c
  }

  const range = rangeRow as any
  return {
    total,
    by_type: byType,
    oldest: range?.oldest ?? null,
    newest: range?.newest ?? null,
  }
}
