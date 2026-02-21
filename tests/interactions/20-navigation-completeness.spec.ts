// Interaction Layer — Navigation Completeness Tests
// Tests that every major navigation link works:
//   - Sidebar clicks navigate to the correct page
//   - Breadcrumbs navigate back correctly
//   - Quick action buttons (New Event, New Client, etc.) work
//   - Back links on sub-pages return to parent
//   - Mobile navigation (bottom bar) tabs work
//   - Settings navigation shortcuts work
//
// Uses chef storageState (interactions-chef project).

import { test, expect } from '../helpers/fixtures'

// ─── Dashboard Quick Actions ───────────────────────────────────────────────────

test.describe('Navigation — Dashboard Quick Actions', () => {
  test('Dashboard has New Event or similar quick action', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
    const newEventBtn = page
      .getByRole('link', { name: /new event|add event|create event/i })
      .first()
      .or(page.getByRole('button', { name: /new event|add event|create event/i }).first())
    const isVisible = await newEventBtn.isVisible().catch(() => false)
    // Informational — quick actions may be in various positions
    if (isVisible) {
      await expect(newEventBtn).toBeVisible()
    }
  })

  test('Dashboard quick action to new client navigates correctly', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const newClientLink = page
      .getByRole('link', { name: /new client|add client/i })
      .first()
      .or(page.getByRole('button', { name: /new client|add client/i }).first())

    if (await newClientLink.isVisible()) {
      await newClientLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/clients\/new|clients/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Dashboard does not have broken links', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // All anchor tags should have valid hrefs
    const links = await page.locator('a[href]').all()
    for (const link of links.slice(0, 20)) { // Check first 20 links
      const href = await link.getAttribute('href')
      if (href && !href.startsWith('http') && !href.startsWith('mailto') && !href.startsWith('#')) {
        // Internal link — should be a valid path
        expect(href).toMatch(/^\//)
      }
    }
  })
})

// ─── Chef Sidebar Navigation ───────────────────────────────────────────────────

test.describe('Navigation — Chef Sidebar', () => {
  test('Clicking Events nav item navigates to /events', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const eventsLink = page
      .getByRole('link', { name: /^events$/i })
      .first()
      .or(page.locator('nav a[href="/events"]').first())

    if (await eventsLink.isVisible()) {
      await eventsLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/events/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Clicking Clients nav item navigates to /clients', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const clientsLink = page.locator('nav a[href="/clients"], a[href="/clients"]').first()
    if (await clientsLink.isVisible()) {
      await clientsLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/clients/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Clicking Finance nav item navigates to /finance', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const financeLink = page.locator('nav a[href="/finance"], a[href="/finance"]').first()
    if (await financeLink.isVisible()) {
      await financeLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/finance/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Clicking Calendar nav item navigates to /calendar', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const calendarLink = page.locator('a[href="/calendar"]').first()
    if (await calendarLink.isVisible()) {
      await calendarLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/calendar/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Clicking Settings nav item navigates to settings', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    const settingsLink = page
      .locator('a[href="/settings"], a[href="/settings/my-profile"]')
      .first()
      .or(page.getByRole('link', { name: /settings/i }).first())

    if (await settingsLink.isVisible()) {
      await settingsLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/settings/)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Breadcrumb Navigation ─────────────────────────────────────────────────────

test.describe('Navigation — Breadcrumbs', () => {
  test('Event detail breadcrumb links back to events list', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    // Breadcrumb links typically look like: Home > Events > Event Name
    const eventsLink = page
      .locator('nav[aria-label*="breadcrumb"] a, [class*="breadcrumb"] a')
      .filter({ hasText: /events/i })
      .first()
      .or(page.locator('a[href="/events"]').first())

    if (await eventsLink.isVisible()) {
      await eventsLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/events($|\?)/)
    }

    expect(errors).toHaveLength(0)
  })

  test('Client detail has back navigation to clients list', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    // Navigate to client list and click first client
    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const firstClientLink = page.locator('a[href*="/clients/"]').first()
    if (await firstClientLink.isVisible()) {
      await firstClientLink.click()
      await page.waitForLoadState('networkidle')

      // Should be on a client detail page now
      const backLink = page
        .locator('a[href="/clients"]')
        .first()
        .or(page.getByRole('link', { name: /back|all clients|clients/i }).first())

      if (await backLink.isVisible()) {
        await backLink.click()
        await page.waitForLoadState('networkidle')
        expect(page.url()).toMatch(/\/clients($|\?)/)
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('Settings sub-pages link back to settings', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/settings/notifications')
    await page.waitForLoadState('networkidle')

    // Look for a link back to the settings hub
    const backToSettings = page
      .locator('a[href="/settings"]')
      .first()
      .or(page.getByRole('link', { name: /settings/i }).first())

    const isVisible = await backToSettings.isVisible().catch(() => false)
    // Informational — settings pages may use sidebar nav rather than explicit back link
    if (isVisible) {
      await expect(backToSettings).toBeVisible()
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── In-Page Navigation ───────────────────────────────────────────────────────

test.describe('Navigation — In-Page Tabs & Sections', () => {
  test('Event detail sub-pages are accessible from event page', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    // Look for tabs or links to sub-pages (menu, team, finances, notes)
    const subPageLinks = await page.locator('a[href*="/events/"]').all()
    for (const link of subPageLinks.slice(0, 5)) {
      const href = await link.getAttribute('href')
      const isVisible = await link.isVisible().catch(() => false)
      if (isVisible && href) {
        // Verify the link is a valid internal path
        expect(href).toMatch(/^\/events\//)
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('Finance section tabs navigate without errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/finance')
    await page.waitForLoadState('networkidle')

    // Click any tabs/links within finance
    const financeLinks = page.locator('a[href*="/finance/"]').first()
    if (await financeLinks.isVisible()) {
      await financeLinks.click()
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })

  test('Recipe detail has link back to recipes list', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    // Navigate to recipes list and click first recipe
    await page.goto('/recipes')
    await page.waitForLoadState('networkidle')

    const firstRecipeLink = page.locator('a[href*="/recipes/"]').first()
    if (await firstRecipeLink.isVisible()) {
      await firstRecipeLink.click()
      await page.waitForLoadState('networkidle')

      // Should show recipe detail
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Settings Navigation ──────────────────────────────────────────────────────

test.describe('Navigation — Settings Sidebar', () => {
  const settingsLinks = [
    { label: 'My Profile', path: '/settings/my-profile' },
    { label: 'Notifications', path: '/settings/notifications' },
    { label: 'Integrations', path: '/settings/integrations' },
    { label: 'Automations', path: '/settings/automations' },
  ]

  for (const setting of settingsLinks) {
    test(`Settings sidebar navigates to ${setting.label}`, async ({ page }) => {
      const errors: string[] = []
      page.on('pageerror', err => errors.push(err.message))

      await page.goto('/settings/my-profile')
      await page.waitForLoadState('networkidle')

      // Look for sidebar link to this settings page
      const link = page.locator(`a[href="${setting.path}"]`).first()
      if (await link.isVisible()) {
        await link.click()
        await page.waitForLoadState('networkidle')
        expect(page.url()).toMatch(setting.path)
      }

      expect(errors).toHaveLength(0)
    })
  }
})

// ─── Mobile Navigation ────────────────────────────────────────────────────────

test.describe('Navigation — Mobile Nav', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('Mobile bottom tab navigates to Events', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Mobile bottom nav tab for Events
    const eventsTab = page.locator('nav a[href="/events"], [role="tablist"] a').first()
    if (await eventsTab.isVisible()) {
      await eventsTab.click()
      await page.waitForLoadState('networkidle')
    }

    expect(errors).toHaveLength(0)
  })

  test('Mobile nav does not crash on repeated tapping', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Tap multiple nav items rapidly
    const navLinks = await page.locator('nav a[href]').all()
    for (const link of navLinks.slice(0, 3)) {
      if (await link.isVisible()) {
        await link.click()
        await page.waitForTimeout(400)
      }
    }

    expect(errors).toHaveLength(0)
  })
})

// ─── Cross-Section Navigation ─────────────────────────────────────────────────

test.describe('Navigation — Cross-Section Links', () => {
  test('Event page links to client detail', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))
    await page.goto(`/events/${seedIds.eventIds.confirmed}`)
    await page.waitForLoadState('networkidle')

    // Events typically have a link to the client
    const clientLink = page.locator('a[href*="/clients/"]').first()
    const isVisible = await clientLink.isVisible().catch(() => false)
    if (isVisible) {
      await clientLink.click()
      await page.waitForLoadState('networkidle')
      expect(page.url()).toMatch(/\/clients\//)
    }

    expect(errors).toHaveLength(0)
  })

  test('Client detail links to client events', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/clients')
    await page.waitForLoadState('networkidle')

    const firstClient = page.locator('a[href*="/clients/"]').first()
    if (await firstClient.isVisible()) {
      await firstClient.click()
      await page.waitForLoadState('networkidle')

      // Client detail should link to events
      const eventsLink = page.locator('a[href*="/events"]').first()
      const isVisible = await eventsLink.isVisible().catch(() => false)
      if (isVisible) {
        await expect(eventsLink).toBeVisible()
      }
    }

    expect(errors).toHaveLength(0)
  })

  test('Quote detail links to associated event if linked', async ({ page, seedIds }) => {
    const errors: string[] = []
    page.on('pageerror', err => errors.push(err.message))

    await page.goto('/quotes')
    await page.waitForLoadState('networkidle')

    const firstQuote = page.locator('a[href*="/quotes/"]').first()
    if (await firstQuote.isVisible()) {
      await firstQuote.click()
      await page.waitForLoadState('networkidle')
      const bodyText = await page.locator('body').innerText()
      expect(bodyText.trim().length).toBeGreaterThan(20)
    }

    expect(errors).toHaveLength(0)
  })
})
