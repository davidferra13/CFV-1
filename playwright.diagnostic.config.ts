// Playwright Diagnostic Config
// Lightweight config that skips globalSetup (uses existing .auth/ state)
// Run: npx playwright test --config=playwright.diagnostic.config.ts

import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests/diagnostic',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  // NO globalSetup — uses pre-existing .auth/chef.json from prior test runs
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    storageState: '.auth/chef.json',
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 30_000,
  },
  timeout: 30_000,
  expect: { timeout: 10_000 },
})
