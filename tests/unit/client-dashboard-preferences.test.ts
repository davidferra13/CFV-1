import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  cloneDefaultClientDashboardWidgets,
  getClientDashboardWidgetsFromUnknown,
  sanitizeClientDashboardWidgets,
} from '@/lib/client-dashboard/preferences'

describe('client dashboard preferences', () => {
  it('returns defaults when unknown value is invalid', () => {
    const widgets = getClientDashboardWidgetsFromUnknown(null)
    const defaults = cloneDefaultClientDashboardWidgets()
    assert.deepEqual(widgets, defaults)
  })

  it('dedupes duplicate widgets and preserves first occurrence', () => {
    const widgets = sanitizeClientDashboardWidgets([
      { id: 'messages', enabled: true },
      { id: 'messages', enabled: false },
      { id: 'rewards', enabled: false },
    ])

    const firstMessages = widgets.find((widget) => widget.id === 'messages')
    assert.ok(firstMessages)
    assert.equal(firstMessages.enabled, true)
  })

  it('fills missing widgets with default fallback order', () => {
    const widgets = sanitizeClientDashboardWidgets([{ id: 'book_again', enabled: true }])

    assert.equal(widgets[0].id, 'book_again')
    assert.ok(widgets.length > 1)
    const hasActionRequired = widgets.some((widget) => widget.id === 'action_required')
    assert.equal(hasActionRequired, true)
  })

  it('filters malformed unknown entries and keeps valid rows', () => {
    const widgets = getClientDashboardWidgetsFromUnknown([
      { id: 'messages', enabled: true },
      { id: 'not_real', enabled: true },
      { id: 'quotes', enabled: 'yes' },
    ])

    const message = widgets.find((widget) => widget.id === 'messages')
    assert.ok(message)
    assert.equal(message.enabled, true)
    const notReal = widgets.find((widget) => widget.id === ('not_real' as any))
    assert.equal(notReal, undefined)
  })
})
