import { chromium } from 'playwright'
import { mkdirSync, readFileSync } from 'fs'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3100'
const CODEX_CREDS_PATH = '.auth/codex.json'
const CODEX_STORAGE_PATH = '.auth/codex-storage.json'

function loadCodexCredentials() {
  const creds = JSON.parse(readFileSync(CODEX_CREDS_PATH, 'utf8'))
  if (!creds.email || !creds.password) {
    throw new Error(`${CODEX_CREDS_PATH} must include email and password`)
  }
  return creds
}

async function main() {
  mkdirSync('.auth', { recursive: true })
  const creds = loadCodexCredentials()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  const response = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
    data: { email: creds.email, password: creds.password },
    timeout: 30_000,
  })

  if (!response.ok()) {
    const body = await response.text().catch(() => '')
    await browser.close()
    throw new Error(`/api/e2e/auth returned ${response.status()}: ${body}`)
  }

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.waitForTimeout(1_500)

  if (page.url().includes('/auth/signin')) {
    await browser.close()
    throw new Error(`Codex auth did not reach dashboard. URL: ${page.url()}`)
  }

  await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE_URL }])
  await context.storageState({ path: CODEX_STORAGE_PATH })
  await browser.close()

  console.log(`[codex-auth] Wrote ${CODEX_STORAGE_PATH}`)
}

main().catch((error) => {
  console.error('[codex-auth] FAILED:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
