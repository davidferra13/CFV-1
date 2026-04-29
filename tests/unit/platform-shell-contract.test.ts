import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getContextPanelStorageKey,
  isContextPanelRouteFamily,
  isContextPanelSupportedPath,
  resolveContextPanelRouteFamily,
} from '@/lib/platform-shell/context-panel-contract'

test('context panel route family resolution is limited to supported shell surfaces', () => {
  assert.equal(resolveContextPanelRouteFamily('/events/123'), 'event')
  assert.equal(resolveContextPanelRouteFamily('/events/123?tab=ops'), 'event')
  assert.equal(resolveContextPanelRouteFamily('/clients/abc'), 'client')
  assert.equal(resolveContextPanelRouteFamily('/activity'), 'activity')
  assert.equal(resolveContextPanelRouteFamily('/replay'), 'activity')
  assert.equal(resolveContextPanelRouteFamily('/dashboard'), null)
})

test('context panel storage keys never include entity identifiers', () => {
  assert.equal(getContextPanelStorageKey('event'), 'cf:platform-shell:right-panel:event')
  assert.equal(getContextPanelStorageKey('client'), 'cf:platform-shell:right-panel:client')
  assert.equal(getContextPanelStorageKey('activity'), 'cf:platform-shell:right-panel:activity')
})

test('context panel route-family guard rejects arbitrary strings', () => {
  assert.equal(isContextPanelRouteFamily('event'), true)
  assert.equal(isContextPanelRouteFamily('prospecting'), false)
  assert.equal(isContextPanelSupportedPath('/clients/client-1'), true)
  assert.equal(isContextPanelSupportedPath('/settings'), false)
})
