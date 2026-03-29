import { defineConfig, devices } from '@playwright/test'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

// Sentinel tests target the prod site by default, dev server for local testing
const baseURL = process.env.SENTINEL_BASE_URL || 'http://localhost:3100'

export default defineConfig({
  testDir: './tests/sentinel',
  fullyParallel: false,
  forbidOnly: true,
  retries: 1, // One retry for network flakes
  workers: 1, // Sequential to minimize Pi resource usage
  reporter: [['list'], ['json', { outputFile: 'results/sentinel-report.json' }]],
  timeout: 120_000, // 2 min per test (generous for network latency)

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off', // Save disk on Pi
    // ARM64 Chromium stability flags
    launchOptions: {
      args: ['--disable-gpu', '--no-sandbox', '--disable-dev-shm-usage'],
    },
  },

  projects: [
    {
      name: 'sentinel-smoke',
      testMatch: /smoke\.spec\.ts/,
    },
    {
      name: 'sentinel-critical',
      testMatch: /critical-paths\.spec\.ts/,
    },
    {
      name: 'sentinel-data',
      testMatch: /data-verification\.spec\.ts/,
    },
    {
      name: 'sentinel-regression',
      testMatch: /regression\.spec\.ts/,
    },
  ],
})
