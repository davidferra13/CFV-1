import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/receipt-upload-qa.spec.ts'],
  workers: 1,
  fullyParallel: false,
  timeout: 150000,
  use: {
    baseURL: 'http://localhost:3100',
    headless: true,
    screenshot: 'on',
    trace: 'on',
    storageState: '.auth/agent-storage-fresh.json',
  },
  webServer: {
    command: 'echo "server already running"',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 10000,
  },
})
