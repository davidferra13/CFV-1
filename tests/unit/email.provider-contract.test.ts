import test from 'node:test'
import assert from 'node:assert/strict'

import {
  EMAIL_TRANSPORT_PROVIDER_ENV,
  getConfiguredEmailProviderName,
  getEmailProvider,
} from '../../lib/email/provider'

function withProviderEnv(value: string | undefined, fn: () => void) {
  const previous = process.env[EMAIL_TRANSPORT_PROVIDER_ENV]

  if (value === undefined) {
    delete process.env[EMAIL_TRANSPORT_PROVIDER_ENV]
  } else {
    process.env[EMAIL_TRANSPORT_PROVIDER_ENV] = value
  }

  try {
    fn()
  } finally {
    if (previous === undefined) {
      delete process.env[EMAIL_TRANSPORT_PROVIDER_ENV]
    } else {
      process.env[EMAIL_TRANSPORT_PROVIDER_ENV] = previous
    }
  }
}

test('email provider defaults to resend when no provider flag is set', () => {
  withProviderEnv(undefined, () => {
    assert.equal(getConfiguredEmailProviderName(), 'resend')
    assert.equal(getEmailProvider().name, 'resend')
  })
})

test('email provider falls back to resend for unsupported provider values', () => {
  withProviderEnv('internal-platform', () => {
    assert.equal(getConfiguredEmailProviderName(), 'resend')
    assert.equal(getEmailProvider().name, 'resend')
  })
})
