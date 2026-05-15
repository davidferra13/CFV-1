'use server'

import { revalidatePath } from 'next/cache'

export type InlineActionResult = {
  success: boolean
  message?: string
  redirect?: string
}

/**
 * Dispatch an inline action from a rail item.
 * Maps action identifiers to server action calls.
 */
export async function executeInlineAction(
  action: string,
  params: Record<string, unknown>
): Promise<InlineActionResult> {
  switch (action) {
    case 'navigate': {
      const href = params.href as string | undefined
      if (!href) return { success: false, message: 'No href provided' }
      return { success: true, redirect: href }
    }

    case 'send_payment_reminder': {
      // Phase 4: wire to actual email/notification action
      // For now, navigate to the event financials page
      const eventId = params.eventId as string | undefined
      if (!eventId) return { success: false, message: 'No eventId' }
      return { success: true, redirect: `/chef/events/${eventId}/financials` }
    }

    case 'send_quote_reminder': {
      // Phase 4: wire to actual follow-up action
      const quoteId = params.quoteId as string | undefined
      if (!quoteId) return { success: false, message: 'No quoteId' }
      return { success: true, redirect: `/chef/quotes/${quoteId}` }
    }

    default:
      return { success: false, message: `Unknown action: ${action}` }
  }
}
