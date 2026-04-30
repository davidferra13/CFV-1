import { chromium } from 'playwright'
import dotenv from 'dotenv'
import { mkdirSync, readFileSync } from 'fs'
import { encode } from 'next-auth/jwt'

dotenv.config({ path: '.env.local' })

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

function resolveSessionCookieName() {
  return new URL(BASE_URL).protocol === 'https:'
    ? '__Secure-authjs.session-token'
    : 'authjs.session-token'
}

async function writeDirectStorageState(browser, creds, reason) {
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET
  if (!secret) {
    throw new Error(
      `Cannot mint Codex auth state without NEXTAUTH_SECRET or AUTH_SECRET. Live auth failed: ${reason}`
    )
  }
  if (!creds.authUserId || !creds.chefId) {
    throw new Error(
      `${CODEX_CREDS_PATH} must include authUserId and chefId. Run npm run codex:setup first.`
    )
  }

  const cookieName = resolveSessionCookieName()
  const token = await encode({
    token: {
      userId: creds.authUserId,
      email: creds.email,
      role: 'chef',
      entityId: creds.chefId,
      tenantId: creds.tenantId ?? creds.chefId,
    },
    secret,
    salt: cookieName,
  })

  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addCookies([
    {
      name: cookieName,
      value: token,
      url: BASE_URL,
      httpOnly: true,
      secure: new URL(BASE_URL).protocol === 'https:',
      sameSite: 'Lax',
      expires: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
    },
    { name: 'cookieConsent', value: 'declined', url: BASE_URL },
  ])
  await context.storageState({ path: CODEX_STORAGE_PATH })
  await context.close()
  console.log(`[codex-auth] Wrote ${CODEX_STORAGE_PATH} using direct cookie mint`)
  console.log(`[codex-auth] Live route was not usable: ${reason}`)
}

async function main() {
  mkdirSync('.auth', { recursive: true })
  const creds = loadCodexCredentials()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  try {
    const response = await page.request.post(`${BASE_URL}/api/e2e/auth`, {
      data: { email: creds.email, password: creds.password },
      timeout: 30_000,
    })

    if (!response.ok()) {
      const body = await response.text().catch(() => '')
      throw new Error(`/api/e2e/auth returned ${response.status()}: ${body}`)
    }

    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    await page.waitForTimeout(1_500)

    if (page.url().includes('/auth/signin')) {
      throw new Error(`Codex auth did not reach dashboard. URL: ${page.url()}`)
    }

    await context.addCookies([{ name: 'cookieConsent', value: 'declined', url: BASE_URL }])
    await context.storageState({ path: CODEX_STORAGE_PATH })
    console.log(`[codex-auth] Wrote ${CODEX_STORAGE_PATH}`)
  } catch (error) {
    await context.close().catch(() => {})
    await writeDirectStorageState(
      browser,
      creds,
      error instanceof Error ? error.message : String(error)
    )
  }

  await browser.close()
}

main().catch((error) => {
  console.error('[codex-auth] FAILED:', error instanceof Error ? error.message : String(error))
  process.exit(1)
})
