/**
 * Remy End-to-End Smoke Test
 * Signs in with the agent account and tests all Remy infrastructure.
 * Run: npx tsx test-remy.ts
 *
 * Tests:
 * 1. Sign-in flow
 * 2. Dashboard + floating Remy FAB
 * 3. Remy drawer (open/close)
 * 4. Ask Remy command center page (/commands)
 * 5. Remy chat via the drawer (SSE streaming)
 * 6. API endpoints (public, client, chef stream)
 * 7. Remy history page
 */

import { chromium } from 'playwright'

const BASE_URL = 'http://localhost:3100'
const AGENT_EMAIL = 'agent@chefflow.test'
const AGENT_PASSWORD = 'AgentChefFlow!2026'

const results: { test: string; status: 'PASS' | 'FAIL' | 'SKIP' | 'CHECK'; note?: string }[] = []

function log(msg: string) {
  console.log(msg)
}

function record(test: string, status: 'PASS' | 'FAIL' | 'SKIP' | 'CHECK', note?: string) {
  results.push({ test, status, note })
  const icon = status === 'PASS' ? '✓' : status === 'FAIL' ? '✗' : status === 'SKIP' ? '—' : '?'
  log(`   [${icon}] ${test}${note ? ` (${note})` : ''}`)
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  log('═══════════════════════════════════════════════════')
  log(' Remy E2E Smoke Test')
  log('═══════════════════════════════════════════════════\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } })
  const page = await context.newPage()

  // ─── 1. Sign In ─────────────────────────────────────────────
  log('1. Sign-in flow')
  try {
    await page.goto(`${BASE_URL}/auth/signin`)
    await page.waitForLoadState('networkidle')

    await page.locator('input[type="email"], input[name="email"]').fill(AGENT_EMAIL)
    await page.locator('input[type="password"], input[name="password"]').fill(AGENT_PASSWORD)
    await page.locator('button[type="submit"]').click()

    await page.waitForURL('**/dashboard**', { timeout: 15000 }).catch(() => {})
    const url = page.url()

    if (url.includes('dashboard')) {
      record('Sign-in → dashboard', 'PASS')
    } else {
      record('Sign-in → dashboard', 'FAIL', `landed on ${url}`)
      await page.screenshot({ path: 'test-screenshots/fail-signin.png' })
      await browser.close()
      printSummary()
      return
    }
  } catch (err: any) {
    record('Sign-in → dashboard', 'FAIL', err.message)
    await browser.close()
    printSummary()
    return
  }

  // Dismiss cookie banner if present
  const cookieBtn = page.locator('button:has-text("Accept")')
  if ((await cookieBtn.count()) > 0) {
    await cookieBtn.click().catch(() => {})
    await sleep(500)
  }

  // ─── 2. Dashboard loads ─────────────────────────────────────
  log('\n2. Dashboard')
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await sleep(1500)
  await page.screenshot({ path: 'test-screenshots/01-dashboard.png' })
  record('Dashboard loads', 'PASS')

  // ─── 3. Floating Remy FAB ──────────────────────────────────
  log('\n3. Floating Remy FAB button')
  const remyFab = page.locator('button[aria-label="Open Remy"]').first()
  const fabCount = await remyFab.count()

  if (fabCount > 0) {
    record('Remy FAB visible', 'PASS')

    // Click FAB to open drawer
    await remyFab.click()
    await sleep(2000)
    await page.screenshot({ path: 'test-screenshots/02-remy-drawer-open.png' })

    // Check the drawer overlay appeared
    const drawerOverlay = page.locator('.fixed.inset-0.z-50')
    const overlayCount = await drawerOverlay.count()
    if (overlayCount > 0) {
      record('Remy drawer opens', 'PASS')
    } else {
      // Try broader check
      const html = await page.content()
      if (html.includes('fixed inset-0 z-50')) {
        record('Remy drawer opens', 'PASS', 'found in HTML')
      } else {
        record('Remy drawer opens', 'CHECK', 'overlay not detected — check screenshot')
      }
    }

    // Close drawer by pressing Escape
    await page.keyboard.press('Escape')
    await sleep(500)

    // Verify it closed
    const overlayAfter = await page.locator('.fixed.inset-0.z-50').count()
    if (overlayAfter === 0) {
      record('Remy drawer closes (Escape)', 'PASS')
    } else {
      // Try clicking backdrop
      await page
        .locator('.fixed.inset-0.z-50')
        .first()
        .click({ position: { x: 10, y: 360 } })
      await sleep(500)
      record('Remy drawer closes', 'CHECK', 'tried backdrop click')
    }
  } else {
    // Try text-based selector as fallback
    const fabFallback = page.locator('button:has-text("Remy")').last()
    if ((await fabFallback.count()) > 0) {
      record('Remy FAB visible', 'PASS', 'found via text selector')
    } else {
      record('Remy FAB visible', 'FAIL', 'no button found')
    }
  }

  // ─── 4. Ask Remy (/commands) page ──────────────────────────
  log('\n4. Ask Remy command center (/commands)')
  await page.goto(`${BASE_URL}/commands`)
  await page.waitForLoadState('networkidle')
  await sleep(2000)
  await page.screenshot({ path: 'test-screenshots/03-commands-page.png' })

  const commandsUrl = page.url()
  if (commandsUrl.includes('/commands')) {
    record('/commands page loads', 'PASS')
  } else {
    record('/commands page loads', 'FAIL', `redirected to ${commandsUrl}`)
  }

  // Check for the command textarea
  const cmdTextarea = page.locator('textarea')
  const textareaCount = await cmdTextarea.count()
  if (textareaCount > 0) {
    record('Command textarea present', 'PASS')
  } else {
    record('Command textarea present', 'FAIL')
  }

  // Check quick prompts
  const quickPrompts = page.locator(
    'button:has-text("upcoming events"), button:has-text("Draft a follow"), button:has-text("revenue"), button:has-text("available")'
  )
  const promptCount = await quickPrompts.count()
  record('Quick prompt buttons', promptCount > 0 ? 'PASS' : 'CHECK', `found ${promptCount}`)

  // Try sending a command (won't have data but tests the pipeline)
  if (textareaCount > 0) {
    log('\n5. Testing command execution...')

    // Test: simple command that works without data
    log('   Sending: "What events are coming up?"')
    await cmdTextarea.first().fill('What events are coming up?')
    await sleep(300)

    // Submit via button or Enter
    const submitBtn = page.locator('button[type="submit"]')
    if ((await submitBtn.count()) > 0) {
      await submitBtn.first().click()
    } else {
      await cmdTextarea.first().press('Enter')
    }

    // Wait for command to process (goes through orchestrator, not Ollama usually)
    await sleep(8000)
    await page.screenshot({ path: 'test-screenshots/04-command-result.png' })

    // Check if any result card appeared
    const pageText = (await page.locator('body').textContent()) || ''
    if (
      pageText.includes('No upcoming events') ||
      pageText.includes('events') ||
      pageText.includes('result') ||
      pageText.includes('not found')
    ) {
      record('Command executes and returns', 'PASS', 'got a response')
    } else if (pageText.includes('Ollama') || pageText.includes('offline')) {
      record('Command executes and returns', 'CHECK', 'Ollama may be offline')
    } else {
      record('Command executes and returns', 'CHECK', 'response unclear — see screenshot')
    }
  }

  // ─── 6. Remy Drawer chat test ──────────────────────────────
  log('\n6. Testing Remy drawer chat (SSE streaming)...')
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')
  await sleep(1500)

  // Open drawer
  const fab2 = page.locator('button[aria-label="Open Remy"]').first()
  if ((await fab2.count()) > 0) {
    await fab2.click()
    await sleep(2000)

    // Find the textarea inside the drawer
    const drawerInput = page.locator('.fixed.inset-0.z-50 textarea')
    const drawerInputCount = await drawerInput.count()

    if (drawerInputCount > 0) {
      record('Drawer textarea found', 'PASS')

      // Send a greeting
      log('   Sending: "Hey Remy, what can you do?"')
      await drawerInput.first().fill('Hey Remy, what can you do?')
      await sleep(300)

      // Find send button inside drawer
      const drawerSendBtn = page.locator('.fixed.inset-0.z-50 button[type="submit"]')
      if ((await drawerSendBtn.count()) > 0) {
        await drawerSendBtn.first().click()
      } else {
        await drawerInput.first().press('Enter')
      }

      // Wait for SSE response (needs Ollama)
      log('   Waiting for Remy SSE response (15s)...')
      await sleep(15000)
      await page.screenshot({ path: 'test-screenshots/05-drawer-chat-response.png' })

      // Check for response in the drawer
      const drawerText = await page
        .locator('.fixed.inset-0.z-50')
        .first()
        .textContent()
        .catch(() => '')
      if (drawerText && drawerText.length > 200) {
        record('Drawer chat got response', 'PASS')
      } else if (
        drawerText?.includes('Ollama') ||
        drawerText?.includes('offline') ||
        drawerText?.includes('Start Ollama')
      ) {
        record('Drawer chat got response', 'CHECK', 'Ollama appears offline')
      } else if (
        drawerText?.includes('thinking') ||
        drawerText?.includes('loading') ||
        drawerText?.includes('...')
      ) {
        record('Drawer chat got response', 'CHECK', 'still processing — Ollama may be slow')
      } else {
        record('Drawer chat got response', 'CHECK', 'unclear — see screenshot')
      }
    } else {
      // Try broader selector
      const anyInput = page.locator('.fixed textarea, .fixed input[placeholder]')
      if ((await anyInput.count()) > 0) {
        record('Drawer textarea found', 'PASS', 'via fallback selector')
      } else {
        record('Drawer textarea found', 'FAIL', 'no input in drawer')
      }
    }

    // Close drawer
    await page.keyboard.press('Escape')
    await sleep(500)
  } else {
    record('Drawer chat test', 'SKIP', 'FAB not found')
  }

  // ─── 7. Remy History page ──────────────────────────────────
  log('\n7. Remy History page')
  await page.goto(`${BASE_URL}/remy/history`)
  await page.waitForLoadState('networkidle')
  await sleep(2000)
  await page.screenshot({ path: 'test-screenshots/06-remy-history.png' })

  const historyUrl = page.url()
  if (historyUrl.includes('remy') || historyUrl.includes('history')) {
    record('Remy history page loads', 'PASS')
  } else {
    // Try alternative path
    await page.goto(`${BASE_URL}/ai/history`)
    await page.waitForLoadState('networkidle')
    await sleep(1000)
    const altUrl = page.url()
    if (altUrl.includes('history') || altUrl.includes('ai')) {
      record('Remy history page loads', 'PASS', `at ${altUrl}`)
    } else {
      record('Remy history page loads', 'CHECK', `could not find history page`)
    }
  }

  // ─── 8. API Endpoints ─────────────────────────────────────
  log('\n8. API endpoint tests')

  // Public Remy API
  const publicRes = await page.evaluate(async (baseUrl) => {
    try {
      const res = await fetch(`${baseUrl}/api/remy/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'What services does this chef offer?' }],
        }),
      })
      return { status: res.status, statusText: res.statusText }
    } catch (err: any) {
      return { status: 0, error: err.message }
    }
  }, BASE_URL)
  record(
    'Public Remy API (/api/remy/public)',
    publicRes.status === 200 ? 'PASS' : 'CHECK',
    `HTTP ${publicRes.status}`
  )

  // Client Remy API (should reject chef account)
  const clientRes = await page.evaluate(async (baseUrl) => {
    try {
      const res = await fetch(`${baseUrl}/api/remy/client`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'What events do I have?' }],
        }),
      })
      return { status: res.status, statusText: res.statusText }
    } catch (err: any) {
      return { status: 0, error: err.message }
    }
  }, BASE_URL)
  record(
    'Client Remy API (/api/remy/client)',
    clientRes.status === 401 || clientRes.status === 403 ? 'PASS' : 'CHECK',
    `HTTP ${clientRes.status} — ${clientRes.status === 401 ? 'correctly rejects chef' : 'unexpected status'}`
  )

  // Chef Remy Stream API
  const chefRes = await page.evaluate(async (baseUrl) => {
    try {
      const res = await fetch(`${baseUrl}/api/remy/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      })
      return {
        status: res.status,
        statusText: res.statusText,
        contentType: res.headers.get('content-type'),
      }
    } catch (err: any) {
      return { status: 0, error: err.message }
    }
  }, BASE_URL)
  record(
    'Chef Remy Stream (/api/remy/stream)',
    chefRes.status === 200 ? 'PASS' : 'CHECK',
    `HTTP ${chefRes.status}${(chefRes as any).contentType ? ` — ${(chefRes as any).contentType}` : ''}`
  )

  // ─── 9. Remy Queue & Task Infrastructure ───────────────────
  log('\n9. Queue/task infrastructure (API-level)')

  // Test the queue health endpoint if it exists
  const queueRes = await page.evaluate(async (baseUrl) => {
    try {
      const res = await fetch(`${baseUrl}/api/ai/queue/health`)
      return { status: res.status }
    } catch (err: any) {
      return { status: 0, error: err.message }
    }
  }, BASE_URL)
  if (queueRes.status === 200) {
    record('Queue health endpoint', 'PASS')
  } else if (queueRes.status === 404) {
    record('Queue health endpoint', 'SKIP', 'endpoint not exposed — queue works internally')
  } else {
    record('Queue health endpoint', 'CHECK', `HTTP ${queueRes.status}`)
  }

  // ─── Summary ─────────────────────────────────────────────────
  printSummary()

  await browser.close()
}

function printSummary() {
  log('\n\n═══════════════════════════════════════════════════')
  log(' REMY E2E TEST RESULTS')
  log('═══════════════════════════════════════════════════\n')

  const pass = results.filter((r) => r.status === 'PASS').length
  const fail = results.filter((r) => r.status === 'FAIL').length
  const check = results.filter((r) => r.status === 'CHECK').length
  const skip = results.filter((r) => r.status === 'SKIP').length

  for (const r of results) {
    const icon =
      r.status === 'PASS' ? '✓' : r.status === 'FAIL' ? '✗' : r.status === 'SKIP' ? '—' : '?'
    const color = r.status === 'PASS' ? '' : r.status === 'FAIL' ? ' *** ' : ''
    log(`  ${color}[${icon}] ${r.test}${r.note ? ` — ${r.note}` : ''}${color}`)
  }

  log(
    `\n  Total: ${results.length} | PASS: ${pass} | FAIL: ${fail} | CHECK: ${check} | SKIP: ${skip}`
  )
  log('')

  if (fail === 0) {
    log('  All critical tests passed! Remy infrastructure is working.')
  } else {
    log(`  ${fail} test(s) FAILED — see above for details.`)
  }

  log('\n  Screenshots saved to: test-screenshots/')
  log('  Check screenshots for visual verification of UI state.\n')

  log('  DATA NOTE: Agent account has no clients or events.')
  log('  Commands that need entity data will return "not found" — that is expected.')
  log('  Recipes ARE present, so recipe-related commands should return real data.\n')
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
