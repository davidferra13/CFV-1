import { chromium, devices } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'

const packDir = path.resolve(
  '.evidence/live-browser/2026-05-20-15-31-58-google-food-near-me-to-chefflow-eat'
)
const screenshotsDir = path.join(packDir, 'screenshots')
const observations = []

function compact(value, max = 12000) {
  return String(value || '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/IP address: \d{1,3}(?:\.\d{1,3}){3}/g, 'IP address: [REDACTED_IP]')
    .replace(/\b\d{1,3}(?:\.\d{1,3}){3}\b/g, '[REDACTED_IP]')
    .trim()
    .slice(0, max)
}

async function visibleText(page) {
  return page
    .evaluate(() => document.body?.innerText || '')
    .then((text) => compact(text))
    .catch(() => '')
}

async function note(page, step, action, filename, extra = {}) {
  await page.screenshot({ path: path.join(screenshotsDir, filename), fullPage: true })
  observations.push({
    timestamp: new Date().toISOString(),
    step,
    action,
    url: page.url(),
    screenshot: `screenshots/${filename}`,
    title: await page.title().catch(() => ''),
    visibleTextSample: await visibleText(page),
    ...extra,
  })
}

async function attachDiagnostics(page, bucket) {
  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      bucket.console.push({
        type: message.type(),
        text: message.text().slice(0, 1000),
      })
    }
  })
  page.on('pageerror', (error) => {
    bucket.pageErrors.push(String(error?.stack || error).slice(0, 2000))
  })
  page.on('requestfailed', (request) => {
    bucket.requestFailures.push({
      url: request.url(),
      method: request.method(),
      failure: request.failure()?.errorText || 'unknown',
    })
  })
  page.on('response', (response) => {
    const status = response.status()
    if (status >= 400) {
      bucket.badResponses.push({
        url: response.url(),
        status,
      })
    }
  })
}

async function maybeHandleGoogleConsent(page) {
  for (const selector of [
    'button:has-text("Reject all")',
    'button:has-text("Accept all")',
    'button:has-text("I agree")',
    'text=Reject all',
    'text=Accept all',
  ]) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
      const label = await locator.innerText().catch(() => selector)
      await locator.click().catch(() => {})
      await page.waitForLoadState('domcontentloaded').catch(() => {})
      return compact(label, 200)
    }
  }
  return null
}

async function googleInput(page) {
  for (const selector of [
    'textarea[name="q"]',
    'input[name="q"]',
    '[aria-label="Search"]',
    '[title="Search"]',
  ]) {
    const locator = page.locator(selector).first()
    if (await locator.isVisible({ timeout: 3000 }).catch(() => false)) return locator
  }
  throw new Error('Google search input not found')
}

async function autocompleteSuggestions(page) {
  return page
    .evaluate(() => {
      const nodes = [
        ...document.querySelectorAll(
          '[role="listbox"] [role="option"], ul[role="listbox"] li, .erkvQe li, .G43f7e li'
        ),
      ]
      return [
        ...new Set(
          nodes
            .map((node) => node.innerText?.replace(/\s+/g, ' ').trim())
            .filter(Boolean)
        ),
      ]
    })
    .catch(() => [])
}

async function captureChefFlow() {
  const browser = await chromium.launch({ headless: true })

  for (const target of [
    {
      name: 'desktop',
      filename: '29-chefflow-eat-desktop-baseline.png',
      context: { viewport: { width: 1440, height: 1000 }, locale: 'en-US' },
    },
    {
      name: 'mobile',
      filename: '30-chefflow-eat-mobile-baseline.png',
      context: { ...devices['iPhone 13'], locale: 'en-US' },
    },
  ]) {
    const diagnostics = {
      console: [],
      pageErrors: [],
      requestFailures: [],
      badResponses: [],
    }
    const context = await browser.newContext(target.context)
    const page = await context.newPage()
    page.setDefaultTimeout(20000)
    await attachDiagnostics(page, diagnostics)
    await page.goto('http://localhost:3100/eat', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    await page.waitForTimeout(5000)
    await note(
      page,
      `chefflow-${target.name}-eat-baseline`,
      `Captured current ChefFlow /eat ${target.name} baseline at canonical server`,
      target.filename,
      {
        browserContext: `Playwright Chromium ${target.name}`,
        diagnostics,
      }
    )
    await context.close()
  }

  await browser.close()
}

async function captureGoogleMobile() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    ...devices['Pixel 5'],
    locale: 'en-US',
    timezoneId: 'America/New_York',
  })
  const page = await context.newPage()
  page.setDefaultTimeout(12000)

  await page.goto('https://www.google.com/', { waitUntil: 'domcontentloaded', timeout: 45000 })
  const consentAction = await maybeHandleGoogleConsent(page)
  await page.waitForTimeout(1200)
  await note(page, 'mobile-google-start', 'Opened Google mobile starting state', '31-mobile-google-start.png', {
    browserContext: 'Playwright Chromium Pixel 5 emulation',
    consentAction,
  })

  const input = await googleInput(page)
  await input.click()
  await page.waitForTimeout(700)
  await note(page, 'mobile-google-input-focus', 'Focused Google mobile search input', '32-mobile-google-input-focus.png')

  await input.fill('f')
  await page.waitForTimeout(900)
  await note(page, 'mobile-google-autocomplete-f', 'Typed "f" in Google mobile search', '33-mobile-google-autocomplete-f.png', {
    suggestions: await autocompleteSuggestions(page),
  })

  await input.fill('food near me')
  await page.waitForTimeout(1000)
  await note(
    page,
    'mobile-google-autocomplete-food-near-me',
    'Typed "food near me" in Google mobile search',
    '34-mobile-google-autocomplete-food-near-me.png',
    {
      suggestions: await autocompleteSuggestions(page),
    }
  )

  await input.press('Enter')
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForTimeout(3500)
  await note(
    page,
    'mobile-google-results-above-fold',
    'Submitted "food near me" on Google mobile and captured initial results',
    '35-mobile-google-results-above-fold.png'
  )

  const expanded = await page
    .locator('text=/Open now|More places|Places|Filters|Maps/i')
    .first()
    .click({ timeout: 3500 })
    .then(() => true)
    .catch(() => false)
  await page.waitForTimeout(1800)
  await note(
    page,
    'mobile-google-safe-expansion',
    'Clicked first visible safe mobile refinement/local/maps control when available',
    '36-mobile-google-safe-expansion.png',
    { expanded }
  )

  await page.mouse.wheel(0, 700)
  await page.waitForTimeout(1200)
  await note(page, 'mobile-google-one-scroll-depth', 'Scrolled Google mobile one depth', '37-mobile-google-one-scroll-depth.png')

  await browser.close()
}

await fs.mkdir(screenshotsDir, { recursive: true })

try {
  await captureChefFlow()
  await captureGoogleMobile()
} finally {
  await fs.writeFile(
    path.join(packDir, 'completion-observations.json'),
    `${JSON.stringify(observations, null, 2)}\n`,
    'utf8'
  )
}
