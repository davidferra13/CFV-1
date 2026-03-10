import { test, expect } from '../helpers/fixtures'
import { createClient } from '@supabase/supabase-js'
import { TEST_BASE_URL } from '../helpers/runtime-base-url'

const BASE_URL = TEST_BASE_URL
const TRANSIENT_500_TEXT = /internal server error/i

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`[golden-path] Missing required env var: ${name}`)
  return value
}

function getAdminSupabase() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function gotoWithRetryOn500(page: any, url: string, attempts = 3) {
  for (let i = 0; i < attempts; i++) {
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    const has500 = await page
      .getByText(TRANSIENT_500_TEXT)
      .first()
      .isVisible()
      .catch(() => false)
    if (!has500) return
    if (i < attempts - 1) {
      await page.waitForTimeout(1000 * (i + 1))
      await page.reload()
    }
  }
  await expect(page.getByText(TRANSIENT_500_TEXT)).toHaveCount(0)
}

test.describe('Chef <-> Client Golden Contract Flow', () => {
  test.setTimeout(240_000)

  test('chef sends quote, client accepts, chef sees reflected state, client sees FOH output', async ({
    browser,
    seedIds,
  }) => {
    const admin = getAdminSupabase()
    const suffix = Date.now().toString()

    const goldenQuoteName = `TEST Golden Quote ${suffix}`
    const hiddenDraftQuoteName = `TEST Hidden Draft ${suffix}`
    const fohOccasion = `TEST Golden FOH Event ${suffix}`

    const { data: fohEvent, error: fohEventError } = await admin
      .from('events')
      .insert({
        tenant_id: seedIds.chefId,
        client_id: seedIds.clientId,
        event_date: daysFromNow(10),
        serve_time: '18:00:00',
        guest_count: 6,
        occasion: fohOccasion,
        location_address: '100 Golden Contract Way',
        location_city: 'Boston',
        location_state: 'MA',
        location_zip: '02101',
        status: 'confirmed',
        service_style: 'plated',
        pricing_model: 'flat_rate',
        quoted_price_cents: 125000,
        deposit_amount_cents: 31250,
      })
      .select('id')
      .single()
    if (fohEventError || !fohEvent) throw new Error(`[golden-path] Failed to create FOH event`)

    const { data: fohMenu, error: fohMenuError } = await admin
      .from('menus')
      .insert({
        tenant_id: seedIds.chefId,
        event_id: fohEvent.id,
        name: `TEST Golden FOH Menu ${suffix}`,
        description: 'Golden path menu for FOH document assertions',
        status: 'draft',
        is_template: false,
      })
      .select('id')
      .single()
    if (fohMenuError || !fohMenu) throw new Error(`[golden-path] Failed to create FOH menu`)

    const { error: dishError } = await admin.from('dishes').insert({
      tenant_id: seedIds.chefId,
      menu_id: fohMenu.id,
      course_number: 1,
      course_name: 'TEST Golden First Course',
      sort_order: 1,
      dietary_tags: [],
      allergen_flags: [],
    })
    if (dishError) throw new Error(`[golden-path] Failed to create FOH dish`)

    const { data: seededDraftQuote, error: seededDraftQuoteError } = await admin
      .from('quotes')
      .select('id')
      .eq('id', seedIds.quoteIds.draft)
      .single()
    if (seededDraftQuoteError || !seededDraftQuote) {
      throw new Error('[golden-path] Seed draft quote not found')
    }

    const goldenQuote = { id: seededDraftQuote.id }

    const { error: resetQuoteError } = await admin
      .from('quotes')
      .update({
        tenant_id: seedIds.chefId,
        client_id: seedIds.clientId,
        inquiry_id: seedIds.inquiryIds.awaitingChef,
        quote_name: goldenQuoteName,
        pricing_model: 'flat_rate',
        total_quoted_cents: 88000,
        deposit_required: true,
        deposit_amount_cents: 22000,
        status: 'draft',
        sent_at: null,
        accepted_at: null,
        rejected_at: null,
        expired_at: null,
        snapshot_frozen: false,
      })
      .eq('id', goldenQuote.id)
    if (resetQuoteError) throw new Error('[golden-path] Failed to reset draft quote fixture')

    const { error: hiddenDraftError } = await admin.from('quotes').insert({
      tenant_id: seedIds.chefId,
      client_id: seedIds.clientId,
      inquiry_id: seedIds.inquiryIds.awaitingChef,
      quote_name: hiddenDraftQuoteName,
      pricing_model: 'flat_rate',
      total_quoted_cents: 41000,
      deposit_required: false,
      status: 'draft',
      valid_until: daysFromNow(14),
    })
    if (hiddenDraftError) throw new Error(`[golden-path] Failed to create hidden draft quote`)

    const chefContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
    })
    const clientContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/client.json',
    })
    const chefPage = await chefContext.newPage()
    const clientPage = await clientContext.newPage()

    try {
      const { data: sentByChef, error: sentByChefError } = await admin
        .from('quotes')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', goldenQuote.id)
        .eq('status', 'draft')
        .select('id')
        .single()
      if (sentByChefError || !sentByChef) {
        throw new Error('[golden-path] Failed to send quote from chef side')
      }

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('quotes')
              .select('status')
              .eq('id', goldenQuote.id)
              .single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('sent')

      const { data: quoteAfterSend, error: quoteAfterSendError } = await admin
        .from('quotes')
        .select('status, sent_at')
        .eq('id', goldenQuote.id)
        .single()
      if (quoteAfterSendError || !quoteAfterSend)
        throw new Error('[golden-path] Could not read quote after chef send')
      expect(quoteAfterSend.status).toBe('sent')
      expect(quoteAfterSend.sent_at).toBeTruthy()

      await gotoWithRetryOn500(chefPage, '/quotes/sent')
      await expect(chefPage.getByRole('link', { name: new RegExp(goldenQuoteName) })).toBeVisible()

      await gotoWithRetryOn500(clientPage, '/my-quotes')
      await expect(clientPage.getByText(hiddenDraftQuoteName)).toHaveCount(0)
      await expect(clientPage.getByText(goldenQuoteName)).toBeVisible()

      await gotoWithRetryOn500(clientPage, `/my-quotes/${goldenQuote.id}`)
      const acceptButtons = clientPage.getByRole('button', { name: /^Accept Quote$/ })
      const openAcceptButton = acceptButtons.first()
      await expect(openAcceptButton).toBeVisible({ timeout: 15_000 })
      await openAcceptButton.scrollIntoViewIfNeeded()
      for (let i = 0; i < 5; i++) {
        await openAcceptButton.click({ force: true })
        const count = await acceptButtons.count()
        if (count >= 2) break
        await clientPage.waitForTimeout(300)
      }
      await expect(acceptButtons).toHaveCount(2, { timeout: 10_000 })
      const confirmButtons = clientPage.getByRole('button', { name: /^Accept Quote$/ })
      const confirmButtonCount = await confirmButtons.count()
      await confirmButtons.nth(Math.max(0, confirmButtonCount - 1)).click()
      // UI behavior can vary by implementation: some flows redirect to list,
      // others remain on detail and update state in place.
      await Promise.race([
        clientPage.waitForURL(/\/my-quotes$/, { timeout: 15_000 }),
        clientPage.waitForLoadState('networkidle', { timeout: 15_000 }),
      ]).catch(() => {})

      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('quotes')
              .select('status')
              .eq('id', goldenQuote.id)
              .single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('accepted')

      const { data: quoteAfterAccept, error: quoteAfterAcceptError } = await admin
        .from('quotes')
        .select('status, accepted_at, snapshot_frozen')
        .eq('id', goldenQuote.id)
        .single()
      if (quoteAfterAcceptError || !quoteAfterAccept) {
        throw new Error('[golden-path] Could not read quote after client acceptance')
      }
      expect(quoteAfterAccept.accepted_at).toBeTruthy()
      expect(quoteAfterAccept.snapshot_frozen).toBe(true)

      await gotoWithRetryOn500(clientPage, `/my-quotes/${goldenQuote.id}`)
      await expect(clientPage.getByText(/you accepted this quote on/i)).toBeVisible()

      await gotoWithRetryOn500(clientPage, `/my-events/${fohEvent.id}`)
      await expect(clientPage.getByRole('heading', { name: fohOccasion })).toBeVisible({
        timeout: 30_000,
      })
      const downloadLink = clientPage.getByRole('link', { name: /download menu pdf/i })
      await expect(downloadLink).toBeVisible({ timeout: 30_000 })
      const href = await downloadLink.getAttribute('href')
      expect(href).toBeTruthy()
      const fohResp = await clientPage.request.get(href!)
      expect(fohResp.status()).toBe(200)
      expect((fohResp.headers()['content-type'] || '').toLowerCase()).toContain('pdf')

      await gotoWithRetryOn500(chefPage, '/quotes/accepted')
      await expect(chefPage.getByRole('link', { name: new RegExp(goldenQuoteName) })).toBeVisible()
    } finally {
      await chefContext.close()
      await clientContext.close()
    }
  })
})
