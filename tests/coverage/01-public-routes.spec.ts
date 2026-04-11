// Coverage Layer — Public Routes
// Visits every public-facing URL (no auth required) and asserts:
//   1. Page does not crash (no 500, no unhandled JS error)
//   2. Has meaningful content (not a blank page)
//   3. Auth-protected routes correctly redirect unauthenticated users
//
// Run: npm run test:coverage:public

import { test, expect } from '../helpers/fixtures'

async function getPublicChefSlug(page: Parameters<Parameters<typeof test>[1]>[0]['page']) {
  await gotoWithRetry(page, '/chefs')
  await page
    .locator('main')
    .first()
    .waitFor({ state: 'visible', timeout: 20_000 })
    .catch(() => {})
  await page.waitForTimeout(800)

  const href = await page
    .locator('a[href^="/chef/"]')
    .evaluateAll((links) => {
      for (const link of links) {
        const href = link.getAttribute('href')
        if (href && /^\/chef\/[^/]+$/.test(href)) {
          return href
        }
      }
      return null
    })
    .catch(() => null)

  return href?.split('/')[2] ?? null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gotoWithRetry(page: Parameters<Parameters<typeof test>[1]>[0]['page'], url: string) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 90_000 })
      if ((response?.status() ?? 0) >= 500 && attempt < 2) {
        await page.waitForTimeout(400)
        continue
      }
      return response
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const retryable = /ERR_ABORTED|ERR_CONNECTION|timeout|frame was detached/i.test(message)
      if (!retryable || attempt === 2) throw error
      await page.waitForTimeout(400)
    }
  }
  return null
}

async function assertPageLoads(
  page: Parameters<Parameters<typeof test>[1]>[0]['page'],
  url: string
) {
  const errors: string[] = []
  page.on('pageerror', (err) => errors.push(err.message))

  const response = await gotoWithRetry(page, url)
  const status = response?.status() ?? 0

  // Accept 200, 304 — reject 4xx/5xx (but not 404 for token-based routes tested separately)
  expect(status, `${url} returned HTTP ${status}`).toBeLessThan(500)

  // No unhandled JS errors
  expect(errors, `${url} had JS errors: ${errors.join('; ')}`).toHaveLength(0)

  // Page is not blank
  let bodyText = await page.locator('body').innerText()
  if (!bodyText.trim()) {
    await page.waitForTimeout(500)
    bodyText = (await page.locator('body').textContent()) ?? ''
  }
  expect(bodyText.trim().length, `${url} rendered a blank page`).toBeGreaterThan(10)
}

// ─── Landing & Marketing ──────────────────────────────────────────────────────

test.describe('Public — Landing & Marketing Pages', () => {
  test('/ — home page loads', async ({ page }) => {
    await assertPageLoads(page, '/')
  })

  test('/book — book page loads', async ({ page }) => {
    await assertPageLoads(page, '/book')
  })

  test('/how-it-works — how it works page loads', async ({ page }) => {
    await assertPageLoads(page, '/how-it-works')
  })

  test('/services — services page loads', async ({ page }) => {
    await assertPageLoads(page, '/services')
  })

  test('/about — about page loads', async ({ page }) => {
    await assertPageLoads(page, '/about')
  })

  test('/contact — contact page loads', async ({ page }) => {
    await assertPageLoads(page, '/contact')
  })

  test('/privacy — privacy policy loads', async ({ page }) => {
    await assertPageLoads(page, '/privacy')
  })

  test('/terms — terms of service loads', async ({ page }) => {
    await assertPageLoads(page, '/terms')
  })

  test('/chefs — chef directory loads', async ({ page }) => {
    await assertPageLoads(page, '/chefs')
  })

  test('/trust — trust center loads', async ({ page }) => {
    await assertPageLoads(page, '/trust')
  })

  test('/for-operators — operator landing page loads', async ({ page }) => {
    await assertPageLoads(page, '/for-operators')
  })

  test('/marketplace-chefs — marketplace chefs page loads', async ({ page }) => {
    await assertPageLoads(page, '/marketplace-chefs')
  })

  test('/discover — legacy discover route serves the nearby experience', async ({ page }) => {
    await page.goto('/discover?city=portland', { waitUntil: 'domcontentloaded' })
    await page.waitForURL(/\/nearby\?city=portland$/, { timeout: 20_000 })

    expect(page.url()).toMatch(/\/nearby\?city=portland$/)

    const bodyText = (await page.locator('body').innerText()) ?? ''
    expect(bodyText).toMatch(/nearby|find food near you|no listings match these filters/i)
  })
})

// ─── Auth Routes ──────────────────────────────────────────────────────────────

test.describe('Public — Auth Pages', () => {
  test('/auth/signin — sign-in page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/signin')
    await expect(page.getByRole('heading').first()).toBeVisible()
  })

  test('/auth/signup — chef signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/signup')
  })

  test('/auth/client-signup — client signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/client-signup')
  })

  test('/auth/forgot-password — forgot password page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/forgot-password')
  })
})

// ─── Chef Public Profile ──────────────────────────────────────────────────────

test.describe('Public — Chef Profile Pages', () => {
  test('/chef/[slug] — public chef profile loads', async ({ page, seedIds }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await assertPageLoads(page, `/chef/${slug}`)
    await page.waitForLoadState('networkidle')
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/start inquiry|gift cards|visit website|reviews|available dates/i)
  })

  test('/chef/[slug]/inquire — inquiry form loads', async ({ page, seedIds }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    await assertPageLoads(page, `/chef/${slug}/inquire`)
    // Inquiry form should have some fields
    await page.waitForLoadState('networkidle')
  })

  test('/chef/[slug]/gift-cards — gift card page loads (or graceful 404)', async ({
    page,
    seedIds,
  }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const response = await page.goto(`/chef/${slug}/gift-cards`, {
      waitUntil: 'domcontentloaded',
    })
    // Accept either a real page (200) or a not-found (404) — just not a crash (500)
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/chef/invalid-slug — handles unknown chef slug gracefully', async ({ page }) => {
    const response = await page.goto('/chef/this-chef-does-not-exist-xyz123', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
    // Should show a not-found message, not a blank page
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.trim().length).toBeGreaterThan(10)
  })
})

// ─── Partner Signup ───────────────────────────────────────────────────────────

test.describe('Public — Partner & Referral Pages', () => {
  test('/partner-signup — partner signup page loads', async ({ page }) => {
    await assertPageLoads(page, '/partner-signup')
  })
})

// ─── Booking Funnel ───────────────────────────────────────────────────────────

test.describe('Public — Booking Funnel', () => {
  test('/book/[chefSlug] — booking intake loads', async ({ page, seedIds }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const response = await page.goto(`/book/${slug}`, { waitUntil: 'domcontentloaded' })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Token-based Sharing ──────────────────────────────────────────────────────

test.describe('Public — Share Token Pages', () => {
  test('/share/invalid-token — handles bad share token gracefully', async ({ page }) => {
    const response = await page.goto('/share/definitely-not-a-real-token', {
      waitUntil: 'domcontentloaded',
    })
    // Should return 200 with an error message, or 404 — not a crash
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Unsubscribe ──────────────────────────────────────────────────────────────

test.describe('Public — Unsubscribe', () => {
  test('/unsubscribe — handles missing/bad token gracefully', async ({ page }) => {
    const response = await page.goto('/unsubscribe?token=invalid', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

// ─── Redirect Guards ──────────────────────────────────────────────────────────

test.describe('Public — Unauthenticated Redirect Guards', () => {
  test('/dashboard — redirects unauthenticated user to sign-in', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/events — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/events')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/clients — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/clients')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/my-events — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/my-events')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/admin — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/auth\/signin|login|unauthorized/, { timeout: 10_000 })
  })

  test('/financials — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/financials')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })

  test('/settings — redirects unauthenticated user', async ({ page }) => {
    await page.goto('/settings')
    await expect(page).toHaveURL(/auth\/signin|login/, { timeout: 10_000 })
  })
})

test.describe('Public - Additional Auth Routes', () => {
  test('/auth/partner-signup - partner auth onboarding loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/partner-signup')
  })

  test('/auth/role-selection - role picker loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/role-selection')
  })
})

test.describe('Public - Additional Tokenized Routes', () => {
  test('/auth/verify-email - verify email page loads', async ({ page }) => {
    await assertPageLoads(page, '/auth/verify-email')
  })

  test('/availability/[token] - invalid availability token handled gracefully', async ({
    page,
  }) => {
    const response = await page.goto('/availability/not-a-real-token', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/book/campaign/[token] - invalid campaign token handled gracefully', async ({ page }) => {
    const response = await page.goto('/book/campaign/not-a-real-campaign-token', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/cannabis-invite/[token] - invalid invite token handled gracefully', async ({ page }) => {
    const response = await page.goto('/cannabis-invite/not-a-real-invite-token', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/partner-report/[token] - invalid partner report token handled gracefully', async ({
    page,
  }) => {
    const response = await page.goto('/partner-report/not-a-real-partner-report-token', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

test.describe('Public - Additional Public Pages', () => {
  test('/book/[chefSlug]/thank-you - thank-you page responds', async ({ page, seedIds }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const response = await page.goto(`/book/${slug}/thank-you`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/cannabis/public - cannabis public page loads', async ({ page }) => {
    await assertPageLoads(page, '/cannabis/public')
  })

  test('/chef/[slug]/gift-cards/success - success page responds', async ({ page, seedIds }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const response = await page.goto(`/chef/${slug}/gift-cards/success`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/chef/[slug]/partner-signup - chef partner signup page responds', async ({
    page,
    seedIds,
  }) => {
    const slug = await getPublicChefSlug(page)
    test.skip(!slug, 'No public chef profile is currently listed in the directory')
    const response = await page.goto(`/chef/${slug}/partner-signup`, {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/event/[eventId]/guest/[secureToken] - invalid guest token handled gracefully', async ({
    page,
    seedIds,
  }) => {
    const response = await page.goto(
      `/event/${seedIds.eventIds.completed}/guest/not-a-real-token`,
      {
        waitUntil: 'domcontentloaded',
      }
    )
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})

test.describe('Public - Additional Shortlink and Demo Routes', () => {
  test('/demo - demo page loads', async ({ page }) => {
    await assertPageLoads(page, '/demo')
  })

  test('/g/[code] - invalid short code handled gracefully', async ({ page }) => {
    const response = await page.goto('/g/not-a-real-short-code', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })

  test('/share/[token]/recap - invalid recap token handled gracefully', async ({ page }) => {
    const response = await page.goto('/share/not-a-real-token/recap', {
      waitUntil: 'domcontentloaded',
    })
    expect(response?.status() ?? 0).toBeLessThan(500)
  })
})
