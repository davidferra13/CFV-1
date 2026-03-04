import { existsSync } from 'fs'
import { test, expect } from '../helpers/fixtures'
import type { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const HAS_CHEF_STATE = existsSync('.auth/chef.json')
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

function getAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for concurrency test'
    )
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
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
  await openRegisterCard(page)
  const openCard = page.locator('h3:has-text("Open Register")').locator('xpath=ancestor::div[1]')
  await openCard.getByRole('button', { name: 'Open' }).click()
}

async function forceCloseActiveSessions(tenantId: string) {
  const admin = getAdminClient()
  const { error } = await admin
    .from('register_sessions')
    .update({
      status: 'closed',
      closed_at: new Date().toISOString(),
      close_notes: '[e2e] forced close for concurrency isolation',
    } as any)
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'suspended'] as any)

  if (error) {
    throw new Error(`Failed to force-close active register sessions: ${error.message}`)
  }
}

async function getActiveSessionCount(tenantId: string) {
  const admin = getAdminClient()
  const { data, error } = await admin
    .from('register_sessions')
    .select('id')
    .eq('tenant_id', tenantId)
    .in('status', ['open', 'suspended'] as any)

  if (error) {
    throw new Error(`Failed to query active register sessions: ${error.message}`)
  }
  return (data ?? []).length
}

test.describe('POS Register Concurrency', () => {
  test.skip(!HAS_CHEF_STATE, 'Requires .auth/chef.json from global setup')
  test.setTimeout(120_000)

  test('allows only one active register when two pages attempt open concurrently', async ({
    browser,
    seedIds,
  }) => {
    const contextA = await browser.newContext({ storageState: '.auth/chef.json' })
    const contextB = await browser.newContext({ storageState: '.auth/chef.json' })
    const pageA = await contextA.newPage()
    const pageB = await contextB.newPage()

    try {
      await forceCloseActiveSessions(seedIds.chefId)
      await Promise.all([gotoRegister(pageA), gotoRegister(pageB)])
      await expect(pageA.getByRole('button', { name: 'Open Register' })).toBeVisible()
      await expect(pageB.getByRole('button', { name: 'Open Register' })).toBeVisible()

      await Promise.all([openRegister(pageA), openRegister(pageB)])
      await expect
        .poll(async () => getActiveSessionCount(seedIds.chefId), { timeout: 45_000 })
        .toBe(1)

      await Promise.all([pageA.reload(), pageB.reload()])
      await expect(pageA.getByText('Register Open')).toBeVisible()
      await expect(pageB.getByText('Register Open')).toBeVisible()

      await forceCloseActiveSessions(seedIds.chefId)
      await pageB.reload()
      await pageB.waitForLoadState('domcontentloaded')
      await expect(pageB.getByRole('button', { name: 'Open Register' })).toBeVisible()
    } finally {
      await forceCloseActiveSessions(seedIds.chefId)
      await Promise.allSettled([safeCloseContext(contextA), safeCloseContext(contextB)])
    }
  })
})
