import { defineConfig } from '@playwright/test'

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const WEB_SERVER_COMMAND = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npx next start -p 3100'
const RUN_ID = process.env.PLAYWRIGHT_RUN_ID || `pw-release-${process.pid}-${Date.now()}`
const OUTPUT_DIR = process.env.PLAYWRIGHT_OUTPUT_DIR || `test-results/${RUN_ID}`
const REUSE_EXISTING_SERVER = envFlag(process.env.PLAYWRIGHT_REUSE_SERVER, false)

export default defineConfig({
  testDir: './tests',
  outputDir: OUTPUT_DIR,
  testMatch: ['**/smoke/**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  globalSetup: './tests/helpers/global-setup.ts',
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'smoke',
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
  ],
  webServer: {
    // Release smoke must run against a production server, not next dev.
    command: WEB_SERVER_COMMAND,
    url: BASE_URL,
    reuseExistingServer: REUSE_EXISTING_SERVER,
    timeout: 120_000,
    env: {
      ...process.env,
      DISABLE_AUTH_RATE_LIMIT_FOR_E2E: 'true',
    },
  },
})
