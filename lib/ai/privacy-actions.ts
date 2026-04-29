'use server'

import { z } from 'zod'
import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
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
  local_ai_enabled: boolean
  local_ai_url: string
  local_ai_model: string
  local_ai_verified_at: string | null
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
  const db: any = createServerClient()

  const { data } = await db
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
      local_ai_enabled: false,
      local_ai_url: 'http://localhost:11434',
      local_ai_model: 'gemma4',
      local_ai_verified_at: null,
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
    local_ai_enabled: data.local_ai_enabled ?? false,
    local_ai_url: data.local_ai_url ?? 'http://localhost:11434',
    local_ai_model: data.local_ai_model ?? 'gemma4',
    local_ai_verified_at: data.local_ai_verified_at ?? null,
  }
}

export async function getAiDataSummary(): Promise<AiDataSummary> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const [convResult, msgResult, memResult, artResult] = await Promise.all([
    db
      .from('remy_conversations')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId),
    db.from('remy_messages').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId),
    db
      .from('remy_memories')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('is_active', true),
    db
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

const AiPreferencesUpdateSchema = z.object({
  remy_enabled: z.boolean().optional(),
  onboarding_completed: z.boolean().optional(),
  data_retention_days: z.number().int().min(1).max(3650).nullable().optional(),
  allow_memory: z.boolean().optional(),
  allow_suggestions: z.boolean().optional(),
  allow_document_drafts: z.boolean().optional(),
  remy_archetype: z.string().max(100).nullable().optional(),
})

export async function saveAiPreferences(
  prefs: Partial<Omit<AiPreferences, 'onboarding_completed_at'>>
): Promise<{ success: boolean }> {
  const parsed = AiPreferencesUpdateSchema.safeParse(prefs)
  if (!parsed.success) {
    console.error('[ai-privacy] Invalid preferences input:', parsed.error.message)
    return { success: false }
  }

  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await db.from('ai_preferences').upsert(
    {
      tenant_id: tenantId,
      ...parsed.data,
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
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await db.from('ai_preferences').upsert(
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
  const db: any = createServerClient()

  const { error } = await db.from('ai_preferences').upsert(
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
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { error } = await db.from('ai_preferences').upsert(
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
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_preferences')
    .select('remy_archetype')
    .eq('tenant_id', user.tenantId!)
    .single()

  return data?.remy_archetype ?? null
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAllConversations(): Promise<{ success: boolean; deleted: number }> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Messages cascade-delete when conversations are deleted
  const { data, error } = await db
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
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Hard delete - user explicitly asked to remove memories
  const { data, error } = await db
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
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const { data, error } = await db
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

// ─── Local AI ───────────────────────────────────────────────────────────────

export type LocalAiPreferences = {
  enabled: boolean
  url: string
  model: string
  verifiedAt: string | null
}

export async function getLocalAiPreferences(): Promise<LocalAiPreferences> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data } = await db
    .from('ai_preferences')
    .select('local_ai_enabled, local_ai_url, local_ai_model, local_ai_verified_at')
    .eq('tenant_id', user.tenantId!)
    .single()

  return {
    enabled: data?.local_ai_enabled ?? false,
    url: data?.local_ai_url ?? 'http://localhost:11434',
    model: data?.local_ai_model ?? 'gemma4',
    verifiedAt: data?.local_ai_verified_at ?? null,
  }
}

const LocalAiUpdateSchema = z.object({
  enabled: z.boolean().optional(),
  url: z.string().url().max(500).optional(),
  model: z.string().min(1).max(200).optional(),
})

export async function saveLocalAiPreferences(input: {
  enabled?: boolean
  url?: string
  model?: string
}): Promise<{ success: boolean; error?: string }> {
  const parsed = LocalAiUpdateSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  const updates: Record<string, unknown> = {
    tenant_id: tenantId,
    updated_at: new Date().toISOString(),
  }
  if (parsed.data.enabled !== undefined) updates.local_ai_enabled = parsed.data.enabled
  if (parsed.data.url !== undefined) updates.local_ai_url = parsed.data.url
  if (parsed.data.model !== undefined) updates.local_ai_model = parsed.data.model
  if (parsed.data.url !== undefined || parsed.data.model !== undefined) {
    updates.local_ai_verified_at = null
  }

  const { error } = await db.from('ai_preferences').upsert(updates, { onConflict: 'tenant_id' })

  if (error) {
    console.error('[ai-privacy] Failed to save local AI preferences:', error)
    return { success: false, error: 'Failed to save' }
  }

  return { success: true }
}

export async function markLocalAiVerified(input?: {
  url?: string
  model?: string
}): Promise<{ success: boolean; error?: string; verifiedAt?: string }> {
  const parsed = LocalAiUpdateSchema.pick({ url: true, model: true }).safeParse(input ?? {})
  if (!parsed.success) {
    return { success: false, error: parsed.error.message }
  }

  const user = await requireChef()
  const db: any = createServerClient()
  const verifiedAt = new Date().toISOString()

  const updates: Record<string, unknown> = {
    tenant_id: user.tenantId!,
    local_ai_verified_at: verifiedAt,
    updated_at: verifiedAt,
  }
  if (parsed.data.url !== undefined) updates.local_ai_url = parsed.data.url
  if (parsed.data.model !== undefined) updates.local_ai_model = parsed.data.model

  const { error } = await db.from('ai_preferences').upsert(updates, { onConflict: 'tenant_id' })

  if (error) {
    console.error('[ai-privacy] Failed to mark local AI verified:', error)
    return { success: false, error: 'Failed to verify local AI' }
  }

  return { success: true, verifiedAt }
}

// ─── Delete ──────────────────────────────────────────────────────────────────

export async function deleteAllAiData(): Promise<{
  success: boolean
  conversations: number
  memories: number
  artifacts: number
}> {
  const user = await requireChef()
  const db: any = createServerClient()
  const tenantId = user.tenantId!

  // Delete from all AI tables (order matters: dependents first)
  const supplementaryTables = [
    { table: 'remy_support_shares', col: 'tenant_id' },
    { table: 'remy_feedback', col: 'tenant_id' },
    { table: 'remy_action_audit_log', col: 'tenant_id' },
    { table: 'remy_approval_policies', col: 'tenant_id' },
    { table: 'remy_alerts', col: 'tenant_id' },
    { table: 'remy_abuse_log', col: 'tenant_id' },
    { table: 'ai_task_queue', col: 'tenant_id' },
    { table: 'remy_usage_metrics', col: 'tenant_id' },
    { table: 'remy_onboarding', col: 'chef_id' },
    { table: 'remy_milestones', col: 'chef_id' },
    { table: 'chef_culinary_profiles', col: 'chef_id' },
  ]

  // Clean supplementary tables first (non-blocking individually)
  for (const { table, col } of supplementaryTables) {
    try {
      await db.from(table).delete().eq(col, tenantId)
    } catch {
      // Table may not exist; non-blocking
    }
  }

  // Then the core three (these return counts for the UI)
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
