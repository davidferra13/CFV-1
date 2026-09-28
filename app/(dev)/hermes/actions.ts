'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { isHermesOwnerEmail } from '@/lib/auth/hermes-owner'
import { redirect } from 'next/navigation'
import { getHermesStatus } from '@/lib/pricing/hermes-heartbeat'
import { getRecentActions } from '@/lib/pricing/hermes-actions'
import { getPendingQueueDepth } from '@/lib/pricing/hermes-queue'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function fetchHermesDashboard() {
  const admin = await requireAdmin()
  if (!isHermesOwnerEmail(admin.email)) redirect('/')

  const [status, actions, queueDepth, recentFeedback] = await Promise.all([
    getHermesStatus(),
    getRecentActions(20),
    getPendingQueueDepth(),
    db.execute(sql`
      SELECT id, timestamp::text, ingredient_id, resolved_price, actual_price, source, region
      FROM hermes_feedback
      ORDER BY timestamp DESC
      LIMIT 10
    `) as Promise<any>,
  ])

  return {
    status,
    actions,
    queueDepth,
    recentFeedback,
  }
}
