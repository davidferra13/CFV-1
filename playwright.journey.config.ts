// Temporary config for running journey tests when dev server is already running.
// Inherits from main config but removes webServer to avoid EADDRINUSE on slow startups.

import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/journey/[0-2][0-9]-*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  globalSetup: './tests/helpers/global-setup.ts',
  timeout: 60_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'journey-chef',
      testMatch: ['**/journey/[0-2][0-9]-*.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
  ],
  // No webServer — assumes dev server is already running on port 3100
})
