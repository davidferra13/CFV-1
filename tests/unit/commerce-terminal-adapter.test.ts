import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getPaymentTerminalAdapter, resolveTerminalProvider } from '@/lib/commerce/terminal'

describe('commerce terminal adapter', () => {
  it('resolves supported providers', () => {
    assert.equal(resolveTerminalProvider('mock'), 'mock')
    assert.equal(resolveTerminalProvider('stripe_terminal'), 'stripe_terminal')
    assert.equal(resolveTerminalProvider('unknown_provider'), 'mock')
  })

  it('blocks unknown providers when strict mode is enabled', async () => {
    const previousStrict = process.env.POS_TERMINAL_STRICT_PROVIDER

    try {
      process.env.POS_TERMINAL_STRICT_PROVIDER = 'true'
      const adapter = getPaymentTerminalAdapter('unknown_provider')
      const health = await adapter.healthCheck()
      const result = await adapter.beginCardPayment({
        saleId: 'sale_strict_1',
        amountCents: 1200,
        idempotencyKey: 'idem_strict_1',
      })

      assert.equal(health.healthy, false)
      assert.match(health.message, /Unknown terminal provider/i)
      assert.equal(result.status, 'failed')
      assert.equal(result.errorCode, 'invalid_terminal_provider')
    } finally {
      if (previousStrict == null) delete process.env.POS_TERMINAL_STRICT_PROVIDER
      else process.env.POS_TERMINAL_STRICT_PROVIDER = previousStrict
    }
  })

  it('blocks mock provider when policy disallows it', async () => {
    const previousAllowMock = process.env.POS_TERMINAL_ALLOW_MOCK

    try {
      process.env.POS_TERMINAL_ALLOW_MOCK = 'false'
      const adapter = getPaymentTerminalAdapter('mock')
      const health = await adapter.healthCheck()
      const result = await adapter.beginCardPayment({
        saleId: 'sale_mock_policy_1',
        amountCents: 1200,
        idempotencyKey: 'idem_mock_policy_1',
      })

      assert.equal(health.healthy, false)
      assert.match(health.message, /Mock terminal is disabled by policy/i)
      assert.equal(result.status, 'failed')
      assert.equal(result.errorCode, 'mock_terminal_disabled')
    } finally {
      if (previousAllowMock == null) delete process.env.POS_TERMINAL_ALLOW_MOCK
      else process.env.POS_TERMINAL_ALLOW_MOCK = previousAllowMock
    }
  })

  it('reports stripe terminal as unhealthy when reader id is missing', async () => {
    const previousKey = process.env.STRIPE_SECRET_KEY
    const previousReader = process.env.STRIPE_TERMINAL_READER_ID

    try {
      process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
      delete process.env.STRIPE_TERMINAL_READER_ID
      const adapter = getPaymentTerminalAdapter('stripe_terminal')
      const health = await adapter.healthCheck()

      assert.equal(health.healthy, false)
      assert.match(health.message, /STRIPE_TERMINAL_READER_ID/i)
    } finally {
      if (previousKey == null) delete process.env.STRIPE_SECRET_KEY
      else process.env.STRIPE_SECRET_KEY = previousKey
      if (previousReader == null) delete process.env.STRIPE_TERMINAL_READER_ID
      else process.env.STRIPE_TERMINAL_READER_ID = previousReader
    }
  })

  it('reports stripe terminal as healthy when required config is present', async () => {
    const previousKey = process.env.STRIPE_SECRET_KEY
    const previousReader = process.env.STRIPE_TERMINAL_READER_ID
    const previousRemote = process.env.POS_TERMINAL_STRIPE_HEALTHCHECK_REMOTE

    try {
      process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
      process.env.STRIPE_TERMINAL_READER_ID = 'tmr_test_reader'
      process.env.POS_TERMINAL_STRIPE_HEALTHCHECK_REMOTE = 'false'

      const adapter = getPaymentTerminalAdapter('stripe_terminal')
      const health = await adapter.healthCheck()

      assert.equal(health.healthy, true)
      assert.match(health.message, /configured/i)
    } finally {
      if (previousKey == null) delete process.env.STRIPE_SECRET_KEY
      else process.env.STRIPE_SECRET_KEY = previousKey
      if (previousReader == null) delete process.env.STRIPE_TERMINAL_READER_ID
      else process.env.STRIPE_TERMINAL_READER_ID = previousReader
      if (previousRemote == null) delete process.env.POS_TERMINAL_STRIPE_HEALTHCHECK_REMOTE
      else process.env.POS_TERMINAL_STRIPE_HEALTHCHECK_REMOTE = previousRemote
    }
  })

  it('stripe adapter fails card payment early when reader id is missing', async () => {
    const previousKey = process.env.STRIPE_SECRET_KEY
    const previousReader = process.env.STRIPE_TERMINAL_READER_ID

    try {
      process.env.STRIPE_SECRET_KEY = 'sk_test_placeholder'
      delete process.env.STRIPE_TERMINAL_READER_ID

      const adapter = getPaymentTerminalAdapter('stripe_terminal')
      const result = await adapter.beginCardPayment({
        saleId: 'sale_stripe_1',
        amountCents: 1200,
        idempotencyKey: 'idem_stripe_1',
      })

      assert.equal(result.status, 'failed')
      assert.equal(result.errorCode, 'missing_terminal_reader')
    } finally {
      if (previousKey == null) delete process.env.STRIPE_SECRET_KEY
      else process.env.STRIPE_SECRET_KEY = previousKey
      if (previousReader == null) delete process.env.STRIPE_TERMINAL_READER_ID
      else process.env.STRIPE_TERMINAL_READER_ID = previousReader
    }
  })

  it('mock adapter captures valid card payment', async () => {
    const adapter = getPaymentTerminalAdapter('mock')
    const result = await adapter.beginCardPayment({
      saleId: 'sale_1',
      amountCents: 1200,
      tipCents: 200,
      idempotencyKey: 'idem_123',
    })

    assert.equal(result.status, 'captured')
    assert.equal(result.paymentMethod, 'card')
    assert.match(result.providerReferenceId ?? '', /^mock_terminal_/)
  })

  it('mock adapter rejects invalid amounts', async () => {
    const adapter = getPaymentTerminalAdapter('mock')
    const result = await adapter.beginCardPayment({
      saleId: 'sale_1',
      amountCents: 0,
      idempotencyKey: 'idem_123',
    })

    assert.equal(result.status, 'failed')
    assert.equal(result.errorCode, 'invalid_amount')
  })
})
