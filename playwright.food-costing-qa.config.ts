import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/qa-food-costing-knowledge.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
    trace: 'on',
    storageState: '.auth/agent-fresh.json',
  },
  reporter: 'list',
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 30000,
  },
  outputDir: 'test-results/food-costing-qa',
})
