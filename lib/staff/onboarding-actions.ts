'use server'

// Staff Onboarding Checklist — Server Actions
// Tracks per-staff vetting items: certs, agreements, briefings.

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { ONBOARDING_ITEM_KEYS } from './onboarding-constants'

export type OnboardingItemStatus = 'pending' | 'complete' | 'not_applicable'

export type OnboardingItem = {
  id: string
  staff_member_id: string
  tenant_id: string
  item_key: string
  status: OnboardingItemStatus
  document_url: string | null
  completed_at: string | null
}

export type OnboardingStatusSummary = {
  complete: number
  total: number
  percentage: number
  missingItems: string[]
}

/**
 * Fetch existing onboarding items for a staff member, or create all 9
 * default items with status='pending' if none exist yet.
 */
export async function getOrCreateOnboardingChecklist(
  staffMemberId: string
): Promise<OnboardingItem[]> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { data: existing, error: fetchError } = await (supabase as any)
    .from('staff_onboarding_items')
    .select('*')
    .eq('staff_member_id', staffMemberId)
    .eq('tenant_id', tenantId)
    .order('item_key')

  if (fetchError) throw new Error(fetchError.message)

  if (existing && existing.length > 0) {
    return existing as OnboardingItem[]
  }

  // Create all default items
  const defaultItems = ONBOARDING_ITEM_KEYS.map((key) => ({
    staff_member_id: staffMemberId,
    tenant_id: tenantId,
    item_key: key,
    status: 'pending' as const,
    document_url: null,
    completed_at: null,
  }))

  const { data: created, error: insertError } = await (supabase as any)
    .from('staff_onboarding_items')
    .insert(defaultItems)
    .select('*')

  if (insertError) throw new Error(insertError.message)

  return (created ?? []) as OnboardingItem[]
}

/**
 * Upsert a single onboarding item for a staff member.
 */
export async function updateOnboardingItem(
  staffMemberId: string,
  itemKey: string,
  status: OnboardingItemStatus,
  documentUrl?: string
): Promise<void> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const completedAt = status === 'complete' ? new Date().toISOString() : null

  const { error } = await (supabase as any).from('staff_onboarding_items').upsert(
    {
      staff_member_id: staffMemberId,
      tenant_id: tenantId,
      item_key: itemKey,
      status,
      document_url: documentUrl ?? null,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'staff_member_id,item_key' }
  )

  if (error) throw new Error(error.message)

  revalidatePath('/staff')
}

/**
 * Compute completion summary for a staff member's onboarding checklist.
 */
export async function getOnboardingStatus(staffMemberId: string): Promise<OnboardingStatusSummary> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = createServerClient()

  const { data, error } = await (supabase as any)
    .from('staff_onboarding_items')
    .select('item_key, status')
    .eq('staff_member_id', staffMemberId)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  const items = (data ?? []) as Array<{ item_key: string; status: string }>
  const total = ONBOARDING_ITEM_KEYS.length
  const completeCount = items.filter((i) => i.status === 'complete').length
  const missingItems = ONBOARDING_ITEM_KEYS.filter((key) => {
    const found = items.find((i) => i.item_key === key)
    return !found || found.status === 'pending'
  })

  return {
    complete: completeCount,
    total,
    percentage: total > 0 ? Math.round((completeCount / total) * 100) : 0,
    missingItems,
  }
}
