// Secret Orchestration System - Server Actions
// Multi-party selective visibility objects with planning threads

'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type {
  EventSecret,
  EventSecretFull,
  EventSecretParticipant,
  EventSecretThread,
  EventSecretAsset,
  SecretStatus,
} from '@/lib/private-context/types'

// ============================================================
// VALIDATION
// ============================================================

const CreateSecretSchema = z.object({
  event_id: z.string().uuid(),
  circle_group_id: z.string().uuid().nullable().optional(),
  secret_type: z.enum(['menu_item', 'surprise_dish', 'gift', 'experience', 'moment']),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).nullable().optional(),
  structured_data: z.record(z.string(), z.unknown()).optional(),
  visibility_scope: z.enum(['chef_only', 'chef_and_selected', 'participant_only']).default('chef_only'),
  reveal_timing: z.string().max(500).nullable().optional(),
  reveal_at: z.string().datetime().nullable().optional(),
  estimated_cost_cents: z.number().int().min(0).optional(),
})

const UpdateSecretSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).nullable().optional(),
  structured_data: z.record(z.string(), z.unknown()).optional(),
  visibility_scope: z.enum(['chef_only', 'chef_and_selected', 'participant_only']).optional(),
  reveal_timing: z.string().max(500).nullable().optional(),
  reveal_at: z.string().datetime().nullable().optional(),
  status: z.enum(['planning', 'ready', 'revealed', 'cancelled']).optional(),
  execution_notes: z.string().max(5000).nullable().optional(),
  estimated_cost_cents: z.number().int().min(0).optional(),
  actual_cost_cents: z.number().int().min(0).nullable().optional(),
})

const AddParticipantSchema = z.object({
  secret_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  can_edit: z.boolean().optional(),
})

const AddThreadMessageSchema = z.object({
  secret_id: z.string().uuid(),
  message: z.string().min(1).max(5000),
})

const AddAssetSchema = z.object({
  secret_id: z.string().uuid(),
  asset_type: z.enum(['ingredient', 'design', 'timing', 'equipment', 'other']),
  description: z.string().min(1).max(1000),
  quantity: z.string().max(200).nullable().optional(),
  estimated_cost_cents: z.number().int().min(0).optional(),
})

// ============================================================
// SECRETS CRUD
// ============================================================

export async function createSecret(
  input: z.infer<typeof CreateSecretSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireChef()
    const validated = CreateSecretSchema.parse(input)
    const db: any = createServerClient()

    const { data, error } = await db
      .from('event_secrets')
      .insert({
        tenant_id: user.tenantId,
        event_id: validated.event_id,
        circle_group_id: validated.circle_group_id ?? null,
        secret_type: validated.secret_type,
        title: validated.title,
        description: validated.description ?? null,
        structured_data: validated.structured_data ?? {},
        visibility_scope: validated.visibility_scope,
        reveal_timing: validated.reveal_timing ?? null,
        reveal_at: validated.reveal_at ?? null,
        estimated_cost_cents: validated.estimated_cost_cents ?? 0,
      })
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Secrets] create failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function getEventSecrets(eventId: string): Promise<EventSecret[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('event_secrets')
    .select('*')
    .eq('tenant_id', user.tenantId)
    .eq('event_id', eventId)
    .neq('status', 'cancelled')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as EventSecret[]
}

export async function getSecretFull(secretId: string): Promise<EventSecretFull | null> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Fetch secret
  const { data: secret, error: secretErr } = await db
    .from('event_secrets')
    .select('*')
    .eq('id', secretId)
    .eq('tenant_id', user.tenantId)
    .single()

  if (secretErr || !secret) return null

  // Fetch participants, threads, assets in parallel
  const [participantsRes, threadsRes, assetsRes] = await Promise.all([
    db
      .from('event_secret_participants')
      .select('*')
      .eq('secret_id', secretId)
      .order('added_at', { ascending: true }),
    db
      .from('event_secret_threads')
      .select('*')
      .eq('secret_id', secretId)
      .order('created_at', { ascending: true }),
    db
      .from('event_secret_assets')
      .select('*')
      .eq('secret_id', secretId)
      .order('created_at', { ascending: true }),
  ])

  return {
    ...secret,
    participants: (participantsRes.data ?? []) as EventSecretParticipant[],
    threads: (threadsRes.data ?? []) as EventSecretThread[],
    assets: (assetsRes.data ?? []) as EventSecretAsset[],
  } as EventSecretFull
}

export async function updateSecret(
  id: string,
  input: z.infer<typeof UpdateSecretSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const validated = UpdateSecretSchema.parse(input)
    const db: any = createServerClient()

    const updates: Record<string, unknown> = {}
    for (const [key, val] of Object.entries(validated)) {
      if (val !== undefined) updates[key] = val
    }

    const { error } = await db
      .from('event_secrets')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', user.tenantId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] update failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function revealSecret(id: string): Promise<{ success: boolean; error?: string }> {
  return updateSecret(id, { status: 'revealed' })
}

export async function cancelSecret(id: string): Promise<{ success: boolean; error?: string }> {
  return updateSecret(id, { status: 'cancelled' })
}

// ============================================================
// PARTICIPANTS
// ============================================================

export async function addSecretParticipant(
  input: z.infer<typeof AddParticipantSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const validated = AddParticipantSchema.parse(input)
    const db: any = createServerClient()

    // Verify secret belongs to this chef
    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', validated.secret_id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Secret not found' }

    const { error } = await db
      .from('event_secret_participants')
      .upsert({
        secret_id: validated.secret_id,
        profile_id: validated.profile_id,
        can_edit: validated.can_edit ?? false,
        added_by_tenant_id: user.tenantId,
      }, { onConflict: 'secret_id,profile_id' })

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] addParticipant failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function removeSecretParticipant(
  secretId: string,
  profileId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Verify secret belongs to this chef
    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', secretId)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Secret not found' }

    const { error } = await db
      .from('event_secret_participants')
      .delete()
      .eq('secret_id', secretId)
      .eq('profile_id', profileId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] removeParticipant failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// THREADS
// ============================================================

export async function addSecretMessage(
  input: z.infer<typeof AddThreadMessageSchema>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const validated = AddThreadMessageSchema.parse(input)
    const db: any = createServerClient()

    // Verify secret belongs to this chef
    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', validated.secret_id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Secret not found' }

    const { error } = await db
      .from('event_secret_threads')
      .insert({
        secret_id: validated.secret_id,
        author_type: 'chef',
        author_id: user.tenantId,
        message: validated.message,
      })

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] addMessage failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

// ============================================================
// ASSETS
// ============================================================

export async function addSecretAsset(
  input: z.infer<typeof AddAssetSchema>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const user = await requireChef()
    const validated = AddAssetSchema.parse(input)
    const db: any = createServerClient()

    // Verify secret belongs to this chef
    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', validated.secret_id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Secret not found' }

    const { data, error } = await db
      .from('event_secret_assets')
      .insert({
        secret_id: validated.secret_id,
        asset_type: validated.asset_type,
        description: validated.description,
        quantity: validated.quantity ?? null,
        estimated_cost_cents: validated.estimated_cost_cents ?? 0,
      })
      .select('id')
      .single()

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true, id: data.id }
  } catch (err) {
    console.error('[Secrets] addAsset failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function updateSecretAssetStatus(
  assetId: string,
  status: 'needed' | 'sourced' | 'ready'
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    // Verify asset belongs to chef's secret
    const { data: asset } = await db
      .from('event_secret_assets')
      .select('secret_id')
      .eq('id', assetId)
      .single()

    if (!asset) return { success: false, error: 'Asset not found' }

    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', asset.secret_id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Unauthorized' }

    const { error } = await db
      .from('event_secret_assets')
      .update({ status })
      .eq('id', assetId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] updateAssetStatus failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

export async function deleteSecretAsset(assetId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()

    const { data: asset } = await db
      .from('event_secret_assets')
      .select('secret_id')
      .eq('id', assetId)
      .single()

    if (!asset) return { success: false, error: 'Asset not found' }

    const { data: secret } = await db
      .from('event_secrets')
      .select('id')
      .eq('id', asset.secret_id)
      .eq('tenant_id', user.tenantId)
      .single()

    if (!secret) return { success: false, error: 'Unauthorized' }

    const { error } = await db
      .from('event_secret_assets')
      .delete()
      .eq('id', assetId)

    if (error) throw error

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err) {
    console.error('[Secrets] deleteAsset failed', err)
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}
