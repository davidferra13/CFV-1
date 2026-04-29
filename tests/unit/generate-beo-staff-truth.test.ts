import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(resolve('lib/documents/generate-beo.ts'), 'utf8')

function getStaffBlock() {
  const start = source.indexOf('// Fetch staff assignments')
  const end = source.indexOf('// Build timeline', start)

  assert.notEqual(start, -1, 'BEO staff assignment block should exist')
  assert.notEqual(end, -1, 'BEO timeline block should follow staff assignment loading')

  return source.slice(start, end)
}

test('BEO staff data loads from event_staff_assignments with chef scoping', () => {
  const staffBlock = getStaffBlock()

  assert.match(staffBlock, /\.from\('event_staff_assignments'\)/)
  assert.match(staffBlock, /\.eq\('event_id', eventId\)/)
  assert.match(staffBlock, /\.eq\('chef_id', user\.tenantId!\)/)
  assert.match(staffBlock, /\.order\('created_at'\)/)

  assert.match(staffBlock, /role_override/)
  assert.match(staffBlock, /staff_members \(name, role\)/)
  assert.match(staffBlock, /formatStaffRole\(s\.role_override \?\? member\.role\)/)

  assert.doesNotMatch(staffBlock, /\.from\('event_staff'\)/)
  assert.doesNotMatch(staffBlock, /\.eq\('tenant_id', user\.tenantId!\)/)
})
