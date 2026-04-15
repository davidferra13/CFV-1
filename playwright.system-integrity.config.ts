/**
 * Playwright config for system-integrity tests only.
 * Uses .auth/chef.json (pre-existing auth state from main global setup).
 * Does NOT re-run global setup — assumes the dev server is already running.
 * Run: npx playwright test -c playwright.system-integrity.config.ts
 */
import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

export default defineConfig({
  testDir: './tests/system-integrity',
  outputDir: 'test-results/system-integrity',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  // No globalSetup — auth state is already in .auth/chef.json from main setup.
  // Run `npx playwright test --project=system-integrity` first to seed auth,
  // or sign in manually and save state.
  use: {
    baseURL: BASE_URL,
    headless: true,
    storageState: '.auth/chef.json',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  timeout: 60_000,
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
