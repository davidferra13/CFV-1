import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/qa-inbox-callsheet.spec.ts'],
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
  },
  reporter: 'line',
})
