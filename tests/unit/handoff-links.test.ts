import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildGoogleCalendarHref,
  buildMailtoHref,
  buildMapsDirectionsHref,
  buildMapsSearchHref,
  buildSmsHref,
  buildTelHref,
  normalizeExternalHref,
  normalizePhoneForHref,
} from '../../lib/handoffs/links.js'

test('handoff links normalize phone numbers for dialer and SMS links', () => {
  assert.equal(normalizePhoneForHref('+1 (555) 123-4567'), '+15551234567')
  assert.equal(buildTelHref('(555) 123-4567'), 'tel:5551234567')
  assert.equal(buildSmsHref('+1 555 123 4567', 'On my way'), 'sms:+15551234567?&body=On%20my%20way')
})

test('handoff links build mailto URLs with optional subject and body', () => {
  assert.equal(buildMailtoHref('client@example.com'), 'mailto:client@example.com')
  assert.equal(
    buildMailtoHref('client@example.com', { subject: 'Event update', body: 'Confirmed' }),
    'mailto:client@example.com?subject=Event+update&body=Confirmed'
  )
})

test('handoff links build map search and directions URLs from coordinates or address', () => {
  assert.equal(
    buildMapsSearchHref({ address: '12 Main St, Portland, ME' }),
    'https://www.google.com/maps/search/?api=1&query=12%20Main%20St%2C%20Portland%2C%20ME'
  )
  assert.equal(
    buildMapsDirectionsHref({ lat: 43.6591, lng: -70.2568 }),
    'https://www.google.com/maps/dir/?api=1&destination=43.6591%2C-70.2568'
  )
  assert.equal(
    buildMapsDirectionsHref({ address: '12 Main St, Portland, ME' }),
    'https://www.google.com/maps/dir/?api=1&destination=12%20Main%20St%2C%20Portland%2C%20ME'
  )
  assert.equal(buildMapsDirectionsHref({ address: '   ' }), null)
})

test('handoff links build Google Calendar template links', () => {
  const href = buildGoogleCalendarHref({
    title: 'ChefFlow Dinner',
    start: '2026-05-01T18:00:00.000Z',
    end: '2026-05-01T21:00:00.000Z',
    location: '12 Main St',
    details: 'Prep at 4pm',
  })

  assert.ok(href?.startsWith('https://calendar.google.com/calendar/render?'))
  assert.match(href ?? '', /action=TEMPLATE/)
  assert.match(href ?? '', /text=ChefFlow\+Dinner/)
  assert.match(href ?? '', /dates=20260501T180000Z%2F20260501T210000Z/)
})

test('handoff links normalize external URLs without changing explicit protocols', () => {
  assert.equal(normalizeExternalHref('example.com'), 'https://example.com')
  assert.equal(normalizeExternalHref('https://example.com/path'), 'https://example.com/path')
})
