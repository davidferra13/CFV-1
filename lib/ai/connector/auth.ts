// lib/ai/connector/auth.ts
// Validates ChefFlow connector keys presented by local connector apps.
// Keys have the form cf_connector_<64hex>.
// Only the SHA-256 hash is stored; raw keys are never persisted.

import { createHash } from 'crypto'
import { createAdminClient } from '@/lib/db/admin'
import type { ConnectorContext } from './types'
import { CONNECTOR_KEY_PREFIX } from './types'

export function hashConnectorKey(key: string): string {
  return createHash('sha256').update(key).digest('hex')
}

export function generateConnectorKey(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${CONNECTOR_KEY_PREFIX}${hex}`
}

/**
 * Validate a connector key from an Authorization header.
 * Returns null if invalid, revoked, or missing.
 * Updates last_seen_at non-blocking on success.
 */
export async function validateConnectorKey(
  authHeader: string | null
): Promise<ConnectorContext | null> {
  if (!authHeader?.startsWith(`Bearer ${CONNECTOR_KEY_PREFIX}`)) return null

  const key = authHeader.replace('Bearer ', '').trim()
  if (!key.startsWith(CONNECTOR_KEY_PREFIX)) return null

  const keyHash = hashConnectorKey(key)
  const db: any = createAdminClient()

  const { data, error } = await db
    .from('local_ai_connectors')
    .select('id, user_id, status, revoked_at, default_model, ollama_base_url, ollama_auth_token')
    .eq('key_hash', keyHash)
    .single()

  if (error || !data) return null
  if (data.status !== 'active' || data.revoked_at) return null

  // Update last_seen_at (non-blocking, best-effort)
  db.from('local_ai_connectors')
    .update({ last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    connectorId: data.id,
    userId: data.user_id,
    defaultModel: data.default_model,
    ollamaBaseUrl: data.ollama_base_url,
    ollamaAuthToken: data.ollama_auth_token ?? null,
  }
}

/**
 * Check whether a tenant (chef) has at least one active local AI connector.
 * Used by the queue worker and enqueue path to route tasks correctly.
 */
export async function tenantHasActiveConnector(tenantId: string): Promise<boolean> {
  const db: any = createAdminClient()
  const { count } = await db
    .from('local_ai_connectors')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', tenantId)
    .eq('status', 'active')
    .is('revoked_at', null)

  return (count ?? 0) > 0
}
