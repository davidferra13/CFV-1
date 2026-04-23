import { test } from '../helpers/fixtures'
import routeInventory from '../helpers/route-inventory'
import { assertRolePageLoads } from './static-route-assertions'

const ROUTES = routeInventory.getStaticPageRoutesForRole('partner')

test.describe('Partner - Static Route Coverage', () => {
  test.describe.configure({ timeout: 240_000 })

  for (const route of ROUTES) {
    test(route, async ({ page }) => {
      await assertRolePageLoads(page, route, { role: 'partner' })
    })
  }
})
