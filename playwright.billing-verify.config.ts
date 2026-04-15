import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/billing-verify-standalone.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    screenshot: 'on',
    trace: 'off',
  },
  projects: [
    {
      name: 'billing-verify',
      testMatch: ['**/billing-verify-standalone.spec.ts'],
    },
  ],
  webServer: {
    command: 'echo "server already running"',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 10_000,
  },
})
