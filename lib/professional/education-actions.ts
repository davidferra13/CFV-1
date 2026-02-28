'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

export async function createEducationEntry(input: {
  entry_type: string
  title: string
  description?: string
  learned?: string
  how_changed_cooking?: string
  entry_date: string
}) {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { error } = await supabase.from('chef_education_log').insert({
    tenant_id: tenantId,
    entry_type: input.entry_type,
    title: input.title,
    description: input.description ?? null,
    learned: input.learned ?? null,
    how_changed_cooking: input.how_changed_cooking ?? null,
    entry_date: input.entry_date,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/settings/professional')
}

export async function listEducationEntries(): Promise<
  Array<{
    id: string
    entry_type: string
    title: string
    description: string | null
    learned: string | null
    how_changed_cooking: string | null
    entry_date: string
    created_at: string
  }>
> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('chef_education_log')
    .select(
      'id, entry_type, title, description, learned, how_changed_cooking, entry_date, created_at'
    )
    .eq('tenant_id', tenantId)
    .order('entry_date', { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export async function getAnnualCount(): Promise<number> {
  const chef = await requireChef()
  const tenantId = chef.tenantId!
  const supabase: any = createServerClient()

  const since = new Date()
  since.setFullYear(since.getFullYear() - 1)

  const { count, error } = await supabase
    .from('chef_education_log')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .gte('entry_date', since.toISOString().split('T')[0])

  if (error) throw new Error(error.message)
  return count ?? 0
}
