'use server'

import { requireChef } from '@/lib/auth/get-user'
import { recordEngagement, type RailActionType } from './engagement-tracker'

// ---------------------------------------------------------------------------
// Server action: record a rail engagement event
// ---------------------------------------------------------------------------

const VALID_ACTIONS: Set<string> = new Set(['click', 'dismiss', 'save', 'expand', 'hover'])

export async function recordRailEngagement(
  itemKey: string,
  source: string,
  actionType: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await requireChef()

    // Input validation
    if (!itemKey || typeof itemKey !== 'string') {
      return { success: false, error: 'Invalid item key' }
    }
    if (!source || typeof source !== 'string') {
      return { success: false, error: 'Invalid source' }
    }
    if (!VALID_ACTIONS.has(actionType)) {
      return { success: false, error: 'Invalid action type' }
    }

    await recordEngagement(user.tenantId!, user.userId, source, actionType as RailActionType)

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}
