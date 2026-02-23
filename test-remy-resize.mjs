/**
 * Test: Remy Concierge Widget — Corner Drag Resize
 *
 * Physically drags each corner of the Remy chat widget to verify
 * that resize works. Takes before/after screenshots for proof.
 */
import { chromium } from 'playwright'

const BASE = 'http://localhost:3100'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

  console.log('1. Navigating to landing page...')
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 })

  // The Remy widget should auto-open on the landing page
  // Look for the widget container — it's the fixed div with the resize handles
  // Wait for it to appear
  await page.waitForTimeout(2000) // let animations settle

  // Take initial screenshot
  await page.screenshot({ path: 'test-screenshots/remy-resize-01-initial.png', fullPage: false })
  console.log('   Screenshot: remy-resize-01-initial.png')

  // Find the Remy widget — it's a fixed div that contains the chat
  // The widget has a header with "Remy" text
  const remyHeader = page.locator('text=Remy').first()
  const headerVisible = await remyHeader.isVisible().catch(() => false)

  if (!headerVisible) {
    // Maybe widget is collapsed — click the "Chat with Remy" button
    console.log('   Widget not open, looking for open button...')
    const openBtn = page.locator('button:has-text("Chat with Remy"), button:has-text("Remy")')
    const btnVisible = await openBtn.first().isVisible().catch(() => false)
    if (btnVisible) {
      await openBtn.first().click()
      await page.waitForTimeout(1000)
      console.log('   Clicked open button')
    } else {
      console.log('   ERROR: Cannot find Remy widget or button on the page')
      await page.screenshot({ path: 'test-screenshots/remy-resize-ERROR-no-widget.png' })
      await browser.close()
      process.exit(1)
    }
  }

  console.log('2. Remy widget is open. Getting widget bounds...')

  // The outer wrapper is the fixed div that contains resize handles
  // It should be the parent of the inner div with overflow-hidden
  // Find it by the cursor-se-resize handle
  const seHandle = page.locator('[class*="cursor-se-resize"]').first()
  const seExists = await seHandle.isVisible().catch(() => false)

  if (!seExists) {
    console.log('   ERROR: SE resize handle not found!')
    await page.screenshot({ path: 'test-screenshots/remy-resize-ERROR-no-handle.png' })
    await browser.close()
    process.exit(1)
  }

  console.log('   Found SE resize handle')

  // Get the widget's bounding box via the inner content div
  // The widget ref div is the outermost fixed positioned element
  const widgetBox = await seHandle.evaluate(el => {
    // The resize handle's parent is the outer widget wrapper
    const widget = el.closest('.fixed')
    if (!widget) return null
    const rect = widget.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (!widgetBox) {
    console.log('   ERROR: Could not get widget bounding box')
    await browser.close()
    process.exit(1)
  }

  console.log(`   Widget before resize: ${widgetBox.width.toFixed(0)}x${widgetBox.height.toFixed(0)} at (${widgetBox.x.toFixed(0)}, ${widgetBox.y.toFixed(0)})`)

  // --- TEST 1: Drag SE corner to make widget larger ---
  console.log('3. Testing SE corner resize (drag down-right to enlarge)...')

  // SE corner handle is at bottom-right of the widget
  const seBox = await seHandle.boundingBox()
  if (!seBox) {
    console.log('   ERROR: SE handle has no bounding box')
    await browser.close()
    process.exit(1)
  }

  const seCenterX = seBox.x + seBox.width / 2
  const seCenterY = seBox.y + seBox.height / 2

  // Drag SE corner 100px right and 80px down
  await page.mouse.move(seCenterX, seCenterY)
  await page.mouse.down()
  await page.mouse.move(seCenterX + 100, seCenterY + 80, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(500)

  // Get new widget size
  const afterSEResize = await seHandle.evaluate(el => {
    const widget = el.closest('.fixed')
    if (!widget) return null
    const rect = widget.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  })

  if (!afterSEResize) {
    console.log('   ERROR: Could not get widget box after SE resize')
    await browser.close()
    process.exit(1)
  }

  console.log(`   Widget after SE resize: ${afterSEResize.width.toFixed(0)}x${afterSEResize.height.toFixed(0)}`)

  const seWidthDiff = afterSEResize.width - widgetBox.width
  const seHeightDiff = afterSEResize.height - widgetBox.height

  console.log(`   Width changed by: ${seWidthDiff.toFixed(0)}px (expected ~100)`)
  console.log(`   Height changed by: ${seHeightDiff.toFixed(0)}px (expected ~80)`)

  await page.screenshot({ path: 'test-screenshots/remy-resize-02-after-se.png', fullPage: false })

  const sePass = Math.abs(seWidthDiff) > 30 || Math.abs(seHeightDiff) > 30
  console.log(`   SE resize: ${sePass ? 'PASS' : 'FAIL'}`)

  // --- TEST 2: Drag NW corner to make widget larger (top-left) ---
  console.log('4. Testing NW corner resize (drag up-left to enlarge)...')

  const nwHandle = page.locator('[class*="cursor-nw-resize"]').first()
  const nwBox = await nwHandle.boundingBox()

  if (!nwBox) {
    console.log('   ERROR: NW handle has no bounding box')
    await browser.close()
    process.exit(1)
  }

  const nwCenterX = nwBox.x + nwBox.width / 2
  const nwCenterY = nwBox.y + nwBox.height / 2

  const beforeNW = await nwHandle.evaluate(el => {
    const widget = el.closest('.fixed')
    if (!widget) return null
    const rect = widget.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })

  await page.mouse.move(nwCenterX, nwCenterY)
  await page.mouse.down()
  await page.mouse.move(nwCenterX - 80, nwCenterY - 60, { steps: 10 })
  await page.mouse.up()
  await page.waitForTimeout(500)

  const afterNW = await nwHandle.evaluate(el => {
    const widget = el.closest('.fixed')
    if (!widget) return null
    const rect = widget.getBoundingClientRect()
    return { width: rect.width, height: rect.height }
  })

  if (beforeNW && afterNW) {
    const nwWDiff = afterNW.width - beforeNW.width
    const nwHDiff = afterNW.height - beforeNW.height
    console.log(`   Width changed by: ${nwWDiff.toFixed(0)}px (expected ~80)`)
    console.log(`   Height changed by: ${nwHDiff.toFixed(0)}px (expected ~60)`)
    const nwPass = Math.abs(nwWDiff) > 20 || Math.abs(nwHDiff) > 20
    console.log(`   NW resize: ${nwPass ? 'PASS' : 'FAIL'}`)
  }

  await page.screenshot({ path: 'test-screenshots/remy-resize-03-after-nw.png', fullPage: false })

  // --- TEST 3: Test west edge resize ---
  console.log('5. Testing W edge resize (drag left to widen)...')

  const wHandle = page.locator('[class*="cursor-w-resize"]').first()
  const wBox = await wHandle.boundingBox()

  if (wBox) {
    const beforeW = await wHandle.evaluate(el => {
      const widget = el.closest('.fixed')
      if (!widget) return null
      const rect = widget.getBoundingClientRect()
      return { width: rect.width }
    })

    const wCenterX = wBox.x + wBox.width / 2
    const wCenterY = wBox.y + wBox.height / 2

    await page.mouse.move(wCenterX, wCenterY)
    await page.mouse.down()
    await page.mouse.move(wCenterX - 60, wCenterY, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(500)

    const afterW = await wHandle.evaluate(el => {
      const widget = el.closest('.fixed')
      if (!widget) return null
      const rect = widget.getBoundingClientRect()
      return { width: rect.width }
    })

    if (beforeW && afterW) {
      const wDiff = afterW.width - beforeW.width
      console.log(`   Width changed by: ${wDiff.toFixed(0)}px (expected ~60)`)
      const wPass = Math.abs(wDiff) > 20
      console.log(`   W edge resize: ${wPass ? 'PASS' : 'FAIL'}`)
    }
  }

  await page.screenshot({ path: 'test-screenshots/remy-resize-04-after-w.png', fullPage: false })

  // --- SUMMARY ---
  console.log('\n=== RESIZE TEST COMPLETE ===')
  console.log('Screenshots saved to test-screenshots/remy-resize-*.png')

  await browser.close()
}

main().catch(err => {
  console.error('Test failed:', err)
  process.exit(1)
})
