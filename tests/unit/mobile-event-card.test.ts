import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatMobileEventPrice,
  getMobileEventLaunchActions,
  type MobileEventCardEvent,
} from '../../components/events/mobile-event-card.js'

const regional = { locale: 'en-US', currencyCode: 'USD' }

function event(overrides: Partial<MobileEventCardEvent> = {}): MobileEventCardEvent {
  return {
    id: 'event-1',
    occasion: 'Spring Dinner',
    event_date: '2026-05-02',
    serve_time: '7:00 PM',
    status: 'confirmed',
    client: { full_name: 'Avery Client' },
    ...overrides,
  }
}

describe('mobile event card launch surface', () => {
  it('does not render a missing quote as zero dollars', () => {
    assert.equal(formatMobileEventPrice(event({ quoted_price_cents: null }), regional), null)
    assert.equal(formatMobileEventPrice(event({ quoted_price_cents: undefined }), regional), null)
    assert.equal(formatMobileEventPrice(event({ quoted_price_cents: 0 }), regional), '$0.00')
  })

  it('links active events to real run, packing, print, document, and detail routes', () => {
    const actions = getMobileEventLaunchActions(event())
    assert.deepEqual(
      actions.map((action) => [action.id, action.href]),
      [
        ['detail', '/events/event-1'],
        ['dop', '/events/event-1/dop/mobile'],
        ['packing', '/events/event-1/pack'],
        ['print', '/events/event-1/print'],
        ['documents', '/events/event-1/documents'],
      ]
    )
  })

  it('keeps draft events out of operational run surfaces', () => {
    const actions = getMobileEventLaunchActions(event({ status: 'draft' }))
    assert.deepEqual(
      actions.map((action) => action.id),
      ['detail', 'edit']
    )
  })

  it('keeps completed events linked to records without reopening run mode', () => {
    const actions = getMobileEventLaunchActions(event({ status: 'completed' }))
    assert.deepEqual(
      actions.map((action) => action.id),
      ['detail', 'print', 'documents']
    )
  })

  it('requires schedule basics before linking DOP mobile mode', () => {
    const actions = getMobileEventLaunchActions(event({ serve_time: null }))
    assert.deepEqual(
      actions.map((action) => action.id),
      ['detail', 'packing', 'print', 'documents']
    )
    assert.equal(actions.find((action) => action.id === 'packing')?.variant, 'primary')
  })
})
