import { registerAction } from '../action-registry'
import type { ActionContext, ActionResult } from '../types'

registerAction({
  id: 'mark_inquiry_responded',
  label: 'Mark Responded',
  icon: '✓',
  domain: 'inquiries',
  visibility: 'chef-only',
  availableOn: ['rail', 'page'],
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { transitionInquiry } = await import('@/lib/inquiries/actions')
      await transitionInquiry(entityId, 'awaiting_client')
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'convert_inquiry_to_proposal',
  label: 'Convert to Proposal',
  icon: '📋',
  domain: 'inquiries',
  visibility: 'chef-only',
  availableOn: ['rail', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Convert this inquiry to a proposal?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { transitionInquiry } = await import('@/lib/inquiries/actions')
      await transitionInquiry(entityId, 'quoted')
      return { success: true, dismiss: true, nextAction: 'send_quote' }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'decline_inquiry',
  label: 'Decline',
  icon: '✕',
  domain: 'inquiries',
  visibility: 'chef-only',
  availableOn: ['rail', 'page'],
  variant: 'destructive' as const,
  requiresConfirm: true,
  confirmMessage: 'Decline this inquiry? The client will be notified.',
  async execute(entityId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { declineInquiry } = await import('@/lib/inquiries/actions')
      await declineInquiry(entityId, (context.reason as string) ?? undefined)
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})
