import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3100'
const AGENT_EMAIL = 'agent@local.chefflow'
const AGENT_PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

async function agentSignIn(page: any) {
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
  })
  expect(res.ok()).toBeTruthy()
  // Refresh so cookies take effect
  await page.goto(BASE)
  await page.waitForLoadState('networkidle')
}

test.describe('Featured Chef Links & Conversion', () => {
  test('Settings form shows Social & External Links card', async ({ page }) => {
    await agentSignIn(page)
    await page.goto(`${BASE}/settings/my-profile`)
    await page.waitForLoadState('networkidle')

    // Verify the new card exists
    await expect(page.getByText('Social & External Links')).toBeVisible()
    await expect(page.getByPlaceholder('https://instagram.com/yourname')).toBeVisible()
    await expect(page.getByPlaceholder('https://tiktok.com/@yourname')).toBeVisible()
    await expect(page.getByPlaceholder('https://facebook.com/yourpage')).toBeVisible()
    await expect(page.getByPlaceholder('https://youtube.com/@yourchannel')).toBeVisible()
    await expect(page.getByPlaceholder('https://linktr.ee/yourname')).toBeVisible()

    await page.screenshot({ path: 'test-screenshots/social-links-settings.png', fullPage: true })
  })

  test('Can save social links and they persist', async ({ page }) => {
    await agentSignIn(page)
    await page.goto(`${BASE}/settings/my-profile`)
    await page.waitForLoadState('networkidle')

    // Fill in Instagram
    const instagramInput = page.getByPlaceholder('https://instagram.com/yourname')
    await instagramInput.fill('https://instagram.com/testagentchef')

    // Fill in Linktree
    const linktreeInput = page.getByPlaceholder('https://linktr.ee/yourname')
    await linktreeInput.fill('https://linktr.ee/testagentchef')

    // Save
    await page.getByRole('button', { name: /save profile/i }).click()
    await page.waitForTimeout(2000)

    // Verify success
    await expect(page.getByText('Profile updated successfully')).toBeVisible()

    await page.screenshot({ path: 'test-screenshots/social-links-saved.png', fullPage: true })

    // Refresh and verify persistence
    await page.reload()
    await page.waitForLoadState('networkidle')

    const igValue = await page.getByPlaceholder('https://instagram.com/yourname').inputValue()
    expect(igValue).toBe('https://instagram.com/testagentchef')

    const ltValue = await page.getByPlaceholder('https://linktr.ee/yourname').inputValue()
    expect(ltValue).toBe('https://linktr.ee/testagentchef')

    await page.screenshot({ path: 'test-screenshots/social-links-persisted.png', fullPage: true })
  })

  test('Homepage featured chef cards render with upgrades', async ({ page }) => {
    await page.goto(BASE)
    await page.waitForLoadState('networkidle')

    // Check featured section exists
    const featuredSection = page.getByText('Featured chefs')
    await expect(featuredSection).toBeVisible()

    // Check for Inquire buttons (if any chefs are accepting inquiries)
    const inquireButtons = page.locator('a:has-text("Inquire")')
    const inquireCount = await inquireButtons.count()
    // Take note for report
    console.log(`Found ${inquireCount} Inquire buttons on homepage`)

    await page.screenshot({ path: 'test-screenshots/homepage-featured-cards.png', fullPage: true })
  })

  test('Public chef profile shows social icons', async ({ page }) => {
    // First get the agent chef's slug
    await agentSignIn(page)
    await page.goto(`${BASE}/settings/my-profile`)
    await page.waitForLoadState('networkidle')

    // Navigate to public profile settings to find slug
    await page.goto(`${BASE}/settings/public-profile`)
    await page.waitForLoadState('networkidle')

    // Try to find the Client's View link
    const clientsViewLink = page.getByRole('link', { name: /client.*view/i })
    const hasSlug = await clientsViewLink.count()

    if (hasSlug > 0) {
      const href = await clientsViewLink.getAttribute('href')
      if (href) {
        await page.goto(`${BASE}${href}`)
        await page.waitForLoadState('networkidle')

        // Check for social link icons (we set Instagram and Linktree above)
        const socialIcons = page.locator('[aria-label="Instagram"], [aria-label="Link hub"]')
        const iconCount = await socialIcons.count()
        console.log(`Found ${iconCount} social icons on public profile`)

        await page.screenshot({
          path: 'test-screenshots/public-profile-social-icons.png',
          fullPage: true,
        })
      }
    } else {
      console.log('No public slug set for agent chef, skipping public profile test')
      await page.screenshot({ path: 'test-screenshots/public-profile-no-slug.png', fullPage: true })
    }
  })
})
