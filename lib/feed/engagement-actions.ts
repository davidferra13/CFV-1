'use server'

import { requireChef } from '@/lib/auth/get-user'
import type { EngagementActionType } from './engagement-tracker'
import { recordRailEngagement } from './engagement-tracker'

const VALID_ACTIONS: Set<string> = new Set(['act', 'dismiss', 'snooze', 'save', 'click'])

export async function trackRailEngagement(
  itemKey: string,
  source: string,
  category: string,
  actionType: EngagementActionType
): Promise<{ success: boolean }> {
  try {
    const user = await requireChef()

    if (!itemKey || !source || !category) {
      return { success: false }
    }
    if (!VALID_ACTIONS.has(actionType)) {
      return { success: false }
    }

    await recordRailEngagement(user.tenantId!, user.userId, itemKey, source, category, actionType)

    return { success: true }
  } catch {
    return { success: false }
  }
}
