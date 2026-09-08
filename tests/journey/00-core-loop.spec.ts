// THE core journey: inquiry -> quote -> client acceptance -> event -> menu ->
// payment -> follow-up. Closes docs/test-coverage-blueprint.md Critical Gap 1.
// Navigation parity remains blocked on Rescue WS2 Phase A.

import { test, expect } from '@playwright/test'
import { readFileSync } from 'fs'
import { createAdminClient } from '@/lib/db/admin'
import type { SeedResult } from '../helpers/e2e-seed'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'

function loadSeedIds(): SeedResult {
  return JSON.parse(readFileSync('.auth/seed-ids.json', 'utf-8')) as SeedResult
}

test.describe('Core loop: inquiry to follow-up', () => {
  test.setTimeout(300_000)

  test('a booking travels from inquiry to logged payment in one thread', async ({ browser }) => {
    const seedIds = loadSeedIds()
    const admin = createAdminClient()
    const stamp = Date.now().toString()
    const occasion = `TEST Core Loop Dinner ${stamp}`
    const quoteName = `TEST Core Loop Quote ${stamp}`
    const menuName = `TEST Core Loop Menu ${stamp}`

    const chefContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 1280, height: 800 },
    })
    const clientContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/client.json',
    })
    const chefPhoneContext = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 375, height: 812 },
    })
    const chef = await chefContext.newPage()
    const client = await clientContext.newPage()
    const chefPhone = await chefPhoneContext.newPage()

    try {
      // 1. Capture the inquiry.
      await chef.goto('/inquiries/new')
      await chef.getByLabel('Channel').selectOption('email')
      await chef.getByLabel('Link to Existing Client').selectOption(seedIds.clientId)
      const nameInput = chef.getByLabel('Client Name')
      if (!(await nameInput.inputValue())) {
        await nameInput.fill('Joy (Test User)')
      }
      await chef.getByLabel('Occasion').fill(occasion)
      await chef.getByRole('button', { name: 'Log Inquiry' }).click()
      await chef.waitForURL(/\/inquiries\/[0-9a-f-]{36}/, { timeout: 30_000 })
      const inquiryId = chef.url().split('/inquiries/')[1].split('?')[0]
      expect(inquiryId).toBeTruthy()

      // 2. Quote it from the inquiry.
      await chef.getByRole('link', { name: /Create Quote/ }).click()
      await chef.waitForURL(/\/quotes\/new/, { timeout: 30_000 })
      const clientSelect = chef.getByLabel('Client')
      if (!(await clientSelect.inputValue())) {
        await clientSelect.selectOption(seedIds.clientId)
      }
      await chef.getByLabel('Quote Name').fill(quoteName)
      await chef.getByLabel(/Total Quoted Amount/).fill('2200.00')
      await chef.getByRole('button', { name: 'Create Quote' }).click()
      await chef.waitForURL(/\/quotes\/[0-9a-f-]{36}/, { timeout: 30_000 })
      const quoteId = chef.url().split('/quotes/')[1].split('?')[0]

      // 3. Send it through the confirmation dialog.
      await chef.getByRole('button', { name: 'Send to Client' }).click()
      await chef.getByRole('button', { name: 'Send Quote' }).click()
      await expect
        .poll(
          async () => {
            const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('sent')

      // 4. Accept it in the client portal.
      await client.goto(`/my-quotes/${quoteId}`)
      await client
        .getByRole('button', { name: /^Accept Quote$/ })
        .first()
        .click()
      await client
        .getByRole('button', { name: /^Accept Quote$/ })
        .last()
        .click()
      await expect
        .poll(
          async () => {
            const { data } = await admin.from('quotes').select('status').eq('id', quoteId).single()
            return data?.status ?? 'missing'
          },
          { timeout: 60_000 }
        )
        .toBe('accepted')

      // 5. Verify acceptance created the event.
      let eventId: string | null = null
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('quotes')
              .select('event_id')
              .eq('id', quoteId)
              .single()
            eventId = (data?.event_id as string | null) ?? null
            return eventId
          },
          { timeout: 60_000 }
        )
        .not.toBeNull()
      await chef.goto(`/events/${eventId}`)
      await expect(chef.getByText(occasion).first()).toBeVisible({ timeout: 30_000 })

      // 6. Plan a menu.
      await chef.goto('/menus/new')
      await chef.locator('input[placeholder="e.g., Summer BBQ Menu"]').fill(menuName)
      await chef.getByRole('button', { name: 'Next: Add Courses' }).click()
      await chef.locator('input[placeholder="e.g., Main Course"]').first().fill('Main Course')
      await chef.locator('input[placeholder="e.g., Duck Breast"]').first().fill('Roasted Chicken')
      await chef.getByRole('button', { name: /Create Menu \(1 course\)/ }).click()
      await expect(chef.getByText('Menu Created')).toBeVisible({ timeout: 30_000 })

      // 7. Record the payment on a phone-sized screen.
      await chefPhone.goto(`/events/${eventId}?tab=money`)
      const recordButton = chefPhone.getByRole('button', { name: /Record (Deposit|Payment)/ })
      await expect(recordButton).toBeVisible({ timeout: 30_000 })
      await recordButton.click()
      await chefPhone.locator('input[placeholder="0.00"]').fill('500.00')
      await chefPhone.locator('button[type="submit"]', { hasText: 'Record Payment' }).click()
      await expect
        .poll(
          async () => {
            const { data } = await admin
              .from('ledger_entries')
              .select('id')
              .eq('event_id', eventId!)
            return (data ?? []).length
          },
          { timeout: 30_000 }
        )
        .toBeGreaterThan(0)

      // 8. Verify the follow-up door loads for a completed event.
      await chef.goto(`/events/${seedIds.eventIds.completed}/follow-up`)
      await expect(chef.getByRole('heading', { name: 'Post-Event Follow-Up' })).toBeVisible({
        timeout: 30_000,
      })
    } finally {
      await chefContext.close()
      await clientContext.close()
      await chefPhoneContext.close()
    }
  })

  test('primary nav uses the same label on desktop and phone', async ({ browser }) => {
    test.fixme(
      true,
      'Blocked on Rescue WS2 Phase A tasks 6 and 8: tier renderer and navigation label sweep'
    )

    const desktop = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 1280, height: 800 },
    })
    const phone = await browser.newContext({
      baseURL: BASE_URL,
      storageState: '.auth/chef.json',
      viewport: { width: 375, height: 812 },
    })
    const dPage = await desktop.newPage()
    const mPage = await phone.newPage()

    try {
      await dPage.goto('/dashboard')
      await dPage.waitForSelector('[data-testid="chef-action-bar"] a', { timeout: 30_000 })
      const desktopLinks = await dPage
        .locator('[data-testid="chef-action-bar"] a')
        .evaluateAll((els) =>
          els.map((el) => ({
            href: el.getAttribute('href') || '',
            label: (el.textContent || '').trim(),
          }))
        )

      await mPage.goto('/dashboard')
      await mPage.waitForSelector('[data-testid="chef-nav-mobile-tabs"] a', { timeout: 30_000 })
      const mobileLinks = await mPage
        .locator('[data-testid="chef-nav-mobile-tabs"] a')
        .evaluateAll((els) =>
          els.map((el) => ({
            href: el.getAttribute('href') || '',
            label: (el.textContent || '').trim(),
          }))
        )

      expect(desktopLinks.length).toBeGreaterThan(0)
      expect(mobileLinks.length).toBeGreaterThan(0)

      const desktopByHref = new Map(desktopLinks.map((link) => [link.href, link.label]))
      for (const mobileLink of mobileLinks) {
        if (desktopByHref.has(mobileLink.href)) {
          expect
            .soft(desktopByHref.get(mobileLink.href), `label parity for ${mobileLink.href}`)
            .toBe(mobileLink.label)
        }
      }

      for (const link of [...desktopLinks, ...mobileLinks]) {
        expect.soft(link.label, `retired label on ${link.href}`).not.toMatch(/pipeline/i)
      }
    } finally {
      await desktop.close()
      await phone.close()
    }
  })
})
