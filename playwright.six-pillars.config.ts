import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: ['tests/six-pillars-walkthrough.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 60000,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3100',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
