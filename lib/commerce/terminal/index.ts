import { MockPaymentTerminalAdapter } from './mock-adapter'
import { StripeTerminalAdapter } from './stripe-terminal-adapter'
import type { PaymentTerminalAdapter, TerminalProvider } from './types'

function parseBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function normalizeProviderName(value: string | null | undefined) {
  return (value ?? '').toString().trim().toLowerCase()
}

export function resolveTerminalProvider(
  provider?: string | null
): TerminalProvider {
  const normalized = normalizeProviderName(provider ?? process.env.POS_TERMINAL_PROVIDER ?? 'mock')

  if (normalized === 'stripe_terminal') return 'stripe_terminal'
  return 'mock'
}

export function getPaymentTerminalAdapter(
  provider?: string | null
): PaymentTerminalAdapter {
  const rawProvider = provider ?? process.env.POS_TERMINAL_PROVIDER ?? 'mock'
  const normalizedProvider = normalizeProviderName(rawProvider)
  const resolved = resolveTerminalProvider(rawProvider)

  const allowMockTerminal = parseBooleanEnv(
    process.env.POS_TERMINAL_ALLOW_MOCK,
    process.env.NODE_ENV !== 'production'
  )
  const strictProvider = parseBooleanEnv(
    process.env.POS_TERMINAL_STRICT_PROVIDER,
    process.env.NODE_ENV === 'production'
  )

  if (normalizedProvider && resolved === 'mock' && normalizedProvider !== 'mock') {
    if (strictProvider) {
      return new MockPaymentTerminalAdapter({
        healthy: false,
        blockPayments: true,
        blockErrorCode: 'invalid_terminal_provider',
        healthMessage: `Unknown terminal provider "${normalizedProvider}". Set POS_TERMINAL_PROVIDER to "mock" or "stripe_terminal".`,
      })
    }
    return new MockPaymentTerminalAdapter()
  }

  if (resolved === 'stripe_terminal') return new StripeTerminalAdapter()

  if (!allowMockTerminal) {
    return new MockPaymentTerminalAdapter({
      healthy: false,
      blockPayments: true,
      blockErrorCode: 'mock_terminal_disabled',
      healthMessage:
        'Mock terminal is disabled by policy. Configure a live terminal provider or set POS_TERMINAL_ALLOW_MOCK=true.',
    })
  }

  return new MockPaymentTerminalAdapter()
}

export type { PaymentTerminalAdapter, TerminalProvider } from './types'
export type { TerminalHealth, TerminalPaymentRequest, TerminalPaymentResult } from './types'
