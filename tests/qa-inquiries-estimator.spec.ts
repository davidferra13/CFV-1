import { test, expect, type Page } from '@playwright/test'
import fsMod from 'fs'

const AGENT_EMAIL = 'agent@local.chefflow'
const AGENT_PASS = 'CHEF.jdgyuegf9924092.FLOW'
const SDIR = 'C:/Users/david/Documents/CFv1/screenshots/qa-inquiries-estimator-2026-03-31'

try {
  fsMod.mkdirSync(SDIR, { recursive: true })
} catch (e) {}

async function agentSignIn(page: Page) {
  const resp = await page.request.post('/api/e2e/auth', {
    data: { email: AGENT_EMAIL, password: AGENT_PASS },
  })
  console.log('Auth status:', resp.status())
  if (!resp.ok()) {
    await page.goto('/auth/signin')
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[type=email]', AGENT_EMAIL)
    await page.fill('input[type=password]', AGENT_PASS)
    await page.click('button[type=submit]')
    await page.waitForURL('**/dashboard', { timeout: 30000 })
  }
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
  console.log('Signed in URL:', page.url())
}

test.describe('Inquiries + Menu Estimator QA', () => {
  test.describe.configure({ timeout: 120_000 })

  test('T1: Inquiry detail - reply composer', async ({ page }) => {
    await agentSignIn(page)
    await page.goto('/inquiries')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SDIR + '/01-inquiries-list.png', fullPage: false })
    console.log('Inquiries URL:', page.url())
    const bodyText = ((await page.textContent('body')) || '').toLowerCase()
    console.log('Page text sample:', bodyText.substring(0, 300))
    // Find inquiry cards - these are the actual inquiry rows, not sidebar nav links
    // The sidebar has links like /inquiries/awaiting-response which are filters, not details
    // We want links that match /inquiries/{uuid} pattern (36-char UUID)
    // uuid check: href contains /inquiries/ followed by a uuid segment
    const allLinks = await page.locator('a[href*="/inquiries/"]').all()
    console.log('Total inquiry links (including nav):', allLinks.length)

    let detailHref = null
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      if (
        href &&
        href.includes('/inquiries/') &&
        href.length > 20 &&
        !href.endsWith('/inquiries/') &&
        ![
          'awaiting-response',
          'awaiting-client-reply',
          'declined',
          'menu-drafting',
          'new-inquiry',
          'sent-to-client',
          'client-reply',
        ].some((s) => href.endsWith(s))
      ) {
        detailHref = href
        break
      }
    }
    console.log('Detail href found:', detailHref)

    if (detailHref) {
      await page.goto(detailHref)
      await page.waitForLoadState('networkidle', { timeout: 15000 })
    } else {
      // Try clicking the inquiry card directly (it may be a div, not an anchor)
      const card = page.locator('[class*="inquiry"], [data-inquiry], .card').first()
      const cardCount = await card.count()
      console.log('Card count:', cardCount)
      if (cardCount > 0) {
        await card.click()
        await page.waitForLoadState('networkidle', { timeout: 15000 })
      } else {
        // Direct nav to the inquiry by ID
        console.log('Trying direct nav to inquiry from the visible card...')
      }
    }
    await page.screenshot({ path: SDIR + '/02-inquiry-detail-top.png' })
    console.log('Detail URL:', page.url())
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(600)
    await page.screenshot({ path: SDIR + '/03-inquiry-bottom.png' })
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.6))
    await page.waitForTimeout(300)
    await page.screenshot({ path: SDIR + '/04-inquiry-mid.png' })
    const fullText = ((await page.textContent('body')) || '').toLowerCase()
    console.log('Has dinner summary:', fullText.includes('dinner summary'))
    console.log('Has snapshot:', fullText.includes('snapshot'))
    console.log('Toggle count:', await page.locator('[role="switch"]').count())
    console.log('Textarea count:', await page.locator('textarea').count())
    console.log('Checkbox count:', await page.locator('input[type="checkbox"]').count())
    await page.screenshot({ path: SDIR + '/05-inquiry-full.png', fullPage: true })
    expect(page.url()).toContain('localhost:3100')
  })

  test('T2: Menu Cost Estimator', async ({ page }) => {
    await agentSignIn(page)
    await page.goto('/menus/estimate')
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SDIR + '/06-estimator-initial.png' })
    console.log('Estimator URL:', page.url())
    const pageText = (await page.textContent('body')) || ''
    console.log('Estimator text (400):', pageText.substring(0, 400))
    const allButtons = await page.locator('button').all()
    for (const btn of allButtons) {
      if (await btn.isVisible()) console.log('Button:', (await btn.textContent())?.trim())
    }
    await page.screenshot({ path: SDIR + '/06b-estimator-full.png', fullPage: true })
    const dishTA = page.locator('textarea').first()
    if ((await dishTA.count()) > 0) {
      await dishTA.click()
      await dishTA.fill('Paneer Tikka, Malai Kofta, Gulab Jamun')
      console.log('Dishes entered')
    } else {
      console.log('No textarea for dishes')
    }
    const numIn = page.locator('input[type="number"]').first()
    if ((await numIn.count()) > 0) {
      await numIn.fill('4')
      console.log('Guest count set to 4')
    }
    await page.screenshot({ path: SDIR + '/07-estimator-filled.png' })
    const btnTexts = ['Estimate', 'Calculate', 'Get Estimate', 'Analyze', 'Run']
    let clicked = false
    for (const t of btnTexts) {
      const b = page.locator('button').filter({ hasText: t }).first()
      if ((await b.count()) > 0 && (await b.isVisible())) {
        console.log('Clicking button:', t)
        await b.click()
        await page.waitForTimeout(5000)
        clicked = true
        break
      }
    }
    if (!clicked) {
      const sb = page.locator('button[type="submit"]').first()
      if ((await sb.count()) > 0) {
        await sb.click()
        await page.waitForTimeout(5000)
        clicked = true
      }
    }
    console.log('Button clicked:', clicked)
    await page.screenshot({ path: SDIR + '/08-estimator-results.png' })
    await page.screenshot({ path: SDIR + '/08b-results-full.png', fullPage: true })
    const resText = ((await page.textContent('body')) || '').toLowerCase()
    console.log('Results text (400):', resText.substring(0, 400))
    expect(page.url()).toContain('localhost:3100')
  })
})
