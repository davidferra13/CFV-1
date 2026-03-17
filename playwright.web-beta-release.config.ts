import { defineConfig } from '@playwright/test'

function envFlag(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback
  const normalized = value.trim().toLowerCase()
  return normalized === '1' || normalized === 'true' || normalized === 'yes'
}

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3111'
const WEB_SERVER_COMMAND = process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npx next start -p 3111'
const RUN_ID = process.env.PLAYWRIGHT_RUN_ID || `pw-web-beta-${process.pid}-${Date.now()}`
const OUTPUT_DIR = process.env.PLAYWRIGHT_OUTPUT_DIR || `test-results/${RUN_ID}`
const REUSE_EXISTING_SERVER = envFlag(process.env.PLAYWRIGHT_REUSE_SERVER, false)

export default defineConfig({
  testDir: './tests/release/web-beta',
  outputDir: OUTPUT_DIR,
  testMatch: ['**/*.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL: BASE_URL,
    headless: true,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Beta release smoke must run against a production build, not next dev.
    command: WEB_SERVER_COMMAND,
    url: BASE_URL,
    reuseExistingServer: REUSE_EXISTING_SERVER,
    timeout: 180_000,
    env: {
      ...process.env,
      NEXT_BUILD_SURFACE: process.env.NEXT_BUILD_SURFACE || 'web-beta',
      NEXT_PUBLIC_MARKETING_MODE: process.env.NEXT_PUBLIC_MARKETING_MODE || 'beta',
      NEXT_PUBLIC_RELEASE_PROFILE: process.env.NEXT_PUBLIC_RELEASE_PROFILE || 'web-beta',
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || BASE_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || BASE_URL,
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || `.next-web-beta-${RUN_ID}`,
      DISABLE_AUTH_RATE_LIMIT_FOR_E2E: 'true',
      PLAYWRIGHT_SKIP_AUTH_BOOTSTRAP: 'true',
    },
  },
})
