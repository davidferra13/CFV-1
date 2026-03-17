// State Observer - Extracts the current UI state from a Playwright page.
// Uses DOM queries and CDP metrics to build a complete state snapshot.

import { Page } from '@playwright/test'
import type { RLState } from './types'
import { hashState } from './types'

/**
 * Observe the current state of the page.
 * Collects route info, UI state, form state, data state, and performance metrics.
 */
export async function observeState(page: Page): Promise<RLState> {
  const url = new URL(page.url())
  const route = normalizeRoute(url.pathname)
  const routeGroup = detectRouteGroup(route)

  // Collect all state signals in parallel where possible
  const [uiState, formState, dataState, perfMetrics] = await Promise.all([
    collectUIState(page),
    collectFormState(page),
    collectDataState(page),
    collectPerformanceMetrics(page),
  ])

  const pageTitle = await page.title().catch(() => '')

  return {
    route,
    pageTitle,
    routeGroup,
    ...uiState,
    ...formState,
    ...dataState,
    ...perfMetrics,
  }
}

/**
 * Observe state and return both the state object and its hash.
 */
export async function observeStateWithHash(page: Page): Promise<{ state: RLState; hash: string }> {
  const state = await observeState(page)
  return { state, hash: hashState(state) }
}

// ── Route Processing ─────────────────────────────────────────────────────────

/**
 * Normalize a route by replacing dynamic segments (UUIDs, numbers) with placeholders.
 * This groups similar pages together in the Q-table.
 */
function normalizeRoute(pathname: string): string {
  return (
    pathname
      // Replace UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id')
      // Remove trailing slash
      .replace(/\/$/, '') || '/'
  )
}

function detectRouteGroup(route: string): string {
  if (
    route.startsWith('/dashboard') ||
    route.startsWith('/events') ||
    route.startsWith('/clients') ||
    route.startsWith('/inquiries') ||
    route.startsWith('/quotes') ||
    route.startsWith('/financials') ||
    route.startsWith('/calendar') ||
    route.startsWith('/settings') ||
    route.startsWith('/culinary') ||
    route.startsWith('/menus') ||
    route.startsWith('/recipes') ||
    route.startsWith('/analytics') ||
    route.startsWith('/staff') ||
    route.startsWith('/inbox') ||
    route.startsWith('/campaigns') ||
    route.startsWith('/network') ||
    route.startsWith('/prospecting') ||
    route.startsWith('/aar') ||
    route.startsWith('/expenses') ||
    route.startsWith('/daily-ops')
  ) {
    return 'chef'
  }
  if (route.startsWith('/my-events') || route.startsWith('/my-profile')) {
    return 'client'
  }
  if (route.startsWith('/admin')) return 'admin'
  if (route.startsWith('/staff-dashboard')) return 'staff'
  if (route.startsWith('/partner')) return 'partner'
  if (route.startsWith('/auth')) return 'auth'
  return 'public'
}

// ── UI State ─────────────────────────────────────────────────────────────────

async function collectUIState(page: Page): Promise<{
  visibleModals: string[]
  activeTab: string | null
  toastVisible: boolean
  toastType: string | null
  loadingSpinners: number
  sidebarExpanded: boolean
}> {
  return page.evaluate(() => {
    // Modals/Dialogs
    const modals = Array.from(
      document.querySelectorAll('[role="dialog"]:not([hidden]), [data-state="open"]')
    )
    const visibleModals = modals
      .filter((m) => {
        const style = window.getComputedStyle(m)
        return style.display !== 'none' && style.visibility !== 'hidden'
      })
      .map((m) => m.getAttribute('aria-label') || m.id || 'unknown')

    // Active tab
    const activeTabEl = document.querySelector(
      '[role="tab"][aria-selected="true"], [role="tab"][data-state="active"]'
    )
    const activeTab = activeTabEl?.textContent?.trim() || null

    // Toast
    const toast = document.querySelector('[data-sonner-toast], .toast, [role="status"]')
    const toastVisible = !!toast
    let toastType: string | null = null
    if (toast) {
      const classes = toast.className || ''
      if (classes.includes('success') || toast.getAttribute('data-type') === 'success')
        toastType = 'success'
      else if (classes.includes('error') || toast.getAttribute('data-type') === 'error')
        toastType = 'error'
      else toastType = 'info'
    }

    // Loading spinners
    const spinners = document.querySelectorAll(
      '.animate-spin, [data-loading="true"], .skeleton, [aria-busy="true"]'
    )
    const loadingSpinners = spinners.length

    // Sidebar
    const sidebar = document.querySelector('nav, [role="navigation"]')
    const sidebarExpanded = sidebar ? sidebar.clientWidth > 60 : true

    return { visibleModals, activeTab, toastVisible, toastType, loadingSpinners, sidebarExpanded }
  })
}

// ── Form State ───────────────────────────────────────────────────────────────

async function collectFormState(page: Page): Promise<{
  formPresent: boolean
  formFieldCount: number
  formFilledCount: number
  formErrors: string[]
}> {
  return page.evaluate(() => {
    const form = document.querySelector('form')
    if (!form) {
      return { formPresent: false, formFieldCount: 0, formFilledCount: 0, formErrors: [] }
    }

    const inputs = form.querySelectorAll('input, textarea, select')
    let filledCount = 0
    inputs.forEach((input) => {
      const el = input as HTMLInputElement
      if (el.value && el.value.trim() !== '') filledCount++
    })

    // Visible validation errors
    const errorEls = form.querySelectorAll(
      '.text-red-500, .text-destructive, [role="alert"], .error-message, [data-error="true"]'
    )
    const formErrors = Array.from(errorEls)
      .map((el) => el.textContent?.trim() || '')
      .filter(Boolean)
      .slice(0, 5) // Cap at 5 to prevent huge state

    return {
      formPresent: true,
      formFieldCount: inputs.length,
      formFilledCount: filledCount,
      formErrors,
    }
  })
}

// ── Data State ───────────────────────────────────────────────────────────────

async function collectDataState(page: Page): Promise<{
  listItemCount: number
  emptyState: boolean
  errorState: boolean
}> {
  return page.evaluate(() => {
    // Count list/table items
    const tableRows = document.querySelectorAll('tbody tr, [role="row"]')
    const listItems = document.querySelectorAll('[role="listitem"], .list-item, ul > li')
    const cards = document.querySelectorAll('[data-card], .card')
    const listItemCount = Math.max(tableRows.length, listItems.length, cards.length)

    // Empty state detection
    const emptyIndicators = document.querySelectorAll(
      '.empty-state, [data-empty], [data-testid="empty-state"]'
    )
    const emptyText = document.body.textContent?.toLowerCase() || ''
    const hasEmptyPhrase =
      emptyText.includes('no results') ||
      emptyText.includes('nothing here') ||
      emptyText.includes('get started') ||
      emptyText.includes('no events yet') ||
      emptyText.includes('no clients yet')
    const emptyState = emptyIndicators.length > 0 || (listItemCount === 0 && hasEmptyPhrase)

    // Error state detection
    const errorIndicators = document.querySelectorAll(
      '.error-boundary, [data-error], [role="alert"][data-type="error"]'
    )
    const hasErrorPhrase =
      emptyText.includes('something went wrong') ||
      emptyText.includes('error loading') ||
      emptyText.includes('failed to load') ||
      emptyText.includes('could not load')
    const errorState = errorIndicators.length > 0 || hasErrorPhrase

    return { listItemCount, emptyState, errorState }
  })
}

// ── Performance Metrics (CDP) ────────────────────────────────────────────────

async function collectPerformanceMetrics(page: Page): Promise<{
  domNodeCount: number
  heapUsedMB: number
  consoleErrors: number
  networkFailures: number
}> {
  try {
    const cdp = await page.context().newCDPSession(page)
    try {
      await cdp.send('Performance.enable')
      const { metrics } = await cdp.send('Performance.getMetrics')

      const heapUsed = metrics.find((m: { name: string }) => m.name === 'JSHeapUsedSize')
      const domNodes = metrics.find((m: { name: string }) => m.name === 'Nodes')

      return {
        domNodeCount: domNodes?.value ?? 0,
        heapUsedMB: heapUsed ? heapUsed.value / (1024 * 1024) : 0,
        consoleErrors: 0, // Tracked separately by the episode runner
        networkFailures: 0, // Tracked separately by the episode runner
      }
    } finally {
      await cdp.detach()
    }
  } catch {
    // CDP might fail if page is navigating; return zeros
    return { domNodeCount: 0, heapUsedMB: 0, consoleErrors: 0, networkFailures: 0 }
  }
}
