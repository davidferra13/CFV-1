'use server'

import { requireChef } from '@/lib/auth/get-user'
import {
  getBridgeConfig,
  createBridgeConfig,
  regenerateToken,
  toggleBridge,
  addToBlocklist,
  removeFromBlocklist,
  type SmsBridgeConfig,
} from './config'

export async function getSmsBridgeStatus(): Promise<{
  configured: boolean
  config: SmsBridgeConfig | null
}> {
  const user = await requireChef()
  if (!user.tenantId) return { configured: false, config: null }

  const config = await getBridgeConfig(user.tenantId)
  return { configured: !!config, config }
}

export async function setupSmsBridge(): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  try {
    const { token } = await createBridgeConfig(user.tenantId)
    return { success: true, token }
  } catch (err) {
    return { success: false, error: 'Failed to set up SMS bridge' }
  }
}

export async function regenerateSmsBridgeToken(): Promise<{
  success: boolean
  token?: string
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  try {
    const { token } = await regenerateToken(user.tenantId)
    return { success: true, token }
  } catch (err) {
    return { success: false, error: 'Failed to regenerate token' }
  }
}

export async function toggleSmsBridge(enabled: boolean): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }

  try {
    await toggleBridge(user.tenantId, enabled)
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to toggle bridge' }
  }
}

export async function addPersonalContact(phone: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }
  return addToBlocklist(user.tenantId, phone)
}

export async function removePersonalContact(phone: string): Promise<{
  success: boolean
  error?: string
}> {
  const user = await requireChef()
  if (!user.tenantId) return { success: false, error: 'No tenant' }
  return removeFromBlocklist(user.tenantId, phone)
}
