'use server'
// lib/ai/connector/actions.ts
// Server actions for managing Local AI Connectors (BYOA).
// Chefs use these to create, list, and revoke connector keys.

import { createServerClient } from '@/lib/db/server'
import { createAdminClient } from '@/lib/db/admin'
import { requireChef } from '@/lib/auth/get-user'
import { generateConnectorKey, hashConnectorKey } from './auth'
import { revalidatePath } from 'next/cache'
import type { LocalAiConnector } from './types'
import { CONNECTOR_KEY_PREFIX } from './types'

const SETTINGS_PATH = '/settings'
const MAX_CONNECTORS_PER_TENANT = 10

export async function listLocalAiConnectors(): Promise<LocalAiConnector[]> {
  const user = await requireChef()
  const db: any = createServerClient()

  const { data, error } = await db
    .from('local_ai_connectors')
    .select(
      'id, user_id, device_name, key_prefix, default_model, ollama_base_url, last_seen_at, revoked_at, status, created_at, updated_at'
    )
    .eq('user_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (data ?? []).map((row: any) => ({
    id: row.id,
    userId: row.user_id,
    deviceName: row.device_name,
    keyPrefix: row.key_prefix,
    defaultModel: row.default_model,
    ollamaBaseUrl: row.ollama_base_url,
    lastSeenAt: row.last_seen_at,
    revokedAt: row.revoked_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export interface CreateConnectorInput {
  deviceName: string
  defaultModel?: string
  ollamaBaseUrl?: string
  ollamaAuthToken?: string
}

/**
 * Create a new connector key for this device.
 * Returns the raw key exactly once - it cannot be recovered afterwards.
 * Store it in the connector's config file.
 */
export async function createLocalAiConnector(
  input: CreateConnectorInput
): Promise<{ connector: LocalAiConnector; rawKey: string }> {
  const user = await requireChef()
  const db: any = createServerClient()

  // Rate-limit: cap connectors per tenant
  const { count } = await db
    .from('local_ai_connectors')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.entityId)
    .eq('status', 'active')

  if ((count ?? 0) >= MAX_CONNECTORS_PER_TENANT) {
    throw new Error(`Maximum ${MAX_CONNECTORS_PER_TENANT} active connectors per account`)
  }

  const deviceName = input.deviceName?.trim()
  if (!deviceName || deviceName.length < 1 || deviceName.length > 100) {
    throw new Error('Device name must be 1-100 characters')
  }

  const rawKey = generateConnectorKey()
  const keyHash = hashConnectorKey(rawKey)
  const keyPrefix = rawKey.substring(0, CONNECTOR_KEY_PREFIX.length + 8)

  const baseUrl = input.ollamaBaseUrl?.trim() || 'http://localhost:11434'
  // Security: warn against exposing Ollama publicly, but don't block - advanced users may proxy
  const model = input.defaultModel?.trim() || 'gemma4'

  const { data, error } = await db
    .from('local_ai_connectors')
    .insert({
      user_id: user.entityId,
      device_name: deviceName,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      default_model: model,
      ollama_base_url: baseUrl,
      ollama_auth_token: input.ollamaAuthToken?.trim() || null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  revalidatePath(SETTINGS_PATH)

  const connector: LocalAiConnector = {
    id: data.id,
    userId: data.user_id,
    deviceName: data.device_name,
    keyPrefix: data.key_prefix,
    defaultModel: data.default_model,
    ollamaBaseUrl: data.ollama_base_url,
    lastSeenAt: data.last_seen_at,
    revokedAt: data.revoked_at,
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }

  return { connector, rawKey }
}

/**
 * Revoke a connector. Revoked connectors immediately lose poll/heartbeat access.
 * Records are kept for audit purposes; never hard-deleted.
 */
export async function revokeLocalAiConnector(connectorId: string): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()
  const now = new Date().toISOString()

  const { error } = await db
    .from('local_ai_connectors')
    .update({ status: 'revoked', revoked_at: now, updated_at: now })
    .eq('id', connectorId)
    .eq('user_id', user.entityId) // tenant isolation

  if (error) throw new Error(error.message)
  revalidatePath(SETTINGS_PATH)
}

/**
 * Update a connector's display name or default model (non-destructive).
 */
export async function updateLocalAiConnector(
  connectorId: string,
  updates: { deviceName?: string; defaultModel?: string }
): Promise<void> {
  const user = await requireChef()
  const db: any = createServerClient()

  const patch: Record<string, string> = { updated_at: new Date().toISOString() }
  if (updates.deviceName?.trim()) patch.device_name = updates.deviceName.trim()
  if (updates.defaultModel?.trim()) patch.default_model = updates.defaultModel.trim()

  const { error } = await db
    .from('local_ai_connectors')
    .update(patch)
    .eq('id', connectorId)
    .eq('user_id', user.entityId)
    .eq('status', 'active')

  if (error) throw new Error(error.message)
  revalidatePath(SETTINGS_PATH)
}

/**
 * Internal: claim the next pending task for a given connector's tenant.
 * Used by the poll endpoint. Admin client - bypasses RLS.
 */
export async function claimNextTaskForConnector(
  userId: string
): Promise<{ taskId: string; taskType: string; payload: unknown; modelTier: string } | null> {
  const db: any = createAdminClient()
  const now = new Date().toISOString()

  // Find the highest-priority pending task for this tenant that is targeted at local_connector
  const { data: candidates } = await db
    .from('ai_task_queue')
    .select('id')
    .eq('tenant_id', userId)
    .eq('status', 'pending')
    .eq('target_endpoint', 'local_connector')
    .lte('scheduled_for', now)
    .order('priority', { ascending: false })
    .order('scheduled_for', { ascending: true })
    .limit(1)

  if (!candidates || candidates.length === 0) return null

  const taskId = candidates[0].id

  // Atomic CAS claim
  const { data: claimed } = await db
    .from('ai_task_queue')
    .update({
      status: 'processing',
      started_at: now,
      actual_endpoint: 'local_connector',
    })
    .eq('id', taskId)
    .eq('status', 'pending')
    .select()
    .single()

  if (!claimed) return null

  // Increment attempts (non-blocking)
  db.from('ai_task_queue')
    .update({ attempts: (claimed.attempts ?? 0) + 1 })
    .eq('id', taskId)
    .then(() => {})

  return {
    taskId: claimed.id,
    taskType: claimed.task_type,
    payload: claimed.payload,
    modelTier: claimed.model_tier ?? 'standard',
  }
}

/**
 * Internal: store the result of a connector-processed task.
 */
export async function completeConnectorTask(
  taskId: string,
  userId: string,
  result: unknown,
  durationMs: number
): Promise<void> {
  const db: any = createAdminClient()
  const now = new Date().toISOString()

  await db
    .from('ai_task_queue')
    .update({
      status: 'completed',
      result,
      completed_at: now,
      updated_at: now,
    })
    .eq('id', taskId)
    .eq('tenant_id', userId)
    .eq('status', 'processing')
    .eq('actual_endpoint', 'local_connector')
}

/**
 * Internal: mark a connector task as failed (with retry logic).
 */
export async function failConnectorTask(
  taskId: string,
  userId: string,
  errorMessage: string
): Promise<void> {
  const db: any = createAdminClient()
  const now = new Date().toISOString()

  const { data: task } = await db
    .from('ai_task_queue')
    .select('attempts, max_attempts')
    .eq('id', taskId)
    .eq('tenant_id', userId)
    .single()

  if (!task) return

  const exhausted = (task.attempts ?? 0) >= (task.max_attempts ?? 3)

  await db
    .from('ai_task_queue')
    .update({
      status: exhausted ? 'dead' : 'pending',
      last_error: errorMessage,
      next_retry_at: exhausted ? null : new Date(Date.now() + 30_000).toISOString(),
      updated_at: now,
      actual_endpoint: null,
      started_at: null,
    })
    .eq('id', taskId)
    .eq('tenant_id', userId)
}
