'use server'

import { createAdminClient } from '@/lib/db/admin'

export type CallAuditInput = {
  tenantId: string
  callType: 'supplier_call' | 'ai_call'
  callId: string
  previousStatus: string | null
  newStatus: string
  contactPhone?: string | null
  contactName?: string | null
  direction?: 'inbound' | 'outbound'
  durationSeconds?: number | null
}

/**
 * Log a call lifecycle event to communication_action_log.
 * Fire-and-forget: never throws, always logs errors internally.
 */
export async function bridgeCallToAuditLog(input: CallAuditInput): Promise<void> {
  try {
    const db: any = createAdminClient()
    await db.from('communication_action_log' as any).insert({
      tenant_id: input.tenantId,
      action: `call_${input.newStatus}`,
      source: 'webhook',
      previous_state: {
        status: input.previousStatus,
        callType: input.callType,
        callId: input.callId,
      },
      new_state: {
        status: input.newStatus,
        callType: input.callType,
        callId: input.callId,
        contactPhone: input.contactPhone ?? null,
        contactName: input.contactName ?? null,
        direction: input.direction ?? null,
        durationSeconds: input.durationSeconds ?? null,
      },
    })
  } catch (err) {
    console.error('[call-audit-bridge] Failed to log call event:', err)
  }
}
