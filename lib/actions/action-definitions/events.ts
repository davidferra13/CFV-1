import { registerAction } from '../action-registry'
import type { ActionContext, ActionResult } from '../types'

registerAction({
  id: 'confirm_event',
  label: 'Confirm Event',
  icon: '✓',
  domain: 'events',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Confirm this event?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { confirmEvent } = await import('@/lib/events/transitions')
      await confirmEvent(entityId)
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'event_confirmed', data: { eventId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'complete_event',
  label: 'Mark Complete',
  icon: '🎉',
  domain: 'events',
  visibility: 'chef-only',
  availableOn: ['rail', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Mark event as complete?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { completeEvent } = await import('@/lib/events/transitions')
      await completeEvent(entityId)
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'cancel_event',
  label: 'Cancel Event',
  icon: '✕',
  domain: 'events',
  visibility: 'client-visible',
  availableOn: ['page'],
  variant: 'destructive' as const,
  requiresConfirm: true,
  confirmMessage: 'Cancel this event? All parties will be notified.',
  async execute(entityId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { cancelEvent } = await import('@/lib/events/transitions')
      await cancelEvent(entityId, (context.reason as string) ?? 'Cancelled')
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'event_cancelled', data: { eventId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'send_followup',
  label: 'Follow Up',
  icon: '💬',
  domain: 'communication',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle'],
  async execute(entityId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { sendReplyViaChannel } = await import('@/lib/communication/actions')
      await sendReplyViaChannel({
        threadId: (context.threadId as string) ?? '',
        content: (context.message as string) ?? '',
        channel: ((context.channel as string) ?? 'email') as any,
        recipientAddress: (context.recipientAddress as string) ?? '',
      })
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})
