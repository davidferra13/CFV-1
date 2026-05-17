import { registerAction } from '../action-registry'
import type { ActionContext, ActionResult } from '../types'

registerAction({
  id: 'request_deposit',
  label: 'Request Deposit',
  icon: '💰',
  domain: 'payments',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Send deposit request to client?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { requireChef } = await import('@/lib/auth/get-user')
      const user = await requireChef()
      const { sendPaymentReminder } = await import('@/lib/invoices/reminder-actions')
      await sendPaymentReminder(entityId, user.tenantId!)
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'payment_requested', data: { eventId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'record_offline_payment',
  label: 'Record Payment',
  icon: '✅',
  domain: 'payments',
  visibility: 'chef-only',
  availableOn: ['rail', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Record this payment?',
  async execute(entityId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { recordOfflinePayment } = await import('@/lib/events/offline-payment-actions')
      await recordOfflinePayment({
        eventId: entityId,
        amountCents: context.amountCents as number,
        paymentMethod: ((context.paymentMethod as string) ?? 'other') as any,
        paidAt: (context.paidAt as string) ?? new Date().toISOString().slice(0, 10),
        notes: (context.notes as string) ?? undefined,
      })
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'payment_received', data: { eventId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'send_payment_reminder',
  label: 'Payment Reminder',
  icon: '🔔',
  domain: 'payments',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle'],
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { requireChef } = await import('@/lib/auth/get-user')
      const user = await requireChef()
      const { sendPaymentReminder } = await import('@/lib/invoices/reminder-actions')
      await sendPaymentReminder(entityId, user.tenantId!)
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})
