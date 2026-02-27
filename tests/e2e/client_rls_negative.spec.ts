import { test, expect } from '../helpers/fixtures'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'

const BASE_URL = 'http://localhost:3100'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[client-rls-negative] Missing required env var: ${name}`)
  return value
}

function extractAccessTokenFromStorageState(path: string): string {
  const raw = readFileSync(path, 'utf-8')
  const storageState = JSON.parse(raw) as {
    cookies: Array<{ name: string; value: string }>
  }

  const authCookie = storageState.cookies.find((cookie) => cookie.name.endsWith('-auth-token'))
  if (!authCookie) throw new Error('[client-rls-negative] Auth cookie not found in storage state')

  if (!authCookie.value.startsWith('base64-')) {
    throw new Error('[client-rls-negative] Unexpected auth cookie format')
  }

  const decoded = Buffer.from(authCookie.value.slice('base64-'.length), 'base64').toString('utf-8')
  const parsed = JSON.parse(decoded) as { access_token?: string }
  if (!parsed.access_token) throw new Error('[client-rls-negative] Missing access token payload')
  return parsed.access_token
}

test.describe('Client RLS Negative', () => {
  test.setTimeout(90_000)

  test('client cannot access another tenant event routes or documents', async ({
    browser,
    seedIds,
  }) => {
    const clientContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/client.json',
    })
    const page = await clientContext.newPage()

    try {
      await page.goto('/my-events')
      await expect(page.getByText(/chef b private dinner/i)).toHaveCount(0)

      await page.goto(`/my-events/${seedIds.chefBEventId}`)
      const currentUrl = page.url()
      const blocked =
        !currentUrl.includes(seedIds.chefBEventId) ||
        (await page
          .getByText(/404|page not found|not found|doesn't exist/i)
          .first()
          .isVisible()
          .catch(() => false))
      expect(blocked).toBeTruthy()

      const invoiceResp = await page.request.get(
        `/api/documents/invoice-pdf/${seedIds.chefBEventId}`
      )
      expect(invoiceResp.status()).not.toBe(200)
      expect(invoiceResp.status()).toBeLessThan(500)

      const fohResp = await page.request.get(`/api/documents/foh-menu/${seedIds.chefBEventId}`)
      expect(fohResp.status()).not.toBe(200)
      expect(fohResp.status()).toBeLessThan(500)
    } finally {
      await clientContext.close()
    }
  })

  test('direct RLS query blocks cross-tenant event rows with client auth token', async ({
    seedIds,
  }) => {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
    const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    const accessToken = extractAccessTokenFromStorageState('.auth/client.json')

    const rlsClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    })

    const { data: ownEventRows, error: ownEventError } = await rlsClient
      .from('events')
      .select('id')
      .eq('id', seedIds.eventIds.completed)
    if (ownEventError) throw new Error(`[client-rls-negative] Own-event RLS query failed`)
    expect((ownEventRows ?? []).length).toBe(1)

    const { data: crossTenantRows, error: crossTenantError } = await rlsClient
      .from('events')
      .select('id')
      .eq('id', seedIds.chefBEventId)
    if (crossTenantError) throw new Error(`[client-rls-negative] Cross-tenant RLS query failed`)
    expect(crossTenantRows ?? []).toHaveLength(0)
  })
})
