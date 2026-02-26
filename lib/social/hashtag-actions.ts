// @ts-nocheck — social_hashtag_sets table pending schema migration
'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import type { SocialPillar } from '@/lib/social/types'

export type SocialHashtagSet = {
  id: string
  tenant_id: string
  created_by: string
  set_name: string
  hashtags: string[]
  pillar: SocialPillar | null
  created_at: string
  updated_at: string
}

export async function getHashtagSets(): Promise<SocialHashtagSet[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_hashtag_sets')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[getHashtagSets] Query failed:', error)
    return []
  }

  return (data ?? []) as SocialHashtagSet[]
}

export async function createHashtagSet(input: {
  set_name: string
  hashtags: string[]
  pillar?: SocialPillar
}): Promise<SocialHashtagSet> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('social_hashtag_sets')
    .insert({
      tenant_id: user.tenantId!,
      created_by: user.id,
      set_name: input.set_name.trim(),
      hashtags: input.hashtags.map((h) => h.trim()).filter(Boolean),
      pillar: input.pillar ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SocialHashtagSet
}

export async function updateHashtagSet(
  id: string,
  input: Partial<{ set_name: string; hashtags: string[]; pillar: SocialPillar | null }>
): Promise<SocialHashtagSet> {
  const user = await requireChef()
  const supabase = createServerClient()

  const updates: Record<string, unknown> = {}
  if (input.set_name !== undefined) updates.set_name = input.set_name.trim()
  if (input.hashtags !== undefined)
    updates.hashtags = input.hashtags.map((h) => h.trim()).filter(Boolean)
  if ('pillar' in input) updates.pillar = input.pillar ?? null

  const { data, error } = await supabase
    .from('social_hashtag_sets')
    .update(updates)
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as SocialHashtagSet
}

export async function deleteHashtagSet(id: string): Promise<void> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('social_hashtag_sets')
    .delete()
    .eq('id', id)
    .eq('tenant_id', user.tenantId!)

  if (error) throw new Error(error.message)
}
