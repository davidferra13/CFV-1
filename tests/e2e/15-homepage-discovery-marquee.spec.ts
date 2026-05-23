import { expect, test, type Page } from '@playwright/test'

const DISCOVERY_NAV_NAME =
  /browse by cuisine, cravings, service, or occasion|browse by taste, occasion, and chefflow picks/i
const USER_LOCATION_STORAGE_KEY = 'chefflow.user-location'

const savedLocation = {
  query: 'Miami, FL',
  city: 'Miami',
  state: 'FL',
  zip: null,
  lat: 25.7617,
  lng: -80.1918,
  displayLabel: 'Miami, FL',
  savedAt: '2026-05-12T00:00:00.000Z',
}

async function openHomepageWithDiscovery(page: Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 60_000 })
  const discoveryNav = page.getByRole('navigation', { name: DISCOVERY_NAV_NAME })

  try {
    await expect(discoveryNav).toBeVisible({ timeout: 15_000 })
  } catch {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
    await expect(discoveryNav).toBeVisible({ timeout: 15_000 })
  }
  await expect(discoveryNav).toHaveAttribute('data-discovery-hydrated', 'true', {
    timeout: 15_000,
  })

  return discoveryNav
}

test.describe('Homepage discovery marquee', () => {
  test.setTimeout(90_000)

  test('loads the discovery navigation rows on the homepage', async ({ page }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)
    await expect(page.getByRole('heading', { name: /book a private chef near you/i })).toBeVisible()
    await expect(
      page.getByText('Search by place and service, then compare live profiles in the directory.')
    ).toBeVisible()
    await expect(page.getByRole('link', { name: /^taste cuisines and cravings/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /^market peak ingredients/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /browse chefs near you/i })).toBeVisible()
    await expect(page.getByRole('button', { name: /discovery details/i })).toBeVisible()
    await expect(page.getByRole('heading', { name: /from search to table/i })).toHaveCount(0)
    await expect(discoveryNav).toHaveAttribute('data-public-discovery-renderer', 'CuisineMarquee')
    await expect(discoveryNav).toHaveAttribute(
      'data-public-discovery-status',
      'canonical_public_homepage_rail'
    )
    await expect(discoveryNav.locator('[data-discovery-row="cuisine"]')).toBeVisible()
    await expect(discoveryNav.locator('[data-discovery-row="craving"]')).toHaveCount(0)
    await expect(discoveryNav.locator('[data-discovery-row="intent"]')).toHaveCount(0)
    await expect(discoveryNav.getByRole('link', { name: /italian/i }).first()).toBeVisible()
    await expect(discoveryNav.getByRole('link', { name: /private dinner/i }).first()).toBeVisible()
    await expect(discoveryNav.locator('[data-discovery-source]').first()).toBeVisible()

    const seasonalTop = await page.locator('.zone-seasonal').evaluate((el) => {
      return Math.round(el.getBoundingClientRect().top)
    })
    const viewportHeight = await page.evaluate(() => window.innerHeight)
    expect(seasonalTop).toBeLessThan(viewportHeight)
  })

  test('discovery info quick-view preserves help and booking destinations', async ({ page }) => {
    await openHomepageWithDiscovery(page)

    await page.getByRole('button', { name: /discovery details/i }).click()
    const quickView = page.locator('#homepage-discovery-info')
    await expect(quickView.getByText('How ChefFlow discovery works')).toBeVisible()
    await expect(quickView.getByRole('link', { name: /^How it works/i })).toHaveAttribute(
      'href',
      '/how-it-works'
    )
    await expect(quickView.getByRole('link', { name: /^FAQ/i })).toHaveAttribute('href', '/faq')
    await expect(quickView.getByRole('link', { name: /^Browse chefs/i })).toHaveAttribute(
      'href',
      '/chefs'
    )
    await expect(quickView.getByRole('link', { name: /^Book/i })).toHaveAttribute('href', '/book')

    await page.getByText('Hide discovery details').click()
    await expect(quickView).toBeHidden()
  })

  test('mobile viewport exposes the Discover row with services and occasions', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })

    const discoveryNav = await openHomepageWithDiscovery(page)
    const compactRow = discoveryNav.locator('[data-discovery-row="cuisine"]')

    await expect(compactRow).toBeVisible()
    await expect(discoveryNav.locator('[data-discovery-row="mobile"]')).toHaveCount(0)
    await expect(discoveryNav.locator('[data-discovery-row="craving"]')).toBeHidden()
    await expect(discoveryNav.locator('[data-discovery-row="intent"]')).toBeHidden()

    await expect(compactRow).toContainText(/private dinner|catering|meal prep/i)
    await expect(
      compactRow.getByRole('link', { name: /date night|birthday dinner|dinner party/i }).first()
    ).toBeAttached()
  })

  test('saved initial location is attached to discovery links', async ({
    baseURL,
    context,
    page,
  }) => {
    const origin = new URL(baseURL ?? 'http://localhost:3100').origin

    await context.addCookies([
      {
        name: 'cf-loc',
        value: encodeURIComponent(JSON.stringify(savedLocation)),
        url: origin,
        sameSite: 'Lax',
      },
    ])
    await page.addInitScript(
      ({ key, location }) => {
        window.localStorage.setItem(key, JSON.stringify(location))
      },
      { key: USER_LOCATION_STORAGE_KEY, location: savedLocation }
    )

    const discoveryNav = await openHomepageWithDiscovery(page)

    const locationAwareHrefs = await discoveryNav
      .locator('a.discovery-pill:not([aria-hidden="true"])')
      .evaluateAll((links) =>
        links
          .map((link) => (link as HTMLAnchorElement).href)
          .filter((href) => {
            const url = new URL(href)
            return (
              ['/chefs', '/nearby', '/eat'].includes(url.pathname) &&
              url.searchParams.get('location') === 'Miami, FL'
            )
          })
      )

    expect(locationAwareHrefs.length).toBeGreaterThan(0)
  })

  test('duplicate marquee clones are hidden from keyboard focus', async ({ page }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)

    const cloneStates = await discoveryNav
      .locator('a.discovery-pill[aria-hidden="true"]')
      .evaluateAll((links) =>
        links.map((link) => ({
          text: link.textContent?.trim() ?? '',
          tabIndex: (link as HTMLAnchorElement).tabIndex,
          ariaHidden: link.getAttribute('aria-hidden'),
        }))
      )

    test.skip(cloneStates.length === 0, 'No duplicate marquee clones are inspectable in this DOM')

    expect(cloneStates.every((state) => state.ariaHidden === 'true')).toBe(true)
    expect(cloneStates.every((state) => state.tabIndex === -1)).toBe(true)
  })

  test('horizontal input scrolls the discovery row and hands back to marquee momentum', async ({
    page,
  }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)
    const cuisineRow = discoveryNav.locator('[data-discovery-row="cuisine"]')

    await expect(cuisineRow).toBeVisible()
    await expect(discoveryNav).toHaveAttribute('data-discovery-hydrated', 'true')

    await cuisineRow.evaluate((row) => row.scrollTo({ left: 0, behavior: 'auto' }))
    await cuisineRow.hover()
    const startScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)
    await page.mouse.wheel(240, 0)
    await page.waitForTimeout(100)
    let afterInputScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)
    if (afterInputScrollLeft <= startScrollLeft) {
      await cuisineRow.evaluate((row) => {
        row.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            cancelable: true,
            deltaX: 240,
            deltaY: 0,
          })
        )
      })
      await page.waitForTimeout(100)
      afterInputScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)
    }

    expect(afterInputScrollLeft).toBeGreaterThan(startScrollLeft)

    await page.waitForTimeout(2_350)
    const resumedStartScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)
    await page.waitForTimeout(500)
    const resumedEndScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(resumedEndScrollLeft).toBeGreaterThan(resumedStartScrollLeft)
  })

  test('cuisine pills can be selected while the rail keeps moving before continuing', async ({
    page,
  }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)
    const cuisineRow = discoveryNav.locator('[data-discovery-row="cuisine"]')

    await expect(cuisineRow).toBeVisible()
    await expect(discoveryNav).toHaveAttribute('data-discovery-hydrated', 'true')
    await cuisineRow.evaluate((row) => row.scrollTo({ left: 0, behavior: 'auto' }))

    const italian = discoveryNav
      .locator('a.discovery-pill:not([aria-hidden="true"])')
      .filter({ hasText: 'Italian' })
      .first()
    await italian.evaluate((element) => (element as HTMLAnchorElement).click())

    await expect(page).toHaveURL(/\/$/)
    await expect(italian).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByRole('link', { name: /continue with 1 selection/i })).toBeVisible()

    const afterSelectScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)
    await page.mouse.move(20, 20)
    await page.waitForTimeout(2_350)
    const resumedScrollLeft = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(resumedScrollLeft).toBeGreaterThan(afterSelectScrollLeft)
    await expect(page.getByRole('link', { name: /continue with 1 selection/i })).toHaveAttribute(
      'href',
      /\/chefs\?cuisine=italian/
    )
  })

  test('single auto-scroll toggle pauses all rows while preserving manual movement', async ({
    page,
  }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)
    const cuisineRow = discoveryNav.locator('[data-discovery-row="cuisine"]')
    const pauseButton = page.getByRole('button', { name: /pause discovery rail auto-scroll/i })

    await expect(cuisineRow).toBeVisible()
    await expect(pauseButton).toBeVisible()
    await discoveryNav.scrollIntoViewIfNeeded()
    await page.mouse.move(20, 20)

    await cuisineRow.evaluate((row) => row.scrollTo({ left: 0, behavior: 'auto' }))
    await expect
      .poll(() => cuisineRow.evaluate((row) => row.scrollLeft), { timeout: 5_000 })
      .toBeGreaterThan(0)

    await pauseButton.click()
    await expect(
      page.getByRole('button', { name: /resume discovery rail auto-scroll/i })
    ).toHaveAttribute('aria-pressed', 'true')

    const pausedStart = await cuisineRow.evaluate((row) => row.scrollLeft)
    await page.waitForTimeout(500)
    const pausedEnd = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(Math.abs(pausedEnd - pausedStart)).toBeLessThanOrEqual(1)

    await cuisineRow.hover()
    await page.mouse.wheel(220, 0)
    await page.waitForTimeout(100)
    const manualEnd = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(manualEnd).toBeGreaterThan(pausedEnd)

    await page.mouse.move(20, 20)
    await page.getByRole('button', { name: /resume discovery rail auto-scroll/i }).click()
    await page.waitForTimeout(2_350)
    const resumedEnd = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(resumedEnd).toBeGreaterThan(manualEnd)
  })

  test('touch fling keeps the discovery row moving after release', async ({
    browserName,
    page,
  }) => {
    test.skip(browserName !== 'chromium', 'PointerEvent touch verification is Chromium-only')

    await page.setViewportSize({ width: 390, height: 844 })
    const discoveryNav = await openHomepageWithDiscovery(page)
    const cuisineRow = discoveryNav.locator('[data-discovery-row="cuisine"]')

    await expect(cuisineRow).toBeVisible()

    await cuisineRow.evaluate((row) => row.scrollTo({ left: 0, behavior: 'auto' }))

    const box = await cuisineRow.boundingBox()
    expect(box).not.toBeNull()
    if (!box) return

    const y = Math.round(box.y + box.height / 2)
    const startX = Math.round(box.x + Math.min(box.width - 24, 330))

    await cuisineRow.evaluate(
      (row, point) => {
        row.dispatchEvent(
          new PointerEvent('pointerdown', {
            bubbles: true,
            cancelable: true,
            clientX: point.startX,
            clientY: point.y,
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons: 1,
          })
        )
      },
      { startX, y }
    )
    for (const x of [startX - 42, startX - 104, startX - 178, startX - 244]) {
      await cuisineRow.evaluate(
        (row, point) => {
          row.dispatchEvent(
            new PointerEvent('pointermove', {
              bubbles: true,
              cancelable: true,
              clientX: point.x,
              clientY: point.y,
              pointerId: 1,
              pointerType: 'touch',
              isPrimary: true,
              button: 0,
              buttons: 1,
            })
          )
        },
        { x, y }
      )
      await page.waitForTimeout(16)
    }

    const atRelease = await cuisineRow.evaluate((row) => row.scrollLeft)
    await cuisineRow.evaluate(
      (row, point) => {
        row.dispatchEvent(
          new PointerEvent('pointerup', {
            bubbles: true,
            cancelable: true,
            clientX: point.x,
            clientY: point.y,
            pointerId: 1,
            pointerType: 'touch',
            isPrimary: true,
            button: 0,
            buttons: 0,
          })
        )
      },
      { x: startX - 244, y }
    )
    await page.waitForTimeout(180)
    const afterMomentum = await cuisineRow.evaluate((row) => row.scrollLeft)

    expect(atRelease).toBeGreaterThan(16)
    expect(afterMomentum).toBeGreaterThan(atRelease + 16)
  })

  test('discovery rail exposes public read-only items only', async ({ page }) => {
    const discoveryNav = await openHomepageWithDiscovery(page)

    const visibleText = await discoveryNav
      .locator('a.discovery-pill:not([aria-hidden="true"])')
      .evaluateAll((links) => links.map((link) => link.textContent?.trim() ?? '').join(' '))

    expect(visibleText).not.toMatch(/\b(client|invoice|quote|event id|internal|private note)\b/i)
  })
})
