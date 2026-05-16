// Cadence Settings Server Actions
// Chef can disable individual cadence points and customize messages.

'use server'

import { createServerClient } from '@/lib/db/server'
import { requireChef } from '@/lib/auth/get-user'
import type { CadencePoint } from './cadence-scheduler'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CadenceSettings {
  disabled_points: CadencePoint[]
  custom_messages: Record<string, string>
}

// ---------------------------------------------------------------------------
// Read Settings
// ---------------------------------------------------------------------------

export async function getCadenceSettings(): Promise<CadenceSettings> {
  const user = await requireChef()
  const db = createServerClient()

  const { data } = await db
    .from('cadence_chef_settings')
    .select('disabled_points, custom_messages')
    .eq('chef_id', user.entityId)
    .single()

  if (!data) {
    return { disabled_points: [], custom_messages: {} }
  }

  return {
    disabled_points: (data.disabled_points as CadencePoint[]) || [],
    custom_messages: (data.custom_messages as Record<string, string>) || {},
  }
}

// ---------------------------------------------------------------------------
// Update Disabled Points
// ---------------------------------------------------------------------------

export async function updateCadenceDisabledPoints(
  disabledPoints: CadencePoint[]
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db = createServerClient()

  try {
    const { error } = await db.from('cadence_chef_settings').upsert(
      {
        chef_id: user.entityId,
        disabled_points: disabledPoints,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id' }
    )

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to update cadence settings' }
  }
}

// ---------------------------------------------------------------------------
// Update Custom Message
// ---------------------------------------------------------------------------

export async function updateCadenceMessage(
  cadencePoint: CadencePoint,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const user = await requireChef()
  const db = createServerClient()

  try {
    // Get existing messages
    const { data: existing } = await db
      .from('cadence_chef_settings')
      .select('custom_messages')
      .eq('chef_id', user.entityId)
      .single()

    const currentMessages = (existing?.custom_messages as Record<string, string>) || {}
    const updatedMessages = { ...currentMessages, [cadencePoint]: message }

    // Remove empty messages
    if (!message.trim()) {
      delete updatedMessages[cadencePoint]
    }

    const { error } = await db.from('cadence_chef_settings').upsert(
      {
        chef_id: user.entityId,
        custom_messages: updatedMessages,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'chef_id' }
    )

    if (error) {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    return { success: false, error: 'Failed to update cadence message' }
  }
}
