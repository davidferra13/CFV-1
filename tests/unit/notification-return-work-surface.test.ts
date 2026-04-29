import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const listSource = readFileSync('app/(chef)/notifications/notification-list-client.tsx', 'utf8')
const panelSource = readFileSync('components/notifications/notification-panel.tsx', 'utf8')

test('notifications page exposes an actionable unread return-to-work banner', () => {
  assert.match(listSource, /nextActionableUnread = notifications\.find/)
  assert.match(listSource, /!n\.read_at && n\.action_url/)
  assert.match(listSource, /Return to work/)
  assert.match(listSource, /Open next item/)
  assert.match(listSource, /setReadFilter\('unread'\)/)
  assert.match(listSource, /handleNavigate\(nextActionableUnread\)/)
})

test('notification panel exposes the same actionable unread return-to-work path', () => {
  assert.match(panelSource, /nextActionableUnread = useMemo/)
  assert.match(panelSource, /!n\.read_at && n\.action_url/)
  assert.match(panelSource, /Return to work/)
  assert.match(panelSource, /Open next item/)
  assert.match(panelSource, /setReadFilter\('unread'\)/)
  assert.match(panelSource, /handleNavigate\(nextActionableUnread\)/)
})
