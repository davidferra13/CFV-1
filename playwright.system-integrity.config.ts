/**
 * Playwright config for system-integrity tests only.
 * Uses .auth/chef.json (pre-existing auth state from main global setup).
 * Does NOT re-run global setup — assumes the dev server is already running.
 * Run: npx playwright test -c playwright.system-integrity.config.ts
 *
 * Timeout note: Next.js dev mode compiles pages on first access.
 * Cold compilation can take 30-60s per page. Test timeouts are set to 120s
 * to handle this. After the first run, subsequent runs will be faster.
 */
import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

export default defineConfig({
  testDir: './tests/system-integrity',
  outputDir: 'test-results/system-integrity',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 120_000,
  use: {
    baseURL: BASE_URL,
    headless: true,
    storageState: '.auth/chef.json',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    actionTimeout: 90_000,
    navigationTimeout: 90_000,
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
