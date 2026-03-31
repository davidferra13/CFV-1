// Quick Playwright verification script - runs outside the test framework
// to avoid global setup issues
import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'
const AGENT_EMAIL = 'agent@local.chefflow'
const AGENT_PASSWORD = 'CHEF.jdgyuegf9924092.FLOW'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await context.newPage()

  console.log('--- Step 1: Sign in as agent ---')
  const res = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: AGENT_EMAIL, password: AGENT_PASSWORD },
  })
  if (!res.ok()) {
    console.error('Sign-in failed:', res.status())
    await browser.close()
    process.exit(1)
  }
  console.log('Signed in successfully')

  console.log('\n--- Step 2: Settings form - Social Links card ---')
  await page.goto(`${BASE}/settings/my-profile`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const socialCard = await page.getByText('Social & External Links').isVisible()
  console.log(`Social & External Links card visible: ${socialCard}`)
  const igInput = await page.getByPlaceholder('https://instagram.com/yourname').isVisible()
  console.log(`Instagram input visible: ${igInput}`)
  const ttInput = await page.getByPlaceholder('https://tiktok.com/@yourname').isVisible()
  console.log(`TikTok input visible: ${ttInput}`)
  const fbInput = await page.getByPlaceholder('https://facebook.com/yourpage').isVisible()
  console.log(`Facebook input visible: ${fbInput}`)
  const ytInput = await page.getByPlaceholder('https://youtube.com/@yourchannel').isVisible()
  console.log(`YouTube input visible: ${ytInput}`)
  const ltInput = await page.getByPlaceholder('https://linktr.ee/yourname').isVisible()
  console.log(`Linktree input visible: ${ltInput}`)
  await page.screenshot({ path: 'test-screenshots/01-settings-social-card.png', fullPage: true })

  console.log('\n--- Step 3: Save social links ---')
  await page.getByPlaceholder('https://instagram.com/yourname').fill('https://instagram.com/testagentchef')
  await page.getByPlaceholder('https://linktr.ee/yourname').fill('https://linktr.ee/testagentchef')

  // Dismiss cookie banner if present
  const cookieAccept = page.locator('button:has-text("Accept")')
  if (await cookieAccept.count() > 0) {
    await cookieAccept.first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(500)
  }

  // Dismiss Getting Started sidebar if present
  const gettingStartedClose = page.locator('[aria-label="Dismiss getting started"], button:has-text("Dismiss")')
  if (await gettingStartedClose.count() > 0) {
    await gettingStartedClose.first().click({ timeout: 3000 }).catch(() => {})
    await page.waitForTimeout(500)
  }

  // Capture console errors and network failures
  const consoleErrors = []
  const networkErrors = []
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })
  page.on('response', resp => {
    if (resp.status() >= 400) {
      networkErrors.push(`${resp.status()} ${resp.url().substring(0, 120)}`)
    }
  })

  // Remove ALL fixed overlays blocking the save button (z-50 onboarding panel, cookie banner)
  await page.evaluate(() => {
    document.querySelectorAll('.fixed.bottom-24, .fixed.bottom-0, [class*="cookie"], [class*="consent"]').forEach(el => el.remove())
    // Also remove any z-50 fixed elements
    document.querySelectorAll('.z-50').forEach(el => {
      if (window.getComputedStyle(el).position === 'fixed') el.remove()
    })
  })
  await page.waitForTimeout(500)

  // Click save button with force (bypasses overlay check but fires React events)
  const saveBtn = page.getByRole('button', { name: /save profile/i })
  await saveBtn.scrollIntoViewIfNeeded()

  // Pre-click: log the button text
  const preBtnText = await saveBtn.textContent()
  console.log(`Save button text before click: "${preBtnText}"`)

  await saveBtn.click({ force: true })
  await page.waitForTimeout(500)

  // Post-click: log the button text to see if it changed to "Saving..."
  const postBtnText = await saveBtn.textContent()
  console.log(`Save button text after click: "${postBtnText}"`)

  // Wait for either success message or the button to return to "Save Profile"
  try {
    await page.getByText('Profile updated successfully').waitFor({ timeout: 8000 })
    console.log('Success message appeared!')
  } catch {
    console.log('Success message did not appear within 8s')
    // Check for error messages
    const errorAlert = await page.locator('[role="alert"]').textContent().catch(() => 'none')
    console.log(`Error alert: ${errorAlert}`)
  }
  await page.waitForTimeout(1000)
  console.log(`Console errors during save: ${consoleErrors.length}`)
  consoleErrors.forEach(e => console.log(`  CONSOLE: ${e}`))
  console.log(`Network errors: ${networkErrors.length}`)
  networkErrors.forEach(e => console.log(`  NET: ${e}`))
  const successMsg = await page.getByText('Profile updated successfully').isVisible()
  console.log(`Save success message: ${successMsg}`)
  await page.screenshot({ path: 'test-screenshots/02-settings-saved.png', fullPage: true })

  console.log('\n--- Step 4: Verify persistence after refresh ---')
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
  const igValue = await page.getByPlaceholder('https://instagram.com/yourname').inputValue()
  console.log(`Instagram value after reload: ${igValue}`)
  const ltValue = await page.getByPlaceholder('https://linktr.ee/yourname').inputValue()
  console.log(`Linktree value after reload: ${ltValue}`)
  await page.screenshot({ path: 'test-screenshots/03-settings-persisted.png', fullPage: true })

  console.log('\n--- Step 5: Homepage Featured Chef cards (unauthenticated) ---')
  // Use a fresh context without auth cookies so we see the public homepage
  const publicContext = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const publicPage = await publicContext.newPage()
  await publicPage.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await publicPage.waitForTimeout(2000)
  const featuredVisible = await publicPage.getByText('Featured chefs').isVisible().catch(() => false)
  console.log(`Featured chefs section visible: ${featuredVisible}`)
  if (featuredVisible) {
    const inquireButtons = await publicPage.locator('a:has-text("Inquire")').count()
    console.log(`Inquire CTA buttons found: ${inquireButtons}`)
    // Check if images are Cloudinary-optimized
    const heroImages = publicPage.locator('section:has-text("Featured chefs") img')
    const imgCount = await heroImages.count()
    for (let i = 0; i < imgCount; i++) {
      const src = await heroImages.nth(i).getAttribute('src')
      const isCloudinary = src?.includes('res.cloudinary.com') || src?.includes('cloudinary')
      console.log(`  Image ${i + 1} Cloudinary-optimized: ${isCloudinary} (${src?.substring(0, 100)}...)`)
    }
    // Check for social link icons on cards
    const socialIcons = await publicPage.locator('section:has-text("Featured chefs") a[target="_blank"]').count()
    console.log(`Social link icons on cards: ${socialIcons}`)
    // Check for star rating badges
    const ratingBadges = publicPage.locator('section:has-text("Featured chefs") .text-amber-300')
    const ratingCount = await ratingBadges.count()
    console.log(`Star rating badges found: ${ratingCount}`)
  } else {
    console.log('No featured chefs found (0 discoverable chefs in DB)')
    // Take screenshot of what the homepage looks like
  }
  await publicPage.screenshot({ path: 'test-screenshots/04-homepage-featured-cards.png', fullPage: true })
  await publicContext.close()

  console.log('\n--- Step 6: Public chef profile social icons ---')
  await page.goto(`${BASE}/settings/public-profile`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  const clientsView = page.getByRole('link', { name: /client.*view/i })
  const hasSlug = await clientsView.count()
  if (hasSlug > 0) {
    const href = await clientsView.getAttribute('href')
    console.log(`Public profile link: ${href}`)
    await page.goto(`${BASE}${href}`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const igIcon = await page.locator('[aria-label="Instagram"]').count()
    const ltIcon = await page.locator('[aria-label="Link hub"]').count()
    console.log(`Instagram icon on profile: ${igIcon > 0}`)
    console.log(`Linktree icon on profile: ${ltIcon > 0}`)
    await page.screenshot({ path: 'test-screenshots/05-public-profile-social.png', fullPage: true })
  } else {
    console.log('No public slug set - skipping profile test')
  }

  console.log('\n--- DONE ---')
  await browser.close()
}

main().catch((err) => {
  console.error('Test failed:', err)
  process.exit(1)
})
