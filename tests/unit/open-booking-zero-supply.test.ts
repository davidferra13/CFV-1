import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime'

;(globalThis as any).React = React

const require = createRequire(import.meta.url)
const directoryPath = require.resolve('../../lib/directory/actions.ts')
require.cache[directoryPath] = {
  id: directoryPath,
  filename: directoryPath,
  loaded: true,
  exports: {
    getDiscoverableChefs: async () => [],
    getDirectorySearchChefIds: async () => [],
  },
} as any
for (const path of ['../../lib/directory/location-search.ts', '../../lib/geo/public-location.ts']) {
  const modulePath = require.resolve(path)
  require.cache[modulePath] = {
    id: modulePath,
    filename: modulePath,
    loaded: true,
    exports: {
      resolveStateOnlyLocationQuery: () => null,
      resolvePublicLocationQuery: async () => ({ data: null }),
      filterChefsByResolvedLocation: async (chefs: unknown[]) => chefs,
    },
  } as any
}
const statusPath = require.resolve('../../lib/booking/status-actions.ts')
require.cache[statusPath] = {
  id: statusPath,
  filename: statusPath,
  loaded: true,
  exports: {
    getBookingStatus: async () => ({
      bookingToken: 'synthetic-token',
      consumerName: 'Synthetic Host',
      occasion: 'Test dinner',
      status: 'no_match',
      createdAt: new Date().toISOString(),
      matchedChefCount: 0,
      location: 'Example region',
      resolvedLocation: null,
      eventDate: '2099-10-18',
      guestCount: 4,
      guestCountRangeLabel: null,
      dietaryRestrictions: [],
      additionalNotes: null,
      inquiries: [],
      firstCircleToken: null,
    }),
  },
} as any
const StatusPage = require('../../app/(public)/book/status/[bookingToken]/page.tsx').default
const { BookDinnerForm } = require('../../app/(public)/book/_components/book-dinner-form.tsx')
const BookPage = require('../../app/(public)/book/page.tsx').default
const DirectoryPage = require('../../app/(public)/chefs/page.tsx').default
const { BookingConfirmationEmail } = require('../../lib/email/templates/booking-confirmation.tsx')
const router = { push() {}, replace() {}, refresh() {}, prefetch() {}, back() {}, forward() {} }
function render(node: React.ReactNode) {
  return renderToStaticMarkup(
    React.createElement(AppRouterContext.Provider, { value: router as any }, node)
  )
}
function text(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ')
}
function assertNoReplyPromise(html: string) {
  assert.doesNotMatch(
    text(html),
    /within 24 hours|usually within|will match you|will notify you when/i
  )
}
test('zero-supply booking shows coverage before accepting a request and preserves the guest form', async () => {
  const html = render(await BookPage({ searchParams: Promise.resolve({}) }))
  assert.match(text(html), /No chefs are currently listed as accepting inquiries/i)
  assert.match(text(html), /match.*not guaranteed|not guarantee.*match/i)
  assert.match(html, /type="submit"/)
  assert.match(html, /id="book-email"/)
  assertNoReplyPromise(html)
})
test('zero-supply submit action saves an event request without promising a chef reply', () => {
  const html = render(React.createElement(BookDinnerForm, { acceptingChefCount: 0 }))
  assert.match(text(html), /Save my event request/i)
  assert.match(text(html), /match.*not guaranteed|not guarantee.*match/i)
  assertNoReplyPromise(html)
})
test('listed chefs do not imply a location match or a response deadline', () => {
  const html = render(React.createElement(BookDinnerForm, { acceptingChefCount: 2 }))
  assert.match(text(html), /Submit my event request/i)
  assertNoReplyPromise(html)
})
test('empty directory leads to an event request without guaranteeing future coverage', async () => {
  const html = render(await DirectoryPage({ searchParams: {} }))
  assert.match(text(html), /No chefs are currently listed/i)
  assert.match(text(html), /Submit an event request/i)
  assert.match(text(html), /not guaranteed/i)
  assertNoReplyPromise(html)
})
test('zero-match confirmation email reports saved details without promising future supply', () => {
  const html = render(
    React.createElement(BookingConfirmationEmail, {
      consumerName: 'Synthetic Host',
      occasion: 'Test dinner',
      eventDate: '2099-10-18',
      guestCount: 4,
      guestCountRangeLabel: null,
      location: 'Example region',
      matchedChefCount: 0,
      statusUrl: 'https://example.test/book/status/test-token',
    })
  )
  assert.match(text(html), /request has been saved/i)
  assert.match(text(html), /not guaranteed/i)
  assertNoReplyPromise(html)
})

test('zero-match status shows saved details and no sent-to-chefs progress', async () => {
  const html = render(
    await StatusPage({ params: Promise.resolve({ bookingToken: 'synthetic-token' }) })
  )
  assert.match(text(html), /request is saved/i)
  assert.match(text(html), /no chef has received it/i)
  assert.match(text(html), /not guaranteed/i)
  assert.doesNotMatch(text(html), /Sent to chefs|Chef reviewing|No chef has responded yet/i)
  assertNoReplyPromise(html)
})
