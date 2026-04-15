import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/billing-costing-check.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'on',
  },
  projects: [{ name: 'check', testMatch: ['**/billing-costing-check.spec.ts'] }],
  webServer: {
    command: 'echo "already running"',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 5000,
  },
})
