import test from 'node:test'
import assert from 'node:assert/strict'
import { NextRequest } from 'next/server'
import { HEAD, GET } from '../../app/api/health/readiness/route'

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const

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
    }
  })()
}

test('GET /api/health/readiness?strict=1 returns degraded when required env is missing', async () => {
  await withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      const response = await GET(new NextRequest('http://localhost/api/health/readiness?strict=1'))
      const body = await response.json()

      assert.equal(response.status, 503)
      assert.equal(body.status, 'degraded')
      assert.equal(body.checks.env, 'missing')
      assert.equal(body.checks.backgroundJobs, 'degraded')
      assert.equal(response.headers.get('x-health-scope'), 'readiness')
    }
  )
})

test('HEAD /api/health/readiness mirrors strict degraded status and readiness headers', async () => {
  await withEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    },
    async () => {
      const response = await HEAD(new NextRequest('http://localhost/api/health/readiness?strict=1'))

      assert.equal(response.status, 503)
      assert.ok(response.headers.get('x-request-id'))
      assert.equal(response.headers.get('x-health-status'), 'degraded')
      assert.equal(response.headers.get('x-health-scope'), 'readiness')
    }
  )
})
