import { defineConfig } from '@playwright/test'

// This is invoked by the existing release runner for explicitly claimed capabilities.
// It reuses a previously authorized chef session and never seeds or resets production.
const baseURL = process.env.PLAYWRIGHT_BASE_URL
if (!baseURL) throw new Error('PLAYWRIGHT_BASE_URL is required for capability replay')

export default defineConfig({
  testDir: './tests/capability-proofs',
  testMatch: '**/*.spec.ts',
  workers: 1,
  fullyParallel: false,
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL,
    storageState: '.auth/chef.json',
    headless: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: 'desktop', use: { viewport: { width: 1365, height: 900 } } },
  ],
})
