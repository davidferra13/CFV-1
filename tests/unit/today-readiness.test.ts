import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('Today reads operational readiness for the next live dinner', () => {
  const service = readFileSync('lib/mobile/mobile-service.ts', 'utf8')
  const dashboard = readFileSync('app/(chef)/dashboard/page.tsx', 'utf8')

  for (const field of [
    'guest_count',
    'prep_list_ready',
    'grocery_list_ready',
    'timeline_ready',
    'packing_list_ready',
  ]) {
    assert.match(service, new RegExp(field))
  }

  assert.match(service, /\.not\('status', 'in', '\(\"cancelled\",\"completed\"\)'\)/)
  assert.match(service, /\.order\('serve_time'/)

  assert.match(dashboard, /Event readiness/)
  assert.match(dashboard, /event\.readiness\.prep/)
  assert.match(dashboard, /event\.readiness\.grocery/)
  assert.match(dashboard, /event\.readiness\.timeline/)
  assert.match(dashboard, /event\.readiness\.packing/)
  assert.match(dashboard, /\/prep-plan/)
  assert.match(dashboard, /\/grocery-run/)
  assert.match(dashboard, /\/schedule/)
  assert.match(dashboard, /\/pack/)
})
