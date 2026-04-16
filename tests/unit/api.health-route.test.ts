import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { breakers } from '../../lib/resilience/circuit-breaker'
import { GET, HEAD } from '../../app/api/health/route'

const REQUIRED_ENV_KEYS = ['DATABASE_URL'] as const

function withEnv(
  values: Partial<Record<(typeof REQUIRED_ENV_KEYS)[number], string>>,
  fn: () => Promise<void>
) {
  return (async () => {
    const original = new Map<string, string | undefined>()
    for (const key of REQUIRED_ENV_KEYS) {
      original.set(key, process.env[key])
      const nextValue = values[key]
      if (nextValue === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = nextValue
      }
    }

    try {
      await fn()
    } finally {
      for (const [key, value] of original.entries()) {
        if (value === undefined) {
          delete process.env[key]
        } else {
          process.env[key] = value
        }
      }
      breakers.stripe.reset()
    }
  })()
}

test('GET /api/health returns checks and request id when required env is present', async () => {
  await withEnv(
    {
      DATABASE_URL: 'postgresql://user:pass@example.com:5432/postgres',
    },
    async () => {
      const response = await GET(new NextRequest('http://localhost/api/health'))
      const body = await response.json()

      assert.equal(response.status, 200)
      assert.equal(body.status, 'ok')
      assert.equal(body.checks.env, 'ok')
      assert.equal(body.checks.circuitBreakers, 'ok')
      assert.equal(body.details.missingEnvCount, 0)
      assert.equal(body.requestId, response.headers.get('x-request-id'))
      assert.equal(response.headers.get('x-health-status'), 'ok')
      assert.equal(response.headers.get('x-health-scope'), 'health')
    }
  )
})

test('GET /api/health?strict=1 returns 503 when required env is missing', async () => {
  await withEnv(
    {
      DATABASE_URL: undefined,
    },
    async () => {
      const response = await GET(new NextRequest('http://localhost/api/health?strict=1'))
      const body = await response.json()

      assert.equal(response.status, 503)
      assert.equal(body.status, 'degraded')
      assert.equal(body.checks.env, 'missing')
      assert.equal(body.details.missingEnvCount, REQUIRED_ENV_KEYS.length)
    }
  )
})

test('HEAD /api/health mirrors strict degraded status and headers', async () => {
  await withEnv(
    {
      DATABASE_URL: undefined,
    },
    async () => {
      const response = await HEAD(new NextRequest('http://localhost/api/health?strict=1'))

      assert.equal(response.status, 503)
      assert.ok(response.headers.get('x-request-id'))
      assert.equal(response.headers.get('x-health-status'), 'degraded')
      assert.equal(response.headers.get('x-health-scope'), 'health')
    }
  )
})
