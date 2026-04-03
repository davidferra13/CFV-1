import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

const BASE = 'http://localhost:3100'
const CREDS = { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' }
const SSDIR = 'test-results/debug-signin'

test('debug sign-in', async ({ page }) => {
  fs.mkdirSync(SSDIR, { recursive: true })

  const consoleMsgs: string[] = []
  const pageErrors: string[] = []
  page.on('console', (msg) => consoleMsgs.push(`[${msg.type()}] ${msg.text()}`))
  page.on('pageerror', (err) => pageErrors.push(err.message))

  await page.goto(BASE + '/auth/signin', { waitUntil: 'networkidle' })
  await page.screenshot({ path: path.join(SSDIR, '01-loaded.png') })

  // Check what getByLabel resolves to
  const emailLabel = page.getByLabel('Email')
  console.log('Email input count:', await emailLabel.count())

  await emailLabel.fill(CREDS.email)
  await page.screenshot({ path: path.join(SSDIR, '02-email-filled.png') })

  // Check value after fill
  const emailVal = await emailLabel.inputValue().catch(() => 'error')
  console.log('Email value after fill:', emailVal)

  await page.locator('input[type="password"]').first().fill(CREDS.password)

  const pwdVal = await page
    .locator('input[type="password"]')
    .first()
    .inputValue()
    .catch(() => 'error')
  console.log('Password value after fill:', pwdVal)

  await page.screenshot({ path: path.join(SSDIR, '03-both-filled.png') })

  // Click submit
  await page.getByRole('button', { name: /sign in/i }).click()

  // Wait a bit and screenshot
  await page.waitForTimeout(3000)
  await page.screenshot({ path: path.join(SSDIR, '04-after-click.png') })

  console.log('Current URL:', page.url())

  // Check for error message
  const errorText = await page
    .locator('[role="alert"], .text-red-600, .text-red-500')
    .first()
    .textContent({ timeout: 2000 })
    .catch(() => 'no error')
  console.log('Error text:', errorText)

  console.log('Console messages:', consoleMsgs.join('\n'))
  console.log('Page errors:', pageErrors.join('\n'))
})
