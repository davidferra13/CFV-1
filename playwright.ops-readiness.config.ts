import { defineConfig } from '@playwright/test'

export default defineConfig({
  testMatch: ['tests/ops-readiness.spec.ts'],
  use: {
    baseURL: 'http://localhost:3000',
    headless: true,
  },
  workers: 1,
  timeout: 60000,
  reporter: 'line',
})
