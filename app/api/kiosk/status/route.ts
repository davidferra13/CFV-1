// Kiosk Status API — returns device status + config
// Used by kiosk to check if device is still active
// Requires device token in Authorization header

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { extractBearerToken, hashToken } from '@/lib/devices/token'
import type { KioskConfig } from '@/lib/devices/types'

export async function GET(request: Request) {
  try {
    const token = extractBearerToken(request)
    if (!token) {
      return NextResponse.json({ error: 'Device token required' }, { status: 401 })
    }

    const tokenHash = hashToken(token)
    const supabase = createAdminClient()

    const { data: device, error } = await supabase
      .from('devices')
      .select('id, tenant_id, status, mode, kiosk_flow, idle_timeout_seconds, require_staff_pin')
      .eq('token_hash', tokenHash)
      .single()

    if (error || !device) {
      return NextResponse.json({ error: 'Device not found', status: 'revoked' }, { status: 401 })
    }

    if (device.status === 'disabled' || device.status === 'revoked') {
      return NextResponse.json({ status: device.status, config: null })
    }

    const { data: chef } = await supabase
      .from('chefs')
      .select('business_name')
      .eq('id', device.tenant_id)
      .single()

    const config: KioskConfig = {
      device_id: device.id,
      tenant_id: device.tenant_id,
      business_name: chef?.business_name || 'ChefFlow',
      mode: device.mode,
      kiosk_flow: device.kiosk_flow,
      idle_timeout_seconds: device.idle_timeout_seconds,
      require_staff_pin: device.require_staff_pin,
      status: device.status,
    }

    return NextResponse.json({ status: device.status, config })
  } catch (err) {
    console.error('[kiosk/status] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
