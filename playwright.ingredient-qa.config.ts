import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/ingredient-sourceability-qa.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'off',
  },
  globalSetup: undefined,
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 120000,
  },
})
