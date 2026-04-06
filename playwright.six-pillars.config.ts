import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: ['tests/six-pillars-walkthrough.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://127.0.0.1:3100',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://127.0.0.1:3100',
    reuseExistingServer: true,
    timeout: 120000,
    // Override NEXTAUTH_URL for local testing so Auth.js uses non-Secure cookies
    // (browser won't send __Secure- cookies over http://)
    env: {
      NEXTAUTH_URL: 'http://127.0.0.1:3100',
    },
  },
})
