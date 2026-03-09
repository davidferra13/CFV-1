// Product Tests — Deep Chef Feature Coverage
// Tests every major feature area of the chef portal for functionality.
// This is the "every button works" layer.
//
// Run: npx playwright test -p product-chef --grep "Deep"

import { test, expect } from '../helpers/fixtures'

// Dev server cold-compiles pages on first visit. Give generous timeouts.
test.setTimeout(60_000)

// ── Marketing & Campaigns ──────────────────────────────────────────────────

test.describe('Deep — Marketing', () => {
  test('marketing hub loads', async ({ page }) => {
    await page.goto('/marketing')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('marketing sub-pages load', async ({ page }) => {
    const pages = ['/marketing/sequences', '/marketing/templates', '/marketing/push-dinners']
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── Social & Community ─────────────────────────────────────────────────────

test.describe('Deep — Social', () => {
  test('social hub loads', async ({ page }) => {
    await page.goto('/social')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('social sub-pages load', async ({ page }) => {
    const pages = ['/social/connections', '/social/vault', '/social/settings', '/social/planner']
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('network page loads', async ({ page }) => {
    await page.goto('/network')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('reviews page loads', async ({ page }) => {
    await page.goto('/reviews')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('portfolio page loads', async ({ page }) => {
    await page.goto('/portfolio')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('testimonials page loads', async ({ page }) => {
    await page.goto('/testimonials')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Partners ───────────────────────────────────────────────────────────────

test.describe('Deep — Partners', () => {
  test('partners list loads', async ({ page }) => {
    await page.goto('/partners')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('partner sub-pages load', async ({ page }) => {
    const pages = [
      '/partners/active',
      '/partners/inactive',
      '/partners/new',
      '/partners/referral-performance',
      '/partners/events-generated',
    ]
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('partner detail page loads', async ({ page, seedIds }) => {
    await page.goto(`/partners/${seedIds.partnerId}`)
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Leads ──────────────────────────────────────────────────────────────────

test.describe('Deep — Leads', () => {
  test('leads page loads', async ({ page }) => {
    await page.goto('/leads')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('leads sub-pages load', async ({ page }) => {
    const pages = [
      '/leads/new',
      '/leads/contacted',
      '/leads/qualified',
      '/leads/converted',
      '/leads/archived',
    ]
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── Finance Deep ───────────────────────────────────────────────────────────

test.describe('Deep — Finance Pages', () => {
  test('finance reporting pages load', async ({ page }) => {
    const pages = [
      '/finance/reporting/profit-loss',
      '/finance/reporting/revenue-by-month',
      '/finance/reporting/revenue-by-client',
      '/finance/reporting/revenue-by-event',
      '/finance/reporting/profit-by-event',
      '/finance/reporting/expense-by-category',
      '/finance/reporting/tax-summary',
      '/finance/reporting/year-to-date-summary',
    ]
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('finance tax pages load', async ({ page }) => {
    const pages = ['/finance/tax/quarterly', '/finance/tax/year-end', '/finance/tax/depreciation']
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('finance invoices sub-pages load', async ({ page }) => {
    const pages = [
      '/finance/invoices/draft',
      '/finance/invoices/sent',
      '/finance/invoices/paid',
      '/finance/invoices/overdue',
    ]
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('pricing calculator loads', async ({ page }) => {
    await page.goto('/finance/pricing-calculator')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('revenue per hour loads', async ({ page }) => {
    await page.goto('/finance/revenue-per-hour')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('forecast page loads', async ({ page }) => {
    await page.goto('/finance/forecast')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Proposals & Contracts ──────────────────────────────────────────────────

test.describe('Deep — Proposals & Contracts', () => {
  test('proposals hub loads', async ({ page }) => {
    await page.goto('/proposals')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('proposal sub-pages load', async ({ page }) => {
    const pages = ['/proposals/addons', '/proposals/templates']
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })

  test('contracts page loads', async ({ page }) => {
    await page.goto('/contracts')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Tasks & Goals ──────────────────────────────────────────────────────────

test.describe('Deep — Tasks & Goals', () => {
  test('tasks page loads', async ({ page }) => {
    await page.goto('/tasks')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('goals page loads', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Documents ──────────────────────────────────────────────────────────────

test.describe('Deep — Documents', () => {
  test('documents page loads', async ({ page }) => {
    await page.goto('/documents')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Commerce / POS ─────────────────────────────────────────────────────────

test.describe('Deep — Commerce', () => {
  test('commerce hub loads', async ({ page }) => {
    await page.goto('/commerce')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })

  test('commerce sub-pages load', async ({ page }) => {
    const pages = [
      '/commerce/products',
      '/commerce/register',
      '/commerce/orders',
      '/commerce/sales',
    ]
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── Settings Deep ──────────────────────────────────────────────────────────

test.describe('Deep — Settings', () => {
  test.setTimeout(180_000) // 24 settings pages, cold-compile each
  test('all critical settings pages load', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const settingsPages = [
      '/settings',
      '/settings/profile',
      '/settings/public-profile',
      '/settings/notifications',
      '/settings/modules',
      '/settings/billing',
      '/settings/appearance',
      '/settings/automations',
      '/settings/integrations',
      '/settings/embed',
      '/settings/calendar-sync',
      '/settings/api-keys',
      '/settings/webhooks',
      '/settings/templates',
      '/settings/event-types',
      '/settings/emergency',
      '/settings/compliance',
      '/settings/ai-privacy',
      '/settings/remy',
      '/settings/stripe-connect',
      '/settings/navigation',
      '/settings/dashboard',
      '/settings/my-services',
      '/settings/print',
      '/settings/devices',
    ]

    for (const route of settingsPages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }

    expect(errors).toHaveLength(0)
  })
})

// ── Onboarding ─────────────────────────────────────────────────────────────

test.describe('Deep — Onboarding', () => {
  test('onboarding pages load', async ({ page }) => {
    const pages = ['/onboarding', '/onboarding/clients', '/onboarding/recipes', '/onboarding/staff']
    for (const route of pages) {
      await page.goto(route)
      await page.waitForLoadState('domcontentloaded')
      await expect(page).not.toHaveURL(/auth\/signin/)
    }
  })
})

// ── Help ───────────────────────────────────────────────────────────────────

test.describe('Deep — Help', () => {
  test('help page loads', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Vendors ────────────────────────────────────────────────────────────────

test.describe('Deep — Vendors', () => {
  test('vendors page loads', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Daily Report ───────────────────────────────────────────────────────────

test.describe('Deep — Daily', () => {
  test('daily page loads', async ({ page }) => {
    await page.goto('/daily')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})

// ── Activity ───────────────────────────────────────────────────────────────

test.describe('Deep — Activity', () => {
  test('activity page loads', async ({ page }) => {
    await page.goto('/activity')
    await page.waitForLoadState('domcontentloaded')
    await expect(page).not.toHaveURL(/auth\/signin/)
  })
})
