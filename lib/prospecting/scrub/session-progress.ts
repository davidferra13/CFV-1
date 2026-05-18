'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'

export async function getScrubSessionProgress(sessionId: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('prospect_scrub_sessions')
    .select('id, status, progress_message, prospect_count, enriched_count')
    .eq('id', sessionId)
    .eq('chef_id', user.tenantId!)
    .single()

  return data
}
