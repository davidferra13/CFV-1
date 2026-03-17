import * as crypto from 'crypto'

const SURVEY_TOKEN_EXPIRY_DAYS = 30

export function generateSurveyToken(surveyId: string, clientId: string, tenantId: string): string {
  const payload = {
    sid: surveyId,
    cid: clientId,
    tid: tenantId,
    type: 'survey',
    exp: Date.now() + SURVEY_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
  }
  const json = JSON.stringify(payload)
  const encoded = Buffer.from(json).toString('base64url')
  const secret =
    process.env.SURVEY_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-survey-secret'
  const hmac = crypto.createHmac('sha256', secret).update(encoded).digest('base64url')
  return `${encoded}.${hmac}`
}

export function verifySurveyToken(
  token: string
): { surveyId: string; clientId: string; tenantId: string } | null {
  try {
    const [encoded, signature] = token.split('.')
    if (!encoded || !signature) return null

    const secret =
      process.env.SURVEY_TOKEN_SECRET || process.env.JWT_SECRET || 'chefflow-survey-secret'
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(encoded)
      .digest('base64url')

    if (signature !== expectedSignature) return null

    const json = Buffer.from(encoded, 'base64url').toString('utf-8')
    const payload = JSON.parse(json)

    if (payload.type !== 'survey') return null
    if (payload.exp < Date.now()) return null

    return { surveyId: payload.sid, clientId: payload.cid, tenantId: payload.tid }
  } catch {
    return null
  }
}
