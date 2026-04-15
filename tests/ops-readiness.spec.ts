import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3000'
const PROD = 'http://localhost:3000'
const EVT = '2832ae8d-e95a-4b2f-9777-36fc72784cc1'
const EVT2 = '24726df1-629e-43e5-a1ac-4e176b996254'
const CID = 'f6008386-396b-4a29-960a-7ac2be3667d2'
const SS = 'screenshots'

async function auth(page: any) {
  const r = await page.request.post(BASE + '/api/e2e/auth', {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  return (await r.json()).ok
}
test('A1: event detail critical fields', async ({ page }) => {
  await auth(page)
  await page.goto(BASE + '/events/' + EVT, { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-A1-top.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.screenshot({ path: SS + '/ops-A1-mid.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 1400))
  await page.screenshot({ path: SS + '/ops-A1-bottom.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-A1-full.png', fullPage: true })
  const c = await page.content()
  const fields = {
    guestCount: /guest|pax/i.test(c),
    menuStatus: /menu/i.test(c),
    paymentStatus: /payment|balance|paid|invoice/i.test(c),
    allergyDietary: /allerg|dietary|restriction/i.test(c),
    dateTime:
      /january|february|march|april|may|june|july|august|september|october|november|december/i.test(
        c
      ),
    location: /location|address|venue/i.test(c),
  }
  console.log('A1-fields:', JSON.stringify(fields))
  expect(c).not.toContain('This page could not be found')
})

test('A2: prep checklist tab', async ({ page }) => {
  await auth(page)
  await page.goto(BASE + '/events/' + EVT, { waitUntil: 'networkidle' })
  const tabs = await page.locator('[role=tab]').allTextContents()
  console.log('A2-tabs:', JSON.stringify(tabs))
  const opsT = page.locator('[role=tab]').filter({ hasText: /ops|operation/i })
  if ((await opsT.count()) > 0) {
    await opsT.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SS + '/ops-A2-ops-tab.png', fullPage: true })
    const oc = await page.content()
    console.log('A2-opsTab-prep:', /prep|checklist/i.test(oc))
  }
  await page.screenshot({ path: SS + '/ops-A2-full.png', fullPage: true })
  expect(true).toBe(true)
})
test('A3: shopping list page', async ({ page }) => {
  await auth(page)
  await page.goto(BASE + '/culinary/prep/shopping', { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-A3-top.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.screenshot({ path: SS + '/ops-A3-scroll.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-A3-full.png', fullPage: true })
  const c = await page.content()
  console.log('A3-url:', page.url())
  console.log('A3-content:', {
    guest: /guest/i.test(c),
    recipe: /recipe/i.test(c),
    shop: /shop/i.test(c),
  })
  expect(c).not.toContain('This page could not be found')
})

test('B1: circle invite share button', async ({ page }) => {
  await auth(page)
  await page.goto(PROD + '/hub/g/' + CID, { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-B1-main.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-B1-full.png', fullPage: true })
  const tabs = await page.locator('[role=tab]').allTextContents()
  const c = await page.content()
  console.log('B1-tabs:', JSON.stringify(tabs))
  console.log('B1-content:', {
    invite: /invite/i.test(c),
    share: /share/i.test(c),
    copyLink: /copy.*link|link.*copy/i.test(c),
  })
  const st = page.locator('[role=tab]').filter({ hasText: /setting/i })
  if ((await st.count()) > 0) {
    await st.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SS + '/ops-B1-settings.png', fullPage: true })
    const sc = await page.content()
    console.log('B1-settings:', { invite: /invite/i.test(sc), share: /share/i.test(sc) })
  }
  await page.goto(PROD + '/hub/g/' + CID, { waitUntil: 'networkidle' })
  const mt = page.locator('[role=tab]').filter({ hasText: /member/i })
  if ((await mt.count()) > 0) {
    await mt.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SS + '/ops-B1-members.png', fullPage: true })
    const mc = await page.content()
    console.log('B1-members:', { invite: /invite/i.test(mc), share: /share/i.test(mc) })
  }
  expect(true).toBe(true)
})

test('B2: join page allergy question', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(PROD + '/hub/join/' + CID, { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-B2-fresh.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.screenshot({ path: SS + '/ops-B2-scroll.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-B2-full.png', fullPage: true })
  const c = await page.content()
  const inputs = await page.locator('input, select, textarea').count()
  console.log('B2-allergyQ:', /allerg|dietary/i.test(c))
  console.log('B2-hasYesNo:', /yes|no/i.test(c))
  console.log('B2-inputs:', inputs)
  await ctx.close()
  expect(c).not.toContain('404')
})
test('C1: dashboard circle activity', async ({ page }) => {
  await auth(page)
  await page.goto(BASE + '/dashboard', { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-C1-top.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 700))
  await page.screenshot({ path: SS + '/ops-C1-mid.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 1400))
  await page.screenshot({ path: SS + '/ops-C1-bottom.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-C1-full.png', fullPage: true })
  const c = await page.content()
  console.log('C1:', {
    circle: /circle|hub/i.test(c),
    guestChange: /guest.*count|new.*guest|joined/i.test(c),
    actionNeeded: /action.*needed|attention|urgent/i.test(c),
    eventStatus: /upcoming|confirmed|today/i.test(c),
  })
  expect(page.url()).not.toContain('signin')
})

test('D1: event balance and due date', async ({ page }) => {
  await auth(page)
  await page.goto(BASE + '/events/' + EVT, { waitUntil: 'networkidle' })
  const mt = page.locator('[role=tab]').filter({ hasText: /money|financ|payment|invoice/i })
  if ((await mt.count()) > 0) {
    await mt.first().click()
    await page.waitForLoadState('networkidle')
    await page.screenshot({ path: SS + '/ops-D1-money.png', fullPage: false })
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.screenshot({ path: SS + '/ops-D1-money-scroll.png', fullPage: false })
    await page.screenshot({ path: SS + '/ops-D1-money-full.png', fullPage: true })
    const c = await page.content()
    console.log('D1:', {
      balance: /balance|remaining|due/i.test(c),
      dueDate: /due date|due on|pay by/i.test(c),
    })
  } else {
    await page.screenshot({ path: SS + '/ops-D1-no-tab.png', fullPage: true })
    const c = await page.content()
    console.log('D1-NO-MONEY-TAB balance:', /balance|remaining/i.test(c))
  }
  expect(true).toBe(true)
})

test('E1: circle day-of experience', async ({ page }) => {
  await auth(page)
  await page.goto(PROD + '/hub/g/' + CID, { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-E1-top.png', fullPage: false })
  await page.evaluate(() => window.scrollTo(0, 600))
  await page.screenshot({ path: SS + '/ops-E1-scroll.png', fullPage: false })
  await page.screenshot({ path: SS + '/ops-E1-full.png', fullPage: true })
  const c = await page.content()
  console.log('E1:', {
    countdown: /countdown/i.test(c),
    today: /today|happening now/i.test(c),
    dayOf: /day.?of|event day/i.test(c),
    dateVisible: /thursday|april|may/i.test(c),
  })
  expect(true).toBe(true)
})

test('E2: join as new guest welcome', async ({ browser }) => {
  const ctx = await browser.newContext()
  const page = await ctx.newPage()
  await page.goto(PROD + '/hub/join/' + CID, { waitUntil: 'networkidle' })
  await page.screenshot({ path: SS + '/ops-E2-start.png', fullPage: true })
  try {
    const nf = page.locator('input[name=name], input[placeholder*=name i]').first()
    const ef = page.locator('input[type=email], input[name=email]').first()
    if ((await nf.count()) > 0) await nf.fill('Test Guest Round3')
    if ((await ef.count()) > 0) await ef.fill('test-r3@example.com')
    const noLbl = page.locator('label').filter({ hasText: /^no$/i })
    if ((await noLbl.count()) > 0) await noLbl.first().click()
    await page.screenshot({ path: SS + '/ops-E2-filled.png', fullPage: true })
    const sub = page
      .locator('button[type=submit], button')
      .filter({ hasText: /join|rsvp|submit/i })
      .first()
    if ((await sub.count()) > 0) {
      await sub.click()
      await page.waitForTimeout(3000)
    }
    await page.screenshot({ path: SS + '/ops-E2-after.png', fullPage: false })
    await page.evaluate(() => window.scrollTo(0, 600))
    await page.screenshot({ path: SS + '/ops-E2-after-scroll.png', fullPage: false })
    await page.screenshot({ path: SS + '/ops-E2-after-full.png', fullPage: true })
    const c = await page.content()
    console.log('E2:', {
      url: page.url(),
      welcome: /welcome|joined|rsvp.*confirm/i.test(c),
      circleView: /circle|dinner|menu|guests/i.test(c),
    })
  } catch (e) {
    console.log('E2-error:', e.message)
    await page.screenshot({ path: SS + '/ops-E2-error.png', fullPage: true })
  }
  await ctx.close()
  expect(true).toBe(true)
})
