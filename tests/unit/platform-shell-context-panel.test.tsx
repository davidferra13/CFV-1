import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ContextPanelSection } from '@/components/platform-shell/context-panel-section'
import { PlatformStatusChip } from '@/components/platform-shell/platform-status-chip'
;(globalThis as any).React = React

test('context panel section renders populated metrics and real actions', () => {
  const markup = renderToStaticMarkup(
    <ContextPanelSection
      id="payment"
      title="Payment"
      description="Uses real ledger-derived event state."
      status={{ label: 'Open', tone: 'warning' }}
      metrics={[{ label: 'Outstanding', value: '$120.00' }]}
      actions={[{ label: 'Open finance', href: '/events/event-1?tab=money' }]}
    />
  )

  assert.match(markup, /Payment/)
  assert.match(markup, /Outstanding/)
  assert.match(markup, /\$120\.00/)
  assert.match(markup, /href="\/events\/event-1\?tab=money"/)
})

test('context panel section renders explicit unavailable state', () => {
  const markup = renderToStaticMarkup(
    <ContextPanelSection
      id="ops"
      title="Client Ops"
      state="error"
      description="The source failed."
    />
  )

  assert.match(markup, /Client Ops/)
  assert.match(markup, /Source unavailable/)
})

test('platform status chip only accepts the ChefFlow badge tones', () => {
  const markup = renderToStaticMarkup(<PlatformStatusChip label="Ready" tone="success" />)
  assert.match(markup, /Ready/)
  assert.match(markup, /emerald/)
})
