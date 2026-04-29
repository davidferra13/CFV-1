import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync('app/(chef)/events/[id]/dop/mobile/page.tsx', 'utf8')

test('DOP mobile route selects event status before rendering run mode', () => {
  assert.match(source, /\.select\('id, occasion, serve_time, event_date, status'\)/)
  assert.match(source, /event\.status === 'draft'/)
  assert.match(source, /event\.status === 'cancelled'/)
})

test('DOP mobile route does not hide completion load failures as empty state', () => {
  assert.doesNotMatch(source, /getDOPManualCompletions\(params\.id\)\.catch/)
  assert.doesNotMatch(source, /new Set<string>\(\)/)
  assert.match(source, /Promise\.allSettled/)
  assert.match(source, /Task completion status could not be loaded\./)
})
