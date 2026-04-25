import test from 'node:test'
import assert from 'node:assert/strict'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { ActivityTimestamp } from '@/components/ui/activity-timestamp'
import { formatRelativeTime } from '@/lib/time/format-relative-time'

const NOW = new Date('2026-04-24T16:18:00.000Z')

test('formatRelativeTime returns now for timestamps under one minute', () => {
  assert.equal(formatRelativeTime('2026-04-24T16:17:30.000Z', NOW), 'now')
})

test('formatRelativeTime returns compact minute labels', () => {
  assert.equal(formatRelativeTime('2026-04-24T16:04:00.000Z', NOW), '14m ago')
})

test('formatRelativeTime returns compact hour labels', () => {
  assert.equal(formatRelativeTime('2026-04-24T13:18:00.000Z', NOW), '3h ago')
})

test('formatRelativeTime returns yesterday for the prior local day', () => {
  assert.equal(formatRelativeTime('2026-04-23T16:18:00.000Z', NOW), 'yesterday')
})

test('formatRelativeTime returns compact day labels under seven days', () => {
  assert.equal(formatRelativeTime('2026-04-20T16:18:00.000Z', NOW), '4d ago')
})

test('formatRelativeTime returns absolute dates in the current year', () => {
  assert.equal(formatRelativeTime('2026-04-10T16:18:00.000Z', NOW), 'Apr 10')
})

test('formatRelativeTime includes the year for prior-year absolute dates', () => {
  assert.equal(formatRelativeTime('2025-04-19T16:18:00.000Z', NOW), 'Apr 19, 2025')
})

test('ActivityTimestamp renders fallback for invalid timestamps', () => {
  const html = renderToStaticMarkup(
    React.createElement(ActivityTimestamp, { at: 'not-a-date', fallback: 'Unknown time' })
  )

  assert.equal(html, 'Unknown time')
})

test('ActivityTimestamp renders semantic time with exact title', () => {
  const html = renderToStaticMarkup(
    React.createElement(ActivityTimestamp, {
      at: '2026-04-24T16:18:00.000Z',
      label: 'Updated',
      className: 'custom-time',
    })
  )

  assert.match(html, /^<time /)
  assert.match(html, /dateTime="2026-04-24T16:18:00\.000Z"/)
  assert.match(html, /title="Apr 24, 2026 at /)
  assert.match(html, /class="custom-time"/)
  assert.match(html, />Updated .+<\/time>$/)
})
