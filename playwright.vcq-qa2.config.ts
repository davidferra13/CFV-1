import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/diagnostic',
  testMatch: ['**/vcq-vendor-call-queue.spec.ts'],
  workers: 1,
  fullyParallel: false,
  // No globalSetup - bypass seeding
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
    storageState: '.auth/agent-storage.json',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },
  projects: [
    {
      name: 'vcq-test',
      testMatch: ['**/vcq-vendor-call-queue.spec.ts'],
      use: { storageState: '.auth/agent-storage.json' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
