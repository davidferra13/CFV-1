import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { INTEGRATION_PROVIDER_META } from '@/lib/integrations/core/providers'
import type { IntegrationProvider } from '@/lib/integrations/core/types'
import { isPosProvider, normalizePosConnectionInput } from './providers/pos-integration'
import { isCrmProvider, normalizeCrmConnectionInput } from './providers/crm-integration'

export type ConnectedAccount = {
  id: string
  provider: IntegrationProvider
  providerLabel: string
  category: string
  status: 'connected' | 'disconnected' | 'error' | 'reauth_required'
  authType: 'oauth2' | 'api_key' | 'pat' | 'none'
  externalAccountName: string | null
  externalAccountId: string | null
  lastSyncAt: string | null
  connectedAt: string
}

export type ConnectIntegrationInput = {
  provider: IntegrationProvider
  externalAccountId?: string | null
  externalAccountName?: string | null
  apiKey?: string | null
  settings?: Record<string, unknown>
}

function isMissingRelationError(error: any): boolean {
  return error?.code === '42P01'
}

function isUniqueConstraint(error: any): boolean {
  return error?.code === '23505'
}

// Dangerous keys that could pollute Object.prototype if spread into an object
const PROTO_POLLUTION_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function mergeSettings(base: Record<string, unknown>, extra?: Record<string, unknown>) {
  if (!extra) return { ...base }
  // Strip prototype pollution keys from user-supplied settings
  const sanitized: Record<string, unknown> = {}
  for (const key of Object.keys(extra)) {
    if (!PROTO_POLLUTION_KEYS.has(key)) {
      sanitized[key] = extra[key]
    }
  }
  return { ...base, ...sanitized }
}

async function persistTenantIntegrationSettings(
  tenantId: string,
  provider: IntegrationProvider,
  settings: Record<string, unknown>
) {
  const supabase: any = createServerClient()

  try {
    await supabase.from('tenant_settings').upsert(
      {
        tenant_id: tenantId,
        integration_connection_settings: {
          provider,
          ...settings,
        },
        integration_updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_id' }
    )
  } catch (error) {
    console.error('[integration-hub] Failed to persist tenant settings (non-fatal):', error)
  }
}

export async function listConnectedAccounts(): Promise<ConnectedAccount[]> {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { data, error } = await supabase
    .from('integration_connections')
    .select(
      'id, provider, status, auth_type, external_account_name, external_account_id, last_sync_at, connected_at'
    )
    .eq('tenant_id', user.tenantId!)
    .order('connected_at', { ascending: false })

  if (error) {
    if (isMissingRelationError(error)) return []
    throw new Error(`Failed to load connected accounts: ${error.message}`)
  }

  const rows = (data || []) as Array<{
    id: string
    provider: IntegrationProvider
    status: ConnectedAccount['status']
    auth_type: ConnectedAccount['authType']
    external_account_name: string | null
    external_account_id: string | null
    last_sync_at: string | null
    connected_at: string
  }>

  return rows.map((row) => {
    const meta = INTEGRATION_PROVIDER_META.find((item) => item.provider === row.provider)
    return {
      id: row.id,
      provider: row.provider,
      providerLabel: meta?.label || row.provider,
      category: meta?.category || 'custom',
      status: row.status,
      authType: row.auth_type,
      externalAccountName: row.external_account_name,
      externalAccountId: row.external_account_id,
      lastSyncAt: row.last_sync_at,
      connectedAt: row.connected_at,
    }
  })
}

export async function connectIntegrationAccount(input: ConnectIntegrationInput) {
  const user = await requireChef()
  const supabase: any = createServerClient()
  const meta = INTEGRATION_PROVIDER_META.find((item) => item.provider === input.provider)

  if (!meta) {
    throw new Error('Unknown integration provider')
  }

  let normalized: {
    authType: 'oauth2' | 'api_key' | 'pat' | 'none'
    externalAccountId: string | null
    externalAccountName: string | null
    apiKey: string | null
    settings: Record<string, unknown>
  } = {
    authType: input.apiKey ? 'api_key' : meta.supportsOAuth ? 'oauth2' : 'none',
    externalAccountId: input.externalAccountId?.trim() || null,
    externalAccountName: input.externalAccountName?.trim() || null,
    apiKey: input.apiKey?.trim() || null,
    settings: mergeSettings(
      {
        provider: input.provider,
        category: meta.category,
        supportsWebhook: meta.supportsWebhook,
        supportsPull: meta.supportsPull,
      },
      input.settings
    ),
  }

  if (isPosProvider(input.provider)) {
    normalized = {
      ...normalizePosConnectionInput(input),
      settings: mergeSettings(normalizePosConnectionInput(input).settings, input.settings),
    }
  } else if (isCrmProvider(input.provider)) {
    normalized = {
      ...normalizeCrmConnectionInput(input),
      settings: mergeSettings(normalizeCrmConnectionInput(input).settings, input.settings),
    }
  }

  const payload = {
    chef_id: user.entityId,
    tenant_id: user.tenantId,
    provider: input.provider,
    status: 'connected' as const,
    auth_type: normalized.authType,
    external_account_name: normalized.externalAccountName,
    external_account_id: normalized.externalAccountId,
    api_key: normalized.apiKey,
    settings: normalized.settings,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  const insert = await supabase
    .from('integration_connections')
    .insert(payload)
    .select(
      'id, provider, status, auth_type, external_account_name, external_account_id, last_sync_at, connected_at'
    )
    .single()

  let data = insert.data as any
  let error = insert.error

  if (error && isUniqueConstraint(error)) {
    const update = await supabase
      .from('integration_connections')
      .update({
        status: 'connected',
        auth_type: normalized.authType,
        external_account_name: normalized.externalAccountName,
        external_account_id: normalized.externalAccountId,
        api_key: normalized.apiKey,
        settings: normalized.settings,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', user.tenantId!)
      .eq('provider', input.provider)
      .select(
        'id, provider, status, auth_type, external_account_name, external_account_id, last_sync_at, connected_at'
      )
      .single()
    data = update.data
    error = update.error
  }

  if (error || !data) {
    throw new Error(`Failed to connect integration: ${error?.message || 'Unknown error'}`)
  }

  await persistTenantIntegrationSettings(user.tenantId!, input.provider, normalized.settings)
  return data
}

export async function disconnectIntegrationAccount(connectionId: string) {
  const user = await requireChef()
  const supabase: any = createServerClient()

  const { error } = await supabase
    .from('integration_connections')
    .update({
      status: 'disconnected',
      api_key: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)
    .eq('tenant_id', user.tenantId!)

  if (error) {
    throw new Error(`Failed to disconnect integration: ${error.message}`)
  }

  return { success: true }
}

export async function getIntegrationHubOverview() {
  const accounts = await listConnectedAccounts()
  const totals = {
    connected: 0,
    disconnected: 0,
    error: 0,
    reauth_required: 0,
  }

  for (const account of accounts) {
    totals[account.status] += 1
  }

  const categories = new Map<string, { connected: number; total: number }>()
  for (const meta of INTEGRATION_PROVIDER_META) {
    if (!categories.has(meta.category)) {
      categories.set(meta.category, { connected: 0, total: 0 })
    }
    categories.get(meta.category)!.total += 1
  }
  for (const account of accounts) {
    const summary = categories.get(account.category)
    if (summary && account.status === 'connected') {
      summary.connected += 1
    }
  }

  return {
    totals,
    categorySummary: [...categories.entries()].map(([category, summary]) => ({
      category,
      ...summary,
    })),
    accounts,
  }
}
