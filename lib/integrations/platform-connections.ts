'use server'

import { requireChef } from '@/lib/auth/get-user'
import { createServerClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { SUPPORTED_PLATFORMS } from './platform-connections-constants'

export interface PlatformConnectionStatus {
  platform: string
  name: string
  description: string
  authType: 'api_key' | 'oauth'
  status: 'connected' | 'disconnected' | 'error' | 'pending'
  connectedAt: string | null
  lastSyncAt: string | null
  lastError: string | null
}

const VALID_PLATFORM_KEYS = new Set(SUPPORTED_PLATFORMS.map((p) => p.key))

export async function getPlatformConnectionStatuses(): Promise<PlatformConnectionStatus[]> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const chefId = user.tenantId!

    const { data: rows, error } = await db
      .from('platform_api_connections')
      .select('platform, status, connected_at, last_sync_at, last_error')
      .eq('chef_id', chefId)

    if (error) {
      console.error('[platform-connections] Failed to fetch connections', error)
    }

    const connectionMap = new Map<
      string,
      {
        status: string
        connected_at: string | null
        last_sync_at: string | null
        last_error: string | null
      }
    >()

    if (rows) {
      for (const row of rows) {
        connectionMap.set(row.platform, {
          status: row.status,
          connected_at: row.connected_at,
          last_sync_at: row.last_sync_at,
          last_error: row.last_error,
        })
      }
    }

    return SUPPORTED_PLATFORMS.map((p) => {
      const conn = connectionMap.get(p.key)
      return {
        platform: p.key,
        name: p.name,
        description: p.description,
        authType: p.authType,
        status: (conn?.status as PlatformConnectionStatus['status']) || 'disconnected',
        connectedAt: conn?.connected_at || null,
        lastSyncAt: conn?.last_sync_at || null,
        lastError: conn?.last_error || null,
      }
    })
  } catch (err) {
    console.error('[platform-connections] getPlatformConnectionStatuses failed', err)
    return SUPPORTED_PLATFORMS.map((p) => ({
      platform: p.key,
      name: p.name,
      description: p.description,
      authType: p.authType,
      status: 'disconnected' as const,
      connectedAt: null,
      lastSyncAt: null,
      lastError: null,
    }))
  }
}

export async function updatePlatformConnection(
  platform: string,
  credentials: Record<string, string>
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const chefId = user.tenantId!

    if (!VALID_PLATFORM_KEYS.has(platform)) {
      return { success: false, error: `Unsupported platform: ${platform}` }
    }

    const { error } = await db.from('platform_api_connections').upsert(
      {
        chef_id: chefId,
        platform,
        credentials,
        status: 'connected',
        connected_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id, platform' }
    )

    if (error) {
      console.error('[platform-connections] Failed to update connection', error)
      return { success: false, error: 'Failed to save connection' }
    }

    revalidatePath('/settings/platform-connections')
    return { success: true }
  } catch (err) {
    console.error('[platform-connections] updatePlatformConnection failed', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

export async function disconnectPlatformConnection(
  platform: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()
    const db: any = createServerClient()
    const chefId = user.tenantId!

    if (!VALID_PLATFORM_KEYS.has(platform)) {
      return { success: false, error: `Unsupported platform: ${platform}` }
    }

    const { error } = await db
      .from('platform_api_connections')
      .update({
        status: 'disconnected',
        credentials: {},
        connected_at: null,
        last_sync_at: null,
        last_error: null,
      })
      .eq('chef_id', chefId)
      .eq('platform', platform)

    if (error) {
      console.error('[platform-connections] Failed to disconnect', error)
      return { success: false, error: 'Failed to disconnect platform' }
    }

    revalidatePath('/settings/platform-connections')
    return { success: true }
  } catch (err) {
    console.error('[platform-connections] disconnectPlatformConnection failed', err)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
