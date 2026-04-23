import test from 'node:test'
import assert from 'node:assert/strict'

import { classifyResendError, createResendEmailProvider } from '../../lib/email/provider/resend-adapter'

test('resend adapter maps outbound request fields and returns provider identity', async () => {
  let capturedPayload: Record<string, unknown> | null = null

  const provider = createResendEmailProvider(
    () =>
      ({
        emails: {
          send: async (payload: Record<string, unknown>) => {
            capturedPayload = payload
            return { data: { id: 're_123' }, error: null }
          },
        },
      }) as any
  )

  const result = await provider.send({
    kind: 'marketing',
    from: 'ChefFlow <info@example.com>',
    to: 'client@example.com',
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
    subject: 'Spring Menu',
    html: '<p>Hello</p>',
    replyTo: 'reply@example.com',
  })

  assert.deepEqual(capturedPayload, {
    from: 'ChefFlow <info@example.com>',
    to: 'client@example.com',
    subject: 'Spring Menu',
    replyTo: 'reply@example.com',
    cc: ['cc@example.com'],
    bcc: ['bcc@example.com'],
    html: '<p>Hello</p>',
  })
  assert.equal(result.provider, 'resend')
  assert.equal(result.kind, 'marketing')
  assert.equal(result.message.providerMessageId, 're_123')
  assert.equal(result.message.legacyResendMessageId, 're_123')
})

test('resend adapter preserves successful sends even when resend omits a message id', async () => {
  const provider = createResendEmailProvider(
    () =>
      ({
        emails: {
          send: async () => ({ data: {}, error: null }),
        },
      }) as any
  )

  const result = await provider.send({
    kind: 'transactional',
    from: 'ChefFlow <info@example.com>',
    to: 'client@example.com',
    subject: 'Account update',
    html: '<p>Updated</p>',
  })

  assert.equal(result.provider, 'resend')
  assert.equal(result.message.providerMessageId, null)
  assert.equal(result.message.legacyResendMessageId, null)
})

test('resend adapter classifies transient and hard-bounce failures', () => {
  const transient = classifyResendError({ statusCode: 502, message: 'Upstream failure' })
  assert.equal(transient.retry, 'retryable')
  assert.equal(transient.suppression, 'none')
  assert.equal(transient.category, 'transient')

  const hardBounce = classifyResendError({ message: 'Recipient address is invalid' })
  assert.equal(hardBounce.retry, 'permanent')
  assert.equal(hardBounce.suppression, 'invalid')
  assert.equal(hardBounce.category, 'hard_bounce')
})
