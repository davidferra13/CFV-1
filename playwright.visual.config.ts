// Visual test config — for Remy sprite sheet and other visual tests
// No globalSetup needed — tests handle their own auth via /api/e2e/auth
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/visual',
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  globalSetup: undefined,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
