'use server'

import { requireAdmin } from '@/lib/auth/admin'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { sleep } from './constants'
import { reEnrichProspectForTenant } from './re-enrich-flow'

export async function reEnrichProspect(prospectId: string) {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()

  return reEnrichProspectForTenant(db, user.tenantId!, prospectId)
}

export async function batchReEnrich() {
  await requireAdmin()
  const user = await requireChef()
  const db: any = createServerClient()
  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()

  const { data: staleProspects } = await db
    .from('prospects')
    .select('id')
    .eq('chef_id', user.tenantId!)
    .or(`last_enriched_at.is.null,last_enriched_at.lt.${fourteenDaysAgo},verified.eq.false`)
    .not('status', 'in', '("converted","dead")')
    .order('lead_score', { ascending: true })
    .limit(10)

  if (!staleProspects || staleProspects.length === 0) {
    return { success: true, refreshed: 0, message: 'All prospects are fresh.' }
  }

  let refreshed = 0
  for (const prospect of staleProspects) {
    try {
      await reEnrichProspectForTenant(db, user.tenantId!, prospect.id)
      refreshed++
    } catch (err) {
      console.warn(`[batch-re-enrich] Failed for ${prospect.id}:`, err)
    }
    if (refreshed < staleProspects.length) await sleep(2_000)
  }

  revalidatePath('/prospecting')
  return {
    success: true,
    refreshed,
    total: staleProspects.length,
    message: `Refreshed ${refreshed}/${staleProspects.length} stale prospects.`,
  }
}
