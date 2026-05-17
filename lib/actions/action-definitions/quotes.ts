import { registerAction } from '../action-registry'
import type { ActionContext, ActionResult } from '../types'

registerAction({
  id: 'send_quote',
  label: 'Send Quote',
  icon: '📨',
  domain: 'quotes',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Send this quote to the client?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { transitionQuote } = await import('@/lib/quotes/actions')
      await transitionQuote(entityId, 'sent')
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'quote_sent', data: { quoteId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'send_quote_reminder',
  label: 'Quote Reminder',
  icon: '🔔',
  domain: 'quotes',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle'],
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { getQuoteById } = await import('@/lib/quotes/actions')
      const quote = await getQuoteById(entityId)
      if (!quote) return { success: false, message: 'Quote not found' }

      const { sendQuoteExpiringEmail } = await import('@/lib/email/notifications')
      await sendQuoteExpiringEmail({
        clientEmail: quote.client?.email ?? '',
        clientName: quote.client?.full_name ?? 'Client',
        chefName: (_context.chefName as string) ?? 'Your Chef',
        occasion: quote.event?.occasion ?? quote.inquiry?.confirmed_occasion ?? null,
        validUntil: quote.valid_until ?? new Date().toISOString(),
        totalCents: quote.total_cents ?? 0,
        quoteId: entityId,
      })
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})
