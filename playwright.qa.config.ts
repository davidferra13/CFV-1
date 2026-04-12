import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/qa-pass',
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    navigationTimeout: 120000,
    actionTimeout: 30000,
  },
  projects: [
    {
      name: 'qa-dev',
      testMatch: ['**/qa-comprehensive.spec.ts'],
      use: { storageState: '.auth/developer-storage.json' },
    },
  ],
})
