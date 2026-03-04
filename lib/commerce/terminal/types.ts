export type TerminalProvider = 'mock' | 'stripe_terminal'

export type TerminalHealth = {
  provider: TerminalProvider
  healthy: boolean
  message: string
}

export type TerminalPaymentRequest = {
  saleId: string
  amountCents: number
  tipCents?: number
  currency?: string
  idempotencyKey: string
  metadata?: Record<string, unknown>
}

export type TerminalPaymentStatus = 'captured' | 'authorized' | 'failed' | 'cancelled'

export type TerminalPaymentResult = {
  provider: TerminalProvider
  status: TerminalPaymentStatus
  paymentMethod: 'card'
  providerReferenceId?: string
  errorCode?: string
  errorMessage?: string
  raw?: Record<string, unknown>
}

export interface PaymentTerminalAdapter {
  provider: TerminalProvider
  healthCheck(): Promise<TerminalHealth>
  beginCardPayment(input: TerminalPaymentRequest): Promise<TerminalPaymentResult>
}
