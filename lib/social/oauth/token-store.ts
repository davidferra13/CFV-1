// CRUD for social_platform_credentials.
// All reads decrypt tokens; all writes encrypt tokens.
// Uses the admin (service role) client — never exposed to the browser.

import { createAdminClient } from '@/lib/supabase/admin'
import { encryptToken, decryptToken } from './crypto'
import type { SocialPlatform } from '@/lib/social/types'
import type { Database } from '@/types/database'

type CredentialRow = Database['public']['Tables']['social_platform_credentials']['Row']

// ── Types ──────────────────────────────────────────────────────────────────────

export type PlatformCredential = {
  id: string
  tenantId: string
  platform: SocialPlatform
  externalAccountId: string
  externalAccountName: string | null
  externalAccountUsername: string | null
  externalAccountAvatarUrl: string | null
  /** Decrypted access token — ready to use in API calls */
  accessToken: string
  /** Decrypted refresh token, or null */
  refreshToken: string | null
  tokenExpiresAt: Date | null
  additionalData: Record<string, unknown>
  scopes: string[]
  failedAttempts: number
  lastError: string | null
}

export type ConnectionSummary = {
  id: string
  tenantId: string
  platform: string
  externalAccountName: string | null
  externalAccountUsername: string | null
  externalAccountAvatarUrl: string | null
  isActive: boolean
  connectedAt: string
  tokenExpiresAt: string | null
  failedAttempts: number
  lastError: string | null
  additionalData: Record<string, unknown>
}

export type UpsertCredentialInput = {
  tenantId: string
  platform: string
  externalAccountId: string
  externalAccountName?: string | null
  externalAccountUsername?: string | null
  externalAccountAvatarUrl?: string | null
  /** Plaintext — will be encrypted before storage */
  accessToken: string
  /** Plaintext — will be encrypted before storage */
  refreshToken?: string | null
  tokenExpiresAt?: Date | null
  additionalData?: Record<string, unknown>
  scopes?: string[]
}

// ── DB row → typed ─────────────────────────────────────────────────────────────

function rowToCredential(row: CredentialRow): PlatformCredential {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    platform: row.platform as SocialPlatform,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
    externalAccountUsername: row.external_account_username,
    externalAccountAvatarUrl: row.external_account_avatar_url,
    accessToken: decryptToken(row.access_token),
    refreshToken: row.refresh_token ? decryptToken(row.refresh_token) : null,
    tokenExpiresAt: row.token_expires_at ? new Date(row.token_expires_at) : null,
    additionalData: (row.additional_data as Record<string, unknown>) ?? {},
    scopes: row.scopes ?? [],
    failedAttempts: row.failed_attempts ?? 0,
    lastError: row.last_error,
  }
}

// ── Reads ──────────────────────────────────────────────────────────────────────

export async function getCredential(
  tenantId: string,
  platform: string
): Promise<PlatformCredential | null> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('social_platform_credentials')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('platform', platform)
    .eq('is_active', true)
    .single()

  if (error || !data) return null
  return rowToCredential(data)
}

export async function listConnections(tenantId: string): Promise<ConnectionSummary[]> {
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('social_platform_credentials')
    .select(
      'id, tenant_id, platform, external_account_name, external_account_username, external_account_avatar_url, additional_data, is_active, connected_at, token_expires_at, failed_attempts, last_error'
    )
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('platform', { ascending: true })

  if (error) return []

  return (data ?? []).map((row) => ({
    id: row.id,
    tenantId: row.tenant_id,
    platform: row.platform,
    externalAccountName: row.external_account_name,
    externalAccountUsername: row.external_account_username,
    externalAccountAvatarUrl: row.external_account_avatar_url,
    isActive: row.is_active,
    connectedAt: row.connected_at,
    tokenExpiresAt: row.token_expires_at,
    failedAttempts: row.failed_attempts,
    lastError: row.last_error,
    additionalData: (row.additional_data as Record<string, unknown>) ?? {},
  }))
}

/** Fetch all active credentials with expiring tokens (within next 24h) — for refresh sweep */
export async function listExpiringCredentials(): Promise<PlatformCredential[]> {
  const supabase = createAdminClient()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data } = await supabase
    .from('social_platform_credentials')
    .select('*')
    .eq('is_active', true)
    .not('token_expires_at', 'is', null)
    .lte('token_expires_at', in24h)

  if (!data) return []

  return (data ?? []).map(rowToCredential)
}

// ── Writes ─────────────────────────────────────────────────────────────────────

export async function upsertCredential(input: UpsertCredentialInput): Promise<void> {
  const supabase = createAdminClient()
  const payload = {
    tenant_id: input.tenantId,
    platform: input.platform,
    external_account_id: input.externalAccountId,
    external_account_name: input.externalAccountName ?? null,
    external_account_username: input.externalAccountUsername ?? null,
    external_account_avatar_url: input.externalAccountAvatarUrl ?? null,
    access_token: encryptToken(input.accessToken),
    refresh_token: input.refreshToken ? encryptToken(input.refreshToken) : null,
    token_expires_at: input.tokenExpiresAt?.toISOString() ?? null,
    additional_data: input.additionalData ?? {},
    scopes: input.scopes ?? [],
    is_active: true,
    failed_attempts: 0,
    last_error: null,
    connected_at: new Date().toISOString(),
    disconnected_at: null,
  }

  const { error } = await supabase
    .from('social_platform_credentials')
    .upsert(payload, { onConflict: 'tenant_id,platform' })

  if (error) throw new Error(`Failed to store credential: ${error.message}`)
}

export async function updateTokens(
  tenantId: string,
  platform: string,
  accessToken: string,
  refreshToken?: string | null,
  expiresAt?: Date | null
): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('social_platform_credentials')
    .update({
      access_token: encryptToken(accessToken),
      refresh_token: refreshToken ? encryptToken(refreshToken) : null,
      token_expires_at: expiresAt?.toISOString() ?? null,
      failed_attempts: 0,
      last_error: null,
      last_used_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('platform', platform)

  if (error) throw new Error(`Failed to update tokens: ${error.message}`)
}

export async function recordPublishError(
  tenantId: string,
  platform: string,
  errorMessage: string
): Promise<void> {
  const supabase = createAdminClient()

  const { data: current } = await supabase
    .from('social_platform_credentials')
    .select('failed_attempts')
    .eq('tenant_id', tenantId)
    .eq('platform', platform)
    .single()

  const current_attempts = current?.failed_attempts ?? 0

  await supabase
    .from('social_platform_credentials')
    .update({
      last_error: errorMessage,
      failed_attempts: current_attempts + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('platform', platform)
}

export async function recordPublishSuccess(tenantId: string, platform: string): Promise<void> {
  const supabase = createAdminClient()

  await supabase
    .from('social_platform_credentials')
    .update({
      failed_attempts: 0,
      last_error: null,
      last_used_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('platform', platform)
}

export async function disconnectCredential(tenantId: string, platform: string): Promise<void> {
  const supabase = createAdminClient()

  const { error } = await supabase
    .from('social_platform_credentials')
    .update({
      is_active: false,
      disconnected_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)
    .eq('platform', platform)

  if (error) throw new Error(`Failed to disconnect: ${error.message}`)
}
