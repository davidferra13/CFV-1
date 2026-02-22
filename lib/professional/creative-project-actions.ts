'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function createCreativeProject(input: {
  dish_name: string
  cuisine?: string
  notes?: string
  status?: string
}) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase.from('chef_creative_projects').insert({
    tenant_id: tenantId,
    dish_name: input.dish_name,
    cuisine: input.cuisine ?? null,
    notes: input.notes ?? null,
    status: input.status ?? 'experimenting',
    entry_date: new Date().toISOString().split('T')[0],
  })

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/my-kitchen')
}

export async function updateCreativeProject(
  id: string,
  input: Partial<{ dish_name: string; cuisine: string; notes: string; status: string }>
) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('chef_creative_projects')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/my-kitchen')
}

export async function deleteCreativeProject(id: string) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  const { error } = await supabase
    .from('chef_creative_projects')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (error) throw new Error(error.message)
  revalidatePath('/culinary/my-kitchen')
}

export async function listCreativeProjects(filters?: { status?: string }): Promise<
  Array<{
    id: string
    dish_name: string
    cuisine: string | null
    notes: string | null
    status: string
    photos: string[]
    entry_date: string
    created_at: string
  }>
> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase = await createServerClient()

  let query = supabase
    .from('chef_creative_projects')
    .select('id, dish_name, cuisine, notes, status, photos, entry_date, created_at')
    .eq('tenant_id', tenantId)
    .order('entry_date', { ascending: false })

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return data ?? []
}
