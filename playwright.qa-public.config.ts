import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/qa-public',
  workers: 1,
  fullyParallel: false,
  timeout: 40000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    navigationTimeout: 25000,
    actionTimeout: 15000,
  },
  projects: [
    {
      name: 'qa-public',
      testMatch: ['**/qa-public-routes.spec.ts'],
      // No storageState - unauthenticated
    },
  ],
})
