import { createServerClient } from '@/lib/db/server'
import { randomBytes } from 'crypto'
import { hash, compare } from 'bcryptjs'
import { normalizePhone, isValidE164 } from '@/lib/calling/phone-utils'
import { createLogger } from '@/lib/logger'

const log = createLogger('sms-bridge')

// ── Types ────────────────────────────────────────────────────────────

export type SmsBridgeConfig = {
  tenantId: string
  enabled: boolean
  personalBlocklist: string[]
  messagesForwarded: number
  messagesBlocked: number
  lastForwardedAt: string | null
}

// ── Token Management ─────────────────────────────────────────────────

export function generateBridgeToken(): string {
  return randomBytes(32).toString('hex')
}

export async function hashBridgeToken(token: string): Promise<string> {
  return hash(token, 10)
}

export async function verifyBridgeToken(token: string, tokenHash: string): Promise<boolean> {
  return compare(token, tokenHash)
}

// ── Config CRUD ──────────────────────────────────────────────────────

function getDb() {
  return createServerClient({ admin: true }) as any
}

export async function getBridgeConfig(tenantId: string): Promise<SmsBridgeConfig | null> {
  const db = getDb()
  const { data } = await db
    .from('sms_bridge_config')
    .select(
      'tenant_id, enabled, personal_blocklist, messages_forwarded, messages_blocked, last_forwarded_at'
    )
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (!data) return null

  return {
    tenantId: data.tenant_id,
    enabled: data.enabled,
    personalBlocklist: (data.personal_blocklist || []) as string[],
    messagesForwarded: Number(data.messages_forwarded),
    messagesBlocked: Number(data.messages_blocked),
    lastForwardedAt: data.last_forwarded_at,
  }
}

export async function createBridgeConfig(tenantId: string): Promise<{ token: string }> {
  const db = getDb()
  const token = generateBridgeToken()
  const tokenHash = await hashBridgeToken(token)
  const tokenPrefix = token.slice(0, 8)

  await db.from('sms_bridge_config').upsert(
    {
      tenant_id: tenantId,
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      enabled: true,
      personal_blocklist: [],
      messages_forwarded: 0,
      messages_blocked: 0,
    },
    { onConflict: 'tenant_id' }
  )

  return { token }
}

export async function regenerateToken(tenantId: string): Promise<{ token: string }> {
  const db = getDb()
  const token = generateBridgeToken()
  const tokenHash = await hashBridgeToken(token)
  const tokenPrefix = token.slice(0, 8)

  await db
    .from('sms_bridge_config')
    .update({
      token_hash: tokenHash,
      token_prefix: tokenPrefix,
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', tenantId)

  return { token }
}

export async function toggleBridge(tenantId: string, enabled: boolean): Promise<void> {
  const db = getDb()
  await db
    .from('sms_bridge_config')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)
}

// ── Blocklist Management ─────────────────────────────────────────────

export async function addToBlocklist(
  tenantId: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const normalized = normalizePhone(phone)
  if (!isValidE164(normalized)) {
    return { success: false, error: 'Invalid phone number' }
  }

  const db = getDb()
  const config = await getBridgeConfig(tenantId)
  if (!config) return { success: false, error: 'Bridge not configured' }

  if (config.personalBlocklist.includes(normalized)) {
    return { success: true } // already blocked
  }

  const updated = [...config.personalBlocklist, normalized]
  await db
    .from('sms_bridge_config')
    .update({ personal_blocklist: updated, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)

  return { success: true }
}

export async function removeFromBlocklist(
  tenantId: string,
  phone: string
): Promise<{ success: boolean }> {
  const normalized = normalizePhone(phone)
  const db = getDb()
  const config = await getBridgeConfig(tenantId)
  if (!config) return { success: false }

  const updated = config.personalBlocklist.filter((p) => p !== normalized)
  await db
    .from('sms_bridge_config')
    .update({ personal_blocklist: updated, updated_at: new Date().toISOString() })
    .eq('tenant_id', tenantId)

  return { success: true }
}

// ── Auth: resolve tenant from bearer token ───────────────────────────

export async function resolveTokenTenant(token: string): Promise<string | null> {
  const prefix = token.slice(0, 8)
  const db = getDb()
  const { data: configs } = await db
    .from('sms_bridge_config')
    .select('tenant_id, token_hash')
    .eq('token_prefix', prefix)
    .eq('enabled', true)

  if (!configs?.length) return null

  for (const config of configs) {
    const match = await verifyBridgeToken(token, config.token_hash)
    if (match) return config.tenant_id
  }

  return null
}

// ── Blocklist check ──────────────────────────────────────────────────

export async function isBlocked(tenantId: string, senderPhone: string): Promise<boolean> {
  const normalized = normalizePhone(senderPhone)
  const config = await getBridgeConfig(tenantId)
  if (!config) return false
  return config.personalBlocklist.includes(normalized)
}

// ── Stats increment ──────────────────────────────────────────────────

export async function incrementForwarded(tenantId: string): Promise<void> {
  const db = getDb()
  const { error } = await db.rpc('increment_sms_bridge_stat', {
    p_tenant_id: tenantId,
    p_field: 'forwarded',
  })
  if (error) {
    log.warn('Failed to increment forwarded stat', { tenantId, error: error.message })
  }
}

export async function incrementBlocked(tenantId: string): Promise<void> {
  const db = getDb()
  const { error } = await db.rpc('increment_sms_bridge_stat', {
    p_tenant_id: tenantId,
    p_field: 'blocked',
  })
  if (error) {
    log.warn('Failed to increment blocked stat', { tenantId, error: error.message })
  }
}
