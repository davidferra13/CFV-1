import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/qa-refresh-auth.spec.ts'],
  workers: 1,
  timeout: 120000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
  },
  reporter: 'line',
})
