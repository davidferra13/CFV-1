import { appendPosAuditLog } from '../pos-audit-log'
import { emitCheckoutAlert, markSaleAsCheckoutFailed } from './alerts'

export async function preflightCheckoutTaxService(ctx: {
  tenantId: string
  hasTaxableCheckoutItems: boolean
  taxZipCode?: string
  registerSessionId?: string
}) {
  if (!ctx.hasTaxableCheckoutItems) return

  if (!ctx.taxZipCode?.trim()) {
    throw new Error('Tax ZIP code is required for taxable items before checkout')
  }

  try {
    const { calculateSalesTax } = await import('@/lib/tax/api-ninjas')
    const probe = await calculateSalesTax(100, ctx.taxZipCode)
    if (!probe) {
      throw new Error('tax_service_unavailable')
    }
  } catch {
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'tax_service_preflight_failed',
      severity: 'error',
      message: 'Tax service unavailable during checkout preflight',
      dedupeKey: 'checkout_tax_service_preflight_failed',
      context: {
        register_session_id: ctx.registerSessionId ?? null,
        tax_zip_code: ctx.taxZipCode,
      },
    })
    throw new Error('Tax service unavailable. Unable to calculate sales tax right now')
  }
}

export async function resolveZipTaxRate(ctx: { db: any; tenantId: string; taxZipCode?: string }) {
  let zipTaxRate = 0
  if (ctx.taxZipCode?.trim()) {
    try {
      const { calculateSalesTax: calcTax } = await import('@/lib/tax/api-ninjas')
      const probe = await calcTax(10000, ctx.taxZipCode)
      if (probe) zipTaxRate = probe.taxRate
    } catch {
      const { getTenantTaxRateBps } = await import('../tax-policy')
      const bps = await getTenantTaxRateBps(ctx.db, ctx.tenantId)
      zipTaxRate = bps / 10000
    }
  }
  return zipTaxRate
}

export async function applyBlockingCheckoutTax(ctx: {
  db: any
  tenantId: string
  userId: string
  saleId: string
  discountedSubtotalCents: number
  totalCents: number
  hasTaxableCheckoutItems: boolean
  inputNotes?: string
  registerSessionId?: string
  paymentIdempotencyKey: string
}) {
  let finalTotalCents = ctx.totalCents
  if (!ctx.hasTaxableCheckoutItems) return finalTotalCents

  try {
    const { applySaleTax } = await import('../tax-actions')
    const taxResult = await applySaleTax(ctx.saleId)
    if (!taxResult) {
      throw new Error('tax_service_unavailable')
    }
    finalTotalCents = ctx.discountedSubtotalCents + taxResult.totalTaxCents
  } catch {
    await (ctx.db
      .from('sales')
      .update({
        status: 'voided',
        notes:
          (ctx.inputNotes ? `${ctx.inputNotes}\n` : '') +
          'auto-voided: tax calculation failed during checkout',
      } as any)
      .eq('id', ctx.saleId)
      .eq('tenant_id', ctx.tenantId) as any)

    await appendPosAuditLog({
      tenantId: ctx.tenantId,
      action: 'sale_auto_voided_tax_failure',
      tableName: 'sales',
      recordId: ctx.saleId,
      changedBy: ctx.userId,
      summary: 'Sale auto-voided because tax calculation failed',
      afterValues: {
        status: 'voided',
        reason: 'tax_calculation_failed',
      },
    })

    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'tax_calculation_failed',
      severity: 'critical',
      message: 'Sale was auto-voided because tax calculation failed during checkout',
      dedupeKey: 'checkout_tax_calculation_failed',
      context: {
        sale_id: ctx.saleId,
        register_session_id: ctx.registerSessionId ?? null,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })

    throw new Error('Tax service unavailable. Unable to calculate sales tax right now')
  }

  return finalTotalCents
}

export async function assertRegisterStillOpen(ctx: {
  db: any
  tenantId: string
  userId: string
  saleId: string
  registerSessionId?: string
  paymentIdempotencyKey: string
  isOpen: (input: { db: any; tenantId: string; registerSessionId: string }) => Promise<boolean>
}) {
  if (!ctx.registerSessionId) return

  const registerStillOpen = await ctx.isOpen({
    db: ctx.db,
    tenantId: ctx.tenantId,
    registerSessionId: ctx.registerSessionId,
  })
  if (!registerStillOpen) {
    await markSaleAsCheckoutFailed({
      db: ctx.db,
      tenantId: ctx.tenantId,
      saleId: ctx.saleId,
      userId: ctx.userId,
      reason: 'register_closed_mid_checkout',
    })
    await emitCheckoutAlert({
      tenantId: ctx.tenantId,
      eventType: 'register_closed_mid_checkout',
      severity: 'error',
      message: 'Register was closed while checkout was still in progress',
      dedupeKey: `checkout_register_closed_mid_checkout_${ctx.registerSessionId}`,
      context: {
        sale_id: ctx.saleId,
        register_session_id: ctx.registerSessionId,
        idempotency_key: ctx.paymentIdempotencyKey,
      },
    })
    throw new Error('Register session is no longer open. Refresh and reopen the register.')
  }
}
