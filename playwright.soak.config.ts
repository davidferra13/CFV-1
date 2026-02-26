// Playwright config for soak tests ONLY.
// Uses a production build (next start) instead of dev server (next dev)
// because soak tests hammer pages hundreds of times and the dev server's
// on-demand compilation overhead causes false timeouts.
//
// Usage:
//   npm run test:soak        # full (100 iterations)
//   npm run test:soak:quick  # quick (10 iterations)

import { defineConfig } from '@playwright/test'

const SOAK_PORT = 3200
const SOAK_URL = `http://localhost:${SOAK_PORT}`

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/soak/**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  globalSetup: './tests/soak/soak-global-setup.ts',
  use: {
    baseURL: SOAK_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'soak',
      testMatch: ['**/soak/**/*.spec.ts'],
      use: {
        storageState: '.auth/chef.json',
        navigationTimeout: 30_000,
        actionTimeout: 15_000,
      },
      timeout: 600_000, // 10 min per test
    },
  ],
  webServer: {
    command: `npx next start -p ${SOAK_PORT}`,
    url: SOAK_URL,
    reuseExistingServer: true,
    timeout: 30_000, // production server starts fast
  },
})
