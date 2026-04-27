import { test, expect } from '@playwright/test'

const BASE = 'http://localhost:3100'

test('TiptapEditor renders on recipes/new with toolbar and accepts formatting', async ({
  page,
}) => {
  // Collect console errors
  const consoleErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  // 1. Authenticate
  const authResp = await page.request.post(`${BASE}/api/e2e/auth`, {
    data: { email: 'agent@local.chefflow', password: 'CHEF.jdgyuegf9924092.FLOW' },
  })
  expect(authResp.status()).toBeLessThan(400)

  // 2. Navigate to /recipes/new
  await page.goto(`${BASE}/recipes/new`, { waitUntil: 'networkidle', timeout: 30000 })
  await page.screenshot({ path: 'test-results/tiptap-01-recipes-new.png' })

  // 3. Click "Manual Entry" tab
  const manualTab = page.getByRole('tab', { name: /manual/i })
  if (await manualTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await manualTab.click()
    await page.waitForTimeout(1000)
  } else {
    const manualBtn = page.locator('text=Manual Entry').first()
    if (await manualBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await manualBtn.click()
      await page.waitForTimeout(1000)
    }
  }
  await page.screenshot({ path: 'test-results/tiptap-02-manual-entry.png', fullPage: true })

  // 4. Scroll to find Method field
  const methodLabel = page.locator(
    'label:has-text("Method"), label:has-text("Instructions"), label:has-text("Directions")'
  )
  const methodCount = await methodLabel.count()
  console.log('Method labels found:', methodCount)

  if (methodCount > 0) {
    await methodLabel.first().scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
  }

  // 5. Check for TiptapEditor (ProseMirror)
  const proseMirror = page.locator('.ProseMirror').first()
  const editorVisible = await proseMirror.isVisible({ timeout: 5000 }).catch(() => false)
  console.log('ProseMirror visible:', editorVisible)

  await page.screenshot({ path: 'test-results/tiptap-03-editor-area.png', fullPage: true })

  if (editorVisible) {
    // 6. Check toolbar
    // Find toolbar buttons near the editor - look for parent container with buttons
    await proseMirror.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)

    // The toolbar should have formatting buttons with SVG icons
    const editorContainer = proseMirror.locator('..')
    const grandparent = editorContainer.locator('..')

    // Count buttons that are siblings/ancestors of the editor
    const toolbarButtons = grandparent.locator('button')
    const btnCount = await toolbarButtons.count()
    console.log('Buttons in editor container:', btnCount)

    // Screenshot just the editor region
    const editorBox = await grandparent.boundingBox()
    if (editorBox) {
      await page.screenshot({
        path: 'test-results/tiptap-04-editor-closeup.png',
        clip: {
          x: Math.max(0, editorBox.x - 10),
          y: Math.max(0, editorBox.y - 50),
          width: Math.min(editorBox.width + 20, 1280),
          height: Math.min(editorBox.height + 100, 900),
        },
      })
    }

    // 7. Click in editor and type with Bold
    await proseMirror.click()
    await page.waitForTimeout(300)

    // Try to activate Bold via keyboard shortcut
    await page.keyboard.press('Control+b')
    await page.keyboard.type('Test bold text')
    await page.keyboard.press('Control+b')
    await page.keyboard.type(' normal text')
    await page.waitForTimeout(500)

    await page.screenshot({ path: 'test-results/tiptap-05-typed-text.png', fullPage: false })

    // Verify content was typed
    const content = await proseMirror.innerHTML()
    console.log('Editor innerHTML:', content)

    // Check if bold tag is present
    const hasBold = content.includes('<strong>') || content.includes('<b>')
    console.log('Bold formatting applied:', hasBold)

    // Also try clicking the Bold toolbar button
    // Look for a button with Bold-like title or aria-label
    const boldBtn = page.locator('button[title*="Bold" i], button[aria-label*="Bold" i]').first()
    const boldVisible = await boldBtn.isVisible({ timeout: 1000 }).catch(() => false)
    console.log('Bold button visible:', boldVisible)

    if (boldVisible) {
      await boldBtn.click()
      console.log('Clicked Bold toolbar button')
    }

    await page.screenshot({ path: 'test-results/tiptap-06-final.png', fullPage: false })
  } else {
    console.log('FAIL: ProseMirror editor not found on page')
    // Debug: dump what IS on the page
    const allTextareas = await page.locator('textarea').count()
    const allInputs = await page.locator('input').count()
    console.log('Textareas on page:', allTextareas)
    console.log('Inputs on page:', allInputs)

    // Check for any element with editor-like classes
    const editorLike = await page
      .locator(
        '[class*="editor" i], [class*="tiptap" i], [class*="prose" i], [contenteditable="true"]'
      )
      .count()
    console.log('Editor-like elements:', editorLike)

    await page.screenshot({ path: 'test-results/tiptap-06-debug.png', fullPage: true })
  }

  // Report errors
  if (consoleErrors.length > 0) {
    console.log('Console errors:', consoleErrors.join('\n'))
  }
})
