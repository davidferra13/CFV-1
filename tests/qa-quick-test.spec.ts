import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/agent-storage-fresh.json' })

test('quick-auth-check', async ({ page }) => {
  // Navigate with commit (just get headers)
  const response = await page.goto('http://localhost:3000/dashboard', {
    waitUntil: 'commit',
    timeout: 20000,
  })
  console.log('STATUS:', response?.status())
  console.log('URL:', page.url())

  // Wait a bit to see if page starts loading
  await page.waitForTimeout(5000)
  console.log('URL_AFTER_WAIT:', page.url())

  const html = await page.content().catch(() => 'ERROR GETTING CONTENT')
  console.log('HTML_START:', html.substring(0, 300))
})
