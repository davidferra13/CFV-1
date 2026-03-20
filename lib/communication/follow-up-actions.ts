'use server'

import { createServerClient } from '@/lib/supabase/server'
import { requireChef } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'

// ==========================================
// TYPES
// ==========================================

export type FollowUpStep = {
  delay_days: number
  template_id: string | null
  channel: 'email' | 'sms' | 'app'
  subject?: string
  body?: string
}

export type FollowUpSequence = {
  id: string
  chef_id: string
  name: string
  trigger_type: 'post_event' | 'dormant_client' | 'milestone'
  trigger_config: Record<string, unknown>
  steps: FollowUpStep[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// ==========================================
// QUERIES
// ==========================================

export async function getSequences(): Promise<{
  data: FollowUpSequence[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .select('*')
    .eq('chef_id', user.entityId)
    .order('name')

  if (error) {
    console.error('[getSequences] Error:', error)
    return { data: null, error: 'Failed to fetch sequences' }
  }

  return { data: data as FollowUpSequence[], error: null }
}

export async function getActiveSequencesForTrigger(
  triggerType: 'post_event' | 'dormant_client' | 'milestone'
): Promise<{
  data: FollowUpSequence[] | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .select('*')
    .eq('chef_id', user.entityId)
    .eq('trigger_type', triggerType)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('[getActiveSequencesForTrigger] Error:', error)
    return { data: null, error: 'Failed to fetch active sequences' }
  }

  return { data: data as FollowUpSequence[], error: null }
}

// ==========================================
// MUTATIONS
// ==========================================

export async function createSequence(input: {
  name: string
  trigger_type: 'post_event' | 'dormant_client' | 'milestone'
  trigger_config?: Record<string, unknown>
  steps: FollowUpStep[]
  is_active?: boolean
}): Promise<{ data: FollowUpSequence | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  if (!input.steps || input.steps.length === 0) {
    return { data: null, error: 'Sequence must have at least one step' }
  }

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .insert({
      chef_id: user.entityId,
      name: input.name,
      trigger_type: input.trigger_type,
      trigger_config: input.trigger_config || {},
      steps: input.steps,
      is_active: input.is_active ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('[createSequence] Error:', error)
    return { data: null, error: 'Failed to create sequence' }
  }

  revalidatePath('/communication')
  return { data: data as FollowUpSequence, error: null }
}

export async function updateSequence(
  id: string,
  input: {
    name?: string
    trigger_type?: 'post_event' | 'dormant_client' | 'milestone'
    trigger_config?: Record<string, unknown>
    steps?: FollowUpStep[]
    is_active?: boolean
  }
): Promise<{ data: FollowUpSequence | null; error: string | null }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (input.name !== undefined) updateData.name = input.name
  if (input.trigger_type !== undefined) updateData.trigger_type = input.trigger_type
  if (input.trigger_config !== undefined) updateData.trigger_config = input.trigger_config
  if (input.steps !== undefined) updateData.steps = input.steps
  if (input.is_active !== undefined) updateData.is_active = input.is_active

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .update(updateData)
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[updateSequence] Error:', error)
    return { data: null, error: 'Failed to update sequence' }
  }

  revalidatePath('/communication')
  return { data: data as FollowUpSequence, error: null }
}

export async function toggleSequence(id: string): Promise<{
  data: FollowUpSequence | null
  error: string | null
}> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  // Get current state
  const { data: current, error: fetchError } = await supabase
    .from('follow_up_sequences')
    .select('is_active')
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .single()

  if (fetchError || !current) {
    return { data: null, error: 'Sequence not found' }
  }

  const { data, error } = await supabase
    .from('follow_up_sequences')
    .update({
      is_active: !current.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('chef_id', user.entityId)
    .select()
    .single()

  if (error) {
    console.error('[toggleSequence] Error:', error)
    return { data: null, error: 'Failed to toggle sequence' }
  }

  revalidatePath('/communication')
  return { data: data as FollowUpSequence, error: null }
}
