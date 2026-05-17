'use server'

import { executeAction, getAction } from '@/lib/actions/action-registry'
import '@/lib/actions'

export type InlineActionResult = {
  success: boolean
  message?: string
  redirect?: string
}

/**
 * Dispatch an inline action from a rail item.
 * Delegates to universal action registry when possible, falls back to legacy handlers.
 */
export async function executeInlineAction(
  action: string,
  params: Record<string, unknown>
): Promise<InlineActionResult> {
  if (action === 'navigate') {
    const href = params.href as string | undefined
    if (!href) return { success: false, message: 'No href provided' }
    return { success: true, redirect: href }
  }

  if (action === 'respond_collab_handoff') {
    const handoffId = params.handoffId as string | undefined
    const response = params.action ?? params.response
    const handoffAction = response === 'rejected' ? 'rejected' : 'accepted'
    const responseNote = params.responseNote as string | undefined

    if (!handoffId) return { success: false, message: 'No handoffId' }

    const { respondToCollabHandoff } = await import('@/lib/network/collab-actions')
    await respondToCollabHandoff({
      handoffId,
      action: handoffAction,
      responseNote,
    })

    return {
      success: true,
      redirect: `/network?tab=collab&handoff=${encodeURIComponent(handoffId)}`,
    }
  }

  const registeredAction = getAction(action)
  if (registeredAction) {
    const entityId = (params.entityId ?? params.eventId ?? params.quoteId ?? params.contractId ?? params.inquiryId ?? '') as string
    const result = await executeAction(action, entityId, params)

    if (result.success && result.circleNotification) {
      const { postActionResultToCircle } = await import('@/lib/actions/action-circle-bridge')
      postActionResultToCircle(result).catch(() => {})
    }

    return {
      success: result.success,
      message: result.message,
      redirect: undefined,
    }
  }

  return { success: false, message: `Unknown action: ${action}` }
}
