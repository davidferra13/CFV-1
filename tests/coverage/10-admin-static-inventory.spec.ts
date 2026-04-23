import { test } from '../helpers/fixtures'
import routeInventory from '../helpers/route-inventory'
import { assertRolePageLoads } from './static-route-assertions'

const ROUTES = routeInventory.getUncoveredStaticPageRoutesForRole('admin')
const ADMIN_AUTH_REQUIRED = process.env.COVERAGE_REQUIRE_ADMIN === 'true'
const ADMIN_MISSING_STATE_MESSAGE =
  'Admin credentials not configured - set ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD in .env.local'

test.describe('Admin - Static Inventory Coverage', () => {
  test.describe.configure({ timeout: 240_000 })

  for (const route of ROUTES) {
    test(route, async ({ page }) => {
      await assertRolePageLoads(page, route, {
        role: 'admin',
        storageStatePath: '.auth/admin.json',
        missingStateMessage: ADMIN_MISSING_STATE_MESSAGE,
        requireStorageState: ADMIN_AUTH_REQUIRED,
      })
    })
  }
})
