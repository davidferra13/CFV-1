import * as crypto from 'crypto'

const ONBOARDING_TOKEN_EXPIRY_DAYS = 7

export function generateOnboardingToken(clientId: string, tenantId: string): string {
  const payload = {
    cid: clientId,
    tid: tenantId,
    type: 'onboarding',
    exp: Date.now() + ONBOARDING_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64url')
  const secret =
    process.env.ONBOARDING_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-onboarding-secret'
  const hmac = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${hmac}`
}

export function verifyOnboardingToken(
  token: string
): { clientId: string; tenantId: string } | null {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null

    const secret =
      process.env.ONBOARDING_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-onboarding-secret'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url')

    if (signature !== expectedSignature) return null

    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const payload = JSON.parse(json)

    if (payload.type !== 'onboarding') return null
    if (payload.exp < Date.now()) return null

    return { clientId: payload.cid, tenantId: payload.tid }
  } catch {
    return null
  }
}
