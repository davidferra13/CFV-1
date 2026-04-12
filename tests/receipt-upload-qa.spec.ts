import { test, expect } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

test.describe('Receipt Upload - Market Basket OCR Scan', () => {
  test('should scan receipt using OCR', async ({ page }) => {
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    // Navigate to scan page (storageState in config provides auth cookie)
    console.log('Navigating to expenses/new?mode=scan...')
    await page.goto('http://localhost:3100/expenses/new?mode=scan', {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    })
    console.log('Page loaded, URL:', page.url())
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/receipt-upload-01-scan-page.png', fullPage: true })

    if (page.url().includes('signin')) {
      throw new Error('Redirected to sign-in - auth not working')
    }

    // Activate OCR Scan tab
    const ocrBtn = page.getByRole('button', { name: 'OCR Scan' })
    if ((await ocrBtn.count()) > 0) {
      await ocrBtn.click()
      await page.waitForTimeout(500)
    }

    // Upload file
    const receiptPath = path.join(
      process.env.TEMP || '',
      '25b95abe-dbc5-4c97-8383-69dcd7f59bdc.png'
    )
    console.log('Receipt:', receiptPath, 'exists:', fs.existsSync(receiptPath))
    expect(fs.existsSync(receiptPath)).toBeTruthy()

    const fileInput = page.locator('input[type="file"]').first()
    await expect(fileInput).toBeAttached({ timeout: 10000 })
    await fileInput.setInputFiles(receiptPath)
    await page.waitForTimeout(2000)
    await page.screenshot({ path: '/tmp/receipt-upload-02-file-selected.png', fullPage: true })

    const scanBtn = page.getByRole('button', { name: /scan receipt/i }).first()
    await expect(scanBtn).toBeVisible({ timeout: 5000 })
    await scanBtn.click()
    console.log('Scanning... waiting up to 90s')

    await page.waitForFunction(
      () => {
        const b = document.body.innerText
        return (
          b.includes('Scanned Data') ||
          b.includes('OCR Result') ||
          b.includes('line items') ||
          b.includes('Failed to scan') ||
          b.includes('unavailable') ||
          b.includes('Could not extract') ||
          b.includes('Scan failed') ||
          b.includes('processing failed') ||
          b.includes('Review & Confirm')
        )
      },
      { timeout: 90000 }
    )

    await page.screenshot({ path: '/tmp/receipt-upload-03-result.png', fullPage: true })

    const resultText = (await page.textContent('body')) || ''
    console.log('\n=== PAGE TEXT AFTER SCAN ===\n' + resultText)

    console.log('\n=== CONSOLE ERRORS ===')
    if (consoleErrors.length === 0) console.log('None')
    else consoleErrors.forEach((e) => console.log('ERROR:', e))

    await page.screenshot({ path: '/tmp/receipt-upload-04-final.png', fullPage: true })
  })
})
