// Playwright Stress Test Configuration
// Separate from main config — no global setup, no seeded data
// Stress tests use agent.json directly and test backpressure

import { defineConfig } from '@playwright/test'

const BASE_URL = 'http://localhost:3100'

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/stress/**/*.spec.ts'],
  timeout: 7_200_000, // 2 hours max for sustained tests (basic/high/failure are much shorter)
  workers: 1, // Sequential to avoid concurrent Ollama stress
  fullyParallel: false,
  // NO globalSetup — stress tests don't need seeded data
  use: {
    baseURL: BASE_URL,
    headless: true,
    storageState: '.auth/agent.json',
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
