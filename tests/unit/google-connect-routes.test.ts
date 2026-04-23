import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import test from 'node:test'
import { NextRequest } from 'next/server'

const require = createRequire(import.meta.url)

function withEnv(values: Record<string, string | undefined>, fn: () => Promise<void>) {
  return (async () => {
    const original = new Map<string, string | undefined>()

    for (const [key, value] of Object.entries(values)) {
      original.set(key, process.env[key])
      if (value === undefined) {
        delete process.env[key]
      } else {
        process.env[key] = value
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

test('google connect route uses forwarded public host for the callback origin', async () => {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const routePath = require.resolve('../../app/api/auth/google/connect/route.ts')

  const originalAuth = require.cache[authPath]

  require.cache[authPath] = {
    exports: {
      requireChef: async () => ({ entityId: 'chef-1' }),
    },
  } as NodeJS.Module

  delete require.cache[routePath]

  try {
    await withEnv(
      {
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'client-123',
        NEXT_PUBLIC_SITE_URL: 'https://app.cheflowhq.com',
        NEXT_PUBLIC_APP_URL: 'https://app.cheflowhq.com',
      },
      async () => {
        const { GET } = require(routePath)

        const response = await GET(
          new NextRequest(
            'http://0.0.0.0:3000/api/auth/google/connect?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fgmail.readonly&returnTo=%2Fsettings%2Fintegrations',
            {
              headers: {
                'x-forwarded-proto': 'https',
                'x-forwarded-host': 'app.cheflowhq.com',
                host: '0.0.0.0:3000',
              },
            }
          )
        )

        assert.equal(response.status, 307)

        const location = response.headers.get('location')
        assert.ok(location)
        assert.match(
          location!,
          /redirect_uri=https%3A%2F%2Fapp\.cheflowhq\.com%2Fapi%2Fauth%2Fgoogle%2Fconnect%2Fcallback/
        )
        assert.doesNotMatch(location!, /0\.0\.0\.0|localhost/)
        assert.equal(response.cookies.get('google-oauth-csrf')?.value.length, 64)
      }
    )
  } finally {
    if (originalAuth) {
      require.cache[authPath] = originalAuth
    } else {
      delete require.cache[authPath]
    }
    delete require.cache[routePath]
  }
})

test('google connect callback stores merged Gmail state and redirects back to the caller', async () => {
  const authPath = require.resolve('../../lib/auth/get-user.ts')
  const serverPath = require.resolve('../../lib/db/server.ts')
  const headersPath = require.resolve('next/headers')
  const routePath = require.resolve('../../app/api/auth/google/connect/callback/route.ts')

  const originalAuth = require.cache[authPath]
  const originalServer = require.cache[serverPath]
  const originalHeaders = require.cache[headersPath]
  const originalFetch = global.fetch

  const fetchCalls: Array<{ url: string; init?: RequestInit }> = []
  let selectedChefId: string | null = null
  let upsertPayload: Record<string, unknown> | null = null
  let upsertOptions: Record<string, unknown> | null = null
  let mailboxUpsertPayload: Record<string, unknown> | null = null

  require.cache[authPath] = {
    exports: {
      getCurrentUser: async () => ({
        role: 'chef',
        entityId: 'chef-1',
        tenantId: 'tenant-1',
      }),
    },
  } as NodeJS.Module

  require.cache[serverPath] = {
    exports: {
      createServerClient: () => ({
        from(table: string) {
          if (table === 'google_connections') {
            return {
              select(_columns: string) {
                return {
                  eq(column: string, value: string) {
                    assert.equal(column, 'chef_id')
                    selectedChefId = value
                    return {
                      maybeSingle: async () => ({
                        data: {
                          gmail_connected: false,
                          calendar_connected: true,
                          scopes: ['https://www.googleapis.com/auth/calendar.events'],
                          refresh_token: 'existing-refresh-token',
                          connected_email: 'chef@example.com',
                        },
                      }),
                    }
                  },
                }
              },
              upsert(payload: Record<string, unknown>, options: Record<string, unknown>) {
                upsertPayload = payload
                upsertOptions = options
                return Promise.resolve({ error: null })
              },
            }
          }

          assert.equal(table, 'google_mailboxes')
          return {
            select(_columns: string) {
              return {
                eq(column: string, value: string) {
                  assert.equal(column, 'chef_id')
                  assert.equal(value, 'chef-1')
                  return {
                    order() {
                      return {
                        order: async () => ({
                          data: [],
                        }),
                      }
                    },
                  }
                },
              }
            },
            upsert(payload: Record<string, unknown>, _options: Record<string, unknown>) {
              mailboxUpsertPayload = payload
              return {
                select() {
                  return {
                    single: async () => ({
                      data: {
                        id: 'mailbox-1',
                        chef_id: 'chef-1',
                        tenant_id: 'tenant-1',
                        email: 'chef@example.com',
                        normalized_email: 'chef@example.com',
                        access_token: 'access-token-1',
                        refresh_token: 'existing-refresh-token',
                        token_expires_at: '2030-01-01T00:00:00.000Z',
                        scopes: [
                          'https://www.googleapis.com/auth/calendar.events',
                          'https://www.googleapis.com/auth/gmail.readonly',
                          'https://www.googleapis.com/auth/gmail.send',
                        ],
                        gmail_connected: true,
                        gmail_history_id: null,
                        gmail_last_sync_at: null,
                        gmail_sync_errors: 0,
                        historical_scan_enabled: false,
                        historical_scan_include_spam_trash: true,
                        historical_scan_status: 'idle',
                        historical_scan_page_token: null,
                        historical_scan_total_processed: 0,
                        historical_scan_total_seen: 0,
                        historical_scan_result_size_estimate: null,
                        historical_scan_lookback_days: 0,
                        historical_scan_started_at: null,
                        historical_scan_completed_at: null,
                        historical_scan_last_run_at: null,
                        is_primary: true,
                        is_active: true,
                      },
                      error: null,
                    }),
                  }
                },
              }
            },
          }
        },
      }),
    },
  } as NodeJS.Module

  require.cache[headersPath] = {
    exports: {
      ...(originalHeaders?.exports ?? {}),
      cookies: () => ({
        get(name: string) {
          if (name !== 'google-oauth-csrf') return undefined
          return { value: 'csrf-123' }
        },
      }),
    },
  } as NodeJS.Module

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url =
      typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
    fetchCalls.push({ url, init })

    if (url === 'https://oauth2.googleapis.com/token') {
      return new Response(
        JSON.stringify({
          access_token: 'access-token-1',
          expires_in: 3600,
          scope:
            'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send',
        }),
        {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }
      )
    }

    if (url === 'https://www.googleapis.com/oauth2/v2/userinfo') {
      return new Response(JSON.stringify({ email: 'chef@example.com' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    }

    throw new Error(`Unexpected fetch URL: ${url}`)
  }) as typeof global.fetch

  delete require.cache[routePath]

  try {
    await withEnv(
      {
        NODE_ENV: 'production',
        GOOGLE_CLIENT_ID: 'client-123',
        GOOGLE_CLIENT_SECRET: 'secret-123',
        NEXT_PUBLIC_SITE_URL: 'https://app.cheflowhq.com',
        NEXT_PUBLIC_APP_URL: 'https://app.cheflowhq.com',
      },
      async () => {
        const { GET } = require(routePath)
        const state = Buffer.from(
          JSON.stringify({
            chefId: 'chef-1',
            csrf: 'csrf-123',
            returnTo: '/settings/integrations',
          })
        ).toString('base64')

        const response = await GET(
          new NextRequest(
            `http://0.0.0.0:3000/api/auth/google/connect/callback?code=code-123&state=${encodeURIComponent(
              state
            )}`,
            {
              headers: {
                'x-forwarded-proto': 'https',
                'x-forwarded-host': 'app.cheflowhq.com',
                host: '0.0.0.0:3000',
              },
            }
          )
        )

        assert.equal(response.status, 307)
        assert.equal(
          response.headers.get('location'),
          'https://app.cheflowhq.com/settings/integrations?connected=gmail'
        )
        assert.equal(selectedChefId, 'chef-1')
        assert.deepEqual(upsertOptions, { onConflict: 'chef_id' })
        assert.equal(upsertPayload?.chef_id, 'chef-1')
        assert.equal(upsertPayload?.tenant_id, 'tenant-1')
        assert.equal(upsertPayload?.connected_email, 'chef@example.com')
        assert.equal(upsertPayload?.gmail_connected, true)
        assert.equal(upsertPayload?.calendar_connected, true)
        assert.equal(upsertPayload?.refresh_token, 'existing-refresh-token')
        assert.deepEqual(upsertPayload?.scopes, [
          'https://www.googleapis.com/auth/calendar.events',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/gmail.send',
        ])
        assert.equal(upsertPayload?.gmail_sync_errors, 0)
        assert.equal(mailboxUpsertPayload?.chef_id, 'chef-1')
        assert.equal(mailboxUpsertPayload?.tenant_id, 'tenant-1')
        assert.equal(mailboxUpsertPayload?.normalized_email, 'chef@example.com')
        assert.equal(mailboxUpsertPayload?.gmail_connected, true)
        assert.equal(mailboxUpsertPayload?.refresh_token, 'existing-refresh-token')
        assert.equal(response.cookies.get('google-oauth-csrf')?.value, '')

        assert.equal(fetchCalls.length, 2)
        assert.equal(fetchCalls[0]?.url, 'https://oauth2.googleapis.com/token')
        assert.match(
          String(fetchCalls[0]?.init?.body),
          /redirect_uri=https%3A%2F%2Fapp\.cheflowhq\.com%2Fapi%2Fauth%2Fgoogle%2Fconnect%2Fcallback/
        )
        assert.equal(fetchCalls[1]?.url, 'https://www.googleapis.com/oauth2/v2/userinfo')
      }
    )
  } finally {
    global.fetch = originalFetch
    if (originalAuth) {
      require.cache[authPath] = originalAuth
    } else {
      delete require.cache[authPath]
    }
    if (originalServer) {
      require.cache[serverPath] = originalServer
    } else {
      delete require.cache[serverPath]
    }
    if (originalHeaders) {
      require.cache[headersPath] = originalHeaders
    } else {
      delete require.cache[headersPath]
    }
    delete require.cache[routePath]
  }
})
