// Experiential Verification Utilities
//
// These helpers capture what the user actually sees at every transition point.
// The goal is to detect blank screens, missing loading states, and broken
// UX signals that structural tests miss.

import { Page, expect } from '@playwright/test'
import { readFileSync } from 'fs'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ScreenState = {
  /** Human-readable label for this checkpoint */
  label: string
  /** Screenshot filename (auto-generated from label if not provided) */
  filename?: string
  /** Page URL at time of capture */
  url: string
  /** Whether the page had visible content (not blank) */
  hasContent: boolean
  /** Whether a loading indicator was visible */
  hasLoadingIndicator: boolean
  /** Whether an error state was visible */
  hasError: boolean
  /** Viewport-visible text content (first 500 chars) */
  visibleText: string
  /** Timestamp */
  timestamp: number
}

export type FlowReport = {
  flowName: string
  startedAt: number
  completedAt: number
  checkpoints: ScreenState[]
  failures: string[]
}

// ---------------------------------------------------------------------------
// Blank screen detection
// ---------------------------------------------------------------------------

/**
 * Checks if the current page is experientially "blank" to the user.
 * A blank page has no meaningful visible text content in the viewport.
 */
export async function isPageBlank(page: Page): Promise<boolean> {
  const visibleText = await getVisibleText(page)
  // Filter out common non-content text
  const meaningful = visibleText
    .replace(/loading|chefflow|sign/gi, '')
    .replace(/\s+/g, '')
    .trim()
  return meaningful.length < 10
}

/**
 * Gets all visible text content from the current viewport.
 */
export async function getVisibleText(page: Page): Promise<string> {
  return page.evaluate(() => {
    const body = document.body
    if (!body) return ''
    // Get text from visible elements only
    const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const el = node.parentElement
        if (!el) return NodeFilter.FILTER_REJECT
        const style = getComputedStyle(el)
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
          return NodeFilter.FILTER_REJECT
        }
        const rect = el.getBoundingClientRect()
        if (rect.width === 0 || rect.height === 0) return NodeFilter.FILTER_REJECT
        return NodeFilter.FILTER_ACCEPT
      },
    })
    const texts: string[] = []
    let node: Node | null
    while ((node = walker.nextNode())) {
      const t = (node.textContent || '').trim()
      if (t) texts.push(t)
    }
    return texts.join(' ').slice(0, 500)
  })
}

// ---------------------------------------------------------------------------
// Loading indicator detection
// ---------------------------------------------------------------------------

/**
 * Checks if any loading indicator is visible on the page.
 * Looks for common patterns: spinners, skeleton loaders, progress bars,
 * loading text, and animate-pulse elements.
 */
export async function hasLoadingIndicator(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    // Check for common loading patterns
    const indicators = [
      // Spinner animations
      ...Array.from(document.querySelectorAll('.animate-spin')),
      // Skeleton pulse animations
      ...Array.from(document.querySelectorAll('.animate-pulse')),
      // Loading text
      ...Array.from(document.querySelectorAll('[role="status"]')),
      // Progress bars
      ...Array.from(document.querySelectorAll('[role="progressbar"]')),
      // aria-busy elements
      ...Array.from(document.querySelectorAll('[aria-busy="true"]')),
    ]

    return indicators.some((el) => {
      const style = getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        rect.width > 0 &&
        rect.height > 0
      )
    })
  })
}

// ---------------------------------------------------------------------------
// Error state detection
// ---------------------------------------------------------------------------

/**
 * Checks if an error state is visible on the page.
 */
export async function hasErrorState(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const errorIndicators = [
      ...Array.from(document.querySelectorAll('[role="alert"]')),
      ...Array.from(document.querySelectorAll('.text-red-500, .text-red-600, .text-red-400')),
      ...Array.from(document.querySelectorAll('.bg-red-50, .bg-red-100, .border-red-500')),
    ]

    const errorTexts = ['error', 'failed', 'could not load', 'something went wrong', 'try again']

    const hasErrorElement = errorIndicators.some((el) => {
      const style = getComputedStyle(el)
      return style.display !== 'none' && style.visibility !== 'hidden'
    })

    if (hasErrorElement) return true

    const bodyText = (document.body?.textContent || '').toLowerCase()
    return errorTexts.some((t) => bodyText.includes(t))
  })
}

// ---------------------------------------------------------------------------
// Checkpoint capture
// ---------------------------------------------------------------------------

/**
 * Captures a full checkpoint of the current page state.
 * Takes a screenshot and records all observable state.
 */
export async function captureCheckpoint(
  page: Page,
  label: string,
  testInfo: {
    attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>
  }
): Promise<ScreenState> {
  // Wait for any immediate DOM updates to settle
  await page.waitForLoadState('domcontentloaded')

  // Small pause to let React hydration and transitions complete
  await page.waitForTimeout(300)

  const screenshot = await page.screenshot({ fullPage: false })
  const filename = label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()

  await testInfo.attach(`checkpoint-${filename}`, {
    body: screenshot,
    contentType: 'image/png',
  })

  const [visibleText, loading, error, blank] = await Promise.all([
    getVisibleText(page),
    hasLoadingIndicator(page),
    hasErrorState(page),
    isPageBlank(page),
  ])

  return {
    label,
    filename,
    url: page.url(),
    hasContent: !blank,
    hasLoadingIndicator: loading,
    hasError: error,
    visibleText: visibleText.slice(0, 500),
    timestamp: Date.now(),
  }
}

/**
 * Captures a checkpoint and asserts the page is NOT blank.
 * This is the primary assertion for experiential verification:
 * at no point should the user see an empty screen.
 */
export async function assertNotBlank(
  page: Page,
  label: string,
  testInfo: {
    attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>
  }
): Promise<ScreenState> {
  const checkpoint = await captureCheckpoint(page, label, testInfo)

  if (!checkpoint.hasContent && !checkpoint.hasLoadingIndicator) {
    throw new Error(
      `BLANK SCREEN at "${label}"\n` +
        `  URL: ${checkpoint.url}\n` +
        `  Visible text: "${checkpoint.visibleText}"\n` +
        `  Loading indicator: ${checkpoint.hasLoadingIndicator}\n` +
        `  Error state: ${checkpoint.hasError}\n` +
        `  This means the user sees nothing. Either add a loading state or fix the content render.`
    )
  }

  return checkpoint
}

// ---------------------------------------------------------------------------
// Navigation with verification
// ---------------------------------------------------------------------------

/**
 * Navigates to a URL and captures checkpoints at both the immediate render
 * and after content has settled. Catches blank gaps between navigation and render.
 */
export async function navigateAndVerify(
  page: Page,
  url: string,
  label: string,
  testInfo: {
    attach: (name: string, options: { body: Buffer; contentType: string }) => Promise<void>
  }
): Promise<{ immediate: ScreenState; settled: ScreenState }> {
  await page.goto(url, { waitUntil: 'commit' })

  // Capture what the user sees immediately (before JS hydration)
  const immediate = await captureCheckpoint(page, `${label} (immediate)`, testInfo)

  // Wait for network to settle and capture again
  await page.waitForLoadState('networkidle').catch(() => {
    // networkidle can timeout on pages with realtime subscriptions
  })
  await page.waitForTimeout(500)

  const settled = await assertNotBlank(page, `${label} (settled)`, testInfo)

  return { immediate, settled }
}

// ---------------------------------------------------------------------------
// Flow report generation
// ---------------------------------------------------------------------------

/**
 * Generates a summary of a flow's checkpoints, highlighting issues.
 */
export function summarizeFlow(report: FlowReport): string {
  const lines: string[] = [
    `## ${report.flowName}`,
    `Duration: ${report.completedAt - report.startedAt}ms`,
    `Checkpoints: ${report.checkpoints.length}`,
    '',
  ]

  for (const cp of report.checkpoints) {
    const status =
      !cp.hasContent && !cp.hasLoadingIndicator
        ? 'BLANK'
        : cp.hasError
          ? 'ERROR'
          : cp.hasLoadingIndicator
            ? 'LOADING'
            : 'OK'

    const icon = status === 'OK' ? '[OK]' : status === 'LOADING' ? '[LOAD]' : `[${status}]`
    lines.push(`  ${icon} ${cp.label} - ${cp.url}`)
  }

  if (report.failures.length > 0) {
    lines.push('', 'FAILURES:')
    for (const f of report.failures) {
      lines.push(`  - ${f}`)
    }
  }

  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Agent credentials helper
// ---------------------------------------------------------------------------

export function loadAgentCredentials(): { email: string; password: string } {
  try {
    const raw = readFileSync('.auth/agent.json', 'utf-8')
    const data = JSON.parse(raw)
    return { email: data.email, password: data.password }
  } catch {
    throw new Error('Could not read .auth/agent.json. Run `npm run agent:setup` first.')
  }
}

export function loadSeedIds() {
  try {
    const raw = readFileSync('.auth/seed-ids.json', 'utf-8')
    return JSON.parse(raw)
  } catch {
    throw new Error(
      'Could not read .auth/seed-ids.json. Run globalSetup first (npx playwright test --project=chef).'
    )
  }
}

// ---------------------------------------------------------------------------
// Auth state detection
// ---------------------------------------------------------------------------

/**
 * Checks if the page was redirected to sign-in (auth expired/missing).
 * When the stored auth state (.auth/chef.json) has an expired JWT,
 * protected routes redirect to /auth/signin.
 */
export function isOnSignInPage(page: Page): boolean {
  return page.url().includes('/auth/signin')
}

/**
 * Re-authenticates via the e2e auth endpoint if the current page is the
 * sign-in page (indicating expired auth state). Returns true if re-auth
 * was performed. Skips if already on a non-auth page.
 */
export async function ensureAuthenticated(
  page: Page,
  credentials?: { email: string; password: string }
): Promise<boolean> {
  if (!isOnSignInPage(page)) return false

  const creds = credentials || loadAgentCredentials()
  const baseUrl = page.url().split('/auth/')[0]

  const response = await page.request.post(`${baseUrl}/api/e2e/auth`, {
    data: { email: creds.email, password: creds.password },
  })

  if (!response.ok()) {
    throw new Error(
      `Re-authentication failed (${response.status()}). ` +
        'Auth state may be expired. Run globalSetup to refresh.'
    )
  }

  return true
}

// ---------------------------------------------------------------------------
// Dismissal helpers
// ---------------------------------------------------------------------------

/**
 * Dismiss any blocking modals/overlays that might appear on page load.
 */
export async function dismissOverlays(page: Page): Promise<void> {
  // Common blocking modals
  const dismissButtons = [
    page.getByRole('button', { name: /skip for now/i }).first(),
    page.getByRole('button', { name: /dismiss/i }).first(),
    page.getByRole('button', { name: /close/i }).first(),
    page.getByRole('button', { name: /got it/i }).first(),
  ]

  for (const btn of dismissButtons) {
    const visible = await btn.isVisible().catch(() => false)
    if (visible) {
      await btn.click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}
