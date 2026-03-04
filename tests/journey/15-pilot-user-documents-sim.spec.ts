// Pilot User Simulation — Event Documents Workflow
// Validates that a simulated private-chef user can complete the core
// document workflow without manual engineering support.
//
// Run:
//   npx playwright test --project=journey-chef tests/journey/15-pilot-user-documents-sim.spec.ts

import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

type PilotSeedAuth = {
  chefEmail: string
  chefPassword: string
}

async function gotoWithChefAuthFallback(page: Page, path: string, auth: PilotSeedAuth) {
  await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.waitForTimeout(1500)

  if (!page.url().includes('/auth/signin')) return

  const authResp = await page.request.post('/api/e2e/auth', {
    data: { email: auth.chefEmail, password: auth.chefPassword },
    timeout: 90_000,
  })
  expect(authResp.ok()).toBeTruthy()

  await page.goto(path, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.waitForTimeout(1500)
}

test.describe('Pilot Simulation — Documents Readiness', () => {
  test.describe.configure({ timeout: 180_000 })

  test('simulated pilot user can complete event documents workflow end-to-end', async ({
    page,
    seedIds,
  }) => {
    const eventId = seedIds.eventIds.confirmed
    const summary: Record<string, unknown> = {
      eventId,
      checks: [],
    }

    await test.step('Open Event Documents hub', async () => {
      await gotoWithChefAuthFallback(page, `/events/${eventId}/documents`, {
        chefEmail: seedIds.chefEmail,
        chefPassword: seedIds.chefPassword,
      })

      expect(page.url()).not.toContain('/auth/signin')
      await expect(page.getByRole('heading', { name: /Event Documents/i })).toBeVisible()
      await expect(page.getByRole('heading', { name: /Quick Start/i })).toBeVisible()
      await expect(page.getByText(/Step 1/i)).toBeVisible()
      await expect(page.getByText(/Step 2/i)).toBeVisible()
      await expect(page.getByText(/Step 3/i)).toBeVisible()
      ;(summary.checks as unknown[]).push('documents_hub_loaded')
    })

    await test.step('Run primary one-click generation action (if enabled)', async () => {
      const primaryAction = page.getByRole('button', {
        name: /Generate (Missing|Ready) PDFs/i,
      })
      await expect(primaryAction).toBeVisible()
      const enabled = !(await primaryAction.isDisabled())
      summary['primaryActionEnabled'] = enabled

      if (enabled) {
        await primaryAction.click()
        ;(summary.checks as unknown[]).push('primary_generation_action_clicked')

        const lastRunLocator = page.getByText(/Last run:/i).first()
        const lastRunVisible = await lastRunLocator
          .isVisible({ timeout: 15_000 })
          .catch(() => false)
        summary['primaryActionLastRunVisible'] = lastRunVisible

        if (lastRunVisible) {
          const lastRunLine = (await lastRunLocator.textContent()) ?? ''
          summary['lastRunLine'] = lastRunLine.trim()
          ;(summary.checks as unknown[]).push('primary_generation_action_executed')
        } else {
          summary['lastRunLine'] = 'Not rendered within timeout; validated by direct API checks.'
        }
      } else {
        summary['lastRunLine'] = 'Primary action disabled because no docs were ready.'
        ;(summary.checks as unknown[]).push('primary_generation_action_not_required')
      }
    })

    await test.step('Verify PDF and export endpoints used by pilot workflow', async () => {
      const printAllResp = await page.request.get(`/api/documents/${eventId}?type=all`)
      expect(printAllResp.ok()).toBeTruthy()
      expect((printAllResp.headers()['content-type'] ?? '').toLowerCase()).toContain(
        'application/pdf'
      )
      summary['printAllStatus'] = printAllResp.status()

      const bulkResp = await page.request.post(`/api/documents/${eventId}/bulk-generate`, {
        data: { types: ['summary'] },
      })
      expect(bulkResp.ok()).toBeTruthy()
      const bulkJson = (await bulkResp.json()) as {
        runId?: string
        total?: number
        failed?: number
      }
      expect(typeof bulkJson.runId).toBe('string')
      summary['bulkGenerateStatus'] = bulkResp.status()
      summary['bulkRunId'] = bulkJson.runId ?? null
      summary['bulkTotal'] = bulkJson.total ?? null
      summary['bulkFailed'] = bulkJson.failed ?? null

      const exportResp = await page.request.get(
        `/api/documents/snapshots/export?eventId=${eventId}`
      )
      expect(exportResp.ok()).toBeTruthy()
      expect((exportResp.headers()['content-type'] ?? '').toLowerCase()).toContain('text/csv')
      summary['archiveExportStatus'] = exportResp.status()

      const blankTemplateResp = await page.request.get('/api/documents/templates/event-summary')
      expect(blankTemplateResp.ok()).toBeTruthy()
      const blankTemplateContentType = (
        blankTemplateResp.headers()['content-type'] ?? ''
      ).toLowerCase()
      expect(blankTemplateContentType).toContain('text/markdown')
      const blankTemplateBody = await blankTemplateResp.text()
      expect(blankTemplateBody.trim().length).toBeGreaterThan(0)
      summary['blankTemplateStatus'] = blankTemplateResp.status()
      summary['blankTemplateContentType'] = blankTemplateContentType
      ;(summary.checks as unknown[]).push('core_endpoints_verified')
    })

    await test.info().attach('pilot-documents-simulation-summary', {
      body: JSON.stringify(summary, null, 2),
      contentType: 'application/json',
    })
  })

  test('simulated pilot user can find the global grab-anything documents entry point', async ({
    page,
    seedIds,
  }) => {
    await gotoWithChefAuthFallback(page, '/documents', {
      chefEmail: seedIds.chefEmail,
      chefPassword: seedIds.chefPassword,
    })

    const serverErrorHeading = page.getByRole('heading', { name: /Server Error/i })
    const firstLoadErrored = await serverErrorHeading.isVisible().catch(() => false)
    if (firstLoadErrored) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 60_000 })
      await page.waitForTimeout(1500)
    }

    expect(page.url()).not.toContain('/auth/signin')
    await expect(page.getByRole('heading', { name: /Grab Anything Documents/i })).toBeVisible({
      timeout: 20_000,
    })
    await expect(page.getByRole('link', { name: /Open Hub/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Print Pack/i }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Print All/i }).first()).toBeVisible()
  })
})
