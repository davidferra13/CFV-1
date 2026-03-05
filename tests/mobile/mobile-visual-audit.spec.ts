import { existsSync, mkdirSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'
import { buildMobileAuditRoutes, type MobileAuditRole } from './helpers/mobile-route-catalog'
import {
  captureLayoutProbe,
  MOBILE_VIEWPORTS_FULL,
  MOBILE_VIEWPORTS_QUICK,
  shouldIgnoreConsoleError,
  slugifyPath,
  type MobileViewport,
} from './helpers/mobile-audit-rules'

type AuditState = 'default' | 'menu_open' | 'cookie_banner'

type AuditFailure = {
  role: MobileAuditRole
  path: string
  viewport: string
  state: AuditState
  reason: string
  details?: string
}

type RoleStorageConfig = {
  role: MobileAuditRole
  storageState?: string
}

const ROLE_STORAGE: RoleStorageConfig[] = [
  { role: 'public' },
  { role: 'chef', storageState: '.auth/chef.json' },
  { role: 'client', storageState: '.auth/client.json' },
  { role: 'admin', storageState: '.auth/admin.json' },
]

const QUICK_MAX_ROUTES_PER_ROLE = 35
const DEFAULT_WAIT_MS = 500
const MIN_OVERFLOW_FAIL_PX = 4

function timestampTag() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function getAuditMode(): 'quick' | 'full' {
  const value = String(process.env.MOBILE_AUDIT_MODE || 'quick').toLowerCase()
  return value === 'full' ? 'full' : 'quick'
}

function getAuditScope(): 'public' | 'all' {
  const value = String(process.env.MOBILE_AUDIT_SCOPE || 'all').toLowerCase()
  return value === 'public' ? 'public' : 'all'
}

function chooseViewports(mode: 'quick' | 'full'): MobileViewport[] {
  return mode === 'full' ? MOBILE_VIEWPORTS_FULL : MOBILE_VIEWPORTS_QUICK
}

function routeStates(role: MobileAuditRole, path: string): AuditState[] {
  const states: AuditState[] = ['default']
  if (role === 'public' && path === '/') {
    states.push('menu_open')
    states.push('cookie_banner')
  }
  return states
}

function shouldRunRole(role: MobileAuditRole, scope: 'public' | 'all'): boolean {
  if (scope === 'public') return role === 'public'
  return true
}

function trimRoutesForMode(
  routes: ReturnType<typeof buildMobileAuditRoutes>,
  mode: 'quick' | 'full'
) {
  if (mode === 'full') return routes
  const byRole = new Map<MobileAuditRole, number>()
  return routes.filter((route) => {
    const count = byRole.get(route.role) ?? 0
    if (count >= QUICK_MAX_ROUTES_PER_ROLE) return false
    byRole.set(route.role, count + 1)
    return true
  })
}

async function openMobileMenuIfPresent(page: Page) {
  const selectors = [
    'button[aria-label*="menu" i]',
    'button[aria-label*="navigation" i]',
    '[data-testid="mobile-menu-toggle"]',
  ]
  for (const selector of selectors) {
    const button = page.locator(selector).first()
    if (await button.count()) {
      if (await button.isVisible()) {
        await button.click()
        await page.waitForTimeout(250)
        return
      }
    }
  }
}

async function forceCookieBanner(page: Page) {
  await page.evaluate(() => {
    localStorage.removeItem('cf-cookie-consent-dismissed-until')
    document.cookie = 'cookieConsent=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(250)
}

test.describe('Mobile Visual Audit', () => {
  test('whole-site mobile layout audit', async ({ browser, seedIds }) => {
    test.setTimeout(60 * 60 * 1000)

    const mode = getAuditMode()
    const scope = getAuditScope()
    const viewports = chooseViewports(mode)
    const harvestedRoutes = buildMobileAuditRoutes(seedIds)
    const allRoutes = trimRoutesForMode(harvestedRoutes, mode).filter((route) =>
      shouldRunRole(route.role, scope)
    )

    const runTag = timestampTag()
    const runDir = resolve('reports', 'mobile-audit', runTag)
    mkdirSync(runDir, { recursive: true })

    const failures: AuditFailure[] = []
    const executed: Array<{
      role: MobileAuditRole
      path: string
      viewport: string
      state: AuditState
      screenshot: string
      overflowX: number
    }> = []

    for (const roleConfig of ROLE_STORAGE) {
      if (!shouldRunRole(roleConfig.role, scope)) continue
      if (roleConfig.storageState && !existsSync(roleConfig.storageState)) {
        failures.push({
          role: roleConfig.role,
          path: '(role bootstrap)',
          viewport: '-',
          state: 'default',
          reason: 'missing_storage_state',
          details: `${roleConfig.storageState} not found`,
        })
        continue
      }

      for (const route of allRoutes.filter((item) => item.role === roleConfig.role)) {
        for (const viewport of viewports) {
          for (const state of routeStates(route.role, route.path)) {
            const context = await browser.newContext({
              storageState: roleConfig.storageState,
              viewport: { width: viewport.width, height: viewport.height },
            })
            const page = await context.newPage()

            const consoleErrors: string[] = []
            page.on('console', (msg) => {
              if (msg.type() !== 'error') return
              const text = msg.text()
              if (!shouldIgnoreConsoleError(text)) {
                consoleErrors.push(text)
              }
            })

            const pageErrors: string[] = []
            page.on('pageerror', (err) => {
              pageErrors.push(err.message)
            })

            try {
              const response = await page.goto(route.path, {
                waitUntil: 'domcontentloaded',
                timeout: 90_000,
              })
              const status = response?.status() ?? 0
              if (status >= 500) {
                failures.push({
                  role: route.role,
                  path: route.path,
                  viewport: viewport.name,
                  state,
                  reason: 'http_5xx',
                  details: `status=${status}`,
                })
              }

              await page.waitForTimeout(DEFAULT_WAIT_MS)

              if (state === 'menu_open') {
                await openMobileMenuIfPresent(page)
              } else if (state === 'cookie_banner') {
                await forceCookieBanner(page)
              }

              const probe = await captureLayoutProbe(page)
              if (probe.overflowX > MIN_OVERFLOW_FAIL_PX) {
                const culpritText =
                  probe.overflowCulprits.length > 0
                    ? ` culprits=${probe.overflowCulprits
                        .map(
                          (item) =>
                            `${item.selector}[w=${item.width},l=${item.left},r=${item.right},or=${item.overflowRight},ol=${item.overflowLeft}]`
                        )
                        .join(', ')}`
                    : ''
                failures.push({
                  role: route.role,
                  path: route.path,
                  viewport: viewport.name,
                  state,
                  reason: 'horizontal_overflow',
                  details: `overflowX=${probe.overflowX} scrollWidth=${probe.scrollWidth} viewportWidth=${probe.viewportWidth}${culpritText}`,
                })
              }

              if (consoleErrors.length > 0) {
                failures.push({
                  role: route.role,
                  path: route.path,
                  viewport: viewport.name,
                  state,
                  reason: 'console_error',
                  details: consoleErrors.join(' | '),
                })
              }

              if (pageErrors.length > 0) {
                failures.push({
                  role: route.role,
                  path: route.path,
                  viewport: viewport.name,
                  state,
                  reason: 'page_error',
                  details: pageErrors.join(' | '),
                })
              }

              const roleDir = join(runDir, route.role, viewport.name)
              mkdirSync(roleDir, { recursive: true })
              const screenshotFile = join(roleDir, `${slugifyPath(route.path)}--${state}.png`)
              await page.screenshot({ path: screenshotFile, fullPage: true })
              executed.push({
                role: route.role,
                path: route.path,
                viewport: viewport.name,
                state,
                screenshot: screenshotFile,
                overflowX: probe.overflowX,
              })
            } catch (error) {
              failures.push({
                role: route.role,
                path: route.path,
                viewport: viewport.name,
                state,
                reason: 'navigation_exception',
                details: error instanceof Error ? error.message : String(error),
              })
            } finally {
              await context.close()
            }
          }
        }
      }
    }

    const summary = {
      mode,
      scope,
      generatedAt: new Date().toISOString(),
      totals: {
        routes: allRoutes.length,
        executions: executed.length,
        failures: failures.length,
      },
      failures,
    }

    const summaryPath = join(runDir, 'summary.json')
    writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8')
    writeFileSync(
      resolve('reports', 'mobile-audit', 'latest.json'),
      JSON.stringify(summary, null, 2)
    )

    expect(
      failures,
      `Mobile audit failed. See ${summaryPath} for details. First failure: ${failures[0]?.reason ?? 'n/a'}`
    ).toHaveLength(0)
  })
})
