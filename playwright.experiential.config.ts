// Experiential Verification Config
//
// Tests that walk critical user journeys end-to-end, screenshotting every
// transition point. Catches blank screens, missing loading states, broken
// layouts, and disconnected UX signals that type checks and builds miss.
//
// Run: npm run test:experiential
// Run (headed): npm run test:experiential:headed

import { defineConfig } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const RUN_ID = process.env.PLAYWRIGHT_RUN_ID || `exp-${Date.now()}`
const OUTPUT_DIR = `test-results/experiential/${RUN_ID}`

export default defineConfig({
  testDir: './tests/experiential',
  outputDir: OUTPUT_DIR,
  testMatch: ['**/*.spec.ts'],
  // Sequential - flows depend on state from previous steps
  workers: 1,
  fullyParallel: false,
  // Skip globalSetup - we use .auth/chef.json and .auth/agent.json directly
  // (requires seed data to exist already)
  timeout: 120_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL: BASE_URL,
    headless: true,
    // Screenshot EVERY state, not just failures
    screenshot: 'on',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    // Consistent viewport for screenshot comparison
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      name: 'exp-auth-chef',
      testMatch: ['01-signin-chef.spec.ts'],
      // No storageState - tests the sign-in flow itself
    },
    {
      name: 'exp-auth-client',
      testMatch: ['02-signin-client.spec.ts'],
      // No storageState - tests the sign-in flow itself
    },
    {
      name: 'exp-chef-navigation',
      testMatch: ['03-chef-navigation.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'exp-inquiry-to-event',
      testMatch: ['04-inquiry-to-event.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'exp-event-lifecycle',
      testMatch: ['05-event-lifecycle.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'exp-client-portal',
      testMatch: ['06-client-portal.spec.ts'],
      use: { storageState: '.auth/client.json' },
    },
    {
      name: 'exp-cross-boundary',
      testMatch: ['07-cross-boundary-transitions.spec.ts'],
      // No storageState - tests boundary crossings with fresh contexts
    },
    {
      name: 'exp-loading-states',
      testMatch: ['08-loading-state-audit.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
    {
      name: 'exp-error-states',
      testMatch: ['09-error-state-audit.spec.ts'],
      use: { storageState: '.auth/chef.json' },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      ...process.env,
      DISABLE_AUTH_RATE_LIMIT_FOR_E2E: 'true',
    },
  },
})
