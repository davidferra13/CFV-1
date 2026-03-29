import { NextRequest, NextResponse } from 'next/server'
import { verifyCronAuth } from '@/lib/auth/cron-auth'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const authError = verifyCronAuth(req.headers.get('authorization'))
  if (authError) return authError

  try {
    // Get the most recent OpenClaw price sync timestamp
    const lastSyncResult = await db.execute(
      sql`SELECT MAX(purchase_date) as last_sync
          FROM ingredient_price_history
          WHERE source LIKE 'openclaw_%'`
    )

    // Count ingredients updated today
    const updatedTodayResult = await db.execute(
      sql`SELECT COUNT(DISTINCT ingredient_id) as count
          FROM ingredient_price_history
          WHERE source LIKE 'openclaw_%'
            AND purchase_date = CURRENT_DATE`
    )

    // Total price history rows from OpenClaw
    const totalRowsResult = await db.execute(
      sql`SELECT COUNT(*) as count
          FROM ingredient_price_history
          WHERE source LIKE 'openclaw_%'`
    )

    const lastSync = lastSyncResult[0]?.last_sync ?? null
    const ingredientsUpdated = Number(updatedTodayResult[0]?.count ?? 0)
    const priceHistoryRows = Number(totalRowsResult[0]?.count ?? 0)

    return NextResponse.json({
      lastSync,
      ingredientsUpdated,
      priceHistoryRows,
      timestamp: new Date().toISOString(),
    })
  } catch (err: any) {
    console.error('[sentinel/sync-status] Query failed:', err.message)
    return NextResponse.json({ error: 'Failed to query sync status' }, { status: 500 })
  }
}
