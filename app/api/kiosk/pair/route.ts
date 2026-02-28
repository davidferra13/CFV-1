// Kiosk Pairing API — verifies pairing code, issues device token
// No Supabase auth required — uses admin client

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateDeviceToken, hashToken } from '@/lib/devices/token'
import type { KioskConfig } from '@/lib/devices/types'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { pairing_code } = body

    if (!pairing_code || typeof pairing_code !== 'string') {
      return NextResponse.json({ error: 'Pairing code is required' }, { status: 400 })
    }

    const codeHash = hashToken(pairing_code.toUpperCase().trim())
    const supabase: any = createAdminClient()

    // Find device by pairing code hash
    const { data: device, error } = await supabase
      .from('devices')
      .select(
        'id, tenant_id, status, pairing_expires_at, mode, kiosk_flow, idle_timeout_seconds, require_staff_pin'
      )
      .eq('pairing_code_hash', codeHash)
      .eq('status', 'pending_pair')
      .single()

    if (error || !device) {
      return NextResponse.json({ error: 'Invalid or expired pairing code' }, { status: 401 })
    }

    // Check expiry
    if (device.pairing_expires_at && new Date(device.pairing_expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Pairing code has expired. Request a new one.' },
        { status: 401 }
      )
    }

    // Generate device token
    const rawToken = generateDeviceToken()
    const tokenHash = hashToken(rawToken)

    // Get business name for kiosk display
    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name')
      .eq('id', device.tenant_id)
      .single()

    // Mark device as claimed
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    const { error: updateError } = await supabase
      .from('devices')
      .update({
        status: 'active',
        token_hash: tokenHash,
        claimed_at: new Date().toISOString(),
        last_seen_at: new Date().toISOString(),
        last_ip: ip,
        pairing_code_hash: null, // Clear pairing code after use
        pairing_expires_at: null,
      })
      .eq('id', device.id)

    if (updateError) {
      console.error('[kiosk/pair] Failed to claim device:', updateError)
      return NextResponse.json({ error: 'Failed to pair device' }, { status: 500 })
    }

    // Log pairing event
    try {
      await supabase.from('device_events').insert({
        device_id: device.id,
        tenant_id: device.tenant_id,
        type: 'paired',
        payload: { ip, user_agent: request.headers.get('user-agent') || '' },
      })
    } catch (e) {
      console.error('[kiosk/pair] Event log failed (non-blocking):', e)
    }

    const config: KioskConfig = {
      device_id: device.id,
      tenant_id: device.tenant_id,
      business_name: chef?.business_name || 'ChefFlow',
      mode: device.mode,
      kiosk_flow: device.kiosk_flow,
      idle_timeout_seconds: device.idle_timeout_seconds,
      require_staff_pin: device.require_staff_pin,
      status: 'active',
    }

    return NextResponse.json({ token: rawToken, config })
  } catch (err) {
    console.error('[kiosk/pair] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
