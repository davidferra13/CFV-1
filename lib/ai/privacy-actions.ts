'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AiPreferences = {
  remy_enabled: boolean
  onboarding_completed: boolean
  onboarding_completed_at: string | null
  data_retention_days: number | null
  allow_memory: boolean
  allow_suggestions: boolean
  allow_document_drafts: boolean
  remy_archetype: string | null
}

export type AiDataSummary = {
  conversations: number
  messages: number
  memories: number
  artifacts: number
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getAiPreferences(): Promise<AiPreferences> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('ai_preferences')
    .select('*')
    .eq('tenant_id', user.tenantId!)
    .single()

  if (!data) {
    // Return defaults - row doesn't exist yet
    return {
      remy_enabled: false,
      onboarding_completed: false,
      onboarding_completed_at: null,
      data_retention_days: null,
      allow_memory: true,
      allow_suggestions: true,
      allow_document_drafts: true,
      remy_archetype: null,
    }
  }

  return {
    remy_enabled: data.remy_enabled,
    onboarding_completed: data.onboarding_completed,
    onboarding_completed_at: data.onboarding_completed_at,
    data_retention_days: data.data_retention_days,
    allow_memory: data.allow_memory,
    allow_suggestions: data.allow_suggestions,
    allow_document_drafts: data.allow_document_drafts,
    remy_archetype: data.remy_archetype ?? null,
  }
}

export async function getAiDataSummary(): Promise<AiDataSummary> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const [convResult, msgResult, memResult, artResult] = await Promise.all([
    supabase
      .from('remy_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('remy_messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    supabase
      .from('remy_memories')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    supabase
      .from('remy_artifacts')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
  ])

  return {
    conversations: convResult.count ?? 0,
    messages: msgResult.count ?? 0,
    memories: memResult.count ?? 0,
    artifacts: artResult.count ?? 0,
  }
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function saveAiPreferences(
  prefs: Partial<Omit<AiPreferences, 'onboarding_completed_at'>>
): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      ...prefs,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[ai-privacy] Failed to save preferences:', error)
    return { success: false }
  }

  return { success: true }
}

export async function completeOnboarding(): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      remy_enabled: true,
      onboarding_completed: true,
      onboarding_completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[ai-privacy] Failed to complete onboarding:', error)
    return { success: false }
  }

  return { success: true }
}

export async function disableRemy(): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase.from('ai_preferences').upsert(
    {
      tenant_id: user.tenantId!,
      remy_enabled: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[ai-privacy] Failed to disable Remy:', error)
    return { success: false }
  }

  return { success: true }
}

// ─── Archetype ───────────────────────────────────────────────────────────────

export async function saveRemyArchetype(archetype: string | null): Promise<{ success: boolean }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await supabase.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      remy_archetype: archetype,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id' }
  )

  if (error) {
    console.error('[ai-privacy] Failed to save archetype:', error)
    return { success: false }
  }

  return { success: true }
}

export async function getRemyArchetype(): Promise<string | null> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data } = await supabase
    .from('ai_preferences')
    .select('remy_archetype')
    .eq('tenant_id', user.tenantId!)
    .single()

  return data?.remy_archetype ?? null
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAllConversations(): Promise<{ success: boolean; deleted: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Messages cascade-delete when conversations are deleted
  const { data, error } = await supabase
    .from('remy_conversations')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) {
    console.error('[ai-privacy] Failed to delete conversations:', error)
    return { success: false, deleted: 0 }
  }

  return { success: true, deleted: data?.length ?? 0 }
}

export async function deleteAllMemories(): Promise<{ success: boolean; deleted: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  // Hard delete - user explicitly asked to remove memories
  const { data, error } = await supabase
    .from('remy_memories')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) {
    console.error('[ai-privacy] Failed to delete memories:', error)
    return { success: false, deleted: 0 }
  }

  return { success: true, deleted: data?.length ?? 0 }
}

export async function deleteAllArtifacts(): Promise<{ success: boolean; deleted: number }> {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await supabase
    .from('remy_artifacts')
    .delete()
    .eq('tenant_id', tenantId)
    .select('id')

  if (error) {
    console.error('[ai-privacy] Failed to delete artifacts:', error)
    return { success: false, deleted: 0 }
  }

  return { success: true, deleted: data?.length ?? 0 }
}

export async function deleteAllAiData(): Promise<{
  success: boolean
  conversations: number
  memories: number
  artifacts: number
}> {
  const [convResult, memResult, artResult] = await Promise.all([
    deleteAllConversations(),
    deleteAllMemories(),
    deleteAllArtifacts(),
  ])

  return {
    success: convResult.success && memResult.success && artResult.success,
    conversations: convResult.deleted,
    memories: memResult.deleted,
    artifacts: artResult.deleted,
  }
}
