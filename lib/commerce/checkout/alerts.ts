import { recordPosAlert } from '../observability-actions'
import type { PosAlertSeverity } from '../observability-core'

export async function emitCheckoutAlert(alert: {
  tenantId: string
  eventType: string
  severity: PosAlertSeverity
  message: string
  dedupeKey?: string
  context?: Record<string, unknown>
}) {
  try {
    await recordPosAlert({
      tenantId: alert.tenantId,
      source: 'checkout',
      eventType: alert.eventType,
      severity: alert.severity,
      message: alert.message,
      dedupeKey: alert.dedupeKey,
      context: alert.context ?? {},
    })
  } catch (error) {
    console.error('[non-blocking] Failed to emit checkout alert:', error)
  }
}

export async function markSaleAsCheckoutFailed(ctx: {
  db: any
  tenantId: string
  saleId: string
  userId: string
  reason: string
}) {
  try {
    await (ctx.db
      .from('sales' as any)
      .update({
        status: 'voided',
        void_reason: 'checkout_failed',
        voided_at: new Date().toISOString(),
        voided_by: ctx.userId,
        notes: `[checkout_failed] ${ctx.reason}`,
      } as any)
      .eq('id', ctx.saleId)
      .eq('tenant_id', ctx.tenantId) as any)
  } catch (err) {
    console.error('[checkout] failed to mark sale as checkout_failed:', err)
  }
}
