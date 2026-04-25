import type { Page } from '@playwright/test'
import { test, expect } from '../helpers/fixtures'

const CHEF_EMAIL = 'e2e.chef.canonical@chefflow.test'
const CHEF_PASSWORD = 'E2eChefTest!2026'

async function authenticateChef(page: Page) {
  const response = await page.request.post('/api/e2e/auth', {
    data: {
      email: CHEF_EMAIL,
      password: CHEF_PASSWORD,
    },
    timeout: 120_000,
  })

  expect(
    response.ok(),
    `E2E auth failed: ${response.status()} ${await response.text()}`
  ).toBeTruthy()
}

async function openTaskCreatePanel(page: Page, selectedDate: string) {
  await page.goto(`/tasks?date=${selectedDate}&new=1`)
  await page.waitForLoadState('domcontentloaded')
  await expect(page.getByText('New Task')).toBeVisible({ timeout: 120_000 })
  await expect(page.getByLabel('Title')).toBeVisible({ timeout: 120_000 })
  await expect(page.getByLabel('Due date')).toHaveValue(selectedDate)
}

function getCreateTaskForm(page: Page) {
  return page.locator('form').filter({ has: page.getByRole('button', { name: 'Create Task' }) })
}

async function submitCreateTaskForm(page: Page) {
  await getCreateTaskForm(page).evaluate((form) => (form as HTMLFormElement).requestSubmit())
}

test.describe('canonical /tasks create path', () => {
  test('creates a task from the real New Task form and persists after reload', async ({ page }) => {
    test.setTimeout(240_000)

    const selectedDate = '2031-02-10'
    const title = `Canonical task create ${Date.now()}`

    await authenticateChef(page)
    await openTaskCreatePanel(page, selectedDate)
    await page.getByLabel('Title').fill(title)
    await submitCreateTaskForm(page)

    await expect(page).toHaveURL(new RegExp(`/tasks\\?date=${selectedDate}$`), {
      timeout: 120_000,
    })
    await expect(page.getByText(title)).toBeVisible({ timeout: 120_000 })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByText(title)).toBeVisible({ timeout: 120_000 })
  })

  test('keeps the create panel open with draft state after invalid assignee failure', async ({
    page,
  }) => {
    test.setTimeout(240_000)

    const selectedDate = '2031-02-11'
    const title = `Canonical task failure ${Date.now()}`

    await authenticateChef(page)
    await openTaskCreatePanel(page, selectedDate)
    await page.getByLabel('Title').fill(title)
    await page.locator('select[name="assigned_to"]').evaluate((element) => {
      const select = element as HTMLSelectElement
      const option = document.createElement('option')
      option.value = 'not-a-uuid'
      option.textContent = 'Invalid assignee'
      select.append(option)
      select.value = option.value
      select.dispatchEvent(new Event('change', { bubbles: true }))
    })
    await submitCreateTaskForm(page)

    await expect(page.getByRole('button', { name: 'Create Task' })).toBeVisible({
      timeout: 120_000,
    })
    await expect(page.getByLabel('Title')).toHaveValue(title, { timeout: 120_000 })

    const errorAlert = page.locator('p[role="alert"]')
    await expect(errorAlert).toBeVisible({ timeout: 120_000 })
    await expect(errorAlert).toContainText(/invalid uuid/i, { timeout: 120_000 })
  })
})
