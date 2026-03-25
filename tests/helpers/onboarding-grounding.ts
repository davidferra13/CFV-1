import { createAdminClient } from '@/lib/db/admin'
import { expect, type Locator, type Page } from '@playwright/test'
import type { TourConfig, TourStep } from '../../lib/onboarding/tour-config'
import { getTourStorageKeys } from '../../lib/onboarding/tour-storage'

const db = createAdminClient()
const FEEDBACK_NUDGE_KEY = 'chefflow:feedback-nudge-done'

function normalizeSelectors(target: TourStep['target']) {
  return Array.isArray(target) ? target : [target]
}

function routeMatches(url: string, step: TourStep) {
  const pathname = new URL(url).pathname.replace(/\/+$/, '') || '/'
  const route = step.route.replace(/\/+$/, '') || '/'
  if (step.routeMatch === 'prefix') {
    return pathname === route || pathname.startsWith(`${route}/`)
  }
  return pathname === route
}

export async function resetTourProgress(authUserId: string) {
  const { error } = await db.from('product_tour_progress').delete().eq('auth_user_id', authUserId)

  if (error?.message?.includes("Could not find the table 'public.product_tour_progress'")) {
    return
  }

  if (error) {
    throw new Error(`Failed to reset tour progress for ${authUserId}: ${error.message}`)
  }
}

export async function primeCleanTourState(page: Page, role: TourConfig['role']) {
  const keys = getTourStorageKeys(role)

  await page.addInitScript(
    ({ scopedKeys, feedbackKey }) => {
      try {
        if (sessionStorage.getItem('__onboarding-grounding-primed') === '1') return

        localStorage.removeItem(scopedKeys.welcomeSeen)
        localStorage.removeItem(scopedKeys.tourActive)
        localStorage.removeItem(scopedKeys.tourStep)
        localStorage.removeItem('chefflow:welcome-seen')
        localStorage.removeItem('chefflow:tour-active')
        localStorage.removeItem('chefflow:tour-step')
        localStorage.setItem(feedbackKey, '1')
        sessionStorage.setItem('__onboarding-grounding-primed', '1')
      } catch {
        // Best-effort browser cleanup.
      }
    },
    { scopedKeys: keys, feedbackKey: FEEDBACK_NUDGE_KEY }
  )
}

async function findVisibleTarget(page: Page, step: TourStep) {
  for (const selector of normalizeSelectors(step.target)) {
    const locator = page.locator(selector).first()
    try {
      await expect(locator).toBeVisible({ timeout: 10_000 })
      return locator
    } catch {
      // Try the next candidate selector.
    }
  }

  throw new Error(`No visible target found for tour step "${step.id}"`)
}

async function advanceTourStep(
  page: Page,
  dialog: Locator,
  currentStep: TourStep,
  nextStep?: TourStep
) {
  const nextButton = dialog.locator('[data-tour-action="next"]').first()
  await expect(nextButton).toBeVisible({ timeout: 10_000 })
  await nextButton.click()

  if (!nextStep) {
    return
  }

  const waitForAdvance = async () => {
    if (nextStep.route !== currentStep.route || nextStep.routeMatch !== currentStep.routeMatch) {
      await expect
        .poll(() => routeMatches(page.url(), nextStep), {
          timeout: 15_000,
          message: `Expected tour step "${nextStep.id}" to load route ${nextStep.route}`,
        })
        .toBe(true)
      return
    }

    await expect(page.getByRole('dialog', { name: nextStep.title })).toBeVisible({ timeout: 5_000 })
  }

  try {
    await waitForAdvance()
  } catch {
    await nextButton.evaluate((node: HTMLElement) => node.click())
    await waitForAdvance()
  }
}

export async function runGroundedTour(page: Page, config: TourConfig, startingRoute: string) {
  page.on('console', (message) => {
    const text = message.text()
    if (text.includes('[tour]')) {
      console.log(`[browser-console] ${text}`)
    }
  })
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      console.log(`[browser-nav] ${frame.url()}`)
    }
  })

  await page.goto(startingRoute, { waitUntil: 'domcontentloaded', timeout: 90_000 })
  await expect(page.getByRole('dialog', { name: config.welcomeTitle })).toBeVisible({
    timeout: 30_000,
  })
  await page.getByRole('button', { name: 'Show Me Around' }).click()

  for (const [index, step] of config.steps.entries()) {
    await expect
      .poll(() => routeMatches(page.url(), step), {
        timeout: 90_000,
        message: `Expected tour step "${step.id}" to load route ${step.route}`,
      })
      .toBe(true)

    const dialog = page.getByRole('dialog', { name: step.title })
    await expect(dialog).toBeVisible({ timeout: 30_000 })
    await expect(dialog.getByText(step.description)).toBeVisible({ timeout: 10_000 })
    await findVisibleTarget(page, step)

    await advanceTourStep(page, dialog, step, config.steps[index + 1])
  }

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
}
