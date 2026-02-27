'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { generatePairingCode, generateDeviceToken, hashToken } from './token'
import type { DeviceWithOnlineStatus } from './types'
import { getOnlineStatus } from './types'

// ─── Schemas ────────────────────────────────────────────────────────

const CreateDeviceSchema = z.object({
  name: z.string().min(1, 'Device name is required').max(100),
  device_type: z.enum(['ipad', 'android', 'browser']).default('browser'),
  location_name: z.string().max(200).optional(),
  kiosk_flow: z.enum(['inquiry', 'checkin', 'menu_browse', 'order']).default('inquiry'),
  require_staff_pin: z.boolean().default(true),
  idle_timeout_seconds: z.number().int().min(10).max(3600).default(90),
})

const UpdateDeviceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location_name: z.string().max(200).nullable().optional(),
  kiosk_flow: z.enum(['inquiry', 'checkin', 'menu_browse', 'order']).optional(),
  require_staff_pin: z.boolean().optional(),
  idle_timeout_seconds: z.number().int().min(10).max(3600).optional(),
})

// ─── Create Device ──────────────────────────────────────────────────

export async function createDevice(input: unknown) {
  const user = await requireChef()
  const parsed = CreateDeviceSchema.parse(input)

  const pairingCode = generatePairingCode()
  const pairingCodeHash = hashToken(pairingCode)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString() // 15 min

  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('devices')
    .insert({
      tenant_id: user.entityId,
      name: parsed.name,
      location_name: parsed.location_name || null,
      device_type: parsed.device_type,
      kiosk_flow: parsed.kiosk_flow,
      require_staff_pin: parsed.require_staff_pin,
      idle_timeout_seconds: parsed.idle_timeout_seconds,
      pairing_code_hash: pairingCodeHash,
      pairing_expires_at: expiresAt,
      status: 'pending_pair',
      mode: 'kiosk',
    })
    .select('id, name, status, created_at')
    .single()

  if (error) throw new Error(`Failed to create device: ${error.message}`)

  revalidatePath('/settings/devices')
  return { device: data, pairingCode, expiresAt }
}

// ─── List Devices ───────────────────────────────────────────────────

export async function listDevices(): Promise<DeviceWithOnlineStatus[]> {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('devices')
    .select('*')
    .eq('tenant_id', user.entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Failed to list devices: ${error.message}`)

  return (data || []).map((d) => ({
    ...d,
    online_status: getOnlineStatus(d.last_seen_at),
  })) as DeviceWithOnlineStatus[]
}

// ─── Get Device Detail ──────────────────────────────────────────────

export async function getDeviceDetail(deviceId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data: device, error } = await supabase
    .from('devices')
    .select('*')
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)
    .single()

  if (error || !device) throw new Error('Device not found')

  const { data: events } = await supabase
    .from('device_events')
    .select('*')
    .eq('device_id', deviceId)
    .order('created_at', { ascending: false })
    .limit(50)

  return {
    device: { ...device, online_status: getOnlineStatus(device.last_seen_at) },
    events: events || [],
  }
}

// ─── Disable Device ─────────────────────────────────────────────────

export async function disableDevice(deviceId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('devices')
    .update({ status: 'disabled' })
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to disable device: ${error.message}`)

  // Log event (non-blocking)
  try {
    await supabase.from('device_events').insert({
      device_id: deviceId,
      tenant_id: user.entityId,
      type: 'disabled',
      payload: { disabled_by: user.id },
    })
  } catch (e) {
    console.error('[disableDevice] Event log failed (non-blocking):', e)
  }

  revalidatePath('/settings/devices')
  return { success: true }
}

// ─── Revoke Device ──────────────────────────────────────────────────

export async function revokeDevice(deviceId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('devices')
    .update({ status: 'revoked', token_hash: null })
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to revoke device: ${error.message}`)

  try {
    await supabase.from('device_events').insert({
      device_id: deviceId,
      tenant_id: user.entityId,
      type: 'revoked',
      payload: { revoked_by: user.id },
    })
  } catch (e) {
    console.error('[revokeDevice] Event log failed (non-blocking):', e)
  }

  revalidatePath('/settings/devices')
  return { success: true }
}

// ─── Regenerate Pairing Code ────────────────────────────────────────

export async function regeneratePairingCode(deviceId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  // Verify device belongs to tenant and is in pending_pair or disabled state
  const { data: existing } = await supabase
    .from('devices')
    .select('status')
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)
    .single()

  if (!existing) throw new Error('Device not found')

  const pairingCode = generatePairingCode()
  const pairingCodeHash = hashToken(pairingCode)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString()

  // Reset to pending_pair with new code
  const { error } = await supabase
    .from('devices')
    .update({
      pairing_code_hash: pairingCodeHash,
      pairing_expires_at: expiresAt,
      status: 'pending_pair',
      token_hash: null,
      claimed_at: null,
    })
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to regenerate pairing code: ${error.message}`)

  revalidatePath('/settings/devices')
  return { pairingCode, expiresAt }
}

// ─── Update Device ──────────────────────────────────────────────────

export async function updateDevice(deviceId: string, input: unknown) {
  const user = await requireChef()
  const parsed = UpdateDeviceSchema.parse(input)

  const supabase = createServerClient()
  const { error } = await supabase
    .from('devices')
    .update(parsed)
    .eq('id', deviceId)
    .eq('tenant_id', user.entityId)

  if (error) throw new Error(`Failed to update device: ${error.message}`)

  revalidatePath('/settings/devices')
  return { success: true }
}

// ─── Staff PIN Management ───────────────────────────────────────────

export async function setStaffPin(staffMemberId: string, pin: string) {
  const user = await requireChef()

  if (!/^\d{4,6}$/.test(pin)) {
    throw new Error('PIN must be 4-6 digits')
  }

  const pinHash = hashToken(pin)
  const supabase = createServerClient()

  // Check uniqueness within tenant before setting
  const { data: existing } = await supabase
    .from('staff_members')
    .select('id, name')
    .eq('chef_id', user.entityId)
    .eq('kiosk_pin', pinHash)
    .eq('status', 'active')
    .neq('id', staffMemberId)
    .maybeSingle()

  if (existing) {
    throw new Error(
      `This PIN is already assigned to ${existing.name}. Each staff member needs a unique PIN.`
    )
  }

  const { error } = await supabase
    .from('staff_members')
    .update({ kiosk_pin: pinHash })
    .eq('id', staffMemberId)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to set PIN: ${error.message}`)

  revalidatePath('/settings/devices')
  return { success: true }
}

export async function removeStaffPin(staffMemberId: string) {
  const user = await requireChef()
  const supabase = createServerClient()

  const { error } = await supabase
    .from('staff_members')
    .update({ kiosk_pin: null })
    .eq('id', staffMemberId)
    .eq('chef_id', user.entityId)

  if (error) throw new Error(`Failed to remove PIN: ${error.message}`)

  revalidatePath('/settings/devices')
  return { success: true }
}

// ─── List Staff with PIN Status ─────────────────────────────────────

export async function listStaffWithPinStatus() {
  const user = await requireChef()
  const supabase = createServerClient()

  const { data, error } = await supabase
    .from('staff_members')
    .select('id, name, role, status, kiosk_pin')
    .eq('chef_id', user.entityId)
    .eq('status', 'active')
    .order('name')

  if (error) throw new Error(`Failed to list staff: ${error.message}`)

  return (data || []).map((s) => ({
    id: s.id,
    name: s.name,
    role: s.role,
    has_pin: !!s.kiosk_pin,
  }))
}
