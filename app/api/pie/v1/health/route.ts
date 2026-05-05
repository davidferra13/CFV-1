import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  const start = Date.now()
  const health: Record<string, unknown> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: 'v1',
  }

  try {
    const [census] = (await db.execute(
      sql`SELECT COUNT(*)::int as cnt FROM openclaw.canonical_ingredients`
    )) as unknown as [{ cnt: number }]

    const [linked] = (await db.execute(
      sql`SELECT COUNT(DISTINCT canonical_ingredient_id)::int as cnt FROM openclaw.normalization_map`
    )) as unknown as [{ cnt: number }]

    const [priced] = (await db.execute(
      sql`SELECT COUNT(*)::int as cnt FROM openclaw.store_products WHERE price_cents > 0`
    )) as unknown as [{ cnt: number }]

    const [states] = (await db.execute(
      sql`SELECT COUNT(DISTINCT state)::int as cnt FROM openclaw.stores WHERE is_active = true`
    )) as unknown as [{ cnt: number }]

    health.database = 'connected'
    health.census_size = census.cnt
    health.norm_linked_pct = census.cnt > 0 ? Math.round((linked.cnt / census.cnt) * 1000) / 10 : 0
    health.priced_products = priced.cnt
    health.states_covered = states.cnt
    health.latency_ms = Date.now() - start
  } catch (e: unknown) {
    health.status = 'degraded'
    health.database = 'error'
    health.error = e instanceof Error ? e.message : 'unknown'
    health.latency_ms = Date.now() - start
    return NextResponse.json(health, { status: 503 })
  }

  return NextResponse.json(health)
}
