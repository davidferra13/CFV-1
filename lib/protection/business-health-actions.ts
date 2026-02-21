'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { HEALTH_ITEM_KEYS } from './business-health-constants'

const REVALIDATE_PATH = '/settings/protection'

export type HealthItemStatus = 'complete' | 'incomplete' | 'not_applicable'

export type HealthChecklistItem = {
  item_key: string
  status: HealthItemStatus
  notes: string | null
  document_url: string | null
  completed_at: string | null
}

/**
 * Upsert a single business health checklist item for the current tenant.
 * Uses ON CONFLICT (tenant_id, item_key) DO UPDATE.
 */
export async function updateHealthItem(
  itemKey: string,
  status: HealthItemStatus,
  notes?: string,
  documentUrl?: string
) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const completedAt = status === 'complete' ? new Date().toISOString() : null

  const { data, error } = await (supabase as any)
    .from('chef_business_health_items')
    .upsert(
      {
        tenant_id: tenantId,
        item_key: itemKey,
        status,
        notes: notes ?? null,
        document_url: documentUrl ?? null,
        completed_at: completedAt,
      },
      { onConflict: 'tenant_id,item_key' }
    )
    .select()
    .single()

  if (error) throw new Error(`Failed to update health item: ${error.message}`)

  revalidatePath(REVALIDATE_PATH)
  return data
}

/**
 * Returns all 13 checklist items with their current status.
 * Items with no DB row are filled in with status 'incomplete'.
 */
export async function getHealthChecklist(): Promise<HealthChecklistItem[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!

  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('chef_business_health_items')
    .select('item_key, status, notes, document_url, completed_at')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(`Failed to fetch health checklist: ${error.message}`)

  const existingMap = new Map<string, HealthChecklistItem>(
    (data ?? []).map((row: HealthChecklistItem) => [row.item_key, row])
  )

  return HEALTH_ITEM_KEYS.map(
    (key) =>
      existingMap.get(key) ?? {
        item_key: key,
        status: 'incomplete' as HealthItemStatus,
        notes: null,
        document_url: null,
        completed_at: null,
      }
  )
}

/**
 * Returns a numeric score based on how many items are marked 'complete'.
 * score = count of complete items
 * total = 13 (total possible items)
 * percentage = score / total * 100 (rounded to nearest integer)
 */
export async function getHealthScore() {
  const checklist = await getHealthChecklist()

  const total = checklist.length
  const score = checklist.filter((item) => item.status === 'complete').length
  const percentage = Math.round((score / total) * 100)

  return { score, total, percentage }
}
