import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const BASE = 'http://localhost:3100'

function getCredentials() {
  const authPath = path.join(process.cwd(), '.auth', 'agent.json')
  if (fs.existsSync(authPath)) {
    const parsed = JSON.parse(fs.readFileSync(authPath, 'utf8'))
    return { email: parsed.email as string, password: parsed.password as string }
  }
  return {
    email: process.env.AGENT_EMAIL ?? 'agent@local.chefflow',
    password: process.env.AGENT_PASSWORD ?? '',
  }
}

test('P0: sign in and reach dashboard', async ({ page }) => {
  const { email, password } = getCredentials()
  await page.goto(`${BASE}/auth/signin`)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await expect(page).toHaveURL(/\/dashboard/)
})

test('P0: events page loads', async ({ page }) => {
  const { email, password } = getCredentials()
  await page.goto(`${BASE}/auth/signin`)
  await page.fill('input[name="email"]', email)
  await page.fill('input[name="password"]', password)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 15000 })
  await page.goto(`${BASE}/events`)
  await expect(page.locator('h1')).toBeVisible()
})
