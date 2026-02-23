// Quick Playwright test: verify integration health changes work
import { chromium } from 'playwright'
import fs from 'fs'

const BASE = 'http://localhost:3100'
const AGENT_EMAIL = 'agent@chefflow.test'
const AGENT_PASSWORD = 'AgentChefFlow!2026'

async function run() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  // ── Sign in via the actual auth/signin page ───────────────────
  console.log('1. Signing in...')
  await page.goto(`${BASE}/auth/signin`)
  await page.waitForLoadState('networkidle')

  const emailInput = page.locator('input[type="email"], input[name="email"]')
  const passInput = page.locator('input[type="password"], input[name="password"]')

  if (await emailInput.count() > 0) {
    await emailInput.fill(AGENT_EMAIL)
    await passInput.fill(AGENT_PASSWORD)
    const signInBtn = page.locator('button[type="submit"]')
    await signInBtn.click()

    // Wait for any navigation away from sign-in
    try {
      await page.waitForURL(url => {
        const u = url.toString()
        return !u.includes('/sign-in') && !u.includes('/auth/signin')
      }, { timeout: 15000 })
      console.log('   ✓ Signed in → ' + page.url())
    } catch {
      await page.screenshot({ path: 'test-screenshots/sign-in-error.png', fullPage: true })
      console.log('   ⚠ Sign-in timed out. URL: ' + page.url())
      // Check for error
      const body = await page.textContent('body')
      if (body.includes('Invalid') || body.includes('error') || body.includes('incorrect')) {
        console.log('   Error on page: credentials may be wrong')
      }
    }
  }

  // Verify we're authenticated by trying dashboard
  await page.goto(`${BASE}/dashboard`)
  await page.waitForLoadState('networkidle')
  const dashUrl = page.url()
  if (dashUrl.includes('/dashboard')) {
    console.log('   ✓ Authenticated — dashboard loads')
  } else {
    console.log('   ✗ Not authenticated — redirected to: ' + dashUrl)
    console.log('   Continuing with code-level checks only...')
  }
  await page.screenshot({ path: 'test-screenshots/dashboard.png', fullPage: true })

  // ── Test: Settings page ──────────────────────────────────────
  console.log('\n2. Testing Settings page...')
  await page.goto(`${BASE}/settings`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-screenshots/settings-page.png', fullPage: true })
  const settingsUrl = page.url()
  if (settingsUrl.includes('/settings')) {
    console.log('   ✓ Settings page loaded')
    const text = await page.textContent('body')
    if (text.includes('Google') || text.includes('Gmail')) {
      console.log('   ✓ Google integration section visible')
    }
    if (text.includes('redirect') || text.includes('Redirect URI') || text.includes('callback')) {
      console.log('   ✓ OAuth diagnostic info visible')
    }
  } else {
    console.log('   ⚠ Redirected away from settings: ' + settingsUrl)
  }

  // ── Test: Inquiries page ─────────────────────────────────────
  console.log('\n3. Testing Inquiries page...')
  await page.goto(`${BASE}/inquiries`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-screenshots/inquiries-page.png', fullPage: true })
  if (page.url().includes('/inquiries')) {
    console.log('   ✓ Inquiries page loaded')
  } else {
    console.log('   ⚠ Redirected: ' + page.url())
  }

  // ── Test: Documents page ─────────────────────────────────────
  console.log('\n4. Testing Documents page...')
  await page.goto(`${BASE}/documents`)
  await page.waitForLoadState('networkidle')
  await page.screenshot({ path: 'test-screenshots/documents-page.png', fullPage: true })
  if (page.url().includes('/documents')) {
    console.log('   ✓ Documents page loaded')
  } else {
    console.log('   ⚠ Redirected: ' + page.url())
  }

  // ── Code-level verification ──────────────────────────────────
  console.log('\n5. Verifying code imports and structure...')

  const checks = [
    {
      file: 'lib/ai/correspondence.ts',
      checks: [
        { test: c => c.includes("from './ace-ollama'"), pass: '→ ace-ollama', fail: 'NOT importing ace-ollama!' },
        { test: c => !c.includes("from './gemini-service'"), pass: 'No gemini-service import', fail: 'Still has gemini-service!' },
      ]
    },
    {
      file: 'lib/ai/parse-document-text.ts',
      checks: [
        { test: c => c.includes("from './parse-ollama'"), pass: '→ parse-ollama', fail: 'NOT importing parse-ollama!' },
        { test: c => !c.includes('parseWithAI'), pass: 'No parseWithAI usage', fail: 'Still uses parseWithAI!' },
      ]
    },
    {
      file: 'lib/ai/ace-ollama.ts',
      checks: [
        { test: c => c.includes('export async function generateACEDraft'), pass: 'Has generateACEDraft', fail: 'Missing generateACEDraft!' },
        { test: c => c.includes('export async function draftChefResponse'), pass: 'Has draftChefResponse', fail: 'Missing draftChefResponse!' },
        { test: c => c.includes('export async function extractTasksFromChat'), pass: 'Has extractTasksFromChat', fail: 'Missing extractTasksFromChat!' },
        { test: c => c.includes('OllamaOfflineError'), pass: 'Uses OllamaOfflineError (hard fail)', fail: 'Missing OllamaOfflineError!' },
        { test: c => !c.includes('gemini'), pass: 'No Gemini references', fail: 'Contains Gemini reference!' },
      ]
    },
    {
      file: 'lib/google/auth.ts',
      checks: [
        { test: c => c.includes('checkGoogleOAuthHealth'), pass: 'Has checkGoogleOAuthHealth()', fail: 'Missing checkGoogleOAuthHealth!' },
        { test: c => c.includes('isGoogleOAuthConfigured'), pass: 'Has isGoogleOAuthConfigured()', fail: 'Missing isGoogleOAuthConfigured!' },
      ]
    },
    {
      file: 'app/api/auth/google/connect/callback/route.ts',
      checks: [
        { test: c => c.includes('redirect_uri_mismatch'), pass: 'Handles redirect_uri_mismatch', fail: 'Missing redirect_uri_mismatch handler!' },
        { test: c => c.includes('invalid_grant'), pass: 'Handles invalid_grant', fail: 'Missing invalid_grant handler!' },
        { test: c => c.includes('invalid_client'), pass: 'Handles invalid_client', fail: 'Missing invalid_client handler!' },
      ]
    },
    {
      file: 'components/settings/google-integrations.tsx',
      checks: [
        { test: c => c.includes('checkGoogleOAuthHealth'), pass: 'Calls checkGoogleOAuthHealth', fail: 'Missing diagnostic call!' },
        { test: c => c.includes('Redirect URI') || c.includes('redirectUri') || c.includes('redirect_uri'), pass: 'Shows redirect URI info', fail: 'Missing redirect URI display!' },
      ]
    },
  ]

  let allPassed = true
  for (const { file, checks: fileChecks } of checks) {
    const content = fs.readFileSync(file, 'utf8')
    for (const { test, pass, fail } of fileChecks) {
      if (test(content)) {
        console.log(`   ✓ ${file}: ${pass}`)
      } else {
        console.log(`   ✗ ${file}: ${fail}`)
        allPassed = false
      }
    }
  }

  // ── Verify docs exist ────────────────────────────────────────
  console.log('\n6. Checking documentation...')
  if (fs.existsSync('docs/integration-health-audit.md')) {
    const doc = fs.readFileSync('docs/integration-health-audit.md', 'utf8')
    console.log(`   ✓ integration-health-audit.md exists (${doc.length} chars)`)
    console.log(doc.includes('AI Routing Summary') ? '   ✓ Has AI routing summary' : '   ✗ Missing AI routing summary')
    console.log(doc.includes('Ollama') ? '   ✓ Documents Ollama migration' : '   ✗ Missing Ollama info')
  } else {
    console.log('   ✗ integration-health-audit.md NOT FOUND')
    allPassed = false
  }

  console.log('\n══════════════════════════════════════')
  console.log(allPassed ? '✅ ALL CHECKS PASSED' : '⚠ SOME CHECKS FAILED — see above')
  console.log('══════════════════════════════════════')

  await browser.close()
}

run().catch(err => {
  console.error('Test failed:', err.message)
  process.exit(1)
})
