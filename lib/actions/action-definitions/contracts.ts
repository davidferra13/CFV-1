import { registerAction } from '../action-registry'
import type { ActionContext, ActionResult } from '../types'

registerAction({
  id: 'send_contract',
  label: 'Send Contract',
  icon: '📄',
  domain: 'contracts',
  visibility: 'client-visible',
  availableOn: ['rail', 'circle', 'page'],
  requiresConfirm: true,
  confirmMessage: 'Send contract to client for signing?',
  async execute(entityId: string, _context: ActionContext): Promise<ActionResult> {
    try {
      const { sendContractToClient } = await import('@/lib/contracts/actions')
      await sendContractToClient(entityId)
      return {
        success: true,
        dismiss: true,
        circleNotification: { type: 'contract_ready', data: { contractId: entityId } },
      }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})

registerAction({
  id: 'void_contract',
  label: 'Void Contract',
  icon: '🚫',
  domain: 'contracts',
  visibility: 'chef-only',
  availableOn: ['page'],
  variant: 'destructive' as const,
  requiresConfirm: true,
  confirmMessage: 'Void this contract? This cannot be undone.',
  async execute(entityId: string, context: ActionContext): Promise<ActionResult> {
    try {
      const { voidContract } = await import('@/lib/contracts/actions')
      await voidContract(entityId, (context.reason as string) ?? undefined)
      return { success: true, dismiss: true }
    } catch (err) {
      return { success: false, message: (err as Error).message }
    }
  },
})
