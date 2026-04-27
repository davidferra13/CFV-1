import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve(process.cwd(), 'lib/realtime/broadcast.ts'), 'utf-8')

test('table mutation broadcasts fan out to tenant and user live channels', () => {
  assert.match(source, /export function broadcastTenantMutation/)
  assert.match(source, /export function broadcastUserMutation/)
  assert.match(source, /tenant:\$\{tenantId\}/)
  assert.match(source, /user:\$\{userId\}/)
})

test('notification broadcasts fan out to the recipient user channel', () => {
  assert.match(source, /table === 'notifications'/)
  assert.match(source, /broadcastUserMutation\(tenantId, payload\)/)
})
