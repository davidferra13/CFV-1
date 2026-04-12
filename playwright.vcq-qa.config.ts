import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/diagnostic',
  testMatch: ['**/vcq-vendor-call-queue.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
    actionTimeout: 15000,
    navigationTimeout: 45000,
  },
  projects: [
    {
      name: 'vcq-test',
      testMatch: ['**/vcq-vendor-call-queue.spec.ts'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
