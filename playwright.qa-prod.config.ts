import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  outputDir: 'test-results/qa-prod-pass',
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
    navigationTimeout: 90000,
    actionTimeout: 60000,
  },
  projects: [
    {
      name: 'qa-prod',
      testMatch: ['**/qa-prod-pass.spec.ts'],
      use: { storageState: '.auth/agent-storage-fresh.json' },
    },
  ],
})
