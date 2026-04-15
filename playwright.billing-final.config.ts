import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests',
  testMatch: ['**/billing-final-check.spec.ts'],
  workers: 1,
  fullyParallel: false,
  use: { baseURL: 'http://localhost:3000', headless: true, screenshot: 'on' },
  projects: [{ name: 'final', testMatch: ['**/billing-final-check.spec.ts'] }],
  webServer: {
    command: 'echo "running"',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 5000,
  },
})
