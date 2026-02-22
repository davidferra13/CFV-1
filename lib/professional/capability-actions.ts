'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function upsertCapability(input: {
  capability_type: string
  capability_key: string
  confidence: string
  notes?: string
}) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase.from('chef_capability_inventory').upsert(
    {
      tenant_id: tenantId,
      capability_type: input.capability_type,
      capability_key: input.capability_key,
      capability_label: input.capability_key,
      confidence: input.confidence,
      notes: input.notes ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,capability_key' }
  )

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional/skills')
}

export async function getCapabilityProfile(): Promise<
  Record<
    string,
    Array<{
      capability_type: string
      capability_key: string
      confidence: string
      notes: string | null
    }>
  >
> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('chef_capability_inventory')
    .select('capability_type, capability_key, confidence, notes')
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)

  const grouped: Record<
    string,
    Array<{
      capability_type: string
      capability_key: string
      confidence: string
      notes: string | null
    }>
  > = {}
  for (const row of data ?? []) {
    if (!grouped[row.capability_type]) grouped[row.capability_type] = []
    grouped[row.capability_type].push(row)
  }
  return grouped
}

export async function checkCapabilityForCuisine(cuisine: string): Promise<string | null> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { data } = await supabase
    .from('chef_capability_inventory')
    .select('confidence')
    .eq('tenant_id', tenantId)
    .eq('capability_key', cuisine)
    .maybeSingle()

  return data?.confidence ?? null
}
