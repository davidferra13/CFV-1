import test from 'node:test'
import assert from 'node:assert/strict'
import { validateWebhookUrl } from '../../lib/security/url-validation.js'

test('validateWebhookUrl accepts a normal HTTPS URL', () => {
  assert.doesNotThrow(() => validateWebhookUrl('https://hooks.zapier.com/hooks/catch/123/abc'))
})

test('validateWebhookUrl rejects non-HTTPS URLs', () => {
  assert.throws(() => validateWebhookUrl('http://hooks.zapier.com/hooks/catch/123/abc'), {
    message: /https/i,
  })
})

test('validateWebhookUrl rejects localhost and metadata-style targets', () => {
  assert.throws(() => validateWebhookUrl('https://localhost/webhook'), {
    message: /internal addresses/i,
  })
  assert.throws(() => validateWebhookUrl('https://metadata.google.internal/computeMetadata/v1'), {
    message: /internal addresses/i,
  })
})

test('validateWebhookUrl rejects private IP ranges and credentialed URLs', () => {
  assert.throws(() => validateWebhookUrl('https://10.0.0.1/webhook'), {
    message: /private ip/i,
  })
  assert.throws(() => validateWebhookUrl('https://user:pass@example.com/webhook'), {
    message: /must not contain credentials/i,
  })
})
