// E2E Test Fixtures
// Extends @playwright/test with a seedIds fixture that loads IDs from .auth/seed-ids.json
// All E2E spec files should import { test, expect } from '../helpers/fixtures'

import { test as base } from '@playwright/test'
import { readFileSync } from 'fs'
import type { SeedResult } from './e2e-seed'

type E2EFixtures = {
  seedIds: SeedResult
}

export const test = base.extend<E2EFixtures>({
  seedIds: async ({}, use) => {
    let ids: SeedResult
    try {
      const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
      ids = JSON.parse(raw) as SeedResult
    } catch (err) {
      throw new Error(
        '[fixtures] Could not read .auth/seed-ids.json.\n' +
          'Run `npm run seed:e2e` or `npx playwright test` (which runs globalSetup) first.\n' +
          String(err)
      )
    }
    await use(ids)
  },
})

export { expect } from '@playwright/test'
