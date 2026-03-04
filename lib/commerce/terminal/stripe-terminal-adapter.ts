import { breakers } from '@/lib/resilience/circuit-breaker'
import type {
  PaymentTerminalAdapter,
  TerminalHealth,
  TerminalPaymentRequest,
  TerminalPaymentResult,
} from './types'
import type Stripe from 'stripe'

function getStripe(): Stripe {
  const StripeLib = require('stripe')
  const StripeCtor = StripeLib.default || StripeLib
  return new StripeCtor(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-12-18.acacia' as Stripe.LatestApiVersion,
  })
}

function readBooleanEnv(value: string | undefined, fallback: boolean) {
  if (value == null) return fallback
  const normalized = value.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false
  return fallback
}

function getStripeTerminalReaderId() {
  const readerId = process.env.STRIPE_TERMINAL_READER_ID?.trim()
  return readerId || null
}

function sanitizeCurrency(value: string | undefined) {
  const normalized = (value ?? 'usd').trim().toLowerCase()
  return normalized || 'usd'
}

function toStripeMetadata(input?: Record<string, unknown>) {
  const metadata: Record<string, string> = {}
  if (!input) return metadata

  for (const [key, value] of Object.entries(input)) {
    if (!key.trim()) continue
    if (value == null) continue
    if (typeof value === 'string') metadata[key] = value
    else if (typeof value === 'number' || typeof value === 'boolean') metadata[key] = String(value)
    else metadata[key] = JSON.stringify(value)
  }
  return metadata
}

function extractStripeErrorCode(error: unknown) {
  const stripeCode = (error as { code?: string } | null)?.code
  if (typeof stripeCode === 'string' && stripeCode.trim()) return stripeCode
  return 'stripe_error'
}

function extractStripeErrorMessage(error: unknown, fallback: string) {
  const message = (error as { message?: string } | null)?.message
  if (typeof message === 'string' && message.trim()) return message
  return fallback
}

function extractChargeId(paymentIntent: Stripe.PaymentIntent): string | undefined {
  const latestCharge = paymentIntent.latest_charge
  if (!latestCharge) return undefined
  if (typeof latestCharge === 'string') return latestCharge
  return latestCharge.id
}

export class StripeTerminalAdapter implements PaymentTerminalAdapter {
  provider = 'stripe_terminal' as const

  async healthCheck(): Promise<TerminalHealth> {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      return {
        provider: this.provider,
        healthy: false,
        message: 'Missing STRIPE_SECRET_KEY',
      }
    }

    const readerId = getStripeTerminalReaderId()
    if (!readerId) {
      return {
        provider: this.provider,
        healthy: false,
        message: 'Missing STRIPE_TERMINAL_READER_ID',
      }
    }

    const remoteCheck = readBooleanEnv(process.env.POS_TERMINAL_STRIPE_HEALTHCHECK_REMOTE, false)
    if (!remoteCheck) {
      return {
        provider: this.provider,
        healthy: true,
        message: `Stripe terminal configured for reader ${readerId}`,
      }
    }

    try {
      const stripe = getStripe()
      const reader = await breakers.stripe.execute(() => stripe.terminal.readers.retrieve(readerId))
      const readerLabel = 'id' in reader ? String(reader.id) : readerId
      if ('deleted' in reader && reader.deleted) {
        return {
          provider: this.provider,
          healthy: false,
          message: `Stripe reader ${readerLabel} is deleted`,
        }
      }
      const status =
        'status' in reader ? String(reader.status ?? 'unknown').toLowerCase() : 'unknown'
      if (status !== 'online') {
        return {
          provider: this.provider,
          healthy: false,
          message: `Stripe reader ${readerLabel} is ${status}`,
        }
      }
      return {
        provider: this.provider,
        healthy: true,
        message: `Stripe reader ${readerLabel} is online`,
      }
    } catch (error) {
      return {
        provider: this.provider,
        healthy: false,
        message: extractStripeErrorMessage(error, 'Stripe terminal health check failed'),
      }
    }
  }

  private async finalizePaymentIntent(
    stripe: Stripe,
    paymentIntentId: string,
    readerId: string
  ): Promise<TerminalPaymentResult> {
    try {
      let paymentIntent = await breakers.stripe.execute(() =>
        stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] })
      )

      if (paymentIntent.status === 'requires_capture') {
        paymentIntent = await breakers.stripe.execute(() =>
          stripe.paymentIntents.capture(paymentIntent.id, { expand: ['latest_charge'] })
        )
      }

      if (paymentIntent.status === 'succeeded') {
        return {
          provider: this.provider,
          paymentMethod: 'card',
          status: 'captured',
          providerReferenceId: paymentIntent.id,
          raw: {
            payment_intent_id: paymentIntent.id,
            payment_intent_status: paymentIntent.status,
            latest_charge_id: extractChargeId(paymentIntent) ?? null,
            reader_id: readerId,
          },
        }
      }

      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        providerReferenceId: paymentIntent.id,
        errorCode: `payment_intent_${paymentIntent.status}`,
        errorMessage: `Stripe payment intent is ${paymentIntent.status}`,
        raw: {
          payment_intent_id: paymentIntent.id,
          payment_intent_status: paymentIntent.status,
          reader_id: readerId,
        },
      }
    } catch (error) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: extractStripeErrorCode(error),
        errorMessage: extractStripeErrorMessage(error, 'Stripe payment finalization failed'),
      }
    }
  }

  async beginCardPayment(input: TerminalPaymentRequest): Promise<TerminalPaymentResult> {
    if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: 'invalid_amount',
        errorMessage: 'Amount must be a positive integer (cents)',
      }
    }

    const tipCents = input.tipCents ?? 0
    if (!Number.isInteger(tipCents) || tipCents < 0) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: 'invalid_tip',
        errorMessage: 'Tip must be a non-negative integer (cents)',
      }
    }

    const readerId = getStripeTerminalReaderId()
    if (!readerId) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: 'missing_terminal_reader',
        errorMessage: 'Missing STRIPE_TERMINAL_READER_ID',
      }
    }

    if (!process.env.STRIPE_SECRET_KEY) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: 'missing_stripe_secret_key',
        errorMessage: 'Missing STRIPE_SECRET_KEY',
      }
    }

    const currency = sanitizeCurrency(input.currency)
    const totalAmountCents = input.amountCents + tipCents
    const metadata = toStripeMetadata({
      ...(input.metadata ?? {}),
      sale_id: input.saleId,
      base_amount_cents: input.amountCents,
      tip_cents: tipCents,
      total_amount_cents: totalAmountCents,
      payment_channel: 'pos_terminal',
    })

    try {
      const stripe = getStripe()
      const createdIntent = await breakers.stripe.execute(() =>
        stripe.paymentIntents.create(
          {
            amount: totalAmountCents,
            currency,
            capture_method: 'automatic',
            payment_method_types: ['card_present'],
            metadata,
          },
          {
            idempotencyKey: input.idempotencyKey,
          }
        )
      )

      await breakers.stripe.execute(() =>
        stripe.terminal.readers.processPaymentIntent(readerId, {
          payment_intent: createdIntent.id,
        })
      )

      return this.finalizePaymentIntent(stripe, createdIntent.id, readerId)
    } catch (error) {
      return {
        provider: this.provider,
        paymentMethod: 'card',
        status: 'failed',
        errorCode: extractStripeErrorCode(error),
        errorMessage: extractStripeErrorMessage(error, 'Stripe terminal payment failed'),
      }
    }
  }
}
