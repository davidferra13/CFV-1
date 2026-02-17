// Playwright E2E Test Configuration
// Adapted from legacy BillyBob8 patterns for Next.js + Supabase
//
// CANONICAL RULE: Base URL is always http://localhost:3100
// This matches package.json "dev": "next dev -p 3100"

import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  // Single worker — prevents state leaks between tenant-scoped tests
  workers: 1,
  // Sequential — ensures tests run in deterministic order
  fullyParallel: false,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
