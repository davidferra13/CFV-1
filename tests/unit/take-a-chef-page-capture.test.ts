import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTakeAChefCaptureBookmarklet,
  guessTakeAChefPageCaptureType,
  mergeTakeAChefPageCaptureIntoUnknownFields,
  parseTakeAChefPageCapture,
} from '@/lib/integrations/take-a-chef-page-capture'

test('detects booking page capture details and identity keys', () => {
  const parsed = parseTakeAChefPageCapture({
    pageUrl: 'https://www.privatechefmanager.com/en-us/user/login-check?uri=abc123',
    pageTitle: 'New booking confirmed (Order ID: 7714634)',
    pageText: `New booking confirmed (Order ID: 7714634)
Amount: 1000 USD
Request: Multiple services
Address: North Conway, Conway, NH
Service dates: 18 Sept 2025 - 21 Sept 2025
Guests: Jessica Zoll`,
    pageLinks: ['https://www.privatechefmanager.com/en-us/user/login-check?uri=abc123'],
  })

  assert.equal(parsed.suggestedCaptureType, 'booking')
  assert.equal(parsed.orderId, '7714634')
  assert.equal(parsed.clientName, 'Jessica Zoll')
  assert.equal(parsed.bookingDate, '2025-09-18')
  assert.equal(parsed.location, 'North Conway, Conway, NH')
  assert.equal(parsed.amountCents, 100000)
  assert.ok(parsed.identityKeys.includes('7714634'))
  assert.ok(parsed.identityKeys.includes('abc123'))
})

test('detects guest contact page capture details', () => {
  const parsed = parseTakeAChefPageCapture({
    pageUrl: 'https://www.takeachef.com/en-us/dashboard/booking/guest',
    pageTitle: 'Guest contact details',
    pageText: `Guest contact details for your upcoming booking
Guest name: Jessica Zoll
Phone number: +1 617 555 0101
Email: jessica@example.com
Your upcoming booking in North Conway, Conway, NH on 18 de septiembre de 2025 is coming up.`,
    pageLinks: [],
  })

  assert.equal(parsed.suggestedCaptureType, 'guest_contact')
  assert.equal(parsed.clientName, 'Jessica Zoll')
  assert.equal(parsed.email, 'jessica@example.com')
  assert.equal(parsed.phone, '+1 617 555 0101')
  assert.equal(parsed.bookingDate, '2025-09-18')
})

test('builds bookmarklet pointing to marketplace capture route', () => {
  const bookmarklet = buildTakeAChefCaptureBookmarklet('https://app.cheflowhq.com')

  assert.ok(bookmarklet.startsWith('javascript:'))
  assert.ok(bookmarklet.includes('/marketplace/capture?source=bookmarklet'))
})

test('guesses request capture from inquiry-like text', () => {
  const guessed = guessTakeAChefPageCaptureType({
    pageTitle: 'New request from Sarah Mitchell',
    pageText: 'Price per person: from 101 USD to 174 USD\nType of experience: Fine dining',
  })

  assert.equal(guessed, 'request')
})

test('preserves workflow metadata across proposal and menu captures', () => {
  const proposalParsed = parseTakeAChefPageCapture({
    pageUrl: 'https://www.takeachef.com/en-us/dashboard/proposal/123',
    pageTitle: 'Proposal sent to Sarah Mitchell',
    pageText: `Proposal
Guest name: Sarah Mitchell
Amount: 1450 USD`,
    pageLinks: [],
  })

  const proposalMerged = mergeTakeAChefPageCaptureIntoUnknownFields({
    unknownFields: null,
    identityKeys: ['proposal-123'],
    captureType: 'proposal',
    pageUrl: 'https://www.takeachef.com/en-us/dashboard/proposal/123',
    pageTitle: 'Proposal sent to Sarah Mitchell',
    parsed: proposalParsed,
    capturedAt: '2026-03-05T12:00:00.000Z',
  }) as Record<string, unknown>

  const menuParsed = parseTakeAChefPageCapture({
    pageUrl: 'https://www.takeachef.com/en-us/dashboard/menu/123',
    pageTitle: 'Menu draft for Sarah Mitchell',
    pageText: `Menu
Guest name: Sarah Mitchell
Dish: scallop crudo`,
    pageLinks: [],
  })

  const menuMerged = mergeTakeAChefPageCaptureIntoUnknownFields({
    unknownFields: proposalMerged,
    identityKeys: ['proposal-123'],
    captureType: 'menu',
    pageUrl: 'https://www.takeachef.com/en-us/dashboard/menu/123',
    pageTitle: 'Menu draft for Sarah Mitchell',
    parsed: menuParsed,
    capturedAt: '2026-03-05T14:30:00.000Z',
  }) as Record<string, unknown>

  const workflow = menuMerged.take_a_chef_workflow as Record<string, unknown>

  assert.equal(workflow.proposal_captured_at, '2026-03-05T12:00:00.000Z')
  assert.equal(workflow.proposal_amount_cents, 145000)
  assert.equal(workflow.menu_seen, true)
  assert.equal(workflow.menu_captured_at, '2026-03-05T14:30:00.000Z')
  assert.equal(workflow.last_capture_type, 'menu')
})
