import { createHmac, timingSafeEqual } from 'crypto'

export function validateTwilioSignature(input: {
  authToken: string
  url: string
  params: Record<string, string>
  signature: string
}): boolean {
  const sortedKeys = Object.keys(input.params).sort()
  let data = input.url
  for (const key of sortedKeys) {
    data += key + input.params[key]
  }

  const expectedSignature = createHmac('sha1', input.authToken).update(data).digest('base64')
  if (expectedSignature.length !== input.signature.length) return false

  return timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(input.signature))
}
