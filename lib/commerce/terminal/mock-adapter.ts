import type {
  PaymentTerminalAdapter,
  TerminalHealth,
  TerminalPaymentRequest,
  TerminalPaymentResult,
} from './types'

export type MockTerminalAdapterOptions = {
  healthy?: boolean
  healthMessage?: string
  blockPayments?: boolean
  blockErrorCode?: string
}

export class MockPaymentTerminalAdapter implements PaymentTerminalAdapter {
  provider = 'mock' as const
  private readonly options: MockTerminalAdapterOptions

  constructor(options: MockTerminalAdapterOptions = {}) {
    this.options = options
  }

  async healthCheck(): Promise<TerminalHealth> {
    return {
      provider: this.provider,
      healthy: this.options.healthy ?? true,
      message: this.options.healthMessage ?? 'Mock terminal ready',
    }
  }

  async beginCardPayment(input: TerminalPaymentRequest): Promise<TerminalPaymentResult> {
    if (this.options.blockPayments) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: this.options.blockErrorCode ?? 'terminal_unavailable',
        errorMessage:
          this.options.healthMessage ??
          'Card terminal is unavailable because the adapter is blocked by policy',
      }
    }

    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: 'invalid_amount',
        errorMessage: 'Amount must be a positive integer (cents)',
      }
    }

    return {
      provider: this.provider,
      paymentMethod: 'card',
      status: 'captured',
      providerReferenceId: `mock_terminal_${input.idempotencyKey}`,
      raw: {
        mode: 'mock',
        saleId: input.saleId,
      },
    }
  }
}
