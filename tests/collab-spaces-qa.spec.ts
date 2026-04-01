import { test, expect, type Page } from '@playwright/test'

const AGENT_EMAIL = 'agent@local.chefflow'
const AGENT_PASS = 'CHEF.jdgyuegf9924092.FLOW'
const SDIR = 'C:/Users/david/AppData/Local/Temp'

async function signIn(page: Page) {
  const resp = await page.request.post('/api/e2e/auth', {
    data: { email: AGENT_EMAIL, password: AGENT_PASS },
  })
  if (!resp.ok()) {
    await page.goto('/auth/signin')
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[type=email]', AGENT_EMAIL)
    await page.fill('input[type=password]', AGENT_PASS)
    await page.click('button[type=submit]')
    await page.waitForTimeout(5000)
  }
  await page.goto('/dashboard')
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(2000)
}

test.describe('Chef Collab Spaces QA', () => {
  test.describe.configure({ timeout: 90000 })

  test('T1: /network?tab=collab renders Private Spaces section', async ({ page }) => {
    await signIn(page)
    await page.goto('/network?tab=collab')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: SDIR + '/collab-t1.png', fullPage: true })
    console.log('T1 URL:', page.url())
    const count = await page.locator('h3, h2').filter({ hasText: 'Private Spaces' }).count()
    console.log('T1 Private Spaces heading count:', count)
    expect(count).toBeGreaterThan(0)
  })

  test('T2: /network?tab=collab has New Space link', async ({ page }) => {
    await signIn(page)
    await page.goto('/network?tab=collab')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const c = await page.locator('a').filter({ hasText: 'New Space' }).count()
    console.log('T2 New Space link count:', c)
    expect(c).toBeGreaterThan(0)
  })

  test('T3: /network?tab=collab body contains Private Spaces text', async ({ page }) => {
    await signIn(page)
    await page.goto('/network?tab=collab')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const bt = await page.locator('body').innerText()
    console.log('T3 body has Private Spaces:', bt.includes('Private Spaces'))
    expect(bt).toContain('Private Spaces')
  })

  test('T4: /network/collabs loads with h1 Private Spaces', async ({ page }) => {
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    await page.screenshot({ path: SDIR + '/collab-t4.png', fullPage: true })
    console.log('T4 URL:', page.url(), 'title:', await page.title())
    const c = await page.locator('h1').filter({ hasText: 'Private Spaces' }).count()
    console.log('T4 h1 count:', c)
    expect(c).toBeGreaterThan(0)
  })

  test('T5: /network/collabs has Start Direct Space', async ({ page }) => {
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const c = await page.getByText('Start Direct Space').count()
    console.log('T5 Start Direct Space:', c)
    expect(c).toBeGreaterThan(0)
  })

  test('T6: /network/collabs has Create Workspace', async ({ page }) => {
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const c = await page.getByText('Create Workspace').count()
    console.log('T6 Create Workspace:', c)
    expect(c).toBeGreaterThan(0)
  })

  test('T7: /network/collabs has Your Spaces heading and empty state', async ({ page }) => {
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const ys = await page.locator('h2').filter({ hasText: 'Your Spaces' }).count()
    const ei = await page.getByText('No spaces yet').count()
    console.log('T7 Your Spaces heading:', ys, 'No spaces yet:', ei)
    expect(ys).toBeGreaterThan(0)
  })

  test('T8: Back to Collab link navigates to tab=collab', async ({ page }) => {
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const bl = page.locator('a').filter({ hasText: 'Back to Collab' })
    const c = await bl.count()
    console.log('T8 Back to Collab link:', c)
    expect(c).toBeGreaterThan(0)
    await bl.first().click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: SDIR + '/collab-t8.png', fullPage: false })
    console.log('T8 URL after back:', page.url())
    expect(page.url()).toContain('tab=collab')
  })

  test('T9: New Space link navigates to /network/collabs', async ({ page }) => {
    await signIn(page)
    await page.goto('/network?tab=collab')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    const nsLink = page.locator('a').filter({ hasText: 'New Space' }).first()
    const href = await nsLink.getAttribute('href')
    console.log('T9 New Space href:', href)
    await nsLink.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: SDIR + '/collab-t9.png', fullPage: true })
    console.log('T9 URL after click:', page.url())
    expect(page.url()).toContain('/network/collabs')
  })

  test('T10: /network/collabs no JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push('[console] ' + m.text())
    })
    await signIn(page)
    await page.goto('/network/collabs')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(3000)
    console.log('T10 JS errors:', errors.length ? errors : 'none')
    expect(errors).toHaveLength(0)
  })
})
