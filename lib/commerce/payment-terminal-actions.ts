'use server'

import { requireChef } from '@/lib/auth/get-user'
import { requirePro } from '@/lib/billing/require-pro'
import { createServerClient } from '@/lib/db/server'
import { recordPayment } from './payment-actions'
import { getPaymentTerminalAdapter } from './terminal'
import { assertPosRoleAccess } from './pos-authorization'

export type ProcessTerminalPaymentInput = {
  saleId: string
  amountCents: number
  tipCents?: number
  idempotencyKey: string
}

export async function processTerminalCardPayment(input: ProcessTerminalPaymentInput) {
  const user = await requireChef()
  await requirePro('commerce')
  const db: any = createServerClient()

  await assertPosRoleAccess({
    db,
    user,
    action: 'process a terminal card payment',
    requiredLevel: 'cashier',
  })

  const { data: sale, error } = await (db
    .from('sales')
    .select('id, status')
    .eq('id', input.saleId)
    .eq('tenant_id', user.tenantId!)
    .single() as any)

  if (error || !sale) throw new Error('Sale not found')

  const adapter = getPaymentTerminalAdapter()
  const terminalHealth = await adapter.healthCheck()
  if (!terminalHealth.healthy) {
    return {
      ok: false,
      terminalResult: {
        provider: adapter.provider,
        paymentMethod: 'card' as const,
        status: 'failed' as const,
        errorCode: 'terminal_unhealthy',
        errorMessage: terminalHealth.message,
      },
      payment: null,
    }
  }

  const terminalResult = await adapter.beginCardPayment({
    saleId: input.saleId,
    amountCents: input.amountCents,
    tipCents: input.tipCents ?? 0,
    idempotencyKey: input.idempotencyKey,
    currency: 'usd',
  })

  if (terminalResult.status !== 'captured' && terminalResult.status !== 'authorized') {
    return {
      ok: false,
      terminalResult,
      payment: null,
    }
  }

  const payment = await recordPayment({
    saleId: input.saleId,
    amountCents: input.amountCents,
    tipCents: input.tipCents ?? 0,
    paymentMethod: 'card',
    idempotencyKey: input.idempotencyKey,
    status: terminalResult.status === 'captured' ? 'captured' : 'authorized',
    processorType: adapter.provider,
    processorReferenceId: terminalResult.providerReferenceId,
    notes: `[terminal:${adapter.provider}]`,
  })

  return {
    ok: true,
    terminalResult,
    payment,
  }
}
