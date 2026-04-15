import { test } from '@playwright/test'
import * as fs from 'fs'

const BASE_URL = 'http://localhost:3100'

test('Refresh agent auth state', async ({ page }) => {
  // Sign in fresh via the e2e auth endpoint
  const resp = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
    timeout: 90_000,
  })
  console.log('[AUTH_STATUS]', resp.status())
  const body = await resp.json()
  console.log('[AUTH_BODY]', JSON.stringify(body))

  // Navigate to dashboard to confirm session works
  await page.goto(`${BASE_URL}/dashboard`, { timeout: 60000 })
  console.log('[AFTER_DASH_URL]', page.url())

  // Save storage state
  await page.context().storageState({ path: '.auth/agent-storage-fresh.json' })
  console.log('[SAVED] .auth/agent-storage-fresh.json')
})
