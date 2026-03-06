import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ParsedEmail } from '../../lib/google/types'
import { extractTacLinkIdentity, parseTakeAChefEmail } from '../../lib/gmail/take-a-chef-parser'

function asEmail(subject: string, body: string): ParsedEmail {
  return {
    messageId: 'msg-1',
    threadId: 'thread-1',
    from: { name: 'Take a Chef', email: 'info@takeachef.com' },
    to: 'chef@example.com',
    subject,
    body,
    date: '2026-03-01T12:00:00.000Z',
    snippet: body.slice(0, 120),
    labelIds: [],
    listUnsubscribe: '',
    precedence: '',
  }
}

describe('Take a Chef identity extraction', () => {
  it('extracts the login-check uri token from TAC links', () => {
    const identity = extractTacLinkIdentity(
      'https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414079&hash=abc123&uri=BOOKING_TOKEN_123'
    )

    assert.equal(identity.ctaUriToken, 'BOOKING_TOKEN_123')
    assert.deepEqual(identity.identityKeys, [
      'BOOKING_TOKEN_123',
      'https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414079&hash=abc123&uri=BOOKING_TOKEN_123',
    ])
  })

  it('parses booking emails with bold markdown labels and canonical identity keys', () => {
    const email = asEmail(
      'New booking confirmed (Order ID: 589314)!',
      [
        'A new booking just arrived on your plate.',
        '**Amount:** 750 USD',
        '**Request:** Multiple services',
        '**Payment gateway:** Stripe (Checkout)',
        '**Address:** Sullivan, Maine',
        '**Date:** 26 Sept 2024 - 28 Sept 2024',
        '**Time:** Dinner',
        '**Occasion:** Friends gathering',
        '**Guest:** Nancy Talarico',
        '[Message your guest](https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414079&hash=abc123&uri=BOOKING_TOKEN_123)',
      ].join('\n')
    )

    const parsed = parseTakeAChefEmail(email)

    assert.equal(parsed.emailType, 'tac_booking_confirmed')
    assert.equal(parsed.booking?.orderId, '589314')
    assert.equal(parsed.booking?.clientName, 'Nancy Talarico')
    assert.equal(parsed.booking?.primaryServiceDate, '2024-09-26')
    assert.equal(parsed.booking?.ctaUriToken, 'BOOKING_TOKEN_123')
    assert.equal(parsed.booking?.serviceMode, 'multi_day')
    assert.deepEqual(
      parsed.booking?.scheduleRequest?.sessions?.map((session) => session.service_date),
      ['2024-09-26', '2024-09-27', '2024-09-28']
    )
    assert.deepEqual(parsed.booking?.identityKeys, [
      'BOOKING_TOKEN_123',
      'https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414079&hash=abc123&uri=BOOKING_TOKEN_123',
    ])
  })

  it('parses inquiry date ranges into multi-day schedule requests', () => {
    const email = asEmail(
      'You just received a new request from Nancy Talarico!',
      [
        'Location: Sullivan, Maine',
        'Meal: Dinner',
        'Dates: Sept 26 2024 to Sept 28 2024',
        'No. of guests: 6 adults',
        'Type of experience: Fine dining',
        'Occasion: Friends gathering',
        'SOMETHING TO ADD',
        'Notes: Three-night coastal dinner series',
        '[Send proposal](https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414079&hash=abc123&uri=INQUIRY_TOKEN_123)',
      ].join('\n')
    )

    const parsed = parseTakeAChefEmail(email)

    assert.equal(parsed.emailType, 'tac_new_inquiry')
    assert.equal(parsed.inquiry?.serviceMode, 'multi_day')
    assert.equal(parsed.inquiry?.eventDate, '2024-09-26')
    assert.deepEqual(
      parsed.inquiry?.scheduleRequest?.sessions?.map((session) => session.service_date),
      ['2024-09-26', '2024-09-27', '2024-09-28']
    )
    assert.equal(parsed.inquiry?.scheduleRequest?.sessions?.[0]?.meal_slot, 'dinner')
  })

  it('parses customer-info emails with the same TAC link token for matching', () => {
    const email = asEmail(
      'Guest contact details for your upcoming booking',
      [
        'Hi Chef!',
        'Your upcoming booking in Sullivan, Maine on 26 de septiembre de 2024 is another incredible opportunity.',
        '**Guest name :** Nancy Talarico',
        '**Phone number :** +1 7045169144',
        '[Message your guest](https://www.takeachef.com/en-us/user/login-check?user=chef@example.com&expires=1728414080&hash=def456&uri=BOOKING_TOKEN_123)',
      ].join('\n')
    )

    const parsed = parseTakeAChefEmail(email)

    assert.equal(parsed.emailType, 'tac_customer_info')
    assert.equal(parsed.customerInfo?.guestName, 'Nancy Talarico')
    assert.equal(parsed.customerInfo?.phoneNumber, '+1 7045169144')
    assert.equal(parsed.customerInfo?.ctaUriToken, 'BOOKING_TOKEN_123')
  })
})
