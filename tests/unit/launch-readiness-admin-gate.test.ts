import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const pageSource = readFileSync(
  join(process.cwd(), 'app/(admin)/admin/launch-readiness/page.tsx'),
  'utf8'
)
const exportRouteSource = readFileSync(
  join(process.cwd(), 'app/(admin)/admin/launch-readiness/export/route.ts'),
  'utf8'
)
const jsonPacketRouteSource = readFileSync(
  join(process.cwd(), 'app/api/admin/launch-readiness/decision-packet/route.ts'),
  'utf8'
)
const adminNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/admin-nav-config.ts'),
  'utf8'
)
const chefNavSource = readFileSync(
  join(process.cwd(), 'components/navigation/nav-config.tsx'),
  'utf8'
)

test('launch readiness page is protected by server-side admin auth', () => {
  assert.match(pageSource, /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/)
  assert.match(pageSource, /await\s+requireAdmin\(\)/)
  assert.doesNotMatch(pageSource, /requireChef/)
  assert.doesNotMatch(pageSource, /^['"]use client['"]/m)
})

test('launch readiness export route is admin-only and returns a packet', () => {
  assert.match(
    exportRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(exportRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(exportRouteSource, /buildLaunchReadinessDecisionPacket/)
  assert.match(exportRouteSource, /Content-Disposition/)
})

test('launch readiness JSON packet route is admin-only and non-cached', () => {
  assert.match(
    jsonPacketRouteSource,
    /import\s+\{\s*requireAdmin\s*\}\s+from ['"]@\/lib\/auth\/admin['"]/
  )
  assert.match(jsonPacketRouteSource, /await\s+requireAdmin\(\)/)
  assert.match(jsonPacketRouteSource, /buildLaunchReadinessDecisionPacket/)
  assert.match(jsonPacketRouteSource, /buildLaunchReadinessRiskRegister/)
  assert.match(jsonPacketRouteSource, /NextResponse\.json/)
  assert.match(jsonPacketRouteSource, /Cache-Control['"]:\s*['"]no-store/)
  assert.match(jsonPacketRouteSource, /riskRegister/)
  assert.match(pageSource, /\/api\/admin\/launch-readiness\/decision-packet/)
})

test('launch readiness page connects the risk register helper', () => {
  assert.match(pageSource, /buildLaunchReadinessRiskRegister/)
  assert.match(pageSource, /Risk register/)
  assert.match(pageSource, /risk\.severity/)
})

test('launch readiness is visible only in admin navigation', () => {
  assert.match(adminNavSource, /href:\s*['"]\/admin\/launch-readiness['"]/)
  assert.doesNotMatch(chefNavSource, /\/admin\/launch-readiness/)
})
