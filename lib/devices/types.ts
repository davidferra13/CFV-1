// Device Kiosk & Fleet Management — Type Definitions

export type DeviceType = 'ipad' | 'android' | 'browser'
export type DeviceStatus = 'pending_pair' | 'active' | 'disabled' | 'revoked'
export type DeviceMode = 'kiosk'
export type KioskFlow = 'inquiry' | 'checkin' | 'menu_browse' | 'order'

export interface Device {
  id: string
  tenant_id: string
  name: string
  location_name: string | null
  device_type: DeviceType
  status: DeviceStatus
  mode: DeviceMode
  kiosk_flow: KioskFlow
  pairing_code_hash: string | null
  pairing_expires_at: string | null
  token_hash: string | null
  claimed_at: string | null
  last_seen_at: string | null
  last_ip: string | null
  app_version: string | null
  idle_timeout_seconds: number
  require_staff_pin: boolean
  created_at: string
  updated_at: string
}

export interface DeviceSession {
  id: string
  device_id: string
  staff_member_id: string | null
  started_at: string
  ended_at: string | null
  status: 'active' | 'ended'
  last_seen_at: string | null
  user_agent: string | null
  ip: string | null
}

export interface DeviceEvent {
  id: string
  device_id: string
  tenant_id: string
  staff_member_id: string | null
  type: string
  payload: Record<string, unknown>
  created_at: string
}

export interface CreateDeviceInput {
  name: string
  device_type: DeviceType
  location_name?: string
  kiosk_flow?: KioskFlow
  require_staff_pin?: boolean
  idle_timeout_seconds?: number
}

export interface UpdateDeviceInput {
  name?: string
  location_name?: string | null
  kiosk_flow?: KioskFlow
  require_staff_pin?: boolean
  idle_timeout_seconds?: number
}

export interface KioskConfig {
  device_id: string
  tenant_id: string
  business_name: string
  mode: DeviceMode
  kiosk_flow: KioskFlow
  idle_timeout_seconds: number
  require_staff_pin: boolean
  status: DeviceStatus
  success_display_seconds?: number
}

export interface StaffPinSession {
  staff_member_id: string
  staff_name: string
  session_id: string
}

export interface DeviceWithOnlineStatus extends Device {
  online_status: 'online' | 'stale' | 'offline'
  active_staff_name?: string | null
}

export interface KioskConfigExtended extends KioskConfig {
  success_display_seconds: number
}

/** Computed from last_seen_at */
export function getOnlineStatus(lastSeenAt: string | null): 'online' | 'stale' | 'offline' {
  if (!lastSeenAt) return 'offline'
  const diff = Date.now() - new Date(lastSeenAt).getTime()
  const minutes = diff / 60000
  if (minutes < 2) return 'online'
  if (minutes < 10) return 'stale'
  return 'offline'
}
