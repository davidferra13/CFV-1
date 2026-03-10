import { defineConfig } from '@playwright/test'

const DEFAULT_REMOTE_BASE_URL = 'https://beta.cheflowhq.com'
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || DEFAULT_REMOTE_BASE_URL
const ALLOW_LOCAL_TARGET = process.env.PLAYWRIGHT_ALLOW_LOCAL === 'true'
const IS_LOCAL_BASE_URL = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i.test(BASE_URL)

if (IS_LOCAL_BASE_URL && !ALLOW_LOCAL_TARGET) {
  throw new Error(
    `Local Playwright targets are disabled by default. Set PLAYWRIGHT_BASE_URL to ${DEFAULT_REMOTE_BASE_URL} or opt into localhost with PLAYWRIGHT_ALLOW_LOCAL=true.`
  )
}

export default defineConfig({
  testDir: '.',
  testMatch: 'critical-path.spec.ts',
  timeout: 30000,
  retries: 0,
  use: {
    baseURL: BASE_URL,
    storageState: '.auth/chef.json',
  },
  webServer: IS_LOCAL_BASE_URL
    ? {
        command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: true,
      }
    : undefined,
})
