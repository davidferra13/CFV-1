// Playwright E2E Test Configuration
// Adapted from legacy BillyBob8 patterns for Next.js + Supabase
//
// CANONICAL RULE: Base URL is always http://localhost:3100
// This matches package.json "dev": "next dev -p 3100"
//
// Projects:
//   smoke  — unauthenticated, no globalSetup dependency (tests/smoke/)
//   chef   — chef role, uses .auth/chef.json (tests/e2e/01-13)
//   client — client role, uses .auth/client.json (tests/e2e/14)
//   public — no auth, public-facing pages (tests/e2e/15)

import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  // Single worker — prevents state leaks between tenant-scoped tests
  workers: 1,
  // Sequential — ensures tests run in deterministic order
  fullyParallel: false,
  // Runs once before all tests: seeds data, logs in, saves auth state
  globalSetup: './tests/helpers/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Smoke tests — no auth required, no dependency on seed data
    // Run these first: npm run test:e2e:smoke
    {
      name: 'smoke',
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
    // Chef portal tests — authenticated as test chef
    {
      name: 'chef',
      testMatch: [
        '**/e2e/0[1-9]-*.spec.ts',
        '**/e2e/1[0-3]-*.spec.ts',
      ],
      use: {
        storageState: '.auth/chef.json',
      },
    },
    // Client portal tests — authenticated as test client
    {
      name: 'client',
      testMatch: ['**/e2e/14-*.spec.ts'],
      use: {
        storageState: '.auth/client.json',
      },
    },
    // Public pages — no auth
    {
      name: 'public',
      testMatch: ['**/e2e/15-*.spec.ts'],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
