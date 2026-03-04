export const CHECKOUT_IDEMPOTENCY_KEY_MAX = 96

export function buildCheckoutPaymentIdempotencyKey(tenantId: string, requestKey?: string): string {
  const fallback =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2)}`

  const raw = (requestKey ?? fallback).trim()
  const safe = raw.replace(/[^a-zA-Z0-9:_-]/g, '').slice(0, CHECKOUT_IDEMPOTENCY_KEY_MAX)
  const normalized = safe || fallback.replace(/[^a-zA-Z0-9:_-]/g, '')
  return `checkout_${tenantId}_${normalized}`
}
