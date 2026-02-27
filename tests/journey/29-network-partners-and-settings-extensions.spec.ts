// Journey Tests - Network, Partners, and Settings Extensions
// Adds route checks for network/community surfaces, partner operations,
// guest reservation pages, and extended settings endpoints.
//
// Scenarios: #455-470
//
// Run: npx playwright test --project=journey-chef tests/journey/29-network-partners-and-settings-extensions.spec.ts

import { test, expect } from '../helpers/fixtures'
import {
  assertPageLoads,
  assertNoPageErrors,
  assertPageHasContent,
  JOURNEY_ROUTES,
} from './helpers/journey-helpers'

test.describe('Network and Community Routes (#455-459)', () => {
  test('network route loads (#455)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.network)
  })

  test('network saved route loads (#456)', async ({ page }) => {
    await assertPageLoads(page, '/network/saved')
  })

  test('network notifications route loads (#457)', async ({ page }) => {
    await assertPageLoads(page, '/network/notifications')
  })

  test('community templates route has no page errors (#458)', async ({ page }) => {
    await assertNoPageErrors(page, JOURNEY_ROUTES.communityTemplates)
  })

  test('network saved route has content (#459)', async ({ page }) => {
    await page.goto('/network/saved')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Partners and Guests Routes (#460-465)', () => {
  test('partners route loads (#460)', async ({ page }) => {
    await assertPageLoads(page, JOURNEY_ROUTES.partners)
  })

  test('active partners route loads (#461)', async ({ page }) => {
    await assertPageLoads(page, '/partners/active')
  })

  test('inactive partners route loads (#462)', async ({ page }) => {
    await assertPageLoads(page, '/partners/inactive')
  })

  test('new partner route loads (#463)', async ({ page }) => {
    await assertPageLoads(page, '/partners/new')
  })

  test('partner referral-performance route loads (#464)', async ({ page }) => {
    await assertPageLoads(page, '/partners/referral-performance')
  })

  test('guest reservations route has content (#465)', async ({ page }) => {
    await page.goto('/guests/reservations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Settings Extension Routes (#466-470)', () => {
  test('settings client-preview route loads (#466)', async ({ page }) => {
    await assertPageLoads(page, '/settings/client-preview')
  })

  test('settings culinary-profile route loads (#467)', async ({ page }) => {
    await assertPageLoads(page, '/settings/culinary-profile')
  })

  test('settings favorite-chefs route loads (#468)', async ({ page }) => {
    await assertPageLoads(page, '/settings/favorite-chefs')
  })

  test('settings highlights route loads (#469)', async ({ page }) => {
    await assertPageLoads(page, '/settings/highlights')
  })

  test('settings health route has content (#470)', async ({ page }) => {
    await page.goto('/settings/health')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })
})

test.describe('Additional Uncovered Routes (#471-475)', () => {
  test('network profile route loads with seeded chef id (#471)', async ({ page, seedIds }) => {
    await page.goto(`/network/${seedIds.chefId}`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('goals revenue-path route loads (#472)', async ({ page }) => {
    await assertPageLoads(page, '/goals/revenue-path')
  })

  test('finance sales-tax route loads (#473)', async ({ page }) => {
    await assertPageLoads(page, '/finance/sales-tax')
  })

  test('event guest-card route loads for confirmed seeded event (#474)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/events/${seedIds.eventIds.confirmed}/guest-card`)
    await page.waitForLoadState('networkidle')
    expect(page.url()).not.toMatch(/auth\/signin/)
  })

  test('help article route loads from first help link when present (#475)', async ({ page }) => {
    await page.goto('/help')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const firstHelpLink = page.locator('a[href^="/help/"]').first()
    const hasHelpLink = (await firstHelpLink.count()) > 0
    if (!hasHelpLink) return

    await firstHelpLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Additional Dynamic Route Coverage (#486-490)', () => {
  test('goal history route is reachable from goals list (#486)', async ({ page }) => {
    await page.goto('/goals')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const historyLink = page
      .locator('a[href*="/goals/"][href*="/history"]')
      .first()
      .or(page.locator('a[href*="/goals/"]').first())
    const hasHistoryLink = (await historyLink.count()) > 0
    if (!hasHistoryLink) return

    await historyLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('staff detail route is reachable from staff list (#487)', async ({ page }) => {
    await page.goto('/staff')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const staffLink = page.locator('a[href^="/staff/"]').first()
    const hasStaffLink = (await staffLink.count()) > 0
    if (!hasStaffLink) return

    await staffLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('station detail route is reachable from stations list (#488)', async ({ page }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const stationLink = page.locator('a[href^="/stations/"]').first()
    const hasStationLink = (await stationLink.count()) > 0
    if (!hasStationLink) return

    await stationLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('station clipboard route is reachable from station detail (#489)', async ({ page }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const stationLink = page.locator('a[href^="/stations/"]').first()
    if ((await stationLink.count()) === 0) return
    await stationLink.click()
    await page.waitForLoadState('networkidle')

    const clipboardLink = page
      .locator('a[href*="/clipboard"]')
      .first()
      .or(page.locator('a[href$="/clipboard"]').first())
    if ((await clipboardLink.count()) === 0) return

    await clipboardLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('vendor detail route is reachable from vendors list (#490)', async ({ page }) => {
    await page.goto('/vendors')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const vendorLink = page.locator('a[href^="/vendors/"]').first()
    if ((await vendorLink.count()) === 0) return

    await vendorLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Partner Dynamic Coverage (#500)', () => {
  test('partner detail/edit routes are reachable from partners list (#500)', async ({ page }) => {
    await page.goto('/partners')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const partnerLink = page.locator('a[href^="/partners/"]').first()
    if ((await partnerLink.count()) === 0) return

    await partnerLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)

    const editLink = page.locator('a[href$="/edit"]').first()
    if ((await editLink.count()) === 0) return

    await editLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Additional Settings Deep Routes (#501-503)', () => {
  test('settings incidents route loads (#501)', async ({ page }) => {
    await assertPageLoads(page, '/settings/incidents')
  })

  test('settings menu templates route loads (#502)', async ({ page }) => {
    await assertPageLoads(page, '/settings/menu-templates')
  })

  test('settings professional momentum route loads (#503)', async ({ page }) => {
    await assertPageLoads(page, '/settings/professional/momentum')
  })
})

test.describe('Additional Settings Deep Routes (#510)', () => {
  test('settings professional skills route loads (#510)', async ({ page }) => {
    await assertPageLoads(page, '/settings/professional/skills')
  })
})

test.describe('Additional Dynamic Coverage (#513-515)', () => {
  test('guest detail route is reachable from guest list (#513)', async ({ page }) => {
    await page.goto('/guests')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const guestLink = page.locator('a[href^="/guests/"]').first()
    if ((await guestLink.count()) === 0) return

    await guestLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('station clipboard print route is reachable from station detail (#514)', async ({
    page,
  }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const stationLink = page.locator('a[href^="/stations/"]').first()
    if ((await stationLink.count()) === 0) return

    await stationLink.click()
    await page.waitForLoadState('networkidle')

    const printLink = page.locator('a[href*="/clipboard/print"]').first()
    if ((await printLink.count()) === 0) return

    await printLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('network channel route is reachable from network page (#515)', async ({ page }) => {
    await page.goto('/network')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const channelLink = page.locator('a[href^="/network/channels/"]').first()
    if ((await channelLink.count()) === 0) return

    await channelLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Remaining Chef Route Literals (#516-519)', () => {
  test('dev simulate route loads (#516)', async ({ page }) => {
    await assertPageLoads(page, '/dev/simulate')
  })

  test('help article slug route loads (#517)', async ({ page }) => {
    await assertPageLoads(page, '/help/events')
  })

  test('settings journey detail redirect route loads with seeded id (#518)', async ({
    page,
    seedIds,
  }) => {
    await page.goto(`/settings/journey/${seedIds.eventIds.draft}`)
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    await assertPageHasContent(page)
  })

  test('/stations/[id]/clipboard route is reachable from stations list (#519)', async ({
    page,
  }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const stationLink = page.locator('a[href^="/stations/"]').first()
    if ((await stationLink.count()) === 0) return

    const href = await stationLink.getAttribute('href')
    if (!href) return

    const stationId = href.split('/')[2]
    if (!stationId) return

    await page.goto(`/stations/${stationId}/clipboard`)
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Remaining Dynamic Chef Route Literals (#520-522)', () => {
  test('/stations/[id]/clipboard/print route is reachable from stations list (#520)', async ({
    page,
  }) => {
    await page.goto('/stations')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const stationLink = page.locator('a[href^="/stations/"]').first()
    if ((await stationLink.count()) === 0) return

    const href = await stationLink.getAttribute('href')
    if (!href) return

    const stationId = href.split('/')[2]
    if (!stationId) return

    await page.goto(`/stations/${stationId}/clipboard/print`)
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('/inbox/triage/[threadId] route is reachable from inbox triage (#521)', async ({ page }) => {
    await page.goto('/inbox/triage')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const triageLink = page.locator('a[href^="/inbox/triage/"]').first()
    if ((await triageLink.count()) === 0) return

    await triageLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })

  test('/wix-submissions/[id] route is reachable from inbox links (#522)', async ({ page }) => {
    await page.goto('/inbox')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const wixLink = page.locator('a[href^="/wix-submissions/"]').first()
    if ((await wixLink.count()) === 0) return

    await wixLink.click()
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})

test.describe('Static Route Literal Closure (#523-527)', () => {
  test('commands route loads (#523)', async ({ page }) => {
    await assertPageLoads(page, '/commands')
  })

  test('remy history route loads (#524)', async ({ page }) => {
    await assertPageLoads(page, '/remy')
  })

  test('marketing push-dinners route loads (#525)', async ({ page }) => {
    await assertPageLoads(page, '/marketing/push-dinners')
  })

  test('testimonials route loads (#526)', async ({ page }) => {
    await assertPageLoads(page, '/testimonials')
  })

  test('unauthorized route loads (#527)', async ({ page }) => {
    await assertPageLoads(page, '/unauthorized')
  })
})

test.describe('Additional Static and Calls Coverage (#528-532)', () => {
  test('inventory demand route loads (#528)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/demand')
  })

  test('inventory expiry route loads (#529)', async ({ page }) => {
    await assertPageLoads(page, '/inventory/expiry')
  })

  test('settings billing route loads (#530)', async ({ page }) => {
    await assertPageLoads(page, '/settings/billing')
  })

  test('settings compliance haccp route loads (#531)', async ({ page }) => {
    await assertPageLoads(page, '/settings/compliance/haccp')
  })

  test('call edit route is reachable from calls list (#532)', async ({ page }) => {
    await page.goto('/calls')
    await page.waitForLoadState('networkidle')

    if (page.url().includes('auth/signin')) return

    const callLink = page.locator('a[href^="/calls/"]').first()
    if ((await callLink.count()) === 0) return

    const href = await callLink.getAttribute('href')
    if (!href) return

    const callId = href.split('/')[2]
    if (!callId) return

    await page.goto(`/calls/${callId}/edit`)
    await page.waitForLoadState('networkidle')
    await assertPageHasContent(page)
  })
})
