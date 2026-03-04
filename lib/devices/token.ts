// Device Token & PIN Utilities
// Handles generation, hashing, and validation for device API tokens and staff PINs.

import { createHash, randomBytes } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Generate a random device API token (64 hex chars = 32 bytes).
 * The raw token is shown once during pairing; only the hash is stored.
 */
export function generateDeviceToken(): string {
  return randomBytes(32).toString('hex')
}

/**
 * Generate a random pairing code (8 uppercase alphanumeric chars).
 * Avoids ambiguous characters (0/O, 1/I/L) for readability on tablets.
 */
export function generatePairingCode(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length]
  }
  return code
}

/**
 * SHA-256 hash for tokens, pairing codes, and PINs.
 */
export function hashToken(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

/**
 * Validate a device API token against the database.
 * Returns the device record if valid and active, or null.
 */
export async function validateDeviceToken(bearerToken: string): Promise<{
  deviceId: string
  tenantId: string
  mode: string
  kioskFlow: string
  status: string
  idleTimeoutSeconds: number
  requireStaffPin: boolean
} | null> {
  if (!bearerToken) return null

  const tokenHash = hashToken(bearerToken)
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('devices')
    .select('id, tenant_id, mode, kiosk_flow, status, idle_timeout_seconds, require_staff_pin')
    .eq('token_hash', tokenHash)
    .single()

  if (error || !data) return null
  if (data.status !== 'active') return null

  // Verify tenant still exists (owner may have been deleted)
  const { data: tenant } = await supabase
    .from('chefs')
    .select('id')
    .eq('id', data.tenant_id)
    .single()

  if (!tenant) return null

  return {
    deviceId: data.id,
    tenantId: data.tenant_id,
    mode: data.mode,
    kioskFlow: data.kiosk_flow,
    status: data.status,
    idleTimeoutSeconds: data.idle_timeout_seconds,
    requireStaffPin: data.require_staff_pin,
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get('authorization')
  if (!auth?.startsWith('Bearer ')) return null
  return auth.slice(7)
}

/**
 * Validate a staff PIN for a given tenant.
 * Returns the matching staff member or null.
 */
export async function validateStaffPin(
  tenantId: string,
  pin: string
): Promise<{ id: string; name: string; role: string | null } | null> {
  if (!pin || pin.length < 4 || pin.length > 6) return null

  const pinHash = hashToken(pin)
  const supabase: any = createAdminClient()

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, role')
    .eq('chef_id', tenantId)
    .eq('kiosk_pin', pinHash)
    .eq('status', 'active')
    .single()

  if (error || !data) return null

  return { id: data.id, name: data.name, role: data.role ?? null }
}
