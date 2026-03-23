import { existsSync } from 'fs'
import { test, expect } from '../helpers/fixtures'
import type { Page } from '@playwright/test'
import { createAdminClient } from '@/lib/supabase/admin'

const HAS_CHEF_STATE = existsSync('.auth/chef.json')

test.use({ trace: 'off' })

function getAdminClient() {
  return createAdminClient()
}

async function safeCloseContext(context: { close: () => Promise<void> }) {
  try {
    await context.close()
  } catch (error) {
    const message = String(error ?? '')
    if (message.includes('ENOENT')) {
      return
    }
    throw error
  }
}

async function gotoRegister(page: Page) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await page.goto('/commerce/register', { waitUntil: 'domcontentloaded' })
    try {
      await expect(page.getByRole('heading', { name: 'POS Register' })).toBeVisible({
        timeout: 12_000,
      })
      await expect(page.getByRole('button', { name: 'Open Register' })).toBeVisible()
      return
    } catch {
      if (attempt === 3) {
        throw new Error('POS Register page did not load successfully after retries')
      }
      // Next dev can transiently render an error overlay while compiling.
      await page.waitForTimeout(1_000)
    }
  }
}

async function openRegisterCard(page: Page) {
  const trigger = page.getByRole('button', { name: 'Open Register' })
  const heading = page.locator('h3', { hasText: 'Open Register' })

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await trigger.click()
    try {
      await expect(heading).toBeVisible({ timeout: 4_000 })
      return
    } catch {
      // In dev mode, hydration/reload can drop the first click.
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(250)
    }
  }

  throw new Error('Open Register card did not appear after retries')
}

async function openRegister(page: Page) {
  const alreadyOpen = await page
    .getByText('Register Open')
    .first()
    .isVisible({ timeout: 1_500 })
    .catch(() => false)
  if (alreadyOpen) return

  await openRegisterCard(page)
  const cashInput = page.getByLabel('Opening Cash ($)').first()
  const hasCashInput = await cashInput.isVisible({ timeout: 2_500 }).catch(() => false)
  if (hasCashInput) {
    await cashInput.fill('100.00')
  }

  await page
    .getByRole('button', { name: /^Open$/ })
    .first()
    .click()
}

async function forceCloseActiveSessions(chefAuthId: string) {
  const admin = getAdminClient()
  const { error } = await admin
    .from('register_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      close_notes: '[e2e] forced close for concurrency isolation',
    } as any)
    .eq('opened_by', chefAuthId)
    .in('status', ['open', 'suspended'] as any)

  if (error) {
    throw new Error(`Failed to force-close active register sessions: ${error.message}`)
  }
}

async function getActiveSessionCount(chefAuthId: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('register_sessions')
    .select('id')
    .eq('opened_by', chefAuthId)
    .in('status', ['open', 'suspended'] as any)

  if (error) {
    throw new Error(`Failed to query active register sessions: ${error.message}`)
  }
  return (data ?? []).length
}

test.describe('POS Register Concurrency', () => {
  test.skip(!HAS_CHEF_STATE, 'Requires .auth/chef.json from global setup')
  test.setTimeout(180_000)

  test('allows only one active register when two pages attempt open concurrently', async ({
    browser,
    seedIds,
  }) => {
    const contextA = await browser.newContext({ storageState: '.auth/chef.json' })
    const contextB = await browser.newContext({ storageState: '.auth/chef.json' })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await forceCloseActiveSessions(seedIds.chefAuthId)
      await Promise.all([gotoRegister(pageA), gotoRegister(pageB)])
      await expect(pageA.getByRole('button', { name: 'Open Register' })).toBeVisible()
      await expect(pageB.getByRole('button', { name: 'Open Register' })).toBeVisible()

      await Promise.all([openRegister(pageA), openRegister(pageB)])
      await expect
        .poll(async () => getActiveSessionCount(seedIds.chefAuthId), { timeout: 45_000 })
        .toBe(1)

      await forceCloseActiveSessions(seedIds.chefAuthId)
      await gotoRegister(pageB)
    } finally {
      await forceCloseActiveSessions(seedIds.chefAuthId)
      await Promise.allSettled([safeCloseContext(contextA), safeCloseContext(contextB)])
    }
  })
})
