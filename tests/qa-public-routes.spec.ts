import { test } from '@playwright/test'
import { mkdirSync } from 'fs'
import { join } from 'path'

const BASE = 'http://localhost:3000'
const DIR = 'screenshots/qa-pass'
mkdirSync(DIR, { recursive: true })

async function go(page: any, url: string) {
  try {
    await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(2000)
  } catch (e: any) {
    console.log('NAV ERR ' + url + ': ' + e.message.substring(0, 80))
  }
}

async function shot(page: any, name: string, desc: string) {
  try {
    await page.screenshot({ path: join(DIR, name), fullPage: true, timeout: 10000 })
  } catch (e: any) {
    console.log('SHOT_FAIL:' + e.message.substring(0, 60))
    return
  }
  console.log('SHOT:' + name + '|' + desc)
}

test('pub-01-landing', async ({ page }) => {
  await go(page, '/')
  await shot(page, 'pub-01-landing.png', 'Public Landing')
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
  console.log('URL:' + page.url())
})

test('pub-02-chefs', async ({ page }) => {
  await go(page, '/chefs')
  await shot(page, 'pub-02-chefs.png', 'Chefs Directory')
  const cards = await page.locator('[class*="chef"], [class*="card"]').count()
  console.log('CHEF_CARDS:' + cards)
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
})

test('pub-03-book', async ({ page }) => {
  await go(page, '/book')
  await shot(page, 'pub-03-book.png', 'Book Page')
  const inputs = await page.locator('input, select, textarea').count()
  console.log('FORM_INPUTS:' + inputs)
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
})

test('pub-04-faq', async ({ page }) => {
  await go(page, '/faq')
  await shot(page, 'pub-04-faq.png', 'FAQ Page')
  const t = await page.evaluate(() => document.body.innerText.substring(0, 500))
  console.log('CONTENT:' + t)
})

test('pub-05-how-it-works', async ({ page }) => {
  await go(page, '/how-it-works')
  await shot(page, 'pub-05-how-it-works.png', 'How It Works')
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
})

test('pub-06-for-operators', async ({ page }) => {
  await go(page, '/for-operators')
  await shot(page, 'pub-06-for-operators.png', 'For Operators')
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
})

test('pub-07-signin', async ({ page }) => {
  await go(page, '/auth/signin')
  await shot(page, 'pub-07-signin.png', 'Sign In Page')
  const inputs = await page.locator('input[type=email], input[type=password]').count()
  console.log('SIGNIN_INPUTS:' + inputs)
  const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
  console.log('CONTENT:' + t)
})

test('pub-08-nearby', async ({ page }) => {
  await go(page, '/nearby')
  await shot(page, 'pub-08-nearby.png', 'Nearby Page')
  console.log('URL:' + page.url())
  const t = await page.evaluate(() => document.body.innerText.substring(0, 300))
  console.log('CONTENT:' + t)
})

test('pub-09-services-landing', async ({ page }) => {
  await go(page, '/services')
  await shot(page, 'pub-09-services.png', 'Services Landing')
  console.log('URL:' + page.url())
})

test('pub-10-embed-widget', async ({ page }) => {
  // Test the public embed form
  await go(page, '/embed/inquiry/c0000000-0000-0000-0000-000000000099')
  await shot(page, 'pub-10-embed.png', 'Embed Widget')
  console.log('URL:' + page.url())
  const t = await page.evaluate(() => document.body.innerText.substring(0, 300))
  console.log('CONTENT:' + t)
})

test('pub-11-chef-profile', async ({ page }) => {
  // Try to find a chef slug from the chefs page first
  await go(page, '/chefs')
  const links = await page.locator('a[href^="/chef/"]').allTextContents()
  const hrefs = await page.evaluate(() =>
    Array.from(document.querySelectorAll('a[href^="/chef/"]')).map((a: any) =>
      a.getAttribute('href')
    )
  )
  console.log('CHEF_LINKS:' + JSON.stringify(hrefs.slice(0, 3)))
  if (hrefs.length > 0) {
    await go(page, hrefs[0])
    await shot(page, 'pub-11-chef-profile.png', 'Chef Public Profile')
    const t = await page.evaluate(() => document.body.innerText.substring(0, 400))
    console.log('CHEF_PROFILE:' + t)
  }
})

test('pub-12-unauth-redirect', async ({ page }) => {
  // Verify that authenticated routes redirect to sign-in when no session
  const routes = ['/dashboard', '/clients', '/events', '/inbox', '/calendar', '/settings']
  for (const route of routes) {
    await go(page, route)
    const finalUrl = page.url()
    const redirected = finalUrl.includes('/auth/signin')
    console.log(
      'REDIRECT:' +
        route +
        '->' +
        (redirected ? 'PASS (redirected to signin)' : 'FAIL (url: ' + finalUrl + ')')
    )
  }
  await shot(page, 'pub-12-auth-redirect.png', 'Auth Redirect Check')
})
