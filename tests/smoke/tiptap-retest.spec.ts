import { test, expect } from '@playwright/test'

test.use({ storageState: '.auth/chef.json' })

test('TiptapEditor renders toolbar and accepts input on /recipes/new', async ({ page }) => {
  // Navigate to recipes/new with longer timeout for slow dev server
  await page.goto('/recipes/new', { timeout: 60000, waitUntil: 'networkidle' })

  // Click the Manual Entry tab if present
  const manualTab = page.getByRole('tab', { name: /manual/i })
  if (await manualTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await manualTab.click()
    await page.waitForTimeout(1000)
  }

  // Screenshot the page first to see what we have
  await page.screenshot({ path: 'test-results/tiptap-01-page-loaded.png', fullPage: true })

  // Look for tiptap editor toolbars (the dark toolbar with Bold/Italic/etc buttons)
  const toolbars = page
    .locator('[class*="tiptap-toolbar"], .tiptap-toolbar, [data-testid*="tiptap"], .ProseMirror')
    .first()

  // Also look for Bold buttons which are key indicators of tiptap
  const boldButtons = page.getByRole('button', { name: /bold/i })
  const boldCount = await boldButtons.count()

  console.log(`Found ${boldCount} Bold button(s)`)

  // Screenshot showing the editor area
  await page.screenshot({ path: 'test-results/tiptap-02-editor-area.png', fullPage: true })

  // Verify at least one Bold button exists (means tiptap toolbar rendered)
  expect(boldCount).toBeGreaterThan(0)

  // Click the first Bold button to activate bold mode
  await boldButtons.first().click()

  // Find the ProseMirror editor area and type
  const editor = page.locator('.ProseMirror').first()
  await editor.click()
  await editor.type('Test bold text')

  // Screenshot after typing
  await page.screenshot({ path: 'test-results/tiptap-03-after-typing.png', fullPage: true })

  // Verify text was entered
  const editorContent = await editor.innerHTML()
  console.log('Editor content:', editorContent)
  expect(editorContent).toContain('Test bold text')
})
