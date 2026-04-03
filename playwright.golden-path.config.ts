import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: [
    'tests/golden-path-qa.spec.ts',
    'tests/debug-recipe-save.spec.ts',
    'tests/debug-signin.spec.ts',
  ],
  workers: 1,
  fullyParallel: false,
  globalSetup: undefined,
  timeout: 60000,
  use: {
    baseURL: 'http://localhost:3100',
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
