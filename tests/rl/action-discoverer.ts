// Action Discoverer - Scans the current page to find all available actions.
// Returns a list of RLActions the agent can choose from.

import { Page, Locator } from '@playwright/test'
import type { RLAction, ActionType } from './types'

/**
 * Discover all available actions on the current page.
 * Scans for clickable elements, form inputs, navigation items, etc.
 */
export async function discoverActions(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []

  // Always-available actions
  actions.push({ type: 'go_back' })
  actions.push({ type: 'go_home' })
  actions.push({ type: 'scroll_down' })
  actions.push({ type: 'scroll_up' })

  // Discover page-specific actions in parallel
  const [navActions, buttonActions, linkActions, tabActions, formActions, dialogActions] =
    await Promise.all([
      discoverNavItems(page),
      discoverButtons(page),
      discoverLinks(page),
      discoverTabs(page),
      discoverFormActions(page),
      discoverDialogActions(page),
    ])

  actions.push(
    ...navActions,
    ...buttonActions,
    ...linkActions,
    ...tabActions,
    ...formActions,
    ...dialogActions
  )

  return deduplicateActions(actions)
}

// ── Navigation Items ─────────────────────────────────────────────────────────

async function discoverNavItems(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    const navLinks = page.locator('nav a[href]:visible, [role="navigation"] a[href]:visible')
    const count = await navLinks.count().catch(() => 0)
    const limit = Math.min(count, 30) // Cap to prevent slowness

    for (let i = 0; i < limit; i++) {
      const el = navLinks.nth(i)
      const [text, href, selector] = await Promise.all([
        el.textContent().catch(() => ''),
        el.getAttribute('href').catch(() => ''),
        buildSelector(el),
      ])
      if (href && text?.trim()) {
        actions.push({
          type: 'click_nav_item',
          selector: selector,
          text: text.trim().substring(0, 50),
          href: href,
        })
      }
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Buttons ──────────────────────────────────────────────────────────────────

async function discoverButtons(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    const buttons = page.locator('button:visible:not(:disabled)')
    const count = await buttons.count().catch(() => 0)
    const limit = Math.min(count, 20)

    for (let i = 0; i < limit; i++) {
      const el = buttons.nth(i)
      const [text, selector] = await Promise.all([
        el.textContent().catch(() => ''),
        buildSelector(el),
      ])
      if (text?.trim()) {
        actions.push({
          type: 'click_button',
          selector: selector,
          text: text.trim().substring(0, 50),
        })
      }
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Links ────────────────────────────────────────────────────────────────────

async function discoverLinks(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    // Exclude nav links (already captured) and anchor-only links
    const links = page.locator(
      'main a[href]:visible, [role="main"] a[href]:visible, .content a[href]:visible'
    )
    const count = await links.count().catch(() => 0)
    const limit = Math.min(count, 15)

    for (let i = 0; i < limit; i++) {
      const el = links.nth(i)
      const [text, href, selector] = await Promise.all([
        el.textContent().catch(() => ''),
        el.getAttribute('href').catch(() => ''),
        buildSelector(el),
      ])
      if (href && !href.startsWith('#') && text?.trim()) {
        actions.push({
          type: 'click_link',
          selector: selector,
          text: text.trim().substring(0, 50),
          href: href,
        })
      }
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

async function discoverTabs(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    const tabs = page.locator(
      '[role="tab"]:visible:not([aria-selected="true"]):not([data-state="active"])'
    )
    const count = await tabs.count().catch(() => 0)
    const limit = Math.min(count, 10)

    for (let i = 0; i < limit; i++) {
      const el = tabs.nth(i)
      const [text, selector] = await Promise.all([
        el.textContent().catch(() => ''),
        buildSelector(el),
      ])
      if (text?.trim()) {
        actions.push({
          type: 'click_tab',
          selector: selector,
          text: text.trim().substring(0, 50),
        })
      }
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Form Actions ─────────────────────────────────────────────────────────────

async function discoverFormActions(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    const formExists = await page
      .locator('form:visible')
      .count()
      .catch(() => 0)
    if (formExists === 0) return actions

    // Text inputs
    const textInputs = page.locator(
      'form input[type="text"]:visible, form input:not([type]):visible, form input[type="email"]:visible, form input[type="tel"]:visible'
    )
    const textCount = await textInputs.count().catch(() => 0)
    for (let i = 0; i < Math.min(textCount, 10); i++) {
      const el = textInputs.nth(i)
      const [name, placeholder, selector] = await Promise.all([
        el.getAttribute('name').catch(() => ''),
        el.getAttribute('placeholder').catch(() => ''),
        buildSelector(el),
      ])
      actions.push({
        type: 'fill_text',
        selector: selector,
        text: name || placeholder || `input-${i}`,
        value: generateTestValue(name || placeholder || ''),
      })
    }

    // Number inputs
    const numberInputs = page.locator('form input[type="number"]:visible')
    const numCount = await numberInputs.count().catch(() => 0)
    for (let i = 0; i < Math.min(numCount, 5); i++) {
      const el = numberInputs.nth(i)
      const selector = await buildSelector(el)
      actions.push({
        type: 'fill_number',
        selector: selector,
        value: String(Math.floor(Math.random() * 100) + 1),
      })
    }

    // Date inputs
    const dateInputs = page.locator(
      'form input[type="date"]:visible, form input[type="datetime-local"]:visible'
    )
    const dateCount = await dateInputs.count().catch(() => 0)
    for (let i = 0; i < Math.min(dateCount, 3); i++) {
      const el = dateInputs.nth(i)
      const selector = await buildSelector(el)
      // Generate a date 7-30 days in the future
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 7 + Math.floor(Math.random() * 23))
      actions.push({
        type: 'fill_date',
        selector: selector,
        value: futureDate.toISOString().split('T')[0],
      })
    }

    // Textareas
    const textareas = page.locator('form textarea:visible')
    const taCount = await textareas.count().catch(() => 0)
    for (let i = 0; i < Math.min(taCount, 3); i++) {
      const el = textareas.nth(i)
      const selector = await buildSelector(el)
      actions.push({
        type: 'fill_textarea',
        selector: selector,
        value: 'RL agent test input for this field.',
      })
    }

    // Select dropdowns
    const selects = page.locator('form select:visible')
    const selCount = await selects.count().catch(() => 0)
    for (let i = 0; i < Math.min(selCount, 5); i++) {
      const el = selects.nth(i)
      const selector = await buildSelector(el)
      // Get available options
      const options = await el
        .locator('option')
        .allTextContents()
        .catch(() => [])
      if (options.length > 1) {
        // Pick a random non-empty option
        const nonEmpty = options.filter((o) => o.trim() !== '' && o.trim() !== 'Select...')
        if (nonEmpty.length > 0) {
          const picked = nonEmpty[Math.floor(Math.random() * nonEmpty.length)]
          actions.push({
            type: 'select_option',
            selector: selector,
            value: picked.trim(),
          })
        }
      }
    }

    // Checkboxes
    const checkboxes = page.locator('form input[type="checkbox"]:visible')
    const cbCount = await checkboxes.count().catch(() => 0)
    for (let i = 0; i < Math.min(cbCount, 5); i++) {
      const el = checkboxes.nth(i)
      const selector = await buildSelector(el)
      actions.push({ type: 'toggle_checkbox', selector: selector })
    }

    // Submit button
    const submitBtn = page.locator(
      'form button[type="submit"]:visible, form button:visible:has-text("Save"), form button:visible:has-text("Create"), form button:visible:has-text("Submit")'
    )
    const submitCount = await submitBtn.count().catch(() => 0)
    if (submitCount > 0) {
      actions.push({ type: 'submit_form' })
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Dialog Actions ───────────────────────────────────────────────────────────

async function discoverDialogActions(page: Page): Promise<RLAction[]> {
  const actions: RLAction[] = []
  try {
    const dialogVisible = await page
      .locator('[role="dialog"]:visible, [data-state="open"]:visible')
      .count()
      .catch(() => 0)

    if (dialogVisible > 0) {
      // Look for confirm/cancel buttons inside dialogs
      const confirmBtn = page.locator(
        '[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("OK"), [role="dialog"] button:has-text("Yes")'
      )
      if ((await confirmBtn.count().catch(() => 0)) > 0) {
        actions.push({ type: 'confirm_dialog' })
      }

      const cancelBtn = page.locator(
        '[role="dialog"] button:has-text("Cancel"), [role="dialog"] button:has-text("Close"), [role="dialog"] button:has-text("No")'
      )
      if ((await cancelBtn.count().catch(() => 0)) > 0) {
        actions.push({ type: 'cancel_dialog' })
      }
    }

    // Toast dismissal
    const toastVisible = await page
      .locator('[data-sonner-toast]:visible, .toast:visible')
      .count()
      .catch(() => 0)
    if (toastVisible > 0) {
      actions.push({ type: 'dismiss_toast' })
    }
  } catch {
    // Page might be navigating
  }
  return actions
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a CSS selector for a Playwright locator element.
 * Falls back to nth-of-type selectors when no unique identifier exists.
 */
async function buildSelector(el: Locator): Promise<string> {
  try {
    // Try data-testid first
    const testId = await el.getAttribute('data-testid').catch(() => null)
    if (testId) return `[data-testid="${testId}"]`

    // Try id
    const id = await el.getAttribute('id').catch(() => null)
    if (id) return `#${id}`

    // Try name (for form elements)
    const name = await el.getAttribute('name').catch(() => null)
    if (name) return `[name="${name}"]`

    // Try aria-label
    const ariaLabel = await el.getAttribute('aria-label').catch(() => null)
    if (ariaLabel) return `[aria-label="${ariaLabel}"]`

    // Fallback: use the locator's own string representation
    return el.toString()
  } catch {
    return 'unknown'
  }
}

/**
 * Generate a realistic test value based on the field name/placeholder.
 */
function generateTestValue(fieldHint: string): string {
  const hint = fieldHint.toLowerCase()

  if (hint.includes('email')) return 'rlagent@test.cheflowhq.com'
  if (hint.includes('phone') || hint.includes('tel')) return '555-0199'
  if (hint.includes('name') || hint.includes('title')) return 'RL Agent Test'
  if (hint.includes('address') || hint.includes('location')) return '123 Test Street'
  if (hint.includes('city')) return 'Test City'
  if (hint.includes('zip') || hint.includes('postal')) return '90210'
  if (hint.includes('price') || hint.includes('amount') || hint.includes('cost')) return '5000'
  if (hint.includes('guest') || hint.includes('count') || hint.includes('quantity')) return '8'
  if (hint.includes('note') || hint.includes('description') || hint.includes('comment'))
    return 'Test input from RL agent exploration.'
  if (hint.includes('url') || hint.includes('website')) return 'https://test.example.com'

  return 'RL Test Value'
}

/**
 * Remove duplicate actions (same type + selector).
 */
function deduplicateActions(actions: RLAction[]): RLAction[] {
  const seen = new Set<string>()
  return actions.filter((action) => {
    const key = `${action.type}::${action.selector ?? ''}::${action.text ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
