import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import {
  MotionProgressFill,
  StateChangePulse,
  StateMotionBadge,
} from '@/components/ui/state-motion'
;(globalThis as any).React = React

test('motion progress fill clamps values to the displayed range', () => {
  const highMarkup = renderToStaticMarkup(
    <MotionProgressFill value={145} className="bg-brand-500" />
  )
  const lowMarkup = renderToStaticMarkup(<MotionProgressFill value={-12} />)

  assert.match(highMarkup, /width:100%/)
  assert.match(highMarkup, /data-progress-value="100"/)
  assert.match(lowMarkup, /width:0%/)
  assert.match(lowMarkup, /data-progress-value="0"/)
})

test('state motion badge preserves ChefFlow badge variants', () => {
  const markup = renderToStaticMarkup(
    <StateMotionBadge watch="paid" variant="success">
      Paid
    </StateMotionBadge>
  )

  assert.match(markup, /Paid/)
  assert.match(markup, /state-motion-badge/)
  assert.match(markup, /emerald/)
})

test('state change pulse renders as the requested element without active motion on first paint', () => {
  const markup = renderToStaticMarkup(
    <StateChangePulse watch="draft" as="span" className="inline-flex">
      Draft
    </StateChangePulse>
  )

  assert.match(markup, /^<span/)
  assert.match(markup, /inline-flex/)
  assert.doesNotMatch(markup, /data-state-motion-active/)
})
