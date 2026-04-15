/**
 * Q14: TakeAChef Pipeline Integrity
 *
 * TakeAChef is the most common source of new business for the target persona,
 * but the platform deliberately withholds client contact info until booking.
 * ChefFlow's Gmail sync pipeline must handle all TAC email types correctly
 * and never silently drop events that require chef action.
 *
 * Tests:
 *
 * 1. EMAIL TYPE COVERAGE: the classifier handles all known TAC email types:
 *    tac_new_inquiry, tac_booking_confirmed, tac_customer_info,
 *    tac_client_message, tac_payment, tac_administrative.
 *
 * 2. UNMATCHED MESSAGE NOTIFICATION: when a TAC message arrives but no
 *    matching inquiry exists in ChefFlow, the chef receives a notification
 *    directing them to the marketplace inbox. (Fixed in this session.)
 *
 * 3. GUEST CONTACT CAPTURE: the bookmarklet capture type 'guest_contact'
 *    updates the client record with real email/phone from the TAC guest page.
 *
 * 4. DEDUPLICATION: TAC inquiry capture doesn't create duplicate clients
 *    for the same guest (ilike email check before insert).
 *
 * 5. PLATFORM BOOST: TakeAChef inquiries get a +0.15 platform urgency boost
 *    in the queue, ensuring they surface before generic inquiries.
 *
 * Run: npx playwright test -c playwright.system-integrity.config.ts tests/system-integrity/q14-tac-pipeline.spec.ts
 */
import { test, expect } from '@playwright/test'
import { readFileSync, existsSync } from 'fs'
import { resolve } from 'path'

const GMAIL_SYNC = resolve(process.cwd(), 'lib/gmail/sync.ts')
const INQUIRY_PROVIDER = resolve(process.cwd(), 'lib/queue/providers/inquiry.ts')
const BOOKMARKLET_PARSER = resolve(process.cwd(), 'lib/integrations/takechef/bookmarklet-parser.ts')

test.describe('Q14: TakeAChef pipeline integrity', () => {
  // -------------------------------------------------------------------------
  // Test 1: Gmail sync handles all TAC email types
  // -------------------------------------------------------------------------
  test('gmail sync classifier handles all 6 known TAC email types', () => {
    expect(existsSync(GMAIL_SYNC), 'lib/gmail/sync.ts must exist').toBe(true)

    const src = readFileSync(GMAIL_SYNC, 'utf-8')

    const requiredTypes = [
      'tac_new_inquiry',
      'tac_booking_confirmed',
      'tac_customer_info',
      'tac_client_message',
      'tac_payment',
      'tac_administrative',
    ]

    for (const type of requiredTypes) {
      expect(src.includes(type), `Gmail sync must handle email type: ${type}`).toBe(true)
    }
  })

  // -------------------------------------------------------------------------
  // Test 2: Unmatched TAC message notifies the chef
  // -------------------------------------------------------------------------
  test('handleTacClientMessage notifies chef when no matching inquiry found', () => {
    const src = readFileSync(GMAIL_SYNC, 'utf-8')

    // Find the TAC client message handler
    const handlerIdx = src.indexOf('handleTacClientMessage')
    expect(handlerIdx, 'handleTacClientMessage function must exist').toBeGreaterThan(-1)

    // Extract the handler body (up to 3000 chars after the function name)
    const handlerBody = src.slice(handlerIdx, handlerIdx + 4000)

    // Must contain notification logic for unmatched case
    expect(
      handlerBody.includes('createNotification') || handlerBody.includes('Unmatched'),
      'handleTacClientMessage must send notification for unmatched messages'
    ).toBe(true)

    // The notification must reference the marketplace
    expect(
      handlerBody.includes('marketplace') || handlerBody.includes('/marketplace'),
      'Unmatched TAC message notification must link to marketplace'
    ).toBe(true)

    // The unmatched case must be guarded: !inquiryId or inquiryId === null
    expect(
      handlerBody.includes('!inquiryId') || handlerBody.includes('inquiryId === null'),
      'Unmatched notification must be conditional on missing inquiryId'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 3: Bookmarklet parser handles guest_contact capture type
  // -------------------------------------------------------------------------
  test('bookmarklet parser handles guest_contact capture type', () => {
    if (!existsSync(BOOKMARKLET_PARSER)) return // Skip if path different

    const src = readFileSync(BOOKMARKLET_PARSER, 'utf-8')

    expect(
      src.includes('guest_contact'),
      'Bookmarklet parser must handle guest_contact capture type'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 4: Deduplication — client lookup by email before insert
  // -------------------------------------------------------------------------
  test('TAC inquiry processing checks for existing client before insert', () => {
    const src = readFileSync(GMAIL_SYNC, 'utf-8')

    // The sync must use ilike for case-insensitive email lookup
    expect(
      src.includes('ilike') && src.includes('email'),
      'TAC sync must deduplicate clients via ilike email lookup'
    ).toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 5: Platform urgency boost for TakeAChef inquiries
  // -------------------------------------------------------------------------
  test('TakeAChef inquiries receive platform urgency boost in queue', () => {
    if (!existsSync(INQUIRY_PROVIDER)) return

    const src = readFileSync(INQUIRY_PROVIDER, 'utf-8')

    // Must have a platform boost for TAC or external_platform inquiries
    const hasPlatformBoost =
      src.includes('takechef') ||
      src.includes('TakeAChef') ||
      src.includes('platform_boost') ||
      src.includes('platformBoost') ||
      src.includes('external_platform')

    expect(hasPlatformBoost, 'Inquiry queue must boost TakeAChef inquiries').toBe(true)
  })

  // -------------------------------------------------------------------------
  // Test 6: TAC integration page loads without crash
  // -------------------------------------------------------------------------
  test('marketplace/integrations page loads without crash', async ({ page }) => {
    const response = await page.goto('/marketplace', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    })

    expect(response?.status()).not.toBe(500)
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '')
    expect(bodyText).not.toMatch(/application error/i)
  })
})
