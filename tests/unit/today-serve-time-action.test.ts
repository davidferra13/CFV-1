import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { canEditServeTimeFromToday, TodayServeTimeSchema } from '@/lib/events/today-actions-core'

test('Today serve-time input accepts only a scoped event id and real 24-hour time', () => {
  const valid = TodayServeTimeSchema.safeParse({
    eventId: '11111111-1111-4111-8111-111111111111',
    serveTime: '18:30',
  })
  assert.equal(valid.success, true)

  for (const input of [
    { eventId: 'not-an-id', serveTime: '18:30' },
    { eventId: '11111111-1111-4111-8111-111111111111', serveTime: '25:00' },
    { eventId: '11111111-1111-4111-8111-111111111111', serveTime: '6:30 PM' },
  ]) {
    assert.equal(TodayServeTimeSchema.safeParse(input).success, false)
  }
})

test('Today can set serve time before service starts, including accepted dinners', () => {
  for (const status of ['draft', 'proposed', 'accepted', 'paid', 'confirmed']) {
    assert.equal(canEditServeTimeFromToday(status), true, status)
  }
  for (const status of ['in_progress', 'completed', 'cancelled']) {
    assert.equal(canEditServeTimeFromToday(status), false, status)
  }
})

test('serve-time write is authenticated, tenant-scoped, concurrency-checked, and silent', () => {
  const source = readFileSync(resolve(process.cwd(), 'lib/events/today-actions.ts'), 'utf8')

  assert.match(source, /const user = await requireChef\(\)/)
  assert.match(source, /\.eq\('tenant_id', user\.tenantId\)/)
  assert.match(source, /\.eq\('status', event\.status\)/)
  assert.match(source, /\.eq\('updated_at', event\.updated_at\)/)
  assert.match(source, /\.select\('id, serve_time'\)/)
  assert.doesNotMatch(source, /circleFirstNotify|emitWebhook|sendChatMessage/)
})
