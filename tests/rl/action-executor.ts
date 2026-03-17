// Action Executor - Safely executes RL actions in the browser.
// Handles timeouts, errors, and measures action duration.

import { Page } from '@playwright/test'
import type { RLAction } from './types'

export interface ActionResult {
  success: boolean
  durationMs: number
  pageLoadMs: number
  newConsoleErrors: string[]
  newNetworkFailures: string[]
  navigated: boolean
  error?: string
}

/**
 * Execute an action and return the result.
 * All actions are wrapped in error handling so failures are captured, not thrown.
 */
export async function executeAction(
  page: Page,
  action: RLAction,
  config: { pageLoadTimeoutMs: number }
): Promise<ActionResult> {
  const startTime = Date.now()
  const consoleErrors: string[] = []
  const networkFailures: string[] = []
  const startUrl = page.url()

  // Temporarily capture errors during this action
  const onConsoleError = (msg: import('@playwright/test').ConsoleMessage) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  }
  const onPageError = (err: Error) => {
    consoleErrors.push(err.message)
  }
  const onRequestFailed = (req: import('@playwright/test').Request) => {
    networkFailures.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText ?? 'unknown'}`)
  }

  page.on('console', onConsoleError)
  page.on('pageerror', onPageError)
  page.on('requestfailed', onRequestFailed)

  try {
    const pageLoadStart = Date.now()
    let navigated = false

    switch (action.type) {
      case 'click_nav_item':
      case 'click_link': {
        if (action.selector) {
          await page.locator(action.selector).first().click({ timeout: 5000 })
        } else if (action.text) {
          await page.getByText(action.text, { exact: false }).first().click({ timeout: 5000 })
        }
        await waitForNavigation(page, config.pageLoadTimeoutMs)
        navigated = page.url() !== startUrl
        break
      }

      case 'click_button': {
        if (action.selector && action.selector !== 'unknown') {
          await page.locator(action.selector).first().click({ timeout: 5000 })
        } else if (action.text) {
          await page.getByRole('button', { name: action.text }).first().click({ timeout: 5000 })
        }
        // Wait briefly for any state changes
        await page.waitForTimeout(300)
        navigated = page.url() !== startUrl
        break
      }

      case 'click_tab': {
        if (action.selector && action.selector !== 'unknown') {
          await page.locator(action.selector).first().click({ timeout: 5000 })
        } else if (action.text) {
          await page.getByRole('tab', { name: action.text }).first().click({ timeout: 5000 })
        }
        await page.waitForTimeout(300)
        break
      }

      case 'click_card': {
        if (action.selector) {
          await page.locator(action.selector).first().click({ timeout: 5000 })
        }
        await page.waitForTimeout(300)
        navigated = page.url() !== startUrl
        break
      }

      case 'click_dropdown_item': {
        // Click the trigger first, then the item
        if (action.selector) {
          await page.locator(action.selector).first().click({ timeout: 5000 })
          await page.waitForTimeout(200)
          if (action.value) {
            await page.getByText(action.value, { exact: false }).first().click({ timeout: 3000 })
          }
        }
        await page.waitForTimeout(300)
        break
      }

      case 'toggle_checkbox': {
        if (action.selector) {
          await page.locator(action.selector).first().click({ timeout: 5000 })
        }
        await page.waitForTimeout(200)
        break
      }

      case 'fill_text':
      case 'fill_number':
      case 'fill_textarea': {
        if (action.selector && action.value) {
          const el = page.locator(action.selector).first()
          await el.click({ timeout: 5000 })
          await el.fill(action.value, { timeout: 5000 })
        }
        await page.waitForTimeout(200)
        break
      }

      case 'fill_date': {
        if (action.selector && action.value) {
          const el = page.locator(action.selector).first()
          await el.fill(action.value, { timeout: 5000 })
        }
        await page.waitForTimeout(200)
        break
      }

      case 'select_option': {
        if (action.selector && action.value) {
          await page
            .locator(action.selector)
            .first()
            .selectOption({ label: action.value }, { timeout: 5000 })
        }
        await page.waitForTimeout(200)
        break
      }

      case 'submit_form': {
        const submitBtn = page.locator(
          'form button[type="submit"]:visible, form button:visible:has-text("Save"), form button:visible:has-text("Create"), form button:visible:has-text("Submit")'
        )
        await submitBtn.first().click({ timeout: 5000 })
        await page.waitForTimeout(1000) // Forms need more time for server round-trip
        navigated = page.url() !== startUrl
        break
      }

      case 'clear_field': {
        if (action.selector) {
          await page.locator(action.selector).first().fill('', { timeout: 5000 })
        }
        break
      }

      case 'confirm_dialog': {
        const confirmBtn = page.locator(
          '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("OK"), [role="dialog"] button:has-text("Yes")'
        )
        await confirmBtn.first().click({ timeout: 5000 })
        await page.waitForTimeout(500)
        break
      }

      case 'cancel_dialog': {
        const cancelBtn = page.locator(
          '[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("No")'
        )
        await cancelBtn.first().click({ timeout: 5000 })
        await page.waitForTimeout(300)
        break
      }

      case 'dismiss_toast': {
        const toast = page.locator('[data-sonner-toast]:visible, .toast:visible')
        await toast
          .first()
          .click({ timeout: 3000 })
          .catch(() => {
            // Toast may have auto-dismissed
          })
        await page.waitForTimeout(200)
        break
      }

      case 'scroll_down': {
        await page.evaluate(() => window.scrollBy(0, 500))
        await page.waitForTimeout(200)
        break
      }

      case 'scroll_up': {
        await page.evaluate(() => window.scrollBy(0, -500))
        await page.waitForTimeout(200)
        break
      }

      case 'go_back': {
        await page.goBack({ timeout: config.pageLoadTimeoutMs }).catch(() => {
          // Might not have history
        })
        await page.waitForTimeout(500)
        navigated = page.url() !== startUrl
        break
      }

      case 'go_home': {
        await page.goto('/dashboard', { timeout: config.pageLoadTimeoutMs, waitUntil: 'commit' })
        await page.waitForTimeout(500)
        navigated = true
        break
      }
    }

    const pageLoadMs = navigated ? Date.now() - pageLoadStart : 0

    return {
      success: true,
      durationMs: Date.now() - startTime,
      pageLoadMs,
      newConsoleErrors: consoleErrors,
      newNetworkFailures: networkFailures,
      navigated,
    }
  } catch (err) {
    return {
      success: false,
      durationMs: Date.now() - startTime,
      pageLoadMs: 0,
      newConsoleErrors: consoleErrors,
      newNetworkFailures: networkFailures,
      navigated: false,
      error: err instanceof Error ? err.message : String(err),
    }
  } finally {
    page.removeListener('console', onConsoleError)
    page.removeListener('pageerror', onPageError)
    page.removeListener('requestfailed', onRequestFailed)
  }
}

/**
 * Wait for navigation to settle (network idle or timeout).
 */
async function waitForNavigation(page: Page, timeoutMs: number): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: timeoutMs })
    // Brief additional wait for React hydration
    await page.waitForTimeout(300)
  } catch {
    // Timeout is acceptable; page may be slow but still usable
  }
}
