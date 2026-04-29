import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

const launchReadinessSource = readFileSync('lib/validation/launch-readiness.ts', 'utf8')
const adminActivityPage = readFileSync('app/(admin)/admin/activity/page.tsx', 'utf8')

test('launch readiness acquisition evidence links to an existing admin activity route', () => {
  assert.match(launchReadinessSource, /href: '\/admin\/activity'/)
  assert.ok(existsSync('app/(admin)/admin/activity/page.tsx'))
})

test('admin activity route is admin gated and uses platform activity evidence', () => {
  assert.match(adminActivityPage, /await requireAdmin\(\)/)
  assert.match(
    adminActivityPage,
    /getPlatformActivityFeed\(\{ limit: 50, types: \['booking'\] \}\)/
  )
  assert.match(
    adminActivityPage,
    /getPlatformActivityFeed\(\{ limit: 25, types: \['inquiry'\] \}\)/
  )
  assert.match(adminActivityPage, /Activity Evidence/)
  assert.match(adminActivityPage, /Open platform pulse/)
})

test('acquisition readiness points incomplete source proof to admin activity evidence', () => {
  const acquisitionReadinessSource = readFileSync('lib/validation/acquisition-readiness.ts', 'utf8')
  assert.match(acquisitionReadinessSource, /href: '\/admin\/activity'/)
})
