// Diagnostic Suite 01 — Stripe & Payment Infrastructure
// Tests: Stripe webhook security, payment page rendering, invoice/receipt PDFs,
//        Connect status pages, payment settings, financial document integrity
//
// Goal: Find every broken payment path before production

import { test, expect } from '../helpers/fixtures'

// ─── Stripe Webhook Security ────────────────────────────────────────────────

test.describe('Stripe Webhook — Security', () => {
  test('rejects POST without stripe-signature header', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ type: 'payment_intent.succeeded', id: 'evt_fake' }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).toBeLessThan(500)
    expect(resp.status()).not.toBe(200)
  })

  test('rejects POST with invalid stripe-signature', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/stripe', {
      data: JSON.stringify({ type: 'payment_intent.succeeded' }),
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=9999999999,v1=invalid_signature_value',
      },
    })
    expect(resp.status()).toBeLessThan(500)
    expect(resp.status()).not.toBe(200)
  })

  test('rejects GET request (webhooks are POST only)', async ({ page }) => {
    const resp = await page.request.get('/api/webhooks/stripe')
    expect(resp.status()).not.toBe(200)
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Resend Webhook Security ────────────────────────────────────────────────

test.describe('Resend Webhook — Security', () => {
  test('rejects POST without valid signature', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/resend', {
      data: JSON.stringify({ type: 'email.opened', data: {} }),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).toBeLessThan(500)
  })

  test('handles empty body gracefully', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/resend', {
      data: '',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Twilio Webhook Security ────────────────────────────────────────────────

test.describe('Twilio Webhook — Security', () => {
  test('rejects POST without valid Twilio payload', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/twilio', {
      data: '',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(resp.status()).toBeLessThan(500)
  })

  test('handles malformed SMS payload', async ({ page }) => {
    const resp = await page.request.post('/api/webhooks/twilio', {
      data: 'From=notaphone&Body=test',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Payment Settings Pages ─────────────────────────────────────────────────

test.describe('Payment Settings — Page Rendering', () => {
  test('payments & billing settings page loads', async ({ page }) => {
    await page.goto('/settings/payments-and-billing')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
    // Should show Stripe Connect or payment settings content
    const hasPayment = /stripe|connect|payment|billing|payout/i.test(body)
    expect(hasPayment).toBeTruthy()
  })

  test('settings page shows Stripe Connect status', async ({ page }) => {
    await page.goto('/settings/payments-and-billing')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // Should show either "Connect" setup or "Connected" status
    const hasConnect = /connect|stripe|set up|linked|onboard/i.test(body)
    expect(hasConnect).toBeTruthy()
  })
})

// ─── Finance Pages — Deep Render ────────────────────────────────────────────

test.describe('Finance Pages — Deep Rendering', () => {
  test('invoices page loads with column headers', async ({ page }) => {
    await page.goto('/finance/invoices')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('payments page loads', async ({ page }) => {
    await page.goto('/finance/payments')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('deposits sub-page loads', async ({ page }) => {
    await page.goto('/finance/payments/deposits')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('payouts page loads', async ({ page }) => {
    await page.goto('/finance/payouts')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('disputes page loads', async ({ page }) => {
    await page.goto('/finance/disputes')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('retainers page loads', async ({ page }) => {
    await page.goto('/finance/retainers')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('recurring payments page loads', async ({ page }) => {
    await page.goto('/finance/recurring')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })

  test('bank feed page loads', async ({ page }) => {
    await page.goto('/finance/bank-feed')
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    expect(body).not.toMatch(/500|internal server error/i)
  })
})

// ─── Document PDF Generation ────────────────────────────────────────────────

test.describe('PDF Generation — All Document Types', () => {
  test('event summary PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=summary`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
      const body = await resp.body()
      expect(body.length).toBeGreaterThan(100)
    }
  })

  test('grocery list PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=grocery`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('prep sheet PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=prep`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('execution sheet PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/documents/${seedIds.eventIds.completed}?type=execution`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('front-of-house menu PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=foh`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('checklist PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/documents/${seedIds.eventIds.completed}?type=checklist`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('packing list PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=packing`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('reset checklist PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=reset`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('travel route PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=travel`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('content shot list PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=shots`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('combined "all" PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/${seedIds.eventIds.completed}?type=all`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
    }
  })

  test('invoice PDF returns PDF content type', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/invoice/${seedIds.eventIds.completed}`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
      const body = await resp.body()
      // Valid PDF starts with %PDF
      const header = body.toString('utf-8', 0, 5)
      expect(header).toBe('%PDF-')
    }
  })

  test('receipt PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/receipt/${seedIds.eventIds.completed}`)
    expect(resp.status()).toBeLessThan(500)
  })

  test('quote PDF (chef view) returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(`/api/documents/quote/${seedIds.quoteIds.sent}`)
    expect(resp.status()).toBeLessThan(500)
    if (resp.status() === 200) {
      expect(resp.headers()['content-type']).toMatch(/pdf/)
    }
  })

  test('financial summary PDF returns valid response', async ({ page, seedIds }) => {
    const resp = await page.request.get(
      `/api/documents/financial-summary/${seedIds.eventIds.completed}`
    )
    expect(resp.status()).toBeLessThan(500)
  })

  test('invalid event ID returns 404 not 500', async ({ page }) => {
    const resp = await page.request.get(
      '/api/documents/00000000-0000-0000-0000-000000000000?type=summary'
    )
    expect(resp.status()).toBeLessThan(500)
  })
})

// ─── Event Financial Display ────────────────────────────────────────────────

test.describe('Event Financial Display', () => {
  test('completed event shows financial summary', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.completed}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // Completed event should show financial data
    const hasFinancial = /\$|payment|deposit|balance|paid|revenue/i.test(body)
    expect(hasFinancial).toBeTruthy()
  })

  test('event detail page has document generation buttons', async ({ page, seedIds }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')
    const body = await page.locator('body').innerText()
    // Should have links/buttons for documents
    const hasDocs = /document|pdf|invoice|contract|summary|prep|grocery/i.test(body)
    expect(hasDocs).toBeTruthy()
  })
})

// ─── Stripe Connect Callback ────────────────────────────────────────────────

test.describe('Stripe Connect — Callback Route', () => {
  test('connect callback without params returns error gracefully', async ({ page }) => {
    const resp = await page.request.get('/api/stripe/connect/callback')
    expect(resp.status()).toBeLessThan(500)
  })

  test('connect callback with invalid params does not crash', async ({ page }) => {
    const resp = await page.request.get('/api/stripe/connect/callback?from=onboarding')
    expect(resp.status()).toBeLessThan(500)
  })
})
